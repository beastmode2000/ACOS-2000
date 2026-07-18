"use client";

import { useMemo, useState } from "react";
import type { ServiceRecord, WorkOrderPriority } from "../../lib/atlas-types";

type PlannerRecord = ServiceRecord & { assignedTo?: string };

export type WeeklyMaintenancePlanItem = {
  id: string;
  title: string;
  priority: WorkOrderPriority;
  assignedTo: string;
  date: string;
  selected: boolean;
};

type Props = {
  records: PlannerRecord[];
  today: string;
  isMobile: boolean;
  colors: { navy: string; gold: string; line: string; card: string; panel: string };
  saving: boolean;
  onGenerate: (prompt: string) => void;
  onSave: (items: WeeklyMaintenancePlanItem[]) => Promise<void>;
};

const DAY_MS = 86_400_000;

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function priorityRank(priority?: WorkOrderPriority) {
  return priority === "High" ? 0 : priority === "Medium" ? 1 : 2;
}

function buildDraft(records: PlannerRecord[], today: string) {
  return records
    .filter((record) => !["Completed", "Closed", "Cancelled"].includes(record.status))
    .sort((a, b) => {
      const overdueA = a.date && a.date < today ? 0 : 1;
      const overdueB = b.date && b.date < today ? 0 : 1;
      return (
        overdueA - overdueB ||
        priorityRank(a.priority) - priorityRank(b.priority) ||
        String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31"))
      );
    })
    .slice(0, 10)
    .map((record, index): WeeklyMaintenancePlanItem => ({
      id: record.id,
      title: record.title,
      priority: record.priority || "Medium",
      assignedTo: record.assignedTo || "",
      date: addDays(today, Math.min(index, 6)),
      selected: true,
    }));
}

export default function AskAtlasWeeklyMaintenancePlanner({
  records,
  today,
  isMobile,
  colors,
  saving,
  onGenerate,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WeeklyMaintenancePlanItem[]>([]);
  const [message, setMessage] = useState("");

  const activeCount = useMemo(
    () => records.filter((record) => !["Completed", "Closed", "Cancelled"].includes(record.status)).length,
    [records],
  );

  function generatePlan() {
    const next = buildDraft(records, today);
    setItems(next);
    setOpen(true);
    setMessage(
      next.length
        ? "Review every priority, assignment, and date. Nothing has been saved."
        : "No active maintenance work orders were found.",
    );
    onGenerate(
      "Build a concise seven-day maintenance plan from my active Atlas work orders. Prioritize overdue, high-priority, recurring, safety, generator, refrigeration, boiler, HVAC, and weather-sensitive work. Explain the order only; do not create or update anything.",
    );
  }

  function patchItem(id: string, patch: Partial<WeeklyMaintenancePlanItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <section
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 16,
        background: colors.card,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 16,
          background: colors.navy,
          color: "#fff",
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
        }}
      >
        <div>
          <div style={{ color: colors.gold, fontSize: 11, fontWeight: 950, letterSpacing: "0.11em", textTransform: "uppercase" }}>
            Ask Atlas Weekly Maintenance
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, marginTop: 4 }}>Plan next week</div>
          <div style={{ fontSize: 12, opacity: 0.78, marginTop: 3 }}>
            {activeCount} active work orders · review before saving
          </div>
        </div>
        <button
          type="button"
          onClick={generatePlan}
          style={{ border: 0, borderRadius: 10, background: colors.gold, color: colors.navy, padding: "10px 13px", fontWeight: 950, cursor: "pointer" }}
        >
          Generate Weekly Plan
        </button>
      </div>

      {open ? (
        <div style={{ padding: 14, display: "grid", gap: 10 }}>
          {message ? <div style={{ fontSize: 12, color: colors.navy }}>{message}</div> : null}
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "28px minmax(180px, 1.5fr) minmax(110px, .7fr) minmax(130px, .8fr) minmax(135px, .8fr)",
                gap: 10,
                alignItems: "center",
                background: colors.panel,
              }}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={(event) => patchItem(item.id, { selected: event.currentTarget.checked })}
                aria-label={`Include ${item.title}`}
                style={{ width: 19, height: 19 }}
              />
              <strong>{item.title}</strong>
              <select
                value={item.priority}
                onChange={(event) => patchItem(item.id, { priority: event.currentTarget.value as WorkOrderPriority })}
                style={{ width: "100%", minHeight: 40, border: `1px solid ${colors.line}`, borderRadius: 9, padding: "8px 10px", background: "#fff" }}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <input
                value={item.assignedTo}
                onChange={(event) => patchItem(item.id, { assignedTo: event.currentTarget.value })}
                placeholder="Assigned to"
                style={{ width: "100%", minHeight: 40, border: `1px solid ${colors.line}`, borderRadius: 9, padding: "8px 10px" }}
              />
              <input
                type="date"
                value={item.date}
                min={today}
                max={addDays(today, Math.round(7 * DAY_MS / DAY_MS))}
                onChange={(event) => patchItem(item.id, { date: event.currentTarget.value })}
                style={{ width: "100%", minHeight: 40, border: `1px solid ${colors.line}`, borderRadius: 9, padding: "8px 10px" }}
              />
            </div>
          ))}

          {items.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={saving || !items.some((item) => item.selected)}
                onClick={() => void onSave(items.filter((item) => item.selected))}
                style={{ border: 0, borderRadius: 10, background: colors.gold, color: colors.navy, padding: "10px 14px", fontWeight: 950, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving Plan..." : "Approve and Save Plan"}
              </button>
              <button
                type="button"
                onClick={() => { setItems([]); setOpen(false); setMessage("Plan canceled. Nothing was saved."); }}
                style={{ border: `1px solid ${colors.line}`, borderRadius: 10, background: "#fff", color: colors.navy, padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

