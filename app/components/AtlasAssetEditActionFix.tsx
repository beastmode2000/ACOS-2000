"use client";

import { useEffect } from "react";

export default function AtlasAssetEditActionFix() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const proxy = target.closest<HTMLButtonElement>(
        ".atlas-asset-inline-edit",
      );
      if (!proxy) return;

      const drawer = proxy.closest<HTMLElement>(".atlas-asset-drawer");
      if (!drawer) return;

      const liveEditButton = Array.from(
        drawer.querySelectorAll<HTMLButtonElement>('button[aria-label="Edit asset"]'),
      ).find((button) => button !== proxy);

      if (!liveEditButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      liveEditButton.click();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
