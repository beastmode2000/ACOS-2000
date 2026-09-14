"use client";

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

function logoLikeText(value: unknown) {
  const text = normalized(value);
  return /(^|\s|[-_/])logos?(\s|$|[-_/])/.test(text) || text.includes("vendor logo");
}

function hideLogoRecords(root: HTMLElement | null) {
  if (!root) return;
  const list =
    root.querySelector<HTMLElement>(".atlas-manuals-upgraded-list-pane") ||
    root.querySelector<HTMLElement>(".atlas-documents-list-pane") ||
    root;

  for (const candidate of Array.from(
    list.querySelectorAll<HTMLElement>("button, article, [role='button'], [role='listitem']"),
  )) {
    if (!logoLikeText(candidate.textContent)) continue;
    const row = candidate.closest<HTMLElement>("article, [role='listitem']") || candidate.parentElement || candidate;
    row.classList.add("atlas-vendor-logo-shared-record-hidden");
  }
}

function manualPreviewUrl(element: Element) {
  if (element instanceof HTMLIFrameElement || element instanceof HTMLEmbedElement) {
    return clean(element.getAttribute("src"));
  }
  if (element instanceof HTMLObjectElement) return clean(element.getAttribute("data"));
  return "";
}

function simplifyManualPreview(root: HTMLElement | null) {
  if (!root) return;
  const detail =
    root.querySelector<HTMLElement>(".atlas-manuals-upgraded-detail-pane") ||
    Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))
      .filter((element) => visible(element) && element.getBoundingClientRect().width > 420)
      .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0] ||
    null;
  if (!detail) return;

  const previews = Array.from(detail.querySelectorAll("iframe, embed, object"));
  if (!previews.length) return;

  const source = previews.map(manualPreviewUrl).find(Boolean) || "";
  previews.forEach((preview) => preview.classList.add("atlas-manual-inline-preview-hidden"));

  if (detail.querySelector(".atlas-manual-open-fallback")) return;

  const fallback = document.createElement("div");
  fallback.className = "atlas-manual-open-fallback";
  const heading = document.createElement("strong");
  heading.textContent = "Manual ready to open";
  const note = document.createElement("span");
  note.textContent = "Open the manual for full PDF navigation.";
  fallback.append(heading, note);

  if (source) {
    const link = document.createElement("a");
    link.href = source;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open Manual";
    fallback.appendChild(link);
  } else {
    const nativeOpen = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => /^(open|open pdf|view)$/i.test(clean(button.textContent)) && visible(button),
    );
    if (nativeOpen) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open Manual";
      button.addEventListener("click", () => nativeOpen.click());
      fallback.appendChild(button);
    }
  }

  previews[0].parentElement?.insertBefore(fallback, previews[0]);
}

async function imageToDataUrl(file: File) {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read logo image."));
    reader.readAsDataURL(file);
  });
  if (!raw || !file.type.startsWith("image/")) return raw;

  return await new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const maxSide = 700;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return resolve(raw);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(raw);
      }
    };
    image.onerror = () => resolve(raw);
    image.src = raw;
  });
}

type VendorRow = Record<string, unknown>;

function vendorRows(payload: Record<string, unknown>): VendorRow[] {
  const data = payload.data && typeof payload.data === "object" ? payload.data as Record<string, unknown> : {};
  const candidates = [payload.vendorRecords, payload.vendors, data.vendorRecords, data.vendors];
  return (candidates.find(Array.isArray) || []) as VendorRow[];
}

async function fetchVendor(propertyId: string, name: string) {
  const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, {
    cache: "no-store",
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || payload.ok === false) throw new Error(clean(payload.error) || "Vendor could not be loaded.");
  const wanted = normalized(name);
  return vendorRows(payload).find((vendor) => normalized(vendor.name) === wanted) || null;
}

