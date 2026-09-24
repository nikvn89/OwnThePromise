import { spawnSync } from "node:child_process";
import fs from "node:fs";

const idsSource = fs.readFileSync(new URL("../src/ids.ts", import.meta.url), "utf8");
const expectedSpace =
  "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
if (!idsSource.includes(JSON.stringify(expectedSpace))) {
  throw new Error("src/ids.ts PY_SPACE changed; parity test must be reviewed");
}

const pythonCode =
  "import json; print(json.dumps([c for c in range(0x110000) if chr(c).isspace()]))";
let result = spawnSync("python3", ["-c", pythonCode], { encoding: "utf8" });
if (result.error || result.status !== 0) {
  result = spawnSync("python", ["-c", pythonCode], { encoding: "utf8" });
}
if (result.error || result.status !== 0) {
  throw new Error("Python is required for full Unicode parity verification");
}

const pySet = new Set(JSON.parse(result.stdout));
const trimStart = new RegExp("^[" + expectedSpace + "]+");
const trimEnd = new RegExp("[" + expectedSpace + "]+$");
const pyStrip = (value) => value.replace(trimStart, "").replace(trimEnd, "");
const pyCollapse = (value) =>
  value.split(new RegExp("[" + expectedSpace + "]+")).filter(Boolean).join(" ");

const falseNegatives = [];
const falsePositives = [];
for (let codePoint = 0; codePoint < 0x110000; codePoint += 1) {
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
  const char = String.fromCodePoint(codePoint);
  const js = pyStrip(char + "A" + char) === "A";
  const py = pySet.has(codePoint);
  if (py && !js) falseNegatives.push(codePoint);
  if (!py && js) falsePositives.push(codePoint);
}

if (falseNegatives.length || falsePositives.length) {
  throw new Error(
    `Unicode parity mismatch: false negatives=${falseNegatives.length}, false positives=${falsePositives.length}`
  );
}

const collapseSamples = [
  "  alpha   beta  ",
  "alpha\tbeta\ngamma",
  "\u00a0alpha\u2003beta\u3000",
  "alpha\u2028\u2029beta",
];
for (const sample of collapseSamples) {
  const python = spawnSync("python3", [
    "-c",
    "import json,sys; print(json.dumps(' '.join(json.loads(sys.argv[1]).split())))",
    JSON.stringify(sample),
  ], { encoding: "utf8" });
  if (python.status !== 0) throw new Error("Python collapse parity check failed");
  const expected = JSON.parse(python.stdout);
  const actual = pyCollapse(sample);
  if (actual !== expected) {
    throw new Error(`Collapse parity mismatch: ${JSON.stringify(sample)}`);
  }
}

console.log("PASS Python whitespace / ids.ts parity across Unicode");
