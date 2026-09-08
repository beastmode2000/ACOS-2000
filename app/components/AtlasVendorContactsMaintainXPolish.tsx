"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findContactSection() {
  const addButton = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const label = normalized(button.textContent).replace(/^\+\s*/, "");
    return label === "add department" || label === "add contact";
  });
  return addButton?.closest<HTMLElement>("section") || null;
}

function findButton(root: ParentNode, labels: string[]) {
  const wanted = new Set(labels.map(normalized));
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    wanted.has(normalized(button.textContent)),
  );
}

function labelText(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const label = control.closest("label");
  if (!label) return "";
  const span = label.querySelector<HTMLElement>(":scope > span");
  return normalized(span?.textContent || label.textContent);
}

function renameEditorLabels(article: HTMLElement) {
  const replacements: Record<string, string> = {
    department: "Contact Type",
    "contact name": "Full Name",
    "role title": "Role",
  };

  for (const label of Array.from(article.querySelectorAll<HTMLElement>("label"))) {
    const span = label.querySelector<HTMLElement>(":scope > span");
    if (!span) continue;
    const replacement = replacements[normalized(span.textContent)];
    if (replacement) span.textContent = replacement;
  }
}

function contactName(article: HTMLElement) {
  const input = Array.from(article.querySelectorAll<HTMLInputElement>("input")).find((node) => {
    const label = labelText(node);
    return label === "contact name" || label === "full name";
  });
  return String(input?.value || "").trim();
}

function saveContact(article: HTMLElement) {
  const done = findButton(article, ["Done", "Save Contact"]);
  done?.click();
  window.setTimeout(() => {
    const saveVendor = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => normalized(button.textContent) === "save vendor",
    );
    saveVendor?.click();
  }, 0);
}

function ensureModalChrome(article: HTMLElement) {
  renameEditorLabels(article);

  const name = contactName(article);
  const initial = name.slice(0, 1).toUpperCase() || "C";

  let chrome = article.querySelector<HTMLElement>(":scope > .atlas-vendor-contact-modal-chrome");
  if (!chrome) {
    chrome = document.createElement("div");
    chrome.className = "atlas-vendor-contact-modal-chrome";
    chrome.innerHTML = `
      <div class="atlas-vendor-contact-modal-titlebar">
        <strong class="atlas-vendor-contact-modal-title">${name ? "Edit Contact" : "New Contact"}</strong>
        <button type="button" class="atlas-vendor-contact-modal-close" aria-label="Close contact editor">×</button>
      </div>
      <div class="atlas-vendor-contact-modal-profile">
        <div class="atlas-vendor-contact-modal-avatar" aria-hidden="true">${initial}</div>
        <div>
          <div class="atlas-vendor-contact-modal-kicker">Contact Info</div>
          <div class="atlas-vendor-contact-modal-subtitle">Add the person you work with at this vendor.</div>
        </div>
      </div>
    `;
    article.insertBefore(chrome, article.firstChild);
    chrome
      .querySelector<HTMLButtonElement>(".atlas-vendor-contact-modal-close")
      ?.addEventListener("click", () => saveContact(article));
  }

  const nativeHeader = Array.from(article.children).find(
    (child) => child instanceof HTMLElement && !child.classList.contains("atlas-vendor-contact-modal-chrome"),
  );
  if (nativeHeader instanceof HTMLElement) nativeHeader.classList.add("atlas-vendor-contact-native-header");

  const done = findButton(article, ["Done", "Save Contact"]);
  if (done) {
    done.textContent = "Save Contact";
    done.classList.add("atlas-vendor-contact-save");
    if (done.dataset.atlasContactSaveBound !== "true") {
      done.dataset.atlasContactSaveBound = "true";
      done.addEventListener(
        "click",
        () => {
          window.setTimeout(() => {
            const saveVendor = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
              (button) => normalized(button.textContent) === "save vendor",
            );
            saveVendor?.click();
          }, 0);
        },
        { capture: true },
      );
    }
  }

  const nameInput = Array.from(article.querySelectorAll<HTMLInputElement>("input")).find((node) => {
    const label = labelText(node);
    return label === "contact name" || label === "full name";
  });
  if (nameInput && nameInput.dataset.atlasContactNameBound !== "true") {
    nameInput.dataset.atlasContactNameBound = "true";
    nameInput.addEventListener("input", () => {
      const nextName = String(nameInput.value || "").trim();
      const avatar = article.querySelector<HTMLElement>(".atlas-vendor-contact-modal-avatar");
      const title = article.querySelector<HTMLElement>(".atlas-vendor-contact-modal-title");
      if (avatar) avatar.textContent = nextName.slice(0, 1).toUpperCase() || "C";
      if (title) title.textContent = nextName ? "Edit Contact" : "New Contact";
    });
  }
}

function ensureBackdrop(openArticle: HTMLElement | null) {
  let backdrop = document.querySelector<HTMLElement>("[data-atlas-vendor-contact-backdrop]");

  if (!openArticle) {
    backdrop?.remove();
    document.body.classList.remove("atlas-vendor-contact-modal-open");
    return;
  }

  document.body.classList.add("atlas-vendor-contact-modal-open");
  if (backdrop) return;

  backdrop = document.createElement("div");
  backdrop.dataset.atlasVendorContactBackdrop = "true";
  backdrop.className = "atlas-vendor-contact-modal-backdrop";
  backdrop.addEventListener("click", () => saveContact(openArticle));
  document.body.appendChild(backdrop);
}

