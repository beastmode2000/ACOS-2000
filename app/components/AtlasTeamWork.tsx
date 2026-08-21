"use client";

import React, { useEffect, useMemo, useState } from "react";
import { colors } from "../lib/atlas-page-config";

type TeamTaskStatus = "Open" | "In Progress" | "Waiting" | "Completed";

type TeamTask = {
  id: string;
  title: string;
  assignee: string;
  location: string;
  notes: string;
  status: TeamTaskStatus;
  requirePhoto: boolean;
};

type TeamList = {
  id: string;
  name: string;
  description: string;
  defaultAssignee: string;
  propertyIds: string[];
  schedule: string;
  active: boolean;
  tasks: TeamTask[];
};

type Props = {
  activePropertyId: string;
};

const PEOPLE = ["Addison", "Pat's Crew", "Sean", "Nick", "Unassigned"];
const PROPERTY_IDS = ["2000", "3661", "6855", "hangar"];
const STORAGE_KEY = "atlas-team-work-v2";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function task(
  title: string,
  assignee: string,
  location = "",
  notes = "",
): TeamTask {
  return {
    id: uid("team-task"),
    title,
    assignee,
    location,
    notes,
    status: "Open",
    requirePhoto: false,
  };
}

function starterLists(): TeamList[] {
  return [
    {
      id: "addison-daily-routine",
      name: "Addison Daily Routine",
      description:
        "Daily appearance, cleanup, watering, inspections, and reporting.",
      defaultAssignee: "Addison",
      propertyIds: ["2000"],
      schedule: "Monday-Friday",
      active: true,
      tasks: [
        task("Walk the property and report anything unusual", "Addison"),
        task(
          "Clean the dog turf and trampoline area",
          "Addison",
          "Trampoline / Dog",
        ),
        task("Pick up litter, branches, and visible debris", "Addison"),
        task("Check packages and garage garbage", "Addison", "Garages"),
        task("Check and refill fountains as needed", "Addison", "Courtyard"),
        task("Water pots and obvious dry spots", "Addison"),
        task("Sweep courtyard, patios, and main walkways", "Addison"),
        task("Walk the dock and remove goose debris", "Addison", "Dock"),
        task("Put tools away and report unfinished work", "Addison"),
      ],
    },
    {
      id: "pat-tuesday-landscaping",
      name: "Tuesday Landscaping Crew",
      description:
        "Pat's two-person crew completes priority areas section-by-section every Tuesday.",
      defaultAssignee: "Pat's Crew",
      propertyIds: ["2000"],
      schedule: "Every Tuesday",
      active: true,
      tasks: [
        task(
          "Complete waterside beds and lake-facing areas",
          "Pat's Crew",
          "Waterside Lawn",
        ),
        task(
          "Complete main patio and Addition beds",
          "Pat's Crew",
          "Addition",
        ),
        task("Complete courtyard beds", "Pat's Crew", "Courtyard"),
        task(
          "Complete driveway and entrance beds",
          "Pat's Crew",
          "Driveway",
        ),
        task(
          "Complete dock approach and shoreline edges",
          "Pat's Crew",
          "Dock",
        ),
        task(
          "Complete East Lawn, Sport Court, and garage beds",
          "Pat's Crew",
          "East Lawn",
        ),
        task(
          "Remove debris and report spraying, pruning, or irrigation needs",
          "Pat's Crew",
        ),
      ],
    },
    {
      id: "sean-marine-service",
      name: "Sean Boat Detailing & Marine Requests",
      description:
        "Boat detailing and marine-service assignments, with 3661 as the primary property.",
      defaultAssignee: "Sean",
      propertyIds: ["3661", "2000", "6855"],
      schedule: "As requested",
      active: true,
      tasks: [
        task("Review new boat service requests", "Sean"),
        task("Confirm property, watercraft, and requested service", "Sean"),
        task("Take before photos when needed", "Sean"),
        task("Complete scheduled wash, detail, wax, or interior work", "Sean"),
        task("Upload after photos and service notes", "Sean"),
        task(
          "Report repairs, damage, supplies, or recommended maintenance",
          "Sean",
        ),
        task("Mark request completed", "Sean"),
      ],
    },
  ];
}


