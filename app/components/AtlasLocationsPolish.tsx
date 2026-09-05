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

function markBusyLocationChrome(drawer: HTMLElement, listPanel: HTMLElement | null) {
  for (const button of Array.from(drawer.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = button.textContent?.trim() || "";
    if (text === "+ Sub-location" || text === "+ Sub") {
      button.classList.add("atlas-location-hidden-sub");
    }
  }

  for (const section of Array.from(drawer.querySelectorAll<HTMLElement>("section"))) {
    const text = section.textContent || "";
    if (text.includes("Location at a glance") || text.includes("Property Intelligence")) {
      section.classList.add("atlas-location-hidden-overview");
    }
    if (text.includes("Assets Assigned Here")) {
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
  }

  for (const label of Array.from(drawer.querySelectorAll<HTMLElement>("span"))) {
    const text = label.textContent?.trim() || "";
    if (text === "Type" || text === "Parent" || text === "Hierarchy Path") {
      label.parentElement?.classList.add("atlas-location-hidden-hierarchy-card");
    }
  }

  if (!listPanel) return;

  for (const button of Array.from(listPanel.querySelectorAll<HTMLButtonElement>("button"))) {
    const text = button.textContent?.trim() || "";
    if (text === "+ Sub") button.classList.add("atlas-location-hidden-sub");

    const title = button.querySelector<HTMLElement>("strong")?.textContent?.trim() || "";
    if (!title) continue;
    const wrapper = button.parentElement as HTMLElement | null;
    if (!wrapper) continue;
    button.classList.add("atlas-location-list-card-main");
    wrapper.classList.add("atlas-location-list-card-clean");
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

        drawer.classList.add("atlas-location-drawer-polish", "atlas-location-independent-scroll");

        const drawerPanel = drawer.parentElement as HTMLElement | null;
        const listPanel = drawerPanel?.previousElementSibling as HTMLElement | null;
        if (drawerPanel && listPanel) {
          drawerPanel.classList.add("atlas-location-drawer-panel");
          listPanel.classList.add("atlas-location-list-panel", "atlas-location-independent-scroll");
        }

        markBusyLocationChrome(drawer, listPanel);

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

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
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
        .atlas-location-independent-scroll {
          min-height: 0 !important;
          max-height: calc(100dvh - 190px) !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain !important;
          scrollbar-gutter: stable;
        }
        .atlas-location-drawer-panel {
          min-height: 0 !important;
          overflow: hidden !important;
        }
      }
      .atlas-location-hidden-sub,
      .atlas-location-hidden-overview,
      .atlas-location-hidden-hierarchy-card,
      .atlas-location-hidden-list-review,
      .atlas-location-hidden-list-summary,
      .atlas-location-hidden-hint {
        display: none !important;
      }
      .atlas-location-list-card-clean {
        border-radius: 10px !important;
        box-shadow: none !important;
        transform: none !important;
      }
      .atlas-location-list-card-main {
        padding-top: 9px !important;
        padding-bottom: 9px !important;
      }
      .atlas-location-list-card-main > span:nth-child(2) {
        display: none !important;
      }
      .atlas-location-list-card-main > span:last-child > span,
      .atlas-location-list-card-main > span:last-child > small {
        display: none !important;
      }
      .atlas-location-list-card-main > span:last-child > strong {
        display: block !important;
        font-size: 14px !important;
        line-height: 1.35 !important;
      }
      .atlas-location-equipment-section {
        order: -5;
      }
      .atlas-location-equipment-section [style*="box-shadow"] {
        box-shadow: none !important;
      }
      .atlas-location-drawer-polish img[style*="object-fit: cover"] {
        object-fit: contain !important;
        background: #fff !important;
      }
      .atlas-location-spec-grid {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 8px !important;
        margin-top: 12px !important;
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
        padding: 11px 12px !important;
        border: 1px solid #d9e2eb !important;
        border-radius: 10px !important;
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
        .atlas-location-spec-card { grid-template-columns:minmax(0,1fr) !important; gap:6px !important; padding:10px !important; }
        .atlas-location-spec-value { font-size:12px !important; line-height:1.5 !important; }
        .atlas-spec-files { grid-template-columns:minmax(0,1fr); }
        .atlas-location-spec-edit-row { grid-template-columns:minmax(0,1fr) !important; }
        .atlas-location-list-card-main > span:first-child {
          display: none !important;
        }
      }
    `}</style>
  );
}
