"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function workRoot() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "work",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function dashboardWorkRoot() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h2,h3,strong")).find(
    (node) => normalized(node.textContent) === "work lists",
  );
  return (heading?.closest("section") as HTMLElement | null) || null;
}

function isTextEntry(element: HTMLInputElement | HTMLTextAreaElement) {
  if (element instanceof HTMLTextAreaElement) return true;
  const type = normalized(element.type || "text");
  return ["text", "search", "email", "url", "tel"].includes(type);
}

function applySpellAssist(root: HTMLElement | null) {
  if (!root) return;

  for (const field of Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"),
  )) {
    if (!isTextEntry(field)) continue;
    if (normalized(field.type) === "search") continue;

    field.spellcheck = true;
    field.setAttribute("spellcheck", "true");
    field.setAttribute("autocorrect", "on");
    field.setAttribute("autocapitalize", "sentences");
    field.setAttribute("lang", "en-US");
  }
}

export default function AtlasWorkSpellAssist() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      applySpellAssist(workRoot());
      applySpellAssist(dashboardWorkRoot());
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
