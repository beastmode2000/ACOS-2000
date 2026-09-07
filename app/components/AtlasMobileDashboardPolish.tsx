"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function dashboardMain() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1")).find(
    (node) => normalized(node.textContent) === "dashboard",
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function markMobileDashboard() {
  if (window.innerWidth > 900) return;
  const root = dashboardMain();
  if (!root) return;

  root.classList.add("atlas-mobile-dashboard-polish-root");

  const command = root.querySelector<HTMLElement>(".atlas-command-dashboard");
  command?.classList.add("atlas-mobile-dashboard-command");

  const weather = root.querySelector<HTMLElement>("#atlas-dashboard-weather");
  weather?.classList.add("atlas-mobile-dashboard-weather");

  for (const section of Array.from(root.querySelectorAll<HTMLElement>("section"))) {
    const text = normalized(section.textContent);
    if (text.startsWith("quick logvendor visit") || text.includes("quick logvendor visit")) {
      section.classList.add("atlas-mobile-dashboard-quick-log");
    }
  }

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    if (normalized(button.textContent) !== "+") continue;
    const style = window.getComputedStyle(button);
    if (style.position === "fixed" || style.position === "absolute") {
      button.classList.add("atlas-mobile-dashboard-fab");
    }
  }
}

export default function AtlasMobileDashboardPolish() {
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      markMobileDashboard();
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (max-width: 900px) {
        .atlas-mobile-dashboard-polish-root {
          overflow-x: hidden !important;
        }

        .atlas-mobile-dashboard-command {
          width: calc(100% + 28px) !important;
          max-width: none !important;
          margin-left: -14px !important;
          margin-right: -14px !important;
          gap: 10px !important;
          padding-bottom: 118px !important;
        }

        .atlas-mobile-dashboard-command > section,
        .atlas-mobile-dashboard-command > details {
          width: 100% !important;
          max-width: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          border-radius: 16px !important;
        }

        .atlas-mobile-dashboard-quick-log {
          padding: 12px 12px 13px !important;
          margin-bottom: 0 !important;
          border-radius: 16px !important;
        }

        .atlas-mobile-dashboard-quick-log h2,
        .atlas-mobile-dashboard-quick-log h3,
        .atlas-mobile-dashboard-quick-log strong {
          margin-top: 0 !important;
        }

        .atlas-mobile-dashboard-quick-log input,
        .atlas-mobile-dashboard-quick-log select,
        .atlas-mobile-dashboard-quick-log button {
          min-height: 40px !important;
          height: 40px !important;
          border-radius: 11px !important;
          font-size: 14px !important;
        }

        .atlas-mobile-dashboard-quick-log input,
        .atlas-mobile-dashboard-quick-log select {
          padding-top: 7px !important;
          padding-bottom: 7px !important;
        }

        .atlas-mobile-dashboard-weather,
        #atlas-dashboard-weather.atlas-weather-experience {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding: 14px 12px 14px !important;
          border-radius: 16px !important;
          min-height: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-main-row {
          gap: 10px !important;
          margin: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current {
          padding: 0 !important;
          min-height: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-kicker {
          font-size: 11px !important;
          letter-spacing: 0.15em !important;
          margin-bottom: 8px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-row {
          gap: 10px !important;
          align-items: center !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-glyph {
          width: 58px !important;
          height: 58px !important;
          min-width: 58px !important;
          border-radius: 14px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-temp {
          font-size: 48px !important;
          line-height: 0.95 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-label {
          font-size: 16px !important;
          margin-top: 3px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-days {
          gap: 8px !important;
          margin-top: 12px !important;
          padding: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-day {
          min-height: 108px !important;
          padding: 9px 8px !important;
          border-radius: 14px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-day strong {
          font-size: 13px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-day span,
        .atlas-mobile-dashboard-weather .atlas-weather-day small {
          line-height: 1.2 !important;
        }

        .atlas-mobile-dashboard-weather > div:not(.atlas-weather-ambient):not(.atlas-weather-main-row),
        .atlas-mobile-dashboard-weather .atlas-weather-main-row ~ div {
          margin-top: 10px !important;
        }

        .atlas-mobile-dashboard-weather article,
        .atlas-mobile-dashboard-weather section,
        .atlas-mobile-dashboard-weather .atlas-weather-main-row ~ div > div {
          border-radius: 14px !important;
        }

        .atlas-mobile-dashboard-fab {
          right: 18px !important;
          bottom: 102px !important;
          width: 58px !important;
          height: 58px !important;
          min-width: 58px !important;
          min-height: 58px !important;
        }
      }
    `}</style>
  );
}
