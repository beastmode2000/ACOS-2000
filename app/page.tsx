"use client";

import React, { useMemo, useState } from "react";

type AtlasMode = "private2000" | "blankCanvas";

type Section =
  | "dashboard"
  | "ask"
  | "assets"
  | "locations"
  | "vendors"
  | "procedures"
  | "blank";

type RecordType =
  | "asset"
  | "location"
  | "vendor"
  | "procedure"
  | "map"
  | "emergency"
  | "service"
  | "note";

type AtlasRecord = {
  id: string;
  mode: AtlasMode | "both";
  type: RecordType;
  title: string;
  location?: string;
  category: string;
  summary: string;
  details: string[];
  tags: string[];
  confidence?: "High" | "Medium" | "Low";
};

type AskAnswer = {
  directAnswer: string;
  confidence: "High" | "Medium" | "Low";
  sources: AtlasRecord[];
  suggestions: string[];
};

const PRIVATE_2000_RECORDS: AtlasRecord[] = [
  {
    id: "boiler-b1",
    mode: "private2000",
    type: "asset",
    title: "Boiler B-1",
    location: "Mechanical Room",
    category: "Boiler / Hydronic Heat",
    summary:
      "Boiler B-1 is a Viessmann Vitodens 200 wall-mounted boiler in the Mechanical Room.",
    details: [
      "Manufacturer: Viessmann.",
      "Model family: Vitodens 200.",
      "Located in the Mechanical Room.",
      "Cover label notes secondary high limit inside.",
      "Known boiler nameplate details include MAWP water 60 PSI, maximum water temperature 210°F, heating surface 31.99 sq ft, minimum relief valve capacity 255.9 lb/hr, and CRN R1497.5C.",
    ],
    tags: [
      "boiler",
      "b1",
      "vitodens",
      "viessmann",
      "mechanical",
      "hydronic",
      "heat",
      "high limit",
      "mawp",
    ],
    confidence: "High",
  },
  {
    id: "boiler-b2-new",
    mode: "private2000",
    type: "asset",
    title: "Boiler B-2 New",
    location: "Mechanical Room",
    category: "Boiler / Hydronic Heat",
    summary:
      "Boiler B-2 New is a newer Viessmann Vitodens 200 boiler in the Mechanical Room.",
    details: [
      "Manufacturer: Viessmann.",
      "Model family: Vitodens 200.",
      "Serial number previously captured: 758960507593.",
      "Year built: 2025.",
      "MAWP water: 60 PSI.",
      "Maximum water temperature: 210°F.",
      "Heating surface: 31.99 sq ft.",
      "Minimum relief valve capacity: 255.9 lb/hr.",
      "CRN: R1497.5C.",
      "Low-water cutoff/control details include McDonnell & Miller GuardDog Low Water Cut-Off model 751P-MT-120.",
    ],
    tags: [
      "boiler",
      "b2",
      "new",
      "vitodens",
      "viessmann",
      "mechanical",
      "hydronic",
      "serial",
      "2025",
      "guarddog",
      "low water",
    ],
    confidence: "High",
  },
  {
    id: "dhw-vitocell",
    mode: "private2000",
    type: "asset",
    title: "Twin Viessmann Vitocell 300-V DHW Tanks",
    location: "Mechanical Room",
    category: "Domestic Hot Water",
    summary:
      "The domestic hot water system includes twin gray Viessmann Vitocell 300-V indirect-fired storage tanks.",
    details: [
      "Model shown: EVIA 300.",
      "Capacity: 79 USG / 300 L.",
      "Stainless steel tank / heat exchanger material listed as AISI 444 / 316 Ti.",
      "Heat exchanger coil storage capacity: 2.9 USG / 11 L.",
      "Maximum heat exchanger water temperature: 248°F / 120°C.",
      "Maximum tank working pressure: 150 psig.",
    ],
    tags: [
      "domestic hot water",
      "dhw",
      "water heater",
      "hot water",
      "vitocell",
      "viessmann",
      "mechanical",
      "storage tank",
    ],
    confidence: "High",
  },
  {
    id: "spa-sundance-optima",
    mode: "private2000",
    type: "asset",
    title: "Sundance Optima Spa / Hot Tub",
    location: "Standalone Spa / Hot Tub Area",
    category: "Spa / Hot Tub",
    summary:
      "The standalone spa is a Sundance 880-series Optima unit with HydroQuip / Therm Products heating and ClearRay UV-C equipment.",
    details: [
      "Brand: Sundance.",
      "Series/model: 880-series Optima.",
      "Date on nameplate: 03/21/15.",
      "Serial number captured: 00P3LCD-100528521-0315.",
      "Electrical rating: 240 V, single phase, 60 Hz.",
      "Breaker size listed: 40/50/60 A depending configuration.",
      "Control equipment includes a Spa Control System enclosure and LCD controller part #6600-328 Rev E.",
      "Water treatment equipment includes ClearRay UV-C ballast/equipment.",
      "Rust/corrosion was visible at some cabinet/nameplate screws and lower compartment/floor areas.",
    ],
    tags: [
      "spa",
      "hot tub",
      "sundance",
      "optima",
      "880",
      "clearray",
      "hydroquip",
      "heater",
      "uv",
    ],
    confidence: "High",
  },
  {
    id: "sunstream-lift-boxes",
    mode: "private2000",
    type: "asset",
    title: "Sunstream Lift Boxes",
    location: "Dock",
    category: "Dock / Boat Lifts",
    summary:
      "There are multiple Sunstream boat lift control/battery/solar boxes on the dock, and they are not all the same.",
    details: [
      "White Sunstream lift boxes are mounted at the dock.",
      "Photos show lid-mounted solar panels and internal battery/control wiring.",
      "The newer Sunstream lift box is for the Cobalt boat lift.",
      "Lift boxes should be tracked separately because they serve different craft/lifts.",
    ],
    tags: [
      "dock",
      "sunstream",
      "boat lift",
      "lift box",
      "cobalt",
      "seadoo",
      "solar",
      "battery",
      "waterfront",
    ],
    confidence: "High",
  },
  {
    id: "craft-cobalt",
    mode: "private2000",
    type: "asset",
    title: "Craft — Cobalt R-7",
    location: "Dock",
    category: "Boat / Watercraft",
    summary:
      "The Cobalt R-7 is tracked as a dock/watercraft asset and should be linked to its lift and dock equipment.",
    details: [
      "Asset name: Craft-Cobalt R-7.",
      "Location: Dock.",
      "Related equipment: newer Sunstream lift box for the Cobalt lift.",
      "Should include photos, lift procedure, service history, winterization notes, and vendor records.",
    ],
    tags: [
      "cobalt",
      "r7",
      "boat",
      "craft",
      "dock",
      "lift",
      "sunstream",
      "watercraft",
    ],
    confidence: "Medium",
  },
  {
    id: "craft-seadoo",
    mode: "private2000",
    type: "asset",
    title: "Craft — SeaDoo 2024",
    location: "Dock",
    category: "Boat / Watercraft",
    summary:
      "The 2024 SeaDoo is tracked as a dock/watercraft asset and should include repair notes, photos, and pickup/service history.",
    details: [
      "Asset name: Craft-SeaDoo 2024.",
      "Location: Dock.",
      "Known context: repairs were documented after Luke’s SeaDoo was crashed into the prior year.",
      "Related documentation should include repair photos and invoice records.",
    ],
    tags: [
      "seadoo",
      "sea doo",
      "jetski",
      "watercraft",
      "dock",
      "repair",
      "luke",
      "invoice",
    ],
    confidence: "Medium",
  },
  {
    id: "pool-backwash",
    mode: "both",
    type: "procedure",
    title: "Pool Backwash Procedure",
    location: "Pool Equipment Area",
    category: "Pool Procedure",
    summary:
      "A pool backwash procedure should live in Atlas as a step-by-step maintenance procedure with photos, valve positions, and safety notes.",
    details: [
      "Procedure should include when to backwash.",
      "Procedure should include exact valve positions.",
      "Procedure should include pump off/on steps.",
      "Procedure should include rinse steps if applicable.",
      "Procedure should include where wastewater discharges.",
      "Procedure should include what readings or pressure changes indicate success.",
    ],
    tags: [
      "pool",
      "backwash",
      "procedure",
      "filter",
      "valves",
      "pump",
      "maintenance",
    ],
    confidence: "Medium",
  },
  {
    id: "indoor-pool-construction",
    mode: "private2000",
    type: "note",
    title: "Indoor Pool Construction — First Floor of Addition",
    location: "Addition / First Floor",
    category: "Construction Record",
    summary:
      "Photo record shows indoor pool construction on the first floor of the addition.",
    details: [
      "Concrete pool shell/trench area visible.",
      "Wet concrete/finished surface work in progress.",
      "Temporary construction lighting and hoses visible.",
      "Worker present in construction area.",
      "Caption: Indoor pool construction — first floor of addition.",
    ],
    tags: [
      "indoor pool",
      "construction",
      "addition",
      "first floor",
      "photo",
      "pool shell",
    ],
    confidence: "High",
  },
  {
    id: "penthouse-drapery",
    mode: "private2000",
    type: "vendor",
    title: "Penthouse Drapery",
    location: "Blinds / Shades",
    category: "Vendor — Drapery / Roller Shades",
    summary:
      "Penthouse Drapery is linked to drapery/roller shade service and should be connected to the Blinds Lutron asset.",
    details: [
      "Vendor category: Drapery / motorized roller shade service.",
      "Known invoice: #176396 dated 06/16/2026.",
      "Related asset: Blinds Lutron / motorized roller shade asset.",
      "Use for repair/service history related to shades and drapery.",
    ],
    tags: [
      "vendor",
      "drapery",
      "blinds",
      "lutron",
      "roller shade",
      "invoice",
      "penthouse",
    ],
    confidence: "High",
  },
  {
    id: "emergency-shutoffs",
    mode: "both",
    type: "emergency",
    title: "Emergency Shutoffs",
    location: "Whole Property",
    category: "Emergency",
    summary:
      "Atlas should include a dedicated emergency section for shutoffs, utility controls, and urgent response steps.",
    details: [
      "Track main domestic water shutoff.",
      "Track gas shutoff.",
      "Track electrical shutoffs and panels.",
      "Track generator controls.",
      "Track pool/spa emergency steps.",
      "Track leak response.",
      "Track emergency vendors.",
      "Do not store raw passwords, passcodes, or private codes in normal notes.",
    ],
    tags: [
      "emergency",
      "shutoff",
      "water shutoff",
      "gas shutoff",
      "electrical",
      "generator",
      "leak",
      "urgent",
    ],
    confidence: "Medium",
  },
];

