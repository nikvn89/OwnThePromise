/**
 * Contract reverts are the evidence this project is built on. The GenLayer
 * revert text is buried inside a long viem/RPC error string, so it must be
 * extracted or the reviewer sees a wall of transport noise instead of
 * "Register has 0 of 1 own commitments".
 */
export function errorMessage(error: unknown): string {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string"
        ? error
        : (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return "Unknown error";
            }
          })();

  const rollback = raw.match(/\[rollback\]\s*([^\n"]+)/i);
  if (rollback?.[1]) return rollback[1].trim();

  const userError = raw.match(/UserError[:\s]+([^\n"]+)/i);
  if (userError?.[1]) return userError[1].trim();

  if (/user rejected|rejected the request|user denied/i.test(raw)) {
    return "Wallet request was rejected.";
  }
  if (/429|rate limit|too many requests/i.test(raw)) {
    return "StudioNet rate limit reached. Wait before submitting again.";
  }
  if (/failed to fetch|networkerror|network request failed/i.test(raw)) {
    return "Network/RPC request failed. If a transaction hash was already returned, the transaction may still be submitted.";
  }

  return raw.length > 260 ? raw.slice(0, 257) + "…" : raw;
}
