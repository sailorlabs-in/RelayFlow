import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/.next',
      '**/build',
      '**/coverage',
      '**/node_modules',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', '**/tsconfig.*.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:infra', 'type:common', 'type:contract', 'type:shared'],
            },
            {
              sourceTag: 'type:infra',
              onlyDependOnLibsWithTags: ['type:common', 'type:contract'],
            },
            {
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: ['type:contract'],
            },
            {
              sourceTag: 'type:common',
              onlyDependOnLibsWithTags: ['type:contract'],
            },
            {
              sourceTag: 'type:contract',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
      // Code Quality rules
      'eqeqeq': ['error', 'always'],
      // Downgraded to warn: single-line guard clauses like `if (x) return;`
      // are perfectly readable. Braces-everywhere is a style preference.
      'curly': ['warn', 'all'],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],

      // Import Ordering — turned off: order, alphabetization & blank-line
      // enforcement are cosmetic and create noise without value.
      'import/order': 'off',
      'import/newline-after-import': 'off',
      'import/no-self-import': 'error',
      // Downgraded to warn: real circular deps should still be visible but
      // shouldn't block builds/commits.
      'import/no-cycle': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Downgraded to warn: `import type` is preferred but not enforced as an
      // error — avoids blocking commits over a style choice.
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
];
