"use client";

import React, { useMemo, useState } from "react";

type Screen =
  | "dashboard"
  | "map"
  | "sections"
  | "assets"
  | "vendors"
  | "procedures"
  | "documents"
  | "logs"
  | "team";

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
};

type Asset = {
  name: string;
  location: string;
  category: string;
  status: string;
  notes: string;
};

type Vendor = {
  name: string;
  category: string;
  notes: string;
};

type Procedure = {
  name: string;
  section: string;
  steps: string[];
};

const mapLabels: MapLabel[] = [
  { id: "dock", name: "Dock", x: 14, y: 79 },
  { id: "cobalt", name: "Cobalt", x: 12, y: 69 },
  { id: "seadoo", name: "Seadoo", x: 23, y: 74 },
  { id: "water-trampoline", name: "Water Trampoline", x: 30, y: 86 },
  { id: "waterside-lawn", name: "Waterside Lawn (North)", x: 38, y: 68 },
  { id: "east-lawn", name: "East Lawn", x: 77, y: 47 },
  { id: "sport-court", name: "Sport Court", x: 86, y: 34 },
  { id: "veggie-boxes", name: "Veggie Boxes", x: 73, y: 29 },
  { id: "new-garage", name: "New Garage", x: 63, y: 24 },
  { id: "old-garage", name: "Old Garage", x: 51, y: 26 },
  { id: "adu", name: "ADU", x: 43, y: 27 },
  { id: "courtyard", name: "Courtyard", x: 44, y: 45 },
  { id: "trampoline-dog", name: "Trampoline/Dog", x: 56, y: 48 },
  { id: "original-house", name: "Original House", x: 38, y: 41 },
  { id: "addition", name: "Addition", x: 58, y: 40 },
  { id: "hot-tub", name: "Hot Tub (Sundance)", x: 64, y: 55 },
];

const sections = [
  "Original House",
  "Addition",
  "Mechanical / Boiler Room",
  "Indoor Pool",
  "Hot Tub (Sundance)",
  "Dock / Waterfront",
  "Grounds",
  "New Garage",
  "Old Garage",
  "ADU",
  "Courtyard",
  "Hangar",
];

const assets: Asset[] = [
  {
    name: "Viessmann Vitodens 200 — Boiler 1",
    location: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes: "Wall-mounted Viessmann boiler labeled Boiler 1. Secondary high limit inside.",
  },
  {
    name: "Viessmann Vitodens 200 — Boiler 2",
    location: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes: "Wall-mounted Viessmann boiler labeled Boiler 2. Secondary high limit inside.",
  },
  {
    name: "Twin Viessmann Vitocell 300-V DHW Tanks",
    location: "Mechanical / Boiler Room",
    category: "Domestic Hot Water",
    status: "Good",
    notes: "Twin indirect-fired domestic hot water storage tanks.",
  },
  {
    name: "Carrier / Honeywell HZ432 HVAC Zones",
    location: "Mechanical / Boiler Room",
    category: "HVAC",
    status: "Watch",
    notes: "Forced-air Carrier system with Honeywell zoning controls.",
  },
  {
    name: "Desert Aire Pool Dehumidification",
    location: "Indoor Pool",
    category: "Pool HVAC",
    status: "Good",
    notes: "Indoor pool dehumidification system.",
  },
  {
    name: "Pool Filtration / UV / Cover System",
    location: "Indoor Pool",
    category: "Pool Equipment",
    status: "Good",
    notes: "Pool pump, filtration, UV, cover, testing, and backwash records.",
  },
  {
    name: "Sundance Optima Hot Tub",
    location: "Hot Tub (Sundance)",
    category: "Spa",
    status: "Watch",
    notes: "Sundance 880-series Optima spa with ClearRay UV-C and smart heater equipment.",
  },
  {
    name: "Sunstream Lift Box — Cobalt",
    location: "Dock / Waterfront",
    category: "Dock / Lift",
    status: "Good",
    notes: "Newer Sunstream lift box for the Cobalt lift.",
  },
  {
    name: "Sunstream Lift Box — Seadoo",
    location: "Dock / Waterfront",
    category: "Dock / Lift",
    status: "Good",
    notes: "Sunstream lift box serving the Seadoo lift.",
  },
  {
    name: "Lutron Motorized Roller Shades",
    location: "Original House",
    category: "Interior Systems",
    status: "Watch",
    notes: "Motorized roller shade asset linked to Penthouse Drapery invoice/service record.",
  },
  {
    name: "Wolf Range",
    location: "Original House",
    category: "Kitchen",
    status: "Unknown",
    notes: "Kitchen range asset. Check duplicate naming before adding more records.",
  },
  {
    name: "Gulfstream G280 N280CC",
    location: "Hangar",
    category: "Aircraft",
    status: "Good",
    notes: "Standardized hangar aircraft name using visible tail number N280CC.",
  },
];

