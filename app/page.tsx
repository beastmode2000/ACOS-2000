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
  type?: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
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
  procedureId?: string;
  date: string;
  title: string;
  status: ServiceStatus;
  priority?: WorkOrderPriority;
  notes: string;
  followUpDate?: string;
  photos?: UploadedFileRecord[];
  documents?: UploadedFileRecord[];
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
  linkedVendorId?: string;
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

type PhotoRecord = {
  id: string;
  assetId: string;
  name: string;
  dataUrl?: string;
  url?: string;
  createdAt?: string;
};

type WeatherDay = {
  date: string;
  code: number;
  high: number;
  low: number;
  precipChance: number;
  precipAmount: number;
  windMax: number;
  et0: number;
};

type AtlasApiPayload = {
  ok?: boolean;
  source?: string;
  error?: string;
  assetRecords?: AssetRecord[];
  assets?: AssetRecord[];
  vendorRecords?: VendorRecord[];
  vendors?: VendorRecord[];
  serviceRecords?: ServiceRecord[];
  workOrders?: ServiceRecord[];
  procedureRecords?: ProcedureRecord[];
  procedures?: ProcedureRecord[];
  calendarItems?: CalendarItem[];
  calendar?: CalendarItem[];
  photos?: PhotoRecord[];
  assetPhotos?: PhotoRecord[];
};

type AtlasTable = "assets" | "vendors" | "work_orders" | "procedures" | "calendar" | "asset_photos";

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
  procedureId?: string;
  calendarId?: string;
  partId?: string;
};

const colors = {
  navy: "#071B2F",
  navy2: "#0B2742",
  navy3: "#123D63",
  gold: "#C99A3D",
  gold2: "#E5C06B",
  bg: "#F4F7FB",
  card: "#FFFFFF",
  panel: "#F8FAFC",
  line: "#DDE7F0",
  text: "#172331",
  muted: "#64748B",
  red: "#B42318",
  green: "#087443",
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

const logoCandidates = [
  "/atlas-logo.png",
  "/atlas-logo.svg",
  "/logo.png",
  "/icon-512.png",
  "/icon-192.png",
  "/apple-touch-icon.png",
];

const storageKeys = {
  mapLabels: ["atlas-map-labels-v2", "atlas_2000_labels_safe_v1"],
  assets: ["atlas-asset-records-v3", "atlas-asset-records-v2", "atlas-asset-records-v1", "atlas_2000_assets_safe_v1"],
  vendors: ["atlas-vendor-records-v3", "atlas-vendor-records-v2", "atlas-vendor-records-v1", "atlas_2000_vendors_safe_v1"],
  workOrders: [
    "atlas-service-records-v11",
    "atlas-service-records-v10",
    "atlas-service-records-v9",
    "atlas-service-records-v8",
    "atlas-service-records-v7",
    "atlas-service-records-v6",
  ],
  calendar: ["atlas-calendar-v11", "atlas-calendar-v10", "atlas-calendar-v9", "atlas-calendar-v8", "atlas-calendar-v7", "atlas-calendar-v6", "atlas_2000_calendar_safe_v1"],
  parts: ["atlas-part-records-v2"],
  procedures: ["atlas-procedure-records-v1", "atlas_2000_procedures_safe_v1"],
  photos: ["atlas-photo-records-v10", "atlas-photo-records-v9", "atlas-photo-records-v8", "atlas-photo-records-v7", "atlas-photo-records-v6"],
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "record"
  );
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

function monthName(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shortDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function isStatus(value: unknown): value is Status {
  return value === "Online" || value === "Offline" || value === "Seasonal" || value === "Monitor";
}

function isServiceStatus(value: unknown): value is ServiceStatus {
  return value === "Open" || value === "Scheduled" || value === "Completed" || value === "Monitor";
}

function isPriority(value: unknown): value is WorkOrderPriority {
  return value === "Low" || value === "Medium" || value === "High";
}

function isProcedurePriority(value: unknown): value is Priority {
  return value === "High" || value === "Normal" || value === "Seasonal";
}

function isPartStatus(value: unknown): value is PartStatus {
  return value === "In Stock" || value === "Low" || value === "Out" || value === "Order";
}

function readStoredArray<T>(keys: string[], fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      continue;
    }
  }
  return fallback;
}

function saveStoredArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeAsset(record: Partial<AssetRecord>): AssetRecord {
  const name = String(record.name || "Unnamed Asset");
  return {
    id: String(record.id || slugify(name)),
    name,
    locationId: String(record.locationId || "general"),
    category: String(record.category || "General"),
    status: isStatus(record.status) ? record.status : "Monitor",
    make: record.make || "",
    model: record.model || "",
    serial: record.serial || "",
    notes: String(record.notes || ""),
    vendorIds: Array.isArray(record.vendorIds) ? record.vendorIds.map(String) : [],
  };
}

function normalizeVendor(record: Partial<VendorRecord>): VendorRecord {
  const name = String(record.name || "Unnamed Vendor");
  return {
    id: String(record.id || slugify(name)),
    name,
    category: String(record.category || "General"),
    phone: record.phone || "",
    email: record.email || "",
    website: record.website || "",
    notes: String(record.notes || ""),
  };
}

function normalizeService(record: Partial<ServiceRecord>): ServiceRecord {
  const title = String(record.title || "Untitled Work Order");
  return {
    id: String(record.id || slugify(title)),
    assetId: String(record.assetId || ""),
    vendorId: record.vendorId || "",
    procedureId: record.procedureId || "",
    date: String(record.date || todayISO()),
    title,
    status: isServiceStatus(record.status) ? record.status : "Open",
    priority: isPriority(record.priority) ? record.priority : "Medium",
    notes: String(record.notes || ""),
    followUpDate: record.followUpDate || "",
    photos: Array.isArray(record.photos) ? record.photos : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
  };
}

function normalizeProcedure(record: Partial<ProcedureRecord>): ProcedureRecord {
  const title = String(record.title || "Untitled Procedure");
  return {
    id: String(record.id || slugify(title)),
    title,
    area: String(record.area || "2000"),
    priority: isProcedurePriority(record.priority) ? record.priority : "Normal",
    steps: Array.isArray(record.steps) ? record.steps.map(String) : [],
  };
}

function normalizeCalendar(record: Partial<CalendarItem>): CalendarItem {
  const title = String(record.title || "Untitled Calendar Item");
  return {
    id: String(record.id || slugify(title)),
    date: String(record.date || todayISO()),
    title,
    area: String(record.area || "2000"),
    status: isServiceStatus(record.status) ? record.status : "Scheduled",
  };
}

function normalizePart(record: Partial<PartRecord>): PartRecord {
  const name = String(record.name || "Unnamed Part");
  return {
    id: String(record.id || slugify(name)),
    name,
    category: String(record.category || "General"),
    locationId: String(record.locationId || "general"),
    assetId: record.assetId || "",
    vendorId: record.vendorId || "",
    quantity: Number(record.quantity || 0),
    minQuantity: Number(record.minQuantity || 1),
    status: isPartStatus(record.status) ? record.status : "In Stock",
    notes: String(record.notes || ""),
  };
}

function byName<T extends { name: string }>(records: T[]) {
  return [...records].sort((a, b) => a.name.localeCompare(b.name));
}

function byTitle<T extends { title: string }>(records: T[]) {
  return [...records].sort((a, b) => a.title.localeCompare(b.title));
}

