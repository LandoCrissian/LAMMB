import { getContext } from '@netlify/functions';
import { GenesisError } from './model';

type Environment = Record<string, string | undefined>;
type NativeContext = { deploy: { context: string }; ip: string };

export function requestEnvironment(
  env: Environment,
  resolveContext: () => NativeContext = getContext,
): Environment {
  let context: NativeContext | undefined;
  try {
    context = resolveContext();
  } catch {
    // Outside Netlify, only standalone/local configuration may be used. On a
    // native deployment, missing request context must never open copied records.
  }
  const native =
    context ||
    env.NETLIFY === 'true' ||
    env.SITE_ID ||
    env.NETLIFY_DB_URL ||
    env.CONTEXT;
  if (!native) return env;
  if (
    !context ||
    context.deploy.context !== 'production' ||
    (env.CONTEXT && env.CONTEXT !== context.deploy.context)
  )
    throw new GenesisError('REGISTRATION_PREVIEW_DISABLED', 503);
  // CONTEXT/NETLIFY are build variables, not guaranteed function runtime env.
  // Request-local platform metadata is authoritative; never trust URL/headers.
  return { ...env, NETLIFY: 'true', CONTEXT: context.deploy.context };
}

export function trustedConnectionIp(
  resolveContext: () => NativeContext = getContext,
): string | null {
  try {
    const ip = resolveContext().ip;
    return typeof ip === 'string' && ip.length > 0 && ip.length <= 128
      ? ip
      : null;
  } catch {
    return null;
  }
}
