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

type CalendarCategory =
  | "Maintenance"
  | "Vendor"
  | "Personal / Owner"
  | "Landscaping"
  | "Cleaning"
  | "Boat / Dock"
  | "Pool / Spa"
  | "Other";

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
  category: CalendarCategory;
  color: string;
  time?: string;
  notes?: string;
};

type LegacyCalendarItem = Partial<CalendarItem> & {
  status?: ServiceStatus;
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
  calendarId?: string;
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
  green: "#087443",
  blue: "#175CD3",
  orange: "#B54708",
};

const calendarCategories: { name: CalendarCategory; color: string }[] = [
  { name: "Maintenance", color: "#175CD3" },
  { name: "Vendor", color: "#7A3FF2" },
  { name: "Personal / Owner", color: "#C99A3D" },
  { name: "Landscaping", color: "#087443" },
  { name: "Cleaning", color: "#0E7490" },
  { name: "Boat / Dock", color: "#0369A1" },
  { name: "Pool / Spa", color: "#0D9488" },
  { name: "Other", color: "#667085" },
];

const calendarColorOptions = [
  "#175CD3",
  "#7A3FF2",
  "#C99A3D",
  "#087443",
  "#0E7490",
  "#0369A1",
  "#0D9488",
  "#B54708",
  "#B42318",
  "#667085",
];

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

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string) {
  const safeKey = key || todayISO();
  return new Date(`${safeKey}T12:00:00`);
}

function addMonthsToDate(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
}

