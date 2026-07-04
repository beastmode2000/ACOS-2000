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
  | "assistant"
  | "team";

type AtlasRecord = {
  id: string;
  title: string;
  section: string;
  category: string;
  status: string;
  notes: string;
};

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  section: string;
};

const STORAGE_KEY = "atlas2000-no-login-full-app-v1";

const DEFAULT_MAP_LABELS: MapLabel[] = [
  { id: "dock", name: "Dock", x: 14, y: 79, section: "Dock / Waterfront" },
  { id: "cobalt", name: "Cobalt", x: 12, y: 69, section: "Dock / Waterfront" },
  { id: "seadoo", name: "Seadoo", x: 23, y: 74, section: "Dock / Waterfront" },
  { id: "water-trampoline", name: "Water Trampoline", x: 30, y: 86, section: "Dock / Waterfront" },
  { id: "waterside-lawn-north", name: "Waterside Lawn (North)", x: 38, y: 68, section: "Grounds" },
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
  { id: "hot-tub-sundance", name: "Hot Tub (Sundance)", x: 64, y: 55, section: "Hot Tub (Sundance)" },
];

const DEFAULT_SECTIONS: AtlasRecord[] = [
  {
    id: "original-house",
    title: "Original House",
    section: "Original House",
    category: "Main Structure",
    status: "Active",
    notes:
      "Original home area and older interior systems. Use for old house rooms, kitchen, Lutron blinds, interior records, and main living areas.",
  },
  {
    id: "addition",
    title: "Addition",
    section: "Addition",
    category: "Main Structure",
    status: "Active",
    notes:
      "Newer addition, indoor pool area, and great-room connection. Includes first-floor addition records and indoor pool construction photo history.",
  },
  {
    id: "mechanical-boiler-room",
    title: "Mechanical / Boiler Room",
    section: "Mechanical / Boiler Room",
    category: "Systems",
    status: "Active",
    notes:
      "Boilers, hydronic heat, domestic hot water, HVAC zones, Viessmann boiler/cascade/DHW system, Carrier/Honeywell zones, Desert Aire pool dehumidification, and related controls.",
  },
  {
    id: "indoor-pool",
    title: "Indoor Pool",
    section: "Indoor Pool",
    category: "Pool",
    status: "Active",
    notes:
      "Indoor pool equipment, chemistry, cover, filter, UV, backwash, construction records, and equipment labels.",
  },
  {
    id: "hot-tub-sundance",
    title: "Hot Tub (Sundance)",
    section: "Hot Tub (Sundance)",
    category: "Spa",
    status: "Active",
    notes:
      "Sundance 880-series Optima spa records. Sundance Optima, ClearRay UV-C, spa controls, heater, cabinet inspections, and water checks.",
  },
  {
    id: "dock-waterfront",
    title: "Dock / Waterfront",
    section: "Dock / Waterfront",
    category: "Exterior",
    status: "Active",
    notes:
      "Dock, Cobalt, Seadoo, lift boxes, and water trampoline. Sunstream lift boxes are not all the same. The newer box is for the Cobalt lift.",
  },
  {
    id: "grounds",
    title: "Grounds",
    section: "Grounds",
    category: "Exterior",
    status: "Active",
    notes:
      "Lawns, sport court, veggie boxes, dog/trampoline area, and waterfront lawns. East Lawn is between the sport court and veggie boxes. Do not add a shoreline label.",
  },
  {
    id: "new-garage",
    title: "New Garage",
    section: "New Garage",
    category: "Structure",
    status: "Active",
    notes:
      "New garage structure and associated storage/service areas. Keep separate from Old Garage.",
  },
  {
    id: "old-garage",
    title: "Old Garage",
    section: "Old Garage",
    category: "Structure",
    status: "Active",
    notes:
      "Old garage structure and connection to ADU/courtyard areas. ADU is the small box to the left of the old garage.",
  },
  {
    id: "adu",
    title: "ADU",
    section: "ADU",
    category: "Structure",
    status: "Active",
    notes:
      "ADU left of the old garage. Use for ADU systems, access notes, maintenance, and inspections.",
  },
  {
    id: "courtyard",
    title: "Courtyard",
    section: "Courtyard",
    category: "Exterior",
    status: "Active",
    notes:
      "Courtyard between house/garage/ADU areas. Courtyard has round fire pit and chairs. Hallway/roofed connection separates courtyard from trampoline/dog area.",
  },
  {
    id: "hangar",
    title: "Hangar",
    section: "Hangar",
    category: "Remote / Aviation",
    status: "Active",
    notes:
      "Hangar and aircraft records. Standardize aircraft as Gulfstream G280 N280CC where applicable.",
  },
];

