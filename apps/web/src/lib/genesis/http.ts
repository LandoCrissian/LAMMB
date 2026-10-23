import { createHmac } from 'node:crypto';
import { z, ZodError } from 'zod';
import { GenesisError } from './model';
import { registrationService } from './runtime';
import type { RegistrationService } from './service';

const challengeInput = z.strictObject({
  address: z.string().max(42),
  purpose: z.enum(['collector', 'admin']),
});
const verifyInput = z.strictObject({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
});
const decisionInput = z
  .strictObject({
    address: z.string().max(42),
    action: z.enum([
      'FOUNDER',
      'GTD_GRANT',
      'GTD_REVOKE',
      'WL_APPROVE',
      'WL_REJECT',
    ]),
    evidence: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    units: z.number().int().min(1).max(5).optional(),
    key: z
      .string()
      .regex(/^[a-z0-9-]{3,64}$/)
      .optional(),
    kind: z.enum(['PARTNER', 'INVITATION']).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === 'GTD_GRANT' && (!v.key || !v.kind || !v.units))
      ctx.addIssue({ code: 'custom', message: 'Grant fields required' });
    if (v.action === 'GTD_REVOKE' && !v.key)
      ctx.addIssue({ code: 'custom', message: 'Grant key required' });
    if (v.action === 'WL_APPROVE' && (!v.units || v.units > 2))
      ctx.addIssue({
        code: 'custom',
        message: 'Whitelist allowance must be 1 or 2',
      });
  });
const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
};
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(body, { status, headers: { ...responseHeaders, ...headers } });
function cookieName(kind: 'session' | 'challenge') {
  return (
    (process.env.NODE_ENV === 'production' ? '__Host-' : '') + 'lammb_' + kind
  );
}
function getCookie(req: Request, kind: 'session' | 'challenge') {
  return (
    (req.headers.get('cookie') ?? '')
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName(kind) + '='))
      ?.split('=')[1] ?? ''
  );
}
function setCookie(
  kind: 'session' | 'challenge',
  value: string,
  seconds: number,
) {
  return (
    `${cookieName(kind)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}` +
    (process.env.NODE_ENV === 'production' ? '; Secure' : '')
  );
}
async function body(req: Request) {
  if (!(req.headers.get('content-type') ?? '').startsWith('application/json'))
    throw new GenesisError('JSON_REQUIRED', 415);
  if (Number(req.headers.get('content-length')) > 4096)
    throw new GenesisError('BODY_TOO_LARGE', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new GenesisError('BODY_REQUIRED');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        throw new GenesisError('BODY_TOO_LARGE', 413);
      }
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new GenesisError('INVALID_JSON');
    }
  } finally {
    reader.releaseLock();
  }
}
export async function handleGenesis(
  req: Request,
  action: string,
  getService: () => RegistrationService = registrationService,
) {
  try {
    if (
      ![
        'config',
        'challenge',
        'verify',
        'status',
        'apply',
        'logout',
        'admin-records',
        'admin-decision',
        'export',
      ].includes(action)
    )
      return json({ error: 'NOT_FOUND' }, 404);
    if (action === 'config' && req.method === 'GET') {
      try {
        const service = getService();
        return json({
          registrationEnabled: service.config.publicEnabled,
          adminEnabled: service.config.adminEnabled,
          mintEnabled: false,
        });
      } catch {
        return json({
          registrationEnabled: false,
          adminEnabled: false,
          mintEnabled: false,
        });
      }
    }
    const service = getService();
    const method = ['status', 'admin-records'].includes(action)
      ? 'GET'
      : 'POST';
    if (req.method !== method)
      return json({ error: 'METHOD_NOT_ALLOWED' }, 405, { Allow: method });
    // Never trust Host or forwarded-host as the signing domain / CSRF authority.
    if (
      ((req.method !== 'GET' || req.headers.has('origin')) &&
        req.headers.get('origin') !== service.config.origin) ||
      (req.headers.get('sec-fetch-site') &&
        req.headers.get('sec-fetch-site') !== 'same-origin')
    )
      throw new GenesisError('ORIGIN_FORBIDDEN', 403);
    const token = getCookie(req, 'session');
    // Only the platform-set connection IP is trusted on Netlify. Else share one
    // conservative bucket; arbitrary X-Forwarded-For cannot evade the limiter.
    const rawIp =
      process.env.NETLIFY === 'true'
        ? req.headers.get('x-nf-client-connection-ip')
        : null;
    const client = createHmac('sha256', service.config.rateSecret)
      .update(rawIp ?? 'untrusted-client')
      .digest('hex');
    await service.limitRequest(client, action);
    if (action === 'challenge') {
      const input = challengeInput.parse(await body(req));
      const c = await service.challenge(input.address, input.purpose, client);
      return json({ id: c.id, message: c.message, expires: c.expires }, 200, {
        'Set-Cookie': setCookie('challenge', c.binding, 300),
      });
    }
    if (action === 'verify') {
      const input = verifyInput.parse(await body(req));
      const session = await service.verify(
        input.id,
        getCookie(req, 'challenge'),
        input.signature,
        client,
      );
      return json({ verified: true }, 200, {
        'Set-Cookie': setCookie(
          'session',
          session.token,
          Math.floor((session.expires - Date.now()) / 1000),
        ),
      });
    }
    if (action === 'status') return json(await service.status(token));
    if (action === 'admin-records')
      return json({ records: await service.adminList(token) });
    if (action === 'apply') {
      const input = z
        .strictObject({ consent: z.literal(true) })
        .parse(await body(req));
      return json(await service.apply(token, input.consent));
    }
    if (action === 'logout') {
      await service.logout(token);
      return json({ signedOut: true }, 200, {
        'Set-Cookie': setCookie('session', '', 0),
      });
    }
    if (action === 'admin-decision')
      return json(
        await service.decide(token, decisionInput.parse(await body(req))),
      );
    if (action === 'export') {
      const input = z
        .strictObject({ stage: z.enum(['FOUNDER', 'GTD', 'WL']) })
        .parse(await body(req));
      const output = await service.export(token, input.stage);
      return new Response(output.csv, {
        headers: {
          ...responseHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="lammb-${input.stage.toLowerCase()}-allowlist.csv"`,
          'X-Content-SHA256': output.sha256,
          'X-Allowlist-Rows': String(output.rows),
          'X-Allowlist-Units': String(output.units),
        },
      });
    }
    return json({ error: 'NOT_FOUND' }, 404);
  } catch (error) {
    if (error instanceof GenesisError)
      return json({ error: error.code }, error.status);
    if (error instanceof ZodError) return json({ error: 'INVALID_INPUT' }, 400);
    // Never leak wallet lists, signatures, SQL, credentials or infrastructure detail.
    return json({ error: 'REGISTRATION_UNAVAILABLE' }, 503);
  }
}
