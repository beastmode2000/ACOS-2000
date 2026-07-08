"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Screen =
  | "dashboard"
  | "map"
  | "locations"
  | "assets"
  | "history"
  | "vendors"
  | "calendar"
  | "weather"
  | "documents"
  | "procedures"
  | "parts"
  | "assistant";

type Status = "Online" | "Offline" | "Seasonal" | "Monitor";
type ServiceStatus = "Open" | "Scheduled" | "Completed" | "Monitor";
type WorkOrderPriority = "Low" | "Medium" | "High";
type Priority = "High" | "Normal" | "Seasonal";
type PartStatus = "In Stock" | "Low" | "Out" | "Order";

type UploadedFileRecord = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  createdAt: string;
};

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  zone: string;
  notes: string;
};

type MapLabelRecord = {
  id: string;
  label: string;
  category: string;
  x: number;
  y: number;
  notes: string;
  photos: UploadedFileRecord[];
};

type VendorRecord = {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  website?: string;
  notes: string;
};

type AssetRecord = {
  id: string;
  name: string;
  locationId: string;
  category: string;
  status: Status;
  make?: string;
  model?: string;
  serial?: string;
  notes: string;
  vendorIds: string[];
};

type ServiceRecord = {
  id: string;
  assetId: string;
  vendorId?: string;
  date: string;
  title: string;
  status: ServiceStatus;
  priority: WorkOrderPriority;
  notes: string;
  followUpDate?: string;
};

type ProcedureRecord = {
  id: string;
  title: string;
  area: string;
  priority: Priority;
  steps: string[];
};

type DocumentRecord = {
  id: string;
  title: string;
  area: string;
  type: string;
  linkedAssetId?: string;
  notes: string;
  href?: string;
};

type PartRecord = {
  id: string;
  name: string;
  category: string;
  locationId: string;
  assetId?: string;
  vendorId?: string;
  quantity: number;
  minQuantity: number;
  status: PartStatus;
  notes: string;
};

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  area: string;
  status: ServiceStatus;
};

type SearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  detail: string;
  screen: Screen;
  assetId?: string;
  vendorId?: string;
  serviceId?: string;
  mapLabelId?: string;
};

const colors = {
  navy: "#0B1E33",
  navy2: "#102A44",
  navy3: "#163B5C",
  gold: "#C99A3D",
  gold2: "#E6C16A",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
  red: "#B42318",
};

const screens: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Map" },
  { id: "locations", label: "Locations" },
  { id: "assets", label: "Assets" },
  { id: "history", label: "Work Orders" },
  { id: "vendors", label: "Vendors" },
  { id: "calendar", label: "Calendar" },
  { id: "weather", label: "Weather" },
  { id: "documents", label: "Documents" },
  { id: "procedures", label: "Procedures" },
  { id: "parts", label: "Parts" },
  { id: "assistant", label: "Ask Atlas" },
];

const mapLocalStorageKey = "atlas-map-labels-v2";
const storageKeys = {
  assets: "atlas-asset-records-v3",
  vendors: "atlas-vendor-records-v3",
  workOrders: "atlas-service-records-v11",
  calendar: "atlas-calendar-v11",
  parts: "atlas-part-records-v2",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "record";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(99, Math.round(value * 10) / 10));
}