const DEFAULT_ASSETS: AtlasRecord[] = [
  {
    id: "boiler-1",
    title: "Viessmann Vitodens 200 — Boiler 1",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes:
      "White wall-mounted Viessmann boiler labeled BOILER 1 — SECONDARY HIGH LIMIT INSIDE.",
  },
  {
    id: "boiler-2",
    title: "Viessmann Vitodens 200 — Boiler 2",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes:
      "White wall-mounted Viessmann boiler labeled BOILER 2 — SECONDARY HIGH LIMIT INSIDE.",
  },
  {
    id: "boiler-nameplate-2025",
    title: "Viessmann Boiler Nameplate Record — 2025",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Good",
    notes:
      "Certified by Viessmann Werke Allendorf GmbH. MAWP water 60 PSI. Maximum water temperature 210°F. Heating surface 31.99 sq ft. Minimum relief valve capacity 255.9 lb/hr. Serial number 758960507593. Year built 2025. CRN R1497.5C.",
  },
  {
    id: "boiler-nameplate-2018",
    title: "Viessmann Boiler Nameplate Record — 2018",
    section: "Mechanical / Boiler Room",
    category: "Hydronic Heat",
    status: "Watch",
    notes:
      "Earlier visible boiler nameplate appears year built 2018. Serial appears 758960502925. Confirm from photo if needed.",
  },
  {
    id: "low-water-cutoff",
    title: "McDonnell & Miller GuardDog LWCO 751P-MT-120",
    section: "Mechanical / Boiler Room",
    category: "Boiler Safety",
    status: "Good",
    notes:
      "Manual-reset low-water cutoff with green/red LED status, test/reset behavior, and CSD-1 compliance note.",
  },
  {
    id: "dhw-tanks",
    title: "Twin Viessmann Vitocell 300-V DHW Tanks",
    section: "Mechanical / Boiler Room",
    category: "Domestic Hot Water",
    status: "Good",
    notes:
      "Twin gray Viessmann Vitocell 300-V indirect-fired domestic hot water tanks. EVIA 300, 79 USG / 300 L, stainless tank / heat exchanger.",
  },
  {
    id: "carrier-honeywell-zones",
    title: "Carrier / Honeywell HZ432 HVAC Zones",
    section: "Mechanical / Boiler Room",
    category: "HVAC",
    status: "Watch",
    notes: "Forced-air Carrier system with Honeywell HZ432 zoning controls.",
  },
  {
    id: "desert-aire",
    title: "Desert Aire Pool Dehumidification",
    section: "Indoor Pool",
    category: "Pool HVAC",
    status: "Good",
    notes: "Indoor pool dehumidification system tied to pool room environment.",
  },
  {
    id: "pool-filtration-uv-cover",
    title: "Pool Filtration / UV / Cover System",
    section: "Indoor Pool",
    category: "Pool Equipment",
    status: "Good",
    notes:
      "Pool pump, filtration, UV, cover, testing, backwash, and routine service records.",
  },
  {
    id: "sundance-optima",
    title: "Sundance 880-Series Optima Hot Tub",
    section: "Hot Tub (Sundance)",
    category: "Spa",
    status: "Watch",
    notes:
      "Sundance Optima spa. Date 03/21/15. Serial 00P3LCD-100528521-0315. 240V, 60Hz, single phase. ClearRay UV-C, Smart Heater Plus, control panel, visible corrosion/rust at some lower cabinet/nameplate hardware.",
  },
  {
    id: "sunstream-cobalt",
    title: "Sunstream Lift Box — Cobalt",
    section: "Dock / Waterfront",
    category: "Dock / Lift",
    status: "Good",
    notes:
      "Newer Sunstream lift box for Cobalt boat lift with lid-mounted solar panel and battery/control enclosure.",
  },
  {
    id: "sunstream-seadoo",
    title: "Sunstream Lift Box — Seadoo",
    section: "Dock / Waterfront",
    category: "Dock / Lift",
    status: "Good",
    notes:
      "Separate Sunstream lift box for Seadoo lift. Do not merge with Cobalt lift box.",
  },
  {
    id: "sunstream-dock",
    title: "Sunstream Lift Box — Dock",
    section: "Dock / Waterfront",
    category: "Dock / Lift",
    status: "Good",
    notes: "Additional Sunstream dock-mounted lift control/battery/solar box.",
  },
  {
    id: "cobalt-boat",
    title: "Cobalt Boat",
    section: "Dock / Waterfront",
    category: "Marine",
    status: "Watch",
    notes: "Boat asset at dock. Link lift box and maintenance/inspection records here.",
  },
  {
    id: "seadoo",
    title: "Seadoo",
    section: "Dock / Waterfront",
    category: "Marine",
    status: "Watch",
    notes:
      "Seadoo repair records and dock placement notes. One Seadoo goes south of the small dock slip.",
  },
  {
    id: "water-trampoline",
    title: "Water Trampoline",
    section: "Dock / Waterfront",
    category: "Waterfront",
    status: "Unknown",
    notes: "Water trampoline location label included on map.",
  },
  {
    id: "lutron-blinds",
    title: "Lutron Motorized Roller Shades",
    section: "Original House",
    category: "Interior Systems",
    status: "Watch",
    notes:
      "Linked to Penthouse Drapery invoice #176396 / roller shade repair. Use existing asset name Blinds Lutron.",
  },
  {
    id: "wolf-range",
    title: "Wolf Range",
    section: "Original House",
    category: "Kitchen",
    status: "Unknown",
    notes:
      "Kitchen range asset. Watch for duplicate MaintainX naming like wolfe range vs Range-Wolf.",
  },
  {
    id: "av-room",
    title: "AV Room / Main Racks",
    section: "Original House",
    category: "AV / Network",
    status: "Watch",
    notes: "Main AV rack, Sonos rack, network, and control systems.",
  },
  {
    id: "gulfstream-g280-n280cc",
    title: "Gulfstream G280 N280CC",
    section: "Hangar",
    category: "Aircraft",
    status: "Good",
    notes: "Standardized Hangar aircraft naming based on visible tail number N280CC.",
  },
  {
    id: "pilatus-pc12",
    title: "Plane Pilatus PC12 N126AL",
    section: "Hangar",
    category: "Aircraft",
    status: "Unknown",
    notes: "Hangar sub-location / aircraft record from MaintainX hierarchy.",
  },
];

