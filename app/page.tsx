"use client"

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"

type View =
  | "dashboard"
  | "map"
  | "sections"
  | "assets"
  | "vendors"
  | "calendar"
  | "weather"
  | "documents"
  | "procedures"
  | "logs"
  | "assistant"
  | "team"

type SectionRecord = {
  id: string
  name: string
  group: string
  assets: number
  openTasks: number
  icon: string
  mapX: number
  mapY: number
  summary: string
}

type AssetRecord = {
  id: string
  name: string
  category: string
  section: string
  status: string
  detail: string
}

type VendorRecord = {
  id: string
  name: string
  category: string
  status: string
  detail: string
}

type WorkRecord = {
  id: string
  task: string
  area: string
  cadence: string
  due: string
  priority: string
}

type DocumentRecord = {
  id: string
  title: string
  kind: string
  section: string
  detail: string
}

type ProcedureRecord = {
  id: string
  title: string
  area: string
  status: string
  steps: string[]
}

type CommentRecord = {
  id: string
  text: string
  createdAt: string
}

type PhotoRecord = {
  id: string
  name: string
  src: string
  createdAt: string
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: {
      transcript: string
    }
    isFinal: boolean
  }>
}

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const sections: SectionRecord[] = [
  {
    id: "main-house",
    name: "Main House",
    group: "Residence",
    assets: 12,
    openTasks: 4,
    icon: "⌂",
    mapX: 43,
    mapY: 39,
    summary:
      "Primary residence records, bedrooms, interior systems, artwork, main hallway, kitchen, living areas, and owner-facing notes.",
  },
  {
    id: "addition",
    name: "Addition",
    group: "Residence",
    assets: 8,
    openTasks: 3,
    icon: "▦",
    mapX: 58,
    mapY: 44,
    summary:
      "Newer addition records including indoor pool construction, courtyard connection, covered hallways, and related systems.",
  },
  {
    id: "pool",
    name: "Pool",
    group: "Water Systems",
    assets: 6,
    openTasks: 1,
    icon: "≈",
    mapX: 31,
    mapY: 48,
    summary:
      "Indoor pool, dehumidification, pool filtration, backwash, treatment, water quality, and pool equipment records.",
  },
  {
    id: "dock",
    name: "Dock",
    group: "Waterfront",
    assets: 9,
    openTasks: 2,
    icon: "⚓",
    mapX: 50,
    mapY: 76,
    summary:
      "Dock, Cobalt boat, Sea-Doo, Sunstream lift boxes, water trampoline, fuel checks, lift controls, and waterfront notes.",
  },
  {
    id: "grounds",
    name: "Grounds",
    group: "Exterior",
    assets: 23,
    openTasks: 6,
    icon: "♧",
    mapX: 73,
    mapY: 59,
    summary:
      "Lawn, irrigation, sport court, fire pit, trampoline area, plantings, blow-off routes, and exterior maintenance.",
  },
  {
    id: "hangar",
    name: "Hangar",
    group: "Aircraft",
    assets: 4,
    openTasks: 1,
    icon: "✈",
    mapX: 76,
    mapY: 28,
    summary:
      "Hangar and aircraft location records including Gulfstream and Pilatus references.",
  },
  {
    id: "mechanical-room",
    name: "Mechanical Room",
    group: "Systems",
    assets: 10,
    openTasks: 3,
    icon: "⚙",
    mapX: 61,
    mapY: 53,
    summary:
      "Boilers, DHW tanks, HVAC zoning, hydronic systems, low-water cutoff, system labels, and mechanical service records.",
  },
  {
    id: "garage-adu",
    name: "Garage / ADU",
    group: "Structures",
    assets: 5,
    openTasks: 2,
    icon: "▣",
    mapX: 24,
    mapY: 34,
    summary:
      "Garage, old garage, ADU, covered walkway/hallway connections, storage, garbage/recycling, and service zones.",
  },
  {
    id: "courtyard",
    name: "Courtyard",
    group: "Exterior",
    assets: 3,
    openTasks: 1,
    icon: "◉",
    mapX: 38,
    mapY: 55,
    summary:
      "Courtyard between old house/addition areas, fire pit, chairs, covered connections, and layout corrections.",
  },
  {
    id: "trampoline",
    name: "Trampoline Area",
    group: "Exterior",
    assets: 2,
    openTasks: 1,
    icon: "◎",
    mapX: 47,
    mapY: 57,
    summary:
      "Trampoline area near covered hallway/courtyard layout. Keep separate from courtyard and walkway records.",
  },
]

