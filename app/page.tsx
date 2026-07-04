"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
  | "photos"
  | "voice"
  | "team"
  | "backup"
  | "assistant";

type Status = "Online" | "Offline" | "Seasonal" | "Monitor";

type LocationRecord = {
  id: string;
  name: string;
  type: string;
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
  address?: string;
  notes: string;
};

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  locationId: string;
};

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  notes: string;
};

type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  linkedTo: string;
  notes: string;
  href: string;
};

type ProcedureRecord = {
  id: string;
  title: string;
  locationId: string;
  assetId: string;
  frequency: string;
  notes: string;
  steps: string[];
};

type LogRecord = {
  id: string;
  date: string;
  title: string;
  linkedTo: string;
  notes: string;
};

type PhotoRecord = {
  id: string;
  date: string;
  title: string;
  linkedTo: string;
  notes: string;
  dataUrl: string;
};

type VoiceRecord = {
  id: string;
  date: string;
  title: string;
  linkedTo: string;
  notes: string;
  dataUrl: string;
};

const STORE_ASSETS = "atlas_2000_assets_safe_v1";
const STORE_LOCATIONS = "atlas_2000_locations_safe_v1";
const STORE_VENDORS = "atlas_2000_vendors_safe_v1";
const STORE_LABELS = "atlas_2000_labels_safe_v1";
const STORE_CALENDAR = "atlas_2000_calendar_safe_v1";
const STORE_DOCUMENTS = "atlas_2000_documents_safe_v1";
const STORE_PROCEDURES = "atlas_2000_procedures_safe_v1";
const STORE_LOGS = "atlas_2000_logs_safe_v1";
const STORE_PHOTOS = "atlas_2000_photos_safe_v1";
const STORE_VOICE = "atlas_2000_voice_safe_v1";

