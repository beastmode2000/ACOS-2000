"use client";

import { upload } from "@vercel/blob/client";
import { useEffect } from "react";

const PROPERTY_ID = "2000";
const SPEC_MARKERS = ["Spec Code:", "Status: Specified", "Source: Susan Merinello"];

type Attachment = {
  id: string;
  url: string;
  name: string;
  contentType: string;
  kind: "image" | "document";
};

type LocationPresentationMeta = {
  id: string;
  name: string;
  photoUrl: string;
  assets: number;
  openWork: number;
  photos: number;
  documents: number;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function activePropertyIdFromDom() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  const propertySelect = selects.find((select) => {
    const values = Array.from(select.options).map((option) => String(option.value || ""));
    return values.includes("2000") && values.some((value) => value === "4725" || value === "6855" || value === "3661" || value.toLowerCase() === "hangar");
  });
  return String(propertySelect?.value || "2000");
}

function fileImageSource(file: any) {
  const dataUrl = String(file?.dataUrl || "");
  const url = String(file?.url || "");
  const type = String(file?.type || file?.contentType || "").toLowerCase();
  if (dataUrl.startsWith("data:image/")) return dataUrl;
  if (url && (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif)(\?|$)/i.test(url))) return url;
  return "";
}

async function loadLocationPresentationMeta(propertyId: string) {
  const encoded = encodeURIComponent(propertyId);
  const [atlasResponse, documentsResponse] = await Promise.all([
    fetch(`/api/atlas?propertyId=${encoded}&locationUi=${Date.now()}`, { cache: "no-store" }),
    fetch(`/api/atlas-documents?propertyId=${encoded}`, { cache: "no-store" }),
  ]);

  if (!atlasResponse.ok) throw new Error(`Atlas API returned ${atlasResponse.status}`);
  if (!documentsResponse.ok) throw new Error(`Document API returned ${documentsResponse.status}`);

  const atlas = await atlasResponse.json();
  const documentPayload = await documentsResponse.json();
  const locations = Array.isArray(atlas?.locations) ? atlas.locations : [];
  const assets = Array.isArray(atlas?.assetRecords) ? atlas.assetRecords : [];
  const services = Array.isArray(atlas?.serviceRecords) ? atlas.serviceRecords : [];
  const documents = Array.isArray(documentPayload?.documents) ? documentPayload.documents : [];

  const result = new Map<string, LocationPresentationMeta>();

  for (const location of locations) {
    const id = String(location?.id || "");
    const name = String(location?.name || "").trim();
    if (!id || !name) continue;

    const locationDocuments = documents.filter(
      (document: any) =>
        normalized(document?.targetType) === "location" &&
        String(document?.targetId || "") === id,
    );
    const imageFiles = locationDocuments.flatMap((document: any) =>
      (Array.isArray(document?.files) ? document.files : [])
        .map((file: any) => ({ file, source: fileImageSource(file) }))
        .filter((entry: any) => Boolean(entry.source)),
    );
    const locationAssets = assets.filter((asset: any) => {
      const primary = String(asset?.locationId || "");
      const linked = Array.isArray(asset?.locationIds) ? asset.locationIds.map(String) : [];
      return primary === id || linked.includes(id);
    });
    const assetIds = new Set(locationAssets.map((asset: any) => String(asset?.id || "")));
    const openWork = services.filter((service: any) => {
      if (normalized(service?.status) === "completed") return false;
      return String(service?.locationId || "") === id || assetIds.has(String(service?.assetId || ""));
    }).length;

    result.set(normalized(name), {
      id,
      name,
      photoUrl: imageFiles[0]?.source || "",
      assets: locationAssets.length,
      openWork,
      photos: imageFiles.length,
      documents: locationDocuments.length,
    });
  }

  return result;
}

