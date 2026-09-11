"use client";

import { useEffect } from "react";

type WorkRecord = Record<string, unknown> & {
  id?: unknown;
  notes?: unknown;
  completionNotes?: unknown;
  serviceHistory?: Array<Record<string, unknown>>;
};

function normalized(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function removeGeneratedComments(record: WorkRecord) {
  const instructions = normalized(record.notes);
  if (!instructions) return null;
  let changed = false;

  const serviceHistory = Array.isArray(record.serviceHistory)
    ? record.serviceHistory.map((entry) => {
        if (normalized(entry.notes) !== instructions) return entry;
        changed = true;
        return { ...entry, notes: "" };
      })
    : [];

  const completionNotes = normalized(record.completionNotes) === instructions
    ? (changed = true, "")
    : record.completionNotes;

  return changed ? { ...record, completionNotes, serviceHistory } : null;
}

export default function AtlasGeneratedWorkCommentsCleanup() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/atlas?propertyId=2000&workCommentCleanup=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json();
        const records = (Array.isArray(payload?.workOrders)
          ? payload.workOrders
          : Array.isArray(payload?.serviceRecords)
            ? payload.serviceRecords
            : []) as WorkRecord[];
        const updates = records.map(removeGeneratedComments).filter(Boolean) as WorkRecord[];
        if (!updates.length || cancelled) return;

        await Promise.all(updates.map(async (record) => {
          const saved = await fetch("/api/atlas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ table: "work_orders", record: { ...record, propertyId: "2000" } }),
          });
          if (!saved.ok) throw new Error(`Failed to remove generated comment from ${record.id}`);
        }));

        if (!cancelled && window.sessionStorage.getItem("atlas-work-comment-cleanup-reloaded-v1") !== "true") {
          window.sessionStorage.setItem("atlas-work-comment-cleanup-reloaded-v1", "true");
          window.location.reload();
        }
      } catch {
        // Retry on the next Atlas load until every generated comment is removed.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
