"use client";

import React from "react";

import type {
  AssetRecord,
  ServiceRecord,
  VendorRecord,
  WorkOrderRecurrenceUnit,
  WorkSeason,
} from "../lib/atlas-types";

type AtlasWorkOrdersProps = {
  ListDrawerLayout: any;
  Field: any;
  SelectField: any;
  isMobile: any;
  addWorkOrder: any;
  goldButtonStyle: any;
  stackStyle: any;
  seasonPlannerStyle: any;
  eyebrowStyle: any;
  seasonCardGridStyle: any;
  serviceRecords: any;
  workOrderSeasonFilter: any;
  setWorkOrderSeasonFilter: any;
  colors: any;
  seasonCardStyle: any;
  seasonCardTitleStyle: any;
  currentSeasonTagStyle: any;
  seasonCardDescriptionStyle: any;
  filteredServices: any;
  listStyle: any;
  setSelectedServiceId: any;
  rowButtonStyle: any;
  selectedService: any;
  mutedSmallStyle: any;
  formatDate: any;
  assetName: any;
  vendorName: any;
  recurrenceLabel: any;
  workOrderListBadgesStyle: any;
  recurringBadgeStyle: any;
  badgeStyle: any;
  noticeStyle: any;
  editorHeaderStyle: any;
  detailSectionStyle: any;
  formGridStyle: any;
  updateWorkOrder: any;
  fieldLabelStyle: any;
  inputStyle: any;
  byName: any;
  assetRecords: any;
  vendorRecords: any;
  detailSectionHeaderStyle: any;
  recurrenceToggleStyle: any;
  recurrenceGridStyle: any;
  recurrenceHistoryStyle: any;
  buttonRowStyle: any;
  isRecordDirty: any;
  saveWorkOrderRecord: any;
  completeWorkOrder: any;
  secondaryButtonStyle: any;
  deleteWorkOrderRecord: any;
  dangerButtonStyle: any;
  renderLinkedDocuments: any;
};

