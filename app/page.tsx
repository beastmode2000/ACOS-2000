```tsx id="atlas-page-tsx"
"use client";

import React, { useEffect, useRef, useState } from "react";

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

type LocationRecord = {
  id: string;
  name: string;
  type: string;
  summary: string;
  notes: string;
};

type AssetRecord = {
  id: string;
  name: string;
  locationId: string;
  category: string;
  status: "Online" | "Offline" | "Seasonal" | "Monitor";
  make?: string;
  model?: string;
  serial?: string;
  notes: string;
  vendorIds: string[];
  documentIds: string[];
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

type ProcedureRecord = {
  id: string;
  title: string;
  locationId: string;
  assetId?: string;
  frequency: string;
  steps: string[];
};

type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  linkedTo: string;
  notes: string;
  href?: string;
};

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  locationId: string;
};

type MediaRecord = {
  id: string;
  targetType: "location" | "asset" | "vendor" | "procedure" | "document";
  targetId: string;
  kind: "comment" | "photo" | "voice";
  title: string;
  text?: string;
  dataUrl?: string;
  createdAt: string;
};

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  locationId?: string;
  assetId?: string;
  notes: string;
};

const KEYS = {
  labels: "atlas_2000_labels_base_v4",
  locations: "atlas_2000_locations_base_v4",
  assets: "atlas_2000_assets_base_v4",
  vendors: "atlas_2000_vendors_base_v4",
  procedures: "atlas_2000_procedures_base_v4",
  documents: "atlas_2000_documents_base_v4",
  media: "atlas_2000_media_base_v4",
  calendar: "atlas_2000_calendar_base_v4",
};

const navItems: { id: Screen; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "map", label: "Map", icon: "⌖" },
  { id: "locations", label: "Locations", icon: "▦" },
  { id: "assets", label: "Assets", icon: "⚙" },
  { id: "vendors", label: "Vendors", icon: "☏" },
  { id: "calendar", label: "Calendar", icon: "◷" },
  { id: "weather", label: "Weather", icon: "☁" },
  { id: "documents", label: "Documents", icon: "▣" },
  { id: "procedures", label: "Procedures", icon: "✓" },
  { id: "logs", label: "Logs", icon: "✎" },
  { id: "assistant", label: "AI Assistant", icon: "✦" },
  { id: "team", label: "Team", icon: "◉" },
];

const defaultLocations: LocationRecord[] = [
  { id: "2000", name: "2000", type: "Property", summary: "Overall 2000 estate property record.", notes: "Parent location for property-wide records." },
  { id: "general", name: "General", type: "General", summary: "General property-wide location bucket.", notes: "Use when a specific sub-location still needs to be assigned." },
  { id: "dock", name: "Dock", type: "Waterfront", summary: "Main dock, boat lift areas, Sea-Doo area, swim access, and lift boxes.", notes: "Multiple Sunstream lift boxes exist and they are not all the same." },
  { id: "cobalt", name: "Cobalt", type: "Waterfront / Boat", summary: "Cobalt boat and associated lift area.", notes: "Newer Sunstream lift box is for the Cobalt lift." },
  { id: "seadoo", name: "Seadoo", type: "Waterfront / PWC", summary: "Sea-Doo area near dock.", notes: "Includes Sea-Doo service and repair records." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", summary: "Floating water trampoline area.", notes: "Seasonal anchor and inflation checks." },
  { id: "waterside-lawn-north", name: "Water Side Lawn (North)", type: "Grounds", summary: "North lawn along waterfront.", notes: "Separate from east lawn and sport court area." },
  { id: "east-lawn", name: "East Lawn", type: "Grounds", summary: "Large green lawn east/south of sport court.", notes: "Includes the south end where the veggie boxes sit." },
  { id: "sport-court", name: "Sport Court", type: "Recreation", summary: "Outdoor sport court.", notes: "Keep surface clean and inspect equipment." },
  { id: "veggie-boxes", name: "Veggie Boxes", type: "Grounds", summary: "Three vegetable/garden boxes at south end of east lawn.", notes: "Watering, weeding, and seasonal planting." },
  { id: "new-garage", name: "New Garage", type: "Building", summary: "New garage / auto court garage area.", notes: "Includes garage assets and vehicle/storage records." },
  { id: "old-garage", name: "Old Garage", type: "Building", summary: "Old garage near ADU and covered connection areas.", notes: "Storage and garage checks." },
  { id: "adu", name: "ADU", type: "Building", summary: "Small ADU building left of old garage / lower garage area.", notes: "Do not move this label to trampoline/dog area." },
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", summary: "Courtyard patio with chairs/fire-pit, left of gray covered walkway.", notes: "Do not label the gray covered walkway itself." },
  { id: "trampoline-dog", name: "Trampoline/Dog", type: "Grounds", summary: "Separate trampoline/dog area.", notes: "Separate from courtyard." },
  { id: "original-house", name: "Original House", type: "Building", summary: "Original/main house structure.", notes: "Main interior and original-house zones." },
  { id: "addition", name: "Addition", type: "Building", summary: "Addition wing including indoor pool area.", notes: "Includes indoor pool construction history." },
  { id: "hot-tub-sundance", name: "Hot Tub (Sundance)", type: "Spa", summary: "Standalone Sundance Optima spa/hot tub.", notes: "Not part of indoor pool controls." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", summary: "Boiler, hydronic, DHW, pool heat, pumps, and controls.", notes: "Viessmann boiler system, DHW tanks, Desert Aire tie-ins." },
  { id: "mechanical-room-2", name: "Mechanical Room 2", type: "Systems", summary: "Second mechanical room / secondary HVAC equipment location.", notes: "Used by several air-handler, wine fridge, and mechanical assets." },
  { id: "pool", name: "Pool", type: "Pool", summary: "Pool area and pool-related assets.", notes: "Includes pool assets and pool storage/freezer records where noted." },
  { id: "pool-equipment", name: "Pool Equipment", type: "Pool Systems", summary: "Pentair pump, Triton II sand filter, UV2, valves, and pool equipment.", notes: "Backwash by pressure rise rule, not only by calendar." },
  { id: "pool-changing-room", name: "Pool Changing Room", type: "Interior", summary: "Pool changing room laundry/service area.", notes: "Dryer DR-2 and Washer WM-2 are listed here." },
  { id: "kitchen", name: "Kitchen", type: "Interior", summary: "Kitchen equipment and appliance records.", notes: "Wolf range duplicate naming should be cleaned up later." },
  { id: "pantry", name: "Pantry", type: "Interior", summary: "Pantry storage and appliance area.", notes: "Freezer FR-1 is listed here." },
  { id: "fitness-room", name: "Fitness Room", type: "Interior", summary: "Fitness room / gym area.", notes: "Dishwasher DW-1 and refrigerator records are listed here." },
  { id: "house-managers-office", name: "House Managers Office", type: "Interior", summary: "House managers office appliance/laundry area.", notes: "Dishwasher DW-2, Dryer DR-3, Washer WM-3 are listed here." },
  { id: "elyses-room", name: "Elyse's Room", type: "Interior", summary: "Elyse's room.", notes: "Hunter Douglas blinds are listed here." },
  { id: "upstairs-laundry-closet", name: "Upstairs Laundry Closet", type: "Interior", summary: "Upstairs laundry closet.", notes: "Dryer DR-1, Washer WM-1, and HVAC HP-3 are listed here." },
  { id: "formal-dining-room", name: "Formal Dining Room", type: "Interior", summary: "Formal dining room.", notes: "Wine chiller is listed here." },
  { id: "wine-room", name: "Wine Room", type: "Interior", summary: "Wine room and wine cooling equipment.", notes: "Multiple wine room coolers and freezer/wine assets are listed here." },
  { id: "basement", name: "Basement", type: "Interior", summary: "Basement rooms and system access.", notes: "Can be expanded with basement walkthrough map later." },
  { id: "outdoor-generator-area", name: "Outdoor Generator Area", type: "Exterior Systems", summary: "Outdoor generator equipment area.", notes: "Generator lower/upper and HVAC HP-123 are listed here." },
  { id: "outdoor-condenser-area", name: "Outdoor Condenser Area", type: "Exterior HVAC", summary: "Outdoor condenser and exterior HVAC equipment area.", notes: "HVAC CU units and outdoor dehumidifier are listed here." },
  { id: "roof", name: "Roof", type: "Exterior / Roof", summary: "Roof-mounted equipment area.", notes: "Outdoor heat pump units HP-4 and HP-5 are listed here." },
  { id: "attic", name: "Attic", type: "Interior Systems", summary: "Attic HVAC/mechanical location.", notes: "HVAC HP-1 is listed here." },
  { id: "attic-2", name: "Attic 2", type: "Interior Systems", summary: "Second attic HVAC/mechanical location.", notes: "HVAC HP-2 is listed here." },
  { id: "west-side-house", name: "West side of House", type: "Exterior", summary: "West side exterior equipment area.", notes: "West Steam Generator is listed here." },
  { id: "back-patio-water-side", name: "Back Patio (water side)", type: "Outdoor Living", summary: "Water-side back patio area.", notes: "Lynx Grill and Hottub records are listed here." },
  { id: "vegetable-garden", name: "Vegetable Garden", type: "Grounds", summary: "Vegetable garden / garden system area.", notes: "Invisible Fence asset is listed here." },
  { id: "hangar", name: "Hangar", type: "Aviation", summary: "Hangar aircraft location.", notes: "Aircraft assets include Gulfstream and Pilatus records." },
];

const defaultLabels: MapLabel[] = [
  { id: "dock", name: "Dock", x: 67, y: 8, locationId: "dock" },
  { id: "cobalt", name: "Cobalt", x: 84, y: 9, locationId: "cobalt" },
  { id: "seadoo", name: "Seadoo", x: 76, y: 13, locationId: "seadoo" },
  { id: "water-trampoline", name: "Water Trampoline", x: 25, y: 13, locationId: "water-trampoline" },
  { id: "waterside-lawn-north", name: "Water Side Lawn (North)", x: 42, y: 42, locationId: "waterside-lawn-north" },
  { id: "east-lawn", name: "East Lawn", x: 84, y: 72, locationId: "east-lawn" },
  { id: "sport-court", name: "Sport Court", x: 84, y: 56, locationId: "sport-court" },
  { id: "veggie-boxes", name: "Veggie Boxes", x: 84, y: 88, locationId: "veggie-boxes" },
  { id: "new-garage", name: "New Garage", x: 69, y: 84, locationId: "new-garage" },
  { id: "old-garage", name: "Old Garage", x: 35, y: 86, locationId: "old-garage" },
  { id: "adu", name: "ADU", x: 12, y: 67, locationId: "adu" },
  { id: "courtyard", name: "Courtyard", x: 45, y: 70, locationId: "courtyard" },
  { id: "trampoline-dog", name: "Trampoline/Dog", x: 57, y: 78, locationId: "trampoline-dog" },
  { id: "original-house", name: "Original House", x: 36, y: 64, locationId: "original-house" },
  { id: "addition", name: "Addition", x: 67, y: 68, locationId: "addition" },
  { id: "hot-tub-sundance", name: "Hot Tub (Sundance)", x: 56, y: 77, locationId: "hot-tub-sundance" },
];

const defaultVendors: VendorRecord[] = [
  { id: "psf-mechanical", name: "P.S.F / PSF Mechanical", category: "HVAC / Mechanical", notes: "HVAC, boiler, hydronic, Desert Aire, pool mechanical, and mechanical vendor reference." },
  { id: "penthouse-drapery", name: "Penthouse Drapery", category: "Drapery / Roller Shades", phone: "206-292-8336", email: "accounting@penthousedrapery.com", address: "4033 16th Ave SW Suite A, Seattle, WA 98106", notes: "Invoice #176396 dated 06/16/2026. Motorized roller shade repair linked to Blinds Lutron." },
  { id: "advanced-irrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Used to activate/deactivate irrigation. Linked to irrigation lake water meter and Hunter controller." },
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
  { id: "autonation-ford-bellevue", name: "AutoNation Ford Bellevue", category: "Vehicle Service", notes: "Ford/vehicle service vendor record." },
];

const defaultDocuments: DocumentRecord[] = [
  { id: "systems-layout", title: "2000 Systems Layout Draft v1", type: "Diagram / PDF", linkedTo: "mechanical-room", notes: "Main mechanical/electrical/pool/HVAC systems layout draft.", href: "" },
  { id: "pool-record", title: "2000 Pool Equipment Record v2 Corrected", type: "PDF / Equipment Record", linkedTo: "pool-equipment", notes: "Indoor pool equipment path, Desert Aire, pump/filter/UV records.", href: "" },
  { id: "sundance-record", title: "2000 Standalone Sundance Spa Record v1", type: "PDF / Asset Record", linkedTo: "hot-tub-sundance", notes: "Sundance Optima nameplate, electrical, ClearRay, HydroQuip heater, control details.", href: "" },
  { id: "penthouse-invoice", title: "Penthouse Drapery Invoice #176396", type: "Invoice", linkedTo: "blinds-lutron", notes: "Dated 06/16/2026. Repair one motorized roller shade; two trips and replacement roller shade drive.", href: "" },
  { id: "sunstream-notes", title: "Sunstream Lift Box Photo Notes", type: "Photo Set / Notes", linkedTo: "dock", notes: "Multiple Sunstream lift boxes; newer box for Cobalt; white boxes with solar/battery/control wiring.", href: "" },
  { id: "seadoo-repair", title: "Sea-Doo Repair Invoice / Photos", type: "Invoice / Photos", linkedTo: "craft-seadoo-2024", notes: "After repairs to Luke's Sea-Doo.", href: "" },
  { id: "boat-fluid-analysis", title: "Boat S.O.S. Fluid Analysis", type: "Report / Photo", linkedTo: "craft-cobalt-r-7", notes: "Older boat fluid analysis report from possible kids' boat purchase context.", href: "" },
  { id: "property-map", title: "Locked Atlas Property Map", type: "Image", linkedTo: "map", notes: "Current fixed map image used at /atlas-property-map.png.", href: "/atlas-property-map.png" },
];

const defaultAssets: AssetRecord[] = [
  { id: "blinds-hunter-douglas", name: "Blinds Hunter Douglas", locationId: "elyses-room", category: "Blinds / Shades", make: "Hunter Douglas", status: "Online", notes: "Asset listed at Elyse's Room.", vendorIds: [], documentIds: [] },
  { id: "blinds-lutron", name: "Blinds Lutron", locationId: "general", category: "Blinds / Motorized Shades", make: "Lutron", status: "Online", notes: "Penthouse Drapery invoice #176396 links to this motorized roller shade asset.", vendorIds: ["penthouse-drapery"], documentIds: ["penthouse-invoice"] },
  { id: "boiler-b-1", name: "Boiler B-1", locationId: "general", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", status: "Online", notes: "Boiler B-1 / Boiler 1. Prior visible nameplate indicated year built 2018, MAWP 60 PSI, max water temp 210°F.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "boiler-b-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", status: "Online", notes: "Boiler B-2 in Mechanical Room.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "boiler-b-2-new", name: "Boiler B-2 New", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", status: "Online", notes: "Newer boiler record. Nameplate details: year built 2025, MAWP 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, min relief valve capacity 255.9 lb/hr, CRN R1497.5C.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "craft-cobalt-r-7", name: "Craft-Cobalt R-7", locationId: "dock", category: "Boat", make: "Cobalt", status: "Online", notes: "Cobalt boat listed at Dock.", vendorIds: ["seattle-boat"], documentIds: ["boat-fluid-analysis"] },
  { id: "craft-seadoo-2024", name: "Craft-SeaDoo 2024", locationId: "dock", category: "PWC", make: "Sea-Doo", status: "Online", notes: "2024 Sea-Doo listed at Dock. Link repair/service photos and invoices here.", vendorIds: ["seadoo-service", "i90-motorsports"], documentIds: ["seadoo-repair"] },
  { id: "dishwasher-dw-1", name: "Dishwasher DW-1", locationId: "fitness-room", category: "Dishwasher", status: "Online", notes: "Listed at Fitness Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dishwasher-dw-2", name: "Dishwasher DW-2", locationId: "house-managers-office", category: "Dishwasher", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dishwasher-dw-3-right", name: "Dishwasher DW-3 (Right)", locationId: "kitchen", category: "Dishwasher", status: "Online", notes: "Right dishwasher in Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dishwasher-dw-4-left", name: "Dishwasher DW-4 (Left)", locationId: "kitchen", category: "Dishwasher", status: "Online", notes: "Left dishwasher in Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dryer-dr-1", name: "Dryer DR-1", locationId: "upstairs-laundry-closet", category: "Dryer", status: "Online", notes: "Listed at Upstairs Laundry Closet.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dryer-dr-2", name: "Dryer DR-2", locationId: "pool-changing-room", category: "Dryer", status: "Online", notes: "Listed at Pool Changing Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dryer-dr-3", name: "Dryer DR-3", locationId: "house-managers-office", category: "Dryer", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "flologic", name: "FloLogic", locationId: "general", category: "Water Shutoff / Leak Protection", make: "FloLogic", status: "Online", notes: "Whole-home water monitoring / automatic shutoff asset.", vendorIds: ["best-plumbing", "american-leak-detection"], documentIds: [] },
  { id: "freezer-fr-1", name: "Freezer FR-1", locationId: "pantry", category: "Freezer", status: "Online", notes: "Listed at Pantry.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-2", name: "Freezer FR-2", locationId: "pool", category: "Freezer", status: "Online", notes: "Listed at Pool.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-3", name: "Freezer FR-3", locationId: "pool", category: "Freezer", status: "Online", notes: "Listed at Pool.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-4", name: "Freezer FR-4", locationId: "kitchen", category: "Freezer", status: "Online", notes: "Listed at Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-5", name: "Freezer FR-5", locationId: "wine-room", category: "Freezer", status: "Online", notes: "Listed at Wine Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "garage-door-openers", name: "Garage Door Openers", locationId: "general", category: "Garage Doors", status: "Online", notes: "General garage door opener asset.", vendorIds: ["precision-garage-door"], documentIds: [] },
  { id: "generator-lower", name: "Generator (Lower)", locationId: "outdoor-generator-area", category: "Generator", status: "Online", notes: "Lower generator at Outdoor Generator Area.", vendorIds: ["d-square-energy", "maple-valley-electric"], documentIds: [] },
  { id: "generator-upper", name: "Generator (Upper)", locationId: "outdoor-generator-area", category: "Generator", status: "Online", notes: "Upper generator at Outdoor Generator Area.", vendorIds: ["d-square-energy", "maple-valley-electric"], documentIds: [] },
  { id: "golf-simulator", name: "Golf Simulator", locationId: "new-garage", category: "Recreation / AV", status: "Online", notes: "Garage golf simulator clean/inspect recurring task.", vendorIds: ["high-tech-living"], documentIds: [] },
  { id: "home-water-filter", name: "Home Water Filter", locationId: "general", category: "Water Filtration", status: "Online", notes: "General home water filter asset.", vendorIds: ["best-plumbing"], documentIds: [] },
  { id: "hot-water-storage-tank-1", name: "Hot Water Storage Tank 1", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", status: "Online", notes: "One of twin Viessmann Vitocell 300-V 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hot-water-storage-tank-2", name: "Hot Water Storage Tank 2", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", status: "Online", notes: "Second of twin Viessmann Vitocell 300-V 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hottub", name: "Hottub", locationId: "back-patio-water-side", category: "Spa / Hot Tub", make: "Sundance", model: "880 Series Optima", serial: "00P3LCD-100528521-0315", status: "Online", notes: "Sundance Optima hot tub listed at Back Patio (water side). Also tracked as standalone Sundance spa asset.", vendorIds: ["aqua-quip", "krisco-pool-spas"], documentIds: ["sundance-record"] },
  { id: "hunter-irrigation-controller", name: "Hunter Irrigation Controller", locationId: "general", category: "Irrigation Controller", make: "Hunter", status: "Online", notes: "Hunter irrigation controller asset.", vendorIds: ["advanced-irrigation"], documentIds: [] },
  { id: "hvac-ah-1-indoor", name: "HVAC AH-1 (Indoor)", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-1 at Mechanical Room 2.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-ah-2-indoor", name: "HVAC AH-2 (Indoor)", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-2 at Mechanical Room 2.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-ah-3-indoor", name: "HVAC AH-3 (Indoor)", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-3 at Mechanical Room 2.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-ah-4-indoor", name: "HVAC AH-4 (Indoor)", locationId: "mechanical-room-2", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-4 at Mechanical Room 2.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-ah-5-indoor", name: "HVAC AH-5 (Indoor)", locationId: "mechanical-room", category: "HVAC Air Handler", status: "Online", notes: "Indoor air handler AH-5 at Mechanical Room.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-cu-1-outdoor", name: "HVAC CU-1 (Outdoor)", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-1.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-cu-2-outdoor", name: "HVAC CU-2 (Outdoor)", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-2.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-cu-3-outdoor", name: "HVAC CU-3 (Outdoor)", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-3.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-cu-4-outdoor", name: "HVAC CU-4 (Outdoor)", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-4.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-cu-5-outdoor", name: "HVAC CU-5 (Outdoor)", locationId: "outdoor-condenser-area", category: "HVAC Condenser", status: "Online", notes: "Outdoor condenser CU-5.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-hp-1-indoor", name: "HVAC HP-1 (Indoor)", locationId: "attic", category: "Heat Pump / HVAC", status: "Online", notes: "Indoor HP-1 at Attic.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-hp-123-outdoor", name: "HVAC HP-123 (Outdoor)", locationId: "outdoor-generator-area", category: "Heat Pump / HVAC", status: "Online", notes: "Outdoor HP-123 at Outdoor Generator Area.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-hp-2-indoor", name: "HVAC HP-2 (Indoor)", locationId: "attic-2", category: "Heat Pump / HVAC", status: "Online", notes: "Indoor HP-2 at Attic 2.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-hp-3-indoor", name: "HVAC HP-3 (Indoor)", locationId: "upstairs-laundry-closet", category: "Heat Pump / HVAC", status: "Online", notes: "Indoor HP-3 at Upstairs Laundry Closet.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-hp-4-outdoor-mr", name: "HVAC HP-4 (outdoor) MR", locationId: "roof", category: "Heat Pump / HVAC", status: "Online", notes: "Outdoor HP-4 MR on Roof.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hvac-hp-5-outdoor", name: "HVAC HP-5 (outdoor)", locationId: "roof", category: "Heat Pump / HVAC", status: "Online", notes: "Outdoor HP-5 on Roof.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "invisible-fence", name: "Invisible Fence", locationId: "vegetable-garden", category: "Pet / Fence", status: "Online", notes: "Invisible Fence asset listed at Vegetable Garden.", vendorIds: ["invisible-fence"], documentIds: [] },
  { id: "irrigation-lake-water-meter", name: "Irrigation Lake Water Meter", locationId: "2000", category: "Irrigation / Water Meter", status: "Online", notes: "Irrigation lake water meter. Screenshot shows one sub-asset.", vendorIds: ["advanced-irrigation"], documentIds: [] },
  { id: "lynx-grill", name: "Lynx Grill", locationId: "back-patio-water-side", category: "Outdoor Kitchen / Grill", make: "Lynx", status: "Online", notes: "Lynx Grill at Back Patio (water side).", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "marantec-wke", name: "Marantec WKE", locationId: "2000", category: "Access / Gate / Garage Control", make: "Marantec", status: "Online", notes: "Marantec WKE asset listed at 2000.", vendorIds: ["precision-garage-door"], documentIds: [] },
  { id: "outdoor-dehumidifier", name: "Outdoor Dehumidifier", locationId: "outdoor-condenser-area", category: "Dehumidification", status: "Online", notes: "Outdoor dehumidifier at Outdoor Condenser Area.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "plane-gulfstream-g280-n280cc", name: "Plane Gulfstream G280 N280CC", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N280CC", status: "Online", notes: "Hangar aircraft. Earlier photo clearly shows tail number N280CC.", vendorIds: [], documentIds: [] },
  { id: "plane-gulfstream-g280-n755pa", name: "Plane Gulfstream G280 N755PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N755PA", status: "Online", notes: "Hangar aircraft. Tail number inferred from prior Hangar records.", vendorIds: [], documentIds: [] },
  { id: "plane-gulfstream-g600-n23pa", name: "Plane Gulfstream G600 N23PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G600", serial: "N23PA", status: "Online", notes: "Hangar aircraft. Tail number inferred from prior Hangar records.", vendorIds: [], documentIds: [] },
  { id: "plane-pilatus-pc12-n126al", name: "Plane Pilatus PC12 N126AL", locationId: "hangar", category: "Aircraft", make: "Pilatus", model: "PC12", serial: "N126AL", status: "Online", notes: "Hangar aircraft. Verify screenshot tail number because one screenshot looked like N126AI while prior records say N126AL.", vendorIds: [], documentIds: [] },
  { id: "pool", name: "Pool", locationId: "pool", category: "Pool", status: "Offline", notes: "Pool asset shown as Offline in screenshot.", vendorIds: ["psf-mechanical", "aqua-quip", "krisco-pool-spas"], documentIds: ["pool-record"] },
  { id: "pool-dehumidifier", name: "Pool Dehumidifier", locationId: "mechanical-room", category: "Pool HVAC / Dehumidification", make: "Desert Aire", model: "LC05R2WBDTDLAED", serial: "4217D25175", status: "Online", notes: "Pool dehumidification system with Desert Aire control/display and SR501 relay.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record", "systems-layout"] },
  { id: "range-wolf", name: "Range-Wolf", locationId: "kitchen", category: "Range", make: "Wolf", status: "Online", notes: "Wolf range asset in Kitchen. Possible duplicate with 'wolfe range'. Keep both until user confirms merge.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "refrigerator-fitness-room", name: "Refrigerator", locationId: "fitness-room", category: "Refrigerator", status: "Online", notes: "Refrigerator listed at Fitness Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "refrigerator-left", name: "Refrigerator (Left)", locationId: "kitchen", category: "Refrigerator", status: "Online", notes: "Left refrigerator in Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "steam-generator-attic", name: "Steam Generator Attic", locationId: "general", category: "Steam Generator", status: "Online", notes: "Steam Generator Attic asset listed at General.", vendorIds: ["psf-mechanical"], documentIds: [] },
  { id: "vehicle-audi-e-tron-gt", name: "Vehicle Audi E-Tron GT", locationId: "old-garage", category: "Vehicle", make: "Audi", model: "E-Tron GT", status: "Online", notes: "Vehicle listed at Garage (old).", vendorIds: ["les-schwab"], documentIds: [] },
  { id: "vehicle-ford-f-150", name: "Vehicle Ford F-150", locationId: "new-garage", category: "Vehicle", make: "Ford", model: "F-150", status: "Online", notes: "Screenshot text appeared 'Ford 1-50'; likely Ford F-150. Verify final naming.", vendorIds: ["autonation-ford-bellevue", "les-schwab"], documentIds: [] },
  { id: "vehicle-mercedes-gl", name: "Vehicle Mercedes GL", locationId: "general", category: "Vehicle", make: "Mercedes", model: "GL", status: "Online", notes: "Vehicle listed at General.", vendorIds: ["les-schwab"], documentIds: [] },
  { id: "vehicle-rivian", name: "Vehicle Rivian", locationId: "2000", category: "Vehicle", make: "Rivian", status: "Online", notes: "Vehicle listed at 2000.", vendorIds: ["les-schwab"], documentIds: [] },
  { id: "washer-wm-1", name: "Washer WM-1", locationId: "upstairs-laundry-closet", category: "Washer", status: "Online", notes: "Listed at Upstairs Laundry Closet.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "washer-wm-2", name: "Washer WM-2", locationId: "pool-changing-room", category: "Washer", status: "Online", notes: "Listed at Pool Changing Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "washer-wm-3", name: "Washer WM-3", locationId: "house-managers-office", category: "Washer", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "west-steam-generator", name: "West Steam Generator", locationId: "west-side-house", category: "Steam Generator", status: "Online", notes: "West Steam Generator listed at West side of House.", vendorIds: ["psf-mechanical"], documentIds: [] },
  { id: "wine-chiller", name: "Wine Chiller", locationId: "formal-dining-room", category: "Wine Cooler", status: "Online", notes: "Wine Chiller listed at Formal Dining Room.", vendorIds: ["appliance-service-station", "electromatic-refrigeration"], documentIds: [] },
  { id: "wine-fridge", name: "Wine Fridge", locationId: "mechanical-room-2", category: "Wine Fridge", status: "Online", notes: "Wine Fridge listed at Mechanical Room 2.", vendorIds: ["appliance-service-station", "electromatic-refrigeration"], documentIds: [] },
  { id: "wine-room-cooler-1", name: "Wine Room Cooler 1", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 1.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wine-room-cooler-2", name: "Wine Room Cooler 2", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 2.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wine-room-cooler-3", name: "Wine Room Cooler 3", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 3.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wine-room-cooler-4", name: "Wine Room Cooler 4", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 4.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wolfe-range", name: "wolfe range", locationId: "kitchen", category: "Range", make: "Wolf", status: "Online", notes: "Duplicate/variant naming of Range-Wolf from screenshots. Keep both until user confirms merge.", vendorIds: ["appliance-service-station"], documentIds: [] },
];

const defaultProcedures: ProcedureRecord[] = [
  { id: "pool-backwash", title: "Pool Sand Filter Backwash Rule", locationId: "pool-equipment", assetId: "pool", frequency: "By pressure rise", steps: ["Record clean starting pressure.", "Backwash when pressure rises meaningfully above clean pressure.", "Rinse after backwash.", "Log pressure before and after."] },
  { id: "spa-water-filter", title: "Spa Water / Filter Cadence", locationId: "hot-tub-sundance", assetId: "hottub", frequency: "Weekly / as needed", steps: ["Check water level.", "Test chemistry.", "Inspect filter.", "Clean or replace as needed.", "Check for corrosion or leaks."] },
  { id: "sunstream-lift-box", title: "Sunstream Lift Box Inspection", locationId: "dock", assetId: "craft-cobalt-r-7", frequency: "Weekly / after storms", steps: ["Confirm correct lift box for Cobalt vs Sea-Doo.", "Check solar panel condition.", "Check battery/control wiring visually.", "Test up/down controls only when safe.", "Log issues with photo."] },
  { id: "courtyard-reset", title: "Courtyard Reset", locationId: "courtyard", frequency: "As needed", steps: ["Clean seating area.", "Check fire pit.", "Straighten chairs.", "Check lights and planters.", "Add note if anything is broken."] },
  { id: "dog-cleanup", title: "Trampoline/Dog Area Cleanup", locationId: "trampoline-dog", frequency: "Routine", steps: ["Clean dog area.", "Inspect trampoline area.", "Check turf/grass condition.", "Log issues."] },
];

const defaultCalendar: CalendarEvent[] = [
  { id: "cal-boat", date: todayISO(), title: "Boat cleaned Tuesday", locationId: "dock", assetId: "craft-cobalt-r-7", notes: "Recurring boat cleaning/check." },
  { id: "cal-spa", date: todayISO(), title: "Spa water/filter check", locationId: "hot-tub-sundance", assetId: "hottub", notes: "Check Sundance spa water and filter." },
  { id: "cal-pool", date: todayISO(), title: "Pool chemistry and equipment check", locationId: "pool-equipment", assetId: "pool", notes: "Record readings and inspect equipment." },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored<T>(key: string, value: T) {
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [loaded, setLoaded] = useState(false);

  const [locations, setLocations] = useState<LocationRecord[]>(defaultLocations);
  const [labels, setLabels] = useState<MapLabel[]>(defaultLabels);
  const [assets, setAssets] = useState<AssetRecord[]>(defaultAssets);
  const [vendors, setVendors] = useState<VendorRecord[]>(defaultVendors);
  const [procedures, setProcedures] = useState<ProcedureRecord[]>(defaultProcedures);
  const [documents, setDocuments] = useState<DocumentRecord[]>(defaultDocuments);
  const [calendar, setCalendar] = useState<CalendarEvent[]>(defaultCalendar);
  const [media, setMedia] = useState<MediaRecord[]>([]);

  const [selectedLocationId, setSelectedLocationId] = useState("courtyard");
  const [selectedAssetId, setSelectedAssetId] = useState("boiler-b-2-new");
  const [selectedVendorId, setSelectedVendorId] = useState("psf-mechanical");
  const [selectedProcedureId, setSelectedProcedureId] = useState("pool-backwash");
  const [selectedDocumentId, setSelectedDocumentId] = useState("systems-layout");

  useEffect(() => {
    setLocations(loadStored(KEYS.locations, defaultLocations));
    setLabels(loadStored(KEYS.labels, defaultLabels));
    setAssets(loadStored(KEYS.assets, defaultAssets));
    setVendors(loadStored(KEYS.vendors, defaultVendors));
    setProcedures(loadStored(KEYS.procedures, defaultProcedures));
    setDocuments(loadStored(KEYS.documents, defaultDocuments));
    setCalendar(loadStored(KEYS.calendar, defaultCalendar));
    setMedia(loadStored(KEYS.media, []));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveStored(KEYS.locations, locations); }, [loaded, locations]);
  useEffect(() => { if (loaded) saveStored(KEYS.labels, labels); }, [loaded, labels]);
  useEffect(() => { if (loaded) saveStored(KEYS.assets, assets); }, [loaded, assets]);
  useEffect(() => { if (loaded) saveStored(KEYS.vendors, vendors); }, [loaded, vendors]);
  useEffect(() => { if (loaded) saveStored(KEYS.procedures, procedures); }, [loaded, procedures]);
  useEffect(() => { if (loaded) saveStored(KEYS.documents, documents); }, [loaded, documents]);
  useEffect(() => { if (loaded) saveStored(KEYS.calendar, calendar); }, [loaded, calendar]);
  useEffect(() => { if (loaded) saveStored(KEYS.media, media); }, [loaded, media]);

  const selectedLocation = locations.find((item) => item.id === selectedLocationId) ?? locations[0];
  const selectedAsset = assets.find((item) => item.id === selectedAssetId) ?? assets[0];
  const selectedVendor = vendors.find((item) => item.id === selectedVendorId) ?? vendors[0];
  const selectedProcedure = procedures.find((item) => item.id === selectedProcedureId) ?? procedures[0];
  const selectedDocument = documents.find((item) => item.id === selectedDocumentId) ?? documents[0];

  function attachMedia(item: MediaRecord) {
    setMedia((current) => [item, ...current]);
  }

  return (
    <main className="atlas-shell">
      <aside className="sidebar">
        <div className="brand">
          <AtlasLogo />
          <div>
            <div className="brand-title">ATLAS</div>
            <div className="brand-subtitle">2000 Estate Operations</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={screen === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setScreen(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <strong>Atlas Base</strong>
          <span>Current live base. Edit forward from here.</span>
        </div>
      </aside>

      <section className="content">
        {screen === "dashboard" && (
          <DashboardView
            locations={locations}
            assets={assets}
            vendors={vendors}
            media={media}
            calendar={calendar}
            setScreen={setScreen}
          />
        )}

        {screen === "map" && (
          <MapView
            labels={labels}
            setLabels={setLabels}
            locations={locations}
            selectedLocationId={selectedLocationId}
            setSelectedLocationId={setSelectedLocationId}
            assets={assets}
            procedures={procedures}
            media={media}
            attachMedia={attachMedia}
          />
        )}

        {screen === "locations" && (
          <LocationsView
            locations={locations}
            selected={selectedLocation}
            setSelectedLocationId={setSelectedLocationId}
            setLocations={setLocations}
            assets={assets}
            procedures={procedures}
            media={media}
            attachMedia={attachMedia}
          />
        )}

        {screen === "assets" && (
          <AssetsView
            assets={assets}
            selected={selectedAsset}
            setSelectedAssetId={setSelectedAssetId}
            setAssets={setAssets}
            locations={locations}
            vendors={vendors}
            documents={documents}
            media={media}
            attachMedia={attachMedia}
          />
        )}

        {screen === "vendors" && (
          <VendorsView
            vendors={vendors}
            selected={selectedVendor}
            setSelectedVendorId={setSelectedVendorId}
            setVendors={setVendors}
            assets={assets}
            media={media}
            attachMedia={attachMedia}
          />
        )}

        {screen === "calendar" && (
          <CalendarView calendar={calendar} setCalendar={setCalendar} />
        )}

        {screen === "weather" && <WeatherView full />}

        {screen === "documents" && (
          <DocumentsView
            documents={documents}
            selected={selectedDocument}
            setSelectedDocumentId={setSelectedDocumentId}
            setDocuments={setDocuments}
            media={media}
            attachMedia={attachMedia}
          />
        )}

        {screen === "procedures" && (
          <ProceduresView
            procedures={procedures}
            selected={selectedProcedure}
            setSelectedProcedureId={setSelectedProcedureId}
            setProcedures={setProcedures}
            locations={locations}
            assets={assets}
            media={media}
            attachMedia={attachMedia}
          />
        )}

        {screen === "logs" && <LogsView media={media} setMedia={setMedia} />}

        {screen === "assistant" && (
          <AssistantView
            locations={locations}
            assets={assets}
            vendors={vendors}
            procedures={procedures}
            documents={documents}
            media={media}
          />
        )}

        {screen === "team" && <TeamView />}
      </section>

      <Styles />
    </main>
  );
}

function AtlasLogo() {
  return (
    <div className="atlas-logo">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="35" />
        <path d="M12 52 L28 34 L38 46 L52 22 L68 52" />
        <path d="M20 57 C31 51 43 51 60 57" />
        <path d="M30 63 C39 59 47 59 56 63" />
        <path d="M40 11 L40 24" />
      </svg>
    </div>
  );
}

function Header({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">{children}</div>
    </header>
  );
}

function DashboardView({
  locations,
  assets,
  vendors,
  media,
  calendar,
  setScreen,
}: {
  locations: LocationRecord[];
  assets: AssetRecord[];
  vendors: VendorRecord[];
  media: MediaRecord[];
  calendar: CalendarEvent[];
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
}) {
  const todayEvents = calendar.filter((event) => event.date === todayISO()).slice(0, 5);

  return (
    <>
      <Header title="Atlas Dashboard" subtitle="Private 2000 estate operations control center." />
      <div className="stat-grid">
        <Stat title="Locations" value={locations.length} note="Clickable and editable" />
        <Stat title="Assets" value={assets.length} note="Assets loaded from screenshots" />
        <Stat title="Vendors" value={vendors.length} note="Linked to assets where known" />
        <Stat title="Media / Notes" value={media.length} note="Photos, comments, voice notes" />
      </div>

      <div className="dashboard-grid">
        <section className="card wide">
          <div className="card-title-row">
            <div>
              <h2>Clickable Property Map</h2>
              <p>Locked original map image. Editable labels only. Nothing on the actual map moves.</p>
            </div>
            <button className="button primary" onClick={() => setScreen("map")}>Open Map</button>
          </div>
          <div className="map-preview" onClick={() => setScreen("map")}>
            <img src="/atlas-property-map.png" alt="Atlas 2000 property map preview" />
            <span>Open editable map section</span>
          </div>
        </section>

        <section className="card">
          <h2>Today</h2>
          {todayEvents.length ? todayEvents.map((event) => (
            <div className="mini-row" key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.notes}</span>
            </div>
          )) : <p className="muted">No calendar items for today.</p>}
        </section>

        <WeatherView />

        <section className="card">
          <h2>Loaded Asset Groups</h2>
          {["Boilers / Mechanical", "HVAC AH/CU/HP units", "Pool / Spa", "Kitchen Appliances", "Wine Room Cooling", "Vehicles / Aircraft"].map((item) => (
            <div className="pill-row" key={item}>{item}</div>
          ))}
        </section>
      </div>
    </>
  );
}

function Stat({ title, value, note }: { title: string; value: number | string; note: string }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function MapView({
  labels,
  setLabels,
  locations,
  selectedLocationId,
  setSelectedLocationId,
  assets,
  procedures,
  media,
  attachMedia,
}: {
  labels: MapLabel[];
  setLabels: React.Dispatch<React.SetStateAction<MapLabel[]>>;
  locations: LocationRecord[];
  selectedLocationId: string;
  setSelectedLocationId: React.Dispatch<React.SetStateAction<string>>;
  assets: AssetRecord[];
  procedures: ProcedureRecord[];
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const selectedLabel = labels.find((label) => label.locationId === selectedLocationId) ?? labels[0];
  const selectedLocation = locations.find((loc) => loc.id === selectedLabel.locationId) ?? locations[0];
  const relatedAssets = assets.filter((asset) => asset.locationId === selectedLocation.id);
  const relatedProcedures = procedures.filter((procedure) => procedure.locationId === selectedLocation.id);

  function updateLabel(id: string, patch: Partial<MapLabel>) {
    setLabels((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (!editMode) return;
    event.preventDefault();
    setDragging(id);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!editMode || !dragging || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100);
    updateLabel(dragging, { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  }

  function addLabel() {
    const location = locations[0];
    const next: MapLabel = {
      id: `label-${Date.now()}`,
      name: "New Label",
      x: 50,
      y: 50,
      locationId: location.id,
    };
    setLabels((rows) => [...rows, next]);
    setSelectedLocationId(location.id);
    setEditMode(true);
  }

  function removeLabel(id: string) {
    setLabels((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <>
      <Header title="Property Map" subtitle="Your original map is locked. Labels are the only editable layer.">
        <button className={editMode ? "button primary" : "button"} onClick={() => setEditMode(!editMode)}>
          {editMode ? "Done Editing" : "Edit Labels"}
        </button>
        <button className="button" onClick={addLabel}>+ Add Label</button>
        <button className="button" onClick={() => setLabels(defaultLabels)}>Reset Labels</button>
      </Header>

      <div className="two-col map-page">
        <section className="card map-card">
          <div
            className={editMode ? "map-wrap editing" : "map-wrap"}
            ref={mapRef}
            onPointerMove={moveDrag}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
          >
            <img src="/atlas-property-map.png" alt="Atlas 2000 locked property map" draggable={false} />
            {labels.map((label) => (
              <button
                key={label.id}
                className={label.locationId === selectedLocationId ? "map-label selected" : "map-label"}
                style={{ left: `${label.x}%`, top: `${label.y}%` }}
                onClick={() => setSelectedLocationId(label.locationId)}
                onPointerDown={(event) => startDrag(event, label.id)}
                type="button"
              >
                <span className="hit-zone" />
                <span className="pin" />
                <span className="label-text">{label.name}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="card detail-panel">
          <div className="section-kicker">{selectedLocation.type}</div>
          <h2>{selectedLocation.name}</h2>
          <p>{selectedLocation.summary}</p>
          <p className="muted">{selectedLocation.notes}</p>

          <QRTag type="location" id={selectedLocation.id} label={selectedLocation.name} />

          {editMode && selectedLabel && (
            <div className="editor-box">
              <h3>Map Label Settings</h3>
              <label>Name<input value={selectedLabel.name} onChange={(e) => updateLabel(selectedLabel.id, { name: e.target.value })} /></label>
              <label>Location
                <select value={selectedLabel.locationId} onChange={(e) => updateLabel(selectedLabel.id, { locationId: e.target.value })}>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </label>
              <div className="split">
                <label>X %<input type="number" value={selectedLabel.x} onChange={(e) => updateLabel(selectedLabel.id, { x: clamp(Number(e.target.value)) })} /></label>
                <label>Y %<input type="number" value={selectedLabel.y} onChange={(e) => updateLabel(selectedLabel.id, { y: clamp(Number(e.target.value)) })} /></label>
              </div>
              <button className="button danger full" onClick={() => removeLabel(selectedLabel.id)}>Remove Label</button>
            </div>
          )}

          <MiniList title="Assets Here" items={relatedAssets.map((asset) => asset.name)} />
          <MiniList title="Procedures Here" items={relatedProcedures.map((procedure) => procedure.title)} />
          <MediaTools targetType="location" targetId={selectedLocation.id} media={media} attachMedia={attachMedia} />
        </aside>
      </div>
    </>
  );
}

function LocationsView({
  locations,
  selected,
  setSelectedLocationId,
  setLocations,
  assets,
  procedures,
  media,
  attachMedia,
}: {
  locations: LocationRecord[];
  selected: LocationRecord;
  setSelectedLocationId: React.Dispatch<React.SetStateAction<string>>;
  setLocations: React.Dispatch<React.SetStateAction<LocationRecord[]>>;
  assets: AssetRecord[];
  procedures: ProcedureRecord[];
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const [edit, setEdit] = useState(false);
  const relatedAssets = assets.filter((asset) => asset.locationId === selected.id);
  const relatedProcedures = procedures.filter((procedure) => procedure.locationId === selected.id);

  function update(patch: Partial<LocationRecord>) {
    setLocations((rows) => rows.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <Header title="Locations" subtitle="All 2000 locations are listed, clickable, and editable.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Location"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={locations.map((loc) => ({ id: loc.id, name: loc.name, subtitle: loc.type }))} selectedId={selected.id} onSelect={setSelectedLocationId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Name<input value={selected.name} onChange={(e) => update({ name: e.target.value })} /></label>
              <label>Type<input value={selected.type} onChange={(e) => update({ type: e.target.value })} /></label>
              <label>Summary<textarea value={selected.summary} onChange={(e) => update({ summary: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => update({ notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.type}</div>
              <h2>{selected.name}</h2>
              <p>{selected.summary}</p>
              <p className="muted">{selected.notes}</p>
            </>
          )}
          <QRTag type="location" id={selected.id} label={selected.name} />
          <MiniList title="Linked Assets" items={relatedAssets.map((asset) => asset.name)} />
          <MiniList title="Linked Procedures" items={relatedProcedures.map((procedure) => procedure.title)} />
          <MediaTools targetType="location" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function AssetsView({
  assets,
  selected,
  setSelectedAssetId,
  setAssets,
  locations,
  vendors,
  documents,
  media,
  attachMedia,
}: {
  assets: AssetRecord[];
  selected: AssetRecord;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string>>;
  setAssets: React.Dispatch<React.SetStateAction<AssetRecord[]>>;
  locations: LocationRecord[];
  vendors: VendorRecord[];
  documents: DocumentRecord[];
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const [edit, setEdit] = useState(false);
  const location = locations.find((item) => item.id === selected.locationId);
  const linkedVendors = vendors.filter((vendor) => selected.vendorIds.includes(vendor.id));
  const linkedDocs = documents.filter((doc) => selected.documentIds.includes(doc.id));

  function update(patch: Partial<AssetRecord>) {
    setAssets((rows) => rows.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <Header title="Assets" subtitle="Equipment, systems, vehicles, aircraft, appliances, QR tags, notes, and documents.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Asset"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={assets.map((asset) => ({ id: asset.id, name: asset.name, subtitle: `${asset.category} · ${asset.status}` }))} selectedId={selected.id} onSelect={setSelectedAssetId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Name<input value={selected.name} onChange={(e) => update({ name: e.target.value })} /></label>
              <label>Category<input value={selected.category} onChange={(e) => update({ category: e.target.value })} /></label>
              <label>Location
                <select value={selected.locationId} onChange={(e) => update({ locationId: e.target.value })}>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </label>
              <label>Status
                <select value={selected.status} onChange={(e) => update({ status: e.target.value as AssetRecord["status"] })}>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Monitor">Monitor</option>
                </select>
              </label>
              <div className="split">
                <label>Make<input value={selected.make ?? ""} onChange={(e) => update({ make: e.target.value })} /></label>
                <label>Model<input value={selected.model ?? ""} onChange={(e) => update({ model: e.target.value })} /></label>
              </div>
              <label>Serial<input value={selected.serial ?? ""} onChange={(e) => update({ serial: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => update({ notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.category}</div>
              <h2>{selected.name}</h2>
              <p><strong>Location:</strong> {location?.name ?? selected.locationId}</p>
              <p><strong>Status:</strong> {selected.status}</p>
              <p className="muted">{selected.notes}</p>
              <div className="info-grid">
                <span>Make: <strong>{selected.make ?? "—"}</strong></span>
                <span>Model: <strong>{selected.model ?? "—"}</strong></span>
                <span>Serial: <strong>{selected.serial ?? "—"}</strong></span>
              </div>
            </>
          )}
          <QRTag type="asset" id={selected.id} label={selected.name} />
          <MiniList title="Linked Vendors" items={linkedVendors.map((vendor) => vendor.name)} />
          <MiniList title="Linked Documents / Diagrams" items={linkedDocs.map((doc) => doc.title)} />
          <MediaTools targetType="asset" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function VendorsView({
  vendors,
  selected,
  setSelectedVendorId,
  setVendors,
  assets,
  media,
  attachMedia,
}: {
  vendors: VendorRecord[];
  selected: VendorRecord;
  setSelectedVendorId: React.Dispatch<React.SetStateAction<string>>;
  setVendors: React.Dispatch<React.SetStateAction<VendorRecord[]>>;
  assets: AssetRecord[];
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const [edit, setEdit] = useState(false);
  const linkedAssets = assets.filter((asset) => asset.vendorIds.includes(selected.id));

  function update(patch: Partial<VendorRecord>) {
    setVendors((rows) => rows.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <Header title="Vendors" subtitle="Vendor directory and linked asset relationships.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Vendor"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={vendors.map((vendor) => ({ id: vendor.id, name: vendor.name, subtitle: vendor.category }))} selectedId={selected.id} onSelect={setSelectedVendorId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Name<input value={selected.name} onChange={(e) => update({ name: e.target.value })} /></label>
              <label>Category<input value={selected.category} onChange={(e) => update({ category: e.target.value })} /></label>
              <label>Phone<input value={selected.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} /></label>
              <label>Email<input value={selected.email ?? ""} onChange={(e) => update({ email: e.target.value })} /></label>
              <label>Address<input value={selected.address ?? ""} onChange={(e) => update({ address: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => update({ notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.category}</div>
              <h2>{selected.name}</h2>
              <p>{selected.phone ?? "No phone saved yet"}</p>
              <p>{selected.email ?? "No email saved yet"}</p>
              {selected.address && <p>{selected.address}</p>}
              <p className="muted">{selected.notes}</p>
            </>
          )}
          <QRTag type="vendor" id={selected.id} label={selected.name} />
          <MiniList title="Linked Assets" items={linkedAssets.map((asset) => asset.name)} />
          <MediaTools targetType="vendor" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function ProceduresView({
  procedures,
  selected,
  setSelectedProcedureId,
  setProcedures,
  locations,
  assets,
  media,
  attachMedia,
}: {
  procedures: ProcedureRecord[];
  selected: ProcedureRecord;
  setSelectedProcedureId: React.Dispatch<React.SetStateAction<string>>;
  setProcedures: React.Dispatch<React.SetStateAction<ProcedureRecord[]>>;
  locations: LocationRecord[];
  assets: AssetRecord[];
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const [edit, setEdit] = useState(false);

  function update(patch: Partial<ProcedureRecord>) {
    setProcedures((rows) => rows.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <Header title="Procedures" subtitle="Procedures are clickable, editable, and linked to locations/assets.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Procedure"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={procedures.map((procedure) => ({ id: procedure.id, name: procedure.title, subtitle: procedure.frequency }))} selectedId={selected.id} onSelect={setSelectedProcedureId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Title<input value={selected.title} onChange={(e) => update({ title: e.target.value })} /></label>
              <label>Frequency<input value={selected.frequency} onChange={(e) => update({ frequency: e.target.value })} /></label>
              <label>Location
                <select value={selected.locationId} onChange={(e) => update({ locationId: e.target.value })}>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </label>
              <label>Asset
                <select value={selected.assetId ?? ""} onChange={(e) => update({ assetId: e.target.value || undefined })}>
                  <option value="">No asset</option>
                  {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                </select>
              </label>
              <label>Steps, one per line
                <textarea value={selected.steps.join("\n")} onChange={(e) => update({ steps: e.target.value.split("\n").filter(Boolean) })} />
              </label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.frequency}</div>
              <h2>{selected.title}</h2>
              <ol className="steps">{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </>
          )}
          <QRTag type="procedure" id={selected.id} label={selected.title} />
          <MediaTools targetType="procedure" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function DocumentsView({
  documents,
  selected,
  setSelectedDocumentId,
  setDocuments,
  media,
  attachMedia,
}: {
  documents: DocumentRecord[];
  selected: DocumentRecord;
  setSelectedDocumentId: React.Dispatch<React.SetStateAction<string>>;
  setDocuments: React.Dispatch<React.SetStateAction<DocumentRecord[]>>;
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const [edit, setEdit] = useState(false);

  function update(patch: Partial<DocumentRecord>) {
    setDocuments((rows) => rows.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <Header title="Documents & Diagrams" subtitle="Diagrams, PDFs, invoices, manuals, photo records, and document placeholders.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Document"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={documents.map((doc) => ({ id: doc.id, name: doc.title, subtitle: doc.type }))} selectedId={selected.id} onSelect={setSelectedDocumentId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Title<input value={selected.title} onChange={(e) => update({ title: e.target.value })} /></label>
              <label>Type<input value={selected.type} onChange={(e) => update({ type: e.target.value })} /></label>
              <label>Linked To<input value={selected.linkedTo} onChange={(e) => update({ linkedTo: e.target.value })} /></label>
              <label>File URL / public path<input value={selected.href ?? ""} onChange={(e) => update({ href: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => update({ notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.type}</div>
              <h2>{selected.title}</h2>
              <p><strong>Linked to:</strong> {selected.linkedTo}</p>
              <p className="muted">{selected.notes}</p>
              {selected.href ? <a className="button primary inline" href={selected.href} target="_blank">Open File</a> : <p className="muted">File slot created. Add file URL/path when uploaded.</p>}
            </>
          )}
          <QRTag type="document" id={selected.id} label={selected.title} />
          <MediaTools targetType="document" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function CalendarView({
  calendar,
  setCalendar,
}: {
  calendar: CalendarEvent[];
  setCalendar: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}) {
  const [activeDate, setActiveDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const events = calendar.filter((event) => event.date === activeDate);

  function addEvent() {
    if (!title.trim()) return;
    setCalendar((rows) => [...rows, { id: `cal-${Date.now()}`, date: activeDate, title, notes }]);
    setTitle("");
    setNotes("");
  }

  function removeEvent(id: string) {
    setCalendar((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <>
      <Header title="Calendar" subtitle="Interactive adjustable calendar for recurring and one-off work." />
      <div className="two-col">
        <section className="card">
          <label>Select Date<input type="date" value={activeDate} onChange={(e) => setActiveDate(e.target.value)} /></label>
          <div className="calendar-grid">
            {makeMonthDays(activeDate).map((day) => (
              <button key={day} className={day === activeDate ? "day active" : "day"} onClick={() => setActiveDate(day)}>{Number(day.slice(8, 10))}</button>
            ))}
          </div>
        </section>
        <section className="card detail-panel">
          <h2>{activeDate}</h2>
          {events.length ? events.map((event) => (
            <div className="mini-row" key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.notes}</span>
              <button className="small danger-text" onClick={() => removeEvent(event.id)}>Remove</button>
            </div>
          )) : <p className="muted">No events for this date.</p>}
          <div className="editor-box">
            <h3>Add Event</h3>
            <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <button className="button primary full" onClick={addEvent}>Add to Calendar</button>
          </div>
        </section>
      </div>
    </>
  );
}

function WeatherView({ full = false }: { full?: boolean }) {
  const [weather, setWeather] = useState<{ temp: number; high?: number; low?: number; wind?: number; humidity?: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=47.57&longitude=-122.22&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto")
      .then((res) => res.json())
      .then((data) => {
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          wind: Math.round(data.current.wind_speed_10m),
          humidity: data.current.relative_humidity_2m,
        });
      })
      .catch(() => setError("Weather unavailable right now."));
  }, []);

  const card = (
    <section className="card">
      <h2>Weather</h2>
      <p className="muted">2000 / Mercer Island area</p>
      {weather ? (
        <div className="weather-big">
          <strong>{weather.temp}°F</strong>
          <span>High {weather.high}° / Low {weather.low}°</span>
          <span>Wind {weather.wind} mph · Humidity {weather.humidity}%</span>
        </div>
      ) : <p className="muted">{error || "Loading weather..."}</p>}
    </section>
  );

  if (full) return <><Header title="Weather" subtitle="Live weather panel for exterior work planning." />{card}</>;
  return card;
}

function LogsView({
  media,
  setMedia,
}: {
  media: MediaRecord[];
  setMedia: React.Dispatch<React.SetStateAction<MediaRecord[]>>;
}) {
  return (
    <>
      <Header title="Logs" subtitle="Comments, photos, voice notes, and field notes saved in this browser." />
      <section className="card">
        {media.length ? media.map((item) => (
          <div className="log-row" key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.kind} · {new Date(item.createdAt).toLocaleString()}</span>
            {item.text && <p>{item.text}</p>}
            {item.dataUrl && item.kind === "photo" && <img className="log-photo" src={item.dataUrl} alt={item.title} />}
            {item.dataUrl && item.kind === "voice" && <audio controls src={item.dataUrl} />}
            <button className="small danger-text" onClick={() => setMedia((rows) => rows.filter((row) => row.id !== item.id))}>Delete</button>
          </div>
        )) : <p className="muted">No logs yet. Add comments, photos, or voice notes from any record.</p>}
      </section>
    </>
  );
}

function AssistantView({
  locations,
  assets,
  vendors,
  procedures,
  documents,
  media,
}: {
  locations: LocationRecord[];
  assets: AssetRecord[];
  vendors: VendorRecord[];
  procedures: ProcedureRecord[];
  documents: DocumentRecord[];
  media: MediaRecord[];
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask about an asset, vendor, location, procedure, or document.");

  function ask() {
    const q = question.toLowerCase();
    const words = q.split(/\s+/).filter((word) => word.length > 2);
    const pool = [
      ...locations.map((x) => `Location: ${x.name}. ${x.summary} ${x.notes}`),
      ...assets.map((x) => `Asset: ${x.name}. ${x.category}. ${x.make ?? ""} ${x.model ?? ""} ${x.serial ?? ""}. ${x.notes}`),
      ...vendors.map((x) => `Vendor: ${x.name}. ${x.category}. ${x.phone ?? ""} ${x.email ?? ""}. ${x.notes}`),
      ...procedures.map((x) => `Procedure: ${x.title}. ${x.frequency}. ${x.steps.join(" ")}`),
      ...documents.map((x) => `Document: ${x.title}. ${x.type}. ${x.notes}`),
      ...media.map((x) => `Log: ${x.title}. ${x.text ?? ""}`),
    ];
    const hits = pool.filter((line) => words.some((word) => line.toLowerCase().includes(word))).slice(0, 10);
    setAnswer(hits.length ? hits.join("\n\n") : "I did not find that in the local Atlas records yet.");
  }

  return (
    <>
      <Header title="AI Assistant" subtitle="Local Atlas search over the records in this app. Database-backed AI comes later." />
      <section className="card assistant-card">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask Atlas about boilers, Sundance, HVAC HP-4, Cobalt, Sea-Doo, pool backwash, vendors, locations..." />
        <button className="button primary" onClick={ask}>Ask Atlas</button>
        <pre className="answer">{answer}</pre>
      </section>
    </>
  );
}

function TeamView() {
  return (
    <>
      <Header title="Team" subtitle="Team and permissions placeholder. Login is paused until the structure is ready." />
      <section className="card">
        <h2>Access Plan</h2>
        <p>Atlas will support owner/admin/team views later. Do not store raw passwords, access codes, PINs, private emails, or owner credentials in normal records.</p>
      </section>
    </>
  );
}

function RecordList({
  records,
  selectedId,
  onSelect,
}: {
  records: { id: string; name: string; subtitle?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = records.filter((record) => record.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="card list-card">
      <input className="search" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="record-list">
        {filtered.map((record) => (
          <button key={record.id} className={record.id === selectedId ? "record active" : "record"} onClick={() => onSelect(record.id)}>
            <strong>{record.name}</strong>
            <span>{record.subtitle ?? ""}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mini-list">
      <strong>{title}</strong>
      {items.length ? items.map((item) => <span key={item}>{item}</span>) : <span className="muted">No linked records yet.</span>}
    </div>
  );
}

function QRTag({ type, id, label }: { type: string; id: string; label: string }) {
  const data = `https://www.atlas2000.com/?atlas=${type}:${id}`;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(data)}`;

  return (
    <div className="qr-box">
      <img src={src} alt={`QR tag for ${label}`} />
      <div>
        <strong>QR Tag</strong>
        <span>{type}:{id}</span>
        <small>Print or screenshot this tag for the record.</small>
      </div>
    </div>
  );
}

