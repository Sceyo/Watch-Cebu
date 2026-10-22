import { defineConfig } from "vite";
import { realpathSync } from "fs";
import { watchCebuDevMiddleware } from "./server/dev-middleware.js";

export default defineConfig({
  root: realpathSync(process.cwd()),
  plugins: [watchCebuDevMiddleware()],
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: [
        "**/dist/**",
        "**/dist-client/**",
        "**/*.zip",
        "**/node_modules/**",
        "**/.git/**",
        "**/coverage/**",
      ],
    },
  },
  build: {
    outDir: "dist-client",
    sourcemap: true,
  },
});
