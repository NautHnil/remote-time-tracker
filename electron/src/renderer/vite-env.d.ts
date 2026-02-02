/// <reference types="vite/client" />

// Extend Vite's ImportMetaEnv interface
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SCREENSHOT_INTERVAL: string;
  readonly VITE_WEBSITE_DOMAIN: string;
  readonly VITE_INVITE_WEBSITE_DOMAIN: string;
  readonly VITE_SYNC_INTERVAL: string;
  readonly VITE_PRESENCE_HEARTBEAT_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
