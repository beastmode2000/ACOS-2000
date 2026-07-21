"use client";

import React, { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type CrewStatus = "Not Started" | "In Progress" | "Complete" | "Needs Review";
type CrewPhoto = { id: string; name: string; type: string; dataUrl: string; addedAt: string };
type CrewList = {
  id: string; workDate: string; title: string; shareToken: string; status: CrewStatus;
  crewName: string; managerNotes: string; crewNotes: string; property: string;
  templateName: string; completedAt: string; createdAt: string; updatedAt: string;
};
type CrewItem = {
  id: string; listId: string; sortOrder: number; label: string; category: string;
  location: string; priority: string; isDone: boolean; notes: string; updatedBy: string;
  photos: CrewPhoto[]; completedAt: string; updatedAt: string;
};
type CrewTemplate = { id: string; name: string; category: string; items: Partial<CrewItem>[] };
type ApiData = { ok?: boolean; error?: string; list?: CrewList; items?: CrewItem[]; lists?: CrewList[]; templates?: CrewTemplate[]; isCrewView?: boolean };

const STATUS: CrewStatus[] = ["Not Started", "In Progress", "Needs Review", "Complete"];
const CATEGORIES = ["Landscaping", "Cleaning", "Maintenance", "Organizing", "Watering", "Irrigation", "Inspection", "Errands", "General"];
const PRIORITIES = ["Highest", "High", "Normal", "Low"];

function tokenFromUrl() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return (url.searchParams.get("token") || "").trim();
}
function apiUrl(token = "", params: Record<string, string> = {}) {
  const search = new URLSearchParams(params);
  if (token) search.set("token", token);
  return search.toString() ? `/api/landscape-help?${search}` : "/api/landscape-help";
}
async function readJson(response: Response, fallback: string): Promise<ApiData> {
  const text = await response.text();
  let data: ApiData;
  try { data = JSON.parse(text) as ApiData; } catch { throw new Error(text || fallback); }
  if (!response.ok || !data.ok) throw new Error(data.error || fallback);
  return data;
}
function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function makeLocalId() { return `new-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function blankItem(): CrewItem {
  return { id: "", listId: "", sortOrder: 0, label: "", category: "General", location: "", priority: "Normal", isDone: false, notes: "", updatedBy: "", photos: [], completedAt: "", updatedAt: "" };
}

export default function DailyCrewWorkPage() {
  const [list, setList] = useState<CrewList | null>(null);
  const [items, setItems] = useState<CrewItem[]>([]);
  const [history, setHistory] = useState<CrewList[]>([]);
  const [templates, setTemplates] = useState<CrewTemplate[]>([]);
  const [token, setToken] = useState("");
  const [crewView, setCrewView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [draggedId, setDraggedId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    const currentToken = tokenFromUrl();
    setToken(currentToken);
    setCrewView(Boolean(currentToken));
    void load(undefined, currentToken);
  }, []);

  const completed = items.filter((item) => item.isDone).length;
  const progress = items.length ? Math.round((completed / items.length) * 100) : 0;
  const shareLink = useMemo(() => list && typeof window !== "undefined" ? `${window.location.origin}/landscape-help?token=${encodeURIComponent(list.shareToken)}` : "", [list]);

  async function load(listId?: string, tokenOverride = token) {
    setLoading(true); setMessage("");
    try {
      const data = await readJson(await fetch(apiUrl(tokenOverride, listId ? { listId } : {}), { cache: "no-store" }), "Could not load Daily Crew Work.");
      setList(data.list || null); setItems(data.items || []); setHistory(data.lists || []); setTemplates(data.templates || []); setCrewView(Boolean(data.isCrewView));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load Daily Crew Work."); }
    finally { setLoading(false); }
  }

  function patchItem(index: number, changes: Partial<CrewItem>) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...changes } : item));
  }
  function addTask() { setItems((current) => [...current, { ...blankItem(), id: makeLocalId(), sortOrder: current.length + 1 }]); setEditing(true); }
  function deleteTask(index: number) { setItems((current) => current.filter((_, i) => i !== index)); }
  function moveTask(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setItems((current) => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; });
  }
  function dropOn(event: DragEvent, targetId: string) {
    event.preventDefault();
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    moveTask(from, to); setDraggedId("");
  }

  async function save(nextStatus?: CrewStatus) {
    if (!list) return;
    setSaving(true); setMessage("");
    try {
      const cleanItems = items.map((item, index) => ({ ...item, id: item.id.startsWith("new-") ? "" : item.id, sortOrder: index + 1 }));
      const data = await readJson(await fetch(apiUrl(token), {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...list, listId: list.id, status: nextStatus || list.status, items: cleanItems }),
      }), "Could not save Daily Crew Work.");
      setList(data.list || null); setItems(data.items || []); if (data.lists) setHistory(data.lists); if (data.templates) setTemplates(data.templates);
      setEditing(false); setMessage(nextStatus === "Complete" ? "Work list completed." : "Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save Daily Crew Work."); }
    finally { setSaving(false); }
  }

  async function adminAction(body: Record<string, unknown>) {
    setSaving(true); setMessage("");
    try {
      const data = await readJson(await fetch("/api/landscape-help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), "Action failed.");
      if (data.list) setList(data.list); if (data.items) setItems(data.items); if (data.lists) setHistory(data.lists); if (data.templates) setTemplates(data.templates);
      setMessage("Saved."); return data;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed."); return null; }
    finally { setSaving(false); }
  }

  async function createList() {
    if (!newDate) { setMessage("Choose a date first."); return; }
    await adminAction({ action: "createList", workDate: newDate, title: "Daily Crew Work", property: "2000" }); setNewDate(""); setEditing(true);
  }
  async function duplicateCurrent() {
    if (!list || !newDate) { setMessage("Choose the new date first."); return; }
    await adminAction({ action: "duplicateList", sourceId: list.id, workDate: newDate }); setNewDate(""); setEditing(true);
  }
  async function saveTemplate() {
    if (!templateName.trim()) { setMessage("Enter a template name."); return; }
    await adminAction({ action: "saveTemplate", name: templateName.trim(), category: "General", items }); setTemplateName("");
  }
  async function applyTemplate() {
    if (!list || !selectedTemplate) return;
    await adminAction({ action: "applyTemplate", listId: list.id, templateId: selectedTemplate });
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(shareLink); setMessage("Crew link copied."); } catch { setMessage(shareLink); }
  }

  async function addPhotos(index: number, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 4);
    const photos = await Promise.all(files.map((file) => new Promise<CrewPhoto>((resolve, reject) => {
      if (file.size > 1_500_000) { reject(new Error(`${file.name} is too large. Keep each photo under 1.5 MB.`)); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ id: makeLocalId(), name: file.name, type: file.type || "image/jpeg", dataUrl: String(reader.result || ""), addedAt: new Date().toISOString() });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`)); reader.readAsDataURL(file);
    })));
    patchItem(index, { photos: [...items[index].photos, ...photos].slice(0, 8) }); event.target.value = "";
  }

  if (loading && !list) return <><Styles /><main className="cw-page"><section className="cw-card cw-loading"><b>Atlas / 2000</b><h1>Daily Crew Work</h1><p>Loading work list…</p></section></main></>;

  return <>
    <Styles />
    <main className="cw-page">
      <div className="cw-shell">
        <header className="cw-header">
          <div><div className="cw-eyebrow">Atlas / 2000</div><h1>Daily Crew Work</h1><p>{crewView ? "Complete today’s assigned work, add notes or photos, and save your progress." : "Build, assign, share, and review daily work for landscaping, cleaning, maintenance, and seasonal help."}</p></div>
          {!crewView && <a href="/" className="cw-link">Back to Atlas</a>}
        </header>
        {message && <div className="cw-message" role="status">{message}</div>}

        {list ? <>
          <section className="cw-summary cw-card">
            <div className="cw-summary-top">
              <div>
                {crewView || !editing ? <><div className="cw-eyebrow">{formatDate(list.workDate)}</div><h2>{list.title}</h2></> : <input className="cw-title-input" value={list.title} onChange={(e) => setList({ ...list, title: e.target.value })} />}
                <p><b>{list.crewName || "Unassigned crew"}</b> · {list.property || "2000"}</p>
              </div>
              <span className={`cw-status s-${list.status.toLowerCase().replaceAll(" ", "-")}`}>{list.status}</span>
            </div>
            <div className="cw-progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="cw-progress-text">{completed} of {items.length} tasks complete · {progress}%</div>

            {!crewView && editing && <div className="cw-admin-grid">
              <label>Date<input type="date" value={list.workDate} disabled /></label>
              <label>Assigned helper / crew<input value={list.crewName} onChange={(e) => setList({ ...list, crewName: e.target.value })} /></label>
              <label>Property<input value={list.property} onChange={(e) => setList({ ...list, property: e.target.value })} /></label>
              <label>Status<select value={list.status} onChange={(e) => setList({ ...list, status: e.target.value as CrewStatus })}>{STATUS.map((status) => <option key={status}>{status}</option>)}</select></label>
            </div>}

            <div className="cw-notes-grid">
              <label>Instructions for crew<textarea value={list.managerNotes} readOnly={crewView || !editing} onChange={(e) => setList({ ...list, managerNotes: e.target.value })} /></label>
              <label>Crew notes<textarea value={list.crewNotes} onChange={(e) => setList({ ...list, crewNotes: e.target.value })} /></label>
            </div>
          </section>

          <section className="cw-card">
            <div className="cw-section-head"><div><div className="cw-eyebrow">Today’s Assignment</div><h2>Tasks</h2></div>{!crewView && <div className="cw-row"><button className="cw-button subtle" onClick={() => setEditing((value) => !value)}>{editing ? "Cancel Edit" : "Edit List"}</button>{editing && <button className="cw-button" onClick={addTask}>Add Task</button>}</div>}</div>
            <div className="cw-task-list">
              {items.map((item, index) => <article key={item.id || index} className={`cw-task ${item.isDone ? "done" : ""}`} draggable={!crewView && editing} onDragStart={() => setDraggedId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropOn(e, item.id)}>
                <div className="cw-task-main">
                  <input className="cw-check" type="checkbox" checked={item.isDone} onChange={(e) => patchItem(index, { isDone: e.target.checked, updatedBy: list.crewName || "Crew" })} />
                  <div className="cw-task-body">
                    {!crewView && editing ? <>
                      <input className="cw-task-title-input" value={item.label} placeholder="Task name" onChange={(e) => patchItem(index, { label: e.target.value })} />
                      <div className="cw-task-edit-grid">
                        <select value={item.category} onChange={(e) => patchItem(index, { category: e.target.value })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
                        <input value={item.location} placeholder="Location" onChange={(e) => patchItem(index, { location: e.target.value })} />
                        <select value={item.priority} onChange={(e) => patchItem(index, { priority: e.target.value })}>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select>
                      </div>
                    </> : <><h3>{item.label}</h3><div className="cw-meta"><span>{item.category}</span>{item.location && <span>{item.location}</span>}<span className={`priority-${item.priority.toLowerCase()}`}>{item.priority}</span>{item.completedAt && <span>Completed {new Date(item.completedAt).toLocaleString()}</span>}</div></>}
                    <textarea className="cw-task-notes" value={item.notes} placeholder="Notes about this task" onChange={(e) => patchItem(index, { notes: e.target.value })} />
                    <div className="cw-photos">{item.photos.map((photo, photoIndex) => <div className="cw-photo" key={photo.id}><img src={photo.dataUrl} alt={photo.name} />{(!crewView || !item.isDone) && <button type="button" onClick={() => patchItem(index, { photos: item.photos.filter((_, i) => i !== photoIndex) })}>×</button>}</div>)}</div>
                    <label className="cw-photo-button">Add Photos<input type="file" accept="image/*" multiple onChange={(e) => void addPhotos(index, e)} /></label>
                  </div>
                  {!crewView && editing && <div className="cw-task-actions"><span title="Drag to reorder">⋮⋮</span><button onClick={() => moveTask(index, index - 1)} disabled={index === 0}>↑</button><button onClick={() => moveTask(index, index + 1)} disabled={index === items.length - 1}>↓</button><button className="danger" onClick={() => deleteTask(index)}>Delete</button></div>}
                </div>
              </article>)}
              {!items.length && <p className="cw-empty">No tasks on this list.</p>}
            </div>
            <div className="cw-footer-actions"><button className="cw-button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button><button className="cw-button secondary" disabled={saving} onClick={() => void save("Complete")}>Complete List</button></div>
          </section>

          {!crewView && <div className="cw-admin-columns">
            <section className="cw-card"><div className="cw-eyebrow">Share</div><h2>Crew Link</h2><p>This link opens only this assignment, not the rest of Atlas.</p><input className="cw-share" readOnly value={shareLink} /><button className="cw-button" onClick={() => void copyLink()}>Copy Link</button></section>
            <section className="cw-card"><div className="cw-eyebrow">Create / Duplicate</div><h2>New Daily List</h2><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /><div className="cw-row"><button className="cw-button" onClick={() => void createList()}>Create New</button><button className="cw-button subtle" onClick={() => void duplicateCurrent()}>Copy Current</button></div></section>
            <section className="cw-card"><div className="cw-eyebrow">Templates</div><h2>Reusable Lists</h2><div className="cw-template-row"><input value={templateName} placeholder="Template name" onChange={(e) => setTemplateName(e.target.value)} /><button className="cw-button" onClick={() => void saveTemplate()}>Save Current</button></div><div className="cw-template-row"><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}><option value="">Choose template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="cw-button subtle" onClick={() => void applyTemplate()}>Apply</button></div></section>
          </div>}

          {!crewView && <section className="cw-card"><div className="cw-eyebrow">History</div><h2>Past Daily Work</h2><div className="cw-history">{history.map((entry) => <button key={entry.id} className={entry.id === list.id ? "active" : ""} onClick={() => void load(entry.id, "")}><span><b>{entry.title}</b><small>{formatDate(entry.workDate)} · {entry.crewName || "Unassigned"}</small></span><em>{entry.status}</em></button>)}</div></section>}
        </> : <section className="cw-card"><h2>Daily Crew Work unavailable</h2><p>{message || "No work list was found."}</p></section>}
      </div>
    </main>
  </>;
}

