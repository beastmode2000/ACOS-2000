"use client";

import { useEffect } from "react";

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

function polishNotes(root: HTMLElement) {
  root.classList.add("atlas-polish-notes-root");
  markScrollablePanes(root, "atlas-polish-notes");
  markEmptySecondarySections(root);

  const search = root.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search" i]');
  search?.classList.add("atlas-polish-notes-search");

  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    textarea.classList.add("atlas-polish-note-editor");
  }
}

function polishDocuments(root: HTMLElement) {
  root.classList.add("atlas-polish-documents-root");
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
      .atlas-polish-notes-root,
      .atlas-polish-documents-root {
        --atlas-workspace-border: #dce4ec;
      }

      .atlas-polish-empty-secondary {
        display: none !important;
      }

      .atlas-polish-notes-list-pane,
      .atlas-polish-notes-detail-pane,
      .atlas-polish-documents-list-pane,
      .atlas-polish-documents-detail-pane {
        scrollbar-gutter: stable;
        overscroll-behavior: contain;
      }

      .atlas-polish-notes-root section,
      .atlas-polish-notes-root article,
      .atlas-polish-documents-root section,
      .atlas-polish-documents-root article {
        border-radius: 10px !important;
        border-color: var(--atlas-workspace-border) !important;
        box-shadow: none !important;
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

      .atlas-polish-documents-root img {
        border-radius: 8px !important;
      }

      .atlas-polish-document-open {
        min-height: 32px !important;
        padding: 5px 9px !important;
      }

      @media (min-width: 901px) {
        .atlas-polish-notes-list-pane,
        .atlas-polish-notes-detail-pane,
        .atlas-polish-documents-list-pane,
        .atlas-polish-documents-detail-pane {
          max-height: calc(100dvh - 150px) !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-polish-note-editor {
          min-height: 150px !important;
        }
      }
    `}</style>
  );
}
