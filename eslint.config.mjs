import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc'],
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
      'curly': ['error', 'all'],
      'no-console': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',

      // Import Ordering
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'alphabetize': { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
];
