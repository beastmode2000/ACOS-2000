"use client";

import type { ReactNode } from "react";

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
      <div style={{ display: "grid", gap: 14 }}>{main}</div>
      <aside style={{ display: "grid", gap: 14 }}>{sidebar}</aside>
    </div>
  );
}

