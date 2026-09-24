# OwnThePromise v1.1 — Test Plan and Evidence

This record distinguishes accepted post-state, successful execution, semantic verdicts, and tests that have not been run. `FINALIZED` or `Accepted` alone is not treated as behavioral proof.

## Deployment under test

```text
Network: StudioNet (61999)
Contract: 0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc
Deploy transaction: 0x764f837116f8b0437deb3d5927e51d25d395eb3b5b38317923b3bd0bb4c9e372
Source: contract/OwnThePromise.py
SHA-256: 50b56198975167d8ff11328be0f7f5cb01329ad48a884fa27ae5e6bc7c2314d9
Runtime status: CORE PROJECT FLOW PASS
```

Deployment and `get_config` were accepted with GenVM `SUCCESS`:

```text
project_name: OwnThePromise
contract_name: AttributionGate
version: 1.1
attempts_per_required_commitment: 2
beneficiary_acknowledgement_required: true
```

## Local gates

| Gate | Command | Result |
|---|---|---|
| Clean dependency install | `npm ci --ignore-scripts` | PASS |
| Fixture integrity/leak guard | `python3 tests/ag_kill.py` | PASS |
| Unicode normalization parity | `node tests/parity.mjs` | PASS |
| Source and configuration guards | `node tools/verify-project.mjs` | PASS |
| TypeScript and production build | `npm run build` | PASS |

These checks do not replace the runtime evidence below.

## Runtime proof A — complete two-party lifecycle

```text
Register ID: 2d543cb37ff399f76cff00975c6ae40461466443d746f28d56dc6779fd57e4c7
Name: Beneficiary lifecycle test
Creator: 0x6276095FAEA15108740445ff277fdA8c304657F4
Beneficiary: 0x146e44881d35814bA582D265AF5b97ef2695ec8e
Author role: Sponsor
Required: 2
Statement limit: 4
```

| Step | Exact input or method | Transaction | Execution / consensus | Accepted post-state |
|---|---|---|---|---|
| Create | `Beneficiary lifecycle test`, `Sponsor`, beneficiary above, quota 2 | `0x7c56c9fba9c503f628f2a7689ab826c5cc4fd8b992dcae58da59b3ae0edc1a4a` | `SUCCESS` / `Accepted` / `Finalized` | `OPEN`, recorded 0, owned 0, limit 4 |
| Submit 1 | `The Sponsor shall release the final assay results to investigators before database lock.` | `0x2cbacd0162ed3d6570b08226cae3f11d8f264f032194aaebf080ed84eeeedab2` | `AUTHOR_COMMITMENT`; `SUCCESS` / `Accepted` / `Finalized` | recorded 1, owned 1 |
| Submit 2 | `We will release the final assay results to investigators before database lock.` | `0x26d8e69ff1fc059323d23ba52780e3217e658a398f9e8f1788679823e8a44bde` | `AUTHOR_COMMITMENT`; `SUCCESS` / `Accepted` / `Finalized` | `QUOTA_MET`, recorded 2, owned 2 |
| Freeze | `freeze_register(register_id)` | `0xbd5626d4c1edccf391d07940f60c52dc5a6ba9594e2f3fa6980152686849340d` | `SUCCESS` / `Accepted` / `Finalized` | `FROZEN`, counters unchanged |
| Acknowledge | beneficiary calls `acknowledge_register(register_id)` | `0x5d97ca93ebf0dec7840120a059ee517e6d763855cd961f0563e938bfea9d8e67` | `SUCCESS` / `Accepted` / `Finalized` | `ACKNOWLEDGED`, `acknowledged=true` |

Accepted read after finality:

```text
state = ACKNOWLEDGED
recorded_count = 2
owned_count = 2
required_commitments = 2
statement_limit = 4
frozen = true
acknowledged = true
```

## Runtime proof B — quoted commitment does not count

```text
Register ID: ab9fcd7d5f8cea783e4989c5c73aa75c7f270694381f33821fa40d968392e19e
Statement ID: c97fc12f9358ee1f68d7be29e2693e584b32954a8fa938141cf7a1197c6a1ec6
Name: Negative attribution test
Creator: 0x6276095FAEA15108740445ff277fdA8c304657F4
Beneficiary: 0x146e44881d35814bA582D265AF5b97ef2695ec8e
Author role: Sponsor
Required: 1
Statement limit: 2
```

Create transaction:

```text
0xbbd5f894c9756bd5df0b11eb35623a1cebdd458d0892e57d2791a9ee4518b8c2
```

Exact statement:

```text
We understand the central laboratory will release the final assay results to investigators before database lock.
```

Submit transaction:

```text
0x3831eaa52c8beaff424efc0cd8fd1449a88675251115b99e7bb651b554d1f926
```

Verified result:

```text
GenVM = SUCCESS
Consensus = Accepted
Lifecycle = Finalized
verdict = NOT_AUTHOR_COMMITMENT
counted = false
state = OPEN
recorded_count = 1
owned_count = 0
required_commitments = 1
statement_limit = 2
```

This is the decisive counterexample for the product claim: the statement reports another party's future action and does not advance the Sponsor's commitment quota.

## Runtime scope not claimed

The following adversarial or authorization-negative writes were not executed on this Project deployment and are not claimed as live PASS:

| Case | Expected contract result | Live status |
|---|---|---|
| Non-creator submit | rollback `Only register creator may submit statements` | NOT RUN |
| Non-creator freeze | rollback `Only register creator may freeze the register` | NOT RUN |
| Non-beneficiary acknowledge | rollback `Only register beneficiary may acknowledge the register` | NOT RUN |
| Freeze before quota | rollback; state remains `OPEN` | NOT RUN |
| Submit after freeze | rollback `Register is frozen` | NOT RUN |
| Duplicate statement | rollback `Statement already exists` | NOT RUN |
| Exceed dynamic statement limit | rollback `Register statement limit reached` | NOT RUN |
| Reserved prompt token | rollback before semantic execution | NOT RUN |
| Invalid model output | rollback before record/counter persistence | NOT RUN |

The source guards and local verification cover their intended invariants, but this table deliberately does not upgrade them to runtime PASS.

## Short reviewer path

1. Open https://own-the-promise.vercel.app and verify StudioNet plus contract `0x4181...0768Dc`.
2. Paste lifecycle register ID `2d543cb37ff399f76cff00975c6ae40461466443d746f28d56dc6779fd57e4c7` and load accepted state.
3. Verify `ACKNOWLEDGED`, recorded `2/4`, owned `2/2`, and both `AUTHOR_COMMITMENT` statement records.
4. Paste negative register ID `ab9fcd7d5f8cea783e4989c5c73aa75c7f270694381f33821fa40d968392e19e`.
5. Verify `OPEN`, recorded `1/2`, owned `0/1`, and verdict `NOT_AUTHOR_COMMITMENT`.
6. Open the contract in Explorer and confirm the listed transactions are finalized with GenVM `SUCCESS` and consensus `Accepted`.