function formatDate(date: string) {
  if (!date) return "No date";
  const parsed = dateFromKey(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatCalendarTime(time?: string) {
  if (!time) return "No time";
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);
  if (!Number.isFinite(hour)) return time;
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${`${minute}`.padStart(2, "0")} ${suffix}`;
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

function categoryMeta(category?: string) {
  return calendarCategories.find((item) => item.name === category) ?? calendarCategories[0];
}

function normalizeCalendarCategory(value?: string): CalendarCategory {
  return calendarCategories.find((item) => item.name === value)?.name ?? "Maintenance";
}

function inferCalendarCategory(item: LegacyCalendarItem): CalendarCategory {
  const text = `${item.title ?? ""} ${item.area ?? ""} ${item.notes ?? ""}`.toLowerCase();

  if (text.includes("landscape") || text.includes("weeding") || text.includes("pat") || text.includes("peter clark")) return "Landscaping";
  if (text.includes("pool") || text.includes("spa") || text.includes("hot tub") || text.includes("sundance")) return "Pool / Spa";
  if (text.includes("dock") || text.includes("boat") || text.includes("cobalt") || text.includes("seadoo") || text.includes("sea-doo")) return "Boat / Dock";
  if (text.includes("clean") || text.includes("trash") || text.includes("garbage")) return "Cleaning";
  if (text.includes("vendor") || text.includes("flooring") || text.includes("elliott") || text.includes("paint") || text.includes("psf") || text.includes("irrigation")) return "Vendor";
  if (text.includes("steve") || text.includes("jessica") || text.includes("jeremy") || text.includes("meeting") || text.includes("owner")) return "Personal / Owner";
  if (text.includes("service") || text.includes("check") || text.includes("maintenance") || text.includes("work order")) return "Maintenance";

  return "Other";
}

function inferCalendarTime(item: LegacyCalendarItem) {
  if (item.time) return item.time;

  const title = item.title ?? "";
  const amPmMatch = title.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(AM|PM)\b/i);
  if (!amPmMatch) return "";

  let hour = Number(amPmMatch[1]);
  const minute = amPmMatch[2] ?? "00";
  const suffix = amPmMatch[3].toUpperCase();

  if (suffix === "PM" && hour !== 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;

  return `${`${hour}`.padStart(2, "0")}:${minute}`;
}

function normalizeCalendarItem(item: LegacyCalendarItem, fallbackDate = todayISO()): CalendarItem {
  const category = item.category ? normalizeCalendarCategory(item.category) : inferCalendarCategory(item);
  const defaultColor = categoryMeta(category).color;

  return {
    id: item.id || uid("cal"),
    date: item.date || fallbackDate,
    title: item.title?.trim() || "New calendar item",
    area: item.area?.trim() || "2000",
    category,
    color: item.color || defaultColor,
    time: item.time ?? inferCalendarTime(item),
    notes: item.notes ?? "",
  };
}

function blankCalendarItem(date = todayISO()): CalendarItem {
  const category: CalendarCategory = "Maintenance";
  return {
    id: "",
    date,
    title: "",
    area: "2000",
    category,
    color: categoryMeta(category).color,
    time: "",
    notes: "",
  };
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
    Low: { bg: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
    Monitor: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Scheduled: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Medium: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    Normal: { bg: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
    "In Stock": { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
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

function calendarPillStyle(color: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    border: `1px solid ${color}`,
    background: `${color}18`,
    color,
    borderRadius: 10,
    padding: "5px 7px",
    fontSize: 11,
    fontWeight: 900,
    textAlign: "left",
    cursor: "pointer",
    minHeight: 26,
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
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", zone: "Main House", notes: "Patio with chairs/fire pit between main house, addition, old garage, and covered hallway." },
  { id: "trampoline-dog", name: "Trampoline / Dog", type: "Grounds", zone: "Exterior", notes: "Turf/trampoline/dog cleanup area east of the covered hallway." },
  { id: "exterior", name: "Exterior", type: "Envelope", zone: "2000", notes: "Exterior paint/stain, siding, eaves, deck edges, windows, and envelope checks." },
  { id: "irrigation", name: "Irrigation", type: "Landscape Systems", zone: "Grounds", notes: "Hunter Hydrawise / Advanced Irrigation records, zones, flow/rain/soil sensors." },
];

const defaultMapLabels: MapLabelRecord[] = [
  { id: "map-dock", label: "Dock", category: "Waterfront", x: 58, y: 78, notes: "Main dock location with boat lifts, dock power, and waterfront service records.", photos: [] },
  { id: "map-cobalt", label: "Cobalt", category: "Watercraft", x: 63, y: 72, notes: "Cobalt R7 area near the dock.", photos: [] },
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
  { id: "boiler-1", name: "Boiler B-1", locationId: "mechanical-room", category: "Hydronic Heating", status: "Online", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", notes: "White wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE.", vendorIds: ["psf"] },
  { id: "boiler-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", notes: "White wall-mounted Viessmann Vitodens 200. Year 2025 nameplate. Keep monitored after recall / heat exchanger work.", vendorIds: ["psf"] },
  { id: "vitocell-tanks", name: "Twin Viessmann Vitocell 300-V DHW Tanks", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "Two 79 USG / 300 L stainless indirect domestic hot water tanks.", vendorIds: ["psf"] },
  { id: "desertaire-dhu1", name: "Desert Aire DHU-1 Pool Dehumidification", locationId: "pool-equipment", category: "Pool HVAC", status: "Monitor", make: "Desert Aire", notes: "Indoor pool dehumidification system with hydronic heat coil and controls.", vendorIds: ["psf"] },
  { id: "pool-pump-pentair", name: "Pentair 3.0 HP Pool Pump", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", notes: "Pool source → pump → Triton II sand filter → UV/ozone → return to pool.", vendorIds: ["psf"] },
  { id: "sundance-optima", name: "Sundance 880 Optima Spa", locationId: "standalone-spa", category: "Spa", status: "Monitor", make: "Sundance", model: "OPTIMA", serial: "00P3LCD-100528521-0315", notes: "Standalone Sundance 880 Optima spa. Separate from pool equipment.", vendorIds: [] },
  { id: "sunstream-cobalt", name: "Sunstream Lift Box — Cobalt", locationId: "cobalt-lift", category: "Dock / Boat Lift", status: "Online", make: "Sunstream", notes: "Larger/newer Sunstream lift control, battery, and solar box. Belongs to Cobalt boat lift.", vendorIds: ["sunstream"] },
  { id: "sunstream-seadoo", name: "Sunstream Lift Box — SeaDoo", locationId: "seadoo-lift", category: "Dock / PWC Lift", status: "Monitor", make: "Sunstream", notes: "Sea-Doo lift box. Smaller/older Sunstream box.", vendorIds: ["sunstream"] },
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
  normalizeCalendarItem({ id: "cal-tuesday-meeting", date: todayISO(), title: "Tuesday Steve / Patrick meeting", area: "2000", category: "Personal / Owner", time: "10:00", notes: "Summer Tuesday meeting." }),
  normalizeCalendarItem({ id: "cal-friday-meeting", date: todayISO(), title: "Friday Steve meeting", area: "2000", category: "Personal / Owner", time: "09:00", notes: "Friday property meeting." }),
  normalizeCalendarItem({ id: "cal-flooring", date: "2026-07-22", title: "5 Star Flooring / Eric — Evi's room", area: "Interior", category: "Vendor", time: "08:30", notes: "Arrival window 8:30–9:30." }),
];

const defaultWeatherPlan = [
  { day: "Today", icon: "☀️", title: "Exterior / stain", note: "Good for sanding, staining, and dry exterior work if wind stays calm." },
  { day: "Thu", icon: "🌤️", title: "Grounds", note: "Check irrigation, beds, pots, and lake-water use." },
  { day: "Fri", icon: "🌦️", title: "Pool / spa", note: "Watch for rain before balancing outdoor spa or fountain." },
  { day: "Sat", icon: "💨", title: "Dock", note: "Check wind before Cobalt, Sea-Doo, lift, and water trampoline work." },
  { day: "Sun", icon: "🌧️", title: "Interior", note: "Use wet weather for indoor inspections, mechanical rooms, and records." },
  { day: "Mon", icon: "⛅", title: "Trash / reset", note: "Garage garbage, cans, deliveries, and property reset." },
  { day: "Tue", icon: "🌲", title: "Landscape", note: "Waterside beds first, then patio, courtyard, driveway, and dock path edges." },
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

  const [selectedCalendarId, setSelectedCalendarId] = useState(defaultCalendar[0]?.id ?? "");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());
  const [calendarCursor, setCalendarCursor] = useState(() => dateFromKey(todayISO()));
  const [calendarForm, setCalendarForm] = useState<CalendarItem>(defaultCalendar[0] ?? blankCalendarItem(todayISO()));
  const [calendarMode, setCalendarMode] = useState<"edit" | "new">("edit");

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

    const storedCalendar = readStoredArray<LegacyCalendarItem>(storageKeys.calendar, defaultCalendar).map((item) => normalizeCalendarItem(item));

    setMapLabels(storedMapLabels.length ? storedMapLabels : defaultMapLabels);
    setSelectedMapLabelId((storedMapLabels[0] ?? defaultMapLabels[0]).id);
    setMapLabelForm(storedMapLabels[0] ?? defaultMapLabels[0]);

    setAssetRecords(readStoredArray<AssetRecord>(storageKeys.assets, defaultAssets));
    setVendorRecords(readStoredArray<VendorRecord>(storageKeys.vendors, defaultVendors));
    setServiceRecords(readStoredArray<ServiceRecord>(storageKeys.workOrders, defaultWorkOrders));
    setCalendarItems(storedCalendar.length ? storedCalendar : defaultCalendar);
    setSelectedCalendarId((storedCalendar[0] ?? defaultCalendar[0])?.id ?? "");
    setCalendarForm(storedCalendar[0] ?? defaultCalendar[0] ?? blankCalendarItem(todayISO()));
    setPartRecords(readStoredArray<PartRecord>(storageKeys.parts, defaultParts));

    setReady(true);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(mapLocalStorageKey, JSON.stringify(mapLabels));
  }, [ready, mapLabels]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKeys.assets, JSON.stringify(assetRecords));
  }, [ready, assetRecords]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKeys.vendors, JSON.stringify(vendorRecords));
  }, [ready, vendorRecords]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKeys.workOrders, JSON.stringify(serviceRecords));
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKeys.calendar, JSON.stringify(calendarItems));
  }, [ready, calendarItems]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKeys.parts, JSON.stringify(partRecords));
  }, [ready, partRecords]);

  const selectedMapLabel = mapLabels.find((label) => label.id === selectedMapLabelId) ?? mapLabels[0] ?? defaultMapLabels[0];
  const selectedAsset = assetRecords.find((asset) => asset.id === selectedAssetId) ?? assetRecords[0] ?? defaultAssets[0];
  const selectedVendor = vendorRecords.find((vendor) => vendor.id === selectedVendorId) ?? vendorRecords[0] ?? defaultVendors[0];
  const selectedService = serviceRecords.find((service) => service.id === selectedServiceId) ?? serviceRecords[0] ?? defaultWorkOrders[0];

  const searchText = query.trim().toLowerCase();

  const sortedLocations = useMemo(() => [...defaultLocations].sort((a, b) => a.name.localeCompare(b.name)), []);
  const sortedAssets = useMemo(() => [...assetRecords].sort((a, b) => a.name.localeCompare(b.name)), [assetRecords]);
  const sortedVendors = useMemo(() => [...vendorRecords].sort((a, b) => a.name.localeCompare(b.name)), [vendorRecords]);
  const sortedWorkOrders = useMemo(
    () => [...serviceRecords].sort((a, b) => (a.status === "Completed" ? 1 : 0) - (b.status === "Completed" ? 1 : 0) || a.date.localeCompare(b.date)),
    [serviceRecords],
  );

  const sortedCalendar = useMemo(
    () => [...calendarItems].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title)),
    [calendarItems],
  );

  const todayKey = todayISO();
  const todayCalendarItems = sortedCalendar.filter((item) => item.date === todayKey);
  const selectedDateItems = sortedCalendar.filter((item) => item.date === selectedCalendarDate);

  const searchResults = useMemo(
    () =>
      buildSearchIndex()
        .filter((item) => !searchText || `${item.type} ${item.title} ${item.subtitle} ${item.detail}`.toLowerCase().includes(searchText))
        .slice(0, 12),
    [searchText, mapLabels, assetRecords, vendorRecords, serviceRecords, calendarItems, partRecords],
  );

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
      ...sortedLocations.map((location) => ({
        id: `location-${location.id}`,
        type: "Location",
        title: location.name,
        subtitle: `${location.type} · ${location.zone}`,
        detail: location.notes,
        screen: "locations" as Screen,
      })),
      ...mapLabels.map((label) => ({
        id: `map-${label.id}`,
        type: "Map Label",
        title: label.label,
        subtitle: `${label.category} · ${Math.round(label.x)}/${Math.round(label.y)}`,
        detail: label.notes,
        screen: "map" as Screen,
        mapLabelId: label.id,
      })),
      ...assetRecords.map((asset) => ({
        id: `asset-${asset.id}`,
        type: "Asset",
        title: asset.name,
        subtitle: `${asset.category} · ${locationName(asset.locationId)} · ${asset.status}`,
        detail: `${asset.make ?? ""} ${asset.model ?? ""} ${asset.serial ?? ""} ${asset.notes}`,
        screen: "assets" as Screen,
        assetId: asset.id,
      })),
      ...vendorRecords.map((vendor) => ({
        id: `vendor-${vendor.id}`,
        type: "Vendor",
        title: vendor.name,
        subtitle: vendor.category,
        detail: `${vendor.phone ?? ""} ${vendor.email ?? ""} ${vendor.notes}`,
        screen: "vendors" as Screen,
        vendorId: vendor.id,
      })),
      ...serviceRecords.map((service) => ({
        id: `service-${service.id}`,
        type: "Work Order",
        title: service.title,
        subtitle: `${formatDate(service.date)} · ${service.status} · ${service.priority}`,
        detail: `${assetName(service.assetId)} ${vendorName(service.vendorId)} ${service.notes}`,
        screen: "history" as Screen,
        serviceId: service.id,
      })),
      ...calendarItems.map((item) => ({
        id: `calendar-${item.id}`,
        type: "Calendar",
        title: item.title,
        subtitle: `${formatDate(item.date)} · ${item.time ? formatCalendarTime(item.time) : "No time"} · ${item.category}`,
        detail: `${item.area} ${item.notes ?? ""}`,
        screen: "calendar" as Screen,
        calendarId: item.id,
      })),
      ...partRecords.map((part) => ({
        id: `part-${part.id}`,
        type: "Part",
        title: part.name,
        subtitle: `${part.category} · ${part.status}`,
        detail: `${locationName(part.locationId)} quantity ${part.quantity} minimum ${part.minQuantity} ${part.notes}`,
        screen: "parts" as Screen,
      })),
    ];
  }

  function openSearchResult(result: SearchResult) {
    if (result.assetId) setSelectedAssetId(result.assetId);
    if (result.vendorId) setSelectedVendorId(result.vendorId);
    if (result.serviceId) setSelectedServiceId(result.serviceId);
    if (result.mapLabelId) {
      const label = mapLabels.find((item) => item.id === result.mapLabelId);
      if (label) {
        setSelectedMapLabelId(label.id);
        setMapLabelForm(label);
        setMapLabelMode("edit");
      }
    }
    if (result.calendarId) {
      const item = calendarItems.find((calendarItem) => calendarItem.id === result.calendarId);
      if (item) selectCalendarItem(item);
    }
    setQuery("");
    setScreen(result.screen);
  }

  function updateAsset(id: string, changes: Partial<AssetRecord>) {
    setAssetRecords((current) => current.map((asset) => (asset.id === id ? { ...asset, ...changes } : asset)));
  }

  function updateVendor(id: string, changes: Partial<VendorRecord>) {
    setVendorRecords((current) => current.map((vendor) => (vendor.id === id ? { ...vendor, ...changes } : vendor)));
  }

  function updateService(id: string, changes: Partial<ServiceRecord>) {
    setServiceRecords((current) => current.map((service) => (service.id === id ? { ...service, ...changes } : service)));
  }

  function saveCalendarItem() {
    const title = calendarForm.title.trim();
    if (!title) return;

    const cleanItem = normalizeCalendarItem({
      ...calendarForm,
      id: calendarMode === "edit" && calendarForm.id ? calendarForm.id : uid("cal"),
      title,
      date: calendarForm.date || selectedCalendarDate || todayISO(),
      area: calendarForm.area.trim() || "2000",
      notes: calendarForm.notes?.trim() || "",
      time: calendarForm.time || "",
    });

    setCalendarItems((current) => {
      const exists = current.some((item) => item.id === cleanItem.id);
      return exists ? current.map((item) => (item.id === cleanItem.id ? cleanItem : item)) : [...current, cleanItem];
    });

    setCalendarForm(cleanItem);
    setSelectedCalendarId(cleanItem.id);
    setSelectedCalendarDate(cleanItem.date);
    setCalendarCursor(dateFromKey(cleanItem.date));
    setCalendarMode("edit");
  }

  function deleteCalendarItem() {
    if (!calendarForm.id) return;
    const confirmed = window.confirm(`Delete calendar item: ${calendarForm.title}?`);
    if (!confirmed) return;

    const remaining = calendarItems.filter((item) => item.id !== calendarForm.id);
    setCalendarItems(remaining);

    const nextItem = remaining.find((item) => item.date === selectedCalendarDate) ?? remaining[0];
    setSelectedCalendarId(nextItem?.id ?? "");
    setCalendarForm(nextItem ?? blankCalendarItem(selectedCalendarDate || todayISO()));
    setCalendarMode(nextItem ? "edit" : "new");
  }

  function startNewCalendarItem(date = selectedCalendarDate || todayISO()) {
    const next = blankCalendarItem(date);
    setCalendarForm(next);
    setSelectedCalendarId("");
    setSelectedCalendarDate(date);
    setCalendarCursor(dateFromKey(date));
    setCalendarMode("new");
  }

  function selectCalendarItem(item: CalendarItem) {
    const cleanItem = normalizeCalendarItem(item);
    setSelectedCalendarId(cleanItem.id);
    setCalendarForm(cleanItem);
    setSelectedCalendarDate(cleanItem.date);
    setCalendarCursor(dateFromKey(cleanItem.date));
    setCalendarMode("edit");
  }

  function changeCalendarCategory(category: CalendarCategory) {
    const color = categoryMeta(category).color;
    setCalendarForm((current) => ({ ...current, category, color }));
  }

  function createWorkOrderFromCalendarItem(item?: CalendarItem) {
    const source = item ?? calendarForm;
    if (!source.title.trim()) return;

    const matchingAsset =
      assetRecords.find((asset) => source.area.toLowerCase().includes(locationName(asset.locationId).toLowerCase())) ??
      assetRecords.find((asset) => source.title.toLowerCase().includes(asset.name.toLowerCase())) ??
      assetRecords[0];

    const workOrder: ServiceRecord = {
      id: uid("service-cal"),
      assetId: matchingAsset?.id ?? "",
      vendorId: "",
      date: source.date || todayISO(),
      title: source.title,
      status: "Open",
      priority: source.category === "Pool / Spa" || source.category === "Boat / Dock" ? "High" : "Medium",
      notes: `Created from calendar item. Area: ${source.area || "2000"}. Category: ${source.category}. Time: ${source.time ? formatCalendarTime(source.time) : "No time"}. ${source.notes ?? ""}`.trim(),
    };

    setServiceRecords((current) => [workOrder, ...current]);
    setSelectedServiceId(workOrder.id);
    setScreen("history");
  }

  function scheduleProcedure(procedure: ProcedureRecord) {
    const category: CalendarCategory = procedure.area.toLowerCase().includes("spa") || procedure.area.toLowerCase().includes("pool") ? "Pool / Spa" : "Maintenance";
    const item = normalizeCalendarItem({
      id: uid("cal-procedure"),
      date: selectedCalendarDate || todayISO(),
      title: procedure.title,
      area: procedure.area || "2000",
      category,
      color: categoryMeta(category).color,
      notes: "Scheduled from Procedures.",
    });

    setCalendarItems((current) => [...current, item]);
    selectCalendarItem(item);
    setScreen("calendar");
  }

  function schedulePartRestock(part: PartRecord) {
    const item = normalizeCalendarItem({
      id: uid("cal-part"),
      date: todayISO(),
      title: `Restock: ${part.name}`,
      area: locationName(part.locationId),
      category: "Maintenance",
      color: categoryMeta("Maintenance").color,
      notes: `Inventory request. Current quantity: ${part.quantity}. Minimum: ${part.minQuantity}.`,
    });

    setCalendarItems((current) => [...current, item]);
    selectCalendarItem(item);
    setScreen("calendar");
  }

  function addMapLabel() {
    const label = { ...blankMapLabel, id: uid("map"), label: "New Label" };
    setMapLabels((current) => [...current, label]);
    setSelectedMapLabelId(label.id);
    setMapLabelForm(label);
    setMapLabelMode("edit");
  }

  function saveMapLabel() {
    const clean = {
      ...mapLabelForm,
      id: mapLabelForm.id || uid("map"),
      label: mapLabelForm.label.trim() || "Map Label",
      category: mapLabelForm.category.trim() || "Location",
      x: clampPercent(Number(mapLabelForm.x)),
      y: clampPercent(Number(mapLabelForm.y)),
      notes: mapLabelForm.notes.trim(),
      photos: mapLabelForm.photos ?? [],
    };

    setMapLabels((current) => (current.some((label) => label.id === clean.id) ? current.map((label) => (label.id === clean.id ? clean : label)) : [...current, clean]));
    setSelectedMapLabelId(clean.id);
    setMapLabelForm(clean);
    setMapLabelMode("edit");
  }

  function handleMapPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingLabelRef.current || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    const id = draggingLabelRef.current;

    setMapLabels((current) => current.map((label) => (label.id === id ? { ...label, x, y } : label)));
    setMapLabelForm((current) => (current.id === id ? { ...current, x, y } : current));
  }

  function stopDraggingLabel() {
    draggingLabelRef.current = null;
  }

  function selectMapLabel(label: MapLabelRecord) {
    setSelectedMapLabelId(label.id);
    setMapLabelForm(label);
    setMapLabelMode("edit");
  }

  function handleMapLabelPhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const photo: UploadedFileRecord = {
          id: uid("photo"),
          name: file.name,
          type: file.type,
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setMapLabelForm((current) => ({ ...current, photos: [...(current.photos ?? []), photo] }));
        setMapLabels((current) => current.map((label) => (label.id === selectedMapLabelId ? { ...label, photos: [...(label.photos ?? []), photo] } : label)));
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function deleteMapPhoto(photoId: string) {
    setMapLabelForm((current) => ({ ...current, photos: (current.photos ?? []).filter((photo) => photo.id !== photoId) }));
    setMapLabels((current) => current.map((label) => (label.id === selectedMapLabelId ? { ...label, photos: (label.photos ?? []).filter((photo) => photo.id !== photoId) } : label)));
  }

  function askAtlas() {
    const question = assistantQuestion.trim().toLowerCase();
    if (!question) return;

    const matches = buildSearchIndex()
      .filter((item) => `${item.type} ${item.title} ${item.subtitle} ${item.detail}`.toLowerCase().includes(question))
      .slice(0, 8);

    if (!matches.length) {
      setAssistantAnswer("I did not find an exact Atlas record match. Try asking about an asset, vendor, map label, work order, calendar item, procedure, document, or part.");
      return;
    }

    setAssistantAnswer(
      matches
        .map((item, index) => `${index + 1}. ${item.type}: ${item.title}\n${item.subtitle}\n${item.detail}`)
        .join("\n\n"),
    );
  }

  function monthCells() {
    const first = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1, 12);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  function screenContent() {
    switch (screen) {
      case "dashboard":
        return renderDashboard();
      case "map":
        return renderMap();
      case "locations":
        return renderLocations();
      case "assets":
        return renderAssets();
      case "history":
        return renderWorkOrders();
      case "vendors":
        return renderVendors();
      case "calendar":
        return renderCalendar();
      case "weather":
        return renderWeather();
      case "documents":
        return renderDocuments();
      case "procedures":
        return renderProcedures();
      case "parts":
        return renderParts();
      case "assistant":
        return renderAssistant();
      default:
        return renderDashboard();
    }
  }

  if (!ready) {
    return (
      <main style={loadingStyle}>
        <div style={logoMarkStyle}>A</div>
        <p>Loading Atlas...</p>
      </main>
    );
  }

  return (
    <main style={shellStyle}>
      <aside style={sidebarStyle}>
        <div style={brandBlockStyle}>
          <div style={logoMarkStyle}>A</div>
          <div>
            <div style={brandTitleStyle}>ATLAS</div>
            <div style={brandSubStyle}>2000 Estate Systems</div>
          </div>
        </div>

        <nav style={navStyle}>
          {screens.map((item) => (
            <button key={item.id} type="button" onClick={() => setScreen(item.id)} style={screen === item.id ? activeNavButtonStyle : navButtonStyle}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section style={mainStyle}>
        <header style={topbarStyle}>
          <div>
            <div style={eyebrowStyle}>Private property command center</div>
            <h1 style={pageTitleStyle}>Atlas / 2000</h1>
          </div>

          <div style={searchWrapStyle}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Atlas..." style={searchInputStyle} />
            {query.trim() ? (
              <div style={searchResultsStyle}>
                {searchResults.length ? (
                  searchResults.map((result) => (
                    <button key={result.id} type="button" onClick={() => openSearchResult(result)} style={searchResultButtonStyle}>
                      <strong>{result.title}</strong>
                      <span>{result.type} · {result.subtitle}</span>
                    </button>
                  ))
                ) : (
                  <div style={emptyStateStyle}>No matching Atlas records.</div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {screenContent()}
      </section>
    </main>
  );

  function renderDashboard() {
    const openWorkOrders = serviceRecords.filter((item) => item.status !== "Completed").length;
    const highPriority = serviceRecords.filter((item) => item.priority === "High" && item.status !== "Completed").length;
    const upcomingCalendar = sortedCalendar.filter((item) => item.date >= todayKey).slice(0, 6);

    return (
      <div style={stackStyle}>
        <div style={statGridStyle}>
          <Stat label="Assets" value={`${assetRecords.length}`} />
          <Stat label="Vendors" value={`${vendorRecords.length}`} />
          <Stat label="Open Work Orders" value={`${openWorkOrders}`} />
          <Stat label="High Priority" value={`${highPriority}`} />
        </div>

        <div style={gridTwoStyle}>
          <Section title="Today" eyebrow="Calendar / property focus">
            <div style={stackStyle}>
              {todayCalendarItems.length ? (
                todayCalendarItems.map((item) => <CalendarEventCard key={item.id} item={item} compact={false} />)
              ) : (
                <div style={emptyStateStyle}>No calendar items scheduled for today.</div>
              )}
              <button type="button" onClick={() => { startNewCalendarItem(todayKey); setScreen("calendar"); }} style={goldButtonStyle}>
                Add today event
              </button>
            </div>
          </Section>

          <Section title="Upcoming" eyebrow="Next scheduled items">
            <div style={stackStyle}>
              {upcomingCalendar.map((item) => (
                <button key={item.id} type="button" onClick={() => { selectCalendarItem(item); setScreen("calendar"); }} style={rowButtonStyle}>
                  <span style={{ ...dotStyle, background: item.color }} />
                  <div>
                    <strong>{item.title}</strong>
                    <p style={mutedSmallStyle}>{formatDate(item.date)} · {item.time ? formatCalendarTime(item.time) : "No time"} · {item.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <Section title="Work Orders" eyebrow="Open / monitor">
          <div style={listGridStyle}>
            {sortedWorkOrders.slice(0, 6).map((service) => (
              <button key={service.id} type="button" onClick={() => { setSelectedServiceId(service.id); setScreen("history"); }} style={recordCardButtonStyle}>
                <h3 style={cardTitleStyle}>{service.title}</h3>
                <p style={mutedSmallStyle}>{formatDate(service.date)} · {assetName(service.assetId)}</p>
                <div style={buttonRowStyle}>
                  <span style={badgeStyle(service.status)}>{service.status}</span>
                  <span style={badgeStyle(service.priority)}>{service.priority}</span>
                </div>
              </button>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  function renderMap() {
    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "1.45fr 0.75fr" }}>
        <Section title="Property Map" eyebrow="Movable labels" right={<button type="button" onClick={addMapLabel} style={goldButtonStyle}>Add Label</button>}>
          <div
            ref={mapRef}
            onPointerMove={handleMapPointerMove}
            onPointerUp={stopDraggingLabel}
            onPointerLeave={stopDraggingLabel}
            style={mapFrameStyle}
          >
            <img src="/atlas-property-map.png" alt="Atlas property map" style={mapImageStyle} />
            {mapLabels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => selectMapLabel(label)}
                onPointerDown={(event) => {
                  event.preventDefault();
                  draggingLabelRef.current = label.id;
                  selectMapLabel(label);
                }}
                style={{
                  ...mapLabelStyle,
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  borderColor: selectedMapLabelId === label.id ? colors.gold : "rgba(255,255,255,0.9)",
                  background: selectedMapLabelId === label.id ? colors.gold : "rgba(11,30,51,0.88)",
                  color: selectedMapLabelId === label.id ? colors.navy : "#FFFFFF",
                }}
              >
                {label.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title={selectedMapLabel?.label ?? "Map Label"} eyebrow={mapLabelMode === "new" ? "New label" : "Label detail"}>
          <div style={formGridStyle}>
            <label style={labelStyle}>Label<input value={mapLabelForm.label} onChange={(event) => setMapLabelForm((current) => ({ ...current, label: event.target.value }))} style={inputStyle} /></label>
            <label style={labelStyle}>Category<input value={mapLabelForm.category} onChange={(event) => setMapLabelForm((current) => ({ ...current, category: event.target.value }))} style={inputStyle} /></label>
            <div style={gridTwoSmallStyle}>
              <label style={labelStyle}>X<input type="number" value={mapLabelForm.x} onChange={(event) => setMapLabelForm((current) => ({ ...current, x: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
              <label style={labelStyle}>Y<input type="number" value={mapLabelForm.y} onChange={(event) => setMapLabelForm((current) => ({ ...current, y: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
            </div>
            <label style={labelStyle}>Notes<textarea value={mapLabelForm.notes} onChange={(event) => setMapLabelForm((current) => ({ ...current, notes: event.target.value }))} style={textareaStyle} /></label>
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
            ) : (
              <div style={emptyStateStyle}>No photos on this label yet.</div>
            )}

            <button type="button" onClick={saveMapLabel} style={goldButtonStyle}>Save Label</button>
          </div>
        </Section>
      </div>
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
                <div style={buttonRowStyle}>
                  {relatedAssets.length ? (
                    relatedAssets.map((asset) => (
                      <button key={asset.id} type="button" onClick={() => { setSelectedAssetId(asset.id); setScreen("assets"); }} style={chipButtonStyle}>
                        {asset.name}
                      </button>
                    ))
                  ) : (
                    <span style={badgeStyle("Monitor")}>No linked assets</span>
                  )}
                </div>
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
        <Section
          title="Assets"
          eyebrow="Equipment / property records"
          right={
            <button
              type="button"
              onClick={() => {
                const record: AssetRecord = { id: uid("asset"), name: "New Asset", locationId: "general", category: "General", status: "Monitor", notes: "", vendorIds: [] };
                setAssetRecords((current) => [record, ...current]);
                setSelectedAssetId(record.id);
              }}
              style={goldButtonStyle}
            >
              Add Asset
            </button>
          }
        >
          <div style={stackStyle}>
            {visible.map((asset) => (
              <button key={asset.id} type="button" onClick={() => setSelectedAssetId(asset.id)} style={selectedAssetId === asset.id ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF9EA" } : rowButtonStyle}>
                <div>
                  <strong>{asset.name}</strong>
                  <p style={mutedSmallStyle}>{asset.category} · {locationName(asset.locationId)}</p>
                </div>
                <span style={badgeStyle(asset.status)}>{asset.status}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title={selectedAsset.name} eyebrow="Asset Detail">
          <div style={formGridStyle}>
            <label style={labelStyle}>Name<input value={selectedAsset.name} onChange={(event) => updateAsset(selectedAsset.id, { name: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Category<input value={selectedAsset.category} onChange={(event) => updateAsset(selectedAsset.id, { category: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Location<select value={selectedAsset.locationId} onChange={(event) => updateAsset(selectedAsset.id, { locationId: event.target.value })} style={inputStyle}>{sortedLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            <label style={labelStyle}>Status<select value={selectedAsset.status} onChange={(event) => updateAsset(selectedAsset.id, { status: event.target.value as Status })} style={inputStyle}><option>Online</option><option>Offline</option><option>Seasonal</option><option>Monitor</option></select></label>
            <div style={gridTwoSmallStyle}>
              <label style={labelStyle}>Make<input value={selectedAsset.make ?? ""} onChange={(event) => updateAsset(selectedAsset.id, { make: event.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Model<input value={selectedAsset.model ?? ""} onChange={(event) => updateAsset(selectedAsset.id, { model: event.target.value })} style={inputStyle} /></label>
            </div>
            <label style={labelStyle}>Serial / ID<input value={selectedAsset.serial ?? ""} onChange={(event) => updateAsset(selectedAsset.id, { serial: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Notes<textarea value={selectedAsset.notes} onChange={(event) => updateAsset(selectedAsset.id, { notes: event.target.value })} style={textareaStyle} /></label>
          </div>
        </Section>
      </div>
    );
  }

  function renderWorkOrders() {
    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr" }}>
        <Section
          title="Work Orders"
          eyebrow="Service history"
          right={
            <button
              type="button"
              onClick={() => {
                const record: ServiceRecord = { id: uid("service"), assetId: assetRecords[0]?.id ?? "", vendorId: "", date: todayISO(), title: "New Work Order", status: "Open", priority: "Medium", notes: "" };
                setServiceRecords((current) => [record, ...current]);
                setSelectedServiceId(record.id);
              }}
              style={goldButtonStyle}
            >
              Add Work Order
            </button>
          }
        >
          <div style={stackStyle}>
            {sortedWorkOrders.map((service) => (
              <button key={service.id} type="button" onClick={() => setSelectedServiceId(service.id)} style={selectedServiceId === service.id ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF9EA" } : rowButtonStyle}>
                <div>
                  <strong>{service.title}</strong>
                  <p style={mutedSmallStyle}>{formatDate(service.date)} · {assetName(service.assetId)}</p>
                </div>
                <div style={buttonRowStyle}>
                  <span style={badgeStyle(service.status)}>{service.status}</span>
                  <span style={badgeStyle(service.priority)}>{service.priority}</span>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title={selectedService.title} eyebrow="Work Order Detail">
          <div style={formGridStyle}>
            <label style={labelStyle}>Title<input value={selectedService.title} onChange={(event) => updateService(selectedService.id, { title: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Date<input type="date" value={selectedService.date} onChange={(event) => updateService(selectedService.id, { date: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Asset<select value={selectedService.assetId} onChange={(event) => updateService(selectedService.id, { assetId: event.target.value })} style={inputStyle}>{assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
            <label style={labelStyle}>Vendor<select value={selectedService.vendorId ?? ""} onChange={(event) => updateService(selectedService.id, { vendorId: event.target.value })} style={inputStyle}><option value="">Internal</option>{vendorRecords.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
            <div style={gridTwoSmallStyle}>
              <label style={labelStyle}>Status<select value={selectedService.status} onChange={(event) => updateService(selectedService.id, { status: event.target.value as ServiceStatus })} style={inputStyle}><option>Open</option><option>Scheduled</option><option>Completed</option><option>Monitor</option></select></label>
              <label style={labelStyle}>Priority<select value={selectedService.priority} onChange={(event) => updateService(selectedService.id, { priority: event.target.value as WorkOrderPriority })} style={inputStyle}><option>Low</option><option>Medium</option><option>High</option></select></label>
            </div>
            <label style={labelStyle}>Notes<textarea value={selectedService.notes} onChange={(event) => updateService(selectedService.id, { notes: event.target.value })} style={textareaStyle} /></label>
          </div>
        </Section>
      </div>
    );
  }

  function renderVendors() {
    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr" }}>
        <Section
          title="Vendors"
          eyebrow="Contacts / notes"
          right={
            <button
              type="button"
              onClick={() => {
                const vendor: VendorRecord = { id: uid("vendor"), name: "New Vendor", category: "General", notes: "" };
                setVendorRecords((current) => [vendor, ...current]);
                setSelectedVendorId(vendor.id);
              }}
              style={goldButtonStyle}
            >
              Add Vendor
            </button>
          }
        >
          <div style={stackStyle}>
            {sortedVendors.map((vendor) => (
              <button key={vendor.id} type="button" onClick={() => setSelectedVendorId(vendor.id)} style={selectedVendorId === vendor.id ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF9EA" } : rowButtonStyle}>
                <div>
                  <strong>{vendor.name}</strong>
                  <p style={mutedSmallStyle}>{vendor.category}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        <Section title={selectedVendor.name} eyebrow="Vendor Detail">
          <div style={formGridStyle}>
            <label style={labelStyle}>Name<input value={selectedVendor.name} onChange={(event) => updateVendor(selectedVendor.id, { name: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Category<input value={selectedVendor.category} onChange={(event) => updateVendor(selectedVendor.id, { category: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Phone<input value={selectedVendor.phone ?? ""} onChange={(event) => updateVendor(selectedVendor.id, { phone: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Email<input value={selectedVendor.email ?? ""} onChange={(event) => updateVendor(selectedVendor.id, { email: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Website<input value={selectedVendor.website ?? ""} onChange={(event) => updateVendor(selectedVendor.id, { website: event.target.value })} style={inputStyle} /></label>
            <label style={labelStyle}>Notes<textarea value={selectedVendor.notes} onChange={(event) => updateVendor(selectedVendor.id, { notes: event.target.value })} style={textareaStyle} /></label>
          </div>
        </Section>
      </div>
    );
  }

  function renderCalendar() {
    const cells = monthCells();

    return (
      <div style={{ ...gridTwoStyle, gridTemplateColumns: isMobile ? "1fr" : "1.35fr 0.75fr" }}>
        <Section
          title="Calendar"
          eyebrow="Category color / optional time"
          right={
            <div style={buttonRowStyle}>
              <button type="button" onClick={() => setCalendarCursor((current) => addMonthsToDate(current, -1))} style={secondaryButtonStyle}>Back</button>
              <button type="button" onClick={() => { setCalendarCursor(dateFromKey(todayISO())); setSelectedCalendarDate(todayISO()); }} style={secondaryButtonStyle}>Today</button>
              <button type="button" onClick={() => setCalendarCursor((current) => addMonthsToDate(current, 1))} style={secondaryButtonStyle}>Next</button>
            </div>
          }
        >
          <div style={calendarHeaderStyle}>
            <h3 style={{ ...cardTitleStyle, fontSize: 24 }}>{formatMonth(calendarCursor)}</h3>
            <button type="button" onClick={() => startNewCalendarItem(selectedCalendarDate)} style={goldButtonStyle}>Add Event</button>
          </div>

          <div style={calendarGridStyle}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} style={calendarWeekdayStyle}>{day}</div>
            ))}

            {cells.map((date) => {
              const key = dateKeyFromDate(date);
              const isCurrentMonth = date.getMonth() === calendarCursor.getMonth();
              const isToday = key === todayKey;
              const isSelected = key === selectedCalendarDate;
              const items = sortedCalendar.filter((item) => item.date === key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedCalendarDate(key);
                    const first = items[0];
                    if (first) selectCalendarItem(first);
                    else startNewCalendarItem(key);
                  }}
                  style={{
                    ...calendarDayStyle,
                    opacity: isCurrentMonth ? 1 : 0.45,
                    borderColor: isSelected ? colors.gold : isToday ? colors.navy : colors.line,
                    background: isSelected ? "#FFF9EA" : colors.card,
                  }}
                >
                  <div style={calendarDayNumberStyle}>{date.getDate()}</div>
                  <div style={calendarDayEventsStyle}>
                    {items.slice(0, 3).map((item) => (
                      <span key={item.id} style={calendarPillStyle(item.color)}>
                        <span style={{ ...dotStyle, background: item.color }} />
                        <span style={truncateStyle}>{item.time ? `${formatCalendarTime(item.time)} · ` : ""}{item.title}</span>
                      </span>
                    ))}
                    {items.length > 3 ? <span style={moreEventsStyle}>+{items.length - 3} more</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <div style={stackStyle}>
          <Section title="Today" eyebrow="What is scheduled">
            <div style={rightScrollBoxStyle}>
              {todayCalendarItems.length ? (
                todayCalendarItems.map((item) => <CalendarEventCard key={item.id} item={item} compact />)
              ) : (
                <div style={emptyStateStyle}>Nothing scheduled today.</div>
              )}
            </div>
          </Section>

          <Section title={calendarMode === "new" ? "Add Event" : "Edit Event"} eyebrow="No status section">
            <div style={formGridStyle}>
              <label style={labelStyle}>Title<input value={calendarForm.title} onChange={(event) => setCalendarForm((current) => ({ ...current, title: event.target.value }))} placeholder="Event title" style={inputStyle} /></label>
              <label style={labelStyle}>Date<input type="date" value={calendarForm.date} onChange={(event) => setCalendarForm((current) => ({ ...current, date: event.target.value }))} style={inputStyle} /></label>

              <div style={gridTwoSmallStyle}>
                <label style={labelStyle}>
                  Time optional
                  <input
                    type="time"
                    value={calendarForm.time ?? ""}
                    onChange={(event) => setCalendarForm((current) => ({ ...current, time: event.target.value }))}
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Category
                  <select value={calendarForm.category} onChange={(event) => changeCalendarCategory(event.target.value as CalendarCategory)} style={inputStyle}>
                    {calendarCategories.map((category) => (
                      <option key={category.name} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Category color
                <select value={calendarForm.color} onChange={(event) => setCalendarForm((current) => ({ ...current, color: event.target.value }))} style={inputStyle}>
                  {calendarColorOptions.map((colorOption) => (
                    <option key={colorOption} value={colorOption}>{colorOption}</option>
                  ))}
                </select>
              </label>

              <div style={colorPreviewRowStyle}>
                {calendarColorOptions.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setCalendarForm((current) => ({ ...current, color: colorOption }))}
                    title={colorOption}
                    style={{
                      ...colorDotButtonStyle,
                      background: colorOption,
                      outline: calendarForm.color === colorOption ? `3px solid ${colors.gold}` : "none",
                    }}
                  />
                ))}
              </div>

              <label style={labelStyle}>Area / Location<input value={calendarForm.area} onChange={(event) => setCalendarForm((current) => ({ ...current, area: event.target.value }))} placeholder="2000, Dock, Pool, Interior..." style={inputStyle} /></label>
              <label style={labelStyle}>Notes<textarea value={calendarForm.notes ?? ""} onChange={(event) => setCalendarForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes" style={textareaStyle} /></label>

              <div style={buttonRowStyle}>
                <button type="button" onClick={saveCalendarItem} style={goldButtonStyle}>Save Event</button>
                <button type="button" onClick={() => setCalendarForm((current) => ({ ...current, time: "" }))} style={secondaryButtonStyle}>Clear Time</button>
                <button type="button" onClick={() => startNewCalendarItem(selectedCalendarDate)} style={secondaryButtonStyle}>New</button>
                {calendarMode === "edit" && calendarForm.id ? <button type="button" onClick={deleteCalendarItem} style={dangerButtonStyle}>Delete</button> : null}
              </div>

              <button type="button" onClick={() => createWorkOrderFromCalendarItem()} style={secondaryButtonStyle}>Create Work Order From Event</button>
            </div>
          </Section>

          <Section title={formatDate(selectedCalendarDate)} eyebrow="Selected day">
            <div style={rightScrollBoxStyle}>
              {selectedDateItems.length ? (
                selectedDateItems.map((item) => <CalendarEventCard key={item.id} item={item} compact />)
              ) : (
                <div style={emptyStateStyle}>No saved events for this day.</div>
              )}
            </div>
          </Section>
        </div>
      </div>
    );
  }

  function CalendarEventCard({ item, compact }: { item: CalendarItem; compact: boolean }) {
    return (
      <button key={item.id} type="button" onClick={() => selectCalendarItem(item)} style={{ ...recordCardButtonStyle, borderLeft: `6px solid ${item.color}`, padding: compact ? 12 : 16 }}>
        <div style={buttonRowBetweenStyle}>
          <h3 style={{ ...cardTitleStyle, marginBottom: 4 }}>{item.title}</h3>
          <span style={{ ...categoryBadgeStyle, borderColor: item.color, color: item.color, background: `${item.color}14` }}>{item.category}</span>
        </div>
        <p style={mutedSmallStyle}>{formatDate(item.date)} · {item.time ? formatCalendarTime(item.time) : "No time"} · {item.area}</p>
        {item.notes ? <p style={bodyTextStyle}>{item.notes}</p> : null}
      </button>
    );
  }

  function renderWeather() {
    return (
      <Section title="Weather" eyebrow="7-day property planning">
        <div style={weatherGridStyle}>
          {defaultWeatherPlan.map((day) => (
            <div key={day.day} style={weatherCardStyle}>
              <div style={weatherIconStyle}>{day.icon}</div>
              <strong>{day.day}</strong>
              <p style={mutedSmallStyle}>{day.title}</p>
              <p style={bodyTextStyle}>{day.note}</p>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  function renderDocuments() {
    return (
      <Section title="Documents" eyebrow="Linked records">
        <div style={listGridStyle}>
          {defaultDocuments.map((doc) => (
            <div key={doc.id} style={recordCardStyle}>
              <h3 style={cardTitleStyle}>{doc.title}</h3>
              <p style={mutedSmallStyle}>{doc.type} · {doc.area}</p>
              <p style={bodyTextStyle}>{doc.notes}</p>
              {doc.href ? <a href={doc.href} style={linkStyle}>Open</a> : null}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  function renderProcedures() {
    return (
      <Section title="Procedures" eyebrow="Checklists">
        <div style={listGridStyle}>
          {defaultProcedures.map((procedure) => (
            <div key={procedure.id} style={recordCardStyle}>
              <div style={buttonRowBetweenStyle}>
                <h3 style={cardTitleStyle}>{procedure.title}</h3>
                <button type="button" onClick={() => scheduleProcedure(procedure)} style={secondaryButtonStyle}>Schedule</button>
              </div>
              <p style={mutedSmallStyle}>{procedure.area}</p>
              <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
                {procedure.steps.map((step, index) => (
                  <li key={`${procedure.id}-${index}`} style={bodyTextStyle}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  function renderParts() {
    return (
      <Section title="Parts" eyebrow="Inventory">
        <div style={listGridStyle}>
          {partRecords.map((part) => (
            <div key={part.id} style={recordCardStyle}>
              <div style={buttonRowBetweenStyle}>
                <h3 style={cardTitleStyle}>{part.name}</h3>
                <span style={badgeStyle(part.status)}>{part.status}</span>
              </div>
              <p style={mutedSmallStyle}>{part.category} · {locationName(part.locationId)}</p>
              <p style={bodyTextStyle}>Qty {part.quantity} / min {part.minQuantity}</p>
              <p style={bodyTextStyle}>{part.notes}</p>
              <button type="button" onClick={() => schedulePartRestock(part)} style={secondaryButtonStyle}>Schedule Restock</button>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  function renderAssistant() {
    return (
      <Section title="Ask Atlas Property Assistant" eyebrow="Local Atlas records">
        <div style={formGridStyle}>
          <label style={labelStyle}>
            Question
            <textarea
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder="Example: what is on the calendar today, where is the ADU, who handles irrigation..."
              style={textareaStyle}
            />
          </label>
          <button type="button" onClick={askAtlas} style={goldButtonStyle}>Ask Atlas</button>
          <pre style={answerBoxStyle}>{assistantAnswer}</pre>
        </div>
      </Section>
    );
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCardStyle}>
      <div style={statValueStyle}>{value}</div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

function Section({ title, eyebrow, right, children }: { title: string; eyebrow: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
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

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "250px 1fr",
  background: colors.bg,
  color: colors.text,
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
};

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: colors.bg,
  color: colors.navy,
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
};

const sidebarStyle: React.CSSProperties = {
  minHeight: "100vh",
  position: "sticky",
  top: 0,
  alignSelf: "start",
  background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navy2} 100%)`,
  color: "#FFFFFF",
  padding: 22,
  boxSizing: "border-box",
};

const brandBlockStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 26,
};

const logoMarkStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: `linear-gradient(135deg, ${colors.gold}, ${colors.gold2})`,
  color: colors.navy,
  display: "grid",
  placeItems: "center",
  fontWeight: 1000,
  fontSize: 26,
  boxShadow: "0 10px 24px rgba(0,0,0,0.20)",
};

const brandTitleStyle: React.CSSProperties = {
  fontWeight: 1000,
  letterSpacing: 2,
  fontSize: 18,
};

const brandSubStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 700,
};

const navStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const navButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#FFFFFF",
  borderRadius: 12,
  padding: "11px 12px",
  textAlign: "left",
  fontWeight: 850,
  cursor: "pointer",
};

const activeNavButtonStyle: React.CSSProperties = {
  ...navButtonStyle,
  background: colors.gold,
  color: colors.navy,
  borderColor: colors.gold,
};

const mainStyle: React.CSSProperties = {
  padding: 24,
  minWidth: 0,
};

const topbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
  marginBottom: 22,
  flexWrap: "wrap",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 34,
  letterSpacing: -1,
};

const searchWrapStyle: React.CSSProperties = {
  position: "relative",
  width: "min(460px, 100%)",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  padding: "13px 14px",
  fontSize: 14,
  fontWeight: 750,
  outline: "none",
  background: colors.card,
  color: colors.text,
  boxShadow: "0 8px 24px rgba(16,42,68,0.08)",
};

const searchResultsStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 50,
  top: 52,
  left: 0,
  right: 0,
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  padding: 10,
  boxShadow: "0 18px 36px rgba(16,42,68,0.18)",
  display: "grid",
  gap: 8,
  maxHeight: 420,
  overflowY: "auto",
};

const searchResultButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.text,
  borderRadius: 12,
  padding: 10,
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  gap: 4,
};

const sectionStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 12px 30px rgba(16,42,68,0.08)",
  minWidth: 0,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 14,
};

const eyebrowStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: 1.5,
  fontSize: 11,
  color: colors.gold,
  fontWeight: 1000,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "3px 0 0",
  color: colors.navy,
  fontSize: 24,
  letterSpacing: -0.4,
};

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
};

const statCardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 10px 26px rgba(16,42,68,0.08)",
};

const statValueStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 34,
  fontWeight: 1000,
  letterSpacing: -1,
};

const statLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const gridTwoStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  alignItems: "start",
};

const gridTwoSmallStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const listGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const stackStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const recordCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 14,
  minWidth: 0,
};

const recordCardButtonStyle: React.CSSProperties = {
  ...recordCardStyle,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  width: "100%",
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 16,
  fontWeight: 1000,
};

const mutedSmallStyle: React.CSSProperties = {
  margin: "5px 0 0",
  color: colors.muted,
  fontSize: 12,
  fontWeight: 750,
};

const bodyTextStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: colors.text,
  fontSize: 13,
  lineHeight: 1.45,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const buttonRowBetweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const rowButtonStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.text,
  borderRadius: 14,
  padding: 12,
  cursor: "pointer",
  textAlign: "left",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const chipButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  color: colors.navy,
  borderRadius: 999,
  padding: "6px 9px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 850,
};

const goldButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
  color: colors.navy,
  borderRadius: 12,
  padding: "10px 13px",
  fontSize: 13,
  fontWeight: 1000,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const dangerButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  borderColor: "#FACACA",
  color: colors.red,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: colors.navy,
  fontSize: 12,
  fontWeight: 1000,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 14,
  color: colors.text,
  background: "#FFFFFF",
  outline: "none",
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 700,
  width: "100%",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
  lineHeight: 1.45,
};

const answerBoxStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  color: colors.text,
  borderRadius: 14,
  padding: 14,
  whiteSpace: "pre-wrap",
  fontSize: 13,
  lineHeight: 1.45,
  minHeight: 180,
  overflow: "auto",
};

const emptyStateStyle: React.CSSProperties = {
  border: `1px dashed ${colors.line}`,
  background: "#F8FAFC",
  color: colors.muted,
  borderRadius: 14,
  padding: 14,
  fontSize: 13,
  fontWeight: 750,
};

