"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchResult } from "../../lib/atlas-types";

type Props = {
  assets: any[];
  workOrders: any[];
  procedures: any[];
  parts: any[];
  documents: any[];
  today: string;
  onOpen: (result: SearchResult) => void;
  colors: {
    navy: string;
    gold: string;
    line: string;
    panel: string;
    card: string;
    muted: string;
    red: string;
  };
};

type Recommendation = {
  id: string;
  title: string;
  detail: string;
  tone: "urgent" | "warning" | "info";
  group: "Overdue Work" | "Missing Procedures" | "Inventory" | "Documents" | "Service History" | "Record Links";
  result: SearchResult;
};

type Decision = "later" | "resolved" | "dismissed";
type Decisions = Record<string, Decision>;

const DECISIONS_KEY = "atlas-intelligence-recommendation-decisions-v1";

function readDecisions(): Decisions {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DECISIONS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDecisions(value: Decisions) {
  try {
    window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(value));
  } catch {
    // Recommendation preferences are optional.
  }
}

function ageInDays(value: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.POSITIVE_INFINITY;
  const left = new Date(`${value}T12:00:00`).getTime();
  const right = new Date(`${today}T12:00:00`).getTime();
  return Math.floor((right - left) / 86_400_000);
}

function assetImportance(asset: any) {
  const text = `${asset.name || ""} ${asset.category || ""}`.toLowerCase();
  let score = 0;
  if (
    /generator|boiler|hvac|water|filter|pump|pool|fire|electric|refriger|freezer|irrigation|security|shut.?off/.test(
      text,
    )
  )
    score += 50;
  if (/vehicle|boat|dock|lift|spa|appliance/.test(text)) score += 25;
  if (asset.status === "Monitor") score += 15;
  if (asset.status === "Offline") score += 100;
  return score;
}

