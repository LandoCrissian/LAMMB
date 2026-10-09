import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'https://lammb.fun' },
    output: {
      type: 'string',
      default: 'artifacts/generated/task-011/audit/production-security.json',
    },
    strict: { type: 'boolean', default: false },
  },
});
const base = new URL(values['base-url']);
assert(['https:', 'http:'].includes(base.protocol));
const result = {
  at: new Date().toISOString(),
  base: base.origin,
  mode: values.strict ? 'LOCAL_ACCEPTANCE' : 'PASSIVE_PUBLIC_AUDIT',
  requests: [],
  tls: null,
  failures: [],
};
const headers = [
  'content-type',
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'access-control-allow-origin',
  'x-robots-tag',
  'cache-control',
  'age',
  'etag',
  'server',
  'x-nf-request-id',
];
for (const route of [
  '/',
  '/universe',
  '/world',
  '/collection',
  '/social/home-v1.jpg',
  '/social/universe-v1.jpg',
  '/social/world-v1.jpg',
  '/social/collection-v1.jpg',
  '/universe/experimental/chamber',
  '/robots.txt',
  '/build-info.json',
  '/.env',
  '/__lammb_preview_missing__',
]) {
  try {
    const response = await fetch(new URL(route, base), {
      signal: AbortSignal.timeout(15000),
    });
    const row = {
      route,
      status: response.status,
      finalURL: response.url,
      headers: Object.fromEntries(
        headers.map((key) => [key, response.headers.get(key)]),
      ),
    };
    // Never retain response bodies from potential private-file probes.
    if (route === '/.env') {
      row.privateFileNotServed = response.status === 404;
      if (response.status !== 404)
        result.failures.push(
          'Private-file probe needs owner review; body not saved.',
        );
      await response.body?.cancel();
    } else if (route === '/build-info.json' && response.ok) {
      const info = await response.json();
      row.build = {
        commit: /^[a-f0-9]{40}$/.test(info.commit) ? info.commit : 'UNVERIFIED',
        dirty: info.dirty,
        securityPolicy: info.securityPolicy,
      };
    } else if (route === '/') {
      const html = await response.text();
      row.htmlSHA256 = createHash('sha256').update(html).digest('hex');
      row.initialHead = html
        .split('</head>')[0]
        .includes('summary_large_image');
      const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
        (x) => new URL(x[1].replaceAll('&amp;', '&'), base),
      );
      row.thirdPartyScripts = scripts
        .filter((url) => url.origin !== base.origin)
        .map((url) => url.origin);
      row.sourceMapChecks = [];
      for (const url of scripts
        .filter((url) => url.origin === base.origin)
        .slice(0, 3)) {
        const js = await fetch(url, { signal: AbortSignal.timeout(15000) });
        const code = await js.text();
        row.sourceMapChecks.push({
          script: url.pathname,
          status: js.status,
          linkedSourceMap: /sourceMappingURL=/.test(code),
        });
      }
      if (scripts[0]?.origin === base.origin) {
        const map = await fetch(new URL(scripts[0].pathname + '.map', base), {
          signal: AbortSignal.timeout(15000),
        });
        row.sourceMapProbe = {
          status: map.status,
          exposed:
            map.status === 200 &&
            (map.headers.get('content-type') ?? '').includes('json'),
        };
        await map.body?.cancel();
      }
    } else await response.body?.cancel();
    if (
      values.strict &&
      [
        '/',
        '/universe',
        '/world',
        '/collection',
        '/universe/experimental/chamber',
      ].includes(route)
    ) {
      for (const [key, expected] of [
        ['x-frame-options', 'DENY'],
        ['x-content-type-options', 'nosniff'],
        ['cross-origin-opener-policy', 'same-origin'],
      ])
        if (response.headers.get(key) !== expected)
          result.failures.push(`${route}: ${key}`);
      const csp = response.headers.get('content-security-policy') ?? '';
      for (const directive of [
        "default-src 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "script-src-attr 'none'",
        "connect-src 'self'",
      ])
        if (!csp.includes(directive))
          result.failures.push(`${route}: CSP ${directive}`);
      if (csp.includes('unsafe-eval'))
        result.failures.push(`${route}: unsafe-eval`);
      if (!response.headers.get('permissions-policy')?.includes('camera=()'))
        result.failures.push(`${route}: permissions-policy`);
    }
    result.requests.push(row);
  } catch (error) {
    result.requests.push({ route, error: error.message });
    result.failures.push(`${route}: request failed`);
  }
}
if (base.protocol === 'https:') {
  result.tls = await new Promise((resolve) => {
    const request = https.get(base, { timeout: 15000 }, (response) => {
      const socket = response.socket;
      const certificate = socket.getPeerCertificate();
      resolve({
        authorized: socket.authorized,
        protocol: socket.getProtocol(),
        cipher: socket.getCipher()?.standardName,
        validFrom: certificate.valid_from,
        validTo: certificate.valid_to,
        issuer: certificate.issuer?.O,
      });
      response.resume();
    });
    request.on('timeout', () =>
      request.destroy(new Error('TLS audit timeout')),
    );
    request.on('error', (error) => resolve({ error: error.message }));
  });
  for (const url of [`http://${base.host}`, `https://www.${base.host}`]) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      result.requests.push({
        url,
        status: response.status,
        location: response.headers.get('location'),
      });
      await response.body?.cancel();
    } catch (error) {
      result.requests.push({ url, error: error.message });
    }
  }
}
result.result = result.failures.length ? 'REVIEW' : 'PASS';
await mkdir(path.dirname(values.output), { recursive: true });
await writeFile(values.output, JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({
    result: result.result,
    requests: result.requests.length,
    tls: result.tls,
    failures: result.failures,
  }),
);
if (values.strict) assert.equal(result.result, 'PASS');
