"use client";

import { upload } from "@vercel/blob/client";
import { useEffect } from "react";

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return clean(value).toLowerCase();
}

function visible(element: HTMLElement | null) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function pageMain(title: string) {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => normalized(node.textContent) === normalized(title) && visible(node),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function activePropertyIdFromDom() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  const propertySelect = selects.find((select) => {
    const values = Array.from(select.options).map((option) => normalized(option.value));
    return values.includes("2000") && (values.includes("6855") || values.includes("3661") || values.includes("hangar"));
  });
  return clean(propertySelect?.value) || "2000";
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140) || "vendor";
}

function safeFileName(value: string) {
  return (value || "business-card.jpg")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "business-card.jpg";
}

type VendorRow = Record<string, unknown>;

function vendorRows(payload: Record<string, unknown>): VendorRow[] {
  const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  const candidates = [payload.vendorRecords, payload.vendors, data.vendorRecords, data.vendors];
  return (candidates.find(Array.isArray) || []) as VendorRow[];
}

async function fetchVendor(propertyId: string, name: string) {
  const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&vendorCard=${Date.now()}`, {
    cache: "no-store",
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || payload.ok === false) throw new Error(clean(payload.error) || "Vendor could not be loaded.");
  const wanted = normalized(name);
  return vendorRows(payload).find((vendor) => normalized(vendor.name) === wanted) || null;
}

async function saveVendorBusinessCard(
  vendor: VendorRow,
  propertyId: string,
  businessCardUrl: string,
  businessCardName: string,
) {
  const response = await fetch("/api/atlas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      table: "vendors",
      propertyId,
      record: {
        ...vendor,
        propertyId,
        businessCardUrl,
        businessCardName,
      },
    }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || payload.ok === false) throw new Error(clean(payload.error) || "Business card could not be saved.");
}

function selectedVendorContext(root: HTMLElement) {
  const infoLabel = Array.from(root.querySelectorAll<HTMLElement>("div, span, strong")).find(
    (element) => normalized(element.textContent) === "vendor information" && visible(element),
  );
  const section = infoLabel?.closest<HTMLElement>("section") || null;
  if (!section) return null;

  const previous = section.previousElementSibling instanceof HTMLElement ? section.previousElementSibling : null;
  const title = previous?.querySelector<HTMLElement>("h3") || root.querySelector<HTMLElement>("h3");
  const name = clean(title?.textContent);
  if (!name) return null;

  return { section, name };
}

function extensionFor(type: string) {
  const mime = normalized(type);
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

async function clipboardBusinessCard() {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    throw new Error("Clipboard image access is not available here. Use Upload Card.");
  }
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((candidate) => candidate.toLowerCase().startsWith("image/"));
    if (!type) continue;
    const blob = await item.getType(type);
    return new File([blob], `business-card-${Date.now()}.${extensionFor(type)}`, { type: blob.type || type });
  }
  throw new Error("No image is currently copied.");
}

async function uploadBusinessCard(file: File, propertyId: string, vendor: VendorRow, vendorName: string) {
  if (!file.type.startsWith("image/")) throw new Error("Business card must be an image.");
  const vendorKey = clean(vendor.id) || slug(vendorName);
  const blob = await upload(
    `atlas-vendor-business-cards/${slug(propertyId)}/${slug(vendorKey)}/${Date.now()}-${safeFileName(file.name)}`,
    file,
    {
      access: "public",
      handleUploadUrl: "/api/atlas-document-upload",
      contentType: file.type || undefined,
    },
  );
  return { url: blob.url, name: file.name || "Business Card" };
}

function makeButton(text: string, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = `atlas-vendor-card-action ${className}`.trim();
  return button;
}

function renderPanel(panel: HTMLElement, vendor: VendorRow, propertyId: string, vendorName: string) {
  panel.replaceChildren();

  const url = clean(vendor.businessCardUrl);
  const savedName = clean(vendor.businessCardName) || "Business Card";

  const header = document.createElement("div");
  header.className = "atlas-vendor-card-header";

  const title = document.createElement("div");
  title.className = "atlas-vendor-card-title";
  const eyebrow = document.createElement("span");
  eyebrow.textContent = "Business Card";
  const statusLine = document.createElement("strong");
  statusLine.textContent = url ? savedName : "No card saved";
  title.append(eyebrow, statusLine);

  const actions = document.createElement("div");
  actions.className = "atlas-vendor-card-actions";

  const paste = makeButton("Paste Card");
  const uploadLabel = document.createElement("label");
  uploadLabel.className = "atlas-vendor-card-action";
  uploadLabel.textContent = url ? "Replace Card" : "Upload Card";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  uploadLabel.appendChild(input);
  actions.append(paste, uploadLabel);

  if (url) {
    const remove = makeButton("Remove", "atlas-vendor-card-remove");
    actions.appendChild(remove);
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove the business card from ${vendorName}?`)) return;
      setBusy(true, "Removing…");
      try {
        const latest = await fetchVendor(propertyId, vendorName);
        if (!latest) throw new Error("Vendor record was not found.");
        await saveVendorBusinessCard(latest, propertyId, "", "");
        renderPanel(panel, { ...latest, businessCardUrl: "", businessCardName: "" }, propertyId, vendorName);
        window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { propertyId, table: "vendors" } }));
      } catch (error) {
        setBusy(false, error instanceof Error ? error.message : "Business card could not be removed.");
      }
    });
  }

  header.append(title, actions);
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "atlas-vendor-card-body";

  if (url) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "atlas-vendor-card-preview-link";
    const image = document.createElement("img");
    image.src = url;
    image.alt = `${vendorName} business card`;
    image.className = "atlas-vendor-card-preview";
    image.loading = "lazy";
    link.appendChild(image);
    body.appendChild(link);
  } else {
    const empty = document.createElement("span");
    empty.className = "atlas-vendor-card-empty";
    empty.textContent = "Add a photo or image of the vendor’s business card for quick reference.";
    body.appendChild(empty);
  }

  const message = document.createElement("span");
  message.className = "atlas-vendor-card-message";
  body.appendChild(message);
  panel.appendChild(body);

  const setBusy = (busy: boolean, text: string) => {
    paste.disabled = busy;
    input.disabled = busy;
    actions.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.disabled = busy;
    });
    message.textContent = text;
  };

  const saveFile = async (file: File) => {
    setBusy(true, "Uploading…");
    try {
      const latest = await fetchVendor(propertyId, vendorName);
      if (!latest) throw new Error("Vendor record was not found.");
      const uploaded = await uploadBusinessCard(file, propertyId, latest, vendorName);
      await saveVendorBusinessCard(latest, propertyId, uploaded.url, uploaded.name);
      renderPanel(
        panel,
        { ...latest, businessCardUrl: uploaded.url, businessCardName: uploaded.name },
        propertyId,
        vendorName,
      );
      window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { propertyId, table: "vendors" } }));
    } catch (error) {
      setBusy(false, error instanceof Error ? error.message : "Business card could not be uploaded.");
    }
  };

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) void saveFile(file);
    input.value = "";
  });

  paste.addEventListener("click", async () => {
    setBusy(true, "Reading clipboard…");
    try {
      const file = await clipboardBusinessCard();
      await saveFile(file);
    } catch (error) {
      setBusy(false, error instanceof Error ? error.message : "Business card could not be pasted.");
    }
  });
}

