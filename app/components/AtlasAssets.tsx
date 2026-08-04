"use client";

import React from "react";

type AtlasAssetsProps = {
  children: React.ReactNode;
  isMobile?: boolean;
};

/**
 * Shared Assets UI 2.0 surface.
 *
 * Asset data and workflows remain owned by page.tsx for now. This component
 * provides the consistent visual system so Assets can be separated safely in
 * a later pass without risking any existing behavior.
 */
export default function AtlasAssets({ children, isMobile = false }: AtlasAssetsProps) {
  return (
    <div
      className="atlas-assets-v2"
      data-mobile={isMobile ? "true" : "false"}
      style={{ minWidth: 0, width: "100%" }}
    >
      <style>{`
        .atlas-assets-v2 {
          --asset-navy: #123b59;
          --asset-navy-deep: #0b2c43;
          --asset-gold: #c89b3c;
          --asset-gold-soft: #fff8e8;
          --asset-text: #17212b;
          --asset-muted: #607080;
          --asset-line: #dbe3ea;
          --asset-panel: #ffffff;
          --asset-soft: #f7f9fb;
          --asset-radius: 14px;
          --asset-shadow: 0 8px 24px rgba(15, 42, 62, 0.07);
          color: var(--asset-text);
        }

        .atlas-assets-v2 h1,
        .atlas-assets-v2 h2,
        .atlas-assets-v2 h3,
        .atlas-assets-v2 strong {
          letter-spacing: -0.012em;
        }

        .atlas-assets-v2 button,
        .atlas-assets-v2 input,
        .atlas-assets-v2 select,
        .atlas-assets-v2 textarea {
          font-size: 14px;
          line-height: 1.4;
        }

        .atlas-assets-v2 input,
        .atlas-assets-v2 select,
        .atlas-assets-v2 textarea {
          min-height: 42px;
          border-color: var(--asset-line) !important;
          border-radius: 10px !important;
          background: #fff;
        }

        .atlas-assets-v2 textarea {
          min-height: 104px;
        }

        .atlas-assets-v2 button {
          transition: border-color 150ms ease, background 150ms ease,
            box-shadow 150ms ease, transform 150ms ease;
        }

        .atlas-assets-v2 button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .atlas-assets-v2 button:focus-visible,
        .atlas-assets-v2 input:focus-visible,
        .atlas-assets-v2 select:focus-visible,
        .atlas-assets-v2 textarea:focus-visible {
          outline: 3px solid rgba(200, 155, 60, 0.2);
          outline-offset: 1px;
        }

        .atlas-assets-v2 img {
          object-fit: cover;
        }

        .atlas-assets-v2 [role="button"] {
          transition: border-color 150ms ease, background 150ms ease,
            box-shadow 150ms ease, transform 150ms ease;
        }

        .atlas-assets-v2 [role="button"]:hover {
          box-shadow: 0 6px 18px rgba(15, 42, 62, 0.08);
        }

        .atlas-assets-v2 section {
          scroll-margin-top: 12px;
        }

        .atlas-assets-v2 ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .atlas-assets-v2 ::-webkit-scrollbar-track {
          background: transparent;
        }

        .atlas-assets-v2 ::-webkit-scrollbar-thumb {
          background: #cbd5de;
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .atlas-assets-v2 ::-webkit-scrollbar-thumb:hover {
          background: #aebbc6;
          border: 3px solid transparent;
          background-clip: padding-box;
        }

        @media (max-width: 760px) {
          .atlas-assets-v2 button,
          .atlas-assets-v2 input,
          .atlas-assets-v2 select,
          .atlas-assets-v2 textarea {
            font-size: 16px;
          }

          .atlas-assets-v2 input,
          .atlas-assets-v2 select {
            min-height: 46px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .atlas-assets-v2 *,
          .atlas-assets-v2 *::before,
          .atlas-assets-v2 *::after {
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

