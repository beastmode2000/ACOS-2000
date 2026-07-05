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
type Priority = "High" | "Normal" | "Seasonal";

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
  notes: string;
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

type SearchResult = {
  id: string;
  type: "Location" | "Asset" | "Vendor" | "Service" | "Document" | "Procedure";
  title: string;
  subtitle: string;
  detail: string;
  screen: Screen;
  assetId?: string;
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
  Online: { background: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
  Offline: { background: "#FEECEC", color: "#B42318", border: "#FACACA" },
  Seasonal: { background: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
  Monitor: { background: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
  Open: { background: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
  Scheduled: { background: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
  Completed: { background: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
};

const locations: LocationRecord[] = [
  {
    id: "general",
    name: "General",
    type: "Property",
    zone: "2000",
    notes: "Whole-estate default location for records that are not tied to one room.",
  },
  {
    id: "main-house",
    name: "Main House",
    type: "Building",
    zone: "2000",
    notes: "Primary house and main interior systems.",
  },
  {
    id: "mechanical-room",
    name: "Mechanical Room",
    type: "Systems",
    zone: "Main House",
    notes: "Boilers, DHW tanks, hydronic controls, HVAC zoning, and major mechanical equipment.",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    type: "Interior",
    zone: "Main House",
    notes: "Kitchen appliances, range, dishwashers, freezer, and service records.",
  },
  {
    id: "pantry",
    name: "Pantry",
    type: "Interior",
    zone: "Main House",
    notes: "Pantry storage and freezer records.",
  },
  {
    id: "wine-room",
    name: "Wine Room",
    type: "Interior",
    zone: "Main House",
    notes: "Wine storage and freezer records.",
  },
  {
    id: "upstairs-laundry",
    name: "Upstairs Laundry Closet",
    type: "Laundry",
    zone: "Main House",
    notes: "Upstairs laundry equipment location.",
  },
  {
    id: "pool-changing-room",
    name: "Pool Changing Room",
    type: "Laundry / Pool",
    zone: "Pool Area",
    notes: "Pool changing room and dryer record location.",
  },
  {
    id: "fitness-room",
    name: "Fitness Room",
    type: "Interior",
    zone: "Main House",
    notes: "Fitness room appliances and systems.",
  },
  {
    id: "house-office",
    name: "House Managers Office",
    type: "Office",
    zone: "Main House",
    notes: "House manager office appliances and operational records.",
  },
  {
    id: "elyses-room",
    name: "Elyse's Room",
    type: "Bedroom",
    zone: "Main House",
    notes: "Room-level records including blinds / shade assets.",
  },
  {
    id: "elliot-room",
    name: "Elliot's Room",
    type: "Bedroom",
    zone: "Main House",
    notes: "Room-level HVAC and comfort records. Mini-split options were discussed for allergies and independent control.",
  },
  {
    id: "play-room",
    name: "Play Room",
    type: "Thermostat Zone",
    zone: "Main House",
    notes: "Honeywell thermostat zone shown in energy report references.",
  },
  {
    id: "exercise-room",
    name: "Exercise Room",
    type: "Thermostat Zone",
    zone: "Main House",
    notes: "Honeywell thermostat zone shown in energy report references.",
  },
  {
    id: "gym-nanny",
    name: "Gym / Nanny",
    type: "Thermostat Zone",
    zone: "Main House",
    notes: "Honeywell thermostat zone shown in energy report references.",
  },
  {
    id: "master-bath-floor",
    name: "Master Bath Floor",
    type: "Thermostat Zone",
    zone: "Main House",
    notes: "Honeywell thermostat zone shown as MasBathFloor in energy report references.",
  },
  {
    id: "indoor-pool",
    name: "Indoor Pool",
    type: "Pool",
    zone: "Addition",
    notes: "Indoor pool area, construction records, pool HVAC, dehumidification, and pool systems.",
  },
  {
    id: "pool-equipment",
    name: "Pool Equipment Room",
    type: "Pool Systems",
    zone: "Addition",
    notes: "Pool filtration, pumps, chemical feed, UV / ozone, heat exchanger loop, and service records.",
  },
  {
    id: "standalone-spa",
    name: "Standalone Spa",
    type: "Spa",
    zone: "Outdoor",
    notes: "Sundance Optima spa, heater, ClearRay UV-C, and spa controls.",
  },
  {
    id: "dock",
    name: "Dock",
    type: "Waterfront",
    zone: "Lake",
    notes: "Boat lifts, SeaDoo lift, dock power, lift control boxes, and waterfront equipment.",
  },
  {
    id: "cobalt-lift",
    name: "Cobalt Lift",
    type: "Dock Lift",
    zone: "Dock",
    notes: "Cobalt boat lift and newer Sunstream lift control / battery / solar box.",
  },
  {
    id: "seadoo-lift",
    name: "SeaDoo Lift",
    type: "PWC Lift",
    zone: "Dock",
    notes: "SeaDoo lift and its separate older / smaller Sunstream box record.",
  },
  {
    id: "dock-lift",
    name: "Dock Lift Box",
    type: "Lift Controls",
    zone: "Dock",
    notes: "Additional dock lift control box. Keep separate from Cobalt and SeaDoo lift boxes.",
  },
  {
    id: "water-trampoline",
    name: "Water Trampoline",
    type: "Waterfront",
    zone: "Lake",
    notes: "Water trampoline added to the property map and seasonal waterfront records.",
  },
  {
    id: "lakefront",
    name: "Lakefront",
    type: "Exterior",
    zone: "Lake",
    notes: "Lakefront, shoreline, waterfront access, and weather watch area.",
  },
  {
    id: "garage",
    name: "Garage",
    type: "Garage",
    zone: "Exterior",
    notes: "Garage door openers, access, vehicles, tools, and service equipment.",
  },
  {
    id: "old-garage",
    name: "Old Garage",
    type: "Garage",
    zone: "Exterior",
    notes: "Old garage reference point used for ADU map placement.",
  },
  {
    id: "adu",
    name: "ADU",
    type: "Building",
    zone: "Left of Old Garage",
    notes: "Accessory dwelling unit added to the property map left of the old garage.",
  },
  {
    id: "driveway",
    name: "Driveway",
    type: "Exterior",
    zone: "Entry",
    notes: "Driveway, approach, access, and vendor arrival area.",
  },
  {
    id: "gate",
    name: "Gate",
    type: "Access",
    zone: "Entry",
    notes: "Gate and access-control related records. Credential details should stay redacted / admin-only.",
  },
  {
    id: "exterior",
    name: "Exterior",
    type: "Exterior",
    zone: "2000",
    notes: "Exterior envelope, paint/stain, siding, exterior checks, and general outside service.",
  },
  {
    id: "roof-gutters",
    name: "Roof / Gutters",
    type: "Exterior",
    zone: "2000",
    notes: "Roof, gutters, downspouts, drainage, and sheet metal records.",
  },
  {
    id: "irrigation",
    name: "Irrigation",
    type: "Landscape Systems",
    zone: "Grounds",
    notes: "Irrigation controls, sprinkler service, leak checks, and landscaping system records.",
  },
  {
    id: "lower-generator-area",
    name: "Lower Generator Area",
    type: "Generator",
    zone: "Outdoor",
    notes: "Lower outdoor generator and service access location.",
  },
  {
    id: "basement",
    name: "Basement",
    type: "Interior",
    zone: "Main House",
    notes: "Basement layout and walk-through map records.",
  },
  {
    id: "basement-stairs-trampoline",
    name: "Basement Stairs from Trampoline Area",
    type: "Map Reference",
    zone: "Basement",
    notes: "Basement map starting point from the trampoline-side stairs.",
  },
  {
    id: "addition-first-floor",
    name: "Addition First Floor",
    type: "Construction",
    zone: "Addition",
    notes: "First floor of addition. Indoor pool construction photo is linked here.",
  },
  {
    id: "hangar",
    name: "Hangar",
    type: "Aircraft",
    zone: "Offsite",
    notes: "Aircraft records and hangar sub-location references.",
  },
  {
    id: "gulfstream-g600-n23pa",
    name: "Gulfstream G600 N23PA",
    type: "Aircraft",
    zone: "Hangar",
    notes: "Hangar sub-location / aircraft record.",
  },
  {
    id: "gulfstream-g280-n280cc",
    name: "Gulfstream G280 N280CC",
    type: "Aircraft",
    zone: "Hangar",
    notes: "Standardized aircraft name. Photo reference showed tail number N280CC.",
  },
  {
    id: "gulfstream-g280-n755pa",
    name: "Gulfstream G280 N755PA",
    type: "Aircraft",
    zone: "Hangar",
    notes: "Hangar sub-location / aircraft record.",
  },
  {
    id: "pilatus-pc12-n126al",
    name: "Pilatus PC12 N126AL",
    type: "Aircraft",
    zone: "Hangar",
    notes: "Hangar sub-location / aircraft record.",
  },
];

const vendors: VendorRecord[] = [
  {
    id: "penthousedrapery",
    name: "Penthouse Drapery",
    category: "Blinds / Drapery",
    phone: "+1 206-292-8336",
    email: "accounting@penthousedrapery.com",
    notes: "4033 16th Ave SW Suite A, Seattle, WA 98106. Invoice #176396 dated 06/16/2026 linked to Blinds Lutron.",
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
    category: "Boilers / DHW",
    notes: "Vitodens 200 boilers and Vitocell 300-V domestic hot water tanks.",
  },
  {
    id: "mcdonnellmiller",
    name: "McDonnell & Miller",
    category: "Boiler Safety",
    notes: "GuardDog low-water cut-off model 751P-MT-120.",
  },
  {
    id: "sunstream",
    name: "Sunstream Boat Lifts",
    category: "Dock / Boat Lifts",
    notes: "Dock lift boxes and controls. Cobalt box is the larger / newer box from last summer.",
  },
  {
    id: "sundance",
    name: "Sundance Spas",
    category: "Spa",
    notes: "Sundance 880-series Optima spa equipment reference.",
  },
  {
    id: "hydroquip",
    name: "HydroQuip / Therm Products",
    category: "Spa Heater",
    notes: "Water Pro Series Smart Heater Plus with Titanium Inside.",
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
    notes: "HZ432 zoning controls and thermostat zone references.",
  },
  {
    id: "desertaire",
    name: "Desert Aire",
    category: "Pool Dehumidification",
    notes: "Indoor pool DHU-1 dehumidification equipment, control/display, SR501 relay, and hydronic heat coil.",
  },
  {
    id: "pentair",
    name: "Pentair",
    category: "Pool Pump",
    notes: "Pentair 3.0 HP pool pump reference in the pool equipment chain.",
  },
  {
    id: "triton",
    name: "Triton II",
    category: "Pool Filter",
    notes: "Triton II sand filter reference in the pool equipment chain.",
  },
  {
    id: "ultrapure",
    name: "UltraPure / Paramount UV2",
    category: "Pool UV / Ozone",
    notes: "UV-ozone equipment in the pool water treatment chain.",
  },
  {
    id: "taylor",
    name: "Taylor Technologies",
    category: "Pool Testing",
    notes: "K-2006 / K-2006C pool test kit reference.",
  },
  {
    id: "allproblinds",
    name: "A All Pro Blinds",
    category: "Blinds",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "aaafire",
    name: "AAA Fire",
    category: "Fire / Safety",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "advancedirrigation",
    name: "Advanced Irrigation",
    category: "Irrigation",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "amazon",
    name: "Amazon",
    category: "Supplies",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "americanleak",
    name: "American Leak Detection",
    category: "Leak Detection",
    notes: "MaintainX vendor record showed 2 contacts.",
  },
  {
    id: "andersen",
    name: "Andersen Installation inc.",
    category: "Windows / Installation",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "applianceservice",
    name: "Appliance Service Station",
    category: "Appliances",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "aquadive",
    name: "Aqua Dive",
    category: "Pool / Dive",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "aquaquip",
    name: "Aqua Quip",
    category: "Pool / Spa",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "autonationford",
    name: "AutoNation Ford Bellevue",
    category: "Vehicles",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "bestplumbing",
    name: "Best Plumbing",
    category: "Plumbing",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "bosch",
    name: "Bosch",
    category: "Appliances",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "cascade",
    name: "Cascade Spray",
    category: "Landscape / Irrigation",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "gutter",
    name: "Consolidated Gutter and Sheet Metal",
    category: "Gutters / Sheet Metal",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "dsquare",
    name: "D Square Energy",
    category: "Energy / Electrical",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "daburns",
    name: "D.A. Burns",
    category: "Cleaning / Floors",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "electromatic",
    name: "Electromatic Refrigeration",
    category: "Refrigeration",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "elliottpaint",
    name: "Elliott Paint Company",
    category: "Paint",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "greaterseattlefloors",
    name: "Greater Seattle Floors",
    category: "Floors",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "hightechliving",
    name: "High Tech Living",
    category: "Smart Home",
    notes: "MaintainX vendor record showed 1 contact.",
  },
  {
    id: "homedepot",
    name: "Home Depot",
    category: "Materials",
    notes: "MaintainX vendor record. No contacts shown.",
  },
  {
    id: "i90motorsports",
    name: "I90 Motorsports",
    category: "Motorsports",
    notes: "MaintainX vendor record captured from vendor screenshots.",
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
    notes: "White wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE. Nameplate details previously visible: year built 2018, MAWP water 60 PSI, max water temperature 210°F, heating surface 31.99 sq ft, minimum relief valve capacity 255.9 lb/hr, CRN R1497.5C.",
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
    notes: "White wall-mounted Viessmann Vitodens 200. Latest clear nameplate: serial 758960507593, year built 2025, MAWP water 60 PSI, max water temperature 210°F, heating surface 31.99 sq ft, minimum relief valve capacity 255.9 lb/hr, CRN R1497.5C.",
    vendorIds: ["viessmann"],
  },
  {
    id: "boiler-2-new",
    name: "Boiler B-2 New",
    locationId: "mechanical-room",
    category: "Hydronic Heating",
    status: "Monitor",
    make: "Viessmann",
    model: "Vitodens 200",
    notes: "MaintainX asset list showed Boiler B-2 New in the Mechanical Room. Keep this record de-duplicated against Boiler B-2 when the final asset database is cleaned.",
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
    notes: "Twin gray indirect-fired domestic hot water storage tanks. Tank model EVIA 300. 79 USG / 300 L. Stainless steel tank / heat exchanger AISI 444 / 316 Ti. Heat exchanger coil storage capacity 2.9 USG / 11 L. Max heat exchanger water temperature 248°F / 120°C. Max heat exchanger water pressure 195 psig / 1300 kPa. Max tank working pressure 150 psig.",
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
    notes: "Manual-reset low-water cut-off device. Include green/red LED meanings, test/reset behavior, and CSD-1 compliance notes with boiler safety records. Do not bypass safety controls.",
    vendorIds: ["mcdonnellmiller", "viessmann"],
  },
  {
    id: "carrier-hvac-hz432",
    name: "Carrier Forced-Air HVAC + Honeywell HZ432 Zones",
    locationId: "mechanical-room",
    category: "HVAC",
    status: "Online",
    make: "Carrier / Honeywell",
    model: "HZ432",
    notes: "Forced-air Carrier HVAC with Honeywell HZ432 zoning controls. Thermostat zone references include Play Room, Kitchen, Exercise Room, Gym / Nanny, and Master Bath Floor.",
    vendorIds: ["carrier", "honeywell"],
  },
  {
    id: "mini-split-elliot-option",
    name: "Elliot Room Mini-Split Option",
    locationId: "elliot-room",
    category: "HVAC Planning",
    status: "Monitor",
    notes: "Two options were discussed: $16k dedicated mini split with its own outdoor unit for full room control; $10k mini split tied to existing outdoor unit, but all kids rooms need matching mode behavior. The $6k difference may be worth it for Elliot's allergies and to avoid system lockout when rooms call for different modes.",
    vendorIds: ["carrier"],
  },
  {
    id: "desertaire-dhu1",
    name: "Desert Aire DHU-1 Pool Dehumidification",
    locationId: "indoor-pool",
    category: "Pool HVAC",
    status: "Monitor",
    make: "Desert Aire",
    model: "DHU-1",
    notes: "Indoor pool dehumidification system. Pool HVAC / dehumidification includes Desert Aire DHU-1, Desert Aire control/display, SR501 relay, and hydronic heat coil.",
    vendorIds: ["desertaire"],
  },
  {
    id: "pool-pump-pentair",
    name: "Pentair 3.0 HP Pool Pump",
    locationId: "pool-equipment",
    category: "Pool Equipment",
    status: "Online",
    make: "Pentair",
    model: "3.0 HP",
    notes: "Pool water treatment chain: Pool/Spa source → Pentair 3.0 HP pump → Triton II sand filter → UltraPure / Paramount UV2 UV-ozone equipment → return to pool.",
    vendorIds: ["psf", "pentair"],
  },
  {
    id: "pool-filter-triton",
    name: "Triton II Sand Filter",
    locationId: "pool-equipment",
    category: "Pool Filtration",
    status: "Online",
    make: "Triton II",
    notes: "Sand filter in pool water treatment chain. Keep pressure readings and backwash history in service notes.",
    vendorIds: ["psf", "triton"],
  },
  {
    id: "pool-uv-ozone",
    name: "UltraPure / Paramount UV2 UV-Ozone",
    locationId: "pool-equipment",
    category: "Pool Water Treatment",
    status: "Online",
    make: "UltraPure / Paramount",
    model: "UV2",
    notes: "UV-ozone equipment in pool treatment chain before return to pool.",
    vendorIds: ["psf", "ultrapure"],
  },
  {
    id: "pool-hx-p8",
    name: "Pool Heat Transfer HX-1 / P-8",
    locationId: "pool-equipment",
    category: "Pool Heat Transfer",
    status: "Online",
    notes: "Heat transfer uses HX-1 / P-8 into the isolated pool loop.",
    vendorIds: ["psf"],
  },
  {
    id: "pool-loop-p9",
    name: "Pool Water Loop P-9",
    locationId: "pool-equipment",
    category: "Pool Circulation",
    status: "Online",
    notes: "P-9 circulates the pool water loop.",
    vendorIds: ["psf"],
  },
  {
    id: "taylor-test-kit",
    name: "Taylor Technologies K-2006 / K-2006C Test Kit",
    locationId: "pool-equipment",
    category: "Pool Testing",
    status: "Online",
    make: "Taylor Technologies",
    model: "K-2006 / K-2006C",
    notes: "Pool test kit reference for chemical testing procedure.",
    vendorIds: ["taylor", "psf"],
  },
  {
    id: "sundance-optima",
    name: "Sundance 880 Optima Spa",
    locationId: "standalone-spa",
    category: "Spa",
    status: "Monitor",
    make: "Sundance",
    model: "OPTIMA",
    serial: "00P3LCD-100528521-0315",
    notes: "Sundance 880-series Optima spa. Date 03/21/15. Electrical rating label: 240 V, current 26/40/48 A, breaker size 40/50/60 A, frequency 60 Hz, single phase, 3 wires. ETL / Intertek listed. Some rust/corrosion visible at cabinet/nameplate screws and lower compartment/floor.",
    vendorIds: ["sundance", "aquaquip"],
  },
  {
    id: "spa-control-system",
    name: "Spa Control System",
    locationId: "standalone-spa",
    category: "Spa Controls",
    status: "Monitor",
    model: "LCD controller part #6600-328 Rev E",
    notes: "Gray spa control system enclosure and LCD controller part #6600-328 Rev E. Include high-limit tripped and heater-on indicator observations in service notes.",
    vendorIds: ["sundance"],
  },
  {
    id: "spa-heater-hydroquip",
    name: "HydroQuip Water Pro Smart Heater Plus",
    locationId: "standalone-spa",
    category: "Spa Heater",
    status: "Monitor",
    make: "Therm Products / HydroQuip",
    notes: "Water Pro Series Smart Heater Plus with Titanium Inside label.",
    vendorIds: ["hydroquip", "sundance"],
  },
  {
    id: "clearray-uv",
    name: "ClearRay UV-C Water Purification",
    locationId: "standalone-spa",
    category: "Spa UV",
    status: "Monitor",
    make: "ClearRay",
    notes: "ClearRay UV-C water purification / ballast equipment labeled QC tested 230V passed.",
    vendorIds: ["sundance"],
  },
  {
    id: "sunstream-cobalt",
    name: "Sunstream Lift Box — Cobalt",
    locationId: "cobalt-lift",
    category: "Dock / Boat Lift",
    status: "Online",
    make: "Sunstream",
    notes: "Larger / newer Sunstream lift control, battery, and solar box from last summer. This box belongs to the Cobalt boat lift.",
    vendorIds: ["sunstream"],
  },
  {
    id: "sunstream-seadoo",
    name: "Sunstream Lift Box — SeaDoo",
    locationId: "seadoo-lift",
    category: "Dock / PWC Lift",
    status: "Monitor",
    make: "Sunstream",
    notes: "SeaDoo lift box. Smaller / older Sunstream box. Keep separate from Cobalt box.",
    vendorIds: ["sunstream"],
  },
  {
    id: "sunstream-dock",
    name: "Sunstream Lift Box — Dock",
    locationId: "dock-lift",
    category: "Dock Lift Controls",
    status: "Monitor",
    make: "Sunstream",
    notes: "Additional dock lift box. Smaller / older box. Keep its photos and service records separate.",
    vendorIds: ["sunstream"],
  },
  {
    id: "craft-cobalt",
    name: "Craft — Cobalt R-7",
    locationId: "dock",
    category: "Watercraft",
    status: "Seasonal",
    notes: "Cobalt R-7 watercraft record connected to dock and newer Sunstream Cobalt lift box.",
    vendorIds: ["sunstream", "i90motorsports"],
  },
  {
    id: "craft-seadoo",
    name: "Craft — SeaDoo 2024",
    locationId: "dock",
    category: "Watercraft",
    status: "Seasonal",
    notes: "2024 SeaDoo record connected to dock and SeaDoo lift records. Sea-Doo repair records should link here.",
    vendorIds: ["i90motorsports", "sunstream"],
  },
  {
    id: "water-trampoline",
    name: "Water Trampoline",
    locationId: "water-trampoline",
    category: "Waterfront",
    status: "Seasonal",
    notes: "Water trampoline added to the map and seasonal waterfront check list.",
    vendorIds: [],
  },
  {
    id: "blinds-lutron",
    name: "Blinds Lutron",
    locationId: "general",
    category: "Motorized Shades",
    status: "Monitor",
    make: "Lutron",
    notes: "Motorized roller shade asset. Penthouse Drapery invoice #176396 / motorized roller shade repair belongs here.",
    vendorIds: ["penthousedrapery", "allproblinds"],
  },
  {
    id: "blinds-hunter",
    name: "Blinds Hunter Douglas",
    locationId: "elyses-room",
    category: "Blinds",
    status: "Online",
    make: "Hunter Douglas",
    notes: "MaintainX asset record showed Blinds Hunter Douglas — Elyse's Room.",
    vendorIds: ["allproblinds"],
  },
  {
    id: "dishwasher-dw1",
    name: "Dishwasher DW-1",
    locationId: "fitness-room",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dishwasher DW-1 — Fitness Room.",
    vendorIds: ["bosch", "applianceservice"],
  },
  {
    id: "dishwasher-dw2",
    name: "Dishwasher DW-2",
    locationId: "house-office",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dishwasher DW-2 — House Managers Office.",
    vendorIds: ["bosch", "applianceservice"],
  },
  {
    id: "dishwasher-dw3",
    name: "Dishwasher DW-3 Right",
    locationId: "kitchen",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dishwasher DW-3 (Right) — Kitchen.",
    vendorIds: ["bosch", "applianceservice"],
  },
  {
    id: "dishwasher-dw4",
    name: "Dishwasher DW-4 Left",
    locationId: "kitchen",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dishwasher DW-4 (Left) — Kitchen.",
    vendorIds: ["bosch", "applianceservice"],
  },
  {
    id: "dryer-dr1",
    name: "Dryer DR-1",
    locationId: "upstairs-laundry",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dryer DR-1 — Upstairs Laundry Closet.",
    vendorIds: ["applianceservice"],
  },
  {
    id: "dryer-dr2",
    name: "Dryer DR-2",
    locationId: "pool-changing-room",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dryer DR-2 — Pool Changing Room.",
    vendorIds: ["applianceservice"],
  },
  {
    id: "dryer-dr3",
    name: "Dryer DR-3",
    locationId: "house-office",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Dryer DR-3 — House Managers Office.",
    vendorIds: ["applianceservice"],
  },
  {
    id: "freezer-fr1",
    name: "Freezer FR-1",
    locationId: "pantry",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Freezer FR-1 — Pantry.",
    vendorIds: ["electromatic", "applianceservice"],
  },
  {
    id: "freezer-fr2",
    name: "Freezer FR-2",
    locationId: "indoor-pool",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Freezer FR-2 — Pool.",
    vendorIds: ["electromatic", "applianceservice"],
  },
  {
    id: "freezer-fr3",
    name: "Freezer FR-3",
    locationId: "indoor-pool",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Freezer FR-3 — Pool.",
    vendorIds: ["electromatic", "applianceservice"],
  },
  {
    id: "freezer-fr4",
    name: "Freezer FR-4",
    locationId: "kitchen",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Freezer FR-4 — Kitchen.",
    vendorIds: ["electromatic", "applianceservice"],
  },
  {
    id: "freezer-fr5",
    name: "Freezer FR-5",
    locationId: "wine-room",
    category: "Appliance",
    status: "Online",
    notes: "MaintainX asset record showed Freezer FR-5 — Wine Room.",
    vendorIds: ["electromatic", "applianceservice"],
  },
  {
    id: "wolf-range",
    name: "Wolfe Range / Range-Wolf",
    locationId: "kitchen",
    category: "Cooking",
    status: "Online",
    notes: "MaintainX showed a separate asset named wolfe range with status On and last updated 02/11/2026. Possible duplicate against Range-Wolf; keep for de-duplication.",
    vendorIds: ["applianceservice"],
  },
  {
    id: "flologic",
    name: "FloLogic",
    locationId: "general",
    category: "Water Protection",
    status: "Online",
    notes: "Whole-property water monitoring / shutoff asset. Link plumbing, leak detection, and emergency water shutoff notes here.",
    vendorIds: ["bestplumbing", "americanleak"],
  },
  {
    id: "garage-openers",
    name: "Garage Door Openers",
    locationId: "garage",
    category: "Garage",
    status: "Online",
    notes: "MaintainX asset record showed Garage Door Openers — General.",
    vendorIds: [],
  },
  {
    id: "generator-lower",
    name: "Generator Lower",
    locationId: "lower-generator-area",
    category: "Generator",
    status: "Monitor",
    notes: "MaintainX asset record showed Generator (Lower) — Outdoor Generator.",
    vendorIds: ["dsquare"],
  },
  {
    id: "g600-n23pa",
    name: "Gulfstream G600 N23PA",
    locationId: "gulfstream-g600-n23pa",
    category: "Aircraft",
    status: "Monitor",
    notes: "Hangar sub-location / aircraft record.",
    vendorIds: [],
  },
  {
    id: "g280-n280cc",
    name: "Gulfstream G280 N280CC",
    locationId: "gulfstream-g280-n280cc",
    category: "Aircraft",
    status: "Monitor",
    notes: "Standardized aircraft name from uploaded aircraft photo. Use N280CC, not N28CC.",
    vendorIds: [],
  },
  {
    id: "g280-n755pa",
    name: "Gulfstream G280 N755PA",
    locationId: "gulfstream-g280-n755pa",
    category: "Aircraft",
    status: "Monitor",
    notes: "Hangar sub-location / aircraft record.",
    vendorIds: [],
  },
  {
    id: "pc12-n126al",
    name: "Pilatus PC12 N126AL",
    locationId: "pilatus-pc12-n126al",
    category: "Aircraft",
    status: "Monitor",
    notes: "Hangar sub-location / aircraft record.",
    vendorIds: [],
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
    notes: "Penthouse Drapery invoice #176396 dated 06/16/2026. Link this service record to Blinds Lutron.",
  },
  {
    id: "service-boiler-nameplate",
    assetId: "boiler-2",
    vendorId: "viessmann",
    date: "2026-07-02",
    title: "Clear Boiler B-2 nameplate captured",
    status: "Completed",
    notes: "Confirmed Viessmann boiler nameplate details: serial 758960507593, year built 2025, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief capacity 255.9 lb/hr, CRN R1497.5C.",
  },
  {
    id: "service-boiler-heat-exchanger",
    assetId: "boiler-2",
    vendorId: "viessmann",
    date: "2026-07-02",
    title: "Boiler 2 recalled heat exchanger / igniter issue",
    status: "Monitor",
    notes: "Recalled heat exchanger was replaced on a Vitodens 200W / Boiler 2. After new parts were installed, the igniter would not turn on. Keep this as a monitor record until resolved.",
  },
  {
    id: "service-dhw-tanks",
    assetId: "vitocell-tanks",
    vendorId: "viessmann",
    date: "2026-07-02",
    title: "Twin Vitocell 300-V DHW tanks documented",
    status: "Completed",
    notes: "Recorded twin gray Viessmann Vitocell 300-V EVIA 300 tanks and capacity / pressure / temperature details.",
  },
  {
    id: "service-pool-chain",
    assetId: "pool-pump-pentair",
    vendorId: "psf",
    date: "2026-07-02",
    title: "Pool equipment chain recorded",
    status: "Completed",
    notes: "Pool/Spa source → Pentair 3.0 HP pump → Triton II sand filter → UltraPure / Paramount UV2 UV-ozone equipment → return to pool. Heat transfer uses HX-1 / P-8 into isolated pool loop; P-9 circulates pool water loop.",
  },
  {
    id: "service-desertaire",
    assetId: "desertaire-dhu1",
    vendorId: "desertaire",
    date: "2026-07-02",
    title: "Desert Aire pool HVAC record added",
    status: "Monitor",
    notes: "Desert Aire DHU-1, control/display, SR501 relay, and hydronic heat coil added to pool HVAC records.",
  },
  {
    id: "service-spa-record",
    assetId: "sundance-optima",
    vendorId: "sundance",
    date: "2026-07-02",
    title: "Sundance Optima spa equipment record created",
    status: "Completed",
    notes: "Recorded Sundance 880-series Optima model, serial 00P3LCD-100528521-0315, electrical rating, HydroQuip heater, ClearRay UV-C equipment, and visible corrosion notes.",
  },
  {
    id: "service-sunstream-lifts",
    assetId: "sunstream-cobalt",
    vendorId: "sunstream",
    date: "2026-07-02",
    title: "Dock lift control boxes documented",
    status: "Completed",
    notes: "Confirmed multiple Sunstream lift boxes on dock. Larger/newer Sunstream lift box belongs to the Cobalt boat lift. Smaller/older boxes belong to SeaDoo and dock lift records.",
  },
  {
    id: "service-indoor-pool-construction",
    assetId: "desertaire-dhu1",
    date: "2026-07-02",
    title: "Indoor pool construction photo added",
    status: "Completed",
    notes: "Photo label: Indoor pool construction — first floor of addition. Shows concrete pool shell/trench area, wet concrete / finished surface work, temporary construction lighting, hoses, and worker present.",
  },
  {
    id: "service-hangar-n280cc",
    assetId: "g280-n280cc",
    date: "2026-07-01",
    title: "Aircraft tail number standardized",
    status: "Completed",
    notes: "Uploaded aircraft photo clearly showed Gulfstream tail number N280CC. Standardize as Gulfstream G280 N280CC.",
  },
  {
    id: "service-credentials-redacted",
    assetId: "flologic",
    date: "2026-07-02",
    title: "Credential inventory redacted",
    status: "Completed",
    notes: "A printed Log in and Passwords sheet was uploaded. Do not store raw passwords, passcodes, PINs, emails, or access codes in normal Atlas notes. Keep only redacted / admin-only credential categories.",
  },
  {
    id: "service-branding",
    assetId: "flologic",
    date: "2026-07-05",
    title: "Official Atlas logo selected",
    status: "Completed",
    notes: "Official logo is the clean navy-and-gold Atlas mark with stylized A, gold globe arcs, gold compass/star, and ATLAS wordmark.",
  },
];

const documents: DocumentRecord[] = [
  {
    id: "doc-systems-layout",
    title: "2000 Systems Layout Draft v1",
    area: "Mechanical / Pool / HVAC",
    type: "PDF",
    notes: "Filename: 2000_systems_layout_draft_v1.pdf. Draft layout of main mechanical, electrical, pool, HVAC, Viessmann hydronic boiler/cascade/DHW, Carrier + Honeywell HZ432 zones, Desert Aire pool dehumidification, and pool water treatment systems.",
  },
  {
    id: "doc-pool-equipment",
    title: "2000 Pool Equipment Record v1",
    area: "Pool Equipment Room",
    type: "PDF",
    linkedAssetId: "pool-pump-pentair",
    notes: "Pool chain: Pool/Spa source → Pentair 3.0 HP pump → Triton II sand filter → UltraPure / Paramount UV2 UV-ozone equipment → return to pool. Includes Desert Aire DHU-1 and HX-1 / P-8 / P-9 notes.",
  },
  {
    id: "doc-property-map",
    title: "Locked Original Property Map",
    area: "Property Map",
    type: "Image",
    notes: "Original map should stay locked. Use editable overlay labels for boat, SeaDoo, water trampoline, ADU, and other pins.",
  },
  {
    id: "doc-pool-construction",
    title: "Indoor pool construction — first floor of addition",
    area: "Addition First Floor",
    type: "Photo",
    notes: "Construction photo showing indoor pool shell/trench area, concrete work, lighting, hoses, and worker present.",
  },
  {
    id: "doc-penthouse-invoice",
    title: "Penthouse Drapery Invoice #176396",
    area: "Blinds Lutron",
    type: "Invoice",
    linkedAssetId: "blinds-lutron",
    notes: "Invoice #176396 dated 06/16/2026 for motorized roller shade repair. Vendor: Penthouse Drapery.",
  },
  {
    id: "doc-sunstream-photos",
    title: "Sunstream lift box photo set",
    area: "Dock",
    type: "Photos",
    notes: "Photos show white Sunstream lift boxes with lid-mounted solar panels, dock-mounted enclosures, internal battery/control wiring, and Sunstream control module with up/down controls.",
  },
  {
    id: "doc-spa-nameplate",
    title: "Sundance Optima spa nameplate and control photos",
    area: "Standalone Spa",
    type: "Photos",
    linkedAssetId: "sundance-optima",
    notes: "Includes nameplate, electrical rating, gray spa control system enclosure, HydroQuip heater, ClearRay UV-C equipment, and corrosion notes.",
  },
  {
    id: "doc-boiler-nameplates",
    title: "Viessmann boiler nameplate photos",
    area: "Mechanical Room",
    type: "Photos",
    linkedAssetId: "boiler-2",
    notes: "Photos confirm Boiler 1 and Boiler 2 details, including serial 758960507593 and 2025 nameplate for Boiler B-2.",
  },
  {
    id: "doc-maintainx-assets",
    title: "MaintainX asset screenshots",
    area: "Assets",
    type: "Screenshots",
    notes: "Asset records include blinds, boilers, craft, dishwashers, dryers, FloLogic, freezers, garage door openers, generator, and hangar aircraft records.",
  },
  {
    id: "doc-maintainx-vendors",
    title: "MaintainX vendor screenshots",
    area: "Vendors",
    type: "Screenshots",
    notes: "Vendor import source for de-duplicated Atlas vendor directory.",
  },
  {
    id: "doc-credentials-redacted",
    title: "Redacted / admin-only credential inventory",
    area: "Admin",
    type: "Secure Note",
    notes: "Do not store raw passwords, passcodes, PINs, emails, or access codes in normal Atlas notes. Track only redacted categories: access codes, Xfinity, Apple, YoLink, work Amazon, work login, and other systems to secure.",
  },
  {
    id: "doc-boat-sos",
    title: "Boat S.O.S. fluid analysis",
    area: "Dock / Cobalt",
    type: "Service Record",
    linkedAssetId: "craft-cobalt",
    notes: "Placeholder document record for Boat S.O.S. fluid analysis records to attach to Cobalt / dock service history.",
  },
  {
    id: "doc-seadoo-repair",
    title: "Sea-Doo repair records",
    area: "Dock / SeaDoo",
    type: "Service Record",
    linkedAssetId: "craft-seadoo",
    notes: "Placeholder document record for Sea-Doo repair records to attach to the 2024 SeaDoo asset.",
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
      "Run pump until discharge / sight glass water clears.",
      "Turn pump off before moving valve again.",
      "Move valve to rinse and run briefly.",
      "Return valve to filter position.",
      "Restart system and verify pressure, flow, and leaks.",
      "Log date, pressure, and anything unusual in Atlas.",
    ],
  },
  {
    id: "pool-equipment-check",
    title: "Pool Equipment Room Check",
    area: "Pool Equipment Room",
    priority: "Normal",
    steps: [
      "Check Pentair pump operation.",
      "Check Triton II filter pressure.",
      "Check UV / ozone equipment status.",
      "Check HX-1 / P-8 and P-9 circulation notes.",
      "Photo any leaks, unusual sound, or abnormal pressure.",
      "Save a service note if anything changes.",
    ],
  },
  {
    id: "pool-chem-test",
    title: "Pool Chemical Test",
    area: "Pool Equipment Room",
    priority: "Normal",
    steps: [
      "Use Taylor Technologies K-2006 / K-2006C kit.",
      "Record chlorine, pH, alkalinity, calcium hardness, and other readings as needed.",
      "Attach photo of results when useful.",
      "Create follow-up service note for any reading outside target range.",
    ],
  },
  {
    id: "desertaire-watch",
    title: "Desert Aire Pool HVAC Watch",
    area: "Indoor Pool",
    priority: "Normal",
    steps: [
      "Check indoor pool temperature and humidity feel.",
      "Check Desert Aire display / control status.",
      "Inspect for condensation or unusual sound.",
      "Check hydronic heat coil area visually.",
      "Log any fault, alarm, or comfort issue.",
    ],
  },
  {
    id: "boiler-low-water",
    title: "Boiler Low-Water Cut-Off Check",
    area: "Mechanical Room",
    priority: "High",
    steps: [
      "Identify the boiler before touching controls.",
      "Review GuardDog indicator lights.",
      "Do not bypass safety controls.",
      "Use manual reset only when the cause is understood.",
      "Record boiler number, indicator status, and action taken.",
    ],
  },
  {
    id: "boiler-room-walk",
    title: "Mechanical Room Walkthrough",
    area: "Mechanical Room",
    priority: "Normal",
    steps: [
      "Check Boiler B-1 and Boiler B-2 status.",
      "Check DHW tanks and visible piping.",
      "Look for leaks, corrosion, error codes, or unusual noise.",
      "Check Honeywell HZ432 zone panel status.",
      "Record photos of any changed condition.",
    ],
  },
  {
    id: "dhw-tank-check",
    title: "DHW Tank Check",
    area: "Mechanical Room",
    priority: "Normal",
    steps: [
      "Check both Vitocell 300-V tanks.",
      "Look for leaks, corrosion, relief discharge, or abnormal temperature.",
      "Confirm labels and valves remain visible.",
      "Log any service needed.",
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
    id: "cobalt-seasonal",
    title: "Cobalt Seasonal Check",
    area: "Dock",
    priority: "Seasonal",
    steps: [
      "Confirm Cobalt lift box condition.",
      "Inspect Cobalt R-7 before use.",
      "Attach Boat S.O.S. fluid analysis records when available.",
      "Log any lift, battery, or watercraft issue.",
    ],
  },
  {
    id: "seadoo-seasonal",
    title: "SeaDoo Seasonal Check",
    area: "Dock",
    priority: "Seasonal",
    steps: [
      "Inspect SeaDoo lift and SeaDoo box separately from Cobalt lift.",
      "Check SeaDoo condition before use.",
      "Attach Sea-Doo repair records to the SeaDoo asset.",
      "Log battery, lift, or service concerns.",
    ],
  },
  {
    id: "water-trampoline-seasonal",
    title: "Water Trampoline Seasonal Check",
    area: "Lakefront",
    priority: "Seasonal",
    steps: [
      "Check anchor lines and position.",
      "Inspect for tears, low inflation, or unsafe condition.",
      "Confirm weather and lake conditions before use.",
      "Log setup or removal date.",
    ],
  },
  {
    id: "flologic-response",
    title: "FloLogic / Leak Response",
    area: "General",
    priority: "High",
    steps: [
      "Identify alert or shutoff condition.",
      "Check obvious fixtures and mechanical areas.",
      "Check basement, pool equipment, garage, and exterior bibs.",
      "Call plumbing or leak detection vendor if source is not obvious.",
      "Log cause, vendor, and resolution.",
    ],
  },
  {
    id: "generator-check",
    title: "Lower Generator Check",
    area: "Lower Generator Area",
    priority: "Normal",
    steps: [
      "Inspect generator exterior and area around unit.",
      "Check for visible alarms, leaks, damage, or blocked airflow.",
      "Record date and any service need.",
    ],
  },
  {
    id: "garage-opener-check",
    title: "Garage Door Opener Check",
    area: "Garage",
    priority: "Normal",
    steps: [
      "Test opener operation.",
      "Listen for strain or unusual noise.",
      "Check safety sensors and tracks visually.",
      "Log any issue before failure.",
    ],
  },
  {
    id: "irrigation-check",
    title: "Irrigation Check",
    area: "Irrigation",
    priority: "Seasonal",
    steps: [
      "Run zone checks when appropriate.",
      "Look for broken heads, overspray, low pressure, or leaks.",
      "Link issues to Advanced Irrigation or Cascade Spray as needed.",
    ],
  },
  {
    id: "storm-prep",
    title: "Storm / Heavy Rain Prep",
    area: "Exterior",
    priority: "High",
    steps: [
      "Check dock and waterfront items.",
      "Check gutters and drainage.",
      "Check basement and lower areas.",
      "Check generator and exterior power-sensitive equipment.",
      "Log anything that needs follow-up.",
    ],
  },
  {
    id: "vendor-visit-intake",
    title: "Vendor Visit Intake",
    area: "General",
    priority: "Normal",
    steps: [
      "Select correct asset before saving notes.",
      "Record vendor, date, work performed, cost if known, status, and next step.",
      "Attach photos, invoices, or documents.",
      "Do not create duplicate vendor records.",
    ],
  },
  {
    id: "photo-document-process",
    title: "Photo / Document Upload Process",
    area: "General",
    priority: "Normal",
    steps: [
      "Attach photos to the correct asset or location.",
      "Give document records clear titles.",
      "Keep raw passwords and access codes out of normal notes.",
      "Use redacted / admin-only credential inventory for sensitive systems.",
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
  {
    id: "cal-irrigation",
    date: "2026-07-17",
    title: "Irrigation / sprinkler walk",
    area: "Irrigation",
    status: "Scheduled",
  },
  {
    id: "cal-generator",
    date: "2026-07-20",
    title: "Lower generator visual check",
    area: "Lower Generator Area",
    status: "Scheduled",
  },
];

const navItems: { id: Screen; label: string; description: string }[] = [
  { id: "dashboard", label: "Dashboard", description: "Control center" },
  { id: "map", label: "Map", description: "Property layout" },
  { id: "locations", label: "Locations", description: "42 areas" },
  { id: "assets", label: "Assets", description: "Equipment records" },
  { id: "history", label: "Service History", description: "Work notes" },
  { id: "vendors", label: "Vendors", description: "Contacts" },
  { id: "calendar", label: "Calendar", description: "Scheduled work" },
  { id: "weather", label: "Weather", description: "Property watch" },
  { id: "documents", label: "Photos / Docs", description: "Records" },
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
    fontWeight: 850,
    background: color.background,
    color: color.color,
    border: `1px solid ${color.border}`,
    whiteSpace: "nowrap",
  };
}

function priorityBadge(priority: Priority): React.CSSProperties {
  if (priority === "High") return badgeStyle("Open");
  if (priority === "Seasonal") return badgeStyle("Seasonal");
  return badgeStyle("Completed");
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
      <div style={{ color: colors.muted, fontSize: 13, fontWeight: 850 }}>{label}</div>
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
      <div style={{ color: colors.muted, fontSize: 13, marginTop: 7 }}>{detail}</div>
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
          <h2 style={{ margin: 0, color: colors.navy, fontSize: 23, lineHeight: 1.15 }}>
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
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>(serviceSeed);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(calendarSeed);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(
    "Ask Atlas about boilers, pool equipment, Sunstream lifts, Lutron blinds, the Sundance spa, vendors, procedures, documents, locations, or service history."
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
      const savedService = window.localStorage.getItem("atlas-service-records-v4");
      const savedPhotos = window.localStorage.getItem("atlas-photo-records-v4");
      const savedCalendar = window.localStorage.getItem("atlas-calendar-v4");

      if (savedService) setServiceRecords(JSON.parse(savedService) as ServiceRecord[]);
      if (savedPhotos) setPhotos(JSON.parse(savedPhotos) as PhotoRecord[]);
      if (savedCalendar) setCalendarItems(JSON.parse(savedCalendar) as CalendarItem[]);
    } catch {
      // Keep seeded records if local storage cannot be read.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-service-records-v4", JSON.stringify(serviceRecords));
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-photo-records-v4", JSON.stringify(photos));
  }, [ready, photos]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-calendar-v4", JSON.stringify(calendarItems));
  }, [ready, calendarItems]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];

  const selectedAssetServices = serviceRecords
    .filter((record) => record.assetId === selectedAsset.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedAssetPhotos = photos.filter((photo) => photo.assetId === selectedAsset.id);

  const q = query.trim().toLowerCase();

  const filteredLocations = useMemo(() => {
    if (!q) return locations;
    return locations.filter((location) =>
      [location.name, location.type, location.zone, location.notes].join(" ").toLowerCase().includes(q)
    );
  }, [q]);

  const filteredAssets = useMemo(() => {
    if (!q) return assets;
    return assets.filter((asset) =>
      [
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
        .toLowerCase()
        .includes(q)
    );
  }, [q]);

  const filteredVendors = useMemo(() => {
    if (!q) return vendors;
    return vendors.filter((vendor) =>
      [vendor.name, vendor.category, vendor.phone, vendor.email, vendor.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q]);

  const filteredServices = useMemo(() => {
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
  }, [q, serviceRecords]);

  const filteredDocuments = useMemo(() => {
    if (!q) return documents;
    return documents.filter((document) =>
      [
        document.title,
        document.area,
        document.type,
        document.notes,
        document.linkedAssetId ? getAssetName(document.linkedAssetId) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q]);

  const filteredProcedures = useMemo(() => {
    if (!q) return procedures;
    return procedures.filter((procedure) =>
      [procedure.title, procedure.area, procedure.priority, procedure.steps.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!q) return [];

    const results: SearchResult[] = [
      ...filteredLocations.map((location) => ({
        id: `location-${location.id}`,
        type: "Location" as const,
        title: location.name,
        subtitle: `${location.zone} · ${location.type}`,
        detail: location.notes,
        screen: "locations" as const,
      })),
      ...filteredAssets.map((asset) => ({
        id: `asset-${asset.id}`,
        type: "Asset" as const,
        title: asset.name,
        subtitle: `${getLocationName(asset.locationId)} · ${asset.category}`,
        detail: asset.notes,
        screen: "assets" as const,
        assetId: asset.id,
      })),
      ...filteredVendors.map((vendor) => ({
        id: `vendor-${vendor.id}`,
        type: "Vendor" as const,
        title: vendor.name,
        subtitle: vendor.category,
        detail: vendor.notes,
        screen: "vendors" as const,
      })),
      ...filteredServices.map((record) => ({
        id: `service-${record.id}`,
        type: "Service" as const,
        title: record.title,
        subtitle: `${formatDate(record.date)} · ${getAssetName(record.assetId)} · ${getVendorName(record.vendorId)}`,
        detail: record.notes,
        screen: "history" as const,
        assetId: record.assetId,
      })),
      ...filteredDocuments.map((document) => ({
        id: `document-${document.id}`,
        type: "Document" as const,
        title: document.title,
        subtitle: `${document.area} · ${document.type}${document.linkedAssetId ? ` · ${getAssetName(document.linkedAssetId)}` : ""}`,
        detail: document.notes,
        screen: "documents" as const,
        assetId: document.linkedAssetId,
      })),
      ...filteredProcedures.map((procedure) => ({
        id: `procedure-${procedure.id}`,
        type: "Procedure" as const,
        title: procedure.title,
        subtitle: `${procedure.area} · ${procedure.priority}`,
        detail: procedure.steps.join(" "),
        screen: "procedures" as const,
      })),
    ];

    return results.slice(0, 12);
  }, [
    q,
    filteredLocations,
    filteredAssets,
    filteredVendors,
    filteredServices,
    filteredDocuments,
    filteredProcedures,
  ]);

  const openServiceCount = serviceRecords.filter(
    (record) => record.status === "Open" || record.status === "Monitor"
  ).length;

  const monitorAssetCount = assets.filter(
    (asset) => asset.status === "Monitor" || asset.status === "Offline"
  ).length;

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

  function openSearchResult(result: SearchResult) {
    if (result.assetId) {
      setSelectedAssetId(result.assetId);
    }

    setScreen(result.screen);
  }

  function askAtlas(question: string) {
    const text = question.trim().toLowerCase();

    if (!text) {
      setAssistantAnswer("Type a question first, then Ask Atlas.");
      return;
    }

    if (text.includes("boiler") || text.includes("viessmann") || text.includes("vitodens")) {
      setAssistantAnswer(
        "Atlas found the boiler records in the Mechanical Room.\n\nBoiler B-1: Viessmann Vitodens 200, earlier nameplate showed serial 758960502925, year built 2018, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief capacity 255.9 lb/hr, CRN R1497.5C.\n\nBoiler B-2: Viessmann Vitodens 200, clear nameplate shows serial 758960507593, year built 2025, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief capacity 255.9 lb/hr, CRN R1497.5C.\n\nSafety: McDonnell & Miller GuardDog 751P-MT-120 low-water cut-off.\n\nOpen monitor note: recalled heat exchanger was replaced on Boiler 2, then the igniter would not turn on."
      );
      return;
    }

    if (text.includes("pool") || text.includes("backwash") || text.includes("pentair") || text.includes("triton")) {
      setAssistantAnswer(
        "Atlas found the pool records.\n\nPool water chain: Pool/Spa source → Pentair 3.0 HP pump → Triton II sand filter → UltraPure / Paramount UV2 UV-ozone equipment → return to pool.\n\nPool heat transfer: HX-1 / P-8 feeds the isolated pool loop. P-9 circulates the pool water loop.\n\nPool HVAC: Desert Aire DHU-1 with control/display, SR501 relay, and hydronic heat coil.\n\nThe pool backwash procedure and chemical test procedure are saved under Procedures."
      );
      return;
    }

    if (text.includes("spa") || text.includes("hot tub") || text.includes("sundance")) {
      setAssistantAnswer(
        "Atlas found the standalone spa record.\n\nIt is a Sundance 880-series Optima, model OPTIMA, serial 00P3LCD-100528521-0315, date 03/21/15.\n\nElectrical label: 240 V, current 26/40/48 A, breaker size 40/50/60 A, 60 Hz, single phase, 3 wires.\n\nRelated records include the spa control system, HydroQuip Water Pro Smart Heater Plus, ClearRay UV-C water purification, and visible corrosion notes."
      );
      return;
    }

    if (text.includes("sunstream") || text.includes("lift") || text.includes("cobalt") || text.includes("seadoo")) {
      setAssistantAnswer(
        "Atlas found the dock lift records.\n\nThere are multiple Sunstream lift boxes on the dock and they should stay separate.\n\nCobalt: larger / newer Sunstream lift box from last summer.\nSeaDoo: smaller / older Sunstream box.\nDock lift: additional smaller / older lift box.\n\nCraft records: Cobalt R-7 and SeaDoo 2024 are both seasonal watercraft records."
      );
      return;
    }

    if (text.includes("blind") || text.includes("shade") || text.includes("lutron") || text.includes("penthousedrapery")) {
      setAssistantAnswer(
        "Atlas found the blinds records.\n\nBlinds Lutron is the motorized roller shade asset. Penthouse Drapery invoice #176396 dated 06/16/2026 is linked to Blinds Lutron for motorized roller shade repair.\n\nBlinds Hunter Douglas is a separate asset shown in Elyse's Room."
      );
      return;
    }

    if (text.includes("hangar") || text.includes("gulfstream") || text.includes("pilatus") || text.includes("n280cc")) {
      setAssistantAnswer(
        "Atlas found the Hangar records.\n\nHangar sub-locations include Gulfstream G600 N23PA, Gulfstream G280 N280CC, Gulfstream G280 N755PA, and Pilatus PC12 N126AL.\n\nThe uploaded aircraft photo clearly showed N280CC, so Atlas standardizes that aircraft as Gulfstream G280 N280CC."
      );
      return;
    }

    if (text.includes("password") || text.includes("credential") || text.includes("login") || text.includes("code")) {
      setAssistantAnswer(
        "Atlas has a redacted credential inventory rule.\n\nDo not store raw passwords, passcodes, PINs, emails, or access codes in normal Atlas notes. Use only redacted / admin-only categories such as access codes, Xfinity, Apple, YoLink, work Amazon, work login, and systems to secure."
      );
      return;
    }

    const matches = [
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
      ...documents.map((document) => ({
        type: "Document",
        title: document.title,
        detail: `${document.area} — ${document.type}. ${document.notes}`,
      })),
      ...procedures.map((procedure) => ({
        type: "Procedure",
        title: procedure.title,
        detail: `${procedure.area}. ${procedure.steps.join(" ")}`,
      })),
      ...locations.map((location) => ({
        type: "Location",
        title: location.name,
        detail: `${location.zone} — ${location.type}. ${location.notes}`,
      })),
    ].filter((item) =>
      [item.type, item.title, item.detail].join(" ").toLowerCase().includes(text)
    );

    if (!matches.length) {
      setAssistantAnswer(
        "I did not find that in the local Atlas records yet. Add a service note, photo, document, vendor, or asset record, then Ask Atlas will be able to surface it here."
      );
      return;
    }

    setAssistantAnswer(
      matches
        .slice(0, 5)
        .map((item) => `${item.type}: ${item.title}\n${item.detail}`)
        .join("\n\n")
    );
  }

  function renderGlobalSearchResults() {
    if (!q) return null;

    return (
      <SectionShell
        eyebrow="Global Search"
        title={`Results for "${query.trim()}"`}
        right={
          <button
            type="button"
            onClick={() => setQuery("")}
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
            Clear Search
          </button>
        }
      >
        {searchResults.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => openSearchResult(result)}
                style={{
                  border: `1px solid ${colors.line}`,
                  background: "#FBFCFE",
                  borderRadius: 16,
                  padding: 14,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, textTransform: "uppercase" }}>
                      {result.type}
                    </div>
                    <div style={{ color: colors.navy, fontWeight: 950, fontSize: 16, marginTop: 4 }}>
                      {result.title}
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                      {result.subtitle}
                    </div>
                  </div>
                  <span
                    style={{
                      border: `1px solid ${colors.line}`,
                      background: "white",
                      color: colors.navy,
                      borderRadius: 999,
                      padding: "5px 9px",
                      fontSize: 12,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open
                  </span>
                </div>
                <p
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    lineHeight: 1.45,
                    margin: "10px 0 0",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {result.detail}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div
            style={{
              border: `1px solid ${colors.line}`,
              background: "#FBFCFE",
              borderRadius: 16,
              padding: 16,
              color: colors.muted,
            }}
          >
            No matching Atlas records found yet.
          </div>
        )}
      </SectionShell>
    );
  }

  function renderDashboard() {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
          <StatCard label="Locations" value={locations.length} detail="Full 2000 baseline areas" />
          <StatCard label="Assets" value={assets.length} detail="Equipment and systems" />
          <StatCard label="Vendors" value={vendors.length} detail="De-duplicated directory" />
          <StatCard label="Open / Monitor" value={openServiceCount + monitorAssetCount} detail="Items needing attention" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, alignItems: "start" }}>
          <SectionShell eyebrow="Master Data Import" title="Atlas / 2000 Estate Operations">
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
                    width: 86,
                    height: 86,
                    objectFit: "contain",
                    background: "white",
                    borderRadius: 20,
                    padding: 8,
                  }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: 30, letterSpacing: -0.8 }}>
                    Official Atlas logo + expanded records are active.
                  </h2>
                  <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
                    This pass adds the larger 2000 data set: locations, assets, vendors, service history,
                    procedures, documents, dock lift records, pool equipment chain, boilers, spa, HVAC,
                    appliances, Hangar aircraft, map notes, and Ask Atlas answers.
                  </p>
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Watch List" title="Needs Attention">
            <div style={{ display: "grid", gap: 10 }}>
              {assets
                .filter((asset) => asset.status === "Monitor" || asset.status === "Offline")
                .slice(0, 8)
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
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
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
              .slice(0, 7)
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
                  <div style={{ color: colors.muted, fontWeight: 850 }}>{formatDate(record.date)}</div>
                  <div>
                    <div style={{ color: colors.navy, fontWeight: 900 }}>{record.title}</div>
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
      { label: "Main House", top: "38%", left: "48%", search: "Main House" },
      { label: "Mechanical", top: "47%", left: "51%", search: "Mechanical" },
      { label: "Indoor Pool", top: "55%", left: "56%", search: "Indoor Pool" },
      { label: "Dock", top: "77%", left: "57%", search: "Dock" },
      { label: "Cobalt", top: "72%", left: "62%", search: "Cobalt" },
      { label: "SeaDoo", top: "80%", left: "63%", search: "SeaDoo" },
      { label: "Water Trampoline", top: "84%", left: "48%", search: "Water Trampoline" },
      { label: "ADU", top: "42%", left: "29%", search: "ADU" },
      { label: "Garage", top: "34%", left: "34%", search: "Garage" },
    ];

    return (
      <SectionShell eyebrow="Property Map" title="Locked Map with Editable Atlas Overlay" right={<span style={badgeStyle("Online")}>Map Ready</span>}>
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            overflow: "hidden",
            border: `1px solid ${colors.line}`,
            minHeight: 560,
            background: "#E9EEF5",
          }}
        >
          <img
            src="/atlas-property-map.png"
            alt="Atlas property map"
            style={{ width: "100%", height: 590, objectFit: "cover", display: "block" }}
          />
          {pins.map((pin) => (
            <button
              key={pin.label}
              type="button"
              onClick={() => {
                setQuery(pin.search);
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
      <SectionShell eyebrow="Locations" title="2000 Location Baseline">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          {filteredLocations.map((location) => (
            <div
              key={location.id}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                padding: 16,
                background: "#FBFCFE",
              }}
            >
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>{location.zone}</div>
              <h3 style={{ margin: "6px 0", color: colors.navy }}>{location.name}</h3>
              <div style={{ color: colors.muted, fontSize: 13, fontWeight: 850 }}>{location.type}</div>
              <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.45 }}>{location.notes}</p>
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
                View Related Records
              </button>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderAssets() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "0.88fr 1.12fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Assets" title="Equipment Records">
          <div style={{ display: "grid", gap: 10 }}>
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                style={{
                  border: selectedAsset.id === asset.id ? `2px solid ${colors.gold}` : `1px solid ${colors.line}`,
                  background: selectedAsset.id === asset.id ? "#FFF9EA" : "#FBFCFE",
                  borderRadius: 16,
                  padding: 14,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {[
                ["Make", selectedAsset.make ?? "Not set"],
                ["Model", selectedAsset.model ?? "Not set"],
                ["Serial", selectedAsset.serial ?? "Not set"],
                [
                  "Vendors",
                  selectedAsset.vendorIds.length ? selectedAsset.vendorIds.map(getVendorName).join(", ") : "Not set",
                ],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 14, padding: 13 }}>
                  <div style={{ color: colors.muted, fontSize: 12, fontWeight: 900 }}>{label}</div>
                  <div style={{ color: colors.navy, fontWeight: 900 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ border: `1px solid ${colors.line}`, borderRadius: 16, padding: 15, background: "#FBFCFE" }}>
              <div style={{ color: colors.muted, fontSize: 12, fontWeight: 950 }}>NOTES</div>
              <p style={{ color: colors.text, lineHeight: 1.55, marginBottom: 0 }}>{selectedAsset.notes}</p>
            </div>

            <div style={{ border: `1px solid ${colors.line}`, borderRadius: 16, padding: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <strong style={{ color: colors.navy }}>Recent Service</strong>
                <button
                  type="button"
                  onClick={() => {
                    setNewService((current) => ({ ...current, assetId: selectedAsset.id }));
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
                  {selectedAssetServices.slice(0, 5).map((record) => (
                    <div key={record.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 13, padding: 12, background: "#FBFCFE" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Add Record" title="New Service Note">
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Asset
              <select
                value={newService.assetId}
                onChange={(event) => setNewService((current) => ({ ...current, assetId: event.target.value }))}
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
                onChange={(event) => setNewService((current) => ({ ...current, vendorId: event.target.value }))}
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
                onChange={(event) => setNewService((current) => ({ ...current, title: event.target.value }))}
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
                  onChange={(event) => setNewService((current) => ({ ...current, date: event.target.value }))}
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
                Status
                <select
                  value={newService.status}
                  onChange={(event) =>
                    setNewService((current) => ({ ...current, status: event.target.value as ServiceStatus }))
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
                onChange={(event) => setNewService((current) => ({ ...current, notes: event.target.value }))}
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
                <div key={record.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 16, padding: 15, background: "#FBFCFE" }}>
                  <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: colors.navy, fontWeight: 950 }}>{record.title}</div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                        {formatDate(record.date)} · {getAssetName(record.assetId)} · {getVendorName(record.vendorId)}
                      </div>
                    </div>
                    <span style={badgeStyle(record.status)}>{record.status}</span>
                  </div>
                  <p style={{ color: colors.text, lineHeight: 1.5, marginBottom: 12 }}>{record.notes}</p>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 18, padding: 16, background: "#FBFCFE" }}>
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>{vendor.category}</div>
              <h3 style={{ color: colors.navy, margin: "6px 0" }}>{vendor.name}</h3>
              {vendor.phone ? <div style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{vendor.phone}</div> : null}
              {vendor.email ? <div style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{vendor.email}</div> : null}
              <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.45 }}>{vendor.notes}</p>
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
                <div style={{ color: colors.navy, fontWeight: 950 }}>{formatDate(item.date)}</div>
                <div>
                  <div style={{ color: colors.navy, fontWeight: 950 }}>{item.title}</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{item.area}</div>
                </div>
                <span style={badgeStyle(item.status)}>{item.status}</span>
              </div>
            ))}
        </div>
      </SectionShell>
    );
  }

  function renderWeather() {
    const cards = [
      {
        title: "Dock / Wind",
        text: "Watch lake level, wind, dock power, SeaDoo lift, Cobalt lift, dock lift boxes, and water trampoline before storms or heavy use.",
      },
      {
        title: "Freeze",
        text: "During cold weather, check exterior hose bibs, mechanical room, garage, pool equipment, spa area, and lower generator area.",
      },
      {
        title: "Heavy Rain",
        text: "During heavy rain, check gutters, roof drainage, basement, ADU, garage, FloLogic, and leak-detection records.",
      },
      {
        title: "Heat / Humidity",
        text: "For indoor pool comfort, monitor Desert Aire performance, condensation, pool HVAC status, and room humidity.",
      },
    ];

    return (
      <SectionShell eyebrow="Weather Watch" title="2000 Property Conditions">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          {cards.map((card) => (
            <div key={card.title} style={{ border: `1px solid ${colors.line}`, borderRadius: 18, padding: 18, background: "#FBFCFE", minHeight: 150 }}>
              <div style={{ color: colors.navy, fontSize: 24, fontWeight: 950, marginBottom: 8 }}>{card.title}</div>
              <p style={{ color: colors.muted, lineHeight: 1.5, margin: 0 }}>{card.text}</p>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderDocuments() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "0.78fr 1.22fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Upload" title="Photos">
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, color: colors.navy, fontWeight: 900 }}>
              Attach to Asset
              <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)} style={inputStyle}>
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
                Uploads save in this browser for now.
              </span>
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ color: colors.muted }} />
            </label>

            {selectedAssetPhotos.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {selectedAssetPhotos.map((photo) => (
                  <div key={photo.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 16, overflow: "hidden", background: "#FBFCFE" }}>
                    <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: 145, objectFit: "cover" }} />
                    <div style={{ padding: 12 }}>
                      <div style={{ color: colors.navy, fontWeight: 900, fontSize: 13 }}>{photo.name}</div>
                      <button
                        type="button"
                        onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}
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
              <div style={{ color: colors.muted }}>No photos added for this selected asset yet.</div>
            )}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Documents" title="Atlas Document Records">
          <div style={{ display: "grid", gap: 12 }}>
            {filteredDocuments.map((document) => (
              <div key={document.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 16, padding: 15, background: "#FBFCFE" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>{document.area}</div>
                    <h3 style={{ color: colors.navy, margin: "5px 0" }}>{document.title}</h3>
                    <div style={{ color: colors.muted, fontSize: 13, fontWeight: 850 }}>
                      {document.type}
                      {document.linkedAssetId ? ` · ${getAssetName(document.linkedAssetId)}` : ""}
                    </div>
                  </div>
                </div>
                <p style={{ color: colors.text, lineHeight: 1.5 }}>{document.notes}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderProcedures() {
    return (
      <SectionShell eyebrow="Procedures" title="Atlas How-To Records / Work Templates">
        <div style={{ display: "grid", gap: 14 }}>
          {filteredProcedures.map((procedure) => (
            <div key={procedure.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 18, padding: 16, background: "#FBFCFE" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>{procedure.area}</div>
                  <h3 style={{ color: colors.navy, margin: "5px 0 0" }}>{procedure.title}</h3>
                </div>
                <span style={priorityBadge(procedure.priority)}>{procedure.priority}</span>
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
      "What is the pool equipment chain?",
      "Which lift box is for the Cobalt?",
      "Who worked on the Lutron blinds?",
      "What do we know about the Sundance spa?",
      "What aircraft are in the Hangar?",
      "Where should password info go?",
    ];

    return (
      <SectionShell
        eyebrow="Ask Atlas"
        title="Search the Local Atlas Records"
        right={<img src="/atlas-logo.png" alt="Atlas logo" style={{ width: 52, height: 52, objectFit: "contain" }} />}
      >
        <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 18, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <textarea
              value={assistantQuestion}
              onChange={(event) => setAssistantQuestion(event.target.value)}
              placeholder="Ask about assets, vendors, procedures, documents, service notes, pool equipment, boilers, dock lifts, blinds, the spa, aircraft, locations, or credentials..."
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
              minHeight: 310,
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
            <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: 1.8, lineHeight: 1 }}>ATLAS</div>
            <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 750, marginTop: 6 }}>
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
                  border: active ? `1px solid ${colors.gold2}` : "1px solid rgba(255,255,255,0.08)",
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
                  <span style={{ display: "block", fontWeight: 950 }}>{item.label}</span>
                  <span style={{ display: "block", color: "rgba(255,255,255,0.62)", fontSize: 12, marginTop: 3 }}>
                    {item.description}
                  </span>
                </span>
                {active ? (
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: colors.gold2, flex: "0 0 auto" }} />
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
          <div style={{ color: colors.gold2, fontWeight: 950, fontSize: 12 }}>MASTER DATA</div>
          <div style={{ fontWeight: 900, marginTop: 6 }}>Expanded 2000 records active</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 5, lineHeight: 1.4 }}>
            Logo, locations, assets, vendors, procedures, documents, history, map, and Ask Atlas are loaded.
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
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, letterSpacing: 1.3, textTransform: "uppercase" }}>
                {activeNav?.label ?? "Dashboard"}
              </div>
              <h1 style={{ margin: "4px 0 0", color: colors.navy, fontSize: 31, letterSpacing: -0.9, lineHeight: 1.05 }}>
                Atlas / 2000
              </h1>
              <div style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>
                Private estate systems, service history, vendors, procedures, documents, photos, and Ask Atlas.
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
            <img src="/atlas-logo.png" alt="Atlas logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
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
          <div style={{ display: "grid", gap: 18, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
              <div style={{ border: `1px solid ${colors.line}`, background: colors.card, borderRadius: 18, padding: 14 }}>
                <strong style={{ color: colors.navy }}>{filteredLocations.length}</strong>
                <span style={{ color: colors.muted }}> locations</span>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, background: colors.card, borderRadius: 18, padding: 14 }}>
                <strong style={{ color: colors.navy }}>{filteredAssets.length}</strong>
                <span style={{ color: colors.muted }}> assets</span>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, background: colors.card, borderRadius: 18, padding: 14 }}>
                <strong style={{ color: colors.navy }}>{filteredVendors.length}</strong>
                <span style={{ color: colors.muted }}> vendors</span>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, background: colors.card, borderRadius: 18, padding: 14 }}>
                <strong style={{ color: colors.navy }}>{filteredServices.length}</strong>
                <span style={{ color: colors.muted }}> service</span>
              </div>
              <div style={{ border: `1px solid ${colors.line}`, background: colors.card, borderRadius: 18, padding: 14 }}>
                <strong style={{ color: colors.navy }}>{filteredDocuments.length}</strong>
                <span style={{ color: colors.muted }}> docs</span>
              </div>
            </div>
            {renderGlobalSearchResults()}
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
