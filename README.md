# OwnThePromise v1.1

OwnThePromise records natural-language commitments and asks GenLayer validators one narrow question: does the submitted statement itself place the declared author role in the position of the party that will perform the future action or produce the future result?

The public Project is **OwnThePromise**. Its Intelligent Contract class is **AttributionGate**.

## Project status

| Item | Status |
|---|---|
| Local verification and production build | PASS |
| StudioNet deployment and configuration | PASS |
| Positive semantic path | PASS — two `AUTHOR_COMMITMENT` records |
| Negative semantic path | PASS — one `NOT_AUTHOR_COMMITMENT` record |
| Quota, freeze, and beneficiary acknowledgement | PASS |
| Live Vercel dApp | PASS |

Live dApp: https://own-the-promise.vercel.app

Explorer: https://explorer-studio.genlayer.com/address/0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc

## Deployment identity

```text
Network: StudioNet
Chain ID: 61999
Contract: 0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc
Deploy transaction: 0x764f837116f8b0437deb3d5927e51d25d395eb3b5b38317923b3bd0bb4c9e372
Execution: GenVM SUCCESS
Consensus: Accepted
Project source: contract/OwnThePromise.py
Contract class: AttributionGate
Version: 1.1
SHA-256: 50b56198975167d8ff11328be0f7f5cb01329ad48a884fa27ae5e6bc7c2314d9
Lines: 758
Bytes: 23594
```

The public filename matches the Project name. The class and internal contract identity remain `AttributionGate`; the frozen source bytes were not changed for the frontend.

## What the contract decides

Semantic consensus returns exactly one verdict:

```text
AUTHOR_COMMITMENT
NOT_AUTHOR_COMMITMENT
```

The contract does not verify real-world identity, legal enforceability, promise strength, performance, or external facts. Wallet roles are stored explicitly on-chain and are not inferred by the model.

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

## Verified Project runtime

The completed lifecycle register is:

```text
Register ID: 2d543cb37ff399f76cff00975c6ae40461466443d746f28d56dc6779fd57e4c7
Name: Beneficiary lifecycle test
Creator: 0x6276095FAEA15108740445ff277fdA8c304657F4
Beneficiary: 0x146e44881d35814bA582D265AF5b97ef2695ec8e
Required commitments: 2
Recorded: 2
Owned: 2
State: ACKNOWLEDGED
```

| Action | Transaction | Verified result |
|---|---|---|
| Create register | `0x7c56c9fba9c503f628f2a7689ab826c5cc4fd8b992dcae58da59b3ae0edc1a4a` | `OPEN`, limit 4 |
| Submit “The Sponsor shall…” | `0x2cbacd0162ed3d6570b08226cae3f11d8f264f032194aaebf080ed84eeeedab2` | `AUTHOR_COMMITMENT`, counted |
| Submit “We will…” | `0x26d8e69ff1fc059323d23ba52780e3217e658a398f9e8f1788679823e8a44bde` | `AUTHOR_COMMITMENT`, counted; `QUOTA_MET` |
| Freeze | `0xbd5626d4c1edccf391d07940f60c52dc5a6ba9594e2f3fa6980152686849340d` | `FROZEN` |
| Beneficiary acknowledge | `0x5d97ca93ebf0dec7840120a059ee517e6d763855cd961f0563e938bfea9d8e67` | `ACKNOWLEDGED` |

The negative-attribution proof is:

```text
Register ID: ab9fcd7d5f8cea783e4989c5c73aa75c7f270694381f33821fa40d968392e19e
Statement ID: c97fc12f9358ee1f68d7be29e2693e584b32954a8fa938141cf7a1197c6a1ec6
Statement: We understand the central laboratory will release the final assay results to investigators before database lock.
Verdict: NOT_AUTHOR_COMMITMENT
Counted: false
Post-state: OPEN; recorded 1/2; owned 0/1
Create transaction: 0xbbd5f894c9756bd5df0b11eb35623a1cebdd458d0892e57d2791a9ee4518b8c2
Submit transaction: 0x3831eaa52c8beaff424efc0cd8fd1449a88675251115b99e7bb651b554d1f926
```

All listed writes are finalized with GenVM `SUCCESS` and consensus `Accepted`. Accepted-state reads after finality provide the stated verdicts, counters, and terminal state. Additional unexecuted adversarial cases remain explicitly identified in `TESTING.md` and are not claimed as live PASS.

## Security behavior

- Invalid or malformed semantic output raises `Invalid semantic output`; the transaction rolls back before statement or counter persistence.
- User text containing prompt delimiters, verdict labels, or rubric headers is rejected rather than modified.
- Statement whitespace is collapsed before classification, storage, and ID calculation, so cosmetic whitespace variants collide with the original ID.
- Register and statement ID prefixes remain `ATTRIBUTION_GATE:*:V1`.
- The statement limit is `min(20, 2 * required_commitments)`.
- A frozen register has a two-party consequence: its beneficiary, not its creator, gains the right to acknowledge it.

## Grinding bound

If the per-attempt false-positive probability is `p`, the chance of at least one false positive in `n` attempts is:

```text
1 - (1 - p)^n
```

v1.1 ties the attempt limit to the required quota. A register requiring one commitment receives two attempts instead of a fixed allowance of 20. This limits retry grinding; it does not eliminate semantic misclassification.

## Frontend confirmation model

The Vite/React frontend:

- reads accepted contract state through a same-origin RPC proxy;
- treats a returned transaction hash as submitted, not completed;
- reports success only after the expected accepted state is observed;
- checks a leader rollback reason only after state matching times out;
- computes Python-compatible register and normalized statement IDs locally;
- derives creator and beneficiary authorization from accepted state;
- contains no hardcoded reviewer wallet or mock live data.

## Local verification

Requirements: Node.js 20+, npm, and Python 3.

```bash
npm ci --ignore-scripts
npm run check
```

`npm run check` runs fixture integrity/leak checks, exhaustive Unicode whitespace parity, source/configuration guards, TypeScript compilation, and the production Vite build. These local checks complement rather than replace the StudioNet runtime evidence above.

## Environment

```text
VITE_CONTRACT_ADDRESS=0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc
VITE_RPC_PATH=/api/rpc
```

## Calldata probe limitation

`tools/probe-calldata.mjs` uses `eth_estimateGas` against the consensus entrypoint. An OK response proves only that the EVM entrypoint received the serialized payload. It does not prove GenVM decoding, authorization, semantic execution, consensus, or an accepted state change.
