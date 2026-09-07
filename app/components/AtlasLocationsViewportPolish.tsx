"use client";

export default function AtlasLocationsViewportPolish() {
  return (
    <style jsx global>{`
      @media (min-width: 901px) {
        .atlas-location-list-card-clean {
          min-height: 58px !important;
          height: 58px !important;
          max-height: 58px !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }

        .atlas-location-list-card-main {
          min-height: 58px !important;
          height: 58px !important;
          max-height: 58px !important;
          padding: 6px 10px !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        .atlas-location-list-card-main strong {
          font-size: 13px !important;
          line-height: 1.2 !important;
        }
      }
    `}</style>
  );
}
