"use client";

import { useEffect } from "react";

const PAGE_CLASSES: Record<string, string> = {
  assets: "atlas-polish-assets-root",
  notes: "atlas-polish-notes-root",
  documents: "atlas-polish-documents-root",
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === title,
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function hideProceduresNavigation() {
  const scopes = Array.from(document.querySelectorAll<HTMLElement>("nav, aside, header"));
  for (const scope of scopes) {
    for (const element of Array.from(scope.querySelectorAll<HTMLElement>("button, a"))) {
      if (normalized(element.textContent) !== "procedures") continue;
      element.style.display = "none";
      element.setAttribute("aria-hidden", "true");
    }
  }

  for (const option of Array.from(document.querySelectorAll<HTMLOptionElement>("option"))) {
    if (normalized(option.textContent) !== "procedures" && normalized(option.value) !== "procedures") continue;
    option.hidden = true;
    option.disabled = true;
  }
}

function markEmptySecondarySections(root: HTMLElement) {
  const emptyPhrases = [
    "no documents",
    "no manuals",
    "no work history",
    "no service history",
    "no procedures",
    "no notes yet",
    "no notes",
    "nothing linked",
    "none linked",
  ];

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))) {
    const text = normalized(element.textContent);
    if (!text || text.length > 170) continue;
    if (!emptyPhrases.some((phrase) => text.includes(phrase))) continue;
    if (element.querySelector("input, textarea, select")) continue;
    element.classList.add("atlas-polish-empty-secondary");
  }
}

function markScrollablePanes(root: HTMLElement, prefix: string) {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("div, section")).filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const canScroll = /auto|scroll/.test(style.overflowY);
    return canScroll && rect.width > 180 && rect.height > 260 && element.scrollHeight > element.clientHeight + 12;
  });

  if (!candidates.length) return;
  candidates.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  const left = candidates[0];
  const right = candidates[candidates.length - 1];
  if (left) left.classList.add(`${prefix}-list-pane`);
  if (right && right !== left) right.classList.add(`${prefix}-detail-pane`);
}

function polishAssets(root: HTMLElement) {
  root.classList.add(PAGE_CLASSES.assets);
  markScrollablePanes(root, "atlas-polish-assets");
  markEmptySecondarySections(root);

  const addAsset = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => normalized(button.textContent) === "add asset",
  );
  addAsset?.classList.add("atlas-polish-primary-action");
  addAsset?.parentElement?.classList.add("atlas-polish-toolbar");

  const midpoint = root.getBoundingClientRect().left + root.getBoundingClientRect().width * 0.48;
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = normalized(button.textContent);
    const rect = button.getBoundingClientRect();
    const isLeftListAction = rect.left < midpoint && (text === "edit" || text === "work order" || text === "☆" || text === "★");
    if (isLeftListAction) button.classList.add("atlas-polish-assets-card-action-hidden");
  }

  for (const badge of Array.from(root.querySelectorAll<HTMLElement>("span, div"))) {
    const text = normalized(badge.textContent);
    if (["operational", "offline", "service due", "needs attention"].includes(text)) {
      badge.classList.add("atlas-polish-status-badge");
    }
  }

  for (const section of Array.from(root.querySelectorAll<HTMLElement>("section, article"))) {
    const text = normalized(section.textContent);
    if (text.includes("manuals") || text.includes("documents") || text.includes("notes")) {
      section.classList.add("atlas-polish-reference-section");
    }
    if (text.includes("work history") || text.includes("service history") || text.includes("history")) {
      section.classList.add("atlas-polish-history-section");
    }
  }
}

function polishNotes(root: HTMLElement) {
  root.classList.add(PAGE_CLASSES.notes);
  markScrollablePanes(root, "atlas-polish-notes");
  markEmptySecondarySections(root);

  const search = root.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search" i]');
  search?.classList.add("atlas-polish-notes-search");

  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    textarea.classList.add("atlas-polish-note-editor");
  }
}

function polishDocuments(root: HTMLElement) {
  root.classList.add(PAGE_CLASSES.documents);
  markScrollablePanes(root, "atlas-polish-documents");
  markEmptySecondarySections(root);

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = normalized(button.textContent);
    if (text === "open" || text === "open pdf" || text === "preview") {
      button.classList.add("atlas-polish-document-open");
    }
  }
}

