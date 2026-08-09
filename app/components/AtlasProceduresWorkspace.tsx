"use client";

import React from "react";

export default function AtlasProceduresWorkspace(props: any) {
  const {
    assetRecords = [],
    colors,
    buttonRowStyle,
    cardStyle,
    closeProcedureViewer,
    createProcedureRecord,
    deleteProcedureRecord,
    duplicateProcedureRecord,
    editorHeaderStyle,
    eyebrowStyle,
    filteredProcedures = [],
    goldButtonStyle,
    inputStyle,
    isMobile,
    isRecordDirty,
    locations = [],
    moveProcedureStep,
    mutedSmallStyle,
    noticeStyle,
    openUploadedFile,
    procedureDraftNotes,
    procedureMessage,
    rowButtonStyle,
    saveDirtyRecord,
    secondaryButtonStyle,
    selectedProcedure,
    selectedProcedureId,
    setPreviewFile,
    setProcedureDraftNotes,
    setProcedureMessage,
    setSelectedProcedureId,
    smallSubtleButtonStyle,
    tinyDangerButtonStyle,
    toggleProcedureLink,
    updateProcedure,
    updateProcedureSteps,
    uploadProcedureFiles,
    vendorRecords = [],
  } = props;

  const c = colors || {
    navy: "#0B2942",
    gold: "#D4A63A",
    line: "#D8E0E8",
    muted: "#6C7B88",
    red: "#B42318",
  };

  const procedure = selectedProcedure || {
    id: "",
    title: "",
    area: "",
    category: "Maintenance",
    priority: "Normal",
    status: "Draft",
    purpose: "",
    safetyNotes: "",
    toolsParts: "",
    requiredTools: [],
    requiredParts: [],
    estimatedTime: "",
    steps: [],
    linkedAssetIds: [],
    linkedLocationIds: [],
    linkedVendorIds: [],
    photos: [],
    documents: [],
  };

  const hasSelection = Boolean(selectedProcedureId);

  function chooseProcedure(id: string) {
    setSelectedProcedureId(id);
    setProcedureDraftNotes("");
    setProcedureMessage("");
  }

  const editor = hasSelection ? (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>Procedure</div>
          <h2 style={{ ...editorHeaderStyle, margin: "3px 0" }}>
            {procedure.title || "New Procedure"}
          </h2>
          <div style={mutedSmallStyle}>
            {procedure.status || "Draft"} · {(procedure.steps || []).length} steps
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={() => duplicateProcedureRecord(procedure)}
            style={secondaryButtonStyle}
          >
            Duplicate
          </button>
          {procedure.id ? (
            <button
              type="button"
              onClick={() => void deleteProcedureRecord(procedure)}
              style={tinyDangerButtonStyle}
            >
              Delete
            </button>
          ) : null}
          {isMobile ? (
            <button type="button" onClick={closeProcedureViewer} style={secondaryButtonStyle}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 10,
        }}
      >
        <label style={{ display: "grid", gap: 5 }}>
          <span style={mutedSmallStyle}>Title</span>
          <input
            value={procedure.title || ""}
            onChange={(e) =>
              updateProcedure({ title: e.currentTarget.value, updatedAt: new Date().toISOString() })
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 5 }}>
          <span style={mutedSmallStyle}>Area</span>
          <input
            value={procedure.area || ""}
            onChange={(e) =>
              updateProcedure({ area: e.currentTarget.value, updatedAt: new Date().toISOString() })
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 5 }}>
          <span style={mutedSmallStyle}>Category</span>
          <input
            value={procedure.category || ""}
            onChange={(e) =>
              updateProcedure({ category: e.currentTarget.value, updatedAt: new Date().toISOString() })
            }
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 5 }}>
          <span style={mutedSmallStyle}>Estimated Time</span>
          <input
            value={procedure.estimatedTime || ""}
            onChange={(e) =>
              updateProcedure({ estimatedTime: e.currentTarget.value, updatedAt: new Date().toISOString() })
            }
            style={inputStyle}
          />
        </label>
      </div>

      <div style={cardStyle}>
        <div style={eyebrowStyle}>Notes</div>
        <textarea
          value={procedure.purpose || ""}
          onChange={(e) =>
            updateProcedure({ purpose: e.currentTarget.value, updatedAt: new Date().toISOString() })
          }
          placeholder="Purpose, notes, reminders, or important details…"
          style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
        />
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div>
            <div style={eyebrowStyle}>Procedure Checklist</div>
            <strong>{(procedure.steps || []).length} steps</strong>
          </div>
          <button
            type="button"
            onClick={() => updateProcedureSteps([...(procedure.steps || []), "New step"])}
            style={smallSubtleButtonStyle}
          >
            Add Step
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {(procedure.steps || []).map((step: string, index: number) => (
            <div
              key={`${procedure.id || "new"}-step-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "28px minmax(0,1fr)" : "30px minmax(0,1fr) auto",
                gap: 8,
                alignItems: "center",
                padding: 8,
                border: `1px solid ${c.line}`,
                borderRadius: 9,
                background: "#FFFFFF",
              }}
            >
              <strong style={{ textAlign: "center" }}>{index + 1}</strong>
              <input
                value={step}
                onChange={(e) => {
                  const next = [...(procedure.steps || [])];
                  next[index] = e.currentTarget.value;
                  updateProcedureSteps(next);
                }}
                style={inputStyle}
              />
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  gridColumn: isMobile ? "2" : undefined,
                  justifyContent: isMobile ? "flex-start" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => moveProcedureStep(index, -1)}
                  disabled={index === 0}
                  style={smallSubtleButtonStyle}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveProcedureStep(index, 1)}
                  disabled={index === (procedure.steps || []).length - 1}
                  style={smallSubtleButtonStyle}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateProcedureSteps(
                      (procedure.steps || []).filter((_: string, i: number) => i !== index),
                    )
                  }
                  style={tinyDangerButtonStyle}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {!(procedure.steps || []).length ? (
            <div style={noticeStyle}>Add the first checklist step.</div>
          ) : null}
        </div>
      </div>

      <details style={cardStyle}>
        <summary style={{ cursor: "pointer", fontWeight: 850, color: c.navy }}>
          More Procedure Details
        </summary>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={mutedSmallStyle}>Safety Notes</span>
            <textarea
              value={procedure.safetyNotes || ""}
              onChange={(e) =>
                updateProcedure({
                  safetyNotes: e.currentTarget.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            />
          </label>

          <label style={{ display: "grid", gap: 5 }}>
            <span style={mutedSmallStyle}>Tools / Parts</span>
            <textarea
              value={procedure.toolsParts || ""}
              onChange={(e) =>
                updateProcedure({
                  toolsParts: e.currentTarget.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            />
          </label>

          <div>
            <strong style={{ color: c.navy }}>Linked Assets</strong>
            <div style={{ ...buttonRowStyle, marginTop: 6 }}>
              {assetRecords.map((asset: any) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggleProcedureLink("linkedAssetIds", asset.id)}
                  style={
                    (procedure.linkedAssetIds || []).includes(asset.id)
                      ? goldButtonStyle
                      : smallSubtleButtonStyle
                  }
                >
                  {asset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <strong style={{ color: c.navy }}>Linked Locations</strong>
            <div style={{ ...buttonRowStyle, marginTop: 6 }}>
              {locations.map((location: any) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => toggleProcedureLink("linkedLocationIds", location.id)}
                  style={
                    (procedure.linkedLocationIds || []).includes(location.id)
                      ? goldButtonStyle
                      : smallSubtleButtonStyle
                  }
                >
                  {location.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <strong style={{ color: c.navy }}>Linked Vendors</strong>
            <div style={{ ...buttonRowStyle, marginTop: 6 }}>
              {vendorRecords.map((vendor: any) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => toggleProcedureLink("linkedVendorIds", vendor.id)}
                  style={
                    (procedure.linkedVendorIds || []).includes(vendor.id)
                      ? goldButtonStyle
                      : smallSubtleButtonStyle
                  }
                >
                  {vendor.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div style={cardStyle}>
        <div style={eyebrowStyle}>Photos & Documents</div>
        <div style={{ ...buttonRowStyle, marginTop: 8 }}>
          <label style={{ ...secondaryButtonStyle, cursor: "pointer" }}>
            Add Photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void uploadProcedureFiles("photos", e.currentTarget.files)}
              style={{ display: "none" }}
            />
          </label>
          <label style={{ ...secondaryButtonStyle, cursor: "pointer" }}>
            Add Documents
            <input
              type="file"
              multiple
              onChange={(e) => void uploadProcedureFiles("documents", e.currentTarget.files)}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {(procedure.photos || []).length ? (
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {(procedure.photos || []).map((photo: any) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPreviewFile(photo)}
                style={secondaryButtonStyle}
              >
                {photo.name || "Procedure photo"}
              </button>
            ))}
          </div>
        ) : null}

        {(procedure.documents || []).length ? (
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {(procedure.documents || []).map((doc: any) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => openUploadedFile(doc)}
                style={secondaryButtonStyle}
              >
                {doc.name || "Document"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={buttonRowStyle}>
        {procedure.id && isRecordDirty("procedure", procedure.id) ? (
          <button
            type="button"
            onClick={() =>
              void saveDirtyRecord(
                "procedures",
                procedure,
                "procedure",
                procedure.id,
              )
            }
            style={goldButtonStyle}
          >
            Save Procedure
          </button>
        ) : procedure.id ? (
          <span style={{ color: c.muted, fontSize: 12, fontWeight: 800 }}>Saved</span>
        ) : null}
      </div>
    </div>
  ) : (
    <div style={noticeStyle}>
      <strong>Select a procedure.</strong>
      <div style={{ ...mutedSmallStyle, marginTop: 4 }}>
        Choose one from the list or add a new procedure.
      </div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={eyebrowStyle}>Procedures</div>
          <h1 style={{ margin: "2px 0 3px", color: c.navy }}>Procedures</h1>
          <div style={mutedSmallStyle}>
            Select a procedure, then work through or edit its checklist.
          </div>
        </div>

        <button type="button" onClick={() => createProcedureRecord()} style={goldButtonStyle}>
          Add Procedure
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(240px, 320px) minmax(0, 1fr)",
          gap: 12,
          alignItems: "start",
        }}
      >
        <aside
          style={{
            ...cardStyle,
            padding: 8,
            maxHeight: isMobile ? undefined : "calc(100vh - 130px)",
            overflowY: "auto",
            position: isMobile ? "static" : "sticky",
            top: isMobile ? undefined : 10,
          }}
        >
          <div style={{ ...eyebrowStyle, margin: "4px 5px 8px" }}>Procedure List</div>
          <div style={{ display: "grid", gap: 6 }}>
            {filteredProcedures.map((item: any) => {
              const active = item.id === selectedProcedureId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseProcedure(item.id)}
                  style={{
                    ...rowButtonStyle,
                    width: "100%",
                    textAlign: "left",
                    borderColor: active ? c.gold : c.line,
                    background: active ? "#FFF8E5" : "#FFFFFF",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: c.navy }}>
                      {item.title || "Untitled Procedure"}
                    </strong>
                    <div style={{ ...mutedSmallStyle, marginTop: 3 }}>
                      {item.area || "General"} · {(item.steps || []).length} steps
                    </div>
                  </div>
                </button>
              );
            })}

            {!filteredProcedures.length ? (
              <div style={noticeStyle}>No procedures yet.</div>
            ) : null}
          </div>
        </aside>

        <main style={{ ...cardStyle, minWidth: 0, padding: 14 }}>
          {editor}
        </main>
      </div>
    </div>
  );
}
