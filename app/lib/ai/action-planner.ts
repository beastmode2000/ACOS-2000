import type { SearchResult } from "../atlas-types";

export type PendingAssistantAction =
  | {
      id: string;
      kind: "work-order";
      title: string;
      notes: string;
      priority: "Low" | "Medium" | "High";
      assetId: string;
      vendorId: string;
    }
  | {
      id: string;
      kind: "calendar";
      title: string;
      notes: string;
      date: string;
      time: string;
      allDay: boolean;
      linkedId: string;
      linkedName: string;
      linkedType: "None" | "Asset" | "Vendor" | "Work Order";
    }
  | {
      id: string;
      kind: "procedure";
      title: string;
      purpose: string;
      linkedAssetIds: string[];
      linkedLocationIds: string[];
      linkedVendorIds: string[];
    };

type PlannerOptions = {
  question: string;
  matches: SearchResult[];
  today: string;
  addDays: (date: string, days: number) => string;
  createId: (prefix: string) => string;
};

function cleanActionTitle(question: string, fallback: string) {
  const cleaned = question
    .replace(
      /\b(create|make|add|prepare|draft|schedule|put|new|a|an|the|work order|calendar event|event|procedure|for|on my calendar)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,.:;-]+|[,.:;-]+$/g, "");

  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function planAssistantAction({
  question,
  matches,
  today,
  addDays,
  createId,
}: PlannerOptions): PendingAssistantAction | null {
  const normalized = question.toLowerCase();
  const asset = matches.find((item) => item.type === "Asset");
  const vendor = matches.find((item) => item.type === "Vendor");
  const location = matches.find((item) => item.type === "Location");

  if (
    /\b(create|make|add|prepare|draft)\b/.test(normalized) &&
    /\bwork order\b/.test(normalized)
  ) {
    const priority: "Low" | "Medium" | "High" =
      /\b(urgent|high priority|emergency|asap)\b/.test(normalized)
        ? "High"
        : /\blow priority\b/.test(normalized)
          ? "Low"
          : "Medium";

    return {
      id: createId("assistant-action"),
      kind: "work-order",
      title: cleanActionTitle(
        question,
        asset ? `Service ${asset.title}` : "New Work Order",
      ),
      notes: `Prepared by Ask Atlas from: "${question}"`,
      priority,
      assetId: asset?.assetId || "",
      vendorId: vendor?.vendorId || "",
    };
  }

  if (
    /\b(schedule|add|put|create|make)\b/.test(normalized) &&
    /\b(calendar|event|appointment|visit|meeting|tomorrow|today|next week)\b/.test(
      normalized,
    )
  ) {
    const date = /\btomorrow\b/.test(normalized)
      ? addDays(today, 1)
      : /\bnext week\b/.test(normalized)
        ? addDays(today, 7)
        : today;

    const timeMatch = question.match(
      /\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b/i,
    );

    let time = "";
    if (timeMatch) {
      let hour = Number(timeMatch[1]);
      const minute = timeMatch[2] || "00";
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === "pm" && hour !== 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      time = `${String(hour).padStart(2, "0")}:${minute}`;
    }

    const linkedType: "None" | "Asset" | "Vendor" | "Work Order" =
      asset ? "Asset" : vendor ? "Vendor" : "None";

    return {
      id: createId("assistant-action"),
      kind: "calendar",
      title: cleanActionTitle(
        question,
        asset ? `${asset.title} follow-up` : "New Calendar Event",
      ),
      notes: `Prepared by Ask Atlas from: "${question}"`,
      date,
      time,
      allDay: !time,
      linkedId: asset?.assetId || vendor?.vendorId || "",
      linkedName: asset?.title || vendor?.title || "",
      linkedType,
    };
  }

  if (
    /\b(create|make|prepare|draft)\b/.test(normalized) &&
    /\bprocedure|checklist|sop\b/.test(normalized)
  ) {
    return {
      id: createId("assistant-action"),
      kind: "procedure",
      title: cleanActionTitle(
        question,
        asset ? `${asset.title} Procedure` : "New Procedure",
      ),
      purpose: `Prepared by Ask Atlas from: "${question}"`,
      linkedAssetIds: asset?.assetId ? [asset.assetId] : [],
      linkedLocationIds: location?.locationId ? [location.locationId] : [],
      linkedVendorIds: vendor?.vendorId ? [vendor.vendorId] : [],
    };
  }

  return null;
}

