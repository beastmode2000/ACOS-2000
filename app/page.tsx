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

function cleanId(text: string) {
return text
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-+|-+$/g, "")
.slice(0, 40);
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
{ id: "psf-mechanical", name: "P.S.F / PSF Mechanical", category: "HVAC / Mechanical", notes: "HVAC, boiler, hydronic, Desert Aire, pool mechanical, and mechanical vendor reference." },
{ id: "penthouse-drapery", name: "Penthouse Drapery", category: "Drapery / Roller Shades", phone: "206-292-8336", email: "[accounting@penthousedrapery.com](mailto:accounting@penthousedrapery.com)", address: "4033 16th Ave SW Suite A, Seattle, WA 98106", notes: "Invoice 176396 dated 06/16/2026. Motorized roller shade repair linked to Blinds Lutron." },
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
notes: "Use this record to track Sea-Doo service, crash-related repair notes, photos, parts, and vendor updates."
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
notes: "Use this record to describe or link Sea-Doo repair photos until real file uploads are connected."
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
const target = "[https://www.atlas2000.com/?atlas=](https://www.atlas2000.com/?atlas=)" + type + ":" + id;
return "[https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=](https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=)" + encodeURIComponent(target);
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
const [assistantAnswer, setAssistantAnswer] = useState("Ask Atlas about an asset, location, vendor, boiler, HVAC unit, pool, spa, document, photo, invoice, procedure, or service history.");
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
fetch("[https://api.open-meteo.com/v1/forecast?latitude=47.57&longitude=-122.22&current=temperature_2m,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto](https://api.open-meteo.com/v1/forecast?latitude=47.57&longitude=-122.22&current=temperature_2m,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto)")
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
const selectedService = serviceHistory.find((item) => item.id === selectedServiceId) || serviceHistory[0] || defaultServiceHistory[0];
const selectedDocument = documents.find((item) => item.id === selectedDocumentId) || documents[0] || defaultDocuments[0];

const filteredAssets = useMemo(() => {
const q = assetSearch.toLowerCase();
return assets.filter((item) => {
const text = item.name + " " + item.category + " " + item.notes;
return text.toLowerCase().includes(q);
});
}, [assets, assetSearch]);

const filteredVendors = useMemo(() => {
const q = vendorSearch.toLowerCase();
return vendors.filter((item) => {
const text = item.name + " " + item.category + " " + (item.phone || "") + " " + (item.email || "") + " " + item.notes;
return text.toLowerCase().includes(q);
});
}, [vendors, vendorSearch]);

