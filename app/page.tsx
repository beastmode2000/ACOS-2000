"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AtlasCalendar from "./components/AtlasCalendar";
import AtlasDashboard from "./components/AtlasDashboard";
import AtlasWorkOrders from "./components/AtlasWorkOrders";
import AtlasInsightsTimeline from "./components/AtlasInsightsTimeline";

import type {
  Screen,
  Status,
  ServiceStatus,
  WorkOrderPriority,
  WorkOrderRecurrenceUnit,
  WorkSeason,
  Priority,
  PartStatus,
  UploadedFileRecord,
  LocationRecord,
  MapDetailBox,
  MapLabelRecord,
  VendorRecord,
  ContactRecord,
  AssetRecord,
  ServiceRecord,
  ProcedureRecord,
  RequestStatus,
  OwnerRequestRecord,
  IntakeTargetKind,
  FastIntakeKind,
  FastIntakeSaveMode,
  InboxStatus,
  InboxReviewDraft,
  InboxItemRecord,
  DocumentRecord,
  ManualCategory,
  ManualRecord,
  PartRecord,
  WorkLinkRecord,
  QrKind,
  QrRecord,
  CalendarColorName,
  CalendarRepeat,
  CalendarReminder,
  CalendarLinkType,
  CalendarSource,
  CalendarColor,
  CalendarItem,
  WorkPlanDay,
  WorkPlanTask,
  PhotoRecord,
  WeatherDay,
  AtlasApiPayload,
  AtlasTable,
  SearchResult,
  ManualCandidate,
} from "./lib/atlas-types";

type AtlasScreen = Screen | "timeline" | "insights";

type WorkItemType =
  | "Quick Task"
  | "Work Order"
  | "Preventive Maintenance"
  | "Project";

type WorkEffort =
  | "5 minutes"
  | "15 minutes"
  | "30 minutes"
  | "1 hour"
  | "Half Day"
  | "Full Day"
  | "Multi-Day";

type WorkChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

type WorkNoteEntry = {
  id: string;
  text: string;
  createdAt: string;
};

type WorkCompletionEntry = {
  id: string;
  completedAt: string;
  statusBefore: string;
  dueDate: string;
  notes: string;
  notesHistory: WorkNoteEntry[];
  checklist: WorkChecklistItem[];
  photos: UploadedFileRecord[];
  documents: UploadedFileRecord[];
  assetId: string;
  vendorId: string;
  procedureId: string;
  locationId: string;
};

type AtlasServiceRecord = ServiceRecord & {
  workType?: WorkItemType;
  workCategory?: string;
  effort?: WorkEffort;
  responsibilityArea?: string;
  emoji?: string;
  assignedTo?: string;
  locationId?: string;
  checklist?: WorkChecklistItem[];
  notesHistory?: WorkNoteEntry[];
  serviceHistory?: WorkCompletionEntry[];
};

const WORKLINK_LOGOS = {
  landscapeHelpAdmin: "",
  landscapeHelp: "",
  control4: "",
  tccHoneywell: "",
  ramp: "",
  metaViewer: "",
} as const;

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

const screens: { id: AtlasScreen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "timeline", label: "Timeline" },
  { id: "insights", label: "Insights" },
  { id: "inbox", label: "Inbox" },
  { id: "requests", label: "Requests" },
  { id: "calendar", label: "Calendar" },
  { id: "planner", label: "Operations Planner" },
  { id: "history", label: "Work Orders" },
  { id: "assets", label: "Assets" },
  { id: "locations", label: "Locations" },
  { id: "vendors", label: "Vendors" },
  { id: "contacts", label: "Contacts" },
  { id: "documents", label: "Documents" },
  { id: "procedures", label: "Procedures" },
  { id: "map", label: "Map" },
  { id: "qr", label: "QR Codes" },
  { id: "parts", label: "Parts" },
  { id: "links", label: "Work Links" },
  { id: "weather", label: "Weather" },
  { id: "manuals", label: "Manuals" },
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
  assets: [
    "atlas-asset-records-v3",
    "atlas-asset-records-v2",
    "atlas-asset-records-v1",
    "atlas_2000_assets_safe_v1",
  ],
  vendors: [
    "atlas-vendor-records-v3",
    "atlas-vendor-records-v2",
    "atlas-vendor-records-v1",
    "atlas_2000_vendors_safe_v1",
  ],
  contacts: ["atlas-contact-records-v1"],
  workOrders: [
    "atlas-service-records-v11",
    "atlas-service-records-v10",
    "atlas-service-records-v9",
    "atlas-service-records-v8",
    "atlas-service-records-v7",
    "atlas-service-records-v6",
  ],
  calendar: [
    "atlas-calendar-v13",
    "atlas-calendar-v12",
    "atlas-calendar-v11",
    "atlas-calendar-v10",
    "atlas-calendar-v9",
    "atlas-calendar-v8",
    "atlas-calendar-v7",
    "atlas-calendar-v6",
    "atlas_2000_calendar_safe_v1",
  ],
  calendarColors: ["atlas-calendar-colors-v2", "atlas-calendar-colors-v1"],
  parts: ["atlas-part-records-v2"],
  procedures: ["atlas-procedure-records-v1", "atlas_2000_procedures_safe_v1"],
  photos: [
    "atlas-photo-records-v10",
    "atlas-photo-records-v9",
    "atlas-photo-records-v8",
    "atlas-photo-records-v7",
    "atlas-photo-records-v6",
  ],
  intakeDocs: ["atlas-intake-documents-v1"],
  manuals: ["atlas-manual-records-v1"],
  workLinks: ["atlas-work-links-v1"],
};

function localISODate(date = new Date()) {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 10);
}

function todayISO() {
  return localISODate();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMapDetailBoxes(
  label: Partial<MapLabelRecord>,
): MapDetailBox[] {
  const existing = Array.isArray(label.detailBoxes)
    ? label.detailBoxes
        .map((box) => ({
          id: box.id || uid("mapbox"),
          title: String(box.title || "Tab").trim() || "Tab",
          body: String(box.body || ""),
        }))
        .filter((box) => box.title.trim() || box.body.trim())
    : [];

  if (existing.length) return existing;

  const legacyBoxes = [
    { title: "Notes", body: label.notes || "" },
    { title: "Installer / Vendor", body: label.installer || "" },
    { title: "Paint / Color / Finish", body: label.paintColor || "" },
    { title: "Specs / Materials", body: label.specs || "" },
    { title: "Docs / Links", body: label.documentNotes || "" },
    { title: "Photo Notes", body: label.photoNotes || "" },
    { title: "Maintenance", body: label.maintenanceNotes || "" },
  ].filter((box) => String(box.body || "").trim());

  if (legacyBoxes.length) {
    return legacyBoxes.map((box) => ({
      id: uid("mapbox"),
      title: box.title,
      body: String(box.body || ""),
    }));
  }

  return [{ id: uid("mapbox"), title: "General Notes", body: "" }];
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

function blankCalendarItem(
  date = todayISO(),
  _defaultColorId = "maintenance",
): CalendarItem {
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
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthName(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shortDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isStatus(value: unknown): value is Status {
  return (
    value === "Online" ||
    value === "Offline" ||
    value === "Seasonal" ||
    value === "Monitor"
  );
}

function isServiceStatus(value: unknown): value is ServiceStatus {
  return (
    value === "Open" ||
    value === "Scheduled" ||
    value === "Completed" ||
    value === "Monitor" ||
    value === "In Progress" ||
    value === "Waiting"
  );
}

function isPriority(value: unknown): value is WorkOrderPriority {
  return value === "Low" || value === "Medium" || value === "High";
}

function isWorkOrderRecurrenceUnit(
  value: unknown,
): value is WorkOrderRecurrenceUnit {
  return (
    value === "Days" ||
    value === "Weeks" ||
    value === "Months" ||
    value === "Years"
  );
}

function isWorkSeason(value: unknown): value is WorkSeason {
  return (
    value === "Year-Round" ||
    value === "Spring" ||
    value === "Summer" ||
    value === "Fall" ||
    value === "Winter"
  );
}

function seasonForDate(dateValue = todayISO()): WorkSeason {
  const date = calendarDateValue(dateValue);
  const month = date.getMonth();

  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

function workSeasonDescription(season: WorkSeason) {
  if (season === "Spring") {
    return "Landscaping, cleanup, irrigation, reopening and de-winterizing watercraft and outdoor systems.";
  }
  if (season === "Summer") {
    return "Water and family fun, outdoor safety, lawn and irrigation, and high-use property operations.";
  }
  if (season === "Fall") {
    return "Leaves, landscape cleanup, gutters, winterizing watercraft, and preparing outdoor systems.";
  }
  if (season === "Winter") {
    return "Slower season for organizing, inventory, indoor preventive maintenance, and planning.";
  }
  return "Core safety, inspections, cleaning, and routine operations that continue all year.";
}

function recurrenceLabel(record: ServiceRecord) {
  if (!record.recurring) return "One-time";

  const interval = Math.max(1, Number(record.recurrenceInterval || 1));
  const unit = isWorkOrderRecurrenceUnit(record.recurrenceUnit)
    ? record.recurrenceUnit
    : "Weeks";
  const singular = unit.slice(0, -1).toLowerCase();

  return interval === 1
    ? `Every ${singular}`
    : `Every ${interval} ${unit.toLowerCase()}`;
}

function nextRecurrenceDate(
  startDate: string,
  intervalValue: number,
  unitValue: WorkOrderRecurrenceUnit,
) {
  const date = calendarDateValue(startDate || todayISO());
  const interval = Math.max(1, Math.floor(Number(intervalValue) || 1));

  if (unitValue === "Days") date.setDate(date.getDate() + interval);
  if (unitValue === "Weeks") date.setDate(date.getDate() + interval * 7);
  if (unitValue === "Months") date.setMonth(date.getMonth() + interval);
  if (unitValue === "Years") date.setFullYear(date.getFullYear() + interval);

  return localISODate(date);
}

function isProcedurePriority(value: unknown): value is Priority {
  return value === "High" || value === "Normal" || value === "Seasonal";
}

function isPartStatus(value: unknown): value is PartStatus {
  return (
    value === "In Stock" ||
    value === "Low" ||
    value === "Out" ||
    value === "Order"
  );
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
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return window.localStorage.getItem(key) !== null;
  } catch (error) {
    // Atlas may already be near the browser storage limit because photos and
    // documents are preserved locally. A storage-quota error must never crash
    // the page when a user edits a field or changes a dropdown.
    console.warn(`Atlas could not save local data for ${key}.`, error);
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizePhotoRecord(value: unknown): PhotoRecord {
  const outer = asRecord(value);
  const nested = asRecord(
    outer.record ?? outer.photo ?? outer.data ?? outer.payload,
  );
  const combined = { ...outer, ...nested };
  const files = Array.isArray(combined.files) ? combined.files : [];
  const firstFile = asRecord(
    combined.file ??
      files.find((item) => {
        const file = asRecord(item);
        const type = firstText(file.type, file.mimeType, file.mime_type);
        const data = firstText(file.dataUrl, file.data_url, file.url, file.src);
        return type.startsWith("image/") || data.startsWith("data:image/");
      }) ??
      files[0],
  );

  const rawUrl = firstText(
    combined.url,
    combined.imageUrl,
    combined.image_url,
    combined.src,
    firstFile.url,
    firstFile.imageUrl,
    firstFile.image_url,
    firstFile.src,
  );
  const explicitDataUrl = firstText(
    combined.dataUrl,
    combined.data_url,
    combined.imageData,
    combined.image_data,
    firstFile.dataUrl,
    firstFile.data_url,
    firstFile.imageData,
    firstFile.image_data,
  );
  const dataUrl =
    explicitDataUrl || (rawUrl.startsWith("data:image/") ? rawUrl : "");
  const url = rawUrl.startsWith("data:image/") ? "" : rawUrl;

  return {
    id: firstText(
      nested.id,
      nested.photoId,
      nested.photo_id,
      outer.id,
      outer.photoId,
      outer.photo_id,
    ),
    assetId: firstText(
      nested.assetId,
      nested.asset_id,
      outer.assetId,
      outer.asset_id,
    ),
    name:
      firstText(
        nested.name,
        nested.filename,
        nested.fileName,
        nested.file_name,
        outer.name,
        outer.filename,
        outer.fileName,
        outer.file_name,
        firstFile.name,
        firstFile.filename,
      ) || "Asset photo",
    dataUrl: dataUrl || undefined,
    url: url || undefined,
    createdAt:
      firstText(
        nested.createdAt,
        nested.created_at,
        outer.createdAt,
        outer.created_at,
        firstFile.createdAt,
        firstFile.created_at,
      ) || undefined,
  };
}

function photoSource(photo?: PhotoRecord) {
  return firstText(photo?.dataUrl, photo?.url);
}

function mergePhotoRecords(...groups: PhotoRecord[][]) {
  const merged = new Map<string, PhotoRecord>();

  groups.flat().map(normalizePhotoRecord).forEach((photo) => {
    if (!photo.id || !photo.assetId) return;
    const existing = merged.get(photo.id);
    merged.set(photo.id, {
      ...existing,
      ...photo,
      dataUrl: photo.dataUrl || existing?.dataUrl,
      url: photo.url || existing?.url,
      name: photo.name || existing?.name || "Asset photo",
      createdAt: photo.createdAt || existing?.createdAt,
    });
  });

  return [...merged.values()].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
}

const PHOTO_CACHE_DB = "atlas-photo-cache-v1";
const PHOTO_CACHE_STORE = "asset-photos";

function openPhotoCache(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(PHOTO_CACHE_DB, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_CACHE_STORE)) {
        database.createObjectStore(PHOTO_CACHE_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function cachePhotoRecord(photo: PhotoRecord) {
  const source = photoSource(photo);
  if (!photo.id || !source) return;

  const database = await openPhotoCache();
  if (!database) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(
        PHOTO_CACHE_STORE,
        "readwrite",
      );
      transaction.objectStore(PHOTO_CACHE_STORE).put({
        id: photo.id,
        dataUrl: photo.dataUrl || "",
        url: photo.url || "",
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });

  database.close();
}

async function cachePhotoRecords(photos: PhotoRecord[]) {
  await Promise.all(photos.map((photo) => cachePhotoRecord(photo)));
}

async function readCachedPhoto(
  id: string,
): Promise<Pick<PhotoRecord, "dataUrl" | "url"> | null> {
  if (!id) return null;

  const database = await openPhotoCache();
  if (!database) return null;

  const result = await new Promise<Record<string, unknown> | null>(
    (resolve) => {
      try {
        const transaction = database.transaction(
          PHOTO_CACHE_STORE,
          "readonly",
        );
        const request = transaction
          .objectStore(PHOTO_CACHE_STORE)
          .get(id);
        request.onsuccess = () =>
          resolve(request.result ? asRecord(request.result) : null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    },
  );

  database.close();
  if (!result) return null;

  const dataUrl = firstText(result.dataUrl, result.data_url);
  const url = firstText(result.url);
  if (!dataUrl && !url) return null;

  return {
    dataUrl: dataUrl || undefined,
    url: url || undefined,
  };
}

async function deleteCachedPhoto(id: string) {
  if (!id) return;
  const database = await openPhotoCache();
  if (!database) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(
        PHOTO_CACHE_STORE,
        "readwrite",
      );
      transaction.objectStore(PHOTO_CACHE_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });

  database.close();
}

function persistPhotoRecords(photos: PhotoRecord[]) {
  const metadata = mergePhotoRecords(photos).map((photo) => ({
    ...photo,
    dataUrl: undefined,
    url:
      photo.url && !photo.url.startsWith("data:image/")
        ? photo.url
        : undefined,
  }));

  try {
    saveStoredArray(storageKeys.photos[0], metadata);
  } catch {
    // IndexedDB remains the image source if localStorage is unavailable.
  }
}

function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const maxSide = 1200;
        const scale = Math.min(
          1,
          maxSide / Math.max(image.width, image.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");

        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const qualities = [0.8, 0.7, 0.6, 0.5];
        let result = canvas.toDataURL("image/jpeg", qualities[0]);

        for (const quality of qualities.slice(1)) {
          if (result.length <= 700_000) break;
          result = canvas.toDataURL("image/jpeg", quality);
        }

        URL.revokeObjectURL(objectUrl);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image compression failed"));
    };

    image.src = objectUrl;
  });
}

async function fileToUploadedRecord(file: File): Promise<UploadedFileRecord> {
  let dataUrl = "";

  if (
    file.type.startsWith("image/") &&
    !file.type.includes("svg") &&
    !file.type.includes("gif")
  ) {
    try {
      dataUrl = await compressImageFile(file);
    } catch {
      dataUrl = await readFileDataUrl(file);
    }
  } else {
    dataUrl = await readFileDataUrl(file);
  }

  return {
    id: uid("upload"),
    name: file.name || "Uploaded file",
    type: file.type || "file",
    dataUrl,
    createdAt: new Date().toISOString(),
  };
}

function dataUrlToFile(dataUrl: string, fileName = "pasted-image.png") {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("That copied image data is not valid.");

  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mimeType });
}

function imageUrlsFromClipboardText(value: string) {
  const source = String(value || "").trim();
  if (!source) return [];

  const urls = new Set<string>();

  if (source.startsWith("data:image/")) {
    urls.add(source);
  }

  try {
    const parsed = new DOMParser().parseFromString(source, "text/html");
    parsed.querySelectorAll("img").forEach((image) => {
      const src = image.getAttribute("src")?.trim() || "";
      if (src) urls.add(src);
    });
  } catch {
    // Plain text is handled below.
  }

  source
    .split(/\s+/)
    .map((item) => item.replace(/^['"<(]+|[>'"),]+$/g, ""))
    .filter(
      (item) =>
        item.startsWith("https://") ||
        item.startsWith("data:image/") ||
        item.startsWith("blob:"),
    )
    .forEach((item) => urls.add(item));

  return [...urls];
}

async function importImageUrlAsFile(url: string) {
  if (url.startsWith("data:image/")) {
    return dataUrlToFile(url, `pasted-ai-image-${Date.now()}.png`);
  }

  if (url.startsWith("blob:")) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Blob image could not be read.");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("The copied item was not an image.");
      }
      const extension =
        blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      return new File(
        [blob],
        `pasted-ai-image-${Date.now()}.${extension}`,
        { type: blob.type },
      );
    } catch {
      throw new Error(
        "That copied AI image only included a temporary link. Use Copy image, then click Paste Image again.",
      );
    }
  }

  const response = await fetch(
    `/api/image-import?url=${encodeURIComponent(url)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Atlas could not import that copied image.");
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("The copied link did not return an image.");
  }

  const extension =
    blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";

  return new File(
    [blob],
    `pasted-ai-image-${Date.now()}.${extension}`,
    { type: blob.type },
  );
}

function normalizeImageFile(file: File) {
  if (file.type.startsWith("image/")) return file;

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const inferredType =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : extension === "avif"
              ? "image/avif"
              : "";

  if (!inferredType) return file;
  return new File([file], file.name, { type: inferredType });
}

function mergeUploadedFiles(
  incoming: UploadedFileRecord[],
  existing: UploadedFileRecord[],
) {
  const map = new Map<string, UploadedFileRecord>();
  [...existing, ...incoming].forEach((file) => {
    const key = file.id || `${file.name}-${file.createdAt || ""}`;
    map.set(key, file);
  });
  return Array.from(map.values());
}

function normalizeAsset(record: Partial<AssetRecord>): AssetRecord {
  const name = String(record.name ?? "Unnamed Asset");
  return {
    id: String(record.id || slugify(name)),
    name,
    locationId: String(record.locationId ?? "general"),
    category: String(record.category ?? "General"),
    status: isStatus(record.status) ? record.status : "Monitor",
    make: record.make || "",
    model: record.model || "",
    serial: record.serial || "",
    notes: String(record.notes || ""),
    vendorIds: Array.isArray(record.vendorIds)
      ? record.vendorIds.map(String)
      : [],
  };
}

function normalizeVendor(record: Partial<VendorRecord>): VendorRecord {
  const name = String(record.name ?? "Unnamed Vendor");
  return {
    id: String(record.id || slugify(name)),
    name,
    category: String(record.category ?? "General"),
    phone: record.phone || "",
    email: record.email || "",
    website: record.website || "",
    notes: String(record.notes || ""),
  };
}

function normalizeContact(record: Partial<ContactRecord>): ContactRecord {
  return {
    id: String(record.id || ""),
    name: String(record.name ?? ""),
    organization: String(record.organization ?? ""),
    role: String(record.role ?? ""),
    category: String(record.category ?? ""),
    phone: String(record.phone ?? ""),
    email: String(record.email ?? ""),
    address: String(record.address ?? ""),
    website: String(record.website ?? ""),
    notes: String(record.notes ?? ""),
  };
}

function blankContact(): ContactRecord {
  return normalizeContact({
    id: "",
    name: "",
    organization: "",
    role: "",
    category: "",
    phone: "",
    email: "",
    address: "",
    website: "",
    notes: "",
  });
}

function normalizeService(record: Partial<AtlasServiceRecord>): AtlasServiceRecord {
  const title = String(record.title ?? "Untitled Work Order");
  return {
    id: String(record.id || slugify(title)),
    assetId: String(record.assetId ?? ""),
    vendorId: record.vendorId || "",
    procedureId: record.procedureId || "",
    date: String(record.date ?? todayISO()),
    title,
    status: isServiceStatus(record.status) ? record.status : "Open",
    priority: isPriority(record.priority) ? record.priority : "Medium",
    notes: String(record.notes || ""),
    followUpDate: record.followUpDate || "",
    recurring: Boolean(record.recurring),
    recurrenceInterval: Math.max(
      1,
      Math.floor(Number(record.recurrenceInterval || 1)),
    ),
    recurrenceUnit: isWorkOrderRecurrenceUnit(record.recurrenceUnit)
      ? record.recurrenceUnit
      : "Weeks",
    recurrenceEndDate: String(record.recurrenceEndDate || ""),
    season: isWorkSeason(record.season)
      ? record.season
      : seasonForDate(String(record.date || todayISO())),
    lastCompletedDate: String(record.lastCompletedDate || ""),
    completionHistory: Array.isArray(record.completionHistory)
      ? record.completionHistory.map(String).filter(Boolean)
      : [],
    workType:
      record.workType === "Quick Task" ||
      record.workType === "Work Order" ||
      record.workType === "Preventive Maintenance" ||
      record.workType === "Project"
        ? record.workType
        : record.recurring
          ? "Preventive Maintenance"
          : "Work Order",
    workCategory: String(
      record.workCategory ||
        (record as AtlasServiceRecord & { category?: string }).category ||
        "🔧 Maintenance",
    ),
    effort: record.effort || undefined,
    responsibilityArea: String(record.responsibilityArea || ""),
    emoji: String(record.emoji || ""),
    assignedTo: String(record.assignedTo || ""),
    locationId: String(record.locationId || ""),
    checklist: Array.isArray(record.checklist)
      ? record.checklist.map((item) => ({
          id: String(item.id || uid("check")),
          text: String(item.text || ""),
          completed: Boolean(item.completed),
        }))
      : [],
    notesHistory: Array.isArray(record.notesHistory)
      ? record.notesHistory.map((entry) => ({
          id: String(entry.id || uid("note")),
          text: String(entry.text || ""),
          createdAt: String(entry.createdAt || new Date().toISOString()),
        }))
      : [],
    serviceHistory: Array.isArray(record.serviceHistory)
      ? record.serviceHistory.map((entry) => ({
          id: String(entry.id || uid("completion")),
          completedAt: String(entry.completedAt || new Date().toISOString()),
          statusBefore: String(entry.statusBefore || "Open"),
          dueDate: String(entry.dueDate || ""),
          notes: String(entry.notes || ""),
          notesHistory: Array.isArray(entry.notesHistory) ? entry.notesHistory : [],
          checklist: Array.isArray(entry.checklist) ? entry.checklist : [],
          photos: Array.isArray(entry.photos) ? entry.photos : [],
          documents: Array.isArray(entry.documents) ? entry.documents : [],
          assetId: String(entry.assetId || ""),
          vendorId: String(entry.vendorId || ""),
          procedureId: String(entry.procedureId || ""),
          locationId: String(entry.locationId || ""),
        }))
      : [],
    photos: Array.isArray(record.photos) ? record.photos : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
  };
}

function normalizeProcedure(record: Partial<ProcedureRecord>): ProcedureRecord {
  const title = String(record.title ?? "Untitled Procedure");
  return {
    id: String(record.id || slugify(title)),
    title,
    area: String(record.area ?? "2000"),
    priority: isProcedurePriority(record.priority) ? record.priority : "Normal",
    steps: Array.isArray(record.steps) ? record.steps.map(String) : [],
  };
}

function normalizeCalendar(record: Partial<CalendarItem>): CalendarItem {
  const title = String(record.title ?? "Untitled Calendar Item");
  const rawColorId =
    String(record.colorId ?? "") ||
    categoryToColorId(String(record.area ?? record.categoryLabel ?? ""));
  const categoryLabel = String(
    record.categoryLabel ??
      record.area ??
      colorLabelFromColorId(rawColorId) ??
      "Maintenance",
  );
  const colorName = (record.colorName ||
    colorNameFromLegacyColorId(rawColorId)) as CalendarColorName;

  return {
    id: String(record.id || slugify(title)),
    date: String(record.date ?? todayISO()),
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
  const name = String(record.name ?? "Unnamed Part");
  return {
    id: String(record.id || slugify(name)),
    name,
    category: String(record.category ?? "General"),
    locationId: String(record.locationId ?? "general"),
    assetId: record.assetId || "",
    vendorId: record.vendorId || "",
    quantity: Number(record.quantity ?? 0),
    minQuantity: Number(record.minQuantity ?? 1),
    status: isPartStatus(record.status) ? record.status : "In Stock",
    notes: String(record.notes || ""),
  };
}

function normalizeDocument(record: Partial<DocumentRecord>): DocumentRecord {
  const title = String(
    record.title || record.files?.[0]?.name || "Untitled Document",
  );
  const targetType = (record.targetType || "General") as IntakeTargetKind;

  return {
    id: String(record.id || uid("doc")),
    title,
    area: String(record.area || record.targetName || "General"),
    type: String(record.type || "Paperwork / Scan"),
    linkedAssetId:
      record.linkedAssetId ||
      (targetType === "Asset" ? record.targetId : undefined),
    linkedVendorId:
      record.linkedVendorId ||
      (targetType === "Vendor" ? record.targetId : undefined),
    targetType,
    targetId: String(record.targetId || ""),
    targetName: String(record.targetName || record.area || "General"),
    notes: String(record.notes || ""),
    pastedText: String(record.pastedText || ""),
    files: Array.isArray(record.files)
      ? record.files.map((file) => ({
          id: String(file.id || uid("file")),
          name: String(file.name || "File"),
          type: file.type || "",
          dataUrl: file.dataUrl || "",
          url: file.url || "",
          createdAt:
            file.createdAt || record.createdAt || new Date().toISOString(),
        }))
      : [],
    href: record.href || "",
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

function mergeDocuments(
  primary: DocumentRecord[],
  secondary: DocumentRecord[],
) {
  const merged = new Map<string, DocumentRecord>();

  [...primary, ...secondary].forEach((doc) => {
    const normalized = normalizeDocument(doc);
    if (!merged.has(normalized.id)) merged.set(normalized.id, normalized);
  });

  return Array.from(merged.values()).sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
}

function byName<T extends { name: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => a.name.localeCompare(b.name));
}

function byTitle<T extends { title: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => a.title.localeCompare(b.title));
}

function badgeStyle(value: string): React.CSSProperties {
  const palette: Record<string, { bg: string; color: string; border: string }> =
    {
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
  if (day.precipAmount >= 0.25 || day.precipChance >= 75)
    return "Rain likely — skip irrigation unless pots are dry.";
  if (day.precipAmount >= 0.1 || day.precipChance >= 45)
    return "Possible rain — check beds before watering.";
  if (day.high >= 82 || day.et0 >= 0.18)
    return "Hot/dry day — prioritize pots, new plantings, and exposed beds.";
  if (day.windMax >= 18)
    return "Windy — avoid spray irrigation during peak wind.";
  return "Good yard-work window — normal irrigation check.";
}

function weatherDayPlanning(day: WeatherDay) {
  if (day.precipChance >= 75 || day.precipAmount >= 0.25) {
    return "Plan indoor or covered work. Rain is likely enough to affect outdoor maintenance.";
  }
  if (day.windMax >= 20) {
    return "Expect a windy workday. Avoid spraying, loose covers, and wind-sensitive outdoor work.";
  }
  if (day.high >= 85) {
    return "Schedule strenuous outdoor work earlier in the day and check pots and new plantings.";
  }
  if (day.low <= 40) {
    return "Cool start expected. Delay temperature-sensitive watering or outdoor work until later.";
  }
  return "Conditions look workable for normal outdoor maintenance and property checks.";
}

function categoryToColorId(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("landscape") || lower.includes("grounds"))
    return "landscaping";
  if (lower.includes("irrigation") || lower.includes("hydrawise"))
    return "irrigation";
  if (
    lower.includes("hvac") ||
    lower.includes("thermostat") ||
    lower.includes("carrier") ||
    lower.includes("honeywell")
  )
    return "hvac";
  if (
    lower.includes("paint") ||
    lower.includes("stain") ||
    lower.includes("elliott")
  )
    return "paint-stain";
  if (lower.includes("clean")) return "cleaning";
  if (
    lower.includes("camera") ||
    lower.includes("security") ||
    lower.includes("unifi") ||
    lower.includes("ubiquiti")
  )
    return "security-cameras";
  if (lower.includes("control4") || lower.includes("smart home"))
    return "smart-home-controls";
  if (
    lower.includes("boat") ||
    lower.includes("dock") ||
    lower.includes("marine") ||
    lower.includes("seadoo")
  )
    return "boat-dock";
  if (lower.includes("waterfront") || lower.includes("waterside"))
    return "waterfront";
  if (lower.includes("vehicle") || lower.includes("car")) return "vehicles";
  if (lower.includes("interior") || lower.includes("house"))
    return "house-interior";
  if (lower.includes("exterior")) return "exterior";
  if (
    lower.includes("supply") ||
    lower.includes("amazon") ||
    lower.includes("order")
  )
    return "supplies-orders";
  if (
    lower.includes("invoice") ||
    lower.includes("accounting") ||
    lower.includes("metaviewer")
  )
    return "accounting-invoices";
  if (lower.includes("meeting")) return "meeting";
  if (lower.includes("reminder")) return "reminder";
  if (lower.includes("vendor")) return "vendor";
  if (lower.includes("family")) return "family";
  if (lower.includes("owner") || lower.includes("personal"))
    return "personal-owner";
  if (lower.includes("work order")) return "work-order";
  if (lower.includes("maintenance") || lower.includes("work"))
    return "maintenance";
  return "other";
}

const calendarPlainColors: {
  id: CalendarColorName;
  label: string;
  hex: string;
}[] = [
  { id: "red", label: "Red", hex: "#B42318" },
  { id: "orange", label: "Orange", hex: "#B54708" },
  { id: "yellow", label: "Yellow", hex: "#C99A3D" },
  { id: "green", label: "Green", hex: "#087443" },
  { id: "blue", label: "Blue", hex: "#175CD3" },
  { id: "purple", label: "Purple", hex: "#7C3AED" },
  { id: "gray", label: "Gray", hex: "#475467" },
];

const repeatOptions: CalendarRepeat[] = [
  "None",
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
  "Custom",
];
const reminderOptions: CalendarReminder[] = [
  "None",
  "Morning of",
  "Day before",
  "Week before",
];
const linkTypeOptions: CalendarLinkType[] = [
  "None",
  "Asset",
  "Location",
  "Vendor",
  "Work Order",
];

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
  return (
    calendarPlainColors.find((color) => color.id === value) ??
    calendarPlainColors.find((color) => color.id === "blue") ??
    calendarPlainColors[0]
  );
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
  return (
    defaultCalendarColors.find((color) => color.id === colorId)?.label ||
    "Other"
  );
}

const defaultCalendarColors: CalendarColor[] = [
  {
    id: "maintenance",
    label: "Maintenance",
    hex: "#475467",
    colorName: "gray",
  },
  { id: "vendor", label: "Vendor", hex: "#7C3AED", colorName: "purple" },
  { id: "family", label: "Family", hex: "#175CD3", colorName: "blue" },
  {
    id: "personal-owner",
    label: "Personal / Owner",
    hex: "#C99A3D",
    colorName: "yellow",
  },
  { id: "work-order", label: "Work Order", hex: "#175CD3", colorName: "blue" },
  { id: "holiday", label: "Holiday", hex: "#7C3AED", colorName: "purple" },
  {
    id: "landscaping",
    label: "Landscaping",
    hex: "#087443",
    colorName: "green",
  },
  { id: "irrigation", label: "Irrigation", hex: "#087443", colorName: "green" },
  { id: "hvac", label: "HVAC", hex: "#175CD3", colorName: "blue" },
  {
    id: "paint-stain",
    label: "Paint / Stain",
    hex: "#B54708",
    colorName: "orange",
  },
  { id: "cleaning", label: "Cleaning", hex: "#087443", colorName: "green" },
  {
    id: "security-cameras",
    label: "Security / Cameras",
    hex: "#B42318",
    colorName: "red",
  },
  {
    id: "smart-home-controls",
    label: "Smart Home / Controls",
    hex: "#7C3AED",
    colorName: "purple",
  },
  { id: "boat-dock", label: "Boat / Dock", hex: "#175CD3", colorName: "blue" },
  { id: "waterfront", label: "Waterfront", hex: "#175CD3", colorName: "blue" },
  { id: "vehicles", label: "Vehicles", hex: "#475467", colorName: "gray" },
  {
    id: "house-interior",
    label: "House / Interior",
    hex: "#C99A3D",
    colorName: "yellow",
  },
  { id: "exterior", label: "Exterior", hex: "#087443", colorName: "green" },
  {
    id: "supplies-orders",
    label: "Supplies / Orders",
    hex: "#B54708",
    colorName: "orange",
  },
  {
    id: "accounting-invoices",
    label: "Accounting / Invoices",
    hex: "#7C3AED",
    colorName: "purple",
  },
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

  defaultCalendarColors.forEach((color) =>
    merged.set(color.id, normalizeCalendarColor(color)),
  );

  storedColors.forEach((color) => {
    const normalized = normalizeCalendarColor(color);
    merged.set(normalized.id, normalized);
  });

  standardCalendarCategoryLabels.forEach((label) => {
    const exists = Array.from(merged.values()).some(
      (color) => color.label === label,
    );
    if (!exists) {
      const id = slugify(label);
      merged.set(
        id,
        normalizeCalendarColor({
          id,
          label,
          colorName: colorNameFromLegacyColorId(id),
        }),
      );
    }
  });

  return Array.from(merged.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getNthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
) {
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

function getLastWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
) {
  const date = new Date(year, monthIndex + 1, 0);

  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

function getObservedFixedHoliday(
  year: number,
  monthIndex: number,
  day: number,
) {
  const actual = new Date(year, monthIndex, day);
  const observed = new Date(actual);

  if (actual.getDay() === 6) observed.setDate(actual.getDate() - 1);
  if (actual.getDay() === 0) observed.setDate(actual.getDate() + 1);

  return observed;
}

function makeHolidayEvent(
  id: string,
  title: string,
  date: Date | string,
  source: CalendarSource,
  colorName: CalendarColorName,
): CalendarItem {
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
    notes:
      source === "jewish-holiday"
        ? "Jewish holiday shown as an all-day calendar layer."
        : "US holiday shown as an all-day calendar layer.",
    linkedType: "None",
    completed: false,
    source,
  };
}

function getUsHolidays(year: number): CalendarItem[] {
  const holidays = [
    { title: "New Year’s Day", date: getObservedFixedHoliday(year, 0, 1) },
    {
      title: "Martin Luther King Jr. Day",
      date: getNthWeekdayOfMonth(year, 0, 1, 3),
    },
    {
      title: "Washington’s Birthday",
      date: getNthWeekdayOfMonth(year, 1, 1, 3),
    },
    { title: "Memorial Day", date: getLastWeekdayOfMonth(year, 4, 1) },
    { title: "Juneteenth", date: getObservedFixedHoliday(year, 5, 19) },
    { title: "Independence Day", date: getObservedFixedHoliday(year, 6, 4) },
    { title: "Labor Day", date: getNthWeekdayOfMonth(year, 8, 1, 1) },
    { title: "Columbus Day", date: getNthWeekdayOfMonth(year, 9, 1, 2) },
    { title: "Veterans Day", date: getObservedFixedHoliday(year, 10, 11) },
    { title: "Thanksgiving Day", date: getNthWeekdayOfMonth(year, 10, 4, 4) },
    { title: "Christmas Day", date: getObservedFixedHoliday(year, 11, 25) },
  ];

  return holidays.map((holiday) =>
    makeHolidayEvent(
      `us-holiday-${year}-${slugify(holiday.title)}`,
      holiday.title,
      holiday.date,
      "us-holiday",
      "red",
    ),
  );
}

function getHebrewMonthName(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
      day: "numeric",
      month: "long",
    }).formatToParts(date);
    return String(
      parts.find((part) => part.type === "month")?.value || "",
    ).toLowerCase();
  } catch {
    return "";
  }
}

function getHebrewDay(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-hebrew", {
      day: "numeric",
      month: "long",
    }).formatToParts(date);
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
  if (month.includes("tish") && day >= 15 && day <= 21)
    return day === 15 ? "Sukkot I" : "Sukkot";
  if (month.includes("tish") && day === 22) return "Shemini Atzeret";
  if (month.includes("tish") && day === 23) return "Simchat Torah";
  if (month.includes("kislev") && day >= 25) return "Chanukah";
  if (month.includes("tevet") && day <= 3) return "Chanukah";
  if ((month.includes("shevat") || month.includes("shvat")) && day === 15)
    return "Tu BiShvat";
  if (month.includes("adar ii") && day === 14) return "Purim";
  if (month === "adar" && day === 14) return "Purim";
  if (month.includes("nisan") && day >= 15 && day <= 22)
    return day === 15 ? "Pesach I" : "Pesach";
  if (month.includes("sivan") && (day === 6 || day === 7))
    return day === 6 ? "Shavuot I" : "Shavuot II";
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
      holidays.push(
        makeHolidayEvent(
          `jewish-holiday-${dateKey}-${slugify(title)}`,
          title,
          dateKey,
          "jewish-holiday",
          "purple",
        ),
      );
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
  return Math.round(
    (calendarDateValue(end).getTime() - calendarDateValue(start).getTime()) /
      oneDay,
  );
}

function upcomingDayLabel(date: string) {
  const distance = daysBetween(todayISO(), date);
  if (distance === 0) return "Today";
  if (distance === 1) return "Tomorrow";
  if (distance >= 2 && distance <= 5) return `In ${distance} days`;
  return "";
}

function isRecurringInstanceOnDate(event: CalendarItem, date: string) {
  if (!event.repeat || event.repeat === "None") return event.date === date;
  if (event.date > date) return false;

  const distance = daysBetween(event.date, date);
  if (distance < 0) return false;
  if (event.repeat === "Daily") return true;
  if (event.repeat === "Weekly" || event.repeat === "Custom")
    return distance % 7 === 0;

  const original = calendarDateValue(event.date);
  const current = calendarDateValue(date);
  if (event.repeat === "Monthly")
    return current.getDate() === original.getDate();
  if (event.repeat === "Yearly")
    return (
      current.getMonth() === original.getMonth() &&
      current.getDate() === original.getDate()
    );

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
    return {
      key: iso,
      date: iso,
      day: date.getDate(),
      outside: date.getMonth() !== cursor.getMonth(),
    };
  });
}

const locations: LocationRecord[] = [
  {
    id: "general",
    name: "General",
    type: "Property",
    zone: "2000",
    notes: "Whole-property fallback location.",
  },
  {
    id: "addition",
    name: "Addition",
    type: "Building",
    zone: "Main House",
    notes: "Addition wing including indoor pool area.",
  },
  {
    id: "adu",
    name: "ADU",
    type: "Building",
    zone: "Left of Old Garage",
    notes: "ADU is a location, not an asset.",
  },
  {
    id: "cobalt-lift",
    name: "Cobalt Lift",
    type: "Dock Lift",
    zone: "Dock",
    notes: "Cobalt boat lift and newer Sunstream lift box.",
  },
  {
    id: "courtyard",
    name: "Courtyard",
    type: "Outdoor Living",
    zone: "Main House",
    notes:
      "Patio with chairs/fire pit between main house, addition, old garage, and covered hallway.",
  },
  {
    id: "dock",
    name: "Dock",
    type: "Waterfront",
    zone: "Lake",
    notes:
      "Main dock, boat lift areas, dock power, Sea-Doo area, Cobalt, and lift control boxes.",
  },
  {
    id: "dock-lift",
    name: "Dock Lift Box",
    type: "Lift Controls",
    zone: "Dock",
    notes: "Additional dock lift box.",
  },
  {
    id: "east-lawn",
    name: "East Lawn",
    type: "Grounds",
    zone: "East",
    notes: "Large lawn east/south of the sport court.",
  },
  {
    id: "exterior",
    name: "Exterior",
    type: "Envelope",
    zone: "2000",
    notes:
      "Exterior paint/stain, siding, eaves, deck edges, windows, and envelope checks.",
  },
  {
    id: "house-managers-office",
    name: "House Managers Office",
    type: "Interior",
    zone: "Original House",
    notes: "Office appliance records and house manager operating area.",
  },
  {
    id: "irrigation",
    name: "Irrigation",
    type: "Landscape Systems",
    zone: "Grounds",
    notes:
      "Hunter Hydrawise / Advanced Irrigation records, zones, flow/rain/soil sensors.",
  },
  {
    id: "mechanical-room",
    name: "Mechanical Room",
    type: "Systems",
    zone: "Main House",
    notes:
      "Boilers, DHW tanks, hydronic controls, pumps, pool heat, and HVAC equipment.",
  },
  {
    id: "new-garage",
    name: "New Garage",
    type: "Building",
    zone: "Exterior",
    notes: "New garage / auto court garage area.",
  },
  {
    id: "old-garage",
    name: "Old Garage",
    type: "Building",
    zone: "Exterior",
    notes: "Old garage near ADU and covered connection areas.",
  },
  {
    id: "original-house",
    name: "Original House",
    type: "Building",
    zone: "Main House",
    notes: "Original/main house structure.",
  },
  {
    id: "pantry",
    name: "Pantry",
    type: "Interior",
    zone: "Original House",
    notes: "Pantry freezer, storage, and supplies.",
  },
  {
    id: "pool-changing-room",
    name: "Pool Changing Room",
    type: "Pool",
    zone: "Addition",
    notes: "Pool changing room and ClearRay UV-C ballast area.",
  },
  {
    id: "pool-equipment",
    name: "Pool Equipment Room",
    type: "Pool Systems",
    zone: "Addition",
    notes:
      "Pool filtration, pumps, sand filter, UV/ozone, Desert Aire, and hydronic pool heat equipment.",
  },
  {
    id: "seadoo-lift",
    name: "SeaDoo Lift",
    type: "PWC Lift",
    zone: "Dock",
    notes: "Sea-Doo lift and older/smaller Sunstream box.",
  },
  {
    id: "sport-court",
    name: "Sport Court",
    type: "Recreation",
    zone: "East",
    notes: "Outdoor sport court.",
  },
  {
    id: "standalone-spa",
    name: "Hot Tub / Sundance",
    type: "Spa",
    zone: "Outdoor",
    notes: "Standalone Sundance 880 Optima spa.",
  },
  {
    id: "trampoline-dog",
    name: "Trampoline / Dog",
    type: "Grounds",
    zone: "Exterior",
    notes: "Turf/trampoline/dog cleanup area east of covered hallway.",
  },
  {
    id: "upstairs-laundry",
    name: "Upstairs Laundry",
    type: "Interior",
    zone: "Original House",
    notes: "Upstairs laundry washer/dryer and related assets.",
  },
  {
    id: "veggie-boxes",
    name: "Veggie Boxes",
    type: "Grounds",
    zone: "East",
    notes: "Three vegetable boxes at south end of East Lawn near New Garage.",
  },
  {
    id: "water-trampoline",
    name: "Water Trampoline",
    type: "Waterfront",
    zone: "Lake",
    notes: "Seasonal floating water trampoline location.",
  },
  {
    id: "waterside-lawn-north",
    name: "Waterside Lawn (North)",
    type: "Grounds",
    zone: "Lake",
    notes: "North / lake-facing lawn and beds.",
  },
  {
    id: "wine-room",
    name: "Wine Room",
    type: "Interior",
    zone: "Original House",
    notes: "Wine room equipment and freezer record.",
  },
];

const defaultMapLabels: MapLabelRecord[] = [
  {
    id: "map-addition",
    label: "Addition",
    category: "Building",
    x: 61,
    y: 36,
    notes: "Addition wing including indoor pool area.",
    photos: [],
  },
  {
    id: "map-adu",
    label: "ADU",
    category: "Location",
    x: 27,
    y: 42,
    notes: "Small square left of Old Garage. ADU is a location, not an asset.",
    photos: [],
  },
  {
    id: "map-cobalt",
    label: "Cobalt",
    category: "Watercraft",
    x: 63,
    y: 72,
    notes: "Cobalt R7 area near the dock.",
    photos: [],
  },
  {
    id: "map-courtyard",
    label: "Courtyard",
    category: "Outdoor Living",
    x: 47,
    y: 44,
    notes:
      "Courtyard patio with chairs/fire pit. West of the gray covered hallway.",
    photos: [],
  },
  {
    id: "map-dock",
    label: "Dock",
    category: "Waterfront",
    x: 58,
    y: 78,
    notes:
      "Main dock location with boat lifts, dock power, and waterfront service records.",
    photos: [],
  },
  {
    id: "map-east-lawn",
    label: "East Lawn",
    category: "Grounds",
    x: 74,
    y: 47,
    notes: "East lawn area and grounds records.",
    photos: [],
  },
  {
    id: "map-hot-tub",
    label: "Hot Tub (Sundance)",
    category: "Spa",
    x: 61,
    y: 51,
    notes:
      "Standalone Sundance 880 spa on patio east of furniture/stairs to lawn.",
    photos: [],
  },
  {
    id: "map-new-garage",
    label: "New Garage",
    category: "Building",
    x: 40,
    y: 31,
    notes: "New garage location.",
    photos: [],
  },
  {
    id: "map-old-garage",
    label: "Old Garage",
    category: "Building",
    x: 33,
    y: 35,
    notes: "Old garage location.",
    photos: [],
  },
  {
    id: "map-original-house",
    label: "Original House",
    category: "Building",
    x: 49,
    y: 38,
    notes: "Original/main house structure.",
    photos: [],
  },
  {
    id: "map-seadoo",
    label: "SeaDoo",
    category: "Watercraft",
    x: 64,
    y: 82,
    notes: "Sea-Doo / PWC area south of the small dock slip.",
    photos: [],
  },
  {
    id: "map-sport-court",
    label: "Sport Court",
    category: "Recreation",
    x: 83,
    y: 26,
    notes: "Sport court north of East Lawn.",
    photos: [],
  },
  {
    id: "map-trampoline-dog",
    label: "Trampoline / Dog",
    category: "Grounds",
    x: 42,
    y: 56,
    notes: "Green turf/trampoline/dog area east of covered hallway.",
    photos: [],
  },
  {
    id: "map-veggie-boxes",
    label: "Veggie Boxes",
    category: "Grounds",
    x: 77,
    y: 62,
    notes:
      "Three veggie boxes at the south end of East Lawn next to New Garage.",
    photos: [],
  },
  {
    id: "map-water-trampoline",
    label: "Water Trampoline",
    category: "Waterfront",
    x: 47,
    y: 86,
    notes: "Seasonal water trampoline location west of the dock.",
    photos: [],
  },
  {
    id: "map-waterside-lawn-north",
    label: "Waterside Lawn (North)",
    category: "Grounds",
    x: 50,
    y: 68,
    notes: "North waterside lawn and lake-facing beds.",
    photos: [],
  },
];

const fallbackVendors: VendorRecord[] = [
  {
    id: "advancedirrigation",
    name: "Advanced Irrigation",
    category: "Irrigation",
    notes:
      "Hydrawise / Hunter HCC 24-zone irrigation controller, sensors, service, and current-year backflow testing.",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "Parts / Supplies",
    notes: "HVAC filters and general property supplies.",
  },
  {
    id: "elliottpaint",
    name: "Elliott Paint Company",
    category: "Paint / Stain",
    phone: "206-510-0688",
    email: "brandon@elliottpaintco.com",
    notes:
      "Exterior paint/stain vendor. Brandon Ness contact. Kurt Anderson involved in samples/scope walkthroughs.",
  },
  {
    id: "peterclark",
    name: "Peter Clark Designs",
    category: "Landscaping",
    notes:
      "Weekly landscaping/weeding crew approved by Steve and managed by Pat.",
  },
  {
    id: "psf",
    name: "PSF Mechanical",
    category: "HVAC / Boiler / Pool Mechanical",
    notes:
      "Boilers, hydronic heating, HVAC, Desert Aire, pool mechanical, and related systems.",
  },
  {
    id: "seattleboat",
    name: "Seattle Boat",
    category: "Boat Service",
    notes: "Cobalt R7 service and seasonal watercraft support.",
  },
];

const fallbackAssets: AssetRecord[] = [
  {
    id: "boiler-1",
    name: "Boiler B-1",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Online",
    make: "Viessmann",
    model: "Vitodens 200 / 200-W",
    serial: "758960502925",
    notes: "Wall-mounted Viessmann Vitodens 200.",
    vendorIds: ["psf"],
  },
  {
    id: "boiler-2",
    name: "Boiler B-2",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Monitor",
    make: "Viessmann",
    model: "Vitodens 200 / 200-W",
    serial: "758960507593",
    notes: "Monitor after recall / heat exchanger / igniter issue.",
    vendorIds: ["psf"],
  },
  {
    id: "craft-cobalt",
    name: "Craft — Cobalt R7",
    locationId: "dock",
    category: "Watercraft",
    status: "Seasonal",
    make: "Cobalt",
    model: "R7",
    serial: "HIN FGE7S0561920",
    notes: "2020 Cobalt R7. WA WN4528SW.",
    vendorIds: ["seattleboat"],
  },
  {
    id: "irrigation-controller",
    name: "Hunter HCC 24-Zone Irrigation Controller",
    locationId: "irrigation",
    category: "Irrigation",
    status: "Online",
    make: "Hunter",
    model: "HCC 24 Zones",
    serial: "06d050377d",
    notes: "Hydrawise controller name Faben2000.",
    vendorIds: ["advancedirrigation"],
  },
];

const fallbackWorkOrders: AtlasServiceRecord[] = [
  {
    id: "wo-pool-weekly",
    assetId: "boiler-2",
    vendorId: "psf",
    date: todayISO(),
    title: "Boiler 2 recalled heat exchanger / igniter issue",
    status: "Monitor",
    priority: "Medium",
    notes: "Track Boiler B-2 issue.",
    recurring: false,
    recurrenceInterval: 1,
    recurrenceUnit: "Years",
    season: "Year-Round",
    completionHistory: [],
  },
  {
    id: "wo-landscape-weeding",
    assetId: "irrigation-controller",
    vendorId: "peterclark",
    date: todayISO(),
    title: "Weekly landscaping crew — waterside beds first",
    status: "Scheduled",
    priority: "Medium",
    notes: "Pat manages crew. Priority: waterside beds first.",
    recurring: true,
    recurrenceInterval: 1,
    recurrenceUnit: "Weeks",
    season: "Summer",
    completionHistory: [],
  },
];

const fallbackProcedures: ProcedureRecord[] = [
  {
    id: "weekly-routine",
    title: "Weekly 5-Day Routine",
    area: "2000",
    priority: "High",
    steps: [
      "Monday: trash/recycle/yard waste and clean cans.",
      "Tuesday: grounds/lawn/irrigation and 10 AM meeting.",
      "Wednesday: pool/spa/fountain/courtyard.",
      "Thursday: vehicles/dock/boat/Sea-Doo/recreation.",
      "Friday: final walkthrough/testing/updates and 9 AM meeting.",
    ],
  },
  {
    id: "boat-dock-party",
    title: "Boat/Dock Party",
    area: "Boat / Dock",
    priority: "High",
    steps: [
      "SECTION: Sign Preparation",
      "Prepare and place required signs.",
      "SECTION: Parking Area Preparation",
      "Prepare and inspect the parking area.",
      "SECTION: Tree and Pathway Maintenance",
      "Inspect and clean trees, paths, and approaches.",
      "SECTION: Lawn Maintenance",
      "Mow, edge, blow, and present lawns for guests.",
      "SECTION: Lighting Check",
      "Test outdoor, pathway, dock, and event lighting.",
      "SECTION: Dock and Sport Court Preparation",
      "Clean and prepare the dock and sport court.",
      "SECTION: Final Preparations",
      "Complete a final walkthrough and correct remaining issues.",
    ],
  },
  {
    id: "out-of-town-to-do-list",
    title: "Out of Town To Do List",
    area: "2000",
    priority: "High",
    steps: [
      "SECTION: Inside Tasks",
      "Complete the interior checks shown in the MaintainX checklist.",
      "SECTION: Outside Tasks",
      "Complete the exterior, grounds, dock, and equipment checks shown in the MaintainX checklist.",
      "Review the original screenshots before activating this procedure because some item wording was not fully visible.",
    ],
  },
  {
    id: "city-water-irrigation",
    title: "City Water Irrigation",
    area: "Irrigation",
    priority: "High",
    steps: [
      "Steps to change irrigation from lake water to city water.",
      "Shut off lake water pump.",
      "Shut off green valve to the right.",
      "Remove P/MV wire from controller.",
      "Turn on city water valve at the street.",
      "Test with remote controller.",
    ],
  },
  {
    id: "spring-dock-preparation",
    title: "Spring Dock Preparation",
    area: "Boat / Dock",
    priority: "Seasonal",
    steps: [
      "Prepare the dock and associated equipment for seasonal use.",
      "SECTION: Boat Preparation",
      "Clean the interior of the boat.",
      "Clean the exterior of the boat.",
      "Install carpet on the boat.",
      "SECTION: Lift and Storage Box Maintenance",
      "Clean the Cobalt lift box.",
      "Clean the Sea-Doo lift box.",
      "Clean the dock lift box.",
      "Clean and organize the storage box.",
      "SECTION: De-winterization",
      "De-winterize the Sea-Doo.",
      "De-winterize the Cobalt.",
      "SECTION: Dock Maintenance",
      "Install solar bug zapper.",
      "Clean the dock and dock extension.",
      "Check dock lights.",
    ],
  },
  {
    id: "power-outage",
    title: "Power Outage (Draft)",
    area: "Mechanical Room",
    priority: "High",
    steps: [
      "DRAFT — review technical instructions before use.",
      "Check both boilers for faults; follow the on-screen correction steps if a fault is shown.",
      "Check the make-up water container; it should contain 6 gallons. Fill from the hose bib above if needed.",
      "Check recirculation-pump PSI. If under 20, fill the boilers using the hose bib above the make-up water container.",
      "Check pool temperature on the Desert Aire screen.",
      "Recheck PSI every 30 minutes and add water if below 20.",
      "After pressures balance, noises should stop and equipment should return to normal operation.",
    ],
  },
  {
    id: "fertilize-lawn",
    title: "Fertilize Lawn",
    area: "Landscaping",
    priority: "Seasonal",
    steps: [
      "Every 6–8 weeks according to the soil sample.",
      "Mow lawn.",
      "Fill spreader with fertilizer.",
      "Spread evenly across lawn.",
      "Blow fertilizer off pavers, sport court, and driveway.",
      "Water all lawns.",
    ],
  },
  {
    id: "cushion-storage-winter",
    title: "Cushion Storage for Winter",
    area: "Exterior",
    priority: "Seasonal",
    steps: [
      "Bring exterior cushions to the basement to dry.",
      "After dry, vacuum all cushions.",
      "Spray stains with fabric cleaner and scrub.",
      "Steam-clean stained areas and remove all suds.",
      "Lay cushions out to dry.",
      "Bag each sitting area together.",
      "Store in crawlspace until spring.",
      "Obtain completion sign-off.",
    ],
  },
  {
    id: "yearly-service-wine-cooler",
    title: "Yearly Service of Wine Cooler",
    area: "Wine Cooling",
    priority: "Seasonal",
    steps: [
      "Unplug and unload the appliance.",
      "Vacuum the condenser on the back of the appliance.",
      "Clean the inside compartment with water and a gentle cleaning product.",
      "Rinse thoroughly.",
      "Dry with a soft rag.",
      "Replace the charcoal filter in the breather hole at the top of the cabinet.",
      "One lower source item was obscured and must be reviewed before adding.",
    ],
  },
  {
    id: "winterizing-cobalt",
    title: "Winterizing Cobalt",
    area: "Boat / Dock",
    priority: "Seasonal",
    steps: [
      "Schedule Seattle Boat.",
      "Remove and store carpets.",
      "Install snap covers for winter.",
      "Plug in dehumidifier.",
      "Vacuum and sweep the boat.",
      "Install automatic cover.",
      "Check weekly.",
      "Obtain completion sign-off.",
    ],
  },
  {
    id: "generator-maintenance",
    title: "Generator Maintenance",
    area: "Generators",
    priority: "High",
    steps: [
      "Check generator belt for wear.",
      "Change air filters.",
      "Remove and inspect spark plugs; replace after 1,000 hours.",
      "Check oil level in sight glass; if oil is visible, do not add oil.",
      "Inspect V-belt tension and wear; replace if cracked.",
    ],
  },
  {
    id: "pool-heater-burner-inspection",
    title: "Pool Heater / Burner System Inspection (Draft)",
    area: "Pool Equipment",
    priority: "High",
    steps: [
      "DRAFT — confirm exact title and linked asset before use.",
      "Replace sand in filter every 5 years.",
      "Visually inspect and clean wiring and burner system; contact vendor if damage is found.",
      "Inspect burner chamber for scaling inside tubes / heat exchanger.",
      "Check for leaks near the pressure-relief valve.",
      "Inspect seals and fittings.",
    ],
  },
  {
    id: "inverter-maintenance",
    title: "Inverter Maintenance (Draft)",
    area: "Electrical",
    priority: "Normal",
    steps: [
      "DRAFT — confirm exact inverter asset and location before use.",
      "Verify switches are set to Auto or On.",
      "Check wiring and electrical connections.",
      "Clean inverter of dust and debris.",
      "Inspect inverter display for error messages.",
      "Confirm inverter is operating as expected.",
      "Verify correct AC and DC voltage.",
    ],
  },
  {
    id: "low-voltage-controls-inspection",
    title: "Low-Voltage Panels / Controls Inspection",
    area: "Low Voltage / Controls",
    priority: "Normal",
    steps: [
      "Test all exterior lighting and replace failed bulbs.",
      "Check each panel for damage and corrosion.",
      "Clean panels of dust and debris.",
      "Inspect wiring and burned equipment.",
      "Power down and clean panel interiors with compressed air.",
      "Tighten loose screws.",
      "Test operating voltage and lighting battery backup.",
      "Check all cameras and schedules.",
      "Test network connections.",
      "Test fuses and breakers, including phone and lighting panels.",
    ],
  },
  {
    id: "boat-cleaning",
    title: "Boat Cleaning",
    area: "Cobalt R7",
    priority: "Normal",
    steps: [
      "Clean the outside of the boat; use saltwater wash if very dirty, otherwise regular boat wash. Wash top to bottom with a wash brush and towel dry.",
      "Clean seats throughout the boat with multipurpose boat cleaner.",
      "Clean windshield inside and out with streak-free cleaner.",
      "Wipe stainless steel.",
      "Clean interior bathroom.",
      "Make sure the automatic cover is on when finished.",
    ],
  },
  {
    id: "pool-daily-treatment-cleaning",
    title: "Pool Daily Treatment / Pool Cleaning (Draft)",
    area: "Indoor Pool",
    priority: "High",
    steps: [
      "DRAFT — chemical wording must be confirmed before activation.",
      "Keep 10 tabs in the reservoir.",
      "Clean both skimmer baskets.",
      "Empty the in-floor vacuum basket.",
      "Check and empty the pool filter basket.",
      "Clean the vacuum screen.",
      "Vacuum the pool floor.",
      "Brush the pool.",
      "Fill the pool with well water as needed.",
      "Leave the on/off switch on.",
      "Setting was 50% as of 1/25/2026.",
      "Inspect daily.",
      "Chlorine and bromine source instructions were obscured; do not guess or activate them.",
    ],
  },
];

const fallbackCalendar: CalendarItem[] = [
  {
    id: "cal-friday-meeting",
    date: todayISO(),
    time: "9:00 AM",
    title: "Friday 9 AM Steve meeting",
    area: "Personal / Owner",
    categoryLabel: "Personal / Owner",
    colorId: "personal-owner",
    colorName: "yellow",
    reminder: "Morning of",
    repeat: "Weekly",
    source: "manual",
  },
  {
    id: "cal-tuesday-meeting",
    date: todayISO(),
    time: "10:00 AM",
    title: "Tuesday 10 AM Steve / Patrick meeting",
    area: "Landscaping",
    categoryLabel: "Landscaping",
    colorId: "landscaping",
    colorName: "green",
    reminder: "Morning of",
    repeat: "Weekly",
    source: "manual",
  },
  {
    id: "cal-sunstream",
    date: "2026-07-10",
    time: "",
    title: "Sunstream Boat Cover",
    area: "Boat / Dock",
    categoryLabel: "Boat / Dock",
    colorId: "boat-dock",
    colorName: "blue",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
  {
    id: "cal-seaborne",
    date: "2026-07-13",
    time: "",
    title: "SeaBorne Dock Work",
    area: "Boat / Dock",
    categoryLabel: "Boat / Dock",
    colorId: "boat-dock",
    colorName: "blue",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
  {
    id: "cal-carpet-prep",
    date: "2026-07-21",
    time: "",
    title: "Prep Evis Room for Carpet",
    area: "Other",
    categoryLabel: "Other",
    colorId: "other",
    colorName: "gray",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
  {
    id: "cal-flooring",
    date: "2026-07-22",
    time: "",
    title: "5 Star Flooring / Eric — Evi's room",
    area: "Vendor",
    categoryLabel: "Vendor",
    colorId: "vendor",
    colorName: "purple",
    allDay: true,
    repeat: "None",
    source: "manual",
  },
];

const fallbackParts: PartRecord[] = [
  {
    id: "filters-aprilaire-210",
    name: "Aprilaire #210 4x20x25 Filter",
    category: "HVAC Filters",
    locationId: "mechanical-room",
    vendorId: "amazon",
    quantity: 1,
    minQuantity: 1,
    status: "Low",
    notes: "Amazon filter record.",
  },
];

const defaultWorkLinks: WorkLinkRecord[] = [
  {
    id: "landscape-help-admin",
    name: "Landscape Help — Admin",
    category: "Atlas / Admin Checklist",
    vendor: "Peter Clark Designs / Landscaping Help",
    url: "/landscape-help",
    logoText: "LH",
    logoBg: "#EAF7F1",
    logoUrl: WORKLINK_LOGOS.landscapeHelpAdmin,
    logoColor: colors.green,
    notes:
      "Your private Landscape Help admin page. Use this to review the weekly checklist and copy the current crew link.",
  },
  {
    id: "landscape-help-crew",
    name: "Landscape Help — Crew Link",
    category: "Send to Crew / Public Checklist",
    vendor: "Peter Clark Designs / Landscaping Help",
    url: "https://www.atlas2000.com/landscape-help?token=878c3fa681301e6bd6c8deeb6d3818eb9bb33e5125e02048",
    logoText: "LH",
    logoBg: "#EAF7F1",
    logoUrl: WORKLINK_LOGOS.landscapeHelp,
    logoColor: colors.green,
    notes:
      "Send this exact link to the landscaping crew so they can check off tasks and add notes without full Atlas access.",
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
    notes:
      "Property supplies, HVAC filters, parts, tools, and recurring orders.",
  },
  {
    id: "control4",
    name: "Control4 Customer Portal",
    category: "Smart Home / Controls",
    vendor: "High Tech Living",
    url: "https://customer.control4.com/",
    logoText: "C4",
    logoBg: "#C91E35",
    logoUrl: WORKLINK_LOGOS.control4,
    logoColor: "#FFFFFF",
    notes:
      "Control4 customer portal. Learn more later before relying on it for daily operations.",
  },
  {
    id: "total-connect-comfort",
    name: "Total Connect Comfort / HVAC Zones",
    category: "HVAC / Thermostats / Zones",
    vendor: "Honeywell / Carrier",
    url: "https://mytotalconnectcomfort.com/portal/7560987/Zones",
    logoText: "TCC",
    logoBg: "#FEECEC",
    logoUrl: WORKLINK_LOGOS.tccHoneywell,
    logoColor: colors.red,
    notes:
      "Main zone control page for the Carrier / Honeywell HVAC zoning system.",
  },

  {
    id: "maintainx-work-order",
    name: "MaintainX Work Order",
    category: "Work Orders / Maintenance",
    vendor: "MaintainX",
    url: "https://app.getmaintainx.com/workorders/108180701",
    logoText: "MX",
    logoBg: "#EEF6FF",
    logoUrl: "https://app.getmaintainx.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Direct MaintainX work order link.",
  },

  {
    id: "paylocity",
    name: "Paylocity",
    category: "Payroll / HR",
    vendor: "Paylocity",
    url: "https://access.paylocity.com/",
    logoText: "PL",
    logoBg: "#EEF2FF",
    logoUrl: "https://access.paylocity.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Payroll, HR, and timekeeping portal.",
  },
  {
    id: "ramp",
    name: "Ramp",
    category: "Company Cards / Expenses",
    vendor: "Ramp",
    url: "https://app.ramp.com/sign-in",
    logoText: "R",
    logoBg: "#E8FF00",
    logoUrl: WORKLINK_LOGOS.ramp,
    logoColor: "#101010",
    notes: "Company cards, receipts, and expense management.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "AI / Assistant",
    vendor: "OpenAI",
    url: "https://chatgpt.com/",
    logoText: "AI",
    logoBg: "#F8FAFC",
    logoUrl: "https://chatgpt.com/favicon.ico",
    logoColor: colors.navy3,
    notes:
      "Assistant workspace for Atlas notes, planning, email review, and intake.",
  },

  {
    id: "outlook-email",
    name: "Outlook Email",
    category: "Email / Communication",
    vendor: "Microsoft Outlook",
    url: "https://outlook.office.com/mail/",
    logoText: "OL",
    logoBg: "#EFF6FF",
    logoUrl: "https://outlook.office.com/favicon.ico",
    logoColor: colors.navy3,
    notes: "Outlook email inbox for viewing mail.",
  },
  {
    id: "babbel",
    name: "Babbel",
    category: "Learning / Training",
    vendor: "Babbel",
    url: "https://my.babbel.com/dashboard",
    logoText: "BB",
    logoBg: "#FFF7ED",
    logoUrl: "https://my.babbel.com/favicon.ico",
    logoColor: "#C2410C",
    notes: "Learning dashboard.",
  },
  {
    id: "microsoft-to-do",
    name: "Microsoft To Do",
    category: "Tasks / Planning",
    vendor: "Microsoft",
    url: "https://to-do.office.com/tasks/",
    logoText: "TD",
    logoBg: "#EEF6FF",
    logoUrl: "https://to-do.office.com/favicon.ico",
    logoColor: "#2563EB",
    notes: "Microsoft To Do task lists and personal planning.",
  },
  {
    id: "metaviewer",
    name: "MetaViewer Invoice Search / Approvals",
    category: "Invoices / Approvals / Accounting",
    vendor: "MetaFile Solutions",
    url: "https://arc.metafilesolutions.com/Metaviewer/Account/LogOn?ReturnUrl=%2fMetaViewer%2fIp%3fname%3dMyApprovals&name=MyApprovals",
    logoText: "MV",
    logoBg: "#F1F5F9",
    logoUrl: WORKLINK_LOGOS.metaViewer,
    logoColor: colors.navy3,
    notes: "Invoice search and My Approvals portal.",
  },
];

const documents: DocumentRecord[] = [];

const manualCategories: ManualCategory[] = [
  "Operator / Owner Manuals",
  "Installation Manuals",
  "Service / Repair Manuals",
  "Maintenance Guides",
  "Parts Catalogs",
  "Wiring Diagrams",
  "Technical Specifications",
  "Quick Start Guides",
  "Warranty Documents",
  "Safety / Compliance Documents",
];

const seaDooManualUrl =
  "https://www.operatorsguides.brp.com/readguide/12118";

function cleanManualOpenUrl(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  return trimmed
    .replace(/&amp;/gi, "&")
    .replace(/%2520/gi, "%20")
    .replace(/\s/g, "%20");
}

const defaultManuals: ManualRecord[] = [
  {
    id: "manual-seadoo-219002349",
    title: "2024 Sea-Doo GTI, GTR and Wake 170 Series Operator’s Guide",
    category: "Operator / Owner Manuals",
    manufacturer: "BRP / Sea-Doo",
    model: "GTI SE 170",
    documentNumber: "219002349",
    linkedAssetId: "",
    linkedAssetName: "2024 Sea-Doo GTI SE 170",
    sourceLabel: "Official BRP Operator Guides",
    href: seaDooManualUrl,
    notes:
      "Official operator’s guide covering operation, safety, maintenance, troubleshooting, and specifications for the Sea-Doo GTI, GTR, and Wake 170 series.",
    files: [],
    createdAt: new Date().toISOString(),
  },
];

function inferManualCategory(value: string): ManualCategory {
  const text = String(value || "").toLowerCase();
  if (/install/.test(text)) return "Installation Manuals";
  if (/service|repair|shop/.test(text)) return "Service / Repair Manuals";
  if (/maintenan/.test(text)) return "Maintenance Guides";
  if (/parts|catalog/.test(text)) return "Parts Catalogs";
  if (/wiring|electrical|diagram/.test(text)) return "Wiring Diagrams";
  if (/spec|data ?sheet|technical/.test(text))
    return "Technical Specifications";
  if (/quick|start/.test(text)) return "Quick Start Guides";
  if (/warrant/.test(text)) return "Warranty Documents";
  if (/safety|compliance/.test(text))
    return "Safety / Compliance Documents";
  return "Operator / Owner Manuals";
}

function blankManual(): ManualRecord {
  return {
    id: "",
    title: "",
    category: "Operator / Owner Manuals",
    manufacturer: "",
    model: "",
    documentNumber: "",
    linkedAssetId: "",
    linkedAssetName: "",
    sourceLabel: "",
    href: "",
    notes: "",
    files: [],
    createdAt: new Date().toISOString(),
  };
}

function normalizeManualRecord(record: Partial<ManualRecord>): ManualRecord {
  const category = manualCategories.includes(record.category as ManualCategory)
    ? (record.category as ManualCategory)
    : "Operator / Owner Manuals";
  return {
    ...blankManual(),
    ...record,
    id: String(record.id || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(record.title || ""),
    category,
    manufacturer: String(record.manufacturer || ""),
    model: String(record.model || ""),
    documentNumber: String(record.documentNumber || ""),
    linkedAssetId: String(record.linkedAssetId || ""),
    linkedAssetName: String(record.linkedAssetName || ""),
    sourceLabel: String(record.sourceLabel || ""),
    href: String(record.href || ""),
    notes: String(record.notes || ""),
    files: Array.isArray(record.files) ? record.files : [],
    createdAt: String(record.createdAt || new Date().toISOString()),
  };
}


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
        <textarea
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          placeholder={props.placeholder}
          style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
        />
      ) : (
        <input
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          placeholder={props.placeholder}
          style={inputStyle}
        />
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
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value as T)}
        style={inputStyle}
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard(props: {
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={props.onClick} style={modernStatStyle}>
      <div style={statValueStyle}>{props.value}</div>
      <div style={statLabelStyle}>{props.label}</div>
    </button>
  );
}

function AtlasMiniMark({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: Math.max(8, Math.round(size * 0.28)),
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
        background: colors.navy,
        border: `1px solid ${colors.gold2}`,
        boxShadow: "0 5px 14px rgba(7,27,47,0.12)",
      }}
    >
      <span
        style={{
          color: colors.gold2,
          fontWeight: 900,
          fontSize: Math.max(12, Math.round(size * 0.48)),
          lineHeight: 1,
        }}
      >
        A
      </span>
      <img
        src="/atlas-logo.png"
        alt=""
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
        style={{
          position: "absolute",
          inset: 2,
          width: `calc(100% - 4px)`,
          height: `calc(100% - 4px)`,
          objectFit: "contain",
        }}
      />
    </span>
  );
}

function SectionHeader(props: {
  eyebrow?: string;
  title?: string;
  detail?: string;
  right?: React.ReactNode;
  brand?: boolean;
}) {
  if (!props.eyebrow && !props.title && !props.detail && !props.right)
    return null;

  return (
    <div style={sectionHeaderStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: props.brand ? 10 : 0, minWidth: 0 }}>
        {props.brand ? <AtlasMiniMark size={30} /> : null}
        <div style={{ minWidth: 0 }}>
          {props.eyebrow ? <div style={eyebrowStyle}>{props.eyebrow}</div> : null}
          {props.title ? <h2 style={sectionTitleStyle}>{props.title}</h2> : null}
          {props.detail ? <p style={mutedSmallStyle}>{props.detail}</p> : null}
        </div>
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
  gridStyleOverride?: React.CSSProperties;
  drawerResetKey?: string | number;
}) {
  const drawerScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const resetDrawerScroll = () => {
      const drawer = drawerScrollRef.current;
      if (!drawer) return;
      drawer.scrollTop = 0;
      drawer.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    resetDrawerScroll();
    const frame = window.requestAnimationFrame(resetDrawerScroll);
    const timeout = window.setTimeout(resetDrawerScroll, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [props.drawerResetKey]);

  const isCalendarLayout = props.outerStyle === calendarNavyShellStyle;

  const desktopOuterStyle: React.CSSProperties = props.isMobile
    ? sectionStyle
    : isCalendarLayout
      ? {
          ...sectionStyle,
          height: "auto",
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "auto auto",
          overflow: "visible",
        }
      : {
          ...sectionStyle,
          height: "calc(100vh - 154px)",
          minHeight: 560,
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          overflow: "hidden",
        };

  const outerStyle = props.outerStyle
    ? { ...desktopOuterStyle, ...props.outerStyle }
    : desktopOuterStyle;

  const desktopGridStyle: React.CSSProperties = props.isMobile
    ? {
        ...drawerGridStyle,
        gridTemplateColumns: "1fr",
      }
    : isCalendarLayout
      ? {
          ...drawerGridStyle,
          gridTemplateColumns: "minmax(0, 86%) minmax(210px, 14%)",
          gap: 12,
          height: "auto",
          minHeight: 0,
          overflow: "visible",
          alignItems: "start",
        }
      : {
          ...drawerGridStyle,
          gridTemplateColumns: "minmax(240px, 32%) minmax(0, 68%)",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        };

  const desktopListStyle: React.CSSProperties = props.isMobile
    ? listPanelStyle
    : isCalendarLayout
      ? {
          ...listPanelStyle,
          height: "auto",
          minHeight: 0,
          overflowY: "visible",
          overflowX: "hidden",
          paddingRight: 0,
        }
      : {
          ...listPanelStyle,
          height: "100%",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 6,
          overscrollBehavior: "contain",
        };

  const desktopDrawerStyle: React.CSSProperties = props.isMobile
    ? drawerStyle
    : isCalendarLayout
      ? {
          ...drawerStyle,
          position: "sticky",
          top: 12,
          height: "auto",
          maxHeight: "calc(100vh - 32px)",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }
      : {
          ...drawerStyle,
          position: "relative",
          top: "auto",
          height: "100%",
          maxHeight: "none",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        };

  return (
    <section style={outerStyle}>
      {props.eyebrow || props.detail || props.right ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingBottom: 14,
            marginBottom: 12,
            borderBottom: `1px solid ${colors.line}`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            {props.eyebrow ? (
              <div
                style={{ ...eyebrowStyle, marginBottom: props.detail ? 4 : 0 }}
              >
                {props.eyebrow}
              </div>
            ) : null}
            {props.detail ? (
              <p style={{ ...mutedSmallStyle, margin: 0 }}>{props.detail}</p>
            ) : null}
          </div>
          {props.right ? <div style={buttonRowStyle}>{props.right}</div> : null}
        </div>
      ) : null}
      <div
        style={
          props.gridStyleOverride
            ? { ...desktopGridStyle, ...props.gridStyleOverride }
            : desktopGridStyle
        }
      >
        <div
          style={
            props.listPanelStyleOverride
              ? { ...desktopListStyle, ...props.listPanelStyleOverride }
              : desktopListStyle
          }
        >
          {props.list}
        </div>
        <div
          ref={drawerScrollRef}
          style={
            props.drawerStyleOverride
              ? { ...desktopDrawerStyle, ...props.drawerStyleOverride }
              : desktopDrawerStyle
          }
        >
          {props.drawer}
        </div>
      </div>
    </section>
  );
}

export default function AtlasPage() {
  const [ready, setReady] = useState(false);
  const [screen, setScreenState] = useState<AtlasScreen>("dashboard");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState(
    "Loading Atlas records...",
  );
  const [saveToast, setSaveToast] = useState<{
    message: string;
    tone: "success" | "warning";
  } | null>(null);
  const saveToastTimerRef = useRef<number | null>(null);
  const [logoIndex, setLogoIndex] = useState(0);
  const [mapImageOk, setMapImageOk] = useState(true);

  const [mapLabels, setMapLabels] =
    useState<MapLabelRecord[]>(defaultMapLabels);
  const [selectedMapLabelId, setSelectedMapLabelId] = useState("");
  const [activeMapPanelTab, setActiveMapPanelTab] = useState<
    "info" | "vendors" | "photos" | "tabs"
  >("info");

  const [assetRecords, setAssetRecords] =
    useState<AssetRecord[]>(fallbackAssets);
  const [vendorRecords, setVendorRecords] =
    useState<VendorRecord[]>(fallbackVendors);
  const [contactRecords, setContactRecords] = useState<ContactRecord[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactDraft, setContactDraft] = useState<ContactRecord>(() =>
    blankContact(),
  );
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [serviceRecords, setServiceRecords] =
    useState<AtlasServiceRecord[]>(fallbackWorkOrders);
  const [workOrderSeasonFilter, setWorkOrderSeasonFilter] = useState<
    WorkSeason | "All"
  >("All");
  const [procedureRecords, setProcedureRecords] =
    useState<ProcedureRecord[]>(fallbackProcedures);
  const [requestRecords, setRequestRecords] = useState<OwnerRequestRecord[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestPortalToken, setRequestPortalToken] = useState("");
  const [requestMessage, setRequestMessage] = useState("Loading requests...");
  const [calendarItems, setCalendarItems] =
    useState<CalendarItem[]>(fallbackCalendar);
  const [calendarColors, setCalendarColors] = useState<CalendarColor[]>(
    defaultCalendarColors,
  );
  const [partRecords, setPartRecords] = useState<PartRecord[]>(fallbackParts);
  const [workLinks, setWorkLinks] =
    useState<WorkLinkRecord[]>(defaultWorkLinks);
  const [workLinkEditorOpen, setWorkLinkEditorOpen] = useState(false);
  const [workLinkDraft, setWorkLinkDraft] = useState<WorkLinkRecord>(() => ({
    id: "",
    name: "",
    category: "",
    vendor: "",
    url: "",
    logoText: "",
    logoBg: "#EEF6FF",
    logoUrl: "",
    logoColor: colors.navy3,
    notes: "",
  }));
  const [workLinkMessage, setWorkLinkMessage] = useState("");
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("0");
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [intakeDocs, setIntakeDocs] = useState<DocumentRecord[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItemRecord[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState("");
  const [inboxMessage, setInboxMessage] = useState("Loading Atlas Inbox...");
  const [analyzingInboxId, setAnalyzingInboxId] = useState("");
  const [inboxReviewOpen, setInboxReviewOpen] = useState(false);
  const [inboxReviewDraft, setInboxReviewDraft] = useState<InboxReviewDraft>({
    documentType: "", summary: "", manufacturer: "", model: "", serial: "",
    invoiceNumber: "", amount: "", date: "", psi: "", temperature: "",
    ph: "", hours: "", assetId: "", locationId: "", vendorId: "",
    workOrderId: "", notes: "",
  });
  const [inboxSearch, setInboxSearch] = useState("");

  const [manualRecords, setManualRecords] = useState<ManualRecord[]>(defaultManuals);
  const [selectedManualId, setSelectedManualId] = useState("");
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualRecord>(() => blankManual());
  const [manualSearch, setManualSearch] = useState("");
  const [manualCategoryFilter, setManualCategoryFilter] = useState<ManualCategory | "All">("All");
  const [manualMessage, setManualMessage] = useState("Paste a manual PDF link, upload a file, or select an existing manual.");


  const [intakeTitle, setIntakeTitle] = useState("");
  const [intakeType, setIntakeType] = useState("Paperwork / Scan");
  const [fastIntakeKind, setFastIntakeKind] =
    useState<FastIntakeKind>("Document");
  const [fastIntakeSaveMode, setFastIntakeSaveMode] =
    useState<FastIntakeSaveMode>("Attach to Existing");
  const [fastIntakeRecordName, setFastIntakeRecordName] = useState("");
  const [fastIntakeCategory, setFastIntakeCategory] = useState("General");
  const [fastIntakePriority, setFastIntakePriority] =
    useState<WorkOrderPriority>("Medium");
  const [fastIntakeLocationId, setFastIntakeLocationId] = useState("general");
  const [fastIntakeAppendNotes, setFastIntakeAppendNotes] = useState(false);
  const [intakeTargetKind, setIntakeTargetKind] =
    useState<IntakeTargetKind>("Asset");
  const [intakeTargetId, setIntakeTargetId] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [intakePastedText, setIntakePastedText] = useState("");
  const [intakeFiles, setIntakeFiles] = useState<UploadedFileRecord[]>([]);
  const [intakeMessage, setIntakeMessage] = useState(
    "Ready to add paperwork, scans, screenshots, receipts, or pasted notes into Atlas.",
  );
  const [documentSyncStatus, setDocumentSyncStatus] = useState(
    "Document vault is loading from this browser. Atlas sync starts when /api/atlas-documents is installed.",
  );
  const [previewFile, setPreviewFile] = useState<UploadedFileRecord | null>(
    null,
  );
  const [previewZoom, setPreviewZoom] = useState(100);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [dirtyRecords, setDirtyRecords] = useState<Record<string, boolean>>({});
  const [qrKind, setQrKind] = useState<QrKind>("asset");
  const [qrSearch, setQrSearch] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState(
    "Scanner is off. Start the camera, then point it at an Atlas QR label.",
  );
  const [scannerManualValue, setScannerManualValue] = useState("");
  const [lastScannedQr, setLastScannedQr] = useState("");

  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [calendarDraft, setCalendarDraft] = useState<CalendarItem>(() =>
    blankCalendarItem(todayISO()),
  );
  const [calendarDirty, setCalendarDirty] = useState(false);
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [showUsHolidays, setShowUsHolidays] = useState(true);
  const [showJewishHolidays, setShowJewishHolidays] = useState(true);
  const [calendarCategoryFilters, setCalendarCategoryFilters] = useState<
    Record<string, boolean>
  >({});
  const [calendarIntakeText, setCalendarIntakeText] = useState("");
  const [calendarIntakeMessage, setCalendarIntakeMessage] = useState("");

  const [weatherDays, setWeatherDays] = useState<WeatherDay[]>([]);
  const [selectedWeatherDate, setSelectedWeatherDate] = useState("");
  const [weatherStatus, setWeatherStatus] = useState(
    "Loading 7-day irrigation weather...",
  );
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(
    "Ask Atlas about assets, locations, vendors, contacts, work orders, calendar items, procedures, documents, parts, or map records.",
  );
  const [manualCandidates, setManualCandidates] = useState<ManualCandidate[]>([]);
  const [manualSavingUrl, setManualSavingUrl] = useState("");
  const [manualSaveMessage, setManualSaveMessage] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [dashboardAssistantOpen, setDashboardAssistantOpen] = useState(false);
  const [workPlanInput, setWorkPlanInput] = useState("");
  const [workPlanTasks, setWorkPlanTasks] = useState<WorkPlanTask[]>([]);
  const [workPlanTargetHours, setWorkPlanTargetHours] = useState(7);
  const [workPlanSaving, setWorkPlanSaving] = useState(false);
  const [workPlanMessage, setWorkPlanMessage] = useState(
    "Paste one task per line, then build a balanced weekly plan.",
  );

  const mapRef = useRef<HTMLDivElement | null>(null);
  const draggingLabelRef = useRef<string | null>(null);
  const previewTouchRef = useRef<{ distance: number; zoom: number } | null>(
    null,
  );
  const qrScannerRef = useRef<any>(null);
  const qrScannerElementId = "atlas-qr-reader";
  const atlasScreenHistoryReadyRef = useRef(false);

  function isAtlasScreen(value: string | null): value is AtlasScreen {
    return Boolean(value && screens.some((item) => item.id === value));
  }

  function screenFromUrl(): AtlasScreen | null {
    if (typeof window === "undefined") return null;
    const hash = decodeURIComponent(
      window.location.hash.replace(/^#\/?/, ""),
    ).trim();
    if (isAtlasScreen(hash)) return hash;
    const queryScreen = new URLSearchParams(window.location.search).get(
      "screen",
    );
    if (isAtlasScreen(queryScreen)) return queryScreen;
    return null;
  }

  function urlForScreen(next: AtlasScreen) {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const query = params.toString();
    return `${window.location.pathname}${query ? `?${query}` : ""}#${next}`;
  }

  function setScreen(next: AtlasScreen, options?: { replace?: boolean }) {
    setScreenState(next);

    if (typeof window === "undefined") return;

    if (next === "planner") {
      const safeUrl = urlForScreen("dashboard");
      window.history.replaceState(
        { atlasScreen: "dashboard", atlasOverlay: "planner" },
        "",
        safeUrl,
      );
      atlasScreenHistoryReadyRef.current = true;
      return;
    }

    const nextUrl = urlForScreen(next);
    const currentHash = decodeURIComponent(
      window.location.hash.replace(/^#\/?/, ""),
    ).trim();
    const state = { atlasScreen: next };

    if (!atlasScreenHistoryReadyRef.current || options?.replace) {
      window.history.replaceState(state, "", nextUrl);
      atlasScreenHistoryReadyRef.current = true;
      return;
    }

    if (currentHash !== next || window.history.state?.atlasScreen !== next) {
      window.history.pushState(state, "", nextUrl);
    }
  }

  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current !== null) {
        window.clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initialScreen = screenFromUrl() || "dashboard";
    setScreenState(initialScreen);
    window.history.replaceState(
      { atlasScreen: initialScreen },
      "",
      urlForScreen(initialScreen),
    );
    atlasScreenHistoryReadyRef.current = true;

    const onPopState = () => {
      setScreenState(screenFromUrl() || "dashboard");
      setQuery("");
      setSearchOpen(false);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setIsMobile(window.innerWidth < 820);
    const onResize = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);

    const storedMapLabels = readStoredArray<MapLabelRecord>(
      storageKeys.mapLabels,
      defaultMapLabels,
    ).map((label) => {
      const defaultLabel = defaultMapLabels.find(
        (item) => item.id === label.id,
      );
      const rawLabel = String(
        label.label ||
          (label as unknown as { name?: string }).name ||
          (label as unknown as { title?: string }).title ||
          "",
      ).trim();
      const displayLabel =
        !rawLabel || rawLabel.toLowerCase() === "map label"
          ? defaultLabel?.label || "New Label"
          : rawLabel;

      return {
        id: label.id || uid("map"),
        label: displayLabel,
        category: label.category || defaultLabel?.category || "Location",
        x: clampPercent(
          Number.isFinite(Number(label.x))
            ? Number(label.x)
            : Number(defaultLabel?.x),
        ),
        y: clampPercent(
          Number.isFinite(Number(label.y))
            ? Number(label.y)
            : Number(defaultLabel?.y),
        ),
        notes: label.notes || defaultLabel?.notes || "",
        photos: Array.isArray(label.photos) ? label.photos : [],
        vendorIds: Array.isArray(label.vendorIds)
          ? label.vendorIds.map(String)
          : [],
        detailBoxes: normalizeMapDetailBoxes(label),
        installer: label.installer || "",
        paintColor: label.paintColor || "",
        specs: label.specs || "",
        documentNotes: label.documentNotes || "",
        photoNotes: label.photoNotes || "",
        maintenanceNotes: label.maintenanceNotes || "",
      };
    });

    const storedAssets = readStoredArray<AssetRecord>(
      storageKeys.assets,
      fallbackAssets,
    ).map(normalizeAsset);
    const storedVendors = readStoredArray<VendorRecord>(
      storageKeys.vendors,
      fallbackVendors,
    ).map(normalizeVendor);
    const storedContacts = readStoredArray<ContactRecord>(
      storageKeys.contacts,
      [],
    ).map(normalizeContact);
    const storedServices = readStoredArray<ServiceRecord>(
      storageKeys.workOrders,
      fallbackWorkOrders,
    ).map(normalizeService);
    const storedProcedures = readStoredArray<ProcedureRecord>(
      storageKeys.procedures,
      fallbackProcedures,
    ).map(normalizeProcedure);
    const storedCalendar = readStoredArray<CalendarItem>(
      storageKeys.calendar,
      fallbackCalendar,
    ).map(normalizeCalendar);
    const storedCalendarColors = readStoredArray<CalendarColor>(
      storageKeys.calendarColors,
      defaultCalendarColors,
    );
    const storedParts = readStoredArray<PartRecord>(
      storageKeys.parts,
      fallbackParts,
    ).map(normalizePart);
    const storedPhotos = readStoredArray<PhotoRecord>(
      storageKeys.photos,
      [],
    ).map(normalizePhotoRecord);
    const storedIntakeDocs = readStoredArray<DocumentRecord>(
      storageKeys.intakeDocs,
      [],
    );
    const storedManuals = readStoredArray<ManualRecord>(
      storageKeys.manuals,
      defaultManuals,
    ).map(normalizeManualRecord);
    const storedWorkLinks = readStoredArray<WorkLinkRecord>(
      storageKeys.workLinks,
      defaultWorkLinks,
    );

    setMapLabels(
      byLabel(storedMapLabels.length ? storedMapLabels : defaultMapLabels),
    );
    setSelectedMapLabelId((storedMapLabels[0] ?? defaultMapLabels[0]).id);
    setAssetRecords(
      storedAssets.length ? byName(storedAssets) : fallbackAssets,
    );
    setVendorRecords(
      storedVendors.length ? byName(storedVendors) : fallbackVendors,
    );
    setContactRecords(byName(storedContacts));
    setServiceRecords(
      storedServices.length ? byTitle(storedServices) : fallbackWorkOrders,
    );
    setProcedureRecords(
      storedProcedures.length ? byTitle(storedProcedures) : fallbackProcedures,
    );
    setCalendarItems(
      storedCalendar.length ? byTitle(storedCalendar) : fallbackCalendar,
    );
    setCalendarColors(mergeCalendarColors(storedCalendarColors));
    setPartRecords(storedParts.length ? byName(storedParts) : fallbackParts);
    setWorkLinks(
      storedWorkLinks.length
        ? [...storedWorkLinks].sort((a, b) => a.name.localeCompare(b.name))
        : defaultWorkLinks,
    );
    setPhotos(storedPhotos);
    void cachePhotoRecords(storedPhotos).then(() => {
      persistPhotoRecords(storedPhotos);
    });
    setIntakeDocs(storedIntakeDocs.map(normalizeDocument));
    const repairedStoredManuals = storedManuals.map((item) =>
      item.id === "manual-seadoo-219002349"
        ? normalizeManualRecord({
            ...item,
            title: defaultManuals[0].title,
            category: defaultManuals[0].category,
            manufacturer: defaultManuals[0].manufacturer,
            model: defaultManuals[0].model,
            documentNumber: defaultManuals[0].documentNumber,
            linkedAssetName:
              item.linkedAssetName || defaultManuals[0].linkedAssetName,
            sourceLabel: defaultManuals[0].sourceLabel,
            href: seaDooManualUrl,
          })
        : item,
    );

    const manualsWithSeed = repairedStoredManuals.some(
      (item) => item.id === "manual-seadoo-219002349",
    )
      ? repairedStoredManuals
      : [defaultManuals[0], ...repairedStoredManuals];

    setManualRecords(manualsWithSeed);
    saveStoredArray(storageKeys.manuals[0], manualsWithSeed);
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

        const apiAssets = Array.isArray(payload.assetRecords)
          ? payload.assetRecords
          : Array.isArray(payload.assets)
            ? payload.assets
            : [];
        const apiVendors = Array.isArray(payload.vendorRecords)
          ? payload.vendorRecords
          : Array.isArray(payload.vendors)
            ? payload.vendors
            : [];
        const apiServices = Array.isArray(payload.serviceRecords)
          ? payload.serviceRecords
          : Array.isArray(payload.workOrders)
            ? payload.workOrders
            : [];
        const apiProcedures = Array.isArray(payload.procedureRecords)
          ? payload.procedureRecords
          : Array.isArray(payload.procedures)
            ? payload.procedures
            : [];
        const apiCalendar = Array.isArray(payload.calendarItems)
          ? payload.calendarItems
          : Array.isArray(payload.calendar)
            ? payload.calendar
            : [];
        const apiParts = Array.isArray(payload.partRecords)
          ? payload.partRecords
          : Array.isArray(payload.parts)
            ? payload.parts
            : [];
        const apiPhotos = (
          Array.isArray(payload.photos)
            ? payload.photos
            : Array.isArray(payload.assetPhotos)
              ? payload.assetPhotos
              : []
        )
          .map(normalizePhotoRecord)
          .filter((photo) => photo.id && photo.assetId);

        if (apiAssets.length) {
          const next = byName(apiAssets.map(normalizeAsset));
          setAssetRecords(next);
          setSelectedAssetId((current) =>
            next.some((item) => item.id === current) ? current : "",
          );
        }

        if (apiVendors.length) {
          const next = byName(apiVendors.map(normalizeVendor));
          setVendorRecords(next);
          setSelectedVendorId((current) =>
            next.some((item) => item.id === current) ? current : "",
          );
        }

        if (apiServices.length) {
          const next = byTitle(apiServices.map(normalizeService));
          setServiceRecords(next);
          setSelectedServiceId((current) =>
            next.some((item) => item.id === current) ? current : "",
          );
        }

        if (apiProcedures.length) {
          const normalizedApi = apiProcedures.map(normalizeProcedure);
          const existingTitles = new Set(
            normalizedApi.map((item) => item.title.trim().toLowerCase()),
          );
          const missingSeeds = fallbackProcedures.filter(
            (seed) => !existingTitles.has(seed.title.trim().toLowerCase()),
          );
          const next = byTitle([...normalizedApi, ...missingSeeds]);
          setProcedureRecords(next);
          setSelectedProcedureId((current) =>
            next.some((item) => item.id === current) ? current : "",
          );
          for (const seed of missingSeeds) {
            void postAtlasRecord("procedures", seed);
          }
        } else {
          setProcedureRecords(byTitle(fallbackProcedures));
          for (const seed of fallbackProcedures) {
            void postAtlasRecord("procedures", seed);
          }
        }

        {
          const apiNormalized = apiCalendar.map(normalizeCalendar);
          const browserCalendar = readStoredArray<CalendarItem>(
            storageKeys.calendar,
            [],
          ).map(normalizeCalendar);

          const mergedById = new Map<string, CalendarItem>();

          // API records establish the shared base.
          for (const item of apiNormalized) {
            if (item.id) mergedById.set(item.id, item);
          }

          // Browser records win when the same ID exists because they may contain
          // richer fields such as time, recurrence, reminders, notes, and links.
          for (const item of browserCalendar) {
            if (item.id) {
              const apiItem = mergedById.get(item.id);
              mergedById.set(
                item.id,
                normalizeCalendar({
                  ...(apiItem || {}),
                  ...item,
                }),
              );
            }
          }

          const next = byTitle(
            Array.from(mergedById.values()).filter(
              (item) => item.id && item.date && item.title,
            ),
          );

          if (next.length) {
            setCalendarItems(next);
            saveStoredArray(storageKeys.calendar[0], next);
          }

          // Recover browser-only events into Neon. This is especially important
          // if another device still holds meetings that a prior build hid.
          const apiIds = new Set(apiNormalized.map((item) => item.id));
          for (const item of browserCalendar) {
            if (!item.id || apiIds.has(item.id)) continue;
            void postAtlasRecord("calendar", {
              ...item,
              status:
                item.status ||
                (item.completed ? "Completed" : "Scheduled"),
            });
          }
        }

        if (apiParts.length) {
          const next = byName(apiParts.map(normalizePart));
          setPartRecords(next);
        }

        if (apiPhotos.length) {
          await cachePhotoRecords(apiPhotos);
          setPhotos((current) => {
            const next = mergePhotoRecords(current, apiPhotos);
            persistPhotoRecords(next);
            return next;
          });
        }

        setDatabaseStatus(
          `Atlas loaded: ${apiAssets.length || assetRecords.length} assets, ${apiVendors.length || vendorRecords.length} vendors, ${apiServices.length || serviceRecords.length} work orders.`,
        );
      } catch {
        if (!cancelled)
          setDatabaseStatus(
            "Using saved browser records / fallback records. /api/atlas did not load.",
          );
      }
    }

    void loadAtlasApi();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !photos.length) return;

    const missing = photos.filter((photo) => !photoSource(photo));
    if (!missing.length) return;

    let cancelled = false;

    void Promise.all(
      missing.map(async (photo) => ({
        id: photo.id,
        cached: await readCachedPhoto(photo.id),
      })),
    ).then((results) => {
      if (cancelled) return;

      const cachedById = new Map(
        results
          .filter((result) => result.cached)
          .map((result) => [result.id, result.cached!]),
      );

      if (!cachedById.size) return;

      setPhotos((current) =>
        current.map((photo) => {
          const cached = cachedById.get(photo.id);
          return cached
            ? {
                ...photo,
                dataUrl: cached.dataUrl || photo.dataUrl,
                url: cached.url || photo.url,
              }
            : photo;
        }),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [ready, photos]);

  useEffect(() => {
    void loadWeather();
  }, []);

  useEffect(() => {
    void refreshDocumentVault();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const rawQr = params.get("qr");
    if (!rawQr) return;

    openQrTarget(rawQr, { replaceUrl: true, source: "link" });
  }, []);

  useEffect(() => {
    if (screen !== "scan") void stopQrScanner(false);
  }, [screen]);

  useEffect(() => {
    return () => {
      void stopQrScanner(false);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStoredArray(storageKeys.mapLabels[0], mapLabels);
  }, [ready, mapLabels]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function loadRequests() {
      try {
        const response = await fetch("/api/atlas-requests", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || "Requests could not be loaded.");
        }
        if (cancelled) return;
        const next = Array.isArray(payload.requests) ? payload.requests : [];
        setRequestRecords(next);
        setRequestPortalToken(String(payload.portalToken || ""));
        setSelectedRequestId((current) =>
          next.some((item: OwnerRequestRecord) => item.id === current)
            ? current
            : next[0]?.id || "",
        );
        setRequestMessage(
          next.length
            ? `${next.length} owner request${next.length === 1 ? "" : "s"} loaded.`
            : "No owner requests yet.",
        );
      } catch (error) {
        if (!cancelled) {
          setRequestMessage(
            error instanceof Error ? error.message : "Requests could not be loaded.",
          );
        }
      }
    }

    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function loadInbox() {
      try {
        const response = await fetch("/api/atlas-inbox", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || "Atlas Inbox could not be loaded.");
        }
        if (cancelled) return;
        const next = Array.isArray(payload.items) ? payload.items : [];
        setInboxItems(next);
        setSelectedInboxId((current) =>
          next.some((item: InboxItemRecord) => item.id === current)
            ? current
            : next[0]?.id || "",
        );
        setInboxMessage(
          next.length
            ? `${next.length} Inbox item${next.length === 1 ? "" : "s"} loaded.`
            : "Atlas Inbox is empty.",
        );
      } catch (error) {
        if (!cancelled) {
          setInboxMessage(
            error instanceof Error ? error.message : "Atlas Inbox could not be loaded.",
          );
        }
      }
    }

    void loadInbox();
    return () => {
      cancelled = true;
    };
  }, [ready]);

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
    saveStoredArray(storageKeys.contacts[0], contactRecords);
  }, [ready, contactRecords]);

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

  useEffect(() => {
    if (!ready) return;

    const builtInLogoValues = new Set<string>(
      Object.values(WORKLINK_LOGOS)
        .map((value) => String(value))
        .filter((value) => value.length > 0)
    );
    const compactWorkLinks = workLinks.map((link) => ({
      ...link,
      // Built-in logos already ship with Atlas. Do not duplicate hundreds of
      // kilobytes of base64 data in localStorage, which can block Calendar saves.
      logoUrl:
        link.logoUrl && builtInLogoValues.has(link.logoUrl)
          ? undefined
          : link.logoUrl,
    }));

    const saved = saveStoredArray(storageKeys.workLinks[0], compactWorkLinks);
    if (!saved) {
      setWorkLinkMessage(
        "Work Links could not be saved in this browser. Try a smaller custom logo image.",
      );
    }
  }, [ready, workLinks]);

  function byLabel(records: MapLabelRecord[]) {
    return [...records].sort((a, b) => a.label.localeCompare(b.label));
  }

  function locationName(id?: string) {
    return locations.find((location) => location.id === id)?.name ?? "General";
  }

  function vendorName(id?: string) {
    return (
      vendorRecords.find((vendor) => vendor.id === id)?.name ?? "No vendor"
    );
  }

  function assetName(id?: string) {
    return assetRecords.find((asset) => asset.id === id)?.name ?? "No asset";
  }

  function atlasBaseUrl() {
    if (typeof window !== "undefined" && window.location.origin)
      return window.location.origin;
    return "https://www.atlas2000.com";
  }

  function recordQrUrl(kind: QrKind, id: string) {
    return `${atlasBaseUrl()}/?qr=${kind}:${encodeURIComponent(id)}`;
  }

  function qrImageUrl(value: string, size = 230) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(value)}`;
  }

  async function copyOwnerRequestQrImage(portalLink: string) {
    if (!portalLink) return;

    const imageUrl = qrImageUrl(portalLink, 700);

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.write &&
        typeof ClipboardItem !== "undefined"
      ) {
        const response = await fetch(imageUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("QR image download failed.");

        const sourceBlob = await response.blob();
        const pngBlob =
          sourceBlob.type === "image/png"
            ? sourceBlob
            : new Blob([await sourceBlob.arrayBuffer()], {
                type: "image/png",
              });

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
        setRequestMessage("Owner request QR image copied.");
        return;
      }

      throw new Error("Image clipboard is unavailable.");
    } catch {
      try {
        await navigator.clipboard.writeText(portalLink);
        setRequestMessage(
          "This browser could not copy the QR picture, so the owner request link was copied instead.",
        );
      } catch {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
        setRequestMessage(
          "The QR image opened in a new tab. Save or share it from there.",
        );
      }
    }
  }

  function parseQrTarget(value: string): { kind: QrKind; id: string } | null {
    let raw = String(value || "").trim();
    if (!raw) return null;

    try {
      const parsedUrl = new URL(raw, atlasBaseUrl());
      raw = parsedUrl.searchParams.get("qr") || raw;
    } catch {
      const match = raw.match(/[?&]qr=([^&#]+)/);
      if (match?.[1]) raw = decodeURIComponent(match[1]);
    }

    const [rawKind, ...idParts] = raw.split(":");
    const kind = rawKind as QrKind;
    const id = decodeURIComponent(idParts.join(":")).trim();

    if (!id || !["asset", "location", "vendor", "map"].includes(kind))
      return null;
    return { kind, id };
  }

  function openQrTarget(
    value: string,
    options?: { replaceUrl?: boolean; source?: "scanner" | "manual" | "link" },
  ) {
    const scannedValue = String(value || "").trim();

    if (scannedValue && typeof window !== "undefined") {
      try {
        const scannedUrl = new URL(scannedValue, window.location.origin);
        const isSafeAtlasUrl =
          scannedUrl.protocol === "https:" &&
          scannedUrl.origin === window.location.origin;

        if (isSafeAtlasUrl && !scannedUrl.searchParams.get("qr")) {
          setLastScannedQr(scannedValue);
          setScannerStatus("QR code recognized. Opening link...");

          if (options?.source === "scanner") {
            void stopQrScanner(false).finally(() => {
              window.location.assign(scannedUrl.toString());
            });
          } else {
            window.location.assign(scannedUrl.toString());
          }

          return true;
        }
      } catch {
        // Continue to Atlas record parsing below.
      }
    }

    const parsed = parseQrTarget(scannedValue);

    if (!parsed) {
      setScannerStatus(
        "That QR code was read, but it is not a supported Atlas record or secure Atlas link.",
      );
      return false;
    }

    const { kind, id } = parsed;
    setLastScannedQr(String(value || ""));
    setScannerManualValue("");
    setQuery("");

    if (kind === "asset") {
      setSelectedAssetId(id);
      setScreen("assets");
    }

    if (kind === "vendor") {
      setSelectedVendorId(id);
      setScreen("vendors");
    }

    if (kind === "location") {
      const location = locations.find((item) => item.id === id);
      setQuery(location?.name || "");
      setScreen("locations");
    }

    if (kind === "map") {
      setSelectedMapLabelId(id);
      setScreen("map");
    }

    setScannerStatus(`Opened Atlas ${kind}: ${id}`);

    if (options?.source === "scanner") void stopQrScanner(false);

    if (options?.replaceUrl && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("qr");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    return true;
  }

  function loadQrScannerScript() {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Scanner only runs in the browser."));
        return;
      }

      if ((window as any).Html5Qrcode) {
        resolve();
        return;
      }

      const existing = document.getElementById(
        "atlas-html5-qrcode-script",
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("QR scanner script failed to load.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "atlas-html5-qrcode-script";
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("QR scanner script failed to load."));
      document.body.appendChild(script);
    });
  }

  async function startQrScanner() {
    if (typeof window === "undefined") return;

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setScannerStatus(
        "Camera scanning requires HTTPS. Open Atlas from https://www.atlas2000.com and try again.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerStatus(
        "This browser does not allow camera scanning here. Use the phone Camera app to scan the QR label; it will still open Atlas correctly.",
      );
      return;
    }

    setScannerStatus("Starting camera scanner...");

    try {
      await loadQrScannerScript();
      await stopQrScanner(false);

      const Html5Qrcode = (window as any).Html5Qrcode;
      if (!Html5Qrcode) throw new Error("QR scanner library did not load.");

      const scanner = new Html5Qrcode(qrScannerElementId, false);
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: isMobile
            ? { width: 230, height: 230 }
            : { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          openQrTarget(decodedText, { source: "scanner" });
        },
        () => undefined,
      );

      setScannerActive(true);
      setScannerStatus("Camera is active. Point it at an Atlas QR label.");
    } catch {
      setScannerActive(false);
      qrScannerRef.current = null;
      setScannerStatus(
        "Could not start the camera scanner. Allow camera permission, reload Atlas, or use the phone Camera app to scan the QR label.",
      );
    }
  }

  async function stopQrScanner(updateStatus = true) {
    const scanner = qrScannerRef.current;
    if (!scanner) {
      setScannerActive(false);
      if (updateStatus) setScannerStatus("Scanner is off.");
      return;
    }

    try {
      await scanner.stop();
    } catch {
      // Scanner may already be stopped.
    }

    try {
      await scanner.clear();
    } catch {
      // Clear is best-effort only.
    }

    qrScannerRef.current = null;
    setScannerActive(false);
    if (updateStatus) setScannerStatus("Scanner is off.");
  }

  function colorForEvent(event: CalendarItem) {
    const labelRecord = calendarColors.find(
      (color) => color.id === event.colorId,
    );
    const colorName =
      event.colorName ||
      labelRecord?.colorName ||
      colorNameFromLegacyColorId(event.colorId);
    const plain = plainColor(colorName);

    return {
      id: colorName,
      label:
        event.categoryLabel || event.area || labelRecord?.label || plain.label,
      hex: plain.hex,
      colorName,
    };
  }

  function selectedColor() {
    const plain = plainColor(
      calendarDraft.colorName ||
        colorNameFromLegacyColorId(calendarDraft.colorId),
    );
    return {
      id: plain.id,
      label: plain.label,
      hex: plain.hex,
      colorName: plain.id,
    };
  }

  function categoryForEvent(event: CalendarItem) {
    return (
      event.categoryLabel || event.area || colorForEvent(event).label || "Other"
    );
  }

  function isCategoryVisible(category: string) {
    return calendarCategoryFilters[category] !== false;
  }

  const selectedMapLabel = mapLabels.find(
    (label) => label.id === selectedMapLabelId,
  ) ?? {
    id: "",
    label: "",
    category: "",
    x: 50,
    y: 50,
    notes: "",
    photos: [],
    coverPhotoId: "",
    vendorIds: [],
    detailBoxes: [],
    installer: "",
    paintColor: "",
    specs: "",
    documentNotes: "",
    photoNotes: "",
    maintenanceNotes: "",
  };
  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId) ?? {
      id: "",
      name: "",
      type: "",
      zone: "",
      notes: "",
    };
  const selectedAsset =
    assetRecords.find((asset) => asset.id === selectedAssetId) ??
    normalizeAsset({
      id: "",
      name: "",
      locationId: "",
      category: "",
      status: "Monitor",
      make: "",
      model: "",
      serial: "",
      notes: "",
      vendorIds: [],
    });
  const selectedVendor =
    vendorRecords.find((vendor) => vendor.id === selectedVendorId) ??
    normalizeVendor({
      id: "",
      name: "",
      category: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
    });
  const selectedService =
    serviceRecords.find((service) => service.id === selectedServiceId) ??
    normalizeService({
      id: "",
      assetId: "",
      vendorId: "",
      procedureId: "",
      date: "",
      title: "",
      status: "Open",
      priority: "Medium",
      notes: "",
      followUpDate: "",
      recurring: false,
      recurrenceInterval: 1,
      recurrenceUnit: "Weeks",
      recurrenceEndDate: "",
      season: seasonForDate(),
      lastCompletedDate: "",
      completionHistory: [],
      workType: "Work Order",
      workCategory: "🔧 Maintenance",
      effort: "30 minutes",
      responsibilityArea: "",
      emoji: "🔧",
      assignedTo: "",
      locationId: "",
      checklist: [],
      notesHistory: [],
      photos: [],
      documents: [],
    });
  const selectedProcedure =
    procedureRecords.find(
      (procedure) => procedure.id === selectedProcedureId,
    ) ??
    normalizeProcedure({
      id: "",
      title: "",
      area: "",
      priority: "Normal",
      steps: [],
    });
  const selectedRequest =
    requestRecords.find((request) => request.id === selectedRequestId) ??
    requestRecords[0] ??
    null;
  const selectedPart =
    partRecords.find((part) => part.id === selectedPartId) ??
    normalizePart({
      id: "",
      name: "",
      category: "",
      locationId: "",
      assetId: "",
      vendorId: "",
      quantity: 0,
      minQuantity: 0,
      status: "In Stock",
      notes: "",
    });
  const selectedAssetPhotos = selectedAssetId
    ? photos.filter((photo) => photo.assetId === selectedAssetId)
    : [];
  const selectedWeather =
    weatherDays.find((day) => day.date === selectedWeatherDate) ??
    weatherDays[0];
  const selectedCalendar = calendarDraft;

  function dirtyKey(recordType: string, id?: string) {
    return `${recordType}:${id || ""}`;
  }

  function markRecordDirty(recordType: string, id?: string) {
    if (!id) return;
    const key = dirtyKey(recordType, id);
    setDirtyRecords((current) => ({ ...current, [key]: true }));
  }

  function clearRecordDirty(recordType: string, id?: string) {
    if (!id) return;
    const key = dirtyKey(recordType, id);
    setDirtyRecords((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function isRecordDirty(recordType: string, id?: string) {
    return !!id && !!dirtyRecords[dirtyKey(recordType, id)];
  }

  async function saveDirtyRecord(
    table: AtlasTable,
    record: unknown,
    recordType: string,
    id?: string,
  ) {
    await postAtlasRecord(table, record);
    clearRecordDirty(recordType, id);

    if (recordType === "asset") setSelectedAssetId("");
    if (recordType === "vendor") setSelectedVendorId("");
    if (recordType === "work_order") setSelectedServiceId("");
    if (recordType === "procedure") setSelectedProcedureId("");
    if (recordType === "part") setSelectedPartId("");
  }

  const showCalendarSave = calendarDirty;

  const holidayYears = useMemo(() => {
    const year = calendarCursor.getFullYear();
    return [year - 1, year, year + 1];
  }, [calendarCursor]);

  const usHolidayItems = useMemo(
    () => (showUsHolidays ? holidayYears.flatMap(getUsHolidays) : []),
    [showUsHolidays, holidayYears],
  );
  const jewishHolidayItems = useMemo(
    () => (showJewishHolidays ? holidayYears.flatMap(getJewishHolidays) : []),
    [showJewishHolidays, holidayYears],
  );

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
            notes: [
              record.notes,
              record.season ? `Season: ${record.season}` : "",
              record.recurring ? `Repeats ${recurrenceLabel(record)}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
            linkedType: "Work Order",
            linkedId: record.id,
            linkedName: record.title,
            completed: record.status === "Completed",
            source: "work-order",
          }),
        ),
    [serviceRecords],
  );

  const baseCalendarItems = useMemo(
    () => [
      ...calendarItems,
      ...workOrderCalendarItems,
      ...usHolidayItems,
      ...jewishHolidayItems,
    ],
    [calendarItems, workOrderCalendarItems, usHolidayItems, jewishHolidayItems],
  );

  const visibleCalendarItems = useMemo(
    () =>
      baseCalendarItems.filter((item) =>
        isCategoryVisible(categoryForEvent(item)),
      ),
    [baseCalendarItems, calendarCategoryFilters, calendarColors],
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
          expanded.push({
            ...item,
            date: dateKey,
            originalId: item.id,
            instanceId: `${item.id}-${dateKey}`,
          });
        }
        date.setDate(date.getDate() + 1);
      }
    });

    return expanded;
  }, [visibleCalendarItems, calendarCursor]);

  const calendarFilterLabels = useMemo(() => {
    const labels = new Set<string>();
    [...defaultCalendarColors, ...calendarColors].forEach((item) =>
      labels.add(item.label),
    );
    baseCalendarItems.forEach((item) => labels.add(categoryForEvent(item)));
    return Array.from(labels)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [baseCalendarItems, calendarColors]);

  const todayEvents = useMemo(
    () =>
      byTitle(expandedCalendarItems.filter((item) => item.date === todayISO())),
    [expandedCalendarItems],
  );

  const selectedDayEvents = useMemo(
    () =>
      byTitle(
        expandedCalendarItems.filter(
          (item) => item.date === selectedCalendarDate,
        ),
      ),
    [expandedCalendarItems, selectedCalendarDate],
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
      .sort((a, b) =>
        `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`),
      )
      .slice(0, 6);
  }, [expandedCalendarItems]);

  const q = query.trim().toLowerCase();

  const filteredLocations = useMemo(() => {
    const sorted = [...locations].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((item) =>
      [item.name, item.type, item.zone, item.notes]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q]);

  const filteredMapLabels = useMemo(() => {
    const sorted = byLabel(mapLabels);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [
        item.label,
        item.category,
        item.notes,
        (item.detailBoxes || [])
          .map((box) => `${box.title} ${box.body}`)
          .join(" "),
        (item.vendorIds || []).map(vendorName).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, mapLabels]);

  const filteredAssets = useMemo(() => {
    const sorted = byName(assetRecords);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [
        item.name,
        item.category,
        item.status,
        item.make,
        item.model,
        item.serial,
        item.notes,
        locationName(item.locationId),
        item.vendorIds.map(vendorName).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, assetRecords, vendorRecords]);

  const filteredVendors = useMemo(() => {
    const sorted = byName(vendorRecords);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [
        item.name,
        item.category,
        item.phone,
        item.email,
        item.website,
        item.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, vendorRecords]);

  const filteredContacts = useMemo(() => {
    const search = contactSearch.trim().toLowerCase();
    const sorted = byName(contactRecords);
    if (!search) return sorted;
    return sorted.filter((item) =>
      [
        item.name,
        item.organization,
        item.role,
        item.category,
        item.phone,
        item.email,
        item.address,
        item.website,
        item.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [contactRecords, contactSearch]);

  const filteredServices = useMemo(() => {
    const seasonFiltered = serviceRecords.filter(
      (item) =>
        workOrderSeasonFilter === "All" ||
        item.season === workOrderSeasonFilter,
    );
    const sorted = byTitle(seasonFiltered);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [
        item.title,
        item.status,
        item.priority,
        item.date,
        item.followUpDate,
        item.notes,
        item.season,
        recurrenceLabel(item),
        assetName(item.assetId),
        vendorName(item.vendorId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [
    q,
    serviceRecords,
    assetRecords,
    vendorRecords,
    workOrderSeasonFilter,
  ]);

  const filteredProcedures = useMemo(() => {
    const sorted = byTitle(procedureRecords);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [item.title, item.area, item.priority, item.steps.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, procedureRecords]);

  const filteredCalendar = useMemo(() => {
    const sorted = byTitle(calendarItems);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [
        item.title,
        item.area,
        item.categoryLabel,
        item.date,
        item.time,
        colorForEvent(item).label,
        item.notes,
        item.linkedName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, calendarItems, calendarColors]);

  const filteredParts = useMemo(() => {
    const sorted = byName(partRecords);
    if (!q) return sorted;
    return sorted.filter((item) =>
      [
        item.name,
        item.category,
        item.status,
        item.notes,
        locationName(item.locationId),
        assetName(item.assetId),
        vendorName(item.vendorId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, partRecords, assetRecords, vendorRecords]);

  const filteredWorkLinks = useMemo(() => {
    const sorted = [...workLinks].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (!q) return sorted;
    return sorted.filter((item) =>
      [item.name, item.category, item.vendor, item.notes, item.url]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [q, workLinks]);

  const allDocuments = useMemo(
    () => [...documents, ...intakeDocs],
    [intakeDocs],
  );

  const allManualRecords = useMemo(() => {
    const documentManuals = allDocuments
      .filter((document) => {
        const text = `${document.type} ${document.title}`.toLowerCase();
        const hasOpenableFile = Boolean(
          document.href ||
            (document.files || []).some(
              (file) => file.url || file.dataUrl,
            ),
        );
        return (
          hasOpenableFile &&
          /manual|owner'?s guide|operator|installation|service|repair|maintenance|parts catalog|wiring|specification|quick start|warranty|safety/.test(
            text,
          )
        );
      })
      .map((document) => {
        const openableFile = (document.files || []).find(
          (file) => file.url || file.dataUrl,
        );
        return normalizeManualRecord({
          id: `document-manual-${document.id}`,
          title: document.title,
          category: inferManualCategory(
            `${document.type} ${document.title}`,
          ),
          manufacturer: "",
          model: "",
          documentNumber: "",
          linkedAssetId:
            document.targetType === "Asset"
              ? document.targetId || document.linkedAssetId || ""
              : document.linkedAssetId || "",
          linkedAssetName:
            document.targetType === "Asset"
              ? document.targetName || ""
              : document.linkedAssetId
                ? assetName(document.linkedAssetId)
                : "",
          sourceLabel: "Atlas Documents",
          href:
            document.href ||
            openableFile?.url ||
            openableFile?.dataUrl ||
            "",
          notes: document.notes || "",
          files: document.files || [],
          createdAt: document.createdAt || "",
        });
      });

    const merged = new Map<string, ManualRecord>();
    [...manualRecords, ...documentManuals].forEach((manual) => {
      const key =
        cleanManualOpenUrl(manual.href).toLowerCase() ||
        `${manual.title.toLowerCase()}|${String(
          manual.linkedAssetId || manual.linkedAssetName || "",
        ).toLowerCase()}`;
      if (!merged.has(key)) merged.set(key, manual);
    });

    return [...merged.values()].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [allDocuments, manualRecords, assetRecords]);

  function documentTargetOptionsFor(kind: IntakeTargetKind) {
    if (kind === "Asset")
      return byName(assetRecords).map((asset) => ({
        id: asset.id,
        name: asset.name,
        detail: `${asset.category} · ${locationName(asset.locationId)}`,
      }));
    if (kind === "Location")
      return [...locations]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((location) => ({
          id: location.id,
          name: location.name,
          detail: `${location.type} · ${location.zone}`,
        }));
    if (kind === "Vendor")
      return byName(vendorRecords).map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        detail: vendor.category,
      }));
    if (kind === "Work Order")
      return byTitle(serviceRecords).map((record) => ({
        id: record.id,
        name: record.title,
        detail: `${formatDate(record.date)} · ${record.status}`,
      }));
    if (kind === "Map Label")
      return byLabel(mapLabels).map((label) => ({
        id: label.id,
        name: label.label,
        detail: label.category,
      }));
    return [];
  }

  const intakeTargetOptions = useMemo(
    () => documentTargetOptionsFor(intakeTargetKind),
    [intakeTargetKind, assetRecords, vendorRecords, serviceRecords, mapLabels],
  );

  useEffect(() => {
    if (intakeTargetKind === "General") {
      if (intakeTargetId) setIntakeTargetId("");
      return;
    }

    if (!intakeTargetOptions.length) {
      if (intakeTargetId) setIntakeTargetId("");
      return;
    }

    if (!intakeTargetOptions.some((option) => option.id === intakeTargetId)) {
      setIntakeTargetId(intakeTargetOptions[0].id);
    }
  }, [intakeTargetKind, intakeTargetOptions, intakeTargetId]);

  const fastIntakeDuplicateWarning = useMemo(() => {
    const candidate = (fastIntakeRecordName || intakeTitle).trim().toLowerCase();
    if (!candidate) return "";

    let existingName = "";
    if (fastIntakeSaveMode === "Create Asset") {
      existingName =
        assetRecords.find((item) => item.name.trim().toLowerCase() === candidate)
          ?.name || "";
    } else if (fastIntakeSaveMode === "Create Vendor") {
      existingName =
        vendorRecords.find((item) => item.name.trim().toLowerCase() === candidate)
          ?.name || "";
    } else if (fastIntakeSaveMode === "Create Work Order") {
      existingName =
        serviceRecords.find((item) => item.title.trim().toLowerCase() === candidate)
          ?.title || "";
    }

    if (!existingName) return "";
    return `Possible duplicate: Atlas already has ${existingName}. Choose Attach to Existing or change the name before saving.`;
  }, [
    fastIntakeRecordName,
    intakeTitle,
    fastIntakeSaveMode,
    assetRecords,
    vendorRecords,
    serviceRecords,
  ]);

  const recentFastIntake = useMemo(
    () =>
      [...intakeDocs]
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        )
        .slice(0, 6),
    [intakeDocs],
  );

  const qrRecords = useMemo<QrRecord[]>(() => {
    const localSearch = qrSearch.trim().toLowerCase();
    const records: QrRecord[] =
      qrKind === "asset"
        ? byName(assetRecords).map((asset) => ({
            kind: "asset",
            id: asset.id,
            title: asset.name,
            subtitle: `${asset.category} · ${locationName(asset.locationId)}`,
            detail: [
              asset.make,
              asset.model,
              asset.serial,
              asset.status,
              asset.notes,
            ]
              .filter(Boolean)
              .join(" · "),
          }))
        : qrKind === "location"
          ? [...locations]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((location) => ({
                kind: "location",
                id: location.id,
                title: location.name,
                subtitle: `${location.type} · ${location.zone}`,
                detail: location.notes,
              }))
          : qrKind === "vendor"
            ? byName(vendorRecords).map((vendor) => ({
                kind: "vendor",
                id: vendor.id,
                title: vendor.name,
                subtitle: vendor.category,
                detail: [
                  vendor.phone,
                  vendor.email,
                  vendor.website,
                  vendor.notes,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))
            : byLabel(mapLabels).map((label) => ({
                kind: "map",
                id: label.id,
                title: label.label,
                subtitle: label.category,
                detail: label.notes,
              }));

    if (!localSearch) return records;
    return records.filter((record) =>
      [record.title, record.subtitle, record.detail]
        .join(" ")
        .toLowerCase()
        .includes(localSearch),
    );
  }, [qrKind, qrSearch, assetRecords, vendorRecords, mapLabels]);

  const searchResults = useMemo(() => {
    if (!q) return [];
    return buildSearchIndex()
      .filter((item) =>
        [item.type, item.title, item.subtitle, item.detail]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 12);
  }, [
    q,
    mapLabels,
    assetRecords,
    vendorRecords,
    contactRecords,
    serviceRecords,
    procedureRecords,
    calendarItems,
    partRecords,
    calendarColors,
    allDocuments,
    allManualRecords,
  ]);

  const monthCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: {
      key: string;
      date?: string;
      day?: number;
      outside?: boolean;
    }[] = [];

    for (let i = 0; i < startDay; i += 1)
      cells.push({ key: `blank-${i}`, outside: true });

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const iso = localISODate(date);
      cells.push({ key: iso, date: iso, day });
    }

    while (cells.length % 7 !== 0)
      cells.push({ key: `end-${cells.length}`, outside: true });
    return cells;
  }, [calendarCursor]);

  const weekCells = useMemo(
    () => getWeekCells(calendarCursor),
    [calendarCursor],
  );

  function buildSearchIndex(): SearchResult[] {
    return [
      ...locations.map((item) => ({
        id: `location-${item.id}`,
        type: "Location",
        title: item.name,
        subtitle: `${item.type} · ${item.zone}`,
        detail: item.notes,
        screen: "locations" as Screen,
        locationId: item.id,
      })),
      ...mapLabels.map((item) => ({
        id: `map-${item.id}`,
        type: "Map Label",
        title: item.label,
        subtitle: item.category,
        detail: [
          item.notes,
          (item.detailBoxes || [])
            .map((box) => `${box.title} ${box.body}`)
            .join(" "),
          (item.vendorIds || []).map(vendorName).join(" "),
        ].join(" "),
        screen: "map" as Screen,
        mapLabelId: item.id,
      })),
      ...assetRecords.map((item) => ({
        id: `asset-${item.id}`,
        type: "Asset",
        title: item.name,
        subtitle: `${item.category} · ${locationName(item.locationId)} · ${item.status}`,
        detail: [item.make, item.model, item.serial, item.notes].join(" "),
        screen: "assets" as Screen,
        assetId: item.id,
      })),
      ...vendorRecords.map((item) => ({
        id: `vendor-${item.id}`,
        type: "Vendor",
        title: item.name,
        subtitle: item.category,
        detail: [item.phone, item.email, item.website, item.notes].join(" "),
        screen: "vendors" as Screen,
        vendorId: item.id,
      })),
      ...contactRecords.map((item) => ({
        id: `contact-${item.id}`,
        type: "Contact",
        title: item.name,
        subtitle:
          [item.organization, item.role, item.category]
            .filter(Boolean)
            .join(" · ") || "Contact",
        detail: [
          item.phone,
          item.email,
          item.address,
          item.website,
          item.notes,
        ].join(" "),
        screen: "contacts" as Screen,
        contactId: item.id,
      })),
      ...serviceRecords.map((item) => ({
        id: `wo-${item.id}`,
        type: "Work Order",
        title: item.title,
        subtitle: `${formatDate(item.date)} · ${item.status} · ${item.priority ?? "Medium"}`,
        detail: `${assetName(item.assetId)} ${vendorName(item.vendorId)} ${item.notes}`,
        screen: "history" as Screen,
        serviceId: item.id,
      })),
      ...procedureRecords.map((item) => ({
        id: `procedure-${item.id}`,
        type: "Procedure",
        title: item.title,
        subtitle: `${item.area} · ${item.priority}`,
        detail: item.steps.join(" "),
        screen: "procedures" as Screen,
        procedureId: item.id,
      })),
      ...calendarItems.map((item) => ({
        id: `calendar-${item.id}`,
        type: "Calendar",
        title: item.title,
        subtitle: `${formatDate(item.date)} · ${item.allDay ? "All day" : item.time || "No time"} · ${colorForEvent(item).label}`,
        detail: `${item.area} ${item.notes || ""} ${item.linkedName || ""}`,
        screen: "calendar" as Screen,
        calendarId: item.id,
      })),
      ...partRecords.map((item) => ({
        id: `part-${item.id}`,
        type: "Part",
        title: item.name,
        subtitle: `${item.category} · Qty ${item.quantity}`,
        detail: item.notes,
        screen: "parts" as Screen,
        partId: item.id,
      })),
      ...allDocuments.map((item) => ({
        id: `document-${item.id}`,
        type: "Document",
        title: item.title,
        subtitle: `${item.type} · ${item.area}`,
        detail: `${item.notes} ${item.pastedText || ""} ${item.targetName || ""}`,
        screen: "documents" as Screen,
      })),
      ...allManualRecords.map((item) => ({
        id: `manual-${item.id}`,
        type: "Manual",
        title: item.title,
        subtitle: `${item.linkedAssetName || "Not linked"} · ${item.category}`,
        detail: `${item.manufacturer} ${item.model} ${item.documentNumber} ${item.notes}`,
        screen: "manuals" as Screen,
        manualId: item.id,
      })),
      ...defaultWorkLinks.map((item) => ({
        id: `link-${item.id}`,
        type: "Work Link",
        title: item.name,
        subtitle: `${item.category}${item.vendor ? ` · ${item.vendor}` : ""}`,
        detail: `${item.notes} ${item.url}`,
        screen: "links" as Screen,
      })),
    ];
  }

  function openSearchResult(result: SearchResult) {
    if (result.locationId) setSelectedLocationId(result.locationId);
    if (result.assetId) setSelectedAssetId(result.assetId);
    if (result.vendorId) setSelectedVendorId(result.vendorId);
    if (result.contactId) {
      const contact = contactRecords.find(
        (item) => item.id === result.contactId,
      );
      if (contact) {
        setSelectedContactId(contact.id);
        setContactDraft(normalizeContact(contact));
        setContactEditorOpen(true);
        setContactMessage("");
      }
    }
    if (result.serviceId) setSelectedServiceId(result.serviceId);
    if (result.mapLabelId) setSelectedMapLabelId(result.mapLabelId);
    if (result.procedureId) setSelectedProcedureId(result.procedureId);
    if (result.calendarId) startEditCalendarItem(result.calendarId);
    if (result.partId) setSelectedPartId(result.partId);
    if (result.manualId) {
      setSelectedManualId(result.manualId);
      setManualSearch("");
    }
    setScreen(result.screen);
    setQuery("");
    setSearchOpen(false);
  }

  function linkedDocumentsFor(kind: IntakeTargetKind, id?: string) {
    if (!id) return [];
    return intakeDocs.filter(
      (doc) => doc.targetType === kind && doc.targetId === id,
    );
  }

  function targetNameFor(kind: IntakeTargetKind, id?: string) {
    if (kind === "General") return "General";
    if (!id) return kind;
    if (kind === "Asset") return assetName(id);
    if (kind === "Location") return locationName(id);
    if (kind === "Vendor") return vendorName(id);
    if (kind === "Work Order")
      return (
        serviceRecords.find((record) => record.id === id)?.title || "Work Order"
      );
    if (kind === "Map Label")
      return mapLabels.find((label) => label.id === id)?.label || "Map Label";
    return "General";
  }

  function openDocumentTarget(doc: DocumentRecord) {
    if (doc.targetType === "Asset" && doc.targetId) {
      setSelectedAssetId(doc.targetId);
      setScreen("assets");
      return;
    }
    if (doc.targetType === "Vendor" && doc.targetId) {
      setSelectedVendorId(doc.targetId);
      setScreen("vendors");
      return;
    }
    if (doc.targetType === "Work Order" && doc.targetId) {
      setSelectedServiceId(doc.targetId);
      setScreen("history");
      return;
    }
    if (doc.targetType === "Map Label" && doc.targetId) {
      setSelectedMapLabelId(doc.targetId);
      setScreen("map");
      return;
    }
    if (doc.targetType === "Location" && doc.targetName) {
      setQuery(doc.targetName);
      setScreen("locations");
    }
  }

  function resetIntakeDraft() {
    setIntakeTitle("");
    setIntakeType("Paperwork / Scan");
    setFastIntakeKind("Document");
    setFastIntakeSaveMode("Attach to Existing");
    setFastIntakeRecordName("");
    setFastIntakeCategory("General");
    setFastIntakePriority("Medium");
    setFastIntakeLocationId("general");
    setFastIntakeAppendNotes(false);
    setIntakeNotes("");
    setIntakePastedText("");
    setIntakeFiles([]);
    setIntakeMessage("Ready for the next scan, photo, upload, or pasted note.");
  }

  function applyFastIntakeKind(kind: FastIntakeKind) {
    setFastIntakeKind(kind);
    setIntakeType(kind);

    if (kind === "Asset Label") {
      setFastIntakeSaveMode("Attach to Existing");
      setIntakeTargetKind("Asset");
      return;
    }

    if (kind === "Invoice / Receipt") {
      setFastIntakeSaveMode("Attach to Existing");
      setIntakeTargetKind("Vendor");
      return;
    }

    if (kind === "Work Order Issue") {
      setFastIntakeSaveMode("Create Work Order");
      setIntakeTargetKind("Asset");
      return;
    }

    if (kind === "Gauge / Meter Reading") {
      setFastIntakeSaveMode("Attach to Existing");
      setIntakeTargetKind("Asset");
      return;
    }

    setFastIntakeSaveMode("Document Only");
    setIntakeTargetKind("General");
  }

  function appendIntakeNote(existing: string, incoming: string) {
    const cleanExisting = existing.trim();
    const cleanIncoming = incoming.trim();
    if (!cleanIncoming) return cleanExisting;
    if (!cleanExisting) return cleanIncoming;
    if (cleanExisting.toLowerCase().includes(cleanIncoming.toLowerCase())) {
      return cleanExisting;
    }
    return `${cleanExisting}\n\nFast Intake — ${new Date().toLocaleDateString()}\n${cleanIncoming}`;
  }

  async function addIntakeFiles(fileList: FileList | File[] | null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    try {
      setIntakeMessage("Adding file(s) to intake...");
      const uploaded = await Promise.all(files.map(fileToUploadedRecord));
      setIntakeFiles((current) => [...current, ...uploaded]);
      setIntakeTitle(
        (current) =>
          current ||
          uploaded[0]?.name?.replace(/\.[^.]+$/, "") ||
          "New Document",
      );
      setIntakeMessage(`${uploaded.length} file(s) ready to save into Atlas.`);
    } catch {
      setIntakeMessage(
        "Atlas could not read that file. Try a photo, screenshot, PDF, or smaller file.",
      );
    }
  }

  function removeIntakeFile(id: string) {
    setIntakeFiles((current) => current.filter((file) => file.id !== id));
  }

  function openUploadedFile(file: UploadedFileRecord) {
    if (!file.dataUrl && !file.url) {
      setIntakeMessage(
        "That file does not have a preview URL saved in this browser.",
      );
      return;
    }
    setPreviewZoom(100);
    setPreviewFile(file);
  }

  function openPhotoPreview(photo: PhotoRecord) {
    setPreviewZoom(100);
    setPreviewFile({
      id: photo.id,
      name: photo.name,
      type: "image/*",
      dataUrl: photo.dataUrl,
      url: photo.url,
      createdAt: photo.createdAt,
    });
  }

  function linkedImageFilesFor(
    kind: IntakeTargetKind,
    id: string,
    includeVendorLogos = false,
  ) {
    if (!id) return [];

    return allDocuments
      .filter(
        (document) =>
          document.targetType === kind &&
          document.targetId === id &&
          (includeVendorLogos ||
            document.type.toLowerCase() !== "vendor logo"),
      )
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(
          String(a.createdAt || ""),
        ),
      )
      .flatMap((document) => document.files || [])
      .filter(
        (file) =>
          String(file.type || "").startsWith("image/") ||
          String(file.dataUrl || "").startsWith("data:image/"),
      );
  }

  function vendorLogoFor(vendorId: string) {
    if (!vendorId) return undefined;
    const logoDocument = allDocuments
      .filter(
        (document) =>
          document.targetType === "Vendor" &&
          document.targetId === vendorId &&
          document.type.toLowerCase() === "vendor logo",
      )
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(
          String(a.createdAt || ""),
        ),
      )[0];

    return (logoDocument?.files || []).find(
      (file) =>
        String(file.type || "").startsWith("image/") ||
        String(file.dataUrl || "").startsWith("data:image/"),
    );
  }

  function manualsForAsset(asset: AssetRecord) {
    if (!asset.id) return [];
    const assetNameLower = asset.name.trim().toLowerCase();

    return allManualRecords
      .filter((manual) => {
        if (manual.linkedAssetId === asset.id) return true;
        const linkedName = String(manual.linkedAssetName || "")
          .trim()
          .toLowerCase();
        return Boolean(
          linkedName &&
            assetNameLower &&
            (linkedName === assetNameLower ||
              linkedName.includes(assetNameLower) ||
              assetNameLower.includes(linkedName)),
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  function openManualUrl(manual: ManualRecord) {
    const uploadedFile = manual.files.find(
      (file) => file.url || file.dataUrl,
    );
    return cleanManualOpenUrl(
      manual.id === "manual-seadoo-219002349"
        ? seaDooManualUrl
        : manual.href ||
            uploadedFile?.url ||
            uploadedFile?.dataUrl ||
            "",
    );
  }

  function showSaveToast(
    message: string,
    tone: "success" | "warning" = "success",
  ) {
    if (saveToastTimerRef.current !== null) {
      window.clearTimeout(saveToastTimerRef.current);
    }

    setSaveToast({ message, tone });
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveToast(null);
      saveToastTimerRef.current = null;
    }, 3200);
  }

  async function addAssetPhotoFiles(fileList: FileList | File[] | null) {
    if (!selectedAsset.id || !fileList?.length) return;

    const incomingFiles = Array.from(fileList)
      .map(normalizeImageFile)
      .filter((file) => file.type.startsWith("image/"));

    if (!incomingFiles.length) {
      setDatabaseStatus("Atlas did not find an image in that item.");
      return;
    }

    setDatabaseStatus("Preparing image for this asset...");

    const settled = await Promise.allSettled(
      incomingFiles.map(fileToUploadedRecord),
    );

    const uploaded = settled
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<UploadedFileRecord> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    const imagePhotos: PhotoRecord[] = uploaded
      .filter(
        (file) =>
          String(file.type || "").startsWith("image/") && file.dataUrl,
      )
      .map((file) => ({
        id: uid("photo"),
        assetId: selectedAsset.id,
        name: file.name || `asset-photo-${Date.now()}.jpg`,
        dataUrl: file.dataUrl,
        createdAt: file.createdAt || new Date().toISOString(),
      }));

    if (!imagePhotos.length) {
      setDatabaseStatus(
        "Atlas could not read that image. Try Copy image instead of Copy link.",
      );
      return;
    }

    await cachePhotoRecords(imagePhotos);

    setPhotos((current) => {
      const next = mergePhotoRecords(imagePhotos, current);
      persistPhotoRecords(next);
      return next;
    });

    const syncResults = await Promise.all(
      imagePhotos.map((photo) =>
        postAtlasRecord("asset_photos", photo),
      ),
    );

    const syncedCount = syncResults.filter(Boolean).length;
    const fullySynced = syncedCount === imagePhotos.length;

    setDatabaseStatus(
      fullySynced
        ? `Added ${imagePhotos.length} photo${imagePhotos.length === 1 ? "" : "s"} to ${selectedAsset.name}. Existing photos were preserved.`
        : `The new photo is showing in Atlas, but ${imagePhotos.length - syncedCount} image${imagePhotos.length - syncedCount === 1 ? "" : "s"} did not finish syncing. Existing photos were preserved.`,
    );

    showSaveToast(
      fullySynced
        ? `${imagePhotos.length === 1 ? "Photo" : "Photos"} saved to ${selectedAsset.name}.`
        : `${imagePhotos.length === 1 ? "Photo" : "Photos"} saved on this device; Atlas sync did not finish.`,
      fullySynced ? "success" : "warning",
    );
  }

  async function addLinkedPhotoFiles(
    kind: "Location" | "Vendor",
    id: string,
    recordName: string,
    fileList: FileList | File[] | null,
    documentType = "Photo",
  ) {
    if (!id || !fileList?.length) return;

    const uploaded = (
      await Promise.all(Array.from(fileList).map(fileToUploadedRecord))
    ).filter(
      (file) =>
        String(file.type || "").startsWith("image/") && file.dataUrl,
    );

    if (!uploaded.length) return;

    const createdAt = new Date().toISOString();
    const record = normalizeDocument({
      id: uid("doc"),
      title:
        documentType === "Vendor Logo"
          ? `${recordName} logo`
          : `${recordName} photo`,
      area: recordName,
      type: documentType,
      targetType: kind,
      targetId: id,
      targetName: recordName,
      linkedVendorId: kind === "Vendor" ? id : undefined,
      notes:
        documentType === "Vendor Logo"
          ? "Company logo uploaded from the vendor record."
          : `Photo uploaded from the ${kind.toLowerCase()} record.`,
      files: uploaded,
      createdAt,
    });

    replaceDocumentInVault(record);

    try {
      await postDocumentToAtlasVault(record);
      setDocumentSyncStatus(
        `${documentType} added to ${recordName} and synced to Atlas.`,
      );
      showSaveToast(`${documentType} saved to ${recordName}.`);
    } catch {
      setDocumentSyncStatus(
        `${documentType} added to ${recordName} on this browser. Atlas vault sync did not complete.`,
      );
      showSaveToast(
        `${documentType} saved on this device; Atlas sync did not finish.`,
        "warning",
      );
    }
  }

  function imageFilesFromPasteEvent(
    event: React.ClipboardEvent<HTMLElement>,
  ) {
    return Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
      .map(normalizeImageFile)
      .filter((file) => file.type.startsWith("image/"));
  }

  function imagePayloadFromPasteEvent(
    event: React.ClipboardEvent<HTMLElement>,
  ) {
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
      .map(normalizeImageFile)
      .filter((file) => file.type.startsWith("image/"));

    const html = event.clipboardData?.getData("text/html") || "";
    const plainText = event.clipboardData?.getData("text/plain") || "";
    const urls = [
      ...imageUrlsFromClipboardText(html),
      ...imageUrlsFromClipboardText(plainText),
    ];

    return {
      files,
      urls: [...new Set(urls)],
    };
  }

  async function filesFromClipboardPayload(
    files: File[],
    urls: string[],
  ) {
    const imported: File[] = [...files];

    for (const url of urls) {
      if (imported.length >= 10) break;
      try {
        imported.push(await importImageUrlAsFile(url));
      } catch {
        // Continue because a direct clipboard image may already be present.
      }
    }

    const unique = new Map<string, File>();
    imported.forEach((file) => {
      const key = `${file.name}|${file.type}|${file.size}`;
      if (!unique.has(key)) unique.set(key, file);
    });

    return [...unique.values()];
  }

  async function readClipboardImageFiles() {
    if (!navigator.clipboard || !("read" in navigator.clipboard)) {
      throw new Error(
        "Click inside the asset panel and press Ctrl+V or Command+V to paste the image.",
      );
    }

    const clipboardItems = await navigator.clipboard.read();
    const directFiles: File[] = [];
    const urls: string[] = [];

    for (const item of clipboardItems) {
      for (const type of item.types) {
        const blob = await item.getType(type);

        if (type.startsWith("image/")) {
          const extension =
            type.split("/")[1]?.replace("jpeg", "jpg") || "png";
          directFiles.push(
            new File(
              [blob],
              `pasted-ai-image-${Date.now()}.${extension}`,
              { type },
            ),
          );
          continue;
        }

        if (type === "text/html" || type === "text/plain") {
          const text = await blob.text();
          urls.push(...imageUrlsFromClipboardText(text));
        }
      }
    }

    const files = await filesFromClipboardPayload(
      directFiles,
      [...new Set(urls)],
    );

    if (!files.length) {
      throw new Error(
        "No image was found. On the AI picture, choose Copy image—not Copy link—then click Paste Image.",
      );
    }

    return files;
  }

  async function pasteAssetPhoto() {
    try {
      setDatabaseStatus("Reading copied image...");
      const files = await readClipboardImageFiles();
      await addAssetPhotoFiles(files);
    } catch (error) {
      setDatabaseStatus(
        error instanceof Error ? error.message : "Could not paste that image.",
      );
    }
  }

  async function pasteLinkedPhoto(
    kind: "Location" | "Vendor",
    id: string,
    recordName: string,
    documentType = "Photo",
  ) {
    try {
      const files = await readClipboardImageFiles();
      await addLinkedPhotoFiles(kind, id, recordName, files, documentType);
    } catch (error) {
      setDocumentSyncStatus(
        error instanceof Error ? error.message : "Could not paste that image.",
      );
    }
  }

  async function deleteAssetPhoto(photo: PhotoRecord) {
    if (!window.confirm(`Delete photo ${photo.name}?`)) return;
    const deleted = await deleteAtlasRecord("asset_photos", photo.id);
    if (!deleted) return;
    await deleteCachedPhoto(photo.id);
    setPhotos((current) => {
      const next = current.filter((item) => item.id !== photo.id);
      persistPhotoRecords(next);
      return next;
    });
  }

  async function deleteLinkedImage(file: UploadedFileRecord) {
    const record = intakeDocs.find((document) =>
      (document.files || []).some((item) => item.id === file.id),
    );
    if (!record) {
      setDocumentSyncStatus("That image is not stored in the editable Atlas vault.");
      return;
    }
    if (!window.confirm(`Delete image ${file.name}?`)) return;

    const remainingFiles = (record.files || []).filter(
      (item) => item.id !== file.id,
    );
    if (remainingFiles.length) {
      const updated = normalizeDocument({ ...record, files: remainingFiles });
      replaceDocumentInVault(updated);
      try {
        await postDocumentToAtlasVault(updated);
        setDocumentSyncStatus(`Deleted ${file.name} from Atlas.`);
      } catch {
        setDocumentSyncStatus(
          `Deleted ${file.name} on this browser. Atlas sync did not complete.`,
        );
      }
      return;
    }

    setIntakeDocs((current) => {
      const next = current.filter((document) => document.id !== record.id);
      saveStoredArray(storageKeys.intakeDocs[0], next);
      return next;
    });
    try {
      await deleteDocumentFromAtlasVault(record.id);
      setDocumentSyncStatus(`Deleted ${file.name} from Atlas.`);
    } catch {
      setDocumentSyncStatus(
        `Deleted ${file.name} on this browser. Atlas sync did not complete.`,
      );
    }
  }

  async function deleteAssetRecord(record: AssetRecord) {
    if (!window.confirm(`Delete asset ${record.name || "this asset"}?`)) return;
    const relatedPhotos = photos.filter((photo) => photo.assetId === record.id);
    for (const photo of relatedPhotos) {
      await deleteAtlasRecord("asset_photos", photo.id);
    }
    const deleted = await deleteAtlasRecord("assets", record.id);
    if (!deleted) return;
    await Promise.all(
      relatedPhotos.map((photo) => deleteCachedPhoto(photo.id)),
    );
    setAssetRecords((current) =>
      current.filter((item) => item.id !== record.id),
    );
    setPhotos((current) => {
      const next = current.filter(
        (photo) => photo.assetId !== record.id,
      );
      persistPhotoRecords(next);
      return next;
    });
    setSelectedAssetId("");
  }

  async function deleteVendorRecord(record: VendorRecord) {
    if (!window.confirm(`Delete vendor ${record.name || "this vendor"}?`)) return;
    const deleted = await deleteAtlasRecord("vendors", record.id);
    if (!deleted) return;
    setVendorRecords((current) => current.filter((item) => item.id !== record.id));
    setSelectedVendorId("");
  }

  async function deleteWorkOrderRecord(record: ServiceRecord) {
    if (!window.confirm(`Delete work order ${record.title || "this work order"}?`)) return;
    const deleted = await deleteAtlasRecord("work_orders", record.id);
    if (!deleted) return;
    setServiceRecords((current) => current.filter((item) => item.id !== record.id));
    setSelectedServiceId("");
  }

  async function deleteProcedureRecord(record: ProcedureRecord) {
    if (!window.confirm(`Delete procedure ${record.title || "this procedure"}?`)) return;
    const deleted = await deleteAtlasRecord("procedures", record.id);
    if (!deleted) return;
    setProcedureRecords((current) => current.filter((item) => item.id !== record.id));
    setSelectedProcedureId("");
  }

  function deletePartRecord(record: PartRecord) {
    if (!window.confirm(`Delete part ${record.name || "this part"}?`)) return;
    setPartRecords((current) => current.filter((item) => item.id !== record.id));
    setSelectedPartId("");
  }

  function deleteMapLabelRecord(record: MapLabelRecord) {
    if (!window.confirm(`Delete map label ${record.label || "this label"}?`)) return;
    setMapLabels((current) => current.filter((item) => item.id !== record.id));
    setSelectedMapLabelId("");
  }

  async function deleteManualRecord(record: ManualRecord) {
    if (!window.confirm(`Delete manual ${record.title}?`)) return;
    setManualRecords((current) => {
      const next = current.filter((item) => item.id !== record.id);
      saveStoredArray(storageKeys.manuals[0], next);
      return next;
    });

    const matchingDocuments = intakeDocs.filter((document) => {
      const sameHref =
        cleanManualOpenUrl(document.href || "") &&
        cleanManualOpenUrl(document.href || "") === cleanManualOpenUrl(record.href || "");
      const sameTitle = document.title.trim().toLowerCase() === record.title.trim().toLowerCase();
      return sameHref || sameTitle;
    });
    for (const document of matchingDocuments) {
      setIntakeDocs((current) => current.filter((item) => item.id !== document.id));
      try {
        await deleteDocumentFromAtlasVault(document.id);
      } catch {
        // Manual is still removed locally if the vault call is unavailable.
      }
    }
    setSelectedManualId("");
  }

  function startManualForAsset(asset: AssetRecord) {
    if (!asset.id) return;
    setSelectedManualId("");
    setManualDraft(
      normalizeManualRecord({
        ...blankManual(),
        linkedAssetId: asset.id,
        linkedAssetName: asset.name,
        manufacturer: asset.make || "",
        model: asset.model || "",
      }),
    );
    setManualAddOpen(true);
    setManualMessage(`Adding a manual for ${asset.name}.`);
    setScreen("manuals");
  }

  function findManualForAsset(asset: AssetRecord) {
    if (!asset.id) return;
    const equipment = [asset.make, asset.model]
      .filter(Boolean)
      .join(" ")
      .trim();
    const question = `Find the official owner or operator manual for ${
      equipment || asset.name
    }. Use the exact Atlas asset ${asset.name}${
      asset.serial ? `, serial ${asset.serial}` : ""
    }, and attach the best verified result to this asset.`;

    setAssistantQuestion(question);
    setScreen("assistant");
    void askAtlas(question);
  }

  async function refreshDocumentVault() {
    try {
      setDocumentSyncStatus("Loading synced documents from Atlas...");
      const response = await fetch("/api/atlas-documents", {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(`Document API returned ${response.status}`);

      const payload = (await response.json()) as {
        documents?: DocumentRecord[];
      };
      const apiDocs = Array.isArray(payload.documents)
        ? payload.documents.map(normalizeDocument)
        : [];
      const localDocs = mergeDocuments(
        intakeDocs,
        readStoredArray<DocumentRecord>(storageKeys.intakeDocs, []).map(
          normalizeDocument,
        ),
      );
      const apiIds = new Set(apiDocs.map((doc) => doc.id));
      const localOnlyDocs = localDocs.filter((doc) => !apiIds.has(doc.id));

      let uploadedLocalCount = 0;
      for (const localDoc of localOnlyDocs) {
        try {
          await postDocumentToAtlasVault(localDoc);
          uploadedLocalCount += 1;
        } catch {
          // Keep local copy. Large files may need to be re-saved after compression.
        }
      }

      const merged = mergeDocuments(apiDocs, localDocs);
      setIntakeDocs(merged);
      saveStoredArray(storageKeys.intakeDocs[0], merged);

      setDocumentSyncStatus(
        uploadedLocalCount
          ? `Synced ${apiDocs.length} document(s) from Atlas and pushed ${uploadedLocalCount} phone/local document(s) up to the vault.`
          : `Synced ${apiDocs.length} document(s) from Atlas. Phone uploads should show on desktop after Refresh Vault.`,
      );
    } catch {
      const localDocs = readStoredArray<DocumentRecord>(
        storageKeys.intakeDocs,
        [],
      ).map(normalizeDocument);
      setIntakeDocs((current) => (current.length ? current : localDocs));
      setDocumentSyncStatus(
        "Document sync API is not installed or not reachable, so this browser is showing only its local vault.",
      );
    }
  }

  async function postDocumentToAtlasVault(record: DocumentRecord) {
    const response = await fetch("/api/atlas-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record }),
    });

    if (!response.ok) {
      let message = `Document API returned ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.error) message = String(payload.error);
      } catch {
        // Keep default message.
      }
      throw new Error(message);
    }

    return response.json();
  }

  async function deleteDocumentFromAtlasVault(id: string) {
    const response = await fetch(
      `/api/atlas-documents?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!response.ok)
      throw new Error(`Document delete returned ${response.status}`);
    return response.json();
  }

  function replaceDocumentInVault(record: DocumentRecord) {
    const normalized = normalizeDocument(record);
    setIntakeDocs((current) => {
      const next = current.map((doc) =>
        doc.id === normalized.id ? normalized : doc,
      );
      const withRecord = next.some((doc) => doc.id === normalized.id)
        ? next
        : [normalized, ...next];
      saveStoredArray(storageKeys.intakeDocs[0], withRecord);
      return withRecord;
    });
  }

  function updateSelectedDocument(id: string, patch: Partial<DocumentRecord>) {
    setIntakeDocs((current) => {
      const next = current.map((doc) =>
        doc.id === id ? normalizeDocument({ ...doc, ...patch }) : doc,
      );
      saveStoredArray(storageKeys.intakeDocs[0], next);
      return next;
    });
  }

  async function saveSelectedDocument(record: DocumentRecord) {
    const normalized = normalizeDocument(record);
    replaceDocumentInVault(normalized);
    try {
      await postDocumentToAtlasVault(normalized);
      setDocumentSyncStatus(
        `Saved changes to ${normalized.title} and synced to Atlas.`,
      );
    } catch (error) {
      setDocumentSyncStatus(
        error instanceof Error
          ? `Saved locally, but Atlas sync failed: ${error.message}`
          : "Saved locally, but Atlas sync failed.",
      );
    }
  }

  async function deleteSelectedDocument(record: DocumentRecord) {
    const confirmed = window.confirm(
      `Delete ${record.title}? This removes it from the Atlas document vault.`,
    );
    if (!confirmed) return;

    setIntakeDocs((current) => {
      const next = current.filter((doc) => doc.id !== record.id);
      saveStoredArray(storageKeys.intakeDocs[0], next);
      return next;
    });
    setSelectedDocumentId("");

    try {
      await deleteDocumentFromAtlasVault(record.id);
      setDocumentSyncStatus(`Deleted ${record.title} from Atlas.`);
    } catch {
      setDocumentSyncStatus(
        `Deleted ${record.title} from this browser. Refresh after the API update to confirm it is gone from Atlas.`,
      );
    }
  }

  function handlePreviewTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return;
    const [first, second] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(
      first.clientX - second.clientX,
      first.clientY - second.clientY,
    );
    previewTouchRef.current = { distance, zoom: previewZoom };
  }

  function handlePreviewTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !previewTouchRef.current) return;
    event.preventDefault();

    const [first, second] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(
      first.clientX - second.clientX,
      first.clientY - second.clientY,
    );
    const nextZoom = Math.round(
      previewTouchRef.current.zoom *
        (distance / previewTouchRef.current.distance),
    );
    setPreviewZoom(Math.max(50, Math.min(500, nextZoom)));
  }

  function handlePreviewTouchEnd() {
    previewTouchRef.current = null;
  }

  async function saveIntakeDocument() {
    if (!intakeFiles.length && !intakePastedText.trim() && !intakeNotes.trim()) {
      setIntakeMessage("Add a photo, file, pasted text, or note before saving.");
      return;
    }

    if (fastIntakeDuplicateWarning) {
      setIntakeMessage(fastIntakeDuplicateWarning);
      return;
    }

    const title =
      intakeTitle.trim() ||
      fastIntakeRecordName.trim() ||
      intakeFiles[0]?.name?.replace(/\.[^.]+$/, "") ||
      intakePastedText.trim().slice(0, 48) ||
      "New Atlas Intake";

    const combinedNotes = [intakeNotes.trim(), intakePastedText.trim()]
      .filter(Boolean)
      .join("\n\n");

    let finalTargetKind: IntakeTargetKind = intakeTargetKind;
    let finalTargetId = intakeTargetKind === "General" ? "" : intakeTargetId;
    let finalTargetName = targetNameFor(finalTargetKind, finalTargetId);
    let createdLabel = "document";

    try {
      if (fastIntakeSaveMode === "Create Work Order") {
        const workOrder = normalizeService({
          id: uid("service"),
          assetId: intakeTargetKind === "Asset" ? intakeTargetId : "",
          vendorId: intakeTargetKind === "Vendor" ? intakeTargetId : "",
          date: todayISO(),
          title: fastIntakeRecordName.trim() || title,
          status: "Open",
          priority: fastIntakePriority,
          notes: combinedNotes,
          photos: intakeFiles.filter((file) =>
            (file.type || "").startsWith("image/"),
          ),
          documents: intakeFiles,
        });
        const saved = await postAtlasRecord("work_orders", workOrder);
        if (!saved) throw new Error("Work order did not save.");
        setServiceRecords((current) => byTitle([...current, workOrder]));
        finalTargetKind = "Work Order";
        finalTargetId = workOrder.id;
        finalTargetName = workOrder.title;
        createdLabel = "work order and intake record";
      }

      if (fastIntakeSaveMode === "Create Asset") {
        const asset = normalizeAsset({
          id: uid("asset"),
          name: fastIntakeRecordName.trim() || title,
          locationId: fastIntakeLocationId || "general",
          category: fastIntakeCategory.trim() || "General",
          status: "Monitor",
          notes: combinedNotes,
          vendorIds: intakeTargetKind === "Vendor" && intakeTargetId
            ? [intakeTargetId]
            : [],
        });
        const saved = await postAtlasRecord("assets", asset);
        if (!saved) throw new Error("Asset did not save.");
        setAssetRecords((current) => byName([...current, asset]));
        finalTargetKind = "Asset";
        finalTargetId = asset.id;
        finalTargetName = asset.name;
        createdLabel = "asset and intake record";
      }

      if (fastIntakeSaveMode === "Create Vendor") {
        const vendor = normalizeVendor({
          id: uid("vendor"),
          name: fastIntakeRecordName.trim() || title,
          category: fastIntakeCategory.trim() || "General",
          notes: combinedNotes,
        });
        const saved = await postAtlasRecord("vendors", vendor);
        if (!saved) throw new Error("Vendor did not save.");
        setVendorRecords((current) => byName([...current, vendor]));
        finalTargetKind = "Vendor";
        finalTargetId = vendor.id;
        finalTargetName = vendor.name;
        createdLabel = "vendor and intake record";
      }

      if (fastIntakeSaveMode === "Document Only") {
        finalTargetKind = "General";
        finalTargetId = "";
        finalTargetName = "General";
      }

      if (
        fastIntakeSaveMode === "Attach to Existing" &&
        fastIntakeAppendNotes &&
        combinedNotes
      ) {
        if (intakeTargetKind === "Asset") {
          const existing = assetRecords.find((item) => item.id === intakeTargetId);
          if (existing) {
            const updated = normalizeAsset({
              ...existing,
              notes: appendIntakeNote(existing.notes, combinedNotes),
            });
            const saved = await postAtlasRecord("assets", updated);
            if (!saved) throw new Error("Asset note update did not save.");
            setAssetRecords((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }
        }

        if (intakeTargetKind === "Vendor") {
          const existing = vendorRecords.find((item) => item.id === intakeTargetId);
          if (existing) {
            const updated = normalizeVendor({
              ...existing,
              notes: appendIntakeNote(existing.notes, combinedNotes),
            });
            const saved = await postAtlasRecord("vendors", updated);
            if (!saved) throw new Error("Vendor note update did not save.");
            setVendorRecords((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }
        }

        if (intakeTargetKind === "Work Order") {
          const existing = serviceRecords.find((item) => item.id === intakeTargetId);
          if (existing) {
            const updated = normalizeService({
              ...existing,
              notes: appendIntakeNote(existing.notes, combinedNotes),
              photos: mergeUploadedFiles(
                intakeFiles.filter((file) =>
                  (file.type || "").startsWith("image/"),
                ),
                existing.photos || [],
              ),
              documents: mergeUploadedFiles(intakeFiles, existing.documents || []),
            });
            const saved = await postAtlasRecord("work_orders", updated);
            if (!saved) throw new Error("Work order update did not save.");
            setServiceRecords((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }
        }
      }

      const record: DocumentRecord = {
        id: uid("doc"),
        title,
        area: finalTargetName,
        type: fastIntakeKind || intakeType.trim() || "Paperwork / Scan",
        linkedAssetId: finalTargetKind === "Asset" ? finalTargetId : undefined,
        linkedVendorId: finalTargetKind === "Vendor" ? finalTargetId : undefined,
        targetType: finalTargetKind,
        targetId: finalTargetKind === "General" ? "" : finalTargetId,
        targetName: finalTargetName,
        notes: intakeNotes.trim(),
        pastedText: intakePastedText.trim(),
        files: intakeFiles,
        createdAt: new Date().toISOString(),
      };

      const nextDocs = mergeDocuments([record], intakeDocs);
      setIntakeDocs(nextDocs);
      setSelectedDocumentId("");
      saveStoredArray(storageKeys.intakeDocs[0], nextDocs);

      let syncedToVault = false;
      try {
        await postDocumentToAtlasVault(record);
        syncedToVault = true;
        setDocumentSyncStatus(
          "Fast Intake synced to the Atlas Document Vault.",
        );
      } catch {
        setDocumentSyncStatus(
          "Fast Intake saved on this browser, but document-vault sync failed.",
        );
      }

      if (record.targetType === "Asset" && record.targetId) {
        const imagePhotos: PhotoRecord[] = (record.files || [])
          .filter((file) => (file.type || "").startsWith("image/") && file.dataUrl)
          .map((file) => ({
            id: uid("photo"),
            assetId: record.targetId || "",
            name: file.name,
            dataUrl: file.dataUrl,
            createdAt: file.createdAt || new Date().toISOString(),
          }));

        if (imagePhotos.length) {
          await cachePhotoRecords(imagePhotos);
          setPhotos((current) => {
            const nextPhotos = mergePhotoRecords(imagePhotos, current);
            persistPhotoRecords(nextPhotos);
            return nextPhotos;
          });
          imagePhotos.forEach((photo) => {
            void postAtlasRecord("asset_photos", photo);
          });
        }
      }

      const success = syncedToVault
        ? `Saved ${createdLabel} and synced the intake files.`
        : `Saved ${createdLabel}. Document-vault sync needs attention.`;
      resetIntakeDraft();
      setIntakeMessage(success);
      setDocumentSearch("");
    } catch (error) {
      setIntakeMessage(
        error instanceof Error ? error.message : "Fast Intake save failed.",
      );
    }
  }

  function renderLinkedDocuments(kind: IntakeTargetKind, id?: string) {
    const linked = linkedDocumentsFor(kind, id);
    if (!linked.length) return null;

    return (
      <div style={{ marginTop: 16 }}>
        <div style={eyebrowStyle}>Linked Documents</div>
        <div style={listStyle}>
          {linked.slice(0, 5).map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setScreen("documents")}
              style={rowButtonStyle}
            >
              <div>
                <strong>{doc.title}</strong>
                <p style={mutedSmallStyle}>
                  {doc.type} · {(doc.files || []).length} file(s)
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  async function loadWeather() {
    try {
      setWeatherStatus("Loading 7-day irrigation weather...");
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=47.60&longitude=-122.20&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,et0_fao_evapotranspiration&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FLos_Angeles&forecast_days=7";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Weather failed");
      const data = await response.json();

      const days: WeatherDay[] = data.daily.time.map(
        (date: string, index: number) => ({
          date,
          code: Number(data.daily.weather_code[index] ?? 0),
          high: Math.round(Number(data.daily.temperature_2m_max[index] ?? 0)),
          low: Math.round(Number(data.daily.temperature_2m_min[index] ?? 0)),
          precipChance: Math.round(
            Number(data.daily.precipitation_probability_max[index] ?? 0),
          ),
          precipAmount: Number(
            Number(data.daily.precipitation_sum[index] ?? 0).toFixed(2),
          ),
          windMax: Math.round(
            Number(data.daily.wind_speed_10m_max[index] ?? 0),
          ),
          et0: Number(
            Number(data.daily.et0_fao_evapotranspiration[index] ?? 0).toFixed(
              2,
            ),
          ),
        }),
      );

      setWeatherDays(days);
      setSelectedWeatherDate((current) => current || days[0]?.date || "");
      setWeatherStatus(
        "7-day weather loaded for irrigation and yard planning.",
      );
    } catch {
      setWeatherStatus(
        "Weather did not load. Check internet access from the deployed site.",
      );
    }
  }

  async function postAtlasRecord(table: AtlasTable, record: unknown) {
    try {
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, record }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `Atlas save returned ${response.status}`);
      }
      setDatabaseStatus("Saved to Atlas API.");
      return true;
    } catch (error) {
      setDatabaseStatus(
        error instanceof Error
          ? `Saved in browser, but Atlas API save failed: ${error.message}`
          : "Saved in browser. Atlas API save did not complete.",
      );
      return false;
    }
  }

  async function deleteAtlasRecord(table: AtlasTable, id: string) {
    if (!id) return false;
    try {
      const response = await fetch("/api/atlas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `Atlas delete returned ${response.status}`);
      }
      setDatabaseStatus("Deleted from Atlas.");
      return true;
    } catch (error) {
      setDatabaseStatus(
        error instanceof Error
          ? `Delete failed: ${error.message}`
          : "Delete failed.",
      );
      return false;
    }
  }

  function addAsset() {
    const record = normalizeAsset({
      id: uid("asset"),
      name: "",
      locationId: "",
      category: "",
      status: "Monitor",
      make: "",
      model: "",
      serial: "",
      notes: "",
      vendorIds: [],
    });
    setAssetRecords((current) => byName([record, ...current]));
    setSelectedAssetId(record.id);
    markRecordDirty("asset", record.id);
    setScreen("assets");
  }

  function updateAsset(patch: Partial<AssetRecord>) {
    markRecordDirty("asset", selectedAsset.id);
    setAssetRecords((current) =>
      byName(
        current.map((item) =>
          item.id === selectedAsset.id
            ? normalizeAsset({ ...item, ...patch })
            : item,
        ),
      ),
    );
  }

  function addVendor() {
    const record = normalizeVendor({
      id: uid("vendor"),
      name: "",
      category: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
    });
    setVendorRecords((current) => byName([record, ...current]));
    setSelectedVendorId(record.id);
    markRecordDirty("vendor", record.id);
    setScreen("vendors");
  }

  function updateVendor(patch: Partial<VendorRecord>) {
    markRecordDirty("vendor", selectedVendor.id);
    setVendorRecords((current) =>
      byName(
        current.map((item) =>
          item.id === selectedVendor.id
            ? normalizeVendor({ ...item, ...patch })
            : item,
        ),
      ),
    );
  }

  function startNewContact() {
    setSelectedContactId("");
    setContactDraft(blankContact());
    setContactEditorOpen(true);
    setContactMessage("");
    setScreen("contacts");
  }

  function editContact(record: ContactRecord) {
    setSelectedContactId(record.id);
    setContactDraft(normalizeContact(record));
    setContactEditorOpen(true);
    setContactMessage("");
  }

  function updateContactDraft(patch: Partial<ContactRecord>) {
    setContactDraft((current) =>
      normalizeContact({
        ...current,
        ...patch,
        id: current.id || selectedContactId,
      }),
    );
  }

  function saveContact() {
    const name = contactDraft.name.trim();
    if (!name) {
      setContactMessage("Add a name before saving this contact.");
      return;
    }

    const prepared = normalizeContact({
      ...contactDraft,
      id: selectedContactId || contactDraft.id || uid("contact"),
      name,
    });

    setContactRecords((current) => {
      const exists = current.some((item) => item.id === prepared.id);
      const next = exists
        ? current.map((item) =>
            item.id === prepared.id ? prepared : item,
          )
        : [prepared, ...current];
      const sorted = byName(next);
      saveStoredArray(storageKeys.contacts[0], sorted);
      return sorted;
    });

    setSelectedContactId("");
    setContactDraft(blankContact());
    setContactEditorOpen(true);
    setContactMessage(`Saved ${prepared.name}. Ready for the next contact.`);
  }

  function deleteContact(record: ContactRecord) {
    if (
      !record.id ||
      !window.confirm(`Delete contact ${record.name || "this contact"}?`)
    ) {
      return;
    }

    setContactRecords((current) => {
      const next = current.filter((item) => item.id !== record.id);
      saveStoredArray(storageKeys.contacts[0], next);
      return next;
    });
    setSelectedContactId("");
    setContactDraft(blankContact());
    setContactEditorOpen(false);
    setContactMessage("");
  }

  function addWorkOrder(initial: Partial<AtlasServiceRecord> = {}) {
    const record = normalizeService({
      title: "",
      date: "",
      status: "Open",
      priority: "Medium",
      notes: "",
      assetId: "",
      vendorId: "",
      procedureId: "",
      followUpDate: "",
      recurring: false,
      recurrenceInterval: 1,
      recurrenceUnit: "Weeks",
      recurrenceEndDate: "",
      season: seasonForDate(),
      lastCompletedDate: "",
      completionHistory: [],
      workType: "Work Order",
      workCategory: "🔧 Maintenance",
      effort: "30 minutes",
      responsibilityArea: "",
      photos: [],
      documents: [],
      checklist: [],
      notesHistory: [],
      serviceHistory: [],
      ...initial,
      id: initial.id || uid("wo"),
    });
    setServiceRecords((current) => byTitle([record, ...current]));
    setSelectedServiceId(record.id);
    markRecordDirty("work_order", record.id);
    setScreen("history");
  }

  function updateWorkOrder(patch: Partial<AtlasServiceRecord>) {
    markRecordDirty("work_order", selectedService.id);
    setServiceRecords((current) =>
      byTitle(
        current.map((item) =>
          item.id === selectedService.id
            ? normalizeService({ ...item, ...patch })
            : item,
        ),
      ),
    );
  }

  async function saveWorkOrderRecord() {
    const prepared = normalizeService(selectedService);
    await postAtlasRecord("work_orders", prepared);
    clearRecordDirty("work_order", prepared.id);
    setServiceRecords((current) =>
      byTitle(
        current.map((item) =>
          item.id === prepared.id ? prepared : item,
        ),
      ),
    );
    setDatabaseStatus(`Saved ${prepared.title || "work order"}.`);
  }

  async function completeWorkOrder(record: AtlasServiceRecord) {
    const completedDate = todayISO();
    const history = Array.from(
      new Set([...(record.completionHistory || []), completedDate]),
    ).sort();
    const completionEntry: WorkCompletionEntry = {
      id: uid("completion"),
      completedAt: new Date().toISOString(),
      statusBefore: String(record.status || "Open"),
      dueDate: String(record.date || ""),
      notes: String(record.notes || ""),
      notesHistory: Array.isArray(record.notesHistory) ? record.notesHistory : [],
      checklist: Array.isArray(record.checklist) ? record.checklist : [],
      photos: Array.isArray(record.photos) ? record.photos : [],
      documents: Array.isArray(record.documents) ? record.documents : [],
      assetId: String(record.assetId || ""),
      vendorId: String(record.vendorId || ""),
      procedureId: String(record.procedureId || ""),
      locationId: String(record.locationId || ""),
    };
    const serviceHistory = [
      completionEntry,
      ...(Array.isArray(record.serviceHistory) ? record.serviceHistory : []),
    ];

    if (!record.recurring) {
      const completed = normalizeService({
        ...record,
        status: "Completed",
        lastCompletedDate: completedDate,
        completionHistory: history,
        serviceHistory,
      });

      setServiceRecords((current) =>
        byTitle(
          current.map((item) =>
            item.id === completed.id ? completed : item,
          ),
        ),
      );
      await postAtlasRecord("work_orders", completed);
      clearRecordDirty("work_order", completed.id);
      setDatabaseStatus(`Completed ${completed.title}.`);
      return;
    }

    const unit = isWorkOrderRecurrenceUnit(record.recurrenceUnit)
      ? record.recurrenceUnit
      : "Weeks";
    const nextDate = nextRecurrenceDate(
      record.date || completedDate,
      record.recurrenceInterval || 1,
      unit,
    );
    const scheduleEnded = Boolean(
      record.recurrenceEndDate &&
        nextDate > record.recurrenceEndDate,
    );

    const advanced = normalizeService({
      ...record,
      status: scheduleEnded ? "Completed" : "Scheduled",
      date: scheduleEnded ? record.date : nextDate,
      lastCompletedDate: completedDate,
      completionHistory: history,
      serviceHistory,
      checklist: (record.checklist || []).map((item) => ({
        ...item,
        completed: false,
      })),
    });

    setServiceRecords((current) =>
      byTitle(
        current.map((item) =>
          item.id === advanced.id ? advanced : item,
        ),
      ),
    );
    await postAtlasRecord("work_orders", advanced);
    clearRecordDirty("work_order", advanced.id);

    setDatabaseStatus(
      scheduleEnded
        ? `Completed ${advanced.title}. Its recurring schedule has ended.`
        : `Completed ${advanced.title}. Next due ${formatDate(nextDate)}.`,
    );
  }

  function startNewCalendarDraft(date?: string) {
    const targetDate = date || selectedCalendarDate || todayISO();
    setSelectedCalendarDate(targetDate);
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(targetDate));
    setCalendarDirty(false);
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
    setCalendarDirty(false);
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
    setCalendarDirty(true);
    setCalendarDraft((current) => {
      const nextAllDay = patch.allDay ?? current.allDay ?? false;
      const nextCategory =
        patch.categoryLabel ??
        patch.area ??
        current.categoryLabel ??
        current.area ??
        "";
      const nextLinkedType = patch.linkedType ?? current.linkedType;

      const next: CalendarItem = {
        ...current,
        ...patch,
        id: selectedCalendarId || current.id || "",
        title: patch.title ?? current.title ?? "",
        area: nextCategory,
        categoryLabel: nextCategory,
        date: patch.date ?? current.date ?? selectedCalendarDate ?? todayISO(),
        time: nextAllDay ? "" : (patch.time ?? current.time ?? ""),
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
    setCalendarDirty(false);
    setCalendarIntakeText("");
    setCalendarIntakeMessage("");
  }

  function saveCalendarItem() {
    const record: CalendarItem = normalizeCalendar({
      ...calendarDraft,
      id: selectedCalendarId || uid("cal"),
      title: calendarDraft.title.trim() || "Untitled Calendar Item",
      area: (
        calendarDraft.categoryLabel ||
        calendarDraft.area ||
        "Maintenance"
      ).trim(),
      categoryLabel: (
        calendarDraft.categoryLabel ||
        calendarDraft.area ||
        "Maintenance"
      ).trim(),
      date: calendarDraft.date || selectedCalendarDate || todayISO(),
      time: calendarDraft.allDay ? "" : calendarDraft.time || "",
      colorId:
        calendarDraft.colorId ||
        categoryToColorId(
          calendarDraft.categoryLabel || calendarDraft.area || "Maintenance",
        ),
      colorName:
        calendarDraft.colorName ||
        colorNameFromLegacyColorId(
          calendarDraft.colorId ||
            categoryToColorId(
              calendarDraft.categoryLabel ||
                calendarDraft.area ||
                "Maintenance",
            ),
        ),
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
      if (exists)
        return byTitle(
          current.map((item) => (item.id === record.id ? record : item)),
        );
      return byTitle([record, ...current]);
    });

    const labelExists = calendarColors.some(
      (item) => item.label.toLowerCase() === record.area.toLowerCase(),
    );
    if (!labelExists) {
      const plain = plainColor(record.colorName);
      setCalendarColors((current) => [
        ...current,
        {
          id: slugify(record.area),
          label: record.area,
          colorName: record.colorName,
          hex: plain.hex,
        },
      ]);
    }

    setSelectedCalendarDate(record.date);
    resetCalendarEntryForm(record.date);
    void postAtlasRecord("calendar", record);
  }

  async function deleteCalendarItem(id: string) {
    if (!id) {
      setSelectedCalendarId("");
      setCalendarDraft(blankCalendarItem(selectedCalendarDate));
      return;
    }
    const record = calendarItems.find((item) => item.id === id);
    if (!window.confirm(`Delete ${record?.title || "this calendar item"}?`)) return;
    const deleted = await deleteAtlasRecord("calendar", id);
    if (!deleted) return;
    const remaining = calendarItems.filter((item) => item.id !== id);
    setCalendarItems(byTitle(remaining));
    setSelectedCalendarId("");
    setCalendarDraft(blankCalendarItem(selectedCalendarDate));
    setCalendarDirty(false);
  }

  function formatCalendarIntakeTime(
    hourText: string,
    minuteText: string | undefined,
    meridiemText?: string,
  ) {
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
      return localISODate(
        new Date(
          Number(isoMatch[1]),
          Number(isoMatch[2]) - 1,
          Number(isoMatch[3]),
          12,
        ),
      );
    }

    const slashMatch = text.match(
      /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/,
    );
    if (slashMatch) {
      const yearValue = slashMatch[3]
        ? Number(slashMatch[3])
        : now.getFullYear();
      const fullYear = yearValue < 100 ? 2000 + yearValue : yearValue;
      return localISODate(
        new Date(
          fullYear,
          Number(slashMatch[1]) - 1,
          Number(slashMatch[2]),
          12,
        ),
      );
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

    const monthMatch = lower.match(
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?\b/,
    );
    if (monthMatch) {
      const year = monthMatch[3] ? Number(monthMatch[3]) : now.getFullYear();
      return localISODate(
        new Date(year, monthNames[monthMatch[1]], Number(monthMatch[2]), 12),
      );
    }

    return selectedCalendarDate || todayISO();
  }

  function timeFromCalendarIntake(text: string) {
    const timeMatch = text.match(
      /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i,
    );
    if (timeMatch)
      return formatCalendarIntakeTime(timeMatch[1], timeMatch[2], timeMatch[3]);

    const twentyFourHourMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHourMatch)
      return formatCalendarIntakeTime(
        twentyFourHourMatch[1],
        twentyFourHourMatch[2],
      );

    return "";
  }

  function titleFromCalendarIntake(text: string) {
    const lines = text
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const firstUsefulLine =
      lines.find((line) => !/^from:|^to:|^sent:|^subject:/i.test(line)) ||
      lines[0] ||
      "New Calendar Item";
    return firstUsefulLine.replace(/\s+/g, " ").slice(0, 90);
  }

  function categoryFromCalendarIntake(text: string) {
    const lower = text.toLowerCase();

    if (
      /landscape|weeding|grounds|lawn|irrigation|hydrawise|sprinkler/.test(
        lower,
      )
    ) {
      return {
        label: "Landscaping",
        colorId: "landscaping",
        colorName: "green" as CalendarColorName,
      };
    }

    if (/boat|dock|cobalt|seadoo|sea-doo|sunstream|seaborne/.test(lower)) {
      return {
        label: "Boat / Dock",
        colorId: "boat-dock",
        colorName: "blue" as CalendarColorName,
      };
    }

    if (
      /vendor|service|install|repair|estimate|invoice|paint|flooring|plumb|electric|hvac|delivery|appointment/.test(
        lower,
      )
    ) {
      return {
        label: "Vendor",
        colorId: "vendor",
        colorName: "purple" as CalendarColorName,
      };
    }

    if (/family|school|kids|personal|owner|steve|jessica|jeremy/.test(lower)) {
      return {
        label: "Personal / Owner",
        colorId: "personal-owner",
        colorName: "yellow" as CalendarColorName,
      };
    }

    if (/work order|wo:|maintenance|check|inspect|maintenance/.test(lower)) {
      return {
        label: "Maintenance",
        colorId: "maintenance",
        colorName: "gray" as CalendarColorName,
      };
    }

    return {
      label: "Maintenance",
      colorId: "maintenance",
      colorName: "gray" as CalendarColorName,
    };
  }

  function linkedRecordFromCalendarIntake(text: string) {
    const lower = text.toLowerCase();
    const vendor = vendorRecords.find(
      (record) => record.name && lower.includes(record.name.toLowerCase()),
    );
    if (vendor)
      return {
        linkedType: "Vendor" as CalendarLinkType,
        linkedId: vendor.id,
        linkedName: vendor.name,
      };

    const asset = assetRecords.find(
      (record) => record.name && lower.includes(record.name.toLowerCase()),
    );
    if (asset)
      return {
        linkedType: "Asset" as CalendarLinkType,
        linkedId: asset.id,
        linkedName: asset.name,
      };

    const location = locations.find(
      (record) => record.name && lower.includes(record.name.toLowerCase()),
    );
    if (location)
      return {
        linkedType: "Location" as CalendarLinkType,
        linkedId: location.id,
        linkedName: location.name,
      };

    return {
      linkedType: "None" as CalendarLinkType,
      linkedId: "",
      linkedName: "",
    };
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
    setCalendarDirty(true);
    setScreen("calendar");
    setCalendarIntakeMessage("Draft ready. Review and save.");
  }

  function updateCalendarColor(id: string, patch: Partial<CalendarColor>) {
    setCalendarColors((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const colorName =
          patch.colorName ??
          item.colorName ??
          colorNameFromLegacyColorId(item.id);
        const plain = plainColor(colorName);
        return {
          ...item,
          ...patch,
          label: patch.label ?? item.label,
          colorName,
          hex: plain.hex,
        };
      }),
    );
  }

  function addCalendarColor() {
    const newColor: CalendarColor = {
      id: uid("label"),
      label: "",
      colorName: "blue",
      hex: plainColor("blue").hex,
    };
    setCalendarColors((current) => [...current, newColor]);
    setCalendarDraft((current) => ({
      ...current,
      colorId: newColor.id,
      categoryLabel: newColor.label,
      area: newColor.label,
      colorName: newColor.colorName,
    }));
  }

  function updateProcedure(patch: Partial<ProcedureRecord>) {
    markRecordDirty("procedure", selectedProcedure.id);
    setProcedureRecords((current) =>
      byTitle(
        current.map((item) =>
          item.id === selectedProcedure.id
            ? normalizeProcedure({ ...item, ...patch })
            : item,
        ),
      ),
    );
  }

  function updatePart(patch: Partial<PartRecord>) {
    markRecordDirty("part", selectedPart.id);
    setPartRecords((current) =>
      byName(
        current.map((item) =>
          item.id === selectedPart.id
            ? normalizePart({ ...item, ...patch })
            : item,
        ),
      ),
    );
  }

  function addMapLabel() {
    const record: MapLabelRecord = {
      id: uid("map"),
      label: "",
      category: "",
      x: 50,
      y: 50,
      notes: "",
      photos: [],
      coverPhotoId: "",
      vendorIds: [],
      detailBoxes: [{ id: uid("mapbox"), title: "", body: "" }],
      installer: "",
      paintColor: "",
      specs: "",
      documentNotes: "",
      photoNotes: "",
      maintenanceNotes: "",
    };
    setMapLabels((current) => byLabel([...current, record]));
    setSelectedMapLabelId(record.id);
    setActiveMapPanelTab("info");
  }

  function resetMapLabels() {
    setMapLabels(defaultMapLabels);
    setSelectedMapLabelId(defaultMapLabels[0].id);
    setActiveMapPanelTab("info");
  }

  function updateSelectedMapLabel(patch: Partial<MapLabelRecord>) {
    setMapLabels((current) =>
      byLabel(
        current.map((label) =>
          label.id === selectedMapLabel.id
            ? {
                ...label,
                ...patch,
                x:
                  patch.x === undefined
                    ? label.x
                    : clampPercent(Number(patch.x)),
                y:
                  patch.y === undefined
                    ? label.y
                    : clampPercent(Number(patch.y)),
                photos: patch.photos ?? label.photos ?? [],
                coverPhotoId: patch.coverPhotoId ?? label.coverPhotoId ?? "",
                vendorIds: patch.vendorIds ?? label.vendorIds ?? [],
                detailBoxes:
                  patch.detailBoxes ??
                  label.detailBoxes ??
                  normalizeMapDetailBoxes(label),
                installer: patch.installer ?? label.installer ?? "",
                paintColor: patch.paintColor ?? label.paintColor ?? "",
                specs: patch.specs ?? label.specs ?? "",
                documentNotes: patch.documentNotes ?? label.documentNotes ?? "",
                photoNotes: patch.photoNotes ?? label.photoNotes ?? "",
                maintenanceNotes:
                  patch.maintenanceNotes ?? label.maintenanceNotes ?? "",
              }
            : label,
        ),
      ),
    );
  }

  function toggleMapLabelVendor(vendorId: string) {
    const currentVendorIds = selectedMapLabel.vendorIds || [];
    const nextVendorIds = currentVendorIds.includes(vendorId)
      ? currentVendorIds.filter((id) => id !== vendorId)
      : [...currentVendorIds, vendorId];

    updateSelectedMapLabel({ vendorIds: nextVendorIds });
  }

  function addMapDetailBox() {
    updateSelectedMapLabel({
      detailBoxes: [
        ...(selectedMapLabel.detailBoxes || []),
        { id: uid("mapbox"), title: "New Tab", body: "" },
      ],
    });
  }

  function updateMapDetailBox(boxId: string, patch: Partial<MapDetailBox>) {
    updateSelectedMapLabel({
      detailBoxes: (selectedMapLabel.detailBoxes || []).map((box) =>
        box.id === boxId ? { ...box, ...patch } : box,
      ),
    });
  }

  function removeMapDetailBox(boxId: string) {
    const nextBoxes = (selectedMapLabel.detailBoxes || []).filter(
      (box) => box.id !== boxId,
    );
    updateSelectedMapLabel({
      detailBoxes: nextBoxes.length
        ? nextBoxes
        : [{ id: uid("mapbox"), title: "General Notes", body: "" }],
    });
  }

  function handleMapLabelPhotoUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.currentTarget.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const nextPhoto: UploadedFileRecord = {
          id: uid("map-photo"),
          name: file.name,
          type: file.type,
          dataUrl: String(reader.result || ""),
          createdAt: new Date().toISOString(),
        };

        setMapLabels((current) =>
          byLabel(
            current.map((label) =>
              label.id === selectedMapLabel.id
                ? { ...label, photos: [...(label.photos || []), nextPhoto] }
                : label,
            ),
          ),
        );
        showSaveToast(
          `Photo saved to ${selectedMapLabel.label || "map record"}.`,
        );
      };
      reader.readAsDataURL(file);
    });

    event.currentTarget.value = "";
  }

  function removeMapLabelPhoto(photoId: string) {
    const nextPhotos = (selectedMapLabel.photos || []).filter(
      (photo) => photo.id !== photoId,
    );
    const nextCoverId =
      selectedMapLabel.coverPhotoId === photoId
        ? nextPhotos[0]?.id || ""
        : selectedMapLabel.coverPhotoId;
    updateSelectedMapLabel({ photos: nextPhotos, coverPhotoId: nextCoverId });
  }

  function handleMapHeaderPhotoUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const nextPhoto: UploadedFileRecord = {
        id: uid("map-photo"),
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result || ""),
        createdAt: new Date().toISOString(),
      };

      updateSelectedMapLabel({
        photos: [...(selectedMapLabel.photos || []), nextPhoto],
        coverPhotoId: nextPhoto.id,
      });
      showSaveToast(
        `Main photo saved to ${selectedMapLabel.label || "map record"}.`,
      );
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = "";
  }

  function handleMapLabelPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    labelId: string,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingLabelRef.current = labelId;
    setSelectedMapLabelId(labelId);
    setActiveMapPanelTab("info");
  }

  function handleMapPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingLabelRef.current || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    const id = draggingLabelRef.current;
    setMapLabels((current) =>
      current.map((label) => (label.id === id ? { ...label, x, y } : label)),
    );
  }

  function stopMapDrag() {
    draggingLabelRef.current = null;
  }

  function moveCalendarMonth(delta: number) {
    setCalendarCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  function moveCalendarYear(delta: number) {
    setCalendarCursor(
      (current) =>
        new Date(current.getFullYear() + delta, current.getMonth(), 1),
    );
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

  async function saveManualToAtlas(candidate: ManualCandidate) {
    if (!candidate.url) return;

    setManualSavingUrl(candidate.url);
    setManualSaveMessage(`Checking ${candidate.title}...`);

    try {
      const verifyResponse = await fetch("/api/manual-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: candidate.url }),
      });

      const verified = (await verifyResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        contentType?: string;
        fileName?: string;
        sizeBytes?: number;
        error?: string;
      };

      if (!verifyResponse.ok || !verified.ok || !verified.url) {
        throw new Error(verified.error || "Atlas could not verify that manual.");
      }

      const linkedAsset = candidate.assetId
        ? assetRecords.find((asset) => asset.id === candidate.assetId)
        : assetRecords.find((asset) =>
            [candidate.assetName, candidate.model]
              .filter(Boolean)
              .some((value) =>
                asset.name.toLowerCase().includes(String(value).toLowerCase()),
              ),
          );

      const createdAt = new Date().toISOString();
      const record: DocumentRecord = normalizeDocument({
        id: uid("doc"),
        title: candidate.title || verified.fileName || "Equipment Manual",
        area: linkedAsset
          ? locations.find((location) => location.id === linkedAsset.locationId)?.name ||
            linkedAsset.name
          : "General",
        type: "Equipment Manual / PDF",
        linkedAssetId: linkedAsset?.id,
        targetType: linkedAsset ? "Asset" : "General",
        targetId: linkedAsset?.id || "",
        targetName: linkedAsset?.name || "General",
        notes: [
          candidate.manufacturer ? `Manufacturer: ${candidate.manufacturer}` : "",
          candidate.model ? `Model: ${candidate.model}` : "",
          candidate.sourceLabel ? `Source: ${candidate.sourceLabel}` : "",
          candidate.reason ? `Match: ${candidate.reason}` : "",
          `Original PDF: ${verified.url}`,
          verified.sizeBytes ? `Verified size: ${Math.round(verified.sizeBytes / 1024)} KB` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        files: [
          {
            id: uid("file"),
            name: verified.fileName || `${candidate.title || "manual"}.pdf`,
            type: verified.contentType || "application/pdf",
            url: verified.url,
            createdAt,
          },
        ],
        href: verified.url,
        createdAt,
      });

      replaceDocumentInVault(record);
      await postDocumentToAtlasVault(record);

      const manualRecord = normalizeManualRecord({
        id: uid("manual"),
        title: record.title,
        category: inferManualCategory(record.title),
        manufacturer: candidate.manufacturer || "",
        model: candidate.model || "",
        documentNumber: "",
        linkedAssetId: linkedAsset?.id || "",
        linkedAssetName: linkedAsset?.name || "",
        sourceLabel:
          candidate.sourceLabel || candidate.sourceDomain || "Official source",
        href: verified.url,
        notes: candidate.reason || record.notes,
        files: record.files || [],
        createdAt,
      });

      setManualRecords((current) => {
        const duplicate = current.some(
          (manual) =>
            cleanManualOpenUrl(manual.href) ===
            cleanManualOpenUrl(manualRecord.href),
        );
        const next = duplicate ? current : [manualRecord, ...current];
        saveStoredArray(storageKeys.manuals[0], next);
        return next;
      });

      setManualSaveMessage(
        `Saved ${record.title} to Atlas Documents${linkedAsset ? ` and linked it to ${linkedAsset.name}` : ""}.`,
      );
      setDocumentSyncStatus(`Saved ${record.title} from Ask Atlas.`);
    } catch (error) {
      setManualSaveMessage(
        error instanceof Error
          ? error.message
          : "Atlas could not save that manual.",
      );
    } finally {
      setManualSavingUrl("");
    }
  }

  async function askAtlas(questionOverride?: string) {
    const question = String(questionOverride ?? assistantQuestion).trim();
    if (questionOverride) setAssistantQuestion(question);

    if (!question) {
      setAssistantAnswer("Type a question first.");
      return;
    }

    const normalizedQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const isTodayQuestion =
      /^(what do i need to do today|what am i doing today|what is on my schedule today|what s on my schedule today|show me today|today s work|todays work)$/.test(normalizedQuestion) ||
      (normalizedQuestion.includes("today") &&
        (normalizedQuestion.includes("need to do") ||
          normalizedQuestion.includes("schedule") ||
          normalizedQuestion.includes("work")));

    if (isTodayQuestion) {
      const today = localISODate();
      const todayCalendar = calendarItems
        .filter((item) => item.date === today && !item.completed)
        .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
      const todayWorkOrders = serviceRecords.filter((item) =>
        item.status !== "Completed" &&
        (item.date === today || item.followUpDate === today),
      );
      const highPriorityOpen = serviceRecords.filter(
        (item) => item.status !== "Completed" && item.priority === "High",
      );

      const lines: string[] = [];
      if (todayCalendar.length) {
        lines.push("Today’s schedule:");
        todayCalendar.forEach((item) => {
          lines.push(`• ${item.time ? `${item.time} — ` : ""}${item.title}`);
        });
      } else {
        lines.push("Nothing is scheduled on your calendar today.");
      }

      if (todayWorkOrders.length) {
        lines.push("", "Work due today:");
        todayWorkOrders.slice(0, 10).forEach((item) => {
          const assetName = assetRecords.find((asset) => asset.id === item.assetId)?.name;
          lines.push(`• ${item.title}${assetName ? ` — ${assetName}` : ""}${item.priority ? ` (${item.priority})` : ""}`);
        });
        if (todayWorkOrders.length > 10) {
          lines.push(`• ${todayWorkOrders.length - 10} more`);
        }
      } else {
        lines.push("", "No work orders are due today.");
      }

      if (highPriorityOpen.length) {
        lines.push("", `${highPriorityOpen.length} high-priority open work order${highPriorityOpen.length === 1 ? "" : "s"} still need attention.`);
      }

      setAssistantAnswer(lines.join("\n"));
      setManualCandidates([]);
      setManualSaveMessage("");
      setAssistantLoading(false);
      return;
    }

    const manualQuestion = /\b(manual|owner'?s manual|user guide|installation guide|service manual|pdf|documentation|spec sheet|datasheet)\b/i.test(question);

    const cleanText = (value: unknown, maxLength = 1200) =>
      String(value ?? "").slice(0, maxLength);

    const atlasSnapshot = {
      generatedAt: new Date().toISOString(),
      counts: {
        locations: locations.length,
        assets: assetRecords.length,
        vendors: vendorRecords.length,
        contacts: contactRecords.length,
        workOrders: serviceRecords.length,
        calendarItems: calendarItems.length,
        procedures: procedureRecords.length,
        parts: partRecords.length,
        documents: intakeDocs.length,
        mapLabels: mapLabels.length,
      },
      locations: locations.map((item) => ({
        id: item.id,
        name: cleanText(item.name, 200),
        type: cleanText(item.type, 120),
        zone: cleanText(item.zone, 120),
        notes: cleanText(item.notes),
      })),
      assets: assetRecords.map((item) => ({
        id: item.id,
        name: cleanText(item.name, 200),
        locationId: item.locationId,
        locationName:
          locations.find((location) => location.id === item.locationId)?.name ||
          "",
        category: cleanText(item.category, 120),
        status: item.status,
        make: cleanText(item.make, 160),
        model: cleanText(item.model, 160),
        serial: cleanText(item.serial, 160),
        notes: cleanText(item.notes),
        vendorIds: item.vendorIds,
      })),
      vendors: vendorRecords.map((item) => ({
        id: item.id,
        name: cleanText(item.name, 200),
        category: cleanText(item.category, 120),
        phone: cleanText(item.phone, 120),
        email: cleanText(item.email, 200),
        website: cleanText(item.website, 300),
        notes: cleanText(item.notes),
      })),
      contacts: contactRecords.map((item) => ({
        id: item.id,
        name: cleanText(item.name, 200),
        organization: cleanText(item.organization, 200),
        role: cleanText(item.role, 160),
        category: cleanText(item.category, 120),
        phone: cleanText(item.phone, 120),
        email: cleanText(item.email, 200),
        address: cleanText(item.address, 300),
        website: cleanText(item.website, 300),
        notes: cleanText(item.notes),
      })),
      workOrders: serviceRecords.map((item) => ({
        id: item.id,
        title: cleanText(item.title, 240),
        date: item.date,
        followUpDate: item.followUpDate || "",
        status: item.status,
        priority: item.priority || "",
        assetId: item.assetId,
        assetName:
          assetRecords.find((asset) => asset.id === item.assetId)?.name || "",
        vendorId: item.vendorId || "",
        vendorName:
          vendorRecords.find((vendor) => vendor.id === item.vendorId)?.name ||
          "",
        procedureId: item.procedureId || "",
        recurring: !!item.recurring,
        recurrenceInterval: item.recurrenceInterval || 1,
        recurrenceUnit: item.recurrenceUnit || "Weeks",
        recurrenceEndDate: item.recurrenceEndDate || "",
        season: item.season || "Year-Round",
        lastCompletedDate: item.lastCompletedDate || "",
        completionHistory: item.completionHistory || [],
        notes: cleanText(item.notes),
      })),
      calendarItems: calendarItems.map((item) => ({
        id: item.id,
        date: item.date,
        time: item.time || "",
        title: cleanText(item.title, 240),
        area: cleanText(item.area, 160),
        category: cleanText(item.categoryLabel, 160),
        notes: cleanText(item.notes),
        linkedType: item.linkedType || "None",
        linkedId: item.linkedId || "",
        linkedName: cleanText(item.linkedName, 240),
        completed: Boolean(item.completed),
      })),
      procedures: procedureRecords.map((item) => ({
        id: item.id,
        title: cleanText(item.title, 240),
        area: cleanText(item.area, 160),
        priority: item.priority,
        steps: item.steps.map((step) => cleanText(step, 500)),
      })),
      parts: partRecords.map((item) => ({
        id: item.id,
        name: cleanText(item.name, 200),
        category: cleanText(item.category, 120),
        locationId: item.locationId,
        locationName:
          locations.find((location) => location.id === item.locationId)?.name ||
          "",
        assetId: item.assetId || "",
        assetName:
          assetRecords.find((asset) => asset.id === item.assetId)?.name || "",
        vendorId: item.vendorId || "",
        vendorName:
          vendorRecords.find((vendor) => vendor.id === item.vendorId)?.name ||
          "",
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        status: item.status,
        notes: cleanText(item.notes),
      })),
      documents: intakeDocs.map((item) => ({
        id: item.id,
        title: cleanText(item.title, 240),
        area: cleanText(item.area, 160),
        type: cleanText(item.type, 120),
        targetType: item.targetType || "General",
        targetId: item.targetId || "",
        targetName: cleanText(item.targetName, 240),
        notes: cleanText(item.notes),
        pastedText: cleanText(item.pastedText, 2500),
        createdAt: item.createdAt || "",
        fileNames: (item.files || []).map((file) => cleanText(file.name, 240)),
      })),
      mapLabels: mapLabels.map((item) => ({
        id: item.id,
        label: cleanText(item.label, 200),
        category: cleanText(item.category, 120),
        notes: cleanText(item.notes),
        installer: cleanText(item.installer, 200),
        paintColor: cleanText(item.paintColor, 160),
        specs: cleanText(item.specs),
        documentNotes: cleanText(item.documentNotes),
        photoNotes: cleanText(item.photoNotes),
        maintenanceNotes: cleanText(item.maintenanceNotes),
        vendorIds: item.vendorIds || [],
      })),
      weather: {
        status: weatherStatus,
        days: weatherDays,
      },
    };

    const requestSnapshot = manualQuestion
      ? {
          generatedAt: atlasSnapshot.generatedAt,
          assets: atlasSnapshot.assets.map((asset) => ({
            id: asset.id,
            name: asset.name,
            make: asset.make,
            model: asset.model,
            category: asset.category,
            locationName: asset.locationName,
            notes: asset.notes.slice(0, 500),
          })),
        }
      : atlasSnapshot;

    setAssistantLoading(true);
    setManualCandidates([]);
    setManualSaveMessage("");
    setAssistantAnswer(
      manualQuestion
        ? "Ask Atlas is checking the exact equipment details and searching official manufacturer sources..."
        : "Ask Atlas is reviewing your Atlas records...",
    );

    try {
      const response = await fetch("/api/ask-atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          atlas: requestSnapshot,
          allowWebSearch: manualQuestion,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      const readString = (value: unknown): string =>
        typeof value === "string" ? value.trim() : "";
      const nestedResult =
        payload.result && typeof payload.result === "object"
          ? (payload.result as Record<string, unknown>)
          : {};
      const nestedData =
        payload.data && typeof payload.data === "object"
          ? (payload.data as Record<string, unknown>)
          : {};
      const nestedMessage =
        payload.message && typeof payload.message === "object"
          ? (payload.message as Record<string, unknown>)
          : {};

      const payloadError =
        readString(payload.error) ||
        readString(nestedResult.error) ||
        readString(nestedData.error);
      const payloadOk = payload.ok !== false;

      if (!response.ok || !payloadOk) {
        throw new Error(payloadError || "Ask Atlas could not answer right now.");
      }

      let cleanAnswer =
        readString(payload.answer) ||
        readString(payload.output_text) ||
        readString(payload.text) ||
        readString(payload.content) ||
        readString(nestedResult.answer) ||
        readString(nestedResult.output_text) ||
        readString(nestedResult.text) ||
        readString(nestedData.answer) ||
        readString(nestedData.text) ||
        readString(nestedMessage.content);
      let cleanManuals = Array.isArray(payload.manuals)
        ? (payload.manuals as ManualCandidate[])
        : Array.isArray(nestedResult.manuals)
          ? (nestedResult.manuals as ManualCandidate[])
          : Array.isArray(nestedData.manuals)
            ? (nestedData.manuals as ManualCandidate[])
            : [];

      if (cleanAnswer.startsWith("{") || cleanAnswer.startsWith("```")) {
        try {
          const normalized = cleanAnswer
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          const parsed = JSON.parse(normalized) as {
            answer?: unknown;
            manuals?: ManualCandidate[];
          };
          cleanAnswer = String(parsed.answer || "").trim();
          if (!cleanManuals.length && Array.isArray(parsed.manuals)) {
            cleanManuals = parsed.manuals;
          }
        } catch {
          // Keep the readable text returned by the route.
        }
      }

      setAssistantAnswer(
        cleanAnswer ||
          (cleanManuals.length
            ? "I found the official manual options below."
            : "I could not find a matching Atlas record. Try naming the asset, vendor, location, or date more specifically."),
      );
      setManualCandidates(cleanManuals.slice(0, 3));
    } catch (error) {
      setAssistantAnswer(
        error instanceof Error
          ? error.message
          : "Ask Atlas could not answer right now.",
      );
    } finally {
      setAssistantLoading(false);
    }
  }

  function renderCalendarIntakeCard() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Calendar Intake"
          title="Text to Calendar"
          detail="Paste scheduling text, make a draft, review it, then save."
          right={
            <button
              type="button"
              onClick={() => setScreen("calendar")}
              style={secondaryButtonStyle}
            >
              Open Calendar
            </button>
          }
        />

        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={calendarIntakeText}
            onChange={(event) =>
              setCalendarIntakeText(event.currentTarget.value)
            }
            placeholder="Paste scheduling text here"
            style={{
              ...inputStyle,
              minHeight: 86,
              resize: "vertical",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          />

          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={applyCalendarIntake}
              style={goldButtonStyle}
            >
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

          {calendarIntakeMessage ? (
            <p style={mutedSmallStyle}>{calendarIntakeMessage}</p>
          ) : null}
        </div>
      </section>
    );
  }

  function blankWorkLink(): WorkLinkRecord {
    return {
      id: "",
      name: "",
      category: "",
      vendor: "",
      url: "",
      logoText: "",
      logoBg: "#EEF6FF",
      logoUrl: "",
      logoColor: colors.navy3,
      notes: "",
    };
  }

  function openNewWorkLink() {
    setWorkLinkDraft(blankWorkLink());
    setWorkLinkMessage("");
    setWorkLinkEditorOpen(true);
  }

  function openEditWorkLink(link: WorkLinkRecord) {
    setWorkLinkDraft({ ...link });
    setWorkLinkMessage("");
    setWorkLinkEditorOpen(true);
  }

  function saveWorkLink() {
    const name = workLinkDraft.name.trim();
    const url = workLinkDraft.url.trim();

    if (!name || !url) {
      setWorkLinkMessage("Name and URL are required.");
      return;
    }

    const normalizedUrl =
      url.startsWith("/") || /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;

    const next: WorkLinkRecord = {
      ...workLinkDraft,
      id: workLinkDraft.id || uid("work-link"),
      name,
      url: normalizedUrl,
      category: workLinkDraft.category.trim() || "Work Link",
      vendor: workLinkDraft.vendor?.trim() || "",
      logoText:
        workLinkDraft.logoText.trim().slice(0, 4).toUpperCase() ||
        name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 3)
          .toUpperCase(),
      logoBg: workLinkDraft.logoBg || "#EEF6FF",
      logoColor: workLinkDraft.logoColor || colors.navy3,
      logoUrl: workLinkDraft.logoUrl?.trim() || "",
      notes: workLinkDraft.notes.trim(),
    };

    setWorkLinks((current) =>
      [...current.filter((item) => item.id !== next.id), next].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setWorkLinkEditorOpen(false);
    setWorkLinkMessage(`Saved ${next.name}.`);
    showSaveToast(`${next.name} was saved to Work Links.`, "success");
  }

  function deleteWorkLink(link: WorkLinkRecord) {
    if (!window.confirm(`Delete ${link.name} from Work Links?`)) return;
    setWorkLinks((current) => current.filter((item) => item.id !== link.id));
    setWorkLinkEditorOpen(false);
    setWorkLinkMessage(`Deleted ${link.name}.`);
  }

  function uploadWorkLinkLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setWorkLinkMessage("Choose an image file for the logo.");
      return;
    }
    if (file.size > 700_000) {
      setWorkLinkMessage("Logo image is too large. Use an image under 700 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setWorkLinkDraft((current) => ({
        ...current,
        logoUrl: String(reader.result || ""),
      }));
      setWorkLinkMessage("Logo loaded. Save the Work Link to keep it.");
    };
    reader.onerror = () => setWorkLinkMessage("Logo could not be read.");
    reader.readAsDataURL(file);
  }

  function calculateExpression(value = calculatorValue) {
    const clean = value.trim();
    if (!clean) {
      setCalculatorResult("0");
      return;
    }
    if (!/^[0-9+\-*/().%\s]+$/.test(clean)) {
      setCalculatorResult("Invalid");
      return;
    }
    try {
      const result = Function(`"use strict"; return (${clean});`)();
      setCalculatorResult(
        typeof result === "number" && Number.isFinite(result)
          ? String(Math.round((result + Number.EPSILON) * 1e10) / 1e10)
          : "Invalid",
      );
    } catch {
      setCalculatorResult("Invalid");
    }
  }

  function calculatorKey(value: string) {
    if (value === "C") {
      setCalculatorValue("");
      setCalculatorResult("0");
      return;
    }
    if (value === "⌫") {
      setCalculatorValue((current) => current.slice(0, -1));
      return;
    }
    if (value === "=") {
      calculateExpression();
      return;
    }
    setCalculatorValue((current) => `${current}${value}`);
  }

  const workPlanDays: WorkPlanDay[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];

  const workPlanTimeOptions = Array.from({ length: 96 }, (_, index) => {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const displayHour = hour % 12 || 12;
    const meridiem = hour < 12 ? "AM" : "PM";
    return { value, label: `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}` };
  });

  function minutesLabel(minutes: number) {
    const safe = Math.max(0, Math.round(minutes));
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    if (!hours) return `${mins}m`;
    if (!mins) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  function formatPlannerTime(value: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return value;

    const hour24 = Number(match[1]);
    const minute = match[2];
    const hour12 = hour24 % 12 || 12;
    const meridiem = hour24 < 12 ? "AM" : "PM";

    return `${hour12}:${minute} ${meridiem}`;
  }

  function normalizePlannerText(value: string) {
    return value
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/[^a-z0-9./&+\-\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseTaskMinutes(value: string) {
    const text = normalizePlannerText(value);
    let total = 0;
    let foundDuration = false;

    for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/g)) {
      total += Number(match[1]) * 60;
      foundDuration = true;
    }
    for (const match of text.matchAll(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/g)) {
      total += Number(match[1]);
      foundDuration = true;
    }

    const clockMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
    if (!foundDuration && clockMatch) {
      total = Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
      foundDuration = true;
    }

    if (foundDuration) return Math.max(15, Math.round(total));

    const numeric = Number(text);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 60;
  }

  function inferTaskDay(title: string, category: string): WorkPlanDay | "Auto" {
    const text = normalizePlannerText(`${title} ${category}`);
    const explicit = workPlanDays.find((day) =>
      new RegExp(`\\b${day.toLowerCase()}\\b`).test(text),
    );
    if (explicit) return explicit;
    if (/weekend cleanup|cleanup after weekend|prep for week|prepare for week/.test(text)) return "Monday";
    if (/prep for weekend|prepare for weekend|final cleanup|end of week/.test(text)) return "Friday";
    if (/landscap|irrigation|lawn|garden|weeding|prun/.test(text)) return "Tuesday";
    if (/maintenance|inspect|service|repair|mechanical/.test(text)) return "Wednesday";
    return "Auto";
  }

  function inferTaskCategory(title: string) {
    const text = normalizePlannerText(title);
    if (/cleanup|clean up|prep|organize|restock/.test(text)) return "Cleanup / Prep";
    if (/landscap|irrigation|lawn|garden|weed|prun|mow|edge|blow|plant/.test(text)) return "Landscaping";
    if (/repair|service|inspect|maintenance|mechanical|check|test|replace|paint/.test(text)) return "Maintenance";
    if (/admin|paperwork|update atlas|schedule|call|email|review/.test(text)) return "Administration";
    if (/plan|planning|prepare list/.test(text)) return "Planning";
    if (/walkthrough|walk through|inspection/.test(text)) return "Inspection";
    return "General";
  }

  function inferTaskPriority(value: string): WorkOrderPriority {
    const text = normalizePlannerText(value);
    if (/\b(urgent|critical|emergency|highest|high)\b/.test(text)) return "High";
    if (/\b(low|whenever|optional)\b/.test(text)) return "Low";
    return "Medium";
  }

  function inferTaskLocation(value: string) {
    const text = normalizePlannerText(value);
    const exact = [...locations]
      .sort((a, b) => b.name.length - a.name.length)
      .find((item) => text.includes(normalizePlannerText(item.name)));
    if (exact) return exact;

    const words = new Set(text.split(" ").filter((word) => word.length >= 4));
    let best: LocationRecord | undefined;
    let bestScore = 0;
    for (const location of locations) {
      const locationWords = normalizePlannerText(location.name)
        .split(" ")
        .filter((word) => word.length >= 4);
      const score = locationWords.filter((word) => words.has(word)).length;
      if (score > bestScore) {
        best = location;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : undefined;
  }

  function cleanImportedTaskTitle(value: string) {
    const firstSegment = value.split("|")[0]?.trim() || value.trim();
    return firstSegment
      .replace(/\b\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, " ")
      .replace(/\b(?:monday|tuesday|wednesday|thursday|friday)\b/gi, " ")
      .replace(/\b(?:urgent|critical|emergency|highest|high|medium|normal|low)\s*(?:priority)?\b/gi, " ")
      .replace(/\s*[-–—,:;]+\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Untitled task";
  }

  function nextWorkWeekDates() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const day = today.getDay();
    let delta = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
    if (day >= 1 && day <= 5) delta = 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + delta);
    return workPlanDays.reduce<Record<WorkPlanDay, string>>((acc, label, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      acc[label] = date.toISOString().slice(0, 10);
      return acc;
    }, {} as Record<WorkPlanDay, string>);
  }

  function importWorkPlanTasks() {
    const lines = workPlanInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      setWorkPlanMessage("Paste at least one task, one per line.");
      return;
    }

    const next = lines.map((line, index) => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      const title = cleanImportedTaskTitle(parts[0] || line) || `Task ${index + 1}`;
      const durationSource = parts.find((part) =>
        /\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i.test(part),
      ) || line;
      const categoryPart = parts.find((part) =>
        /^(cleanup\s*\/\s*prep|cleanup|prep|landscaping|maintenance|administration|planning|inspection|general)$/i.test(part),
      );
      const category = categoryPart
        ? categoryPart.replace(/\b\w/g, (letter) => letter.toUpperCase())
        : inferTaskCategory(line);
      const explicitDay = workPlanDays.find((day) =>
        new RegExp(`\\b${day.toLowerCase()}\\b`, "i").test(line),
      );
      const location = inferTaskLocation(line);
      const priority = inferTaskPriority(line);
      const recognizedParts = new Set(
        [durationSource, categoryPart, explicitDay]
          .filter(Boolean)
          .map((part) => String(part).toLowerCase()),
      );
      const notes = parts
        .slice(1)
        .filter((part) => !recognizedParts.has(part.toLowerCase()))
        .filter((part) => !/\b(?:urgent|critical|emergency|highest|high|medium|normal|low)\s*(?:priority)?\b/i.test(part))
        .join(" · ");

      return {
        id: uid("plan-task"),
        title,
        minutes: parseTaskMinutes(durationSource),
        priority,
        category,
        locationId: location?.id || "general",
        preferredDay: explicitDay || inferTaskDay(line, category),
        locked: /\b(?:locked|fixed|must stay|do not move)\b/i.test(line),
        recurring: /\b(?:recurring|repeat weekly|every week|weekly)\b/i.test(line),
        fixedTime: (line.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
          ? (() => {
              const match = line.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)!;
              let hour = Number(match[1]);
              const minute = Number(match[2] || 0);
              const meridiem = match[3].toLowerCase();
              if (meridiem === "pm" && hour !== 12) hour += 12;
              if (meridiem === "am" && hour === 12) hour = 0;
              return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
            })()
          : ""),
        notes,
      } satisfies WorkPlanTask;
    });

    setWorkPlanTasks(next);
    setWorkPlanMessage(`Imported ${next.length} tasks. Review estimates, then build the week.`);
  }

  function buildWorkPlan() {
    if (!workPlanTasks.length) {
      setWorkPlanMessage("Import tasks before building the schedule.");
      return;
    }
    const dates = nextWorkWeekDates();
    const capacity = Math.max(60, Math.round(workPlanTargetHours * 60));
    const used = workPlanDays.reduce<Record<WorkPlanDay, number>>((acc, day) => {
      acc[day] = 0;
      return acc;
    }, {} as Record<WorkPlanDay, number>);

    const dayPreference: Record<string, WorkPlanDay[]> = {
      "Cleanup / Prep": ["Monday", "Friday", "Wednesday", "Tuesday", "Thursday"],
      Landscaping: ["Tuesday", "Thursday", "Wednesday", "Monday", "Friday"],
      Maintenance: ["Wednesday", "Tuesday", "Thursday", "Monday", "Friday"],
      Administration: ["Monday", "Friday", "Wednesday", "Tuesday", "Thursday"],
      Planning: ["Monday", "Friday", "Wednesday", "Tuesday", "Thursday"],
      Inspection: ["Monday", "Friday", "Wednesday", "Tuesday", "Thursday"],
      General: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    };

    const lockedTasks = workPlanTasks.filter((task) => task.locked);
    const flexibleTasks = workPlanTasks.filter((task) => !task.locked);
    const conflicts: string[] = [];

    const plannedLocked = lockedTasks.map((task) => {
      const selected = task.preferredDay !== "Auto"
        ? task.preferredDay
        : task.scheduledDay || inferTaskDay(task.title, task.category);
      if (selected === "Auto") {
        conflicts.push(`${task.title} is locked but has no fixed day.`);
        return { ...task, scheduledDay: undefined, scheduledDate: undefined };
      }
      used[selected] += task.minutes;
      if (used[selected] > 8 * 60) conflicts.push(`${selected} has more than 8 hours of locked work.`);
      return { ...task, scheduledDay: selected, scheduledDate: dates[selected] };
    });

    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    const sortedFlexible = [...flexibleTasks].sort((a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      a.locationId.localeCompare(b.locationId) ||
      b.minutes - a.minutes
    );

    const plannedFlexible = sortedFlexible.map((task) => {
      const candidates = task.preferredDay !== "Auto"
        ? [task.preferredDay, ...workPlanDays.filter((day) => day !== task.preferredDay)]
        : dayPreference[task.category] || dayPreference.General;
      let selected = candidates.find((day) => used[day] + task.minutes <= capacity);
      if (!selected) selected = [...workPlanDays].sort((a, b) => used[a] - used[b])[0];
      used[selected] += task.minutes;
      return { ...task, scheduledDay: selected, scheduledDate: dates[selected] };
    });

    const plannedMap = new Map([...plannedLocked, ...plannedFlexible].map((task) => [task.id, task]));
    const planned = workPlanTasks.map((task) => plannedMap.get(task.id) || task);
    setWorkPlanTasks(planned);

    const overloaded = workPlanDays.filter((day) => used[day] > capacity);
    const messages = [
      `Plan built with locked commitments first and about ${Math.max(0, 8 - workPlanTargetHours)} hour${8 - workPlanTargetHours === 1 ? "" : "s"} of daily buffer.`,
      overloaded.length ? `${overloaded.join(", ")} exceeds the ${workPlanTargetHours}-hour target.` : "",
      conflicts.length ? conflicts.join(" ") : "",
    ].filter(Boolean);
    setWorkPlanMessage(messages.join(" "));
  }

  async function approveWorkPlan() {
    if (workPlanSaving) return;

    const scheduled = workPlanTasks.filter(
      (task) => task.scheduledDate && task.scheduledDay,
    );

    if (!scheduled.length) {
      setWorkPlanMessage("Build My Week first, then approve the planned tasks.");
      showSaveToast("Build My Week before adding tasks to the Calendar.", "warning");
      return;
    }

    setWorkPlanSaving(true);

    try {
      const byDay = workPlanDays.reduce<Record<WorkPlanDay, WorkPlanTask[]>>(
        (acc, day) => {
          acc[day] = scheduled.filter((task) => task.scheduledDay === day);
          return acc;
        },
        {} as Record<WorkPlanDay, WorkPlanTask[]>,
      );

      const prepared: Array<{ taskId: string; record: CalendarItem }> = [];

      for (const day of workPlanDays) {
        let minuteOfDay = 8 * 60;

        for (const task of byDay[day]) {
          const automaticTime = `${String(Math.floor(minuteOfDay / 60)).padStart(
            2,
            "0",
          )}:${String(minuteOfDay % 60).padStart(2, "0")}`;

          const taskTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(task.fixedTime || "")
            ? task.fixedTime!
            : automaticTime;

          const locationName =
            locations.find((item) => item.id === task.locationId)?.name ||
            "General";

          const occurrenceCount = task.recurring ? 52 : 1;

          for (let occurrence = 0; occurrence < occurrenceCount; occurrence += 1) {
            const occurrenceDate = new Date(`${task.scheduledDate}T12:00:00`);
            occurrenceDate.setDate(occurrenceDate.getDate() + occurrence * 7);
            const date = occurrenceDate.toISOString().slice(0, 10);

            const displayTitle =
              task.recurring && taskTime
                ? `${task.title} · ${formatPlannerTime(taskTime)}`
                : task.title;

            const record = normalizeCalendar({
              id:
                occurrence === 0
                  ? uid("planned")
                  : uid(`planned-week-${occurrence}`),
              title: displayTitle,
              area: "Planned Work",
              categoryLabel: "Planned Work",
              date,
              time: taskTime,
              allDay: false,
              repeat: "None",
              reminder: "Morning of",
              notes: [
                `Estimated time: ${minutesLabel(task.minutes)}`,
                `Priority: ${task.priority}`,
                `Type: ${task.category}`,
                `Location: ${locationName}`,
                task.locked ? "Locked: Yes" : "",
                task.recurring ? "Recurring weekly planner task" : "",
                task.notes || "",
              ]
                .filter(Boolean)
                .join("\n"),
              linkedType: task.locationId !== "general" ? "Location" : "None",
              linkedId: task.locationId !== "general" ? task.locationId : "",
              linkedName: task.locationId !== "general" ? locationName : "",
              completed: false,
              status: "Scheduled",
              source: "manual",
            });

            const duplicate = [...calendarItems, ...prepared.map((item) => item.record)].some(
              (item) =>
                item.date === record.date &&
                item.title.trim().toLowerCase() ===
                  record.title.trim().toLowerCase(),
            );

            if (!duplicate) {
              prepared.push({ taskId: task.id, record });
            }
          }

          minuteOfDay += task.minutes + 10;
        }
      }

      if (!prepared.length) {
        setWorkPlanMessage(
          "Those tasks already appear on the Calendar. No duplicates were added.",
        );
        showSaveToast("Those tasks are already on the Calendar.", "warning");
        return;
      }

      const records = prepared.map((item) => item.record);
      const approvedTaskIds = new Set(prepared.map((item) => item.taskId));
      const firstRecord = records[0];
      const nextCalendar = byTitle([...records, ...calendarItems]);

      // Save and verify browser persistence before removing imported tasks.
      const savedLocally = saveStoredArray(storageKeys.calendar[0], nextCalendar);
      setCalendarItems(nextCalendar);

      setSelectedCalendarDate(firstRecord.date);
      setSelectedCalendarId(firstRecord.id);
      setCalendarCursor(calendarDateValue(firstRecord.date));
      setCalendarDraft(firstRecord);

      let failed = 0;
      for (const record of records) {
        const ok = await postAtlasRecord("calendar", {
          ...record,
          status: record.status || "Scheduled",
        });
        if (!ok) failed += 1;
      }

      const syncedToAtlas = failed === 0;

      // Never discard imported tasks unless the Calendar is safely stored in
      // this browser or every record reached Neon successfully.
      if (savedLocally || syncedToAtlas) {
        setWorkPlanInput("");
        setWorkPlanTasks((current) =>
          current.filter((task) => !approvedTaskIds.has(task.id)),
        );
      }

      setScreen("calendar");
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (!savedLocally && !syncedToAtlas) {
        setWorkPlanMessage(
          "Calendar storage is full and Atlas sync failed. The imported tasks were kept so nothing is lost.",
        );
        showSaveToast(
          "Calendar was not saved. Imported tasks were kept.",
          "warning",
        );
      } else if (failed) {
        setWorkPlanMessage(
          `${records.length} item${records.length === 1 ? "" : "s"} saved on this device. ${failed} did not sync to Neon yet.`,
        );
        showSaveToast(
          `Calendar saved here; ${failed} item${failed === 1 ? "" : "s"} need database sync.`,
          "warning",
        );
      } else {
        setWorkPlanMessage(
          `${records.length} calendar item${records.length === 1 ? "" : "s"} added and synced successfully.`,
        );
        setDatabaseStatus("Calendar saved to Atlas.");
        showSaveToast(
          `${records.length} item${records.length === 1 ? "" : "s"} added to the Calendar.`,
          "success",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Calendar approval failed.";
      setWorkPlanMessage(
        `Planner could not finish: ${message}. Your imported tasks were kept unless they already appeared on the Calendar.`,
      );
      showSaveToast(`Planner error: ${message}`, "warning");
    } finally {
      setWorkPlanSaving(false);
    }
  }

  function updateWorkPlanTask(
    taskId: string,
    patch: Partial<WorkPlanTask>,
  ) {
    setWorkPlanTasks((current) =>
      current.map((item) =>
        item.id === taskId ? { ...item, ...patch } : item,
      ),
    );
  }

  function cyclePlannerPriority(priority: WorkOrderPriority) {
    if (priority === "High") return "Medium" as WorkOrderPriority;
    if (priority === "Medium") return "Low" as WorkOrderPriority;
    return "High" as WorkOrderPriority;
  }

  function cyclePlannerLocation(locationId: string) {
    const ids = ["general", ...locations.map((location) => location.id)];
    const currentIndex = Math.max(0, ids.indexOf(locationId));
    return ids[(currentIndex + 1) % ids.length];
  }

  function cyclePlannerDay(day: WorkPlanDay | "Auto" | undefined) {
    const days: Array<WorkPlanDay | "Auto"> = ["Auto", ...workPlanDays];
    const currentIndex = Math.max(0, days.indexOf(day || "Auto"));
    return days[(currentIndex + 1) % days.length];
  }

  function shiftPlannerTime(current: string | undefined, minutes: number) {
    const base = /^([01]\d|2[0-3]):[0-5]\d$/.test(current || "")
      ? current!
      : "08:00";
    const [hour, minute] = base.split(":").map(Number);
    const total = Math.max(
      0,
      Math.min(23 * 60 + 45, hour * 60 + minute + minutes),
    );
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60,
    ).padStart(2, "0")}`;
  }

  function plannerLocationName(locationId: string) {
    return (
      locations.find((location) => location.id === locationId)?.name ||
      "General"
    );
  }

  function renderWorkPlanner() {
    const scheduledMinutes = workPlanDays.reduce<Record<WorkPlanDay, number>>((acc, day) => {
      acc[day] = workPlanTasks
        .filter((task) => task.scheduledDay === day)
        .reduce((sum, task) => sum + task.minutes, 0);
      return acc;
    }, {} as Record<WorkPlanDay, number>);
    const lockedCount = workPlanTasks.filter((task) => task.locked).length;
    const recurringCount = workPlanTasks.filter((task) => task.recurring).length;

    return (
      <div
        style={{ display: "grid", gap: 16 }}
        onClick={(event) => {
          event.stopPropagation();
          const target =
            event.target instanceof HTMLElement ? event.target : null;
          const outsideAnchor = target?.closest("a");
          if (outsideAnchor && !event.currentTarget.contains(outsideAnchor)) {
            event.preventDefault();
          }
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
      >
        <section style={sectionStyle}>
          <SectionHeader
            brand
            eyebrow="Weekly Operations"
            title="Operations Planner"
            detail="Lock recurring commitments first, then let Atlas build a balanced week around them."
            right={
              <div style={buttonRowStyle}>
                <button type="button" onClick={() => setScreen("dashboard")} style={secondaryButtonStyle}>← Dashboard</button>
                <button type="button" onClick={buildWorkPlan} style={goldButtonStyle}>Build My Week</button>
              </div>
            }
          />
          <div style={statGridStyle}>
            <StatCard label="Tasks" value={workPlanTasks.length} />
            <StatCard label="Locked" value={lockedCount} />
            <StatCard label="Weekly" value={recurringCount} />
            <StatCard label="Daily Target" value={`${workPlanTargetHours}h`} />
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 180px", gap: 12 }}>
            <div>
              <label style={fieldLabelStyle}>Add tasks — one per line</label>
              <textarea
                value={workPlanInput}
                onChange={(event) => setWorkPlanInput(event.currentTarget.value)}
                placeholder={"Trash and recycling Monday 8 AM 45 minutes locked weekly\nTuesday landscaping 3 hours\nFriday final walkthrough 1 hour locked weekly"}
                style={{ ...inputStyle, minHeight: 135, resize: "vertical" }}
              />
              <p style={mutedSmallStyle}>Use plain language. Add “locked,” “weekly,” a weekday, and a time when a commitment must not move.</p>
            </div>
            <div style={{ display: "grid", alignContent: "start", gap: 10 }}>
              <label style={fieldLabelStyle}>Scheduled work per day</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[6, 6.5, 7, 7.5].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setWorkPlanTargetHours(hours)}
                    style={{
                      ...secondaryButtonStyle,
                      padding: "8px 6px",
                      background:
                        workPlanTargetHours === hours ? colors.gold : colors.card,
                      color:
                        workPlanTargetHours === hours ? colors.navy : colors.text,
                      borderColor:
                        workPlanTargetHours === hours ? colors.gold : colors.line,
                    }}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
              <button type="button" onClick={importWorkPlanTasks} style={secondaryButtonStyle}>Import Tasks</button>
              <button type="button" onClick={buildWorkPlan} style={goldButtonStyle}>Build My Week</button>
            </div>
          </div>
          <div style={{ ...noticeStyle, marginTop: 12 }}>{workPlanMessage}</div>
        </section>

        {workPlanTasks.length ? (
          <>
            <section style={sectionStyle}>
              <SectionHeader eyebrow="Week" title="Planned Work" detail="Locked items stay fixed. Flexible work fills the remaining time." />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))", gap: 10 }}>
                {workPlanDays.map((day) => {
                  const tasks = workPlanTasks.filter((task) => task.scheduledDay === day);
                  const total = scheduledMinutes[day] || 0;
                  const buffer = Math.max(0, 8 * 60 - total);
                  const percent = Math.min(100, Math.round((total / (8 * 60)) * 100));
                  return (
                    <div key={day} style={{ ...cardStyle, minHeight: 170, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{day}</strong><span style={mutedSmallStyle}>{minutesLabel(buffer)} open</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: colors.line, overflow: "hidden", margin: "8px 0" }}>
                        <div style={{ width: `${percent}%`, height: "100%", background: percent > 94 ? colors.red : colors.gold }} />
                      </div>
                      <div style={{ display: "grid", gap: 7 }}>
                        {tasks.map((task) => (
                          <div key={task.id} style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 7 }}>
                            <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                              {task.locked ? <span style={calendarCompactPillStyle}>Locked</span> : null}
                              {task.recurring ? <span style={calendarCompactPillStyle}>Weekly</span> : null}
                              <strong style={{ fontSize: 12 }}>{task.title}</strong>
                            </div>
                            <div style={{ ...mutedSmallStyle, fontSize: 11 }}>{task.fixedTime ? `${task.fixedTime} · ` : ""}{minutesLabel(task.minutes)} · {task.category}</div>
                          </div>
                        ))}
                        {!tasks.length ? <span style={mutedSmallStyle}>Open</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={sectionStyle}>
              <SectionHeader eyebrow="Review" title="Tasks & Commitments" detail="Edit estimates, lock fixed items, and set recurring weekly tasks before approval." />
              <div style={{ maxHeight: 430, overflowY: "auto", border: `1px solid ${colors.line}`, borderRadius: 12 }}>
                {workPlanTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: "grid",
                      gap: 8,
                      padding: 10,
                      borderBottom: `1px solid ${colors.line}`,
                      background: colors.card,
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      value={task.title}
                      onChange={(event) =>
                        updateWorkPlanTask(task.id, {
                          title: event.currentTarget.value,
                        })
                      }
                      style={inputStyle}
                    />

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr 1fr"
                          : "repeat(7, minmax(95px, 1fr))",
                        gap: 7,
                      }}
                    >
                      <div style={plannerControlCardStyle}>
                        <span style={plannerControlLabelStyle}>Minutes</span>
                        <strong>{task.minutes}</strong>
                        <div style={plannerControlButtonsStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                minutes: Math.max(15, task.minutes - 15),
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            −15
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                minutes: task.minutes + 15,
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            +15
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            priority: cyclePlannerPriority(task.priority),
                          })
                        }
                        style={plannerControlButtonStyle}
                      >
                        <span style={plannerControlLabelStyle}>Priority</span>
                        <strong>{task.priority}</strong>
                        <small>Tap to change</small>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            locationId: cyclePlannerLocation(task.locationId),
                          })
                        }
                        style={plannerControlButtonStyle}
                      >
                        <span style={plannerControlLabelStyle}>Location</span>
                        <strong>{plannerLocationName(task.locationId)}</strong>
                        <small>Tap to change</small>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextDay = cyclePlannerDay(
                            task.scheduledDay || task.preferredDay,
                          );
                          updateWorkPlanTask(task.id, {
                            preferredDay: nextDay,
                            scheduledDay:
                              nextDay === "Auto" ? undefined : nextDay,
                            scheduledDate:
                              nextDay === "Auto"
                                ? undefined
                                : nextWorkWeekDates()[nextDay],
                          });
                        }}
                        style={plannerControlButtonStyle}
                      >
                        <span style={plannerControlLabelStyle}>Day</span>
                        <strong>
                          {task.scheduledDay || task.preferredDay || "Auto"}
                        </strong>
                        <small>Tap to change</small>
                      </button>

                      <div style={plannerControlCardStyle}>
                        <span style={plannerControlLabelStyle}>Time</span>
                        <strong>{task.fixedTime || "Auto"}</strong>
                        <div style={plannerControlButtonsStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                fixedTime: shiftPlannerTime(
                                  task.fixedTime,
                                  -15,
                                ),
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            −15
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, {
                                fixedTime: shiftPlannerTime(
                                  task.fixedTime,
                                  15,
                                ),
                              })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            +15
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateWorkPlanTask(task.id, { fixedTime: "" })
                            }
                            style={plannerMiniButtonStyle}
                          >
                            Auto
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            locked: !task.locked,
                          })
                        }
                        style={{
                          ...plannerControlButtonStyle,
                          background: task.locked
                            ? "#FFF4D8"
                            : colors.card,
                          borderColor: task.locked
                            ? colors.gold
                            : colors.line,
                        }}
                      >
                        <span style={plannerControlLabelStyle}>Locked</span>
                        <strong>{task.locked ? "Yes" : "No"}</strong>
                        <small>Tap to toggle</small>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateWorkPlanTask(task.id, {
                            recurring: !task.recurring,
                          })
                        }
                        style={{
                          ...plannerControlButtonStyle,
                          background: task.recurring
                            ? "#EEF6FF"
                            : colors.card,
                          borderColor: task.recurring
                            ? colors.navy3
                            : colors.line,
                        }}
                      >
                        <span style={plannerControlLabelStyle}>Weekly</span>
                        <strong>{task.recurring ? "Yes" : "No"}</strong>
                        <small>Tap to toggle</small>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...buttonRowStyle, marginTop: 12 }}>
                <button type="button" onClick={() => { if (window.confirm("Clear all planner tasks?")) setWorkPlanTasks([]); }} style={dangerButtonStyle}>Clear Planner</button>
                <button type="button" onClick={buildWorkPlan} style={secondaryButtonStyle}>Rebalance Week</button>
                <button
                  type="button"
                  onClick={() => void approveWorkPlan()}
                  disabled={workPlanSaving}
                  style={{
                    ...goldButtonStyle,
                    opacity: workPlanSaving ? 0.65 : 1,
                    cursor: workPlanSaving ? "wait" : "pointer",
                  }}
                >
                  {workPlanSaving
                    ? "Adding to Calendar..."
                    : "Approve & Add to Calendar"}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </div>
    );
  }

  function renderDashboard() {
    return (
      <AtlasDashboard
        SectionHeader={SectionHeader}
        StatCard={StatCard}
        addCalendarItem={addCalendarItem}
        assetName={assetName}
        badgeStyle={badgeStyle}
        buttonRowStyle={buttonRowStyle}
        calendarWeatherIconStyle={calendarWeatherIconStyle}
        categoryForEvent={categoryForEvent}
        colorForEvent={colorForEvent}
        colors={colors}
        dashboardAdviceStyle={dashboardAdviceStyle}
        dashboardStackStyle={dashboardStackStyle}
        dashboardWeatherDayStyle={dashboardWeatherDayStyle}
        dashboardWeatherMiniStyle={dashboardWeatherMiniStyle}
        dashboardWeatherStripStyle={dashboardWeatherStripStyle}
        dashboardWeatherTempStyle={dashboardWeatherTempStyle}
        dashboardWeatherTopStyle={dashboardWeatherTopStyle}
        eventColorPillStyle={eventColorPillStyle}
        formatDate={formatDate}
        goldButtonStyle={goldButtonStyle}
        irrigationAdvice={irrigationAdvice}
        isMobile={isMobile}
        listStyle={listStyle}
        logoCandidates={logoCandidates}
        logoIndex={logoIndex}
        mutedSmallStyle={mutedSmallStyle}
        noticeStyle={noticeStyle}
        openCalendarItem={openCalendarItem}
        quickLinkCardStyle={quickLinkCardStyle}
        quickLinksGridStyle={quickLinksGridStyle}
        renderCalendarIntakeCard={renderCalendarIntakeCard}
        secondaryButtonStyle={secondaryButtonStyle}
        sectionStyle={sectionStyle}
        sectionTitleStyle={sectionTitleStyle}
        serviceRecords={serviceRecords}
        setLogoIndex={setLogoIndex}
        setScreen={setScreen}
        setSelectedServiceId={setSelectedServiceId}
        statGridStyle={statGridStyle}
        todayEventStyle={todayEventStyle}
        todayEvents={todayEvents}
        todayISO={todayISO}
        upcomingDayLabel={upcomingDayLabel}
        upcomingDayPillStyle={upcomingDayPillStyle}
        upcomingEvents={upcomingEvents}
        upcomingInfoStyle={upcomingInfoStyle}
        upcomingItemStyle={upcomingItemStyle}
        upcomingListStyle={upcomingListStyle}
        upcomingTodayPillStyle={upcomingTodayPillStyle}
        upcomingDotStyle={upcomingDotStyle}
        weatherDays={weatherDays}
        weatherIcon={weatherIcon}
        weatherStatus={weatherStatus}
        workLinkLogoFallbackStyle={workLinkLogoFallbackStyle}
        workLinkLogoImageStyle={workLinkLogoImageStyle}
        workLinkLogoStyle={workLinkLogoStyle}
        workLinkOpenStyle={workLinkOpenStyle}
        workLinkTextStyle={workLinkTextStyle}
        workLinks={workLinks}
        workOrderCardStyle={workOrderCardStyle}
        workOrderStripStyle={workOrderStripStyle}
        workPlanTargetHours={workPlanTargetHours}
        workPlanTasks={workPlanTasks}
        eyebrowStyle={eyebrowStyle}
      />
    );
  }

  function renderTimelineOrInsights(
    mode: "timeline" | "insights",
  ) {
    return (
      <AtlasInsightsTimeline
        mode={mode}
        serviceRecords={serviceRecords}
        todayEvents={todayEvents}
        upcomingEvents={upcomingEvents}
        weatherDays={weatherDays}
        colors={colors}
        sectionStyle={sectionStyle}
        noticeStyle={noticeStyle}
        mutedSmallStyle={mutedSmallStyle}
        secondaryButtonStyle={secondaryButtonStyle}
        goldButtonStyle={goldButtonStyle}
        badgeStyle={badgeStyle}
        formatDate={formatDate}
        assetName={assetName}
        vendorName={vendorName}
        locationName={locationName}
        setScreen={setScreen}
        setSelectedServiceId={setSelectedServiceId}
        openCalendarItem={openCalendarItem}
      />
    );
  }

  function renderMap() {
    const selectedMapVendors = vendorRecords.filter((vendor) =>
      (selectedMapLabel.vendorIds || []).includes(vendor.id),
    );
    const selectedCoverPhoto =
      (selectedMapLabel.photos || []).find(
        (photo) => photo.id === selectedMapLabel.coverPhotoId,
      ) || (selectedMapLabel.photos || [])[0];
    const mapTabs =
      selectedMapLabel.detailBoxes || normalizeMapDetailBoxes(selectedMapLabel);

    return (
      <ListDrawerLayout
        eyebrow="Map"
        title="Property Map"
        detail="Click a label for details. Click and hold a label to move it."
        isMobile={isMobile}
        drawerResetKey={selectedMapLabelId || "map-empty"}
        right={
          <>
            {selectedMapLabel.id ? (
              <button
                type="button"
                onClick={() => deleteMapLabelRecord(selectedMapLabel)}
                style={dangerButtonStyle}
              >
                Delete Label
              </button>
            ) : null}
            <button type="button" onClick={addMapLabel} style={goldButtonStyle}>
              Add Label
            </button>
          </>
        }
        list={
          <div>
            {!mapImageOk ? (
              <div
                style={{
                  ...noticeStyle,
                  borderColor: "#FACACA",
                  background: "#FEECEC",
                  color: colors.red,
                }}
              >
                Map image did not load. Confirm this file exists:{" "}
                <strong>public/atlas-property-map.png</strong>
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
                    onPointerDown={(event) =>
                      handleMapLabelPointerDown(event, label.id)
                    }
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
          </div>
        }
        drawer={
          <div style={mapInfoPanelStyle}>
            <div style={mapInfoHeaderStyle}>
              <div style={mapInfoTitleRowStyle}>
                <h3 style={mapInfoTitleStyle}>{selectedMapLabel.label}</h3>
                <div style={mapInfoIconRowStyle}>
                  <label title="Add header photo" style={mapIconButtonStyle}>
                    ✎
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMapHeaderPhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveMapPanelTab("info")}
                    style={mapIconButtonStyle}
                  >
                    ×
                  </button>
                </div>
              </div>
              {selectedCoverPhoto?.dataUrl || selectedCoverPhoto?.url ? (
                <div style={mapHeaderPhotoShellStyle}>
                  <img
                    src={selectedCoverPhoto.dataUrl || selectedCoverPhoto.url}
                    alt={selectedMapLabel.label}
                    style={mapHeaderPhotoStyle}
                  />
                  <label style={mapHeaderPhotoChangeStyle}>
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMapHeaderPhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              ) : (
                <label style={mapHeaderPhotoEmptyStyle}>
                  Add header photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMapHeaderPhotoUpload}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            <div style={mapPanelTabsStyle}>
              {[
                ["info", "Info"],
                ["vendors", "Vendors"],
                ["photos", "Photos"],
                ["tabs", "Tabs"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setActiveMapPanelTab(
                      id as "info" | "vendors" | "photos" | "tabs",
                    )
                  }
                  style={
                    activeMapPanelTab === id
                      ? mapPanelTabActiveStyle
                      : mapPanelTabStyle
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={mapPanelBodyStyle}>
              {activeMapPanelTab === "info" ? (
                <div style={mapPanelFormStackStyle}>
                  <Field
                    label="Name"
                    value={selectedMapLabel.label}
                    onChange={(value) =>
                      updateSelectedMapLabel({ label: value })
                    }
                  />
                  <Field
                    label="Type"
                    value={selectedMapLabel.category}
                    onChange={(value) =>
                      updateSelectedMapLabel({ category: value })
                    }
                  />
                  <label style={{ display: "grid", gap: 7 }}>
                    <span style={fieldLabelStyle}>Description</span>
                    <textarea
                      value={selectedMapLabel.notes || ""}
                      onChange={(event) =>
                        updateSelectedMapLabel({
                          notes: event.currentTarget.value,
                        })
                      }
                      placeholder="Add a short note"
                      style={{
                        ...inputStyle,
                        minHeight: 88,
                        resize: "vertical",
                      }}
                    />
                  </label>
                </div>
              ) : null}

              {activeMapPanelTab === "vendors" ? (
                <div style={mapPanelFormStackStyle}>
                  <label style={{ display: "grid", gap: 7 }}>
                    <span style={fieldLabelStyle}>Add Vendor</span>
                    <select
                      value=""
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        if (value) toggleMapLabelVendor(value);
                      }}
                      style={inputStyle}
                    >
                      <option value="">Choose vendor</option>
                      {vendorRecords
                        .filter(
                          (vendor) =>
                            !(selectedMapLabel.vendorIds || []).includes(
                              vendor.id,
                            ),
                        )
                        .map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  {selectedMapVendors.length ? (
                    <div style={mapVendorChipListStyle}>
                      {selectedMapVendors.map((vendor) => (
                        <button
                          key={vendor.id}
                          type="button"
                          onClick={() => toggleMapLabelVendor(vendor.id)}
                          style={mapVendorChipStyle}
                        >
                          {vendor.name} ×
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={mapEmptyNoteStyle}>No vendors linked.</p>
                  )}
                </div>
              ) : null}

              {activeMapPanelTab === "photos" ? (
                <div style={mapPanelFormStackStyle}>
                  <label
                    style={{
                      ...secondaryButtonStyle,
                      display: "inline-flex",
                      cursor: "pointer",
                      width: "fit-content",
                    }}
                  >
                    Add Photos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMapLabelPhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {selectedMapLabel.photos?.length ? (
                    <div style={mapSmallPhotoGridStyle}>
                      {selectedMapLabel.photos.map((photo) => (
                        <div key={photo.id} style={mapSmallPhotoCardStyle}>
                          {photo.dataUrl || photo.url ? (
                            <img
                              src={photo.dataUrl || photo.url}
                              alt={photo.name}
                              style={mapSmallPhotoStyle}
                            />
                          ) : null}
                          <div style={mapPhotoCardFooterStyle}>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMapLabel({
                                  coverPhotoId: photo.id,
                                })
                              }
                              style={smallSubtleButtonStyle}
                            >
                              Use Header
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMapLabelPhoto(photo.id)}
                              style={dangerMiniButtonStyle}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={mapEmptyNoteStyle}>No photos added.</p>
                  )}
                </div>
              ) : null}

              {activeMapPanelTab === "tabs" ? (
                <div style={mapPanelFormStackStyle}>
                  <div style={mapTabListStyle}>
                    {mapTabs.map((box) => (
                      <div key={box.id} style={mapTabEditorStyle}>
                        <div style={mapBoxHeaderStyle}>
                          <input
                            aria-label="Tab title"
                            value={box.title}
                            onChange={(event) =>
                              updateMapDetailBox(box.id, {
                                title: event.currentTarget.value,
                              })
                            }
                            placeholder="Tab name"
                            style={mapBoxTitleInputStyle}
                          />
                          <button
                            type="button"
                            onClick={() => removeMapDetailBox(box.id)}
                            style={mapBoxRemoveButtonStyle}
                          >
                            Remove
                          </button>
                        </div>
                        <textarea
                          aria-label={`${box.title || "Tab"} details`}
                          value={box.body}
                          onChange={(event) =>
                            updateMapDetailBox(box.id, {
                              body: event.currentTarget.value,
                            })
                          }
                          placeholder="Add details"
                          style={mapBoxTextareaStyle}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMapDetailBox}
                    style={mapAddTabButtonStyle}
                  >
                    + Add Tab
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />
    );
  }

  function renderLocations() {
    const locationPhotos = selectedLocation.id
      ? linkedImageFilesFor("Location", selectedLocation.id)
      : [];
    const locationAssets = selectedLocation.id
      ? byName(
          assetRecords.filter(
            (asset) => asset.locationId === selectedLocation.id,
          ),
        )
      : [];

    return (
      <ListDrawerLayout
        eyebrow="Property Areas"
        title="Locations"
        isMobile={isMobile}
        drawerResetKey={selectedLocationId || "location-empty"}
        list={
          <div style={listStyle}>
            {filteredLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocationId(location.id)}
                style={{
                  ...rowButtonStyle,
                  borderColor:
                    location.id === selectedLocation.id
                      ? colors.gold
                      : colors.line,
                }}
              >
                <div>
                  <strong>{location.name}</strong>
                  <p style={mutedSmallStyle}>
                    {location.type} · {location.zone}
                  </p>
                </div>
                <span style={badgeStyle("Monitor")}>
                  {
                    assetRecords.filter(
                      (asset) => asset.locationId === location.id,
                    ).length
                  }{" "}
                  assets
                </span>
              </button>
            ))}
          </div>
        }
        drawer={
          selectedLocation.id ? (
            <div
              style={stackStyle}
              tabIndex={0}
              onPaste={(event) => {
                const files = imageFilesFromPasteEvent(event);
                if (!files.length) return;
                event.preventDefault();
                void addLinkedPhotoFiles(
                  "Location",
                  selectedLocation.id,
                  selectedLocation.name,
                  files,
                );
              }}
            >
              <div>
                <h3 style={editorHeaderStyle}>{selectedLocation.name}</h3>
                <div style={recordInfoGridStyle}>
                  <div style={recordInfoItemStyle}>
                    <span style={fieldLabelStyle}>Type</span>
                    <strong>{selectedLocation.type || "—"}</strong>
                  </div>
                  <div style={recordInfoItemStyle}>
                    <span style={fieldLabelStyle}>Zone</span>
                    <strong>{selectedLocation.zone || "—"}</strong>
                  </div>
                </div>
                {selectedLocation.notes ? (
                  <p style={recordNotesStyle}>{selectedLocation.notes}</p>
                ) : null}
              </div>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Photos</div>
                    <strong>{locationPhotos.length} attached</strong>
                  </div>
                  <div style={buttonRowStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        void pasteLinkedPhoto(
                          "Location",
                          selectedLocation.id,
                          selectedLocation.name,
                        )
                      }
                      style={secondaryButtonStyle}
                    >
                      Paste Image
                    </button>
                    <label style={compactUploadButtonStyle}>
                      Add Photo
                      <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(event) => {
                        void addLinkedPhotoFiles(
                          "Location",
                          selectedLocation.id,
                          selectedLocation.name,
                          event.currentTarget.files,
                        );
                        event.currentTarget.value = "";
                      }}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                {locationPhotos.length ? (
                  <div style={photoGridStyle}>
                    {locationPhotos.map((file) => (
                      <div key={file.id} style={photoManageCardStyle}>
                        <button
                          type="button"
                          onClick={() => openUploadedFile(file)}
                          style={compactPhotoButtonStyle}
                        >
                          <img
                            src={file.dataUrl || file.url}
                            alt={file.name}
                            style={photoStyle}
                          />
                          <strong>{file.name}</strong>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteLinkedImage(file)}
                          style={photoDeleteButtonStyle}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    No photos attached yet. You can also click this panel and paste a copied image.
                  </p>
                )}
              </section>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Assets at this location</div>
                {locationAssets.length ? (
                  <div style={compactLinkedListStyle}>
                    {locationAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setScreen("assets");
                        }}
                        style={compactLinkedRowStyle}
                      >
                        <span>
                          <strong>{asset.name}</strong>
                          <small style={mutedSmallStyle}>
                            {asset.category}
                          </small>
                        </span>
                        <span style={badgeStyle(asset.status)}>
                          {asset.status}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    No assets are assigned to this location.
                  </p>
                )}
              </section>

              {renderLinkedDocuments("Location", selectedLocation.id)}
            </div>
          ) : (
            <div style={noticeStyle}>
              <strong>Select a location.</strong>
              <p style={mutedSmallStyle}>
                Open a location to see its information, photos, and assets.
              </p>
            </div>
          )
        }
      />
    );
  }

  function renderAssets() {
    const attachedManuals = manualsForAsset(selectedAsset);
    const relatedWorkOrders = selectedAsset.id
      ? [...serviceRecords]
          .filter((record) => record.assetId === selectedAsset.id)
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      : [];
    const selectedAssetCoverPhoto = selectedAssetPhotos[0];
    const selectedAssetCoverSource = photoSource(
      selectedAssetCoverPhoto,
    );

    return (
      <ListDrawerLayout
        eyebrow="Property Records"
        title="Assets"
        isMobile={isMobile}
        drawerResetKey={selectedAssetId}
        right={
          <button type="button" onClick={addAsset} style={goldButtonStyle}>
            Add Asset
          </button>
        }
        list={
          <div style={listStyle}>
            {filteredAssets.map((asset) => {
              const coverPhoto = photos.find(
                (photo) => photo.assetId === asset.id,
              );
              const coverPhotoSource = photoSource(coverPhoto);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedAssetId(asset.id)}
                  style={{
                    ...rowButtonStyle,
                    borderColor:
                      asset.id === selectedAsset.id
                        ? colors.gold
                        : colors.line,
                  }}
                >
                  <div style={recordListIdentityStyle}>
                    <div style={recordListThumbStyle}>
                      {coverPhotoSource ? (
                        <img
                          src={coverPhotoSource}
                          alt=""
                          style={recordListThumbImageStyle}
                        />
                      ) : (
                        <span>{asset.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <strong>{asset.name}</strong>
                      <p style={mutedSmallStyle}>
                        {asset.category} · {locationName(asset.locationId)}
                      </p>
                      <p style={mutedSmallStyle}>
                        {[asset.make, asset.model, asset.serial]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <span style={badgeStyle(asset.status)}>{asset.status}</span>
                </button>
              );
            })}
          </div>
        }
        drawer={
          selectedAsset.id ? (
            <div
              style={stackStyle}
              tabIndex={0}
              onPaste={(event) => {
                const payload = imagePayloadFromPasteEvent(event);
                if (!payload.files.length && !payload.urls.length) return;
                event.preventDefault();

                void (async () => {
                  try {
                    setDatabaseStatus("Reading pasted image...");
                    const files = await filesFromClipboardPayload(
                      payload.files,
                      payload.urls,
                    );
                    if (!files.length) {
                      throw new Error(
                        "No usable image was found. Use Copy image instead of Copy link.",
                      );
                    }
                    await addAssetPhotoFiles(files);
                  } catch (error) {
                    setDatabaseStatus(
                      error instanceof Error
                        ? error.message
                        : "Could not paste that image.",
                    );
                  }
                })();
              }}
            >
              <div style={assetVisualHeaderStyle}>
                <div style={assetPhotoLargeStyle}>
                  {selectedAssetCoverSource ? (
                    <img
                      src={selectedAssetCoverSource}
                      alt={selectedAsset.name}
                      style={assetPhotoLargeImageStyle}
                    />
                  ) : (
                    <span>
                      {selectedAsset.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={assetHeaderTextStyle}>
                  <div style={assetHeaderNameRowStyle}>
                    <h3 style={assetHeaderNameStyle}>
                      {selectedAsset.name.trim() || "Asset"}
                    </h3>
                    <span style={badgeStyle(selectedAsset.status)}>
                      {selectedAsset.status}
                    </span>
                  </div>

                  <p style={assetHeaderMetaStyle}>
                    {selectedAsset.category || "Uncategorized"} ·{" "}
                    {locationName(selectedAsset.locationId)}
                  </p>

                  <p style={assetHeaderMetaStyle}>
                    {[selectedAsset.make, selectedAsset.model, selectedAsset.serial]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div style={assetPhotoButtonRowStyle}>
                  <button
                    type="button"
                    onClick={() => void pasteAssetPhoto()}
                    style={assetPhotoActionButtonStyle}
                  >
                    Paste Image
                  </button>

                  <label style={assetPhotoUploadButtonStyle}>
                    {selectedAssetCoverPhoto ? "Add Another" : "Add Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(event) => {
                        void addAssetPhotoFiles(event.currentTarget.files);
                        event.currentTarget.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Asset Information</div>
                <div style={formGridStyle}>
                  <Field
                    label="Name"
                    value={selectedAsset.name}
                    onChange={(value) => updateAsset({ name: value })}
                  />
                  <Field
                    label="Category"
                    value={selectedAsset.category}
                    onChange={(value) => updateAsset({ category: value })}
                  />
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Location</span>
                    <select
                      value={selectedAsset.locationId}
                      onChange={(event) =>
                        updateAsset({
                          locationId: event.currentTarget.value,
                        })
                      }
                      style={inputStyle}
                    >
                      <option value="">No location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SelectField
                    label="Status"
                    value={selectedAsset.status}
                    onChange={(value) => updateAsset({ status: value })}
                    options={
                      ["Online", "Offline", "Seasonal", "Monitor"] as const
                    }
                  />
                  <Field
                    label="Make"
                    value={selectedAsset.make ?? ""}
                    onChange={(value) => updateAsset({ make: value })}
                  />
                  <Field
                    label="Model"
                    value={selectedAsset.model ?? ""}
                    onChange={(value) => updateAsset({ model: value })}
                  />
                  <Field
                    label="Serial / VIN / HIN"
                    value={selectedAsset.serial ?? ""}
                    onChange={(value) => updateAsset({ serial: value })}
                  />
                  <Field
                    label="Vendor IDs"
                    value={selectedAsset.vendorIds.join(", ")}
                    onChange={(value) =>
                      updateAsset({
                        vendorIds: value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <Field
                    label="Notes"
                    value={selectedAsset.notes}
                    onChange={(value) => updateAsset({ notes: value })}
                    multiline
                  />
                </div>

                <div style={buttonRowStyle}>
                  {isRecordDirty("asset", selectedAsset.id) ? (
                    <button
                      type="button"
                      onClick={() =>
                        void saveDirtyRecord(
                          "assets",
                          selectedAsset,
                          "asset",
                          selectedAsset.id,
                        )
                      }
                      style={goldButtonStyle}
                    >
                      Save Asset
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => addWorkOrder()}
                    style={secondaryButtonStyle}
                  >
                    Create Work Order
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteAssetRecord(selectedAsset)}
                    style={dangerButtonStyle}
                  >
                    Delete Asset
                  </button>
                </div>
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Manuals</div>
                    <strong>
                      {attachedManuals.length
                        ? `${attachedManuals.length} attached`
                        : "No manual attached"}
                    </strong>
                  </div>
                  <div style={buttonRowStyle}>
                    <button
                      type="button"
                      onClick={() => startManualForAsset(selectedAsset)}
                      style={secondaryButtonStyle}
                    >
                      Add Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => findManualForAsset(selectedAsset)}
                      style={goldButtonStyle}
                    >
                      Find Online
                    </button>
                  </div>
                </div>

                {attachedManuals.length ? (
                  <div style={compactLinkedListStyle}>
                    {attachedManuals.map((manual) => {
                      const url = openManualUrl(manual);
                      return (
                        <div key={manual.id} style={manualAssetRowStyle}>
                          <span style={{ minWidth: 0 }}>
                            <strong>{manual.title}</strong>
                            <small style={mutedSmallStyle}>
                              {[manual.manufacturer, manual.model]
                                .filter(Boolean)
                                .join(" · ") || manual.category}
                            </small>
                          </span>
                          <div style={manualActionRowStyle}>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={manualCompactFileStyle}
                              >
                                Open
                              </a>
                            ) : (
                              <span style={manualNoPdfStyle}>—</span>
                            )}
                            <button
                              type="button"
                              onClick={() => void deleteManualRecord(manual)}
                              style={manualDeleteButtonStyle}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    Use Find Online to search official manufacturer sources,
                    or Add Manual to paste a known link.
                  </p>
                )}
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Photos</div>
                    <strong>{selectedAssetPhotos.length} attached</strong>
                  </div>
                  <div style={buttonRowStyle}>
                    <button
                      type="button"
                      onClick={() => void pasteAssetPhoto()}
                      style={secondaryButtonStyle}
                    >
                      Paste Image
                    </button>
                    <label style={compactUploadButtonStyle}>
                      Add Photo
                      <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={(event) => {
                        void addAssetPhotoFiles(
                          event.currentTarget.files,
                        );
                        event.currentTarget.value = "";
                      }}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                {selectedAssetPhotos.length ? (
                  <div style={photoGridStyle}>
                    {selectedAssetPhotos.map((photo, index) => {
                      const source = photoSource(photo);
                      return (
                        <div key={photo.id} style={photoManageCardStyle}>
                          <button
                            type="button"
                            onClick={() => openPhotoPreview(photo)}
                            style={compactPhotoButtonStyle}
                            disabled={!source}
                          >
                            {source ? (
                              <img
                                src={source}
                                alt={photo.name}
                                style={photoStyle}
                              />
                            ) : (
                              <div style={photoMissingStyle}>
                                Image data missing
                              </div>
                            )}
                            <strong>{photo.name}</strong>
                            {index === 0 ? (
                              <small style={coverPhotoLabelStyle}>
                                Main photo
                              </small>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteAssetPhoto(photo)}
                            style={photoDeleteButtonStyle}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    No photos attached yet. You can also click this panel and paste a copied image.
                  </p>
                )}
              </section>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Work Order History</div>
                {relatedWorkOrders.length ? (
                  <div style={compactLinkedListStyle}>
                    {relatedWorkOrders.slice(0, 8).map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(record.id);
                          setScreen("history");
                        }}
                        style={compactLinkedRowStyle}
                      >
                        <span>
                          <strong>{record.title}</strong>
                          <small style={mutedSmallStyle}>
                            {formatDate(record.date)}
                          </small>
                        </span>
                        <span style={badgeStyle(record.status)}>
                          {record.status}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    No work orders are linked to this asset.
                  </p>
                )}
              </section>

              {renderLinkedDocuments("Asset", selectedAsset.id)}
            </div>
          ) : (
            <div style={noticeStyle}>
              <strong>Select an asset.</strong>
              <p style={mutedSmallStyle}>
                Open an asset to see its information, manuals, photos, work
                orders, and documents.
              </p>
            </div>
          )
        }
      />
    );
  }

  function renderContacts() {
    const selectedStoredContact = selectedContactId
      ? contactRecords.find((item) => item.id === selectedContactId)
      : undefined;

    const contactSubtitle = (contact: ContactRecord) =>
      [contact.organization, contact.role, contact.category]
        .filter(Boolean)
        .join(" · ");

    return (
      <ListDrawerLayout
        eyebrow="People & Companies"
        title="Contacts"
        detail="Coworkers, vendors, carriers, contractors, and other useful contacts in alphabetical order."
        isMobile={isMobile}
        drawerResetKey={selectedContactId || "contact-new"}
        right={
          <button
            type="button"
            onClick={startNewContact}
            style={goldButtonStyle}
          >
            Add Contact
          </button>
        }
        list={
          <div style={stackStyle}>
            <div style={cardStyle}>
              <input
                value={contactSearch}
                onChange={(event) =>
                  setContactSearch(event.currentTarget.value)
                }
                placeholder="Search contacts..."
                style={inputStyle}
              />
            </div>

            <div style={contactListShellStyle}>
              {filteredContacts.length ? (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => editContact(contact)}
                    style={{
                      ...contactRowStyle,
                      borderColor:
                        contact.id === selectedContactId
                          ? colors.gold
                          : "transparent",
                    }}
                  >
                    <div style={contactAvatarStyle}>
                      {contact.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part.slice(0, 1).toUpperCase())
                        .join("") || "C"}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong style={contactNameStyle}>
                        {contact.name}
                      </strong>
                      {contactSubtitle(contact) ? (
                        <p style={mutedSmallStyle}>
                          {contactSubtitle(contact)}
                        </p>
                      ) : null}
                      <p style={contactSecondaryLineStyle}>
                        {[contact.phone, contact.email]
                          .filter(Boolean)
                          .join(" · ") || "No phone or email saved"}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div style={noticeStyle}>
                  {contactSearch
                    ? "No contacts match this search."
                    : "No contacts have been added yet."}
                </div>
              )}
            </div>
          </div>
        }
        drawer={
          contactEditorOpen ? (
            <div style={stackStyle}>
              <div style={contactDetailHeaderStyle}>
                <div style={contactAvatarLargeStyle}>
                  {contactDraft.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.slice(0, 1).toUpperCase())
                    .join("") || "C"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={editorHeaderStyle}>
                    {contactDraft.name.trim() ||
                      (selectedContactId
                        ? "Edit Contact"
                        : "New Contact")}
                  </h3>
                  <p style={mutedSmallStyle}>
                    {contactSubtitle(contactDraft) ||
                      "Add contact information below."}
                  </p>
                </div>
              </div>

              {contactMessage ? (
                <div style={noticeStyle}>{contactMessage}</div>
              ) : null}

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Contact Information</div>
                <div style={formGridStyle}>
                  <Field
                    label="Name"
                    value={contactDraft.name}
                    onChange={(name) => updateContactDraft({ name })}
                    placeholder="Full name"
                  />
                  <Field
                    label="Company / Organization"
                    value={contactDraft.organization}
                    onChange={(organization) =>
                      updateContactDraft({ organization })
                    }
                    placeholder="Company, employer, or organization"
                  />
                  <Field
                    label="Role / Title"
                    value={contactDraft.role}
                    onChange={(role) => updateContactDraft({ role })}
                    placeholder="Job title or relationship"
                  />
                  <Field
                    label="Category"
                    value={contactDraft.category}
                    onChange={(category) =>
                      updateContactDraft({ category })
                    }
                    placeholder="Coworker, vendor, carrier, contractor..."
                  />
                  <Field
                    label="Phone Number"
                    value={contactDraft.phone}
                    onChange={(phone) => updateContactDraft({ phone })}
                    placeholder="Phone number"
                  />
                  <Field
                    label="Email Address"
                    value={contactDraft.email}
                    onChange={(email) => updateContactDraft({ email })}
                    placeholder="Email address"
                  />
                  <Field
                    label="Address"
                    value={contactDraft.address}
                    onChange={(address) => updateContactDraft({ address })}
                    placeholder="Mailing or business address"
                  />
                  <Field
                    label="Website"
                    value={contactDraft.website}
                    onChange={(website) => updateContactDraft({ website })}
                    placeholder="Website"
                  />
                  <Field
                    label="Notes"
                    value={contactDraft.notes}
                    onChange={(notes) => updateContactDraft({ notes })}
                    multiline
                    placeholder="Useful details, hours, account numbers, or other notes"
                  />
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={saveContact}
                    style={goldButtonStyle}
                  >
                    Save Contact
                  </button>

                  {contactDraft.phone.trim() ? (
                    <a
                      href={`tel:${contactDraft.phone.replace(
                        /[^+\d]/g,
                        "",
                      )}`}
                      style={secondaryButtonStyle}
                    >
                      Call
                    </a>
                  ) : null}

                  {contactDraft.email.trim() ? (
                    <a
                      href={`mailto:${contactDraft.email.trim()}`}
                      style={secondaryButtonStyle}
                    >
                      Email
                    </a>
                  ) : null}

                  {contactDraft.website.trim() ? (
                    <a
                      href={
                        /^https?:\/\//i.test(contactDraft.website.trim())
                          ? contactDraft.website.trim()
                          : `https://${contactDraft.website.trim()}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={secondaryButtonStyle}
                    >
                      Website
                    </a>
                  ) : null}

                  {selectedStoredContact ? (
                    <button
                      type="button"
                      onClick={() =>
                        deleteContact(selectedStoredContact)
                      }
                      style={dangerButtonStyle}
                    >
                      Delete Contact
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          ) : (
            <div style={noticeStyle}>
              <strong>Select a contact or add a new one.</strong>
              <p style={mutedSmallStyle}>
                Contacts stay alphabetized automatically and every field is
                editable.
              </p>
            </div>
          )
        }
      />
    );
  }

  function renderVendors() {
    const selectedVendorLogo = selectedVendor.id
      ? vendorLogoFor(selectedVendor.id)
      : undefined;
    const selectedVendorPhotos = selectedVendor.id
      ? linkedImageFilesFor("Vendor", selectedVendor.id)
      : [];
    const relatedVendorAssets = selectedVendor.id
      ? byName(
          assetRecords.filter((asset) =>
            asset.vendorIds.includes(selectedVendor.id),
          ),
        )
      : [];

    return (
      <ListDrawerLayout
        eyebrow="Property Records"
        title="Vendors"
        isMobile={isMobile}
        drawerResetKey={selectedVendorId || "vendor-new"}
        right={
          <button type="button" onClick={addVendor} style={goldButtonStyle}>
            Add Vendor
          </button>
        }
        list={
          <div style={listStyle}>
            {filteredVendors.map((vendor) => {
              const logo = vendorLogoFor(vendor.id);
              const logoSrc = logo?.dataUrl || logo?.url || "";
              return (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => setSelectedVendorId(vendor.id)}
                  style={{
                    ...rowButtonStyle,
                    borderColor:
                      vendor.id === selectedVendor.id
                        ? colors.gold
                        : colors.line,
                  }}
                >
                  <div style={recordListIdentityStyle}>
                    <div style={vendorLogoThumbStyle}>
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt={`${vendor.name} logo`}
                          style={vendorLogoImageStyle}
                        />
                      ) : (
                        <span>{vendor.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <strong>{vendor.name}</strong>
                      <p style={mutedSmallStyle}>{vendor.category}</p>
                      <p style={mutedSmallStyle}>
                        {[vendor.phone, vendor.email]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        }
        drawer={
          selectedVendor.id ? (
            <div
              style={stackStyle}
              tabIndex={0}
              onPaste={(event) => {
                const files = imageFilesFromPasteEvent(event);
                if (!files.length) return;
                event.preventDefault();
                void addLinkedPhotoFiles(
                  "Vendor",
                  selectedVendor.id,
                  selectedVendor.name,
                  files,
                  selectedVendorLogo ? "Photo" : "Vendor Logo",
                );
              }}
            >
              <div style={vendorDetailHeaderStyle}>
                <div style={vendorLogoLargeStyle}>
                  {selectedVendorLogo?.dataUrl ||
                  selectedVendorLogo?.url ? (
                    <img
                      src={
                        selectedVendorLogo.dataUrl ||
                        selectedVendorLogo.url
                      }
                      alt={`${selectedVendor.name} logo`}
                      style={vendorLogoImageStyle}
                    />
                  ) : (
                    <span>
                      {selectedVendor.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={editorHeaderStyle}>
                    {selectedVendor.name.trim() || "Vendor"}
                  </h3>
                  <p style={mutedSmallStyle}>
                    {selectedVendor.category || "Uncategorized"}
                  </p>
                </div>
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      void pasteLinkedPhoto(
                        "Vendor",
                        selectedVendor.id,
                        selectedVendor.name,
                        "Vendor Logo",
                      )
                    }
                    style={secondaryButtonStyle}
                  >
                    Paste Logo
                  </button>
                  <label style={compactUploadButtonStyle}>
                    {selectedVendorLogo ? "Change Logo" : "Add Logo"}
                    <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void addLinkedPhotoFiles(
                        "Vendor",
                        selectedVendor.id,
                        selectedVendor.name,
                        event.currentTarget.files,
                        "Vendor Logo",
                      );
                      event.currentTarget.value = "";
                    }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {selectedVendorLogo ? (
                    <button
                      type="button"
                      onClick={() => void deleteLinkedImage(selectedVendorLogo)}
                      style={dangerButtonStyle}
                    >
                      Delete Logo
                    </button>
                  ) : null}
                </div>
              </div>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Vendor Information</div>
                <div style={formGridStyle}>
                  <Field
                    label="Name"
                    value={selectedVendor.name}
                    onChange={(value) =>
                      setVendorRecords((current) =>
                        byName(
                          current.map((item) =>
                            item.id === selectedVendor.id
                              ? normalizeVendor({
                                  ...item,
                                  name: value,
                                })
                              : item,
                          ),
                        ),
                      )
                    }
                  />
                  <Field
                    label="Category"
                    value={selectedVendor.category}
                    onChange={(value) =>
                      setVendorRecords((current) =>
                        byName(
                          current.map((item) =>
                            item.id === selectedVendor.id
                              ? normalizeVendor({
                                  ...item,
                                  category: value,
                                })
                              : item,
                          ),
                        ),
                      )
                    }
                  />
                  <Field
                    label="Phone"
                    value={selectedVendor.phone ?? ""}
                    onChange={(value) => updateVendor({ phone: value })}
                  />
                  <Field
                    label="Email"
                    value={selectedVendor.email ?? ""}
                    onChange={(value) => updateVendor({ email: value })}
                  />
                  <Field
                    label="Website"
                    value={selectedVendor.website ?? ""}
                    onChange={(value) => updateVendor({ website: value })}
                  />
                  <Field
                    label="Notes"
                    value={selectedVendor.notes}
                    onChange={(value) => updateVendor({ notes: value })}
                    multiline
                  />
                </div>

                <div style={buttonRowStyle}>
                  {isRecordDirty("vendor", selectedVendor.id) ? (
                    <button
                      type="button"
                      onClick={() =>
                        void saveDirtyRecord(
                          "vendors",
                          selectedVendor,
                          "vendor",
                          selectedVendor.id,
                        )
                      }
                      style={goldButtonStyle}
                    >
                      Save Vendor
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void deleteVendorRecord(selectedVendor)}
                    style={dangerButtonStyle}
                  >
                    Delete Vendor
                  </button>
                </div>
              </section>

              <section style={detailSectionStyle}>
                <div style={detailSectionHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>Photos</div>
                    <strong>{selectedVendorPhotos.length} attached</strong>
                  </div>
                  <div style={buttonRowStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        void pasteLinkedPhoto(
                          "Vendor",
                          selectedVendor.id,
                          selectedVendor.name,
                        )
                      }
                      style={secondaryButtonStyle}
                    >
                      Paste Image
                    </button>
                    <label style={compactUploadButtonStyle}>
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={(event) => {
                          void addLinkedPhotoFiles(
                            "Vendor",
                          selectedVendor.id,
                          selectedVendor.name,
                          event.currentTarget.files,
                        );
                          event.currentTarget.value = "";
                        }}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                {selectedVendorPhotos.length ? (
                  <div style={photoGridStyle}>
                    {selectedVendorPhotos.map((file) => (
                      <div key={file.id} style={photoManageCardStyle}>
                        <button
                          type="button"
                          onClick={() => openUploadedFile(file)}
                          style={compactPhotoButtonStyle}
                        >
                          <img
                            src={file.dataUrl || file.url}
                            alt={file.name}
                            style={photoStyle}
                          />
                          <strong>{file.name}</strong>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteLinkedImage(file)}
                          style={photoDeleteButtonStyle}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    No vendor photos attached yet. You can also click this panel and paste a copied image.
                  </p>
                )}
              </section>

              <section style={detailSectionStyle}>
                <div style={eyebrowStyle}>Related Assets</div>
                {relatedVendorAssets.length ? (
                  <div style={compactLinkedListStyle}>
                    {relatedVendorAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setScreen("assets");
                        }}
                        style={compactLinkedRowStyle}
                      >
                        <span>
                          <strong>{asset.name}</strong>
                          <small style={mutedSmallStyle}>
                            {asset.category}
                          </small>
                        </span>
                        <span style={badgeStyle(asset.status)}>
                          {asset.status}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={mutedSmallStyle}>
                    No assets currently list this vendor.
                  </p>
                )}
              </section>

              {renderLinkedDocuments("Vendor", selectedVendor.id)}
            </div>
          ) : (
            <div style={noticeStyle}>
              <strong>Select a vendor.</strong>
              <p style={mutedSmallStyle}>
                Open a vendor to see contact information, logo, photos,
                related assets, and documents.
              </p>
            </div>
          )
        }
      />
    );
  }

  function renderWorkOrders() {
    return (
      <AtlasWorkOrders
        ListDrawerLayout={ListDrawerLayout}
        Field={Field}
        SelectField={SelectField}
        isMobile={isMobile}
        addWorkOrder={addWorkOrder}
        goldButtonStyle={goldButtonStyle}
        stackStyle={stackStyle}
        eyebrowStyle={eyebrowStyle}
        serviceRecords={serviceRecords}
        colors={colors}
        filteredServices={filteredServices}
        listStyle={listStyle}
        setSelectedServiceId={setSelectedServiceId}
        rowButtonStyle={rowButtonStyle}
        selectedService={selectedService}
        mutedSmallStyle={mutedSmallStyle}
        formatDate={formatDate}
        assetName={assetName}
        vendorName={vendorName}
        recurrenceLabel={recurrenceLabel}
        workOrderListBadgesStyle={workOrderListBadgesStyle}
        recurringBadgeStyle={recurringBadgeStyle}
        badgeStyle={badgeStyle}
        noticeStyle={noticeStyle}
        editorHeaderStyle={editorHeaderStyle}
        detailSectionStyle={detailSectionStyle}
        formGridStyle={formGridStyle}
        updateWorkOrder={updateWorkOrder}
        fieldLabelStyle={fieldLabelStyle}
        inputStyle={inputStyle}
        byName={byName}
        assetRecords={assetRecords}
        vendorRecords={vendorRecords}
        locationRecords={locations}
        contactRecords={contactRecords}
        procedureRecords={procedureRecords}
        documentRecords={intakeDocs}
        calendarItems={calendarItems}
        weatherDays={weatherDays}
        detailSectionHeaderStyle={detailSectionHeaderStyle}
        recurrenceToggleStyle={recurrenceToggleStyle}
        recurrenceGridStyle={recurrenceGridStyle}
        recurrenceHistoryStyle={recurrenceHistoryStyle}
        buttonRowStyle={buttonRowStyle}
        isRecordDirty={isRecordDirty}
        saveWorkOrderRecord={saveWorkOrderRecord}
        completeWorkOrder={completeWorkOrder}
        secondaryButtonStyle={secondaryButtonStyle}
        deleteWorkOrderRecord={deleteWorkOrderRecord}
        dangerButtonStyle={dangerButtonStyle}
        renderLinkedDocuments={renderLinkedDocuments}
      />
    );
  }

  function renderCalendar() {
    return (
      <AtlasCalendar
        Field={Field}
        ListDrawerLayout={ListDrawerLayout}
        addCalendarItem={addCalendarItem}
        applyCalendarIntake={applyCalendarIntake}
        assetRecords={assetRecords}
        blankCalendarItem={blankCalendarItem}
        buttonRowStyle={buttonRowStyle}
        byName={byName}
        byTitle={byTitle}
        calendarCategoryFilters={calendarCategoryFilters}
        calendarCellStyle={calendarCellStyle}
        calendarColorDotStyle={calendarColorDotStyle}
        calendarColors={calendarColors}
        calendarColorsBoxStyle={calendarColorsBoxStyle}
        calendarCompactCellStyle={calendarCompactCellStyle}
        calendarCompactControlPanelStyle={calendarCompactControlPanelStyle}
        calendarCompactMoreStyle={calendarCompactMoreStyle}
        calendarCompactPillStyle={calendarCompactPillStyle}
        calendarControlPanelStyle={calendarControlPanelStyle}
        calendarCursor={calendarCursor}
        calendarDayNameStyle={calendarDayNameStyle}
        calendarDoneBadgeStyle={calendarDoneBadgeStyle}
        calendarDoneMiniStyle={calendarDoneMiniStyle}
        calendarFilterDropdownStyle={calendarFilterDropdownStyle}
        calendarFilterLabels={calendarFilterLabels}
        calendarFilterListItemStyle={calendarFilterListItemStyle}
        calendarFilterListStyle={calendarFilterListStyle}
        calendarFilterSummaryStyle={calendarFilterSummaryStyle}
        calendarGridStyle={calendarGridStyle}
        calendarHeaderStyle={calendarHeaderStyle}
        calendarIntakeMessage={calendarIntakeMessage}
        calendarIntakeText={calendarIntakeText}
        calendarMonthWhitePanelStyle={calendarMonthWhitePanelStyle}
        calendarMoreStyle={calendarMoreStyle}
        calendarNavyShellStyle={calendarNavyShellStyle}
        calendarPillContentStyle={calendarPillContentStyle}
        calendarPillStyle={calendarPillStyle}
        calendarPlainColors={calendarPlainColors}
        calendarSelectedEventRowStyle={calendarSelectedEventRowStyle}
        calendarTodayBoxStyle={calendarTodayBoxStyle}
        calendarTodayItemStyle={calendarTodayItemStyle}
        calendarView={calendarView}
        calendarWeatherIconStyle={calendarWeatherIconStyle}
        calendarWeekStyle={calendarWeekStyle}
        calendarWhiteDrawerStyle={calendarWhiteDrawerStyle}
        calendarWhitePanelStyle={calendarWhitePanelStyle}
        categoryToColorId={categoryToColorId}
        checkboxLineStyle={checkboxLineStyle}
        colorForEvent={colorForEvent}
        colors={colors}
        compactAddBoxStyle={compactAddBoxStyle}
        dangerButtonStyle={dangerButtonStyle}
        deleteCalendarItem={deleteCalendarItem}
        editorHeaderStyle={editorHeaderStyle}
        expandedCalendarItems={expandedCalendarItems}
        eyebrowStyle={eyebrowStyle}
        fieldLabelStyle={fieldLabelStyle}
        formGridStyle={formGridStyle}
        formatDate={formatDate}
        goldButtonStyle={goldButtonStyle}
        inputStyle={inputStyle}
        isMobile={isMobile}
        linkTypeOptions={linkTypeOptions}
        locations={locations}
        monthCells={monthCells}
        monthName={monthName}
        moveCalendarPeriod={moveCalendarPeriod}
        moveCalendarYear={moveCalendarYear}
        mutedSmallStyle={mutedSmallStyle}
        openCalendarItem={openCalendarItem}
        reminderOptions={reminderOptions}
        repeatOptions={repeatOptions}
        saveCalendarItem={saveCalendarItem}
        secondaryButtonStyle={secondaryButtonStyle}
        selectedCalendar={selectedCalendar}
        selectedCalendarDate={selectedCalendarDate}
        selectedCalendarId={selectedCalendarId}
        selectedDayEvents={selectedDayEvents}
        serviceRecords={serviceRecords}
        setCalendarCategoryFilters={setCalendarCategoryFilters}
        setCalendarCursor={setCalendarCursor}
        setCalendarDraft={setCalendarDraft}
        setCalendarIntakeMessage={setCalendarIntakeMessage}
        setCalendarIntakeText={setCalendarIntakeText}
        setCalendarView={setCalendarView}
        setSelectedCalendarDate={setSelectedCalendarDate}
        setSelectedCalendarId={setSelectedCalendarId}
        setShowJewishHolidays={setShowJewishHolidays}
        setShowUsHolidays={setShowUsHolidays}
        showCalendarSave={showCalendarSave}
        showJewishHolidays={showJewishHolidays}
        showUsHolidays={showUsHolidays}
        stackStyle={stackStyle}
        standardCalendarCategoryLabels={standardCalendarCategoryLabels}
        todayISO={todayISO}
        updateCalendarItem={updateCalendarItem}
        vendorRecords={vendorRecords}
        weatherByDate={weatherByDate}
        weatherIcon={weatherIcon}
        weatherText={weatherText}
        weekCells={weekCells}
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
          right={
            <button
              type="button"
              onClick={() => void loadWeather()}
              style={goldButtonStyle}
            >
              Refresh Weather
            </button>
          }
        />

        <div style={stackStyle}>
          <div style={noticeStyle}>
            <strong>{weatherStatus}</strong>
            <p style={mutedSmallStyle}>
              Forecast location is the 2000 area. Uses rain chance, rain amount,
              wind, and ET0 for irrigation planning.
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
                  borderColor:
                    day.date === selectedWeather?.date
                      ? colors.gold
                      : colors.line,
                  boxShadow:
                    day.date === selectedWeather?.date
                      ? "0 18px 38px rgba(201,154,61,0.24)"
                      : "0 12px 26px rgba(15,23,42,0.06)",
                }}
              >
                <div style={weatherCardTopStyle}>
                  <div>
                    <strong>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                        undefined,
                        { weekday: "short" },
                      )}
                    </strong>
                    <p style={mutedSmallStyle}>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                    </p>
                  </div>
                  <div style={weatherIconStyle}>{weatherIcon(day.code)}</div>
                </div>

                <div style={weatherTempStyle}>{day.high}°</div>
                <div style={weatherLowStyle}>{day.low}° low</div>

                <div style={weatherBarTrackStyle}>
                  <div
                    style={{
                      ...weatherBarFillStyle,
                      width: `${Math.max(12, Math.min(100, day.precipChance))}%`,
                    }}
                  />
                </div>

                <div style={weatherMiniGridStyle}>
                  <span>Rain {day.precipChance}%</span>
                  <span>{day.precipAmount}"</span>
                  <span>Wind {day.windMax} mph</span>
                  <span>ET0 {day.et0}"</span>
                </div>

                <p style={weatherAdviceSmallStyle}>{irrigationAdvice(day)}</p>
              </button>
            ))}
          </div>

          {selectedWeather ? (
            <section style={weatherDetailPanelStyle}>
              <div style={weatherDetailHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>Selected Day</div>
                  <h3 style={weatherDetailTitleStyle}>
                    {new Date(
                      `${selectedWeather.date}T12:00:00`,
                    ).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <p style={weatherDetailConditionStyle}>
                    {weatherText(selectedWeather.code)}
                  </p>
                </div>
                <div style={weatherDetailIconStyle}>
                  {weatherIcon(selectedWeather.code)}
                </div>
              </div>

              <div style={weatherDetailGridStyle}>
                <div style={weatherDetailMetricStyle}>
                  <span>High</span>
                  <strong>{selectedWeather.high}°F</strong>
                </div>
                <div style={weatherDetailMetricStyle}>
                  <span>Low</span>
                  <strong>{selectedWeather.low}°F</strong>
                </div>
                <div style={weatherDetailMetricStyle}>
                  <span>Rain chance</span>
                  <strong>{selectedWeather.precipChance}%</strong>
                </div>
                <div style={weatherDetailMetricStyle}>
                  <span>Expected rain</span>
                  <strong>{selectedWeather.precipAmount}"</strong>
                </div>
                <div style={weatherDetailMetricStyle}>
                  <span>Maximum wind</span>
                  <strong>{selectedWeather.windMax} mph</strong>
                </div>
                <div style={weatherDetailMetricStyle}>
                  <span>Water loss / ET0</span>
                  <strong>{selectedWeather.et0}"</strong>
                </div>
              </div>

              <div style={weatherDetailNotesGridStyle}>
                <div style={weatherDetailNoteStyle}>
                  <strong>Irrigation</strong>
                  <p>{irrigationAdvice(selectedWeather)}</p>
                </div>
                <div style={weatherDetailNoteStyle}>
                  <strong>Workday planning</strong>
                  <p>{weatherDayPlanning(selectedWeather)}</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    );
  }

  function renderManuals() {
    const normalizedSearch = manualSearch.trim().toLowerCase();

    const filteredManuals = [...allManualRecords]
      .filter((manual) => {
        if (!normalizedSearch) return true;
        return [
          manual.title,
          manual.linkedAssetName,
          manual.manufacturer,
          manual.model,
          manual.documentNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    function startNewManual() {
      setSelectedManualId("");
      setManualDraft(blankManual());
      setManualAddOpen(true);
      setManualMessage("");
    }

    function updateManualDraft(patch: Partial<ManualRecord>) {
      setManualDraft((current) =>
        normalizeManualRecord({ ...current, ...patch, id: "" }),
      );
    }

    async function saveManual() {
      const prepared = normalizeManualRecord({
        ...manualDraft,
        id: `manual-${Date.now()}`,
        linkedAssetName:
          assetRecords.find((asset) => asset.id === manualDraft.linkedAssetId)
            ?.name ||
          manualDraft.linkedAssetName ||
          "",
      });

      if (!prepared.title.trim()) {
        setManualMessage("Add a manual title before saving.");
        return;
      }

      const next = [prepared, ...manualRecords];
      setManualRecords(next);
      saveStoredArray(storageKeys.manuals[0], next);

      const linkedAsset = prepared.linkedAssetId
        ? assetRecords.find(
            (asset) => asset.id === prepared.linkedAssetId,
          )
        : undefined;
      const documentRecord = normalizeDocument({
        id: uid("doc"),
        title: prepared.title,
        area: linkedAsset
          ? locationName(linkedAsset.locationId)
          : prepared.linkedAssetName || "General",
        type: prepared.category,
        targetType: linkedAsset ? "Asset" : "General",
        targetId: linkedAsset?.id || "",
        targetName: linkedAsset?.name || "General",
        linkedAssetId: linkedAsset?.id,
        notes: [
          prepared.manufacturer
            ? `Manufacturer: ${prepared.manufacturer}`
            : "",
          prepared.model ? `Model: ${prepared.model}` : "",
          prepared.documentNumber
            ? `Document number: ${prepared.documentNumber}`
            : "",
          prepared.sourceLabel
            ? `Source: ${prepared.sourceLabel}`
            : "",
          prepared.notes,
        ]
          .filter(Boolean)
          .join("\n"),
        href: prepared.href,
        files: prepared.files,
        createdAt: prepared.createdAt,
      });

      replaceDocumentInVault(documentRecord);
      try {
        await postDocumentToAtlasVault(documentRecord);
        setManualMessage("Manual saved and synced to Atlas.");
      } catch {
        setManualMessage(
          "Manual saved on this browser. Atlas document sync did not complete.",
        );
      }

      setManualDraft(blankManual());
      setManualAddOpen(false);
    }

    async function addManualFiles(fileList: FileList | null) {
      if (!fileList?.length) return;
      const records = await Promise.all(
        Array.from(fileList).map(fileToUploadedRecord),
      );
      updateManualDraft({
        files: [...(manualDraft.files || []), ...records],
      });
    }

    return (
      <ListDrawerLayout
        eyebrow="Manual Library"
        title="Manuals"
        detail="Manuals listed alphabetically with their attached asset and a direct Open button."
        isMobile={isMobile}
        drawerResetKey={selectedManualId || "manual-new"}
        right={
          <>
            <button
              type="button"
              onClick={() => setScreen("documents")}
              style={secondaryButtonStyle}
            >
              Back to Documents
            </button>
            <button
              type="button"
              onClick={startNewManual}
              style={goldButtonStyle}
            >
              Add Manual
            </button>
          </>
        }
        list={
          <div style={stackStyle}>
            <div style={cardStyle}>
              <input
                value={manualSearch}
                onChange={(event) =>
                  setManualSearch(event.currentTarget.value)
                }
                placeholder="Search manuals or assets..."
                style={inputStyle}
              />
            </div>

            {manualAddOpen ? (
              <div style={cardStyle}>
                <div style={manualInlineFormHeaderStyle}>
                  <strong>Add Manual</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setManualAddOpen(false);
                      setManualDraft(blankManual());
                      setManualMessage("");
                    }}
                    style={smallSubtleButtonStyle}
                  >
                    Close
                  </button>
                </div>

                {manualMessage ? (
                  <p style={mutedSmallStyle}>{manualMessage}</p>
                ) : null}

                <div style={formGridStyle}>
                  <Field
                    label="Manual title"
                    value={manualDraft.title}
                    onChange={(title) => updateManualDraft({ title })}
                    placeholder="Official manual title"
                  />

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={fieldLabelStyle}>Attached asset</span>
                    <select
                      value={manualDraft.linkedAssetId || ""}
                      onChange={(event) => {
                        const asset = assetRecords.find(
                          (item) => item.id === event.currentTarget.value,
                        );
                        updateManualDraft({
                          linkedAssetId: event.currentTarget.value,
                          linkedAssetName: asset?.name || "",
                        });
                      }}
                      style={inputStyle}
                    >
                      <option value="">Not linked</option>
                      {byName(assetRecords).map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Field
                    label="PDF / manual link"
                    value={manualDraft.href}
                    onChange={(href) => updateManualDraft({ href })}
                    placeholder="Paste the online PDF URL"
                  />

                  <Field
                    label="Manufacturer"
                    value={manualDraft.manufacturer}
                    onChange={(manufacturer) =>
                      updateManualDraft({ manufacturer })
                    }
                  />

                  <Field
                    label="Model"
                    value={manualDraft.model}
                    onChange={(model) => updateManualDraft({ model })}
                  />

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={fieldLabelStyle}>Upload PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) =>
                        void addManualFiles(event.currentTarget.files)
                      }
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div style={{ ...buttonRowStyle, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => void saveManual()}
                    style={goldButtonStyle}
                  >
                    Save Manual
                  </button>
                </div>
              </div>
            ) : null}

            <div style={manualSimpleTableStyle}>
              <div style={manualListHeaderStyle}>
                <span>Manual</span>
                <span>Asset</span>
                <span>Actions</span>
              </div>

              {filteredManuals.length ? (
                <div style={manualCompactListStyle}>
                  {filteredManuals.map((manual) => {
                    const manualOpenUrl = openManualUrl(manual);

                    return (
                      <div key={manual.id} style={manualSimpleRowStyle}>
                        <span style={manualSimpleTitleStyle}>
                          {manual.title}
                        </span>

                        <span style={manualCompactAssetStyle}>
                          {manual.linkedAssetName || "Not linked"}
                        </span>

                        <div style={manualActionRowStyle}>
                          {manualOpenUrl ? (
                            <a
                              href={manualOpenUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={manualCompactFileStyle}
                              aria-label={`Open ${manual.title}`}
                            >
                              Open
                            </a>
                          ) : (
                            <span style={manualNoPdfStyle}>—</span>
                          )}
                          <button
                            type="button"
                            onClick={() => void deleteManualRecord(manual)}
                            style={manualDeleteButtonStyle}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ ...mutedSmallStyle, padding: 16 }}>
                  No manuals match this search.
                </p>
              )}
            </div>
          </div>
        }
        drawer={undefined}
      />
    );
  }

  function renderDocuments() {
    const normalizedDocumentSearch = documentSearch.trim().toLowerCase();
    const sortedDocuments = [...allDocuments].sort(
      (a, b) =>
        a.title.localeCompare(b.title) ||
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
    const searchableDocuments = sortedDocuments.filter((doc) => {
      if (!normalizedDocumentSearch) return true;
      const fileNames = (doc.files || []).map((file) => file.name).join(" ");
      return [
        doc.title,
        doc.type,
        doc.area,
        doc.targetType,
        doc.targetName,
        doc.notes,
        doc.pastedText,
        fileNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedDocumentSearch);
    });

    const selectedDocument =
      searchableDocuments.find((doc) => doc.id === selectedDocumentId) || null;
    const selectedTargetKind = (selectedDocument?.targetType ||
      "General") as IntakeTargetKind;
    const selectedTargetOptions = documentTargetOptionsFor(selectedTargetKind);

    function retargetSelectedDocument(kind: IntakeTargetKind) {
      if (!selectedDocument) return;
      const options = documentTargetOptionsFor(kind);
      const nextId = kind === "General" ? "" : options[0]?.id || "";
      const nextName = targetNameFor(kind, nextId);
      updateSelectedDocument(selectedDocument.id, {
        targetType: kind,
        targetId: nextId,
        targetName: nextName,
        area: nextName,
        linkedAssetId: kind === "Asset" ? nextId : undefined,
        linkedVendorId: kind === "Vendor" ? nextId : undefined,
      });
    }

    function retargetSelectedRecord(id: string) {
      if (!selectedDocument) return;
      const nextName = targetNameFor(selectedTargetKind, id);
      updateSelectedDocument(selectedDocument.id, {
        targetId: id,
        targetName: nextName,
        area: nextName,
        linkedAssetId: selectedTargetKind === "Asset" ? id : undefined,
        linkedVendorId: selectedTargetKind === "Vendor" ? id : undefined,
      });
    }

    return (
      <ListDrawerLayout
        eyebrow="Document Vault"
        title="Documents / Photos"
        detail="Search, open, edit, delete, zoom, and sync paperwork, photos, scans, PDFs, receipts, invoices, notes, and screenshots between phone and desktop."
        isMobile={isMobile}
        drawerResetKey={selectedDocumentId || "document-new"}
        right={
          <>
            <button
              type="button"
              onClick={() => setScreen("manuals")}
              style={secondaryButtonStyle}
            >
              Manual Library
            </button>
            <button
              type="button"
              onClick={() => setScreen("intake")}
              style={goldButtonStyle}
            >
              Add Document
            </button>
          </>
        }
        list={
          <div style={stackStyle}>
            <div style={cardStyle}>
              <div style={eyebrowStyle}>Look Up Documents</div>
              <input
                value={documentSearch}
                onChange={(event) =>
                  setDocumentSearch(event.currentTarget.value)
                }
                placeholder="Search title, vendor, asset, notes, file name..."
                style={inputStyle}
              />
              <div style={{ ...buttonRowStyle, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => void refreshDocumentVault()}
                  style={secondaryButtonStyle}
                >
                  Refresh Vault
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("intake")}
                  style={goldButtonStyle}
                >
                  Add Document
                </button>
              </div>
              <p style={mutedSmallStyle}>
                {searchableDocuments.length} matching document(s), sorted A–Z.
              </p>
              <p style={mutedSmallStyle}>{documentSyncStatus}</p>
            </div>

            {!searchableDocuments.length ? (
              <div style={noticeStyle}>
                <strong>No saved documents found.</strong>
                <p style={mutedSmallStyle}>
                  Use Add Document to take a phone photo, upload a PDF/image, or
                  paste notes and link them to an Atlas record.
                </p>
                <button
                  type="button"
                  onClick={() => setScreen("intake")}
                  style={goldButtonStyle}
                >
                  Add Document
                </button>
              </div>
            ) : (
              <div style={listStyle}>
                {searchableDocuments.map((document) => {
                  const fileCount = (document.files || []).length;
                  const hasPreview =
                    fileCount > 0 ||
                    Boolean(document.pastedText || document.href);
                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      style={{
                        ...rowButtonStyle,
                        borderColor:
                          selectedDocument?.id === document.id
                            ? colors.gold
                            : colors.line,
                        boxShadow:
                          selectedDocument?.id === document.id
                            ? "0 14px 30px rgba(201,154,61,0.18)"
                            : rowButtonStyle.boxShadow,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{document.title}</strong>
                        <p style={mutedSmallStyle}>
                          {document.type} · {document.area}
                        </p>
                        {document.targetType ? (
                          <p style={mutedSmallStyle}>
                            Linked to {document.targetType}:{" "}
                            {document.targetName || document.area}
                          </p>
                        ) : null}
                        <p style={mutedSmallStyle}>
                          {hasPreview
                            ? `${fileCount} file(s) / preview available`
                            : "Text-only record"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        }
        drawer={
          <div>
            {selectedDocument ? (
              <div style={stackStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <h3 style={editorHeaderStyle}>
                      {selectedDocument.title.trim() || "Document"}
                    </h3>
                    <p style={mutedSmallStyle}>
                      {selectedDocument.createdAt
                        ? `Saved ${new Date(selectedDocument.createdAt).toLocaleString()}`
                        : "Saved document"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void deleteSelectedDocument(selectedDocument)
                    }
                    style={tinyDangerButtonStyle}
                    title="Delete document"
                  >
                    × Delete
                  </button>
                </div>

                <div style={formGridStyle}>
                  <Field
                    label="Title"
                    value={selectedDocument.title}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        title: value,
                      })
                    }
                  />
                  <Field
                    label="Type"
                    value={selectedDocument.type}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        type: value,
                      })
                    }
                    placeholder="Invoice, Manual, Photo, Receipt, Estimate..."
                  />
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Linked section</span>
                    <select
                      value={selectedTargetKind}
                      onChange={(event) =>
                        retargetSelectedDocument(
                          event.currentTarget.value as IntakeTargetKind,
                        )
                      }
                      style={inputStyle}
                    >
                      {(
                        [
                          "Asset",
                          "Location",
                          "Vendor",
                          "Work Order",
                          "Map Label",
                          "General",
                        ] as IntakeTargetKind[]
                      ).map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedTargetKind !== "General" ? (
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Linked record</span>
                      <select
                        value={selectedDocument.targetId || ""}
                        onChange={(event) =>
                          retargetSelectedRecord(event.currentTarget.value)
                        }
                        style={inputStyle}
                      >
                        {selectedTargetOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <Field
                    label="Notes"
                    value={selectedDocument.notes || ""}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        notes: value,
                      })
                    }
                    multiline
                    placeholder="What is this, why it matters, follow-up needed..."
                  />
                  <Field
                    label="Pasted text / copied paperwork"
                    value={selectedDocument.pastedText || ""}
                    onChange={(value) =>
                      updateSelectedDocument(selectedDocument.id, {
                        pastedText: value,
                      })
                    }
                    multiline
                    placeholder="Paste copied text, email content, invoice notes, serial info, etc."
                  />
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() => void saveSelectedDocument(selectedDocument)}
                    style={goldButtonStyle}
                  >
                    Save Changes
                  </button>
                  {selectedDocument.targetType &&
                  selectedDocument.targetType !== "General" ? (
                    <button
                      type="button"
                      onClick={() => openDocumentTarget(selectedDocument)}
                      style={secondaryButtonStyle}
                    >
                      Open Linked Record
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedDocumentId("")}
                    style={secondaryButtonStyle}
                  >
                    Close
                  </button>
                </div>

                {selectedDocument.files?.length ? (
                  <div>
                    <div style={eyebrowStyle}>Files</div>
                    <div style={photoGridStyle}>
                      {selectedDocument.files.map((file) => (
                        <div key={file.id} style={photoCardStyle}>
                          <button
                            type="button"
                            onClick={() => openUploadedFile(file)}
                            style={{
                              border: 0,
                              background: "transparent",
                              padding: 0,
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            {file.dataUrl?.startsWith("data:image/") ? (
                              <img
                                src={file.dataUrl}
                                alt={file.name}
                                style={photoStyle}
                              />
                            ) : (
                              <div style={fileTileStyle}>
                                {file.type?.includes("pdf") ? "PDF" : "FILE"}
                              </div>
                            )}
                            <strong>{file.name}</strong>
                            <span style={mutedSmallStyle}>
                              Open zoom preview
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedDocument(selectedDocument.id, {
                                files: (selectedDocument.files || []).filter(
                                  (item) => item.id !== file.id,
                                ),
                              })
                            }
                            style={tinyDangerButtonStyle}
                          >
                            Remove file
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={noticeStyle}>
                    <strong>No file attached.</strong>
                    <p style={mutedSmallStyle}>
                      This record can still hold notes/pasted text. Add a new
                      document if you need to attach a photo, PDF, or file.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={noticeStyle}>
                <strong>Select a document from the list.</strong>
                <p style={mutedSmallStyle}>
                  After you save a new upload, this info area closes so it is
                  ready for the next item. Click any document to view, edit,
                  zoom, or delete it.
                </p>
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() => setScreen("intake")}
                    style={goldButtonStyle}
                  >
                    Add Document
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshDocumentVault()}
                    style={secondaryButtonStyle}
                  >
                    Refresh Vault
                  </button>
                </div>
              </div>
            )}
          </div>
        }
      />
    );
  }

  async function createInboxItemFromDraft() {
    if (!intakeFiles.length && !intakePastedText.trim() && !intakeNotes.trim()) {
      setIntakeMessage("Add a file, pasted text, or notes before saving to the Inbox.");
      return;
    }

    const title =
      intakeTitle.trim() ||
      fastIntakeRecordName.trim() ||
      intakeFiles[0]?.name?.replace(/\.[^.]+$/, "") ||
      intakePastedText.trim().slice(0, 48) ||
      "Untitled Inbox item";

    setIntakeMessage("Saving to the permanent Atlas Inbox...");

    try {
      const response = await fetch("/api/atlas-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          intakeType: fastIntakeKind,
          status: "New",
          source: "Fast Intake",
          notes: intakeNotes.trim(),
          pastedText: intakePastedText.trim(),
          files: intakeFiles,
          targetType: intakeTargetKind,
          targetId: intakeTargetKind === "General" ? "" : intakeTargetId,
          targetName: targetNameFor(intakeTargetKind, intakeTargetId),
          proposedAction: fastIntakeSaveMode,
          extractedData: {},
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Inbox save failed.");
      }

      const saved = payload.item as InboxItemRecord;
      setInboxItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelectedInboxId(saved.id);
      setIntakeMessage("Saved to Atlas Inbox. Nothing else was changed.");
      resetIntakeDraft();
      setScreen("inbox");
    } catch (error) {
      setIntakeMessage(error instanceof Error ? error.message : "Inbox save failed.");
    }
  }

  async function updateInboxItem(
    id: string,
    patch: Partial<InboxItemRecord>,
  ) {
    setInboxMessage("Saving Inbox item...");
    try {
      const response = await fetch("/api/atlas-inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Inbox update failed.");
      }
      const saved = payload.item as InboxItemRecord;
      setInboxItems((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setInboxMessage("Inbox item saved.");
    } catch (error) {
      setInboxMessage(error instanceof Error ? error.message : "Inbox update failed.");
    }
  }

  async function deleteInboxItem(item: InboxItemRecord) {
    if (!window.confirm(`Delete \"${item.title}\" from the Atlas Inbox?`)) return;

    setInboxMessage("Deleting Inbox item...");
    try {
      const response = await fetch("/api/atlas-inbox", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Inbox delete failed.");
      }
      setInboxItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelectedInboxId((current) => (current === item.id ? "" : current));
      setInboxMessage("Inbox item deleted.");
    } catch (error) {
      setInboxMessage(error instanceof Error ? error.message : "Inbox delete failed.");
    }
  }

  function inboxAnalysisText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
  }

  function inboxAnalysisTokens(value: string) {
    return Array.from(
      new Set(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .split(" ")
          .map((token) => token.trim())
          .filter((token) => token.length >= 3),
      ),
    );
  }

  function firstInboxMatch(text: string, pattern: RegExp) {
    const match = text.match(pattern);
    return match?.[1]?.trim() || "";
  }

  function buildInboxReviewDraft(data: Record<string, unknown>): InboxReviewDraft {
    const readingData = (data.readings || {}) as Record<string, unknown>;
    return {
      documentType: inboxAnalysisText(data.documentType) || inboxAnalysisText(data.type),
      summary: inboxAnalysisText(data.summary),
      manufacturer: inboxAnalysisText(data.manufacturer),
      model: inboxAnalysisText(data.model),
      serial: inboxAnalysisText(data.serial),
      invoiceNumber: inboxAnalysisText(data.invoiceNumber),
      amount: inboxAnalysisText(data.amount),
      date: inboxAnalysisText(data.date),
      psi: inboxAnalysisText(readingData.psi),
      temperature: inboxAnalysisText(readingData.temperature),
      ph: inboxAnalysisText(readingData.ph),
      hours: inboxAnalysisText(readingData.hours),
      assetId: "",
      locationId: "",
      vendorId: "",
      workOrderId: "",
      notes: "",
    };
  }

  function openInboxReview(item: InboxItemRecord) {
    setSelectedInboxId(item.id);
    setInboxReviewDraft(buildInboxReviewDraft((item.extractedData || {}) as Record<string, unknown>));
    setInboxReviewOpen(true);
  }

  async function analyzeInboxItem(item: InboxItemRecord) {
    if (analyzingInboxId) return;

    const usableFiles = (item.files || [])
      .filter((file) => Boolean(file.dataUrl || file.url))
      .slice(0, 3)
      .map((file) => ({
        name: file.name,
        type: file.type || "application/octet-stream",
        dataUrl: file.dataUrl || "",
        url: file.url || "",
      }));

    const fileNames = usableFiles.map((file) => file.name).join("\n");
    const existingText = [item.title, item.notes, item.pastedText, fileNames]
      .filter(Boolean)
      .join("\n");

    if (!existingText.trim() && !usableFiles.length) {
      setInboxMessage("Add a file, title, notes, or pasted text before analyzing.");
      return;
    }

    setAnalyzingInboxId(item.id);
    setInboxReviewDraft(buildInboxReviewDraft((item.extractedData || {}) as Record<string, unknown>));
    setInboxReviewOpen(true);
    setInboxMessage("Atlas is reading the selected file and preparing suggestions...");

    let visionData: Record<string, unknown> = {};
    try {
      const response = await fetch("/api/atlas-inbox-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: {
            id: item.id,
            title: item.title,
            intakeType: item.intakeType,
            notes: item.notes,
            pastedText: item.pastedText,
            files: usableFiles,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Photo/PDF analysis failed.");
      }
      visionData = (payload.analysis || {}) as Record<string, unknown>;
    } catch (error) {
      setInboxMessage(
        error instanceof Error ? error.message : "Photo/PDF analysis failed.",
      );
      setAnalyzingInboxId("");
      return;
    }

    const aiReadings = (visionData.readings || {}) as Record<string, unknown>;
    const rawText = inboxAnalysisText(visionData.rawText);
    const combinedText = [
      existingText,
      rawText,
      inboxAnalysisText(visionData.manufacturer),
      inboxAnalysisText(visionData.model),
      inboxAnalysisText(visionData.serial),
      inboxAnalysisText(visionData.invoiceNumber),
      inboxAnalysisText(visionData.vendorName),
      inboxAnalysisText(visionData.assetName),
      inboxAnalysisText(visionData.locationName),
    ]
      .filter(Boolean)
      .join("\n");

    const serial =
      inboxAnalysisText(visionData.serial) ||
      firstInboxMatch(
        combinedText,
        /(?:serial(?:\s*(?:number|no\.?))?|s\s*\/\s*n|\bsn\b)\s*[:#-]?\s*([a-z0-9][a-z0-9._\/-]{3,})/i,
      );
    const model =
      inboxAnalysisText(visionData.model) ||
      firstInboxMatch(
        combinedText,
        /(?:model(?:\s*(?:number|no\.?))?|m\s*\/\s*n)\s*[:#-]?\s*([a-z0-9][a-z0-9._\/-]{2,})/i,
      );
    const invoiceNumber =
      inboxAnalysisText(visionData.invoiceNumber) ||
      firstInboxMatch(
        combinedText,
        /(?:invoice|inv(?:oice)?)(?:\s*(?:number|no\.?))?\s*[:#-]?\s*([a-z0-9][a-z0-9._\/-]{2,})/i,
      );
    const amount =
      inboxAnalysisText(visionData.amount) ||
      firstInboxMatch(combinedText, /(\$\s?\d[\d,]*(?:\.\d{2})?)/i);
    const date =
      inboxAnalysisText(visionData.date) ||
      firstInboxMatch(
        combinedText,
        /\b((?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12]\d|3[01])[\/-](?:19|20)?\d{2})\b/,
      );
    const psi =
      inboxAnalysisText(aiReadings.psi) ||
      firstInboxMatch(combinedText, /\b(\d+(?:\.\d+)?)\s*psi\b/i);
    const temperature =
      inboxAnalysisText(aiReadings.temperature) ||
      firstInboxMatch(
        combinedText,
        /\b(\d+(?:\.\d+)?)\s*(?:°\s*)?(?:f|fahrenheit)\b/i,
      );
    const ph =
      inboxAnalysisText(aiReadings.ph) ||
      firstInboxMatch(combinedText, /\bph\s*[:=]?\s*(\d+(?:\.\d+)?)\b/i);
    const hours =
      inboxAnalysisText(aiReadings.hours) ||
      firstInboxMatch(combinedText, /\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);

    const knownManufacturers = [
      "Viessmann", "Carrier", "Honeywell", "Mitsubishi", "Pentair",
      "Sundance", "Sunstream", "Bosch", "Electrolux", "Kohler",
      "Cobalt", "Sea-Doo", "Fisher & Paykel", "Desert Aire", "Hunter",
      "Hydrawise", "Starlink",
    ];
    const manufacturer =
      inboxAnalysisText(visionData.manufacturer) ||
      knownManufacturers.find((name) =>
        combinedText.toLowerCase().includes(name.toLowerCase()),
      ) || "";

    const sourceTokens = inboxAnalysisTokens(combinedText);
    const normalizedSerial = serial.toLowerCase();
    const normalizedModel = model.toLowerCase();

    const assetMatches = assetRecords
      .map((asset) => {
        const searchable = [asset.name, asset.make, asset.model, asset.serial, asset.category, asset.notes]
          .filter(Boolean).join(" ");
        const assetTokens = inboxAnalysisTokens(searchable);
        let score = sourceTokens.filter((token) => assetTokens.includes(token)).length;
        const reasons: string[] = [];
        if (normalizedSerial && asset.serial?.toLowerCase() === normalizedSerial) {
          score += 20; reasons.push("Exact serial number");
        }
        if (normalizedModel && asset.model?.toLowerCase().includes(normalizedModel)) {
          score += 10; reasons.push("Matching model");
        }
        if (manufacturer && asset.make?.toLowerCase().includes(manufacturer.toLowerCase())) {
          score += 6; reasons.push("Matching manufacturer");
        }
        if (combinedText.toLowerCase().includes(asset.name.toLowerCase())) {
          score += 8; reasons.push("Asset name appears in analysis");
        }
        return { asset, score, reasons };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);

    const vendorMatches = vendorRecords
      .map((vendor) => {
        const vendorText = [vendor.name, vendor.category, vendor.notes].filter(Boolean).join(" ");
        const vendorTokens = inboxAnalysisTokens(vendorText);
        let score = sourceTokens.filter((token) => vendorTokens.includes(token)).length;
        if (combinedText.toLowerCase().includes(vendor.name.toLowerCase())) score += 10;
        return { vendor, score };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score);

    const workOrderMatches = serviceRecords
      .map((workOrder) => {
        const workOrderText = [workOrder.title, workOrder.notes, workOrder.date].filter(Boolean).join(" ");
        const workOrderTokens = inboxAnalysisTokens(workOrderText);
        const score = sourceTokens.filter((token) => workOrderTokens.includes(token)).length;
        return { workOrder, score };
      })
      .filter((match) => match.score >= 2)
      .sort((a, b) => b.score - a.score);

    const bestAsset = assetMatches[0];
    const bestVendor = vendorMatches[0];
    const bestWorkOrder = workOrderMatches[0];
    const bestScore = Math.max(bestAsset?.score || 0, bestVendor?.score || 0, bestWorkOrder?.score || 0);
    const confidence = bestScore >= 20 ? "High" : bestScore >= 8 ? "Medium" : bestScore > 0 ? "Low" : "None";

    const suggestedMatch = bestAsset && bestAsset.score === bestScore
      ? { type: "Asset", id: bestAsset.asset.id, name: bestAsset.asset.name, confidence, reasons: bestAsset.reasons }
      : bestVendor && bestVendor.score === bestScore
        ? { type: "Vendor", id: bestVendor.vendor.id, name: bestVendor.vendor.name, confidence, reasons: ["Vendor name or related terms appear in analysis"] }
        : bestWorkOrder && bestWorkOrder.score === bestScore
          ? { type: "Work Order", id: bestWorkOrder.workOrder.id, name: bestWorkOrder.workOrder.title, confidence, reasons: ["Related work-order terms appear in analysis"] }
          : null;

    const extractedData: Record<string, unknown> = {
      ...visionData,
      analyzedAt: new Date().toISOString(),
      analyzer: "Atlas secure photo/PDF analyzer",
      manufacturer,
      model,
      serial,
      invoiceNumber,
      amount,
      date,
      readings: { psi, temperature, ph, hours },
      suggestedMatch,
      candidateAssets: assetMatches.slice(0, 3).map((match) => ({ id: match.asset.id, name: match.asset.name, score: match.score })),
      candidateVendors: vendorMatches.slice(0, 3).map((match) => ({ id: match.vendor.id, name: match.vendor.name, score: match.score })),
      candidateWorkOrders: workOrderMatches.slice(0, 3).map((match) => ({ id: match.workOrder.id, name: match.workOrder.title, score: match.score })),
    };

    setInboxItems((current) =>
      current.map((entry) => entry.id === item.id
        ? { ...entry, extractedData, status: "Analyzed", updatedAt: new Date().toISOString() }
        : entry),
    );
    await updateInboxItem(item.id, { extractedData, status: "Analyzed" });
    setInboxReviewDraft(buildInboxReviewDraft(extractedData));
    setInboxReviewOpen(true);
    setInboxMessage("Analysis complete. Review the detected information before approving anything.");
    setAnalyzingInboxId("");
  }

  function openInboxItemInFastIntake(item: InboxItemRecord) {
    setFastIntakeKind(item.intakeType || "Document");
    setFastIntakeSaveMode(item.proposedAction || "Attach to Existing");
    setIntakeTitle(item.title || "");
    setIntakeNotes(item.notes || "");
    setIntakePastedText(item.pastedText || "");
    setIntakeFiles(Array.isArray(item.files) ? item.files : []);
    setIntakeTargetKind(item.targetType || "General");
    setIntakeTargetId(item.targetId || "");
    setIntakeMessage("Loaded from Atlas Inbox. Review everything before saving.");
    void updateInboxItem(item.id, { status: "Needs Review" });
    setScreen("intake");
  }

  function renderInbox() {
    const filtered = inboxItems.filter((item) => {
      const haystack = [
        item.title,
        item.intakeType,
        item.status,
        item.source,
        item.notes,
        item.pastedText,
        item.targetName,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(inboxSearch.trim().toLowerCase());
    });

    const selected =
      inboxItems.find((item) => item.id === selectedInboxId) || filtered[0];
    const analysis = (selected?.extractedData || {}) as Record<string, unknown>;
    const suggestedMatch = analysis.suggestedMatch as
      | { type?: string; id?: string; name?: string; confidence?: string; reasons?: string[] }
      | null
      | undefined;
    const readings = (analysis.readings || {}) as Record<string, unknown>;
    const analysisFields = [
      ["Manufacturer", analysis.manufacturer],
      ["Model", analysis.model],
      ["Serial", analysis.serial],
      ["Invoice #", analysis.invoiceNumber],
      ["Amount", analysis.amount],
      ["Date", analysis.date],
      ["PSI", readings.psi],
      ["Temperature", readings.temperature ? `${String(readings.temperature)}°F` : ""],
      ["pH", readings.ph],
      ["Hours", readings.hours],
    ].filter(([, value]) => typeof value === "string" && value.trim());

    return (
      <>
      <ListDrawerLayout
        eyebrow="Atlas Inbox"
        title="Review Before Anything Changes"
        detail="Photos, screenshots, PDFs, labels, invoices, readings, and notes can wait here until you decide what they should become."
        isMobile={isMobile}
        drawerResetKey={`${selected?.id || "inbox-empty"}:${String(analysis.analyzedAt || "not-analyzed")}`}
        gridStyleOverride={
          isMobile
            ? undefined
            : { gridTemplateColumns: "minmax(300px, 0.78fr) minmax(520px, 1.22fr)" }
        }
        drawerStyleOverride={isMobile ? undefined : { paddingLeft: 10 }}
        list={
          <div style={{ display: "grid", gap: 12 }}>
            <div style={cardStyle}>
              <Field
                label="Search Inbox"
                value={inboxSearch}
                onChange={setInboxSearch}
                placeholder="Title, type, status, notes, destination..."
              />
              <div style={buttonRowStyle}>
                <button type="button" onClick={() => setScreen("intake")} style={goldButtonStyle}>
                  Add to Inbox
                </button>
              </div>
              <p style={mutedSmallStyle}>{inboxMessage}</p>
            </div>

            {filtered.length ? (
              <div style={listStyle}>
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedInboxId(item.id)}
                    style={
                      item.id === selected?.id
                        ? { ...rowButtonStyle, borderColor: colors.gold, background: "#FFF8E8" }
                        : rowButtonStyle
                    }
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{item.title}</strong>
                      <p style={mutedSmallStyle}>
                        {item.intakeType} · {item.status} · {(item.files || []).length} file(s)
                      </p>
                    </div>
                    <span style={mutedSmallStyle}>{formatDate(item.updatedAt || item.createdAt)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>No Inbox items match this search.</div>
            )}
          </div>
        }
        drawer={
          selected ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={cardStyle}>
                <div style={eyebrowStyle}>Selected Inbox Item</div>
                <h3 style={{ ...detailTitleStyle, marginBottom: 4 }}>{selected.title}</h3>
                <p style={{ ...mutedSmallStyle, marginTop: 0 }}>
                  {selected.intakeType} · {selected.source || "Manual"} · {selected.status}
                </p>

                {(selected.files || []).length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {(selected.files || []).map((file, index) => (
                      <div key={file.id} style={{ ...photoCardStyle, padding: 12 }}>
                        {file.dataUrl?.startsWith("data:image/") ? (
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            style={{
                              ...photoStyle,
                              maxHeight: index === 0 ? 420 : 220,
                              objectFit: "contain",
                              background: colors.panel,
                            }}
                          />
                        ) : (
                          <div style={{ ...fileTileStyle, minHeight: 150 }}>
                            {file.type?.includes("pdf") ? "PDF" : "FILE"}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <strong style={{ overflowWrap: "anywhere" }}>{file.name}</strong>
                          <button type="button" onClick={() => openUploadedFile(file)} style={tinyButtonStyle}>
                            Preview
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={emptyStateStyle}>No original file attached.</div>
                )}

                <div
                  style={{
                    ...buttonRowStyle,
                    marginTop: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      openInboxReview(selected);
                      void analyzeInboxItem(selected);
                    }}
                    disabled={analyzingInboxId === selected.id}
                    style={{
                      ...goldButtonStyle,
                      opacity: analyzingInboxId === selected.id ? 0.65 : 1,
                      cursor: analyzingInboxId === selected.id ? "wait" : "pointer",
                    }}
                  >
                    {analyzingInboxId === selected.id
                      ? "Reading File..."
                      : analysis.analyzedAt
                        ? "Analyze Again"
                        : "Analyze Item"}
                  </button>
                  {analysis.analyzedAt ? (
                    <span style={mutedSmallStyle}>
                      Last analyzed {formatDate(String(analysis.analyzedAt))}
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={eyebrowStyle}>Atlas AI Review</div>
                <h3 style={detailTitleStyle}>Analysis Opens in a Separate Review Drawer</h3>
                <p style={mutedSmallStyle}>
                  The review drawer keeps the original file, detected information, editable fields, and any reliable match together. Destination fields stay blank unless you choose them.
                </p>
                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() => openInboxReview(selected)}
                    style={secondaryButtonStyle}
                  >
                    {analysis.analyzedAt ? "Open AI Review" : "Open Review Drawer"}
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={eyebrowStyle}>Review and Edit</div>
                <div style={formGridStyle}>
                  <Field
                    label="Title"
                    value={selected.title}
                    onChange={(value) =>
                      setInboxItems((current) =>
                        current.map((item) =>
                          item.id === selected.id ? { ...item, title: value } : item,
                        ),
                      )
                    }
                  />
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={fieldLabelStyle}>Status</span>
                    <select
                      value={selected.status}
                      onChange={(event) =>
                        void updateInboxItem(selected.id, {
                          status: event.currentTarget.value as InboxStatus,
                        })
                      }
                      style={inputStyle}
                    >
                      {[
                        "New",
                        "Analyzed",
                        "Needs Review",
                        "Approved",
                        "Saved",
                        "Archived",
                        "Error",
                      ].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Notes"
                    value={selected.notes}
                    onChange={(value) =>
                      setInboxItems((current) =>
                        current.map((item) =>
                          item.id === selected.id ? { ...item, notes: value } : item,
                        ),
                      )
                    }
                    multiline
                  />
                  <Field
                    label="Pasted text"
                    value={selected.pastedText}
                    onChange={(value) =>
                      setInboxItems((current) =>
                        current.map((item) =>
                          item.id === selected.id ? { ...item, pastedText: value } : item,
                        ),
                      )
                    }
                    multiline
                  />
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      void updateInboxItem(selected.id, {
                        title: selected.title,
                        notes: selected.notes,
                        pastedText: selected.pastedText,
                      })
                    }
                    style={secondaryButtonStyle}
                  >
                    Save Edits
                  </button>
                  <button
                    type="button"
                    onClick={() => openInboxItemInFastIntake(selected)}
                    style={goldButtonStyle}
                  >
                    Review in Fast Intake
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateInboxItem(selected.id, { status: "Archived" })}
                    style={secondaryButtonStyle}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteInboxItem(selected)}
                    style={dangerButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={noticeStyle}>
                <strong>No automatic changes.</strong>
                <p style={mutedSmallStyle}>
                  This Inbox item cannot alter Assets, Vendors, Work Orders, Documents, Calendar, or Readings until you open it in Fast Intake and approve the final save.
                </p>
              </div>
            </div>
          ) : (
            <div style={emptyStateStyle}>Select an Inbox item.</div>
          )
        }
      />

      {inboxReviewOpen && selected ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Atlas AI Review"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setInboxReviewOpen(false);
          }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(4, 18, 32, 0.72)",
            display: "flex", justifyContent: "flex-end",
          }}
        >
          <div style={{
            width: isMobile ? "100%" : "min(760px, 94vw)", height: "100%", background: colors.bg,
            overflowY: "auto", boxShadow: "-18px 0 48px rgba(0,0,0,0.28)", padding: isMobile ? 14 : 22,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={eyebrowStyle}>Atlas AI Review</div>
                <h2 style={{ ...detailTitleStyle, margin: "4px 0" }}>{selected.title}</h2>
                <p style={{ ...mutedSmallStyle, margin: 0 }}>Review and edit everything before choosing what Atlas should do.</p>
              </div>
              <button type="button" onClick={() => setInboxReviewOpen(false)} style={secondaryButtonStyle}>Close</button>
            </div>

            {analyzingInboxId === selected.id ? (
              <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
                <h3 style={{ ...detailTitleStyle, margin: 0 }}>Analyzing image...</h3>
                {["Reading the file", "Extracting visible text", "Finding identifying fields", "Searching Atlas records", "Preparing review"].map((step, index) => (
                  <div key={step} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: index === 4 ? "none" : `1px solid ${colors.line}` }}>
                    <span>{step}</span><strong>{index === 0 ? "Working..." : "Queued"}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={cardStyle}>
                  <div style={eyebrowStyle}>Original File</div>
                  {(selected.files || [])[0]?.dataUrl?.startsWith("data:image/") ? (
                    <img src={(selected.files || [])[0].dataUrl} alt={(selected.files || [])[0].name} style={{ ...photoStyle, maxHeight: 360, objectFit: "contain", background: colors.panel }} />
                  ) : (selected.files || []).length ? (
                    <div style={{ ...fileTileStyle, minHeight: 120 }}>{(selected.files || [])[0].type?.includes("pdf") ? "PDF" : "FILE"}</div>
                  ) : <div style={emptyStateStyle}>No original file attached.</div>}
                </div>

                <div style={cardStyle}>
                  <div style={eyebrowStyle}>What Atlas Detected</div>
                  <div style={formGridStyle}>
                    <Field label="Document / image type" value={inboxReviewDraft.documentType} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, documentType: value }))} />
                    <Field label="Summary" value={inboxReviewDraft.summary} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, summary: value }))} multiline />
                    <Field label="Manufacturer" value={inboxReviewDraft.manufacturer} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, manufacturer: value }))} />
                    <Field label="Model" value={inboxReviewDraft.model} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, model: value }))} />
                    <Field label="Serial number" value={inboxReviewDraft.serial} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, serial: value }))} />
                    <Field label="Invoice number" value={inboxReviewDraft.invoiceNumber} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, invoiceNumber: value }))} />
                    <Field label="Amount" value={inboxReviewDraft.amount} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, amount: value }))} />
                    <Field label="Date" value={inboxReviewDraft.date} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, date: value }))} />
                    <Field label="PSI" value={inboxReviewDraft.psi} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, psi: value }))} />
                    <Field label="Temperature" value={inboxReviewDraft.temperature} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, temperature: value }))} />
                    <Field label="pH" value={inboxReviewDraft.ph} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, ph: value }))} />
                    <Field label="Hours" value={inboxReviewDraft.hours} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, hours: value }))} />
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={eyebrowStyle}>Where Should This Go?</div>
                  <p style={mutedSmallStyle}>These fields intentionally start blank. Atlas will not label something as a boiler, vehicle, vendor, or other record unless you choose it or there is a reliable match.</p>
                  <div style={formGridStyle}>
                    <label style={{ display: "grid", gap: 6 }}><span style={fieldLabelStyle}>Asset</span><select value={inboxReviewDraft.assetId} onChange={(e) => setInboxReviewDraft((c) => ({ ...c, assetId: e.currentTarget.value }))} style={inputStyle}><option value="">No asset selected</option>{assetRecords.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={fieldLabelStyle}>Location</span><select value={inboxReviewDraft.locationId} onChange={(e) => setInboxReviewDraft((c) => ({ ...c, locationId: e.currentTarget.value }))} style={inputStyle}><option value="">No location selected</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={fieldLabelStyle}>Vendor</span><select value={inboxReviewDraft.vendorId} onChange={(e) => setInboxReviewDraft((c) => ({ ...c, vendorId: e.currentTarget.value }))} style={inputStyle}><option value="">No vendor selected</option>{vendorRecords.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                    <label style={{ display: "grid", gap: 6 }}><span style={fieldLabelStyle}>Work Order</span><select value={inboxReviewDraft.workOrderId} onChange={(e) => setInboxReviewDraft((c) => ({ ...c, workOrderId: e.currentTarget.value }))} style={inputStyle}><option value="">No work order selected</option>{serviceRecords.map((workOrder) => <option key={workOrder.id} value={workOrder.id}>{workOrder.title}</option>)}</select></label>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={eyebrowStyle}>Reliable Match Check</div>
                  {suggestedMatch?.name && (suggestedMatch.confidence === "High" || suggestedMatch.confidence === "Medium") ? (
                    <>
                      <h3 style={{ ...detailTitleStyle, margin: "6px 0" }}>{suggestedMatch.type}: {suggestedMatch.name}</h3>
                      <p style={mutedSmallStyle}>Confidence: {suggestedMatch.confidence}{Array.isArray(suggestedMatch.reasons) && suggestedMatch.reasons.length ? ` · ${suggestedMatch.reasons.join(" · ")}` : ""}</p>
                      <button type="button" onClick={() => {
                        if (suggestedMatch.type === "Asset") setInboxReviewDraft((c) => ({ ...c, assetId: suggestedMatch.id || "" }));
                        if (suggestedMatch.type === "Vendor") setInboxReviewDraft((c) => ({ ...c, vendorId: suggestedMatch.id || "" }));
                        if (suggestedMatch.type === "Work Order") setInboxReviewDraft((c) => ({ ...c, workOrderId: suggestedMatch.id || "" }));
                      }} style={secondaryButtonStyle}>Use This Match</button>
                    </>
                  ) : (
                    <p style={mutedSmallStyle}>No reliable match found. Nothing has been selected for you.</p>
                  )}
                </div>

                <div style={cardStyle}>
                  <Field label="Review notes" value={inboxReviewDraft.notes} onChange={(value) => setInboxReviewDraft((current) => ({ ...current, notes: value }))} multiline />
                  <div style={buttonRowStyle}>
                    <button type="button" onClick={() => void updateInboxItem(selected.id, {
                      extractedData: { ...analysis, ...inboxReviewDraft, readings: { psi: inboxReviewDraft.psi, temperature: inboxReviewDraft.temperature, ph: inboxReviewDraft.ph, hours: inboxReviewDraft.hours } },
                      targetType: inboxReviewDraft.assetId ? "Asset" : inboxReviewDraft.vendorId ? "Vendor" : inboxReviewDraft.workOrderId ? "Work Order" : inboxReviewDraft.locationId ? "Location" : "General",
                      targetId: inboxReviewDraft.assetId || inboxReviewDraft.vendorId || inboxReviewDraft.workOrderId || inboxReviewDraft.locationId || "",
                      targetName: inboxReviewDraft.assetId ? assetRecords.find((r) => r.id === inboxReviewDraft.assetId)?.name || "" : inboxReviewDraft.vendorId ? vendorRecords.find((r) => r.id === inboxReviewDraft.vendorId)?.name || "" : inboxReviewDraft.workOrderId ? serviceRecords.find((r) => r.id === inboxReviewDraft.workOrderId)?.title || "" : inboxReviewDraft.locationId ? locations.find((r) => r.id === inboxReviewDraft.locationId)?.name || "" : "",
                      status: "Needs Review",
                    })} style={secondaryButtonStyle}>Save Review Draft</button>
                    <button type="button" onClick={() => { setInboxReviewOpen(false); openInboxItemInFastIntake(selected); }} style={goldButtonStyle}>Continue to Approval Actions</button>
                  </div>
                  <p style={mutedSmallStyle}>Saving this review only updates the Inbox item. It does not create or overwrite an Atlas record.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      </>
    );
  }

  function renderIntake() {
    const selectedTargetName = targetNameFor(intakeTargetKind, intakeTargetId);
    const reviewName = fastIntakeRecordName.trim() || intakeTitle.trim() ||
      intakeFiles[0]?.name?.replace(/\.[^.]+$/, "") || "Untitled intake";

    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Fast Intake"
          title="Scan, Review, Save"
          detail="Take a photo or upload a file, review exactly where it will go, then approve the save. Atlas will never change a record until you tap Save."
          right={
            <button
              type="button"
              onClick={() => setScreen("inbox")}
              style={secondaryButtonStyle}
            >
              Open Inbox
            </button>
          }
        />

        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle}>
            <div style={eyebrowStyle}>1. What are you adding?</div>
            <div style={{ ...buttonRowStyle, marginTop: 10 }}>
              {(
                [
                  "Asset Label",
                  "Invoice / Receipt",
                  "Work Order Issue",
                  "Document",
                  "Gauge / Meter Reading",
                  "General Photo",
                ] as FastIntakeKind[]
              ).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => applyFastIntakeKind(kind)}
                  style={
                    fastIntakeKind === kind
                      ? goldButtonStyle
                      : secondaryButtonStyle
                  }
                >
                  {kind}
                </button>
              ))}
            </div>
          </div>

          <div
            style={
              isMobile
                ? { ...intakeLayoutStyle, gridTemplateColumns: "1fr" }
                : intakeLayoutStyle
            }
          >
            <div style={cardStyle}>
              <div style={eyebrowStyle}>2. Capture or upload</div>
              <h3 style={detailTitleStyle}>{fastIntakeKind}</h3>
              <p style={mutedSmallStyle}>
                Take Photo opens the phone camera. Upload supports photos,
                screenshots, PDFs, text files, and common documents.
              </p>

              <div style={buttonRowStyle}>
                <label style={uploadButtonStyle}>
                  Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => {
                      void addIntakeFiles(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                <label style={secondaryUploadButtonStyle}>
                  Upload File(s)
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    multiple
                    onChange={(event) => {
                      void addIntakeFiles(event.currentTarget.files);
                      event.currentTarget.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {intakeFiles.length ? (
                <div style={{ ...photoGridStyle, marginTop: 14 }}>
                  {intakeFiles.map((file) => (
                    <div key={file.id} style={photoCardStyle}>
                      {file.dataUrl?.startsWith("data:image/") ? (
                        <img src={file.dataUrl} alt={file.name} style={photoStyle} />
                      ) : (
                        <div style={fileTileStyle}>
                          {file.type?.includes("pdf") ? "PDF" : "FILE"}
                        </div>
                      )}
                      <strong>{file.name}</strong>
                      <div style={buttonRowStyle}>
                        <button
                          type="button"
                          onClick={() => openUploadedFile(file)}
                          style={tinyButtonStyle}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => removeIntakeFile(file.id)}
                          style={tinyDangerButtonStyle}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyStateStyle}>No file attached yet.</div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={eyebrowStyle}>3. Choose what Atlas should do</div>
              <div style={formGridStyle}>
                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <span style={fieldLabelStyle}>Save action</span>
                  <select
                    value={fastIntakeSaveMode}
                    onChange={(event) =>
                      setFastIntakeSaveMode(
                        event.currentTarget.value as FastIntakeSaveMode,
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="Attach to Existing">Attach to Existing</option>
                    <option value="Create Work Order">Create Work Order</option>
                    <option value="Create Asset">Create Asset</option>
                    <option value="Create Vendor">Create Vendor</option>
                    <option value="Document Only">Document Only</option>
                  </select>
                </label>

                <Field
                  label="Intake title"
                  value={intakeTitle}
                  onChange={setIntakeTitle}
                  placeholder="Invoice, equipment label, issue, reading..."
                />

                {fastIntakeSaveMode === "Create Work Order" ||
                fastIntakeSaveMode === "Create Asset" ||
                fastIntakeSaveMode === "Create Vendor" ? (
                  <Field
                    label={
                      fastIntakeSaveMode === "Create Work Order"
                        ? "Work order title"
                        : fastIntakeSaveMode === "Create Asset"
                          ? "Asset name"
                          : "Vendor name"
                    }
                    value={fastIntakeRecordName}
                    onChange={setFastIntakeRecordName}
                    placeholder="Required before creating a new record"
                  />
                ) : null}

                {fastIntakeSaveMode === "Create Work Order" ? (
                  <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <span style={fieldLabelStyle}>Priority</span>
                    <select
                      value={fastIntakePriority}
                      onChange={(event) =>
                        setFastIntakePriority(
                          event.currentTarget.value as WorkOrderPriority,
                        )
                      }
                      style={inputStyle}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                ) : null}

                {fastIntakeSaveMode === "Create Asset" ? (
                  <>
                    <Field
                      label="Category"
                      value={fastIntakeCategory}
                      onChange={setFastIntakeCategory}
                      placeholder="HVAC, Appliance, Watercraft..."
                    />
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Location</span>
                      <select
                        value={fastIntakeLocationId}
                        onChange={(event) =>
                          setFastIntakeLocationId(event.currentTarget.value)
                        }
                        style={inputStyle}
                      >
                        {byName(locations).map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}

                {fastIntakeSaveMode === "Create Vendor" ? (
                  <Field
                    label="Category"
                    value={fastIntakeCategory}
                    onChange={setFastIntakeCategory}
                    placeholder="Painting, Plumbing, Boat Service..."
                  />
                ) : null}

                {fastIntakeSaveMode === "Attach to Existing" ||
                fastIntakeSaveMode === "Create Work Order" ? (
                  <>
                    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                      <span style={fieldLabelStyle}>Link to section</span>
                      <select
                        value={intakeTargetKind}
                        onChange={(event) =>
                          setIntakeTargetKind(
                            event.currentTarget.value as IntakeTargetKind,
                          )
                        }
                        style={inputStyle}
                      >
                        {(
                          [
                            "Asset",
                            "Location",
                            "Vendor",
                            "Work Order",
                            "Map Label",
                            "General",
                          ] as IntakeTargetKind[]
                        ).map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    {intakeTargetKind !== "General" ? (
                      <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                        <span style={fieldLabelStyle}>Existing record</span>
                        <select
                          value={intakeTargetId}
                          onChange={(event) =>
                            setIntakeTargetId(event.currentTarget.value)
                          }
                          style={inputStyle}
                        >
                          {intakeTargetOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </>
                ) : null}

                <Field
                  label="Notes"
                  value={intakeNotes}
                  onChange={setIntakeNotes}
                  multiline
                  placeholder="What is it, what happened, follow-up needed, reading and unit..."
                />
                <Field
                  label="Paste text / email / copied information"
                  value={intakePastedText}
                  onChange={setIntakePastedText}
                  multiline
                  placeholder="Paste invoice text, serial information, email details, or copied notes."
                />
              </div>

              {fastIntakeSaveMode === "Attach to Existing" &&
              ["Asset", "Vendor", "Work Order"].includes(intakeTargetKind) ? (
                <label style={{ ...noticeStyle, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={fastIntakeAppendNotes}
                    onChange={(event) =>
                      setFastIntakeAppendNotes(event.currentTarget.checked)
                    }
                    style={{ width: 20, height: 20, marginTop: 1 }}
                  />
                  <span>
                    <strong>Also append these notes to the selected record.</strong>
                    <span style={{ ...mutedSmallStyle, display: "block" }}>
                      Existing notes are preserved. Atlas adds the new intake below them.
                    </span>
                  </span>
                </label>
              ) : null}

              {fastIntakeDuplicateWarning ? (
                <div style={{ ...noticeStyle, borderColor: colors.red, color: colors.red }}>
                  <strong>{fastIntakeDuplicateWarning}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={eyebrowStyle}>4. Review before saving</div>
            <div style={reviewGridStyle}>
              <div style={noticeStyle}>
                <strong>{fastIntakeKind}</strong>
                <p style={mutedSmallStyle}>Intake type</p>
              </div>
              <div style={noticeStyle}>
                <strong>{fastIntakeSaveMode}</strong>
                <p style={mutedSmallStyle}>Save action</p>
              </div>
              <div style={noticeStyle}>
                <strong>{reviewName}</strong>
                <p style={mutedSmallStyle}>Title / new record</p>
              </div>
              <div style={noticeStyle}>
                <strong>
                  {fastIntakeSaveMode === "Document Only"
                    ? "General"
                    : fastIntakeSaveMode.startsWith("Create")
                      ? fastIntakeSaveMode.replace("Create ", "New ")
                      : selectedTargetName}
                </strong>
                <p style={mutedSmallStyle}>Destination</p>
              </div>
              <div style={noticeStyle}>
                <strong>{intakeFiles.length} file(s)</strong>
                <p style={mutedSmallStyle}>Photos / documents</p>
              </div>
            </div>

            <div style={{ ...noticeStyle, marginTop: 12 }}>
              <strong>{intakeMessage}</strong>
              <p style={mutedSmallStyle}>
                Atlas saves only after you approve below. New records are merged into the current lists; existing records and photos are not replaced.
              </p>
            </div>

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => void createInboxItemFromDraft()}
                style={goldButtonStyle}
              >
                Save to Inbox
              </button>
              <button
                type="button"
                onClick={() => void saveIntakeDocument()}
                disabled={Boolean(fastIntakeDuplicateWarning)}
                style={{
                  ...goldButtonStyle,
                  opacity: fastIntakeDuplicateWarning ? 0.55 : 1,
                }}
              >
                Approve and Save
              </button>
              <button type="button" onClick={resetIntakeDraft} style={secondaryButtonStyle}>
                Clear
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={eyebrowStyle}>Recent Intake</div>
            <h3 style={detailTitleStyle}>Intake history</h3>
            {recentFastIntake.length ? (
              <div style={listStyle}>
                {recentFastIntake.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocumentId(doc.id);
                      setScreen("documents");
                    }}
                    style={rowButtonStyle}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{doc.title}</strong>
                      <p style={mutedSmallStyle}>
                        {doc.type} · {doc.targetName || "General"} · {(doc.files || []).length} file(s)
                      </p>
                    </div>
                    <span style={mutedSmallStyle}>{formatDate(doc.createdAt || "")}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>No Fast Intake records yet.</div>
            )}
          </div>
        </div>
      </section>
    );
  }

  async function updateOwnerRequest(
    requestId: string,
    patch: Partial<OwnerRequestRecord>,
  ) {
    setRequestMessage("Saving request...");
    try {
      const response = await fetch("/api/atlas-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, ...patch }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "Request update failed.");
      }
      const saved = payload.request as OwnerRequestRecord;
      setRequestRecords((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setRequestMessage("Request saved.");
    } catch (error) {
      setRequestMessage(
        error instanceof Error ? error.message : "Request update failed.",
      );
    }
  }

  async function convertOwnerRequestToWorkOrder(request: OwnerRequestRecord) {
    if (request.convertedWorkOrderId) {
      setRequestMessage("This request was already converted to a work order.");
      return;
    }

    const asset = assetRecords.find(
      (item) =>
        request.assetName &&
        item.name.trim().toLowerCase() === request.assetName.trim().toLowerCase(),
    );

    const record = normalizeService({
      id: uid("service"),
      assetId: asset?.id || "",
      date: todayISO(),
      title: request.title || "Owner Request",
      status: "Open",
      priority: request.priority || "Medium",
      notes: [
        request.description,
        request.locationName ? `Location: ${request.locationName}` : "",
        request.assetName ? `Requested asset: ${request.assetName}` : "",
        request.requesterName ? `Requested by: ${request.requesterName}` : "",
        request.preferredTiming
          ? `Preferred timing: ${request.preferredTiming}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      photos: request.photos || [],
      documents: [],
    });

    const saved = await postAtlasRecord("work_orders", record);
    if (!saved) {
      setRequestMessage("Work order was not saved. Request was left unchanged.");
      return;
    }

    setServiceRecords((current) => byTitle([...current, record]));
    await updateOwnerRequest(request.id, {
      status: "Converted to Work Order",
      convertedWorkOrderId: record.id,
    });
    setSelectedServiceId(record.id);
    setScreen("history");
  }

  function renderRequests() {
    const portalLink =
      requestPortalToken && typeof window !== "undefined"
        ? `${window.location.origin}/request?token=${encodeURIComponent(
            requestPortalToken,
          )}`
        : "";

    const ownerRequestQr = portalLink ? qrImageUrl(portalLink, 320) : "";

    return (
      <div style={{ display: "grid", gap: 18 }}>
        {portalLink ? (
          <section style={ownerRequestPortalCardStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={eyebrowStyle}>Owner Access</div>
              <h3 style={{ ...editorHeaderStyle, marginBottom: 8 }}>
                Request Service QR Code
              </h3>
              <p style={mutedSmallStyle}>
                The owner can scan this code to open the secure request form
                without entering the full Atlas app.
              </p>
              <div className="atlas-no-print" style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(portalLink);
                    setRequestMessage("Owner request link copied.");
                  }}
                  style={secondaryButtonStyle}
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => void copyOwnerRequestQrImage(portalLink)}
                  style={secondaryButtonStyle}
                >
                  Copy QR Image
                </button>
                <a
                  href={portalLink}
                  target="_blank"
                  rel="noreferrer"
                  style={goldButtonStyle}
                >
                  Open Request Form
                </a>
              </div>
              <small style={{ ...qrUrlStyle, display: "block", marginTop: 10 }}>
                {portalLink}
              </small>
            </div>

            <div style={ownerRequestQrShellStyle}>
              <img
                src={ownerRequestQr}
                alt="Owner Request QR code"
                style={ownerRequestQrImageStyle}
              />
            </div>
          </section>
        ) : null}

        <ListDrawerLayout
          eyebrow="Owner Intake"
          title="Requests"
          detail="Review owner-submitted maintenance requests, then approve, decline, or convert them into work orders."
          isMobile={isMobile}
          drawerResetKey={selectedRequest?.id || "requests-empty"}
          right={
            portalLink ? (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(portalLink);
                  setRequestMessage("Owner request link copied.");
                }}
                style={goldButtonStyle}
              >
                Copy Owner Request Link
              </button>
            ) : null
          }
          list={
            <div style={listStyle}>
              {requestRecords.length ? (
                requestRecords.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    style={{
                      ...rowButtonStyle,
                      borderColor:
                        request.id === selectedRequest?.id ? colors.gold : colors.line,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{request.title || "Untitled Request"}</strong>
                      <p style={mutedSmallStyle}>
                        {request.requesterName || "Owner"} · {request.locationName || request.assetName || "No location"}
                      </p>
                    </div>
                    <span style={badgeStyle(request.status)}>{request.status}</span>
                  </button>
                ))
              ) : (
                <div style={noticeStyle}>{requestMessage}</div>
              )}
            </div>
          }
          drawer={
            selectedRequest ? (
              <>
                <div style={eyebrowStyle}>Request Details</div>
                <h3 style={editorHeaderStyle}>{selectedRequest.title}</h3>
                <div style={noticeStyle}>{requestMessage}</div>
                <div style={formGridStyle}>
                  <Field label="Requester" value={selectedRequest.requesterName} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, requesterName: value } : item))} />
                  <Field label="Contact" value={selectedRequest.requesterContact} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, requesterContact: value } : item))} />
                  <Field label="Title" value={selectedRequest.title} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, title: value } : item))} />
                  <Field label="Location" value={selectedRequest.locationName} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, locationName: value } : item))} />
                  <Field label="Asset" value={selectedRequest.assetName} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, assetName: value } : item))} />
                  <SelectField label="Priority" value={selectedRequest.priority} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, priority: value } : item))} options={["Low", "Medium", "High"] as const} />
                  <SelectField label="Status" value={selectedRequest.status} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, status: value } : item))} options={["New", "Under Review", "Approved", "Converted to Work Order", "Declined", "Closed"] as const} />
                  <Field label="Preferred Timing" value={selectedRequest.preferredTiming} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, preferredTiming: value } : item))} />
                  <Field label="Issue / Request" value={selectedRequest.description} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, description: value } : item))} multiline />
                  <Field label="Admin Notes" value={selectedRequest.adminNotes} onChange={(value) => setRequestRecords((current) => current.map((item) => item.id === selectedRequest.id ? { ...item, adminNotes: value } : item))} multiline />
                </div>
                {selectedRequest.photos?.length ? (
                  <div style={photoGridStyle}>
                    {selectedRequest.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setPreviewFile(photo)}
                        style={{
                          border: `1px solid ${colors.line}`,
                          borderRadius: 14,
                          overflow: "hidden",
                          padding: 0,
                          background: colors.card,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={photo.dataUrl || photo.url}
                          alt={photo.name}
                          style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}
                        />
                        <span style={{ display: "block", padding: 10 }}>{photo.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div style={buttonRowStyle}>
                  <button type="button" onClick={() => void updateOwnerRequest(selectedRequest.id, selectedRequest)} style={secondaryButtonStyle}>Save</button>
                  <button type="button" onClick={() => void convertOwnerRequestToWorkOrder(selectedRequest)} style={goldButtonStyle}>Convert to Work Order</button>
                </div>
              </>
            ) : (
              <div style={noticeStyle}>No request selected.</div>
            )
          }
        />
      </div>
    );
  }

  function renderProcedures() {
    return (
      <ListDrawerLayout
        eyebrow="Procedures"
        title="Procedures"
        isMobile={isMobile}
        drawerResetKey={selectedProcedure.id || "procedure-new"}
        list={
          <div style={listStyle}>
            {filteredProcedures.map((procedure) => (
              <button
                key={procedure.id}
                type="button"
                onClick={() => setSelectedProcedureId(procedure.id)}
                style={{
                  ...rowButtonStyle,
                  borderColor:
                    procedure.id === selectedProcedure.id
                      ? colors.gold
                      : colors.line,
                }}
              >
                <div>
                  <strong>{procedure.title}</strong>
                  <p style={mutedSmallStyle}>
                    {procedure.area} · {procedure.steps.length} steps
                  </p>
                </div>
                <span style={badgeStyle(procedure.priority)}>
                  {procedure.priority}
                </span>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <h3 style={editorHeaderStyle}>
              {selectedProcedure.title.trim() || "New Procedure"}
            </h3>
            <div style={formGridStyle}>
              <Field
                label="Title"
                value={selectedProcedure.title}
                onChange={(value) => updateProcedure({ title: value })}
              />
              <Field
                label="Area"
                value={selectedProcedure.area}
                onChange={(value) => updateProcedure({ area: value })}
              />
              <SelectField
                label="Priority"
                value={selectedProcedure.priority}
                onChange={(value) => updateProcedure({ priority: value })}
                options={["High", "Normal", "Seasonal"] as const}
              />
              <Field
                label="Steps, one per line"
                value={selectedProcedure.steps.join("\n")}
                onChange={(value) =>
                  updateProcedure({
                    steps: value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                multiline
              />
            </div>
            <div style={buttonRowStyle}>
              {isRecordDirty("procedure", selectedProcedure.id) ? (
                <button
                  type="button"
                  onClick={() =>
                    void saveDirtyRecord(
                      "procedures",
                      selectedProcedure,
                      "procedure",
                      selectedProcedure.id,
                    )
                  }
                  style={goldButtonStyle}
                >
                  Save Procedure
                </button>
              ) : null}
              {selectedProcedure.id ? (
                <button
                  type="button"
                  onClick={() => void deleteProcedureRecord(selectedProcedure)}
                  style={dangerButtonStyle}
                >
                  Delete Procedure
                </button>
              ) : null}
            </div>
          </>
        }
      />
    );
  }

  function renderParts() {
    return (
      <ListDrawerLayout
        eyebrow="Inventory"
        title="Parts"
        isMobile={isMobile}
        drawerResetKey={selectedPartId || "part-new"}
        list={
          <div style={listStyle}>
            {filteredParts.map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedPartId(part.id)}
                style={{
                  ...rowButtonStyle,
                  borderColor:
                    part.id === selectedPart.id ? colors.gold : colors.line,
                }}
              >
                <div>
                  <strong>{part.name}</strong>
                  <p style={mutedSmallStyle}>
                    {part.category} · Qty {part.quantity} / Min{" "}
                    {part.minQuantity}
                  </p>
                </div>
                <span style={badgeStyle(part.status)}>{part.status}</span>
              </button>
            ))}
          </div>
        }
        drawer={
          <>
            <h3 style={editorHeaderStyle}>
              {selectedPart.name.trim() || "New Part"}
            </h3>
            <div style={formGridStyle}>
              <Field
                label="Name"
                value={selectedPart.name}
                onChange={(value) => updatePart({ name: value })}
              />
              <Field
                label="Category"
                value={selectedPart.category}
                onChange={(value) => updatePart({ category: value })}
              />
              <Field
                label="Quantity"
                value={String(selectedPart.quantity)}
                onChange={(value) => updatePart({ quantity: Number(value) })}
              />
              <Field
                label="Minimum Quantity"
                value={String(selectedPart.minQuantity)}
                onChange={(value) => updatePart({ minQuantity: Number(value) })}
              />
              <SelectField
                label="Status"
                value={selectedPart.status}
                onChange={(value) => updatePart({ status: value })}
                options={["In Stock", "Low", "Out", "Order"] as const}
              />
              <Field
                label="Notes"
                value={selectedPart.notes}
                onChange={(value) => updatePart({ notes: value })}
                multiline
              />
            </div>
            {selectedPart.id ? (
              <button
                type="button"
                onClick={() => deletePartRecord(selectedPart)}
                style={dangerButtonStyle}
              >
                Delete Part
              </button>
            ) : null}
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
          detail="Open regular work portals, add new links, and edit names, destinations, notes, and logos directly from Atlas."
          right={
            <button
              type="button"
              onClick={openNewWorkLink}
              style={goldButtonStyle}
            >
              + Add Work Link
            </button>
          }
        />

        {workLinkMessage ? (
          <div style={{ ...noticeStyle, marginBottom: 14 }}>
            {workLinkMessage}
          </div>
        ) : null}

        {workLinkEditorOpen ? (
          <div style={{ ...cardStyle, marginBottom: 16, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={eyebrowStyle}>Work Link Editor</div>
                <h3 style={detailTitleStyle}>
                  {workLinkDraft.id ? "Edit" : "Add Work Link"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWorkLinkEditorOpen(false)}
                style={secondaryButtonStyle}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <Field
                label="Name"
                value={workLinkDraft.name}
                onChange={(value) =>
                  setWorkLinkDraft((current) => ({ ...current, name: value }))
                }
              />
              <Field
                label="URL"
                value={workLinkDraft.url}
                onChange={(value) =>
                  setWorkLinkDraft((current) => ({ ...current, url: value }))
                }
              />
              <Field
                label="Category"
                value={workLinkDraft.category}
                onChange={(value) =>
                  setWorkLinkDraft((current) => ({
                    ...current,
                    category: value,
                  }))
                }
              />
              <Field
                label="Vendor / Company"
                value={workLinkDraft.vendor || ""}
                onChange={(value) =>
                  setWorkLinkDraft((current) => ({ ...current, vendor: value }))
                }
              />
              <Field
                label="Logo initials"
                value={workLinkDraft.logoText}
                onChange={(value) =>
                  setWorkLinkDraft((current) => ({
                    ...current,
                    logoText: value.slice(0, 4),
                  }))
                }
              />
              <Field
                label="Logo image URL"
                value={workLinkDraft.logoUrl || ""}
                onChange={(value) =>
                  setWorkLinkDraft((current) => ({
                    ...current,
                    logoUrl: value,
                  }))
                }
              />
              <label style={{ display: "grid", gap: 7 }}>
                <span style={fieldLabelStyle}>Upload logo image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    uploadWorkLinkLogo(event.currentTarget.files?.[0])
                  }
                  style={inputStyle}
                />
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <label style={{ display: "grid", gap: 7 }}>
                  <span style={fieldLabelStyle}>Badge background</span>
                  <input
                    type="color"
                    value={workLinkDraft.logoBg || "#EEF6FF"}
                    onChange={(event) =>
                      setWorkLinkDraft((current) => ({
                        ...current,
                        logoBg: event.currentTarget.value,
                      }))
                    }
                    style={{ ...inputStyle, minHeight: 46, padding: 6 }}
                  />
                </label>
                <label style={{ display: "grid", gap: 7 }}>
                  <span style={fieldLabelStyle}>Badge text</span>
                  <input
                    type="color"
                    value={workLinkDraft.logoColor || colors.navy3}
                    onChange={(event) =>
                      setWorkLinkDraft((current) => ({
                        ...current,
                        logoColor: event.currentTarget.value,
                      }))
                    }
                    style={{ ...inputStyle, minHeight: 46, padding: 6 }}
                  />
                </label>
              </div>
            </div>

            <Field
              label="Notes"
              value={workLinkDraft.notes}
              onChange={(value) =>
                setWorkLinkDraft((current) => ({ ...current, notes: value }))
              }
              multiline
            />

            <div style={{ ...buttonRowStyle, marginTop: 14 }}>
              <button type="button" onClick={saveWorkLink} style={goldButtonStyle}>
                Save Work Link
              </button>
              {workLinkDraft.id ? (
                <button
                  type="button"
                  onClick={() => deleteWorkLink(workLinkDraft)}
                  style={dangerButtonStyle}
                >
                  Delete Work Link
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div style={workLinksPageGridStyle}>
          {filteredWorkLinks.map((link) => (
            <article key={link.id} style={{ ...workLinkPageCardStyle, position: "relative" }}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: 14,
                  color: "inherit",
                  textDecoration: "none",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    ...workLinkLogoLargeStyle,
                    background: link.logoBg,
                    color: link.logoColor || colors.navy,
                  }}
                >
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
                  <span>
                    {link.category}
                    {link.vendor ? ` · ${link.vendor}` : ""}
                  </span>
                  <small>{link.notes}</small>
                </span>

                <span style={workLinkOpenLargeStyle}>Open</span>
              </a>

              <button
                type="button"
                onClick={() => openEditWorkLink(link)}
                aria-label={`Edit ${link.name}`}
                title="Edit"
                style={{
                  ...secondaryButtonStyle,
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 42,
                  minWidth: 42,
                  padding: 8,
                  borderRadius: 999,
                }}
              >
                Edit
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderQRCodes() {
    const qrCounts: Record<QrKind, number> = {
      asset: assetRecords.length,
      location: locations.length,
      vendor: vendorRecords.length,
      map: mapLabels.length,
    };

    const qrKindLabel: Record<QrKind, string> = {
      asset: "Assets",
      location: "Locations",
      vendor: "Vendors",
      map: "Map Labels",
    };

    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="QR Labels"
          title="QR Codes"
          detail="Create printable QR labels for Atlas records. Scanning a code opens Atlas directly to the matching asset, location, vendor, or map label."
          right={
            <div className="atlas-no-print" style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => setScreen("scan")}
                style={secondaryButtonStyle}
              >
                Scan QR
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={goldButtonStyle}
              >
                Print QR Labels
              </button>
            </div>
          }
        />

        {requestPortalToken && typeof window !== "undefined" ? (
          <article
            className="atlas-qr-print-card"
            style={{ ...qrCardStyle, marginBottom: 18 }}
          >
            <div style={qrImageShellStyle}>
              <img
                src={qrImageUrl(
                  `${window.location.origin}/request?token=${encodeURIComponent(
                    requestPortalToken,
                  )}`,
                  320,
                )}
                alt="Owner Request QR code"
                style={qrImageStyle}
              />
            </div>

            <div style={qrCardBodyStyle}>
              <div>
                <div style={eyebrowStyle}>Owner Request</div>
                <h3 style={qrCardTitleStyle}>Request Service</h3>
                <p style={mutedSmallStyle}>
                  Public secure form for the owner to submit maintenance requests.
                </p>
              </div>

              <div className="atlas-no-print" style={buttonRowStyle}>
                <a
                  href={`${window.location.origin}/request?token=${encodeURIComponent(
                    requestPortalToken,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={secondaryButtonStyle}
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/request?token=${encodeURIComponent(
                        requestPortalToken,
                      )}`,
                    );
                    setRequestMessage("Owner request link copied.");
                  }}
                  style={secondaryButtonStyle}
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void copyOwnerRequestQrImage(
                      `${window.location.origin}/request?token=${encodeURIComponent(
                        requestPortalToken,
                      )}`,
                    )
                  }
                  style={secondaryButtonStyle}
                >
                  Copy QR Image
                </button>
              </div>

              <small style={qrUrlStyle}>
                {`${window.location.origin}/request?token=${encodeURIComponent(
                  requestPortalToken,
                )}`}
              </small>
            </div>
          </article>
        ) : null}

        <div className="atlas-no-print" style={qrControlPanelStyle}>
          <div style={qrTypeGridStyle}>
            {(["asset", "location", "vendor", "map"] as QrKind[]).map(
              (kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setQrKind(kind)}
                  style={{
                    ...qrTypeButtonStyle,
                    borderColor: qrKind === kind ? colors.gold : colors.line,
                    background: qrKind === kind ? "#FFF8E6" : "#FFFFFF",
                    color: qrKind === kind ? colors.navy : colors.text,
                  }}
                >
                  <strong>{qrKindLabel[kind]}</strong>
                  <span>{qrCounts[kind]} records</span>
                </button>
              ),
            )}
          </div>

          <input
            value={qrSearch}
            onChange={(event) => setQrSearch(event.currentTarget.value)}
            placeholder={`Search ${qrKindLabel[qrKind].toLowerCase()} for QR labels...`}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <div style={qrSummaryStyle}>
          <strong>
            {qrRecords.length} {qrKindLabel[qrKind].toLowerCase()} ready to
            print
          </strong>
          <p style={mutedSmallStyle}>
            Labels are private to Atlas because the scanned links still require
            your normal Atlas login. Use Scan QR from Atlas, or use the normal
            phone Camera app to open a printed label.
          </p>
        </div>

        <div style={qrGridStyle}>
          {qrRecords.map((record) => {
            const targetUrl = recordQrUrl(record.kind, record.id);

            return (
              <article
                key={`${record.kind}-${record.id}`}
                className="atlas-qr-print-card"
                style={qrCardStyle}
              >
                <div style={qrImageShellStyle}>
                  <img
                    src={qrImageUrl(targetUrl)}
                    alt={`QR code for ${record.title}`}
                    style={qrImageStyle}
                  />
                </div>

                <div style={qrCardBodyStyle}>
                  <div>
                    <div style={eyebrowStyle}>
                      {qrKindLabel[record.kind].slice(0, -1)}
                    </div>
                    <h3 style={qrCardTitleStyle}>{record.title}</h3>
                    <p style={mutedSmallStyle}>{record.subtitle}</p>
                  </div>

                  {record.detail ? (
                    <p style={qrDetailStyle}>{record.detail}</p>
                  ) : null}

                  <div className="atlas-no-print" style={buttonRowStyle}>
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={secondaryButtonStyle}
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(targetUrl);
                      }}
                      style={secondaryButtonStyle}
                    >
                      Copy Link
                    </button>
                  </div>

                  <small style={qrUrlStyle}>{targetUrl}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderQRScanner() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Phone Scanner"
          title="Scan QR"
          detail="Use the phone camera to scan an Atlas QR label and jump directly to the matching asset, location, vendor, or map record."
          right={
            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => setScreen("qr")}
                style={secondaryButtonStyle}
              >
                QR Codes
              </button>
              {scannerActive ? (
                <button
                  type="button"
                  onClick={() => void stopQrScanner()}
                  style={dangerButtonStyle}
                >
                  Stop Scanner
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startQrScanner()}
                  style={goldButtonStyle}
                >
                  Start Camera
                </button>
              )}
            </div>
          }
        />

        <div
          style={
            isMobile
              ? { ...scannerLayoutStyle, gridTemplateColumns: "1fr" }
              : scannerLayoutStyle
          }
        >
          <div style={scannerPanelStyle}>
            <div id={qrScannerElementId} style={scannerReaderStyle} />
            <div style={noticeStyle}>
              <strong>
                {scannerActive ? "Scanner running" : "Scanner ready"}
              </strong>
              <p style={mutedSmallStyle}>{scannerStatus}</p>
            </div>
          </div>

          <div style={scannerSideStyle}>
            <div style={qrCardStyle}>
              <h3 style={qrCardTitleStyle}>How to use it</h3>
              <p style={mutedSmallStyle}>
                Tap Start Camera, allow camera access, then point your phone at
                an Atlas QR label. Atlas will open the matching record
                automatically.
              </p>
              <p style={mutedSmallStyle}>
                The regular iPhone Camera app also works because each QR label
                is a normal Atlas link.
              </p>
            </div>

            <div style={qrCardStyle}>
              <h3 style={qrCardTitleStyle}>Manual QR link</h3>
              <p style={mutedSmallStyle}>
                Paste a copied QR link here if camera permission is blocked.
              </p>
              <textarea
                value={scannerManualValue}
                onChange={(event) =>
                  setScannerManualValue(event.currentTarget.value)
                }
                placeholder="Paste Atlas QR link or qr value here..."
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />
              <button
                type="button"
                onClick={() =>
                  openQrTarget(scannerManualValue, { source: "manual" })
                }
                style={{ ...goldButtonStyle, marginTop: 10 }}
              >
                Open QR Target
              </button>
            </div>

            {lastScannedQr ? (
              <div style={noticeStyle}>
                <strong>Last scanned</strong>
                <p style={{ ...mutedSmallStyle, wordBreak: "break-all" }}>
                  {lastScannedQr}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  function renderCommandStrip() {
    const openWorkOrders = serviceRecords.filter(
      (record) => record.status !== "Completed",
    );
    const highPriority = serviceRecords.filter(
      (record) => record.priority === "High" && record.status !== "Completed",
    );
    const nextEvent = upcomingEvents[0] || todayEvents[0];
    const pinnedLinks = defaultWorkLinks.filter((link) =>
      [
        "landscape-help-crew",
        "maintainx-work-order",
        "unifi-protect",
        "hydrawise",
        "chatgpt",
      ].includes(link.id),
    );

    return (
      <div style={commandStripStyle}>
        <div style={commandSectionStyle}>
          <div style={commandEyebrowStyle}>Today</div>
          <button
            type="button"
            onClick={() => {
              if (nextEvent) {
                openCalendarItem(nextEvent);
                if (nextEvent.source !== "work-order") setScreen("calendar");
              } else {
                addCalendarItem(todayISO());
              }
            }}
            style={commandMainButtonStyle}
          >
            <span>{nextEvent ? "Next" : "No event"}</span>
            <strong>{nextEvent ? nextEvent.title : "Add today event"}</strong>
          </button>
          <div style={commandMiniGridStyle}>
            <button
              type="button"
              onClick={() => setScreen("history")}
              style={commandMetricStyle}
            >
              <strong>{openWorkOrders.length}</strong>
              <span>Open</span>
            </button>
            <button
              type="button"
              onClick={() => setScreen("history")}
              style={commandMetricStyle}
            >
              <strong>{highPriority.length}</strong>
              <span>High</span>
            </button>
          </div>
        </div>

        <div style={commandSectionStyle}>
          <div style={commandEyebrowStyle}>Pinned</div>
          <div style={commandPinnedGridStyle}>
            {pinnedLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={commandPinnedLinkStyle}
              >
                <span>{link.logoText}</span>
                <strong>
                  {link.name
                    .replace("Landscape Help — ", "Landscape ")
                    .replace("UniFi Protect / Ubiquiti Cameras", "Cameras")
                    .replace("Hydrawise / Irrigation", "Irrigation")
                    .replace("MaintainX Work Order", "MaintainX")}
                </strong>
              </a>
            ))}
          </div>
        </div>

        <div style={commandSectionStyle}>
          <div style={commandEyebrowStyle}>Watch</div>
          <button
            type="button"
            onClick={() => setScreen("weather")}
            style={commandWatchStyle}
          >
            Weather / irrigation check
          </button>
          <a href="/landscape-help" style={commandWatchStyle}>
            Landscape Help admin
          </a>
        </div>
      </div>
    );
  }

  function renderFilePreviewOverlay() {
    if (!previewFile) return null;

    const source = previewFile.dataUrl || previewFile.url || "";
    const isImage =
      source.startsWith("data:image/") ||
      (previewFile.type || "").startsWith("image/");
    const isPdf =
      source.startsWith("data:application/pdf") ||
      (previewFile.type || "").includes("pdf");
    const zoomedFrameStyle: React.CSSProperties = {
      ...previewFrameStyle,
      transform: `scale(${previewZoom / 100})`,
      transformOrigin: "top left",
      width: `${10000 / previewZoom}%`,
      height: `${10000 / previewZoom}%`,
    };

    return (
      <div style={previewOverlayStyle} onMouseDown={() => setPreviewFile(null)}>
        <div
          style={previewPanelStyle}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div style={previewHeaderStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={eyebrowStyle}>Document Preview</div>
              <h3 style={detailTitleStyle}>{previewFile.name}</h3>
              <p style={mutedSmallStyle}>Zoom: {previewZoom}%</p>
            </div>
            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() =>
                  setPreviewZoom((value) => Math.max(50, value - 25))
                }
                style={secondaryButtonStyle}
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(100)}
                style={secondaryButtonStyle}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() =>
                  setPreviewZoom((value) => Math.min(300, value + 25))
                }
                style={secondaryButtonStyle}
              >
                +
              </button>
              {source ? (
                <a
                  href={source}
                  target="_blank"
                  rel="noreferrer"
                  style={secondaryButtonStyle}
                >
                  Open New Tab
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                style={goldButtonStyle}
              >
                Close
              </button>
            </div>
          </div>

          <div
            style={previewBodyStyle}
            onTouchStart={handlePreviewTouchStart}
            onTouchMove={handlePreviewTouchMove}
            onTouchEnd={handlePreviewTouchEnd}
          >
            {isImage && source ? (
              <img
                src={source}
                alt={previewFile.name}
                style={{
                  ...previewImageStyle,
                  width: `${previewZoom}%`,
                  maxWidth: "none",
                  maxHeight: "none",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            ) : isPdf && source ? (
              <div style={previewPdfZoomShellStyle}>
                <iframe
                  src={source}
                  title={previewFile.name}
                  style={zoomedFrameStyle}
                />
              </div>
            ) : source ? (
              <div style={noticeStyle}>
                <strong>Preview not available for this file type.</strong>
                <p style={mutedSmallStyle}>
                  Use Open New Tab to view or download it.
                </p>
              </div>
            ) : (
              <div style={noticeStyle}>
                No preview URL is saved for this file.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderAssistant() {
    return (
      <section style={sectionStyle}>
        <SectionHeader
          eyebrow="Ask Atlas"
          title="AI Property Assistant"
          detail="Search Atlas records, or ask Atlas to find an official equipment manual online and save it to Documents."
        />
        <div style={stackStyle}>
          <textarea
            value={assistantQuestion}
            onChange={(event) =>
              setAssistantQuestion(event.currentTarget.value)
            }
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                if (!assistantLoading) void askAtlas();
              }
            }}
            placeholder="Examples: What work is due this week? Find the official PDF manual for the Hunter HCC 24-zone controller and link it to the irrigation controller asset."
            style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
          />
          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={() => void askAtlas()}
              disabled={assistantLoading}
              style={{
                ...goldButtonStyle,
                opacity: assistantLoading ? 0.65 : 1,
                cursor: assistantLoading ? "wait" : "pointer",
              }}
            >
              {assistantLoading ? "Searching..." : "Ask Atlas"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAssistantQuestion("");
                setManualCandidates([]);
                setManualSaveMessage("");
                setAssistantAnswer(
                  "Ask Atlas about your records, or ask it to find an official PDF manual and save it to Atlas Documents.",
                );
              }}
              disabled={assistantLoading}
              style={secondaryButtonStyle}
            >
              Clear
            </button>
          </div>
          <div
            style={{
              ...noticeStyle,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {assistantAnswer}
          </div>

          {manualCandidates.length ? (
            <div style={stackStyle}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Manuals Found</div>
              {manualCandidates.map((candidate, index) => (
                <article
                  key={`${candidate.url}-${index}`}
                  style={{
                    ...cardStyle,
                    padding: 16,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 17 }}>
                      {candidate.title}
                    </div>
                    <div style={mutedSmallStyle}>
                      {[candidate.manufacturer, candidate.model, candidate.sourceDomain]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>
                  <div style={{ lineHeight: 1.5 }}>{candidate.reason}</div>
                  <div style={buttonRowStyle}>
                    <a
                      href={candidate.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...secondaryButtonStyle, textDecoration: "none" }}
                    >
                      Open PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => void saveManualToAtlas(candidate)}
                      disabled={Boolean(manualSavingUrl)}
                      style={{
                        ...goldButtonStyle,
                        opacity:
                          manualSavingUrl && manualSavingUrl !== candidate.url
                            ? 0.55
                            : 1,
                      }}
                    >
                      {manualSavingUrl === candidate.url
                        ? "Saving..."
                        : "Save to Atlas Documents"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {manualSaveMessage ? (
            <div style={noticeStyle}>{manualSaveMessage}</div>
          ) : null}

          <p style={mutedSmallStyle}>
            Atlas prefers official manufacturer PDF manuals. Review the match before saving. Saved manuals appear in Documents with their original source link.
          </p>
        </div>
      </section>
    );
  }

  function renderScreen() {
    let content: React.ReactNode;

    if (screen === "dashboard") content = renderDashboard();
    else if (screen === "timeline") content = renderTimelineOrInsights("timeline");
    else if (screen === "insights") content = renderTimelineOrInsights("insights");
    else if (screen === "planner") content = renderWorkPlanner();
    else if (screen === "map") content = renderMap();
    else if (screen === "locations") content = renderLocations();
    else if (screen === "assets") content = renderAssets();
    else if (screen === "history") content = renderWorkOrders();
    else if (screen === "requests") content = renderRequests();
    else if (screen === "vendors") content = renderVendors();
    else if (screen === "contacts") content = renderContacts();
    else if (screen === "calendar") content = renderCalendar();
    else if (screen === "weather") content = renderWeather();
    else if (screen === "documents") content = renderDocuments();
    else if (screen === "manuals") content = renderManuals();
    else if (screen === "intake") content = renderIntake();
    else if (screen === "inbox") content = renderInbox();
    else if (screen === "procedures") content = renderProcedures();
    else if (screen === "parts") content = renderParts();
    else if (screen === "links") content = renderWorkLinks();
    else if (screen === "qr") content = renderQRCodes();
    else if (screen === "scan") content = renderQRScanner();
    else content = renderAssistant();

    // Calendar already has its own navy shell. Every other section uses the
    // shared navy Atlas backdrop, including Weather and Map.
    if (screen === "calendar") {
      return content;
    }

    return <div style={sectionNavyBackdropStyle}>{content}</div>;
  }

  return (
    <main style={isMobile ? appStyle : desktopAppStyle}>
      <style>{`
        html, body {
          max-width: 100%;
          overflow-x: hidden;
        }
        * {
          box-sizing: border-box;
        }
        @media print {
          aside, header, .atlas-no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          .atlas-qr-print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        @media (max-width: 819px) {
          body {
            width: 100%;
            position: relative;
          }
          input, select, textarea, button, a {
            max-width: 100%;
          }
        }
      `}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "minmax(0, 1fr)"
            : "300px minmax(0, 1fr)",
          minHeight: "100vh",
          width: "100%",
          maxWidth: isMobile ? "100vw" : "none",
          overflowX: isMobile ? "hidden" : "visible",
          alignItems: "start",
        }}
      >
        <aside
          style={
            isMobile
              ? mobileHeaderShellStyle
              : {
                  ...sidebarStyle,
                  position: "fixed",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 300,
                  height: "100vh",
                  maxHeight: "100vh",
                  overflowY: "hidden",
                  overflowX: "hidden",
                  zIndex: 30,
                  boxShadow: "10px 0 35px rgba(7,27,47,0.16)",
                }
          }
        >
          <div style={isMobile ? mobileBrandStyle : brandStyle}>
            <div style={isMobile ? mobileLogoBoxStyle : logoBoxStyle}>
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
            <div style={{ minWidth: 0 }}>
              <div style={isMobile ? mobileBrandTitleStyle : brandTitleStyle}>
                ATLAS
              </div>
              <div style={brandSubStyle}>2000 Estate Systems</div>
            </div>
          </div>

          {isMobile ? (
            <div style={mobileMenuRowStyle}>
              <select
                value={screen}
                onChange={(event) =>
                  setScreen(event.currentTarget.value as Screen)
                }
                style={mobileMenuSelectStyle}
                aria-label="Open Atlas section"
              >
                {screens
                  .filter(
                    (item) =>
                      item.id !== "intake" && item.id !== "manuals",
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <>
              <nav
                style={{
                  display: "grid",
                  gap: 5,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                {screens
                  .filter(
                    (item) =>
                      item.id !== "intake" && item.id !== "manuals",
                  )
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setScreen(item.id)}
                      style={{
                        ...navButtonStyle,
                        borderColor:
                          screen === item.id
                            ? colors.gold
                            : "rgba(255,255,255,0.12)",
                        background:
                          screen === item.id
                            ? colors.gold
                            : "rgba(255,255,255,0.04)",
                        color: screen === item.id ? colors.navy : "#FFFFFF",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
              </nav>

              {renderCommandStrip()}
            </>
          )}
        </aside>

        <section
          style={{
            gridColumn: isMobile ? "1 / 2" : "2 / 3",
            minWidth: 0,
            width: "100%",
            maxWidth: isMobile ? "100vw" : "none",
            overflowX: isMobile ? "hidden" : "visible",
            paddingBottom: isMobile ? 84 : 0,
          }}
        >
          <header style={isMobile ? mobileTopbarStyle : topbarStyle}>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 10 : 14,
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                {!isMobile ? (
                  <div style={eyebrowStyle}>
                    Private Property Command Center
                  </div>
                ) : null}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {screen === "dashboard" ? <AtlasMiniMark size={34} /> : null}
                  <h1 style={isMobile ? mobilePageTitleStyle : pageTitleStyle}>
                    {screen === "dashboard"
                      ? "Atlas / 2000"
                      : screens.find((item) => item.id === screen)?.label}
                  </h1>
                </div>
                {screen === "dashboard" && !isMobile ? (
                  <p style={headerSubStyle}>{databaseStatus}</p>
                ) : null}
              </div>

              <div
                style={{
                  width: isMobile ? "100%" : 430,
                  maxWidth: "100%",
                }}
              >
                <div
                  style={{ position: "relative", minWidth: 0 }}
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
                    placeholder="Search Atlas records..."
                    aria-label="Search Atlas records"
                    style={{
                      ...inputStyle,
                      width: "100%",
                      minHeight: isMobile ? 46 : undefined,
                    }}
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
                          <span style={mutedSmallStyle}>
                            {result.type} · {result.subtitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div style={isMobile ? mobileContentStyle : desktopContentStyle}>
            {renderScreen()}
          </div>
        </section>
      </div>

      {true ? (
        <>
          <button
            type="button"
            onClick={() => setDashboardAssistantOpen(true)}
            aria-label="Open Atlas AI Assistant"
            title="Open Atlas AI Assistant"
            style={{
              position: "fixed",
              right: isMobile ? 16 : 24,
              bottom: isMobile ? 16 : 24,
              zIndex: 120,
              width: isMobile ? 54 : 58,
              height: isMobile ? 54 : 58,
              display: "grid",
              placeItems: "center",
              padding: 7,
              borderRadius: 18,
              border: `1px solid ${colors.gold2}`,
              background: colors.navy,
              color: "#FFFFFF",
              boxShadow: "0 16px 34px rgba(7,27,47,0.28)",
              cursor: "pointer",
            }}
          >
            <AtlasMiniMark size={40} />
          </button>

          {dashboardAssistantOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Atlas AI Assistant"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 140,
                background: "rgba(7,27,47,0.48)",
                display: "flex",
                alignItems: isMobile ? "stretch" : "flex-end",
                justifyContent: "flex-end",
                padding: isMobile ? 0 : 24,
              }}
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setDashboardAssistantOpen(false);
              }}
            >
              <section
                style={{
                  width: isMobile ? "100%" : 430,
                  maxWidth: "100%",
                  height: isMobile ? "100%" : "min(650px, calc(100vh - 48px))",
                  background: colors.card,
                  borderRadius: isMobile ? 0 : 20,
                  border: isMobile ? "none" : `1px solid ${colors.line}`,
                  boxShadow: "0 28px 70px rgba(7,27,47,0.30)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <header
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "16px 18px",
                    background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navy3} 100%)`,
                    color: "#FFFFFF",
                    borderBottom: `1px solid ${colors.gold}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AtlasMiniMark size={38} />
                    <div>
                      <div style={{ ...eyebrowStyle, color: colors.gold2 }}>Atlas AI</div>
                      <strong style={{ fontSize: 17 }}>Property Assistant</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDashboardAssistantOpen(false)}
                    style={{
                      ...secondaryButtonStyle,
                      minWidth: 42,
                      minHeight: 42,
                      padding: 8,
                      background: "rgba(255,255,255,0.08)",
                      borderColor: "rgba(255,255,255,0.28)",
                      color: "#FFFFFF",
                    }}
                    aria-label="Close Atlas AI"
                  >
                    ×
                  </button>
                </header>

                <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                  <div
                    style={{
                      ...cardStyle,
                      marginBottom: 14,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.55,
                    }}
                  >
                    {assistantLoading ? "Atlas is searching your property records..." : assistantAnswer}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {["What do I need to do today?", "Show high-priority work orders", "Find an asset or manual"].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setAssistantQuestion(prompt);
                          void askAtlas(prompt);
                        }}
                        style={{ ...secondaryButtonStyle, padding: "8px 10px", fontSize: 12 }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <footer style={{ padding: 14, borderTop: `1px solid ${colors.line}`, background: colors.panel }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                    <input
                      value={assistantQuestion}
                      onChange={(event) => setAssistantQuestion(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !assistantLoading && assistantQuestion.trim()) {
                          void askAtlas();
                        }
                      }}
                      placeholder="Ask about your property..."
                      style={{ ...inputStyle, width: "100%", minHeight: 46 }}
                      autoFocus={!isMobile}
                    />
                    <button
                      type="button"
                      disabled={assistantLoading || !assistantQuestion.trim()}
                      onClick={() => void askAtlas()}
                      style={{
                        ...goldButtonStyle,
                        opacity: assistantLoading || !assistantQuestion.trim() ? 0.6 : 1,
                      }}
                    >
                      {assistantLoading ? "Working..." : "Ask"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDashboardAssistantOpen(false);
                      setScreen("assistant");
                    }}
                    style={{ ...secondaryButtonStyle, width: "100%", marginTop: 8 }}
                  >
                    Open Full Ask Atlas
                  </button>
                </footer>
              </section>
            </div>
          ) : null}
        </>
      ) : null}

      {previewFile ? renderFilePreviewOverlay() : null}

      {quickToolsOpen ? (
        <div style={quickToolsOverlayStyle}>
          <div style={quickToolsPanelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={eyebrowStyle}>Quick Tools</div>
                <h2 style={{ ...detailTitleStyle, marginBottom: 0 }}>Calculator</h2>
              </div>
              <button
                type="button"
                onClick={() => setQuickToolsOpen(false)}
                style={secondaryButtonStyle}
              >
                Close
              </button>
            </div>

            <input
              value={calculatorValue}
              onChange={(event) => setCalculatorValue(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") calculateExpression();
              }}
              placeholder="Example: 1250 + 375"
              inputMode="decimal"
              style={{ ...inputStyle, fontSize: 22, textAlign: "right" }}
            />
            <div style={calculatorDisplayStyle}>{calculatorResult}</div>
            <div style={calculatorGridStyle}>
              {[
                "C",
                "(",
                ")",
                "⌫",
                "7",
                "8",
                "9",
                "/",
                "4",
                "5",
                "6",
                "*",
                "1",
                "2",
                "3",
                "-",
                "0",
                ".",
                "%",
                "+",
              ].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => calculatorKey(key)}
                  style={calculatorKeyStyle}
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={() => calculatorKey("=")}
                style={{ ...goldButtonStyle, gridColumn: "1 / -1" }}
              >
                =
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveToast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...saveToastStyle,
            bottom: isMobile ? 88 : 24,
            borderColor:
              saveToast.tone === "success" ? "#9FD6B8" : "#E7C46A",
            background:
              saveToast.tone === "success" ? "#F0FBF5" : "#FFF8E8",
          }}
        >
          <span style={saveToastCheckStyle}>
            {saveToast.tone === "success" ? "✓" : "!"}
          </span>
          <div style={{ minWidth: 0 }}>
            <strong>
              {saveToast.tone === "success" ? "Saved" : "Saved locally"}
            </strong>
            <p style={saveToastMessageStyle}>{saveToast.message}</p>
          </div>
        </div>
      ) : null}

      {isMobile ? (
        <nav style={mobileBottomNavStyle} aria-label="Mobile Atlas navigation">
          {[
            { id: "dashboard" as Screen, label: "Home" },
            { id: "calendar" as Screen, label: "Calendar" },
            { id: "map" as Screen, label: "Map" },
            { id: "links" as Screen, label: "Links" },
            { id: "history" as Screen, label: "Work" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              style={{
                ...mobileBottomButtonStyle,
                color: screen === item.id ? colors.navy : colors.muted,
                background: screen === item.id ? colors.gold : "transparent",
                borderColor: screen === item.id ? colors.gold : "transparent",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}
    </main>
  );
}


const plannerControlCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  alignContent: "start",
  minHeight: 88,
  padding: 9,
  borderRadius: 10,
  border: `1px solid ${colors.line}`,
  background: colors.panel,
};

const plannerControlButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  alignContent: "start",
  minHeight: 88,
  padding: 9,
  borderRadius: 10,
  border: `1px solid ${colors.line}`,
  background: colors.card,
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
};

const plannerControlLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const plannerControlButtonsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
};

const plannerMiniButtonStyle: React.CSSProperties = {
  minHeight: 28,
  padding: "4px 7px",
  borderRadius: 7,
  border: `1px solid ${colors.line}`,
  background: colors.card,
  color: colors.navy,
  fontSize: 11,
  fontWeight: 850,
  cursor: "pointer",
};

const quickToolsOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 280,
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "rgba(7,27,47,0.72)",
};

const quickToolsPanelStyle: React.CSSProperties = {
  width: "min(420px, 100%)",
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 20,
  border: `1px solid ${colors.line}`,
  background: colors.card,
  boxShadow: "0 28px 80px rgba(0,0,0,0.34)",
};

const calculatorDisplayStyle: React.CSSProperties = {
  minHeight: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "12px 14px",
  borderRadius: 14,
  border: `1px solid ${colors.line}`,
  background: colors.panel,
  color: colors.navy,
  fontSize: 30,
  fontWeight: 950,
  overflowWrap: "anywhere",
};

const calculatorGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 9,
};

const calculatorKeyStyle: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 18,
  fontWeight: 900,
  cursor: "pointer",
};

const saveToastStyle: React.CSSProperties = {
  position: "fixed",
  right: 22,
  zIndex: 260,
  width: "min(360px, calc(100vw - 32px))",
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  border: "1px solid #9FD6B8",
  borderRadius: 14,
  color: colors.navy,
  boxShadow: "0 18px 48px rgba(7,27,47,0.22)",
};

const saveToastCheckStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 950,
};

const saveToastMessageStyle: React.CSSProperties = {
  margin: "3px 0 0",
  color: colors.muted,
  fontSize: 11,
  lineHeight: 1.35,
};

const previewOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(7,27,47,0.72)",
  padding: 18,
  display: "grid",
  placeItems: "center",
};

const previewPanelStyle: React.CSSProperties = {
  width: "min(1040px, 96vw)",
  height: "min(860px, 92vh)",
  background: colors.card,
  borderRadius: 22,
  border: `1px solid ${colors.line}`,
  boxShadow: "0 30px 80px rgba(0,0,0,0.34)",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
};

const previewHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: `1px solid ${colors.line}`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const previewBodyStyle: React.CSSProperties = {
  minHeight: 0,
  overflow: "auto",
  background: colors.panel,
  padding: 16,
  display: "block",
  textAlign: "center",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  touchAction: "pan-x pan-y",
};

const previewImageStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  borderRadius: 14,
  background: "#FFFFFF",
};

const previewFrameStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 620,
  border: 0,
  borderRadius: 14,
  background: "#FFFFFF",
};

const documentTextPreviewStyle: React.CSSProperties = {
  margin: "8px 0 0",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "inherit",
  fontSize: 13,
  lineHeight: 1.55,
  color: colors.text,
};

const previewPdfZoomShellStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 620,
  overflow: "auto",
  background: "#FFFFFF",
  borderRadius: 14,
};

const mobileHeaderShellStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navy2} 100%)`,
  color: "#FFFFFF",
  padding: "12px 14px",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  boxSizing: "border-box",
  position: "sticky",
  top: 0,
  zIndex: 40,
  boxShadow: "0 14px 35px rgba(7,27,47,0.20)",
};

const mobileBrandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const mobileLogoBoxStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  background: colors.gold,
  border: `1px solid ${colors.gold}`,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
};

const mobileBrandTitleStyle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 18,
  letterSpacing: 1.1,
  lineHeight: 1,
};

const mobileMenuRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
};

const mobileMenuSelectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  borderRadius: 14,
  padding: "12px 13px",
  fontSize: 15,
  fontWeight: 900,
  outline: "none",
};

const mobileTopbarStyle: React.CSSProperties = {
  background: "transparent",
  padding: "14px 12px 4px",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const mobilePageTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.04em",
};

const mobileContentStyle: React.CSSProperties = {
  padding: "12px 10px 94px",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const mobileBottomNavStyle: React.CSSProperties = {
  position: "fixed",
  left: 8,
  right: 8,
  bottom: 10,
  maxWidth: "calc(100vw - 16px)",
  boxSizing: "border-box",
  zIndex: 60,
  background: "rgba(255,255,255,0.96)",
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  boxShadow: "0 18px 45px rgba(15,23,42,0.22)",
  padding: 8,
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 5,
  backdropFilter: "blur(12px)",
};

const mobileBottomButtonStyle: React.CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 15,
  padding: "10px 4px",
  fontSize: 11,
  fontWeight: 950,
  cursor: "pointer",
  minHeight: 44,
};

const appStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  maxWidth: "100vw",
  overflowX: "hidden",
  background: colors.bg,
  color: colors.text,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const desktopAppStyle: React.CSSProperties = {
  ...appStyle,
  maxWidth: "none",
  overflowX: "visible",
};

const desktopContentStyle: React.CSSProperties = {
  padding: 24,
  minWidth: 0,
  width: "100%",
  overflow: "visible",
};

const sidebarStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${colors.navy} 0%, ${colors.navy2} 100%)`,
  color: "#FFFFFF",
  padding: "10px 10px 10px",
  top: 0,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  overflowX: "hidden",
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const logoBoxStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: colors.gold,
  border: `1px solid ${colors.gold}`,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  boxShadow: "0 12px 26px rgba(0,0,0,0.22)",
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
  fontSize: 18,
  letterSpacing: 1.3,
  lineHeight: 1,
};

const brandSubStyle: React.CSSProperties = {
  color: "#D6E2EE",
  fontSize: 10,
  fontWeight: 850,
};

const navButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 9,
  padding: "6px 7px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 950,
  fontSize: 10.5,
  lineHeight: 1.08,
  minHeight: 30,
  display: "flex",
  alignItems: "center",
};

const reviewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
};

const intakeLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.9fr) minmax(360px, 1.1fr)",
  gap: 16,
  alignItems: "start",
};

const uploadButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: `linear-gradient(135deg, ${colors.gold2}, ${colors.gold})`,
  color: colors.navy,
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 950,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const secondaryUploadButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy3,
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const fileTileStyle: React.CSSProperties = {
  height: 110,
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  background: colors.panel,
  display: "grid",
  placeItems: "center",
  color: colors.navy3,
  fontWeight: 900,
  letterSpacing: 1,
};

const tinyDangerButtonStyle: React.CSSProperties = {
  border: `1px solid #FACACA`,
  background: "#FEECEC",
  color: colors.red,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: colors.card,
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
};

const emptyStateStyle: React.CSSProperties = {
  border: `1px dashed ${colors.line}`,
  background: colors.panel,
  borderRadius: 14,
  padding: 18,
  color: colors.muted,
  fontSize: 13,
  fontWeight: 800,
  marginTop: 14,
};

const tinyButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  color: colors.navy3,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const scannerLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)",
  gap: 16,
  alignItems: "start",
};

const scannerPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const scannerReaderStyle: React.CSSProperties = {
  minHeight: 380,
  width: "100%",
  border: `1px solid ${colors.line}`,
  borderRadius: 24,
  overflow: "hidden",
  background: colors.navy,
  display: "grid",
  placeItems: "center",
};

const scannerSideStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const commandStripStyle: React.CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: 6,
};

const commandSectionStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: 6,
  display: "grid",
  gap: 5,
};

const commandEyebrowStyle: React.CSSProperties = {
  color: colors.gold2,
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const commandMainButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#FFFFFF",
  borderRadius: 10,
  padding: "6px 7px",
  display: "grid",
  gap: 2,
  textAlign: "left",
  cursor: "pointer",
};

const commandMiniGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const commandMetricStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#FFFFFF",
  borderRadius: 9,
  padding: "5px 6px",
  display: "grid",
  gap: 2,
  textAlign: "left",
  cursor: "pointer",
};

const commandActionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const commandActionButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: "rgba(201,154,61,0.13)",
  color: "#FFFFFF",
  borderRadius: 9,
  padding: "6px 6px",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const commandPinnedGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const commandPinnedLinkStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#FFFFFF",
  borderRadius: 9,
  padding: "5px 6px",
  textDecoration: "none",
  display: "grid",
  gridTemplateColumns: "22px 1fr",
  gap: 5,
  alignItems: "center",
  fontSize: 10,
};

const commandWatchStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.045)",
  color: "#FFFFFF",
  borderRadius: 9,
  padding: "5px 6px",
  textDecoration: "none",
  fontSize: 10,
  fontWeight: 850,
  textAlign: "left",
  cursor: "pointer",
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
const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const calendarNavyShellStyle: React.CSSProperties = {
  background: colors.navy,
  border: `1px solid ${colors.navy3}`,
  borderRadius: 24,
  padding: 12,
  boxShadow: "0 22px 55px rgba(7,27,47,0.22)",
  width: "100%",
  maxWidth: "none",
  height: "auto",
  minHeight: 0,
  overflow: "visible",
};

const sectionNavyBackdropStyle: React.CSSProperties = {
  background: colors.navy,
  border: `1px solid ${colors.navy3}`,
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 22px 55px rgba(7,27,47,0.22)",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const calendarWhitePanelStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 22,
  padding: 16,
  boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
};

const calendarMonthWhitePanelStyle: React.CSSProperties = {
  ...calendarWhitePanelStyle,
  padding: 12,
  height: "auto",
  minHeight: 0,
  overflowY: "visible",
  overflowX: "hidden",
  width: "100%",
  maxWidth: "none",
};

const calendarMonthViewportStyle: React.CSSProperties = {
  height: "100%",
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  gap: 7,
  overflow: "hidden",
};

const calendarWhiteDrawerStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 10,
  boxShadow: "0 18px 42px rgba(0,0,0,0.12)",
};

const sectionStyle: React.CSSProperties = {
  background: colors.card,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowWrap: "break-word",
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
  flexWrap: "wrap",
  minWidth: 0,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
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
  overflow: "visible",
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
  top: 16,
  alignSelf: "start",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
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

const editorHeaderStyle: React.CSSProperties = {
  margin: "0 0 18px",
  padding: "0 0 12px",
  borderBottom: `2px solid ${colors.gold}`,
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
  lineHeight: 1.15,
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
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
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
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
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

const upcomingDayPillStyle: React.CSSProperties = {
  flex: "0 0 auto",
  minWidth: 78,
  padding: "6px 9px",
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  background: colors.panel,
  color: colors.navy,
  fontSize: 11,
  fontWeight: 950,
  lineHeight: 1,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const upcomingTodayPillStyle: React.CSSProperties = {
  borderColor: colors.gold,
  background: colors.gold,
  color: colors.navy,
};

const dashboardWeatherStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(145px, 1fr))",
  gap: 10,
  overflowX: "auto",
  maxWidth: "100%",
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
  fontSize: 10,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
  gap: 10,
};

const quickLinkCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
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
  maxWidth: "100%",
  boxSizing: "border-box",
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
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "transparent",
  borderRadius: 13,
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

const ownerRequestPortalCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 18,
  alignItems: "center",
  padding: 20,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  background: colors.card,
  boxShadow: "0 12px 28px rgba(7, 27, 47, 0.07)",
};

const ownerRequestQrShellStyle: React.CSSProperties = {
  width: 190,
  maxWidth: "100%",
  justifySelf: "center",
  padding: 10,
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
};

const ownerRequestQrImageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  borderRadius: 10,
};

const qrControlPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginBottom: 14,
};

const qrTypeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
  gap: 10,
};

const qrTypeButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: "12px 14px",
  display: "grid",
  gap: 3,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const qrSummaryStyle: React.CSSProperties = {
  ...noticeStyle,
  marginBottom: 14,
};

const qrGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
  gap: 14,
};

const qrCardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "150px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.05)",
};

const qrImageShellStyle: React.CSSProperties = {
  width: 150,
  height: 150,
  background: "#FFFFFF",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
};

const qrImageStyle: React.CSSProperties = {
  width: 136,
  height: 136,
  objectFit: "contain",
};

const qrCardBodyStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 9,
};

const qrCardTitleStyle: React.CSSProperties = {
  margin: "2px 0 0",
  color: colors.navy,
  fontSize: 18,
  fontWeight: 950,
  lineHeight: 1.12,
};

const qrDetailStyle: React.CSSProperties = {
  margin: 0,
  color: colors.text,
  fontSize: 12,
  lineHeight: 1.45,
};

const qrUrlStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
  lineHeight: 1.25,
  wordBreak: "break-all",
};

const workLinksPageGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
  gap: 12,
};

const workLinkPageCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr)",
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
  width: 48,
  height: 48,
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
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "transparent",
  borderRadius: 16,
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
  padding: "7px 10px",
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

const mapDetailStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
};

const mapDetailCardStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
  padding: 14,
  display: "grid",
  gap: 12,
};

const mapDetailSectionTitleStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 14,
  fontWeight: 950,
};

const mapDetailHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const mapBoxListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const mapCustomBoxStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: colors.panel,
  padding: 10,
  display: "grid",
  gap: 8,
};

const mapBoxHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center",
};

const mapBoxTitleInputStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 10,
  background: "#FFFFFF",
  color: colors.navy,
  padding: "7px 9px",
  fontSize: 12,
  fontWeight: 900,
  outline: "none",
};

const mapBoxTextareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 70,
  resize: "vertical",
  fontSize: 13,
};

const mapBoxRemoveButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  background: "#FFFFFF",
  color: colors.muted,
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 850,
  cursor: "pointer",
};

const smallSubtleButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 999,
  background: "#FFFFFF",
  color: colors.navy,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapVendorChipListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const mapVendorChipStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  borderRadius: 999,
  background: "#FFFAEB",
  color: colors.navy,
  padding: "7px 10px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapInfoPanelStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
  overflow: "hidden",
  boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
};

const mapInfoHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: 0,
};

const mapInfoTitleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "14px 16px",
};

const mapInfoTitleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const mapInfoIconRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const mapIconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: colors.navy,
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4,
};

const mapHeaderPhotoShellStyle: React.CSSProperties = {
  position: "relative",
  height: 150,
  overflow: "hidden",
  borderTop: `1px solid ${colors.line}`,
  borderBottom: `1px solid ${colors.line}`,
  background: colors.panel,
};

const mapHeaderPhotoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const mapHeaderPhotoChangeStyle: React.CSSProperties = {
  position: "absolute",
  right: 10,
  bottom: 10,
  border: `1px solid rgba(255,255,255,0.75)`,
  borderRadius: 999,
  background: "rgba(2, 28, 53, 0.78)",
  color: "#FFFFFF",
  padding: "6px 9px",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const mapHeaderPhotoEmptyStyle: React.CSSProperties = {
  height: 76,
  borderTop: `1px solid ${colors.line}`,
  borderBottom: `1px solid ${colors.line}`,
  background: colors.panel,
  color: colors.muted,
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapPanelTabsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  borderBottom: `1px solid ${colors.line}`,
};

const mapPanelTabStyle: React.CSSProperties = {
  border: "none",
  borderBottom: "2px solid transparent",
  background: "#FFFFFF",
  color: colors.muted,
  padding: "12px 6px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const mapPanelTabActiveStyle: React.CSSProperties = {
  ...mapPanelTabStyle,
  color: colors.gold,
  borderBottomColor: colors.gold,
};

const mapPanelBodyStyle: React.CSSProperties = {
  padding: 14,
};

const mapPanelFormStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 13,
};

const mapTabListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const mapTabEditorStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 13,
  background: "#FFFFFF",
  padding: 10,
  display: "grid",
  gap: 8,
};

const mapAddTabButtonStyle: React.CSSProperties = {
  border: `1px dashed ${colors.line}`,
  borderRadius: 13,
  background: "#FFFFFF",
  color: colors.navy,
  padding: "11px 12px",
  fontSize: 13,
  fontWeight: 950,
  cursor: "pointer",
};

const mapSmallPhotoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(120px, 100%), 1fr))",
  gap: 10,
};

const mapSmallPhotoCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 13,
  background: "#FFFFFF",
  padding: 8,
  display: "grid",
  gap: 8,
};

const mapSmallPhotoStyle: React.CSSProperties = {
  width: "100%",
  height: 92,
  objectFit: "cover",
  borderRadius: 10,
  border: `1px solid ${colors.line}`,
};

const mapPhotoCardFooterStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const mapEmptyNoteStyle: React.CSSProperties = {
  margin: 0,
  color: colors.muted,
  fontSize: 12,
  lineHeight: 1.4,
};

const dangerMiniButtonStyle: React.CSSProperties = {
  border: "1px solid #FACACA",
  borderRadius: 999,
  background: "#FEECEC",
  color: colors.red,
  padding: "6px 9px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
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

const photoManageCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 7,
  border: `1px solid ${colors.line}`,
  borderRadius: 13,
  background: colors.panel,
};

const photoDeleteButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #F1B8B4",
  borderRadius: 9,
  padding: "7px 9px",
  background: "#FFF1F0",
  color: colors.red,
  fontSize: 11,
  fontWeight: 950,
  cursor: "pointer",
};

const coverPhotoLabelStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.7,
};

const manualActionRowStyle: React.CSSProperties = {
  justifySelf: "end",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  flexWrap: "wrap",
};

const manualDeleteButtonStyle: React.CSSProperties = {
  border: "1px solid #F1B8B4",
  borderRadius: 999,
  padding: "7px 9px",
  background: "#FFF1F0",
  color: colors.red,
  fontSize: 10,
  fontWeight: 950,
  cursor: "pointer",
};

const contactListShellStyle: React.CSSProperties = {
  display: "grid",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const contactRowStyle: React.CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  border: "1px solid transparent",
  borderBottom: `1px solid ${colors.line}`,
  borderRadius: 0,
  background: "#FFFFFF",
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const contactAvatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 13,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 950,
  letterSpacing: 0.4,
};

const contactAvatarLargeStyle: React.CSSProperties = {
  width: 70,
  height: 70,
  flex: "0 0 70px",
  display: "grid",
  placeItems: "center",
  borderRadius: 18,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: 950,
  letterSpacing: 0.7,
};

const contactNameStyle: React.CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const contactSecondaryLineStyle: React.CSSProperties = {
  ...mutedSmallStyle,
  margin: "3px 0 0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const contactDetailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const seasonPlannerStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const seasonCardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 9,
};

const seasonCardStyle: React.CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 7,
  padding: 12,
  border: `1px solid ${colors.line}`,
  borderRadius: 13,
  color: colors.navy,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const seasonCardTitleStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 7,
  fontSize: 13,
  fontWeight: 950,
};

const currentSeasonTagStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "3px 6px",
  borderRadius: 999,
  background: colors.gold,
  color: colors.navy,
  fontSize: 8,
  fontWeight: 950,
  textTransform: "uppercase",
};

const seasonCardDescriptionStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
  lineHeight: 1.35,
};

const workOrderListBadgesStyle: React.CSSProperties = {
  flex: "0 0 auto",
  display: "grid",
  justifyItems: "end",
  gap: 6,
};

const recurringBadgeStyle: React.CSSProperties = {
  padding: "5px 8px",
  border: `1px solid ${colors.gold}`,
  borderRadius: 999,
  background: "#FFF8E8",
  color: colors.navy,
  fontSize: 9,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const recurrenceToggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 40,
  padding: "9px 11px",
  border: `1px solid ${colors.line}`,
  borderRadius: 11,
  background: colors.panel,
  color: colors.navy,
  fontSize: 12,
  fontWeight: 850,
  cursor: "pointer",
};

const recurrenceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
};

const recurrenceHistoryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  padding: 11,
  borderRadius: 11,
  background: colors.panel,
};

const detailSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const detailSectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const recordInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  marginTop: 10,
};

const recordInfoItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  padding: 12,
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: colors.panel,
};

const recordNotesStyle: React.CSSProperties = {
  margin: "10px 0 0",
  padding: 12,
  borderRadius: 12,
  background: colors.panel,
  color: colors.text,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
};

const compactUploadButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  minWidth: "max-content",
  minHeight: 38,
  padding: "9px 12px",
  border: `1px solid ${colors.gold}`,
  borderRadius: 11,
  background: colors.gold,
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
  wordBreak: "keep-all",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  cursor: "pointer",
};

const compactPhotoButtonStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
  padding: 8,
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: "#FFFFFF",
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const compactLinkedListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const compactLinkedRowStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 12px",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: colors.panel,
  color: colors.text,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
};

const assetVisualHeaderStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 14,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const assetPhotoLargeStyle: React.CSSProperties = {
  width: "100%",
  height: 190,
  minWidth: 0,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  borderRadius: 16,
  border: `1px solid ${colors.line}`,
  background: colors.panel,
  color: colors.navy,
  fontSize: 34,
  fontWeight: 950,
};

const assetPhotoLargeImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "contain",
  background: "#FFFFFF",
};

const assetHeaderTextStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  display: "grid",
  gap: 5,
};

const assetHeaderNameRowStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
};

const assetHeaderNameStyle: React.CSSProperties = {
  flex: "1 1 220px",
  minWidth: 0,
  margin: 0,
  color: colors.navy,
  fontSize: 23,
  fontWeight: 950,
  letterSpacing: "-0.03em",
  lineHeight: 1.15,
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
};

const assetHeaderMetaStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  margin: 0,
  color: colors.muted,
  fontSize: 13,
  lineHeight: 1.45,
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
};

const assetPhotoButtonRowStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const assetPhotoActionButtonStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: "#FFFFFF",
  color: colors.navy,
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
  wordBreak: "keep-all",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  cursor: "pointer",
  boxSizing: "border-box",
};

const assetPhotoUploadButtonStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  border: `1px solid ${colors.gold}`,
  borderRadius: 12,
  background: colors.gold,
  color: colors.navy,
  fontSize: 13,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
  wordBreak: "keep-all",
  writingMode: "horizontal-tb",
  textOrientation: "mixed",
  cursor: "pointer",
  boxSizing: "border-box",
};

const manualAssetRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 64px",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: colors.panel,
};

const recordListIdentityStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const recordListThumbStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  flex: "0 0 44px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  borderRadius: 12,
  background: colors.navy,
  color: "#FFFFFF",
  fontWeight: 950,
};

const recordListThumbImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const vendorLogoThumbStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  flex: "0 0 44px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 12,
  fontWeight: 950,
};

const vendorLogoLargeStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  flex: "0 0 72px",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  background: "#FFFFFF",
  color: colors.navy,
  fontSize: 18,
  fontWeight: 950,
};

const vendorLogoImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const vendorDetailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const manualSimpleTableStyle: React.CSSProperties = {
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
};

const manualListHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(180px, 1fr) 150px",
  gap: 14,
  padding: "11px 16px",
  borderBottom: `1px solid ${colors.line}`,
  background: colors.panel,
  color: colors.muted,
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: 0.8,
  textTransform: "uppercase",
};

const manualCompactListStyle: React.CSSProperties = {
  display: "grid",
};

const manualSimpleRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(180px, 1fr) 150px",
  gap: 14,
  alignItems: "center",
  minHeight: 52,
  padding: "10px 16px",
  borderBottom: `1px solid ${colors.line}`,
  background: "#FFFFFF",
};

const manualSimpleTitleStyle: React.CSSProperties = {
  minWidth: 0,
  color: colors.text,
  fontSize: 14,
  fontWeight: 850,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const manualCompactAssetStyle: React.CSSProperties = {
  minWidth: 0,
  color: colors.navy3,
  fontSize: 13,
  fontWeight: 800,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const manualCompactFileStyle: React.CSSProperties = {
  justifySelf: "end",
  minWidth: 56,
  padding: "7px 10px",
  borderRadius: 999,
  background: colors.navy,
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 950,
  textAlign: "center",
  textDecoration: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};

const manualNoPdfStyle: React.CSSProperties = {
  justifySelf: "end",
  minWidth: 56,
  color: colors.muted,
  fontSize: 13,
  fontWeight: 800,
  textAlign: "center",
};

const manualInlineFormHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const calendarControlPanelStyle: React.CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  border: `1px solid ${colors.line}`,
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
  display: "grid",
  gap: 12,
};

const calendarCompactControlPanelStyle: React.CSSProperties = {
  ...calendarControlPanelStyle,
  padding: 8,
  gap: 7,
  borderRadius: 13,
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
  minHeight: 150,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#FFFFFF",
  padding: 9,
  textAlign: "left",
  cursor: "pointer",
  color: colors.text,
  overflow: "hidden",
};

const calendarCompactCellStyle: React.CSSProperties = {
  minHeight: 142,
  height: "auto",
  padding: 10,
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.3,
};

const calendarPillStyle: React.CSSProperties = {
  display: "block",
  background: "#EDF3FF",
  color: "#175CD3",
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 10,
  fontWeight: 850,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const calendarCompactPillStyle: React.CSSProperties = {
  padding: "3px 6px",
  borderRadius: 7,
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 900,
};

const calendarCompactMoreStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 850,
};

const calendarPillContentStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
};

const calendarDoneMiniStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "2px 5px",
  borderRadius: 999,
  background: "#DDE5EC",
  color: colors.muted,
  fontSize: 8,
  fontWeight: 950,
  lineHeight: 1,
  textDecoration: "none",
};

const calendarSelectedEventRowStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const calendarDoneBadgeStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "6px 9px",
  border: "1px solid #BFCBD5",
  borderRadius: 999,
  background: "#FFFFFF",
  color: colors.muted,
  fontSize: 10,
  fontWeight: 950,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const calendarMoreStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 10,
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
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
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
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
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
  maxWidth: "100%",
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

const photoMissingStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  display: "grid",
  placeItems: "center",
  marginBottom: 8,
  border: `1px dashed ${colors.line}`,
  borderRadius: 12,
  background: colors.panel,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 900,
};

const weatherDetailPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  padding: 18,
  border: `1px solid ${colors.gold}`,
  borderRadius: 20,
  background: "#FFFFFF",
  boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
};

const weatherDetailHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const weatherDetailTitleStyle: React.CSSProperties = {
  margin: "4px 0 2px",
  color: colors.navy,
  fontSize: 24,
  fontWeight: 950,
  letterSpacing: "-0.03em",
};

const weatherDetailConditionStyle: React.CSSProperties = {
  margin: 0,
  color: colors.muted,
  fontSize: 14,
  fontWeight: 850,
};

const weatherDetailIconStyle: React.CSSProperties = {
  width: 68,
  height: 68,
  flex: "0 0 68px",
  display: "grid",
  placeItems: "center",
  borderRadius: 20,
  background: "#FFFAEB",
  fontSize: 38,
};

const weatherDetailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
};

const weatherDetailMetricStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: colors.panel,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 850,
};

const weatherDetailNotesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};

const weatherDetailNoteStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 14,
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: "#FFFFFF",
  color: colors.navy,
  lineHeight: 1.45,
};

const photoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))",
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
