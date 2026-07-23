"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Role = "Master" | "Administrator" | "Manager" | "Employee" | "Vendor" | "Viewer";
type Permissions = { view:boolean; edit:boolean; approve:boolean; delete:boolean; manageUsers:boolean };
type Member = { id: string; name: string; email: string; role: Role; active: boolean; propertyIds:string[]; permissions:Permissions; inviteStatus?:string };
type ReportKey = "workOrders" | "assets" | "vendors" | "contacts" | "procedures" | "calendar" | "documents";

type Props = {
  data: Record<ReportKey, Row[]>;
  colors: { navy: string; gold: string; line: string; card: string; panel: string; muted: string; green: string };
  isMobile: boolean;
};

const defaultTeam: Member[] = [
  { id: "nick", name: "Nick Thornton", email: "nthornton87@yahoo.com", role: "Master", active: true, propertyIds:["2000","6855","3661","hangar"], permissions:{view:true,edit:true,approve:true,delete:true,manageUsers:true} },
  { id: "steve", name: "Steve", email: "stevem@arcticmgnt.com", role: "Administrator", active: true, propertyIds:["2000","6855","3661","hangar"], permissions:{view:true,edit:true,approve:true,delete:true,manageUsers:true} },
  { id: "kenji", name: "Kenji", email: "kenjij@arcticmgnt.com", role: "Administrator", active: true, propertyIds:["2000","6855","3661","hangar"], permissions:{view:true,edit:true,approve:true,delete:true,manageUsers:true} },
];
const reports: Array<[ReportKey, string]> = [
  ["workOrders", "Work Orders"], ["assets", "Assets"], ["vendors", "Vendors"],
  ["contacts", "Contacts"], ["procedures", "Procedures"], ["calendar", "Calendar"],
  ["documents", "Documents"],
];
const descriptions: Record<Role, string> = {
  Master: "Full Atlas access, reports, and access management.",
  Administrator: "Full operations access and reporting.",
  Manager: "Manage daily operations and approve work without managing users.",
  Employee: "Complete assigned work and update operating records.",
  Vendor: "Limited view access to approved property and work information.",
  Viewer: "View records and reports without management access.",
};
const properties = [["2000","2000"],["6855","6855"],["3661","3661"],["hangar","Hangar"]] as const;
const permissionLabels: Array<[keyof Permissions,string]> = [["view","View"],["edit","Edit"],["approve","Approve"],["delete","Delete"],["manageUsers","Manage Users"]];
const roleDefaults: Record<Role, Permissions> = {
  Master:{view:true,edit:true,approve:true,delete:true,manageUsers:true}, Administrator:{view:true,edit:true,approve:true,delete:true,manageUsers:true},
  Manager:{view:true,edit:true,approve:true,delete:false,manageUsers:false}, Employee:{view:true,edit:true,approve:false,delete:false,manageUsers:false},
  Vendor:{view:true,edit:false,approve:false,delete:false,manageUsers:false}, Viewer:{view:true,edit:false,approve:false,delete:false,manageUsers:false},
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

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function printReport(title: string, rows: Row[]) {
  if (!rows.length) return;
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escape(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#071b2f;margin:28px}
    h1{margin:0 0 4px}.meta{color:#637487;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th,td{border:1px solid #d8e0e8;padding:6px;text-align:left;vertical-align:top;word-break:break-word}
    th{background:#071b2f;color:white}
    @media print{body{margin:12px}}
  </style></head><body><h1>${escape(title)}</h1><div class="meta">${rows.length} records · ${new Date().toLocaleString()}</div><table><thead><tr>${headers.map((header)=>`<th>${escape(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row)=>`<tr>${headers.map((header)=>`<td>${escape(typeof row[header] === "object" ? JSON.stringify(row[header]) : row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function ReportsAccessCenter({ data, colors, isMobile }: Props) {
  const [report, setReport] = useState<ReportKey>("workOrders");
  const [team, setTeam] = useState<Member[]>(defaultTeam);
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Employee");
  const [newPropertyIds, setNewPropertyIds] = useState<string[]>(["2000"]);
  const [inviteLink, setInviteLink] = useState("");
  const [backups, setBackups] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assignedFilter, setAssignedFilter] = useState("All");
  const [alertMode, setAlertMode] = useState<"" | "overdue" | "high" | "week">("");

  useEffect(() => {
    void fetch("/api/atlas-team")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok || !Array.isArray(payload.members)) return;
        setTeam(payload.members.map((member: Omit<Member, "role"> & { role: string }) => ({
          ...member,
          role: member.role === "master" ? "Master" : member.role === "administrator" ? "Administrator" : member.role === "manager" ? "Manager" : member.role === "employee" || member.role === "operations" ? "Employee" : member.role === "vendor" ? "Vendor" : "Viewer",
          propertyIds: Array.isArray((member as any).propertyIds) ? (member as any).propertyIds : ["2000"],
          permissions: { ...roleDefaults.Viewer, ...((member as any).permissions || {}) },
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
    const response = await fetch("/api/atlas-team", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"invite", member:{ id:`team-${Date.now()}`, name:newName.trim(), email:newEmail.trim(), role:newRole.toLowerCase(), active:true, propertyIds:newPropertyIds, permissions:roleDefaults[newRole] } }) });
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
    { mode:"overdue" as const, label:"Overdue work", count:activeWork.filter((row)=>row.date && String(row.date)<today).length },
    { mode:"high" as const, label:"High priority", count:activeWork.filter((row)=>row.priority==="High").length },
    { mode:"week" as const, label:"Due within 7 days", count:activeWork.filter((row)=>row.date && String(row.date)>=today && String(row.date)<=nextWeek).length },
  ];
  const estimatedTotal = data.workOrders.reduce(
    (total, row) => total + Number(row.estimatedCost || 0),
    0,
  );
  const actualTotal = data.workOrders.reduce(
    (total, row) => total + Number(row.actualCost || 0),
    0,
  );
  const completedCount = data.workOrders.filter((row) =>
    ["Completed", "Closed"].includes(String(row.status || "")),
  ).length;
  const missingCostCount = data.workOrders.filter(
    (row) =>
      ["Completed", "Closed"].includes(String(row.status || "")) &&
      !Number(row.actualCost || 0),
  ).length;

  const statuses = useMemo(() => Array.from(new Set(data[report].map((row)=>String(row.status || "")).filter(Boolean))).sort(), [data, report]);
  const priorities = useMemo(() => Array.from(new Set(data[report].map((row)=>String(row.priority || "")).filter(Boolean))).sort(), [data, report]);
  const assignments = useMemo(() => Array.from(new Set(data.workOrders.map((row)=>String(row.assignedTo || row.assigned_to || "")).filter(Boolean))).sort(), [data.workOrders]);
  const filteredRows = useMemo(() => data[report].filter((row) => {
    const text = Object.values(row).map((value)=>typeof value === "object" ? JSON.stringify(value) : String(value ?? "")).join(" ").toLowerCase();
    const date = String(row.date || row.item_date || row.createdAt || row.created_at || "").slice(0,10);
    const assigned = String(row.assignedTo || row.assigned_to || "");
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
    if (dateFrom && (!date || date < dateFrom)) return false;
    if (dateTo && (!date || date > dateTo)) return false;
    if (statusFilter !== "All" && String(row.status || "") !== statusFilter) return false;
    if (priorityFilter !== "All" && String(row.priority || "") !== priorityFilter) return false;
    if (assignedFilter !== "All" && assigned !== assignedFilter) return false;
    if (report === "workOrders" && alertMode === "overdue" && !(date && date < today && !["Completed","Closed","Cancelled"].includes(String(row.status || "")))) return false;
    if (report === "workOrders" && alertMode === "high" && !(row.priority === "High" && !["Completed","Closed","Cancelled"].includes(String(row.status || "")))) return false;
    if (report === "workOrders" && alertMode === "week" && !(date && date >= today && date <= nextWeek && !["Completed","Closed","Cancelled"].includes(String(row.status || "")))) return false;
    return true;
  }), [data, report, search, dateFrom, dateTo, statusFilter, priorityFilter, assignedFilter, alertMode, today, nextWeek]);

  function clearFilters() {
    setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter("All"); setPriorityFilter("All"); setAssignedFilter("All"); setAlertMode("");
  }

  function openAlert(mode: "overdue" | "high" | "week") {
    setReport("workOrders"); clearFilters(); setAlertMode(mode);
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
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",gap:8,marginBottom:12}}>
          {[
            ["Estimated", money(estimatedTotal)],
            ["Actual", money(actualTotal)],
            ["Completed", String(completedCount)],
            ["Missing completed costs", String(missingCostCount)],
          ].map(([label,value])=><div key={label} style={{border:`1px solid ${colors.line}`,borderRadius:10,background:colors.panel,padding:10}}><span style={{display:"block",fontSize:10,fontWeight:900,color:colors.muted,textTransform:"uppercase"}}>{label}</span><strong style={{fontSize:18,color:colors.navy}}>{value}</strong></div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) auto", gap: 10 }}>
          <select value={report} onChange={(event) => { setReport(event.currentTarget.value as ReportKey); clearFilters(); }} style={control}>
            {reports.map(([value, label]) => <option key={value} value={value}>{label} ({data[value].length})</option>)}
          </select>
          <button type="button" onClick={() => downloadCsv(report, filteredRows)} disabled={!filteredRows.length} style={{ ...button, opacity: filteredRows.length ? 1 : .55 }}>Download Filtered CSV</button>
        </div>
        <button type="button" onClick={() => printReport(`Atlas ${reports.find(([key])=>key===report)?.[1] || "Report"}`, filteredRows)} disabled={!filteredRows.length} style={{...button,marginTop:10,background:"#fff",border:`1px solid ${colors.line}`,opacity:filteredRows.length?1:.55}}>Print / Save PDF</button>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr repeat(5,minmax(120px,.7fr)) auto",gap:8,marginTop:10}}>
          <input value={search} onChange={(e)=>setSearch(e.currentTarget.value)} placeholder="Search this report" style={control}/>
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.currentTarget.value)} aria-label="From date" style={control}/>
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.currentTarget.value)} aria-label="To date" style={control}/>
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.currentTarget.value)} style={control}><option>All</option>{statuses.map((value)=><option key={value}>{value}</option>)}</select>
          <select value={priorityFilter} onChange={(e)=>setPriorityFilter(e.currentTarget.value)} style={control}><option>All</option>{priorities.map((value)=><option key={value}>{value}</option>)}</select>
          <select value={assignedFilter} onChange={(e)=>setAssignedFilter(e.currentTarget.value)} disabled={report!=="workOrders"} style={control}><option>All</option>{assignments.map((value)=><option key={value}>{value}</option>)}</select>
          <button type="button" onClick={clearFilters} style={{...button,background:"#fff",border:`1px solid ${colors.line}`}}>Clear</button>
        </div>
        <div style={{marginTop:10,color:colors.muted,fontSize:13}}>{filteredRows.length} matching record{filteredRows.length===1?"":"s"}</div>
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
              <select value={member.role} disabled={member.role === "Master"} onChange={(event) => { const role=event.currentTarget.value as Role; updateMember(member.id, { role, permissions:roleDefaults[role] }); }} style={control}>
                {(["Master", "Administrator", "Manager", "Employee", "Vendor", "Viewer"] as Role[]).map((role) => <option key={role}>{role}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={member.active} disabled={member.role === "Master"} onChange={(event) => updateMember(member.id, { active: event.currentTarget.checked })} /> Active
              </label>
              <div style={{ gridColumn: isMobile ? "1" : "1 / -1", color: colors.muted, fontSize: 12 }}>{descriptions[member.role]}</div>
              <div style={{gridColumn:isMobile?"1":"1 / -1",display:"flex",gap:12,flexWrap:"wrap"}}>
                <strong style={{color:colors.navy,fontSize:12}}>Properties:</strong>
                {properties.map(([id,label])=><label key={id} style={{display:"flex",gap:5,alignItems:"center",fontSize:12,fontWeight:800}}><input type="checkbox" disabled={member.role==="Master"} checked={member.propertyIds.includes(id)} onChange={(event)=>updateMember(member.id,{propertyIds:event.currentTarget.checked?[...member.propertyIds,id]:member.propertyIds.filter((value)=>value!==id)})}/>{label}</label>)}
              </div>
              <div style={{gridColumn:isMobile?"1":"1 / -1",display:"flex",gap:12,flexWrap:"wrap"}}>
                <strong style={{color:colors.navy,fontSize:12}}>Permissions:</strong>
                {permissionLabels.map(([key,label])=><label key={key} style={{display:"flex",gap:5,alignItems:"center",fontSize:12,fontWeight:800}}><input type="checkbox" disabled={member.role==="Master"} checked={member.permissions[key]} onChange={(event)=>updateMember(member.id,{permissions:{...member.permissions,[key]:event.currentTarget.checked}})}/>{label}</label>)}
              </div>
              <div style={{gridColumn:isMobile?"1":"1 / -1",fontSize:12,fontWeight:900,color:member.inviteStatus==="Accepted"?colors.green:colors.muted}}>Invitation: {member.inviteStatus || "Existing Access"}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${colors.line}`, display:"grid", gap:10 }}>
          <strong style={{color:colors.navy}}>Add Team Member</strong>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.3fr .8fr auto",gap:10}}>
            <input value={newName} onChange={(e)=>setNewName(e.currentTarget.value)} placeholder="Employee name" style={control}/>
            <input value={newEmail} onChange={(e)=>setNewEmail(e.currentTarget.value)} placeholder="Employee email" style={control}/>
            <select value={newRole} onChange={(e)=>setNewRole(e.currentTarget.value as Role)} style={control}><option>Administrator</option><option>Manager</option><option>Employee</option><option>Vendor</option><option>Viewer</option></select>
            <button type="button" onClick={()=>void createInvite()} style={button}>Create Invite</button>
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><strong style={{color:colors.navy,fontSize:12}}>Property access:</strong>{properties.map(([id,label])=><label key={id} style={{display:"flex",gap:5,alignItems:"center",fontSize:12,fontWeight:800}}><input type="checkbox" checked={newPropertyIds.includes(id)} onChange={(event)=>setNewPropertyIds((current)=>event.currentTarget.checked?[...current,id]:current.filter((value)=>value!==id))}/>{label}</label>)}</div>
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
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10,marginBottom:16}}>{alerts.map((alert)=><button type="button" onClick={()=>openAlert(alert.mode)} key={alert.label} style={{textAlign:"left",padding:14,border:`1px solid ${alertMode===alert.mode?colors.gold:colors.line}`,borderRadius:12,background:colors.panel,cursor:"pointer"}}><strong style={{fontSize:24,color:colors.navy}}>{alert.count}</strong><div style={{color:colors.muted}}>{alert.label}</div><div style={{fontSize:11,fontWeight:900,marginTop:5,color:colors.navy}}>View matching work orders</div></button>)}</div>
        {alertMode ? <div style={{display:"grid",gap:7,marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong style={{color:colors.navy}}>Matching work orders ({filteredRows.length})</strong><button type="button" onClick={clearFilters} style={{...button,padding:"6px 9px",background:"#fff",border:`1px solid ${colors.line}`}}>Close List</button></div>{filteredRows.slice(0,25).map((row)=><div key={String(row.id)} style={{padding:10,border:`1px solid ${colors.line}`,borderRadius:10,display:"flex",justifyContent:"space-between",gap:10}}><strong>{String(row.title || "Untitled work order")}</strong><span style={{color:colors.muted,fontSize:12}}>{String(row.date || "No date")} · {String(row.priority || "Medium")} · {String(row.status || "Open")}</span></div>)}</div> : null}
        <strong style={{color:colors.navy}}>Recent change history</strong>
        <div style={{display:"grid",gap:7,marginTop:8}}>{history.slice(0,10).map((entry)=><div key={String(entry.id)} style={{padding:10,border:`1px solid ${colors.line}`,borderRadius:10,fontSize:13}}><strong>{String(entry.action).toUpperCase()} · {String(entry.table_name)}</strong><div style={{color:colors.muted}}>{String(entry.actor || "Atlas user")} · {new Date(String(entry.created_at)).toLocaleString()}</div></div>)}</div>
      </section>
    </div>
  );
}