function MediaTools({
  targetType,
  targetId,
  media,
  attachMedia,
}: {
  targetType: MediaRecord["targetType"];
  targetId: string;
  media: MediaRecord[];
  attachMedia: (item: MediaRecord) => void;
}) {
  const [comment, setComment] = useState("");
  const [viewer, setViewer] = useState<string | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const related = media.filter((item) => item.targetType === targetType && item.targetId === targetId);
  const photos = related.filter((item) => item.kind === "photo");

  function addComment() {
    if (!comment.trim()) return;
    attachMedia({
      id: `comment-${Date.now()}`,
      targetType,
      targetId,
      kind: "comment",
      title: "Comment",
      text: comment,
      createdAt: new Date().toISOString(),
    });
    setComment("");
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      attachMedia({
        id: `photo-${Date.now()}-${file.name}`,
        targetType,
        targetId,
        kind: "photo",
        title: file.name,
        dataUrl,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function startVoice() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Voice recording is not supported in this browser.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const next = new MediaRecorder(stream);
    chunks.current = [];
    next.ondataavailable = (event) => chunks.current.push(event.data);
    next.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const dataUrl = await blobToDataUrl(blob);
      attachMedia({
        id: `voice-${Date.now()}`,
        targetType,
        targetId,
        kind: "voice",
        title: "Voice Note",
        dataUrl,
        createdAt: new Date().toISOString(),
      });
      stream.getTracks().forEach((track) => track.stop());
    };
    next.start();
    setRecorder(next);
  }

  function stopVoice() {
    recorder?.stop();
    setRecorder(null);
  }

  return (
    <div className="media-box">
      <h3>Photos, Comments & Voice Notes</h3>

      <div className="comment-row">
        <input placeholder="Add comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <button className="button" onClick={addComment}>Save</button>
      </div>

      <div className="media-actions">
        <label className="button file-button">
          Add Photos
          <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
        </label>
        {recorder ? <button className="button danger" onClick={stopVoice}>Stop Voice</button> : <button className="button" onClick={startVoice}>Record Voice</button>}
      </div>

      <div className="gallery">
        {photos.map((item) => (
          <button key={item.id} onClick={() => setViewer(item.dataUrl ?? null)}>
            <img src={item.dataUrl} alt={item.title} />
          </button>
        ))}
      </div>

      <div className="media-list">
        {related.map((item) => (
          <div key={item.id} className="media-item">
            <strong>{item.title}</strong>
            <span>{item.kind} · {new Date(item.createdAt).toLocaleString()}</span>
            {item.text && <p>{item.text}</p>}
            {item.kind === "voice" && item.dataUrl && <audio controls src={item.dataUrl} />}
          </div>
        ))}
      </div>

      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer} alt="Full size Atlas media" />
        </div>
      )}
    </div>
  );
}

