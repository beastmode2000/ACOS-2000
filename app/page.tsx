"use client";

import React, { useMemo, useState } from "react";

type AtlasMode = "private2000" | "blankCanvas";

type RecordType =
  | "asset"
  | "vendor"
  | "procedure"
  | "emergency"
  | "map"
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
  confidence: "High" | "Medium" | "Low";
};

type AskAnswer = {
  answer: string;
  confidence: "High" | "Medium" | "Low";
  sources: AtlasRecord[];
  nextSteps: string[];
};

const ATLAS_RECORDS: AtlasRecord[] = [
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
      "Cover label says secondary high limit inside.",
      "Known boiler nameplate details include MAWP water 60 PSI.",
      "Maximum water temperature is 210°F.",
      "Heating surface is 31.99 sq ft.",
      "Minimum relief valve capacity is 255.9 lb/hr.",
      "CRN recorded as R1497.5C.",
    ],
    tags: [
      "boiler",
      "b1",
      "viessmann",
      "vitodens",
      "mechanical room",
      "hydronic",
      "heat",
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
      "Serial number captured: 758960507593.",
      "Year built: 2025.",
      "MAWP water: 60 PSI.",
      "Maximum water temperature: 210°F.",
      "Heating surface: 31.99 sq ft.",
      "Minimum relief valve capacity: 255.9 lb/hr.",
      "CRN: R1497.5C.",
      "Low-water cutoff/control includes McDonnell & Miller GuardDog Low Water Cut-Off model 751P-MT-120.",
    ],
    tags: [
      "boiler",
      "b2",
      "new boiler",
      "viessmann",
      "vitodens",
      "mechanical room",
      "guarddog",
      "low water",
    ],
    confidence: "High",
  },
  {
    id: "vitocell-dhw",
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
      "hot water",
      "dhw",
      "domestic hot water",
      "vitocell",
      "viessmann",
      "water heater",
      "mechanical room",
    ],
    confidence: "High",
  },
  {
    id: "sundance-spa",
    mode: "private2000",
    type: "asset",
    title: "Sundance Optima Spa / Hot Tub",
    location: "Spa / Hot Tub Area",
    category: "Spa / Hot Tub",
    summary:
      "The standalone spa is a Sundance 880-series Optima unit with ClearRay UV-C equipment.",
    details: [
      "Date on nameplate: 03/21/15.",
      "Model: Optima.",
      "Serial number captured: 00P3LCD-100528521-0315.",
      "Electrical rating: 240 V, single phase, 60 Hz.",
      "Breaker size listed: 40/50/60 A depending configuration.",
      "Control area includes Spa Control System enclosure and LCD controller part #6600-328 Rev E.",
      "ClearRay UV-C water purification/ballast equipment is present.",
    ],
    tags: [
      "spa",
      "hot tub",
      "sundance",
      "optima",
      "clearray",
      "uv",
      "heater",
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
      "Photos show lid-mounted solar panels.",
      "Photos show internal battery/control wiring.",
      "The newer Sunstream lift box is for the Cobalt boat lift.",
      "Each lift box should be tracked separately because they serve different craft/lifts.",
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
    ],
    confidence: "High",
  },
  {
    id: "cobalt-r7",
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
    tags: ["cobalt", "r7", "boat", "craft", "dock", "lift", "sunstream"],
    confidence: "Medium",
  },
  {
    id: "seadoo-2024",
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
      "Atlas should include a step-by-step pool backwash procedure with photos, valve positions, pump steps, and safety notes.",
    details: [
      "Include when to backwash.",
      "Include exact valve positions.",
      "Include pump off/on steps.",
      "Include rinse steps if applicable.",
      "Include where wastewater discharges.",
      "Include normal and abnormal pressure readings.",
    ],
    tags: ["pool", "backwash", "filter", "valves", "pump", "procedure"],
    confidence: "Medium",
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
    ],
    confidence: "Medium",
  },
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
      "Fields should include manufacturer, model, serial number, install date, fuel type, service vendor, reset procedure, photos, warranty, and emergency notes.",
      "Recommended linked records include boiler reset procedure, annual service procedure, mechanical room map, and emergency shutoff record.",
    ],
    tags: ["blank", "template", "boiler", "mechanical", "hydronic", "asset"],
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
      "Fields should include pump model, filter model, heater model, chemical system, valve photos, normal operating pressure, backwash procedure, and seasonal notes.",
      "Recommended linked records include pool vendor, backwash procedure, water chemistry notes, equipment map, and emergency shutoff notes.",
    ],
    tags: ["blank", "template", "pool", "pump", "filter", "backwash"],
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
      "Fields should include boat lift manufacturer, control box location, battery/solar details, watercraft assigned to lift, seasonal notes, vendor, photos, and safety notes.",
      "Recommended linked records include dock map, lift operation procedure, waterfront vendor, and winterization procedure.",
    ],
    tags: ["blank", "template", "dock", "waterfront", "boat lift", "watercraft"],
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
      "Fields should include vendor name, trade/category, contact person, phone, email, emergency availability, related assets, invoices, notes, and last service date.",
      "Recommended linked records include related assets, service history, invoices, and open follow-ups.",
    ],
    tags: ["blank", "template", "vendor", "service", "contact", "invoice"],
    confidence: "High",
  },
  {
    id: "blank-ask-atlas-template",
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
      "sources",
    ],
    confidence: "High",
  },
];

