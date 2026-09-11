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

function hideLegacyLoadStatus() {
  const legacyPhrases = [
    "loading atlas records",
    "loading atlas records...",
    "no unsaved atlas changes",
    "no unsaved atlas changes.",
  ];

  for (const element of Array.from(
    document.querySelectorAll<HTMLElement>("header *, main > div *, body > div *"),
  )) {
    if (element.children.length > 0) continue;
    const text = normalized(element.textContent);
    if (!text) continue;
    if (!legacyPhrases.includes(text)) continue;
    element.classList.add("atlas-legacy-load-status-hidden");
    element.setAttribute("aria-hidden", "true");
  }
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

function markExplanatoryText(root: HTMLElement) {
  const exactPhrases = [
    "assets remain separate records; this only assigns their physical location.",
    "open work linked to this asset.",
    "open work linked to this location.",
    "choose the immediate physical area above this location.",
    "add only the information this location needs",
    "no assets are assigned to this location.",
    "no work history is linked yet.",
    "no immediate location issues are recorded.",
    "assets are assigned here, but no location documents are linked yet.",
    "open a location to see its information, photos, and assets.",
    "select a location.",
    "add the first location photo",
    "paste an image, use add photo, or drop an image into this panel.",
    "assets remain separate records",
    "this only assigns their physical location.",
    "use this to",
    "choose or type",
  ];

  const startsWithPhrases = [
    "open work linked to",
    "assets remain separate records",
    "choose the immediate physical area",
    "add only the information",
    "no immediate location issues",
    "atlas will not move or delete",
  ];

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>("p, small, span, div"),
  )) {
    if (element.children.length > 0) continue;
    if (element.closest("button, label, option")) continue;
    const text = normalized(element.textContent);
    if (!text || text.length > 180) continue;

    const exact = exactPhrases.some(
      (phrase) => text === phrase || text.includes(phrase),
    );
    const startsWith = startsWithPhrases.some((phrase) => text.startsWith(phrase));
    if (!exact && !startsWith) continue;

    element.classList.add("atlas-polish-explanatory-text");
  }
}

function polishLocations(root: HTMLElement) {
  root.classList.add("atlas-polish-locations-root");

  for (const label of Array.from(root.querySelectorAll<HTMLLabelElement>("label"))) {
    const labelText = Array.from(label.querySelectorAll<HTMLElement>("span"))
      .map((node) => normalized(node.textContent))
      .find(Boolean);
    if (labelText === "description") {
      label.classList.add("atlas-polish-location-description");
    }
  }

  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const drawer = detailPanel?.querySelector<HTMLElement>('div[tabindex="0"]');
  if (!drawer) return;

  const infoBlock = drawer.firstElementChild as HTMLElement | null;
  if (!infoBlock) return;

  const directParagraphs = Array.from(infoBlock.children).filter(
    (child): child is HTMLParagraphElement => child instanceof HTMLParagraphElement,
  );

  if (directParagraphs.length >= 2) {
    directParagraphs[0].classList.add("atlas-polish-location-description");
    return;
  }

  const relationWords = /\b(next to|adjacent|near|beside|across from|between|located|location is|by the|off the|under|above|below)\b/i;
  for (const paragraph of directParagraphs) {
    if (relationWords.test(paragraph.textContent || "")) {
      paragraph.classList.add("atlas-polish-location-description");
    }
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

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const value = normalized(button.textContent).replace(/^\+\s*/, "");
    if (value === "add note" || value === "new note") {
      button.classList.add("atlas-polish-note-primary");
    }
    if (value === "save" || value === "save note") {
      button.classList.add("atlas-polish-note-save");
    }
    if (value === "delete" || value === "delete note") {
      button.classList.add("atlas-polish-note-delete");
    }
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
      hideLegacyLoadStatus();
      hideProceduresNavigation();

      const notes = pageMain("notes");
      if (notes) polishNotes(notes);

      const documents = pageMain("documents");
      if (documents) polishDocuments(documents);

      const locations = pageMain("locations");
      if (locations) polishLocations(locations);

      for (const title of [
        "dashboard",
        "notes",
        "work",
        "assets",
        "locations",
        "calendar",
        "contacts",
        "vendors",
        "team",
        "owner report",
      ]) {
        const root = pageMain(title);
        if (root) markExplanatoryText(root);
      }
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

      .atlas-polish-empty-secondary,
      .atlas-polish-explanatory-text,
      .atlas-polish-location-description {
        display: none !important;
      }

      .atlas-legacy-load-status-hidden {
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
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }

      .atlas-polish-notes-root button {
        box-shadow: none !important;
      }

      .atlas-polish-notes-search {
        min-height: 36px !important;
        background: #fff !important;
      }

      .atlas-polish-note-editor {
        min-height: 150px !important;
        line-height: 1.5 !important;
        padding: 11px !important;
        background: #fff !important;
      }

      .atlas-polish-note-primary,
      .atlas-polish-note-save {
        min-height: 32px !important;
        padding: 5px 9px !important;
      }

      .atlas-polish-note-delete {
        min-height: 30px !important;
        padding: 4px 8px !important;
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
        .atlas-polish-notes-detail-pane {
          height: calc(100dvh - 150px) !important;
          max-height: calc(100dvh - 150px) !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }

        .atlas-polish-documents-list-pane,
        .atlas-polish-documents-detail-pane {
          max-height: calc(100dvh - 150px) !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-polish-note-editor {
          min-height: 140px !important;
        }
      }
    `}</style>
  );
}