function isSpec(value: string) {
  return SPEC_MARKERS.some((marker) => value.includes(marker));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

function codeFrom(value: string) {
  return value.match(/Spec Code:\s*([^\n]+)/i)?.[1]?.trim() || "no-code";
}

function specKey(room: string, label: string, value: string) {
  return slug(`${room}-${label}-${codeFrom(value)}`);
}

function safeFileName(value: string) {
  return (value || "attachment")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "attachment";
}

async function normalizeClipboardImage(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Atlas could not prepare the pasted image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Atlas could not prepare the pasted image."));
      }, "image/png");
    });

    return new File([pngBlob], `pasted-spec-${Date.now()}.png`, { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

async function loadAttachments(room: string, key: string): Promise<Attachment[]> {
  const params = new URLSearchParams({ propertyId: PROPERTY_ID, locationName: room, specKey: key });
  const response = await fetch(`/api/location-spec-attachments?${params}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not load attachments.");
  return Array.isArray(data.attachments) ? data.attachments : [];
}

async function addAttachment(room: string, key: string, file: File, kind: "image" | "document") {
  const blob = await upload(
    `atlas-location-specs/${PROPERTY_ID}/${slug(room)}/${key}/${Date.now()}-${safeFileName(file.name)}`,
    file,
    {
      access: "public",
      handleUploadUrl: "/api/atlas-document-upload",
      contentType: file.type || undefined,
    },
  );

  const response = await fetch("/api/location-spec-attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: PROPERTY_ID,
      locationName: room,
      specKey: key,
      url: blob.url,
      name: file.name || "Attachment",
      contentType: file.type || "",
      kind,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save attachment.");
}

async function removeAttachment(id: string) {
  const response = await fetch("/api/location-spec-attachments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, propertyId: PROPERTY_ID }),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not delete attachment.");
}

function makeButton(text: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = "atlas-spec-action";
  return button;
}

function renderAttachmentList(host: HTMLElement, items: Attachment[], refresh: () => Promise<void>) {
  const list = host.querySelector<HTMLElement>(".atlas-spec-files");
  if (!list) return;
  list.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "atlas-spec-empty";
    empty.textContent = "No reference image or document attached.";
    list.appendChild(empty);
    return;
  }

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "atlas-spec-file";

    if (item.kind === "image" || item.contentType?.startsWith("image/")) {
      const imageLink = document.createElement("a");
      imageLink.href = item.url;
      imageLink.target = "_blank";
      imageLink.rel = "noreferrer";
      const image = document.createElement("img");
      image.src = item.url;
      image.alt = item.name || "Specification reference";
      image.className = "atlas-spec-image";
      image.loading = "lazy";
      imageLink.appendChild(image);
      card.appendChild(imageLink);
    }

    const row = document.createElement("div");
    row.className = "atlas-spec-file-row";
    const open = document.createElement("a");
    open.href = item.url;
    open.target = "_blank";
    open.rel = "noreferrer";
    open.textContent = item.name || "Open attachment";
    open.className = "atlas-spec-file-link";
    row.appendChild(open);

    const remove = makeButton("Delete");
    remove.classList.add("atlas-spec-delete");
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Delete ${item.name || "this attachment"}?`)) return;
      remove.disabled = true;
      try {
        await removeAttachment(item.id);
        await refresh();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Could not delete attachment.");
        remove.disabled = false;
      }
    });
    row.appendChild(remove);
    card.appendChild(row);
    list.appendChild(card);
  }
}

