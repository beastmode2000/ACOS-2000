"use client"

import { useState } from "react"

type Tab =
  | "overview"
  | "assets"
  | "locations"
  | "calendar"
  | "weather"
  | "photos"
  | "documents"
  | "systems"

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "assets", label: "Assets" },
  { id: "locations", label: "Locations" },
  { id: "calendar", label: "Calendar" },
  { id: "weather", label: "Weather" },
  { id: "photos", label: "Photos" },
  { id: "documents", label: "Documents" },
  { id: "systems", label: "Systems" },
]

const locations = [
  "Attic",
  "Attic 2",
  "Back Patio / Water Side",
  "Courtyard",
  "Dock",
  "Elan’s Room",
  "Elliot’s Room",
  "Elyse’s Room",
  "Evi’s Room",
  "Fire Pit",
  "Fitness Room",
  "Formal Dining Room",
  "Garage",
  "Hangar",
  "Indoor Pool Addition",
  "Kitchen",
  "Mechanical Room",
  "Old Garage",
  "Sport Court",
  "Trampoline Area",
]

const assets = [
  {
    name: "Viessmann Vitodens 200 Boiler System",
    area: "Mechanical Room",
    status: "Priority",
    detail:
      "Two Viessmann Vitodens 200 boilers, Boiler 1 and Boiler 2, hydronic/cascade records, low-water cutoff notes, nameplate records, and service history.",
  },
  {
    name: "Viessmann Vitocell 300-V DHW Tanks",
    area: "Mechanical Room",
    status: "Documented",
    detail:
      "Twin gray Viessmann Vitocell 300-V indirect domestic hot water storage tanks. EVIA 300, 79 USG / 300 L records.",
  },
  {
    name: "Carrier + Honeywell HZ432 HVAC Zones",
    area: "HVAC",
    status: "Active",
    detail:
      "Forced-air Carrier equipment with Honeywell HZ432 zoning records and comfort notes.",
  },
  {
    name: "Desert Aire Pool Dehumidification",
    area: "Indoor Pool",
    status: "Active",
    detail: "Indoor pool dehumidification system tied to pool addition records.",
  },
  {
    name: "Pentair / Triton Pool Filtration",
    area: "Pool Equipment",
    status: "Active",
    detail: "Pool treatment, filtration, backwash procedure, and water-system notes.",
  },
  {
    name: "Sundance Optima Spa",
    area: "Spa / Hot Tub",
    status: "Documented",
    detail:
      "Sundance 880-series OPTIMA spa. 03/21/15 nameplate. Serial 00P3LCD-100528521-0315. ClearRay UV-C and HydroQuip heater notes.",
  },
  {
    name: "Sunstream Lift Boxes",
    area: "Dock",
    status: "Photo Group",
    detail:
      "Multiple Sunstream lift control/battery/solar boxes. Newer Sunstream box is for the Cobalt lift.",
  },
  {
    name: "Cobalt Boat",
    area: "Dock",
    status: "Active",
    detail:
      "Boat repair, service, winterization, de-winterization, dock, and lift records.",
  },
  {
    name: "Sea-Doo / PWC",
    area: "Dock",
    status: "Active",
    detail:
      "Sea-Doo repair, crash-repair invoice, fuel checks, and dock location notes.",
  },
  {
    name: "Lutron Motorized Blinds",
    area: "Interior",
    status: "Vendor Linked",
    detail: "Linked to Penthouse Drapery motorized roller shade repair invoice #176396.",
  },
  {
    name: "Wolf Range",
    area: "Kitchen",
    status: "Needs Cleanup",
    detail: "MaintainX duplicate naming check: wolfe range / Range-Wolf.",
  },
  {
    name: "Hangar Aircraft Records",
    area: "Hangar",
    status: "Reference",
    detail:
      "Gulfstream G600 N23PA, Gulfstream G280 N280CC, Gulfstream G280 N755PA, and Pilatus PC12 N126AL.",
  },
]

const recurringWork = [
  "Basement + Garage Garbage/Recycling",
  "Clean Basement Bathroom",
  "Cobalt Boat De-Winterization",
  "Cobalt Boat Repair / Service",
  "Cobalt Boat Winterization",
  "Daily Dog Cleanup",
  "Daily Sea-Doo Fuel Check / Fill",
  "Fill All Gas Cans",
  "Golf Simulator Clean / Inspect",
  "Guardian Statues Condition Check",
  "Large Property Blow-Off",
  "Main Hallway Artwork Condition Check",
]

