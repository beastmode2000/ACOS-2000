"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function workMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(
    (node) => normalized(node.textContent) === "work",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function findEditWorkCard(panel: HTMLElement) {
  const marker = Array.from(panel.querySelectorAll<HTMLElement>("div, span, strong, h2, h3, h4")).find(
    (node) => normalized(node.textContent) === "edit work",
  );
  if (!marker) return null;

  let current: HTMLElement | null = marker;
  for (let depth = 0; current && current !== panel && depth < 7; depth += 1) {
    const hasTitleInput = Array.from(current.querySelectorAll<HTMLInputElement>("input")).some(
      (input) => input.type !== "hidden" && String(input.value || "").trim().length > 0,
    );
    const hasSelect = Boolean(current.querySelector("select"));
    if (hasTitleInput && hasSelect) return current;
    current = current.parentElement;
  }

  return marker.parentElement;
}

function markAssetField(editor: HTMLElement) {
  for (const select of Array.from(editor.querySelectorAll<HTMLSelectElement>("select"))) {
    const optionLabels = Array.from(select.options).map((option) => normalized(option.textContent));
    if (!optionLabels.some((label) => ["no asset", "select asset", "choose asset"].includes(label))) continue;

    let field: HTMLElement | null = select.parentElement;
    for (let depth = 0; field && field !== editor && depth < 4; depth += 1) {
      const hasAssetLabel = Array.from(field.querySelectorAll<HTMLElement>("label, span, strong, div")).some(
        (node) => normalized(node.textContent) === "asset",
      );
      if (hasAssetLabel) break;
      field = field.parentElement;
    }

    (field || select.parentElement)?.classList.add("atlas-work-editor-asset-field-clean");
  }
}

function cleanWorkEditor() {
  const root = workMain();
  if (!root) return;

  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;

  const editor = findEditWorkCard(panel);
  const editing = Boolean(editor);
  panel.classList.toggle("atlas-work-editor-cleanup-active", editing);

  const quickLink = panel.querySelector<HTMLElement>(".atlas-work-asset-quick-link");
  quickLink?.classList.toggle("atlas-work-editor-quick-link-hidden", editing);

  if (!editor) return;
  editor.classList.add("atlas-work-editor-clean-card");

  const marker = Array.from(editor.querySelectorAll<HTMLElement>("div, span, strong, h2, h3, h4")).find(
    (node) => normalized(node.textContent) === "edit work",
  );
  marker?.parentElement?.classList.add("atlas-work-editor-clean-header");

  for (const button of Array.from(editor.querySelectorAll<HTMLButtonElement>("button"))) {
    const label = normalized(button.textContent);
    if (label === "scan" || label === "scan asset" || label === "scan qr") {
      button.classList.add("atlas-work-editor-scan-hidden");
    }
  }

  markAssetField(editor);
}

export default function AtlasWorkEditorCleanup() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      cleanWorkEditor();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });

    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-work-editor-cleanup-active > .atlas-work-summary-card,
      .atlas-work-editor-cleanup-active .atlas-work-summary-card {
        display: none !important;
      }

      .atlas-work-editor-quick-link-hidden,
      .atlas-work-editor-scan-hidden {
        display: none !important;
      }

      .atlas-work-editor-clean-card {
        overflow: visible !important;
      }

      .atlas-work-editor-clean-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        flex-wrap: wrap !important;
      }

      .atlas-work-editor-clean-header > * {
        min-width: 0 !important;
      }

      .atlas-work-editor-asset-field-clean {
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: 0 !important;
        width: 100% !important;
      }

      .atlas-work-editor-asset-field-clean select {
        width: 100% !important;
        min-width: 0 !important;
      }

      @media (max-width: 760px) {
        .atlas-work-editor-clean-header {
          align-items: stretch !important;
        }

        .atlas-work-editor-clean-header > div:last-child {
          width: 100% !important;
          justify-content: flex-start !important;
        }
      }
    `}</style>
  );
}
