"use client";

import { useState } from "react";

type AnyRow = Record<string, any>;
type Priority = "Low" | "Medium" | "High";

type Seed = {
  id: string;
  source?: string;
  title: string;
  priority?: Priority;
  notes: string;
  assetNames?: string[];
  vendorNames?: string[];
  extra?: AnyRow;
};

const IMPORT_DATE = "2026-07-10";
const BATCH = "Atlas screenshot intake batch — July 2026";

const vendors = [
  {
    id: "999201",
    name: "Sunstream Corporation",
    aliases: ["Sunstream", "Sunstream Corp"],
    category: "Boat Covers / Dock Equipment",
    phone: "253-395-0500",
    email: "jobber@sunstreamcorp.com",
    website: "www.sunstreamcorp.com",
    notes:
      "Automatic boat-cover equipment and service. Quote #520098 received July 10, 2026 for the 124-inch roller assembly replacement.",
  },
  {
    id: "999202",
    name: "Elliott Paint Company",
    aliases: ["Elliott Paint", "Elliott Painting"],
    category: "Painting / Exterior Restoration",
    phone: "206-510-0688",
    email: "brandon@elliottpaintco.com",
    notes:
      "Primary contact: Brandon Ness. Coordinating David's west-elevation cedar siding and carpentry repairs. Related contacts: Lane Harriman and Kurt Anderson.",
  },
];

function seed(
  id: string,
  source: string | undefined,
  title: string,
  notes: string,
  priority: Priority = "Medium",
  assetNames: string[] = [],
  vendorNames: string[] = [],
  extra: AnyRow = {},
): Seed {
  return {
    id,
    source,
    title,
    notes,
    priority,
    assetNames,
    vendorNames,
    extra,
  };
}

