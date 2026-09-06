import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

// Raiz do monorepo (= docroot do site). O index.html usa caminhos absolutos
// (/css/site.css, /js/site.js, /assets/…) — em produção o Apache resolve;
// em `npm run dev` este plugin serve esses arquivos a partir da raiz do repo.
const SITE_ROOT = path.resolve(import.meta.dirname, "../..");

const MIME: Record<string, string> = {
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

function serveSiteShell(): Plugin {
  return {
    name: "serve-site-shell",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (!/^\/(css|js|assets)\//.test(url)) return next();
        const file = path.resolve(SITE_ROOT, "." + url);
        if (!file.startsWith(SITE_ROOT + path.sep) || !fs.existsSync(file)) return next();
        res.setHeader("Content-Type", MIME[path.extname(file)] ?? "application/octet-stream");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), serveSiteShell()],
  build: {
    outDir: path.resolve(import.meta.dirname, "../../minisites/juros-compostos"),
    emptyOutDir: true,
  },
});
