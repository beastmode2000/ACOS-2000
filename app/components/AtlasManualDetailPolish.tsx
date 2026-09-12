"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function findManualDetailSection() {
  const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>("h2"));
  for (const heading of headings) {
    const section = heading.closest<HTMLElement>("section");
    if (!section) continue;
    const buttons = Array.from(section.querySelectorAll<HTMLButtonElement>("button"));
    const labels = buttons.map((button) => normalized(button.textContent));
    if (labels.includes("back") && labels.includes("edit") && labels.includes("save")) {
      return section;
    }
  }
  return null;
}

function polishManualDetail() {
  const section = findManualDetailSection();
  if (!section) return;

  section.classList.add("atlas-manual-detail-summary");

  const title = section.querySelector<HTMLHeadingElement>("h2");
  title?.classList.add("atlas-manual-detail-title");

  const eyebrow = Array.from(section.querySelectorAll<HTMLElement>("div")).find(
    (element) => normalized(element.textContent) === "document" && !element.querySelector("*")
  );
  if (eyebrow) {
    eyebrow.textContent = "Manual";
    eyebrow.classList.add("atlas-manual-detail-eyebrow");
  }

  const relationshipButtons = Array.from(section.querySelectorAll<HTMLButtonElement>("button")).filter((button) => {
    const label = button.querySelector<HTMLElement>("span");
    const value = normalized(label?.textContent);
    return value === "linked to" || value === "files" || value === "work orders" || value === "property" || value === "linked asset";
  });

  relationshipButtons.forEach((button) => {
    const label = button.querySelector<HTMLElement>("span");
    const labelText = normalized(label?.textContent);
    if (labelText === "linked to" || labelText === "linked asset") {
      button.classList.add("atlas-manual-linked-asset");
      if (label) label.textContent = "Linked Asset";
    } else {
      button.classList.add("atlas-manual-summary-extra");
    }
  });

  const relationshipGrid = relationshipButtons[0]?.parentElement;
  relationshipGrid?.classList.add("atlas-manual-relationship-row");
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
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-manual-detail-summary {
        padding: 12px 14px !important;
        border-radius: 12px !important;
        box-shadow: none !important;
      }

      .atlas-manual-detail-eyebrow {
        margin-bottom: 2px !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }

      .atlas-manual-detail-title {
        margin: 0 !important;
        font-size: 18px !important;
        line-height: 1.22 !important;
        font-weight: 700 !important;
        color: #0a2841 !important;
      }

      .atlas-manual-relationship-row {
        display: block !important;
        margin-top: 7px !important;
      }

      .atlas-manual-summary-extra {
        display: none !important;
      }

      .atlas-manual-linked-asset {
        display: block !important;
        width: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .atlas-manual-linked-asset span {
        display: inline !important;
        margin-right: 5px !important;
        color: #6b7c8c !important;
        font-size: 11px !important;
        font-weight: 600 !important;
      }

      .atlas-manual-linked-asset strong {
        display: inline !important;
        color: #0a2841 !important;
        font-size: 12px !important;
        font-weight: 650 !important;
      }

      @media (max-width: 900px) {
        .atlas-manual-detail-summary {
          padding: 10px 11px !important;
        }

        .atlas-manual-detail-title {
          font-size: 17px !important;
        }
      }
    `}</style>
  );
}
