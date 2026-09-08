"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";

type SharedList = {
  id: string;
  property_id?: string;
  name?: string;
  assigned_to?: string[];
  status?: string;
  created_by?: string;
};

type SharedItem = {
  id: string;
  property_id?: string;
  list_id?: string;
  title?: string;
  notes?: string;
  assigned_to?: string;
  due_date?: string | null;
  status?: string;
  created_by?: string;
  photo_url?: string;
  photo_name?: string;
};

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
  currentUser?: {
    email?: string;
    role?: string;
  };
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function activePropertyIdFromDom() {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  const propertySelect = selects.find((select) => {
    const values = Array.from(select.options).map((option) => String(option.value || ""));
    return (
      values.includes("2000") &&
      values.some(
        (value) =>
          value === "4725" ||
          value === "6855" ||
          value === "3661" ||
          value.toLowerCase() === "hangar",
      )
    );
  });
  return String(propertySelect?.value || "2000");
}

function shouldShowLauncher() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("addison-work") || path.includes("landscape-help")) return true;

  const visibleHeadings = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2")).filter((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });

  return visibleHeadings.some((heading) =>
    ["dashboard", "work", "notes", "team"].includes(normalized(heading.textContent)),
  );
}

function formatDate(value: unknown) {
  const key = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function safeFileName(value: string) {
  return (
    (value || "photo")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "photo"
  );
}

function assignmentMatches(assignments: string[] | undefined, name: string) {
  const values = assignments || [];
  if (!values.length) return true;
  if (values.some((item) => normalized(item) === "everyone")) return true;
  const full = normalized(name);
  const first = full.split(/\s+/)[0] || full;
  return values.some((item) => {
    const assigned = normalized(item);
    return assigned === full || assigned === first || full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `);
  });
}

function memberMatchesName(member: TeamMember, value: unknown) {
  const assigned = normalized(value);
  const full = normalized(member.name);
  const first = full.split(/\s+/)[0] || full;
  return Boolean(assigned && full && (assigned === full || assigned === first || full.startsWith(`${assigned} `) || assigned.startsWith(`${first} `)));
}

export default function AtlasSharedTeamList() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<SharedList[]>([]);
  const [items, setItems] = useState<SharedItem[]>([]);
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [selectedListId, setSelectedListId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showListEditor, setShowListEditor] = useState(false);
  const [listName, setListName] = useState("");
  const [listAssignments, setListAssignments] = useState<string[]>(["Everyone"]);
  const [reassignByItem, setReassignByItem] = useState<Record<string, string>>({});

  const loadTeam = async () => {
    try {
      const response = await fetch("/api/atlas-team", { cache: "no-store", credentials: "include" });
      const payload = (await response.json().catch(() => ({}))) as TeamPayload;
      if (response.ok && payload?.ok !== false) setTeam(payload);
    } catch {
      setTeam(null);
    }
  };

  const load = async (targetPropertyId = activePropertyIdFromDom()) => {
    const response = await fetch(
      `/api/atlas-shared-list?propertyId=${encodeURIComponent(targetPropertyId)}&t=${Date.now()}`,
      { cache: "no-store", credentials: "include" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Atlas could not load the shared list.");
    }
    const nextLists = Array.isArray(payload.lists) ? payload.lists : [];
    setLists(nextLists);
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setSelectedListId((current) =>
      current && nextLists.some((list: SharedList) => list.id === current)
        ? current
        : String(nextLists.find((list: SharedList) => list.status === "Active")?.id || nextLists[0]?.id || ""),
    );
  };

  useEffect(() => {
    let frame = 0;
    let lastProperty = "";

    const apply = () => {
      frame = 0;
      const nextProperty = activePropertyIdFromDom();
      setVisible(shouldShowLauncher());
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));
      if (nextProperty !== lastProperty) {
        lastProperty = nextProperty;
        setLists([]);
        setItems([]);
        void Promise.all([load(nextProperty), loadTeam()]).catch(() => undefined);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);
    window.addEventListener("atlas:data-changed", schedule as EventListener);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      window.removeEventListener("atlas:data-changed", schedule as EventListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const members = useMemo(
    () =>
      (team?.members || [])
        .filter((member) => !member.propertyIds?.length || member.propertyIds.includes(propertyId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [team, propertyId],
  );

  const activeMembers = useMemo(() => members.filter((member) => member.active !== false), [members]);
  const inactiveMembers = useMemo(() => members.filter((member) => member.active === false), [members]);

  const actor = useMemo(() => {
    if (typeof window !== "undefined" && window.location.pathname.toLowerCase().includes("addison")) return "Addison";
    const email = normalized(team?.currentUser?.email);
    const member = members.find((candidate) => normalized(candidate.email) === email);
    return member?.name || "Nick";
  }, [team, members]);

  const adminView = ["master", "administrator"].includes(normalized(team?.currentUser?.role));

  const visibleLists = useMemo(
    () => lists.filter((list) => adminView || (list.status === "Active" && assignmentMatches(list.assigned_to, actor))),
    [lists, actor, adminView],
  );

  useEffect(() => {
    if (!visibleLists.length) return;
    if (!visibleLists.some((list) => list.id === selectedListId)) setSelectedListId(visibleLists[0].id);
  }, [visibleLists, selectedListId]);

  const selectedList = visibleLists.find((list) => list.id === selectedListId) || null;
  const listItems = useMemo(() => items.filter((item) => item.list_id === selectedListId), [items, selectedListId]);
  const openItems = useMemo(() => listItems.filter((item) => String(item.status || "Open") === "Open"), [listItems]);
  const completedItems = useMemo(() => listItems.filter((item) => String(item.status || "") !== "Open"), [listItems]);
  const totalOpen = useMemo(() => items.filter((item) => String(item.status || "Open") === "Open").length, [items]);

  const resetDraft = () => {
    setTitle("");
    setNotes("");
    setAssignedTo("");
    setDueDate("");
    setPhoto(null);
  };

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/atlas-shared-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ propertyId, ...body }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Atlas could not update the Team List.");
    return payload;
  };

  const createList = async () => {
    if (!listName.trim() || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = await post({
        action: "create-list",
        name: listName.trim(),
        assignedTo: listAssignments.length ? listAssignments : ["Everyone"],
        createdBy: actor,
      });
      setShowListEditor(false);
      setListName("");
      setListAssignments(["Everyone"]);
      await load(propertyId);
      setSelectedListId(String(payload.id || ""));
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not create that list.");
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedList = async () => {
    if (!selectedList || !listName.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await post({
        action: "update-list",
        id: selectedList.id,
        name: listName.trim(),
        assignedTo: listAssignments.length ? listAssignments : ["Everyone"],
      });
      setShowListEditor(false);
      await load(propertyId);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update that list.");
    } finally {
      setSaving(false);
    }
  };

  const openCreateList = () => {
    setListName("");
    setListAssignments(["Everyone"]);
    setShowListEditor(true);
  };

  const openEditList = () => {
    if (!selectedList) return;
    setListName(selectedList.name || "");
    setListAssignments(selectedList.assigned_to?.length ? selectedList.assigned_to : ["Everyone"]);
    setShowListEditor(true);
  };

  const toggleListAssignment = (name: string) => {
    setListAssignments((current) => {
      if (name === "Everyone") return ["Everyone"];
      const withoutEveryone = current.filter((item) => item !== "Everyone");
      if (withoutEveryone.includes(name)) {
        const next = withoutEveryone.filter((item) => item !== name);
        return next.length ? next : ["Everyone"];
      }
      return [...withoutEveryone, name];
    });
  };

  const createItem = async () => {
    if (!title.trim() || !selectedListId || saving) return;
    setSaving(true);
    setMessage("");
    try {
      let photoUrl = "";
      let photoName = "";
      if (photo) {
        const blob = await upload(
          `atlas-shared-list/${propertyId}/${Date.now()}-${safeFileName(photo.name)}`,
          photo,
          {
            access: "public",
            handleUploadUrl: "/api/atlas-document-upload",
            contentType: photo.type || undefined,
          },
        );
        photoUrl = blob.url;
        photoName = photo.name || "Photo";
      }

      await post({
        action: "create",
        listId: selectedListId,
        title: title.trim(),
        notes: notes.trim(),
        assignedTo,
        dueDate,
        createdBy: actor,
        photoUrl,
        photoName,
      });
      resetDraft();
      await load(propertyId);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not add that list item.");
    } finally {
      setSaving(false);
    }
  };

  const itemAction = async (item: SharedItem, action: "done" | "reopen" | "moved-to-work" | "pause" | "skip") => {
    await post({ action, id: item.id });
    await load(propertyId);
    window.dispatchEvent(new CustomEvent("atlas:data-changed"));
  };

  const reassignItem = async (item: SharedItem) => {
    const next = reassignByItem[item.id];
    if (!next) return;
    await post({ action: "reassign", id: item.id, assignedTo: next });
    setReassignByItem((current) => ({ ...current, [item.id]: "" }));
    await load(propertyId);
    window.dispatchEvent(new CustomEvent("atlas:data-changed"));
  };

  const moveToWork = async (item: SharedItem) => {
    setMessage("");
    try {
      const inherited = selectedList?.assigned_to?.length === 1 && selectedList.assigned_to[0] !== "Everyone"
        ? selectedList.assigned_to[0]
        : "";
      const workRecord = {
        id: `work-shared-${item.id}`,
        propertyId,
        title: String(item.title || "Shared list item"),
        date: String(item.due_date || "").slice(0, 10) || localDateKey(),
        status: "Open",
        priority: "Medium",
        assignedTo: String(item.assigned_to || inherited),
        recurring: false,
        workType: "Quick Task",
        workCategory: "Maintenance",
        responsibilityArea: "Team List",
        notes: String(item.notes || ""),
        photos: item.photo_url
          ? [{ id: `shared-photo-${item.id}`, name: item.photo_name || "Shared list photo", url: item.photo_url, type: "image/jpeg", createdAt: new Date().toISOString() }]
          : [],
      };
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-atlas-request-id": `shared-list-work-${item.id}` },
        credentials: "include",
        body: JSON.stringify({ table: "work_orders", propertyId, record: workRecord }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || "Atlas could not create the work item.");
      await itemAction(item, "moved-to-work");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not move that item to Work.");
    }
  };

  const deleteRecord = async (id: string, kind: "item" | "list", label: string) => {
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      const response = await fetch("/api/atlas-shared-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId, id, kind }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Atlas could not delete that record.");
      await load(propertyId);
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not delete that record.");
    }
  };

  const inactiveAssignee = (item: SharedItem) => inactiveMembers.find((member) => memberMatchesName(member, item.assigned_to));

  return (
    <>
      {visible ? (
        <button
          type="button"
          className="atlas-shared-list-launch"
          onClick={() => {
            setOpen(true);
            setMessage("");
            void Promise.all([load(propertyId), loadTeam()]).catch((error) =>
              setMessage(error instanceof Error ? error.message : "Atlas could not load the Team List."),
            );
          }}
        >
          Team List{totalOpen ? ` ${totalOpen}` : ""}
        </button>
      ) : null}

      {open ? (
        <div className="atlas-shared-list-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="atlas-shared-list-panel" role="dialog" aria-modal="true" aria-label="Team List">
            <div className="atlas-shared-list-header">
              <div>
                <strong>Team Lists</strong>
                <span>{propertyId} · {adminView ? "all shared lists" : actor}</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="atlas-shared-list-layout">
              <aside className="atlas-shared-list-sidebar">
                <div className="atlas-shared-list-sidebar-head">
                  <strong>Lists</strong>
                  {adminView ? <button type="button" onClick={openCreateList}>+ New</button> : null}
                </div>
                <div className="atlas-shared-list-list-buttons">
                  {visibleLists.map((list) => {
                    const count = items.filter((item) => item.list_id === list.id && String(item.status || "Open") === "Open").length;
                    const hasInactiveOwner = (list.assigned_to || []).some((assigned) => inactiveMembers.some((member) => memberMatchesName(member, assigned)));
                    return (
                      <button key={list.id} type="button" className={selectedListId === list.id ? "is-selected" : ""} onClick={() => setSelectedListId(list.id)}>
                        <span>
                          <strong>{list.name || "Untitled List"}</strong>
                          <small>{list.status === "Paused" ? "Paused" : (list.assigned_to || ["Everyone"]).join(", ")}</small>
                        </span>
                        <span className={hasInactiveOwner ? "needs-review" : ""}>{hasInactiveOwner ? "!" : count}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="atlas-shared-list-main">
                {!selectedList ? (
                  <div className="atlas-shared-list-empty">No Team Lists are assigned to this view.</div>
                ) : (
                  <>
                    <div className="atlas-shared-list-list-head">
                      <div>
                        <h3>{selectedList.name || "Untitled List"}</h3>
                        <span>{(selectedList.assigned_to || ["Everyone"]).join(", ")}{selectedList.status === "Paused" ? " · Paused" : ""}</span>
                      </div>
                      {adminView ? (
                        <div>
                          <button type="button" onClick={openEditList}>Edit</button>
                          <button type="button" onClick={() => void post({ action: selectedList.status === "Paused" ? "resume-list" : "pause-list", id: selectedList.id }).then(() => load(propertyId))}>
                            {selectedList.status === "Paused" ? "Resume" : "Pause"}
                          </button>
                          {!selectedList.id.startsWith("shared-list-default-") ? (
                            <button type="button" className="atlas-shared-list-delete" onClick={() => void deleteRecord(selectedList.id, "list", selectedList.name || "this list")}>Delete</button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {selectedList.status !== "Paused" ? (
                      <>
                        <div className="atlas-shared-list-quick-add">
                          <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void createItem();
                              }
                            }}
                            placeholder={`Add to ${selectedList.name || "list"}`}
                            autoFocus
                          />
                          <button type="button" disabled={saving || !title.trim()} onClick={() => void createItem()}>{saving ? "Adding…" : "Add"}</button>
                        </div>

                        <details className="atlas-shared-list-details">
                          <summary>Item details</summary>
                          <div className="atlas-shared-list-detail-grid">
                            <label>
                              <span>Assign item</span>
                              <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                                <option value="">Use list assignment</option>
                                {activeMembers.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                              </select>
                            </label>
                            <label>
                              <span>Due</span>
                              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                            </label>
                            <label className="atlas-shared-list-wide">
                              <span>Note</span>
                              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note" />
                            </label>
                            <label className="atlas-shared-list-wide">
                              <span>Photo</span>
                              <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                            </label>
                          </div>
                        </details>
                      </>
                    ) : null}

                    <div className="atlas-shared-list-items">
                      {openItems.map((item) => {
                        const inactive = inactiveAssignee(item);
                        return (
                          <div className={`atlas-shared-list-row${inactive ? " needs-review" : ""}`} key={item.id}>
                            {item.photo_url ? <img src={item.photo_url} alt={item.photo_name || item.title || "Team list"} /> : null}
                            <div className="atlas-shared-list-row-main">
                              <strong>{item.title || "Untitled"}</strong>
                              <span>
                                {item.assigned_to || "List assignment"}
                                {item.due_date ? ` · ${formatDate(item.due_date)}` : ""}
                                {item.created_by ? ` · added by ${item.created_by}` : ""}
                              </span>
                              {inactive ? <em>{inactive.name} is paused · choose what happens to this item</em> : null}
                              {item.notes ? <p>{item.notes}</p> : null}
                            </div>
                            <div className="atlas-shared-list-row-actions">
                              {inactive ? (
                                <>
                                  <select value={reassignByItem[item.id] || ""} onChange={(event) => setReassignByItem((current) => ({ ...current, [item.id]: event.target.value }))}>
                                    <option value="">Reassign…</option>
                                    {activeMembers.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                                  </select>
                                  <button type="button" disabled={!reassignByItem[item.id]} onClick={() => void reassignItem(item)}>Assign</button>
                                  <button type="button" onClick={() => void itemAction(item, "pause")}>Pause</button>
                                  <button type="button" onClick={() => void itemAction(item, "skip")}>Skip</button>
                                </>
                              ) : (
                                <button type="button" onClick={() => void itemAction(item, "done")}>Done</button>
                              )}
                              <button type="button" onClick={() => void moveToWork(item)}>Move to Work</button>
                              <button type="button" className="atlas-shared-list-delete" onClick={() => void deleteRecord(item.id, "item", item.title || "this item")}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                      {!openItems.length ? <div className="atlas-shared-list-empty">Nothing open on this list.</div> : null}
                    </div>

                    {completedItems.length ? (
                      <div className="atlas-shared-list-completed">
                        <button type="button" onClick={() => setShowCompleted((current) => !current)}>{showCompleted ? "Hide" : "Show"} completed / paused · {completedItems.length}</button>
                        {showCompleted ? (
                          <div className="atlas-shared-list-items">
                            {completedItems.map((item) => (
                              <div className="atlas-shared-list-row atlas-shared-list-row-completed" key={item.id}>
                                <div className="atlas-shared-list-row-main">
                                  <strong>{item.title || "Untitled"}</strong>
                                  <span>{item.status || "Completed"}</span>
                                </div>
                                <div className="atlas-shared-list-row-actions">
                                  <button type="button" onClick={() => void itemAction(item, "reopen")}>Reopen</button>
                                  <button type="button" className="atlas-shared-list-delete" onClick={() => void deleteRecord(item.id, "item", item.title || "this item")}>Delete</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </main>
            </div>

            {message ? <div className="atlas-shared-list-message">{message}</div> : null}
          </div>
        </div>
      ) : null}

      {showListEditor ? (
        <div className="atlas-shared-list-editor-overlay" onMouseDown={(event) => event.target === event.currentTarget && setShowListEditor(false)}>
          <div className="atlas-shared-list-editor" role="dialog" aria-modal="true" aria-label="Team List settings">
            <div className="atlas-shared-list-header">
              <strong>{selectedList && listName === selectedList.name ? "Edit List" : "New List"}</strong>
              <button type="button" onClick={() => setShowListEditor(false)}>×</button>
            </div>
            <label>
              <span>Title</span>
              <input value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Home Depot" autoFocus />
            </label>
            <div className="atlas-shared-list-assignment-picker">
              <span>Who sees this list</span>
              <button type="button" className={listAssignments.includes("Everyone") ? "is-selected" : ""} onClick={() => toggleListAssignment("Everyone")}>Everyone</button>
              {activeMembers.map((member) => (
                <button key={member.id} type="button" className={listAssignments.includes(member.name) ? "is-selected" : ""} onClick={() => toggleListAssignment(member.name)}>{member.name}</button>
              ))}
            </div>
            <div className="atlas-shared-list-editor-actions">
              <button type="button" onClick={() => setShowListEditor(false)}>Cancel</button>
              <button type="button" className="primary" disabled={!listName.trim() || saving} onClick={() => void (selectedList && listName === selectedList.name ? updateSelectedList() : createList())}>Save</button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .atlas-shared-list-launch{position:fixed!important;top:126px!important;right:22px!important;z-index:8400!important;min-height:34px!important;padding:6px 11px!important;border:1px solid #d1dae3!important;border-radius:9px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important;box-shadow:0 3px 10px rgba(11,44,67,.1)!important}
        .atlas-shared-list-overlay,.atlas-shared-list-editor-overlay{position:fixed!important;inset:0!important;z-index:100200!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(7,24,39,.68)!important}
        .atlas-shared-list-editor-overlay{z-index:100300!important}
        .atlas-shared-list-panel{width:min(980px,97vw)!important;max-height:92dvh!important;overflow:hidden!important;display:grid!important;gap:10px!important;padding:14px!important;border-radius:14px!important;background:#fff!important;box-shadow:0 22px 70px rgba(0,0,0,.28)!important}
        .atlas-shared-list-header,.atlas-shared-list-quick-add,.atlas-shared-list-row,.atlas-shared-list-row-actions,.atlas-shared-list-list-head,.atlas-shared-list-sidebar-head,.atlas-shared-list-editor-actions{display:flex!important;align-items:center!important;gap:8px!important}
        .atlas-shared-list-header,.atlas-shared-list-list-head,.atlas-shared-list-sidebar-head{justify-content:space-between!important}
        .atlas-shared-list-header>div,.atlas-shared-list-row-main,.atlas-shared-list-list-head>div{display:grid!important;gap:2px!important;min-width:0!important}
        .atlas-shared-list-header strong{color:#0b2c43!important;font-size:16px!important}.atlas-shared-list-header span,.atlas-shared-list-row span,.atlas-shared-list-row p,.atlas-shared-list-list-head span{color:#66788a!important;font-size:10px!important}
        .atlas-shared-list-header>button,.atlas-shared-list-quick-add button,.atlas-shared-list-row-actions button,.atlas-shared-list-row-actions select,.atlas-shared-list-completed>button,.atlas-shared-list-list-head button,.atlas-shared-list-sidebar-head button,.atlas-shared-list-editor-actions button{min-height:32px!important;padding:5px 9px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:11px!important;font-weight:800!important;cursor:pointer!important}
        .atlas-shared-list-header>button{width:34px!important;min-width:34px!important;padding:0!important;font-size:20px!important}.atlas-shared-list-delete{color:#9f1d20!important}
        .atlas-shared-list-layout{display:grid!important;grid-template-columns:220px minmax(0,1fr)!important;gap:12px!important;min-height:0!important;overflow:hidden!important}.atlas-shared-list-sidebar{min-height:0!important;overflow:hidden!important;border:1px solid #e0e6ec!important;border-radius:11px!important;background:#fbfcfe!important}.atlas-shared-list-sidebar-head{padding:10px!important;border-bottom:1px solid #e0e6ec!important}.atlas-shared-list-sidebar-head strong{font-size:12px!important;color:#0b2c43!important}.atlas-shared-list-list-buttons{display:grid!important;max-height:66dvh!important;overflow-y:auto!important}.atlas-shared-list-list-buttons>button{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;padding:10px 11px!important;border:0!important;border-bottom:1px solid #e8edf2!important;background:#fff!important;text-align:left!important;color:#0b2c43!important}.atlas-shared-list-list-buttons>button.is-selected{background:#edf5ff!important;box-shadow:inset 3px 0 0 #1f6fd1!important}.atlas-shared-list-list-buttons>button>span:first-child{display:grid!important;gap:2px!important;min-width:0!important}.atlas-shared-list-list-buttons strong{font-size:12px!important}.atlas-shared-list-list-buttons small{font-size:9px!important;color:#66788a!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}.atlas-shared-list-list-buttons .needs-review{color:#a15d00!important;font-weight:900!important}
        .atlas-shared-list-main{min-height:0!important;overflow-y:auto!important;padding-right:2px!important}.atlas-shared-list-list-head{padding-bottom:8px!important;border-bottom:1px solid #e8edf2!important}.atlas-shared-list-list-head h3{margin:0!important;color:#0b2c43!important;font-size:18px!important}.atlas-shared-list-list-head>div:last-child{display:flex!important;gap:6px!important;flex-wrap:wrap!important;justify-content:flex-end!important}
        .atlas-shared-list-quick-add{margin-top:10px!important}.atlas-shared-list-quick-add input,.atlas-shared-list-detail-grid input,.atlas-shared-list-detail-grid select,.atlas-shared-list-detail-grid textarea,.atlas-shared-list-editor input{width:100%!important;min-height:36px!important;padding:7px 9px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font:inherit!important;font-size:12px!important;box-sizing:border-box!important}.atlas-shared-list-quick-add input{flex:1 1 auto!important}.atlas-shared-list-quick-add button,.atlas-shared-list-editor-actions .primary{background:#0b2c43!important;border-color:#0b2c43!important;color:#fff!important}
        .atlas-shared-list-details{margin:8px 0!important}.atlas-shared-list-details summary{cursor:pointer!important;color:#526579!important;font-size:11px!important;font-weight:800!important}.atlas-shared-list-detail-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin-top:8px!important}.atlas-shared-list-detail-grid label,.atlas-shared-list-editor>label{display:grid!important;gap:4px!important}.atlas-shared-list-detail-grid label>span,.atlas-shared-list-editor label>span,.atlas-shared-list-assignment-picker>span{color:#526579!important;font-size:10px!important;font-weight:900!important;text-transform:uppercase!important}.atlas-shared-list-wide{grid-column:1/-1!important}.atlas-shared-list-detail-grid textarea{min-height:64px!important;resize:vertical!important}
        .atlas-shared-list-items{display:grid!important;gap:6px!important}.atlas-shared-list-row{align-items:flex-start!important;padding:8px!important;border:1px solid #e0e6ec!important;border-radius:9px!important;background:#fbfcfe!important}.atlas-shared-list-row.needs-review{border-color:#e4b76a!important;background:#fffaf1!important}.atlas-shared-list-row>img{width:58px!important;height:58px!important;flex:0 0 58px!important;border-radius:8px!important;object-fit:cover!important}.atlas-shared-list-row-main{flex:1 1 auto!important}.atlas-shared-list-row-main strong{color:#0b2c43!important;font-size:12px!important}.atlas-shared-list-row-main em{color:#9a5a00!important;font-size:10px!important;font-style:normal!important;font-weight:800!important}.atlas-shared-list-row p{margin:3px 0 0!important;white-space:pre-wrap!important;line-height:1.35!important}.atlas-shared-list-row-actions{flex:0 0 auto!important;flex-wrap:wrap!important;justify-content:flex-end!important}.atlas-shared-list-row-actions select{max-width:130px!important}.atlas-shared-list-row-completed{opacity:.72!important}.atlas-shared-list-empty,.atlas-shared-list-message{padding:10px!important;color:#66788a!important;font-size:11px!important}.atlas-shared-list-completed{display:grid!important;gap:7px!important;margin-top:8px!important}.atlas-shared-list-completed>button{justify-self:start!important}
        .atlas-shared-list-editor{width:min(430px,94vw)!important;display:grid!important;gap:14px!important;padding:16px!important;border-radius:14px!important;background:#fff!important;box-shadow:0 22px 70px rgba(0,0,0,.28)!important}.atlas-shared-list-assignment-picker{display:flex!important;gap:6px!important;flex-wrap:wrap!important}.atlas-shared-list-assignment-picker>span{width:100%!important}.atlas-shared-list-assignment-picker button{min-height:32px!important;padding:6px 9px!important;border:1px solid #d8e0e8!important;border-radius:8px!important;background:#fff!important;color:#0b2c43!important;font-size:11px!important}.atlas-shared-list-assignment-picker button.is-selected{background:#edf5ff!important;border-color:#7aaee8!important;color:#155fae!important}.atlas-shared-list-editor-actions{justify-content:flex-end!important}
        @media(max-width:900px){.atlas-shared-list-launch{top:auto!important;right:12px!important;bottom:122px!important}.atlas-shared-list-overlay{padding:7px!important}.atlas-shared-list-panel{width:100%!important;height:calc(100dvh - 14px)!important;max-height:none!important}.atlas-shared-list-layout{grid-template-columns:1fr!important;grid-template-rows:auto minmax(0,1fr)!important}.atlas-shared-list-sidebar{max-height:180px!important}.atlas-shared-list-list-buttons{max-height:130px!important}.atlas-shared-list-main{overflow-y:auto!important}.atlas-shared-list-detail-grid{grid-template-columns:1fr!important}.atlas-shared-list-wide{grid-column:auto!important}.atlas-shared-list-row{display:grid!important;grid-template-columns:auto 1fr!important}.atlas-shared-list-row-actions{grid-column:1/-1!important;justify-content:flex-start!important}.atlas-shared-list-list-head{align-items:flex-start!important}.atlas-shared-list-list-head>div:last-child{justify-content:flex-start!important}.atlas-shared-list-header{padding-right:2px!important}}
      `}</style>
    </>
  );
}
