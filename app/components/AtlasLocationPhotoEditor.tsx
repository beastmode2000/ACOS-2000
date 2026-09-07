"use client";

import { upload } from "@vercel/blob/client";
import { useEffect } from "react";

type Attachment = {
  id: string;
  propertyId?: string;
  locationName?: string;
  specKey?: string;
  url: string;
  name: string;
  contentType: string;
  kind: "image" | "document";
  createdAt?: string;
};

type CropState = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type EditorOptions = {
  title: string;
  sourceUrl?: string;
  sourceFile?: File;
  fileName: string;
  onSave: (file: File) => Promise<void>;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
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

function safeFileName(value: string) {
  return (
    (value || "photo")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "photo"
  );
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

function locationsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "locations",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function mainPhotoKey(room: string) {
  return `location-main-${slug(room)}`;
}

async function loadMainPhotos(propertyId: string) {
  const params = new URLSearchParams({ propertyId, scope: "main-photos" });
  const response = await fetch(`/api/location-spec-attachments?${params}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Could not load location main photos.");
  }

  const result = new Map<string, Attachment>();
  for (const item of Array.isArray(data.attachments) ? data.attachments : []) {
    if (item?.kind !== "image") continue;
    const room = normalized(item?.locationName);
    if (!room || result.has(room)) continue;
    result.set(room, item as Attachment);
  }
  return result;
}

async function loadAttachments(propertyId: string, room: string, key: string): Promise<Attachment[]> {
  const params = new URLSearchParams({ propertyId, locationName: room, specKey: key });
  const response = await fetch(`/api/location-spec-attachments?${params}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Could not load this photo.");
  }
  return Array.isArray(data.attachments) ? data.attachments : [];
}

async function uploadEditedFile(propertyId: string, room: string, key: string, file: File) {
  return upload(
    `atlas-location-specs/${propertyId}/${slug(room)}/${key}/${Date.now()}-${safeFileName(file.name)}`,
    file,
    {
      access: "public",
      handleUploadUrl: "/api/atlas-document-upload",
      contentType: file.type || undefined,
    },
  );
}

async function createAttachment(
  propertyId: string,
  room: string,
  key: string,
  file: File,
  url: string,
) {
  const response = await fetch("/api/location-spec-attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId,
      locationName: room,
      specKey: key,
      url,
      name: file.name,
      contentType: file.type,
      kind: "image",
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok || !data?.attachment) {
    throw new Error(data?.error || "Could not save the photo.");
  }
  return data.attachment as Attachment;
}

async function replaceAttachment(
  propertyId: string,
  attachment: Attachment,
  file: File,
  url: string,
) {
  const response = await fetch("/api/location-spec-attachments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: attachment.id,
      propertyId,
      url,
      name: file.name,
      contentType: file.type,
      kind: "image",
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok || !data?.attachment) {
    throw new Error(data?.error || "Could not update the photo.");
  }
  return data.attachment as Attachment;
}

async function removeAttachment(propertyId: string, id: string) {
  const response = await fetch("/api/location-spec-attachments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, propertyId }),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Could not remove the photo.");
  }
}

function sourceRect(bitmap: ImageBitmap, crop: CropState) {
  const left = Math.max(0, Math.min(45, crop.left));
  const right = Math.max(0, Math.min(45, crop.right));
  const top = Math.max(0, Math.min(45, crop.top));
  const bottom = Math.max(0, Math.min(45, crop.bottom));
  const safeRight = left + right >= 90 ? Math.max(0, 89 - left) : right;
  const safeBottom = top + bottom >= 90 ? Math.max(0, 89 - top) : bottom;

  const sx = Math.round(bitmap.width * (left / 100));
  const sy = Math.round(bitmap.height * (top / 100));
  const sw = Math.max(1, Math.round(bitmap.width * ((100 - left - safeRight) / 100)));
  const sh = Math.max(1, Math.round(bitmap.height * ((100 - top - safeBottom) / 100)));
  return { sx, sy, sw, sh };
}

function renderCanvas(bitmap: ImageBitmap, rotation: number, crop: CropState, maxDimension: number) {
  const { sx, sy, sw, sh } = sourceRect(bitmap, crop);
  const degrees = ((rotation % 360) + 360) % 360;
  const swapped = degrees === 90 || degrees === 270;
  const naturalWidth = swapped ? sh : sw;
  const naturalHeight = swapped ? sw : sh;
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const drawWidth = Math.max(1, Math.round(sw * scale));
  const drawHeight = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = swapped ? drawHeight : drawWidth;
  canvas.height = swapped ? drawWidth : drawHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Atlas could not prepare the photo editor.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(
    bitmap,
    sx,
    sy,
    sw,
    sh,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Atlas could not save the edited photo."))),
      type,
      type === "image/jpeg" ? 0.92 : undefined,
    );
  });
}

