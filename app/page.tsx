"use client"

import { useState } from "react"

type Tab =
  | "overview"
  | "locations"
  | "assets"
  | "calendar"
  | "weather"
  | "photos"
  | "documents"
  | "systems"

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
    status: "Priority system",
    details:
      "Two wall-mounted Viessmann Vitodens 200 boilers labeled Boiler 1 and Boiler 2. Notes include MAWP 60 PSI, max water temp 210°F, CRN R1497.5C, GuardDog low-water cutoff, and cascade/hydronic service records.",
  },
  {
    name: "Viessmann Vitocell 300-V DHW Tanks",
    area: "Mechanical Room",
    status: "Documented",
    details:
      "Twin gray Viessmann Vitocell 300-V indirect-fired domestic hot water tanks, model EVIA 300, 79 USG / 300 L stainless tank records.",
  },
  {
    name: "Carrier + Honeywell HZ432 HVAC Zones",
    area: "Mechanical / HVAC",
    status: "Active",
    details:
      "Forced-air Carrier equipment with Honeywell HZ432 zoning notes and room comfort records.",
  },
  {
    name: "Desert Aire Pool Dehumidification",
    area: "Indoor Pool",
    status: "Active",
    details:
      "Indoor pool dehumidification system connected to pool addition records.",
  },
  {
    name: "Pentair / Triton Pool Filtration",
    area: "Pool Equipment",
    status: "Active",
    details:
      "Pool treatment, filtration, backwash, and water-system notes grouped for procedure building.",
  },
  {
    name: "Sundance Optima Spa",
    area: "Spa / Hot Tub",
    status: "Documented",
    details:
      "Sundance 880-series OPTIMA spa. Nameplate date 03/21/15. Serial 00P3LCD-100528521-0315. 240V equipment with ClearRay UV-C and HydroQuip / Therm Products heater notes.",
  },
  {
    name: "Sunstream Lift Boxes",
    area: "Dock",
    status: "Needs photo grouping",
    details:
      "Multiple Sunstream dock lift control/battery/solar boxes. Newer Sunstream lift box is for the Cobalt boat lift. Not all boxes are the same.",
  },
  {
    name: "Cobalt Boat",
    area: "Dock",
    status: "Active",
    details:
      "Boat service, winterization, de-winterization, repair, and lift records should live here.",
  },
  {
    name: "Sea-Doo / Personal Watercraft",
    area: "Dock",
    status: "Active",
    details:
      "Sea-Doo fuel checks, repair records, crash-repair invoice, and dock placement notes.",
  },
  {
    name: "Lutron Motorized Blinds",
    area: "Interior",
    status: "Vendor linked",
    details:
      "Linked to Penthouse Drapery motorized roller shade repair invoice #176396.",
  },
  {
    name: "Wolf Range",
    area: "Kitchen",
    status: "Duplicate check",
    details:
      "MaintainX showed possible duplicate naming: wolfe range / Range-Wolf. Needs standardization.",
  },
  {
    name: "Hangar Aircraft Records",
    area: "Hangar",
    status: "Reference",
    details:
      "Hangar locations include Gulfstream G600 N23PA, Gulfstream G280 N280CC, Gulfstream G280 N755PA, and Pilatus PC12 N126AL.",
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
  {
    title: "2000 Systems Layout Draft v1",
    type: "PDF",
    detail:
      "Draft systems layout covering mechanical, electrical, pool, HVAC, hydronic boiler, DHW, pool treatment, dehumidification, and forced-air zones.",
  },
  {
    title: "Penthouse Drapery Invoice #176396",
    type: "Invoice",
    detail:
      "Motorized roller shade service linked to Lutron blinds asset. Vendor: Penthouse Drapery, Seattle.",
  },
  {
    title: "Sundance Optima Spa Nameplate",
    type: "Equipment record",
    detail:
      "Spa/hot tub nameplate, electrical rating, UV-C, heater, and corrosion notes.",
  },
  {
    title: "Viessmann Boiler Nameplates",
    type: "Equipment record",
    detail:
      "Boiler 1 / Boiler 2 nameplate records including 2018 and 2025 serial/year observations.",
  },
  {
    title: "Sunstream Lift Box Photo Set",
    type: "Photo record",
    detail:
      "Dock lift control boxes, solar panels, batteries, wiring, and Cobalt lift box note.",
  },
  {
    title: "Indoor Pool Construction Photo",
    type: "Construction photo",
    detail:
      "First floor addition indoor pool construction photo with concrete shell, work lighting, hoses, and worker.",
  },
]

