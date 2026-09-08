"use client";

import { useEffect } from "react";

const HYDRAWISE_URL = "https://app.hydrawise.com/config/dashboard";

function normalized(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function irrigationCard() {
  const weather = document.querySelector<HTMLElement>("#atlas-dashboard-weather");
  if (!weather) return null;

  return (
    Array.from(
      weather.querySelectorAll<HTMLElement>(".atlas-weather-operation-card"),
    ).find((card) =>
      Array.from(card.querySelectorAll<HTMLElement>("strong, b")).some(
        (label) => normalized(label.textContent) === "irrigation",
      ),
    ) || null
  );
}

function openHydrawise(event?: Event) {
  event?.preventDefault();
  event?.stopPropagation();
  window.open(HYDRAWISE_URL, "_blank", "noopener,noreferrer");
}

function handleHydrawiseKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === " ") {
    openHydrawise(event);
  }
}

function clearHydrawiseCard(card: HTMLElement) {
  card.removeEventListener("click", openHydrawise);
  card.removeEventListener("keydown", handleHydrawiseKeydown);
  delete card.dataset.atlasHydrawiseBound;
  card.classList.remove("atlas-hydrawise-irrigation-card");
  card.removeAttribute("role");
  card.removeAttribute("tabindex");
  card.removeAttribute("aria-label");
  card.querySelector<HTMLElement>("[data-atlas-hydrawise-link]")?.remove();
}

export default function AtlasHydrawiseWeatherLink() {
  useEffect(() => {
    let frame = 0;
    let activeCard: HTMLElement | null = null;

    const apply = () => {
      frame = 0;

      const card = irrigationCard();
      if (!card) {
        if (activeCard && document.body.contains(activeCard)) {
          clearHydrawiseCard(activeCard);
        }
        activeCard = null;
        return;
      }

      if (activeCard && activeCard !== card) {
        clearHydrawiseCard(activeCard);
      }
      activeCard = card;

      card.classList.add("atlas-hydrawise-irrigation-card");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Open Hydrawise irrigation dashboard");

      if (card.dataset.atlasHydrawiseBound !== "true") {
        card.dataset.atlasHydrawiseBound = "true";
        card.addEventListener("click", openHydrawise);
        card.addEventListener("keydown", handleHydrawiseKeydown);
      }

      let action = card.querySelector<HTMLElement>("[data-atlas-hydrawise-link]");
      if (!action) {
        action = document.createElement("span");
        action.dataset.atlasHydrawiseLink = "true";
        action.className = "atlas-hydrawise-irrigation-action";
        action.textContent = "Hydrawise ↗";
        action.setAttribute("aria-hidden", "true");
        card.appendChild(action);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      if (activeCard) clearHydrawiseCard(activeCard);
    };
  }, []);

  return (
    <style jsx global>{`
      #atlas-dashboard-weather .atlas-hydrawise-irrigation-card {
        position: relative !important;
        cursor: pointer !important;
        padding-right: 126px !important;
        transition:
          border-color 120ms ease,
          background 120ms ease,
          box-shadow 120ms ease !important;
      }

      #atlas-dashboard-weather .atlas-hydrawise-irrigation-card:hover {
        border-color: #9db9ce !important;
        background: #f8fbfd !important;
        box-shadow: 0 2px 10px rgba(11, 44, 67, 0.06) !important;
      }

      #atlas-dashboard-weather .atlas-hydrawise-irrigation-card:focus-visible {
        outline: 2px solid #c9972e !important;
        outline-offset: 2px !important;
      }

      #atlas-dashboard-weather .atlas-hydrawise-irrigation-action {
        position: absolute !important;
        right: 12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 30px !important;
        padding: 5px 9px !important;
        border: 1px solid #c9d7e3 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        color: #0b2c43 !important;
        font-size: 10.5px !important;
        font-weight: 850 !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        pointer-events: none !important;
      }

      @media (max-width: 760px) {
        #atlas-dashboard-weather .atlas-hydrawise-irrigation-card {
          padding-right: 102px !important;
        }

        #atlas-dashboard-weather .atlas-hydrawise-irrigation-action {
          right: 9px !important;
          min-height: 28px !important;
          padding: 4px 7px !important;
          font-size: 9.5px !important;
        }
      }
    `}</style>
  );
}
