import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { databaseConfig } from '../apps/web/src/lib/genesis/database';
import { runtimeConfig } from '../apps/web/src/lib/genesis/runtime';
import { handleGenesis } from '../apps/web/src/lib/genesis/http';
import {
  requestEnvironment,
  trustedConnectionIp,
} from '../apps/web/src/lib/genesis/deployment';

const password = 'disposable-test-password-@:/?%3A-123456789';
const provider =
  'postgresql://migration_owner:never-used@preview-branch.example/genesis?sslmode=require&channel_binding=require';
const enabled = {
  NODE_ENV: 'production',
  NETLIFY: 'true',
  CONTEXT: 'production',
  GENESIS_REGISTRATION_ENABLED: 'true',
  GENESIS_ACTIVATION_REFERENCE: 'sha256:' + 'a'.repeat(64),
  GENESIS_ORIGIN: 'https://lammb.fun',
  GENESIS_RATE_SECRET: 'a'.repeat(64),
  GENESIS_DATABASE_PASSWORD: password,
};
afterEach(() => vi.unstubAllEnvs());

describe('Netlify branch-aware database configuration', () => {
  it('uses the real SDK resolver, preserves the branch, and never uses its owner login', () => {
    vi.stubEnv('NETLIFY_DB_URL', provider);
    const config = runtimeConfig(enabled);
    const url = new URL(config.databaseUrl);
    expect(url.hostname).toBe('preview-branch.example');
    expect(url.pathname).toBe('/genesis');
    expect(url.username).toBe('lammb_genesis_runtime');
    expect(decodeURIComponent(url.password)).toBe(password);
    expect(url.search).toBe('');
    expect(config.databaseUrl).not.toContain('migration_owner');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.enableChannelBinding).toBe(true);
    vi.stubEnv(
      'NETLIFY_DB_URL',
      provider.replace('preview-branch', 'other-branch'),
    );
    expect(new URL(runtimeConfig(enabled).databaseUrl).hostname).toBe(
      'other-branch.example',
    );
  });
  it('fails closed without a native connection and never falls back to an old URL', () => {
    vi.stubEnv('NETLIFY_DB_URL', '');
    expect(() => runtimeConfig(enabled)).toThrow(
      'DATABASE_CONFIGURATION_REQUIRED',
    );
    const resolver = vi.fn(() => provider);
    expect(() =>
      runtimeConfig(
        { ...enabled, GENESIS_DATABASE_URL: 'postgres://old.example/genesis' },
        resolver,
      ),
    ).toThrow('DATABASE_SOURCE_AMBIGUOUS');
    expect(resolver).not.toHaveBeenCalled();
  });
  it('redacts SDK errors and requires a separate restricted-login secret', () => {
    expect(() =>
      runtimeConfig(enabled, () => {
        throw new Error(provider);
      }),
    ).toThrow(/^DATABASE_CONFIGURATION_REQUIRED$/);
    expect(() =>
      runtimeConfig(
        { ...enabled, GENESIS_DATABASE_PASSWORD: '' },
        () => provider,
      ),
    ).toThrow('DATABASE_RUNTIME_PASSWORD_REQUIRED');
    expect(
      runtimeConfig(
        { ...enabled, GENESIS_DATABASE_CA: 'reviewed-ca' },
        () => provider,
      ).ssl,
    ).toEqual({ rejectUnauthorized: true, ca: 'reviewed-ca' });
  });
  it.each([
    '?sslmode=disable',
    '?sslmode=no-verify',
    '?sslcert=untrusted',
    '?SSLMODE=disable',
    '?%73slmode=disable',
    '?sslmode=require&sslmode=verify-full',
    '?uselibpqcompat=true',
    '?user=migration_owner',
    '?password=owner',
    '?host=production.example',
    '?options=-c%20search_path=other',
    '?channel_binding=disable',
  ])('rejects provider URL overrides %s', (query) => {
    expect(() =>
      databaseConfig(enabled, () => provider.split('?')[0] + query),
    ).toThrow('DATABASE_TLS_CONFIGURATION_INVALID');
  });
  it.each([
    'http://owner:private@db.example/genesis',
    'postgres://owner:private@127.0.0.1/genesis',
    'postgres://owner:private@db.example/',
    'postgres://owner:private@db.example/genesis#ignored',
    'invalid',
  ])('rejects invalid native endpoints without leaking them', (endpoint) => {
    expect(() => databaseConfig(enabled, () => endpoint)).toThrow(
      /^DATABASE_CONFIGURATION_REQUIRED$/,
    );
  });
});

