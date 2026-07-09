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
  | "links"
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

type WorkLinkRecord = {
  id: string;
  name: string;
  category: string;
  vendor?: string;
  url: string;
  logoText: string;
  logoBg: string;
  logoUrl?: string;
  logoColor?: string;
  notes: string;
};

type CalendarColorName = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";
type CalendarRepeat = "None" | "Daily" | "Weekly" | "Monthly" | "Yearly" | "Custom";
type CalendarReminder = "None" | "Morning of" | "Day before" | "Week before";
type CalendarLinkType = "None" | "Asset" | "Location" | "Vendor" | "Work Order";
type CalendarSource = "manual" | "us-holiday" | "jewish-holiday" | "work-order";

type CalendarColor = {
  id: string;
  label: string;
  hex: string;
  colorName?: CalendarColorName;
};

type CalendarItem = {
  id: string;
  date: string;
  time?: string;
  title: string;
  area: string;
  categoryLabel?: string;
  colorId?: string;
  colorName?: CalendarColorName;
  allDay?: boolean;
  repeat?: CalendarRepeat;
  reminder?: CalendarReminder;
  notes?: string;
  linkedType?: CalendarLinkType;
  linkedId?: string;
  linkedName?: string;
  completed?: boolean;
  source?: CalendarSource;
  originalId?: string;
  instanceId?: string;
  status?: ServiceStatus;
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
  parts?: PartRecord[];
  partRecords?: PartRecord[];
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
  { id: "links", label: "Work Links" },
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
  calendar: ["atlas-calendar-v13", "atlas-calendar-v12", "atlas-calendar-v11", "atlas-calendar-v10", "atlas-calendar-v9", "atlas-calendar-v8", "atlas-calendar-v7", "atlas-calendar-v6", "atlas_2000_calendar_safe_v1"],
  calendarColors: ["atlas-calendar-colors-v2", "atlas-calendar-colors-v1"],
  parts: ["atlas-part-records-v2"],
  procedures: ["atlas-procedure-records-v1", "atlas_2000_procedures_safe_v1"],
  photos: ["atlas-photo-records-v10", "atlas-photo-records-v9", "atlas-photo-records-v8", "atlas-photo-records-v7", "atlas-photo-records-v6"],
};

function localISODate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function todayISO() {
  return localISODate();
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

function blankCalendarItem(date = todayISO(), _defaultColorId = "maintenance"): CalendarItem {
  return {
    id: "",
    date,
    time: "",
    title: "",
    area: "",
    categoryLabel: "",
    colorId: "",
    colorName: undefined,
    allDay: false,
    repeat: undefined,
    reminder: undefined,
    notes: "",
    linkedType: undefined,
    linkedId: "",
    linkedName: "",
    completed: false,
    source: "manual",
  };
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
  const rawColorId = String(record.colorId || "") || categoryToColorId(String(record.area || record.categoryLabel || ""));
  const categoryLabel = String(record.categoryLabel || record.area || colorLabelFromColorId(rawColorId) || "Maintenance");
  const colorName = (record.colorName || colorNameFromLegacyColorId(rawColorId)) as CalendarColorName;

  return {
    id: String(record.id || slugify(title)),
    date: String(record.date || todayISO()),
    time: String(record.time || ""),
    title,
    area: categoryLabel,
    categoryLabel,
    colorId: rawColorId || "maintenance",
    colorName,
    allDay: Boolean(record.allDay),
    repeat: record.repeat || "None",
    reminder: record.reminder || "None",
    notes: String(record.notes || ""),
    linkedType: record.linkedType || "None",
    linkedId: String(record.linkedId || ""),
    linkedName: String(record.linkedName || ""),
    completed: Boolean(record.completed || record.status === "Completed"),
    source: record.source || "manual",
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

function byName<T extends { name: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => a.name.localeCompare(b.name));
}

function byTitle<T extends { title: string }>(records: T[]): T[] {
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

function weatherIcon(code: number) {
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function irrigationAdvice(day: WeatherDay) {
  if (day.precipAmount >= 0.25 || day.precipChance >= 75) return "Rain likely — skip irrigation unless pots are dry.";
  if (day.precipAmount >= 0.1 || day.precipChance >= 45) return "Possible rain — check beds before watering.";
  if (day.high >= 82 || day.et0 >= 0.18) return "Hot/dry day — prioritize pots, new plantings, and exposed beds.";
  if (day.windMax >= 18) return "Windy — avoid spray irrigation during peak wind.";
  return "Good yard-work window — normal irrigation check.";
}

function categoryToColorId(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("landscape") || lower.includes("grounds")) return "landscaping";
  if (lower.includes("irrigation") || lower.includes("hydrawise")) return "irrigation";
  if (lower.includes("hvac") || lower.includes("thermostat") || lower.includes("carrier") || lower.includes("honeywell")) return "hvac";
  if (lower.includes("paint") || lower.includes("stain") || lower.includes("elliott")) return "paint-stain";
  if (lower.includes("clean")) return "cleaning";
  if (lower.includes("camera") || lower.includes("security") || lower.includes("unifi") || lower.includes("ubiquiti")) return "security-cameras";
  if (lower.includes("control4") || lower.includes("smart home")) return "smart-home-controls";
  if (lower.includes("boat") || lower.includes("dock") || lower.includes("marine") || lower.includes("seadoo")) return "boat-dock";
  if (lower.includes("waterfront") || lower.includes("waterside")) return "waterfront";
  if (lower.includes("vehicle") || lower.includes("car")) return "vehicles";
  if (lower.includes("interior") || lower.includes("house")) return "house-interior";
  if (lower.includes("exterior")) return "exterior";
  if (lower.includes("supply") || lower.includes("amazon") || lower.includes("order")) return "supplies-orders";
  if (lower.includes("invoice") || lower.includes("accounting") || lower.includes("metaviewer")) return "accounting-invoices";
  if (lower.includes("meeting")) return "meeting";
  if (lower.includes("reminder")) return "reminder";
  if (lower.includes("vendor")) return "vendor";
  if (lower.includes("family")) return "family";
  if (lower.includes("owner") || lower.includes("personal")) return "personal-owner";
  if (lower.includes("work order")) return "work-order";
  if (lower.includes("maintenance") || lower.includes("work")) return "maintenance";
  return "other";
}

const calendarPlainColors: { id: CalendarColorName; label: string; hex: string }[] = [
  { id: "red", label: "Red", hex: "#B42318" },
  { id: "orange", label: "Orange", hex: "#B54708" },
  { id: "yellow", label: "Yellow", hex: "#C99A3D" },
  { id: "green", label: "Green", hex: "#087443" },
  { id: "blue", label: "Blue", hex: "#175CD3" },
  { id: "purple", label: "Purple", hex: "#7C3AED" },
  { id: "gray", label: "Gray", hex: "#475467" },
];

const repeatOptions: CalendarRepeat[] = ["None", "Daily", "Weekly", "Monthly", "Yearly", "Custom"];
const reminderOptions: CalendarReminder[] = ["None", "Morning of", "Day before", "Week before"];
const linkTypeOptions: CalendarLinkType[] = ["None", "Asset", "Location", "Vendor", "Work Order"];

const standardCalendarCategoryLabels = [
  "Maintenance",
  "Vendor",
  "Family",
  "Personal / Owner",
  "Work Order",
  "Holiday",
  "Landscaping",
  "Irrigation",
  "HVAC",
  "Paint / Stain",
  "Cleaning",
  "Security / Cameras",
  "Smart Home / Controls",
  "Boat / Dock",
  "Waterfront",
  "Vehicles",
  "House / Interior",
  "Exterior",
  "Supplies / Orders",
  "Accounting / Invoices",
  "Meeting",
  "Reminder",
  "Other",
];

function plainColor(value?: string) {
  return calendarPlainColors.find((color) => color.id === value) ?? calendarPlainColors.find((color) => color.id === "blue") ?? calendarPlainColors[0];
}

function colorNameFromLegacyColorId(colorId?: string): CalendarColorName {
  if (colorId === "personal-owner") return "yellow";
  if (colorId === "landscaping") return "green";
  if (colorId === "boat-dock") return "blue";
  if (colorId === "vendor") return "purple";
  if (colorId === "maintenance") return "gray";
  return "gray";
}

function colorLabelFromColorId(colorId?: string) {
  return defaultCalendarColors.find((color) => color.id === colorId)?.label || "Other";
}

const defaultCalendarColors: CalendarColor[] = [
  { id: "maintenance", label: "Maintenance", hex: "#475467", colorName: "gray" },
  { id: "vendor", label: "Vendor", hex: "#7C3AED", colorName: "purple" },
  { id: "family", label: "Family", hex: "#175CD3", colorName: "blue" },
  { id: "personal-owner", label: "Personal / Owner", hex: "#C99A3D", colorName: "yellow" },
  { id: "work-order", label: "Work Order", hex: "#175CD3", colorName: "blue" },
  { id: "holiday", label: "Holiday", hex: "#7C3AED", colorName: "purple" },
  { id: "landscaping", label: "Landscaping", hex: "#087443", colorName: "green" },
  { id: "irrigation", label: "Irrigation", hex: "#087443", colorName: "green" },
  { id: "hvac", label: "HVAC", hex: "#175CD3", colorName: "blue" },
  { id: "paint-stain", label: "Paint / Stain", hex: "#B54708", colorName: "orange" },
  { id: "cleaning", label: "Cleaning", hex: "#087443", colorName: "green" },
  { id: "security-cameras", label: "Security / Cameras", hex: "#B42318", colorName: "red" },
  { id: "smart-home-controls", label: "Smart Home / Controls", hex: "#7C3AED", colorName: "purple" },
  { id: "boat-dock", label: "Boat / Dock", hex: "#175CD3", colorName: "blue" },
  { id: "waterfront", label: "Waterfront", hex: "#175CD3", colorName: "blue" },
  { id: "vehicles", label: "Vehicles", hex: "#475467", colorName: "gray" },
  { id: "house-interior", label: "House / Interior", hex: "#C99A3D", colorName: "yellow" },
  { id: "exterior", label: "Exterior", hex: "#087443", colorName: "green" },
  { id: "supplies-orders", label: "Supplies / Orders", hex: "#B54708", colorName: "orange" },
  { id: "accounting-invoices", label: "Accounting / Invoices", hex: "#7C3AED", colorName: "purple" },
  { id: "meeting", label: "Meeting", hex: "#175CD3", colorName: "blue" },
  { id: "reminder", label: "Reminder", hex: "#C99A3D", colorName: "yellow" },
  { id: "other", label: "Other", hex: "#94A3B8", colorName: "gray" },
];

function normalizeCalendarColor(record: Partial<CalendarColor>): CalendarColor {
  const id = String(record.id || uid("color"));
  const colorName = record.colorName || colorNameFromLegacyColorId(id);
  const plain = plainColor(colorName);

  return {
    id,
    label: String(record.label || colorLabelFromColorId(id) || plain.label),
    colorName,
    hex: record.hex || plain.hex,
  };
}

function mergeCalendarColors(storedColors: CalendarColor[]) {
  const merged = new Map<string, CalendarColor>();

  defaultCalendarColors.forEach((color) => merged.set(color.id, normalizeCalendarColor(color)));

  storedColors.forEach((color) => {
    const normalized = normalizeCalendarColor(color);
    merged.set(normalized.id, normalized);
  });

  standardCalendarCategoryLabels.forEach((label) => {
    const exists = Array.from(merged.values()).some((color) => color.label === label);
    if (!exists) {
      const id = slugify(label);
      merged.set(id, normalizeCalendarColor({ id, label, colorName: colorNameFromLegacyColorId(id) }));
    }
  });

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function getNthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, nth: number) {
  const date = new Date(year, monthIndex, 1);
  let count = 0;

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === weekday) {
      count += 1;
      if (count === nth) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }

  return new Date(year, monthIndex, 1);
}

function getLastWeekdayOfMonth(year: number, monthIndex: number, weekday: number) {
  const date = new Date(year, monthIndex + 1, 0);

  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

function getObservedFixedHoliday(year: number, monthIndex: number, day: number) {
  const actual = new Date(year, monthIndex, day);
  const observed = new Date(actual);

  if (actual.getDay() === 6) observed.setDate(actual.getDate() - 1);
  if (actual.getDay() === 0) observed.setDate(actual.getDate() + 1);

  return observed;
}

function makeHolidayEvent(id: string, title: string, date: Date | string, source: CalendarSource, colorName: CalendarColorName): CalendarItem {
  const dateKey = typeof date === "string" ? date : localISODate(date);

  return {
    id,
    date: dateKey,
    time: "",
    title,
    area: "Holiday",
    categoryLabel: "Holiday",
    colorId: "holiday",
    colorName,
    allDay: true,
    repeat: "Yearly",
    reminder: "None",
    notes: source === "jewish-holiday" ? "Jewish holiday shown as an all-day calendar layer." : "US holiday shown as an all-day calendar layer.",
    linkedType: "None",
    completed: false,
    source,
  };
}

function getUsHolidays(year: number): CalendarItem[] {
  const holidays = [
    { title: "New Year’s Day", date: getObservedFixedHoliday(year, 0, 1) },
    { title: "Martin Luther King Jr. Day", date: getNthWeekdayOfMonth(year, 0, 1, 3) },
    { title: "Washington’s Birthday", date: getNthWeekdayOfMonth(year, 1, 1, 3) },
    { title: "Memorial Day", date: getLastWeekdayOfMonth(year, 4, 1) },
    { title: "Juneteenth", date: getObservedFixedHoliday(year, 5, 19) },
    { title: "Independence Day", date: getObservedFixedHoliday(year, 6, 4) },
    { title: "Labor Day", date: getNthWeekdayOfMonth(year, 8, 1, 1) },
    { title: "Columbus Day", date: getNthWeekdayOfMonth(year, 9, 1, 2) },
    { title: "Veterans Day", date: getObservedFixedHoliday(year, 10, 11) },
    { title: "Thanksgiving Day", date: getNthWeekdayOfMonth(year, 10, 4, 4) },
    { title: "Christmas Day", date: getObservedFixedHoliday(year, 11, 25) },
  ];

  return holidays.map((holiday) => makeHolidayEvent(`us-holiday-${year}-${slugify(holiday.title)}`, holiday.title, holiday.date, "us-holiday", "red"));
}

function getHebrewMonthName(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", { day: "numeric", month: "long" }).formatToParts(date);
    return String(parts.find((part) => part.type === "month")?.value || "").toLowerCase();
  } catch {
    return "";
  }
}

function getHebrewDay(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", { day: "numeric", month: "long" }).formatToParts(date);
    return Number(parts.find((part) => part.type === "day")?.value || 0);
  } catch {
    return 0;
  }
}

function jewishHolidayTitleForDate(date: Date) {
  const month = getHebrewMonthName(date);
  const day = getHebrewDay(date);

  if (!month || !day) return "";
  if (month.includes("tish") && day === 1) return "Rosh Hashanah I";
  if (month.includes("tish") && day === 2) return "Rosh Hashanah II";
  if (month.includes("tish") && day === 10) return "Yom Kippur";
  if (month.includes("tish") && day >= 15 && day <= 21) return day === 15 ? "Sukkot I" : "Sukkot";
  if (month.includes("tish") && day === 22) return "Shemini Atzeret";
  if (month.includes("tish") && day === 23) return "Simchat Torah";
  if (month.includes("kislev") && day >= 25) return "Chanukah";
  if (month.includes("tevet") && day <= 3) return "Chanukah";
  if ((month.includes("shevat") || month.includes("shvat")) && day === 15) return "Tu BiShvat";
  if (month.includes("adar ii") && day === 14) return "Purim";
  if (month === "adar" && day === 14) return "Purim";
  if (month.includes("nisan") && day >= 15 && day <= 22) return day === 15 ? "Pesach I" : "Pesach";
  if (month.includes("sivan") && (day === 6 || day === 7)) return day === 6 ? "Shavuot I" : "Shavuot II";
  if (month.includes("av") && day === 9) return "Tisha B’Av";

  return "";
}

function getJewishHolidays(year: number): CalendarItem[] {
  const holidays: CalendarItem[] = [];
  const date = new Date(year, 0, 1, 12);

  while (date.getFullYear() === year) {
    const title = jewishHolidayTitleForDate(date);
    if (title) {
      const dateKey = localISODate(date);
      holidays.push(makeHolidayEvent(`jewish-holiday-${dateKey}-${slugify(title)}`, title, dateKey, "jewish-holiday", "purple"));
    }
    date.setDate(date.getDate() + 1);
  }

  return holidays;
}

function calendarDateValue(date: string) {
  return new Date(`${date}T12:00:00`);
}

function daysBetween(start: string, end: string) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((calendarDateValue(end).getTime() - calendarDateValue(start).getTime()) / oneDay);
}

