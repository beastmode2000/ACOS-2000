"use client";

import React, { useEffect, useMemo, useState } from "react";

type Screen =
  | "dashboard"
  | "map"
  | "locations"
  | "assets"
  | "vendors"
  | "calendar"
  | "weather"
  | "documents"
  | "procedures"
  | "logs"
  | "assistant"
  | "team";

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  locationId: string;
};

type LocationSection = {
  id: string;
  name: string;
  category: string;
  description: string;
};

type Asset = {
  id: string;
  name: string;
  category: string;
  location: string;
  status: "Good" | "Watch" | "Service Needed" | "Unknown";
  notes: string;
};

type Vendor = {
  id: string;
  name: string;
  category: string;
  contact: string;
  notes: string;
};

type Procedure = {
  id: string;
  name: string;
  section: string;
  frequency: string;
  steps: string[];
};

type Task = {
  id: string;
  title: string;
  section: string;
  due: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "Done";
};

type LogEntry = {
  id: string;
  title: string;
  section: string;
  date: string;
  note: string;
};

type DocumentRecord = {
  id: string;
  name: string;
  section: string;
  type: string;
  note: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  access: string;
};

type FieldNote = {
  id: string;
  title: string;
  section: string;
  date: string;
  note: string;
};

type FieldPhoto = {
  id: string;
  name: string;
  section: string;
  date: string;
  dataUrl: string;
  fileType: string;
};

const navy = "#061a33";

const defaultMapLabels: MapLabel[] = [
  { id: "dock", name: "Dock", x: 15, y: 78, locationId: "dock" },
  { id: "cobalt", name: "Cobalt", x: 12, y: 68, locationId: "dock" },
  { id: "seadoo", name: "Seadoo", x: 23, y: 73, locationId: "dock" },
  { id: "water-trampoline", name: "Water Trampoline", x: 30, y: 85, locationId: "dock" },
  { id: "waterside-lawn-north", name: "Waterside Lawn (North)", x: 38, y: 69, locationId: "grounds" },
  { id: "east-lawn", name: "East Lawn", x: 77, y: 46, locationId: "grounds" },
  { id: "sport-court", name: "Sport Court", x: 86, y: 33, locationId: "grounds" },
  { id: "veggie-boxes", name: "Veggie Boxes", x: 72, y: 28, locationId: "grounds" },
  { id: "new-garage", name: "New Garage", x: 63, y: 24, locationId: "garage" },
  { id: "old-garage", name: "Old Garage", x: 51, y: 26, locationId: "garage" },
  { id: "adu", name: "ADU", x: 43, y: 27, locationId: "adu" },
  { id: "courtyard", name: "Courtyard", x: 44, y: 45, locationId: "courtyard" },
  { id: "trampoline-dog", name: "Trampoline/Dog", x: 56, y: 48, locationId: "grounds" },
  { id: "original-house", name: "Original House", x: 38, y: 41, locationId: "original-house" },
  { id: "addition", name: "Addition", x: 58, y: 40, locationId: "addition" },
  { id: "hot-tub-sundance", name: "Hot Tub (Sundance)", x: 64, y: 55, locationId: "hot-tub" },
];

const defaultLocations: LocationSection[] = [
  { id: "original-house", name: "Original House", category: "Main Structure", description: "Older/main home area and core interior records." },
  { id: "addition", name: "Addition", category: "Main Structure", description: "Newer addition, indoor pool area, great room connection, and related systems." },
  { id: "mechanical", name: "Mechanical / Boiler Room", category: "Systems", description: "Boilers, hydronic heat, domestic hot water, HVAC zones, and controls." },
  { id: "pool", name: "Indoor Pool", category: "Systems", description: "Pool shell, equipment, filtration, UV, cover, dehumidification, and procedures." },
  { id: "hot-tub", name: "Hot Tub (Sundance)", category: "Spa", description: "Sundance Optima spa, ClearRay, controls, heater, and service notes." },
  { id: "dock", name: "Dock / Waterfront", category: "Exterior", description: "Dock, lifts, Cobalt, Seadoo, water trampoline, lift boxes, and waterfront assets." },
  { id: "grounds", name: "Grounds", category: "Exterior", description: "Lawns, sport court, veggie boxes, trampoline/dog area, and outdoor routines." },
  { id: "garage", name: "New Garage / Old Garage", category: "Structures", description: "Garage areas, ADU connection, storage, and service access." },
  { id: "adu", name: "ADU", category: "Structure", description: "ADU area left of the old garage." },
  { id: "courtyard", name: "Courtyard", category: "Exterior", description: "Courtyard between the house areas, covered connection, fire pit, and seating." },
  { id: "hangar", name: "Hangar", category: "Remote / Aviation", description: "Aircraft and hangar-related records." },
];

