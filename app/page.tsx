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
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function badgeStyle(
  value: Status | ServiceStatus | WorkOrderPriority | PartStatus | Priority
): React.CSSProperties {
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
  { id: "map-water-trampoline", label: "Water Trampoline", category: "Waterfront", x: 47, y: 86
