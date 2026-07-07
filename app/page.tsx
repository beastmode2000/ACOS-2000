"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import WeatherPlanner from "./components/WeatherPlanner";

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
type Priority = "High" | "Normal" | "Seasonal";
type PartStatus = "In Stock" | "Low" | "Out" | "Order";

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  zone: string;
  notes: string;
};

type UploadedFileRecord = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  createdAt: string;
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
  logoDataUrl?: string;
  documents?: UploadedFileRecord[];
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
  documents?: UploadedFileRecord[];
};

type ServiceRecord = {
  id: string;
  assetId: string;
  vendorId?: string;
  procedureId?: string;
  date: string;
  title: string;
  status: ServiceStatus;
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
  notes: string;
  href?: string;
};

type PublicDocRecord = {
  id: string;
  name: string;
  href: string;
  type: string;
};

type PublicDocCandidate = PublicDocRecord & {
  searchText: string;
};

type PartRecord = {
  id: string;
  name: string;
  category: string;
  locationId: string;
  assetId?: string;
  vendorId?: string;
  partNumber?: string;
  sku?: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  status: PartStatus;
  reorderUrl?: string;
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

type AttachmentKind = "asset-photo" | "asset-document" | "vendor-document" | "work-order-photo" | "work-order-document" | "map-photo" | "static-document";

type SearchResult = {
  id: string;
  type: "Location" | "Map Label" | "Asset" | "Vendor" | "Work Order" | "Document" | "Procedure" | "Calendar" | "Part";
  title: string;
  subtitle: string;
  detail: string;
  screen: Screen;
  assetId?: string;
  vendorId?: string;
  serviceId?: string;
  calendarId?: string;
  procedureId?: string;
  partId?: string;
  mapLabelId?: string;
  attachmentKind?: AttachmentKind;
  attachmentId?: string;
  dataUrl?: string;
  downloadName?: string;
};

type AtlasTable = "vendors" | "assets" | "procedures" | "work_orders" | "calendar" | "asset_photos";

type AtlasApiPayload = {
  ok: boolean;
  source?: string;
  error?: string;
  vendorRecords?: VendorRecord[];
  assetRecords?: AssetRecord[];
  procedureRecords?: ProcedureRecord[];
  serviceRecords?: ServiceRecord[];
  calendarItems?: CalendarItem[];
  photos?: PhotoRecord[];
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
  red: "#B42318",
};

const badgeColors: Record<Status | ServiceStatus, { background: string; color: string; border: string }> = {
  Online: { background: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
  Offline: { background: "#FEECEC", color: "#B42318", border: "#FACACA" },
  Seasonal: { background: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
  Monitor: { background: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
  Open: { background: "#FFF4E5", color: "#B54708", border: "#FFD8A8" },
  Scheduled: { background: "#EDF3FF", color: "#175CD3", border: "#C8D9FF" },
  Completed: { background: "#EAF7F1", color: "#087443", border: "#BDE7D2" },
};

const locations: LocationRecord[] = [
  { id: "general", name: "General", type: "Property", zone: "2000", notes: "Whole-estate default location for records that are not tied to one room." },
  { id: "main-house", name: "Main House", type: "Building", zone: "2000", notes: "Primary house and main interior systems." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", zone: "Main House", notes: "Boilers, DHW tanks, hydronic controls, HVAC zoning, and major mechanical equipment." },
  { id: "kitchen", name: "Kitchen", type: "Interior", zone: "Main House", notes: "Kitchen appliances, range, dishwashers, freezer, and service records." },
  { id: "pantry", name: "Pantry", type: "Interior", zone: "Main House", notes: "Pantry storage and freezer records." },
  { id: "wine-room", name: "Wine Room", type: "Interior", zone: "Main House", notes: "Wine storage and freezer records." },
  { id: "upstairs-laundry", name: "Upstairs Laundry Closet", type: "Laundry", zone: "Main House", notes: "Upstairs laundry equipment location." },
  { id: "pool-changing-room", name: "Pool Changing Room", type: "Laundry / Pool", zone: "Pool Area", notes: "Pool changing room and dryer record location." },
  { id: "fitness-room", name: "Fitness Room", type: "Interior", zone: "Main House", notes: "Fitness room appliances and systems." },
  { id: "house-office", name: "House Managers Office", type: "Office", zone: "Main House", notes: "House manager office appliances and operational records." },
  { id: "elyses-room", name: "Elyse's Room", type: "Bedroom", zone: "Main House", notes: "Room-level records including blinds / shade assets." },
  { id: "elliot-room", name: "Elliot's Room", type: "Bedroom", zone: "Main House", notes: "Room-level HVAC and comfort records." },
  { id: "play-room", name: "Play Room", type: "Thermostat Zone", zone: "Main House", notes: "Honeywell thermostat zone shown in energy report references." },
  { id: "exercise-room", name: "Exercise Room", type: "Thermostat Zone", zone: "Main House", notes: "Honeywell thermostat zone shown in energy report references." },
  { id: "gym-nanny", name: "Gym / Nanny", type: "Thermostat Zone", zone: "Main House", notes: "Honeywell thermostat zone shown in energy report references." },
  { id: "master-bath-floor", name: "Master Bath Floor", type: "Thermostat Zone", zone: "Main House", notes: "Honeywell thermostat zone shown as MasBathFloor in energy report references." },
  { id: "indoor-pool", name: "Pool", type: "Pool", zone: "Addition", notes: "The only pool on property. Located inside the addition. Use Pool Equipment Room for pumps, filter, UV/ozone, Desert Aire, and hydronic pool-heat equipment." },
  { id: "pool-equipment", name: "Pool Equipment Room", type: "Pool Systems", zone: "Addition", notes: "Pool filtration, pumps, chemical feed, UV / ozone, heat exchanger loop, and service records." },
  { id: "standalone-spa", name: "Standalone Spa", type: "Spa", zone: "Outdoor", notes: "Sundance Optima spa, heater, ClearRay UV-C, and spa controls." },
  { id: "dock", name: "Dock", type: "Waterfront", zone: "Lake", notes: "Boat lifts, SeaDoo lift, dock power, lift control boxes, and waterfront equipment." },
  { id: "cobalt-lift", name: "Cobalt Lift", type: "Dock Lift", zone: "Dock", notes: "Cobalt boat lift and newer Sunstream lift control / battery / solar box." },
  { id: "seadoo-lift", name: "SeaDoo Lift", type: "PWC Lift", zone: "Dock", notes: "SeaDoo lift and its separate older / smaller Sunstream box record." },
  { id: "dock-lift", name: "Dock Lift Box", type: "Lift Controls", zone: "Dock", notes: "Additional dock lift control box. Keep separate from Cobalt and SeaDoo lift boxes." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", zone: "Lake", notes: "Water trampoline added to the property map and seasonal waterfront records." },
  { id: "lakefront", name: "Lakefront", type: "Exterior", zone: "Lake", notes: "Lakefront, shoreline, waterfront access, and weather watch area." },
  { id: "garage", name: "Garage", type: "Garage", zone: "Exterior", notes: "Garage door openers, access, vehicles, tools, and service equipment." },
  { id: "old-garage", name: "Old Garage", type: "Garage", zone: "Exterior", notes: "Old garage reference point used for ADU map placement." },
  { id: "adu", name: "ADU", type: "Building", zone: "Left of Old Garage", notes: "Accessory dwelling unit added to the property map left of the old garage." },
  { id: "driveway", name: "Driveway", type: "Exterior", zone: "Entry", notes: "Driveway, approach, access, and vendor arrival area." },
  { id: "gate", name: "Gate", type: "Access", zone: "Entry", notes: "Gate and access-control related records. Credential details should stay redacted / admin-only." },
  { id: "exterior", name: "Exterior", type: "Exterior", zone: "2000", notes: "Exterior envelope, paint/stain, siding, exterior checks, and general outside service." },
  { id: "roof-gutters", name: "Roof / Gutters", type: "Exterior", zone: "2000", notes: "Roof, gutters, downspouts, drainage, and sheet metal records." },
  { id: "irrigation", name: "Irrigation", type: "Landscape Systems", zone: "Grounds", notes: "Irrigation controls, sprinkler service, leak checks, and landscaping system records." },
  { id: "lower-generator-area", name: "Lower Generator Area", type: "Generator", zone: "Outdoor", notes: "Lower outdoor generator and service access location." },
  { id: "basement", name: "Basement", type: "Interior", zone: "Main House", notes: "Basement layout and walk-through map records." },
  { id: "basement-stairs-trampoline", name: "Basement Stairs from Trampoline Area", type: "Map Reference", zone: "Basement", notes: "Basement map starting point from the trampoline-side stairs." },
  { id: "addition-first-floor", name: "Addition First Floor", type: "Construction", zone: "Addition", notes: "First floor of addition. Indoor pool construction photo is linked here." },
  { id: "hangar", name: "Hangar", type: "Aircraft", zone: "Offsite", notes: "Aircraft records and hangar sub-location references." },
  { id: "gulfstream-g600-n23pa", name: "Gulfstream G600 N23PA", type: "Aircraft", zone: "Hangar", notes: "Hangar sub-location / aircraft record." },
  { id: "gulfstream-g280-n280cc", name: "Gulfstream G280 N280CC", type: "Aircraft", zone: "Hangar", notes: "Standardized aircraft name. Photo reference showed tail number N280CC." },
  { id: "gulfstream-g280-n755pa", name: "Gulfstream G280 N755PA", type: "Aircraft", zone: "Hangar", notes: "Hangar sub-location / aircraft record." },
  { id: "pilatus-pc12-n126al", name: "Pilatus PC12 N126AL", type: "Aircraft", zone: "Hangar", notes: "Hangar sub-location / aircraft record." },
];

const vendorSeed: VendorRecord[] = [
  { id: "aallproblinds", name: "A All Pro Blinds", category: "Blinds", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "aaafire", name: "AAA Fire", category: "Fire / Safety", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "advancedirrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Irrigation and backflow testing vendor record.", documents: [] },
  { id: "amazon", name: "Amazon", category: "Supplies", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "americanleak", name: "American Leak Detection", category: "Leak Detection", notes: "MaintainX vendor record showed 2 contacts.", documents: [] },
  { id: "andersen", name: "Andersen Installation inc.", category: "Windows / Installation", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "applianceservice", name: "Appliance Service Station", category: "Appliances", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "aquadive", name: "Aqua Dive", category: "Pool / Dive", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "aquaquip", name: "Aqua Quip", category: "Pool / Spa", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "autonationford", name: "AutoNation Ford Bellevue", category: "Vehicles", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "bestplumbing", name: "Best Plumbing", category: "Plumbing", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "bosch", name: "Bosch", category: "Appliances", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "carrier", name: "Carrier", category: "HVAC", notes: "Forced-air HVAC equipment reference.", documents: [] },
  { id: "cascade", name: "Cascade Spray", category: "Landscape / Irrigation", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "gutter", name: "Consolidated Gutter and Sheet Metal", category: "Gutters / Sheet Metal", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "daburns", name: "D.A. Burns", category: "Cleaning / Floors", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "desertaire", name: "Desert Aire", category: "Pool Dehumidification", notes: "Indoor pool DHU-1 dehumidification equipment, control/display, SR501 relay, and hydronic heat coil.", documents: [] },
  { id: "dsquare", name: "D Square Energy", category: "Energy / Electrical", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "electromatic", name: "Electromatic Refrigeration", category: "Refrigeration", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "elliottpaint", name: "Elliott Paint Company", category: "Paint", notes: "MaintainX vendor record showed 1 contact. Brandon Ness was referenced with Elliott Paint Company.", documents: [] },
  { id: "greaterseattlefloors", name: "Greater Seattle Floors", category: "Floors", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "hightechliving", name: "High Tech Living", category: "Smart Home", notes: "MaintainX vendor record showed 1 contact.", documents: [] },
  { id: "homedepot", name: "Home Depot", category: "Materials", notes: "MaintainX vendor record. No contacts shown.", documents: [] },
  { id: "honeywell", name: "Honeywell", category: "HVAC Controls", notes: "HZ432 zoning controls and thermostat zone references.", documents: [] },
  { id: "hydroquip", name: "HydroQuip / Therm Products", category: "Spa Heater", notes: "Water Pro Series Smart Heater Plus with Titanium Inside.", documents: [] },
  { id: "i90motorsports", name: "I90 Motorsports", category: "Motorsports", notes: "MaintainX vendor record captured from vendor screenshots.", documents: [] },
  { id: "lesschwab", name: "Les Schwab", category: "Vehicles / Tires", notes: "Vehicle / tire vendor record.", documents: [] },
  { id: "maplevalleyelectric", name: "Maple Valley Electric", category: "Electrical", notes: "Electrical vendor record.", documents: [] },
  { id: "mcdonnellmiller", name: "McDonnell & Miller", category: "Boiler Safety", notes: "GuardDog low-water cut-off model 751P-MT-120.", documents: [] },
  { id: "pentair", name: "Pentair", category: "Pool Pump", notes: "Pentair 3.0 HP pool pump reference in the pool equipment chain.", documents: [] },
  { id: "penthousedrapery", name: "Penthouse Drapery", category: "Blinds / Drapery", phone: "+1 206-292-8336", email: "accounting@penthousedrapery.com", notes: "4033 16th Ave SW Suite A, Seattle, WA 98106. Invoice #176396 dated 06/16/2026 linked to Blinds Lutron.", documents: [] },
  { id: "precisiongaragedoor", name: "Precision Garage Door", category: "Garage Doors", notes: "Garage door service vendor record.", documents: [] },
  { id: "psf", name: "PSF Mechanical", category: "Pool / Mechanical", notes: "Pool equipment, water treatment, and mechanical service records.", documents: [] },
  { id: "seadooservice", name: "Sea-Doo Service", category: "Sea-Doo / PWC", notes: "Sea-Doo repair and service vendor record.", documents: [] },
  { id: "seattleboat", name: "Seattle Boat", category: "Boat Service", notes: "Boat service vendor record.", documents: [] },
  { id: "sundance", name: "Sundance Spas", category: "Spa", notes: "Sundance 880-series Optima spa equipment reference.", documents: [] },
  { id: "sunstream", name: "Sunstream Boat Lifts", category: "Dock / Boat Lifts", notes: "Dock lift boxes and controls. Cobalt box is the larger / newer box from last summer.", documents: [] },
  { id: "taylor", name: "Taylor Technologies", category: "Pool Testing", notes: "K-2006 / K-2006C pool test kit reference.", documents: [] },
  { id: "terminix", name: "Terminix", category: "Pest Control", notes: "Past pest-control vendor. User noted Terminix was canceled.", documents: [] },
  { id: "triton", name: "Triton II", category: "Pool Filter", notes: "Triton II sand filter reference in the pool equipment chain.", documents: [] },
  { id: "ultrapure", name: "UltraPure / Paramount UV2", category: "Pool UV / Ozone", notes: "UV-ozone equipment in the pool water treatment chain.", documents: [] },
  { id: "unrivaled", name: "Unrivaled", category: "Pest Control", notes: "Current pest-control vendor. Terminix was canceled.", documents: [] },
  { id: "viessmann", name: "Viessmann", category: "Boilers / DHW", notes: "Vitodens 200 boilers and Vitocell 300-V domestic hot water tanks.", documents: [] },
];

const assetSeed: AssetRecord[] = [
  { id: "boiler-1", name: "Boiler B-1", locationId: "mechanical-room", category: "Hydronic Heating", status: "Online", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", notes: "White wall-mounted Viessmann Vitodens 200. Label: BOILER 1 — SECONDARY HIGH LIMIT INSIDE. Nameplate details previously visible: year built 2018, MAWP water 60 PSI, max water temperature 210°F, heating surface 31.99 sq ft, relief valve capacity 255.9 lb/hr, CRN R1497.5C.", vendorIds: ["viessmann"], documents: [] },
  { id: "boiler-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", notes: "White wall-mounted Viessmann Vitodens 200. Latest clear nameplate: serial 758960507593, year built 2025, MAWP water 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief valve capacity 255.9 lb/hr, CRN R1497.5C.", vendorIds: ["viessmann"], documents: [] },
  { id: "boiler-2-new", name: "Boiler B-2 New", locationId: "mechanical-room", category: "Hydronic Heating", status: "Monitor", make: "Viessmann", model: "Vitodens 200", notes: "MaintainX asset list showed Boiler B-2 New. Keep de-duplicated against Boiler B-2 when final database is cleaned.", vendorIds: ["viessmann"], documents: [] },
  { id: "vitocell-tanks", name: "Twin Viessmann Vitocell 300-V DHW Tanks", locationId: "mechanical-room", category: "Domestic Hot Water", status: "Online", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "Twin gray indirect-fired domestic hot water tanks. EVIA 300, 79 USG / 300 L, stainless steel tank / heat exchanger AISI 444 / 316 Ti.", vendorIds: ["viessmann"], documents: [] },
  { id: "guarddog-low-water", name: "GuardDog Low Water Cut-Off", locationId: "mechanical-room", category: "Boiler Safety", status: "Online", make: "McDonnell & Miller", model: "751P-MT-120", notes: "Manual-reset low-water cut-off device. Include green/red LED meanings, test/reset behavior, and CSD-1 compliance notes.", vendorIds: ["mcdonnellmiller", "viessmann"], documents: [] },
  { id: "carrier-hvac-hz432", name: "Carrier Forced-Air HVAC + Honeywell HZ432 Zones", locationId: "mechanical-room", category: "HVAC", status: "Online", make: "Carrier / Honeywell", model: "HZ432", notes: "Forced-air Carrier HVAC with Honeywell HZ432 zoning controls. Zones include Play Room, Kitchen, Exercise Room, Gym / Nanny, and Master Bath Floor.", vendorIds: ["carrier", "honeywell"], documents: [] },
  { id: "mini-split-elliot-option", name: "Elliot Room Mini-Split Option", locationId: "elliot-room", category: "HVAC Planning", status: "Monitor", notes: "Mini-split options were discussed for allergies and independent control.", vendorIds: ["carrier"], documents: [] },
  { id: "desertaire-dhu1", name: "Desert Aire DHU-1 Pool Dehumidification", locationId: "indoor-pool", category: "Pool HVAC", status: "Monitor", make: "Desert Aire", model: "DHU-1", notes: "Indoor pool dehumidification system with control/display, SR501 relay, and hydronic heat coil.", vendorIds: ["desertaire"], documents: [] },
  { id: "pool-pump-pentair", name: "Pentair 3.0 HP Pool Pump", locationId: "pool-equipment", category: "Pool Equipment", status: "Online", make: "Pentair", model: "3.0 HP", notes: "Pool source → Pentair pump → Triton II sand filter → UltraPure / Paramount UV2 UV-ozone → return to pool. The standalone Sundance spa / hot tub is separate and excluded.", vendorIds: ["psf", "pentair"], documents: [] },
  { id: "pool-filter-triton", name: "Triton II Sand Filter", locationId: "pool-equipment", category: "Pool Filtration", status: "Online", make: "Triton II", notes: "Sand filter in pool water treatment chain. Keep pressure readings and backwash history in service notes.", vendorIds: ["psf", "triton"], documents: [] },
  { id: "pool-uv-ozone", name: "UltraPure / Paramount UV2 UV-Ozone", locationId: "pool-equipment", category: "Pool Water Treatment", status: "Online", make: "UltraPure / Paramount", model: "UV2", notes: "UV-ozone equipment in pool treatment chain before return to pool.", vendorIds: ["psf", "ultrapure"], documents: [] },
  { id: "pool-hx-p8", name: "Pool Heat Transfer HX-1 / P-8", locationId: "pool-equipment", category: "Pool Heat Transfer", status: "Online", notes: "Heat transfer uses HX-1 / P-8 into the isolated pool loop.", vendorIds: ["psf"], documents: [] },
  { id: "pool-loop-p9", name: "Pool Water Loop P-9", locationId: "pool-equipment", category: "Pool Circulation", status: "Online", notes: "P-9 circulates the pool water loop.", vendorIds: ["psf"], documents: [] },
  { id: "taylor-test-kit", name: "Taylor Technologies K-2006 / K-2006C Test Kit", locationId: "pool-equipment", category: "Pool Testing", status: "Online", make: "Taylor Technologies", model: "K-2006 / K-2006C", notes: "Pool test kit reference for chemical testing procedure.", vendorIds: ["taylor", "psf"], documents: [] },
  { id: "sundance-optima", name: "Sundance 880 Optima Spa", locationId: "standalone-spa", category: "Spa", status: "Monitor", make: "Sundance", model: "OPTIMA", serial: "00P3LCD-100528521-0315", notes: "Sundance 880-series Optima spa. Date 03/21/15. Electrical rating: 240 V, 26/40/48 A, breaker 40/50/60 A, 60 Hz, single phase, 3 wires.", vendorIds: ["sundance", "aquaquip"], documents: [] },
  { id: "spa-control-system", name: "Spa Control System", locationId: "standalone-spa", category: "Spa Controls", status: "Monitor", model: "LCD controller part #6600-328 Rev E", notes: "Gray spa control system enclosure and LCD controller.", vendorIds: ["sundance"], documents: [] },
  { id: "spa-heater-hydroquip", name: "HydroQuip Water Pro Smart Heater Plus", locationId: "standalone-spa", category: "Spa Heater", status: "Monitor", make: "Therm Products / HydroQuip", notes: "Water Pro Series Smart Heater Plus with Titanium Inside label.", vendorIds: ["hydroquip", "sundance"], documents: [] },
  { id: "clearray-uv", name: "ClearRay UV-C Water Purification", locationId: "standalone-spa", category: "Spa UV", status: "Monitor", make: "ClearRay", notes: "ClearRay UV-C water purification / ballast equipment labeled QC tested 230V passed.", vendorIds: ["sundance"], documents: [] },
  { id: "sunstream-cobalt", name: "Sunstream Lift Box — Cobalt", locationId: "cobalt-lift", category: "Dock / Boat Lift", status: "Online", make: "Sunstream", notes: "Larger / newer Sunstream lift control, battery, and solar box from last summer. Belongs to Cobalt boat lift.", vendorIds: ["sunstream"], documents: [] },
  { id: "sunstream-seadoo", name: "Sunstream Lift Box — SeaDoo", locationId: "seadoo-lift", category: "Dock / PWC Lift", status: "Monitor", make: "Sunstream", notes: "SeaDoo lift box. Smaller / older Sunstream box. Keep separate from Cobalt box.", vendorIds: ["sunstream"], documents: [] },
  { id: "sunstream-dock", name: "Sunstream Lift Box — Dock", locationId: "dock-lift", category: "Dock Lift Controls", status: "Monitor", make: "Sunstream", notes: "Additional dock lift box. Smaller / older box.", vendorIds: ["sunstream"], documents: [] },
  { id: "craft-cobalt", name: "Craft — Cobalt R-7", locationId: "dock", category: "Watercraft", status: "Seasonal", notes: "Cobalt R-7 watercraft record connected to dock and newer Sunstream Cobalt lift box.", vendorIds: ["sunstream", "i90motorsports", "seattleboat"], documents: [] },
  { id: "craft-seadoo", name: "Craft — SeaDoo 2024", locationId: "dock", category: "Watercraft", status: "Seasonal", notes: "2024 SeaDoo record connected to dock and SeaDoo lift records.", vendorIds: ["i90motorsports", "sunstream", "seadooservice"], documents: [] },
  { id: "water-trampoline", name: "Water Trampoline", locationId: "water-trampoline", category: "Waterfront", status: "Seasonal", notes: "Water trampoline added to the map and seasonal waterfront checklist.", vendorIds: [], documents: [] },
  { id: "blinds-lutron", name: "Blinds Lutron", locationId: "general", category: "Motorized Shades", status: "Monitor", make: "Lutron", notes: "Motorized roller shade asset. Penthouse Drapery invoice #176396 belongs here.", vendorIds: ["penthousedrapery", "aallproblinds"], documents: [] },
  { id: "blinds-hunter", name: "Blinds Hunter Douglas", locationId: "elyses-room", category: "Blinds", status: "Online", make: "Hunter Douglas", notes: "MaintainX asset record showed Blinds Hunter Douglas — Elyse's Room.", vendorIds: ["aallproblinds"], documents: [] },
  { id: "dishwasher-dw1", name: "Dishwasher DW-1", locationId: "fitness-room", category: "Appliance", status: "Online", notes: "Dishwasher DW-1 — Fitness Room.", vendorIds: ["bosch", "applianceservice"], documents: [] },
  { id: "dishwasher-dw2", name: "Dishwasher DW-2", locationId: "house-office", category: "Appliance", status: "Online", notes: "Dishwasher DW-2 — House Managers Office.", vendorIds: ["bosch", "applianceservice"], documents: [] },
  { id: "dishwasher-dw3", name: "Dishwasher DW-3 Right", locationId: "kitchen", category: "Appliance", status: "Online", notes: "Dishwasher DW-3 Right — Kitchen.", vendorIds: ["bosch", "applianceservice"], documents: [] },
  { id: "dishwasher-dw4", name: "Dishwasher DW-4 Left", locationId: "kitchen", category: "Appliance", status: "Online", notes: "Dishwasher DW-4 Left — Kitchen.", vendorIds: ["bosch", "applianceservice"], documents: [] },
  { id: "dryer-dr1", name: "Dryer DR-1", locationId: "upstairs-laundry", category: "Appliance", status: "Online", notes: "Dryer DR-1 — Upstairs Laundry Closet.", vendorIds: ["applianceservice"], documents: [] },
  { id: "dryer-dr2", name: "Dryer DR-2", locationId: "pool-changing-room", category: "Appliance", status: "Online", notes: "Dryer DR-2 — Pool Changing Room.", vendorIds: ["applianceservice"], documents: [] },
  { id: "dryer-dr3", name: "Dryer DR-3", locationId: "house-office", category: "Appliance", status: "Online", notes: "Dryer DR-3 — House Managers Office.", vendorIds: ["applianceservice"], documents: [] },
  { id: "freezer-fr1", name: "Freezer FR-1", locationId: "pantry", category: "Appliance", status: "Online", notes: "Freezer FR-1 — Pantry.", vendorIds: ["electromatic", "applianceservice"], documents: [] },
  { id: "freezer-fr2", name: "Freezer FR-2", locationId: "indoor-pool", category: "Appliance", status: "Online", notes: "Freezer FR-2 — Pool.", vendorIds: ["electromatic", "applianceservice"], documents: [] },
  { id: "freezer-fr3", name: "Freezer FR-3", locationId: "indoor-pool", category: "Appliance", status: "Online", notes: "Freezer FR-3 — Pool.", vendorIds: ["electromatic", "applianceservice"], documents: [] },
  { id: "freezer-fr4", name: "Freezer FR-4", locationId: "kitchen", category: "Appliance", status: "Online", notes: "Freezer FR-4 — Kitchen.", vendorIds: ["electromatic", "applianceservice"], documents: [] },
  { id: "freezer-fr5", name: "Freezer FR-5", locationId: "wine-room", category: "Appliance", status: "Online", notes: "Freezer FR-5 — Wine Room.", vendorIds: ["electromatic", "applianceservice"], documents: [] },
  { id: "wolf-range", name: "Wolfe Range / Range-Wolf", locationId: "kitchen", category: "Cooking", status: "Online", notes: "Possible duplicate against Range-Wolf; keep for de-duplication.", vendorIds: ["applianceservice"], documents: [] },
  { id: "flologic", name: "FloLogic", locationId: "general", category: "Water Protection", status: "Online", notes: "Whole-property water monitoring / shutoff asset.", vendorIds: ["bestplumbing", "americanleak"], documents: [] },
  { id: "garage-openers", name: "Garage Door Openers", locationId: "garage", category: "Garage", status: "Online", notes: "Garage door openers — General.", vendorIds: ["precisiongaragedoor"], documents: [] },
  { id: "generator-lower", name: "Generator Lower", locationId: "lower-generator-area", category: "Generator", status: "Monitor", notes: "Generator Lower — Outdoor Generator.", vendorIds: ["dsquare"], documents: [] },
  { id: "g600-n23pa", name: "Gulfstream G600 N23PA", locationId: "gulfstream-g600-n23pa", category: "Aircraft", status: "Monitor", notes: "Hangar sub-location / aircraft record.", vendorIds: [], documents: [] },
  { id: "g280-n280cc", name: "Gulfstream G280 N280CC", locationId: "gulfstream-g280-n280cc", category: "Aircraft", status: "Monitor", notes: "Standardized aircraft name from uploaded aircraft photo. Use N280CC.", vendorIds: [], documents: [] },
  { id: "g280-n755pa", name: "Gulfstream G280 N755PA", locationId: "gulfstream-g280-n755pa", category: "Aircraft", status: "Monitor", notes: "Hangar sub-location / aircraft record.", vendorIds: [], documents: [] },
  { id: "pc12-n126al", name: "Pilatus PC12 N126AL", locationId: "pilatus-pc12-n126al", category: "Aircraft", status: "Monitor", notes: "Hangar sub-location / aircraft record.", vendorIds: [], documents: [] },
];

const procedureSeed: ProcedureRecord[] = [
  { id: "pool-backwash", title: "Pool Backwash Procedure", area: "Pool Equipment Room", priority: "High", steps: ["Confirm pump and valve positions before changing anything.", "Turn pump off before moving the multiport/backwash valve.", "Move valve to backwash position.", "Run pump until discharge / sight glass water clears.", "Turn pump off before moving valve again.", "Move valve to rinse and run briefly.", "Return valve to filter position.", "Restart system and verify pressure, flow, and leaks.", "Log date, pressure, and anything unusual in Atlas."] },
  { id: "pool-equipment-check", title: "Pool Equipment Room Check", area: "Pool Equipment Room", priority: "Normal", steps: ["Check Pentair pump operation.", "Check Triton II filter pressure.", "Check UV / ozone equipment status.", "Check HX-1 / P-8 and P-9 circulation notes.", "Photo any leaks, unusual sound, or abnormal pressure.", "Save a service note if anything changes."] },
  { id: "boiler-low-water", title: "Boiler Low-Water Cut-Off Check", area: "Mechanical Room", priority: "High", steps: ["Identify the boiler before touching controls.", "Review GuardDog indicator lights.", "Do not bypass safety controls.", "Use manual reset only when the cause is understood.", "Record boiler number, indicator status, and action taken."] },
  { id: "spa-check", title: "Sundance Spa Check", area: "Standalone Spa", priority: "Normal", steps: ["Check spa water level.", "Inspect control bay for moisture, corrosion, or tripped indicators.", "Confirm heater-on and high-limit indicators are normal.", "Check ClearRay UV-C equipment status.", "Log condition and photo any corrosion or leaks."] },
  { id: "dock-lift-check", title: "Dock Lift Box Check", area: "Dock", priority: "Seasonal", steps: ["Confirm which lift box belongs to which craft before operating.", "Inspect solar panel, enclosure, battery wiring, and controls.", "Test up/down controls only when lift area is clear.", "Log any slow operation, battery issue, or wiring concern."] },
  { id: "vendor-visit-intake", title: "Vendor Visit Intake", area: "General", priority: "Normal", steps: ["Select correct asset before saving notes.", "Record vendor, date, work performed, cost if known, status, and next step.", "Attach photos, invoices, or documents.", "Do not create duplicate vendor records."] },
];

const serviceSeed: ServiceRecord[] = [
  { id: "service-penthouse-176396", assetId: "blinds-lutron", vendorId: "penthousedrapery", procedureId: "vendor-visit-intake", date: "2026-06-16", title: "Motorized roller shade repair — Invoice #176396", status: "Completed", notes: "Penthouse Drapery invoice #176396 dated 06/16/2026. Link this work order to Blinds Lutron.", documents: [], photos: [] },
  { id: "service-boiler-nameplate", assetId: "boiler-2", vendorId: "viessmann", procedureId: "boiler-low-water", date: "2026-07-02", title: "Clear Boiler B-2 nameplate captured", status: "Completed", notes: "Confirmed Viessmann boiler serial 758960507593, year built 2025, MAWP 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, relief 255.9 lb/hr, CRN R1497.5C.", documents: [], photos: [] },
  { id: "service-boiler-heat-exchanger", assetId: "boiler-2", vendorId: "viessmann", date: "2026-07-02", title: "Boiler 2 recalled heat exchanger / igniter issue", status: "Monitor", notes: "Recalled heat exchanger was replaced on Boiler 2. After new parts were installed, igniter would not turn on.", followUpDate: "", documents: [], photos: [] },
  { id: "service-pool-chain", assetId: "pool-pump-pentair", vendorId: "psf", procedureId: "pool-equipment-check", date: "2026-07-02", title: "Pool equipment chain recorded", status: "Completed", notes: "Pool source → Pentair pump → Triton II sand filter → UltraPure / Paramount UV2 → return to pool. The standalone Sundance spa / hot tub is separate and excluded.", documents: [], photos: [] },
  { id: "service-spa-record", assetId: "sundance-optima", vendorId: "sundance", procedureId: "spa-check", date: "2026-07-02", title: "Sundance Optima spa equipment record created", status: "Completed", notes: "Recorded Sundance 880-series Optima model, serial, electrical rating, HydroQuip heater, and ClearRay UV-C.", documents: [], photos: [] },
  { id: "service-sunstream-lifts", assetId: "sunstream-cobalt", vendorId: "sunstream", procedureId: "dock-lift-check", date: "2026-07-02", title: "Dock lift control boxes documented", status: "Completed", notes: "Confirmed multiple Sunstream lift boxes. Larger/newer box belongs to Cobalt lift.", documents: [], photos: [] },
];

const documents: DocumentRecord[] = [
  {
    id: "doc-systems-layout",
    title: "2000 Systems Layout Draft v1",
    area: "Mechanical / Pool / HVAC",
    type: "Generated PDF / Diagram",
    href: "/docs/2000_systems_layout_draft_v1.pdf",
    notes: "Generated Atlas systems-layout reference. Put the actual PDF in public/docs/2000_systems_layout_draft_v1.pdf so Atlas can open it directly.",
  },
  {
    id: "doc-pool-equipment",
    title: "2000 Pool Equipment Record v2 Corrected",
    area: "Pool Equipment Room",
    type: "Generated PDF / Equipment Record",
    linkedAssetId: "pool-pump-pentair",
    href: "/docs/2000_pool_equipment_record_v2_corrected.pdf",
    notes: "Generated corrected pool equipment record. Documents the single property pool, pool water treatment, Desert Aire pool HVAC/dehumidification, and hydronic pool heat. Excludes the standalone Sundance spa / hot tub.",
  },
  {
    id: "doc-property-map",
    title: "Locked Original Property Map",
    area: "Property Map",
    type: "Image",
    href: "/atlas-property-map.png",
    notes: "Original locked Atlas map image used under the movable labels.",
  },
  {
    id: "doc-exterior-stain-plan",
    title: "2000 Exterior Stain Plan — Photo-Based Scope Summary",
    area: "Exterior",
    type: "Generated Image",
    href: "/docs/2000_exterior_stain_plan_summary.png",
    notes: "Generated client-facing exterior stain plan summary image. Put the PNG in public/docs/2000_exterior_stain_plan_summary.png so Atlas can open it directly.",
  },
  {
    id: "doc-pool-construction",
    title: "Pool construction — first floor of addition",
    area: "Addition First Floor",
    type: "Photo Reference",
    href: "/docs/pool_construction_first_floor_addition.jpg",
    notes: "Construction photo reference showing the pool shell/trench area, concrete work, lighting, hoses, and worker present. Put the photo in public/docs/pool_construction_first_floor_addition.jpg or upload it to the Pool asset.",
  },
  {
    id: "doc-penthouse-invoice",
    title: "Penthouse Drapery Invoice #176396",
    area: "Blinds Lutron",
    type: "Invoice Reference",
    linkedAssetId: "blinds-lutron",
    href: "/docs/penthouse_drapery_invoice_176396.pdf",
    notes: "Invoice #176396 dated 06/16/2026 for motorized roller shade repair. Put the PDF in public/docs/penthouse_drapery_invoice_176396.pdf or upload it to Blinds Lutron.",
  },
  { id: "doc-sunstream-photos", title: "Sunstream lift box photo set", area: "Dock", type: "Photo Reference", notes: "Photos show Sunstream lift boxes, solar panels, dock-mounted enclosures, wiring, and up/down controls. Upload the photos to Dock, Cobalt lift, or SeaDoo lift for direct viewing." },
  { id: "doc-spa-nameplate", title: "Sundance Optima spa nameplate and control photos", area: "Standalone Spa", type: "Photo Reference", linkedAssetId: "sundance-optima", notes: "Includes nameplate, electrical rating, spa control system, HydroQuip heater, ClearRay UV-C, and corrosion notes. Upload the photos to the Sundance Optima asset for direct viewing." },
  { id: "doc-boiler-nameplates", title: "Viessmann boiler nameplate photos", area: "Mechanical Room", type: "Photo Reference", linkedAssetId: "boiler-2", notes: "Photos confirm Boiler 1 and Boiler 2 details. Upload the photos to Boiler B-1 / Boiler B-2 for direct viewing." },
  { id: "doc-maintainx-assets", title: "MaintainX asset screenshots", area: "Assets", type: "Screenshot Reference", notes: "Asset import source. Upload screenshots to Photos / Docs if you want them viewable inside Atlas." },
  { id: "doc-maintainx-vendors", title: "MaintainX vendor screenshots", area: "Vendors", type: "Screenshot Reference", notes: "Vendor import source. Upload screenshots to Photos / Docs if you want them viewable inside Atlas." },
  { id: "doc-credentials-redacted", title: "Redacted / admin-only credential inventory", area: "Admin", type: "Secure Note", notes: "Do not store raw passwords, passcodes, PINs, emails, or access codes in normal Atlas notes." },
];

const publicDocCandidates: PublicDocCandidate[] = [
  { id: "public-pool-equipment-v2-snake", name: "2000_pool_equipment_record_v2_corrected.pdf", href: "/docs/2000_pool_equipment_record_v2_corrected.pdf", type: "PDF", searchText: "pool equipment record v2 corrected pdf diagram single pool" },
  { id: "public-pool-equipment-v2-spaces", name: "2000 Pool Equipment Record v2 Corrected.pdf", href: "/docs/2000%20Pool%20Equipment%20Record%20v2%20Corrected.pdf", type: "PDF", searchText: "pool equipment record v2 corrected pdf diagram single pool" },
  { id: "public-pool-equipment-v1-snake", name: "2000_pool_equipment_record_v1.pdf", href: "/docs/2000_pool_equipment_record_v1.pdf", type: "PDF", searchText: "pool equipment record v1 pdf diagram" },
  { id: "public-pool-equipment-v1-spaces", name: "2000 Pool Equipment Record v1.pdf", href: "/docs/2000%20Pool%20Equipment%20Record%20v1.pdf", type: "PDF", searchText: "pool equipment record v1 pdf diagram" },
  { id: "public-systems-layout-snake", name: "2000_systems_layout_draft_v1.pdf", href: "/docs/2000_systems_layout_draft_v1.pdf", type: "PDF", searchText: "systems layout draft v1 mechanical pool hvac diagram pdf" },
  { id: "public-systems-layout-spaces", name: "2000 Systems Layout Draft v1.pdf", href: "/docs/2000%20Systems%20Layout%20Draft%20v1.pdf", type: "PDF", searchText: "systems layout draft v1 mechanical pool hvac diagram pdf" },
  { id: "public-exterior-stain-snake-png", name: "2000_exterior_stain_plan_summary.png", href: "/docs/2000_exterior_stain_plan_summary.png", type: "Image", searchText: "exterior stain plan photo based scope summary image png" },
  { id: "public-exterior-stain-spaces-png", name: "2000 Exterior Stain Plan Photo-Based Scope Summary.png", href: "/docs/2000%20Exterior%20Stain%20Plan%20Photo-Based%20Scope%20Summary.png", type: "Image", searchText: "exterior stain plan photo based scope summary image png" },
  { id: "public-pool-construction-snake-jpg", name: "pool_construction_first_floor_addition.jpg", href: "/docs/pool_construction_first_floor_addition.jpg", type: "Image", searchText: "pool construction first floor addition photo jpg" },
  { id: "public-pool-construction-spaces-jpg", name: "Pool construction first floor addition.jpg", href: "/docs/Pool%20construction%20first%20floor%20addition.jpg", type: "Image", searchText: "pool construction first floor addition photo jpg" },
];


function findVerifiedPublicDoc(href?: string, publicDocs: PublicDocRecord[] = []) {
  if (!href) return undefined;
  return publicDocs.find((document) => document.href === href);
}

const partSeed: PartRecord[] = [
  { id: "pool-test-reagents", name: "Taylor pool test reagents", category: "Pool Supplies", locationId: "pool-equipment", assetId: "taylor-test-kit", vendorId: "taylor", partNumber: "K-2006 / K-2006C", sku: "", quantity: 1, minQuantity: 1, unit: "kit", status: "In Stock", reorderUrl: "", notes: "Keep pool testing reagents current and reorder before summer usage increases." },
  { id: "spa-filter", name: "Sundance spa filter", category: "Spa Supplies", locationId: "standalone-spa", assetId: "sundance-optima", vendorId: "sundance", partNumber: "", sku: "", quantity: 1, minQuantity: 1, unit: "filter", status: "Low", reorderUrl: "", notes: "Replacement filter for Sundance Optima spa. Confirm exact filter model before ordering." },
  { id: "irrigation-parts", name: "Irrigation repair parts", category: "Irrigation", locationId: "irrigation", vendorId: "advancedirrigation", partNumber: "", sku: "", quantity: 0, minQuantity: 2, unit: "pieces", status: "Out", reorderUrl: "", notes: "General sprinkler heads/nozzles/fittings. Use as placeholder until exact stocked items are added." },
  { id: "dock-lift-remote-battery", name: "Dock lift remote batteries", category: "Dock / Lift", locationId: "dock", assetId: "sunstream-cobalt", vendorId: "sunstream", partNumber: "", sku: "", quantity: 2, minQuantity: 2, unit: "batteries", status: "In Stock", reorderUrl: "", notes: "Keep spare batteries for dock/lift remotes and controls." },
  { id: "hvac-filters", name: "HVAC filters", category: "HVAC", locationId: "mechanical-room", assetId: "carrier-hvac-hz432", vendorId: "carrier", partNumber: "Confirm size", sku: "", quantity: 0, minQuantity: 2, unit: "filters", status: "Order", reorderUrl: "", notes: "Confirm filter sizes from the HVAC filter list before ordering." },
];

const calendarSeed: CalendarItem[] = [
  { id: "cal-pool", date: "2026-07-08", title: "Check pool equipment and record pressures", area: "Pool Equipment Room", status: "Scheduled" },
  { id: "cal-spa", date: "2026-07-10", title: "Spa inspection / water level check", area: "Standalone Spa", status: "Scheduled" },
  { id: "cal-dock", date: "2026-07-12", title: "Dock lift box inspection", area: "Dock", status: "Scheduled" },
  { id: "cal-boiler", date: "2026-07-15", title: "Mechanical room walkthrough", area: "Mechanical Room", status: "Monitor" },
  { id: "cal-irrigation", date: "2026-07-17", title: "Irrigation / sprinkler walk", area: "Irrigation", status: "Scheduled" },
  { id: "cal-generator", date: "2026-07-20", title: "Lower generator visual check", area: "Lower Generator Area", status: "Scheduled" },
];

const mapLocalStorageKey = "atlas-map-labels-v1";

const defaultMapLabels: MapLabelRecord[] = [
  { id: "map-dock", label: "Dock", category: "Waterfront", x: 58, y: 78, notes: "Dock location. Boat lifts, lift boxes, dock power, and waterfront service records.", photos: [] },
  { id: "map-cobalt", label: "Cobalt", category: "Watercraft", x: 63, y: 72, notes: "Cobalt boat / Craft-Cobalt R-7 area near the dock. Keep separate from the Cobalt Sunstream lift box asset.", photos: [] },
  { id: "map-seadoo", label: "SeaDoo", category: "Watercraft", x: 64, y: 82, notes: "SeaDoo / PWC area south of the small dock slip.", photos: [] },
  { id: "map-water-trampoline", label: "Water Trampoline", category: "Waterfront", x: 47, y: 86, notes: "Seasonal water trampoline location.", photos: [] },
  { id: "map-waterside-lawn-north", label: "Waterside Lawn (North)", category: "Grounds", x: 50, y: 68, notes: "North waterside lawn area near the lake side of the property.", photos: [] },
  { id: "map-east-lawn", label: "East Lawn", category: "Grounds", x: 74, y: 47, notes: "East lawn area and grounds records.", photos: [] },
  { id: "map-sport-court", label: "Sport Court", category: "Recreation", x: 83, y: 26, notes: "Sport court location.", photos: [] },
  { id: "map-veggie-boxes", label: "Veggie Boxes", category: "Grounds", x: 77, y: 62, notes: "Three veggie boxes at the south end of the east lawn.", photos: [] },
  { id: "map-new-garage", label: "New Garage", category: "Building", x: 40, y: 31, notes: "New garage location.", photos: [] },
  { id: "map-old-garage", label: "Old Garage", category: "Building", x: 33, y: 35, notes: "Old garage location.", photos: [] },
  { id: "map-adu", label: "ADU", category: "Location", x: 27, y: 42, notes: "ADU is a location/map label only, not an asset.", photos: [] },
  { id: "map-courtyard", label: "Courtyard", category: "Outdoor Living", x: 47, y: 44, notes: "Courtyard / patio area with chairs and fire pit.", photos: [] },
  { id: "map-trampoline-dog", label: "Trampoline / Dog", category: "Grounds", x: 36, y: 56, notes: "Trampoline and dog cleanup/turf area.", photos: [] },
  { id: "map-original-house", label: "Original House", category: "Building", x: 47, y: 38, notes: "Original house portion of 2000.", photos: [] },
  { id: "map-addition", label: "Addition", category: "Building", x: 56, y: 52, notes: "Addition area including indoor pool construction records.", photos: [] },
  { id: "map-hot-tub", label: "Hot Tub", category: "Spa", x: 54, y: 61, notes: "Sundance Optima hot tub / standalone spa location.", photos: [] },
];

const navItems: { id: Screen; label: string; description: string }[] = [
  { id: "dashboard", label: "Dashboard", description: "Control center" },
  { id: "map", label: "Map", description: "Property layout" },
  { id: "locations", label: "Locations", description: "42 areas" },
  { id: "assets", label: "Assets", description: "Add / edit / docs" },
  { id: "history", label: "Work Orders", description: "Service history" },
  { id: "vendors", label: "Vendors", description: "Add / edit / docs" },
  { id: "calendar", label: "Calendar", description: "Full month calendar" },
  { id: "weather", label: "Weather", description: "Property watch" },
  { id: "documents", label: "Photos / Docs", description: "Records" },
  { id: "procedures", label: "Procedures", description: "Add / edit / schedule" },
  { id: "parts", label: "Parts", description: "Inventory / reorder" },
  { id: "assistant", label: "Ask Atlas", description: "Search records" },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 42);
  return slug || uid("record");
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, value));
}

function sortVendors(list: VendorRecord[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function sortAssets(list: AssetRecord[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function sortCalendar(list: CalendarItem[]) {
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

function sortProcedures(list: ProcedureRecord[]) {
  return [...list].sort((a, b) => a.title.localeCompare(b.title));
}

function sortParts(list: PartRecord[]) {
  return [...list].sort((a, b) => {
    const aLow = a.quantity <= a.minQuantity || a.status === "Low" || a.status === "Out" || a.status === "Order";
    const bLow = b.quantity <= b.minQuantity || b.status === "Low" || b.status === "Out" || b.status === "Order";
    if (aLow !== bLow) return aLow ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function partStatusForQuantity(quantity: number, minQuantity: number): PartStatus {
  if (quantity <= 0) return "Out";
  if (quantity <= minQuantity) return "Low";
  return "In Stock";
}

function sortServices(list: ServiceRecord[]) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

function addMonthsToDate(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
}

function addYearsToDate(date: Date, years: number) {
  return new Date(date.getFullYear() + years, date.getMonth(), 1, 12);
}

function getCalendarMonthDays(cursor: Date) {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const firstGridDay = new Date(firstOfMonth);
  firstGridDay.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    day.setHours(12, 0, 0, 0);
    return day;
  });
}

function blankVendor(): VendorRecord {
  return { id: "", name: "", category: "", phone: "", email: "", website: "", notes: "", logoDataUrl: "", documents: [] };
}

function blankAsset(): AssetRecord {
  return { id: "", name: "", locationId: "general", category: "", status: "Monitor", make: "", model: "", serial: "", notes: "", vendorIds: [], documents: [] };
}

function blankCalendarItem(date?: string): CalendarItem {
  return { id: "", date: date || dateKeyFromDate(new Date()), title: "", area: "General", status: "Scheduled" };
}

function blankProcedure(): ProcedureRecord {
  return { id: "", title: "", area: "General", priority: "Normal", steps: [""] };
}

function blankPart(): PartRecord {
  return { id: "", name: "", category: "General", locationId: "general", assetId: "", vendorId: "", partNumber: "", sku: "", quantity: 0, minQuantity: 1, unit: "each", status: "Order", reorderUrl: "", notes: "" };
}

function blankService(date?: string): ServiceRecord {
  return {
    id: "",
    assetId: "",
    vendorId: "",
    procedureId: "",
    date: date || dateKeyFromDate(new Date()),
    title: "",
    status: "Open",
    notes: "",
    followUpDate: "",
    photos: [],
    documents: [],
  };
}

function normalizeService(record: ServiceRecord): ServiceRecord {
  return {
    ...record,
    vendorId: record.vendorId ?? "",
    procedureId: record.procedureId ?? "",
    followUpDate: record.followUpDate ?? "",
    photos: record.photos ?? [],
    documents: record.documents ?? [],
  };
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getLocationName(locationId: string) {
  return locations.find((location) => location.id === locationId)?.name ?? "General";
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

function miniCalendarBadgeStyle(status: ServiceStatus): React.CSSProperties {
  const color = badgeColors[status];

  return {
    display: "block",
    width: "100%",
    border: `1px solid ${color.border}`,
    background: color.background,
    color: color.color,
    borderRadius: 9,
    padding: "4px 6px",
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
    cursor: "pointer",
  };
}

function priorityBadge(priority: Priority): React.CSSProperties {
  if (priority === "High") return badgeStyle("Open");
  if (priority === "Seasonal") return badgeStyle("Seasonal");
  return badgeStyle("Completed");
}

function partBadgeStyle(status: PartStatus): React.CSSProperties {
  if (status === "Out") return badgeStyle("Offline");
  if (status === "Low" || status === "Order") return badgeStyle("Seasonal");
  return badgeStyle("Online");
}

function readLocalStorageList<T>(keys: string[], fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      continue;
    }
  }

  return fallback;
}

function readBrowserSnapshot() {
  const assetRecords = sortAssets(readLocalStorageList<AssetRecord>(["atlas-asset-records-v1"], assetSeed));
  const vendorRecords = sortVendors(readLocalStorageList<VendorRecord>(["atlas-vendor-records-v2", "atlas-vendor-records-v1"], vendorSeed));
  const procedureRecords = sortProcedures(readLocalStorageList<ProcedureRecord>(["atlas-procedure-records-v1"], procedureSeed));
  const serviceRecords = sortServices(
    readLocalStorageList<ServiceRecord>(
      ["atlas-service-records-v10", "atlas-service-records-v9", "atlas-service-records-v8", "atlas-service-records-v7", "atlas-service-records-v6"],
      serviceSeed
    ).map(normalizeService)
  );
  const calendarItems = sortCalendar(
    readLocalStorageList<CalendarItem>(["atlas-calendar-v10", "atlas-calendar-v9", "atlas-calendar-v8", "atlas-calendar-v7", "atlas-calendar-v6"], calendarSeed)
  );
  const photos = readLocalStorageList<PhotoRecord>(["atlas-photo-records-v10", "atlas-photo-records-v9", "atlas-photo-records-v8", "atlas-photo-records-v7", "atlas-photo-records-v6"], []);

  return {
    assetRecords,
    vendorRecords,
    procedureRecords,
    serviceRecords,
    calendarItems,
    photos,
  };
}

function StatCard({ label, value, detail, onClick }: { label: string; value: string | number; detail: string; onClick?: () => void }) {
  const content = (
    <>
      <div style={{ color: colors.muted, fontSize: 13, fontWeight: 850 }}>{label}</div>
      <div style={{ color: colors.navy, fontSize: 34, fontWeight: 950, lineHeight: 1.1, marginTop: 8 }}>{value}</div>
      <div style={{ color: colors.muted, fontSize: 13, marginTop: 7 }}>{detail}</div>
      {onClick ? <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, marginTop: 10 }}>Open →</div> : null}
    </>
  );

  const style: React.CSSProperties = {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 12px 30px rgba(11, 30, 51, 0.06)",
    textAlign: "left",
    width: "100%",
  };

  if (!onClick) return <div style={style}>{content}</div>;

  return (
    <button type="button" onClick={onClick} style={{ ...style, cursor: "pointer" }}>
      {content}
    </button>
  );
}

function SectionShell({ title, eyebrow, children, right }: { title: string; eyebrow?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section style={{ background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 24, padding: 22, boxShadow: "0 14px 35px rgba(11, 30, 51, 0.06)" }}>
      <div style={{ display: "flex", gap: 14, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          {eyebrow ? <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 6 }}>{eyebrow}</div> : null}
          <h2 style={{ margin: 0, color: colors.navy, fontSize: 23, lineHeight: 1.15 }}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function AtlasPage() {
  const todayKey = dateKeyFromDate(new Date());
  const bootstrappedRef = useRef(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [query, setQuery] = useState("");

  const [assetRecords, setAssetRecords] = useState<AssetRecord[]>(assetSeed);
  const [selectedAssetId, setSelectedAssetId] = useState(assetSeed[0]?.id ?? "");
  const [assetForm, setAssetForm] = useState<AssetRecord>(assetSeed[0] ?? blankAsset());
  const [assetMode, setAssetMode] = useState<"edit" | "new">("edit");

  const [vendorRecords, setVendorRecords] = useState<VendorRecord[]>(vendorSeed);
  const [selectedVendorId, setSelectedVendorId] = useState(vendorSeed[0]?.id ?? "");
  const [vendorForm, setVendorForm] = useState<VendorRecord>(vendorSeed[0] ?? blankVendor());
  const [vendorMode, setVendorMode] = useState<"edit" | "new">("edit");

  const [procedureRecords, setProcedureRecords] = useState<ProcedureRecord[]>(procedureSeed);
  const [selectedProcedureId, setSelectedProcedureId] = useState(procedureSeed[0]?.id ?? "");
  const [procedureForm, setProcedureForm] = useState<ProcedureRecord>(procedureSeed[0] ?? blankProcedure());
  const [procedureMode, setProcedureMode] = useState<"edit" | "new">("edit");
  const [procedureScheduleDate, setProcedureScheduleDate] = useState(todayKey);

  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>(serviceSeed);
  const [selectedServiceId, setSelectedServiceId] = useState(serviceSeed[0]?.id ?? "");
  const [serviceForm, setServiceForm] = useState<ServiceRecord>(serviceSeed[0] ?? blankService(todayKey));
  const [serviceMode, setServiceMode] = useState<"edit" | "new">("edit");
  const [workOrderTab, setWorkOrderTab] = useState<"todo" | "done">("todo");
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState<"all" | ServiceStatus>("all");
  const [workOrderAssetFilter, setWorkOrderAssetFilter] = useState("all");
  const [workOrderLocationFilter, setWorkOrderLocationFilter] = useState("all");
  const [workOrderSort, setWorkOrderSort] = useState<"priority" | "due-asc" | "date-desc" | "asset">("priority");

  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  const [mapLabels, setMapLabels] = useState<MapLabelRecord[]>(defaultMapLabels);
  const [selectedMapLabelId, setSelectedMapLabelId] = useState(defaultMapLabels[0]?.id ?? "");
  const [mapLabelForm, setMapLabelForm] = useState<MapLabelRecord>(defaultMapLabels[0] ?? { id: "", label: "", category: "Location", x: 50, y: 50, notes: "", photos: [] });
  const [mapLabelMode, setMapLabelMode] = useState<"edit" | "new">("edit");

  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(calendarSeed);
  const [selectedCalendarId, setSelectedCalendarId] = useState(calendarSeed[0]?.id ?? "");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayKey);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [calendarForm, setCalendarForm] = useState<CalendarItem>(calendarSeed[0] ?? blankCalendarItem(todayKey));
  const [calendarMode, setCalendarMode] = useState<"edit" | "new">("edit");

  const [partRecords, setPartRecords] = useState<PartRecord[]>(partSeed);
  const [selectedPartId, setSelectedPartId] = useState(partSeed[0]?.id ?? "");
  const [partForm, setPartForm] = useState<PartRecord>(partSeed[0] ?? blankPart());
  const [partMode, setPartMode] = useState<"edit" | "new">("edit");
  const [partStatusFilter, setPartStatusFilter] = useState<"all" | PartStatus>("all");
  const [partCategoryFilter, setPartCategoryFilter] = useState("all");

  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask Atlas a simple question like “pool documents,” “pool photos,” “irrigation vendor,” “open pool work orders,” or “Boiler B-2.” Results will show as clickable cards with View, Download, Delete, and Open Related Record when available.");
  const [assistantResults, setAssistantResults] = useState<SearchResult[]>([]);
  const [publicDocs, setPublicDocs] = useState<PublicDocRecord[]>([]);
  const [publicDocsStatus, setPublicDocsStatus] = useState("Checking known public docs...");
  const [ready, setReady] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState("Connecting to Neon...");

  function vendorName(vendorId?: string) {
    if (!vendorId) return "Internal";
    return vendorRecords.find((vendor) => vendor.id === vendorId)?.name ?? "Vendor";
  }

  function assetName(assetId: string) {
    return assetRecords.find((asset) => asset.id === assetId)?.name ?? "Asset";
  }

  function procedureName(procedureId?: string) {
    if (!procedureId) return "No procedure";
    return procedureRecords.find((procedure) => procedure.id === procedureId)?.title ?? "Procedure";
  }

  function partName(partId?: string) {
    if (!partId) return "Part";
    return partRecords.find((part) => part.id === partId)?.name ?? "Part";
  }

  async function postAtlasRecord(table: AtlasTable, record: unknown) {
    try {
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

  async function deleteAtlasRecord(table: AtlasTable, id: string) {
    try {
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

  async function syncSnapshotToDatabase(snapshot: {
    assetRecords: AssetRecord[];
    vendorRecords: VendorRecord[];
    procedureRecords: ProcedureRecord[];
    serviceRecords: ServiceRecord[];
    calendarItems: CalendarItem[];
    photos: PhotoRecord[];
  }) {
    try {
      setDatabaseStatus("Syncing Atlas records to Neon...");

      for (const vendor of snapshot.vendorRecords) await postAtlasRecord("vendors", vendor);
      for (const asset of snapshot.assetRecords) await postAtlasRecord("assets", asset);
      for (const procedure of snapshot.procedureRecords) await postAtlasRecord("procedures", procedure);
      for (const service of snapshot.serviceRecords) await postAtlasRecord("work_orders", normalizeService(service));
      for (const item of snapshot.calendarItems) await postAtlasRecord("calendar", item);
      for (const photo of snapshot.photos) await postAtlasRecord("asset_photos", photo);

      setDatabaseStatus("Neon connected + synced");
    } catch {
      setDatabaseStatus("Neon sync needs attention");
    }
  }

  async function syncCurrentToDatabase() {
    await syncSnapshotToDatabase({
      assetRecords,
      vendorRecords,
      procedureRecords,
      serviceRecords,
      calendarItems,
      photos,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDatabase() {
      const browserSnapshot = readBrowserSnapshot();

      try {
        const response = await fetch("/api/atlas", { cache: "no-store" });
        const data = (await response.json()) as AtlasApiPayload;

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Database API returned an error");
        }

        const dbSnapshot = {
          assetRecords: data.assetRecords?.length ? sortAssets(data.assetRecords) : browserSnapshot.assetRecords,
          vendorRecords: data.vendorRecords?.length ? sortVendors(data.vendorRecords) : browserSnapshot.vendorRecords,
          procedureRecords: data.procedureRecords?.length ? sortProcedures(data.procedureRecords) : browserSnapshot.procedureRecords,
          serviceRecords: data.serviceRecords?.length ? sortServices(data.serviceRecords.map(normalizeService)) : browserSnapshot.serviceRecords,
          calendarItems: data.calendarItems?.length ? sortCalendar(data.calendarItems) : browserSnapshot.calendarItems,
          photos: data.photos?.length ? data.photos : browserSnapshot.photos,
        };

        if (cancelled) return;

        setAssetRecords(dbSnapshot.assetRecords);
        setVendorRecords(dbSnapshot.vendorRecords);
        setProcedureRecords(dbSnapshot.procedureRecords);
        setServiceRecords(dbSnapshot.serviceRecords);
        setCalendarItems(dbSnapshot.calendarItems);
        setPhotos(dbSnapshot.photos);

        setSelectedAssetId(dbSnapshot.assetRecords[0]?.id ?? "");
        setSelectedVendorId(dbSnapshot.vendorRecords[0]?.id ?? "");
        setSelectedProcedureId(dbSnapshot.procedureRecords[0]?.id ?? "");
        setSelectedServiceId(dbSnapshot.serviceRecords[0]?.id ?? "");
        setSelectedCalendarId(dbSnapshot.calendarItems[0]?.id ?? "");

        setDatabaseStatus("Neon connected");
        setReady(true);

        const dbHadOperationalData =
          Boolean(data.assetRecords?.length) ||
          Boolean(data.vendorRecords?.length) ||
          Boolean(data.procedureRecords?.length) ||
          Boolean(data.serviceRecords?.length) ||
          Boolean(data.calendarItems?.length) ||
          Boolean(data.photos?.length);

        if (!dbHadOperationalData && !bootstrappedRef.current) {
          bootstrappedRef.current = true;
          await syncSnapshotToDatabase(dbSnapshot);
        }
      } catch (error) {
        if (cancelled) return;

        setAssetRecords(browserSnapshot.assetRecords);
        setVendorRecords(browserSnapshot.vendorRecords);
        setProcedureRecords(browserSnapshot.procedureRecords);
        setServiceRecords(browserSnapshot.serviceRecords);
        setCalendarItems(browserSnapshot.calendarItems);
        setPhotos(browserSnapshot.photos);

        setSelectedAssetId(browserSnapshot.assetRecords[0]?.id ?? "");
        setSelectedVendorId(browserSnapshot.vendorRecords[0]?.id ?? "");
        setSelectedProcedureId(browserSnapshot.procedureRecords[0]?.id ?? "");
        setSelectedServiceId(browserSnapshot.serviceRecords[0]?.id ?? "");
        setSelectedCalendarId(browserSnapshot.calendarItems[0]?.id ?? "");

        setDatabaseStatus(error instanceof Error ? `Browser fallback: ${error.message}` : "Browser fallback active");
        setReady(true);
      }
    }

    loadDatabase();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(mapLocalStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as MapLabelRecord[];
      if (!Array.isArray(parsed) || !parsed.length) return;

      const cleaned = parsed.map((label) => ({
        ...label,
        id: label.id || uid("map"),
        label: label.label || "Map Label",
        category: label.category || "Location",
        x: clampPercent(Number(label.x)),
        y: clampPercent(Number(label.y)),
        notes: label.notes || "",
        photos: Array.isArray(label.photos) ? label.photos : [],
      }));

      setMapLabels(cleaned);
      setSelectedMapLabelId(cleaned[0]?.id ?? "");
      setMapLabelForm(cleaned[0] ?? defaultMapLabels[0]);
    } catch {
      setMapLabels(defaultMapLabels);
    }
  }, []);

  useEffect(() => {
    const selected = assetRecords.find((asset) => asset.id === selectedAssetId);
    if (assetMode === "new") return;
    if (selected) setAssetForm({ ...selected, documents: selected.documents ?? [], vendorIds: selected.vendorIds ?? [] });
  }, [selectedAssetId, assetRecords, assetMode]);

  useEffect(() => {
    const selected = vendorRecords.find((vendor) => vendor.id === selectedVendorId);
    if (vendorMode === "new") return;
    if (selected) setVendorForm({ ...selected, documents: selected.documents ?? [] });
  }, [selectedVendorId, vendorRecords, vendorMode]);

  useEffect(() => {
    const selected = procedureRecords.find((procedure) => procedure.id === selectedProcedureId);
    if (procedureMode === "new") return;
    if (selected) setProcedureForm({ ...selected, steps: selected.steps.length ? selected.steps : [""] });
  }, [selectedProcedureId, procedureRecords, procedureMode]);

  useEffect(() => {
    const selected = serviceRecords.find((service) => service.id === selectedServiceId);
    if (serviceMode === "new") return;
    if (selected) setServiceForm(normalizeService(selected));
  }, [selectedServiceId, serviceRecords, serviceMode]);

  useEffect(() => {
    const selected = calendarItems.find((item) => item.id === selectedCalendarId);
    if (calendarMode === "new") return;
    if (selected) {
      setCalendarForm(selected);
      setSelectedCalendarDate(selected.date);
      setCalendarCursor(dateFromKey(selected.date));
    }
  }, [selectedCalendarId, calendarItems, calendarMode]);

  useEffect(() => {
    const selected = partRecords.find((part) => part.id === selectedPartId);
    if (partMode === "new") return;
    if (selected) setPartForm(selected);
  }, [selectedPartId, partRecords, partMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedParts = readLocalStorageList<PartRecord>(["atlas-part-records-v1"], partSeed);
    const cleanedParts = sortParts(storedParts.map((part) => ({ ...part, status: part.status || partStatusForQuantity(Number(part.quantity ?? 0), Number(part.minQuantity ?? 1)), quantity: Number(part.quantity ?? 0), minQuantity: Number(part.minQuantity ?? 1) })));
    setPartRecords(cleanedParts);
    setSelectedPartId(cleanedParts[0]?.id ?? "");
    setPartForm(cleanedParts[0] ?? blankPart());
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-asset-records-v1", JSON.stringify(sortAssets(assetRecords)));
  }, [ready, assetRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-vendor-records-v2", JSON.stringify(sortVendors(vendorRecords)));
  }, [ready, vendorRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-procedure-records-v1", JSON.stringify(sortProcedures(procedureRecords)));
  }, [ready, procedureRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-part-records-v1", JSON.stringify(sortParts(partRecords)));
  }, [ready, partRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-service-records-v10", JSON.stringify(sortServices(serviceRecords)));
  }, [ready, serviceRecords]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-photo-records-v10", JSON.stringify(photos));
  }, [ready, photos]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem("atlas-calendar-v10", JSON.stringify(sortCalendar(calendarItems)));
  }, [ready, calendarItems]);

  useEffect(() => {
    let cancelled = false;

    async function checkPublicDocs() {
      setPublicDocsStatus("Checking known public docs...");

      const checks = await Promise.all(
        publicDocCandidates.map(async (candidate) => {
          try {
            const response = await fetch(candidate.href, { method: "HEAD", cache: "no-store" });
            return response.ok ? candidate : null;
          } catch {
            return null;
          }
        })
      );

      const found = checks.filter((candidate): candidate is PublicDocCandidate => Boolean(candidate));
      const deduped = Array.from(new Map(found.map((candidate) => [candidate.href, candidate])).values());

      if (!cancelled) {
        setPublicDocs(deduped.map(({ searchText, ...document }) => document));
        setPublicDocsStatus(deduped.length ? `${deduped.length} known public doc(s) found` : "No known public docs found at the expected paths");
      }
    }

    void checkPublicDocs();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAsset = assetRecords.find((asset) => asset.id === selectedAssetId) ?? assetRecords[0] ?? blankAsset();
  const selectedPart = partRecords.find((part) => part.id === selectedPartId) ?? partRecords[0] ?? blankPart();
  const selectedAssetPhotos = photos.filter((photo) => photo.assetId === selectedAsset.id);
  const selectedMapLabel = mapLabels.find((label) => label.id === selectedMapLabelId) ?? mapLabels[0] ?? defaultMapLabels[0];
  const q = query.trim().toLowerCase();

  const filteredLocations = useMemo(() => {
    if (!q) return locations;
    return locations.filter((location) => [location.name, location.type, location.zone, location.notes].join(" ").toLowerCase().includes(q));
  }, [q]);

  const filteredMapLabels = useMemo(() => {
    if (!q) return mapLabels;
    return mapLabels.filter((label) => [label.label, label.category, label.notes].join(" ").toLowerCase().includes(q));
  }, [q, mapLabels]);

  const filteredAssets = useMemo(() => {
    const sorted = sortAssets(assetRecords);
    if (!q) return sorted;
    return sorted.filter((asset) =>
      [asset.name, asset.category, asset.status, asset.make, asset.model, asset.serial, asset.notes, getLocationName(asset.locationId), asset.vendorIds.map(vendorName).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q, assetRecords, vendorRecords]);

  const filteredVendors = useMemo(() => {
    const sorted = sortVendors(vendorRecords);
    if (!q) return sorted;
    return sorted.filter((vendor) => [vendor.name, vendor.category, vendor.phone, vendor.email, vendor.website, vendor.notes].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [q, vendorRecords]);

  const filteredProcedures = useMemo(() => {
    const sorted = sortProcedures(procedureRecords);
    if (!q) return sorted;
    return sorted.filter((procedure) => [procedure.title, procedure.area, procedure.priority, procedure.steps.join(" ")].join(" ").toLowerCase().includes(q));
  }, [q, procedureRecords]);

  const filteredServices = useMemo(() => {
    const sorted = sortServices(serviceRecords);
    if (!q) return sorted;
    return sorted.filter((record) =>
      [
        record.title,
        record.status,
        record.notes,
        record.date,
        record.followUpDate,
        assetName(record.assetId),
        vendorName(record.vendorId),
        procedureName(record.procedureId),
        record.documents?.map((doc) => doc.name).join(" "),
        record.photos?.map((photo) => photo.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q, serviceRecords, assetRecords, vendorRecords, procedureRecords]);

  const filteredCalendar = useMemo(() => {
    const sorted = sortCalendar(calendarItems);
    if (!q) return sorted;
    return sorted.filter((item) => [item.title, item.area, item.status, item.date, formatDate(item.date)].join(" ").toLowerCase().includes(q));
  }, [q, calendarItems]);

  const filteredDocuments = useMemo(() => {
    if (!q) return documents;
    return documents.filter((document) => [document.title, document.area, document.type, document.notes, document.linkedAssetId ? assetName(document.linkedAssetId) : ""].join(" ").toLowerCase().includes(q));
  }, [q, assetRecords]);

  const filteredParts = useMemo(() => {
    let list = sortParts(partRecords);
    if (partStatusFilter !== "all") list = list.filter((part) => part.status === partStatusFilter);
    if (partCategoryFilter !== "all") list = list.filter((part) => part.category === partCategoryFilter);
    if (!q) return list;
    return list.filter((part) =>
      [part.name, part.category, part.status, part.partNumber, part.sku, part.notes, getLocationName(part.locationId), assetName(part.assetId || ""), vendorName(part.vendorId)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [q, partRecords, partStatusFilter, partCategoryFilter, assetRecords, vendorRecords]);

  const lowPartRecords = sortParts(partRecords.filter((part) => part.quantity <= part.minQuantity || part.status === "Low" || part.status === "Out" || part.status === "Order"));
  const partCategories = Array.from(new Set(partRecords.map((part) => part.category).filter(Boolean))).sort();

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!q) return [];

    const results: SearchResult[] = [
      ...filteredLocations.map((location) => ({ id: `location-${location.id}`, type: "Location" as const, title: location.name, subtitle: `${location.zone} · ${location.type}`, detail: location.notes, screen: "locations" as const })),
      ...filteredMapLabels.map((label) => ({ id: `map-label-${label.id}`, type: "Map Label" as const, title: label.label, subtitle: `${label.category} · ${Math.round(label.x)}% / ${Math.round(label.y)}%`, detail: label.notes, screen: "map" as const })),
      ...filteredAssets.map((asset) => ({ id: `asset-${asset.id}`, type: "Asset" as const, title: asset.name, subtitle: `${getLocationName(asset.locationId)} · ${asset.category}`, detail: asset.notes, screen: "assets" as const, assetId: asset.id })),
      ...filteredVendors.map((vendor) => ({ id: `vendor-${vendor.id}`, type: "Vendor" as const, title: vendor.name, subtitle: vendor.category, detail: vendor.notes, screen: "vendors" as const, vendorId: vendor.id })),
      ...filteredServices.map((record) => ({ id: `service-${record.id}`, type: "Work Order" as const, title: record.title, subtitle: `${formatDate(record.date)} · ${assetName(record.assetId)} · ${vendorName(record.vendorId)}`, detail: record.notes, screen: "history" as const, serviceId: record.id, assetId: record.assetId })),
      ...filteredCalendar.map((item) => ({ id: `calendar-${item.id}`, type: "Calendar" as const, title: item.title, subtitle: `${formatDate(item.date)} · ${item.area}`, detail: item.status, screen: "calendar" as const, calendarId: item.id })),
      ...filteredDocuments.map((document) => ({ id: `document-${document.id}`, type: "Document" as const, title: document.title, subtitle: `${document.area} · ${document.type}${document.linkedAssetId ? ` · ${assetName(document.linkedAssetId)}` : ""}`, detail: document.notes, screen: "documents" as const, assetId: document.linkedAssetId })),
      ...filteredProcedures.map((procedure) => ({ id: `procedure-${procedure.id}`, type: "Procedure" as const, title: procedure.title, subtitle: `${procedure.area} · ${procedure.priority}`, detail: procedure.steps.join(" "), screen: "procedures" as const, procedureId: procedure.id })),
      ...filteredParts.map((part) => ({ id: `part-${part.id}`, type: "Part" as const, title: part.name, subtitle: `${part.category} · ${part.status} · Qty ${part.quantity} ${part.unit}`, detail: `${getLocationName(part.locationId)} · ${assetName(part.assetId || "")} · ${vendorName(part.vendorId)} · ${part.notes}`, screen: "parts" as const, partId: part.id, assetId: part.assetId, vendorId: part.vendorId })),
    ];

    return results.slice(0, 14);
  }, [q, filteredLocations, filteredMapLabels, filteredAssets, filteredVendors, filteredServices, filteredCalendar, filteredDocuments, filteredProcedures, filteredParts]);

  const openWorkOrderCount = serviceRecords.filter((record) => record.status === "Open" || record.status === "Monitor").length;
  const monitorAssetCount = assetRecords.filter((asset) => asset.status === "Monitor" || asset.status === "Offline").length;
  const uploadedDocumentCount =
    vendorRecords.reduce((total, vendor) => total + (vendor.documents?.length ?? 0), 0) +
    assetRecords.reduce((total, asset) => total + (asset.documents?.length ?? 0), 0) +
    serviceRecords.reduce((total, service) => total + (service.documents?.length ?? 0), 0);
  const uploadedServicePhotoCount = serviceRecords.reduce((total, service) => total + (service.photos?.length ?? 0), 0);
  const upcomingCalendarCount = calendarItems.filter((item) => item.status === "Scheduled" || item.status === "Monitor" || item.status === "Open").length;

  useEffect(() => {
    if (!ready || screen !== "history" || serviceMode === "new") return;

    const visibleWorkOrders = getVisibleWorkOrdersForBoard();

    if (!visibleWorkOrders.length) {
      if (selectedServiceId) {
        setSelectedServiceId("");
        setServiceForm(blankService(todayKey));
        setServiceMode("new");
      }
      return;
    }

    const selectedIsVisible = visibleWorkOrders.some((record) => record.id === selectedServiceId);
    if (!selectedIsVisible) openServiceRecord(visibleWorkOrders[0]);
  }, [
    ready,
    screen,
    serviceMode,
    selectedServiceId,
    workOrderTab,
    workOrderStatusFilter,
    workOrderLocationFilter,
    workOrderAssetFilter,
    workOrderSort,
    q,
    serviceRecords,
    assetRecords,
    filteredServices,
  ]);

  function openSearchResult(result: SearchResult) {
    if (result.assetId) {
      setSelectedAssetId(result.assetId);
      setAssetMode("edit");
    }

    if (result.vendorId) {
      setSelectedVendorId(result.vendorId);
      setVendorMode("edit");
    }

    if (result.procedureId) {
      setSelectedProcedureId(result.procedureId);
      setProcedureMode("edit");
    }

    if (result.serviceId) {
      const selectedService = serviceRecords.find((record) => record.id === result.serviceId);
      if (selectedService) openServiceRecord(selectedService);
    }

    if (result.calendarId) {
      const selectedCalendarItem = calendarItems.find((item) => item.id === result.calendarId);
      if (selectedCalendarItem) openCalendarItem(selectedCalendarItem);
      else {
        setSelectedCalendarId(result.calendarId);
        setCalendarMode("edit");
      }
    }

    if (result.partId) {
      setSelectedPartId(result.partId);
      setPartMode("edit");
    }

    if (result.mapLabelId) {
      selectMapLabel(result.mapLabelId);
    }

    setScreen(result.screen);
  }

  function openAssistantFile(result: SearchResult) {
    if (!result.dataUrl) {
      window.alert("This Atlas reference does not have a file path yet. Upload the actual PDF/photo/file to the related asset, vendor, work order, or map label.");
      return;
    }

    const opened = window.open(result.dataUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.alert("Your browser blocked the file preview popup. Use the Download button instead.");
    }
  }

  function deleteAssistantAttachment(result: SearchResult) {
    if (!result.attachmentKind || !result.attachmentId) return;

    if (result.attachmentKind === "static-document") {
      window.alert("This is a built-in Atlas reference record. It cannot be deleted here. If the View button opens a missing page, add the actual file to the matching public/docs path or upload it to the related Atlas record.");
      return;
    }

    const confirmed = window.confirm(`Delete ${result.title}?`);
    if (!confirmed) return;

    if (result.attachmentKind === "asset-photo") {
      deleteAssetPhoto(result.attachmentId);
      setAssistantResults((current) => current.filter((item) => item.id !== result.id));
      return;
    }

    if (result.attachmentKind === "asset-document" && result.assetId) {
      const asset = assetRecords.find((item) => item.id === result.assetId);
      if (!asset) return;

      const updatedAsset = { ...asset, documents: (asset.documents ?? []).filter((document) => document.id !== result.attachmentId) };
      setAssetRecords((current) => sortAssets(current.map((item) => (item.id === asset.id ? updatedAsset : item))));
      if (assetForm.id === asset.id) setAssetForm(updatedAsset);
      void postAtlasRecord("assets", updatedAsset);
      setAssistantResults((current) => current.filter((item) => item.id !== result.id));
      return;
    }

    if (result.attachmentKind === "vendor-document" && result.vendorId) {
      const vendor = vendorRecords.find((item) => item.id === result.vendorId);
      if (!vendor) return;

      const updatedVendor = { ...vendor, documents: (vendor.documents ?? []).filter((document) => document.id !== result.attachmentId) };
      setVendorRecords((current) => sortVendors(current.map((item) => (item.id === vendor.id ? updatedVendor : item))));
      if (vendorForm.id === vendor.id) setVendorForm(updatedVendor);
      void postAtlasRecord("vendors", updatedVendor);
      setAssistantResults((current) => current.filter((item) => item.id !== result.id));
      return;
    }

    if ((result.attachmentKind === "work-order-photo" || result.attachmentKind === "work-order-document") && result.serviceId) {
      const service = serviceRecords.find((item) => item.id === result.serviceId);
      if (!service) return;

      const updatedService = normalizeService({
        ...service,
        photos: result.attachmentKind === "work-order-photo" ? (service.photos ?? []).filter((photo) => photo.id !== result.attachmentId) : service.photos ?? [],
        documents: result.attachmentKind === "work-order-document" ? (service.documents ?? []).filter((document) => document.id !== result.attachmentId) : service.documents ?? [],
      });

      setServiceRecords((current) => sortServices(current.map((item) => (item.id === service.id ? updatedService : item))));
      if (serviceForm.id === service.id) setServiceForm(updatedService);
      void postAtlasRecord("work_orders", updatedService);
      setAssistantResults((current) => current.filter((item) => item.id !== result.id));
      return;
    }

    if (result.attachmentKind === "map-photo" && result.mapLabelId) {
      setMapLabels((current) => current.map((label) => (label.id === result.mapLabelId ? { ...label, photos: (label.photos ?? []).filter((photo) => photo.id !== result.attachmentId) } : label)));
      if (mapLabelForm.id === result.mapLabelId) {
        setMapLabelForm((current) => ({ ...current, photos: (current.photos ?? []).filter((photo) => photo.id !== result.attachmentId) }));
      }
      setAssistantResults((current) => current.filter((item) => item.id !== result.id));
    }
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
        void postAtlasRecord("asset_photos", photo);
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function selectMapLabel(id: string) {
    const selected = mapLabels.find((label) => label.id === id);
    if (!selected) return;

    setSelectedMapLabelId(id);
    setMapLabelForm({ ...selected, photos: selected.photos ?? [] });
    setMapLabelMode("edit");
  }

  function startNewMapLabel() {
    const nextLabel: MapLabelRecord = {
      id: "",
      label: "New Label",
      category: "Location",
      x: 50,
      y: 50,
      notes: "",
      photos: [],
    };

    setSelectedMapLabelId("");
    setMapLabelForm(nextLabel);
    setMapLabelMode("new");
  }

  function saveMapLabel() {
    const labelText = mapLabelForm.label.trim();
    if (!labelText) return;

    const existingId = mapLabelMode === "edit" ? mapLabelForm.id : "";
    let id = existingId || slugify(`map-${labelText}`);
    if (mapLabelMode === "new" && mapLabels.some((label) => label.id === id)) id = `${id}-${Date.now()}`;

    const cleanLabel: MapLabelRecord = {
      ...mapLabelForm,
      id,
      label: labelText,
      category: mapLabelForm.category.trim() || "Location",
      x: clampPercent(Number(mapLabelForm.x)),
      y: clampPercent(Number(mapLabelForm.y)),
      notes: mapLabelForm.notes.trim(),
      photos: mapLabelForm.photos ?? [],
    };

    setMapLabels((current) => (current.some((label) => label.id === id) ? current.map((label) => (label.id === id ? cleanLabel : label)) : [...current, cleanLabel]));
    setSelectedMapLabelId(id);
    setMapLabelForm(cleanLabel);
    setMapLabelMode("edit");
  }

  function deleteMapLabel() {
    if (!mapLabelForm.id) return;
    const confirmed = window.confirm(`Delete map label ${mapLabelForm.label}?`);
    if (!confirmed) return;

    const remainingLabels = mapLabels.filter((label) => label.id !== mapLabelForm.id);
    const nextLabel = remainingLabels[0] ?? defaultMapLabels[0];

    setMapLabels(remainingLabels.length ? remainingLabels : defaultMapLabels);
    setSelectedMapLabelId(nextLabel?.id ?? "");
    setMapLabelForm(nextLabel ?? { id: "", label: "", category: "Location", x: 50, y: 50, notes: "", photos: [] });
    setMapLabelMode(nextLabel ? "edit" : "new");
  }

  function resetMapLabels() {
    const confirmed = window.confirm("Reset the map labels back to the Atlas default layout? This will remove custom label positions, notes, and photos stored in this browser.");
    if (!confirmed) return;

    setMapLabels(defaultMapLabels);
    setSelectedMapLabelId(defaultMapLabels[0]?.id ?? "");
    setMapLabelForm(defaultMapLabels[0] ?? { id: "", label: "", category: "Location", x: 50, y: 50, notes: "", photos: [] });
    setMapLabelMode("edit");
  }

  function handleMapLabelPhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const labelId = mapLabelForm.id || selectedMapLabelId;
    const files = Array.from(event.target.files ?? []);

    if (!labelId) {
      window.alert("Save the map label before adding photos.");
      event.target.value = "";
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const photo: UploadedFileRecord = {
          id: uid("map-photo"),
          name: file.name,
          type: file.type || "photo",
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setMapLabels((current) =>
          current.map((label) => (label.id === labelId ? { ...label, photos: [photo, ...(label.photos ?? [])] } : label))
        );
        setMapLabelForm((current) => (current.id === labelId ? { ...current, photos: [photo, ...(current.photos ?? [])] } : current));
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function deleteMapLabelPhoto(photoId: string) {
    const labelId = mapLabelForm.id || selectedMapLabelId;
    if (!labelId) return;

    setMapLabels((current) =>
      current.map((label) => (label.id === labelId ? { ...label, photos: (label.photos ?? []).filter((photo) => photo.id !== photoId) } : label))
    );
    setMapLabelForm((current) => ({ ...current, photos: (current.photos ?? []).filter((photo) => photo.id !== photoId) }));
  }

  function handleMapLabelPointerDown(event: React.PointerEvent<HTMLButtonElement>, labelId: string) {
    const mapElement = mapRef.current;
    if (!mapElement) return;

    event.preventDefault();
    selectMapLabel(labelId);

    const updatePosition = (clientX: number, clientY: number) => {
      const rect = mapElement.getBoundingClientRect();
      const x = clampPercent(((clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((clientY - rect.top) / rect.height) * 100);

      setMapLabels((current) => current.map((label) => (label.id === labelId ? { ...label, x, y } : label)));
      setMapLabelForm((current) => (current.id === labelId ? { ...current, x, y } : current));
    };

    updatePosition(event.clientX, event.clientY);

    const handlePointerMove = (pointerEvent: PointerEvent) => updatePosition(pointerEvent.clientX, pointerEvent.clientY);
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function startNewAsset() {
    setAssetMode("new");
    setSelectedAssetId("");
    setAssetForm(blankAsset());
  }

  function saveAsset() {
    const name = assetForm.name.trim();
    if (!name) return;

    const existingId = assetMode === "edit" ? assetForm.id : "";
    let id = existingId || slugify(name);
    if (assetMode === "new" && assetRecords.some((asset) => asset.id === id)) id = `${id}-${Date.now()}`;

    const cleanAsset: AssetRecord = {
      ...assetForm,
      id,
      name,
      locationId: assetForm.locationId || "general",
      category: assetForm.category.trim() || "General",
      status: assetForm.status || "Monitor",
      make: assetForm.make?.trim(),
      model: assetForm.model?.trim(),
      serial: assetForm.serial?.trim(),
      notes: assetForm.notes.trim() || "No notes added yet.",
      vendorIds: assetForm.vendorIds ?? [],
      documents: assetForm.documents ?? [],
    };

    setAssetRecords((current) => sortAssets(current.some((asset) => asset.id === id) ? current.map((asset) => (asset.id === id ? cleanAsset : asset)) : [...current, cleanAsset]));
    setAssetMode("edit");
    setSelectedAssetId(id);
    void postAtlasRecord("assets", cleanAsset);
  }

  function deleteAsset() {
    if (!assetForm.id) return;
    const confirmed = window.confirm(`Delete ${assetForm.name}? This removes the asset, asset photos, asset documents, and work orders from this browser/database.`);
    if (!confirmed) return;

    const idToDelete = assetForm.id;
    const remainingAssets = sortAssets(assetRecords.filter((asset) => asset.id !== idToDelete));
    setAssetRecords(remainingAssets);
    setPhotos((current) => current.filter((photo) => photo.assetId !== idToDelete));
    setServiceRecords((current) => current.filter((record) => record.assetId !== idToDelete));

    const nextAsset = remainingAssets[0];
    setSelectedAssetId(nextAsset?.id ?? "");
    setAssetForm(nextAsset ?? blankAsset());
    setAssetMode(nextAsset ? "edit" : "new");
    void deleteAtlasRecord("assets", idToDelete);
  }

  function handleAssetDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const documentRecord: UploadedFileRecord = {
          id: uid("asset-doc"),
          name: file.name,
          type: file.type || "File",
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setAssetForm((current) => ({ ...current, documents: [documentRecord, ...(current.documents ?? [])] }));
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function removeAssetDocument(documentId: string) {
    setAssetForm((current) => ({ ...current, documents: (current.documents ?? []).filter((document) => document.id !== documentId) }));
  }

  function toggleAssetVendor(vendorId: string) {
    setAssetForm((current) => {
      const currentIds = current.vendorIds ?? [];
      const exists = currentIds.includes(vendorId);
      return { ...current, vendorIds: exists ? currentIds.filter((id) => id !== vendorId) : [...currentIds, vendorId] };
    });
  }

  function startNewVendor() {
    setVendorMode("new");
    setSelectedVendorId("");
    setVendorForm(blankVendor());
  }

  function saveVendor() {
    const name = vendorForm.name.trim();
    if (!name) return;

    const existingId = vendorMode === "edit" ? vendorForm.id : "";
    let id = existingId || slugify(name);
    if (vendorMode === "new" && vendorRecords.some((vendor) => vendor.id === id)) id = `${id}-${Date.now()}`;

    const cleanVendor: VendorRecord = {
      ...vendorForm,
      id,
      name,
      category: vendorForm.category.trim() || "General",
      phone: vendorForm.phone?.trim(),
      email: vendorForm.email?.trim(),
      website: vendorForm.website?.trim(),
      notes: vendorForm.notes.trim() || "No notes added yet.",
      documents: vendorForm.documents ?? [],
    };

    setVendorRecords((current) => sortVendors(current.some((vendor) => vendor.id === id) ? current.map((vendor) => (vendor.id === id ? cleanVendor : vendor)) : [...current, cleanVendor]));
    setVendorMode("edit");
    setSelectedVendorId(id);
    void postAtlasRecord("vendors", cleanVendor);
  }

  function deleteVendor() {
    if (!vendorForm.id) return;
    const confirmed = window.confirm(`Delete ${vendorForm.name}? This removes the vendor card and attached vendor documents from this browser/database.`);
    if (!confirmed) return;

    const idToDelete = vendorForm.id;
    const remainingVendors = sortVendors(vendorRecords.filter((vendor) => vendor.id !== idToDelete));
    setVendorRecords(remainingVendors);
    setAssetRecords((current) => current.map((asset) => ({ ...asset, vendorIds: asset.vendorIds.filter((id) => id !== idToDelete) })));
    setServiceRecords((current) => current.map((service) => (service.vendorId === idToDelete ? { ...service, vendorId: "" } : service)));

    const nextVendor = remainingVendors[0];
    setSelectedVendorId(nextVendor?.id ?? "");
    setVendorForm(nextVendor ?? blankVendor());
    setVendorMode(nextVendor ? "edit" : "new");
    void deleteAtlasRecord("vendors", idToDelete);
  }

  function handleVendorLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setVendorForm((current) => ({ ...current, logoDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleVendorDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const documentRecord: UploadedFileRecord = {
          id: uid("vendor-doc"),
          name: file.name,
          type: file.type || "File",
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setVendorForm((current) => ({ ...current, documents: [documentRecord, ...(current.documents ?? [])] }));
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function removeVendorDocument(documentId: string) {
    setVendorForm((current) => ({ ...current, documents: (current.documents ?? []).filter((document) => document.id !== documentId) }));
  }

  function startNewProcedure() {
    setProcedureMode("new");
    setSelectedProcedureId("");
    setProcedureForm(blankProcedure());
  }

  function saveProcedure() {
    const title = procedureForm.title.trim();
    if (!title) return;

    const existingId = procedureMode === "edit" ? procedureForm.id : "";
    let id = existingId || slugify(title);
    if (procedureMode === "new" && procedureRecords.some((procedure) => procedure.id === id)) id = `${id}-${Date.now()}`;

    const cleanProcedure: ProcedureRecord = {
      id,
      title,
      area: procedureForm.area.trim() || "General",
      priority: procedureForm.priority || "Normal",
      steps: procedureForm.steps.map((step) => step.trim()).filter(Boolean).length ? procedureForm.steps.map((step) => step.trim()).filter(Boolean) : ["Add procedure steps."],
    };

    setProcedureRecords((current) => sortProcedures(current.some((procedure) => procedure.id === id) ? current.map((procedure) => (procedure.id === id ? cleanProcedure : procedure)) : [...current, cleanProcedure]));
    setProcedureMode("edit");
    setSelectedProcedureId(id);
    void postAtlasRecord("procedures", cleanProcedure);
  }

  function deleteProcedure() {
    if (!procedureForm.id) return;
    const confirmed = window.confirm(`Delete procedure: ${procedureForm.title}?`);
    if (!confirmed) return;

    const idToDelete = procedureForm.id;
    const remainingProcedures = sortProcedures(procedureRecords.filter((procedure) => procedure.id !== idToDelete));
    setProcedureRecords(remainingProcedures);
    setServiceRecords((current) => current.map((service) => (service.procedureId === idToDelete ? { ...service, procedureId: "" } : service)));

    const nextProcedure = remainingProcedures[0];
    setSelectedProcedureId(nextProcedure?.id ?? "");
    setProcedureForm(nextProcedure ?? blankProcedure());
    setProcedureMode(nextProcedure ? "edit" : "new");
    void deleteAtlasRecord("procedures", idToDelete);
  }

  function updateProcedureStep(index: number, value: string) {
    setProcedureForm((current) => ({ ...current, steps: current.steps.map((step, stepIndex) => (stepIndex === index ? value : step)) }));
  }

  function addProcedureStep() {
    setProcedureForm((current) => ({ ...current, steps: [...current.steps, ""] }));
  }

  function removeProcedureStep(index: number) {
    setProcedureForm((current) => {
      const nextSteps = current.steps.filter((_, stepIndex) => stepIndex !== index);
      return { ...current, steps: nextSteps.length ? nextSteps : [""] };
    });
  }

  function scheduleProcedure(procedure: ProcedureRecord) {
    if (!procedure.title.trim()) return;

    const date = procedureScheduleDate || selectedCalendarDate || todayKey;
    const calendarItem: CalendarItem = {
      id: uid("cal-procedure"),
      date,
      title: procedure.title,
      area: procedure.area || "General",
      status: "Scheduled",
    };

    setCalendarItems((current) => sortCalendar([...current, calendarItem]));
    setSelectedCalendarDate(date);
    setCalendarCursor(dateFromKey(date));
    setSelectedCalendarId(calendarItem.id);
    setCalendarForm(calendarItem);
    setCalendarMode("edit");
    setScreen("calendar");
    void postAtlasRecord("calendar", calendarItem);
  }

  function startNewService() {
    setServiceMode("new");
    setSelectedServiceId("");
    setServiceForm(blankService(todayKey));
  }

  function saveService() {
    const title = serviceForm.title.trim();
    if (!title) return;

    const existingId = serviceMode === "edit" ? serviceForm.id : "";
    let id = existingId || slugify(title);
    if (serviceMode === "new" && serviceRecords.some((service) => service.id === id)) id = `${id}-${Date.now()}`;

    const cleanService: ServiceRecord = {
      ...serviceForm,
      id,
      title,
      assetId: serviceForm.assetId || "",
      vendorId: serviceForm.vendorId || "",
      procedureId: serviceForm.procedureId || "",
      date: serviceForm.date || todayKey,
      status: serviceForm.status || "Open",
      notes: serviceForm.notes.trim() || "No notes added yet.",
      followUpDate: serviceForm.followUpDate || "",
      photos: serviceForm.photos ?? [],
      documents: serviceForm.documents ?? [],
    };

    setServiceRecords((current) => sortServices(current.some((service) => service.id === id) ? current.map((service) => (service.id === id ? cleanService : service)) : [cleanService, ...current]));
    setServiceMode("edit");
    setSelectedServiceId(id);
    void postAtlasRecord("work_orders", cleanService);
  }

  function deleteService() {
    if (!serviceForm.id) return;
    const confirmed = window.confirm(`Delete work order: ${serviceForm.title}?`);
    if (!confirmed) return;

    const idToDelete = serviceForm.id;
    const remainingServices = sortServices(serviceRecords.filter((service) => service.id !== idToDelete));
    setServiceRecords(remainingServices);

    const nextService = remainingServices[0];
    setSelectedServiceId(nextService?.id ?? "");
    setServiceForm(nextService ? normalizeService(nextService) : blankService(todayKey));
    setServiceMode(nextService ? "edit" : "new");
    void deleteAtlasRecord("work_orders", idToDelete);
  }

  function getWorkOrderNumber(record: ServiceRecord) {
    const raw = record.id || slugify(record.title || "work-order");
    const compact = raw.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    return `#${compact || "NEW"}`;
  }

  function getWorkOrderDueDate(record: ServiceRecord) {
    return record.followUpDate || record.date || todayKey;
  }

  function getWorkOrderPriority(record: ServiceRecord): "High" | "Normal" | "Low" | "Done" {
    if (record.status === "Completed") return "Done";

    const dueDate = getWorkOrderDueDate(record);
    if (record.status === "Open" || record.status === "Monitor") return "High";
    if (dueDate && dueDate <= todayKey) return "High";
    if (record.status === "Scheduled") return "Normal";
    return "Low";
  }

  function getWorkOrderPriorityRank(record: ServiceRecord) {
    const priority = getWorkOrderPriority(record);
    if (priority === "High") return 1;
    if (priority === "Normal") return 2;
    if (priority === "Low") return 3;
    return 4;
  }

  function openServiceRecord(record: ServiceRecord) {
    setSelectedServiceId(record.id);
    setServiceForm(normalizeService(record));
    setServiceMode("edit");
  }

  function getWorkOrderLocationId(record: ServiceRecord) {
    return assetRecords.find((asset) => asset.id === record.assetId)?.locationId || "general";
  }

  function workOrderMatchesBoardFilters(
    record: ServiceRecord,
    tab = workOrderTab,
    statusFilter = workOrderStatusFilter,
    locationFilter = workOrderLocationFilter,
    assetFilter = workOrderAssetFilter
  ) {
    const locationId = getWorkOrderLocationId(record);
    const matchesTab = tab === "done" ? record.status === "Completed" : record.status !== "Completed";
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesAsset = assetFilter === "all" || record.assetId === assetFilter;
    const matchesLocation = locationFilter === "all" || locationId === locationFilter;
    const matchesSearch = !q || filteredServices.some((service) => service.id === record.id);
    return matchesTab && matchesStatus && matchesAsset && matchesLocation && matchesSearch;
  }

  function sortWorkOrderBoardRecords(records: ServiceRecord[], sortBy = workOrderSort) {
    return sortServices(records).sort((a, b) => {
      if (sortBy === "priority") return getWorkOrderPriorityRank(a) - getWorkOrderPriorityRank(b) || getWorkOrderDueDate(a).localeCompare(getWorkOrderDueDate(b));
      if (sortBy === "due-asc") return getWorkOrderDueDate(a).localeCompare(getWorkOrderDueDate(b));
      if (sortBy === "asset") return assetName(a.assetId).localeCompare(assetName(b.assetId)) || getWorkOrderDueDate(a).localeCompare(getWorkOrderDueDate(b));
      return b.date.localeCompare(a.date);
    });
  }

  function getVisibleWorkOrdersForBoard(
    tab = workOrderTab,
    statusFilter = workOrderStatusFilter,
    locationFilter = workOrderLocationFilter,
    assetFilter = workOrderAssetFilter,
    sortBy = workOrderSort
  ) {
    return sortWorkOrderBoardRecords(
      serviceRecords.filter((record) => workOrderMatchesBoardFilters(record, tab, statusFilter, locationFilter, assetFilter)),
      sortBy
    );
  }

  function selectFirstVisibleWorkOrder(
    tab = workOrderTab,
    statusFilter = workOrderStatusFilter,
    locationFilter = workOrderLocationFilter,
    assetFilter = workOrderAssetFilter,
    sortBy = workOrderSort
  ) {
    const firstVisible = getVisibleWorkOrdersForBoard(tab, statusFilter, locationFilter, assetFilter, sortBy)[0];

    if (firstVisible) {
      openServiceRecord(firstVisible);
      return;
    }

    setSelectedServiceId("");
    setServiceForm(blankService(todayKey));
    setServiceMode("new");
  }

  function changeWorkOrderTab(tab: "todo" | "done") {
    setWorkOrderTab(tab);
    selectFirstVisibleWorkOrder(tab);
  }

  function changeWorkOrderStatusFilter(statusFilter: "all" | ServiceStatus) {
    setWorkOrderStatusFilter(statusFilter);
    selectFirstVisibleWorkOrder(workOrderTab, statusFilter);
  }

  function changeWorkOrderLocationFilter(locationFilter: string) {
    setWorkOrderLocationFilter(locationFilter);
    selectFirstVisibleWorkOrder(workOrderTab, workOrderStatusFilter, locationFilter);
  }

  function changeWorkOrderAssetFilter(assetFilter: string) {
    setWorkOrderAssetFilter(assetFilter);
    selectFirstVisibleWorkOrder(workOrderTab, workOrderStatusFilter, workOrderLocationFilter, assetFilter);
  }

  function changeWorkOrderSort(sortBy: "priority" | "due-asc" | "date-desc" | "asset") {
    setWorkOrderSort(sortBy);
    selectFirstVisibleWorkOrder(workOrderTab, workOrderStatusFilter, workOrderLocationFilter, workOrderAssetFilter, sortBy);
  }

  function markServiceCompleted() {
    setServiceForm((current) => ({ ...current, status: "Completed" }));
  }

  function markServiceDoneAndSave(record?: ServiceRecord) {
    const baseRecord = record ?? serviceForm;
    if (!baseRecord.id && !baseRecord.title.trim()) return;

    const completedRecord: ServiceRecord = normalizeService({
      ...baseRecord,
      status: "Completed",
      notes: baseRecord.notes?.trim() || "Completed.",
    });

    setServiceRecords((current) => sortServices(current.map((service) => (service.id === completedRecord.id ? completedRecord : service))));

    setServiceForm(completedRecord);
    setSelectedServiceId(completedRecord.id);
    setServiceMode("edit");

    setDatabaseStatus(`Marked done: ${completedRecord.title}`);
    void postAtlasRecord("work_orders", completedRecord);
  }

  function reopenServiceAndSave(record?: ServiceRecord) {
    const baseRecord = record ?? serviceForm;
    if (!baseRecord.id && !baseRecord.title.trim()) return;

    const reopenedRecord: ServiceRecord = normalizeService({
      ...baseRecord,
      status: "Open",
      notes: baseRecord.notes?.trim() || "Reopened.",
    });

    setServiceRecords((current) => sortServices(current.map((service) => (service.id === reopenedRecord.id ? reopenedRecord : service))));

    setServiceForm(reopenedRecord);
    setSelectedServiceId(reopenedRecord.id);
    setServiceMode("edit");

    setDatabaseStatus(`Reopened: ${reopenedRecord.title}`);
    void postAtlasRecord("work_orders", reopenedRecord);
  }

  function handleServiceDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const documentRecord: UploadedFileRecord = {
          id: uid("service-doc"),
          name: file.name,
          type: file.type || "File",
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setServiceForm((current) => ({ ...current, documents: [documentRecord, ...(current.documents ?? [])] }));
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function handleServicePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        const photoRecord: UploadedFileRecord = {
          id: uid("service-photo"),
          name: file.name,
          type: file.type || "image",
          dataUrl: String(reader.result),
          createdAt: new Date().toISOString(),
        };

        setServiceForm((current) => ({ ...current, photos: [photoRecord, ...(current.photos ?? [])] }));
      };

      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function removeServiceDocument(documentId: string) {
    setServiceForm((current) => ({ ...current, documents: (current.documents ?? []).filter((document) => document.id !== documentId) }));
  }

  function removeServicePhoto(photoId: string) {
    setServiceForm((current) => ({ ...current, photos: (current.photos ?? []).filter((photo) => photo.id !== photoId) }));
  }

  function scheduleServiceFollowUp() {
    if (!serviceForm.followUpDate) return;

    const item: CalendarItem = {
      id: uid("cal-follow-up"),
      date: serviceForm.followUpDate,
      title: `Follow up: ${serviceForm.title || "Work Order"}`,
      area: assetName(serviceForm.assetId),
      status: "Scheduled",
    };

    setCalendarItems((current) => sortCalendar([...current, item]));
    setSelectedCalendarDate(item.date);
    setCalendarCursor(dateFromKey(item.date));
    setSelectedCalendarId(item.id);
    setCalendarForm(item);
    setCalendarMode("edit");
    setScreen("calendar");
    void postAtlasRecord("calendar", item);
  }

  function selectCalendarDate(dateKey: string) {
    setSelectedCalendarDate(dateKey);
    setCalendarCursor(dateFromKey(dateKey));
    setCalendarMode("new");
    setSelectedCalendarId("");
    setCalendarForm(blankCalendarItem(dateKey));
  }

  function openCalendarItem(item: CalendarItem) {
    setSelectedCalendarId(item.id);
    setSelectedCalendarDate(item.date);
    setCalendarCursor(dateFromKey(item.date));
    setCalendarMode("edit");
    setCalendarForm(item);
  }

  function startNewCalendarItem(date?: string) {
    const itemDate = date || selectedCalendarDate || todayKey;
    setCalendarMode("new");
    setSelectedCalendarId("");
    setSelectedCalendarDate(itemDate);
    setCalendarCursor(dateFromKey(itemDate));
    setCalendarForm(blankCalendarItem(itemDate));
  }

  function saveCalendarItem() {
    const title = calendarForm.title.trim();
    if (!title) return;

    const existingId = calendarMode === "edit" ? calendarForm.id : "";
    let id = existingId || slugify(title);
    if (calendarMode === "new" && calendarItems.some((item) => item.id === id)) id = `${id}-${Date.now()}`;

    const cleanItem: CalendarItem = {
      id,
      title,
      date: calendarForm.date || selectedCalendarDate || todayKey,
      area: calendarForm.area.trim() || "General",
      status: calendarForm.status || "Scheduled",
    };

    setCalendarItems((current) => sortCalendar(current.some((item) => item.id === id) ? current.map((item) => (item.id === id ? cleanItem : item)) : [...current, cleanItem]));
    setCalendarMode("edit");
    setSelectedCalendarId(id);
    setSelectedCalendarDate(cleanItem.date);
    setCalendarCursor(dateFromKey(cleanItem.date));
    void postAtlasRecord("calendar", cleanItem);
  }

  function deleteCalendarItem() {
    if (!calendarForm.id) return;
    const confirmed = window.confirm(`Delete scheduled item: ${calendarForm.title}?`);
    if (!confirmed) return;

    const idToDelete = calendarForm.id;
    const remainingItems = sortCalendar(calendarItems.filter((item) => item.id !== idToDelete));
    setCalendarItems(remainingItems);

    const nextItem = remainingItems.find((item) => item.date === selectedCalendarDate) ?? remainingItems[0];
    setSelectedCalendarId(nextItem?.id ?? "");
    setCalendarForm(nextItem ?? blankCalendarItem(selectedCalendarDate));
    setCalendarMode(nextItem ? "edit" : "new");
    void deleteAtlasRecord("calendar", idToDelete);
  }

  function markCalendarCompleted(itemId: string) {
    const nextItem = calendarItems.find((item) => item.id === itemId);
    if (!nextItem) return;

    const completedItem: CalendarItem = { ...nextItem, status: "Completed" };
    setCalendarItems((current) => sortCalendar(current.map((item) => (item.id === itemId ? completedItem : item))));
    setCalendarForm(completedItem);
    void postAtlasRecord("calendar", completedItem);
  }

  function reopenCalendarItem(itemId: string) {
    const nextItem = calendarItems.find((item) => item.id === itemId);
    if (!nextItem) return;

    const reopenedItem: CalendarItem = { ...nextItem, status: "Scheduled" };
    setCalendarItems((current) => sortCalendar(current.map((item) => (item.id === itemId ? reopenedItem : item))));
    setCalendarForm(reopenedItem);
    setSelectedCalendarId(reopenedItem.id);
    setCalendarMode("edit");
    void postAtlasRecord("calendar", reopenedItem);
  }

  function quickAddCalendarItem(title: string, area: string, daysFromToday = 0, status: ServiceStatus = "Scheduled") {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    const dateKey = dateKeyFromDate(date);

    const item: CalendarItem = {
      id: uid("cal-quick"),
      date: dateKey,
      title,
      area,
      status,
    };

    setCalendarItems((current) => sortCalendar([...current, item]));
    setSelectedCalendarId(item.id);
    setSelectedCalendarDate(item.date);
    setCalendarCursor(dateFromKey(item.date));
    setCalendarForm(item);
    setCalendarMode("edit");
    void postAtlasRecord("calendar", item);
  }

  function addWeeklyCalendarSeries(title: string, area: string, startDaysFromToday: number, weeks: number) {
    const newItems: CalendarItem[] = Array.from({ length: weeks }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + startDaysFromToday + index * 7);

      return {
        id: uid(`cal-series-${index}`),
        date: dateKeyFromDate(date),
        title,
        area,
        status: "Scheduled" as ServiceStatus,
      };
    });

    setCalendarItems((current) => sortCalendar([...current, ...newItems]));

    const firstItem = newItems[0];
    if (firstItem) {
      setSelectedCalendarId(firstItem.id);
      setSelectedCalendarDate(firstItem.date);
      setCalendarCursor(dateFromKey(firstItem.date));
      setCalendarForm(firstItem);
      setCalendarMode("edit");
    }

    newItems.forEach((item) => void postAtlasRecord("calendar", item));
  }

  function createWorkOrderFromCalendarItem(item?: CalendarItem) {
    const source = item ?? calendarForm;
    if (!source.title.trim()) return;

    const matchingAsset =
      assetRecords.find((asset) => source.area.toLowerCase().includes(getLocationName(asset.locationId).toLowerCase())) ??
      assetRecords.find((asset) => source.title.toLowerCase().includes(asset.name.toLowerCase())) ??
      assetRecords[0];

    const workOrder: ServiceRecord = normalizeService({
      id: uid("service-cal"),
      assetId: matchingAsset?.id ?? "",
      vendorId: "",
      procedureId: "",
      date: source.date || todayKey,
      title: source.title,
      status: source.status === "Completed" ? "Completed" : "Open",
      notes: `Created from calendar item for ${source.area || "General"}.`,
      followUpDate: "",
      photos: [],
      documents: [],
    });

    setServiceRecords((current) => sortServices([workOrder, ...current]));
    setSelectedServiceId(workOrder.id);
    setServiceForm(workOrder);
    setServiceMode("edit");
    setScreen("history");
    void postAtlasRecord("work_orders", workOrder);
  }

  function deleteAssetPhoto(photoId: string) {
    setPhotos((current) => current.filter((item) => item.id !== photoId));
    void deleteAtlasRecord("asset_photos", photoId);
  }

  function assistantSetAnswer(answer: string, results: SearchResult[] = []) {
    setAssistantAnswer(answer);
    setAssistantResults(results.slice(0, 10));
  }

  function buildAssistantIndex(): SearchResult[] {
    const assetPhotoResults: SearchResult[] = photos.map((photo) => ({
      id: `photo-${photo.id}`,
      type: "Document" as const,
      title: photo.name,
      subtitle: `Asset photo · ${assetName(photo.assetId)}`,
      detail: `Photo attached to ${assetName(photo.assetId)}. Uploaded ${new Date(photo.createdAt).toLocaleString()}.`,
      screen: "documents" as const,
      assetId: photo.assetId,
      attachmentKind: "asset-photo" as const,
      attachmentId: photo.id,
      dataUrl: photo.dataUrl,
      downloadName: photo.name,
    }));

    const assetDocumentResults: SearchResult[] = assetRecords.flatMap((asset) =>
      (asset.documents ?? []).map((document) => ({
        id: `asset-doc-${asset.id}-${document.id}`,
        type: "Document" as const,
        title: document.name,
        subtitle: `Asset document · ${asset.name}`,
        detail: `${document.type || "File"}. Attached to ${asset.name}. Uploaded ${new Date(document.createdAt).toLocaleString()}.`,
        screen: "documents" as const,
        assetId: asset.id,
        attachmentKind: "asset-document" as const,
        attachmentId: document.id,
        dataUrl: document.dataUrl,
        downloadName: document.name,
      }))
    );

    const vendorDocumentResults: SearchResult[] = vendorRecords.flatMap((vendor) =>
      (vendor.documents ?? []).map((document) => ({
        id: `vendor-doc-${vendor.id}-${document.id}`,
        type: "Document" as const,
        title: document.name,
        subtitle: `Vendor document · ${vendor.name}`,
        detail: `${document.type || "File"}. Attached to ${vendor.name}. Uploaded ${new Date(document.createdAt).toLocaleString()}.`,
        screen: "documents" as const,
        vendorId: vendor.id,
        attachmentKind: "vendor-document" as const,
        attachmentId: document.id,
        dataUrl: document.dataUrl,
        downloadName: document.name,
      }))
    );

    const serviceAttachmentResults: SearchResult[] = serviceRecords.flatMap((record) => [
      ...(record.photos ?? []).map((photo) => ({
        id: `work-photo-${record.id}-${photo.id}`,
        type: "Document" as const,
        title: photo.name,
        subtitle: `Work-order photo · ${record.title}`,
        detail: `${photo.type || "Photo"}. Attached to ${record.title}. Asset: ${assetName(record.assetId)}. Vendor: ${vendorName(record.vendorId)}. Uploaded ${new Date(photo.createdAt).toLocaleString()}.`,
        screen: "history" as const,
        serviceId: record.id,
        assetId: record.assetId,
        vendorId: record.vendorId,
        attachmentKind: "work-order-photo" as const,
        attachmentId: photo.id,
        dataUrl: photo.dataUrl,
        downloadName: photo.name,
      })),
      ...(record.documents ?? []).map((document) => ({
        id: `work-doc-${record.id}-${document.id}`,
        type: "Document" as const,
        title: document.name,
        subtitle: `Work-order document · ${record.title}`,
        detail: `${document.type || "File"}. Attached to ${record.title}. Asset: ${assetName(record.assetId)}. Vendor: ${vendorName(record.vendorId)}. Uploaded ${new Date(document.createdAt).toLocaleString()}.`,
        screen: "history" as const,
        serviceId: record.id,
        assetId: record.assetId,
        vendorId: record.vendorId,
        attachmentKind: "work-order-document" as const,
        attachmentId: document.id,
        dataUrl: document.dataUrl,
        downloadName: document.name,
      })),
    ]);

    const mapPhotoResults: SearchResult[] = mapLabels.flatMap((label) =>
      (label.photos ?? []).map((photo) => ({
        id: `map-photo-${label.id}-${photo.id}`,
        type: "Document" as const,
        title: photo.name,
        subtitle: `Map photo · ${label.label}`,
        detail: `${photo.type || "Photo"}. Attached to map label ${label.label}. Uploaded ${new Date(photo.createdAt).toLocaleString()}.`,
        screen: "map" as const,
        mapLabelId: label.id,
        attachmentKind: "map-photo" as const,
        attachmentId: photo.id,
        dataUrl: photo.dataUrl,
        downloadName: photo.name,
      }))
    );

    const publicDocResults: SearchResult[] = publicDocs.map((document) => {
      const candidate = publicDocCandidates.find((item) => item.href === document.href);

      return {
        id: `known-public-doc-${document.id}`,
        type: "Document" as const,
        title: document.name,
        subtitle: `Verified public/docs file · ${document.type}`,
        detail: `${candidate?.searchText ?? "public docs file"}. Verified path: ${document.href}.`,
        screen: "documents" as const,
        attachmentKind: "static-document" as const,
        dataUrl: document.href,
        downloadName: document.name,
      };
    });

    return [
      ...locations.map((location) => ({ id: `location-${location.id}`, type: "Location" as const, title: location.name, subtitle: `${location.zone} · ${location.type}`, detail: location.notes, screen: "locations" as const })),
      ...mapLabels.map((label) => ({ id: `map-label-${label.id}`, type: "Map Label" as const, title: label.label, subtitle: `${label.category} · ${Math.round(label.x)}% / ${Math.round(label.y)}%`, detail: `${label.notes} ${(label.photos ?? []).map((photo) => photo.name).join(" ")}`, screen: "map" as const })),
      ...assetRecords.map((asset) => ({ id: `asset-${asset.id}`, type: "Asset" as const, title: asset.name, subtitle: `${getLocationName(asset.locationId)} · ${asset.category}`, detail: [asset.status, asset.make, asset.model, asset.serial, asset.notes, asset.vendorIds.map(vendorName).join(" "), (asset.documents ?? []).map((document) => document.name).join(" "), photos.filter((photo) => photo.assetId === asset.id).map((photo) => photo.name).join(" ")].filter(Boolean).join(" · "), screen: "assets" as const, assetId: asset.id })),
      ...vendorRecords.map((vendor) => ({ id: `vendor-${vendor.id}`, type: "Vendor" as const, title: vendor.name, subtitle: vendor.category, detail: [vendor.phone, vendor.email, vendor.website, vendor.notes, (vendor.documents ?? []).map((document) => document.name).join(" ")].filter(Boolean).join(" · "), screen: "vendors" as const, vendorId: vendor.id })),
      ...serviceRecords.map((record) => ({ id: `service-${record.id}`, type: "Work Order" as const, title: record.title, subtitle: `${formatDate(record.date)} · ${assetName(record.assetId)} · ${vendorName(record.vendorId)} · ${record.status}`, detail: [record.notes, record.followUpDate ? `Follow-up ${formatDate(record.followUpDate)}` : "", procedureName(record.procedureId), (record.photos ?? []).map((photo) => photo.name).join(" "), (record.documents ?? []).map((document) => document.name).join(" ")].filter(Boolean).join(" · "), screen: "history" as const, serviceId: record.id, assetId: record.assetId, vendorId: record.vendorId })),
      ...calendarItems.map((item) => ({ id: `calendar-${item.id}`, type: "Calendar" as const, title: item.title, subtitle: `${formatDate(item.date)} · ${item.area} · ${item.status}`, detail: `${item.title} ${item.area} ${item.status} ${formatDate(item.date)}`, screen: "calendar" as const, calendarId: item.id })),
      ...documents.map((document) => {
        const verifiedDoc = findVerifiedPublicDoc(document.href, publicDocs);

        return {
          id: `document-${document.id}`,
          type: "Document" as const,
          title: document.title,
          subtitle: `${document.area} · ${document.type}${document.linkedAssetId ? ` · ${assetName(document.linkedAssetId)}` : ""}`,
          detail: verifiedDoc ? `${document.notes} Verified file path: ${verifiedDoc.href}` : document.href ? `${document.notes} Expected file was not found at ${document.href}. Rename the file in public/docs to match this exactly, or upload the file to the related Atlas record.` : `${document.notes} Reference only until the actual file/photo is uploaded.`,
          screen: "documents" as const,
          assetId: document.linkedAssetId,
          attachmentKind: "static-document" as const,
          dataUrl: verifiedDoc?.href,
          downloadName: verifiedDoc?.name,
        };
      }),
      ...procedureRecords.map((procedure) => ({ id: `procedure-${procedure.id}`, type: "Procedure" as const, title: procedure.title, subtitle: `${procedure.area} · ${procedure.priority}`, detail: procedure.steps.join(" "), screen: "procedures" as const, procedureId: procedure.id })),
      ...partRecords.map((part) => ({ id: `assistant-part-${part.id}`, type: "Part" as const, title: part.name, subtitle: `${part.category} · ${part.status} · Qty ${part.quantity} ${part.unit}`, detail: `${getLocationName(part.locationId)} · ${assetName(part.assetId || "")} · ${vendorName(part.vendorId)} · Part # ${part.partNumber || "n/a"}. SKU ${part.sku || "n/a"}. ${part.notes}`, screen: "parts" as const, partId: part.id, assetId: part.assetId, vendorId: part.vendorId })),
      ...publicDocResults,
      ...assetPhotoResults,
      ...assetDocumentResults,
      ...vendorDocumentResults,
      ...serviceAttachmentResults,
      ...mapPhotoResults,
    ];
  }

  function findAssistantResults(text: string, limit = 8) {
    const stopWords = new Set(["show", "what", "when", "where", "who", "does", "have", "with", "about", "atlas", "the", "and", "for", "are", "is", "me", "my", "all", "any", "to", "of", "in", "on", "we", "need", "needs", "do", "done", "from"]);
    const terms = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2 && !stopWords.has(term));

    if (!terms.length) return [];

    return buildAssistantIndex()
      .map((result) => {
        const haystack = [result.type, result.title, result.subtitle, result.detail].join(" ").toLowerCase();
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { result, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
      .map(({ result }) => result)
      .slice(0, limit);
  }

  function summarizeResults(results: SearchResult[], emptyText: string) {
    if (!results.length) return emptyText;
    return results.map((result) => `${result.type}: ${result.title}\n${result.subtitle}\n${result.detail}`).join("\n\n");
  }

  function askAtlas(question: string) {
    const text = question.trim().toLowerCase();

    if (!text) {
      assistantSetAnswer("Type a question first, then Ask Atlas.", []);
      return;
    }

    const today = dateFromKey(todayKey);
    const nextSevenDays = new Date(today);
    nextSevenDays.setDate(today.getDate() + 7);

    const openWorkOrders = sortServices(serviceRecords.filter((record) => record.status !== "Completed"));
    const doneWorkOrders = sortServices(serviceRecords.filter((record) => record.status === "Completed"));
    const overdueWorkOrders = openWorkOrders.filter((record) => record.date < todayKey);
    const weekWorkOrders = openWorkOrders.filter((record) => {
      const date = dateFromKey(record.followUpDate || record.date);
      return date >= today && date <= nextSevenDays;
    });
    const weekCalendar = sortCalendar(calendarItems.filter((item) => {
      const date = dateFromKey(item.date);
      return item.status !== "Completed" && date >= today && date <= nextSevenDays;
    }));

    if (text.includes("database") || text.includes("neon") || text.includes("save") || text.includes("connected")) {
      assistantSetAnswer(`Atlas is connected to Neon. Current status: ${databaseStatus}.\n\nRecord counts: ${assetRecords.length} assets, ${vendorRecords.length} vendors, ${serviceRecords.length} work orders, ${calendarItems.length} calendar items, ${procedureRecords.length} procedures, ${photos.length} asset photos, ${uploadedDocumentCount} uploaded documents, and ${partRecords.length} parts / inventory items.`, []);
      return;
    }

    if (text.includes("this week") || text.includes("next 7") || text.includes("needs to be done") || text.includes("what needs") || text.includes("upcoming")) {
      const results: SearchResult[] = [
        ...weekWorkOrders.map((record) => ({ id: `assistant-week-service-${record.id}`, type: "Work Order" as const, title: record.title, subtitle: `${formatDate(record.followUpDate || record.date)} · ${assetName(record.assetId)} · ${record.status}`, detail: record.notes, screen: "history" as const, serviceId: record.id, assetId: record.assetId, vendorId: record.vendorId })),
        ...weekCalendar.map((item) => ({ id: `assistant-week-calendar-${item.id}`, type: "Calendar" as const, title: item.title, subtitle: `${formatDate(item.date)} · ${item.area} · ${item.status}`, detail: `Scheduled calendar item for ${item.area}.`, screen: "calendar" as const, calendarId: item.id })),
      ];
      assistantSetAnswer(results.length ? `This week has ${weekWorkOrders.length} open work order(s) and ${weekCalendar.length} active calendar item(s). Click any result below to open it.` : "No open work orders or active calendar items are scheduled in the next 7 days.", results);
      return;
    }

    if (text.includes("overdue") || text.includes("late") || text.includes("past due")) {
      const results = overdueWorkOrders.map((record) => ({ id: `assistant-overdue-${record.id}`, type: "Work Order" as const, title: record.title, subtitle: `${formatDate(record.date)} · ${assetName(record.assetId)} · ${record.status}`, detail: record.notes, screen: "history" as const, serviceId: record.id, assetId: record.assetId, vendorId: record.vendorId }));
      assistantSetAnswer(results.length ? `${results.length} work order(s) look overdue based on the work date. Click below to open them.` : "No overdue open work orders found.", results);
      return;
    }

    if (text.includes("done") || text.includes("completed")) {
      const results = doneWorkOrders.slice(0, 10).map((record) => ({ id: `assistant-done-${record.id}`, type: "Work Order" as const, title: record.title, subtitle: `${formatDate(record.date)} · ${assetName(record.assetId)} · Completed`, detail: record.notes, screen: "history" as const, serviceId: record.id, assetId: record.assetId, vendorId: record.vendorId }));
      assistantSetAnswer(results.length ? `Showing the latest ${results.length} completed work order(s).` : "No completed work orders found yet.", results);
      return;
    }

    if (text.includes("part") || text.includes("parts") || text.includes("inventory") || text.includes("reorder") || text.includes("stock") || text.includes("supplies") || text.includes("supply")) {
      const results = findAssistantResults(text, 10).filter((result) => result.type === "Part" || result.screen === "parts");
      assistantSetAnswer(results.length ? `Atlas found ${results.length} parts / inventory match(es). Click a result to open it.` : `Atlas is tracking ${partRecords.length} parts / supplies. ${lowPartRecords.length} need attention. Try asking for pool supplies, spa filters, irrigation parts, dock parts, or low stock.`, results);
      return;
    }

    if (text.includes("photo") || text.includes("picture") || text.includes("document") || text.includes("documents") || text.includes("doc") || text.includes("docs") || text.includes("invoice") || text.includes("file")) {
      const results = findAssistantResults(text, 24).filter((result) => result.type === "Document");
      const viewableCount = results.filter((result) => Boolean(result.dataUrl)).length;
      const referenceCount = results.length - viewableCount;

      assistantSetAnswer(
        results.length
          ? `I found ${results.length} photo/document result(s). ${viewableCount} have a View button. ${referenceCount} are reference records. Public docs status: ${publicDocsStatus}.`
          : `I did not find matching photos or documents yet. Public docs status: ${publicDocsStatus}. Uploaded files will show View/Download/Delete buttons here.`,
        results
      );
      return;
    }

    if (text.includes("work order") || text.includes("service") || text.includes("history")) {
      const results = findAssistantResults(text, 10).filter((result) => result.type === "Work Order");
      assistantSetAnswer(results.length ? `Atlas found ${results.length} work order match(es). Click a result to open it.` : `Atlas has ${serviceRecords.length} work orders. Try asking for a specific asset, vendor, area, overdue work, completed work, or this week.`, results);
      return;
    }

    if (text.includes("calendar") || text.includes("schedule") || text.includes("scheduled") || text.includes("vendor visit")) {
      const results = findAssistantResults(text, 10).filter((result) => result.type === "Calendar");
      assistantSetAnswer(results.length ? `Atlas found ${results.length} calendar match(es). Click a result to open it.` : `Atlas has ${calendarItems.length} calendar items. Try asking “what needs to be done this week” or search a specific area.`, results);
      return;
    }

    if (text.includes("vendor") || text.includes("contact") || text.includes("who handles")) {
      const results = findAssistantResults(text, 10).filter((result) => result.type === "Vendor" || result.type === "Asset" || result.type === "Work Order");
      assistantSetAnswer(results.length ? `Atlas found ${results.length} vendor/contact-related match(es). Click a result to open it.` : `Atlas has ${vendorRecords.length} vendor records. Try the company name, category, asset, or area.`, results);
      return;
    }

    if (text.includes("asset") || text.includes("equipment")) {
      const results = findAssistantResults(text, 10).filter((result) => result.type === "Asset");
      assistantSetAnswer(results.length ? `Atlas found ${results.length} asset match(es). Click a result to open it.` : `Atlas has ${assetRecords.length} asset records. Try a specific asset name, room, make, model, or serial.`, results);
      return;
    }

    if (text.includes("procedure") || text.includes("process") || text.includes("how to")) {
      const results = findAssistantResults(text, 10).filter((result) => result.type === "Procedure");
      assistantSetAnswer(results.length ? `Atlas found ${results.length} procedure match(es). Click a result to open it.` : `Atlas has ${procedureRecords.length} procedures. Try pool, spa, boiler, dock, vendor intake, or another area.`, results);
      return;
    }

    if (text.includes("boiler") || text.includes("viessmann") || text.includes("vitodens") || text.includes("b-2")) {
      const results = findAssistantResults("boiler viessmann vitodens b-2 guarddog mechanical", 10);
      assistantSetAnswer("Atlas found the boiler records in the Mechanical Room. Boiler B-1 is a Viessmann Vitodens 200. Boiler B-2 is a Viessmann Vitodens 200 with serial 758960507593 and year built 2025. The boiler safety record includes the McDonnell & Miller GuardDog 751P-MT-120 low-water cut-off. Click a result below to open the matching record.", results);
      return;
    }

    if (text.includes("pool") || text.includes("backwash") || text.includes("pentair") || text.includes("triton")) {
      const results = findAssistantResults("pool pentair triton backwash uv ozone pool equipment", 10);
      assistantSetAnswer("Atlas found the pool records. Pool chain: Pool/Spa source → Pentair 3.0 HP pump → Triton II sand filter → UltraPure / Paramount UV2 UV-ozone → return to pool. Click a result below to open the matching record.", results);
      return;
    }

    if (text.includes("spa") || text.includes("hot tub") || text.includes("sundance")) {
      const results = findAssistantResults("sundance optima spa hot tub clearray hydroquip", 10);
      assistantSetAnswer("Atlas found the standalone spa record. It is a Sundance 880-series Optima, model OPTIMA, serial 00P3LCD-100528521-0315. Click a result below to open the matching record.", results);
      return;
    }

    if (text.includes("sunstream") || text.includes("lift") || text.includes("cobalt") || text.includes("seadoo") || text.includes("dock")) {
      const results = findAssistantResults("sunstream lift cobalt seadoo dock", 10);
      assistantSetAnswer("Atlas found the dock lift records. Cobalt uses the larger/newer Sunstream lift box. SeaDoo and the additional dock lift have separate Sunstream box records. Click a result below to open the matching record.", results);
      return;
    }

    const results = findAssistantResults(text, 10);

    if (!results.length) {
      assistantSetAnswer("I did not find that in the local Atlas records yet. Add a work order, procedure, calendar item, photo, document, vendor, or asset record, then Ask Atlas will be able to surface it here.", []);
      return;
    }

    assistantSetAnswer(summarizeResults(results.slice(0, 5), "No results."), results);
  }

  function renderGlobalSearchResults() {
    if (!q) return null;

    return (
      <SectionShell eyebrow="Global Search" title={`Results for "${query.trim()}"`} right={<button type="button" onClick={() => setQuery("")} style={primaryButtonStyle}>Clear Search</button>}>
        {searchResults.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {searchResults.map((result) => (
              <button key={result.id} type="button" onClick={() => openSearchResult(result)} style={searchResultStyle}>
                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, textTransform: "uppercase" }}>{result.type}</div>
                    <div style={{ color: colors.navy, fontWeight: 950, fontSize: 16, marginTop: 4 }}>{result.title}</div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{result.subtitle}</div>
                  </div>
                  <span style={openPillStyle}>Open</span>
                </div>
                <p style={clampedTextStyle}>{result.detail}</p>
              </button>
            ))}
          </div>
        ) : (
          <div style={emptyStateStyle}>No matching Atlas records found yet.</div>
        )}
      </SectionShell>
    );
  }

  function openDashboardWorkOrders(activeOnly = false) {
    setScreen("history");
    setWorkOrderTab(activeOnly ? "todo" : workOrderTab);
    setWorkOrderStatusFilter("all");
    setWorkOrderLocationFilter("all");
    setWorkOrderAssetFilter("all");
    setWorkOrderSort("priority");

    const firstRecord = sortWorkOrderBoardRecords(serviceRecords.filter((record) => (activeOnly ? record.status !== "Completed" : true)), "priority")[0];
    if (firstRecord) openServiceRecord(firstRecord);
  }

  function openDashboardMonitor() {
    setScreen("history");
    setWorkOrderTab("todo");
    setWorkOrderStatusFilter("all");
    setWorkOrderLocationFilter("all");
    setWorkOrderAssetFilter("all");
    setWorkOrderSort("priority");

    const firstRecord = sortWorkOrderBoardRecords(serviceRecords.filter((record) => record.status !== "Completed"), "priority")[0];
    if (firstRecord) openServiceRecord(firstRecord);
  }

  function startDashboardCreate(kind: "work-order" | "asset" | "vendor" | "procedure" | "calendar" | "part" | "photo-doc" | "map-label") {
    if (kind === "work-order") {
      startNewService();
      setWorkOrderTab("todo");
      setScreen("history");
      return;
    }

    if (kind === "asset") {
      startNewAsset();
      setScreen("assets");
      return;
    }

    if (kind === "vendor") {
      startNewVendor();
      setScreen("vendors");
      return;
    }

    if (kind === "procedure") {
      startNewProcedure();
      setScreen("procedures");
      return;
    }

    if (kind === "calendar") {
      startNewCalendarItem(todayKey);
      setScreen("calendar");
      return;
    }

    if (kind === "part") {
      startNewPart();
      setScreen("parts");
      return;
    }

    if (kind === "photo-doc") {
      setScreen("documents");
      return;
    }

    startNewMapLabel();
    setScreen("map");
  }

  function renderDashboard() {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <SectionShell
          eyebrow="Command Center"
          title="Create or Open Atlas Records"
          right={<button type="button" onClick={() => startDashboardCreate("work-order")} style={primaryButtonStyle}>Create Work Order</button>}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.95fr", gap: 16, alignItems: "stretch" }}>
            <div style={{ ...heroCardStyle, minHeight: 180 }}>
              <div style={heroOrbStyle} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ color: colors.gold2, fontSize: 12, fontWeight: 950, letterSpacing: 1.1, textTransform: "uppercase" }}>Fast Create</div>
                <h2 style={{ margin: "8px 0 8px", fontSize: 28, letterSpacing: -0.7 }}>What do you need to add?</h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.76)", lineHeight: 1.5 }}>
                  Start from the dashboard, choose the record type, and Atlas opens the right new form.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              <button type="button" onClick={() => startDashboardCreate("work-order")} style={dashboardActionButtonStyle}><strong>Work Order</strong><span>Create task / issue</span></button>
              <button type="button" onClick={() => startDashboardCreate("asset")} style={dashboardActionButtonStyle}><strong>Asset</strong><span>Add equipment</span></button>
              <button type="button" onClick={() => startDashboardCreate("vendor")} style={dashboardActionButtonStyle}><strong>Vendor</strong><span>Add contact/company</span></button>
              <button type="button" onClick={() => startDashboardCreate("procedure")} style={dashboardActionButtonStyle}><strong>Procedure</strong><span>Add checklist</span></button>
              <button type="button" onClick={() => startDashboardCreate("calendar")} style={dashboardActionButtonStyle}><strong>Calendar</strong><span>Schedule work</span></button>
              <button type="button" onClick={() => startDashboardCreate("part")} style={dashboardActionButtonStyle}><strong>Part</strong><span>Add inventory</span></button>
              <button type="button" onClick={() => startDashboardCreate("photo-doc")} style={dashboardActionButtonStyle}><strong>Photo / Doc</strong><span>Attach file</span></button>
              <button type="button" onClick={() => startDashboardCreate("map-label")} style={dashboardActionButtonStyle}><strong>Location</strong><span>Add map label</span></button>
            </div>
          </div>
        </SectionShell>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 16 }}>
          <StatCard label="Assets" value={assetRecords.length} detail="Open asset directory" onClick={() => setScreen("assets")} />
          <StatCard label="Vendors" value={vendorRecords.length} detail="Open vendor directory" onClick={() => setScreen("vendors")} />
          <StatCard label="Work Orders" value={serviceRecords.length} detail="Open work board" onClick={() => openDashboardWorkOrders(false)} />
          <StatCard label="Procedures" value={procedureRecords.length} detail="Open checklists" onClick={() => setScreen("procedures")} />
          <StatCard label="Parts" value={partRecords.length} detail={`${lowPartRecords.length} low / order`} onClick={() => setScreen("parts")} />
          <StatCard label="Scheduled" value={upcomingCalendarCount} detail="Open calendar" onClick={() => setScreen("calendar")} />
          <StatCard label="Open / Monitor" value={openWorkOrderCount + monitorAssetCount} detail="Needs attention" onClick={openDashboardMonitor} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, alignItems: "start" }}>
          <SectionShell
            eyebrow="Database Connected"
            title="Atlas Estate Systems / 2000"
            right={<button type="button" onClick={syncCurrentToDatabase} style={primaryButtonStyle}>Sync to Neon</button>}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <div style={inlineCardStyle}>
                <div style={goldEyebrowStyle}>Database</div>
                <div style={{ color: colors.navy, fontWeight: 950, fontSize: 18, marginTop: 6 }}>{databaseStatus}</div>
                <p style={{ color: colors.muted, margin: "8px 0 0", lineHeight: 1.45 }}>Records save through Neon when available and fall back safely in the browser.</p>
              </div>
              <button type="button" onClick={() => { askAtlas("what needs to be done this week"); setAssistantQuestion("What needs to be done this week?"); setScreen("assistant"); }} style={dashboardMiniButtonStyle}>
                <strong>Ask Atlas</strong>
                <span>Show this week</span>
              </button>
              <button type="button" onClick={syncCurrentToDatabase} style={dashboardMiniButtonStyle}>
                <strong>Sync</strong>
                <span>Push current data</span>
              </button>
            </div>
          </SectionShell>

          <SectionShell eyebrow="Needs Attention" title="Open / Monitor Work">
            <div style={{ display: "grid", gap: 10 }}>
              {sortServices(serviceRecords)
                .filter((item) => item.status !== "Completed")
                .slice(0, 8)
                .map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSelectedServiceId(item.id); setServiceMode("edit"); setScreen("history"); }} style={smallRecordButtonStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <strong style={{ color: colors.navy }}>{item.title}</strong>
                      <span style={badgeStyle(item.status)}>{item.status}</span>
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{formatDate(item.date)} · {assetName(item.assetId)} · {vendorName(item.vendorId)}</div>
                  </button>
                ))}
            </div>
          </SectionShell>
        </div>

        <SectionShell eyebrow="Recently Updated" title="Latest Work Orders">
          <div style={{ display: "grid", gap: 10 }}>
            {sortServices(serviceRecords).slice(0, 7).map((record) => (
              <button key={record.id} type="button" onClick={() => { openServiceRecord(record); setScreen("history"); }} style={{ ...serviceRowStyle, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <div style={{ color: colors.muted, fontWeight: 850 }}>{formatDate(record.date)}</div>
                <div>
                  <div style={{ color: colors.navy, fontWeight: 900 }}>{record.title}</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    {assetName(record.assetId)} · {vendorName(record.vendorId)} · {(record.photos?.length ?? 0) + (record.documents?.length ?? 0)} files
                  </div>
                </div>
                <span style={badgeStyle(record.status)}>{record.status}</span>
              </button>
            ))}
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderMap() {
    const mapPhotoCount = mapLabels.reduce((total, label) => total + (label.photos?.length ?? 0), 0);

    return (
      <SectionShell
        eyebrow="Property Map"
        title="Locked Map with Movable Atlas Labels"
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={badgeStyle("Online")}>{mapLabels.length} Labels</span>
            <button type="button" onClick={startNewMapLabel} style={goldButtonStyle}>Add Label</button>
            <button type="button" onClick={resetMapLabels} style={deleteButtonStyle}>Reset Map</button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 16, alignItems: "start" }}>
          <div>
            <div style={{ ...emptyStateStyle, marginBottom: 12 }}>
              Drag a label to move it. Click a label to edit its name, type, info, and photos. The map image stays locked.
            </div>

            <div ref={mapRef} style={mapShellStyle}>
              <img src="/atlas-property-map.png" alt="Atlas property map" style={mapImageStyle} draggable={false} />

              {mapLabels.map((label) => {
                const isSelected = label.id === selectedMapLabelId;

                return (
                  <button
                    key={label.id}
                    type="button"
                    onPointerDown={(event) => handleMapLabelPointerDown(event, label.id)}
                    style={{
                      ...mapLabelPinStyle,
                      top: `${label.y}%`,
                      left: `${label.x}%`,
                      background: isSelected ? colors.gold : colors.navy,
                      color: isSelected ? colors.navy : "white",
                      borderColor: isSelected ? colors.navy : colors.gold2,
                      zIndex: isSelected ? 4 : 3,
                    }}
                    title="Drag to move. Edit details on the right."
                  >
                    <span style={mapPinDotStyle}>{Math.round(label.x)}/{Math.round(label.y)}</span>
                    {label.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={recordCardStyle}>
              <div style={goldEyebrowStyle}>{mapLabelMode === "new" ? "New Map Label" : "Selected Map Label"}</div>
              <h3 style={{ color: colors.navy, margin: "7px 0 10px" }}>{mapLabelForm.label || selectedMapLabel?.label || "Map Label"}</h3>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={labelStyle}>Label Name<input value={mapLabelForm.label} onChange={(event) => setMapLabelForm((current) => ({ ...current, label: event.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Type / Category<input value={mapLabelForm.category} onChange={(event) => setMapLabelForm((current) => ({ ...current, category: event.target.value }))} style={inputStyle} /></label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={labelStyle}>Left %<input type="number" min="0" max="100" value={Math.round(mapLabelForm.x)} onChange={(event) => setMapLabelForm((current) => ({ ...current, x: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
                  <label style={labelStyle}>Top %<input type="number" min="0" max="100" value={Math.round(mapLabelForm.y)} onChange={(event) => setMapLabelForm((current) => ({ ...current, y: clampPercent(Number(event.target.value)) }))} style={inputStyle} /></label>
                </div>

                <label style={labelStyle}>Info / Notes<textarea value={mapLabelForm.notes} onChange={(event) => setMapLabelForm((current) => ({ ...current, notes: event.target.value }))} style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} /></label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button type="button" onClick={saveMapLabel} style={widePrimaryButtonStyle}>Save Label</button>
                  <button type="button" onClick={deleteMapLabel} style={deleteButtonStyle}>Delete Label</button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQuery(mapLabelForm.label || selectedMapLabel?.label || "");
                    setScreen("locations");
                  }}
                  style={linkButtonStyle}
                >
                  Search Atlas Records for This Label
                </button>
              </div>
            </div>

            <div style={recordCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={goldEyebrowStyle}>Map Photos</div>
                  <h3 style={{ color: colors.navy, margin: "6px 0 0" }}>{(mapLabelForm.photos ?? []).length} on this label</h3>
                </div>
                <span style={badgeStyle("Monitor")}>{mapPhotoCount} Total</span>
              </div>

              <label style={{ ...uploadBoxStyle, marginTop: 12 }}>
                Add Photos to Label
                <input type="file" accept="image/*" multiple onChange={handleMapLabelPhotoUpload} style={{ display: "none" }} />
              </label>

              {(mapLabelForm.photos ?? []).length ? (
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {(mapLabelForm.photos ?? []).map((photo) => (
                    <div key={photo.id} style={inlineCardStyle}>
                      <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 14, marginBottom: 8 }} />
                      <div style={{ color: colors.navy, fontWeight: 950, fontSize: 13, wordBreak: "break-word" }}>{photo.name}</div>
                      <div style={{ color: colors.muted, fontSize: 12, margin: "4px 0 8px" }}>{new Date(photo.createdAt).toLocaleString()}</div>
                      <button type="button" onClick={() => deleteMapLabelPhoto(photo.id)} style={deleteButtonStyle}>Delete Photo</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ ...emptyStateStyle, marginTop: 12 }}>No photos added to this map label yet.</div>
              )}
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  function renderLocations() {
    return (
      <SectionShell eyebrow="Locations" title="2000 Location Baseline">
        <div style={threeColumnGridStyle}>
          {filteredLocations.map((location) => (
            <div key={location.id} style={recordCardStyle}>
              <div style={goldEyebrowStyle}>{location.zone}</div>
              <h3 style={{ margin: "6px 0", color: colors.navy }}>{location.name}</h3>
              <div style={{ color: colors.muted, fontSize: 13, fontWeight: 850 }}>{location.type}</div>
              <p style={{ color: colors.text, fontSize: 14, lineHeight: 1.45 }}>{location.notes}</p>
              <button type="button" onClick={() => { setQuery(location.name); setScreen("assets"); }} style={primaryButtonStyle}>View Related Records</button>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  function renderAssets() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "0.78fr 1.22fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Assets" title="Editable Asset Directory" right={<button type="button" onClick={startNewAsset} style={primaryButtonStyle}>Add Asset</button>}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setAssetMode("edit");
                }}
                style={{
                  ...smallRecordButtonStyle,
                  border: selectedAssetId === asset.id && assetMode === "edit" ? `2px solid ${colors.gold}` : `1px solid ${colors.line}`,
                  background: selectedAssetId === asset.id && assetMode === "edit" ? "#FFF9EA" : "#FBFCFE",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <strong style={{ color: colors.navy }}>{asset.name}</strong>
                  <span style={badgeStyle(asset.status)}>{asset.status}</span>
                </div>
                <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{asset.category} · {getLocationName(asset.locationId)}</div>
                <div style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>{(asset.vendorIds ?? []).length ? asset.vendorIds.map(vendorName).join(", ") : "No vendors assigned"} · {asset.documents?.length ?? 0} docs</div>
              </button>
            ))}
          </div>
        </SectionShell>

        <SectionShell eyebrow={assetMode === "new" ? "New Asset" : "Edit Asset"} title={assetForm.name || "Asset Details"} right={assetMode === "edit" && assetForm.id ? <button type="button" onClick={deleteAsset} style={deleteButtonStyle}>Delete Asset</button> : null}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>Asset Name<input value={assetForm.name} onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))} placeholder="Asset name" style={inputStyle} /></label>
              <label style={labelStyle}>Location<select value={assetForm.locationId} onChange={(event) => setAssetForm((current) => ({ ...current, locationId: event.target.value }))} style={inputStyle}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
              <label style={labelStyle}>Category<input value={assetForm.category} onChange={(event) => setAssetForm((current) => ({ ...current, category: event.target.value }))} placeholder="Example: Boiler" style={inputStyle} /></label>
              <label style={labelStyle}>Status<select value={assetForm.status} onChange={(event) => setAssetForm((current) => ({ ...current, status: event.target.value as Status }))} style={inputStyle}><option value="Online">Online</option><option value="Offline">Offline</option><option value="Seasonal">Seasonal</option><option value="Monitor">Monitor</option></select></label>
              <label style={labelStyle}>Make<input value={assetForm.make ?? ""} onChange={(event) => setAssetForm((current) => ({ ...current, make: event.target.value }))} placeholder="Make" style={inputStyle} /></label>
              <label style={labelStyle}>Model<input value={assetForm.model ?? ""} onChange={(event) => setAssetForm((current) => ({ ...current, model: event.target.value }))} placeholder="Model" style={inputStyle} /></label>
              <label style={labelStyle}>Serial<input value={assetForm.serial ?? ""} onChange={(event) => setAssetForm((current) => ({ ...current, serial: event.target.value }))} placeholder="Serial number" style={inputStyle} /></label>
              <div style={{ ...labelStyle, alignSelf: "end" }}><button type="button" onClick={saveAsset} style={widePrimaryButtonStyle}>Save Asset to Neon</button></div>
            </div>

            <label style={labelStyle}>Notes<textarea value={assetForm.notes} onChange={(event) => setAssetForm((current) => ({ ...current, notes: event.target.value }))} rows={5} placeholder="Asset notes, nameplate info, service reminders, setup details, etc." style={{ ...inputStyle, resize: "vertical" }} /></label>

            <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
              <div><div style={goldEyebrowStyle}>Assigned Vendors</div><div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Check every vendor connected to this asset.</div></div>
              <div style={vendorCheckGridStyle}>
                {sortVendors(vendorRecords).map((vendor) => (
                  <label key={vendor.id} style={vendorCheckStyle}>
                    <input type="checkbox" checked={(assetForm.vendorIds ?? []).includes(vendor.id)} onChange={() => toggleAssetVendor(vendor.id)} />
                    <span><strong style={{ color: colors.navy }}>{vendor.name}</strong><span style={{ color: colors.muted, display: "block", fontSize: 12 }}>{vendor.category}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
              <label style={labelStyle}>Add asset documents<input type="file" multiple onChange={handleAssetDocumentUpload} style={{ color: colors.muted }} /></label>
              {(assetForm.documents ?? []).length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {(assetForm.documents ?? []).map((document) => (
                    <div key={document.id} style={inlineCardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div><div style={{ color: colors.navy, fontWeight: 950 }}>{document.name}</div><div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{document.type || "File"} · {new Date(document.createdAt).toLocaleString()}</div></div>
                        <div style={{ display: "flex", gap: 8 }}><a href={document.dataUrl} download={document.name} style={linkButtonStyle}>Download</a><button type="button" onClick={() => removeAssetDocument(document.id)} style={deleteButtonStyle}>Remove</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={emptyStateStyle}>No asset documents attached yet.</div>}
            </div>

            <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
              {assetMode === "edit" && assetForm.id ? (
                <>
                  <label style={uploadBoxStyle}>Add photos for {assetForm.name}<span style={{ color: colors.muted, fontSize: 13, fontWeight: 600 }}>Asset photos now save through Neon.</span><input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ color: colors.muted }} /></label>
                  {selectedAssetPhotos.length ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                      {selectedAssetPhotos.map((photo) => (
                        <div key={photo.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 16, overflow: "hidden", background: "#FBFCFE" }}>
                          <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: 130, objectFit: "cover" }} />
                          <div style={{ padding: 10 }}><div style={{ color: colors.navy, fontWeight: 900, fontSize: 12 }}>{photo.name}</div><button type="button" onClick={() => deleteAssetPhoto(photo.id)} style={{ ...deleteButtonStyle, marginTop: 8 }}>Delete</button></div>
                        </div>
                      ))}
                    </div>
                  ) : <div style={emptyStateStyle}>No asset photos attached yet.</div>}
                </>
              ) : <div style={emptyStateStyle}>Save this new asset first, then add photos.</div>}
            </div>
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderHistory() {
    const activeWorkOrders = serviceRecords.filter((record) => record.status !== "Completed");
    const completedWorkOrders = serviceRecords.filter((record) => record.status === "Completed");
    const urgentWorkOrders = activeWorkOrders.filter((record) => getWorkOrderPriority(record) === "High");

    const availableWorkOrderLocations = Array.from(
      new Set(
        serviceRecords
          .map((record) => assetRecords.find((asset) => asset.id === record.assetId)?.locationId || "general")
          .filter(Boolean)
      )
    ).sort((a, b) => getLocationName(a).localeCompare(getLocationName(b)));

    const visibleWorkOrders = getVisibleWorkOrdersForBoard();
    const hasSelectedWorkOrder = serviceMode === "edit" && Boolean(serviceForm.id) && serviceRecords.some((record) => record.id === serviceForm.id);
    const selectedWorkOrderPriority = hasSelectedWorkOrder ? getWorkOrderPriority(serviceForm) : "High";
    const selectedWorkOrderNumber = hasSelectedWorkOrder ? getWorkOrderNumber(serviceForm) : "New";
    const selectedAssetExists = Boolean(serviceForm.assetId && assetRecords.some((asset) => asset.id === serviceForm.assetId));
    const detailAssetValue = selectedAssetExists ? serviceForm.assetId : "";
    const currentViewLabel = workOrderTab === "todo" ? "To Do" : "Done";
    const noResultsTitle = workOrderTab === "todo" ? "No To Do work orders match this view." : "No Done work orders match this view.";
    const noResultsDetail = workOrderTab === "todo" ? "Switch to Done, clear filters, or create a new work order." : "Clear filters or switch back to To Do.";

    const boardHeight = "calc(100vh - 190px)";

    const tabStyle = (active: boolean): React.CSSProperties => ({
      border: "none",
      borderBottom: active ? `3px solid ${colors.gold}` : `1px solid ${colors.line}`,
      background: active ? "#FFFFFF" : "#F7FAFD",
      color: active ? colors.navy : colors.muted,
      padding: "13px 10px",
      fontSize: 14,
      fontWeight: 950,
      cursor: "pointer",
    });

    const filterChipStyle: React.CSSProperties = {
      ...inputStyle,
      minHeight: 34,
      borderRadius: 10,
      fontSize: 12,
      padding: "6px 10px",
      background: "#FFFFFF",
    };

    function clearWorkOrderFilters() {
      setWorkOrderStatusFilter("all");
      setWorkOrderLocationFilter("all");
      setWorkOrderAssetFilter("all");
      setWorkOrderSort("priority");
      selectFirstVisibleWorkOrder(workOrderTab, "all", "all", "all", "priority");
    }

    function selectedActionText() {
      if (!hasSelectedWorkOrder) return "Save New Work Order";
      if (serviceForm.status === "Completed") return "Reopen + Save";
      return "Mark This Work Order Done";
    }

    function runPrimaryWorkOrderAction() {
      if (!hasSelectedWorkOrder) {
        saveService();
        return;
      }

      if (serviceForm.status === "Completed") {
        reopenServiceAndSave();
        setWorkOrderTab("todo");
        return;
      }

      markServiceDoneAndSave();
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "390px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        <section style={{ background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 22, boxShadow: "0 14px 35px rgba(11, 30, 51, 0.06)", overflow: "hidden", minHeight: boardHeight }}>
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${colors.line}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, letterSpacing: 1.1, textTransform: "uppercase" }}>Work Orders</div>
              <h2 style={{ margin: "5px 0 0", color: colors.navy, fontSize: 24, lineHeight: 1.1 }}>List</h2>
            </div>
            <button type="button" onClick={startNewService} style={primaryButtonStyle}>New</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <button type="button" onClick={() => changeWorkOrderTab("todo")} style={tabStyle(workOrderTab === "todo")}>• To Do ({activeWorkOrders.length})</button>
            <button type="button" onClick={() => changeWorkOrderTab("done")} style={tabStyle(workOrderTab === "done")}>Done ({completedWorkOrders.length})</button>
          </div>

          <div style={{ padding: 12, borderBottom: `1px solid ${colors.line}`, display: "grid", gap: 9, background: "#FBFCFE" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={workOrderStatusFilter} onChange={(event) => changeWorkOrderStatusFilter(event.target.value as "all" | ServiceStatus)} style={filterChipStyle}>
                <option value="all">Status: All</option>
                <option value="Open">Status: Open</option>
                <option value="Scheduled">Status: Scheduled</option>
                <option value="Monitor">Status: Monitor</option>
                <option value="Completed">Status: Completed</option>
              </select>
              <select value={workOrderSort} onChange={(event) => changeWorkOrderSort(event.target.value as "priority" | "due-asc" | "date-desc" | "asset")} style={filterChipStyle}>
                <option value="priority">Sort: Priority</option>
                <option value="due-asc">Sort: Due Date</option>
                <option value="date-desc">Sort: Newest</option>
                <option value="asset">Sort: Asset</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={workOrderLocationFilter} onChange={(event) => changeWorkOrderLocationFilter(event.target.value)} style={filterChipStyle}>
                <option value="all">Location: All</option>
                {availableWorkOrderLocations.map((locationId) => <option key={locationId} value={locationId}>Location: {getLocationName(locationId)}</option>)}
              </select>
              <select value={workOrderAssetFilter} onChange={(event) => changeWorkOrderAssetFilter(event.target.value)} style={filterChipStyle}>
                <option value="all">Asset: All</option>
                {sortAssets(assetRecords).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ color: colors.muted, fontSize: 12, fontWeight: 850 }}>{currentViewLabel} view · showing {visibleWorkOrders.length} · high priority {urgentWorkOrders.length}</div>
              <button type="button" onClick={clearWorkOrderFilters} style={{ ...linkButtonStyle, padding: "5px 8px" }}>Reset</button>
            </div>
          </div>

          <div style={{ maxHeight: "calc(100vh - 405px)", overflowY: "auto", background: "#FFFFFF" }}>
            {visibleWorkOrders.length ? visibleWorkOrders.map((record) => {
              const priority = getWorkOrderPriority(record);
              const isSelected = selectedServiceId === record.id && serviceMode === "edit";
              const firstPhoto = record.photos?.[0];

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => openServiceRecord(record)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderLeft: isSelected ? `4px solid ${colors.gold}` : "4px solid transparent",
                    borderBottom: `1px solid ${colors.line}`,
                    background: isSelected ? "#FFF9EA" : "#FFFFFF",
                    padding: "12px 12px 12px 9px",
                    display: "grid",
                    gridTemplateColumns: "46px 1fr auto",
                    gap: 10,
                    alignItems: "start",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", background: "#EDF3FF", border: `1px solid ${colors.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: colors.navy, fontWeight: 950, fontSize: 12 }}>
                    {firstPhoto ? <img src={firstPhoto.dataUrl} alt={firstPhoto.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "WO"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: colors.navy, fontWeight: 950, fontSize: 14, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{record.title || "Untitled work order"}</div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Asset: {assetName(record.assetId)}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 7 }}>
                      <span style={{ ...badgeStyle(record.status), padding: "3px 7px", fontSize: 11 }}>{record.status}</span>
                      <span style={{ ...(priority === "High" ? badgeStyle("Seasonal") : priority === "Done" ? badgeStyle("Completed") : badgeStyle("Monitor")), padding: "3px 7px", fontSize: 11 }}>{priority}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: colors.muted, fontSize: 11, fontWeight: 850, whiteSpace: "nowrap" }}>
                    <div style={{ color: colors.gold }}>{getWorkOrderNumber(record)}</div>
                    <div style={{ marginTop: 6 }}>{formatDate(getWorkOrderDueDate(record))}</div>
                    <div style={{ marginTop: 6 }}>{record.photos?.length ?? 0} pics</div>
                  </div>
                </button>
              );
            }) : (
              <div style={{ padding: 16 }}>
                <div style={{ ...emptyStateStyle, textAlign: "left" }}>
                  <div style={{ color: colors.navy, fontWeight: 950 }}>{noResultsTitle}</div>
                  <div style={{ marginTop: 6 }}>{noResultsDetail}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section style={{ background: colors.card, border: `1px solid ${colors.line}`, borderRadius: 22, boxShadow: "0 14px 35px rgba(11, 30, 51, 0.06)", overflow: "hidden", minHeight: boardHeight }}>
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${colors.line}`, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
            <div>
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, letterSpacing: 1.1, textTransform: "uppercase" }}>{hasSelectedWorkOrder ? `Work Order ${selectedWorkOrderNumber}` : "New Work Order"}</div>
              <h2 style={{ margin: "6px 0 0", color: colors.navy, fontSize: 26, lineHeight: 1.12 }}>{hasSelectedWorkOrder ? serviceForm.title || "Work Order Details" : "Create a Work Order"}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <span style={hasSelectedWorkOrder ? badgeStyle(serviceForm.status) : badgeStyle("Open")}>{hasSelectedWorkOrder ? serviceForm.status : "Open"}</span>
                <span style={selectedWorkOrderPriority === "High" ? badgeStyle("Seasonal") : selectedWorkOrderPriority === "Done" ? badgeStyle("Completed") : badgeStyle("Monitor")}>{selectedWorkOrderPriority} Priority</span>
                <span style={openPillStyle}>Due/work date: {formatDate(serviceForm.date || todayKey)}</span>
                <span style={openPillStyle}>{serviceForm.photos?.length ?? 0} photos</span>
                <span style={openPillStyle}>{serviceForm.documents?.length ?? 0} docs</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {hasSelectedWorkOrder ? <button type="button" onClick={runPrimaryWorkOrderAction} style={serviceForm.status === "Completed" ? widePrimaryButtonStyle : goldButtonStyle}>{selectedActionText()}</button> : null}
              <button type="button" onClick={saveService} style={widePrimaryButtonStyle}>{hasSelectedWorkOrder ? "Save" : "Save New"}</button>
              {hasSelectedWorkOrder ? <button type="button" onClick={deleteService} style={deleteButtonStyle}>Delete</button> : null}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 0 }}>
            <div style={{ padding: 20, display: "grid", gap: 16, borderRight: `1px solid ${colors.line}` }}>
              <label style={labelStyle}>Title<input value={serviceForm.title} onChange={(event) => setServiceForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Clean dryer vent" style={inputStyle} /></label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>Work / Created Date<input type="date" value={serviceForm.date || todayKey} onChange={(event) => setServiceForm((current) => ({ ...current, date: event.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Due / Follow-Up Date<input type="date" value={serviceForm.followUpDate ?? ""} onChange={(event) => setServiceForm((current) => ({ ...current, followUpDate: event.target.value }))} style={inputStyle} /></label>
              </div>

              <label style={labelStyle}>Comments / Notes<textarea value={serviceForm.notes} onChange={(event) => setServiceForm((current) => ({ ...current, notes: event.target.value }))} rows={8} placeholder="Write updates, sign-off notes, vendor findings, parts used, costs, and next steps." style={{ ...inputStyle, resize: "vertical" }} /></label>

              <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
                <div style={uploadBoxStyle}>
                  <label style={{ ...labelStyle, margin: 0 }}>Attach work-order photos<input type="file" multiple accept="image/*" onChange={handleServicePhotoUpload} style={{ color: colors.muted }} /></label>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Photos save on this work order after you click Save.</div>
                </div>

                {(serviceForm.photos ?? []).length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {(serviceForm.photos ?? []).map((photo) => (
                      <div key={photo.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 16, overflow: "hidden", background: "#FBFCFE" }}>
                        <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                        <div style={{ padding: 10 }}>
                          <div style={{ color: colors.navy, fontWeight: 900, fontSize: 12 }}>{photo.name}</div>
                          <button type="button" onClick={() => removeServicePhoto(photo.id)} style={{ ...deleteButtonStyle, marginTop: 8 }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={emptyStateStyle}>No photos attached yet.</div>}
              </div>

              <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
                <label style={labelStyle}>Attach invoices / documents<input type="file" multiple onChange={handleServiceDocumentUpload} style={{ color: colors.muted }} /></label>
                {(serviceForm.documents ?? []).length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {(serviceForm.documents ?? []).map((document) => (
                      <div key={document.id} style={inlineCardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div><div style={{ color: colors.navy, fontWeight: 950 }}>{document.name}</div><div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{document.type || "File"} · {new Date(document.createdAt).toLocaleString()}</div></div>
                          <div style={{ display: "flex", gap: 8 }}><a href={document.dataUrl} download={document.name} style={linkButtonStyle}>Download</a><button type="button" onClick={() => removeServiceDocument(document.id)} style={deleteButtonStyle}>Remove</button></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={emptyStateStyle}>No invoices or documents attached yet.</div>}
              </div>
            </div>

            <aside style={{ padding: 20, display: "grid", gap: 14, alignContent: "start", background: "#FBFCFE" }}>
              <div style={inlineCardStyle}>
                <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8 }}>Assignment</div>
                <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                  <label style={labelStyle}>
                    Asset
                    <select value={detailAssetValue} onChange={(event) => setServiceForm((current) => ({ ...current, assetId: event.target.value }))} style={inputStyle}>
                      <option value="">No asset linked / choose asset</option>
                      {sortAssets(assetRecords).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                    </select>
                    {!selectedAssetExists && serviceForm.assetId ? <span style={{ color: colors.red, fontSize: 12, marginTop: 6, display: "block" }}>Saved asset link is old or missing. Choose the correct asset before saving.</span> : null}
                  </label>
                  <label style={labelStyle}>
                    Vendor
                    <select value={serviceForm.vendorId ?? ""} onChange={(event) => setServiceForm((current) => ({ ...current, vendorId: event.target.value }))} style={inputStyle}>
                      <option value="">Internal / Not set</option>
                      {sortVendors(vendorRecords).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    Procedure
                    <select value={serviceForm.procedureId ?? ""} onChange={(event) => setServiceForm((current) => ({ ...current, procedureId: event.target.value }))} style={inputStyle}>
                      <option value="">No procedure linked</option>
                      {sortProcedures(procedureRecords).map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.title}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    Status
                    <select value={serviceForm.status} onChange={(event) => setServiceForm((current) => ({ ...current, status: event.target.value as ServiceStatus }))} style={inputStyle}>
                      <option value="Open">Open</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={inlineCardStyle}>
                <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8 }}>Quick Actions</div>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  <button type="button" onClick={saveService} style={widePrimaryButtonStyle}>{hasSelectedWorkOrder ? "Save Work Order" : "Save New Work Order"}</button>
                  {hasSelectedWorkOrder && serviceForm.status !== "Completed" ? <button type="button" onClick={() => { markServiceDoneAndSave(); }} style={goldButtonStyle}>Mark This Work Order Done</button> : null}
                  {hasSelectedWorkOrder && serviceForm.status === "Completed" ? <button type="button" onClick={() => { reopenServiceAndSave(); setWorkOrderTab("todo"); }} style={widePrimaryButtonStyle}>Reopen Work Order</button> : null}
                  <button type="button" onClick={scheduleServiceFollowUp} disabled={!serviceForm.followUpDate || !serviceForm.title.trim()} style={{ ...widePrimaryButtonStyle, opacity: serviceForm.followUpDate && serviceForm.title.trim() ? 1 : 0.55 }}>Schedule Follow-Up</button>
                </div>
              </div>

              <div style={inlineCardStyle}>
                <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8 }}>Record Info</div>
                <div style={{ display: "grid", gap: 8, marginTop: 12, color: colors.muted, fontSize: 13 }}>
                  <div><strong style={{ color: colors.navy }}>Number:</strong> {selectedWorkOrderNumber}</div>
                  <div><strong style={{ color: colors.navy }}>Asset:</strong> {serviceForm.assetId ? assetName(serviceForm.assetId) : "Not linked"}</div>
                  <div><strong style={{ color: colors.navy }}>Location:</strong> {serviceForm.assetId ? getLocationName(getWorkOrderLocationId(serviceForm)) : "Not linked"}</div>
                  <div><strong style={{ color: colors.navy }}>Vendor:</strong> {vendorName(serviceForm.vendorId)}</div>
                  <div><strong style={{ color: colors.navy }}>Procedure:</strong> {procedureName(serviceForm.procedureId)}</div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  function renderVendors() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Vendors" title="Alphabetical Vendor Directory" right={<button type="button" onClick={startNewVendor} style={primaryButtonStyle}>Add Vendor</button>}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredVendors.map((vendor) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => {
                  setSelectedVendorId(vendor.id);
                  setVendorMode("edit");
                }}
                style={{
                  ...smallRecordButtonStyle,
                  border: selectedVendorId === vendor.id && vendorMode === "edit" ? `2px solid ${colors.gold}` : `1px solid ${colors.line}`,
                  background: selectedVendorId === vendor.id && vendorMode === "edit" ? "#FFF9EA" : "#FBFCFE",
                  display: "grid",
                  gridTemplateColumns: "52px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={vendorLogoBoxStyle}>{vendor.logoDataUrl ? <img src={vendor.logoDataUrl} alt={`${vendor.name} logo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: colors.gold, fontWeight: 950 }}>{vendor.name.slice(0, 1).toUpperCase()}</span>}</div>
                <div>
                  <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>{vendor.category || "General"}</div>
                  <div style={{ color: colors.navy, fontWeight: 950, fontSize: 16, marginTop: 4 }}>{vendor.name}</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{vendor.phone || vendor.email || vendor.website || "No contact info yet"}</div>
                </div>
                <span style={openPillStyle}>{vendor.documents?.length ?? 0} docs</span>
              </button>
            ))}
          </div>
        </SectionShell>

        <SectionShell eyebrow={vendorMode === "new" ? "New Vendor" : "Edit Vendor"} title={vendorForm.name || "Vendor Details"} right={vendorMode === "edit" && vendorForm.id ? <button type="button" onClick={deleteVendor} style={deleteButtonStyle}>Delete Vendor</button> : null}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 16, alignItems: "center" }}>
              <div style={{ ...vendorLogoBoxStyle, width: 92, height: 92, borderRadius: 22 }}>{vendorForm.logoDataUrl ? <img src={vendorForm.logoDataUrl} alt="Vendor logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: colors.gold, fontWeight: 950, fontSize: 30 }}>{(vendorForm.name || "V").slice(0, 1).toUpperCase()}</span>}</div>
              <label style={{ ...labelStyle, margin: 0 }}>Vendor logo / photo<input type="file" accept="image/*" onChange={handleVendorLogoUpload} style={{ color: colors.muted }} /></label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>Name<input value={vendorForm.name} onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))} placeholder="Vendor name" style={inputStyle} /></label>
              <label style={labelStyle}>Category<input value={vendorForm.category} onChange={(event) => setVendorForm((current) => ({ ...current, category: event.target.value }))} placeholder="Example: Plumbing" style={inputStyle} /></label>
              <label style={labelStyle}>Phone<input value={vendorForm.phone ?? ""} onChange={(event) => setVendorForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" style={inputStyle} /></label>
              <label style={labelStyle}>Email<input value={vendorForm.email ?? ""} onChange={(event) => setVendorForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" style={inputStyle} /></label>
            </div>

            <label style={labelStyle}>Website<input value={vendorForm.website ?? ""} onChange={(event) => setVendorForm((current) => ({ ...current, website: event.target.value }))} placeholder="Website / portal link" style={inputStyle} /></label>
            <label style={labelStyle}>Notes<textarea value={vendorForm.notes} onChange={(event) => setVendorForm((current) => ({ ...current, notes: event.target.value }))} rows={5} placeholder="Vendor notes, contact details, service history reminders, account notes, etc." style={{ ...inputStyle, resize: "vertical" }} /></label>
            <button type="button" onClick={saveVendor} style={widePrimaryButtonStyle}>Save Vendor to Neon</button>

            <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
              <label style={labelStyle}>Add vendor documents<input type="file" multiple onChange={handleVendorDocumentUpload} style={{ color: colors.muted }} /></label>
              {(vendorForm.documents ?? []).length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {(vendorForm.documents ?? []).map((document) => (
                    <div key={document.id} style={inlineCardStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <div><div style={{ color: colors.navy, fontWeight: 950 }}>{document.name}</div><div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{document.type || "File"} · {new Date(document.createdAt).toLocaleString()}</div></div>
                        <div style={{ display: "flex", gap: 8 }}><a href={document.dataUrl} download={document.name} style={linkButtonStyle}>Download</a><button type="button" onClick={() => removeVendorDocument(document.id)} style={deleteButtonStyle}>Remove</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={emptyStateStyle}>No vendor documents attached yet.</div>}
            </div>
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderCalendar() {
    const monthDays = getCalendarMonthDays(calendarCursor);
    const selectedDateItems = sortCalendar(calendarItems.filter((item) => item.date === selectedCalendarDate));
    const selectedDateLabel = formatDate(selectedCalendarDate);
    const today = dateFromKey(todayKey);
    const nextSevenDays = new Date(today);
    nextSevenDays.setDate(today.getDate() + 7);
    const nextThirtyDays = new Date(today);
    nextThirtyDays.setDate(today.getDate() + 30);

    const activeCalendarItems = sortCalendar(calendarItems.filter((item) => item.status !== "Completed"));
    const thisWeekItems = activeCalendarItems.filter((item) => {
      const date = dateFromKey(item.date);
      return date >= today && date <= nextSevenDays;
    });
    const upcomingItems = activeCalendarItems.filter((item) => {
      const date = dateFromKey(item.date);
      return date > nextSevenDays && date <= nextThirtyDays;
    });
    const completedThisMonth = calendarItems.filter((item) => item.status === "Completed" && dateFromKey(item.date).getMonth() === calendarCursor.getMonth() && dateFromKey(item.date).getFullYear() === calendarCursor.getFullYear()).length;
    const selectedDayOpenCount = selectedDateItems.filter((item) => item.status !== "Completed").length;

    const calendarQuickAdds = [
      { title: "Pool / spa check", area: "Pool Equipment Room", offset: 0 },
      { title: "Irrigation walk", area: "Irrigation", offset: 1 },
      { title: "Grounds cleanup", area: "Grounds", offset: 0 },
      { title: "Vendor visit", area: "General", offset: 0 },
      { title: "Dock / lift check", area: "Dock", offset: 2 },
    ];

    const routineSeries = [
      { label: "Trash Mondays", title: "Trash / recycle / yard waste reset", area: "General", offset: 1 },
      { label: "Weekly Weeding", title: "Peter Clark crew weekly weeding", area: "Grounds", offset: 1 },
      { label: "Pool Weekly", title: "Weekly pool / spa check", area: "Pool Equipment Room", offset: 0 },
      { label: "Irrigation Weekly", title: "Weekly irrigation walk", area: "Irrigation", offset: 1 },
    ];

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <StatCard label="Today" value={calendarItems.filter((item) => item.date === todayKey).length} detail="items scheduled today" />
          <StatCard label="This Week" value={thisWeekItems.length} detail="open / scheduled items" />
          <StatCard label="Selected Day" value={selectedDayOpenCount} detail={`${selectedDateLabel} active items`} />
          <StatCard label="Done This Month" value={completedThisMonth} detail="completed calendar items" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.28fr 0.72fr", gap: 18, alignItems: "start" }}>
          <SectionShell
            eyebrow="Calendar"
            title={calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => startNewCalendarItem(selectedCalendarDate)} style={primaryButtonStyle}>Add Event</button>
                <button type="button" onClick={() => createWorkOrderFromCalendarItem()} style={goldButtonStyle}>Make Work Order</button>
              </div>
            }
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ ...calendarToolbarStyle, gridTemplateColumns: "repeat(7, auto)" }}>
                <button type="button" onClick={() => setCalendarCursor((current) => addYearsToDate(current, -1))} style={calendarNavButtonStyle}>‹ Year</button>
                <button type="button" onClick={() => setCalendarCursor((current) => addMonthsToDate(current, -1))} style={calendarNavButtonStyle}>‹ Month</button>
                <button type="button" onClick={() => { const now = new Date(); const key = dateKeyFromDate(now); setCalendarCursor(now); setSelectedCalendarDate(key); setCalendarMode("new"); setCalendarForm(blankCalendarItem(key)); setSelectedCalendarId(""); }} style={goldButtonStyle}>Today</button>
                <button type="button" onClick={() => setCalendarCursor((current) => addMonthsToDate(current, 1))} style={calendarNavButtonStyle}>Month ›</button>
                <button type="button" onClick={() => setCalendarCursor((current) => addYearsToDate(current, 1))} style={calendarNavButtonStyle}>Year ›</button>
                <select value={calendarCursor.getMonth()} onChange={(event) => setCalendarCursor(new Date(calendarCursor.getFullYear(), Number(event.target.value), 1, 12))} style={{ ...inputStyle, padding: "9px 10px" }}>
                  {Array.from({ length: 12 }, (_, monthIndex) => <option key={monthIndex} value={monthIndex}>{new Date(2026, monthIndex, 1).toLocaleDateString(undefined, { month: "long" })}</option>)}
                </select>
                <input type="number" value={calendarCursor.getFullYear()} onChange={(event) => { const year = Number(event.target.value); if (Number.isFinite(year) && year > 1900 && year < 2300) setCalendarCursor(new Date(year, calendarCursor.getMonth(), 1, 12)); }} style={{ ...inputStyle, padding: "9px 10px", width: 110 }} />
              </div>

              <div style={{ ...inlineCardStyle, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={goldEyebrowStyle}>Fast Scheduling</div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Add common 2000 routines without opening a separate form.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {calendarQuickAdds.map((item) => (
                      <button key={item.title} type="button" onClick={() => quickAddCalendarItem(item.title, item.area, item.offset)} style={smallPrimaryButtonStyle}>{item.title}</button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {routineSeries.map((routine) => (
                    <button key={routine.label} type="button" onClick={() => addWeeklyCalendarSeries(routine.title, routine.area, routine.offset, 8)} style={goldButtonStyle}>Add 8 Weeks: {routine.label}</button>
                  ))}
                </div>
              </div>

              <div style={calendarWeekHeaderStyle}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} style={{ color: colors.muted, fontWeight: 950, fontSize: 12, textAlign: "center" }}>{day}</div>)}</div>

              <div style={calendarMonthGridStyle}>
                {monthDays.map((day) => {
                  const dayKey = dateKeyFromDate(day);
                  const isCurrentMonth = day.getMonth() === calendarCursor.getMonth();
                  const isSelected = dayKey === selectedCalendarDate;
                  const isToday = dayKey === todayKey;
                  const itemsForDay = sortCalendar(calendarItems.filter((item) => item.date === dayKey));
                  const hasOpenItems = itemsForDay.some((item) => item.status === "Open" || item.status === "Monitor");

                  return (
                    <div
                      key={dayKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectCalendarDate(dayKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") selectCalendarDate(dayKey);
                      }}
                      style={{
                        ...calendarDayCellStyle,
                        minHeight: 148,
                        opacity: isCurrentMonth ? 1 : 0.42,
                        border: isSelected ? `2px solid ${colors.gold}` : hasOpenItems ? `2px solid ${colors.red}` : isToday ? `2px solid ${colors.navy}` : `1px solid ${colors.line}`,
                        background: isSelected ? "#FFF9EA" : isToday ? "#F3F7FF" : "#FBFCFE",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ color: isToday ? colors.navy : colors.muted, fontWeight: 950 }}>{day.getDate()}</div>
                        {itemsForDay.length ? <div style={{ color: hasOpenItems ? colors.red : colors.gold, fontSize: 12, fontWeight: 950 }}>{itemsForDay.length}</div> : null}
                      </div>

                      <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
                        {itemsForDay.slice(0, 4).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCalendarItem(item);
                            }}
                            style={miniCalendarBadgeStyle(item.status)}
                            title={`${item.title} — ${item.area}`}
                          >
                            {item.title}
                          </button>
                        ))}
                        {itemsForDay.length > 4 ? <div style={{ color: colors.muted, fontSize: 11, fontWeight: 900 }}>+{itemsForDay.length - 4} more</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionShell>

          <div style={{ display: "grid", gap: 18 }}>
            <SectionShell eyebrow="This Week" title="Upcoming Work">
              <div style={{ display: "grid", gap: 10 }}>
                {thisWeekItems.length ? thisWeekItems.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openCalendarItem(item)}
                    style={{ ...smallRecordButtonStyle, border: selectedCalendarId === item.id && calendarMode === "edit" ? `2px solid ${colors.gold}` : `1px solid ${colors.line}`, background: selectedCalendarId === item.id && calendarMode === "edit" ? "#FFF9EA" : "#FBFCFE" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong style={{ color: colors.navy }}>{item.title}</strong>
                      <span style={badgeStyle(item.status)}>{item.status}</span>
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{formatDate(item.date)} · {item.area}</div>
                  </button>
                )) : <div style={emptyStateStyle}>No open work in the next 7 days.</div>}
              </div>
            </SectionShell>

            <SectionShell eyebrow="Selected Day" title={selectedDateLabel} right={<button type="button" onClick={() => startNewCalendarItem(selectedCalendarDate)} style={primaryButtonStyle}>Add</button>}>
              <div style={{ display: "grid", gap: 10 }}>
                {selectedDateItems.length ? selectedDateItems.map((item) => (
                  <div key={item.id} style={{ ...inlineCardStyle, display: "grid", gap: 10, border: selectedCalendarId === item.id && calendarMode === "edit" ? `2px solid ${colors.gold}` : `1px solid ${colors.line}` }}>
                    <button
                      type="button"
                      onClick={() => openCalendarItem(item)}
                      style={{ all: "unset", cursor: "pointer", display: "grid", gap: 6 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                        <strong style={{ color: colors.navy }}>{item.title}</strong>
                        <span style={badgeStyle(item.status)}>{item.status}</span>
                      </div>
                      <div style={{ color: colors.muted, fontSize: 13 }}>{item.area}</div>
                    </button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {item.status !== "Completed" ? <button type="button" onClick={() => markCalendarCompleted(item.id)} style={goldButtonStyle}>Done</button> : <button type="button" onClick={() => reopenCalendarItem(item.id)} style={smallPrimaryButtonStyle}>Reopen</button>}
                      <button type="button" onClick={() => createWorkOrderFromCalendarItem(item)} style={smallPrimaryButtonStyle}>Make Work Order</button>
                    </div>
                  </div>
                )) : <div style={emptyStateStyle}>No work scheduled for this day. Click Add Event or use Fast Scheduling.</div>}
              </div>
            </SectionShell>

            <SectionShell eyebrow="Details" title={calendarForm.title || "Calendar Item"} right={calendarMode === "edit" && calendarForm.id ? <button type="button" onClick={deleteCalendarItem} style={deleteButtonStyle}>Delete</button> : null}>
              <div style={{ display: "grid", gap: 14 }}>
                <label style={labelStyle}>Work Title<input value={calendarForm.title} onChange={(event) => setCalendarForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Backwash pool filter" style={inputStyle} /></label>
                <label style={labelStyle}>Date<input type="date" value={calendarForm.date} onChange={(event) => { const nextDate = event.target.value; setCalendarForm((current) => ({ ...current, date: nextDate })); setSelectedCalendarDate(nextDate); setCalendarCursor(dateFromKey(nextDate)); }} style={inputStyle} /></label>
                <label style={labelStyle}>Status<select value={calendarForm.status} onChange={(event) => setCalendarForm((current) => ({ ...current, status: event.target.value as ServiceStatus }))} style={inputStyle}><option value="Open">Open</option><option value="Scheduled">Scheduled</option><option value="Completed">Completed</option><option value="Monitor">Monitor</option></select></label>
                <label style={labelStyle}>Area / Location<input value={calendarForm.area} onChange={(event) => setCalendarForm((current) => ({ ...current, area: event.target.value }))} placeholder="Example: Pool Equipment Room" style={inputStyle} /></label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button type="button" onClick={saveCalendarItem} style={widePrimaryButtonStyle}>Save</button>
                  <button type="button" onClick={() => createWorkOrderFromCalendarItem()} style={goldButtonStyle}>Create Work Order</button>
                </div>

                {calendarMode === "edit" && calendarForm.id && calendarForm.status !== "Completed" ? <button type="button" onClick={() => markCalendarCompleted(calendarForm.id)} style={goldButtonStyle}>Mark Completed</button> : null}
                {calendarMode === "edit" && calendarForm.id && calendarForm.status === "Completed" ? <button type="button" onClick={() => reopenCalendarItem(calendarForm.id)} style={smallPrimaryButtonStyle}>Reopen</button> : null}
              </div>
            </SectionShell>

            <SectionShell eyebrow="Next 30 Days" title="Later Upcoming">
              <div style={{ display: "grid", gap: 8 }}>
                {upcomingItems.length ? upcomingItems.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => openCalendarItem(item)} style={smallRecordButtonStyle}>
                    <strong style={{ color: colors.navy }}>{item.title}</strong>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{formatDate(item.date)} · {item.area}</div>
                  </button>
                )) : <div style={emptyStateStyle}>No later work scheduled in the next 30 days.</div>}
              </div>
            </SectionShell>
          </div>
        </div>
      </div>
    );
  }

  function renderProcedures() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Procedures" title="Editable Procedure Library" right={<button type="button" onClick={startNewProcedure} style={primaryButtonStyle}>Add Procedure</button>}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredProcedures.map((procedure) => (
              <button
                key={procedure.id}
                type="button"
                onClick={() => {
                  setSelectedProcedureId(procedure.id);
                  setProcedureMode("edit");
                }}
                style={{
                  ...smallRecordButtonStyle,
                  border: selectedProcedureId === procedure.id && procedureMode === "edit" ? `2px solid ${colors.gold}` : `1px solid ${colors.line}`,
                  background: selectedProcedureId === procedure.id && procedureMode === "edit" ? "#FFF9EA" : "#FBFCFE",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <strong style={{ color: colors.navy }}>{procedure.title}</strong>
                  <span style={priorityBadge(procedure.priority)}>{procedure.priority}</span>
                </div>
                <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{procedure.area} · {procedure.steps.length} steps</div>
              </button>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          eyebrow={procedureMode === "new" ? "New Procedure" : "Edit Procedure"}
          title={procedureForm.title || "Procedure Details"}
          right={procedureMode === "edit" && procedureForm.id ? <button type="button" onClick={deleteProcedure} style={deleteButtonStyle}>Delete Procedure</button> : null}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>Procedure Title<input value={procedureForm.title} onChange={(event) => setProcedureForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Pool Backwash Procedure" style={inputStyle} /></label>
              <label style={labelStyle}>Area / Location<input value={procedureForm.area} onChange={(event) => setProcedureForm((current) => ({ ...current, area: event.target.value }))} placeholder="Example: Pool Equipment Room" style={inputStyle} /></label>
              <label style={labelStyle}>Priority<select value={procedureForm.priority} onChange={(event) => setProcedureForm((current) => ({ ...current, priority: event.target.value as Priority }))} style={inputStyle}><option value="High">High</option><option value="Normal">Normal</option><option value="Seasonal">Seasonal</option></select></label>
              <label style={labelStyle}>Schedule Date<input type="date" value={procedureScheduleDate} onChange={(event) => setProcedureScheduleDate(event.target.value)} style={inputStyle} /></label>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={saveProcedure} style={widePrimaryButtonStyle}>Save Procedure to Neon</button>
              <button type="button" onClick={() => scheduleProcedure({ ...procedureForm, title: procedureForm.title || "Untitled Procedure", area: procedureForm.area || "General", steps: procedureForm.steps.filter(Boolean), priority: procedureForm.priority || "Normal" })} style={goldButtonStyle}>Schedule This Procedure</button>
            </div>

            <div style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={goldEyebrowStyle}>Steps</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Edit each step in order. Empty steps are ignored when saved.</div>
                </div>
                <button type="button" onClick={addProcedureStep} style={primaryButtonStyle}>Add Step</button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {procedureForm.steps.map((step, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 999, background: colors.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950 }}>{index + 1}</div>
                    <input value={step} onChange={(event) => updateProcedureStep(index, event.target.value)} placeholder={`Step ${index + 1}`} style={inputStyle} />
                    <button type="button" onClick={() => removeProcedureStep(index)} style={deleteButtonStyle}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionShell>
      </div>
    );
  }

  function renderWeather() {
    return (
      <SectionShell eyebrow="Weather Planning" title="2000 Yard Work + Irrigation Forecast">
        <WeatherPlanner />
      </SectionShell>
    );
  }

  function renderDocuments() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "0.78fr 1.22fr", gap: 18, alignItems: "start" }}>
        <SectionShell eyebrow="Upload" title="Asset Photos">
          <div style={{ display: "grid", gap: 12 }}>
            <label style={labelStyle}>Attach to Asset<select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)} style={inputStyle}>{sortAssets(assetRecords).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
            <label style={uploadBoxStyle}>Add photos for {selectedAsset.name}<span style={{ color: colors.muted, fontSize: 13, fontWeight: 600 }}>Uploads save to Neon.</span><input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ color: colors.muted }} /></label>
            {selectedAssetPhotos.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {selectedAssetPhotos.map((photo) => (
                  <div key={photo.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 16, overflow: "hidden", background: "#FBFCFE" }}>
                    <img src={photo.dataUrl} alt={photo.name} style={{ width: "100%", height: 145, objectFit: "cover" }} />
                    <div style={{ padding: 12 }}><div style={{ color: colors.navy, fontWeight: 900, fontSize: 13 }}>{photo.name}</div><button type="button" onClick={() => deleteAssetPhoto(photo.id)} style={{ ...deleteButtonStyle, marginTop: 10 }}>Delete</button></div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: colors.muted }}>No photos added for this selected asset yet.</div>}
          </div>
        </SectionShell>

        <SectionShell eyebrow="Documents" title="Atlas Document Records">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={emptyStateStyle}>
              Uploaded document count: {uploadedDocumentCount}. Public docs found: {publicDocs.length}. Work-order photo count: {uploadedServicePhotoCount}. Public docs status: {publicDocsStatus}. Database status: {databaseStatus}
            </div>

            <div style={{ ...inlineCardStyle, display: "grid", gap: 12 }}>
              <div>
                <div style={goldEyebrowStyle}>Verified public/docs Files</div>
                <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                  Atlas checks the known generated-doc paths and only shows files that actually answer from Vercel. These View buttons should not 404.
                </div>
              </div>

              {publicDocs.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {publicDocs.map((document) => (
                    <div key={document.id} style={inlineCardStyle}>
                      <div style={{ color: colors.navy, fontWeight: 950 }}>{document.name}</div>
                      <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{document.type} · {document.href}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        <a href={document.href} target="_blank" rel="noreferrer" style={primaryButtonStyle}>View</a>
                        <a href={document.href} download={document.name} style={linkButtonStyle}>Download</a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  No generated public docs were found at the known paths yet. The app will not show View buttons for missing files, so this should stop the 404 problem.
                </div>
              )}
            </div>

            {filteredDocuments.map((document) => {
              const verifiedDoc = findVerifiedPublicDoc(document.href, publicDocs);

              return (
                <div key={document.id} style={inlineCardStyle}>
                  <button
                    type="button"
                    onClick={() => {
                      if (document.linkedAssetId) {
                        setSelectedAssetId(document.linkedAssetId);
                        setAssetMode("edit");
                        setScreen("assets");
                      } else if (document.id === "doc-property-map") {
                        setScreen("map");
                      }
                    }}
                    style={{ all: "unset", cursor: "pointer", display: "block" }}
                  >
                    <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950 }}>{document.area}</div>
                    <h3 style={{ color: colors.navy, margin: "5px 0" }}>{document.title}</h3>
                    <div style={{ color: colors.muted, fontSize: 13, fontWeight: 850 }}>{document.type}{document.linkedAssetId ? ` · ${assetName(document.linkedAssetId)}` : ""}</div>
                    <p style={{ color: colors.text, lineHeight: 1.5 }}>{document.notes}</p>
                    {verifiedDoc ? (
                      <div style={{ color: "#087443", fontSize: 12, fontWeight: 950 }}>Verified file: {verifiedDoc.href}</div>
                    ) : document.href ? (
                      <div style={{ color: colors.red, fontSize: 12, fontWeight: 950 }}>Not found at expected path: {document.href}</div>
                    ) : null}
                  </button>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {verifiedDoc ? <a href={verifiedDoc.href} target="_blank" rel="noreferrer" style={linkButtonStyle}>View</a> : null}
                    {verifiedDoc ? <a href={verifiedDoc.href} download={verifiedDoc.name} style={smallPrimaryButtonStyle}>Download</a> : null}
                    {document.linkedAssetId ? <button type="button" onClick={() => { setSelectedAssetId(document.linkedAssetId || ""); setAssetMode("edit"); setScreen("assets"); }} style={goldButtonStyle}>Open Related Asset</button> : null}
                    {!verifiedDoc ? <span style={openPillStyle}>Reference only — no View button until file path matches</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionShell>
      </div>
    );
  }

  function startNewPart() {
    setPartMode("new");
    setSelectedPartId("");
    setPartForm(blankPart());
  }

  function savePart() {
    const name = partForm.name.trim();
    if (!name) return;

    const existingId = partMode === "edit" ? partForm.id : "";
    let id = existingId || slugify(`part-${name}`);
    if (partMode === "new" && partRecords.some((part) => part.id === id)) id = `${id}-${Date.now()}`;

    const quantity = Number(partForm.quantity || 0);
    const minQuantity = Number(partForm.minQuantity || 0);
    const status = partForm.status || partStatusForQuantity(quantity, minQuantity);

    const cleanPart: PartRecord = {
      ...partForm,
      id,
      name,
      category: partForm.category.trim() || "General",
      locationId: partForm.locationId || "general",
      assetId: partForm.assetId || "",
      vendorId: partForm.vendorId || "",
      partNumber: partForm.partNumber?.trim() || "",
      sku: partForm.sku?.trim() || "",
      quantity,
      minQuantity,
      unit: partForm.unit.trim() || "each",
      status,
      reorderUrl: partForm.reorderUrl?.trim() || "",
      notes: partForm.notes.trim() || "No notes added yet.",
    };

    setPartRecords((current) => sortParts(current.some((part) => part.id === id) ? current.map((part) => (part.id === id ? cleanPart : part)) : [...current, cleanPart]));
    setPartForm(cleanPart);
    setSelectedPartId(id);
    setPartMode("edit");
    setDatabaseStatus("Parts saved locally");
  }

  function deletePart() {
    if (!partForm.id) return;
    const confirmed = window.confirm(`Delete part / inventory item: ${partForm.name}?`);
    if (!confirmed) return;

    const remaining = sortParts(partRecords.filter((part) => part.id !== partForm.id));
    setPartRecords(remaining);
    const nextPart = remaining[0];
    setSelectedPartId(nextPart?.id ?? "");
    setPartForm(nextPart ?? blankPart());
    setPartMode(nextPart ? "edit" : "new");
    setDatabaseStatus("Parts saved locally");
  }

  function adjustPartQuantity(delta: number) {
    setPartForm((current) => {
      const quantity = Math.max(0, Number(current.quantity || 0) + delta);
      return { ...current, quantity, status: partStatusForQuantity(quantity, Number(current.minQuantity || 0)) };
    });
  }

  function createPartWorkOrder(part?: PartRecord) {
    const source = part ?? partForm;
    if (!source.name.trim()) return;

    const assetId = source.assetId || assetRecords[0]?.id || "";
    const workOrder: ServiceRecord = normalizeService({
      id: uid("service-part"),
      assetId,
      vendorId: source.vendorId || "",
      procedureId: "vendor-visit-intake",
      date: todayKey,
      title: `Order / restock: ${source.name}`,
      status: "Open",
      notes: `Inventory request from Parts tab. Current quantity: ${source.quantity} ${source.unit}. Minimum: ${source.minQuantity} ${source.unit}. Location: ${getLocationName(source.locationId)}. Notes: ${source.notes}`,
      followUpDate: "",
      photos: [],
      documents: [],
    });

    setServiceRecords((current) => sortServices([workOrder, ...current]));
    setSelectedServiceId(workOrder.id);
    setServiceForm(workOrder);
    setServiceMode("edit");
    setScreen("history");
    void postAtlasRecord("work_orders", workOrder);
  }

  function schedulePartRestock(part?: PartRecord) {
    const source = part ?? partForm;
    if (!source.name.trim()) return;

    const item: CalendarItem = {
      id: uid("cal-part"),
      date: todayKey,
      title: `Restock: ${source.name}`,
      area: getLocationName(source.locationId),
      status: "Scheduled",
    };

    setCalendarItems((current) => sortCalendar([...current, item]));
    setSelectedCalendarId(item.id);
    setSelectedCalendarDate(item.date);
    setCalendarCursor(dateFromKey(item.date));
    setCalendarForm(item);
    setCalendarMode("edit");
    setScreen("calendar");
    void postAtlasRecord("calendar", item);
  }

  function renderParts() {
    const totalUnits = partRecords.reduce((total, part) => total + Number(part.quantity || 0), 0);
    const outCount = partRecords.filter((part) => part.status === "Out" || part.quantity <= 0).length;
    const lowCount = lowPartRecords.length;
    const selectedPartSaved = Boolean(partMode === "edit" && partForm.id);

    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          <StatCard label="Inventory Items" value={partRecords.length} detail="parts and supplies tracked" />
          <StatCard label="Low / Order" value={lowCount} detail="items needing attention" />
          <StatCard label="Out" value={outCount} detail="zero quantity items" />
          <StatCard label="Total Units" value={totalUnits} detail="across all inventory rows" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: 18, alignItems: "start" }}>
          <SectionShell eyebrow="Parts" title="Inventory + Reorder List" right={<button type="button" onClick={startNewPart} style={primaryButtonStyle}>Add Part</button>}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={labelStyle}>Status Filter<select value={partStatusFilter} onChange={(event) => setPartStatusFilter(event.target.value as "all" | PartStatus)} style={inputStyle}><option value="all">All</option><option value="In Stock">In Stock</option><option value="Low">Low</option><option value="Out">Out</option><option value="Order">Order</option></select></label>
                <label style={labelStyle}>Category Filter<select value={partCategoryFilter} onChange={(event) => setPartCategoryFilter(event.target.value)} style={inputStyle}><option value="all">All</option>{partCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              </div>

              {lowPartRecords.length ? (
                <div style={{ ...inlineCardStyle, background: "#FFF9EA" }}>
                  <div style={goldEyebrowStyle}>Needs Attention</div>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {lowPartRecords.slice(0, 5).map((part) => (
                      <button key={part.id} type="button" onClick={() => { setSelectedPartId(part.id); setPartMode("edit"); }} style={smallRecordButtonStyle}>
                        <strong style={{ color: colors.navy }}>{part.name}</strong>
                        <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{part.status} · Qty {part.quantity} {part.unit} · Min {part.minQuantity}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                {filteredParts.length ? filteredParts.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => { setSelectedPartId(part.id); setPartMode("edit"); }}
                    style={{ ...smallRecordButtonStyle, border: selectedPartId === part.id && partMode === "edit" ? `2px solid ${colors.gold}` : `1px solid ${colors.line}`, background: selectedPartId === part.id && partMode === "edit" ? "#FFF9EA" : "#FBFCFE" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <strong style={{ color: colors.navy }}>{part.name}</strong>
                      <span style={partBadgeStyle(part.status)}>{part.status}</span>
                    </div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{part.category} · {getLocationName(part.locationId)}</div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>Qty {part.quantity} {part.unit} · Min {part.minQuantity} · {vendorName(part.vendorId)}</div>
                  </button>
                )) : <div style={emptyStateStyle}>No parts match the current filter.</div>}
              </div>
            </div>
          </SectionShell>

          <SectionShell eyebrow={partMode === "new" ? "New Inventory Item" : "Edit Inventory Item"} title={partForm.name || "Part Details"} right={selectedPartSaved ? <button type="button" onClick={deletePart} style={deleteButtonStyle}>Delete Part</button> : null}>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>Part / Supply Name<input value={partForm.name} onChange={(event) => setPartForm((current) => ({ ...current, name: event.target.value }))} placeholder="Example: Spa filter" style={inputStyle} /></label>
                <label style={labelStyle}>Category<input value={partForm.category} onChange={(event) => setPartForm((current) => ({ ...current, category: event.target.value }))} placeholder="Pool, HVAC, Dock, Irrigation..." style={inputStyle} /></label>
                <label style={labelStyle}>Location<select value={partForm.locationId} onChange={(event) => setPartForm((current) => ({ ...current, locationId: event.target.value }))} style={inputStyle}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
                <label style={labelStyle}>Linked Asset<select value={partForm.assetId ?? ""} onChange={(event) => setPartForm((current) => ({ ...current, assetId: event.target.value }))} style={inputStyle}><option value="">No asset</option>{sortAssets(assetRecords).map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
                <label style={labelStyle}>Vendor / Supplier<select value={partForm.vendorId ?? ""} onChange={(event) => setPartForm((current) => ({ ...current, vendorId: event.target.value }))} style={inputStyle}><option value="">No vendor</option>{sortVendors(vendorRecords).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                <label style={labelStyle}>Status<select value={partForm.status} onChange={(event) => setPartForm((current) => ({ ...current, status: event.target.value as PartStatus }))} style={inputStyle}><option value="In Stock">In Stock</option><option value="Low">Low</option><option value="Out">Out</option><option value="Order">Order</option></select></label>
                <label style={labelStyle}>Part Number<input value={partForm.partNumber ?? ""} onChange={(event) => setPartForm((current) => ({ ...current, partNumber: event.target.value }))} placeholder="Part # / model" style={inputStyle} /></label>
                <label style={labelStyle}>SKU<input value={partForm.sku ?? ""} onChange={(event) => setPartForm((current) => ({ ...current, sku: event.target.value }))} placeholder="SKU / vendor code" style={inputStyle} /></label>
                <label style={labelStyle}>Quantity<input type="number" value={partForm.quantity} onChange={(event) => { const quantity = Number(event.target.value); setPartForm((current) => ({ ...current, quantity, status: partStatusForQuantity(quantity, Number(current.minQuantity || 0)) })); }} style={inputStyle} /></label>
                <label style={labelStyle}>Minimum<input type="number" value={partForm.minQuantity} onChange={(event) => { const minQuantity = Number(event.target.value); setPartForm((current) => ({ ...current, minQuantity, status: partStatusForQuantity(Number(current.quantity || 0), minQuantity) })); }} style={inputStyle} /></label>
                <label style={labelStyle}>Unit<input value={partForm.unit} onChange={(event) => setPartForm((current) => ({ ...current, unit: event.target.value }))} placeholder="each, filters, gallons..." style={inputStyle} /></label>
                <label style={labelStyle}>Reorder Link<input value={partForm.reorderUrl ?? ""} onChange={(event) => setPartForm((current) => ({ ...current, reorderUrl: event.target.value }))} placeholder="Vendor or Amazon reorder URL" style={inputStyle} /></label>
              </div>

              <label style={labelStyle}>Notes<textarea value={partForm.notes} onChange={(event) => setPartForm((current) => ({ ...current, notes: event.target.value }))} rows={5} placeholder="Where it is stored, what it fits, reorder notes, size, install notes, and vendor instructions." style={{ ...inputStyle, resize: "vertical" }} /></label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, auto))", gap: 8, justifyContent: "start", alignItems: "center" }}>
                <button type="button" onClick={() => adjustPartQuantity(-1)} style={smallPrimaryButtonStyle}>-1</button>
                <button type="button" onClick={() => adjustPartQuantity(1)} style={smallPrimaryButtonStyle}>+1</button>
                <button type="button" onClick={savePart} style={widePrimaryButtonStyle}>Save Part</button>
                <button type="button" onClick={() => createPartWorkOrder()} style={goldButtonStyle}>Make Work Order</button>
                <button type="button" onClick={() => schedulePartRestock()} style={smallPrimaryButtonStyle}>Schedule Restock</button>
              </div>

              {partForm.reorderUrl ? (
                <a href={partForm.reorderUrl.startsWith("http") ? partForm.reorderUrl : `https://${partForm.reorderUrl}`} target="_blank" rel="noreferrer" style={linkButtonStyle}>Open Reorder Link</a>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                <div style={inlineCardStyle}><div style={goldEyebrowStyle}>Linked Asset</div><div style={{ color: colors.navy, fontWeight: 950, marginTop: 6 }}>{assetName(partForm.assetId || "")}</div>{partForm.assetId ? <button type="button" onClick={() => { setSelectedAssetId(partForm.assetId || ""); setAssetMode("edit"); setScreen("assets"); }} style={{ ...smallPrimaryButtonStyle, marginTop: 10 }}>Open Asset</button> : null}</div>
                <div style={inlineCardStyle}><div style={goldEyebrowStyle}>Vendor</div><div style={{ color: colors.navy, fontWeight: 950, marginTop: 6 }}>{vendorName(partForm.vendorId)}</div>{partForm.vendorId ? <button type="button" onClick={() => { setSelectedVendorId(partForm.vendorId || ""); setVendorMode("edit"); setScreen("vendors"); }} style={{ ...smallPrimaryButtonStyle, marginTop: 10 }}>Open Vendor</button> : null}</div>
                <div style={inlineCardStyle}><div style={goldEyebrowStyle}>Inventory Rule</div><div style={{ color: colors.navy, fontWeight: 950, marginTop: 6 }}>Keep at least {partForm.minQuantity} {partForm.unit}</div><div style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Current status: {partForm.status}</div></div>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>
    );
  }

  function renderAssistant() {
    const quickQuestions = [
      "What needs to be done this week?",
      "Show overdue work orders",
      "Show open pool work orders",
      "Who handles irrigation?",
      "Pool documents",
      "Pool photos",
      "What documents are tied to Blinds Lutron?",
      "What photos are attached to the Cobalt lift?",
      "What parts are low or need ordering?",
      "Show pool supplies",
      "Show vendor visits coming up",
      "What do we know about Boiler B-2?",
      "What is the pool equipment chain?",
      "Which lift box is for the Cobalt?",
      "What do we know about the Sundance spa?",
    ];

    const assistantStats = [
      { label: "Assets", value: assetRecords.length },
      { label: "Vendors", value: vendorRecords.length },
      { label: "Work Orders", value: serviceRecords.length },
      { label: "Calendar", value: calendarItems.length },
      { label: "Docs", value: uploadedDocumentCount },
      { label: "Public Docs", value: publicDocs.length },
      { label: "Photos", value: photos.length + uploadedServicePhotoCount },
      { label: "Parts", value: partRecords.length },
    ];

    return (
      <SectionShell eyebrow="Ask Atlas" title="Property Assistant" right={<img src="/atlas-logo.png" alt="Atlas logo" style={{ width: 52, height: 52, objectFit: "contain" }} />}>
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
            {assistantStats.map((stat) => (
              <div key={stat.label} style={{ border: `1px solid ${colors.line}`, background: "#FBFCFE", borderRadius: 16, padding: 12 }}>
                <div style={{ color: colors.muted, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.6 }}>{stat.label}</div>
                <div style={{ color: colors.navy, fontSize: 24, fontWeight: 950, marginTop: 3 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: 18, alignItems: "start" }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={inlineCardStyle}>
                <div style={goldEyebrowStyle}>Ask a Property Question</div>
                <textarea value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="Ask Atlas simply: pool documents, pool photos, irrigation vendor, open pool work orders, Boiler B-2, Cobalt lift photos, low parts..." rows={8} style={{ ...inputStyle, resize: "vertical", marginTop: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 10 }}>
                  <button type="button" onClick={() => askAtlas(assistantQuestion)} style={widePrimaryButtonStyle}>Ask Atlas</button>
                  <button type="button" onClick={() => { setAssistantQuestion(""); assistantSetAnswer("Ask Atlas a simple question like “pool documents,” “pool photos,” “irrigation vendor,” “open pool work orders,” or “Boiler B-2.” Results will show as clickable cards with View, Download, Delete, and Open Related Record when available.", []); }} style={smallPrimaryButtonStyle}>Clear</button>
                </div>
              </div>

              <div style={inlineCardStyle}>
                <div style={goldEyebrowStyle}>Quick Questions</div>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  {quickQuestions.map((question) => <button key={question} type="button" onClick={() => { setAssistantQuestion(question); askAtlas(question); }} style={quickQuestionStyle}>{question}</button>)}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={assistantAnswerStyle}>{assistantAnswer}</div>

              <div style={inlineCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={goldEyebrowStyle}>Results You Can Act On</div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Ask Atlas shows a clean list. Uploaded files get View/Download/Delete. Reference records open the related Atlas record.</div>
                  </div>
                  {assistantResults.length ? <span style={openPillStyle}>{assistantResults.length} results</span> : null}
                </div>

                {assistantResults.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {assistantResults.map((result) => {
                      const hasFile = Boolean(result.dataUrl);
                      const isStaticDocument = result.attachmentKind === "static-document";

                      return (
                        <div key={result.id} style={{ ...searchResultStyle, display: "grid", gap: 10 }}>
                          <button type="button" onClick={() => openSearchResult(result)} style={{ all: "unset", cursor: "pointer", display: "block" }}>
                            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, textTransform: "uppercase" }}>{result.type}</div>
                                <div style={{ color: colors.navy, fontWeight: 950, fontSize: 17, marginTop: 4 }}>{result.title}</div>
                                <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{result.subtitle}</div>
                              </div>
                              <span style={hasFile ? badgeStyle("Online") : isStaticDocument ? badgeStyle("Monitor") : smallPrimaryButtonStyle}>
                                {hasFile ? "Viewable" : isStaticDocument ? "Reference" : "Open"}
                              </span>
                            </div>
                            <div style={{ color: colors.text, fontSize: 13, lineHeight: 1.45, marginTop: 8 }}>{result.detail}</div>
                          </button>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {hasFile ? <button type="button" onClick={() => openAssistantFile(result)} style={primaryButtonStyle}>View</button> : null}
                            {hasFile ? <a href={result.dataUrl} download={result.downloadName || result.title} style={linkButtonStyle}>Download</a> : null}
                            <button type="button" onClick={() => openSearchResult(result)} style={smallPrimaryButtonStyle}>Open Related Record</button>
                            <button type="button" onClick={() => openSearchResult(result)} style={goldButtonStyle}>Add / Edit Notes</button>
                            {result.attachmentKind && result.attachmentKind !== "static-document" ? <button type="button" onClick={() => deleteAssistantAttachment(result)} style={deleteButtonStyle}>Delete</button> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div style={emptyStateStyle}>Ask a simple question like “pool documents” or “Cobalt lift photos” to get a clickable list.</div>}
              </div>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  const activeNav = navItems.find((item) => item.id === screen);

  return (
    <main style={appShellStyle}>
      <aside style={sidebarStyle}>
        <div style={sidebarBrandStyle}>
          <img src="/atlas-logo.png" alt="Atlas logo" style={sidebarLogoStyle} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: 1.2, lineHeight: 1 }}>ATLAS</div>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 900, marginTop: 5 }}>Estate Systems</div>
            <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 750, marginTop: 3 }}>Private instance: 2000</div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {navItems.map((item) => {
            const active = item.id === screen;
            return (
              <button key={item.id} type="button" onClick={() => setScreen(item.id)} style={active ? activeNavButtonStyle : navButtonStyle}>
                <span><span style={{ display: "block", fontWeight: 950 }}>{item.label}</span><span style={{ display: "block", color: "rgba(255,255,255,0.62)", fontSize: 12, marginTop: 3 }}>{item.description}</span></span>
                {active ? <span style={{ width: 9, height: 9, borderRadius: "50%", background: colors.gold2, flex: "0 0 auto" }} /> : null}
              </button>
            );
          })}
        </nav>

        <div style={sidebarStatusStyle}>
          <div style={{ color: colors.gold2, fontWeight: 950, fontSize: 12 }}>NEON DATABASE</div>
          <div style={{ fontWeight: 900, marginTop: 6 }}>{databaseStatus}</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 5, lineHeight: 1.4 }}>
            Saves now go through /api/atlas.
          </div>
        </div>
      </aside>

      <section style={{ padding: 24, minWidth: 0 }}>
        <header style={topHeaderStyle}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
            <img src="/atlas-logo.png" alt="Atlas logo" style={headerLogoStyle} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: colors.gold, fontSize: 12, fontWeight: 950, letterSpacing: 1.3, textTransform: "uppercase" }}>{activeNav?.label ?? "Dashboard"}</div>
              <h1 style={{ margin: "4px 0 0", color: colors.navy, fontSize: 31, letterSpacing: -0.9, lineHeight: 1.05 }}>Atlas Estate Systems</h1>
              <div style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>Atlas / 2000 · Private estate operations software for work orders, assets, vendors, procedures, parts, documents, photos, and property history.</div>
            </div>
          </div>

          <div style={searchBoxStyle}>
            <img src="/atlas-logo.png" alt="Atlas logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Atlas records..." style={searchInputStyle} />
            {query ? <button type="button" onClick={() => setQuery("")} style={smallPrimaryButtonStyle}>Clear</button> : null}
          </div>
        </header>

        {query ? (
          <div style={{ display: "grid", gap: 18, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 12 }}>
              <SearchCount label="locations" value={filteredLocations.length} />
              <SearchCount label="assets" value={filteredAssets.length} />
              <SearchCount label="vendors" value={filteredVendors.length} />
              <SearchCount label="work orders" value={filteredServices.length} />
              <SearchCount label="calendar" value={filteredCalendar.length} />
              <SearchCount label="procedures" value={filteredProcedures.length} />
              <SearchCount label="parts" value={filteredParts.length} />
              <SearchCount label="docs" value={filteredDocuments.length} />
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
        {screen === "parts" ? renderParts() : null}
        {screen === "assistant" ? renderAssistant() : null}
      </section>
    </main>
  );
}

function SearchCount({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: `1px solid ${colors.line}`, background: colors.card, borderRadius: 18, padding: 14 }}>
      <strong style={{ color: colors.navy }}>{value}</strong>
      <span style={{ color: colors.muted }}> {label}</span>
    </div>
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

const appShellStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  display: "grid",
  gridTemplateColumns: "292px 1fr",
  color: colors.text,
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const sidebarStyle: React.CSSProperties = {
  background: `linear-gradient(180deg, ${colors.navy}, ${colors.navy2})`,
  color: "white",
  padding: 20,
  position: "sticky",
  top: 0,
  height: "100vh",
  overflowY: "auto",
};

const sidebarBrandStyle: React.CSSProperties = {
  display: "flex",
  gap: 13,
  alignItems: "center",
  padding: "8px 6px 22px",
  borderBottom: "1px solid rgba(255,255,255,0.13)",
  marginBottom: 16,
};

const sidebarLogoStyle: React.CSSProperties = {
  width: 62,
  height: 62,
  objectFit: "contain",
  background: "white",
  borderRadius: 16,
  padding: 6,
};

const navButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  borderRadius: 16,
  padding: "12px 12px",
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const activeNavButtonStyle: React.CSSProperties = {
  ...navButtonStyle,
  border: `1px solid ${colors.gold2}`,
  background: "rgba(201,154,61,0.18)",
};

const sidebarStatusStyle: React.CSSProperties = {
  marginTop: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: 14,
  background: "rgba(255,255,255,0.05)",
};

const topHeaderStyle: React.CSSProperties = {
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
};

const headerLogoStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  objectFit: "contain",
  borderRadius: 15,
  border: `1px solid ${colors.line}`,
  padding: 5,
  background: "white",
};

const searchBoxStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  background: "#F7F9FC",
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 10,
};

const searchInputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  background: "transparent",
  color: colors.navy,
  fontWeight: 800,
  fontSize: 15,
  width: "100%",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  background: colors.navy,
  color: "white",
  borderRadius: 12,
  padding: "9px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const smallPrimaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  borderRadius: 11,
  padding: "8px 10px",
};

const widePrimaryButtonStyle: React.CSSProperties = {
  border: "none",
  background: colors.navy,
  color: "white",
  borderRadius: 14,
  padding: "13px 14px",
  fontWeight: 950,
  cursor: "pointer",
};

const goldButtonStyle: React.CSSProperties = {
  border: "none",
  background: colors.gold,
  color: colors.navy,
  borderRadius: 14,
  padding: "13px 14px",
  fontWeight: 950,
  cursor: "pointer",
};

const calendarNavButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "white",
  color: colors.navy,
  borderRadius: 12,
  padding: "9px 11px",
  fontWeight: 950,
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "white",
  color: colors.red,
  borderRadius: 12,
  padding: "8px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "white",
  color: colors.navy,
  borderRadius: 12,
  padding: "8px 10px",
  fontWeight: 900,
  textDecoration: "none",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: colors.navy,
  fontWeight: 900,
};

const threeColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const recordCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 16,
  background: "#FBFCFE",
};

const inlineCardStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: 15,
  background: "#FBFCFE",
};

const smallRecordButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  borderRadius: 16,
  padding: 13,
  textAlign: "left",
  cursor: "pointer",
};

const serviceRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "150px 1fr auto",
  gap: 14,
  alignItems: "center",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: 14,
  background: "#FBFCFE",
};

const goldEyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 950,
};

const searchResultStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  borderRadius: 16,
  padding: 14,
  textAlign: "left",
  cursor: "pointer",
};

const openPillStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "white",
  color: colors.navy,
  borderRadius: 999,
  padding: "5px 9px",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const clampedTextStyle: React.CSSProperties = {
  color: colors.text,
  fontSize: 13,
  lineHeight: 1.45,
  margin: "10px 0 0",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const emptyStateStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  borderRadius: 16,
  padding: 16,
  color: colors.muted,
};

const heroCardStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${colors.navy}, ${colors.navy3})`,
  borderRadius: 22,
  padding: 22,
  color: "white",
  overflow: "hidden",
  position: "relative",
};

const heroOrbStyle: React.CSSProperties = {
  position: "absolute",
  right: -65,
  top: -70,
  width: 190,
  height: 190,
  borderRadius: "50%",
  border: `30px solid rgba(201, 154, 61, 0.18)`,
};

const heroLogoStyle: React.CSSProperties = {
  width: 86,
  height: 86,
  objectFit: "contain",
  background: "white",
  borderRadius: 20,
  padding: 8,
};

const mapShellStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: 24,
  overflow: "hidden",
  border: `1px solid ${colors.line}`,
  minHeight: 520,
  background: "#E9EEF5",
  userSelect: "none",
  touchAction: "none",
};

const mapImageStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  objectFit: "contain",
  pointerEvents: "none",
};

const mapLabelPinStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%, -50%)",
  border: `2px solid ${colors.gold2}`,
  borderRadius: 999,
  padding: "7px 10px",
  fontWeight: 950,
  fontSize: 12,
  boxShadow: "0 12px 24px rgba(0,0,0,0.28)",
  cursor: "grab",
  display: "inline-flex",
  gap: 7,
  alignItems: "center",
  whiteSpace: "nowrap",
  maxWidth: 210,
};

const mapPinDotStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 38,
  height: 22,
  borderRadius: 999,
  background: "rgba(255,255,255,0.22)",
  fontSize: 10,
  fontWeight: 950,
};

const vendorLogoBoxStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 14,
  background: "white",
  border: `1px solid ${colors.line}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flex: "0 0 auto",
};

const uploadBoxStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  border: `2px dashed ${colors.line}`,
  borderRadius: 18,
  padding: 18,
  background: "#FBFCFE",
  color: colors.navy,
  fontWeight: 950,
  cursor: "pointer",
};

const quickQuestionStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  color: colors.navy,
  borderRadius: 12,
  padding: "9px 11px",
  fontWeight: 850,
  textAlign: "left",
  cursor: "pointer",
};

const dashboardActionButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  color: colors.navy,
  borderRadius: 16,
  padding: 14,
  fontWeight: 900,
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 5,
  alignContent: "start",
};

const dashboardMiniButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  background: "#FBFCFE",
  color: colors.navy,
  borderRadius: 16,
  padding: 16,
  fontWeight: 900,
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 6,
  alignContent: "start",
};

const assistantAnswerStyle: React.CSSProperties = {
  border: `1px solid ${colors.line}`,
  borderRadius: 18,
  padding: 18,
  background: "#FBFCFE",
  minHeight: 310,
  whiteSpace: "pre-wrap",
  color: colors.text,
  lineHeight: 1.55,
};

const vendorCheckGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  maxHeight: 260,
  overflowY: "auto",
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  padding: 12,
  background: "#FBFCFE",
};

const vendorCheckStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "18px 1fr",
  gap: 9,
  alignItems: "start",
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  padding: 9,
  background: "white",
  cursor: "pointer",
};

const calendarToolbarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto auto auto auto auto 1fr 120px",
  gap: 8,
  alignItems: "center",
};

const calendarWeekHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 8,
};

const calendarMonthGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 8,
};

const calendarDayCellStyle: React.CSSProperties = {
  minHeight: 132,
  borderRadius: 16,
  padding: 10,
  background: "#FBFCFE",
  cursor: "pointer",
  outline: "none",
  overflow: "hidden",
};
