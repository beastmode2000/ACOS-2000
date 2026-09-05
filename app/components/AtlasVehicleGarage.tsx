"use client";

import React from "react";

type Row = Record<string, any>;

type Props = {
  assetRecords: Row[];
  serviceRecords: Row[];
  locations: Row[];
  colors: Record<string, string>;
  cardStyle: React.CSSProperties;
  mutedSmallStyle: React.CSSProperties;
  badgeStyle: (value: any) => React.CSSProperties;
  formatDate: (value: string) => string;
  isMobile: boolean;
};

function isVehicleAsset(record: Row) {
  const category = String(record.category || "").trim().toLowerCase();
  const name = String(record.name || "").trim().toLowerCase();
  return category === "vehicle" || name.startsWith("vehicle ");
}

function isVehicleCleaningWork(record: Row) {
  const title = String(record.title || "").trim().toLowerCase();
  return Boolean(record.recurring) && /^(clean|wash|detail)\b/.test(title);
}

function activeWork(record: Row) {
  const status = String(record.status || "").toLowerCase();
  return status !== "cancelled" && status !== "canceled";
}

function vehicleDisplayName(record: Row) {
  const name = String(record.name || "Vehicle").replace(/^Vehicle\s+/i, "").trim();
  return name || String(record.name || "Vehicle");
}

export default function AtlasVehicleGarage({
  assetRecords,
  serviceRecords,
  locations,
  colors,
  cardStyle,
  mutedSmallStyle,
  badgeStyle,
  formatDate,
  isMobile,
}: Props) {
  const vehicles = assetRecords
    .filter(isVehicleAsset)
    .slice()
    .sort((a, b) => vehicleDisplayName(a).localeCompare(vehicleDisplayName(b)));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          ...cardStyle,
          padding: 12,
          background: "#F8FAFC",
          borderColor: "#D5E0EA",
        }}
      >
        <strong style={{ color: colors.navy }}>Vehicle Assets</strong>
        <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
          Garage now uses the actual Asset vehicle records. Weekly cleaning status comes only from work orders attached to those Assets.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
          gap: 10,
        }}
      >
        {vehicles.map((vehicle) => {
          const linkedCleaning = serviceRecords
            .filter(
              (record) =>
                String(record.assetId || "") === String(vehicle.id) &&
                isVehicleCleaningWork(record) &&
                activeWork(record),
            )
            .slice()
            .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
          const cleaning = linkedCleaning[0];
          const location = locations.find((item) => item.id === vehicle.locationId);
          const specs = [
            vehicle.year,
            vehicle.manufacturer || vehicle.make,
            vehicle.model,
          ]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .join(" · ");

          return (
            <section key={vehicle.id} style={{ ...cardStyle, padding: 13, display: "grid", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: colors.navy, fontSize: 16 }}>
                    {vehicleDisplayName(vehicle)}
                  </h3>
                  {specs ? <div style={{ ...mutedSmallStyle, marginTop: 2 }}>{specs}</div> : null}
                  {location ? <div style={{ ...mutedSmallStyle, marginTop: 2 }}>{location.name}</div> : null}
                </div>
                <span style={badgeStyle(vehicle.status || "Online")}>{vehicle.status || "Online"}</span>
              </div>

              {cleaning ? (
                <div
                  style={{
                    borderTop: `1px solid ${colors.line}`,
                    paddingTop: 8,
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <strong style={{ color: colors.navy, fontSize: 13 }}>{cleaning.title}</strong>
                    <span style={badgeStyle(cleaning.status || "Scheduled")}>{cleaning.status || "Scheduled"}</span>
                  </div>
                  <div style={{ ...mutedSmallStyle }}>
                    Weekly recurring cleaning
                    {cleaning.date ? ` · Next ${formatDate(String(cleaning.date))}` : ""}
                    {cleaning.lastCompletedDate ? ` · Last ${formatDate(String(cleaning.lastCompletedDate))}` : ""}
                  </div>
                  {linkedCleaning.length > 1 ? (
                    <div style={{ color: colors.red || "#A51E1E", fontSize: 11, fontWeight: 800 }}>
                      {linkedCleaning.length} active recurring cleaning work orders are attached to this Asset. Keep one series only.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{
                    borderTop: `1px solid ${colors.line}`,
                    paddingTop: 8,
                    color: colors.muted,
                    fontSize: 11,
                  }}
                >
                  No recurring weekly cleaning work order is attached to this Asset.
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!vehicles.length ? (
        <div style={{ ...cardStyle, padding: 16, color: colors.muted, fontSize: 12 }}>
          No vehicle Assets are available for this property.
        </div>
      ) : null}
    </div>
  );
}
