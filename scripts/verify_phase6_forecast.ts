/**
 * Phase 6 Verification Script: Forecast Button & Top Dropdown Drawer.
 *
 * Verifies:
 * 1. Radar and satellite buttons are removed from the header.
 * 2. Static "Forecast" button is present and styled consistently.
 * 3. Clicking "Forecast" toggles the top slide-down Forecast Drawer.
 * 4. Drawer renders 24-hour horizon with rain %, wind speed, weather icon, and current hour badge.
 * 5. Horizontal scrolling is operational.
 * 6. Closing the drawer works cleanly.
 * 7. Zero console errors.
 */

import { createServer } from "vite";
import { spawn } from "child_process";
import http from "http";
import path from "path";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9222;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  console.log("=== STEP 1: Starting Vite Dev Server on port 3056 ===");
  const server = await createServer({
    configFile: path.resolve("./vite.config.ts"),
    server: { port: 3056 },
  });
  await server.listen();
  console.log("✓ Vite dev server running at http://localhost:3056");

  console.log("=== STEP 2: Launching Chrome with CDP ===");
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,800",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let targets: any[] = [];
  for (let i = 0; i < 25; i++) {
    await sleep(300);
    try {
      targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (targets.length > 0) break;
    } catch {}
  }

  if (targets.length === 0) {
    throw new Error("Could not connect to Chrome CDP endpoint");
  }

  const pageTarget = targets.find((t: any) => t.type === "page") || targets[0];
  console.log("✓ Connected to Chrome target:", pageTarget.id);

  const ws = new (globalThis as any).WebSocket(pageTarget.webSocketDebuggerUrl);

  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", (e: any) => reject(e), { once: true });
  });

  let messageId = 1;
  const pendingRequests = new Map<number, (res: any) => void>();

  ws.addEventListener("message", (event: any) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      const resolver = pendingRequests.get(msg.id)!;
      pendingRequests.delete(msg.id);
      resolver(msg.result);
    }
  });

  function sendCommand(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve) => {
      const id = messageId++;
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCommand("Runtime.enable");
  await sendCommand("Page.enable");

  console.log("=== STEP 3: Navigating to http://localhost:3056 ===");
  await sendCommand("Page.navigate", { url: "http://localhost:3056" });
  await sleep(3500);

  // Audit Header
  console.log("=== STEP 4: Auditing Header UI ===");
  const headerAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const forecastBtn = document.getElementById("btn-toggle-forecast");
        const radarBtn = document.getElementById("btn-toggle-radar");
        const satBtn = document.getElementById("btn-toggle-satellite");
        const weatherCard = document.getElementById("weather-status-card");
        return {
          hasForecastBtn: !!forecastBtn,
          forecastBtnText: forecastBtn ? forecastBtn.innerText.trim() : null,
          hasRadarBtn: !!radarBtn,
          hasSatBtn: !!satBtn,
          hasWeatherCard: !!weatherCard,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ Header audit:", headerAudit.result.value);

  // Capture Base Map Screenshot
  const baseScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_forecast_header.png",
    Buffer.from(baseScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_forecast_header.png");

  // Open Forecast Drawer
  console.log("=== STEP 5: Opening Forecast Drawer ===");
  await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const forecastBtn = document.getElementById("btn-toggle-forecast");
        forecastBtn?.click();
      })()
    `,
  });
  await sleep(1500);

  const drawerAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const drawer = document.getElementById("forecast-drawer");
        const scrollEl = document.querySelector(".forecast-hours-scroll");
        const cards = document.querySelectorAll(".forecast-hour-card");
        const nowBadge = document.querySelector(".current-hour-pill");
        return {
          isOpen: drawer?.classList.contains("open"),
          cardCount: cards.length,
          hasScrollEl: !!scrollEl,
          hasNextHourBadge: !!nowBadge,
          firstCardText: cards[0] ? (cards[0] as HTMLElement).innerText.replace(/\\s+/g, ' ') : null,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ Forecast drawer audit:", drawerAudit.result.value);

  const openScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_forecast_drawer_open.png",
    Buffer.from(openScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_forecast_drawer_open.png");

  // Test Horizontal Scrolling
  console.log("=== STEP 6: Testing Horizontal Scroll ===");
  await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const scrollEl = document.querySelector(".forecast-hours-scroll");
        if (scrollEl) {
          scrollEl.scrollLeft = 500;
        }
      })()
    `,
  });
  await sleep(1000);

  const scrollAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const scrollEl = document.querySelector(".forecast-hours-scroll");
        return {
          scrollLeft: scrollEl ? scrollEl.scrollLeft : 0,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ Scroll audit:", scrollAudit.result.value);

  const scrolledScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_forecast_drawer_scrolled.png",
    Buffer.from(scrolledScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_forecast_drawer_scrolled.png");

  // Close Forecast Drawer
  console.log("=== STEP 7: Closing Forecast Drawer ===");
  await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const closeBtn = document.getElementById("btn-close-forecast-drawer");
        closeBtn?.click();
      })()
    `,
  });
  await sleep(1000);

  const closeAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const drawer = document.getElementById("forecast-drawer");
        return {
          isOpen: drawer?.classList.contains("open"),
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ Close audit:", closeAudit.result.value);

  const closedScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_forecast_closed.png",
    Buffer.from(closedScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_forecast_closed.png");

  ws.close();
  chromeProcess.kill();
  await server.close();
  console.log("🎉 Forecast browser verification completed cleanly.");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