const workOrders: Seed[] = [
  seed(
    "999001",
    undefined,
    "Replace 124-inch roller assembly — Sunstream automatic boat cover",
    "Quote #520098. Remove the cover, replace the 124-inch roller assembly, reinstall the cover, and confirm fitment. Roller: $2,638.00. Labor: $600.00. Subtotal: $3,238.00. Tax and processing: $430.65. Total: $3,668.65. Deposit required: $1,834.33. Signed July 10, 2026. Valid through August 9, 2026.",
    "Medium",
    [
      "Sunstream Automatic Boat Cover",
      "Automatic Boat Cover",
      "Sunstream Boat Cover",
    ],
    ["Sunstream Corporation", "Sunstream"],
    {
      followUpDate: "2026-08-09",
      invoiceNumber: "Quote 520098",
      invoiceDate: "2026-07-10",
      invoiceAmount: "3668.65",
      invoiceStatus: "quote approved",
      paymentStatus: "deposit required",
      costCategory: "Boat Cover Repair",
      approvedBy: "Nicholas R. Thornton",
      approvedDate: "2026-07-10",
      costNotes:
        "Deposit required to begin: $1,834.33. Product 991948 — ASSY, ROLLER, 124-inch, ABC.",
    },
  ),

  seed(
    "999002",
    undefined,
    "West elevation cedar siding and carpentry repairs",
    "Approval requested for approximately $26,675 in additional repairs after demolition revealed the full west-elevation damage. Cedar siding materials are approximately 35%; the remainder is David's labor. David had billed approximately $8,000 to date, with any remaining invoicing still to be confirmed. Carpentry is separate from the Elliott Paint budget. Elliott Paint reported being about 25% into its paint budget.",
    "High",
    [],
    ["Elliott Paint Company", "Elliott Paint"],
    {
      invoiceAmount: "26675",
      invoiceStatus: "approval requested",
      paymentStatus: "unknown",
      costCategory: "Carpentry / Cedar Siding",
      costNotes:
        "Additional projected scope only. Exact accrued and outstanding totals still need confirmation.",
    },
  ),

  seed(
    "999003",
    undefined,
    "Verify Starlink email and complete support ticket",
    "Starlink email verification is required before the support ticket is submitted. The link expires after 24 hours. Do not store the temporary verification link in Atlas.",
    "High",
    ["Starlink", "Starlink Satellite"],
  ),

  seed(
    "900450",
    "450",
    "Clean and organize",
    "Open.",
  ),

  seed(
    "900444",
    "444",
    "Pressure Wash East Walkways",
    "Open.",
  ),

  seed(
    "900443",
    "443",
    "Pressure Wash Driveway",
    "Open.",
  ),

  seed(
    "900479",
    "479",
    "Clean painted drywall throughout house",
    "Open. Source title was truncated.",
  ),

  seed(
    "900454",
    "454",
    "Pressure Wash Sport Court",
    "Open.",
  ),

  seed(
    "900453",
    "453",
    "Pressure Wash Addition patio",
    "Open.",
  ),

  seed(
    "900452",
    "452",
    "Pressure Wash Original Patio",
    "Open.",
  ),

  seed(
    "900455",
    "455",
    "Pressure Wash Front Entry",
    "Open, Low priority.",
    "Low",
  ),

  seed(
    "900445",
    "445",
    "Pressure Wash Courtyard",
    "Open, Low priority.",
    "Low",
  ),

  seed(
    "900482",
    "482",
    "Clean window screens",
    "Open.",
  ),

  seed(
    "900521",
    "521",
    "Window cleaning",
    "Open. Requested by Delaney Martz.",
  ),

  seed(
    "900106",
    "106",
    "Window Indoor/outdoor",
    "Open.",
  ),

  seed(
    "900335",
    "335",
    "Clean and cover outdoor couch",
    "Open.",
  ),

  seed(
    "900477",
    "477",
    "De-Winterizing Cobalt",
    "Open, Medium priority.",
    "Medium",
    ["Cobalt R7", "Cobalt"],
  ),

  seed(
    "900334",
    "334",
    "Winterizing Cobalt",
    "Open, Medium priority.",
    "Medium",
    ["Cobalt R7", "Cobalt"],
  ),

  seed(
    "900480",
    "480",
    "De-winterizing SeaDoo",
    "Open, Medium priority.",
    "Medium",
    [
      "Sea-Doo 2024 GTI SE 170",
      "Sea-Doo",
      "Seadoo",
    ],
  ),

  seed(
    "900330",
    "330",
    "Winterizing SeaDoo",
    "Open, Medium priority.",
    "Medium",
    [
      "Sea-Doo 2024 GTI SE 170",
      "Sea-Doo",
      "Seadoo",
    ],
  ),

  seed(
    "900497",
    "497",
    "Renew Tabs for Cobalt",
    "Open.",
    "Medium",
    ["Cobalt R7", "Cobalt"],
  ),

  seed(
    "900496",
    "496",
    "Renew Tabs for SeaDoo",
    "Open.",
    "Medium",
    [
      "Sea-Doo 2024 GTI SE 170",
      "Sea-Doo",
      "Seadoo",
    ],
  ),

  seed(
    "900291",
    "291",
    "Sync Lift Key",
    "Open. Exact lift was not visible, so no asset is forced.",
  ),

  seed(
    "900492",
    "492",
    "Testing/Treating Pool",
    "Open and Overdue.",
    "Medium",
    ["Indoor Pool", "Pool"],
  ),

  seed(
    "900523",
    "523",
    "Hot Tub Maintenance",
    "Open, Medium priority.",
    "Medium",
    [
      "Sundance 880 Optima",
      "Hot Tub",
      "Standalone Spa",
    ],
  ),

  seed(
    "900190",
    "190",
    "Replacing UV bulb in Spa",
    "Open.",
    "Medium",
    [
      "Sundance 880 Optima",
      "Hot Tub",
      "Spa",
    ],
  ),

  seed(
    "900498",
    "498",
    "Install Outdoor Shower",
    "Open.",
  ),

  seed(
    "900346",
    "346",
    "Remove outdoor Shower",
    "Open, Low priority.",
    "Low",
  ),

  seed(
    "900199",
    "199",
    "Replace half (2) Mechanical Dampers",
    "Open, Low priority, and Overdue. Exact equipment was not visible.",
    "Low",
  ),

  seed(
    "900485",
    "485",
    "Replace HVAC Filters",
    "Open, Low priority.",
    "Low",
  ),

  seed(
    "900416",
    "416",
    "Blown Compressor",
    "Open, High priority. Exact mechanical asset was not visible.",
    "High",
  ),

  seed(
    "900389",
    "389",
    "Replace heat exchanger assembly",
    "Open, High priority. Possible Boiler 2 history match; asset link is intentionally not forced.",
    "High",
  ),

  seed(
    "900338",
    "338",
    "Boiler B-1",
    "Source status was In Progress; imported as Open with that status preserved here.",
    "Medium",
    [
      "Boiler 1",
      "Boiler B-1",
      "B-1",
    ],
  ),

  seed(
    "900387",
    "387",
    "Generator (Lower)",
    "Open, Medium priority.",
    "Medium",
    [
      "Generator Lower",
      "Lower Generator",
    ],
  ),

  seed(
    "900386",
    "386",
    "Generator (Upper)",
    "Open, Medium priority.",
    "Medium",
    [
      "Generator Upper",
      "Upper Generator",
    ],
  ),

  seed(
    "900230",
    "230",
    "Backflow Testing",
    "Open, Medium priority, and Overdue.",
  ),

  seed(
    "999004",
    undefined,
    "Winterize Live Roof Irrigation",
    "Partially visible source item. External number and full status were not shown; review later.",
  ),

  seed(
    "900272",
    "272",
    "Wine Chiller (Formal Dining Room)",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Wine Chiller",
      "Formal Dining Room Wine Chiller",
    ],
  ),

  seed(
    "900188",
    "188",
    "Freezer FR-2 [Pool]",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Freezer FR-2",
      "FR-2",
    ],
  ),

  seed(
    "900296",
    "296",
    "Refrigerator (Right)",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Refrigerator Right",
      "Refrigerator (Right)",
    ],
  ),

  seed(
    "900295",
    "295",
    "Refrigerator (Left)",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Refrigerator Left",
      "Refrigerator (Left)",
    ],
  ),

  seed(
    "900290",
    "290",
    "Dishwasher DW-2 [HM Office]",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Dishwasher DW-2",
      "DW-2",
    ],
  ),

  seed(
    "900289",
    "289",
    "Dishwasher DW-3 (Right)",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Dishwasher DW-3",
      "DW-3",
    ],
  ),

  seed(
    "900288",
    "288",
    "Dishwasher DW-4",
    "Source screenshot says Right, while Atlas may identify DW-4 as Left. Import does not change the asset side or location.",
    "Medium",
    [
      "Dishwasher DW-4",
      "DW-4",
    ],
  ),

  seed(
    "900284",
    "284",
    "Refrigerator [Fitness]",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Refrigerator Fitness",
      "Refrigerator [Fitness]",
    ],
  ),

  seed(
    "900377",
    "377",
    "Dryer DR-1",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Dryer DR-1",
      "DR-1",
    ],
  ),

  seed(
    "900376",
    "376",
    "Dryer DR-3 [HM Office]",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Dryer DR-3",
      "DR-3",
    ],
  ),

  seed(
    "900150",
    "150",
    "Dryer DR-2 [Pool]",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Dryer DR-2",
      "DR-2",
    ],
  ),

  seed(
    "900414",
    "414",
    "Dryer vents",
    "Source status was On Hold with Low priority; imported as Open with that status preserved here.",
    "Low",
  ),

  seed(
    "900297",
    "297",
    "Freezer FR-1",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Freezer FR-1",
      "FR-1",
    ],
  ),

  seed(
    "900172",
    "172",
    "Freezer FR-4 Right",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Freezer FR-4",
      "FR-4",
    ],
  ),

  seed(
    "900175",
    "175",
    "Freezer FR-5",
    "Source says Basement, while Atlas may place FR-5 in the Wine Room. Import does not change the asset location.",
    "Medium",
    [
      "Freezer FR-5",
      "FR-5",
    ],
  ),

  seed(
    "900176",
    "176",
    "Freezer FR-3 [Pool] Left",
    "Open, Medium priority. Requested by Delaney Martz.",
    "Medium",
    [
      "Freezer FR-3",
      "FR-3",
    ],
  ),

  seed(
    "900132",
    "132",
    "Water guard strip for Micah's shower",
    "Open.",
  ),

  seed(
    "900465",
    "465",
    "Replace batteries in Evi thermostat",
    "Open.",
  ),

  seed(
    "900464",
    "464",
    "Replace Batteries in Elan Thermostat",
    "Open. Source title was truncated.",
  ),

  seed(
    "900487",
    "487",
    "Floor bids",
    "Open.",
  ),

  seed(
    "900484",
    "484",
    "Install turn for beer dye table",
    "Title retained exactly as shown. Open.",
  ),

  seed(
    "900483",
    "483",
    "Investigate string lights",
    "Open.",
  ),

  seed(
    "900347",
    "347",
    "Holiday Tree",
    "Open, Medium priority.",
  ),

  seed(
    "900399",
    "399",
    "Sand Bags in Truck",
    "Open.",
  ),

  seed(
    "900522",
    "522",
    "Landscaping Help",
    "Open, Medium priority, and Overdue. It can be made recurring later.",
  ),
];

