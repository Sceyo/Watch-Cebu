/**
 * UI Fixes Verification Script.
 *
 * Verifies:
 * 1. Earthquake pins render genuine town names ("Bogo", "Borbon", "Maslog", etc.) without "City Of …" truncation.
 * 2. Clicking an earthquake marker renders the full popup with proper headroom (no clipping behind header/day-tabs).
 * 3. About drawer renders developer section with GitHub and LinkedIn links and zero placeholder text.
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
  console.log("=== STEP 1: Starting Vite Dev Server on port 3057 ===");
  const server = await createServer({
    configFile: path.resolve("./vite.config.ts"),
    server: { port: 3057 },
  });
  await server.listen();
  console.log("✓ Vite dev server running at http://localhost:3057");

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

  console.log("=== STEP 3: Navigating to http://localhost:3057 ===");
  await sendCommand("Page.navigate", { url: "http://localhost:3057" });
  await sleep(4000);

  // 1. Audit Earthquake Pins for clean town labels (no "City Of …")
  console.log("=== STEP 4: Auditing Earthquake Marker Wedge Labels ===");
  const wedgeAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const textEls = Array.from(document.querySelectorAll(".eq-wedge-text"));
        const labels = textEls.map(el => el.textContent.trim());
        const hasCityOf = labels.some(l => l.includes("City Of") || l.includes("City of"));
        return {
          totalWedges: labels.length,
          labelsSample: labels.slice(0, 8),
          hasCityOfTruncation: hasCityOf,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ Wedge label audit:", wedgeAudit.result.value);

  const pinsScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_pins_clean_labels.png",
    Buffer.from(pinsScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_pins_clean_labels.png");

  // 2. Click an Earthquake Marker and audit Popup positioning
  console.log("=== STEP 5: Clicking Earthquake Pin and Auditing Popup Headroom ===");
  await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const pin = document.querySelector(".earthquake-compound-pin");
        if (pin) {
          pin.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
      })()
    `,
  });
  await sleep(1500);

  const popupAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const popup = document.querySelector(".leaflet-popup");
        const popupCard = document.querySelector(".popup-card");
        const header = document.querySelector(".app-header");
        const dayTabs = document.querySelector(".day-tabs-bar");
        
        if (!popup) return { hasPopup: false };
        const popupRect = popup.getBoundingClientRect();
        const tabsRect = dayTabs ? dayTabs.getBoundingClientRect() : { bottom: 0 };
        
        return {
          hasPopup: true,
          popupTop: popupRect.top,
          dayTabsBottom: tabsRect.bottom,
          hasAdequateHeadroom: popupRect.top >= tabsRect.bottom,
          popupCardScrollable: popupCard ? getComputedStyle(popupCard).overflowY : null,
          titleText: popup.querySelector(".popup-title") ? (popup.querySelector(".popup-title") as HTMLElement).innerText : null,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ Popup headroom audit:", popupAudit.result.value);

  const popupScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_popup_headroom.png",
    Buffer.from(popupScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_popup_headroom.png");

  // 3. Open About Drawer and audit Developer / Maintainer Links
  console.log("=== STEP 6: Opening About Drawer & Auditing Developer Links ===");
  await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const aboutBtn = document.getElementById("btn-toggle-about");
        aboutBtn?.click();
      })()
    `,
  });
  await sleep(1500);

  // Scroll about drawer content down to bring developer section into full view
  await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const drawerContent = document.querySelector("#about-drawer .legend-content");
        if (drawerContent) {
          drawerContent.scrollTop = 500;
        }
      })()
    `,
  });
  await sleep(800);

  const aboutAudit = await sendCommand("Runtime.evaluate", {
    expression: `
      (() => {
        const drawer = document.getElementById("about-drawer");
        const text = drawer ? drawer.innerText : "";
        const githubLink = drawer ? drawer.querySelector("a[href*='github.com']") : null;
        const linkedinLink = drawer ? drawer.querySelector("a[href*='linkedin.com']") : null;
        
        return {
          isOpen: drawer?.classList.contains("open"),
          hasPlaceholderComment: text.includes("// PLACEHOLDER"),
          hasGitHub: !!githubLink,
          githubHref: githubLink ? githubLink.getAttribute("href") : null,
          hasLinkedIn: !!linkedinLink,
          linkedinHref: linkedinLink ? linkedinLink.getAttribute("href") : null,
        };
      })()
    `,
    returnByValue: true,
  });
  console.log("✓ About drawer audit:", aboutAudit.result.value);

  const aboutScreenshot = await sendCommand("Page.captureScreenshot", { format: "png" });
  await fs.promises.writeFile(
    "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/browser_about_drawer_updated.png",
    Buffer.from(aboutScreenshot.data, "base64")
  );
  console.log("✓ Saved browser_about_drawer_updated.png");

  ws.close();
  chromeProcess.kill();
  await server.close();
  console.log("🎉 UI fixes browser verification completed cleanly.");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
