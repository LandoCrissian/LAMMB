import type { NextConfig } from 'next';
import { parseEnvironment } from './src/config/env';
import { securityHeaders } from './src/config/security';

// Validated when Next starts, builds, generates types, or serves production.
const environment = parseEnvironment(process.env);

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@lammb/collection', '@lammb/schema'],
  async headers() {
    return [
      {
        source: '/:path*',
        // Development tooling needs eval; the production policy never permits it.
        // No pre-existing development CSP is removed.
        headers:
          environment.NODE_ENV === 'production'
            ? securityHeaders
            : securityHeaders.filter(
                (header) => header.key !== 'Content-Security-Policy',
              ),
      },
    ];
  },
};

export default config;
