"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function locationsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "locations",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function findPhotoAction(section: HTMLElement | null) {
  if (!section) return null;

  const buttons = Array.from(section.querySelectorAll<HTMLButtonElement>("button"));
  const edit = buttons.find((button) => normalized(button.textContent) === "edit");
  if (edit) return edit;

  return buttons.find((button) => {
    const text = normalized(button.textContent);
    return text === "add photo" || text === "replace";
  }) || null;
}

function activateMainPhotoControl(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const drawer = detailPanel?.querySelector<HTMLElement>('div[tabindex="0"]');
  if (!drawer) return;

  const thumb = drawer.querySelector<HTMLElement>(".atlas-location-detail-thumb");
  const section = drawer.querySelector<HTMLElement>(":scope > .atlas-location-main-photo-section");
  if (!thumb || !section) return;

  section.classList.add("atlas-location-main-photo-section-hidden");

  const image = section.querySelector<HTMLImageElement>(".atlas-location-main-photo-image");
  const hasPhoto = Boolean(image?.src);

  thumb.classList.add("atlas-location-main-photo-control");
  thumb.tabIndex = 0;
  thumb.setAttribute("role", "button");
  thumb.setAttribute(
    "aria-label",
    hasPhoto ? "Edit main location photo" : "Add main location photo",
  );
  thumb.title = hasPhoto ? "Edit main photo" : "Add main photo";
  thumb.dataset.atlasMainPhotoState = hasPhoto ? "photo" : "empty";

  if (thumb.dataset.atlasMainPhotoBound === "true") return;
  thumb.dataset.atlasMainPhotoBound = "true";

  const activate = () => {
    const currentSection = drawer.querySelector<HTMLElement>(
      ":scope > .atlas-location-main-photo-section",
    );
    findPhotoAction(currentSection)?.click();
  };

  thumb.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    activate();
  });

  thumb.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  });
}

export default function AtlasLocationMainPhotoControl() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const root = locationsMain();
      if (root) activateMainPhotoControl(root);
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
      .atlas-location-main-photo-section-hidden {
        display: none !important;
      }

      .atlas-location-main-photo-control {
        position: relative !important;
        cursor: pointer !important;
        overflow: hidden !important;
        transition: border-color 140ms ease, box-shadow 140ms ease !important;
      }

      .atlas-location-main-photo-control:hover,
      .atlas-location-main-photo-control:focus-visible {
        border-color: #c99a3d !important;
        box-shadow: 0 0 0 2px rgba(201, 154, 61, 0.16) !important;
        outline: none !important;
      }

      .atlas-location-main-photo-control[data-atlas-main-photo-state="empty"]::after {
        content: "+";
        position: absolute;
        right: 5px;
        bottom: 4px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #0b2c43;
        color: #ffffff;
        font-size: 14px;
        font-weight: 900;
        line-height: 1;
        box-shadow: 0 1px 4px rgba(11, 44, 67, 0.22);
        pointer-events: none;
      }

      .atlas-location-main-photo-control[data-atlas-main-photo-state="photo"]::after {
        content: "Edit";
        position: absolute;
        right: 5px;
        bottom: 4px;
        min-width: 28px;
        height: 20px;
        padding: 0 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(11, 44, 67, 0.86);
        color: #ffffff;
        font-size: 9px;
        font-weight: 900;
        line-height: 1;
        opacity: 0;
        transition: opacity 120ms ease;
        pointer-events: none;
      }

      .atlas-location-main-photo-control[data-atlas-main-photo-state="photo"]:hover::after,
      .atlas-location-main-photo-control[data-atlas-main-photo-state="photo"]:focus-visible::after {
        opacity: 1;
      }
    `}</style>
  );
}
