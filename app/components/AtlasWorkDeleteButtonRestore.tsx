"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dispatchDelete(actions: HTMLSelectElement) {
  actions.value = "delete";
  actions.dispatchEvent(new Event("change", { bubbles: true }));
  actions.value = "";
}

function styleDeleteButton(button: HTMLButtonElement) {
  Object.assign(button.style, {
    minHeight: "36px",
    padding: "8px 12px",
    borderRadius: "9px",
    border: "1px solid #D92D20",
    background: "#FFFFFF",
    color: "#B42318",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
  });
}

function makeDeleteButton(actions: HTMLSelectElement, marker: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Delete";
  button.setAttribute(marker, "true");
  button.setAttribute("aria-label", "Delete work order");
  styleDeleteButton(button);
  button.addEventListener("click", () => dispatchDelete(actions));
  return button;
}

function restoreDeleteButton() {
  const panel = document.querySelector<HTMLElement>("[data-atlas-work-detail-panel]");
  if (!panel) return;

  const actions = panel.querySelector<HTMLSelectElement>('select[aria-label="Work order actions"]');
  if (!actions || !actions.querySelector('option[value="delete"]')) return;

  const actionRow = actions.parentElement;
  if (actionRow && !actionRow.querySelector('[data-atlas-work-delete-button="true"]')) {
    const button = makeDeleteButton(actions, "data-atlas-work-delete-button");
    const editButton = Array.from(actionRow.querySelectorAll<HTMLButtonElement>("button")).find(
      (candidate) => normalized(candidate.textContent) === "edit",
    );
    if (editButton) editButton.insertAdjacentElement("afterend", button);
    else actionRow.appendChild(button);
  }

  const saveButton = Array.from(panel.querySelectorAll<HTMLButtonElement>("button")).find((candidate) => {
    const value = normalized(candidate.textContent);
    return value === "save changes" || value === "saving…" || value === "saving...";
  });
  if (!saveButton) return;

  const editHeader = saveButton.parentElement;
  if (!editHeader || editHeader.querySelector('[data-atlas-work-edit-delete-button="true"]')) return;

  const editDelete = makeDeleteButton(actions, "data-atlas-work-edit-delete-button");
  editDelete.style.minHeight = "42px";
  editDelete.style.padding = "9px 14px";
  editHeader.insertBefore(editDelete, saveButton);
}

export default function AtlasWorkDeleteButtonRestore() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(restoreDeleteButton);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
    };
  }, []);

  return null;
}
