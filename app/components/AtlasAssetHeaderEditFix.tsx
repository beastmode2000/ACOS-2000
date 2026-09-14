"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default function AtlasAssetHeaderEditFix() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const headerEdit = target.closest<HTMLButtonElement>(
        ".atlas-asset-inline-edit",
      );
      if (!headerEdit) return;

      const assetsHeading = Array.from(
        document.querySelectorAll<HTMLElement>("main h1"),
      ).find((node) => normalized(node.textContent) === "assets");
      const root = assetsHeading?.closest("main") as HTMLElement | null;
      if (!root) return;

      const selectedCard =
        root.querySelector<HTMLElement>(".atlas-asset-list-card-current") ||
        Array.from(root.querySelectorAll<HTMLElement>(".atlas-gold-hover-card")).find(
          (card) =>
            card.classList.contains("atlas-asset-list-card-current") ||
            card.getAttribute("style")?.includes("23, 92, 211"),
        ) ||
        null;

      if (!selectedCard) return;

      const realEdit = Array.from(
        selectedCard.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) => {
        if (button === headerEdit) return false;
        const title = normalized(button.getAttribute("title"));
        const aria = normalized(button.getAttribute("aria-label"));
        return title === "edit asset" || aria.startsWith("edit ");
      });

      if (!realEdit) return;

      event.preventDefault();
      event.stopPropagation();
      realEdit.click();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