export default function AtlasIntelligenceRecommendations({
  assets,
  workOrders,
  procedures,
  parts,
  documents,
  today,
  onOpen,
  colors,
}: Props) {
  const [decisions, setDecisions] = useState<Decisions>({});
  const [showFinished, setShowFinished] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => setDecisions(readDecisions()), []);

  function setDecision(id: string, decision?: Decision) {
    setDecisions((current) => {
      const next = { ...current };
      if (decision) next[id] = decision;
      else delete next[id];
      saveDecisions(next);
      return next;
    });
  }

  const recommendations = useMemo(() => {
    const next: Recommendation[] = [];

    workOrders
      .filter(
        (record) =>
          record.status !== "Completed" &&
          record.date &&
          String(record.date) < today,
      )
      .sort(
        (left, right) =>
          String(left.date).localeCompare(String(right.date)) ||
          (right.priority === "High" ? 1 : 0) -
            (left.priority === "High" ? 1 : 0),
      )
      .slice(0, 8)
      .forEach((record) =>
        next.push({
          id: `overdue-${record.id}-${record.date}`,
          title: `Overdue: ${record.title || "Untitled Work Order"}`,
          detail: `Due ${record.date}${record.priority ? ` · ${record.priority} priority` : ""}`,
          tone: "urgent",
          group: "Overdue Work",
          result: {
            id: `wo-${record.id}`,
            type: "Work Order",
            title: record.title || "Untitled Work Order",
            subtitle: `Due ${record.date} · ${record.status || "Open"}`,
            detail: record.notes || "",
            screen: "history",
            serviceId: record.id,
            assetId: record.assetId || undefined,
            vendorId: record.vendorId || undefined,
          },
        }),
      );

    assets
      .filter(
        (asset) =>
          asset.status !== "Offline" &&
          !procedures.some((procedure) =>
            (procedure.linkedAssetIds || []).includes(asset.id),
          ),
      )
      .sort(
        (left, right) =>
          assetImportance(right) - assetImportance(left) ||
          String(left.name).localeCompare(String(right.name)),
      )
      .slice(0, 8)
      .forEach((asset) =>
        next.push({
          id: `procedure-${asset.id}`,
          title: `Missing procedure: ${asset.name}`,
          detail: "No linked procedure is recorded for this active asset.",
          tone: "warning",
          group: "Missing Procedures",
          result: {
            id: `asset-${asset.id}`,
            type: "Asset",
            title: asset.name,
            subtitle: `${asset.category || "Asset"} · ${asset.status || "Monitor"}`,
            detail: asset.notes || "",
            screen: "assets",
            assetId: asset.id,
            locationId: asset.locationId || undefined,
          },
        }),
      );

    parts
      .filter(
        (part) =>
          Number(part.quantity || 0) <= Number(part.minQuantity || 0),
      )
      .slice(0, 6)
      .forEach((part) =>
        next.push({
          id: `part-${part.id}-${Number(part.quantity || 0)}`,
          title: `${Number(part.quantity || 0) <= 0 ? "Out of stock" : "Low stock"}: ${part.name}`,
          detail: `Quantity ${Number(part.quantity || 0)} · Minimum ${Number(part.minQuantity || 0)} · Reorder at least ${Math.max(
            0,
            Number(part.minQuantity || 0) - Number(part.quantity || 0),
          )}`,
          tone: Number(part.quantity || 0) <= 0 ? "urgent" : "warning",
          group: "Inventory",
          result: {
            id: `part-${part.id}`,
            type: "Part",
            title: part.name,
            subtitle: `${part.category || "Part"} · Qty ${Number(part.quantity || 0)}`,
            detail: part.notes || "",
            screen: "parts",
            partId: part.id,
          },
        }),
      );

    documents
      .filter(
        (document) =>
          !document.targetId ||
          !document.targetType ||
          document.targetType === "General",
      )
      .slice(0, 4)
      .forEach((document) =>
        next.push({
          id: `document-${document.id}`,
          title: `Unlinked document: ${document.title || "Untitled Document"}`,
          detail: "This document is not linked to a property record.",
          tone: "info",
          group: "Documents",
          result: {
            id: `document-${document.id}`,
            type: "Document",
            title: document.title || "Untitled Document",
            subtitle: document.type || "Document",
            detail: document.notes || "",
            screen: "documents",
          },
        }),
      );

    workOrders
      .filter(
        (record) =>
          record.status !== "Completed" &&
          !record.assetId &&
          !record.locationId,
      )
      .slice(0, 5)
      .forEach((record) =>
        next.push({
          id: `links-${record.id}-${record.status || "Open"}`,
          title: `Unlinked work: ${record.title || "Untitled Work Order"}`,
          detail:
            "This active work order has no linked asset or location, which limits history and recommendations.",
          tone: "info",
          group: "Record Links",
          result: {
            id: `wo-${record.id}`,
            type: "Work Order",
            title: record.title || "Untitled Work Order",
            subtitle: record.status || "Open",
            detail: record.notes || "",
            screen: "history",
            serviceId: record.id,
          },
        }),
      );

    assets
      .filter((asset) => asset.status !== "Offline")
      .filter((asset) => {
        const completed = workOrders
          .filter(
            (record) =>
              record.assetId === asset.id && record.status === "Completed",
          )
          .map((record) => record.lastCompletedDate || record.date || "")
          .filter(Boolean)
          .sort()
          .at(-1);
        return !completed || ageInDays(completed, today) > 180;
      })
      .sort(
        (left, right) =>
          assetImportance(right) - assetImportance(left) ||
          String(left.name).localeCompare(String(right.name)),
      )
      .slice(0, 6)
      .forEach((asset) =>
        next.push({
          id: `service-${asset.id}-${workOrders
            .filter(
              (record) =>
                record.assetId === asset.id && record.status === "Completed",
            )
            .map((record) => record.lastCompletedDate || record.date || "none")
            .sort()
            .at(-1) || "none"}`,
          title: `Review service history: ${asset.name}`,
          detail: "No completed service is recorded within the last 180 days.",
          tone: "info",
          group: "Service History",
          result: {
            id: `asset-${asset.id}`,
            type: "Asset",
            title: asset.name,
            subtitle: `${asset.category || "Asset"} · ${asset.status || "Monitor"}`,
            detail: asset.notes || "",
            screen: "assets",
            assetId: asset.id,
          },
        }),
      );

    const rank = { urgent: 0, warning: 1, info: 2 };
    return next.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 18);
  }, [assets, workOrders, procedures, parts, documents, today]);

  const urgentCount = recommendations.filter(
    (item) => item.tone === "urgent",
  ).length;
  const warningCount = recommendations.filter(
    (item) => item.tone === "warning",
  ).length;
  const finishedCount = recommendations.filter((item) =>
    ["resolved", "dismissed"].includes(decisions[item.id] || ""),
  ).length;
  const visibleRecommendations = recommendations.filter((item) =>
    showFinished
      ? true
      : decisions[item.id] !== "resolved" && decisions[item.id] !== "dismissed",
  );
  const groups = [
    "Overdue Work",
    "Missing Procedures",
    "Inventory",
    "Documents",
    "Service History",
    "Record Links",
  ] as const;

  return (
    <section
      style={{
        border: `1px solid ${colors.line}`,
        borderRadius: 14,
        background: colors.card,
        padding: 16,
      }}
    >
      <div
        style={{
          color: colors.gold,
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Atlas Recommendations
      </div>
      <h3 style={{ margin: "5px 0 6px", color: colors.navy, fontSize: 20 }}>
        Property records needing review
      </h3>
      <p style={{ margin: "0 0 12px", color: colors.muted, fontSize: 12 }}>
        {recommendations.length
          ? `${urgentCount} urgent · ${warningCount} attention · review before making changes`
          : "No current record gaps were detected."}
      </p>

      {finishedCount ? (
        <button
          type="button"
          onClick={() => setShowFinished((current) => !current)}
          style={{
            marginBottom: 10,
            border: `1px solid ${colors.line}`,
            borderRadius: 9,
            background: colors.panel,
            color: colors.navy,
            padding: "7px 9px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 850,
          }}
        >
          {showFinished ? "Hide" : "Show"} {finishedCount} resolved or dismissed
        </button>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {groups.map((group) => {
          const items = visibleRecommendations.filter((item) => item.group === group);
          if (!items.length) return null;
          const collapsed = Boolean(collapsedGroups[group]);
          return (
            <section key={group} style={{ display: "grid", gap: 7 }}>
              <button
                type="button"
                onClick={() =>
                  setCollapsedGroups((current) => ({
                    ...current,
                    [group]: !current[group],
                  }))
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  border: 0,
                  background: "transparent",
                  color: colors.navy,
                  padding: "5px 2px",
                  cursor: "pointer",
                  fontWeight: 950,
                  textAlign: "left",
                }}
              >
                <span>{group}</span>
                <span>{items.length} {collapsed ? "+" : "-"}</span>
              </button>
              {!collapsed
                ? items.map((item) => {
          const accent =
            item.tone === "urgent"
              ? colors.red
              : item.tone === "warning"
                ? colors.gold
                : "#3973B7";
          return (
            <article
              key={item.id}
              style={{
                display: "grid",
                gap: 4,
                width: "100%",
                padding: "10px 11px",
                border: `1px solid ${colors.line}`,
                borderLeft: `5px solid ${accent}`,
                borderRadius: 10,
                background: colors.panel,
                color: colors.navy,
                textAlign: "left",
              }}
            >
              <strong style={{ fontSize: 13 }}>{item.title}</strong>
              <span style={{ color: colors.muted, fontSize: 11 }}>
                {item.detail}
              </span>
              {decisions[item.id] ? (
                <span style={{ color: colors.muted, fontSize: 10, fontWeight: 850 }}>
                  Marked {decisions[item.id]}
                </span>
              ) : null}
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                <button type="button" onClick={() => onOpen(item.result)} style={actionStyle(colors)}>Open Record</button>
                <button type="button" onClick={() => setDecision(item.id, "later")} style={actionStyle(colors)}>Review Later</button>
                <button type="button" onClick={() => setDecision(item.id, "resolved")} style={actionStyle(colors)}>Resolved</button>
                <button type="button" onClick={() => setDecision(item.id, "dismissed")} style={actionStyle(colors)}>Dismiss</button>
                {decisions[item.id] ? <button type="button" onClick={() => setDecision(item.id)} style={actionStyle(colors)}>Undo</button> : null}
              </span>
            </article>
          );
                })
                : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function actionStyle(colors: Props["colors"]): React.CSSProperties {
  return {
    border: `1px solid ${colors.line}`,
    borderRadius: 7,
    background: colors.card,
    color: colors.navy,
    padding: "5px 7px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
  };
}
