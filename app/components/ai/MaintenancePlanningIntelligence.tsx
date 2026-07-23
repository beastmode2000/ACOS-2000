"use client";

import { useMemo, useState } from "react";
import type {
  AssetRecord,
  ProcedureRecord,
  ServiceRecord,
  WeatherDay,
  WorkOrderRecurrenceUnit,
  WorkSeason,
} from "../../lib/atlas-types";

export type MaintenanceSuggestion = {
  id: string;
  title: string;
  procedureId: string;
  assetId: string;
  assetName: string;
  reason: string;
  interval: number;
  unit: WorkOrderRecurrenceUnit;
  season: WorkSeason;
  priority: "Low" | "Medium" | "High";
};

type Props = {
  assets: AssetRecord[];
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
  onCreatePreventiveMaintenance: (
    suggestion: MaintenanceSuggestion,
  ) => Promise<void>;
  onOpenWorkOrder: (id: string) => void;
  onOpenPlanner: () => void;
  onAskAtlas: (prompt: string) => void;
};

function dateValue(date: string) {
  const value = new Date(`${date}T12:00:00`).getTime();
  return Number.isFinite(value) ? value : 0;
}

function daysBetween(first: string, second: string) {
  return Math.round((dateValue(second) - dateValue(first)) / 86_400_000);
}

function suggestionSchedule(title: string, category: string) {
  const text = `${title} ${category}`.toLowerCase();

  if (/filter|water treatment|fountain|pool|spa|turf|dog/.test(text)) {
    return { interval: 1, unit: "Weeks" as const };
  }
  if (/generator|boiler|hvac|irrigation|vehicle|boat|lift/.test(text)) {
    return { interval: 1, unit: "Months" as const };
  }
  if (/roof|gutter|winter|spring|seasonal|dock inspection/.test(text)) {
    return { interval: 3, unit: "Months" as const };
  }
  return { interval: 1, unit: "Months" as const };
}

function seasonForSuggestion(title: string): WorkSeason {
  const text = title.toLowerCase();
  if (/winter|freeze|snow|generator/.test(text)) return "Winter";
  if (/spring|irrigation activation|startup/.test(text)) return "Spring";
  if (/summer|dock|boat|watering|turf/.test(text)) return "Summer";
  if (/fall|winterize|gutter|leaf/.test(text)) return "Fall";
  return "Year-Round";
}

