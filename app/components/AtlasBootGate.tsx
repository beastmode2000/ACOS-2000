"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";

type BootRequestKind = "team" | "atlas";

type BootSnapshot = {
  teamStarted: boolean;
  teamDone: boolean;
  atlasStarted: boolean;
  atlasDone: boolean;
  activeRequests: number;
  version: number;
};

const initialSnapshot: BootSnapshot = {
  teamStarted: false,
  teamDone: false,
  atlasStarted: false,
  atlasDone: false,
  activeRequests: 0,
  version: 0,
};

let bootSnapshot: BootSnapshot = initialSnapshot;
const bootListeners = new Set<() => void>();
let fetchMonitorInstalled = false;

function emitBootSnapshot(next: Partial<BootSnapshot>) {
  bootSnapshot = {
    ...bootSnapshot,
    ...next,
    version: bootSnapshot.version + 1,
  };
  bootListeners.forEach((listener) => listener());
}

function requestKind(input: RequestInfo | URL, init?: RequestInit): BootRequestKind | null {
  if (typeof window === "undefined") return null;

  try {
    const request = input instanceof Request ? input : null;
    const rawUrl = request ? request.url : String(input);
    const method = (init?.method || request?.method || "GET").toUpperCase();
    if (method !== "GET") return null;

    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    if (url.pathname === "/api/atlas-team") return "team";

    if (url.pathname === "/api/atlas") {
      // Background note/calendar refreshes must never put the whole application
      // back behind a loading screen. Only the main property-data request counts.
      if (url.searchParams.has("notesSync") || url.searchParams.has("calendarSync")) {
        return null;
      }
      if (url.searchParams.has("propertyId")) return "atlas";
    }
  } catch {
    // If a request URL cannot be inspected, leave it alone.
  }

  return null;
}

function markRequestStarted(kind: BootRequestKind) {
  emitBootSnapshot({
    activeRequests: bootSnapshot.activeRequests + 1,
    ...(kind === "team" ? { teamStarted: true } : { atlasStarted: true }),
  });
}

function markRequestDone(kind: BootRequestKind) {
  emitBootSnapshot({
    activeRequests: Math.max(0, bootSnapshot.activeRequests - 1),
    ...(kind === "team" ? { teamDone: true } : { atlasDone: true }),
  });
}

function installFetchMonitor() {
  if (typeof window === "undefined" || fetchMonitorInstalled) return;
  fetchMonitorInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const kind = requestKind(input, init);
    if (!kind) return nativeFetch(input, init);

    markRequestStarted(kind);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      markRequestDone(kind);
    };

    try {
      const response = await nativeFetch(input, init);

      if (!response.ok) {
        finish();
        return response;
      }

      // A fetch promise resolves when response headers arrive, before Atlas has
      // parsed the JSON. Keep the loading cover up through JSON parsing so stale
      // browser data never flashes between the request and the live payload.
      const originalJson = response.json.bind(response);
      try {
        Object.defineProperty(response, "json", {
          configurable: true,
          value: async () => {
            try {
              return await originalJson();
            } finally {
              finish();
            }
          },
        });
      } catch {
        finish();
      }

      // Safety valve for an unusual caller that does not consume the JSON body.
      window.setTimeout(finish, 15000);
      return response;
    } catch (error) {
      finish();
      throw error;
    }
  };
}

// Install before AtlasApp's effects run. This lets the gate follow the same live
// requests Atlas already makes without adding duplicate API calls or slowing boot.
installFetchMonitor();

function subscribe(listener: () => void) {
  bootListeners.add(listener);
  return () => {
    bootListeners.delete(listener);
  };
}

function getSnapshot() {
  return bootSnapshot;
}

function statusLabel(started: boolean, done: boolean) {
  if (done) return "Ready";
  if (started) return "Loading";
  return "Waiting";
}

function StatusDot({ done, active }: { done: boolean; active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`atlas-boot-dot${done ? " is-done" : active ? " is-active" : ""}`}
    />
  );
}

