# OwnThePromise — Frontend Testing

## Local status

Observed local runtime:

```text
Create register                         PASS
Load accepted state                    PASS
NOT_AUTHOR_COMMITMENT rendering        PASS
AUTHOR_COMMITMENT rendering            PASS
Quota progression                      PASS
QUOTA_MET state                        PASS
Freeze                                 PASS
FROZEN state                           PASS
Frozen submit-button lock              PASS
Statements history                     PASS
Long calldata >255-byte write          PASS
Accepted-state status messaging        PASS
```

## Production Vercel verification — pending

Do not mark production PASS until the deployed Vercel app is tested.

After deployment, perform this short regression:

1. Connect MetaMask on StudioNet.
2. Load the existing `Frontend long 01` register or create one fresh register.
3. Verify accepted state renders correctly.
4. Submit one statement and confirm the accepted-state refresh lands.
5. Open the Statements tab and confirm the contract-returned verdict appears.

Also confirm:

```text
/api/rpc works on the Vercel domain
no CORS failure
no duplicate MetaMask prompt
no false-success message
wallet/account switch clears stale loaded state
official GenLayer logo renders
OwnThePromise logo renders
```

Only after those observations should production Vercel be marked PASS.