const DEFAULT_VENDORS: AtlasRecord[] = [
  {
    id: "penthouse-drapery",
    title: "Penthouse Drapery",
    section: "Original House",
    category: "Interior / Shades",
    status: "Active",
    notes:
      "Vendor invoice contact on file. Invoice #176396 dated 06/16/2026. Link to Lutron motorized roller shade asset.",
  },
  {
    id: "pool-spa-service",
    title: "Pool / Spa Service",
    section: "Indoor Pool",
    category: "Pool / Spa",
    status: "Needed",
    notes:
      "Pool testing, filter cleaning, spa service, ClearRay, UV, water treatment, and equipment inspections.",
  },
  {
    id: "mechanical-service",
    title: "Climate / Mechanical Service",
    section: "Mechanical / Boiler Room",
    category: "HVAC / Boiler",
    status: "Needed",
    notes:
      "Boilers, DHW tanks, HVAC zones, pool dehumidification, heat pumps, and mechanical room service.",
  },
  {
    id: "electrical-vendor",
    title: "Electrical Vendor",
    section: "Electrical",
    category: "Electrical",
    status: "Needed",
    notes: "Panels, generator, dock power, equipment circuits, controls, and troubleshooting.",
  },
  {
    id: "grounds-landscape",
    title: "Grounds / Landscape Vendor",
    section: "Grounds",
    category: "Grounds",
    status: "Needed",
    notes:
      "Irrigation, lawns, sport court, veggie boxes, plantings, and general grounds work.",
  },
  {
    id: "marine-vendor",
    title: "Marine Vendor",
    section: "Dock / Waterfront",
    category: "Dock / Boats",
    status: "Needed",
    notes: "Cobalt, Seadoo, dock, Sunstream lift boxes, water trampoline, and marine service.",
  },
  {
    id: "seattle-boat",
    title: "Seattle Boat",
    section: "Dock / Waterfront",
    category: "Marine",
    status: "Active",
    notes: "Use for Cobalt boat service records and marine support.",
  },
];

const DEFAULT_PROCEDURES: AtlasRecord[] = [
  {
    id: "pool-backwash",
    title: "Pool Backwash / Filter Pressure Check",
    section: "Indoor Pool",
    category: "Procedure",
    status: "As needed",
    notes:
      "1. Check filter pressure and compare to normal operating pressure.\n2. Confirm valve positions before changing flow direction.\n3. Backwash only when pressure or water quality indicates it is needed.\n4. Return system to normal filter operation.\n5. Confirm flow is normal.\n6. Record pressure before and after service in Logs.",
  },
  {
    id: "hot-tub-check",
    title: "Hot Tub Water / Equipment Check",
    section: "Hot Tub (Sundance)",
    category: "Procedure",
    status: "Weekly",
    notes:
      "1. Confirm water level before running jets.\n2. Inspect cabinet area for moisture, corrosion, or visible leaks.\n3. Check control panel, heater, ClearRay UV-C, and visible equipment.\n4. Record water condition and chemical/service notes.\n5. Do not run jets dry.",
  },
  {
    id: "dock-lift-box-check",
    title: "Dock Lift Box Check",
    section: "Dock / Waterfront",
    category: "Procedure",
    status: "Weekly in season",
    notes:
      "1. Inspect each Sunstream lift box separately.\n2. Confirm Cobalt, Seadoo, and dock lift boxes are identified.\n3. Check solar panel, battery enclosure, wiring, and up/down controls.\n4. Record slow lift movement, low battery signs, corrosion, or loose wiring.",
  },
  {
    id: "grounds-reset",
    title: "Grounds Reset",
    section: "Grounds",
    category: "Procedure",
    status: "Weekly",
    notes:
      "1. Check sport court, east lawn, waterside lawn, veggie boxes, courtyard, and trampoline/dog area.\n2. Blow off hardscape and main paths.\n3. Check covered hallway/connection areas.\n4. Pick up dog waste.\n5. Record vendor follow-up items.",
  },
  {
    id: "boat-seadoo-check",
    title: "Boat / Seadoo Weekly Check",
    section: "Dock / Waterfront",
    category: "Procedure",
    status: "Weekly in season",
    notes:
      "1. Check Cobalt and Seadoo condition.\n2. Confirm lift positioning and battery/control box condition.\n3. Check safety gear and fuel/readiness.\n4. Log damage, low battery, cleaning needs, or service follow-up.",
  },
  {
    id: "boiler-room-walkthrough",
    title: "Mechanical Room Walkthrough",
    section: "Mechanical / Boiler Room",
    category: "Procedure",
    status: "Weekly / after service",
    notes:
      "1. Look for leaks, alarms, unusual noise, and status lights.\n2. Confirm boiler labels and controls are intact.\n3. Check DHW tanks and visible piping.\n4. Log any faults, reset events, or vendor follow-up.",
  },
];

