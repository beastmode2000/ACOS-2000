"use client";

import { useEffect } from "react";

function text(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function closePanel(panel: HTMLElement) {
  panel.classList.remove("atlas-dropdown-panel-open");
  panel.classList.add("atlas-dropdown-panel-closed");
  const button = panel.previousElementSibling as HTMLButtonElement | null;
  if (button?.dataset.atlasDropdownToggle === "true") button.setAttribute("aria-expanded", "false");
}

function openPanel(panel: HTMLElement) {
  document.querySelectorAll<HTMLElement>(".atlas-dropdown-panel-open").forEach((other) => {
    if (other !== panel) closePanel(other);
  });
  panel.classList.remove("atlas-dropdown-panel-closed");
  panel.classList.add("atlas-dropdown-panel-open");
  const button = panel.previousElementSibling as HTMLButtonElement | null;
  if (button?.dataset.atlasDropdownToggle === "true") button.setAttribute("aria-expanded", "true");
}

export default function AtlasDropdownDismissBehavior() {
  useEffect(() => {
    let frame = 0;

    const scan = () => {
      frame = 0;

      // Asset Locations is a custom checkbox picker rather than a native select.
      // Turn it into a true dismissible dropdown without changing its saved data behavior.
      document.querySelectorAll<HTMLElement>(".atlas-asset-drawer").forEach((drawer) => {
        const candidates = Array.from(drawer.querySelectorAll<HTMLElement>("div"));
        const locationsItem = candidates.find((node) => {
          const firstSpan = Array.from(node.children).find((child) => child.tagName === "SPAN") as HTMLElement | undefined;
          if (!firstSpan || text(firstSpan.textContent) !== "locations") return false;
          return node.querySelectorAll('input[type="checkbox"]').length >= 2;
        });
        if (!locationsItem) return;

        const checkboxes = Array.from(locationsItem.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
        const first = checkboxes[0];
        const panel = first?.closest("label")?.parentElement as HTMLElement | null;
        if (!panel || panel.dataset.atlasDropdownPanel === "true") return;

        panel.dataset.atlasDropdownPanel = "true";
        panel.classList.add("atlas-dropdown-panel-closed");

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.dataset.atlasDropdownToggle = "true";
        toggle.setAttribute("aria-expanded", "false");
        toggle.className = "atlas-dropdown-toggle";

        const refreshLabel = () => {
          const selected = Array.from(panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).length;
          toggle.textContent = selected ? `Choose locations (${selected} selected)` : "Choose locations";
        };
        refreshLabel();

        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (panel.classList.contains("atlas-dropdown-panel-open")) closePanel(panel);
          else openPanel(panel);
        });

        panel.addEventListener("change", (event) => {
          if (!(event.target instanceof HTMLInputElement) || event.target.type !== "checkbox") return;
          window.setTimeout(() => {
            refreshLabel();
            closePanel(panel);
          }, 0);
        });

        panel.parentElement?.insertBefore(toggle, panel);
      });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(scan);
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      document.querySelectorAll<HTMLElement>(".atlas-dropdown-panel-open").forEach((panel) => {
        const toggle = panel.previousElementSibling;
        if (panel.contains(target) || toggle?.contains(target)) return;
        closePanel(panel);
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll<HTMLElement>(".atlas-dropdown-panel-open").forEach(closePanel);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-dropdown-panel-closed {
        display: none !important;
      }
      .atlas-dropdown-panel-open {
        display: grid !important;
      }
      .atlas-dropdown-toggle {
        width: 100%;
        min-height: 36px;
        box-sizing: border-box;
        border: 1px solid #d9e2ea;
        border-radius: 8px;
        background: #ffffff;
        color: #0a2841;
        padding: 7px 10px;
        text-align: left;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .atlas-dropdown-toggle::after {
        content: "⌄";
        float: right;
        color: #6b7c8c;
        font-size: 14px;
      }
      .atlas-dropdown-toggle[aria-expanded="true"]::after {
        content: "⌃";
      }
    `}</style>
  );
}