const BLANK_CANVAS_RECORDS: AtlasRecord[] = [
  {
    id: "blank-boiler-template",
    mode: "blankCanvas",
    type: "asset",
    title: "Boiler Asset Template",
    location: "Mechanical Room",
    category: "Blank Canvas Asset",
    summary:
      "Reusable boiler asset template for any estate with hydronic heat or boiler equipment.",
    details: [
      "Fields: manufacturer, model, serial number, install date, fuel type, service vendor, reset procedure, photos, nameplate, warranty, emergency notes.",
      "Recommended linked records: boiler reset procedure, annual service procedure, hydronic vendor, mechanical room map, emergency shutoff record.",
    ],
    tags: [
      "blank",
      "template",
      "boiler",
      "mechanical",
      "hydronic",
      "asset",
      "reset",
    ],
    confidence: "High",
  },
  {
    id: "blank-pool-template",
    mode: "blankCanvas",
    type: "asset",
    title: "Pool Equipment Template",
    location: "Pool Equipment Area",
    category: "Blank Canvas Asset",
    summary:
      "Reusable pool equipment template for pumps, filters, heaters, chemical systems, valves, and backwash instructions.",
    details: [
      "Fields: pump model, filter model, heater model, chemical system, valve photos, normal operating pressure, backwash procedure, seasonal opening/closing notes.",
      "Recommended linked records: pool vendor, backwash procedure, water chemistry notes, equipment map, emergency shutoff notes.",
    ],
    tags: [
      "blank",
      "template",
      "pool",
      "pump",
      "filter",
      "backwash",
      "heater",
      "valves",
    ],
    confidence: "High",
  },
  {
    id: "blank-dock-template",
    mode: "blankCanvas",
    type: "asset",
    title: "Dock / Waterfront Template",
    location: "Dock / Waterfront",
    category: "Blank Canvas Asset",
    summary:
      "Reusable dock and waterfront template for boat lifts, lift controls, watercraft, dock utilities, and seasonal procedures.",
    details: [
      "Fields: boat lift manufacturer, control box location, battery/solar details, watercraft assigned to lift, seasonal removal/install notes, vendor, photos, safety notes.",
      "Recommended linked records: dock map, lift operation procedure, waterfront vendor, winterization procedure.",
    ],
    tags: [
      "blank",
      "template",
      "dock",
      "waterfront",
      "boat lift",
      "watercraft",
      "seasonal",
    ],
    confidence: "High",
  },
  {
    id: "blank-vendor-template",
    mode: "blankCanvas",
    type: "vendor",
    title: "Vendor Record Template",
    location: "Whole Property",
    category: "Blank Canvas Vendor",
    summary:
      "Reusable vendor template for tracking who services each system and what assets they are connected to.",
    details: [
      "Fields: vendor name, trade/category, contact person, phone, email, emergency availability, related assets, invoices, insurance/licensing notes, last service date.",
      "Recommended linked records: related assets, service history, invoices, open follow-ups.",
    ],
    tags: [
      "blank",
      "template",
      "vendor",
      "service",
      "contact",
      "invoice",
      "maintenance",
    ],
    confidence: "High",
  },
  {
    id: "blank-ask-atlas",
    mode: "blankCanvas",
    type: "procedure",
    title: "Ask Atlas Property Assistant Template",
    location: "Whole Property",
    category: "Blank Canvas AI Feature",
    summary:
      "Reusable Ask Atlas assistant that answers property questions from saved Atlas records instead of guessing.",
    details: [
      "Should answer from property records only.",
      "Should show sources used.",
      "Should show confidence level.",
      "Should say when information is missing.",
      "Should avoid exposing passwords, private family information, or sensitive access codes.",
      "Should link answers back to assets, vendors, procedures, maps, photos, and service history.",
    ],
    tags: [
      "blank",
      "template",
      "ask atlas",
      "chat",
      "assistant",
      "ai",
      "property questions",
      "sources",
    ],
    confidence: "High",
  },
  {
    id: "blank-emergency-template",
    mode: "blankCanvas",
    type: "emergency",
    title: "Emergency Section Template",
    location: "Whole Property",
    category: "Blank Canvas Emergency",
    summary:
      "Reusable emergency template for water, gas, electrical, generator, leak, alarm, pool, and urgent vendor response.",
    details: [
      "Fields: system, shutoff location, photo, map pin, steps, emergency vendor, last verified date, confidence level.",
      "Sensitive credentials should be redacted or stored only in an admin-only credential system.",
    ],
    tags: [
      "blank",
      "template",
      "emergency",
      "shutoff",
      "water",
      "gas",
      "electric",
      "generator",
      "leak",
    ],
    confidence: "High",
  },
];

