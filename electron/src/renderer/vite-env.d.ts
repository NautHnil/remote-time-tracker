/// <reference types="vite/client" />

// Extend Vite's ImportMetaEnv interface
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SCREENSHOT_INTERVAL: string;
  readonly VITE_SYNC_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
