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
  | "assistant"
  | "team";

type MapLabel = {
  id: string;
  name: string;
  x: number;
  y: number;
  locationId: string;
};

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
  make?: string;
  model?: string;
  serial?: string;
  status: string;
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

type AtlasMedia = {
  id: string;
  targetType: "location" | "asset" | "vendor" | "procedure" | "document";
  targetId: string;
  kind: "photo" | "voice" | "comment";
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

type WeatherData = {
  temperature: number;
  humidity?: number;
  wind: number;
  precip?: number;
  high?: number;
  low?: number;
  updatedAt: string;
};

const LABEL_KEY = "atlas_2000_labels_v3";
const LOCATION_KEY = "atlas_2000_locations_v3";
const ASSET_KEY = "atlas_2000_assets_v3";
const VENDOR_KEY = "atlas_2000_vendors_v3";
const PROCEDURE_KEY = "atlas_2000_procedures_v3";
const DOCUMENT_KEY = "atlas_2000_documents_v3";
const MEDIA_KEY = "atlas_2000_media_v3";
const CALENDAR_KEY = "atlas_2000_calendar_v3";

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
  { id: "dock", name: "Dock", type: "Waterfront", summary: "Main dock, boat lift areas, Sea-Doo area, swim access, and lift boxes.", notes: "Multiple Sunstream lift boxes exist and they are not all the same." },
  { id: "cobalt", name: "Cobalt", type: "Waterfront / Boat", summary: "Cobalt boat and associated lift area.", notes: "Newer Sunstream lift box is for the Cobalt lift." },
  { id: "seadoo", name: "Seadoo", type: "Waterfront / PWC", summary: "Sea-Doo area near dock.", notes: "Includes Sea-Doo service/repair records." },
  { id: "water-trampoline", name: "Water Trampoline", type: "Waterfront", summary: "Floating water trampoline area.", notes: "Seasonal anchor/inflation checks." },
  { id: "waterside-lawn-north", name: "Water Side Lawn (North)", type: "Grounds", summary: "North lawn along waterfront.", notes: "Separate from east lawn and sport court area." },
  { id: "east-lawn", name: "East Lawn", type: "Grounds", summary: "Large green lawn east/south of sport court.", notes: "Includes south end where veggie boxes sit." },
  { id: "sport-court", name: "Sport Court", type: "Recreation", summary: "Outdoor sport court.", notes: "Keep surface clean and inspect equipment." },
  { id: "veggie-boxes", name: "Veggie Boxes", type: "Grounds", summary: "Three vegetable/garden boxes at south end of east lawn.", notes: "Watering, weeding, seasonal planting." },
  { id: "new-garage", name: "New Garage", type: "Building", summary: "New garage / auto court garage area.", notes: "Includes golf simulator records." },
  { id: "old-garage", name: "Old Garage", type: "Building", summary: "Old garage near ADU and covered connection areas.", notes: "Storage and garage checks." },
  { id: "adu", name: "ADU", type: "Building", summary: "Small ADU building left of old garage / lower garage area.", notes: "Do not move this label to trampoline/dog area." },
  { id: "courtyard", name: "Courtyard", type: "Outdoor Living", summary: "Courtyard patio with chairs/fire-pit, left of gray covered walkway.", notes: "Do not label the gray covered walkway itself." },
  { id: "trampoline-dog", name: "Trampoline/Dog", type: "Grounds", summary: "Separate trampoline/dog area.", notes: "Separate from courtyard." },
  { id: "original-house", name: "Original House", type: "Building", summary: "Original/main house structure.", notes: "Main interior and original-house zones." },
  { id: "addition", name: "Addition", type: "Building", summary: "Addition wing including indoor pool area.", notes: "Includes indoor pool construction history." },
  { id: "hot-tub-sundance", name: "Hot Tub (Sundance)", type: "Spa", summary: "Standalone Sundance Optima spa/hot tub.", notes: "Not part of indoor pool controls." },
  { id: "mechanical-room", name: "Mechanical Room", type: "Systems", summary: "Boiler, hydronic, DHW, pool heat, pumps, and controls.", notes: "Viessmann boiler system, DHW tanks, Desert Aire tie-ins." },
  { id: "indoor-pool", name: "Indoor Pool", type: "Pool", summary: "Indoor pool and associated equipment path.", notes: "Pool water path and dehumidification records live here." },
  { id: "pool-equipment", name: "Pool Equipment", type: "Pool Systems", summary: "Pentair pump, Triton II sand filter, UV2, pool valves, and pool equipment.", notes: "Backwash by pressure rise rule, not random schedule only." },
  { id: "irrigation", name: "Irrigation / Lake Pump Station", type: "Grounds Systems", summary: "Irrigation pump station and Hunter controllers.", notes: "Advanced Irrigation used for activate/deactivate irrigation." },
  { id: "kitchen", name: "Kitchen", type: "Interior", summary: "Kitchen equipment and appliance records.", notes: "Wolf range duplicate naming should be cleaned up." },
  { id: "basement", name: "Basement", type: "Interior", summary: "Basement rooms and system access.", notes: "Can be expanded with basement walkthrough map later." },
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
  { id: "psf-mechanical", name: "P.S.F / PSF Mechanical", category: "HVAC / Mechanical", notes: "HVAC, boiler, hydronic, Desert Aire, and mechanical vendor reference. Contacts noted: Mark Templeton and Luiz Vasquez.", phone: "", email: "" },
  { id: "penthouse-drapery", name: "Penthouse Drapery", category: "Drapery / Roller Shades", phone: "206-292-8336", email: "accounting@penthousedrapery.com", address: "4033 16th Ave SW Suite A, Seattle, WA 98106", notes: "Invoice #176396 dated 06/16/2026. Motorized roller shade repair linked to Blinds Lutron asset." },
  { id: "advanced-irrigation", name: "Advanced Irrigation", category: "Irrigation", notes: "Used to activate/deactivate irrigation. Linked to irrigation lake water pump station and Hunter controllers." },
  { id: "unrivaled", name: "Unrivaled", category: "Pest Control", notes: "Active pest control vendor. Terminix canceled/inactive." },
  { id: "seattle-boat", name: "Seattle Boat", category: "Boat Service", notes: "Cobalt winterization, de-winterization, repair, and service." },
  { id: "sunstream", name: "Sunstream", category: "Boat Lift Equipment", notes: "Lift boxes, controls, batteries, solar panels, lift components." },
  { id: "oryan-marine", name: "O'Ryan Marine", category: "Marine", notes: "Marine/vendor record from prior vendor import." },
  { id: "seadoo-service", name: "Seadoo Service", category: "PWC Service", notes: "Sea-Doo service and repair records." },
  { id: "i90-motorsports", name: "I90 Motorsports", category: "Motorsports", notes: "Powersports / Sea-Doo related vendor record." },
  { id: "aqua-quip", name: "Aqua Quip", category: "Pool / Spa", notes: "Pool/spa supplies or service vendor record." },
  { id: "krisco-pool-spas", name: "Krisco Pool and Spas", category: "Pool / Spa", notes: "Pool/spa vendor record." },
  { id: "northern-waters", name: "Northern Waters", category: "Water / Pool", notes: "Water/pool vendor record." },
  { id: "aqua-dive", name: "Aqua Dive", category: "Waterfront / Dive", notes: "Dive/waterfront vendor record." },
  { id: "best-plumbing", name: "Best Plumbing", category: "Plumbing", notes: "Plumbing vendor record." },
  { id: "american-leak-detection", name: "American Leak Detection", category: "Leak Detection", notes: "Leak detection vendor record." },
  { id: "maple-valley-electric", name: "Maple Valley Electric", category: "Electrical", notes: "Electrical vendor record." },
  { id: "pk-electric", name: "PK Electric", category: "Electrical", notes: "Electrical vendor record." },
  { id: "d-square-energy", name: "D Square Energy", category: "Energy / Electrical", notes: "Energy/electrical vendor record." },
  { id: "electromatic-refrigeration", name: "Electromatic Refrigeration", category: "Refrigeration", notes: "Refrigeration vendor record." },
  { id: "luwa", name: "LUWA", category: "Mechanical / HVAC", notes: "Mechanical/HVAC vendor record." },
  { id: "bosch", name: "Bosch", category: "Equipment Manufacturer", notes: "Equipment/manufacturer vendor record." },
  { id: "high-tech-living", name: "High Tech Living", category: "Smart Home / AV", notes: "Smart home / AV systems vendor record." },
  { id: "washington-outdoor-lighting", name: "Washington Outdoor Lighting", category: "Lighting", notes: "Outdoor lighting vendor record." },
  { id: "cascade-spray", name: "Cascade Spray", category: "Grounds / Spray", notes: "Grounds/spray vendor record." },
  { id: "soil-science", name: "Soil Science", category: "Grounds / Soil", notes: "Grounds/soil vendor record." },
  { id: "invisible-fence", name: "Invisible Fence", category: "Pet / Fence", notes: "Dog/fence vendor record." },
  { id: "elliott-paint", name: "Elliott Paint Company", category: "Paint", notes: "Paint vendor. Brandon Ness noted in project communications." },
  { id: "seattle-painting-specialists", name: "Seattle Painting Specialists", category: "Paint", notes: "Painting vendor record." },
  { id: "sound-roofing", name: "Sound Roofing Services", category: "Roofing", notes: "Roofing vendor record." },
  { id: "consolidated-gutter", name: "Consolidated Gutter & Sheet Metal", category: "Gutters / Sheet Metal", notes: "Gutter and sheet metal vendor record." },
  { id: "all-pro-blinds", name: "All Pro Blinds", category: "Blinds / Shades", notes: "Blinds/shades vendor record." },
  { id: "windows-plus", name: "Windows Plus", category: "Windows", notes: "Window vendor record." },
  { id: "roxy-glass", name: "Roxy Glass", category: "Glass", notes: "Glass vendor record." },
  { id: "andersen-installation", name: "Andersen Installation Inc.", category: "Windows / Doors", notes: "Andersen installation vendor record." },
  { id: "precision-garage-door", name: "Precision Garage Door", category: "Garage Doors", notes: "Garage door vendor record." },
  { id: "shaw-elevator", name: "Shaw Elevator", category: "Elevator", notes: "Elevator vendor record." },
  { id: "aaa-fire", name: "AAA Fire", category: "Fire Safety", notes: "Fire/safety vendor record." },
  { id: "appliance-service-station", name: "Appliance Service Station", category: "Appliances", notes: "Appliance service vendor record." },
  { id: "old-world-handyman", name: "Old World Handyman", category: "Handyman", notes: "Handyman vendor record." },
  { id: "toth-construction", name: "Toth Construction", category: "Construction", notes: "Construction vendor record." },
  { id: "ridings-residential", name: "Ridings Residential Inc.", category: "Residential Contractor", notes: "Residential contractor vendor record." },
  { id: "peter-clark-designs", name: "Peter Clark Designs", category: "Design", notes: "Design vendor record." },
  { id: "david-getts-design", name: "David Getts Design", category: "Carpentry / Siding", notes: "Carpentry/siding repair scheduling notes." },
  { id: "greater-seattle-floors", name: "Greater Seattle Floors", category: "Flooring", notes: "Flooring vendor record." },
  { id: "north-west-custom-cabinets", name: "North West Custom Cabinets", category: "Cabinets", notes: "Cabinet vendor record." },
  { id: "home-depot", name: "Home Depot", category: "Supplies", notes: "Supply vendor record." },
  { id: "supply-house", name: "Supply House", category: "Parts / Supplies", notes: "Parts and supply vendor record." },
  { id: "les-schwab", name: "Les Schwab", category: "Vehicle / Tires", notes: "Vehicle/tire vendor record." },
  { id: "autonation-ford-bellevue", name: "AutoNation Ford Bellevue", category: "Vehicle Service", notes: "Ford/vehicle service vendor record." },
  { id: "da-burns", name: "D.A. Burns", category: "Cleaning / Rugs", notes: "Cleaning/rug vendor record." },
  { id: "seaborn-companies", name: "Seaborn Companies", category: "Service Agreement", notes: "Ted Burns. Service agreement executed through DocuSign." },
];

