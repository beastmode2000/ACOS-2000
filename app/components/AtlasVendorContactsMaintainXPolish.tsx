"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function vendorsMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("main h1")).find(
    (node) => normalized(node.textContent) === "vendors",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function textButton(root: ParentNode, labels: string[]) {
  const targets = new Set(labels.map(normalized));
  return Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    targets.has(normalized(button.textContent)),
  );
}

function contactSection(root: HTMLElement) {
  const existing = root.querySelector<HTMLElement>("section.atlas-vendor-contacts-maintainx");
  if (existing) return existing;

  const addButton = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const value = normalized(button.textContent).replace(/^\+\s*/, "");
    return value === "add department" || value === "add contact";
  });
  const byButton = addButton?.closest<HTMLElement>("section") || null;
  if (byButton) return byButton;

  const marker = Array.from(root.querySelectorAll<HTMLElement>("div, strong, h2, h3, h4")).find((node) => {
    const value = normalized(node.textContent);
    return value === "departments contacts" || value === "contacts";
  });
  const byMarker = marker?.closest<HTMLElement>("section") || null;
  if (!byMarker) return null;

  const text = normalized(byMarker.textContent);
  return text.includes("active") || text.includes("add contact") || text.includes("add department")
    ? byMarker
    : null;
}

function fieldLabelText(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
  const label = input.closest("label");
  if (!label) return "";
  const span = label.querySelector<HTMLElement>("span");
  return normalized(span?.textContent || label.textContent);
}

function contactNameInput(article: HTMLElement) {
  return Array.from(article.querySelectorAll<HTMLInputElement>("input")).find((input) => {
    const label = fieldLabelText(input);
    return label === "contact name" || label === "full name";
  });
}

function contactDisplayName(article: HTMLElement) {
  const candidates = Array.from(article.querySelectorAll<HTMLElement>("div, span, strong"))
    .map((node) => String(node.textContent || "").trim())
    .filter(Boolean)
    .filter((value) => !["Primary", "Inactive", "Edit", "Office", "Service", "Technician", "Billing", "Sales", "Installation", "Manager", "Owner", "Emergency", "Other"].includes(value));

  const withRoleSeparator = candidates.find((value) => value.includes(" · "));
  if (withRoleSeparator) return withRoleSeparator.split(" · ")[0].trim();
  return candidates.find((value) => value.length <= 80) || "Contact";
}

function ensureCompactAvatar(article: HTMLElement) {
  if (article.classList.contains("atlas-vendor-contact-modal-card")) return;

  const header = article.firstElementChild;
  if (!(header instanceof HTMLElement)) return;

  let avatar = header.querySelector<HTMLElement>(":scope > .atlas-vendor-contact-card-avatar");
  if (!avatar) {
    avatar = document.createElement("span");
    avatar.className = "atlas-vendor-contact-card-avatar";
    avatar.setAttribute("aria-hidden", "true");
    header.insertBefore(avatar, header.firstChild);
  }

  const name = contactDisplayName(article);
  avatar.textContent = name.slice(0, 1).toUpperCase() || "C";
  header.classList.add("atlas-vendor-contact-card-header");
}

function renameFieldLabels(article: HTMLElement) {
  const names: Record<string, string> = {
    department: "Contact Type",
    "contact name": "Full Name",
    "role title": "Role",
  };

  for (const label of Array.from(article.querySelectorAll<HTMLElement>("label"))) {
    const span = label.querySelector<HTMLElement>(":scope > span");
    if (!span) continue;
    const replacement = names[normalized(span.textContent)];
    if (replacement) span.textContent = replacement;
  }
}