function Styles() {
  return <style jsx global>{`
    :root{--navy:#0b1e33;--navy2:#102a44;--gold:#c99a3d;--bg:#f4f6f8;--card:#fff;--line:#dce4ec;--text:#172331;--muted:#607086;--green:#2e7d5b;--red:#b42318}
    *{box-sizing:border-box}body{margin:0}.cw-page{min-height:100vh;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:28px}.cw-shell{max-width:1220px;margin:auto;display:grid;gap:20px}.cw-header{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;border-radius:22px;padding:28px;display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.cw-header h1{font-size:34px;margin:5px 0 7px}.cw-header p{margin:0;max-width:760px;color:#dce7f2}.cw-eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:800;color:var(--gold)}.cw-link{color:#fff;text-decoration:none;border:1px solid #ffffff55;border-radius:10px;padding:10px 14px}.cw-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 8px 24px #0b1e3310}.cw-card h2{margin:4px 0 10px}.cw-message{padding:12px 16px;border-radius:12px;background:#fff8e8;border:1px solid #ecd397;color:#6b5019}.cw-summary-top,.cw-section-head,.cw-row,.cw-task-main,.cw-template-row{display:flex;gap:12px;align-items:center}.cw-summary-top,.cw-section-head{justify-content:space-between;align-items:flex-start}.cw-summary-top h2{font-size:28px}.cw-status{border-radius:999px;padding:8px 12px;font-size:12px;font-weight:800;white-space:nowrap}.s-complete{background:#e7f6ef;color:#22694d}.s-in-progress{background:#eaf2ff;color:#235ea6}.s-needs-review{background:#fff4d8;color:#8a5b00}.s-not-started{background:#edf1f5;color:#526274}.cw-progress{height:10px;border-radius:999px;background:#e5ebf0;overflow:hidden;margin:18px 0 7px}.cw-progress span{display:block;height:100%;background:var(--gold)}.cw-progress-text{font-size:13px;color:var(--muted)}.cw-admin-grid,.cw-notes-grid,.cw-task-edit-grid,.cw-admin-columns{display:grid;gap:14px}.cw-admin-grid{grid-template-columns:repeat(4,1fr);margin-top:18px}.cw-notes-grid{grid-template-columns:1fr 1fr;margin-top:18px}.cw-admin-columns{grid-template-columns:repeat(3,1fr)}label{display:grid;gap:7px;font-size:12px;font-weight:750;color:#44546a}input,select,textarea{width:100%;border:1px solid #cfd9e2;border-radius:10px;background:#fff;color:var(--text);font:inherit;padding:10px 11px}textarea{resize:vertical;min-height:84px}.cw-title-input{font-size:27px;font-weight:800}.cw-button{appearance:none;border:0;border-radius:10px;background:var(--navy2);color:#fff;font-weight:750;padding:10px 14px;cursor:pointer}.cw-button.secondary{background:var(--green)}.cw-button.subtle{background:#eef2f6;color:var(--navy2)}.cw-button:disabled{opacity:.5;cursor:not-allowed}.cw-task-list{display:grid;gap:12px;margin-top:18px}.cw-task{border:1px solid var(--line);border-radius:15px;padding:16px;background:#fff}.cw-task.done{background:#f6faf8}.cw-task.done h3{text-decoration:line-through;color:#66766d}.cw-task-main{align-items:flex-start}.cw-check{width:24px;height:24px;margin-top:2px;accent-color:var(--green);flex:0 0 auto}.cw-task-body{min-width:0;flex:1}.cw-task-body h3{margin:0 0 7px;font-size:17px}.cw-meta{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}.cw-meta span{font-size:11px;background:#eef2f5;border-radius:999px;padding:5px 8px;color:#526274}.cw-meta .priority-highest{background:#fde8e7;color:#a22}.cw-meta .priority-high{background:#fff0df;color:#99520a}.cw-task-title-input{font-weight:800;font-size:16px;margin-bottom:9px}.cw-task-edit-grid{grid-template-columns:1fr 1fr 130px}.cw-task-notes{min-height:58px;margin-top:8px}.cw-task-actions{display:flex;gap:5px;align-items:center}.cw-task-actions button{border:0;background:#eef2f5;border-radius:8px;padding:7px;cursor:pointer}.cw-task-actions .danger{color:var(--red)}.cw-photos{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.cw-photo{position:relative;width:96px;height:72px}.cw-photo img{width:100%;height:100%;object-fit:cover;border-radius:9px}.cw-photo button{position:absolute;right:-5px;top:-7px;border:0;border-radius:50%;background:#172331;color:white;width:22px;height:22px}.cw-photo-button{display:inline-flex;margin-top:9px;background:#eef2f5;border-radius:9px;padding:8px 10px;cursor:pointer}.cw-photo-button input{display:none}.cw-footer-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px}.cw-share{margin:8px 0 10px}.cw-template-row{margin-top:9px}.cw-history{display:grid;gap:7px;max-height:430px;overflow:auto}.cw-history button{display:flex;justify-content:space-between;align-items:center;text-align:left;border:1px solid var(--line);background:#fff;border-radius:10px;padding:11px;cursor:pointer}.cw-history button.active{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}.cw-history span{display:grid;gap:3px}.cw-history small{color:var(--muted)}.cw-history em{font-style:normal;font-size:12px;color:var(--muted)}.cw-empty,.cw-loading p{color:var(--muted)}
    @media(max-width:850px){.cw-page{padding:12px}.cw-header{padding:21px;border-radius:16px}.cw-header h1{font-size:27px}.cw-link{display:none}.cw-card{padding:16px}.cw-admin-grid,.cw-notes-grid,.cw-admin-columns,.cw-task-edit-grid{grid-template-columns:1fr}.cw-summary-top{align-items:flex-start}.cw-task-main{gap:9px}.cw-task-actions{flex-direction:column}.cw-section-head{gap:10px}.cw-row{flex-wrap:wrap}.cw-footer-actions{position:sticky;bottom:8px;background:#ffffffee;padding:10px;border-radius:12px;box-shadow:0 5px 20px #0002}.cw-footer-actions .cw-button{flex:1}.cw-task{padding:13px}.cw-photo{width:88px;height:68px}}
  `}</style>;
}