function isRecurringInstanceOnDate(event: CalendarItem, date: string) {
  if (!event.repeat || event.repeat === "None") return event.date === date;
  if (event.date > date) return false;

  const distance = daysBetween(event.date, date);
  if (distance < 0) return false;
  if (event.repeat === "Daily") return true;
  if (event.repeat === "Weekly" || event.repeat === "Custom") return distance % 7 === 0;

  const original = calendarDateValue(event.date);
  const current = calendarDateValue(date);
  if (event.repeat === "Monthly") return current.getDate() === original.getDate();
  if (event.repeat === "Yearly") return current.getMonth() === original.getMonth() && current.getDate() === original.getDate();

  return event.date === date;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function getWeekCells(cursor: Date) {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const iso = localISODate(date);
    return { key: iso, date: iso, day: date.getDate(), outside: date.getMonth() !== cursor.getMonth() };
  });
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
  { id: "elliottpaint", name: "Elliott Paint Company", category: "Paint / Stain", phone: "206-510-0688", email: "brandon@elliottpaintco.com", notes: "Exterior paint/stain vendor. Brandon Ness contact. Kurt Anderson involved in samples/scope walkthroughs." },
  { id: "peterclark", name: "Peter Clark Designs", category: "Landscaping", notes: "Weekly landscaping/weeding crew approved by Steve and managed by Pat." },
  { id: "psf", name: "PSF Mechanical", category: "HVAC / Boiler / Pool Mechanical", notes: "Boilers, hydronic heating, HVAC, Desert Aire, pool mechanical, and related systems." },
  { id: "seattleboat", name: "Seattle Boat", category: "Boat Service", notes: "Cobalt R7 service and seasonal watercraft support." },
];

const fallbackAssets: AssetRecord[] = [
  { id: "boiler-1", name: "Boiler B-1", locationId: "mechanical-room", category: "Hydronic Heating", status: "Online", make: "Viessmann", model: "Vitodens 200 / 200-W", serial: "758960502925", notes: "Wall-mounted Viessmann Vitodens 200.", vendorIds: ["psf"] },
  { id: "boiler-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200 / 200-W", serial: "758960507593", notes: "Monitor after recall / heat exchanger / igniter issue.", vendorIds: ["psf"] },
  { id: "craft-cobalt", name: "Craft — Cobalt R7", locationId: "dock", category: "Watercraft", status: "Seasonal", make: "Cobalt", model: "R7", serial: "HIN FGE7S0561920", notes: "2020 Cobalt R7. WA WN4528SW.", vendorIds: ["seattleboat"] },
  { id: "irrigation-controller", name: "Hunter HCC 24-Zone Irrigation Controller", locationId: "irrigation", category: "Irrigation", status: "Online", make: "Hunter", model: "HCC 24 Zones", serial: "06d050377d", notes: "Hydrawise controller name Faben2000.", vendorIds: ["advancedirrigation"] },
];

const fallbackWorkOrders: ServiceRecord[] = [
  { id: "wo-pool-weekly", assetId: "boiler-2", vendorId: "psf", date: todayISO(), title: "Boiler 2 recalled heat exchanger / igniter issue", status: "Monitor", priority: "Medium", notes: "Track Boiler B-2 issue." },
  { id: "wo-landscape-weeding", assetId: "irrigation-controller", vendorId: "peterclark", date: todayISO(), title: "Weekly landscaping crew — waterside beds first", status: "Scheduled", priority: "Medium", notes: "Pat manages crew. Priority: waterside beds first." },
];

const fallbackProcedures: ProcedureRecord[] = [
  { id: "weekly-routine", title: "Weekly 5-Day Routine", area: "2000", priority: "High", steps: ["Monday: trash/recycle/yard waste and clean cans.", "Tuesday: grounds/lawn/irrigation and 10 AM meeting.", "Wednesday: pool/spa/fountain/courtyard.", "Thursday: vehicles/dock/boat/Sea-Doo/recreation.", "Friday: final walkthrough/testing/updates and 9 AM meeting."] },
];

const fallbackCalendar: CalendarItem[] = [
  { id: "cal-friday-meeting", date: todayISO(), time: "9:00 AM", title: "Friday 9 AM Steve meeting", area: "Personal / Owner", categoryLabel: "Personal / Owner", colorId: "personal-owner", colorName: "yellow", reminder: "Morning of", repeat: "Weekly", source: "manual" },
  { id: "cal-tuesday-meeting", date: todayISO(), time: "10:00 AM", title: "Tuesday 10 AM Steve / Patrick meeting", area: "Landscaping", categoryLabel: "Landscaping", colorId: "landscaping", colorName: "green", reminder: "Morning of", repeat: "Weekly", source: "manual" },
  { id: "cal-sunstream", date: "2026-07-10", time: "", title: "Sunstream Boat Cover", area: "Boat / Dock", categoryLabel: "Boat / Dock", colorId: "boat-dock", colorName: "blue", allDay: true, repeat: "None", source: "manual" },
  { id: "cal-seaborne", date: "2026-07-13", time: "", title: "SeaBorne Dock Work", area: "Boat / Dock", categoryLabel: "Boat / Dock", colorId: "boat-dock", colorName: "blue", allDay: true, repeat: "None", source: "manual" },
  { id: "cal-carpet-prep", date: "2026-07-21", time: "", title: "Prep Evis Room for Carpet", area: "Other", categoryLabel: "Other", colorId: "other", colorName: "gray", allDay: true, repeat: "None", source: "manual" },
  { id: "cal-flooring", date: "2026-07-22", time: "", title: "5 Star Flooring / Eric — Evi's room", area: "Vendor", categoryLabel: "Vendor", colorId: "vendor", colorName: "purple", allDay: true, repeat: "None", source: "manual" },
];

