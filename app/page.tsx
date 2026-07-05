"use client";

import React, { useEffect, useMemo, useState } from "react";

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
  | "assistant";

type Status = "Online" | "Offline" | "Seasonal" | "Monitor";
type ServiceStatus = "Open" | "Scheduled" | "Completed" | "Monitor";

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  zone: string;
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

type VendorRecord = {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  notes: string;
};

type ServiceRecord = {
  id: string;
  assetId: string;
  vendorId?: string;
  date: string;
  title: string;
  status: ServiceStatus;
  notes: string;
};

type ProcedureRecord = {
  id: string;
  title: string;
  area: string;
  priority: "High" | "Normal" | "Seasonal";
  steps: string[];
};

type PhotoRecord = {
  id: string;
  assetId: string;
  name: string;
  dataUrl: string;
  createdAt: string;
};

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  area: string;
  status: ServiceStatus;
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
  green: "#16805D",
  red: "#B42318",
  orange: "#B54708",
  blue: "#175CD3",
};

const badgeColors: Record<
  Status | ServiceStatus,
  { background: string; color: string; border: string }
> = {
  Online: {
    background: "#EAF7F1",
    color: "#087443",
    border: "#BDE7D2",
  },
  Offline: {
    background: "#FEECEC",
    color: "#B42318",
    border: "#FACACA",
  },
  Seasonal: {
    background: "#FFF4E5",
    color: "#B54708",
    border: "#FFD8A8",
  },
  Monitor: {
    background: "#EDF3FF",
    color: "#175CD3",
    border: "#C8D9FF",
  },
  Open: {
    background: "#FFF4E5",
    color: "#B54708",
    border: "#FFD8A8",
  },
  Scheduled: {
    background: "#EDF3FF",
    color: "#175CD3",
    border: "#C8D9FF",
  },
  Completed: {
    background: "#EAF7F1",
    color: "#087443",
    border: "#BDE7D2",
  },
};

const locations: LocationRecord[] = [
  {
    id: "general",
    name: "General",
    type: "Property",
    zone: "Whole Estate",
    notes: "Default location for whole-property systems and records.",
  },
  {
    id: "mechanical-room",
    name: "Mechanical Room",
    type: "Systems",
    zone: "Main House",
    notes: "Boilers, domestic hot water tanks, hydronic controls, HVAC zoning, and major mechanical equipment.",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    type: "Interior",
    zone: "Main House",
    notes: "Kitchen appliances, range, dishwashers, freezer, and service records.",
  },
  {
    id: "dock",
    name: "Dock",
    type: "Waterfront",
    zone: "Lake",
    notes: "Boat lifts, SeaDoo lift, dock power, lift control boxes, and waterfront equipment.",
  },
  {
    id: "indoor-pool",
    name: "Indoor Pool",
    type: "Pool",
    zone: "Addition",
    notes: "Indoor pool area, pool construction records, dehumidification, pool systems, and service history.",
  },
  {
    id: "pool-equipment",
    name: "Pool Equipment Room",
    type: "Pool Systems",
    zone: "Addition",
    notes: "Pool filtration, pumps, chemical feed, water treatment, and PSF Mechanical records.",
  },
  {
    id: "spa-area",
    name: "Standalone Spa",
    type: "Exterior",
    zone: "Outdoor",
    notes: "Sundance Optima spa, heater, UV-C equipment, and spa control system records.",
  },
  {
    id: "house-office",
    name: "House Managers Office",
    type: "Interior",
    zone: "Main House",
    notes: "Office appliances and operational records.",
  },
  {
    id: "wine-room",
    name: "Wine Room",
    type: "Interior",
    zone: "Main House",
    notes: "Wine storage, freezer equipment, and room systems.",
  },
  {
    id: "garage",
    name: "Garage",
    type: "Garage",
    zone: "Exterior",
    notes: "Garage door openers, vehicles, tools, and service access.",
  },
  {
    id: "adu",
    name: "ADU",
    type: "Building",
    zone: "Left of Old Garage",
    notes: "Accessory dwelling unit location added to the property map plan.",
  },
  {
    id: "hangar",
    name: "Hangar",
    type: "Aircraft",
    zone: "Offsite",
    notes: "Aircraft records and hangar sub-location references.",
  },
];

const vendors: VendorRecord[] = [
  {
    id: "penthousedrapery",
    name: "Penthouse Drapery",
    category: "Blinds / Drapery",
    phone: "+1 206-292-8336",
    email: "accounting@penthousedrapery.com",
    notes:
      "Drapery and motorized roller shade service. Invoice #176396 dated 06/16/2026 should be linked to Blinds Lutron.",
  },
  {
    id: "psf",
    name: "PSF Mechanical",
    category: "Pool / Mechanical",
    notes: "Pool equipment, water treatment, and mechanical service records.",
  },
  {
    id: "viessmann",
    name: "Viessmann",
    category: "Boilers",
    notes: "Vitodens 200 boiler equipment and Vitocell 300-V domestic hot water tanks.",
  },
  {
    id: "sunstream",
    name: "Sunstream Boat Lifts",
    category: "Dock / Boat Lifts",
    notes:
      "Multiple Sunstream lift boxes on dock. Newer lift box is for the Cobalt boat lift.",
  },
  {
    id: "sundance",
    name: "Sundance Spas",
    category: "Spa",
    notes: "Sundance 880-series Optima spa equipment reference.",
  },
  {
    id: "carrier",
    name: "Carrier",
    category: "HVAC",
    notes: "Forced-air HVAC equipment reference.",
  },
  {
    id: "honeywell",
    name: "Honeywell",
    category: "HVAC Controls",
    notes: "HZ432 zone control equipment reference.",
  },
  {
    id: "desertaire",
    name: "Desert Aire",
    category: "Pool Dehumidification",
    notes: "Indoor pool dehumidification equipment reference.",
  },
  {
    id: "allproblinds",
    name: "A All Pro Blinds",
    category: "Blinds",
    notes: "Vendor record captured from existing estate vendor records.",
  },
  {
    id: "aaafire",
    name: "AAA Fire",
    category: "Fire / Safety",
    notes: "Fire and safety vendor record.",
  },
  {
    id: "advancedirrigation",
    name: "Advanced Irrigation",
    category: "Irrigation",
    notes: "Irrigation vendor record.",
  },
  {
    id: "americanleak",
    name: "American Leak Detection",
    category: "Leak Detection",
    notes: "Leak detection vendor record.",
  },
  {
    id: "applianceservice",
    name: "Appliance Service Station",
    category: "Appliances",
    notes: "Appliance service vendor record.",
  },
  {
    id: "aquadive",
    name: "Aqua Dive",
    category: "Pool / Dive",
    notes: "Pool and dive vendor record.",
  },
  {
    id: "aquaquip",
    name: "Aqua Quip",
    category: "Pool / Spa",
    notes: "Pool and spa vendor record.",
  },
  {
    id: "bestplumbing",
    name: "Best Plumbing",
    category: "Plumbing",
    notes: "Plumbing vendor record.",
  },
  {
    id: "bosch",
    name: "Bosch",
    category: "Appliances",
    notes: "Appliance manufacturer/vendor reference.",
  },
  {
    id: "cascade",
    name: "Cascade Spray",
    category: "Landscape / Irrigation",
    notes: "Landscape and spray vendor record.",
  },
  {
    id: "gutter",
    name: "Consolidated Gutter and Sheet Metal",
    category: "Gutters / Sheet Metal",
    notes: "Gutter and sheet metal vendor record.",
  },
  {
    id: "dsquare",
    name: "D Square Energy",
    category: "Energy / Electrical",
    notes: "Energy systems vendor record.",
  },
  {
    id: "daburns",
    name: "D.A. Burns",
    category: "Cleaning / Floors",
    notes: "Floor and cleaning vendor record.",
  },
  {
    id: "electromatic",
    name: "Electromatic Refrigeration",
    category: "Refrigeration",
    notes: "Refrigeration vendor record.",
  },
  {
    id: "elliottpaint",
    name: "Elliott Paint Company",
    category: "Paint",
    notes: "Paint vendor record.",
  },
  {
    id: "greaterseattlefloors",
    name: "Greater Seattle Floors",
    category: "Floors",
    notes: "Flooring vendor record.",
  },
  {
    id: "hightechliving",
    name: "High Tech Living",
    category: "Smart Home",
    notes: "Smart-home / technology vendor record.",
  },
  {
    id: "homedepot",
    name: "Home Depot",
    category: "Materials",
    notes: "Materials and supplies vendor record.",
  },
];

