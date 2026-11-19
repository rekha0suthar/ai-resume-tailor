import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'node_modules/'] },

  js.configs.recommended,

  {
    rules: {
      // `const { omitted, ...rest } = obj` is the idiomatic way to drop a key.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },

  // React (src/) — browser globals.
  {
    files: ['src/**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: globals.browser,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Vite + the automatic runtime still use explicit `import React`,
      // but prop-types aren't used anywhere in this codebase.
      'react/prop-types': 'off',
    },
    plugins: {
      ...react.configs.flat.recommended.plugins,
      'react-hooks': reactHooks,
    },
  },

  // Node side: serverless functions, Vite config, Tailwind/PostCSS configs.
  {
    files: ['api/**/*.js', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: { globals: globals.node },
  },

  // Shared client/server module: reads process.env behind a `typeof` guard
  // (the client imports it only for the input caps).
  {
    files: ['src/lib/prompts.js'],
    languageOptions: { globals: { process: 'readonly' } },
  },
];