function addControls(card: HTMLElement, room: string, label: string, value: string) {
  const key = specKey(room, label, value);
  if (!key || card.querySelector(`.atlas-spec-attachments[data-spec-key="${key}"]`)) return;

  const host = document.createElement("div");
  host.className = "atlas-spec-attachments";
  host.dataset.specKey = key;

  const controls = document.createElement("div");
  controls.className = "atlas-spec-controls";
  const imageButton = makeButton("Add Image");
  const pasteButton = makeButton("Paste Image");
  const documentButton = makeButton("Add Document");
  const status = document.createElement("span");
  status.className = "atlas-spec-status";
  controls.append(imageButton, pasteButton, documentButton, status);

  const files = document.createElement("div");
  files.className = "atlas-spec-files";
  host.append(controls, files);
  card.appendChild(host);

  const setBusy = (busy: boolean) => {
    imageButton.disabled = busy;
    pasteButton.disabled = busy;
    documentButton.disabled = busy;
  };

  const refresh = async () => {
    try {
      status.textContent = "";
      renderAttachmentList(host, await loadAttachments(room, key), refresh);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Could not load attachments.";
    }
  };

  const choose = (kind: "image" | "document") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "image" ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      status.textContent = "Uploading…";
      try {
        await addAttachment(room, key, file, kind);
        await refresh();
      } catch (error) {
        status.textContent = "";
        window.alert(error instanceof Error ? error.message : "Upload failed.");
      } finally {
        setBusy(false);
      }
    }, { once: true });
    input.click();
  };

  const pasteImage = async () => {
    if (!navigator.clipboard?.read) {
      window.alert("Clipboard image paste is not supported by this browser. Use Add Image instead.");
      return;
    }

    setBusy(true);
    status.textContent = "Reading clipboard…";
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const clipboardBlob = await clipboardItem.getType(imageType);
        const file = await normalizeClipboardImage(clipboardBlob);
        status.textContent = "Uploading…";
        await addAttachment(room, key, file, "image");
        await refresh();
        return;
      }
      status.textContent = "";
      window.alert("There is no image in the clipboard. Copy a screenshot first, then press Paste Image.");
    } catch (error) {
      status.textContent = "";
      window.alert(error instanceof Error ? error.message : "Could not paste the clipboard image.");
    } finally {
      setBusy(false);
    }
  };

  imageButton.addEventListener("click", () => choose("image"));
  pasteButton.addEventListener("click", () => void pasteImage());
  documentButton.addEventListener("click", () => choose("document"));
  void refresh();
}

function removeCategoryHeadings(grid: HTMLElement) {
  for (const heading of Array.from(grid.querySelectorAll<HTMLElement>(":scope > .atlas-spec-category"))) {
    heading.remove();
  }
}

function sectionHasNoUsefulRecords(section: HTMLElement) {
  const text = section.textContent || "";
  if (text.includes("No work history is linked yet.")) return true;
  if (text.includes("No Tasks are linked to this location.")) return true;
  if (text.includes("0 work records")) return true;
  if (text.includes("0 related") && text.includes("Tasks")) return true;
  return false;
}