const assets: AssetRecord[] = [
  {
    id: "viessmann-boilers",
    name: "Viessmann Vitodens 200 Boiler System",
    category: "Mechanical",
    section: "Mechanical Room",
    status: "Priority",
    detail:
      "Two wall-mounted Viessmann Vitodens 200 boilers labeled Boiler 1 and Boiler 2. Records include MAWP 60 PSI, max water temperature 210°F, CRN R1497.5C, low-water cutoff, hydronic/cascade service notes, and nameplate photos.",
  },
  {
    id: "vitocell-dhw",
    name: "Viessmann Vitocell 300-V DHW Tanks",
    category: "Mechanical",
    section: "Mechanical Room",
    status: "Documented",
    detail:
      "Twin gray Viessmann Vitocell 300-V indirect-fired domestic hot water tanks. EVIA 300, 79 USG / 300 L, stainless tank notes and mechanical-room records.",
  },
  {
    id: "carrier-hvac",
    name: "Carrier + Honeywell HZ432 HVAC Zones",
    category: "HVAC",
    section: "Mechanical Room",
    status: "Active",
    detail:
      "Forced-air Carrier equipment with Honeywell HZ432 zoning, room comfort records, and HVAC zone troubleshooting notes.",
  },
  {
    id: "desert-aire",
    name: "Desert Aire Pool Dehumidification",
    category: "Pool",
    section: "Pool",
    status: "Active",
    detail:
      "Indoor pool dehumidification system connected to pool addition records and pool environmental control.",
  },
  {
    id: "pool-filtration",
    name: "Pentair / Triton Pool Filtration",
    category: "Pool",
    section: "Pool",
    status: "Active",
    detail:
      "Pool treatment, filtration, backwash procedure, water treatment, local controls, and pool mechanical notes.",
  },
  {
    id: "sundance-optima",
    name: "Sundance Optima Spa",
    category: "Spa",
    section: "Pool",
    status: "Documented",
    detail:
      "Sundance 880-series OPTIMA spa. Date 03/21/15. Serial 00P3LCD-100528521-0315. ClearRay UV-C, HydroQuip heater, 240V electrical records, cabinet/nameplate photos, and corrosion notes.",
  },
  {
    id: "sunstream-lift-boxes",
    name: "Sunstream Lift Boxes",
    category: "Dock",
    section: "Dock",
    status: "Photo Group",
    detail:
      "Multiple Sunstream dock lift control/battery/solar boxes. Newer Sunstream box is for the Cobalt lift. Boxes are not all the same and need grouped photos.",
  },
  {
    id: "cobalt-boat",
    name: "Cobalt Boat",
    category: "Watercraft",
    section: "Dock",
    status: "Active",
    detail:
      "Cobalt boat repair/service, winterization, de-winterization, dock location, lift box, and seasonal work records.",
  },
  {
    id: "seadoo",
    name: "Sea-Doo / PWC",
    category: "Watercraft",
    section: "Dock",
    status: "Active",
    detail:
      "Sea-Doo fuel checks, repair record, crash-repair invoice, dock placement, and recurring waterfront work.",
  },
  {
    id: "lutron-blinds",
    name: "Lutron Motorized Blinds",
    category: "Interior",
    section: "Main House",
    status: "Vendor Linked",
    detail:
      "Motorized roller shade asset linked to Penthouse Drapery repair invoice #176396.",
  },
  {
    id: "wolf-range",
    name: "Wolf Range",
    category: "Kitchen",
    section: "Main House",
    status: "Needs Cleanup",
    detail:
      "Kitchen range record needs standard naming cleanup between Wolf Range and prior alternate spelling.",
  },
  {
    id: "flologic",
    name: "FloLogic Water Shutoff",
    category: "Plumbing",
    section: "Mechanical Room",
    status: "Tracked",
    detail:
      "Automatic water shutoff / water leak protection asset for plumbing and leak-prevention records.",
  },
  {
    id: "dishwashers",
    name: "Dishwashers",
    category: "Appliances",
    section: "Main House",
    status: "Imported record",
    detail:
      "Dishwasher asset group for appliance records, model/serial details, and maintenance notes.",
  },
  {
    id: "dryers",
    name: "Dryers",
    category: "Appliances",
    section: "Main House",
    status: "Imported record",
    detail:
      "Dryer asset group for appliance records, cleaning/maintenance, and equipment lookup.",
  },
  {
    id: "freezers",
    name: "Freezers",
    category: "Appliances",
    section: "Main House",
    status: "Imported record",
    detail:
      "Freezer asset group for appliance records and maintenance lookup.",
  },
  {
    id: "hangar-aircraft",
    name: "Hangar Aircraft Records",
    category: "Hangar",
    section: "Hangar",
    status: "Reference",
    detail:
      "Hangar records include Gulfstream G600 N23PA, Gulfstream G280 N280CC, Gulfstream G280 N755PA, and Pilatus PC12 N126AL.",
  },
]

const vendors: VendorRecord[] = [
  {
    id: "penthouse-drapery",
    name: "Penthouse Drapery",
    category: "Blinds / Motorized Roller Shades",
    status: "Invoice linked",
    detail:
      "Motorized roller shade service linked to Lutron blinds. Invoice #176396 dated 06/16/2026.",
  },
  {
    id: "pool-spa-service",
    name: "Pool / Spa Service",
    category: "Pool, spa, filtration, water treatment",
    status: "Needs contact details",
    detail:
      "Pool equipment, backwash procedure support, filtration, spa service, and water-treatment records.",
  },
  {
    id: "hvac-boiler-service",
    name: "HVAC / Boiler Service",
    category: "Boilers, HVAC, hydronic, zoning",
    status: "Needs contact details",
    detail:
      "Viessmann boilers, Carrier HVAC, Honeywell HZ432 zones, DHW tanks, hydronic service, and mechanical-room records.",
  },
  {
    id: "boat-seadoo-service",
    name: "Boat / Sea-Doo Service",
    category: "Watercraft and dock equipment",
    status: "Needs contact details",
    detail:
      "Cobalt, Sea-Doo, lift, winterization, de-winterization, fuel, repair, and dock service records.",
  },
  {
    id: "paint-exterior",
    name: "Paint / Exterior Work",
    category: "Painting, staining, exterior projects",
    status: "Project records",
    detail:
      "Exterior paint/stain planning, painter coordination, prep work, and schedule notes.",
  },
  {
    id: "carpet-flooring",
    name: "Carpet / Flooring",
    category: "Flooring bids and finish work",
    status: "Bid records",
    detail:
      "Upstairs bedroom carpet replacement and bonus-room hardwood options.",
  },
  {
    id: "landscape-irrigation",
    name: "Landscape / Irrigation",
    category: "Grounds and irrigation",
    status: "Needs contact details",
    detail:
      "Grounds, irrigation, lawn, plantings, blow-off, and exterior maintenance notes.",
  },
  {
    id: "cleaning",
    name: "Cleaning",
    category: "House and basement cleaning",
    status: "Needs contact details",
    detail:
      "Cleaning crew schedule notes, basement bathroom cleaning, bleach smell notes, and owner-availability coordination.",
  },
  {
    id: "seattle-boat",
    name: "Seattle Boat",
    category: "Boat service",
    status: "Reference",
    detail:
      "Boat service/vendor record placeholder for Cobalt-related work and seasonal service records.",
  },
  {
    id: "psf-mechanical",
    name: "PSF Mechanical",
    category: "Pool / mechanical reference",
    status: "Reference",
    detail:
      "Pool equipment and mechanical record placeholder for service history and equipment support.",
  },
]

