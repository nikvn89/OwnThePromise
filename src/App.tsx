import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileSignature,
  LockKeyhole,
  ListChecks,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  CONTRACT_ADDRESS,
  EXPLORER_URL,
  MAX_NAME_LENGTH,
  MAX_REQUIRED_COMMITMENTS,
  MAX_ROLE_LABEL_LENGTH,
  MAX_STATEMENT_LENGTH,
} from "./config";
import { errorMessage } from "./errors";
import {
  connectStudioNet,
  getAttempts,
  getConnectedWallet,
  getRegister,
  leaderRollbackReason,
  requestWallet,
  writeMethod,
} from "./genlayer";
import {
  computeRegisterId,
  computeStatementId,
  normalizeId,
  pyCollapse,
  pyLen,
  pyStrip,
} from "./ids";
import type { AttemptRecord, RegisterRecord, TxUiState } from "./types";

type Tab = "register" | "statements";

const EMPTY_TX: TxUiState = {
  kind: "idle",
  message: "No transaction submitted in this session.",
};

function short(value: string, head = 7, tail = 5) {
  if (!value || value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function stateCopy(state: string) {
  if (state === "ACKNOWLEDGED") return "The beneficiary acknowledged this frozen register.";
  if (state === "FROZEN") return "Quota was met. Only the beneficiary may acknowledge this register.";
  if (state === "QUOTA_MET") return "Enough author commitments are recorded. The creator may freeze the register.";
  return "The register is open. Only statements classified as the author's own commitments advance the quota.";
}

export default function App() {
  const [tab, setTab] = useState<Tab>("register");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  // Synchronous click lock (React state is async, so `busy` alone lets two
  // clicks in the same tick both through).
  const inFlight = useRef(false);
  // What accepted-state change would prove the submitted write actually landed.
  const pendingRef = useRef<{
    registerId: string;
    hash: string;
    kind: "create" | "submit" | "freeze" | "acknowledge";
    beforeRecorded?: number;
    retried?: boolean;
  } | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const [tx, setTx] = useState<TxUiState>(EMPTY_TX);

  const [name, setName] = useState("Clinical assay commitments");
  const [role, setRole] = useState("Sponsor");
  const [beneficiary, setBeneficiary] = useState("");
  const [required, setRequired] = useState("3");

  const [registerIdInput, setRegisterIdInput] = useState("");
  const [register, setRegister] = useState<RegisterRecord | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [statement, setStatement] = useState(
    "We understand the central laboratory will release the final assay results to investigators before database lock."
  );

  const isCreator =
    Boolean(register && account) &&
    register!.creator.toLowerCase() === account.toLowerCase();
  const canFreeze = Boolean(
    register &&
      isCreator &&
      !register.frozen &&
      register.owned_count >= register.required_commitments
  );
  const isBeneficiary =
    Boolean(register && account) &&
    register!.beneficiary.toLowerCase() === account.toLowerCase();
  const canAcknowledge = Boolean(
    register &&
      isBeneficiary &&
      register.frozen &&
      !register.acknowledged
  );

  const progress = useMemo(() => {
    if (!register || register.required_commitments <= 0) return 0;
    return Math.min(100, Math.round((register.owned_count / register.required_commitments) * 100));
  }, [register]);

  useEffect(() => {
    getConnectedWallet().then(setAccount).catch(() => undefined);

    if (!window.ethereum?.on) return;
    const resetSession = (message: string) => {
      // The scheduled refresh belongs to the previous wallet/chain. Leaving it
      // running would reload the old register over the cleared state.
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
      setRegister(null);
      setAttempts([]);
      pendingRef.current = null;
      inFlight.current = false;
      setBusy(false);
      setTx({ kind: "idle", message });
    };

    const onAccounts = (accounts: string[]) => {
      setAccount(accounts?.[0] ?? "");
      resetSession("Wallet account changed. Load your register again.");
    };
    const onChain = () => {
      resetSession("Network changed. Load your register again.");
    };

    window.ethereum.on("accountsChanged", onAccounts as any);
    window.ethereum.on("chainChanged", onChain as any);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts as any);
      window.ethereum?.removeListener?.("chainChanged", onChain as any);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  async function connect() {
    try {
      // Accounts first, then the network. wallet_switchEthereumChain on a site
      // MetaMask has not authorised yet is the shakier of the two orders.
      const next = await requestWallet();
      await connectStudioNet();
      setAccount(next);
    } catch (error) {
      setTx({ kind: "error", message: errorMessage(error) });
    }
  }

  async function loadRegister(id = registerIdInput) {
    const normalized = normalizeId(id);
    if (!/^[0-9a-f]{64}$/.test(normalized)) {
      setTx({ kind: "error", message: "Enter a valid 64-character register ID." });
      return;
    }

    setLoading(true);
    try {
      const [nextRegister, nextAttempts] = await Promise.all([
        getRegister(normalized),
        getAttempts(normalized, 0, 20),
      ]);
      setRegisterIdInput(normalized);
      setRegister(nextRegister);
      setAttempts(nextAttempts);

      const pending = pendingRef.current;
      if (pending && pending.registerId === normalized) {
        const accepted =
          pending.kind === "create" ||
          (pending.kind === "submit" &&
            nextRegister.recorded_count > (pending.beforeRecorded ?? -1)) ||
          (pending.kind === "freeze" && nextRegister.frozen) ||
          (pending.kind === "acknowledge" && nextRegister.acknowledged);

        if (accepted) {
          pendingRef.current = null;
          inFlight.current = false;
          setBusy(false);
          setTx({
            kind: "success",
            message: "Accepted state changed as expected. The write landed.",
          });
          return;
        }

        if (!pending.retried) {
          // One more bounded look, then release. This is two scheduled reads of
          // accepted state, not a receipt-polling loop.
          pending.retried = true;
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            loadRegister(normalized).catch(() => undefined);
          }, 30000);
          setTx({
            kind: "submitted",
            message:
              "Submitted, but accepted state has not changed yet. Checking once more in 30s - or press Refresh.",
          });
          return;
        }

        const rollbackReason = await leaderRollbackReason(pending.hash);
        pendingRef.current = null;
        inFlight.current = false;
        setBusy(false);
        setTx({
          kind: "error",
          message: rollbackReason
            ? `Transaction rolled back: ${rollbackReason}`
            : "Accepted state still has not changed. Check the transaction on Explorer before resubmitting.",
        });
        return;
      }

      setTx({ kind: "success", message: "Accepted register state loaded." });
    } catch (error) {
      setTx({ kind: "error", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function runWrite(
    functionName: string,
    args: unknown[],
    expectation: {
      registerId: string;
      kind: "create" | "submit" | "freeze" | "acknowledge";
      beforeRecorded?: number;
    },
    afterSubmit?: () => void
  ) {
    if (!account) {
      setTx({ kind: "error", message: "Connect a wallet first." });
      return;
    }
    if (inFlight.current || busy || pendingRef.current) return;

    inFlight.current = true;
    setBusy(true);
    setTx({ kind: "signing", message: "Confirm the transaction in MetaMask." });
    try {
      await connectStudioNet();
      const hash = await writeMethod(account, functionName, args);
      pendingRef.current = { ...expectation, hash };
      setTx({
        kind: "submitted",
        hash,
        message:
          "Transaction submitted. Writes stay locked until the expected accepted-state change is observed.",
      });
      afterSubmit?.();
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        loadRegister(expectation.registerId).catch(() => undefined);
      }, 25000);
      // Deliberately NOT clearing the lock here. A hash is a submission, not an
      // accepted state; loadRegister() releases it once the state actually moved.
    } catch (error) {
      pendingRef.current = null;
      inFlight.current = false;
      setBusy(false);
      setTx({ kind: "error", message: errorMessage(error) });
    }
  }

  async function createRegister() {
    const cleanName = pyStrip(name);
    const cleanRole = pyStrip(role);
    const cleanBeneficiary = pyStrip(beneficiary);
    const quota = Number(required);

    if (!account) return connect();
    // pyLen, not .length: the contract measures with Python len(), which counts
    // code points. src/ids.ts already hashes with pyLen; keep validation aligned.
    if (!cleanName || pyLen(cleanName) > MAX_NAME_LENGTH) {
      setTx({ kind: "error", message: `Register name must be 1-${MAX_NAME_LENGTH} characters.` });
      return;
    }
    if (!cleanRole || pyLen(cleanRole) > MAX_ROLE_LABEL_LENGTH || /[\r\n]/.test(cleanRole)) {
      setTx({ kind: "error", message: `Author role must be one line and at most ${MAX_ROLE_LABEL_LENGTH} characters.` });
      return;
    }
    if (!Number.isInteger(quota) || quota < 1 || quota > MAX_REQUIRED_COMMITMENTS) {
      setTx({ kind: "error", message: `Required commitments must be between 1 and ${MAX_REQUIRED_COMMITMENTS}.` });
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(cleanBeneficiary)) {
      setTx({ kind: "error", message: "Enter a valid beneficiary wallet address." });
      return;
    }
    if (cleanBeneficiary.toLowerCase() === account.toLowerCase()) {
      setTx({ kind: "error", message: "Beneficiary must be a different wallet from the creator." });
      return;
    }

    const id = computeRegisterId(account, cleanName);

    // create_register reverts when this (creator, name) pair already exists, but
    // the revert happens at consensus - AFTER writeContract has returned a hash.
    // Without this probe the refresh below would load the PRE-EXISTING register
    // and report a successful creation for a transaction that reverted.
    let existing: RegisterRecord | null = null;
    try {
      existing = await getRegister(id);
    } catch {
      existing = null;
    }

    if (existing) {
      setRegisterIdInput(id);
      setRegister(existing);
      setAttempts(await getAttempts(id, 0, 20).catch(() => []));
      setTx({
        kind: "error",
        message:
          "You already have a register with this name. It has been loaded instead - creating it again would revert. Use a different name.",
      });
      return;
    }

    setRegisterIdInput(id);
    await runWrite(
      "create_register",
      [cleanName, cleanRole, cleanBeneficiary, quota],
      { registerId: id, kind: "create" },
      () => {
        setRegister(null);
        setAttempts([]);
      }
    );
  }

  async function submitStatement() {
    if (!register) {
      setTx({ kind: "error", message: "Load a register first." });
      return;
    }
    if (!isCreator) {
      setTx({ kind: "error", message: "Only the register creator can submit statements." });
      return;
    }
    if (register.frozen) {
      setTx({ kind: "error", message: "This register is frozen." });
      return;
    }
    const clean = pyCollapse(statement);
    if (!clean || pyLen(clean) > MAX_STATEMENT_LENGTH) {
      setTx({ kind: "error", message: `Statement must be 1-${MAX_STATEMENT_LENGTH} characters.` });
      return;
    }
    const statementId = computeStatementId(register.register_id, clean);
    if (attempts.some((attempt) => attempt.statement_id === statementId)) {
      setTx({ kind: "error", message: "This statement already exists in the loaded register." });
      return;
    }
    await runWrite("submit_statement", [register.register_id, clean], {
      registerId: register.register_id,
      kind: "submit",
      beforeRecorded: register.recorded_count,
    });
  }

  async function freezeRegister() {
    if (!register) return;
    await runWrite("freeze_register", [register.register_id], {
      registerId: register.register_id,
      kind: "freeze",
    });
  }

  async function acknowledgeRegister() {
    if (!register) return;
    await runWrite("acknowledge_register", [register.register_id], {
      registerId: register.register_id,
      kind: "acknowledge",
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="/ownthepromise-logo.svg" alt="OwnThePromise logo" />
          <div><strong>OwnThePromise</strong><small>AttributionGate on GenLayer</small></div>
        </div>
        <div className="top-actions">
          <a className="network-link" href={EXPLORER_URL} target="_blank" rel="noreferrer">
            <img src="/genlayer-logo-official.png" alt="GenLayer" />
            <span>StudioNet</span><ExternalLink size={13} />
          </a>
          <button className="wallet-button" onClick={connect}>
            <Wallet size={15} />{account ? short(account) : "Connect wallet"}
          </button>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div>
            <p className="eyebrow">SPEECH-ACT ATTRIBUTION</p>
            <h1>Quoting a promise is not making one.</h1>
            <p className="hero-copy">GenLayer counts only statements where the declared author role is actually the party taking on the future action.</p>
          </div>
          <div className="hero-card">
            <div><span>NOT_AUTHOR_COMMITMENT</span><b>does not count</b></div>
            <div><span>AUTHOR_COMMITMENT</span><b>+1 owned</b></div>
            <div className="hero-freeze"><LockKeyhole size={17} /><b>quota met → freeze</b></div>
          </div>
        </section>

        <div className="tabs">
          <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}><FileSignature size={16}/>Register</button>
          <button className={tab === "statements" ? "active" : ""} onClick={() => setTab("statements")}><ListChecks size={16}/>Statements</button>
        </div>

        {tab === "register" ? (
          <section className="grid register-grid">
            <article className="panel">
              <div className="panel-heading"><div><span className="step">01</span><h2>Create register</h2></div><span className="quiet-chip">deterministic</span></div>
              <label>Register name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME_LENGTH}/></label>
              <label>Declared author role<input value={role} onChange={(e) => setRole(e.target.value)} maxLength={MAX_ROLE_LABEL_LENGTH}/></label>
              <label>Beneficiary wallet<input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="0x..."/></label>
              <label>Required own commitments<input type="number" min={1} max={MAX_REQUIRED_COMMITMENTS} value={required} onChange={(e) => setRequired(e.target.value)}/></label>
              <button className="primary" disabled={busy} onClick={createRegister}><FileSignature size={16}/>Create register</button>
            </article>

            <article className="panel">
              <div className="panel-heading"><div><span className="step">02</span><h2>Load accepted state</h2></div><button className="icon-button" onClick={() => loadRegister()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16}/></button></div>
              <div className="inline-field"><input placeholder="64-character register ID" value={registerIdInput} onChange={(e) => setRegisterIdInput(e.target.value)}/><button className="secondary" onClick={() => loadRegister()}>Load</button></div>
              {!register ? <div className="empty-state">Create a register or paste an existing register ID.</div> : (
                <div className="register-card">
                  <div className="register-title-row"><div><span className={`status-badge ${register.state.toLowerCase()}`}>{register.state}</span><h3>{register.name}</h3></div><button className="copy-button" onClick={() => copy(register.register_id)}><Copy size={14}/></button></div>
                  <div className="facts"><div><span>AUTHOR ROLE</span><strong>{register.author_role_label}</strong></div><div><span>RECORDED</span><strong>{register.recorded_count} / {register.statement_limit}</strong></div><div><span>OWNED</span><strong>{register.owned_count} / {register.required_commitments}</strong></div><div><span>CREATOR</span><strong>{short(register.creator)}</strong></div><div><span>BENEFICIARY</span><strong>{short(register.beneficiary)}</strong></div><div><span>ACKNOWLEDGED</span><strong>{register.acknowledged ? "YES" : "NO"}</strong></div></div>
                  <div className="progress-track"><div style={{width: `${progress}%`}} /></div>
                  <p className="mode-note">{stateCopy(register.state)}</p>
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading"><div><span className="step">03</span><h2>Submit statement</h2></div><span className="semantic-chip">GenLayer consensus</span></div>
              <label>Statement<textarea rows={5} value={statement} onChange={(e) => setStatement(e.target.value)} maxLength={MAX_STATEMENT_LENGTH}/><small>{Array.from(statement).length}/{MAX_STATEMENT_LENGTH}</small></label>
              <button className="primary" disabled={busy || !register || !isCreator || Boolean(register?.frozen)} onClick={submitStatement}><Send size={16}/>Submit statement</button>
              <p className="helper">The model sees only the declared author role and this statement. Wallet, quota and state do not enter the prompt.</p>
            </article>

            <article className="panel">
              <div className="panel-heading"><div><span className="step">04</span><h2>Freeze register</h2></div><span className="quiet-chip">deterministic</span></div>
              <div className="freeze-box"><LockKeyhole size={28}/><strong>{register?.state ?? "OPEN"}</strong><span>{register ? `${register.owned_count} of ${register.required_commitments} own commitments` : "Load a register to see quota state."}</span></div>
              <button className="freeze-button" disabled={busy || !canFreeze} onClick={freezeRegister}><LockKeyhole size={16}/>{register?.frozen ? "Frozen" : canFreeze ? "Freeze permanently" : "Quota not met"}</button>
            </article>

            <article className="panel">
              <div className="panel-heading"><div><span className="step">05</span><h2>Beneficiary acknowledgement</h2></div><span className="quiet-chip">two-party</span></div>
              <div className="freeze-box"><ShieldCheck size={28}/><strong>{register?.acknowledged ? "ACKNOWLEDGED" : "PENDING"}</strong><span>{register ? `Only ${short(register.beneficiary)} may acknowledge after freeze.` : "Load a register to inspect its beneficiary."}</span></div>
              <button className="freeze-button" disabled={busy || !canAcknowledge} onClick={acknowledgeRegister}><Check size={16}/>{register?.acknowledged ? "Acknowledged" : canAcknowledge ? "Acknowledge frozen register" : "Beneficiary action unavailable"}</button>
            </article>
          </section>
        ) : (
          <section className="grid statements-grid">
            <article className="panel statements-panel">
              <div className="panel-heading"><div><span className="step">01</span><h2>Recorded statements</h2></div><span className="quiet-chip">accepted state</span></div>
              {!register ? <div className="empty-state">Load a register in the Register tab first.</div> : attempts.length === 0 ? <div className="empty-state">No statements recorded yet.</div> : (
                <div className="attempt-list">{attempts.map((a) => <div key={a.statement_id} className={`attempt ${a.counted ? "counted" : "not-counted"}`}><div><span>#{a.attempt_number}</span><strong>{a.verdict}</strong></div><small>{a.counted ? "Counts toward quota" : "Stored, does not count"}</small><code>{short(a.statement_id, 12, 8)}</code></div>)}</div>
              )}
            </article>
            <article className="panel boundary-panel">
              <div className="panel-heading"><div><span className="step">02</span><h2>Semantic boundary</h2></div><ShieldCheck size={18}/></div>
              <div className="boundary-list"><div><Check size={15}/>AI sees the declared author-role label.</div><div><Check size={15}/>AI sees one submitted statement.</div><div><Check size={15}/>AI returns only AUTHOR_COMMITMENT or NOT_AUTHOR_COMMITMENT.</div><div className="never">× Wallet address never enters the prompt.</div><div className="never">× Quota and freeze consequence never enter the prompt.</div><div className="never">× It does not verify real-world identity or performance.</div></div>
            </article>
            <article className="panel reviewer-panel">
              <div className="panel-heading"><div><span className="step">03</span><h2>Reviewer contrast</h2></div></div>
              <div className="example no"><span>HARD CASE · EXPECTED NOT_AUTHOR</span><p>We are on track to release the final assay results well before database lock.</p></div>
              <div className="example yes"><span>CONTRAST · EXPECTED AUTHOR</span><p>We will release the final assay results to investigators before database lock.</p></div>
              <div className="example hard"><span>THIRD PERSON · EXPECTED AUTHOR</span><p>The Sponsor shall release the final assay results to investigators before database lock.</p></div>
            </article>
          </section>
        )}

        <div className={`tx-strip ${tx.kind}`}><div><strong>Transaction status</strong><span>{tx.message}</span></div>{tx.hash && <code>{short(tx.hash, 12, 8)}</code>}</div>

        <footer><div><img src="/ownthepromise-logo.svg" alt=""/>OwnThePromise · AttributionGate</div><a href={EXPLORER_URL} target="_blank" rel="noreferrer">Contract {short(CONTRACT_ADDRESS)} <ExternalLink size={12}/></a></footer>
      </main>
    </>
  );
}
