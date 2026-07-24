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
  todayEvents: CalendarItem[];
  upcomingEvents: CalendarItem[];
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

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function weatherCondition(code: number) {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";

  return "Weather";
}

function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";

  return "🌡️";
}

export default function DailyOperationsManager({
  assets,
  todayEvents,
  upcomingEvents,
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
  const sortedTodayEvents = [...todayEvents]
    .filter((item) => !item.completed)
    .sort((a, b) =>
      (a.time || "99:99").localeCompare(b.time || "99:99"),
    );

  const sortedUpcomingEvents = [...upcomingEvents]
    .filter((item) => !item.completed && item.date > today)
    .sort((a, b) =>
      `${a.date} ${a.time || "99:99"}`.localeCompare(
        `${b.date} ${b.time || "99:99"}`,
      ),
    );

  const activeWork = serviceRecords.filter(
    (item) =>
      !["Completed", "Closed", "Cancelled"].includes(item.status),
  );

  const highPriority = activeWork
    .filter((item) => item.priority === "High")
    .sort((a, b) =>
      (a.date || "9999-12-31").localeCompare(
        b.date || "9999-12-31",
      ),
    )
    .slice(0, 5);

  const overdue = activeWork
    .filter((item) => item.date && item.date < today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const priorityWork = [...highPriority, ...overdue]
    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.id === item.id) ===
        index,
    )
    .slice(0, 5);

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

  /*
   * Weather must represent today only.
   * Do not silently use tomorrow or the first future forecast.
   */
  const todayWeather =
    weatherDays.find((day) => day.date === today) || null;

  const weatherAdvice = todayWeather
    ? todayWeather.precipChance >= 60
      ? "Wet-weather day: prioritize indoor, mechanical, document, and inspection work."
      : todayWeather.high >= 85
        ? "Hot day: handle outdoor work early and prioritize irrigation checks."
        : todayWeather.windMax >= 20
          ? "Windy conditions: avoid exposed ladder, dock, and loose-material work."
          : "Good general work window for outdoor maintenance and inspections."
    : "Today’s weather has not loaded yet.";

  const attentionCount =
    priorityWork.length +
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

          <h2
            style={{
              margin: "5px 0 4px",
              fontSize: isMobile ? 22 : 26,
            }}
          >
            Today’s Property Brief
          </h2>

          <div
            style={{
              opacity: 0.8,
              fontSize: 13,
            }}
          >
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
            whiteSpace: "nowrap",
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
          alignItems: "stretch",
        }}
      >
        {/* Row 1: Today and Upcoming */}
        <BriefingCard
          title="Today’s Schedule"
          colors={colors}
        >
          {sortedTodayEvents.length ? (
            sortedTodayEvents.slice(0, 5).map((item) => (
              <BriefingButton
                key={item.instanceId || item.id}
                title={item.title}
                detail={item.allDay ? "All day" : item.time || "No time"}
                onClick={() => onOpenCalendar(item)}
                colors={colors}
              />
            ))
          ) : (
            <EmptyLine>No scheduled events today.</EmptyLine>
          )}
        </BriefingCard>

        <BriefingCard
          title="Upcoming"
          colors={colors}
        >
          {sortedUpcomingEvents.length ? (
            sortedUpcomingEvents.slice(0, 5).map((item) => (
              <BriefingButton
                key={item.instanceId || item.id}
                title={item.title}
                detail={`${dateLabel(item.date)}${
                  item.allDay
                    ? " · All day"
                    : item.time
                      ? ` · ${item.time}`
                      : ""
                }`}
                onClick={() => onOpenCalendar(item)}
                colors={colors}
              />
            ))
          ) : (
            <EmptyLine>No upcoming calendar events.</EmptyLine>
          )}
        </BriefingCard>

        {/* Row 2: Today's Weather and Priority Work */}
        <BriefingCard
          title="Today’s Weather"
          colors={colors}
        >
          {todayWeather ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 2,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    fontSize: 34,
                    lineHeight: 1,
                  }}
                >
                  {weatherIcon(todayWeather.code)}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {weatherCondition(todayWeather.code)}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 13,
                      opacity: 0.72,
                    }}
                  >
                    High {Math.round(todayWeather.high)}° · Low{" "}
                    {Math.round(todayWeather.low)}°
                  </div>
                </div>
              </div>

              <div
                style={{
                  lineHeight: 1.55,
                  fontSize: 13,
                }}
              >
                {weatherAdvice}
              </div>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 12,
                  opacity: 0.72,
                }}
              >
                Rain {Math.round(todayWeather.precipChance)}% · Wind{" "}
                {Math.round(todayWeather.windMax)} mph
              </div>
            </>
          ) : (
            <EmptyLine>Today’s weather has not loaded yet.</EmptyLine>
          )}
        </BriefingCard>

        <BriefingCard
          title="Priority Work"
          colors={colors}
        >
          {priorityWork.length ? (
            priorityWork.map((item) => (
              <BriefingButton
                key={item.id}
                title={item.title}
                detail={`${item.priority || "Medium"} · ${
                  item.date && item.date < today
                    ? `Overdue ${dateLabel(item.date)}`
                    : item.date
                      ? dateLabel(item.date)
                      : "No due date"
                }`}
                onClick={() => onOpenWorkOrder(item.id)}
                colors={colors}
              />
            ))
          ) : (
            <EmptyLine>
              No high-priority or overdue work.
            </EmptyLine>
          )}
        </BriefingCard>

        {/* Everything below remains in its existing position */}
        <BriefingCard
          title="Atlas Notices"
          colors={colors}
        >
          <NoticeLine
            count={assetsWithoutProcedure.length}
            label="assets shown without a linked procedure"
          />

          <NoticeLine
            count={workWithoutPhotos}
            label="open work orders without photos"
          />

          <NoticeLine
            count={overdue.length}
            label="overdue work items"
          />
        </BriefingCard>

        <BriefingCard
          title="Suggested AI Checks"
          colors={colors}
        >
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
        height: "100%",
        boxSizing: "border-box",
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

      <div
        style={{
          display: "grid",
          gap: 7,
        }}
      >
        {children}
      </div>
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
        color: "inherit",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontWeight: 850,
          fontSize: 13,
          overflowWrap: "anywhere",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 11,
          opacity: 0.68,
          marginTop: 3,
          overflowWrap: "anywhere",
        }}
      >
        {detail}
      </div>
    </button>
  );
}

function EmptyLine({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: 13,
        opacity: 0.68,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

function NoticeLine({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "baseline",
        fontSize: 13,
      }}
    >
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
        color: "inherit",
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
