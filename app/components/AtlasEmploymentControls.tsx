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

type TeamTask = {
  id?: string;
  title?: string;
  assignee?: string;
  status?: string;
  location?: string;
  [key: string]: unknown;
};

type TeamList = {
  id?: string;
  name?: string;
  propertyIds?: string[];
  tasks?: TeamTask[];
  [key: string]: unknown;
};

type TeamPayload = {
  ok?: boolean;
  members?: TeamMember[];
  workLists?: TeamList[];
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
  [key: string]: unknown;
};

type AtlasPayload = {
  serviceRecords?: WorkOrder[];
  workOrders?: WorkOrder[];
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

function workAssignee(record: WorkOrder) {
  return record.assignedTo || record.assigned_to || record.assignee || "";
}

function isOpenStatus(value: unknown) {
  return !["completed", "closed", "cancelled", "skipped"].includes(normalized(value));
}

export default function AtlasEmploymentControls() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("2000");
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [atlas, setAtlas] = useState<AtlasPayload | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [reassignments, setReassignments] = useState<Record<string, string>>({});

  const loadTeam = async () => {
    const response = await fetch("/api/atlas-team", { cache: "no-store", credentials: "include" });
    const payload = (await response.json().catch(() => ({}))) as TeamPayload;
    if (!response.ok || payload?.ok === false) throw new Error("Atlas could not load the team.");
    setTeam(payload);
  };

  const loadAtlas = async (targetPropertyId: string) => {
    const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(targetPropertyId)}&t=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
    });
    const payload = (await response.json().catch(() => ({}))) as AtlasPayload;
    if (!response.ok) throw new Error("Atlas could not load current work.");
    setAtlas(payload);
  };

  const refresh = async (targetPropertyId = propertyId) => {
    await Promise.all([loadTeam(), loadAtlas(targetPropertyId)]);
  };

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      setVisible(isTeamPageVisible());
      const next = currentPropertyId();
      setPropertyId((current) => {
        if (current !== next && open) void refresh(next).catch(() => undefined);
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

  const members = useMemo(
    () =>
      (team?.members || [])
        .filter((member) => !member.propertyIds?.length || member.propertyIds.includes(propertyId))
        .sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || a.name.localeCompare(b.name)),
    [team, propertyId],
  );

  const activeMembers = useMemo(() => members.filter((member) => member.active !== false), [members]);
  const selected = members.find((member) => member.id === selectedId) || null;
  const admin = ["master", "administrator"].includes(normalized(team?.currentUser?.role));

  useEffect(() => {
    if (!members.length) {
      setSelectedId("");
      return;
    }
    if (!members.some((member) => member.id === selectedId)) setSelectedId(members[0].id);
  }, [members, selectedId]);

  const workOrders = useMemo(() => atlas?.serviceRecords || atlas?.workOrders || [], [atlas]);
  const selectedWork = useMemo(
    () =>
      selected
        ? workOrders.filter((record) => {
            const recordProperty = String(record.propertyId || record.property_id || "").trim();
            return (!recordProperty || recordProperty === propertyId) && memberMatches(selected, workAssignee(record)) && isOpenStatus(record.status);
          })
        : [],
    [selected, workOrders, propertyId],
  );

  const selectedTeamTasks = useMemo(() => {
    if (!selected) return [] as Array<{ list: TeamList; task: TeamTask; key: string }>;
    return (team?.workLists || [])
      .filter((list) => !list.propertyIds?.length || list.propertyIds.includes(propertyId))
      .flatMap((list) =>
        (list.tasks || [])
          .filter((task) => memberMatches(selected, task.assignee) && isOpenStatus(task.status))
          .map((task, index) => ({ list, task, key: `team:${String(list.id || "list")}:${String(task.id || index)}` })),
      );
  }, [selected, team, propertyId]);

  const employmentAction = async (member: TeamMember, action: "pause" | "resume") => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/atlas-employment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ memberId: member.id, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Atlas could not update employment status.");
      await refresh();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update employment status.");
    } finally {
      setSaving(false);
    }
  };

  const saveWorkOrder = async (record: WorkOrder, changes: Record<string, unknown>) => {
    const id = String(record.id || "").trim();
    if (!id) throw new Error("That work item is missing an id.");
    const next = { ...record, ...changes, id, propertyId };
    const response = await fetch("/api/atlas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-atlas-request-id": `employment-review-${id}-${Date.now()}` },
      credentials: "include",
      body: JSON.stringify({ table: "work_orders", propertyId, record: next }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Atlas could not update that work item.");
  };

  const deleteWorkOrder = async (record: WorkOrder) => {
    const id = String(record.id || "").trim();
    if (!id) return;
    if (!window.confirm(`Delete ${record.title || record.name || "this work item"}?`)) return;
    const response = await fetch("/api/atlas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-atlas-request-id": `employment-delete-${id}-${Date.now()}` },
      credentials: "include",
      body: JSON.stringify({ table: "work_orders", propertyId, id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Atlas could not delete that work item.");
  };

  const workOrderAction = async (record: WorkOrder, action: "reassign" | "pause" | "skip" | "delete") => {
    setSaving(true);
    setMessage("");
    try {
      if (action === "delete") await deleteWorkOrder(record);
      else if (action === "pause") await saveWorkOrder(record, { status: "Paused" });
      else if (action === "skip") await saveWorkOrder(record, { status: "Skipped" });
      else {
        const key = `work:${String(record.id || "")}`;
        const assignedTo = reassignments[key];
        if (!assignedTo) return;
        await saveWorkOrder(record, { assignedTo, assignee: assignedTo, status: "Open" });
      }
      await refresh();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update that work item.");
    } finally {
      setSaving(false);
    }
  };

  const saveTeamLists = async (nextLists: TeamList[]) => {
    const response = await fetch("/api/atlas-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "team-work-lists-save", workLists: nextLists }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Atlas could not update that assignment.");
  };

  const teamTaskAction = async (list: TeamList, task: TeamTask, key: string, action: "reassign" | "pause" | "skip" | "delete") => {
    setSaving(true);
    setMessage("");
    try {
      const allLists = (team?.workLists || []).map((candidate) => {
        if (candidate.id !== list.id) return candidate;
        const nextTasks = (candidate.tasks || []).flatMap((candidateTask) => {
          const same = candidateTask === task || (task.id && candidateTask.id === task.id);
          if (!same) return [candidateTask];
          if (action === "delete") return [];
          if (action === "pause") return [{ ...candidateTask, status: "Paused" }];
          if (action === "skip") return [{ ...candidateTask, status: "Skipped" }];
          const assignee = reassignments[key];
          if (!assignee) return [candidateTask];
          return [{ ...candidateTask, assignee, status: "Open" }];
        });
        return { ...candidate, tasks: nextTasks };
      });
      await saveTeamLists(allLists);
      await refresh();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update that assignment.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        className="atlas-employment-launch"
        onClick={() => {
          setOpen(true);
          setMessage("");
          void refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Atlas could not load employment controls."));
        }}
      >
        Employment
      </button>

      {open ? (
        <div className="atlas-employment-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="atlas-employment-panel" role="dialog" aria-modal="true" aria-label="Employment">
            <div className="atlas-employment-header">
              <div>
                <strong>Employment</strong>
                <span>Pause without deleting history or assignments</span>
              </div>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </div>

            {!admin ? <div className="atlas-employment-message">Admin access is required.</div> : (
              <div className="atlas-employment-layout">
                <aside>
                  {members.map((member) => (
                    <button key={member.id} type="button" className={selectedId === member.id ? "is-selected" : ""} onClick={() => setSelectedId(member.id)}>
                      <span><strong>{member.name}</strong><small>{member.active === false ? "Paused" : member.role || "Team member"}</small></span>
                      <i className={member.active === false ? "is-paused" : ""}>{member.active === false ? "Paused" : "Active"}</i>
                    </button>
                  ))}
                </aside>

                <main>
                  {selected ? (
                    <>
                      <div className="atlas-employment-person-head">
                        <div><h3>{selected.name}</h3><span>{selected.active === false ? "Employment paused" : "Active employee"}</span></div>
                        {normalized(selected.role) !== "master" ? (
                          <button type="button" disabled={saving} onClick={() => void employmentAction(selected, selected.active === false ? "resume" : "pause")}>
                            {selected.active === false ? "Resume Employment" : "Pause Employment"}
                          </button>
                        ) : null}
                      </div>

                      {selected.active === false ? (
                        <section>
                          <div className="atlas-employment-section-head"><strong>Reassignment Review</strong><span>{selectedWork.length + selectedTeamTasks.length} open</span></div>
                          {!selectedWork.length && !selectedTeamTasks.length ? <p>No open assignments remain.</p> : null}

                          {selectedWork.map((record) => {
                            const key = `work:${String(record.id || "")}`;
                            return (
                              <div className="atlas-employment-work-row" key={key}>
                                <div><strong>{record.title || record.name || "Untitled work"}</strong><span>{record.locationName || record.location || record.locationId || "Work Order"}</span></div>
                                <div className="atlas-employment-actions">
                                  <select value={reassignments[key] || ""} onChange={(event) => setReassignments((current) => ({ ...current, [key]: event.target.value }))}>
                                    <option value="">Reassign…</option>
                                    {activeMembers.filter((member) => member.id !== selected.id).map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                                  </select>
                                  <button type="button" disabled={!reassignments[key] || saving} onClick={() => void workOrderAction(record, "reassign")}>Assign</button>
                                  <button type="button" disabled={saving} onClick={() => void workOrderAction(record, "pause")}>Pause</button>
                                  <button type="button" disabled={saving} onClick={() => void workOrderAction(record, "skip")}>Skip</button>
                                  <button type="button" className="danger" disabled={saving} onClick={() => void workOrderAction(record, "delete")}>Delete</button>
                                </div>
                              </div>
                            );
                          })}

                          {selectedTeamTasks.map(({ list, task, key }) => (
                            <div className="atlas-employment-work-row" key={key}>
                              <div><strong>{task.title || "Untitled task"}</strong><span>{list.name || "Team List"}{task.location ? ` · ${task.location}` : ""}</span></div>
                              <div className="atlas-employment-actions">
                                <select value={reassignments[key] || ""} onChange={(event) => setReassignments((current) => ({ ...current, [key]: event.target.value }))}>
                                  <option value="">Reassign…</option>
                                  {activeMembers.filter((member) => member.id !== selected.id).map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                                </select>
                                <button type="button" disabled={!reassignments[key] || saving} onClick={() => void teamTaskAction(list, task, key, "reassign")}>Assign</button>
                                <button type="button" disabled={saving} onClick={() => void teamTaskAction(list, task, key, "pause")}>Pause</button>
                                <button type="button" disabled={saving} onClick={() => void teamTaskAction(list, task, key, "skip")}>Skip</button>
                                <button type="button" className="danger" disabled={saving} onClick={() => void teamTaskAction(list, task, key, "delete")}>Delete</button>
                              </div>
                            </div>
                          ))}

                          <div className="atlas-employment-note">Shared Team Lists assigned to a paused employee stay intact and are flagged inside Team Lists for reassignment.</div>
                        </section>
                      ) : (
                        <section><p>Pause employment when this person is seasonal or temporarily away. Atlas will preserve completed history and leave current assignments available for review.</p></section>
                      )}
                    </>
                  ) : null}
                </main>
              </div>
            )}
            {message ? <div className="atlas-employment-message">{message}</div> : null}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .atlas-employment-launch{position:fixed!important;top:126px!important;right:112px!important;z-index:8399!important;min-height:34px!important;padding:6px 11px!important;border:1px solid #d1dae3!important;border-radius:9px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:12px!important;font-weight:900!important;box-shadow:0 3px 10px rgba(11,44,67,.1)!important}
        .atlas-employment-overlay{position:fixed!important;inset:0!important;z-index:100250!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(7,24,39,.68)!important}.atlas-employment-panel{width:min(980px,97vw)!important;max-height:92dvh!important;overflow:hidden!important;display:grid!important;gap:10px!important;padding:14px!important;border-radius:14px!important;background:#fff!important;box-shadow:0 22px 70px rgba(0,0,0,.28)!important}.atlas-employment-header,.atlas-employment-person-head,.atlas-employment-section-head,.atlas-employment-actions{display:flex!important;align-items:center!important;gap:8px!important}.atlas-employment-header,.atlas-employment-person-head,.atlas-employment-section-head{justify-content:space-between!important}.atlas-employment-header>div,.atlas-employment-person-head>div{display:grid!important;gap:2px!important}.atlas-employment-header strong{color:#0b2c43!important;font-size:16px!important}.atlas-employment-header span,.atlas-employment-person-head span,.atlas-employment-section-head span{color:#66788a!important;font-size:10px!important}.atlas-employment-header>button{width:34px!important;height:34px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font-size:20px!important}
        .atlas-employment-layout{display:grid!important;grid-template-columns:250px minmax(0,1fr)!important;gap:12px!important;min-height:0!important}.atlas-employment-layout>aside{overflow-y:auto!important;border:1px solid #e0e6ec!important;border-radius:11px!important}.atlas-employment-layout>aside>button{width:100%!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;padding:10px 11px!important;border:0!important;border-bottom:1px solid #e8edf2!important;background:#fff!important;text-align:left!important;color:#0b2c43!important}.atlas-employment-layout>aside>button.is-selected{background:#edf5ff!important;box-shadow:inset 3px 0 0 #1f6fd1!important}.atlas-employment-layout>aside span{display:grid!important;gap:2px!important}.atlas-employment-layout>aside strong{font-size:12px!important}.atlas-employment-layout>aside small{font-size:9px!important;color:#66788a!important}.atlas-employment-layout>aside i{font-style:normal!important;font-size:9px!important;color:#168259!important}.atlas-employment-layout>aside i.is-paused{color:#a15d00!important}
        .atlas-employment-layout>main{overflow-y:auto!important;min-height:0!important;padding:2px!important}.atlas-employment-person-head{padding-bottom:10px!important;border-bottom:1px solid #e8edf2!important}.atlas-employment-person-head h3{margin:0!important;color:#0b2c43!important;font-size:18px!important}.atlas-employment-person-head button,.atlas-employment-actions button,.atlas-employment-actions select{min-height:32px!important;padding:5px 8px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:10px!important;font-weight:800!important}.atlas-employment-person-head button{background:#0b2c43!important;color:#fff!important;border-color:#0b2c43!important}.atlas-employment-layout section{margin-top:10px!important;padding:12px!important;border:1px solid #e0e6ec!important;border-radius:10px!important}.atlas-employment-layout section p,.atlas-employment-note{margin:7px 0 0!important;color:#66788a!important;font-size:11px!important;line-height:1.45!important}.atlas-employment-work-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important;padding:9px 0!important;border-bottom:1px solid #edf1f5!important}.atlas-employment-work-row>div:first-child{display:grid!important;gap:2px!important}.atlas-employment-work-row strong{color:#0b2c43!important;font-size:12px!important}.atlas-employment-work-row span{color:#66788a!important;font-size:10px!important}.atlas-employment-actions{flex-wrap:wrap!important;justify-content:flex-end!important}.atlas-employment-actions select{max-width:130px!important}.atlas-employment-actions .danger{color:#9f1d20!important}.atlas-employment-message{padding:9px!important;border-radius:8px!important;background:#fff7e8!important;color:#8c5a09!important;font-size:11px!important}
        @media(max-width:900px){.atlas-employment-launch{top:auto!important;right:104px!important;bottom:122px!important}.atlas-employment-overlay{padding:7px!important}.atlas-employment-panel{height:calc(100dvh - 14px)!important;max-height:none!important}.atlas-employment-layout{grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important}.atlas-employment-layout>aside{max-height:180px!important}.atlas-employment-work-row{grid-template-columns:1fr!important}.atlas-employment-actions{justify-content:flex-start!important}.atlas-employment-person-head{align-items:flex-start!important;flex-direction:column!important}}
      `}</style>
    </>
  );
}
