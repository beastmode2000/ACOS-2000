"use client";

import { useEffect } from "react";

type AssetRecord = {
  id?: string;
  name?: string;
  locationId?: string;
  locationIds?: string[];
  category?: string;
  make?: string;
  model?: string;
};

type WorkOrderRecord = {
  id?: string;
  title?: string;
  assetId?: string;
  locationId?: string;
  recurring?: boolean;
  recurrenceUnit?: string;
  workCategory?: string;
  responsibilityArea?: string;
  [key: string]: unknown;
};

type AtlasPayload = {
  ok?: boolean;
  assetRecords?: AssetRecord[];
  serviceRecords?: WorkOrderRecord[];
};

const REPAIR_KEY = "atlas-annual-service-asset-links-v1";

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSubject(title: unknown) {
  return normalize(title)
    .replace(/\bannual\b/g, " ")
    .replace(/\byearly\b/g, " ")
    .replace(/\bservice\b/g, " ")
    .replace(/\bmaintenance\b/g, " ")
    .replace(/\bpreventive\b/g, " ")
    .replace(/\bpreventative\b/g, " ")
    .replace(/\binspection\b/g, " ")
    .replace(/\btune up\b/g, " ")
    .replace(/\bcheck\b/g, " ")
    .replace(/\bcleaning\b/g, " ")
    .replace(/\bclean\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAnnual(workOrder: WorkOrderRecord) {
  const title = normalize(workOrder.title);
  const unit = normalize(workOrder.recurrenceUnit);
  return (
    title.includes("annual") ||
    title.includes("yearly") ||
    ["year", "years", "annual", "annually", "yearly"].includes(unit)
  );
}

function excludedWorkOrder(workOrder: WorkOrderRecord) {
  const text = normalize(
    [
      workOrder.title,
      workOrder.workCategory,
      workOrder.responsibilityArea,
    ].join(" "),
  );

  return [
    "pool",
    "spa",
    "hot tub",
    "garage door",
    "vehicle",
    "automotive",
    "ford",
    "raptor",
    "rivian",
    "porsche",
    "mercedes",
    "sea doo",
    "seadoo",
    "boat",
    "watercraft",
    "pwc",
    "irrigation",
    "sprinkler",
  ].some((term) => text.includes(term));
}

function excludedAsset(asset: AssetRecord) {
  const text = normalize([asset.name, asset.category].join(" "));
  return [
    "pool",
    "spa",
    "hot tub",
    "garage door",
    "vehicle",
    "automotive",
    "ford",
    "raptor",
    "rivian",
    "porsche",
    "mercedes",
    "sea doo",
    "seadoo",
    "boat",
    "watercraft",
    "pwc",
    "irrigation",
    "sprinkler",
  ].some((term) => text.includes(term));
}

const aliasGroups: string[][] = [
  ["dishwasher"],
  ["refrigerator", "fridge"],
  ["freezer"],
  ["range"],
  ["oven"],
  ["cooktop"],
  ["microwave"],
  ["warming drawer"],
  ["ice maker", "icemaker"],
  ["coffee maker", "coffee machine"],
  ["washer", "washing machine"],
  ["dryer"],
  ["garbage disposal", "disposal"],
  ["trash compactor", "compactor"],
  ["range hood", "hood"],
  ["boiler", "vitodens"],
  ["generator"],
  ["dehumidifier", "dehumidification", "desert aire"],
  ["water heater", "dhw", "vitocell"],
  ["air handler"],
  ["furnace"],
  ["heat pump"],
  ["hvac"],
];

function aliasesForWorkOrder(workOrder: WorkOrderRecord) {
  const text = normalize(workOrder.title);
  return aliasGroups.find((group) => group.some((alias) => text.includes(alias))) || [];
}

function assetText(asset: AssetRecord) {
  return normalize([asset.name, asset.category, asset.make, asset.model].join(" "));
}

function assetLocationIds(asset: AssetRecord) {
  const ids = new Set<string>();
  if (asset.locationId) ids.add(String(asset.locationId));
  for (const id of Array.isArray(asset.locationIds) ? asset.locationIds : []) {
    if (id) ids.add(String(id));
  }
  return ids;
}

function scoreCandidate(workOrder: WorkOrderRecord, asset: AssetRecord) {
  if (!asset.id || !asset.name || excludedAsset(asset)) return -1;

  const subject = titleSubject(workOrder.title);
  const text = assetText(asset);
  const aliases = aliasesForWorkOrder(workOrder);

  if (aliases.length && !aliases.some((alias) => text.includes(alias))) {
    return -1;
  }

  let score = 0;
  const workLocationId = String(workOrder.locationId || "").trim();

  if (workLocationId) {
    if (assetLocationIds(asset).has(workLocationId)) score += 120;
    else score -= 30;
  }

  const assetName = normalize(asset.name);

  if (subject && assetName === subject) score += 140;
  else if (subject && assetName.includes(subject)) score += 100;
  else if (subject && subject.includes(assetName) && assetName.length >= 5) score += 90;

  if (aliases.length) score += 60;

  const subjectTokens = subject
    .split(" ")
    .filter((token) => token.length >= 4);
  const matchingTokens = subjectTokens.filter((token) => text.includes(token));
  score += matchingTokens.length * 18;

  return score;
}

function chooseAsset(workOrder: WorkOrderRecord, assets: AssetRecord[]) {
  const ranked = assets
    .map((asset) => ({ asset, score: scoreCandidate(workOrder, asset) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || normalize(a.asset.name).localeCompare(normalize(b.asset.name)));

  const top = ranked[0];
  if (!top) return null;

  const second = ranked[1];
  const aliases = aliasesForWorkOrder(workOrder);
  const hasLocation = Boolean(String(workOrder.locationId || "").trim());
  const minimumScore = hasLocation ? 150 : aliases.length ? 95 : 125;

  if (top.score < minimumScore) return null;
  if (second && top.score - second.score < 30) return null;

  return top.asset;
}

async function saveWorkOrder(workOrder: WorkOrderRecord, assetId: string) {
  const response = await fetch("/api/atlas", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-request-id": `annual-asset-link-${workOrder.id || Date.now()}`,
    },
    body: JSON.stringify({
      table: "work_orders",
      propertyId: "2000",
      record: {
        ...workOrder,
        propertyId: "2000",
        assetId,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  return Boolean(response.ok && payload?.ok !== false);
}

export default function AtlasAnnualServiceAssetRepair() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/login")) return;
    if (window.localStorage.getItem(REPAIR_KEY) === "complete") return;

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch("/api/atlas?propertyId=2000", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok || cancelled) return;

        const payload = (await response.json().catch(() => ({}))) as AtlasPayload;
        if (!payload?.ok || cancelled) return;

        const assets = Array.isArray(payload.assetRecords) ? payload.assetRecords : [];
        const workOrders = Array.isArray(payload.serviceRecords) ? payload.serviceRecords : [];

        const candidates = workOrders.filter(
          (workOrder) =>
            workOrder?.id &&
            !String(workOrder.assetId || "").trim() &&
            isAnnual(workOrder) &&
            !excludedWorkOrder(workOrder),
        );

        let attempted = 0;
        let saved = 0;

        for (const workOrder of candidates) {
          if (cancelled) return;
          const asset = chooseAsset(workOrder, assets);
          if (!asset?.id) continue;

          attempted += 1;
          if (await saveWorkOrder(workOrder, String(asset.id))) saved += 1;
        }

        if (cancelled) return;

        window.localStorage.setItem(REPAIR_KEY, "complete");

        if (saved > 0) {
          window.dispatchEvent(new CustomEvent("atlas:data-changed"));
        }

        window.dispatchEvent(
          new CustomEvent("atlas:annual-service-asset-repair", {
            detail: { attempted, saved, reviewed: candidates.length },
          }),
        );
      } catch {
        // Leave the repair key unset so a later load can retry safely.
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
