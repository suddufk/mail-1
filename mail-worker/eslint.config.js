import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        console: "readonly",
        crypto: "readonly",
        btoa: "readonly",
        atob: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        URL: "readonly",
        Request: "readonly",
        Response: "readonly",
        fetch: "readonly",
        Uint8Array: "readonly",
        ArrayBuffer: "readonly",
        setTimeout: "readonly",
        Image: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
];
