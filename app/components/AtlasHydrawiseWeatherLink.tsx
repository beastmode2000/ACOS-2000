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

export default function AtlasHydrawiseWeatherLink() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const dashboard = Array.from(document.querySelectorAll<HTMLElement>("main h1")).some(
        (node) => normalized(node.textContent) === "dashboard",
      );

      document.querySelectorAll<HTMLElement>("[data-atlas-hydrawise-link]").forEach((node) => {
        if (!dashboard || !document.body.contains(node)) node.remove();
      });
      if (!dashboard) return;

      const weatherHeading = Array.from(document.querySelectorAll<HTMLElement>("main h2, main h3, main strong")).find(
        (node) => normalized(node.textContent) === "weather",
      );
      if (!weatherHeading) return;

      const parent = weatherHeading.parentElement;
      if (!parent || parent.querySelector("[data-atlas-hydrawise-link]")) return;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.atlasHydrawiseLink = "true";
      button.className = "atlas-hydrawise-weather-link";
      button.textContent = "Hydrawise ↗";
      button.setAttribute("aria-label", "Open Hydrawise irrigation dashboard");
      button.addEventListener("click", () => window.open(HYDRAWISE_URL, "_blank", "noopener,noreferrer"));
      parent.appendChild(button);
      parent.classList.add("atlas-weather-heading-with-hydrawise");
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
      document.querySelectorAll<HTMLElement>("[data-atlas-hydrawise-link]").forEach((node) => node.remove());
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-weather-heading-with-hydrawise {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
      }

      .atlas-hydrawise-weather-link {
        min-height: 31px !important;
        padding: 5px 9px !important;
        border: 1px solid #d4dee7 !important;
        border-radius: 8px !important;
        background: #fff !important;
        color: #0b2c43 !important;
        font: inherit !important;
        font-size: 10.5px !important;
        font-weight: 850 !important;
        cursor: pointer !important;
        box-shadow: none !important;
      }

      .atlas-hydrawise-weather-link:hover {
        background: #eef6ff !important;
        border-color: #b9d2eb !important;
      }

      @media (max-width: 900px) {
        .atlas-hydrawise-weather-link {
          min-height: 29px !important;
          padding: 4px 8px !important;
          font-size: 10px !important;
        }
      }
    `}</style>
  );
}