const assets: AssetRecord[] = [
  {
    id: "boiler-1",
    name: "Boiler B-1",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Online",
    make: "Viessmann",
    model: "Vitodens 200",
    serial: "758960502925",
    notes:
      "White wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE. Earlier nameplate showed year built 2018, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, minimum relief valve capacity 255.9 lb/hr, CRN R1497.5C.",
    vendorIds: ["viessmann"],
  },
  {
    id: "boiler-2",
    name: "Boiler B-2",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Monitor",
    make: "Viessmann",
    model: "Vitodens 200",
    serial: "758960507593",
    notes:
      "White wall-mounted Viessmann Vitodens 200. Latest clear nameplate: serial 758960507593, year built 2025, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, minimum relief valve capacity 255.9 lb/hr, CRN R1497.5C.",
    vendorIds: ["viessmann"],
  },
  {
    id: "vitocell-tanks",
    name: "Twin Viessmann Vitocell 300-V DHW Tanks",
    locationId: "mechanical-room",
    category: "Domestic Hot Water",
    status: "Online",
    make: "Viessmann",
    model: "Vitocell 300-V EVIA 300",
    notes:
      "Twin gray indirect-fired domestic hot water storage tanks. 79 USG / 300 L. Stainless steel tank / heat exchanger AISI 444 / 316 Ti.",
    vendorIds: ["viessmann"],
  },
  {
    id: "guarddog-low-water",
    name: "GuardDog Low Water Cut-Off",
    locationId: "mechanical-room",
    category: "Boiler Safety",
    status: "Online",
    make: "McDonnell & Miller",
    model: "751P-MT-120",
    notes:
      "Manual-reset low-water cut-off device. Green/red LED meanings, test/reset behavior, and CSD-1 compliance note should stay with boiler safety records.",
    vendorIds: ["viessmann"],
  },
  {
    id: "carrier-hvac",
    name: "Carrier Forced-Air HVAC + Honeywell HZ432 Zones",
    locationId: "mechanical-room",
    category: "HVAC",
    status: "Online",
    make: "Carrier / Honeywell",
    model: "HZ432 zone controls",
    notes:
      "Forced-air Carrier HVAC with Honeywell HZ432 zoning controls.",
    vendorIds: ["carrier", "honeywell"],
  },
  {
    id: "desertaire",
    name: "Desert Aire Pool Dehumidification",
    locationId: "indoor-pool",
    category: "Pool HVAC",
    status: "Monitor",
    make: "Desert Aire",
    notes:
      "Indoor pool dehumidification system tied to pool environment and mechanical records.",
    vendorIds: ["desertaire"],
  },
  {
    id: "pool-water-treatment",
    name: "Pool Water Treatment / Filtration",
    locationId: "pool-equipment",
    category: "Pool Equipment",
    status: "Online",
    make: "PSF Mechanical record",
    notes:
      "Pool filtration, water treatment, and service history should be tracked here.",
    vendorIds: ["psf", "aquaquip", "aquadive"],
  },
  {
    id: "sundance-optima",
    name: "Sundance 880 Optima Spa",
    locationId: "spa-area",
    category: "Spa",
    status: "Monitor",
    make: "Sundance",
    model: "OPTIMA",
    serial: "00P3LCD-100528521-0315",
    notes:
      "Sundance 880-series Optima spa. Date 03/21/15. Electrical rating label: 240 V, 26/40/48 A, breaker size 40/50/60 A, 60 Hz, single phase, 3 wires. Includes spa control system, HydroQuip heater, ClearRay UV-C equipment, and corrosion note at some screws/lower compartment.",
    vendorIds: ["sundance", "aquaquip"],
  },
  {
    id: "sunstream-cobalt",
    name: "Sunstream Lift Box — Cobalt",
    locationId: "dock",
    category: "Dock / Boat Lift",
    status: "Online",
    make: "Sunstream",
    notes:
      "Newer Sunstream lift control/battery/solar box is for the Cobalt boat lift. White enclosure with lid-mounted solar panel and internal battery/control wiring.",
    vendorIds: ["sunstream"],
  },
  {
    id: "sunstream-seadoo",
    name: "Sunstream Lift Box — SeaDoo",
    locationId: "dock",
    category: "Dock / PWC Lift",
    status: "Monitor",
    make: "Sunstream",
    notes:
      "SeaDoo lift box / dock control record. Keep separate from the Cobalt lift box because the lift boxes are not all the same.",
    vendorIds: ["sunstream"],
  },
  {
    id: "craft-cobalt",
    name: "Craft — Cobalt R-7",
    locationId: "dock",
    category: "Watercraft",
    status: "Seasonal",
    notes: "Cobalt R-7 watercraft record connected to dock and lift records.",
    vendorIds: ["sunstream"],
  },
  {
    id: "craft-seadoo",
    name: "Craft — SeaDoo 2024",
    locationId: "dock",
    category: "Watercraft",
    status: "Seasonal",
    notes: "2024 SeaDoo record connected to dock and lift records.",
    vendorIds: ["sunstream"],
  },
  {
    id: "blinds-lutron",
    name: "Blinds Lutron",
    locationId: "general",
    category: "Motorized Shades",
    status: "Monitor",
    make: "Lutron",
    notes:
      "Motorized roller shade asset. Penthouse Drapery invoice #176396 / motorized roller shade repair should be linked here.",
    vendorIds: ["penthousedrapery", "allproblinds"],
  },
  {
    id: "blinds-hunter",
    name: "Blinds Hunter Douglas",
    locationId: "general",
    category: "Blinds",
    status: "Online",
    make: "Hunter Douglas",
    notes: "Blinds asset record. Earlier asset screenshot showed Elyse's Room.",
    vendorIds: ["allproblinds"],
  },
  {
    id: "dishwasher-dw3",
    name: "Dishwasher DW-3 Right",
    locationId: "kitchen",
    category: "Appliance",
    status: "Online",
    notes: "Kitchen right dishwasher.",
    vendorIds: ["bosch", "applianceservice"],
  },
  {
    id: "dishwasher-dw4",
    name: "Dishwasher DW-4 Left",
    locationId: "kitchen",
    category: "Appliance",
    status: "Online",
    notes: "Kitchen left dishwasher.",
    vendorIds: ["bosch", "applianceservice"],
  },
  {
    id: "freezer-wine",
    name: "Freezer FR-5",
    locationId: "wine-room",
    category: "Appliance",
    status: "Online",
    notes: "Wine room freezer asset.",
    vendorIds: ["electromatic", "applianceservice"],
  },
  {
    id: "flologic",
    name: "FloLogic",
    locationId: "general",
    category: "Water Protection",
    status: "Online",
    notes: "Whole-property water monitoring / shutoff asset.",
    vendorIds: ["bestplumbing", "americanleak"],
  },
  {
    id: "garage-openers",
    name: "Garage Door Openers",
    locationId: "garage",
    category: "Garage",
    status: "Online",
    notes: "Garage door opener system record.",
    vendorIds: [],
  },
  {
    id: "generator-lower",
    name: "Generator Lower",
    locationId: "general",
    category: "Generator",
    status: "Monitor",
    notes: "Outdoor lower generator record.",
    vendorIds: ["dsquare"],
  },
];

