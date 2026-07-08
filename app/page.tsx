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

function safeDate(raw: unknown) {
  const text = firstText(raw);
  if (!text) return "No date";
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

export default function AtlasPage() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<AtlasPayload>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

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
        const response = await fetch("/api/atlas", { cache: "no-store" });
        const data = (await response.json()) as AtlasPayload;
        if (cancelled) return;
        setPayload(data);
        if (!response.ok || data.error) setApiError(data.error || `Atlas API returned ${response.status}`);
      } catch (error) {
        if (!cancelled) setApiError(error instanceof Error ? error.message : "Atlas API failed to load");
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
  const workOrders = useMemo(() => payload.serviceRecords ?? [], [payload.serviceRecords]);
  const calendarItems = useMemo(() => payload.calendarItems ?? [], [payload.calendarItems]);
  const documents = useMemo(() => [...(payload.documentRecords ?? []), ...(payload.photoRecords ?? [])], [payload.documentRecords, payload.photoRecords]);
  const procedures = useMemo(() => payload.procedureRecords ?? [], [payload.procedureRecords]);

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
    if (!terms.length) return workOrders;
    return workOrders.filter((wo) => {
      const linkedAsset = assetById.get(value(wo, "assetId", "asset_id"));
      const linkedVendor = vendorById.get(value(wo, "vendorId", "vendor_id"));
      const combined: AnyRecord = {
        ...wo,
        linkedAsset: value(linkedAsset, "name"),
        linkedVendor: value(linkedVendor, "name"),
      };
      return hasSearch(combined, terms);
    });
  }, [workOrders, terms, assetById, vendorById]);

  const selectedAsset = useMemo(() => {
    if (selectedAssetId && assetById.has(selectedAssetId)) return assetById.get(selectedAssetId);
    return filteredAssets[0];
  }, [selectedAssetId, assetById, filteredAssets]);

  const selectedVendor = useMemo(() => {
    if (selectedVendorId && vendorById.has(selectedVendorId)) return vendorById.get(selectedVendorId);
    return filteredVendors[0];
  }, [selectedVendorId, vendorById, filteredVendors]);

  const selectedWorkOrder = useMemo(() => {
    if (selectedWorkOrderId) {
      const found = filteredWorkOrders.find((wo) => value(wo, "id") === selectedWorkOrderId);
      if (found) return found;
    }
    return filteredWorkOrders[0];
  }, [selectedWorkOrderId, filteredWorkOrders]);

  function openSearch(nextScreen: Screen, search: string) {
    setQuery(search);
    setScreen(nextScreen);
  }

  function clearSearchAndOpen(nextScreen: Screen) {
    setQuery("");
    setScreen(nextScreen);
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
                    Clean recovery build for iPhone, desktop, Atlas data, map, and work orders.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: isMobile ? "start" : "end" }}>
                  <span style={statusStyle(apiError ? "API Error" : loading ? "Loading" : "Online")}>{apiError ? "API Error" : loading ? "Loading" : "Online"}</span>
                  <div style={{ color: "rgba(255,255,255,0.70)", fontSize: 12 }}>Source: {payload.source || "Atlas API"}</div>
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
    const openWorkOrders = workOrders.filter((wo) => !value(wo, "status").toLowerCase().includes("complete"));
    const unassignedAssets = assets.filter((asset) => !value(asset, "location", "locationName", "location_name", "locationId", "location_id"));

    return (
      <Card>
        <Title eyebrow="Dashboard" title="Atlas Overview" subtitle="All core departments are mobile-safe and connected to the existing Atlas API." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
          <MetricCard label="Assets" count={assets.length} next="assets" />
          <MetricCard label="Work Orders" count={workOrders.length} next="work-orders" />
          <MetricCard label="Vendors" count={vendors.length} next="vendors" />
          <MetricCard label="Calendar" count={calendarItems.length} next="calendar" />
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
                      <div style={rowSubStyle}>{safeDate(value(wo, "workDate", "work_date", "date"))} · {value(asset, "name") || "No linked asset"}</div>
                    </div>
                    <span style={statusStyle(value(wo, "status") || "Open")}>{value(wo, "status") || "Open"}</span>
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
                  <div style={rowTitleStyle}>API Version</div>
                  <div style={rowSubStyle}>{payload.apiVersion || "Atlas route"}</div>
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
    const relatedWorkOrders = workOrders.filter((wo) => {
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
    const relatedWorkOrders = workOrders.filter((wo) => value(wo, "assetId", "asset_id") === assetId);
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
            <button key={value(wo, "id") || index} type="button" onClick={() => { setSelectedWorkOrderId(value(wo, "id")); setScreen("work-orders"); }} style={miniButtonStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</button>
          ))}
          {!relatedWorkOrders.length ? <Empty>No linked work orders.</Empty> : null}
        </div>
      </Card>
    );
  }

  function WorkOrders() {
    return (
      <Card>
        <Title eyebrow="Work Orders" title={`${filteredWorkOrders.length} Work Orders`} subtitle="Includes priority, recurring fields, invoice fields, linked asset, vendor, and notes." />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.9fr 1.1fr", gap: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredWorkOrders.map((wo, index) => {
              const id = value(wo, "id") || String(index);
              const asset = assetById.get(value(wo, "assetId", "asset_id"));
              return (
                <RowButton key={id} active={value(selectedWorkOrder, "id") === value(wo, "id")} onClick={() => setSelectedWorkOrderId(value(wo, "id"))}>
                  <div style={rowTitleStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</div>
                  <div style={rowSubStyle}>{safeDate(value(wo, "workDate", "work_date", "date"))} · {value(asset, "name") || "No linked asset"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    <span style={statusStyle(value(wo, "status") || "Open")}>{value(wo, "status") || "Open"}</span>
                    {value(wo, "priority") ? <span style={statusStyle(value(wo, "priority"))}>{value(wo, "priority")}</span> : null}
                    {value(wo, "isRecurring", "is_recurring") === "true" || value(wo, "recurrenceFrequency", "recurrence_frequency") ? <span style={statusStyle("Recurring")}>Recurring</span> : null}
                  </div>
                </RowButton>
              );
            })}
            {!filteredWorkOrders.length ? <Empty>No matching work orders.</Empty> : null}
          </div>
          <WorkOrderDetail wo={selectedWorkOrder} />
        </div>
      </Card>
    );
  }

  function WorkOrderDetail({ wo }: { wo?: AnyRecord }) {
    if (!wo) return <Empty>Select a work order.</Empty>;
    const asset = assetById.get(value(wo, "assetId", "asset_id"));
    const vendor = vendorById.get(value(wo, "vendorId", "vendor_id"));
    const recurring = value(wo, "isRecurring", "is_recurring") === "true" || value(wo, "recurrenceFrequency", "recurrence_frequency") ? "Yes" : "No";
    return (
      <Card style={{ boxShadow: "none" }}>
        <div style={goldEyebrowStyle}>Work Order Detail</div>
        <h3 style={detailTitleStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</h3>
        <div style={detailGridStyle}>
          <Detail label="Date">{safeDate(value(wo, "workDate", "work_date", "date"))}</Detail>
          <Detail label="Status">{value(wo, "status")}</Detail>
          <Detail label="Priority">{value(wo, "priority")}</Detail>
          <Detail label="Asset">{value(asset, "name") || "No linked asset"}</Detail>
          <Detail label="Vendor">{value(vendor, "name")}</Detail>
          <Detail label="Recurring">{recurring}</Detail>
          <Detail label="Frequency">{value(wo, "recurrenceFrequency", "recurrence_frequency")}</Detail>
          <Detail label="Next Due">{safeDate(value(wo, "recurrenceNextDue", "recurrence_next_due"))}</Detail>
          <Detail label="Invoice #">{value(wo, "invoiceNumber", "invoice_number")}</Detail>
          <Detail label="Invoice Amount">{safeMoney(value(wo, "invoiceAmount", "invoice_amount"))}</Detail>
          <Detail label="Invoice Status">{value(wo, "invoiceStatus", "invoice_status")}</Detail>
          <Detail label="Payment Status">{value(wo, "paymentStatus", "payment_status")}</Detail>
        </div>
        <h4 style={h4Style}>Notes</h4>
        <div style={notesStyle}>{value(wo, "notes", "description", "costNotes", "cost_notes") || "No notes saved."}</div>
      </Card>
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
    const relatedWorkOrders = workOrders.filter((wo) => value(wo, "vendorId", "vendor_id") === vendorId);
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
          {relatedWorkOrders.slice(0, 8).map((wo, index) => <div key={value(wo, "id") || index} style={miniRowStyle}>{value(wo, "title", "summary", "name") || "Untitled Work Order"}</div>)}
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
        <Title eyebrow="Weather" title="Weather" subtitle="Weather module placeholder kept stable so the app builds. Use Atlas notes or the existing weather workflow after the recovery deploy is green." />
        <div style={emptyStyle}>Weather panel is available as a department. No build-breaking imports.</div>
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
        <RecordGrid records={workOrders.slice(0, 30)} empty="No log records found." />
      </Card>
    );
  }

  function AssistantPanel() {
    return (
      <Card>
        <Title eyebrow="AI Assistant" title="Ask Atlas" subtitle="Recovery-safe assistant screen. Search above to find saved Atlas records." />
        <div style={emptyStyle}>Ask Atlas can be reconnected after the page is green. Current search works across loaded Atlas records.</div>
      </Card>
    );
  }

  function Team() {
    return (
      <Card>
        <Title eyebrow="Team" title="Team" subtitle="Private estate team screen kept stable during recovery." />
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
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "fit-content",
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.navy,
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 900,
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
  margin: "16px 0 8px",
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

const miniRowStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: "#fff",
  borderRadius: 14,
  padding: "10px 12px",
  fontWeight: 850,
  color: colors.navy,
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
