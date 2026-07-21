import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

const DEV_BACKEND_URL = "http://localhost:8001";

function backendUrlFor(mode: string) {
  const configured = loadEnv(mode, process.cwd(), "VITE_").VITE_BACKEND_URL;
  return (configured || DEV_BACKEND_URL).replace(/\/$/, "");
}

export default defineConfig(({ mode }) => {
  const backendUrl = backendUrlFor(mode);
  const backendPermission = `${new URL(backendUrl).origin}/*`;
  const configuredManifest = {
    ...manifest,
    host_permissions: [...manifest.host_permissions.filter((permission) => !permission.includes("localhost") && !permission.includes("127.0.0.1")), backendPermission],
  };

  return {
    plugins: [react(), crx({ manifest: configuredManifest })],
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
    },
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
    },
  };
});
