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
    }
  | {
      id: string;
      kind: "work-order-update";
      targetId: string;
      targetTitle: string;
      status?: "Open" | "Scheduled" | "Completed" | "Monitor" | "In Progress" | "Waiting";
      priority?: "Low" | "Medium" | "High";
      noteToAppend?: string;
    }
  | {
      id: string;
      kind: "calendar-update";
      targetId: string;
      targetTitle: string;
      date: string;
      time: string;
      allDay: boolean;
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

function parseDate(question: string, today: string, addDays: (date: string, days: number) => string) {
  const normalized = question.toLowerCase();
  if (/\btomorrow\b/.test(normalized)) return addDays(today, 1);
  if (/\bnext week\b/.test(normalized)) return addDays(today, 7);
  if (/\btoday\b/.test(normalized)) return today;

  const isoMatch = question.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return isoMatch[0];

  return today;
}

function parseTime(question: string) {
  const timeMatch = question.match(
    /\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b/i,
  );

  if (!timeMatch) return "";

  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2] || "00";
  const meridiem = timeMatch[3].toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseWorkOrderStatus(question: string) {
  const normalized = question.toLowerCase();

  if (/\b(completed|complete|done|finished|close|closed)\b/.test(normalized)) {
    return "Completed" as const;
  }
  if (/\b(in progress|started|start working)\b/.test(normalized)) {
    return "In Progress" as const;
  }
  if (/\b(waiting|on hold)\b/.test(normalized)) {
    return "Waiting" as const;
  }
  if (/\b(scheduled)\b/.test(normalized)) {
    return "Scheduled" as const;
  }
  if (/\b(monitor|watch)\b/.test(normalized)) {
    return "Monitor" as const;
  }
  if (/\b(reopen|open)\b/.test(normalized)) {
    return "Open" as const;
  }

  return undefined;
}

function parsePriority(question: string) {
  const normalized = question.toLowerCase();
  if (/\b(high priority|urgent|emergency|asap)\b/.test(normalized)) {
    return "High" as const;
  }
  if (/\b(low priority)\b/.test(normalized)) {
    return "Low" as const;
  }
  if (/\b(medium priority|normal priority)\b/.test(normalized)) {
    return "Medium" as const;
  }
  return undefined;
}

function parseNote(question: string) {
  const match = question.match(/\b(?:add|append)\s+(?:a\s+)?note(?:\s+that)?\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
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
  const workOrder = matches.find((item) => item.type === "Work Order");
  const calendar = matches.find((item) => item.type === "Calendar");

  const requestedStatus = parseWorkOrderStatus(question);
  const requestedPriority = parsePriority(question);
  const requestedNote = parseNote(question);
  const isQuestionOnly =
    /\?$/.test(question.trim()) ||
    /^(what|which|who|where|when|why|how|show|list|find|are|is|do|does|can|could|should|would)\b/.test(
      normalized.trim(),
    );
  const hasExplicitUpdateCommand =
    /\b(update|edit|change|mark|set|add note|append note|reopen|close)\b/.test(normalized);

  if (
    workOrder?.serviceId &&
    !isQuestionOnly &&
    hasExplicitUpdateCommand &&
    Boolean(requestedStatus || requestedPriority || requestedNote)
  ) {
    return {
      id: createId("assistant-action"),
      kind: "work-order-update",
      targetId: workOrder.serviceId,
      targetTitle: workOrder.title,
      status: requestedStatus,
      priority: requestedPriority,
      noteToAppend: requestedNote,
    };
  }

  if (
    calendar?.calendarId &&
    /\b(reschedule|move|change|update)\b/.test(normalized) &&
    /\b(event|calendar|appointment|visit|meeting|today|tomorrow|next week|\d{1,2}\s*(am|pm))\b/.test(
      normalized,
    )
  ) {
    const time = parseTime(question);
    return {
      id: createId("assistant-action"),
      kind: "calendar-update",
      targetId: calendar.calendarId,
      targetTitle: calendar.title,
      date: parseDate(question, today, addDays),
      time,
      allDay: !time,
    };
  }

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
    const date = parseDate(question, today, addDays);
    const time = parseTime(question);

    const linkedType: "None" | "Asset" | "Vendor" | "Work Order" =
      asset ? "Asset" : vendor ? "Vendor" : workOrder ? "Work Order" : "None";

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
      linkedId: asset?.assetId || vendor?.vendorId || workOrder?.serviceId || "",
      linkedName: asset?.title || vendor?.title || workOrder?.title || "",
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
