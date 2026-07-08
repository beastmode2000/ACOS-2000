"use client";

import React, { useEffect, useMemo, useState } from "react";

type Screen =
  | "dashboard"
  | "map"
  | "locations"
  | "assets"
  | "work-orders"
  | "vendors"
  | "calendar"
  | "weather"
  | "documents"
  | "procedures"
  | "logs"
  | "assistant"
  | "team";

type AnyRecord = Record<string, unknown>;

type AtlasPayload = {
  ok?: boolean;
  source?: string;
  apiVersion?: string;
  error?: string;
  assetRecords?: AnyRecord[];
  vendorRecords?: AnyRecord[];
  serviceRecords?: AnyRecord[];
  calendarItems?: AnyRecord[];
  locationRecords?: AnyRecord[];
  documentRecords?: AnyRecord[];
  procedureRecords?: AnyRecord[];
  photoRecords?: AnyRecord[];
};

type WorkOrderForm = {
  id: string;
  title: string;
  assetId: string;
  vendorId: string;
  date: string;
  status: string;
  priority: string;
  notes: string;
  followUpDate: string;

  isRecurring: boolean;
  recurrenceFrequency: string;
  recurrenceInterval: string;
  recurrenceDays: string;
  recurrenceNextDue: string;
  recurrenceEndType: string;
  recurrenceEndDate: string;

  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: string;
  invoiceStatus: string;
  paymentStatus: string;
  costCategory: string;
  approvedBy: string;
  approvedDate: string;
  costNotes: string;
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
  green: "#067647",
  red: "#B42318",
  blue: "#175CD3",
};

const navItems: { key: Screen; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "map", label: "Map" },
  { key: "locations", label: "Locations" },
  { key: "assets", label: "Assets" },
  { key: "work-orders", label: "Work Orders" },
  { key: "vendors", label: "Vendors" },
  { key: "calendar", label: "Calendar" },
  { key: "weather", label: "Weather" },
  { key: "documents", label: "Documents / Photos" },
  { key: "procedures", label: "Procedures" },
  { key: "logs", label: "Logs" },
  { key: "assistant", label: "AI Assistant" },
  { key: "team", label: "Team" },
];

const defaultLocations = [
  "Dock",
  "Waterside Lawn (North)",
  "East Lawn",
  "Sport Court",
  "Veggie Boxes",
  "New Garage",
  "Old Garage",
  "ADU",
  "Courtyard",
  "Trampoline / Dog",
  "Original House",
  "Addition",
  "Hot Tub",
  "Mechanical Room",
  "Pool",
  "Pool Changing Room",
  "Pool Equipment Room",
];

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

const workOrderStatusOptions = ["Open", "Scheduled", "Monitor", "Completed"];
const workOrderPriorityOptions = ["Low", "Medium", "High"];
const recurrenceOptions = ["Daily", "Weekly", "Every 2 Weeks", "Monthly", "Seasonal", "Custom"];
const invoiceStatusOptions = ["not added", "received", "approved", "question", "rejected"];
const paymentStatusOptions = ["unknown", "unpaid", "paid", "hold"];

function value(record: AnyRecord | undefined, ...keys: string[]) {
  if (!record) return "";
  for (const key of keys) {
    const item = record[key];
    if (item === null || item === undefined) continue;
    const text = String(item).trim();
    if (text) return text;
  }
  return "";
}