const defaultAssets: AssetRecord[] = [
  { id: "viessmann-boiler-1", name: "Viessmann Vitodens 200 Boiler 1", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", status: "Active", notes: "Boiler 1. Label notes secondary high limit inside. Year built visible as 2018.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "viessmann-boiler-2", name: "Viessmann Vitodens 200 Boiler 2", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", status: "Active", notes: "Boiler nameplate: year built 2025, MAWP 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, min relief valve capacity 255.9 lb/hr, CRN R1497.5C.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "guarddog-lwco", name: "McDonnell & Miller GuardDog LWCO", locationId: "mechanical-room", category: "Boiler Safety", make: "McDonnell & Miller", model: "751P-MT-120", status: "Active", notes: "Manual reset low-water cutoff with LED/test/reset behavior and CSD-1 relevance.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "vitocell-tanks", name: "Twin Viessmann Vitocell 300-V DHW Tanks", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "EVIA 300", status: "Active", notes: "Twin 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "desert-aire-dhu1", name: "Desert Aire DHU-1 Pool Dehumidification", locationId: "mechanical-room", category: "Pool HVAC / Dehumidification", make: "Desert Aire", model: "LC05R2WBDTDLAED", serial: "4217D25175", status: "Active", notes: "Pool dehumidification system with Desert Aire control/display and SR501 relay.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record", "systems-layout"] },
  { id: "pentair-pool-pump", name: "Pentair 3.0 HP Pool Pump", locationId: "pool-equipment", category: "Pool Pump", make: "Pentair", model: "3.0 HP", status: "Active", notes: "Pool water path starts at Pentair pump.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "triton-filter", name: "Pentair Triton II Sand Filter", locationId: "pool-equipment", category: "Pool Filter", make: "Pentair", model: "Triton II TR-140", status: "Active", notes: "Sand filter. Backwash by pressure rise rule.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "uv2", name: "UltraPure / Paramount UV2", locationId: "pool-equipment", category: "Pool UV", make: "UltraPure / Paramount", model: "UV2", status: "Active", notes: "UV unit in indoor pool water path.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "pool-manifold", name: "Pool Manifold Labels", locationId: "pool-equipment", category: "Pool Valves", status: "Active", notes: "Visible zone labels include South pool, East pool, and Pool bath.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "sundance-optima", name: "Sundance Optima Hot Tub", locationId: "hot-tub-sundance", category: "Spa", make: "Sundance", model: "880 Series Optima", serial: "00P3LCD-100528521-0315", status: "Active", notes: "Date 03/21/15. 240V. Standalone spa, not indoor pool controls.", vendorIds: ["aqua-quip", "krisco-pool-spas"], documentIds: ["sundance-record"] },
  { id: "sundance-clearray", name: "Sundance ClearRay UV-C", locationId: "hot-tub-sundance", category: "Spa Water Care", make: "Sundance / ClearRay", status: "Active", notes: "ClearRay UV-C water purification/ballast equipment.", vendorIds: ["aqua-quip"], documentIds: ["sundance-record"] },
  { id: "hydroquip-heater", name: "HydroQuip Water Pro Series Smart Heater Plus", locationId: "hot-tub-sundance", category: "Spa Heater", make: "HydroQuip", status: "Active", notes: "Titanium Inside label. High-limit and heater-on indicators visible.", vendorIds: ["aqua-quip"], documentIds: ["sundance-record"] },
  { id: "sunstream-cobalt", name: "Sunstream Lift Box - Cobalt", locationId: "cobalt", category: "Boat Lift", make: "Sunstream", status: "Active", notes: "Newer lift box for Cobalt. White enclosure with solar panel/battery/control wiring.", vendorIds: ["sunstream", "seattle-boat"], documentIds: ["sunstream-notes"] },
  { id: "sunstream-seadoo", name: "Sunstream Lift Box - Sea-Doo", locationId: "seadoo", category: "PWC Lift", make: "Sunstream", status: "Active", notes: "Sea-Doo lift/control box. Not all Sunstream boxes are the same.", vendorIds: ["sunstream", "seadoo-service"], documentIds: ["sunstream-notes"] },
  { id: "cobalt-boat", name: "Cobalt Boat", locationId: "cobalt", category: "Boat", make: "Cobalt", status: "Active", notes: "Seattle Boat handles winterization, de-winterization, repairs, and service.", vendorIds: ["seattle-boat", "oryan-marine"], documentIds: ["boat-fluid-analysis"] },
  { id: "seadoo", name: "Sea-Doo", locationId: "seadoo", category: "PWC", make: "Sea-Doo", status: "Active", notes: "Repair record exists after Luke's Sea-Doo repair from prior crash.", vendorIds: ["seadoo-service", "i90-motorsports"], documentIds: ["seadoo-repair"] },
  { id: "water-trampoline", name: "Water Trampoline", locationId: "water-trampoline", category: "Water Recreation", status: "Seasonal", notes: "Inspect anchors, inflation, and condition.", vendorIds: [], documentIds: [] },
  { id: "sport-court", name: "Sport Court", locationId: "sport-court", category: "Recreation", status: "Active", notes: "Court surface and equipment.", vendorIds: [], documentIds: [] },
  { id: "veggie-boxes", name: "Three Veggie Boxes", locationId: "veggie-boxes", category: "Grounds", status: "Active", notes: "Three boxes at south end of east lawn.", vendorIds: ["advanced-irrigation"], documentIds: [] },
  { id: "hunter-controllers", name: "Hunter Irrigation Controllers", locationId: "irrigation", category: "Irrigation", make: "Hunter", status: "Active", notes: "Two Hunter irrigation controllers linked to irrigation/lake pump station.", vendorIds: ["advanced-irrigation"], documentIds: [] },
  { id: "golf-simulator", name: "Golf Simulator", locationId: "new-garage", category: "Recreation / AV", status: "Active", notes: "Garage golf simulator clean/inspect recurring task.", vendorIds: ["high-tech-living"], documentIds: [] },
  { id: "blinds-lutron", name: "Blinds Lutron / Motorized Roller Shade", locationId: "original-house", category: "Shades", make: "Lutron", status: "Active", notes: "Penthouse Drapery invoice #176396 linked here.", vendorIds: ["penthouse-drapery", "all-pro-blinds"], documentIds: ["penthouse-invoice"] },
  { id: "carrier-hvac", name: "Carrier Forced-Air HVAC", locationId: "mechanical-room", category: "HVAC", make: "Carrier", status: "Active", notes: "Forced-air system with Honeywell HZ432 zones.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "honeywell-hz432", name: "Honeywell HZ432 Zone Panel", locationId: "mechanical-room", category: "HVAC Controls", make: "Honeywell", model: "HZ432", status: "Active", notes: "Zones include Nanny/Gym-Nanny, Bonus/Play Room, Kitchen, Exercise.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "wolf-range", name: "Wolf Range", locationId: "kitchen", category: "Appliance", make: "Wolf", status: "Active", notes: "Duplicate naming exists from prior records: wolfe range / Range-Wolf should be normalized.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "main-hallway-artwork", name: "Main Hallway Artwork", locationId: "original-house", category: "Interior / Artwork", status: "Monitor", notes: "Recurring condition check.", vendorIds: [], documentIds: [] },
  { id: "guardian-statues", name: "Guardian Statues", locationId: "original-house", category: "Exterior / Decor", status: "Monitor", notes: "Recurring condition check.", vendorIds: [], documentIds: [] },
];

