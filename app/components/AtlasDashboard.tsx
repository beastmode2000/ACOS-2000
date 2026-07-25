"use client";

import React, { useMemo } from "react";

type AtlasDashboardProps = {
  [key: string]: any;
};

function dateTime(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? Number.POSITIVE_INFINITY
    : parsed.getTime();
}

function propertyIdFor(record: any) {
  return String(
    record?.propertyId ??
      record?.property_id ??
      record?.property?.id ??
      record?.property ??
      "",
  )
    .trim()
    .toLowerCase();
}

function belongsToProperty(record: any, activePropertyId: string) {
  const active = String(activePropertyId || "2000").trim().toLowerCase();
  const recordPropertyId = propertyIdFor(record);

  // Legacy Atlas records without a property field were created for 2000.
  // They must never appear when another property is selected.
  if (!recordPropertyId) return active === "2000";
  return recordPropertyId === active;
}

export default function AtlasDashboard(props: AtlasDashboardProps) {
  const {
    activePropertyId = "2000",
    activePropertyName = "2000",
    activePropertyDetail = "",
    SectionHeader,
    assetName,
    buttonRowStyle,
    calendarWeatherIconStyle,
    colors,
    dashboardAdviceStyle,
    dashboardStackStyle,
    dashboardWeatherDayStyle,
    dashboardWeatherMiniStyle,
    dashboardWeatherStripStyle,
    dashboardWeatherTempStyle,
    dashboardWeatherTopStyle,
    formatDate,
    goldButtonStyle,
    irrigationAdvice,
    isMobile,
    logoCandidates,
    logoIndex,
    mutedSmallStyle,
    noticeStyle,
    requestRecords = [],
    secondaryButtonStyle,
    sectionStyle,
    sectionTitleStyle,
    serviceRecords = [],
    setLogoIndex,
    setScreen,
    setSelectedRequestId,
    setSelectedServiceId,
    weatherDays = [],
    weatherIcon,
    weatherStatus,
    eyebrowStyle,
  } = props;

  const propertyRequests = useMemo(
    () =>
      requestRecords.filter((record: any) =>
        belongsToProperty(record, activePropertyId),
      ),
    [activePropertyId, requestRecords],
  );

  const propertyServices = useMemo(
    () =>
      serviceRecords.filter((record: any) =>
        belongsToProperty(record, activePropertyId),
      ),
    [activePropertyId, serviceRecords],
  );

  const recentActivity = useMemo(() => {
    const entries: any[] = [];

    propertyRequests.forEach((request: any) => {
      entries.push({
        id: `request-${request.id}`,
        date: request.updatedAt || request.submittedAt,
        icon: request.status === "Closed" ? "✅" : "📥",
        title: request.title || "Owner request",
        detail:
          request.status === "Closed"
            ? `Request completed · ${request.requesterName || "Owner"}`
            : `${request.status || "New"} request · ${request.requesterName || "Owner"}`,
        kind: "request",
        recordId: request.id,
      });
    });

    propertyServices.forEach((record: any) => {
      const completedAt =
        record.lastCompletedDate ||
        (Array.isArray(record.completionHistory)
          ? record.completionHistory[record.completionHistory.length - 1]
          : "");

      if (completedAt) {
        entries.push({
          id: `work-${record.id}-${completedAt}`,
          date: completedAt,
          icon: "🔧",
          title: record.title,
          detail: `Work completed · ${assetName(record.assetId)}`,
          kind: "work",
          recordId: record.id,
        });
      }

      const notes = Array.isArray(record.notesHistory)
        ? record.notesHistory
        : [];

      notes.slice(-2).forEach((note: any, index: number) => {
        if (!note?.createdAt) return;
        entries.push({
          id: `note-${record.id}-${note.id || index}`,
          date: note.createdAt,
          icon: "📝",
          title: record.title,
          detail: note.text || "Work note added",
          kind: "work",
          recordId: record.id,
        });
      });
    });

    return entries
      .filter((entry) => entry.date)
      .sort((a, b) => dateTime(b.date) - dateTime(a.date))
      .slice(0, 10);
  }, [assetName, propertyRequests, propertyServices]);

  return (
    <div style={dashboardStackStyle}>
      <section
        style={{
          ...sectionStyle,
          background:
            "linear-gradient(135deg, rgba(7,27,47,1) 0%, rgba(18,61,99,1) 100%)",
          color: "#FFFFFF",
          border: "1px solid rgba(201,154,61,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 13,
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(229,192,107,0.52)",
              }}
            >
              {logoIndex < logoCandidates.length ? (
                <img
                  src={logoCandidates[logoIndex]}
                  alt=""
                  onError={() =>
                    setLogoIndex((index: number) => index + 1)
                  }
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: 5,
                  }}
                />
              ) : (
                <span style={{ color: colors.gold2, fontWeight: 900 }}>A</span>
              )}
            </div>

            <div>
              <div style={{ ...eyebrowStyle, color: colors.gold2 }}>
                Estate Command Center
              </div>
              <h2
                style={{
                  ...sectionTitleStyle,
                  color: "#FFFFFF",
                  marginBottom: 4,
                }}
              >
                {activePropertyName} Operations
              </h2>
              <p
                style={{
                  ...mutedSmallStyle,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {activePropertyDetail
                  ? `${activePropertyDetail} · Current schedule, priorities, conditions, and property activity.`
                  : "Current schedule, priorities, conditions, and property activity."}
              </p>
            </div>
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={() => setScreen("history")}
              style={goldButtonStyle}
            >
              Plan My Day
            </button>
            <button
              type="button"
              onClick={() => setScreen("inbox")}
              style={secondaryButtonStyle}
            >
              + Add Anything
            </button>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionHeader
          brand
          eyebrow="Property Record"
          title="Activity Timeline"
          detail={`The newest requests, completed work, vendor activity, and work notes for ${activePropertyName}.`}
          right={
            <button
              type="button"
              onClick={() => setScreen("timeline")}
              style={secondaryButtonStyle}
            >
              View Full Timeline
            </button>
          }
        />

        {recentActivity.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {recentActivity.map((entry: any) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (entry.kind === "request") {
                    setSelectedRequestId?.(entry.recordId);
                    setScreen("requests");
                    return;
                  }
                  setSelectedServiceId(entry.recordId);
                  setScreen("history");
                }}
                style={{
                  width: "100%",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 12,
                  background: "#FFFFFF",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "32px minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  color: colors.text,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 18 }}>{entry.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block" }}>{entry.title}</strong>
                  <span style={mutedSmallStyle}>{entry.detail}</span>
                </span>
                <span style={{ ...mutedSmallStyle, whiteSpace: "nowrap" }}>
                  {formatDate(String(entry.date).slice(0, 10))}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div style={noticeStyle}>
            No activity is recorded for {activePropertyName} yet.
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <SectionHeader
          brand
          eyebrow="Weather / Irrigation"
          title="7-Day Planning Window"
          detail="Weather conditions for outdoor work."
          right={
            <button
              type="button"
              onClick={() => setScreen("weather")}
              style={secondaryButtonStyle}
            >
              Open Weather
            </button>
          }
        />

        <div style={dashboardWeatherStripStyle}>
          {weatherDays.length ? (
            weatherDays.map((day: any) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setScreen("weather")}
                style={dashboardWeatherDayStyle}
              >
                <div style={dashboardWeatherTopStyle}>
                  <strong>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "short" },
                    )}
                  </strong>
                  <span style={calendarWeatherIconStyle}>
                    {weatherIcon(day.code)}
                  </span>
                </div>
                <div style={dashboardWeatherTempStyle}>
                  {day.high}° / {day.low}°
                </div>
                <div style={dashboardWeatherMiniStyle}>
                  Rain {day.precipChance}% · ET0 {day.et0}"
                </div>
                <p style={dashboardAdviceStyle}>{irrigationAdvice(day)}</p>
              </button>
            ))
          ) : (
            <div style={noticeStyle}>{weatherStatus}</div>
          )}
        </div>
      </section>
    </div>
  );
}