const calendarItem = {
  id: "999101",
  date: "2026-07-13",
  title:
    "10:00–11:00 AM — Walk Around 2000 Landscaping",
  area: "Landscaping",
  status: "Scheduled",
};

function norm(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function mergeText(
  oldValue: unknown,
  newValue: unknown,
) {
  const oldText = String(
    oldValue ?? "",
  ).trim();

  const newText = String(
    newValue ?? "",
  ).trim();

  if (!oldText) {
    return newText;
  }

  if (
    !newText ||
    norm(oldText).includes(norm(newText))
  ) {
    return oldText;
  }

  return `${oldText}\n\n${BATCH}\n${newText}`;
}

function findByName(
  rows: AnyRow[],
  names: string[],
) {
  const targets = names
    .map(norm)
    .filter(Boolean);

  const exact = rows.find((row) =>
    targets.includes(norm(row.name)),
  );

  if (exact) {
    return exact;
  }

  return rows.find((row) => {
    const name = norm(row.name);

    return targets.some(
      (target) =>
        target.length >= 6 &&
        (
          name.includes(target) ||
          target.includes(name)
        ),
    );
  });
}

function findWorkOrder(
  rows: AnyRow[],
  item: Seed,
) {
  const marker = item.source
    ? norm(
        `Imported source work order #${item.source}`,
      )
    : "";

  return rows.find(
    (row) =>
      String(row.id) === item.id ||
      (
        marker &&
        norm(row.notes).includes(marker)
      ) ||
      norm(row.title) === norm(item.title),
  );
}

async function requestJson(
  url: string,
  options?: RequestInit,
) {
  const response = await fetch(
    url,
    options,
  );

  const text = await response.text();

  let data: AnyRow = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    throw new Error(
      text ||
        `Request failed (${response.status})`,
    );
  }

  if (
    !response.ok ||
    data.ok === false
  ) {
    throw new Error(
      String(
        data.error ||
          `Request failed (${response.status})`,
      ),
    );
  }

  return data;
}

