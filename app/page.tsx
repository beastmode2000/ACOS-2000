const defaultAssets: AssetRecord[] = [
  { id: "blinds-hunter-douglas", name: "Blinds Hunter Douglas", locationId: "elyses-room", category: "Blinds / Shades", make: "Hunter Douglas", status: "Online", notes: "Asset listed at Elyse's Room.", vendorIds: [], documentIds: [] },
  { id: "blinds-lutron", name: "Blinds Lutron", locationId: "general", category: "Blinds / Motorized Shades", make: "Lutron", status: "Online", notes: "Penthouse Drapery invoice #176396 links to this motorized roller shade asset.", vendorIds: ["penthouse-drapery", "all-pro-blinds"], documentIds: ["penthouse-invoice"] },

  { id: "boiler-b-1", name: "Boiler B-1", locationId: "general", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960502925", status: "Online", notes: "Boiler B-1 / Boiler 1. Prior visible nameplate indicated year built 2018, MAWP 60 PSI, max water temp 210°F.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "boiler-b-2", name: "Boiler B-2", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", status: "Online", notes: "Boiler B-2 in Mechanical Room.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "boiler-b-2-new", name: "Boiler B-2 New", locationId: "mechanical-room", category: "Boiler", make: "Viessmann", model: "Vitodens 200", serial: "758960507593", status: "Online", notes: "Newer boiler record. Nameplate details: year built 2025, MAWP 60 PSI, max water temp 210°F, heating surface 31.99 sq ft, min relief valve capacity 255.9 lb/hr, CRN R1497.5C.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "guarddog-lwco", name: "McDonnell & Miller GuardDog LWCO", locationId: "mechanical-room", category: "Boiler Safety", make: "McDonnell & Miller", model: "751P-MT-120", status: "Online", notes: "Manual reset low-water cutoff with LED/test/reset behavior and CSD-1 relevance.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },

  { id: "craft-cobalt-r-7", name: "Craft-Cobalt R-7", locationId: "dock", category: "Boat", make: "Cobalt", status: "Online", notes: "Cobalt boat listed at Dock.", vendorIds: ["seattle-boat", "oryan-marine"], documentIds: ["boat-fluid-analysis"] },
  { id: "craft-seadoo-2024", name: "Craft-SeaDoo 2024", locationId: "dock", category: "PWC", make: "Sea-Doo", status: "Online", notes: "2024 Sea-Doo listed at Dock. Link repair/service photos and invoices here.", vendorIds: ["seadoo-service", "i90-motorsports"], documentIds: ["seadoo-repair"] },
  { id: "sunstream-cobalt", name: "Sunstream Lift Box - Cobalt", locationId: "cobalt", category: "Boat Lift", make: "Sunstream", status: "Online", notes: "Newer lift box for Cobalt. White enclosure with solar panel/battery/control wiring.", vendorIds: ["sunstream", "seattle-boat"], documentIds: ["sunstream-notes"] },
  { id: "sunstream-seadoo", name: "Sunstream Lift Box - Sea-Doo", locationId: "seadoo", category: "PWC Lift", make: "Sunstream", status: "Online", notes: "Sea-Doo lift/control box. Not all Sunstream boxes are the same.", vendorIds: ["sunstream", "seadoo-service"], documentIds: ["sunstream-notes"] },

  { id: "dishwasher-dw-1", name: "Dishwasher DW-1", locationId: "fitness-room", category: "Dishwasher", status: "Online", notes: "Listed at Fitness Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dishwasher-dw-2", name: "Dishwasher DW-2", locationId: "house-managers-office", category: "Dishwasher", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dishwasher-dw-3-right", name: "Dishwasher DW-3 (Right)", locationId: "kitchen", category: "Dishwasher", status: "Online", notes: "Right dishwasher in Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dishwasher-dw-4-left", name: "Dishwasher DW-4 (Left)", locationId: "kitchen", category: "Dishwasher", status: "Online", notes: "Left dishwasher in Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "dryer-dr-1", name: "Dryer DR-1", locationId: "upstairs-laundry-closet", category: "Dryer", status: "Online", notes: "Listed at Upstairs Laundry Closet.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dryer-dr-2", name: "Dryer DR-2", locationId: "pool-changing-room", category: "Dryer", status: "Online", notes: "Listed at Pool Changing Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "dryer-dr-3", name: "Dryer DR-3", locationId: "house-managers-office", category: "Dryer", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "flologic", name: "FloLogic", locationId: "general", category: "Water Shutoff / Leak Protection", make: "FloLogic", status: "Online", notes: "Whole-home water monitoring / automatic shutoff asset.", vendorIds: ["best-plumbing", "american-leak-detection"], documentIds: [] },
  { id: "home-water-filter", name: "Home Water Filter", locationId: "general", category: "Water Filtration", status: "Online", notes: "General home water filter asset.", vendorIds: ["best-plumbing"], documentIds: [] },

  { id: "freezer-fr-1", name: "Freezer FR-1", locationId: "pantry", category: "Freezer", status: "Online", notes: "Listed at Pantry.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-2", name: "Freezer FR-2", locationId: "pool", category: "Freezer", status: "Online", notes: "Listed at Pool.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-3", name: "Freezer FR-3", locationId: "pool", category: "Freezer", status: "Online", notes: "Listed at Pool.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-4", name: "Freezer FR-4", locationId: "kitchen", category: "Freezer", status: "Online", notes: "Listed at Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "freezer-fr-5", name: "Freezer FR-5", locationId: "wine-room", category: "Freezer", status: "Online", notes: "Listed at Wine Room.", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "garage-door-openers", name: "Garage Door Openers", locationId: "general", category: "Garage Doors", status: "Online", notes: "General garage door opener asset.", vendorIds: ["precision-garage-door"], documentIds: [] },
  { id: "marantec-wke", name: "Marantec WKE", locationId: "2000", category: "Access / Gate / Garage Control", make: "Marantec", status: "Online", notes: "Marantec WKE asset listed at 2000.", vendorIds: ["precision-garage-door"], documentIds: [] },

  { id: "generator-lower", name: "Generator (Lower)", locationId: "outdoor-generator-area", category: "Generator", status: "Online", notes: "Lower generator at Outdoor Generator Area.", vendorIds: ["d-square-energy", "maple-valley-electric"], documentIds: [] },
  { id: "generator-upper", name: "Generator (Upper)", locationId: "outdoor-generator-area", category: "Generator", status: "Online", notes: "Upper generator at Outdoor Generator Area.", vendorIds: ["d-square-energy", "maple-valley-electric"], documentIds: [] },

  { id: "golf-simulator", name: "Golf Simulator", locationId: "new-garage", category: "Recreation / AV", status: "Online", notes: "Garage golf simulator clean/inspect recurring task.", vendorIds: ["high-tech-living"], documentIds: [] },

  { id: "hot-water-storage-tank-1", name: "Hot Water Storage Tank 1", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", status: "Online", notes: "One of twin Viessmann Vitocell 300-V 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "hot-water-storage-tank-2", name: "Hot Water Storage Tank 2", locationId: "mechanical-room", category: "Domestic Hot Water", make: "Viessmann", model: "Vitocell 300-V EVIA 300", status: "Online", notes: "Second of twin Viessmann Vitocell 300-V 79 USG / 300 L indirect-fired stainless DHW tanks.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },

  { id: "hottub", name: "Hottub", locationId: "back-patio-water-side", category: "Spa / Hot Tub", make: "Sundance", model: "880 Series Optima", serial: "00P3LCD-100528521-0315", status: "Online", notes: "Sundance Optima hot tub listed at Back Patio (water side). Also tracked as standalone Sundance spa asset.", vendorIds: ["aqua-quip", "krisco-pool-spas"], documentIds: ["sundance-record"] },
  { id: "sundance-optima", name: "Sundance Optima Hot Tub", locationId: "hot-tub-sundance", category: "Spa", make: "Sundance", model: "880 Series Optima", serial: "00P3LCD-100528521-0315", status: "Online", notes: "Date 03/21/15. 240V. Standalone spa, not indoor pool controls.", vendorIds: ["aqua-quip", "krisco-pool-spas"], documentIds: ["sundance-record"] },
  { id: "sundance-clearray", name: "Sundance ClearRay UV-C", locationId: "hot-tub-sundance", category: "Spa Water Care", make: "Sundance / ClearRay", status: "Online", notes: "ClearRay UV-C water purification/ballast equipment.", vendorIds: ["aqua-quip"], documentIds: ["sundance-record"] },
  { id: "hydroquip-heater", name: "HydroQuip Water Pro Series Smart Heater Plus", locationId: "hot-tub-sundance", category: "Spa Heater", make: "HydroQuip", status: "Online", notes: "Titanium Inside label. High-limit and heater-on indicators visible.", vendorIds: ["aqua-quip"], documentIds: ["sundance-record"] },

  { id: "hunter-irrigation-controller", name: "Hunter Irrigation Controller", locationId: "general", category: "Irrigation Controller", make: "Hunter", status: "Online", notes: "Hunter irrigation controller asset.", vendorIds: ["advanced-irrigation"], documentIds: [] },
  { id: "irrigation-lake-water-meter", name: "Irrigation Lake Water Meter", locationId: "2000", category: "Irrigation / Water Meter", status: "Online", notes: "Irrigation lake water meter. Screenshot shows one sub-asset.", vendorIds: ["advanced-irrigation"], documentIds: [] },

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

  { id: "carrier-hvac", name: "Carrier Forced-Air HVAC", locationId: "mechanical-room", category: "HVAC", make: "Carrier", status: "Online", notes: "Forced-air system with Honeywell HZ432 zones.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "honeywell-hz432", name: "Honeywell HZ432 Zone Panel", locationId: "mechanical-room", category: "HVAC Controls", make: "Honeywell", model: "HZ432", status: "Online", notes: "Zones include Nanny/Gym-Nanny, Bonus/Play Room, Kitchen, Exercise.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },

  { id: "invisible-fence", name: "Invisible Fence", locationId: "vegetable-garden", category: "Pet / Fence", status: "Online", notes: "Invisible Fence asset listed at Vegetable Garden.", vendorIds: ["invisible-fence"], documentIds: [] },
  { id: "lynx-grill", name: "Lynx Grill", locationId: "back-patio-water-side", category: "Outdoor Kitchen / Grill", make: "Lynx", status: "Online", notes: "Lynx Grill at Back Patio (water side).", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "outdoor-dehumidifier", name: "Outdoor Dehumidifier", locationId: "outdoor-condenser-area", category: "Dehumidification", status: "Online", notes: "Outdoor dehumidifier at Outdoor Condenser Area.", vendorIds: ["psf-mechanical"], documentIds: ["systems-layout"] },
  { id: "pool-dehumidifier", name: "Pool Dehumidifier", locationId: "mechanical-room", category: "Pool HVAC / Dehumidification", make: "Desert Aire", model: "LC05R2WBDTDLAED", serial: "4217D25175", status: "Online", notes: "Pool dehumidification system with Desert Aire control/display and SR501 relay.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record", "systems-layout"] },

  { id: "pool", name: "Pool", locationId: "pool", category: "Pool", status: "Offline", notes: "Pool asset shown as Offline in screenshot.", vendorIds: ["psf-mechanical", "aqua-quip", "krisco-pool-spas"], documentIds: ["pool-record"] },
  { id: "pentair-pool-pump", name: "Pentair 3.0 HP Pool Pump", locationId: "pool-equipment", category: "Pool Pump", make: "Pentair", model: "3.0 HP", status: "Online", notes: "Pool water path starts at Pentair pump.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "triton-filter", name: "Pentair Triton II Sand Filter", locationId: "pool-equipment", category: "Pool Filter", make: "Pentair", model: "Triton II TR-140", status: "Online", notes: "Sand filter. Backwash by pressure rise rule.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "uv2", name: "UltraPure / Paramount UV2", locationId: "pool-equipment", category: "Pool UV", make: "UltraPure / Paramount", model: "UV2", status: "Online", notes: "UV unit in indoor pool water path.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },
  { id: "pool-manifold", name: "Pool Manifold Labels", locationId: "pool-equipment", category: "Pool Valves", status: "Online", notes: "Visible zone labels include South pool, East pool, and Pool bath.", vendorIds: ["psf-mechanical"], documentIds: ["pool-record"] },

  { id: "plane-gulfstream-g280-n280cc", name: "Plane Gulfstream G280 N280CC", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N280CC", status: "Online", notes: "Hangar aircraft. Earlier photo clearly shows tail number N280CC.", vendorIds: [], documentIds: [] },
  { id: "plane-gulfstream-g280-n755pa", name: "Plane Gulfstream G280 N755PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G280", serial: "N755PA", status: "Online", notes: "Hangar aircraft. Tail number inferred from prior Hangar location records.", vendorIds: [], documentIds: [] },
  { id: "plane-gulfstream-g600-n23pa", name: "Plane Gulfstream G600 N23PA", locationId: "hangar", category: "Aircraft", make: "Gulfstream", model: "G600", serial: "N23PA", status: "Online", notes: "Hangar aircraft. Tail number inferred from prior Hangar location records.", vendorIds: [], documentIds: [] },
  { id: "plane-pilatus-pc12-n126al", name: "Plane Pilatus PC12 N126AL", locationId: "hangar", category: "Aircraft", make: "Pilatus", model: "PC12", serial: "N126AL", status: "Online", notes: "Hangar aircraft. Verify screenshot tail number because one screenshot looked like N126AI while prior records say N126AL.", vendorIds: [], documentIds: [] },

  { id: "range-wolf", name: "Range-Wolf", locationId: "kitchen", category: "Range", make: "Wolf", status: "Online", notes: "Wolf range asset in Kitchen. Possible duplicate with 'wolfe range'. Keep both until user confirms merge.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "wolfe-range", name: "wolfe range", locationId: "kitchen", category: "Range", make: "Wolf", status: "Online", notes: "Duplicate/variant naming of Range-Wolf from screenshots. Keep both until user confirms merge.", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "refrigerator-fitness-room", name: "Refrigerator", locationId: "fitness-room", category: "Refrigerator", status: "Online", notes: "Refrigerator listed at Fitness Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "refrigerator-left", name: "Refrigerator (Left)", locationId: "kitchen", category: "Refrigerator", status: "Online", notes: "Left refrigerator in Kitchen.", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "steam-generator-attic", name: "Steam Generator Attic", locationId: "general", category: "Steam Generator", status: "Online", notes: "Steam Generator Attic asset listed at General.", vendorIds: ["psf-mechanical"], documentIds: [] },
  { id: "west-steam-generator", name: "West Steam Generator", locationId: "west-side-house", category: "Steam Generator", status: "Online", notes: "West Steam Generator listed at West side of House.", vendorIds: ["psf-mechanical"], documentIds: [] },

  { id: "vehicle-audi-e-tron-gt", name: "Vehicle Audi E-Tron GT", locationId: "old-garage", category: "Vehicle", make: "Audi", model: "E-Tron GT", status: "Online", notes: "Vehicle listed at Garage (old).", vendorIds: ["les-schwab"], documentIds: [] },
  { id: "vehicle-ford-f-150", name: "Vehicle Ford F-150", locationId: "new-garage", category: "Vehicle", make: "Ford", model: "F-150", status: "Online", notes: "Screenshot text appears 'Ford 1-50'; likely Ford F-150. Verify final naming.", vendorIds: ["autonation-ford-bellevue", "les-schwab"], documentIds: [] },
  { id: "vehicle-mercedes-gl", name: "Vehicle Mercedes GL", locationId: "general", category: "Vehicle", make: "Mercedes", model: "GL", status: "Online", notes: "Vehicle listed at General.", vendorIds: ["les-schwab"], documentIds: [] },
  { id: "vehicle-rivian", name: "Vehicle Rivian", locationId: "2000", category: "Vehicle", make: "Rivian", status: "Online", notes: "Vehicle listed at 2000.", vendorIds: ["les-schwab"], documentIds: [] },

  { id: "washer-wm-1", name: "Washer WM-1", locationId: "upstairs-laundry-closet", category: "Washer", status: "Online", notes: "Listed at Upstairs Laundry Closet.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "washer-wm-2", name: "Washer WM-2", locationId: "pool-changing-room", category: "Washer", status: "Online", notes: "Listed at Pool Changing Room.", vendorIds: ["appliance-service-station"], documentIds: [] },
  { id: "washer-wm-3", name: "Washer WM-3", locationId: "house-managers-office", category: "Washer", status: "Online", notes: "Listed at House Managers Office.", vendorIds: ["appliance-service-station"], documentIds: [] },

  { id: "wine-chiller", name: "Wine Chiller", locationId: "formal-dining-room", category: "Wine Cooler", status: "Online", notes: "Wine Chiller listed at Formal Dining Room.", vendorIds: ["appliance-service-station", "electromatic-refrigeration"], documentIds: [] },
  { id: "wine-fridge", name: "Wine Fridge", locationId: "mechanical-room-2", category: "Wine Fridge", status: "Online", notes: "Wine Fridge listed at Mechanical Room 2.", vendorIds: ["appliance-service-station", "electromatic-refrigeration"], documentIds: [] },
  { id: "wine-room-cooler-1", name: "Wine Room Cooler 1", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 1.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wine-room-cooler-2", name: "Wine Room Cooler 2", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 2.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wine-room-cooler-3", name: "Wine Room Cooler 3", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 3.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },
  { id: "wine-room-cooler-4", name: "Wine Room Cooler 4", locationId: "wine-room", category: "Wine Room Cooling", status: "Online", notes: "Wine Room Cooler 4.", vendorIds: ["electromatic-refrigeration", "psf-mechanical"], documentIds: [] },

  { id: "water-trampoline", name: "Water Trampoline", locationId: "water-trampoline", category: "Water Recreation", status: "Seasonal", notes: "Inspect anchors, inflation, and condition.", vendorIds: [], documentIds: [] },
  { id: "sport-court", name: "Sport Court", locationId: "sport-court", category: "Recreation", status: "Online", notes: "Court surface and equipment.", vendorIds: [], documentIds: [] },
  { id: "veggie-boxes", name: "Three Veggie Boxes", locationId: "veggie-boxes", category: "Grounds", status: "Online", notes: "Three boxes at south end of east lawn.", vendorIds: ["advanced-irrigation"], documentIds: [] },

  { id: "main-hallway-artwork", name: "Main Hallway Artwork", locationId: "original-house", category: "Interior / Artwork", status: "Monitor", notes: "Recurring condition check.", vendorIds: [], documentIds: [] },
  { id: "guardian-statues", name: "Guardian Statues", locationId: "original-house", category: "Exterior / Decor", status: "Monitor", notes: "Recurring condition check.", vendorIds: [], documentIds: [] },
];