function badgeStyle(value: string): React.CSSProperties {
  const palette: Record<string, { bg: string; color: string; border: string }> = {
    Online: { bg: "#EAF7F1", color: colors.green, border: "#BDE7D2" },
    Completed: { bg: "#EAF7F1", color: colors.green, border: "#BDE7D2" },
    "In Stock": { bg: "#EAF7F1", color: colors.green, border: "#BDE7D2" },
    Offline: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
    Out: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
    High: { bg: "#FEECEC", color: colors.red, border: "#FACACA" },
    Seasonal: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Open: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Order: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Low: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Monitor: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Scheduled: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Medium: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Normal: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
  };
  const item = palette[value] ?? palette.Monitor;
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
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

function weatherText(code: number) {
  if ([0].includes(code)) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunder";
  return "Weather";
}

function irrigationAdvice(day: WeatherDay) {
  if (day.precipAmount >= 0.25 || day.precipChance >= 75) return "Rain likely — skip irrigation unless pots are dry.";
  if (day.precipAmount >= 0.1 || day.precipChance >= 45) return "Possible rain — check beds before watering.";
  if (day.high >= 82 || day.et0 >= 0.18) return "Hot/dry day — prioritize pots, new plantings, and exposed beds.";
  if (day.windMax >= 18) return "Windy — avoid spray irrigation during peak wind.";
  return "Good yard-work window — normal irrigation check.";
}

const locations: LocationRecord[] = [
  { id: "general", name: "General", type: "Property", zone: "2000", notes: "Whole-property fallback location." },
  { id: "addition", name: "Addition", type: "Building", zone: "Main House", notes: "Addition wing including indoor pool area." },
  { id: "adu", name: "ADU", type: "Building", zone: "Left of Old Garage", notes: "ADU is a location, not an asset." },
  { id: "cobalt-lift", name: "Cobalt Lift", type: "Dock Lift", zone: "Dock", notes: "Cobalt boat lift and newer Sunstream lift box." },
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", zone: "Main House", notes: "Patio with chairs/fire pit between main house, addition, old garage, and covered hallway." },
  { id: "dock", name: "Dock", type: "Waterfront", zone: "Lake", notes: "Main dock, boat lift areas, dock power, Sea-Doo area, Cobalt, and lift control boxes." },
  { id: "dock-lift", name: "Dock Lift Box", type: "Lift Controls", zone: "Dock", notes: "Additional dock lift box." },
  { id: "east-lawn", name: "East Lawn", type: "Grounds", zone: "East", notes: "Large lawn east/south of the sport court." },
  { id: "exterior", name: "Exterior", type: "Envelope", zone: "2000", notes: "Exterior paint/stain, siding, eaves, deck edges, windows, and envelope checks." },
  { id: "house-managers-office", name: "House Managers Office", type: "Interior", zone: "Original House", notes: "Office appliance records and house manager operating area." },
  { id: "irrigation", name: "Irrigation", type: "Landscape Systems", zone: "Grounds", notes: "Hunter Hydrawise / Advanced Irrigation records, zones, flow/rain/soil sensors." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", zone: "Main House", notes: "Boilers, DHW tanks, hydronic controls, pumps, pool heat, and HVAC equipment." },
  { id: "new-garage", name: "New Garage", type: "Building", zone: "Exterior", notes: "New garage / auto court garage area." },
  { id: "old-garage", name: "Old Garage", type: "Building", zone: "Exterior", notes: "Old garage near ADU and covered connection areas." },
  { id: "original-house", name: "Original House", type: "Building", zone: "Main House", notes: "Original/main house structure." },
  { id: "pantry", name: "Pantry", type: "Interior", zone: "Original House", notes: "Pantry freezer, storage, and supplies." },
  { id: "pool-changing-room", name: "Pool Changing Room", type: "Pool", zone: "Addition", notes: "Pool changing room and ClearRay UV-C ballast area." },
  { id: "pool-equipment", name: "Pool Equipment Room", type: "Pool Systems", zone: "Addition", notes: "Pool filtration, pumps, sand filter, UV/ozone, Desert Aire, and hydronic pool heat equipment." },
  { id: "seadoo-lift", name: "SeaDoo Lift", type: "PWC Lift", zone: "Dock", notes: "Sea-Doo lift and older/smaller Sunstream box." },
  { id: "sport-court", name: "Sport Court", type: "Recreation", zone: "East", notes: "Outdoor sport court." },
  { id: "standalone-spa", name: "Hot Tub / Sundance", type: "Spa", zone: "Outdoor", notes: "Standalone Sundance 880 Optima spa." },
  { id: "trampoline-dog", name: "Trampoline / Dog", type: "Grounds", zone: "Exterior", notes: "Turf/trampoline/dog cleanup area east of covered hallway." },
  { id: "upstairs-laundry", name: "Upstairs Laundry", type: "Interior", zone: "Original House", notes: "Upstairs laundry washer/dryer and related assets." },
  { id: "veggie-boxes", name: "Veggie Boxes", type: "Grounds", zone: "East", notes: "Three vegetable boxes at south end of East Lawn near New Garage." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", zone: "Lake", notes: "Seasonal floating water trampoline location." },
  { id: "waterside-lawn-north", name: "Waterside Lawn (North)", type: "Grounds", zone: "Lake", notes: "North / lake-facing lawn and beds." },
  { id: "wine-room", name: "Wine Room", type: "Interior", zone: "Original House", notes: "Wine room equipment and freezer record." },
];

const defaultMapLabels: MapLabelRecord[] = [
  { id: "map-addition", label: "Addition", category: "Building", x: 61, y: 36, notes: "Addition wing including indoor pool area.", photos: [] },
  { id: "map-adu", label: "ADU", category: "Location", x: 27, y: 42, notes: "Small square left of Old Garage. ADU is a location, not an asset.", photos: [] },
  { id: "map-cobalt", label: "Cobalt", category: "Watercraft", x: 63, y: 72, notes: "Cobalt R7 area near the dock.", photos: [] },
  { id: "map-courtyard", label: "Courtyard", category: "Outdoor Living", x: 47, y: 44, notes: "Courtyard patio with chairs/fire pit. West of the gray covered hallway.", photos: [] },
  { id: "map-dock", label: "Dock", category: "Waterfront", x: 58, y: 78, notes: "Main dock location with boat lifts, dock power, and waterfront service records.", photos: [] },
  { id: "map-east-lawn", label: "East Lawn", category: "Grounds", x: 74, y: 47, notes: "East lawn area and grounds records.", photos: [] },
  { id: "map-hot-tub", label: "Hot Tub (Sundance)", category: "Spa", x: 61, y: 51, notes: "Standalone Sundance 880 spa on patio east of furniture/stairs to lawn.", photos: [] },
  { id: "map-new-garage", label: "New Garage", category: "Building", x: 40, y: 31, notes: "New garage location.", photos: [] },
  { id: "map-old-garage", label: "Old Garage", category: "Building", x: 33, y: 35, notes: "Old garage location.", photos: [] },
  { id: "map-original-house", label: "Original House", category: "Building", x: 49, y: 38, notes: "Original/main house structure.", photos: [] },
  { id: "map-seadoo", label: "SeaDoo", category: "Watercraft", x: 64, y: 82, notes: "Sea-Doo / PWC area south of the small dock slip.", photos: [] },
  { id: "map-sport-court", label: "Sport Court", category: "Recreation", x: 83, y: 26, notes: "Sport court north of East Lawn.", photos: [] },
  { id: "map-trampoline-dog", label: "Trampoline / Dog", category: "Grounds", x: 42, y: 56, notes: "Green turf/trampoline/dog area east of covered hallway.", photos: [] },
  { id: "map-veggie-boxes", label: "Veggie Boxes", category: "Grounds", x: 77, y: 62, notes: "Three veggie boxes at the south end of East Lawn next to New Garage.", photos: [] },
  { id: "map-water-trampoline", label: "Water Trampoline", category: "Waterfront", x: 47, y: 86, notes: "Seasonal water trampoline location west of the dock.", photos: [] },
  { id: "map-waterside-lawn-north", label: "Waterside Lawn (North)", category: "Grounds", x: 50, y: 68, notes: "North waterside lawn and lake-facing beds.", photos: [] },
];

const fallbackVendors: VendorRecord[] = [
  { id: "advancedirrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Hydrawise / Hunter HCC 24-zone irrigation controller, sensors, service, and current-year backflow testing." },
  { id: "amazon", name: "Amazon", category: "Parts / Supplies", notes: "HVAC filters and general property supplies." },
  { id: "applianceservice", name: "Appliance Service Station", category: "Appliances", notes: "Appliance service vendor." },
  { id: "bosch", name: "Bosch", category: "Appliances", notes: "Bosch dishwasher records." },
  { id: "elliottpaint", name: "Elliott Paint Company", category: "Paint / Stain", phone: "206-510-0688", email: "brandon@elliottpaintco.com", notes: "Exterior paint/stain vendor. Brandon Ness contact. Kurt Anderson involved in samples/scope walkthroughs." },
  { id: "i90motorsports", name: "I-90 Motorsports", category: "PWC / Motorsports", notes: "Sea-Doo service / PWC support." },
  { id: "penthousedrapery", name: "Penthouse Drapery", category: "Blinds / Drapery", phone: "206-292-8336", email: "accounting@penthousedrapery.com", notes: "Motorized roller shades. Invoice #176396 dated 06/16/2026." },
  { id: "peterclark", name: "Peter Clark Designs", category: "Landscaping", notes: "Weekly landscaping/weeding crew approved by Steve and managed by Pat." },
  { id: "psf", name: "PSF Mechanical", category: "HVAC / Boiler / Pool Mechanical", notes: "Boilers, hydronic heating, HVAC, Desert Aire, pool mechanical, and related systems." },
  { id: "seaborn-services", name: "Seaborn Services", category: "Dock / Marine", notes: "Dock, lifts, bumpers. Superintendent Christopher Phillips." },
  { id: "seattleboat", name: "Seattle Boat", category: "Boat Service", notes: "Cobalt R7 service and seasonal watercraft support." },
  { id: "sunstream", name: "Sunstream Boat Lifts", category: "Dock / Lifts", notes: "Sunstream lift boxes and boat/PWC lift records." },
  { id: "unrivaled", name: "Unrivaled", category: "Pest Control", notes: "Current pest-control vendor. Terminix canceled 07/02/2026." },
  { id: "viessmann", name: "Viessmann", category: "Boiler Manufacturer", notes: "Vitodens boilers, Vitotronic cascade, Vitocell DHW tanks." },
];

const fallbackAssets: AssetRecord[] = [
  { id: "blinds-lutron", name: "Blinds — Lutron Sivoia QS", locationId: "general", category: "Motorized Shades", status: "Monitor", make: "Lutron", model: "Sivoia QS", notes: "Motorized shade asset. Penthouse Drapery invoice #176396 belongs here.", vendorIds: ["penthousedrapery"] },
  { id: "boiler-1", name: "Boiler B-1", locationId: "mechanical-room", category: "Hydronic Heating", status: "Online", make: "Viessmann", model: "Vitodens 200 / 200-W", serial: "758960502925", notes: "Wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE. MAWP 60 PSI. Max water temp 210°F.", vendorIds: ["psf", "viessmann"] },
  { id: "boiler-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200 / 200-W", serial: "758960507593", notes: "Wall-mounted Viessmann Vitodens 200. Year 2025. Monitor after recall / heat exchanger / igniter issue.", vendorIds: ["psf", "viessmann"] },
  { id: "craft-cobalt", name: "Craft — Cobalt R7", locationId: "dock", category: "Watercraft", status: "Seasonal", make: "Cobalt", model: "R7", serial: "HIN FGE7S0561920", notes: "2020 Cobalt R7. WA WN4528SW.", vendorIds: ["seattleboat", "sunstream"] },
  { id: "craft-seadoo", name: "Craft — SeaDoo 2024 GTI SE 170", locationId: "dock", category: "Watercraft", status: "Seasonal", make: "Sea-Doo", model: "GTI SE 170", serial: "HIN YDV81960E424", notes: "WA WN5351VW. Connected to dock and Sea-Doo lift records.", vendorIds: ["i90motorsports", "sunstream"] },
  { id: "desertaire-dhu1", name: "Desert Aire Indoor Pool Dehumidification", locationId: "pool-equipment", category: "Pool HVAC", status: "Monitor", make: "Desert Aire", notes: "Indoor pool dehumidification system.", vendorIds: ["psf"] },
  { id: "dishwasher-dw1", name: "Dishwasher DW-1 Bosch Fitness Room", locationId: "general", category: "Appliance", status: "Online", make: "Bosch", model: "SPV68U53UC/42", notes: "Fitness Room Bosch dishwasher.", vendorIds: ["bosch", "applianceservice"] },
  { id: "dishwasher-dw2", name: "Dishwasher DW-2 Bosch House Managers Office", locationId: "house-managers-office", category: "Appliance", status: "Online", make: "Bosch", model: "SHE55M15UC/64", notes: "House Managers Office Bosch dishwasher.", vendorIds: ["bosch", "applianceservice"] },
  { id: "dishwasher-dw3", name: "Dishwasher DW-3 Right Bosch", locationId: "general", category: "Appliance", status: "Online", make: "Bosch", model: "SHV88PW53N/11", serial: "FD981100351", notes: "Kitchen right Bosch dishwasher.", vendorIds: ["bosch", "applianceservice"] },
  { id: "dishwasher-dw4", name: "Dishwasher DW-4 Left Bosch", locationId: "general", category: "Appliance", status: "Online", make: "Bosch", model: "SHV88PW53N/10", serial: "FD980500530", notes: "Kitchen left Bosch dishwasher.", vendorIds: ["bosch", "applianceservice"] },
  { id: "dryer-dr1", name: "Dryer DR-1 Electrolux Upstairs Laundry", locationId: "upstairs-laundry", category: "Appliance", status: "Online", make: "Electrolux", model: "EFME617STT0", serial: "4d80932379", notes: "Upstairs Laundry dryer.", vendorIds: ["applianceservice"] },
  { id: "exterior-stain", name: "Exterior Stain Scope", locationId: "exterior", category: "Exterior", status: "Monitor", notes: "Waterside verticals 2 coats semi-transparent; eaves semi-solid. BBQ area semi-solid. East siding semi-solid and windows semi-transparent. South addition solid. Courtyard/glass door wall semi-transparent. New Garage solid. Old Garage solid.", vendorIds: ["elliottpaint"] },
  { id: "freezer-fr1", name: "Freezer FR-1 Pantry", locationId: "pantry", category: "Appliance", status: "Online", notes: "Pantry freezer.", vendorIds: ["applianceservice"] },
  { id: "freezer-fr5", name: "Freezer FR-5 Wine Room F&P RB36S", locationId: "wine-room", category: "Appliance", status: "Online", make: "Fisher & Paykel", model: "RB36S", serial: "AAG871948", notes: "Wine Room freezer.", vendorIds: ["applianceservice"] },
  { id: "irrigation-controller", name: "Hunter HCC 24-Zone Irrigation Controller", locationId: "irrigation", category: "Irrigation", status: "Online", make: "Hunter", model: "HCC 24 Zones", serial: "06d050377d", notes: "Hydrawise controller name Faben2000. Installed 04/16/2026. Flow/rain/soil sensors captured.", vendorIds: ["advancedirrigation"] },
  { id: "pool-pump-pentair", name: "Pentair Pool Pump", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", notes: "Pool pump / filter system.", vendorIds: ["psf"] },
  { id: "sundance-optima", name: "Sundance 880 Optima Spa", locationId: "standalone-spa", category: "Spa", status: "Monitor", make: "Sundance", model: "880 Optima", serial: "00P3LCD-100528521-0315", notes: "Standalone Sundance 880 Optima spa. 240 V 26/40 A.", vendorIds: [] },
  { id: "sunstream-cobalt", name: "Sunstream Lift Box — Cobalt", locationId: "cobalt-lift", category: "Dock / Boat Lift", status: "Online", make: "Sunstream", notes: "Larger/newer Sunstream lift control, battery, and solar box. Belongs to Cobalt boat lift.", vendorIds: ["sunstream", "seaborn-services"] },
  { id: "sunstream-dock", name: "Sunstream Lift Box — Dock", locationId: "dock-lift", category: "Dock Lift Controls", status: "Monitor", make: "Sunstream", notes: "Additional smaller/older dock lift control box.", vendorIds: ["sunstream", "seaborn-services"] },
  { id: "sunstream-seadoo", name: "Sunstream Lift Box — SeaDoo", locationId: "seadoo-lift", category: "Dock / PWC Lift", status: "Monitor", make: "Sunstream", notes: "Sea-Doo lift box. Smaller/older Sunstream box.", vendorIds: ["sunstream", "seaborn-services"] },
  { id: "triton-sand-filter", name: "Triton II Sand Filter", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", model: "Triton II", notes: "Pool sand filter. Track backwash and pressure readings.", vendorIds: ["psf"] },
  { id: "vehicle-kia-sportage", name: "Vehicle — 2026 Kia Sportage", locationId: "new-garage", category: "Vehicle", status: "Online", make: "Kia", model: "Sportage", serial: "VIN KNDPVDDG3T7328779", notes: "WA plate CWY1869.", vendorIds: [] },
  { id: "vehicle-mercedes-gl", name: "Vehicle — Mercedes GL", locationId: "new-garage", category: "Vehicle", status: "Online", make: "Mercedes-Benz", model: "GL", serial: "VIN 4JGDF7DE8FA469902", notes: "Vehicle record.", vendorIds: [] },
  { id: "vehicle-porsche", name: "Vehicle — Porsche", locationId: "new-garage", category: "Vehicle", status: "Online", make: "Porsche", notes: "Vehicle record.", vendorIds: [] },
  { id: "vehicle-raptor", name: "Vehicle — 2023 Ford F-150 Raptor", locationId: "new-garage", category: "Vehicle", status: "Online", make: "Ford", model: "F-150 Raptor", serial: "VIN 1FTFW1RG0PFA87887", notes: "Jeremy's Raptor.", vendorIds: [] },
  { id: "vehicle-rivian", name: "Vehicle — Rivian", locationId: "new-garage", category: "Vehicle", status: "Online", make: "Rivian", notes: "Single merged Rivian vehicle record.", vendorIds: [] },
  { id: "vitocell-tank-1", name: "Viessmann Vitocell 300-V DHW Tank 1", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "79 USG / 300 L stainless indirect domestic hot water tank.", vendorIds: ["psf", "viessmann"] },
  { id: "vitocell-tank-2", name: "Viessmann Vitocell 300-V DHW Tank 2", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "Second 79 USG / 300 L stainless indirect domestic hot water tank.", vendorIds: ["psf", "viessmann"] },
  { id: "vitotronic-cascade", name: "Vitotronic 300-K Cascade Control", locationId: "mechanical-room", category: "Hydronic Control", status: "Online", make: "Viessmann", model: "Vitotronic 300-K Series MW2C", notes: "Cascade control. Boiler 2 position 1, Boiler 1 position 2.", vendorIds: ["psf", "viessmann"] },
];

const fallbackWorkOrders: ServiceRecord[] = [
  { id: "wo-exterior-stain", assetId: "exterior-stain", vendorId: "elliottpaint", date: "2026-07-08", title: "Exterior stain scope tracking", status: "Monitor", priority: "High", notes: "Track semi-transparent vs semi-solid scope, Jessica approval items, and progress photos." },
  { id: "wo-landscape-weeding", assetId: "irrigation-controller", vendorId: "peterclark", date: "2026-07-08", title: "Weekly landscaping crew — waterside beds first", status: "Scheduled", priority: "Medium", notes: "Pat manages crew. Priority: waterside beds first, then patio, courtyard, driveway, dock path, lawn edges, and other beds." },
  { id: "wo-pool-weekly", assetId: "pool-pump-pentair", vendorId: "psf", date: todayISO(), title: "Weekly pool / spa water and equipment check", status: "Open", priority: "High", notes: "Record pool/spa readings, filter pressure, equipment status, and any issues." },
  { id: "wo-weekly-dock", assetId: "craft-cobalt", vendorId: "seattleboat", date: todayISO(), title: "Weekly dock / boat / Sea-Doo check", status: "Open", priority: "Medium", notes: "Check Cobalt, Sea-Doo, lifts, dock power, water trampoline, and waterfront equipment." },
];

const fallbackProcedures: ProcedureRecord[] = [
  { id: "pool-backwash", title: "Pool Sand Filter Backwash", area: "Pool Equipment Room", priority: "High", steps: ["Record current filter pressure.", "Confirm valves are set safely for backwash.", "Backwash until water runs clear.", "Rinse after backwash.", "Return valves to normal filter operation.", "Record final pressure and issues."] },
  { id: "spa-weekly", title: "Sundance Spa Weekly Check", area: "Hot Tub / Sundance", priority: "Normal", steps: ["Check water level and temperature.", "Test sanitizer, pH, alkalinity.", "Confirm heater/circulation status.", "Clean cover and surrounding area.", "Log readings and follow-up items."] },
  { id: "weekly-routine", title: "Weekly 5-Day Routine", area: "2000", priority: "High", steps: ["Monday: trash/recycle/yard waste and clean cans.", "Tuesday: grounds/lawn/irrigation and 10 AM meeting.", "Wednesday: pool/spa/fountain/courtyard.", "Thursday: vehicles/dock/boat/Sea-Doo/recreation.", "Friday: final walkthrough/testing/updates and 9 AM meeting."] },
];

const fallbackCalendar: CalendarItem[] = [
  { id: "cal-flooring", date: "2026-07-22", title: "5 Star Flooring / Eric — Evi's room", area: "Interior", status: "Scheduled" },
  { id: "cal-friday-meeting", date: todayISO(), title: "Friday 9 AM Steve meeting", area: "2000", status: "Scheduled" },
  { id: "cal-tuesday-meeting", date: todayISO(), title: "Tuesday 10 AM Steve / Patrick meeting", area: "2000", status: "Scheduled" },
];

const fallbackParts: PartRecord[] = [
  { id: "filters-aprilaire-210", name: "Aprilaire #210 4x20x25 Filter", category: "HVAC Filters", locationId: "mechanical-room", vendorId: "amazon", quantity: 1, minQuantity: 1, status: "Low", notes: "Amazon filter record." },
  { id: "filters-mr1-16x16", name: "MR1 1x16x16 Columbia Filters", category: "HVAC Filters", locationId: "mechanical-room", assetId: "boiler-1", vendorId: "amazon", quantity: 2, minQuantity: 2, status: "In Stock", notes: "Amazon filter record." },
  { id: "filters-mr1-16x20", name: "MR1 4x16x20 Columbia Filters", category: "HVAC Filters", locationId: "mechanical-room", assetId: "boiler-1", vendorId: "amazon", quantity: 4, minQuantity: 4, status: "In Stock", notes: "Amazon filter record." },
  { id: "pool-test-reagents", name: "Taylor Pool Test Reagents", category: "Pool Testing", locationId: "pool-equipment", assetId: "pool-pump-pentair", quantity: 1, minQuantity: 1, status: "In Stock", notes: "Keep pool testing supplies stocked." },
];

const documents: DocumentRecord[] = [
  { id: "elliott-invoice-15159", title: "Elliott Paint Invoice #15159", area: "Exterior", type: "Invoice", linkedAssetId: "exterior-stain", linkedVendorId: "elliottpaint", notes: "Invoice dated 06/16/2026. Amount due $17,210.05." },
  { id: "penthouse-invoice", title: "Penthouse Drapery Invoice #176396", area: "Blinds", type: "Invoice", linkedAssetId: "blinds-lutron", linkedVendorId: "penthousedrapery", notes: "Repair one motorized roller shade; two trips and replacement drive." },
  { id: "property-map", title: "Locked Atlas Property Map", area: "Map", type: "Image", href: "/atlas-property-map.png", notes: "Fixed original property map image used by Atlas labels." },
  { id: "stain-plan", title: "2000 Exterior Stain Plan — Photo-Based Scope Summary", area: "Exterior", type: "Scope", linkedAssetId: "exterior-stain", notes: "Client-facing stain scope summary for Jessica approval." },
];

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={fieldLabelStyle}>{props.label}</span>
      {props.multiline ? (
        <textarea value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} placeholder={props.placeholder} style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} />
      ) : (
        <input value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} placeholder={props.placeholder} style={inputStyle} />
      )}
    </label>
  );
}