function firstText(...items: unknown[]) {
  for (const item of items) {
    if (item === null || item === undefined) continue;
    const text = String(item).trim();
    if (text) return text;
  }
  return "";
}

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputValue(raw: unknown) {
  const text = firstText(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return "";
}

function safeDate(raw: unknown) {
  const text = firstText(raw);
  if (!text) return "No date";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function safeMoney(raw: unknown) {
  const text = firstText(raw);
  if (!text) return "";
  const amount = Number(text);
  if (Number.isNaN(amount)) return text;
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function hasSearch(record: AnyRecord, terms: string[]) {
  if (!terms.length) return true;
  const haystack = Object.values(record).map((item) => firstText(item).toLowerCase()).join(" ");
  return terms.every((term) => haystack.includes(term));
}

function priorityRank(priority: string) {
  const lower = priority.toLowerCase();
  if (lower === "high") return 1;
  if (lower === "medium") return 2;
  if (lower === "low") return 3;
  return 4;
}

function statusStyle(text: string): React.CSSProperties {
  const lower = text.toLowerCase();
  let color = colors.navy;
  let background = "rgba(201,154,61,0.12)";
  let border = "rgba(201,154,61,0.28)";

  if (lower.includes("complete") || lower.includes("paid") || lower.includes("online") || lower.includes("active")) {
    color = colors.green;
    background = "rgba(6,118,71,0.10)";
    border = "rgba(6,118,71,0.22)";
  }

  if (lower.includes("open") || lower.includes("high") || lower.includes("urgent") || lower.includes("overdue") || lower.includes("unpaid")) {
    color = colors.red;
    background = "rgba(180,35,24,0.10)";
    border = "rgba(180,35,24,0.22)";
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    color,
    background,
    border: `1px solid ${border}`,
    whiteSpace: "nowrap",
    maxWidth: "100%",
  };
}

function blankWorkOrder(date = localDateKey()): WorkOrderForm {
  return {
    id: "",
    title: "",
    assetId: "",
    vendorId: "",
    date,
    status: "Open",
    priority: "Medium",
    notes: "",
    followUpDate: "",

    isRecurring: false,
    recurrenceFrequency: "Weekly",
    recurrenceInterval: "1",
    recurrenceDays: "",
    recurrenceNextDue: date,
    recurrenceEndType: "never",
    recurrenceEndDate: "",

    invoiceNumber: "",
    invoiceDate: "",
    invoiceAmount: "",
    invoiceStatus: "not added",
    paymentStatus: "unknown",
    costCategory: "",
    approvedBy: "",
    approvedDate: "",
    costNotes: "",
  };
}

function workOrderToForm(record?: AnyRecord): WorkOrderForm {
  if (!record) return blankWorkOrder();

  const date = dateInputValue(value(record, "date", "workDate", "work_date")) || localDateKey();

  return {
    id: value(record, "id"),
    title: value(record, "title", "summary", "name"),
    assetId: value(record, "assetId", "asset_id"),
    vendorId: value(record, "vendorId", "vendor_id"),
    date,
    status: value(record, "status") || "Open",
    priority: value(record, "priority") || "Medium",
    notes: value(record, "notes", "description"),
    followUpDate: dateInputValue(value(record, "followUpDate", "follow_up_date")),

    isRecurring: value(record, "isRecurring", "is_recurring") === "true" || value(record, "isRecurring", "is_recurring") === "1",
    recurrenceFrequency: value(record, "recurrenceFrequency", "recurrence_frequency") || "Weekly",
    recurrenceInterval: value(record, "recurrenceInterval", "recurrence_interval") || "1",
    recurrenceDays: value(record, "recurrenceDays", "recurrence_days"),
    recurrenceNextDue: dateInputValue(value(record, "recurrenceNextDue", "recurrence_next_due")) || date,
    recurrenceEndType: value(record, "recurrenceEndType", "recurrence_end_type") || "never",
    recurrenceEndDate: dateInputValue(value(record, "recurrenceEndDate", "recurrence_end_date")),

    invoiceNumber: value(record, "invoiceNumber", "invoice_number"),
    invoiceDate: dateInputValue(value(record, "invoiceDate", "invoice_date")),
    invoiceAmount: value(record, "invoiceAmount", "invoice_amount"),
    invoiceStatus: value(record, "invoiceStatus", "invoice_status") || "not added",
    paymentStatus: value(record, "paymentStatus", "payment_status") || "unknown",
    costCategory: value(record, "costCategory", "cost_category"),
    approvedBy: value(record, "approvedBy", "approved_by"),
    approvedDate: dateInputValue(value(record, "approvedDate", "approved_date")),
    costNotes: value(record, "costNotes", "cost_notes"),
  };
}

function formToWorkOrder(form: WorkOrderForm): AnyRecord {
  const title = form.title.trim();
  const id = form.id || `wo-${Date.now()}`;

  return {
    id,
    title,
    assetId: form.assetId,
    vendorId: form.vendorId,
    date: form.date || localDateKey(),
    workDate: form.date || localDateKey(),
    status: form.status || "Open",
    priority: form.priority || "Medium",
    notes: form.notes.trim(),
    followUpDate: form.followUpDate,

    isRecurring: form.isRecurring,
    recurrenceFrequency: form.recurrenceFrequency || "Weekly",
    recurrenceInterval: Math.max(1, Number(form.recurrenceInterval || 1)),
    recurrenceDays: form.recurrenceDays,
    recurrenceNextDue: form.recurrenceNextDue || form.followUpDate || form.date,
    recurrenceEndType: form.recurrenceEndType || "never",
    recurrenceEndDate: form.recurrenceEndDate,
    recurrenceStatus: form.isRecurring ? "active" : "inactive",

    invoiceNumber: form.invoiceNumber.trim(),
    invoiceDate: form.invoiceDate,
    invoiceAmount: form.invoiceAmount.trim(),
    invoiceStatus: form.invoiceStatus || "not added",
    paymentStatus: form.paymentStatus || "unknown",
    costCategory: form.costCategory.trim(),
    approvedBy: form.approvedBy.trim(),
    approvedDate: form.approvedDate,
    costNotes: form.costNotes.trim(),
  };
}

export default function AtlasPage() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<AtlasPayload>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [databaseStatus, setDatabaseStatus] = useState("Connecting to Atlas...");
  const [isMobile, setIsMobile] = useState(false);

  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const [workOrderRecords, setWorkOrderRecords] = useState<AnyRecord[]>([]);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState("");
  const [workOrderForm, setWorkOrderForm] = useState<WorkOrderForm>(() => blankWorkOrder());
  const [workOrderMode, setWorkOrderMode] = useState<"edit" | "new">("new");
  const [workOrderTab, setWorkOrderTab] = useState<"todo" | "done" | "all">("todo");
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState("all");
  const [workOrderPriorityFilter, setWorkOrderPriorityFilter] = useState("all");
  const [workOrderSort, setWorkOrderSort] = useState<"priority" | "due" | "newest" | "asset">("priority");

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setApiError("");
        setDatabaseStatus("Loading Atlas records...");
        const response = await fetch("/api/atlas", { cache: "no-store" });
        const data = (await response.json()) as AtlasPayload;
        if (cancelled) return;
        setPayload(data);
        setDatabaseStatus(response.ok && !data.error ? "Atlas records loaded" : "Atlas API needs attention");
        if (!response.ok || data.error) setApiError(data.error || `Atlas API returned ${response.status}`);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Atlas API failed to load";
          setApiError(message);
          setDatabaseStatus(`Load failed: ${message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const assets = useMemo(() => payload.assetRecords ?? [], [payload.assetRecords]);
  const vendors = useMemo(() => payload.vendorRecords ?? [], [payload.vendorRecords]);
  const calendarItems = useMemo(() => payload.calendarItems ?? [], [payload.calendarItems]);
  const documents = useMemo(() => [...(payload.documentRecords ?? []), ...(payload.photoRecords ?? [])], [payload.documentRecords, payload.photoRecords]);
  const procedures = useMemo(() => payload.procedureRecords ?? [], [payload.procedureRecords]);

  useEffect(() => {
    const incoming = payload.serviceRecords ?? [];
    setWorkOrderRecords(incoming);

    if (incoming.length && !selectedWorkOrderId) {
      setSelectedWorkOrderId(value(incoming[0], "id"));
      setWorkOrderForm(workOrderToForm(incoming[0]));
      setWorkOrderMode("edit");
    }

    if (!incoming.length && !selectedWorkOrderId) {
      setWorkOrderForm(blankWorkOrder());
      setWorkOrderMode("new");
    }
  }, [payload.serviceRecords, selectedWorkOrderId]);

  const assetById = useMemo(() => {
    const map = new Map<string, AnyRecord>();
    assets.forEach((asset) => {
      const id = value(asset, "id");
      if (id) map.set(id, asset);
    });
    return map;
  }, [assets]);

  const vendorById = useMemo(() => {
    const map = new Map<string, AnyRecord>();
    vendors.forEach((vendor) => {
      const id = value(vendor, "id");
      if (id) map.set(id, vendor);
    });
    return map;
  }, [vendors]);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const locationNames = useMemo(() => {
    const names = new Set(defaultLocations);
    payload.locationRecords?.forEach((location) => {
      const name = value(location, "name", "location", "title");
      if (name) names.add(name);
    });
    assets.forEach((asset) => {
      const location = value(asset, "location", "locationName", "location_name", "locationId", "location_id");
      if (location) names.add(location);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [assets, payload.locationRecords]);

  const filteredAssets = useMemo(() => assets.filter((asset) => hasSearch(asset, terms)), [assets, terms]);
  const filteredVendors = useMemo(() => vendors.filter((vendor) => hasSearch(vendor, terms)), [vendors, terms]);

  const filteredWorkOrders = useMemo(() => {
    return workOrderRecords
      .filter((wo) => {
        const linkedAsset = assetById.get(value(wo, "assetId", "asset_id"));
        const linkedVendor = vendorById.get(value(wo, "vendorId", "vendor_id"));

        const status = value(wo, "status") || "Open";
        const priority = value(wo, "priority") || "Medium";

        const matchesTab =
          workOrderTab === "all" ||
          (workOrderTab === "done" ? status === "Completed" : status !== "Completed");

        const matchesStatus = workOrderStatusFilter === "all" || status === workOrderStatusFilter;
        const matchesPriority = workOrderPriorityFilter === "all" || priority === workOrderPriorityFilter;

        const searchRecord: AnyRecord = {
          ...wo,
          linkedAsset: value(linkedAsset, "name"),
          linkedVendor: value(linkedVendor, "name"),
        };

        return matchesTab && matchesStatus && matchesPriority && hasSearch(searchRecord, terms);
      })
      .sort((a, b) => {
        if (workOrderSort === "priority") {
          return priorityRank(value(a, "priority") || "Medium") - priorityRank(value(b, "priority") || "Medium");
        }

        if (workOrderSort === "due") {
          return value(a, "followUpDate", "follow_up_date", "date", "workDate", "work_date").localeCompare(
            value(b, "followUpDate", "follow_up_date", "date", "workDate", "work_date"),
          );
        }

        if (workOrderSort === "asset") {
          const assetA = assetById.get(value(a, "assetId", "asset_id"));
          const assetB = assetById.get(value(b, "assetId", "asset_id"));
          return value(assetA, "name").localeCompare(value(assetB, "name"));
        }

        return value(b, "date", "workDate", "work_date").localeCompare(value(a, "date", "workDate", "work_date"));
      });
  }, [
    workOrderRecords,
    assetById,
    vendorById,
    terms,
    workOrderTab,
    workOrderStatusFilter,
    workOrderPriorityFilter,
    workOrderSort,
  ]);

  const selectedAsset = useMemo(() => {
    if (selectedAssetId && assetById.has(selectedAssetId)) return assetById.get(selectedAssetId);
    return filteredAssets[0];
  }, [selectedAssetId, assetById, filteredAssets]);

  const selectedVendor = useMemo(() => {
    if (selectedVendorId && vendorById.has(selectedVendorId)) return vendorById.get(selectedVendorId);
    return filteredVendors[0];
  }, [selectedVendorId, vendorById, filteredVendors]);

  async function postAtlasRecord(table: string, record: unknown) {
    try {
      setDatabaseStatus("Saving to Neon...");
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, record }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Database save failed");
      }

      setDatabaseStatus("Saved to Neon");
      return true;
    } catch (error) {
      setDatabaseStatus(error instanceof Error ? `Neon save failed: ${error.message}` : "Neon save failed");
      return false;
    }
  }

  async function deleteAtlasRecord(table: string, id: string) {
    try {
      setDatabaseStatus("Deleting from Neon...");
      const response = await fetch("/api/atlas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Database delete failed");
      }

      setDatabaseStatus("Deleted from Neon");
      return true;
    } catch (error) {
      setDatabaseStatus(error instanceof Error ? `Neon delete failed: ${error.message}` : "Neon delete failed");
      return false;
    }
  }

  function openSearch(nextScreen: Screen, search: string) {
    setQuery(search);
    setScreen(nextScreen);
  }

  function clearSearchAndOpen(nextScreen: Screen) {
    setQuery("");
    setScreen(nextScreen);
  }

  function selectWorkOrder(record: AnyRecord) {
    setSelectedWorkOrderId(value(record, "id"));
    setWorkOrderForm(workOrderToForm(record));
    setWorkOrderMode("edit");
  }

  function startNewWorkOrder() {
    setSelectedWorkOrderId("");
    setWorkOrderForm(blankWorkOrder());
    setWorkOrderMode("new");
  }

  function saveWorkOrder(nextForm = workOrderForm) {
    const title = nextForm.title.trim();
    if (!title) {
      setDatabaseStatus("Work order needs a title before saving");
      return;
    }

    const clean = formToWorkOrder({ ...nextForm, title });
    const id = value(clean, "id");

    setWorkOrderRecords((current) => {
      const exists = current.some((record) => value(record, "id") === id);
      const next = exists ? current.map((record) => (value(record, "id") === id ? clean : record)) : [clean, ...current];
      return next;
    });

    setSelectedWorkOrderId(id);
    setWorkOrderForm(workOrderToForm(clean));
    setWorkOrderMode("edit");
    void postAtlasRecord("work_orders", clean);
  }

  function deleteWorkOrder() {
    if (!workOrderForm.id) return;
    const confirmed = window.confirm(`Delete work order: ${workOrderForm.title || "Untitled Work Order"}?`);
    if (!confirmed) return;

    const idToDelete = workOrderForm.id;
    const remaining = workOrderRecords.filter((record) => value(record, "id") !== idToDelete);
    setWorkOrderRecords(remaining);

    const nextRecord = remaining[0];
    setSelectedWorkOrderId(nextRecord ? value(nextRecord, "id") : "");
    setWorkOrderForm(nextRecord ? workOrderToForm(nextRecord) : blankWorkOrder());
    setWorkOrderMode(nextRecord ? "edit" : "new");

    void deleteAtlasRecord("work_orders", idToDelete);
  }

  function markWorkOrderDone() {
    saveWorkOrder({ ...workOrderForm, status: "Completed" });
    setWorkOrderTab("done");
  }

  function reopenWorkOrder() {
    saveWorkOrder({ ...workOrderForm, status: "Open" });
    setWorkOrderTab("todo");
  }

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <main style={pageStyle}>
        <div style={{ ...appGridStyle, gridTemplateColumns: isMobile ? "1fr" : "270px minmax(0, 1fr)" }}>
          <aside style={{ ...sidebarStyle, position: isMobile ? "relative" : "sticky", height: isMobile ? "auto" : "calc(100vh - 40px)" }}>
            <div style={brandRowStyle}>
              <div style={brandMarkStyle}>A</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 1000 }}>ATLAS</div>
                <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>2000</div>
              </div>
            </div>

            <nav style={{ ...navGridStyle, gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr" }}>
              {navItems.map((item) => {
                const active = screen === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => clearSearchAndOpen(item.key)}
                    style={{ ...navButtonStyle, ...(active ? navButtonActiveStyle : {}) }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section style={{ display: "grid", gap: 16, minWidth: 0 }}>
            <header style={{ ...heroStyle, padding: isMobile ? 18 : 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={eyebrowStyle}>ATLAS / 2000</div>
                  <h1 style={{ margin: "8px 0 6px", fontSize: isMobile ? 42 : 60, lineHeight: 0.95, letterSpacing: -2 }}>
                    Estate Operations
                  </h1>
                  <div style={{ color: "rgba(255,255,255,0.76)", fontSize: 15 }}>
                    Mobile-safe Atlas command center with improved Work Orders.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: isMobile ? "start" : "end" }}>
                  <span style={statusStyle(apiError ? "API Error" : loading ? "Loading" : "Online")}>{apiError ? "API Error" : loading ? "Loading" : "Online"}</span>
                  <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>Source: {payload.source || "Atlas API"}</div>
                  <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>{databaseStatus}</div>
                </div>
              </div>
            </header>

            <div style={searchCardStyle}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Atlas records..." style={inputStyle} />
              {query ? (
                <button type="button" onClick={() => setQuery("")} style={secondaryButtonStyle}>
                  Clear Search
                </button>
              ) : null}
            </div>

            {apiError ? <div style={errorBoxStyle}>Atlas API warning: {apiError}</div> : null}
            {children}
          </section>
        </div>
      </main>
    );
  }

  function Title({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={goldEyebrowStyle}>{eyebrow}</div>
        <h2 style={{ margin: "6px 0 4px", color: colors.navy, fontSize: isMobile ? 30 : 42, lineHeight: 1.03 }}>{title}</h2>
        {subtitle ? <div style={{ color: colors.muted, lineHeight: 1.45 }}>{subtitle}</div> : null}
      </div>
    );
  }

  function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ ...cardStyle, padding: isMobile ? 14 : 18, ...style }}>{children}</div>;
  }

  function MetricCard({ label, count, next }: { label: string; count: number; next: Screen }) {
    return (
      <button type="button" onClick={() => clearSearchAndOpen(next)} style={metricCardStyle}>
        <div style={{ color: colors.muted, fontSize: 12, fontWeight: 950 }}>{label}</div>
        <div style={{ color: colors.navy, fontSize: 36, fontWeight: 1000, marginTop: 6 }}>{count}</div>
      </button>
    );
  }

  function Detail({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={detailCellStyle}>
        <div style={labelStyle}>{label}</div>
        <div style={{ color: colors.navy, fontWeight: 900, marginTop: 5, wordBreak: "break-word" }}>{children || "—"}</div>
      </div>
    );
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <div style={labelStyle}>{label}</div>
        {children}
      </label>
    );
  }

  function RowButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} style={{ ...rowButtonStyle, border: active ? `2px solid ${colors.gold}` : `1px solid ${colors.border}` }}>
        {children}
      </button>
    );
  }

  function Empty({ children }: { children: React.ReactNode }) {
    return <div style={emptyStyle}>{children}</div>;
  }

  function Dashboard() {
    const openWorkOrders = workOrderRecords.filter((wo) => value(wo, "status") !== "Completed");
    const doneWorkOrders = workOrderRecords.filter((wo) => value(wo, "status") === "Completed");
    const unassignedAssets = assets.filter((asset) => !value(asset, "location", "locationName", "location_name", "locationId", "location_id"));

    return (
      <Card>
        <Title eyebrow="Dashboard" title="Atlas Overview" subtitle="All core departments are mobile-safe and connected to the existing Atlas API." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
          <MetricCard label="Assets" count={assets.length} next="assets" />
          <MetricCard label="To Do" count={openWorkOrders.length} next="work-orders" />
          <MetricCard label="Done" count={doneWorkOrders.length} next="work-orders" />
          <MetricCard label="Vendors" count={vendors.length} next="vendors" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginTop: 16 }}>
          <Card style={{ boxShadow: "none" }}>
            <h3 style={h3Style}>Open Work Orders</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {openWorkOrders.slice(0, 6).map((wo, index) => {
                const asset = assetById.get(value(wo, "assetId", "asset_id"));
                return (
                  <div key={value(wo, "id") || index} style={compactRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <div style={rowTitleStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</div>
                      <div style={rowSubStyle}>{safeDate(value(wo, "followUpDate", "follow_up_date", "date", "workDate", "work_date"))} · {value(asset, "name") || "No linked asset"}</div>
                    </div>
                    <span style={statusStyle(value(wo, "priority") || "Medium")}>{value(wo, "priority") || "Medium"}</span>
                  </div>
                );
              })}
              {!openWorkOrders.length ? <Empty>No open work orders found.</Empty> : null}
            </div>
          </Card>

          <Card style={{ boxShadow: "none" }}>
            <h3 style={h3Style}>Data Health</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={compactRowStyle}>
                <div>
                  <div style={rowTitleStyle}>Unassigned Assets</div>
                  <div style={rowSubStyle}>Location cleanup check</div>
                </div>
                <span style={statusStyle(unassignedAssets.length ? "Review" : "Complete")}>{unassignedAssets.length}</span>
              </div>
              <div style={compactRowStyle}>
                <div>
                  <div style={rowTitleStyle}>Database Status</div>
                  <div style={rowSubStyle}>{databaseStatus}</div>
                </div>
                <span style={statusStyle(apiError ? "Error" : "Online")}>{apiError ? "Error" : "Online"}</span>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    );
  }

  function MapScreen() {
    return (
      <Card>
        <Title eyebrow="Property Map" title="2000 Map" subtitle={isMobile ? "Swipe left and right inside the map box. Labels stay readable on iPhone." : "Locked property map with Atlas labels."} />
        <div style={mapViewportStyle}>
          <div style={{ ...mapCanvasStyle, width: isMobile ? 820 : "100%", minWidth: isMobile ? 820 : 0 }}>
            <img src="/atlas-property-map.png" alt="Atlas property map" draggable={false} style={mapImageStyle} />
            {mapLabels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => openSearch("assets", label.label)}
                style={{
                  ...mapPinStyle,
                  top: `${label.y}%`,
                  left: `${label.x}%`,
                  fontSize: isMobile ? 11 : 12,
                  padding: isMobile ? "6px 8px" : "8px 10px",
                }}
              >
                {label.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function Locations() {
    const activeLocation = selectedLocation || locationNames[0] || "";
    const relatedAssets = assets.filter((asset) => value(asset, "location", "locationName", "location_name", "locationId", "location_id").toLowerCase() === activeLocation.toLowerCase());
    const relatedWorkOrders = workOrderRecords.filter((wo) => {
      const asset = assetById.get(value(wo, "assetId", "asset_id"));
      return value(asset, "location", "locationName", "location_name", "locationId", "location_id").toLowerCase() === activeLocation.toLowerCase();
    });

    return (
      <Card>
        <Title eyebrow="Locations" title={`${locationNames.length} Locations`} subtitle="Alphabetical location hub with related assets and work orders." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.8fr 1.2fr", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {locationNames.map((name) => (
              <RowButton key={name} active={name === activeLocation} onClick={() => setSelectedLocation(name)}>
                <div style={rowTitleStyle}>{name}</div>
                <div style={rowSubStyle}>{assets.filter((asset) => value(asset, "location", "locationName", "location_name", "locationId", "location_id").toLowerCase() === name.toLowerCase()).length} assets</div>
              </RowButton>
            ))}
          </div>
          <Card style={{ boxShadow: "none" }}>
            <h3 style={h3Style}>{activeLocation || "Location"}</h3>
            <div style={detailGridStyle}>
              <Detail label="Assets">{relatedAssets.length}</Detail>
              <Detail label="Work Orders">{relatedWorkOrders.length}</Detail>
            </div>
            <h4 style={h4Style}>Related Assets</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {relatedAssets.slice(0, 10).map((asset, index) => (
                <button key={value(asset, "id") || index} type="button" onClick={() => { setSelectedAssetId(value(asset, "id")); setScreen("assets"); }} style={miniButtonStyle}>{value(asset, "name") || "Unnamed Asset"}</button>
              ))}
              {!relatedAssets.length ? <Empty>No assets found for this location.</Empty> : null}
            </div>
          </Card>
        </div>
      </Card>
    );
  }

  function Assets() {
    return (
      <Card>
        <Title eyebrow="Assets" title={`${filteredAssets.length} Assets`} subtitle="Mobile-safe asset list with make, model, serial, location, notes, and linked records." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr", gap: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredAssets.map((asset, index) => {
              const id = value(asset, "id") || String(index);
              return (
                <RowButton key={id} active={value(selectedAsset, "id") === value(asset, "id")} onClick={() => setSelectedAssetId(value(asset, "id"))}>
                  <div style={rowTitleStyle}>{value(asset, "name") || "Unnamed Asset"}</div>
                  <div style={rowSubStyle}>{value(asset, "location", "locationName", "location_name", "locationId", "location_id") || "No location"} · {value(asset, "make", "manufacturer") || "No make"} {value(asset, "model")}</div>
                  <div style={{ marginTop: 8 }}><span style={statusStyle(value(asset, "status", "category") || "Asset")}>{value(asset, "status", "category") || "Asset"}</span></div>
                </RowButton>
              );
            })}
            {!filteredAssets.length ? <Empty>No matching assets.</Empty> : null}
          </div>
          <AssetDetail asset={selectedAsset} />
        </div>
      </Card>
    );
  }

  function AssetDetail({ asset }: { asset?: AnyRecord }) {
    const assetId = value(asset, "id");
    const relatedWorkOrders = workOrderRecords.filter((wo) => value(wo, "assetId", "asset_id") === assetId);
    if (!asset) return <Empty>Select an asset.</Empty>;
    return (
      <Card style={{ boxShadow: "none" }}>
        <div style={goldEyebrowStyle}>Asset Detail</div>
        <h3 style={detailTitleStyle}>{value(asset, "name") || "Unnamed Asset"}</h3>
        <div style={detailGridStyle}>
          <Detail label="Location">{value(asset, "location", "locationName", "location_name", "locationId", "location_id")}</Detail>
          <Detail label="Category">{value(asset, "category")}</Detail>
          <Detail label="Status">{value(asset, "status")}</Detail>
          <Detail label="Make">{value(asset, "make", "manufacturer")}</Detail>
          <Detail label="Model">{value(asset, "model")}</Detail>
          <Detail label="Serial">{value(asset, "serial", "serialNumber", "serial_number")}</Detail>
        </div>
        <h4 style={h4Style}>Notes</h4>
        <div style={notesStyle}>{value(asset, "notes", "description") || "No notes saved."}</div>
        <h4 style={h4Style}>Related Work Orders</h4>
        <div style={{ display: "grid", gap: 8 }}>
          {relatedWorkOrders.slice(0, 8).map((wo, index) => (
            <button key={value(wo, "id") || index} type="button" onClick={() => { selectWorkOrder(wo); setScreen("work-orders"); }} style={miniButtonStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</button>
          ))}
          {!relatedWorkOrders.length ? <Empty>No linked work orders.</Empty> : null}
        </div>
      </Card>
    );
  }

  function WorkOrders() {
    const todoCount = workOrderRecords.filter((record) => value(record, "status") !== "Completed").length;
    const doneCount = workOrderRecords.filter((record) => value(record, "status") === "Completed").length;

    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Title eyebrow="Work Orders" title={`${filteredWorkOrders.length} Work Orders`} subtitle="To Do / Done split, filters, add/edit form, priority, recurring, invoice, cost, and Neon save." />
          <button type="button" onClick={startNewWorkOrder} style={primaryButtonStyle}>+ New Work Order</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "390px minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
          <section style={workOrderBoardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${colors.border}` }}>
              <button type="button" onClick={() => setWorkOrderTab("todo")} style={tabButtonStyle(workOrderTab === "todo")}>To Do {todoCount}</button>
              <button type="button" onClick={() => setWorkOrderTab("done")} style={tabButtonStyle(workOrderTab === "done")}>Done {doneCount}</button>
              <button type="button" onClick={() => setWorkOrderTab("all")} style={tabButtonStyle(workOrderTab === "all")}>All {workOrderRecords.length}</button>
            </div>

            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={workOrderStatusFilter} onChange={(event) => setWorkOrderStatusFilter(event.target.value)} style={filterStyle}>
                  <option value="all">All status</option>
                  {workOrderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>

                <select value={workOrderPriorityFilter} onChange={(event) => setWorkOrderPriorityFilter(event.target.value)} style={filterStyle}>
                  <option value="all">All priority</option>
                  {workOrderPriorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>

              <select value={workOrderSort} onChange={(event) => setWorkOrderSort(event.target.value as "priority" | "due" | "newest" | "asset")} style={filterStyle}>
                <option value="priority">Sort: Priority</option>
                <option value="due">Sort: Due Date</option>
                <option value="newest">Sort: Newest</option>
                <option value="asset">Sort: Asset</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setWorkOrderStatusFilter("all");
                  setWorkOrderPriorityFilter("all");
                  setWorkOrderSort("priority");
                }}
                style={secondaryButtonStyle}
              >
                Clear Work Order Filters
              </button>

              <div style={{ display: "grid", gap: 10 }}>
                {filteredWorkOrders.map((wo, index) => {
                  const id = value(wo, "id") || String(index);
                  const asset = assetById.get(value(wo, "assetId", "asset_id"));
                  const active = selectedWorkOrderId === value(wo, "id");

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectWorkOrder(wo)}
                      style={{ ...workOrderCardButtonStyle, border: active ? `2px solid ${colors.gold}` : `1px solid ${colors.border}` }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={rowTitleStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</div>
                          <div style={rowSubStyle}>
                            {safeDate(value(wo, "followUpDate", "follow_up_date", "date", "workDate", "work_date"))} · {value(asset, "name") || "No linked asset"}
                          </div>
                        </div>
                        <span style={statusStyle(value(wo, "priority") || "Medium")}>{value(wo, "priority") || "Medium"}</span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        <span style={statusStyle(value(wo, "status") || "Open")}>{value(wo, "status") || "Open"}</span>
                        {value(wo, "isRecurring", "is_recurring") === "true" || value(wo, "recurrenceFrequency", "recurrence_frequency") ? <span style={statusStyle("Recurring")}>Recurring</span> : null}
                        {value(wo, "invoiceAmount", "invoice_amount") ? <span style={statusStyle(value(wo, "paymentStatus", "payment_status") || "Invoice")}>{safeMoney(value(wo, "invoiceAmount", "invoice_amount"))}</span> : null}
                      </div>
                    </button>
                  );
                })}

                {!filteredWorkOrders.length ? <Empty>No work orders match this view.</Empty> : null}
              </div>
            </div>
          </section>

          <WorkOrderEditor />
        </div>
      </Card>
    );
  }

  function WorkOrderEditor() {
    const selectedAsset = assetById.get(workOrderForm.assetId);
    const selectedVendor = vendorById.get(workOrderForm.vendorId);

    return (
      <section style={workOrderEditorStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={goldEyebrowStyle}>{workOrderMode === "new" ? "New Work Order" : "Edit Work Order"}</div>
            <h3 style={detailTitleStyle}>{workOrderForm.title || "Untitled Work Order"}</h3>
          </div>
          <span style={statusStyle(databaseStatus.includes("failed") ? "Save issue" : workOrderMode === "new" ? "New" : "Editing")}>
            {workOrderMode === "new" ? "New" : "Editing"}
          </span>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Card style={{ boxShadow: "none" }}>
            <h4 style={h4Style}>Main Work Order</h4>

            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Title">
                <input
                  value={workOrderForm.title}
                  onChange={(event) => setWorkOrderForm((current) => ({ ...current, title: event.target.value }))}
                  style={inputStyle}
                  placeholder="Example: Check pool pump leak"
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
                <Field label="Date">
                  <input
                    type="date"
                    value={workOrderForm.date}
                    onChange={(event) => setWorkOrderForm((current) => ({ ...current, date: event.target.value }))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Status">
                  <select value={workOrderForm.status} onChange={(event) => setWorkOrderForm((current) => ({ ...current, status: event.target.value }))} style={inputStyle}>
                    {workOrderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </Field>

                <Field label="Priority">
                  <select value={workOrderForm.priority} onChange={(event) => setWorkOrderForm((current) => ({ ...current, priority: event.target.value }))} style={inputStyle}>
                    {workOrderPriorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <Field label="Asset">
                  <select value={workOrderForm.assetId} onChange={(event) => setWorkOrderForm((current) => ({ ...current, assetId: event.target.value }))} style={inputStyle}>
                    <option value="">No linked asset</option>
                    {assets.map((asset) => (
                      <option key={value(asset, "id")} value={value(asset, "id")}>
                        {value(asset, "name") || "Unnamed Asset"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Vendor">
                  <select value={workOrderForm.vendorId} onChange={(event) => setWorkOrderForm((current) => ({ ...current, vendorId: event.target.value }))} style={inputStyle}>
                    <option value="">Internal / no vendor</option>
                    {vendors.map((vendor) => (
                      <option key={value(vendor, "id")} value={value(vendor, "id")}>
                        {value(vendor, "name") || "Unnamed Vendor"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={workOrderForm.notes}
                  onChange={(event) => setWorkOrderForm((current) => ({ ...current, notes: event.target.value }))}
                  style={textareaStyle}
                  placeholder="Work notes, scope, findings, approvals, next steps..."
                />
              </Field>

              <div style={detailGridStyle}>
                <Detail label="Linked Asset">{value(selectedAsset, "name") || "No linked asset"}</Detail>
                <Detail label="Linked Vendor">{value(selectedVendor, "name") || "Internal / no vendor"}</Detail>
              </div>
            </div>
          </Card>

          <Card style={{ boxShadow: "none" }}>
            <h4 style={h4Style}>Recurring</h4>

            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={workOrderForm.isRecurring}
                onChange={(event) => setWorkOrderForm((current) => ({ ...current, isRecurring: event.target.checked }))}
              />
              <span>Recurring work order</span>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              <Field label="Frequency">
                <select value={workOrderForm.recurrenceFrequency} onChange={(event) => setWorkOrderForm((current) => ({ ...current, recurrenceFrequency: event.target.value }))} style={inputStyle}>
                  {recurrenceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>

              <Field label="Interval">
                <input
                  type="number"
                  min="1"
                  value={workOrderForm.recurrenceInterval}
                  onChange={(event) => setWorkOrderForm((current) => ({ ...current, recurrenceInterval: event.target.value }))}
                  style={inputStyle}
                />
              </Field>

              <Field label="Next Due">
                <input
                  type="date"
                  value={workOrderForm.recurrenceNextDue}
                  onChange={(event) => setWorkOrderForm((current) => ({ ...current, recurrenceNextDue: event.target.value }))}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginTop: 10 }}>
              <Field label="Days / Custom Rule">
                <input
                  value={workOrderForm.recurrenceDays}
                  onChange={(event) => setWorkOrderForm((current) => ({ ...current, recurrenceDays: event.target.value }))}
                  style={inputStyle}
                  placeholder="Example: Mon, Wed, Fri"
                />
              </Field>

              <Field label="End Date">
                <input
                  type="date"
                  value={workOrderForm.recurrenceEndDate}
                  onChange={(event) => setWorkOrderForm((current) => ({ ...current, recurrenceEndDate: event.target.value }))}
                  style={inputStyle}
                />
              </Field>
            </div>
          </Card>

          <Card style={{ boxShadow: "none" }}>
            <h4 style={h4Style}>Invoice / Cost</h4>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Invoice #">
                <input value={workOrderForm.invoiceNumber} onChange={(event) => setWorkOrderForm((current) => ({ ...current, invoiceNumber: event.target.value }))} style={inputStyle} />
              </Field>

              <Field label="Invoice Date">
                <input type="date" value={workOrderForm.invoiceDate} onChange={(event) => setWorkOrderForm((current) => ({ ...current, invoiceDate: event.target.value }))} style={inputStyle} />
              </Field>

              <Field label="Invoice Amount">
                <input inputMode="decimal" value={workOrderForm.invoiceAmount} onChange={(event) => setWorkOrderForm((current) => ({ ...current, invoiceAmount: event.target.value }))} style={inputStyle} placeholder="17210.05" />
              </Field>

              <Field label="Invoice Status">
                <select value={workOrderForm.invoiceStatus} onChange={(event) => setWorkOrderForm((current) => ({ ...current, invoiceStatus: event.target.value }))} style={inputStyle}>
                  {invoiceStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>

              <Field label="Payment Status">
                <select value={workOrderForm.paymentStatus} onChange={(event) => setWorkOrderForm((current) => ({ ...current, paymentStatus: event.target.value }))} style={inputStyle}>
                  {paymentStatusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>

              <Field label="Cost Category">
                <input value={workOrderForm.costCategory} onChange={(event) => setWorkOrderForm((current) => ({ ...current, costCategory: event.target.value }))} style={inputStyle} placeholder="Paint, HVAC, Landscape..." />
              </Field>

              <Field label="Approved By">
                <input value={workOrderForm.approvedBy} onChange={(event) => setWorkOrderForm((current) => ({ ...current, approvedBy: event.target.value }))} style={inputStyle} />
              </Field>

              <Field label="Approved Date">
                <input type="date" value={workOrderForm.approvedDate} onChange={(event) => setWorkOrderForm((current) => ({ ...current, approvedDate: event.target.value }))} style={inputStyle} />
              </Field>
            </div>

            <Field label="Cost Notes">
              <textarea value={workOrderForm.costNotes} onChange={(event) => setWorkOrderForm((current) => ({ ...current, costNotes: event.target.value }))} style={{ ...textareaStyle, minHeight: 90 }} />
            </Field>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
            <button type="button" onClick={() => saveWorkOrder()} style={primaryButtonStyle}>
              {workOrderMode === "new" ? "Save New Work Order" : "Save Work Order"}
            </button>

            {workOrderForm.status === "Completed" ? (
              <button type="button" onClick={reopenWorkOrder} style={secondaryButtonStyle}>Reopen</button>
            ) : (
              <button type="button" onClick={markWorkOrderDone} style={secondaryButtonStyle}>Mark Done</button>
            )}

            <button type="button" onClick={deleteWorkOrder} style={dangerButtonStyle} disabled={!workOrderForm.id}>
              Delete
            </button>
          </div>
        </div>
      </section>
    );
  }

  function Vendors() {
    return (
      <Card>
        <Title eyebrow="Vendors" title={`${filteredVendors.length} Vendors`} subtitle="Vendor contacts and service history reference." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr", gap: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredVendors.map((vendor, index) => (
              <RowButton key={value(vendor, "id") || index} active={value(selectedVendor, "id") === value(vendor, "id")} onClick={() => setSelectedVendorId(value(vendor, "id"))}>
                <div style={rowTitleStyle}>{value(vendor, "name") || "Unnamed Vendor"}</div>
                <div style={rowSubStyle}>{value(vendor, "category") || "Vendor"} · {value(vendor, "phone", "email") || "No contact"}</div>
              </RowButton>
            ))}
            {!filteredVendors.length ? <Empty>No matching vendors.</Empty> : null}
          </div>
          <VendorDetail vendor={selectedVendor} />
        </div>
      </Card>
    );
  }

  function VendorDetail({ vendor }: { vendor?: AnyRecord }) {
    if (!vendor) return <Empty>Select a vendor.</Empty>;
    const vendorId = value(vendor, "id");
    const relatedWorkOrders = workOrderRecords.filter((wo) => value(wo, "vendorId", "vendor_id") === vendorId);
    return (
      <Card style={{ boxShadow: "none" }}>
        <div style={goldEyebrowStyle}>Vendor Detail</div>
        <h3 style={detailTitleStyle}>{value(vendor, "name") || "Unnamed Vendor"}</h3>
        <div style={detailGridStyle}>
          <Detail label="Category">{value(vendor, "category")}</Detail>
          <Detail label="Phone">{value(vendor, "phone")}</Detail>
          <Detail label="Email">{value(vendor, "email")}</Detail>
          <Detail label="Website">{value(vendor, "website")}</Detail>
        </div>
        <h4 style={h4Style}>Notes</h4>
        <div style={notesStyle}>{value(vendor, "notes", "description") || "No notes saved."}</div>
        <h4 style={h4Style}>Related Work Orders</h4>
        <div style={{ display: "grid", gap: 8 }}>
          {relatedWorkOrders.slice(0, 8).map((wo, index) => <button key={value(wo, "id") || index} type="button" onClick={() => { selectWorkOrder(wo); setScreen("work-orders"); }} style={miniButtonStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</button>)}
          {!relatedWorkOrders.length ? <Empty>No linked work orders.</Empty> : null}
        </div>
      </Card>
    );
  }

  function Calendar() {
    const sorted = [...calendarItems].sort((a, b) => value(a, "date", "start", "startDate", "start_date").localeCompare(value(b, "date", "start", "startDate", "start_date")));
    return (
      <Card>
        <Title eyebrow="Calendar" title={`${sorted.length} Calendar Items`} subtitle="Simple mobile-safe calendar list from Atlas records." />
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((item, index) => (
            <div key={value(item, "id") || index} style={compactRowStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={rowTitleStyle}>{value(item, "title", "name") || "Calendar Item"}</div>
                <div style={rowSubStyle}>{safeDate(value(item, "date", "start", "startDate", "start_date"))} {value(item, "area", "location") ? `· ${value(item, "area", "location")}` : ""}</div>
              </div>
              <span style={statusStyle(value(item, "status") || "Scheduled")}>{value(item, "status") || "Scheduled"}</span>
            </div>
          ))}
          {!sorted.length ? <Empty>No calendar records found.</Empty> : null}
        </div>
      </Card>
    );
  }

  function Weather() {
    return (
      <Card>
        <Title eyebrow="Weather" title="Weather" subtitle="Weather module placeholder kept stable so the app builds." />
        <div style={emptyStyle}>Weather panel is available as a department.</div>
      </Card>
    );
  }

  function Documents() {
    return (
      <Card>
        <Title eyebrow="Documents / Photos" title={`${documents.length} Records`} subtitle="Visible document/photo records from the Atlas API if present." />
        <RecordGrid records={documents} empty="No document or photo records found." />
      </Card>
    );
  }

  function Procedures() {
    return (
      <Card>
        <Title eyebrow="Procedures" title={`${procedures.length} Procedures`} subtitle="Procedure records from Atlas API if present." />
        <RecordGrid records={procedures} empty="No procedure records found." />
      </Card>
    );
  }

  function Logs() {
    return (
      <Card>
        <Title eyebrow="Logs" title="Operations Logs" subtitle="Recent work order notes and history records." />
        <RecordGrid records={workOrderRecords.slice(0, 30)} empty="No log records found." />
      </Card>
    );
  }

  function AssistantPanel() {
    return (
      <Card>
        <Title eyebrow="AI Assistant" title="Ask Atlas" subtitle="Recovery-safe assistant screen. Search above to find saved Atlas records." />
        <div style={emptyStyle}>Ask Atlas can be reconnected after the Work Orders page is confirmed stable.</div>
      </Card>
    );
  }

  function Team() {
    return (
      <Card>
        <Title eyebrow="Team" title="Team" subtitle="Private estate team screen kept stable." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
          <Card style={{ boxShadow: "none" }}><h3 style={h3Style}>Nick</h3><div style={rowSubStyle}>Operations / Maintenance</div></Card>
          <Card style={{ boxShadow: "none" }}><h3 style={h3Style}>Steve</h3><div style={rowSubStyle}>President</div></Card>
          <Card style={{ boxShadow: "none" }}><h3 style={h3Style}>Pat</h3><div style={rowSubStyle}>Landscaping Manager</div></Card>
        </div>
      </Card>
    );
  }

  function RecordGrid({ records, empty }: { records: AnyRecord[]; empty: string }) {
    if (!records.length) return <Empty>{empty}</Empty>;
    return (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
        {records.map((record, index) => (
          <Card key={value(record, "id") || index} style={{ boxShadow: "none" }}>
            <div style={rowTitleStyle}>{value(record, "title", "name", "summary") || `Record ${index + 1}`}</div>
            <div style={{ ...rowSubStyle, marginTop: 6 }}>{safeDate(value(record, "date", "createdAt", "created_at", "workDate", "work_date"))}</div>
            <div style={{ ...notesStyle, marginTop: 10 }}>{value(record, "notes", "description", "body") || "No notes saved."}</div>
          </Card>
        ))}
      </div>
    );
  }

  let content: React.ReactNode = null;
  if (screen === "dashboard") content = <Dashboard />;
  if (screen === "map") content = <MapScreen />;
  if (screen === "locations") content = <Locations />;
  if (screen === "assets") content = <Assets />;
  if (screen === "work-orders") content = <WorkOrders />;
  if (screen === "vendors") content = <Vendors />;
  if (screen === "calendar") content = <Calendar />;
  if (screen === "weather") content = <Weather />;
  if (screen === "documents") content = <Documents />;
  if (screen === "procedures") content = <Procedures />;
  if (screen === "logs") content = <Logs />;
  if (screen === "assistant") content = <AssistantPanel />;
  if (screen === "team") content = <Team />;

  return <Shell>{content}</Shell>;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  padding: 12,
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: colors.ink,
};

const appGridStyle: React.CSSProperties = {
  maxWidth: 1440,
  margin: "0 auto",
  display: "grid",
  gap: 16,
  minWidth: 0,
};

const sidebarStyle: React.CSSProperties = {
  top: 20,
  alignSelf: "start",
  background: colors.navy,
  color: "white",
  borderRadius: 28,
  padding: 16,
  display: "grid",
  alignContent: "start",
  gap: 14,
  boxShadow: "0 20px 50px rgba(11,30,51,0.18)",
};

const brandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 6px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
};

const brandMarkStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: colors.gold,
  color: colors.navy,
  display: "grid",
  placeItems: "center",
  fontWeight: 1000,
  fontSize: 22,
};

const navGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const navButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.07)",
  color: "white",
  borderRadius: 14,
  padding: "11px 12px",
  fontWeight: 900,
  textAlign: "left",
  cursor: "pointer",
};

const navButtonActiveStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: "rgba(201,154,61,0.18)",
};

const heroStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy2})`,
  color: "white",
  borderRadius: 28,
  boxShadow: "0 20px 50px rgba(11,30,51,0.18)",
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold2,
  fontWeight: 950,
  letterSpacing: 1.8,
  fontSize: 12,
};

const goldEyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};

const searchCardStyle: React.CSSProperties = {
  background: colors.card,
  borderRadius: 24,
  padding: 14,
  border: `1px solid ${colors.border}`,
  boxShadow: "0 16px 42px rgba(11,30,51,0.08)",
  display: "grid",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: "13px 14px",
  fontSize: 16,
  outline: "none",
  background: "#FFFFFF",
  color: colors.ink,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 130,
  resize: "vertical",
  lineHeight: 1.45,
};

const filterStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 40,
  padding: "9px 10px",
  fontSize: 14,
  borderRadius: 12,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.navy,
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.gold}`,
  background: colors.gold,
  color: colors.navy,
  borderRadius: 14,
  padding: "11px 14px",
  fontWeight: 1000,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(180,35,24,0.28)",
  background: "rgba(180,35,24,0.08)",
  color: colors.red,
  borderRadius: 14,
  padding: "11px 14px",
  fontWeight: 1000,
  cursor: "pointer",
};

const errorBoxStyle: React.CSSProperties = {
  background: "rgba(180,35,24,0.08)",
  color: colors.red,
  border: "1px solid rgba(180,35,24,0.22)",
  borderRadius: 18,
  padding: 14,
  fontWeight: 850,
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 24,
  boxShadow: "0 14px 36px rgba(11,30,51,0.07)",
  minWidth: 0,
};

const metricCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: "#FBFCFE",
  borderRadius: 20,
  padding: 16,
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
};

const compactRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
  border: `1px solid ${colors.border}`,
  background: "#FBFCFE",
  borderRadius: 18,
  padding: 12,
  minWidth: 0,
};

