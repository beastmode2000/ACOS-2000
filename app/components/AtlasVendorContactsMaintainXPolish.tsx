"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleVendorMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(
    (node) => normalized(node.textContent) === "vendors",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function labelForSelect(select: HTMLSelectElement) {
  const label = select.closest("label");
  if (!label) return "";
  const span = label.querySelector<HTMLElement>(":scope > span");
  return normalized(span?.textContent || label.textContent);
}

function hideElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) return;
  element.classList.add("atlas-vendor-force-hidden");
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("width", "0", "important");
  element.style.setProperty("min-width", "0", "important");
  element.style.setProperty("max-width", "0", "important");
  element.style.setProperty("height", "0", "important");
  element.style.setProperty("min-height", "0", "important");
  element.style.setProperty("max-height", "0", "important");
  element.style.setProperty("margin", "0", "important");
  element.style.setProperty("padding", "0", "important");
  element.style.setProperty("border", "0", "important");
  element.style.setProperty("overflow", "hidden", "important");
  element.setAttribute("aria-hidden", "true");
}

function removeDuplicateVendorInitial(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;

  const logo = detailPanel.querySelector<HTMLImageElement>('img[alt$=" logo"]');
  if (!logo) return;

  const vendorName = String(logo.alt || "").replace(/\s+logo$/i, "").trim();
  const expectedInitials = vendorName.slice(0, 2).toLowerCase();

  const logoRect = logo.getBoundingClientRect();

  for (const candidate of Array.from(detailPanel.querySelectorAll<HTMLElement>("div, span"))) {
    if (candidate === logo || candidate.contains(logo) || logo.contains(candidate)) continue;
    if (candidate.querySelector("img, h1, h2, h3, h4, button, input, select, textarea, a")) continue;

    const text = String(candidate.textContent || "").trim().toLowerCase();
    if (!/^[a-z0-9]{1,2}$/i.test(text)) continue;

    const rect = candidate.getBoundingClientRect();
    const exactInitials = Boolean(expectedInitials) && text === expectedInitials;
    const smallBox = rect.width >= 28 && rect.width <= 110 && rect.height >= 28 && rect.height <= 110;
    const nearLogo =
      Math.abs(rect.top - logoRect.top) <= 28 &&
      rect.left >= logoRect.left - 8 &&
      rect.left <= logoRect.right + 180;

    if (exactInitials || (smallBox && nearLogo)) hideElement(candidate);
  }
}

function compactVendorHeader(root: HTMLElement) {
  const listPanel = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const addVendorButton = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add vendor" && !button.classList.contains("atlas-vendor-add-proxy"),
  );

  if (!listPanel || !detailPanel || !addVendorButton) return;

  let header: HTMLElement | null = addVendorButton.parentElement;
  while (header && header !== root) {
    const next = header.nextElementSibling;
    if (
      next instanceof HTMLElement &&
      next.contains(listPanel) &&
      next.contains(detailPanel)
    ) {
      break;
    }
    header = header.parentElement;
  }

  if (header && header !== root) hideElement(header);

  const search = listPanel.querySelector<HTMLInputElement>('input[type="search"]');
  if (!search) return;

  const sticky = search.parentElement;
  if (!(sticky instanceof HTMLElement)) return;

  let actionRow = Array.from(sticky.querySelectorAll<HTMLElement>("div")).find((candidate) => {
    const text = normalized(candidate.textContent);
    return /\bvendor\b/.test(text) || /\bvendors\b/.test(text);
  });

  if (!actionRow) actionRow = sticky;

  let proxy = actionRow.querySelector<HTMLButtonElement>(".atlas-vendor-add-proxy");
  if (!proxy) {
    proxy = document.createElement("button");
    proxy.type = "button";
    proxy.className = "atlas-vendor-add-proxy";
    proxy.textContent = "Add Vendor";
    proxy.setAttribute("aria-label", "Add Vendor");
    proxy.addEventListener("click", () => addVendorButton.click());
    actionRow.appendChild(proxy);
  }
}

