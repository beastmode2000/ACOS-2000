"use client";

import type {
  AssetRecord,
  CalendarItem,
  ProcedureRecord,
  ServiceRecord,
  WeatherDay,
} from "../../lib/atlas-types";

type Props = {
  assets: AssetRecord[];
  calendarItems: CalendarItem[];
  procedures: ProcedureRecord[];
  serviceRecords: ServiceRecord[];
  weatherDays: WeatherDay[];
  today: string;
  isMobile: boolean;
  colors: {
    navy: string;
    gold: string;
    line: string;
    card: string;
    panel: string;
  };
  onOpenCalendar: (item: CalendarItem) => void;
  onOpenWorkOrder: (id: string) => void;
  onAskAtlas: (prompt: string) => void;
};

function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DailyOperationsManager({
  assets,
  calendarItems,
  procedures,
  serviceRecords,
  weatherDays,
  today,
  isMobile,
  colors,
  onOpenCalendar,
  onOpenWorkOrder,
  onAskAtlas,
}: Props) {
  const todayEvents = calendarItems
    .filter((item) => item.date === today && !item.completed)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  const activeWork = serviceRecords.filter(
    (item) => !["Completed", "Closed", "Cancelled"].includes(item.status),
  );

  const highPriority = activeWork
    .filter((item) => item.priority === "High")
    .slice(0, 4);

  const overdue = activeWork
    .filter((item) => item.date && item.date < today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const upcomingVisits = calendarItems
    .filter(
      (item) =>
        item.date >= today &&
        !item.completed &&
        /vendor|service|inspection|repair|visit|meeting|appointment/i.test(
          `${item.title} ${item.notes || ""} ${item.linkedType || ""}`,
        ),
    )
    .sort((a, b) =>
      `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`),
    )
    .slice(0, 4);

  const assetsWithoutProcedure = assets
    .filter(
      (asset) =>
        !procedures.some((procedure) =>
          (procedure.linkedAssetIds || []).includes(asset.id),
        ),
    )
    .slice(0, 5);

  const workWithoutPhotos = activeWork.filter(
    (item) => !(item.photos || []).length,
  ).length;

  const weather = weatherDays.find((day) => day.date === today) || weatherDays[0];
  const weatherAdvice = weather
    ? weather.precipChance >= 60
      ? "Wet-weather day: prioritize indoor, mechanical, document, and inspection work."
      : weather.high >= 85
        ? "Hot day: handle outdoor work early and prioritize irrigation checks."
        : weather.windMax >= 20
          ? "Windy conditions: avoid exposed ladder, dock, and loose-material work."
          : "Good general work window for outdoor maintenance and inspections."
    : "Weather data is not available yet.";

  const attentionCount =
    highPriority.length +
    overdue.length +
    assetsWithoutProcedure.length +
    workWithoutPhotos;

  return (
    <section
      style={{
        borderRadius: 20,
        border: `1px solid ${colors.line}`,
        background: colors.card,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: isMobile ? 16 : 20,
          background: colors.navy,
          color: "#FFFFFF",
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 14,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div>
          <div
            style={{
              color: colors.gold,
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            AI Daily Operations Manager
          </div>
          <h2 style={{ margin: "5px 0 4px", fontSize: isMobile ? 22 : 26 }}>
            Today’s Property Brief
          </h2>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            {dateLabel(today)} · {attentionCount} item
            {attentionCount === 1 ? "" : "s"} needing review
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onAskAtlas(
              "Build a detailed plan for today using my calendar, open work orders, weather, priorities, and property locations.",
            )
          }
          style={{
            border: 0,
            borderRadius: 11,
            background: colors.gold,
            color: colors.navy,
            padding: "11px 14px",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          Build Today’s Plan
        </button>
      </div>

      <div
        style={{
          padding: isMobile ? 14 : 18,
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <BriefingCard title="Today’s Schedule" colors={colors}>
          {todayEvents.length ? (
            todayEvents.slice(0, 5).map((item) => (
              <BriefingButton
                key={item.id}
                title={item.title}
                detail={item.time || "All day"}
                onClick={() => onOpenCalendar(item)}
                colors={colors}
              />
            ))
          ) : (
            <EmptyLine>No scheduled events today.</EmptyLine>
          )}
        </BriefingCard>

        <BriefingCard title="Priority Work" colors={colors}>
          {highPriority.length || overdue.length ? (
            [...highPriority, ...overdue]
              .filter(
                (item, index, all) =>
                  all.findIndex((candidate) => candidate.id === item.id) === index,
              )
              .slice(0, 5)
              .map((item) => (
                <BriefingButton
                  key={item.id}
                  title={item.title}
                  detail={`${item.priority || "Medium"} · ${
                    item.date < today ? `Overdue ${dateLabel(item.date)}` : dateLabel(item.date)
                  }`}
                  onClick={() => onOpenWorkOrder(item.id)}
                  colors={colors}
                />
              ))
          ) : (
            <EmptyLine>No high-priority or overdue work.</EmptyLine>
          )}
        </BriefingCard>

        <BriefingCard title="Weather Guidance" colors={colors}>
          <div style={{ lineHeight: 1.55, fontSize: 13 }}>{weatherAdvice}</div>
          {weather ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
              High {Math.round(weather.high)}° · Rain{" "}
              {Math.round(weather.precipChance)}% · Wind{" "}
              {Math.round(weather.windMax)} mph
            </div>
          ) : null}
        </BriefingCard>

        <BriefingCard title="Upcoming Visits" colors={colors}>
          {upcomingVisits.length ? (
            upcomingVisits.map((item) => (
              <BriefingButton
                key={item.id}
                title={item.title}
                detail={`${dateLabel(item.date)}${item.time ? ` · ${item.time}` : ""}`}
                onClick={() => onOpenCalendar(item)}
                colors={colors}
              />
            ))
          ) : (
            <EmptyLine>No vendor or service visits found.</EmptyLine>
          )}
        </BriefingCard>

        <BriefingCard title="Atlas Notices" colors={colors}>
          <NoticeLine
            count={assetsWithoutProcedure.length}
            label="assets shown without a linked procedure"
          />
          <NoticeLine
            count={workWithoutPhotos}
            label="open work orders without photos"
          />
          <NoticeLine count={overdue.length} label="overdue work items" />
        </BriefingCard>

        <BriefingCard title="Suggested AI Checks" colors={colors}>
          <ActionLink
            label="Review overdue work"
            onClick={() =>
              onAskAtlas(
                "Review all overdue work orders, explain what needs attention first, and suggest a realistic order for completing them.",
              )
            }
          />
          <ActionLink
            label="Find missing procedures"
            onClick={() =>
              onAskAtlas(
                "Show important assets that do not have linked procedures and recommend which procedures should be created first.",
              )
            }
          />
          <ActionLink
            label="Prepare management update"
            onClick={() =>
              onAskAtlas(
                "Prepare a concise management update covering completed work, open issues, vendor visits, upcoming work, and anything needing a decision.",
              )
            }
          />
        </BriefingCard>
      </div>
    </section>
  );
}

function BriefingCard({
  title,
  colors,
  children,
}: {
  title: string;
  colors: Props["colors"];
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 14,
        background: colors.panel,
        padding: 14,
        minWidth: 0,
      }}
    >
      <div
        style={{
          marginBottom: 10,
          fontSize: 12,
          fontWeight: 950,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 7 }}>{children}</div>
    </div>
  );
}

function BriefingButton({
  title,
  detail,
  onClick,
  colors,
}: {
  title: string;
  detail: string;
  onClick: () => void;
  colors: Props["colors"];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        border: `1px solid ${colors.line}`,
        borderRadius: 10,
        background: colors.card,
        padding: "9px 10px",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 850, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.68, marginTop: 3 }}>{detail}</div>
    </button>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, opacity: 0.68 }}>{children}</div>;
}

function NoticeLine({ count, label }: { count: number; label: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13 }}>
      <strong>{count}</strong>
      <span style={{ opacity: 0.75 }}>{label}</span>
    </div>
  );
}

function ActionLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 0,
        padding: 0,
        background: "transparent",
        textAlign: "left",
        fontWeight: 850,
        cursor: "pointer",
        textDecoration: "underline",
      }}
    >
      {label}
    </button>
  );
}

