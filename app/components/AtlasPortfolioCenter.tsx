"use client";

import { useEffect, useMemo, useState } from "react";

type PropertyProfile = {
  id: string;
  name: string;
  detail: string;
};

type PropertySummary = {
  propertyId: string;
  locations: number;
  assets: number;
  assetRisks: number;
  workOrders: number;
  openWork: number;
  overdueWork: number;
  highPriorityWork: number;
  completedWork: number;
  lowStockParts: number;
  upcomingEvents: number;
  documents: number;
};

type Props = {
  properties: PropertyProfile[];
  activePropertyId: string;
  isMobile: boolean;
  colors: {
    navy: string;
    gold: string;
    green: string;
    red: string;
    line: string;
    card: string;
    panel: string;
    muted: string;
  };
  onOpenProperty: (
    propertyId: string,
    screen: "dashboard" | "history" | "assets" | "locations" | "parts",
  ) => void;
};

const EMPTY_SUMMARY: Omit<PropertySummary, "propertyId"> = {
  locations: 0,
  assets: 0,
  assetRisks: 0,
  workOrders: 0,
  openWork: 0,
  overdueWork: 0,
  highPriorityWork: 0,
  completedWork: 0,
  lowStockParts: 0,
  upcomingEvents: 0,
  documents: 0,
};

export default function AtlasPortfolioCenter({
  properties,
  activePropertyId,
  isMobile,
  colors,
  onOpenProperty,
}: Props) {
  const [summaries, setSummaries] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPortfolio() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/atlas?portfolio=1&t=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Portfolio data did not load.");
      }
      setSummaries(
        Array.isArray(payload?.properties) ? payload.properties : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Portfolio data did not load.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPortfolio();
  }, []);

  const summaryMap = useMemo(
    () => new Map(summaries.map((summary) => [summary.propertyId, summary])),
    [summaries],
  );

  const totals = useMemo(
    () =>
      properties.reduce(
        (total, property) => {
          const summary = summaryMap.get(property.id);
          if (!summary) return total;
          total.assets += summary.assets;
          total.openWork += summary.openWork;
          total.overdueWork += summary.overdueWork;
          total.lowStockParts += summary.lowStockParts;
          return total;
        },
        { assets: 0, openWork: 0, overdueWork: 0, lowStockParts: 0 },
      ),
    [properties, summaryMap],
  );

  const statStyle = {
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    background: colors.card,
    padding: 12,
    display: "grid",
    gap: 4,
  } as const;

  const smallButtonStyle = {
    minHeight: 36,
    border: `1px solid ${colors.line}`,
    borderRadius: 9,
    background: colors.card,
    color: colors.navy,
    fontWeight: 850,
    cursor: "pointer",
    padding: "7px 10px",
  } as const;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {[
          ["Portfolio Assets", totals.assets, colors.navy],
          ["Open Work", totals.openWork, colors.gold],
          ["Overdue", totals.overdueWork, colors.red],
          ["Low Stock", totals.lowStockParts, colors.gold],
        ].map(([label, value, tone]) => (
          <div key={String(label)} style={statStyle}>
            <span
              style={{
                color: colors.muted,
                fontSize: 11,
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {label}
            </span>
            <strong style={{ color: String(tone), fontSize: 24 }}>
              {loading ? "—" : String(value)}
            </strong>
          </div>
        ))}
      </div>

      {message ? (
        <div
          style={{
            border: `1px solid ${colors.line}`,
            borderRadius: 10,
            background: colors.panel,
            padding: 12,
          }}
        >
          {message}{" "}
          <button
            type="button"
            onClick={() => void loadPortfolio()}
            style={{ ...smallButtonStyle, marginLeft: 8 }}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
          gap: 14,
        }}
      >
        {properties.map((property) => {
          const active = property.id === activePropertyId;
          const summary = summaryMap.get(property.id) || {
            propertyId: property.id,
            ...EMPTY_SUMMARY,
          };
          const attention =
            summary.overdueWork +
            summary.highPriorityWork +
            summary.assetRisks +
            summary.lowStockParts;

          return (
            <article
              key={property.id}
              style={{
                border: `2px solid ${active ? colors.gold : colors.line}`,
                borderRadius: 14,
                background: active ? "#FFF8E8" : colors.card,
                padding: 14,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      color: colors.gold,
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {active ? "Active Property" : "Atlas Property"}
                  </div>
                  <h3 style={{ margin: "4px 0", fontSize: 22 }}>
                    {property.name}
                  </h3>
                  <div style={{ color: colors.muted, fontSize: 12 }}>
                    {property.detail}
                  </div>
                </div>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "5px 8px",
                    background: attention ? "#FEECEC" : "#EAF8EF",
                    color: attention ? colors.red : colors.green,
                    fontSize: 11,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading
                    ? "Loading"
                    : attention
                      ? `${attention} attention`
                      : "Clear"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 7,
                }}
              >
                {[
                  ["Assets", summary.assets],
                  ["Locations", summary.locations],
                  ["Open work", summary.openWork],
                  ["Overdue", summary.overdueWork],
                  ["Low stock", summary.lowStockParts],
                  ["Upcoming", summary.upcomingEvents],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 9,
                      background: colors.panel,
                      padding: 8,
                      minWidth: 0,
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 17 }}>
                      {loading ? "—" : String(value)}
                    </strong>
                    <span style={{ color: colors.muted, fontSize: 10 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 7,
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenProperty(property.id, "dashboard")}
                  style={{
                    ...smallButtonStyle,
                    gridColumn: "1 / -1",
                    background: active ? colors.gold : colors.navy,
                    color: active ? colors.navy : "#fff",
                    borderColor: active ? colors.gold : colors.navy,
                  }}
                >
                  Open {property.name}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenProperty(property.id, "history")}
                  style={smallButtonStyle}
                >
                  Work
                </button>
                <button
                  type="button"
                  onClick={() => onOpenProperty(property.id, "assets")}
                  style={smallButtonStyle}
                >
                  Assets
                </button>
                <button
                  type="button"
                  onClick={() => onOpenProperty(property.id, "locations")}
                  style={smallButtonStyle}
                >
                  Locations
                </button>
                <button
                  type="button"
                  onClick={() => onOpenProperty(property.id, "parts")}
                  style={smallButtonStyle}
                >
                  Parts
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

