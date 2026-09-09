"use client";

export default function AtlasAssetEditVisibilityFix() {
  return (
    <style jsx global>{`
      .atlas-asset-reference-drawer.atlas-asset-reference-editing
        [data-atlas-asset-reference-host] {
        display: none !important;
      }

      .atlas-asset-reference-drawer.atlas-asset-reference-editing
        .atlas-asset-reference-native-title-row > div:first-child {
        display: block !important;
      }

      .atlas-asset-reference-drawer.atlas-asset-reference-editing
        .atlas-asset-reference-native-title-row {
        justify-content: space-between !important;
        align-items: flex-start !important;
        margin-bottom: 10px !important;
      }
    `}</style>
  );
}