const filteredDocuments = useMemo(() => {
const q = documentSearch.toLowerCase();
return documents.filter((item) => {
const linkedAsset = assets.find((asset) => asset.id === item.assetId);
const linkedVendor = vendors.find((vendor) => vendor.id === item.vendorId);
const linkedLocation = locations.find((location) => location.id === item.locationId);
const linkedService = serviceHistory.find((service) => service.id === item.serviceId);
const text =
item.title + " " +
item.type + " " +
item.date + " " +
(item.url || "") + " " +
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
rows.map((asset) => {
if (asset.id !== assetId) return asset;
if (asset.vendorIds.includes(vendorId)) return asset;
return { ...asset, vendorIds: [...asset.vendorIds, vendorId] };
})
);
}

function unlinkVendorFromAsset(assetId: string, vendorId: string) {
setAssets((rows) =>
rows.map((asset) => {
if (asset.id !== assetId) return asset;
return { ...asset, vendorIds: asset.vendorIds.filter((id) => id !== vendorId) };
})
);
}

function addServiceRecordForAsset(assetId?: string) {
const assetForRecord = assets.find((asset) => asset.id === assetId) || selectedAsset || assets[0];
const vendorForRecord =
vendors.find((vendor) => assetForRecord.vendorIds.includes(vendor.id)) ||
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
```

}

function addServiceRecordForVendor(vendorId?: string) {
const vendorForRecord = vendors.find((vendor) => vendor.id === vendorId) || selectedVendor || vendors[0];
const linkedAsset =
assets.find((asset) => asset.vendorIds.includes(vendorForRecord.id)) ||
selectedAsset ||
assets[0];

```
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
```

}

function addDocumentRecord(patch?: Partial<DocumentRecord>) {
const assetForDoc = assets.find((asset) => asset.id === patch?.assetId) || selectedAsset || assets[0];
const serviceForDoc = serviceHistory.find((service) => service.id === patch?.serviceId);
const vendorForDoc = vendors.find((vendor) => vendor.id === patch?.vendorId) || selectedVendor || vendors[0];
const locationForDoc = locations.find((location) => location.id === patch?.locationId) || selectedLocation || locations[0];

```
const newId = "doc-" + Date.now();
const next: DocumentRecord = {
  id: newId,
  date: todayISO(),
  title: patch?.title || "New photo / document",
  type: patch?.type || "Photo",
  assetId: patch?.assetId || assetForDoc.id,
  serviceId: patch?.serviceId || serviceForDoc?.id || "",
  vendorId: patch?.vendorId || vendorForDoc.id,
  locationId: patch?.locationId || assetForDoc.locationId || locationForDoc.id,
  url: patch?.url || "",
  notes: patch?.notes || ""
};

setDocuments((rows) => [next, ...rows]);
setSelectedDocumentId(newId);
setSelectedAssetId(next.assetId || selectedAssetId);
setSelectedVendorId(next.vendorId || selectedVendorId);
setSelectedLocationId(next.locationId || selectedLocationId);
if (next.serviceId) setSelectedServiceId(next.serviceId);
setDocumentSearch("");
setScreen("documents");
```

}

function addDocumentForAsset(assetId: string) {
const asset = assets.find((item) => item.id === assetId);
addDocumentRecord({
title: "Photo / document for " + (asset?.name || "asset"),
type: "Photo",
assetId,
vendorId: asset?.vendorIds[0] || selectedVendorId,
locationId: asset?.locationId || selectedLocationId
});
}

function addDocumentForService(serviceId: string) {
const service = serviceHistory.find((item) => item.id === serviceId);
addDocumentRecord({
title: "Photo / document for " + (service?.title || "service record"),
type: "Photo",
assetId: service?.assetId || selectedAssetId,
serviceId,
vendorId: service?.vendorId || selectedVendorId,
locationId: assets.find((asset) => asset.id === service?.assetId)?.locationId || selectedLocationId
});
}

function addDocumentForVendor(vendorId: string) {
const vendor = vendors.find((item) => item.id === vendorId);
const linkedAsset = assets.find((asset) => asset.vendorIds.includes(vendorId));
addDocumentRecord({
title: "Document for " + (vendor?.name || "vendor"),
type: "Invoice",
assetId: linkedAsset?.id || selectedAssetId,
vendorId,
locationId: linkedAsset?.locationId || selectedLocationId
});
}

function addDocumentForLocation(locationId: string) {
const location = locations.find((item) => item.id === locationId);
addDocumentRecord({
title: "Photo / document for " + (location?.name || "location"),
type: "Photo",
assetId: selectedAssetId,
vendorId: selectedVendorId,
locationId
});
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
setVendorSearch("");
setDocumentSearch("");
}

function askAtlas() {
const q = assistantQuestion.toLowerCase();
if (q.trim().length === 0) {
setAssistantAnswer("Type a question first.");
return;
}

```
const allLines: string[] = [];
assets.forEach((item) => allLines.push("Asset: " + item.name + ". " + item.category + ". " + item.notes));
locations.forEach((item) => allLines.push("Location: " + item.name + ". " + item.type + ". " + item.notes));
vendors.forEach((item) => allLines.push("Vendor: " + item.name + ". " + item.category + ". " + (item.phone || "") + ". " + (item.email || "") + ". " + item.notes));
serviceHistory.forEach((item) => allLines.push("Service History: " + item.title + ". " + item.date + ". " + item.status + ". " + item.notes));
documents.forEach((item) => allLines.push("Document: " + item.title + ". " + item.type + ". " + item.date + ". " + item.notes + ". " + (item.url || "")));

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
```

}

return ( <main style={styles.shell}> <aside style={styles.sidebar}> <div style={styles.brandBox}> <div style={styles.logoCircle}>A</div> <div> <div style={styles.brandTitle}>ATLAS</div> <div style={styles.brandSubtitle}>2000 Estate Operations</div> </div> </div>

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
      <div>
        <Header title="Atlas Dashboard" subtitle="Private 2000 estate operations control center." />
        <div style={styles.statGrid}>
          <Stat label="Locations" value={locations.length} />
          <Stat label="Assets" value={assets.length} />
          <Stat label="Vendors" value={vendors.length} />
          <Stat label="Docs / Photos" value={documents.length} />
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
            <QuickRecord label="Add New Vendor" onClick={addVendor} />
            <QuickRecord label="Add Photo / Document" onClick={() => addDocumentRecord()} />
            <QuickRecord label="Open Service History" onClick={() => setScreen("history")} />
          </section>
        </div>
      </div>
    )}

    {screen === "map" && (
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
            <button type="button" onClick={() => addDocumentForLocation(selectedLocation.id)} style={styles.primaryButton}>
              + Add Photo / Document for This Location
            </button>
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

            <h3 style={styles.h3}>Photos / Documents here</h3>
            {documents.filter((doc) => doc.locationId === selectedLocation.id).map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => { setSelectedDocumentId(doc.id); setScreen("documents"); }}
                style={styles.listButton}
              >
                <strong>{doc.title}</strong>
                <span style={styles.smallMuted}>{doc.date} · {doc.type}</span>
              </button>
            ))}
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
            <button type="button" onClick={() => addDocumentForLocation(selectedLocation.id)} style={styles.primaryButton}>
              + Add Photo / Document for This Location
            </button>
            <label style={styles.label}>Name</label>
            <input value={selectedLocation.name} onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })} style={styles.input} />
            <label style={styles.label}>Type</label>
            <input value={selectedLocation.type} onChange={(e) => updateLocation(selectedLocation.id, { type: e.target.value })} style={styles.input} />
            <label style={styles.label}>Notes</label>
            <textarea value={selectedLocation.notes} onChange={(e) => updateLocation(selectedLocation.id, { notes: e.target.value })} style={styles.textarea} />

            <h3 style={styles.h3}>Photos / Documents</h3>
            {documents.filter((doc) => doc.locationId === selectedLocation.id).map((doc) => (
              <button key={doc.id} type="button" onClick={() => { setSelectedDocumentId(doc.id); setScreen("documents"); }} style={styles.listButton}>
                <strong>{doc.title}</strong>
                <span style={styles.smallMuted}>{doc.date} · {doc.type}</span>
              </button>
            ))}
          </section>
        </div>
      </div>
    )}

    {screen === "assets" && (
      <div>
        <Header title="Assets" subtitle="Equipment, systems, vehicles, aircraft, appliances, linked vendors, photos, documents, and service history." />
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

            <button type="button" onClick={() => addServiceRecordForAsset(selectedAsset.id)} style={styles.primaryButton}>
              + Add Service Note for This Asset
            </button>
            <button type="button" onClick={() => addDocumentForAsset(selectedAsset.id)} style={styles.secondaryButton}>
              + Add Photo / Document for This Asset
            </button>

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

            <h3 style={styles.h3}>Add Vendor to This Asset</h3>
            <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} style={styles.input}>
              {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
            </select>
            <button type="button" onClick={() => linkVendorToAsset(selectedAsset.id, selectedVendorId)} style={styles.primaryButton}>
              + Link Selected Vendor
            </button>

            <h3 style={styles.h3}>Linked Vendors</h3>
            {vendors.filter((vendor) => selectedAsset.vendorIds.includes(vendor.id)).map((vendor) => (
              <div key={vendor.id} style={styles.linkedRow}>
                <button type="button" onClick={() => { setSelectedVendorId(vendor.id); setScreen("vendors"); }} style={styles.linkedMainButton}>
                  <strong>{vendor.name}</strong>
                  <span style={styles.smallMuted}>{vendor.category}</span>
                </button>
                <button type="button" onClick={() => unlinkVendorFromAsset(selectedAsset.id, vendor.id)} style={styles.smallDangerButton}>
                  Unlink
                </button>
              </div>
            ))}

            <h3 style={styles.h3}>Photos / Documents</h3>
            <button type="button" onClick={() => addDocumentForAsset(selectedAsset.id)} style={styles.listButton}>
              + Add photo, invoice, manual, warranty, or note for {selectedAsset.name}
            </button>
            {documents.filter((doc) => doc.assetId === selectedAsset.id).map((doc) => (
              <button key={doc.id} type="button" onClick={() => { setSelectedDocumentId(doc.id); setScreen("documents"); }} style={styles.listButton}>
                <strong>{doc.title}</strong>
                <span style={styles.smallMuted}>{doc.date} · {doc.type}</span>
              </button>
            ))}

            <h3 style={styles.h3}>Service History</h3>
            <button type="button" onClick={() => addServiceRecordForAsset(selectedAsset.id)} style={styles.listButton}>
              + Add new service comment for {selectedAsset.name}
            </button>

            {serviceHistory.filter((record) => record.assetId === selectedAsset.id).map((record) => (
              <button key={record.id} type="button" onClick={() => { setSelectedServiceId(record.id); setScreen("history"); }} style={styles.listButton}>
                <strong>{record.title}</strong>
                <span style={styles.smallMuted}>{record.date} · {record.status}</span>
              </button>
            ))}
          </section>
        </div>
      </div>
    )}

    {screen === "history" && (
      <ServiceHistoryPanel
        serviceHistory={serviceHistory}
        selectedService={selectedService}
        assets={assets}
        vendors={vendors}
        documents={documents}
        setSelectedServiceId={setSelectedServiceId}
        updateServiceRecord={updateServiceRecord}
        addServiceRecordForAsset={addServiceRecordForAsset}
        addDocumentForService={addDocumentForService}
        setSelectedAssetId={setSelectedAssetId}
        setSelectedVendorId={setSelectedVendorId}
        setSelectedDocumentId={setSelectedDocumentId}
        setScreen={setScreen}
      />
    )}

    {screen === "vendors" && (
      <div>
        <Header title="Vendors" subtitle="Add vendors, edit contacts, link vendors to assets, and track vendor service history." />
        <div style={styles.gridTwo}>
          <section style={styles.card}>
            <button type="button" onClick={addVendor} style={styles.primaryButton}>+ New Vendor</button>
            <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} placeholder="Search vendors..." style={styles.input} />

            <div style={styles.scrollList}>
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => setSelectedVendorId(vendor.id)}
                  style={vendor.id === selectedVendorId ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
                >
                  <strong>{vendor.name}</strong>
                  <span style={styles.smallMuted}>{vendor.category}</span>
                  {vendor.phone && <span style={styles.smallMuted}>{vendor.phone}</span>}
                  {vendor.email && <span style={styles.smallMuted}>{vendor.email}</span>}
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
            <textarea
              value={selectedVendor.notes}
              onChange={(e) => updateVendor(selectedVendor.id, { notes: e.target.value })}
              placeholder="Paste vendor notes, contact details, service scope, account info, invoice notes, or anything useful..."
              style={styles.textareaHuge}
            />

            <h3 style={styles.h3}>Link Asset to This Vendor</h3>
            <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} style={styles.input}>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
            </select>
            <button type="button" onClick={() => linkVendorToAsset(selectedAssetId, selectedVendor.id)} style={styles.primaryButton}>
              + Link Selected Asset
            </button>

            <h3 style={styles.h3}>Linked Assets</h3>
            {assets.filter((asset) => asset.vendorIds.includes(selectedVendor.id)).map((asset) => (
              <div key={asset.id} style={styles.linkedRow}>
                <button type="button" onClick={() => { setSelectedAssetId(asset.id); setScreen("assets"); }} style={styles.linkedMainButton}>
                  <strong>{asset.name}</strong>
                  <span style={styles.smallMuted}>{asset.category} · {asset.status}</span>
                </button>
                <button type="button" onClick={() => unlinkVendorFromAsset(asset.id, selectedVendor.id)} style={styles.smallDangerButton}>
                  Unlink
                </button>
              </div>
            ))}

            <h3 style={styles.h3}>Vendor Documents / Photos</h3>
            <button type="button" onClick={() => addDocumentForVendor(selectedVendor.id)} style={styles.listButton}>
              + Add invoice, photo, manual, warranty, or note for {selectedVendor.name}
            </button>
            {documents.filter((doc) => doc.vendorId === selectedVendor.id).map((doc) => (
              <button key={doc.id} type="button" onClick={() => { setSelectedDocumentId(doc.id); setScreen("documents"); }} style={styles.listButton}>
                <strong>{doc.title}</strong>
                <span style={styles.smallMuted}>{doc.date} · {doc.type}</span>
              </button>
            ))}

            <h3 style={styles.h3}>Service History</h3>
            <button type="button" onClick={() => addServiceRecordForVendor(selectedVendor.id)} style={styles.listButton}>
              + Add service note for {selectedVendor.name}
            </button>

            {serviceHistory.filter((record) => record.vendorId === selectedVendor.id).map((record) => (
              <button key={record.id} type="button" onClick={() => { setSelectedServiceId(record.id); setScreen("history"); }} style={styles.listButton}>
                <strong>{record.title}</strong>
                <span style={styles.smallMuted}>{record.date} · {record.status}</span>
              </button>
            ))}
          </section>
        </div>
      </div>
    )}

    {screen === "documents" && (
      <DocumentsPanel
        documents={documents}
        selectedDocument={selectedDocument}
        assets={assets}
        vendors={vendors}
        locations={locations}
        serviceHistory={serviceHistory}
        documentSearch={documentSearch}
        setDocumentSearch={setDocumentSearch}
        setSelectedDocumentId={setSelectedDocumentId}
        updateDocument={updateDocument}
        addDocumentRecord={addDocumentRecord}
        setSelectedAssetId={setSelectedAssetId}
        setSelectedVendorId={setSelectedVendorId}
        setSelectedLocationId={setSelectedLocationId}
        setSelectedServiceId={setSelectedServiceId}
        setScreen={setScreen}
        filteredDocuments={filteredDocuments}
      />
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

    {screen === "assistant" && (
      <div>
        <Header title="AI Assistant" subtitle="Local Atlas search across saved records, including vendors, documents, photos, and service history." />
        <section style={styles.card}>
          <textarea value={assistantQuestion} onChange={(e) => setAssistantQuestion(e.target.value)} placeholder="Ask about boilers, HVAC, Sundance, Cobalt, Sea-Doo, pool, vendors, photos, documents, service history, locations..." style={styles.textareaLarge} />
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
return ( <header style={styles.header}> <h1 style={styles.h1}>{title}</h1> <p style={styles.muted}>{subtitle}</p> </header>
);
}

function Stat({ label, value }: { label: string | number; value: string | number }) {
return ( <div style={styles.stat}> <span style={styles.smallMuted}>{label}</span> <strong style={styles.statValue}>{value}</strong> </div>
);
}

function QuickRecord({ label, onClick }: { label: string; onClick: () => void }) {
return ( <button type="button" onClick={onClick} style={styles.listButton}>
{label} </button>
);
}

function ServiceHistoryPanel({
serviceHistory,
selectedService,
assets,
vendors,
documents,
setSelectedServiceId,
updateServiceRecord,
addServiceRecordForAsset,
addDocumentForService,
setSelectedAssetId,
setSelectedVendorId,
setSelectedDocumentId,
setScreen
}: {
serviceHistory: ServiceHistoryRecord[];
selectedService: ServiceHistoryRecord;
assets: AssetRecord[];
vendors: VendorRecord[];
documents: DocumentRecord[];
setSelectedServiceId: (id: string) => void;
updateServiceRecord: (id: string, patch: Partial<ServiceHistoryRecord>) => void;
addServiceRecordForAsset: (assetId?: string) => void;
addDocumentForService: (serviceId: string) => void;
setSelectedAssetId: (id: string) => void;
setSelectedVendorId: (id: string) => void;
setSelectedDocumentId: (id: string) => void;
setScreen: (screen: Screen) => void;
}) {
const linkedAsset = assets.find((asset) => asset.id === selectedService.assetId);
const linkedVendor = vendors.find((vendor) => vendor.id === selectedService.vendorId);
const linkedDocs = documents.filter((doc) => doc.serviceId === selectedService.id);
const activeCount = serviceHistory.filter((record) => record.status !== "Completed").length;
const completedCount = serviceHistory.filter((record) => record.status === "Completed").length;

return ( <div> <Header
     title="Service History"
     subtitle="Pick the asset, then type or paste service notes, work orders, vendor updates, invoices, repair comments, and linked photos/documents."
   />

```
  <div style={styles.statGrid}>
    <Stat label="Total Records" value={serviceHistory.length} />
    <Stat label="Active" value={activeCount} />
    <Stat label="Completed" value={completedCount} />
    <Stat label="Current" value={selectedService.status} />
  </div>

  <div style={styles.gridTwo}>
    <section style={styles.card}>
      <h2 style={styles.h2}>Add Service Record</h2>
      <p style={styles.muted}>
        Click an asset below to start a new service note already attached to that asset.
      </p>

      <div style={styles.scrollListSmall}>
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => addServiceRecordForAsset(asset.id)}
            style={styles.listButton}
          >
            + {asset.name}
            <span style={styles.smallMuted}>{asset.category}</span>
          </button>
        ))}
      </div>

      <h3 style={styles.h3}>Existing Service Records</h3>
      <div style={styles.scrollList}>
        {serviceHistory.map((record) => {
          const asset = assets.find((item) => item.id === record.assetId);
          const vendor = vendors.find((item) => item.id === record.vendorId);

          return (
            <button
              key={record.id}
              type="button"
              onClick={() => setSelectedServiceId(record.id)}
              style={record.id === selectedService.id ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
            >
              <strong>{record.title}</strong>
              <span style={styles.smallMuted}>{record.date} · {record.status}</span>
              <span style={styles.smallMuted}>{asset?.name || "Unknown asset"} · {vendor?.name || "Unknown vendor"}</span>
            </button>
          );
        })}
      </div>
    </section>

    <section style={styles.card}>
      <h2 style={styles.h2}>Service Comment / Work Order</h2>
      <p style={styles.kicker}>{linkedAsset?.name || "Choose asset"} · {selectedService.status}</p>

      <label style={styles.label}>1. Asset this service belongs to</label>
      <select value={selectedService.assetId} onChange={(e) => updateServiceRecord(selectedService.id, { assetId: e.target.value })} style={styles.input}>
        {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
      </select>

      <label style={styles.label}>2. Date</label>
      <input value={selectedService.date} onChange={(e) => updateServiceRecord(selectedService.id, { date: e.target.value })} style={styles.input} />

      <label style={styles.label}>3. Title / short description</label>
      <input value={selectedService.title} onChange={(e) => updateServiceRecord(selectedService.id, { title: e.target.value })} style={styles.input} />

      <label style={styles.label}>4. Vendor</label>
      <select value={selectedService.vendorId} onChange={(e) => updateServiceRecord(selectedService.id, { vendorId: e.target.value })} style={styles.input}>
        {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
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
      <textarea
        value={selectedService.notes}
        onChange={(e) => updateServiceRecord(selectedService.id, { notes: e.target.value })}
        placeholder="Paste invoice notes, vendor text, work performed, parts used, photos to attach later, next steps, or anything important..."
        style={styles.textareaHuge}
      />

      <h3 style={styles.h3}>Photos / Documents for This Service</h3>
      <button type="button" onClick={() => addDocumentForService(selectedService.id)} style={styles.listButton}>
        + Add photo, invoice, manual, warranty, or note for this service record
      </button>
      {linkedDocs.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => { setSelectedDocumentId(doc.id); setScreen("documents"); }}
          style={styles.listButton}
        >
          <strong>{doc.title}</strong>
          <span style={styles.smallMuted}>{doc.date} · {doc.type}</span>
        </button>
      ))}

      <div style={styles.miniGrid}>
        <button
          type="button"
          onClick={() => {
            if (linkedAsset) {
              setSelectedAssetId(linkedAsset.id);
              setScreen("assets");
            }
          }}
          style={styles.listButton}
        >
          <strong>Open Linked Asset</strong>
          <span style={styles.smallMuted}>{linkedAsset?.name || "No linked asset"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (linkedVendor) {
              setSelectedVendorId(linkedVendor.id);
              setScreen("vendors");
            }
          }}
          style={styles.listButton}
        >
          <strong>Open Linked Vendor</strong>
          <span style={styles.smallMuted}>{linkedVendor?.name || "No linked vendor"}</span>
        </button>
      </div>
    </section>
  </div>