const defaultDocuments: DocumentRecord[] = [
  { id: "systems-layout", title: "2000 Systems Layout Draft v1", type: "Diagram / PDF", linkedTo: "mechanical-room", notes: "Main mechanical/electrical/pool/HVAC systems layout draft. Add PDF to public/documents later for direct click-through.", href: "" },
  { id: "pool-record", title: "2000 Pool Equipment Record v2 Corrected", type: "PDF / Equipment Record", linkedTo: "pool-equipment", notes: "Indoor pool equipment path, Desert Aire, pump/filter/UV records.", href: "" },
  { id: "sundance-record", title: "2000 Standalone Sundance Spa Record v1", type: "PDF / Asset Record", linkedTo: "hot-tub-sundance", notes: "Sundance Optima nameplate, electrical, ClearRay, HydroQuip heater, control details.", href: "" },
  { id: "weekly-routine", title: "2000 Weekly Routine Schedule", type: "PDF / Schedule", linkedTo: "calendar", notes: "Weekly routine schedule and maintenance cadence.", href: "" },
  { id: "penthouse-invoice", title: "Penthouse Drapery Invoice #176396", type: "Invoice", linkedTo: "blinds-lutron", notes: "Dated 06/16/2026. Repair one motorized roller shade; two trips and replacement roller shade drive.", href: "" },
  { id: "sunstream-notes", title: "Sunstream Lift Box Photo Notes", type: "Photo Set / Notes", linkedTo: "dock", notes: "Multiple Sunstream lift boxes; newer box for Cobalt; white boxes with solar/battery/control wiring.", href: "" },
  { id: "seadoo-repair", title: "Sea-Doo Repair Invoice / Photos", type: "Invoice / Photos", linkedTo: "seadoo", notes: "After repairs to Luke's Sea-Doo.", href: "" },
  { id: "boat-fluid-analysis", title: "Boat S.O.S. Fluid Analysis", type: "Report / Photo", linkedTo: "cobalt-boat", notes: "Older boat fluid analysis report from possible kids' boat purchase context.", href: "" },
  { id: "indoor-pool-construction", title: "Indoor Pool Construction Photo", type: "Photo", linkedTo: "addition", notes: "First floor of addition. Concrete pool shell/trench area and construction work in progress.", href: "" },
  { id: "property-map", title: "Locked Atlas Property Map", type: "Image", linkedTo: "map", notes: "Current fixed map image used at /atlas-property-map.png.", href: "/atlas-property-map.png" },
  { id: "redacted-credential-inventory", title: "Redacted Credential Inventory", type: "Admin Note", linkedTo: "documents", notes: "Categories only. Do not store raw passwords, passcodes, PINs, emails, or private codes in normal app data.", href: "" },
];

