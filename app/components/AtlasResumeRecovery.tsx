"use client";

import { useEffect } from "react";

const HIDDEN_AT_KEY = "atlas:hidden-at";
const LAST_RELOAD_KEY = "atlas:last-resume-reload";
const SOFT_SYNC_AFTER_MS = 60 * 1000;
const HARD_REFRESH_AFTER_MS = 10 * 60 * 1000;
const RELOAD_GUARD_MS = 60 * 1000;

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
  return /\bUnsaved changes\b/i.test(text);
}

function recentlyReloaded() {
  const last = readNumber(LAST_RELOAD_KEY);
  return Boolean(last && now() - last < RELOAD_GUARD_MS);
}

function hardRefresh() {
  if (recentlyReloaded()) return;
  writeNumber(LAST_RELOAD_KEY, now());
  window.location.reload();
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
  useEffect(() => {
    let checking = false;
    let lastResumeCheck = 0;

    const markHidden = () => {
      if (document.visibilityState === "hidden") {
        writeNumber(HIDDEN_AT_KEY, now());
      }
    };

    const recover = async (forceFromPageShow = false) => {
      if (document.visibilityState === "hidden" || checking) return;

      const current = now();
      if (!forceFromPageShow && current - lastResumeCheck < 1500) return;
      lastResumeCheck = current;

      const hiddenAt = readNumber(HIDDEN_AT_KEY);
      const awayFor = hiddenAt ? Math.max(0, current - hiddenAt) : 0;

      if (pageLooksLikeNextError()) {
        hardRefresh();
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
          hardRefresh();
          return;
        }

        window.dispatchEvent(
          new CustomEvent("atlas:data-changed", {
            detail: { reason: "resume", awayFor },
          }),
        );

        // A long-idle tab can retain an old Next.js client build even though the
        // server has moved on. Refresh it automatically instead of making the
        // user return to a stale/404-looking shell and manually press Refresh.
        if (
          (forceFromPageShow || awayFor >= HARD_REFRESH_AFTER_MS) &&
          !hasUnsavedAtlasEditor()
        ) {
          hardRefresh();
          return;
        }

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
      if (chunkFailure(event.error || event.message)) hardRefresh();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (chunkFailure(event.reason)) hardRefresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
