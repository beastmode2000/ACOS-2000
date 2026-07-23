"use client";

import type { PendingAssistantAction } from "../../lib/ai/action-planner";

type Props = {
  action: PendingAssistantAction;
  saving: boolean;
  assetName?: string;
  formattedDate?: string;
  colors: {
    gold: string;
    line: string;
    card: string;
  };
  onApprove: () => void;
  onCancel: () => void;
};

export default function ActionApprovalCard({
  action,
  saving,
  assetName,
  formattedDate,
  colors,
  onApprove,
  onCancel,
}: Props) {
  const heading =
    action.kind === "work-order"
      ? "Create Work Order"
      : action.kind === "calendar"
        ? "Schedule Calendar Event"
        : action.kind === "procedure"
          ? "Create Draft Procedure"
          : action.kind === "work-order-update"
            ? "Update Work Order"
            : action.kind === "calendar-update"
              ? "Reschedule Calendar Event"
              : "Update Inventory";

  return (
    <div
      style={{
        border: `2px solid ${colors.gold}`,
        borderRadius: 14,
        background: colors.card,
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Prepared Atlas Action
        </div>
        <h3 style={{ margin: "4px 0 6px", fontSize: 20 }}>{heading}</h3>
        <div style={{ fontWeight: 900 }}>
          {"title" in action ? action.title : action.targetTitle}
        </div>
      </div>

      {action.kind === "work-order" ? (
        <div style={{ fontSize: 12, opacity: 0.72 }}>
          Priority: {action.priority}
          {assetName ? ` • Asset: ${assetName}` : ""}
        </div>
      ) : null}

      {action.kind === "calendar" ? (
        <div style={{ fontSize: 12, opacity: 0.72 }}>
          {formattedDate || action.date}
          {action.time ? ` • ${action.time}` : " • All day"}
          {action.linkedName ? ` • ${action.linkedName}` : ""}
        </div>
      ) : null}

      {action.kind === "procedure" ? (
        <div style={{ fontSize: 12, opacity: 0.72 }}>
          Draft procedure{assetName ? ` • ${assetName}` : ""}
        </div>
      ) : null}

      {action.kind === "work-order-update" ? (
        <div style={{ display: "grid", gap: 5, fontSize: 12, opacity: 0.78 }}>
          {action.status ? <div>Status → {action.status}</div> : null}
          {action.priority ? <div>Priority → {action.priority}</div> : null}
          {action.noteToAppend ? <div>Add note → {action.noteToAppend}</div> : null}
        </div>
      ) : null}

      {action.kind === "calendar-update" ? (
        <div style={{ fontSize: 12, opacity: 0.72 }}>
          Move to {formattedDate || action.date}
          {action.time ? ` • ${action.time}` : " • All day"}
        </div>
      ) : null}

      {action.kind === "part-update" ? (
        <div style={{ display: "grid", gap: 5, fontSize: 12, opacity: 0.78 }}>
          {action.quantity !== undefined ? (
            <div>Quantity → {action.quantity}</div>
          ) : null}
          {action.minQuantity !== undefined ? (
            <div>Minimum stock → {action.minQuantity}</div>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onApprove}
          disabled={saving}
          style={{
            border: 0,
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 900,
            cursor: saving ? "default" : "pointer",
            background: colors.gold,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Approve and Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontWeight: 900,
            cursor: saving ? "default" : "pointer",
            background: colors.card,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