const defaultProcedures: ProcedureRecord[] = [
  { id: "sunstream-lift-box", title: "Sunstream Lift Box Inspection", locationId: "dock", assetId: "sunstream-cobalt", frequency: "Weekly / after storms", steps: ["Confirm correct lift box for Cobalt vs Sea-Doo.", "Check solar panel condition.", "Check battery/control wiring visually.", "Test up/down controls only when safe.", "Log issues with photo."] },
  { id: "boat-cleaned-tuesday", title: "Boat Cleaned Tuesday", locationId: "cobalt", assetId: "cobalt-boat", frequency: "Tuesday", steps: ["Check boat cover.", "Clean surfaces.", "Check lines and bumpers.", "Confirm lift position.", "Add photo if anything looks off."] },
  { id: "cobalt-dewinterize", title: "Cobalt Boat De-Winterization", locationId: "cobalt", assetId: "cobalt-boat", frequency: "Seasonal", steps: ["Schedule with Seattle Boat.", "Confirm batteries, fluids, and safety gear.", "Verify lift function.", "Log completed service."] },
  { id: "cobalt-service", title: "Cobalt Boat Repair / Service", locationId: "cobalt", assetId: "cobalt-boat", frequency: "As needed", steps: ["Document issue with photos.", "Contact Seattle Boat.", "Attach invoice/service notes.", "Update asset status."] },
  { id: "seadoo-check", title: "Sea-Doo Post-Use Check", locationId: "seadoo", assetId: "seadoo", frequency: "After use", steps: ["Check damage.", "Check lift/secure position.", "Check fuel/cap.", "Rinse as needed.", "Log any issue."] },
  { id: "pool-test", title: "Indoor Pool Testing", locationId: "pool-equipment", assetId: "pentair-pool-pump", frequency: "Regular cadence", steps: ["Test pool chemistry.", "Record results.", "Check equipment room for leaks/noise.", "Add photo if readings or equipment look wrong."] },
  { id: "pool-backwash", title: "Pool Sand Filter Backwash Rule", locationId: "pool-equipment", assetId: "triton-filter", frequency: "By pressure rise", steps: ["Record clean starting pressure.", "Backwash when pressure rises meaningfully above clean pressure.", "Do not backwash only because of calendar date.", "Rinse after backwash.", "Log pressure before/after."] },
  { id: "clearray-bulb", title: "ClearRay Bulb Work Order", locationId: "hot-tub-sundance", assetId: "sundance-clearray", frequency: "As needed / annual", steps: ["Turn off power safely.", "Inspect ClearRay unit.", "Replace bulb per manual.", "Confirm operation.", "Log date."] },
  { id: "spa-water-filter", title: "Spa Water / Filter Cadence", locationId: "hot-tub-sundance", assetId: "sundance-optima", frequency: "Weekly / as needed", steps: ["Check water level.", "Test chemistry.", "Inspect filter.", "Clean/replace as needed.", "Check for corrosion or leaks."] },
  { id: "spa-inspection", title: "Spa Maintenance Completed", locationId: "hot-tub-sundance", assetId: "sundance-optima", frequency: "Recurring", steps: ["Inspect control bay.", "Check heater indicators.", "Check ClearRay.", "Check screws/cabinet for rust/corrosion.", "Add photo log."] },
  { id: "golf-sim-clean", title: "Golf Simulator Clean / Inspect", locationId: "new-garage", assetId: "golf-simulator", frequency: "Weekly", steps: ["Clean simulator area.", "Check screen/sensors.", "Check floor condition.", "Log issues."] },
  { id: "artwork-check", title: "Main Hallway Artwork Condition Check", locationId: "original-house", assetId: "main-hallway-artwork", frequency: "Monthly", steps: ["Inspect artwork.", "Check wall/lighting.", "Photograph damage.", "Log condition."] },
  { id: "guardian-statues", title: "Guardian Statues Condition Check", locationId: "original-house", assetId: "guardian-statues", frequency: "Monthly", steps: ["Inspect statues.", "Check staining/damage.", "Photograph condition.", "Log work needed."] },
  { id: "irrigation-startup", title: "Irrigation Activate / Deactivate", locationId: "irrigation", assetId: "hunter-controllers", frequency: "Seasonal", steps: ["Coordinate with Advanced Irrigation.", "Confirm lake pump station status.", "Check Hunter controllers.", "Log startup/shutdown date."] },
  { id: "courtyard-reset", title: "Courtyard Reset", locationId: "courtyard", frequency: "As needed", steps: ["Clean seating area.", "Check fire pit.", "Straighten chairs.", "Check lights/planters.", "Add note if anything is broken."] },
  { id: "dog-cleanup", title: "Trampoline/Dog Area Cleanup", locationId: "trampoline-dog", frequency: "Routine", steps: ["Clean dog area.", "Inspect trampoline area.", "Check turf/grass condition.", "Log issues."] },
  { id: "out-of-town", title: "2000 Out of Town Procedure", locationId: "original-house", frequency: "When owners are away", steps: ["Check inside list.", "Check outside list.", "Verify water/doors/lights.", "Check systems dashboard.", "Log daily notes."] },
];

