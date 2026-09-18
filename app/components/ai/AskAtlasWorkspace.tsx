"use client";

import { useState, type ReactNode } from "react";

type Props = {
  isMobile: boolean;
  main: ReactNode;
  sidebar: ReactNode;
};

export default function AskAtlasWorkspace({
  isMobile,
  main,
  sidebar,
}: Props) {
  const [shareMessage, setShareMessage] = useState("");

  async function copyShareLink() {
    setShareMessage("");
    try {
      const response = await fetch("/api/ask-atlas-share?propertyId=2000", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true || !payload?.token) {
        throw new Error(payload?.error || "Share link could not be created.");
      }
      const url = `${window.location.origin}/ask-atlas-share?token=${encodeURIComponent(payload.token)}`;
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage("Shared Ask Atlas link copied.");
      } catch {
        window.prompt("Copy shared Ask Atlas link:", url);
      }
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "Share link could not be created.");
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "minmax(0, 1.45fr) minmax(300px, 0.8fr)",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {shareMessage ? (
            <span style={{ fontSize: 11, color: "#607184" }}>{shareMessage}</span>
          ) : null}
          <button
            type="button"
            onClick={() => void copyShareLink()}
            style={{
              minHeight: 36,
              border: "1px solid #D9E2EA",
              borderRadius: 9,
              background: "#FFFFFF",
              color: "#0A2841",
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Copy Ask Atlas Share Link
          </button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>{main}</div>
      </div>
      <aside style={{ display: "grid", gap: 14 }}>{sidebar}</aside>
    </div>
  );
}

