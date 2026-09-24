# OwnThePromise v1.1 — Submission Note

## Status

```text
DEPLOYED — RUNTIME TESTING PENDING
```

The local source and frontend checks pass, and the v1.1 contract deployment has GenVM SUCCESS with an accepted configuration read. Its semantic and beneficiary runtime paths have not yet been proved. Complete `TESTING.md` and `FRONTEND_TESTING.md` before submission.

## Draft listing

**Project name:** OwnThePromise

**Primary tag:** Dispute Resolution

**Suggested focus:** Evidence Assessment

**One-liner:** Immutable commitments with GenLayer-judged attribution and beneficiary acknowledgement.

**Description:** OwnThePromise records a declared author role, a beneficiary, and a commitment quota. GenLayer validators decide only whether each submitted statement itself attributes the future action to that author role. Deterministic contract logic counts accepted author commitments, limits retry grinding, freezes a completed register, and lets only its beneficiary acknowledge the frozen result. It does not verify real-world identity, legal enforceability, performance, or external facts.

## Exact reviewer path

1. Connect the creator wallet and create a register with a different beneficiary wallet and quota 2.
2. Submit A2 and A4 from `TESTING.md`; confirm both verdicts and `QUOTA_MET`.
3. Freeze from the creator wallet.
4. Switch to the beneficiary wallet and acknowledge.
5. Verify `ACKNOWLEDGED`, both statement records, and all transaction hashes in Explorer.

**Expected outcome:** Two `AUTHOR_COMMITMENT` records move the register to `QUOTA_MET`; creator freeze moves it to `FROZEN`; only the stored beneficiary can move it to `ACKNOWLEDGED`. Explorer state and the dApp must match.

## Deployment fields

```text
GitHub: PENDING v1.1 push
Live dApp: PENDING v1.1 deployment
Contract address: 0xB38385BFFe6415e6B1d12E2a9610dCcB72F790EB
Deploy transaction: 0xa53682819d9bd0a29fc4a824928ff67925cb03fecc72eeed7ec95bad21417447
Explorer: https://explorer-studio.genlayer.com/address/0xB38385BFFe6415e6B1d12E2a9610dCcB72F790EB
Source SHA-256: 50b56198975167d8ff11328be0f7f5cb01329ad48a884fa27ae5e6bc7c2314d9
Runtime proof: NOT RUN
```

The product name is OwnThePromise; the Intelligent Contract class is AttributionGate. This difference is intentional and should be stated wherever the contract link is shown.