const serviceSeed: ServiceRecord[] = [
  {
    id: "service-penthouse-176396",
    assetId: "blinds-lutron",
    vendorId: "penthousedrapery",
    date: "2026-06-16",
    title: "Motorized roller shade repair — Invoice #176396",
    status: "Completed",
    notes:
      "Penthouse Drapery invoice #176396 dated 06/16/2026. Link this service record to Blinds Lutron.",
  },
  {
    id: "service-boiler-nameplate",
    assetId: "boiler-2",
    vendorId: "viessmann",
    date: "2026-07-02",
    title: "Clear boiler nameplate captured",
    status: "Completed",
    notes:
      "Confirmed Viessmann boiler nameplate details: serial 758960507593, year built 2025, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief capacity 255.9 lb/hr, CRN R1497.5C.",
  },
  {
    id: "service-spa-record",
    assetId: "sundance-optima",
    vendorId: "sundance",
    date: "2026-07-02",
    title: "Spa equipment record created",
    status: "Completed",
    notes:
      "Recorded Sundance 880-series Optima spa model, serial, electrical rating, HydroQuip heater, ClearRay UV-C system, and visible corrosion notes.",
  },
  {
    id: "service-sunstream-lifts",
    assetId: "sunstream-cobalt",
    vendorId: "sunstream",
    date: "2026-07-02",
    title: "Dock lift control boxes documented",
    status: "Completed",
    notes:
      "Confirmed multiple Sunstream lift boxes on dock. Newer Sunstream lift box belongs to the Cobalt boat lift.",
  },
  {
    id: "service-pool-equipment",
    assetId: "pool-water-treatment",
    vendorId: "psf",
    date: "2026-07-02",
    title: "Pool equipment record drafted",
    status: "Monitor",
    notes:
      "Pool filtration and water-treatment records should be expanded with photos, procedures, and backwash steps.",
  },
];

const procedures: ProcedureRecord[] = [
  {
    id: "pool-backwash",
    title: "Pool Backwash Procedure",
    area: "Pool Equipment Room",
    priority: "High",
    steps: [
      "Confirm pump and valve positions before changing anything.",
      "Turn pump off before moving the multiport/backwash valve.",
      "Move valve to backwash position.",
      "Run pump until sight glass / discharge water clears.",
      "Turn pump off before moving valve again.",
      "Move valve to rinse and run briefly.",
      "Return valve to filter position.",
      "Restart system and verify pressure, flow, and leaks.",
      "Log date, pressure, and any unusual observations in Atlas.",
    ],
  },
  {
    id: "boiler-low-water",
    title: "Boiler Low-Water Cut-Off Check",
    area: "Mechanical Room",
    priority: "High",
    steps: [
      "Identify which boiler is being checked before touching controls.",
      "Review GuardDog low-water cut-off indicator lights.",
      "Do not bypass safety controls.",
      "Use manual reset only when the cause is understood.",
      "Record boiler number, indicator status, and action taken.",
    ],
  },
  {
    id: "spa-check",
    title: "Sundance Spa Check",
    area: "Standalone Spa",
    priority: "Normal",
    steps: [
      "Check spa water level.",
      "Inspect control bay for moisture, corrosion, or tripped indicators.",
      "Confirm heater-on and high-limit indicators are normal.",
      "Check ClearRay UV-C equipment status.",
      "Log condition and photo any corrosion or leaks.",
    ],
  },
  {
    id: "dock-lift-check",
    title: "Dock Lift Box Check",
    area: "Dock",
    priority: "Seasonal",
    steps: [
      "Confirm which lift box belongs to which craft before operating.",
      "Inspect solar panel, enclosure, battery wiring, and controls.",
      "Test up/down controls only when lift area is clear.",
      "Log any slow operation, battery issue, or wiring concern.",
    ],
  },
  {
    id: "weekly-walk",
    title: "Weekly Property Walk",
    area: "Whole Estate",
    priority: "Normal",
    steps: [
      "Walk main house exterior, dock, garage, pool, spa, and mechanical areas.",
      "Create a service note for anything leaking, loose, noisy, damaged, or offline.",
      "Attach photos to the correct asset or location.",
      "Update open items before leaving the property.",
    ],
  },
];

