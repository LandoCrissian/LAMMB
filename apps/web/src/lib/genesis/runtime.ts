import { Pool } from 'pg';
import { z } from 'zod';
import { GenesisError, wallet } from './model';
import { RegistrationService, type ServiceConfig } from './service';
import { PostgresStore } from './store';
import { assertRegistrationContext, databaseConfig } from './database';

export function runtimeConfig(
  env: Record<string, string | undefined>,
  resolveNative?: () => string,
) {
  assertRegistrationContext(env);
  const publicEnabled = env.GENESIS_REGISTRATION_ENABLED === 'true';
  const adminEnabled = env.GENESIS_ADMIN_ENABLED === 'true';
  if (!publicEnabled && !adminEnabled)
    throw new GenesisError('REGISTRATION_INACTIVE', 503);
  if (!/^sha256:[a-f0-9]{64}$/.test(env.GENESIS_ACTIVATION_REFERENCE ?? ''))
    throw new GenesisError('ACTIVATION_REVIEW_REQUIRED', 503);
  const origin = env.GENESIS_ORIGIN ?? '';
  if (
    origin !== 'https://lammb.fun' &&
    !(
      env.NODE_ENV !== 'production' &&
      /^http:\/\/(localhost|127\.0\.0\.1):[0-9]{2,5}$/.test(origin)
    )
  )
    throw new GenesisError('ORIGIN_CONFIGURATION_REQUIRED', 503);
  const secret = env.GENESIS_RATE_SECRET ?? '';
  if (!/^[a-f0-9]{64,128}$/.test(secret))
    throw new GenesisError('SECRET_CONFIGURATION_REQUIRED', 503);
  const adminWallets = (env.GENESIS_ADMIN_WALLETS ?? '')
    .split(',')
    .filter(Boolean)
    .map(wallet);
  const privateVerificationWallets = (
    env.GENESIS_PRIVATE_VERIFICATION_WALLETS ?? ''
  )
    .split(',')
    .filter(Boolean)
    .map(wallet);
  if (adminEnabled && !adminWallets.length)
    throw new GenesisError('ADMIN_CONFIGURATION_REQUIRED', 503);
  let approvedPartners: Record<string, string>;
  try {
    approvedPartners = z
      .record(
        z.string().regex(/^[a-z0-9-]{3,64}$/),
        z.string().regex(/^sha256:[a-f0-9]{64}$/),
      )
      .parse(JSON.parse(env.GENESIS_APPROVED_PARTNERS ?? '{}'));
  } catch {
    throw new GenesisError('PARTNER_CONFIGURATION_INVALID', 503);
  }
  return {
    service: {
      origin,
      publicEnabled,
      adminEnabled,
      adminWallets,
      rateSecret: secret,
      approvedPartners,
      privateVerificationWallets,
    } satisfies ServiceConfig,
    ...databaseConfig(env, resolveNative),
  };
}

let singleton:
  { service: RegistrationService; fingerprint: string } | undefined;
export function registrationService() {
  const config = runtimeConfig(process.env);
  // Deployment configuration is immutable for a process. Cache only pool/service,
  // never requests, wallet results, sessions or mutable registration state.
  const fingerprint = JSON.stringify(config);
  if (!singleton || singleton.fingerprint !== fingerprint) {
    if (singleton)
      throw new GenesisError('CONFIGURATION_RESTART_REQUIRED', 503);
    const pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.ssl,
      enableChannelBinding: config.enableChannelBinding,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10_000,
      application_name: 'lammb-genesis-registration',
    });
    pool.on('error', () => {
      /* Never log connection strings or private query data. */
    });
    singleton = {
      service: new RegistrationService(
        new PostgresStore(pool, { requireTls: config.ssl !== false }),
        config.service,
      ),
      fingerprint,
    };
  }
  return singleton.service;
}