function markBusyLocationChrome(
  drawer: HTMLElement,
  listPanel: HTMLElement | null,
  presentationMeta: Map<string, LocationPresentationMeta>,
) {
  for (const button of Array.from(drawer.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = button.textContent?.trim() || "";
    if (text === "+ Sub-location" || text === "+ Sub") {
      button.classList.add("atlas-location-hidden-sub");
    }
  }

  let equipmentSection: HTMLElement | null = null;
  let photosSection: HTMLElement | null = null;

  for (const section of Array.from(drawer.querySelectorAll<HTMLElement>("section"))) {
    const text = section.textContent || "";
    if (text.includes("Location at a glance") || text.includes("Property Intelligence")) {
      section.classList.add("atlas-location-hidden-overview");
    }
    if (text.includes("Assets Assigned Here") || text.includes("Appliances & Equipment")) {
      equipmentSection = section;
      section.classList.add("atlas-location-equipment-section");
      const eyebrow = Array.from(section.querySelectorAll<HTMLElement>("div")).find(
        (node) => node.textContent?.trim() === "Assets Assigned Here",
      );
      if (eyebrow) eyebrow.textContent = "Appliances & Equipment";
      const hint = Array.from(section.querySelectorAll<HTMLElement>("div")).find(
        (node) => node.textContent?.includes("Assets remain separate records"),
      );
      if (hint) hint.classList.add("atlas-location-hidden-hint");
    }
    if (text.includes("Photos") && text.includes("attached")) {
      photosSection = section;
      section.classList.add("atlas-location-reference-photos");
    }
    if (sectionHasNoUsefulRecords(section)) {
      section.classList.add("atlas-location-hidden-empty-secondary");
    }
    if (text.includes("Location History") || text.includes("Property History")) {
      section.classList.add("atlas-location-history-section");
    }
  }

  if (equipmentSection && photosSection && equipmentSection.parentElement === drawer) {
    drawer.insertBefore(equipmentSection, photosSection);
  }

  for (const label of Array.from(drawer.querySelectorAll<HTMLElement>("span"))) {
    const text = label.textContent?.trim() || "";
    if (text === "Type" || text === "Parent" || text === "Hierarchy Path") {
      label.parentElement?.classList.add("atlas-location-hidden-hierarchy-card");
    }
  }

  const roomName = drawer.querySelector("h3")?.textContent?.trim() || "";
  const selectedMeta = presentationMeta.get(normalized(roomName));
  const infoBlock = drawer.firstElementChild as HTMLElement | null;
  if (infoBlock) {
    infoBlock.classList.add("atlas-location-info-card-clean");

    const heading = infoBlock.querySelector<HTMLElement>("h3");
    const titleBlock = heading?.parentElement as HTMLElement | null;
    const titleRow = titleBlock?.parentElement as HTMLElement | null;
    if (heading && titleBlock && titleRow) {
      let thumbnail = titleRow.querySelector<HTMLElement>(".atlas-location-detail-thumb");
      if (!thumbnail) {
        thumbnail = document.createElement("div");
        thumbnail.className = "atlas-location-detail-thumb";
        titleRow.insertBefore(thumbnail, titleBlock);
      }
      if (selectedMeta?.photoUrl) {
        thumbnail.style.backgroundImage = `url(${selectedMeta.photoUrl})`;
        thumbnail.textContent = "";
      } else {
        thumbnail.style.backgroundImage = "";
        thumbnail.textContent = roomName.slice(0, 2).toUpperCase();
      }
    }

    const headerRow = Array.from(infoBlock.children).find(
      (child) => child instanceof HTMLElement && child.querySelector("h3"),
    ) as HTMLElement | undefined;
    let summary = infoBlock.querySelector<HTMLElement>(".atlas-location-summary-clean");
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "atlas-location-summary-clean";
      if (headerRow?.nextSibling) infoBlock.insertBefore(summary, headerRow.nextSibling);
      else infoBlock.appendChild(summary);
    }
    const values = selectedMeta
      ? [
          ["Assets", selectedMeta.assets],
          ["Open work", selectedMeta.openWork],
          ["Photos", selectedMeta.photos],
          ["Documents", selectedMeta.documents],
        ]
      : [];
    summary.replaceChildren(
      ...values.map(([label, value]) => {
        const item = document.createElement("div");
        item.className = "atlas-location-summary-item";
        const labelNode = document.createElement("span");
        labelNode.textContent = String(label);
        const valueNode = document.createElement("strong");
        valueNode.textContent = String(value);
        item.append(labelNode, valueNode);
        return item;
      }),
    );
    summary.style.display = values.length ? "grid" : "none";
  }

  if (!listPanel) return;

  for (const button of Array.from(listPanel.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = button.textContent?.trim() || "";
    if (text === "+ Sub") button.classList.add("atlas-location-hidden-sub");

    const titleNode = button.querySelector<HTMLElement>("strong");
    const title = titleNode?.textContent?.trim() || "";
    if (!titleNode || !title) continue;

    const wrapper = button.parentElement as HTMLElement | null;
    if (!wrapper) continue;

    button.classList.add("atlas-location-list-card-main");
    wrapper.classList.add("atlas-location-list-card-clean");

    const meta = presentationMeta.get(normalized(title));
    const titleContainer = titleNode.parentElement as HTMLElement | null;
    const lead = button.firstElementChild as HTMLElement | null;

    if (lead) {
      lead.classList.add("atlas-location-list-thumb");
      const hierarchyControl = Boolean(lead.getAttribute("aria-label"));
      if (meta?.photoUrl) {
        lead.style.setProperty("visibility", "visible", "important");
        lead.style.setProperty("background-image", `url(${JSON.stringify(meta.photoUrl).slice(1, -1)})`, "important");
        lead.style.setProperty("background-size", "cover", "important");
        lead.style.setProperty("background-position", "center", "important");
        if (hierarchyControl) {
          lead.style.setProperty("color", "#ffffff", "important");
          lead.style.setProperty("text-shadow", "0 1px 3px rgba(0,0,0,.9)", "important");
          lead.style.setProperty("font-weight", "950", "important");
        } else {
          lead.textContent = "";
        }
      } else if (!hierarchyControl) {
        lead.style.setProperty("visibility", "visible", "important");
        lead.style.removeProperty("background-image");
        lead.textContent = title.slice(0, 2).toUpperCase();
      }
    }

    if (titleContainer) {
      titleContainer.classList.add("atlas-location-list-copy");
      for (const child of Array.from(titleContainer.children) as HTMLElement[]) {
        const text = normalized(child.textContent);
        if (/^\d+\s+(assets?|work)$/.test(text) || (/assets?/.test(text) && /work/.test(text))) {
          child.classList.add("atlas-location-list-counts-hidden");
        }
      }
    }

  }

  for (const section of Array.from(listPanel.querySelectorAll<HTMLElement>("section"))) {
    const text = section.textContent || "";
    if (
      text.includes("Hierarchy and Assignment Review") ||
      text.includes("Location Classification Review")
    ) {
      section.classList.add("atlas-location-hidden-list-review");
    }
  }

  const topSummary = Array.from(listPanel.querySelectorAll<HTMLElement>("div")).find((node) => {
    const text = node.textContent || "";
    return (
      text.includes("Top level") &&
      text.includes("Connected") &&
      text.includes("Active work") &&
      text.includes("Hierarchy Issues")
    );
  });
  if (topSummary) topSummary.classList.add("atlas-location-hidden-list-summary");

  const workspaceColumns = listPanel.parentElement as HTMLElement | null;
  if (workspaceColumns) {
    workspaceColumns.classList.add("atlas-location-workspace-columns");
    workspaceColumns.parentElement?.classList.add("atlas-location-workspace-shell");
  }

  const addLocationButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === "Add Location",
  );
  if (addLocationButton) {
    addLocationButton.classList.add("atlas-location-add-button-compact");
    addLocationButton.parentElement?.classList.add("atlas-location-add-row-compact");
  }
}

