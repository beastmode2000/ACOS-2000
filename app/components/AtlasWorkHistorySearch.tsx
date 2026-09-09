"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Row = Record<string, any>;

type HistoryEvent = {
  id: string;
  recordId: string;
  title: string;
  date: string;
  notes: string;
  status: string;
  assetName: string;
  locationName: string;
  vendorName: string;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function dateKey(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function displayDate(value: string) {
  const key = dateKey(value);
  if (!key) return "Unknown date";
  const parsed = new Date(`${key}T12:00:00`);
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return String(candidate?.value || "2000");
}

function historyEvents(records: Row[], assets: Row[], locations: Row[], vendors: Row[]) {
  const assetNames = new Map(assets.map((row) => [String(row.id), String(row.name || "")]));
  const locationNames = new Map(locations.map((row) => [String(row.id), String(row.name || "")]));
  const vendorNames = new Map(vendors.map((row) => [String(row.id), String(row.name || "")]));
  const events: HistoryEvent[] = [];

  for (const record of records) {
    const recordId = String(record.id || "");
    const title = String(record.title || "Work item");
    const status = String(record.status || "");
    const assetName = assetNames.get(String(record.assetId || "")) || "";
    const locationName = locationNames.get(String(record.locationId || "")) || "";
    const vendorName = vendorNames.get(String(record.vendorId || "")) || "";
    const seenDates = new Set<string>();

    const serviceHistory = Array.isArray(record.serviceHistory) ? record.serviceHistory : [];
    serviceHistory.forEach((entry: Row, index: number) => {
      const date = dateKey(entry?.completedAt || entry?.date || entry?.dueDate);
      if (!date) return;
      seenDates.add(date);
      events.push({
        id: `${recordId}:service:${entry?.id || index}`,
        recordId,
        title,
        date,
        notes: String(entry?.notes || record.notes || ""),
        status: "Completed",
        assetName,
        locationName,
        vendorName,
      });
    });

    const completionHistory = Array.isArray(record.completionHistory) ? record.completionHistory : [];
    completionHistory.forEach((value: unknown, index: number) => {
      const date = dateKey(value);
      if (!date || seenDates.has(date)) return;
      seenDates.add(date);
      events.push({
        id: `${recordId}:completion:${index}:${date}`,
        recordId,
        title,
        date,
        notes: String(record.notes || ""),
        status: "Completed",
        assetName,
        locationName,
        vendorName,
      });
    });

    const lastCompleted = dateKey(record.lastCompletedDate || record.completedAt);
    if (lastCompleted && !seenDates.has(lastCompleted)) {
      seenDates.add(lastCompleted);
      events.push({
        id: `${recordId}:last:${lastCompleted}`,
        recordId,
        title,
        date: lastCompleted,
        notes: String(record.notes || ""),
        status: "Completed",
        assetName,
        locationName,
        vendorName,
      });
    }

    if (!seenDates.size && normalized(status) === "completed") {
      const fallbackDate = dateKey(record.date || record.workDate || record.updatedAt || record.createdAt);
      if (fallbackDate) {
        events.push({
          id: `${recordId}:record:${fallbackDate}`,
          recordId,
          title,
          date: fallbackDate,
          notes: String(record.notes || ""),
          status,
          assetName,
          locationName,
          vendorName,
        });
      }
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export default function AtlasWorkHistorySearch() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [propertyId, setPropertyId] = useState("2000");
  const [records, setRecords] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [locations, setLocations] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let frame = 0;
    let input: HTMLInputElement | null = null;

    const onInput = () => setQuery(input?.value || "");

    const apply = () => {
      frame = 0;
      const nextInput = document.querySelector<HTMLInputElement>('input[aria-label="Search work"]');
      if (nextInput !== input) {
        input?.removeEventListener("input", onInput);
        input = nextInput;
        input?.addEventListener("input", onInput);
        setQuery(input?.value || "");
      }

      if (!input) {
        setHost(null);
        return;
      }

      let nextHost = input.parentElement?.querySelector<HTMLElement>(":scope > [data-atlas-work-history-search]") || null;
      if (!nextHost && input.parentElement) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasWorkHistorySearch = "true";
        input.parentElement.appendChild(nextHost);
      }
      setHost((current) => (current === nextHost ? current : nextHost));
      setPropertyId(currentPropertyId());
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("change", schedule, true);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      input?.removeEventListener("input", onInput);
      if (frame) window.cancelAnimationFrame(frame);
      document.querySelectorAll("[data-atlas-work-history-search]").forEach((node) => node.remove());
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) throw new Error("Could not load work history");
        if (cancelled) return;
        setRecords(Array.isArray(payload.serviceRecords) ? payload.serviceRecords : Array.isArray(payload.workOrders) ? payload.workOrders : []);
        setAssets(Array.isArray(payload.assetRecords) ? payload.assetRecords : Array.isArray(payload.assets) ? payload.assets : []);
        setLocations(Array.isArray(payload.locationRecords) ? payload.locationRecords : Array.isArray(payload.locations) ? payload.locations : []);
        setVendors(Array.isArray(payload.vendorRecords) ? payload.vendorRecords : Array.isArray(payload.vendors) ? payload.vendors : []);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [host, propertyId]);

  const events = useMemo(() => historyEvents(records, assets, locations, vendors), [records, assets, locations, vendors]);
  const results = useMemo(() => {
    const needle = normalized(query);
    if (needle.length < 2) return [];
    return events
      .filter((event) =>
        normalized([
          event.title,
          event.notes,
          event.assetName,
          event.locationName,
          event.vendorName,
          event.date,
        ].join(" ")).includes(needle),
      )
      .slice(0, 20);
  }, [events, query]);

  if (!host || normalized(query).length < 2) return null;

  return createPortal(
    <div className="atlas-work-history-results">
      <div className="atlas-work-history-heading">
        <strong>Work History</strong>
        <span>{loading ? "Searching…" : `${results.length} match${results.length === 1 ? "" : "es"}`}</span>
      </div>
      {!loading && !results.length ? (
        <div className="atlas-work-history-empty">No completed history matches “{query.trim()}”.</div>
      ) : null}
      {results.map((event) => (
        <div className="atlas-work-history-row" key={event.id}>
          <div className="atlas-work-history-row-top">
            <strong>{event.title}</strong>
            <span>{displayDate(event.date)}</span>
          </div>
          {[event.assetName, event.locationName, event.vendorName].filter(Boolean).length ? (
            <div className="atlas-work-history-meta">
              {[event.assetName, event.locationName, event.vendorName].filter(Boolean).join(" · ")}
            </div>
          ) : null}
          {event.notes ? <div className="atlas-work-history-notes">{event.notes}</div> : null}
        </div>
      ))}
      <style jsx global>{`
        .atlas-work-history-results {
          margin-top: 6px;
          border: 1px solid #d8e0e8;
          border-radius: 10px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(7, 24, 39, 0.08);
        }
        .atlas-work-history-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-bottom: 1px solid #e5eaf0;
          background: #f8fafc;
          color: #17324d;
          font-size: 12px;
        }
        .atlas-work-history-heading span,
        .atlas-work-history-meta {
          color: #6b7c8f;
          font-size: 11px;
        }
        .atlas-work-history-row {
          padding: 9px 10px;
          border-bottom: 1px solid #edf1f5;
        }
        .atlas-work-history-row:last-child { border-bottom: 0; }
        .atlas-work-history-row-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          color: #17324d;
          font-size: 12px;
        }
        .atlas-work-history-row-top span {
          flex: 0 0 auto;
          color: #526579;
          font-size: 11px;
          font-weight: 800;
        }
        .atlas-work-history-meta { margin-top: 2px; }
        .atlas-work-history-notes {
          margin-top: 4px;
          color: #42566b;
          font-size: 11px;
          line-height: 1.35;
          white-space: pre-wrap;
        }
        .atlas-work-history-empty {
          padding: 10px;
          color: #6b7c8f;
          font-size: 11px;
        }
        @media (max-width: 900px) {
          .atlas-work-history-row-top { align-items: flex-start; }
          .atlas-work-history-row-top strong { min-width: 0; }
        }
      `}</style>
    </div>,
    host,
  );
}
