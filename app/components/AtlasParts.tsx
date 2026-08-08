"use client";

import React from "react";
import type { PartRecord } from "../lib/atlas-types";
import { Field } from "./AtlasUiPrimitives";
import { ListDrawerLayout } from "./AtlasAppFoundation";

type NamedRecord = { id: string; name: string };

type Props = {
  filteredParts: PartRecord[];
  partRecords: PartRecord[];
  selectedPart: PartRecord;
  selectedPartId: string;
  isMobile: boolean;
  locations: NamedRecord[];
  assetRecords: NamedRecord[];
  vendorRecords: NamedRecord[];
  colors: { navy: string; line: string; gold: string; muted: string; [key: string]: string };
  sectionStyle: React.CSSProperties;
  fieldLabelStyle: React.CSSProperties;
  goldButtonStyle: React.CSSProperties;
  listStyle: React.CSSProperties;
  rowButtonStyle: React.CSSProperties;
  mutedSmallStyle: React.CSSProperties;
  editorHeaderStyle: React.CSSProperties;
  eyebrowStyle: React.CSSProperties;
  secondaryButtonStyle: React.CSSProperties;
  formGridStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  buttonRowStyle: React.CSSProperties;
  dangerButtonStyle: React.CSSProperties;
  addPartRecord: () => void;
  setSelectedPartId: (id: string) => void;
  badgeStyle: (status: string) => React.CSSProperties;
  updatePart: (patch: Partial<PartRecord>) => void;
  saveDirtyRecord: (table: any, record: any, entityLabel: string, id: string) => unknown;
  deletePartRecord: (part: PartRecord) => unknown;
};

