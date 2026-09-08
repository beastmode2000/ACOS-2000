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
    const buttonLabels = Array.from(section.querySelectorAll<HTMLButtonElement>("button"))
      .map((button) => normalized(button.textContent));
    return buttonLabels.includes("add contact") && buttonLabels.includes("edit vendor");
  });

  if (!headerSection) return;
  const logo = headerSection.querySelector<HTMLImageElement>('img[alt$=" logo"]');
  if (!logo) return;

  const grid = Array.from(headerSection.querySelectorAll<HTMLElement>("div")).find((candidate) => {
    if (!candidate.contains(logo)) return false;
    if (!candidate.querySelector("h3")) return false;
    const labels = Array.from(candidate.querySelectorAll<HTMLButtonElement>("button"))
      .map((button) => normalized(button.textContent));
    return labels.includes("add contact") && labels.includes("edit vendor");
  });

  if (!grid) return;

  for (const child of Array.from(grid.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.contains(logo)) continue;
    if (child.querySelector("h3, button, img, input, select, textarea")) continue;

    const text = String(child.textContent || "").trim();
    if (/^[a-z0-9]{1,2}$/i.test(text)) {
      child.style.setProperty("display", "none", "important");
      child.setAttribute("aria-hidden", "true");
    }
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

      // React's select handler has already run by the time this document-level
      // bubble listener executes. Stop the event here so unrelated global
      // change/navigation listeners cannot treat the contact selector as app navigation.
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

  return null;
}