const documents = [
  "2000 Systems Layout Draft v1",
  "Penthouse Drapery Invoice #176396",
  "Sundance Optima Spa Nameplate",
  "Viessmann Boiler Nameplates",
  "Sunstream Lift Box Photo Set",
  "Indoor Pool Construction Photo",
  "Sea-Doo Repair Invoice",
  "Pool Backwash Procedure",
]

const photoGroups = [
  "Indoor pool construction",
  "Mechanical room boilers",
  "Pool equipment",
  "Spa / hot tub",
  "Dock and Sunstream lift boxes",
  "Cobalt and Sea-Doo",
  "Property map edits",
  "Basement walkthrough",
  "Vendor invoices",
]

const systems = [
  {
    title: "Mechanical Core",
    items: [
      "Viessmann boiler pair",
      "Vitocell DHW tanks",
      "Hydronic/cascade records",
      "Low-water cutoff and safety controls",
    ],
  },
  {
    title: "Pool / Spa",
    items: [
      "Indoor pool addition",
      "Desert Aire dehumidification",
      "Pentair / Triton filtration",
      "Sundance Optima spa",
    ],
  },
  {
    title: "HVAC / Comfort",
    items: [
      "Carrier forced-air equipment",
      "Honeywell HZ432 zoning",
      "Room comfort notes",
      "Mini-split decision notes",
    ],
  },
  {
    title: "Dock / Waterfront",
    items: [
      "Sunstream lift boxes",
      "Cobalt lift",
      "Sea-Doo dock location",
      "Water trampoline notes",
    ],
  },
]

const card = {
  background: "rgba(15, 23, 42, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
}

