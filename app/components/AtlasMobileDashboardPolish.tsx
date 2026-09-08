"use client";

import { useEffect } from "react";

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function markMobileDashboard() {
  if (window.innerWidth > 900) return;

  const command = document.querySelector<HTMLElement>(".atlas-command-dashboard");
  if (!command) return;

  command.classList.add("atlas-mobile-dashboard-command");

  const root = (command.closest("main") as HTMLElement | null) || command.parentElement;
  root?.classList.add("atlas-mobile-dashboard-polish-root");

  const weather = command.querySelector<HTMLElement>("#atlas-dashboard-weather");
  weather?.classList.add("atlas-mobile-dashboard-weather");

  for (const section of Array.from(command.querySelectorAll<HTMLElement>("section"))) {
    const text = normalized(section.textContent);
    if (text.startsWith("quick logvendor visit") || text.includes("quick logvendor visit")) {
      section.classList.add("atlas-mobile-dashboard-quick-log");
    }
  }

  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  for (const button of buttons) {
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

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      @media (max-width: 900px) {
        html,
        body,
        .atlas-mobile-dashboard-polish-root {
          overflow-x: clip !important;
          max-width: 100% !important;
        }

        .atlas-command-dashboard,
        .atlas-mobile-dashboard-command {
          position: relative !important;
          left: auto !important;
          right: auto !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          transform: none !important;
          box-sizing: border-box !important;
          gap: 10px !important;
          padding-bottom: 118px !important;
        }

        .atlas-command-dashboard .atlas-dashboard-layout-grid,
        .atlas-mobile-dashboard-command .atlas-dashboard-layout-grid {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          gap: 10px !important;
          grid-template-columns: minmax(0, 1fr) !important;
        }

        .atlas-command-dashboard .atlas-dashboard-layout-grid > *,
        .atlas-mobile-dashboard-command .atlas-dashboard-layout-grid > * {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          box-sizing: border-box !important;
        }

        .atlas-command-dashboard > section,
        .atlas-command-dashboard > details,
        .atlas-mobile-dashboard-command > section,
        .atlas-mobile-dashboard-command > details {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          border-radius: 16px !important;
          box-sizing: border-box !important;
        }

        .atlas-mobile-dashboard-quick-log {
          padding: 12px !important;
          margin-bottom: 0 !important;
          border-radius: 16px !important;
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

        #atlas-dashboard-weather.atlas-weather-experience,
        .atlas-mobile-dashboard-weather {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 14px 12px !important;
          border-radius: 16px !important;
          min-height: 0 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-main-row,
        #atlas-dashboard-weather .atlas-weather-main-row {
          gap: 10px !important;
          margin: 0 !important;
          min-width: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current,
        #atlas-dashboard-weather .atlas-weather-current {
          padding: 0 !important;
          min-height: 0 !important;
          min-width: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-kicker,
        #atlas-dashboard-weather .atlas-weather-kicker {
          font-size: 11px !important;
          letter-spacing: 0.15em !important;
          margin-bottom: 8px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-row,
        #atlas-dashboard-weather .atlas-weather-current-row {
          gap: 10px !important;
          align-items: center !important;
          min-width: 0 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-glyph,
        #atlas-dashboard-weather .atlas-weather-current-glyph {
          width: 58px !important;
          height: 58px !important;
          min-width: 58px !important;
          border-radius: 14px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-temp,
        #atlas-dashboard-weather .atlas-weather-current-temp {
          font-size: 48px !important;
          line-height: 0.95 !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-current-label,
        #atlas-dashboard-weather .atlas-weather-current-label {
          font-size: 16px !important;
          margin-top: 3px !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-days,
        #atlas-dashboard-weather .atlas-weather-days {
          gap: 8px !important;
          margin-top: 12px !important;
          padding: 0 !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overscroll-behavior-inline: contain !important;
        }

        .atlas-mobile-dashboard-weather .atlas-weather-day,
        #atlas-dashboard-weather .atlas-weather-day {
          min-height: 104px !important;
          padding: 8px !important;
          border-radius: 14px !important;
        }

        .atlas-mobile-dashboard-weather article,
        .atlas-mobile-dashboard-weather section,
        #atlas-dashboard-weather article,
        #atlas-dashboard-weather section {
          border-radius: 14px !important;
          max-width: 100% !important;
        }

        .atlas-mobile-dashboard-fab {
          right: 16px !important;
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
