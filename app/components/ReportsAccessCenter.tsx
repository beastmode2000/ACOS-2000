"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Row = Record<string, unknown>;
type Role = "Master" | "Administrator" | "Manager" | "Employee" | "Vendor" | "Viewer";
type Permissions = { view:boolean; edit:boolean; approve:boolean; delete:boolean; manageUsers:boolean };
type Member = { id: string; name: string; email: string; role: Role; active: boolean; propertyIds:string[]; permissions:Permissions; accessProfiles:string[]; inviteStatus?:string };
type ReportKey = "workOrders" | "assets" | "vendors" | "contacts" | "procedures" | "calendar" | "documents";

type Props = {
  data: Record<ReportKey, Row[]>;
  colors: { navy: string; gold: string; line: string; card: string; panel: string; muted: string; green: string };
  isMobile: boolean;
  analytics?: ReactNode;
};

const defaultTeam: Member[] = [
  { id: "nick", name: "Nick Thornton", email: "nthornton87@yahoo.com", role: "Master", active: true, propertyIds:["2000","6855","3661","hangar"], permissions:{view:true,edit:true,approve:true,delete:true,manageUsers:true}, accessProfiles:[] },
  { id: "steve", name: "Steve", email: "stevem@arcticmgnt.com", role: "Administrator", active: true, propertyIds:["2000","6855","3661","hangar"], permissions:{view:true,edit:true,approve:true,delete:true,manageUsers:true}, accessProfiles:[] },
  { id: "kenji", name: "Kenji", email: "kenjij@arcticmgnt.com", role: "Administrator", active: true, propertyIds:["2000","6855","3661","hangar"], permissions:{view:true,edit:true,approve:true,delete:true,manageUsers:true}, accessProfiles:[] },
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

const accessProfileOptions = [
  ["marine", "🌊 Marine"],
  ["landscaping", "🌳 Landscaping"],
  ["house", "🏠 House"],
  ["maintenance", "🔧 Maintenance"],
  ["pool-spa", "🏊 Pool & Spa"],
  ["vehicles", "🚗 Vehicles"],
  ["electrical", "⚡ Electrical"],
  ["plumbing", "🚰 Plumbing"],
  ["inventory", "📦 Inventory"],
] as const;

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
  const escape = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const reportKey = title.toLowerCase();
  const preferredColumns =
    reportKey.includes("work order")
      ? [
          ["title", "Work Order"],
          ["status", "Status"],
          ["priority", "Priority"],
          ["date", "Due Date"],
          ["assignedTo", "Assigned To"],
          ["assetId", "Asset"],
          ["locationId", "Location"],
          ["vendorId", "Vendor"],
          ["estimatedCost", "Estimated"],
          ["actualCost", "Actual"],
          ["invoiceNumber", "Invoice"],
        ]
      : reportKey.includes("asset")
        ? [
            ["name", "Asset"],
            ["category", "Category"],
            ["location", "Location"],
            ["status", "Status"],
            ["make", "Make"],
            ["model", "Model"],
            ["serialNumber", "Serial Number"],
            ["vendorId", "Vendor"],
          ]
        : reportKey.includes("vendor")
          ? [
              ["name", "Vendor"],
              ["category", "Category"],
              ["contactName", "Contact"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["status", "Status"],
            ]
          : reportKey.includes("contact")
            ? [
                ["name", "Name"],
                ["company", "Company"],
                ["role", "Role"],
                ["phone", "Phone"],
                ["email", "Email"],
              ]
            : reportKey.includes("procedure")
              ? [
                  ["title", "Procedure"],
                  ["status", "Status"],
                  ["category", "Category"],
                  ["estimatedTime", "Estimated Time"],
                  ["assetId", "Asset"],
                  ["locationId", "Location"],
                ]
              : reportKey.includes("calendar")
                ? [
                    ["title", "Event"],
                    ["date", "Date"],
                    ["startTime", "Start"],
                    ["endTime", "End"],
                    ["category", "Category"],
                    ["location", "Location"],
                  ]
                : [
                    ["title", "Document"],
                    ["name", "Name"],
                    ["type", "Type"],
                    ["status", "Status"],
                    ["createdAt", "Saved"],
                  ];
  const aliases: Record<string, string[]> = {
    title: ["title", "name"],
    name: ["name", "title"],
    date: ["date", "item_date", "dueDate"],
    assignedTo: ["assignedTo", "assigned_to"],
    assetId: ["assetName", "asset", "assetId", "asset_id"],
    locationId: ["locationName", "location", "locationId", "location_id"],
    vendorId: ["vendorName", "vendor", "vendorId", "vendor_id"],
    estimatedCost: ["estimatedCost", "estimated_cost"],
    actualCost: ["actualCost", "actual_cost"],
    invoiceNumber: ["invoiceNumber", "invoice_number"],
    serialNumber: ["serialNumber", "serial", "serial_number"],
    contactName: ["contactName", "contact", "contact_name"],
    estimatedTime: ["estimatedTime", "estimated_time"],
    startTime: ["startTime", "start_time"],
    endTime: ["endTime", "end_time"],
    createdAt: ["createdAt", "created_at"],
  };
  const columns = preferredColumns
    .map(([key, label]) => ({
      key,
      label,
      source: (aliases[key] || [key]).find((candidate) =>
        rows.some((row) => row[candidate] !== undefined && row[candidate] !== ""),
      ),
    }))
    .filter((column) => Boolean(column.source));
  const formatPrintValue = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return "—";
    if (key === "estimatedCost" || key === "actualCost") {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? money(numeric) : String(value);
    }
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
    if (typeof value === "object") return "Attached";
    const text = String(value);
    return text.length > 80 ? `${text.slice(0, 77)}...` : text;
  };
  const estimated = rows.reduce(
    (total, row) => total + Number(row.estimatedCost || row.estimated_cost || 0),
    0,
  );
  const actual = rows.reduce(
    (total, row) => total + Number(row.actualCost || row.actual_cost || 0),
    0,
  );
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escape(title)}</title><style>
    @page{size:landscape;margin:.45in}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#071b2f;margin:0;background:#fff}
    .header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #c99a3d;padding-bottom:10px;margin-bottom:12px}
    .logo{width:48px;height:48px;object-fit:contain}
    h1{font-size:22px;margin:0 0 3px}.meta{color:#637487;font-size:10px}
    .summary{display:flex;gap:8px;margin:0 0 12px}
    .stat{border:1px solid #d8e0e8;border-radius:7px;padding:7px 10px;min-width:115px}
    .stat span{display:block;color:#637487;font-size:8px;text-transform:uppercase;font-weight:700}
    .stat strong{font-size:14px}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}
    th,td{border:1px solid #d8e0e8;padding:5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
    th{background:#071b2f;color:white;font-size:8px}
    tbody tr:nth-child(even){background:#f5f8fb}
    tr{break-inside:avoid}
  </style></head><body>
    <div class="header"><img class="logo" src="/atlas-logo.png" alt="Atlas"><div><h1>${escape(title)}</h1><div class="meta">${rows.length} records · ${escape(new Date().toLocaleString())}</div></div></div>
    ${reportKey.includes("work order") ? `<div class="summary"><div class="stat"><span>Work Orders</span><strong>${rows.length}</strong></div><div class="stat"><span>Estimated</span><strong>${escape(money(estimated))}</strong></div><div class="stat"><span>Actual</span><strong>${escape(money(actual))}</strong></div></div>` : ""}
    <table><thead><tr>${columns.map((column)=>`<th>${escape(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row)=>`<tr>${columns.map((column)=>`<td>${escape(formatPrintValue(column.key, row[column.source!]))}</td>`).join("")}</tr>`).join("")}</tbody></table>
  </body></html>`);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => {
    popup.print();
  }, 300);
}

export default function ReportsAccessCenter({ data, colors, isMobile, analytics }: Props) {
  const [report, setReport] = useState<ReportKey>("workOrders");
  const [team, setTeam] = useState<Member[]>(defaultTeam);
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Employee");
  const [newPropertyIds, setNewPropertyIds] = useState<string[]>(["2000"]);
  const [newAccessProfiles, setNewAccessProfiles] = useState<string[]>([]);
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
  const [centerSection, setCenterSection] = useState<"reports" | "analytics" | "access" | "system">("reports");

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
          accessProfiles: Array.isArray((member as any).accessProfiles) ? (member as any).accessProfiles.map(String) : [],
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
    const response = await fetch("/api/atlas-team", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"invite", member:{ id:`team-${Date.now()}`, name:newName.trim(), email:newEmail.trim(), role:newRole.toLowerCase(), active:true, propertyIds:newPropertyIds, permissions:roleDefaults[newRole], accessProfiles:newAccessProfiles } }) });
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

  const card = {
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    background: colors.card,
    padding: isMobile ? 14 : 18,
    boxShadow: "0 8px 24px rgba(7, 27, 47, 0.05)",
  };
  const control = {
    width: "100%",
    minHeight: 40,
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    padding: "8px 10px",
    background: "#fff",
    color: colors.navy,
    fontWeight: 750,
  };
  const button = {
    border: 0,
    borderRadius: 10,
    background: colors.gold,
    color: colors.navy,
    padding: "10px 13px",
    fontWeight: 950,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
  const quietButton = {
    ...button,
    background: "#fff",
    border: `1px solid ${colors.line}`,
  };
  const sectionLabel = {
    color: colors.gold,
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: ".12em",
    textTransform: "uppercase" as const,
  };
  const activeMemberCount = team.filter((member) => member.active).length;
  const reportLabel = reports.find(([key]) => key === report)?.[1] || "Report";
  const anyReportFilter = Boolean(
    search || dateFrom || dateTo || statusFilter !== "All" || priorityFilter !== "All" || assignedFilter !== "All" || alertMode,
  );

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <section
        style={{
          borderRadius: 16,
          background: colors.navy,
          padding: isMobile ? "16px 14px" : "18px 20px",
          color: "#fff",
          display: "grid",
          gap: 14,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: colors.gold, fontSize: 10, fontWeight: 950, letterSpacing: ".14em", textTransform: "uppercase" }}>Administration</div>
            <h1 style={{ margin: "4px 0 3px", fontSize: isMobile ? 23 : 28, lineHeight: 1.08 }}>Reports & Access</h1>
            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 13 }}>Operational reports and analytics for Atlas property operations.</div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <div style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 10, padding: "8px 10px", minWidth: 84 }}>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: "rgba(255,255,255,.6)" }}>Records</div>
              <strong style={{ fontSize: 17 }}>{Object.values(data).reduce((total, rows) => total + rows.length, 0)}</strong>
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,.16)", borderRadius: 10, padding: "8px 10px", minWidth: 84 }}>
              <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: "rgba(255,255,255,.6)" }}>Active users</div>
              <strong style={{ fontSize: 17 }}>{activeMemberCount}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {([[
            "reports",
            "Reports",
          ], ["analytics", "Operations Analytics"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCenterSection(value)}
              style={{
                border: `1px solid ${centerSection === value ? colors.gold : "rgba(255,255,255,.18)"}`,
                borderRadius: 9,
                padding: "8px 12px",
                background: centerSection === value ? colors.gold : "rgba(255,255,255,.06)",
                color: centerSection === value ? colors.navy : "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {centerSection === "reports" ? (
        <>
          <section style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <div style={sectionLabel}>Reporting</div>
                <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 20 }}>Property reports</h2>
                <p style={{ margin: 0, color: colors.muted, fontSize: 13 }}>Filter the live Atlas records, then export only what you need.</p>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button type="button" onClick={() => printReport(`Atlas ${reportLabel}`, filteredRows)} disabled={!filteredRows.length} style={{ ...quietButton, opacity: filteredRows.length ? 1 : .55 }}>Print / PDF</button>
                <button type="button" onClick={() => downloadCsv(report, filteredRows)} disabled={!filteredRows.length} style={{ ...button, opacity: filteredRows.length ? 1 : .55 }}>Export CSV</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
              {[
                ["Estimated", money(estimatedTotal)],
                ["Actual", money(actualTotal)],
                ["Completed", String(completedCount)],
                ["Missing costs", String(missingCostCount)],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${colors.line}`, borderRadius: 11, background: colors.panel, padding: "9px 10px" }}>
                  <span style={{ display: "block", fontSize: 9, fontWeight: 900, color: colors.muted, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
                  <strong style={{ display: "block", marginTop: 2, fontSize: isMobile ? 16 : 18, color: colors.navy, overflowWrap: "anywhere" }}>{value}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 10 }}>
              {reports.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setReport(value); clearFilters(); }}
                  style={{
                    border: `1px solid ${report === value ? colors.gold : colors.line}`,
                    borderRadius: 999,
                    padding: "7px 10px",
                    background: report === value ? "#FFF3CF" : "#fff",
                    color: colors.navy,
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label} · {data[value].length}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(220px,1.6fr) repeat(2,minmax(130px,.65fr)) minmax(130px,.7fr) minmax(130px,.7fr) minmax(145px,.75fr) auto", gap: 7 }}>
              <input value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder={`Search ${reportLabel.toLowerCase()}`} style={control} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.currentTarget.value)} aria-label="From date" style={control} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.currentTarget.value)} aria-label="To date" style={control} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.currentTarget.value)} style={control} aria-label="Status filter"><option>All</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.currentTarget.value)} style={control} aria-label="Priority filter"><option>All</option>{priorities.map((value) => <option key={value}>{value}</option>)}</select>
              <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.currentTarget.value)} disabled={report !== "workOrders"} style={{ ...control, opacity: report === "workOrders" ? 1 : .55 }} aria-label="Assigned to filter"><option>All</option>{assignments.map((value) => <option key={value}>{value}</option>)}</select>
              <button type="button" onClick={clearFilters} disabled={!anyReportFilter} style={{ ...quietButton, opacity: anyReportFilter ? 1 : .5 }}>Clear</button>
            </div>

            <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", gap: 8, color: colors.muted, fontSize: 12, flexWrap: "wrap" }}>
              <span><strong style={{ color: colors.navy }}>{filteredRows.length}</strong> matching record{filteredRows.length === 1 ? "" : "s"}</span>
              {anyReportFilter ? <span>Filtered from {data[report].length}</span> : null}
            </div>
          </section>

          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <div style={sectionLabel}>Operations</div>
                <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 19 }}>Work requiring attention</h2>
              </div>
              {alertMode ? <button type="button" onClick={clearFilters} style={quietButton}>Close results</button> : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 8 }}>
              {alerts.map((alert) => (
                <button
                  type="button"
                  onClick={() => openAlert(alert.mode)}
                  key={alert.label}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    border: `1px solid ${alertMode === alert.mode ? colors.gold : colors.line}`,
                    borderRadius: 11,
                    background: alertMode === alert.mode ? "#FFF8E5" : colors.panel,
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ fontSize: 22, color: colors.navy }}>{alert.count}</strong>
                  <div style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>{alert.label}</div>
                </button>
              ))}
            </div>
            {alertMode ? (
              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                {filteredRows.length ? filteredRows.slice(0, 25).map((row) => (
                  <div key={String(row.id)} style={{ padding: "8px 10px", border: `1px solid ${colors.line}`, borderRadius: 9, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ color: colors.navy, fontSize: 12 }}>{String(row.title || "Untitled work order")}</strong>
                    <span style={{ color: colors.muted, fontSize: 11 }}>{String(row.date || "No date")} · {String(row.priority || "Medium")} · {String(row.status || "Open")}</span>
                  </div>
                )) : <div style={{ color: colors.muted, fontSize: 12 }}>No matching work orders.</div>}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {centerSection === "analytics" ? (
        <section style={card}>
          <div style={{ marginBottom: 12 }}>
            <div style={sectionLabel}>Analytics</div>
            <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 20 }}>Operations Analytics</h2>
            <p style={{ margin: 0, color: colors.muted, fontSize: 13 }}>Operational trends and workload analysis without accounting or expense tracking.</p>
          </div>
          {analytics || <div style={{ color: colors.muted, fontSize: 13 }}>Operations analytics are not available in this view.</div>}
        </section>
      ) : null}

      {centerSection === "access" ? (
        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 13 }}>
            <div>
              <div style={sectionLabel}>Team Access</div>
              <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 20 }}>People & permissions</h2>
              <p style={{ margin: 0, color: colors.muted, fontSize: 13 }}>Keep property access, operating-area access, and permissions together for each person.</p>
            </div>
            <button type="button" onClick={() => void saveAccess()} style={button}>Save Access</button>
          </div>

          {message ? <div style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: "9px 11px", background: colors.panel, color: colors.navy, fontSize: 12, fontWeight: 850, marginBottom: 10 }}>{message}</div> : null}

          <div style={{ display: "grid", gap: 8 }}>
            {team.map((member) => (
              <div key={member.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 11, background: "#fff", display: "grid", gap: 9 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(180px,1.2fr) minmax(220px,1.35fr) minmax(150px,.7fr) auto", gap: 8, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: colors.navy }}>{member.name}</strong>
                    <span style={{ color: colors.muted, fontSize: 11 }}>{member.inviteStatus || "Existing access"}</span>
                  </div>
                  <span style={{ color: colors.muted, fontSize: 12, overflowWrap: "anywhere" }}>{member.email}</span>
                  <select value={member.role} disabled={member.role === "Master"} onChange={(event) => { const role = event.currentTarget.value as Role; updateMember(member.id, { role, permissions: roleDefaults[role] }); }} style={control}>
                    {(["Master", "Administrator", "Manager", "Employee", "Vendor", "Viewer"] as Role[]).map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={member.active} disabled={member.role === "Master"} onChange={(event) => updateMember(member.id, { active: event.currentTarget.checked })} /> Active
                  </label>
                </div>

                <div style={{ color: colors.muted, fontSize: 11 }}>{descriptions[member.role]}</div>

                <div style={{ display: "grid", gap: 6, paddingTop: 7, borderTop: `1px solid ${colors.line}` }}>
                  <strong style={{ color: colors.navy, fontSize: 11 }}>Properties</strong>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                    {properties.map(([id, label]) => <label key={id} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, fontWeight: 800 }}><input type="checkbox" disabled={member.role === "Master"} checked={member.propertyIds.includes(id)} onChange={(event) => updateMember(member.id, { propertyIds: event.currentTarget.checked ? [...member.propertyIds, id] : member.propertyIds.filter((value) => value !== id) })} />{label}</label>)}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ color: colors.navy, fontSize: 11 }}>Operating areas</strong>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                    {member.role === "Master" || member.role === "Administrator" ? (
                      <span style={{ fontSize: 11, color: colors.muted, fontWeight: 800 }}>All Atlas records</span>
                    ) : accessProfileOptions.map(([id, label]) => <label key={id} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, fontWeight: 800 }}><input type="checkbox" checked={member.accessProfiles.includes(id)} onChange={(event) => updateMember(member.id, { accessProfiles: event.currentTarget.checked ? [...member.accessProfiles, id] : member.accessProfiles.filter((value) => value !== id) })} />{label}</label>)}
                    {member.role !== "Master" && member.role !== "Administrator" && !member.accessProfiles.length ? <span style={{ fontSize: 11, color: colors.muted }}>No profile selected = legacy unrestricted access</span> : null}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ color: colors.navy, fontSize: 11 }}>Permissions</strong>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                    {permissionLabels.map(([key, label]) => <label key={key} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, fontWeight: 800 }}><input type="checkbox" disabled={member.role === "Master"} checked={member.permissions[key]} onChange={(event) => updateMember(member.id, { permissions: { ...member.permissions, [key]: event.currentTarget.checked } })} />{label}</label>)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${colors.line}`, display: "grid", gap: 9 }}>
            <div>
              <strong style={{ color: colors.navy }}>Invite team member</strong>
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Create a secure Atlas invitation with the right property and operating-area access.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.3fr .8fr auto", gap: 8 }}>
              <input value={newName} onChange={(e) => setNewName(e.currentTarget.value)} placeholder="Name" style={control} />
              <input value={newEmail} onChange={(e) => setNewEmail(e.currentTarget.value)} placeholder="Email" style={control} />
              <select value={newRole} onChange={(e) => setNewRole(e.currentTarget.value as Role)} style={control}><option>Administrator</option><option>Manager</option><option>Employee</option><option>Vendor</option><option>Viewer</option></select>
              <button type="button" onClick={() => void createInvite()} style={button}>Create Invite</button>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
              <strong style={{ color: colors.navy, fontSize: 11 }}>Properties</strong>
              {properties.map(([id, label]) => (
                <label key={id} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, fontWeight: 800 }}>
                  <input type="checkbox" checked={newPropertyIds.includes(id)} onChange={(event) => { const checked = event.currentTarget.checked; setNewPropertyIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((value) => value !== id)); }} />
                  {label}
                </label>
              ))}
            </div>
            {newRole !== "Administrator" ? (
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                <strong style={{ color: colors.navy, fontSize: 11 }}>Operating areas</strong>
                {accessProfileOptions.map(([id, label]) => (
                  <label key={id} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11, fontWeight: 800 }}>
                    <input type="checkbox" checked={newAccessProfiles.includes(id)} onChange={(event) => setNewAccessProfiles((current) => event.currentTarget.checked ? Array.from(new Set([...current, id])) : current.filter((value) => value !== id))} />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}
            {inviteLink ? <div style={{ display: "grid", gap: 5 }}><span style={{ fontSize: 11, color: colors.muted }}>Invitation expires in 7 days.</span><input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} style={control} /></div> : null}
          </div>
        </section>
      ) : null}

      {centerSection === "system" ? (
        <>
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={sectionLabel}>Backup & Recovery</div>
                <h2 style={{ margin: "4px 0 2px", color: colors.navy, fontSize: 20 }}>Atlas backups</h2>
                <p style={{ margin: 0, color: colors.muted, fontSize: 13 }}>Create a protected server backup or download the records currently loaded in Atlas.</p>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button type="button" onClick={downloadBackup} style={quietButton}>Download Current Data</button>
                <button type="button" onClick={() => void createServerBackup()} style={button}>Create Protected Backup</button>
              </div>
            </div>
            {message ? <div style={{ marginTop: 10, color: colors.navy, fontSize: 12, fontWeight: 850 }}>{message}</div> : null}
            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {backups.length ? backups.slice(0, 5).map((backup) => (
                <div key={String(backup.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 10px", border: `1px solid ${colors.line}`, borderRadius: 10, flexWrap: "wrap" }}>
                  <span style={{ color: colors.navy, fontSize: 12 }}>{new Date(String(backup.created_at)).toLocaleString()} · {String(backup.reason)}</span>
                  <button type="button" onClick={() => void downloadProtectedBackup(String(backup.id))} style={{ ...quietButton, padding: "7px 9px" }}>Download</button>
                </div>
              )) : <div style={{ color: colors.muted, fontSize: 12 }}>No protected backups listed.</div>}
            </div>
          </section>

          <section style={card}>
            <div style={sectionLabel}>System History</div>
            <h2 style={{ margin: "4px 0 10px", color: colors.navy, fontSize: 20 }}>Recent changes</h2>
            <div style={{ display: "grid", gap: 6 }}>
              {history.length ? history.slice(0, 12).map((entry) => (
                <div key={String(entry.id)} style={{ padding: "9px 10px", border: `1px solid ${colors.line}`, borderRadius: 10, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(180px,.8fr) minmax(180px,1fr) auto", gap: 6, alignItems: "center", fontSize: 12 }}>
                  <strong style={{ color: colors.navy }}>{String(entry.action).toUpperCase()} · {String(entry.table_name)}</strong>
                  <span style={{ color: colors.muted }}>{String(entry.actor || "Atlas user")}</span>
                  <span style={{ color: colors.muted, fontSize: 11 }}>{new Date(String(entry.created_at)).toLocaleString()}</span>
                </div>
              )) : <div style={{ color: colors.muted, fontSize: 12 }}>No change history available.</div>}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
