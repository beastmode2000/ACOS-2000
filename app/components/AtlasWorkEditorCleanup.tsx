"use client";

import { useEffect } from "react";

const norm = (value: unknown) => String(value || "").trim().toLowerCase();

function workMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find((node) => norm(node.textContent) === "work");
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function findEditor(panel: HTMLElement) {
  const marker = Array.from(panel.querySelectorAll<HTMLElement>("div,span,strong,h2,h3,h4")).find((node) => norm(node.textContent) === "edit work");
  if (!marker) return null;
  let current: HTMLElement | null = marker;
  for (let depth = 0; current && current !== panel && depth < 7; depth += 1) {
    if (Array.from(current.querySelectorAll("input")).some((input) => input.type !== "hidden" && String(input.value || "").trim())) return current;
    current = current.parentElement;
  }
  return marker.parentElement;
}

function fieldFromLabel(editor: HTMLElement, text: string) {
  const label = Array.from(editor.querySelectorAll<HTMLElement>("span,label,strong,div")).find((node) => norm(node.textContent) === norm(text));
  if (!label) return null;
  return label.tagName === "LABEL" ? label : label.closest("label") || label.parentElement;
}

function cleanEditor() {
  const root = workMain();
  const panel = root?.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;
  panel.querySelectorAll<HTMLElement>(".atlas-work-asset-quick-link").forEach((node) => node.remove());

  const editor = findEditor(panel);
  panel.classList.toggle("atlas-work-editor-cleanup-active", Boolean(editor));
  if (!editor) return;
  editor.classList.add("atlas-work-editor-clean-card");

  const editMarker = Array.from(editor.querySelectorAll<HTMLElement>("div,span,strong,h2,h3,h4")).find((node) => norm(node.textContent) === "edit work");
  const header = editMarker?.parentElement;
  header?.classList.add("atlas-work-editor-clean-header");

  const details = Array.from(editor.querySelectorAll<HTMLDetailsElement>("details")).find((node) => norm(node.querySelector("summary")?.textContent) === "more details");
  if (details) {
    details.open = true;
    details.classList.add("atlas-work-editor-primary-details");
    details.querySelector("summary")?.classList.add("atlas-work-editor-hidden-summary");
    ["Estimated Time","Type","Category","Linked Project","Project","Additional contacts","Additional Contacts"].forEach((name) => {
      const field = fieldFromLabel(details, name);
      if (field && field !== details) field.remove();
    });
  }

  const save = Array.from(editor.querySelectorAll<HTMLButtonElement>("button")).find((button) => ["save changes","save"].includes(norm(button.textContent)));
  if (save && header) {
    const controls = save.parentElement;
    if (controls) {
      controls.classList.add("atlas-work-editor-save-controls");
      controls.querySelectorAll<HTMLElement>("div,span,strong").forEach((node) => {
        if (norm(node.textContent) === "work order editor") node.remove();
      });
      controls.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (norm(button.textContent) === "cancel") button.style.display = "none";
      });
      if (controls.parentElement !== header) header.appendChild(controls);
    }
    save.textContent = save.disabled ? "Saving…" : "Save";
  }
}

export default function AtlasWorkEditorCleanup() {
  useEffect(() => {
    let frame = 0;
    const apply = () => { frame = 0; cleanEditor(); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
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
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <style jsx global>{`
    .atlas-work-polish-root .atlas-work-asset-quick-link { display:none !important; }
    .atlas-work-editor-clean-card { overflow-x:hidden !important; min-width:0 !important; }
    .atlas-work-editor-clean-card > * { max-width:100% !important; min-width:0 !important; }
    .atlas-work-editor-clean-header {
      display:flex !important; align-items:center !important; gap:10px !important;
      min-width:0 !important; padding-bottom:8px !important;
    }
    .atlas-work-editor-clean-header > * { min-width:0 !important; }
    .atlas-work-editor-clean-header .atlas-work-editor-save-controls { margin-left:auto !important; }

    .atlas-work-editor-primary-details {
      border:0 !important; border-top:1px solid #E2E8F0 !important; border-radius:0 !important;
      padding:12px 0 0 !important; margin-top:2px !important; background:transparent !important;
    }
    .atlas-work-editor-hidden-summary { display:none !important; }
    .atlas-work-editor-primary-details > div {
      grid-template-columns:repeat(4,minmax(0,1fr)) !important;
      gap:10px 12px !important; margin-top:0 !important;
    }
    .atlas-work-editor-primary-details label { min-width:0 !important; }
    .atlas-work-editor-primary-details select,
    .atlas-work-editor-primary-details input { width:100% !important; min-width:0 !important; max-width:100% !important; }

    .atlas-work-editor-save-controls {
      position:static !important; inset:auto !important; z-index:auto !important;
      width:auto !important; max-width:none !important; margin:0 0 0 auto !important; padding:0 !important;
      display:flex !important; align-items:center !important; justify-content:flex-end !important; gap:6px !important;
      border:0 !important; border-radius:0 !important; background:transparent !important; box-shadow:none !important;
    }
    .atlas-work-editor-save-controls button {
      width:auto !important; min-width:72px !important; min-height:36px !important;
      padding:7px 14px !important; white-space:nowrap !important;
    }

    @media (max-width:980px) {
      .atlas-work-editor-primary-details > div { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    }
    @media (max-width:760px) {
      .atlas-work-editor-clean-header { align-items:center !important; flex-wrap:wrap !important; }
      .atlas-work-editor-primary-details > div { grid-template-columns:1fr !important; }
      .atlas-work-editor-save-controls { margin-left:auto !important; }
    }
  `}</style>;
}
