// Read-only network discovery. No wallet, API key, signer or transaction methods.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      default: 'artifacts/generated/issue-34/network.json',
    },
  },
});
const observations = [];
async function read(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  assert(response.ok, `${url}: HTTP ${response.status}`);
  const raw = await response.text();
  const data = JSON.parse(raw);
  observations.push({
    url,
    status: response.status,
    responseSha256: createHash('sha256').update(raw).digest('hex'),
  });
  return data;
}
for (const [environment, chainId] of [
  ['mainnet', 4663],
  ['testnet', 46630],
]) {
  const data = await read(`https://rpc.${environment}.chain.robinhood.com`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: [],
    }),
  });
  assert.equal(data.jsonrpc, '2.0');
  assert.equal(data.id, 1);
  assert.equal(data.error, undefined);
  assert.equal(data.result, `0x${chainId.toString(16)}`);
  Object.assign(observations.at(-1), {
    environment,
    method: 'eth_chainId',
    chainId,
    result: data.result,
  });
}
const data = await read('https://api.opensea.io/api/v2/chains');
assert(Array.isArray(data.chains), 'OpenSea chain discovery schema');
const robinhood = data.chains.find((entry) => entry.chain === 'robinhood');
assert(
  robinhood &&
    robinhood.name === 'Robinhood Chain' &&
    robinhood.symbol === 'ETH',
  'Robinhood Chain must be explicitly listed',
);
Object.assign(observations.at(-1), {
  chainCount: data.chains.length,
  robinhood,
});
const report = {
  checkedAt: new Date().toISOString(),
  result: 'PASS',
  scope:
    'Network identity and marketplace chain discovery only; collection indexing, tokenURI retrieval, reveal and trading remain unverified.',
  observations,
};
await mkdir(path.dirname(values.output), { recursive: true });
await writeFile(values.output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
