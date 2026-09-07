"use client";

import { useEffect, useRef } from "react";

type AssetPhoto = {
  id?: string;
  name?: string;
  type?: string;
  contentType?: string;
  dataUrl?: string;
  url?: string;
};

type AssetRow = {
  id?: string;
  name?: string;
  title?: string;
  coverPhotoId?: string;
  photos?: AssetPhoto[];
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function activePropertyIdFromDom() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  const propertySelect = selects.find((select) => {
    const values = Array.from(select.options).map((option) => String(option.value || ""));
    return (
      values.includes("2000") &&
      values.some(
        (value) =>
          value === "4725" ||
          value === "6855" ||
          value === "3661" ||
          value.toLowerCase() === "hangar",
      )
    );
  });
  return String(propertySelect?.value || "2000");
}

function photoSource(photo: AssetPhoto | undefined) {
  if (!photo) return "";
  const dataUrl = String(photo.dataUrl || "");
  const url = String(photo.url || "");
  const type = String(photo.type || photo.contentType || "").toLowerCase();
  if (dataUrl.startsWith("data:image/")) return dataUrl;
  if (url && (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif)(\?|$)/i.test(url))) {
    return url;
  }
  return "";
}

function mainPhotoSource(asset: AssetRow) {
  const photos = Array.isArray(asset.photos) ? asset.photos : [];
  const mainId = String(asset.coverPhotoId || "");
  const selected = mainId ? photos.find((photo) => String(photo.id || "") === mainId) : undefined;
  return photoSource(selected) || photos.map(photoSource).find(Boolean) || "";
}

function isAssetsWorkspace(main: HTMLElement) {
  const heading = Array.from(main.querySelectorAll<HTMLElement>("h1")).find(Boolean);
  return normalized(heading?.textContent) === "assets";
}

function looksLikeDepartmentMain(main: HTMLElement) {
  if (isAssetsWorkspace(main)) return false;
  const text = normalized(main.textContent);
  return [
    "dock & marine",
    "dock and marine",
    "garage / vehicles",
    "garage",
    "vehicles",
    "pool & spa",
    "landscape",
    "landscaping",
    "house & maintenance",
  ].some((phrase) => text.includes(phrase));
}

function nearestAssetCard(image: HTMLImageElement, assetName: string) {
  let node: HTMLElement | null = image.parentElement;
  for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
    const text = normalized(node.textContent);
    if (text.includes(assetName) && text.length < 900) return node;
  }
  return null;
}

export default function AtlasDepartmentAssetPhotoPolish() {
  const assetPhotosRef = useRef<Map<string, string>>(new Map());
  const propertyRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    const loadAssets = async (propertyId: string) => {
      try {
        const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&departmentPhoto=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        const assets = (Array.isArray(payload?.assetRecords)
          ? payload.assetRecords
          : Array.isArray(payload?.assets)
            ? payload.assets
            : []) as AssetRow[];

        const next = new Map<string, string>();
        for (const asset of assets) {
          const name = normalized(asset.name || asset.title);
          const source = mainPhotoSource(asset);
          if (name && source) next.set(name, source);
        }
        assetPhotosRef.current = next;
        schedule();
      } catch {
        // Department photos are presentation-only. Leave the department usable if this fails.
      }
    };

    const apply = () => {
      frame = 0;
      const propertyId = activePropertyIdFromDom();
      if (propertyRef.current !== propertyId) {
        propertyRef.current = propertyId;
        assetPhotosRef.current = new Map();
        void loadAssets(propertyId);
      }

      if (!assetPhotosRef.current.size) return;

      for (const main of Array.from(document.querySelectorAll<HTMLElement>("main"))) {
        if (!looksLikeDepartmentMain(main)) continue;

        for (const image of Array.from(main.querySelectorAll<HTMLImageElement>("img"))) {
          for (const [assetName, source] of assetPhotosRef.current) {
            const card = nearestAssetCard(image, assetName);
            if (!card) continue;
            if (image.src !== source) image.src = source;
            image.removeAttribute("srcset");
            image.classList.add("atlas-department-authoritative-asset-photo");
            card.dataset.atlasAssetMainPhoto = "true";
            break;
          }
        }
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-department-authoritative-asset-photo {
        object-fit: cover !important;
      }
    `}</style>
  );
}
