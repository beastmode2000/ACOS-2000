"use client";

import React, { useEffect, useMemo, useState } from "react";
import WeatherPlanner from "./components/WeatherPlanner";

type Screen =
  | "dashboard"
  | "map"
  | "assets"
  | "work-orders"
  | "vendors"
  | "calendar"
  | "weather"
  | "documents";

type AssetRecord = {
  id?: string;
  name?: string;
  location?: string;
  locationId?: string;
  location_id?: string;
  category?: string;
  status?: string;
  make?: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  serial_number?: string;
  notes?: string;
  vendorIds?: string[];
};

type VendorRecord = {
  id?: string;
  name?: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
};

type ServiceRecord = {
  id?: string;
  assetId?: string;
  asset_id?: string;
  vendorId?: string;
  vendor_id?: string;
  date?: string;
  workDate?: string;
  work_date?: string;
  title?: string;
  status?: string;
  priority?: string;
  notes?: string;
  followUpDate?: string;
  follow_up_date?: string;

  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  recurrenceDays?: string;
  recurrenceNextDue?: string;
  recurrenceEndType?: string;
  recurrenceEndDate?: string;
  recurrenceCountLimit?: number | string;
  recurrenceCompletedCount?: number;
  recurrenceStatus?: string;
  parentWorkOrderId?: string;

  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: string;
  invoiceStatus?: string;
  paymentStatus?: string;
  costCategory?: string;
  approvedBy?: string;
  approvedDate?: string;
  costNotes?: string;
  invoiceDocumentIds?: string;
};

type CalendarItem = {
  id?: string;
  date?: string;
  title?: string;
  area?: string;
  status?: string;
};

type AtlasApiPayload = {
  ok?: boolean;
  source?: string;
  error?: string;
  assetRecords?: AssetRecord[];
  vendorRecords?: VendorRecord[];
  serviceRecords?: ServiceRecord[];
  calendarItems?: CalendarItem[];
};

const colors = {
  navy: "#0B1E33",
  navy2: "#12385C",
  gold: "#C99A3D",
  gold2: "#E7C46C",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  ink: "#1B2533",
  muted: "#667085",
  border: "#D8DEE8",
  danger: "#B42318",
  green: "#067647",
};

const mapLabels = [
  { id: "dock", label: "Dock", x: 34, y: 83 },
  { id: "cobalt", label: "Cobalt", x: 26, y: 89 },
  { id: "seadoo", label: "SeaDoo", x: 39, y: 88 },
  { id: "water-trampoline", label: "Water Trampoline", x: 17, y: 72 },
  { id: "waterside-lawn", label: "Waterside Lawn", x: 49, y: 66 },
  { id: "east-lawn", label: "East Lawn", x: 70, y: 45 },
  { id: "sport-court", label: "Sport Court", x: 83, y: 30 },
  { id: "veggie-boxes", label: "Veggie Boxes", x: 79, y: 20 },
  { id: "new-garage", label: "New Garage", x: 41, y: 28 },
  { id: "old-garage", label: "Old Garage", x: 51, y: 31 },
  { id: "adu", label: "ADU", x: 60, y: 24 },
  { id: "courtyard", label: "Courtyard", x: 52, y: 43 },
  { id: "trampoline-dog", label: "Trampoline / Dog", x: 70, y: 60 },
  { id: "original-house", label: "Original House", x: 45, y: 48 },
  { id: "addition", label: "Addition", x: 37, y: 54 },
  { id: "hot-tub", label: "Hot Tub", x: 41, y: 61 },
];

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function formatDate(value: unknown) {
  const text = firstText(value);
  if (!text) return "No date";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function money(value: unknown) {
  const text = firstText(value);
  if (!text) return "";
  const number = Number(text);
  if (Number.isNaN(number)) return text;
  return number.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function badgeColor(value: unknown) {
  const text = firstText(value).toLowerCase();

  if (text.includes("complete") || text.includes("paid") || text.includes("online") || text.includes("active")) {
    return {
      background: "rgba(6, 118, 71, 0.10)",
      border: "rgba(6, 118, 71, 0.22)",
      color: colors.green,
    };
  }

  if (text.includes("high") || text.includes("open") || text.includes("unpaid") || text.includes("overdue")) {
    return {
      background: "rgba(180, 35, 24, 0.10)",
      border: "rgba(180, 35, 24, 0.22)",
      color: colors.danger,
    };
  }

  return {
    background: "rgba(201, 154, 61, 0.12)",
    border: "rgba(201, 154, 61, 0.28)",
    color: colors.navy,
  };
}
