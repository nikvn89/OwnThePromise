# OwnThePromise v1.1 — Frontend Verification

## Current status

```text
Local static checks: PASS
Local production build: PASS
StudioNet v1.1 runtime: NOT RUN
Vercel v1.1 runtime: NOT RUN
```

The frontend is pinned to the v1.1 Project deployment:

```text
0xB38385BFFe6415e6B1d12E2a9610dCcB72F790EB
```

## Local checks

```bash
npm ci --ignore-scripts
npm run check
```

Observed locally:

| Check | Status |
|---|---|
| Python/TypeScript whitespace parity | PASS |
| Register ID parity helpers retained | PASS |
| Normalized statement ID helper present | PASS |
| Accepted-state reads and matching compile | PASS |
| Delayed leader rollback lookup compiles | PASS |
| Beneficiary acknowledgement UI compiles | PASS |
| Production Vite bundle | PASS |

## Short dApp path

Using the pinned Project contract:

1. Connect creator wallet C on StudioNet.
2. Create a register with beneficiary B and quota 2; save the transaction hash.
3. Submit A2 and A4 from `TESTING.md`; verify both accepted verdicts and `QUOTA_MET`.
4. Freeze from C; verify accepted `FROZEN` state.
5. Switch to B and acknowledge; verify accepted `ACKNOWLEDGED` state.
6. Open the statements view and compare both records, IDs, verdicts, and counters with Explorer.

## Runtime checklist

| UI behavior | Evidence required | Status |
|---|---|---|
| Correct v1.1 address displayed | address + source hash | NOT RUN |
| Wallet switches to chain 61999 | screenshot or observation | NOT RUN |
| Creator/beneficiary authorization follows accepted state | hashes + state | NOT RUN |
| A2 and A4 render `AUTHOR_COMMITMENT` | hashes + statement views | NOT RUN |
| `QUOTA_MET` renders after two owned commitments | accepted register view | NOT RUN |
| Frozen register disables statement submission | freeze hash + UI | NOT RUN |
| Beneficiary can acknowledge | acknowledge hash + state | NOT RUN |
| Non-beneficiary cannot acknowledge | rollback hash/reason | NOT RUN |
| `ACKNOWLEDGED` renders | accepted register view | NOT RUN |
| Account change clears/reloads role-sensitive state | observation | NOT RUN |
| Timeout surfaces leader rollback reason | rollback test | NOT RUN |
| Vercel production matches local behavior | URL + hashes/state | NOT RUN |

Do not mark a row PASS from a toast, a returned hash, or transaction consensus status alone. Verify the intended accepted contract state.
