// Real, long-lived Express server for local dev (`npm run dev`) and any
// traditional (non-Vercel) hosting. Deliberately kept OUT of server.ts:
// this file is the only one allowed to import "vite" (and therefore
// Rollup) — see the warning at the top of buildApp() in server.ts for why
// that import must never leak into the code Vercel bundles as the
// serverless function.
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { buildApp } from "./server.js";

async function startLocalServer() {
  const app = await buildApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startLocalServer();