function SelectField<T extends string>(props: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={fieldLabelStyle}>{props.label}</span>
      <select value={props.value} onChange={(event) => props.onChange(event.currentTarget.value as T)} style={inputStyle}>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard(props: { label: string; value: string | number; detail: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={props.onClick} style={modernStatStyle}>
      <div style={statLabelStyle}>{props.label}</div>
      <div style={statValueStyle}>{props.value}</div>
      <div style={mutedSmallStyle}>{props.detail}</div>
    </button>
  );
}

function SectionHeader(props: { eyebrow: string; title: string; detail?: string; right?: React.ReactNode }) {
  return (
    <div style={sectionHeaderStyle}>
      <div>
        <div style={eyebrowStyle}>{props.eyebrow}</div>
        <h2 style={sectionTitleStyle}>{props.title}</h2>
        {props.detail ? <p style={mutedSmallStyle}>{props.detail}</p> : null}
      </div>
      {props.right ? <div style={buttonRowStyle}>{props.right}</div> : null}
    </div>
  );
}

function ListDrawerLayout(props: {
  eyebrow: string;
  title: string;
  detail?: string;
  right?: React.ReactNode;
  list: React.ReactNode;
  drawer: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <section style={sectionStyle}>
      <SectionHeader eyebrow={props.eyebrow} title={props.title} detail={props.detail} right={props.right} />
      <div style={{ ...drawerGridStyle, gridTemplateColumns: props.isMobile ? "1fr" : "minmax(320px, 430px) minmax(0, 1fr)" }}>
        <div style={listPanelStyle}>{props.list}</div>
        <div style={drawerStyle}>{props.drawer}</div>
      </div>
    </section>
  );
}

export default function AtlasPage() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState("Loading Atlas records...");
  const [logoIndex, setLogoIndex] = useState(0);
  const [mapImageOk, setMapImageOk] = useState(true);

  const [mapLabels, setMapLabels] = useState<MapLabelRecord[]>(defaultMapLabels);
  const [selectedMapLabelId, setSelectedMapLabelId] = useState(defaultMapLabels[0].id);

  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>(fallbackAssets);
  const [vendorRecords, setVendorRecords] = useState<VendorRecord[]>(fallbackVendors);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>(fallbackWorkOrders);
  const [procedureRecords, setProcedureRecords] = useState<ProcedureRecord[]>(fallbackProcedures);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(fallbackCalendar);
  const [partRecords, setPartRecords] = useState<PartRecord[]>(fallbackParts);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  const [selectedAssetId, setSelectedAssetId] = useState(fallbackAssets[0].id);
  const [selectedVendorId, setSelectedVendorId] = useState(fallbackVendors[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState(fallbackWorkOrders[0].id);
  const [selectedProcedureId, setSelectedProcedureId] = useState(fallbackProcedures[0].id);
  const [selectedCalendarId, setSelectedCalendarId] = useState(fallbackCalendar[0].id);
  const [selectedPartId, setSelectedPartId] = useState(fallbackParts[0].id);

  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState("");
  const [weatherStatus, setWeatherStatus] = useState("Loading 7-day irrigation weather...");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask Atlas about assets, vendors, map labels, work orders, calendar, weather, procedures, documents, or parts.");

  const mapRef = useRef<HTMLDivElement | null>(null);
  const draggingLabelRef = useRef<string | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 820);
    const onResize = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);

    const storedMapLabels = readStoredArray<MapLabelRecord>(storageKeys.mapLabels, defaultMapLabels).map((label) => ({
      id: label.id || uid("map"),
      label: label.label || "Map Label",
      category: label.category || "Location",
      x: clampPercent(Number(label.x)),
      y: clampPercent(Number(label.y)),
      notes: label.notes || "",
      photos: Array.isArray(label.photos) ? label.photos : [],
    }));

    const storedAssets = readStoredArray<AssetRecord>(storageKeys.assets, fallbackAssets).map(normalizeAsset);
    const storedVendors = readStoredArray<VendorRecord>(storageKeys.vendors, fallbackVendors).map(normalizeVendor);
    const storedServices = readStoredArray<ServiceRecord>(storageKeys.workOrders, fallbackWorkOrders).map(normalizeService);
    const storedProcedures = readStoredArray<ProcedureRecord>(storageKeys.procedures, fallbackProcedures).map(normalizeProcedure);
    const storedCalendar = readStoredArray<CalendarItem>(storageKeys.calendar, fallbackCalendar).map(normalizeCalendar);
    const storedParts = readStoredArray<PartRecord>(storageKeys.parts, fallbackParts).map(normalizePart);
    const storedPhotos = readStoredArray<PhotoRecord>(storageKeys.photos, []);

    setMapLabels(byLabel(storedMapLabels.length ? storedMapLabels : defaultMapLabels));
    setSelectedMapLabelId((storedMapLabels[0] ?? defaultMapLabels[0]).id);
    setAssetRecords(storedAssets.length ? byName(storedAssets) : fallbackAssets);
    setVendorRecords(storedVendors.length ? byName(storedVendors) : fallbackVendors);
    setServiceRecords(storedServices.length ? byTitle(storedServices) : fallbackWorkOrders);
    setProcedureRecords(storedProcedures.length ? byTitle(storedProcedures) : fallbackProcedures);
    setCalendarItems(storedCalendar.length ? byTitle(storedCalendar) : fallbackCalendar);
    setPartRecords(storedParts.length ? byName(storedParts) : fallbackParts);
    setPhotos(storedPhotos);
    setReady(true);

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAtlasApi() {
      try {
        const response = await fetch("/api/atlas", { cache: "no-store" });
        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const payload = (await response.json()) as AtlasApiPayload;
        if (cancelled) return;

        const apiAssets = Array.isArray(payload.assetRecords) ? payload.assetRecords : Array.isArray(payload.assets) ? payload.assets : [];
        const apiVendors = Array.isArray(payload.vendorRecords) ? payload.vendorRecords : Array.isArray(payload.vendors) ? payload.vendors : [];
        const apiServices = Array.isArray(payload.serviceRecords) ? payload.serviceRecords : Array.isArray(payload.workOrders) ? payload.workOrders : [];
        const apiProcedures = Array.isArray(payload.procedureRecords) ? payload.procedureRecords : Array.isArray(payload.procedures) ? payload.procedures : [];
        const apiCalendar = Array.isArray(payload.calendarItems) ? payload.calendarItems : Array.isArray(payload.calendar) ? payload.calendar : [];
        const apiPhotos = Array.isArray(payload.photos) ? payload.photos : Array.isArray(payload.assetPhotos) ? payload.assetPhotos : [];

        if (apiAssets.length) {
          const next = byName(apiAssets.map(normalizeAsset));
          setAssetRecords(next);
          setSelectedAssetId((current) => next.find((item) => item.id === current)?.id ?? next[0].id);
        }

        if (apiVendors.length) {
          const next = byName(apiVendors.map(normalizeVendor));
          setVendorRecords(next);
          setSelectedVendorId((current) => next.find((item) => item.id === current)?.id ?? next[0].id);
        }

        if (apiServices.length) {
          const next = byTitle(apiServices.map(normalizeService));
          setServiceRecords(next);
          setSelectedServiceId((current) => next.find((item) => item.id === current)?.id ?? next[0].id);
        }

        if (apiProcedures.length) {
          const next = byTitle(apiProcedures.map(normalizeProcedure));
          setProcedureRecords(next);
          setSelectedProcedureId((current) => next.find((item) => item.id === current)?.id ?? next[0].id);
        }

        if (apiCalendar.length) {
          const next = byTitle(apiCalendar.map(normalizeCalendar));
          setCalendarItems(next);
          setSelectedCalendarId((current) => next.find((item) => item.id === current)?.id ?? next[0].id);
        }

        if (apiPhotos.length) setPhotos(apiPhotos);

        setDatabaseStatus(`Atlas loaded: ${apiAssets.length || assetRecords.length} assets, ${apiVendors.length || vendorRecords.length} vendors, ${apiServices.length || serviceRecords.length} work orders.`);
      } catch {
        if (!cancelled) setDatabaseStatus("Using saved browser records / fallback records. /api/atlas did not load.");
      }
    }

    void loadAtlasApi();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadWeather();
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.mapLabels[0], mapLabels);
  }, [ready, mapLabels]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.assets[0], assetRecords);
  }, [ready, assetRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.vendors[0], vendorRecords);
  }, [ready, vendorRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.workOrders[0], serviceRecords);
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.procedures[0], procedureRecords);
  }, [ready, procedureRecords]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.calendar[0], calendarItems);
  }, [ready, calendarItems]);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.parts[0], partRecords);
  }, [ready, partRecords]);

  function byLabel(records: MapLabelRecord[]) {
    return [...records].sort((a, b) => a.label.localeCompare(b.label));
  }

  function locationName(id?: string) {
    return locations.find((location) => location.id === id)?.name ?? "General";
  }

  function vendorName(id?: string) {
    return vendorRecords.find((vendor) => vendor.id === id)?.name ?? "No vendor";
  }

  function assetName(id?: string) {
    return assetRecords.find((asset) => asset.id === id)?.name ?? "No asset";
  }

  const selectedMapLabel = mapLabels.find((label) => label.id === selectedMapLabelId) ?? mapLabels[0] ?? defaultMapLabels[0];
  const selectedAsset = assetRecords.find((asset) => asset.id === selectedAssetId) ?? assetRecords[0] ?? normalizeAsset({});
  const selectedVendor = vendorRecords.find((vendor) => vendor.id === selectedVendorId) ?? vendorRecords[0] ?? normalizeVendor({});
  const selectedService = serviceRecords.find((service) => service.id === selectedServiceId) ?? serviceRecords[0] ?? normalizeService({});
  const selectedProcedure = procedureRecords.find((procedure) => procedure.id === selectedProcedureId) ?? procedureRecords[0] ?? normalizeProcedure({});
  const selectedCalendar = calendarItems.find((item) => item.id === selectedCalendarId) ?? calendarItems[0] ?? normalizeCalendar({});
  const selectedPart = partRecords.find((part) => part.id === selectedPartId) ?? partRecords[0] ?? normalizePart({});
  const selectedAssetPhotos = photos.filter((photo) => photo.assetId === selectedAsset.id);
  const selectedWeather = weatherDays.find((day) => day.date === selectedWeatherDate) ?? weatherDays[0];

  const q = query.trim().toLowerCase();

  const filteredLocations = useMemo(() => {
    const sorted = [...locations].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((item) => [item.name, item.type, item.zone, item.notes].join(" ").toLowerCase().includes(q));
  }, [q]);

  const filteredMapLabels = useMemo(() => {
    const sorted = byLabel(mapLabels);
    if (!q) return sorted;
    return sorted.filter((item) => [item.label, item.category, item.notes].join(" ").toLowerCase().includes(q));
  }, [q, mapLabels]);

  const filteredAssets = useMemo(() => {
    const sorted = byName(assetRecords);
    if (!q) return sorted;
    return sorted.filter((item) => [item.name, item.category, item.status, item.make, item.model, item.serial, item.notes, locationName(item.locationId), item.vendorIds.map(vendorName).join(" ")].join(" ").toLowerCase().includes(q));
  }, [q, assetRecords, vendorRecords]);

  const filteredVendors = useMemo(() => {
    const sorted = byName(vendorRecords);
    if (!q) return sorted;
    return sorted.filter((item) => [item.name, item.category, item.phone, item.email, item.website, item.notes].join(" ").toLowerCase().includes(q));
  }, [q, vendorRecords]);

  const filteredServices = useMemo(() => {
    const sorted = byTitle(serviceRecords);
    if (!q) return sorted;
    return sorted.filter((item) => [item.title, item.status, item.priority, item.date, item.followUpDate, item.notes, assetName(item.assetId), vendorName(item.vendorId)].join(" ").toLowerCase().includes(q));
  }, [q, serviceRecords, assetRecords, vendorRecords]);

  const filteredProcedures = useMemo(() => {
    const sorted = byTitle(procedureRecords);
    if (!q) return sorted;
    return sorted.filter((item) => [item.title, item.area, item.priority, item.steps.join(" ")].join(" ").toLowerCase().includes(q));
  }, [q, procedureRecords]);

  const filteredCalendar = useMemo(() => {
    const sorted = byTitle(calendarItems);
    if (!q) return sorted;
    return sorted.filter((item) => [item.title, item.area, item.status, item.date].join(" ").toLowerCase().includes(q));
  }, [q, calendarItems]);

  const filteredParts = useMemo(() => {
    const sorted = byName(partRecords);
    if (!q) return sorted;
    return sorted.filter((item) => [item.name, item.category, item.status, item.notes, locationName(item.locationId), assetName(item.assetId), vendorName(item.vendorId)].join(" ").toLowerCase().includes(q));
  }, [q, partRecords, assetRecords, vendorRecords]);

  const searchResults = useMemo(() => {
    if (!q) return [];
    return buildSearchIndex().filter((item) => [item.type, item.title, item.subtitle, item.detail].join(" ").toLowerCase().includes(q)).slice(0, 12);
  }, [q, mapLabels, assetRecords, vendorRecords, serviceRecords, procedureRecords, calendarItems, partRecords]);

  const monthCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { key: string; date?: string; day?: number; outside?: boolean }[] = [];

    for (let i = 0; i < startDay; i += 1) cells.push({ key: `blank-${i}`, outside: true });

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const iso = date.toISOString().slice(0, 10);
      cells.push({ key: iso, date: iso, day });
    }

    while (cells.length % 7 !== 0) cells.push({ key: `end-${cells.length}`, outside: true });
    return cells;
  }, [calendarCursor]);

  function buildSearchIndex(): SearchResult[] {
    return [
      ...locations.map((item) => ({ id: `location-${item.id}`, type: "Location", title: item.name, subtitle: `${item.type} · ${item.zone}`, detail: item.notes, screen: "locations" as Screen })),
      ...mapLabels.map((item) => ({ id: `map-${item.id}`, type: "Map Label", title: item.label, subtitle: item.category, detail: item.notes, screen: "map" as Screen, mapLabelId: item.id })),
      ...assetRecords.map((item) => ({ id: `asset-${item.id}`, type: "Asset", title: item.name, subtitle: `${item.category} · ${locationName(item.locationId)} · ${item.status}`, detail: [item.make, item.model, item.serial, item.notes].join(" "), screen: "assets" as Screen, assetId: item.id })),
      ...vendorRecords.map((item) => ({ id: `vendor-${item.id}`, type: "Vendor", title: item.name, subtitle: item.category, detail: [item.phone, item.email, item.website, item.notes].join(" "), screen: "vendors" as Screen, vendorId: item.id })),
      ...serviceRecords.map((item) => ({ id: `wo-${item.id}`, type: "Work Order", title: item.title, subtitle: `${formatDate(item.date)} · ${item.status} · ${item.priority ?? "Medium"}`, detail: `${assetName(item.assetId)} ${vendorName(item.vendorId)} ${item.notes}`, screen: "history" as Screen, serviceId: item.id })),
      ...procedureRecords.map((item) => ({ id: `procedure-${item.id}`, type: "Procedure", title: item.title, subtitle: `${item.area} · ${item.priority}`, detail: item.steps.join(" "), screen: "procedures" as Screen, procedureId: item.id })),
      ...calendarItems.map((item) => ({ id: `calendar-${item.id}`, type: "Calendar", title: item.title, subtitle: `${formatDate(item.date)} · ${item.area}`, detail: item.status, screen: "calendar" as Screen, calendarId: item.id })),
      ...partRecords.map((item) => ({ id: `part-${item.id}`, type: "Part", title: item.name, subtitle: `${item.category} · Qty ${item.quantity}`, detail: item.notes, screen: "parts" as Screen, partId: item.id })),
    ];
  }

  function openSearchResult(result: SearchResult) {
    if (result.assetId) setSelectedAssetId(result.assetId);
    if (result.vendorId) setSelectedVendorId(result.vendorId);
    if (result.serviceId) setSelectedServiceId(result.serviceId);
    if (result.mapLabelId) setSelectedMapLabelId(result.mapLabelId);
    if (result.procedureId) setSelectedProcedureId(result.procedureId);
    if (result.calendarId) setSelectedCalendarId(result.calendarId);
    if (result.partId) setSelectedPartId(result.partId);
    setScreen(result.screen);
    setQuery("");
  }

  async function loadWeather() {
    try {
      setWeatherStatus("Loading 7-day irrigation weather...");
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=47.60&longitude=-122.20&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,et0_fao_evapotranspiration&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FLos_Angeles&forecast_days=7";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Weather failed");
      const data = await response.json();

      const days: WeatherDay[] = data.daily.time.map((date: string, index: number) => ({
        date,
        code: Number(data.daily.weather_code[index] ?? 0),
        high: Math.round(Number(data.daily.temperature_2m_max[index] ?? 0)),
        low: Math.round(Number(data.daily.temperature_2m_min[index] ?? 0)),
        precipChance: Math.round(Number(data.daily.precipitation_probability_max[index] ?? 0)),
        precipAmount: Number(Number(data.daily.precipitation_sum[index] ?? 0).toFixed(2)),
        windMax: Math.round(Number(data.daily.wind_speed_10m_max[index] ?? 0)),
        et0: Number(Number(data.daily.et0_fao_evapotranspiration[index] ?? 0).toFixed(2)),
      }));

      setWeatherDays(days);
      setSelectedWeatherDate((current) => current || days[0]?.date || "");
      setWeatherStatus("7-day weather loaded for irrigation and yard planning.");
    } catch {
      setWeatherStatus("Weather did not load. Check internet access from the deployed site.");
    }
  }

  async function postAtlasRecord(table: AtlasTable, record: unknown) {
    try {
      await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, record }),
      });
      setDatabaseStatus("Saved to Atlas API.");
    } catch {
      setDatabaseStatus("Saved in browser. Atlas API save did not complete.");
    }
  }

  function addAsset() {
    const record = normalizeAsset({ id: uid("asset"), name: "New Asset", locationId: "general", category: "General", status: "Monitor", notes: "" });
    setAssetRecords((current) => byName([record, ...current]));
    setSelectedAssetId(record.id);
    setScreen("assets");
  }

  function updateAsset(patch: Partial<AssetRecord>) {
    setAssetRecords((current) => byName(current.map((item) => (item.id === selectedAsset.id ? normalizeAsset({ ...item, ...patch }) : item))));
  }

  function addVendor() {
    const record = normalizeVendor({ id: uid("vendor"), name: "New Vendor", category: "General", notes: "" });
    setVendorRecords((current) => byName([record, ...current]));
    setSelectedVendorId(record.id);
    setScreen("vendors");
  }

  function updateVendor(patch: Partial<VendorRecord>) {
    setVendorRecords((current) => byName(current.map((item) => (item.id === selectedVendor.id ? normalizeVendor({ ...item, ...patch }) : item))));
  }

  function addWorkOrder() {
    const record = normalizeService({ id: uid("wo"), title: "New Work Order", date: todayISO(), status: "Open", priority: "Medium", notes: "", assetId: selectedAsset.id });
    setServiceRecords((current) => byTitle([record, ...current]));
    setSelectedServiceId(record.id);
    setScreen("history");
  }

  function updateWorkOrder(patch: Partial<ServiceRecord>) {
    setServiceRecords((current) => byTitle(current.map((item) => (item.id === selectedService.id ? normalizeService({ ...item, ...patch }) : item))));
  }

  function addCalendarItem(date?: string) {
    const record = normalizeCalendar({ id: uid("cal"), title: "New Calendar Item", date: date || todayISO(), area: "2000", status: "Scheduled" });
    setCalendarItems((current) => byTitle([record, ...current]));
    setSelectedCalendarId(record.id);
    setScreen("calendar");
  }

  function updateCalendarItem(patch: Partial<CalendarItem>) {
    setCalendarItems((current) => byTitle(current.map((item) => (item.id === selectedCalendar.id ? normalizeCalendar({ ...item, ...patch }) : item))));
  }

  function updateProcedure(patch: Partial<ProcedureRecord>) {
    setProcedureRecords((current) => byTitle(current.map((item) => (item.id === selectedProcedure.id ? normalizeProcedure({ ...item, ...patch }) : item))));
  }

  function updatePart(patch: Partial<PartRecord>) {
    setPartRecords((current) => byName(current.map((item) => (item.id === selectedPart.id ? normalizePart({ ...item, ...patch }) : item))));
  }

  function addMapLabel() {
    const record: MapLabelRecord = { id: uid("map"), label: "New Label", category: "Location", x: 50, y: 50, notes: "", photos: [] };
    setMapLabels((current) => byLabel([...current, record]));
    setSelectedMapLabelId(record.id);
  }

  function resetMapLabels() {
    setMapLabels(defaultMapLabels);
    setSelectedMapLabelId(defaultMapLabels[0].id);
  }

  function updateSelectedMapLabel(patch: Partial<MapLabelRecord>) {
    setMapLabels((current) =>
      byLabel(
        current.map((label) =>
          label.id === selectedMapLabel.id
            ? {
                ...label,
                ...patch,
                x: patch.x === undefined ? label.x : clampPercent(Number(patch.x)),
                y: patch.y === undefined ? label.y : clampPercent(Number(patch.y)),
                photos: patch.photos ?? label.photos ?? [],
              }
            : label
        )
      )
    );
  }

  function handleMapLabelPointerDown(event: React.PointerEvent<HTMLButtonElement>, labelId: string) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingLabelRef.current = labelId;
    setSelectedMapLabelId(labelId);
  }

  function handleMapPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingLabelRef.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    const id = draggingLabelRef.current;
    setMapLabels((current) => current.map((label) => (label.id === id ? { ...label, x, y } : label)));
  }

  function stopMapDrag() {
    draggingLabelRef.current = null;
  }

  function moveCalendarMonth(delta: number) {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function askAtlas() {
    const text = assistantQuestion.trim().toLowerCase();

    if (!text) {
      setAssistantAnswer("Type a question first.");
      return;
    }

    if (text.includes("weather") || text.includes("irrigation")) {
      setAssistantAnswer(weatherStatus);
      return;
    }

    if (text.includes("map")) {
      setAssistantAnswer(`The map is locked to /atlas-property-map.png and has ${mapLabels.length} movable labels. Use Reset Map to restore the saved label layout.`);
      return;
    }

    if (text.includes("asset") || text.includes("equipment")) {
      setAssistantAnswer(`Atlas currently has ${assetRecords.length} asset records loaded. Open Assets to review/edit them in A–Z list form.`);
      return;
    }

    if (text.includes("vendor")) {
      setAssistantAnswer(`Atlas currently has ${vendorRecords.length} vendors loaded. Open Vendors to review/edit them in A–Z list form.`);
      return;
    }

    if (text.includes("work") || text.includes("order") || text.includes("service")) {
      setAssistantAnswer(`Atlas currently has ${serviceRecords.length} work orders/service records loaded. Open Work Orders to review them.`);
      return;
    }

    setAssistantAnswer(`Loaded now: ${assetRecords.length} assets, ${vendorRecords.length} vendors, ${serviceRecords.length} work orders, ${procedureRecords.length} procedures, ${calendarItems.length} calendar items, ${partRecords.length} parts, and ${mapLabels.length} map labels.`);
  }

  function renderDashboard() {
    const openWorkOrders = serviceRecords.filter((record) => record.status !== "Completed");
    const highPriority = serviceRecords.filter((record) => record.priority === "High" && record.status !== "Completed");
    const monitoredAssets = assetRecords.filter((record) => record.status === "Monitor" || record.status === "Offline");
    const rainDays = weatherDays.filter((day) => day.precipChance >= 45 || day.precipAmount >= 0.1);
    const nextWeather = weatherDays[0];

    return (
      <div style={stackStyle}>
        <section style={heroStyle}>
          <div>
            <div style={eyebrowLightStyle}>Atlas / 2000</div>
            <h1 style={heroTitleStyle}>Estate Operations Dashboard</h1>
            <p style={heroTextStyle}>Modern overview for weather, irrigation, work orders, assets, vendors, calendar, and map records.</p>
          </div>
          <div style={heroPanelStyle}>
            <div style={eyebrowStyle}>System</div>
            <strong>{databaseStatus}</strong>
            <p style={mutedSmallStyle}>Logo, map, A–Z lists, right detail drawers, weather, and month calendar are restored here.</p>
          </div>
        </section>

        <div style={statGridStyle}>
          <StatCard label="Assets" value={assetRecords.length} detail={`${monitoredAssets.length} monitor/offline`} onClick={() => setScreen("assets")} />
          <StatCard label="Open Work Orders" value={openWorkOrders.length} detail={`${highPriority.length} high priority`} onClick={() => setScreen("history")} />
          <StatCard label="7-Day Weather" value={rainDays.length ? `${rainDays.length} rain risk` : "Dry window"} detail={nextWeather ? `${nextWeather.high}° / ${nextWeather.low}° · ${nextWeather.precipChance}% rain` : "Loading forecast"} onClick={() => setScreen("weather")} />
          <StatCard label="Calendar" value={calendarItems.length} detail="Editable full month" onClick={() => setScreen("calendar")} />
        </div>

        <div style={{ ...drawerGridStyle, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          <section style={sectionStyle}>
            <SectionHeader eyebrow="Weather Planning" title="Irrigation / Yard Work" right={<button type="button" onClick={() => setScreen("weather")} style={goldButtonStyle}>Open Weather</button>} />
            {nextWeather ? (
              <div style={noticeStyle}>
                <strong>{shortDay(nextWeather.date)} · {weatherText(nextWeather.code)}</strong>
                <p style={mutedSmallStyle}>{nextWeather.high}° high / {nextWeather.low}° low · {nextWeather.precipChance}% rain · {nextWeather.precipAmount}" expected · ET0 {nextWeather.et0}"</p>
                <p style={mutedSmallStyle}>{irrigationAdvice(nextWeather)}</p>
              </div>
            ) : (
              <div style={noticeStyle}>{weatherStatus}</div>
            )}
          </section>

          <section style={sectionStyle}>
            <SectionHeader eyebrow="Priority Work" title="Open Work Orders" right={<button type="button" onClick={addWorkOrder} style={goldButtonStyle}>Add WO</button>} />
            <div style={listStyle}>
              {byTitle(openWorkOrders).slice(0, 6).map((record) => (
                <button key={record.id} type="button" onClick={() => { setSelectedServiceId(record.id); setScreen("history"); }} style={rowButtonStyle}>
                  <div>
                    <strong>{record.title}</strong>
                    <p style={mutedSmallStyle}>{formatDate(record.date)} · {assetName(record.assetId)}</p>
                  </div>
                  <span style={badgeStyle(record.priority ?? "Medium")}>{record.priority ?? "Medium"}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderMap() {
    return (
      <ListDrawerLayout
        eyebrow="Locked Original Map"
        title="Property Map"
        detail="Drag labels to adjust placement. Use Reset Map to return to the saved label layout."
        isMobile={isMobile}
        right={
          <>
            <button type="button" onClick={addMapLabel} style={goldButtonStyle}>Add Label</button>
            <button type="button" onClick={resetMapLabels} style={dangerButtonStyle}>Reset Map</button>
          </>
        }
        list={
          <div>
            {!mapImageOk ? (
              <div style={{ ...noticeStyle, borderColor: "#FACACA", background: "#FEECEC", color: colors.red }}>
                Map image did not load. Confirm this file exists: <strong>public/atlas-property-map.png</strong>
              </div>
            ) : null}

            <div
              ref={mapRef}
              onPointerMove={handleMapPointerMove}
              onPointerUp={stopMapDrag}
              onPointerLeave={stopMapDrag}
              onPointerCancel={stopMapDrag}
              style={mapShellStyle}
            >
              <img
                src="/atlas-property-map.png"
                alt="Atlas property map"
                draggable={false}
                onError={() => setMapImageOk(false)}
                onLoad={() => setMapImageOk(true)}
                style={mapImageStyle}
              />

              {mapLabels.map((label) => {
                const selected = label.id === selectedMapLabel.id;
                return (
                  <button
                    key={label.id}
                    type="button"
                    onPointerDown={(event) => handleMapLabelPointerDown(event, label.id)}
                    style={{
                      ...mapPinStyle,
                      left: `${label.x}%`,
                      top: `${label.y}%`,
                      background: selected ? colors.gold : colors.navy,
                      color: selected ? colors.navy : "#FFFFFF",
                      borderColor: selected ? colors.navy : colors.gold2,
                      zIndex: selected ? 5 : 4,
                    }}
                  >
                    {label.label}
                  </button>
                );
              })}
            </div>

            <div style={{ ...listStyle, marginTop: 14 }}>
              {filteredMapLabels.map((label) => (
                <button key={label.id} type="button" onClick={() => setSelectedMapLabelId(label.id)} style={{ ...rowButtonStyle, borderColor: label.id === selectedMapLabel.id ? colors.gold : colors.line }}>
                  <div>
                    <strong>{label.label}</strong>
                    <p style={mutedSmallStyle}>{label.category}</p>
                  </div>
                  <span style={badgeStyle("Monitor")}>{label.x}% / {label.y}%</span>
                </button>
              ))}
            </div>
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Label</div>
            <h3 style={detailTitleStyle}>{selectedMapLabel.label}</h3>
            <div style={formGridStyle}>
              <Field label="Label" value={selectedMapLabel.label} onChange={(value) => updateSelectedMapLabel({ label: value })} />
              <Field label="Category" value={selectedMapLabel.category} onChange={(value) => updateSelectedMapLabel({ category: value })} />
              <Field label="X %" value={String(selectedMapLabel.x)} onChange={(value) => updateSelectedMapLabel({ x: Number(value) })} />
              <Field label="Y %" value={String(selectedMapLabel.y)} onChange={(value) => updateSelectedMapLabel({ y: Number(value) })} />
              <Field label="Notes" value={selectedMapLabel.notes} onChange={(value) => updateSelectedMapLabel({ notes: value })} multiline />
            </div>
          </>
        }
      />
    );
  }

  function renderLocations() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Locations"
        detail="All locations are sorted alphabetically with detail on the right."
        isMobile={isMobile}
        list={
          <div style={listStyle}>
            {filteredLocations.map((location) => (
              <button key={location.id} type="button" onClick={() => setQuery(location.name)} style={rowButtonStyle}>
                <div>
                  <strong>{location.name}</strong>
                  <p style={mutedSmallStyle}>{location.type} · {location.zone}</p>
                </div>
                <span style={badgeStyle("Monitor")}>{assetRecords.filter((asset) => asset.locationId === location.id).length} assets</span>
              </button>
            ))}
          </div>
        }
        drawer={
          <div>
            <div style={eyebrowStyle}>Location Info</div>
            <h3 style={detailTitleStyle}>A–Z Location List</h3>
            <p style={mutedSmallStyle}>Click any location to filter/search related Atlas records. Assets, work orders, vendors, and map labels stay in the main sections.</p>
            <div style={noticeStyle}>
              <strong>{filteredLocations.length} locations shown</strong>
              <p style={mutedSmallStyle}>Use search at the top to narrow by area, type, zone, or notes.</p>
            </div>
          </div>
        }
      />
    );
  }

  function renderAssets() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Assets"
        detail="Alphabetical asset list with editable detail drawer."
        isMobile={isMobile}
        right={<button type="button" onClick={addAsset} style={goldButtonStyle}>Add Asset</button>}
        list={
          <div style={listStyle}>
            {filteredAssets.map((asset) => (
              <button key={asset.id} type="button" onClick={() => setSelectedAssetId(asset.id)} style={{ ...rowButtonStyle, borderColor: asset.id === selectedAsset.id ? colors.gold : colors.line }}>
                <div>
                  <strong>{asset.name}</strong>
                  <p style={mutedSmallStyle}>{asset.category} · {locationName(asset.locationId)}</p>
                  <p style={mutedSmallStyle}>{[asset.make, asset.model, asset.serial].filter(Boolean).join(" · ")}</p>
                </div>
                <span style={badgeStyle(asset.status)}>{asset.status}</span>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Asset</div>
            <h3 style={detailTitleStyle}>{selectedAsset.name}</h3>
            <div style={formGridStyle}>
              <Field label="Name" value={selectedAsset.name} onChange={(value) => updateAsset({ name: value })} />
              <Field label="Category" value={selectedAsset.category} onChange={(value) => updateAsset({ category: value })} />
              <label style={{ display: "grid", gap: 6 }}>
                <span style={fieldLabelStyle}>Location</span>
                <select value={selectedAsset.locationId} onChange={(event) => updateAsset({ locationId: event.currentTarget.value })} style={inputStyle}>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <SelectField label="Status" value={selectedAsset.status} onChange={(value) => updateAsset({ status: value })} options={["Online", "Offline", "Seasonal", "Monitor"] as const} />
              <Field label="Make" value={selectedAsset.make ?? ""} onChange={(value) => updateAsset({ make: value })} />
              <Field label="Model" value={selectedAsset.model ?? ""} onChange={(value) => updateAsset({ model: value })} />
              <Field label="Serial / VIN / HIN" value={selectedAsset.serial ?? ""} onChange={(value) => updateAsset({ serial: value })} />
              <Field label="Vendor IDs" value={selectedAsset.vendorIds.join(", ")} onChange={(value) => updateAsset({ vendorIds: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
              <Field label="Notes" value={selectedAsset.notes} onChange={(value) => updateAsset({ notes: value })} multiline />
            </div>

            <div style={buttonRowStyle}>
              <button type="button" onClick={() => void postAtlasRecord("assets", selectedAsset)} style={goldButtonStyle}>Save Asset</button>
              <button type="button" onClick={addWorkOrder} style={secondaryButtonStyle}>Create WO</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={eyebrowStyle}>Photos</div>
              {selectedAssetPhotos.length ? (
                <div style={photoGridStyle}>
                  {selectedAssetPhotos.map((photo) => (
                    <div key={photo.id} style={photoCardStyle}>
                      {photo.dataUrl || photo.url ? <img src={photo.dataUrl || photo.url} alt={photo.name} style={photoStyle} /> : null}
                      <strong>{photo.name}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={mutedSmallStyle}>No photos attached to this asset in the loaded records.</p>
              )}
            </div>
          </>
        }
      />
    );
  }

  function renderVendors() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Vendors"
        detail="Alphabetical vendor directory with editable right-side detail."
        isMobile={isMobile}
        right={<button type="button" onClick={addVendor} style={goldButtonStyle}>Add Vendor</button>}
        list={
          <div style={listStyle}>
            {filteredVendors.map((vendor) => (
              <button key={vendor.id} type="button" onClick={() => setSelectedVendorId(vendor.id)} style={{ ...rowButtonStyle, borderColor: vendor.id === selectedVendor.id ? colors.gold : colors.line }}>
                <div>
                  <strong>{vendor.name}</strong>
                  <p style={mutedSmallStyle}>{vendor.category}</p>
                  <p style={mutedSmallStyle}>{[vendor.phone, vendor.email].filter(Boolean).join(" · ")}</p>
                </div>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Vendor</div>
            <h3 style={detailTitleStyle}>{selectedVendor.name}</h3>
            <div style={formGridStyle}>
              <Field label="Name" value={selectedVendor.name} onChange={(value) => setVendorRecords((current) => byName(current.map((item) => item.id === selectedVendor.id ? normalizeVendor({ ...item, name: value }) : item)))} />
              <Field label="Category" value={selectedVendor.category} onChange={(value) => setVendorRecords((current) => byName(current.map((item) => item.id === selectedVendor.id ? normalizeVendor({ ...item, category: value }) : item)))} />
              <Field label="Phone" value={selectedVendor.phone ?? ""} onChange={(value) => updateVendor({ phone: value })} />
              <Field label="Email" value={selectedVendor.email ?? ""} onChange={(value) => updateVendor({ email: value })} />
              <Field label="Website" value={selectedVendor.website ?? ""} onChange={(value) => updateVendor({ website: value })} />
              <Field label="Notes" value={selectedVendor.notes} onChange={(value) => updateVendor({ notes: value })} multiline />
            </div>
            <button type="button" onClick={() => void postAtlasRecord("vendors", selectedVendor)} style={goldButtonStyle}>Save Vendor</button>
          </>
        }
      />
    );
  }

  function renderWorkOrders() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Work Orders"
        detail="Work orders are listed alphabetically with editable status, date, asset, vendor, and notes."
        isMobile={isMobile}
        right={<button type="button" onClick={addWorkOrder} style={goldButtonStyle}>Add Work Order</button>}
        list={
          <div style={listStyle}>
            {filteredServices.map((record) => (
              <button key={record.id} type="button" onClick={() => setSelectedServiceId(record.id)} style={{ ...rowButtonStyle, borderColor: record.id === selectedService.id ? colors.gold : colors.line }}>
                <div>
                  <strong>{record.title}</strong>
                  <p style={mutedSmallStyle}>{formatDate(record.date)} · {assetName(record.assetId)} · {vendorName(record.vendorId)}</p>
                </div>
                <span style={badgeStyle(record.status)}>{record.status}</span>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Work Order</div>
            <h3 style={detailTitleStyle}>{selectedService.title}</h3>
            <div style={formGridStyle}>
              <Field label="Title" value={selectedService.title} onChange={(value) => updateWorkOrder({ title: value })} />
              <Field label="Date" value={selectedService.date} onChange={(value) => updateWorkOrder({ date: value })} />
              <label style={{ display: "grid", gap: 6 }}>
                <span style={fieldLabelStyle}>Asset</span>
                <select value={selectedService.assetId} onChange={(event) => updateWorkOrder({ assetId: event.currentTarget.value })} style={inputStyle}>
                  <option value="">No asset</option>
                  {byName(assetRecords).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={fieldLabelStyle}>Vendor</span>
                <select value={selectedService.vendorId ?? ""} onChange={(event) => updateWorkOrder({ vendorId: event.currentTarget.value })} style={inputStyle}>
                  <option value="">No vendor</option>
                  {byName(vendorRecords).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
              </label>
              <SelectField label="Status" value={selectedService.status} onChange={(value) => updateWorkOrder({ status: value })} options={["Open", "Scheduled", "Completed", "Monitor"] as const} />
              <SelectField label="Priority" value={selectedService.priority ?? "Medium"} onChange={(value) => updateWorkOrder({ priority: value })} options={["Low", "Medium", "High"] as const} />
              <Field label="Follow-up Date" value={selectedService.followUpDate ?? ""} onChange={(value) => updateWorkOrder({ followUpDate: value })} />
              <Field label="Notes" value={selectedService.notes} onChange={(value) => updateWorkOrder({ notes: value })} multiline />
            </div>
            <button type="button" onClick={() => void postAtlasRecord("work_orders", selectedService)} style={goldButtonStyle}>Save Work Order</button>
          </>
        }
      />
    );
  }

  function renderCalendar() {
    return (
      <ListDrawerLayout
        eyebrow="Editable Month View"
        title="Calendar"
        detail="Click a date to add an item. Edit the selected item in the right drawer."
        isMobile={isMobile}
        right={
          <>
            <button type="button" onClick={() => moveCalendarMonth(-1)} style={secondaryButtonStyle}>Previous</button>
            <button type="button" onClick={() => setCalendarCursor(new Date())} style={secondaryButtonStyle}>Today</button>
            <button type="button" onClick={() => moveCalendarMonth(1)} style={secondaryButtonStyle}>Next</button>
            <button type="button" onClick={() => addCalendarItem()} style={goldButtonStyle}>Add Event</button>
          </>
        }
        list={
          <div style={stackStyle}>
            <div style={calendarHeaderStyle}>{monthName(calendarCursor)}</div>
            <div style={calendarWeekStyle}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} style={calendarDayNameStyle}>{day}</div>
              ))}
            </div>
            <div style={calendarGridStyle}>
              {monthCells.map((cell) => {
                const events = cell.date ? calendarItems.filter((item) => item.date === cell.date) : [];
                const isToday = cell.date === todayISO();
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!cell.date}
                    onClick={() => cell.date && addCalendarItem(cell.date)}
                    style={{
                      ...calendarCellStyle,
                      opacity: cell.outside ? 0.25 : 1,
                      borderColor: isToday ? colors.gold : colors.line,
                      background: isToday ? "#FFFAEB" : "#FFFFFF",
                    }}
                  >
                    <strong>{cell.day ?? ""}</strong>
                    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                      {events.slice(0, 3).map((event) => (
                        <span key={event.id} onClick={(mouseEvent) => { mouseEvent.stopPropagation(); setSelectedCalendarId(event.id); }} style={calendarPillStyle}>
                          {event.title}
                        </span>
                      ))}
                      {events.length > 3 ? <span style={calendarMoreStyle}>+{events.length - 3} more</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={listStyle}>
              <div style={eyebrowStyle}>A–Z Event List</div>
              {filteredCalendar.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedCalendarId(item.id)} style={{ ...rowButtonStyle, borderColor: item.id === selectedCalendar.id ? colors.gold : colors.line }}>
                  <div>
                    <strong>{item.title}</strong>
                    <p style={mutedSmallStyle}>{formatDate(item.date)} · {item.area}</p>
                  </div>
                  <span style={badgeStyle(item.status)}>{item.status}</span>
                </button>
              ))}
            </div>
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Calendar Item</div>
            <h3 style={detailTitleStyle}>{selectedCalendar.title}</h3>
            <div style={formGridStyle}>
              <Field label="Title" value={selectedCalendar.title} onChange={(value) => updateCalendarItem({ title: value })} />
              <Field label="Date" value={selectedCalendar.date} onChange={(value) => updateCalendarItem({ date: value })} />
              <Field label="Area" value={selectedCalendar.area} onChange={(value) => updateCalendarItem({ area: value })} />
              <SelectField label="Status" value={selectedCalendar.status} onChange={(value) => updateCalendarItem({ status: value })} options={["Open", "Scheduled", "Completed", "Monitor"] as const} />
            </div>
            <button type="button" onClick={() => void postAtlasRecord("calendar", selectedCalendar)} style={goldButtonStyle}>Save Calendar Item</button>
          </>
        }
      />
    );
  }

  function renderWeather() {
    return (
      <ListDrawerLayout
        eyebrow="7-Day Forecast"
        title="Weather / Irrigation Planning"
        detail="Built for irrigation decisions, yard work, rain risk, ET0, wind, and planning."
        isMobile={isMobile}
        right={<button type="button" onClick={() => void loadWeather()} style={goldButtonStyle}>Refresh Weather</button>}
        list={
          <div style={listStyle}>
            <div style={noticeStyle}>
              <strong>{weatherStatus}</strong>
              <p style={mutedSmallStyle}>Forecast location is the 2000 area. Uses rain chance, rain amount, wind, and ET0 for irrigation planning.</p>
            </div>

            {weatherDays.map((day) => (
              <button key={day.date} type="button" onClick={() => setSelectedWeatherDate(day.date)} style={{ ...rowButtonStyle, borderColor: day.date === selectedWeather?.date ? colors.gold : colors.line }}>
                <div>
                  <strong>{shortDay(day.date)} · {weatherText(day.code)}</strong>
                  <p style={mutedSmallStyle}>{day.high}° / {day.low}° · Rain {day.precipChance}% · {day.precipAmount}" · Wind {day.windMax} mph</p>
                  <p style={mutedSmallStyle}>{irrigationAdvice(day)}</p>
                </div>
                <span style={badgeStyle(day.precipChance >= 45 ? "Monitor" : "Online")}>{day.precipChance}%</span>
              </button>
            ))}
          </div>
        }
        drawer={
          selectedWeather ? (
            <>
              <div style={eyebrowStyle}>Selected Forecast</div>
              <h3 style={detailTitleStyle}>{shortDay(selectedWeather.date)}</h3>
              <div style={weatherMetricGridStyle}>
                <div style={weatherMetricStyle}><span>High</span><strong>{selectedWeather.high}°</strong></div>
                <div style={weatherMetricStyle}><span>Low</span><strong>{selectedWeather.low}°</strong></div>
                <div style={weatherMetricStyle}><span>Rain</span><strong>{selectedWeather.precipChance}%</strong></div>
                <div style={weatherMetricStyle}><span>Amount</span><strong>{selectedWeather.precipAmount}"</strong></div>
                <div style={weatherMetricStyle}><span>Wind</span><strong>{selectedWeather.windMax} mph</strong></div>
                <div style={weatherMetricStyle}><span>ET0</span><strong>{selectedWeather.et0}"</strong></div>
              </div>
              <div style={{ ...noticeStyle, marginTop: 14 }}>
                <strong>Irrigation / Yard Work Recommendation</strong>
                <p style={mutedSmallStyle}>{irrigationAdvice(selectedWeather)}</p>
              </div>
            </>
          ) : (
            <div style={noticeStyle}>Weather is loading.</div>
          )
        }
      />
    );
  }

  function renderDocuments() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Documents / Photos"
        detail="Document records and loaded photos sorted for review."
        isMobile={isMobile}
        list={
          <div style={listStyle}>
            {[...documents].sort((a, b) => a.title.localeCompare(b.title)).map((document) => (
              <div key={document.id} style={rowStaticStyle}>
                <div>
                  <strong>{document.title}</strong>
                  <p style={mutedSmallStyle}>{document.type} · {document.area}</p>
                  <p style={mutedSmallStyle}>{document.notes}</p>
                  {document.href ? <a href={document.href} style={linkStyle}>Open</a> : null}
                </div>
              </div>
            ))}
          </div>
        }
        drawer={
          <div>
            <div style={eyebrowStyle}>Document Info</div>
            <h3 style={detailTitleStyle}>Photos / Documents</h3>
            <p style={mutedSmallStyle}>{documents.length} document records and {photos.length} loaded photo records.</p>
            <div style={photoGridStyle}>
              {photos.slice(0, 8).map((photo) => (
                <div key={photo.id} style={photoCardStyle}>
                  {photo.dataUrl || photo.url ? <img src={photo.dataUrl || photo.url} alt={photo.name} style={photoStyle} /> : null}
                  <strong>{photo.name}</strong>
                  <p style={mutedSmallStyle}>{assetName(photo.assetId)}</p>
                </div>
              ))}
            </div>
          </div>
        }
      />
    );
  }

  function renderProcedures() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Procedures"
        detail="Procedure list with editable steps in the right drawer."
        isMobile={isMobile}
        list={
          <div style={listStyle}>
            {filteredProcedures.map((procedure) => (
              <button key={procedure.id} type="button" onClick={() => setSelectedProcedureId(procedure.id)} style={{ ...rowButtonStyle, borderColor: procedure.id === selectedProcedure.id ? colors.gold : colors.line }}>
                <div>
                  <strong>{procedure.title}</strong>
                  <p style={mutedSmallStyle}>{procedure.area} · {procedure.steps.length} steps</p>
                </div>
                <span style={badgeStyle(procedure.priority)}>{procedure.priority}</span>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Procedure</div>
            <h3 style={detailTitleStyle}>{selectedProcedure.title}</h3>
            <div style={formGridStyle}>
              <Field label="Title" value={selectedProcedure.title} onChange={(value) => updateProcedure({ title: value })} />
              <Field label="Area" value={selectedProcedure.area} onChange={(value) => updateProcedure({ area: value })} />
              <SelectField label="Priority" value={selectedProcedure.priority} onChange={(value) => updateProcedure({ priority: value })} options={["High", "Normal", "Seasonal"] as const} />
              <Field label="Steps, one per line" value={selectedProcedure.steps.join("\n")} onChange={(value) => updateProcedure({ steps: value.split("\n").map((item) => item.trim()).filter(Boolean) })} multiline />
            </div>
            <button type="button" onClick={() => void postAtlasRecord("procedures", selectedProcedure)} style={goldButtonStyle}>Save Procedure</button>
          </>
        }
      />
    );
  }

  function renderParts() {
    return (
      <ListDrawerLayout
        eyebrow="A–Z List"
        title="Parts"
        detail="Alphabetical inventory list with quantity and reorder status."
        isMobile={isMobile}
        list={
          <div style={listStyle}>
            {filteredParts.map((part) => (
              <button key={part.id} type="button" onClick={() => setSelectedPartId(part.id)} style={{ ...rowButtonStyle, borderColor: part.id === selectedPart.id ? colors.gold : colors.line }}>
                <div>
                  <strong>{part.name}</strong>
                  <p style={mutedSmallStyle}>{part.category} · Qty {part.quantity} / Min {part.minQuantity}</p>
                </div>
                <span style={badgeStyle(part.status)}>{part.status}</span>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Part</div>
            <h3 style={detailTitleStyle}>{selectedPart.name}</h3>
            <div style={formGridStyle}>
              <Field label="Name" value={selectedPart.name} onChange={(value) => updatePart({ name: value })} />
              <Field label="Category" value={selectedPart.category} onChange={(value) => updatePart({ category: value })} />
              <Field label="Quantity" value={String(selectedPart.quantity)} onChange={(value) => updatePart({ quantity: Number(value) })} />
              <Field label="Minimum Quantity" value={String(selectedPart.minQuantity)} onChange={(value) => updatePart({ minQuantity: Number(value) })} />
              <SelectField label="Status" value={selectedPart.status} onChange={(value) => updatePart({ status: value })} options={["In Stock", "Low", "Out", "Order"] as const} />
              <Field label="Notes" value={selectedPart.notes} onChange={(value) => updatePart({ notes: value })} multiline />
            </div>
          </>
        }
      />
    );
  }

  function renderAssistant() {
    return (
      <section style={sectionStyle}>
        <SectionHeader eyebrow="Ask Atlas" title="Property Assistant" detail="Quick local assistant tied to loaded Atlas records." />
        <div style={stackStyle}>
          <textarea
            value={assistantQuestion}
            onChange={(event) => setAssistantQuestion(event.currentTarget.value)}
            placeholder="Ask about assets, vendors, work orders, map, weather, database, or records..."
            style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
          />
          <button type="button" onClick={askAtlas} style={goldButtonStyle}>Ask Atlas</button>
          <div style={noticeStyle}>{assistantAnswer}</div>
        </div>
      </section>
    );
  }

  function renderScreen() {
    if (screen === "dashboard") return renderDashboard();
    if (screen === "map") return renderMap();
    if (screen === "locations") return renderLocations();
    if (screen === "assets") return renderAssets();
    if (screen === "history") return renderWorkOrders();
    if (screen === "vendors") return renderVendors();
    if (screen === "calendar") return renderCalendar();
    if (screen === "weather") return renderWeather();
    if (screen === "documents") return renderDocuments();
    if (screen === "procedures") return renderProcedures();
    if (screen === "parts") return renderParts();
    return renderAssistant();
  }

  return (
    <main style={appStyle}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", minHeight: "100vh" }}>
        <aside style={sidebarStyle}>
          <div style={brandStyle}>
            <div style={logoBoxStyle}>
              {logoIndex < logoCandidates.length ? (
                <img
                  src={logoCandidates[logoIndex]}
                  alt="Atlas logo"
                  onError={() => setLogoIndex((index) => index + 1)}
                  style={logoImageStyle}
                />
              ) : (
                <span style={logoFallbackStyle}>A</span>
              )}
            </div>
            <div>
              <div style={brandTitleStyle}>ATLAS</div>
              <div style={brandSubStyle}>2000 Estate System</div>
            </div>
          </div>

          <nav style={{ display: "grid", gap: 8, gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
            {screens.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScreen(item.id)}
                style={{
                  ...navButtonStyle,
                  borderColor: screen === item.id ? colors.gold : "rgba(255,255,255,0.12)",
                  background: screen === item.id ? "rgba(201,154,61,0.18)" : "rgba(255,255,255,0.04)",
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section style={{ minWidth: 0 }}>
          <header style={topbarStyle}>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 14, justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center" }}>
              <div>
                <div style={eyebrowStyle}>Atlas / 2000</div>
                <h1 style={pageTitleStyle}>{screens.find((item) => item.id === screen)?.label}</h1>
              </div>

              <div style={{ position: "relative", width: isMobile ? "100%" : 460, maxWidth: "100%" }}>
                <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search Atlas..." style={{ ...inputStyle, width: "100%" }} />
                {searchResults.length ? (
                  <div style={searchDropStyle}>
                    {searchResults.map((result) => (
                      <button key={result.id} type="button" onClick={() => openSearchResult(result)} style={searchResultStyle}>
                        <strong>{result.title}</strong>
                        <span style={mutedSmallStyle}>{result.type} · {result.subtitle}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div style={{ padding: isMobile ? 14 : 24 }}>{renderScreen()}</div>
        </section>
      </div>
    </main>
  );
}

const appStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  color: colors.text,
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const sidebarStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navy2} 100%)`,
  color: "#FFFFFF",
  padding: 20,
  position: "sticky",
  top: 0,
  height: "100vh",
  overflow: "auto",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 22,
};

const logoBoxStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 18,
  background: "#FFFFFF",
  border: `2px solid ${colors.gold}`,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  boxShadow: "0 14px 30px rgba(0,0,0,0.22)",
};

const logoImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: 5,
};

const logoFallbackStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 28,
  color: colors.navy,
};

const brandTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 22,
  letterSpacing: 1.5,
};

const brandSubStyle: React.CSSProperties = {
  color: "#B7C7D8",
  fontSize: 12,
  fontWeight: 800,
};

const navButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#FFFFFF",
  borderRadius: 16,
  padding: "12px 13px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 900,
};

const topbarStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(14px)",
  borderBottom: `1px solid ${colors.line}`,
  padding: 20,
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 31,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const stackStyle: React.CSSProperties = { display: "grid", gap: 16 };
const listStyle: React.CSSProperties = { display: "grid", gap: 10 };
const buttonRowStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };

const sectionStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 28,
  padding: 20,
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.07)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 25,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const heroStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navy3} 62%, #1C537A 100%)`,
  color: "#FFFFFF",
  borderRadius: 32,
  padding: 26,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
  alignItems: "center",
  boxShadow: "0 24px 55px rgba(7,27,47,0.25)",
};

const heroTitleStyle: React.CSSProperties = {
  margin: "6px 0 8px",
  fontSize: 38,
  lineHeight: 1,
  letterSpacing: "-0.05em",
  fontWeight: 950,
};

const heroTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#CFE0EE",
  fontSize: 15,
  lineHeight: 1.55,
};

const heroPanelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.95)",
  color: colors.text,
  border: "1px solid rgba(255,255,255,0.4)",
  borderRadius: 24,
  padding: 18,
};

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
};

const modernStatStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 24,
  padding: 18,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 16px 38px rgba(15,23,42,0.06)",
};

const statLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: 850,
};

const statValueStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 35,
  fontWeight: 950,
  lineHeight: 1.05,
  marginTop: 8,
  letterSpacing: "-0.04em",
};

const drawerGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  alignItems: "start",
};

const listPanelStyle: React.CSSProperties = {
  minWidth: 0,
};

const drawerStyle: React.CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 24,
  padding: 18,
  position: "sticky",
  top: 106,
  boxShadow: "0 16px 35px rgba(15,23,42,0.06)",
};

const detailTitleStyle: React.CSSProperties = {
  margin: "4px 0 14px",
  color: colors.navy,
  fontSize: 23,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const eyebrowLightStyle: React.CSSProperties = {
  color: colors.gold2,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const mutedSmallStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  margin: "4px 0 0",
  lineHeight: 1.45,
};

const fieldLabelStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 15,
  padding: "11px 12px",
  fontSize: 14,
  color: colors.text,
  background: "#FFFFFF",
  outline: "none",
  fontFamily: "inherit",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 11,
  marginBottom: 14,
};

const rowButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 18,
  padding: 14,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  boxShadow: "0 10px 26px rgba(15,23,42,0.04)",
};

const rowStaticStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 18,
  padding: 14,
  color: colors.text,
  boxShadow: "0 10px 26px rgba(15,23,42,0.04)",
};

const goldButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
  color: colors.navy,
  borderRadius: 14,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  borderRadius: 14,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #FACACA",
  background: "#FEECEC",
  color: colors.red,
  borderRadius: 14,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const noticeStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 18,
  padding: 14,
  color: colors.text,
  lineHeight: 1.5,
};

const mapShellStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 24,
  background: "#E6ECF2",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
  touchAction: "none",
};

const mapImageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  userSelect: "none",
  pointerEvents: "none",
};

const mapPinStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  border: "2px solid",
  borderRadius: 999,
  boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
  fontWeight: 950,
  cursor: "grab",
  whiteSpace: "nowrap",
  fontSize: 12,
  padding: "7px 9px",
};

const searchDropStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  boxShadow: "0 20px 45px rgba(11,30,51,0.18)",
  overflow: "hidden",
  zIndex: 50,
};

const searchResultStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  width: "100%",
  padding: 12,
  border: 0,
  borderBottom: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
};

const calendarHeaderStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const calendarWeekStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 8,
};

const calendarDayNameStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  textAlign: "center",
};

const calendarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 8,
};

const calendarCellStyle: React.CSSProperties = {
  minHeight: 110,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
  padding: 9,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  overflow: "hidden",
};

const calendarPillStyle: React.CSSProperties = {
  display: "block",
  background: "#EDF3FF",
  color: "#175CD3",
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 11,
  fontWeight: 850,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const calendarMoreStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 11,
  fontWeight: 850,
};

const weatherMetricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const weatherMetricStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 18,
  padding: 13,
  display: "grid",
  gap: 4,
};

const photoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const photoCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  padding: 10,
  background: "#FFFFFF",
};

const photoStyle: React.CSSProperties = {
  width: "100%",
  maxHeight: 160,
  objectFit: "cover",
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  marginBottom: 8,
};

const linkStyle: React.CSSProperties = {
  color: colors.navy,
  fontWeight: 950,
  textDecoration: "underline",
};
