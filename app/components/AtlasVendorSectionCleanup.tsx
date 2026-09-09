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

function vendorRoot() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(
    (node) => normalized(node.textContent) === "vendors",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function sectionType(section: HTMLElement): VendorTab | "info" | "summary" | "other" {
  const value = normalized(section.textContent);
  if (value.includes("vendor information") || (value.includes("main phone") && value.includes("main email"))) {
    return "info";
  }
  if (value.includes("contacts") && (value.includes("active") || value.includes("add contact"))) {
    return "contacts";
  }
  if (value.includes("service visit history") || value.includes("related tasks")) return "work";
  if (value.includes("related assets")) return "assets";
  if (
    value.includes("photos") &&
    (value.includes("attached") || value.includes("add photo") || value.includes("paste image"))
  ) {
    return "photos";
  }
  if (
    value.includes("documents") ||
    normalized(section.getAttribute("aria-label")).includes("document") ||
    Boolean(section.querySelector('button[aria-label*="document" i], a[href*="document" i]'))
  ) {
    return "documents";
  }
  if (value.includes("assets") && value.includes("open work") && value.includes("visits")) return "summary";
  return "other";
}

function hideDuplicateHeading(section: HTMLElement, type: VendorTab | "info" | "summary" | "other") {
  if (type !== "photos" && type !== "documents" && type !== "assets" && type !== "work" && type !== "contacts") return;

  const duplicateLabels: Record<VendorTab, string[]> = {
    contacts: ["contacts"],
    assets: ["related assets", "assets"],
    work: ["service visit history", "work history", "work history service visit history"],
    documents: ["documents"],
    photos: ["photos"],
  };

  const labels = duplicateLabels[type];
  for (const node of Array.from(section.querySelectorAll<HTMLElement>("div, span, strong, h2, h3, h4"))) {
    const value = normalized(node.textContent);
    if (!labels.includes(value)) continue;
    if (node.querySelector("button, a, input, select, textarea")) continue;
    node.classList.add("atlas-vendor-duplicate-section-label");
  }
}

function activeTab(detailPanel: HTMLElement): VendorTab {
  const dataValue = detailPanel.dataset.atlasVendorActiveTab as VendorTab | undefined;
  if (dataValue && ["contacts", "assets", "work", "documents", "photos"].includes(dataValue)) {
    return dataValue;
  }

  const selected = detailPanel.querySelector<HTMLButtonElement>("[data-atlas-vendor-tabs] button.is-active, [data-atlas-vendor-tabs] button[aria-pressed=\"true\"]");
  const selectedValue = selected?.dataset.vendorTab as VendorTab | undefined;
  return selectedValue || "contacts";
}

function apply() {
  const root = vendorRoot();
  if (!root) return;
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;

  const editing = Array.from(detailPanel.querySelectorAll<HTMLButtonElement>("button")).some(
    (button) => normalized(button.textContent) === "done",
  );
  const active = activeTab(detailPanel);

  for (const section of Array.from(detailPanel.querySelectorAll<HTMLElement>("section"))) {
    const type = sectionType(section);
    section.classList.remove("atlas-vendor-secondary-force-hidden");
    hideDuplicateHeading(section, type);

    if (type === "summary") {
      section.classList.add("atlas-vendor-secondary-force-hidden");
      continue;
    }

    if (editing || type === "info" || type === "other") continue;
    if (type !== active) section.classList.add("atlas-vendor-secondary-force-hidden");
  }
}

export default function AtlasVendorSectionCleanup() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-atlas-vendor-active-tab"] });
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-secondary-force-hidden {
        display: none !important;
      }
      .atlas-vendor-duplicate-section-label {
        display: none !important;
      }
    `}</style>
  );
}
