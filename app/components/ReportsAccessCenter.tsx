"use client";

import { useEffect, useState } from "react";

type Row = Record<string, unknown>;
type Role = "Master" | "Administrator" | "Operations" | "Viewer";
type Member = { id: string; name: string; email: string; role: Role; active: boolean };
type ReportKey = "workOrders" | "assets" | "vendors" | "contacts" | "procedures" | "calendar" | "documents";

type Props = {
  data: Record<ReportKey, Row[]>;
  colors: { navy: string; gold: string; line: string; card: string; panel: string; muted: string; green: string };
  isMobile: boolean;
};

const defaultTeam: Member[] = [
  { id: "nick", name: "Nick Thornton", email: "nthornton87@yahoo.com", role: "Master", active: true },
  { id: "steve", name: "Steve", email: "stevem@arcticmgnt.com", role: "Administrator", active: true },
  { id: "kenji", name: "Kenji", email: "kenjij@arcticmgnt.com", role: "Administrator", active: true },
];
const reports: Array<[ReportKey, string]> = [
  ["workOrders", "Work Orders"], ["assets", "Assets"], ["vendors", "Vendors"],
  ["contacts", "Contacts"], ["procedures", "Procedures"], ["calendar", "Calendar"],
  ["documents", "Documents"],
];
const descriptions: Record<Role, string> = {
  Master: "Full Atlas access, reports, and access management.",
  Administrator: "Full operations access and reporting.",
  Operations: "Daily work, assets, procedures, calendar, and reports.",
  Viewer: "View records and reports without management access.",
};

function csvValue(value: unknown) {
  const text = Array.isArray(value) || (value && typeof value === "object") ? JSON.stringify(value) : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(name: string, rows: Row[]) {
  if (!rows.length) return;
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    headers.map(csvValue).join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `atlas-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsAccessCenter({ data, colors, isMobile }: Props) {
  const [report, setReport] = useState<ReportKey>("workOrders");
  const [team, setTeam] = useState<Member[]>(defaultTeam);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/atlas-team")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok || !Array.isArray(payload.members)) return;
        setTeam(payload.members.map((member: Omit<Member, "role"> & { role: string }) => ({
          ...member,
          role: member.role === "master" ? "Master" : member.role === "administrator" ? "Administrator" : member.role === "operations" ? "Operations" : "Viewer",
        })));
      })
      .catch(() => setMessage("Atlas could not load shared access settings."));
  }, []);

  function updateMember(id: string, patch: Partial<Member>) {
    setTeam((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
    setMessage("");
  }

  async function saveAccess() {
    setMessage("Saving shared access settings...");
    const response = await fetch("/api/atlas-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        members: team.map((member) => ({ ...member, role: member.role.toLowerCase() })),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok && payload.ok ? "Shared access settings saved." : String(payload.error || "Access settings could not be saved."));
  }

  const card = { border: `1px solid ${colors.line}`, borderRadius: 16, background: colors.card, padding: 18 };
  const control = { width: "100%", minHeight: 42, border: `1px solid ${colors.line}`, borderRadius: 10, padding: "9px 11px", background: "#fff" };
  const button = { border: 0, borderRadius: 10, background: colors.gold, color: colors.navy, padding: "11px 15px", fontWeight: 950, cursor: "pointer" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <div style={{ color: colors.gold, fontSize: 11, fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase" }}>Reports & Export</div>
        <h2 style={{ margin: "5px 0", color: colors.navy }}>Download Atlas records</h2>
        <p style={{ margin: "0 0 16px", color: colors.muted }}>Choose a report and download a spreadsheet-ready CSV file.</p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) auto", gap: 10 }}>
          <select value={report} onChange={(event) => setReport(event.currentTarget.value as ReportKey)} style={control}>
            {reports.map(([value, label]) => <option key={value} value={value}>{label} ({data[value].length})</option>)}
          </select>
          <button type="button" onClick={() => downloadCsv(report, data[report])} disabled={!data[report].length} style={{ ...button, opacity: data[report].length ? 1 : .55 }}>Download CSV</button>
        </div>
      </section>

      <section style={card}>
        <div style={{ color: colors.gold, fontSize: 11, fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase" }}>Team & Permissions</div>
        <h2 style={{ margin: "5px 0", color: colors.navy }}>Access profiles</h2>
        <p style={{ margin: "0 0 16px", color: colors.muted }}>Keep roles simple. Passwords stay controlled by the existing secure Vercel settings.</p>
        <div style={{ display: "grid", gap: 10 }}>
          {team.map((member) => (
            <div key={member.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 12, background: colors.panel, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(180px, 1.2fr) minmax(210px, 1.3fr) minmax(155px, .8fr) auto", gap: 10, alignItems: "center" }}>
              <strong style={{ color: colors.navy }}>{member.name}</strong>
              <span style={{ color: colors.muted, fontSize: 13 }}>{member.email}</span>
              <select value={member.role} disabled={member.role === "Master"} onChange={(event) => updateMember(member.id, { role: event.currentTarget.value as Role })} style={control}>
                {(["Master", "Administrator", "Operations", "Viewer"] as Role[]).map((role) => <option key={role}>{role}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={member.active} disabled={member.role === "Master"} onChange={(event) => updateMember(member.id, { active: event.currentTarget.checked })} /> Active
              </label>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1", color: colors.muted, fontSize: 12 }}>{descriptions[member.role]}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void saveAccess()} style={button}>Save Access Settings</button>
          {message ? <span style={{ color: colors.green, fontWeight: 850 }}>{message}</span> : null}
        </div>
      </section>
    </div>
  );
}