export default function AtlasParts({
  filteredParts,
  partRecords,
  selectedPart,
  selectedPartId,
  isMobile,
  locations,
  assetRecords,
  vendorRecords,
  colors,
  sectionStyle,
  fieldLabelStyle,
  goldButtonStyle,
  listStyle,
  rowButtonStyle,
  mutedSmallStyle,
  editorHeaderStyle,
  eyebrowStyle,
  secondaryButtonStyle,
  formGridStyle,
  inputStyle,
  buttonRowStyle,
  dangerButtonStyle,
  addPartRecord,
  setSelectedPartId,
  badgeStyle,
  updatePart,
  saveDirtyRecord,
  deletePartRecord,
}: Props) {
  const inventoryParts = [...filteredParts].sort((left, right) => {
    const rank = (part: PartRecord) =>
      part.quantity <= 0 ? 0 : part.quantity <= part.minQuantity ? 1 : 2;
    return rank(left) - rank(right) || left.name.localeCompare(right.name);
  });
  const outOfStockCount = partRecords.filter(
    (part) => Number(part.quantity || 0) <= 0,
  ).length;
  const lowStockCount = partRecords.filter(
    (part) =>
      Number(part.quantity || 0) > 0 &&
      Number(part.quantity || 0) <= Number(part.minQuantity || 0),
  ).length;
  const stockedCount = Math.max(
    0,
    partRecords.length - outOfStockCount - lowStockCount,
  );
  const selectedReorderQuantity = Math.max(
    0,
    Number(selectedPart.minQuantity || 0) - Number(selectedPart.quantity || 0),
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section
        style={{
          ...sectionStyle,
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(4, minmax(0, 1fr))",
          gap: 8,
          padding: 10,
        }}
      >
        {[
          ["Total Parts", partRecords.length, colors.navy],
          ["In Stock", stockedCount, "#067647"],
          ["Low Stock", lowStockCount, "#B7791F"],
          ["Out of Stock", outOfStockCount, "#B42318"],
        ].map(([label, value, tone]) => (
          <div
            key={String(label)}
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 10,
              background: "#FFFFFF",
              padding: 10,
            }}
          >
            <span style={{ ...fieldLabelStyle, color: String(tone) }}>
              {label}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: 4,
                color: colors.navy,
                fontSize: 22,
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </section>

      <ListDrawerLayout
        eyebrow="Inventory"
        title="Parts"
        detail="Low and out-of-stock items appear first."
        isMobile={isMobile}
        drawerResetKey={selectedPartId || "part-new"}
        right={
          <button type="button" onClick={addPartRecord} style={goldButtonStyle}>
            Add Part
          </button>
        }
        list={
          <div style={listStyle}>
            {inventoryParts.map((part) => {
              const reorderQuantity = Math.max(
                0,
                Number(part.minQuantity || 0) - Number(part.quantity || 0),
              );
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setSelectedPartId(part.id)}
                  style={{
                    ...rowButtonStyle,
                    borderColor:
                      part.id === selectedPart.id ? colors.gold : colors.line,
                  }}
                >
                  <div>
                    <strong>{part.name}</strong>
                    <p style={mutedSmallStyle}>
                      {part.category} · Qty {part.quantity} / Min {part.minQuantity}
                    </p>
                    {reorderQuantity ? (
                      <p
                        style={{
                          ...mutedSmallStyle,
                          marginTop: 3,
                          color: "#B42318",
                          fontWeight: 800,
                        }}
                      >
                        Reorder at least {reorderQuantity}
                      </p>
                    ) : null}
                  </div>
                  <span style={badgeStyle(part.status)}>{part.status}</span>
                </button>
              );
            })}
          </div>
        }
        drawer={
          <>
            <h3 style={editorHeaderStyle}>
              {selectedPart.name.trim() || "New Part"}
            </h3>
            {selectedPart.id ? (
              <section
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 12,
                  background: "#F8FAFC",
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <div style={eyebrowStyle}>Quick Stock Adjustment</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(70px, 1fr) auto",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      updatePart({
                        quantity: Math.max(
                          0,
                          Number(selectedPart.quantity || 0) - 1,
                        ),
                      })
                    }
                    style={secondaryButtonStyle}
                  >
                    − 1
                  </button>
                  <strong
                    style={{
                      textAlign: "center",
                      color: colors.navy,
                      fontSize: 24,
                    }}
                  >
                    {selectedPart.quantity}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      updatePart({
                        quantity: Number(selectedPart.quantity || 0) + 1,
                      })
                    }
                    style={secondaryButtonStyle}
                  >
                    + 1
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginTop: 9,
                    color: selectedReorderQuantity ? "#B42318" : colors.muted,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <span>
                    {selectedReorderQuantity
                      ? `Reorder at least ${selectedReorderQuantity}`
                      : "Stock level meets the minimum"}
                  </span>
                  <span>Minimum {selectedPart.minQuantity}</span>
                </div>
              </section>
            ) : null}
            <div style={formGridStyle}>
              <Field label="Name" value={selectedPart.name} onChange={(value) => updatePart({ name: value })} />
              <Field label="Category" value={selectedPart.category} onChange={(value) => updatePart({ category: value })} />
              <Field label="Quantity" value={String(selectedPart.quantity)} onChange={(value) => updatePart({ quantity: Number(value) })} />
              <Field label="Minimum Quantity" value={String(selectedPart.minQuantity)} onChange={(value) => updatePart({ minQuantity: Number(value) })} />
              <label style={{ display: "grid", gap: 7 }}>
                <span style={fieldLabelStyle}>Automatic Status</span>
                <input readOnly value={selectedPart.status} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={fieldLabelStyle}>Location</span>
                <select value={selectedPart.locationId || ""} onChange={(event) => updatePart({ locationId: event.currentTarget.value })} style={inputStyle}>
                  <option value="">No location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={fieldLabelStyle}>Linked Asset</span>
                <select value={selectedPart.assetId || ""} onChange={(event) => updatePart({ assetId: event.currentTarget.value })} style={inputStyle}>
                  <option value="">No asset</option>
                  {assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <span style={fieldLabelStyle}>Vendor</span>
                <select value={selectedPart.vendorId || ""} onChange={(event) => updatePart({ vendorId: event.currentTarget.value })} style={inputStyle}>
                  <option value="">No vendor</option>
                  {vendorRecords.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
              </label>
              <Field label="Notes" value={selectedPart.notes} onChange={(value) => updatePart({ notes: value })} multiline />
            </div>
            {selectedPart.id ? (
              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={() => void saveDirtyRecord("parts", selectedPart, "part", selectedPart.id)}
                  style={goldButtonStyle}
                >
                  Save Part
                </button>
                <button type="button" onClick={() => void deletePartRecord(selectedPart)} style={dangerButtonStyle}>
                  Delete Part
                </button>
              </div>
            ) : null}
          </>
        }
      />
    </div>
  );
}