const linkStyle: React.CSSProperties = {
  color: colors.blue,
  fontWeight: 900,
  textDecoration: "none",
};

const mapFrameStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 18,
  border: `1px solid ${colors.line}`,
  background: colors.navy,
  minHeight: 430,
  touchAction: "none",
};

const mapImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 430,
  objectFit: "cover",
  display: "block",
  userSelect: "none",
  pointerEvents: "none",
};

const mapLabelStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  border: "2px solid rgba(255,255,255,0.9)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 1000,
  cursor: "grab",
  boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
  whiteSpace: "nowrap",
};

const photoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10,
};

const photoCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  padding: 8,
  background: "#FFFFFF",
};

const photoImageStyle: React.CSSProperties = {
  width: "100%",
  height: 100,
  objectFit: "cover",
  borderRadius: 10,
  display: "block",
  marginBottom: 8,
};

const calendarHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const calendarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 8,
};

const calendarWeekdayStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 11,
  fontWeight: 1000,
  textTransform: "uppercase",
  letterSpacing: 1,
  textAlign: "center",
  padding: "4px 0",
};

const calendarDayStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 14,
  minHeight: 112,
  padding: 8,
  textAlign: "left",
  cursor: "pointer",
  display: "grid",
  alignContent: "start",
  gap: 6,
  overflow: "hidden",
};

const calendarDayNumberStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 13,
  fontWeight: 1000,
};

const calendarDayEventsStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const truncateStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

const moreEventsStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 11,
  fontWeight: 900,
};

const categoryBadgeStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 1000,
  whiteSpace: "nowrap",
};

const dotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  flex: "0 0 auto",
};

const rightScrollBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: 275,
  overflowY: "auto",
  paddingRight: 4,
};

const colorPreviewRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const colorDotButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "2px solid #FFFFFF",
  cursor: "pointer",
  boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
};

const weatherGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(140px, 1fr))",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 4,
};

const weatherCardStyle: React.CSSProperties = {
  minWidth: 140,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
  padding: 14,
};

const weatherIconStyle: React.CSSProperties = {
  fontSize: 30,
  marginBottom: 8,
};