const ALL_RECORDS: AtlasRecord[] = [
  ...PRIVATE_2000_RECORDS,
  ...BLANK_CANVAS_RECORDS,
];

const stopWords = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "do",
  "does",
  "did",
  "what",
  "where",
  "who",
  "how",
  "when",
  "why",
  "we",
  "have",
  "has",
  "about",
  "tell",
  "me",
  "our",
  "this",
  "that",
  "it",
  "at",
  "from",
]);

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function getQuestionWords(question: string): string[] {
  return normalizeText(question)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function scoreRecord(questionWords: string[], record: AtlasRecord): number {
  const searchable = normalizeText(
    [
      record.title,
      record.location || "",
      record.category,
      record.summary,
      record.details.join(" "),
      record.tags.join(" "),
      record.type,
    ].join(" ")
  );

  let score = 0;

  for (const word of questionWords) {
    if (searchable.includes(word)) score += 1;
    if (normalizeText(record.title).includes(word)) score += 3;
    if (record.location && normalizeText(record.location).includes(word))
      score += 2;
    if (record.tags.some((tag) => normalizeText(tag).includes(word)))
      score += 3;
  }

  const joinedQuestion = questionWords.join(" ");

  if (
    joinedQuestion.includes("water shutoff") &&
    record.tags.includes("water shutoff")
  ) {
    score += 10;
  }

  if (joinedQuestion.includes("ask atlas") && record.title.includes("Ask Atlas")) {
    score += 10;
  }

  if (joinedQuestion.includes("hot water") && record.tags.includes("hot water")) {
    score += 8;
  }

  if (joinedQuestion.includes("sea doo") && record.tags.includes("sea doo")) {
    score += 8;
  }

  return score;
}

function buildAskAtlasAnswer(
  question: string,
  records: AtlasRecord[]
): AskAnswer {
  const trimmed = question.trim();

  if (!trimmed) {
    return {
      directAnswer:
        "Ask a question about the property, such as “What kind of boiler do we have?”, “Who handles the blinds?”, “Where is the water shutoff?”, or “What should be in the Blank Canvas version?”",
      confidence: "Low",
      sources: [],
      suggestions: [
        "Try asking about an asset, location, vendor, procedure, map, or emergency item.",
      ],
    };
  }

  const questionWords = getQuestionWords(trimmed);

  const ranked = records
    .map((record) => ({
      record,
      score: scoreRecord(questionWords, record),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const topSources = ranked.slice(0, 4).map((item) => item.record);

  if (topSources.length === 0) {
    return {
      directAnswer:
        "I could not find that in the saved Atlas records yet. This should become a missing-info prompt so the user can add the answer, photo, asset, vendor, or procedure.",
      confidence: "Low",
      sources: [],
      suggestions: [
        "Add a new asset record.",
        "Add a procedure.",
        "Upload a photo or map.",
        "Link a vendor or service note.",
      ],
    };
  }

  const top = topSources[0];

  let confidence: "High" | "Medium" | "Low" = "Medium";
  if (ranked[0].score >= 10 || top.confidence === "High") confidence = "High";
  if (ranked[0].score < 3) confidence = "Low";

  const detailPreview = top.details.slice(0, 3).join(" ");

  return {
    directAnswer: `${top.summary} ${detailPreview}`,
    confidence,
    sources: topSources,
    suggestions: [
      "Open the linked source record.",
      "Add photos if the record is missing visual proof.",
      "Add a procedure if someone may need step-by-step instructions.",
      "Add or update vendor/service history if this involves maintenance.",
    ],
  };
}

function typeBadge(type: RecordType): string {
  switch (type) {
    case "asset":
      return "Asset";
    case "location":
      return "Location";
    case "vendor":
      return "Vendor";
    case "procedure":
      return "Procedure";
    case "map":
      return "Map";
    case "emergency":
      return "Emergency";
    case "service":
      return "Service";
    case "note":
      return "Note";
    default:
      return "Record";
  }
}

function modeLabel(mode: AtlasMode): string {
  return mode === "private2000" ? "Atlas 2000" : "Blank Canvas";
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-lg"
          : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function RecordCard({ record }: { record: AtlasRecord }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
          {typeBadge(record.type)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {record.category}
        </span>
        {record.confidence && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Confidence: {record.confidence}
          </span>
        )}
      </div>

      <h3 className="text-lg font-black text-slate-950">{record.title}</h3>

      {record.location && (
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Location: {record.location}
        </p>
      )}

      <p className="mt-3 text-sm leading-6 text-slate-700">{record.summary}</p>

      <ul className="mt-4 space-y-2">
        {record.details.slice(0, 4).map((detail, index) => (
          <li key={index} className="text-sm leading-6 text-slate-600">
            • {detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
    </div>
  );
}

export default function AtlasPage() {
  const [section, setSection] = useState<Section>("dashboard");
  const [mode, setMode] = useState<AtlasMode>("private2000");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const visibleRecords = useMemo(() => {
    return ALL_RECORDS.filter(
      (record) => record.mode === mode || record.mode === "both"
    );
  }, [mode]);

  const answer = useMemo(() => {
    return buildAskAtlasAnswer(submittedQuestion || question, visibleRecords);
  }, [submittedQuestion, question, visibleRecords]);

  const assets = visibleRecords.filter((record) => record.type === "asset");
  const vendors = visibleRecords.filter((record) => record.type === "vendor");
  const procedures = visibleRecords.filter(
    (record) => record.type === "procedure" || record.type === "emergency"
  );

  const recentRecords = visibleRecords.slice(0, 5);

  const sampleQuestions =
    mode === "private2000"
      ? [
          "What kind of boiler do we have?",
          "What do we know about the hot water tanks?",
          "Who handles the blinds?",
          "What happened with the SeaDoo repair?",
          "What do we know about the Sunstream lift boxes?",
          "Where should emergency shutoffs live?",
        ]
      : [
          "What should be in a boiler template?",
          "How should Ask Atlas work?",
          "What should the pool equipment template include?",
          "What should be in the emergency section?",
          "What should a vendor record track?",
        ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-300">
                Atlas Estate OS
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                Private Estate Operating System
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Assets, vendors, procedures, maps, service history, emergency
                notes, and Ask Atlas property intelligence in one place.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-2 backdrop-blur">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("private2000")}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                    mode === "private2000"
                      ? "bg-white text-slate-950"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Atlas 2000
                </button>
                <button
                  onClick={() => setMode("blankCanvas")}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                    mode === "blankCanvas"
                      ? "bg-white text-slate-950"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Blank Canvas
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav className="mt-5 flex flex-wrap gap-3">
          <NavButton
            active={section === "dashboard"}
            onClick={() => setSection("dashboard")}
          >
            Dashboard
          </NavButton>
          <NavButton active={section === "ask"} onClick={() => setSection("ask")}>
            Ask Atlas
          </NavButton>
          <NavButton
            active={section === "assets"}
            onClick={() => setSection("assets")}
          >
            Assets
          </NavButton>
          <NavButton
            active={section === "vendors"}
            onClick={() => setSection("vendors")}
          >
            Vendors
          </NavButton>
          <NavButton
            active={section === "procedures"}
            onClick={() => setSection("procedures")}
          >
            Procedures
          </NavButton>
          <NavButton active={section === "blank"} onClick={() => setSection("blank")}>
            Product Split
          </NavButton>
        </nav>

        {section === "dashboard" && (
          <section className="mt-6">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                Current Mode
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {modeLabel(mode)}
              </h2>
              <p className="mt-2 max-w-3xl text-slate-600">
                {mode === "private2000"
                  ? "Private working version with real 2000 estate records, assets, procedures, notes, and documentation."
                  : "Sellable reusable template with no private 2000 property information."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                label="Saved Records"
                value={String(visibleRecords.length)}
                note="Assets, vendors, procedures, notes, and emergency records."
              />
              <StatCard
                label="Assets"
                value={String(assets.length)}
                note="Equipment, systems, watercraft, and property components."
              />
              <StatCard
                label="Vendors"
                value={String(vendors.length)}
                note="Service providers connected to assets and invoices."
              />
              <StatCard
                label="Ask Atlas"
                value="Live"
                note="Question-answer system using saved Atlas records."
              />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-xl font-black">Ask Atlas Preview</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ask a normal question about the property and Atlas will answer
                  from saved records with source cards.
                </p>
                <button
                  onClick={() => setSection("ask")}
                  className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800"
                >
                  Open Ask Atlas
                </button>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-xl font-black">Recent Records</h3>
                <div className="mt-4 space-y-3">
                  {recentRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {record.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {typeBadge(record.type)} • {record.category}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {section === "ask" && (
          <section className="mt-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                    Property Intelligence
                  </p>
                  <h2 className="mt-2 text-4xl font-black text-slate-950">
                    Ask Atlas
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    Ask questions about assets, vendors, emergency info,
                    procedures, service history, maps, or the Blank Canvas
                    template. Atlas answers from saved records and shows its
                    sources.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                  Mode: {modeLabel(mode)}
                </div>
              </div>

              <div className="mt-6">
                <label className="text-sm font-black text-slate-700">
                  Ask a property question
                </label>
                <div className="mt-2 flex flex-col gap-3 md:flex-row">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSubmittedQuestion(question);
                      }
                    }}
                    placeholder="Example: What kind of boiler do we have?"
                    className="min-h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none ring-slate-950 focus:ring-2"
                  />
                  <button
                    onClick={() => setSubmittedQuestion(question)}
                    className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800"
                  >
                    Ask
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {sampleQuestions.map((sample) => (
                    <button
                      key={sample}
                      onClick={() => {
                        setQuestion(sample);
                        setSubmittedQuestion(sample);
                      }}
                      className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
                    Answer
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      answer.confidence === "High"
                        ? "bg-emerald-400 text-emerald-950"
                        : answer.confidence === "Medium"
                        ? "bg-yellow-300 text-yellow-950"
                        : "bg-red-300 text-red-950"
                    }`}
                  >
                    Confidence: {answer.confidence}
                  </span>
                </div>

                <p className="mt-5 text-lg leading-8 text-slate-100">
                  {answer.directAnswer}
                </p>

                <div className="mt-6 rounded-3xl bg-white/10 p-5">
                  <h3 className="font-black">What Atlas should do next</h3>
                  <ul className="mt-3 space-y-2">
                    {answer.suggestions.map((suggestion) => (
                      <li
                        key={suggestion}
                        className="text-sm leading-6 text-slate-300"
                      >
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="font-black">Safety Rule</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Ask Atlas should never reveal raw passwords, access codes,
                    private family information, or sensitive credentials in
                    normal answers. Emergency, electrical, gas, boiler, pool, and
                    security answers should link to verified procedures and show
                    confidence.
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-xl font-black">Sources Used</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  These are the records Atlas used to answer. In the full app,
                  each source should open the real asset, vendor, photo,
                  procedure, map, or service note.
                </p>

                <div className="mt-5 space-y-4">
                  {answer.sources.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-500">
                      No source found yet. This should become an “Add missing
                      record” workflow.
                    </div>
                  ) : (
                    answer.sources.map((source) => (
                      <div
                        key={source.id}
                        className="rounded-3xl border border-slate-200 p-5"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                            {typeBadge(source.type)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {source.category}
                          </span>
                        </div>
                        <h4 className="mt-3 font-black text-slate-950">
                          {source.title}
                        </h4>
                        {source.location && (
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {source.location}
                          </p>
                        )}
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {source.summary}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {section === "assets" && (
          <section className="mt-6">
            <div className="mb-5">
              <h2 className="text-3xl font-black">Assets</h2>
              <p className="mt-2 text-slate-600">
                Equipment and property systems saved in {modeLabel(mode)}.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {assets.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </section>
        )}

        {section === "vendors" && (
          <section className="mt-6">
            <div className="mb-5">
              <h2 className="text-3xl font-black">Vendors</h2>
              <p className="mt-2 text-slate-600">
                Vendor records should connect to assets, invoices, service
                history, and procedures.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {vendors.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
                  No vendor records in this mode yet.
                </div>
              ) : (
                vendors.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))
              )}
            </div>
          </section>
        )}

        {section === "procedures" && (
          <section className="mt-6">
            <div className="mb-5">
              <h2 className="text-3xl font-black">Procedures & Emergency</h2>
              <p className="mt-2 text-slate-600">
                Step-by-step procedures, safety notes, emergency response, and
                shutoff records.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {procedures.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </section>
        )}

        {section === "blank" && (
          <section className="mt-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">
                Product Strategy
              </p>
              <h2 className="mt-2 text-4xl font-black">
                Atlas 2000 + Blank Canvas
              </h2>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                Every new Atlas feature should be separated into the private
                property data layer and the reusable product/template layer. This
                keeps 2000 useful while turning the same structure into a
                sellable estate operating system.
              </p>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-3xl bg-slate-950 p-6 text-white">
                  <h3 className="text-2xl font-black">Atlas 2000</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Private working version for the real estate/property
                    records. This includes actual assets, procedures, vendors,
                    service notes, photos, maps, invoices, and property-specific
                    information.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-slate-300">
                    <li>• Real asset records</li>
                    <li>• Real property locations</li>
                    <li>• Real vendors and invoices</li>
                    <li>• Real procedures and service notes</li>
                    <li>• Real maps and photos</li>
                  </ul>
                </div>

                <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
                  <h3 className="text-2xl font-black">Blank Canvas</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Reusable sellable template with no private property data. It
                    uses generic estate locations, sample assets, sample
                    procedures, and demo Ask Atlas records.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-slate-600">
                    <li>• Generic asset templates</li>
                    <li>• Generic estate locations</li>
                    <li>• Generic vendor templates</li>
                    <li>• Generic procedures</li>
                    <li>• Demo Ask Atlas questions</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-slate-100 p-6">
                <h3 className="text-xl font-black">Build Rule</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  If a feature helps any large estate, it belongs in the Atlas
                  Estate OS core. If it only describes the real property, it
                  belongs in Atlas 2000. If it helps explain or sell Atlas, it
                  belongs in the demo/sales layer.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {BLANK_CANVAS_RECORDS.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