function ensureModalChrome(article: HTMLElement) {
  renameFieldLabels(article);

  const compactAvatar = article.querySelector<HTMLElement>(".atlas-vendor-contact-card-avatar");
  compactAvatar?.remove();

  const nameInput = contactNameInput(article);
  const name = String(nameInput?.value || "").trim();
  const initial = name.slice(0, 1).toUpperCase() || "C";

  let chrome = article.querySelector<HTMLElement>(":scope > .atlas-vendor-contact-modal-chrome");
  if (!chrome) {
    chrome = document.createElement("div");
    chrome.className = "atlas-vendor-contact-modal-chrome";
    chrome.innerHTML = `
      <div class="atlas-vendor-contact-modal-titlebar">
        <strong class="atlas-vendor-contact-modal-title"></strong>
        <button type="button" class="atlas-vendor-contact-modal-close" aria-label="Close contact editor">×</button>
      </div>
      <div class="atlas-vendor-contact-modal-profile">
        <div class="atlas-vendor-contact-modal-avatar" aria-hidden="true"></div>
        <div>
          <div class="atlas-vendor-contact-modal-kicker">Contact Info</div>
          <div class="atlas-vendor-contact-modal-subtitle">Person at this vendor</div>
        </div>
      </div>
    `;
    article.insertBefore(chrome, article.firstChild);

    chrome
      .querySelector<HTMLButtonElement>(".atlas-vendor-contact-modal-close")
      ?.addEventListener("click", () => {
        textButton(article, ["Done", "Save Contact"])?.click();
      });
  }

  const title = chrome.querySelector<HTMLElement>(".atlas-vendor-contact-modal-title");
  const avatar = chrome.querySelector<HTMLElement>(".atlas-vendor-contact-modal-avatar");
  if (title) title.textContent = name ? "Edit Contact" : "New Contact";
  if (avatar) avatar.textContent = initial;

  const nativeHeader = Array.from(article.children).find(
    (child) => child instanceof HTMLElement && !child.classList.contains("atlas-vendor-contact-modal-chrome"),
  );
  if (nativeHeader instanceof HTMLElement) {
    nativeHeader.classList.add("atlas-vendor-contact-native-header");
  }

  const done = textButton(article, ["Done", "Save Contact"]);
  if (done) {
    done.textContent = "Save Contact";
    done.classList.add("atlas-vendor-contact-save");
  }

  textButton(article, ["Archive", "Restore"])?.classList.add(
    "atlas-vendor-contact-secondary-action",
  );
  textButton(article, ["Delete"])?.classList.add(
    "atlas-vendor-contact-delete-action",
  );

  if (nameInput && nameInput.dataset.atlasVendorContactInitialBound !== "true") {
    nameInput.dataset.atlasVendorContactInitialBound = "true";
    nameInput.addEventListener("input", () => {
      const nextName = String(nameInput.value || "").trim();
      const nextAvatar = article.querySelector<HTMLElement>(".atlas-vendor-contact-modal-avatar");
      const nextTitle = article.querySelector<HTMLElement>(".atlas-vendor-contact-modal-title");
      if (nextAvatar) nextAvatar.textContent = nextName.slice(0, 1).toUpperCase() || "C";
      if (nextTitle) nextTitle.textContent = nextName ? "Edit Contact" : "New Contact";
    });
  }
}

function ensureBackdrop(open: boolean) {
  let backdrop = document.querySelector<HTMLElement>("[data-atlas-vendor-contact-backdrop]");

  if (!open) {
    backdrop?.remove();
    document.body.classList.remove("atlas-vendor-contact-modal-open");
    return;
  }

  document.body.classList.add("atlas-vendor-contact-modal-open");

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.dataset.atlasVendorContactBackdrop = "true";
    backdrop.className = "atlas-vendor-contact-modal-backdrop";
    backdrop.addEventListener("click", () => {
      const root = vendorsMain();
      if (!root) return;
      const modal = root.querySelector<HTMLElement>(".atlas-vendor-contact-modal-card");
      textButton(modal || root, ["Save Contact", "Done"])?.click();
    });
    document.body.appendChild(backdrop);
  }
}

function polishVendorContacts() {
  const root = vendorsMain();
  if (!root) {
    ensureBackdrop(false);
    return;
  }

  const section = contactSection(root);
  if (!section) {
    ensureBackdrop(false);
    return;
  }

  section.classList.add("atlas-vendor-contacts-maintainx");

  for (const marker of Array.from(section.querySelectorAll<HTMLElement>("div, strong"))) {
    if (normalized(marker.textContent) === "departments contacts") {
      marker.textContent = "Contacts";
    }
  }

  for (const button of Array.from(section.querySelectorAll<HTMLButtonElement>("button"))) {
    const label = normalized(button.textContent).replace(/^\+\s*/, "");
    if (label === "add department" || label === "add contact") {
      button.textContent = "+ Add Contact";
      button.classList.add("atlas-vendor-add-contact");
    }
  }

  for (const note of Array.from(section.querySelectorAll<HTMLElement>("div"))) {
    if (normalized(note.textContent).startsWith("no departments or contacts saved")) {
      note.textContent = "No contacts saved. Add the people you actually work with at this vendor.";
    }
  }

  let openModal: HTMLElement | null = null;

  for (const article of Array.from(section.querySelectorAll<HTMLElement>("article"))) {
    article.classList.add("atlas-vendor-contact-card");

    const editing = Array.from(article.querySelectorAll<HTMLButtonElement>("button")).some((button) => {
      const label = normalized(button.textContent);
      return label === "done" || label === "save contact";
    });

    article.classList.toggle("atlas-vendor-contact-modal-card", editing);

    if (editing) {
      openModal = article;
      ensureModalChrome(article);
    } else {
      article.querySelector(":scope > .atlas-vendor-contact-modal-chrome")?.remove();
      ensureCompactAvatar(article);
    }
  }

  ensureBackdrop(Boolean(openModal));
}