</div>

);
}

function DocumentsPanel({
documents,
selectedDocument,
assets,
vendors,
locations,
serviceHistory,
documentSearch,
setDocumentSearch,
setSelectedDocumentId,
updateDocument,
addDocumentRecord,
setSelectedAssetId,
setSelectedVendorId,
setSelectedLocationId,
setSelectedServiceId,
setScreen,
filteredDocuments
}: {
documents: DocumentRecord[];
selectedDocument: DocumentRecord;
assets: AssetRecord[];
vendors: VendorRecord[];
locations: LocationRecord[];
serviceHistory: ServiceHistoryRecord[];
documentSearch: string;
setDocumentSearch: (value: string) => void;
setSelectedDocumentId: (id: string) => void;
updateDocument: (id: string, patch: Partial<DocumentRecord>) => void;
addDocumentRecord: (patch?: Partial<DocumentRecord>) => void;
setSelectedAssetId: (id: string) => void;
setSelectedVendorId: (id: string) => void;
setSelectedLocationId: (id: string) => void;
setSelectedServiceId: (id: string) => void;
setScreen: (screen: Screen) => void;
filteredDocuments: DocumentRecord[];
}) {
const linkedAsset = assets.find((asset) => asset.id === selectedDocument.assetId);
const linkedVendor = vendors.find((vendor) => vendor.id === selectedDocument.vendorId);
const linkedLocation = locations.find((location) => location.id === selectedDocument.locationId);
const linkedService = serviceHistory.find((service) => service.id === selectedDocument.serviceId);
const photoCount = documents.filter((doc) => doc.type === "Photo").length;
const invoiceCount = documents.filter((doc) => doc.type === "Invoice").length;

return ( <div> <Header
     title="Documents / Photos"
     subtitle="Track photos, invoices, manuals, warranties, notes, links, and paperwork connected to assets, vendors, locations, and service records."
   />

```
  <div style={styles.statGrid}>
    <Stat label="Total Docs" value={documents.length} />
    <Stat label="Photos" value={photoCount} />
    <Stat label="Invoices" value={invoiceCount} />
    <Stat label="Current Type" value={selectedDocument.type} />
  </div>

  <div style={styles.gridTwo}>
    <section style={styles.card}>
      <button type="button" onClick={() => addDocumentRecord()} style={styles.primaryButton}>
        + New Photo / Document
      </button>
      <input
        value={documentSearch}
        onChange={(e) => setDocumentSearch(e.target.value)}
        placeholder="Search photos, invoices, manuals, assets, vendors..."
        style={styles.input}
      />

      <div style={styles.scrollList}>
        {filteredDocuments.map((doc) => {
          const asset = assets.find((item) => item.id === doc.assetId);
          const vendor = vendors.find((item) => item.id === doc.vendorId);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDocumentId(doc.id)}
              style={doc.id === selectedDocument.id ? { ...styles.listButton, ...styles.selectedListButton } : styles.listButton}
            >
              <strong>{doc.title}</strong>
              <span style={styles.smallMuted}>{doc.date} · {doc.type}</span>
              <span style={styles.smallMuted}>{asset?.name || "No asset"} · {vendor?.name || "No vendor"}</span>
            </button>
          );
        })}
      </div>
    </section>

    <section style={styles.card}>
      <h2 style={styles.h2}>{selectedDocument.title}</h2>
      <p style={styles.kicker}>{selectedDocument.type}</p>

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
        {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
      </select>

      <label style={styles.label}>Linked Service Record</label>
      <select value={selectedDocument.serviceId || ""} onChange={(e) => updateDocument(selectedDocument.id, { serviceId: e.target.value })} style={styles.input}>
        <option value="">No service record</option>
        {serviceHistory.map((service) => <option key={service.id} value={service.id}>{service.date} · {service.title}</option>)}
      </select>

      <label style={styles.label}>Linked Vendor</label>
      <select value={selectedDocument.vendorId || ""} onChange={(e) => updateDocument(selectedDocument.id, { vendorId: e.target.value })} style={styles.input}>
        <option value="">No vendor</option>
        {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
      </select>

      <label style={styles.label}>Linked Location</label>
      <select value={selectedDocument.locationId || ""} onChange={(e) => updateDocument(selectedDocument.id, { locationId: e.target.value })} style={styles.input}>
        <option value="">No location</option>
        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>

      <label style={styles.label}>URL / file note / where this is stored</label>
      <input
        value={selectedDocument.url || ""}
        onChange={(e) => updateDocument(selectedDocument.id, { url: e.target.value })}
        placeholder="Paste Google Drive link, photo filename, invoice location, manual URL, or note"
        style={styles.input}
      />

      <label style={styles.label}>Notes / paste details here</label>
      <textarea
        value={selectedDocument.notes}
        onChange={(e) => updateDocument(selectedDocument.id, { notes: e.target.value })}
        placeholder="Paste invoice details, photo description, warranty info, manual notes, repair notes, or where the real file is stored..."
        style={styles.textareaHuge}
      />

      {selectedDocument.url && (
        <a href={selectedDocument.url} target="_blank" rel="noreferrer" style={styles.linkButton}>
          Open Link
        </a>
      )}

      <h3 style={styles.h3}>Open Linked Records</h3>
      <div style={styles.miniGrid}>
        <button
          type="button"
          onClick={() => {
            if (linkedAsset) {
              setSelectedAssetId(linkedAsset.id);
              setScreen("assets");
            }
          }}
          style={styles.listButton}
        >
          <strong>Asset</strong>
          <span style={styles.smallMuted}>{linkedAsset?.name || "No linked asset"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (linkedVendor) {
              setSelectedVendorId(linkedVendor.id);
              setScreen("vendors");
            }
          }}
          style={styles.listButton}
        >
          <strong>Vendor</strong>
          <span style={styles.smallMuted}>{linkedVendor?.name || "No linked vendor"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (linkedLocation) {
              setSelectedLocationId(linkedLocation.id);
              setScreen("locations");
            }
          }}
          style={styles.listButton}
        >
          <strong>Location</strong>
          <span style={styles.smallMuted}>{linkedLocation?.name || "No linked location"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (linkedService) {
              setSelectedServiceId(linkedService.id);
              setScreen("history");
            }
          }}
          style={styles.listButton}
        >
          <strong>Service</strong>
          <span style={styles.smallMuted}>{linkedService?.title || "No linked service"}</span>
        </button>
      </div>
    </section>
  </div>
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

const productRules = [
"No 2000-specific address, family, owner, password, access-code, or private invoice information.",
"Use sample/demo data only.",
"Keep the same Atlas structure: locations, assets, vendors, calendar, map, weather, AI Assistant, procedures, documents, photos, and service history.",
"Turn real 2000 lessons into reusable templates for future estates.",
"Build this as the sellable Atlas Estate OS starting point."
];

const setupPackages = [
{ name: "Starter Template", price: "$2,500–$7,500", note: "Blank Atlas setup with basic locations, asset categories, vendors, documents, and procedure templates." },
{ name: "Private Estate Setup", price: "$7,500–$25,000", note: "Walkthrough, asset inventory, vendor directory, maps, procedures, photos, invoices, manuals, and emergency records." },
{ name: "White-Glove Buildout", price: "$25,000–$50,000+", note: "Full private estate operating system with ongoing updates, service history, document records, and support." }
];

return ( <div> <Header title="Blank Canvas" subtitle="Sellable Atlas Estate OS template with no private 2000 property information." />

```
  <div style={styles.statGrid}>
    <Stat label="Version" value="v1" />
    <Stat label="Private Data" value="None" />
    <Stat label="Use" value="Demo" />
    <Stat label="Goal" value="Sellable" />
  </div>

  <div style={styles.gridTwo}>
    <section style={styles.card}>
      <h2 style={styles.h2}>Blank Canvas Purpose</h2>
      <p style={styles.muted}>
        This section is the clean reusable version of Atlas. It keeps the same structure as the 2000 system, but removes all private property details.
      </p>

      <h3 style={styles.h3}>Rules</h3>
      {productRules.map((rule) => (
        <div key={rule} style={styles.listButton}>
          {rule}
        </div>
      ))}
    </section>

    <section style={styles.card}>
      <h2 style={styles.h2}>Sales Positioning</h2>
      <p style={styles.kicker}>Atlas Private Estate OS</p>
      <p style={styles.muted}>
        For homes too complex to manage from memory. Atlas turns a private property into a searchable operating system for owners, estate managers, staff, vendors, and future employees.
      </p>

      <h3 style={styles.h3}>Core Promise</h3>
      <div style={styles.answerBox}>
        Assets + Locations + Vendors + Documents + Photos + Procedures + Maps + Calendar + Service History + Ask Atlas
      </div>
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

  <div style={{ ...styles.card, marginTop: 18 }}>
    <h2 style={styles.h2}>Future Pricing Packages</h2>
    <div style={styles.gridTwo}>
      {setupPackages.map((item) => (
        <div key={item.name} style={styles.listButton}>
          <strong>{item.name}</strong>
          <span style={styles.smallMuted}>{item.price}</span>
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

return ( <div> <Header title="Procedures" subtitle="Step-by-step operating procedures for recurring work, emergency response, and estate systems." />

```
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
            <li key={step} style={{ marginBottom: 8 }}>
              {step}
            </li>
          ))}
        </ol>

        <div style={styles.answerBox}>
          {procedure.notes}
        </div>
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
}
};
