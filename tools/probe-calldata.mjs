/**
 * OwnThePromise — StudioNet long-calldata probe.
 *
 * Answers ONE limited question, with no wallet and no signing:
 *   can the consensus EVM entrypoint receive an addTransaction payload once
 *   the serialized GenLayer calldata crosses 255 bytes?
 *
 * That boundary is where the CommitGate frontend died with
 *   "RLP string ends with N superfluous bytes"
 * and that failure was never resolved. Every statement in this project's test
 * plans is 61-77 characters, so the path has never been exercised.
 *
 *   node tools/probe-calldata.mjs <register_id_hex>
 *
 * It sends, straight to https://studio.genlayer.com/api :
 *   1. gen_call READ  get_register        - control, ~98 bytes
 *   2. eth_estimateGas on addTransaction(submit_statement, SHORT)  - 182 bytes
 *   3. eth_estimateGas on addTransaction(submit_statement, LONG)   - 400+ bytes
 *
 * IMPORTANT: eth_estimateGas does not execute the queued GenVM transaction.
 * An OK result proves payload reception at the EVM consensus entrypoint only;
 * it does not prove GenVM decoding, authorization, semantic execution, or an
 * accepted state change. A real accepted long write is required for that.
 */
import { abi } from 'genlayer-js'
import { encodeFunctionData } from 'viem'

const RPC = process.env.STUDIO_RPC || 'https://studio.genlayer.com/api'
const CONTRACT = process.env.CONTRACT || '0x4181EDD47D5Bc1FD26D9305F53B71408800768Dc'
// StudioNet ConsensusMain contract used by genlayer-js addTransaction writes.
const CONSENSUS = '0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575'
const FROM = process.env.FROM || '0x0000000000000000000000000000000000000000'
const REGISTER_ID = (process.argv[2] || '').trim().toLowerCase()

if (!/^[a-f0-9]{64}$/.test(REGISTER_ID)) {
  console.error('usage: node tools/probe-calldata.mjs <register_id_hex(64 chars, no 0x)>')
  process.exit(1)
}

const SHORT = 'The vendor says it will publish the migration plan before production cutover.'
const LONG =
  'The platform team will publish a written post-incident report to the status page, ' +
  'covering root cause, customer impact and the corrective actions taken, within five ' +
  'business days of the incident being formally closed by the on-call engineer.'

const ABI_V5 = [{
  type: 'function', name: 'addTransaction', stateMutability: 'nonpayable',
  inputs: [
    { name: '_sender', type: 'address' }, { name: '_recipient', type: 'address' },
    { name: '_numOfInitialValidators', type: 'uint256' }, { name: '_maxRotations', type: 'uint256' },
    { name: '_txData', type: 'bytes' },
  ], outputs: [],
}]

const payload = (method, args) =>
  abi.transactions.serialize([abi.calldata.encode({ method, args }), false])
const bytes = (hex) => (hex.length - 2) / 2

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
}

function report(label, hex, json) {
  const n = bytes(hex)
  const err = json?.error
  console.log(`\n${label}`)
  console.log(`  payload   ${n} bytes | head ${hex.slice(0, 10)} | ${n > 255 ? '>255  2-byte length form' : '1-byte length form'}`)
  console.log(err
    ? `  RESULT    FAIL  ${err.code ?? ''} ${err.message ?? JSON.stringify(err)}`
    : `  RESULT    OK    ${JSON.stringify(json.result).slice(0, 60)}`)
}

console.log(`RPC       ${RPC}`)
console.log(`contract  ${CONTRACT}`)
console.log(`register  ${REGISTER_ID}`)
console.log(`statement lengths: SHORT ${SHORT.length} chars, LONG ${LONG.length} chars`)

{
  const p = payload('get_register', [REGISTER_ID])
  const j = await rpc('gen_call', [{ type: 'read', to: CONTRACT, from: FROM, data: p, transaction_hash_variant: 'latest-nonfinal' }])
  report('READ  get_register (control)', p, j)
}

for (const [label, text] of [['SHORT', SHORT], ['LONG', LONG]]) {
  const p = payload('submit_statement', [REGISTER_ID, text])
  const data = encodeFunctionData({
    abi: ABI_V5, functionName: 'addTransaction',
    args: [FROM, CONTRACT, 5n, 3n, p],
  })
  const j = await rpc('eth_estimateGas', [{ from: FROM, to: CONSENSUS, data, value: '0x0' }])
  report(`WRITE submit_statement via estimateGas (${label}, ${text.length} chars)`, p, j)
}

console.log('\nThis probe measures payload reception only; verify GenVM execution with a real accepted write.')