function polish() {
  const section = findContactSection();
  if (!section) {
    ensureBackdrop(null);
    return;
  }

  section.classList.add("atlas-vendor-contacts-maintainx");

  for (const button of Array.from(section.querySelectorAll<HTMLButtonElement>("button"))) {
    const label = normalized(button.textContent).replace(/^\+\s*/, "");
    if (label === "add department" || label === "add contact") {
      button.textContent = "+ Add Contact";
      button.classList.add("atlas-vendor-add-contact");
      button.setAttribute("aria-label", "Add contact to this vendor");
    }
  }

  for (const node of Array.from(section.querySelectorAll<HTMLElement>("div, strong"))) {
    if (normalized(node.textContent) === "departments contacts") node.textContent = "Contacts";
  }

  for (const node of Array.from(section.querySelectorAll<HTMLElement>("div"))) {
    if (normalized(node.textContent).startsWith("no departments or contacts saved")) {
      node.textContent = "No contacts saved yet. Use Add Contact to add the people you work with at this vendor.";
    }
  }

  let openArticle: HTMLElement | null = null;

  for (const article of Array.from(section.querySelectorAll<HTMLElement>("article"))) {
    article.classList.add("atlas-vendor-contact-card");
    const editing = Array.from(article.querySelectorAll<HTMLButtonElement>("button")).some((button) => {
      const label = normalized(button.textContent);
      return label === "done" || label === "save contact";
    });

    article.classList.toggle("atlas-vendor-contact-modal-card", editing);
    if (editing) {
      openArticle = article;
      ensureModalChrome(article);
    } else {
      article.querySelector(":scope > .atlas-vendor-contact-modal-chrome")?.remove();
    }
  }

  ensureBackdrop(openArticle);
}

export default function AtlasVendorContactsMaintainXPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        polish();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"],
    });

    document.addEventListener("click", schedule, true);
    window.addEventListener("popstate", schedule);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      ensureBackdrop(null);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-add-contact { white-space: nowrap !important; }

      .atlas-vendor-contact-modal-backdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99980 !important;
        background: rgba(8, 28, 51, 0.46) !important;
        backdrop-filter: blur(2px) !important;
      }

      body.atlas-vendor-contact-modal-open { overflow: hidden !important; }

      .atlas-vendor-contact-modal-card {
        position: fixed !important;
        z-index: 99990 !important;
        top: 50% !important;
        left: 50% !important;
        width: min(680px, calc(100vw - 48px)) !important;
        max-height: min(760px, calc(100dvh - 48px)) !important;
        transform: translate(-50%, -50%) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 0 24px 22px !important;
        border: 0 !important;
        border-radius: 16px !important;
        background: #ffffff !important;
        box-shadow: 0 24px 80px rgba(8, 28, 51, 0.3) !important;
        opacity: 1 !important;
      }

      .atlas-vendor-contact-modal-card > .atlas-vendor-contact-native-header { display: none !important; }
      .atlas-vendor-contact-modal-chrome { margin: 0 -24px 18px !important; }

      .atlas-vendor-contact-modal-titlebar {
        min-height: 58px !important;
        padding: 0 18px !important;
        border-bottom: 1px solid #dde5ec !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 4 !important;
        background: #ffffff !important;
      }

      .atlas-vendor-contact-modal-title { color: #0b1e33 !important; font-size: 18px !important; font-weight: 850 !important; }

      .atlas-vendor-contact-modal-close {
        width: 34px !important;
        height: 34px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 9px !important;
        background: transparent !important;
        color: #526779 !important;
        font-size: 26px !important;
        line-height: 1 !important;
        cursor: pointer !important;
      }

      .atlas-vendor-contact-modal-close:hover { background: #f1f5f9 !important; }

      .atlas-vendor-contact-modal-profile {
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
        padding: 20px 24px 5px !important;
      }

      .atlas-vendor-contact-modal-avatar {
        width: 68px !important;
        height: 68px !important;
        flex: 0 0 68px !important;
        border-radius: 999px !important;
        display: grid !important;
        place-items: center !important;
        background: #e7f1f7 !important;
        color: #0b2c43 !important;
        font-size: 30px !important;
        font-weight: 850 !important;
      }

      .atlas-vendor-contact-modal-kicker { color: #0b1e33 !important; font-size: 13px !important; font-weight: 850 !important; }
      .atlas-vendor-contact-modal-subtitle { margin-top: 3px !important; color: #718096 !important; font-size: 12px !important; }
      .atlas-vendor-contact-modal-card label { min-width: 0 !important; }

      .atlas-vendor-contact-modal-card input,
      .atlas-vendor-contact-modal-card select,
      .atlas-vendor-contact-modal-card textarea {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        border-color: #d5e0e8 !important;
        border-radius: 9px !important;
        background: #ffffff !important;
      }

      .atlas-vendor-contact-modal-card textarea { min-height: 84px !important; }
      .atlas-vendor-contact-modal-card .atlas-vendor-contact-save { background: #0b2c43 !important; border-color: #0b2c43 !important; color: #ffffff !important; }

      @media (max-width: 760px) {
        .atlas-vendor-contact-modal-card {
          top: 8px !important;
          left: 8px !important;
          right: 8px !important;
          bottom: 82px !important;
          width: auto !important;
          max-height: none !important;
          transform: none !important;
          padding: 0 14px 18px !important;
          border-radius: 14px !important;
        }
        .atlas-vendor-contact-modal-chrome { margin: 0 -14px 16px !important; }
        .atlas-vendor-contact-modal-profile { padding: 16px 16px 4px !important; }
        .atlas-vendor-contact-modal-avatar { width: 58px !important; height: 58px !important; flex-basis: 58px !important; font-size: 26px !important; }
      }
    `}</style>
  );
}
