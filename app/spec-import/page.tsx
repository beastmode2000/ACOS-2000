"use client";

import { useEffect, useState } from "react";

type ImportResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  alreadyImported?: boolean;
  sourcePages?: number;
  specificationRows?: number;
  specificationDetailsAdded?: number;
  locationsCreated?: string[];
  locationsCreatedCount?: number;
  locationsUpdatedCount?: number;
  ambiguous?: Array<{ target: string; matches: string[] }>;
  verifiedLocations?: number;
  verifiedDetails?: number;
  expectedLocations?: number;
  expectedDetails?: number;
};

export default function SusanSpecImportPage() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [running, setRunning] = useState(false);

  const runImport = async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/import-susan-specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json()) as ImportResult;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Could not reach the Atlas import service." });
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void runImport();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        color: "#0B1E33",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 720,
          margin: "40px auto",
          background: "#FFFFFF",
          border: "1px solid #DCE4EC",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 12px 30px rgba(11,30,51,.08)",
        }}
      >
        <div style={{ color: "#C99A3D", fontWeight: 900, fontSize: 12 }}>
          ATLAS / 2000
        </div>
        <h1 style={{ margin: "6px 0 8px" }}>Room Specifications Import</h1>
        <p style={{ color: "#607086", lineHeight: 1.5 }}>
          Imports the 27 scanned Susan Marinello plumbing and finish-specification
          pages into the matching Atlas Locations. Existing locations are reused
          where the room match is clear; missing numbered rooms are created.
        </p>

        {running ? <p><strong>Importing room specifications…</strong></p> : null}

        {result ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${result.ok ? "#BDE7D2" : "#FACACA"}`,
              background: result.ok ? "#EAF7F1" : "#FEECEC",
            }}
          >
            <strong>{result.ok ? result.message || "Import complete." : result.error || "Import failed."}</strong>
            {result.ok ? (
              <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                <span>Source pages: {result.sourcePages ?? 27}</span>
                <span>Specification rows: {result.specificationRows ?? "—"}</span>
                <span>Details added: {result.specificationDetailsAdded ?? (result.alreadyImported ? "Already imported" : "—")}</span>
                <span>Locations created: {result.locationsCreatedCount ?? result.locationsCreated?.length ?? 0}</span>
                <span>Existing locations updated: {result.locationsUpdatedCount ?? 0}</span>
                {typeof result.verifiedLocations === "number" ? (
                  <span>Verified Atlas locations: {result.verifiedLocations} / {result.expectedLocations ?? result.verifiedLocations}</span>
                ) : null}
                {typeof result.verifiedDetails === "number" ? (
                  <span>Verified specification details: {result.verifiedDetails} / {result.expectedDetails ?? result.verifiedDetails}</span>
                ) : null}
                {result.locationsCreated?.length ? (
                  <span>New rooms: {result.locationsCreated.join(", ")}</span>
                ) : null}
                {result.ambiguous?.length ? (
                  <div style={{ marginTop: 8 }}>
                    <strong>Needs location review:</strong>
                    {result.ambiguous.map((item) => (
                      <div key={item.target}>
                        {item.target}: {item.matches.join(", ")}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {!running && result && !result.ok ? (
          <button
            type="button"
            onClick={() => void runImport()}
            style={{
              marginTop: 16,
              border: 0,
              borderRadius: 10,
              padding: "10px 14px",
              background: "#C99A3D",
              color: "#0B1E33",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        ) : null}

        <div style={{ marginTop: 20 }}>
          <a href="/?screen=locations" style={{ color: "#175CD3", fontWeight: 800 }}>
            Open Locations
          </a>
        </div>
      </section>
    </main>
  );
}
