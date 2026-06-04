import nextEslintPluginNext from '@next/eslint-plugin-next';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  { plugins: { '@next/next': nextEslintPluginNext } },
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  {
    ignores: ['.next/**/*', '**/out-tsc'],
  },
  {
    // Explicitly silence import ordering rules — they may be re-enabled by
    // nx flat/react-typescript or @next/eslint-plugin-next configs above.
    rules: {
      'import/order': 'off',
      'import/newline-after-import': 'off',
    },
  },
];
