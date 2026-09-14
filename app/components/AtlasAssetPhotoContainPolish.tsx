"use client";

export default function AtlasAssetPhotoContainPolish() {
  return (
    <style jsx global>{`
      .atlas-asset-reference-root .atlas-asset-reference-photo {
        object-fit: contain !important;
        object-position: center !important;
        background: #ffffff !important;
      }
    `}</style>
  );
}
