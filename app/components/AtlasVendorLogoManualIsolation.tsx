"use client";

import { useEffect } from "react";

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return clean(value).toLowerCase();
}

function visible(element: HTMLElement | null) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === normalized(title) && visible(node),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function logoLikeText(value: unknown) {
  const text = normalized(value);
  return /(^|\s|[-_/])logos?(\s|$|[-_/])/.test(text) || text.includes("vendor logo");
}

function hideLogoRecords(root: HTMLElement | null) {
  if (!root) return;
  const list =
    root.querySelector<HTMLElement>(".atlas-manuals-upgraded-list-pane") ||
    root.querySelector<HTMLElement>(".atlas-documents-list-pane") ||
    root;

  for (const candidate of Array.from(
    list.querySelectorAll<HTMLElement>("button, article, [role='button'], [role='listitem']"),
  )) {
    if (!logoLikeText(candidate.textContent)) continue;
    const row = candidate.closest<HTMLElement>("article, [role='listitem']") || candidate.parentElement || candidate;
    row.classList.add("atlas-vendor-logo-shared-record-hidden");
  }
}

function manualPreviewUrl(element: Element) {
  if (element instanceof HTMLIFrameElement || element instanceof HTMLEmbedElement) {
    return clean(element.getAttribute("src"));
  }
  if (element instanceof HTMLObjectElement) return clean(element.getAttribute("data"));
  return "";
}

function simplifyManualPreview(root: HTMLElement | null) {
  if (!root) return;
  const detail =
    root.querySelector<HTMLElement>(".atlas-manuals-upgraded-detail-pane") ||
    Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))
      .filter((element) => visible(element) && element.getBoundingClientRect().width > 420)
      .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0] ||
    null;
  if (!detail) return;

  const previews = Array.from(detail.querySelectorAll("iframe, embed, object"));
  if (!previews.length) return;

  const source = previews.map(manualPreviewUrl).find(Boolean) || "";
  previews.forEach((preview) => preview.classList.add("atlas-manual-inline-preview-hidden"));

  if (detail.querySelector(".atlas-manual-open-fallback")) return;

  const fallback = document.createElement("div");
  fallback.className = "atlas-manual-open-fallback";
  const heading = document.createElement("strong");
  heading.textContent = "Manual ready to open";
  const note = document.createElement("span");
  note.textContent = "Open the manual for full PDF navigation.";
  fallback.append(heading, note);

  if (source) {
    const link = document.createElement("a");
    link.href = source;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open Manual";
    fallback.appendChild(link);
  } else {
    const nativeOpen = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => /^(open|open pdf|view)$/i.test(clean(button.textContent)) && visible(button),
    );
    if (nativeOpen) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open Manual";
      button.addEventListener("click", () => nativeOpen.click());
      fallback.appendChild(button);
    }
  }

  previews[0].parentElement?.insertBefore(fallback, previews[0]);
}

function cleanVendorLogoControls(root: HTMLElement | null) {
  if (!root) return;

  root.querySelectorAll<HTMLElement>(".atlas-vendor-logo-isolated-controls").forEach((node) => node.remove());

  const nativeControls = Array.from(root.querySelectorAll<HTMLElement>("button, label")).filter((element) => {
    const value = normalized(element.textContent);
    return value === "paste logo" || value === "choose logo" || value === "remove logo";
  });

  nativeControls.forEach((control) => {
    control.classList.remove("atlas-vendor-logo-legacy-control-hidden");
  });

  const rows = new Set<HTMLElement>();
  nativeControls.forEach((control) => {
    if (control.parentElement) rows.add(control.parentElement);
  });

  rows.forEach((row) => {
    const texts = Array.from(row.querySelectorAll<HTMLElement>("button, label")).map((element) =>
      normalized(element.textContent),
    );
    if (!texts.includes("paste logo") && !texts.includes("choose logo")) return;
    row.querySelectorAll<HTMLElement>(".atlas-photo-paste-button").forEach((button) => button.remove());
  });
}

export default function AtlasVendorLogoManualIsolation() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      hideLogoRecords(pageMain("Manuals"));
      hideLogoRecords(pageMain("Documents"));
      simplifyManualPreview(pageMain("Manuals"));
      cleanVendorLogoControls(pageMain("Vendors"));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("atlas:data-changed", schedule as EventListener);
    return () => {
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-logo-shared-record-hidden,
      .atlas-manual-inline-preview-hidden {
        display: none !important;
      }

      .atlas-manual-open-fallback {
        min-height: 150px !important;
        display: grid !important;
        place-items: center !important;
        align-content: center !important;
        gap: 7px !important;
        padding: 18px !important;
        margin: 8px 0 !important;
        border: 1px solid #d9e2ea !important;
        border-radius: 10px !important;
        background: #f8fafc !important;
        text-align: center !important;
      }

      .atlas-manual-open-fallback strong {
        color: #0a2841 !important;
        font-size: 14px !important;
      }

      .atlas-manual-open-fallback span {
        color: #6b7c8c !important;
        font-size: 11px !important;
      }

      .atlas-manual-open-fallback a,
      .atlas-manual-open-fallback button {
        min-height: 36px !important;
        padding: 7px 12px !important;
        border: 1px solid #0a2841 !important;
        border-radius: 9px !important;
        background: #0a2841 !important;
        color: #ffffff !important;
        text-decoration: none !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }
    `}</style>
  );
}