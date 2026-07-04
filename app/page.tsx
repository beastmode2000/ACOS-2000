"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  category: string;
  summary: string;
  assets: string[];
  procedures: string[];
  tasks: string[];
};

const STORAGE_KEY = "atlas_2000_map_labels_v1";

const DEFAULT_LABELS: MapLabel[] = [
  {
    id: "dock",
    name: "Dock",
    x: 67,
    y: 6,
    category: "Waterfront",
    summary: "Main dock system, dock platform, swim access, and lake access point.",
    assets: ["Dock structure", "Dock furniture", "Dock lighting"],
    procedures: ["Seasonal dock inspection", "Storm/wind check"],
    tasks: ["Inspect dock hardware"],
  },
  {
    id: "cobalt",
    name: "Cobalt",
    x: 84,
    y: 9,
    category: "Waterfront",
    summary: "Cobalt boat and associated boat lift area.",
    assets: ["Cobalt boat", "Cobalt boat lift", "Sunstream lift box"],
    procedures: ["Boat lift operation", "Battery/solar lift-box check"],
    tasks: ["Check lift box charge"],
  },
  {
    id: "seadoo",
    name: "Seadoo",
    x: 76,
    y: 11,
    category: "Waterfront",
    summary: "Sea-Doo storage / lift area near the dock.",
    assets: ["Sea-Doo", "Sea-Doo dock/lift area"],
    procedures: ["Sea-Doo launch/recovery", "Post-use rinse/check"],
    tasks: ["Confirm tie-down / lift position"],
  },
  {
    id: "water-trampoline",
    name: "Water Trampoline",
    x: 26,
    y: 13,
    category: "Waterfront",
    summary: "Floating water trampoline located off the north waterfront.",
    assets: ["Water trampoline", "Anchors", "Inflatable frame"],
    procedures: ["Seasonal install/removal", "Air pressure check"],
    tasks: ["Inspect anchor lines"],
  },
  {
    id: "waterside-lawn-north",
    name: "Waterside Lawn (North)",
    x: 42,
    y: 43,
    category: "Grounds",
    summary: "Large north lawn between the house and the waterfront.",
    assets: ["North lawn", "Irrigation zone", "Shoreline edge"],
    procedures: ["Mowing", "Irrigation inspection", "Fertilizer schedule"],
    tasks: ["Check sprinkler coverage"],
  },
  {
    id: "east-lawn",
    name: "East Lawn",
    x: 84,
    y: 72,
    category: "Grounds",
    summary: "Long green lawn area east/south of the sport court and addition.",
    assets: ["East lawn", "Irrigation", "Pathway edge"],
    procedures: ["Mowing", "Irrigation inspection"],
    tasks: ["Check dry spots"],
  },
  {
    id: "sport-court",
    name: "Sport Court",
    x: 84,
    y: 57,
    category: "Recreation",
    summary: "Sport court area east of the addition.",
    assets: ["Court surface", "Court net", "Court lighting"],
    procedures: ["Surface cleaning", "Net/equipment check"],
    tasks: ["Sweep/blow court"],
  },
  {
    id: "veggie-boxes",
    name: "Veggie Boxes",
    x: 84,
    y: 88,
    category: "Grounds",
    summary: "Three garden / vegetable boxes at the south end of the east lawn.",
    assets: ["Raised garden boxes", "Soil", "Irrigation/drip lines"],
    procedures: ["Watering", "Seasonal planting", "Weeding"],
    tasks: ["Check watering"],
  },
  {
    id: "new-garage",
    name: "New Garage",
    x: 69,
    y: 84,
    category: "Building",
    summary: "New garage structure at the lower/right garage area.",
    assets: ["Garage doors", "Lighting", "Storage"],
    procedures: ["Garage inspection", "Door check"],
    tasks: ["Check garage doors"],
  },
  {
    id: "old-garage",
    name: "Old Garage",
    x: 35,
    y: 86,
    category: "Building",
    summary: "Old garage structure at the lower/left garage area.",
    assets: ["Garage doors", "Storage", "Electrical"],
    procedures: ["Garage inspection", "Storage check"],
    tasks: ["Check clutter/safety"],
  },
  {
    id: "adu",
    name: "ADU",
    x: 11,
    y: 67,
    category: "Building",
    summary:
      "Accessory dwelling unit. Small box/building left of the old garage / left of the lower garage area.",
    assets: ["ADU structure", "Mini-split/HVAC", "Electrical", "Plumbing"],
    procedures: ["Guest-ready check", "HVAC check"],
    tasks: ["Confirm ADU is clean/ready"],
  },
  {
    id: "courtyard",
    name: "Courtyard",
    x: 45,
    y: 70,
    category: "Outdoor Living",
    summary:
      "Courtyard patio with chairs/fire-pit area, left of the gray covered walkway between the main house/addition/garage connection area.",
    assets: ["Patio furniture", "Fire pit", "Lighting", "Planters"],
    procedures: ["Furniture setup", "Fire-pit check", "Patio cleanup"],
    tasks: ["Clean seating area"],
  },
  {
    id: "trampoline-dog",
    name: "Trampoline/Dog",
    x: 57,
    y: 78,
    category: "Grounds",
    summary: "Separate trampoline/dog area. This is not the courtyard.",
    assets: ["Trampoline/dog area", "Turf/grass", "Pet cleanup supplies"],
    procedures: ["Dog cleanup", "Trampoline safety check"],
    tasks: ["Dog cleanup"],
  },
  {
    id: "original-house",
    name: "Original House",
    x: 36,
    y: 64,
    category: "Building",
    summary: "Original/main house structure.",
    assets: ["Original house", "Roof", "Interior systems"],
    procedures: ["House walkthrough", "Seasonal inspection"],
    tasks: ["General inspection"],
  },
  {
    id: "addition",
    name: "Addition",
    x: 67,
    y: 68,
    category: "Building",
    summary: "Addition wing including major interior systems and indoor pool area.",
    assets: ["Addition", "Indoor pool", "Mechanical systems"],
    procedures: ["Addition walkthrough", "Indoor pool checks"],
    tasks: ["Inspect addition systems"],
  },
  {
    id: "hot-tub-sundance",
    name: "Hot Tub (Sundance)",
    x: 56,
    y: 77,
    category: "Spa",
    summary:
      "Sundance 880-series Optima hot tub / spa area with related spa control and water-care equipment.",
    assets: ["Sundance Optima spa", "Spa controls", "ClearRay UV-C", "Heater"],
    procedures: ["Water test", "Filter clean", "Spa inspection"],
    tasks: ["Check spa water"],
  },
];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function makeId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function Page() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [labels, setLabels] = useState<MapLabel[]>(DEFAULT_LABELS);
  const [selectedId, setSelectedId] = useState("courtyard");
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setLabels(parsed);
      }
    } catch {
      setLabels(DEFAULT_LABELS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
  }, [labels, loaded]);

  const selected = useMemo(
    () => labels.find((label) => label.id === selectedId) || labels[0],
    [labels, selectedId]
  );

  function updateLabel(id: string, patch: Partial<MapLabel>) {
    setLabels((current) =>
      current.map((label) => (label.id === id ? { ...label, ...patch } : label))
    );
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingId(id);
    setSelectedId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!editMode || !draggingId || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);

    updateLabel(draggingId, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    });
  }

  function stopDrag() {
    setDraggingId(null);
  }

  function addLabel() {
    const label: MapLabel = {
      id: `custom-${Date.now()}`,
      name: "New Label",
      x: 50,
      y: 50,
      category: "Custom",
      summary: "Custom Atlas map label.",
      assets: [],
      procedures: [],
      tasks: [],
    };

    setLabels((current) => [...current, label]);
    setSelectedId(label.id);
    setEditMode(true);
  }

  function removeSelectedLabel() {
    if (!selected) return;
    const next = labels.filter((label) => label.id !== selected.id);
    setLabels(next.length ? next : DEFAULT_LABELS);
    setSelectedId(next[0]?.id || DEFAULT_LABELS[0].id);
  }

  function resetLabels() {
    const ok = window.confirm(
      "Reset all map labels back to the default Atlas layout?"
    );
    if (!ok) return;
    setLabels(DEFAULT_LABELS);
    setSelectedId("courtyard");
  }

  return (
    <main className="atlas-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">◎</div>
          <div>
            <div className="brand-name">ATLAS / 2000</div>
            <div className="brand-subtitle">Estate Operations</div>
          </div>
        </div>

        <nav className="nav">
          {[
            "Overview",
            "Map",
            "Assets",
            "Vendors",
            "Calendar",
            "Weather",
            "Documents",
            "Procedures",
            "Logs",
            "AI Assistant",
            "Team",
          ].map((item) => (
            <button
              key={item}
              className={item === "Map" ? "nav-item active" : "nav-item"}
              type="button"
            >
              <span>{item === "Map" ? "⌖" : "•"}</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <div>
            <strong>Atlas Base v1</strong>
            <span>Map overlay editor</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>Property Map</h1>
            <p>
              Fixed original map image. Labels are editable overlays only.
            </p>
          </div>

          <div className="actions">
            <button
              className={editMode ? "button primary" : "button"}
              type="button"
              onClick={() => setEditMode((value) => !value)}
            >
              {editMode ? "Done Editing" : "Edit Labels"}
            </button>
            <button className="button" type="button" onClick={addLabel}>
              + Add Label
            </button>
            <button className="button danger" type="button" onClick={resetLabels}>
              Reset
            </button>
          </div>
        </header>

        <div className="workspace">
          <section className="map-card">
            <div className="map-toolbar">
              <div>
                <strong>Atlas Property Map</strong>
                <span>
                  {editMode
                    ? "Drag labels to reposition. Changes save in this browser."
                    : "Click a label to open section details."}
                </span>
              </div>
              <div className="label-count">{labels.length} labels</div>
            </div>

            <div
              ref={mapRef}
              className={editMode ? "map-wrap editing" : "map-wrap"}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerLeave={stopDrag}
            >
              <img
                src="/atlas-property-map.png"
                alt="Atlas 2000 property aerial map"
                className="property-map"
                draggable={false}
              />

              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className={
                    label.id === selected?.id
                      ? "map-label selected"
                      : "map-label"
                  }
                  style={{
                    left: `${label.x}%`,
                    top: `${label.y}%`,
                  }}
                  onClick={() => setSelectedId(label.id)}
                  onPointerDown={(event) => startDrag(event, label.id)}
                  title={editMode ? "Drag to move label" : label.name}
                >
                  <span className="pin-dot" />
                  <span className="pin-text">{label.name}</span>
                </button>
              ))}
            </div>
          </section>

          <aside className="details">
            <div className="details-header">
              <div>
                <div className="section-kicker">{selected?.category}</div>
                <h2>{selected?.name}</h2>
              </div>
              <button className="icon-button" type="button">
                ×
              </button>
            </div>

            <p className="summary">{selected?.summary}</p>

            {editMode && selected && (
              <div className="editor-box">
                <h3>Label Settings</h3>

                <label>
                  Name
                  <input
                    value={selected.name}
                    onChange={(event) =>
                      updateLabel(selected.id, {
                        name: event.target.value,
                        id: selected.id.startsWith("custom-")
                          ? selected.id
                          : makeId(event.target.value) || selected.id,
                      })
                    }
                  />
                </label>

                <label>
                  Category
                  <input
                    value={selected.category}
                    onChange={(event) =>
                      updateLabel(selected.id, { category: event.target.value })
                    }
                  />
                </label>

                <div className="coord-grid">
                  <label>
                    X %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={selected.x}
                      onChange={(event) =>
                        updateLabel(selected.id, {
                          x: clamp(Number(event.target.value)),
                        })
                      }
                    />
                  </label>

                  <label>
                    Y %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={selected.y}
                      onChange={(event) =>
                        updateLabel(selected.id, {
                          y: clamp(Number(event.target.value)),
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  Summary
                  <textarea
                    value={selected.summary}
                    onChange={(event) =>
                      updateLabel(selected.id, { summary: event.target.value })
                    }
                  />
                </label>

                <button
                  className="button danger full"
                  type="button"
                  onClick={removeSelectedLabel}
                >
                  Remove This Label
                </button>
              </div>
            )}

            <div className="detail-list">
              <DetailGroup title="Assets" items={selected?.assets || []} />
              <DetailGroup title="Procedures" items={selected?.procedures || []} />
              <DetailGroup title="Open Tasks" items={selected?.tasks || []} />
            </div>

            <div className="note-box">
              <strong>Next database step</strong>
              <span>
                This label editor saves locally first. Later we can connect these
                labels, photos, comments, and voice notes to Neon/storage so phone
                and desktop sync.
              </span>
            </div>
          </aside>
        </div>
      </section>

      <style>{`
        :root {
          --navy: #071d3a;
          --navy-2: #0c2a52;
          --gold: #caa24a;
          --line: #e6e9ef;
          --text: #11213d;
          --muted: #647086;
          --bg: #f6f8fb;
          --card: #ffffff;
          --danger: #b42318;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        .atlas-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px 1fr;
          background: var(--bg);
        }

        .sidebar {
          background: linear-gradient(180deg, #061832 0%, #082348 100%);
          color: white;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        .brand {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border: 2px solid var(--gold);
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: var(--gold);
          font-size: 25px;
          line-height: 1;
        }

        .brand-name {
          letter-spacing: 0.12em;
          font-weight: 800;
          font-size: 17px;
        }

        .brand-subtitle {
          color: var(--gold);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 11px;
          margin-top: 4px;
        }

        .nav {
          display: grid;
          gap: 8px;
        }

        .nav-item {
          border: 0;
          color: rgba(255,255,255,0.78);
          background: transparent;
          padding: 13px 14px;
          border-radius: 12px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: default;
        }

        .nav-item.active {
          background: rgba(255,255,255,0.11);
          color: white;
          box-shadow: inset 3px 0 0 var(--gold);
        }

        .sidebar-footer {
          margin-top: auto;
          border-top: 1px solid rgba(255,255,255,0.12);
          padding-top: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.84);
          font-size: 13px;
        }

        .sidebar-footer span {
          display: block;
          color: rgba(255,255,255,0.54);
          margin-top: 2px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 99px;
          background: #21c55d;
          box-shadow: 0 0 0 5px rgba(33,197,93,0.12);
        }

        .content {
          padding: 28px;
          min-width: 0;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          letter-spacing: -0.04em;
        }

        .topbar p {
          margin: 6px 0 0;
          color: var(--muted);
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .button {
          border: 1px solid var(--line);
          background: white;
          color: var(--text);
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(16,24,40,0.04);
        }

        .button.primary {
          background: var(--navy);
          color: white;
          border-color: var(--navy);
        }

        .button.danger {
          color: var(--danger);
        }

        .button.full {
          width: 100%;
        }

        .workspace {
          display: grid;
          grid-template-columns: minmax(480px, 1fr) 390px;
          gap: 20px;
          align-items: start;
        }

        .map-card,
        .details {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        }

        .map-card {
          overflow: hidden;
        }

        .map-toolbar {
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--line);
        }

        .map-toolbar strong {
          display: block;
          font-size: 16px;
        }

        .map-toolbar span {
          display: block;
          color: var(--muted);
          font-size: 13px;
          margin-top: 3px;
        }

        .label-count {
          color: var(--muted);
          font-size: 13px;
          white-space: nowrap;
        }

        .map-wrap {
          position: relative;
          background: #06101f;
          user-select: none;
          touch-action: none;
        }

        .map-wrap.editing {
          cursor: move;
        }

        .property-map {
          display: block;
          width: 100%;
          height: auto;
          pointer-events: none;
        }

        .map-label {
          position: absolute;
          transform: translate(-50%, -50%);
          border: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          filter: drop-shadow(0 6px 10px rgba(0,0,0,0.35));
          z-index: 2;
        }

        .map-wrap.editing .map-label {
          cursor: grab;
        }

        .map-wrap.editing .map-label:active {
          cursor: grabbing;
        }

        .pin-dot {
          width: 12px;
          height: 12px;
          border: 2px solid white;
          background: var(--gold);
          border-radius: 50%;
          flex: 0 0 auto;
        }

        .pin-text {
          background: rgba(7, 29, 58, 0.96);
          color: white;
          border: 1px solid rgba(255,255,255,0.82);
          border-radius: 999px;
          padding: 7px 11px;
          font-weight: 800;
          font-size: 13px;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }

        .map-label.selected .pin-text {
          background: var(--gold);
          color: #071d3a;
          border-color: white;
        }

        .map-label.selected .pin-dot {
          background: #071d3a;
          border-color: white;
          box-shadow: 0 0 0 4px rgba(202,162,74,0.35);
        }

        .details {
          padding: 22px;
          position: sticky;
          top: 20px;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          border-bottom: 1px solid var(--line);
          padding-bottom: 16px;
        }

        .section-kicker {
          color: var(--gold);
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.14em;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .details h2 {
          margin: 0;
          font-size: 30px;
          letter-spacing: -0.04em;
        }

        .icon-button {
          border: 0;
          background: transparent;
          color: var(--muted);
          font-size: 28px;
          line-height: 1;
        }

        .summary {
          color: #344054;
          line-height: 1.55;
          margin: 18px 0;
        }

        .editor-box {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 18px;
          background: #fbfcfe;
        }

        .editor-box h3 {
          margin: 0 0 12px;
          font-size: 15px;
        }

        label {
          display: grid;
          gap: 6px;
          font-weight: 800;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 12px;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 11px;
          background: white;
          color: var(--text);
          outline: none;
        }

        textarea {
          min-height: 86px;
          resize: vertical;
        }

        input:focus,
        textarea:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(202,162,74,0.16);
        }

        .coord-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .detail-list {
          display: grid;
          gap: 12px;
        }

        .detail-group {
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
        }

        .detail-group-header {
          background: #f8fafc;
          padding: 12px 14px;
          font-weight: 900;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-group ul {
          margin: 0;
          padding: 10px 14px 14px 28px;
          color: #344054;
        }

        .detail-group li {
          margin: 5px 0;
        }

        .empty {
          color: var(--muted);
          padding: 12px 14px 14px;
          font-size: 14px;
        }

        .note-box {
          margin-top: 16px;
          padding: 14px;
          border-radius: 14px;
          background: #fff8e6;
          border: 1px solid rgba(202,162,74,0.35);
          color: #483600;
          display: grid;
          gap: 5px;
          font-size: 13px;
          line-height: 1.45;
        }

        @media (max-width: 1100px) {
          .atlas-shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            position: static;
            padding: 18px;
          }

          .nav {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .details {
            position: static;
          }
        }

        @media (max-width: 700px) {
          .content {
            padding: 14px;
          }

          .topbar {
            flex-direction: column;
          }

          .actions {
            justify-content: flex-start;
          }

          .nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pin-text {
            font-size: 11px;
            padding: 6px 8px;
          }

          .workspace {
            gap: 14px;
          }
        }
      `}</style>
    </main>
  );
}

function DetailGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="detail-group">
      <div className="detail-group-header">
        <span>{title}</span>
        <span>{items.length}</span>
      </div>

      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="empty">No records added yet.</div>
      )}
    </div>
  );
}
