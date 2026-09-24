# OwnThePromise v1.1 — Frontend Verification

## Verified deployment

```text
Live dApp: https://own-the-promise.vercel.app
Network: StudioNet (61999)
Contract: 0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc
Local production build: PASS
Vercel accepted-state reads: PASS
Vercel transaction confirmation: PASS
```

## Completed UI checks

| UI behavior | Accepted-state evidence | Status |
|---|---|---|
| Correct Project contract displayed | `0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc` | PASS |
| Creator creates a register | lifecycle and negative registers load from accepted state | PASS |
| Positive semantic result | two records render `AUTHOR_COMMITMENT` and counted | PASS |
| Negative semantic result | one record renders `NOT_AUTHOR_COMMITMENT`, not counted | PASS |
| Quota transition | lifecycle register renders `QUOTA_MET` at owned 2/2 | PASS |
| Freeze transition | accepted state renders `FROZEN` | PASS |
| Beneficiary acknowledgement | accepted state renders `ACKNOWLEDGED` | PASS |
| Terminal controls disabled | submit/freeze/acknowledge controls reflect accepted terminal state | PASS |
| Production confirmation message | shown only after accepted state changed as expected | PASS |

The first failed acknowledgement attempt was classified as a wallet/RPC submission failure and was not treated as a contract rollback or successful write. After the StudioNet RPC recovered, the beneficiary write finalized and the dApp verified `ACKNOWLEDGED` from accepted state.

## Read-only reviewer path

1. Open https://own-the-promise.vercel.app.
2. Load `2d543cb37ff399f76cff00975c6ae40461466443d746f28d56dc6779fd57e4c7`; verify `ACKNOWLEDGED`, recorded `2/4`, owned `2/2`.
3. Open **Statements**; verify two counted `AUTHOR_COMMITMENT` records.
4. Load `ab9fcd7d5f8cea783e4989c5c73aa75c7f270694381f33821fa40d968392e19e`; verify `OPEN`, recorded `1/2`, owned `0/1`.
5. Open **Statements**; verify the quoted statement is `NOT_AUTHOR_COMMITMENT` and not counted.
6. Use the Explorer link to confirm the corresponding transactions.

No wallet signature is required for this reviewer path.

## Local verification

```bash
npm ci --ignore-scripts
npm run check
```

Do not infer runtime behavior from the local build alone; the completed runtime evidence is recorded in `TESTING.md`.
