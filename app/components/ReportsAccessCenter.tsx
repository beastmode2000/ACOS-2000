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
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Operations");
  const [inviteLink, setInviteLink] = useState("");
  const [backups, setBackups] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

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

  async function loadReliability() {
    const response = await fetch("/api/atlas-reliability");
    const payload = await response.json().catch(() => ({}));
    if (payload.ok) { setBackups(payload.backups || []); setHistory(payload.history || []); }
  }
  useEffect(() => { void loadReliability(); }, []);

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

  async function createInvite() {
    if (!newName.trim() || !newEmail.includes("@")) { setMessage("Enter the employee name and email."); return; }
    const response = await fetch("/api/atlas-team", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"invite", member:{ id:`team-${Date.now()}`, name:newName.trim(), email:newEmail.trim(), role:newRole.toLowerCase(), active:true } }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) { setMessage(String(payload.error || "Invitation could not be created.")); return; }
    const link = `${window.location.origin}${payload.invitePath}`;
    setInviteLink(link);
    await navigator.clipboard?.writeText(link);
    setMessage("Secure invitation link created and copied.");
  }

  function downloadBackup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ createdAt:new Date().toISOString(), ...data }, null, 2)], { type:"application/json" }));
    const link = document.createElement("a"); link.href=url; link.download=`atlas-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url);
  }

  async function createServerBackup() {
    setMessage("Creating protected backup...");
    const response = await fetch("/api/atlas-reliability", { method:"POST" });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok && payload.ok ? "Protected backup created." : String(payload.error || "Backup failed."));
    if (response.ok) await loadReliability();
  }

  async function downloadProtectedBackup(id: string) {
    const response = await fetch(`/api/atlas-reliability?id=${encodeURIComponent(id)}`, { method:"DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!payload.ok) { setMessage(String(payload.error || "Backup download failed.")); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload.snapshot, null, 2)], {type:"application/json"}));
    const link=document.createElement("a"); link.href=url; link.download=`${id}.json`; link.click(); URL.revokeObjectURL(url);
  }

  const today = new Date().toISOString().slice(0,10);
  const nextWeek = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const activeWork = data.workOrders.filter((row) => !["Completed","Closed","Cancelled"].includes(String(row.status || "")));
  const alerts = [
    { label:"Overdue work", count:activeWork.filter((row)=>row.date && String(row.date)<today).length },
    { label:"High priority", count:activeWork.filter((row)=>row.priority==="High").length },
    { label:"Due within 7 days", count:activeWork.filter((row)=>row.date && String(row.date)>=today && String(row.date)<=nextWeek).length },
  ];

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
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${colors.line}`, display:"grid", gap:10 }}>
          <strong style={{color:colors.navy}}>Add Team Member</strong>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.3fr .8fr auto",gap:10}}>
            <input value={newName} onChange={(e)=>setNewName(e.currentTarget.value)} placeholder="Employee name" style={control}/>
            <input value={newEmail} onChange={(e)=>setNewEmail(e.currentTarget.value)} placeholder="Employee email" style={control}/>
            <select value={newRole} onChange={(e)=>setNewRole(e.currentTarget.value as Role)} style={control}><option>Administrator</option><option>Operations</option><option>Viewer</option></select>
            <button type="button" onClick={()=>void createInvite()} style={button}>Create Invite</button>
          </div>
          {inviteLink ? <div style={{display:"grid",gap:6}}><span style={{fontSize:12,color:colors.muted}}>Invitation expires in 7 days. Copy and send this link:</span><input readOnly value={inviteLink} onFocus={(e)=>e.currentTarget.select()} style={control}/></div> : null}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void saveAccess()} style={button}>Save Access Settings</button>
          {message ? <span style={{ color: colors.green, fontWeight: 850 }}>{message}</span> : null}
        </div>
      </section>

      <section style={card}>
        <div style={{ color: colors.gold, fontSize: 11, fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase" }}>Backup & Recovery</div>
        <h2 style={{ margin: "5px 0", color: colors.navy }}>Download complete Atlas backup</h2>
        <p style={{ margin:"0 0 14px", color:colors.muted }}>Creates a dated JSON copy of the records currently loaded in Atlas.</p>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" onClick={()=>void createServerBackup()} style={button}>Create Protected Backup</button><button type="button" onClick={downloadBackup} style={{...button,background:"#fff",border:`1px solid ${colors.line}`}}>Download Current Data</button></div>
        <div style={{display:"grid",gap:7,marginTop:14}}>{backups.slice(0,5).map((backup)=><div key={String(backup.id)} style={{display:"flex",justifyContent:"space-between",gap:10,padding:10,border:`1px solid ${colors.line}`,borderRadius:10}}><span>{new Date(String(backup.created_at)).toLocaleString()} · {String(backup.reason)}</span><button type="button" onClick={()=>void downloadProtectedBackup(String(backup.id))} style={{...button,padding:"7px 10px"}}>Download</button></div>)}</div>
      </section>

      <section style={card}>
        <div style={{ color: colors.gold, fontSize: 11, fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase" }}>Notifications & History</div>
        <h2 style={{margin:"5px 0",color:colors.navy}}>Operations alerts</h2>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:16}}>{alerts.map((alert)=><div key={alert.label} style={{padding:14,border:`1px solid ${colors.line}`,borderRadius:12,background:colors.panel}}><strong style={{fontSize:24,color:colors.navy}}>{alert.count}</strong><div style={{color:colors.muted}}>{alert.label}</div></div>)}</div>
        <strong style={{color:colors.navy}}>Recent change history</strong>
        <div style={{display:"grid",gap:7,marginTop:8}}>{history.slice(0,10).map((entry)=><div key={String(entry.id)} style={{padding:10,border:`1px solid ${colors.line}`,borderRadius:10,fontSize:13}}><strong>{String(entry.action).toUpperCase()} · {String(entry.table_name)}</strong><div style={{color:colors.muted}}>{String(entry.actor || "Atlas user")} · {new Date(String(entry.created_at)).toLocaleString()}</div></div>)}</div>
      </section>
    </div>
  );
}
