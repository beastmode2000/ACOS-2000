function renderMap() {
  const mapPhotoCount = mapLabels.reduce((total, label) => total + (label.photos?.length ?? 0), 0);

  return (
    <SectionShell
      eyebrow="Property Map"
      title="Locked Map with Movable Atlas Labels"
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span style={badgeStyle("Online")}>{mapLabels.length} Labels</span>
          <button type="button" onClick={startNewMapLabel} style={goldButtonStyle}>Add Label</button>
          <button type="button" onClick={resetMapLabels} style={deleteButtonStyle}>Reset Map</button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.35fr 0.65fr", gap: isMobile ? 14 : 16, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...emptyStateStyle, marginBottom: 12 }}>
            {isMobile
              ? "Mobile map: scroll left/right to view the full property. Tap or drag a label to select it, then edit details below."
              : "Drag a label to move it. Click a label to edit its name, type, info, and photos. The map image stays locked."}
          </div>

          <div style={isMobile ? mobileMapViewportStyle : undefined}>
            <div ref={mapRef} style={{ ...mapShellStyle, ...(isMobile ? mobileMapShellStyle : {}) }}>
              <img src="/atlas-property-map.png" alt="Atlas property map" style={mapImageStyle} draggable={false} />

              {mapLabels.map((label) => {
                const isSelected = label.id === selectedMapLabelId;

                return (
                  <button
                    key={label.id}
                    type="button"
                    onPointerDown={(event) => handleMapLabelPointerDown(event, label.id)}
                    style={{
                      ...mapLabelPinStyle,
                      ...(isMobile ? mobileMapLabelPinStyle : {}),
                      top: `${label.y}%`,
                      left: `${label.x}%`,
                      background: isSelected ? colors.gold : colors.navy,
                      color: isSelected ? colors.navy : "white",
                      borderColor: isSelected ? colors.navy : colors.gold2,
                      zIndex: isSelected ? 4 : 3,
                    }}
                    title="Drag to move. Edit details below."
                  >
                    <span style={mapPinDotStyle}>{Math.round(label.x)}/{Math.round(label.y)}</span>
                    {label.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={recordCardStyle}>
            <div style={goldEyebrowStyle}>{mapLabelMode === "new" ? "New Map Label" : "Selected Map Label"}</div>
            <h3 style={{ color: colors.navy, margin: "7px 0 10px" }}>{mapLabelForm.label || selectedMapLabel?.label || "Map Label"}</h3>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={labelStyle}>Label Name<input value={mapLabelForm.label} onChange={(event) => setMapLabelForm((current) => ({ ...current, label: event.target.value }))} style={inputStyle} /></label>
              <label style={labelStyle}>Type / Category<input value={mapLabelForm.category} onChange={(event) => setMapLabelForm((current) => ({ ...current, category: event.target.value }))} style={inputStyle} /></label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={labelStyle}>Left %<input type="number" min="0" max="100" value={Math.round(mapLabelForm.x)} onChange={(event) => setMapLabelForm((current) => ({ ...current, x: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
                <label style={labelStyle}>Top %<input type="number" min="0" max="100" value={Math.round(mapLabelForm.y)} onChange={(event) => setMapLabelForm((current) => ({ ...current, y: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
              </div>

              <label style={labelStyle}>Info / Notes<textarea value={mapLabelForm.notes} onChange={(event) => setMapLabelForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} /></label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button type="button" onClick={saveMapLabel} style={widePrimaryButtonStyle}>Save Label</button>
                <button type="button" onClick={deleteMapLabel} style={deleteButtonStyle}>Delete Label</button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQuery(mapLabelForm.label || selectedMapLabel?.label || "");
                  setScreen("locations");
                }}
                style={linkButtonStyle}
              >
                Search Atlas Records for This Label
              </button>
            </div>
          </div>

          <div style={recordCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={goldEyebrowStyle}>Map Photos</div>
                <h3 style={{ color: colors.navy, margin: "6px 0 0" }}>{(mapLabelForm.photos ?? []).length} on this label</h3>
              </div>
              <span style={badgeStyle("Monitor")}>{mapPhotoCount} Total</span>
            </div>

            <label style={{ ...uploadBoxStyle, marginTop: 12 }}>
              Add Photos to Label
              <input type="file" accept="image/*" multiple onChange={handleMapLabelPhotoUpload} style={{ display: "none" }} />
            </label>

            {(mapLabelForm.photos ?? []).length ? (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {(mapLabelForm.photos ?? []).map((photo) => (
                  <div key={photo.id} style={inlineCardStyle}>
                    <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 14, marginBottom: 8 }} />
                    <div style={{ color: colors.navy, fontWeight: 950, fontSize: 13, wordBreak: "break-word" }}>{photo.name}</div>
                    <div style={{ color: colors.muted, fontSize: 12, margin: "4px 0 8px" }}>{new Date(photo.createdAt).toLocaleString()}</div>
                    <button type="button" onClick={() => deleteMapLabelPhoto(photo.id)} style={deleteButtonStyle}>Delete Photo</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...emptyStateStyle, marginTop: 12 }}>No photos added to this map label yet.</div>
            )}
          </div>
        </div>dk
      </div>
    </SectionShell>
  );
}