const DEFAULT_TASKS: AtlasRecord[] = [
  {
    id: "task-pool-check",
    title: "Check pool/spa water and equipment",
    section: "Indoor Pool",
    category: "High",
    status: "Open",
    notes: "Pool water, filter pressure, UV, cover, and general equipment. Due: this week.",
  },
  {
    id: "task-dock-lifts",
    title: "Inspect Sunstream lift boxes",
    section: "Dock / Waterfront",
    category: "Medium",
    status: "Open",
    notes: "Check Cobalt, Seadoo, and dock lift boxes separately. Due: this week.",
  },
  {
    id: "task-boiler",
    title: "Review boiler/mechanical room notes",
    section: "Mechanical / Boiler Room",
    category: "Medium",
    status: "Open",
    notes: "Boilers, DHW tanks, zoning, dehumidification, and low-water cutoff records.",
  },
  {
    id: "task-grounds",
    title: "Grounds blow-off and reset",
    section: "Grounds",
    category: "Low",
    status: "Open",
    notes: "Lawns, courtyard, sport court, veggie boxes, dog/trampoline area. Due: Friday.",
  },
  {
    id: "task-docs",
    title: "Upload latest vendor invoices/photos",
    section: "Documents",
    category: "Medium",
    status: "Open",
    notes: "Attach photos, invoices, diagrams, and notes to the right records. Due: ongoing.",
  },
];

const DEFAULT_DOCUMENTS: AtlasRecord[] = [
  {
    id: "systems-layout",
    title: "2000 Systems Layout Draft v1",
    section: "Mechanical / Boiler Room",
    category: "PDF",
    status: "Draft",
    notes: "Draft systems layout for mechanical, electrical, pool, HVAC, and related equipment.",
  },
  {
    id: "pool-equipment-record",
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
    id: "indoor-pool-construction",
    title: "Indoor Pool Construction Photo Record",
    section: "Addition",
    category: "Photo Record",
    status: "Filed",
    notes: "First floor of addition; indoor pool construction.",
  },
  {
    id: "dock-lift-photos",
    title: "Dock / Sunstream Lift Box Photos",
    section: "Dock / Waterfront",
    category: "Photo Record",
    status: "Filed",
    notes: "Multiple Sunstream lift boxes with different uses.",
  },
  {
    id: "sundance-nameplate",
    title: "Hot Tub Sundance Optima Nameplate Records",
    section: "Hot Tub (Sundance)",
    category: "Photo Record",
    status: "Filed",
    notes: "Sundance Optima serial/rating/control-area documentation.",
  },
  {
    id: "redacted-credentials",
    title: "Redacted Credential Inventory",
    section: "Admin",
    category: "Admin Note",
    status: "Protected",
    notes:
      "Shows only categories/systems to secure. Do not store raw passwords, passcodes, PINs, emails, or access codes in Atlas records.",
  },
];

const DEFAULT_LOGS: AtlasRecord[] = [
  {
    id: "log-atlas-rename",
    title: "Atlas interface renamed",
    section: "Admin",
    category: "Branding",
    status: "Done",
    notes: "Public-facing app branding should show Atlas 2000 with no login screen for now.",
  },
  {
    id: "log-map-rules",
    title: "Map labeling rules locked",
    section: "Map",
    category: "Map Rule",
    status: "Active",
    notes:
      "Use the original approved aerial map as source of truth. Physical map image should stay locked; labels are editable overlays only.",
  },
  {
    id: "log-no-marker-18",
    title: "No marker 18",
    section: "Map",
    category: "Map Rule",
    status: "Active",
    notes:
      "There is no marker 18. There are two markers labeled 13, but the second/lower 13 does not get its own label.",
  },
  {
    id: "log-dock-boxes",
    title: "Dock lift boxes separated by use",
    section: "Dock / Waterfront",
    category: "Asset Rule",
    status: "Active",
    notes: "Cobalt, Seadoo, and dock lift boxes should be treated as separate assets.",
  },
  {
    id: "log-pool-photo",
    title: "Indoor pool construction photo record",
    section: "Addition",
    category: "Photo Record",
    status: "Filed",
    notes: "Photo belongs to Addition / First Floor construction history.",
  },
  {
    id: "log-password-policy",
    title: "Credential policy",
    section: "Admin",
    category: "Security",
    status: "Active",
    notes:
      "Do not store raw passwords, passcodes, PINs, emails, or access codes in Atlas records.",
  },
];