const calendarSeed: CalendarItem[] = [
  {
    id: "cal-pool",
    date: "2026-07-08",
    title: "Check pool equipment and record pressures",
    area: "Pool Equipment Room",
    status: "Scheduled",
  },
  {
    id: "cal-spa",
    date: "2026-07-10",
    title: "Spa inspection / water level check",
    area: "Standalone Spa",
    status: "Scheduled",
  },
  {
    id: "cal-dock",
    date: "2026-07-12",
    title: "Dock lift box inspection",
    area: "Dock",
    status: "Scheduled",
  },
  {
    id: "cal-boiler",
    date: "2026-07-15",
    title: "Mechanical room walkthrough",
    area: "Mechanical Room",
    status: "Monitor",
  },
];

const navItems: { id: Screen; label: string; description: string }[] = [
  { id: "dashboard", label: "Dashboard", description: "Control center" },
  { id: "map", label: "Map", description: "Property layout" },
  { id: "locations", label: "Locations", description: "Estate areas" },
  { id: "assets", label: "Assets", description: "Equipment records" },
  { id: "history", label: "Service History", description: "Work notes" },
  { id: "vendors", label: "Vendors", description: "Contacts" },
  { id: "calendar", label: "Calendar", description: "Scheduled work" },
  { id: "weather", label: "Weather", description: "Property watch" },
  { id: "documents", label: "Photos / Docs", description: "Uploads" },
  { id: "procedures", label: "Procedures", description: "How-to records" },
  { id: "assistant", label: "Ask Atlas", description: "Search records" },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLocationName(locationId: string) {
  return locations.find((location) => location.id === locationId)?.name ?? "General";
}

function getVendorName(vendorId?: string) {
  if (!vendorId) return "Internal";
  return vendors.find((vendor) => vendor.id === vendorId)?.name ?? "Vendor";
}

function getAssetName(assetId: string) {
  return assets.find((asset) => asset.id === assetId)?.name ?? "Asset";
}

function badgeStyle(status: Status | ServiceStatus): React.CSSProperties {
  const color = badgeColors[status];

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 800,
    background: color.background,
    color: color.color,
    border: `1px solid ${color.border}`,
    whiteSpace: "nowrap",
  };
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.line}`,
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 12px 30px rgba(11, 30, 51, 0.06)",
      }}
    >
      <div style={{ color: colors.muted, fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          color: colors.navy,
          fontSize: 34,
          fontWeight: 950,
          lineHeight: 1.1,
          marginTop: 8,
        }}
      >
        {value}
      </div>
      <div style={{ color: colors.muted, fontSize: 13, marginTop: 7 }}>
        {detail}
      </div>
    </div>
  );
}

function SectionShell({
  title,
  eyebrow,
  children,
  right,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: colors.card,
        border: `1px solid ${colors.line}`,
        borderRadius: 24,
        padding: 22,
        boxShadow: "0 14px 35px rgba(11, 30, 51, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 18,
        }}
      >
        <div>
          {eyebrow ? (
            <div
              style={{
                color: colors.gold,
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <h2
            style={{
              margin: 0,
              color: colors.navy,
              fontSize: 23,
              lineHeight: 1.15,
            }}
          >
            {title}
          </h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function AtlasPage() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("boiler-2");
  const [serviceRecords, setServiceRecords] =
    useState<ServiceRecord[]>(serviceSeed);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [calendarItems, setCalendarItems] =
    useState<CalendarItem[]>(calendarSeed);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(
    "Ask Atlas about boilers, pool equipment, Sunstream lifts, Lutron blinds, the Sundance spa, vendors, procedures, or service history."
  );
  const [ready, setReady] = useState(false);
  const [newService, setNewService] = useState({
    assetId: "boiler-2",
    vendorId: "",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Open" as ServiceStatus,
    notes: "",
  });

  useEffect(() => {
    try {
      const savedService = window.localStorage.getItem("atlas-service-records-v2");
      const savedPhotos = window.localStorage.getItem("atlas-photo-records-v2");
      const savedCalendar = window.localStorage.getItem("atlas-calendar-v2");

      if (savedService) {
        setServiceRecords(JSON.parse(savedService) as ServiceRecord[]);
      }

      if (savedPhotos) {
        setPhotos(JSON.parse(savedPhotos) as PhotoRecord[]);
      }

      if (savedCalendar) {
        setCalendarItems(JSON.parse(savedCalendar) as CalendarItem[]);
      }
    } catch {
      // Keep seeded Atlas records if local data cannot be read.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      "atlas-service-records-v2",
      JSON.stringify(serviceRecords)
    );
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-photo-records-v2", JSON.stringify(photos));
  }, [ready, photos]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-calendar-v2", JSON.stringify(calendarItems));
  }, [ready, calendarItems]);

  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];

  const selectedAssetServices = serviceRecords
    .filter((record) => record.assetId === selectedAsset.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedAssetPhotos = photos.filter(
    (photo) => photo.assetId === selectedAsset.id
  );

  const openServiceCount = serviceRecords.filter(
    (record) => record.status === "Open" || record.status === "Monitor"
  ).length;

  const monitorAssetCount = assets.filter(
    (asset) => asset.status === "Monitor" || asset.status === "Offline"
  ).length;

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;

    return assets.filter((asset) => {
      const searchText = [
        asset.name,
        asset.category,
        asset.status,
        asset.make,
        asset.model,
        asset.serial,
        asset.notes,
        getLocationName(asset.locationId),
        asset.vendorIds.map(getVendorName).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(q);
    });
  }, [query]);

  const filteredVendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;

    return vendors.filter((vendor) =>
      [vendor.name, vendor.category, vendor.phone, vendor.email, vendor.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return serviceRecords;

    return serviceRecords.filter((record) =>
      [
        record.title,
        record.status,
        record.notes,
        record.date,
        getAssetName(record.assetId),
        getVendorName(record.vendorId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, serviceRecords]);

  function addServiceRecord() {
    if (!newService.title.trim()) return;

    const record: ServiceRecord = {
      id: uid("service"),
      assetId: newService.assetId,
      vendorId: newService.vendorId || undefined,
      date: newService.date,
      title: newService.title.trim(),
      status: newService.status,
      notes: newService.notes.trim() || "No notes added yet.",
    };

    setServiceRecords((current) => [record, ...current]);
    setSelectedAssetId(record.assetId);
    setScreen("history");
    setNewService({
      assetId: record.assetId,
      vendorId: "",
      title: "",
      date: new Date().toISOString().slice(0, 10),
      status: "Open",
      notes: "",
    });
  }

  function deleteServiceRecord(id: string) {
    setServiceRecords((current) => current.filter((record) => record.id !== id));
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const photo: PhotoRecord = {
          id: uid("photo"),
          assetId: selectedAsset.id,
          name: file.name,
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setPhotos((current) => [photo, ...current]);
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function askAtlas(question: string) {
    const q = question.trim().toLowerCase();

    if (!q) {
      setAssistantAnswer("Type a question first, then Ask Atlas.");
      return;
    }

    if (q.includes("boiler")) {
      setAssistantAnswer(
        "Atlas found the boiler records in the Mechanical Room. Boiler B-1 is a Viessmann Vitodens 200 with earlier 2018 nameplate details. Boiler B-2 is a Viessmann Vitodens 200 with serial 758960507593, year built 2025, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief capacity 255.9 lb/hr, and CRN R1497.5C. The boiler safety record also includes a McDonnell & Miller GuardDog 751P-MT-120 low-water cut-off."
      );
      return;
    }

    if (q.includes("blind") || q.includes("shade") || q.includes("lutron")) {
      setAssistantAnswer(
        "Atlas found the blinds records. Blinds Lutron is the motorized roller shade asset. Penthouse Drapery invoice #176396 dated 06/16/2026 is linked to Blinds Lutron for motorized roller shade repair. Blinds Hunter Douglas is also tracked as a separate blinds asset."
      );
      return;
    }

    if (q.includes("spa") || q.includes("hot tub") || q.includes("sundance")) {
      setAssistantAnswer(
        "Atlas found the standalone spa record. It is a Sundance 880-series Optima, serial 00P3LCD-100528521-0315, date 03/21/15. The record includes 240 V electrical rating, HydroQuip heater, ClearRay UV-C equipment, control system details, and corrosion notes."
      );
      return;
    }

    if (q.includes("sunstream") || q.includes("lift") || q.includes("cobalt") || q.includes("seadoo")) {
      setAssistantAnswer(
        "Atlas found the dock lift records. There are multiple Sunstream lift boxes on the dock, and they should stay separated by craft. The newer Sunstream lift box belongs to the Cobalt boat lift. The SeaDoo lift has its own dock / PWC lift record."
      );
      return;
    }

    if (q.includes("pool") || q.includes("backwash") || q.includes("desert aire")) {
      setAssistantAnswer(
        "Atlas found pool records. The indoor pool has a Desert Aire dehumidification record. Pool filtration and water treatment are tracked under Pool Water Treatment / Filtration in the Pool Equipment Room with PSF Mechanical tied to the record. The pool backwash procedure is saved under Procedures."
      );
      return;
    }

    const combinedMatches = [
      ...assets.map((asset) => ({
        type: "Asset",
        title: asset.name,
        detail: `${asset.category} — ${getLocationName(asset.locationId)}. ${asset.notes}`,
      })),
      ...vendors.map((vendor) => ({
        type: "Vendor",
        title: vendor.name,
        detail: `${vendor.category}. ${vendor.notes}`,
      })),
      ...serviceRecords.map((record) => ({
        type: "Service",
        title: record.title,
        detail: `${formatDate(record.date)} — ${getAssetName(record.assetId)} — ${getVendorName(record.vendorId)}. ${record.notes}`,
      })),
      ...procedures.map((procedure) => ({
        type: "Procedure",
        title: procedure.title,
        detail: `${procedure.area}. ${procedure.steps.join(" ")}`,
      })),
    ].filter((item) =>
      [item.type, item.title, item.detail].join(" ").toLowerCase().includes(q)
    );

    if (!combinedMatches.length) {
      setAssistantAnswer(
        "I did not find that in the local Atlas records yet. Add a service note, photo, document, vendor, or asset record, then Ask Atlas will be able to surface it here."
      );
      return;
    }

    setAssistantAnswer(
      combinedMatches
        .slice(0, 4)
        .map((item) => `${item.type}: ${item.title}\n${item.detail}`)
        .join("\n\n")
    );
  }

  function renderDashboard() {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <StatCard label="Assets" value={assets.length} detail="Core estate systems" />
          <StatCard
            label="Monitor"
            value={monitorAssetCount}
            detail="Assets needing attention"
          />
          <StatCard
            label="Vendors"
            value={vendors.length}
            detail="Service partners"
          />
          <StatCard
            label="Open Items"
            value={openServiceCount}
            detail="Open / monitor service records"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 0.75fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <SectionShell
            eyebrow="Official Atlas"
            title="2000 Estate Operations Control Center"
            right={<span style={badgeStyle("Online")}>Live</span>}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`,
                borderRadius: 22,
                padding: 22,
                color: "white",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -65,
                  top: -70,
                  width: 190,
                  height: 190,
                  borderRadius: "50%",
                  border: `30px solid rgba(201, 154, 61, 0.18)`,
                }}
              />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <img
                  src="/atlas-logo.png"
                  alt="Atlas logo"
                  style={{
                    width: 82,
                    height: 82,
                    objectFit: "contain",
                    background: "white",
                    borderRadius: 20,
                    padding: 8,
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: 30, letterSpacing: -0.8 }}>
                    Atlas is now branded and ready to build.
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "rgba(255,255,255,0.78)",
                      lineHeight: 1.5,
                      maxWidth: 680,
                    }}
                  >
                    The official navy-and-gold Atlas logo is now part of the app
                    shell, the header, and the record system. This dashboard is
                    set up for assets, vendors, service history, procedures,
                    documents, photos, calendar items, weather watch, and Ask Atlas.
                  </p>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Watch List" title="Needs Attention">
            <div style={{ display: "grid", gap: 10 }}>
              {assets
                .filter((asset) => asset.status === "Monitor" || asset.status === "Offline")
                .slice(0, 5)
                .map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      setScreen("assets");
                    }}
                    style={{
                      border: `1px solid ${colors.line}`,
                      background: "#FBFCFE",
                      borderRadius: 16,
                      padding: 13,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ color: colors.navy }}>{asset.name}</strong>
                      <span style={badgeStyle(asset.status)}>{asset.status}</span>
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>
                      {getLocationName(asset.locationId)} · {asset.category}
                    </div>
                  </button>
                ))}
            </div>
          </SectionShell>
        </div>

        <SectionShell eyebrow="Recent Service" title="Latest Atlas History">
          <div style={{ display: "grid", gap: 10 }}>
            {serviceRecords
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((record) => (
                <div
                  key={record.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    border: `1px solid ${colors.line}`,
                    borderRadius: 16,
                    padding: 14,
                    background: "#FBFCFE",
                  }}
                >
                  <div style={{ color: colors.muted, fontWeight: 800 }}>
                    {formatDate(record.date)}
                  </div>
                  <div>
                    <div style={{ color: colors.navy, fontWeight: 900 }}>
                      {record.title}
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                      {getAssetName(record.assetId)} · {getVendorName(record.vendorId)}
                    </div>
                  </div>
                  <span style={badgeStyle(record.status)}>{record.status}</span>
                </div>
              ))}
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderMap() {
    const pins = [
      { label: "Main House", top: "38%", left: "48%", target: "general" },
      { label: "Mechanical", top: "47%", left: "51%", target: "mechanical-room" },
      { label: "Indoor Pool", top: "55%", left: "56%", target: "indoor-pool" },
      { label: "Dock", top: "77%", left: "57%", target: "dock" },
      { label: "ADU", top: "42%", left: "29%", target: "adu" },
      { label: "Garage", top: "34%", left: "34%", target: "garage" },
    ];

    return (
      <SectionShell
        eyebrow="Property Map"
        title="Clickable Atlas Map"
        right={<span style={badgeStyle("Online")}>Map Ready</span>}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            overflow: "hidden",
            border: `1px solid ${colors.line}`,
            minHeight: 520,
            background: "#E9EEF5",
          }}
        >
          <img
            src="/atlas-property-map.png"
            alt="Atlas property map"
            style={{
              width: "100%",
              height: 560,
              objectFit: "cover",
              display: "block",
            }}
          />
          {pins.map((pin) => (
            <button
              key={pin.label}
              type="button"
              onClick={() => {
                setQuery(pin.label);
                setScreen("locations");
              }}
              style={{
                position: "absolute",
                top: pin.top,
                left: pin.left,
                transform: "translate(-50%, -50%)",
                border: `2px solid ${colors.gold2}`,
                background: colors.navy,
                color: "white",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 900,
                boxShadow: "0 12px 24px rgba(0,0,0,0.28)",
                cursor: "pointer",
              }}
            >
              {pin.label}
            </button>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderLocations() {
    return (
      <SectionShell eyebrow="Locations" title="Estate Areas">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {locations.map((location) => (
            <div
              key={location.id}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                padding: 16,
                background: "#FBFCFE",
              }}
            >
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>
                {location.zone}
              </div>
              <h3 style={{ margin: "6px 0", color: colors.navy }}>
                {location.name}
              </h3>
              <div style={{ color: colors.muted, fontSize: 13, fontWeight: 800 }}>
                {location.type}
              </div>
              <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.45 }}>
                {location.notes}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery(location.name);
                  setScreen("assets");
                }}
                style={{
                  border: "none",
                  background: colors.navy,
                  color: "white",
                  borderRadius: 12,
                  padding: "9px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                View Assets
              </button>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderAssets() {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <SectionShell eyebrow="Assets" title="Equipment Records">
          <div style={{ display: "grid", gap: 10 }}>
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                style={{
                  border:
                    selectedAsset.id === asset.id
                      ? `2px solid ${colors.gold}`
                      : `1px solid ${colors.line}`,
                  background:
                    selectedAsset.id === asset.id ? "#FFF9EA" : "#FBFCFE",
                  borderRadius: 16,
                  padding: 14,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <strong style={{ color: colors.navy }}>{asset.name}</strong>
                  <span style={badgeStyle(asset.status)}>{asset.status}</span>
                </div>
                <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>
                  {asset.category} · {getLocationName(asset.locationId)}
                </div>
              </button>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          eyebrow={getLocationName(selectedAsset.locationId)}
          title={selectedAsset.name}
          right={<span style={badgeStyle(selectedAsset.status)}>{selectedAsset.status}</span>}
        >
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 13 }}>
                <div style={{ color: colors.muted, fontSize: 12, fontWeight: 900 }}>
                  Make
                </div>
                <div style={{ color: colors.navy, fontWeight: 900 }}>
                  {selectedAsset.make ?? "Not set"}
                </div>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 13 }}>
                <div style={{ color: colors.muted, fontSize: 12, fontWeight: 900 }}>
                  Model
                </div>
                <div style={{ color: colors.navy, fontWeight: 900 }}>
                  {selectedAsset.model ?? "Not set"}
                </div>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 13 }}>
                <div style={{ color: colors.muted, fontSize: 12, fontWeight: 900 }}>
                  Serial
                </div>
                <div style={{ color: colors.navy, fontWeight: 900 }}>
                  {selectedAsset.serial ?? "Not set"}
                </div>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 13 }}>
                <div style={{ color: colors.muted, fontSize: 12, fontWeight: 900 }}>
                  Vendors
                </div>
                <div style={{ color: colors.navy, fontWeight: 900 }}>
                  {selectedAsset.vendorIds.length
                    ? selectedAsset.vendorIds.map(getVendorName).join(", ")
                    : "Not set"}
                </div>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 16,
                padding: 15,
                background: "#FBFCFE",
              }}
            >
              <div style={{ color: colors.muted, fontSize: 12, fontWeight: 950 }}>
                NOTES
              </div>
              <p style={{ color: colors.text, lineHeight: 1.55, marginBottom: 0 }}>
                {selectedAsset.notes}
              </p>
            </div>

            <div
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 16,
                padding: 15,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <strong style={{ color: colors.navy }}>Recent Service</strong>
                <button
                  type="button"
                  onClick={() => {
                    setNewService((current) => ({
                      ...current,
                      assetId: selectedAsset.id,
                    }));
                    setScreen("history");
                  }}
                  style={{
                    border: "none",
                    background: colors.gold,
                    color: colors.navy,
                    borderRadius: 12,
                    padding: "8px 11px",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  Add Note
                </button>
              </div>

              {selectedAssetServices.length ? (
                <div style={{ display: "grid", gap: 9 }}>
                  {selectedAssetServices.slice(0, 4).map((record) => (
                    <div
                      key={record.id}
                      style={{
                        border: `1px solid ${colors.line}`,
                        borderRadius: 13,
                        padding: 12,
                        background: "#FBFCFE",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <strong style={{ color: colors.navy }}>{record.title}</strong>
                        <span style={badgeStyle(record.status)}>{record.status}</span>
                      </div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                        {formatDate(record.date)} · {getVendorName(record.vendorId)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: colors.muted }}>No service history yet.</div>
              )}
            </div>
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderHistory() {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.82fr 1.18fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <SectionShell eyebrow="Add Record" title="New Service Note">
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Asset
              <select
                value={newService.assetId}
                onChange={(event) =>
                  setNewService((current) => ({
                    ...current,
                    assetId: event.target.value,
                  }))
                }
                style={inputStyle}
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Vendor
              <select
                value={newService.vendorId}
                onChange={(event) =>
                  setNewService((current) => ({
                    ...current,
                    vendorId: event.target.value,
                  }))
                }
                style={inputStyle}
              >
                <option value="">Internal / Not set</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Title
              <input
                value={newService.title}
                onChange={(event) =>
                  setNewService((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Example: Checked boiler low-water cut-off"
                style={inputStyle}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
                Date
                <input
                  type="date"
                  value={newService.date}
                  onChange={(event) =>
                    setNewService((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
                Status
                <select
                  value={newService.status}
                  onChange={(event) =>
                    setNewService((current) => ({
                      ...current,
                      status: event.target.value as ServiceStatus,
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Monitor">Monitor</option>
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Notes
              <textarea
                value={newService.notes}
                onChange={(event) =>
                  setNewService((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Write what happened, what needs to happen next, and anything to watch."
                rows={6}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>

            <button
              type="button"
              onClick={addServiceRecord}
              style={{
                border: "none",
                background: colors.navy,
                color: "white",
                borderRadius: 14,
                padding: "13px 14px",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Save Service Note
            </button>
          </div>
        </SectionShell>

        <SectionShell eyebrow="Service History" title="Atlas Work Log">
          <div style={{ display: "grid", gap: 11 }}>
            {filteredServices
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((record) => (
                <div
                  key={record.id}
                  style={{
                    border: `1px solid ${colors.line}`,
                    borderRadius: 16,
                    padding: 15,
                    background: "#FBFCFE",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ color: colors.navy, fontWeight: 950 }}>
                        {record.title}
                      </div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                        {formatDate(record.date)} · {getAssetName(record.assetId)} ·{" "}
                        {getVendorName(record.vendorId)}
                      </div>
                    </div>
                    <span style={badgeStyle(record.status)}>{record.status}</span>
                  </div>
                  <p style={{ color: colors.text, lineHeight: 1.5, marginBottom: 12 }}>
                    {record.notes}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteServiceRecord(record.id)}
                    style={{
                      border: `1px solid ${colors.line}`,
                      background: "white",
                      color: colors.red,
                      borderRadius: 12,
                      padding: "8px 10px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderVendors() {
    return (
      <SectionShell eyebrow="Vendors" title="Atlas Vendor Directory">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                padding: 16,
                background: "#FBFCFE",
              }}
            >
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>
                {vendor.category}
              </div>
              <h3 style={{ color: colors.navy, margin: "6px 0" }}>{vendor.name}</h3>
              {vendor.phone ? (
                <div style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>
                  {vendor.phone}
                </div>
              ) : null}
              {vendor.email ? (
                <div style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>
                  {vendor.email}
                </div>
              ) : null}
              <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.45 }}>
                {vendor.notes}
              </p>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderCalendar() {
    return (
      <SectionShell eyebrow="Calendar" title="Scheduled Atlas Work">
        <div style={{ display: "grid", gap: 12 }}>
          {calendarItems
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr auto",
                  gap: 14,
                  alignItems: "center",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 16,
                  padding: 15,
                  background: "#FBFCFE",
                }}
              >
                <div style={{ color: colors.navy, fontWeight: 950 }}>
                  {formatDate(item.date)}
                </div>
                <div>
                  <div style={{ color: colors.navy, fontWeight: 950 }}>
                    {item.title}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    {item.area}
                  </div>
                </div>
                <span style={badgeStyle(item.status)}>{item.status}</span>
              </div>
            ))}
        </div>
      </SectionShell>
    );
  }

  function renderWeather() {
    return (
      <SectionShell eyebrow="Weather Watch" title="2000 Property Conditions">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          <div style={weatherCardStyle}>
            <div style={weatherValueStyle}>Dock</div>
            <p style={weatherTextStyle}>
              Watch lake level, wind, dock power, SeaDoo lift, and Cobalt lift before
              storms or heavy use.
            </p>
          </div>
          <div style={weatherCardStyle}>
            <div style={weatherValueStyle}>Freeze</div>
            <p style={weatherTextStyle}>
              During cold weather, check exterior hose bibs, mechanical room, garage,
              pool equipment, and spa area.
            </p>
          </div>
          <div style={weatherCardStyle}>
            <div style={weatherValueStyle}>Rain</div>
            <p style={weatherTextStyle}>
              During heavy rain, check gutters, drainage, basement, ADU, garage, and
              leak-detection records.
            </p>
          </div>
        </div>
      </SectionShell>
    );
  }

  function renderDocuments() {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.75fr 1.25fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <SectionShell eyebrow="Upload" title="Photos / Documents">
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Attach to Asset
              <select
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.target.value)}
                style={inputStyle}
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 10,
                border: `2px dashed ${colors.line}`,
                borderRadius: 18,
                padding: 18,
                background: "#FBFCFE",
                color: colors.navy,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Add photos for {selectedAsset.name}
              <span style={{ color: colors.muted, fontSize: 13, fontWeight: 600 }}>
                Uploads are saved in this browser for now.
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ color: colors.muted }}
              />
            </label>
          </div>
        </SectionShell>

        <SectionShell eyebrow="Gallery" title={`${selectedAsset.name} Photos`}>
          {selectedAssetPhotos.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              {selectedAssetPhotos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    border: `1px solid ${colors.line}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#FBFCFE",
                  }}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    style={{ width: "100%", height: 160, objectFit: "cover" }}
                  />
                  <div style={{ padding: 12 }}>
                    <div style={{ color: colors.navy, fontWeight: 900, fontSize: 13 }}>
                      {photo.name}
                    </div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                      {new Date(photo.createdAt).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((current) =>
                          current.filter((item) => item.id !== photo.id)
                        )
                      }
                      style={{
                        marginTop: 10,
                        border: `1px solid ${colors.line}`,
                        background: "white",
                        color: colors.red,
                        borderRadius: 10,
                        padding: "7px 10px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: colors.muted }}>
              No photos added for this asset yet.
            </div>
          )}
        </SectionShell>
      </div>
    );
  }

  function renderProcedures() {
    return (
      <SectionShell eyebrow="Procedures" title="Atlas How-To Records">
        <div style={{ display: "grid", gap: 14 }}>
          {procedures.map((procedure) => (
            <div
              key={procedure.id}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                padding: 16,
                background: "#FBFCFE",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>
                    {procedure.area}
                  </div>
                  <h3 style={{ color: colors.navy, margin: "5px 0 0" }}>
                    {procedure.title}
                  </h3>
                </div>
                <span
                  style={{
                    ...badgeStyle(
                      procedure.priority === "High"
                        ? "Open"
                        : procedure.priority === "Seasonal"
                          ? "Seasonal"
                          : "Completed"
                    ),
                  }}
                >
                  {procedure.priority}
                </span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 21, color: colors.text, lineHeight: 1.6 }}>
                {procedure.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderAssistant() {
    const quickQuestions = [
      "What boiler do we have?",
      "Who worked on the Lutron blinds?",
      "What do we know about the Sundance spa?",
      "Which lift box is for the Cobalt?",
      "Where is the pool backwash procedure?",
    ];

    return (
      <SectionShell
        eyebrow="Ask Atlas"
        title="Search the Local Atlas Records"
        right={
          <img
            src="/atlas-logo.png"
            alt="Atlas logo"
            style={{ width: 52, height: 52, objectFit: "contain" }}
          />
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.85fr 1.15fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <textarea
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder="Ask about assets, vendors, procedures, service notes, pool equipment, boilers, dock lifts, blinds, or the spa..."
              rows={7}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <button
              type="button"
              onClick={() => askAtlas(assistantQuestion)}
              style={{
                border: "none",
                background: colors.navy,
                color: "white",
                borderRadius: 14,
                padding: "13px 14px",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Ask Atlas
            </button>

            <div style={{ display: "grid", gap: 8 }}>
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => {
                    setAssistantQuestion(question);
                    askAtlas(question);
                  }}
                  style={{
                    border: `1px solid ${colors.line}`,
                    background: "#FBFCFE",
                    color: colors.navy,
                    borderRadius: 12,
                    padding: "9px 11px",
                    fontWeight: 850,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 18,
              padding: 18,
              background: "#FBFCFE",
              minHeight: 275,
              whiteSpace: "pre-wrap",
              color: colors.text,
              lineHeight: 1.55,
            }}
          >
            {assistantAnswer}
          </div>
        </div>
      </SectionShell>
    );
  }

  const activeNav = navItems.find((item) => item.id === screen);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.bg,
        display: "grid",
        gridTemplateColumns: "292px 1fr",
        color: colors.text,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <aside
        style={{
          background: `linear-gradient(180deg, ${colors.navy}, ${colors.navy2})`,
          color: "white",
          padding: 20,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 13,
            alignItems: "center",
            padding: "8px 6px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.13)",
            marginBottom: 16,
          }}
        >
          <img
            src="/atlas-logo.png"
            alt="Atlas logo"
            style={{
              width: 62,
              height: 62,
              objectFit: "contain",
              background: "white",
              borderRadius: 16,
              padding: 6,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 950,
                letterSpacing: 1.8,
                lineHeight: 1,
              }}
            >
              ATLAS
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.68)",
                fontSize: 13,
                fontWeight: 750,
                marginTop: 6,
              }}
            >
              2000 Estate Operations
            </div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => {
            const active = item.id === screen;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setScreen(item.id)}
                style={{
                  border: active
                    ? `1px solid ${colors.gold2}`
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(201,154,61,0.18)" : "rgba(255,255,255,0.04)",
                  color: "white",
                  borderRadius: 16,
                  padding: "12px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span>
                  <span style={{ display: "block", fontWeight: 950 }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.62)",
                      fontSize: 12,
                      marginTop: 3,
                    }}
                  >
                    {item.description}
                  </span>
                </span>
                {active ? (
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: colors.gold2,
                      flex: "0 0 auto",
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: 14,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ color: colors.gold2, fontWeight: 950, fontSize: 12 }}>
            BRANDING
          </div>
          <div style={{ fontWeight: 900, marginTop: 6 }}>
            Official Atlas logo active
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: 12,
              marginTop: 5,
              lineHeight: 1.4,
            }}
          >
            Navy-and-gold mark is now used inside the app shell and header.
          </div>
        </div>
      </aside>

      <section style={{ padding: 24, minWidth: 0 }}>
        <header
          style={{
            background: colors.card,
            border: `1px solid ${colors.line}`,
            borderRadius: 24,
            padding: 18,
            marginBottom: 18,
            boxShadow: "0 14px 35px rgba(11, 30, 51, 0.06)",
            display: "grid",
            gridTemplateColumns: "1fr 430px",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
            <img
              src="/atlas-logo.png"
              alt="Atlas logo"
              style={{
                width: 58,
                height: 58,
                objectFit: "contain",
                borderRadius: 15,
                border: `1px solid ${colors.line}`,
                padding: 5,
                background: "white",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: colors.gold,
                  fontSize: 12,
                  fontWeight: 950,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                }}
              >
                {activeNav?.label ?? "Dashboard"}
              </div>
              <h1
                style={{
                  margin: "4px 0 0",
                  color: colors.navy,
                  fontSize: 31,
                  letterSpacing: -0.9,
                  lineHeight: 1.05,
                }}
              >
                Atlas / 2000
              </h1>
              <div style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>
                Private estate systems, service history, vendors, procedures, and
                Ask Atlas records.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "#F7F9FC",
              border: `1px solid ${colors.line}`,
              borderRadius: 18,
              padding: 10,
            }}
          >
            <img
              src="/atlas-logo.png"
              alt="Atlas logo"
              style={{ width: 30, height: 30, objectFit: "contain" }}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Atlas records..."
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: colors.navy,
                fontWeight: 800,
                fontSize: 15,
                width: "100%",
              }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  border: "none",
                  background: colors.navy,
                  color: "white",
                  borderRadius: 11,
                  padding: "8px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </header>

        {query ? (
          <div
            style={{
              marginBottom: 18,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                border: `1px solid ${colors.line}`,
                background: colors.card,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <strong style={{ color: colors.navy }}>{filteredAssets.length}</strong>
              <span style={{ color: colors.muted }}> asset matches</span>
            </div>
            <div
              style={{
                border: `1px solid ${colors.line}`,
                background: colors.card,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <strong style={{ color: colors.navy }}>{filteredVendors.length}</strong>
              <span style={{ color: colors.muted }}> vendor matches</span>
            </div>
            <div
              style={{
                border: `1px solid ${colors.line}`,
                background: colors.card,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <strong style={{ color: colors.navy }}>{filteredServices.length}</strong>
              <span style={{ color: colors.muted }}> service matches</span>
            </div>
          </div>
        ) : null}

        {screen === "dashboard" ? renderDashboard() : null}
        {screen === "map" ? renderMap() : null}
        {screen === "locations" ? renderLocations() : null}
        {screen === "assets" ? renderAssets() : null}
        {screen === "history" ? renderHistory() : null}
        {screen === "vendors" ? renderVendors() : null}
        {screen === "calendar" ? renderCalendar() : null}
        {screen === "weather" ? renderWeather() : null}
        {screen === "documents" ? renderDocuments() : null}
        {screen === "procedures" ? renderProcedures() : null}
        {screen === "assistant" ? renderAssistant() : null}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  color: colors.navy,
  borderRadius: 13,
  padding: "11px 12px",
  fontSize: 14,
  fontWeight: 750,
  outline: "none",
  boxSizing: "border-box",
};

const weatherCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 18,
  background: "#FBFCFE",
  minHeight: 150,
};

const weatherValueStyle: React.CSSProperties = {
  color: colors.navy,
  fontSize: 26,
  fontWeight: 950,
  marginBottom: 8,
};

const weatherTextStyle: React.CSSProperties = {
  color: colors.muted,
  lineHeight: 1.5,
  margin: 0,
};