function actionButton(text: string, className = "atlas-photo-editor-button") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

async function openEditor(options: EditorOptions) {
  document.querySelector(".atlas-photo-editor-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "atlas-photo-editor-overlay";
  const dialog = document.createElement("div");
  dialog.className = "atlas-photo-editor-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const header = document.createElement("div");
  header.className = "atlas-photo-editor-header";
  const title = document.createElement("strong");
  title.textContent = options.title;
  const close = actionButton("×", "atlas-photo-editor-close");
  header.append(title, close);

  const previewWrap = document.createElement("div");
  previewWrap.className = "atlas-photo-editor-preview-wrap";
  const preview = document.createElement("canvas");
  preview.className = "atlas-photo-editor-preview";
  previewWrap.appendChild(preview);

  const toolbar = document.createElement("div");
  toolbar.className = "atlas-photo-editor-toolbar";
  const rotateLeft = actionButton("Rotate Left");
  const rotateRight = actionButton("Rotate Right");
  const cropToggle = actionButton("Crop");
  const reset = actionButton("Reset");
  toolbar.append(rotateLeft, rotateRight, cropToggle, reset);

  const cropPanel = document.createElement("div");
  cropPanel.className = "atlas-photo-editor-crop";
  cropPanel.hidden = true;

  const footer = document.createElement("div");
  footer.className = "atlas-photo-editor-footer";
  const status = document.createElement("span");
  status.className = "atlas-photo-editor-status";
  const cancel = actionButton("Cancel");
  const save = actionButton("Save", "atlas-photo-editor-save");
  footer.append(status, cancel, save);

  dialog.append(header, previewWrap, toolbar, cropPanel, footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  let rotation = 0;
  let crop: CropState = { left: 0, right: 0, top: 0, bottom: 0 };
  let bitmap: ImageBitmap | null = null;

  const closeEditor = () => {
    bitmap?.close();
    overlay.remove();
  };

  close.addEventListener("click", closeEditor);
  cancel.addEventListener("click", closeEditor);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeEditor();
  });

  const updatePreview = () => {
    if (!bitmap) return;
    const rendered = renderCanvas(bitmap, rotation, crop, 1400);
    preview.width = rendered.width;
    preview.height = rendered.height;
    const context = preview.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, preview.width, preview.height);
    context.drawImage(rendered, 0, 0);
  };

  const cropControls: Array<{
    input: HTMLInputElement;
    value: HTMLElement;
  }> = [];

  for (const side of ["left", "right", "top", "bottom"] as const) {
    const label = document.createElement("label");
    label.className = "atlas-photo-editor-crop-control";
    const name = document.createElement("span");
    name.textContent = side.charAt(0).toUpperCase() + side.slice(1);
    const value = document.createElement("strong");
    value.textContent = "0%";
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "45";
    input.step = "1";
    input.value = "0";
    input.addEventListener("input", () => {
      crop = { ...crop, [side]: Number(input.value) };
      value.textContent = `${input.value}%`;
      updatePreview();
    });
    label.append(name, value, input);
    cropPanel.appendChild(label);
    cropControls.push({ input, value });
  }

  rotateLeft.addEventListener("click", () => {
    rotation -= 90;
    updatePreview();
  });
  rotateRight.addEventListener("click", () => {
    rotation += 90;
    updatePreview();
  });
  cropToggle.addEventListener("click", () => {
    cropPanel.hidden = !cropPanel.hidden;
    cropToggle.classList.toggle("atlas-photo-editor-button-active", !cropPanel.hidden);
  });
  reset.addEventListener("click", () => {
    rotation = 0;
    crop = { left: 0, right: 0, top: 0, bottom: 0 };
    cropControls.forEach((control) => {
      control.input.value = "0";
      control.value.textContent = "0%";
    });
    updatePreview();
  });

  try {
    status.textContent = "Loading…";
    const blob = options.sourceFile
      ? options.sourceFile
      : await (async () => {
          const response = await fetch(String(options.sourceUrl || ""), { cache: "no-store" });
          if (!response.ok) throw new Error("Could not load this photo for editing.");
          return response.blob();
        })();
    bitmap = await createImageBitmap(blob);
    status.textContent = "";
    updatePreview();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Could not open the photo editor.");
    closeEditor();
    return;
  }

  save.addEventListener("click", async () => {
    if (!bitmap) return;
    save.disabled = true;
    rotateLeft.disabled = true;
    rotateRight.disabled = true;
    cropToggle.disabled = true;
    reset.disabled = true;
    status.textContent = "Saving…";

    try {
      const output = renderCanvas(bitmap, rotation, crop, 4096);
      const sourceType = normalized(options.sourceFile?.type || "");
      const outputType = sourceType.includes("png") ? "image/png" : "image/jpeg";
      const extension = outputType === "image/png" ? "png" : "jpg";
      const base = safeFileName(options.fileName).replace(/\.[^.]+$/, "") || "photo";
      const blob = await canvasToBlob(output, outputType);
      const file = new File([blob], `${base}-edited.${extension}`, { type: outputType });
      await options.onSave(file);
      closeEditor();
    } catch (error) {
      status.textContent = "";
      save.disabled = false;
      rotateLeft.disabled = false;
      rotateRight.disabled = false;
      cropToggle.disabled = false;
      reset.disabled = false;
      window.alert(error instanceof Error ? error.message : "Could not save the edited photo.");
    }
  });
}