export default function AtlasBootGate({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<BootSnapshot>(() => getSnapshot());
  const [bootComplete, setBootComplete] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    // A child effect can start a request before passive effects subscribe. Sync
    // once immediately so a very fast response can never leave the gate stale.
    setSnapshot(getSnapshot());
    return subscribe(() => setSnapshot(getSnapshot()));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlowLoad(true), 5500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (bootComplete) return;

    const requestsFinished =
      snapshot.teamStarted &&
      snapshot.teamDone &&
      snapshot.atlasStarted &&
      snapshot.atlasDone &&
      snapshot.activeRequests === 0;

    if (!requestsFinished) return;

    // Give React one short quiet window to apply the freshly parsed payload.
    // If another main boot request starts, this timer is cancelled automatically.
    const timer = window.setTimeout(() => setBootComplete(true), 700);
    return () => window.clearTimeout(timer);
  }, [bootComplete, snapshot]);

  useEffect(() => {
    if (bootComplete) return;

    // Never leave a user trapped behind the cover if a request is interrupted.
    // Atlas can then show its own saved/offline state and retry controls.
    const safetyTimer = window.setTimeout(() => setBootComplete(true), 20000);
    return () => window.clearTimeout(safetyTimer);
  }, [bootComplete]);

  const phase = useMemo(() => {
    if (!snapshot.teamDone) return "Checking account access";
    if (!snapshot.atlasDone || snapshot.activeRequests > 0) return "Loading the latest property data";
    return "Preparing your work view";
  }, [snapshot]);

  return (
    <>
      <div
        aria-hidden={!bootComplete}
        style={{ visibility: bootComplete ? "visible" : "hidden" }}
      >
        {children}
      </div>

      {!bootComplete ? (
        <main className="atlas-boot" aria-busy="true">
          <section className="atlas-boot-card" role="status" aria-live="polite">
            <div className="atlas-boot-mark" aria-hidden="true">
              <span className="atlas-boot-ring atlas-boot-ring-one" />
              <span className="atlas-boot-ring atlas-boot-ring-two" />
              <span className="atlas-boot-core">A</span>
              <span className="atlas-boot-orbit" />
            </div>

            <div className="atlas-boot-copy">
              <div className="atlas-boot-brand">ATLAS</div>
              <h1>Getting Atlas ready</h1>
              <p className="atlas-boot-phase">
                {phase}<span className="atlas-boot-ellipsis" aria-hidden="true">...</span>
              </p>
              <p className="atlas-boot-help">
                {slowLoad
                  ? "Still working — larger property records can take a moment to prepare."
                  : "Your current work stays hidden until the latest property information is ready."}
              </p>
            </div>

            <div className="atlas-boot-progress" aria-hidden="true">
              <span />
            </div>

            <div className="atlas-boot-steps" aria-label="Loading progress">
              <div className="atlas-boot-step">
                <StatusDot done={snapshot.teamDone} active={snapshot.teamStarted && !snapshot.teamDone} />
                <span>Account access</span>
                <strong>{statusLabel(snapshot.teamStarted, snapshot.teamDone)}</strong>
              </div>
              <div className="atlas-boot-step">
                <StatusDot done={snapshot.atlasDone} active={snapshot.atlasStarted && !snapshot.atlasDone} />
                <span>Property data</span>
                <strong>{statusLabel(snapshot.atlasStarted, snapshot.atlasDone)}</strong>
              </div>
              <div className="atlas-boot-step">
                <StatusDot done={false} active={snapshot.atlasDone} />
                <span>Work view</span>
                <strong>{snapshot.atlasDone ? "Preparing" : "Waiting"}</strong>
              </div>
            </div>
          </section>

          <style>{`
            .atlas-boot {
              position: fixed;
              inset: 0;
              z-index: 2147483000;
              min-height: 100vh;
              min-height: 100dvh;
              display: grid;
              place-items: center;
              padding: clamp(18px, 4vw, 46px);
              box-sizing: border-box;
              overflow: hidden;
              background:
                radial-gradient(circle at 18% 14%, rgba(199, 153, 55, .10), transparent 27%),
                radial-gradient(circle at 82% 82%, rgba(30, 68, 108, .08), transparent 30%),
                #f4f7fb;
              color: #071d33;
            }

            .atlas-boot::before {
              content: "";
              position: absolute;
              inset: -30%;
              pointer-events: none;
              background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,.70) 49%, transparent 60%);
              transform: translateX(-35%);
              animation: atlasBootSweep 4.8s ease-in-out infinite;
            }

            .atlas-boot-card {
              position: relative;
              width: min(640px, 100%);
              box-sizing: border-box;
              padding: clamp(28px, 5vw, 48px);
              border: 1px solid #d7e1eb;
              border-radius: clamp(24px, 4vw, 34px);
              background: rgba(255, 255, 255, .94);
              box-shadow: 0 28px 80px rgba(6, 29, 51, .10);
              overflow: hidden;
              isolation: isolate;
            }

            .atlas-boot-card::after {
              content: "";
              position: absolute;
              left: 0;
              right: 0;
              top: 0;
              height: 3px;
              background: linear-gradient(90deg, transparent, #c99a36 30%, #e2bd68 50%, #c99a36 70%, transparent);
              opacity: .92;
            }

            .atlas-boot-mark {
              position: relative;
              width: 86px;
              height: 86px;
              display: grid;
              place-items: center;
              margin-bottom: 26px;
            }

            .atlas-boot-ring {
              position: absolute;
              border-radius: 50%;
              border: 1px solid rgba(8, 35, 61, .18);
            }

            .atlas-boot-ring-one {
              inset: 0;
              border-top-color: #c99a36;
              border-right-color: #c99a36;
              animation: atlasBootSpin 2.8s linear infinite;
            }

            .atlas-boot-ring-two {
              inset: 12px;
              border-left-color: #c99a36;
              animation: atlasBootSpinReverse 2.1s linear infinite;
            }

            .atlas-boot-core {
              width: 46px;
              height: 46px;
              border-radius: 50%;
              display: grid;
              place-items: center;
              background: #071d33;
              color: #d5a642;
              font: 900 22px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              box-shadow: 0 8px 22px rgba(7, 29, 51, .18);
            }

            .atlas-boot-orbit {
              position: absolute;
              top: 3px;
              left: 50%;
              width: 8px;
              height: 8px;
              margin-left: -4px;
              border-radius: 50%;
              background: #d5a642;
              box-shadow: 0 0 0 5px rgba(213, 166, 66, .12);
              transform-origin: 4px 40px;
              animation: atlasBootOrbit 2.8s linear infinite;
            }

            .atlas-boot-copy {
              max-width: 520px;
            }

            .atlas-boot-brand {
              margin-bottom: 9px;
              color: #c5912c;
              font: 900 15px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              letter-spacing: .24em;
            }

            .atlas-boot h1 {
              margin: 0;
              color: #071d33;
              font: 900 clamp(32px, 6vw, 48px)/1.02 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              letter-spacing: -.035em;
            }

            .atlas-boot-phase {
              margin: 15px 0 0;
              min-height: 28px;
              color: #51677f;
              font: 800 clamp(17px, 3.2vw, 20px)/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .atlas-boot-ellipsis {
              display: inline-block;
              width: 18px;
              overflow: hidden;
              vertical-align: bottom;
              animation: atlasBootDots 1.4s steps(4, end) infinite;
            }

            .atlas-boot-help {
              margin: 8px 0 0;
              color: #71839a;
              font: 650 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .atlas-boot-progress {
              position: relative;
              height: 5px;
              margin: 28px 0 24px;
              overflow: hidden;
              border-radius: 999px;
              background: #e8edf3;
            }

            .atlas-boot-progress span {
              position: absolute;
              inset: 0 auto 0 0;
              width: 42%;
              border-radius: inherit;
              background: linear-gradient(90deg, #ae7920, #ddb65e, #ae7920);
              animation: atlasBootProgress 1.65s ease-in-out infinite;
            }

            .atlas-boot-steps {
              display: grid;
              gap: 10px;
            }

            .atlas-boot-step {
              display: grid;
              grid-template-columns: 10px minmax(0, 1fr) auto;
              align-items: center;
              gap: 10px;
              min-height: 24px;
              color: #536b83;
              font: 750 13px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .atlas-boot-step strong {
              color: #8290a0;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: .055em;
              text-transform: uppercase;
            }

            .atlas-boot-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #cfd7e0;
              box-shadow: 0 0 0 4px rgba(207, 215, 224, .18);
            }

            .atlas-boot-dot.is-active {
              background: #d2a03a;
              box-shadow: 0 0 0 4px rgba(210, 160, 58, .14);
              animation: atlasBootPulse 1.1s ease-in-out infinite;
            }

            .atlas-boot-dot.is-done {
              background: #2b9a62;
              box-shadow: 0 0 0 4px rgba(43, 154, 98, .12);
            }

            @keyframes atlasBootSpin { to { transform: rotate(360deg); } }
            @keyframes atlasBootSpinReverse { to { transform: rotate(-360deg); } }
            @keyframes atlasBootOrbit { to { transform: rotate(360deg); } }
            @keyframes atlasBootPulse { 50% { transform: scale(.72); opacity: .55; } }
            @keyframes atlasBootProgress {
              0% { transform: translateX(-110%); }
              55% { transform: translateX(105%); }
              100% { transform: translateX(245%); }
            }
            @keyframes atlasBootSweep {
              0%, 28% { transform: translateX(-35%); opacity: 0; }
              45% { opacity: .75; }
              64%, 100% { transform: translateX(35%); opacity: 0; }
            }
            @keyframes atlasBootDots {
              0% { width: 0; }
              100% { width: 18px; }
            }

            @media (max-width: 600px) {
              .atlas-boot {
                place-items: start center;
                padding: max(88px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
              }

              .atlas-boot-card {
                padding: 28px 24px 26px;
                border-radius: 28px;
              }

              .atlas-boot-mark {
                width: 74px;
                height: 74px;
                margin-bottom: 22px;
              }

              .atlas-boot-ring-two { inset: 10px; }
              .atlas-boot-core { width: 40px; height: 40px; font-size: 20px; }
              .atlas-boot-orbit { transform-origin: 4px 34px; }
              .atlas-boot-progress { margin: 24px 0 20px; }
            }

            @media (prefers-reduced-motion: reduce) {
              .atlas-boot::before,
              .atlas-boot-ring,
              .atlas-boot-orbit,
              .atlas-boot-progress span,
              .atlas-boot-dot.is-active,
              .atlas-boot-ellipsis {
                animation: none !important;
              }
              .atlas-boot-progress span { left: 29%; }
            }
          `}</style>
        </main>
      ) : null}
    </>
  );
}
