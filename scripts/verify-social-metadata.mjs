import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

const { values } = parseArgs({
  options: {
    built: { type: 'boolean', default: false },
    'assets-only': { type: 'boolean', default: false },
    'base-url': { type: 'string' },
    audit: { type: 'boolean', default: false },
    output: { type: 'string' },
  },
});
assert(
  values.built || values['base-url'] || values['assets-only'],
  'Use --built, --base-url URL, or --assets-only',
);
assert(!values.audit || values['base-url'], '--audit requires --base-url');
const publicRoot = path.resolve('apps/web/public');
const manifest = JSON.parse(
  await readFile(path.join(publicRoot, 'social/provenance.json')),
);
const origin = 'https://lammb.fun';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bots = ['Twitterbot/1.0', 'facebookexternalhit/1.1'];
const primaryTitles = {
  '/': 'LAMMB — Higher Together',
  '/universe': 'LAMMB Labs — The Classified Universe',
  '/world': 'LAMMB World — Global NFT Atlas',
  '/collection': 'The Collection / LAMMB',
};
const routes = [
  '/',
  '/universe',
  '/world',
  '/collection',
  '/vault',
  '/mint',
  '/ascent',
  '/community',
  '/faq',
  '/profile',
  '/development/launch',
  '/universe/security',
  '/universe/surveillance',
  '/universe/experimental',
  '/universe/experimental/chamber',
  '/universe/archive',
  ...['000', '001', '002', '003'].map((id) => '/universe/archive/' + id),
];
const prototypes = new Set([
  '/development/launch',
  '/universe/experimental/chamber',
]);
const decode = (text) =>
  text
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
function robotsAllows(body, bot, pathname) {
  const groups = [];
  let group;
  let hasRules = false;
  for (const line of body.split(/\r?\n/)) {
    const match = line
      .replace(/#.*/, '')
      .match(/^\s*(user-agent|allow|disallow)\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const [, field, value] = match;
    if (field.toLowerCase() === 'user-agent') {
      if (!group || hasRules) {
        group = { agents: [], rules: [] };
        groups.push(group);
        hasRules = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      hasRules = true;
      if (value)
        group.rules.push({
          allow: field.toLowerCase() === 'allow',
          pattern: value,
        });
    }
  }
  const agent = bot.split('/')[0].toLowerCase();
  const relevant = groups.map((item) => ({
    ...item,
    specificity: Math.max(
      -1,
      ...item.agents.map((token) =>
        token === '*' ? 0 : agent.includes(token) ? token.length : -1,
      ),
    ),
  }));
  const mostSpecific = Math.max(
    -1,
    ...relevant.map((item) => item.specificity),
  );
  if (mostSpecific < 0) return true;
  let winner = { specificity: -1, allow: true };
  for (const rule of relevant
    .filter((item) => item.specificity === mostSpecific)
    .flatMap((item) => item.rules)) {
    const end = rule.pattern.endsWith('$') ? '$' : '';
    const pattern = end ? rule.pattern.slice(0, -1) : rule.pattern;
    const escaped = pattern
      .split('*')
      .map((part) => part.replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&'))
      .join('.*');
    const specificity = pattern.replaceAll('*', '').length;
    if (
      new RegExp('^' + escaped + end).test(pathname) &&
      (specificity > winner.specificity ||
        (specificity === winner.specificity && rule.allow))
    )
      winner = { specificity, allow: rule.allow };
  }
  return winner.allow;
}
function documentMetadata(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert(head, 'Missing document head');
  const entries = new Map();
  for (const match of head.matchAll(/<(?:meta|link)\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(
      [...match[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map(
        (entry) => [entry[1].toLowerCase(), decode(entry[2])],
      ),
    );
    const key =
      attributes.property ||
      attributes.name ||
      (attributes.rel === 'canonical' ? 'canonical' : null);
    if (!key) continue;
    assert(!entries.has(key), 'Duplicate metadata: ' + key);
    entries.set(key, attributes.content ?? attributes.href);
  }
  entries.set(
    'html:title',
    decode(head.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ''),
  );
  return entries;
}
function validate(html, route) {
  const metadata = documentMetadata(html);
  const get = (name) => {
    const value = metadata.get(name);
    assert(value, route + ': missing ' + name);
    return value;
  };
  assert.equal(new URL(get('canonical')).href, new URL(origin + route).href);
  assert.equal(new URL(get('og:url')).href, new URL(origin + route).href);
  assert.equal(get('og:type'), 'website');
  assert.equal(get('og:site_name'), 'LAMMB');
  assert.equal(get('og:locale'), 'en_US');
  assert.equal(get('twitter:card'), 'summary_large_image');
  assert.equal(get('og:image:width'), '1200');
  assert.equal(get('og:image:height'), '630');
  assert.equal(get('og:image:type'), 'image/jpeg');
  assert.equal(get('html:title'), get('og:title'));
  assert.equal(get('og:title'), get('twitter:title'));
  assert.equal(get('description'), get('og:description'));
  assert.equal(get('og:description'), get('twitter:description'));
  assert(get('og:title').length <= 70, route + ': title too long');
  assert(get('og:description').length <= 200, route + ': description too long');
  assert(!get('og:description').includes('5,280'));
  assert.equal(get('og:image'), get('twitter:image'));
  assert.equal(get('og:image:alt'), get('twitter:image:alt'));
  const asset = manifest.assets.find(
    (item) => origin + item.path === get('og:image'),
  );
  assert(asset, route + ': unknown image or non-public URL');
  if (primaryTitles[route]) {
    assert.equal(get('og:title'), primaryTitles[route]);
    assert.equal(asset.route, route, route + ': wrong primary artwork');
  }
  const robotDirectives = metadata.get('robots') || '';
  if (prototypes.has(route)) {
    assert(/noindex/.test(robotDirectives) && /nofollow/.test(robotDirectives));
  } else {
    assert(
      !/noindex|noimageindex|none/i.test(robotDirectives),
      route + ': crawler blocked',
    );
  }
  return {
    route,
    title: get('og:title'),
    description: get('og:description'),
    canonical: get('canonical'),
    image: get('og:image'),
    width: 1200,
    height: 630,
    card: get('twitter:card'),
    robots: robotDirectives || 'not restricted',
  };
}
const results = {
  mode: values.audit ? 'LIVE_AUDIT_NOT_ACCEPTANCE' : 'ACCEPTANCE',
  at: new Date().toISOString(),
  assets: [],
  metadata: [],
  access: [],
  failures: [],
};
async function check(label, action) {
  try {
    await action();
  } catch (error) {
    results.failures.push({ label, error: error.message });
  }
}
for (const asset of manifest.assets) {
  await check(asset.path, async () => {
    const bytes = await readFile(path.join(publicRoot, asset.path));
    assert.equal(digest(bytes), asset.sha256);
    assert.equal(bytes.length, asset.bytes);
    assert(
      bytes.length < 5_000_000,
      'Image exceeds conservative card size cap',
    );
    const dimensions = await sharp(bytes).metadata();
    assert.equal(dimensions.format, 'jpeg');
    assert.equal(dimensions.width, 1200);
    assert.equal(dimensions.height, 630);
    // Decode every pixel, not only the header.
    await sharp(bytes).raw().toBuffer();
    for (const source of asset.sources) {
      assert.equal(
        digest(await readFile(path.join(publicRoot, source.path))),
        source.sha256,
      );
    }
    results.assets.push({
      path: asset.path,
      width: dimensions.width,
      height: dimensions.height,
      bytes: bytes.length,
      sha256: digest(bytes),
      decode: 'PASS',
    });
  });
}
if (values.built) {
  for (const route of routes) {
    await check('built ' + route, async () => {
      const filename = route === '/' ? 'index.html' : route.slice(1) + '.html';
      const html = await readFile(
        path.resolve('apps/web/.next/server/app', filename),
        'utf8',
      );
      results.metadata.push({
        ...validate(html, route),
        source: 'production prerender',
      });
    });
  }
  const robots = await readFile(
    'apps/web/.next/server/app/robots.txt.body',
    'utf8',
  );
  assert(
    /User-Agent: \*/i.test(robots) &&
      /Allow: \//i.test(robots) &&
      !/Disallow:\s*\/\s*$/im.test(robots),
  );
}
if (values['base-url']) {
  const base = new URL(values['base-url']);
  assert(['http:', 'https:'].includes(base.protocol));
  for (const bot of bots) {
    for (const route of values.audit ? Object.keys(primaryTitles) : routes) {
      await check(bot + ' ' + route, async () => {
        const response = await fetch(new URL(route, base), {
          headers: { 'user-agent': bot },
          signal: AbortSignal.timeout(20000),
        });
        const html = await response.text();
        const access = {
          bot,
          route,
          status: response.status,
          finalUrl: response.url,
          mime: response.headers.get('content-type'),
          server: response.headers.get('server'),
          xRobotsTag: response.headers.get('x-robots-tag'),
          csp: response.headers.get('content-security-policy'),
          authentication: response.headers.get('www-authenticate'),
        };
        results.access.push(access);
        assert.equal(response.status, 200);
        assert(/text\/html/i.test(access.mime));
        assert.equal(new URL(response.url).pathname, route);
        assert(!access.authentication, 'Authentication challenge');
        if (!prototypes.has(route))
          assert(
            !/noindex|noimageindex|none/i.test(access.xRobotsTag || ''),
            'X-Robots-Tag restriction',
          );
        if (values.audit) {
          const metadata = documentMetadata(html);
          results.metadata.push({
            route,
            bot,
            tags: Object.fromEntries(metadata),
          });
        } else {
          results.metadata.push({ ...validate(html, route), bot });
        }
      });
    }
    await check(bot + ' robots', async () => {
      const response = await fetch(new URL('/robots.txt', base), {
        headers: { 'user-agent': bot },
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.text();
      results.access.push({
        bot,
        route: '/robots.txt',
        status: response.status,
        mime: response.headers.get('content-type'),
        body: response.ok ? body : 'absent',
      });
      if (!values.audit) {
        assert.equal(response.status, 200);
        assert(/text\/plain/i.test(response.headers.get('content-type')));
        assert(/User-Agent: \*/i.test(body) && /Allow: \//i.test(body));
        assert(!/Disallow:\s*\/\s*$/im.test(body));
      }
      if (response.ok) {
        for (const pathname of [
          ...routes,
          ...manifest.assets.map((item) => item.path),
        ]) {
          assert(
            robotsAllows(body, bot, pathname),
            bot + ': robots blocks ' + pathname,
          );
        }
      }
    });
    for (const asset of manifest.assets) {
      await check(bot + ' ' + asset.path, async () => {
        // Map only the origin for localhost checks. The metadata remains the
        // absolute production URL and is verified without rewriting its tags.
        const response = await fetch(new URL(asset.path, base), {
          headers: { 'user-agent': bot },
          signal: AbortSignal.timeout(20000),
        });
        const bytes = Buffer.from(await response.arrayBuffer());
        results.access.push({
          bot,
          route: asset.path,
          status: response.status,
          mime: response.headers.get('content-type'),
          finalUrl: response.url,
          sha256: digest(bytes),
          xRobotsTag: response.headers.get('x-robots-tag'),
          csp: response.headers.get('content-security-policy'),
          authentication: response.headers.get('www-authenticate'),
        });
        assert.equal(
          response.status,
          200,
          'New asset must be deployed before live acceptance',
        );
        assert.equal(
          response.headers.get('content-type')?.split(';')[0],
          'image/jpeg',
        );
        assert.equal(new URL(response.url).pathname, asset.path);
        assert(!response.headers.get('www-authenticate'));
        assert(
          !/noindex|noimageindex|none/i.test(
            response.headers.get('x-robots-tag') || '',
          ),
        );
        assert.equal(digest(bytes), asset.sha256);
        await sharp(bytes).raw().toBuffer();
      });
    }
  }
}
results.result = results.failures.length
  ? values.audit
    ? 'PENDING_DEPLOYMENT'
    : 'FAIL'
  : 'PASS';
if (values.output) {
  await mkdir(path.dirname(path.resolve(values.output)), { recursive: true });
  await writeFile(values.output, JSON.stringify(results, null, 2) + '\n');
}
console.log(
  JSON.stringify(
    {
      result: results.result,
      assets: results.assets.length,
      metadata: results.metadata.length,
      access: results.access.length,
      failures: results.failures,
    },
    null,
    2,
  ),
);
if (results.failures.length && !values.audit) process.exitCode = 1;
