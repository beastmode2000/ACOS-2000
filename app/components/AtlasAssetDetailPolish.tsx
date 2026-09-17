"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PhotoRecord = {
  id: string;
  assetId?: string;
  name?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

type AssetRecord = {
  id: string;
  name: string;
};

type AtlasPayload = {
  ok?: boolean;
  assetRecords?: AssetRecord[];
  photos?: PhotoRecord[];
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function assetsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "assets",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>(
    'select[aria-label="Active property"]',
  );
  if (labelled?.value) return labelled.value;

  const candidate = Array.from(
    document.querySelectorAll<HTMLSelectElement>("select"),
  ).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function findButton(scope: ParentNode, label: string) {
  const wanted = normalized(label);
  return (
    Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => normalized(button.textContent) === wanted,
    ) || null
  );
}

function findPhotoSection(drawer: HTMLElement | null) {
  if (!drawer) return null;
  return (
    Array.from(drawer.querySelectorAll<HTMLElement>("section")).find(
      (section) => normalized(section.querySelector("strong")?.textContent) === "photos",
    ) || null
  );
}

function selectedAssetName(drawer: HTMLElement | null) {
  if (!drawer) return "";
  return (
    drawer.querySelector<HTMLElement>(".atlas-asset-reference-title-line h2")?.textContent?.trim() ||
    drawer.querySelector<HTMLElement>("h3")?.textContent?.trim() ||
    ""
  );
}

