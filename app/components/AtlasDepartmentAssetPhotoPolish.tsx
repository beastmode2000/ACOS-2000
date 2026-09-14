"use client";

import { useEffect, useRef } from "react";

type AssetPhoto = {
  id?: string;
  assetId?: string;
  name?: string;
  type?: string;
  contentType?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
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
  if (
    url &&
    (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif)(\?|$)/i.test(url))
  ) {
    return url;
  }
  return "";
}

function isLabelOrIdentificationPhoto(photo: AssetPhoto) {
  const name = normalized(photo.name);
  return /(^|\b)(label|serial|vin|hin|plate|tag|barcode|qr|model number|id plate|data plate)(\b|$)/i.test(
    name,
  );
}

function canonicalPhotoSource(asset: AssetRow, topLevelPhotos: AssetPhoto[]) {
  const embedded = Array.isArray(asset.photos) ? asset.photos : [];
  const external = topLevelPhotos.filter(
    (photo) => String(photo.assetId || "") === String(asset.id || ""),
  );

  const seen = new Set<string>();
  const photos = [...embedded, ...external].filter((photo) => {
    const source = photoSource(photo);
    if (!source) return false;
    const key = `${String(photo.id || "")}|${source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const coverId = String(asset.coverPhotoId || "");
  const explicitCover = coverId
    ? photos.find((photo) => String(photo.id || "") === coverId)
    : undefined;
  if (explicitCover) return photoSource(explicitCover);

  const namedCover = photos.find((photo) =>
    /(^|\b)(cover|main|primary|hero)(\b|$)/i.test(String(photo.name || "")),
  );
  if (namedCover) return photoSource(namedCover);

  const normalPhoto = photos.find((photo) => !isLabelOrIdentificationPhoto(photo));
  if (normalPhoto) return photoSource(normalPhoto);

  return photoSource(photos[0]);
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

function setImageSource(image: HTMLImageElement, source: string, className: string) {
  if (!source) return;
  if (image.getAttribute("src") !== source) image.setAttribute("src", source);
  image.removeAttribute("srcset");
  image.classList.add(className);
}

function applyAssetsWorkspace(main: HTMLElement, sources: Map<string, string>) {
  const drawer = main.querySelector<HTMLElement>(".atlas-asset-drawer");
  if (drawer) {
    const selectedName = normalized(drawer.querySelector<HTMLElement>("h3")?.textContent);
    const source = sources.get(selectedName) || "";
    if (source) {
      const hero =
        drawer.querySelector<HTMLImageElement>(".atlas-asset-reference-photo") ||
        drawer.querySelector<HTMLImageElement>(".atlas-asset-reference-hero img");
      if (hero) setImageSource(hero, source, "atlas-authoritative-asset-hero-photo");
    }
  }

  for (const card of Array.from(
    main.querySelectorAll<HTMLElement>(
      ".atlas-asset-list-card-polished, button.atlas-gold-hover-card",
    ),
  )) {
    const assetName = normalized(card.querySelector<HTMLElement>("strong")?.textContent);
    const source = sources.get(assetName) || "";
    const image = card.querySelector<HTMLImageElement>("img");
    if (!source || !image) continue;
    setImageSource(image, source, "atlas-authoritative-asset-list-photo");
    card.dataset.atlasAssetMainPhoto = "true";
  }
}

export default function AtlasDepartmentAssetPhotoPolish() {
  const assetPhotosRef = useRef<Map<string, string>>(new Map());
  const propertyRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const loadAssets = async (propertyId: string) => {
      try {
        const response = await fetch(
          `/api/atlas?propertyId=${encodeURIComponent(propertyId)}&assetPhotoConsistency=${Date.now()}`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || cancelled) return;

        const assets = (Array.isArray(payload?.assetRecords)
          ? payload.assetRecords
          : Array.isArray(payload?.assets)
            ? payload.assets
            : []) as AssetRow[];
        const topLevelPhotos = (Array.isArray(payload?.photos)
          ? payload.photos
          : Array.isArray(payload?.assetPhotos)
            ? payload.assetPhotos
            : []) as AssetPhoto[];

        const next = new Map<string, string>();
        for (const asset of assets) {
          const name = normalized(asset.name || asset.title);
          const source = canonicalPhotoSource(asset, topLevelPhotos);
          if (name && source) next.set(name, source);
        }
        assetPhotosRef.current = next;
        schedule();
      } catch {
        // Photo consistency is presentation-only. Keep Atlas usable if the refresh fails.
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
        if (isAssetsWorkspace(main)) {
          applyAssetsWorkspace(main, assetPhotosRef.current);
          continue;
        }
        if (!looksLikeDepartmentMain(main)) continue;

        for (const image of Array.from(main.querySelectorAll<HTMLImageElement>("img"))) {
          for (const [assetName, source] of assetPhotosRef.current) {
            const card = nearestAssetCard(image, assetName);
            if (!card) continue;
            setImageSource(image, source, "atlas-department-authoritative-asset-photo");
            card.dataset.atlasAssetMainPhoto = "true";
            break;
          }
        }
      }
    };

    const refresh = () => {
      const propertyId = activePropertyIdFromDom();
      propertyRef.current = propertyId;
      void loadAssets(propertyId);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("atlas:data-changed", refresh as EventListener);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-department-authoritative-asset-photo,
      .atlas-authoritative-asset-list-photo {
        object-fit: cover !important;
      }

      .atlas-authoritative-asset-hero-photo {
        object-fit: contain !important;
      }
    `}</style>
  );
}