const defaultCalendar: CalendarEvent[] = [
  { id: "cal-boat-tuesday", date: todayISO(), title: "Boat cleaned Tuesday", locationId: "cobalt", assetId: "cobalt-boat", notes: "Recurring boat cleaning/check." },
  { id: "cal-spa", date: todayISO(), title: "Spa water/filter check", locationId: "hot-tub-sundance", assetId: "sundance-optima", notes: "Check Sundance spa water and filter." },
  { id: "cal-pool", date: todayISO(), title: "Pool chemistry and equipment check", locationId: "pool-equipment", assetId: "pentair-pool-pump", notes: "Record readings and inspect equipment." },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `id-${Date.now()}`;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [labels, setLabels] = useState<MapLabel[]>(defaultLabels);
  const [locations, setLocations] = useState<LocationRecord[]>(defaultLocations);
  const [assets, setAssets] = useState<AssetRecord[]>(defaultAssets);
  const [vendors, setVendors] = useState<VendorRecord[]>(defaultVendors);
  const [procedures, setProcedures] = useState<ProcedureRecord[]>(defaultProcedures);
  const [documents, setDocuments] = useState<DocumentRecord[]>(defaultDocuments);
  const [media, setMedia] = useState<AtlasMedia[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>(defaultCalendar);
  const [selectedLocationId, setSelectedLocationId] = useState("courtyard");
  const [selectedAssetId, setSelectedAssetId] = useState("sundance-optima");
  const [selectedVendorId, setSelectedVendorId] = useState("psf-mechanical");
  const [selectedProcedureId, setSelectedProcedureId] = useState("pool-backwash");
  const [selectedDocumentId, setSelectedDocumentId] = useState("systems-layout");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLabels(loadStored(LABEL_KEY, defaultLabels));
    setLocations(loadStored(LOCATION_KEY, defaultLocations));
    setAssets(loadStored(ASSET_KEY, defaultAssets));
    setVendors(loadStored(VENDOR_KEY, defaultVendors));
    setProcedures(loadStored(PROCEDURE_KEY, defaultProcedures));
    setDocuments(loadStored(DOCUMENT_KEY, defaultDocuments));
    setMedia(loadStored(MEDIA_KEY, []));
    setCalendar(loadStored(CALENDAR_KEY, defaultCalendar));
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveStored(LABEL_KEY, labels); }, [labels, loaded]);
  useEffect(() => { if (loaded) saveStored(LOCATION_KEY, locations); }, [locations, loaded]);
  useEffect(() => { if (loaded) saveStored(ASSET_KEY, assets); }, [assets, loaded]);
  useEffect(() => { if (loaded) saveStored(VENDOR_KEY, vendors); }, [vendors, loaded]);
  useEffect(() => { if (loaded) saveStored(PROCEDURE_KEY, procedures); }, [procedures, loaded]);
  useEffect(() => { if (loaded) saveStored(DOCUMENT_KEY, documents); }, [documents, loaded]);
  useEffect(() => { if (loaded) saveStored(MEDIA_KEY, media); }, [media, loaded]);
  useEffect(() => { if (loaded) saveStored(CALENDAR_KEY, calendar); }, [calendar, loaded]);

  const selectedLocation = locations.find((x) => x.id === selectedLocationId) || locations[0];
  const selectedAsset = assets.find((x) => x.id === selectedAssetId) || assets[0];
  const selectedVendor = vendors.find((x) => x.id === selectedVendorId) || vendors[0];
  const selectedProcedure = procedures.find((x) => x.id === selectedProcedureId) || procedures[0];
  const selectedDocument = documents.find((x) => x.id === selectedDocumentId) || documents[0];

  function openLocation(id: string) {
    setSelectedLocationId(id);
    setScreen("locations");
  }

  function attachMedia(item: AtlasMedia) {
    setMedia((current) => [item, ...current]);
  }

  function updateLocation(id: string, patch: Partial<LocationRecord>) {
    setLocations((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateAsset(id: string, patch: Partial<AssetRecord>) {
    setAssets((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateVendor(id: string, patch: Partial<VendorRecord>) {
    setVendors((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateProcedure(id: string, patch: Partial<ProcedureRecord>) {
    setProcedures((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateDocument(id: string, patch: Partial<DocumentRecord>) {
    setDocuments((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  const shared = {
    locations,
    assets,
    vendors,
    procedures,
    documents,
    media,
    calendar,
    setCalendar,
    attachMedia,
    openLocation,
  };

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
          <strong>Atlas Base v2</strong>
          <span>Dashboard kept. Map added as editable section.</span>
        </div>
      </aside>

      <section className="content">
        {screen === "dashboard" && <DashboardView setScreen={setScreen} {...shared} />}
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
            updateLocation={updateLocation}
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
            updateAsset={updateAsset}
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
            updateVendor={updateVendor}
            assets={assets}
            media={media}
            attachMedia={attachMedia}
          />
        )}
        {screen === "calendar" && (
          <CalendarView
            calendar={calendar}
            setCalendar={setCalendar}
            locations={locations}
            assets={assets}
          />
        )}
        {screen === "weather" && <WeatherView large />}
        {screen === "documents" && (
          <DocumentsView
            documents={documents}
            selected={selectedDocument}
            setSelectedDocumentId={setSelectedDocumentId}
            updateDocument={updateDocument}
            media={media}
            attachMedia={attachMedia}
          />
        )}
        {screen === "procedures" && (
          <ProceduresView
            procedures={procedures}
            selected={selectedProcedure}
            setSelectedProcedureId={setSelectedProcedureId}
            updateProcedure={updateProcedure}
            locations={locations}
            assets={assets}
            media={media}
            attachMedia={attachMedia}
          />
        )}
        {screen === "logs" && <LogsView media={media} setMedia={setMedia} locations={locations} assets={assets} />}
        {screen === "assistant" && (
          <AssistantView
            locations={locations}
            assets={assets}
            vendors={vendors}
            procedures={procedures}
            documents={documents}
            media={media}
            attachMedia={attachMedia}
          />
        )}
        {screen === "team" && <TeamView />}
      </section>

      <AppStyles />
    </main>
  );
}

function AtlasLogo() {
  return (
    <div className="atlas-logo" aria-label="Atlas logo">
      <svg viewBox="0 0 80 80" role="img">
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

function DashboardView(props: any) {
  const todayEvents = props.calendar.filter((event: CalendarEvent) => event.date === todayISO()).slice(0, 5);
  return (
    <>
      <Header title="Atlas Dashboard" subtitle="Private 2000 estate operations control center." />
      <div className="stat-grid">
        <Stat title="Locations" value={props.locations.length} note="Clickable and editable" />
        <Stat title="Assets" value={props.assets.length} note="QR tags attached" />
        <Stat title="Vendors" value={props.vendors.length} note="Business-card and service records" />
        <Stat title="Media / Notes" value={props.media.length} note="Photos, comments, voice notes" />
      </div>

      <div className="dashboard-grid">
        <section className="card wide">
          <div className="card-title-row">
            <div>
              <h2>Clickable Property Map</h2>
              <p>Locked map image. Editable labels only. Nothing on the actual map moves.</p>
            </div>
            <button className="button primary" onClick={() => props.setScreen("map")}>Open Map</button>
          </div>
          <div className="map-preview" onClick={() => props.setScreen("map")}>
            <img src="/atlas-property-map.png" alt="Atlas 2000 property map preview" />
            <span>Open editable map section</span>
          </div>
        </section>

        <section className="card">
          <h2>Today</h2>
          {todayEvents.length ? todayEvents.map((event: CalendarEvent) => (
            <div className="mini-row" key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.notes}</span>
            </div>
          )) : <p className="muted">No calendar items for today.</p>}
        </section>

        <WeatherView />

        <section className="card">
          <h2>Priority Records</h2>
          {["Sundance Optima spa", "Desert Aire DHU-1", "Sunstream lift boxes", "Penthouse Drapery invoice", "Pool sand filter backwash rule"].map((x) => (
            <div className="pill-row" key={x}>{x}</div>
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
}: any) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const selectedLabel = labels.find((label: MapLabel) => label.locationId === selectedLocationId) || labels[0];
  const selectedLocation = locations.find((loc: LocationRecord) => loc.id === selectedLabel.locationId) || locations[0];
  const relatedAssets = assets.filter((asset: AssetRecord) => asset.locationId === selectedLocation.id);
  const relatedProcedures = procedures.filter((procedure: ProcedureRecord) => procedure.locationId === selectedLocation.id);

  function updateLabel(id: string, patch: Partial<MapLabel>) {
    setLabels((rows: MapLabel[]) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
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
    const loc = locations[0];
    const next: MapLabel = {
      id: `label-${Date.now()}`,
      name: "New Label",
      x: 50,
      y: 50,
      locationId: loc.id,
    };
    setLabels((rows: MapLabel[]) => [...rows, next]);
    setSelectedLocationId(loc.id);
    setEditMode(true);
  }

  function removeLabel(id: string) {
    setLabels((rows: MapLabel[]) => rows.filter((row) => row.id !== id));
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
            {labels.map((label: MapLabel) => (
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
                  {locations.map((loc: LocationRecord) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </label>
              <div className="split">
                <label>X %<input type="number" value={selectedLabel.x} onChange={(e) => updateLabel(selectedLabel.id, { x: clamp(Number(e.target.value)) })} /></label>
                <label>Y %<input type="number" value={selectedLabel.y} onChange={(e) => updateLabel(selectedLabel.id, { y: clamp(Number(e.target.value)) })} /></label>
              </div>
              <button className="button danger full" onClick={() => removeLabel(selectedLabel.id)}>Remove Label</button>
            </div>
          )}

          <MiniList title="Assets Here" items={relatedAssets.map((a: AssetRecord) => a.name)} />
          <MiniList title="Procedures Here" items={relatedProcedures.map((p: ProcedureRecord) => p.title)} />

          <MediaTools
            targetType="location"
            targetId={selectedLocation.id}
            media={media}
            attachMedia={attachMedia}
          />
        </aside>
      </div>
    </>
  );
}

function LocationsView({ locations, selected, setSelectedLocationId, updateLocation, assets, procedures, media, attachMedia }: any) {
  const [edit, setEdit] = useState(false);
  const relatedAssets = assets.filter((a: AssetRecord) => a.locationId === selected.id);
  const relatedProcedures = procedures.filter((p: ProcedureRecord) => p.locationId === selected.id);

  return (
    <>
      <Header title="Locations" subtitle="All 2000 locations are listed, clickable, and editable.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Location"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={locations} selectedId={selected.id} onSelect={setSelectedLocationId} />
        <section className="card detail-panel">
          <div className="section-kicker">{selected.type}</div>
          {edit ? (
            <>
              <label>Name<input value={selected.name} onChange={(e) => updateLocation(selected.id, { name: e.target.value })} /></label>
              <label>Type<input value={selected.type} onChange={(e) => updateLocation(selected.id, { type: e.target.value })} /></label>
              <label>Summary<textarea value={selected.summary} onChange={(e) => updateLocation(selected.id, { summary: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => updateLocation(selected.id, { notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <h2>{selected.name}</h2>
              <p>{selected.summary}</p>
              <p className="muted">{selected.notes}</p>
            </>
          )}
          <QRTag type="location" id={selected.id} label={selected.name} />
          <MiniList title="Linked Assets" items={relatedAssets.map((x: AssetRecord) => x.name)} />
          <MiniList title="Linked Procedures" items={relatedProcedures.map((x: ProcedureRecord) => x.title)} />
          <MediaTools targetType="location" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function AssetsView({ assets, selected, setSelectedAssetId, updateAsset, locations, vendors, documents, media, attachMedia }: any) {
  const [edit, setEdit] = useState(false);
  const location = locations.find((x: LocationRecord) => x.id === selected.locationId);
  const linkedVendors = vendors.filter((v: VendorRecord) => selected.vendorIds.includes(v.id));
  const linkedDocs = documents.filter((d: DocumentRecord) => selected.documentIds.includes(d.id));

  return (
    <>
      <Header title="Assets" subtitle="Equipment, systems, property items, QR tags, photos, notes, and documents.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Asset"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={assets} selectedId={selected.id} onSelect={setSelectedAssetId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Name<input value={selected.name} onChange={(e) => updateAsset(selected.id, { name: e.target.value })} /></label>
              <label>Category<input value={selected.category} onChange={(e) => updateAsset(selected.id, { category: e.target.value })} /></label>
              <label>Location
                <select value={selected.locationId} onChange={(e) => updateAsset(selected.id, { locationId: e.target.value })}>
                  {locations.map((loc: LocationRecord) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </label>
              <div className="split">
                <label>Make<input value={selected.make || ""} onChange={(e) => updateAsset(selected.id, { make: e.target.value })} /></label>
                <label>Model<input value={selected.model || ""} onChange={(e) => updateAsset(selected.id, { model: e.target.value })} /></label>
              </div>
              <label>Serial<input value={selected.serial || ""} onChange={(e) => updateAsset(selected.id, { serial: e.target.value })} /></label>
              <label>Status<input value={selected.status} onChange={(e) => updateAsset(selected.id, { status: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => updateAsset(selected.id, { notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.category}</div>
              <h2>{selected.name}</h2>
              <p><strong>Location:</strong> {location?.name || selected.locationId}</p>
              <p><strong>Status:</strong> {selected.status}</p>
              <p className="muted">{selected.notes}</p>
              <div className="info-grid">
                <span>Make: <strong>{selected.make || "—"}</strong></span>
                <span>Model: <strong>{selected.model || "—"}</strong></span>
                <span>Serial: <strong>{selected.serial || "—"}</strong></span>
              </div>
            </>
          )}
          <QRTag type="asset" id={selected.id} label={selected.name} />
          <MiniList title="Linked Vendors" items={linkedVendors.map((v: VendorRecord) => v.name)} />
          <MiniList title="Linked Documents / Diagrams" items={linkedDocs.map((d: DocumentRecord) => d.title)} />
          <MediaTools targetType="asset" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function VendorsView({ vendors, selected, setSelectedVendorId, updateVendor, assets, media, attachMedia }: any) {
  const [edit, setEdit] = useState(false);
  const linkedAssets = assets.filter((asset: AssetRecord) => asset.vendorIds.includes(selected.id));

  return (
    <>
      <Header title="Vendors" subtitle="Seeded vendor directory from records, invoices, and business-card notes.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Vendor"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={vendors} selectedId={selected.id} onSelect={setSelectedVendorId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Name<input value={selected.name} onChange={(e) => updateVendor(selected.id, { name: e.target.value })} /></label>
              <label>Category<input value={selected.category} onChange={(e) => updateVendor(selected.id, { category: e.target.value })} /></label>
              <label>Phone<input value={selected.phone || ""} onChange={(e) => updateVendor(selected.id, { phone: e.target.value })} /></label>
              <label>Email<input value={selected.email || ""} onChange={(e) => updateVendor(selected.id, { email: e.target.value })} /></label>
              <label>Address<input value={selected.address || ""} onChange={(e) => updateVendor(selected.id, { address: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => updateVendor(selected.id, { notes: e.target.value })} /></label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.category}</div>
              <h2>{selected.name}</h2>
              <p>{selected.phone || "No phone saved yet"}</p>
              <p>{selected.email || "No email saved yet"}</p>
              {selected.address && <p>{selected.address}</p>}
              <p className="muted">{selected.notes}</p>
            </>
          )}
          <QRTag type="vendor" id={selected.id} label={selected.name} />
          <MiniList title="Linked Assets" items={linkedAssets.map((a: AssetRecord) => a.name)} />
          <MediaTools targetType="vendor" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function ProceduresView({ procedures, selected, setSelectedProcedureId, updateProcedure, locations, assets, media, attachMedia }: any) {
  const [edit, setEdit] = useState(false);
  const location = locations.find((x: LocationRecord) => x.id === selected.locationId);
  const asset = assets.find((x: AssetRecord) => x.id === selected.assetId);

  return (
    <>
      <Header title="Procedures" subtitle="Procedures are clickable, editable, and linked to locations/assets.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Procedure"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={procedures.map((p: ProcedureRecord) => ({ ...p, name: p.title }))} selectedId={selected.id} onSelect={setSelectedProcedureId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Title<input value={selected.title} onChange={(e) => updateProcedure(selected.id, { title: e.target.value })} /></label>
              <label>Frequency<input value={selected.frequency} onChange={(e) => updateProcedure(selected.id, { frequency: e.target.value })} /></label>
              <label>Location
                <select value={selected.locationId} onChange={(e) => updateProcedure(selected.id, { locationId: e.target.value })}>
                  {locations.map((loc: LocationRecord) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </label>
              <label>Asset
                <select value={selected.assetId || ""} onChange={(e) => updateProcedure(selected.id, { assetId: e.target.value || undefined })}>
                  <option value="">No asset</option>
                  {assets.map((assetRow: AssetRecord) => <option key={assetRow.id} value={assetRow.id}>{assetRow.name}</option>)}
                </select>
              </label>
              <label>Steps, one per line
                <textarea
                  value={selected.steps.join("\n")}
                  onChange={(e) => updateProcedure(selected.id, { steps: e.target.value.split("\n").filter(Boolean) })}
                />
              </label>
            </>
          ) : (
            <>
              <div className="section-kicker">{selected.frequency}</div>
              <h2>{selected.title}</h2>
              <p><strong>Location:</strong> {location?.name || selected.locationId}</p>
              <p><strong>Asset:</strong> {asset?.name || "—"}</p>
              <ol className="steps">{selected.steps.map((step: string) => <li key={step}>{step}</li>)}</ol>
            </>
          )}
          <QRTag type="procedure" id={selected.id} label={selected.title} />
          <MediaTools targetType="procedure" targetId={selected.id} media={media} attachMedia={attachMedia} />
        </section>
      </div>
    </>
  );
}

function DocumentsView({ documents, selected, setSelectedDocumentId, updateDocument, media, attachMedia }: any) {
  const [edit, setEdit] = useState(false);
  return (
    <>
      <Header title="Documents & Diagrams" subtitle="Diagrams, PDFs, invoices, manuals, photo records, and document placeholders.">
        <button className={edit ? "button primary" : "button"} onClick={() => setEdit(!edit)}>{edit ? "Done Editing" : "Edit Document"}</button>
      </Header>
      <div className="two-col">
        <RecordList records={documents} selectedId={selected.id} onSelect={setSelectedDocumentId} />
        <section className="card detail-panel">
          {edit ? (
            <>
              <label>Title<input value={selected.title} onChange={(e) => updateDocument(selected.id, { title: e.target.value })} /></label>
              <label>Type<input value={selected.type} onChange={(e) => updateDocument(selected.id, { type: e.target.value })} /></label>
              <label>Linked To<input value={selected.linkedTo} onChange={(e) => updateDocument(selected.id, { linkedTo: e.target.value })} /></label>
              <label>File URL / public path<input value={selected.href || ""} onChange={(e) => updateDocument(selected.id, { href: e.target.value })} /></label>
              <label>Notes<textarea value={selected.notes} onChange={(e) => updateDocument(selected.id, { notes: e.target.value })} /></label>
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

function CalendarView({ calendar, setCalendar, locations, assets }: any) {
  const [activeDate, setActiveDate] = useState(todayISO());
  const events = calendar.filter((event: CalendarEvent) => event.date === activeDate);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  function addEvent() {
    if (!title.trim()) return;
    setCalendar((rows: CalendarEvent[]) => [
      ...rows,
      { id: `cal-${Date.now()}`, date: activeDate, title, notes, locationId: locations[0]?.id, assetId: assets[0]?.id },
    ]);
    setTitle("");
    setNotes("");
  }

  function removeEvent(id: string) {
    setCalendar((rows: CalendarEvent[]) => rows.filter((row) => row.id !== id));
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
          {events.map((event: CalendarEvent) => (
            <div className="mini-row" key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.notes}</span>
              <button className="small danger-text" onClick={() => removeEvent(event.id)}>Remove</button>
            </div>
          ))}
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

function WeatherView({ large = false }: { large?: boolean }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=47.57&longitude=-122.22&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto")
      .then((res) => res.json())
      .then((data) => {
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          precip: data.current.precipitation,
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          updatedAt: data.current.time,
        });
      })
      .catch(() => setError("Weather unavailable right now."));
  }, []);

  const body = (
    <>
      <h2>Weather</h2>
      <p className="muted">2000 / Mercer Island area</p>
      {weather ? (
        <div className="weather-big">
          <strong>{weather.temperature}°F</strong>
          <span>High {weather.high}° / Low {weather.low}°</span>
          <span>Wind {weather.wind} mph · Humidity {weather.humidity}%</span>
          <span>Precip {weather.precip ?? 0} in</span>
        </div>
      ) : <p className="muted">{error || "Loading weather..."}</p>}
    </>
  );

  if (large) return <><Header title="Weather" subtitle="Live weather panel for exterior work planning." /><section className="card">{body}</section></>;
  return <section className="card">{body}</section>;
}

function LogsView({ media, setMedia, locations, assets }: any) {
  const comments = media.filter((m: AtlasMedia) => m.kind === "comment");
  return (
    <>
      <Header title="Logs" subtitle="Comments, photos, voice notes, and field notes saved in this browser." />
      <section className="card">
        {media.length ? media.map((item: AtlasMedia) => (
          <div className="log-row" key={item.id}>
            <strong>{item.title}</strong>
            <span>{item.kind} · {new Date(item.createdAt).toLocaleString()}</span>
            {item.text && <p>{item.text}</p>}
            {item.dataUrl && item.kind === "photo" && <img className="log-photo" src={item.dataUrl} alt={item.title} />}
            {item.dataUrl && item.kind === "voice" && <audio controls src={item.dataUrl} />}
            <button className="small danger-text" onClick={() => setMedia((rows: AtlasMedia[]) => rows.filter((row) => row.id !== item.id))}>Delete</button>
          </div>
        )) : <p className="muted">No logs yet. Add comments, photos, or voice notes from any location/asset/vendor/procedure/document.</p>}
      </section>
    </>
  );
}

function AssistantView({ locations, assets, vendors, procedures, documents, media, attachMedia }: any) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask about an asset, vendor, location, procedure, or document.");

  function ask() {
    const q = question.toLowerCase();
    const pool = [
      ...locations.map((x: LocationRecord) => `Location: ${x.name}. ${x.summary} ${x.notes}`),
      ...assets.map((x: AssetRecord) => `Asset: ${x.name}. ${x.category}. ${x.make || ""} ${x.model || ""} ${x.serial || ""}. ${x.notes}`),
      ...vendors.map((x: VendorRecord) => `Vendor: ${x.name}. ${x.category}. ${x.phone || ""} ${x.email || ""}. ${x.notes}`),
      ...procedures.map((x: ProcedureRecord) => `Procedure: ${x.title}. ${x.frequency}. ${x.steps.join(" ")}`),
      ...documents.map((x: DocumentRecord) => `Document: ${x.title}. ${x.type}. ${x.notes}`),
      ...media.map((x: AtlasMedia) => `Log: ${x.title}. ${x.text || ""}`),
    ];

    const hits = pool.filter((line) => q.split(/\s+/).some((word) => word.length > 2 && line.toLowerCase().includes(word))).slice(0, 8);
    setAnswer(hits.length ? hits.join("\n\n") : "I did not find that in the local Atlas records yet. Add a note, photo, document, or asset record and I can search it here.");
  }

  return (
    <>
      <Header title="AI Assistant" subtitle="Local Atlas search over the records in this app. Database-backed AI comes later." />
      <section className="card assistant-card">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask Atlas: What do we know about the Sundance hot tub, Sunstream lift boxes, pool backwash, Penthouse Drapery, Desert Aire..." />
        <button className="button primary" onClick={ask}>Ask Atlas</button>
        <pre className="answer">{answer}</pre>
      </section>
    </>
  );
}

function TeamView() {
  return (
    <>
      <Header title="Team" subtitle="Team and permissions placeholder. Login is still paused until the data structure is ready." />
      <section className="card">
        <h2>Access Plan</h2>
        <p>Atlas will support owner/admin/team views later. For now, do not store raw passwords, access codes, PINs, private emails, or owner credentials in normal records.</p>
      </section>
    </>
  );
}

function RecordList({ records, selectedId, onSelect }: { records: any[]; selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = records.filter((record) => (record.name || record.title || "").toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="card list-card">
      <input className="search" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="record-list">
        {filtered.map((record) => (
          <button key={record.id} className={record.id === selectedId ? "record active" : "record"} onClick={() => onSelect(record.id)}>
            <strong>{record.name || record.title}</strong>
            <span>{record.category || record.type || record.frequency || ""}</span>
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
        <small>Print or screenshot this tag for the asset/location.</small>
      </div>
    </div>
  );
}

function MediaTools({ targetType, targetId, media, attachMedia }: any) {
  const [comment, setComment] = useState("");
  const [viewer, setViewer] = useState<string | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const related = media.filter((m: AtlasMedia) => m.targetType === targetType && m.targetId === targetId);

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
    if (!navigator.mediaDevices?.getUserMedia) return alert("Voice recording not supported in this browser.");
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

  const photos = related.filter((m: AtlasMedia) => m.kind === "photo");

  return (
    <div className="media-box">
      <h3>Photos, Comments & Voice Notes</h3>
      <div className="comment-row">
        <input placeholder="Add comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
        <button className="button" onClick={addComment}>Save</button>
      </div>
      <div className="media-actions">
        <label className="button file-button">Add Photos<input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} /></label>
        {recorder ? <button className="button danger" onClick={stopVoice}>Stop Voice</button> : <button className="button" onClick={startVoice}>Record Voice</button>}
      </div>

      <div className="gallery">
        {photos.map((item: AtlasMedia) => (
          <button key={item.id} onClick={() => setViewer(item.dataUrl || null)}>
            <img src={item.dataUrl} alt={item.title} />
          </button>
        ))}
      </div>

      <div className="media-list">
        {related.map((item: AtlasMedia) => (
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

function makeMonthDays(dateString: string) {
  const d = new Date(dateString + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
}

function AppStyles() {
  return (
    <style>{`
      :root {
        --navy: #071d3a;
        --navy2: #0d2d57;
        --gold: #caa24a;
        --green: #2f6f4e;
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
