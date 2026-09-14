"use client";

import { useEffect } from "react";

export default function AtlasAssetEditAndPhotoFix() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const assetRow = target.closest<HTMLButtonElement>(".atlas-gold-hover-card > button");
      const headerEdit = target.closest<HTMLButtonElement>(".atlas-asset-inline-edit");
      if (!assetRow && !headerEdit) return;

      window.requestAnimationFrame(() => {
        const detail = document.querySelector<HTMLElement>(
          ".atlas-assets-viewport-root .atlas-assets-viewport-detail",
        );
        if (detail) detail.scrollTop = 0;
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