export default function AtlasWorkOrders({
  ListDrawerLayout,
  Field,
  SelectField,
  isMobile,
  addWorkOrder,
  goldButtonStyle,
  stackStyle,
  seasonPlannerStyle,
  eyebrowStyle,
  seasonCardGridStyle,
  serviceRecords,
  workOrderSeasonFilter,
  setWorkOrderSeasonFilter,
  colors,
  seasonCardStyle,
  seasonCardTitleStyle,
  currentSeasonTagStyle,
  seasonCardDescriptionStyle,
  filteredServices,
  listStyle,
  setSelectedServiceId,
  rowButtonStyle,
  selectedService,
  mutedSmallStyle,
  formatDate,
  assetName,
  vendorName,
  recurrenceLabel,
  workOrderListBadgesStyle,
  recurringBadgeStyle,
  badgeStyle,
  noticeStyle,
  editorHeaderStyle,
  detailSectionStyle,
  formGridStyle,
  updateWorkOrder,
  fieldLabelStyle,
  inputStyle,
  byName,
  assetRecords,
  vendorRecords,
  detailSectionHeaderStyle,
  recurrenceToggleStyle,
  recurrenceGridStyle,
  recurrenceHistoryStyle,
  buttonRowStyle,
  isRecordDirty,
  saveWorkOrderRecord,
  completeWorkOrder,
  secondaryButtonStyle,
  deleteWorkOrderRecord,
  dangerButtonStyle,
  renderLinkedDocuments,
}: AtlasWorkOrdersProps) {

    const seasons: Array<WorkSeason | "All"> = [
      "All",
      "Spring",
      "Summer",
      "Fall",
      "Winter",
      "Year-Round",
    ];
    const currentSeason = seasonForDate();

    return (
      <ListDrawerLayout
        eyebrow="Open / Monitor"
        title="Work Orders"
        detail="Editable one-time and recurring work, organized around how the property changes through the year."
        isMobile={isMobile}
        right={
          <button type="button" onClick={addWorkOrder} style={goldButtonStyle}>
            Add Work Order
          </button>
        }
        list={
          <div style={stackStyle}>
            <section style={seasonPlannerStyle}>
              <div>
                <div style={eyebrowStyle}>Seasonal Property Plan</div>
                <strong>
                  Current season: {currentSeason}
                </strong>
              </div>

              <div style={seasonCardGridStyle}>
                {seasons.map((season) => {
                  const count =
                    season === "All"
                      ? serviceRecords.length
                      : serviceRecords.filter(
                          (record) => record.season === season,
                        ).length;
                  const selected = workOrderSeasonFilter === season;

                  return (
                    <button
                      key={season}
                      type="button"
                      onClick={() => setWorkOrderSeasonFilter(season)}
                      style={{
                        ...seasonCardStyle,
                        borderColor: selected
                          ? colors.gold
                          : colors.line,
                        background: selected
                          ? "#FFF8E8"
                          : "#FFFFFF",
                      }}
                    >
                      <span style={seasonCardTitleStyle}>
                        {season}
                        {season === currentSeason ? (
                          <small style={currentSeasonTagStyle}>Current</small>
                        ) : null}
                      </span>
                      <strong>{count}</strong>
                      <small style={seasonCardDescriptionStyle}>
                        {season === "All"
                          ? "Every work order"
                          : workSeasonDescription(season)}
                      </small>
                    </button>
                  );
                })}
              </div>
            </section>

            <div style={listStyle}>
              {filteredServices.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedServiceId(record.id)}
                  style={{
                    ...rowButtonStyle,
                    borderColor:
                      record.id === selectedService.id
                        ? colors.gold
                        : colors.line,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{record.title}</strong>
                    <p style={mutedSmallStyle}>
                      {record.recurring ? "Next due" : "Due"}{" "}
                      {formatDate(record.date)} · {assetName(record.assetId)} ·{" "}
                      {vendorName(record.vendorId)}
                    </p>
                    <p style={mutedSmallStyle}>
                      {record.season || "Year-Round"} ·{" "}
                      {recurrenceLabel(record)}
                    </p>
                  </div>
                  <div style={workOrderListBadgesStyle}>
                    {record.recurring ? (
                      <span style={recurringBadgeStyle}>Recurring</span>
                    ) : null}
                    <span style={badgeStyle(record.status)}>
                      {record.status}
                    </span>
                  </div>
                </button>
              ))}

              {!filteredServices.length ? (
                <div style={noticeStyle}>
                  No work orders are assigned to this season or search.
                </div>
              ) : null}
            </div>
          </div>
        }
        drawer={
          selectedService.id ? (
            <div style={stackStyle}>
              <div>
                <h3 style={editorHeaderStyle}>
                  {selectedService.title.trim() || "New Work Order"}
                </h3>
                <p style={mutedSmallStyle}>
                  {selectedService.season || "Year-Round"} ·{" "}
                  {recurrenceLabel(selectedService)}
                </p>
              </div>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Work Order Information</div>
                <div style={formGridStyle}>
                  <Field
                    label="Title"
                    value={selectedService.title}
                    onChange={(value) => updateWorkOrder({ title: value })}
                  />
                  <Field
                    label={selectedService.recurring ? "Next Due" : "Due Date"}
                    value={selectedService.date}
                    onChange={(value) => updateWorkOrder({ date: value })}
                  />
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Season</span>
                    <select
                      value={selectedService.season || "Year-Round"}
                      onChange={(event) =>
                        updateWorkOrder({
                          season: event.currentTarget.value as WorkSeason,
                        })
                      }
                      style={inputStyle}
                    >
                      {(
                        [
                          "Year-Round",
                          "Spring",
                          "Summer",
                          "Fall",
                          "Winter",
                        ] as WorkSeason[]
                      ).map((season) => (
                        <option key={season} value={season}>
                          {season}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Asset</span>
                    <select
                      value={selectedService.assetId}
                      onChange={(event) =>
                        updateWorkOrder({
                          assetId: event.currentTarget.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">No asset</option>
                      {byName(assetRecords).map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Vendor</span>
                    <select
                      value={selectedService.vendorId ?? ""}
                      onChange={(event) =>
                        updateWorkOrder({
                          vendorId: event.currentTarget.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">No vendor</option>
                      {byName(vendorRecords).map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SelectField
                    label="Status"
                    value={selectedService.status}
                    onChange={(value) => updateWorkOrder({ status: value })}
                    options={
                      ["Open", "Scheduled", "Completed", "Monitor"] as const
                    }
                  />
                  <SelectField
                    label="Priority"
                    value={selectedService.priority ?? "Medium"}
                    onChange={(value) => updateWorkOrder({ priority: value })}
                    options={["Low", "Medium", "High"] as const}
                  />
                  <Field
                    label="Follow-up Date"
                    value={selectedService.followUpDate ?? ""}
                    onChange={(value) =>
                      updateWorkOrder({ followUpDate: value })
                    }
                  />
                  <Field
                    label="Notes"
                    value={selectedService.notes}
                    onChange={(value) => updateWorkOrder({ notes: value })}
                    multiline
                  />
                </div>
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Recurrence</div>
                    <strong>{recurrenceLabel(selectedService)}</strong>
                  </div>
                  <label style={recurrenceToggleStyle}>
                    <input
                      type="checkbox"
                      checked={!!selectedService.recurring}
                      onChange={(event) =>
                        updateWorkOrder({
                          recurring: event.currentTarget.checked,
                        })
                      }
                    />
                    Repeat this work order
                  </label>
                </div>

                {selectedService.recurring ? (
                  <div style={recurrenceGridStyle}>
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Repeat Every</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={selectedService.recurrenceInterval || 1}
                        onChange={(event) =>
                          updateWorkOrder({
                            recurrenceInterval: Math.max(
                              1,
                              Number(event.currentTarget.value) || 1,
                            ),
                          })
                        }
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Unit</span>
                      <select
                        value={selectedService.recurrenceUnit || "Weeks"}
                        onChange={(event) =>
                          updateWorkOrder({
                            recurrenceUnit:
                              event.currentTarget
                                .value as WorkOrderRecurrenceUnit,
                          })
                        }
                        style={inputStyle}
                      >
                        {(
                          [
                            "Days",
                            "Weeks",
                            "Months",
                            "Years",
                          ] as WorkOrderRecurrenceUnit[]
                        ).map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Field
                      label="Stop Repeating After"
                      value={selectedService.recurrenceEndDate || ""}
                      onChange={(value) =>
                        updateWorkOrder({ recurrenceEndDate: value })
                      }
                      placeholder="Optional end date"
                    />
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    This is a one-time work order. Turn recurrence on for
                    weekly, monthly, yearly, or custom intervals.
                  </p>
                )}

                {selectedService.lastCompletedDate ? (
                  <div style={recurrenceHistoryStyle}>
                    <strong>
                      Last completed{" "}
                      {formatDate(selectedService.lastCompletedDate)}
                    </strong>
                    <span style={mutedSmallStyle}>
                      {(selectedService.completionHistory || []).length} total
                      recorded completion
                      {(selectedService.completionHistory || []).length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                ) : null}
              </section>

              <div style={buttonRowStyle}>
                {isRecordDirty("work_order", selectedService.id) ? (
                  <button
                    type="button"
                    onClick={() => void saveWorkOrderRecord()}
                    style={goldButtonStyle}
                  >
                    Save Work Order
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void completeWorkOrder(selectedService)}
                  style={selectedService.recurring ? goldButtonStyle : secondaryButtonStyle}
                >
                  {selectedService.recurring
                    ? "Complete & Move to Next Due"
                    : "Mark Completed"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void deleteWorkOrderRecord(selectedService)
                  }
                  style={dangerButtonStyle}
                >
                  Delete Work Order
                </button>
              </div>

              {renderLinkedDocuments("Work Order", selectedService.id)}
            </div>
          ) : (
            <div style={noticeStyle}>
              <strong>Select a work order or add a new one.</strong>
              <p style={mutedSmallStyle}>
                Work orders can be one-time, recurring, and assigned to a
                property season.
              </p>
            </div>
          )
        }
      />
    );
}

