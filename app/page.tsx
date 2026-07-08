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
type Priority = "Low" | "Medium" | "High";

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  zone: string;
  notes: string;
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

type WorkOrderRecord = {
  id: string;
  assetId: string;
  vendorId?: string;
  date: string;
  title: string;
  status: ServiceStatus;
  priority: Priority;
  notes: string;
  followUpDate?: string;
};

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  area: string;
  status: ServiceStatus;
};

type ProcedureRecord = {
  id: string;
  title: string;
  area: string;
  priority: "High" | "Normal" | "Seasonal";
  steps: string[];
};

type DocumentRecord = {
  id: string;
  title: string;
  area: string;
  type: string;
  linkedAssetId?: string;
  notes: string;
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
  status: "In Stock" | "Low" | "Out" | "Order";
  notes: string;
};

type MapLabelRecord = {
  id: string;
  label: string;
  category: string;
  x: number;
  y: number;
  notes: string;
};

type AtlasPayload = {
  ok?: boolean;
  error?: string;
  assetRecords?: any[];
  vendorRecords?: any[];
  serviceRecords?: any[];
  workOrders?: any[];
  procedureRecords?: any[];
  calendarItems?: any[];
};

const colors = {
  navy: "#0B1E33",
  navy2: "#102A44",
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

const mapStorageKey = "atlas-map-labels-fixed-20260708";
const mapImages = ["/atlas-property-map.png", "/property-map.png", "/map.png"];

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

function statusValue(value: any): Status {
  if (value === "Online" || value === "Offline" || value === "Seasonal" || value === "Monitor") return value;
  return "Monitor";
}

function workStatusValue(value: any): ServiceStatus {
  if (value === "Open" || value === "Scheduled" || value === "Completed" || value === "Monitor") return value;
  return "Open";
}

function priorityValue(value: any): Priority {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  return "Medium";
}

function badgeStyle(value: string): React.CSSProperties {
  const red = value === "High" || value === "Offline" || value === "Out";
  const green = value === "Online" || value === "Completed" || value === "In Stock";
  const blue = value === "Monitor" || value === "Scheduled" || value === "Medium";
  return {
    display: "inline-flex",
    borderRadius: 999,
    padding: "4px 9px",
    border: `1px solid ${red ? "#FACACA" : green ? "#BDE7D2" : blue ? "#C8D9FF" : "#FFD8A8"}`,
    background: red ? "#FEECEC" : green ? "#EAF7F1" : blue ? "#EDF3FF" : "#FFF4E5",
    color: red ? colors.red : green ? "#087443" : blue ? "#175CD3" : "#B54708",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

const locations: LocationRecord[] = [
  { id: "general", name: "General", type: "Property", zone: "2000", notes: "Whole-property default location." },
  { id: "original-house", name: "Original House", type: "Building", zone: "Main House", notes: "Original/main house structure." },
  { id: "addition", name: "Addition", type: "Building", zone: "Main House", notes: "Addition wing including indoor pool area." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", zone: "Main House", notes: "Boilers, DHW tanks, hydronic controls, HVAC, pool heat, and mechanical systems." },
  { id: "pool-equipment", name: "Pool Equipment Room", type: "Pool Systems", zone: "Addition", notes: "Pool pump, sand filter, UV/ozone, valves, Desert Aire, and pool mechanical." },
  { id: "pool-changing-room", name: "Pool Changing Room", type: "Pool", zone: "Addition", notes: "Pool changing room and ClearRay UV-C ballast area." },
  { id: "standalone-spa", name: "Hot Tub / Sundance", type: "Spa", zone: "Outdoor", notes: "Standalone Sundance 880 Optima spa. Separate from pool equipment." },
  { id: "dock", name: "Dock", type: "Waterfront", zone: "Lake", notes: "Main dock, boat lifts, dock power, Sea
