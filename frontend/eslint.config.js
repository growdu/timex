// @ts-check
import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'eslint.config.js'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React 17+ 不强制 import React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // JSX 中引用的变量标记为已使用（修复 no-unused-vars 误报）
      'react/jsx-uses-vars': 'error',
      // Hooks 规则
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // 未使用变量：作为警告而非错误（前端代码量大，渐进式清理）
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // 测试文件：放宽一些规则
  {
    files: ['src/**/*.{test,spec}.{js,jsx}'],
    rules: {
      'no-unused-vars': 'off', // vitest 经常用 _ 前缀或未使用
    },
  },
];