export default function AtlasVendorContactsMaintainXPolish() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        polishVendorContacts();
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
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      ensureBackdrop(false);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-vendor-contacts-maintainx {
        position: relative !important;
      }

      .atlas-vendor-add-contact {
        white-space: nowrap !important;
      }

      .atlas-vendor-contact-card {
        transition:
          border-color 120ms ease,
          box-shadow 120ms ease !important;
      }

      .atlas-vendor-contact-card:not(.atlas-vendor-contact-modal-card) {
        border-radius: 14px !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .atlas-vendor-contact-card:not(.atlas-vendor-contact-modal-card):hover {
        border-color: #b9c9d8 !important;
        box-shadow: 0 4px 16px rgba(8, 28, 51, 0.06) !important;
      }

      .atlas-vendor-contact-card-header {
        display: grid !important;
        grid-template-columns: 46px minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 10px !important;
      }

      .atlas-vendor-contact-card-avatar {
        width: 46px !important;
        height: 46px !important;
        border-radius: 999px !important;
        display: grid !important;
        place-items: center !important;
        background: #e7f1f7 !important;
        color: #0b2c43 !important;
        font-size: 18px !important;
        font-weight: 850 !important;
      }

      .atlas-vendor-contact-modal-backdrop {
        position: fixed !important;
        inset: 0 !important;
        z-index: 99980 !important;
        background: rgba(7, 23, 39, 0.48) !important;
        backdrop-filter: blur(1.5px) !important;
      }

      body.atlas-vendor-contact-modal-open {
        overflow: hidden !important;
      }

      .atlas-vendor-contact-modal-card {
        position: fixed !important;
        z-index: 99990 !important;
        top: 50% !important;
        left: 50% !important;
        width: min(720px, calc(100vw - 48px)) !important;
        max-height: min(760px, calc(100dvh - 48px)) !important;
        transform: translate(-50%, -50%) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 0 24px 22px !important;
        border: 0 !important;
        border-radius: 16px !important;
        background: #ffffff !important;
        box-shadow: 0 24px 80px rgba(8, 28, 51, 0.28) !important;
        opacity: 1 !important;
      }

      .atlas-vendor-contact-modal-card > .atlas-vendor-contact-native-header {
        display: none !important;
      }

      .atlas-vendor-contact-modal-chrome {
        margin: 0 -24px 18px !important;
      }

      .atlas-vendor-contact-modal-titlebar {
        min-height: 58px !important;
        padding: 0 18px !important;
        border-bottom: 1px solid #dce4ec !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 3 !important;
        background: #ffffff !important;
      }

      .atlas-vendor-contact-modal-title {
        color: #0b1e33 !important;
        font-size: 17px !important;
        font-weight: 850 !important;
      }

      .atlas-vendor-contact-modal-close {
        width: 34px !important;
        height: 34px !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 9px !important;
        background: transparent !important;
        color: #536779 !important;
        font-size: 26px !important;
        line-height: 1 !important;
        cursor: pointer !important;
      }

      .atlas-vendor-contact-modal-close:hover {
        background: #f1f5f9 !important;
      }

      .atlas-vendor-contact-modal-profile {
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
        padding: 20px 24px 4px !important;
      }

      .atlas-vendor-contact-modal-avatar {
        width: 70px !important;
        height: 70px !important;
        flex: 0 0 70px !important;
        border-radius: 999px !important;
        display: grid !important;
        place-items: center !important;
        background: #e7f1f7 !important;
        color: #0b2c43 !important;
        font-size: 31px !important;
        font-weight: 800 !important;
      }

      .atlas-vendor-contact-modal-kicker {
        color: #0b1e33 !important;
        font-size: 13px !important;
        font-weight: 850 !important;
      }

      .atlas-vendor-contact-modal-subtitle {
        margin-top: 3px !important;
        color: #718096 !important;
        font-size: 12px !important;
      }

      .atlas-vendor-contact-modal-card label {
        min-width: 0 !important;
      }

      .atlas-vendor-contact-modal-card input,
      .atlas-vendor-contact-modal-card select,
      .atlas-vendor-contact-modal-card textarea {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        border-color: #d6e0e8 !important;
        border-radius: 9px !important;
        background: #ffffff !important;
      }

      .atlas-vendor-contact-modal-card textarea {
        min-height: 86px !important;
        resize: vertical !important;
      }

      .atlas-vendor-contact-modal-card .atlas-vendor-contact-save {
        background: #0b2c43 !important;
        border-color: #0b2c43 !important;
        color: #ffffff !important;
      }

      .atlas-vendor-contact-modal-card .atlas-vendor-contact-delete-action {
        margin-left: auto !important;
      }

      @media (max-width: 760px) {
        .atlas-vendor-contact-card-header {
          grid-template-columns: 42px minmax(0, 1fr) auto !important;
          gap: 8px !important;
        }

        .atlas-vendor-contact-card-avatar {
          width: 42px !important;
          height: 42px !important;
          font-size: 17px !important;
        }

        .atlas-vendor-contact-modal-card {
          top: 8px !important;
          left: 8px !important;
          right: 8px !important;
          bottom: 82px !important;
          width: auto !important;
          max-height: none !important;
          transform: none !important;
          border-radius: 14px !important;
          padding: 0 14px 18px !important;
        }

        .atlas-vendor-contact-modal-chrome {
          margin: 0 -14px 16px !important;
        }

        .atlas-vendor-contact-modal-profile {
          padding: 16px 16px 2px !important;
        }

        .atlas-vendor-contact-modal-avatar {
          width: 58px !important;
          height: 58px !important;
          flex-basis: 58px !important;
          font-size: 26px !important;
        }
      }
    `}</style>
  );
}