const defaultAssets: Asset[] = [
  {
    id: "boiler-1",
    name: "Viessmann Vitodens 200 — Boiler 1",
    category: "Hydronic Heat",
    location: "Mechanical / Boiler Room",
    status: "Good",
    notes: "Wall-mounted Viessmann boiler labeled Boiler 1. Secondary high limit inside.",
  },
  {
    id: "boiler-2",
    name: "Viessmann Vitodens 200 — Boiler 2",
    category: "Hydronic Heat",
    location: "Mechanical / Boiler Room",
    status: "Good",
    notes: "Wall-mounted Viessmann boiler labeled Boiler 2. Secondary high limit inside.",
  },
  {
    id: "dhw-tanks",
    name: "Twin Viessmann Vitocell 300-V DHW Tanks",
    category: "Domestic Hot Water",
    location: "Mechanical / Boiler Room",
    status: "Good",
    notes: "Twin gray indirect domestic hot water tanks serving the property.",
  },
  {
    id: "carrier-honeywell-zones",
    name: "Carrier / Honeywell HZ432 HVAC Zones",
    category: "HVAC",
    location: "Mechanical / Boiler Room",
    status: "Watch",
    notes: "Forced-air Carrier system with Honeywell zoning controls.",
  },
  {
    id: "desert-aire",
    name: "Desert Aire Pool Dehumidification",
    category: "Pool HVAC",
    location: "Indoor Pool",
    status: "Good",
    notes: "Pool dehumidification system tied to indoor pool environment.",
  },
  {
    id: "pool-filtration",
    name: "Pool Filtration / UV / Cover System",
    category: "Pool Equipment",
    location: "Indoor Pool",
    status: "Good",
    notes: "Pool pump, filtration, UV, cover, testing, backwash, and routine service records.",
  },
  {
    id: "sundance-optima",
    name: "Sundance Optima Hot Tub",
    category: "Spa",
    location: "Hot Tub (Sundance)",
    status: "Watch",
    notes: "Sundance 880-series Optima spa with ClearRay UV-C and smart heater equipment.",
  },
  {
    id: "sunstream-cobalt",
    name: "Sunstream Lift Box — Cobalt",
    category: "Dock / Lift",
    location: "Dock / Waterfront",
    status: "Good",
    notes: "Newer Sunstream lift box for the Cobalt lift.",
  },
  {
    id: "sunstream-seadoo",
    name: "Sunstream Lift Box — Seadoo",
    category: "Dock / Lift",
    location: "Dock / Waterfront",
    status: "Good",
    notes: "Older Sunstream lift box serving the Seadoo lift.",
  },
  {
    id: "sunstream-dock",
    name: "Sunstream Lift Box — Dock Lift",
    category: "Dock / Lift",
    location: "Dock / Waterfront",
    status: "Good",
    notes: "Additional Sunstream control/battery/solar box on dock.",
  },
  {
    id: "lutron-blinds",
    name: "Lutron Motorized Roller Shades",
    category: "Interior Systems",
    location: "Original House",
    status: "Watch",
    notes: "Motorized roller shade asset linked to drapery/shade repair records.",
  },
  {
    id: "wolf-range",
    name: "Wolf Range",
    category: "Kitchen",
    location: "Original House",
    status: "Unknown",
    notes: "Kitchen range asset. Check for duplicate naming before adding more records.",
  },
  {
    id: "av-room",
    name: "AV Room / Main Racks",
    category: "AV / Network",
    location: "Basement / AV",
    status: "Watch",
    notes: "Main AV rack, Sonos rack, network and control systems.",
  },
  {
    id: "gulfstream-g280",
    name: "Gulfstream G280 N280CC",
    category: "Aircraft",
    location: "Hangar",
    status: "Good",
    notes: "Standardized hangar aircraft name using visible tail number N280CC.",
  },
];

const defaultVendors: Vendor[] = [
  {
    id: "seattle-boat",
    name: "Seattle Boat",
    category: "Marine",
    contact: "Boat / Cobalt / dock-related service",
    notes: "Use for Cobalt boat service records and marine support.",
  },
  {
    id: "penthouse-drapery",
    name: "Penthouse Drapery",
    category: "Interior / Shades",
    contact: "accounting@penthousedrapery.com",
    notes: "Motorized roller shade service. Link to Lutron blinds asset.",
  },
  {
    id: "pool-service",
    name: "Pool / Spa Service",
    category: "Pool / Spa",
    contact: "Add primary contact",
    notes: "Pool testing, filter cleaning, spa service, ClearRay, and water treatment.",
  },
  {
    id: "climate-service",
    name: "Climate / Mechanical Service",
    category: "HVAC / Boiler",
    contact: "Add primary contact",
    notes: "Boilers, HVAC zones, pool dehumidification, heat pumps, and mechanical service.",
  },
  {
    id: "electrician",
    name: "Electrical Vendor",
    category: "Electrical",
    contact: "Add primary contact",
    notes: "Panels, generator, dock power, equipment circuits, and controls.",
  },
  {
    id: "landscape",
    name: "Grounds / Landscape Vendor",
    category: "Grounds",
    contact: "Add primary contact",
    notes: "Irrigation, lawns, plantings, sport court, veggie boxes, and general grounds work.",
  },
];

const defaultProcedures: Procedure[] = [
  {
    id: "pool-backwash",
    name: "Pool Sand Filter Pressure Check / Backwash",
    section: "Indoor Pool",
    frequency: "As needed / routine check",
    steps: [
      "Check filter pressure and compare to normal operating pressure.",
      "Confirm valves are in the correct position before changing flow direction.",
      "Backwash only when pressure or water quality indicates it is needed.",
      "Record pressure before and after service in Logs.",
      "Return system to normal filter operation and verify flow.",
    ],
  },
  {
    id: "spa-check",
    name: "Hot Tub