const screens: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Map" },
  { id: "locations", label: "Locations" },
  { id: "assets", label: "Assets" },
  { id: "vendors", label: "Vendors" },
  { id: "calendar", label: "Calendar" },
  { id: "weather", label: "Weather" },
  { id: "documents", label: "Documents" },
  { id: "procedures", label: "Procedures" },
  { id: "logs", label: "Logs" },
  { id: "photos", label: "Photos" },
  { id: "voice", label: "Voice Notes" },
  { id: "team", label: "Team" },
  { id: "backup", label: "Backup" },
  { id: "assistant", label: "AI Assistant" }
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const defaultLocations: LocationRecord[] = [
  { id: "2000", name: "2000", type: "Property", notes: "Overall parent property record." },
  { id: "general", name: "General", type: "General", notes: "Use when a more specific location still needs to be assigned." },
  { id: "dock", name: "Dock", type: "Waterfront", notes: "Main dock, boat lift areas, Sea-Doo area, swim access, and Sunstream lift boxes." },
  { id: "cobalt", name: "Cobalt", type: "Waterfront / Boat", notes: "Cobalt boat and associated lift area." },
  { id: "seadoo", name: "Seadoo", type: "Waterfront / PWC", notes: "Sea-Doo area near dock." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", notes: "Floating water trampoline area." },
  { id: "waterside-lawn-north", name: "Water Side Lawn North", type: "Grounds", notes: "North lawn along waterfront." },
  { id: "east-lawn", name: "East Lawn", type: "Grounds", notes: "Large lawn east/south of sport court." },
  { id: "sport-court", name: "Sport Court", type: "Recreation", notes: "Outdoor sport court." },
  { id: "veggie-boxes", name: "Veggie Boxes", type: "Grounds", notes: "Three vegetable/garden boxes." },
  { id: "new-garage", name: "New Garage", type: "Building", notes: "New garage / auto court garage area." },
  { id: "old-garage", name: "Old Garage", type: "Building", notes: "Old garage near ADU and covered connection areas." },
  { id: "adu", name: "ADU", type: "Building", notes: "Small ADU building left of old garage / lower garage area." },
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", notes: "Courtyard patio with chairs/fire pit. Do not label gray covered walkway itself." },
  { id: "trampoline-dog", name: "Trampoline/Dog", type: "Grounds", notes: "Separate trampoline/dog area." },
  { id: "original-house", name: "Original House", type: "Building", notes: "Original/main house structure." },
  { id: "addition", name: "Addition", type: "Building", notes: "Addition wing including indoor pool area." },
  { id: "hot-tub-sundance", name: "Hot Tub Sundance", type: "Spa", notes: "Standalone Sundance Optima spa/hot tub." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", notes: "Boiler, hydronic, DHW, pool heat, pumps, and controls." },
  { id: "mechanical-room-2", name: "Mechanical Room 2", type: "Systems", notes: "Second mechanical room / secondary HVAC equipment location." },
  { id: "pool", name: "Pool", type: "Pool", notes: "Pool area and pool-related assets." },
  { id: "pool-equipment", name: "Pool Equipment", type: "Pool Systems", notes: "Pentair pump, Triton II sand filter, UV2, valves, and pool equipment." },
  { id: "pool-changing-room", name: "Pool Changing Room", type: "Interior", notes: "Pool changing room laundry/service area." },
  { id: "kitchen", name: "Kitchen", type: "Interior", notes: "Kitchen equipment and appliances." },
  { id: "pantry", name: "Pantry", type: "Interior", notes: "Pantry storage and appliances." },
  { id: "fitness-room", name: "Fitness Room", type: "Interior", notes: "Fitness room / gym area." },
  { id: "house-managers-office", name: "House Managers Office", type: "Interior", notes: "House managers office appliance/laundry area." },
  { id: "elyses-room", name: "Elyse's Room", type: "Interior", notes: "Elyse's room." },
  { id: "upstairs-laundry-closet", name: "Upstairs Laundry Closet", type: "Interior", notes: "Upstairs laundry closet." },
  { id: "formal-dining-room", name: "Formal Dining Room", type: "Interior", notes: "Formal dining room." },
  { id: "wine-room", name: "Wine Room", type: "Interior", notes: "Wine room and wine cooling equipment." },
  { id: "basement", name: "Basement", type: "Interior", notes: "Basement rooms and system access." },
  { id: "outdoor-generator-area", name: "Outdoor Generator Area", type: "Exterior Systems", notes: "Outdoor generator equipment area." },
  { id: "outdoor-condenser-area", name: "Outdoor Condenser Area", type: "Exterior HVAC", notes: "Outdoor condenser and exterior HVAC equipment area." },
  { id: "roof", name: "Roof", type: "Exterior / Roof", notes: "Roof-mounted equipment area." },
  { id: "attic", name: "Attic", type: "Interior Systems", notes: "Attic HVAC/mechanical location." },
  { id: "attic-2", name: "Attic 2", type: "Interior Systems", notes: "Second attic HVAC/mechanical location." },
  { id: "west-side-house", name: "West side of House", type: "Exterior", notes: "West side exterior equipment area." },
  { id: "back-patio-water-side", name: "Back Patio water side", type: "Outdoor Living", notes: "Water-side back patio area." },
  { id: "vegetable-garden", name: "Vegetable Garden", type: "Grounds", notes: "Vegetable garden / garden system area." },
  { id: "hangar", name: "Hangar", type: "Aviation", notes: "Hangar aircraft location." }
];

const defaultVendors: VendorRecord[] = [
  { id: "psf-mechanical", name: "P.S.F / PSF Mechanical", category: "HVAC / Mechanical", notes: "HVAC, boiler, hydronic, Desert Aire, pool mechanical, and mechanical vendor reference." },
  { id: "penthouse-drapery", name: "Penthouse Drapery", category: "Drapery / Roller Shades", phone: "206-292-8336", email: "accounting@penthousedrapery.com", address: "4033 16th Ave SW Suite A, Seattle, WA 98106", notes: "Invoice 176396 dated 06/16/2026. Motorized roller shade repair linked to Blinds Lutron." },
  { id: "advanced-irrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Irrigation activation/deactivation. Linked to Hunter controllers and irrigation lake water meter." },
  { id: "sunstream", name: "Sunstream", category: "Boat Lift Equipment", notes: "Lift boxes, controls, batteries, solar panels, lift components." },
  { id: "seattle-boat", name: "Seattle Boat", category: "Boat Service", notes: "Cobalt winterization, de-winterization, repair, and service." },
  { id: "seadoo-service", name: "Sea-Doo Service", category: "PWC Service", notes: "Sea-Doo service and repair records." },
  { id: "i90-motorsports", name: "I-90 Motorsports", category: "Motorsports", notes: "Powersports / Sea-Doo related vendor record." },
  { id: "appliance-service-station", name: "Appliance Service Station", category: "Appliance Service", notes: "General appliance service vendor record." },
  { id: "electromatic-refrigeration", name: "Electromatic Refrigeration", category: "Refrigeration", notes: "Refrigeration and wine cooling vendor record." },
  { id: "precision-garage-door", name: "Precision Garage Door", category: "Garage Doors", notes: "Garage door and opener vendor record." },
  { id: "best-plumbing", name: "Best Plumbing", category: "Plumbing", notes: "Plumbing vendor record." },
  { id: "american-leak-detection", name: "American Leak Detection", category: "Leak Detection", notes: "Leak detection vendor record." },
  { id: "maple-valley-electric", name: "Maple Valley Electric", category: "Electrical", notes: "Electrical vendor record." },
  { id: "d-square-energy", name: "D Square Energy", category: "Energy / Electrical", notes: "Generator/energy/electrical vendor record." },
  { id: "aqua-quip", name: "Aqua Quip", category: "Pool / Spa", notes: "Pool/spa supplies or service vendor record." },
  { id: "krisco-pool-spas", name: "Krisco Pool and Spas", category: "Pool / Spa", notes: "Pool/spa vendor record." },
  { id: "high-tech-living", name: "High Tech Living", category: "Smart Home / AV", notes: "Smart home, AV, and golf simulator vendor record." },
  { id: "invisible-fence", name: "Invisible Fence", category: "Pet / Fence", notes: "Dog/fence vendor record." },
  { id: "les-schwab", name: "Les Schwab", category: "Vehicle / Tires", notes: "Vehicle/tire vendor record." },
  { id: "autonation-ford-bellevue", name: "AutoNation Ford Bellevue", category: "Vehicle Service", notes: "Ford/vehicle service vendor record." }
];

const defaultAssets: AssetRecord[] = [
  { id: "blinds-hunter-douglas", name: "Blinds Hunter Douglas", locationId: "elyses-room", category: "Blinds / Shades", make: "Hunter Douglas", status: "Online", notes: "Asset listed at Elyse's Room.", vendorIds: [] },
  { id: "blinds-lutron", name: "Blinds Lutron", locationId: "general", category: "Blinds / Motorized Shades", make: "Lutron", status: "Online", notes: "Penthouse Drapery invoice 176396 links to this motorized roller shade asset.", vendorIds: ["penthouse-drapery"] },
  { id: "boiler-b-1", name: "Boiler B-1", locationId: "general", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", status: "Online", notes: "Boiler B-1 / Boiler 1. Prior visible nameplate indicated year built 2018, MAWP 60 PSI, max water temp 210°F.", vendorIds: ["psf-mechanical"] },
  { id: "boiler-b-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", status: "Online", notes: "Boiler B-2 in Mechanical Room.", vendorIds: ["psf-mechanical"] },
  { id: "boiler-b-2-new", name: "Boiler B-2 New", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", status: "Online", notes: "Newer boiler record. Year built 2025, MAWP 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, min relief valve capacity 255.9 lb/hr, CRN R1497.5C.", vendorIds: ["psf-mechanical"] },
  { id: "craft-cobalt-r-7", name: "Craft-Cobalt R-7", locationId: "dock", category: "Boat", make: "Cobalt", status: "Online", notes: "Cobalt boat listed at Dock.", vendorIds: ["seattle-boat"] },
  { id: "craft-seadoo-2024", name: "Craft-SeaDoo 2024", locationId: "dock", category: "PWC", make: "Sea-Doo", status: "Online", notes: "2024 Sea-Doo listed at Dock. Link repair/service photos and invoices here.", vendorIds: ["seadoo-service", "i90-motorsports"] },
  { id: "dishwasher-dw-1", name: "Dishwasher DW-1", locationId: "fitness-room", category: "Dishwasher", status: "Online", notes: "Listed at Fitness Room.", vendorIds: ["appliance-service-station"] },
  { id: "dishwasher-dw-2", name: "Dishwasher DW-2", locationId: "house-managers-office", category: "Dishwasher", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"] },
  { id: "dishwasher-dw-3-right", name: "Dishwasher DW-3 Right", locationId: "kitchen", category: "Dishwasher", status: "Online", notes: "Right dishwasher in Kitchen.", vendorIds: ["appliance-service-station"] },
  { id: "dishwasher-dw-4-left", name: "Dishwasher DW-4 Left", locationId: "kitchen", category: "Dishwasher", status: "Online", notes: "Left dishwasher in Kitchen.", vendorIds: ["appliance-service-station"] },
  { id: "dryer-dr-1", name: "Dryer DR-1", locationId: "upstairs-laundry-closet", category: "Dryer", status: "Online", notes: "Listed at Upstairs Laundry Closet.", vendorIds: ["appliance-service-station"] },
  { id: "dryer-dr-2", name: "Dryer DR-2", locationId: "pool-changing-room", category: "Dryer", status: "Online", notes: "Listed at Pool Changing Room.", vendorIds: ["appliance-service-station"] },
  { id: "dryer-dr-3", name: "Dryer DR-3", locationId: "house-managers-office", category: "Dryer", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"] },
  { id: "flologic", name: "FloLogic", locationId: "general", category: "Water Shutoff / Leak Protection", make: "FloLogic", status: "Online", notes: "Whole-home water monitoring / automatic shutoff asset.", vendorIds: ["best-plumbing", "american-leak-detection"] },
  { id: "freezer-fr-1", name: "Freezer FR-1", locationId: "pantry", category: "Freezer", status: "Online", notes: "Listed at Pantry.", vendorIds: ["appliance-service-station"] },
  { id: "freezer-fr-2", name: "Freezer FR-2", locationId: "pool", category: "Freezer", status: "Online", notes: "Listed at Pool.", vendorIds: ["appliance-service-station"] },
  { id: "freezer-fr-3", name: "Freezer FR-3", locationId: "pool", category: "Freezer", status: "Online", notes: "Listed at Pool.", vendorIds: ["appliance-service-station"] },
  { id: "freezer-fr-4", name: "Freezer FR-4", locationId: "kitchen", category: "Freezer", status: "Online", notes: "Listed at Kitchen.", vendorIds: ["appliance-service-station"] },
  { id: "freezer-fr-5", name: "Freezer FR-5", locationId: "wine-room", category: "Freezer", status: "Online", notes: "Listed at Wine Room.", vendorIds: ["appliance-service-station"] },
  { id: "garage-door-openers", name: "Garage Door Openers", locationId: "general", category: "Garage Doors", status: "Online", notes: "General garage door opener asset.", vendorIds: ["precision-garage-door"] },
  { id: "generator-lower", name: "Generator Lower", locationId: "outdoor-generator-area", category: "Generator", status: "Online", notes: "Lower generator at Outdoor Generator Area.", vendorIds: ["d-square-energy", "maple-valley-electric"] },
  { id: "generator-upper", name: "Generator Upper", locationId: "outdoor-generator-area", category: "Generator", status: "Online", notes: "Upper generator at Outdoor Generator Area.", vendorIds: ["d-square-energy", "maple-valley-electric"] },
  { id: "golf-simulator", name: "Golf Simulator", locationId: "new-garage", category: "Recreation / AV", status: "Online", notes: "Garage golf simulator clean/inspect recurring task.", vendorIds: ["high-tech-living"] },
  { id: "home-water-filter", name: "Home Water Filter", locationId: "general", category: "Water Filtration", status: "Online", notes: "General home water filter asset.", vendorIds: ["best-plumbing"] },
  { id: "hot-water-storage-tank-1", name: "Hot Water Storage Tank 1", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", status: "Online", notes: "One of twin Viessmann Vitocell 300-V 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"] },
  { id: "hot-water-storage-tank-2", name: "Hot Water Storage Tank 2", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", status: "Online", notes: "Second of twin Viessmann Vitocell 300-V 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"] },
  { id: "hottub", name: "Hottub", locationId: "back-patio-water-side", category: "Spa / Hot Tub", make: "Sundance", model: "880 Series Optima", serial: "00P3LCD-100528521-0315", status: "Online", notes: "Sundance Optima hot tub listed at Back Patio water side.", vendorIds: ["aqua-quip", "krisco-pool-spas"] },
  { id: "hunter-irrigation-controller", name: "Hunter Irrigation Controller", locationId: "general", category: "Irrigation Controller", make: "Hunter", status: "Online", notes: "Hunter irrigation controller asset.", vendorIds: ["advanced-irrigation"] },
  { id: "hvac-ah-1-indoor", name: "HVAC AH-1 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-1 at Mechanical Room 2.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-ah-2-indoor", name: "HVAC AH-2 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-2 at Mechanical Room 2.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-ah-3-indoor", name: "HVAC AH-3 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-3 at Mechanical Room 2.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-ah-4-indoor", name: "HVAC AH-4 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-4 at Mechanical Room 2.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-ah-5-indoor", name: "HVAC AH-5 Indoor", locationId: "mechanical-room", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-5 at Mechanical Room.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-cu-1-outdoor", name: "HVAC CU-1 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-1.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-cu-2-outdoor", name: "HVAC CU-2 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-2.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-cu-3-outdoor", name: "HVAC CU-3 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-3.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-cu-4-outdoor", name: "HVAC CU-4 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-4.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-cu-5-outdoor", name: "HVAC CU-5 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-5.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-hp-1-indoor", name: "HVAC HP-1 Indoor", locationId: "attic", category: "Heat Pump / HVAC", status: "Online", notes: "Indoor HP-1 at Attic.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-hp-123-outdoor", name: "HVAC HP-123 Outdoor", locationId: "outdoor-generator-area", category: "Heat Pump / HVAC", status: "Online", notes: "Outdoor HP-123 at Outdoor Generator Area.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-hp-2-indoor", name: "HVAC HP-2 Indoor", locationId: "attic-2", category: "Heat Pump / HVAC", status: "Online", notes: "Indoor HP-2 at Attic 2.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-hp-3-indoor", name: "HVAC HP-3 Indoor", locationId: "upstairs-laundry-closet", category: "Heat Pump / HVAC", status: "Online", notes: "Indoor HP-3 at Upstairs Laundry Closet.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-hp-4-outdoor-mr", name: "HVAC HP-4 outdoor MR", locationId: "roof", category: "Heat Pump / HVAC", status: "Online", notes: "Outdoor HP-4 MR on Roof.", vendorIds: ["psf-mechanical"] },
  { id: "hvac-hp-5-outdoor", name: "HVAC HP-5 outdoor", locationId: "roof", category: "Heat Pump / HVAC", status: "Online", notes: "Outdoor HP-5 on Roof.", vendorIds: ["psf-mechanical"] },
  { id: "invisible-fence-asset", name: "Invisible Fence", locationId: "vegetable-garden", category: "Pet / Fence", status: "Online", notes: "Invisible Fence asset listed at Vegetable Garden.", vendorIds: ["invisible-fence"] },
  { id: "irrigation-lake-water-meter", name: "Irrigation Lake Water Meter", locationId: "2000", category: "Irrigation / Water Meter", status: "Online", notes: "Irrigation lake water meter. Screenshot shows one sub-asset.", vendorIds: ["advanced-irrigation"] },
  { id: "lynx-grill", name: "Lynx Grill", locationId: "back-patio-water-side", category: "Outdoor Kitchen / Grill", make: "Lynx", status: "Online", notes: "Lynx Grill at Back Patio water side.", vendorIds: ["appliance-service-station"] },
  { id: "marantec-wke", name: "Marantec WKE", locationId: "2000", category: "Access / Gate / Garage Control", make: "Marantec", status: "Online", notes: "Marantec WKE asset listed at 2000.", vendorIds: ["precision-garage-door"] },
  { id: "outdoor-dehumidifier", name: "Outdoor Dehumidifier", locationId: "outdoor-condenser-area", category: "Dehumidification", status: "Online", notes: "Outdoor dehumidifier at Outdoor Condenser Area.", vendorIds: ["psf-mechanical"] },
  { id: "plane-gulfstream-g280-n280cc", name: "Plane Gulfstream G280 N280CC", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N280CC", status: "Online", notes: "Hangar aircraft. Earlier photo clearly shows tail number N280CC.", vendorIds: [] },
  { id: "plane-gulfstream-g280-n755pa", name: "Plane Gulfstream G280 N755PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N755PA", status: "Online", notes: "Hangar aircraft. Tail number inferred from prior Hangar records.", vendorIds: [] },
  { id: "plane-gulfstream-g600-n23pa", name: "Plane Gulfstream G600 N23PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G600", serial: "N23PA", status: "Online", notes: "Hangar aircraft. Tail number inferred from prior Hangar records.", vendorIds: [] },
  { id: "plane-pilatus-pc12-n126al", name: "Plane Pilatus PC12 N126AL", locationId: "hangar", category: "Aircraft", make: "Pilatus", model: "PC12", serial: "N126AL", status: "Online", notes: "Hangar aircraft. Verify tail number because screenshot may show N126AI while prior record says N126AL.", vendorIds: [] },
  { id: "pool", name: "Pool", locationId: "pool", category: "Pool", status: "Offline", notes: "Pool asset shown as Offline in screenshot.", vendorIds: ["psf-mechanical", "aqua-quip", "krisco-pool-spas"] },
  { id: "pool-dehumidifier", name: "Pool Dehumidifier", locationId: "mechanical-room", category: "Pool HVAC / Dehumidification", make: "Desert Aire", model: "LC05R2WBDTDLAED", serial: "4217D25175", status: "Online", notes: "Pool dehumidification system with Desert Aire control/display and SR501 relay.", vendorIds: ["psf-mechanical"] },
  { id: "range-wolf", name: "Range-Wolf", locationId: "kitchen", category: "Range", make: "Wolf", status: "Online", notes: "Wolf range asset in Kitchen. Possible duplicate with wolfe range.", vendorIds: ["appliance-service-station"] },
  { id: "refrigerator-fitness-room", name: "Refrigerator", locationId: "fitness-room", category: "Refrigerator", status: "Online", notes: "Refrigerator listed at Fitness Room.", vendorIds: ["appliance-service-station"] },
  { id: "refrigerator-left", name: "Refrigerator Left", locationId: "kitchen", category: "Refrigerator", status: "Online", notes: "Left refrigerator in Kitchen.", vendorIds: ["appliance-service-station"] },
  { id: "steam-generator-attic", name: "Steam Generator Attic", locationId: "general", category: "Steam Generator", status: "Online", notes: "Steam Generator Attic asset listed at General.", vendorIds: ["psf-mechanical"] },
  { id: "vehicle-audi-e-tron-gt", name: "Vehicle Audi E-Tron GT", locationId: "old-garage", category: "Vehicle", make: "Audi", model: "E-Tron GT", status: "Online", notes: "Vehicle listed at Garage old.", vendorIds: ["les-schwab"] },
  { id: "vehicle-ford-f-150", name: "Vehicle Ford F-150", locationId: "new-garage", category: "Vehicle", make: "Ford", model: "F-150", status: "Online", notes: "Screenshot looked like Ford 1-50; likely Ford F-150.", vendorIds: ["autonation-ford-bellevue", "les-schwab"] },
  { id: "vehicle-mercedes-gl", name: "Vehicle Mercedes GL", locationId: "general", category: "Vehicle", make: "Mercedes", model: "GL", status: "Online", notes: "Vehicle listed at General.", vendorIds: ["les-schwab"] },
  { id: "vehicle-rivian", name: "Vehicle Rivian", locationId: "2000", category: "Vehicle", make: "Rivian", status: "Online", notes: "Vehicle listed at 2000.", vendorIds: ["les-schwab"] },
  { id: "washer-wm-1", name: "Washer WM-1", locationId: "upstairs-laundry-closet", category: "Washer", status: "Online", notes: "Listed at Upstairs Laundry Closet.", vendorIds: ["appliance-service-station"] },
  { id: "washer-wm-2", name: "Washer WM-2", locationId: "pool-changing-room", category: "Washer", status: "Online", notes: "Listed at Pool Changing Room.", vendorIds: ["appliance-service-station"] },
  { id: "washer-wm-3", name: "Washer WM-3", locationId: "house-managers-office", category: "Washer", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"] },
  { id: "west-steam-generator", name: "West Steam Generator", locationId: "west-side-house", category: "Steam Generator", status: "Online", notes: "West Steam Generator listed at West side of House.", vendorIds: ["psf-mechanical"] },
  { id: "wine-chiller", name: "Wine Chiller", locationId: "formal-dining-room", category: "Wine Cooler", status: "Online", notes: "Wine Chiller listed at Formal Dining Room.", vendorIds: ["appliance-service-station", "electromatic-refrigeration"] },
  { id: "wine-fridge", name: "Wine Fridge", locationId: "mechanical-room-2", category: "Wine Fridge", status: "Online", notes: "Wine Fridge listed at Mechanical Room 2.", vendorIds: ["appliance-service-station", "electromatic-refrigeration"] },
  { id: "wine-room-cooler-1", name: "Wine Room Cooler 1", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 1.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] },
  { id: "wine-room-cooler-2", name: "Wine Room Cooler 2", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 2.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] },
  { id: "wine-room-cooler-3", name: "Wine Room Cooler 3", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 3.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] },
  { id: "wine-room-cooler-4", name: "Wine Room Cooler 4", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 4.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] },
  { id: "wolfe-range", name: "wolfe range", locationId: "kitchen", category: "Range", make: "Wolf", status: "Online", notes: "Duplicate/variant naming of Range-Wolf from screenshots. Keep both until confirmed merge.", vendorIds: ["appliance-service-station"] }
];

const defaultLabels: MapLabel[] = [
  { id: "dock-label", name: "Dock", x: 67, y: 8, locationId: "dock" },
  { id: "cobalt-label", name: "Cobalt", x: 84, y: 9, locationId: "cobalt" },
  { id: "seadoo-label", name: "Seadoo", x: 76, y: 13, locationId: "seadoo" },
  { id: "water-trampoline-label", name: "Water Trampoline", x: 25, y: 13, locationId: "water-trampoline" },
  { id: "north-lawn-label", name: "Water Side Lawn North", x: 42, y: 42, locationId: "waterside-lawn-north" },
  { id: "east-lawn-label", name: "East Lawn", x: 84, y: 72, locationId: "east-lawn" },
  { id: "sport-court-label", name: "Sport Court", x: 84, y: 56, locationId: "sport-court" },
  { id: "veggie-boxes-label", name: "Veggie Boxes", x: 84, y: 88, locationId: "veggie-boxes" },
  { id: "new-garage-label", name: "New Garage", x: 69, y: 84, locationId: "new-garage" },
  { id: "old-garage-label", name: "Old Garage", x: 35, y: 86, locationId: "old-garage" },
  { id: "adu-label", name: "ADU", x: 12, y: 67, locationId: "adu" },
  { id: "courtyard-label", name: "Courtyard", x: 45, y: 70, locationId: "courtyard" },
  { id: "trampoline-dog-label", name: "Trampoline/Dog", x: 57, y: 78, locationId: "trampoline-dog" },
  { id: "original-house-label", name: "Original House", x: 36, y: 64, locationId: "original-house" },
  { id: "addition-label", name: "Addition", x: 67, y: 68, locationId: "addition" },
  { id: "hot-tub-label", name: "Hot Tub Sundance", x: 56, y: 77, locationId: "hot-tub-sundance" }
];

const defaultCalendar: CalendarEvent[] = [
  { id: "cal-boat", date: todayISO(), title: "Boat cleaned Tuesday", notes: "Recurring boat cleaning/check." },
  { id: "cal-spa", date: todayISO(), title: "Spa water/filter check", notes: "Check Sundance spa water and filter." },
  { id: "cal-pool", date: todayISO(), title: "Pool chemistry and equipment check", notes: "Record readings and inspect equipment." }
];

const defaultLogs: LogRecord[] = [
  { id: "log-boiler-note", date: todayISO(), title: "Atlas build note", linkedTo: "general", notes: "Use Logs for maintenance notes, field observations, and follow-up items." },
  { id: "log-pool-note", date: todayISO(), title: "Pool/spa note", linkedTo: "pool-equipment", notes: "Use this area to record water readings, service notes, filter/backwash notes, and unusual conditions." }
];

const defaultPhotos: PhotoRecord[] = [];

const defaultVoiceNotes: VoiceRecord[] = [];

const defaultDocuments: DocumentRecord[] = [
  { id: "systems-layout", title: "2000 Systems Layout Draft v1", type: "Diagram / PDF", linkedTo: "mechanical-room", notes: "Main mechanical/electrical/pool/HVAC systems layout draft.", href: "" },
  { id: "pool-record", title: "2000 Pool Equipment Record v2 Corrected", type: "PDF / Equipment Record", linkedTo: "pool-equipment", notes: "Indoor pool equipment path, Desert Aire, pump/filter/UV records.", href: "" },
  { id: "sundance-record", title: "2000 Standalone Sundance Spa Record v1", type: "PDF / Asset Record", linkedTo: "hot-tub-sundance", notes: "Sundance Optima nameplate, electrical, ClearRay, HydroQuip heater, and control details.", href: "" },
  { id: "penthouse-invoice", title: "Penthouse Drapery Invoice 176396", type: "Invoice", linkedTo: "blinds-lutron", notes: "Dated 06/16/2026. Repair one motorized roller shade; two trips and replacement roller shade drive.", href: "" },
  { id: "sunstream-notes", title: "Sunstream Lift Box Photo Notes", type: "Photo Set / Notes", linkedTo: "dock", notes: "Multiple Sunstream lift boxes; newer box for Cobalt; white boxes with solar/battery/control wiring.", href: "" },
  { id: "seadoo-repair", title: "Sea-Doo Repair Invoice / Photos", type: "Invoice / Photos", linkedTo: "craft-seadoo-2024", notes: "After repairs to Luke's Sea-Doo.", href: "" },
  { id: "boat-fluid-analysis", title: "Boat S.O.S. Fluid Analysis", type: "Report / Photo", linkedTo: "craft-cobalt-r-7", notes: "Older boat fluid analysis report from possible kids boat purchase context.", href: "" },
  { id: "property-map", title: "Locked Atlas Property Map", type: "Image", linkedTo: "map", notes: "Current fixed map image used at /atlas-property-map.png.", href: "/atlas-property-map.png" }
];

const defaultProcedures: ProcedureRecord[] = [
  {
    id: "pool-backwash",
    title: "Pool Sand Filter Backwash",
    locationId: "pool-equipment",
    assetId: "pool",
    frequency: "As needed / pressure rise",
    notes: "Use pressure-rise rule, not only calendar timing. Log pressure before and after.",
    steps: [
      "Record current filter pressure before starting.",
      "Confirm valves are set safely for backwash.",
      "Backwash until water runs clear.",
      "Rinse after backwash.",
      "Return valves to normal filter operation.",
      "Record final pressure and any issues."
    ]
  },
  {
    id: "spa-water-filter-check",
    title: "Sundance Spa Water and Filter Check",
    locationId: "hot-tub-sundance",
    assetId: "hottub",
    frequency: "Weekly / as needed",
    notes: "Standalone Sundance Optima spa. Do not treat as part of the indoor pool equipment.",
    steps: [
      "Check water level.",
      "Test water chemistry.",
      "Inspect and clean filter as needed.",
      "Check cabinet area for leaks, corrosion, or tripped indicators.",
      "Log readings and any service needed."
    ]
  },
  {
    id: "sunstream-lift-box-check",
    title: "Sunstream Lift Box Inspection",
    locationId: "dock",
    assetId: "craft-cobalt-r-7",
    frequency: "Weekly / after storms",
    notes: "Multiple Sunstream lift boxes exist. The newer box is for the Cobalt lift.",
    steps: [
      "Confirm which lift box you are inspecting.",
      "Check solar panel condition.",
      "Inspect enclosure, battery, wiring, and control module visually.",
      "Test up/down controls only when safe.",
      "Log issues with notes and photos later."
    ]
  },
  {
    id: "courtyard-reset",
    title: "Courtyard Reset",
    locationId: "courtyard",
    assetId: "",
    frequency: "As needed",
    notes: "Courtyard is separate from trampoline/dog area and the covered walkway itself is not labeled.",
    steps: [
      "Clean seating area.",
      "Straighten chairs around fire pit.",
      "Check fire pit area.",
      "Check lights and planters.",
      "Log broken or missing items."
    ]
  },
  {
    id: "trampoline-dog-cleanup",
    title: "Trampoline/Dog Area Cleanup",
    locationId: "trampoline-dog",
    assetId: "",
    frequency: "Routine",
    notes: "Separate from the courtyard area.",
    steps: [
      "Clean dog area.",
      "Inspect trampoline area.",
      "Check turf or grass condition.",
      "Log anything damaged or unsafe."
    ]
  }
];

function loadData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveData<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function qrUrl(type: string, id: string) {
  const target = "https://www.atlas2000.com/?atlas=" + type + ":" + id;
  return "https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=" + encodeURIComponent(target);
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [locations, setLocations] = useState<LocationRecord[]>(defaultLocations);
  const [assets, setAssets] = useState<AssetRecord[]>(defaultAssets);
  const [vendors, setVendors] = useState<VendorRecord[]>(defaultVendors);
  const [labels, setLabels] = useState<MapLabel[]>(defaultLabels);
  const [calendar, setCalendar] = useState<CalendarEvent[]>(defaultCalendar);
  const [documents, setDocuments] = useState<DocumentRecord[]>(defaultDocuments);
  const [procedures, setProcedures] = useState<ProcedureRecord[]>(defaultProcedures);
  const [logs, setLogs] = useState<LogRecord[]>(defaultLogs);
  const [photos, setPhotos] = useState<PhotoRecord[]>(defaultPhotos);
  const [voiceNotes, setVoiceNotes] = useState<VoiceRecord[]>(defaultVoiceNotes);
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAssets[0].id);
  const [selectedLocationId, setSelectedLocationId] = useState("courtyard");
  const [selectedVendorId, setSelectedVendorId] = useState(defaultVendors[0].id);
  const [assetSearch, setAssetSearch] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask Atlas about an asset, location, vendor, boiler, HVAC unit, pool, spa, vehicle, aircraft, or procedure.");
  const [weather, setWeather] = useState("Loading weather...");
  const [mapEditMode, setMapEditMode] = useState(false);
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const mapAreaRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLocations(loadData(STORE_LOCATIONS, defaultLocations));
    setAssets(loadData(STORE_ASSETS, defaultAssets));
    setVendors(loadData(STORE_VENDORS, defaultVendors));
    setLabels(loadData(STORE_LABELS, defaultLabels));
    setCalendar(loadData(STORE_CALENDAR, defaultCalendar));
    setDocuments(loadData(STORE_DOCUMENTS, defaultDocuments));
    setProcedures(loadData(STORE_PROCEDURES, defaultProcedures));
    setLogs(loadData(STORE_LOGS, defaultLogs));
    setPhotos(loadData(STORE_PHOTOS, defaultPhotos));
    setVoiceNotes(loadData(STORE_VOICE, defaultVoiceNotes));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveData(STORE_LOCATIONS, locations); }, [loaded, locations]);
  useEffect(() => { if (loaded) saveData(STORE_ASSETS, assets); }, [loaded, assets]);
  useEffect(() => { if (loaded) saveData(STORE_VENDORS, vendors); }, [loaded, vendors]);
  useEffect(() => { if (loaded) saveData(STORE_LABELS, labels); }, [loaded, labels]);
  useEffect(() => { if (loaded) saveData(STORE_CALENDAR, calendar); }, [loaded, calendar]);
  useEffect(() => { if (loaded) saveData(STORE_DOCUMENTS, documents); }, [loaded, documents]);
  useEffect(() => { if (loaded) saveData(STORE_PROCEDURES, procedures); }, [loaded, procedures]);
  useEffect(() => { if (loaded) saveData(STORE_LOGS, logs); }, [loaded, logs]);
  useEffect(() => { if (loaded) saveData(STORE_PHOTOS, photos); }, [loaded, photos]);
  useEffect(() => { if (loaded) saveData(STORE_VOICE, voiceNotes); }, [loaded, voiceNotes]);

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=47.57&longitude=-122.22&current=temperature_2m,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto")
      .then((res) => res.json())
      .then((data) => {
        const temp = Math.round(data.current.temperature_2m);
        const humidity = data.current.relative_humidity_2m;
        const wind = Math.round(data.current.wind_speed_10m);
        setWeather(String(temp) + "°F · Humidity " + String(humidity) + "% · Wind " + String(wind) + " mph");
      })
      .catch(() => setWeather("Weather unavailable right now."));
  }, []);

  const selectedAsset = assets.find((item) => item.id === selectedAssetId) || assets[0];
  const selectedLocation = locations.find((item) => item.id === selectedLocationId) || locations[0];
  const selectedVendor = vendors.find((item) => item.id === selectedVendorId) || vendors[0];

  const filteredAssets = useMemo(() => {
    const q = assetSearch.toLowerCase();
    return assets.filter((item) => {
      const text = item.name + " " + item.category + " " + item.notes;
      return text.toLowerCase().includes(q);
    });
  }, [assets, assetSearch]);

  function updateAsset(id: string, patch: Partial<AssetRecord>) {
    setAssets((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateLocation(id: string, patch: Partial<LocationRecord>) {
    setLocations((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateVendor(id: string, patch: Partial<VendorRecord>) {
    setVendors((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateLabel(id: string, patch: Partial<MapLabel>) {
    setLabels((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addMapLabel() {
    const newId = "label-" + Date.now();
    const next: MapLabel = {
      id: newId,
      name: "New Label",
      x: 50,
      y: 50,
      locationId: "general"
    };
    setLabels((rows) => [next, ...rows]);
    setSelectedLocationId("general");
    setMapEditMode(true);
  }

  function removeMapLabel(id: string) {
    setLabels((rows) => rows.filter((row) => row.id !== id));
  }

  function clampMapPercent(value: number) {
    return Math.max(0, Math.min(100, Number(value.toFixed(2))));
  }

  function moveMapLabel(clientX: number, clientY: number, labelId: string) {
    if (!mapAreaRef.current) return;

    const rect = mapAreaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    updateLabel(labelId, {
      x: clampMapPercent(x),
      y: clampMapPercent(y)
    });
  }

  function startLabelDrag(event: React.PointerEvent<HTMLButtonElement>, label: MapLabel) {
    setSelectedLocationId(label.locationId);

    if (!mapEditMode) return;

    event.preventDefault();
    event.stopPropagation();
    setDraggingLabelId(label.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    moveMapLabel(event.clientX, event.clientY, label.id);
  }

  function dragMapLabel(event: React.PointerEvent<HTMLDivElement>) {
    if (!mapEditMode || !draggingLabelId) return;
    moveMapLabel(event.clientX, event.clientY, draggingLabelId);
  }

  function stopLabelDrag() {
    setDraggingLabelId(null);
  }

  function addAsset() {
    const newId = "asset-" + Date.now();
    const next: AssetRecord = {
      id: newId,
      name: "New Asset",
      locationId: "general",
      category: "General",
      status: "Online",
      notes: "New asset added in Atlas.",
      vendorIds: []
    };
    setAssets((rows) => [next, ...rows]);
    setSelectedAssetId(newId);
    setScreen("assets");
  }

  function addCalendarEvent() {
    const next: CalendarEvent = {
      id: "cal-" + Date.now(),
      date: todayISO(),
      title: "New task",
      notes: "Edit this calendar item."
    };
    setCalendar((rows) => [next, ...rows]);
  }

  function addDocument() {
    const newId = "doc-" + Date.now();
    const next: DocumentRecord = {
      id: newId,
      title: "New Document",
      type: "Document",
      linkedTo: "general",
      notes: "New document added in Atlas.",
      href: ""
    };
    setDocuments((rows) => [next, ...rows]);
    setScreen("documents");
  }

  function updateDocument(id: string, patch: Partial<DocumentRecord>) {
    setDocuments((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removeDocument(id: string) {
    setDocuments((rows) => rows.filter((row) => row.id !== id));
  }

  function addProcedure() {
    const newId = "procedure-" + Date.now();
    const next: ProcedureRecord = {
      id: newId,
      title: "New Procedure",
      locationId: "general",
      assetId: "",
      frequency: "As needed",
      notes: "New procedure added in Atlas.",
      steps: ["Add first step here."]
    };
    setProcedures((rows) => [next, ...rows]);
    setScreen("procedures");
  }

  function updateProcedure(id: string, patch: Partial<ProcedureRecord>) {
    setProcedures((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removeProcedure(id: string) {
    setProcedures((rows) => rows.filter((row) => row.id !== id));
  }

  function addLog() {
    const newId = "log-" + Date.now();
    const next: LogRecord = {
      id: newId,
      date: todayISO(),
      title: "New Log",
      linkedTo: "general",
      notes: "New log added in Atlas."
    };
    setLogs((rows) => [next, ...rows]);
    setScreen("logs");
  }

  function updateLog(id: string, patch: Partial<LogRecord>) {
    setLogs((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removeLog(id: string) {
    setLogs((rows) => rows.filter((row) => row.id !== id));
  }

  async function addPhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const nextPhotos: PhotoRecord[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const dataUrl = await fileToDataUrl(file);
      nextPhotos.push({
        id: "photo-" + Date.now() + "-" + String(index),
        date: todayISO(),
        title: file.name || "Atlas Photo",
        linkedTo: "general",
        notes: "New photo uploaded to Atlas.",
        dataUrl
      });
    }
    setPhotos((rows) => [...nextPhotos, ...rows]);
    setScreen("photos");
  }

  function updatePhoto(id: string, patch: Partial<PhotoRecord>) {
    setPhotos((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removePhoto(id: string) {
    setPhotos((rows) => rows.filter((row) => row.id !== id));
  }

  async function addVoiceFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const nextVoiceNotes: VoiceRecord[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const dataUrl = await fileToDataUrl(file);
      nextVoiceNotes.push({
        id: "voice-" + Date.now() + "-" + String(index),
        date: todayISO(),
        title: file.name || "Atlas Voice Note",
        linkedTo: "general",
        notes: "New voice note uploaded to Atlas.",
        dataUrl
      });
    }
    setVoiceNotes((rows) => [...nextVoiceNotes, ...rows]);
    setScreen("voice");
  }

  function updateVoice(id: string, patch: Partial<VoiceRecord>) {
    setVoiceNotes((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function removeVoice(id: string) {
    setVoiceNotes((rows) => rows.filter((row) => row.id !== id));
  }

  function resetAllLocalData() {
    setLocations(defaultLocations);
    setAssets(defaultAssets);
    setVendors(defaultVendors);
    setLabels(defaultLabels);
    setCalendar(defaultCalendar);
    setDocuments(defaultDocuments);
    setProcedures(defaultProcedures);
    setLogs(defaultLogs);
    setPhotos(defaultPhotos);
    setVoiceNotes(defaultVoiceNotes);
    setSelectedAssetId(defaultAssets[0].id);
    setSelectedLocationId("courtyard");
    setSelectedVendorId(defaultVendors[0].id);
  }


  function downloadAtlasBackup() {
    const backup = {
      version: "atlas-local-backup-v1",
      exportedAt: new Date().toISOString(),
      locations,
      assets,
      vendors,
      labels,
      calendar,
      documents,
      procedures,
      logs,
      photos,
      voiceNotes
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "atlas-2000-backup-" + todayISO() + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importAtlasBackupFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (Array.isArray(parsed.locations)) setLocations(parsed.locations);
        if (Array.isArray(parsed.assets)) setAssets(parsed.assets);
        if (Array.isArray(parsed.vendors)) setVendors(parsed.vendors);
        if (Array.isArray(parsed.labels)) setLabels(parsed.labels);
        if (Array.isArray(parsed.calendar)) setCalendar(parsed.calendar);
        if (Array.isArray(parsed.documents)) setDocuments(parsed.documents);
        if (Array.isArray(parsed.procedures)) setProcedures(parsed.procedures);
        if (Array.isArray(parsed.logs)) setLogs(parsed.logs);
        if (Array.isArray(parsed.photos)) setPhotos(parsed.photos);
        if (Array.isArray(parsed.voiceNotes)) setVoiceNotes(parsed.voiceNotes);

        setScreen("dashboard");
        alert("Atlas backup imported.");
      } catch {
        alert("That file was not a valid Atlas backup.");
      }
    };

    reader.readAsText(file);
  }

  function askAtlas() {
    const q = assistantQuestion.toLowerCase();
    if (q.trim().length === 0) {
      setAssistantAnswer("Type a question first.");
      return;
    }

    const allLines: string[] = [];
    assets.forEach((item) => allLines.push("Asset: " + item.name + ". " + item.category + ". " + item.notes));
    locations.forEach((item) => allLines.push("Location: " + item.name + ". " + item.type + ". " + item.notes));
    vendors.forEach((item) => allLines.push("Vendor: " + item.name + ". " + item.category + ". " + item.notes));
    documents.forEach((item) => allLines.push("Document: " + item.title + ". " + item.type + ". " + item.linkedTo + ". " + item.notes));
    procedures.forEach((item) => allLines.push("Procedure: " + item.title + ". " + item.frequency + ". " + item.notes + ". " + item.steps.join(" ")));
    logs.forEach((item) => allLines.push("Log: " + item.title + ". " + item.date + ". " + item.linkedTo + ". " + item.notes));
    photos.forEach((item) => allLines.push("Photo: " + item.title + ". " + item.date + ". " + item.linkedTo + ". " + item.notes));
    voiceNotes.forEach((item) => allLines.push("Voice note: " + item.title + ". " + item.date + ". " + item.linkedTo + ". " + item.notes));

    const words = q.split(" ").filter((word) => word.length > 2);
    const hits = allLines.filter((line) => {
      const low = line.toLowerCase();
      return words.some((word) => low.includes(word));
    }).slice(0, 10);

    if (hits.length === 0) {
      setAssistantAnswer("I did not find that in the local Atlas records yet.");
      return;
    }

    setAssistantAnswer(hits.join("\n\n"));
  }

  return (
    <main style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brandBox}>
          <div style={styles.logoCircle}>A</div>
          <div>
            <div style={styles.brandTitle}>ATLAS</div>
            <div style={styles.brandSubtitle}>2000 Estate Operations</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {screens.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              style={screen === item.id ? { ...styles.navButton, ...styles.navButtonActive } : styles.navButton}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" onClick={addAsset} style={styles.goldButton}>+ New Asset</button>
        <button type="button" onClick={resetAllLocalData} style={styles.resetButton}>Reset Local Data</button>
      </aside>

      <section style={styles.content}>
        {screen === "dashboard" && (
          <div>
            <Header title="Atlas Dashboard" subtitle="Private 2000 estate operations control center." />
            <div style={styles.statGrid}>
              <Stat label="Locations" value={locations.length} />
              <Stat label="Assets" value={assets.length} />
              <Stat label="Vendors" value={vendors.length} />
              <Stat label="Weather" value={weather} />
            </div>

            <div style={styles.gridTwo}>
              <section style={styles.card}>
                <h2 style={styles.h2}>Property Map</h2>
                <p style={styles.muted}>Locked original map image with editable overlay labels.</p>
                <button type="button" onClick={() => setScreen("map")} style={styles.primaryButton}>Open Map</button>
                <div style={styles.mapPreview}>
                  <img src="/atlas-property-map.png" alt="Atlas property map" style={styles.mapImage} />
                </div>
              </section>

              <section style={styles.card}>
                <h2 style={styles.h2}>Priority Records</h2>
                <QuickRecord label="Boiler B-2 New" onClick={() => { setSelectedAssetId("boiler-b-2-new"); setScreen("assets"); }} />
                <QuickRecord label="Pool Dehumidifier" onClick={() => { setSelectedAssetId("pool-dehumidifier"); setScreen("assets"); }} />
                <QuickRecord label="Hottub Sundance" onClick={() => { setSelectedAssetId("hottub"); setScreen("assets"); }} />
                <QuickRecord label="Craft-SeaDoo 2024" onClick={() => { setSelectedAssetId("craft-seadoo-2024"); setScreen("assets"); }} />
              </section>
            </div>
          </div>
        )}

        {screen === "map" && (
          <div>
            <Header title="Property Map" subtitle="The map image stays fixed. Labels are editable overlays." />
            <div style={styles.buttonRow}>
              <button type="button" onClick={() => setMapEditMode(!mapEditMode)} style={styles.primaryButton}>
                {mapEditMode ? "Done Editing Map" : "Edit Map Labels"}
              </button>
              <button type="button" onClick={addMapLabel} style={styles.secondaryButton}>+ Add Label</button>
              <button type="button" onClick={() => setLabels(defaultLabels)} style={styles.secondaryButton}>Reset Labels</button>
            </div>
            {mapEditMode && <p style={styles.muted}>Edit mode is on. Click and drag any map label to move it, then click Done Editing Map.</p>}
            <div style={styles.gridTwo}>
              <div
                ref={mapAreaRef}
                style={styles.mapCard}
                onPointerMove={dragMapLabel}
                onPointerUp={stopLabelDrag}
                onPointerLeave={stopLabelDrag}
              >
                <img src="/atlas-property-map.png" alt="Atlas property map" style={styles.mapImage} />
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => setSelectedLocationId(label.locationId)}
                    onPointerDown={(event) => startLabelDrag(event, label)}
                    style={{
                      ...styles.mapLabel,
                      left: String(label.x) + "%",
                      top: String(label.y) + "%",
                      background: label.locationId === selectedLocationId ? "#caa24a" : "#071d3a",
                      color: label.locationId === selectedLocationId ? "#071d3a" : "#ffffff",
                      cursor: mapEditMode ? "grab" : "pointer"
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>

              <section style={styles.card}>
                <h2 style={styles.h2}>{selectedLocation.name}</h2>
                <p style={styles.kicker}>{selectedLocation.type}</p>
                <textarea
                  value={selectedLocation.notes}
                  onChange={(e) => updateLocation(selectedLocation.id, { notes: e.target.value })}
                  style={styles.textarea}
                />
                <h3 style={styles.h3}>Assets here</h3>
                {assets.filter((asset) => asset.locationId === selectedLocation.id).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => { setSelectedAssetId(asset.id); setScreen("assets"); }}
                    style={styles.listButton}
                  >
                    {asset.name}
                  </button>
                ))}

                {mapEditMode && (
                  <div style={styles.editorBox}>
                    <h3 style={styles.h3}>Edit map labels</h3>
                    {labels.map((label) => (
                      <div key={label.id} style={styles.documentRow}>
                        <label style={styles.label}>Label name</label>
                        <input value={label.name} onChange={(e) => updateLabel(label.id, { name: e.target.value })} style={styles.input} />

                        <label style={styles.label}>Linked location</label>
                        <select value={label.locationId} onChange={(e) => updateLabel(label.id, { locationId: e.target.value })} style={styles.input}>
                          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                        </select>

                        <div style={styles.fieldRow}>
                          <div>
                            <label style={styles.label}>X percent</label>
                            <input type="number" value={label.x} onChange={(e) => updateLabel(label.id, { x: Math.max(0, Math.min(100, Number(e.target.value))) })} style={styles.input} />
                          </div>
                          <div>
                            <label style={styles.label}>Y percent</label>
                            <input type="number" value={label.y} onChange={(e) => updateLabel(label.id, { y: Math.max(0, Math.min(100, Number(e.target.value))) })} style={styles.input} />
                          </div>
                        </div>

                        <button type="button" onClick={() => removeMapLabel(label.id)} style={styles.deleteButton}>Delete Label</button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {screen === "locations" && (
          <div>
            <Header title="Locations" subtitle="Clickable and editable estate location records." />
            <div style={styles.gridTwo}>
              <section style={styles.card}>
                {locations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setSelectedLocationId(location.id)}
                    style={location.id === selectedLocationId ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
                  >
                    <strong>{location.name}</strong>
                    <span style={styles.smallMuted}>{location.type}</span>
                  </button>
                ))}
              </section>

              <section style={styles.card}>
                <h2 style={styles.h2}>{selectedLocation.name}</h2>
                <label style={styles.label}>Name</label>
                <input value={selectedLocation.name} onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })} style={styles.input} />
                <label style={styles.label}>Type</label>
                <input value={selectedLocation.type} onChange={(e) => updateLocation(selectedLocation.id, { type: e.target.value })} style={styles.input} />
                <label style={styles.label}>Notes</label>
                <textarea value={selectedLocation.notes} onChange={(e) => updateLocation(selectedLocation.id, { notes: e.target.value })} style={styles.textarea} />
              </section>
            </div>
          </div>
        )}

        {screen === "assets" && (
          <div>
            <Header title="Assets" subtitle="Equipment, systems, vehicles, aircraft, appliances, and linked vendors." />
            <div style={styles.gridTwo}>
              <section style={styles.card}>
                <input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search assets..." style={styles.input} />
                <div style={styles.scrollList}>
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetId(asset.id)}
                      style={asset.id === selectedAssetId ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
                    >
                      <strong>{asset.name}</strong>
                      <span style={styles.smallMuted}>{asset.category} · {asset.status}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section style={styles.card}>
                <h2 style={styles.h2}>{selectedAsset.name}</h2>
                <p style={styles.kicker}>{selectedAsset.category}</p>

                <div style={styles.qrRow}>
                  <img src={qrUrl("asset", selectedAsset.id)} alt="Asset QR code" style={styles.qrImage} />
                  <div>
                    <strong>QR Tag</strong>
                    <p style={styles.muted}>asset:{selectedAsset.id}</p>
                  </div>
                </div>

                <label style={styles.label}>Name</label>
                <input value={selectedAsset.name} onChange={(e) => updateAsset(selectedAsset.id, { name: e.target.value })} style={styles.input} />

                <label style={styles.label}>Location</label>
                <select value={selectedAsset.locationId} onChange={(e) => updateAsset(selectedAsset.id, { locationId: e.target.value })} style={styles.input}>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>

                <label style={styles.label}>Status</label>
                <select value={selectedAsset.status} onChange={(e) => updateAsset(selectedAsset.id, { status: e.target.value as Status })} style={styles.input}>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Monitor">Monitor</option>
                </select>

                <label style={styles.label}>Make</label>
                <input value={selectedAsset.make || ""} onChange={(e) => updateAsset(selectedAsset.id, { make: e.target.value })} style={styles.input} />

                <label style={styles.label}>Model</label>
                <input value={selectedAsset.model || ""} onChange={(e) => updateAsset(selectedAsset.id, { model: e.target.value })} style={styles.input} />

                <label style={styles.label}>Serial</label>
                <input value={selectedAsset.serial || ""} onChange={(e) => updateAsset(selectedAsset.id, { serial: e.target.value })} style={styles.input} />

                <label style={styles.label}>Notes</label>
                <textarea value={selectedAsset.notes} onChange={(e) => updateAsset(selectedAsset.id, { notes: e.target.value })} style={styles.textarea} />

                <h3 style={styles.h3}>Linked Vendors</h3>
                {vendors.filter((vendor) => selectedAsset.vendorIds.includes(vendor.id)).map((vendor) => (
                  <button key={vendor.id} type="button" onClick={() => { setSelectedVendorId(vendor.id); setScreen("vendors"); }} style={styles.listButton}>
                    {vendor.name}
                  </button>
                ))}
              </section>
            </div>
          </div>
        )}

        {screen === "vendors" && (
          <div>
            <Header title="Vendors" subtitle="Vendor directory linked to asset records." />
            <div style={styles.gridTwo}>
              <section style={styles.card}>
                {vendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(vendor.id)}
                    style={vendor.id === selectedVendorId ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
                  >
                    <strong>{vendor.name}</strong>
                    <span style={styles.smallMuted}>{vendor.category}</span>
                  </button>
                ))}
              </section>

              <section style={styles.card}>
                <h2 style={styles.h2}>{selectedVendor.name}</h2>
                <label style={styles.label}>Name</label>
                <input value={selectedVendor.name} onChange={(e) => updateVendor(selectedVendor.id, { name: e.target.value })} style={styles.input} />
                <label style={styles.label}>Category</label>
                <input value={selectedVendor.category} onChange={(e) => updateVendor(selectedVendor.id, { category: e.target.value })} style={styles.input} />
                <label style={styles.label}>Phone</label>
                <input value={selectedVendor.phone || ""} onChange={(e) => updateVendor(selectedVendor.id, { phone: e.target.value })} style={styles.input} />
                <label style={styles.label}>Email</label>
                <input value={selectedVendor.email || ""} onChange={(e) => updateVendor(selectedVendor.id, { email: e.target.value })} style={styles.input} />
                <label style={styles.label}>Address</label>
                <input value={selectedVendor.address || ""} onChange={(e) => updateVendor(selectedVendor.id, { address: e.target.value })} style={styles.input} />
                <label style={styles.label}>Notes</label>
                <textarea value={selectedVendor.notes} onChange={(e) => updateVendor(selectedVendor.id, { notes: e.target.value })} style={styles.textarea} />

                <h3 style={styles.h3}>Linked Assets</h3>
                {assets.filter((asset) => asset.vendorIds.includes(selectedVendor.id)).map((asset) => (
                  <button key={asset.id} type="button" onClick={() => { setSelectedAssetId(asset.id); setScreen("assets"); }} style={styles.listButton}>
                    {asset.name}
                  </button>
                ))}
              </section>
            </div>
          </div>
        )}

        {screen === "calendar" && (
          <div>
            <Header title="Calendar" subtitle="Simple editable work calendar." />
            <section style={styles.card}>
              <button type="button" onClick={addCalendarEvent} style={styles.primaryButton}>+ Add Today Task</button>
              {calendar.map((event) => (
                <div key={event.id} style={styles.calendarRow}>
                  <input value={event.date} onChange={(e) => setCalendar((rows) => rows.map((row) => row.id === event.id ? { ...row, date: e.target.value } : row))} style={styles.input} />
                  <input value={event.title} onChange={(e) => setCalendar((rows) => rows.map((row) => row.id === event.id ? { ...row, title: e.target.value } : row))} style={styles.input} />
                  <input value={event.notes} onChange={(e) => setCalendar((rows) => rows.map((row) => row.id === event.id ? { ...row, notes: e.target.value } : row))} style={styles.input} />
                </div>
              ))}
            </section>
          </div>
        )}

        {screen === "weather" && (
          <div>
            <Header title="Weather" subtitle="Live exterior-work weather panel." />
            <section style={styles.card}>
              <h2 style={styles.h2}>2000 / Mercer Island Area</h2>
              <p style={styles.weatherText}>{weather}</p>
            </section>
          </div>
        )}

        {screen === "documents" && (
          <div>
            <Header title="Documents" subtitle="Manuals, invoices, diagrams, photo records, PDFs, and file links." />
            <section style={styles.card}>
              <button type="button" onClick={addDocument} style={styles.primaryButton}>+ Add Document</button>
              {documents.map((doc) => (
                <div key={doc.id} style={styles.documentRow}>
                  <div style={styles.documentHeader}>
                    <strong>{doc.title}</strong>
                    <button type="button" onClick={() => removeDocument(doc.id)} style={styles.deleteButton}>Delete</button>
                  </div>

                  <label style={styles.label}>Title</label>
                  <input value={doc.title} onChange={(e) => updateDocument(doc.id, { title: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Type</label>
                  <input value={doc.type} onChange={(e) => updateDocument(doc.id, { type: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Linked To</label>
                  <input value={doc.linkedTo} onChange={(e) => updateDocument(doc.id, { linkedTo: e.target.value })} style={styles.input} />

                  <label style={styles.label}>File URL or public path</label>
                  <input value={doc.href} onChange={(e) => updateDocument(doc.id, { href: e.target.value })} placeholder="/filename.pdf or https://..." style={styles.input} />

                  <label style={styles.label}>Notes</label>
                  <textarea value={doc.notes} onChange={(e) => updateDocument(doc.id, { notes: e.target.value })} style={styles.textarea} />

                  {doc.href.trim().length > 0 && (
                    <a href={doc.href} target="_blank" rel="noreferrer" style={styles.openLink}>Open Document</a>
                  )}
                </div>
              ))}
            </section>
          </div>
        )}

        {screen === "procedures" && (
          <div>
            <Header title="Procedures" subtitle="Step-by-step operating procedures linked to locations and assets." />
            <section style={styles.card}>
              <button type="button" onClick={addProcedure} style={styles.primaryButton}>+ Add Procedure</button>
              {procedures.map((procedure) => (
                <div key={procedure.id} style={styles.documentRow}>
                  <div style={styles.documentHeader}>
                    <strong>{procedure.title}</strong>
                    <button type="button" onClick={() => removeProcedure(procedure.id)} style={styles.deleteButton}>Delete</button>
                  </div>

                  <label style={styles.label}>Title</label>
                  <input value={procedure.title} onChange={(e) => updateProcedure(procedure.id, { title: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Location</label>
                  <select value={procedure.locationId} onChange={(e) => updateProcedure(procedure.id, { locationId: e.target.value })} style={styles.input}>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>

                  <label style={styles.label}>Asset</label>
                  <select value={procedure.assetId} onChange={(e) => updateProcedure(procedure.id, { assetId: e.target.value })} style={styles.input}>
                    <option value="">No asset / location only</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                  </select>

                  <label style={styles.label}>Frequency</label>
                  <input value={procedure.frequency} onChange={(e) => updateProcedure(procedure.id, { frequency: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Notes</label>
                  <textarea value={procedure.notes} onChange={(e) => updateProcedure(procedure.id, { notes: e.target.value })} style={styles.textarea} />

                  <label style={styles.label}>Steps, one per line</label>
                  <textarea
                    value={procedure.steps.join("\n")}
                    onChange={(e) => updateProcedure(procedure.id, { steps: e.target.value.split("\n").filter((step) => step.trim().length > 0) })}
                    style={styles.textareaLarge}
                  />
                </div>
              ))}
            </section>
          </div>
        )}

        {screen === "logs" && (
          <div>
            <Header title="Logs" subtitle="Maintenance notes, field observations, follow-up items, and service history." />
            <section style={styles.card}>
              <button type="button" onClick={addLog} style={styles.primaryButton}>+ Add Log</button>
              {logs.map((log) => (
                <div key={log.id} style={styles.documentRow}>
                  <div style={styles.documentHeader}>
                    <strong>{log.title}</strong>
                    <button type="button" onClick={() => removeLog(log.id)} style={styles.deleteButton}>Delete</button>
                  </div>

                  <label style={styles.label}>Date</label>
                  <input value={log.date} onChange={(e) => updateLog(log.id, { date: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Title</label>
                  <input value={log.title} onChange={(e) => updateLog(log.id, { title: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Linked To</label>
                  <input value={log.linkedTo} onChange={(e) => updateLog(log.id, { linkedTo: e.target.value })} placeholder="asset, location, vendor, document, or procedure" style={styles.input} />

                  <label style={styles.label}>Notes</label>
                  <textarea value={log.notes} onChange={(e) => updateLog(log.id, { notes: e.target.value })} style={styles.textareaLarge} />
                </div>
              ))}
            </section>
          </div>
        )}

        {screen === "photos" && (
          <div>
            <Header title="Photos" subtitle="Photo records saved locally in this browser and linked to assets, locations, vendors, documents, procedures, or logs." />
            <section style={styles.card}>
              <label style={styles.uploadButton}>
                + Upload Photos
                <input type="file" accept="image/*" multiple onChange={(e) => addPhotoFiles(e.target.files)} style={styles.hiddenInput} />
              </label>

              {photos.length === 0 && (
                <p style={styles.muted}>No photos uploaded yet. Use Upload Photos to add equipment photos, invoice screenshots, map notes, repair photos, or site condition pictures.</p>
              )}

              <div style={styles.photoGrid}>
                {photos.map((photo) => (
                  <div key={photo.id} style={styles.photoCard}>
                    <img src={photo.dataUrl} alt={photo.title} style={styles.photoImage} />
                    <div style={styles.documentHeader}>
                      <strong>{photo.title}</strong>
                      <button type="button" onClick={() => removePhoto(photo.id)} style={styles.deleteButton}>Delete</button>
                    </div>

                    <label style={styles.label}>Date</label>
                    <input value={photo.date} onChange={(e) => updatePhoto(photo.id, { date: e.target.value })} style={styles.input} />

                    <label style={styles.label}>Title</label>
                    <input value={photo.title} onChange={(e) => updatePhoto(photo.id, { title: e.target.value })} style={styles.input} />

                    <label style={styles.label}>Linked To</label>
                    <input value={photo.linkedTo} onChange={(e) => updatePhoto(photo.id, { linkedTo: e.target.value })} placeholder="asset, location, vendor, document, procedure, or log" style={styles.input} />

                    <label style={styles.label}>Notes</label>
                    <textarea value={photo.notes} onChange={(e) => updatePhoto(photo.id, { notes: e.target.value })} style={styles.textarea} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}


        {screen === "voice" && (
          <div>
            <Header title="Voice Notes" subtitle="Audio notes saved locally in this browser and linked to assets, locations, vendors, documents, procedures, logs, or photos." />
            <section style={styles.card}>
              <label style={styles.uploadButton}>
                + Upload Voice Notes
                <input type="file" accept="audio/*" multiple onChange={(e) => addVoiceFiles(e.target.files)} style={styles.hiddenInput} />
              </label>

              {voiceNotes.length === 0 && (
                <p style={styles.muted}>No voice notes uploaded yet. Record a voice memo on your phone, then upload the audio file here.</p>
              )}

              {voiceNotes.map((voice) => (
                <div key={voice.id} style={styles.documentRow}>
                  <div style={styles.documentHeader}>
                    <strong>{voice.title}</strong>
                    <button type="button" onClick={() => removeVoice(voice.id)} style={styles.deleteButton}>Delete</button>
                  </div>

                  <audio controls src={voice.dataUrl} style={styles.audioPlayer} />

                  <label style={styles.label}>Date</label>
                  <input value={voice.date} onChange={(e) => updateVoice(voice.id, { date: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Title</label>
                  <input value={voice.title} onChange={(e) => updateVoice(voice.id, { title: e.target.value })} style={styles.input} />

                  <label style={styles.label}>Linked To</label>
                  <input value={voice.linkedTo} onChange={(e) => updateVoice(voice.id, { linkedTo: e.target.value })} placeholder="asset, location, vendor, document, procedure, log, or photo" style={styles.input} />

                  <label style={styles.label}>Notes / Transcript</label>
                  <textarea value={voice.notes} onChange={(e) => updateVoice(voice.id, { notes: e.target.value })} style={styles.textarea} />
                </div>
              ))}
            </section>
          </div>
        )}



        {screen === "team" && (
          <div>
            <Header title="Team" subtitle="Team access plan and role notes. Login stays off for now." />
            <div style={styles.gridTwo}>
              <section style={styles.card}>
                <h2 style={styles.h2}>Access Roles</h2>
                <div style={styles.documentRow}>
                  <strong>Owner / Admin</strong>
                  <p style={styles.muted}>Full Atlas access when login and database syncing are added later.</p>
                </div>
                <div style={styles.documentRow}>
                  <strong>Estate Manager</strong>
                  <p style={styles.muted}>Daily operating access for assets, vendors, documents, procedures, logs, photos, voice notes, calendar, and backups.</p>
                </div>
                <div style={styles.documentRow}>
                  <strong>Maintenance / Grounds</strong>
                  <p style={styles.muted}>Future limited access for assigned locations, procedures, tasks, and field notes.</p>
                </div>
                <div style={styles.documentRow}>
                  <strong>Vendors</strong>
                  <p style={styles.muted}>Future temporary access by QR tag, asset, location, or assigned work order.</p>
                </div>
              </section>

              <section style={styles.card}>
                <h2 style={styles.h2}>Security Notes</h2>
                <p style={styles.muted}>No login screen is active right now. Atlas is being built as a private operating manual first.</p>
                <p style={styles.muted}>Do not store raw passwords, gate codes, access codes, PINs, private emails, or owner credentials in normal Atlas records.</p>
                <p style={styles.muted}>When database syncing is added, this page becomes the place for roles, permissions, and user access rules.</p>
              </section>
            </div>
          </div>
        )}

        {screen === "backup" && (
          <div>
            <Header title="Backup" subtitle="Export or restore the Atlas records saved in this browser before we move to database syncing." />
            <section style={styles.card}>
              <h2 style={styles.h2}>Local Atlas Backup</h2>
              <p style={styles.muted}>This exports the current local Atlas records, including assets, locations, vendors, map labels, calendar, documents, procedures, logs, photos, and voice notes.</p>

              <div style={styles.buttonRow}>
                <button type="button" onClick={downloadAtlasBackup} style={styles.primaryButton}>Download Backup File</button>
                <label style={styles.secondaryButton}>
                  Import Backup File
                  <input type="file" accept="application/json" onChange={(e) => importAtlasBackupFile(e.target.files)} style={styles.hiddenInput} />
                </label>
              </div>

              <div style={styles.editorBox}>
                <h3 style={styles.h3}>Current local record counts</h3>
                <p style={styles.muted}>Locations: {locations.length}</p>
                <p style={styles.muted}>Assets: {assets.length}</p>
                <p style={styles.muted}>Vendors: {vendors.length}</p>
                <p style={styles.muted}>Documents: {documents.length}</p>
                <p style={styles.muted}>Procedures: {procedures.length}</p>
                <p style={styles.muted}>Logs: {logs.length}</p>
                <p style={styles.muted}>Photos: {photos.length}</p>
                <p style={styles.muted}>Voice Notes: {voiceNotes.length}</p>
                <p style={styles.muted}>Map Labels: {labels.length}</p>
              </div>
            </section>
          </div>
        )}

        {screen === "assistant" && (
          <div>
            <Header title="AI Assistant" subtitle="Local Atlas search across saved records." />
            <section style={styles.card}>
              <textarea value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} placeholder="Ask about boilers, HVAC, Sundance, Cobalt, Sea-Doo, pool, vendors, locations, documents, procedures, logs, photos, or voice notes..." style={styles.textareaLarge} />
              <button type="button" onClick={askAtlas} style={styles.primaryButton}>Ask Atlas</button>
              <pre style={styles.answerBox}>{assistantAnswer}</pre>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header style={styles.header}>
      <h1 style={styles.h1}>{title}</h1>
      <p style={styles.muted}>{subtitle}</p>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.stat}>
      <span style={styles.smallMuted}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function QuickRecord({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={styles.listButton}>
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "270px 1fr",
    background: "#f5f7fb",
    color: "#10213d",
    fontFamily: "Arial, Helvetica, sans-serif"
  },
  sidebar: {
    background: "#071d3a",
    color: "#ffffff",
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 18
  },
  brandBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 10
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    border: "2px solid #caa24a",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 26
  },
  brandTitle: {
    fontWeight: 900,
    letterSpacing: 3,
    fontSize: 22
  },
  brandSubtitle: {
    color: "#d8bd74",
    fontSize: 11,
    letterSpacing: 1
  },
  nav: {
    display: "grid",
    gap: 8
  },
  navButton: {
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    borderRadius: 12,
    padding: "12px 14px",
    textAlign: "left",
    fontWeight: 800,
    cursor: "pointer"
  },
  navButtonActive: {
    background: "#caa24a",
    color: "#071d3a"
  },
  goldButton: {
    border: 0,
    background: "#caa24a",
    color: "#071d3a",
    borderRadius: 12,
    padding: "12px 14px",
    fontWeight: 900,
    cursor: "pointer"
  },
  resetButton: {
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    color: "#ffffff",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer"
  },
  content: {
    padding: 28,
    minWidth: 0
  },
  header: {
    marginBottom: 20
  },
  h1: {
    margin: 0,
    fontSize: 36,
    letterSpacing: -1
  },
  h2: {
    margin: "0 0 10px 0",
    fontSize: 26
  },
  h3: {
    margin: "20px 0 10px 0",
    fontSize: 18
  },
  muted: {
    color: "#667085",
    lineHeight: 1.5
  },
  smallMuted: {
    display: "block",
    color: "#667085",
    fontSize: 13,
    marginTop: 4
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 18
  },
  stat: {
    background: "#ffffff",
    border: "1px solid #e4e8f0",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)"
  },
  statValue: {
    display: "block",
    fontSize: 28,
    marginTop: 6
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 1fr) minmax(360px, 440px)",
    gap: 18,
    alignItems: "start"
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e4e8f0",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)"
  },
  primaryButton: {
    border: 0,
    background: "#071d3a",
    color: "#ffffff",
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 10,
    marginBottom: 12
  },
  mapPreview: {
    marginTop: 14,
    borderRadius: 14,
    overflow: "hidden",
    background: "#071d3a"
  },
  mapCard: {
    position: "relative",
    background: "#071d3a",
    border: "1px solid #e4e8f0",
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 500,
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)"
  },
  mapImage: {
    width: "100%",
    display: "block"
  },
  mapLabel: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "2px solid #ffffff",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  listButton: {
    width: "100%",
    border: "1px solid #e4e8f0",
    background: "#ffffff",
    color: "#10213d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 800
  },
  selectedListButton: {
    border: "1px solid #caa24a",
    background: "#fff7df"
  },
  scrollList: {
    maxHeight: "calc(100vh - 190px)",
    overflow: "auto",
    paddingRight: 4
  },
  input: {
    width: "100%",
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  textareaLarge: {
    width: "100%",
    minHeight: 140,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 900,
    color: "#667085",
    marginBottom: 5
  },
  kicker: {
    color: "#caa24a",
    fontWeight: 900,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1
  },
  qrRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    border: "1px solid #e4e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    background: "#f8fafc"
  },
  qrImage: {
    width: 92,
    height: 92,
    borderRadius: 8,
    border: "1px solid #e4e8f0",
    background: "#ffffff"
  },
  calendarRow: {
    display: "grid",
    gridTemplateColumns: "150px 1fr 1fr",
    gap: 10,
    marginBottom: 10
  },
  documentRow: {
    border: "1px solid #e4e8f0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    background: "#ffffff"
  },
  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12
  },
  deleteButton: {
    border: "1px solid #fecdca",
    background: "#fff5f5",
    color: "#b42318",
    borderRadius: 10,
    padding: "7px 10px",
    fontWeight: 900,
    cursor: "pointer"
  },
  openLink: {
    display: "inline-block",
    background: "#071d3a",
    color: "#ffffff",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 900,
    textDecoration: "none"
  },

  uploadButton: {
    display: "inline-block",
    border: 0,
    background: "#071d3a",
    color: "#ffffff",
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 10,
    marginBottom: 12
  },
  hiddenInput: {
    display: "none"
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginTop: 12
  },
  photoCard: {
    border: "1px solid #e4e8f0",
    borderRadius: 14,
    padding: 14,
    background: "#ffffff"
  },
  photoImage: {
    width: "100%",
    maxHeight: 280,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid #e4e8f0",
    marginBottom: 12,
    background: "#f8fafc"
  },
  audioPlayer: {
    width: "100%",
    marginBottom: 14
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14
  },
  secondaryButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#10213d",
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 10,
    marginBottom: 12
  },
  editorBox: {
    border: "1px solid #e4e8f0",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    background: "#f8fafc"
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },
  weatherText: {
    fontSize: 34,
    fontWeight: 900
  },
  answerBox: {
    whiteSpace: "pre-wrap",
    background: "#071d3a",
    color: "#ffffff",
    borderRadius: 14,
    padding: 16,
    lineHeight: 1.5
  }
};
