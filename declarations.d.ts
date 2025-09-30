declare module '*.css';

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PROD: boolean;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