function applyMainPhotoToChrome(root: HTMLElement, photos: Map<string, Attachment>) {
  const listPanel = root.querySelector<HTMLElement>("[data-atlas-record-list]");
  if (listPanel) {
    for (const button of Array.from(listPanel.querySelectorAll<HTMLButtonElement>(".atlas-location-list-card-main"))) {
      const title = button.querySelector<HTMLElement>("strong")?.textContent?.trim() || "";
      const photo = photos.get(normalized(title));
      const lead = button.firstElementChild as HTMLElement | null;
      if (!lead) continue;

      if (photo?.url) {
        lead.dataset.atlasMainPhoto = "true";
        lead.style.setProperty("visibility", "visible", "important");
        lead.style.setProperty("background-image", `url(${JSON.stringify(photo.url).slice(1, -1)})`, "important");
        lead.style.setProperty("background-size", "cover", "important");
        lead.style.setProperty("background-position", "center", "important");
      } else if (lead.dataset.atlasMainPhoto === "true") {
        delete lead.dataset.atlasMainPhoto;
        lead.style.removeProperty("background-image");
      }
    }
  }

  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const drawer = detailPanel?.querySelector<HTMLElement>('div[tabindex="0"]');
  const room = drawer?.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
  const detailThumb = drawer?.querySelector<HTMLElement>(".atlas-location-detail-thumb");
  const selectedPhoto = photos.get(normalized(room));
  if (detailThumb && selectedPhoto?.url) {
    detailThumb.dataset.atlasMainPhoto = "true";
    detailThumb.style.backgroundImage = `url(${selectedPhoto.url})`;
    detailThumb.style.backgroundSize = "cover";
    detailThumb.style.backgroundPosition = "center";
    detailThumb.textContent = "";
  } else if (detailThumb?.dataset.atlasMainPhoto === "true") {
    delete detailThumb.dataset.atlasMainPhoto;
    detailThumb.style.backgroundImage = "";
  }
}

