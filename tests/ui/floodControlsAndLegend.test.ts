import { describe, it, expect, vi } from "vitest";
import { renderMapControls } from "../../src/ui/components/mapControls.js";
import { renderLegend } from "../../src/ui/components/legend.js";

function createMockElement(): any {
  const listeners: Record<string, ((...args: any[]) => void)[]> = {};
  const attrs: Record<string, string> = {};
  const classListSet = new Set<string>();
  const childrenMap: Record<string, any> = {};
  let innerHTMLValue = "";

  const elem: any = {
    className: "",
    style: {},
    classList: {
      add: (cls: string) => classListSet.add(cls),
      remove: (cls: string) => classListSet.delete(cls),
      contains: (cls: string) => classListSet.has(cls),
      toggle: (cls: string, force?: boolean) => {
        const next = force !== undefined ? force : !classListSet.has(cls);
        if (next) classListSet.add(cls);
        else classListSet.delete(cls);
        return next;
      },
    },
    get innerHTML() {
      return innerHTMLValue;
    },
    set innerHTML(val: string) {
      innerHTMLValue = val;
    },
    setAttribute: vi.fn((k: string, v: string) => {
      attrs[k] = v;
    }),
    getAttribute: vi.fn((k: string) => attrs[k] ?? null),
    addEventListener: vi.fn((event: string, handler: any) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    click: vi.fn(() => {
      listeners["click"]?.forEach((fn) => fn({ preventDefault: () => {}, stopPropagation: () => {} }));
    }),
    querySelector: vi.fn((sel: string) => {
      const key = sel.replace(/^[#.]/, "");
      if (innerHTMLValue.includes(key)) {
        if (!childrenMap[key]) {
          childrenMap[key] = createMockElement();
        }
        return childrenMap[key];
      }
      return null;
    }),
    querySelectorAll: vi.fn((_sel: string) => {
      return [];
    }),
  };
  return elem;
}

describe("Flood Hazard Map Toggle & Legend Integration", () => {
  it("renders #btn-toggle-flood-hazard with aria-pressed state and fires onFloodHazardToggle", () => {
    const container = createMockElement();
    const onFloodHazardToggle = vi.fn();

    renderMapControls(
      container,
      "both",
      {
        onSearchChange: vi.fn(),
        onLocateUser: vi.fn(),
        onLayerChange: vi.fn(),
        onToast: vi.fn(),
        onFloodHazardToggle,
      },
      { isFloodHazardActive: true }
    );

    expect(container.innerHTML).toContain('id="btn-toggle-flood-hazard"');
    expect(container.innerHTML).toContain('aria-pressed="true"');
    expect(container.innerHTML).toContain("Flood Risk");

    const btn = container.querySelector("#btn-toggle-flood-hazard");
    expect(btn).not.toBeNull();
    btn?.click();
    expect(onFloodHazardToggle).toHaveBeenCalledTimes(1);
  });

  it("renders Project NOAH 100-year flood susceptibility tiers and ODC-ODbL attribution in Legend", () => {
    const container = createMockElement();
    renderLegend(container, true, vi.fn());

    expect(container.innerHTML).toContain("Project NOAH");
    expect(container.innerHTML).toContain("Low Hazard (0 – 0.5m)");
    expect(container.innerHTML).toContain("Medium Hazard (0.5 – 1.5m)");
    expect(container.innerHTML).toContain("High Hazard (&gt; 1.5m)");
    expect(container.innerHTML).toContain("ODC-ODbL");
  });
});
