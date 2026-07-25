"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type TimelineZoom = "Days" | "Months" | "Years" | "Decades";

type CustomTimelineEvent = {
  id: string;
  propertyId: string;
  date: string;
  title: string;
  description: string;
  type: "Milestone" | "Renovation" | "Landscape" | "Installation" | "Estate Event";
  locationId: string;
  assetId: string;
  vendorId: string;
  beforePhoto: string;
  afterPhoto: string;
  createdAt: string;
};

type TimelineEntry = {
  id: string;
  date: string;
  type: string;
  icon: string;
  title: string;
  description: string;
  locationId?: string;
  assetId?: string;
  vendorId?: string;
  photo?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  isMilestone?: boolean;
  record?: any;
  request?: any;
  event?: any;
  custom?: CustomTimelineEvent;
};

type Props = {
  mode: "timeline" | "insights";
  propertyId?: string;
  serviceRecords?: any[];
  requestRecords?: any[];
  todayEvents?: any[];
  upcomingEvents?: any[];
  weatherDays?: any[];
  colors: Record<string, string>;
  sectionStyle: React.CSSProperties;
  noticeStyle: React.CSSProperties;
  mutedSmallStyle: React.CSSProperties;
  secondaryButtonStyle: React.CSSProperties;
  goldButtonStyle: React.CSSProperties;
  badgeStyle: (value: string) => React.CSSProperties;
  formatDate: (value: string) => string;
  assetName: (id?: string) => string;
  vendorName?: (id?: string) => string;
  locationName?: (id?: string) => string;
  setScreen: (screen: string) => void;
  setSelectedServiceId: (id: string) => void;
  setSelectedRequestId?: (id: string) => void;
  openCalendarItem: (event: any) => void;
};

const CUSTOM_TIMELINE_KEY = "atlas-custom-timeline-events-v1";

function parseDate(value?: string) {
  if (!value) return Number.NaN;
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  return new Date(normalized).getTime();
}