const photoGroups = [
  "Indoor pool construction — first floor of addition",
  "Mechanical room boilers and DHW tanks",
  "Pool equipment and filtration",
  "Spa / hot tub cabinet and nameplate",
  "Dock and Sunstream lift boxes",
  "Cobalt boat and Sea-Doo records",
  "Property map / aerial layout edits",
  "Basement walk-through mapping",
  "Vendor invoices and MaintainX screenshots",
]

const calendarItems = [
  { task: "Daily Dog Cleanup", cadence: "Daily", area: "Grounds" },
  { task: "Daily Sea-Doo Fuel Check / Fill", cadence: "Daily", area: "Dock" },
  { task: "Fill All Gas Cans", cadence: "Weekly", area: "Fuel / Supplies" },
  { task: "Clean Basement Bathroom", cadence: "Weekly", area: "Basement" },
  { task: "Large Property Blow-Off", cadence: "Weekly", area: "Grounds" },
  { task: "Guardian Statues Condition Check", cadence: "Monthly", area: "Exterior Assets" },
  { task: "Cobalt Boat Winterization", cadence: "Annual", area: "Dock" },
  { task: "Cobalt Boat De-Winterization", cadence: "Annual", area: "Dock" },
]

const systems = [
  {
    title: "Mechanical Core",
    items: [
      "Viessmann Vitodens 200 boiler pair",
      "Viessmann Vitocell 300-V DHW tanks",
      "Hydronic boiler/cascade records",
      "Low-water cutoff and safety controls",
    ],
  },
  {
    title: "Pool / Spa",
    items: [
      "Indoor pool construction records",
      "Desert Aire pool dehumidification",
      "Pentair / Triton pool treatment",
      "Sundance Optima spa equipment",
    ],
  },
  {
    title: "HVAC / Comfort",
    items: [
      "Carrier forced-air equipment",
      "Honeywell HZ432 zoning",
      "Room comfort notes",
      "Elliot room mini-split decision notes",
    ],
  },
  {
    title: "Dock / Waterfront",
    items: [
      "Sunstream lift boxes",
      "Cobalt lift notes",
      "Sea-Doo dock location",
      "Water trampoline and dock layout notes",
    ],
  },
]

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-300">{label}</div>
      <div className="mt-2 text-xs text-slate-500">{sub}</div>
    </div>
  )
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  )
}

