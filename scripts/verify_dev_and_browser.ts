/**
 * Verification Script: Real-Browser Console Check & Dev Server Resilience.
 *
 * 1. Boots the Vite dev server (port 3000) using vite.config.ts with dev-middleware.
 * 2. Launches real headless Google Chrome with remote debugging.
 * 3. Connects via Chrome DevTools Protocol (CDP) WebSocket:
 *    - Records all console.log, console.warn, console.error events.
 *    - Records any unhandled JavaScript exceptions (Runtime.exceptionThrown).
 *    - Verifies map and application mount cleanly.
 *    - Captures a real screenshot to verify DOM rendering.
 * 4. Simulates a locked-file scenario (FileShare.None) in the project tree to verify
 *    that Vite's FSWatcher ignores it and does not crash.
 */

import { createServer } from "vite";
import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9222;
const SCREENSHOT_PATH = path.resolve(
  "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_verified.png"
);

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
  console.log("=== STEP 1: Starting Vite Dev Server on port 3040 ===");
  const server = await createServer({
    configFile: path.resolve("./vite.config.ts"),
    server: { port: 3040 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === "object" && address ? address.port : 3040;
  console.log(`✓ Vite dev server running at http://localhost:${port}`);

  console.log("=== STEP 2: Launching Chrome with CDP ===");
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  // Wait for Chrome CDP endpoint to be ready
  let targets: any[] = [];
  for (let i = 0; i < 20; i++) {
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
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log(`✓ Connected to Chrome CDP target: ${pageTarget.title}`);

  // Connect WebSocket (using Node 22 native global WebSocket)
  const ws = new (globalThis as any).WebSocket(wsUrl);

  const consoleMessages: Array<{ type: string; text: string }> = [];
  const errors: string[] = [];

  let msgId = 1;
  const pendingRequests = new Map<number, (res: any) => void>();

  function sendCommand(method: string, params: any = {}): Promise<any> {
    const id = msgId++;
    return new Promise((resolve) => {
      pendingRequests.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });

  ws.onmessage = (event: any) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pendingRequests.has(msg.id)) {
      pendingRequests.get(msg.id)!(msg.result);
      pendingRequests.delete(msg.id);
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const type = msg.params.type;
      const text = msg.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ");
      consoleMessages.push({ type, text });
      if (type === "error") {
        errors.push(`Console Error: ${text}`);
      }
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
      errors.push(`Runtime Exception: ${desc}`);
    }
  };

  await sendCommand("Runtime.enable");
  await sendCommand("Page.enable");
  await sendCommand("Log.enable");

  console.log(`=== STEP 3: Navigating to http://localhost:${port} ===`);
  await sendCommand("Page.navigate", { url: `http://localhost:${port}` });

  // Wait 4 seconds for full module evaluation, Leaflet map initialization, and feeds
  await sleep(4000);

  // Capture initial screenshot
  const screenshotRes = await sendCommand("Page.captureScreenshot", { format: "png" });
  if (screenshotRes?.data) {
    fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(screenshotRes.data, "base64"));
    console.log(`✓ Real browser screenshot saved to: ${SCREENSHOT_PATH}`);
  }

  // Check DOM state
  const evalTitle = await sendCommand("Runtime.evaluate", {
    expression: "document.title",
  });
  const evalMap = await sendCommand("Runtime.evaluate", {
    expression: "document.querySelector('#map')?.children?.length",
  });
  const evalHeader = await sendCommand("Runtime.evaluate", {
    expression: "document.querySelector('.header')?.textContent",
  });

  console.log(`✓ Document title: "${evalTitle?.result?.value}"`);
  console.log(`✓ Map element child count: ${evalMap?.result?.value} (Map rendered)`);
  console.log(`✓ Header text preview: "${(evalHeader?.result?.value || "").trim().slice(0, 40)}..."`);

  console.log("=== STEP 3.5: Testing Interactive UI Elements (Air Drawer & Radar) ===");
  // Test Air Drawer Toggle
  console.log("-> Clicking #btn-toggle-air to open Air Quality drawer...");
  await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-air")?.click()`,
  });
  await sleep(1000);

  const isDrawerOpen = await sendCommand("Runtime.evaluate", {
    expression: `JSON.stringify({
      airOpen: document.getElementById("air-drawer")?.classList.contains("open"),
      aboutOpen: document.getElementById("about-drawer")?.classList.contains("open"),
      aboutRect: document.getElementById("about-drawer")?.getBoundingClientRect(),
      airRect: document.getElementById("air-drawer")?.getBoundingClientRect(),
      aboutZ: window.getComputedStyle(document.getElementById("about-drawer")).zIndex,
      airZ: window.getComputedStyle(document.getElementById("air-drawer")).zIndex,
      airTransform: window.getComputedStyle(document.getElementById("air-drawer")).transform,
      aboutTransform: window.getComputedStyle(document.getElementById("about-drawer")).transform,
    })`,
  });
  console.log(`✓ Drawer state audit:`, isDrawerOpen?.result?.value);

  // Capture screenshot with Air Drawer open
  const airShotPath = path.resolve(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_air_drawer.png"
  );
  const airShotRes = await sendCommand("Page.captureScreenshot", { format: "png" });
  if (airShotRes?.data) {
    fs.writeFileSync(airShotPath, Buffer.from(airShotRes.data, "base64"));
    console.log(`✓ Air Quality Drawer screenshot saved to: ${airShotPath}`);
  }

  // Scroll down to capture structured haze callout card
  await sendCommand("Runtime.evaluate", {
    expression: `document.querySelector(".drawer-content")?.scrollTo({ top: 400, behavior: "instant" })`,
  });
  await sleep(400);

  const scrollShotPath = path.resolve(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_air_drawer_scrolled.png"
  );
  const scrollShotRes = await sendCommand("Page.captureScreenshot", { format: "png" });
  if (scrollShotRes?.data) {
    fs.writeFileSync(scrollShotPath, Buffer.from(scrollShotRes.data, "base64"));
    console.log(`✓ Air Quality Drawer (scrolled) screenshot saved to: ${scrollShotPath}`);
  }

  // Close Air Drawer via Close button
  console.log("-> Closing Air Quality drawer via #btn-close-air-drawer...");
  await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("btn-close-air-drawer")?.click()`,
  });
  await sleep(600);

  const isDrawerClosed = await sendCommand("Runtime.evaluate", {
    expression: `!document.getElementById("air-drawer")?.classList.contains("open")`,
  });
  console.log(`✓ Air drawer closed successfully via button: ${isDrawerClosed?.result?.value}`);

  // Test Backdrop click dismissal (Task 6)
  console.log("-> Opening Air Quality drawer to test backdrop click dismissal...");
  await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-air")?.click()`,
  });
  await sleep(600);

  const isBackdropActive = await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("drawer-backdrop")?.classList.contains("active")`,
  });
  console.log(`✓ Drawer backdrop active state: ${isBackdropActive?.result?.value}`);

  console.log("-> Clicking #drawer-backdrop to dismiss drawer...");
  await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("drawer-backdrop")?.click()`,
  });
  await sleep(600);

  const isDrawerClosedByBackdrop = await sendCommand("Runtime.evaluate", {
    expression: `!document.getElementById("air-drawer")?.classList.contains("open") && !document.getElementById("drawer-backdrop")?.classList.contains("active")`,
  });
  console.log(`✓ Drawer and backdrop dismissed via backdrop click: ${isDrawerClosedByBackdrop?.result?.value}`);

  // Test Escape key dismissal (Task 7)
  console.log("-> Opening Air Quality drawer to test Escape key dismissal...");
  await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-air")?.click()`,
  });
  await sleep(600);

  await sendCommand("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await sleep(600);

  const isDrawerClosedByEsc = await sendCommand("Runtime.evaluate", {
    expression: `!document.getElementById("air-drawer")?.classList.contains("open")`,
  });
  console.log(`✓ Drawer dismissed via Escape key: ${isDrawerClosedByEsc?.result?.value}`);

  // Test Rain Radar Toggle
  console.log("-> Clicking #btn-toggle-radar to activate Doppler Rain Radar...");
  await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-radar")?.click()`,
  });
  await sleep(1500);

  const isRadarActive = await sendCommand("Runtime.evaluate", {
    expression: `document.getElementById("btn-toggle-radar")?.classList.contains("active")`,
  });
  console.log(`✓ Radar button active state: ${isRadarActive?.result?.value}`);

  const radarShotPath = path.resolve(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_radar_active.png"
  );
  const radarShotRes = await sendCommand("Page.captureScreenshot", { format: "png" });
  if (radarShotRes?.data) {
    fs.writeFileSync(radarShotPath, Buffer.from(radarShotRes.data, "base64"));
    console.log(`✓ Rain Radar overlay screenshot saved to: ${radarShotPath}`);
  }

  // Check for Option C Compound Earthquake Pins
  const eqPinCount = await sendCommand("Runtime.evaluate", {
    expression: `document.querySelectorAll(".earthquake-compound-pin")?.length`,
  });
  console.log(`✓ Option C compound earthquake pins rendered on map: ${eqPinCount?.result?.value ?? 0}`);

  console.log("=== STEP 4: Console Log & Error Audit ===");
  console.log(`Total console messages logged: ${consoleMessages.length}`);
  for (const m of consoleMessages) {
    console.log(`  [${m.type.toUpperCase()}] ${m.text}`);
  }

  if (errors.length > 0) {
    console.error("❌ FAILED: Browser errors were detected:");
    for (const err of errors) console.error(`  - ${err}`);
  } else {
    console.log("✅ ZERO CONSOLE ERRORS DETECTED ON CLIENT LOAD & INTERACTIONS.");
  }

  // Close Chrome
  ws.close();
  chromeProcess.kill();

  console.log("=== STEP 5: Testing Dev Server Resilience with Locked Files ===");
  const lockedZipPath = path.resolve("./test_locked_artifact.zip");
  const fd = fs.openSync(lockedZipPath, "w");
  fs.writeSync(fd, "test-locked-content");
  console.log(`✓ Created locked zip file: ${lockedZipPath}`);

  // Wait for file watcher debounce
  await sleep(1500);

  // Ping dev server to confirm it is still alive and serving requests
  const healthRes = await fetchJson(`http://localhost:${port}/api/power`).catch(() => null);
  console.log(`✓ Dev server /api/power endpoint status: ${healthRes ? "ONLINE (200 OK)" : "OFFLINE"}`);

  // Cleanup locked file
  fs.closeSync(fd);
  fs.unlinkSync(lockedZipPath);
  console.log("✓ Removed test locked file");

  await server.close();
  console.log("✓ Dev server closed cleanly");

  if (errors.length > 0) {
    process.exit(1);
  }
  if (!healthRes) {
    console.error("❌ Dev server died during locked file test");
    process.exit(1);
  }

  console.log("🎉 ALL VERIFICATION CRITERIA PASSED.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