function dateLabel(value?: string) {
  if (!value) return "No date";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthYearLabel(value?: string) {
  if (!value) return "Unknown";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function yearLabel(value?: string) {
  if (!value) return "Unknown";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : String(parsed.getFullYear());
}

function decadeLabel(value?: string) {
  if (!value) return "Unknown";
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const year = parsed.getFullYear();
  return `${Math.floor(year / 10) * 10}s`;
}

function daysFromToday(value?: string) {
  const time = parseDate(value);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((time - today.getTime()) / 86_400_000);
}

function category(record: any) {
  return String(record.workCategory || record.category || "🔧 Maintenance");
}

function workType(record: any) {
  if (record.workType) return String(record.workType);
  return record.recurring ? "Preventive Maintenance" : "Work Order";
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readCustomEvents(): CustomTimelineEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TIMELINE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomEvents(events: CustomTimelineEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_TIMELINE_KEY, JSON.stringify(events));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function groupLabel(entry: TimelineEntry, zoom: TimelineZoom) {
  if (zoom === "Days") return dateLabel(entry.date);
  if (zoom === "Months") return monthYearLabel(entry.date);
  if (zoom === "Years") return yearLabel(entry.date);
  return decadeLabel(entry.date);
}

export default function AtlasInsightsTimeline({
  mode,
  propertyId = "2000",
  serviceRecords = [],
  requestRecords = [],
  todayEvents = [],
  upcomingEvents = [],
  weatherDays = [],
  colors,
  sectionStyle,
  noticeStyle,
  mutedSmallStyle,
  secondaryButtonStyle,
  goldButtonStyle,
  badgeStyle,
  formatDate,
  assetName,
  vendorName = () => "No vendor",
  locationName = () => "No location",
  setScreen,
  setSelectedServiceId,
  setSelectedRequestId = () => undefined,
  openCalendarItem,
}: Props) {
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineType, setTimelineType] = useState("All");
  const [timelineLocation, setTimelineLocation] = useState("All");
  const [timelineAsset, setTimelineAsset] = useState("All");
  const [timelineVendor, setTimelineVendor] = useState("All");
  const [zoom, setZoom] = useState<TimelineZoom>("Months");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [customEvents, setCustomEvents] = useState<CustomTimelineEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [carouselPosition, setCarouselPosition] = useState(0);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    description: "",
    type: "Milestone" as CustomTimelineEvent["type"],
    locationId: "",
    assetId: "",
    vendorId: "",
    beforePhoto: "",
    afterPhoto: "",
  });
  const horizontalRef = useRef<HTMLDivElement | null>(null);
  const carouselFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setCustomEvents(readCustomEvents());
  }, []);

  const activeRecords = useMemo(
    () => serviceRecords.filter((record) => record.status !== "Completed"),
    [serviceRecords],
  );

  const insightData = useMemo(() => {
    const overdue = activeRecords.filter(
      (record) => record.date && daysFromToday(record.date) < 0,
    );
    const dueToday = activeRecords.filter(
      (record) => record.date && daysFromToday(record.date) === 0,
    );
    const dueThisWeek = activeRecords.filter((record) => {
      const days = daysFromToday(record.date);
      return days >= 1 && days <= 7;
    });
    const highPriority = activeRecords.filter(
      (record) => record.priority === "High",
    );
    const inProgress = activeRecords.filter(
      (record) => record.status === "In Progress",
    );
    const recurring = activeRecords.filter(
      (record) =>
        record.recurring || workType(record) === "Preventive Maintenance",
    );
    const projects = activeRecords.filter(
      (record) => workType(record) === "Project",
    );

    const vendorEvents = [...todayEvents, ...upcomingEvents]
      .filter((event) => {
        const text = [
          event.title,
          event.categoryLabel,
          event.area,
          event.linkedType,
          event.linkedName,
          event.notes,
        ]
          .join(" ")
          .toLowerCase();
        return (
          event.linkedType === "Vendor" ||
          text.includes("vendor") ||
          text.includes("service") ||
          text.includes("on-site") ||
          text.includes("onsite")
        );
      })
      .slice(0, 12);

    const health = Math.max(
      0,
      Math.min(
        100,
        100 -
          overdue.length * 6 -
          highPriority.length * 3 -
          inProgress.length,
      ),
    );

    const alerts: string[] = [];
    const todayWeather = weatherDays[0];
    const tomorrowWeather = weatherDays[1];

    if (todayWeather) {
      if (todayWeather.precipChance >= 70 || todayWeather.precipAmount >= 0.2) {
        alerts.push("Rain likely today — prioritize indoor and covered work.");
      } else if (todayWeather.high >= 85) {
        alerts.push("Hot day — schedule strenuous outdoor work early.");
      } else if (todayWeather.windMax >= 20) {
        alerts.push("High wind — avoid spraying and unsecured outdoor work.");
      } else {
        alerts.push("Weather supports normal outdoor maintenance today.");
      }
    }

    if (
      tomorrowWeather &&
      (tomorrowWeather.precipChance >= 65 ||
        tomorrowWeather.precipAmount >= 0.2)
    ) {
      alerts.push("Rain risk tomorrow — finish exposed outdoor work today.");
    }

    const recommended = [
      ...overdue.map((record) => ({
        title: `Start overdue: ${record.title}`,
        detail: `${category(record)} · ${formatDate(record.date)}`,
        record,
      })),
      ...inProgress.map((record) => ({
        title: `Continue: ${record.title}`,
        detail: `${category(record)} · already in progress`,
        record,
      })),
      ...dueToday.map((record) => ({
        title: `Complete today: ${record.title}`,
        detail: `${category(record)} · ${locationName(record.locationId)}`,
        record,
      })),
    ].slice(0, 8);

    return {
      overdue,
      dueToday,
      dueThisWeek,
      highPriority,
      inProgress,
      recurring,
      projects,
      vendorEvents,
      health,
      alerts,
      recommended,
    };
  }, [
    activeRecords,
    formatDate,
    locationName,
    todayEvents,
    upcomingEvents,
    weatherDays,
  ]);

  const rawTimelineEntries = useMemo(() => {
    const entries: TimelineEntry[] = [];

    serviceRecords.forEach((record) => {
      const recordedCompletionDays = new Set<string>();
      const snapshots = Array.isArray(record.serviceHistory)
        ? record.serviceHistory
        : Array.isArray(record.completionSnapshots)
          ? record.completionSnapshots
          : [];

      snapshots.forEach((snapshot: any, index: number) => {
        const snapshotDate =
          snapshot.completedAt ||
          snapshot.completedDate ||
          snapshot.date ||
          record.lastCompletedDate;
        const snapshotDay = String(snapshotDate || "").slice(0, 10);
        if (snapshotDay) recordedCompletionDays.add(snapshotDay);
        entries.push({
          id: `${record.id}-service-${snapshot.id || index}`,
          date: snapshotDate,
          type: "Completed Work",
          icon: "✓",
          title: snapshot.title || record.title,
          description:
            snapshot.notes ||
            `${category(record)} · ${assetName(record.assetId)}`,
          locationId: snapshot.locationId || record.locationId,
          assetId: snapshot.assetId || record.assetId,
          vendorId: snapshot.vendorId || record.vendorId,
          beforePhoto:
            snapshot.beforePhoto ||
            snapshot.beforePhotoUrl ||
            snapshot.beforeImage ||
            "",
          afterPhoto:
            snapshot.afterPhoto ||
            snapshot.afterPhotoUrl ||
            snapshot.afterImage ||
            "",
          isMilestone:
            workType(record) === "Project" ||
            Boolean(snapshot.milestone) ||
            Boolean(record.milestone),
          record,
        });
      });

      const history = Array.isArray(record.completionHistory)
        ? record.completionHistory
        : [];

      history.forEach((date: string, index: number) => {
        const completionDay = String(date || "").slice(0, 10);
        if (completionDay && recordedCompletionDays.has(completionDay)) return;
        if (completionDay) recordedCompletionDays.add(completionDay);
        entries.push({
          id: `${record.id}-history-${index}`,
          date,
          type: "Completed Work",
          icon: "✓",
          title: record.title,
          description: `${category(record)} · ${assetName(record.assetId)}`,
          locationId: record.locationId,
          assetId: record.assetId,
          vendorId: record.vendorId,
          isMilestone: workType(record) === "Project",
          record,
        });
      });

      if (
        record.status === "Completed" &&
        !recordedCompletionDays.size
      ) {
        entries.push({
          id: `${record.id}-completed-record`,
          date:
            record.completedAt ||
            record.lastCompletedDate ||
            record.date,
          type: "Completed Work",
          icon: "✓",
          title: record.title,
          description: `${category(record)} · ${assetName(record.assetId)}`,
          locationId: record.locationId,
          assetId: record.assetId,
          vendorId: record.vendorId,
          isMilestone: workType(record) === "Project",
          record,
        });
      }

      const notes = Array.isArray(record.notesHistory)
        ? record.notesHistory
        : Array.isArray(record.workNotes)
          ? record.workNotes
          : [];

      notes.forEach((note: any, index: number) => {
        entries.push({
          id: `${record.id}-note-${note.id || index}`,
          date: note.createdAt || note.date,
          type: "Work Note",
          icon: "N",
          title: record.title,
          description: note.text || note.note || note.body || "Work note added",
          locationId: record.locationId,
          assetId: record.assetId,
          vendorId: record.vendorId,
          record,
        });
      });

      const photos = Array.isArray(record.photos) ? record.photos : [];
      photos.forEach((photo: any, index: number) => {
        if (!photo.createdAt) return;
        entries.push({
          id: `${record.id}-photo-${photo.id || index}`,
          date: photo.createdAt,
          type: "Photo",
          icon: "P",
          title: record.title,
          description: photo.name || "Work photo added",
          photo: photo.dataUrl || photo.url || "",
          locationId: record.locationId,
          assetId: record.assetId,
          vendorId: record.vendorId,
          record,
        });
      });
    });

    requestRecords.forEach((request) => {
      if (request.submittedAt) {
        entries.push({
          id: `request-${request.id}-submitted`,
          date: request.submittedAt,
          type: "Owner Request",
          icon: "R",
          title: request.title || "Owner request",
          description: [
            request.requesterName
              ? `Submitted by ${request.requesterName}`
              : "Owner request submitted",
            request.locationName,
            request.assetName,
          ]
            .filter(Boolean)
            .join(" · "),
          locationId: request.locationId,
          assetId: request.assetId,
          request,
        });
      }

      if (
        request.convertedWorkOrderId ||
        request.status === "Converted to Work Order"
      ) {
        entries.push({
          id: `request-${request.id}-converted`,
          date: request.updatedAt || request.submittedAt,
          type: "Converted Request",
          icon: "↻",
          title: request.title || "Owner request",
          description: "Converted into a tracked work order",
          locationId: request.locationId,
          assetId: request.assetId,
          request,
        });
      } else if (
        ["Closed", "Declined", "Completed"].includes(String(request.status))
      ) {
        entries.push({
          id: `request-${request.id}-history`,
          date: request.updatedAt || request.submittedAt,
          type: "Request History",
          icon: "R",
          title: request.title || "Owner request",
          description: `Request ${String(request.status).toLowerCase()}`,
          locationId: request.locationId,
          assetId: request.assetId,
          request,
        });
      }
    });

    [...todayEvents, ...upcomingEvents].forEach((event) => {
      entries.push({
        id: `calendar-${event.instanceId || event.id}`,
        date: event.date,
        type: "Calendar",
        icon: "C",
        title: event.title,
        description: `${event.time || (event.allDay ? "All day" : "No time")} · ${
          event.categoryLabel || event.area || "Calendar"
        }`,
        locationId:
          event.linkedType === "Location" ? event.linkedId : event.locationId,
        assetId:
          event.linkedType === "Asset" ? event.linkedId : event.assetId,
        vendorId:
          event.linkedType === "Vendor" ? event.linkedId : event.vendorId,
        event,
      });
    });

    customEvents
      .filter((event) => event.propertyId === propertyId)
      .forEach((event) => {
        entries.push({
          id: event.id,
          date: event.date,
          type: event.type,
          icon: "★",
          title: event.title,
          description: event.description || "Custom property history event",
          locationId: event.locationId,
          assetId: event.assetId,
          vendorId: event.vendorId,
          beforePhoto: event.beforePhoto,
          afterPhoto: event.afterPhoto,
          isMilestone: true,
          custom: event,
        });
      });

    return entries.filter((entry) => entry.date);
  }, [
    assetName,
    customEvents,
    propertyId,
    requestRecords,
    serviceRecords,
    todayEvents,
    upcomingEvents,
  ]);

  const filterOptions = useMemo(() => {
    const locations = new Map<string, string>();
    const assets = new Map<string, string>();
    const vendors = new Map<string, string>();

    rawTimelineEntries.forEach((entry) => {
      if (entry.locationId) {
        locations.set(entry.locationId, locationName(entry.locationId));
      }
      if (entry.assetId) {
        assets.set(entry.assetId, assetName(entry.assetId));
      }
      if (entry.vendorId) {
        vendors.set(entry.vendorId, vendorName(entry.vendorId));
      }
    });

    return {
      locations: [...locations.entries()].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
      assets: [...assets.entries()].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
      vendors: [...vendors.entries()].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    };
  }, [assetName, locationName, rawTimelineEntries, vendorName]);

  const timelineEntries = useMemo(() => {
    const search = timelineSearch.trim().toLowerCase();

    return rawTimelineEntries
      .filter((entry) => timelineType === "All" || entry.type === timelineType)
      .filter(
        (entry) =>
          timelineLocation === "All" ||
          entry.locationId === timelineLocation,
      )
      .filter(
        (entry) => timelineAsset === "All" || entry.assetId === timelineAsset,
      )
      .filter(
        (entry) =>
          timelineVendor === "All" || entry.vendorId === timelineVendor,
      )
      .filter((entry) => {
        if (!search) return true;
        return [
          entry.title,
          entry.description,
          entry.type,
          entry.locationId ? locationName(entry.locationId) : "",
          entry.assetId ? assetName(entry.assetId) : "",
          entry.vendorId ? vendorName(entry.vendorId) : "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));
  }, [
    assetName,
    locationName,
    rawTimelineEntries,
    timelineAsset,
    timelineLocation,
    timelineSearch,
    timelineType,
    timelineVendor,
    vendorName,
  ]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<string, TimelineEntry[]>();
    timelineEntries.forEach((entry) => {
      const label = groupLabel(entry, zoom);
      const current = groups.get(label) || [];
      current.push(entry);
      groups.set(label, current);
    });
    return [...groups.entries()];
  }, [timelineEntries, zoom]);

  const selectedEntry =
    timelineEntries.find((entry) => entry.id === selectedEntryId) ||
    timelineEntries[timelineEntries.length - 1];

  const activeGroupIndex = groupedTimeline.length
    ? Math.max(0, Math.min(groupedTimeline.length - 1, Math.round(carouselPosition)))
    : 0;
  const activeGroup = groupedTimeline[activeGroupIndex];
  const activeGroupLabel = activeGroup?.[0] || "";
  const activeGroupEntries = activeGroup?.[1] || [];

  useEffect(() => {
    if (!groupedTimeline.length) {
      setCarouselPosition(0);
      return;
    }

    const targetIndex = groupedTimeline.length - 1;
    setCarouselPosition(targetIndex);

    const frame = window.requestAnimationFrame(() => {
      const container = horizontalRef.current;
      const target = container?.querySelector<HTMLElement>(
        `[data-timeline-group-index="${targetIndex}"]`,
      );
      target?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [zoom, groupedTimeline.length]);

  useEffect(() => {
    if (!activeGroupEntries.length) return;
    if (activeGroupEntries.some((entry) => entry.id === selectedEntryId)) return;
    setSelectedEntryId(activeGroupEntries[activeGroupEntries.length - 1].id);
  }, [activeGroupEntries, selectedEntryId]);

  const updateCarouselPosition = () => {
    if (carouselFrameRef.current !== null) {
      window.cancelAnimationFrame(carouselFrameRef.current);
    }

    carouselFrameRef.current = window.requestAnimationFrame(() => {
      const container = horizontalRef.current;
      if (!container) return;

      const center = container.getBoundingClientRect().left + container.clientWidth / 2;
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-timeline-group-index]"),
      );

      if (!cards.length) return;

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - center);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const current = cards[nearestIndex];
      const previous = cards[Math.max(0, nearestIndex - 1)];
      const next = cards[Math.min(cards.length - 1, nearestIndex + 1)];
      const currentCenter = current.getBoundingClientRect().left + current.offsetWidth / 2;
      const direction = currentCenter < center ? 1 : -1;
      const neighbor = direction > 0 ? next : previous;
      const neighborCenter =
        neighbor.getBoundingClientRect().left + neighbor.offsetWidth / 2;
      const span = Math.max(1, Math.abs(neighborCenter - currentCenter));
      const fraction = Math.max(-0.49, Math.min(0.49, (center - currentCenter) / span));

      setCarouselPosition(nearestIndex + fraction);
    });
  };

  const scrollCarousel = (direction: -1 | 1) => {
    const container = horizontalRef.current;
    if (!container || !groupedTimeline.length) return;

    const targetIndex = Math.max(
      0,
      Math.min(groupedTimeline.length - 1, activeGroupIndex + direction),
    );
    const target = container.querySelector<HTMLElement>(
      `[data-timeline-group-index="${targetIndex}"]`,
    );
    target?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const pageGrid: React.CSSProperties = {
    display: "grid",
    gap: 16,
  };

  const statGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  };

  const card: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    background: "#FFFFFF",
    padding: 14,
    display: "grid",
    gap: 8,
    color: colors.text,
  };

  const clickableCard: React.CSSProperties = {
    ...card,
    textAlign: "left",
    cursor: "pointer",
  };

  const toolbar: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  };

  const inputStyle: React.CSSProperties = {
    minHeight: 42,
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: "#FFFFFF",
    color: colors.text,
    padding: "9px 11px",
    font: "inherit",
  };

  const openWork = (record: any) => {
    setSelectedServiceId(record.id);
    setScreen("history");
  };

  const openEntry = (entry: TimelineEntry) => {
    setSelectedEntryId(entry.id);
    if (entry.record) {
      openWork(entry.record);
      return;
    }
    if (entry.event) {
      openCalendarItem(entry.event);
      setScreen("calendar");
      return;
    }
    if (entry.request) {
      setSelectedRequestId(entry.request.id);
      setScreen("requests");
    }
  };

  const saveCustomEvent = () => {
    if (!draft.date || !draft.title.trim()) return;
    const next: CustomTimelineEvent = {
      id: uid("timeline-event"),
      propertyId,
      date: draft.date,
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: draft.type,
      locationId: draft.locationId,
      assetId: draft.assetId,
      vendorId: draft.vendorId,
      beforePhoto: draft.beforePhoto,
      afterPhoto: draft.afterPhoto,
      createdAt: new Date().toISOString(),
    };
    const all = [...customEvents, next];
    setCustomEvents(all);
    writeCustomEvents(all);
    setSelectedEntryId(next.id);
    setShowAddEvent(false);
    setDraft({
      date: new Date().toISOString().slice(0, 10),
      title: "",
      description: "",
      type: "Milestone",
      locationId: "",
      assetId: "",
      vendorId: "",
      beforePhoto: "",
      afterPhoto: "",
    });
  };

  const deleteCustomEvent = (id: string) => {
    const all = customEvents.filter((event) => event.id !== id);
    setCustomEvents(all);
    writeCustomEvents(all);
    if (selectedEntryId === id) setSelectedEntryId("");
  };

  if (mode === "insights") {
    return (
      <div style={pageGrid}>
        <section style={sectionStyle}>
          <div style={toolbar}>
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <div
                style={{
                  color: colors.gold,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Atlas Intelligence
              </div>
              <h2 style={{ margin: "5px 0 4px", color: colors.text }}>
                Property Insights
              </h2>
              <p style={mutedSmallStyle}>
                Property health, critical work, vendor visits, weather impacts,
                and recommended next actions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScreen("dashboard")}
              style={secondaryButtonStyle}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setScreen("history")}
              style={goldButtonStyle}
            >
              Plan My Day
            </button>
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={statGrid}>
            {[
              ["Property Health", insightData.health, "H"],
              ["Overdue", insightData.overdue.length, "!"],
              ["Due Today", insightData.dueToday.length, "T"],
              ["In Progress", insightData.inProgress.length, "P"],
              ["Due This Week", insightData.dueThisWeek.length, "7"],
              ["Recurring", insightData.recurring.length, "R"],
              ["Projects", insightData.projects.length, "J"],
              ["High Priority", insightData.highPriority.length, "!"],
            ].map(([label, value, icon]) => (
              <button
                key={String(label)}
                type="button"
                onClick={() =>
                  label === "Property Health"
                    ? undefined
                    : setScreen("history")
                }
                style={clickableCard}
              >
                <span style={{ fontSize: 18, fontWeight: 900 }}>{icon}</span>
                <strong style={{ fontSize: 28 }}>{value}</strong>
                <span style={{ fontWeight: 800 }}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Recommended Next</h3>
            <div style={{ display: "grid", gap: 9 }}>
              {insightData.recommended.length ? (
                insightData.recommended.map((item: any, index: number) => (
                  <button
                    key={`${item.record.id}-${index}`}
                    type="button"
                    onClick={() => openWork(item.record)}
                    style={{
                      ...clickableCard,
                      gridTemplateColumns: "34px minmax(0, 1fr)",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: colors.panel,
                        border: `1px solid ${colors.line}`,
                        fontWeight: 900,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <span style={{ ...mutedSmallStyle, display: "block" }}>
                        {item.detail}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div style={noticeStyle}>No urgent recommendations.</div>
              )}
            </div>
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Weather Planning</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {insightData.alerts.length ? (
                insightData.alerts.map((alert, index) => (
                  <div key={`${alert}-${index}`} style={card}>
                    <strong>{index === 0 ? "Today" : "Next Window"}</strong>
                    <span style={mutedSmallStyle}>{alert}</span>
                  </div>
                ))
              ) : (
                <div style={noticeStyle}>No weather alerts available.</div>
              )}
            </div>
          </section>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Critical Items</h3>
            <div style={{ display: "grid", gap: 9 }}>
              {[...insightData.overdue, ...insightData.highPriority]
                .filter(
                  (record, index, records) =>
                    records.findIndex((item) => item.id === record.id) === index,
                )
                .slice(0, 12)
                .map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => openWork(record)}
                    style={{
                      ...clickableCard,
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <strong>{record.title}</strong>
                      <span style={{ ...mutedSmallStyle, display: "block" }}>
                        {category(record)} · {formatDate(record.date)}
                      </span>
                    </span>
                    <span style={badgeStyle(record.priority || record.status)}>
                      {record.priority || record.status}
                    </span>
                  </button>
                ))}
              {!insightData.overdue.length &&
              !insightData.highPriority.length ? (
                <div style={noticeStyle}>No critical work detected.</div>
              ) : null}
            </div>
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Vendor Visits</h3>
            <div style={{ display: "grid", gap: 9 }}>
              {insightData.vendorEvents.length ? (
                insightData.vendorEvents.map((event) => (
                  <button
                    key={event.instanceId || event.id}
                    type="button"
                    onClick={() => {
                      openCalendarItem(event);
                      setScreen("calendar");
                    }}
                    style={{
                      ...clickableCard,
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <strong>{event.title}</strong>
                      <span style={{ ...mutedSmallStyle, display: "block" }}>
                        {formatDate(event.date)} · {event.time || "No time"}
                      </span>
                    </span>
                    <span style={badgeStyle("Scheduled")}>Scheduled</span>
                  </button>
                ))
              ) : (
                <div style={noticeStyle}>No vendor visits detected.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div style={pageGrid}>
      <section
        style={{
          ...sectionStyle,
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(8,37,58,1) 0%, rgba(16,63,91,1) 100%)",
          color: "#FFFFFF",
          borderColor: "rgba(255,255,255,0.14)",
        }}
      >
        <div style={toolbar}>
          <div style={{ minWidth: 0, flex: "1 1 360px" }}>
            <div
              style={{
                color: colors.gold,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Signature Property History
            </div>
            <h2 style={{ margin: "5px 0 4px", color: "#FFFFFF" }}>
              {propertyId === "2000" ? "2000" : propertyId} Property Timeline
            </h2>
            <p style={{ ...mutedSmallStyle, color: "rgba(255,255,255,0.72)" }}>
              Explore completed work, milestones, photos, requests, and estate
              events across days, months, years, or decades.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScreen("dashboard")}
            style={{
              ...secondaryButtonStyle,
              background: "#FFFFFF",
              color: colors.text,
            }}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setShowAddEvent(true)}
            style={goldButtonStyle}
          >
            + Add Historical Event
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginTop: 18,
          }}
        >
          {[
            ["Timeline Records", timelineEntries.length],
            ["Milestones", timelineEntries.filter((e) => e.isMilestone).length],
            ["Photos", timelineEntries.filter((e) => e.photo || e.beforePhoto || e.afterPhoto).length],
            ["Years Covered", new Set(timelineEntries.map((e) => yearLabel(e.date))).size],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                padding: 12,
              }}
            >
              <strong style={{ display: "block", fontSize: 24 }}>{value}</strong>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={toolbar}>
          <input
            value={timelineSearch}
            onChange={(event) => setTimelineSearch(event.target.value)}
            placeholder="Search property history..."
            style={{ ...inputStyle, flex: "1 1 260px" }}
          />
          <select
            value={timelineType}
            onChange={(event) => setTimelineType(event.target.value)}
            style={inputStyle}
          >
            <option>All</option>
            <option>Completed Work</option>
            <option>Work Note</option>
            <option>Photo</option>
            <option>Calendar</option>
            <option>Owner Request</option>
            <option>Converted Request</option>
            <option>Request History</option>
            <option>Milestone</option>
            <option>Renovation</option>
            <option>Landscape</option>
            <option>Installation</option>
            <option>Estate Event</option>
          </select>
          <select
            value={timelineLocation}
            onChange={(event) => setTimelineLocation(event.target.value)}
            style={inputStyle}
          >
            <option value="All">All locations</option>
            {filterOptions.locations.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={timelineAsset}
            onChange={(event) => setTimelineAsset(event.target.value)}
            style={inputStyle}
          >
            <option value="All">All assets</option>
            {filterOptions.assets.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={timelineVendor}
            onChange={(event) => setTimelineVendor(event.target.value)}
            style={inputStyle}
          >
            <option value="All">All vendors</option>
            {filterOptions.vendors.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setTimelineSearch("");
              setTimelineType("All");
              setTimelineLocation("All");
              setTimelineAsset("All");
              setTimelineVendor("All");
            }}
            style={secondaryButtonStyle}
          >
            Clear
          </button>
        </div>
      </section>

      <section
        style={{
          ...sectionStyle,
          padding: 0,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, #071B2B 0%, #09283D 58%, #061725 100%)",
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            padding: "16px 18px 8px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["Days", "Months", "Years", "Decades"] as TimelineZoom[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setZoom(value)}
                  style={{
                    ...(value === zoom
                      ? goldButtonStyle
                      : secondaryButtonStyle),
                    minHeight: 36,
                    borderColor:
                      value === zoom
                        ? colors.gold
                        : "rgba(255,255,255,0.18)",
                    background:
                      value === zoom
                        ? colors.gold
                        : "rgba(255,255,255,0.04)",
                    color: value === zoom ? colors.text : "#FFFFFF",
                  }}
                >
                  {value}
                </button>
              ),
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "rgba(255,255,255,0.72)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <span>Drag, swipe, or scroll to explore</span>
            <button
              type="button"
              aria-label="Previous timeline period"
              onClick={() => scrollCarousel(-1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next timeline period"
              onClick={() => scrollCarousel(1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 20,
              }}
            >
              ›
            </button>
          </div>
        </div>

        {groupedTimeline.length ? (
          <>
            <div
              ref={horizontalRef}
              onScroll={updateCarouselPosition}
              onWheel={(event) => {
                if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
                event.preventDefault();
                horizontalRef.current?.scrollBy({
                  left: event.deltaY,
                  behavior: "auto",
                });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                overflowX: "auto",
                overflowY: "hidden",
                scrollSnapType: "x mandatory",
                scrollBehavior: "smooth",
                perspective: 1400,
                padding: "24px max(42%, 260px) 34px",
                minHeight: 430,
                scrollbarWidth: "none",
                touchAction: "pan-x",
              }}
            >
              {groupedTimeline.map(([label, entries], index) => {
                const distance = Math.abs(index - carouselPosition);
                const focus = Math.max(0, 1 - Math.min(distance, 3) / 3);
                const scale = 0.56 + focus * 0.44;
                const cardWidth = 92 + focus * 250;
                const opacity = 0.34 + focus * 0.66;
                const translateY = (1 - focus) * 42;
                const rotateY =
                  index < carouselPosition
                    ? 12 * (1 - focus)
                    : index > carouselPosition
                      ? -12 * (1 - focus)
                      : 0;
                const hero =
                  entries
                    .map(
                      (entry) =>
                        entry.afterPhoto ||
                        entry.photo ||
                        entry.beforePhoto ||
                        "",
                    )
                    .find(Boolean) || "";
                const featured =
                  entries.find((entry) => entry.isMilestone) ||
                  entries[entries.length - 1];

                return (
                  <button
                    key={label}
                    data-timeline-group-index={index}
                    type="button"
                    onClick={() => {
                      const target = horizontalRef.current?.querySelector<HTMLElement>(
                        `[data-timeline-group-index="${index}"]`,
                      );
                      target?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "center",
                      });
                      if (featured) setSelectedEntryId(featured.id);
                    }}
                    style={{
                      flex: `0 0 ${cardWidth}px`,
                      width: cardWidth,
                      height: 310 + focus * 76,
                      scrollSnapAlign: "center",
                      transform: `translateY(${translateY}px) rotateY(${rotateY}deg) scale(${scale})`,
                      transformOrigin: "center bottom",
                      transition:
                        "width 180ms ease, flex-basis 180ms ease, transform 180ms ease, opacity 180ms ease, filter 180ms ease",
                      opacity,
                      filter:
                        focus > 0.72
                          ? "brightness(1)"
                          : `brightness(${0.58 + focus * 0.42})`,
                      border:
                        focus > 0.72
                          ? `2px solid ${colors.gold}`
                          : "1px solid rgba(255,255,255,0.22)",
                      borderRadius: 18,
                      background:
                        focus > 0.72
                          ? "#FFFFFF"
                          : "linear-gradient(180deg, #17364E 0%, #0A2133 100%)",
                      color: focus > 0.72 ? colors.text : "#FFFFFF",
                      overflow: "hidden",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      boxShadow:
                        focus > 0.72
                          ? "0 24px 55px rgba(0,0,0,0.40)"
                          : "0 12px 24px rgba(0,0,0,0.20)",
                    }}
                  >
                    <div
                      style={{
                        padding: focus > 0.72 ? "18px 18px 12px" : "14px 12px 9px",
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: focus > 0.72 ? 30 : 20,
                          lineHeight: 1,
                          whiteSpace: "normal",
                        }}
                      >
                        {label}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: 5,
                          fontSize: 12,
                          opacity: 0.7,
                        }}
                      >
                        {entries.length} {entries.length === 1 ? "event" : "events"}
                      </span>
                    </div>

                    {hero ? (
                      <img
                        src={hero}
                        alt=""
                        style={{
                          width: "100%",
                          height: focus > 0.72 ? 154 : 126,
                          objectFit: "cover",
                          display: "block",
                          borderTop:
                            focus > 0.72
                              ? `1px solid ${colors.line}`
                              : "1px solid rgba(255,255,255,0.12)",
                          borderBottom:
                            focus > 0.72
                              ? `1px solid ${colors.line}`
                              : "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: focus > 0.72 ? 154 : 126,
                          background:
                            "radial-gradient(circle at 30% 20%, rgba(201,154,61,0.28), transparent 45%), linear-gradient(135deg, #244B65, #0B2335)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: focus > 0.72 ? 38 : 24,
                          fontWeight: 900,
                          color: "rgba(255,255,255,0.72)",
                        }}
                      >
                        {entries.length}
                      </div>
                    )}

                    <div
                      style={{
                        padding: focus > 0.72 ? 14 : 11,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {featured?.isMilestone ? (
                        <span
                          style={{
                            color: colors.gold,
                            fontSize: 11,
                            fontWeight: 900,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          ★ Milestone
                        </span>
                      ) : null}
                      <strong
                        style={{
                          fontSize: focus > 0.72 ? 16 : 13,
                          display: "-webkit-box",
                          WebkitLineClamp: focus > 0.72 ? 2 : 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {featured?.title || "Property history"}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          lineHeight: 1.4,
                          opacity: 0.7,
                          display: "-webkit-box",
                          WebkitLineClamp: focus > 0.72 ? 3 : 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {featured?.description || "Timeline records"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                position: "relative",
                height: 44,
                margin: "0 18px 8px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 12,
                  borderTop: `1px dashed ${colors.gold}`,
                  opacity: 0.72,
                }}
              />
              {groupedTimeline.map(([label], index) => {
                const denominator = Math.max(1, groupedTimeline.length - 1);
                const left = (index / denominator) * 100;
                const isActive = index === activeGroupIndex;
                return (
                  <button
                    key={`rail-${label}`}
                    type="button"
                    onClick={() => {
                      const target = horizontalRef.current?.querySelector<HTMLElement>(
                        `[data-timeline-group-index="${index}"]`,
                      );
                      target?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                        inline: "center",
                      });
                    }}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      top: isActive ? 3 : 7,
                      transform: "translateX(-50%)",
                      width: isActive ? 20 : 10,
                      height: isActive ? 20 : 10,
                      borderRadius: 999,
                      border: `2px solid ${colors.gold}`,
                      background: isActive ? colors.gold : "#09283D",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    aria-label={`Open ${label}`}
                  />
                );
              })}
              <div
                style={{
                  position: "absolute",
                  inset: "28px 0 auto",
                  textAlign: "center",
                  color: colors.gold,
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {activeGroupLabel}
              </div>
            </div>

            <div
              style={{
                margin: "0 12px 12px",
                background: "#FFFFFF",
                borderRadius: 16,
                border: `1px solid ${colors.line}`,
                padding: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
                color: colors.text,
              }}
            >
              <div style={card}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: colors.muted,
                  }}
                >
                  Events in {activeGroupLabel}
                </div>
                <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                  {activeGroupEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedEntryId(entry.id)}
                      style={{
                        ...clickableCard,
                        padding: 10,
                        gridTemplateColumns: "30px minmax(0, 1fr)",
                        alignItems: "center",
                        borderColor:
                          selectedEntry?.id === entry.id
                            ? colors.gold
                            : colors.line,
                        background:
                          selectedEntry?.id === entry.id
                            ? "#FFF8E7"
                            : "#FFFFFF",
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          display: "grid",
                          placeItems: "center",
                          background: entry.isMilestone
                            ? "#FFF4D6"
                            : colors.panel,
                          border: `1px solid ${
                            entry.isMilestone ? colors.gold : colors.line
                          }`,
                          fontWeight: 900,
                        }}
                      >
                        {entry.icon}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.title}
                        </strong>
                        <span style={{ ...mutedSmallStyle, display: "block" }}>
                          {dateLabel(entry.date)} · {entry.type}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedEntry ? (
                <div style={card}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: colors.gold,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        {selectedEntry.isMilestone
                          ? "Property Milestone"
                          : selectedEntry.type}
                      </div>
                      <h3 style={{ margin: "5px 0 4px" }}>
                        {selectedEntry.title}
                      </h3>
                    </div>
                    <span style={mutedSmallStyle}>
                      {dateLabel(selectedEntry.date)}
                    </span>
                  </div>

                  <p style={{ margin: 0, lineHeight: 1.6 }}>
                    {selectedEntry.description}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      fontSize: 12,
                      color: colors.muted,
                    }}
                  >
                    {selectedEntry.locationId ? (
                      <span>Location: {locationName(selectedEntry.locationId)}</span>
                    ) : null}
                    {selectedEntry.assetId ? (
                      <span>Asset: {assetName(selectedEntry.assetId)}</span>
                    ) : null}
                    {selectedEntry.vendorId ? (
                      <span>Vendor: {vendorName(selectedEntry.vendorId)}</span>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {selectedEntry.record ||
                    selectedEntry.event ||
                    selectedEntry.request ? (
                      <button
                        type="button"
                        onClick={() => openEntry(selectedEntry)}
                        style={goldButtonStyle}
                      >
                        Open Linked Record
                      </button>
                    ) : null}
                    {selectedEntry.custom ? (
                      <button
                        type="button"
                        onClick={() =>
                          deleteCustomEvent(selectedEntry.custom!.id)
                        }
                        style={secondaryButtonStyle}
                      >
                        Delete Historical Event
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div style={noticeStyle}>Select an event to view its details.</div>
              )}

              <div style={card}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: colors.muted,
                  }}
                >
                  Before / After
                </div>

                {selectedEntry?.beforePhoto || selectedEntry?.afterPhoto ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        selectedEntry.beforePhoto && selectedEntry.afterPhoto
                          ? "1fr 1fr"
                          : "1fr",
                      gap: 10,
                    }}
                  >
                    {selectedEntry.beforePhoto ? (
                      <figure style={{ margin: 0 }}>
                        <img
                          src={selectedEntry.beforePhoto}
                          alt="Before"
                          style={{
                            width: "100%",
                            height: 190,
                            objectFit: "cover",
                            borderRadius: 10,
                            border: `1px solid ${colors.line}`,
                          }}
                        />
                        <figcaption style={{ ...mutedSmallStyle, marginTop: 5 }}>
                          Before
                        </figcaption>
                      </figure>
                    ) : null}
                    {selectedEntry.afterPhoto ? (
                      <figure style={{ margin: 0 }}>
                        <img
                          src={selectedEntry.afterPhoto}
                          alt="After"
                          style={{
                            width: "100%",
                            height: 190,
                            objectFit: "cover",
                            borderRadius: 10,
                            border: `1px solid ${colors.line}`,
                          }}
                        />
                        <figcaption style={{ ...mutedSmallStyle, marginTop: 5 }}>
                          After
                        </figcaption>
                      </figure>
                    ) : null}
                  </div>
                ) : selectedEntry?.photo ? (
                  <img
                    src={selectedEntry.photo}
                    alt=""
                    style={{
                      width: "100%",
                      height: 220,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: `1px solid ${colors.line}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      ...noticeStyle,
                      minHeight: 180,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                    }}
                  >
                    No visual media is attached to this timeline event.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ ...noticeStyle, margin: 18 }}>
            No timeline records match the selected filters.
          </div>
        )}
      </section>

      {showAddEvent ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(3,18,30,0.68)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              maxHeight: "92vh",
              overflowY: "auto",
              borderRadius: 18,
              background: "#FFFFFF",
              border: `1px solid ${colors.line}`,
              padding: 18,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={toolbar}>
              <div style={{ flex: "1 1 300px" }}>
                <div
                  style={{
                    color: colors.gold,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Property History
                </div>
                <h3 style={{ margin: "4px 0 0" }}>Add Historical Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEvent(false)}
                style={secondaryButtonStyle}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <strong>Date</strong>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <strong>Event type</strong>
                <select
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as CustomTimelineEvent["type"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option>Milestone</option>
                  <option>Renovation</option>
                  <option>Landscape</option>
                  <option>Installation</option>
                  <option>Estate Event</option>
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <strong>Title</strong>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Example: Waterside exterior restoration completed"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <strong>Description</strong>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Record what changed, why it mattered, and any historical context."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <strong>Location</strong>
                <select
                  value={draft.locationId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      locationId: event.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="">No location</option>
                  {filterOptions.locations.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <strong>Asset</strong>
                <select
                  value={draft.assetId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      assetId: event.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="">No asset</option>
                  {filterOptions.assets.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <strong>Vendor</strong>
                <select
                  value={draft.vendorId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      vendorId: event.target.value,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="">No vendor</option>
                  {filterOptions.vendors.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <strong>Before photo</strong>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const beforePhoto = await fileToDataUrl(file);
                    setDraft((current) => ({ ...current, beforePhoto }));
                  }}
                  style={inputStyle}
                />
                {draft.beforePhoto ? (
                  <img
                    src={draft.beforePhoto}
                    alt="Before preview"
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: `1px solid ${colors.line}`,
                    }}
                  />
                ) : null}
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <strong>After photo</strong>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const afterPhoto = await fileToDataUrl(file);
                    setDraft((current) => ({ ...current, afterPhoto }));
                  }}
                  style={inputStyle}
                />
                {draft.afterPhoto ? (
                  <img
                    src={draft.afterPhoto}
                    alt="After preview"
                    style={{
                      width: "100%",
                      height: 160,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: `1px solid ${colors.line}`,
                    }}
                  />
                ) : null}
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddEvent(false)}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustomEvent}
                disabled={!draft.date || !draft.title.trim()}
                style={{
                  ...goldButtonStyle,
                  opacity: !draft.date || !draft.title.trim() ? 0.55 : 1,
                }}
              >
                Save Historical Event
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
