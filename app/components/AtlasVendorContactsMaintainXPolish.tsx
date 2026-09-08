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

function removeDuplicateVendorInitial(root: HTMLElement) {
  const sections = Array.from(root.querySelectorAll<HTMLElement>("section"));
  const headerSection = sections.find((section) => {
    const labels = Array.from(section.querySelectorAll<HTMLButtonElement>("button")).map(
      (button) => normalized(button.textContent),
    );
    return labels.includes("add contact") && labels.includes("edit vendor");
  });

  if (!headerSection) return;
  const logo = headerSection.querySelector<HTMLImageElement>('img[alt$=" logo"]');
  if (!logo) return;

  const logoBox = logo.parentElement;
  if (!(logoBox instanceof HTMLElement)) return;
  const logoRect = logoBox.getBoundingClientRect();

  for (const candidate of Array.from(headerSection.querySelectorAll<HTMLElement>("div, span"))) {
    if (candidate === logoBox || candidate.contains(logo) || logoBox.contains(candidate)) continue;
    if (candidate.querySelector("img, h1, h2, h3, h4, button, input, select, textarea, a")) continue;

    const text = String(candidate.textContent || "").trim();
    if (!/^[a-z0-9]{1,2}$/i.test(text)) continue;

    const rect = candidate.getBoundingClientRect();
    const sameRow = Math.abs(rect.top - logoRect.top) <= 18;
    const nextToLogo = rect.left >= logoRect.right - 6 && rect.left <= logoRect.right + 140;
    const boxSized = rect.width >= 28 && rect.width <= 100 && rect.height >= 28 && rect.height <= 100;

    if (sameRow && nextToLogo && boxSized) {
      candidate.classList.add("atlas-vendor-duplicate-initial-hidden");
      candidate.style.setProperty("display", "none", "important");
      candidate.setAttribute("aria-hidden", "true");
    }
  }
}

function compactVendorHeader(root: HTMLElement) {
  const listPanel = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const addVendorButton = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add vendor",
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

  if (header && header !== root) {
    header.classList.add("atlas-vendor-shared-header-hidden");
    header.style.setProperty("display", "none", "important");
    header.style.setProperty("margin", "0", "important");
    header.style.setProperty("padding", "0", "important");
    header.style.setProperty("min-height", "0", "important");
    header.style.setProperty("height", "0", "important");
  }

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

function removeRedundantVendorDetailLabels(root: HTMLElement) {
  for (const node of Array.from(root.querySelectorAll<HTMLElement>("div, strong, span"))) {
    const text = normalized(node.textContent);
    if (text === "vendor information" || text === "company details" || text === "vendor details") {
      node.style.setProperty("display", "none", "important");
      node.setAttribute("aria-hidden", "true");
    }
  }

  for (const container of Array.from(root.querySelectorAll<HTMLElement>("div"))) {
    if (container.children.length !== 1) continue;
    const onlyChild = container.firstElementChild;
    if (!(onlyChild instanceof HTMLElement)) continue;
    if (onlyChild.getAttribute("aria-hidden") === "true") {
      container.style.setProperty("display", "none", "important");
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
  compactVendorHeader(root);
  removeDuplicateVendorInitial(root);
  removeRedundantVendorDetailLabels(root);
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
      if (label !== "contact for" && label !== "contact type") return;

      event.preventDefault();
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
      attributeFilter: ["class", "style", "hidden"],
    });

    document.addEventListener("change", isolateContactSelectChange);
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", isolateContactSelectChange);
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

      .atlas-vendor-shared-header-hidden,
      .atlas-vendor-duplicate-initial-hidden {
        display: none !important;
      }
    `}</style>
  );
}
