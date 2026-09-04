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

  card.querySelectorAll(".atlas-spec-attachments").forEach((node) => node.remove());
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
        const blob = await clipboardItem.getType(imageType);
        const extension = imageType.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const file = new File([blob], `pasted-spec-${Date.now()}.${extension}`, { type: imageType });
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

export default function AtlasLocationsPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const drawers = Array.from(document.querySelectorAll<HTMLElement>('div[tabindex="0"]'));

      for (const drawer of drawers) {
        const room = drawer.querySelector("h3")?.textContent?.trim() || "";
        if (!room) continue;

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
          grid.querySelectorAll(":scope > .atlas-spec-category").forEach((node) => node.remove());
          let previous = "";
          for (const card of Array.from(grid.querySelectorAll<HTMLElement>(":scope > .atlas-location-spec-card"))) {
            const category = card.dataset.specCategory || "Specifications";
            if (category === previous) continue;
            const heading = document.createElement("div");
            heading.className = "atlas-spec-category";
            heading.textContent = category;
            grid.insertBefore(heading, card);
            previous = category;
          }
        }

        for (const textarea of Array.from(drawer.querySelectorAll<HTMLTextAreaElement>("textarea"))) {
          if (!isSpec(textarea.value || "")) continue;
          textarea.parentElement?.classList.add("atlas-location-spec-edit-row");
          textarea.parentElement?.parentElement?.classList.add("atlas-location-spec-edit-list");
        }

        if (specCards.length) drawer.classList.add("atlas-location-drawer-polish");
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("input", schedule, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("input", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-location-drawer-polish { overflow-x: hidden !important; overscroll-behavior: contain; }
      .atlas-location-spec-grid { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; gap: 12px !important; margin-top: 16px !important; padding-top: 38px !important; position: relative !important; }
      .atlas-location-spec-grid::before { content: "Specifications"; position: absolute; top: 0; left: 0; font-size: 17px; font-weight: 900; color: #0b1e33; }
      .atlas-spec-category { margin-top: 8px; padding: 10px 2px 3px; border-bottom: 1px solid #dce4ec; color: #0b1e33; font-size: 14px; font-weight: 900; }
      .atlas-location-spec-card { display: grid !important; grid-template-columns: minmax(190px,.32fr) minmax(0,1fr) !important; gap: 18px !important; align-items: start !important; min-width: 0 !important; padding: 16px !important; border: 1px solid #d9e2eb !important; border-radius: 12px !important; background: #fff !important; box-shadow: 0 2px 7px rgba(15,42,67,.04) !important; }
      .atlas-location-spec-label { display:block !important; color:#0b1e33 !important; font-size:13px !important; line-height:1.4 !important; font-weight:900 !important; text-transform:none !important; overflow-wrap:anywhere !important; }
      .atlas-location-spec-value { display:block !important; min-width:0 !important; color:#33465b !important; font-size:13px !important; line-height:1.65 !important; font-weight:650 !important; white-space:pre-wrap !important; overflow-wrap:anywhere !important; }
      .atlas-spec-attachments { grid-column:1/-1; display:grid; gap:10px; padding-top:12px; border-top:1px solid #e6ebf0; }
      .atlas-spec-controls { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
      .atlas-spec-action { min-height:32px; padding:6px 10px; border:1px solid #d2dbe4; border-radius:8px; background:#fff; color:#0b1e33; font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
      .atlas-spec-action:hover { border-color:#c99a3d; background:#fffaf0; }
      .atlas-spec-action:disabled { opacity:.55; cursor:default; }
      .atlas-spec-delete { color:#b42318; }
      .atlas-spec-status,.atlas-spec-empty { color:#607086; font-size:11px; }
      .atlas-spec-files { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; }
      .atlas-spec-file { min-width:0; overflow:hidden; border:1px solid #dce4ec; border-radius:10px; background:#f8fafc; }
      .atlas-spec-image { display:block; width:100%; max-height:240px; object-fit:contain; background:#fff; }
      .atlas-spec-file-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px; }
      .atlas-spec-file-link { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#175cd3; font-size:12px; font-weight:800; text-decoration:none; }
      .atlas-location-spec-edit-list { display:grid !important; gap:12px !important; }
      .atlas-location-spec-edit-row { display:grid !important; grid-template-columns:minmax(190px,.42fr) minmax(320px,1fr) auto !important; gap:10px !important; align-items:start !important; padding:12px !important; border:1px solid #d9e2eb !important; border-radius:12px !important; background:#fbfcfd !important; }
      .atlas-location-spec-edit-row textarea { min-height:132px !important; line-height:1.5 !important; }
      @media (max-width:900px) {
        .atlas-location-spec-card { grid-template-columns:minmax(0,1fr) !important; gap:8px !important; padding:13px !important; }
        .atlas-location-spec-value { font-size:12.5px !important; line-height:1.6 !important; }
        .atlas-spec-files { grid-template-columns:minmax(0,1fr); }
        .atlas-location-spec-edit-row { grid-template-columns:minmax(0,1fr) !important; }
      }
    `}</style>
  );
}
