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
    if (hasTitleInput) return current;
    current = current.parentElement;
  }
  return marker.parentElement;
}

function fieldFromLabel(editor: HTMLElement, labelText: string) {
  const label = Array.from(editor.querySelectorAll<HTMLElement>("span,label,strong,div")).find(
    (node) => normalized(node.textContent) === normalized(labelText),
  );
  if (!label) return null;
  if (label.tagName === "LABEL") return label;
  return label.closest("label") || label.parentElement;
}

function removeField(editor: HTMLElement, labelText: string) {
  const field = fieldFromLabel(editor, labelText);
  if (field && field !== editor) field.remove();
}

function markField(editor: HTMLElement, labelText: string, className: string) {
  fieldFromLabel(editor, labelText)?.classList.add(className);
}

function simplifyDetails(editor: HTMLElement) {
  const details = Array.from(editor.querySelectorAll<HTMLDetailsElement>("details")).find((node) =>
    normalized(node.querySelector("summary")?.textContent) === "more details",
  );
  if (!details) return;

  details.open = true;
  details.classList.add("atlas-work-editor-primary-details");
  details.querySelector("summary")?.classList.add("atlas-work-editor-hidden-summary");

  ["Estimated Time", "Type", "Category", "Linked Project", "Project", "Additional contacts", "Additional Contacts"].forEach(
    (label) => removeField(details, label),
  );

  markField(details, "Asset", "atlas-work-editor-core-field");
  markField(details, "Location", "atlas-work-editor-core-field");
  markField(details, "Sub-Location", "atlas-work-editor-core-field");
  markField(details, "Vendor", "atlas-work-editor-core-field");
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

function removeHeaderClutter(panel: HTMLElement, editor: HTMLElement) {
  for (const quickLink of Array.from(panel.querySelectorAll<HTMLElement>(".atlas-work-asset-quick-link"))) quickLink.remove();
  const editMarker = Array.from(editor.querySelectorAll<HTMLElement>("div, span, strong, h2, h3, h4")).find(
    (node) => normalized(node.textContent) === "edit work",
  );
  const markerRect = editMarker?.getBoundingClientRect();
  for (const element of Array.from(editor.querySelectorAll<HTMLElement>("button,span,div"))) {
    if (element === editMarker || element.contains(editMarker || null) || element.querySelector("input,select,textarea")) continue;
    const label = normalized(element.textContent);
    if (!["scan", "scan asset", "scan qr"].includes(label)) continue;
    if (!markerRect || Math.abs(element.getBoundingClientRect().top - markerRect.top) <= 110) element.remove();
  }
}

function markSaveControls(editor: HTMLElement) {
  const save = Array.from(editor.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    ["save changes", "save"].includes(normalized(button.textContent)),
  );
  if (!save) return;
  const parent = save.parentElement;
  if (!parent) return;
  parent.classList.add("atlas-work-editor-save-controls");
  Array.from(parent.querySelectorAll<HTMLElement>("div,span,strong")).forEach((node) => {
    if (normalized(node.textContent) === "work order editor") node.style.display = "none";
  });
}

function cleanWorkEditor() {
  const root = workMain();
  if (!root) return;
  const panel = root.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  for (const quickLink of Array.from(panel.querySelectorAll<HTMLElement>(".atlas-work-asset-quick-link"))) quickLink.remove();
  const editor = findEditWorkCard(panel);
  const editing = Boolean(editor);
  panel.classList.toggle("atlas-work-editor-cleanup-active", editing);
  if (!editor) return;

  editor.classList.add("atlas-work-editor-clean-card");
  const marker = Array.from(editor.querySelectorAll<HTMLElement>("div, span, strong, h2, h3, h4")).find(
    (node) => normalized(node.textContent) === "edit work",
  );
  marker?.parentElement?.classList.add("atlas-work-editor-clean-header");

  removeHeaderClutter(panel, editor);
  simplifyDetails(editor);
  markAssetField(editor);
  markSaveControls(editor);
}

export default function AtlasWorkEditorCleanup() {
  useEffect(() => {
    let frame = 0;
    const apply = () => { frame = 0; cleanWorkEditor(); };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
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
      .atlas-work-polish-root .atlas-work-asset-quick-link { display: none !important; }
      .atlas-work-editor-clean-card { overflow-x: hidden !important; min-width: 0 !important; }
      .atlas-work-editor-clean-card > * { max-width: 100% !important; min-width: 0 !important; }
      .atlas-work-editor-clean-header { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important; flex-wrap: wrap !important; min-width: 0 !important; }
      .atlas-work-editor-clean-header > * { min-width: 0 !important; max-width: 100% !important; }

      .atlas-work-editor-primary-details {
        border: 0 !important;
        border-top: 1px solid #E2E8F0 !important;
        border-radius: 0 !important;
        padding: 16px 0 0 !important;
        margin-top: 4px !important;
        background: transparent !important;
      }
      .atlas-work-editor-hidden-summary { display: none !important; }
      .atlas-work-editor-primary-details > div {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 12px !important;
        margin-top: 0 !important;
      }
      .atlas-work-editor-primary-details label { min-width: 0 !important; }
      .atlas-work-editor-primary-details select,
      .atlas-work-editor-primary-details input { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }

      .atlas-work-editor-asset-field-clean {
        border: 0 !important; background: transparent !important; box-shadow: none !important;
        padding: 0 !important; margin: 0 !important; min-height: 0 !important; width: 100% !important; max-width: 100% !important;
      }
      .atlas-work-editor-asset-field-clean select { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }

      .atlas-work-editor-save-controls {
        position: sticky !important;
        bottom: 12px !important;
        z-index: 20 !important;
        width: max-content !important;
        max-width: calc(100% - 16px) !important;
        margin: 12px 8px 4px auto !important;
        padding: 6px !important;
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        gap: 7px !important;
        border: 1px solid #D7DEE7 !important;
        border-radius: 12px !important;
        background: rgba(255,255,255,.96) !important;
        box-shadow: 0 8px 24px rgba(15,42,67,.12) !important;
      }
      .atlas-work-editor-save-controls button { width: auto !important; min-width: 0 !important; white-space: nowrap !important; }

      @media (max-width: 980px) {
        .atlas-work-editor-primary-details > div { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 760px) {
        .atlas-work-editor-clean-header { align-items: stretch !important; }
        .atlas-work-editor-clean-header > * { width: 100% !important; }
        .atlas-work-editor-primary-details > div { grid-template-columns: 1fr !important; }
        .atlas-work-editor-save-controls { bottom: 8px !important; margin-right: 4px !important; }
      }
    `}</style>
  );
}
