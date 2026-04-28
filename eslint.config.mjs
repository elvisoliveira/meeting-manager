import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.amd,
                boot: 'readonly',
                bootstrap: 'readonly',
                PDFLib: 'readonly',
                FileSystemObserver: 'readonly'
            }
        },
        rules: {
            indent: ['error', 4, { SwitchCase: 1 }],
            'prefer-arrow-callback': 'error',
            'operator-linebreak': 'off',
            'comma-style': 'off',
            'no-debugger': 'off',
            curly: ['error', 'multi']
        }
    }
];
