"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === normalized(title),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function markAssetListSelection() {
  const root = pageMain("Assets");
  if (!root) return;

  const listRoot =
    root.querySelector<HTMLElement>(".atlas-assets-native-list-panel") ||
    root.querySelector<HTMLElement>(".atlas-assets-viewport-list");
  if (!listRoot) return;

  const detailTitle = normalized(
    root.querySelector<HTMLElement>(
      ".atlas-assets-viewport-detail h2, .atlas-assets-viewport-detail h3, .atlas-asset-reference-drawer h2, .atlas-asset-reference-drawer h3",
    )?.textContent,
  );

  for (const card of Array.from(
    listRoot.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"),
  )) {
    const name = normalized(
      card.querySelector<HTMLElement>("button strong")?.textContent,
    );
    const checked = Boolean(
      card.querySelector<HTMLInputElement>('input[type="checkbox"]:checked'),
    );
    const current = Boolean(detailTitle && name && name === detailTitle);

    card.classList.add("atlas-asset-list-card-polished");
    card.classList.toggle("atlas-asset-list-card-current", current);
    card.classList.toggle("atlas-asset-list-card-bulk-selected", checked && !current);
  }
}

function findAssetSelect(panel: HTMLElement) {
  const selects = Array.from(panel.querySelectorAll<HTMLSelectElement>("select"));

  const byOption = selects.find((select) => {
    const optionText = Array.from(select.options).map((option) =>
      normalized(option.textContent),
    );
    return optionText.some((value) =>
      ["no asset", "select asset", "choose asset", "asset"].includes(value),
    );
  });
  if (byOption) return byOption;

  for (const select of selects) {
    let node: HTMLElement | null = select.parentElement;
    for (let depth = 0; node && depth < 4; depth += 1) {
      const labels = Array.from(
        node.querySelectorAll<HTMLElement>("label, span, strong"),
      );
      if (labels.some((label) => normalized(label.textContent) === "asset")) {
        return select;
      }
      node = node.parentElement;
    }
  }

  return null;
}

function annualSubject(title: string) {
  return normalized(title)
    .replace(/\bannual\b/g, " ")
    .replace(/\byearly\b/g, " ")
    .replace(/\bservice\b/g, " ")
    .replace(/\bmaintenance\b/g, " ")
    .replace(/\bpreventive\b/g, " ")
    .replace(/\bpreventative\b/g, " ")
    .replace(/\binspection\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function suggestedAssetOption(
  select: HTMLSelectElement,
  title: string,
) {
  if (select.value) return null;

  const titleText = normalized(title);
  if (!titleText.includes("annual") && !titleText.includes("yearly")) return null;

  const subject = annualSubject(title);
  if (!subject) return null;

  const matches = Array.from(select.options).filter((option) => {
    if (!option.value) return false;
    const label = normalized(option.textContent);
    if (!label) return false;
    return (
      label === subject ||
      label.startsWith(`${subject} `) ||
      subject.startsWith(`${label} `)
    );
  });

  return matches.length === 1 ? matches[0] : null;
}

function syncSelectValue(nativeSelect: HTMLSelectElement, value: string) {
  nativeSelect.value = value;
  nativeSelect.dispatchEvent(new Event("input", { bubbles: true }));
  nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
}

function markWorkAssetLink() {
  const root = pageMain("Work");
  if (!root) return;

  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;

  const nativeSelect = findAssetSelect(panel);
  if (!nativeSelect) return;

  const title =
    panel.querySelector<HTMLElement>("h2")?.textContent?.trim() || "Work Order";
  const summaryCard =
    panel.querySelector<HTMLElement>(".atlas-work-summary-card") ||
    panel.querySelector<HTMLElement>(".atlas-work-summary-header")?.parentElement ||
    panel;

  let host = summaryCard.querySelector<HTMLElement>(
    ":scope > .atlas-work-asset-quick-link",
  );

  if (!host) {
    host = document.createElement("div");
    host.className = "atlas-work-asset-quick-link";

    const label = document.createElement("span");
    label.className = "atlas-work-asset-quick-label";
    label.textContent = "Asset";

    const mirror = document.createElement("select");
    mirror.className = "atlas-work-asset-quick-select";
    mirror.setAttribute("aria-label", "Linked asset");
    mirror.addEventListener("change", () => {
      syncSelectValue(nativeSelect, mirror.value);
    });

    host.append(label, mirror);
    summaryCard.appendChild(host);
  }

  const mirror = host.querySelector<HTMLSelectElement>(
    ".atlas-work-asset-quick-select",
  );
  if (!mirror) return;

  const signature = Array.from(nativeSelect.options)
    .map((option) => `${option.value}:${option.textContent || ""}`)
    .join("|");

  if (mirror.dataset.optionsSignature !== signature) {
    mirror.innerHTML = "";
    for (const option of Array.from(nativeSelect.options)) {
      mirror.appendChild(option.cloneNode(true));
    }
    mirror.dataset.optionsSignature = signature;
  }
  mirror.value = nativeSelect.value;

  host.querySelector(".atlas-work-asset-suggestion")?.remove();
  const suggestion = suggestedAssetOption(nativeSelect, title);
  if (suggestion) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "atlas-work-asset-suggestion";
    button.textContent = `Suggested: ${suggestion.textContent || "asset"}`;
    button.addEventListener("click", () => {
      mirror.value = suggestion.value;
      syncSelectValue(nativeSelect, suggestion.value);
    });
    host.appendChild(button);
  }
}

function applyPolish() {
  markAssetListSelection();
  markWorkAssetLink();
}

export default function AtlasServiceLinkPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyPolish();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-assets-viewport-root .atlas-asset-list-card-polished {
        border-color: #d8e1eb !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-card-current {
        border-color: #175cd3 !important;
        background: #f4f8fd !important;
        box-shadow: 0 0 0 1px rgba(23, 92, 211, 0.14) !important;
      }

      .atlas-assets-viewport-root .atlas-asset-list-card-bulk-selected {
        border-color: #c99a3d !important;
        background: #fff9e8 !important;
      }

      .atlas-work-asset-quick-link {
        margin-top: 10px !important;
        padding: 10px 12px !important;
        border: 1px solid #d8e1eb !important;
        border-radius: 10px !important;
        background: #f8fafc !important;
        display: grid !important;
        grid-template-columns: auto minmax(180px, 1fr) auto !important;
        gap: 8px !important;
        align-items: center !important;
      }

      .atlas-work-asset-quick-label {
        color: #52677e !important;
        font-size: 12px !important;
        font-weight: 700 !important;
      }

      .atlas-work-asset-quick-select {
        width: 100% !important;
        min-width: 0 !important;
        height: 34px !important;
        border: 1px solid #cfd9e4 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        padding: 5px 8px !important;
        font-size: 13px !important;
        color: #17212b !important;
      }

      .atlas-work-asset-suggestion {
        min-height: 32px !important;
        border: 1px solid #175cd3 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        color: #175cd3 !important;
        padding: 5px 9px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
      }

      @media (max-width: 900px) {
        .atlas-work-asset-quick-link {
          grid-template-columns: 1fr !important;
          gap: 6px !important;
        }

        .atlas-work-asset-quick-select {
          min-height: 40px !important;
          height: 40px !important;
          font-size: 16px !important;
        }

        .atlas-work-asset-suggestion {
          width: 100% !important;
          min-height: 40px !important;
          white-space: normal !important;
        }
      }
    `}</style>
  );
}