export default function AtlasDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [selectedAsset, setSelectedAsset] = useState(assets[0])

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "locations", label: "Locations" },
    { id: "assets", label: "Assets" },
    { id: "calendar", label: "Calendar" },
    { id: "weather", label: "Weather" },
    { id: "photos", label: "Photos" },
    { id: "documents", label: "Documents" },
    { id: "systems", label: "Systems" },
  ]

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0d2d35] to-[#123b2d] p-7 shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400 text-xl font-black text-slate-950 shadow-lg">
                  A
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.35em] text-lime-300">
                    Atlas / 2000
                  </div>
                  <div className="text-sm text-slate-300">Estate Operations Command System</div>
                </div>
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                2000 Estate Operations
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Central operating manual for locations, systems, assets, vendors, procedures,
                recurring work, photos, documents, and field notes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Today</div>
              <div className="mt-2 text-2xl font-black">Ops Ready</div>
              <div className="mt-2 text-sm text-slate-300">
                Domain: <span className="font-semibold text-lime-300">www.atlas2000.com</span>
              </div>
            </div>
          </div>
        </header>

        <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-lime-400 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <section>
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard label="Locations" value="42" sub="Rooms, exterior zones, dock, hangar" />
              <StatCard label="Assets" value="12+" sub="Core equipment seeded so far" />
              <StatCard label="Vendors" value="14" sub="Invoices and service providers" />
              <StatCard label="Procedures" value="26" sub="Recurring and seasonal work" />
              <StatCard label="Photo Groups" value="9" sub="Ready for upload/storage links" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-2">
                <SectionTitle
                  title="Recurring Work"
                  subtitle="The first operating checklist layer for the estate."
                />
                <div className="grid gap-3">
                  {recurringWork.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                    >
                      <span className="font-semibold text-slate-100">{item}</span>
                      <span className="rounded-full bg-lime-400/15 px-3 py-1 text-xs font-bold text-lime-300">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
                <SectionTitle title="Priority Notes" />
                <div className="space-y-4 text-sm text-slate-300">
                  <p>
                    Login work is paused. Current priority is building the clean Atlas interface and
                    organizing the estate manual.
                  </p>
                  <p>
                    Photos and documents need real storage links later. This interface already has
                    the sections ready.
                  </p>
                  <p>
                    Use Atlas as the daily front door for maintenance, systems lookup, asset
                    history, and owner-facing questions.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "locations" && (
          <section>
            <SectionTitle
              title="Locations"
              subtitle="Estate zones, rooms, exterior areas, dock, hangar, and construction areas."
            />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {locations.map((location, index) => (
                <div
                  key={location}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
                >
                  <div className="text-xs font-black text-lime-300">#{index + 1}</div>
                  <div className="mt-1 font-bold text-white">{location}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "assets" && (
          <section>
            <SectionTitle
              title="Assets"
              subtitle="Core systems and equipment records seeded from Atlas notes."
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-1">
                {assets.map((asset) => (
                  <button
                    key={asset.name}
                    onClick={() => setSelectedAsset(asset)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedAsset.name === asset.name
                        ? "border-lime-400 bg-lime-400/10"
                        : "border-slate-800 bg-slate-900/80 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-black text-white">{asset.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{asset.area}</div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-2">
                <div className="mb-4 rounded-full bg-lime-400/15 px-3 py-1 text-xs font-black text-lime-300 inline-block">
                  {selectedAsset.status}
                </div>
                <h2 className="text-3xl font-black">{selectedAsset.name}</h2>
                <div className="mt-2 text-sm text-slate-400">{selectedAsset.area}</div>
                <p className="mt-5 leading-7 text-slate-300">{selectedAsset.details}</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "calendar" && (
          <section>
            <SectionTitle
              title="Calendar / Work Schedule"
              subtitle="Recurring operating rhythm. Calendar sync can be added later."
            />
            <div className="grid gap-3">
              {calendarItems.map((item) => (
                <div
                  key={item.task}
                  className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-3"
                >
                  <div className="font-black">{item.task}</div>
                  <div className="text-slate-300">{item.area}</div>
                  <div className="text-lime-300 font-bold">{item.cadence}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "weather" && (
          <section>
            <SectionTitle
              title="Weather"
              subtitle="Weather card placeholder for grounds, dock, painting, pool, and seasonal planning."
            />
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-8">
              <div className="text-sm uppercase tracking-[0.3em] text-slate-400">2000 Weather</div>
              <div className="mt-4 text-5xl font-black">Connect Forecast</div>
              <p className="mt-4 max-w-2xl text-slate-300">
                Later this section can show current weather, wind, rain, freeze alerts, dock
                conditions, irrigation notes, and work recommendations.
              </p>
            </div>
          </section>
        )}

        {activeTab === "photos" && (
          <section>
            <SectionTitle
              title="Photo Library"
              subtitle="Photo groups based on uploaded Atlas records. Actual image storage links come next."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {photoGroups.map((group) => (
                <div
                  key={group}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
                >
                  <div className="mb-4 h-28 rounded-xl border border-dashed border-slate-700 bg-slate-950/80 flex items-center justify-center text-slate-500">
                    Photo group
                  </div>
                  <div className="font-black text-white">{group}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "documents" && (
          <section>
            <SectionTitle
              title="Documents"
              subtitle="Manuals, PDFs, invoices, nameplates, construction records, and service notes."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((doc) => (
                <div
                  key={doc.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
                >
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-lime-300">
                    {doc.type}
                  </div>
                  <h3 className="mt-2 text-xl font-black">{doc.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{doc.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "systems" && (
          <section>
            <SectionTitle
              title="Systems"
              subtitle="Mechanical, pool, HVAC, dock, and estate infrastructure overview."
            />
            <div className="grid gap-5 md:grid-cols-2">
              {systems.map((system) => (
                <div
                  key={system.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
                >
                  <h3 className="text-2xl font-black">{system.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {system.items.map((item) => (
                      <li key={item} className="flex gap-3 text-slate-300">
                        <span className="mt-1 h-2 w-2 rounded-full bg-lime-400" />
                        <span>{item}</span>
                      </li>
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
