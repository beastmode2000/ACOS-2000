"use client";

import { useEffect } from "react";

const UPCOMING_MODE = "__nick_upcoming__";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function visible(element: HTMLElement | null) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function applyDefaultUpcoming() {
  const switchers = Array.from(
    document.querySelectorAll<HTMLElement>(".atlas-secondary-work-switcher"),
  ).filter(visible);

  for (const switcher of switchers) {
    const section = switcher.closest("section") as HTMLElement | null;
    if (!section) continue;

    const heading = Array.from(section.querySelectorAll<HTMLElement>("h1,h2,h3,strong")).find(
      (node) => normalized(node.textContent) === "addison" || normalized(node.textContent) === "nick upcoming",
    );
    if (!heading) continue;

    const select = switcher.querySelector<HTMLSelectElement>(
      'select[aria-label="Choose employee work list"]',
    );
    const upcomingButton = Array.from(
      switcher.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => normalized(button.textContent) === "nick upcoming");

    if (!select || !upcomingButton) continue;

    let placeholder = select.querySelector<HTMLOptionElement>(
      'option[data-atlas-upcoming-placeholder="true"]',
    );
    if (!placeholder) {
      placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose employee";
      placeholder.disabled = true;
      placeholder.dataset.atlasUpcomingPlaceholder = "true";
      select.prepend(placeholder);
    }

    if (switcher.dataset.atlasDefaultUpcomingApplied !== "true") {
      switcher.dataset.atlasDefaultUpcomingApplied = "true";
      upcomingButton.click();
    }

    if (upcomingButton.dataset.active === "true") {
      if (select.value !== "") select.value = "";
      placeholder.selected = true;
    } else if (select.value === "") {
      placeholder.selected = true;
    }

    switcher.dataset.atlasDashboardSecondaryMode =
      upcomingButton.dataset.active === "true" ? UPCOMING_MODE : select.value;
  }
}

export default function AtlasDashboardDefaultUpcoming() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyDefaultUpcoming();
      });
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"],
    });

    document.addEventListener("change", schedule, true);
    document.addEventListener("click", schedule, true);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", schedule, true);
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
