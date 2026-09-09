"use client";

import { useEffect } from "react";

type VendorTab = "contacts" | "assets" | "work" | "documents" | "photos";

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
    if (candidate.contains(logo) || logo.contains(candidate)) continue;
    if (candidate.querySelector("img, h1, h2, h3, h4, button, input, select, textarea, a")) continue;

    const value = String(candidate.textContent || "").trim().toLowerCase();
    if (!/^[a-z0-9]{1,2}$/i.test(value)) continue;

    const rect = candidate.getBoundingClientRect();
    const exactInitials = Boolean(expectedInitials) && value === expectedInitials;
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
    (button) =>
      normalized(button.textContent) === "add vendor" &&
      !button.classList.contains("atlas-vendor-add-proxy"),
  );

  if (!listPanel || !detailPanel || !addVendorButton) return;

  let header: HTMLElement | null = addVendorButton.parentElement;
  while (header && header !== root) {
    const next = header.nextElementSibling;
    if (next instanceof HTMLElement && next.contains(listPanel) && next.contains(detailPanel)) break;
    header = header.parentElement;
  }
  if (header && header !== root) hideElement(header);

  const search = listPanel.querySelector<HTMLInputElement>('input[type="search"]');
  if (!search) return;
  const sticky = search.parentElement;
  if (!(sticky instanceof HTMLElement)) return;

  let actionRow = Array.from(sticky.querySelectorAll<HTMLElement>("div")).find((candidate) => {
    const value = normalized(candidate.textContent);
    return /\bvendor\b/.test(value) || /\bvendors\b/.test(value);
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
}

function removeRedundantVendorDetailLabels(root: HTMLElement) {
  for (const node of Array.from(root.querySelectorAll<HTMLElement>("div, strong, span"))) {
    const value = normalized(node.textContent);
    if (value === "company details" || value === "vendor details") hideElement(node);
  }
}

function cleanVendorInfoCard(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;
  detailPanel.classList.add("atlas-vendor-detail-clean");
  detailPanel
    .querySelector<HTMLElement>(".atlas-record-detail-content")
    ?.classList.add("atlas-vendor-detail-content-clean");
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

function simplifyVendorList(root: HTMLElement) {
  const listPanel = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  if (!listPanel) return;
  listPanel.classList.add("atlas-vendor-simple-list");

  const search = listPanel.querySelector<HTMLInputElement>('input[type="search"]');
  for (const button of Array.from(listPanel.querySelectorAll<HTMLButtonElement>("button"))) {
    if (button === search?.parentElement) continue;
    const strong = button.querySelector<HTMLElement>("strong");
    if (!strong) continue;
    if (normalized(button.textContent) === "clear") continue;

    const identity = strong.closest("div")?.parentElement as HTMLElement | null;
    if (!identity) continue;
    const thumb = identity.firstElementChild as HTMLElement | null;
    if (thumb && thumb !== strong.parentElement) {
      if (thumb.querySelector("img")) {
        thumb.classList.add("atlas-vendor-list-logo");
      } else if (/^[a-z0-9]{1,2}$/i.test(String(thumb.textContent || "").trim())) {
        thumb.classList.add("atlas-vendor-list-placeholder");
      }
    }
    button.classList.add("atlas-vendor-list-row-simple");
  }
}

function classifySection(section: HTMLElement) {
  const value = normalized(section.textContent);
  if (value.includes("vendor information") || (value.includes("main phone") && value.includes("main email"))) {
    return "info";
  }
  if (value.includes("contacts") && (value.includes("active") || value.includes("add contact"))) {
    return "contacts";
  }
  if (value.includes("service visit history")) return "work";
  if (value.includes("related tasks")) return "work";
  if (value.includes("related assets")) return "assets";
  if (value.includes("photos") && (value.includes("attached") || value.includes("add photo") || value.includes("paste image"))) {
    return "photos";
  }
  if (value.includes("documents") || section.getAttribute("aria-label")?.toLowerCase().includes("document")) {
    return "documents";
  }
  if (value.includes("assets") && value.includes("open work") && value.includes("visits")) return "summary";
  return "other";
}

function compactContacts(section: HTMLElement) {
  section.classList.add("atlas-vendor-contacts-section");
  const articles = Array.from(section.querySelectorAll<HTMLElement>("article"));
  if (!articles.length) return;

  const list = articles[0].parentElement;
  if (list) {
    list.classList.add("atlas-vendor-contact-list");
    list.classList.toggle("is-multiple", articles.length > 1);
  }

  for (const article of articles) {
    article.classList.add("atlas-vendor-contact-row");
    const directDivs = Array.from(article.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "DIV",
    );
    directDivs[0]?.classList.add("atlas-vendor-contact-heading");
    for (const div of directDivs.slice(1)) {
      if (div.querySelector('a[href^="tel:"], a[href^="mailto:"]')) {
        div.classList.add("atlas-vendor-contact-methods");
      }
      const inlineStyle = div.getAttribute("style") || "";
      if (inlineStyle.includes("border-top") || inlineStyle.includes("borderTop")) {
        div.classList.add("atlas-vendor-contact-meta-hidden");
      }
    }
  }
}

function createTabHost(detailPanel: HTMLElement, infoSection: HTMLElement) {
  let host = detailPanel.querySelector<HTMLElement>("[data-atlas-vendor-tabs]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.atlasVendorTabs = "true";
    host.className = "atlas-vendor-tabs";
    for (const [key, label] of [
      ["contacts", "Contacts"],
      ["assets", "Assets"],
      ["work", "Work & History"],
      ["documents", "Documents"],
      ["photos", "Photos"],
    ] as Array<[VendorTab, string]>) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.vendorTab = key;
      button.textContent = label;
      button.addEventListener("click", () => {
        detailPanel.dataset.atlasVendorActiveTab = key;
        applyVendorSections(detailPanel);
      });
      host.appendChild(button);
    }
    infoSection.insertAdjacentElement("afterend", host);
  }
  return host;
}

function applyVendorSections(detailPanel: HTMLElement) {
  const editing = Array.from(detailPanel.querySelectorAll<HTMLButtonElement>("button")).some(
    (button) => normalized(button.textContent) === "done",
  );
  const sections = Array.from(detailPanel.querySelectorAll<HTMLElement>("section"));
  const infoSection = sections.find((section) => classifySection(section) === "info");
  if (!infoSection) return;

  const host = createTabHost(detailPanel, infoSection);
  const active = (detailPanel.dataset.atlasVendorActiveTab as VendorTab | undefined) || "contacts";
  detailPanel.dataset.atlasVendorActiveTab = active;
  host.classList.toggle("atlas-vendor-tabs-editing", editing);

  for (const button of Array.from(host.querySelectorAll<HTMLButtonElement>("button"))) {
    button.classList.toggle("is-active", button.dataset.vendorTab === active);
    button.setAttribute("aria-pressed", button.dataset.vendorTab === active ? "true" : "false");
  }

  for (const section of sections) {
    const type = classifySection(section);
    section.classList.remove("atlas-vendor-tab-hidden");
    if (type === "contacts") compactContacts(section);
    if (type === "summary") {
      section.classList.add("atlas-vendor-tab-hidden");
      continue;
    }
    if (editing || type === "info" || type === "other") continue;
    if (type !== active) section.classList.add("atlas-vendor-tab-hidden");
  }
}

function simplifyVendorDetail(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;
  detailPanel.classList.add("atlas-vendor-simplified-detail");
  applyVendorSections(detailPanel);
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
  simplifyVendorList(root);
  simplifyVendorDetail(root);
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
      if (label !== "contact for" && label !== "contact type" && label !== "preferred contact") return;

      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      schedule();
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
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

      .atlas-vendor-force-hidden,
      .atlas-vendor-tab-hidden,
      .atlas-vendor-list-placeholder,
      .atlas-vendor-contact-meta-hidden {
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
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .atlas-vendor-simple-list .atlas-vendor-list-row-simple {
        min-height: 50px !important;
        padding: 7px 9px !important;
        border-radius: 9px !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .atlas-vendor-simple-list .atlas-vendor-list-row-simple:hover,
      .atlas-vendor-simple-list .atlas-vendor-list-row-simple:focus-visible {
        border-color: #c99a3d !important;
        box-shadow: 0 3px 10px rgba(15,42,67,.07) !important;
      }

      .atlas-vendor-simple-list .atlas-vendor-list-logo {
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        border-radius: 8px !important;
      }

      .atlas-vendor-simple-list .atlas-vendor-list-row-simple strong {
        font-size: 12.5px !important;
        line-height: 1.2 !important;
      }

      .atlas-vendor-simple-list .atlas-vendor-list-row-simple p {
        margin: 2px 0 0 !important;
        font-size: 10.5px !important;
      }

      .atlas-vendor-tabs {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        margin: 0;
      }

      .atlas-vendor-tabs button {
        min-width: 0;
        min-height: 36px;
        border: 1px solid #d9e2eb;
        border-radius: 9px;
        background: #fff;
        color: #516174;
        padding: 6px 8px;
        font: inherit;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .atlas-vendor-tabs button:hover,
      .atlas-vendor-tabs button.is-active {
        border-color: #c99a3d;
        background: #fff8e8;
        color: #0b1e33;
      }

      .atlas-vendor-tabs-editing {
        display: none !important;
      }

      .atlas-vendor-contacts-section {
        padding: 10px !important;
      }

      .atlas-vendor-contact-list.is-multiple {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 4px !important;
      }

      .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-row {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(170px, .72fr) !important;
        gap: 8px 14px !important;
        align-items: center !important;
        min-height: 52px !important;
        padding: 7px 9px !important;
        border-radius: 8px !important;
        border-color: #d9e2eb !important;
        box-shadow: none !important;
      }

      .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-heading {
        min-width: 0 !important;
      }

      .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-methods {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        flex-wrap: wrap !important;
        gap: 5px 10px !important;
        margin: 0 !important;
        min-width: 0 !important;
      }

      .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-methods a {
        font-size: 11.5px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        max-width: 220px !important;
      }

      .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-row:hover {
        border-color: #c99a3d !important;
        background: #fffdf8 !important;
      }

      .atlas-vendor-simplified-detail section > div {
        row-gap: 7px !important;
      }

      .atlas-vendors-polished .atlas-vendor-detail-clean h2,
      .atlas-vendors-polished .atlas-vendor-detail-clean h3,
      .atlas-vendors-polished .atlas-vendor-detail-clean h4,
      .atlas-vendors-polished .atlas-vendor-detail-clean p {
        margin-top: 0 !important;
        margin-bottom: 5px !important;
      }

      @media (max-width: 899px) {
        .atlas-vendors-polished .atlas-vendor-detail-clean {
          padding: 8px !important;
        }
        .atlas-vendor-tabs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-row {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        .atlas-vendor-contact-list.is-multiple .atlas-vendor-contact-methods {
          justify-content: flex-start !important;
        }
      }
    `}</style>
  );
}