const vendors: Vendor[] = [
  {
    name: "Penthouse Drapery",
    category: "Interior / Shades",
    notes: "Motorized roller shade service. Link records to Lutron blinds asset.",
  },
  {
    name: "Pool / Spa Service",
    category: "Pool / Spa",
    notes: "Pool testing, filter cleaning, spa service, ClearRay, and water treatment.",
  },
  {
    name: "Climate / Mechanical Service",
    category: "HVAC / Boiler",
    notes: "Boilers, HVAC zones, pool dehumidification, heat pumps, and mechanical service.",
  },
  {
    name: "Electrical Vendor",
    category: "Electrical",
    notes: "Panels, generator, dock power, equipment circuits, and controls.",
  },
  {
    name: "Grounds / Landscape Vendor",
    category: "Grounds",
    notes: "Irrigation, lawns, plantings, sport court, veggie boxes, and grounds work.",
  },
  {
    name: "Marine Vendor",
    category: "Dock / Boats",
    notes: "Cobalt, Seadoo, dock, lift boxes, water trampoline, and marine service.",
  },
];

const procedures: Procedure[] = [
  {
    name: "Pool Backwash / Filter Pressure Check",
    section: "Indoor Pool",
    steps: [
      "Check filter pressure and compare to normal operating range.",
      "Confirm valves before changing flow direction.",
      "Backwash only when pressure or water quality indicates it is needed.",
      "Return system to normal filter operation.",
      "Record pressure before and after service in Logs.",
    ],
  },
  {
    name: "Hot Tub Water / Equipment Check",
    section: "Hot Tub (Sundance)",
    steps: [
      "Confirm water level before running jets.",
      "Inspect cabinet area for moisture, corrosion, or visible leaks.",
      "Check heater, control panel, and ClearRay equipment.",
      "Record water condition and any service concerns.",
    ],
  },
  {
    name: "Dock Lift Box Check",
    section: "Dock / Waterfront",
    steps: [
      "Inspect each Sunstream box separately.",
      "Confirm Cobalt, Seadoo, and dock lift boxes are identified.",
      "Check solar panel, battery enclosure, wiring, and up/down controls.",
      "Record slow lift movement, low battery signs, or corrosion.",
    ],
  },
  {
    name: "Grounds Reset",
    section: "Grounds",
    steps: [
      "Check sport court, east lawn, waterside lawn, veggie boxes, and trampoline/dog area.",
      "Blow off hardscape and main paths.",
      "Check courtyard and covered connection areas.",
      "Record vendor follow-up items.",
    ],
  },
];

