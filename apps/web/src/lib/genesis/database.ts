import { getConnectionString } from '@netlify/database';
import { GenesisError } from './model';

type Environment = Record<string, string | undefined>;

// Previews contain a COPY of production records. No endpoint, including config,
// may resolve a database or reuse copied authentication on a public preview.
export function assertRegistrationContext(env: Environment) {
  if (
    (env.CONTEXT && env.CONTEXT !== 'production') ||
    (env.NETLIFY === 'true' && env.CONTEXT !== 'production')
  )
    throw new GenesisError('REGISTRATION_PREVIEW_DISABLED', 503);
}

export function databaseConfig(
  env: Environment,
  resolveNative: () => string = getConnectionString,
) {
  const native = env.NETLIFY === 'true';
  if (native && env.GENESIS_DATABASE_URL)
    throw new GenesisError('DATABASE_SOURCE_AMBIGUOUS', 503);
  let db: string;
  try {
    // Never fall back to a pinned production URL when branch resolution fails.
    db = native ? resolveNative() : (env.GENESIS_DATABASE_URL ?? '');
  } catch {
    throw new GenesisError('DATABASE_CONFIGURATION_REQUIRED', 503);
  }
  let url: URL;
  try {
    url = new URL(db);
  } catch {
    throw new GenesisError('DATABASE_CONFIGURATION_REQUIRED', 503);
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname.slice(1) ||
    url.hash
  )
    throw new GenesisError('DATABASE_CONFIGURATION_REQUIRED', 503);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (native) {
    const password = env.GENESIS_DATABASE_PASSWORD ?? '';
    if (!/^[\x21-\x7e]{32,256}$/.test(password))
      throw new GenesisError('DATABASE_RUNTIME_PASSWORD_REQUIRED', 503);
    if (loopback)
      throw new GenesisError('DATABASE_CONFIGURATION_REQUIRED', 503);
    // The SDK selects host/database/branch; its migration-owner credential is
    // NEVER used by the request handler. This SQL-created login has no owner or
    // neon_superuser membership. Branches copy roles, not application secrets.
    url.username = 'lammb_genesis_runtime';
    url.password = password;
    for (const [key, value] of url.searchParams) {
      if (
        url.searchParams.getAll(key).length !== 1 ||
        !(
          (key === 'sslmode' && ['require', 'verify-full'].includes(value)) ||
          (key === 'channel_binding' && value === 'require')
        )
      )
        throw new GenesisError('DATABASE_TLS_CONFIGURATION_INVALID', 503);
    }
    // pg URL ssl parameters override the ssl object, even with require. Remove
    // only the validated provider parameters and enforce verify-full ourselves.
    url.search = '';
  } else if (
    [...url.searchParams.keys()].some((key) =>
      key.toLowerCase().startsWith('ssl'),
    )
  )
    throw new GenesisError('DATABASE_TLS_CONFIGURATION_INVALID', 503);
  return {
    databaseUrl: native ? url.toString() : db,
    ssl:
      loopback && env.NODE_ENV !== 'production'
        ? false
        : {
            rejectUnauthorized: true,
            ...(env.GENESIS_DATABASE_CA ? { ca: env.GENESIS_DATABASE_CA } : {}),
          },
    enableChannelBinding: native,
  };
}
