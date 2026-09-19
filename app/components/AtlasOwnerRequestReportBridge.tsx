"use client";

import { useEffect, useRef } from "react";

type OwnerRequest = {
  id: string;
  requesterName?: string;
  title?: string;
  description?: string;
  locationName?: string;
  assetName?: string;
  priority?: string;
  preferredTiming?: string;
  category?: string;
  status?: string;
  photos?: Array<{ id?: string; name?: string; dataUrl?: string; url?: string }>;
  propertyId?: string;
  portalType?: string;
  submittedAt?: string;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function ownerReportMain(doc: Document = document) {
  const heading = Array.from(doc.querySelectorAll<HTMLElement>("main h1, main h2")).find(
    (node) => ["weekly report", "owner report"].includes(normalized(node.textContent)),
  );
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function reportProperty(doc: Document = document) {
  const root = ownerReportMain(doc);
  const text = String(root?.textContent || doc.body?.textContent || "");
  const match = text.match(/Property\s+(2000|6855|3661|Hangar)/i);
  return String(match?.[1] || "2000");
}

function activeOwnerRequests(requests: OwnerRequest[], propertyId: string) {
  return requests
    .filter((request) => {
      if (normalized(request.portalType || "owner") === "marine") return false;
      const status = normalized(request.status);
      if (["closed", "declined", "converted to work order"].includes(status)) return false;
      const requestProperty = String(request.propertyId || "").trim();
      if (requestProperty) return normalized(requestProperty) === normalized(propertyId);
      return normalized(propertyId) === "2000";
    })
    .sort((a, b) => {
      const priorityRank = (value: unknown) => {
        const key = normalized(value);
        if (key === "high") return 0;
        if (key === "medium") return 1;
        return 2;
      };
      return (
        priorityRank(a.priority) - priorityRank(b.priority) ||
        String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))
      );
    });
}

function findOwnerInputSection(doc: Document) {
  const heading = Array.from(doc.querySelectorAll<HTMLElement>("h1,h2,h3,div")).find(
    (node) => normalized(node.textContent) === "owner input needed",
  );
  if (!heading) return null;
  return (
    (heading.closest("section") as HTMLElement | null) ||
    (heading.parentElement?.parentElement as HTMLElement | null) ||
    heading.parentElement
  );
}

function ensureReportSection(doc: Document) {
  const existing = findOwnerInputSection(doc);
  if (existing) return existing;

  const section = doc.createElement("section");
  section.className = "section";
  section.dataset.atlasOwnerRequestBridgeSection = "true";
  const heading = doc.createElement("h2");
  heading.textContent = "Owner Input Needed";
  section.appendChild(heading);

  const summary = doc.querySelector<HTMLElement>(".summary");
  if (summary?.parentElement) summary.parentElement.insertBefore(section, summary);
  else doc.body.insertBefore(section, doc.body.firstChild);
  return section;
}

