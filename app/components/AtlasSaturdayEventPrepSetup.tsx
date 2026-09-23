"use client";

import { useEffect } from "react";

const WORK_ID = "event-prep-2026-09-26";
const EVENT_DATE = "2026-09-26";

const checklist = [
  "Store all painter equipment, ladders, drop cloths, tools, and materials after cleanup",
  "Sweep/blow front entrance and arrival walk",
  "Clean/check front entrance windows and glass",
  "Remove webs around front entrance",
  "Remove visible weeds around front entrance, courtyard, back patio, and parking areas",
  "Remove leaves from front entrance, courtyard, back patio, and parking areas",
  "Sweep/blow courtyard",
  "Wipe and straighten courtyard table/furniture",
  "Set and straighten courtyard cushions",
  "Check courtyard heaters and make sure they are guest-ready",
  "Clean/check skylights",
  "Clean and straighten BBQ area",
  "Wipe and straighten back patio tables/furniture",
  "Set and straighten back patio cushions",
  "Check back patio heaters and make sure they are guest-ready",
  "Remove webs around back patio / BBQ area",
  "Blow/sweep parking and arrival areas and remove contractor clutter",
  "Final walkthrough: front entrance → courtyard → back patio → parking before guests arrive",
].map((text, index) => ({
  id: `event-prep-${index + 1}`,
  text,
  completed: false,
}));

export default function AtlasSaturdayEventPrepSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const today = new Date();
    const localToday = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    // This is a one-time operational setup for the September 26 events.
    // Never recreate it after the event date if it is later deleted intentionally.
    if (localToday > EVENT_DATE) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/atlas?propertyId=2000&eventPrepCheck=${Date.now()}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!response.ok) return;

        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;

        const records = Array.isArray(payload?.serviceRecords)
          ? payload.serviceRecords
          : Array.isArray(payload?.workOrders)
            ? payload.workOrders
            : [];

        if (records.some((record: any) => String(record?.id || "") === WORK_ID)) {
          return;
        }

        const save = await fetch("/api/atlas", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            table: "work_orders",
            propertyId: "2000",
            record: {
              id: WORK_ID,
              propertyId: "2000",
              title: "Saturday Event Prep",
              date: EVENT_DATE,
              status: "Open",
              priority: "High",
              notes:
                "Two events at the house Saturday. Guests will use the front entrance. Painter equipment must be fully stored after cleanup. Prepare the front entrance, courtyard, back patio/BBQ, and parking/arrival areas in case guests use the outdoor spaces.",
              recurring: false,
              recurrenceInterval: 1,
              recurrenceUnit: "Weeks",
              recurrenceDays: [],
              season: "Year-Round",
              completionHistory: [],
              workType: "Work Order",
              workCategory: "Event Prep",
              effort: "Half Day",
              responsibilityArea: "Saturday Event Prep",
              assignedTo: "Nick",
              checklist,
              notesHistory: [],
              serviceHistory: [],
              photos: [],
              documents: [],
            },
          }),
        });

        const saved = await save.json().catch(() => ({}));
        if (!save.ok || saved?.ok === false || cancelled) return;

        window.dispatchEvent(
          new CustomEvent("atlas:data-changed", {
            detail: { table: "work_orders", id: WORK_ID, reason: "saturday-event-prep-created" },
          }),
        );

        // Pull the newly created work order into the already-loaded Atlas state
        // without asking the user to manually refresh.
        window.setTimeout(() => window.location.reload(), 250);
      } catch {
        // The normal Atlas load remains usable if this one-time setup cannot sync.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