const work: WorkRecord[] = [
  { id: "dog", task: "Daily Dog Cleanup", area: "Grounds", cadence: "Daily", due: "Today", priority: "Normal" },
  { id: "seadoo-fuel", task: "Daily Sea-Doo Fuel Check / Fill", area: "Dock", cadence: "Daily", due: "Today", priority: "Normal" },
  { id: "basement-bath", task: "Clean Basement Bathroom", area: "Basement", cadence: "Weekly", due: "This week", priority: "Normal" },
  { id: "garbage", task: "Basement + Garage Garbage/Recycling", area: "Garage", cadence: "Weekly", due: "Friday", priority: "Normal" },
  { id: "gas-cans", task: "Fill All Gas Cans", area: "Fuel / Supplies", cadence: "Weekly", due: "Friday", priority: "Normal" },
  { id: "blow-off", task: "Large Property Blow-Off", area: "Grounds", cadence: "Weekly", due: "Weather window", priority: "Normal" },
  { id: "guardians", task: "Guardian Statues Condition Check", area: "Exterior Assets", cadence: "Monthly", due: "Monthly", priority: "Low" },
  { id: "cobalt-winter", task: "Cobalt Boat Winterization", area: "Dock", cadence: "Annual", due: "Seasonal", priority: "Seasonal" },
  { id: "cobalt-dewinter", task: "Cobalt Boat De-Winterization", area: "Dock", cadence: "Annual", due: "Seasonal", priority: "Seasonal" },
  { id: "simulator", task: "Golf Simulator Clean / Inspect", area: "Recreation", cadence: "Weekly", due: "Weekly", priority: "Normal" },
]

const documents: DocumentRecord[] = [
  {
    id: "systems-layout",
    title: "2000 Systems Layout Draft v1",
    kind: "PDF",
    section: "Mechanical Room",
    detail:
      "Draft systems layout covering mechanical, electrical, pool, HVAC, hydronic boiler, DHW, pool treatment, dehumidification, and forced-air zones.",
  },
  {
    id: "drapery-invoice",
    title: "Penthouse Drapery Invoice #176396",
    kind: "Invoice",
    section: "Main House",
    detail:
      "Motorized roller shade repair invoice linked to Lutron blinds asset.",
  },
  {
    id: "spa-nameplate",
    title: "Sundance Optima Spa Nameplate",
    kind: "Equipment record",
    section: "Pool",
    detail:
      "Spa nameplate, electrical rating, ClearRay UV-C, HydroQuip heater, and cabinet condition notes.",
  },
  {
    id: "boiler-nameplates",
    title: "Viessmann Boiler Nameplates",
    kind: "Equipment record",
    section: "Mechanical Room",
    detail:
      "Boiler nameplate records including 2018 and 2025 observations, serial details, and safety data.",
  },
  {
    id: "lift-box-photos",
    title: "Sunstream Lift Box Photo Set",
    kind: "Photo record",
    section: "Dock",
    detail:
      "Dock lift control boxes, solar panels, batteries, wiring, and Cobalt lift box note.",
  },
  {
    id: "pool-construction",
    title: "Indoor Pool Construction Photo",
    kind: "Construction photo",
    section: "Addition",
    detail:
      "First-floor addition indoor pool construction photo with concrete shell, work lighting, hoses, and worker.",
  },
  {
    id: "seadoo-repair",
    title: "Sea-Doo Repair Invoice",
    kind: "Invoice",
    section: "Dock",
    detail:
      "Repair documentation after Sea-Doo crash repair pickup.",
  },
  {
    id: "pool-backwash",
    title: "Pool Backwash Procedure",
    kind: "Procedure",
    section: "Pool",
    detail:
      "Backwash process record for pool filtration maintenance.",
  },
]

const procedures: ProcedureRecord[] = [
  {
    id: "pool-backwash-procedure",
    title: "Pool Backwash Procedure",
    area: "Pool",
    status: "Draft",
    steps: ["Confirm pool equipment status", "Set valves correctly", "Backwash filter", "Rinse", "Return to normal operation", "Record pressure and water condition"],
  },
  {
    id: "cobalt-winterization",
    title: "Cobalt Boat Winterization",
    area: "Dock",
    status: "Seasonal",
    steps: ["Schedule service", "Confirm lift status", "Fuel/stabilizer check", "Winterize systems", "Record photos and invoice"],
  },
  {
    id: "daily-seadoo",
    title: "Daily Sea-Doo Fuel Check / Fill",
    area: "Dock",
    status: "Active",
    steps: ["Check fuel", "Check dock position", "Inspect exterior", "Record issue if needed"],
  },
  {
    id: "spa-refill",
    title: "Spa Refill / Drain Caution",
    area: "Pool",
    status: "Draft",
    steps: ["Do not run jets dry", "Refill before normal jet operation", "Inspect cabinet", "Check heater/UV labels", "Record condition"],
  },
  {
    id: "sunstream-inspection",
    title: "Sunstream Lift Box Inspection",
    area: "Dock",
    status: "Draft",
    steps: ["Identify correct box", "Check solar panel", "Check battery/control wiring", "Test up/down control", "Add photos"],
  },
]

