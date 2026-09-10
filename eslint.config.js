import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^[A-Z_]',
          varsIgnorePattern: '^[A-Z_]',
        },
      ],
      // Several visual modules intentionally export render helpers alongside
      // components. They are imported by editors and do not affect HMR safety.
      'react-refresh/only-export-components': 'off',
      // React safely falls back to the existing manual memoization when the
      // compiler cannot prove that it can preserve a dependency array.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: [
      'config/**/*.js',
      'middleware/**/*.js',
      'routes/**/*.js',
      'services/**/*.js',
      'tests/**/*.js',
      'utils/**/*.js',
      'server.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
])