export default function AtlasAssetDetailPolish() {
  const [tabHost, setTabHost] = useState<HTMLElement | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  const [listHost, setListHost] = useState<HTMLElement | null>(null);
  const [drawer, setDrawer] = useState<HTMLElement | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [assetName, setAssetName] = useState("");
  const [payload, setPayload] = useState<AtlasPayload | null>(null);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [preview, setPreview] = useState<PhotoRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const addInProgress = useRef(false);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const root = assetsMain();
      if (!root) {
        setDrawer(null);
        setTabHost(null);
        setPanelHost(null);
        setListHost(null);
        return;
      }

      const nextPropertyId = currentPropertyId();
      setPropertyId((current) => (current === nextPropertyId ? current : nextPropertyId));

      const nextDrawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
      setDrawer((current) => (current === nextDrawer ? current : nextDrawer));

      if (nextDrawer) {
        const nextName = selectedAssetName(nextDrawer);
        setAssetName((current) => (current === nextName ? current : nextName));

        const editing = Boolean(findButton(nextDrawer, "Save Changes"));
        nextDrawer.classList.toggle("atlas-asset-detail-editing", editing);
        nextDrawer.classList.toggle("atlas-asset-photos-open", photosOpen && !editing);

        for (const button of Array.from(nextDrawer.querySelectorAll<HTMLButtonElement>("button"))) {
          const text = normalized(button.textContent);
          if (text === "customize") {
            button.style.setProperty("display", "none", "important");
          }
          if (text === "add asset") {
            button.style.setProperty("display", "none", "important");
          }
        }

        const tabs = nextDrawer.querySelector<HTMLElement>(".atlas-asset-reference-tabs");
        if (tabs) {
          let host = tabs.querySelector<HTMLElement>("[data-atlas-asset-photo-tab-host]");
          if (!host) {
            host = document.createElement("div");
            host.dataset.atlasAssetPhotoTabHost = "true";
            host.style.display = "contents";
            tabs.appendChild(host);
          }
          setTabHost((current) => (current === host ? current : host));

          let contentHost = nextDrawer.querySelector<HTMLElement>(
            "[data-atlas-asset-photo-panel-host]",
          );
          if (!contentHost) {
            contentHost = document.createElement("div");
            contentHost.dataset.atlasAssetPhotoPanelHost = "true";
            tabs.parentElement?.insertBefore(contentHost, tabs.nextSibling);
          }
          setPanelHost((current) => (current === contentHost ? current : contentHost));
        } else {
          setTabHost(null);
          setPanelHost(null);
        }
      }

      const search = root.querySelector<HTMLInputElement>('input[placeholder*="Search assets" i]');
      const searchRow = search?.parentElement || null;
      if (searchRow) {
        let host = searchRow.querySelector<HTMLElement>("[data-atlas-asset-add-host]");
        if (!host) {
          host = document.createElement("span");
          host.dataset.atlasAssetAddHost = "true";
          host.style.display = "inline-flex";
          host.style.flex = "0 0 auto";
          searchRow.appendChild(host);
        }
        setListHost((current) => (current === host ? current : host));
      } else {
        setListHost(null);
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
  }, [photosOpen]);

  useEffect(() => {
    if (!drawer) return;
    const handleNativeTab = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".atlas-asset-reference-tab")) return;
      if (target.closest("[data-atlas-asset-photo-tab-host]")) return;
      setPhotosOpen(false);
    };
    drawer.addEventListener("click", handleNativeTab, true);
    return () => drawer.removeEventListener("click", handleNativeTab, true);
  }, [drawer]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        );
        const data = (await response.json().catch(() => ({}))) as AtlasPayload;
        if (!cancelled && response.ok && data?.ok !== false) setPayload(data);
      } catch {
        if (!cancelled) setPayload(null);
      }
    };

    void load();
    const refresh = () => {
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => void load(), 350);
      window.setTimeout(() => void load(), 1400);
    };
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [propertyId, assetName, refreshKey]);

  useEffect(() => {
    setPhotosOpen(false);
    setPreview(null);
  }, [assetName]);

  const selectedAsset = useMemo(() => {
    const wanted = normalized(assetName);
    return (
      (payload?.assetRecords || []).find((asset) => normalized(asset.name) === wanted) || null
    );
  }, [payload, assetName]);

  const assetPhotos = useMemo(() => {
    if (!selectedAsset) return [];
    return (payload?.photos || [])
      .filter((photo) => photo.assetId === selectedAsset.id)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [payload, selectedAsset]);

  const triggerNativePhotoInput = (camera: boolean) => {
    const section = findPhotoSection(drawer);
    if (!section) return;
    const inputs = Array.from(section.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    const input = camera
      ? inputs.find((candidate) => candidate.hasAttribute("capture"))
      : inputs.find((candidate) => candidate.multiple && !candidate.hasAttribute("capture"));
    if (!input) return;
    input.addEventListener(
      "change",
      () => {
        window.setTimeout(() => setRefreshKey((value) => value + 1), 900);
        window.setTimeout(() => setRefreshKey((value) => value + 1), 2200);
      },
      { once: true },
    );
    input.click();
  };

  const triggerNativePaste = () => {
    const section = findPhotoSection(drawer);
    const paste = section ? findButton(section, "Paste") : null;
    paste?.click();
  };

  const deletePhoto = (photo: PhotoRecord) => {
    const section = findPhotoSection(drawer);
    if (!section) return;
    const rows = Array.from(section.querySelectorAll<HTMLElement>("div"));
    const row = rows.find((candidate) =>
      Array.from(candidate.querySelectorAll<HTMLButtonElement>("button")).some(
        (button) => normalized(button.textContent) === normalized(photo.name || "asset photo"),
      ),
    );
    const remove = row ? findButton(row, "Delete") : null;
    if (!remove) return;
    remove.click();
    window.setTimeout(() => setRefreshKey((value) => value + 1), 700);
  };

  const addAssetAndEdit = () => {
    if (addInProgress.current) return;
    const root = assetsMain();
    if (!root) return;
    const native = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => normalized(button.textContent) === "add asset" && !button.dataset.atlasCleanAddAsset,
    );
    if (!native) return;

    addInProgress.current = true;
    const previousTitle = selectedAssetName(root.querySelector<HTMLElement>(".atlas-asset-drawer"));
    native.click();

    let attempts = 0;
    const openEditor = () => {
      attempts += 1;
      const nextDrawer = root.querySelector<HTMLElement>(".atlas-asset-drawer");
      const nextTitle = selectedAssetName(nextDrawer);
      const edit = nextDrawer ? findButton(nextDrawer, "Edit Asset") : null;
      if (edit && nextTitle && (nextTitle !== previousTitle || attempts > 5)) {
        edit.click();
        addInProgress.current = false;
        return;
      }
      if (attempts < 30) window.setTimeout(openEditor, 70);
      else addInProgress.current = false;
    };
    window.setTimeout(openEditor, 40);
  };

  return (
    <>
      <style jsx global>{`
        .atlas-asset-reference-tabs:has([data-atlas-asset-photo-tab-host]) {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        }
        .atlas-asset-photos-open .atlas-asset-reference-tab.is-active:not(.atlas-asset-photo-tab) {
          border-color: #dce5ed !important;
          background: #fff !important;
          color: #172331 !important;
        }
        .atlas-asset-photos-open .atlas-asset-reference-content-panel,
        .atlas-asset-photos-open .atlas-native-manual-visible {
          display: none !important;
        }
        .atlas-asset-photo-tab {
          min-width: 0;
          min-height: 72px !important;
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-rows: auto auto;
          align-items: center;
          column-gap: 8px;
          row-gap: 2px;
          padding: 10px 12px !important;
          border: 1px solid #dce5ed !important;
          border-radius: 10px !important;
          background: #fff !important;
          color: #172331 !important;
          box-shadow: none !important;
          cursor: pointer;
          text-align: left;
        }
        .atlas-asset-photo-tab.is-active {
          border-color: #9ec6f8 !important;
          background: #edf6ff !important;
          color: #0b5db7 !important;
        }
        .atlas-asset-photo-tab .icon {
          grid-column: 1 / -1;
          font-size: 20px;
          line-height: 1;
        }
        .atlas-asset-photo-tab .label { font-size: 12.5px; font-weight: 700; }
        .atlas-asset-photo-tab small { font-size: 11px; font-weight: 700; color: #738197; }
        .atlas-asset-photo-panel {
          width: 100%;
          min-width: 0;
          margin: 0;
          padding: 16px;
          border: 1px solid #dce5ed;
          border-radius: 12px;
          background: #fff;
        }
        .atlas-asset-photo-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }
        .atlas-asset-photo-panel-head h3 { margin: 0; color: #071b2f; font-size: 17px; }
        .atlas-asset-photo-panel-head p { margin: 3px 0 0; color: #6a7789; font-size: 11.5px; }
        .atlas-asset-photo-actions { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
        .atlas-asset-photo-action {
          min-height: 34px;
          padding: 7px 11px;
          border: 1px solid #1f6fd1;
          border-radius: 8px;
          background: #fff;
          color: #0b5db7;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .atlas-asset-photo-action.primary { background: #1f6fd1; color: #fff; }
        .atlas-asset-photo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }
        .atlas-asset-photo-card {
          min-width: 0;
          border: 1px solid #e0e7ef;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
        }
        .atlas-asset-photo-thumb {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          display: block;
          background: #f3f6f9;
          cursor: pointer;
          border: 0;
          padding: 0;
        }
        .atlas-asset-photo-meta { padding: 7px 8px; display: grid; gap: 5px; }
        .atlas-asset-photo-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; font-weight: 700; color: #172331; }
        .atlas-asset-photo-delete { border: 0; background: transparent; color: #b42318; font-size: 11px; font-weight: 700; padding: 0; cursor: pointer; text-align: left; }
        .atlas-asset-photo-empty { border: 1px dashed #dce5ed; border-radius: 10px; padding: 18px; text-align: center; color: #6a7789; font-size: 12px; }
        .atlas-clean-add-asset {
          min-height: 32px;
          border: 1px solid #d2a53a;
          border-radius: 9px;
          background: #d2a53a;
          color: #071b2f;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }
        .atlas-asset-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: 11000;
          background: rgba(5, 18, 31, .76);
          display: grid;
          place-items: center;
          padding: 18px;
        }
        .atlas-asset-preview-image { max-width: min(1100px, 96vw); max-height: 88vh; border-radius: 10px; background: #fff; }
        @media (max-width: 760px) {
          .atlas-asset-reference-tabs:has([data-atlas-asset-photo-tab-host]) { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .atlas-asset-photo-panel { padding: 12px; }
          .atlas-asset-photo-panel-head { display: grid; }
          .atlas-asset-photo-actions { justify-content: stretch; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .atlas-asset-photo-action { width: 100%; }
          .atlas-asset-photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      {listHost
        ? createPortal(
            <button
              type="button"
              data-atlas-clean-add-asset="true"
              className="atlas-clean-add-asset"
              onClick={addAssetAndEdit}
            >
              Add Asset
            </button>,
            listHost,
          )
        : null}

      {tabHost
        ? createPortal(
            <button
              type="button"
              className={`atlas-asset-photo-tab${photosOpen ? " is-active" : ""}`}
              aria-pressed={photosOpen}
              onClick={() => setPhotosOpen(true)}
            >
              <span className="icon" aria-hidden="true">▧</span>
              <span className="label">Photos</span>
              <small>{assetPhotos.length}</small>
            </button>,
            tabHost,
          )
        : null}

      {panelHost && photosOpen
        ? createPortal(
            <section className="atlas-asset-photo-panel" aria-label="Asset photos">
              <div className="atlas-asset-photo-panel-head">
                <div>
                  <h3>Photos</h3>
                  <p>Photos saved directly to this asset.</p>
                </div>
                <div className="atlas-asset-photo-actions">
                  <button type="button" className="atlas-asset-photo-action primary" onClick={() => triggerNativePhotoInput(true)}>
                    Take Photo
                  </button>
                  <button type="button" className="atlas-asset-photo-action" onClick={() => triggerNativePhotoInput(false)}>
                    Choose Photos
                  </button>
                  <button type="button" className="atlas-asset-photo-action" onClick={triggerNativePaste}>
                    Paste
                  </button>
                </div>
              </div>

              {assetPhotos.length ? (
                <div className="atlas-asset-photo-grid">
                  {assetPhotos.map((photo) => {
                    const src = photo.dataUrl || photo.url || "";
                    return (
                      <div className="atlas-asset-photo-card" key={photo.id}>
                        {src ? (
                          <img
                            className="atlas-asset-photo-thumb"
                            src={src}
                            alt={photo.name || "Asset photo"}
                            onClick={() => setPreview(photo)}
                          />
                        ) : null}
                        <div className="atlas-asset-photo-meta">
                          <div className="atlas-asset-photo-name" title={photo.name || "Asset photo"}>
                            {photo.name || "Asset photo"}
                          </div>
                          <button type="button" className="atlas-asset-photo-delete" onClick={() => deletePhoto(photo)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="atlas-asset-photo-empty">No photos attached yet.</div>
              )}
            </section>,
            panelHost,
          )
        : null}

      {preview && (preview.dataUrl || preview.url)
        ? createPortal(
            <div className="atlas-asset-preview-backdrop" role="presentation" onMouseDown={() => setPreview(null)}>
              <img
                className="atlas-asset-preview-image"
                src={preview.dataUrl || preview.url}
                alt={preview.name || "Asset photo"}
                onMouseDown={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
