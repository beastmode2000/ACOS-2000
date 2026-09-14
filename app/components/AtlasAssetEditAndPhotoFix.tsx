"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function AtlasAssetEditAndPhotoFix() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clicked = target.closest<HTMLButtonElement>("button");
      if (!clicked) return;

      const isPolishedAssetEdit =
        clicked.classList.contains("atlas-asset-inline-edit") ||
        (normalized(clicked.textContent) === "edit" &&
          Boolean(clicked.closest(".atlas-asset-reference-hero")));

      if (!isPolishedAssetEdit) return;

      const drawer = clicked.closest<HTMLElement>(
        ".atlas-asset-reference-drawer, .atlas-asset-drawer",
      );
      if (!drawer) return;

      const nativeEdit = Array.from(
        drawer.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) => {
        if (button === clicked || button.classList.contains("atlas-asset-inline-action")) {
          return false;
        }
        const aria = normalized(button.getAttribute("aria-label"));
        const title = normalized(button.getAttribute("title"));
        const text = normalized(button.textContent);
        return aria === "edit asset" || title === "edit asset" || text === "edit asset";
      });

      if (!nativeEdit) return;

      event.preventDefault();
      event.stopPropagation();
      nativeEdit.click();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <style jsx global>{`
      .atlas-asset-reference-root .atlas-asset-reference-hero {
        grid-template-columns: minmax(0, 1fr) 168px !important;
        align-items: start !important;
      }

      .atlas-asset-reference-root .atlas-asset-reference-photo {
        display: block !important;
        width: 168px !important;
        height: 118px !important;
        max-width: 168px !important;
        max-height: 118px !important;
        aspect-ratio: auto !important;
        object-fit: contain !important;
        object-position: center !important;
        background: #ffffff !important;
        border: 1px solid #dce5ed !important;
        border-radius: 10px !important;
      }

      @media (max-width: 900px) {
        .atlas-asset-reference-root .atlas-asset-reference-hero {
          grid-template-columns: minmax(0, 1fr) 104px !important;
        }

        .atlas-asset-reference-root .atlas-asset-reference-photo {
          width: 104px !important;
          height: 82px !important;
          max-width: 104px !important;
          max-height: 82px !important;
        }
      }
    `}</style>
  );
}