function formatDate(date: string) {
  if (!date) return "No date";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function readStoredArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function badgeStyle(value: Status | ServiceStatus | WorkOrderPriority | PartStatus | Priority): React.CSSProperties {
  const palette: Record<string, { bg: string; color: string; border: string }> = {
    Online: { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
    Completed: { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
    Offline: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
    Out: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
    High: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
    Seasonal: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Open: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Order: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Monitor: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Scheduled: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Low: { bg: "#F2F4F7", color: "#475467", border: "#EAECF0" },
    Medium: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Normal: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    "In Stock": { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
    LowStock: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Low: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
  };
  const item = palette[value] ?? palette.Monitor;
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: `1px solid ${item.border}`,
    background: item.bg,
    color: item.color,
    padding: "4px 9px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

const defaultLocations: LocationRecord[] = [
  { id: "general", name: "General", type: "Property", zone: "2000", notes: "Whole-estate default location for records not tied to one room or asset." },
  { id: "original-house", name: "Original House", type: "Building", zone: "Main House", notes: "Original/main house structure." },
  { id: "addition", name: "Addition", type: "Building", zone: "Main House", notes: "Addition wing including the indoor pool area." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", zone: "Main House", notes: "Boilers, DHW tanks, hydronic controls, pumps, pool heat, and HVAC equipment." },
  { id: "pool-equipment", name: "Pool Equipment Room", type: "Pool Systems", zone: "Addition", notes: "Pool filtration, pumps, UV/ozone, Desert Aire, and hydronic pool heat equipment." },
  { id: "standalone-spa", name: "Hot Tub / Sundance", type: "Spa", zone: "Outdoor", notes: "Standalone Sundance 880 Optima spa. Separate from pool equipment." },
  { id: "dock", name: "Dock", type: "Waterfront", zone: "Lake", notes: "Main dock, boat lift areas, dock power, Sea-Doo area, Cobalt, and lift control boxes." },
  { id: "cobalt-lift", name: "Cobalt Lift", type: "Dock Lift", zone: "Dock", notes: "Cobalt boat lift and newer Sunstream lift control / battery / solar box." },
  { id: "seadoo-lift", name: "SeaDoo Lift", type: "PWC Lift", zone: "Dock", notes: "Sea-Doo lift and older/smaller Sunstream box." },
  { id: "dock-lift", name: "Dock Lift Box", type: "Lift Controls", zone: "Dock", notes: "Additional dock lift box. Keep separate from Cobalt and Sea-Doo lift boxes." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", zone: "Lake", notes: "Seasonal floating water trampoline location." },
  { id: "waterside-lawn-north", name: "Waterside Lawn (North)", type: "Grounds", zone: "Lake", notes: "North / lake-facing lawn and beds." },
  { id: "east-lawn", name: "East Lawn", type: "Grounds", zone: "East", notes: "Large lawn east/south of the sport court." },
  { id: "sport-court", name: "Sport Court", type: "Recreation", zone: "East", notes: "Outdoor sport court." },
  { id: "veggie-boxes", name: "Veggie Boxes", type: "Grounds", zone: "East", notes: "Three vegetable boxes at the south end of East Lawn near New Garage." },
  { id: "new-garage", name: "New Garage", type: "Building", zone: "Exterior", notes: "New garage / auto court garage area." },
  { id: "old-garage", name: "Old Garage", type: "Building", zone: "Exterior", notes: "Old garage near ADU and covered connection areas." },
  { id: "adu", name: "ADU", type: "Building", zone: "Left of Old Garage", notes: "ADU is a location/map label, not an asset." },
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", zone: "Main House", notes: "Patio with chairs/fire pit between main house, addition, old garage, and covered hallway. Do not label the gray covered hallway itself." },
  { id: "trampoline-dog", name: "Trampoline / Dog", type: "Grounds", zone: "Exterior", notes: "Turf/trampoline/dog cleanup area east of the covered hallway." },
  { id: "exterior", name: "Exterior", type: "Envelope", zone: "2000", notes: "Exterior paint/stain, siding, eaves, deck edges, windows, and envelope checks." },
  { id: "irrigation", name: "Irrigation", type: "Landscape Systems", zone: "Grounds", notes: "Hunter Hydrawise / Advanced Irrigation records, zones, flow/rain/soil sensors." },
];

const defaultMapLabels: MapLabelRecord[] = [
  { id: "map-dock", label: "Dock", category: "Waterfront", x: 58, y: 78, notes: "Main dock location with boat lifts, dock power, and waterfront service records.", photos: [] },
  { id: "map-cobalt", label: "Cobalt", category: "Watercraft", x: 63, y: 72, notes: "Cobalt R7 area near the dock. Keep separate from the Cobalt Sunstream lift box asset.", photos: [] },
  { id: "map-seadoo", label: "SeaDoo", category: "Watercraft", x: 64, y: 82, notes: "Sea-Doo / PWC area south of the small dock slip.", photos: [] },
  { id: "map-water-trampoline", label: "Water Trampoline", category: "Waterfront", x: 47, y: 86, notes: "Seasonal water trampoline location west of the dock.", photos: [] },
  { id: "map-waterside-lawn-north", label: "Waterside Lawn (North)", category: "Grounds", x: 50, y: 68, notes: "North waterside lawn and lake-facing beds.", photos: [] },
  { id: "map-east-lawn", label: "East Lawn", category: "Grounds", x: 74, y: 47, notes: "East lawn area and grounds records.", photos: [] },
  { id: "map-sport-court", label: "Sport Court", category: "Recreation", x: 83, y: 26, notes: "Sport court north of East Lawn.", photos: [] },
  { id: "map-veggie-boxes", label: "Veggie Boxes", category: "Grounds", x: 77, y: 62, notes: "Three veggie boxes at the south end of East Lawn next to New Garage.", photos: [] },
  { id: "map-new-garage", label: "New Garage", category: "Building", x: 40, y: 31, notes: "New garage location.", photos: [] },
  { id: "map-old-garage", label: "Old Garage", category: "Building", x: 33, y: 35, notes: "Old garage location.", photos: [] },
  { id: "map-adu", label: "ADU", category: "Location", x: 27, y: 42, notes: "Small square left of Old Garage. ADU is a location, not an asset.", photos: [] },
  { id: "map-courtyard", label: "Courtyard", category: "Outdoor Living", x: 47, y: 44, notes: "Courtyard patio with chairs/fire pit. West of the gray covered hallway.", photos: [] },
  { id: "map-trampoline-dog", label: "Trampoline / Dog", category: "Grounds", x: 42, y: 56, notes: "Green turf/trampoline/dog area east of the covered hallway.", photos: [] },
  { id: "map-original-house", label: "Original House", category: "Building", x: 49, y: 38, notes: "Original/main house structure.", photos: [] },
  { id: "map-addition", label: "Addition", category: "Building", x: 61, y: 36, notes: "Addition wing including indoor pool area.", photos: [] },
  { id: "map-hot-tub", label: "Hot Tub (Sundance)", category: "Spa", x: 61, y: 51, notes: "Standalone Sundance 880 spa on patio east of furniture/stairs to lawn.", photos: [] },
];

const defaultVendors: VendorRecord[] = [
  { id: "elliottpaint", name: "Elliott Paint Company", category: "Paint / Stain", phone: "206-510-0688", email: "brandon@elliottpaintco.com", notes: "Exterior paint/stain vendor. Brandon Ness contact. Kurt Anderson involved in sample/scope walkthroughs." },
  { id: "advancedirrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Hydrawise / Hunter HCC 24-zone irrigation controller, sensors, service, and current-year backflow testing." },
  { id: "psf", name: "PSF Mechanical", category: "HVAC / Boiler / Pool Mechanical", notes: "Boilers, hydronic heating, HVAC, Desert Aire, pool mechanical, and related systems." },
  { id: "seattleboat", name: "Seattle Boat", category: "Boat Service", notes: "Cobalt R7 service and seasonal watercraft support." },
  { id: "i90motorsports", name: "I-90 Motorsports", category: "PWC / Motorsports", notes: "Sea-Doo service / PWC support." },
  { id: "sunstream", name: "Sunstream Boat Lifts", category: "Dock / Lifts", notes: "Sunstream lift boxes and boat/PWC lift records." },
  { id: "penthousedrapery", name: "Penthouse Drapery", category: "Blinds / Drapery", phone: "206-292-8336", email: "accounting@penthousedrapery.com", notes: "Motorized roller shades. Invoice #176396 dated 06/16/2026." },
  { id: "unrivaled", name: "Unrivaled", category: "Pest Control", notes: "Current pest-control vendor. Terminix was canceled." },
  { id: "peterclark", name: "Peter Clark Designs", category: "Landscaping", notes: "Weekly landscaping/weeding crew approved by Steve and managed by Pat." },
  { id: "applianceservice", name: "Appliance Service Station", category: "Appliances", notes: "Appliance service vendor." },
];

const defaultAssets: AssetRecord[] = [
  { id: "boiler-1", name: "Boiler B-1", locationId: "mechanical-room", category: "Hydronic Heating", status: "Online", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", notes: "White wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE. Year 2018 from prior nameplate view.", vendorIds: ["psf", "viessmann"] },
  { id: "boiler-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", notes: "White wall-mounted Viessmann Vitodens 200. Year 2025 nameplate. Keep monitored after recall / heat exchanger work.", vendorIds: ["psf", "viessmann"] },
  { id: "vitocell-tanks", name: "Twin Viessmann Vitocell 300-V DHW Tanks", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "Two 79 USG / 300 L stainless indirect domestic hot water tanks.", vendorIds: ["psf"] },
  { id: "desertaire-dhu1", name: "Desert Aire DHU-1 Pool Dehumidification", locationId: "pool-equipment", category: "Pool HVAC", status: "Monitor", make: "Desert Aire", notes: "Indoor pool dehumidification system with hydronic heat coil and controls.", vendorIds: ["psf"] },
  { id: "pool-pump-pentair", name: "Pentair 3.0 HP Pool Pump", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", notes: "Pool source → pump → Triton II sand filter → UV/ozone → return to pool.", vendorIds: ["psf"] },
  { id: "sundance-optima", name: "Sundance 880 Optima Spa", locationId: "standalone-spa", category: "Spa", status: "Monitor", make: "Sundance", model: "OPTIMA", serial: "00P3LCD-100528521-0315", notes: "Standalone Sundance 880 Optima spa. Separate from pool equipment.", vendorIds: [] },
  { id: "sunstream-cobalt", name: "Sunstream Lift Box — Cobalt", locationId: "cobalt-lift", category: "Dock / Boat Lift", status: "Online", make: "Sunstream", notes: "Larger/newer Sunstream lift control, battery, and solar box from last summer. Belongs to Cobalt boat lift.", vendorIds: ["sunstream"] },
  { id: "sunstream-seadoo", name: "Sunstream Lift Box — SeaDoo", locationId: "seadoo-lift", category: "Dock / PWC Lift", status: "Monitor", make: "Sunstream", notes: "Sea-Doo lift box. Smaller/older Sunstream box. Keep separate from Cobalt lift box.", vendorIds: ["sunstream"] },
  { id: "sunstream-dock", name: "Sunstream Lift Box — Dock", locationId: "dock-lift", category: "Dock Lift Controls", status: "Monitor", make: "Sunstream", notes: "Additional smaller/older dock lift control box.", vendorIds: ["sunstream"] },
  { id: "craft-cobalt", name: "Craft — Cobalt R7", locationId: "dock", category: "Watercraft", status: "Seasonal", make: "Cobalt", model: "R7", notes: "Cobalt R7 watercraft record connected to dock and newer Sunstream Cobalt lift box.", vendorIds: ["seattleboat", "sunstream"] },
  { id: "craft-seadoo", name: "Craft — SeaDoo 2024 GTI SE 170", locationId: "dock", category: "Watercraft", status: "Seasonal", make: "Sea-Doo", model: "GTI SE 170", notes: "2024 Sea-Doo record connected to dock and Sea-Doo lift records.", vendorIds: ["i90motorsports", "sunstream"] },
  { id: "irrigation-controller", name: "Hunter HCC 24-Zone Irrigation Controller", locationId: "irrigation", category: "Irrigation", status: "Online", make: "Hunter", model: "HCC 24 Zones", serial: "06d050377d", notes: "Hydrawise controller name Faben2000. Installed 04/16/2026. Flow/rain/soil sensors captured.", vendorIds: ["advancedirrigation"] },
  { id: "blinds-lutron", name: "Blinds Lutron", locationId: "general", category: "Motorized Shades", status: "Monitor", make: "Lutron", notes: "Motorized roller shade asset. Penthouse Drapery invoice #176396 belongs here.", vendorIds: ["penthousedrapery"] },
  { id: "dishwasher-dw3", name: "Dishwasher DW-3 Right", locationId: "general", category: "Appliance", status: "Online", make: "Bosch", notes: "Kitchen right Bosch dishwasher.", vendorIds: ["applianceservice"] },
  { id: "exterior-stain", name: "Exterior Stain Scope", locationId: "exterior", category: "Exterior", status: "Monitor", notes: "Waterside verticals semi-transparent, eaves semi-solid; BBQ area semi-solid; East siding semi-solid/windows semi-transparent; garages solid.", vendorIds: ["elliottpaint"] },
];

const defaultWorkOrders: ServiceRecord[] = [
  { id: "wo-weekly-dock", assetId: "craft-cobalt", vendorId: "seattleboat", date: todayISO(), title: "Weekly dock / boat / Sea-Doo check", status: "Open", priority: "Medium", notes: "Check Cobalt, Sea-Doo, lifts, dock power, water trampoline, and waterfront equipment." },
  { id: "wo-pool-weekly", assetId: "pool-pump-pentair", vendorId: "psf", date: todayISO(), title: "Weekly pool / spa water and equipment check", status: "Open", priority: "High", notes: "Record pool/spa readings, filter pressure, equipment status, and any issues." },
  { id: "wo-exterior-stain", assetId: "exterior-stain", vendorId: "elliottpaint", date: "2026-07-08", title: "Exterior stain scope tracking", status: "Monitor", priority: "High", notes: "Track semi-transparent vs semi-solid scope, Jessica approval items, and progress photos." },
  { id: "wo-landscape-weeding", assetId: "irrigation-controller", vendorId: "peterclark", date: "2026-07-08", title: "Weekly landscaping crew — waterside beds first", status: "Scheduled", priority: "Medium", notes: "Pat manages crew. Priority: waterside beds first, then patio, courtyard, driveway, dock path, lawn edges, and other beds." },
];

const defaultProcedures: ProcedureRecord[] = [
  { id: "pool-backwash", title: "Pool Sand Filter Backwash", area: "Pool Equipment Room", priority: "High", steps: ["Record current filter pressure.", "Confirm valves are set safely for backwash.", "Backwash until water runs clear.", "Rinse after backwash.", "Return valves to normal filter operation.", "Record final pressure and issues."] },
  { id: "spa-weekly", title: "Sundance Spa Weekly Check", area: "Hot Tub / Sundance", priority: "Normal", steps: ["Check water level and temperature.", "Test sanitizer, pH, alkalinity.", "Confirm ClearRay / heater / circulation status.", "Clean cover and surrounding area.", "Log readings and follow-up items."] },
  { id: "out-of-town", title: "Out-of-Town Property Check", area: "2000", priority: "High", steps: ["Confirm doors, windows, alarms, and leak-prone areas.", "Check mechanical rooms for abnormal readings/noise.", "Check pool/spa/fountain/dock areas.", "Confirm vendor access and deliveries.", "Send summary to Steve if needed."] },
];

const defaultDocuments: DocumentRecord[] = [
  { id: "property-map", title: "Locked Atlas Property Map", area: "Map", type: "Image", href: "/atlas-property-map.png", notes: "Fixed original property map image used by Atlas labels." },
  { id: "stain-plan", title: "2000 Exterior Stain Plan — Photo-Based Scope Summary", area: "Exterior", type: "Scope", linkedAssetId: "exterior-stain", notes: "Client-facing stain scope summary for Jessica approval." },
  { id: "penthouse-invoice", title: "Penthouse Drapery Invoice #176396", area: "Blinds", type: "Invoice", linkedAssetId: "blinds-lutron", notes: "Repair one motorized roller shade; two trips and replacement drive." },
];

const defaultParts: PartRecord[] = [
  { id: "filters-mr1-16x16", name: "MR1 1x16x16 Columbia Filters", category: "HVAC Filters", locationId: "mechanical-room", quantity: 2, minQuantity: 2, status: "In Stock", notes: "Amazon filter record." },
  { id: "filters-aprilaire-210", name: "Aprilaire #210 4x20x25 Filter", category: "HVAC Filters", locationId: "mechanical-room", quantity: 1, minQuantity: 1, status: "Low", notes: "Amazon filter record." },
  { id: "pool-test-reagents", name: "Taylor Pool Test Reagents", category: "Pool Testing", locationId: "pool-equipment", quantity: 1, minQuantity: 1, status: "In Stock", notes: "Keep pool testing supplies stocked." },
];

const defaultCalendar: CalendarItem[] = [
  { id: "cal-tuesday-meeting", date: todayISO(), title: "Tuesday 10 AM Steve / Patrick meeting", area: "2000", status: "Scheduled" },
  { id: "cal-friday-meeting", date: todayISO(), title: "Friday 9 AM Steve meeting", area: "2000", status: "Scheduled" },
  { id: "cal-flooring", date: "2026-07-22", title: "5 Star Flooring / Eric — Evi's room", area: "Interior", status: "Scheduled" },
];

const blankMapLabel: MapLabelRecord = { id: "", label: "", category: "Location", x: 50, y: 50, notes: "", photos: [] };

export default function AtlasPage() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [mapLabels, setMapLabels] = useState<MapLabelRecord[]>(defaultMapLabels);
  const [selectedMapLabelId, setSelectedMapLabelId] = useState(defaultMapLabels[0].id);
  const [mapLabelForm, setMapLabelForm] = useState<MapLabelRecord>(defaultMapLabels[0]);
  const [mapLabelMode, setMapLabelMode] = useState<"edit" | "new">("edit");

  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>(defaultAssets);
  const [vendorRecords, setVendorRecords] = useState<VendorRecord[]>(defaultVendors);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>(defaultWorkOrders);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(defaultCalendar);
  const [partRecords, setPartRecords] = useState<PartRecord[]>(defaultParts);

  const [selectedAssetId, setSelectedAssetId] = useState(defaultAssets[0].id);
  const [selectedVendorId, setSelectedVendorId] = useState(defaultVendors[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState(defaultWorkOrders[0].id);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask Atlas about assets, vendors, map labels, work orders, calendar, procedures, documents, or parts.");

  const mapRef = useRef<HTMLDivElement | null>(null);
  const draggingLabelRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 760);
    const onResize = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener("resize", onResize);

    const storedMapLabels = readStoredArray<MapLabelRecord>(mapLocalStorageKey, defaultMapLabels).map((label) => ({
      ...blankMapLabel,
      ...label,
      id: label.id || uid("map"),
      label: label.label || "Map Label",
      category: label.category || "Location",
      x: clampPercent(Number(label.x)),
      y: clampPercent(Number(label.y)),
      photos: Array.isArray(label.photos) ? label.photos : [],
    }));

    setMapLabels(storedMapLabels.length ? storedMapLabels : defaultMapLabels);
    setSelectedMapLabelId((storedMapLabels[0] ?? defaultMapLabels[0]).id);
    setMapLabelForm(storedMapLabels[0] ?? defaultMapLabels[0]);

    setAssetRecords(readStoredArray<AssetRecord>(storageKeys.assets, defaultAssets));
    setVendorRecords(readStoredArray<VendorRecord>(storageKeys.vendors, defaultVendors));
    setServiceRecords(readStoredArray<ServiceRecord>(storageKeys.workOrders, defaultWorkOrders));
    setCalendarItems(readStoredArray<CalendarItem>(storageKeys.calendar, defaultCalendar));
    setPartRecords(readStoredArray<PartRecord>(storageKeys.parts, defaultParts));

    setReady(true);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(mapLocalStorageKey, JSON.stringify(mapLabels));
  }, [ready, mapLabels]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKeys.assets, JSON.stringify(assetRecords));
  }, [ready, assetRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKeys.vendors, JSON.stringify(vendorRecords));
  }, [ready, vendorRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKeys.workOrders, JSON.stringify(serviceRecords));
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKeys.calendar, JSON.stringify(calendarItems));
  }, [ready, calendarItems]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(storageKeys.parts, JSON.stringify(partRecords));
  }, [ready, partRecords]);

  const selectedMapLabel = mapLabels.find((label) => label.id === selectedMapLabelId) ?? mapLabels[0] ?? defaultMapLabels[0];
  const selectedAsset = assetRecords.find((asset) => asset.id === selectedAssetId) ?? assetRecords[0] ?? defaultAssets[0];
  const selectedVendor = vendorRecords.find((vendor) => vendor.id === selectedVendorId) ?? vendorRecords[0] ?? defaultVendors[0];
  const selectedService = serviceRecords.find((service) => service.id === selectedServiceId) ?? serviceRecords[0] ?? defaultWorkOrders[0];

  const searchText = query.trim().toLowerCase();

  const sortedLocations = useMemo(() => [...defaultLocations].sort((a, b) => a.name.localeCompare(b.name)), []);
  const sortedAssets = useMemo(() => [...assetRecords].sort((a, b) => a.name.localeCompare(b.name)), [assetRecords]);
  const sortedVendors = useMemo(() => [...vendorRecords].sort((a, b) => a.name.localeCompare(b.name)), [vendorRecords]);
  const sortedWorkOrders = useMemo(() => [...serviceRecords].sort((a, b) => (a.status === "Completed" ? 1 : 0) - (b.status === "Completed" ? 1 : 0) || a.date.localeCompare(b.date)), [serviceRecords]);

  const searchResults = useMemo(() => buildSearchIndex().filter((item) => !searchText || `${item.type} ${item.title} ${item.subtitle} ${item.detail}`.toLowerCase().includes(searchText)).slice(0, 12), [searchText, mapLabels, assetRecords, vendorRecords, serviceRecords, calendarItems, partRecords]);

  function locationName(id?: string) {
    return sortedLocations.find((location) => location.id === id)?.name ?? "General";
  }

  function vendorName(id?: string) {
    return vendorRecords.find((vendor) => vendor.id === id)?.name ?? "No vendor";
  }

  function assetName(id?: string) {
    return assetRecords.find((asset) => asset.id === id)?.name ?? "No asset";
  }

  function buildSearchIndex(): SearchResult[] {
    return [
      ...sortedLocations.map((location) => ({ id: `location-${location.id}`, type: "Location", title: location.name, subtitle: `${location.type} · ${location.zone}`, detail: location.notes, screen: "locations" as Screen })),
      ...mapLabels.map((label) => ({ id: `map-${label.id}`, type: "Map Label", title: label.label, subtitle: `${label.category} · ${Math.round(label.x)}/${Math.round(label.y)}`, detail: label.notes, screen: "map" as Screen, mapLabelId: label.id })),
      ...assetRecords.map((asset) => ({ id: `asset-${asset.id}`, type: "Asset", title: asset.name, subtitle: `${asset.category} · ${locationName(asset.locationId)} · ${asset.status}`, detail: `${asset.make ?? ""} ${asset.model ?? ""} ${asset.serial ?? ""} ${asset.notes}`, screen: "assets" as Screen, assetId: asset.id })),
      ...vendorRecords.map((vendor) => ({ id: `vendor-${vendor.id}`, type: "Vendor", title: vendor.name, subtitle: vendor.category, detail: `${vendor.phone ?? ""} ${vendor.email ?? ""} ${vendor.notes}`, screen: "vendors" as Screen, vendorId: vendor.id })),
      ...serviceRecords.map((service) => ({ id: `wo-${service.id}`, type: "Work Order", title: service.title, subtitle: `${formatDate(service.date)} · ${service.status} · ${service.priority}`, detail: `${assetName(service.assetId)} · ${vendorName(service.vendorId)} · ${service.notes}`, screen: "history" as Screen, serviceId: service.id })),
      ...defaultDocuments.map((doc) => ({ id: `doc-${doc.id}`, type: "Document", title: doc.title, subtitle: `${doc.type} · ${doc.area}`, detail: doc.notes, screen: "documents" as Screen, assetId: doc.linkedAssetId })),
      ...defaultProcedures.map((procedure) => ({ id: `procedure-${procedure.id}`, type: "Procedure", title: procedure.title, subtitle: `${procedure.area} · ${procedure.priority}`, detail: procedure.steps.join(" "), screen: "procedures" as Screen })),
      ...calendarItems.map((item) => ({ id: `calendar-${item.id}`, type: "Calendar", title: item.title, subtitle: `${formatDate(item.date)} · ${item.area}`, detail: item.status, screen: "calendar" as Screen })),
      ...partRecords.map((part) => ({ id: `part-${part.id}`, type: "Part", title: part.name, subtitle: `${part.category} · ${part.status}`, detail: `${locationName(part.locationId)} · Qty ${part.quantity} / min ${part.minQuantity}. ${part.notes}`, screen: "parts" as Screen, assetId: part.assetId, vendorId: part.vendorId })),
    ];
  }

  function openSearchResult(result: SearchResult) {
    if (result.assetId) setSelectedAssetId(result.assetId);
    if (result.vendorId) setSelectedVendorId(result.vendorId);
    if (result.serviceId) setSelectedServiceId(result.serviceId);
    if (result.mapLabelId) openMapLabel(result.mapLabelId);
    setScreen(result.screen);
    setQuery("");
  }

  function openMapLabel(id: string) {
    const label = mapLabels.find((item) => item.id === id);
    if (!label) return;
    setSelectedMapLabelId(id);
    setMapLabelForm(label);
    setMapLabelMode("edit");
  }

  function updateMapLabelPosition(id: string, clientX: number, clientY: number) {
    const box = mapRef.current?.getBoundingClientRect();
    if (!box) return;
    const nextX = clampPercent(((clientX - box.left) / box.width) * 100);
    const nextY = clampPercent(((clientY - box.top) / box.height) * 100);
    setMapLabels((current) => current.map((label) => (label.id === id ? { ...label, x: nextX, y: nextY } : label)));
    setMapLabelForm((current) => (current.id === id ? { ...current, x: nextX, y: nextY } : current));
  }

  function handleMapLabelPointerDown(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingLabelRef.current = id;
    openMapLabel(id);
  }

  function handleMapPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const id = draggingLabelRef.current;
    if (!id) return;
    updateMapLabelPosition(id, event.clientX, event.clientY);
  }

  function stopMapDrag() {
    draggingLabelRef.current = null;
  }

  function startNewMapLabel() {
    const nextLabel: MapLabelRecord = { ...blankMapLabel, id: uid("map"), label: "New Label", x: 50, y: 50 };
    setMapLabelMode("new");
    setSelectedMapLabelId(nextLabel.id);
    setMapLabelForm(nextLabel);
  }

  function saveMapLabel() {
    const labelText = mapLabelForm.label.trim() || "Map Label";
    const id = mapLabelForm.id || slugify(`map-${labelText}`);
    const cleanLabel: MapLabelRecord = {
      ...mapLabelForm,
      id,
      label: labelText,
      category: mapLabelForm.category.trim() || "Location",
      x: clampPercent(Number(mapLabelForm.x)),
      y: clampPercent(Number(mapLabelForm.y)),
      notes: mapLabelForm.notes.trim(),
      photos: mapLabelForm.photos ?? [],
    };

    setMapLabels((current) => (current.some((label) => label.id === id) ? current.map((label) => (label.id === id ? cleanLabel : label)) : [...current, cleanLabel]));
    setSelectedMapLabelId(id);
    setMapLabelForm(cleanLabel);
    setMapLabelMode("edit");
  }

  function deleteMapLabel() {
    if (!mapLabelForm.id) return;
    const remaining = mapLabels.filter((label) => label.id !== mapLabelForm.id);
    const next = remaining[0] ?? defaultMapLabels[0];
    setMapLabels(remaining.length ? remaining : defaultMapLabels);
    setSelectedMapLabelId(next.id);
    setMapLabelForm(next);
    setMapLabelMode("edit");
  }

  function resetMapLabels() {
    setMapLabels(defaultMapLabels);
    setSelectedMapLabelId(defaultMapLabels[0].id);
    setMapLabelForm(defaultMapLabels[0]);
    setMapLabelMode("edit");
  }

  function handleMapLabelPhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const labelId = mapLabelForm.id || selectedMapLabelId;
    const files = Array.from(event.target.files ?? []);
    if (!labelId || files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const photo: UploadedFileRecord = {
          id: uid("map-photo"),
          name: file.name,
          type: file.type || "photo",
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };
        setMapLabels((current) => current.map((label) => (label.id === labelId ? { ...label, photos: [photo, ...(label.photos ?? [])] } : label)));
        setMapLabelForm((current) => (current.id === labelId ? { ...current, photos: [photo, ...(current.photos ?? [])] } : current));
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  }

  function deleteMapPhoto(photoId: string) {
    const labelId = mapLabelForm.id || selectedMapLabelId;
    setMapLabels((current) => current.map((label) => (label.id === labelId ? { ...label, photos: (label.photos ?? []).filter((photo) => photo.id !== photoId) } : label)));
    setMapLabelForm((current) => ({ ...current, photos: (current.photos ?? []).filter((photo) => photo.id !== photoId) }));
  }

  function addWorkOrderFromMapLabel(label: MapLabelRecord) {
    const matchingAsset = assetRecords.find((asset) => asset.locationId === label.id.replace("map-", "")) ?? assetRecords[0];
    const record: ServiceRecord = {
      id: uid("wo"),
      assetId: matchingAsset.id,
      date: todayISO(),
      title: `Map follow-up — ${label.label}`,
      status: "Open",
      priority: "Medium",
      notes: label.notes ? `Created from map label. ${label.notes}` : "Created from map label.",
    };
    setServiceRecords((current) => [record, ...current]);
    setSelectedServiceId(record.id);
    setScreen("history");
  }

  function askAtlas() {
    const text = assistantQuestion.trim();
    if (!text) {
      setAssistantAnswer("Type a question first, then Ask Atlas.");
      return;
    }
    const terms = text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !["atlas", "what", "where", "when", "show", "about", "with", "that", "this", "does", "have"].includes(word));
    const matches = buildSearchIndex()
      .map((item) => {
        const haystack = `${item.type} ${item.title} ${item.subtitle} ${item.detail}`.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 8)
      .map(({ item }) => `${item.type}: ${item.title}\n${item.subtitle}\n${item.detail}`);

    setAssistantAnswer(matches.length ? matches.join("\n\n") : "I did not find that in the local Atlas records yet.");
  }

  const openWorkOrders = serviceRecords.filter((record) => record.status !== "Completed");
  const highPriority = serviceRecords.filter((record) => record.priority === "High" && record.status !== "Completed");

  return (
    <main style={{ ...shellStyle, gridTemplateColumns: isMobile ? "1fr" : "270px 1fr" }}>
      <aside style={{ ...sidebarStyle, position: isMobile ? "static" : "sticky", height: isMobile ? "auto" : "100vh" }}>
        <div style={brandBoxStyle}>
          <div style={logoCircleStyle}>A</div>
          <div>
            <div style={brandTitleStyle}>ATLAS</div>
            <div style={brandSubtitleStyle}>2000 Estate Operations</div>
          </div>
        </div>

        <nav style={{ ...navStyle, gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
          {screens.map((item) => (
            <button key={item.id} type="button" onClick={() => setScreen(item.id)} style={screen === item.id ? { ...navButtonStyle, ...navButtonActiveStyle } : navButtonStyle}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section style={contentStyle}>
        <div style={{ ...topbarStyle, flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center" }}>
          <div>
            <div style={eyebrowStyle}>Private Estate System</div>
            <h1 style={pageTitleStyle}>Atlas / 2000</h1>
          </div>
          <div style={{ position: "relative", width: isMobile ? "100%" : 420 }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Atlas records..." style={searchInputStyle} />
            {query.trim() && (
              <div style={searchPanelStyle}>
                {searchResults.length ? searchResults.map((result) => (
                  <button key={result.id} type="button" onClick={() => openSearchResult(result)} style={searchResultStyle}>
                    <strong>{result.type}: {result.title}</strong>
                    <span>{result.subtitle}</span>
                  </button>
                )) : <div style={emptyStateStyle}>No matching Atlas records.</div>}
              </div>
            )}
          </div>
        </div>

        {screen === "dashboard" && renderDashboard()}
        {screen === "map" && renderMap()}
        {screen === "locations" && renderLocations()}
        {screen === "assets" && renderAssets()}
        {screen === "history" && renderHistory()}
        {screen === "vendors" && renderVendors()}
        {screen === "calendar" && renderCalendar()}
        {screen === "weather" && renderWeather()}
        {screen === "documents" && renderDocuments()}
        {screen === "procedures" && renderProcedures()}
        {screen === "parts" && renderParts()}
        {screen === "assistant" && renderAssistant()}
      </section>
    </main>
  );

  function renderDashboard() {
    return (
      <div style={stackStyle}>
        <div style={statGridStyle}>
          <Stat label="Locations" value={String(defaultLocations.length)} />
          <Stat label="Assets" value={String(assetRecords.length)} />
          <Stat label="Open WOs" value={String(openWorkOrders.length)} />
          <Stat label="High Priority" value={String(highPriority.length)} />
        </div>

        <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr" }}>
          <Section title="Property Map" eyebrow="Fixed image / movable labels" right={<button type="button" onClick={() => setScreen("map")} style={goldButtonStyle}>Open Map</button>}>
            <div style={mapPreviewStyle}>
              <img src="/atlas-property-map.png" alt="Atlas property map" style={mapImageStyle} draggable={false} />
              {mapLabels.slice(0, 8).map((label) => (
                <span key={label.id} style={{ ...miniMapPinStyle, left: `${label.x}%`, top: `${label.y}%` }}>{label.label}</span>
              ))}
            </div>
          </Section>

          <Section title="Priority Work" eyebrow="To Do / Monitor">
            <div style={stackStyle}>
              {sortedWorkOrders.filter((record) => record.status !== "Completed").slice(0, 6).map((record) => (
                <button key={record.id} type="button" onClick={() => { setSelectedServiceId(record.id); setScreen("history"); }} style={rowButtonStyle}>
                  <div>
                    <strong>{record.title}</strong>
                    <p style={mutedSmallStyle}>{formatDate(record.date)} · {assetName(record.assetId)} · {vendorName(record.vendorId)}</p>
                  </div>
                  <span style={badgeStyle(record.priority)}>{record.priority}</span>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>
    );
  }

  function renderMap() {
    return (
      <Section
        title="Locked Map with Movable Atlas Labels"
        eyebrow="Property Map"
        right={
          <div style={buttonRowStyle}>
            <span style={badgeStyle("Online")}>{mapLabels.length} Labels</span>
            <button type="button" onClick={startNewMapLabel} style={goldButtonStyle}>Add Label</button>
            <button type="button" onClick={resetMapLabels} style={dangerButtonStyle}>Reset Map</button>
          </div>
        }
      >
        <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "1.35fr 0.65fr" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...emptyStateStyle, marginBottom: 12 }}>
              {isMobile ? "Mobile map: drag sideways to view the full property. Tap or drag labels to select and place them." : "The original map image stays locked. Drag labels to adjust placement, then edit details on the right."}
            </div>

            <div style={isMobile ? mobileMapViewportStyle : undefined}>
              <div
                ref={mapRef}
                onPointerMove={handleMapPointerMove}
                onPointerUp={stopMapDrag}
                onPointerLeave={stopMapDrag}
                style={{ ...mapShellStyle, ...(isMobile ? mobileMapShellStyle : {}) }}
              >
                <img src="/atlas-property-map.png" alt="Atlas property map" style={mapImageStyle} draggable={false} />
                {mapLabels.map((label) => {
                  const selected = label.id === selectedMapLabelId;
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onPointerDown={(event) => handleMapLabelPointerDown(event, label.id)}
                      style={{
                        ...mapPinStyle,
                        ...(isMobile ? mobileMapPinStyle : {}),
                        left: `${label.x}%`,
                        top: `${label.y}%`,
                        background: selected ? colors.gold : colors.navy,
                        color: selected ? colors.navy : "#FFFFFF",
                        borderColor: selected ? colors.navy : colors.gold2,
                        zIndex: selected ? 4 : 3,
                      }}
                      title="Drag to move. Details open in the panel."
                    >
                      <span style={pinDotStyle}>{Math.round(label.x)}/{Math.round(label.y)}</span>
                      {label.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={recordCardStyle}>
            <div style={eyebrowStyle}>{mapLabelMode === "new" ? "New Map Label" : "Selected Map Label"}</div>
            <h3 style={cardTitleStyle}>{mapLabelForm.label || selectedMapLabel.label}</h3>
            <div style={formGridStyle}>
              <label style={labelStyle}>Label Name<input value={mapLabelForm.label} onChange={(event) => setMapLabelForm((current) => ({ ...current, label: event.target.value }))} style={inputStyle} /></label>
              <label style={labelStyle}>Type / Category<input value={mapLabelForm.category} onChange={(event) => setMapLabelForm((current) => ({ ...current, category: event.target.value }))} style={inputStyle} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={labelStyle}>X %<input type="number" value={mapLabelForm.x} onChange={(event) => setMapLabelForm((current) => ({ ...current, x: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
                <label style={labelStyle}>Y %<input type="number" value={mapLabelForm.y} onChange={(event) => setMapLabelForm((current) => ({ ...current, y: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
              </div>
              <label style={labelStyle}>Notes<textarea value={mapLabelForm.notes} onChange={(event) => setMapLabelForm((current) => ({ ...current, notes: event.target.value }))} style={textareaStyle} /></label>
              <div style={buttonRowStyle}>
                <button type="button" onClick={saveMapLabel} style={goldButtonStyle}>Save Label</button>
                <button type="button" onClick={() => addWorkOrderFromMapLabel(mapLabelForm)} style={secondaryButtonStyle}>Create WO</button>
                <button type="button" onClick={deleteMapLabel} style={dangerButtonStyle}>Delete</button>
              </div>

              <label style={labelStyle}>Map Photos<input type="file" accept="image/*" multiple onChange={handleMapLabelPhotoUpload} style={inputStyle} /></label>
              {(mapLabelForm.photos ?? []).length ? (
                <div style={photoGridStyle}>
                  {mapLabelForm.photos.map((photo) => (
                    <div key={photo.id} style={photoCardStyle}>
                      <img src={photo.dataUrl} alt={photo.name} style={photoImageStyle} />
                      <button type="button" onClick={() => deleteMapPhoto(photo.id)} style={dangerButtonStyle}>Delete</button>
                    </div>
                  ))}
                </div>
              ) : <div style={emptyStateStyle}>No photos on this label yet.</div>}
            </div>
          </div>
        </div>
      </Section>
    );
  }

  function renderLocations() {
    const visible = sortedLocations.filter((location) => !searchText || `${location.name} ${location.type} ${location.zone} ${location.notes}`.toLowerCase().includes(searchText));
    return (
      <Section title="Locations" eyebrow="Alphabetized / related assets">
        <div style={listGridStyle}>
          {visible.map((location) => {
            const relatedAssets = assetRecords.filter((asset) => asset.locationId === location.id);
            return (
              <div key={location.id} style={recordCardStyle}>
                <h3 style={cardTitleStyle}>{location.name}</h3>
                <p style={mutedSmallStyle}>{location.type} · {location.zone}</p>
                <p style={bodyTextStyle}>{location.notes}</p>
                <div style={buttonRowStyle}>{relatedAssets.length ? relatedAssets.map((asset) => <button key={asset.id} type="button" onClick={() => { setSelectedAssetId(asset.id); setScreen("assets"); }} style={chipButtonStyle}>{asset.name}</button>) : <span style={badgeStyle("Monitor")}>No linked assets</span>}</div>
              </div>
            );
          })}
        </div>
      </Section>
    );
  }

  function renderAssets() {
    const visible = sortedAssets.filter((asset) => !searchText || `${asset.name} ${asset.category} ${locationName(asset.locationId)} ${asset.notes}`.toLowerCase().includes(searchText));
    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr" }}>
        <Section title="Assets" eyebrow="Equipment / property records" right={<button type="button" onClick={() => {
          const record: AssetRecord = { id: uid("asset"), name: "New Asset", locationId: "general", category: "General", status: "Monitor", notes: "", vendorIds: [] };
          setAssetRecords((current) => [record, ...current]); setSelectedAssetId(record.id);
        }} style={goldButtonStyle}>Add Asset</button>}>
          <div style={stackStyle}>{visible.map((asset) => <button key={asset.id} type="button" onClick={() => setSelectedAssetId(asset.id)} style={selectedAssetId === asset.id ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF9EA" } : rowButtonStyle}><div><strong>{asset.name}</strong><p style={mutedSmallStyle}>{asset.category} · {locationName(asset.locationId)}</p></div><span style={badgeStyle(asset.status)}>{asset.status}</span></button>)}</div>
        </Section>
        <Section title={selectedAsset.name} eyebrow="Asset Detail">
          <div style={formGridStyle}>
            <label style={labelStyle}>Name<input value={selectedAsset.name} onChange={(event) => updateAsset(selectedAsset.id, { name: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Location<select value={selectedAsset.locationId} onChange={(event) => updateAsset(selectedAsset.id, { locationId: event.target.value })} style={inputStyle}>{sortedLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            <label style={labelStyle}>Category<input value={selectedAsset.category} onChange={(event) => updateAsset(selectedAsset.id, { category: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Status<select value={selectedAsset.status} onChange={(event) => updateAsset(selectedAsset.id, { status: event.target.value as Status })} style={inputStyle}>{["Online", "Offline", "Seasonal", "Monitor"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label style={labelStyle}>Notes<textarea value={selectedAsset.notes} onChange={(event) => updateAsset(selectedAsset.id, { notes: event.target.value })} style={textareaStyle} /></label>
          </div>
        </Section>
      </div>
    );
  }

  function updateAsset(id: string, changes: Partial<AssetRecord>) {
    setAssetRecords((current) => current.map((asset) => (asset.id === id ? { ...asset, ...changes } : asset)));
  }

  function renderHistory() {
    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "0.95fr 1.05fr" }}>
        <Section title="Work Orders" eyebrow="To Do / Done" right={<button type="button" onClick={() => {
          const record: ServiceRecord = { id: uid("wo"), assetId: assetRecords[0]?.id ?? "", date: todayISO(), title: "New Work Order", status: "Open", priority: "Medium", notes: "" };
          setServiceRecords((current) => [record, ...current]); setSelectedServiceId(record.id);
        }} style={goldButtonStyle}>Add Work Order</button>}>
          <div style={stackStyle}>{sortedWorkOrders.map((record) => <button key={record.id} type="button" onClick={() => setSelectedServiceId(record.id)} style={selectedServiceId === record.id ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF9EA" } : rowButtonStyle}><div><strong>{record.title}</strong><p style={mutedSmallStyle}>{formatDate(record.date)} · {assetName(record.assetId)} · {vendorName(record.vendorId)}</p></div><span style={badgeStyle(record.status)}>{record.status}</span></button>)}</div>
        </Section>
        <Section title={selectedService.title} eyebrow="Work Order Detail">
          <div style={formGridStyle}>
            <label style={labelStyle}>Title<input value={selectedService.title} onChange={(event) => updateWorkOrder(selectedService.id, { title: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Asset<select value={selectedService.assetId} onChange={(event) => updateWorkOrder(selectedService.id, { assetId: event.target.value })} style={inputStyle}>{assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
            <label style={labelStyle}>Vendor<select value={selectedService.vendorId ?? ""} onChange={(event) => updateWorkOrder(selectedService.id, { vendorId: event.target.value })} style={inputStyle}><option value="">No vendor</option>{vendorRecords.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>Status<select value={selectedService.status} onChange={(event) => updateWorkOrder(selectedService.id, { status: event.target.value as ServiceStatus })} style={inputStyle}>{["Open", "Scheduled", "Completed", "Monitor"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label style={labelStyle}>Priority<select value={selectedService.priority} onChange={(event) => updateWorkOrder(selectedService.id, { priority: event.target.value as WorkOrderPriority })} style={inputStyle}>{["Low", "Medium", "High"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
            </div>
            <label style={labelStyle}>Date<input type="date" value={selectedService.date} onChange={(event) => updateWorkOrder(selectedService.id, { date: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Notes<textarea value={selectedService.notes} onChange={(event) => updateWorkOrder(selectedService.id, { notes: event.target.value })} style={textareaStyle} /></label>
          </div>
        </Section>
      </div>
    );
  }

  function updateWorkOrder(id: string, changes: Partial<ServiceRecord>) {
    setServiceRecords((current) => current.map((record) => (record.id === id ? { ...record, ...changes } : record)));
  }

  function renderVendors() {
    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr" }}>
        <Section title="Vendors" eyebrow="Contacts / notes" right={<button type="button" onClick={() => { const vendor: VendorRecord = { id: uid("vendor"), name: "New Vendor", category: "General", notes: "" }; setVendorRecords((current) => [vendor, ...current]); setSelectedVendorId(vendor.id); }} style={goldButtonStyle}>Add Vendor</button>}>
          <div style={stackStyle}>{sortedVendors.map((vendor) => <button key={vendor.id} type="button" onClick={() => setSelectedVendorId(vendor.id)} style={selectedVendorId === vendor.id ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF9EA" } : rowButtonStyle}><div><strong>{vendor.name}</strong><p style={mutedSmallStyle}>{vendor.category}</p></div></button>)}</div>
        </Section>
        <Section title={selectedVendor.name} eyebrow="Vendor Detail">
          <div style={formGridStyle}>
            <label style={labelStyle}>Name<input value={selectedVendor.name} onChange={(event) => updateVendor(selectedVendor.id, { name: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Category<input value={selectedVendor.category} onChange={(event) => updateVendor(selectedVendor.id, { category: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Phone<input value={selectedVendor.phone ?? ""} onChange={(event) => updateVendor(selectedVendor.id, { phone: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Email<input value={selectedVendor.email ?? ""} onChange={(event) => updateVendor(selectedVendor.id, { email: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Notes<textarea value={selectedVendor.notes} onChange={(event) => updateVendor(selectedVendor.id, { notes: event.target.value })} style={textareaStyle} /></label>
          </div>
        </Section>
      </div>
    );
  }

  function updateVendor(id: string, changes: Partial<VendorRecord>) {
    setVendorRecords((current) => current.map((vendor) => (vendor.id === id ? { ...vendor, ...changes } : vendor)));
  }

  function renderCalendar() {
    return <Section title="Calendar" eyebrow="Scheduled items"><div style={listGridStyle}>{calendarItems.map((item) => <div key={item.id} style={recordCardStyle}><h3 style={cardTitleStyle}>{item.title}</h3><p style={mutedSmallStyle}>{formatDate(item.date)} · {item.area}</p><span style={badgeStyle(item.status)}>{item.status}</span></div>)}</div></Section>;
  }

  function renderWeather() {
    return <Section title="Weather" eyebrow="Property planning"><div style={emptyStateStyle}>Weather planning placeholder. Keep using this tab for rain, wind, lake, exterior stain, irrigation, and dock planning notes.</div></Section>;
  }

  function renderDocuments() {
    return <Section title="Documents" eyebrow="Linked records"><div style={listGridStyle}>{defaultDocuments.map((doc) => <div key={doc.id} style={recordCardStyle}><h3 style={cardTitleStyle}>{doc.title}</h3><p style={mutedSmallStyle}>{doc.type} · {doc.area}</p><p style={bodyTextStyle}>{doc.notes}</p>{doc.href ? <a href={doc.href} style={linkStyle}>Open</a> : null}</div>)}</div></Section>;
  }

  function renderProcedures() {
    return <Section title="Procedures" eyebrow="Checklists"><div style={listGridStyle}>{defaultProcedures.map((procedure) => <div key={procedure.id} style={recordCardStyle}><h3 style={cardTitleStyle}>{procedure.title}</h3><p style={mutedSmallStyle}>{procedure.area}</p><ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>{procedure.steps.map((step, index) => <li key={`${procedure.id}-${index}`} style={bodyTextStyle}>{step}</li>)}</ol></div>)}</div></Section>;
  }

  function renderParts() {
    return <Section title="Parts" eyebrow="Inventory"><div style={listGridStyle}>{partRecords.map((part) => <div key={part.id} style={recordCardStyle}><h3 style={cardTitleStyle}>{part.name}</h3><p style={mutedSmallStyle}>{part.category} · {locationName(part.locationId)}</p><p style={bodyTextStyle}>Qty {part.quantity} / min {part.minQuantity}</p><span style={badgeStyle(part.status)}>{part.status}</span></div>)}</div></Section>;
  }

  function renderAssistant() {
    return (
      <Section title="Ask Atlas Property Assistant" eyebrow="Local Atlas records">
        <div style={formGridStyle}>
          <label style={labelStyle}>Question<textarea value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="Example: where is the ADU, what is high priority, who handles irrigation..." style={textareaStyle} /></label>
          <button type="button" onClick={askAtlas} style={goldButtonStyle}>Ask Atlas</button>
          <pre style={answerBoxStyle}>{assistantAnswer}</pre>
        </div>
      </Section>
    );
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={statCardStyle}><div style={statValueStyle}>{value}</div><div style={statLabelStyle}>{label}</div></div>;
}

function Section({ title, eyebrow, right, children }: { title: string; eyebrow: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={eyebrowStyle}>{eyebrow}</div>
          <h2 style={sectionTitleStyle}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const shellStyle: React.CSSProperties = { minHeight: "100vh", display: "grid", background: colors.bg, color: colors.text, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" };
const sidebarStyle: React.CSSProperties = { top: 0, alignSelf: "start", background: `linear-gradient(180deg, ${colors.navy}, ${colors.navy2})`, padding: 18, color: "white", overflowY: "auto" };
const brandBoxStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "8px 4px 20px" };
const logoCircleStyle: React.CSSProperties = { width: 44, height: 44, borderRadius: 16, display: "grid", placeItems: "center", background: colors.gold, color: colors.navy, fontWeight: 1000, fontSize: 24, boxShadow: "0 12px 28px rgba(0,0,0,.25)" };
const brandTitleStyle: React.CSSProperties = { fontWeight: 1000, letterSpacing: 2, fontSize: 21 };
const brandSubtitleStyle: React.CSSProperties = { fontSize: 12, color: "rgba(255,255,255,.72)", fontWeight: 800 };
const navStyle: React.CSSProperties = { display: "grid", gap: 8 };
const navButtonStyle: React.CSSProperties = { border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.82)", padding: "11px 12px", borderRadius: 12, textAlign: "left", cursor: "pointer", fontWeight: 850 };
const navButtonActiveStyle: React.CSSProperties = { background: "rgba(201,154,61,.20)", borderColor: colors.gold, color: "white" };
const contentStyle: React.CSSProperties = { padding: 18, minWidth: 0 };
const topbarStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 18 };
const pageTitleStyle: React.CSSProperties = { margin: "3px 0 0", color: colors.navy, fontSize: 34, lineHeight: 1.05, letterSpacing: -0.8 };
const eyebrowStyle: React.CSSProperties = { color: colors.gold, textTransform: "uppercase", fontSize: 11, letterSpacing: 1.5, fontWeight: 1000 };
const searchInputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${colors.line}`, background: "white", borderRadius: 14, padding: "13px 14px", fontWeight: 750, outline: "none" };
const searchPanelStyle: React.CSSProperties = { position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "white", border: `1px solid ${colors.line}`, borderRadius: 14, boxShadow: "0 18px 40px rgba(11,30,51,.18)", padding: 8, zIndex: 30, maxHeight: 420, overflowY: "auto" };
const searchResultStyle: React.CSSProperties = { display: "grid", gap: 3, width: "100%", textAlign: "left", border: "none", background: "transparent", padding: 10, borderRadius: 10, cursor: "pointer", color: colors.text };
const sectionStyle: React.CSSProperties = { background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 18, padding: 16, boxShadow: "0 10px 24px rgba(11,30,51,.06)" };
const sectionTitleStyle: React.CSSProperties = { color: colors.navy, margin: "4px 0 0", fontSize: 22, letterSpacing: -0.3 };
const statGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 };
const statCardStyle: React.CSSProperties = { background: "white", border: `1px solid ${colors.line}`, borderRadius: 16, padding: 16 };
const statValueStyle: React.CSSProperties = { fontSize: 31, color: colors.navy, fontWeight: 1000 };
const statLabelStyle: React.CSSProperties = { color: colors.muted, fontWeight: 850, fontSize: 13 };
const stackStyle: React.CSSProperties = { display: "grid", gap: 12 };
const gridTwoStyle: React.CSSProperties = { display: "grid", gap: 16, alignItems: "start" };
const mapPreviewStyle: React.CSSProperties = { position: "relative", overflow: "hidden", borderRadius: 16, border: `1px solid ${colors.line}`, background: "#D7E0EA", minHeight: 260 };
const mapShellStyle: React.CSSProperties = { position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: 18, border: `1px solid ${colors.line}`, background: "#D7E0EA", touchAction: "none", userSelect: "none" };
const mobileMapViewportStyle: React.CSSProperties = { width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 18 };
const mobileMapShellStyle: React.CSSProperties = { width: 920, maxWidth: "none" };
const mapImageStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" };
const mapPinStyle: React.CSSProperties = { position: "absolute", transform: "translate(-50%, -50%)", border: "2px solid", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 950, cursor: "grab", boxShadow: "0 8px 20px rgba(0,0,0,.25)", whiteSpace: "nowrap", touchAction: "none" };
const mobileMapPinStyle: React.CSSProperties = { fontSize: 12, padding: "8px 11px" };
const miniMapPinStyle: React.CSSProperties = { position: "absolute", transform: "translate(-50%, -50%)", background: colors.navy, color: "white", border: `1px solid ${colors.gold2}`, borderRadius: 999, padding: "3px 7px", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" };
const pinDotStyle: React.CSSProperties = { display: "inline-flex", marginRight: 6, opacity: 0.7, fontSize: 10 };
const recordCardStyle: React.CSSProperties = { border: `1px solid ${colors.line}`, background: "white", borderRadius: 16, padding: 14 };
const cardTitleStyle: React.CSSProperties = { color: colors.navy, margin: "4px 0 6px", fontSize: 18 };
const rowButtonStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: `1px solid ${colors.line}`, background: "white", borderRadius: 14, padding: 12, cursor: "pointer", color: colors.text };
const mutedSmallStyle: React.CSSProperties = { color: colors.muted, margin: "4px 0 0", fontSize: 13, lineHeight: 1.35 };
const bodyTextStyle: React.CSSProperties = { color: colors.text, margin: "8px 0 0", lineHeight: 1.45 };
const emptyStateStyle: React.CSSProperties = { border: `1px dashed ${colors.line}`, background: "#F8FAFC", borderRadius: 14, padding: 12, color: colors.muted, fontWeight: 750, fontSize: 13 };
const buttonRowStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
const goldButtonStyle: React.CSSProperties = { border: "none", background: colors.gold, color: colors.navy, borderRadius: 12, padding: "10px 13px", fontWeight: 1000, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: `1px solid ${colors.line}`, background: "white", color: colors.navy, borderRadius: 12, padding: "10px 13px", fontWeight: 900, cursor: "pointer" };
const dangerButtonStyle: React.CSSProperties = { border: "none", background: "#FEECEC", color: colors.red, borderRadius: 12, padding: "10px 13px", fontWeight: 1000, cursor: "pointer" };
const formGridStyle: React.CSSProperties = { display: "grid", gap: 10 };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, fontSize: 12, color: colors.muted, fontWeight: 900 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: `1px solid ${colors.line}`, background: "white", color: colors.text, borderRadius: 12, padding: "10px 11px", fontWeight: 750, outline: "none" };
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: 110, resize: "vertical", lineHeight: 1.4 };
const photoGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 };
const photoCardStyle: React.CSSProperties = { border: `1px solid ${colors.line}`, borderRadius: 14, overflow: "hidden", background: "white", padding: 8 };
const photoImageStyle: React.CSSProperties = { width: "100%", height: 110, objectFit: "cover", borderRadius: 10, marginBottom: 8 };
const listGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 };
const chipButtonStyle: React.CSSProperties = { border: `1px solid ${colors.line}`, background: "#F8FAFC", color: colors.navy, borderRadius: 999, padding: "6px 10px", fontWeight: 850, cursor: "pointer" };
const linkStyle: React.CSSProperties = { color: colors.navy, fontWeight: 1000 };
const answerBoxStyle: React.CSSProperties = { whiteSpace: "pre-wrap", border: `1px solid ${colors.line}`, background: "#F8FAFC", borderRadius: 14, padding: 14, color: colors.text, lineHeight: 1.45, minHeight: 180 };
