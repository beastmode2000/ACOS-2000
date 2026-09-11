"use client";

import { useEffect } from "react";

const STORAGE_KEY = "atlas-work-category-settings-v1";
const CANONICAL_IT = "💻 IT";

function plainCategory(value: unknown) {
  return String(value || "")
    .replace(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u, "")
    .trim()
    .toLowerCase();
}

function normalizeStoredCategories() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const current = Array.isArray(parsed) ? parsed.map(String) : [];
    const next: string[] = [];
    let hasIT = false;

    for (const category of current) {
      if (plainCategory(category) === "it") {
        if (!hasIT) {
          next.push(CANONICAL_IT);
          hasIT = true;
        }
        continue;
      }
      if (!next.includes(category)) next.push(category);
    }

    if (!hasIT) next.push(CANONICAL_IT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Category preferences are optional UI state.
  }
}

function normalizeCategorySelects() {
  for (const select of Array.from(document.querySelectorAll<HTMLSelectElement>("select"))) {
    const options = Array.from(select.options);
    const optionLabels = options.map((option) => plainCategory(option.textContent));
    const looksLikeWorkCategory =
      optionLabels.includes("maintenance") &&
      optionLabels.includes("cleaning") &&
      optionLabels.includes("inspection");

    if (!looksLikeWorkCategory) continue;

    const itOptions = options.filter(
      (option) =>
        plainCategory(option.textContent) === "it" ||
        plainCategory(option.value) === "it",
    );

    let keeper = itOptions[0] || null;
    if (!keeper) {
      keeper = document.createElement("option");
      keeper.value = CANONICAL_IT;
      keeper.textContent = "IT";
      select.appendChild(keeper);
    } else {
      keeper.value = CANONICAL_IT;
      keeper.textContent = "IT";
    }

    for (const duplicate of itOptions.slice(1)) {
      duplicate.remove();
    }
  }
}

export default function AtlasWorkCategoryCanonicalizer() {
  useEffect(() => {
    normalizeStoredCategories();

    let frame = 0;
    const apply = () => {
      frame = 0;
      normalizeCategorySelects();
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