async function saveVendorLogo(vendor: VendorRow, propertyId: string, logoDataUrl: string) {
  const response = await fetch("/api/atlas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      table: "vendors",
      propertyId,
      record: { ...vendor, propertyId, logoDataUrl },
    }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || payload.ok === false) throw new Error(clean(payload.error) || "Vendor logo could not be saved.");
}

function selectedVendorContext(root: HTMLElement) {
  const legacyControl = Array.from(root.querySelectorAll<HTMLElement>("button, label")).find((element) => {
    const value = normalized(element.textContent);
    return value === "paste logo" || value === "choose logo" || value === "remove logo";
  });
  if (!legacyControl) return null;
  const controlRow = legacyControl.parentElement;
  if (!controlRow) return null;
  const section = controlRow.closest<HTMLElement>("section") || controlRow.parentElement;
  const title = section?.querySelector<HTMLElement>("h3") || root.querySelector<HTMLElement>("h3");
  const name = clean(title?.textContent);
  return name ? { controlRow, name } : null;
}

function patchVendorLogoImages(root: HTMLElement, vendorName: string, logoDataUrl: string) {
  const wanted = normalized(`${vendorName} logo`);
  for (const image of Array.from(root.querySelectorAll<HTMLImageElement>("img[alt]"))) {
    if (normalized(image.alt) !== wanted) continue;
    if (!logoDataUrl) {
      image.removeAttribute("src");
      image.style.display = "none";
    } else {
      image.style.display = "block";
      image.src = logoDataUrl;
    }
  }
}

const migrated = new Set<string>();
const inFlight = new Set<string>();