const DEFAULT_PHOTOS: AtlasRecord[] = [
  {
    id: "photo-pool-construction",
    title: "Indoor pool construction — first floor of addition",
    section: "Addition",
    category: "Photo",
    status: "Filed",
    notes:
      "Pool shell/trench area, concrete work, temporary lighting, hoses, and worker present.",
  },
  {
    id: "photo-sunstream-boxes",
    title: "Sunstream lift boxes",
    section: "Dock / Waterfront",
    category: "Photo",
    status: "Filed",
    notes:
      "Multiple white Sunstream lift boxes with solar panels and internal battery/control wiring.",
  },
  {
    id: "photo-sundance-optima",
    title: "Sundance Optima equipment/nameplate",
    section: "Hot Tub (Sundance)",
    category: "Photo",
    status: "Filed",
    notes:
      "Sundance Optima nameplate, spa controls, HydroQuip heater, ClearRay UV-C equipment.",
  },
];

const DEFAULT_TEAM: AtlasRecord[] = [
  {
    id: "team-nick",
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
    notes: "Future owner-facing view for simple property status, documents, and requests.",
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

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AtlasLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex items-center justify-center bg-[#061a33] shadow-lg ring-1 ring-white/10 ${
          compact ? "h-11 w-11 rounded-2xl" : "h-14 w-14 rounded-2xl"
        }`}
      >
        <div className={`relative ${compact ? "h-7 w-7" : "h-9 w-9"}`}>
          <div className="absolute inset-0 rounded-full border-2 border-[#c89b4f]" />
          <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-[#c89b4f]" />
          <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-[#c89b4f]" />
          <div className="absolute bottom-1 left-1/2 h-4 w-5 -translate-x-1/2 rounded-t-full border-l-2 border-r-2 border-t-2 border-[#c89b4f]" />
        </div>
      </div>

      <div>
        <div
          className={`font-black tracking-[0.18em] text-white ${
            compact ? "text-xl" : "text-3xl"
          }`}
        >
          ATLAS
        </div>
        <div className="text-xs font-bold tracking-[0.24em] text-[#c89b4f]">
          2000
        </div>
      </div>
    </div>
  );
}

function useAtlasState() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [search, setSearch] = useState("");
  const [labels, setLabels] = useState<MapLabel[]>(DEFAULT_MAP_LABELS);
  const [sections, setSections] = useState<AtlasRecord[]>(DEFAULT_SECTIONS);
  const [assets, setAssets] = useState<AtlasRecord[]>(DEFAULT_ASSETS);
  const [vendors, setVendors] = useState<AtlasRecord[]>(DEFAULT_VENDORS);
  const [procedures, setProcedures] = useState<AtlasRecord[]>(DEFAULT_PROCEDURES);
  const [tasks, setTasks] = useState<AtlasRecord[]>(DEFAULT_TASKS);
  const [documents, setDocuments] = useState<AtlasRecord[]>(DEFAULT_DOCUMENTS);
  const [logs, setLogs] = useState<AtlasRecord[]>(DEFAULT_LOGS);
  const [photos, setPhotos] = useState<AtlasRecord[]>(DEFAULT_PHOTOS);
  const [team, setTeam] = useState<AtlasRecord[]>(DEFAULT_TEAM);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setLabels(parsed.labels || DEFAULT_MAP_LABELS);
        setSections(parsed.sections || DEFAULT_SECTIONS);
        setAssets(parsed.assets || DEFAULT_ASSETS);
        setVendors(parsed.vendors || DEFAULT_VENDORS);
        setProcedures(parsed.procedures || DEFAULT_PROCEDURES);
        setTasks(parsed.tasks || DEFAULT_TASKS);
        setDocuments(parsed.documents || DEFAULT_DOCUMENTS);
        setLogs(parsed.logs || DEFAULT_LOGS);
        setPhotos(parsed.photos || DEFAULT_PHOTOS);
        setTeam(parsed.team || DEFAULT_TEAM);
      }
    } catch {
      // Ignore broken local storage.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          labels,
          sections,
          assets,
          vendors,
          procedures,
          tasks,
          documents,
          logs,
          photos,
          team,
        })
      );
    } catch {
      // Large image uploads can exceed local browser storage.
    }
  }, [
    ready,
    labels,
    sections,
    assets,
    vendors,
    procedures,
    tasks,
    documents,
    logs,
    photos,
    team,
  ]);

  return {
    screen,
    setScreen,
    search,
    setSearch,
    labels,
    setLabels,
    sections,
    setSections,
    assets,
    setAssets,
    vendors,
    setVendors,
    procedures,
    setProcedures,
    tasks,
    setTasks,
    documents,
    setDocuments,
    logs,
    setLogs,
    photos,
    setPhotos,
    team,
    setTeam,
  };
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const style =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : variant === "secondary"
      ? "border border-slate-200 bg-white text-[#061a33] hover:bg-slate-50"
      : "bg-[#061a33] text-white hover:bg-[#0b294e]";

  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 text-sm font-black transition ${style} ${className}`}
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 ${
        props.className || ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 ${
        props.className || ""
      }`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#061a33] focus:ring-4 focus:ring-[#061a33]/10 ${
        props.className || ""
      }`}
    />
  );
}