function ensureMainPhotoSection(
  root: HTMLElement,
  photos: Map<string, Attachment>,
  refreshMainPhotos: () => Promise<void>,
) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const drawer = detailPanel?.querySelector<HTMLElement>('div[tabindex="0"]');
  if (!drawer) return;

  const room = drawer.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
  if (!room) return;

  const propertyId = activePropertyIdFromDom();
  const photo = photos.get(normalized(room));
  let section = drawer.querySelector<HTMLElement>(":scope > .atlas-location-main-photo-section");
  if (!section) {
    section = document.createElement("section");
    section.className = "atlas-location-main-photo-section";
    const first = drawer.firstElementChild;
    if (first?.nextSibling) drawer.insertBefore(section, first.nextSibling);
    else drawer.appendChild(section);
  }

  const signature = `${room}|${photo?.id || ""}|${photo?.url || ""}`;
  if (section.dataset.signature === signature) return;
  section.dataset.signature = signature;
  section.replaceChildren();

  const header = document.createElement("div");
  header.className = "atlas-location-main-photo-header";
  const title = document.createElement("strong");
  title.textContent = "Main Photo";
  header.appendChild(title);

  const body = document.createElement("div");
  body.className = "atlas-location-main-photo-body";
  if (photo?.url) {
    const image = document.createElement("img");
    image.src = photo.url;
    image.alt = `${room} main photo`;
    image.className = "atlas-location-main-photo-image";
    body.appendChild(image);
  } else {
    const empty = document.createElement("div");
    empty.className = "atlas-location-main-photo-empty";
    empty.textContent = room.slice(0, 2).toUpperCase();
    body.appendChild(empty);
  }

  const actions = document.createElement("div");
  actions.className = "atlas-location-main-photo-actions";
  const add = actionButton(photo ? "Replace" : "Add Photo", "atlas-location-main-photo-button");
  actions.appendChild(add);

  if (photo) {
    const edit = actionButton("Edit", "atlas-location-main-photo-button");
    const remove = actionButton("Remove", "atlas-location-main-photo-button atlas-location-main-photo-remove");
    actions.append(edit, remove);

    edit.addEventListener("click", () => {
      void openEditor({
        title: "Edit Main Photo",
        sourceUrl: photo.url,
        fileName: photo.name || `${slug(room)}-main-photo.jpg`,
        onSave: async (file) => {
          const blob = await uploadEditedFile(propertyId, room, mainPhotoKey(room), file);
          await replaceAttachment(propertyId, photo, file, blob.url);
          await refreshMainPhotos();
        },
      });
    });

    remove.addEventListener("click", async () => {
      if (!window.confirm("Remove this main photo?")) return;
      remove.disabled = true;
      try {
        await removeAttachment(propertyId, photo.id);
        await refreshMainPhotos();
      } catch (error) {
        remove.disabled = false;
        window.alert(error instanceof Error ? error.message : "Could not remove the main photo.");
      }
    });
  }

  add.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        if (!file) return;
        void openEditor({
          title: photo ? "Replace Main Photo" : "Add Main Photo",
          sourceFile: file,
          fileName: file.name || `${slug(room)}-main-photo.jpg`,
          onSave: async (editedFile) => {
            const blob = await uploadEditedFile(propertyId, room, mainPhotoKey(room), editedFile);
            if (photo) await replaceAttachment(propertyId, photo, editedFile, blob.url);
            else await createAttachment(propertyId, room, mainPhotoKey(room), editedFile, blob.url);
            await refreshMainPhotos();
          },
        });
      },
      { once: true },
    );
    input.click();
  });

  section.append(header, body, actions);
}

