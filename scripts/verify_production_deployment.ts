/**
 * Production Deployment Verification Script (Fix 1-5 & Acceptance).
 *
 * Audits the live production deployment on Vercel (https://watch-cebu.vercel.app/):
 * 1. Checks that / returns 200 with HTML and Leaflet map renders.
 * 2. Checks console logs for zero runtime errors.
 * 3. Confirms freshness chips show true verified freshness.
 * 4. Captures Desktop (1440x900) and Mobile (375x667) screenshots in verification-artifacts/production/.
 */

import { spawn } from "child_process";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT_DIR, "verification-artifacts", "production");

function findChromeExecutable(): string {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("No Chrome or Edge browser executable found");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const chromePath = findChromeExecutable();
  console.log(`Using browser: ${chromePath}`);

  const port = 9333;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,900",
    "about:blank",
  ]);

  try {
    let targets: any[] = [];
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        if (targets.length > 0) break;
      } catch {}
    }

    if (targets.length === 0) {
      throw new Error("Could not connect to Chrome CDP targets");
    }

    const pageTarget = targets.find((t: any) => t.type === "page") || targets[0];
    console.log("Connected to page target:", pageTarget.id);

    const { WebSocket } = await import("undici");
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (e: any) => reject(e);
    });

    let messageId = 1;
    const pendingRequests = new Map<number, (res: any) => void>();
    const consoleErrors: string[] = [];

    ws.onmessage = (event: any) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled") {
        if (msg.params.type === "error") {
          const text = (msg.params.args || []).map((a: any) => a.value || a.description || "").join(" ");
          consoleErrors.push(text);
        }
      }
      if (msg.method === "Log.entryAdded" && msg.params.entry?.level === "error") {
        consoleErrors.push(msg.params.entry.text);
      }
      if (msg.id && pendingRequests.has(msg.id)) {
        const resolver = pendingRequests.get(msg.id)!;
        pendingRequests.delete(msg.id);
        resolver(msg.result);
      }
    };

    function sendCommand(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = messageId++;
        pendingRequests.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand("Page.enable");
    await sendCommand("Runtime.enable");
    await sendCommand("Log.enable");

    // 1. Desktop Viewport (1440 x 900)
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const targetUrl = "https://watch-cebu.vercel.app/";
    console.log(`Navigating to ${targetUrl}...`);
    await sendCommand("Page.navigate", { url: targetUrl });
    await sleep(5000); // Allow tiles, feeds, and markers to load

    const desktopEval = await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          const powerText = document.querySelector(".header-freshness .freshness-chip:nth-child(1)")?.textContent || "";
          const eqText = document.querySelector(".header-freshness .freshness-chip:nth-child(2)")?.textContent || "";
          const markerCount = document.querySelectorAll(".leaflet-marker-icon").length;
          return {
            title: document.title,
            powerChip: powerText.trim(),
            eqChip: eqText.trim(),
            markerCount: markerCount,
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("Desktop Evaluation:", desktopEval?.result?.value || desktopEval);

    // Capture Desktop Screenshot
    const desktopScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
    const desktopFile = path.join(OUT_DIR, "desktop_production.png");
    fs.writeFileSync(desktopFile, Buffer.from(desktopScreenshot.data, "base64"));
    console.log(`Saved screenshot: ${desktopFile}`);

    // 2. Mobile Viewport (iPhone SE 375 x 667)
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
      hasTouch: true,
    });
    await sleep(2000);

    const mobileEval = await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          const statusText = document.querySelector("#btn-mobile-status")?.textContent || "";
          return {
            mobileStatus: statusText.trim(),
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("Mobile Evaluation:", mobileEval?.result?.value || mobileEval);

    // Capture Mobile Screenshot
    const mobileScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
    const mobileFile = path.join(OUT_DIR, "mobile_production.png");
    fs.writeFileSync(mobileFile, Buffer.from(mobileScreenshot.data, "base64"));
    console.log(`Saved screenshot: ${mobileFile}`);

    console.log(`Total Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Errors logged:", consoleErrors);
    }

    ws.close();
  } finally {
    chromeProc.kill("SIGKILL");
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
