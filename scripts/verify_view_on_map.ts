import { spawn } from "child_process";
import http from "http";
import path from "path";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9225;
const SCREENSHOT_PATH = path.resolve(
  "C:/Users/francis/.gemini/antigravity/brain/830a731e-0ea8-498a-b92e-e1401cdc4f8e/current_view_on_map.png"
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
  console.log("=== Launching Chrome with CDP on port", CDP_PORT);
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

  try {
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

    await sendCommand("Page.addScriptToEvaluateOnNewDocument", {
      source: `localStorage.setItem("watch_cebu_welcome_seen", "1");`,
    });

    console.log("=== Navigating to http://localhost:3000/ ===");
    await sendCommand("Page.navigate", { url: "http://localhost:3000/" });
    await sleep(3500);

    // Dismiss welcome modal if present
    await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = document.getElementById("btn-welcome-explore") || document.getElementById("btn-welcome-close");
          if (btn) btn.click();
          const modal = document.getElementById("welcome-modal-container");
          if (modal) modal.style.display = "none";
        })()
      `,
    });
    await sleep(500);

    const targetsToTest = ["Mohon", "Calajo-an", "Ward I", "Mabolo"];

    for (const targetName of targetsToTest) {
      console.log(`\n--- Testing View on Map for: ${targetName} ---`);
      // Ensure we are in List View
      await sendCommand("Runtime.evaluate", {
        expression: `
          (() => {
            const listEl = document.getElementById("list-view-container");
            if (!listEl || listEl.style.display === "none") {
              const listBtn = document.getElementById("btn-toggle-view-mode");
              if (listBtn) listBtn.click();
            }
          })()
        `,
      });
      await sleep(800);

      // Click View on Map for targetName
      const clickRes = await sendCommand("Runtime.evaluate", {
        expression: `
          (() => {
            const cards = Array.from(document.querySelectorAll(".list-advisory-card"));
            const card = cards.find(c => {
              const title = c.querySelector(".card-barangay-title")?.textContent || "";
              return title.includes(${JSON.stringify(targetName)});
            });
            if (card) {
              const btn = card.querySelector(".btn-locate-advisory");
              if (btn) {
                btn.click();
                return "Clicked locate button for: " + card.querySelector(".card-barangay-title")?.textContent;
              }
              return "No locate button in card";
            }
            return "Card not found for " + ${JSON.stringify(targetName)} + " among " + cards.length + " cards";
          })()
        `,
      });
      console.log("Click result:", clickRes?.result?.value);

      await sleep(1000);

      const mapInfo = await sendCommand("Runtime.evaluate", {
        expression: `
          (() => {
            const popup = document.querySelector(".leaflet-popup");
            let popupRect = null;
            let popupTitle = null;
            if (popup) {
              const r = popup.getBoundingClientRect();
              popupRect = {
                top: Math.round(r.top),
                left: Math.round(r.left),
                width: Math.round(r.width),
                height: Math.round(r.height),
                centerX: Math.round(r.left + r.width / 2),
              };
              popupTitle = popup.querySelector(".popup-title")?.textContent?.trim() || null;
            }
            const markers = Array.from(document.querySelectorAll(".power-pin")).map(m => {
              const r = m.getBoundingClientRect();
              return { left: Math.round(r.left), top: Math.round(r.top) };
            });
            return {
              windowCenterX: Math.round(window.innerWidth / 2),
              popupTitle,
              popupRect,
              visibleMarkers: markers.filter(m => m.left >= 0 && m.left <= window.innerWidth && m.top >= 0 && m.top <= window.innerHeight),
            };
          })()
        `,
        returnByValue: true,
      });
      console.log(`Result for ${targetName}:`, JSON.stringify(mapInfo?.result?.value));
    }

    // Capture screenshot after the sequence
    const shot = await sendCommand("Page.captureScreenshot", { format: "png" });
    if (shot && shot.data) {
      fs.writeFileSync(SCREENSHOT_PATH, Buffer.from(shot.data, "base64"));
      console.log("✓ Screenshot saved to:", SCREENSHOT_PATH);
    }
  } finally {
    chromeProcess.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
