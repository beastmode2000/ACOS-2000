"use client";

import { useEffect } from "react";

const DEPARTMENT_LABELS = new Set([
  "departments",
  "house & maintenance",
  "house and maintenance",
  "garage",
  "garage / vehicles",
  "vehicles",
  "dock & marine",
  "dock and marine",
  "dock & waterfront",
  "pool & spa",
  "landscape",
  "landscaping",
  "landscaping & irrigation",
  "landscaping and irrigation",
]);

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9&/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hide(node: HTMLElement) {
  node.style.setProperty("display", "none", "important");
  node.setAttribute("data-atlas-department-hidden", "true");
}

function removeDepartmentUi() {
  // Department destinations are obsolete. Keep their underlying records intact,
  // but remove the navigation entry points so Assets, Locations, Work, Vendors,
  // and search remain the canonical ways to find information.
  for (const container of Array.from(document.querySelectorAll<HTMLElement>("aside, nav"))) {
    for (const control of Array.from(container.querySelectorAll<HTMLElement>("button, a, [role='button']"))) {
      const value = normalized(control.textContent);
      if (DEPARTMENT_LABELS.has(value)) hide(control);
    }
  }

  // Remove dashboard/legacy cards explicitly headed Departments.
  for (const heading of Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, strong"))) {
    if (normalized(heading.textContent) !== "departments") continue;
    const section = heading.closest<HTMLElement>("section, article") || heading.parentElement;
    if (section) hide(section);
  }

  // Department-only fields are no longer part of normal record editing.
  for (const label of Array.from(document.querySelectorAll<HTMLElement>("label"))) {
    const directText = Array.from(label.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .map((child) => normalized(child.textContent))
      .find((value) => value === "department");
    if (directText) hide(label);
  }

  // Retire legacy department takeover panes without deleting any stored data.
  document
    .querySelectorAll<HTMLElement>("[data-atlas-house-maintenance-host]")
    .forEach((node) => node.remove());
  document
    .querySelectorAll<HTMLElement>("main.atlas-house-maintenance-active")
    .forEach((node) => node.classList.remove("atlas-house-maintenance-active"));
}

export default function AtlasDepartmentRemoval() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        removeDepartmentUi();
      });
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
    };
  }, []);

  return null;
}