function makeMonthDays(dateString: string) {
  const date = new Date(dateString + "T00:00:00");
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function Styles() {
  return (
    <style>{`
      :root {
        --navy: #071d3a;
        --gold: #caa24a;
        --bg: #f5f7fb;
        --card: #ffffff;
        --line: #e4e8f0;
        --text: #10213d;
        --muted: #667085;
        --danger: #b42318;
      }

      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      button, input, textarea, select { font: inherit; }
      button { cursor: pointer; }

      .atlas-shell { min-height: 100vh; display: grid; grid-template-columns: 270px 1fr; }
      .sidebar { background: linear-gradient(180deg, #061832, #09254b); color: white; padding: 24px 18px; display: flex; flex-direction: column; gap: 24px; }
      .brand { display: flex; align-items: center; gap: 14px; }
      .atlas-logo { width: 52px; height: 52px; }
      .atlas-logo svg { width: 100%; height: 100%; }
      .atlas-logo circle { fill: rgba(255,255,255,.08); stroke: var(--gold); stroke-width: 3; }
      .atlas-logo path { fill: none; stroke: white; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
      .brand-title { font-weight: 900; letter-spacing: .18em; font-size: 20px; }
      .brand-subtitle { color: #d8bd74; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; margin-top: 4px; }

      .nav { display: grid; gap: 7px; }
      .nav-item { background: transparent; border: 0; color: rgba(255,255,255,.78); border-radius: 12px; padding: 12px 13px; text-align: left; display: flex; align-items: center; gap: 11px; }
      .nav-item.active { background: rgba(255,255,255,.12); color: white; box-shadow: inset 3px 0 0 var(--gold); }

      .sidebar-card { margin-top: auto; border: 1px solid rgba(255,255,255,.14); border-radius: 16px; padding: 14px; background: rgba(255,255,255,.07); display: grid; gap: 5px; }
      .sidebar-card span { color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.4; }

      .content { padding: 28px; min-width: 0; }
      .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
      .page-header h1 { margin: 0; font-size: 34px; letter-spacing: -.04em; }
      .page-header p { margin: 7px 0 0; color: var(--muted); }
      .header-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }

      .button { border: 1px solid var(--line); background: white; color: var(--text); padding: 10px 14px; border-radius: 12px; font-weight: 800; box-shadow: 0 1px 2px rgba(16,24,40,.04); text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
      .button.primary { background: var(--navy); color: white; border-color: var(--navy); }
      .button.danger { color: var(--danger); }
      .button.full { width: 100%; }
      .button.inline { width: fit-content; }
      .small { border: 0; background: transparent; font-weight: 800; padding: 4px 0; }
      .danger-text { color: var(--danger); }

      .stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; margin-bottom: 18px; }
      .stat-card, .card { background: var(--card); border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 10px 28px rgba(15,23,42,.07); }
      .stat-card { padding: 18px; display: grid; gap: 6px; }
      .stat-card span, .muted { color: var(--muted); }
      .stat-card strong { font-size: 32px; letter-spacing: -.04em; }
      .stat-card small { color: var(--muted); }

      .dashboard-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 18px; }
      .card { padding: 20px; }
      .card.wide { grid-row: span 2; }
      .card h2 { margin: 0 0 12px; letter-spacing: -.03em; }
      .card-title-row { display: flex; justify-content: space-between; gap: 15px; align-items: flex-start; }

      .map-preview { margin-top: 14px; position: relative; border-radius: 16px; overflow: hidden; background: #06101f; min-height: 320px; cursor: pointer; }
      .map-preview img { width: 100%; display: block; }
      .map-preview span { position: absolute; bottom: 14px; left: 14px; background: rgba(7,29,58,.92); color: white; padding: 10px 13px; border-radius: 999px; font-weight: 900; }

      .two-col { display: grid; grid-template-columns: minmax(420px, 1fr) 420px; gap: 18px; align-items: start; }
      .map-page { grid-template-columns: minmax(540px, 1fr) 420px; }
      .map-card { padding: 0; overflow: hidden; }
      .map-wrap { position: relative; background: #06101f; user-select: none; touch-action: none; }
      .map-wrap img { width: 100%; display: block; pointer-events: none; }
      .map-label { position: absolute; transform: translate(-50%, -50%); border: 0; background: transparent; padding: 0; display: flex; align-items: center; gap: 7px; z-index: 4; filter: drop-shadow(0 5px 9px rgba(0,0,0,.35)); }
      .map-wrap.editing .map-label { cursor: grab; }
      .map-wrap.editing .map-label:active { cursor: grabbing; }
      .hit-zone { position: absolute; width: 72px; height: 72px; border-radius: 999px; background: rgba(255,255,255,.01); }
      .pin { width: 12px; height: 12px; border-radius: 99px; background: var(--gold); border: 2px solid white; z-index: 2; }
      .label-text { z-index: 2; background: rgba(7,29,58,.96); color: white; border: 1px solid rgba(255,255,255,.85); border-radius: 999px; padding: 7px 11px; font-size: 13px; font-weight: 900; white-space: nowrap; }
      .map-label.selected .label-text { background: var(--gold); color: #071d3a; }
      .map-label.selected .pin { background: var(--navy); box-shadow: 0 0 0 4px rgba(202,162,74,.35); }

      .detail-panel { position: sticky; top: 18px; }
      .section-kicker { color: var(--gold); text-transform: uppercase; font-size: 12px; letter-spacing: .14em; font-weight: 900; margin-bottom: 6px; }
      .detail-panel h2 { margin: 0 0 12px; font-size: 28px; letter-spacing: -.04em; }
      .editor-box { margin: 16px 0; padding: 14px; border: 1px solid var(--line); border-radius: 16px; background: #fbfcff; }
      .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

      label { display: grid; gap: 6px; margin-bottom: 12px; font-size: 12px; font-weight: 900; color: var(--muted); }
      input, textarea, select { width: 100%; border: 1px solid var(--line); border-radius: 11px; padding: 10px 11px; background: white; color: var(--text); outline: none; }
      textarea { min-height: 90px; resize: vertical; }
      input:focus, textarea:focus, select:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(202,162,74,.16); }

      .list-card { padding: 14px; }
      .search { margin-bottom: 12px; }
      .record-list { display: grid; gap: 8px; max-height: calc(100vh - 210px); overflow: auto; padding-right: 4px; }
      .record { text-align: left; border: 1px solid var(--line); background: white; border-radius: 13px; padding: 12px; display: grid; gap: 4px; }
      .record.active { border-color: var(--gold); background: #fff9e8; }
      .record span { color: var(--muted); font-size: 13px; }

      .mini-list { border: 1px solid var(--line); border-radius: 14px; padding: 12px; display: grid; gap: 7px; margin: 12px 0; }
      .mini-list span { color: #344054; }
      .info-grid { display: grid; gap: 8px; border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin: 12px 0; }
      .steps { line-height: 1.6; }

      .qr-box { display: flex; gap: 12px; align-items: center; padding: 12px; border: 1px solid var(--line); border-radius: 16px; background: #f8fafc; margin: 14px 0; }
      .qr-box img { width: 92px; height: 92px; background: white; border-radius: 8px; border: 1px solid var(--line); }
      .qr-box div { display: grid; gap: 4px; }
      .qr-box span, .qr-box small { color: var(--muted); overflow-wrap: anywhere; }

      .media-box { border-top: 1px solid var(--line); padding-top: 14px; margin-top: 16px; }
      .comment-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
      .media-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
      .file-button input { display: none; }
      .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
      .gallery button { border: 0; padding: 0; background: transparent; border-radius: 10px; overflow: hidden; aspect-ratio: 1; }
      .gallery img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .media-list { display: grid; gap: 8px; }
      .media-item, .mini-row, .log-row { border: 1px solid var(--line); border-radius: 13px; padding: 12px; display: grid; gap: 4px; background: white; }
      .media-item span, .mini-row span, .log-row span { color: var(--muted); font-size: 13px; }
      .viewer { position: fixed; inset: 0; background: rgba(0,0,0,.84); display: grid; place-items: center; z-index: 100; padding: 30px; }
      .viewer img { max-width: 96vw; max-height: 92vh; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }

      .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
      .day { border: 1px solid var(--line); border-radius: 12px; background: white; min-height: 54px; font-weight: 900; }
      .day.active { background: var(--navy); color: white; }

      .weather-big { display: grid; gap: 6px; }
      .weather-big strong { font-size: 44px; letter-spacing: -.05em; }
      .weather-big span { color: var(--muted); }
      .assistant-card { display: grid; gap: 12px; }
      .assistant-card textarea { min-height: 120px; }
      .answer { white-space: pre-wrap; background: #071d3a; color: white; border-radius: 14px; padding: 16px; line-height: 1.5; overflow: auto; }
      .pill-row { border: 1px solid var(--line); border-radius: 999px; padding: 9px 12px; margin: 8px 0; background: #f8fafc; }
      .log-photo { width: 180px; border-radius: 12px; }

      @media (max-width: 1150px) {
        .atlas-shell { grid-template-columns: 1fr; }
        .sidebar { position: static; }
        .nav { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .two-col, .map-page, .dashboard-grid { grid-template-columns: 1fr; }
        .detail-panel { position: static; }
        .stat-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
      }

      @media (max-width: 700px) {
        .content { padding: 14px; }
        .page-header { flex-direction: column; }
        .nav { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .stat-grid { grid-template-columns: 1fr; }
        .label-text { font-size: 11px; padding: 6px 8px; }
        .sidebar { padding: 18px; }
      }
    `}</style>
  );
}
```

