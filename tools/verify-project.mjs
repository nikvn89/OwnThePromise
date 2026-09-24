import fs from "node:fs";
import { createHash } from "node:crypto";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const contract = read("contract/OwnThePromise.py");
const ids = read("src/ids.ts");
const client = read("src/genlayer.ts");
const app = read("src/App.tsx");
const config = read("src/config.ts");
const envExample = read(".env.example");
const expectedContractSha256 = "50b56198975167d8ff11328be0f7f5cb01329ad48a884fa27ae5e6bc7c2314d9";
const expectedContractAddress = "0xB38385BFFe6415e6B1d12E2a9610dCcB72F790EB";

const actualContractSha256 = createHash("sha256").update(contract).digest("hex");
if (actualContractSha256 !== expectedContractSha256) {
  throw new Error(
    `Contract SHA-256 changed: expected ${expectedContractSha256}, got ${actualContractSha256}`
  );
}
if (!config.includes(expectedContractAddress) || !envExample.includes(expectedContractAddress)) {
  throw new Error("Frontend contract address is missing or inconsistent");
}

const requiredContractFragments = [
  '"ONLY QUESTION"',
  '"DECISION RULES"',
  '"DO NOT EVALUATE"',
  '"SECURITY RULE"',
  '"VERDICT"',
  'cleaned = " ".join(text.split())',
  'raise gl.vm.UserError("Invalid semantic output")',
  "beneficiary: Address",
  "acknowledged: bool",
  "def acknowledge_register(",
  "ATTEMPTS_PER_REQUIRED_COMMITMENT = 2",
  '"version": "1.1"',
];
for (const fragment of requiredContractFragments) {
  if (!contract.includes(fragment)) throw new Error(`Missing contract guard: ${fragment}`);
}

if (contract.includes('return {"verdict": NOT_AUTHOR_COMMITMENT}\n')) {
  throw new Error("Malformed semantic output can still fabricate NOT_AUTHOR_COMMITMENT");
}
if (!ids.includes("export function computeStatementId")) {
  throw new Error("computeStatementId missing");
}
if (!client.includes("export async function leaderRollbackReason")) {
  throw new Error("leaderRollbackReason missing");
}
for (const fragment of ["computeStatementId", "pyCollapse", "acknowledge_register", "leaderRollbackReason"]) {
  if (!app.includes(fragment)) throw new Error(`App wiring missing: ${fragment}`);
}

for (const fragment of [
  'useState("Clinical assay commitments")',
  'useState("Sponsor")',
  'useState("3")',
  'useState(\n    "We understand the central laboratory will release',
]) {
  if (app.includes(fragment)) throw new Error(`Prefilled demo input is not allowed: ${fragment}`);
}
for (const fragment of [
  'placeholder="e.g. Clinical assay commitments"',
  'placeholder="e.g. Sponsor"',
  'placeholder="1-10"',
  'placeholder="Enter one statement for GenLayer to classify."',
]) {
  if (!app.includes(fragment)) throw new Error(`Missing non-data placeholder: ${fragment}`);
}

console.log("PASS OwnThePromise v1.1 static project verification");