export default function MaintenancePlanningIntelligence({
  assets,
  procedures,
  serviceRecords,
  weatherDays,
  today,
  isMobile,
  colors,
  onCreatePreventiveMaintenance,
  onOpenWorkOrder,
  onOpenPlanner,
  onAskAtlas,
}: Props) {
  const [savingId, setSavingId] = useState("");
  const [draftSuggestion, setDraftSuggestion] =
    useState<MaintenanceSuggestion | null>(null);

  const activeWork = useMemo(
    () =>
      serviceRecords.filter(
        (record) =>
          !["Completed", "Closed", "Cancelled"].includes(record.status),
      ),
    [serviceRecords],
  );

  const overdueRecurring = useMemo(
    () =>
      activeWork
        .filter((record) => record.recurring && record.date && record.date < today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [activeWork, today],
  );

  const upcomingRecurring = useMemo(
    () =>
      activeWork
        .filter((record) => record.recurring && record.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [activeWork, today],
  );

  const dueWithin7 = useMemo(
    () =>
      upcomingRecurring
        .filter((record) => daysBetween(today, record.date) <= 7)
        .slice(0, 6),
    [today, upcomingRecurring],
  );

  const dueWithin14 = useMemo(
    () =>
      upcomingRecurring
        .filter((record) => daysBetween(today, record.date) <= 14)
        .slice(0, 6),
    [today, upcomingRecurring],
  );

  const dueWithin30 = useMemo(
    () =>
      upcomingRecurring
        .filter((record) => daysBetween(today, record.date) <= 30)
        .slice(0, 8),
    [today, upcomingRecurring],
  );

  const procedureReadiness = useMemo(
    () =>
      procedures
        .map((procedure) => {
          const issues: string[] = [];
          if (!String(procedure.purpose || "").trim())
            issues.push("missing purpose");
          if (!Array.isArray(procedure.steps) || !procedure.steps.length)
            issues.push("no steps");
          if (!String(procedure.safetyNotes || "").trim())
            issues.push("no safety notes");
          if (
            !String(procedure.toolsParts || "").trim() &&
            !(procedure.requiredTools || []).length &&
            !(procedure.requiredParts || []).length
          )
            issues.push("no tools or parts");
          if (
            !(procedure.linkedAssetIds || []).length &&
            !(procedure.linkedLocationIds || []).length
          )
            issues.push("not linked to an asset or location");
          if (procedure.status === "Draft") issues.push("still a draft");

          return {
            procedure,
            issues,
            ready: issues.length === 0,
          };
        })
        .sort(
          (left, right) =>
            right.issues.length - left.issues.length ||
            left.procedure.title.localeCompare(right.procedure.title),
        ),
    [procedures],
  );

  const readyProcedureCount = procedureReadiness.filter(
    (item) => item.ready,
  ).length;
  const proceduresNeedingReview = procedureReadiness.filter(
    (item) => !item.ready,
  );

  const suggestions = useMemo(() => {
    const results: MaintenanceSuggestion[] = [];

    for (const procedure of procedures) {
      const isMaintenanceProcedure =
        procedure.status === "Preventive Maintenance" ||
        /maintenance|inspection|service|clean|check|test/i.test(
          `${procedure.title} ${procedure.category || ""} ${procedure.purpose || ""}`,
        );

      if (!isMaintenanceProcedure) continue;

      const alreadyRecurring = serviceRecords.some(
        (record) => record.procedureId === procedure.id && record.recurring,
      );
      if (alreadyRecurring) continue;

      const linkedAssetId = procedure.linkedAssetIds?.[0] || "";
      const asset = assets.find((candidate) => candidate.id === linkedAssetId);
      const schedule = suggestionSchedule(
        procedure.title,
        procedure.category || "",
      );

      results.push({
        id: `pm-suggestion-${procedure.id}`,
        title: procedure.title,
        procedureId: procedure.id,
        assetId: linkedAssetId,
        assetName: asset?.name || "",
        reason: asset
          ? `This procedure is linked to ${asset.name} but does not have recurring maintenance.`
          : "This maintenance procedure does not have a recurring work order.",
        interval: schedule.interval,
        unit: schedule.unit,
        season: seasonForSuggestion(procedure.title),
        priority:
          procedure.priority === "High"
            ? "High"
            : procedure.priority === "Seasonal"
              ? "Medium"
              : "Medium",
      });

      if (results.length >= 6) break;
    }

    return results;
  }, [assets, procedures, serviceRecords]);

  const todayWeather = weatherDays.find((day) => day.date === today);
  const planningGuidance = todayWeather
    ? todayWeather.precipChance >= 60
      ? "Rain is likely. Favor indoor, mechanical, documentation, and covered-area work."
      : todayWeather.high >= 85
        ? "High heat is expected. Schedule outdoor maintenance early and reserve afternoon time for indoor work."
        : todayWeather.windMax >= 20
          ? "Strong wind is possible. Avoid exposed ladder, dock, and loose-material work."
          : "Conditions support a normal mix of outdoor and indoor maintenance."
    : "Weather guidance will appear when forecast data is available.";

  async function createSuggestion(suggestion: MaintenanceSuggestion) {
    setSavingId(suggestion.id);
    try {
      await onCreatePreventiveMaintenance(suggestion);
      setDraftSuggestion(null);
    } finally {
      setSavingId("");
    }
  }

  function updateDraft(patch: Partial<MaintenanceSuggestion>) {
    setDraftSuggestion((current) =>
      current ? { ...current, ...patch } : current,
    );
  }

  return (
    <section
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 20,
        background: colors.card,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: isMobile ? 16 : 20,
          background: colors.navy,
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
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
            Maintenance + Planning Intelligence
          </div>
          <h2 style={{ margin: "5px 0 4px", fontSize: isMobile ? 21 : 25 }}>
            Preventive Maintenance Center
          </h2>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {overdueRecurring.length} overdue · {dueWithin7.length} due within
            7 days · {dueWithin30.length} due within 30 days ·{" "}
            {suggestions.length} schedule suggestions · {readyProcedureCount}{" "}
            procedures ready
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenPlanner}
            style={{
              border: 0,
              borderRadius: 10,
              background: colors.gold,
              color: colors.navy,
              padding: "10px 13px",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Open Weekly Planner
          </button>
          <button
            type="button"
            onClick={() =>
              onAskAtlas(
                "Build a realistic seven-day maintenance plan using overdue preventive maintenance, upcoming recurring work, weather, priority, estimated effort, and property location. Leave room for unexpected work.",
              )
            }
            style={{
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 10,
              background: "transparent",
              color: "#fff",
              padding: "10px 13px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Build AI Weekly Plan
          </button>
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? "14px 14px 0" : "18px 18px 0",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(5, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <SummaryCard
          label="Overdue"
          value={overdueRecurring.length}
          detail="Recurring maintenance"
          colors={colors}
        />
        <SummaryCard
          label="Next 7 Days"
          value={dueWithin7.length}
          detail="Due soon"
          colors={colors}
        />
        <SummaryCard
          label="Next 14 Days"
          value={dueWithin14.length}
          detail="Planning window"
          colors={colors}
        />
        <SummaryCard
          label="Next 30 Days"
          value={dueWithin30.length}
          detail="Upcoming workload"
          colors={colors}
        />
        <SummaryCard
          label="Procedures Ready"
          value={readyProcedureCount}
          detail={`${proceduresNeedingReview.length} need review`}
          colors={colors}
        />
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
        <Panel title="Overdue Preventive Maintenance" colors={colors}>
          {overdueRecurring.length ? (
            overdueRecurring.map((record) => (
              <WorkRow
                key={record.id}
                title={record.title}
                detail={`Due ${record.date} · ${record.priority || "Medium"} priority`}
                onClick={() => onOpenWorkOrder(record.id)}
                colors={colors}
              />
            ))
          ) : (
            <Empty>No overdue recurring maintenance.</Empty>
          )}
        </Panel>

        <Panel title="Due Within 7 Days" colors={colors}>
          {dueWithin7.length ? (
            dueWithin7.map((record) => (
              <WorkRow
                key={record.id}
                title={record.title}
                detail={`${record.date} · Every ${record.recurrenceInterval || 1} ${
                  record.recurrenceUnit || "Weeks"
                }`}
                onClick={() => onOpenWorkOrder(record.id)}
                colors={colors}
              />
            ))
          ) : (
            <Empty>No recurring maintenance due within 7 days.</Empty>
          )}
        </Panel>

        <Panel title="Due Within 30 Days" colors={colors}>
          {dueWithin30.length ? (
            dueWithin30.map((record) => (
              <WorkRow
                key={record.id}
                title={record.title}
                detail={`${record.date} · ${record.priority || "Medium"} priority`}
                onClick={() => onOpenWorkOrder(record.id)}
                colors={colors}
              />
            ))
          ) : (
            <Empty>No recurring maintenance due within 30 days.</Empty>
          )}
        </Panel>

        <Panel title="Suggested Recurring Maintenance" colors={colors}>
          {suggestions.length ? (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 11,
                  background: colors.card,
                  padding: 11,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 13 }}>
                  {suggestion.title}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    opacity: 0.7,
                    lineHeight: 1.45,
                  }}
                >
                  {suggestion.reason}
                </div>
                <div style={{ marginTop: 7, fontSize: 11, fontWeight: 800 }}>
                  Suggested: every {suggestion.interval} {suggestion.unit}
                  {suggestion.season !== "Year-Round"
                    ? ` · ${suggestion.season}`
                    : ""}
                </div>
                <button
                  type="button"
                  disabled={savingId === suggestion.id}
                  onClick={() => setDraftSuggestion({ ...suggestion })}
                  style={{
                    marginTop: 9,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 8,
                    background: colors.panel,
                    padding: "7px 9px",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor:
                      savingId === suggestion.id ? "wait" : "pointer",
                    opacity: savingId === suggestion.id ? 0.6 : 1,
                  }}
                >
                  {savingId === suggestion.id
                    ? "Creating…"
                    : "Review Draft Work Order"}
                </button>
              </div>
            ))
          ) : (
            <Empty>
              All current maintenance procedures already have recurring work.
            </Empty>
          )}
        </Panel>

        <Panel title="Procedure Readiness" colors={colors}>
          {proceduresNeedingReview.length ? (
            proceduresNeedingReview.slice(0, 6).map(({ procedure, issues }) => (
              <div
                key={procedure.id}
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 11,
                  background: colors.card,
                  padding: 11,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 13 }}>
                  {procedure.title || "Untitled procedure"}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    opacity: 0.72,
                    lineHeight: 1.45,
                  }}
                >
                  Needs: {issues.join(" · ")}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onAskAtlas(
                      `Review the Atlas procedure "${procedure.title}". Help me improve its purpose, safety notes, required tools and parts, step-by-step checklist, and record links. Do not save changes without my approval.`,
                    )
                  }
                  style={{
                    marginTop: 9,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 8,
                    background: colors.panel,
                    padding: "7px 9px",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Improve with Ask Atlas
                </button>
              </div>
            ))
          ) : (
            <Empty>All procedures have the core information and links.</Empty>
          )}
        </Panel>

        <Panel title="Planning Guidance" colors={colors}>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            {planningGuidance}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
            <PlanningLine
              label="Schedule overdue recurring work before lower-priority projects."
            />
            <PlanningLine
              label="Group work by location to reduce travel and setup time."
            />
            <PlanningLine
              label="Keep open time each day for urgent property issues."
            />
          </div>
        </Panel>
      </div>

      {draftSuggestion ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review preventive maintenance draft"
          onClick={() => {
            if (!savingId) setDraftSuggestion(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(10, 22, 39, 0.62)",
            display: "grid",
            placeItems: "center",
            padding: isMobile ? 12 : 24,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(620px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 18,
              border: `1px solid ${colors.line}`,
              background: colors.card,
              boxShadow: "0 22px 70px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                padding: isMobile ? 16 : 20,
                background: colors.navy,
                color: "#fff",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: colors.gold,
                    fontSize: 10,
                    fontWeight: 950,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Draft Work Order
                </div>
                <h3 style={{ margin: "5px 0 0", fontSize: 20 }}>
                  Review Before Saving
                </h3>
              </div>
              <button
                type="button"
                disabled={Boolean(savingId)}
                onClick={() => setDraftSuggestion(null)}
                aria-label="Close draft review"
                style={{
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: 9,
                  background: "transparent",
                  color: "#fff",
                  minWidth: 36,
                  height: 36,
                  fontSize: 20,
                  cursor: savingId ? "wait" : "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: isMobile ? 16 : 20 }}>
              <label style={fieldLabelStyle}>
                Work order title
                <input
                  value={draftSuggestion.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  style={inputStyle(colors)}
                />
              </label>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <label style={fieldLabelStyle}>
                  Repeat every
                  <input
                    type="number"
                    min={1}
                    value={draftSuggestion.interval}
                    onChange={(event) =>
                      updateDraft({
                        interval: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                    style={inputStyle(colors)}
                  />
                </label>

                <label style={fieldLabelStyle}>
                  Frequency
                  <select
                    value={draftSuggestion.unit}
                    onChange={(event) =>
                      updateDraft({
                        unit: event.target.value as WorkOrderRecurrenceUnit,
                      })
                    }
                    style={inputStyle(colors)}
                  >
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                  </select>
                </label>

                <label style={fieldLabelStyle}>
                  Season
                  <select
                    value={draftSuggestion.season}
                    onChange={(event) =>
                      updateDraft({
                        season: event.target.value as WorkSeason,
                      })
                    }
                    style={inputStyle(colors)}
                  >
                    <option value="Year-Round">Year-Round</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                    <option value="Winter">Winter</option>
                  </select>
                </label>

                <label style={fieldLabelStyle}>
                  Priority
                  <select
                    value={draftSuggestion.priority}
                    onChange={(event) =>
                      updateDraft({
                        priority: event.target.value as
                          | "Low"
                          | "Medium"
                          | "High",
                      })
                    }
                    style={inputStyle(colors)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  marginTop: 14,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 12,
                  background: colors.panel,
                  padding: 12,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <div>
                  <strong>Procedure:</strong> {draftSuggestion.title}
                </div>
                <div>
                  <strong>Asset:</strong>{" "}
                  {draftSuggestion.assetName || "No linked asset"}
                </div>
                <div>
                  <strong>Reason:</strong> {draftSuggestion.reason}
                </div>
                <div>
                  <strong>Schedule:</strong> Every {draftSuggestion.interval}{" "}
                  {draftSuggestion.unit}
                  {draftSuggestion.season !== "Year-Round"
                    ? ` · ${draftSuggestion.season}`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 9,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  disabled={Boolean(savingId)}
                  onClick={() => setDraftSuggestion(null)}
                  style={{
                    border: `1px solid ${colors.line}`,
                    borderRadius: 10,
                    background: colors.panel,
                    padding: "10px 13px",
                    fontWeight: 900,
                    cursor: savingId ? "wait" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    Boolean(savingId) || !draftSuggestion.title.trim()
                  }
                  onClick={() => void createSuggestion(draftSuggestion)}
                  style={{
                    border: 0,
                    borderRadius: 10,
                    background: colors.gold,
                    color: colors.navy,
                    padding: "10px 14px",
                    fontWeight: 950,
                    cursor: savingId ? "wait" : "pointer",
                    opacity:
                      savingId || !draftSuggestion.title.trim() ? 0.6 : 1,
                  }}
                >
                  {savingId ? "Saving…" : "Save Preventive Maintenance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}


const fieldLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 11,
  fontWeight: 900,
};

function inputStyle(colors: Props["colors"]): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    boxSizing: "border-box",
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: colors.panel,
    color: "inherit",
    padding: "9px 10px",
    fontSize: 13,
    fontWeight: 700,
    outline: "none",
  };
}

function SummaryCard({
  label,
  value,
  detail,
  colors,
}: {
  label: string;
  value: number;
  detail: string;
  colors: Props["colors"];
}) {
  return (
    <div
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 13,
        background: colors.panel,
        padding: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 950,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.68,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 25, fontWeight: 950 }}>
        {value}
      </div>
      <div style={{ marginTop: 2, fontSize: 11, opacity: 0.65 }}>
        {detail}
      </div>
    </div>
  );
}

function Panel({
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
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function WorkRow({
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, opacity: 0.68 }}>{children}</div>;
}

function PlanningLine({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 12, lineHeight: 1.4 }}>
      <span>•</span>
      <span>{label}</span>
    </div>
  );
}
