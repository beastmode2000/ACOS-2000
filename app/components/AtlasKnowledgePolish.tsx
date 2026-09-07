"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === normalized(title),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function scrollablePanes(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>("div, section, aside")).filter((element) => {
    if (!isVisible(element)) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const scrollable = /auto|scroll/.test(style.overflowY) || element.scrollHeight > element.clientHeight + 20;
    return scrollable && rect.width > 180 && rect.height > 220;
  });
}

function identifyPanes(root: HTMLElement, prefix: string) {
  const panes = scrollablePanes(root).sort(
    (a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left,
  );
  if (!panes.length) return { list: null as HTMLElement | null, detail: null as HTMLElement | null };

  const list = panes[0] || null;
  const detail = panes.length > 1 ? panes[panes.length - 1] : null;
  list?.classList.add(`${prefix}-list-pane`);
  if (detail && detail !== list) detail.classList.add(`${prefix}-detail-pane`);
  return { list, detail };
}

function candidateRows(container: HTMLElement) {
  const selectors = [
    ":scope > button",
    ":scope > article",
    ":scope > [role='button']",
    ":scope > [role='listitem']",
    ":scope > div > button",
    ":scope > div > article",
  ];

  const rows = Array.from(container.querySelectorAll<HTMLElement>(selectors.join(","))).filter((element) => {
    const text = String(element.textContent || "").trim();
    if (!text || text.length > 700) return false;
    if (element.closest(".atlas-knowledge-search-bar")) return false;
    if (element.querySelector("input, textarea, select")) return false;
    return true;
  });

  return Array.from(new Set(rows));
}

function filterRows(container: HTMLElement, query: string, startsWithOnly = false) {
  const wanted = normalized(query);
  const rows = candidateRows(container);

  for (const row of rows) {
    const text = normalized(row.textContent);
    const match = !wanted || (startsWithOnly ? text.startsWith(wanted) : text.includes(wanted));
    row.classList.toggle("atlas-knowledge-filter-hidden", !match);
  }

  if (wanted && startsWithOnly) {
    const first = rows.find((row) => !row.classList.contains("atlas-knowledge-filter-hidden"));
    first?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function ensureSearchBar(
  root: HTMLElement,
  list: HTMLElement,
  kind: "manuals" | "notes",
) {
  const existing = root.querySelector<HTMLInputElement>(
    `input[data-atlas-${kind}-search], input[type="search"], input[placeholder*="Search" i]`,
  );
  if (existing) {
    existing.dataset[`atlas${kind[0].toUpperCase()}${kind.slice(1)}Search`] = "true";
    existing.classList.add("atlas-knowledge-native-search");
    if (!existing.dataset.atlasKnowledgeBound) {
      existing.dataset.atlasKnowledgeBound = "true";
      existing.addEventListener("input", () => filterRows(list, existing.value));
    }
    return existing;
  }

  let bar = list.querySelector<HTMLElement>(`.atlas-${kind}-search-bar`);
  if (!bar) {
    bar = document.createElement("div");
    bar.className = `atlas-knowledge-search-bar atlas-${kind}-search-bar`;

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = kind === "manuals" ? "Search manuals" : "Search notes";
    input.autocomplete = "off";
    input.dataset[`atlas${kind[0].toUpperCase()}${kind.slice(1)}Search`] = "true";
    input.addEventListener("input", () => filterRows(list, input.value));
    bar.appendChild(input);
    list.insertBefore(bar, list.firstChild);
  }

  return bar.querySelector<HTMLInputElement>("input");
}

function markActions(root: HTMLElement, kind: "manuals" | "notes") {
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = normalized(button.textContent).replace(/^\+\s*/, "");

    if (/^(open|open pdf|preview|view)$/.test(text)) button.classList.add("atlas-knowledge-open");
    if (/^(edit|replace)$/.test(text)) button.classList.add("atlas-knowledge-secondary");
    if (/^(delete|remove)$/.test(text)) button.classList.add("atlas-knowledge-delete");
    if (kind === "notes" && /^(add note|new note|save|save note)$/.test(text)) {
      button.classList.add("atlas-knowledge-primary");
    }
    if (kind === "manuals" && /^(add manual|new manual|upload manual)$/.test(text)) {
      button.classList.add("atlas-knowledge-primary");
    }
  }
}

function hideHelperCopy(root: HTMLElement) {
  const phrases = [
    "find plans, records, manuals",
    "select a manual",
    "choose a manual",
    "no manual selected",
    "select a note",
    "choose a note",
    "no note selected",
  ];

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("p, small, span, div"))) {
    if (element.children.length) continue;
    if (element.closest("button, label, option")) continue;
    const text = normalized(element.textContent);
    if (!text || text.length > 180) continue;
    if (phrases.some((phrase) => text.includes(phrase))) {
      element.classList.add("atlas-knowledge-helper-copy");
    }
  }
}

function polishManuals(root: HTMLElement) {
  root.classList.add("atlas-manuals-upgraded-root");
  const { list, detail } = identifyPanes(root, "atlas-manuals-upgraded");
  if (list) ensureSearchBar(root, list, "manuals");

  markActions(root, "manuals");
  hideHelperCopy(root);

  for (const iframe of Array.from(root.querySelectorAll<HTMLIFrameElement>("iframe"))) {
    iframe.classList.add("atlas-manual-pdf-preview");
  }
  for (const embed of Array.from(root.querySelectorAll<HTMLEmbedElement>("embed"))) {
    embed.classList.add("atlas-manual-pdf-preview");
  }
  for (const object of Array.from(root.querySelectorAll<HTMLObjectElement>("object"))) {
    object.classList.add("atlas-manual-pdf-preview");
  }

  if (detail) {
    for (const section of Array.from(detail.querySelectorAll<HTMLElement>("section, article"))) {
      const text = normalized(section.textContent);
      if (/manufacturer|model|asset|category|type|manual/.test(text)) {
        section.classList.add("atlas-manual-detail-section");
      }
    }
  }
}

