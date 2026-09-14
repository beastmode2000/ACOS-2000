"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function assetsMain() {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1"));
  const heading = headings.find((node) => normalized(node.textContent) === "assets");
  return (heading?.closest("main") as HTMLElement | null) || null;
}

export default function AtlasAssetListActionsPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const root = assetsMain();
      if (!root) return;

      for (const card of Array.from(root.querySelectorAll<HTMLElement>(".atlas-gold-hover-card"))) {
        const favorite = Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
          normalized(button.getAttribute("aria-label")).includes("favorites"),
        );
        favorite?.classList.add("atlas-asset-list-favorite-action");

        const edit = Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
          normalized(button.getAttribute("aria-label")).startsWith("edit "),
        );
        const work = Array.from(card.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
          normalized(button.getAttribute("aria-label")).startsWith("create work order for "),
        );

        if (!edit || !work || edit.parentElement !== work.parentElement) continue;
        const host = edit.parentElement as HTMLElement;
        host.classList.add("atlas-asset-list-actions-native");

        let select = host.querySelector<HTMLSelectElement>(".atlas-asset-list-actions-mobile");
        if (!select) {
          select = document.createElement("select");
          select.className = "atlas-asset-list-actions-mobile";
          select.setAttribute("aria-label", "Asset actions");
          select.innerHTML =
            '<option value="">Actions</option><option value="edit">Edit</option><option value="work">Work Order</option>';
          select.addEventListener("click", (event) => event.stopPropagation());
          select.addEventListener("change", (event) => {
            event.stopPropagation();
            const value = select?.value || "";
            select!.value = "";
            if (value === "edit") edit.click();
            if (value === "work") work.click();
          });
          host.appendChild(select);
        }
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-assets-viewport-root .atlas-asset-list-favorite-action {
        display: none !important;
      }

      .atlas-asset-list-actions-mobile {
        display: none !important;
      }

      @media (max-width: 900px) {
        .atlas-assets-viewport-root .atlas-asset-list-actions-native > button {
          display: none !important;
        }

        .atlas-assets-viewport-root .atlas-asset-list-actions-mobile {
          display: block !important;
          width: 78px !important;
          height: 30px !important;
          min-height: 30px !important;
          margin: 0 !important;
          padding: 3px 20px 3px 7px !important;
          border: 1px solid #cfd9e4 !important;
          border-radius: 7px !important;
          background: #ffffff !important;
          color: #17334f !important;
          font: inherit !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          box-sizing: border-box !important;
        }
      }
    `}</style>
  );
}