type Role = "Master" | "Administrator" | "Manager" | "Employee" | "Vendor" | "Viewer";
type Permissions = { view: boolean; edit: boolean; approve: boolean; delete: boolean; manageUsers: boolean };
type TeamMember = { id: string; name: string; email: string; role: Role; active: boolean; propertyIds: string[]; permissions: Permissions; accessProfiles: string[]; inviteStatus?: string; fieldLinkActive?: boolean; fieldPropertyId?: string };

const roleDefaults: Record<Role, Permissions> = {
  Master: { view: true, edit: true, approve: true, delete: true, manageUsers: true },
  Administrator: { view: true, edit: true, approve: true, delete: true, manageUsers: true },
  Manager: { view: true, edit: true, approve: true, delete: false, manageUsers: false },
  Employee: { view: true, edit: true, approve: false, delete: false, manageUsers: false },
  Vendor: { view: true, edit: false, approve: false, delete: false, manageUsers: false },
  Viewer: { view: true, edit: false, approve: false, delete: false, manageUsers: false },
};

const accessProfileOptions = [
  ["marine", "Dock & Waterfront"],
  ["landscaping", "Landscaping & Irrigation"],
  ["house", "House"],
  ["maintenance", "Maintenance"],
  ["pool-spa", "Pool & Spa"],
  ["vehicles", "Vehicles / Garage"],
] as const;

function normalizeRole(value: string): Role {
  const clean = value.toLowerCase();
  if (clean === "master") return "Master";
  if (clean === "administrator") return "Administrator";
  if (clean === "manager") return "Manager";
  if (clean === "employee" || clean === "operations") return "Employee";
  if (clean === "vendor") return "Vendor";
  return "Viewer";
}