function addSpecPhotoEditButtons(root: HTMLElement) {
  const detailPanel = root.querySelector<HTMLElement>("[data-atlas-detail-panel]");
  const drawer = detailPanel?.querySelector<HTMLElement>('div[tabindex="0"]');
  const room = drawer?.querySelector<HTMLElement>("h3")?.textContent?.trim() || "";
  if (!drawer || !room) return;
  const propertyId = activePropertyIdFromDom();

  for (const host of Array.from(drawer.querySelectorAll<HTMLElement>(".atlas-spec-attachments[data-spec-key]"))) {
    const key = String(host.dataset.specKey || "");
    if (!key) continue;

    for (const card of Array.from(host.querySelectorAll<HTMLElement>(".atlas-spec-file"))) {
      const image = card.querySelector<HTMLImageElement>("img.atlas-spec-image");
      const row = card.querySelector<HTMLElement>(".atlas-spec-file-row");
      if (!image || !row || row.querySelector(".atlas-spec-photo-edit")) continue;

      const edit = actionButton("Edit", "atlas-spec-action atlas-spec-photo-edit");
      row.insertBefore(edit, row.lastElementChild);
      edit.addEventListener("click", async () => {
        edit.disabled = true;
        try {
          const items = await loadAttachments(propertyId, room, key);
          const imageUrl = String(image.currentSrc || image.src || "");
          const item = items.find(
            (candidate) =>
              candidate.kind === "image" &&
              (candidate.url === imageUrl || imageUrl.endsWith(candidate.url) || candidate.url.endsWith(imageUrl)),
          );
          if (!item) throw new Error("Atlas could not match this photo to its attachment record.");

          await openEditor({
            title: "Edit Photo",
            sourceUrl: item.url,
            fileName: item.name || "location-photo.jpg",
            onSave: async (file) => {
              const blob = await uploadEditedFile(propertyId, room, key, file);
              const updated = await replaceAttachment(propertyId, item, file, blob.url);
              image.src = updated.url;
              const imageLink = image.closest("a");
              if (imageLink) imageLink.href = updated.url;
              const fileLink = row.querySelector<HTMLAnchorElement>(".atlas-spec-file-link");
              if (fileLink) {
                fileLink.href = updated.url;
                fileLink.textContent = updated.name || fileLink.textContent;
              }
            },
          });
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Could not edit this photo.");
        } finally {
          edit.disabled = false;
        }
      });
    }
  }
}

