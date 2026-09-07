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

function hiddenMainPhotoSection(drawer: HTMLElement) {
  return drawer.querySelector<HTMLElement>(":scope > .atlas-location-main-photo-section");
}

function findSectionButton(section: HTMLElement | null, labels: string[]) {
  if (!section) return null;
  return (
    Array.from(section.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      labels.includes(normalized(button.textContent)),
    ) || null
  );
}

function editMainPhoto(drawer: HTMLElement) {
  const section = hiddenMainPhotoSection(drawer);
  const edit = findSectionButton(section, ["edit"]);
  if (edit) {
    edit.click();
    return;
  }

  findSectionButton(section, ["add photo", "replace"])?.click();
}

function deleteMainPhoto(drawer: HTMLElement) {
  const section = hiddenMainPhotoSection(drawer);
  findSectionButton(section, ["remove", "delete"])?.click();
}

function ensureHeaderThumb(drawer: HTMLElement) {
  let thumb = drawer.querySelector<HTMLElement>(".atlas-location-detail-thumb");
  if (thumb) return thumb;

  const heading = drawer.querySelector<HTMLElement>("h3");
  const titleBlock = heading?.parentElement as HTMLElement | null;
  const titleRow = titleBlock?.parentElement as HTMLElement | null;
  if (!heading || !titleBlock || !titleRow) return null;

  thumb = document.createElement("div");
  thumb.className = "atlas-location-detail-thumb atlas-location-main-photo-control";
  thumb.textContent = (heading.textContent || "LO").trim().slice(0, 2).toUpperCase();
  titleRow.insertBefore(thumb, titleBlock);
  return thumb;
}

function syncDeleteButton(thumb: HTMLElement, drawer: HTMLElement, hasPhoto: boolean) {
  let deleteButton = thumb.querySelector<HTMLButtonElement>(
    ":scope > .atlas-location-main-photo-delete",
  );

  if (!hasPhoto) {
    deleteButton?.remove();
    return;
  }

  if (!deleteButton) {
    deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "atlas-location-main-photo-delete";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete main photo";
    deleteButton.setAttribute("aria-label", "Delete main location photo");
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteMainPhoto(drawer);
    });
    thumb.appendChild(deleteButton);
  }
}

function activateMainPhotoControl(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const drawer = detailPanel?.querySelector<HTMLElement>('div[tabindex="0"]');
  if (!drawer) return;

  const section = hiddenMainPhotoSection(drawer);
  if (!section) return;

  section.classList.add("atlas-location-main-photo-section-hidden");

  const thumb = ensureHeaderThumb(drawer);
  if (!thumb) return;

  const image = section.querySelector<HTMLImageElement>(".atlas-location-main-photo-image");
  const photoUrl = image?.currentSrc || image?.src || "";
  const hasPhoto = Boolean(photoUrl);
  const headingText = drawer.querySelector<HTMLElement>("h3")?.textContent || "LO";

  thumb.classList.add("atlas-location-main-photo-control");
  thumb.tabIndex = 0;
  thumb.setAttribute("role", "button");
  thumb.setAttribute(
    "aria-label",
    hasPhoto ? "Edit main location photo" : "Add main location photo",
  );
  thumb.title = hasPhoto ? "Edit main photo" : "Add main photo";
  thumb.dataset.atlasMainPhotoState = hasPhoto ? "photo" : "empty";

  if (hasPhoto) {
    thumb.textContent = "";
    thumb.style.setProperty(
      "--atlas-authoritative-main-photo",
      `url("${photoUrl.replace(/"/g, "%22")}")`,
    );
  } else {
    thumb.style.removeProperty("--atlas-authoritative-main-photo");
    const deleteButton = thumb.querySelector<HTMLElement>(
      ":scope > .atlas-location-main-photo-delete",
    );
    thumb.textContent = headingText.trim().slice(0, 2).toUpperCase();
    if (deleteButton) thumb.appendChild(deleteButton);
  }

  syncDeleteButton(thumb, drawer, hasPhoto);

  if (thumb.dataset.atlasMainPhotoBound === "true") return;
  thumb.dataset.atlasMainPhotoBound = "true";

  thumb.addEventListener("click", (event) => {
    if ((event.target as HTMLElement | null)?.closest(".atlas-location-main-photo-delete")) return;
    event.preventDefault();
    event.stopPropagation();
    editMainPhoto(drawer);
  });

  thumb.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    editMainPhoto(drawer);
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

      .atlas-location-detail-thumb.atlas-location-main-photo-control {
        position: relative !important;
        width: 76px !important;
        height: 76px !important;
        min-width: 76px !important;
        min-height: 76px !important;
        flex: 0 0 76px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid #d5dee8 !important;
        border-radius: 16px !important;
        background-color: #f4f7fb !important;
        color: #60748a !important;
        font-size: 14px !important;
        font-weight: 900 !important;
        cursor: pointer !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        transition: border-color 140ms ease, box-shadow 140ms ease !important;
      }

      .atlas-location-main-photo-control[data-atlas-main-photo-state="photo"] {
        background-image: var(--atlas-authoritative-main-photo) !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        color: transparent !important;
      }

      .atlas-location-main-photo-control[data-atlas-main-photo-state="empty"] {
        background-image: none !important;
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
        left: 5px;
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

      .atlas-location-main-photo-delete {
        position: absolute !important;
        top: 5px !important;
        right: 5px !important;
        z-index: 3 !important;
        width: 22px !important;
        height: 22px !important;
        min-width: 22px !important;
        min-height: 22px !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid rgba(255, 255, 255, 0.82) !important;
        border-radius: 999px !important;
        background: rgba(11, 44, 67, 0.88) !important;
        color: #ffffff !important;
        font-size: 15px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        box-shadow: 0 1px 4px rgba(11, 44, 67, 0.22) !important;
      }

      @media (max-width: 900px) {
        .atlas-location-detail-thumb.atlas-location-main-photo-control {
          width: 68px !important;
          height: 68px !important;
          min-width: 68px !important;
          min-height: 68px !important;
          flex-basis: 68px !important;
        }
      }
    `}</style>
  );
}
