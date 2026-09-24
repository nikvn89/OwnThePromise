# OwnThePromise v1.1

OwnThePromise records natural-language commitments and asks GenLayer validators one narrow question: does the submitted statement itself place the declared author role in the position of the party that will perform the future action or produce the future result?

The product is **OwnThePromise**. Its Intelligent Contract class is **AttributionGate**.

## Release status

| Item | v1.1 status |
|---|---|
| Local static tests | PASS |
| TypeScript build | PASS |
| StudioNet deployment | PASS — GenVM SUCCESS |
| Accepted `get_config` identity | PASS — OwnThePromise / AttributionGate / 1.1 |
| StudioNet runtime proof | NOT RUN |
| Vercel deployment | PENDING REDEPLOY with current contract address |
| Submission readiness | NOT READY until runtime hashes are recorded |

Exact contract source:

```text
contract/OwnThePromise.py
SHA-256: 50b56198975167d8ff11328be0f7f5cb01329ad48a884fa27ae5e6bc7c2314d9
Lines: 758
Bytes: 23594
Network: StudioNet (chain 61999)
py-genlayer: v0.2 dependency header
```

StudioNet deployment:

```text
Address: 0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc
Deploy transaction: 0x764f837116f8b0437deb3d5927e51d25d395eb3b5b38317923b3bd0bb4c9e372
Execution: GenVM SUCCESS
Consensus: Accepted
get_config: project_name=OwnThePromise, contract_name=AttributionGate, version=1.1
```

Explorer: https://explorer-studio.genlayer.com/address/0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc

The deployment and configuration identity are verified. The business runtime flow is still pending and is not claimed as PASS.

## What the contract decides

Semantic consensus returns exactly one verdict:

```text
AUTHOR_COMMITMENT
NOT_AUTHOR_COMMITMENT
```

The contract does not verify real-world identity, legal enforceability, promise strength, testability, performance, or external facts. Wallet roles are explicit on-chain addresses; they are not inferred by the model.

Deterministic effects:

- every accepted statement increments `recorded_count`;
- only `AUTHOR_COMMITMENT` increments `owned_count`;
- only the creator may submit statements and freeze the register;
- freeze requires `owned_count >= required_commitments`;
- only the stored beneficiary may acknowledge a frozen register.

State progression:

```text
OPEN -> QUOTA_MET -> FROZEN -> ACKNOWLEDGED
```

## v1.1 security behavior

- Invalid or malformed semantic output raises `Invalid semantic output`; the transaction rolls back and creates no statement or counter change.
- User text containing prompt delimiters, verdict labels, or rubric headers is rejected rather than modified.
- Statement whitespace is collapsed before classification, storage, and ID calculation. Cosmetic whitespace variants therefore collide with the original statement ID.
- Register and statement ID prefixes remain `ATTRIBUTION_GATE:*:V1`; existing formulas were not redesigned.
- The statement limit is `min(20, 2 * required_commitments)`.
- A frozen register has a two-party consequence: its beneficiary, not its creator, gains the right to acknowledge it.

## Grinding bound

The previous fixed allowance of 20 attempts was too permissive when only one commitment was required. If the per-attempt false-positive probability is `p`, the chance of at least one false positive in `n` attempts is:

```text
1 - (1 - p)^n
```

With 20 attempts, this is 98.8% at `p=20%`, 87.8% at `p=10%`, and 64.2% at `p=5%`.

v1.1 gives a register requiring one commitment only two attempts. The same values become 36%, 19%, and 9.75%. This limits retry grinding; it does not eliminate semantic misclassification. Higher commitment quotas provide stronger evidence.

## Frontend confirmation model

The Vite/React frontend:

- reads `stateStatus: "accepted"` through the same-origin RPC proxy;
- treats a returned transaction hash as submitted, not completed;
- confirms writes by matching the expected accepted state;
- checks the leader rollback reason only after state matching times out;
- computes Python-compatible register and normalized statement IDs locally;
- derives creator and beneficiary authorization from accepted contract state;
- contains no hardcoded reviewer wallet.

## Local verification

Requirements: Node.js 20+, npm, and Python 3.

```bash
npm ci --ignore-scripts
npm run check
```

`npm run check` executes the A1-A5 adversarial fixture integrity/leak guard, exhaustive Unicode whitespace parity test, source guard verification, TypeScript compilation, and production Vite build. Actual A1-A5 verdicts remain a StudioNet runtime test.

## Complete v1.1 runtime proof

1. Follow `TESTING.md`; record every transaction hash and accepted post-state.
2. Complete the A1-A5 semantic test and beneficiary lifecycle.
3. Deploy the verified frontend to Vercel.
4. Follow `FRONTEND_TESTING.md` on the live dApp.
5. Replace remaining `PENDING` fields in `SUBMISSION_NOTE.md` only after evidence exists.

Environment:

```text
VITE_CONTRACT_ADDRESS=0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc
VITE_RPC_PATH=/api/rpc
```

## Calldata probe limitation

`tools/probe-calldata.mjs` uses `eth_estimateGas` against the consensus entrypoint. An OK response proves only that the EVM entrypoint received that serialized payload. It does **not** prove GenVM decoding, authorization, semantic execution, consensus, or an accepted state change. Only a real accepted write with a transaction hash and verified post-state is runtime proof.
