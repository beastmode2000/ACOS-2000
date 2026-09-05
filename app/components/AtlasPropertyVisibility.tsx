"use client";

import { useEffect } from "react";

const HIDDEN_PROPERTY_IDS = new Set(["6855", "3661", "hangar"]);
const HIDDEN_PROPERTY_NAMES = new Set(["6855", "3661", "hangar"]);

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function hidePropertyOptions() {
  for (const select of Array.from(document.querySelectorAll<HTMLSelectElement>("select"))) {
    const options = Array.from(select.options);
    const looksLikePropertySelect = options.some((option) => normalize(option.value) === "2000") &&
      options.some((option) => HIDDEN_PROPERTY_IDS.has(normalize(option.value)));
    if (!looksLikePropertySelect) continue;

    for (const option of options) {
      if (!HIDDEN_PROPERTY_IDS.has(normalize(option.value))) continue;
      option.hidden = true;
      option.disabled = true;
      option.style.display = "none";
    }

    if (HIDDEN_PROPERTY_IDS.has(normalize(select.value))) {
      const fallback = options.find((option) => normalize(option.value) === "2000" && !option.disabled);
      if (fallback) {
        select.value = fallback.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }
}

function hidePortfolioCards() {
  for (const article of Array.from(document.querySelectorAll<HTMLElement>("article"))) {
    const heading = article.querySelector<HTMLElement>("h3")?.textContent;
    if (!heading || !HIDDEN_PROPERTY_NAMES.has(normalize(heading))) continue;
    article.style.display = "none";
    article.setAttribute("aria-hidden", "true");
  }
}

function hidePropertyButtons() {
  const scopes = Array.from(document.querySelectorAll<HTMLElement>("nav, aside, header"));
  for (const scope of scopes) {
    for (const button of Array.from(scope.querySelectorAll<HTMLButtonElement>("button"))) {
      const text = normalize(button.textContent);
      if (!HIDDEN_PROPERTY_NAMES.has(text)) continue;
      button.style.display = "none";
      button.setAttribute("aria-hidden", "true");
    }
  }
}

export default function AtlasPropertyVisibility() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      hidePropertyOptions();
      hidePortfolioCards();
      hidePropertyButtons();
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
