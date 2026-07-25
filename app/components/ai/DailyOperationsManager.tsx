"use client";

import { useEffect, useMemo, useState } from "react";
import AtlasHoverPreview, {
  type AtlasHoverPreviewData,
} from "../AtlasHoverPreview";
import AtlasFocusTarget, {
  focusTokensFromPreview,
} from "../AtlasFocusMode";
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

type VisitVendor = {
  id: string;
  name: string;
};

type VisitDraft = {
  vendorId: string;
  vendorName: string;
  contactName: string;
  time: string;
  purpose: string;
  notes: string;
  assetId: string;
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
  onOpenRoutinesPage?: () => void;
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

function calendarItemKey(item: CalendarItem) {
  return String(item.instanceId || item.id);
}

function nextRecurrenceDate(record: any, fromDate: string) {
  const parsed = new Date(`${fromDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fromDate;

  const interval = Math.max(
    1,
    Math.floor(Number(record.recurrenceInterval || 1)),
  );
  const unit = String(record.recurrenceUnit || "Weeks");

  if (unit === "Days") parsed.setDate(parsed.getDate() + interval);
  else if (unit === "Months") parsed.setMonth(parsed.getMonth() + interval);
  else if (unit === "Years")
    parsed.setFullYear(parsed.getFullYear() + interval);
  else parsed.setDate(parsed.getDate() + interval * 7);

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
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
  onOpenRoutinesPage,
  onAskAtlas,
}: Props) {
  const [routineOccurrence, setRoutineOccurrence] =
    useState<RoutineOccurrence | null>(null);
  const [routineLoading, setRoutineLoading] = useState(true);
  const [workOverrides, setWorkOverrides] = useState<
    Record<string, ServiceRecord>
  >({});
  const [calendarOverrides, setCalendarOverrides] = useState<
    Record<string, CalendarItem>
  >({});
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitVendors, setVisitVendors] = useState<VisitVendor[]>([]);
  const [visitSaving, setVisitSaving] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Record<string, string>>({});
  const [visitDraft, setVisitDraft] = useState<VisitDraft>({
    vendorId: "",
    vendorName: "",
    contactName: "",
    time: "",
    purpose: "",
    notes: "",
    assetId: "",
  });

  const effectiveServiceRecords = [
    ...serviceRecords.map((item) => workOverrides[item.id] || item),
    ...Object.values(workOverrides).filter(
      (item) => !serviceRecords.some((existing) => existing.id === item.id),
    ),
  ];

  const effectiveTodayEvents = [
    ...todayEvents.map(
      (item) => calendarOverrides[calendarItemKey(item)] || item,
    ),
    ...Object.values(calendarOverrides).filter(
      (item) =>
        item.date === today &&
        !todayEvents.some(
          (existing) => calendarItemKey(existing) === calendarItemKey(item),
        ),
    ),
  ];

  const effectiveUpcomingEvents = [
    ...upcomingEvents.map(
      (item) => calendarOverrides[calendarItemKey(item)] || item,
    ),
    ...Object.values(calendarOverrides).filter(
      (item) =>
        item.date > today &&
        !upcomingEvents.some(
          (existing) => calendarItemKey(existing) === calendarItemKey(item),
        ),
    ),
  ];

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

  function openRoutineChecklist() {
    if (onOpenRoutinesPage) {
      onOpenRoutinesPage();
      return;
    }

    window.dispatchEvent(
      new CustomEvent("atlas:navigate", {
        detail: { screen: "routines" },
      }),
    );
  }

  async function openVisitLogger() {
    setVisitOpen(true);
    setActionError("");

    if (visitVendors.length) return;

    try {
      const response = await fetch("/api/atlas", { cache: "no-store" });
      const payload = await response.json();
      const vendors = Array.isArray(payload?.vendorRecords)
        ? payload.vendorRecords
            .map((vendor: any) => ({
              id: String(vendor.id || ""),
              name: String(vendor.name || "").trim(),
            }))
            .filter((vendor: VisitVendor) => vendor.id && vendor.name)
            .sort((a: VisitVendor, b: VisitVendor) =>
              a.name.localeCompare(b.name),
            )
        : [];
      setVisitVendors(vendors);
    } catch {
      setVisitVendors([]);
    }
  }

  async function saveVisit() {
    const selectedVendor = visitVendors.find(
      (vendor) => vendor.id === visitDraft.vendorId,
    );
    const vendorName =
      selectedVendor?.name || visitDraft.vendorName.trim() || "Vendor";
    const purpose = visitDraft.purpose.trim() || "Onsite visit";
    const notes = [
      visitDraft.contactName.trim()
        ? `Contact: ${visitDraft.contactName.trim()}`
        : "",
      visitDraft.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    if (!vendorName.trim()) {
      setActionError("Enter or select a vendor.");
      return;
    }

    setVisitSaving(true);
    setActionError("");

    const timestamp = Date.now();
    const completedAt = new Date().toISOString();

    const calendarRecord = {
      id: `visit-calendar-${timestamp}`,
      date: today,
      time: visitDraft.time,
      title: `${vendorName} — ${purpose}`,
      area: "Vendor Visit",
      categoryLabel: "Vendor",
      colorId: "maintenance",
      allDay: !visitDraft.time,
      repeat: "None",
      reminder: "None",
      notes,
      linkedType: selectedVendor ? "Vendor" : undefined,
      linkedId: selectedVendor?.id || "",
      linkedName: vendorName,
      completed: true,
      status: "Completed",
      source: "manual",
    };

    const workRecord = {
      id: `vendor-visit-${timestamp}`,
      assetId: visitDraft.assetId,
      vendorId: selectedVendor?.id || "",
      date: today,
      title: `${vendorName} onsite — ${purpose}`,
      status: "Completed",
      priority: "Medium",
      notes,
      recurring: false,
      lastCompletedDate: today,
      completedAt,
      completionHistory: [today],
      workType: "Quick Task",
      workCategory: "Vendor Visit",
      photos: [],
      documents: [],
    };

    try {
      const [calendarResponse, workResponse] = await Promise.all([
        fetch("/api/atlas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "calendar", record: calendarRecord }),
        }),
        fetch("/api/atlas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "work_orders", record: workRecord }),
        }),
      ]);

      const [calendarPayload, workPayload] = await Promise.all([
        calendarResponse.json(),
        workResponse.json(),
      ]);

      if (!calendarResponse.ok || !calendarPayload?.ok) {
        throw new Error(
          calendarPayload?.error || "The calendar visit could not be saved.",
        );
      }

      if (!workResponse.ok || !workPayload?.ok) {
        throw new Error(
          workPayload?.error || "The visit history could not be saved.",
        );
      }

      setCalendarOverrides((current) => ({
        ...current,
        [calendarRecord.id]: calendarRecord as CalendarItem,
      }));
      setWorkOverrides((current) => ({
        ...current,
        [workRecord.id]: workRecord as ServiceRecord,
      }));
      setRecentlyCompleted((current) => ({
        ...current,
        [`work:${workRecord.id}`]: completedAt,
        [`calendar:${calendarRecord.id}`]: completedAt,
      }));
      setVisitOpen(false);
      setVisitDraft({
        vendorId: "",
        vendorName: "",
        contactName: "",
        time: "",
        purpose: "",
        notes: "",
        assetId: "",
      });

      window.dispatchEvent(
        new CustomEvent("atlas:data-changed", {
          detail: { table: "vendor_visit" },
        }),
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "The visit could not be saved.",
      );
    } finally {
      setVisitSaving(false);
    }
  }

  async function saveQuickWorkNote(item: ServiceRecord, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;

    const history = Array.isArray((item as any).notesHistory)
      ? [...((item as any).notesHistory as any[])]
      : [];
    history.push({
      id: `note-${Date.now()}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });

    const updated = { ...item, notesHistory: history } as ServiceRecord;
    setWorkOverrides((current) => ({ ...current, [item.id]: updated }));

    const response = await fetch("/api/atlas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "work_orders", record: updated }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Note could not be saved.");
    }
  }

  async function saveQuickCalendarNote(item: CalendarItem, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;

    const key = calendarItemKey(item);
    const updated = {
      ...item,
      notes: [item.notes, trimmed].filter(Boolean).join("\n\n"),
    } as CalendarItem;

    setCalendarOverrides((current) => ({ ...current, [key]: updated }));

    const response = await fetch("/api/atlas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "calendar", record: updated }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Note could not be saved.");
    }
  }

  async function toggleRoutineTask(taskId: string) {
    if (!routineOccurrence || busyAction) return;

    const previous = routineOccurrence;
    const optimistic: RoutineOccurrence = {
      ...previous,
      tasks: previous.tasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: !Boolean(task.completed) }
          : task,
      ),
    };

    setRoutineOccurrence(optimistic);
    setBusyAction(`routine:${taskId}`);
    setActionError("");

    try {
      const response = await fetch("/api/atlas-routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-task",
          date: today,
          taskId,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok || !payload?.occurrence) {
        throw new Error(
          payload?.error || "Routine task could not be updated.",
        );
      }

      setRoutineOccurrence(payload.occurrence);
    } catch (error) {
      setRoutineOccurrence(previous);
      setActionError(
        error instanceof Error
          ? error.message
          : "Routine task could not be updated.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function completeWorkOrder(item: ServiceRecord) {
    const actionId = `work:${item.id}`;
    if (busyAction) return;

    const previous = workOverrides[item.id];
    const history = Array.isArray((item as any).completionHistory)
      ? [...((item as any).completionHistory as unknown[])]
      : [];

    if (!history.includes(today)) history.push(today);

    const isRecurring = Boolean((item as any).recurring);
    const nextDate = isRecurring
      ? nextRecurrenceDate(item, String((item as any).date || today))
      : String((item as any).date || today);

    const updated = {
      ...item,
      status: isRecurring ? "Open" : "Completed",
      date: nextDate,
      lastCompletedDate: today,
      completedAt: new Date().toISOString(),
      completionHistory: history,
    } as ServiceRecord;

    setWorkOverrides((current) => ({ ...current, [item.id]: updated }));
    setRecentlyCompleted((current) => ({
      ...current,
      [actionId]: String((updated as any).completedAt || new Date().toISOString()),
    }));
    setBusyAction(actionId);
    setActionError("");

    try {
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "work_orders", record: updated }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error || "Work order could not be completed.",
        );
      }

      window.dispatchEvent(
        new CustomEvent("atlas:data-changed", {
          detail: { table: "work_orders", id: item.id },
        }),
      );
    } catch (error) {
      setWorkOverrides((current) => {
        const next = { ...current };
        if (previous) next[item.id] = previous;
        else delete next[item.id];
        return next;
      });
      setActionError(
        error instanceof Error
          ? error.message
          : "Work order could not be completed.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function completeCalendarItem(item: CalendarItem) {
    const key = calendarItemKey(item);
    const actionId = `calendar:${key}`;
    if (busyAction) return;

    const previous = calendarOverrides[key];
    const isOccurrence = Boolean(
      item.instanceId && item.instanceId !== item.id,
    );

    const updated = {
      ...item,
      id: isOccurrence ? String(item.instanceId) : item.id,
      originalId: isOccurrence
        ? String(item.originalId || item.id)
        : item.originalId,
      instanceId: isOccurrence ? String(item.instanceId) : item.instanceId,
      repeat: isOccurrence ? "None" : item.repeat,
      completed: true,
      status: "Completed",
    } as CalendarItem;

    setCalendarOverrides((current) => ({ ...current, [key]: updated }));
    setRecentlyCompleted((current) => ({
      ...current,
      [actionId]: new Date().toISOString(),
    }));
    setBusyAction(actionId);
    setActionError("");

    try {
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "calendar", record: updated }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error || "Calendar item could not be completed.",
        );
      }

      window.dispatchEvent(
        new CustomEvent("atlas:data-changed", {
          detail: { table: "calendar", id: updated.id },
        }),
      );
    } catch (error) {
      setCalendarOverrides((current) => {
        const next = { ...current };
        if (previous) next[key] = previous;
        else delete next[key];
        return next;
      });
      setActionError(
        error instanceof Error
          ? error.message
          : "Calendar item could not be completed.",
      );
    } finally {
      setBusyAction("");
    }
  }

  const sortedTodayEvents = [...effectiveTodayEvents].sort((a, b) => {
    if (Boolean(a.completed) !== Boolean(b.completed)) {
      return a.completed ? 1 : -1;
    }
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });

  const sortedUpcomingEvents = [...effectiveUpcomingEvents]
    .filter((item) => !item.completed && item.date > today)
    .sort((a, b) =>
      `${a.date} ${a.time || "99:99"}`.localeCompare(
        `${b.date} ${b.time || "99:99"}`,
      ),
    );

  const activeWork = effectiveServiceRecords.filter((item) => !isClosedStatus(item.status));
  const completedToday = effectiveServiceRecords.filter(
    (item) =>
      (item.status === "Completed" &&
        (item.date === today ||
          (item as any).lastCompletedDate === today)) ||
      (item as any).lastCompletedDate === today,
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

  const weatherSeverity = todayWeather
    ? todayWeather.precipChance >= 70 || todayWeather.windMax >= 28
      ? "alert"
      : todayWeather.precipChance >= 40 ||
          todayWeather.windMax >= 18 ||
          todayWeather.high >= 88 ||
          todayWeather.low <= 35
        ? "watch"
        : "ideal"
    : "unknown";

  const outdoorWindow = todayWeather
    ? todayWeather.precipChance >= 60
      ? { time: "Before 10:00 AM", rating: "Limited", reason: "Rain risk increases later; complete exposed work first." }
      : todayWeather.high >= 85
        ? { time: "7:00–11:00 AM", rating: "Best", reason: "Cooler temperatures favor landscaping, dock, and exterior work." }
        : todayWeather.windMax >= 20
          ? { time: "8:00 AM–Noon", rating: "Caution", reason: "Use the calmer morning period and avoid exposed ladder work." }
          : { time: "8:00 AM–3:00 PM", rating: "Excellent", reason: "Stable conditions support most exterior maintenance." }
    : { time: "Weather pending", rating: "Unknown", reason: "The work window will update when weather data loads." };

  const weatherTimeline = todayWeather
    ? [
        { time: "7 AM", temp: Math.round(todayWeather.low + (todayWeather.high - todayWeather.low) * 0.18), icon: weatherIcon(todayWeather.code), rain: Math.max(0, Math.round(todayWeather.precipChance * 0.55)) },
        { time: "9 AM", temp: Math.round(todayWeather.low + (todayWeather.high - todayWeather.low) * 0.38), icon: weatherIcon(todayWeather.code), rain: Math.max(0, Math.round(todayWeather.precipChance * 0.7)) },
        { time: "11 AM", temp: Math.round(todayWeather.low + (todayWeather.high - todayWeather.low) * 0.62), icon: weatherIcon(todayWeather.code), rain: Math.round(todayWeather.precipChance) },
        { time: "1 PM", temp: Math.round(todayWeather.low + (todayWeather.high - todayWeather.low) * 0.84), icon: weatherIcon(todayWeather.code), rain: Math.round(todayWeather.precipChance) },
        { time: "3 PM", temp: Math.round(todayWeather.high), icon: weatherIcon(todayWeather.code), rain: Math.max(0, Math.round(todayWeather.precipChance * 0.85)) },
        { time: "5 PM", temp: Math.round(todayWeather.low + (todayWeather.high - todayWeather.low) * 0.72), icon: weatherIcon(todayWeather.code), rain: Math.max(0, Math.round(todayWeather.precipChance * 0.65)) },
      ]
    : [];

  const propertyImpact = todayWeather
    ? [
        { label: "Landscaping", score: todayWeather.precipChance >= 60 ? 38 : todayWeather.high >= 88 ? 62 : 92 },
        { label: "Painting", score: todayWeather.precipChance >= 35 ? 24 : todayWeather.windMax >= 18 ? 58 : 90 },
        { label: "Dock & Marine", score: todayWeather.windMax >= 22 ? 32 : todayWeather.precipChance >= 60 ? 48 : 88 },
        { label: "Pool & Spa", score: todayWeather.precipChance >= 70 ? 52 : 86 },
        { label: "Roof / Ladder", score: todayWeather.windMax >= 18 || todayWeather.precipChance >= 35 ? 28 : 84 },
        { label: "Pressure Washing", score: todayWeather.windMax >= 22 ? 46 : 82 },
      ]
    : [];

  const aiRecommendations = todayWeather
    ? [
        todayWeather.precipChance >= 60
          ? "Move paint, roof, and pressure-washing work indoors or reschedule it."
          : "Exterior paint and inspection work have a workable weather window.",
        todayWeather.high >= 85
          ? "Run landscaping and dock tasks early; check irrigation after peak heat."
          : "Landscaping can remain in the normal daytime sequence.",
        todayWeather.windMax >= 20
          ? "Hold exposed ladder, tree, and loose-material work until wind drops."
          : "Dock and exterior access conditions are favorable.",
        vendorEvents.length
          ? `Confirm access, work area, and weather-sensitive scope for ${vendorEvents[0]?.linkedName || vendorEvents[0]?.title || "today’s vendor"}.`
          : "Use the open vendor window for preventive inspections or backlog cleanup.",
      ]
    : ["Weather recommendations will appear when conditions load."];

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const visibleSchedule = sortedTodayEvents.slice(0, 7);
  const visiblePriority = [...priorityWork, ...completedToday]
    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.id === item.id) === index,
    )
    .sort((a, b) => {
      const aDone =
        (a as any).lastCompletedDate === today || a.status === "Completed";
      const bDone =
        (b as any).lastCompletedDate === today || b.status === "Completed";
      return Number(aDone) - Number(bDone);
    })
    .slice(0, 7);
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

  const completedCalendarToday = effectiveTodayEvents.filter(
    (item) => item.completed,
  ).length;
  const totalWorkItems = dueToday.length + completedToday.length;
  const totalTodayItems =
    totalWorkItems + routineTasks.length + effectiveTodayEvents.length;
  const completedTodayItems =
    completedToday.length +
    completedRoutineTasks +
    completedCalendarToday;
  const progressPercent =
    totalTodayItems > 0
      ? Math.round((completedTodayItems / totalTodayItems) * 100)
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
      action?: () => void;
    }> = [];

    if (routineOccurrence) {
      items.push({
        id: "routine",
        title: routineOccurrence.name,
        detail: routineTasks.length
          ? `${completedRoutineTasks} of ${routineTasks.length} complete`
          : "No tasks added",
        tone: "routine",
        action:
          completedRoutineTasks < routineTasks.length
            ? openRoutineChecklist
            : undefined,
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
      action: undefined,
    });

    return items.slice(0, 4);
  }, [
    completedRoutineTasks,
    dueToday,
    onOpenCalendar,
    onOpenWorkOrder,
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
    <>
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

            <button
              type="button"
              onClick={() => void openVisitLogger()}
              style={{
                border: `1px solid ${colors.gold}88`,
                borderRadius: 999,
                padding: "9px 12px",
                background: "#FFFFFF",
                color: colors.navy,
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              + Log Visit
            </button>

            {actionError ? (
              <div
                role="alert"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "#FFF0EE",
                  border: "1px solid #F3C5BE",
                  color: "#9E2F24",
                  fontSize: 11,
                  fontWeight: 750,
                }}
              >
                {actionError}
              </div>
            ) : null}

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
                  disabled={!item.action}
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
                    cursor: item.action ? "pointer" : "default",
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

          {routineTasks.length ? (
            <div
              style={{
                marginTop: 11,
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
              }}
            >
              {[...routineTasks]
                .sort(
                  (a, b) =>
                    Number(Boolean(a.completed)) -
                    Number(Boolean(b.completed)),
                )
                .map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => void toggleRoutineTask(task.id)}
                    title={
                      task.completed
                        ? "Mark routine task not done"
                        : "Mark routine task done"
                    }
                    style={{
                      borderRadius: 999,
                      padding: "6px 9px",
                      background: task.completed ? "#EEF8F2" : "#FFFFFF",
                      border: `1px solid ${
                        task.completed ? "#B9D8C5" : colors.line
                      }`,
                      color: task.completed ? "#087443" : colors.navy,
                      fontSize: 11,
                      fontWeight: 750,
                      cursor: busyAction ? "wait" : "pointer",
                      textDecoration: task.completed ? "line-through" : "none",
                      opacity:
                        busyAction &&
                        busyAction !== `routine:${task.id}`
                          ? 0.55
                          : 1,
                      transition:
                        "background 180ms ease, transform 180ms ease, opacity 180ms ease",
                    }}
                  >
                    {busyAction === `routine:${task.id}`
                      ? "Saving…"
                      : `${task.completed ? "✓" : "○"} ${task.title}`}
                  </button>
                ))}
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
                  onDone={
                    (item as any).lastCompletedDate === today ||
                    item.status === "Completed"
                      ? undefined
                      : () => void completeWorkOrder(item)
                  }
                  doneBusy={busyAction === `work:${item.id}`}
                  completed={
                    (item as any).lastCompletedDate === today ||
                    item.status === "Completed"
                  }
                  completedAt={
                    recentlyCompleted[`work:${item.id}`] ||
                    String((item as any).completedAt || "")
                  }
                  nextDue={
                    item.recurring && item.date ? shortDateLabel(item.date) : ""
                  }
                  notes={
                    Array.isArray((item as any).notesHistory)
                      ? (item as any).notesHistory
                          .slice(-3)
                          .map((entry: any) => String(entry.text || ""))
                          .filter(Boolean)
                      : []
                  }
                  photoCount={(item.photos || []).length}
                  onAddNote={(note) => saveQuickWorkNote(item, note)}
                  onAddPhoto={() => onOpenWorkOrder(item.id)}
                  colors={colors}
                  isMobile={isMobile}
                  preview={{
                    kind: "Work Order",
                    title: item.title,
                    status: item.status || "Open",
                    summary:
                      item.date && item.date < today
                        ? `This work order is overdue and should be reviewed before lower-priority work.`
                        : item.date === today
                          ? "This work order is due today."
                          : "Active work currently included in the estate priority queue.",
                    fields: [
                      { label: "Priority", value: item.priority || "Medium" },
                      {
                        label: "Due",
                        value: item.date ? shortDateLabel(item.date) : "No due date",
                      },
                      { label: "Status", value: item.status || "Open" },
                      {
                        label: "Photos",
                        value: `${(item.photos || []).length}`,
                      },
                    ],
                  }}
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
                  onDone={
                    item.completed
                      ? undefined
                      : () => void completeCalendarItem(item)
                  }
                  doneBusy={
                    busyAction ===
                    `calendar:${calendarItemKey(item)}`
                  }
                  completed={Boolean(item.completed)}
                  completedAt={
                    recentlyCompleted[
                      `calendar:${calendarItemKey(item)}`
                    ] || ""
                  }
                  notes={item.notes ? [item.notes] : []}
                  photoCount={0}
                  onAddNote={(note) => saveQuickCalendarNote(item, note)}
                  onAddPhoto={() => onOpenCalendar(item)}
                  colors={colors}
                  isMobile={isMobile}
                  preview={{
                    kind: "Calendar Event",
                    title: item.title,
                    status: item.allDay ? "All day" : item.time || "Scheduled",
                    summary: item.linkedName
                      ? `Scheduled event linked to ${item.linkedName}.`
                      : "Scheduled estate calendar event.",
                    fields: [
                      { label: "Date", value: shortDateLabel(item.date) },
                      {
                        label: "Time",
                        value: item.allDay ? "All day" : item.time || "No time",
                      },
                      {
                        label: "Type",
                        value: item.linkedType || item.categoryLabel || "Event",
                      },
                      {
                        label: "Linked",
                        value: item.linkedName || "Not linked",
                      },
                    ],
                  }}
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
                {completedTodayItems} of {totalTodayItems || 0} complete
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
              Includes today’s routine, work orders, and calendar items.
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

          <StandardCard title="Daily Work Focus" icon="◎" colors={colors}>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: colors.navy, fontWeight: 750 }}>
              {todayFocus[0]}
            </div>
            {todayFocus.slice(1).map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  paddingTop: 8,
                  borderTop: `1px solid ${colors.line}`,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: "#64748B",
                }}
              >
                {item}
              </div>
            ))}
          </StandardCard>
        </div>

        <WeatherCommandCenter
          weather={todayWeather}
          timeline={weatherTimeline}
          outdoorWindow={outdoorWindow}
          severity={weatherSeverity}
          recommendations={aiRecommendations}
          impacts={propertyImpact}
          colors={colors}
          isMobile={isMobile}
          onAskAtlas={onAskAtlas}
        />

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
                  detail={
                    item.completed
                      ? `${item.linkedName || item.title} was onsite${
                          item.time ? ` · ${item.time}` : ""
                        }${
                          item.notes?.includes("Contact:")
                            ? ` · ${item.notes.split("\n")[0].replace("Contact:", "").trim()}`
                            : ""
                        }`
                      : item.allDay
                        ? "All day"
                        : item.time || "No time"
                  }
                  badge={item.completed ? "Completed" : "Vendor"}
                  badgeTone={item.completed ? "neutral" : "info"}
                  onClick={() => onOpenCalendar(item)}
                  onDone={
                    item.completed
                      ? undefined
                      : () => void completeCalendarItem(item)
                  }
                  doneBusy={
                    busyAction ===
                    `calendar:${calendarItemKey(item)}`
                  }
                  completed={Boolean(item.completed)}
                  completedAt={
                    recentlyCompleted[
                      `calendar:${calendarItemKey(item)}`
                    ] || ""
                  }
                  notes={item.notes ? [item.notes] : []}
                  colors={colors}
                  isMobile={isMobile}
                  preview={{
                    kind: "Vendor Visit",
                    title: item.linkedName || item.title,
                    status: item.allDay ? "All day" : item.time || "Scheduled",
                    summary: `Vendor activity scheduled for ${shortDateLabel(item.date)}.`,
                    fields: [
                      { label: "Date", value: shortDateLabel(item.date) },
                      {
                        label: "Arrival",
                        value: item.allDay ? "All day" : item.time || "No time",
                      },
                      {
                        label: "Event",
                        value: item.title,
                      },
                      {
                        label: "Area",
                        value: item.area || item.categoryLabel || "Not specified",
                      },
                    ],
                  }}
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
                  isMobile={isMobile}
                  preview={{
                    kind: "Upcoming Event",
                    title: item.title,
                    status: shortDateLabel(item.date),
                    summary: item.linkedName
                      ? `Upcoming event linked to ${item.linkedName}.`
                      : "Upcoming estate calendar event.",
                    fields: [
                      { label: "Date", value: shortDateLabel(item.date) },
                      {
                        label: "Time",
                        value: item.allDay ? "All day" : item.time || "No time",
                      },
                      {
                        label: "Type",
                        value: item.linkedType || item.categoryLabel || "Event",
                      },
                      {
                        label: "Linked",
                        value: item.linkedName || "Not linked",
                      },
                    ],
                  }}
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

        @keyframes atlas-completed-pop {
          from {
            opacity: 0.35;
            transform: translateY(-3px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .atlas-completed-row {
          animation: atlas-completed-pop 220ms ease-out both;
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

      <VisitLoggerModal
        open={visitOpen}
        saving={visitSaving}
        vendors={visitVendors}
        assets={assets}
        draft={visitDraft}
        colors={colors}
        isMobile={isMobile}
        error={actionError}
        onChange={setVisitDraft}
        onClose={() => {
          if (!visitSaving) setVisitOpen(false);
        }}
        onSave={() => void saveVisit()}
      />
    </>
  );
}


function VisitLoggerModal({
  open,
  saving,
  vendors,
  assets,
  draft,
  colors,
  isMobile,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  vendors: VisitVendor[];
  assets: AssetRecord[];
  draft: VisitDraft;
  colors: Props["colors"];
  isMobile: boolean;
  error: string;
  onChange: React.Dispatch<React.SetStateAction<VisitDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    minHeight: 42,
    borderRadius: 10,
    border: `1px solid ${colors.line}`,
    padding: "0 10px",
    background: "#FFFFFF",
    color: colors.navy,
    font: "inherit",
  };

  const fieldStyle: React.CSSProperties = {
    display: "grid",
    gap: 5,
    fontSize: 11,
    fontWeight: 850,
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(7, 27, 47, 0.56)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log vendor visit"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 18,
          background: "#FFFFFF",
          border: `1px solid ${colors.line}`,
          boxShadow: "0 24px 70px rgba(7,27,47,0.28)",
          padding: isMobile ? 16 : 20,
          color: colors.navy,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                color: colors.gold,
                fontSize: 10,
                fontWeight: 950,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Quick History Entry
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 22 }}>
              Log Vendor Visit
            </h3>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 12,
                color: "#64748B",
              }}
            >
              Saves the visit to the calendar, vendor-linked history, and linked
              asset history.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            style={{
              border: 0,
              background: "transparent",
              fontSize: 22,
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <label style={fieldStyle}>
            Vendor
            <select
              value={draft.vendorId}
              onChange={(event) => {
                const vendor = vendors.find(
                  (item) => item.id === event.target.value,
                );
                onChange((current) => ({
                  ...current,
                  vendorId: event.target.value,
                  vendorName: vendor?.name || current.vendorName,
                }));
              }}
              style={inputStyle}
            >
              <option value="">Enter vendor manually</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>

          {!draft.vendorId ? (
            <label style={fieldStyle}>
              Vendor name
              <input
                value={draft.vendorName}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    vendorName: event.target.value,
                  }))
                }
                placeholder="Sunstream"
                style={inputStyle}
              />
            </label>
          ) : null}

          <label style={fieldStyle}>
            Contact
            <input
              value={draft.contactName}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  contactName: event.target.value,
                }))
              }
              placeholder="Shaman"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Time
            <input
              type="time"
              value={draft.time}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Linked asset
            <select
              value={draft.assetId}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  assetId: event.target.value,
                }))
              }
              style={inputStyle}
            >
              <option value="">No asset</option>
              {[...assets]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <label style={{ ...fieldStyle, marginTop: 12 }}>
          Purpose
          <input
            value={draft.purpose}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                purpose: event.target.value,
              }))
            }
            placeholder="Last-minute dock lift service"
            style={inputStyle}
          />
        </label>

        <label style={{ ...fieldStyle, marginTop: 12 }}>
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            placeholder="What was inspected, repaired, found, or recommended?"
            rows={5}
            style={{
              ...inputStyle,
              minHeight: 110,
              padding: 10,
              resize: "vertical",
            }}
          />
        </label>

        {error ? (
          <div
            style={{
              marginTop: 12,
              borderRadius: 10,
              padding: "9px 10px",
              background: "#FFF1F1",
              color: "#A94D4D",
              fontSize: 11,
              fontWeight: 750,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 9,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 10,
              padding: "10px 13px",
              background: "#FFFFFF",
              color: colors.navy,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "10px 14px",
              background: colors.navy,
              color: "#FFFFFF",
              fontWeight: 900,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.65 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Visit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WeatherCommandCenter({
  weather,
  timeline,
  outdoorWindow,
  severity,
  recommendations,
  impacts,
  colors,
  isMobile,
  onAskAtlas,
}: {
  weather: WeatherDay | null;
  timeline: Array<{ time: string; temp: number; icon: string; rain: number }>;
  outdoorWindow: { time: string; rating: string; reason: string };
  severity: string;
  recommendations: string[];
  impacts: Array<{ label: string; score: number }>;
  colors: Props["colors"];
  isMobile: boolean;
  onAskAtlas: (prompt: string) => void;
}) {
  const severityLabel =
    severity === "alert"
      ? "Weather Alert"
      : severity === "watch"
        ? "Conditions Watch"
        : severity === "ideal"
          ? "Ideal Conditions"
          : "Weather Pending";

  const severityTone =
    severity === "alert"
      ? { bg: "#FFF0EE", border: "#F3C5BE", text: "#A7352A" }
      : severity === "watch"
        ? { bg: "#FFF8E8", border: "#EBCF8F", text: "#8A6500" }
        : { bg: "#EEF8F2", border: "#B9D8C5", text: "#087443" };

  return (
    <section
      style={{
        marginBottom: 14,
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${colors.line}`,
        background: colors.panel,
        boxShadow: "0 8px 24px rgba(15,31,48,0.07)",
      }}
    >
      <div
        style={{
          padding: isMobile ? 16 : 20,
          background: `linear-gradient(135deg, ${colors.navy} 0%, #24516F 62%, #2E6587 100%)`,
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ color: colors.gold, fontSize: 10, fontWeight: 950, letterSpacing: "0.11em", textTransform: "uppercase" }}>
              Operations Weather Center
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 7 }}>
              <span style={{ fontSize: 38 }}>{weather ? weatherIcon(weather.code) : "◌"}</span>
              <div>
                <div style={{ fontSize: isMobile ? 31 : 38, lineHeight: 1, fontWeight: 950 }}>
                  {weather ? `${Math.round(weather.high)}°` : "—"}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8, fontWeight: 750 }}>
                  {weather ? weatherCondition(weather.code) : "Weather unavailable"}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              minWidth: isMobile ? 0 : 330,
            }}
          >
            <WeatherStat label="Low" value={weather ? `${Math.round(weather.low)}°` : "—"} />
            <WeatherStat label="Rain" value={weather ? `${Math.round(weather.precipChance)}%` : "—"} />
            <WeatherStat label="Wind" value={weather ? `${Math.round(weather.windMax)} mph` : "—"} />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 3,
          }}
        >
          {timeline.length ? timeline.map((hour) => (
            <div
              key={hour.time}
              style={{
                minWidth: 86,
                padding: "10px 9px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.11)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, opacity: 0.65, fontWeight: 800 }}>{hour.time}</div>
              <div style={{ marginTop: 4, fontSize: 19 }}>{hour.icon}</div>
              <div style={{ marginTop: 2, fontSize: 16, fontWeight: 900 }}>{hour.temp}°</div>
              <div style={{ marginTop: 2, fontSize: 9, opacity: 0.58 }}>{hour.rain}% rain</div>
            </div>
          )) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Hourly conditions will appear when weather loads.</div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? 14 : 18,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
        }}
      >
        <div style={{ borderRadius: 15, padding: 14, border: `1px solid ${colors.line}`, background: "#FFFFFF" }}>
          <div style={{ fontSize: 10, fontWeight: 950, color: colors.gold, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            Best Outdoor Work Window
          </div>
          <div style={{ marginTop: 6, fontSize: 21, fontWeight: 950, color: colors.navy }}>{outdoorWindow.time}</div>
          <div style={{ marginTop: 5, display: "inline-flex", borderRadius: 999, padding: "5px 8px", background: severityTone.bg, border: `1px solid ${severityTone.border}`, color: severityTone.text, fontSize: 10, fontWeight: 900 }}>
            {outdoorWindow.rating}
          </div>
          <div style={{ marginTop: 9, fontSize: 12, lineHeight: 1.5, color: "#64748B" }}>{outdoorWindow.reason}</div>
        </div>

        <div style={{ borderRadius: 15, padding: 14, border: `1px solid ${severityTone.border}`, background: severityTone.bg }}>
          <div style={{ fontSize: 10, fontWeight: 950, color: severityTone.text, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            Weather Status
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, color: colors.navy }}>{severityLabel}</div>
          <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.5, color: "#64748B" }}>
            {weather
              ? severity === "alert"
                ? "Weather is likely to materially affect exterior operations."
                : severity === "watch"
                  ? "Plan around heat, wind, rain, or cold-sensitive work."
                  : "Conditions support normal exterior operations."
              : "Waiting for the latest property forecast."}
          </div>
        </div>

        <div style={{ borderRadius: 15, padding: 14, border: `1px solid ${colors.line}`, background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 950, color: colors.gold, letterSpacing: "0.09em", textTransform: "uppercase" }}>
              Estate AI Recommendations
            </div>
            <button
              type="button"
              onClick={() => onAskAtlas("Build a weather-aware estate operations plan for today, including outdoor work windows, vendor timing, irrigation, dock, pool, landscaping, painting, and safety constraints.")}
              style={{ border: 0, borderRadius: 999, padding: "5px 8px", background: colors.navy, color: "#FFFFFF", fontSize: 9, fontWeight: 900, cursor: "pointer" }}
            >
              Expand
            </button>
          </div>
          <div style={{ marginTop: 7, display: "grid", gap: 6 }}>
            {recommendations.slice(0, 3).map((item, index) => (
              <div key={`${item}-${index}`} style={{ fontSize: 11, lineHeight: 1.45, color: "#526274" }}>
                • {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: isMobile ? "0 14px 14px" : "0 18px 18px" }}>
        <div style={{ borderRadius: 15, border: `1px solid ${colors.line}`, padding: 14, background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 11 }}>
            <div style={{ fontSize: 12, fontWeight: 950, color: colors.navy }}>Property Impact</div>
            <div style={{ fontSize: 10, color: "#64748B" }}>Suitability for today’s conditions</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 9 }}>
            {impacts.length ? impacts.map((impact) => (
              <div key={impact.label} style={{ padding: "9px 10px", borderRadius: 11, background: colors.panel, border: `1px solid ${colors.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, fontWeight: 850, color: colors.navy }}>
                  <span>{impact.label}</span>
                  <span>{impact.score}</span>
                </div>
                <div style={{ marginTop: 6, height: 6, borderRadius: 99, overflow: "hidden", background: "#E7EDF2" }}>
                  <div style={{ width: `${impact.score}%`, height: "100%", borderRadius: 99, background: impact.score >= 80 ? "#65B985" : impact.score >= 55 ? "#D7A84B" : "#D97070" }} />
                </div>
              </div>
            )) : (
              <div style={{ fontSize: 12, color: "#64748B" }}>Impact scoring will appear when weather loads.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WeatherStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "9px 10px", borderRadius: 11, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.11)" }}>
      <div style={{ fontSize: 9, opacity: 0.58, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 850 }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 14, fontWeight: 900 }}>{value}</div>
    </div>
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
  onDone,
  doneBusy = false,
  completed = false,
  completedAt = "",
  nextDue = "",
  notes = [],
  photoCount = 0,
  onAddNote,
  onAddPhoto,
  colors,
  preview,
  isMobile = false,
}: {
  title: string;
  detail: string;
  badge: string;
  badgeTone: "danger" | "warning" | "info" | "neutral";
  onClick: () => void;
  onDone?: () => void;
  doneBusy?: boolean;
  completed?: boolean;
  completedAt?: string;
  nextDue?: string;
  notes?: string[];
  photoCount?: number;
  onAddNote?: (note: string) => Promise<void>;
  onAddPhoto?: () => void;
  colors: Props["colors"];
  preview?: AtlasHoverPreviewData;
  isMobile?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteWindowOpen, setNoteWindowOpen] = useState(false);

  useEffect(() => {
    if (!completedAt) {
      setNoteWindowOpen(false);
      return;
    }

    const completedTime = new Date(completedAt).getTime();
    if (!Number.isFinite(completedTime)) return;

    const remaining = 30_000 - (Date.now() - completedTime);
    if (remaining <= 0) {
      setNoteWindowOpen(false);
      return;
    }

    setNoteWindowOpen(true);
    const timer = window.setTimeout(() => setNoteWindowOpen(false), remaining);
    return () => window.clearTimeout(timer);
  }, [completedAt]);

  const badgeStyles =
    badgeTone === "danger"
      ? { background: "rgba(217,112,112,0.13)", color: "#A94D4D" }
      : badgeTone === "warning"
        ? { background: "rgba(215,168,75,0.16)", color: "#946B16" }
        : badgeTone === "info"
          ? { background: "rgba(59,110,155,0.12)", color: "#315F85" }
          : { background: "rgba(15,31,48,0.07)", color: "#52606B" };

  const completionLabel = completedAt
    ? new Date(completedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  async function submitQuickNote() {
    if (!onAddNote || !quickNote.trim() || noteSaving) return;
    setNoteSaving(true);
    try {
      await onAddNote(quickNote);
      setQuickNote("");
      setNoteWindowOpen(false);
    } finally {
      setNoteSaving(false);
    }
  }

  return (
    <AtlasFocusTarget
      id={`dashboard-row-${title}-${detail}`}
      tokens={focusTokensFromPreview(preview, title)}
      className="atlas-preview-anchor"
    >
      <div
        className={completed ? "atlas-completed-row" : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: onDone ? "minmax(0, 1fr) auto" : "1fr",
          alignItems: "center",
          gap: 8,
          borderTop: `1px solid ${completed ? "#B9D8C5" : colors.line}`,
          padding: completed ? 9 : "8px 0 0",
          borderRadius: completed ? 11 : 0,
          background: completed ? "#F1F9F4" : "transparent",
          transition:
            "background 180ms ease, transform 180ms ease, opacity 180ms ease",
        }}
      >
        <button
          className="atlas-row-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (completed) {
              setExpanded((current) => !current);
              return;
            }
            onClick();
          }}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            padding: preview && isMobile ? "2px 34px 2px 0" : "2px 0",
            textAlign: "left",
            cursor: "pointer",
            color: completed ? "#087443" : "inherit",
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
                  textDecoration: completed ? "line-through" : "none",
                }}
              >
                {completed ? "✓ " : ""}
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
                {completed && completionLabel
                  ? `Completed ${completionLabel}`
                  : detail}
                {completed && nextDue ? ` · Next due ${nextDue}` : ""}
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
              {completed ? "Done" : badge}
            </span>
          </div>
        </button>

        {onDone ? (
          <button
            type="button"
            disabled={doneBusy}
            onClick={(event) => {
              event.stopPropagation();
              onDone();
            }}
            style={{
              minWidth: 54,
              border: `1px solid ${doneBusy ? colors.line : "#B9D8C5"}`,
              borderRadius: 999,
              padding: "7px 9px",
              background: doneBusy ? "#F4F6F8" : "#EEF8F2",
              color: doneBusy ? "#64748B" : "#087443",
              cursor: doneBusy ? "wait" : "pointer",
              fontSize: 10,
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {doneBusy ? "Saving…" : "✓ Done"}
          </button>
        ) : null}

        {completed && expanded ? (
          <div
            style={{
              gridColumn: "1 / -1",
              borderTop: "1px solid #D9EBDD",
              paddingTop: 9,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "#416655", lineHeight: 1.5 }}>
              {notes.length
                ? notes.map((note, index) => (
                    <div key={`${note}-${index}`}>• {note}</div>
                  ))
                : "No completion notes yet."}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClick();
                }}
                style={{
                  border: "1px solid #B9D8C5",
                  borderRadius: 999,
                  padding: "6px 9px",
                  background: "#FFFFFF",
                  color: "#087443",
                  fontSize: 10,
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                Open record
              </button>

              {onAddPhoto ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddPhoto();
                  }}
                  style={{
                    border: "1px solid #B9D8C5",
                    borderRadius: 999,
                    padding: "6px 9px",
                    background: "#FFFFFF",
                    color: "#087443",
                    fontSize: 10,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  + Add Photo{photoCount ? ` (${photoCount})` : ""}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {completed && noteWindowOpen && onAddNote ? (
          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
              gap: 7,
              alignItems: "center",
            }}
          >
            <input
              value={quickNote}
              onChange={(event) => setQuickNote(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitQuickNote();
                }
              }}
              placeholder="Add a quick completion note…"
              style={{
                minHeight: 36,
                borderRadius: 9,
                border: "1px solid #B9D8C5",
                padding: "0 9px",
                fontSize: 11,
              }}
            />
            <button
              type="button"
              disabled={noteSaving || !quickNote.trim()}
              onClick={(event) => {
                event.stopPropagation();
                void submitQuickNote();
              }}
              style={{
                minHeight: 36,
                border: 0,
                borderRadius: 9,
                padding: "0 11px",
                background: "#087443",
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: 900,
                cursor: noteSaving ? "wait" : "pointer",
                opacity: noteSaving || !quickNote.trim() ? 0.55 : 1,
              }}
            >
              {noteSaving ? "Saving…" : "Save Note"}
            </button>
          </div>
        ) : null}
      </div>

      {preview ? (
        <AtlasHoverPreview data={preview} isMobile={isMobile} onOpen={onClick} />
      ) : null}
    </AtlasFocusTarget>
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