const STOP_WORDS = new Set([
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

function cleanText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
}

function getQuestionWords(question: string): string[] {
  return cleanText(question)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function scoreRecord(questionWords: string[], record: AtlasRecord): number {
  const searchable = cleanText(
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
    if (cleanText(record.title).includes(word)) score += 3;
    if (record.location && cleanText(record.location).includes(word)) score += 2;
    if (record.tags.some((tag) => cleanText(tag).includes(word))) score += 3;
  }

  const joined = questionWords.join(" ");

  if (joined.includes("water shutoff") && record.tags.includes("water shutoff")) {
    score += 10;
  }

  if (joined.includes("hot water") && record.tags.includes("hot water")) {
    score += 8;
  }

  if (joined.includes("sea doo") && record.tags.includes("sea doo")) {
    score += 8;
  }

  if (joined.includes("ask atlas") && record.tags.includes("ask atlas")) {
    score += 8;
  }

  return score;
}

function buildAnswer(question: string, records: AtlasRecord[]): AskAnswer {
  if (!question.trim()) {
    return {
      answer:
        "Ask Atlas a question about the property. Try: “What kind of boiler do we have?” or “What do we know about the Sunstream lift boxes?”",
      confidence: "Low",
      sources: [],
      nextSteps: ["Type a question above.", "Choose Atlas 2000 or Blank Canvas."],
    };
  }

  const words = getQuestionWords(question);

  const ranked = records
    .map((record) => ({
      record,
      score: scoreRecord(words, record),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const sources = ranked.slice(0, 4).map((item) => item.record);

  if (sources.length === 0) {
    return {
      answer:
        "I could not find that in the saved Atlas records yet. This should become an “add missing info” workflow so the property team can add the asset, photo, vendor, procedure, or note.",
      confidence: "Low",
      sources: [],
      nextSteps: [
        "Add a new asset record.",
        "Add a new procedure.",
        "Upload a photo or map.",
        "Link a vendor or service note.",
      ],
    };
  }

  const top = sources[0];
  const topScore = ranked[0].score;

  const confidence =
    topScore >= 10 || top.confidence === "High"
      ? "High"
      : topScore >= 5
      ? "Medium"
      : "Low";

  return {
    answer: `${top.summary} ${top.details.slice(0, 3).join(" ")}`,
    confidence,
    sources,
    nextSteps: [
      "Open the linked source record.",
      "Add photos if the record needs visual proof.",
      "Add a procedure if someone needs step-by-step instructions.",
      "Add vendor/service history if this involves maintenance.",
    ],
  };
}

function typeLabel(type: RecordType): string {
  if (type === "asset") return "Asset";
  if (type === "vendor") return "Vendor";
  if (type === "procedure") return "Procedure";
  if (type === "emergency") return "Emergency";
  if (type === "map") return "Map";
  if (type === "service") return "Service";
  return "Note";
}

function modeName(mode: AtlasMode): string {
  return mode === "private2000" ? "Atlas 2000" : "Blank Canvas";
}

export default function AskAtlasPage() {
  const [mode, setMode] = useState<AtlasMode>("private2000");
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");

  const visibleRecords = useMemo(() => {
    return ATLAS_RECORDS.filter(
      (record) => record.mode === mode || record.mode === "both"
    );
  }, [mode]);

  const answer = useMemo(() => {
    return buildAnswer(submittedQuestion || question, visibleRecords);
  }, [submittedQuestion, question, visibleRecords]);

  const sampleQuestions =
    mode === "private2000"
      ? [
          "What kind of boiler do we have?",
          "What do we know about the hot water tanks?",
          "Who handles the blinds?",
          "What do we know about the Sunstream lift boxes?",
          "What happened with the SeaDoo?",
          "Where should emergency shutoffs live?",
        ]
      : [
          "What should be in a boiler template?",
          "What should the pool equipment template include?",
          "How should Ask Atlas work?",
          "What should the dock template include?",
          "What should a vendor record track?",
        ];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-300">
                Atlas Estate OS
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                Ask Atlas
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                Ask a question about the property and Atlas answers from saved
                records, with source cards and confidence.
              </p>
            </div>

            <a
              href="/"
              className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg hover:bg-slate-100"
            >
              Back to Atlas Home
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setMode("private2000")}
              className={`rounded-2xl px-5 py-3 text-sm font-black ${
                mode === "private2000"
                  ? "bg-white text-slate-950"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Atlas 2000
            </button>

            <button
              onClick={() => setMode("blankCanvas")}
              className={`rounded-2xl px-5 py-3 text-sm font-black ${
                mode === "blankCanvas"
                  ? "bg-white text-slate-950"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              Blank Canvas
            </button>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setSubmittedQuestion(question);
              }}
              placeholder="Ask Atlas a property question..."
              className="min-h-12 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-950"
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
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
                Answer
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  answer.confidence === "High"
                    ? "bg-emerald-300 text-emerald-950"
                    : answer.confidence === "Medium"
                    ? "bg-yellow-300 text-yellow-950"
                    : "bg-red-300 text-red-950"
                }`}
              >
                Confidence: {answer.confidence}
              </span>

              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">
                {modeName(mode)}
              </span>
            </div>

            <p className="mt-5 text-lg leading-8 text-slate-100">
              {answer.answer}
            </p>

            <div className="mt-6 rounded-3xl bg-white/10 p-5">
              <h2 className="font-black">Next Steps</h2>

              <ul className="mt-3 space-y-2">
                {answer.nextSteps.map((step) => (
                  <li key={step} className="text-sm leading-6 text-slate-300">
                    • {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="font-black">Safety Rule</h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Ask Atlas should not reveal passwords, passcodes, private family
                information, or sensitive access codes. Emergency, electrical,
                gas, boiler, pool, and security answers should show sources and
                confidence.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-black">Sources Used</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              In the finished app, these cards should open the real asset,
              vendor, procedure, map, photo, or service note.
            </p>

            <div className="mt-5 space-y-4">
              {answer.sources.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-500">
                  No source found yet.
                </div>
              ) : (
                answer.sources.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-3xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        {typeLabel(source.type)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {source.category}
                      </span>
                    </div>

                    <h3 className="mt-3 font-black text-slate-950">
                      {source.title}
                    </h3>

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
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Saved Records in This Mode</h2>

              <p className="mt-2 text-sm text-slate-600">
                Current mode: {modeName(mode)}. Records shown:{" "}
                {visibleRecords.length}.
              </p>
            </div>

            <p className="text-sm font-bold text-slate-500">
              Ask Atlas v1 — Safe separate page
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {visibleRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-3xl border border-slate-200 p-5"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  {typeLabel(record.type)}
                </p>

                <h3 className="mt-2 font-black text-slate-950">
                  {record.title}
                </h3>

                {record.location && (
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {record.location}
                  </p>
                )}

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {record.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