const rowButtonStyle: React.CSSProperties = {
  background: "#FBFCFE",
  borderRadius: 18,
  padding: 14,
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
};

const workOrderBoardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 22,
  boxShadow: "0 14px 35px rgba(11,30,51,0.06)",
  overflow: "hidden",
  minWidth: 0,
};

const workOrderEditorStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 22,
  boxShadow: "0 14px 35px rgba(11,30,51,0.06)",
  padding: 14,
  minWidth: 0,
};

const workOrderCardButtonStyle: React.CSSProperties = {
  background: "#FBFCFE",
  borderRadius: 18,
  padding: 12,
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
};

const rowTitleStyle: React.CSSProperties = {
  color: colors.navy,
  fontWeight: 1000,
  overflowWrap: "anywhere",
};

const rowSubStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  marginTop: 4,
  overflowWrap: "anywhere",
  lineHeight: 1.4,
};

const h3Style: React.CSSProperties = {
  margin: "0 0 10px",
  color: colors.navy,
  fontSize: 22,
};

const h4Style: React.CSSProperties = {
  margin: "0 0 10px",
  color: colors.navy,
  fontSize: 16,
};

const emptyStyle: React.CSSProperties = {
  color: colors.muted,
  background: "#FBFCFE",
  border: `1px dashed ${colors.border}`,
  borderRadius: 16,
  padding: 14,
  fontWeight: 800,
};

const detailTitleStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  color: colors.navy,
  fontSize: 28,
  lineHeight: 1.08,
  overflowWrap: "anywhere",
};

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const detailCellStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 12,
  background: "#FBFCFE",
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const notesStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  background: "#FBFCFE",
  padding: 12,
  color: colors.ink,
  whiteSpace: "pre-wrap",
  lineHeight: 1.55,
  overflowWrap: "anywhere",
};

const miniButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: "#fff",
  borderRadius: 14,
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 850,
  color: colors.navy,
  cursor: "pointer",
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: colors.navy,
  fontWeight: 900,
};

const mapViewportStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
  borderRadius: 22,
  border: `1px solid ${colors.border}`,
  background: "#E9EEF5",
  padding: 8,
};

const mapCanvasStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: 18,
  overflow: "hidden",
  background: "#DDE6EF",
};

const mapImageStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  userSelect: "none",
};

const mapPinStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  border: `1px solid ${colors.gold2}`,
  background: colors.navy,
  color: "white",
  borderRadius: 999,
  fontWeight: 1000,
  boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  maxWidth: 190,
};

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    borderBottom: active ? `3px solid ${colors.gold}` : `1px solid ${colors.border}`,
    background: active ? "#FFFFFF" : "#F7FAFD",
    color: active ? colors.navy : colors.muted,
    padding: "13px 8px",
    fontSize: 14,
    fontWeight: 950,
    cursor: "pointer",
  };
}