const fallbackParts: PartRecord[] = [
  { id: "filters-aprilaire-210", name: "Aprilaire #210 4x20x25 Filter", category: "HVAC Filters", locationId: "mechanical-room", vendorId: "amazon", quantity: 1, minQuantity: 1, status: "Low", notes: "Amazon filter record." },
];

const defaultWorkLinks: WorkLinkRecord[] = [
  {
    id: "landscape-help-admin",
    name: "Landscape Help — Admin",
    category: "Atlas / Admin Checklist",
    vendor: "Peter Clark Designs / Landscaping Help",
    url: "/landscape-help",
    logoText: "LH",
    logoBg: "#FFF8E6",
    logoColor: colors.navy,
    notes: "Your private Landscape Help admin page. Use this to review the weekly checklist and copy the current crew link.",
  },
  {
    id: "landscape-help-crew",
    name: "Landscape Help — Crew Link",
    category: "Send to Crew / Public Checklist",
    vendor: "Peter Clark Designs / Landscaping Help",
    url: "https://www.atlas2000.com/landscape-help?token=878c3fa681301e6bd6c8deeb6d3818eb9bb33e5125e02048",
    logoText: "CREW",
    logoBg: "#EAF7F1",
    logoColor: colors.green,
    notes: "Send this exact link to the landscaping crew so they can check off tasks and add notes without full Atlas access.",
  },
  {
    id: "unifi-protect",
    name: "UniFi Protect / Ubiquiti Cameras",
    category: "Security / Cameras",
    vendor: "High Tech Living",
    url: "https://unifi.ui.com/consoles/E438839B47DC00000000075DB1CB0000000007B7A01B00000000640C2817:1458354667/protect/dashboard/all",
    logoText: "UI",
    logoBg: "#EEF6FF",
    logoUrl: "https://unifi.ui.com/favicon.ico",
    logoColor: "#006FFF",
    notes: "Main camera system portal for 2000.",
  },
  {
    id: "hydrawise",
    name: "Hydrawise / Irrigation",
    category: "Irrigation / Grounds",
    vendor: "Advanced Irrigation Inc.",
    url: "https://app.hydrawise.com/config/dashboard",
    logoText: "HW",
    logoBg: "#EAF7F1",
    logoUrl: "https://app.hydrawise.com/favicon.ico",
    logoColor: colors.green,
    notes: "Faben2000 Hunter HCC 24 Zones controller. Serial 06d050377d.",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "Parts / Supplies",
    vendor: "Amazon",
    url: "https://www.amazon.com/",
    logoText: "A",
    logoBg: "#FFF4E5",
    logoUrl: "https://www.amazon.com/favicon.ico",
    logoColor: "#B54708",
    notes: "Property supplies, HVAC filters, parts, tools, and recurring orders.",
  },
  {
    id: "control4",
    name: "Control4 Customer Portal",
    category: "Smart Home / Controls",
    vendor: "High Tech Living",
    url: "https://customer.control4.com/",
    logoText: "C4",
    logoBg: "#F3F0FF",
    logoUrl: "https://customer.control4.com/favicon.ico",
    logoColor: "#5B21B6",
    notes: "Control4 customer portal. Learn more later before relying on it for daily operations.",
  },
  {
    id: "total-connect-comfort",
    name: "Total Connect Comfort / HVAC Zones",
    category: "HVAC / Thermostats / Zones",
    vendor: "Honeywell / Carrier",
    url: "https://mytotalconnectcomfort.com/portal/7560987/Zones",
    logoText: "TCC",
    logoBg: "#FEECEC",
    logoUrl: "https://mytotalconnectcomfort.com/favicon.ico",
    logoColor: colors.red,
    notes: "Main zone control page for the Carrier / Honeywell HVAC zoning system.",
  },
  {
    id: "metaviewer",
    name: "MetaViewer Invoice Search / Approvals",
    category: "Invoices / Approvals / Accounting",
    vendor: "MetaFile Solutions",
    url: "https://arc.metafilesolutions.com/Metaviewer/Account/LogOn?ReturnUrl=%2fMetaViewer%2fIp%3fname%3dMyApprovals&name=MyApprovals",
    logoText: "MV",
    logoBg: "#F1F5F9",
    logoUrl: "https://arc.metafilesolutions.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Invoice search and My Approvals portal.",
  },
];

const documents: DocumentRecord[] = [
  { id: "elliott-invoice-15159", title: "Elliott Paint Invoice #15159", area: "Exterior", type: "Invoice", linkedAssetId: "exterior-stain", linkedVendorId: "elliottpaint", notes: "Invoice dated 06/16/2026. Amount due $17,210.05." },
  { id: "property-map", title: "Locked Atlas Property Map", area: "Map", type: "Image", href: "/atlas-property-map.png", notes: "Fixed original property map image used by Atlas labels." },
];

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
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
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
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

function StatCard(props: { label: string; value: string | number; onClick?: () => void }) {
  return (
    <button type="button" onClick={props.onClick} style={modernStatStyle}>
      <div style={statValueStyle}>{props.value}</div>
      <div style={statLabelStyle}>{props.label}</div>
    </button>
  );
}

function SectionHeader(props: { eyebrow?: string; title?: string; detail?: string; right?: React.ReactNode }) {
  if (!props.eyebrow && !props.title && !props.detail && !props.right) return null;

  return (
    <div style={sectionHeaderStyle}>
      <div style={{ minWidth: 0 }}>
        {props.eyebrow ? <div style={eyebrowStyle}>{props.eyebrow}</div> : null}
        {props.title ? <h2 style={sectionTitleStyle}>{props.title}</h2> : null}
        {props.detail ? <p style={mutedSmallStyle}>{props.detail}</p> : null}
      </div>
      {props.right ? <div style={buttonRowStyle}>{props.right}</div> : null}
    </div>
  );
}

function ListDrawerLayout(props: {
  eyebrow?: string;
  title?: string;
  detail?: string;
  right?: React.ReactNode;
  list: React.ReactNode;
  drawer: React.ReactNode;
  isMobile: boolean;
  outerStyle?: React.CSSProperties;
  listPanelStyleOverride?: React.CSSProperties;
  drawerStyleOverride?: React.CSSProperties;
}) {
  return (
    <section style={props.outerStyle ? { ...sectionStyle, ...props.outerStyle } : sectionStyle}>
      <SectionHeader eyebrow={props.eyebrow} title={props.title} detail={props.detail} right={props.right} />
      <div style={{ ...drawerGridStyle, gridTemplateColumns: props.isMobile ? "1fr" : "minmax(0, 1fr) minmax(330px, 430px)" }}>
        <div style={props.listPanelStyleOverride ? { ...listPanelStyle, ...props.listPanelStyleOverride } : listPanelStyle}>{props.list}</div>
        <div style={props.drawerStyleOverride ? { ...drawerStyle, ...props.drawerStyleOverride } : drawerStyle}>{props.drawer}</div>
      </div>
    </section>
  );
}

