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
  priority: WorkOrderPriority;
  notes: string;
  followUpDate?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  recurrenceNextDue?: string;
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

type AtlasApiPayload = {
  ok?: boolean;
  error?: string;
  assetRecords?: AssetRecord[];
  vendorRecords?: VendorRecord[];
  procedureRecords?: ProcedureRecord[];
  serviceRecords?: ServiceRecord[];
  workOrders?: ServiceRecord[];
  calendarItems?: CalendarItem[];
  photos?: UploadedFileRecord[];
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

type AtlasTable = "assets" | "vendors" | "work_orders" | "procedures" | "calendar" | "asset_photos";

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

const mapImageCandidates = ["/atlas-property-map.png", "/property-map.png", "/map.png"];
const restoreKey = "atlas-restore-20260708";
const mapLocalStorageKey = `${restoreKey}-map-labels`;
const storageKeys = {
  assets: `${restoreKey}-assets`,
  vendors: `${restoreKey}-vendors`,
  workOrders: `${restoreKey}-work-orders`,
  calendar: `${restoreKey}-calendar`,
  parts: `${restoreKey}-parts`,
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

function safeStatus(value: unknown): Status {
  if (value === "Online" || value === "Offline" || value === "Seasonal" || value === "Monitor") return value;
  return "Monitor";
}

function safeServiceStatus(value: unknown): ServiceStatus {
  if (value === "Open" || value === "Scheduled" || value === "Completed" || value === "Monitor") return value;
  return "Open";
}

function safePriority(value: unknown): WorkOrderPriority {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  return "Medium";
}

function badgeStyle(value: string): React.CSSProperties {
  const palette: Record<string, { bg: string; color: string; border: string }> = {
    Online: { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
    Completed: { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
    "In Stock": { bg: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
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
  { id: "general", name: "General", type: "Property", zone: "2000", notes: "Whole-property default location for records not tied to one room, building, or asset." },
  { id: "original-house", name: "Original House", type: "Building", zone: "Main House", notes: "Original/main house structure." },
  { id: "addition", name: "Addition", type: "Building", zone: "Main House", notes: "Addition wing including the indoor pool area." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", zone: "Main House", notes: "Boilers, DHW tanks, hydronic controls, pumps, pool heat, and HVAC equipment." },
  { id: "pool-equipment", name: "Pool Equipment Room", type: "Pool Systems", zone: "Addition", notes: "Pool filtration, pumps, sand filter, UV/ozone, Desert Aire, and hydronic pool heat equipment." },
  { id: "pool-changing-room", name: "Pool Changing Room", type: "Pool", zone: "Addition", notes: "Pool changing room and ClearRay UV-C ballast area." },
  { id: "standalone-spa", name: "Hot Tub / Sundance", type: "Spa", zone: "Outdoor", notes: "Standalone Sundance 880 Optima spa. Separate from pool equipment." },
  { id: "dock", name: "Dock", type: "Waterfront", zone: "Lake", notes: "Main dock, boat lift areas, dock power, Sea-Doo area, Cobalt, and lift control boxes." },
  { id: "cobalt-lift", name: "Cobalt Lift", type: "Dock Lift", zone: "Dock", notes: "Cobalt boat lift and newer Sunstream lift control / battery / solar box." },
  { id: "seadoo-lift", name: "SeaDoo Lift", type: "PWC Lift", zone: "Dock", notes: "Sea-Doo lift and older/smaller Sunstream box." },
  { id: "dock-lift", name: "Dock Lift Box", type: "Lift Controls", zone: "Dock", notes: "Additional dock lift box. Keep separate from Cobalt and Sea-Doo lift boxes." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", zone: "Lake", notes: "Seasonal floating water trampoline location." },
  { id: "waterside-lawn-north", name: "Waterside Lawn (North)", type: "Grounds", zone: "Lake", notes: "North / lake-facing lawn and beds." },
  { id: "east-lawn", name: "East Lawn", type: "Grounds", zone: "East", notes: "Large lawn east/south of the sport court." },
  { id: "sport-court", name: "Sport Court", type: "Recreation", zone: "East", notes: "Outdoor sport court north of East Lawn." },
  { id: "veggie-boxes", name: "Veggie Boxes", type: "Grounds", zone: "East", notes: "Three vegetable boxes at the south end of East Lawn near New Garage." },
  { id: "new-garage", name: "New Garage", type: "Building", zone: "Exterior", notes: "New garage / auto court garage area." },
  { id: "old-garage", name: "Old Garage", type: "Building", zone: "Exterior", notes: "Old garage near ADU and covered connection areas." },
  { id: "adu", name: "ADU", type: "Building", zone: "Left of Old Garage", notes: "ADU is a location/map label, not an asset." },
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", zone: "Main House", notes: "Patio with chairs/fire pit between main house, addition, old garage, and covered hallway. Do not label the gray covered hallway itself." },
  { id: "trampoline-dog", name: "Trampoline / Dog", type: "Grounds", zone: "Exterior", notes: "Turf/trampoline/dog cleanup area east of the covered hallway." },
  { id: "exterior", name: "Exterior", type: "Envelope", zone: "2000", notes: "Exterior paint/stain, siding, eaves, deck edges, windows, and envelope checks." },
  { id: "irrigation", name: "Irrigation", type: "Landscape Systems", zone: "Grounds", notes: "Hunter Hydrawise / Advanced Irrigation records, zones, flow/rain/soil sensors." },
  { id: "house-managers-office", name: "House Managers Office", type: "Interior", zone: "Original House", notes: "Office appliance records and house manager operating area." },
  { id: "upstairs-laundry", name: "Upstairs Laundry", type: "Interior", zone: "Original House", notes: "Upstairs laundry washer/dryer and related assets." },
  { id: "pantry", name: "Pantry", type: "Interior", zone: "Original House", notes: "Pantry freezer, storage, and supplies." },
  { id: "wine-room", name: "Wine Room", type: "Interior", zone: "Original House", notes: "Wine room equipment and freezer record." },
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
  { id: "a-all-pro-blinds", name: "A All Pro Blinds", category: "Blinds", notes: "MaintainX vendor import. One contact." },
  { id: "aaa-fire", name: "AAA Fire", category: "Fire / Life Safety", notes: "MaintainX vendor import." },
  { id: "advancedirrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Hydrawise / Hunter HCC 24-zone irrigation controller, sensors, service, and current-year backflow testing." },
  { id: "amazon", name: "Amazon", category: "Parts / Supplies", notes: "HVAC filters and general property supplies." },
  { id: "american-leak-detection", name: "American Leak Detection", category: "Leak Detection", notes: "MaintainX vendor import. Two contacts." },
  { id: "andersen-installation", name: "Andersen Installation inc.", category: "Windows / Doors", notes: "MaintainX vendor import. One contact." },
  { id: "applianceservice", name: "Appliance Service Station", category: "Appliances", notes: "Appliance service vendor." },
  { id: "aqua-dive", name: "Aqua Dive", category: "Waterfront", notes: "MaintainX vendor import. One contact." },
  { id: "aqua-quip", name: "Aqua Quip", category: "Pool / Spa", notes: "MaintainX vendor import." },
  { id: "autonation-ford", name: "AutoNation Ford Bellevue", category: "Vehicle Service", notes: "Ford / Raptor service vendor." },
  { id: "best-plumbing", name: "Best Plumbing", category: "Plumbing", notes: "MaintainX vendor import. One contact." },
  { id: "bosch", name: "Bosch", category: "Appliances", notes: "Bosch dishwasher records." },
  { id: "cascade-spray", name: "Cascade Spray", category: "Exterior / Coatings", notes: "MaintainX vendor import." },
  { id: "consolidated-gutter", name: "Consolidated Gutter and Sheet Metal", category: "Gutters / Sheet Metal", notes: "MaintainX vendor import. One contact." },
  { id: "d-square-energy", name: "D Square Energy", category: "Electrical / Energy", notes: "MaintainX vendor import. One contact." },
  { id: "da-burns", name: "D.A. Burns", category: "Cleaning", notes: "MaintainX vendor import. One contact." },
  { id: "elliottpaint", name: "Elliott Paint Company", category: "Paint / Stain", phone: "206-510-0688", email: "brandon@elliottpaintco.com", notes: "Exterior paint/stain vendor. Brandon Ness contact. Kurt Anderson involved in samples/scope walkthroughs. Invoices #15091, #15159, #15191." },
  { id: "electromatic-refrigeration", name: "Electromatic Refrigeration", category: "Refrigeration", notes: "MaintainX vendor import. One contact." },
  { id: "greater-seattle-floors", name: "Greater Seattle Floors", category: "Flooring", notes: "MaintainX vendor import." },
  { id: "high-tech-living", name: "High Tech Living", category: "Low Voltage / Smart Home", notes: "MaintainX vendor import. One contact." },
  { id: "home-depot", name: "Home Depot", category: "Parts / Supplies", notes: "MaintainX vendor import." },
  { id: "i90motorsports", name: "I-90 Motorsports", category: "PWC / Motorsports", notes: "Sea-Doo service / PWC support." },
  { id: "invisible-fence", name: "Invisible Fence", category: "Dog / Grounds", notes: "MaintainX vendor import." },
  { id: "krisco-pool-spas", name: "Krisco Pool and Spas", category: "Pool / Spa", notes: "MaintainX vendor import." },
  { id: "les-schwab", name: "Les Schwab", category: "Vehicle Tires", notes: "MaintainX vendor import." },
  { id: "luwa", name: "LUWA", category: "HVAC / Specialty", notes: "MaintainX vendor import." },
  { id: "maple-valley-electric", name: "Maple Valley Electric", category: "Electrical", notes: "Electrical vendor." },
  { id: "northwest-custom-cabinets", name: "North West Custom Cabinets", category: "Cabinets", notes: "MaintainX vendor import." },
  { id: "northern-waters", name: "Northern Waters", category: "Backflow / Water", notes: "Prior backflow document vendor." },
  { id: "oryan-marine", name: "O'Ryan Marine", category: "Marine", notes: "MaintainX vendor import." },
  { id: "old-world-handyman", name: "Old World Handyman", category: "Handyman", notes: "MaintainX vendor import." },
  { id: "penthouse-drapery", name: "Penthouse Drapery", category: "Blinds / Drapery", phone: "206-292-8336", email: "accounting@penthousedrapery.com", notes: "Motorized roller shades. Invoice #176396 dated 06/16/2026." },
  { id: "peterclark", name: "Peter Clark Designs", category: "Landscaping", notes: "Weekly landscaping/weeding crew approved by Steve and managed by Pat." },
  { id: "pk-electric", name: "PK Electric", category: "Electrical", notes: "MaintainX vendor import." },
  { id: "precision-garage-door", name: "Precision Garage Door", category: "Garage Doors", notes: "Garage door service vendor." },
  { id: "psf", name: "PSF Mechanical", category: "HVAC / Boiler / Pool Mechanical", notes: "Boilers, hydronic heating, HVAC, Desert Aire, pool mechanical, and related systems." },
  { id: "rave-sports", name: "Rave Sports", category: "Water Recreation", notes: "Water trampoline / lake recreation." },
  { id: "ridings-residential", name: "Ridings Residential", category: "Residential Service", notes: "MaintainX vendor import." },
  { id: "roxy-glass", name: "Roxy Glass", category: "Glass", notes: "MaintainX vendor import." },
  { id: "seaborn-services", name: "Seaborn Services", category: "Dock / Marine", notes: "Dock, lifts, bumpers. DocuSign completed late June 2026. Superintendent Christopher Phillips." },
  { id: "seattleboat", name: "Seattle Boat", category: "Boat Service", notes: "Cobalt R7 service and seasonal watercraft support." },
  { id: "seattle-painting-specialists", name: "Seattle Painting Specialists", category: "Paint", notes: "MaintainX vendor import." },
  { id: "shaw-elevator", name: "Shaw Elevator", category: "Elevator", notes: "MaintainX vendor import." },
  { id: "soil-science", name: "Soil Science", category: "Lawn Treatment", notes: "Lawn treatments / landscaping support." },
  { id: "sound-roofing", name: "Sound Roofing Services", category: "Roofing", notes: "MaintainX vendor import." },
  { id: "supply-house", name: "Supply House", category: "Parts / Supplies", notes: "MaintainX vendor import." },
  { id: "sunstream", name: "Sunstream Boat Lifts", category: "Dock / Lifts", notes: "Sunstream lift boxes and boat/PWC lift records." },
  { id: "toth-construction", name: "Toth Construction", category: "Construction", notes: "MaintainX vendor import." },
  { id: "unrivaled", name: "Unrivaled", category: "Pest Control", notes: "Current pest-control vendor. Terminix was canceled 07/02/2026." },
  { id: "viessmann", name: "Viessmann", category: "Boiler Manufacturer", notes: "Vitodens boilers, Vitotronic cascade, Vitocell DHW tanks." },
  { id: "washington-outdoor-lighting", name: "Washington Outdoor Lighting", category: "Outdoor Lighting", notes: "MaintainX vendor import." },
  { id: "windows-plus", name: "Windows Plus", category: "Windows", notes: "MaintainX vendor import." },
  { id: "wine-enthusiast", name: "Wine Enthusiast", category: "Wine Room", notes: "MaintainX vendor import." },
];

const defaultAssets: AssetRecord[] = [
  { id: "boiler-1", name: "Boiler B-1", locationId: "mechanical-room", category: "Hydronic Heating", status: "Online", make: "Viessmann", model: "Vitodens 200 / 200-W", serial: "758960502925", notes: "Wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE. Nameplate year noted as 2018. MAWP 60 PSI. Max water temp 210°F.", vendorIds: ["psf", "viessmann"] },
  { id: "boiler-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200 / 200-W", serial: "758960507593", notes: "Wall-mounted Viessmann Vitodens 200. Year 2025. MAWP 60 PSI. Max water temp 210°F. Heating surface 31.99 sq ft. Monitor after recall / heat exchanger / igniter issue.", vendorIds: ["psf", "viessmann"] },
  { id: "vitotronic-cascade", name: "Vitotronic 300-K Cascade Control", locationId: "mechanical-room", category: "Hydronic Control", status: "Online", make: "Viessmann", model: "Vitotronic 300-K Series MW2C", notes: "Orange cascade control. Boiler 2 position 1, Boiler 1 position 2. Observed B-1 approx. 106 MBTU/h and B-2 0 MBTU/h.", vendorIds: ["psf", "viessmann"] },
  { id: "low-water-cutoff", name: "McDonnell & Miller GuardDog Low Water Cutoff", locationId: "mechanical-room", category: "Boiler Safety", status: "Online", make: "McDonnell & Miller", model: "GuardDog 751P-MT-120", notes: "Low water cutoff safety device for boiler system.", vendorIds: ["psf"] },
  { id: "vitocell-tank-1", name: "Viessmann Vitocell 300-V DHW Tank 1", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "79 USG / 300 L stainless indirect domestic hot water tank.", vendorIds: ["psf", "viessmann"] },
  { id: "vitocell-tank-2", name: "Viessmann Vitocell 300-V DHW Tank 2", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "Second 79 USG / 300 L stainless indirect domestic hot water tank.", vendorIds: ["psf", "viessmann"] },
  { id: "grundfos-radiant-stations", name: "Grundfos Radiant Floor Pump Stations", locationId: "mechanical-room", category: "Radiant Heat", status: "Online", make: "Grundfos", notes: "Hydronic floor zones via Grundfos pump stations and Vitotronic schedule. TCC MasBathFloor is separate from forced-air.", vendorIds: ["psf"] },
  { id: "carrier-honeywell-zoning", name: "Carrier Forced Air / Honeywell HZ432 Zoning", locationId: "mechanical-room", category: "HVAC", status: "Online", make: "Carrier / Honeywell", model: "HZ432", notes: "Forced-air zoning with outdoor Mitsubishi system. TCC zones include Great Room, Kitchen, Master, Media Room, Wine Room, Upstairs areas, Pantry, Laundry, and others.", vendorIds: ["psf"] },
  { id: "desertaire-dhu1", name: "Desert Aire Indoor Pool Dehumidification", locationId: "pool-equipment", category: "Pool HVAC", status: "Monitor", make: "Desert Aire", notes: "Indoor pool dehumidification system with hydronic heat coil and controls.", vendorIds: ["psf"] },
  { id: "pool-pump-pentair", name: "Pentair Pool Pump", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", notes: "Pool source to pump, Triton II sand filter, UV/ozone, and return to pool.", vendorIds: ["psf", "krisco-pool-spas"] },
  { id: "triton-sand-filter", name: "Triton II Sand Filter", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", model: "Triton II", notes: "Pool sand filter. Track backwash and pressure readings.", vendorIds: ["psf", "krisco-pool-spas"] },
  { id: "pool-uv2", name: "Pool UV2 System", locationId: "pool-equipment", category: "Pool Sanitizing", status: "Monitor", notes: "UV/ozone pool equipment in pool equipment flow.", vendorIds: ["psf", "krisco-pool-spas"] },
  { id: "clearray-ballast", name: "ClearRay UV-C Ballast", locationId: "pool-changing-room", category: "Pool Sanitizing", status: "Monitor", make: "ClearRay", notes: "ClearRay UV-C ballast in pool changing room.", vendorIds: ["krisco-pool-spas"] },
  { id: "sundance-optima", name: "Sundance 880 Optima Spa", locationId: "standalone-spa", category: "Spa", status: "Monitor", make: "Sundance", model: "880 Optima", serial: "00P3LCD-100528521-0315", notes: "Standalone Sundance 880 Optima spa. 240 V 26/40 A. Separate from pool equipment.", vendorIds: ["aqua-quip", "krisco-pool-spas"] },
  { id: "irrigation-controller", name: "Hunter HCC 24-Zone Irrigation Controller", locationId: "irrigation", category: "Irrigation", status: "Online", make: "Hunter", model: "HCC 24 Zones", serial: "06d050377d", notes: "Hydrawise controller name Faben2000. Linked.