export default function AtlasDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [selectedAsset, setSelectedAsset] = useState(assets[0])

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07111f",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <header
          style={{
            borderRadius: 28,
            padding: 34,
            background:
              "linear-gradient(135deg, #0f172a 0%, #0f3a45 55%, #16422d 100%)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: "#bef264",
                    color: "#07111f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 28,
                  }}
                >
                  A
                </div>
                <div>
                  <div style={{ color: "#bef264", fontWeight: 900, letterSpacing: 4, fontSize: 12 }}>
                    ATLAS / 2000
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 14 }}>
                    Estate Operations Command System
                  </div>
                </div>
              </div>

              <h1 style={{ fontSize: 52, lineHeight: 1, margin: 0, letterSpacing: -2 }}>
                2000 Estate Operations
              </h1>

              <p style={{ color: "#cbd5e1", fontSize: 17, lineHeight: 1.6, maxWidth: 850 }}>
                Central operating manual for locations, systems, assets, vendors, procedures,
                recurring work, photos, documents, weather, calendar, and field notes.
              </p>
            </div>

            <div style={{ ...card, minWidth: 260, background: "rgba(0,0,0,0.25)" }}>
              <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>
                STATUS
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>Ops Ready</div>
              <div style={{ marginTop: 10, color: "#cbd5e1" }}>
                Domain: <span style={{ color: "#bef264", fontWeight: 800 }}>www.atlas2000.com</span>
              </div>
            </div>
          </div>
        </header>

        <nav
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            padding: 10,
            borderRadius: 18,
            background: "rgba(2, 6, 23, 0.7)",
            border: "1px solid rgba(148, 163, 184, 0.14)",
            marginBottom: 22,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: "none",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: activeTab === tab.id ? "#bef264" : "transparent",
                color: activeTab === tab.id ? "#07111f" : "#cbd5e1",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {[
                ["42", "Locations", "Rooms, exterior zones, dock, hangar"],
                ["12+", "Assets", "Core equipment seeded"],
                ["14", "Vendors", "Invoices and service providers"],
                ["26", "Procedures", "Recurring and seasonal work"],
                ["9", "Photo Groups", "Ready for storage links"],
              ].map(([value, label, sub]) => (
                <div key={label} style={card}>
                  <div style={{ fontSize: 34, fontWeight: 900 }}>{value}</div>
                  <div style={{ marginTop: 4, color: "#e2e8f0", fontWeight: 800 }}>{label}</div>
                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 13 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
                gap: 18,
                marginTop: 18,
              }}
            >
              <div style={card}>
                <h2 style={{ fontSize: 28, marginTop: 0 }}>Recurring Work</h2>
                <div style={{ display: "grid", gap: 10 }}>
                  {recurringWork.map((work) => (
                    <div
                      key={work}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: 14,
                        background: "rgba(2, 6, 23, 0.45)",
                        border: "1px solid rgba(148, 163, 184, 0.12)",
                      }}
                    >
                      <strong>{work}</strong>
                      <span style={{ color: "#bef264", fontWeight: 900 }}>Active</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={card}>
                <h2 style={{ fontSize: 28, marginTop: 0 }}>Priority Notes</h2>
                <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                  This is now the clean Atlas interface layer. Login work is paused until the dashboard is stable.
                </p>
                <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                  Photos and documents need real storage links later. The sections are ready.
                </p>
                <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
                  Use Atlas as the daily front door for maintenance, systems lookup, asset history, and owner-facing questions.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "assets" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Assets</h2>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 18 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {assets.map((asset) => (
                  <button
                    key={asset.name}
                    onClick={() => setSelectedAsset(asset)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      ...card,
                      padding: 16,
                      border: selectedAsset.name === asset.name ? "1px solid #bef264" : card.border,
                      color: "white",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{asset.name}</div>
                    <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{asset.area}</div>
                  </button>
                ))}
              </div>

              <div style={card}>
                <div style={{ color: "#bef264", fontWeight: 900, fontSize: 13 }}>{selectedAsset.status}</div>
                <h2 style={{ fontSize: 36, marginBottom: 6 }}>{selectedAsset.name}</h2>
                <div style={{ color: "#94a3b8", marginBottom: 18 }}>{selectedAsset.area}</div>
                <p style={{ color: "#cbd5e1", lineHeight: 1.7, fontSize: 17 }}>{selectedAsset.detail}</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "locations" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Locations</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {locations.map((location, index) => (
                <div key={location} style={card}>
                  <div style={{ color: "#bef264", fontWeight: 900 }}>#{index + 1}</div>
                  <div style={{ marginTop: 8, fontWeight: 900 }}>{location}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "calendar" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Calendar / Work Schedule</h2>
            <div style={card}>
              {recurringWork.map((work, index) => (
                <div
                  key={work}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 160px",
                    gap: 12,
                    padding: "14px 0",
                    borderBottom:
                      index === recurringWork.length - 1 ? "none" : "1px solid rgba(148, 163, 184, 0.15)",
                  }}
                >
                  <strong>{work}</strong>
                  <span style={{ color: "#cbd5e1" }}>
                    {index < 2 ? "Weekly" : index < 7 ? "As scheduled" : "Monthly"}
                  </span>
                  <span style={{ color: "#bef264", fontWeight: 900 }}>Open</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "weather" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Weather</h2>
            <div style={{ ...card, padding: 34, background: "linear-gradient(135deg, rgba(15,23,42,.95), rgba(20,83,45,.7))" }}>
              <div style={{ color: "#94a3b8", letterSpacing: 4, fontWeight: 900, fontSize: 12 }}>2000 WEATHER</div>
              <div style={{ fontSize: 46, fontWeight: 900, marginTop: 14 }}>Forecast Card Ready</div>
              <p style={{ color: "#cbd5e1", maxWidth: 760, lineHeight: 1.7 }}>
                Later this can show rain, wind, freeze alerts, painting windows, dock conditions, and grounds recommendations.
              </p>
            </div>
          </section>
        )}

        {activeTab === "photos" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Photo Library</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {photoGroups.map((group) => (
                <div key={group} style={card}>
                  <div
                    style={{
                      height: 120,
                      borderRadius: 16,
                      border: "1px dashed rgba(148,163,184,.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      marginBottom: 14,
                    }}
                  >
                    Photo Group
                  </div>
                  <strong>{group}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "documents" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Documents</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
              {documents.map((doc) => (
                <div key={doc} style={card}>
                  <div style={{ color: "#bef264", fontSize: 12, fontWeight: 900, letterSpacing: 3 }}>DOCUMENT</div>
                  <h3 style={{ fontSize: 22 }}>{doc}</h3>
                  <p style={{ color: "#94a3b8" }}>Stored Atlas record. File link or upload target can be attached later.</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "systems" && (
          <section>
            <h2 style={{ fontSize: 32 }}>Systems</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              {systems.map((system) => (
                <div key={system.title} style={card}>
                  <h3 style={{ fontSize: 26, marginTop: 0 }}>{system.title}</h3>
                  <ul style={{ color: "#cbd5e1", lineHeight: 1.9 }}>
                    {system.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
