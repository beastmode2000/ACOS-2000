"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function acceptsImages(input: HTMLInputElement) {
  if (input.type !== "file") return false;
  const accept = normalized(input.accept);
  return accept.includes("image") || accept.includes("png") || accept.includes("jpeg") || accept.includes("jpg") || accept.includes("webp");
}

function uploadControl(input: HTMLInputElement) {
  const label = input.closest("label");
  return label instanceof HTMLElement ? label : input;
}

function localScope(input: HTMLInputElement) {
  const control = uploadControl(input);
  return control.parentElement || control;
}

function alreadyHasPaste(input: HTMLInputElement) {
  const scope = localScope(input);
  const controls = Array.from(scope.querySelectorAll<HTMLElement>("button, [role='button'], label"));
  return controls.some((control) => {
    if (control === uploadControl(input)) return false;
    const text = normalized(control.textContent);
    return text === "paste" || text === "paste photo" || text === "paste image" || text.startsWith("paste image ");
  });
}

function extensionFor(type: string) {
  const mime = normalized(type);
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("heic")) return "heic";
  return "jpg";
}

async function clipboardImageFiles(limit: number) {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    throw new Error("Clipboard image paste is not available in this browser.");
  }

  const items = await navigator.clipboard.read();
  const files: File[] = [];

  for (const item of items) {
    const imageTypes = item.types.filter((type) => type.toLowerCase().startsWith("image/"));
    for (const type of imageTypes) {
      const blob = await item.getType(type);
      const file = new File(
        [blob],
        `pasted-photo-${Date.now()}-${files.length + 1}.${extensionFor(type)}`,
        { type: blob.type || type },
      );
      files.push(file);
      if (files.length >= limit) return files;
    }
  }

  return files;
}

function setInputFiles(input: HTMLInputElement, files: File[]) {
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function makePasteButton(input: HTMLInputElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "atlas-photo-paste-button";
  button.dataset.atlasPhotoPasteFor = "true";
  button.textContent = "Paste";
  button.setAttribute("aria-label", "Paste photo from clipboard");
  button.disabled = input.disabled;

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Pasting…";

    try {
      const files = await clipboardImageFiles(input.multiple ? 20 : 1);
      if (!files.length) {
        throw new Error("No image was found on the clipboard. Use Copy image, then try Paste again.");
      }
      setInputFiles(input, files);
      button.textContent = files.length > 1 ? `${files.length} pasted` : "Pasted";
      window.setTimeout(() => {
        if (document.body.contains(button)) button.textContent = original;
      }, 1200);
    } catch (error) {
      button.textContent = original;
      window.alert(error instanceof Error ? error.message : "Could not paste the clipboard image.");
    } finally {
      if (document.body.contains(button)) button.disabled = input.disabled;
    }
  });

  return button;
}

function addPasteButton(input: HTMLInputElement) {
  if (!acceptsImages(input)) return;
  if (input.dataset.atlasPhotoPasteBound === "true") return;
  if (alreadyHasPaste(input)) {
    input.dataset.atlasPhotoPasteBound = "true";
    return;
  }

  const control = uploadControl(input);
  const parent = control.parentElement;
  if (!parent) return;

  const button = makePasteButton(input);
  control.insertAdjacentElement("afterend", button);
  input.dataset.atlasPhotoPasteBound = "true";
}

function syncButtons() {
  for (const input of Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'))) {
    if (!acceptsImages(input)) continue;
    addPasteButton(input);

    const control = uploadControl(input);
    const next = control.nextElementSibling;
    if (next instanceof HTMLButtonElement && next.dataset.atlasPhotoPasteFor === "true") {
      next.disabled = input.disabled;
    }
  }
}

export default function AtlasPhotoPastePolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncButtons();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "accept", "multiple"],
    });

    document.addEventListener("click", schedule, true);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
      document.querySelectorAll<HTMLElement>("[data-atlas-photo-paste-for='true']").forEach((node) => node.remove());
      document.querySelectorAll<HTMLInputElement>("input[data-atlas-photo-paste-bound='true']").forEach((input) => {
        delete input.dataset.atlasPhotoPasteBound;
      });
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-photo-paste-button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 32px !important;
        padding: 6px 10px !important;
        border: 1px solid #d4dee7 !important;
        border-radius: 9px !important;
        background: #ffffff !important;
        color: #0b2c43 !important;
        font: inherit !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        box-shadow: none !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
      }

      .atlas-photo-paste-button:hover:not(:disabled) {
        background: #eef6ff !important;
        border-color: #b8cee2 !important;
      }

      .atlas-photo-paste-button:disabled {
        cursor: default !important;
        opacity: 0.55 !important;
      }

      @media (max-width: 760px) {
        .atlas-photo-paste-button {
          min-height: 34px !important;
          padding: 7px 11px !important;
          font-size: 11px !important;
        }
      }
    `}</style>
  );
}