function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
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
    { id: "tasks", label: "Tasks", icon: "☑" },
    { id: "sections", label: "Sections", icon: "▤" },
    { id: "assets", label: "Assets", icon: "□" },
    { id: "vendors", label: "Vendors", icon: "◎" },
    { id: "procedures", label: "Procedures", icon: "≣" },
    { id: "documents", label: "Documents", icon: "▱" },
    { id: "logs", label: "Logs", icon: "≡" },
    { id: "photos", label: "Photos", icon: "◫" },
    { id: "assistant", label: "Ask Atlas", icon: "✦" },
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
          <div className="font-bold">No login mode</div>
          <div className="mt-1 text-xs text-slate-300">
            Atlas opens straight to the dashboard.
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  screen,
  setScreen,
  search,
  setSearch,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
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
    assistant: "Ask Atlas",
    team: "Team",
  };

  return (
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
          <TextInput
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
            {Object.entries(titles).map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>

          <Button type="button" onClick={() => setScreen("assistant")}>
            Ask Atlas
          </Button>
        </div>
      </div>
    </header>
  );
}

function PropertyMap({
  labels,
  selectedId,
  onSelect,
  compact = false,
}: {
  labels: MapLabel[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 shadow-inner ${
        compact ? "h-[360px]" : "h-[560px]"
      }`}
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

      {labels.map((label) => {
        const selected = selectedId === label.id;

        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onSelect?.(label.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-2 text-xs font-black shadow-lg ring-2 transition ${
              selected
                ? "bg-[#c89b4f] text-[#061a33] ring-white"
                : "bg-[#061a33] text-white ring-white/80 hover:bg-[#0b294e]"
            }`}
            style={{ left: `${label.x}%`, top: `${label.y}%` }}
          >
            {compact && label.name.length > 20 ? `${label.name.slice(0, 18)}…` : label.name}
          </button>
        );
      })}

      <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-3 text-xs font-black text-[#061a33] shadow">
        N ↑
      </div>

      <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-3 text-xs font-bold text-slate-600 shadow">
        Locked map image · editable overlay labels
      </div>
    </div>
  );
}

function filterRecords(records: AtlasRecord[], query: string) {
  if (!query.trim()) return records;
  return records.filter((record) =>
    JSON.stringify(record).toLowerCase().includes(query.toLowerCase())
  );
}

function RecordCard({
  record,
  onUpdate,
  onDelete,
}: {
  record: AtlasRecord;
  onUpdate: (updated: AtlasRecord) => void;
  onDelete: () => void;
}) {
  return (
    <Card
      title={record.title}
      action={
        <Button variant="danger" type="button" onClick={onDelete}>
          Delete
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-slate-100 px-3 py-1">{record.section}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{record.category}</span>
          <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-[#8a611b]">
            {record.status}
          </span>
        </div>

        <TextInput
          value={record.title}
          onChange={(event) => onUpdate({ ...record, title: event.target.value })}
          className="w-full"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <TextInput
            value={record.section}
            onChange={(event) => onUpdate({ ...record, section: event.target.value })}
            placeholder="Section"
          />
          <TextInput
            value={record.category}
            onChange={(event) => onUpdate({ ...record, category: event.target.value })}
            placeholder="Category"
          />
          <TextInput
            value={record.status}
            onChange={(event) => onUpdate({ ...record, status: event.target.value })}
            placeholder="Status"
          />
        </div>

        <TextArea
          value={record.notes}
          onChange={(event) => onUpdate({ ...record, notes: event.target.value })}
          className="w-full min-h-32"
        />
      </div>
    </Card>
  );
}

function RecordsScreen({
  name,
  records,
  setRecords,
  search,
}: {
  name: string;
  records: AtlasRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AtlasRecord[]>>;
  search: string;
}) {
  const [draft, setDraft] = useState<AtlasRecord>({
    id: "",
    title: "",
    section: "",
    category: "",
    status: "New",
    notes: "",
  });

  const filtered = filterRecords(records, search);

  function addRecord() {
    if (!draft.title.trim()) return;
    setRecords((current) => [...current, { ...draft, id: uid(name.toLowerCase()) }]);
    setDraft({
      id: "",
      title: "",
      section: "",
      category: "",
      status: "New",
      notes: "",
    });
  }

  return (
    <div className="space-y-6">
      <Card title={`Add ${name} Record`}>
        <div className="grid gap-3 md:grid-cols-2">
          <TextInput
            placeholder="Title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <TextInput
            placeholder="Section"
            value={draft.section}
            onChange={(event) => setDraft({ ...draft, section: event.target.value })}
          />
          <TextInput
            placeholder="Category"
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          />
          <TextInput
            placeholder="Status"
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
          />
          <TextArea
            placeholder="Notes"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            className="md:col-span-2"
          />
          <Button type="button" onClick={addRecord}>
            Add record
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onUpdate={(updated) =>
              setRecords((current) =>
                current.map((item) => (item.id === record.id ? updated : item))
              )
            }
            onDelete={() =>
              setRecords((current) => current.filter((item) => item.id !== record.id))
            }
          />
        ))}
      </div>
    </div>
  );
}

