"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Screen =
  | "dashboard"
  | "map"
  | "locations"
  | "assets"
  | "history"
  | "vendors"
  | "documents"
  | "calendar"
  | "weather"
  | "assistant"
  | "blank"
  | "procedures";

type Status = "Online" | "Offline" | "Seasonal" | "Monitor";
type ServiceStatus = "Open" | "Scheduled" | "Completed" | "Monitor";
type DocumentType = "Photo" | "Invoice" | "Manual" | "Warranty" | "Note" | "Other";
type CalendarSource = "Atlas" | "Outlook" | "Apple" | "Google" | "Other";

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  notes: string;
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
  assetId?: string;
  vendorId?: string;
  serviceId?: string;
  source?: CalendarSource;
  externalLink?: string;
};

type ServiceHistoryRecord = {
  id: string;
  date: string;
  assetId: string;
  vendorId: string;
  title: string;
  status: ServiceStatus;
  cost?: string;
  notes: string;
};

type DocumentRecord = {
  id: string;
  date: string;
  title: string;
  type: DocumentType;
  assetId?: string;
  serviceId?: string;
  vendorId?: string;
  locationId?: string;
  url?: string;
  fileName?: string;
  fileDataUrl?: string;
  mimeType?: string;
  notes: string;
};

const STORE_ASSETS = "atlas_2000_assets_safe_v1";
const STORE_LOCATIONS = "atlas_2000_locations_safe_v1";
const STORE_VENDORS = "atlas_2000_vendors_safe_v1";
const STORE_LABELS = "atlas_2000_labels_safe_v1";
const STORE_CALENDAR = "atlas_2000_calendar_safe_v1";
const STORE_SERVICE_HISTORY = "atlas_2000_service_history_safe_v1";
const STORE_DOCUMENTS = "atlas_2000_documents_safe_v1";

const screens: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "map", label: "Map" },
  { id: "locations", label: "Locations" },
  { id: "assets", label: "Assets" },
  { id: "history", label: "Service History" },
  { id: "vendors", label: "Vendors" },
  { id: "documents", label: "Documents / Photos" },
  { id: "calendar", label: "Calendar" },
  { id: "weather", label: "Weather" },
  { id: "assistant", label: "AI Assistant" },
  { id: "blank", label: "Blank Canvas" },
  { id: "procedures", label: "Procedures" }
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toISODateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function cleanId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function asset(row: Partial<AssetRecord> & { id: string; name: string; locationId: string; category: string }): AssetRecord {
  return {
    status: "Online",
    notes: "",
    vendorIds: [],
    ...row
  };
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
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", notes: "Courtyard patio with chairs/fire pit." },
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
  { id: "psf-mechanical", name: "P.S.F / PSF Mechanical", category: "HVAC / Mechanical", phone: "", email: "", address: "", notes: "HVAC, boiler, hydronic, Desert Aire, pool mechanical, and mechanical vendor reference." },
  { id: "penthouse-drapery", name: "Penthouse Drapery", category: "Drapery / Roller Shades", phone: "206-292-8336", email: "accounting@penthousedrapery.com", address: "4033 16th Ave SW Suite A, Seattle, WA 98106", notes: "Invoice 176396 dated 06/16/2026. Motorized roller shade repair linked to Blinds Lutron." },
  { id: "advanced-irrigation", name: "Advanced Irrigation", category: "Irrigation", phone: "", email: "", address: "", notes: "Irrigation activation/deactivation. Linked to Hunter controllers and irrigation lake water meter." },
  { id: "sunstream", name: "Sunstream", category: "Boat Lift Equipment", phone: "", email: "", address: "", notes: "Lift boxes, controls, batteries, solar panels, lift components." },
  { id: "seattle-boat", name: "Seattle Boat", category: "Boat Service", phone: "", email: "", address: "", notes: "Cobalt winterization, de-winterization, repair, and service." },
  { id: "seadoo-service", name: "Sea-Doo Service", category: "PWC Service", phone: "", email: "", address: "", notes: "Sea-Doo service and repair records." },
  { id: "i90-motorsports", name: "I-90 Motorsports", category: "Motorsports", phone: "", email: "", address: "", notes: "Powersports / Sea-Doo related vendor record." },
  { id: "appliance-service-station", name: "Appliance Service Station", category: "Appliance Service", phone: "", email: "", address: "", notes: "General appliance service vendor record." },
  { id: "electromatic-refrigeration", name: "Electromatic Refrigeration", category: "Refrigeration", phone: "", email: "", address: "", notes: "Refrigeration and wine cooling vendor record." },
  { id: "precision-garage-door", name: "Precision Garage Door", category: "Garage Doors", phone: "", email: "", address: "", notes: "Garage door and opener vendor record." },
  { id: "best-plumbing", name: "Best Plumbing", category: "Plumbing", phone: "", email: "", address: "", notes: "Plumbing vendor record." },
  { id: "american-leak-detection", name: "American Leak Detection", category: "Leak Detection", phone: "", email: "", address: "", notes: "Leak detection vendor record." },
  { id: "maple-valley-electric", name: "Maple Valley Electric", category: "Electrical", phone: "", email: "", address: "", notes: "Electrical vendor record." },
  { id: "d-square-energy", name: "D Square Energy", category: "Energy / Electrical", phone: "", email: "", address: "", notes: "Generator/energy/electrical vendor record." },
  { id: "aqua-quip", name: "Aqua Quip", category: "Pool / Spa", phone: "", email: "", address: "", notes: "Pool/spa supplies or service vendor record." },
  { id: "krisco-pool-spas", name: "Krisco Pool and Spas", category: "Pool / Spa", phone: "", email: "", address: "", notes: "Pool/spa vendor record." },
  { id: "high-tech-living", name: "High Tech Living", category: "Smart Home / AV", phone: "", email: "", address: "", notes: "Smart home, AV, and golf simulator vendor record." },
  { id: "invisible-fence", name: "Invisible Fence", category: "Pet / Fence", phone: "", email: "", address: "", notes: "Dog/fence vendor record." },
  { id: "les-schwab", name: "Les Schwab", category: "Vehicle / Tires", phone: "", email: "", address: "", notes: "Vehicle/tire vendor record." },
  { id: "autonation-ford-bellevue", name: "AutoNation Ford Bellevue", category: "Vehicle Service", phone: "", email: "", address: "", notes: "Ford/vehicle service vendor record." }
];

