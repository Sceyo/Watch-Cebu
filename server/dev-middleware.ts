/**
 * Local Development Adapter for Watch Cebu.
 *
 * NOTE: This is explicitly a DEVELOPMENT-ONLY adapter implemented as a Vite
 * dev server middleware (via configureServer hook). It registers local same-origin
 * `/api/power` and `/api/earthquakes` endpoints during `npm run dev`.
 *
 * Production adapter: selected and implemented in Stage 5.
 *
 * Two modes (switchable via env var):
 *
 *   npm run dev             → scrape-live path (getPowerAdvisories / getEarthquakeEvents)
 *                             default; works without needing the scheduled job to have run first
 *
 *   npm run dev:snapshot    → snapshot path (getPowerAdvisoriesSnapshot / getEarthquakeEventsSnapshot)
 *   (WATCH_CEBU_USE_SNAPSHOT=true)
 *                             exercises the same code path production uses; exercises staleness
 *                             and missing-file fallback behavior locally; requires at least one
 *                             prior run of scripts/run_scheduled_fetch.ts
 *
 * The snapshot path is provided so the shipped production code path gets real-world exercise
 * before it is ever solely depended on — the same gap that let earlier data bugs go unnoticed.
 */

import type { Plugin, ViteDevServer } from "vite";
import {
  getPowerAdvisories,
  getEarthquakeEvents,
  getPowerAdvisoriesSnapshot,
  getEarthquakeEventsSnapshot,
} from "./api.js";

const USE_SNAPSHOT = process.env.WATCH_CEBU_USE_SNAPSHOT === "true";

if (USE_SNAPSHOT) {
  console.log("[WatchCebu] dev-middleware: snapshot mode (WATCH_CEBU_USE_SNAPSHOT=true)");
  console.log("[WatchCebu] API routes will read data/live_*.json snapshot files.");
} else {
  console.log("[WatchCebu] dev-middleware: scrape-live mode (default)");
}

export function watchCebuDevMiddleware(): Plugin {
  return {
    name: "watch-cebu-dev-middleware",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        if (url === "/api/power") {
          try {
            const data = USE_SNAPSHOT
              ? await getPowerAdvisoriesSnapshot()
              : await getPowerAdvisories();
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || String(err) }));
          }
          return;
        }

        if (url === "/api/earthquakes") {
          try {
            const data = USE_SNAPSHOT
              ? await getEarthquakeEventsSnapshot()
              : await getEarthquakeEvents();
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || String(err) }));
          }
          return;
        }

        next();
      });
    },
  };
}

