# OwnThePromise — Testing

This file records only observed runtime evidence. It does not mark untested behavior as PASS.

## Deployment

```text
Network: StudioNet
Contract: AttributionGate
Address: 0xD73E8602FD5467577e8441Cdb25F5521B4A61530
```

Explorer:

https://explorer-studio.genlayer.com/address/0xD73E8602FD5467577e8441Cdb25F5521B4A61530

## Local frontend runtime

Connected wallet:

```text
0x6276095FAEA15108740445ff277fdA8c304657F4
```

### Test 1 — Create register

Input:

```text
name = Frontend demo 02
author role = Platform Team
required commitments = 1
```

Observed accepted state:

```text
OPEN
recorded_count = 0
owned_count = 0
required_commitments = 1
```

Result:

```text
PASS
```

### Test 2 — NOT_AUTHOR_COMMITMENT

Submitted:

```text
The vendor says it will publish the migration plan before production cutover.
```

Observed accepted state:

```text
OPEN
recorded_count = 1
owned_count = 0
```

Statements tab showed:

```text
NOT_AUTHOR_COMMITMENT
Stored, does not count
```

Result:

```text
PASS
```

### Test 3 — AUTHOR_COMMITMENT reaches quota

A direct author commitment was submitted.

Observed accepted state:

```text
QUOTA_MET
recorded_count = 2
owned_count = 1
required_commitments = 1
```

Result:

```text
PASS
```

### Test 4 — Additional author commitment before freeze

Submitted:

```text
We will publish another migration update after cutover.
```

Observed accepted state:

```text
QUOTA_MET
recorded_count = 3
owned_count = 2
```

This confirms quota is a minimum threshold; the register remains writable until explicitly frozen.

Result:

```text
PASS
```

### Test 5 — Freeze register

Creator executed the deterministic freeze action after the quota was met.

Observed:

```text
FROZEN
recorded_count = 3
owned_count = 2
```

The frontend then disabled statement submission.

Result:

```text
PASS
```

### Test 6 — Statements history

Observed list:

```text
#1 NOT_AUTHOR_COMMITMENT
#2 AUTHOR_COMMITMENT
#3 AUTHOR_COMMITMENT
```

Result:

```text
PASS
```

## Long calldata evidence

### Probe

The included tool:

```text
tools/probe-calldata.mjs
```

was run against the Project contract and a live register.

Observed:

```text
READ get_register:
98-byte payload -> OK

SHORT submit_statement:
77 chars
182-byte payload
RESULT OK

LONG submit_statement:
241 chars
348-byte payload
RESULT OK

submit_statement crosses 255 bytes at 151 characters
contract statement cap = 800
```

### Actual long write

Register:

```text
Frontend long 01
```

Submitted statement:

```text
Our Platform Team hereby commits to publish a complete production migration plan, circulate that plan among release reviewers, and deliver the final approved version before the scheduled cutover window begins.
```

Frontend length:

```text
209 / 800
```

Observed accepted state:

```text
AUTHOR_COMMITMENT
QUOTA_MET
recorded_count = 1
owned_count = 1
```

Transaction status displayed:

```text
Accepted state changed as expected. The write landed.
```

Result:

```text
PASS
```

This is runtime evidence for a real accepted StudioNet write beyond the 255-byte payload boundary, not only an estimate-gas probe.

## Evidence not claimed here

This local frontend session did not separately re-test every contract-level negative case such as:

```text
non-creator freeze
empty statement
801-character statement
21st statement
role-label newline rejection
exact replay
quota outside 0..10
```

Those should not be described as frontend runtime PASS unless separately observed.


## Vercel production regression

Live:

```text
https://own-the-promise.vercel.app/
```

GitHub:

```text
https://github.com/nikvn89/OwnThePromise
```

### Production Test 1 — Create register

Input:

```text
name = Vercel demo 01
author role = Platform Team
required commitments = 1
```

Observed:

```text
OPEN
recorded_count = 0
owned_count = 0
required_commitments = 1
```

Result:

```text
PASS
```

### Production Test 2 — NOT_AUTHOR_COMMITMENT

Submitted:

```text
The vendor says it will publish the migration plan before production cutover.
```

Observed in the Statements tab:

```text
NOT_AUTHOR_COMMITMENT
Stored, does not count
```

Accepted register state remained:

```text
OPEN
recorded_count = 1
owned_count = 0
```

Result:

```text
PASS
```

### Production Test 3 — AUTHOR_COMMITMENT / QUOTA_MET

Submitted:

```text
The undersigned undertakes to publish the migration plan before cutover.
```

Observed:

```text
QUOTA_MET
recorded_count = 2
owned_count = 1
required_commitments = 1
```

Result:

```text
PASS
```

### Production Test 4 — Freeze

Creator executed `freeze_register`.

Observed:

```text
FROZEN
recorded_count = 2
owned_count = 1
```

The production UI disabled further statement submission.

Result:

```text
PASS
```

### Production conclusion

Observed end-to-end Vercel flow:

```text
Create register                 PASS
NOT_AUTHOR_COMMITMENT           PASS
AUTHOR_COMMITMENT               PASS
QUOTA_MET                       PASS
Freeze                          PASS
FROZEN accepted state           PASS
Statements rendering            PASS
Frozen submit lock              PASS
```