export default function AtlasPage() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
  const [calendarColors, setCalendarColors] = useState<CalendarColor[]>(defaultCalendarColors);
  const [partRecords, setPartRecords] = useState<PartRecord[]>(fallbackParts);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  const [selectedAssetId, setSelectedAssetId] = useState(fallbackAssets[0]?.id || "");
  const [selectedVendorId, setSelectedVendorId] = useState(fallbackVendors[0]?.id || "");
  const [selectedServiceId, setSelectedServiceId] = useState(fallbackWorkOrders[0]?.id || "");
  const [selectedProcedureId, setSelectedProcedureId] = useState(fallbackProcedures[0]?.id || "");
  const [selectedPartId, setSelectedPartId] = useState(fallbackParts[0]?.id || "");

  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [calendarDraft, setCalendarDraft] = useState<CalendarItem>(() => blankCalendarItem(todayISO()));
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [showUsHolidays, setShowUsHolidays] = useState(true);
  const [showJewishHolidays, setShowJewishHolidays] = useState(true);
  const [calendarCategoryFilters, setCalendarCategoryFilters] = useState<Record<string, boolean>>({});
  const [calendarIntakeText, setCalendarIntakeText] = useState("");
  const [calendarIntakeMessage, setCalendarIntakeMessage] = useState("");

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
    const storedCalendarColors = readStoredArray<CalendarColor>(storageKeys.calendarColors, defaultCalendarColors);
    const storedParts = readStoredArray<PartRecord>(storageKeys.parts, fallbackParts).map(normalizePart);
    const storedPhotos = readStoredArray<PhotoRecord>(storageKeys.photos, []);

    setMapLabels(byLabel(storedMapLabels.length ? storedMapLabels : defaultMapLabels));
    setSelectedMapLabelId((storedMapLabels[0] ?? defaultMapLabels[0]).id);
    setAssetRecords(storedAssets.length ? byName(storedAssets) : fallbackAssets);
    setVendorRecords(storedVendors.length ? byName(storedVendors) : fallbackVendors);
    setServiceRecords(storedServices.length ? byTitle(storedServices) : fallbackWorkOrders);
    setProcedureRecords(storedProcedures.length ? byTitle(storedProcedures) : fallbackProcedures);
    setCalendarItems(storedCalendar.length ? byTitle(storedCalendar) : fallbackCalendar);
    setCalendarColors(mergeCalendarColors(storedCalendarColors));
    setPartRecords(storedParts.length ? byName(storedParts) : fallbackParts);
    setPhotos(storedPhotos);
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(todayISO()));
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
        const apiParts = Array.isArray(payload.partRecords) ? payload.partRecords : Array.isArray(payload.parts) ? payload.parts : [];
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
        }

        if (apiParts.length) {
          const next = byName(apiParts.map(normalizePart));
          setPartRecords(next);
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
    saveStoredArray(storageKeys.calendarColors[0], calendarColors);
  }, [ready, calendarColors]);

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

  function colorForEvent(event: CalendarItem) {
    const labelRecord = calendarColors.find((color) => color.id === event.colorId);
    const colorName = event.colorName || labelRecord?.colorName || colorNameFromLegacyColorId(event.colorId);
    const plain = plainColor(colorName);

    return {
      id: colorName,
      label: event.categoryLabel || event.area || labelRecord?.label || plain.label,
      hex: plain.hex,
      colorName,
    };
  }

  function selectedColor() {
    const plain = plainColor(calendarDraft.colorName || colorNameFromLegacyColorId(calendarDraft.colorId));
    return { id: plain.id, label: plain.label, hex: plain.hex, colorName: plain.id };
  }

  function categoryForEvent(event: CalendarItem) {
    return event.categoryLabel || event.area || colorForEvent(event).label || "Other";
  }

  function isCategoryVisible(category: string) {
    return calendarCategoryFilters[category] !== false;
  }

  const selectedMapLabel = mapLabels.find((label) => label.id === selectedMapLabelId) ?? mapLabels[0] ?? defaultMapLabels[0];
  const selectedAsset = assetRecords.find((asset) => asset.id === selectedAssetId) ?? assetRecords[0] ?? normalizeAsset({});
  const selectedVendor = vendorRecords.find((vendor) => vendor.id === selectedVendorId) ?? vendorRecords[0] ?? normalizeVendor({});
  const selectedService = serviceRecords.find((service) => service.id === selectedServiceId) ?? serviceRecords[0] ?? normalizeService({});
  const selectedProcedure = procedureRecords.find((procedure) => procedure.id === selectedProcedureId) ?? procedureRecords[0] ?? normalizeProcedure({});
  const selectedPart = partRecords.find((part) => part.id === selectedPartId) ?? partRecords[0] ?? normalizePart({});
  const selectedAssetPhotos = photos.filter((photo) => photo.assetId === selectedAsset.id);
  const selectedWeather = weatherDays.find((day) => day.date === selectedWeatherDate) ?? weatherDays[0];
  const selectedCalendar = calendarDraft;

  const holidayYears = useMemo(() => {
    const year = calendarCursor.getFullYear();
    return [year - 1, year, year + 1];
  }, [calendarCursor]);

  const usHolidayItems = useMemo(() => (showUsHolidays ? holidayYears.flatMap(getUsHolidays) : []), [showUsHolidays, holidayYears]);
  const jewishHolidayItems = useMemo(() => (showJewishHolidays ? holidayYears.flatMap(getJewishHolidays) : []), [showJewishHolidays, holidayYears]);

  const workOrderCalendarItems = useMemo(
    () =>
      serviceRecords
        .filter((record) => record.date)
        .map((record) =>
          normalizeCalendar({
            id: `work-order-${record.id}`,
            date: record.date,
            time: "",
            title: `WO: ${record.title}`,
            area: "Work Order",
            categoryLabel: "Work Order",
            colorId: "work-order",
            colorName: "blue",
            allDay: true,
            repeat: "None",
            reminder: "None",
            notes: record.notes,
            linkedType: "Work Order",
            linkedId: record.id,
            linkedName: record.title,
            completed: record.status === "Completed",
            source: "work-order",
          })
        ),
    [serviceRecords]
  );

  const baseCalendarItems = useMemo(
    () => [...calendarItems, ...workOrderCalendarItems, ...usHolidayItems, ...jewishHolidayItems],
    [calendarItems, workOrderCalendarItems, usHolidayItems, jewishHolidayItems]
  );

  const visibleCalendarItems = useMemo(
    () => baseCalendarItems.filter((item) => isCategoryVisible(categoryForEvent(item))),
    [baseCalendarItems, calendarCategoryFilters, calendarColors]
  );

  const expandedCalendarItems = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const start = localISODate(new Date(year, month - 1, 1));
    const end = localISODate(new Date(year, month + 2, 0));
    const expanded: CalendarItem[] = [];

    visibleCalendarItems.forEach((item) => {
      if (!item.repeat || item.repeat === "None" || item.source !== "manual") {
        expanded.push(item);
        return;
      }

      const date = calendarDateValue(start);
      const finalDate = calendarDateValue(end);
      while (date <= finalDate) {
        const dateKey = localISODate(date);
        if (isRecurringInstanceOnDate(item, dateKey)) {
          expanded.push({ ...item, date: dateKey, originalId: item.id, instanceId: `${item.id}-${dateKey}` });
        }
        date.setDate(date.getDate() + 1);
      }
    });

    return expanded;
  }, [visibleCalendarItems, calendarCursor]);

  const calendarFilterLabels = useMemo(() => {
    const labels = new Set<string>();
    [...defaultCalendarColors, ...calendarColors].forEach((item) => labels.add(item.label));
    baseCalendarItems.forEach((item) => labels.add(categoryForEvent(item)));
    return Array.from(labels).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [baseCalendarItems, calendarColors]);

  const todayEvents = useMemo(() => byTitle(expandedCalendarItems.filter((item) => item.date === todayISO())), [expandedCalendarItems]);

  const selectedDayEvents = useMemo(
    () => byTitle(expandedCalendarItems.filter((item) => item.date === selectedCalendarDate)),
    [expandedCalendarItems, selectedCalendarDate]
  );

  const weatherByDate = useMemo(() => {
    const map = new Map<string, WeatherDay>();
    weatherDays.forEach((day) => map.set(day.date, day));
    return map;
  }, [weatherDays]);

  const upcomingEvents = useMemo(() => {
    const today = todayISO();
    return [...expandedCalendarItems]
      .filter((item) => item.date >= today)
      .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`))
      .slice(0, 6);
  }, [expandedCalendarItems]);

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
    return sorted.filter((item) => [item.title, item.area, item.categoryLabel, item.date, item.time, colorForEvent(item).label, item.notes, item.linkedName].join(" ").toLowerCase().includes(q));
  }, [q, calendarItems, calendarColors]);

  const filteredParts = useMemo(() => {
    const sorted = byName(partRecords);
    if (!q) return sorted;
    return sorted.filter((item) => [item.name, item.category, item.status, item.notes, locationName(item.locationId), assetName(item.assetId), vendorName(item.vendorId)].join(" ").toLowerCase().includes(q));
  }, [q, partRecords, assetRecords, vendorRecords]);

  const filteredWorkLinks = useMemo(() => {
    const sorted = [...defaultWorkLinks].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((item) => [item.name, item.category, item.vendor, item.notes, item.url].join(" ").toLowerCase().includes(q));
  }, [q]);

  const searchResults = useMemo(() => {
    if (!q) return [];
    return buildSearchIndex().filter((item) => [item.type, item.title, item.subtitle, item.detail].join(" ").toLowerCase().includes(q)).slice(0, 12);
  }, [q, mapLabels, assetRecords, vendorRecords, serviceRecords, procedureRecords, calendarItems, partRecords, calendarColors]);

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
      const iso = localISODate(date);
      cells.push({ key: iso, date: iso, day });
    }

    while (cells.length % 7 !== 0) cells.push({ key: `end-${cells.length}`, outside: true });
    return cells;
  }, [calendarCursor]);

  const weekCells = useMemo(() => getWeekCells(calendarCursor), [calendarCursor]);

  function buildSearchIndex(): SearchResult[] {
    return [
      ...locations.map((item) => ({ id: `location-${item.id}`, type: "Location", title: item.name, subtitle: `${item.type} · ${item.zone}`, detail: item.notes, screen: "locations" as Screen })),
      ...mapLabels.map((item) => ({ id: `map-${item.id}`, type: "Map Label", title: item.label, subtitle: item.category, detail: item.notes, screen: "map" as Screen, mapLabelId: item.id })),
      ...assetRecords.map((item) => ({ id: `asset-${item.id}`, type: "Asset", title: item.name, subtitle: `${item.category} · ${locationName(item.locationId)} · ${item.status}`, detail: [item.make, item.model, item.serial, item.notes].join(" "), screen: "assets" as Screen, assetId: item.id })),
      ...vendorRecords.map((item) => ({ id: `vendor-${item.id}`, type: "Vendor", title: item.name, subtitle: item.category, detail: [item.phone, item.email, item.website, item.notes].join(" "), screen: "vendors" as Screen, vendorId: item.id })),
      ...serviceRecords.map((item) => ({ id: `wo-${item.id}`, type: "Work Order", title: item.title, subtitle: `${formatDate(item.date)} · ${item.status} · ${item.priority ?? "Medium"}`, detail: `${assetName(item.assetId)} ${vendorName(item.vendorId)} ${item.notes}`, screen: "history" as Screen, serviceId: item.id })),
      ...procedureRecords.map((item) => ({ id: `procedure-${item.id}`, type: "Procedure", title: item.title, subtitle: `${item.area} · ${item.priority}`, detail: item.steps.join(" "), screen: "procedures" as Screen, procedureId: item.id })),
      ...calendarItems.map((item) => ({ id: `calendar-${item.id}`, type: "Calendar", title: item.title, subtitle: `${formatDate(item.date)} · ${item.allDay ? "All day" : item.time || "No time"} · ${colorForEvent(item).label}`, detail: `${item.area} ${item.notes || ""} ${item.linkedName || ""}`, screen: "calendar" as Screen, calendarId: item.id })),
      ...partRecords.map((item) => ({ id: `part-${item.id}`, type: "Part", title: item.name, subtitle: `${item.category} · Qty ${item.quantity}`, detail: item.notes, screen: "parts" as Screen, partId: item.id })),
      ...defaultWorkLinks.map((item) => ({ id: `link-${item.id}`, type: "Work Link", title: item.name, subtitle: `${item.category}${item.vendor ? ` · ${item.vendor}` : ""}`, detail: `${item.notes} ${item.url}`, screen: "links" as Screen })),
    ];
  }

  function openSearchResult(result: SearchResult) {
    if (result.assetId) setSelectedAssetId(result.assetId);
    if (result.vendorId) setSelectedVendorId(result.vendorId);
    if (result.serviceId) setSelectedServiceId(result.serviceId);
    if (result.mapLabelId) setSelectedMapLabelId(result.mapLabelId);
    if (result.procedureId) setSelectedProcedureId(result.procedureId);
    if (result.calendarId) startEditCalendarItem(result.calendarId);
    if (result.partId) setSelectedPartId(result.partId);
    setScreen(result.screen);
    setQuery("");
    setSearchOpen(false);
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

  function startNewCalendarDraft(date?: string) {
    const targetDate = date || selectedCalendarDate || todayISO();
    setSelectedCalendarDate(targetDate);
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(targetDate));
    setCalendarIntakeText("");
    setCalendarIntakeMessage("");
    setScreen("calendar");
  }

  function startEditCalendarItem(id: string) {
    const event = calendarItems.find((item) => item.id === id);
    if (!event) return;
    const normalized = normalizeCalendar(event);
    setSelectedCalendarId(normalized.id);
    setSelectedCalendarDate(normalized.date);
    setCalendarDraft({ ...normalized });
  }

  function openCalendarItem(event: CalendarItem) {
    if (event.source === "work-order" && event.linkedId) {
      setSelectedServiceId(event.linkedId);
      setScreen("history");
      return;
    }

    if (event.source === "us-holiday" || event.source === "jewish-holiday") {
      setSelectedCalendarDate(event.date);
      setSelectedCalendarId("");
      setCalendarDraft(blankCalendarItem(event.date));
      return;
    }

    startEditCalendarItem(event.originalId || event.id);
  }

  function addCalendarItem(date?: string) {
    startNewCalendarDraft(date);
  }

  function updateCalendarItem(patch: Partial<CalendarItem>) {
    setCalendarDraft((current) => {
      const nextAllDay = patch.allDay ?? current.allDay ?? false;
      const nextCategory = patch.categoryLabel ?? patch.area ?? current.categoryLabel ?? current.area ?? "";
      const nextLinkedType = patch.linkedType ?? current.linkedType;

      const next: CalendarItem = {
        ...current,
        ...patch,
        id: selectedCalendarId || current.id || "",
        title: patch.title ?? current.title ?? "",
        area: nextCategory,
        categoryLabel: nextCategory,
        date: patch.date ?? current.date ?? selectedCalendarDate ?? todayISO(),
        time: nextAllDay ? "" : patch.time ?? current.time ?? "",
        colorId: patch.colorId ?? current.colorId ?? "",
        colorName: patch.colorName ?? current.colorName,
        allDay: nextAllDay,
        repeat: patch.repeat ?? current.repeat,
        reminder: patch.reminder ?? current.reminder,
        notes: patch.notes ?? current.notes ?? "",
        linkedType: nextLinkedType,
        linkedId: patch.linkedId ?? current.linkedId ?? "",
        linkedName: patch.linkedName ?? current.linkedName ?? "",
        completed: patch.completed ?? current.completed ?? false,
        source: "manual",
      };

      if (nextLinkedType === "None" || !nextLinkedType) {
        next.linkedId = "";
        next.linkedName = "";
      }

      if (patch.date) setSelectedCalendarDate(patch.date);

      return next;
    });
  }

  function resetCalendarEntryForm(date = selectedCalendarDate || todayISO()) {
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(date));
    setCalendarIntakeText("");
    setCalendarIntakeMessage("");
  }

  function saveCalendarItem() {
    const record: CalendarItem = normalizeCalendar({
      ...calendarDraft,
      id: selectedCalendarId || uid("cal"),
      title: calendarDraft.title.trim() || "Untitled Calendar Item",
      area: (calendarDraft.categoryLabel || calendarDraft.area || "Maintenance").trim(),
      categoryLabel: (calendarDraft.categoryLabel || calendarDraft.area || "Maintenance").trim(),
      date: calendarDraft.date || selectedCalendarDate || todayISO(),
      time: calendarDraft.allDay ? "" : calendarDraft.time || "",
      colorId: calendarDraft.colorId || categoryToColorId(calendarDraft.categoryLabel || calendarDraft.area || "Maintenance"),
      colorName: calendarDraft.colorName || colorNameFromLegacyColorId(calendarDraft.colorId || categoryToColorId(calendarDraft.categoryLabel || calendarDraft.area || "Maintenance")),
      allDay: !!calendarDraft.allDay,
      repeat: calendarDraft.repeat || "None",
      reminder: calendarDraft.reminder || "None",
      notes: calendarDraft.notes || "",
      linkedType: calendarDraft.linkedType || "None",
      linkedId: calendarDraft.linkedId || "",
      linkedName: calendarDraft.linkedName || "",
      completed: !!calendarDraft.completed,
      source: "manual",
    });

    setCalendarItems((current) => {
      const exists = current.some((item) => item.id === record.id);
      if (exists) return byTitle(current.map((item) => (item.id === record.id ? record : item)));
      return byTitle([record, ...current]);
    });

    const labelExists = calendarColors.some((item) => item.label.toLowerCase() === record.area.toLowerCase());
    if (!labelExists) {
      const plain = plainColor(record.colorName);
      setCalendarColors((current) => [
        ...current,
        { id: slugify(record.area), label: record.area, colorName: record.colorName, hex: plain.hex },
      ]);
    }

    setSelectedCalendarDate(record.date);
    resetCalendarEntryForm(record.date);
    void postAtlasRecord("calendar", record);
  }

  function deleteCalendarItem(id: string) {
    if (!id) {
      setSelectedCalendarId("");
      setCalendarDraft(blankCalendarItem(selectedCalendarDate));
      return;
    }

    const remaining = calendarItems.filter((item) => item.id !== id);
    setCalendarItems(byTitle(remaining));
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(selectedCalendarDate));
  }

  function formatCalendarIntakeTime(hourText: string, minuteText: string | undefined, meridiemText?: string) {
    let hour = Number(hourText);
    const minute = minuteText ? minuteText.padStart(2, "0") : "00";
    const meridiem = meridiemText?.toLowerCase().replace(/\./g, "") || "";

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    const displayHour = hour % 12 || 12;
    const displayMeridiem = hour >= 12 ? "PM" : "AM";

    return `${displayHour}:${minute} ${displayMeridiem}`;
  }

  function dateFromCalendarIntake(text: string) {
    const now = new Date();
    const lower = text.toLowerCase();

    if (lower.includes("tomorrow")) {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      return localISODate(date);
    }

    if (lower.includes("today")) return todayISO();

    const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoMatch) {
      return localISODate(new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 12));
    }

    const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (slashMatch) {
      const yearValue = slashMatch[3] ? Number(slashMatch[3]) : now.getFullYear();
      const fullYear = yearValue < 100 ? 2000 + yearValue : yearValue;
      return localISODate(new Date(fullYear, Number(slashMatch[1]) - 1, Number(slashMatch[2]), 12));
    }

    const monthNames: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };

    const monthMatch = lower.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/);
    if (monthMatch) {
      const year = monthMatch[3] ? Number(monthMatch[3]) : now.getFullYear();
      return localISODate(new Date(year, monthNames[monthMatch[1]], Number(monthMatch[2]), 12));
    }

    return selectedCalendarDate || todayISO();
  }

  function timeFromCalendarIntake(text: string) {
    const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (timeMatch) return formatCalendarIntakeTime(timeMatch[1], timeMatch[2], timeMatch[3]);

    const twentyFourHourMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHourMatch) return formatCalendarIntakeTime(twentyFourHourMatch[1], twentyFourHourMatch[2]);

    return "";
  }

  function titleFromCalendarIntake(text: string) {
    const lines = text
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const firstUsefulLine = lines.find((line) => !/^from:|^to:|^sent:|^subject:/i.test(line)) || lines[0] || "New Calendar Item";
    return firstUsefulLine.replace(/\s+/g, " ").slice(0, 90);
  }

  function categoryFromCalendarIntake(text: string) {
    const lower = text.toLowerCase();

    if (/landscape|weeding|grounds|lawn|irrigation|hydrawise|sprinkler/.test(lower)) {
      return { label: "Landscaping", colorId: "landscaping", colorName: "green" as CalendarColorName };
    }

    if (/boat|dock|cobalt|seadoo|sea-doo|sunstream|seaborne/.test(lower)) {
      return { label: "Boat / Dock", colorId: "boat-dock", colorName: "blue" as CalendarColorName };
    }

    if (/vendor|service|install|repair|estimate|invoice|paint|flooring|plumb|electric|hvac|delivery|appointment/.test(lower)) {
      return { label: "Vendor", colorId: "vendor", colorName: "purple" as CalendarColorName };
    }

    if (/family|school|kids|personal|owner|steve|jessica|jeremy/.test(lower)) {
      return { label: "Personal / Owner", colorId: "personal-owner", colorName: "yellow" as CalendarColorName };
    }

    if (/work order|wo:|maintenance|check|inspect|maintenance/.test(lower)) {
      return { label: "Maintenance", colorId: "maintenance", colorName: "gray" as CalendarColorName };
    }

    return { label: "Maintenance", colorId: "maintenance", colorName: "gray" as CalendarColorName };
  }

  function linkedRecordFromCalendarIntake(text: string) {
    const lower = text.toLowerCase();
    const vendor = vendorRecords.find((record) => record.name && lower.includes(record.name.toLowerCase()));
    if (vendor) return { linkedType: "Vendor" as CalendarLinkType, linkedId: vendor.id, linkedName: vendor.name };

    const asset = assetRecords.find((record) => record.name && lower.includes(record.name.toLowerCase()));
    if (asset) return { linkedType: "Asset" as CalendarLinkType, linkedId: asset.id, linkedName: asset.name };

    const location = locations.find((record) => record.name && lower.includes(record.name.toLowerCase()));
    if (location) return { linkedType: "Location" as CalendarLinkType, linkedId: location.id, linkedName: location.name };

    return { linkedType: "None" as CalendarLinkType, linkedId: "", linkedName: "" };
  }

  function applyCalendarIntake() {
    const text = calendarIntakeText.trim();

    if (!text) {
      setCalendarIntakeMessage("Paste text first.");
      return;
    }

    const date = dateFromCalendarIntake(text);
    const time = timeFromCalendarIntake(text);
    const category = categoryFromCalendarIntake(text);
    const linked = linkedRecordFromCalendarIntake(text);
    const title = titleFromCalendarIntake(text);

    const nextDraft: CalendarItem = {
      ...blankCalendarItem(date, category.colorId),
      id: "",
      date,
      time,
      title,
      area: category.label,
      categoryLabel: category.label,
      colorId: category.colorId,
      colorName: category.colorName,
      allDay: !time,
      repeat: "None",
      reminder: "None",
      notes: text,
      linkedType: linked.linkedType,
      linkedId: linked.linkedId,
      linkedName: linked.linkedName,
      completed: false,
      source: "manual",
    };

    setSelectedCalendarId("");
    setSelectedCalendarDate(date);
    setCalendarCursor(calendarDateValue(date));
    setCalendarDraft(nextDraft);
    setScreen("calendar");
    setCalendarIntakeMessage("Draft ready. Review and save.");
  }

  function updateCalendarColor(id: string, patch: Partial<CalendarColor>) {
    setCalendarColors((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const colorName = patch.colorName ?? item.colorName ?? colorNameFromLegacyColorId(item.id);
        const plain = plainColor(colorName);
        return {
          ...item,
          ...patch,
          label: patch.label ?? item.label,
          colorName,
          hex: plain.hex,
        };
      })
    );
  }

  function addCalendarColor() {
    const newColor: CalendarColor = {
      id: uid("label"),
      label: "New Label",
      colorName: "blue",
      hex: plainColor("blue").hex,
    };
    setCalendarColors((current) => [...current, newColor]);
    setCalendarDraft((current) => ({ ...current, colorId: newColor.id, categoryLabel: newColor.label, area: newColor.label, colorName: newColor.colorName }));
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

  function moveCalendarPeriod(delta: number) {
    if (calendarView === "week") {
      setCalendarCursor((current) => {
        const next = new Date(current);
        next.setDate(current.getDate() + delta * 7);
        return next;
      });
      return;
    }

    moveCalendarMonth(delta);
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

    if (text.includes("link") || text.includes("portal") || text.includes("login")) {
      setAssistantAnswer(`Atlas currently has ${defaultWorkLinks.length} work links loaded: Landscape Help Admin, Landscape Help Crew Link, UniFi Protect, Hydrawise, Amazon, Control4, Total Connect Comfort, and MetaViewer. Open Work Links from the sidebar or dashboard.`);
      return;
    }

    if (text.includes("work") || text.includes("order") || text.includes("service")) {
      setAssistantAnswer(`Atlas currently has ${serviceRecords.length} work orders/service records loaded. Open Work Orders to review them.`);
      return;
    }

    setAssistantAnswer(`Loaded now: ${assetRecords.length} assets, ${vendorRecords.length} vendors, ${serviceRecords.length} work orders, ${procedureRecords.length} procedures, ${calendarItems.length} calendar items, ${partRecords.length} parts, and ${mapLabels.length} map labels.`);
  }

  function renderCalendarIntakeCard() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Calendar Intake"
          title="Text to Calendar"
          detail="Paste scheduling text, make a draft, review it, then save."
          right={<button type="button" onClick={() => setScreen("calendar")} style={secondaryButtonStyle}>Open Calendar</button>}
        />

        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={calendarIntakeText}
            onChange={(event) => setCalendarIntakeText(event.currentTarget.value)}
            placeholder="Paste scheduling text here"
            style={{ ...inputStyle, minHeight: 86, resize: "vertical", fontFamily: "Arial, Helvetica, sans-serif" }}
          />

          <div style={buttonRowStyle}>
            <button type="button" onClick={applyCalendarIntake} style={goldButtonStyle}>
              Make Draft
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarIntakeText("");
                setCalendarIntakeMessage("");
              }}
              style={secondaryButtonStyle}
            >
              Clear
            </button>
          </div>

          {calendarIntakeMessage ? <p style={mutedSmallStyle}>{calendarIntakeMessage}</p> : null}
        </div>
      </section>
    );
  }

  function renderDashboardWorkLinks() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Quick Access"
          title="Work Links"
          detail="Regular work portals with clean logo badges, including Landscape Help admin and the crew link."
          right={<button type="button" onClick={() => setScreen("links")} style={secondaryButtonStyle}>Open All Links</button>}
        />

        <div style={quickLinksGridStyle}>
          {defaultWorkLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" style={quickLinkCardStyle}>
              <span style={{ ...workLinkLogoStyle, background: link.logoBg, color: link.logoColor || colors.navy }}>
                <span style={workLinkLogoFallbackStyle}>{link.logoText}</span>
                {link.logoUrl ? (
                  <img
                    src={link.logoUrl}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    style={workLinkLogoImageStyle}
                  />
                ) : null}
              </span>
              <span style={workLinkTextStyle}>
                <strong>{link.name}</strong>
                <span>{link.category}{link.vendor ? ` · ${link.vendor}` : ""}</span>
              </span>
              <span style={workLinkOpenStyle}>Open</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  function renderDashboardWeather() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Weather / Irrigation"
          title="7-Day Planning Window"
          detail="Placed between Today and Work Orders for irrigation and yard-work planning."
          right={<button type="button" onClick={() => setScreen("weather")} style={secondaryButtonStyle}>Open Weather</button>}
        />

        <div style={dashboardWeatherStripStyle}>
          {weatherDays.length ? (
            weatherDays.map((day) => (
              <button key={day.date} type="button" onClick={() => setScreen("weather")} style={dashboardWeatherDayStyle}>
                <div style={dashboardWeatherTopStyle}>
                  <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</strong>
                  <span style={calendarWeatherIconStyle}>{weatherIcon(day.code)}</span>
                </div>
                <div style={dashboardWeatherTempStyle}>{day.high}° / {day.low}°</div>
                <div style={dashboardWeatherMiniStyle}>Rain {day.precipChance}% · ET0 {day.et0}"</div>
                <p style={dashboardAdviceStyle}>{irrigationAdvice(day)}</p>
              </button>
            ))
          ) : (
            <div style={noticeStyle}>{weatherStatus}</div>
          )}
        </div>
      </section>
    );
  }

  function renderDashboard() {
    const openWorkOrders = serviceRecords.filter((record) => record.status !== "Completed");
    const highPriority = serviceRecords.filter((record) => record.priority === "High" && record.status !== "Completed");

    return (
      <div style={dashboardStackStyle}>
        <div style={statGridStyle}>
          <StatCard label="Assets" value={assetRecords.length} onClick={() => setScreen("assets")} />
          <StatCard label="Vendors" value={vendorRecords.length} onClick={() => setScreen("vendors")} />
          <StatCard label="Open Work Orders" value={openWorkOrders.length} onClick={() => setScreen("history")} />
          <StatCard label="High Priority" value={highPriority.length} onClick={() => setScreen("history")} />
        </div>

        <div style={{ ...dashboardTopGridStyle, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          <section style={sectionStyle}>
            <SectionHeader eyebrow="Calendar / Property Focus" title="Today" />
            <div style={listStyle}>
              {todayEvents.length ? (
                todayEvents.map((event) => {
                  const eventColor = colorForEvent(event);
                  return (
                    <button key={event.instanceId || event.id} type="button" onClick={() => { openCalendarItem(event); if (event.source !== "work-order") setScreen("calendar"); }} style={{ ...todayEventStyle, borderLeftColor: eventColor.hex }}>
                      <div>
                        <strong>{event.title}</strong>
                        <p style={mutedSmallStyle}>{formatDate(event.date)} · {event.allDay ? "All day" : event.time || "No time"} · {categoryForEvent(event)}</p>
                      </div>
                      <span style={{ ...eventColorPillStyle, borderColor: eventColor.hex, color: eventColor.hex }}>{eventColor.label}</span>
                    </button>
                  );
                })
              ) : (
                <div style={noticeStyle}>No calendar items listed for today.</div>
              )}

              <button type="button" onClick={() => addCalendarItem(todayISO())} style={{ ...goldButtonStyle, width: "100%" }}>Add today event</button>
            </div>
          </section>

          <section style={sectionStyle}>
            <SectionHeader eyebrow="Next Scheduled Items" title="Upcoming" />
            <div style={upcomingListStyle}>
              {upcomingEvents.map((event) => {
                const eventColor = colorForEvent(event);
                return (
                  <button key={event.instanceId || event.id} type="button" onClick={() => { openCalendarItem(event); if (event.source !== "work-order") setScreen("calendar"); }} style={upcomingItemStyle}>
                    <span style={{ ...upcomingDotStyle, background: eventColor.hex }} />
                    <div style={upcomingInfoStyle}>
                      <strong>{event.title}</strong>
                      <p style={mutedSmallStyle}>{formatDate(event.date)} · {event.allDay ? "All day" : event.time || "No time"} · {eventColor.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {renderCalendarIntakeCard()}

        {renderDashboardWeather()}

        {renderDashboardWorkLinks()}

        <section style={sectionStyle}>
          <SectionHeader eyebrow="Open / Monitor" title="Work Orders" right={<button type="button" onClick={() => setScreen("history")} style={secondaryButtonStyle}>Open Work Orders</button>} />
          <div style={workOrderStripStyle}>
            {filteredServices.slice(0, 6).map((record) => (
              <button key={record.id} type="button" onClick={() => { setSelectedServiceId(record.id); setScreen("history"); }} style={workOrderCardStyle}>
                <strong>{record.title}</strong>
                <p style={mutedSmallStyle}>{formatDate(record.date)} · {assetName(record.assetId)}</p>
                <div style={buttonRowStyle}>
                  <span style={badgeStyle(record.status)}>{record.status}</span>
                  <span style={badgeStyle(record.priority ?? "Medium")}>{record.priority ?? "Medium"}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
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
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
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
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={fieldLabelStyle}>Asset</span>
                <select value={selectedService.assetId} onChange={(event) => updateWorkOrder({ assetId: event.currentTarget.value })} style={inputStyle}>
                  <option value="">No asset</option>
                  {byName(assetRecords).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
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
    const hasSelectedEvent = Boolean(selectedCalendarId);
    const cells = calendarView === "week" ? weekCells : monthCells;
    const calendarTitle = calendarView === "week" ? `Week of ${formatDate(weekCells[0]?.date || selectedCalendarDate)}` : monthName(calendarCursor);

    const linkedOptions = (() => {
      if (selectedCalendar.linkedType === "Asset") return byName(assetRecords).map((item) => ({ id: item.id, name: item.name }));
      if (selectedCalendar.linkedType === "Location") return [...locations].sort((a, b) => a.name.localeCompare(b.name)).map((item) => ({ id: item.id, name: item.name }));
      if (selectedCalendar.linkedType === "Vendor") return byName(vendorRecords).map((item) => ({ id: item.id, name: item.name }));
      if (selectedCalendar.linkedType === "Work Order") return byTitle(serviceRecords).map((item) => ({ id: item.id, name: item.title }));
      return [];
    })();

    return (
      <ListDrawerLayout
        eyebrow=""
        title=""
        detail={undefined}
        isMobile={isMobile}
        outerStyle={calendarNavyShellStyle}
        listPanelStyleOverride={calendarWhitePanelStyle}
        drawerStyleOverride={calendarWhiteDrawerStyle}
        right={
          <>
            <button type="button" onClick={() => moveCalendarPeriod(-1)} style={secondaryButtonStyle}>
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                setCalendarCursor(new Date());
                setSelectedCalendarDate(todayISO());
                setSelectedCalendarId("");
                setCalendarDraft(blankCalendarItem(todayISO()));
              }}
              style={secondaryButtonStyle}
            >
              Today
            </button>
            <button type="button" onClick={() => moveCalendarPeriod(1)} style={secondaryButtonStyle}>
              Next
            </button>
          </>
        }
        list={
          <div style={stackStyle}>
            <div style={calendarControlPanelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={calendarHeaderStyle}>{calendarTitle}</div>
                <div style={buttonRowStyle}>
                  <button type="button" onClick={() => setCalendarView("month")} style={calendarView === "month" ? goldButtonStyle : secondaryButtonStyle}>Month</button>
                  <button type="button" onClick={() => setCalendarView("week")} style={calendarView === "week" ? goldButtonStyle : secondaryButtonStyle}>Week</button>
                </div>
              </div>

              <details style={calendarFilterDropdownStyle}>
                <summary style={calendarFilterSummaryStyle}>Filters</summary>
                <div style={calendarFilterListStyle}>
                  <label style={calendarFilterListItemStyle}>
                    <input type="checkbox" checked={showUsHolidays} onChange={() => setShowUsHolidays((current) => !current)} />
                    US Holidays
                  </label>
                  <label style={calendarFilterListItemStyle}>
                    <input type="checkbox" checked={showJewishHolidays} onChange={() => setShowJewishHolidays((current) => !current)} />
                    Jewish Holidays
                  </label>
                  {calendarFilterLabels.map((label) => (
                    <label key={label} style={calendarFilterListItemStyle}>
                      <input
                        type="checkbox"
                        checked={calendarCategoryFilters[label] !== false}
                        onChange={() => {
                          setCalendarCategoryFilters((current) => ({
                            ...current,
                            [label]: current[label] === false,
                          }));
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </details>
            </div>

            <div style={calendarWeekStyle}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} style={calendarDayNameStyle}>
                  {day}
                </div>
              ))}
            </div>

            <div style={calendarGridStyle}>
              {cells.map((cell) => {
                const events = cell.date ? expandedCalendarItems.filter((item) => item.date === cell.date) : [];
                const isToday = cell.date === todayISO();
                const isSelected = cell.date === selectedCalendarDate;
                const dayWeather = cell.date ? weatherByDate.get(cell.date) : undefined;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!cell.date}
                    onClick={() => {
                      if (!cell.date) return;
                      setSelectedCalendarDate(cell.date);
                      setSelectedCalendarId("");
                      setCalendarDraft(blankCalendarItem(cell.date));
                    }}
                    style={{
                      ...calendarCellStyle,
                      opacity: cell.outside ? 0.55 : 1,
                      borderColor: isSelected ? colors.gold : isToday ? colors.gold2 : colors.line,
                      background: isSelected ? "#FFFAEB" : isToday ? "#FFFDF3" : "#FFFFFF",
                      boxShadow: isSelected ? "0 12px 28px rgba(201,154,61,0.18)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <strong>{cell.day ?? ""}</strong>
                      {dayWeather ? (
                        <span title={weatherText(dayWeather.code)} style={calendarWeatherIconStyle}>
                          {weatherIcon(dayWeather.code)}
                        </span>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                      {events.slice(0, 3).map((event) => {
                        const eventColor = colorForEvent(event);
                        return (
                          <span
                            key={event.instanceId || event.id}
                            onClick={(mouseEvent) => {
                              mouseEvent.stopPropagation();
                              openCalendarItem(event);
                            }}
                            style={{
                              ...calendarPillStyle,
                              borderLeft: `5px solid ${eventColor.hex}`,
                              color: event.completed ? colors.muted : eventColor.hex,
                              textDecoration: event.completed ? "line-through" : "none",
                              background: "#F8FAFC",
                            }}
                          >
                            {event.title}
                          </span>
                        );
                      })}

                      {events.length > 3 ? <span style={calendarMoreStyle}>+{events.length - 3} more</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        }
        drawer={
          <>
            <div style={eyebrowStyle}>Selected Day</div>
            <h3 style={detailTitleStyle}>{formatDate(selectedCalendarDate)}</h3>

            <div style={calendarTodayBoxStyle}>
              <div style={eyebrowStyle}>Scheduled</div>

              {selectedDayEvents.length ? (
                selectedDayEvents.map((event) => {
                  const eventColor = colorForEvent(event);
                  return (
                    <button
                      key={event.instanceId || event.id}
                      type="button"
                      onClick={() => openCalendarItem(event)}
                      style={{
                        ...calendarTodayItemStyle,
                        borderColor: (event.originalId || event.id) === selectedCalendarId ? eventColor.hex : colors.line,
                        opacity: event.completed ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ ...calendarColorDotStyle, background: eventColor.hex }} />
                        <div>
                          <strong style={{ textDecoration: event.completed ? "line-through" : "none" }}>{event.title}</strong>
                          <span>
                            {event.allDay ? "All day" : event.time || "No time"} · {eventColor.label}
                          </span>
                          {event.repeat && event.repeat !== "None" && event.source === "manual" ? <span>Repeats {event.repeat}</span> : null}
                          {event.linkedType && event.linkedType !== "None" && event.linkedName ? <span>Linked: {event.linkedName}</span> : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p style={mutedSmallStyle}>Nothing scheduled for this day.</p>
              )}
            </div>

            <div style={compactAddBoxStyle}>
              <button
                type="button"
                onClick={() => addCalendarItem(selectedCalendarDate)}
                style={{ ...goldButtonStyle, width: "100%" }}
              >
                Add Event
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={eyebrowStyle}>{hasSelectedEvent ? "Edit Event" : "New Event"}</div>
              <h3 style={detailTitleStyle}>{hasSelectedEvent ? selectedCalendar.title : "Ready to add event"}</h3>

              <div style={formGridStyle}>
                <Field label="Title" value={selectedCalendar.title} onChange={(value) => updateCalendarItem({ title: value })} placeholder="Type event title..." />
                <Field
                  label="Date"
                  value={selectedCalendar.date}
                  onChange={(value) => {
                    updateCalendarItem({ date: value });
                    setSelectedCalendarDate(value);
                  }}
                />
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Time</span>
                  <input
                    value={selectedCalendar.time || ""}
                    disabled={!!selectedCalendar.allDay}
                    onChange={(event) => updateCalendarItem({ time: event.currentTarget.value })}
                    placeholder="Optional"
                    style={{ ...inputStyle, background: selectedCalendar.allDay ? "#EEF2F6" : "#FFFFFF" }}
                  />
                </label>
                <label style={checkboxLineStyle}>
                  <input
                    type="checkbox"
                    checked={!!selectedCalendar.allDay}
                    onChange={(event) => updateCalendarItem({ allDay: event.currentTarget.checked })}
                  />
                  All-day event
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Category</span>
                  <select
                    value={selectedCalendar.categoryLabel || selectedCalendar.area || ""}
                    onChange={(event) => {
                      const nextLabel = event.currentTarget.value;
                      const matchingColor = calendarColors.find((color) => color.label === nextLabel);
                      updateCalendarItem({
                        categoryLabel: nextLabel,
                        area: nextLabel,
                        colorId: matchingColor?.id || categoryToColorId(nextLabel),
                        colorName: matchingColor?.colorName,
                      });
                    }}
                    style={inputStyle}
                  >
                    <option value="">Select category</option>
                    {Array.from(new Set([...standardCalendarCategoryLabels, ...calendarColors.map((color) => color.label)]))
                      .filter(Boolean)
                      .sort((a, b) => a.localeCompare(b))
                      .map((label) => <option key={label} value={label}>{label}</option>)}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Color</span>
                  <select value={selectedCalendar.colorName || ""} onChange={(event) => updateCalendarItem({ colorName: event.currentTarget.value as CalendarColorName })} style={inputStyle}>
                    <option value="">Select color</option>
                    {calendarPlainColors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Repeat</span>
                  <select value={selectedCalendar.repeat || ""} onChange={(event) => updateCalendarItem({ repeat: event.currentTarget.value as CalendarRepeat })} style={inputStyle}>
                    <option value="">No repeat</option>
                    {repeatOptions.filter((option) => option !== "None").map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Reminder</span>
                  <select value={selectedCalendar.reminder || ""} onChange={(event) => updateCalendarItem({ reminder: event.currentTarget.value as CalendarReminder })} style={inputStyle}>
                    <option value="">No reminder</option>
                    {reminderOptions.filter((option) => option !== "None").map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Attach To</span>
                  <select value={selectedCalendar.linkedType || ""} onChange={(event) => updateCalendarItem({ linkedType: event.currentTarget.value as CalendarLinkType, linkedId: "", linkedName: "" })} style={inputStyle}>
                    <option value="">No attachment</option>
                    {linkTypeOptions.filter((option) => option !== "None").map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Linked Record</span>
                  <select
                    value={selectedCalendar.linkedId || ""}
                    disabled={!selectedCalendar.linkedType || selectedCalendar.linkedType === "None"}
                    onChange={(event) => {
                      const option = linkedOptions.find((item) => item.id === event.currentTarget.value);
                      updateCalendarItem({ linkedId: event.currentTarget.value, linkedName: option?.name || "" });
                    }}
                    style={{ ...inputStyle, background: !selectedCalendar.linkedType || selectedCalendar.linkedType === "None" ? "#EEF2F6" : "#FFFFFF" }}
                  >
                    <option value="">No linked record</option>
                    {linkedOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </label>

                <Field label="Notes / Details" value={selectedCalendar.notes || ""} onChange={(value) => updateCalendarItem({ notes: value })} multiline placeholder="Optional notes" />

                <label style={checkboxLineStyle}>
                  <input
                    type="checkbox"
                    checked={!!selectedCalendar.completed}
                    onChange={(event) => updateCalendarItem({ completed: event.currentTarget.checked })}
                  />
                  Completed
                </label>
              </div>

              <div style={buttonRowStyle}>
                <button type="button" onClick={saveCalendarItem} style={goldButtonStyle}>
                  Save
                </button>

                {hasSelectedEvent ? (
                  <button type="button" onClick={() => deleteCalendarItem(selectedCalendarId)} style={dangerButtonStyle}>
                    Delete
                  </button>
                ) : null}
              </div>
            <div style={{ ...calendarColorsBoxStyle, marginTop: 14, padding: 14 }}>
              <div style={eyebrowStyle}>Text to Calendar</div>
              <textarea
                value={calendarIntakeText}
                onChange={(event) => setCalendarIntakeText(event.currentTarget.value)}
                placeholder="Paste scheduling text here"
                style={{ ...inputStyle, minHeight: 58, resize: "vertical", fontFamily: "Arial, Helvetica, sans-serif" }}
              />
              <div style={{ ...buttonRowStyle, marginTop: 8 }}>
                <button type="button" onClick={applyCalendarIntake} style={goldButtonStyle}>Make Draft</button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarIntakeText("");
                    setCalendarIntakeMessage("");
                  }}
                  style={secondaryButtonStyle}
                >
                  Clear
                </button>
              </div>
              {calendarIntakeMessage ? <p style={mutedSmallStyle}>{calendarIntakeMessage}</p> : null}
            </div>

            </div>

            <div style={calendarColorsBoxStyle}>
              <div style={eyebrowStyle}>Categories</div>
              <p style={mutedSmallStyle}>Use the Category dropdown above. Add more categories later only if needed.</p>
            </div>
          </>
        }
      />
    );
  }

  function renderWeather() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="7-Day Forecast"
          title="Weather / Irrigation Planning"
          detail="Real 7-day forecast with irrigation recommendations."
          right={<button type="button" onClick={() => void loadWeather()} style={goldButtonStyle}>Refresh Weather</button>}
        />

        <div style={stackStyle}>
          <div style={noticeStyle}>
            <strong>{weatherStatus}</strong>
            <p style={mutedSmallStyle}>
              Forecast location is the 2000 area. Uses rain chance, rain amount, wind, and ET0 for irrigation planning.
            </p>
          </div>

          <div style={weatherStripStyle}>
            {weatherDays.map((day) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedWeatherDate(day.date)}
                style={{
                  ...weatherCardStyle,
                  borderColor: day.date === selectedWeather?.date ? colors.gold : colors.line,
                  boxShadow:
                    day.date === selectedWeather?.date
                      ? "0 18px 38px rgba(201,154,61,0.24)"
                      : "0 12px 26px rgba(15,23,42,0.06)",
                }}
              >
                <div style={weatherCardTopStyle}>
                  <div>
                    <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</strong>
                    <p style={mutedSmallStyle}>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div style={weatherIconStyle}>{weatherIcon(day.code)}</div>
                </div>

                <div style={weatherTempStyle}>{day.high}°</div>
                <div style={weatherLowStyle}>{day.low}° low</div>

                <div style={weatherBarTrackStyle}>
                  <div style={{ ...weatherBarFillStyle, width: `${Math.max(12, Math.min(100, day.precipChance))}%` }} />
                </div>

                <div style={weatherMiniGridStyle}>
                  <span>Rain {day.precipChance}%</span>
                  <span>{day.precipAmount}"</span>
                  <span>Wind {day.windMax}</span>
                  <span>ET0 {day.et0}"</span>
                </div>

                <p style={weatherAdviceSmallStyle}>{irrigationAdvice(day)}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
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

  function renderWorkLinks() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Quick Access"
          title="Work Links"
          detail="Regularly used work portals for Landscape Help admin, the crew checklist link, cameras, irrigation, supplies, smart-home controls, HVAC zones, and invoices."
        />

        <div style={workLinksPageGridStyle}>
          {filteredWorkLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer" style={workLinkPageCardStyle}>
              <span style={{ ...workLinkLogoLargeStyle, background: link.logoBg, color: link.logoColor || colors.navy }}>
                <span style={workLinkLogoFallbackStyle}>{link.logoText}</span>
                {link.logoUrl ? (
                  <img
                    src={link.logoUrl}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    style={workLinkLogoImageLargeStyle}
                  />
                ) : null}
              </span>

              <span style={workLinkPageBodyStyle}>
                <strong>{link.name}</strong>
                <span>{link.category}{link.vendor ? ` · ${link.vendor}` : ""}</span>
                <small>{link.notes}</small>
              </span>

              <span style={workLinkOpenLargeStyle}>Open</span>
            </a>
          ))}
        </div>

        <div style={{ ...noticeStyle, marginTop: 14 }}>
          <strong>Logo note:</strong>
          <p style={mutedSmallStyle}>These use company favicon/logo images when available, with clean fallback badges if an image does not load. Real uploaded logos can replace them later without changing the link layout.</p>
        </div>
      </section>
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
    if (screen === "links") return renderWorkLinks();
    return renderAssistant();
  }

  return (
    <main style={appStyle}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "260px 1fr", minHeight: "100vh" }}>
        <aside style={{ ...sidebarStyle, position: isMobile ? "static" : "sticky", height: isMobile ? "auto" : "100vh" }}>
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
              <div style={brandSubStyle}>2000 Estate Systems</div>
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
                  background: screen === item.id ? colors.gold : "rgba(255,255,255,0.04)",
                  color: screen === item.id ? colors.navy : "#FFFFFF",
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
              <div style={{ minWidth: 0 }}>
                <div style={eyebrowStyle}>Private Property Command Center</div>
                <h1 style={pageTitleStyle}>{screen === "dashboard" ? "Atlas / 2000" : screens.find((item) => item.id === screen)?.label}</h1>
                {screen === "dashboard" ? <p style={headerSubStyle}>{databaseStatus}</p> : null}
              </div>

              <div
                style={{ position: "relative", width: isMobile ? "100%" : 480, maxWidth: "100%" }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setQuery("");
                    setSearchOpen(false);
                  }, 120);
                }}
              >
                <input
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setQuery("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search Atlas..."
                  style={{ ...inputStyle, width: "100%" }}
                />
                {searchOpen && searchResults.length ? (
                  <div style={searchDropStyle}>
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          openSearchResult(result);
                          setSearchOpen(false);
                        }}
                        style={searchResultStyle}
                      >
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
  padding: 22,
  top: 0,
  overflow: "auto",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 24,
};

const logoBoxStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background: colors.gold,
  border: `1px solid ${colors.gold}`,
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
  fontSize: 21,
  color: colors.navy,
};

const brandTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 23,
  letterSpacing: 1.4,
};

const brandSubStyle: React.CSSProperties = {
  color: "#D6E2EE",
  fontSize: 12,
  fontWeight: 850,
};

const navButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 13,
  padding: "13px 14px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 950,
};

const topbarStyle: React.CSSProperties = {
  background: "transparent",
  padding: "26px 24px 6px",
};

const pageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 32,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const headerSubStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  margin: "5px 0 0",
  lineHeight: 1.4,
};

const dashboardStackStyle: React.CSSProperties = { display: "grid", gap: 14 };
const stackStyle: React.CSSProperties = { display: "grid", gap: 16 };
const listStyle: React.CSSProperties = { display: "grid", gap: 10 };
const buttonRowStyle: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };

const calendarNavyShellStyle: React.CSSProperties = {
  background: colors.navy,
  border: `1px solid ${colors.navy3}`,
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 22px 55px rgba(7,27,47,0.22)",
};

const calendarWhitePanelStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 22,
  padding: 16,
  boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
};

const calendarWhiteDrawerStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 22,
  boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
};

const sectionStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  marginBottom: 14,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
};

const modernStatStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 18,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 16px 38px rgba(15,23,42,0.05)",
};

const statLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const statValueStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 31,
  fontWeight: 950,
  lineHeight: 1.05,
  letterSpacing: "-0.04em",
};

const dashboardTopGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  alignItems: "start",
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
  top: 18,
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
  overflowX: "hidden",
  boxShadow: "0 16px 35px rgba(15,23,42,0.06)",
  minWidth: 0,
  wordBreak: "break-word",
};

const detailTitleStyle: React.CSSProperties = {
  margin: "4px 0 14px",
  color: colors.navy,
  fontSize: 23,
  fontWeight: 950,
  letterSpacing: "-0.03em",
  wordBreak: "break-word",
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.8,
  textTransform: "uppercase",
};

const mutedSmallStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  margin: "4px 0 0",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const fieldLabelStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
};

const inputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 14,
  color: colors.text,
  background: "#FFFFFF",
  outline: "none",
  fontFamily: "inherit",
  minWidth: 0,
  fontWeight: 750,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 11,
  marginBottom: 14,
  minWidth: 0,
};

const rowButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 14,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  boxShadow: "0 10px 26px rgba(15,23,42,0.035)",
  minWidth: 0,
  overflow: "hidden",
  wordBreak: "break-word",
};

const rowStaticStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 14,
  color: colors.text,
  boxShadow: "0 10px 26px rgba(15,23,42,0.035)",
  minWidth: 0,
  wordBreak: "break-word",
};

const goldButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
  color: colors.navy,
  borderRadius: 13,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  borderRadius: 13,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #FACACA",
  background: "#FEECEC",
  color: colors.red,
  borderRadius: 13,
  padding: "10px 13px",
  fontWeight: 950,
  cursor: "pointer",
};

const noticeStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 14,
  color: colors.text,
  lineHeight: 1.5,
  minWidth: 0,
  wordBreak: "break-word",
};

const todayEventStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  border: `1px solid ${colors.line}`,
  borderLeft: "5px solid",
  background: "#FFFFFF",
  borderRadius: 15,
  padding: 14,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  minWidth: 0,
};

const eventColorPillStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 950,
  background: "#FFFFFF",
  whiteSpace: "nowrap",
};

const upcomingListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const upcomingItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.text,
  borderRadius: 15,
  padding: 13,
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  fontFamily: "inherit",
};

const upcomingDotStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: 999,
  flex: "0 0 auto",
};

const upcomingInfoStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  minWidth: 0,
  width: "100%",
};

const dashboardWeatherStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(145px, 1fr))",
  gap: 10,
  overflowX: "auto",
  paddingBottom: 4,
};

const dashboardWeatherDayStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 15,
  padding: 12,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  fontFamily: "inherit",
};

const dashboardWeatherTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const dashboardWeatherTempStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 950,
  color: colors.navy,
};

const dashboardWeatherMiniStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 850,
  color: colors.muted,
};

const dashboardAdviceStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.3,
  margin: 0,
  color: colors.text,
};

const workOrderStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
};

const workOrderCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.text,
  borderRadius: 15,
  padding: 14,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  display: "grid",
  gap: 8,
};

const quickLinksGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 10,
};

const quickLinkCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.text,
  borderRadius: 16,
  padding: 12,
  textDecoration: "none",
  boxShadow: "0 10px 26px rgba(15,23,42,0.035)",
  minWidth: 0,
};

const workLinkLogoStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 13,
  display: "grid",
  placeItems: "center",
  fontSize: 13,
  fontWeight: 950,
  letterSpacing: 0.4,
  flex: "0 0 auto",
  overflow: "hidden",
};

const workLinkLogoFallbackStyle: React.CSSProperties = {
  gridArea: "1 / 1",
};

const workLinkLogoImageStyle: React.CSSProperties = {
  gridArea: "1 / 1",
  width: 28,
  height: 28,
  objectFit: "contain",
  background: "transparent",
};

const workLinkTextStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  minWidth: 0,
  fontSize: 13,
};

const workLinkOpenStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  padding: "6px 10px",
  color: colors.navy,
  background: colors.panel,
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const workLinksPageGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 12,
};

const workLinkPageCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "56px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 14,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.text,
  borderRadius: 18,
  padding: 15,
  textDecoration: "none",
  boxShadow: "0 12px 28px rgba(15,23,42,0.045)",
  minWidth: 0,
};

const workLinkLogoLargeStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
  fontWeight: 950,
  letterSpacing: 0.5,
  overflow: "hidden",
};

const workLinkLogoImageLargeStyle: React.CSSProperties = {
  gridArea: "1 / 1",
  width: 36,
  height: 36,
  objectFit: "contain",
  background: "transparent",
};

const workLinkPageBodyStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  fontSize: 14,
};

const workLinkOpenLargeStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  borderRadius: 999,
  padding: "8px 12px",
  color: colors.navy,
  background: "#FFFAEB",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const dashboardWeatherBoxStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 18,
  padding: 16,
};

const dashboardWeatherIconStyle: React.CSSProperties = {
  fontSize: 42,
  width: 62,
  height: 62,
  borderRadius: 18,
  background: "#FFFAEB",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
};

const mapShellStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
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
  borderRadius: 16,
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

const calendarControlPanelStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
  display: "grid",
  gap: 12,
};

const calendarFilterStripStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const calendarToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  borderRadius: 999,
  padding: "7px 10px",
  color: colors.text,
  fontSize: 12,
  fontWeight: 850,
  whiteSpace: "nowrap",
};

const calendarFilterDropdownStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  borderRadius: 14,
  padding: 0,
  overflow: "hidden",
};

const calendarFilterSummaryStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "11px 13px",
  color: colors.navy,
  fontSize: 13,
  fontWeight: 950,
  listStyle: "none",
};

const calendarFilterListStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  borderTop: `1px solid ${colors.line}`,
  padding: 10,
  maxHeight: 260,
  overflow: "auto",
  background: "#FFFFFF",
};

const calendarFilterListItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: colors.text,
  fontSize: 13,
  fontWeight: 800,
  padding: "6px 4px",
};

const checkboxLineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 13,
  padding: "11px 12px",
  color: colors.text,
  fontSize: 13,
  fontWeight: 850,
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
  minHeight: 120,
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

const calendarWeatherIconStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "#FFFAEB",
  display: "grid",
  placeItems: "center",
  fontSize: 14,
  flex: "0 0 auto",
};

const calendarTodayBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
  marginBottom: 14,
};

const calendarTodayItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  border: `1px solid ${colors.line}`,
  background: "#F8FAFC",
  color: colors.text,
  borderRadius: 14,
  padding: 10,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const calendarColorDotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  flex: "0 0 auto",
};

const compactAddBoxStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
};

const calendarColorsBoxStyle: React.CSSProperties = {
  marginTop: 18,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
};

const calendarColorListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: 10,
};

const calendarColorRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "46px 1fr",
  gap: 8,
  alignItems: "center",
};

const actualColorInputStyle: React.CSSProperties = {
  width: 46,
  height: 40,
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  padding: 3,
  background: "#FFFFFF",
  cursor: "pointer",
};

const weatherStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(165px, 1fr))",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 8,
};

const weatherCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 20,
  padding: 15,
  minHeight: 250,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  fontFamily: "inherit",
  display: "grid",
  gap: 10,
  minWidth: 0,
};

const weatherCardTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const weatherIconStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  borderRadius: 18,
  background: "#FFFAEB",
  display: "grid",
  placeItems: "center",
  fontSize: 28,
};

const weatherTempStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 38,
  fontWeight: 950,
  lineHeight: 1,
  letterSpacing: "-0.04em",
};

const weatherLowStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: 800,
};

const weatherBarTrackStyle: React.CSSProperties = {
  height: 9,
  borderRadius: 999,
  background: "#EAF0F7",
  overflow: "hidden",
};

const weatherBarFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: colors.gold,
};

const weatherMiniGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 800,
};

const weatherAdviceSmallStyle: React.CSSProperties = {
  color: colors.text,
  fontSize: 12,
  lineHeight: 1.35,
  margin: 0,
  wordBreak: "break-word",
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
