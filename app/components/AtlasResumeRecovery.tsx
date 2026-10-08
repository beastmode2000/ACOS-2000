"use client";

import { useEffect, useState } from "react";

const HIDDEN_AT_KEY = "atlas:hidden-at";
const SOFT_SYNC_AFTER_MS = 60 * 1000;

function now() {
  return Date.now();
}

function readNumber(key: string) {
  try {
    return Number(window.sessionStorage.getItem(key) || "0") || 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number) {
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // Session storage is only a convenience for resume recovery.
  }
}

function pageLooksLikeNextError() {
  const text = String(document.body?.innerText || "").toLowerCase();
  return (
    text.includes("this page could not be found") ||
    text.includes("application error: a client-side exception") ||
    text.includes("failed to load chunk") ||
    text.includes("loading chunk") && text.includes("failed")
  );
}

function hasUnsavedAtlasEditor() {
  const text = String(document.body?.innerText || "");
  if (/\bUnsaved changes\b/i.test(text)) return true;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.matches("input, textarea, [contenteditable='true']")) return true;
  return Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
    .some((field) => Boolean(field.value.trim()));
}

function chunkFailure(value: unknown) {
  const text =
    value instanceof Error
      ? `${value.name} ${value.message}`
      : typeof value === "string"
        ? value
        : String((value as { message?: unknown })?.message || value || "");
  return /chunkloaderror|loading chunk|failed to fetch dynamically imported module|importing a module script failed|module script.*404|_next\/static.*404/i.test(text);
}

export default function AtlasResumeRecovery() {
  const [refreshAvailable, setRefreshAvailable] = useState(false);
  useEffect(() => {
    let checking = false;
    let lastResumeCheck = 0;

    const markHidden = () => {
      if (document.visibilityState === "hidden") {
        writeNumber(HIDDEN_AT_KEY, now());
      }
    };

    const recover = async (forceFromPageShow = false) => {
      if (document.visibilityState === "hidden" || checking || hasUnsavedAtlasEditor()) return;

      const current = now();
      if (!forceFromPageShow && current - lastResumeCheck < 1500) return;
      lastResumeCheck = current;

      const hiddenAt = readNumber(HIDDEN_AT_KEY);
      const awayFor = hiddenAt ? Math.max(0, current - hiddenAt) : 0;

      if (pageLooksLikeNextError()) {
        setRefreshAvailable(true);
        return;
      }

      if (!forceFromPageShow && awayFor < SOFT_SYNC_AFTER_MS) return;

      checking = true;
      try {
        const response = await fetch(
          `/api/atlas-session?resume=${current}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const contentType = response.headers.get("content-type") || "";
        const healthy = response.ok && contentType.includes("application/json");

        if (!healthy) {
          setRefreshAvailable(true);
          return;
        }

        // A note may have been started while the session request was in flight.
        if (hasUnsavedAtlasEditor()) return;

        window.dispatchEvent(
          new CustomEvent("atlas:data-changed", {
            detail: { reason: "resume", awayFor },
          }),
        );

        writeNumber(HIDDEN_AT_KEY, current);
      } catch {
        // If connectivity has not returned yet, leave the current screen intact.
        // A later focus/visibility event retries; a hard reload while offline
        // would make the experience worse.
      } finally {
        checking = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        markHidden();
      } else {
        void recover(false);
      }
    };

    const onFocus = () => {
      void recover(false);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      void recover(Boolean(event.persisted));
    };

    const onError = (event: ErrorEvent) => {
      if (chunkFailure(event.error || event.message)) setRefreshAvailable(true);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (chunkFailure(event.reason)) setRefreshAvailable(true);
    };

    const onRefreshAvailable = () => setRefreshAvailable(true);

    window.addEventListener("atlas:refresh-available", onRefreshAvailable);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("atlas:refresh-available", onRefreshAvailable);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return refreshAvailable ? (
    <div role="status" style={{ position: "fixed", bottom: 18, right: 18, zIndex: 2000, display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: "#FFFFFF", color: "#0B2C43", border: "1px solid #D8E0E8", boxShadow: "0 3px 14px rgba(0,0,0,.12)", fontSize: 13 }}>
      <span>Save your work before refreshing.</span>
      <button type="button" onClick={() => window.location.reload()} style={{ border: "1px solid #D8E0E8", borderRadius: 7, background: "#FFFFFF", color: "#0B2C43", padding: "5px 8px", cursor: "pointer" }}>Refresh</button>
      <button type="button" aria-label="Dismiss refresh notice" onClick={() => setRefreshAvailable(false)} style={{ border: 0, background: "transparent", color: "#526579", cursor: "pointer", fontSize: 18 }}>×</button>
    </div>
  ) : null;
}
