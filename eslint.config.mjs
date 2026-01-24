import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**/*',
      'build/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      '*.js.map',
      'src/migrations/**/*',
      'src/modules/mail/templates/**/*',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': ['error', { allow: ['constructors'] }],

      'no-console': 'off',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-duplicate-imports': 'error',
      '@typescript-eslint/return-await': ['error', 'always'],

      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      'prettier/prettier': [
        'error',
        {
          endOfLine: 'lf',
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 120,
          tabWidth: 2,
          semi: true,
          bracketSpacing: true,
        },
      ],
    },
  },

  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-console': 'off',
    },
  },

  {
    files: ['src/migrations/**/*', 'src/config/database/**/*', 'src/**/*.entity.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'class-methods-use-this': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    files: ['src/**/*.dto.ts', 'src/**/*.validation.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'class-methods-use-this': 'off',
    },
  },

  {
    files: [
      'src/modules/payments/**/*',
      'src/modules/cloudinary/**/*',
      'src/modules/mail/**/*',
      'src/modules/N8N/**/*',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);
