"use client";

import React from "react";

type AtlasLocationsProps = {
  children: React.ReactNode;
  isMobile?: boolean;
};

/**
 * Locations UI 2.0 visual surface.
 *
 * Location data and workflows remain in page.tsx. This wrapper standardizes
 * spacing, typography, cards, controls, list rows, and mobile behavior without
 * changing the existing location logic.
 */
export default function AtlasLocations({
  children,
  isMobile = false,
}: AtlasLocationsProps) {
  return (
    <div
      className="atlas-locations-v2"
      data-mobile={isMobile ? "true" : "false"}
      style={{ minWidth: 0, width: "100%" }}
    >
      <style>{`
        .atlas-locations-v2 {
          --location-navy: #123b59;
          --location-navy-deep: #0b2c43;
          --location-gold: #c89b3c;
          --location-gold-soft: #fff8e8;
          --location-text: #17212b;
          --location-muted: #607080;
          --location-line: #dbe3ea;
          --location-panel: #ffffff;
          --location-soft: #f7f9fb;
          --location-radius: 14px;
          --location-shadow: 0 8px 24px rgba(15, 42, 62, 0.07);
          color: var(--location-text);
        }

        .atlas-locations-v2 h1,
        .atlas-locations-v2 h2,
        .atlas-locations-v2 h3,
        .atlas-locations-v2 strong {
          letter-spacing: -0.012em;
        }

        .atlas-locations-v2 button,
        .atlas-locations-v2 input,
        .atlas-locations-v2 select,
        .atlas-locations-v2 textarea {
          font-size: 14px;
          line-height: 1.42;
        }

        .atlas-locations-v2 input,
        .atlas-locations-v2 select,
        .atlas-locations-v2 textarea {
          min-height: 42px;
          border-color: var(--location-line) !important;
          border-radius: 10px !important;
          background: #ffffff;
        }

        .atlas-locations-v2 textarea {
          min-height: 104px;
        }

        .atlas-locations-v2 button,
        .atlas-locations-v2 [role="button"] {
          transition: border-color 150ms ease, background 150ms ease,
            box-shadow 150ms ease, transform 150ms ease;
        }

        .atlas-locations-v2 button:hover:not(:disabled),
        .atlas-locations-v2 [role="button"]:hover {
          transform: translateY(-1px);
        }

        .atlas-locations-v2 [role="button"]:hover {
          box-shadow: 0 6px 18px rgba(15, 42, 62, 0.08);
        }

        .atlas-locations-v2 button:focus-visible,
        .atlas-locations-v2 input:focus-visible,
        .atlas-locations-v2 select:focus-visible,
        .atlas-locations-v2 textarea:focus-visible,
        .atlas-locations-v2 [role="button"]:focus-visible {
          outline: 3px solid rgba(200, 155, 60, 0.2);
          outline-offset: 1px;
        }

        .atlas-locations-v2 img {
          object-fit: cover;
        }

        .atlas-locations-v2 section {
          scroll-margin-top: 12px;
        }

        .atlas-locations-v2 ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .atlas-locations-v2 ::-webkit-scrollbar-track {
          background: transparent;
        }

        .atlas-locations-v2 ::-webkit-scrollbar-thumb {
          background: #cbd5de;
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .atlas-locations-v2 ::-webkit-scrollbar-thumb:hover {
          background: #aebbc6;
          border: 3px solid transparent;
          background-clip: padding-box;
        }

        @media (max-width: 760px) {
          .atlas-locations-v2 button,
          .atlas-locations-v2 input,
          .atlas-locations-v2 select,
          .atlas-locations-v2 textarea {
            font-size: 16px;
          }

          .atlas-locations-v2 input,
          .atlas-locations-v2 select {
            min-height: 46px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .atlas-locations-v2 *,
          .atlas-locations-v2 *::before,
          .atlas-locations-v2 *::after {
            scroll-behavior: auto !important;
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}