function requestMeta(request: OwnerRequest) {
  return [
    request.requesterName ? `From ${request.requesterName}` : "Owner request",
    request.status || "New",
    request.priority ? `${request.priority} priority` : "",
    request.preferredTiming || "",
    request.locationName || request.assetName || "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function makeRequestCard(doc: Document, request: OwnerRequest, compact: boolean) {
  const card = doc.createElement(compact ? "article" : "div");
  card.dataset.atlasOwnerRequestId = request.id;
  card.className = compact ? "atlas-owner-request-live-card" : "item";

  if (compact) {
    card.style.border = "1px solid #d9e2ea";
    card.style.borderLeft = "4px solid #c99a3d";
    card.style.borderRadius = "9px";
    card.style.padding = "10px";
    card.style.display = "grid";
    card.style.gap = "6px";
    card.style.background = "#fff";
  }

  const main = doc.createElement("div");
  if (!compact) main.className = "item-main";

  const title = doc.createElement("strong");
  title.textContent = request.title?.trim() || request.description?.trim() || "Owner request";
  if (compact) {
    title.style.display = "block";
    title.style.fontSize = "13px";
    title.style.color = "#0a2841";
  }
  main.appendChild(title);

  const metaText = requestMeta(request);
  if (metaText) {
    const meta = doc.createElement("span");
    meta.textContent = metaText;
    if (compact) {
      meta.style.display = "block";
      meta.style.fontSize = "10px";
      meta.style.color = "#6b7c8c";
      meta.style.marginTop = "2px";
    }
    main.appendChild(meta);
  }
  card.appendChild(main);

  const description = String(request.description || "").trim();
  if (description && normalized(description) !== normalized(request.title)) {
    const note = doc.createElement("div");
    note.className = compact ? "atlas-owner-request-description" : "note";
    note.textContent = description;
    if (compact) {
      note.style.fontSize = "11px";
      note.style.lineHeight = "1.45";
      note.style.color = "#1b2a36";
    }
    card.appendChild(note);
  }

  const photos = Array.isArray(request.photos)
    ? request.photos.filter((photo) => String(photo?.dataUrl || photo?.url || "").trim())
    : [];
  if (photos.length) {
    const grid = doc.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = photos.length > 1 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)";
    grid.style.gap = "6px";
    grid.style.marginTop = "4px";
    photos.slice(0, 3).forEach((photo) => {
      const src = String(photo.dataUrl || photo.url || "");
      if (!src) return;
      const image = doc.createElement("img");
      image.src = src;
      image.alt = String(photo.name || "Owner request photo");
      image.style.width = "100%";
      image.style.maxHeight = compact ? "150px" : "180px";
      image.style.objectFit = "contain";
      image.style.border = "1px solid #d7e0e8";
      image.style.borderRadius = "6px";
      grid.appendChild(image);
    });
    if (grid.childElementCount) card.appendChild(grid);
  }

  return card;
}

function injectIntoDocument(doc: Document, requests: OwnerRequest[], compact: boolean) {
  const propertyId = reportProperty(doc);
  const active = activeOwnerRequests(requests, propertyId);
  if (!active.length) return;

  const section = compact ? findOwnerInputSection(doc) : ensureReportSection(doc);
  if (!section) return;

  if (compact) {
    const empty = Array.from(section.querySelectorAll<HTMLElement>("div")).find((node) =>
      normalized(node.textContent).includes("no owner decisions are currently waiting"),
    );
    if (empty) empty.style.display = "none";
  }

  for (const request of active) {
    if (section.querySelector(`[data-atlas-owner-request-id="${CSS.escape(request.id)}"]`)) continue;
    section.appendChild(makeRequestCard(doc, request, compact));
  }
}

export default function AtlasOwnerRequestReportBridge() {
  const requestsRef = useRef<OwnerRequest[]>([]);
  const loadInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const originalOpen = window.open.bind(window);

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (ownerReportMain(document)) injectIntoDocument(document, requestsRef.current, true);
      });
    };

    const load = async () => {
      if (loadInFlightRef.current) return;
      loadInFlightRef.current = true;
      try {
        const response = await fetch(`/api/atlas-requests?t=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && payload?.ok && Array.isArray(payload.requests)) {
          requestsRef.current = payload.requests;
          schedule();
        }
      } catch {
        // Owner report remains usable if Requests cannot load.
      } finally {
        loadInFlightRef.current = false;
      }
    };

    window.open = ((...args: Parameters<typeof window.open>) => {
      const popup = originalOpen(...args);
      if (!popup || !ownerReportMain(document)) return popup;

      let attempts = 0;
      const repairPopup = () => {
        attempts += 1;
        try {
          if (!popup.closed && popup.document?.body) {
            injectIntoDocument(popup.document, requestsRef.current, false);
          }
        } catch {
          // Ignore cross-window timing while the report is being written.
        }
        if (!popup.closed && attempts < 50) window.setTimeout(repairPopup, 30);
      };
      window.setTimeout(repairPopup, 0);
      return popup;
    }) as typeof window.open;

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("atlas:data-changed", load as EventListener);
    document.addEventListener("click", schedule, true);

    void load();
    schedule();

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("atlas:data-changed", load as EventListener);
      document.removeEventListener("click", schedule, true);
      window.open = originalOpen;
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
