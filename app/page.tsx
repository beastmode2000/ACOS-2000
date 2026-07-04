```tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Screen =
  | "dashboard"
  | "map"
  | "tasks"
  | "sections"
  | "assets"
  | "vendors"
  | "procedures"
  | "documents"
  | "logs"
  | "photos"
  | "team"
  | "ask";

type RecordItem = {
  id: string;
  title: string;
  section: string;
  category: string;
  status: string;
  notes: string;
  date?: string;
  imageData?: string;
};

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  section: string;
};

type AtlasData = {
  labels: MapLabel[];
  sections: RecordItem[];
  assets: RecordItem[];
  vendors: RecordItem[];
  procedures: RecordItem[];
  tasks: RecordItem[];
  documents: RecordItem[];
  logs: RecordItem[];
  photos: RecordItem[];
  team: RecordItem[];
};

const STORAGE_KEY = "atlas-2000-no-login-full-app-v1";

const labelsSeed: MapLabel[] = [
  { id: "dock", name: "Dock", x: 14, y: 79, section: "Dock / Waterfront" },
  { id: "cobalt", name: "Cobalt", x: 12, y: 69, section: "Dock / Waterfront" },
  { id: "seadoo", name: "Seadoo", x: 23, y: 74, section: "Dock / Waterfront" },
  { id: "water-trampoline", name: "Water Trampoline", x: 30, y: 86, section: "Dock / Waterfront" },
  { id: "waterside-lawn", name: "Waterside Lawn (North)", x: 38, y: 68, section: "Grounds" },
  { id: "east-lawn", name: "East Lawn", x: 77, y: 47, section: "Grounds" },
  { id: "sport-court", name: "Sport Court", x: 86, y: 34, section: "Grounds" },
  { id: "veggie-boxes", name: "Veggie Boxes", x: 73, y: 29, section: "Grounds" },
  { id: "new-garage", name: "New Garage", x: 63, y: 24, section: "New Garage" },
  { id: "old-garage", name: "Old Garage", x: 51, y: 26, section: "Old Garage" },
  { id: "adu", name: "ADU", x: 43, y: 27, section: "ADU" },
  { id: "courtyard", name: "Courtyard", x: 44, y: 45, section: "Courtyard" },
  { id: "trampoline-dog", name: "Trampoline/Dog", x: 56, y: 48, section: "Grounds" },
  { id: "original-house", name: "Original House", x: 38, y: 41, section: "Original House" },
  { id: "addition", name: "Addition", x: 58, y: 40, section: "Addition" },
  { id: "hot-tub", name: "Hot Tub (Sundance)", x: 64, y: 55, section: "Hot Tub (Sundance)" },
];

const sectionsSeed: RecordItem[] = [
  {
    id: "original-house",
    title: "Original House",
    section: "Original House",
    category: "Structure",
    status: "Active",
    notes: "Original house records, kitchen systems, Lutron blinds, interior equipment, AV/network records, and main living areas.",
  },
  {
    id: "addition",
    title: "Addition",
    section: "Addition",
    category: "Structure",
    status: "Active",
    notes: "Addition records, indoor pool area, great room connection, and first-floor construction history.",
  },
  {
    id: "mechanical",
    title: "Mechanical / Boiler Room",
    section: "Mechanical / Boiler Room",
    category: "Systems",
    status: "Active",
    notes: "Viessmann boilers, Viessmann DHW tanks, Carrier/Honeywell zoning, Desert Aire pool dehumidification, pumps, controls, and system notes.",
  },
  {
    id: "indoor-pool",
    title: "Indoor Pool",
    section: "Indoor Pool",
    category: "Pool",
    status: "Active",
    notes: "Indoor pool equipment, chemistry, cover, filtration, UV, backwash procedure, and photo records.",
  },
  {
    id: "hot-tub",
    title: "Hot Tub (Sundance)",
    section: "Hot Tub (Sundance)",
    category: "Spa",
    status: "Active",
    notes: "Sundance 880-series Optima spa, ClearRay UV-C, controls, heater, cabinet inspections, water checks, and nameplate records.",
  },
  {
    id: "dock",
    title: "Dock / Waterfront",
    section: "Dock / Waterfront",
    category: "Exterior",
    status: "Active",
    notes: "Dock, Cobalt, Seadoo, water trampoline, Sunstream lift boxes, lift controls, batteries, and marine records.",
  },
  {
    id: "grounds",
    title: "Grounds",
    section: "Grounds",
    category: "Exterior",
    status: "Active",
    notes: "Waterside lawn, east lawn, sport court, veggie boxes, courtyard, trampoline/dog area, irrigation, and cleanup work.",
  },
  {
    id: "garages",
    title: "Garages / ADU / Courtyard",
    section: "Garage / ADU / Courtyard",
    category: "Structures",
    status: "Active",
    notes: "New Garage, Old Garage, ADU, covered connections, courtyard, round fire pit area, and trampoline/dog separation.",
  },
];

const assetsSeed: RecordItem[] = [
  {
    id: "boiler-1",
    title: "Viessmann Vitodens 200 — Boiler 1",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes: "White wall-mounted Viessmann boiler labeled BOILER 1 — SECONDARY HIGH LIMIT INSIDE.",
  },
  {
    id: "boiler-2",
    title: "Viessmann Vitodens 200 — Boiler 2",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes: "White wall-mounted Viessmann boiler labeled BOILER 2 — SECONDARY HIGH LIMIT INSIDE.",
  },
  {
    id: "boiler-2025",
    title: "Viessmann Boiler Nameplate — 2025",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Filed",
    notes: "Certified by Viessmann Werke Allendorf GmbH. MAWP water 60 PSI. Maximum water temperature 210°F. Heating surface 31.99 sq ft. Minimum relief valve capacity 255.9 lb/hr. Serial number 758960507593. Year built 2025. CRN R1497.5C.",
  },
  {
    id: "boiler-2018",
    title: "Viessmann Boiler Nameplate — 2018",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Confirm",
    notes: "Earlier visible boiler nameplate appears year built 2018. Serial appears 758960502925. Confirm from photo if needed.",
  },
  {
    id: "lwco",
    title: "McDonnell & Miller GuardDog LWCO 751P-MT-120",
    section: "Mechanical / Boiler Room",
    category: "Boiler Safety",
    status: "Good",
    notes: "Manual-reset low-water cutoff. Track LED status, test/reset behavior, and CSD-1 compliance note.",
  },
  {
    id: "dhw",
    title: "Twin Viessmann Vitocell 300-V DHW Tanks",
    section: "Mechanical / Boiler Room",
    category: "Domestic Hot Water",
    status: "Good",
    notes: "Twin gray Viessmann Vitocell 300-V indirect-fired domestic hot water storage tanks. EVIA 300, 79 USG / 300 L, stainless tank and heat exchanger.",
  },
  {
    id: "hvac-zones",
    title: "Carrier / Honeywell HZ432 HVAC Zones",
    section: "Mechanical / Boiler Room",
    category: "HVAC",
    status: "Watch",
    notes: "Forced-air Carrier system with Honeywell HZ432 zone controls.",
  },
  {
    id: "desert-aire",
    title: "Desert Aire Pool Dehumidification",
    section: "Indoor Pool",
    category: "Pool HVAC",
    status: "Good",
    notes: "Indoor pool dehumidification equipment tied to pool room humidity and temperature control.",
  },
  {
    id: "pool-equipment",
    title: "Pool Filtration / UV / Cover System",
    section: "Indoor Pool",
    category: "Pool Equipment",
    status: "Good",
    notes: "Pool pump, filtration, UV, cover, water testing, backwash, and routine service records.",
  },
  {
    id: "sundance",
    title: "Sundance 880-Series Optima Hot Tub",
    section: "Hot Tub (Sundance)",
    category: "Spa",
    status: "Watch",
    notes: "Sundance Optima spa. Date 03/21/15. Serial 00P3LCD-100528521-0315. 240V, 60Hz, single phase. ClearRay UV-C, HydroQuip / Therm Products heater, control area, and visible corrosion/rust at some lower cabinet/nameplate hardware.",
  },
  {
    id: "sunstream-cobalt",
    title: "Sunstream Lift Box — Cobalt",
    section: "Dock / Waterfront",
    category: "Dock Lift",
    status: "Good",
    notes: "Newer Sunstream lift box for the Cobalt boat lift with lid-mounted solar panel and battery/control enclosure.",
  },
  {
    id: "sunstream-seadoo",
    title: "Sunstream Lift Box — Seadoo",
    section: "Dock / Waterfront",
    category: "Dock Lift",
    status: "Good",
    notes: "Separate Sunstream lift box for Seadoo lift. Do not merge with the Cobalt lift box.",
  },
  {
    id: "cobalt",
    title: "Cobalt Boat",
    section: "Dock / Waterfront",
    category: "Marine",
    status: "Watch",
    notes: "Boat asset at dock. Link Cobalt lift box and maintenance/inspection records here.",
  },
  {
    id: "seadoo",
    title: "Seadoo",
    section: "Dock / Waterfront",
    category: "Marine",
    status: "Watch",
    notes: "Seadoo repair records and dock placement notes. One Seadoo goes south of the small dock slip.",
  },
  {
    id: "water-trampoline",
    title: "Water Trampoline",
    section: "Dock / Waterfront",
    category: "Waterfront",
    status: "Seasonal",
    notes: "Water trampoline location label included on map and seasonal inspection list.",
  },
  {
    id: "lutron-blinds",
    title: "Lutron Motorized Roller Shades",
    section: "Original House",
    category: "Interior Systems",
    status: "Watch",
    notes: "Linked to Penthouse Drapery invoice #176396 / motorized roller shade repair. Use existing asset name Blinds Lutron.",
  },
];

const vendorsSeed: RecordItem[] = [
  {
    id: "penthouse",
    title: "Penthouse Drapery",
    section: "Original House",
    category: "Interior / Shades",
    status: "Active",
    notes: "Penthouse Drapery. Invoice #176396 dated 06/16/2026. Link to Lutron motorized roller shade asset.",
  },
  {
    id: "pool-spa",
    title: "Pool / Spa Service",
    section: "Indoor Pool",
    category: "Pool / Spa",
    status: "Needed",
    notes: "Pool testing, filter cleaning, spa service, ClearRay, UV, water treatment, and equipment inspections.",
  },
  {
    id: "mechanical-vendor",
    title: "Mechanical / HVAC / Boiler Vendor",
    section: "Mechanical / Boiler Room",
    category: "HVAC / Boiler",
    status: "Needed",
    notes: "Boilers, DHW tanks, HVAC zones, pool dehumidification, heat pumps, and mechanical room service.",
  },
  {
    id: "marine-vendor",
    title: "Marine Vendor",
    section: "Dock / Waterfront",
    category: "Marine",
    status: "Needed",
    notes: "Cobalt, Seadoo, dock, Sunstream lift boxes, water trampoline, and marine service.",
  },
  {
    id: "grounds-vendor",
    title: "Grounds / Landscape Vendor",
    section: "Grounds",
    category: "Grounds",
    status: "Needed",
    notes: "Irrigation, lawns, sport court, veggie boxes, plantings, and general grounds work.",
  },
];

const proceduresSeed: RecordItem[] = [
  {
    id: "pool-backwash",
    title: "Pool Backwash / Filter Pressure Check",
    section: "Indoor Pool",
    category: "Procedure",
    status: "As Needed",
    notes: "1. Check filter pressure and compare to normal operating pressure.\n2. Confirm valve positions before changing flow direction.\n3. Backwash only when pressure or water quality indicates it is needed.\n4. Return system to normal filter operation.\n5. Confirm flow is normal.\n6. Record pressure before and after service in Logs.",
  },
  {
    id: "hot-tub-check",
    title: "Hot Tub Water / Equipment Check",
    section: "Hot Tub (Sundance)",
    category: "Procedure",
    status: "Weekly",
    notes: "1. Confirm water level before running jets.\n2. Inspect cabinet area for moisture, corrosion, or visible leaks.\n3. Check control panel, heater, ClearRay UV-C, and visible equipment.\n4. Record water condition and chemical/service notes.\n5. Do not run jets dry.",
  },
  {
    id: "dock-lift-check",
    title: "Dock Lift Box Check",
    section: "Dock / Waterfront",
    category: "Procedure",
    status: "Weekly in Season",
    notes: "1. Inspect each Sunstream lift box separately.\n2. Confirm Cobalt, Seadoo, and dock lift boxes are identified.\n3. Check solar panel, battery enclosure, wiring, and up/down controls.\n4. Record slow lift movement, low battery signs, corrosion, or loose wiring.",
  },
  {
    id: "grounds-reset",
    title: "Grounds Reset",
    section: "Grounds",
    category: "Procedure",
    status: "Weekly",
    notes: "1. Check sport court, east lawn, waterside lawn, veggie boxes, courtyard, and trampoline/dog area.\n2. Blow off hardscape and main paths.\n3. Check covered hallway/connection areas.\n4. Pick up dog waste.\n5. Record vendor follow-up items.",
  },
  {
    id: "mechanical-walkthrough",
    title: "Mechanical Room Walkthrough",
    section: "Mechanical / Boiler Room",
    category: "Procedure",
    status: "Weekly / After Service",
    notes: "1. Look for leaks, alarms, unusual noise, and status lights.\n2. Confirm boiler labels and controls are intact.\n3. Check DHW tanks and visible piping.\n4. Log any faults, reset events, or vendor follow-up.",
  },
];

const tasksSeed: RecordItem[] = [
  {
    id: "task-pool",
    title: "Check pool/spa water and equipment",
    section: "Indoor Pool",
    category: "High",
    status: "Open",
    date: "This week",
    notes: "Pool water, filter pressure, UV, cover, spa level, and general equipment.",
  },
  {
    id: "task-dock",
    title: "Inspect Sunstream lift boxes",
    section: "Dock / Waterfront",
    category: "Medium",
    status: "Open",
    date: "This week",
    notes: "Check Cobalt, Seadoo, and dock lift boxes separately.",
  },
  {
    id: "task-mechanical",
    title: "Review boiler/mechanical room notes",
    section: "Mechanical / Boiler Room",
    category: "Medium",
    status: "Open",
    date: "Next check",
    notes: "Boilers, DHW tanks, zoning, dehumidification, and low-water cutoff records.",
  },
  {
    id: "task-grounds",
    title: "Grounds blow-off and reset",
    section: "Grounds",
    category: "Low",
    status: "Open",
    date: "Friday",
    notes: "Lawns, courtyard, sport court, veggie boxes, dog/trampoline area.",
  },
];

const documentsSeed: RecordItem[] = [
  {
    id: "systems-layout",
    title: "2000 Systems Layout Draft v1",
    section: "Mechanical / Boiler Room",
    category: "PDF",
    status: "Draft",
    notes: "Draft systems layout for mechanical, electrical, pool, HVAC, and related equipment.",
  },
  {
    id: "pool-doc",
    title: "Pool Equipment Record",
    section: "Indoor Pool",
    category: "PDF",
    status: "Reference",
    notes: "Pool equipment reference document. No credentials included.",
  },
  {
    id: "penthouse-invoice",
    title: "Penthouse Drapery Invoice #176396",
    section: "Original House",
    category: "Invoice",
    status: "Filed",
    notes: "Dated 06/16/2026. Link to Lutron motorized roller shade asset.",
  },
  {
    id: "sundance-records",
    title: "Sundance Optima Nameplate Records",
    section: "Hot Tub (Sundance)",
    category: "Photo Record",
    status: "Filed",
    notes: "Sundance Optima serial/rating/control-area documentation.",
  },
];

const logsSeed: RecordItem[] = [
  {
    id: "log-atlas",
    title: "Atlas interface",
    section: "Admin",
    category: "Branding",
    status: "Active",
    date: "Recent",
    notes: "Public-facing app branding should show Atlas 2000 and open directly to the dashboard.",
  },
  {
    id: "log-map-rules",
    title: "Map labeling rules locked",
    section: "Map",
    category: "Map Rule",
    status: "Active",
    date: "Recent",
    notes: "Use the original approved aerial map as source of truth. Physical map image should stay locked; labels are editable overlays only.",
  },
  {
    id: "log-no-marker-18",
    title: "No marker 18",
    section: "Map",
    category: "Map Rule",
    status: "Active",
    date: "Recent",
    notes: "There is no marker 18. There are two markers labeled 13, but the second/lower 13 does not get its own label.",
  },
  {
    id: "log-credentials",
    title: "Credential policy",
    section: "Admin",
    category: "Security",
    status: "Active",
    date: "Recent",
    notes: "Do not store raw passwords, passcodes, PINs, emails, or access codes in Atlas records.",
  },
];

const photosSeed: RecordItem[] = [
  {
    id: "photo-pool",
    title: "Indoor pool construction — first floor of addition",
    section: "Addition",
    category: "Photo",
    status: "Filed",
    date: "Recent",
    notes: "Pool shell/trench area, concrete work, temporary lighting, hoses, and worker present.",
  },
  {
    id: "photo-sunstream",
    title: "Sunstream lift boxes",
    section: "Dock / Waterfront",
    category: "Photo",
    status: "Filed",
    date: "Recent",
    notes: "Multiple white Sunstream lift boxes with solar panels and internal battery/control wiring.",
  },
  {
    id: "photo-sundance",
    title: "Sundance Optima equipment/nameplate",
    section: "Hot Tub (Sundance)",
    category: "Photo",
    status: "Filed",
    date: "Recent",
    notes: "Sundance Optima nameplate, spa controls, HydroQuip heater, ClearRay UV-C equipment.",
  },
];

const teamSeed: RecordItem[] = [
  {
    id: "team-admin",
    title: "Nick",
    section: "Team",
    category: "Estate Operations",
    status: "Admin",
    notes: "Main Atlas operator. Can add, edit, and organize records.",
  },
  {
    id: "team-owners",
    title: "Owners",
    section: "Team",
    category: "Owner View",
    status: "Future",
    notes: "Future owner-facing view for property status, documents, and requests.",
  },
  {
    id: "team-vendors",
    title: "Vendors",
    section: "Team",
    category: "Outside Service Providers",
    status: "Future Limited",
    notes: "Future limited access by project, asset, or work order.",
  },
];

const seedData: AtlasData = {
  labels: labelsSeed,
  sections: sectionsSeed,
  assets: assetsSeed,
  vendors: vendorsSeed,
  procedures: proceduresSeed,
  tasks: tasksSeed,
  documents: documentsSeed,
  logs: logsSeed,
  photos: photosSeed,
  team: teamSeed,
};

const navItems: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Map" },
  { id: "tasks", label: "Tasks" },
  { id: "sections", label: "Sections" },
  { id: "assets", label: "Assets" },
  { id: "vendors", label: "Vendors" },
  { id: "procedures", label: "Procedures" },
  { id: "documents", label: "Documents" },
  { id: "logs", label: "Logs" },
  { id: "photos", label: "Photos" },
  { id: "team", label: "Team" },
  { id: "ask", label: "Ask Atlas" },
];

const titles: Record<Screen, string> = {
  dashboard: "Estate Dashboard",
  map: "Interactive Property Map",
  tasks: "Tasks",
  sections: "Estate Sections",
  assets: "Assets",
  vendors: "Vendors",
  procedures: "Procedures",
  documents: "Documents",
  logs: "Logs",
  photos: "Photos",
  team: "Team",
  ask: "Ask Atlas",
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function useAtlasData() {
  const [data, setData] = useState<AtlasData>(seedData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AtlasData>;
        setData({
          labels: parsed.labels || labelsSeed,
          sections: parsed.sections || sectionsSeed,
          assets: parsed.assets || assetsSeed,
          vendors: parsed.vendors || vendorsSeed,
          procedures: parsed.procedures || proceduresSeed,
          tasks: parsed.tasks || tasksSeed,
          documents: parsed.documents || documentsSeed,
          logs: parsed.logs || logsSeed,
          photos: parsed.photos || photosSeed,
          team: parsed.team || teamSeed,
        });
      }
    } catch {
      setData(seedData);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Local browser storage may fill if large photos are added.
    }
  }, [data, loaded]);

  return { data, setData };
}

function Button({
  children,
  className = "",
  danger = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm font-black transition ${
        danger ? "bg-red-600 text-white hover:bg-red-700" : "bg-[#061a33] text-white hover:bg-[#0b294e]"
      } ${className}`}
    >
      {children}
    </button>
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
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {title ? <h2 className="font-black text-[#061a33]">{title}</h2> : <div />}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 ${props.className || ""}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 ${props.className || ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 ${props.className || ""}`}
    />
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-4xl font-black text-[#061a33]">{value}</div>
      <div className="mt-1 text-sm font-semibold text-slate-500">{detail}</div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#061a33] shadow-lg ring-1 ring-white/10">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 rounded-full border-2 border-[#c89b4f]" />
          <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#c89b4f]" />
          <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#c89b4f]" />
          <div className="absolute bottom-1 left-1/2 h-4 w-5 -translate-x-1/2 rounded-t-full border-l-2 border-r-2 border-t-2 border-[#c89b4f]" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-black tracking-[0.18em] text-white">ATLAS</div>
        <div className="text-xs font-bold tracking-[0.24em] text-[#c89b4f]">2000</div>
      </div>
    </div>
  );
}

function PropertyMap({
  labels,
  selectedId,
  onSelect,
  compact,
}: {
  labels: MapLabel[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 shadow-inner ${compact ? "h-[360px]" : "h-[560px]"}`}
      style={{
        background:
          "radial-gradient(circle at 34% 38%, rgba(255,255,255,.95) 0 8%, transparent 9%), radial-gradient(circle at 60% 44%, rgba(255,255,255,.92) 0 7%, transparent 8%), radial-gradient(circle at 20% 80%, rgba(59,130,246,.45) 0 16%, transparent 17%), linear-gradient(135deg, #d6e7c3 0%, #a6c48a 42%, #e8dcc2 44%, #b9d79c 58%, #7fac78 100%)",
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-blue-300/70 to-transparent" />
      <div className="absolute left-[8%] top-[75%] h-3 w-40 rounded-full bg-[#6b4f33]" />
      <div className="absolute left-[25%] top-[35%] h-16 w-24 rounded-2xl border border-slate-500/20 bg-white/80 shadow" />
      <div className="absolute left-[53%] top-[35%] h-14 w-20 rounded-2xl border border-slate-500/20 bg-white/80 shadow" />
      <div className="absolute left-[54%] top-[22%] h-11 w-24 rounded-xl border border-slate-500/20 bg-white/70 shadow" />

      {labels.map((label) => (
        <button
          key={label.id}
          type="button"
          onClick={() => onSelect?.(label.id)}
          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-xs font-black shadow-lg ring-2 transition ${
            selectedId === label.id
              ? "bg-[#c89b4f] text-[#061a33] ring-white"
              : "bg-[#061a33] text-white ring-white/80 hover:bg-[#0b294e]"
          }`}
          style={{ left: `${label.x}%`, top: `${label.y}%` }}
        >
          {compact && label.name.length > 20 ? `${label.name.slice(0, 18)}…` : label.name}
        </button>
      ))}

      <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-3 text-xs font-black text-[#061a33] shadow">
        N ↑
      </div>
      <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-3 text-xs font-bold text-slate-600 shadow">
        Locked map image · editable labels
      </div>
    </div>
  );
}

function Dashboard({ data, setScreen }: { data: AtlasData; setScreen: (screen: Screen) => void }) {
  const openTasks = data.tasks.filter((task) => task.status.toLowerCase().includes("open"));
  const watchAssets = data.assets.filter((asset) => asset.status !== "Good");

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[#061a33] p-6 text-white shadow-xl">
        <div className="text-sm font-black uppercase tracking-[0.26em] text-[#c89b4f]">
          Atlas 2000
        </div>
        <h2 className="mt-2 text-4xl font-black">Estate Operations Dashboard</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Property map, systems, assets, vendors, procedures, documents, logs, photos, and team records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Open Tasks" value={openTasks.length} detail="Active work items" />
        <Metric label="Assets" value={data.assets.length} detail={`${watchAssets.length} watch/confirm/seasonal`} />
        <Metric label="Vendors" value={data.vendors.length} detail="Service directory" />
        <Metric
          label="Records"
          value={
            data.sections.length +
            data.assets.length +
            data.vendors.length +
            data.procedures.length +
            data.tasks.length +
            data.documents.length +
            data.logs.length +
            data.photos.length
          }
          detail="Atlas records loaded"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
        <Card title="Interactive Property Map" action={<Button onClick={() => setScreen("map")}>Open Map</Button>}>
          <PropertyMap labels={data.labels} compact />
        </Card>

        <Card title="Estate Sections" action={<Button onClick={() => setScreen("sections")}>View All</Button>}>
          <div className="space-y-3">
            {data.sections.slice(0, 8).map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setScreen("sections")}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-3 text-left hover:bg-slate-50"
              >
                <div>
                  <div className="font-black text-[#061a33]">{section.title}</div>
                  <div className="text-xs text-slate-500">{section.category}</div>
                </div>
                <span className="text-slate-400">›</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Upcoming Work">
          <div className="space-y-3">
            {openTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setScreen("tasks")}
                className="w-full rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-black text-[#061a33]">{task.title}</div>
                <div className="mt-1 text-xs font-bold text-[#c89b4f]">
                  {task.category} · {task.date}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Assets on Watch">
          <div className="space-y-3">
            {watchAssets.slice(0, 8).map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="font-black text-[#061a33]">{asset.title}</div>
                <div className="mt-1 text-xs text-slate-500">{asset.section} · {asset.status}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Logs">
          <div className="space-y-3">
            {data.logs.slice(0, 5).map((log) => (
              <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-black text-[#061a33]">{log.title}</div>
                <p className="mt-2 text-sm text-slate-600">{log.notes}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RecordsScreen({
  title,
  records,
  onChange,
  search,
  allowPhotoUpload = false,
}: {
  title: string;
  records: RecordItem[];
  onChange: (records: RecordItem[]) => void;
  search: string;
  allowPhotoUpload?: boolean;
}) {
  const [draft, setDraft] = useState<RecordItem>({
    id: "",
    title: "",
    section: "",
    category: "",
    status: "New",
    notes: "",
    date: "",
  });

  const filtered = records.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  );

  function addRecord() {
    if (!draft.title.trim()) return;
    onChange([...records, { ...draft, id: uid(title.toLowerCase()) }]);
    setDraft({ id: "", title: "", section: "", category: "", status: "New", notes: "", date: "" });
  }

  function updateRecord(id: string, patch: Partial<RecordItem>) {
    onChange(records.map((record) => (record.id === id ? { ...record, ...patch } : record)));
  }

  function deleteRecord(id: string) {
    onChange(records.filter((record) => record.id !== id));
  }

  function readImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, imageData: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      <Card title={`Add ${title}`}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <Input placeholder="Section" value={draft.section} onChange={(event) => setDraft({ ...draft, section: event.target.value })} />
          <Input placeholder="Category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
          <Input placeholder="Status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} />
          <Input placeholder="Date / due date" value={draft.date || ""} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          {allowPhotoUpload && (
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readImage(file);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          )}
          <TextArea
            placeholder="Notes"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            className="md:col-span-2"
          />
          <Button type="button" onClick={addRecord}>Add Record</Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((record) => (
          <Card
            key={record.id}
            title={record.title}
            action={<Button danger type="button" onClick={() => deleteRecord(record.id)}>Delete</Button>}
          >
            <div className="space-y-4">
              {record.imageData && (
                <img src={record.imageData} alt={record.title} className="max-h-[420px] w-full rounded-2xl object-cover" />
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Input value={record.title} onChange={(event) => updateRecord(record.id, { title: event.target.value })} />
                <Input value={record.section} onChange={(event) => updateRecord(record.id, { section: event.target.value })} />
                <Input value={record.category} onChange={(event) => updateRecord(record.id, { category: event.target.value })} />
                <Input value={record.status} onChange={(event) => updateRecord(record.id, { status: event.target.value })} />
                <Input value={record.date || ""} onChange={(event) => updateRecord(record.id, { date: event.target.value })} className="md:col-span-2" />
              </div>

              <TextArea value={record.notes} onChange={(event) => updateRecord(record.id, { notes: event.target.value })} className="w-full min-h-36" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MapScreen({
  labels,
  onChange,
}: {
  labels: MapLabel[];
  onChange: (labels: MapLabel[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(labels[0]?.id || "");
  const selected = labels.find((label) => label.id === selectedId) || labels[0];
  const [newLabel, setNewLabel] = useState("New Label");

  function updateSelected(patch: Partial<MapLabel>) {
    if (!selected) return;
    onChange(labels.map((label) => (label.id === selected.id ? { ...label, ...patch } : label)));
  }

  function addLabel() {
    const label: MapLabel = {
      id: uid("label"),
      name: newLabel.trim() || "New Label",
      x: 50,
      y: 50,
      section: "General",
    };
    onChange([...labels, label]);
    setSelectedId(label.id);
  }

  function deleteSelected() {
    if (!selected) return;
    const next = labels.filter((label) => label.id !== selected.id);
    onChange(next);
    setSelectedId(next[0]?.id || "");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
      <Card title="Locked Map + Editable Labels">
        <PropertyMap labels={labels} selectedId={selectedId} onSelect={setSelectedId} />
      </Card>

      <div className="space-y-6">
        <Card title="Edit Selected Label">
          {selected ? (
            <div className="space-y-4">
              <Select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full">
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>{label.name}</option>
                ))}
              </Select>

              <Input value={selected.name} onChange={(event) => updateSelected({ name: event.target.value })} className="w-full" />
              <Input value={selected.section} onChange={(event) => updateSelected({ section: event.target.value })} className="w-full" />

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-black text-slate-500">
                  X position
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={selected.x}
                    onChange={(event) => updateSelected({ x: Math.max(0, Math.min(100, Number(event.target.value))) })}
                    className="mt-2 w-full"
                  />
                </label>

                <label className="text-xs font-black text-slate-500">
                  Y position
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={selected.y}
                    onChange={(event) => updateSelected({ y: Math.max(0, Math.min(100, Number(event.target.value))) })}
                    className="mt-2 w-full"
                  />
                </label>
              </div>

              <Button danger type="button" onClick={deleteSelected}>Delete Label</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No label selected.</p>
          )}
        </Card>

        <Card title="Add Label">
          <div className="space-y-3">
            <Input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} className="w-full" />
            <Button type="button" onClick={addLabel}>Add Label</Button>
            <p className="text-sm text-slate-500">
              This only adds an overlay pin. It does not move or regenerate the property map.
            </p>
          </div>
        </Card>

        <Card title="Map Rules">
          <div className="space-y-2 text-sm text-slate-600">
            <p>Use the approved aerial map as the source of truth.</p>
            <p>No shoreline label.</p>
            <p>No marker 18.</p>
            <p>The second/lower 13 does not get its own label.</p>
            <p>Labels are editable overlays only.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AskAtlas({ data }: { data: AtlasData }) {
  const summary = useMemo(
    () => [
      `Sections loaded: ${data.sections.length}`,
      `Assets loaded: ${data.assets.length}`,
      `Vendors loaded: ${data.vendors.length}`,
      `Procedures loaded: ${data.procedures.length}`,
      `Documents loaded: ${data.documents.length}`,
      `Logs loaded: ${data.logs.length}`,
      `Photos loaded: ${data.photos.length}`,
      "Search works across the current screen.",
      "Map labels are editable overlays.",
      "Credential records stay redacted.",
    ],
    [data]
  );

  return (
    <div className="space-y-6">
      <Card title="Ask Atlas">
        <p className="text-sm text-slate-600">
          This is the in-app Atlas assistant area. For now it summarizes local Atlas records. Later it can connect to Neon and answer from the full database.
        </p>
      </Card>

      <Card title="System Summary">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          {summary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Card>
    </div>
  );
}

export default function Page() {
  const { data, setData } = useAtlasData();
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [search, setSearch] = useState("");

  function updateData<K extends keyof AtlasData>(key: K, value: AtlasData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#061a33]">
      <div className="flex">
        <aside className="hidden min-h-screen w-72 shrink-0 flex-col bg-[#061a33] text-white shadow-2xl lg:flex">
          <div className="px-7 py-8">
            <Logo />
          </div>

          <nav className="mt-2 space-y-1 px-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScreen(item.id)}
                className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  screen === item.id
                    ? "bg-white/15 text-white ring-1 ring-white/10"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 p-5">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="font-bold">Atlas 2000</div>
              <div className="mt-1 text-xs text-slate-300">
                Estate operations dashboard.
              </div>
            </div>
          </div>
        </aside>

        <section className="min-h-screen flex-1">
          <div className="border-b border-[#061a33]/10 bg-[#061a33] p-4 text-white lg:hidden">
            <Logo />
          </div>

          <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f5f7fb]/95 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#c89b4f]">
                  Atlas 2000
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#061a33]">
                  {titles[screen]}
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Atlas..."
                  className="w-full sm:w-80"
                />

                <Select
                  value={screen}
                  onChange={(event) => setScreen(event.target.value as Screen)}
                  className="lg:hidden"
                >
                  {navItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </Select>

                <Button type="button" onClick={() => setScreen("ask")}>Ask Atlas</Button>
              </div>
            </div>
          </header>

          <div className="p-5 lg:p-8">
            {screen === "dashboard" && <Dashboard data={data} setScreen={setScreen} />}

            {screen === "map" && (
              <MapScreen labels={data.labels} onChange={(labels) => updateData("labels", labels)} />
            )}

            {screen === "tasks" && (
              <RecordsScreen title="Task" records={data.tasks} onChange={(records) => updateData("tasks", records)} search={search} />
            )}

            {screen === "sections" && (
              <RecordsScreen title="Section" records={data.sections} onChange={(records) => updateData("sections", records)} search={search} />
            )}

            {screen === "assets" && (
              <RecordsScreen title="Asset" records={data.assets} onChange={(records) => updateData("assets", records)} search={search} />
            )}

            {screen === "vendors" && (
              <RecordsScreen title="Vendor" records={data.vendors} onChange={(records) => updateData("vendors", records)} search={search} />
            )}

            {screen === "procedures" && (
              <RecordsScreen title="Procedure" records={data.procedures} onChange={(records) => updateData("procedures", records)} search={search} />
            )}

            {screen === "documents" && (
              <RecordsScreen title="Document" records={data.documents} onChange={(records) => updateData("documents", records)} search={search} />
            )}

            {screen === "logs" && (
              <RecordsScreen title="Log" records={data.logs} onChange={(records) => updateData("logs", records)} search={search} />
            )}

            {screen === "photos" && (
              <RecordsScreen title="Photo" records={data.photos} onChange={(records) => updateData("photos", records)} search={search} allowPhotoUpload />
            )}

            {screen === "team" && (
              <RecordsScreen title="Team" records={data.team} onChange={(records) => updateData("team", records)} search={search} />
            )}

            {screen === "ask" && <AskAtlas data={data} />}
          </div>
        </section>
      </div>
    </main>
  );
}
```
