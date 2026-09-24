import { keccak256, stringToBytes } from "viem";

const PY_SPACE =
  "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const PY_TRIM_START = new RegExp("^[" + PY_SPACE + "]+");
const PY_TRIM_END = new RegExp("[" + PY_SPACE + "]+$");

export function pyStrip(value: string): string {
  return value.replace(PY_TRIM_START, "").replace(PY_TRIM_END, "");
}

export function pyLen(value: string): number {
  return Array.from(value).length;
}

/** Contract collapses internal whitespace in statements after stripping ends. */
export function pyCollapse(value: string): string {
  return value
    .split(new RegExp("[" + PY_SPACE + "]+"))
    .filter(Boolean)
    .join(" ");
}

function digest(payload: string): string {
  return keccak256(stringToBytes(payload)).slice(2).toLowerCase();
}

export function computeRegisterId(creator: string, name: string): string {
  const cleaned = pyStrip(name);
  return digest(
    "ATTRIBUTION_GATE:REGISTER:V1|" +
      creator.toLowerCase() +
      "|" +
      pyLen(cleaned) +
      "|" +
      cleaned
  );
}

export function computeStatementId(registerId: string, text: string): string {
  const cleaned = pyCollapse(text);
  return digest(
    "ATTRIBUTION_GATE:STATEMENT:V1|" +
      registerId.toLowerCase() +
      "|" +
      pyLen(cleaned) +
      "|" +
      cleaned
  );
}

export function normalizeId(value: string): string {
  return pyStrip(value).toLowerCase().replace(/^0x/, "");
}
