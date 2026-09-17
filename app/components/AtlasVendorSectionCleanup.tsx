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
  if (value.includes("vendor information") || (value.includes("main phone") && value.includes("main email"))) return "info";
  if (value.includes("contacts") && (value.includes("active") || value.includes("add contact"))) return "contacts";
  if (value.includes("service visit history") || value.includes("related tasks")) return "work";
  if (value.includes("related assets")) return "assets";
  if (value.includes("photos") && (value.includes("attached") || value.includes("add photo") || value.includes("paste image"))) return "photos";
  if (
    value.includes("documents") ||
    normalized(section.getAttribute("aria-label")).includes("document") ||
    Boolean(section.querySelector('button[aria-label*="document" i], a[href*="document" i]'))
  ) return "documents";
  if (value.includes("assets") && value.includes("open work") && value.includes("visits")) return "summary";
  return "other";
}

function hideDuplicateHeading(section: HTMLElement, type: VendorTab | "info" | "summary" | "other") {
  if (!["photos", "documents", "assets", "work", "contacts"].includes(type)) return;
  const duplicateLabels: Record<VendorTab, string[]> = {
    contacts: ["contacts"],
    assets: ["related assets", "assets"],
    work: ["service visit history", "work history", "work history service visit history"],
    documents: ["documents"],
    photos: ["photos"],
  };
  const labels = duplicateLabels[type as VendorTab];
  for (const node of Array.from(section.querySelectorAll<HTMLElement>("div, span, strong, h2, h3, h4"))) {
    const value = normalized(node.textContent);
    if (!labels.includes(value)) continue;
    if (node.querySelector("button, a, input, select, textarea")) continue;
    node.classList.add("atlas-vendor-duplicate-section-label");
  }
}

function activeTab(detailPanel: HTMLElement): VendorTab {
  const dataValue = detailPanel.dataset.atlasVendorActiveTab as VendorTab | undefined;
  if (dataValue && ["contacts", "assets", "work", "documents", "photos"].includes(dataValue)) return dataValue;
  const selected = detailPanel.querySelector<HTMLButtonElement>("[data-atlas-vendor-tabs] button.is-active, [data-atlas-vendor-tabs] button[aria-pressed=\"true\"]");
  return (selected?.dataset.vendorTab as VendorTab | undefined) || "contacts";
}

function visibleButton(root: ParentNode, label: string) {
  const wanted = normalized(label);
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.offsetParent !== null && normalized(button.textContent) === wanted,
  ) || null;
}

function cleanTopLevelChrome(root: HTMLElement) {
  root.classList.add("atlas-vendor-clean-layout");

  const mainHeading = Array.from(root.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "vendors",
  );
  const duplicateVendorLabels = Array.from(root.querySelectorAll<HTMLElement>("h2,h3,h4,strong,span,div")).filter(
    (node) => normalized(node.textContent) === "vendors" && !node.contains(mainHeading),
  );
  duplicateVendorLabels.forEach((node) => {
    if (node.querySelector("button,input,select,textarea,a")) return;
    node.classList.add("atlas-vendor-top-duplicate");
  });

  const assignedButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => normalized(button.textContent) === "show assigned" || normalized(button.textContent) === "hide assigned",
  );
  assignedButtons.forEach((button, index) => {
    button.classList.toggle("atlas-vendor-control-duplicate", index > 0);
  });

  const search = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="search"], input[placeholder]')).find((input) =>
    /search.*vendor|vendor.*search/i.test(String(input.placeholder || "")),
  );
  search?.parentElement?.classList.add("atlas-vendor-clean-toolbar");
}

function apply() {
  const root = vendorRoot();
  if (!root) return;
  cleanTopLevelChrome(root);

  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  if (!detailPanel) return;

  const editing = Boolean(
    visibleButton(detailPanel, "Done") ||
    visibleButton(detailPanel, "Save Vendor") ||
    visibleButton(detailPanel, "Save Changes"),
  );
  detailPanel.classList.toggle("atlas-vendor-editing", editing);
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

function openNewVendorEditor() {
  let attempts = 0;
  const tryOpen = () => {
    attempts += 1;
    const root = vendorRoot();
    if (!root) return;
    const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]") || root;
    if (visibleButton(detailPanel, "Done") || visibleButton(detailPanel, "Save Vendor") || visibleButton(detailPanel, "Save Changes")) return;
    const edit = visibleButton(detailPanel, "Edit Vendor") || visibleButton(detailPanel, "Edit");
    if (edit) {
      edit.click();
      return;
    }
    if (attempts < 40) window.setTimeout(tryOpen, 75);
  };
  window.setTimeout(tryOpen, 30);
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

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("button");
      if (button && normalized(button.textContent) === "add vendor" && vendorRoot()?.contains(button)) {
        openNewVendorEditor();
      }
      schedule();
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-atlas-vendor-active-tab"] });
    document.addEventListener("click", onClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-secondary-force-hidden,
      .atlas-vendor-duplicate-section-label,
      .atlas-vendor-top-duplicate,
      .atlas-vendor-control-duplicate {
        display: none !important;
      }

      .atlas-vendor-clean-layout [data-atlas-record-list] {
        min-width: 0 !important;
      }

      .atlas-vendor-clean-toolbar {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        gap: 7px !important;
        align-items: center !important;
        margin-bottom: 8px !important;
      }

      .atlas-vendor-clean-layout [data-atlas-detail-panel] {
        min-width: 0 !important;
      }

      .atlas-vendor-clean-layout [data-atlas-detail-panel] > section {
        margin-top: 8px !important;
      }

      @media (max-width: 760px) {
        .atlas-vendor-clean-toolbar {
          grid-template-columns: minmax(0, 1fr) !important;
        }
      }
    `}</style>
  );
}