const defaultAssets: AssetRecord[] = [
  asset({ id: "blinds-hunter-douglas", name: "Blinds Hunter Douglas", locationId: "elyses-room", category: "Blinds / Shades", make: "Hunter Douglas", notes: "Asset listed at Elyse's Room." }),
  asset({ id: "blinds-lutron", name: "Blinds Lutron", locationId: "general", category: "Blinds / Motorized Shades", make: "Lutron", notes: "Penthouse Drapery invoice 176396 links to this motorized roller shade asset.", vendorIds: ["penthouse-drapery"] }),
  asset({ id: "boiler-b-1", name: "Boiler B-1", locationId: "general", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", notes: "Year built 2018. MAWP 60 PSI. Max water temp 210°F.", vendorIds: ["psf-mechanical"] }),
  asset({ id: "boiler-b-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", notes: "Boiler B-2 in Mechanical Room.", vendorIds: ["psf-mechanical"] }),
  asset({ id: "boiler-b-2-new", name: "Boiler B-2 New", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", notes: "Year built 2025. MAWP 60 PSI. Max temp 210°F. Heating surface 31.99 sq ft. Relief capacity 255.9 lb/hr. CRN R1497.5C.", vendorIds: ["psf-mechanical"] }),
  asset({ id: "craft-cobalt-r-7", name: "Craft-Cobalt R-7", locationId: "dock", category: "Boat", make: "Cobalt", notes: "Cobalt boat listed at Dock.", vendorIds: ["seattle-boat", "sunstream"] }),
  asset({ id: "craft-seadoo-2024", name: "Craft-SeaDoo 2024", locationId: "dock", category: "PWC", make: "Sea-Doo", notes: "2024 Sea-Doo listed at Dock. Link repair/service photos and invoices here.", vendorIds: ["seadoo-service", "i90-motorsports"] }),
  asset({ id: "dishwasher-dw-1", name: "Dishwasher DW-1", locationId: "fitness-room", category: "Dishwasher", vendorIds: ["appliance-service-station"] }),
  asset({ id: "dishwasher-dw-2", name: "Dishwasher DW-2", locationId: "house-managers-office", category: "Dishwasher", vendorIds: ["appliance-service-station"] }),
  asset({ id: "dishwasher-dw-3-right", name: "Dishwasher DW-3 Right", locationId: "kitchen", category: "Dishwasher", vendorIds: ["appliance-service-station"] }),
  asset({ id: "dishwasher-dw-4-left", name: "Dishwasher DW-4 Left", locationId: "kitchen", category: "Dishwasher", vendorIds: ["appliance-service-station"] }),
  asset({ id: "dryer-dr-1", name: "Dryer DR-1", locationId: "upstairs-laundry-closet", category: "Dryer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "dryer-dr-2", name: "Dryer DR-2", locationId: "pool-changing-room", category: "Dryer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "dryer-dr-3", name: "Dryer DR-3", locationId: "house-managers-office", category: "Dryer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "flologic", name: "FloLogic", locationId: "general", category: "Water Shutoff / Leak Protection", make: "FloLogic", notes: "Whole-home water monitoring / automatic shutoff asset.", vendorIds: ["best-plumbing", "american-leak-detection"] }),
  asset({ id: "freezer-fr-1", name: "Freezer FR-1", locationId: "pantry", category: "Freezer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "freezer-fr-2", name: "Freezer FR-2", locationId: "pool", category: "Freezer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "freezer-fr-3", name: "Freezer FR-3", locationId: "pool", category: "Freezer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "freezer-fr-4", name: "Freezer FR-4", locationId: "kitchen", category: "Freezer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "freezer-fr-5", name: "Freezer FR-5", locationId: "wine-room", category: "Freezer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "garage-door-openers", name: "Garage Door Openers", locationId: "general", category: "Garage Doors", vendorIds: ["precision-garage-door"] }),
  asset({ id: "generator-lower", name: "Generator Lower", locationId: "outdoor-generator-area", category: "Generator", vendorIds: ["d-square-energy", "maple-valley-electric"] }),
  asset({ id: "generator-upper", name: "Generator Upper", locationId: "outdoor-generator-area", category: "Generator", vendorIds: ["d-square-energy", "maple-valley-electric"] }),
  asset({ id: "golf-simulator", name: "Golf Simulator", locationId: "new-garage", category: "Recreation / AV", vendorIds: ["high-tech-living"] }),
  asset({ id: "home-water-filter", name: "Home Water Filter", locationId: "general", category: "Water Filtration", vendorIds: ["best-plumbing"] }),
  asset({ id: "hot-water-storage-tank-1", name: "Hot Water Storage Tank 1", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "79 USG / 300 L indirect-fired stainless DHW tank.", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hot-water-storage-tank-2", name: "Hot Water Storage Tank 2", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", notes: "79 USG / 300 L indirect-fired stainless DHW tank.", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hottub", name: "Hottub", locationId: "back-patio-water-side", category: "Spa / Hot Tub", make: "Sundance", model: "880 Series Optima", serial: "00P3LCD-100528521-0315", notes: "Sundance Optima hot tub. Date 03/21/15. 240V. ClearRay UV-C. HydroQuip Water Pro Series Smart Heater Plus.", vendorIds: ["aqua-quip", "krisco-pool-spas"] }),
  asset({ id: "hunter-irrigation-controller", name: "Hunter Irrigation Controller", locationId: "general", category: "Irrigation Controller", make: "Hunter", vendorIds: ["advanced-irrigation"] }),
  asset({ id: "hvac-ah-1-indoor", name: "HVAC AH-1 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-ah-2-indoor", name: "HVAC AH-2 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-ah-3-indoor", name: "HVAC AH-3 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-ah-4-indoor", name: "HVAC AH-4 Indoor", locationId: "mechanical-room-2", category: "HVAC Air Handler", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-ah-5-indoor", name: "HVAC AH-5 Indoor", locationId: "mechanical-room", category: "HVAC Air Handler", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-cu-1-outdoor", name: "HVAC CU-1 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-cu-2-outdoor", name: "HVAC CU-2 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-cu-3-outdoor", name: "HVAC CU-3 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-cu-4-outdoor", name: "HVAC CU-4 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-cu-5-outdoor", name: "HVAC CU-5 Outdoor", locationId: "outdoor-condenser-area", category: "HVAC Condenser", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-hp-1-indoor", name: "HVAC HP-1 Indoor", locationId: "attic", category: "Heat Pump / HVAC", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-hp-123-outdoor", name: "HVAC HP-123 Outdoor", locationId: "outdoor-generator-area", category: "Heat Pump / HVAC", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-hp-2-indoor", name: "HVAC HP-2 Indoor", locationId: "attic-2", category: "Heat Pump / HVAC", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-hp-3-indoor", name: "HVAC HP-3 Indoor", locationId: "upstairs-laundry-closet", category: "Heat Pump / HVAC", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-hp-4-outdoor-mr", name: "HVAC HP-4 outdoor MR", locationId: "roof", category: "Heat Pump / HVAC", vendorIds: ["psf-mechanical"] }),
  asset({ id: "hvac-hp-5-outdoor", name: "HVAC HP-5 outdoor", locationId: "roof", category: "Heat Pump / HVAC", vendorIds: ["psf-mechanical"] }),
  asset({ id: "invisible-fence-asset", name: "Invisible Fence", locationId: "vegetable-garden", category: "Pet / Fence", vendorIds: ["invisible-fence"] }),
  asset({ id: "irrigation-lake-water-meter", name: "Irrigation Lake Water Meter", locationId: "2000", category: "Irrigation / Water Meter", vendorIds: ["advanced-irrigation"] }),
  asset({ id: "lynx-grill", name: "Lynx Grill", locationId: "back-patio-water-side", category: "Outdoor Kitchen / Grill", make: "Lynx", vendorIds: ["appliance-service-station"] }),
  asset({ id: "marantec-wke", name: "Marantec WKE", locationId: "2000", category: "Access / Gate / Garage Control", make: "Marantec", vendorIds: ["precision-garage-door"] }),
  asset({ id: "outdoor-dehumidifier", name: "Outdoor Dehumidifier", locationId: "outdoor-condenser-area", category: "Dehumidification", vendorIds: ["psf-mechanical"] }),
  asset({ id: "plane-gulfstream-g280-n280cc", name: "Plane Gulfstream G280 N280CC", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N280CC" }),
  asset({ id: "plane-gulfstream-g280-n755pa", name: "Plane Gulfstream G280 N755PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N755PA" }),
  asset({ id: "plane-gulfstream-g600-n23pa", name: "Plane Gulfstream G600 N23PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G600", serial: "N23PA" }),
  asset({ id: "plane-pilatus-pc12-n126al", name: "Plane Pilatus PC12 N126AL", locationId: "hangar", category: "Aircraft", make: "Pilatus", model: "PC12", serial: "N126AL" }),
  asset({ id: "pool", name: "Pool", locationId: "pool", category: "Pool", status: "Offline", notes: "Pool asset shown as Offline in screenshot.", vendorIds: ["psf-mechanical", "aqua-quip", "krisco-pool-spas"] }),
  asset({ id: "pool-dehumidifier", name: "Pool Dehumidifier", locationId: "mechanical-room", category: "Pool HVAC / Dehumidification", make: "Desert Aire", model: "LC05R2WBDTDLAED", serial: "4217D25175", notes: "Pool dehumidification system.", vendorIds: ["psf-mechanical"] }),
  asset({ id: "range-wolf", name: "Range-Wolf", locationId: "kitchen", category: "Range", make: "Wolf", vendorIds: ["appliance-service-station"] }),
  asset({ id: "refrigerator-fitness-room", name: "Refrigerator", locationId: "fitness-room", category: "Refrigerator", vendorIds: ["appliance-service-station"] }),
  asset({ id: "refrigerator-left", name: "Refrigerator Left", locationId: "kitchen", category: "Refrigerator", vendorIds: ["appliance-service-station"] }),
  asset({ id: "steam-generator-attic", name: "Steam Generator Attic", locationId: "general", category: "Steam Generator", vendorIds: ["psf-mechanical"] }),
  asset({ id: "vehicle-audi-e-tron-gt", name: "Vehicle Audi E-Tron GT", locationId: "old-garage", category: "Vehicle", make: "Audi", model: "E-Tron GT", vendorIds: ["les-schwab"] }),
  asset({ id: "vehicle-ford-f-150", name: "Vehicle Ford F-150", locationId: "new-garage", category: "Vehicle", make: "Ford", model: "F-150", vendorIds: ["autonation-ford-bellevue", "les-schwab"] }),
  asset({ id: "vehicle-mercedes-gl", name: "Vehicle Mercedes GL", locationId: "general", category: "Vehicle", make: "Mercedes", model: "GL", vendorIds: ["les-schwab"] }),
  asset({ id: "vehicle-rivian", name: "Vehicle Rivian", locationId: "2000", category: "Vehicle", make: "Rivian", vendorIds: ["les-schwab"] }),
  asset({ id: "washer-wm-1", name: "Washer WM-1", locationId: "upstairs-laundry-closet", category: "Washer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "washer-wm-2", name: "Washer WM-2", locationId: "pool-changing-room", category: "Washer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "washer-wm-3", name: "Washer WM-3", locationId: "house-managers-office", category: "Washer", vendorIds: ["appliance-service-station"] }),
  asset({ id: "west-steam-generator", name: "West Steam Generator", locationId: "west-side-house", category: "Steam Generator", vendorIds: ["psf-mechanical"] }),
  asset({ id: "wine-chiller", name: "Wine Chiller", locationId: "formal-dining-room", category: "Wine Cooler", vendorIds: ["appliance-service-station", "electromatic-refrigeration"] }),
  asset({ id: "wine-fridge", name: "Wine Fridge", locationId: "mechanical-room-2", category: "Wine Fridge", vendorIds: ["appliance-service-station", "electromatic-refrigeration"] }),
  asset({ id: "wine-room-cooler-1", name: "Wine Room Cooler 1", locationId: "wine-room", category: "Wine Room Cooling", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] }),
  asset({ id: "wine-room-cooler-2", name: "Wine Room Cooler 2", locationId: "wine-room", category: "Wine Room Cooling", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] }),
  asset({ id: "wine-room-cooler-3", name: "Wine Room Cooler 3", locationId: "wine-room", category: "Wine Room Cooling", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] }),
  asset({ id: "wine-room-cooler-4", name: "Wine Room Cooler 4", locationId: "wine-room", category: "Wine Room Cooling", vendorIds: ["electromatic-refrigeration", "psf-mechanical"] }),
  asset({ id: "wolfe-range", name: "wolfe range", locationId: "kitchen", category: "Range", make: "Wolf", notes: "Duplicate/variant naming of Range-Wolf. Keep until confirmed merge.", vendorIds: ["appliance-service-station"] })
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
  { id: "cal-boat", date: todayISO(), title: "Boat cleaned Tuesday", notes: "Recurring boat cleaning/check.", assetId: "craft-cobalt-r-7", vendorId: "seattle-boat", serviceId: "", source: "Atlas", externalLink: "" },
  { id: "cal-spa", date: todayISO(), title: "Spa water/filter check", notes: "Check Sundance spa water and filter.", assetId: "hottub", vendorId: "krisco-pool-spas", serviceId: "svc-hot-tub-check", source: "Atlas", externalLink: "" },
  { id: "cal-pool", date: todayISO(), title: "Pool chemistry and equipment check", notes: "Record readings and inspect equipment.", assetId: "pool", vendorId: "aqua-quip", serviceId: "svc-pool-backwash", source: "Atlas", externalLink: "" }
];

const defaultServiceHistory: ServiceHistoryRecord[] = [
  {
    id: "svc-penthouse-176396",
    date: "2026-06-16",
    assetId: "blinds-lutron",
    vendorId: "penthouse-drapery",
    title: "Motorized roller shade repair / invoice 176396",
    status: "Completed",
    cost: "",
    notes: "Penthouse Drapery invoice 176396 dated 06/16/2026. Link this service history to Blinds Lutron."
  },
  {
    id: "svc-boiler-b2-new",
    date: "2026-07-02",
    assetId: "boiler-b-2-new",
    vendorId: "psf-mechanical",
    title: "Boiler B-2 New record created from nameplate details",
    status: "Monitor",
    cost: "",
    notes: "Viessmann Vitodens 200. Serial 758960507593. Year built 2025. Track future PSF Mechanical work here."
  },
  {
    id: "svc-pool-backwash",
    date: todayISO(),
    assetId: "pool",
    vendorId: "aqua-quip",
    title: "Pool backwash / chemistry check",
    status: "Open",
    cost: "",
    notes: "Use Procedures screen for backwash steps. Record pressure before/after and any abnormal flow."
  },
  {
    id: "svc-hot-tub-check",
    date: todayISO(),
    assetId: "hottub",
    vendorId: "krisco-pool-spas",
    title: "Sundance hot tub water and filter check",
    status: "Scheduled",
    cost: "",
    notes: "Check water level, temperature, filter condition, visible leaks, and any display alerts."
  },
  {
    id: "svc-seadoo-service",
    date: todayISO(),
    assetId: "craft-seadoo-2024",
    vendorId: "seadoo-service",
    title: "Sea-Doo service / repair tracking",
    status: "Monitor",
    cost: "",
    notes: "Use this record to track Sea-Doo service, repair notes, photos, parts, and vendor updates."
  },
  {
    id: "svc-dock-lift-check",
    date: todayISO(),
    assetId: "craft-cobalt-r-7",
    vendorId: "sunstream",
    title: "Dock lift box visual check",
    status: "Open",
    cost: "",
    notes: "Check Sunstream lift boxes, solar panels, batteries, controls, and Cobalt lift area."
  }
];

const defaultDocuments: DocumentRecord[] = [
  {
    id: "doc-boiler-b2-nameplate",
    date: "2026-07-02",
    title: "Boiler B-2 New nameplate photo",
    type: "Photo",
    assetId: "boiler-b-2-new",
    serviceId: "svc-boiler-b2-new",
    vendorId: "psf-mechanical",
    locationId: "mechanical-room",
    url: "",
    fileName: "",
    fileDataUrl: "",
    mimeType: "",
    notes: "Record for Viessmann Boiler B-2 New nameplate photo. Serial 758960507593. Year built 2025."
  },
  {
    id: "doc-penthouse-invoice-176396",
    date: "2026-06-16",
    title: "Penthouse Drapery invoice 176396",
    type: "Invoice",
    assetId: "blinds-lutron",
    serviceId: "svc-penthouse-176396",
    vendorId: "penthouse-drapery",
    locationId: "general",
    url: "",
    fileName: "",
    fileDataUrl: "",
    mimeType: "",
    notes: "Invoice 176396 dated 06/16/2026 for motorized roller shade repair. Linked to Blinds Lutron."
  },
  {
    id: "doc-hot-tub-nameplate",
    date: "2026-07-02",
    title: "Sundance Optima hot tub nameplate",
    type: "Photo",
    assetId: "hottub",
    serviceId: "svc-hot-tub-check",
    vendorId: "krisco-pool-spas",
    locationId: "back-patio-water-side",
    url: "",
    fileName: "",
    fileDataUrl: "",
    mimeType: "",
    notes: "Sundance 880 Series Optima nameplate / cabinet photo record. Serial 00P3LCD-100528521-0315."
  },
  {
    id: "doc-seadoo-repair-photos",
    date: todayISO(),
    title: "Sea-Doo service / repair photos",
    type: "Photo",
    assetId: "craft-seadoo-2024",
    serviceId: "svc-seadoo-service",
    vendorId: "seadoo-service",
    locationId: "dock",
    url: "",
    fileName: "",
    fileDataUrl: "",
    mimeType: "",
    notes: "Use this record to describe or link Sea-Doo repair photos."
  },
  {
    id: "doc-pool-backwash-note",
    date: todayISO(),
    title: "Pool backwash notes/photos",
    type: "Note",
    assetId: "pool",
    serviceId: "svc-pool-backwash",
    vendorId: "aqua-quip",
    locationId: "pool",
    url: "",
    fileName: "",
    fileDataUrl: "",
    mimeType: "",
    notes: "Record pressure before/after, backwash date, water clarity, and any photos or observations."
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
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryRecord[]>(defaultServiceHistory);
  const [documents, setDocuments] = useState<DocumentRecord[]>(defaultDocuments);
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAssets[0].id);
  const [selectedLocationId, setSelectedLocationId] = useState("courtyard");
  const [selectedVendorId, setSelectedVendorId] = useState(defaultVendors[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceHistory[0].id);
  const [selectedDocumentId, setSelectedDocumentId] = useState(defaultDocuments[0].id);
  const [assetSearch, setAssetSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [documentSearch, setDocumentSearch] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("Ask Atlas about an asset, location, vendor, document, photo, invoice, procedure, or service history.");
  const [weather, setWeather] = useState("Loading weather...");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLocations(loadData(STORE_LOCATIONS, defaultLocations));
    setAssets(loadData(STORE_ASSETS, defaultAssets));
    setVendors(loadData(STORE_VENDORS, defaultVendors));
    setLabels(loadData(STORE_LABELS, defaultLabels));
    setCalendar(loadData(STORE_CALENDAR, defaultCalendar));
    setServiceHistory(loadData(STORE_SERVICE_HISTORY, defaultServiceHistory));
    setDocuments(loadData(STORE_DOCUMENTS, defaultDocuments));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveData(STORE_LOCATIONS, locations); }, [loaded, locations]);
  useEffect(() => { if (loaded) saveData(STORE_ASSETS, assets); }, [loaded, assets]);
  useEffect(() => { if (loaded) saveData(STORE_VENDORS, vendors); }, [loaded, vendors]);
  useEffect(() => { if (loaded) saveData(STORE_LABELS, labels); }, [loaded, labels]);
  useEffect(() => { if (loaded) saveData(STORE_CALENDAR, calendar); }, [loaded, calendar]);
  useEffect(() => { if (loaded) saveData(STORE_SERVICE_HISTORY, serviceHistory); }, [loaded, serviceHistory]);
  useEffect(() => { if (loaded) saveData(STORE_DOCUMENTS, documents); }, [loaded, documents]);

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

  const selectedAsset = assets.find((item) => item.id === selectedAssetId) || assets[0] || defaultAssets[0];
  const selectedLocation = locations.find((item) => item.id === selectedLocationId) || locations[0] || defaultLocations[0];
  const selectedVendor = vendors.find((item) => item.id === selectedVendorId) || vendors[0] || defaultVendors[0];
  const selectedService = serviceHistory.find((item) => item.id === selectedServiceId) || serviceHistory[0] || null;
  const selectedDocument = documents.find((item) => item.id === selectedDocumentId) || documents[0] || null;

  const filteredAssets = useMemo(() => {
    const q = assetSearch.toLowerCase();
    return assets.filter((item) => (item.name + " " + item.category + " " + item.notes).toLowerCase().includes(q));
  }, [assets, assetSearch]);

  const filteredVendors = useMemo(() => {
    const q = vendorSearch.toLowerCase();
    return vendors.filter((item) => (item.name + " " + item.category + " " + (item.phone || "") + " " + (item.email || "") + " " + item.notes).toLowerCase().includes(q));
  }, [vendors, vendorSearch]);

  const filteredDocuments = useMemo(() => {
    const q = documentSearch.toLowerCase();
    return documents.filter((item) => {
      const linkedAsset = assets.find((assetItem) => assetItem.id === item.assetId);
      const linkedVendor = vendors.find((vendorItem) => vendorItem.id === item.vendorId);
      const linkedLocation = locations.find((locationItem) => locationItem.id === item.locationId);
      const linkedService = serviceHistory.find((serviceItem) => serviceItem.id === item.serviceId);
      const text =
        item.title + " " +
        item.type + " " +
        item.date + " " +
        (item.url || "") + " " +
        (item.fileName || "") + " " +
        item.notes + " " +
        (linkedAsset?.name || "") + " " +
        (linkedVendor?.name || "") + " " +
        (linkedLocation?.name || "") + " " +
        (linkedService?.title || "");
      return text.toLowerCase().includes(q);
    });
  }, [documents, documentSearch, assets, vendors, locations, serviceHistory]);

  function updateAsset(id: string, patch: Partial<AssetRecord>) {
    setAssets((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateLocation(id: string, patch: Partial<LocationRecord>) {
    setLocations((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateVendor(id: string, patch: Partial<VendorRecord>) {
    setVendors((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateServiceRecord(id: string, patch: Partial<ServiceHistoryRecord>) {
    setServiceHistory((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function updateDocument(id: string, patch: Partial<DocumentRecord>) {
    setDocuments((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function deleteDocumentRecord(id: string) {
    const ok = typeof window === "undefined" ? true : window.confirm("Delete this photo, note, or document?");
    if (!ok) return;

    const remaining = documents.filter((row) => row.id !== id);
    setDocuments(remaining);
    setSelectedDocumentId(remaining[0]?.id || "");
  }

  function deleteServiceRecord(id: string) {
    if (serviceHistory.length <= 1) {
      if (typeof window !== "undefined") window.alert("Keep at least one service record.");
      return;
    }

    const ok = typeof window === "undefined" ? true : window.confirm("Delete this service note / work order?");
    if (!ok) return;

    const remaining = serviceHistory.filter((row) => row.id !== id);
    setServiceHistory(remaining);
    setDocuments((rows) => rows.map((row) => row.serviceId === id ? { ...row, serviceId: "" } : row));
    setCalendar((rows) => rows.map((row) => row.serviceId === id ? { ...row, serviceId: "" } : row));
    setSelectedServiceId(remaining[0]?.id || "");
  }

  function deleteAssetRecord(id: string) {
    if (assets.length <= 1) {
      if (typeof window !== "undefined") window.alert("Keep at least one asset.");
      return;
    }

    const target = assets.find((row) => row.id === id);
    const ok = typeof window === "undefined" ? true : window.confirm("Delete this asset? Service notes, documents, and calendar items will stay, but they will no longer be linked to this asset.");
    if (!ok) return;

    const remaining = assets.filter((row) => row.id !== id);
    setAssets(remaining);
    setServiceHistory((rows) => rows.map((row) => row.assetId === id ? { ...row, assetId: "" } : row));
    setDocuments((rows) => rows.map((row) => row.assetId === id ? { ...row, assetId: "" } : row));
    setCalendar((rows) => rows.map((row) => row.assetId === id ? { ...row, assetId: "" } : row));
    setSelectedAssetId(remaining[0]?.id || "");
    if (target?.vendorIds?.length) {
      setSelectedVendorId(target.vendorIds[0]);
    }
  }

  function deleteVendorRecord(id: string) {
    if (vendors.length <= 1) {
      if (typeof window !== "undefined") window.alert("Keep at least one vendor.");
      return;
    }

    const ok = typeof window === "undefined" ? true : window.confirm("Delete this vendor? Linked assets will stay, but this vendor will be removed from them.");
    if (!ok) return;

    const remaining = vendors.filter((row) => row.id !== id);
    const replacementVendorId = remaining[0]?.id || "";

    setVendors(remaining);
    setAssets((rows) => rows.map((row) => ({ ...row, vendorIds: row.vendorIds.filter((vendorId) => vendorId !== id) })));
    setServiceHistory((rows) => rows.map((row) => row.vendorId === id ? { ...row, vendorId: replacementVendorId } : row));
    setDocuments((rows) => rows.map((row) => row.vendorId === id ? { ...row, vendorId: "" } : row));
    setCalendar((rows) => rows.map((row) => row.vendorId === id ? { ...row, vendorId: "" } : row));
    setSelectedVendorId(replacementVendorId);
  }

  function addAsset() {
    const newId = "asset-" + Date.now();
    const next = asset({
      id: newId,
      name: "New Asset",
      locationId: "general",
      category: "General",
      notes: "New asset added in Atlas."
    });
    setAssets((rows) => [next, ...rows]);
    setSelectedAssetId(newId);
    setScreen("assets");
  }

  function addVendor() {
    const newId = "vendor-" + Date.now();
    const next: VendorRecord = {
      id: newId,
      name: "New Vendor",
      category: "General",
      phone: "",
      email: "",
      address: "",
      notes: ""
    };
    setVendors((rows) => [next, ...rows]);
    setSelectedVendorId(newId);
    setVendorSearch("");
    setScreen("vendors");
  }

  function duplicateVendor(vendor: VendorRecord) {
    const base = cleanId(vendor.name) || "vendor";
    const newId = base + "-copy-" + Date.now();
    const next: VendorRecord = {
      ...vendor,
      id: newId,
      name: vendor.name + " Copy"
    };
    setVendors((rows) => [next, ...rows]);
    setSelectedVendorId(newId);
    setScreen("vendors");
  }

  function linkVendorToAsset(assetId: string, vendorId: string) {
    setAssets((rows) =>
      rows.map((row) => {
        if (row.id !== assetId) return row;
        if (row.vendorIds.includes(vendorId)) return row;
        return { ...row, vendorIds: [...row.vendorIds, vendorId] };
      })
    );
  }

  function unlinkVendorFromAsset(assetId: string, vendorId: string) {
    setAssets((rows) =>
      rows.map((row) => {
        if (row.id !== assetId) return row;
        return { ...row, vendorIds: row.vendorIds.filter((id) => id !== vendorId) };
      })
    );
  }

  function addServiceRecordForAsset(assetId?: string) {
    const assetForRecord = assets.find((row) => row.id === assetId) || selectedAsset || assets[0];
    const vendorForRecord =
      vendors.find((row) => assetForRecord.vendorIds.includes(row.id)) ||
      selectedVendor ||
      vendors[0];

    const newId = "svc-" + Date.now();
    const next: ServiceHistoryRecord = {
      id: newId,
      date: todayISO(),
      assetId: assetForRecord.id,
      vendorId: vendorForRecord.id,
      title: "Service note for " + assetForRecord.name,
      status: "Open",
      cost: "",
      notes: ""
    };

    setServiceHistory((rows) => [next, ...rows]);
    setSelectedServiceId(newId);
    setSelectedAssetId(assetForRecord.id);
    setSelectedVendorId(vendorForRecord.id);
    setScreen("history");
  }

  function addServiceRecordForVendor(vendorId?: string) {
    const vendorForRecord = vendors.find((row) => row.id === vendorId) || selectedVendor || vendors[0];
    const linkedAsset = assets.find((row) => row.vendorIds.includes(vendorForRecord.id)) || selectedAsset || assets[0];

    const newId = "svc-" + Date.now();
    const next: ServiceHistoryRecord = {
      id: newId,
      date: todayISO(),
      assetId: linkedAsset.id,
      vendorId: vendorForRecord.id,
      title: "Vendor note for " + vendorForRecord.name,
      status: "Open",
      cost: "",
      notes: ""
    };

    setServiceHistory((rows) => [next, ...rows]);
    setSelectedServiceId(newId);
    setSelectedAssetId(linkedAsset.id);
    setSelectedVendorId(vendorForRecord.id);
    setScreen("history");
  }

  function addDocumentRecord(patch?: Partial<DocumentRecord>) {
    const assetForDoc = assets.find((row) => row.id === patch?.assetId) || selectedAsset || assets[0];
    const serviceForDoc = serviceHistory.find((row) => row.id === patch?.serviceId);
    const vendorForDoc = vendors.find((row) => row.id === patch?.vendorId) || selectedVendor || vendors[0];

    const newId = "doc-" + Date.now();
    const next: DocumentRecord = {
      id: newId,
      date: todayISO(),
      title: patch?.title || "New photo / document",
      type: patch?.type || "Photo",
      assetId: patch?.assetId || assetForDoc.id,
      serviceId: patch?.serviceId || serviceForDoc?.id || "",
      vendorId: patch?.vendorId || vendorForDoc.id,
      locationId: patch?.locationId || assetForDoc.locationId || selectedLocation.id,
      url: patch?.url || "",
      fileName: patch?.fileName || "",
      fileDataUrl: patch?.fileDataUrl || "",
      mimeType: patch?.mimeType || "",
      notes: patch?.notes || ""
    };

    setDocuments((rows) => [next, ...rows]);
    setSelectedDocumentId(newId);
    if (next.assetId) setSelectedAssetId(next.assetId);
    if (next.vendorId) setSelectedVendorId(next.vendorId);
    if (next.locationId) setSelectedLocationId(next.locationId);
    if (next.serviceId) setSelectedServiceId(next.serviceId);
    setDocumentSearch("");
    setScreen("documents");
  }

  function addDocumentForAsset(assetId: string) {
    const targetAsset = assets.find((row) => row.id === assetId);
    addDocumentRecord({
      title: "Photo / document for " + (targetAsset?.name || "asset"),
      type: "Photo",
      assetId,
      vendorId: targetAsset?.vendorIds[0] || selectedVendorId,
      locationId: targetAsset?.locationId || selectedLocationId
    });
  }

  function addDocumentForService(serviceId: string) {
    const service = serviceHistory.find((row) => row.id === serviceId);
    const linkedAsset = assets.find((row) => row.id === service?.assetId);
    addDocumentRecord({
      title: "Photo / document for " + (service?.title || "service record"),
      type: "Photo",
      assetId: service?.assetId || selectedAssetId,
      serviceId,
      vendorId: service?.vendorId || selectedVendorId,
      locationId: linkedAsset?.locationId || selectedLocationId
    });
  }

  function addDocumentForVendor(vendorId: string) {
    const vendor = vendors.find((row) => row.id === vendorId);
    const linkedAsset = assets.find((row) => row.vendorIds.includes(vendorId));
    addDocumentRecord({
      title: "Document for " + (vendor?.name || "vendor"),
      type: "Invoice",
      assetId: linkedAsset?.id || selectedAssetId,
      vendorId,
      locationId: linkedAsset?.locationId || selectedLocationId
    });
  }

  function addDocumentForLocation(locationId: string) {
    const location = locations.find((row) => row.id === locationId);
    addDocumentRecord({
      title: "Photo / document for " + (location?.name || "location"),
      type: "Photo",
      assetId: selectedAssetId,
      vendorId: selectedVendorId,
      locationId
    });
  }

  function resetAllLocalData() {
    setLocations(defaultLocations);
    setAssets(defaultAssets);
    setVendors(defaultVendors);
    setLabels(defaultLabels);
    setCalendar(defaultCalendar);
    setServiceHistory(defaultServiceHistory);
    setDocuments(defaultDocuments);
    setSelectedAssetId(defaultAssets[0].id);
    setSelectedLocationId("courtyard");
    setSelectedVendorId(defaultVendors[0].id);
    setSelectedServiceId(defaultServiceHistory[0].id);
    setSelectedDocumentId(defaultDocuments[0].id);
    setAssetSearch("");
    setVendorSearch("");
    setDocumentSearch("");
  }

  function askAtlas() {
    const q = assistantQuestion.toLowerCase();

    if (q.trim().length === 0) {
      setAssistantAnswer("Type a question first.");
      return;
    }

    const allLines: string[] = [];

    assets.forEach((row) => allLines.push("Asset: " + row.name + ". " + row.category + ". " + row.notes));
    locations.forEach((row) => allLines.push("Location: " + row.name + ". " + row.type + ". " + row.notes));
    vendors.forEach((row) => allLines.push("Vendor: " + row.name + ". " + row.category + ". " + (row.phone || "") + ". " + (row.email || "") + ". " + row.notes));
    serviceHistory.forEach((row) => allLines.push("Service History: " + row.title + ". " + row.date + ". " + row.status + ". " + row.notes));
    documents.forEach((row) => allLines.push("Document: " + row.title + ". " + row.type + ". " + row.date + ". " + (row.fileName || "") + ". " + row.notes + ". " + (row.url || "")));
    calendar.forEach((row) => allLines.push("Calendar: " + row.title + ". " + row.date + ". " + (row.source || "Atlas") + ". " + row.notes + ". " + (row.externalLink || "")));

    const words = q.split(" ").filter((word) => word.length > 2);
    const hits = allLines.filter((line) => {
      const low = line.toLowerCase();
      return words.some((word) => low.includes(word));
    }).slice(0, 12);

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
        <button type="button" onClick={addVendor} style={styles.goldButton}>+ New Vendor</button>
        <button type="button" onClick={() => addDocumentRecord()} style={styles.goldButton}>+ Photo / Document</button>
        <button type="button" onClick={() => addServiceRecordForAsset(selectedAsset.id)} style={styles.goldButton}>+ Service Record</button>
        <button type="button" onClick={resetAllLocalData} style={styles.resetButton}>Reset Local Data</button>
      </aside>

      <section style={styles.content}>
        {screen === "dashboard" && (
          <DashboardPanel
            locations={locations}
            assets={assets}
            vendors={vendors}
            documents={documents}
            serviceHistory={serviceHistory}
            calendar={calendar}
            setScreen={setScreen}
            setSelectedAssetId={setSelectedAssetId}
            addVendor={addVendor}
            addDocumentRecord={addDocumentRecord}
          />
        )}

        {screen === "map" && (
          <MapPanel
            labels={labels}
            selectedLocation={selectedLocation}
            selectedLocationId={selectedLocationId}
            setSelectedLocationId={setSelectedLocationId}
            updateLocation={updateLocation}
            assets={assets}
            documents={documents}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedDocumentId={setSelectedDocumentId}
            addDocumentForLocation={addDocumentForLocation}
            setScreen={setScreen}
          />
        )}

        {screen === "locations" && (
          <LocationsPanel
            locations={locations}
            documents={documents}
            selectedLocation={selectedLocation}
            selectedLocationId={selectedLocationId}
            setSelectedLocationId={setSelectedLocationId}
            updateLocation={updateLocation}
            addDocumentForLocation={addDocumentForLocation}
            setSelectedDocumentId={setSelectedDocumentId}
            setScreen={setScreen}
          />
        )}

        {screen === "assets" && (
          <AssetsPanel
            filteredAssets={filteredAssets}
            locations={locations}
            vendors={vendors}
            documents={documents}
            serviceHistory={serviceHistory}
            calendar={calendar}
            selectedAsset={selectedAsset}
            selectedAssetId={selectedAssetId}
            selectedVendorId={selectedVendorId}
            assetSearch={assetSearch}
            setAssetSearch={setAssetSearch}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedVendorId={setSelectedVendorId}
            setSelectedDocumentId={setSelectedDocumentId}
            setSelectedServiceId={setSelectedServiceId}
            updateAsset={updateAsset}
            deleteAssetRecord={deleteAssetRecord}
            linkVendorToAsset={linkVendorToAsset}
            unlinkVendorFromAsset={unlinkVendorFromAsset}
            addServiceRecordForAsset={addServiceRecordForAsset}
            addDocumentForAsset={addDocumentForAsset}
            setScreen={setScreen}
          />
        )}

        {screen === "history" && (
          <ServiceHistoryPanel
            serviceHistory={serviceHistory}
            selectedService={selectedService}
            assets={assets}
            vendors={vendors}
            documents={documents}
            calendar={calendar}
            setSelectedServiceId={setSelectedServiceId}
            updateServiceRecord={updateServiceRecord}
            deleteServiceRecord={deleteServiceRecord}
            addServiceRecordForAsset={addServiceRecordForAsset}
            addDocumentForService={addDocumentForService}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedVendorId={setSelectedVendorId}
            setSelectedDocumentId={setSelectedDocumentId}
            setScreen={setScreen}
          />
        )}

        {screen === "vendors" && (
          <VendorsPanel
            vendors={vendors}
            filteredVendors={filteredVendors}
            assets={assets}
            documents={documents}
            serviceHistory={serviceHistory}
            calendar={calendar}
            selectedVendor={selectedVendor}
            selectedVendorId={selectedVendorId}
            selectedAssetId={selectedAssetId}
            vendorSearch={vendorSearch}
            setVendorSearch={setVendorSearch}
            setSelectedVendorId={setSelectedVendorId}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedDocumentId={setSelectedDocumentId}
            setSelectedServiceId={setSelectedServiceId}
            updateVendor={updateVendor}
            deleteVendorRecord={deleteVendorRecord}
            addVendor={addVendor}
            duplicateVendor={duplicateVendor}
            linkVendorToAsset={linkVendorToAsset}
            unlinkVendorFromAsset={unlinkVendorFromAsset}
            addServiceRecordForVendor={addServiceRecordForVendor}
            addDocumentForVendor={addDocumentForVendor}
            setScreen={setScreen}
          />
        )}

        {screen === "documents" && (
          <DocumentsPanel
            documents={documents}
            filteredDocuments={filteredDocuments}
            selectedDocument={selectedDocument}
            assets={assets}
            vendors={vendors}
            locations={locations}
            serviceHistory={serviceHistory}
            documentSearch={documentSearch}
            setDocumentSearch={setDocumentSearch}
            setSelectedDocumentId={setSelectedDocumentId}
            updateDocument={updateDocument}
            deleteDocumentRecord={deleteDocumentRecord}
            addDocumentRecord={addDocumentRecord}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedVendorId={setSelectedVendorId}
            setSelectedLocationId={setSelectedLocationId}
            setSelectedServiceId={setSelectedServiceId}
            setScreen={setScreen}
          />
        )}

        {screen === "calendar" && (
          <CalendarPanel
            calendar={calendar}
            setCalendar={setCalendar}
            assets={assets}
            vendors={vendors}
            serviceHistory={serviceHistory}
            setSelectedAssetId={setSelectedAssetId}
            setSelectedVendorId={setSelectedVendorId}
            setSelectedServiceId={setSelectedServiceId}
            setScreen={setScreen}
          />
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

        {screen === "assistant" && (
          <div>
            <Header title="AI Assistant" subtitle="Local Atlas search across saved records, including vendors, documents, photos, calendar, and service history." />
            <section style={styles.card}>
              <textarea
                value={assistantQuestion}
                onChange={(e) => setAssistantQuestion(e.target.value)}
                placeholder="Ask about boilers, HVAC, Sundance, Cobalt, Sea-Doo, pool, vendors, photos, documents, service history, calendar, locations..."
                style={styles.textareaLarge}
              />
              <button type="button" onClick={askAtlas} style={styles.primaryButton}>Ask Atlas</button>
              <pre style={styles.answerBox}>{assistantAnswer}</pre>
            </section>
          </div>
        )}

        {screen === "blank" && <BlankCanvasPanel />}

        {screen === "procedures" && <ProceduresPanel />}
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

function Stat({ label, value }: { label: string | number; value: string | number }) {
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

function DashboardPanel({
  locations,
  assets,
  vendors,
  documents,
  serviceHistory,
  calendar,
  setScreen,
  setSelectedAssetId,
  addVendor,
  addDocumentRecord
}: {
  locations: LocationRecord[];
  assets: AssetRecord[];
  vendors: VendorRecord[];
  documents: DocumentRecord[];
  serviceHistory: ServiceHistoryRecord[];
  calendar: CalendarEvent[];
  setScreen: (screen: Screen) => void;
  setSelectedAssetId: (id: string) => void;
  addVendor: () => void;
  addDocumentRecord: (patch?: Partial<DocumentRecord>) => void;
}) {
  return (
    <div>
      <Header title="Atlas Dashboard" subtitle="Private 2000 estate operations control center." />
      <div style={styles.statGrid}>
        <Stat label="Locations" value={locations.length} />
        <Stat label="Assets" value={assets.length} />
        <Stat label="Vendors" value={vendors.length} />
        <Stat label="Calendar" value={calendar.length} />
      </div>

      <div style={styles.gridTwo}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Property Map</h2>
          <p style={styles.muted}>Locked original map image with clickable overlay labels.</p>
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
          <QuickRecord label="Open Calendar" onClick={() => setScreen("calendar")} />
          <QuickRecord label="Add New Vendor" onClick={addVendor} />
          <QuickRecord label="Add Photo / Document" onClick={() => addDocumentRecord()} />
          <QuickRecord label="Open Service History" onClick={() => setScreen("history")} />
          <div style={styles.answerBox}>Service records: {serviceHistory.length}{"\n"}Documents/photos: {documents.length}</div>
        </section>
      </div>
    </div>
  );
}

function MapPanel({
  labels,
  selectedLocation,
  selectedLocationId,
  setSelectedLocationId,
  updateLocation,
  assets,
  documents,
  setSelectedAssetId,
  setSelectedDocumentId,
  addDocumentForLocation,
  setScreen
}: {
  labels: MapLabel[];
  selectedLocation: LocationRecord;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  updateLocation: (id: string, patch: Partial<LocationRecord>) => void;
  assets: AssetRecord[];
  documents: DocumentRecord[];
  setSelectedAssetId: (id: string) => void;
  setSelectedDocumentId: (id: string) => void;
  addDocumentForLocation: (locationId: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <div>
      <Header title="Property Map" subtitle="The map image stays fixed. Labels are clickable overlays." />
      <div style={styles.gridTwo}>
        <section style={styles.mapCard}>
          <img src="/atlas-property-map.png" alt="Atlas property map" style={styles.mapImage} />
          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => setSelectedLocationId(label.locationId)}
              style={{
                ...styles.mapLabel,
                left: String(label.x) + "%",
                top: String(label.y) + "%",
                background: label.locationId === selectedLocationId ? "#caa24a" : "#071d3a",
                color: label.locationId === selectedLocationId ? "#071d3a" : "#ffffff"
              }}
            >
              {label.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>{selectedLocation.name}</h2>
          <p style={styles.kicker}>{selectedLocation.type}</p>
          <button type="button" onClick={() => addDocumentForLocation(selectedLocation.id)} style={styles.primaryButton}>+ Add Photo / Document for This Location</button>
          <textarea value={selectedLocation.notes} onChange={(e) => updateLocation(selectedLocation.id, { notes: e.target.value })} style={styles.textarea} />

          <h3 style={styles.h3}>Assets here</h3>
          {assets.filter((row) => row.locationId === selectedLocation.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedAssetId(row.id); setScreen("assets"); }} style={styles.listButton}>
              {row.name}
            </button>
          ))}

          <h3 style={styles.h3}>Photos / Documents here</h3>
          {documents.filter((row) => row.locationId === selectedLocation.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedDocumentId(row.id); setScreen("documents"); }} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.type}</span>
              {row.fileDataUrl && <span style={styles.smallMuted}>Photo attached</span>}
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

function LocationsPanel({
  locations,
  documents,
  selectedLocation,
  selectedLocationId,
  setSelectedLocationId,
  updateLocation,
  addDocumentForLocation,
  setSelectedDocumentId,
  setScreen
}: {
  locations: LocationRecord[];
  documents: DocumentRecord[];
  selectedLocation: LocationRecord;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  updateLocation: (id: string, patch: Partial<LocationRecord>) => void;
  addDocumentForLocation: (locationId: string) => void;
  setSelectedDocumentId: (id: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
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
          <button type="button" onClick={() => addDocumentForLocation(selectedLocation.id)} style={styles.primaryButton}>+ Add Photo / Document for This Location</button>
          <label style={styles.label}>Name</label>
          <input value={selectedLocation.name} onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })} style={styles.input} />
          <label style={styles.label}>Type</label>
          <input value={selectedLocation.type} onChange={(e) => updateLocation(selectedLocation.id, { type: e.target.value })} style={styles.input} />
          <label style={styles.label}>Notes</label>
          <textarea value={selectedLocation.notes} onChange={(e) => updateLocation(selectedLocation.id, { notes: e.target.value })} style={styles.textarea} />

          <h3 style={styles.h3}>Photos / Documents</h3>
          {documents.filter((row) => row.locationId === selectedLocation.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedDocumentId(row.id); setScreen("documents"); }} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.type}</span>
              {row.fileDataUrl && <span style={styles.smallMuted}>Photo attached</span>}
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

function AssetsPanel({
  filteredAssets,
  locations,
  vendors,
  documents,
  serviceHistory,
  calendar,
  selectedAsset,
  selectedAssetId,
  selectedVendorId,
  assetSearch,
  setAssetSearch,
  setSelectedAssetId,
  setSelectedVendorId,
  setSelectedDocumentId,
  setSelectedServiceId,
  updateAsset,
  deleteAssetRecord,
  linkVendorToAsset,
  unlinkVendorFromAsset,
  addServiceRecordForAsset,
  addDocumentForAsset,
  setScreen
}: {
  filteredAssets: AssetRecord[];
  locations: LocationRecord[];
  vendors: VendorRecord[];
  documents: DocumentRecord[];
  serviceHistory: ServiceHistoryRecord[];
  calendar: CalendarEvent[];
  selectedAsset: AssetRecord;
  selectedAssetId: string;
  selectedVendorId: string;
  assetSearch: string;
  setAssetSearch: (value: string) => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedVendorId: (id: string) => void;
  setSelectedDocumentId: (id: string) => void;
  setSelectedServiceId: (id: string) => void;
  updateAsset: (id: string, patch: Partial<AssetRecord>) => void;
  deleteAssetRecord: (id: string) => void;
  linkVendorToAsset: (assetId: string, vendorId: string) => void;
  unlinkVendorFromAsset: (assetId: string, vendorId: string) => void;
  addServiceRecordForAsset: (assetId?: string) => void;
  addDocumentForAsset: (assetId: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <div>
      <Header title="Assets" subtitle="Equipment, systems, vehicles, aircraft, appliances, linked vendors, photos, documents, calendar, and service history." />
      <div style={styles.gridTwo}>
        <section style={styles.card}>
          <input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} placeholder="Search assets..." style={styles.input} />
          <div style={styles.scrollList}>
            {filteredAssets.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedAssetId(row.id)} style={row.id === selectedAssetId ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}>
                <strong>{row.name}</strong>
                <span style={styles.smallMuted}>{row.category} · {row.status}</span>
              </button>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>{selectedAsset.name}</h2>
          <p style={styles.kicker}>{selectedAsset.category}</p>

          <button type="button" onClick={() => addServiceRecordForAsset(selectedAsset.id)} style={styles.primaryButton}>+ Add Service Note for This Asset</button>
          <button type="button" onClick={() => addDocumentForAsset(selectedAsset.id)} style={styles.secondaryButton}>+ Add Photo / Document for This Asset</button>

          <div style={styles.qrRow}>
            <img src={qrUrl("asset", selectedAsset.id)} alt="Asset QR code" style={styles.qrImage} />
            <div>
              <strong>QR Tag</strong>
              <p style={styles.muted}>asset:{selectedAsset.id}</p>
            </div>
          </div>

          <label style={styles.label}>Name</label>
          <input value={selectedAsset.name} onChange={(e) => updateAsset(selectedAsset.id, { name: e.target.value })} style={styles.input} />

          <label style={styles.label}>Category</label>
          <input value={selectedAsset.category} onChange={(e) => updateAsset(selectedAsset.id, { category: e.target.value })} style={styles.input} />

          <label style={styles.label}>Location</label>
          <select value={selectedAsset.locationId} onChange={(e) => updateAsset(selectedAsset.id, { locationId: e.target.value })} style={styles.input}>
            {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
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

          <h3 style={styles.h3}>Add Vendor to This Asset</h3>
          <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} style={styles.input}>
            {vendors.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <button type="button" onClick={() => linkVendorToAsset(selectedAsset.id, selectedVendorId)} style={styles.primaryButton}>+ Link Selected Vendor</button>

          <h3 style={styles.h3}>Linked Vendors</h3>
          {vendors.filter((row) => selectedAsset.vendorIds.includes(row.id)).map((row) => (
            <div key={row.id} style={styles.linkedRow}>
              <button type="button" onClick={() => { setSelectedVendorId(row.id); setScreen("vendors"); }} style={styles.linkedMainButton}>
                <strong>{row.name}</strong>
                <span style={styles.smallMuted}>{row.category}</span>
              </button>
              <button type="button" onClick={() => unlinkVendorFromAsset(selectedAsset.id, row.id)} style={styles.smallDangerButton}>Unlink</button>
            </div>
          ))}

          <h3 style={styles.h3}>Calendar Items</h3>
          {calendar.filter((row) => row.assetId === selectedAsset.id).map((row) => (
            <button key={row.id} type="button" onClick={() => setScreen("calendar")} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.source || "Atlas"}</span>
            </button>
          ))}

          <h3 style={styles.h3}>Photos / Documents</h3>
          <button type="button" onClick={() => addDocumentForAsset(selectedAsset.id)} style={styles.listButton}>+ Add photo, invoice, manual, warranty, or note for {selectedAsset.name}</button>
          {documents.filter((row) => row.assetId === selectedAsset.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedDocumentId(row.id); setScreen("documents"); }} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.type}</span>
              {row.fileDataUrl && <span style={styles.smallMuted}>Photo attached: {row.fileName || "image"}</span>}
            </button>
          ))}

          <h3 style={styles.h3}>Service History</h3>
          <button type="button" onClick={() => addServiceRecordForAsset(selectedAsset.id)} style={styles.listButton}>+ Add new service comment for {selectedAsset.name}</button>
          {serviceHistory.filter((row) => row.assetId === selectedAsset.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedServiceId(row.id); setScreen("history"); }} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.status}</span>
            </button>
          ))}

          <button type="button" onClick={() => deleteAssetRecord(selectedAsset.id)} style={styles.dangerButton}>
            Delete Asset
          </button>
        </section>
      </div>
    </div>
  );
}

function ServiceHistoryPanel({
  serviceHistory,
  selectedService,
  assets,
  vendors,
  documents,
  calendar,
  setSelectedServiceId,
  updateServiceRecord,
  deleteServiceRecord,
  addServiceRecordForAsset,
  addDocumentForService,
  setSelectedAssetId,
  setSelectedVendorId,
  setSelectedDocumentId,
  setScreen
}: {
  serviceHistory: ServiceHistoryRecord[];
  selectedService: ServiceHistoryRecord | null;
  assets: AssetRecord[];
  vendors: VendorRecord[];
  documents: DocumentRecord[];
  calendar: CalendarEvent[];
  setSelectedServiceId: (id: string) => void;
  updateServiceRecord: (id: string, patch: Partial<ServiceHistoryRecord>) => void;
  deleteServiceRecord: (id: string) => void;
  addServiceRecordForAsset: (assetId?: string) => void;
  addDocumentForService: (serviceId: string) => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedVendorId: (id: string) => void;
  setSelectedDocumentId: (id: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  const linkedAsset = selectedService ? assets.find((row) => row.id === selectedService.assetId) : undefined;
  const linkedVendor = selectedService ? vendors.find((row) => row.id === selectedService.vendorId) : undefined;
  const linkedDocs = selectedService ? documents.filter((row) => row.serviceId === selectedService.id) : [];
  const linkedCalendar = selectedService ? calendar.filter((row) => row.serviceId === selectedService.id) : [];
  const activeCount = serviceHistory.filter((row) => row.status !== "Completed").length;
  const completedCount = serviceHistory.filter((row) => row.status === "Completed").length;

  return (
    <div>
      <Header title="Service History" subtitle="Pick the asset, then type or paste service notes, work orders, vendor updates, invoices, repair comments, and linked photos/documents." />

      <div style={styles.statGrid}>
        <Stat label="Total Records" value={serviceHistory.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Completed" value={completedCount} />
        <Stat label="Current" value={selectedService?.status || "None"} />
      </div>

      <div style={styles.gridTwo}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Add Service Record</h2>
          <p style={styles.muted}>Click an asset below to start a new service note already attached to that asset.</p>
          <div style={styles.scrollListSmall}>
            {assets.map((row) => (
              <button key={row.id} type="button" onClick={() => addServiceRecordForAsset(row.id)} style={styles.listButton}>
                + {row.name}
                <span style={styles.smallMuted}>{row.category}</span>
              </button>
            ))}
          </div>

          <h3 style={styles.h3}>Existing Service Records</h3>
          <div style={styles.scrollList}>
            {serviceHistory.map((row) => {
              const linkedAssetRow = assets.find((assetRow) => assetRow.id === row.assetId);
              const linkedVendorRow = vendors.find((vendorRow) => vendorRow.id === row.vendorId);
              return (
                <button key={row.id} type="button" onClick={() => setSelectedServiceId(row.id)} style={selectedService && row.id === selectedService.id ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}>
                  <strong>{row.title}</strong>
                  <span style={styles.smallMuted}>{row.date} · {row.status}</span>
                  <span style={styles.smallMuted}>{linkedAssetRow?.name || "No linked asset"} · {linkedVendorRow?.name || "No linked vendor"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={styles.card}>
          {!selectedService && (
            <div>
              <h2 style={styles.h2}>No service note selected</h2>
              <p style={styles.muted}>Pick an asset on the left to create a new service note.</p>
            </div>
          )}

          {selectedService && (
            <div>
              <h2 style={styles.h2}>Service Comment / Work Order</h2>
              <p style={styles.kicker}>{linkedAsset?.name || "No linked asset"} · {selectedService.status}</p>

              <label style={styles.label}>1. Asset this service belongs to</label>
              <select value={selectedService.assetId} onChange={(e) => updateServiceRecord(selectedService.id, { assetId: e.target.value })} style={styles.input}>
                <option value="">No asset</option>
                {assets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>

              <label style={styles.label}>2. Date</label>
              <input value={selectedService.date} onChange={(e) => updateServiceRecord(selectedService.id, { date: e.target.value })} style={styles.input} />

              <label style={styles.label}>3. Title / short description</label>
              <input value={selectedService.title} onChange={(e) => updateServiceRecord(selectedService.id, { title: e.target.value })} style={styles.input} />

              <label style={styles.label}>4. Vendor</label>
              <select value={selectedService.vendorId} onChange={(e) => updateServiceRecord(selectedService.id, { vendorId: e.target.value })} style={styles.input}>
                <option value="">No vendor</option>
                {vendors.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>

              <label style={styles.label}>5. Status</label>
              <select value={selectedService.status} onChange={(e) => updateServiceRecord(selectedService.id, { status: e.target.value as ServiceStatus })} style={styles.input}>
                <option value="Open">Open</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Monitor">Monitor</option>
              </select>

              <label style={styles.label}>6. Cost</label>
              <input value={selectedService.cost || ""} onChange={(e) => updateServiceRecord(selectedService.id, { cost: e.target.value })} placeholder="$0.00" style={styles.input} />

              <label style={styles.label}>7. Comments / paste notes here</label>
              <textarea value={selectedService.notes} onChange={(e) => updateServiceRecord(selectedService.id, { notes: e.target.value })} placeholder="Paste invoice notes, vendor text, work performed, parts used, photos to attach later, next steps, or anything important..." style={styles.textareaHuge} />

              <button type="button" onClick={() => deleteServiceRecord(selectedService.id)} style={styles.dangerButton}>
                Delete Service Note / Work Order
              </button>

              <h3 style={styles.h3}>Calendar Items for This Service</h3>
              {linkedCalendar.map((row) => (
                <button key={row.id} type="button" onClick={() => setScreen("calendar")} style={styles.listButton}>
                  <strong>{row.title}</strong>
                  <span style={styles.smallMuted}>{row.date} · {row.source || "Atlas"}</span>
                </button>
              ))}

              <h3 style={styles.h3}>Photos / Documents for This Service</h3>
              <button type="button" onClick={() => addDocumentForService(selectedService.id)} style={styles.listButton}>+ Add photo, invoice, manual, warranty, or note for this service record</button>
              {linkedDocs.map((row) => (
                <button key={row.id} type="button" onClick={() => { setSelectedDocumentId(row.id); setScreen("documents"); }} style={styles.listButton}>
                  <strong>{row.title}</strong>
                  <span style={styles.smallMuted}>{row.date} · {row.type}</span>
                  {row.fileDataUrl && <span style={styles.smallMuted}>Photo attached</span>}
                </button>
              ))}

              <div style={styles.miniGrid}>
                <button type="button" onClick={() => { if (linkedAsset) { setSelectedAssetId(linkedAsset.id); setScreen("assets"); } }} style={styles.listButton}>
                  <strong>Open Linked Asset</strong>
                  <span style={styles.smallMuted}>{linkedAsset?.name || "No linked asset"}</span>
                </button>
                <button type="button" onClick={() => { if (linkedVendor) { setSelectedVendorId(linkedVendor.id); setScreen("vendors"); } }} style={styles.listButton}>
                  <strong>Open Linked Vendor</strong>
                  <span style={styles.smallMuted}>{linkedVendor?.name || "No linked vendor"}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function VendorsPanel({
  vendors,
  filteredVendors,
  assets,
  documents,
  serviceHistory,
  calendar,
  selectedVendor,
  selectedVendorId,
  selectedAssetId,
  vendorSearch,
  setVendorSearch,
  setSelectedVendorId,
  setSelectedAssetId,
  setSelectedDocumentId,
  setSelectedServiceId,
  updateVendor,
  deleteVendorRecord,
  addVendor,
  duplicateVendor,
  linkVendorToAsset,
  unlinkVendorFromAsset,
  addServiceRecordForVendor,
  addDocumentForVendor,
  setScreen
}: {
  vendors: VendorRecord[];
  filteredVendors: VendorRecord[];
  assets: AssetRecord[];
  documents: DocumentRecord[];
  serviceHistory: ServiceHistoryRecord[];
  calendar: CalendarEvent[];
  selectedVendor: VendorRecord;
  selectedVendorId: string;
  selectedAssetId: string;
  vendorSearch: string;
  setVendorSearch: (value: string) => void;
  setSelectedVendorId: (id: string) => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedDocumentId: (id: string) => void;
  setSelectedServiceId: (id: string) => void;
  updateVendor: (id: string, patch: Partial<VendorRecord>) => void;
  deleteVendorRecord: (id: string) => void;
  addVendor: () => void;
  duplicateVendor: (vendor: VendorRecord) => void;
  linkVendorToAsset: (assetId: string, vendorId: string) => void;
  unlinkVendorFromAsset: (assetId: string, vendorId: string) => void;
  addServiceRecordForVendor: (vendorId?: string) => void;
  addDocumentForVendor: (vendorId: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  return (
    <div>
      <Header title="Vendors" subtitle="Add vendors, edit contacts, link vendors to assets, and track vendor service history." />
      <div style={styles.gridTwo}>
        <section style={styles.card}>
          <button type="button" onClick={addVendor} style={styles.primaryButton}>+ New Vendor</button>
          <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} placeholder="Search vendors..." style={styles.input} />

          <div style={styles.scrollList}>
            {filteredVendors.map((row) => (
              <button key={row.id} type="button" onClick={() => setSelectedVendorId(row.id)} style={row.id === selectedVendorId ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}>
                <strong>{row.name}</strong>
                <span style={styles.smallMuted}>{row.category}</span>
                {row.phone && <span style={styles.smallMuted}>{row.phone}</span>}
                {row.email && <span style={styles.smallMuted}>{row.email}</span>}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>{selectedVendor.name}</h2>
          <p style={styles.kicker}>{selectedVendor.category}</p>

          <div style={styles.buttonRow}>
            <button type="button" onClick={addVendor} style={styles.primaryButton}>+ New Vendor</button>
            <button type="button" onClick={() => duplicateVendor(selectedVendor)} style={styles.secondaryButton}>Duplicate Vendor</button>
            <button type="button" onClick={() => addServiceRecordForVendor(selectedVendor.id)} style={styles.secondaryButton}>+ Vendor Service Note</button>
            <button type="button" onClick={() => addDocumentForVendor(selectedVendor.id)} style={styles.secondaryButton}>+ Vendor Document</button>
          </div>

          <label style={styles.label}>Vendor Name</label>
          <input value={selectedVendor.name} onChange={(e) => updateVendor(selectedVendor.id, { name: e.target.value })} style={styles.input} />

          <label style={styles.label}>Category</label>
          <input value={selectedVendor.category} onChange={(e) => updateVendor(selectedVendor.id, { category: e.target.value })} style={styles.input} />

          <label style={styles.label}>Phone</label>
          <input value={selectedVendor.phone || ""} onChange={(e) => updateVendor(selectedVendor.id, { phone: e.target.value })} placeholder="Phone number" style={styles.input} />

          <label style={styles.label}>Email</label>
          <input value={selectedVendor.email || ""} onChange={(e) => updateVendor(selectedVendor.id, { email: e.target.value })} placeholder="Email address" style={styles.input} />

          <label style={styles.label}>Address</label>
          <input value={selectedVendor.address || ""} onChange={(e) => updateVendor(selectedVendor.id, { address: e.target.value })} placeholder="Address" style={styles.input} />

          <label style={styles.label}>Vendor Notes / paste details here</label>
          <textarea value={selectedVendor.notes} onChange={(e) => updateVendor(selectedVendor.id, { notes: e.target.value })} placeholder="Paste vendor notes, contact details, service scope, account info, invoice notes, or anything useful..." style={styles.textareaHuge} />

          <button type="button" onClick={() => deleteVendorRecord(selectedVendor.id)} style={styles.dangerButton}>
            Delete Vendor
          </button>

          <h3 style={styles.h3}>Link Asset to This Vendor</h3>
          <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} style={styles.input}>
            {assets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <button type="button" onClick={() => linkVendorToAsset(selectedAssetId, selectedVendor.id)} style={styles.primaryButton}>+ Link Selected Asset</button>

          <h3 style={styles.h3}>Linked Assets</h3>
          {assets.filter((row) => row.vendorIds.includes(selectedVendor.id)).map((row) => (
            <div key={row.id} style={styles.linkedRow}>
              <button type="button" onClick={() => { setSelectedAssetId(row.id); setScreen("assets"); }} style={styles.linkedMainButton}>
                <strong>{row.name}</strong>
                <span style={styles.smallMuted}>{row.category} · {row.status}</span>
              </button>
              <button type="button" onClick={() => unlinkVendorFromAsset(row.id, selectedVendor.id)} style={styles.smallDangerButton}>Unlink</button>
            </div>
          ))}

          <h3 style={styles.h3}>Calendar Items</h3>
          {calendar.filter((row) => row.vendorId === selectedVendor.id).map((row) => (
            <button key={row.id} type="button" onClick={() => setScreen("calendar")} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.source || "Atlas"}</span>
            </button>
          ))}

          <h3 style={styles.h3}>Vendor Documents / Photos</h3>
          <button type="button" onClick={() => addDocumentForVendor(selectedVendor.id)} style={styles.listButton}>+ Add invoice, photo, manual, warranty, or note for {selectedVendor.name}</button>
          {documents.filter((row) => row.vendorId === selectedVendor.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedDocumentId(row.id); setScreen("documents"); }} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.type}</span>
              {row.fileDataUrl && <span style={styles.smallMuted}>Photo attached</span>}
            </button>
          ))}

          <h3 style={styles.h3}>Service History</h3>
          <button type="button" onClick={() => addServiceRecordForVendor(selectedVendor.id)} style={styles.listButton}>+ Add service note for {selectedVendor.name}</button>
          {serviceHistory.filter((row) => row.vendorId === selectedVendor.id).map((row) => (
            <button key={row.id} type="button" onClick={() => { setSelectedServiceId(row.id); setScreen("history"); }} style={styles.listButton}>
              <strong>{row.title}</strong>
              <span style={styles.smallMuted}>{row.date} · {row.status}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

function DocumentsPanel({
  documents,
  filteredDocuments,
  selectedDocument,
  assets,
  vendors,
  locations,
  serviceHistory,
  documentSearch,
  setDocumentSearch,
  setSelectedDocumentId,
  updateDocument,
  deleteDocumentRecord,
  addDocumentRecord,
  setSelectedAssetId,
  setSelectedVendorId,
  setSelectedLocationId,
  setSelectedServiceId,
  setScreen
}: {
  documents: DocumentRecord[];
  filteredDocuments: DocumentRecord[];
  selectedDocument: DocumentRecord | null;
  assets: AssetRecord[];
  vendors: VendorRecord[];
  locations: LocationRecord[];
  serviceHistory: ServiceHistoryRecord[];
  documentSearch: string;
  setDocumentSearch: (value: string) => void;
  setSelectedDocumentId: (id: string) => void;
  updateDocument: (id: string, patch: Partial<DocumentRecord>) => void;
  deleteDocumentRecord: (id: string) => void;
  addDocumentRecord: (patch?: Partial<DocumentRecord>) => void;
  setSelectedAssetId: (id: string) => void;
  setSelectedVendorId: (id: string) => void;
  setSelectedLocationId: (id: string) => void;
  setSelectedServiceId: (id: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  const linkedAsset = selectedDocument ? assets.find((row) => row.id === selectedDocument.assetId) : undefined;
  const linkedVendor = selectedDocument ? vendors.find((row) => row.id === selectedDocument.vendorId) : undefined;
  const linkedLocation = selectedDocument ? locations.find((row) => row.id === selectedDocument.locationId) : undefined;
  const linkedService = selectedDocument ? serviceHistory.find((row) => row.id === selectedDocument.serviceId) : undefined;
  const photoCount = documents.filter((row) => row.type === "Photo").length;
  const invoiceCount = documents.filter((row) => row.type === "Invoice").length;

  function handlePhotoUpload(fileList: FileList | null) {
    if (!selectedDocument) return;
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (typeof window !== "undefined") window.alert("Choose a photo/image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateDocument(selectedDocument.id, {
        type: "Photo",
        fileName: file.name,
        fileDataUrl: String(reader.result || ""),
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <Header title="Documents / Photos" subtitle="Upload visible photos, track invoices, manuals, warranties, notes, links, and delete bad records." />

      <div style={styles.statGrid}>
        <Stat label="Total Docs" value={documents.length} />
        <Stat label="Photos" value={photoCount} />
        <Stat label="Invoices" value={invoiceCount} />
        <Stat label="Selected" value={selectedDocument?.type || "None"} />
      </div>

      <div style={styles.gridTwo}>
        <section style={styles.card}>
          <button type="button" onClick={() => addDocumentRecord()} style={styles.primaryButton}>+ New Photo / Document</button>
          <input value={documentSearch} onChange={(e) => setDocumentSearch(e.target.value)} placeholder="Search photos, invoices, manuals, assets, vendors..." style={styles.input} />

          <div style={styles.scrollList}>
            {filteredDocuments.map((row) => {
              const linkedAssetRow = assets.find((assetRow) => assetRow.id === row.assetId);
              const linkedVendorRow = vendors.find((vendorRow) => vendorRow.id === row.vendorId);
              return (
                <button key={row.id} type="button" onClick={() => setSelectedDocumentId(row.id)} style={selectedDocument && row.id === selectedDocument.id ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}>
                  <strong>{row.title}</strong>
                  <span style={styles.smallMuted}>{row.date} · {row.type}</span>
                  <span style={styles.smallMuted}>{linkedAssetRow?.name || "No asset"} · {linkedVendorRow?.name || "No vendor"}</span>
                  {row.fileDataUrl && <span style={styles.smallMuted}>Photo attached: {row.fileName || "image"}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section style={styles.card}>
          {!selectedDocument && (
            <div>
              <h2 style={styles.h2}>No photo or document selected</h2>
              <p style={styles.muted}>Create a new photo, note, invoice, manual, warranty, or document record.</p>
              <button type="button" onClick={() => addDocumentRecord()} style={styles.primaryButton}>+ New Photo / Document</button>
            </div>
          )}

          {selectedDocument && (
            <div>
              <h2 style={styles.h2}>{selectedDocument.title}</h2>
              <p style={styles.kicker}>{selectedDocument.type}</p>

              {selectedDocument.fileDataUrl && (
                <div style={styles.photoPreviewBox}>
                  <img src={selectedDocument.fileDataUrl} alt={selectedDocument.title} style={styles.photoPreview} />
                  <span style={styles.smallMuted}>{selectedDocument.fileName || "Uploaded photo"}</span>
                </div>
              )}

              <label style={styles.uploadBox}>
                Choose Photo / Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handlePhotoUpload(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  style={styles.hiddenFileInput}
                />
              </label>

              {selectedDocument.fileDataUrl && (
                <button
                  type="button"
                  onClick={() => updateDocument(selectedDocument.id, { fileName: "", fileDataUrl: "", mimeType: "" })}
                  style={styles.secondaryButton}
                >
                  Remove Uploaded Photo Only
                </button>
              )}

              <label style={styles.label}>Title</label>
              <input value={selectedDocument.title} onChange={(e) => updateDocument(selectedDocument.id, { title: e.target.value })} style={styles.input} />

              <label style={styles.label}>Type</label>
              <select value={selectedDocument.type} onChange={(e) => updateDocument(selectedDocument.id, { type: e.target.value as DocumentType })} style={styles.input}>
                <option value="Photo">Photo</option>
                <option value="Invoice">Invoice</option>
                <option value="Manual">Manual</option>
                <option value="Warranty">Warranty</option>
                <option value="Note">Note</option>
                <option value="Other">Other</option>
              </select>

              <label style={styles.label}>Date</label>
              <input value={selectedDocument.date} onChange={(e) => updateDocument(selectedDocument.id, { date: e.target.value })} style={styles.input} />

              <label style={styles.label}>Linked Asset</label>
              <select value={selectedDocument.assetId || ""} onChange={(e) => updateDocument(selectedDocument.id, { assetId: e.target.value })} style={styles.input}>
                <option value="">No asset</option>
                {assets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>

              <label style={styles.label}>Linked Service Record</label>
              <select value={selectedDocument.serviceId || ""} onChange={(e) => updateDocument(selectedDocument.id, { serviceId: e.target.value })} style={styles.input}>
                <option value="">No service record</option>
                {serviceHistory.map((row) => <option key={row.id} value={row.id}>{row.date} · {row.title}</option>)}
              </select>

              <label style={styles.label}>Linked Vendor</label>
              <select value={selectedDocument.vendorId || ""} onChange={(e) => updateDocument(selectedDocument.id, { vendorId: e.target.value })} style={styles.input}>
                <option value="">No vendor</option>
                {vendors.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>

              <label style={styles.label}>Linked Location</label>
              <select value={selectedDocument.locationId || ""} onChange={(e) => updateDocument(selectedDocument.id, { locationId: e.target.value })} style={styles.input}>
                <option value="">No location</option>
                {locations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>

              <label style={styles.label}>URL / file note / where this is stored</label>
              <input value={selectedDocument.url || ""} onChange={(e) => updateDocument(selectedDocument.id, { url: e.target.value })} placeholder="Paste Google Drive link, photo filename, invoice location, manual URL, or note" style={styles.input} />

              <label style={styles.label}>Notes / paste details here</label>
              <textarea value={selectedDocument.notes} onChange={(e) => updateDocument(selectedDocument.id, { notes: e.target.value })} placeholder="Paste invoice details, photo description, warranty info, manual notes, repair notes, or where the real file is stored..." style={styles.textareaHuge} />

              {selectedDocument.url && (
                <a href={selectedDocument.url} target="_blank" rel="noreferrer" style={styles.linkButton}>
                  Open Link
                </a>
              )}

              <button type="button" onClick={() => deleteDocumentRecord(selectedDocument.id)} style={styles.dangerButton}>
                Delete Photo / Note / Document
              </button>

              <h3 style={styles.h3}>Open Linked Records</h3>
              <div style={styles.miniGrid}>
                <button type="button" onClick={() => { if (linkedAsset) { setSelectedAssetId(linkedAsset.id); setScreen("assets"); } }} style={styles.listButton}>
                  <strong>Asset</strong>
                  <span style={styles.smallMuted}>{linkedAsset?.name || "No linked asset"}</span>
                </button>

                <button type="button" onClick={() => { if (linkedVendor) { setSelectedVendorId(linkedVendor.id); setScreen("vendors"); } }} style={styles.listButton}>
                  <strong>Vendor</strong>
                  <span style={styles.smallMuted}>{linkedVendor?.name || "No linked vendor"}</span>
                </button>

                <button type="button" onClick={() => { if (linkedLocation) { setSelectedLocationId(linkedLocation.id); setScreen("locations"); } }} style={styles.listButton}>
                  <strong>Location</strong>
                  <span style={styles.smallMuted}>{linkedLocation?.name || "No linked location"}</span>
                </button>

                <button type="button" onClick={() => { if (linkedService) { setSelectedServiceId(linkedService.id); setScreen("history"); } }} style={styles.listButton}>
                  <strong>Service</strong>
                  <span style={styles.smallMuted}>{linkedService?.title || "No linked service"}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CalendarPanel({
  calendar,
  setCalendar,
  assets,
  vendors,
  serviceHistory,
  setSelectedAssetId,
  setSelectedVendorId,
  setSelectedServiceId,
  setScreen
}: {
  calendar: CalendarEvent[];
  setCalendar: (rows: CalendarEvent[]) => void;
  assets: AssetRecord[];
  vendors: VendorRecord[];
  serviceHistory: ServiceHistoryRecord[];
  setSelectedAssetId: (id: string) => void;
  setSelectedVendorId: (id: string) => void;
  setSelectedServiceId: (id: string) => void;
  setScreen: (screen: Screen) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedEventId, setSelectedEventId] = useState(calendar[0]?.id || "");

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - firstWeekday);
  const monthName = visibleMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return date;
  });

  const selectedDayEvents = calendar
    .filter((row) => row.date === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title));

  const selectedEvent =
    calendar.find((row) => row.id === selectedEventId) ||
    selectedDayEvents[0] ||
    calendar[0] ||
    null;

  const upcomingEvents = [...calendar]
    .filter((row) => row.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  function goPreviousMonth() {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
  }

  function goToday() {
    const today = new Date();
    setVisibleMonth(today);
    setSelectedDate(todayISO());
  }

  function updateCalendarEvent(id: string, patch: Partial<CalendarEvent>) {
    setCalendar(calendar.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addCalendarEventForDate(date: string) {
    const newId = "cal-" + Date.now();
    const next: CalendarEvent = {
      id: newId,
      date,
      title: "New scheduled item",
      notes: "",
      assetId: "",
      vendorId: "",
      serviceId: "",
      source: "Atlas",
      externalLink: ""
    };

    setCalendar([next, ...calendar]);
    setSelectedEventId(newId);
    setSelectedDate(date);
  }

  function deleteCalendarEvent(id: string) {
    const ok = typeof window === "undefined" ? true : window.confirm("Delete this calendar item?");
    if (!ok) return;

    const remaining = calendar.filter((row) => row.id !== id);
    setCalendar(remaining);
    setSelectedEventId(remaining.find((row) => row.date === selectedDate)?.id || remaining[0]?.id || "");
  }

  function selectCalendarDate(date: Date) {
    const iso = toISODateLocal(date);
    setSelectedDate(iso);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedEventId(calendar.find((row) => row.date === iso)?.id || "");
  }

  return (
    <div>
      <Header title="Full Month Calendar" subtitle="Schedule work, edit/delete calendar items, and attach them to assets, vendors, and service notes. Outlook, Apple, Google, or other calendar links can be tracked here now and synced later with account connections." />

      <div style={styles.statGrid}>
        <Stat label="Calendar Items" value={calendar.length} />
        <Stat label="Selected Date" value={selectedDate} />
        <Stat label="Today Forward" value={calendar.filter((row) => row.date >= todayISO()).length} />
        <Stat label="External Links" value={calendar.filter((row) => row.externalLink).length} />
      </div>

      <div style={styles.calendarLayout}>
        <section style={styles.card}>
          <div style={styles.calendarToolbar}>
            <button type="button" onClick={goPreviousMonth} style={styles.secondaryButton}>Previous</button>
            <h2 style={styles.calendarTitle}>{monthName}</h2>
            <button type="button" onClick={goNextMonth} style={styles.secondaryButton}>Next</button>
            <button type="button" onClick={goToday} style={styles.primaryButton}>Today</button>
          </div>

          <div style={styles.weekHeaderGrid}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} style={styles.weekHeader}>{day}</div>
            ))}
          </div>

          <div style={styles.monthGrid}>
            {calendarCells.map((date) => {
              const iso = toISODateLocal(date);
              const dayEvents = calendar.filter((row) => row.date === iso);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = iso === selectedDate;
              const isToday = iso === todayISO();

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectCalendarDate(date)}
                  style={{
                    ...styles.monthDay,
                    opacity: isCurrentMonth ? 1 : 0.45,
                    border: isSelected ? "2px solid #caa24a" : isToday ? "2px solid #071d3a" : "1px solid #e4e8f0",
                    background: isSelected ? "#fff7df" : "#ffffff"
                  }}
                >
                  <div style={styles.dayNumber}>{date.getDate()}</div>
                  {dayEvents.slice(0, 3).map((event) => (
                    <div key={event.id} style={styles.eventPill}>
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={styles.moreEvents}>+{dayEvents.length - 3} more</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>{selectedDate}</h2>
          <button type="button" onClick={() => addCalendarEventForDate(selectedDate)} style={styles.primaryButton}>
            + Add Item to This Day
          </button>

          <h3 style={styles.h3}>Items on Selected Day</h3>
          {selectedDayEvents.length === 0 && (
            <div style={styles.answerBox}>No calendar items on this day yet.</div>
          )}

          {selectedDayEvents.map((event) => {
            const linkedAsset = assets.find((row) => row.id === event.assetId);
            const linkedVendor = vendors.find((row) => row.id === event.vendorId);
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                style={selectedEvent && event.id === selectedEvent.id ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
              >
                <strong>{event.title}</strong>
                <span style={styles.smallMuted}>{event.source || "Atlas"} · {linkedAsset?.name || "No asset"} · {linkedVendor?.name || "No vendor"}</span>
              </button>
            );
          })}

          <h3 style={styles.h3}>Upcoming</h3>
          {upcomingEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                setSelectedEventId(event.id);
                setSelectedDate(event.date);
                const parts = event.date.split("-").map(Number);
                if (parts.length === 3) setVisibleMonth(new Date(parts[0], parts[1] - 1, 1));
              }}
              style={styles.listButton}
            >
              <strong>{event.title}</strong>
              <span style={styles.smallMuted}>{event.date} · {event.source || "Atlas"}</span>
            </button>
          ))}
        </section>
      </div>

      <section style={{ ...styles.card, marginTop: 18 }}>
        {!selectedEvent && (
          <div>
            <h2 style={styles.h2}>No calendar item selected</h2>
            <button type="button" onClick={() => addCalendarEventForDate(selectedDate)} style={styles.primaryButton}>
              + Add Item to Selected Day
            </button>
          </div>
        )}

        {selectedEvent && (
          <div>
            <h2 style={styles.h2}>Edit Calendar Item</h2>
            <p style={styles.kicker}>{selectedEvent.date} · {selectedEvent.source || "Atlas"}</p>

            <div style={styles.calendarEditorGrid}>
              <div>
                <label style={styles.label}>Title</label>
                <input value={selectedEvent.title} onChange={(e) => updateCalendarEvent(selectedEvent.id, { title: e.target.value })} style={styles.input} />
              </div>

              <div>
                <label style={styles.label}>Date</label>
                <input value={selectedEvent.date} onChange={(e) => { updateCalendarEvent(selectedEvent.id, { date: e.target.value }); setSelectedDate(e.target.value); }} style={styles.input} />
              </div>

              <div>
                <label style={styles.label}>External Calendar Source</label>
                <select value={selectedEvent.source || "Atlas"} onChange={(e) => updateCalendarEvent(selectedEvent.id, { source: e.target.value as CalendarSource })} style={styles.input}>
                  <option value="Atlas">Atlas</option>
                  <option value="Outlook">Outlook</option>
                  <option value="Apple">Apple</option>
                  <option value="Google">Google</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>External Calendar Link / Sync Note</label>
                <input value={selectedEvent.externalLink || ""} onChange={(e) => updateCalendarEvent(selectedEvent.id, { externalLink: e.target.value })} placeholder="Paste Outlook, Apple, Google, or shared calendar link/note" style={styles.input} />
              </div>

              <div>
                <label style={styles.label}>Linked Asset</label>
                <select value={selectedEvent.assetId || ""} onChange={(e) => updateCalendarEvent(selectedEvent.id, { assetId: e.target.value })} style={styles.input}>
                  <option value="">No asset</option>
                  {assets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </div>

              <div>
                <label style={styles.label}>Linked Vendor</label>
                <select value={selectedEvent.vendorId || ""} onChange={(e) => updateCalendarEvent(selectedEvent.id, { vendorId: e.target.value })} style={styles.input}>
                  <option value="">No vendor</option>
                  {vendors.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </div>

              <div>
                <label style={styles.label}>Linked Service Note / Work Order</label>
                <select value={selectedEvent.serviceId || ""} onChange={(e) => updateCalendarEvent(selectedEvent.id, { serviceId: e.target.value })} style={styles.input}>
                  <option value="">No service note</option>
                  {serviceHistory.map((row) => <option key={row.id} value={row.id}>{row.date} · {row.title}</option>)}
                </select>
              </div>
            </div>

            <label style={styles.label}>Notes</label>
            <textarea value={selectedEvent.notes} onChange={(e) => updateCalendarEvent(selectedEvent.id, { notes: e.target.value })} placeholder="Scheduled work details, reminders, vendor timing, owner notes, external calendar notes..." style={styles.textareaHuge} />

            {selectedEvent.externalLink && (
              <a href={selectedEvent.externalLink} target="_blank" rel="noreferrer" style={styles.linkButton}>
                Open External Calendar Link
              </a>
            )}

            <div style={styles.miniGrid}>
              <button type="button" onClick={() => { if (selectedEvent.assetId) { setSelectedAssetId(selectedEvent.assetId); setScreen("assets"); } }} style={styles.listButton}>
                <strong>Open Linked Asset</strong>
                <span style={styles.smallMuted}>{assets.find((row) => row.id === selectedEvent.assetId)?.name || "No linked asset"}</span>
              </button>

              <button type="button" onClick={() => { if (selectedEvent.vendorId) { setSelectedVendorId(selectedEvent.vendorId); setScreen("vendors"); } }} style={styles.listButton}>
                <strong>Open Linked Vendor</strong>
                <span style={styles.smallMuted}>{vendors.find((row) => row.id === selectedEvent.vendorId)?.name || "No linked vendor"}</span>
              </button>

              <button type="button" onClick={() => { if (selectedEvent.serviceId) { setSelectedServiceId(selectedEvent.serviceId); setScreen("history"); } }} style={styles.listButton}>
                <strong>Open Linked Service</strong>
                <span style={styles.smallMuted}>{serviceHistory.find((row) => row.id === selectedEvent.serviceId)?.title || "No linked service"}</span>
              </button>
            </div>

            <button type="button" onClick={() => deleteCalendarEvent(selectedEvent.id)} style={styles.dangerButton}>
              Delete Calendar Item
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function BlankCanvasPanel() {
  const templateSections = [
    { title: "Main House", note: "Generic main residence record for rooms, systems, appliances, procedures, and owner-facing notes." },
    { title: "Guest House / ADU", note: "Reusable guest house or ADU location structure with assets, vendors, and service history." },
    { title: "Garage", note: "Garage doors, vehicles, tools, chargers, storage, equipment, and service records." },
    { title: "Mechanical Room", note: "Boilers, water heaters, pumps, HVAC equipment, valves, shutoffs, photos, and reset procedures." },
    { title: "Pool / Spa", note: "Pool equipment, spa equipment, chemical checks, backwash procedure, seasonal opening/closing, and vendors." },
    { title: "Dock / Waterfront", note: "Boat lifts, watercraft, dock utilities, lift boxes, seasonal procedures, and waterfront safety notes." },
    { title: "Grounds", note: "Lawns, irrigation, gardens, sport court, exterior lighting, fences, and recurring grounds tasks." },
    { title: "Emergency", note: "Main water shutoff, gas shutoff, electrical panels, generator, leak response, alarm response, and emergency vendors." }
  ];

  return (
    <div>
      <Header title="Blank Canvas" subtitle="Sellable Atlas Estate OS template with no private 2000 property information." />

      <div style={styles.statGrid}>
        <Stat label="Version" value="v1" />
        <Stat label="Private Data" value="None" />
        <Stat label="Use" value="Demo" />
        <Stat label="Goal" value="Sellable" />
      </div>

      <div style={styles.gridTwo}>
        <section style={styles.card}>
          <h2 style={styles.h2}>Blank Canvas Purpose</h2>
          <p style={styles.muted}>This section is the clean reusable version of Atlas. It keeps the same structure as the 2000 system, but removes all private property details.</p>

          <h3 style={styles.h3}>Rules</h3>
          <div style={styles.listButton}>No 2000-specific address, family, owner, password, access-code, or private invoice information.</div>
          <div style={styles.listButton}>Use sample/demo data only.</div>
          <div style={styles.listButton}>Keep the same Atlas structure: locations, assets, vendors, documents, photos, calendar, map, procedures, service history, and Ask Atlas.</div>
          <div style={styles.listButton}>Turn real 2000 lessons into reusable templates for future estates.</div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.h2}>Sales Positioning</h2>
          <p style={styles.kicker}>Atlas Private Estate OS</p>
          <p style={styles.muted}>For homes too complex to manage from memory. Atlas turns a private property into a searchable operating system.</p>
          <div style={styles.answerBox}>Assets + Locations + Vendors + Documents + Photos + Procedures + Maps + Calendar + Service History + Ask Atlas</div>
        </section>
      </div>

      <div style={{ ...styles.card, marginTop: 18 }}>
        <h2 style={styles.h2}>Reusable Estate Sections</h2>
        <div style={styles.gridTwo}>
          {templateSections.map((item) => (
            <div key={item.title} style={styles.listButton}>
              <strong>{item.title}</strong>
              <span style={styles.smallMuted}>{item.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProceduresPanel() {
  const procedures = [
    {
      title: "Pool Backwash Procedure",
      category: "Pool",
      priority: "High",
      steps: [
        "Confirm the pool pump is off before changing valve positions.",
        "Set the filter valve to Backwash.",
        "Turn the pump on and run until the sight glass or discharge water looks clear.",
        "Turn the pump off.",
        "Set the valve to Rinse.",
        "Turn the pump on briefly to rinse the filter bed.",
        "Turn the pump off.",
        "Return the valve to Filter.",
        "Turn the pump back on and confirm normal pressure and flow.",
        "Record the date, pressure before/after, and any issues."
      ],
      notes: "Confirm exact valve positions against the actual pool equipment labels before relying on this as final."
    },
    {
      title: "Spa / Hot Tub Check",
      category: "Spa",
      priority: "Medium",
      steps: [
        "Check water level.",
        "Check temperature and display status.",
        "Inspect for visible leaks or cabinet water.",
        "Check filter condition.",
        "Confirm jets and circulation are operating.",
        "Record chemistry readings and any alerts."
      ],
      notes: "Linked asset: Sundance Optima hot tub."
    },
    {
      title: "Leak / Water Shutoff Response",
      category: "Emergency",
      priority: "High",
      steps: [
        "Locate the leak source if safe.",
        "Shut off local fixture valve if available.",
        "If needed, shut off main water or use FloLogic shutoff.",
        "Protect electrical equipment from water.",
        "Photograph damage and source.",
        "Contact plumbing or leak detection vendor.",
        "Create an Atlas note under the affected asset or location."
      ],
      notes: "Do not store private access codes or passwords in this procedure."
    },
    {
      title: "Boiler / Mechanical Room Check",
      category: "Mechanical",
      priority: "High",
      steps: [
        "Check boiler display for faults.",
        "Confirm system pressure is in normal range.",
        "Check for leaks around piping, pumps, relief valves, and tanks.",
        "Confirm DHW tanks are heating normally.",
        "Listen for unusual pump or burner noise.",
        "Record error codes before resetting anything.",
        "Contact mechanical vendor if fault returns."
      ],
      notes: "Linked assets: Viessmann Vitodens 200 boilers and Vitocell 300-V DHW tanks."
    },
    {
      title: "Generator Visual Check",
      category: "Electrical",
      priority: "Medium",
      steps: [
        "Inspect generator area for debris.",
        "Check for visible leaks, loose panels, or unusual smell.",
        "Confirm status indicator is normal.",
        "Verify service access is clear.",
        "Record any alert lights or error messages."
      ],
      notes: "Do not perform electrical work unless qualified."
    },
    {
      title: "Boat / Dock Seasonal Check",
      category: "Dock",
      priority: "Medium",
      steps: [
        "Inspect dock surface and edges.",
        "Check boat lift controls and visible lift box condition.",
        "Confirm solar panels and battery boxes are secure.",
        "Check Cobalt and Sea-Doo areas for loose lines or damage.",
        "Record photos of anything that changed."
      ],
      notes: "Linked areas: Dock, Cobalt, Sea-Doo, Sunstream lift boxes."
    }
  ];

  return (
    <div>
      <Header title="Procedures" subtitle="Step-by-step operating procedures for recurring work, emergency response, and estate systems." />

      <div style={styles.statGrid}>
        <Stat label="Procedures" value={procedures.length} />
        <Stat label="High Priority" value={procedures.filter((item) => item.priority === "High").length} />
        <Stat label="Use" value="Operations" />
        <Stat label="Status" value="Draft" />
      </div>

      <div style={styles.gridTwo}>
        {procedures.map((procedure) => (
          <section key={procedure.title} style={styles.card}>
            <p style={styles.kicker}>{procedure.category} · {procedure.priority}</p>
            <h2 style={styles.h2}>{procedure.title}</h2>

            <ol style={{ marginTop: 10, paddingLeft: 22, lineHeight: 1.55 }}>
              {procedure.steps.map((step) => (
                <li key={step} style={{ marginBottom: 8 }}>{step}</li>
              ))}
            </ol>

            <div style={styles.answerBox}>{procedure.notes}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
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
  calendarLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(620px, 1fr) minmax(320px, 420px)",
    gap: 18,
    alignItems: "start"
  },
  miniGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
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
  secondaryButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#071d3a",
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 10,
    marginBottom: 12
  },
  dangerButton: {
    width: "100%",
    border: "1px solid #f1b4b4",
    background: "#fff5f5",
    color: "#8a1f1f",
    borderRadius: 12,
    padding: "12px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 8,
    marginBottom: 12
  },
  smallDangerButton: {
    border: "1px solid #f1b4b4",
    background: "#fff5f5",
    color: "#8a1f1f",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  linkButton: {
    display: "inline-block",
    textDecoration: "none",
    border: 0,
    background: "#071d3a",
    color: "#ffffff",
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 4,
    marginBottom: 12
  },
  uploadBox: {
    display: "block",
    width: "100%",
    border: "2px dashed #caa24a",
    background: "#fff7df",
    color: "#071d3a",
    borderRadius: 14,
    padding: 16,
    textAlign: "center",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 10,
    marginBottom: 12
  },
  hiddenFileInput: {
    display: "none"
  },
  photoPreviewBox: {
    border: "1px solid #e4e8f0",
    borderRadius: 16,
    padding: 12,
    background: "#f8fafc",
    marginBottom: 12
  },
  photoPreview: {
    width: "100%",
    maxHeight: 360,
    objectFit: "contain",
    borderRadius: 12,
    background: "#071d3a"
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10
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
  linkedRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
    marginBottom: 8
  },
  linkedMainButton: {
    width: "100%",
    border: "1px solid #e4e8f0",
    background: "#ffffff",
    color: "#10213d",
    borderRadius: 12,
    padding: 12,
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 800
  },
  scrollList: {
    maxHeight: "calc(100vh - 190px)",
    overflow: "auto",
    paddingRight: 4
  },
  scrollListSmall: {
    maxHeight: 280,
    overflow: "auto",
    paddingRight: 4,
    marginBottom: 16
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
  textareaHuge: {
    width: "100%",
    minHeight: 260,
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    lineHeight: 1.5
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
  },
  calendarToolbar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 14
  },
  calendarTitle: {
    margin: "0 10px 0 0",
    fontSize: 28,
    flex: 1
  },
  weekHeaderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 8,
    marginBottom: 8
  },
  weekHeader: {
    fontSize: 12,
    fontWeight: 900,
    color: "#667085",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  monthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 8
  },
  monthDay: {
    minHeight: 104,
    borderRadius: 14,
    padding: 8,
    textAlign: "left",
    cursor: "pointer",
    overflow: "hidden"
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 6
  },
  eventPill: {
    background: "#071d3a",
    color: "#ffffff",
    borderRadius: 999,
    padding: "4px 7px",
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  moreEvents: {
    color: "#667085",
    fontSize: 11,
    fontWeight: 900,
    marginTop: 3
  },
  calendarEditorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12
  }
};
