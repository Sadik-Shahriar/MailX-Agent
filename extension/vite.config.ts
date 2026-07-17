import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

const DEV_BACKEND_URL = "http://localhost:8001";

function backendUrlFor(mode: string) {
  const configured = loadEnv(mode, process.cwd(), "VITE_").VITE_BACKEND_URL;
  const value = configured || (mode === "development" ? DEV_BACKEND_URL : "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_BACKEND_URL must be an absolute URL.");
  }
  if (mode === "production" && (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("Production VITE_BACKEND_URL must use HTTPS and cannot target localhost.");
  }
  return url.toString().replace(/\/$/, "");
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
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
    },
  };
});
