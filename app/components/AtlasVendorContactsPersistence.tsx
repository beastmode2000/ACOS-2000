"use client";

import { useEffect } from "react";

type JsonRecord = Record<string, unknown>;
type FetchLike = typeof window.fetch;

declare global {
  interface Window {
    __atlasVendorContactsFetchPatched?: boolean;
    __atlasVendorContactsOriginalFetch?: FetchLike;
  }
}

function asUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  return "2000";
}

function isAtlasCoreUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname === "/api/atlas";
  } catch {
    return false;
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

async function requestJsonBody(input: RequestInfo | URL, init?: RequestInit) {
  try {
    if (typeof init?.body === "string") return JSON.parse(init.body) as JsonRecord;
    if (typeof Request !== "undefined" && input instanceof Request) {
      return (await input.clone().json()) as JsonRecord;
    }
  } catch {
    return null;
  }
  return null;
}

function propertyFromAtlasUrl(url: string) {
  try {
    return new URL(url, window.location.origin).searchParams.get("propertyId") || currentPropertyId();
  } catch {
    return currentPropertyId();
  }
}

async function mergeVendorContacts(
  originalFetch: FetchLike,
  sourceResponse: Response,
  propertyId: string,
) {
  if (!sourceResponse.ok) return sourceResponse;

  try {
    const payload = (await sourceResponse.clone().json()) as JsonRecord;
    const vendors = Array.isArray(payload.vendorRecords) ? payload.vendorRecords : null;
    if (!vendors) return sourceResponse;

    const contactsResponse = await originalFetch(
      `/api/atlas-vendor-contacts?propertyId=${encodeURIComponent(propertyId)}`,
      { cache: "no-store", credentials: "include" },
    );
    if (!contactsResponse.ok) return sourceResponse;

    const contactPayload = (await contactsResponse.json().catch(() => ({}))) as {
      contactsByVendor?: Record<string, JsonRecord[]>;
    };
    const contactsByVendor = contactPayload.contactsByVendor || {};

    payload.vendorRecords = vendors.map((vendor) => {
      if (!vendor || typeof vendor !== "object" || Array.isArray(vendor)) return vendor;
      const row = vendor as JsonRecord;
      const vendorId = String(row.id || "");
      const persisted = contactsByVendor[vendorId];
      return Array.isArray(persisted) ? { ...row, contacts: persisted } : row;
    });

    const headers = new Headers(sourceResponse.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-store, max-age=0");
    return new Response(JSON.stringify(payload), {
      status: sourceResponse.status,
      statusText: sourceResponse.statusText,
      headers,
    });
  } catch {
    return sourceResponse;
  }
}

async function persistContactsAfterVendorSave(
  originalFetch: FetchLike,
  sourceResponse: Response,
  body: JsonRecord | null,
) {
  if (!sourceResponse.ok || !body || body.table !== "vendors") return sourceResponse;
  const record = body.record && typeof body.record === "object" && !Array.isArray(body.record)
    ? (body.record as JsonRecord)
    : null;
  if (!record || !Array.isArray(record.contacts)) return sourceResponse;

  const nativePayload = (await sourceResponse.clone().json().catch(() => ({}))) as JsonRecord;
  if (nativePayload.ok === false) return sourceResponse;

  const vendorId = String(record.id || nativePayload.id || "").trim();
  if (!vendorId) return sourceResponse;
  const propertyId = String(
    body.propertyId || record.propertyId || record.property_id || currentPropertyId(),
  ).trim() || "2000";

  try {
    const contactResponse = await originalFetch("/api/atlas-vendor-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        propertyId,
        vendorId,
        contacts: record.contacts,
      }),
    });
    const contactPayload = await contactResponse.clone().json().catch(() => ({}));
    if (!contactResponse.ok || contactPayload?.ok === false) {
      const error = contactPayload?.error || "Atlas could not verify the vendor contacts after save.";
      return new Response(JSON.stringify({ ok: false, error }), {
        status: contactResponse.status >= 400 ? contactResponse.status : 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: "Atlas could not verify the vendor contacts after save." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  return sourceResponse;
}

function installFetchPatch() {
  if (typeof window === "undefined" || window.__atlasVendorContactsFetchPatched) return;

  const originalFetch = window.fetch.bind(window) as FetchLike;
  window.__atlasVendorContactsOriginalFetch = originalFetch;
  window.__atlasVendorContactsFetchPatched = true;

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = asUrl(input);
    if (!isAtlasCoreUrl(url)) return originalFetch(input, init);

    const method = requestMethod(input, init);
    const bodyPromise = method === "GET" ? Promise.resolve(null) : requestJsonBody(input, init);
    const response = await originalFetch(input, init);

    if (method === "GET") {
      return mergeVendorContacts(originalFetch, response, propertyFromAtlasUrl(url));
    }

    const body = await bodyPromise;
    return persistContactsAfterVendorSave(originalFetch, response, body);
  }) as FetchLike;
}

export default function AtlasVendorContactsPersistence() {
  installFetchPatch();

  useEffect(() => {
    installFetchPatch();
  }, []);

  return null;
}