function extendVendorPanels(root: HTMLElement) {
  if (window.matchMedia("(max-width: 899px)").matches) return;

  const listPanel = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!listPanel || !detailPanel) return;

  const grid = listPanel.parentElement;
  if (!(grid instanceof HTMLElement) || !grid.contains(detailPanel)) return;

  const top = Math.min(listPanel.getBoundingClientRect().top, detailPanel.getBoundingClientRect().top);
  const height = Math.max(520, Math.floor(window.innerHeight - top - 18));
  const heightValue = `${height}px`;

  grid.classList.add("atlas-vendor-full-height-grid");
  grid.style.setProperty("height", heightValue, "important");
  grid.style.setProperty("min-height", heightValue, "important");
  grid.style.setProperty("max-height", heightValue, "important");
  grid.style.setProperty("align-items", "stretch", "important");

  for (const panel of [listPanel, detailPanel]) {
    panel.style.setProperty("height", "100%", "important");
    panel.style.setProperty("min-height", "0", "important");
    panel.style.setProperty("max-height", "100%", "important");
    panel.style.setProperty("overflow-y", "auto", "important");
  }

  const shell = grid.closest("section");
  if (shell instanceof HTMLElement) {
    shell.style.setProperty("min-height", `${height + 18}px`, "important");
    shell.style.setProperty("height", "auto", "important");
    shell.style.setProperty("padding-bottom", "10px", "important");
  }
}

function removeRedundantVendorDetailLabels(root: HTMLElement) {
  for (const node of Array.from(root.querySelectorAll<HTMLElement>("div, strong, span"))) {
    const text = normalized(node.textContent);
    if (text === "vendor information" || text === "company details" || text === "vendor details") {
      hideElement(node);
    }
  }
}

function cleanVendorInfoCard(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;
  detailPanel.classList.add("atlas-vendor-detail-clean");

  const detailContent = detailPanel.querySelector<HTMLElement>(".atlas-record-detail-content");
  detailContent?.classList.add("atlas-vendor-detail-content-clean");

  for (const section of Array.from(detailPanel.querySelectorAll<HTMLElement>("section"))) {
    const text = normalized(section.textContent);
    if (text.includes("service visit history") && text.includes("0 completed visits")) {
      const meaningfulRows = Array.from(section.querySelectorAll<HTMLElement>("button, a"))
        .filter((node) => normalized(node.textContent) && normalized(node.textContent) !== "add");
      if (!meaningfulRows.length) hideElement(section);
    }
  }
}

function renameContactType(root: ParentNode) {
  for (const select of Array.from(root.querySelectorAll<HTMLSelectElement>("select"))) {
    const label = select.closest("label");
    if (!label) continue;
    const span = label.querySelector<HTMLElement>(":scope > span");
    if (!span) continue;
    if (normalized(span.textContent) === "contact type") {
      span.textContent = "Contact For";
      select.setAttribute("aria-label", "Contact For");
    }
  }
}

function polishVendorPage() {
  const root = visibleVendorMain();
  if (!root) return;
  root.classList.add("atlas-vendors-polished");
  compactVendorHeader(root);
  extendVendorPanels(root);
  removeDuplicateVendorInitial(root);
  removeRedundantVendorDetailLabels(root);
  cleanVendorInfoCard(root);
  renameContactType(root);

  for (const dialog of Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))) {
    renameContactType(dialog);
  }
}

export default function AtlasVendorContactsMaintainXPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        polishVendorPage();
      });
    };

    const isolateContactSelectChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (!target.closest('[role="dialog"]')) return;

      const label = labelForSelect(target);
      if (
        label !== "contact for" &&
        label !== "contact type" &&
        label !== "preferred contact"
      ) return;

      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      schedule();
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["class", "style", "hidden", "src", "alt"],
    });

    // Stop vendor-contact select changes at <body>, after React has handled the
    // controlled select but before older document-level Atlas change listeners
    // can interpret the change as navigation and send the app to a 404 route.
    document.body.addEventListener("change", isolateContactSelectChange);
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.body.removeEventListener("change", isolateContactSelectChange);
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-add-proxy {
        border: 1px solid #c99a3d !important;
        background: #c99a3d !important;
        color: #0b1e33 !important;
        border-radius: 9px !important;
        padding: 6px 9px !important;
        min-height: 30px !important;
        font: inherit !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        margin-left: auto !important;
      }

      .atlas-vendor-force-hidden {
        display: none !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-clean {
        padding: 10px !important;
        border-radius: 16px !important;
        box-shadow: none !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-content-clean {
        display: grid !important;
        gap: 9px !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-clean section {
        padding: 11px !important;
        border-radius: 12px !important;
        box-shadow: none !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-clean section > div {
        row-gap: 7px !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-clean h2,
      .atlas-vendors-polished .atlas-vendor-detail-clean h3,
      .atlas-vendors-polished .atlas-vendor-detail-clean h4,
      .atlas-vendors-polished .atlas-vendor-detail-clean p {
        margin-top: 0 !important;
        margin-bottom: 5px !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-clean button {
        min-height: 34px;
      }

      @media (max-width: 899px) {
        .atlas-vendors-polished .atlas-vendor-detail-clean {
          padding: 8px !important;
        }
      }
    `}</style>
  );
}
