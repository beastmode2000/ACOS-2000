"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function ownerReportMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === "owner report",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function propertyKey(root: HTMLElement) {
  const text = String(root.textContent || "");
  const match = text.match(/Property\s+(2000|6855|3661|Hangar)/i);
  return String(match?.[1] || "2000").toLowerCase();
}

function editorRow(element: Element, root: HTMLElement) {
  let current = element.parentElement;
  while (current && current !== root) {
    if (
      current.querySelector('input[type="date"]') &&
      current.querySelector("textarea") &&
      current.querySelector("select")
    ) {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
}

function noteKey(row: HTMLElement, root: HTMLElement) {
  const date = String(row.querySelector<HTMLInputElement>('input[type="date"]')?.value || "").trim();
  const textInputs = Array.from(row.querySelectorAll<HTMLInputElement>('input:not([type="date"])'));
  const person = String(textInputs[0]?.value || "").trim().toLowerCase();
  const title = String(textInputs[1]?.value || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!date || !title) return "";
  return `atlas.owner-report.note.v1|${propertyKey(root)}|${date}|${person}|${title}`;
}

function saveRowNote(row: HTMLElement, root: HTMLElement) {
  const key = noteKey(row, root);
  const textarea = row.querySelector<HTMLTextAreaElement>("textarea");
  if (!key || !textarea) return;
  try {
    window.localStorage.setItem(key, textarea.value);
  } catch {
    // Note persistence is a safety net and must never block the report.
  }
}

function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function restoreNotes(root: HTMLElement) {
  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    const row = editorRow(textarea, root);
    if (!row) continue;
    const key = noteKey(row, root);
    if (!key) continue;

    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(key);
    } catch {
      saved = null;
    }

    if (saved === null || textarea.value === saved) continue;
    setReactTextareaValue(textarea, saved);
  }
}

export default function AtlasOwnerReportHeaderPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const root = ownerReportMain();
      if (!root) return;

      root.classList.add("atlas-owner-report-compact-root");

      const heading = Array.from(root.querySelectorAll<HTMLElement>("h1, h2")).find(
        (node) => normalized(node.textContent) === "owner report",
      );
      if (!heading) return;

      heading.classList.add("atlas-owner-report-compact-title");

      const header = (heading.closest("header") as HTMLElement | null) || heading.parentElement;
      if (header) {
        header.classList.add("atlas-owner-report-compact-header");
        const next = header.nextElementSibling as HTMLElement | null;
        next?.classList.add("atlas-owner-report-compact-first-content");
      }

      restoreNotes(root);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const rememberNote = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
      const root = ownerReportMain();
      if (!root || !root.contains(target)) return;
      const row = editorRow(target, root);
      if (!row) return;
      saveRowNote(row, root);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("input", rememberNote, true);
    document.addEventListener("change", rememberNote, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("input", rememberNote, true);
      document.removeEventListener("change", rememberNote, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-owner-report-compact-root {
        padding-top: 0 !important;
      }

      .atlas-owner-report-compact-header {
        min-height: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        border-bottom-width: 1px !important;
      }

      .atlas-owner-report-compact-title {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        line-height: 1.15 !important;
      }

      .atlas-owner-report-compact-first-content {
        margin-top: 0 !important;
        padding-top: 8px !important;
      }

      @media (max-width: 900px) {
        .atlas-owner-report-compact-header {
          padding-top: 4px !important;
          padding-bottom: 5px !important;
        }

        .atlas-owner-report-compact-first-content {
          padding-top: 6px !important;
        }
      }
    `}</style>
  );
}
