// ESLint 8 (legacy) config. Kept on .eslintrc rather than flat config because the
// pinned eslint is 8.54, which does not read eslint.config.js by default.
//
// Scope: this is a lint pass over a large existing codebase, so the ruleset is tuned
// to surface real defects (unused code, hook-dependency bugs, unreachable branches)
// rather than to enforce a style the repo has never followed. Formatting is left
// alone entirely — there is no Prettier here and reflowing 36 components would bury
// anything useful.
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    'coverage',
    '*.min.js',
    'public',
    'server.cjs',
    'vite.config.mjs',
    'tailwind.config.ts',
    'postcss.config.js',
  ],
  rules: {
    // The new JSX transform is on (tsconfig jsx: react-jsx), so React need not be
    // in scope, and TypeScript already types props.
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    // TypeScript's own checker owns these; the ESLint versions double-report or
    // false-positive on type-only and ambient declarations.
    'no-undef': 'off',
    'no-unused-vars': 'off',

    // Unused code is worth seeing, but an unused function argument is often a
    // signature the callback contract requires, so only flag ones not prefixed
    // with an underscore.
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
    ],

    // `any` is pervasive in the Polkadot/chain-facing code where upstream types are
    // themselves loose. Worth knowing about, not worth blocking on.
    '@typescript-eslint/no-explicit-any': 'off',

    // Hook-dependency mistakes are real bugs, so keep the warning visible; the repo
    // already carries targeted eslint-disable comments where a dep is intentionally
    // omitted.
    'react-hooks/exhaustive-deps': 'warn',

    // JSX apostrophes and quotes render fine; escaping them is a style preference.
    'react/no-unescaped-entities': 'off',

    // `catch {}` is used deliberately for best-effort calls that are allowed to fail
    // — blocked localStorage, a denied clipboard permission, a MIDI reset on a
    // disconnected device. Every other kind of empty block still errors.
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  overrides: [
    {
      // Config and script files are plain CommonJS/Node.
      files: ['*.cjs', '*.config.js'],
      env: { node: true },
      rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
  ],
};
