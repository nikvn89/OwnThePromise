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

## Production Vercel verification

Live:

```text
https://own-the-promise.vercel.app/
```

Observed production regression:

```text
Connect MetaMask                       PASS
Create register                        PASS
Load accepted OPEN state               PASS
NOT_AUTHOR_COMMITMENT render           PASS
AUTHOR_COMMITMENT render               PASS
QUOTA_MET render                       PASS
Freeze write                           PASS
FROZEN accepted state                  PASS
Statements tab                         PASS
Frozen statement-submit lock           PASS
```

Production register:

```text
Vercel demo 01
```

Final observed state:

```text
FROZEN
recorded_count = 2
owned_count = 1 / 1
```

No production failure was observed in this tested flow.