export default function AtlasLocationsPolish() {
  useEffect(() => {
    let frame = 0;
    let loadedPropertyId = "";
    let loadingPropertyId = "";
    let presentationMeta = new Map<string, LocationPresentationMeta>();

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const refreshPresentationMeta = (propertyId: string) => {
      if (!propertyId || loadedPropertyId === propertyId || loadingPropertyId === propertyId) return;
      loadingPropertyId = propertyId;
      void loadLocationPresentationMeta(propertyId)
        .then((next) => {
          if (loadingPropertyId !== propertyId) return;
          presentationMeta = next;
          loadedPropertyId = propertyId;
        })
        .catch(() => {
          if (loadingPropertyId === propertyId) loadedPropertyId = propertyId;
        })
        .finally(() => {
          if (loadingPropertyId === propertyId) loadingPropertyId = "";
          schedule();
        });
    };

    const apply = () => {
      frame = 0;
      const propertyId = activePropertyIdFromDom();
      if (propertyId !== loadedPropertyId) {
        if (loadingPropertyId && loadingPropertyId !== propertyId) loadingPropertyId = "";
        presentationMeta = new Map();
        refreshPresentationMeta(propertyId);
      }

      const drawers = Array.from(document.querySelectorAll<HTMLElement>('div[tabindex="0"]'));

      for (const drawer of drawers) {
        const room = drawer.querySelector("h3")?.textContent?.trim() || "";
        if (!room) continue;

        drawer.classList.add("atlas-location-drawer-polish", "atlas-location-independent-scroll");

        const drawerPanel = drawer.parentElement as HTMLElement | null;
        const listPanel = drawerPanel?.previousElementSibling as HTMLElement | null;
        if (drawerPanel && listPanel) {
          drawerPanel.classList.add("atlas-location-drawer-panel");
          listPanel.classList.add("atlas-location-list-panel", "atlas-location-independent-scroll");
        }

        markBusyLocationChrome(drawer, listPanel, presentationMeta);

        const specCards: HTMLElement[] = [];
        for (const valueNode of Array.from(drawer.querySelectorAll<HTMLElement>("strong"))) {
          const value = valueNode.textContent || "";
          if (!isSpec(value)) continue;
          const card = valueNode.parentElement as HTMLElement | null;
          if (!card) continue;
          const labelNode = card.querySelector<HTMLElement>(":scope > span");
          if (!labelNode) continue;
          const label = labelNode.textContent?.trim() || "Specification";

          card.classList.add("atlas-location-spec-card");
          valueNode.classList.add("atlas-location-spec-value");
          labelNode.classList.add("atlas-location-spec-label");
          card.dataset.specCategory = label.split("·")[0]?.trim() || "Specifications";
          specCards.push(card);
          addControls(card, room, label, value);
        }

        const grids = new Set(specCards.map((card) => card.parentElement).filter(Boolean) as HTMLElement[]);
        for (const grid of grids) {
          grid.classList.add("atlas-location-spec-grid");
          removeCategoryHeadings(grid);
        }

        for (const textarea of Array.from(drawer.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
          if (!isSpec(textarea.value || "")) continue;
          textarea.parentElement?.classList.add("atlas-location-spec-edit-row");
          textarea.parentElement?.parentElement?.classList.add("atlas-location-spec-edit-list");
        }
      }
    };

    schedule();
    const observer = new MutationObserver((mutations) => {
      const hasExternalChange = mutations.some((mutation) => {
        const target = mutation.target as HTMLElement;
        return !target.closest?.(".atlas-spec-attachments") && !target.closest?.(".atlas-spec-category");
      });
      if (hasExternalChange) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-location-drawer-polish {
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        scroll-behavior: auto !important;
        overflow-anchor: none;
      }
      @media (min-width: 901px) {
        .atlas-location-workspace-shell {
          margin-top: -14px !important;
          padding-top: 0 !important;
        }
        .atlas-location-workspace-columns {
          min-height: 0 !important;
        }
        .atlas-location-independent-scroll {
          min-height: 0 !important;
          height: calc(100dvh - 132px) !important;
          max-height: calc(100dvh - 132px) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable;
        }
        .atlas-location-drawer-panel {
          min-height: 0 !important;
          height: calc(100dvh - 132px) !important;
          max-height: calc(100dvh - 132px) !important;
          overflow: hidden !important;
        }
      }
      .atlas-location-hidden-sub,
      .atlas-location-hidden-overview,
      .atlas-location-hidden-hierarchy-card,
      .atlas-location-hidden-list-review,
      .atlas-location-hidden-list-summary,
      .atlas-location-hidden-hint,
      .atlas-location-hidden-empty-secondary,
      .atlas-location-list-counts-hidden {
        display: none !important;
      }
      .atlas-location-add-row-compact {
        min-height: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 4px !important;
        margin-top: 0 !important;
        margin-bottom: 2px !important;
      }
      .atlas-location-add-button-compact {
        min-height: 34px !important;
        padding: 6px 12px !important;
        font-size: 12px !important;
      }
      .atlas-location-list-card-clean {
        min-height: 0 !important;
        border-radius: 9px !important;
        box-shadow: none !important;
        transform: none !important;
      }
      .atlas-location-list-card-main {
        min-width: 0 !important;
      }
      .atlas-location-list-copy {
        min-width: 0 !important;
      }
      .atlas-location-list-copy > strong,
      .atlas-location-list-copy > small {
        display: block !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .atlas-location-list-copy > strong {
        font-size: 13px !important;
        line-height: 1.2 !important;
        color: #0b2c43 !important;
      }
      .atlas-location-list-thumb {
        background-repeat: no-repeat !important;
      }
      .atlas-location-info-card-clean {
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        padding: 10px 11px !important;
        box-shadow: none !important;
      }
      .atlas-location-detail-thumb {
        width: 52px;
        height: 52px;
        flex: 0 0 52px;
        border: 1px solid #d9e2eb;
        border-radius: 11px;
        background-color: #f6f8fb;
        background-size: cover;
        background-position: center;
        display: grid;
        place-items: center;
        color: #607086;
        font-size: 11px;
        font-weight: 900;
        overflow: hidden;
      }
      .atlas-location-summary-clean {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
        margin-top: 10px;
      }
      .atlas-location-summary-item {
        min-width: 0;
        border: 1px solid #d9e2eb;
        border-radius: 9px;
        background: #f6f8fb;
        padding: 7px 8px;
      }
      .atlas-location-summary-item span {
        display: block;
        color: #607086;
        font-size: 10px;
        font-weight: 800;
      }
      .atlas-location-summary-item strong {
        display: block;
        margin-top: 2px;
        color: #0b1e33;
        font-size: 13px;
      }
      .atlas-location-equipment-section {
        margin-top: 10px !important;
      }
      .atlas-location-equipment-section [style*="box-shadow"] {
        box-shadow: none !important;
      }
      .atlas-location-reference-photos {
        margin-top: 10px !important;
      }
      .atlas-location-history-section {
        margin-top: 14px !important;
        opacity: 0.92;
      }
      .atlas-location-drawer-polish img[style*="object-fit: cover"] {
        object-fit: contain !important;
        background: #fff !important;
      }
      .atlas-location-spec-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 8px !important;
        margin-top: 10px !important;
        padding-top: 0 !important;
        position: relative !important;
      }
      .atlas-location-spec-grid::before {
        content: none !important;
      }
      .atlas-spec-category {
        display: none !important;
      }
      .atlas-location-spec-card {
        display: grid !important;
        grid-template-columns: minmax(150px,.28fr) minmax(0,1fr) !important;
        gap: 12px !important;
        align-items: start !important;
        min-width: 0 !important;
        padding: 10px 11px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 9px !important;
        background: #fff !important;
        box-shadow: none !important;
      }
      .atlas-location-spec-label {
        display:block !important;
        color:#0b1e33 !important;
        font-size:12px !important;
        line-height:1.35 !important;
        font-weight:850 !important;
        text-transform:none !important;
        overflow-wrap:anywhere !important;
      }
      .atlas-location-spec-value {
        display:block !important;
        min-width:0 !important;
        color:#33465b !important;
        font-size:12px !important;
        line-height:1.5 !important;
        font-weight:600 !important;
        white-space:pre-wrap !important;
        overflow-wrap:anywhere !important;
      }
      .atlas-spec-attachments {
        grid-column:1/-1;
        display:grid;
        gap:8px;
        padding-top:8px;
        border-top:1px solid #e6ebf0;
      }
      .atlas-spec-controls { display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
      .atlas-spec-action { min-height:30px; padding:5px 9px; border:1px solid #d2dbe4; border-radius:8px; background:#fff; color:#0b1e33; font:inherit; font-size:11px; font-weight:800; cursor:pointer; }
      .atlas-spec-action:hover { border-color:#c99a3d; background:#fffaf0; }
      .atlas-spec-action:disabled { opacity:.55; cursor:default; }
      .atlas-spec-delete { color:#b42318; }
      .atlas-spec-status,.atlas-spec-empty { color:#607086; font-size:11px; }
      .atlas-spec-files { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; }
      .atlas-spec-file { min-width:0; overflow:hidden; border:1px solid #dce4ec; border-radius:10px; background:#f8fafc; }
      .atlas-spec-file > a { display:block; background:#fff; }
      .atlas-spec-image { display:block; width:100%; max-height:320px; object-fit:contain; background:#fff; }
      .atlas-spec-file-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px; }
      .atlas-spec-file-link { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#175cd3; font-size:12px; font-weight:800; text-decoration:none; }
      .atlas-location-spec-edit-list { display:grid !important; gap:10px !important; }
      .atlas-location-spec-edit-row { display:grid !important; grid-template-columns:minmax(170px,.38fr) minmax(320px,1fr) auto !important; gap:9px !important; align-items:start !important; padding:10px !important; border:1px solid #d9e2eb !important; border-radius:10px !important; background:#fbfcfd !important; }
      .atlas-location-spec-edit-row textarea { min-height:118px !important; line-height:1.5 !important; }
      @media (max-width:900px) {
        .atlas-location-workspace-shell {
          margin-top: -8px !important;
          padding-top: 0 !important;
        }
        .atlas-location-spec-card { grid-template-columns:minmax(0,1fr) !important; gap:6px !important; padding:10px !important; }
        .atlas-location-spec-value { font-size:12px !important; line-height:1.5 !important; }
        .atlas-spec-files { grid-template-columns:minmax(0,1fr); }
        .atlas-location-spec-edit-row { grid-template-columns:minmax(0,1fr) !important; }
        .atlas-location-summary-clean { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .atlas-location-detail-thumb { width: 46px; height: 46px; flex-basis: 46px; }
      }
    `}</style>
  );
}