async function save(
  table: string,
  record: AnyRow,
) {
  await requestJson(
    "/api/atlas",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        table,
        record,
      }),
    },
  );
}

export default function AtlasIntakePage() {
  const [busy, setBusy] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [message, setMessage] =
    useState("Ready to import.");

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState("");

  async function runImport() {
    setBusy(true);
    setProgress(0);
    setError("");
    setResult("");

    try {
      setMessage(
        "Loading current Atlas records...",
      );

      const atlas = await requestJson(
        "/api/atlas",
        {
          cache: "no-store",
        },
      );

      const currentVendors: AnyRow[] = [
        ...(atlas.vendorRecords || []),
      ];

      const assets: AnyRow[] = [
        ...(atlas.assetRecords || []),
      ];

      const currentWorkOrders: AnyRow[] = [
        ...(atlas.serviceRecords || []),
      ];

      const calendar: AnyRow[] = [
        ...(atlas.calendarItems || []),
      ];

      const vendorIds =
        new Map<string, string>();

      const total =
        vendors.length +
        workOrders.length +
        1;

      let done = 0;
      let vendorsCreated = 0;
      let vendorsUpdated = 0;
      let workOrdersCreated = 0;
      let workOrdersUpdated = 0;

      for (const item of vendors) {
        setMessage(
          `Saving vendor: ${item.name}`,
        );

        const existing = findByName(
          currentVendors,
          [
            item.name,
            ...item.aliases,
          ],
        );

        const record = {
          ...(existing || {}),
          id:
            existing?.id ||
            item.id,
          name: item.name,
          category:
            item.category ||
            existing?.category ||
            "General",
          phone:
            item.phone ||
            existing?.phone ||
            "",
          email:
            item.email ||
            existing?.email ||
            "",
          website:
            item.website ||
            existing?.website ||
            "",
          notes: mergeText(
            existing?.notes,
            item.notes,
          ),
          logoDataUrl:
            existing?.logoDataUrl ||
            "",
          documents:
            Array.isArray(
              existing?.documents,
            )
              ? existing.documents
              : [],
        };

        await save(
          "vendors",
          record,
        );

        if (existing) {
          vendorsUpdated++;
        } else {
          vendorsCreated++;
          currentVendors.push(record);
        }

        [
          item.name,
          ...item.aliases,
        ].forEach((name) =>
          vendorIds.set(
            norm(name),
            String(record.id),
          ),
        );

        done++;

        setProgress(
          Math.round(
            (done / total) * 100,
          ),
        );
      }

      for (const item of workOrders) {
        setMessage(
          `Saving work order: ${item.title}`,
        );

        const existing =
          findWorkOrder(
            currentWorkOrders,
            item,
          );

        const asset =
          findByName(
            assets,
            item.assetNames || [],
          );

        let vendorId =
          existing?.vendorId || "";

        for (
          const name of
          item.vendorNames || []
        ) {
          const id =
            vendorIds.get(
              norm(name),
            );

          if (id) {
            vendorId = id;
            break;
          }

          const vendor =
            findByName(
              currentVendors,
              [name],
            );

          if (vendor) {
            vendorId =
              String(vendor.id);

            break;
          }
        }

        const importedNotes =
          `${
            item.source
              ? `Imported source work order #${item.source}. `
              : ""
          }${item.notes}`.trim();

        const record = {
          ...(existing || {}),
          ...item.extra,

          id:
            existing?.id ||
            item.id,

          title: item.title,

          assetId:
            asset?.id ||
            existing?.assetId ||
            "",

          vendorId,

          procedureId:
            existing?.procedureId ||
            "",

          date:
            existing?.date ||
            IMPORT_DATE,

          status:
            existing?.status ===
            "Completed"
              ? "Completed"
              : "Open",

          priority:
            item.priority ||
            existing?.priority ||
            "Medium",

          notes: mergeText(
            existing?.notes,
            importedNotes,
          ),

          followUpDate:
            existing?.followUpDate ||
            item.extra?.followUpDate ||
            "",

          photos:
            Array.isArray(
              existing?.photos,
            )
              ? existing.photos
              : [],

          documents:
            Array.isArray(
              existing?.documents,
            )
              ? existing.documents
              : [],

          isRecurring:
            existing?.isRecurring ??
            false,

          recurrenceFrequency:
            existing
              ?.recurrenceFrequency ||
            "",

          recurrenceInterval:
            existing
              ?.recurrenceInterval ??
            1,

          recurrenceDays:
            existing
              ?.recurrenceDays ||
            "",

          recurrenceNextDue:
            existing
              ?.recurrenceNextDue ||
            "",

          recurrenceEndType:
            existing
              ?.recurrenceEndType ||
            "never",

          recurrenceEndDate:
            existing
              ?.recurrenceEndDate ||
            "",

          recurrenceCountLimit:
            existing
              ?.recurrenceCountLimit ||
            "",

          recurrenceCompletedCount:
            existing
              ?.recurrenceCompletedCount ??
            0,

          recurrenceStatus:
            existing
              ?.recurrenceStatus ||
            (
              existing?.isRecurring
                ? "active"
                : "inactive"
            ),

          parentWorkOrderId:
            existing
              ?.parentWorkOrderId ||
            "",

          invoiceDocumentIds:
            existing
              ?.invoiceDocumentIds ||
            "",

          costNotes:
            mergeText(
              existing?.costNotes,
              item.extra?.costNotes,
            ),
        };

        await save(
          "work_orders",
          record,
        );

        if (existing) {
          workOrdersUpdated++;
        } else {
          workOrdersCreated++;
          currentWorkOrders.push(
            record,
          );
        }

        done++;

        setProgress(
          Math.round(
            (done / total) * 100,
          ),
        );
      }

      setMessage(
        "Saving landscaping calendar item...",
      );

      const existingCalendar =
        calendar.find(
          (row) =>
            row.date ===
              calendarItem.date &&
            (
              norm(row.title) ===
                norm(
                  calendarItem.title,
                ) ||
              norm(
                row.title,
              ).includes(
                "walk around 2000 landscaping",
              )
            ),
        );

      await save(
        "calendar",
        {
          ...(existingCalendar || {}),
          ...calendarItem,

          id:
            existingCalendar?.id ||
            calendarItem.id,

          status:
            existingCalendar
              ?.status ===
            "Completed"
              ? "Completed"
              : "Scheduled",
        },
      );

      setProgress(100);

      setMessage(
        "Import complete. Existing records and photos were preserved.",
      );

      setResult(
        `Vendors: ${vendorsCreated} created, ${vendorsUpdated} updated. Work orders: ${workOrdersCreated} created, ${workOrdersUpdated} updated. Calendar: ${
          existingCalendar
            ? "updated"
            : "created"
        }.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Import failed.",
      );

      setMessage(
        "Import stopped.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          background: #f5f7fa;
        }

        .page {
          min-height: 100dvh;
          padding: 18px;
          color: #172331;
          font-family: Arial, sans-serif;
        }

        .shell {
          width: min(100%, 820px);
          margin: auto;
          display: grid;
          gap: 15px;
        }

        .hero,
        .card {
          padding: 22px;
          border-radius: 22px;
        }

        .hero {
          color: white;
          background:
            linear-gradient(
              135deg,
              #0b1e33,
              #163b5c
            );
        }

        .hero b {
          color: #c99a3d;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 6px 0 8px;
          font-size:
            clamp(
              30px,
              6vw,
              42px
            );
        }

        .hero p,
        .card p {
          line-height: 1.45;
        }

        .hero p {
          margin: 0;
          color: #d9e2eb;
        }

        .card {
          background: white;
          border:
            1px solid #dce4ec;
          box-shadow:
            0 12px 30px
            rgba(
              11,
              30,
              51,
              0.07
            );
        }

        .card h2 {
          margin: 0 0 8px;
          color: #0b1e33;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              1fr
            );
          gap: 10px;
          margin: 14px 0;
        }

        .stat {
          padding: 13px;
          border:
            1px solid #dce4ec;
          border-radius: 14px;
          background: #f8fafc;
        }

        .stat strong {
          display: block;
          font-size: 25px;
          color: #0b1e33;
        }

        .warn {
          padding: 12px;
          border-left:
            4px solid #c99a3d;
          border-radius: 10px;
          background: #fff8e6;
          line-height: 1.45;
        }

        .button {
          width: 100%;
          min-height: 54px;
          margin-top: 15px;
          border: 0;
          border-radius: 14px;
          background: #c99a3d;
          color: #0b1e33;
          font-weight: 900;
          font-size: 17px;
        }

        .button:disabled {
          opacity: 0.6;
        }

        .track {
          height: 14px;
          margin-top: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: #e8eef5;
        }

        .bar {
          height: 100%;
          background: #c99a3d;
        }

        .message {
          margin-top: 10px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .error,
        .result {
          margin-top: 12px;
          padding: 12px;
          border-radius: 12px;
          font-weight: 800;
        }

        .error {
          color: #b42318;
          background: #feecec;
        }

        .result {
          color: #087443;
          background: #eaf7f1;
        }

        .links {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .links a {
          flex: 1;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border:
            1px solid #dce4ec;
          border-radius: 12px;
          color: #0b1e33;
          text-decoration: none;
          font-weight: 900;
        }

        @media (
          max-width: 620px
        ) {
          .page {
            padding: 9px;
          }

          .hero,
          .card {
            padding: 16px;
            border-radius: 17px;
          }

          .stats {
            grid-template-columns:
              1fr;
          }

          .links {
            display: grid;
          }

          .links a {
            width: 100%;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <b>Atlas / 2000</b>

          <h1>
            Screenshot Intake Import
          </h1>

          <p>
            Safe one-time import
            for the records
            extracted from your
            screenshots.
          </p>
        </section>

        <section className="card">
          <h2>Ready to import</h2>

          <div className="stats">
            <div className="stat">
              <strong>
                {vendors.length}
              </strong>

              Vendor updates
            </div>

            <div className="stat">
              <strong>
                {workOrders.length}
              </strong>

              Work orders
            </div>

            <div className="stat">
              <strong>1</strong>

              Calendar item
            </div>
          </div>

          <div className="warn">
            This does not delete
            records or change asset
            photos. Completed work
            orders remain completed.
            DW-4 side, FR-5
            location, and the Boiler
            2 heat-exchanger link are
            not forced.
          </div>

          <button
            className="button"
            type="button"
            onClick={runImport}
            disabled={busy}
          >
            {busy
              ? `Importing… ${progress}%`
              : "Import Into Atlas"}
          </button>

          <div className="track">
            <div
              className="bar"
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <div
            className="message"
            role="status"
          >
            {message}
          </div>

          {error ? (
            <div className="error">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="result">
              {result}
            </div>
          ) : null}

          {result ? (
            <div className="links">
              <a href="/">
                Open Atlas
              </a>

              <a href="/?section=work-orders">
                Review Work Orders
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
