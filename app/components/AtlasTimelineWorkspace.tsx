"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ZoomLevel = "Days" | "Months" | "Years" | "Decades";

type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
  category: string;
  locationId?: string;
  assetId?: string;
  vendorId?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  photo?: string;
  milestone?: boolean;
  source: "work" | "project" | "photo" | "calendar" | "request" | "custom";
  record?: any;
};

type CustomEvent = {
  id: string;
  propertyId: string;
  date: string;
  datePrecision: "Exact" | "Approximate";
  title: string;
  description: string;
  type: string;
  locationId: string;
  assetId: string;
  vendorId: string;
  beforePhoto: string;
  afterPhoto: string;
  milestone: boolean;
  createdAt: string;
};

const CUSTOM_KEY = "atlas-property-timeline-events-v2";

function safeDate(value?: string) {
  if (!value) return "";
  const text = String(value);
  return text.includes("T") ? text.slice(0, 10) : text.slice(0, 10);
}

function dateTime(value?: string) {
  const date = safeDate(value);
  if (!date) return 0;
  const time = new Date(`${date}T12:00:00`).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatTimelineDate(value?: string) {
  const date = safeDate(value);
  if (!date) return "No date";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function periodLabel(value: string, zoom: ZoomLevel) {
  const date = safeDate(value);
  if (!date) return "Undated";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Undated";

  if (zoom === "Days") {
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (zoom === "Months") {
    return parsed.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }
  if (zoom === "Years") return String(parsed.getFullYear());
  const year = parsed.getFullYear();
  return `${Math.floor(year / 10) * 10}s`;
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readCustomEvents(): CustomEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomEvents(events: CustomEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(events));
  } catch {}
}

function photoSource(photo: any) {
  return String(
    photo?.url ||
      photo?.dataUrl ||
      photo?.src ||
      photo?.source ||
      photo?.file?.url ||
      photo?.file?.dataUrl ||
      "",
  );
}

function entryTone(entry: TimelineEntry) {
  if (entry.milestone) return "#C99A3D";
  if (entry.source === "project") return "#285C8E";
  if (entry.source === "photo") return "#6B4FA3";
  if (entry.source === "calendar") return "#3F7B63";
  if (entry.source === "request") return "#A45A2A";
  return "#547086";
}

export default function AtlasTimelineWorkspace(props: any) {
  const {
    activePropertyId = "2000",
    isMobile = false,
    colors = {
      navy: "#0A2841",
      gold: "#C99A3D",
      line: "#D9E2EA",
      panel: "#F5F8FB",
      card: "#FFFFFF",
      text: "#1B2A36",
      muted: "#6B7C8C",
      red: "#B42318",
      green: "#087443",
    },
    goldButtonStyle = {},
    secondaryButtonStyle = {},
    mutedSmallStyle = {},
    noticeStyle = {},
    assetRecords = [],
    locations = [],
    vendorRecords = [],
    serviceRecords = [],
    requestRecords = [],
    calendarItems = [],
    todayEvents = [],
    upcomingEvents = [],
    photos = [],
    photoTimelineProjects = [],
    projectTimelineEntries = [],
    photoTimelineMeta = {},
    setScreen = () => undefined,
    setSelectedServiceId = () => undefined,
    setSelectedRequestId = () => undefined,
    setSelectedAssetId = () => undefined,
    setSelectedVendorId = () => undefined,
    setSelectedLocationId = () => undefined,
    setSelectedPhotoProjectId = () => undefined,
    setPhotoTimelineView = () => undefined,
    openCalendarItem = () => undefined,
  } = props;

  const [zoom, setZoom] = useState<ZoomLevel>("Months");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  const [vendorFilter, setVendorFilter] = useState("All");
  const [milestonesOnly, setMilestonesOnly] = useState(false);
  const [beforeAfterOnly, setBeforeAfterOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showOnThisDay, setShowOnThisDay] = useState(true);
  const [areaProgressMode, setAreaProgressMode] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [milestoneStripOpen, setMilestoneStripOpen] = useState(true);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    datePrecision: "Exact" as "Exact" | "Approximate",
    title: "",
    description: "",
    type: "Estate Event",
    locationId: "",
    assetId: "",
    vendorId: "",
    beforePhoto: "",
    afterPhoto: "",
    milestone: true,
  });
  const horizontalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCustomEvents(readCustomEvents());
  }, []);

  const assetName = (id?: string) =>
    assetRecords.find((asset: any) => asset.id === id)?.name || "";
  const locationName = (id?: string) =>
    locations.find((location: any) => location.id === id)?.name || "";
  const vendorName = (id?: string) =>
    vendorRecords.find((vendor: any) => vendor.id === id)?.name || "";

  const entries = useMemo(() => {
    const next: TimelineEntry[] = [];

    serviceRecords.forEach((record: any) => {
      const history = Array.isArray(record.serviceHistory)
        ? record.serviceHistory
        : Array.isArray(record.completionSnapshots)
          ? record.completionSnapshots
          : [];

      history.forEach((snapshot: any, index: number) => {
        const date =
          snapshot.completedAt ||
          snapshot.completedDate ||
          snapshot.date ||
          record.lastCompletedDate ||
          record.date;
        if (!date) return;
        next.push({
          id: `work-history-${record.id}-${snapshot.id || index}`,
          date: safeDate(date),
          title: snapshot.title || record.title || "Completed work",
          description:
            snapshot.notes ||
            record.notes ||
            [assetName(snapshot.assetId || record.assetId), locationName(snapshot.locationId || record.locationId)]
              .filter(Boolean)
              .join(" · "),
          type: record.workType || "Completed Work",
          category: record.workCategory || record.category || "Maintenance",
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
          milestone:
            Boolean(snapshot.milestone) ||
            Boolean(record.milestone) ||
            record.workType === "Project",
          source: "work",
          record,
        });
      });

      if (!history.length && record.status === "Completed") {
        const date = record.lastCompletedDate || record.completedAt || record.date;
        if (date) {
          next.push({
            id: `work-${record.id}`,
            date: safeDate(date),
            title: record.title || "Completed work",
            description:
              record.notes ||
              [assetName(record.assetId), locationName(record.locationId)]
                .filter(Boolean)
                .join(" · "),
            type: record.workType || "Completed Work",
            category: record.workCategory || record.category || "Maintenance",
            locationId: record.locationId,
            assetId: record.assetId,
            vendorId: record.vendorId,
            milestone: Boolean(record.milestone) || record.workType === "Project",
            source: "work",
            record,
          });
        }
      }
    });

    photoTimelineProjects.forEach((project: any) => {
      const date =
        project.completedAt ||
        project.startDate ||
        project.date ||
        project.createdAt;
      if (!date) return;
      next.push({
        id: `project-${project.id}`,
        date: safeDate(date),
        title: project.title || project.name || "Property project",
        description: project.notes || project.description || "",
        type: "Project",
        category: project.category || "Property Project",
        locationId: project.locationId,
        assetId: project.assetId,
        vendorId: project.vendorId,
        beforePhoto: project.beforePhoto || project.beforePhotoUrl || "",
        afterPhoto: project.afterPhoto || project.afterPhotoUrl || "",
        milestone: true,
        source: "project",
        record: project,
      });
    });

    projectTimelineEntries.forEach((item: any) => {
      const date = item.date || item.createdAt || item.completedAt;
      if (!date) return;
      next.push({
        id: `project-entry-${item.id}`,
        date: safeDate(date),
        title: item.title || item.name || "Project update",
        description: item.notes || item.description || "",
        type: item.type || "Project Update",
        category: item.category || "Project",
        locationId: item.locationId,
        assetId: item.assetId,
        vendorId: item.vendorId,
        beforePhoto: item.beforePhoto || "",
        afterPhoto: item.afterPhoto || "",
        photo: item.photo || item.photoUrl || "",
        milestone: Boolean(item.milestone),
        source: "project",
        record: item,
      });
    });

    photos.forEach((photo: any) => {
      const date = photo.createdAt || photo.dateTaken || photo.date;
      const source = photoSource(photo);
      if (!date || !source) return;
      const meta =
        photoTimelineMeta[`asset-photo-${photo.id}`] ||
        photoTimelineMeta[photo.id] ||
        {};
      next.push({
        id: `photo-${photo.id}`,
        date: safeDate(meta.dateTaken || date),
        title: meta.displayName || photo.name || "Property photo",
        description: meta.notes || "",
        type: "Photo",
        category: meta.tag || "Photo",
        assetId: meta.assetIdOverride ?? photo.assetId,
        vendorId: meta.vendorId || "",
        locationId: meta.locationId || "",
        photo: source,
        milestone: Boolean(meta.milestone),
        source: "photo",
        record: photo,
      });
    });

    const combinedCalendar = [...calendarItems, ...todayEvents, ...upcomingEvents];
    const seenCalendar = new Set<string>();
    combinedCalendar.forEach((event: any) => {
      const id = String(event.id || `${event.title}-${event.date || event.start}`);
      if (seenCalendar.has(id)) return;
      seenCalendar.add(id);
      const date = event.date || event.startDate || event.start;
      if (!date) return;
      next.push({
        id: `calendar-${id}`,
        date: safeDate(date),
        title: event.title || "Calendar event",
        description: event.notes || event.description || "",
        type: event.categoryLabel || event.category || "Calendar",
        category: "Calendar",
        locationId: event.locationId || "",
        assetId: event.assetId || "",
        vendorId: event.vendorId || "",
        milestone: Boolean(event.milestone),
        source: "calendar",
        record: event,
      });
    });

    requestRecords.forEach((request: any) => {
      const date = request.completedAt || request.updatedAt || request.createdAt || request.date;
      if (!date) return;
      next.push({
        id: `request-${request.id}`,
        date: safeDate(date),
        title: request.title || request.summary || "Property request",
        description: request.notes || request.description || "",
        type: "Request",
        category: request.status || "Request",
        locationId: request.locationId || "",
        assetId: request.assetId || "",
        vendorId: request.vendorId || "",
        milestone: false,
        source: "request",
        record: request,
      });
    });

    customEvents
      .filter((event) => event.propertyId === activePropertyId)
      .forEach((event) => {
        next.push({
          id: `custom-${event.id}`,
          date: event.date,
          title: event.title,
          description:
            event.datePrecision === "Approximate"
              ? `Approximate date · ${event.description}`
              : event.description,
          type: event.type,
          category: "Historical",
          locationId: event.locationId,
          assetId: event.assetId,
          vendorId: event.vendorId,
          beforePhoto: event.beforePhoto,
          afterPhoto: event.afterPhoto,
          milestone: event.milestone,
          source: "custom",
          record: event,
        });
      });

    return next
      .filter((entry) => Boolean(entry.date))
      .sort((a, b) => dateTime(b.date) - dateTime(a.date));
  }, [
    activePropertyId,
    serviceRecords,
    photoTimelineProjects,
    projectTimelineEntries,
    photos,
    photoTimelineMeta,
    calendarItems,
    todayEvents,
    upcomingEvents,
    requestRecords,
    customEvents,
    assetRecords,
    locations,
    vendorRecords,
  ]);

  const types = useMemo(
    () => ["All", ...unique(entries.map((entry) => entry.type).filter(Boolean)).sort()],
    [entries],
  );

  const filtered = useMemo(() => {
    const q = normalize(search);
    return entries.filter((entry) => {
      if (typeFilter !== "All" && entry.type !== typeFilter) return false;
      if (locationFilter !== "All" && entry.locationId !== locationFilter) return false;
      if (assetFilter !== "All" && entry.assetId !== assetFilter) return false;
      if (vendorFilter !== "All" && entry.vendorId !== vendorFilter) return false;
      if (milestonesOnly && !entry.milestone) return false;
      if (beforeAfterOnly && !(entry.beforePhoto && entry.afterPhoto)) return false;
      if (!q) return true;
      return normalize(
        [
          entry.title,
          entry.description,
          entry.type,
          entry.category,
          assetName(entry.assetId),
          locationName(entry.locationId),
          vendorName(entry.vendorId),
        ].join(" "),
      ).includes(q);
    });
  }, [
    entries,
    search,
    typeFilter,
    locationFilter,
    assetFilter,
    vendorFilter,
    milestonesOnly,
    beforeAfterOnly,
    assetRecords,
    locations,
    vendorRecords,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    filtered.forEach((entry) => {
      const label = periodLabel(entry.date, zoom);
      map.set(label, [...(map.get(label) || []), entry]);
    });
    return [...map.entries()];
  }, [filtered, zoom]);

  const selectedEntry =
    filtered.find((entry) => entry.id === selectedEntryId) ||
    entries.find((entry) => entry.id === selectedEntryId) ||
    null;

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisDay = today.getDate();
  const onThisDay = entries.filter((entry) => {
    const parsed = new Date(`${safeDate(entry.date)}T12:00:00`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getMonth() === thisMonth &&
      parsed.getDate() === thisDay &&
      parsed.getFullYear() !== today.getFullYear()
    );
  });

  const beforeAfterEntries = entries.filter(
    (entry) => entry.beforePhoto && entry.afterPhoto,
  );
  const milestoneEntries = entries.filter((entry) => entry.milestone);
  const earliest = [...entries].sort((a, b) => dateTime(a.date) - dateTime(b.date))[0];
  const latest = entries[0];


  function scrollTimeline(direction: "previous" | "next") {
    const container = horizontalRef.current;
    if (!container) return;
    const distance = isMobile
      ? Math.max(280, container.clientWidth * 0.86)
      : Math.max(360, container.clientWidth * 0.72);
    container.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  function jumpToEntry(entry: TimelineEntry) {
    setSelectedEntryId(entry.id);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`timeline-entry-${entry.id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
    });
  }

  function saveCustomEvent() {
    if (!draft.date || !draft.title.trim()) return;
    const event: CustomEvent = {
      id: uid("timeline-event"),
      propertyId: activePropertyId,
      date: draft.date,
      datePrecision: draft.datePrecision,
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: draft.type,
      locationId: draft.locationId,
      assetId: draft.assetId,
      vendorId: draft.vendorId,
      beforePhoto: draft.beforePhoto.trim(),
      afterPhoto: draft.afterPhoto.trim(),
      milestone: draft.milestone,
      createdAt: new Date().toISOString(),
    };
    const next = [...customEvents, event];
    setCustomEvents(next);
    writeCustomEvents(next);
    setShowAddEvent(false);
    setSelectedEntryId(`custom-${event.id}`);
    setDraft({
      date: new Date().toISOString().slice(0, 10),
      datePrecision: "Exact",
      title: "",
      description: "",
      type: "Estate Event",
      locationId: "",
      assetId: "",
      vendorId: "",
      beforePhoto: "",
      afterPhoto: "",
      milestone: true,
    });
  }

  function deleteCustomEvent(eventId: string) {
    const next = customEvents.filter((event) => event.id !== eventId);
    setCustomEvents(next);
    writeCustomEvents(next);
    setSelectedEntryId("");
  }

  function openEntry(entry: TimelineEntry) {
    setSelectedEntryId(entry.id);
    setComparisonPosition(50);
    if (entry.source === "work" && entry.record?.id) {
      setSelectedServiceId(entry.record.id);
    }
  }

  function openLinkedRecord(entry: TimelineEntry) {
    if (entry.source === "work" && entry.record?.id) {
      setSelectedServiceId(entry.record.id);
      setScreen("history");
      return;
    }
    if (entry.source === "project" && entry.record?.id) {
      setSelectedPhotoProjectId(entry.record.id);
      setPhotoTimelineView("projects");
      setScreen("timeline");
      return;
    }
    if (entry.source === "request" && entry.record?.id) {
      setSelectedRequestId(entry.record.id);
      setScreen("requests");
      return;
    }
    if (entry.source === "calendar") {
      openCalendarItem(entry.record);
    }
  }

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 14,
    background: "#FFFFFF",
    padding: isMobile ? 11 : 14,
    minWidth: 0,
  };

  const smallButton: React.CSSProperties = {
    ...secondaryButtonStyle,
    minHeight: 34,
    padding: "6px 9px",
    fontSize: 11,
  };

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <section
        style={{
          ...cardStyle,
          background: "linear-gradient(135deg,#FFFFFF 0%,#F4F8FC 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: colors.gold,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              Property History
            </div>
            <h2 style={{ margin: "4px 0 0", color: colors.navy }}>
              Property Timeline
            </h2>
            <p style={{ ...mutedSmallStyle, margin: "5px 0 0" }}>
              A living history of work, projects, photos, changes, and major estate events.
            </p>
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowAddEvent(true)}
              style={goldButtonStyle}
            >
              + Historical Event
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              style={smallButton}
            >
              {showFilters ? "Hide Filters" : "Filters"}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2,minmax(0,1fr))"
              : "repeat(4,minmax(0,1fr))",
            gap: 8,
            marginTop: 13,
          }}
        >
          {[
            ["History Records", entries.length],
            ["Milestones", milestoneEntries.length],
            ["Before / After", beforeAfterEntries.length],
            ["Years Covered", earliest && latest ? Math.max(1, Number(latest.date.slice(0,4)) - Number(earliest.date.slice(0,4)) + 1) : 0],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ ...cardStyle, padding: 10 }}>
              <span style={{ ...mutedSmallStyle, display: "block" }}>{label}</span>
              <strong style={{ display: "block", marginTop: 3, fontSize: 20, color: colors.navy }}>
                {value}
              </strong>
            </div>
          ))}
        </div>
      </section>

      {milestoneEntries.length ? (
        <section
          style={{
            ...cardStyle,
            padding: isMobile ? 9 : 11,
            background: "#FFFDF7",
            borderColor: "#E7D5A6",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ color: colors.navy }}>Milestone Navigator</strong>
              <div style={mutedSmallStyle}>
                Jump directly to major moments in the property’s history.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMilestoneStripOpen((current) => !current)}
              style={smallButton}
            >
              {milestoneStripOpen ? "Hide" : "Show"} Milestones
            </button>
          </div>

          {milestoneStripOpen ? (
            <div
              style={{
                display: "flex",
                gap: 7,
                overflowX: "auto",
                paddingTop: 9,
                paddingBottom: 2,
                scrollSnapType: "x proximity",
              }}
            >
              {milestoneEntries.slice(0, 40).map((entry) => (
                <button
                  key={`milestone-nav-${entry.id}`}
                  type="button"
                  onClick={() => jumpToEntry(entry)}
                  style={{
                    flex: "0 0 auto",
                    minWidth: isMobile ? 190 : 220,
                    maxWidth: 280,
                    textAlign: "left",
                    border: `1px solid ${colors.gold}`,
                    borderRadius: 11,
                    background:
                      selectedEntryId === entry.id ? "#FFF3CF" : "#FFFFFF",
                    padding: "8px 9px",
                    scrollSnapAlign: "start",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color: colors.gold,
                      fontSize: 9,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    {formatTimelineDate(entry.date)}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      color: colors.navy,
                      marginTop: 3,
                      fontSize: 12,
                      lineHeight: 1.3,
                    }}
                  >
                    {entry.title}
                  </strong>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {showOnThisDay && onThisDay.length ? (
        <section style={{ ...cardStyle, borderColor: colors.gold, background: "#FFF9EA" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <strong style={{ color: colors.navy }}>On This Day</strong>
              <div style={mutedSmallStyle}>
                {onThisDay.length} historical event{onThisDay.length === 1 ? "" : "s"} from this date.
              </div>
            </div>
            <button type="button" onClick={() => setShowOnThisDay(false)} style={smallButton}>
              Hide
            </button>
          </div>
          <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
            {onThisDay.slice(0, 4).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openEntry(entry)}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  background: "#FFFFFF",
                  padding: 9,
                  textAlign: "left",
                }}
              >
                <strong style={{ color: colors.navy }}>{entry.title}</strong>
                <div style={mutedSmallStyle}>{formatTimelineDate(entry.date)}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section style={cardStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(220px,1fr) auto auto",
            gap: 8,
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search property history..."
            style={{
              minHeight: 38,
              border: `1px solid ${colors.line}`,
              borderRadius: 10,
              padding: "7px 10px",
              font: "inherit",
              minWidth: 0,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,minmax(0,1fr))",
              gap: 4,
              padding: 4,
              border: `1px solid ${colors.line}`,
              borderRadius: 10,
              background: colors.panel,
            }}
          >
            {(["Days", "Months", "Years", "Decades"] as ZoomLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setZoom(level)}
                style={{
                  ...smallButton,
                  minHeight: 30,
                  padding: "4px 7px",
                  borderColor: zoom === level ? colors.gold : "transparent",
                  background: zoom === level ? "#FFF3CF" : "transparent",
                }}
              >
                {level}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAreaProgressMode((current) => !current)}
            style={{
              ...smallButton,
              borderColor: areaProgressMode ? colors.gold : colors.line,
              background: areaProgressMode ? "#FFF3CF" : "#FFFFFF",
            }}
          >
            {areaProgressMode ? "All History" : "Area Progress"}
          </button>
        </div>

        {showFilters ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4,minmax(0,1fr))",
              gap: 8,
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${colors.line}`,
            }}
          >
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
              {types.map((type) => <option key={type}>{type}</option>)}
            </select>
            <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
              <option value="All">All locations</option>
              {locations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
            <select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
              <option value="All">All assets</option>
              {assetRecords.map((asset: any) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
            <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
              <option value="All">All vendors</option>
              {vendorRecords.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <input type="checkbox" checked={milestonesOnly} onChange={(event) => setMilestonesOnly(event.target.checked)} />
              Milestones only
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <input type="checkbox" checked={beforeAfterOnly} onChange={(event) => setBeforeAfterOnly(event.target.checked)} />
              Before / after only
            </label>
            <button
              type="button"
              onClick={() => {
                setTypeFilter("All");
                setLocationFilter("All");
                setAssetFilter("All");
                setVendorFilter("All");
                setMilestonesOnly(false);
                setBeforeAfterOnly(false);
                setSearch("");
              }}
              style={smallButton}
            >
              Clear Filters
            </button>
          </div>
        ) : null}
      </section>

      {areaProgressMode ? (
        <section style={cardStyle}>
          <strong style={{ color: colors.navy }}>Area Progress</strong>
          <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
            Follow how specific parts of the property have changed over time.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
              gap: 9,
              marginTop: 10,
            }}
          >
            {locations
              .map((location: any) => ({
                location,
                entries: filtered.filter((entry) => entry.locationId === location.id),
              }))
              .filter((group: any) => group.entries.length)
              .sort((a: any, b: any) => b.entries.length - a.entries.length)
              .slice(0, 12)
              .map((group: any) => {
                const newest = group.entries[0];
                const oldest = [...group.entries].sort((a: TimelineEntry, b: TimelineEntry) => dateTime(a.date) - dateTime(b.date))[0];
                return (
                  <button
                    key={group.location.id}
                    type="button"
                    onClick={() => {
                      setLocationFilter(group.location.id);
                      setAreaProgressMode(false);
                    }}
                    style={{
                      ...cardStyle,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ color: colors.navy }}>{group.location.name}</strong>
                    <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
                      {group.entries.length} historical record{group.entries.length === 1 ? "" : "s"}
                    </div>
                    <div style={{ ...mutedSmallStyle, marginTop: 6 }}>
                      {formatTimelineDate(oldest?.date)} → {formatTimelineDate(newest?.date)}
                    </div>
                    {group.entries.find((entry: TimelineEntry) => entry.afterPhoto || entry.photo) ? (
                      <img
                        src={
                          group.entries.find(
                            (entry: TimelineEntry) => entry.afterPhoto || entry.photo,
                          )?.afterPhoto ||
                          group.entries.find(
                            (entry: TimelineEntry) => entry.afterPhoto || entry.photo,
                          )?.photo
                        }
                        alt=""
                        style={{
                          width: "100%",
                          height: 110,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginTop: 8,
                          border: `1px solid ${colors.line}`,
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
          </div>
        </section>
      ) : null}

      <section style={{ ...cardStyle, padding: isMobile ? 8 : 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div>
            <strong style={{ color: colors.navy }}>History Explorer</strong>
            <div style={mutedSmallStyle}>
              Scroll horizontally or use the arrows to move through time.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => scrollTimeline("previous")}
              style={{ ...smallButton, minWidth: 38 }}
              aria-label="Earlier history"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollTimeline("next")}
              style={{ ...smallButton, minWidth: 38 }}
              aria-label="Later history"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={horizontalRef}
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            padding: "4px 2px 12px",
            scrollSnapType: "x proximity",
            scrollbarGutter: "stable",
          }}
        >
          {grouped.map(([label, group]) => (
            <div
              key={label}
              style={{
                flex: isMobile ? "0 0 86vw" : "0 0 340px",
                scrollSnapAlign: "start",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  borderBottom: `3px solid ${colors.gold}`,
                  padding: "6px 4px 8px",
                  marginBottom: 8,
                  background: "#FFFFFF",
                }}
              >
                <strong style={{ color: colors.navy }}>{label}</strong>
                <span style={{ ...mutedSmallStyle, marginLeft: 7 }}>
                  {group.length}
                </span>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {group.map((entry) => (
                  <button
                    id={`timeline-entry-${entry.id}`}
                    key={entry.id}
                    type="button"
                    onClick={() => openEntry(entry)}
                    style={{
                      border: `1px solid ${
                        selectedEntryId === entry.id ? colors.gold : colors.line
                      }`,
                      borderLeft: `4px solid ${entryTone(entry)}`,
                      borderRadius: 12,
                      background:
                        selectedEntryId === entry.id ? "#FFF9EA" : "#FFFFFF",
                      padding: 10,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span
                          style={{
                            display: "block",
                            color: colors.muted,
                            fontSize: 9,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                          }}
                        >
                          {entry.milestone ? "Milestone · " : ""}
                          {entry.type}
                        </span>
                        <strong
                          style={{
                            display: "block",
                            color: colors.navy,
                            marginTop: 3,
                            fontSize: 13,
                            lineHeight: 1.3,
                          }}
                        >
                          {entry.title}
                        </strong>
                      </div>
                      <span style={{ ...mutedSmallStyle, whiteSpace: "nowrap" }}>
                        {formatTimelineDate(entry.date)}
                      </span>
                    </div>

                    {entry.description ? (
                      <div
                        style={{
                          ...mutedSmallStyle,
                          marginTop: 6,
                          lineHeight: 1.35,
                        }}
                      >
                        {entry.description}
                      </div>
                    ) : null}

                    {(entry.photo || entry.beforePhoto || entry.afterPhoto) ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            entry.beforePhoto && entry.afterPhoto
                              ? "1fr 1fr"
                              : "1fr",
                          gap: 5,
                          marginTop: 8,
                        }}
                      >
                        {[entry.beforePhoto, entry.afterPhoto, entry.photo]
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((src, index) => (
                            <img
                              key={`${entry.id}-img-${index}`}
                              src={src}
                              alt=""
                              style={{
                                width: "100%",
                                height: 92,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: `1px solid ${colors.line}`,
                              }}
                            />
                          ))}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        marginTop: 8,
                      }}
                    >
                      {entry.locationId ? (
                        <span style={{ ...mutedSmallStyle, border: `1px solid ${colors.line}`, borderRadius: 999, padding: "2px 6px" }}>
                          {locationName(entry.locationId)}
                        </span>
                      ) : null}
                      {entry.assetId ? (
                        <span style={{ ...mutedSmallStyle, border: `1px solid ${colors.line}`, borderRadius: 999, padding: "2px 6px" }}>
                          {assetName(entry.assetId)}
                        </span>
                      ) : null}
                      {entry.vendorId ? (
                        <span style={{ ...mutedSmallStyle, border: `1px solid ${colors.line}`, borderRadius: 999, padding: "2px 6px" }}>
                          {vendorName(entry.vendorId)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!grouped.length ? (
            <div style={{ ...noticeStyle, minWidth: "100%" }}>
              No timeline records match the current filters.
            </div>
          ) : null}
        </div>
      </section>

      {selectedEntry ? (
        <section style={{ ...cardStyle, borderColor: colors.gold }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ color: colors.gold, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
                {selectedEntry.milestone ? "Milestone · " : ""}
                {selectedEntry.type}
              </div>
              <h3 style={{ margin: "4px 0 0", color: colors.navy }}>
                {selectedEntry.title}
              </h3>
              <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
                {formatTimelineDate(selectedEntry.date)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {selectedEntry.source !== "custom" ? (
                <button type="button" onClick={() => openLinkedRecord(selectedEntry)} style={smallButton}>
                  Open Source
                </button>
              ) : null}
              {selectedEntry.locationId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocationId(selectedEntry.locationId);
                    setScreen("locations");
                  }}
                  style={smallButton}
                >
                  Open Location
                </button>
              ) : null}
              {selectedEntry.assetId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetId(selectedEntry.assetId);
                    setScreen("assets");
                  }}
                  style={smallButton}
                >
                  Open Asset
                </button>
              ) : null}
              {selectedEntry.vendorId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendorId(selectedEntry.vendorId);
                    setScreen("vendors");
                  }}
                  style={smallButton}
                >
                  Open Vendor
                </button>
              ) : null}
            </div>
          </div>

          {selectedEntry.description ? (
            <p style={{ color: colors.text, lineHeight: 1.5, marginBottom: 0 }}>
              {selectedEntry.description}
            </p>
          ) : null}

          {selectedEntry.beforePhoto && selectedEntry.afterPhoto ? (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 7,
                }}
              >
                <div>
                  <strong style={{ color: colors.navy }}>Before / After Compare</strong>
                  <div style={mutedSmallStyle}>
                    Drag the control to compare the same area over time.
                  </div>
                </div>
                <span style={mutedSmallStyle}>
                  {comparisonPosition}% after
                </span>
              </div>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: isMobile ? 250 : 360,
                  overflow: "hidden",
                  borderRadius: 12,
                  border: `1px solid ${colors.line}`,
                  background: "#EEF3F7",
                }}
              >
                <img
                  src={selectedEntry.beforePhoto}
                  alt="Before"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)`,
                  }}
                >
                  <img
                    src={selectedEntry.afterPhoto}
                    alt="After"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${comparisonPosition}%`,
                    width: 2,
                    background: "#FFFFFF",
                    boxShadow: "0 0 0 1px rgba(0,0,0,.18)",
                    pointerEvents: "none",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    background: "rgba(7,27,47,.78)",
                    color: "#FFFFFF",
                    borderRadius: 999,
                    padding: "4px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  Before
                </span>
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 10,
                    background: "rgba(7,27,47,.78)",
                    color: "#FFFFFF",
                    borderRadius: 999,
                    padding: "4px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  After
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={comparisonPosition}
                onChange={(event) => setComparisonPosition(Number(event.target.value))}
                aria-label="Before and after comparison position"
                style={{ width: "100%", marginTop: 8 }}
              />
            </div>
          ) : selectedEntry.photo ? (
            <img
              src={selectedEntry.photo}
              alt=""
              style={{ width: "100%", maxHeight: 420, objectFit: "contain", marginTop: 12, borderRadius: 10 }}
            />
          ) : null}

          {selectedEntry.source === "custom" ? (
            <button
              type="button"
              onClick={() => deleteCustomEvent(selectedEntry.record.id)}
              style={{ ...smallButton, color: colors.red, marginTop: 12 }}
            >
              Delete Historical Event
            </button>
          ) : null}
        </section>
      ) : null}

      {showAddEvent ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add historical event"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(4,20,34,.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddEvent(false);
          }}
        >
          <div
            style={{
              width: "min(680px,100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#FFFFFF",
              borderRadius: 16,
              border: `1px solid ${colors.line}`,
              padding: isMobile ? 14 : 18,
              boxShadow: "0 24px 70px rgba(0,0,0,.22)",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ color: colors.navy, fontSize: 17 }}>
                  Add Historical Event
                </strong>
                <div style={mutedSmallStyle}>
                  Backfill important property history even when Atlas did not exist yet.
                </div>
              </div>
              <button type="button" onClick={() => setShowAddEvent(false)} style={smallButton}>
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 8,
              }}
            >
              <label style={{ display: "grid", gap: 4 }}>
                <span style={mutedSmallStyle}>Date</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={mutedSmallStyle}>Date accuracy</span>
                <select value={draft.datePrecision} onChange={(event) => setDraft((current) => ({ ...current, datePrecision: event.target.value as "Exact" | "Approximate" }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
                  <option>Exact</option>
                  <option>Approximate</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={mutedSmallStyle}>Type</span>
                <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
                  <option>Estate Event</option>
                  <option>Milestone</option>
                  <option>Renovation</option>
                  <option>Landscape</option>
                  <option>Installation</option>
                  <option>Ownership / Property</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, alignSelf: "end", minHeight: 38 }}>
                <input type="checkbox" checked={draft.milestone} onChange={(event) => setDraft((current) => ({ ...current, milestone: event.target.checked }))} />
                Mark as milestone
              </label>
            </div>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={mutedSmallStyle}>Title</span>
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What happened?" style={{ minHeight: 40, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={mutedSmallStyle}>Notes / history</span>
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="What changed, why it mattered, contractors, materials, links, memories..." style={{ border: `1px solid ${colors.line}`, borderRadius: 9, padding: 8, resize: "vertical" }} />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
                gap: 8,
              }}
            >
              <select value={draft.locationId} onChange={(event) => setDraft((current) => ({ ...current, locationId: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
                <option value="">No location</option>
                {locations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
              <select value={draft.assetId} onChange={(event) => setDraft((current) => ({ ...current, assetId: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
                <option value="">No asset</option>
                {assetRecords.map((asset: any) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
              </select>
              <select value={draft.vendorId} onChange={(event) => setDraft((current) => ({ ...current, vendorId: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }}>
                <option value="">No vendor</option>
                {vendorRecords.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 8,
              }}
            >
              <label style={{ display: "grid", gap: 4 }}>
                <span style={mutedSmallStyle}>Before photo URL (optional)</span>
                <input value={draft.beforePhoto} onChange={(event) => setDraft((current) => ({ ...current, beforePhoto: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={mutedSmallStyle}>After photo URL (optional)</span>
                <input value={draft.afterPhoto} onChange={(event) => setDraft((current) => ({ ...current, afterPhoto: event.target.value }))} style={{ minHeight: 38, border: `1px solid ${colors.line}`, borderRadius: 9, padding: 7 }} />
              </label>
            </div>

            <button
              type="button"
              disabled={!draft.date || !draft.title.trim()}
              onClick={saveCustomEvent}
              style={{
                ...goldButtonStyle,
                opacity: draft.date && draft.title.trim() ? 1 : 0.5,
              }}
            >
              Save Historical Event
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
