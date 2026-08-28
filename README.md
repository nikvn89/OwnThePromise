# OwnThePromise

**Speech-act attribution on GenLayer.**

> Quoting a promise is not making one.

OwnThePromise evaluates whether a submitted sentence itself places the declared author role in the position of the party that will perform the described future action or result.

It does **not** verify real-world identity, legal enforceability, promise strength, testability, actual performance, or off-chain facts.

## Why GenLayer

Traditional deterministic smart contracts cannot reliably determine who a natural-language sentence attributes a future action to.

OwnThePromise uses GenLayer AI-validator consensus for one narrow semantic decision:

```text
AUTHOR_COMMITMENT
NOT_AUTHOR_COMMITMENT
```

The contract then applies deterministic state consequences.

```text
AUTHOR_COMMITMENT
-> owned_count += 1
-> recorded_count += 1

NOT_AUTHOR_COMMITMENT
-> owned_count unchanged
-> recorded_count += 1
```

When:

```text
owned_count >= required_commitments
```

the register reaches:

```text
QUOTA_MET
```

The creator may then permanently freeze it:

```text
FROZEN
```

## Project deployment

```text
Network: StudioNet
Contract: AttributionGate
Address: 0xD73E8602FD5467577e8441Cdb25F5521B4A61530
```

Explorer:

https://explorer-studio.genlayer.com/address/0xD73E8602FD5467577e8441Cdb25F5521B4A61530

## Product flow

1. Create a register with a name, declared author role, and required commitment quota.
2. Submit one sentence at a time.
3. GenLayer validators classify whether the declared author role is actually the party taking on the future action.
4. Only `AUTHOR_COMMITMENT` advances the owned quota.
5. Once the quota is met, the creator may freeze the register permanently.

## States

```text
OPEN
QUOTA_MET
FROZEN
```

`FROZEN` is a one-way deterministic latch.

## Frontend

The dApp provides two tabs:

```text
Register
Statements
```

The frontend:

- uses accepted contract state as the source of truth,
- computes register IDs locally,
- separates transaction submission from accepted-state refresh,
- prevents double submission,
- uses a same-origin StudioNet RPC proxy,
- does not poll transaction receipts in a loop,
- resets loaded state on wallet/account changes,
- displays only contract-returned semantic verdicts,
- disables statement submission once the register is frozen.

## Observed local runtime evidence

### Frontend demo 02

Initial state:

```text
OPEN
recorded_count = 0
owned_count = 0
required_commitments = 1
```

Submitted:

```text
The vendor says it will publish the migration plan before production cutover.
```

Observed accepted state:

```text
NOT_AUTHOR_COMMITMENT
OPEN
recorded_count = 1
owned_count = 0
```

A direct author commitment was then accepted and produced:

```text
AUTHOR_COMMITMENT
QUOTA_MET
recorded_count = 2
owned_count = 1
```

A further direct author commitment was accepted while the register was still unfrozen:

```text
AUTHOR_COMMITMENT
QUOTA_MET
recorded_count = 3
owned_count = 2
```

The creator then froze the register.

Observed:

```text
FROZEN
recorded_count = 3
owned_count = 2
```

The frontend disabled further statement submission after the accepted `FROZEN` state.

The Statements tab showed:

```text
#1 NOT_AUTHOR_COMMITMENT
#2 AUTHOR_COMMITMENT
#3 AUTHOR_COMMITMENT
```

### Long calldata runtime test

Register:

```text
Frontend long 01
```

Submitted 209-character statement:

```text
Our Platform Team hereby commits to publish a complete production migration plan, circulate that plan among release reviewers, and deliver the final approved version before the scheduled cutover window begins.
```

Observed accepted state:

```text
AUTHOR_COMMITMENT
QUOTA_MET
recorded_count = 1
owned_count = 1
```

A separate calldata probe also observed:

```text
SHORT: 77 chars, 182-byte payload -> OK
LONG: 241 chars, 348-byte payload -> OK
payload crosses 255 bytes at 151 characters
contract statement cap = 800 characters
```

This confirms the tested long statement path works beyond the historical 255-byte payload boundary.

See `TESTING.md` and `FRONTEND_TESTING.md` for the exact evidence scope.

## Local development

```bash
npm install
npm run build
npm run dev
```

Open:

```text
http://localhost:5173/
```

## Vercel environment

```text
VITE_CONTRACT_ADDRESS=0xD73E8602FD5467577e8441Cdb25F5521B4A61530
VITE_RPC_PATH=/api/rpc
```

## Important limitation

OwnThePromise answers only:

> Does this submitted sentence itself put the declared author role in the position of the party that will perform the described future action or result?

It does not prove that the connected wallet truly represents that role, that a promise is legally binding, or that the promised action was later performed.
