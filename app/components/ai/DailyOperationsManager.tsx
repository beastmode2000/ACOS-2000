"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AssetRecord,
  CalendarItem,
  ProcedureRecord,
  ServiceRecord,
  WeatherDay,
} from "../../lib/atlas-types";

type RoutineTask = {
  id: string;
  title: string;
  enabled: boolean;
  completed?: boolean;
};

type RoutineOccurrence = {
  date: string;
  day: number;
  name: string;
  tasks: RoutineTask[];
};

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
  onOpenCalendarPage: () => void;
  onOpenWorkOrder: (id: string) => void;
  onOpenWorkOrdersPage: () => void;
  onAskAtlas: (prompt: string) => void;
};

function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function shortDateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

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

function isClosedStatus(status?: string) {
  return ["Completed", "Closed", "Cancelled"].includes(status || "");
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
  onOpenCalendarPage,
  onOpenWorkOrder,
  onOpenWorkOrdersPage,
  onAskAtlas,
}: Props) {
  const [routineOccurrence, setRoutineOccurrence] =
    useState<RoutineOccurrence | null>(null);
  const [routineLoading, setRoutineLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutine() {
      setRoutineLoading(true);

      try {
        const response = await fetch(
          `/api/atlas-routines?date=${encodeURIComponent(today)}`,
          { cache: "no-store" },
        );
        const payload = await response.json();

        if (!cancelled) {
          setRoutineOccurrence(
            response.ok && payload?.ok && payload?.occurrence
              ? payload.occurrence
              : null,
          );
        }
      } catch {
        if (!cancelled) {
          setRoutineOccurrence(null);
        }
      } finally {
        if (!cancelled) {
          setRoutineLoading(false);
        }
      }
    }

    void loadRoutine();

    return () => {
      cancelled = true;
    };
  }, [today]);

  const sortedTodayEvents = [...todayEvents]
    .filter((item) => !item.completed)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  const sortedUpcomingEvents = [...upcomingEvents]
    .filter((item) => !item.completed && item.date > today)
    .sort((a, b) =>
      `${a.date} ${a.time || "99:99"}`.localeCompare(
        `${b.date} ${b.time || "99:99"}`,
      ),
    );

  const activeWork = serviceRecords.filter((item) => !isClosedStatus(item.status));
  const completedToday = serviceRecords.filter(
    (item) => item.status === "Completed" && item.date === today,
  );

  const overdue = activeWork
    .filter((item) => item.date && item.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const dueToday = activeWork
    .filter((item) => item.date === today)
    .sort((a, b) => (a.priority || "").localeCompare(b.priority || ""));

  const highPriority = activeWork
    .filter((item) => item.priority === "High")
    .sort((a, b) =>
      (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"),
    );

  const priorityWork = [...overdue, ...dueToday, ...highPriority]
    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .slice(0, 6);

  const assetsWithoutProcedure = assets.filter(
    (asset) =>
      !procedures.some((procedure) =>
        (procedure.linkedAssetIds || []).includes(asset.id),
      ),
  );

  const workWithoutPhotos = activeWork.filter(
    (item) => !(item.photos || []).length,
  ).length;

  const todayWeather = weatherDays.find((day) => day.date === today) || null;

  const vendorEvents = sortedTodayEvents.filter(
    (item) =>
      item.linkedType === "Vendor" ||
      item.categoryLabel?.toLowerCase().includes("vendor") ||
      item.area?.toLowerCase().includes("vendor"),
  );

  const totalTodayItems = dueToday.length + completedToday.length;
  const progressPercent =
    totalTodayItems > 0
      ? Math.round((completedToday.length / totalTodayItems) * 100)
      : 0;

  const healthDeductions =
    Math.min(overdue.length * 5, 30) +
    Math.min(highPriority.length * 2, 12) +
    Math.min(workWithoutPhotos, 6) +
    Math.min(Math.floor(assetsWithoutProcedure.length / 5), 6);

  const healthScore = Math.max(55, 100 - healthDeductions);
  const healthLabel =
    healthScore >= 94
      ? "Excellent"
      : healthScore >= 86
        ? "Good"
        : healthScore >= 78
          ? "Needs attention"
          : "At risk";

  const healthColor =
    healthScore >= 94
      ? "#65B985"
      : healthScore >= 86
        ? "#8DB56A"
        : healthScore >= 78
          ? "#D7A84B"
          : "#D97070";


  const weatherAdvice = todayWeather
    ? todayWeather.precipChance >= 60
      ? "Prioritize indoor work and finish exposed outdoor tasks early."
      : todayWeather.high >= 85
        ? "Handle outdoor work early and verify irrigation coverage."
        : todayWeather.windMax >= 20
          ? "Avoid exposed ladder, dock, and loose-material work."
          : "Good conditions for outdoor maintenance and inspections."
    : "Weather data has not loaded yet.";

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const visibleSchedule = sortedTodayEvents.slice(0, 5);
  const visiblePriority = priorityWork.slice(0, 5);
  const visibleUpcoming = sortedUpcomingEvents.slice(0, 4);

  const routineTasks = routineOccurrence?.tasks || [];
  const completedRoutineTasks = routineTasks.filter(
    (task) => task.completed,
  ).length;
  const incompleteRoutineTasks = routineTasks.filter(
    (task) => !task.completed,
  );
  const routineProgress =
    routineTasks.length > 0
      ? Math.round((completedRoutineTasks / routineTasks.length) * 100)
      : 0;


  const healthDrivers = [
    {
      id: "routine",
      label: "Routine completion",
      detail: routineTasks.length
        ? `${completedRoutineTasks} of ${routineTasks.length} complete`
        : "No routine tasks scheduled",
      positive: routineTasks.length === 0 || routineProgress >= 60,
      impact:
        routineTasks.length === 0
          ? 0
          : routineProgress >= 80
            ? 2
            : routineProgress >= 60
              ? 1
              : -2,
    },
    {
      id: "overdue",
      label: "Overdue work",
      detail: overdue.length
        ? `${overdue.length} overdue ${overdue.length === 1 ? "item" : "items"}`
        : "No overdue work orders",
      positive: overdue.length === 0,
      impact: overdue.length === 0 ? 2 : -Math.min(overdue.length * 2, 6),
    },
    {
      id: "priority",
      label: "Priority workload",
      detail: highPriority.length
        ? `${highPriority.length} high-priority ${highPriority.length === 1 ? "item" : "items"}`
        : "No high-priority backlog",
      positive: highPriority.length === 0,
      impact: highPriority.length === 0 ? 1 : -Math.min(highPriority.length, 4),
    },
    {
      id: "procedures",
      label: "Asset coverage",
      detail: assetsWithoutProcedure.length
        ? `${assetsWithoutProcedure.length} assets without linked procedures`
        : "All assets have procedure coverage",
      positive: assetsWithoutProcedure.length === 0,
      impact: assetsWithoutProcedure.length === 0 ? 1 : -1,
    },
    {
      id: "weather",
      label: "Work conditions",
      detail: todayWeather
        ? weatherCondition(todayWeather.code)
        : "Weather unavailable",
      positive:
        !todayWeather ||
        (todayWeather.precipChance < 60 && todayWeather.windMax < 20),
      impact:
        !todayWeather
          ? 0
          : todayWeather.precipChance >= 60 || todayWeather.windMax >= 20
            ? -1
            : 1,
    },
  ];

  const strongestPositiveDriver =
    healthDrivers
      .filter((driver) => driver.impact > 0)
      .sort((a, b) => b.impact - a.impact)[0] || null;

  const strongestNegativeDriver =
    healthDrivers
      .filter((driver) => driver.impact < 0)
      .sort((a, b) => a.impact - b.impact)[0] || null;

  const missionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      tone: "routine" | "urgent" | "schedule" | "weather";
      action: () => void;
    }> = [];

    if (routineOccurrence) {
      items.push({
        id: "routine",
        title: routineOccurrence.name,
        detail: routineTasks.length
          ? `${completedRoutineTasks} of ${routineTasks.length} complete`
          : "No tasks added",
        tone: "routine",
        action: onOpenWorkOrdersPage,
      });
    }

    if (overdue.length) {
      items.push({
        id: "overdue",
        title: overdue[0]?.title || "Overdue work",
        detail:
          overdue.length === 1
            ? "1 overdue work order"
            : `${overdue.length} overdue work orders`,
        tone: "urgent",
        action: () => onOpenWorkOrder(overdue[0].id),
      });
    } else if (dueToday.length) {
      items.push({
        id: "due-today",
        title: dueToday[0]?.title || "Work due today",
        detail:
          dueToday.length === 1
            ? "1 work order due today"
            : `${dueToday.length} work orders due today`,
        tone: "urgent",
        action: () => onOpenWorkOrder(dueToday[0].id),
      });
    }

    if (sortedTodayEvents.length) {
      const firstEvent = sortedTodayEvents[0];
      items.push({
        id: "schedule",
        title: firstEvent.title,
        detail: firstEvent.time
          ? `${firstEvent.time}${vendorEvents.length ? " · vendor schedule active" : ""}`
          : vendorEvents.length
            ? "Vendor schedule active"
            : "Scheduled today",
        tone: "schedule",
        action: () => onOpenCalendar(firstEvent),
      });
    }

    items.push({
      id: "weather",
      title: todayWeather
        ? `${Math.round(todayWeather.high)}° · ${weatherCondition(todayWeather.code)}`
        : "Weather unavailable",
      detail: weatherAdvice,
      tone: "weather",
      action: onOpenCalendarPage,
    });

    return items.slice(0, 4);
  }, [
    completedRoutineTasks,
    dueToday,
    onOpenCalendar,
    onOpenCalendarPage,
    onOpenWorkOrder,
    onOpenWorkOrdersPage,
    overdue,
    routineOccurrence,
    routineTasks.length,
    sortedTodayEvents,
    todayWeather,
    vendorEvents.length,
    weatherAdvice,
  ]);

  const briefingSentence = [
    `${greeting}, Nick.`,
    routineOccurrence
      ? routineTasks.length
        ? `${routineOccurrence.name} is ${completedRoutineTasks} of ${routineTasks.length} complete.`
        : `${routineOccurrence.name} has no tasks scheduled.`
      : routineLoading
        ? "Today’s routine is loading."
        : "No weekday routine is scheduled today.",
    overdue.length
      ? `${overdue.length} overdue ${overdue.length === 1 ? "work order needs" : "work orders need"} attention, led by ${overdue[0]?.title || "the oldest item"}.`
      : dueToday.length
        ? `${dueToday.length} ${dueToday.length === 1 ? "work order is" : "work orders are"} due today.`
        : "There are no overdue work orders.",
    sortedTodayEvents.length
      ? `${sortedTodayEvents.length} scheduled ${sortedTodayEvents.length === 1 ? "event is" : "events are"} on today’s calendar${sortedTodayEvents[0]?.title ? `, beginning with ${sortedTodayEvents[0].title}` : ""}.`
      : "The calendar is open today.",
    vendorEvents.length
      ? `${vendorEvents.length} vendor ${vendorEvents.length === 1 ? "visit is" : "visits are"} identified.`
      : "No vendor visits are identified.",
    weatherAdvice,
    strongestNegativeDriver
      ? `Estate Health is ${healthScore}, mainly affected by ${strongestNegativeDriver.label.toLowerCase()}.`
      : strongestPositiveDriver
        ? `Estate Health is ${healthScore}, supported by ${strongestPositiveDriver.label.toLowerCase()}.`
        : `Estate Health is ${healthScore}.`,
  ].join(" ");

  const todayFocus = [
    overdue.length
      ? `Start with ${overdue[0]?.title || "the oldest overdue work order"}${
          overdue.length > 1 ? `, then clear ${overdue.length - 1} additional overdue item${overdue.length - 1 === 1 ? "" : "s"}` : ""
        }.`
      : dueToday.length
        ? `Begin with ${dueToday[0]?.title || "today’s first due work order"}.`
        : sortedTodayEvents.length
          ? `Prepare for ${sortedTodayEvents[0]?.title || "the first scheduled event"}.`
          : "Use the open schedule for preventive maintenance and property inspections.",
    vendorEvents.length
      ? `Confirm access and scope before ${vendorEvents[0]?.linkedName || vendorEvents[0]?.title || "the first vendor"} arrives.`
      : null,
    todayWeather?.precipChance >= 60
      ? "Finish exposed outdoor work before conditions worsen."
      : todayWeather?.high >= 85
        ? "Complete outdoor work early and check irrigation coverage."
        : todayWeather?.windMax >= 20
          ? "Avoid exposed ladder and dock work."
          : "Outdoor maintenance has a favorable work window.",
  ].filter(Boolean) as string[];

  return (
    <section
      className="atlas-dashboard-shell"
      style={{
        marginBottom: 18,
        borderRadius: 24,
        overflow: "hidden",
        background: colors.card,
        border: `1px solid ${colors.line}`,
        boxShadow: "0 14px 38px rgba(15, 31, 48, 0.1)",
      }}
    >
      <header
        style={{
          padding: isMobile ? 18 : 24,
          background: `linear-gradient(135deg, ${colors.navy} 0%, #183B55 100%)`,
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "flex-start",
            gap: 18,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: colors.gold,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Daily Operations
            </div>

            <h2
              style={{
                margin: "7px 0 3px",
                fontSize: isMobile ? 25 : 31,
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}
            >
              {greeting}, Nick
            </h2>

            <div style={{ fontSize: 14, opacity: 0.72, fontWeight: 650 }}>
              {dateLabel(today)}
            </div>

            <p
              style={{
                maxWidth: 820,
                margin: "13px 0 0",
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.65,
                opacity: 0.86,
              }}
            >
              {briefingSentence}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onAskAtlas(
                "Create a prioritized daily operations plan using today’s routine, calendar, overdue and due work orders, vendors, weather, estate-health drivers, and property locations. Put the most time-sensitive work first.",
              )
            }
            style={{
              border: 0,
              borderRadius: 12,
              background: colors.gold,
              color: colors.navy,
              padding: "12px 16px",
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            }}
          >
            Build Today’s Plan
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(5, minmax(0, 1fr))",
            gap: 10,
            marginTop: 20,
          }}
        >
          <Metric label="Estate Health" value={`${healthScore}`} detail={healthLabel} accent={healthColor} />
          <Metric label="Schedule" value={`${sortedTodayEvents.length}`} detail="events today" />
          <Metric label="Priority" value={`${priorityWork.length}`} detail="need attention" />
          <Metric label="Vendors" value={`${vendorEvents.length}`} detail="scheduled today" />
          <Metric
            label="Weather"
            value={
              todayWeather
                ? `${Math.round(todayWeather.high)}°`
                : "—"
            }
            detail={todayWeather ? weatherCondition(todayWeather.code) : "Unavailable"}
          />
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 13,
            borderRadius: 15,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 9,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: colors.gold,
              }}
            >
              Estate Health Drivers
            </div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.68,
                whiteSpace: "nowrap",
              }}
            >
              Why the score changed
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(5, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {healthDrivers.map((driver) => (
              <div
                key={driver.id}
                style={{
                  minWidth: 0,
                  padding: "9px 10px",
                  borderRadius: 11,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 850,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      color: driver.positive ? "#7DD3A8" : "#F6A6A6",
                      fontWeight: 950,
                    }}
                  >
                    {driver.positive ? "▲" : "▼"}
                  </span>
                  <span>{driver.label}</span>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    lineHeight: 1.35,
                    opacity: 0.62,
                  }}
                >
                  {driver.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div
        style={{
          padding: isMobile ? "14px 14px 0" : "16px 18px 0",
          background: colors.card,
        }}
      >
        <div
          className="atlas-focus-strip"
          style={{
            borderRadius: 18,
            padding: isMobile ? 14 : 17,
            background: `linear-gradient(135deg, ${colors.gold}20, ${colors.panel})`,
            border: `1px solid ${colors.gold}66`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 13,
            }}
          >
            <div>
              <div
                style={{
                  color: colors.gold,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Today’s Mission
              </div>
              <div
                style={{
                  marginTop: 3,
                  color: colors.navy,
                  fontSize: isMobile ? 19 : 22,
                  fontWeight: 950,
                  letterSpacing: "-0.02em",
                }}
              >
                Operations Command Center
              </div>
            </div>

            {routineOccurrence && routineTasks.length ? (
              <div
                style={{
                  minWidth: isMobile ? 0 : 180,
                  padding: "9px 11px",
                  borderRadius: 12,
                  background: "#FFFFFF",
                  border: `1px solid ${colors.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 11,
                    fontWeight: 850,
                    color: colors.navy,
                    marginBottom: 6,
                  }}
                >
                  <span>Routine Progress</span>
                  <span>{routineProgress}%</span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 99,
                    overflow: "hidden",
                    background: "#E8EEF3",
                  }}
                >
                  <div
                    style={{
                      width: `${routineProgress}%`,
                      height: "100%",
                      borderRadius: 99,
                      background: colors.gold,
                      transition: "width 220ms ease",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 9,
            }}
          >
            {missionItems.map((item) => {
              const icon =
                item.tone === "routine"
                  ? "✓"
                  : item.tone === "urgent"
                    ? "!"
                    : item.tone === "schedule"
                      ? "◷"
                      : "☀";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="atlas-mission-card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px minmax(0, 1fr)",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 13,
                    background: "#FFFFFF",
                    padding: "11px 12px",
                    color: colors.navy,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background:
                        item.tone === "urgent"
                          ? "#FFF0EE"
                          : item.tone === "routine"
                            ? "#EEF8F2"
                            : item.tone === "schedule"
                              ? "#EEF4FA"
                              : "#FFF7E8",
                      color:
                        item.tone === "urgent"
                          ? "#B42318"
                          : item.tone === "routine"
                            ? "#087443"
                            : item.tone === "schedule"
                              ? colors.navy
                              : "#9A6A00",
                      fontWeight: 950,
                    }}
                  >
                    {icon}
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        fontSize: 11,
                        lineHeight: 1.4,
                        color: "#64748B",
                      }}
                    >
                      {item.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {incompleteRoutineTasks.length ? (
            <div
              style={{
                marginTop: 11,
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
              }}
            >
              {incompleteRoutineTasks.slice(0, 4).map((task) => (
                <span
                  key={task.id}
                  style={{
                    borderRadius: 999,
                    padding: "6px 9px",
                    background: "#FFFFFF",
                    border: `1px solid ${colors.line}`,
                    color: colors.navy,
                    fontSize: 11,
                    fontWeight: 750,
                  }}
                >
                  {task.title}
                </span>
              ))}
              {incompleteRoutineTasks.length > 4 ? (
                <span
                  style={{
                    borderRadius: 999,
                    padding: "6px 9px",
                    color: "#64748B",
                    fontSize: 11,
                    fontWeight: 750,
                  }}
                >
                  +{incompleteRoutineTasks.length - 4} more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ padding: isMobile ? 14 : 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "minmax(0, 1.15fr) minmax(0, 1fr)",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          <HeroCard
            title="Priority Work"
            eyebrow={
              overdue.length
                ? `${overdue.length} overdue`
                : priorityWork.length
                  ? `${priorityWork.length} active priorities`
                  : "Everything current"
            }
            icon="!"
            colors={colors}
            onClick={onOpenWorkOrdersPage}
          >
            {visiblePriority.length ? (
              visiblePriority.map((item) => (
                <RowButton
                  key={item.id}
                  title={item.title}
                  detail={
                    item.date && item.date < today
                      ? `Overdue · ${shortDateLabel(item.date)}`
                      : item.date === today
                        ? "Due today"
                        : item.date
                          ? shortDateLabel(item.date)
                          : "No due date"
                  }
                  badge={item.priority || "Medium"}
                  badgeTone={
                    item.date && item.date < today
                      ? "danger"
                      : item.priority === "High"
                        ? "warning"
                        : "neutral"
                  }
                  onClick={() => onOpenWorkOrder(item.id)}
                  colors={colors}
                />
              ))
            ) : (
              <EmptyState
                icon="✓"
                title="No urgent work"
                detail="No high-priority or overdue work orders."
              />
            )}
          </HeroCard>

          <HeroCard
            title="Today’s Schedule"
            eyebrow={`${sortedTodayEvents.length} scheduled`}
            icon="▣"
            colors={colors}
            onClick={onOpenCalendarPage}
          >
            {visibleSchedule.length ? (
              visibleSchedule.map((item) => (
                <RowButton
                  key={item.instanceId || item.id}
                  title={item.title}
                  detail={item.allDay ? "All day" : item.time || "No time"}
                  badge={item.linkedType || item.categoryLabel || "Event"}
                  badgeTone="info"
                  onClick={() => onOpenCalendar(item)}
                  colors={colors}
                />
              ))
            ) : (
              <EmptyState
                icon="○"
                title="Open schedule"
                detail="No calendar events are scheduled today."
              />
            )}
          </HeroCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginTop: 14,
          }}
        >
          <StandardCard title="Today’s Progress" icon="✓" colors={colors}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 900, color: colors.navy }}>
                {progressPercent}%
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {completedToday.length} of {totalTodayItems || 0} complete
              </div>
            </div>

            <div
              style={{
                height: 10,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(15,31,48,0.08)",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: colors.gold,
                  transition: "width 180ms ease",
                }}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.5, opacity: 0.66 }}>
              Based on work orders due today and completed today.
            </div>
          </StandardCard>

          <StandardCard title="Estate Health" icon="◆" colors={colors}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: `7px solid ${healthColor}`,
                  fontSize: 21,
                  fontWeight: 950,
                  color: colors.navy,
                  flex: "0 0 auto",
                }}
              >
                {healthScore}
              </div>

              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{healthLabel}</div>
                <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.45, opacity: 0.62 }}>
                  {overdue.length
                    ? `${overdue.length} overdue item${overdue.length === 1 ? "" : "s"} lowering the score.`
                    : "No overdue work is affecting the score."}
                </div>
              </div>
            </div>
          </StandardCard>

          <StandardCard title="Today’s Conditions" icon={todayWeather ? weatherIcon(todayWeather.code) : "◌"} colors={colors}>
            {todayWeather ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: colors.navy }}>
                    {Math.round(todayWeather.high)}°
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>
                    {weatherCondition(todayWeather.code)}
                  </span>
                </div>
                <div style={{ marginTop: 7, fontSize: 13, lineHeight: 1.55, opacity: 0.76 }}>
                  {weatherAdvice}
                </div>
                <div style={{ marginTop: 9, fontSize: 11, opacity: 0.55 }}>
                  Low {Math.round(todayWeather.low)}° · Rain {Math.round(todayWeather.precipChance)}% · Wind {Math.round(todayWeather.windMax)} mph
                </div>
              </>
            ) : (
              <EmptyState
                icon="◌"
                title="Weather unavailable"
                detail="The dashboard will update when weather data loads."
              />
            )}
          </StandardCard>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : vendorEvents.length
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(2, minmax(0, 1fr))",
            gap: 14,
            marginTop: 14,
          }}
        >
          {vendorEvents.length > 0 && (
            <StandardCard title="Vendors Today" icon="◆" colors={colors}>
              {vendorEvents.slice(0, 4).map((item) => (
                <RowButton
                  key={item.instanceId || item.id}
                  title={item.linkedName || item.title}
                  detail={item.allDay ? "All day" : item.time || "No time"}
                  badge="Vendor"
                  badgeTone="info"
                  onClick={() => onOpenCalendar(item)}
                  colors={colors}
                />
              ))}
            </StandardCard>
          )}

          <StandardCard title="Upcoming" icon="→" colors={colors} onClick={onOpenCalendarPage}>
            {visibleUpcoming.length ? (
              visibleUpcoming.map((item) => (
                <RowButton
                  key={item.instanceId || item.id}
                  title={item.title}
                  detail={`${shortDateLabel(item.date)}${
                    item.allDay ? " · All day" : item.time ? ` · ${item.time}` : ""
                  }`}
                  badge={item.linkedType || "Event"}
                  badgeTone="neutral"
                  onClick={() => onOpenCalendar(item)}
                  colors={colors}
                />
              ))
            ) : (
              <EmptyState
                icon="○"
                title="Nothing upcoming"
                detail="No future calendar events are currently shown."
              />
            )}
          </StandardCard>

          <StandardCard title="Atlas Notices" icon="i" colors={colors}>
            <NoticeLine
              count={assetsWithoutProcedure.length}
              label="assets without a linked procedure"
            />
            <NoticeLine
              count={workWithoutPhotos}
              label="open work orders without photos"
            />
            <NoticeLine count={overdue.length} label="overdue work orders" />
          </StandardCard>
        </div>

        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${colors.line}`,
            paddingTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <QuickAction
            label="Review overdue work"
            onClick={() =>
              onAskAtlas(
                "Review all overdue work orders, explain what needs attention first, and suggest a realistic completion order.",
              )
            }
          />
          <QuickAction
            label="Find missing procedures"
            onClick={() =>
              onAskAtlas(
                "Show important assets without linked procedures and recommend which procedures should be created first.",
              )
            }
          />
          <QuickAction
            label="Prepare management update"
            onClick={() =>
              onAskAtlas(
                "Prepare a concise management update covering completed work, open issues, vendor visits, upcoming work, and decisions needed.",
              )
            }
          />
        </div>
      </div>

      <style jsx global>{`
        .atlas-dashboard-shell {
          animation: atlas-dashboard-enter 220ms ease-out both;
        }

        .atlas-dashboard-card {
          transition:
            transform 170ms ease,
            box-shadow 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .atlas-dashboard-card-clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(15, 31, 48, 0.1);
          border-color: rgba(183, 148, 62, 0.48) !important;
        }

        .atlas-dashboard-card-clickable:active {
          transform: translateY(0) scale(0.995);
        }

        .atlas-dashboard-card-clickable:focus-visible,
        .atlas-row-button:focus-visible,
        .atlas-quick-action:focus-visible {
          outline: 3px solid rgba(183, 148, 62, 0.42);
          outline-offset: 2px;
        }

        .atlas-row-button {
          transition:
            padding-left 150ms ease,
            background 150ms ease;
          border-radius: 8px;
        }

        .atlas-row-button:hover {
          padding-left: 7px !important;
          background: rgba(15, 31, 48, 0.035) !important;
        }

        .atlas-row-button:active {
          background: rgba(15, 31, 48, 0.065) !important;
        }

        .atlas-quick-action {
          transition:
            transform 150ms ease,
            background 150ms ease,
            border-color 150ms ease;
        }

        .atlas-quick-action:hover {
          transform: translateY(-1px);
          background: rgba(183, 148, 62, 0.12) !important;
          border-color: rgba(183, 148, 62, 0.42) !important;
        }

        .atlas-focus-strip {
          animation: atlas-focus-enter 280ms ease-out 60ms both;
        }

        .atlas-mission-card {
          transition:
            transform 150ms ease,
            box-shadow 150ms ease,
            border-color 150ms ease;
        }

        .atlas-mission-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 18px rgba(15, 31, 48, 0.08);
          border-color: rgba(183, 148, 62, 0.42) !important;
        }

        .atlas-mission-card:active {
          transform: translateY(0);
        }

        .atlas-mission-card:focus-visible {
          outline: 3px solid rgba(183, 148, 62, 0.42);
          outline-offset: 2px;
        }

        @keyframes atlas-dashboard-enter {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes atlas-focus-enter {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .atlas-dashboard-shell,
          .atlas-focus-strip,
          .atlas-dashboard-card,
          .atlas-row-button,
          .atlas-quick-action {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 13,
        padding: "11px 12px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 850,
          opacity: 0.58,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 21,
          fontWeight: 950,
          color: accent || "#FFFFFF",
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 1, fontSize: 11, opacity: 0.6 }}>{detail}</div>
    </div>
  );
}

function HeroCard({
  title,
  eyebrow,
  icon,
  colors,
  onClick,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: string;
  colors: Props["colors"];
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="atlas-dashboard-card atlas-dashboard-card-clickable"
      style={{
        borderRadius: 18,
        padding: 16,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        cursor: "pointer",
        minWidth: 0,
        boxShadow: "0 5px 16px rgba(15,31,48,0.05)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
      }}
    >
      <CardHeader title={title} eyebrow={eyebrow} icon={icon} colors={colors} />
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function StandardCard({
  title,
  icon,
  colors,
  onClick,
  children,
}: {
  title: string;
  icon: string;
  colors: Props["colors"];
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`atlas-dashboard-card${onClick ? " atlas-dashboard-card-clickable" : ""}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        borderRadius: 16,
        padding: 15,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        cursor: onClick ? "pointer" : "default",
        minWidth: 0,
      }}
    >
      <CardHeader title={title} icon={icon} colors={colors} />
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function CardHeader({
  title,
  eyebrow,
  icon,
  colors,
}: {
  title: string;
  eyebrow?: string;
  icon: string;
  colors: Props["colors"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: "rgba(15,31,48,0.07)",
            display: "grid",
            placeItems: "center",
            fontWeight: 950,
            color: colors.navy,
            flex: "0 0 auto",
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 950,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
      </div>

      {eyebrow && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 750,
            opacity: 0.52,
            whiteSpace: "nowrap",
          }}
        >
          {eyebrow}
        </span>
      )}
    </div>
  );
}

function RowButton({
  title,
  detail,
  badge,
  badgeTone,
  onClick,
  colors,
}: {
  title: string;
  detail: string;
  badge: string;
  badgeTone: "danger" | "warning" | "info" | "neutral";
  onClick: () => void;
  colors: Props["colors"];
}) {
  const badgeStyles =
    badgeTone === "danger"
      ? { background: "rgba(217,112,112,0.13)", color: "#A94D4D" }
      : badgeTone === "warning"
        ? { background: "rgba(215,168,75,0.16)", color: "#946B16" }
        : badgeTone === "info"
          ? { background: "rgba(59,110,155,0.12)", color: "#315F85" }
          : { background: "rgba(15,31,48,0.07)", color: "#52606B" };

  return (
    <button
      className="atlas-row-button"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      style={{
        width: "100%",
        border: 0,
        borderTop: `1px solid ${colors.line}`,
        background: "transparent",
        padding: "10px 0 2px",
        textAlign: "left",
        cursor: "pointer",
        color: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 850,
              lineHeight: 1.35,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              lineHeight: 1.4,
              opacity: 0.57,
            }}
          >
            {detail}
          </div>
        </div>

        <span
          style={{
            ...badgeStyles,
            flex: "0 0 auto",
            borderRadius: 999,
            padding: "4px 7px",
            fontSize: 9,
            fontWeight: 850,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {badge}
        </span>
      </div>
    </button>
  );
}

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: "14px 4px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, opacity: 0.65 }}>{icon}</div>
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 850 }}>{title}</div>
      <div style={{ marginTop: 3, fontSize: 11, opacity: 0.55 }}>{detail}</div>
    </div>
  );
}

function NoticeLine({ count, label }: { count: number; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 9,
        padding: "8px 0",
        borderTop: "1px solid rgba(15,31,48,0.07)",
      }}
    >
      <strong style={{ minWidth: 22, fontSize: 16 }}>{count}</strong>
      <span style={{ fontSize: 12, opacity: 0.64 }}>{label}</span>
    </div>
  );
}

function QuickAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="atlas-quick-action"
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid rgba(15,31,48,0.1)",
        borderRadius: 999,
        padding: "8px 11px",
        background: "rgba(15,31,48,0.035)",
        color: "inherit",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 750,
      }}
    >
      {label} →
    </button>
  );
}