async function ensureBusinessCardPanel(root: HTMLElement) {
  const context = selectedVendorContext(root);
  if (!context) return;
  const { section, name } = context;
  const propertyId = activePropertyIdFromDom();
  const key = `${propertyId}|${normalized(name)}`;

  let panel = section.querySelector<HTMLElement>(".atlas-vendor-business-card");
  if (panel && panel.dataset.vendorCardKey !== key) {
    panel.remove();
    panel = null;
  }

  if (!panel) {
    panel = document.createElement("div");
    panel.className = "atlas-vendor-business-card";
    panel.dataset.vendorCardKey = key;
    panel.dataset.vendorCardLoading = "true";
    section.appendChild(panel);

    const loading = document.createElement("span");
    loading.className = "atlas-vendor-card-empty";
    loading.textContent = "Loading business card…";
    panel.appendChild(loading);

    try {
      const vendor = await fetchVendor(propertyId, name);
      if (!vendor) throw new Error("Vendor record was not found.");
      if (!document.body.contains(panel)) return;
      renderPanel(panel, vendor, propertyId, name);
    } catch (error) {
      if (!document.body.contains(panel)) return;
      panel.replaceChildren();
      const message = document.createElement("span");
      message.className = "atlas-vendor-card-message";
      message.textContent = error instanceof Error ? error.message : "Business card could not be loaded.";
      panel.appendChild(message);
    } finally {
      if (document.body.contains(panel)) delete panel.dataset.vendorCardLoading;
    }
  }
}

export default function AtlasVendorBusinessCardPolish() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const root = pageMain("Vendors");
      if (root) void ensureBusinessCardPanel(root);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-business-card {
        margin-top: 10px !important;
        padding-top: 10px !important;
        border-top: 1px solid #d9e2ea !important;
        display: grid !important;
        gap: 8px !important;
        min-width: 0 !important;
      }

      .atlas-vendor-card-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
      }

      .atlas-vendor-card-title {
        display: grid !important;
        gap: 2px !important;
        min-width: 0 !important;
      }

      .atlas-vendor-card-title > span {
        color: #6b7c8c !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
      }

      .atlas-vendor-card-title > strong {
        color: #0a2841 !important;
        font-size: 12px !important;
        overflow-wrap: anywhere !important;
      }

      .atlas-vendor-card-actions {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
      }

      .atlas-vendor-card-action {
        min-height: 32px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 6px 9px !important;
        border: 1px solid #d9e2ea !important;
        border-radius: 9px !important;
        background: #ffffff !important;
        color: #0a2841 !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
      }

      .atlas-vendor-card-action:hover:not(:disabled) {
        background: #eef6ff !important;
        border-color: #b8cee2 !important;
      }

      .atlas-vendor-card-action:disabled {
        opacity: 0.55 !important;
        cursor: default !important;
      }

      .atlas-vendor-card-remove {
        color: #9f1d20 !important;
        border-color: #f0c5c7 !important;
      }

      .atlas-vendor-card-body {
        display: grid !important;
        gap: 6px !important;
        min-width: 0 !important;
      }

      .atlas-vendor-card-preview-link {
        display: block !important;
        width: fit-content !important;
        max-width: 100% !important;
        text-decoration: none !important;
      }

      .atlas-vendor-card-preview {
        display: block !important;
        width: min(100%, 480px) !important;
        max-height: 260px !important;
        object-fit: contain !important;
        border: 1px solid #d9e2ea !important;
        border-radius: 10px !important;
        background: #ffffff !important;
      }

      .atlas-vendor-card-empty,
      .atlas-vendor-card-message {
        color: #6b7c8c !important;
        font-size: 11px !important;
        line-height: 1.4 !important;
      }

      @media (max-width: 760px) {
        .atlas-vendor-card-header {
          align-items: flex-start !important;
        }

        .atlas-vendor-card-actions {
          width: 100% !important;
        }

        .atlas-vendor-card-action {
          min-height: 34px !important;
          padding: 7px 10px !important;
        }

        .atlas-vendor-card-preview {
          width: 100% !important;
          max-height: 220px !important;
        }
      }
    `}</style>
  );
}