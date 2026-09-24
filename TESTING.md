# OwnThePromise v1.1 — Test Plan and Evidence Record

This document never treats transaction submission, `ACCEPTED` consensus alone, or an older deployment as proof. A runtime row becomes PASS only when it contains the v1.1 transaction hash, intended execution/semantic result, and matching accepted post-state.

## Deployment under test

```text
Network: StudioNet (61999)
Contract class: AttributionGate
Project source file: contract/OwnThePromise.py
Contract address: 0xB38385BFFe6415e6B1d12E2a9610dCcB72F790EB
Deploy transaction: 0xa53682819d9bd0a29fc4a824928ff67925cb03fecc72eeed7ec95bad21417447
Source SHA-256: 50b56198975167d8ff11328be0f7f5cb01329ad48a884fa27ae5e6bc7c2314d9
Runtime status: NOT RUN
```

Deployment evidence observed:

```text
Consensus: Accepted
GenVM result: SUCCESS
get_config.project_name: OwnThePromise
get_config.contract_name: AttributionGate
get_config.version: 1.1
get_config.attempts_per_required_commitment: 2
get_config.beneficiary_acknowledgement_required: true
```

This proves deployment and configuration identity, not the semantic workflow or state transitions below.

Wallet notation:

```text
C = register creator
B = beneficiary, different from C
X = unrelated wallet
```

## Local gates

| Gate | Command | Result |
|---|---|---|
| Dependency lock | `npm ci --ignore-scripts` | PASS |
| A1-A5 fixture integrity/leak guard | `python3 tests/ag_kill.py` | PASS |
| Unicode normalization parity | `node tests/parity.mjs` | PASS |
| Required source guards | `node tools/verify-project.mjs` | PASS |
| TypeScript + production build | `npm run build` | PASS |

These are local checks, not StudioNet runtime proof.

## Runtime setup

Create register **A** from C:

```text
name = A1-A5 attribution test
author_role_label = Sponsor
beneficiary_address = B
required_commitments = 3
expected statement_limit = 6
```

Create register **B** from C for the complete lifecycle:

```text
name = Beneficiary lifecycle test
author_role_label = Sponsor
beneficiary_address = B
required_commitments = 2
expected statement_limit = 4
```

Create register **C** from C for the dynamic attempt limit:

```text
name = Dynamic limit test
author_role_label = Sponsor
beneficiary_address = B
required_commitments = 1
expected statement_limit = 2
```

Record the transaction hash, register ID, and accepted `get_register` result for each successful creation.

## A1-A5 semantic kill-test

Submit these exact statements to register A, in order:

| ID | Exact statement | Expected verdict | TX hash | Accepted post-state | Status |
|---|---|---|---|---|---|
| A1 | We understand the central laboratory will release the final assay results to investigators before database lock. | `NOT_AUTHOR_COMMITMENT` | PENDING | PENDING | NOT RUN |
| A2 | The Sponsor shall release the final assay results to investigators before database lock. | `AUTHOR_COMMITMENT` | PENDING | PENDING | NOT RUN |
| A3 | We are on track to release the final assay results well before database lock. | `NOT_AUTHOR_COMMITMENT` | PENDING | PENDING | NOT RUN |
| A4 | We will release the final assay results to investigators before database lock. | `AUTHOR_COMMITMENT` | PENDING | PENDING | NOT RUN |
| A5 | Assay results are normally released to investigators before database lock. | `NOT_AUTHOR_COMMITMENT` | PENDING | PENDING | NOT RUN |

Expected final A state:

```text
state = OPEN
recorded_count = 5
owned_count = 2
required_commitments = 3
statement_limit = 6
```

This set tests the rubric claim that grammatical person alone does not determine attribution. All five rows must match; a plausible verdict is insufficient without a transaction hash and accepted state.

## Full lifecycle

Use register B. Submit A2 and A4 exactly. Both must return `AUTHOR_COMMITMENT`; accepted state must become `QUOTA_MET` with `recorded_count=2` and `owned_count=2`. Then:

| Action | Caller | Expected result | TX hash | Verified post-state | Status |
|---|---|---|---|---|---|
| Freeze B | C | GenVM success; `FROZEN` | PENDING | PENDING | NOT RUN |
| Submit after frozen | C | rollback `Register is frozen` | PENDING | counts unchanged | NOT RUN |
| Freeze twice | C | rollback `Register is already frozen` | PENDING | remains `FROZEN` | NOT RUN |
| Acknowledge B | X | rollback `Only register beneficiary...` | PENDING | `acknowledged=false` | NOT RUN |
| Acknowledge B | B | GenVM success; `ACKNOWLEDGED` | PENDING | PENDING | NOT RUN |
| Acknowledge twice | B | rollback `Register is already acknowledged` | PENDING | remains `ACKNOWLEDGED` | NOT RUN |

## Negative and invariant paths

| Test | Expected result | TX hash | Status |
|---|---|---|---|
| Create with zero/invalid beneficiary | rollback; no register | PENDING | NOT RUN |
| Create with beneficiary equal to creator | rollback; no register | PENDING | NOT RUN |
| Non-creator submit | rollback `Only register creator...` | PENDING | NOT RUN |
| Non-creator freeze | rollback `Only register creator...` | PENDING | NOT RUN |
| Freeze A before quota | rollback; A remains OPEN | PENDING | NOT RUN |
| Beneficiary acknowledge A before freeze | rollback `Only a frozen register...` | PENDING | NOT RUN |
| Empty statement | rollback; counts unchanged | PENDING | NOT RUN |
| 801-character statement | rollback; counts unchanged | PENDING | NOT RUN |
| Role label containing newline | rollback; no register | PENDING | NOT RUN |
| Statement containing `DECISION RULES` | rollback reserved token; counts unchanged | PENDING | NOT RUN |
| Statement containing `<UNTRUSTED_STATEMENT>` | rollback reserved token; counts unchanged | PENDING | NOT RUN |
| Whitespace-only variant of A2 on A | rollback `Statement already exists`; counts unchanged | PENDING | NOT RUN |
| Third distinct statement on C after two accepted attempts | rollback `Register statement limit reached` | PENDING | NOT RUN |

Malformed model output is guarded in source and local verification. It must raise `Invalid semantic output` before `StatementRecord` or counter writes can persist. Do not claim a live PASS unless the deployed environment provides a controlled way to induce and verify this path.

## Long write

Submit one valid statement longer than the historical 255-byte serialized payload boundary. A probe result alone does not pass this test.

```text
Transaction hash: PENDING
GenVM result: PENDING
Semantic verdict: PENDING
Accepted statement record: PENDING
Accepted register counters: PENDING
Status: NOT RUN
```

## Completion rule

Before submission, replace every successful runtime `PENDING` with an explorer transaction hash and the matching accepted state. For rollback tests, record the transaction hash and exact leader rollback reason. If any row is not executed, leave it `NOT RUN`; never upgrade it from source inspection alone.
