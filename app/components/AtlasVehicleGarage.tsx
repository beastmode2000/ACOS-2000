"use client";

import React, { useState } from "react";

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
  return status !== "cancelled" && status !== "canceled" && status !== "completed";
}

function vehicleDisplayName(record: Row) {
  const name = String(record.name || "Vehicle").replace(/^Vehicle\s+/i, "").trim();
  return name || String(record.name || "Vehicle");
}

function dateKey(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayKey() {
  return dateKey(new Date());
}

function nextRecurringDate(record: Row, dueDate: string) {
  const start = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "";

  const recurrenceDays = Array.isArray(record.recurrenceDays)
    ? Array.from(
        new Set(
          record.recurrenceDays
            .map((value: unknown) => Math.floor(Number(value)))
            .filter((value: number) => Number.isInteger(value) && value >= 0 && value <= 6),
        ),
      )
    : [];

  let next = new Date(start);
  if (recurrenceDays.length) {
    let found = false;
    for (let offset = 1; offset <= 14; offset += 1) {
      const candidate = new Date(start);
      candidate.setDate(candidate.getDate() + offset);
      if (recurrenceDays.includes(candidate.getDay())) {
        next = candidate;
        found = true;
        break;
      }
    }
    if (!found) return "";
  } else {
    const interval = Math.max(1, Math.floor(Number(record.recurrenceInterval || 1)));
    const unit = String(record.recurrenceUnit || "Weeks");
    if (unit === "Days") next.setDate(next.getDate() + interval);
    else if (unit === "Months") next.setMonth(next.getMonth() + interval);
    else if (unit === "Years") next.setFullYear(next.getFullYear() + interval);
    else next.setDate(next.getDate() + interval * 7);
  }

  const key = dateKey(next);
  const endKey = dateKey(record.recurrenceEndDate);
  return endKey && key > endKey ? "" : key;
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
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const vehicles = assetRecords
    .filter(isVehicleAsset)
    .slice()
    .sort((a, b) => vehicleDisplayName(a).localeCompare(vehicleDisplayName(b)));

  async function completeDueOccurrence(record: Row) {
    const dueDate = dateKey(record.date);
    if (!dueDate || dueDate > todayKey()) return;

    const completionNote = window.prompt(
      `What was done for ${record.title || "this vehicle"}?\n\nExamples: Exterior only, Interior vacuumed, Quick rinse, Full clean.`,
      "",
    );
    if (completionNote === null) return;

    const completedDate = todayKey();
    const nextDate = nextRecurringDate(record, dueDate);
    const completedAt = new Date().toISOString();
    const historyEntry = {
      id: `completion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completedAt,
      dueDate,
      statusBefore: String(record.status || "Scheduled"),
      notes: completionNote.trim(),
      assetId: record.assetId || "",
      vendorId: record.vendorId || "",
      procedureId: record.procedureId || "",
      locationId: record.locationId || "",
      photos: Array.isArray(record.photos) ? record.photos : [],
      documents: Array.isArray(record.documents) ? record.documents : [],
    };

    const nextRecord = {
      ...record,
      date: nextDate || dueDate,
      status: nextDate ? "Scheduled" : "Completed",
      lastCompletedDate: completedDate,
      completionHistory: [
        ...(Array.isArray(record.completionHistory) ? record.completionHistory : []),
        completedDate,
      ],
      serviceHistory: [
        historyEntry,
        ...(Array.isArray(record.serviceHistory) ? record.serviceHistory : []),
      ],
    };

    setSavingId(String(record.id));
    setMessage("");
    try {
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          table: "work_orders",
          propertyId: record.propertyId,
          record: nextRecord,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Could not complete vehicle cleaning.");
      setMessage(
        nextDate
          ? `${record.title} completed for ${formatDate(dueDate)}. Next due ${formatDate(nextDate)}.`
          : `${record.title} completed for ${formatDate(dueDate)}.`,
      );
      window.setTimeout(() => window.location.reload(), 550);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete vehicle cleaning.");
      setSavingId("");
    }
  }

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
          Garage uses the actual Asset vehicle records. Weekly cleaning status comes only from work orders attached to those Assets.
        </div>
        {message ? <div style={{ marginTop: 7, fontSize: 12, fontWeight: 700, color: colors.navy }}>{message}</div> : null}
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
          const dueDate = cleaning ? dateKey(cleaning.date) : "";
          const canComplete = Boolean(dueDate && dueDate <= todayKey());
          const overdue = Boolean(dueDate && dueDate < todayKey());
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
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <strong style={{ color: colors.navy, fontSize: 13 }}>{cleaning.title}</strong>
                    <span style={badgeStyle(overdue ? "High" : cleaning.status || "Scheduled")}>
                      {overdue ? "Overdue" : cleaning.status || "Scheduled"}
                    </span>
                  </div>
                  <div style={{ ...mutedSmallStyle }}>
                    Weekly recurring cleaning
                    {cleaning.date ? ` · Due ${formatDate(String(cleaning.date))}` : ""}
                    {cleaning.lastCompletedDate ? ` · Last ${formatDate(String(cleaning.lastCompletedDate))}` : ""}
                  </div>
                  {canComplete ? (
                    <button
                      type="button"
                      disabled={savingId === String(cleaning.id)}
                      onClick={() => void completeDueOccurrence(cleaning)}
                      style={{
                        justifySelf: "start",
                        minHeight: 32,
                        padding: "6px 10px",
                        borderRadius: 7,
                        border: `1px solid ${colors.gold}`,
                        background: "#FFFFFF",
                        color: colors.navy,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: savingId === String(cleaning.id) ? "wait" : "pointer",
                      }}
                    >
                      {savingId === String(cleaning.id)
                        ? "Saving…"
                        : `Complete ${formatDate(dueDate)} occurrence`}
                    </button>
                  ) : null}
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