describe('preview privacy boundary', () => {
  it('uses supported request metadata without relying on build-only environment variables', () => {
    const env = requestEnvironment(
      { GENESIS_REGISTRATION_ENABLED: 'false' },
      () => ({ deploy: { context: 'production' }, ip: '192.0.2.1' }),
    );
    expect(env.NETLIFY).toBe('true');
    expect(env.CONTEXT).toBe('production');
    expect(() => runtimeConfig(env)).toThrow('REGISTRATION_INACTIVE');
  });
  it.each(['deploy-preview', 'branch-deploy', 'dev', 'unknown'])(
    'trusts native %s metadata over an accidentally copied production environment',
    (context) => {
      expect(() =>
        requestEnvironment(enabled, () => ({
          deploy: { context },
          ip: '192.0.2.1',
        })),
      ).toThrow('REGISTRATION_PREVIEW_DISABLED');
    },
  );
  it.each([
    { SITE_ID: 'native-site' },
    { NETLIFY_DB_URL: 'must-not-be-used' },
    { NETLIFY: 'true' },
    { CONTEXT: 'production' },
  ])('fails closed without a supported request context %j', (env) => {
    expect(() => requestEnvironment(env)).toThrow(
      'REGISTRATION_PREVIEW_DISABLED',
    );
  });
  it('keeps standalone local/test configuration without fabricating a native context', () => {
    expect(requestEnvironment({ NODE_ENV: 'test' })).toEqual({
      NODE_ENV: 'test',
    });
    expect(() =>
      requestEnvironment({ ...enabled, CONTEXT: 'deploy-preview' }, () => ({
        deploy: { context: 'production' },
        ip: '192.0.2.1',
      })),
    ).toThrow('REGISTRATION_PREVIEW_DISABLED');
  });
  it('uses trusted request IP without reading caller-supplied proxy headers', () => {
    expect(
      trustedConnectionIp(() => ({
        deploy: { context: 'production' },
        ip: '192.0.2.1',
      })),
    ).toBe('192.0.2.1');
    expect(trustedConnectionIp()).toBeNull();
  });
  it.each(['deploy-preview', 'branch-deploy', 'dev', 'unknown', ''])(
    'blocks context %s before SDK resolution even with activation/admin flags copied',
    (context) => {
      const resolver = vi.fn(() => provider);
      expect(() =>
        runtimeConfig(
          {
            ...enabled,
            CONTEXT: context,
            GENESIS_ADMIN_ENABLED: 'true',
            GENESIS_ADMIN_WALLETS: '0x' + '1'.repeat(40),
          },
          resolver,
        ),
      ).toThrow('REGISTRATION_PREVIEW_DISABLED');
      expect(resolver).not.toHaveBeenCalled();
    },
  );
  it('does not resolve the SDK while production registration and admin are disabled', () => {
    const resolver = vi.fn(() => provider);
    expect(() =>
      runtimeConfig(
        { ...enabled, GENESIS_REGISTRATION_ENABLED: 'false' },
        resolver,
      ),
    ).toThrow('REGISTRATION_INACTIVE');
    expect(resolver).not.toHaveBeenCalled();
  });
  it.each([
    'config',
    'challenge',
    'verify',
    'status',
    'apply',
    'logout',
    'admin-records',
    'admin-decision',
    'export',
  ])(
    'exposes no copied records/session/export on the preview %s endpoint',
    async (action) => {
      for (const [key, value] of Object.entries({
        ...enabled,
        CONTEXT: 'deploy-preview',
        GENESIS_ADMIN_ENABLED: 'true',
      }))
        vi.stubEnv(key, value);
      vi.stubEnv('NETLIFY_DB_URL', 'must-not-be-used');
      const method = ['config', 'status', 'admin-records'].includes(action)
        ? 'GET'
        : 'POST';
      const response = await handleGenesis(
        new Request('https://preview.example/api/genesis/' + action, {
          method,
          headers: {
            Cookie: '__Host-lammb_session=copied-session',
            Origin: 'https://lammb.fun',
          },
        }),
        action,
      );
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      if (action === 'config') {
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          registrationEnabled: false,
          adminEnabled: false,
          mintEnabled: false,
        });
      } else {
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
          error: 'REGISTRATION_PREVIEW_DISABLED',
        });
      }
    },
  );
});

it('preserves the historical migration bytes and uses ordered native migration names', async () => {
  expect(
    createHash('sha256')
      .update(await readFile('apps/web/registration/001-genesis.sql'))
      .digest('hex'),
  ).toBe('bf0d90d196c94535dedec8ddb8f1226e880f3fb808fdeb15629730c71b334a78');
});
