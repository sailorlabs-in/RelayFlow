//@ts-check
const path = require('path');

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  // Required for Docker standalone output — produces a minimal server.js
  // with only the dependencies it actually uses.
  output: 'standalone',

  // Enable externalDir for monorepo library imports so Next can watch files
  // outside the app root and keep HMR working during serve-all.
  experimental: {
    externalDir: true,
  },

  // NOTE: Turbopack resolves @chat-app/* via tsconfig.json compilerOptions.paths
  // — no extra config needed here. resolveAlias breaks with absolute paths.

  // Webpack alias config (used when Turbopack is disabled or for edge cases)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      '@chat-app/shared-constants': path.resolve(
        __dirname,
        '../../libs/shared-constants/src/index.ts',
      ),
      '@chat-app/shared-events': path.resolve(
        __dirname,
        '../../libs/shared-events/src/index.ts',
      ),
      '@chat-app/contracts': path.resolve(
        __dirname,
        '../../libs/contracts/src/index.ts',
      ),
      '@chat-app/common': path.resolve(
        __dirname,
        '../../libs/common/src/index.ts',
      ),
    };
    return config;
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