async function setupVendorLogoIsolation(root: HTMLElement) {
  const context = selectedVendorContext(root);
  if (!context) return;
  const { controlRow, name } = context;
  const propertyId = activePropertyIdFromDom();
  const key = `${propertyId}|${normalized(name)}`;

  for (const child of Array.from(controlRow.children)) {
    if (!(child instanceof HTMLElement) || child.classList.contains("atlas-vendor-logo-isolated-controls")) continue;
    const value = normalized(child.textContent);
    if (value === "paste logo" || value === "choose logo" || value === "remove logo") {
      child.classList.add("atlas-vendor-logo-legacy-control-hidden");
    }
  }

  let controls = controlRow.querySelector<HTMLElement>(".atlas-vendor-logo-isolated-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "atlas-vendor-logo-isolated-controls";

    const paste = document.createElement("button");
    paste.type = "button";
    paste.textContent = "Paste Logo";

    const chooseLabel = document.createElement("label");
    chooseLabel.textContent = "Choose Logo";
    const choose = document.createElement("input");
    choose.type = "file";
    choose.accept = "image/*";
    choose.hidden = true;
    chooseLabel.appendChild(choose);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove Logo";
    remove.className = "atlas-vendor-logo-remove";

    const status = document.createElement("span");
    status.className = "atlas-vendor-logo-status";
    controls.append(paste, chooseLabel, remove, status);
    controlRow.appendChild(controls);

    const saveFile = async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      status.textContent = "Saving…";
      try {
        const vendor = await fetchVendor(propertyId, name);
        if (!vendor) throw new Error("Vendor record was not found.");
        const dataUrl = await imageToDataUrl(file);
        await saveVendorLogo(vendor, propertyId, dataUrl);
        patchVendorLogoImages(root, name, dataUrl);
        migrated.add(key);
        status.textContent = "Saved";
        window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { propertyId, table: "vendors" } }));
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Logo could not be saved.";
      }
    };

    choose.addEventListener("change", () => {
      const file = choose.files?.[0];
      if (file) void saveFile(file);
      choose.value = "";
    });

    paste.addEventListener("click", async () => {
      status.textContent = "";
      try {
        if (!navigator.clipboard?.read) throw new Error("Clipboard image access is not available here. Use Choose Logo.");
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((candidate) => candidate.startsWith("image/"));
          if (!type) continue;
          const blob = await item.getType(type);
          await saveFile(new File([blob], `vendor-logo.${type.split("/")[1] || "png"}`, { type }));
          return;
        }
        throw new Error("No image is currently copied.");
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Logo could not be pasted.";
      }
    });

    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove the logo from ${name}?`)) return;
      status.textContent = "Removing…";
      try {
        const vendor = await fetchVendor(propertyId, name);
        if (!vendor) throw new Error("Vendor record was not found.");
        await saveVendorLogo(vendor, propertyId, "");
        patchVendorLogoImages(root, name, "");
        migrated.add(key);
        status.textContent = "Removed";
        window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { propertyId, table: "vendors" } }));
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Logo could not be removed.";
      }
    });
  }

  if (migrated.has(key) || inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const vendor = await fetchVendor(propertyId, name);
    if (!vendor) return;
    const direct = clean(vendor.logoDataUrl);
    if (direct) {
      patchVendorLogoImages(root, name, direct);
      migrated.add(key);
      return;
    }

    const legacyImage = Array.from(root.querySelectorAll<HTMLImageElement>("img[alt]"))
      .find((image) => normalized(image.alt) === normalized(`${name} logo`) && clean(image.src));
    if (!legacyImage?.src) {
      migrated.add(key);
      return;
    }

    await saveVendorLogo(vendor, propertyId, legacyImage.src);
    patchVendorLogoImages(root, name, legacyImage.src);
    migrated.add(key);
    window.dispatchEvent(new CustomEvent("atlas:data-changed", { detail: { propertyId, table: "vendors" } }));
  } catch {
    // Leave migration eligible to retry after a transient failure.
  } finally {
    inFlight.delete(key);
  }
}

export default function AtlasVendorLogoManualIsolation() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      hideLogoRecords(pageMain("Manuals"));
      hideLogoRecords(pageMain("Documents"));
      simplifyManualPreview(pageMain("Manuals"));
      const vendors = pageMain("Vendors");
      if (vendors) void setupVendorLogoIsolation(vendors);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("atlas:data-changed", schedule as EventListener);
    return () => {
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-logo-shared-record-hidden,
      .atlas-vendor-logo-legacy-control-hidden,
      .atlas-manual-inline-preview-hidden {
        display: none !important;
      }

      .atlas-vendor-logo-isolated-controls {
        display: flex !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        align-items: center !important;
      }

      .atlas-vendor-logo-isolated-controls > button,
      .atlas-vendor-logo-isolated-controls > label {
        min-height: 34px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 6px 10px !important;
        border: 1px solid #d9e2ea !important;
        border-radius: 9px !important;
        background: #ffffff !important;
        color: #0a2841 !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
      }

      .atlas-vendor-logo-isolated-controls > .atlas-vendor-logo-remove {
        color: #9f1d20 !important;
        border-color: #f0c5c7 !important;
      }

      .atlas-vendor-logo-status {
        color: #6b7c8c !important;
        font-size: 10px !important;
      }

      .atlas-manual-open-fallback {
        min-height: 150px !important;
        display: grid !important;
        place-items: center !important;
        align-content: center !important;
        gap: 7px !important;
        padding: 18px !important;
        margin: 8px 0 !important;
        border: 1px solid #d9e2ea !important;
        border-radius: 10px !important;
        background: #f8fafc !important;
        text-align: center !important;
      }

      .atlas-manual-open-fallback strong {
        color: #0a2841 !important;
        font-size: 14px !important;
      }

      .atlas-manual-open-fallback span {
        color: #6b7c8c !important;
        font-size: 11px !important;
      }

      .atlas-manual-open-fallback a,
      .atlas-manual-open-fallback button {
        min-height: 36px !important;
        padding: 7px 12px !important;
        border: 1px solid #0a2841 !important;
        border-radius: 9px !important;
        background: #0a2841 !important;
        color: #ffffff !important;
        text-decoration: none !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }
    `}</style>
  );
}
