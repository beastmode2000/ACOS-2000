
import type { Screen } from "./atlas-types";

export type AtlasScreen = Screen | "timeline" | "insights";

export const WORKLINK_LOGOS = {
  landscapeHelpAdmin: "",
  landscapeHelp: "",
  control4: "",
  tccHoneywell: "",
  ramp: "",
  metaViewer: "",
} as const;

export const colors = {
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
} as const;

export const screens: { id: AtlasScreen; label: string }[] = [
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

export const logoCandidates = [
  "/atlas-logo.png",
  "/atlas-logo.svg",
  "/logo.png",
  "/icon-512.png",
  "/icon-192.png",
  "/apple-touch-icon.png",
];

export const storageKeys = {
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
