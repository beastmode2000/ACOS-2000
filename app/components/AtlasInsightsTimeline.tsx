"use client";

import React, { useMemo, useState } from "react";

type Props = {
  mode: "timeline" | "insights";
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

export default function AtlasInsightsTimeline({
  mode,
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

    const penalty =
      overdue.length * 6 +
      highPriority.length * 3 +
      inProgress.length;
    const health = Math.max(0, Math.min(100, 100 - penalty));

    const todayWeather = weatherDays[0];
    const tomorrowWeather = weatherDays[1];
    const alerts: string[] = [];

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

  const timelineEntries = useMemo(() => {
    const entries: any[] = [];

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
          icon: "✅",
          title: snapshot.title || record.title,
          description:
            snapshot.notes ||
            `${category(record)} · ${assetName(record.assetId)}`,
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
          icon: "✅",
          title: record.title,
          description: `${category(record)} · ${assetName(record.assetId)}`,
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
          icon: "✅",
          title: record.title,
          description: `${category(record)} · ${assetName(record.assetId)}`,
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
          icon: "📝",
          title: record.title,
          description: note.text || note.note || note.body || "Work note added",
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
          icon: "📸",
          title: record.title,
          description: photo.name || "Work photo added",
          photo: photo.dataUrl || photo.url || "",
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
          icon: "📥",
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
          icon: "🔁",
          title: request.title || "Owner request",
          description: "Converted into a tracked work order",
          request,
        });
      } else if (
        ["Closed", "Declined", "Completed"].includes(String(request.status))
      ) {
        entries.push({
          id: `request-${request.id}-history`,
          date: request.updatedAt || request.submittedAt,
          type: "Request History",
          icon: "📋",
          title: request.title || "Owner request",
          description: `Request ${String(request.status).toLowerCase()}`,
          request,
        });
      }
    });

    [...todayEvents, ...upcomingEvents].forEach((event) => {
      entries.push({
        id: `calendar-${event.instanceId || event.id}`,
        date: event.date,
        type: "Calendar",
        icon: "📅",
        title: event.title,
        description: `${event.time || (event.allDay ? "All day" : "No time")} · ${
          event.categoryLabel || event.area || "Calendar"
        }`,
        event,
      });
    });

    const search = timelineSearch.trim().toLowerCase();

    return entries
      .filter((entry) => entry.date)
      .filter((entry) => timelineType === "All" || entry.type === timelineType)
      .filter((entry) => {
        if (!search) return true;
        return [entry.title, entry.description, entry.type]
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }, [
    assetName,
    serviceRecords,
    requestRecords,
    timelineSearch,
    timelineType,
    todayEvents,
    upcomingEvents,
  ]);

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
              ["Property Health", insightData.health, "🏠"],
              ["Overdue", insightData.overdue.length, "🔴"],
              ["Due Today", insightData.dueToday.length, "🟡"],
              ["In Progress", insightData.inProgress.length, "🔵"],
              ["Due This Week", insightData.dueThisWeek.length, "📅"],
              ["Recurring", insightData.recurring.length, "🔁"],
              ["Projects", insightData.projects.length, "📋"],
              ["High Priority", insightData.highPriority.length, "🚨"],
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
                <span style={{ fontSize: 22 }}>{icon}</span>
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
              Permanent Operations History
            </div>
            <h2 style={{ margin: "5px 0 4px", color: colors.text }}>
              Estate Timeline
            </h2>
            <p style={mutedSmallStyle}>
              Completed work, service history, dated notes, work photos, and
              calendar activity in one searchable feed.
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
            Open Work History
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={toolbar}>
          <input
            value={timelineSearch}
            onChange={(event) => setTimelineSearch(event.target.value)}
            placeholder="Search timeline..."
            style={{ ...inputStyle, flex: "1 1 280px" }}
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
          </select>
          <button
            type="button"
            onClick={() => {
              setTimelineSearch("");
              setTimelineType("All");
            }}
            style={secondaryButtonStyle}
          >
            Clear
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        {timelineEntries.length ? (
          <div style={{ display: "grid", gap: 0 }}>
            {timelineEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
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
                }}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: entry.photo
                    ? "42px 92px minmax(0, 1fr) auto"
                    : "42px minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "center",
                  border: "none",
                  borderBottom: `1px solid ${colors.line}`,
                  background: "transparent",
                  color: colors.text,
                  padding: "14px 4px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: colors.panel,
                    border: `1px solid ${colors.line}`,
                  }}
                >
                  {entry.icon}
                </span>

                {entry.photo ? (
                  <img
                    src={entry.photo}
                    alt=""
                    style={{
                      width: 92,
                      height: 62,
                      borderRadius: 10,
                      objectFit: "cover",
                      border: `1px solid ${colors.line}`,
                    }}
                  />
                ) : null}

                <span style={{ minWidth: 0 }}>
                  <strong>{entry.title}</strong>
                  <span style={{ ...mutedSmallStyle, display: "block" }}>
                    {entry.type} · {entry.description}
                  </span>
                  {entry.record ? (
                    <span style={{ ...mutedSmallStyle, display: "block" }}>
                      {assetName(entry.record.assetId)} ·{" "}
                      {vendorName(entry.record.vendorId)} ·{" "}
                      {locationName(entry.record.locationId)}
                    </span>
                  ) : null}
                </span>

                <span
                  style={{
                    ...mutedSmallStyle,
                    whiteSpace: "nowrap",
                    alignSelf: "start",
                  }}
                >
                  {dateLabel(entry.date)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div style={noticeStyle}>
            No timeline entries match the current filters.
          </div>
        )}
      </section>
    </div>
  );
}
