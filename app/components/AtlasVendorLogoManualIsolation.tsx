"use client";

import { useEffect } from "react";

function text(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === normalized(title),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function logoLikeText(value: unknown) {
  const valueText = normalized(value);
  return /(^|\s|[-_/])logos?(\s|$|[-_/])/.test(valueText) || valueText.includes("vendor logo");
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

function ensureInitialFallback(image: HTMLImageElement) {
  const parent = image.parentElement;
  if (!parent) return;

  const name = text(image.alt).replace(/\s+logo$/i, "");
  let fallback = parent.querySelector<HTMLElement>(":scope > .atlas-vendor-safe-logo-fallback");
  if (!fallback) {
    fallback = document.createElement("span");
    fallback.className = "atlas-vendor-safe-logo-fallback";
    parent.appendChild(fallback);
  }
  fallback.textContent = name.slice(0, 2).toUpperCase() || "V";
}

function removeInitialFallback(image: HTMLImageElement) {
  image.parentElement?.querySelector<HTMLElement>(":scope > .atlas-vendor-safe-logo-fallback")?.remove();
}

function protectVendorLogoSlots(root: HTMLElement | null) {
  if (!root) return;

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img[src]"));
  const logoImages = images.filter((image) => /\slogo$/i.test(text(image.alt)));
  const nonLogoSources = new Set(
    images
      .filter((image) => !/\slogo$/i.test(text(image.alt)))
      .map((image) => text(image.currentSrc || image.src))
      .filter(Boolean),
  );

  const sourceNames = new Map<string, Set<string>>();
  for (const image of logoImages) {
    const source = text(image.currentSrc || image.src);
    if (!source) continue;
    const name = normalized(text(image.alt).replace(/\s+logo$/i, ""));
    const names = sourceNames.get(source) || new Set<string>();
    if (name) names.add(name);
    sourceNames.set(source, names);
  }

  for (const image of logoImages) {
    const source = text(image.currentSrc || image.src);
    const names = sourceNames.get(source);
    const unsafe = Boolean(source) && (nonLogoSources.has(source) || Boolean(names && names.size > 1));

    if (unsafe) {
      image.classList.add("atlas-vendor-unsafe-logo-image");
      image.setAttribute("aria-hidden", "true");
      ensureInitialFallback(image);
    } else {
      image.classList.remove("atlas-vendor-unsafe-logo-image");
      image.removeAttribute("aria-hidden");
      removeInitialFallback(image);
    }
  }
}

export default function AtlasVendorLogoManualIsolation() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      hideLogoRecords(pageMain("Manuals"));
      hideLogoRecords(pageMain("Documents"));
      protectVendorLogoSlots(pageMain("Vendors"));
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
      .atlas-vendor-unsafe-logo-image {
        display: none !important;
      }

      .atlas-vendor-safe-logo-fallback {
        display: grid !important;
        place-items: center !important;
        width: 100% !important;
        height: 100% !important;
        color: #0a2841 !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        letter-spacing: .02em !important;
      }
    `}</style>
  );
}
