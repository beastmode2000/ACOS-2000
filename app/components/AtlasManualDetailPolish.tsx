"use client";

import { useEffect } from "react";

function text(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase();
}

function visible(element: HTMLElement | null) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function manualsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === "manuals" && visible(node),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function findManualDetail(root: HTMLElement) {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))
    .filter((element) => {
      if (!visible(element)) return false;
      const heading = element.querySelector<HTMLElement>(":scope > h2, :scope > h3, h2");
      if (!heading || normalized(heading.textContent) === "manuals") return false;
      const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>("button"));
      return buttons.some((button) => normalized(button.textContent) === "edit");
    })
    .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
  return candidates[0] || null;
}

function manualTitle(detail: HTMLElement) {
  return detail.querySelector<HTMLElement>("h2, h3");
}

function selectedManualRow(root: HTMLElement, title: string) {
  const wanted = normalized(title);
  if (!wanted) return null;

  const rows = Array.from(
    root.querySelectorAll<HTMLElement>("button, article, [role='button'], [role='listitem']"),
  ).filter((element) => {
    if (!visible(element) || detailAncestor(element)) return false;
    const strongs = Array.from(element.querySelectorAll<HTMLElement>("strong"));
    return strongs.some((strong) => normalized(strong.textContent) === wanted);
  });

  return rows
    .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0] || null;
}

function detailAncestor(element: HTMLElement) {
  return Boolean(element.closest(".atlas-manual-detail-panel"));
}

function likelyLinkedAsset(row: HTMLElement | null, title: string) {
  if (!row) return "";
  const values = Array.from(row.querySelectorAll<HTMLElement>("strong, span, p, div"))
    .filter((element) => !element.children.length)
    .map((element) => text(element.textContent))
    .filter(Boolean)
    .filter((value) => normalized(value) !== normalized(title))
    .filter((value) => !/manuals?$/i.test(value))
    .filter((value) => !/^manufacturer\b/i.test(value))
    .filter((value) => !/^pdf$/i.test(value))
    .filter((value) => !/^\d+\s+files?$/i.test(value))
    .filter((value) => !/^(open|details|edit|delete)$/i.test(value));

  return values.find((value) => /\s[-–—]\s/.test(value)) || values.find((value) => value.length > 2) || "";
}

function polishManualDetail() {
  const root = manualsMain();
  if (!root) return;

  const detail = findManualDetail(root);
  if (!detail) return;
  detail.classList.add("atlas-manual-detail-panel");

  const title = manualTitle(detail);
  if (!title) return;
  title.classList.add("atlas-manual-detail-title");

  const titleText = text(title.textContent);
  const row = selectedManualRow(root, titleText);
  const linkedAsset = likelyLinkedAsset(row, titleText);

  let line = detail.querySelector<HTMLElement>(".atlas-manual-detail-linked-asset-line");
  if (linkedAsset) {
    if (!line) {
      line = document.createElement("div");
      line.className = "atlas-manual-detail-linked-asset-line";
      title.insertAdjacentElement("afterend", line);
    }
    const nextText = `Linked Asset: ${linkedAsset}`;
    if (line.textContent !== nextText) line.textContent = nextText;
  } else {
    line?.remove();
  }

  for (const element of Array.from(detail.querySelectorAll<HTMLElement>("div, span, p"))) {
    if (element.children.length) continue;
    const value = normalized(element.textContent);
    if (value === "manufacturer not recorded" || value === "manufacturer") {
      element.classList.add("atlas-manual-detail-secondary-meta");
    }
  }
}

export default function AtlasManualDetailPolish() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      polishManualDetail();
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
      .atlas-manual-detail-panel {
        min-width: 0 !important;
      }

      .atlas-manual-detail-title {
        margin: 0 !important;
        font-size: 18px !important;
        line-height: 1.22 !important;
        font-weight: 700 !important;
        color: #0a2841 !important;
      }

      .atlas-manual-detail-linked-asset-line {
        margin-top: 4px !important;
        color: #536678 !important;
        font-size: 12px !important;
        line-height: 1.35 !important;
        font-weight: 600 !important;
      }

      .atlas-manual-detail-secondary-meta {
        color: #718096 !important;
        font-size: 11px !important;
      }

      @media (max-width: 900px) {
        .atlas-manual-detail-title {
          font-size: 17px !important;
        }
      }
    `}</style>
  );
}