export default function AtlasTeamWork({ activePropertyId }: Props) {
  const [tab, setTab] = useState<"people" | "assignments">("people");
  const [lists, setLists] = useState<TeamList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Employee");
  const [newPropertyIds, setNewPropertyIds] = useState<string[]>([activePropertyId]);
  const [newAccessProfiles, setNewAccessProfiles] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [fieldLink, setFieldLink] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as TeamList[]) : null;
      const next = Array.isArray(parsed) && parsed.length ? parsed : starterLists();
      setLists(next);
      setSelectedListId(next[0]?.id || "");
    } catch {
      const next = starterLists();
      setLists(next);
      setSelectedListId(next[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    if (!lists.length) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists)); } catch { /* keep local UI usable */ }
  }, [lists]);

  async function loadMembers() {
    try {
      const response = await fetch("/api/atlas-team");
      const payload = await response.json();
      if (!response.ok || !payload.ok || !Array.isArray(payload.members)) throw new Error(payload.error || "Could not load team.");
      const next = payload.members.map((member: any): TeamMember => ({
        ...member,
        role: normalizeRole(String(member.role || "viewer")),
        active: member.active !== false,
        propertyIds: Array.isArray(member.propertyIds) ? member.propertyIds.map(String) : ["2000"],
        permissions: { ...roleDefaults.Viewer, ...(member.permissions || {}) },
        accessProfiles: Array.isArray(member.accessProfiles) ? member.accessProfiles.map(String) : [],
      }));
      setMembers(next);
      setSelectedMemberId((current) => current && next.some((member: TeamMember) => member.id === current) ? current : next[0]?.id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not load team members.");
    }
  }

  useEffect(() => { void loadMembers(); }, []);

  const visibleLists = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lists.filter((list) => {
      const matchesProperty = list.propertyIds.includes(activePropertyId);
      const matchesSearch = !query || [list.name, list.description, list.defaultAssignee, list.schedule, ...list.tasks.flatMap((item) => [item.title, item.assignee, item.location, item.notes])].join(" ").toLowerCase().includes(query);
      return matchesProperty && matchesSearch;
    });
  }, [activePropertyId, lists, search]);

  useEffect(() => {
    if (visibleLists.length && !visibleLists.some((list) => list.id === selectedListId)) setSelectedListId(visibleLists[0].id);
  }, [selectedListId, visibleLists]);

  const selected = lists.find((list) => list.id === selectedListId) || visibleLists[0];
  const propertyTasks = lists.filter((list) => list.propertyIds.includes(activePropertyId)).flatMap((list) => list.tasks);
  const visibleMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) => !query || `${member.name} ${member.email} ${member.role} ${member.propertyIds.join(" ")} ${member.accessProfiles.join(" ")}`.toLowerCase().includes(query));
  }, [members, memberSearch]);
  const selectedMember = members.find((member) => member.id === selectedMemberId) || visibleMembers[0];

  async function createFieldLink(member: TeamMember) {
    setMessage("Creating My Work link…");
    setFieldLink("");
    try {
      const propertyId = member.propertyIds.includes(activePropertyId) ? activePropertyId : (member.propertyIds[0] || "2000");
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "field-link", member: { id: member.id, fieldPropertyId: propertyId } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.fieldPath) throw new Error(payload.error || "Could not create My Work link.");
      const link = `${window.location.origin}${payload.fieldPath}`;
      setFieldLink(link);
      await navigator.clipboard?.writeText(link);
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, fieldLinkActive: true, fieldPropertyId: String(payload.propertyId || propertyId) } : item));
      setMessage("My Work link created and copied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create My Work link.");
    }
  }

  async function revokeFieldLink(member: TeamMember) {
    if (!window.confirm(`Disable the My Work link for ${member.name}?`)) return;
    setMessage("Disabling My Work link…");
    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "field-link-revoke", member: { id: member.id } }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not disable My Work link.");
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, fieldLinkActive: false, fieldPropertyId: "" } : item));
      setFieldLink("");
      setMessage("My Work link disabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable My Work link.");
    }
  }

  function updateList(id: string, patch: Partial<TeamList>) { setLists((current) => current.map((list) => list.id === id ? { ...list, ...patch } : list)); }
  function updateTask(listId: string, taskId: string, patch: Partial<TeamTask>) { setLists((current) => current.map((list) => list.id !== listId ? list : { ...list, tasks: list.tasks.map((item) => item.id === taskId ? { ...item, ...patch } : item) })); }
  function createList() { const next: TeamList = { id: uid("team-list"), name: "New Team List", description: "", defaultAssignee: "Unassigned", propertyIds: [activePropertyId], schedule: "As needed", active: true, tasks: [] }; setLists((current) => [next, ...current]); setSelectedListId(next.id); setTab("assignments"); }
  function duplicateList() { if (!selected) return; const copy: TeamList = { ...selected, id: uid("team-list"), name: `${selected.name} Copy`, tasks: selected.tasks.map((item) => ({ ...item, id: uid("team-task"), status: "Open" })) }; setLists((current) => [copy, ...current]); setSelectedListId(copy.id); }
  function deleteList() { if (!selected || !window.confirm(`Delete "${selected.name}"?`)) return; const next = lists.filter((list) => list.id !== selected.id); setLists(next); setSelectedListId(next.find((list) => list.propertyIds.includes(activePropertyId))?.id || ""); }
  function addTask() { if (!selected) return; updateList(selected.id, { tasks: [...selected.tasks, task("New task", selected.defaultAssignee || "Unassigned")] }); }
  function deleteTask(taskId: string) { if (!selected) return; updateList(selected.id, { tasks: selected.tasks.filter((item) => item.id !== taskId) }); }
  function moveTask(index: number, direction: -1 | 1) { if (!selected) return; const targetIndex = index + direction; if (targetIndex < 0 || targetIndex >= selected.tasks.length) return; const next = [...selected.tasks]; [next[index], next[targetIndex]] = [next[targetIndex], next[index]]; updateList(selected.id, { tasks: next }); }
  function toggleProperty(propertyId: string) { if (!selected) return; const exists = selected.propertyIds.includes(propertyId); const next = exists ? selected.propertyIds.filter((id) => id !== propertyId) : [...selected.propertyIds, propertyId]; if (next.length) updateList(selected.id, { propertyIds: next }); }

  function updateMember(id: string, patch: Partial<TeamMember>) { setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member)); setMessage(""); }

  async function saveMembers() {
    setMessage("Saving team access…");
    try {
      const response = await fetch("/api/atlas-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ members: members.map((member) => ({ ...member, role: member.role.toLowerCase() })) }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(String(payload.error || "Team access could not be saved."));
      setMessage("Team access saved.");
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Team access could not be saved."); }
  }

  async function createInvite() {
    if (!newName.trim() || !newEmail.includes("@")) { setMessage("Enter a name and email."); return; }
    setMessage("Creating invitation…");
    try {
      const response = await fetch("/api/atlas-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite", member: { id: `team-${Date.now()}`, name: newName.trim(), email: newEmail.trim(), role: newRole.toLowerCase(), active: true, propertyIds: newPropertyIds.length ? newPropertyIds : [activePropertyId], permissions: roleDefaults[newRole], accessProfiles: newAccessProfiles } }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(String(payload.error || "Invitation could not be created."));
      const link = `${window.location.origin}${payload.invitePath}`;
      setInviteLink(link);
      try { await navigator.clipboard?.writeText(link); } catch { /* link stays visible */ }
      setMessage("Invitation created.");
      await loadMembers();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitation could not be created."); }
  }

  const tabButton = (active: boolean): React.CSSProperties => ({ border: `1px solid ${active ? colors.gold : colors.line}`, borderRadius: 10, padding: "8px 12px", background: active ? "#FFF3CF" : "#FFFFFF", color: colors.navy, fontWeight: 900, cursor: "pointer" });
  const compactCard: React.CSSProperties = { border: `1px solid ${colors.line}`, borderRadius: 14, background: colors.card, padding: 12 };

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div style={{ ...heroStyle, padding: 18 }}>
        <div><div style={eyebrowStyle}>TEAM</div><h1 style={{ ...titleStyle, fontSize: 30 }}>Team</h1><p style={heroCopyStyle}>People, helpers, assignments, roles, and Atlas access in one place.</p></div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" onClick={() => setTab("people")} style={tabButton(tab === "people")}>People & Access</button><button type="button" onClick={() => setTab("assignments")} style={tabButton(tab === "assignments")}>Assignments</button></div>
      </div>

      {tab === "people" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}><Stat label="Team Members" value={members.length} /><Stat label="Active" value={members.filter((member) => member.active).length} /><Stat label="Admins" value={members.filter((member) => member.role === "Master" || member.role === "Administrator").length} /><Stat label="Helpers / Staff" value={members.filter((member) => ["Manager", "Employee", "Vendor"].includes(member.role)).length} /></div>
          <div className="atlas-team-workspace" style={workspaceStyle}>
            <aside style={{ ...panelStyle, padding: 12 }}>
              <div style={{ display: "flex", gap: 7 }}><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search people" style={fieldStyle} /></div>
              <div style={{ display: "grid", gap: 7, marginTop: 9 }}>{visibleMembers.map((member) => <button key={member.id} type="button" onClick={() => setSelectedMemberId(member.id)} style={{ ...listCardStyle, padding: 10, borderWidth: 1, borderColor: selectedMember?.id === member.id ? colors.gold : colors.line, background: selectedMember?.id === member.id ? "#FFF9E8" : colors.card, cursor: "pointer" }}><strong style={{ color: colors.text }}>{member.name}</strong><span style={mutedStyle}>{member.role} · {member.active ? "Active" : "Inactive"}</span><span style={mutedStyle}>{member.email}</span></button>)}</div>
            </aside>

            <div style={{ display: "grid", gap: 10 }}>
              {selectedMember ? <div style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}><div><div style={eyebrowStyle}>PERSON</div><h2 style={{ margin: "4px 0", color: colors.navy }}>{selectedMember.name}</h2><div style={mutedStyle}>{selectedMember.email}</div></div><button type="button" onClick={() => void saveMembers()} style={goldButtonStyle}>Save Changes</button></div>
                <div className="atlas-team-settings" style={{ ...settingsGridStyle, marginTop: 12 }}>
                  <label style={labelStyle}>Role<select value={selectedMember.role} disabled={selectedMember.role === "Master"} onChange={(event) => { const role = event.target.value as Role; updateMember(selectedMember.id, { role, permissions: roleDefaults[role] }); }} style={fieldStyle}>{(["Master","Administrator","Manager","Employee","Vendor","Viewer"] as Role[]).map((role) => <option key={role}>{role}</option>)}</select></label>
                  <label style={labelStyle}>Status<select value={selectedMember.active ? "Active" : "Inactive"} disabled={selectedMember.role === "Master"} onChange={(event) => updateMember(selectedMember.id, { active: event.target.value === "Active" })} style={fieldStyle}><option>Active</option><option>Inactive</option></select></label>
                  <label style={labelStyle}>Invitation<div style={{ ...fieldStyle, minHeight: 42, display: "flex", alignItems: "center" }}>{selectedMember.inviteStatus || "Existing Access"}</div></label>
                </div>
                <div style={{ marginTop: 14 }}><div style={labelStyle}>Property access</div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>{PROPERTY_IDS.map((propertyId) => { const active = selectedMember.propertyIds.includes(propertyId); return <button key={propertyId} type="button" disabled={selectedMember.role === "Master"} onClick={() => updateMember(selectedMember.id, { propertyIds: active ? selectedMember.propertyIds.filter((id) => id !== propertyId) : [...selectedMember.propertyIds, propertyId] })} style={{ ...propertyChipStyle, background: active ? colors.navy3 : colors.card, color: active ? "#fff" : colors.text, cursor: "pointer" }}>{propertyId === "hangar" ? "Hangar" : propertyId}</button>; })}</div></div>
                <div style={{ marginTop: 14 }}><div style={labelStyle}>Operating areas</div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>{selectedMember.role === "Master" || selectedMember.role === "Administrator" ? <span style={mutedStyle}>Full Atlas access</span> : accessProfileOptions.map(([id,label]) => { const active = selectedMember.accessProfiles.includes(id); return <button key={id} type="button" onClick={() => updateMember(selectedMember.id, { accessProfiles: active ? selectedMember.accessProfiles.filter((value) => value !== id) : [...selectedMember.accessProfiles, id] })} style={{ ...propertyChipStyle, background: active ? "#FFF3CF" : colors.card, borderColor: active ? colors.gold : colors.line, cursor: "pointer" }}>{label}</button>; })}</div></div>
                <div style={{ marginTop: 14 }}><div style={labelStyle}>Permissions</div><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 7 }}>{([['view','View'],['edit','Edit'],['approve','Approve'],['delete','Delete'],['manageUsers','Manage Users']] as Array<[keyof Permissions,string]>).map(([key,label]) => <label key={key} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, fontWeight: 800 }}><input type="checkbox" disabled={selectedMember.role === "Master"} checked={selectedMember.permissions[key]} onChange={(event) => updateMember(selectedMember.id, { permissions: { ...selectedMember.permissions, [key]: event.target.checked } })} />{label}</label>)}</div></div>
                {selectedMember.role === "Employee" ? <div style={{ marginTop: 14, padding: 10, border: `1px solid ${colors.line}`, borderRadius: 10, background: "#F8FAFC" }}><div style={labelStyle}>My Work link</div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}><button type="button" onClick={() => void createFieldLink(selectedMember)} style={goldButtonStyle}>{selectedMember.fieldLinkActive ? "Replace Link" : "Create Link"}</button>{selectedMember.fieldLinkActive ? <button type="button" onClick={() => void revokeFieldLink(selectedMember)} style={{ ...goldButtonStyle, background: "#FFFFFF", color: colors.red, border: `1px solid ${colors.line}` }}>Disable Link</button> : null}<span style={mutedStyle}>{selectedMember.fieldLinkActive ? `Active · ${selectedMember.fieldPropertyId || activePropertyId}` : "No public employee link"}</span></div>{fieldLink ? <input readOnly value={fieldLink} onFocus={(event) => event.currentTarget.select()} style={{ ...fieldStyle, marginTop: 8 }} /> : null}</div> : null}
                {message ? <div style={{ marginTop: 12, color: colors.green, fontWeight: 850, fontSize: 12 }}>{message}</div> : null}
              </div> : <div style={emptyStyle}>No team member selected.</div>}

              <div style={compactCard}><strong style={{ color: colors.navy }}>Invite Team Member</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginTop: 9 }}><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Name" style={fieldStyle}/><input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="Email" style={fieldStyle}/><select value={newRole} onChange={(event) => setNewRole(event.target.value as Role)} style={fieldStyle}><option>Administrator</option><option>Manager</option><option>Employee</option><option>Vendor</option><option>Viewer</option></select><button type="button" onClick={() => void createInvite()} style={goldButtonStyle}>Create Invite</button></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>{PROPERTY_IDS.map((propertyId) => <label key={propertyId} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 12, fontWeight: 800 }}><input type="checkbox" checked={newPropertyIds.includes(propertyId)} onChange={(event) => setNewPropertyIds((current) => event.target.checked ? Array.from(new Set([...current, propertyId])) : current.filter((id) => id !== propertyId))}/>{propertyId === "hangar" ? "Hangar" : propertyId}</label>)}</div>{!["Master","Administrator"].includes(newRole) ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>{accessProfileOptions.map(([id,label]) => <label key={id} style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 12, fontWeight: 800 }}><input type="checkbox" checked={newAccessProfiles.includes(id)} onChange={(event) => setNewAccessProfiles((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))}/>{label}</label>)}</div> : null}{inviteLink ? <input readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} style={{ ...fieldStyle, marginTop: 9 }} /> : null}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}><Stat label="Active Lists" value={visibleLists.filter((item) => item.active).length}/><Stat label="Assigned Tasks" value={propertyTasks.length}/><Stat label="Open" value={propertyTasks.filter((item) => item.status !== "Completed").length}/><Stat label="Completed" value={propertyTasks.filter((item) => item.status === "Completed").length}/></div>
          <div className="atlas-team-workspace" style={workspaceStyle}>
            <aside style={panelStyle}><div style={{ display: "flex", gap: 7 }}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments" style={fieldStyle}/><button type="button" style={goldButtonStyle} onClick={createList}>+ List</button></div><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{visibleLists.map((list) => { const completed = list.tasks.filter((item) => item.status === "Completed").length; return <button key={list.id} type="button" onClick={() => setSelectedListId(list.id)} style={{ ...listCardStyle, borderColor: selected?.id === list.id ? colors.gold : colors.line, boxShadow: selected?.id === list.id ? "0 0 0 2px rgba(201,154,61,.16)" : "none", cursor: "pointer" }}><strong style={{ color: colors.text }}>{list.name}</strong><span style={mutedStyle}>{list.defaultAssignee} · {list.schedule}</span><span style={mutedStyle}>{completed} of {list.tasks.length} complete</span></button>; })}{!visibleLists.length ? <div style={emptyStyle}>No assignment lists for {activePropertyId}.</div> : null}</div></aside>
            <div style={panelStyle}>{!selected ? <div style={emptyStyle}>Create a list or select an existing assignment list.</div> : <><div style={editorHeaderStyle}><div style={{ flex: 1, minWidth: 220 }}><input value={selected.name} onChange={(event) => updateList(selected.id, { name: event.target.value })} style={titleFieldStyle}/><textarea value={selected.description} onChange={(event) => updateList(selected.id, { description: event.target.value })} placeholder="Describe this list" style={{ ...fieldStyle, minHeight: 68, marginTop: 7 }}/></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" style={lightButtonStyle} onClick={duplicateList}>Duplicate</button><button type="button" style={{ ...lightButtonStyle, color: colors.red }} onClick={deleteList}>Delete</button></div></div>
            <div className="atlas-team-settings" style={settingsGridStyle}><label style={labelStyle}>Default assignee<select value={selected.defaultAssignee} onChange={(event) => updateList(selected.id, { defaultAssignee: event.target.value })} style={fieldStyle}>{Array.from(new Set([...PEOPLE, ...members.map((member) => member.name)])).map((person) => <option key={person}>{person}</option>)}</select></label><label style={labelStyle}>Schedule<input value={selected.schedule} onChange={(event) => updateList(selected.id, { schedule: event.target.value })} style={fieldStyle}/></label><label style={labelStyle}>Status<select value={selected.active ? "Active" : "Paused"} onChange={(event) => updateList(selected.id, { active: event.target.value === "Active" })} style={fieldStyle}><option>Active</option><option>Paused</option></select></label></div>
            <div style={{ marginTop: 12 }}><div style={labelStyle}>Properties</div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>{PROPERTY_IDS.map((propertyId) => { const active = selected.propertyIds.includes(propertyId); return <button key={propertyId} type="button" onClick={() => toggleProperty(propertyId)} style={{ ...propertyChipStyle, background: active ? colors.navy3 : colors.card, color: active ? "#FFFFFF" : colors.text }}>{propertyId === "hangar" ? "Hangar" : propertyId}</button>; })}</div></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 16 }}><strong style={{ color: colors.navy }}>Tasks</strong><button type="button" style={goldButtonStyle} onClick={addTask}>+ Add Task</button></div>
            <div style={{ display: "grid", gap: 8, marginTop: 9 }}>{selected.tasks.map((item, index) => <div key={item.id} style={taskCardStyle}><div className="atlas-team-task-main" style={taskMainGridStyle}><input type="checkbox" checked={item.status === "Completed"} onChange={(event) => updateTask(selected.id, item.id, { status: event.target.checked ? "Completed" : "Open" })} style={{ width: 19, height: 19 }}/><input value={item.title} onChange={(event) => updateTask(selected.id, item.id, { title: event.target.value })} style={{ ...fieldStyle, fontWeight: 800 }}/><select value={item.assignee} onChange={(event) => updateTask(selected.id, item.id, { assignee: event.target.value })} style={fieldStyle}>{Array.from(new Set([...PEOPLE, ...members.map((member) => member.name)])).map((person) => <option key={person}>{person}</option>)}</select><select value={item.status} onChange={(event) => updateTask(selected.id, item.id, { status: event.target.value as TeamTaskStatus })} style={fieldStyle}><option>Open</option><option>In Progress</option><option>Waiting</option><option>Completed</option></select><div style={{ display: "flex", gap: 4 }}><button type="button" disabled={index === 0} onClick={() => moveTask(index, -1)} style={iconButtonStyle}>↑</button><button type="button" disabled={index === selected.tasks.length - 1} onClick={() => moveTask(index, 1)} style={iconButtonStyle}>↓</button><button type="button" onClick={() => deleteTask(item.id)} style={{ ...iconButtonStyle, color: colors.red }}>×</button></div></div><div className="atlas-team-task-details" style={taskDetailGridStyle}><input value={item.location} onChange={(event) => updateTask(selected.id, item.id, { location: event.target.value })} placeholder="Location" style={fieldStyle}/><input value={item.notes} onChange={(event) => updateTask(selected.id, item.id, { notes: event.target.value })} placeholder="Instructions or notes" style={fieldStyle}/><label style={photoLabelStyle}><input type="checkbox" checked={item.requirePhoto} onChange={(event) => updateTask(selected.id, item.id, { requirePhoto: event.target.checked })}/>Require photo</label></div></div>)}{!selected.tasks.length ? <div style={emptyStyle}>This list has no tasks yet.</div> : null}</div></>}</div>
          </div>
        </>
      )}
      <style>{`@media (max-width:980px){.atlas-team-workspace{grid-template-columns:1fr!important}.atlas-team-settings{grid-template-columns:1fr!important}.atlas-team-task-main{grid-template-columns:auto minmax(0,1fr)!important}.atlas-team-task-main>:nth-child(3),.atlas-team-task-main>:nth-child(4),.atlas-team-task-main>:nth-child(5){grid-column:2}.atlas-team-task-details{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div style={statStyle}><div style={statLabelStyle}>{label}</div><div style={statValueStyle}>{value}</div></div>; }

const heroStyle: React.CSSProperties = { display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap",padding:22,borderRadius:22,background:`linear-gradient(135deg, ${colors.navy2}, ${colors.navy3})`,color:"#FFFFFF",border:"1px solid rgba(255,255,255,.08)" };
const eyebrowStyle: React.CSSProperties = { color:colors.gold2,fontSize:11,fontWeight:900,letterSpacing:".12em" };
const titleStyle: React.CSSProperties = { margin:"5px 0 4px",fontSize:34,lineHeight:1.05 };
const heroCopyStyle: React.CSSProperties = { margin:0,color:"#D8E5F1" };
const workspaceStyle: React.CSSProperties = { display:"grid",gridTemplateColumns:"minmax(275px,350px) minmax(0,1fr)",gap:12,alignItems:"start" };
const panelStyle: React.CSSProperties = { background:colors.card,border:`1px solid ${colors.line}`,borderRadius:16,padding:14,boxShadow:"0 8px 24px rgba(7,27,47,.06)" };
const statStyle: React.CSSProperties = { background:colors.card,border:`1px solid ${colors.line}`,borderRadius:13,padding:11 };
const statLabelStyle: React.CSSProperties = { color:colors.muted,fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:".04em" };
const statValueStyle: React.CSSProperties = { marginTop:2,color:colors.text,fontSize:24,fontWeight:900 };
const fieldStyle: React.CSSProperties = { width:"100%",border:`1px solid ${colors.line}`,borderRadius:9,padding:"9px 10px",background:colors.card,color:colors.text,font:"inherit" };
const titleFieldStyle: React.CSSProperties = { ...fieldStyle,fontSize:21,fontWeight:900 };
const labelStyle: React.CSSProperties = { display:"grid",gap:5,color:colors.muted,fontSize:11,fontWeight:800 };
const mutedStyle: React.CSSProperties = { color:colors.muted,fontSize:11 };
const goldButtonStyle: React.CSSProperties = { border:`1px solid ${colors.gold2}`,borderRadius:9,padding:"9px 12px",background:colors.gold,color:colors.navy,fontWeight:900,cursor:"pointer" };
const lightButtonStyle: React.CSSProperties = { border:`1px solid ${colors.line}`,borderRadius:9,padding:"8px 11px",background:colors.card,color:colors.text,fontWeight:800,cursor:"pointer" };
const listCardStyle: React.CSSProperties = { display:"grid",gap:4,width:"100%",padding:10,border:"1px solid",borderRadius:11,background:colors.card,textAlign:"left" };
const editorHeaderStyle: React.CSSProperties = { display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap" };
const settingsGridStyle: React.CSSProperties = { display:"grid",gridTemplateColumns:"repeat(3,minmax(150px,1fr))",gap:8,marginTop:12 };
const propertyChipStyle: React.CSSProperties = { border:`1px solid ${colors.line}`,borderRadius:999,padding:"6px 10px",fontWeight:800 };
const taskCardStyle: React.CSSProperties = { padding:10,border:`1px solid ${colors.line}`,borderRadius:11,background:colors.panel };
const taskMainGridStyle: React.CSSProperties = { display:"grid",gridTemplateColumns:"auto minmax(180px,1.5fr) minmax(130px,.65fr) minmax(125px,.65fr) auto",gap:7,alignItems:"center" };
const taskDetailGridStyle: React.CSSProperties = { display:"grid",gridTemplateColumns:"minmax(140px,.6fr) minmax(220px,1fr) auto",gap:7,alignItems:"center",marginTop:7,paddingLeft:27 };
const photoLabelStyle: React.CSSProperties = { display:"flex",alignItems:"center",gap:6,color:colors.muted,fontSize:11,fontWeight:700,whiteSpace:"nowrap" };
const iconButtonStyle: React.CSSProperties = { width:30,height:30,border:`1px solid ${colors.line}`,borderRadius:7,background:colors.card,color:colors.text,fontWeight:900,cursor:"pointer" };
const emptyStyle: React.CSSProperties = { padding:16,border:`1px dashed ${colors.line}`,borderRadius:10,color:colors.muted,textAlign:"center" };
