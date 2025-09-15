/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string;
  readonly VITE_KAFKA_PROXY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}