function polishNotes(root: HTMLElement) {
  root.classList.add("atlas-notes-upgraded-root");
  const { list, detail } = identifyPanes(root, "atlas-notes-upgraded");
  if (list) ensureSearchBar(root, list, "notes");

  markActions(root, "notes");
  hideHelperCopy(root);

  for (const textarea of Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
    textarea.classList.add("atlas-notes-upgraded-editor");
  }

  for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('input[type="file"]'))) {
    input.closest("label")?.classList.add("atlas-notes-attachment-control");
  }

  if (detail) {
    for (const image of Array.from(detail.querySelectorAll<HTMLImageElement>("img"))) {
      image.classList.add("atlas-notes-upgraded-image");
    }
  }
}

export default function AtlasKnowledgePolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const manuals = pageMain("Manuals");
      if (manuals) polishManuals(manuals);

      const notes = pageMain("Notes");
      if (notes) polishNotes(notes);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        !/^[a-z0-9]$/i.test(event.key)
      ) {
        return;
      }

      const manuals = pageMain("Manuals");
      if (!manuals || !isVisible(manuals)) return;
      const list = manuals.querySelector<HTMLElement>(".atlas-manuals-upgraded-list-pane");
      const search = manuals.querySelector<HTMLInputElement>(
        "input[data-atlas-manuals-search], .atlas-manuals-search-bar input",
      );
      if (!list || !search) return;

      event.preventDefault();
      search.value = event.key;
      search.focus();
      filterRows(list, event.key, true);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("keydown", onKeyDown);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-knowledge-filter-hidden,
      .atlas-knowledge-helper-copy {
        display: none !important;
      }

      .atlas-manuals-upgraded-root,
      .atlas-notes-upgraded-root {
        --atlas-knowledge-border: #dce4ec;
        --atlas-knowledge-navy: #0b2c43;
      }

      .atlas-manuals-upgraded-root section,
      .atlas-manuals-upgraded-root article,
      .atlas-notes-upgraded-root section,
      .atlas-notes-upgraded-root article {
        border-radius: 10px !important;
        border-color: var(--atlas-knowledge-border) !important;
        box-shadow: none !important;
      }

      .atlas-knowledge-search-bar {
        position: sticky !important;
        top: 0 !important;
        z-index: 4 !important;
        padding: 6px 4px 8px !important;
        background: #fff !important;
      }

      .atlas-knowledge-search-bar input,
      .atlas-knowledge-native-search {
        width: 100% !important;
        min-height: 36px !important;
        padding: 7px 10px !important;
        border: 1px solid var(--atlas-knowledge-border) !important;
        border-radius: 8px !important;
        background: #fff !important;
        color: var(--atlas-knowledge-navy) !important;
        font: inherit !important;
        font-size: 12px !important;
        box-sizing: border-box !important;
      }

      .atlas-manuals-upgraded-list-pane button,
      .atlas-notes-upgraded-list-pane button {
        min-height: 50px !important;
        padding-top: 7px !important;
        padding-bottom: 7px !important;
        box-shadow: none !important;
      }

      .atlas-manuals-upgraded-list-pane,
      .atlas-manuals-upgraded-detail-pane,
      .atlas-notes-upgraded-list-pane,
      .atlas-notes-upgraded-detail-pane {
        scrollbar-gutter: stable !important;
        overscroll-behavior: contain !important;
      }

      .atlas-knowledge-open,
      .atlas-knowledge-secondary,
      .atlas-knowledge-delete,
      .atlas-knowledge-primary {
        min-height: 32px !important;
        padding: 5px 9px !important;
        border-radius: 8px !important;
        box-shadow: none !important;
      }

      .atlas-knowledge-primary,
      .atlas-knowledge-open {
        background: var(--atlas-knowledge-navy) !important;
        border-color: var(--atlas-knowledge-navy) !important;
        color: #fff !important;
      }

      .atlas-knowledge-delete {
        color: #9f1d20 !important;
      }

      .atlas-manual-pdf-preview {
        width: 100% !important;
        min-height: 62dvh !important;
        border: 1px solid var(--atlas-knowledge-border) !important;
        border-radius: 9px !important;
        background: #f7f9fb !important;
      }

      .atlas-manual-detail-section {
        padding: 9px !important;
      }

      .atlas-notes-upgraded-editor {
        min-height: 220px !important;
        padding: 11px !important;
        line-height: 1.5 !important;
        border-radius: 9px !important;
        background: #fff !important;
      }

      .atlas-notes-attachment-control {
        min-height: 32px !important;
      }

      .atlas-notes-upgraded-image {
        max-width: 100% !important;
        border-radius: 8px !important;
      }

      @media (min-width: 901px) {
        .atlas-manuals-upgraded-list-pane,
        .atlas-manuals-upgraded-detail-pane,
        .atlas-notes-upgraded-list-pane,
        .atlas-notes-upgraded-detail-pane {
          height: calc(100dvh - 145px) !important;
          max-height: calc(100dvh - 145px) !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
      }

      @media (max-width: 900px) {
        .atlas-manual-pdf-preview {
          min-height: 56dvh !important;
        }

        .atlas-notes-upgraded-editor {
          min-height: 170px !important;
        }
      }
    `}</style>
  );
}
