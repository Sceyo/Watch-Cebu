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

    ws.addEventListener("message", (event: any) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled") {
        console.log("[Browser Console]", ...msg.params.args.map((a: any) => a.value || a.description));
      }
    });

    // Pre-seed localStorage so welcome guide is not open
    await sendCommand("Page.addScriptToEvaluateOnNewDocument", {
      source: `localStorage.setItem("watch_cebu_welcome_seen", "1");`,
    });

    console.log("=== Navigating to http://localhost:3000/ ===");
    await sendCommand("Page.navigate", { url: "http://localhost:3000/" });
    await sleep(3000);

    // Dismiss welcome modal
    console.log("=== Checking welcome modal ===");
    const welcomeRes = await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          localStorage.setItem("cebu_watch_welcome_seen", "true");
          const btn = document.getElementById("btn-welcome-explore") || document.getElementById("btn-welcome-close");
          if (btn) {
            btn.click();
            return "Clicked welcome explore button";
          }
          const modal = document.getElementById("welcome-modal-container");
          if (modal) {
            modal.style.display = "none";
            return "Hid welcome modal directly";
          }
          return "No welcome modal found";
        })()
      `,
    });
    console.log("Welcome dismiss result:", welcomeRes?.result?.value);
    await sleep(800);

    // Click List View toggle button
    console.log("=== Clicking List View toggle ===");
    const toggleRes = await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          const listBtn = document.getElementById("btn-toggle-view-mode");
          if (!listBtn) return "No btn-toggle-view-mode found. Found buttons: " + Array.from(document.querySelectorAll("button")).map(b => b.id || b.className).join(", ");
          listBtn.click();
          return "Clicked btn-toggle-view-mode";
        })()
      `,
    });
    console.log("Toggle view result:", toggleRes?.result?.value);
    await sleep(1500);

    // Find Ward II View on Map button and click it
    console.log("=== Finding and clicking Ward II 'View on Map' button ===");
    const clickRes = await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll(".list-advisory-card"));
          const card = cards.find(c => c.textContent.includes("Ward II") || c.textContent.includes("Ward 2") || c.textContent.includes("Calajo-an"));
          if (card) {
            const btn = card.querySelector(".btn-locate-advisory");
            if (btn) {
              btn.click();
              return "Clicked locate button in card: " + card.querySelector(".card-barangay-title")?.textContent;
            }
            return "No locate button in card";
          }
          return "No Ward II / Calajo-an card found among " + cards.length + " cards.";
        })()
      `,
    });
    console.log("Click result:", clickRes?.result?.value);

    // Wait for pan/zoom
    await sleep(2000);

    // Query leaflet map center, zoom, popup position, marker position
    const mapInfo = await sendCommand("Runtime.evaluate", {
      expression: `
        (() => {
          const popup = document.querySelector(".leaflet-popup");
          let popupRect = null;
          if (popup) {
            const r = popup.getBoundingClientRect();
            popupRect = { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
          }
          const markers = Array.from(document.querySelectorAll(".power-pin"));
          const markerPositions = markers.map(m => {
            const r = m.getBoundingClientRect();
            return { top: Math.round(r.top), left: Math.round(r.left) };
          });
          return {
            windowSize: { w: window.innerWidth, h: window.innerHeight },
            popupRect,
            markerCount: markers.length,
            // Marker closest to popup bottom tip
            markerUnderPopup: markerPositions.find(m => popupRect && Math.abs(m.left + 14 - (popupRect.left + popupRect.width / 2)) < 30)
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("Layout Info:", JSON.stringify(mapInfo?.result?.value, null, 2));

    // Capture screenshot
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
