"use client";

import { useEffect } from "react";

type AtlasRecord = Record<string, any>;

const PROPERTY_IDS = ["2000", "6855", "3661", "Hangar", "4725"];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function serviceRecords(payload: any) {
  if (Array.isArray(payload?.serviceRecords)) return payload.serviceRecords as AtlasRecord[];
  if (Array.isArray(payload?.workOrders)) return payload.workOrders as AtlasRecord[];
  return [] as AtlasRecord[];
}

function notesHistory(record: AtlasRecord) {
  return Array.isArray(record?.notesHistory) ? (record.notesHistory as AtlasRecord[]) : [];
}

function seasonalPauseMarker(record: AtlasRecord) {
  return notesHistory(record).find((entry) => text(entry?.text).startsWith("ATLAS_SEASONAL_PAUSED|"));
}

function previousDateFromMarker(marker: AtlasRecord | undefined) {
  const markerText = text(marker?.text);
  const parts = markerText.split("|");
  const previousDate = text(parts[2]);
  return validDate(previousDate) ? previousDate : "";
}

async function loadProperty(propertyId: string) {
  const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Atlas could not load ${propertyId}.`);
  }
  return payload;
}

async function saveRecord(propertyId: string, record: AtlasRecord) {
  const response = await fetch("/api/atlas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-request-id": `repair-work-date-${propertyId}-${text(record.id)}`,
    },
    credentials: "include",
    body: JSON.stringify({
      table: "work_orders",
      propertyId,
      record: { ...record, propertyId },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Work schedule repair did not save.");
  }
}

async function repairProperty(propertyId: string) {
  const payload = await loadProperty(propertyId);
  const records = serviceRecords(payload);
  let repaired = 0;

  for (const record of records) {
    if (!record?.recurring) continue;
    if (text(record.date)) continue;

    const marker = seasonalPauseMarker(record);
    const previousDate = previousDateFromMarker(marker);
    if (!previousDate) continue;

    const cleanedHistory = notesHistory(record).filter(
      (entry) => !text(entry?.text).startsWith("ATLAS_SEASONAL_PAUSED|"),
    );

    await saveRecord(propertyId, {
      ...record,
      date: previousDate,
      status: "Scheduled",
      recurrenceEndDate: "",
      lastOutcome: text(record.lastOutcome).startsWith("Seasonal pause") ? "" : record.lastOutcome,
      lastOutcomeAt: text(record.lastOutcome).startsWith("Seasonal pause") ? "" : record.lastOutcomeAt,
      notesHistory: cleanedHistory,
    });
    repaired += 1;
  }

  return repaired;
}

export default function AtlasWorkScheduleRepair() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let repaired = 0;
      for (const propertyId of PROPERTY_IDS) {
        if (cancelled) return;
        try {
          repaired += await repairProperty(propertyId);
        } catch {
          // Keep other properties isolated and continue repairing the rest.
        }
      }

      if (!cancelled && repaired > 0) {
        window.dispatchEvent(
          new CustomEvent("atlas:data-changed", {
            detail: { table: "work_orders", reason: "repair-recurring-dates" },
          }),
        );
        window.setTimeout(() => window.location.reload(), 500);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