const activity = [
  "Working www.atlas2000.com domain confirmed.",
  "Atlas dashboard interface created.",
  "Login work paused until dashboard and software structure are stable.",
  "Mechanical, pool, spa, dock, watercraft, HVAC, appliance, and vendor records seeded.",
  "Photo/comment/voice-note interface prepared.",
]

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .atlas-root { min-height: 100vh; background: #f6f7fb; color: #13213b; font-family: Arial, Helvetica, sans-serif; }
  .layout { display: grid; grid-template-columns: 300px 1fr; min-height: 100vh; }
  .sidebar { background: linear-gradient(180deg, #071a36 0%, #031023 100%); color: white; padding: 28px; position: sticky; top: 0; height: 100vh; }
  .logo-row { display: flex; align-items: center; gap: 14px; margin-bottom: 42px; }
  .logo-mark { width: 72px; height: 72px; border-radius: 50%; border: 2px solid #d7a64a; display: grid; place-items: center; color: #d7a64a; font-size: 38px; font-weight: 900; }
  .logo-title { font-family: Georgia, serif; font-size: 34px; letter-spacing: 3px; }
  .logo-sub { color: #d7a64a; font-weight: 700; }
  .side-button { width: 100%; display: flex; align-items: center; gap: 16px; padding: 15px 18px; border-radius: 10px; border: none; background: transparent; color: white; cursor: pointer; font-size: 17px; margin-bottom: 8px; text-align: left; border-left: 4px solid transparent; }
  .side-button.active { background: rgba(255,255,255,.12); border-left-color: #d7a64a; }
  .side-icon { color: #d7a64a; font-size: 24px; width: 28px; }
  .main { padding: 32px; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
  .search { width: min(620px, 100%); background: white; border: 1px solid #e7eaf0; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; box-shadow: 0 6px 18px rgba(15,23,42,.05); }
  .search input { border: none; outline: none; flex: 1; font-size: 15px; }
  .icon-circle { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: white; color: #07152f; border: 1px solid #e7eaf0; font-weight: 900; }
  .icon-circle.dark { background: #071a36; color: white; border: none; }
  .page-title { font-size: 38px; margin: 0 0 4px; font-family: Georgia, serif; color: #07152f; }
  .page-sub { margin-top: 0; color: #6c7280; }
  .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 18px; margin: 24px 0; }
  .card { background: white; border: 1px solid #e7eaf0; border-radius: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
  .metric { padding: 24px; cursor: pointer; text-align: left; border: 1px solid #e7eaf0; }
  .metric:hover, .click-card:hover { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12); }
  .metric-top { display: flex; justify-content: space-between; gap: 18px; align-items: center; }
  .metric-icon { width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; background: #fff4df; color: #d7a64a; font-size: 28px; }
  .metric-title { margin-top: 14px; font-size: 13px; text-transform: uppercase; color: #6c7280; }
  .metric-value { font-size: 36px; font-family: Georgia, serif; color: #07152f; }
  .metric-sub { color: #0b2448; font-weight: 800; }
  .metric-sub.red { color: #c2410c; }
  .dash-grid { display: grid; grid-template-columns: 2fr 1.35fr; gap: 22px; }
  .lower-grid { display: grid; grid-template-columns: 1.2fr 1fr 1.2fr; gap: 22px; margin-top: 22px; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e7eaf0; }
  .panel-title { margin: 0; color: #07152f; font-family: Georgia, serif; font-size: 22px; }
  .panel-body { padding: 18px; }
  .link-button { border: none; background: transparent; color: #0b2448; font-weight: 800; cursor: pointer; }
  .map-box { position: relative; height: 360px; border-radius: 12px; overflow: hidden; border: 1px solid #e7eaf0; background: radial-gradient(circle at 36% 40%, #d8e7c2 0 9%, transparent 10%), radial-gradient(circle at 70% 62%, #b5d59d 0 14%, transparent 15%), linear-gradient(145deg, #e9f0dc 0%, #cfe0b8 44%, #8cb7c6 45%, #4f8fac 58%, #d8e5c0 59%, #e7eed9 100%); }
  .map-box.large { height: 560px; }
  .map-texture { position: absolute; inset: 0; opacity: .55; background-image: linear-gradient(30deg, rgba(255,255,255,.35) 12%, transparent 12%, transparent 88%, rgba(255,255,255,.35) 88%), linear-gradient(120deg, rgba(255,255,255,.35) 12%, transparent 12%, transparent 88%, rgba(255,255,255,.35) 88%); background-size: 120px 80px; }
  .map-control { position: absolute; left: 20px; top: 20px; display: grid; gap: 8px; z-index: 2; }
  .map-control div { width: 38px; height: 38px; border-radius: 8px; background: white; display: grid; place-items: center; font-weight: 900; box-shadow: 0 6px 16px rgba(0,0,0,.12); }
  .marker { position: absolute; transform: translate(-50%, -50%); border: 2px solid white; background: #071a36; color: white; border-radius: 999px; padding: 8px 12px; font-weight: 900; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,.25); display: flex; align-items: center; gap: 7px; z-index: 3; }
  .marker.selected { border: 3px solid #d7a64a; }
  .section-row { display: grid; grid-template-columns: 42px 1fr 24px; align-items: center; gap: 12px; border: none; background: white; cursor: pointer; padding: 13px 6px; border-bottom: 1px solid #e7eaf0; text-align: left; width: 100%; }
  .row-icon { width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: grid; place-items: center; color: #071a36; }
  .two-col { display: grid; grid-template-columns: 1fr 1.1fr; gap: 22px; }
  .asset-layout { display: grid; grid-template-columns: 420px 1fr; gap: 22px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
  .click-card { cursor: pointer; text-align: left; padding: 18px; border: 1px solid #e7eaf0; }
  .click-card.selected { border: 2px solid #d7a64a; }
  .activity-row, .work-row { display: grid; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e7eaf0; align-items: center; }
  .activity-row { grid-template-columns: 40px 1fr; }
  .work-row { grid-template-columns: 40px 1fr 120px; }
  .small-dot { width: 34px; height: 34px; border-radius: 50%; background: #fff4df; color: #d7a64a; display: grid; place-items: center; }
  .detail-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }
  .detail-stat { background: #f8fafc; border-radius: 12px; padding: 16px; }
  textarea { width: 100%; min-height: 90px; border: 1px solid #e7eaf0; border-radius: 12px; padding: 12px; font-size: 15px; font-family: Arial, Helvetica, sans-serif; }
  .primary { background: #071a36; color: white; border: none; border-radius: 10px; padding: 11px 16px; font-weight: 900; cursor: pointer; }
  .secondary { background: white; color: #071a36; border: 1px solid #e7eaf0; border-radius: 10px; padding: 11px 16px; font-weight: 900; cursor: pointer; }
  .danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 10px; padding: 9px 12px; font-weight: 900; cursor: pointer; }
  .comment { background: #f8fafc; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
  .photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
  .photo-card img { width: 100%; height: 110px; object-fit: cover; border-radius: 12px; }
  .assistant-box { display: grid; grid-template-columns: 1.1fr .9fr; gap: 22px; }
  .assistant-response { background: #f8fafc; border-radius: 12px; padding: 14px; line-height: 1.65; white-space: pre-wrap; }
  @media (max-width: 1050px) {
    .layout { grid-template-columns: 1fr; }
    .sidebar { position: relative; height: auto; }
    .metric-grid, .dash-grid, .lower-grid, .two-col, .asset-layout, .assistant-box { grid-template-columns: 1fr; }
  }
`

function getSpeechRecognition() {
  if (typeof window === "undefined") return null

  const win = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }

  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

export default function AtlasDashboard() {
  const [view, setView] = useState<View>("dashboard")
  const [selectedSectionId, setSelectedSectionId] = useState("main-house")
  const [selectedAssetId, setSelectedAssetId] = useState("viessmann-boilers")
  const [search, setSearch] = useState("")
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Record<string, CommentRecord[]>>({})
  const [photos, setPhotos] = useState<Record<string, PhotoRecord[]>>({})
  const [assistantInput, setAssistantInput] = useState("")
  const [assistantResponse, setAssistantResponse] = useState(
    "Ask Atlas about any section, asset, vendor, procedure, document, or maintenance task. You can also use voice notes."
  )
  const [voiceText, setVoiceText] = useState("")
  const [listening, setListening] = useState(false)

  useEffect(() => {
    try {
      const savedComments = localStorage.getItem("atlas-section-comments-v2")
      const savedPhotos = localStorage.getItem("atlas-section-photos-v2")
      if (savedComments) setComments(JSON.parse(savedComments))
      if (savedPhotos) setPhotos(JSON.parse(savedPhotos))
    } catch {
      // Local storage is optional.
    }
  }, [])

  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) || sections[0]

  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) || assets[0]

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sections
    return sections.filter((section) =>
      [section.name, section.group, section.summary]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [search])

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return assets
    return assets.filter((asset) =>
      [asset.name, asset.category, asset.section, asset.detail]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [search])

  function saveComments(next: Record<string, CommentRecord[]>) {
    setComments(next)
    localStorage.setItem("atlas-section-comments-v2", JSON.stringify(next))
  }

  function savePhotos(next: Record<string, PhotoRecord[]>) {
    setPhotos(next)
    localStorage.setItem("atlas-section-photos-v2", JSON.stringify(next))
  }

  function addComment(sectionId: string, textOverride?: string) {
    const text = (textOverride || commentText).trim()
    if (!text) return

    const next = {
      ...comments,
      [sectionId]: [
        ...(comments[sectionId] || []),
        {
          id: String(Date.now()),
          text,
          createdAt: new Date().toLocaleString(),
        },
      ],
    }

    saveComments(next)
    setCommentText("")
  }

  function deleteComment(sectionId: string, commentId: string) {
    const next = {
      ...comments,
      [sectionId]: (comments[sectionId] || []).filter(
        (comment) => comment.id !== commentId
      ),
    }

    saveComments(next)
  }

  async function addPhotos(sectionId: string, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const uploaded = await Promise.all(
      files.map(
        (file) =>
          new Promise<PhotoRecord>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id: `${Date.now()}-${file.name}-${Math.random()}`,
                name: file.name,
                src: String(reader.result),
                createdAt: new Date().toLocaleString(),
              })
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
      )
    )

    const next = {
      ...photos,
      [sectionId]: [...(photos[sectionId] || []), ...uploaded],
    }

    savePhotos(next)
    event.target.value = ""
  }

  function deletePhoto(sectionId: string, photoId: string) {
    const next = {
      ...photos,
      [sectionId]: (photos[sectionId] || []).filter((photo) => photo.id !== photoId),
    }

    savePhotos(next)
  }

  function clearPhotos(sectionId: string) {
    const next = {
      ...photos,
      [sectionId]: [],
    }

    savePhotos(next)
  }

  function openSection(sectionId: string) {
    setSelectedSectionId(sectionId)
    setView("sections")
  }

  function startVoiceNote() {
    const SpeechRecognition = getSpeechRecognition()

    if (!SpeechRecognition) {
      setAssistantResponse(
        "Voice notes are not supported in this browser. Try Chrome or Edge on the laptop."
      )
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onresult = (event) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      setVoiceText(transcript)
      setAssistantInput(transcript)
    }

    recognition.onerror = () => {
      setListening(false)
      setAssistantResponse("Voice note failed. Try again or type the note.")
    }

    recognition.onend = () => {
      setListening(false)
    }

    setListening(true)
    recognition.start()
  }

  function askAtlas() {
    const query = assistantInput.trim().toLowerCase()

    if (!query) {
      setAssistantResponse("Ask a question or use voice note first.")
      return
    }

    const matches = [
      ...sections.map((item) => ({
        type: "Section",
        title: item.name,
        detail: item.summary,
      })),
      ...assets.map((item) => ({
        type: "Asset",
        title: item.name,
        detail: item.detail,
      })),
      ...vendors.map((item) => ({
        type: "Vendor",
        title: item.name,
        detail: item.detail,
      })),
      ...procedures.map((item) => ({
        type: "Procedure",
        title: item.title,
        detail: `${item.area}: ${item.steps.join(" → ")}`,
      })),
      ...documents.map((item) => ({
        type: "Document",
        title: item.title,
        detail: item.detail,
      })),
      ...work.map((item) => ({
        type: "Work",
        title: item.task,
        detail: `${item.area} • ${item.cadence} • Due: ${item.due}`,
      })),
    ].filter((item) =>
      [item.type, item.title, item.detail].join(" ").toLowerCase().includes(query)
    )

    if (!matches.length) {
      setAssistantResponse(
        `I did not find an exact Atlas record for "${assistantInput}". Add it as a comment or voice note to ${selectedSection.name}, or create a new record later when database editing is added.`
      )
      return
    }

    setAssistantResponse(
      matches
        .slice(0, 6)
        .map((item) => `${item.type}: ${item.title}\n${item.detail}`)
        .join("\n\n")
    )
  }

  function saveVoiceToSelectedSection() {
    const text = voiceText.trim() || assistantInput.trim()
    if (!text) return

    addComment(selectedSection.id, `Voice note: ${text}`)
    setAssistantResponse(`Voice note saved to ${selectedSection.name}.`)
    setVoiceText("")
  }

  return (
    <main className="atlas-root">
      <style>{styles}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="logo-row">
            <div className="logo-mark">✦</div>
            <div>
              <div className="logo-title">ATLAS</div>
              <div className="logo-sub">Atlas 2000</div>
            </div>
          </div>

          <SidebarButton icon="▦" label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <SidebarButton icon="⌖" label="Map" active={view === "map"} onClick={() => setView("map")} />
          <SidebarButton icon="▱" label="Sections" active={view === "sections"} onClick={() => setView("sections")} />
          <SidebarButton icon="◇" label="Assets" active={view === "assets"} onClick={() => setView("assets")} />
          <SidebarButton icon="♙" label="Vendors" active={view === "vendors"} onClick={() => setView("vendors")} />
          <SidebarButton icon="◷" label="Calendar" active={view === "calendar"} onClick={() => setView("calendar")} />
          <SidebarButton icon="☁" label="Weather" active={view === "weather"} onClick={() => setView("weather")} />
          <SidebarButton icon="▤" label="Documents" active={view === "documents"} onClick={() => setView("documents")} />
          <SidebarButton icon="☑" label="Procedures" active={view === "procedures"} onClick={() => setView("procedures")} />
          <SidebarButton icon="☰" label="Logs" active={view === "logs"} onClick={() => setView("logs")} />
          <SidebarButton icon="◆" label="AI Assistant" active={view === "assistant"} onClick={() => setView("assistant")} />
          <SidebarButton icon="♧" label="Team" active={view === "team"} onClick={() => setView("team")} />

          <div style={{ position: "absolute", bottom: 28, left: 28, right: 28, borderTop: "1px solid rgba(255,255,255,.16)", paddingTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #d7a64a", display: "grid", placeItems: "center", fontWeight: 900 }}>
                NT
              </div>
              <div>
                <div style={{ fontWeight: 800 }}>Nick</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>Estate Operations</div>
              </div>
            </div>
          </div>
        </aside>

        <section className="main">
          <TopBar search={search} setSearch={setSearch} />

          {view === "dashboard" && (
            <>
              <h1 className="page-title">Estate Dashboard</h1>
              <p className="page-sub">Welcome back. 2000 is ready for operations review.</p>

              <div className="metric-grid">
                <Metric title="Open Tasks" value="21" sub="8 overdue" icon="☑" red onClick={() => setView("calendar")} />
                <Metric title="Estate Sections" value={String(sections.length)} sub="View all sections" icon="⌂" onClick={() => setView("sections")} />
                <Metric title="Active Vendors" value={String(vendors.length)} sub="View all vendors" icon="♙" onClick={() => setView("vendors")} />
                <Metric title="Tracked Assets" value={String(assets.length)} sub="View all assets" icon="◇" onClick={() => setView("assets")} />
              </div>

              <div className="dash-grid">
                <Panel title="Interactive Property Map" action="View Full Map" onAction={() => setView("map")}>
                  <PropertyMap selectedId={selectedSectionId} onSelect={openSection} />
                </Panel>

                <Panel title="Estate Sections" action="View All" onAction={() => setView("sections")}>
                  {sections.slice(0, 7).map((section) => (
                    <SectionRow key={section.id} section={section} onClick={() => openSection(section.id)} />
                  ))}
                </Panel>
              </div>

              <div className="lower-grid">
                <Panel title="Recent Activity" action="View All" onAction={() => setView("logs")}>
                  {activity.map((item) => (
                    <ActivityRow key={item} text={item} />
                  ))}
                </Panel>

                <Panel title="Assets Overview" action="View Assets" onAction={() => setView("assets")}>
                  <AssetDonut />
                </Panel>

                <Panel title="Upcoming Maintenance" action="View Calendar" onAction={() => setView("calendar")}>
                  {work.slice(0, 5).map((item) => (
                    <WorkRow key={item.id} item={item} />
                  ))}
                </Panel>
              </div>
            </>
          )}

          {view === "map" && (
            <Page title="Interactive Property Map" subtitle="Click a marker to open that estate section.">
              <Panel title="2000 Property Map">
                <PropertyMap large selectedId={selectedSectionId} onSelect={openSection} />
              </Panel>
            </Page>
          )}

          {view === "sections" && (
            <Page title="Estate Sections" subtitle="Click a section to view details, add comments, add multiple photos, delete photos, and save voice notes.">
              <div className="two-col">
                <div style={{ display: "grid", gap: 12 }}>
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      className={`card click-card ${selectedSectionId === section.id ? "selected" : ""}`}
                      onClick={() => setSelectedSectionId(section.id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#d7a64a", fontWeight: 900, fontSize: 13 }}>{section.group}</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: "#07152f" }}>{section.name}</div>
                          <div style={{ color: "#6c7280", marginTop: 6 }}>{section.summary}</div>
                        </div>
                        <div style={{ fontSize: 28 }}>{section.icon}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <SectionDetail
                  section={selectedSection}
                  comments={comments[selectedSection.id] || []}
                  photos={photos[selectedSection.id] || []}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  addComment={() => addComment(selectedSection.id)}
                  deleteComment={(commentId) => deleteComment(selectedSection.id, commentId)}
                  addPhotos={(event) => addPhotos(selectedSection.id, event)}
                  deletePhoto={(photoId) => deletePhoto(selectedSection.id, photoId)}
                  clearPhotos={() => clearPhotos(selectedSection.id)}
                  startVoiceNote={startVoiceNote}
                  listening={listening}
                  voiceText={voiceText}
                  saveVoiceToSection={saveVoiceToSelectedSection}
                />
              </div>
            </Page>
          )}

          {view === "assets" && (
            <Page title="Assets" subtitle="Clickable 2000 equipment, systems, watercraft, appliances, and interior records.">
              <div className="asset-layout">
                <div style={{ display: "grid", gap: 10 }}>
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`card click-card ${selectedAssetId === asset.id ? "selected" : ""}`}
                    >
                      <div style={{ fontWeight: 900, color: "#07152f" }}>{asset.name}</div>
                      <div style={{ color: "#6c7280", marginTop: 5 }}>{asset.category} • {asset.section}</div>
                    </button>
                  ))}
                </div>

                <div className="card" style={{ padding: 28 }}>
                  <div style={{ color: "#d7a64a", fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>{selectedAsset.status}</div>
                  <h2 style={{ fontSize: 34, color: "#07152f", marginBottom: 6 }}>{selectedAsset.name}</h2>
                  <div style={{ color: "#6c7280", fontWeight: 700 }}>{selectedAsset.category} • {selectedAsset.section}</div>
                  <p style={{ color: "#13213b", lineHeight: 1.7, fontSize: 17 }}>{selectedAsset.detail}</p>
                </div>
              </div>
            </Page>
          )}

          {view === "vendors" && (
            <Page title="Vendors" subtitle="Vendor records and service categories.">
              <div className="grid">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="card" style={{ padding: 22 }}>
                    <div style={{ color: "#d7a64a", fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>{vendor.category}</div>
                    <h3 style={{ marginBottom: 4, fontSize: 24, color: "#07152f" }}>{vendor.name}</h3>
                    <div style={{ color: "#0f7a55", fontWeight: 800 }}>{vendor.status}</div>
                    <p style={{ color: "#6c7280", lineHeight: 1.55 }}>{vendor.detail}</p>
                  </div>
                ))}
              </div>
            </Page>
          )}

          {view === "calendar" && (
            <Page title="Calendar" subtitle="Upcoming maintenance and recurring work.">
              <Panel title="Upcoming Maintenance">
                {work.map((item) => (
                  <WorkRow key={item.id} item={item} />
                ))}
              </Panel>
            </Page>
          )}

          {view === "weather" && (
            <Page title="Weather" subtitle="Weather planning for grounds, dock, pool, painting, and seasonal work.">
              <div className="card" style={{ padding: 34, background: "linear-gradient(135deg, #ffffff, #f3f7fb)" }}>
                <div style={{ color: "#d7a64a", fontWeight: 900, letterSpacing: 3 }}>WEATHER MODULE</div>
                <h2 style={{ fontSize: 42, color: "#07152f", marginBottom: 10 }}>Forecast Ready to Connect</h2>
                <p style={{ color: "#6c7280", fontSize: 17, lineHeight: 1.7, maxWidth: 850 }}>
                  This section is prepared for rain, wind, freeze alerts, painting windows, dock conditions, irrigation planning, pool conditions, and grounds recommendations.
                </p>
              </div>
            </Page>
          )}

          {view === "documents" && (
            <Page title="Documents" subtitle="Manuals, invoices, equipment labels, PDFs, procedures, and records.">
              <div className="grid">
                {documents.map((doc) => (
                  <div key={doc.id} className="card" style={{ padding: 22 }}>
                    <div style={{ color: "#d7a64a", fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>{doc.kind}</div>
                    <h3 style={{ color: "#07152f", fontSize: 22 }}>{doc.title}</h3>
                    <div style={{ color: "#0b2448", fontWeight: 800 }}>{doc.section}</div>
                    <p style={{ color: "#6c7280" }}>{doc.detail}</p>
                  </div>
                ))}
              </div>
            </Page>
          )}

          {view === "procedures" && (
            <Page title="Procedures" subtitle="Operating procedures and recurring checklists.">
              <div className="grid">
                {procedures.map((procedure) => (
                  <div key={procedure.id} className="card" style={{ padding: 22 }}>
                    <div style={{ color: "#d7a64a", fontWeight: 900 }}>{procedure.status}</div>
                    <h3 style={{ color: "#07152f", fontSize: 22 }}>{procedure.title}</h3>
                    <div style={{ color: "#0b2448", fontWeight: 800 }}>{procedure.area}</div>
                    <ol style={{ color: "#6c7280", lineHeight: 1.7 }}>
                      {procedure.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </Page>
          )}

          {view === "logs" && (
            <Page title="Logs" subtitle="Recent estate activity and operating history.">
              <Panel title="Activity Log">
                {activity.map((item) => (
                  <ActivityRow key={item} text={item} />
                ))}
              </Panel>
            </Page>
          )}

          {view === "assistant" && (
            <Page title="AI Assistant" subtitle="Local Atlas assistant for searching records and saving voice notes.">
              <div className="assistant-box">
                <div className="card" style={{ padding: 24 }}>
                  <h2 style={{ color: "#07152f", marginTop: 0 }}>Ask Atlas</h2>
                  <textarea
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    placeholder="Ask about boilers, dock, pool, spa, Sunstream lift boxes, vendors, procedures, documents..."
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <button className="primary" onClick={askAtlas}>Ask Atlas</button>
                    <button className="secondary" onClick={startVoiceNote}>
                      {listening ? "Listening..." : "Start Voice Note"}
                    </button>
                    <button className="secondary" onClick={saveVoiceToSelectedSection}>
                      Save Voice to {selectedSection.name}
                    </button>
                  </div>

                  {voiceText ? (
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ color: "#07152f" }}>Captured Voice Note</h3>
                      <div className="assistant-response">{voiceText}</div>
                    </div>
                  ) : null}
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h2 style={{ color: "#07152f", marginTop: 0 }}>Assistant Response</h2>
                  <div className="assistant-response">{assistantResponse}</div>
                  <p style={{ color: "#6c7280", marginTop: 16 }}>
                    This first version searches the built-in Atlas records and saves local notes. A true cloud AI assistant can be connected after storage/database is stable.
                  </p>
                </div>
              </div>
            </Page>
          )}

          {view === "team" && (
            <Page title="Team" subtitle="People, roles, and access can be added here.">
              <div className="grid">
                <div className="card" style={{ padding: 22 }}>
                  <h3 style={{ color: "#07152f" }}>Estate Operations</h3>
                  <p style={{ color: "#6c7280" }}>Primary operating role for 2000 systems, records, and maintenance.</p>
                </div>
                <div className="card" style={{ padding: 22 }}>
                  <h3 style={{ color: "#07152f" }}>Owners</h3>
                  <p style={{ color: "#6c7280" }}>Owner-facing dashboard, records, and questions can be added here.</p>
                </div>
              </div>
            </Page>
          )}
        </section>
      </div>
    </main>
  )
}

function SidebarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={`side-button ${active ? "active" : ""}`} onClick={onClick}>
      <span className="side-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function TopBar({
  search,
  setSearch,
}: {
  search: string
  setSearch: (value: string) => void
}) {
  return (
    <div className="topbar">
      <div style={{ flex: 1 }} />
      <div className="search">
        <span style={{ color: "#6c7280" }}>⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Atlas..." />
      </div>
      <div className="icon-circle">!</div>
      <div className="icon-circle">?</div>
      <div className="icon-circle dark">NT</div>
    </div>
  )
}

function Metric({
  title,
  value,
  sub,
  icon,
  red,
  onClick,
}: {
  title: string
  value: string
  sub: string
  icon: string
  red?: boolean
  onClick: () => void
}) {
  return (
    <button className="card metric" onClick={onClick}>
      <div className="metric-top">
        <div className="metric-icon">{icon}</div>
        <div style={{ fontSize: 28, color: "#6c7280" }}>›</div>
      </div>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      <div className={`metric-sub ${red ? "red" : ""}`}>{sub}</div>
    </button>
  )
}

function Panel({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="panel-head">
        <h2 className="panel-title">{title}</h2>
        {action ? <button className="link-button" onClick={onAction}>{action}</button> : null}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  )
}

function PropertyMap({
  selectedId,
  onSelect,
  large,
}: {
  selectedId: string
  onSelect: (id: string) => void
  large?: boolean
}) {
  return (
    <div className={`map-box ${large ? "large" : ""}`}>
      <div className="map-texture" />
      <div className="map-control">
        {["+", "−", "◎", "▱"].map((control) => (
          <div key={control}>{control}</div>
        ))}
      </div>

      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`marker ${selectedId === section.id ? "selected" : ""}`}
          style={{ left: `${section.mapX}%`, top: `${section.mapY}%` }}
          title={section.name}
        >
          <span>{section.icon}</span>
          <span>{section.name}</span>
        </button>
      ))}

      <div style={{ position: "absolute", right: 22, bottom: 22, width: 76, height: 76, borderRadius: "50%", background: "white", display: "grid", placeItems: "center", color: "#07152f", fontWeight: 900, boxShadow: "0 8px 20px rgba(0,0,0,.18)" }}>
        N
      </div>
    </div>
  )
}

function SectionRow({ section, onClick }: { section: SectionRecord; onClick: () => void }) {
  return (
    <button className="section-row" onClick={onClick}>
      <div className="row-icon">{section.icon}</div>
      <div>
        <div style={{ fontWeight: 900, color: "#07152f" }}>{section.name}</div>
        <div style={{ color: "#6c7280", fontSize: 13 }}>{section.assets} assets • {section.openTasks} open tasks</div>
      </div>
      <div style={{ color: "#6c7280", fontSize: 24 }}>›</div>
    </button>
  )
}

function ActivityRow({ text }: { text: string }) {
  return (
    <div className="activity-row">
      <div className="small-dot">☑</div>
      <div>
        <div style={{ color: "#07152f", fontWeight: 800 }}>{text}</div>
        <div style={{ color: "#6c7280", fontSize: 12 }}>Atlas system activity</div>
      </div>
    </div>
  )
}

function WorkRow({ item }: { item: WorkRecord }) {
  return (
    <div className="work-row">
      <div className="small-dot">◷</div>
      <div>
        <div style={{ color: "#07152f", fontWeight: 900 }}>{item.task}</div>
        <div style={{ color: "#6c7280", fontSize: 13 }}>{item.area} • {item.cadence}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "#07152f", fontWeight: 800 }}>{item.due}</div>
        <div style={{ color: item.priority === "Normal" ? "#d7a64a" : "#c2410c", fontSize: 12, fontWeight: 900 }}>
          {item.priority}
        </div>
      </div>
    </div>
  )
}

function AssetDonut() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", gap: 18 }}>
      <div style={{ width: 140, height: 140, borderRadius: "50%", background: "conic-gradient(#071a36 0 30%, #d7a64a 30% 50%, #64748b 50% 72%, #cbd5e1 72% 100%)", display: "grid", placeItems: "center" }}>
        <div style={{ width: 82, height: 82, borderRadius: "50%", background: "white", display: "grid", placeItems: "center", textAlign: "center" }}>
          <strong style={{ fontSize: 26, color: "#07152f" }}>{assets.length}</strong>
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {["Mechanical", "Pool / Spa", "Dock", "Interior", "Watercraft"].map((item) => (
          <div key={item} style={{ display: "flex", justifyContent: "space-between", color: "#13213b" }}>
            <span>{item}</span>
            <strong>{assets.filter((asset) => asset.category.includes(item.split(" ")[0])).length || 2}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function Page({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">{subtitle}</p>
      <div style={{ marginTop: 24 }}>{children}</div>
    </>
  )
}

function SectionDetail({
  section,
  comments,
  photos,
  commentText,
  setCommentText,
  addComment,
  deleteComment,
  addPhotos,
  deletePhoto,
  clearPhotos,
  startVoiceNote,
  listening,
  voiceText,
  saveVoiceToSection,
}: {
  section: SectionRecord
  comments: CommentRecord[]
  photos: PhotoRecord[]
  commentText: string
  setCommentText: (value: string) => void
  addComment: () => void
  deleteComment: (commentId: string) => void
  addPhotos: (event: ChangeEvent<HTMLInputElement>) => void
  deletePhoto: (photoId: string) => void
  clearPhotos: () => void
  startVoiceNote: () => void
  listening: boolean
  voiceText: string
  saveVoiceToSection: () => void
}) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ color: "#d7a64a", fontWeight: 900, letterSpacing: 2 }}>{section.group}</div>
      <h2 style={{ color: "#07152f", fontSize: 34, marginBottom: 6 }}>{section.name}</h2>
      <p style={{ color: "#6c7280", lineHeight: 1.6 }}>{section.summary}</p>

      <div className="detail-stat-grid">
        <div className="detail-stat">
          <div style={{ color: "#6c7280", fontSize: 12 }}>ASSETS</div>
          <strong style={{ fontSize: 28, color: "#07152f" }}>{section.assets}</strong>
        </div>
        <div className="detail-stat">
          <div style={{ color: "#6c7280", fontSize: 12 }}>OPEN TASKS</div>
          <strong style={{ fontSize: 28, color: "#07152f" }}>{section.openTasks}</strong>
        </div>
      </div>

      <h3 style={{ color: "#07152f" }}>Add Comment</h3>
      <textarea
        value={commentText}
        onChange={(event) => setCommentText(event.target.value)}
        placeholder={`Add a comment to ${section.name}...`}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button className="primary" onClick={addComment}>Save Comment</button>
        <button className="secondary" onClick={startVoiceNote}>{listening ? "Listening..." : "Start Voice Note"}</button>
        <button className="secondary" onClick={saveVoiceToSection}>Save Voice Note</button>
      </div>

      {voiceText ? (
        <div className="comment" style={{ marginTop: 12 }}>
          <strong>Captured voice note:</strong>
          <div>{voiceText}</div>
        </div>
      ) : null}

      <h3 style={{ color: "#07152f", marginTop: 24 }}>Add Photos</h3>
      <input type="file" accept="image/*" multiple onChange={addPhotos} />
      {photos.length ? (
        <button className="danger" onClick={clearPhotos} style={{ marginLeft: 10 }}>
          Clear All Photos
        </button>
      ) : null}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: "#07152f" }}>Comments</h3>
        {comments.length ? (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <div>{comment.text}</div>
              <div style={{ color: "#6c7280", fontSize: 12, marginTop: 6 }}>{comment.createdAt}</div>
              <button className="danger" onClick={() => deleteComment(comment.id)} style={{ marginTop: 8 }}>Delete</button>
            </div>
          ))
        ) : (
          <p style={{ color: "#6c7280" }}>No comments yet.</p>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: "#07152f" }}>Photos</h3>
        {photos.length ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-card">
                <img src={photo.src} alt={photo.name} />
                <div style={{ color: "#6c7280", fontSize: 11, marginTop: 4 }}>{photo.name}</div>
                <button className="danger" onClick={() => deletePhoto(photo.id)} style={{ marginTop: 6 }}>Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#6c7280" }}>No photos added to this section yet.</p>
        )}
      </div>
    </div>
  )
}
