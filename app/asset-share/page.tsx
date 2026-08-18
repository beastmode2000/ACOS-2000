"use client";

import { useEffect, useState } from "react";

type SharedManual = {
  title: string;
  documentNumber?: string;
  url: string;
};

type SharedAsset = {
  assetId: string;
  name: string;
  category?: string;
  status?: string;
  make?: string;
  manufacturer?: string;
  model?: string;
  year?: string;
  serial?: string;
  serial2?: string;
  locationName?: string;
  photoUrl?: string;
  manuals?: SharedManual[];
  message?: string;
  vendorName?: string;
};

const colors = {
  navy: "#102A43",
  blue: "#175CD3",
  gold: "#C99A3D",
  line: "#D8E1EB",
  muted: "#52677E",
  background: "#F3F6FA",
};

export default function AssetSharePage() {
  const [asset, setAsset] = useState<SharedAsset | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("Loading asset information...");

  useEffect(() => {
    let cancelled = false;

    const loadShare = async () => {
      const token = new URLSearchParams(window.location.search).get("token") || "";
      if (!token) {
        setMessage("This vendor link is invalid.");
        return;
      }

      try {
        const response = await fetch(
          `/api/atlas?assetShareToken=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok !== true || !payload?.share) {
          throw new Error(payload?.error || "This vendor link is unavailable.");
        }
        if (cancelled) return;
        setAsset(payload.share as SharedAsset);
        setExpiresAt(String(payload.expiresAt || ""));
        setMessage("");
      } catch (error) {
        if (cancelled) return;
        setAsset(null);
        setMessage(error instanceof Error ? error.message : "This vendor link is unavailable.");
      }
    };

    void loadShare();
    return () => { cancelled = true; };
  }, []);

  const details = asset ? [
    ["Year", asset.year],
    ["Make", asset.make || asset.manufacturer],
    ["Model", asset.model],
    ["Category", asset.category],
    ["Status", asset.status],
    ["Location", asset.locationName],
    ["Serial / VIN / HIN", asset.serial],
    ["Second Serial", asset.serial2],
  ].filter((entry) => entry[1]) : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.background,
        padding: "clamp(14px, 4vw, 36px)",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: colors.navy,
      }}
    >
      <div style={{ width: "min(760px, 100%)", margin: "0 auto", display: "grid", gap: 16 }}>
        <header
          style={{
            background: colors.navy,
            color: "#FFFFFF",
            borderRadius: 16,
            padding: "18px 20px",
            borderBottom: `4px solid ${colors.gold}`,
          }}
        >
          <strong style={{ display: "block", fontSize: 20, letterSpacing: ".02em" }}>Atlas</strong>
          <span style={{ display: "block", marginTop: 4, fontSize: 13, opacity: .82 }}>Asset Information</span>
        </header>

        {!asset ? (
          <section
            style={{
              background: "#FFFFFF",
              border: `1px solid ${colors.line}`,
              borderRadius: 16,
              padding: 22,
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {message}
          </section>
        ) : (
          <>
            <section
              className="asset-share-hero"
              style={{
                background: "#FFFFFF",
                border: `1px solid ${colors.line}`,
                borderRadius: 16,
                padding: "clamp(16px, 4vw, 24px)",
                display: "grid",
                gridTemplateColumns: asset.photoUrl ? "minmax(0, 220px) minmax(0, 1fr)" : "1fr",
                gap: 20,
                alignItems: "start",
              }}
            >
              {asset.photoUrl ? (
                <img
                  src={asset.photoUrl}
                  alt={asset.name}
                  style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 12, border: `1px solid ${colors.line}` }}
                />
              ) : null}
              <div style={{ minWidth: 0 }}>
                {asset.vendorName ? (
                  <div style={{ color: colors.blue, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                    Prepared for {asset.vendorName}
                  </div>
                ) : null}
                <h1 style={{ margin: 0, fontSize: "clamp(24px, 6vw, 34px)", lineHeight: 1.1 }}>{asset.name}</h1>
                {asset.message ? (
                  <p style={{ margin: "14px 0 0", color: colors.muted, fontSize: 15, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {asset.message}
                  </p>
                ) : null}
              </div>
            </section>

            {details.length ? (
              <section
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${colors.line}`,
                  borderRadius: 16,
                  padding: "clamp(16px, 4vw, 24px)",
                }}
              >
                <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>Asset Details</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {details.map(([label, value]) => (
                    <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: "11px 12px", minWidth: 0 }}>
                      <span style={{ display: "block", color: colors.muted, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
                      <strong style={{ display: "block", marginTop: 5, fontSize: 14, overflowWrap: "anywhere" }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section
              style={{
                background: "#FFFFFF",
                border: `1px solid ${colors.line}`,
                borderRadius: 16,
                padding: "clamp(16px, 4vw, 24px)",
              }}
            >
              <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>Manuals</h2>
              {asset.manuals?.length ? (
                <div style={{ display: "grid", gap: 9 }}>
                  {asset.manuals.map((manual, index) => (
                    <a
                      key={`${manual.url}-${index}`}
                      href={manual.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        minHeight: 44,
                        border: `1px solid ${colors.line}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                        color: colors.blue,
                        textDecoration: "none",
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        {manual.title || "Manual PDF"}
                        {manual.documentNumber ? ` · ${manual.documentNumber}` : ""}
                      </span>
                      <span style={{ flex: "0 0 auto" }}>Open PDF</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ color: colors.muted, fontSize: 14 }}>No manuals were included with this link.</div>
              )}
            </section>

            {expiresAt ? (
              <footer style={{ textAlign: "center", color: colors.muted, fontSize: 12, padding: "4px 10px 18px" }}>
                This read-only link expires {new Date(expiresAt).toLocaleString()}.
              </footer>
            ) : null}
          </>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media (max-width: 620px) {
          .asset-share-hero {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

