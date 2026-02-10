/// <reference types="vite/client" />

/** App version injected by Vite from tauri.conf.json */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_BACKEND?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