function AtlasLogo() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#061a33] shadow-lg">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-full border-2 border-[#c89b4f]" />
          <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#c89b4f]" />
          <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#c89b4f]" />
          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l-2 border-t-2 border-[#c89b4f]" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-black tracking-[0.18em] text-white">ATLAS</div>
        <div className="text-sm font-bold tracking-[0.22em] text-[#c89b4f]">2000</div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-[#061a33]">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[#061a33] shadow-lg">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-2 border-[#c89b4f]" />
                  <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#c89b4f]" />
                  <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#c89b4f]" />
                  <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l-2 border-t-2 border-[#c89b4f]" />
                </div>
              </div>
            </div>

            <h1 className="text-5xl font-black tracking-[0.2em] text-[#061a33]">ATLAS</h1>
            <p className="mt-1 text-sm font-bold tracking-[0.28em] text-[#c89b4f]">2000</p>
            <p className="mt-5 text-base text-slate-500">
              Sign in to the estate operations center
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <label className="block">
              <span className="text-sm font-bold text-[#061a33]">Email</span>
              <input
                type="email"
                placeholder="name@example.com"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#061a33] outline-none transition focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-[#061a33]">Password</span>
              <input
                type="password"
                placeholder="Password"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#061a33] outline-none transition focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10"
                onKeyDown={(event) => {
                  if (event.key === "Enter") onLogin();
                }}
              />
            </label>

            <button
              type="button"
              onClick={onLogin}
              className="mt-7 w-full rounded-xl bg-[#061a33] px-5 py-3 font-bold text-white shadow-md transition hover:bg-[#0b294e]"
            >
              Sign in
            </button>

            <p className="mt-5 text-center text-xs text-slate-400">
              Atlas 2000 keeps property records, tasks, documents, assets, vendors, and procedures in one place.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Sidebar({
  screen,
  setScreen,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const nav: { id: Screen; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "map", label: "Map", icon: "⌖" },
    { id: "sections", label: "Sections", icon: "▤" },
    { id: "assets", label: "Assets", icon: "□" },
    { id: "vendors", label: "Vendors", icon: "◎" },
    { id: "procedures", label: "Procedures", icon: "☑" },
    { id: "documents", label: "Documents", icon: "▱" },
    { id: "logs", label: "Logs", icon: "≡" },
    { id: "team", label: "Team", icon: "◉" },
  ];

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 flex-col bg-[#061a33] text-white shadow-2xl lg:flex">
      <div className="px-7 py-8">
        <AtlasLogo />
      </div>

      <nav className="mt-2 space-y-1 px-4">
        {nav.map((item) => {
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                active
                  ? "bg-white/15 text-white ring-1 ring-white/10"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  active ? "bg-[#c89b4f] text-[#061a33]" : "bg-white/10"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-5">
        <div className="rounded-2xl bg-white/10 p-4">
          <div className="font-bold">Atlas 2000</div>
          <div className="mt-1 text-xs text-slate-300">Estate operations center</div>
        </div>
      </div>
    </aside>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-[#061a33]">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function PropertyMap({ labels }: { labels: MapLabel[] }) {
  return (
    <div
      className="relative h-[420px] overflow-hidden rounded-3xl border border-slate-200 shadow-inner"
      style={{
        background:
          "radial-gradient(circle at 34% 38%, rgba(255,255,255,.95) 0 8%, transparent 9%), radial-gradient(circle at 60% 44%, rgba(255,255,255,.92) 0 7%, transparent 8%), radial-gradient(circle at 20% 80%, rgba(59,130,246,.45) 0 16%, transparent 17%), linear-gradient(135deg, #d6e7c3 0%, #a6c48a 42%, #e8dcc2 44%, #b9d79c 58%, #7fac78 100%)",
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-blue-300/70 to-transparent" />
      <div className="absolute left-[6%] top-[70%] h-3 w-[35%] -rotate-12 rounded-full bg-[#8b7355]/30" />
      <div className="absolute left-[38%] top-[37%] h-4 w-[35%] rotate-12 rounded-full bg-[#8b7355]/30" />

      <div className="absolute left-[25%] top-[35%] h-16 w-24 rounded-2xl border border-slate-500/20 bg-white/80 shadow" />
      <div className="absolute left-[53%] top-[35%] h-14 w-20 rounded-2xl border border-slate-500/20 bg-white/80 shadow" />
      <div className="absolute left-[54%] top-[22%] h-11 w-24 rounded-xl border border-slate-500/20 bg-white/70 shadow" />
      <div className="absolute left-[8%] top-[75%] h-3 w-40 rounded-full bg-[#6b4f33]" />
      <div className="absolute left-[14%] top-[73%] h-10 w-16 rounded-xl bg-white/70 shadow" />

      {labels.map((label) => (
        <div
          key={label.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#061a33] px-3 py-2 text-xs font-black text-white shadow-lg ring-2 ring-white/80"
          style={{ left: `${label.x}%`, top: `${label.y}%` }}
        >
          {label.name}
        </div>
      ))}

      <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-3 text-xs font-black text-[#061a33] shadow">
        N ↑
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-4xl font-black text-[#061a33]">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-500">{detail}</div>
    </div>
  );
}

function Dashboard({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const watchAssets = assets.filter((asset) => asset.status !== "Good").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Assets" value={assets.length} detail={`${watchAssets} need watch`} />
        <Metric label="Vendors" value={vendors.length} detail="Service contacts" />
        <Metric label="Sections" value={sections.length} detail="Estate areas" />
        <Metric label="Procedures" value={procedures.length} detail="Operating routines" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_.8fr]">
        <Card
          title="Interactive Property Map"
          action={
            <button
              type="button"
              onClick={() => setScreen("map")}
              className="text-sm font-black text-[#061a33] hover:underline"
            >
              Open map
            </button>
          }
        >
          <PropertyMap labels={mapLabels} />
        </Card>

        <Card title="Estate Sections">
          <div className="space-y-3">
            {sections.slice(0, 8).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setScreen("sections")}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-3 text-left hover:bg-slate-50"
              >
                <span className="font-black text-[#061a33]">{section}</span>
                <span className="text-slate-400">›</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Recent Activity">
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              <b className="text-[#061a33]">Atlas rename:</b> app branding changed from ACOS to Atlas.
            </p>
            <p>
              <b className="text-[#061a33]">Dock:</b> Sunstream lift boxes separated for Cobalt, Seadoo, and dock lift records.
            </p>
            <p>
              <b className="text-[#061a33]">Pool:</b> indoor pool construction and equipment records added.
            </p>
            <p>
              <b className="text-[#061a33]">Mechanical:</b> Viessmann boiler and DHW tank notes added.
            </p>
          </div>
        </Card>

        <Card title="Assets on Watch">
          <div className="space-y-3">
            {assets
              .filter((asset) => asset.status !== "Good")
              .map((asset) => (
                <div key={asset.name} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-black text-[#061a33]">{asset.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{asset.location}</div>
                </div>
              ))}
          </div>
        </Card>

        <Card title="Upcoming Maintenance">
          <div className="space-y-3">
            {procedures.map((procedure) => (
              <div key={procedure.name} className="rounded-2xl border border-slate-100 p-4">
                <div className="font-black text-[#061a33]">{procedure.name}</div>
                <div className="mt-1 text-xs font-bold text-[#c89b4f]">{procedure.section}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AssetsScreen() {
  return (
    <div className="grid gap-4">
      {assets.map((asset) => (
        <Card key={asset.name}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-black text-[#061a33]">{asset.name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {asset.location} · {asset.category}
              </p>
              <p className="mt-3 text-sm text-slate-600">{asset.notes}</p>
            </div>
            <span className="w-fit rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-black text-[#8a611b]">
              {asset.status}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function VendorsScreen() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {vendors.map((vendor) => (
        <Card key={vendor.name}>
          <h3 className="text-lg font-black text-[#061a33]">{vendor.name}</h3>
          <p className="mt-1 text-sm font-bold text-[#c89b4f]">{vendor.category}</p>
          <p className="mt-3 text-sm text-slate-600">{vendor.notes}</p>
        </Card>
      ))}
    </div>
  );
}

function ProceduresScreen() {
  return (
    <div className="grid gap-4">
      {procedures.map((procedure) => (
        <Card key={procedure.name} title={procedure.name}>
          <p className="mb-4 text-sm font-bold text-[#c89b4f]">{procedure.section}</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
            {procedure.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}

function SimpleListScreen({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <Card title={title}>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 p-4 font-bold text-[#061a33]">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function LogsScreen() {
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-black text-[#061a33]">Atlas interface update</h3>
        <p className="mt-2 text-sm text-slate-600">
          Replaced old ACOS branding with Atlas 2000 branding and rebuilt the app interface.
        </p>
      </Card>
      <Card>
        <h3 className="font-black text-[#061a33]">Property map labels</h3>
        <p className="mt-2 text-sm text-slate-600">
          Map includes Dock, Cobalt, Seadoo, Water Trampoline, Waterside Lawn North, East Lawn, Sport Court,
          Veggie Boxes, New Garage, Old Garage, ADU, Courtyard, Trampoline/Dog, Original House, Addition,
          and Hot Tub Sundance.
        </p>
      </Card>
      <Card>
        <h3 className="font-black text-[#061a33]">Systems records</h3>
        <p className="mt-2 text-sm text-slate-600">
          Mechanical, boiler, pool, spa, dock, lift box, shade, hangar, and grounds records are represented in the current draft.
        </p>
      </Card>
    </div>
  );
}

export default function Page() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [search, setSearch] = useState("");

  const title = useMemo(() => {
    const labels: Record<Screen, string> = {
      dashboard: "Estate Dashboard",
      map: "Interactive Property Map",
      sections: "Estate Sections",
      assets: "Assets",
      vendors: "Vendors",
      procedures: "Procedures",
      documents: "Documents",
      logs: "Logs",
      team: "Team",
    };
    return labels[screen];
  }, [screen]);

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#061a33]">
      <div className="flex">
        <Sidebar screen={screen} setScreen={setScreen} />

        <section className="min-h-screen flex-1">
          <div className="border-b border-slate-200 bg-[#f5f7fb]/95 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#c89b4f]">
                  Atlas 2000
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#061a33]">
                  {title}
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Atlas..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#061a33] shadow-sm outline-none transition focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 sm:w-80"
                />
                <select
                  value={screen}
                  onChange={(event) => setScreen(event.target.value as Screen)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061a33] lg:hidden"
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="map">Map</option>
                  <option value="sections">Sections</option>
                  <option value="assets">Assets</option>
                  <option value="vendors">Vendors</option>
                  <option value="procedures">Procedures</option>
                  <option value="documents">Documents</option>
                  <option value="logs">Logs</option>
                  <option value="team">Team</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 lg:p-8">
            {screen === "dashboard" && <Dashboard setScreen={setScreen} />}
            {screen === "map" && (
              <Card title="Atlas Property Map">
                <PropertyMap labels={mapLabels} />
              </Card>
            )}
            {screen === "sections" && <SimpleListScreen title="Estate Sections" items={sections} />}
            {screen === "assets" && <AssetsScreen />}
            {screen === "vendors" && <VendorsScreen />}
            {screen === "procedures" && <ProceduresScreen />}
            {screen === "documents" && (
              <SimpleListScreen
                title="Documents"
                items={[
                  "2000 Systems Layout Draft v1",
                  "Pool Equipment Record",
                  "Penthouse Drapery Invoice / Lutron Shade Repair",
                  "Indoor Pool Construction Photo Record",
                  "Dock / Sunstream Lift Box Photos",
                  "Hot Tub Sundance Optima Nameplate Records",
                ]}
              />
            )}
            {screen === "logs" && <LogsScreen />}
            {screen === "team" && (
              <SimpleListScreen
                title="Team"
                items={[
                  "Nick — Estate Operations Admin",
                  "Owners — Owner View",
                  "Vendors — Limited Project Access",
                  "Future Team Members — Add Later",
                ]}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
