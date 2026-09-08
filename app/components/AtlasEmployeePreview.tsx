"use client";

import { useEffect, useMemo, useState } from "react";

type TeamMember = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  active?: boolean;
  propertyIds?: string[];
};

type TeamPayload = {
  ok?: boolean;
  members?: TeamMember[];
  currentUser?: { role?: string; email?: string };
};

type WorkOrder = {
  id?: string;
  title?: string;
  name?: string;
  assignedTo?: string;
  assigned_to?: string;
  assignee?: string;
  status?: string;
  location?: string;
  locationName?: string;
  locationId?: string;
  propertyId?: string;
  property_id?: string;
};

type AtlasPayload = { serviceRecords?: WorkOrder[]; workOrders?: WorkOrder[] };

type SharedList = {
  id: string;
  name?: string;
  assigned_to?: string[];
  status?: string;
};

type SharedItem = {
  id: string;
  list_id?: string;
  title?: string;
  assigned_to?: string;
  status?: string;
  due_date?: string | null;
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function isTeamPageVisible() {
  return Array.from(document.querySelectorAll<HTMLElement>("h1,h2")).some((node) => {
    const text = normalized(node.textContent);
    if (text !== "team" && text !== "people & access") return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function memberMatches(member: TeamMember, value: unknown) {
  const assigned = normalized(value);
  const full = normalized(member.name);
  const first = full.split(/\s+/)[0] || full;
  return Boolean(assigned && full && (assigned === full || assigned === first || full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `)));
}

function listMatches(member: TeamMember, assignments: string[] | undefined) {
  const values = assignments || [];
  if (!values.length || values.some((item) => normalized(item) === "everyone")) return true;
  return values.some((item) => memberMatches(member, item));
}

function workAssignee(record: WorkOrder) {
  return record.assignedTo || record.assigned_to || record.assignee || "";
}

function isOpen(value: unknown) {
  return !["completed", "closed", "cancelled", "skipped"].includes(normalized(value));
}

export default function AtlasEmployeePreview() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("2000");
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [atlas, setAtlas] = useState<AtlasPayload | null>(null);
  const [lists, setLists] = useState<SharedList[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<"work" | "lists">("work");
  const [message, setMessage] = useState("");

  const load = async (targetPropertyId = propertyId) => {
    const [teamResponse, atlasResponse, listResponse] = await Promise.all([
      fetch("/api/atlas-team", { cache: "no-store", credentials: "include" }),
      fetch(`/api/atlas?propertyId=${encodeURIComponent(targetPropertyId)}&t=${Date.now()}`, { cache: "no-store", credentials: "include" }),
      fetch(`/api/atlas-shared-list?propertyId=${encodeURIComponent(targetPropertyId)}&t=${Date.now()}`, { cache: "no-store", credentials: "include" }),
    ]);
    const teamPayload = (await teamResponse.json().catch(() => ({}))) as TeamPayload;
    const atlasPayload = (await atlasResponse.json().catch(() => ({}))) as AtlasPayload;
    const listPayload = await listResponse.json().catch(() => ({}));
    if (!teamResponse.ok || teamPayload?.ok === false) throw new Error("Atlas could not load the team.");
    setTeam(teamPayload);
    setAtlas(atlasPayload);
    setLists(Array.isArray(listPayload?.lists) ? listPayload.lists : []);
    setItems(Array.isArray(listPayload?.items) ? listPayload.items : []);
  };

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      setVisible(isTeamPageVisible());
      const next = currentPropertyId();
      setPropertyId((current) => {
        if (current !== next && open) void load(next).catch(() => undefined);
        return next;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [open]);

  const admin = ["master", "administrator"].includes(normalized(team?.currentUser?.role));
  const members = useMemo(
    () =>
      (team?.members || [])
        .filter((member) => member.active !== false)
        .filter((member) => !member.propertyIds?.length || member.propertyIds.includes(propertyId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [team, propertyId],
  );

  useEffect(() => {
    if (!members.length) return;
    if (!members.some((member) => member.id === selectedId)) setSelectedId(members[0].id);
  }, [members, selectedId]);

  const selected = members.find((member) => member.id === selectedId) || null;
  const workOrders = atlas?.serviceRecords || atlas?.workOrders || [];
  const employeeWork = useMemo(
    () =>
      selected
        ? workOrders.filter((record) => {
            const recordProperty = String(record.propertyId || record.property_id || "").trim();
            return (!recordProperty || recordProperty === propertyId) && memberMatches(selected, workAssignee(record)) && isOpen(record.status);
          })
        : [],
    [selected, workOrders, propertyId],
  );

  const employeeLists = useMemo(
    () => (selected ? lists.filter((list) => list.status === "Active" && listMatches(selected, list.assigned_to)) : []),
    [selected, lists],
  );

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        className="atlas-view-as-launch"
        onClick={() => {
          setOpen(true);
          setMessage("");
          void load().catch((error) => setMessage(error instanceof Error ? error.message : "Atlas could not open Employee View."));
        }}
      >
        View As
      </button>

      {open ? (
        <div className="atlas-view-as-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="atlas-view-as-panel" role="dialog" aria-modal="true" aria-label="Employee View">
            <div className="atlas-view-as-header">
              <div><strong>Employee View</strong><span>Preview what an assigned employee sees</span></div>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </div>

            {!admin ? <div className="atlas-view-as-message">Admin access is required.</div> : (
              <>
                <div className="atlas-view-as-toolbar">
                  <label>
                    <span>Viewing as</span>
                    <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                      {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </label>
                  <div className="atlas-view-as-tabs">
                    <button type="button" className={tab === "work" ? "is-selected" : ""} onClick={() => setTab("work")}>Work</button>
                    <button type="button" className={tab === "lists" ? "is-selected" : ""} onClick={() => setTab("lists")}>Team Lists</button>
                  </div>
                </div>

                <div className="atlas-view-as-banner">Viewing as {selected?.name || "Employee"} · preview only</div>

                <div className="atlas-view-as-content">
                  {tab === "work" ? (
                    <>
                      <div className="atlas-view-as-section-head"><strong>Assigned Work</strong><span>{employeeWork.length} open</span></div>
                      <div className="atlas-view-as-list">
                        {employeeWork.map((record) => (
                          <div key={String(record.id || `${record.title}-${record.location}`)}>
                            <strong>{record.title || record.name || "Untitled work"}</strong>
                            <span>{record.locationName || record.location || record.locationId || ""}</span>
                          </div>
                        ))}
                        {!employeeWork.length ? <p>No work currently assigned.</p> : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="atlas-view-as-section-head"><strong>Team Lists</strong><span>{employeeLists.length} visible</span></div>
                      <div className="atlas-view-as-groups">
                        {employeeLists.map((list) => {
                          const listItems = items.filter((item) => item.list_id === list.id && String(item.status || "Open") === "Open");
                          return (
                            <section key={list.id}>
                              <div className="atlas-view-as-section-head"><strong>{list.name || "Untitled List"}</strong><span>{listItems.length}</span></div>
                              <div className="atlas-view-as-list">
                                {listItems.map((item) => <div key={item.id}><strong>{item.title || "Untitled"}</strong><span>{item.assigned_to || "List assignment"}{item.due_date ? ` · ${String(item.due_date).slice(0, 10)}` : ""}</span></div>)}
                                {!listItems.length ? <p>Nothing open.</p> : null}
                              </div>
                            </section>
                          );
                        })}
                        {!employeeLists.length ? <p>No Team Lists assigned.</p> : null}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {message ? <div className="atlas-view-as-message">{message}</div> : null}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .atlas-view-as-launch{position:fixed!important;top:126px!important;right:206px!important;z-index:8398!important;min-height:34px!important;padding:6px 11px!important;border:1px solid #d1dae3!important;border-radius:9px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:12px!important;font-weight:900!important;box-shadow:0 3px 10px rgba(11,44,67,.1)!important}.atlas-view-as-overlay{position:fixed!important;inset:0!important;z-index:100260!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(7,24,39,.68)!important}.atlas-view-as-panel{width:min(780px,96vw)!important;max-height:92dvh!important;overflow-y:auto!important;display:grid!important;gap:10px!important;padding:14px!important;border-radius:14px!important;background:#fff!important;box-shadow:0 22px 70px rgba(0,0,0,.28)!important}.atlas-view-as-header,.atlas-view-as-toolbar,.atlas-view-as-section-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}.atlas-view-as-header>div{display:grid!important;gap:2px!important}.atlas-view-as-header strong{font-size:16px!important;color:#0b2c43!important}.atlas-view-as-header span,.atlas-view-as-section-head span{font-size:10px!important;color:#66788a!important}.atlas-view-as-header>button{width:34px!important;height:34px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font-size:20px!important}.atlas-view-as-toolbar label{display:grid!important;gap:3px!important}.atlas-view-as-toolbar label span{font-size:9px!important;font-weight:900!important;text-transform:uppercase!important;color:#66788a!important}.atlas-view-as-toolbar select,.atlas-view-as-tabs button{min-height:34px!important;padding:6px 9px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:11px!important}.atlas-view-as-tabs{display:flex!important;gap:6px!important}.atlas-view-as-tabs button.is-selected{background:#0b2c43!important;color:#fff!important;border-color:#0b2c43!important}.atlas-view-as-banner{padding:8px 10px!important;border-radius:8px!important;background:#edf5ff!important;color:#175fae!important;font-size:11px!important;font-weight:800!important}.atlas-view-as-content{display:grid!important;gap:8px!important}.atlas-view-as-list{display:grid!important;margin-top:6px!important;border:1px solid #e0e6ec!important;border-radius:9px!important;overflow:hidden!important}.atlas-view-as-list>div{display:grid!important;gap:2px!important;padding:9px 10px!important;border-bottom:1px solid #edf1f5!important}.atlas-view-as-list>div:last-child{border-bottom:0!important}.atlas-view-as-list strong{font-size:12px!important;color:#0b2c43!important}.atlas-view-as-list span,.atlas-view-as-list p,.atlas-view-as-groups>p{font-size:10px!important;color:#66788a!important}.atlas-view-as-list p,.atlas-view-as-groups>p{margin:0!important;padding:10px!important}.atlas-view-as-groups{display:grid!important;gap:10px!important}.atlas-view-as-groups section{padding:10px!important;border:1px solid #e0e6ec!important;border-radius:10px!important}.atlas-view-as-message{padding:9px!important;border-radius:8px!important;background:#fff7e8!important;color:#8c5a09!important;font-size:11px!important}@media(max-width:900px){.atlas-view-as-launch{top:auto!important;right:196px!important;bottom:122px!important}.atlas-view-as-overlay{padding:7px!important}.atlas-view-as-panel{width:100%!important;height:calc(100dvh - 14px)!important;max-height:none!important}.atlas-view-as-toolbar{align-items:flex-start!important;flex-direction:column!important}}
      `}</style>
    </>
  );
}
