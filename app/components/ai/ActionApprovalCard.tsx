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
        : "Create Draft Procedure";

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
        <div style={{ fontWeight: 900 }}>{action.title}</div>
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