export default function AtlasLocationPhotoEditor() {
  useEffect(() => {
    let frame = 0;
    let loading = false;
    let loadedPropertyId = "";
    let photos = new Map<string, Attachment>();

    const refreshMainPhotos = async () => {
      if (loading) return;
      loading = true;
      const propertyId = activePropertyIdFromDom();
      try {
        photos = await loadMainPhotos(propertyId);
        loadedPropertyId = propertyId;
      } catch (error) {
        console.error("Atlas main photo load failed:", error);
      } finally {
        loading = false;
        schedule();
      }
    };

    const apply = () => {
      frame = 0;
      const root = locationsMain();
      if (!root) return;
      const propertyId = activePropertyIdFromDom();
      if (propertyId !== loadedPropertyId && !loading) {
        void refreshMainPhotos();
      }
      applyMainPhotoToChrome(root, photos);
      ensureMainPhotoSection(root, photos, refreshMainPhotos);
      addSpecPhotoEditButtons(root);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    void refreshMainPhotos();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      document.querySelector(".atlas-photo-editor-overlay")?.remove();
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-location-main-photo-section {
        display: grid !important;
        grid-template-columns: minmax(150px, 220px) minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 10px !important;
        margin: 0 !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 12px !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-location-main-photo-header strong {
        color: #0b2c43 !important;
        font-size: 13px !important;
      }

      .atlas-location-main-photo-body {
        min-width: 0 !important;
      }

      .atlas-location-main-photo-image,
      .atlas-location-main-photo-empty {
        width: 100% !important;
        height: 92px !important;
        border-radius: 10px !important;
        border: 1px solid #d9e2eb !important;
        background: #f6f8fa !important;
      }

      .atlas-location-main-photo-image {
        display: block !important;
        object-fit: cover !important;
      }

      .atlas-location-main-photo-empty {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #66788a !important;
        font-size: 22px !important;
        font-weight: 900 !important;
      }

      .atlas-location-main-photo-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        justify-content: flex-end !important;
        gap: 6px !important;
      }

      .atlas-location-main-photo-button,
      .atlas-photo-editor-button,
      .atlas-photo-editor-save,
      .atlas-photo-editor-close {
        min-height: 32px !important;
        padding: 6px 10px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        color: #0b2c43 !important;
        font: inherit !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        box-shadow: none !important;
      }

      .atlas-location-main-photo-remove {
        color: #9f1d20 !important;
      }

      .atlas-photo-editor-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 100000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 18px !important;
        background: rgba(7, 24, 39, 0.72) !important;
      }

      .atlas-photo-editor-dialog {
        width: min(920px, 96vw) !important;
        max-height: 94dvh !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto auto auto !important;
        gap: 10px !important;
        padding: 12px !important;
        border-radius: 14px !important;
        background: #ffffff !important;
        box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28) !important;
        overflow: hidden !important;
      }

      .atlas-photo-editor-header,
      .atlas-photo-editor-footer {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      .atlas-photo-editor-header strong {
        color: #0b2c43 !important;
        font-size: 16px !important;
      }

      .atlas-photo-editor-close {
        min-width: 34px !important;
        padding: 4px 9px !important;
        font-size: 20px !important;
        line-height: 1 !important;
      }

      .atlas-photo-editor-preview-wrap {
        min-height: 260px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 12px !important;
        background: #0c1721 !important;
        overflow: auto !important;
      }

      .atlas-photo-editor-preview {
        display: block !important;
        max-width: 100% !important;
        max-height: 58dvh !important;
        width: auto !important;
        height: auto !important;
      }

      .atlas-photo-editor-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
      }

      .atlas-photo-editor-button-active {
        border-color: #c99a3d !important;
        background: #fff8e8 !important;
      }

      .atlas-photo-editor-crop {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(120px, 1fr)) !important;
        gap: 8px !important;
        padding: 9px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 10px !important;
        background: #f8fafc !important;
      }

      .atlas-photo-editor-crop[hidden] {
        display: none !important;
      }

      .atlas-photo-editor-crop-control {
        display: grid !important;
        grid-template-columns: 1fr auto !important;
        align-items: center !important;
        gap: 5px !important;
        color: #0b2c43 !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }

      .atlas-photo-editor-crop-control input {
        grid-column: 1 / -1 !important;
        width: 100% !important;
      }

      .atlas-photo-editor-status {
        min-height: 18px !important;
        color: #66788a !important;
        font-size: 11px !important;
        margin-right: auto !important;
      }

      .atlas-photo-editor-save {
        background: #0b2c43 !important;
        border-color: #0b2c43 !important;
        color: #ffffff !important;
      }

      .atlas-spec-photo-edit {
        white-space: nowrap !important;
      }

      @media (max-width: 900px) {
        .atlas-location-main-photo-section {
          grid-template-columns: 1fr !important;
        }

        .atlas-location-main-photo-actions {
          justify-content: flex-start !important;
        }

        .atlas-location-main-photo-image,
        .atlas-location-main-photo-empty {
          height: 150px !important;
        }

        .atlas-photo-editor-overlay {
          padding: 8px !important;
        }

        .atlas-photo-editor-dialog {
          width: 100% !important;
          max-height: 96dvh !important;
        }

        .atlas-photo-editor-preview-wrap {
          min-height: 200px !important;
        }

        .atlas-photo-editor-crop {
          grid-template-columns: repeat(2, minmax(120px, 1fr)) !important;
        }
      }
    `}</style>
  );
}
