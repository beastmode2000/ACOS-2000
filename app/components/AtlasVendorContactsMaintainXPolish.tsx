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

function vendorMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(
    (node) => normalized(node.textContent) === "vendors",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function classifySection(section: HTMLElement) {
  const value = normalized(section.textContent);
  if (value.includes("vendor information") || (value.includes("main phone") && value.includes("main email"))) return "info";
  if (value.includes("contacts") && (value.includes("active") || value.includes("add contact"))) return "contacts";
  if (value.includes("related assets")) return "assets";
  if (value.includes("service visit history") || value.includes("related tasks") || value.includes("work history")) return "work";
  if (value.includes("documents")) return "documents";
  if (value.includes("photos") && (value.includes("attached") || value.includes("add photo") || value.includes("paste image"))) return "photos";
  if (value.includes("assets") && value.includes("open work") && value.includes("visits")) return "summary";
  return "other";
}

function markCompactActionRow(container: ParentNode, labels: string[]) {
  for (const element of Array.from(container.querySelectorAll<HTMLElement>("div"))) {
    const buttons = Array.from(element.querySelectorAll<HTMLElement>(":scope > button, :scope > a, :scope > label"));
    if (!buttons.length) continue;
    const values = buttons.map((button) => normalized(button.textContent));
    if (!labels.some((label) => values.some((value) => value === label || value.includes(label)))) continue;
    element.classList.add("atlas-vendor-compact-actions");
  }
}

function decorateHeader(detail: HTMLElement) {
  const sections = Array.from(detail.querySelectorAll<HTMLElement>("section"));
  const header = sections.find((section) => {
    const value = normalized(section.textContent);
    return Boolean(section.querySelector("h3")) && (value.includes("edit vendor") || value.includes("add contact"));
  });
  if (!header) return;

  header.classList.add("atlas-vendor-header-compact");
  const grid = header.firstElementChild;
  if (grid instanceof HTMLElement) {
    grid.classList.add("atlas-vendor-header-grid");
    const children = Array.from(grid.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    children[0]?.classList.add("atlas-vendor-header-logo");
    children[children.length - 1]?.classList.add("atlas-vendor-header-actions");
  }

  markCompactActionRow(header, ["add contact", "edit vendor", "done", "save vendor"]);
  markCompactActionRow(header, ["paste logo", "choose logo", "remove logo"]);
}

function decorateInfo(section: HTMLElement) {
  section.classList.add("atlas-vendor-info-compact");

  for (const strong of Array.from(section.querySelectorAll<HTMLElement>("strong"))) {
    if (normalized(strong.textContent) === "company details") strong.classList.add("atlas-vendor-redundant-label");
  }

  markCompactActionRow(section, ["call", "email"]);

  const labels = new Set(["main phone", "main email", "website", "category"]);
  for (const candidate of Array.from(section.querySelectorAll<HTMLElement>("div"))) {
    const directChildren = Array.from(candidate.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    if (directChildren.length < 2) continue;
    const matching = directChildren.filter((child) => {
      const first = child.querySelector<HTMLElement>("span");
      return labels.has(normalized(first?.textContent));
    });
    if (matching.length < 2) continue;
    candidate.classList.add("atlas-vendor-info-grid");
    matching.forEach((cell) => cell.classList.add("atlas-vendor-info-cell"));
  }
}

function decorateContacts(section: HTMLElement) {
  section.classList.add("atlas-vendor-contacts-compact");
  markCompactActionRow(section, ["add contact", "inactive", "hide inactive"]);

  const articles = Array.from(section.querySelectorAll<HTMLElement>("article"));
  if (!articles.length) return;
  const list = articles[0].parentElement;
  list?.classList.add("atlas-vendor-contact-grid");
  articles.forEach((article) => article.classList.add("atlas-vendor-contact-card"));
}

function ensureTabs(detail: HTMLElement, infoSection: HTMLElement) {
  let host = detail.querySelector<HTMLElement>("[data-atlas-vendor-tabs]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.atlasVendorTabs = "true";
    host.className = "atlas-vendor-tabs-compact";
    const tabs: Array<[VendorTab, string]> = [
      ["contacts", "Contacts"],
      ["assets", "Assets"],
      ["work", "Work & History"],
      ["documents", "Documents"],
      ["photos", "Photos"],
    ];
    for (const [key, label] of tabs) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.vendorTab = key;
      button.textContent = label;
      button.addEventListener("click", () => {
        detail.dataset.atlasVendorActiveTab = key;
        applySections(detail);
      });
      host.appendChild(button);
    }
    infoSection.insertAdjacentElement("afterend", host);
  }
  return host;
}

function applySections(detail: HTMLElement) {
  const sections = Array.from(detail.querySelectorAll<HTMLElement>("section"));
  const info = sections.find((section) => classifySection(section) === "info");
  if (!info) return;

  const editing = Array.from(detail.querySelectorAll<HTMLButtonElement>("button")).some(
    (button) => normalized(button.textContent) === "done",
  );
  const host = ensureTabs(detail, info);
  const active = (detail.dataset.atlasVendorActiveTab as VendorTab | undefined) || "contacts";
  detail.dataset.atlasVendorActiveTab = active;
  host.classList.toggle("is-editing", editing);

  for (const button of Array.from(host.querySelectorAll<HTMLButtonElement>("button"))) {
    const selected = button.dataset.vendorTab === active;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }

  for (const section of sections) {
    const type = classifySection(section);
    section.classList.remove("atlas-vendor-tab-hidden");
    if (type === "info") decorateInfo(section);
    if (type === "contacts") decorateContacts(section);
    if (type === "summary") {
      section.classList.add("atlas-vendor-tab-hidden");
      continue;
    }
    if (editing || type === "info" || type === "other") continue;
    if (type !== active) section.classList.add("atlas-vendor-tab-hidden");
  }
}

function decorateList(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  if (!list) return;
  list.classList.add("atlas-vendor-list-compact");
  for (const button of Array.from(list.querySelectorAll<HTMLButtonElement>("button"))) {
    if (!button.querySelector("strong")) continue;
    button.classList.add("atlas-vendor-list-card-compact");
  }
}

function extendPanels(root: HTMLElement) {
  if (window.innerWidth < 900) return;
  const list = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  const detail = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!list || !detail) return;
  const grid = list.parentElement;
  if (!(grid instanceof HTMLElement) || !grid.contains(detail)) return;

  const top = Math.min(list.getBoundingClientRect().top, detail.getBoundingClientRect().top);
  const height = `${Math.max(520, Math.floor(window.innerHeight - top - 18))}px`;
  grid.style.setProperty("height", height, "important");
  grid.style.setProperty("min-height", height, "important");
  grid.style.setProperty("max-height", height, "important");
  grid.style.setProperty("align-items", "stretch", "important");
  for (const panel of [list, detail]) {
    panel.style.setProperty("height", "100%", "important");
    panel.style.setProperty("min-height", "0", "important");
    panel.style.setProperty("max-height", "100%", "important");
    panel.style.setProperty("overflow-y", "auto", "important");
  }
}

function polishVendorPage() {
  const root = vendorMain();
  if (!root) return;
  root.classList.add("atlas-vendors-compact-layout");
  decorateList(root);
  extendPanels(root);

  const detail = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detail) return;
  detail.classList.add("atlas-vendor-detail-compact");
  decorateHeader(detail);
  applySections(detail);
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

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-tab-hidden,
      .atlas-vendor-redundant-label {
        display: none !important;
      }

      .atlas-vendors-compact-layout .atlas-vendor-detail-compact {
        padding: 8px !important;
      }

      .atlas-vendors-compact-layout .atlas-vendor-detail-compact section {
        padding: 9px !important;
        border-radius: 11px !important;
        box-shadow: none !important;
      }

      .atlas-vendor-header-grid {
        grid-template-columns: 52px minmax(0, 1fr) auto !important;
        gap: 9px !important;
        align-items: center !important;
      }

      .atlas-vendor-header-logo {
        width: 52px !important;
        height: 52px !important;
        min-width: 52px !important;
        max-width: 52px !important;
        border-radius: 9px !important;
      }

      .atlas-vendor-header-logo img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        padding: 4px !important;
        box-sizing: border-box !important;
      }

      .atlas-vendor-header-actions,
      .atlas-vendor-compact-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 5px !important;
        flex-wrap: wrap !important;
        width: auto !important;
      }

      .atlas-vendor-header-actions > button,
      .atlas-vendor-header-actions > a,
      .atlas-vendor-header-actions > label,
      .atlas-vendor-compact-actions > button,
      .atlas-vendor-compact-actions > a,
      .atlas-vendor-compact-actions > label {
        width: auto !important;
        min-width: 0 !important;
        min-height: 29px !important;
        height: auto !important;
        padding: 5px 8px !important;
        border-radius: 7px !important;
        font-size: 10.5px !important;
        line-height: 1.15 !important;
        white-space: nowrap !important;
      }

      .atlas-vendor-info-compact {
        padding: 9px !important;
      }

      .atlas-vendor-info-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 6px !important;
      }

      .atlas-vendor-info-cell {
        min-height: 0 !important;
        padding: 7px 9px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .atlas-vendor-info-cell span {
        margin-bottom: 2px !important;
        font-size: 9.5px !important;
      }

      .atlas-vendor-info-cell strong,
      .atlas-vendor-info-cell a {
        font-size: 12px !important;
        line-height: 1.25 !important;
      }

      .atlas-vendor-tabs-compact {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        flex-wrap: wrap !important;
        margin: 0 !important;
        padding: 0 1px !important;
      }

      .atlas-vendor-tabs-compact button {
        width: auto !important;
        min-width: 0 !important;
        min-height: 29px !important;
        padding: 5px 8px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 7px !important;
        background: #ffffff !important;
        color: #526477 !important;
        font: inherit !important;
        font-size: 10.5px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }

      .atlas-vendor-tabs-compact button:hover,
      .atlas-vendor-tabs-compact button.is-active {
        border-color: #c99a3d !important;
        background: #fff8e8 !important;
        color: #0b1e33 !important;
      }

      .atlas-vendor-tabs-compact.is-editing {
        display: none !important;
      }

      .atlas-vendor-contact-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 6px !important;
      }

      .atlas-vendor-contact-card {
        min-height: 0 !important;
        padding: 8px 9px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .atlas-vendor-list-card-compact {
        min-height: 46px !important;
        padding: 6px 8px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .atlas-vendor-list-card-compact strong {
        font-size: 12px !important;
        line-height: 1.2 !important;
      }

      .atlas-vendor-list-card-compact p {
        margin: 1px 0 0 !important;
        font-size: 10px !important;
      }

      @media (max-width: 899px) {
        .atlas-vendor-header-grid {
          grid-template-columns: 46px minmax(0, 1fr) !important;
        }
        .atlas-vendor-header-logo {
          width: 46px !important;
          height: 46px !important;
          min-width: 46px !important;
          max-width: 46px !important;
        }
        .atlas-vendor-header-actions {
          grid-column: 1 / -1 !important;
          justify-content: flex-start !important;
        }
        .atlas-vendor-info-grid,
        .atlas-vendor-contact-grid {
          grid-template-columns: 1fr !important;
        }
        .atlas-vendor-tabs-compact {
          overflow-x: auto !important;
          flex-wrap: nowrap !important;
          scrollbar-width: none !important;
        }
        .atlas-vendor-tabs-compact::-webkit-scrollbar {
          display: none !important;
        }
      }
    `}</style>
  );
}
