"use client";

import { useMemo } from "react";
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
  result: SearchResult;
};

function ageInDays(value: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.POSITIVE_INFINITY;
  const left = new Date(`${value}T12:00:00`).getTime();
  const right = new Date(`${today}T12:00:00`).getTime();
  return Math.floor((right - left) / 86_400_000);
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
  const recommendations = useMemo(() => {
    const next: Recommendation[] = [];

    workOrders
      .filter(
        (record) =>
          record.status !== "Completed" &&
          record.date &&
          String(record.date) < today,
      )
      .slice(0, 6)
      .forEach((record) =>
        next.push({
          id: `overdue-${record.id}`,
          title: `Overdue: ${record.title || "Untitled Work Order"}`,
          detail: `Due ${record.date}${record.priority ? ` · ${record.priority} priority` : ""}`,
          tone: "urgent",
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
      .slice(0, 6)
      .forEach((asset) =>
        next.push({
          id: `procedure-${asset.id}`,
          title: `Missing procedure: ${asset.name}`,
          detail: "No linked procedure is recorded for this active asset.",
          tone: "warning",
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
          id: `part-${part.id}`,
          title: `${Number(part.quantity || 0) <= 0 ? "Out of stock" : "Low stock"}: ${part.name}`,
          detail: `Quantity ${Number(part.quantity || 0)} · Minimum ${Number(part.minQuantity || 0)}`,
          tone: Number(part.quantity || 0) <= 0 ? "urgent" : "warning",
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
      .slice(0, 5)
      .forEach((asset) =>
        next.push({
          id: `service-${asset.id}`,
          title: `Review service history: ${asset.name}`,
          detail: "No completed service is recorded within the last 180 days.",
          tone: "info",
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

      <div style={{ display: "grid", gap: 8 }}>
        {recommendations.map((item) => {
          const accent =
            item.tone === "urgent"
              ? colors.red
              : item.tone === "warning"
                ? colors.gold
                : "#3973B7";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.result)}
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
                cursor: "pointer",
              }}
            >
              <strong style={{ fontSize: 13 }}>{item.title}</strong>
              <span style={{ color: colors.muted, fontSize: 11 }}>
                {item.detail}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

