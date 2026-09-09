"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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

function isCleaningTitle(value: unknown) {
  return /^(clean|wash|detail)\b/.test(String(value || "").trim().toLowerCase());
}

function isLegacyRecurringVehicleCleaning(record: Row) {
  return Boolean(record.recurring) && isCleaningTitle(record.title);
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

function cleaningDates(record: Row) {
  const dates = new Set<string>();
  const add = (value: unknown) => {
    const key = dateKey(value);
    if (key) dates.add(key);
  };

  add(record.lastCompletedDate);
  if (String(record.status || "").toLowerCase() === "completed") add(record.date);

  if (Array.isArray(record.completionHistory)) {
    record.completionHistory.forEach(add);
  }

  if (Array.isArray(record.serviceHistory)) {
    record.serviceHistory.forEach((entry: Row) => {
      add(entry?.completedAt);
      add(entry?.date);
      add(entry?.dueDate);
    });
  }

  return Array.from(dates).sort();
}

function latestCleaningDate(records: Row[]) {
  const dates = records.flatMap(cleaningDates).sort();
  return dates[dates.length - 1] || "";
}

function daysSince(date: string) {
  if (!date) return null;
  const start = new Date(`${date}T12:00:00`);
  const today = new Date(`${todayKey()}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(today.getTime())) return null;
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000));
}

function ageLabel(lastCleaned: string) {
  const age = daysSince(lastCleaned);
  if (age === null) return "Never recorded";
  if (age === 0) return "Cleaned today";
  if (age === 1) return "Cleaned yesterday";
  return `${age} days ago`;
}

function cleaningStatus(lastCleaned: string) {
  const age = daysSince(lastCleaned);
  if (age === null) return "Ready for cleaning";
  if (age >= 7) return "Ready for cleaning";
  return "Cleaned recently";
}

function propertyIdFor(vehicle: Row, related: Row[]) {
  return String(vehicle.propertyId || related.find((record) => record.propertyId)?.propertyId || "").trim();
}

async function saveWorkOrder(propertyId: string, record: Row) {
  if (!propertyId) throw new Error("This vehicle is missing its property link, so Atlas did not save the cleaning record.");
  const response = await fetch("/api/atlas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ table: "work_orders", propertyId, record }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Atlas could not save the vehicle cleaning record.");
  }
  return payload;
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
  const [retiring, setRetiring] = useState(false);
  const retirementAttempted = useRef(false);

  const vehicles = useMemo(
    () =>
      assetRecords
        .filter(isVehicleAsset)
        .slice()
        .sort((a, b) => vehicleDisplayName(a).localeCompare(vehicleDisplayName(b))),
    [assetRecords],
  );

  const vehicleIds = useMemo(() => new Set(vehicles.map((vehicle) => String(vehicle.id))), [vehicles]);

  const legacyActiveCleaning = useMemo(
    () =>
      serviceRecords.filter(
        (record) =>
          vehicleIds.has(String(record.assetId || "")) &&
          isLegacyRecurringVehicleCleaning(record) &&
          activeWork(record),
      ),
    [serviceRecords, vehicleIds],
  );

  useEffect(() => {
    if (retirementAttempted.current || !legacyActiveCleaning.length) return;
    retirementAttempted.current = true;
    let cancelled = false;

    const retire = async () => {
      setRetiring(true);
      try {
        for (const record of legacyActiveCleaning) {
          const vehicle = vehicles.find((item) => String(item.id) === String(record.assetId));
          const propertyId = String(record.propertyId || vehicle?.propertyId || "").trim();
          if (!propertyId) continue;
          await saveWorkOrder(propertyId, {
            ...record,
            recurring: false,
            recurrenceDays: [],
            status: "Cancelled",
          });
        }
        if (!cancelled) {
          setMessage(
            `${legacyActiveCleaning.length} old recurring vehicle cleaning ${legacyActiveCleaning.length === 1 ? "series was" : "series were"} retired. Existing cleaning history was preserved.`,
          );
          window.setTimeout(() => window.location.reload(), 650);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Atlas could not retire the old vehicle cleaning schedule.");
          setRetiring(false);
        }
      }
    };

    void retire();
    return () => {
      cancelled = true;
    };
  }, [legacyActiveCleaning, vehicles]);

  async function recordCleaning(vehicle: Row) {
    const relatedCleaning = serviceRecords.filter(
      (record) => String(record.assetId || "") === String(vehicle.id) && isCleaningTitle(record.title),
    );
    const propertyId = propertyIdFor(vehicle, relatedCleaning);
    if (!propertyId) {
      setMessage("This vehicle is missing its property link, so Atlas did not save anything.");
      return;
    }

    const note = window.prompt(
      `Record cleaning for ${vehicleDisplayName(vehicle)}.\n\nOptional note — for example: Full clean, Exterior only, Wheels + windows, Interior vacuumed.`,
      "",
    );
    if (note === null) return;

    const completedDate = todayKey();
    const completedAt = new Date().toISOString();
    const manualTracker = relatedCleaning.find(
      (record) => record.manualVehicleCleaning === true || String(record.workType || "") === "Manual Vehicle Cleaning",
    );

    const historyEntry = {
      id: `vehicle-clean-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completedAt,
      date: completedDate,
      statusBefore: "Manual",
      notes: note.trim(),
      assetId: vehicle.id,
      locationId: vehicle.locationId || "",
      photos: [],
      documents: [],
    };

    const record: Row = manualTracker
      ? {
          ...manualTracker,
          propertyId,
          assetId: vehicle.id,
          locationId: vehicle.locationId || manualTracker.locationId || "",
          title: `Vehicle Cleaning — ${vehicleDisplayName(vehicle)}`,
          status: "Completed",
          recurring: false,
          manualVehicleCleaning: true,
          workType: "Manual Vehicle Cleaning",
          workCategory: "Cleaning",
          responsibilityArea: "Garage / Vehicles",
          date: completedDate,
          lastCompletedDate: completedDate,
          notes: note.trim(),
          completionHistory: Array.from(
            new Set([...(Array.isArray(manualTracker.completionHistory) ? manualTracker.completionHistory : []), completedDate]),
          ),
          serviceHistory: [
            historyEntry,
            ...(Array.isArray(manualTracker.serviceHistory) ? manualTracker.serviceHistory : []),
          ],
        }
      : {
          id: `vehicle-cleaning-${String(vehicle.id)}-${Date.now()}`,
          propertyId,
          assetId: vehicle.id,
          locationId: vehicle.locationId || "",
          title: `Vehicle Cleaning — ${vehicleDisplayName(vehicle)}`,
          status: "Completed",
          priority: "Low",
          recurring: false,
          manualVehicleCleaning: true,
          workType: "Manual Vehicle Cleaning",
          workCategory: "Cleaning",
          responsibilityArea: "Garage / Vehicles",
          date: completedDate,
          lastCompletedDate: completedDate,
          notes: note.trim(),
          completionHistory: [completedDate],
          serviceHistory: [historyEntry],
        };

    setSavingId(String(vehicle.id));
    setMessage("");
    try {
      await saveWorkOrder(propertyId, record);
      setMessage(`${vehicleDisplayName(vehicle)} cleaning recorded for ${formatDate(completedDate)}.`);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
      window.setTimeout(() => window.location.reload(), 550);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not record the vehicle cleaning.");
      setSavingId("");
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...cardStyle, padding: 12 }}>
        <strong style={{ color: colors.navy }}>Vehicle Cleaning</strong>
        <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
          Cleaning is manual. The goal is about once a week when each vehicle is available; Atlas tracks the last cleaning without creating due dates or overdue work.
        </div>
        <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
          Typical check: exterior · wheels/tires · windows · vacuum · interior wipe-down. Use only what makes sense for that clean.
        </div>
        {retiring ? <div style={{ marginTop: 7, fontSize: 12, fontWeight: 700, color: colors.navy }}>Retiring old recurring vehicle-cleaning schedules…</div> : null}
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
          const relatedCleaning = serviceRecords.filter(
            (record) => String(record.assetId || "") === String(vehicle.id) && isCleaningTitle(record.title),
          );
          const lastCleaned = latestCleaningDate(relatedCleaning);
          const status = cleaningStatus(lastCleaned);
          const location = locations.find((item) => item.id === vehicle.locationId);
          const specs = [vehicle.year, vehicle.manufacturer || vehicle.make, vehicle.model]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .join(" · ");

          return (
            <section key={vehicle.id} style={{ ...cardStyle, padding: 13, display: "grid", gap: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: colors.navy, fontSize: 16 }}>{vehicleDisplayName(vehicle)}</h3>
                  {specs ? <div style={{ ...mutedSmallStyle, marginTop: 2 }}>{specs}</div> : null}
                  {location ? <div style={{ ...mutedSmallStyle, marginTop: 2 }}>{location.name}</div> : null}
                </div>
                <span style={badgeStyle(vehicle.status || "Online")}>{vehicle.status || "Online"}</span>
              </div>

              <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 8, display: "grid", gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: colors.navy, fontSize: 13 }}>Cleaning Status</strong>
                    <div style={{ ...mutedSmallStyle, marginTop: 2 }}>
                      Last cleaned: {lastCleaned ? `${formatDate(lastCleaned)} · ${ageLabel(lastCleaned)}` : "Never recorded"}
                    </div>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 24,
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: `1px solid ${status === "Ready for cleaning" ? "#D8E0E8" : "#C9DFD3"}`,
                      background: status === "Ready for cleaning" ? "#F8FAFC" : "#F1F8F4",
                      color: status === "Ready for cleaning" ? colors.navy : "#276749",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {status}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={savingId === String(vehicle.id) || retiring}
                  onClick={() => void recordCleaning(vehicle)}
                  style={{
                    justifySelf: "start",
                    minHeight: 34,
                    padding: "6px 11px",
                    borderRadius: 8,
                    border: `1px solid ${colors.gold}`,
                    background: "#FFFFFF",
                    color: colors.navy,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: savingId === String(vehicle.id) || retiring ? "wait" : "pointer",
                    opacity: savingId === String(vehicle.id) || retiring ? 0.6 : 1,
                  }}
                >
                  {savingId === String(vehicle.id) ? "Saving…" : "Clean Now"}
                </button>
              </div>
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