export default function AtlasWorkspacePolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      hideProceduresNavigation();

      const assets = pageMain("assets");
      if (assets) polishAssets(assets);

      const notes = pageMain("notes");
      if (notes) polishNotes(notes);

      const documents = pageMain("documents");
      if (documents) polishDocuments(documents);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-polish-assets-root,
      .atlas-polish-notes-root,
      .atlas-polish-documents-root {
        --atlas-workspace-border: #dce4ec;
        --atlas-workspace-soft: #f8fafc;
      }

      .atlas-polish-assets-root > *,
      .atlas-polish-notes-root > *,
      .atlas-polish-documents-root > * {
        min-width: 0;
      }

      .atlas-polish-assets-root section,
      .atlas-polish-assets-root article,
      .atlas-polish-notes-root section,
      .atlas-polish-notes-root article,
      .atlas-polish-documents-root section,
      .atlas-polish-documents-root article {
        box-shadow: none !important;
      }

      .atlas-polish-empty-secondary {
        display: none !important;
      }

      .atlas-polish-toolbar {
        min-height: 0 !important;
        padding-top: 6px !important;
        padding-bottom: 8px !important;
        margin-bottom: 6px !important;
      }

      .atlas-polish-primary-action {
        min-height: 36px !important;
        padding: 7px 12px !important;
      }

      .atlas-polish-assets-list-pane,
      .atlas-polish-assets-detail-pane,
      .atlas-polish-notes-list-pane,
      .atlas-polish-notes-detail-pane,
      .atlas-polish-documents-list-pane,
      .atlas-polish-documents-detail-pane {
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
      }

      .atlas-polish-assets-list-pane {
        padding-right: 6px !important;
      }

      .atlas-polish-assets-list-pane > * {
        margin-bottom: 7px !important;
      }

      .atlas-polish-assets-list-pane button,
      .atlas-polish-assets-list-pane article,
      .atlas-polish-assets-list-pane section {
        box-shadow: none !important;
      }

      .atlas-polish-assets-card-action-hidden {
        display: none !important;
      }

      .atlas-polish-assets-list-pane img {
        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;
        border-radius: 8px !important;
        object-fit: cover !important;
      }

      .atlas-polish-assets-list-pane strong {
        font-size: 14px !important;
        line-height: 1.25 !important;
        font-weight: 650 !important;
      }

      .atlas-polish-assets-list-pane small,
      .atlas-polish-assets-list-pane span {
        line-height: 1.3 !important;
      }

      .atlas-polish-status-badge {
        min-height: 22px !important;
        padding: 3px 7px !important;
        border-radius: 999px !important;
        font-size: 11px !important;
        font-weight: 650 !important;
      }

      .atlas-polish-assets-detail-pane {
        padding-right: 8px !important;
      }

      .atlas-polish-assets-detail-pane section,
      .atlas-polish-assets-detail-pane article {
        margin-top: 8px !important;
        border-radius: 10px !important;
        border-color: var(--atlas-workspace-border) !important;
      }

      .atlas-polish-assets-detail-pane [style*="grid-template-columns"] {
        column-gap: 12px !important;
        row-gap: 7px !important;
      }

      .atlas-polish-reference-section {
        padding: 10px 12px !important;
        background: #fff !important;
      }

      .atlas-polish-reference-section button {
        min-height: 32px !important;
        padding: 5px 9px !important;
      }

      .atlas-polish-reference-section article,
      .atlas-polish-reference-section section,
      .atlas-polish-reference-section > div {
        border-radius: 9px !important;
        box-shadow: none !important;
      }

      .atlas-polish-history-section {
        opacity: 0.94;
      }

      .atlas-polish-notes-root section,
      .atlas-polish-notes-root article,
      .atlas-polish-documents-root section,
      .atlas-polish-documents-root article {
        border-radius: 10px !important;
        border-color: var(--atlas-workspace-border) !important;
      }

      .atlas-polish-notes-root section,
      .atlas-polish-notes-root article {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }

      .atlas-polish-notes-search {
        min-height: 38px !important;
      }

      .atlas-polish-note-editor {
        min-height: 180px !important;
        line-height: 1.5 !important;
        padding: 12px !important;
        background: #fff !important;
      }

      .atlas-polish-documents-root article,
      .atlas-polish-documents-root section {
        box-shadow: none !important;
      }

      .atlas-polish-documents-root img {
        border-radius: 8px !important;
      }

      .atlas-polish-document-open {
        min-height: 32px !important;
        padding: 5px 9px !important;
      }

      @media (min-width: 901px) {
        .atlas-polish-assets-list-pane,
        .atlas-polish-assets-detail-pane,
        .atlas-polish-notes-list-pane,
        .atlas-polish-notes-detail-pane,
        .atlas-polish-documents-list-pane,
        .atlas-polish-documents-detail-pane {
          max-height: calc(100dvh - 150px) !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-polish-assets-list-pane img {
          width: 38px !important;
          height: 38px !important;
          min-width: 38px !important;
        }
        .atlas-polish-note-editor {
          min-height: 150px !important;
        }
      }
    `}</style>
  );
}
