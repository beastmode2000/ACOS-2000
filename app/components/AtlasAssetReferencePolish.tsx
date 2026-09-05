"use client";

import { useEffect } from "react";

const LEGACY_CLASSES = [
  "atlas-asset-reference-root",
  "atlas-asset-reference-drawer",
  "atlas-asset-reference-editing",
  "atlas-asset-reference-native-title-row",
  "atlas-asset-reference-native-action-hidden",
  "atlas-asset-reference-toolbar",
  "atlas-asset-reference-toolbar-shell",
  "atlas-asset-reference-density-hidden",
  "atlas-asset-reference-list-action-hidden",
  "atlas-asset-reference-list-row",
  "atlas-asset-reference-inner-scroll",
  "atlas-native-asset-top",
  "atlas-native-asset-section",
  "atlas-native-section-open",
  "atlas-native-photos-shell",
  "atlas-native-photos-manual-open",
  "atlas-native-photo-child",
  "atlas-native-section-inner-title",
  "atlas-native-procedures",
  "atlas-native-asset-tabs-hidden",
];

function clearLegacyAssetReferencePolish() {
  for (const className of LEGACY_CLASSES) {
    for (const element of Array.from(document.querySelectorAll<HTMLElement>(`.${className}`))) {
      element.classList.remove(className);
    }
  }

  for (const host of Array.from(
    document.querySelectorAll<HTMLElement>("[data-atlas-asset-reference-host]"),
  )) {
    host.remove();
  }
}

export default function AtlasAssetReferencePolish() {
  useEffect(() => {
    clearLegacyAssetReferencePolish();

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        clearLegacyAssetReferencePolish();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style jsx global>{`
      .atlas-assets-viewport-root .atlas-asset-drawer {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      .atlas-assets-viewport-root .atlas-asset-drawer,
      .atlas-assets-viewport-root .atlas-asset-drawer * {
        box-sizing: border-box !important;
        min-width: 0;
      }

      .atlas-assets-viewport-root .atlas-asset-drawer img,
      .atlas-assets-viewport-root .atlas-asset-drawer video,
      .atlas-assets-viewport-root .atlas-asset-drawer iframe {
        max-width: 100% !important;
      }

      .atlas-assets-viewport-root .atlas-asset-drawer button,
      .atlas-assets-viewport-root .atlas-asset-drawer a,
      .atlas-assets-viewport-root .atlas-asset-drawer input,
      .atlas-assets-viewport-root .atlas-asset-drawer select,
      .atlas-assets-viewport-root .atlas-asset-drawer textarea {
        max-width: 100% !important;
      }

      @media (max-width: 900px) {
        .atlas-assets-viewport-root .atlas-asset-drawer {
          overflow-x: hidden !important;
        }
      }
    `}</style>
  );
}
