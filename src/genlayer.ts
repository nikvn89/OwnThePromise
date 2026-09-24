import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  CONTRACT_ADDRESS,
  RPC_PATH,
  STUDIONET_CHAIN_HEX,
  STUDIONET_CHAIN_ID,
  STUDIO_WALLET_RPC,
} from "./config";
import type { AttemptRecord, RegisterRecord } from "./types";

function proxiedChain() {
  const chain: any = studionet as any;
  return {
    ...chain,
    rpcUrls: {
      ...(chain.rpcUrls ?? {}),
      default: { http: [RPC_PATH] },
      public: { http: [RPC_PATH] },
    },
  };
}

const readClient: any = createClient({ chain: proxiedChain() } as any);

function provider() {
  if (!window.ethereum) throw new Error("MetaMask was not found.");
  return window.ethereum;
}

function walletCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const raw = (error as { code?: unknown }).code;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

function normalizeRegister(raw: any): RegisterRecord {
  return {
    register_id: String(raw?.register_id ?? ""),
    creator: String(raw?.creator ?? ""),
    beneficiary: String(raw?.beneficiary ?? ""),
    name: String(raw?.name ?? ""),
    author_role_label: String(raw?.author_role_label ?? ""),
    required_commitments: asNumber(raw?.required_commitments),
    owned_count: asNumber(raw?.owned_count),
    recorded_count: asNumber(raw?.recorded_count),
    statement_limit: asNumber(raw?.statement_limit),
    frozen: Boolean(raw?.frozen),
    acknowledged: Boolean(raw?.acknowledged),
    state: String(raw?.state ?? "OPEN"),
  };
}

function normalizeAttempts(raw: any): AttemptRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    attempt_number: asNumber(item?.attempt_number),
    statement_id: String(item?.statement_id ?? ""),
    verdict: String(item?.verdict ?? ""),
    counted: Boolean(item?.counted),
  }));
}

export async function getConnectedWallet(): Promise<string> {
  if (!window.ethereum) return "";
  const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
  return accounts?.[0] ?? "";
}

export async function requestWallet(): Promise<string> {
  const ethereum = provider();
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("No wallet account was returned.");
  return accounts[0];
}

export async function connectStudioNet(): Promise<void> {
  const ethereum = provider();
  const currentHex = (await ethereum.request({ method: "eth_chainId" })) as string;
  const current = typeof currentHex === "string" ? Number.parseInt(currentHex, 16) : 0;
  if (current === STUDIONET_CHAIN_ID) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_HEX }],
    });
    return;
  } catch (error) {
    if (walletCode(error) === 4001) throw new Error("Network switch was rejected.");
    if (walletCode(error) !== 4902) throw error;
  }

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: STUDIONET_CHAIN_HEX,
        chainName: (studionet as any).name ?? "GenLayer Studio Network",
        rpcUrls: [STUDIO_WALLET_RPC],
        nativeCurrency: (studionet as any).nativeCurrency ?? {
          name: "GEN Token",
          symbol: "GEN",
          decimals: 18,
        },
      },
    ],
  });

  await ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: STUDIONET_CHAIN_HEX }],
  });
}

function walletClient(account: string): any {
  provider();
  return createClient({
    chain: proxiedChain(),
    account: account as `0x${string}`,
    provider: window.ethereum as any,
  } as any);
}

export async function getRegister(registerId: string): Promise<RegisterRecord> {
  const raw = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_register",
    args: [registerId],
    stateStatus: "accepted",
  });
  return normalizeRegister(raw);
}

export async function getAttempts(
  registerId: string,
  offset = 0,
  limit = 20
): Promise<AttemptRecord[]> {
  const raw = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_attempts",
    args: [registerId, offset, limit],
    stateStatus: "accepted",
  });
  return normalizeAttempts(raw);
}

export async function writeMethod(
  account: string,
  functionName: string,
  args: unknown[]
): Promise<string> {
  const client = walletClient(account);
  return (await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  })) as string;
}

/**
 * Call only after accepted-state matching has timed out. State matching remains
 * the primary confirmation mechanism; this distinguishes an actual rollback
 * from a transaction that is merely slow and surfaces the rollback reason.
 */
export async function leaderRollbackReason(hash: string): Promise<string | undefined> {
  try {
    const tx: any = await readClient.getTransaction({ hash });
    const consensus = tx?.consensus_data ?? tx?.consensusData;
    let leader = consensus?.leader_receipt ?? consensus?.leaderReceipt;
    if (Array.isArray(leader)) {
      leader =
        leader.find((receipt: any) =>
          String(receipt?.mode ?? "").toUpperCase() === "LEADER"
        ) ?? leader[0];
    }
    const result = String(
      leader?.execution_result ?? leader?.executionResult ?? ""
    ).toUpperCase();
    if (result !== "ERROR" && result !== "FINISHED_WITH_ERROR") return undefined;
    for (const field of [
      leader?.error,
      leader?.message,
      leader?.return_data,
      leader?.returnData,
    ]) {
      if (typeof field === "string" && field.trim()) return field.trim();
    }
    return "Contract execution rolled back.";
  } catch {
    return undefined;
  }
}