function MapScreen({
  labels,
  setLabels,
}: {
  labels: MapLabel[];
  setLabels: React.Dispatch<React.SetStateAction<MapLabel[]>>;
}) {
  const [selectedId, setSelectedId] = useState(labels[0]?.id || "");
  const selected = labels.find((label) => label.id === selectedId) || labels[0];
  const [newLabel, setNewLabel] = useState("New Label");

  function updateSelected(patch: Partial<MapLabel>) {
    if (!selected) return;
    setLabels((current) =>
      current.map((label) => (label.id === selected.id ? { ...label, ...patch } : label))
    );
  }

  function addLabel() {
    const label: MapLabel = {
      id: uid("label"),
      name: newLabel.trim() || "New Label",
      x: 50,
      y: 50,
      section: "General",
    };

    setLabels((current) => [...current, label]);
    setSelectedId(label.id);
  }

  function deleteSelected() {
    if (!selected) return;
    setLabels((current) => current.filter((label) => label.id !== selected.id));
    setSelectedId(labels[0]?.id || "");
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
              <Select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full"
              >
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </Select>

              <TextInput
                value={selected.name}
                onChange={(event) => updateSelected({ name: event.target.value })}
                className="w-full"
              />

              <TextInput
                value={selected.section}
                onChange={(event) => updateSelected({ section: event.target.value })}
                className="w-full"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-black text-slate-500">
                  X position
                  <TextInput
                    type="number"
                    min={0}
                    max={100}
                    value={selected.x}
                    onChange={(event) =>
                      updateSelected({
                        x: Math.max(0, Math.min(100, Number(event.target.value))),
                      })
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="text-xs font-black text-slate-500">
                  Y position
                  <TextInput
                    type="number"
                    min={0}
                    max={100}
                    value={selected.y}
                    onChange={(event) =>
                      updateSelected({
                        y: Math.max(0, Math.min(100, Number(event.target.value))),
                      })
                    }
                    className="mt-2 w-full"
                  />
                </label>
              </div>

              <Button variant="danger" type="button" onClick={deleteSelected}>
                Delete label
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No label selected.</p>
          )}
        </Card>

        <Card title="Add Label">
          <div className="space-y-3">
            <TextInput
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              className="w-full"
            />
            <Button type="button" onClick={addLabel}>
              Add label
            </Button>
            <p className="text-sm text-slate-500">
              This only adds an overlay pin. It does not move or regenerate the property map.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardScreen({
  setScreen,
  labels,
  sections,
  assets,
  vendors,
  procedures,
  tasks,
  documents,
  logs,
  photos,
}: {
  setScreen: (screen: Screen) => void;
  labels: MapLabel[];
  sections: AtlasRecord[];
  assets: AtlasRecord[];
  vendors: AtlasRecord[];
  procedures: AtlasRecord[];
  tasks: AtlasRecord[];
  documents: AtlasRecord[];
  logs: AtlasRecord[];
  photos: AtlasRecord[];
}) {
  const openTasks = tasks.filter((task) => task.status.toLowerCase().includes("open"));
  const watchAssets = assets.filter((asset) => asset.status !== "Good");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Open Tasks"
          value={openTasks.length}
          detail={`${openTasks.length} active items`}
        />
        <Metric
          label="Assets"
          value={assets.length}
          detail={`${watchAssets.length} watch/service/unknown`}
        />
        <Metric label="Vendors" value={vendors.length} detail="Service directory" />
        <Metric
          label="Records"
          value={
            sections.length +
            assets.length +
            vendors.length +
            procedures.length +
            tasks.length +
            documents.length +
            logs.length +
            photos.length
          }
          detail="Seeded Atlas items"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
        <Card
          title="Interactive Property Map"
          action={
            <Button variant="secondary" onClick={() => setScreen("map")}>
              Open map
            </Button>
          }
        >
          <PropertyMap labels={labels} compact />
        </Card>

        <Card
          title="Estate Sections"
          action={
            <Button variant="secondary" onClick={() => setScreen("sections")}>
              View all
            </Button>
          }
        >
          <div className="space-y-3">
            {sections.slice(0, 8).map((section) => (
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
        <Card title="Recent Activity">
          <div className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-black text-[#061a33]">{log.title}</div>
                <div className="mt-1 text-xs font-bold text-[#c89b4f]">
                  {log.section} · {log.category}
                </div>
                <p className="mt-2 text-sm text-slate-600">{log.notes}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Assets on Watch">
          <div className="space-y-3">
            {watchAssets.slice(0, 6).map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="font-black text-[#061a33]">{asset.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {asset.section} · {asset.status}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Upcoming Work">
          <div className="space-y-3">
            {openTasks.slice(0, 6).map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setScreen("tasks")}
                className="w-full rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-black text-[#061a33]">{task.title}</div>
                <div className="mt-1 text-xs font-bold text-[#c89b4f]">
                  {task.section} · {task.category}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function AssistantScreen({
  assets,
  vendors,
  procedures,
  logs,
}: {
  assets: AtlasRecord[];
  vendors: AtlasRecord[];
  procedures: AtlasRecord[];
  logs: AtlasRecord[];
}) {
  const summary = useMemo(
    () => [
      `Assets loaded: ${assets.length}`,
      `Vendors loaded: ${vendors.length}`,
      `Procedures loaded: ${procedures.length}`,
      `Logs loaded: ${logs.length}`,
      "Search works across the current screen.",
      "No login screen is active.",
      "Credential records are redacted by design.",
      "Map labels are editable overlays on a locked map concept.",
    ],
    [assets.length, vendors.length, procedures.length, logs.length]
  );

  return (
    <div className="space-y-6">
      <Card title="Ask Atlas">
        <p className="text-sm text-slate-600">
          This is the in-app assistant placeholder. For now it summarizes the local Atlas data.
          Later it can connect to the database and answer from all records.
        </p>
      </Card>

      <Card title="System Summary">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          {summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function Page() {
  const state = useAtlasState();

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#061a33]">
      <div className="flex">
        <Sidebar screen={state.screen} setScreen={state.setScreen} />

        <section className="min-h-screen flex-1">
          <div className="border-b border-[#061a33]/10 bg-[#061a33] p-4 text-white lg:hidden">
            <AtlasLogo compact />
          </div>

          <TopBar
            screen={state.screen}
            setScreen={state.setScreen}
            search={state.search}
            setSearch={state.setSearch}
          />

          <div className="p-5 lg:p-8">
            {state.screen === "dashboard" && (
              <DashboardScreen
                setScreen={state.setScreen}
                labels={state.labels}
                sections={state.sections}
                assets={state.assets}
                vendors={state.vendors}
                procedures={state.procedures}
                tasks={state.tasks}
                documents={state.documents}
                logs={state.logs}
                photos={state.photos}
              />
            )}

            {state.screen === "map" && (
              <MapScreen labels={state.labels} setLabels={state.setLabels} />
            )}

            {state.screen === "tasks" && (
              <RecordsScreen
                name="Task"
                records={state.tasks}
                setRecords={state.setTasks}
                search={state.search}
              />
            )}

            {state.screen === "sections" && (
              <RecordsScreen
                name="Section"
                records={state.sections}
                setRecords={state.setSections}
                search={state.search}
              />
            )}

            {state.screen === "assets" && (
              <RecordsScreen
                name="Asset"
                records={state.assets}
                setRecords={state.setAssets}
                search={state.search}
              />
            )}

            {state.screen === "vendors" && (
              <RecordsScreen
                name="Vendor"
                records={state.vendors}
                setRecords={state.setVendors}
                search={state.search}
              />
            )}

            {state.screen === "procedures" && (
              <RecordsScreen
                name="Procedure"
                records={state.procedures}
                setRecords={state.setProcedures}
                search={state.search}
              />
            )}

            {state.screen === "documents" && (
              <RecordsScreen
                name="Document"
                records={state.documents}
                setRecords={state.setDocuments}
                search={state.search}
              />
            )}

            {state.screen === "logs" && (
              <RecordsScreen
                name="Log"
                records={state.logs}
                setRecords={state.setLogs}
                search={state.search}
              />
            )}

            {state.screen === "photos" && (
              <RecordsScreen
                name="Photo"
                records={state.photos}
                setRecords={state.setPhotos}
                search={state.search}
              />
            )}

            {state.screen === "assistant" && (
              <AssistantScreen
                assets={state.assets}
                vendors={state.vendors}
                procedures={state.procedures}
                logs={state.logs}
              />
            )}

            {state.screen === "team" && (
              <RecordsScreen
                name="Team"
                records={state.team}
                setRecords={state.setTeam}
                search={state.search}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
