"use client";

import React, { useEffect, useMemo, useState } from "react";

type FamilyPerson = "Family" | "Nick" | "Chelsea" | "Cooper" | "Leni";
type FamilyRole = "manager" | "kid";
type Chore = {
  id: string;
  recordType: "chore";
  title: string;
  assignedTo?: string;
  person?: string;
  emoji?: string;
  points?: number;
  date?: string;
  notes?: string;
  status?: string;
  recurring?: boolean;
  recurrenceInterval?: number;
  recurrenceUnit?: "Days" | "Weeks" | "Months";
  recurrenceDays?: number[];
  checklist?: Array<{ id?: string; text?: string; completed?: boolean }>;
  completionHistory?: unknown[];
};
type Goal = {
  id: string;
  recordType: "goal";
  title: string;
  person?: string;
  goalEmoji?: string;
  currentAmount?: number;
  goalAmount?: number;
  goalColor?: string;
};
type CalendarItem = {
  id: string;
  date: string;
  time?: string;
  endTime?: string;
  title: string;
  area?: string;
  categoryLabel?: string;
  notes?: string;
  eventType?: string;
  completed?: boolean;
  linkedId?: string;
};

const PEOPLE: FamilyPerson[] = ["Family", "Nick", "Chelsea", "Cooper", "Leni"];
const KID_PEOPLE: FamilyPerson[] = ["Family", "Cooper", "Leni"];
const PERSON_COLORS: Record<string, string> = {
  Family: "#475467",
  Nick: "#175CD3",
  Chelsea: "#C11574",
  Cooper: "#7F56D9",
  Leni: "#039855",
};
const CATEGORIES = ["Family", "School", "No School", "Appointment", "Activity", "Payday", "Bill", "Grocery", "Reminder", "Meal", "Other"];
const EMOJIS = ["⭐", "🪥", "🚿", "🛏️", "🧺", "🍽️", "🧹", "🗑️", "♻️", "📚", "🎒", "🐶", "🐈", "💩", "🌿", "💧", "⚽", "🏀", "🏈", "⚾", "🎹", "🎨", "🏆", "🎯", "💰"];
const WEEKDAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 0, label: "Sun" },
];

function dateKey(value: unknown) {
  const text = String(value || "").trim();
  const direct = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function todayISO() { return dateKey(new Date()); }
function monthCells(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}
function chorePerson(chore: Chore): FamilyPerson {
  const value = String(chore.assignedTo || chore.person || "Family");
  return PEOPLE.includes(value as FamilyPerson) ? value as FamilyPerson : "Family";
}
function recurrenceText(chore: Chore) {
  if (!chore.recurring) return "One time";
  const interval = Math.max(1, Number(chore.recurrenceInterval || 1));
  const unit = String(chore.recurrenceUnit || "Weeks").toLowerCase();
  const days = Array.isArray(chore.recurrenceDays) ? chore.recurrenceDays : [];
  const dayText = days.length ? ` · ${WEEKDAYS.filter((day) => days.includes(day.value)).map((day) => day.label).join(", ")}` : "";
  return `Every ${interval} ${unit.replace(/s$/, "")}${interval === 1 ? "" : "s"}${dayText}`;
}

export default function AtlasFamilyBoard() {
  const [token, setToken] = useState("");
  const [person, setPerson] = useState<FamilyPerson>("Cooper");
  const [role, setRole] = useState<FamilyRole>("kid");
  const [chores, setChores] = useState<Chore[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [view, setView] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"today" | "calendar" | "chores">("today");
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarItem | null>(null);
  const [newChoreOpen, setNewChoreOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [choreDraft, setChoreDraft] = useState<Chore>({ id: "", recordType: "chore", title: "", assignedTo: "Family", emoji: "⭐", points: 5, date: todayISO(), status: "Open", recurring: false, recurrenceInterval: 1, recurrenceUnit: "Weeks", recurrenceDays: [], notes: "", checklist: [] });
  const [eventDraft, setEventDraft] = useState<CalendarItem>({ id: "", date: todayISO(), title: "", area: "Family", categoryLabel: "Family", time: "", endTime: "", notes: "" });

  async function load(activeToken = token) {
    if (!activeToken) return;
    const response = await fetch(`/api/atlas-home?token=${encodeURIComponent(activeToken)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(payload?.error || "Could not open family board."); return; }
    setPerson(PEOPLE.includes(payload.person) ? payload.person : "Cooper");
    setRole(payload.role === "manager" ? "manager" : "kid");
    const records = Array.isArray(payload.records) ? payload.records : [];
    setChores(records.filter((record: any) => record.recordType === "chore"));
    setGoals(records.filter((record: any) => record.recordType === "goal"));
    setCalendar(Array.isArray(payload.calendar) ? payload.calendar : []);
  }

  useEffect(() => {
    const activeToken = new URLSearchParams(window.location.search).get("token") || "";
    setToken(activeToken);
    if (activeToken) void load(activeToken);
    else setMessage("This family link is missing its token.");
  }, []);

  const visibleChores = useMemo(() => role === "manager" ? chores : chores.filter((chore) => chorePerson(chore) === person || chorePerson(chore) === "Family"), [chores, person, role]);
  const dueChores = useMemo(() => visibleChores.filter((chore) => chore.status !== "Completed" && chore.status !== "Cancelled" && (!dateKey(chore.date) || dateKey(chore.date) <= todayISO())), [visibleChores]);
  const goal = goals.find((item) => item.person === person);
  const current = Number(goal?.currentAmount || 0);
  const target = Math.max(1, Number(goal?.goalAmount || 1));
  const goalPct = Math.min(100, Math.round(current / target * 100));
  const cells = monthCells(view);
  const selectedItems = calendar.filter((item) => item.date === selectedDate);
  const todayItems = calendar.filter((item) => item.date === todayISO());

  async function familyPatch(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("Saving…");
    try {
      const response = await fetch("/api/atlas-home", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Could not save.");
      await load();
      setMessage("Saved");
      window.setTimeout(() => setMessage(""), 1200);
      return payload;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
      return null;
    } finally { setBusy(false); }
  }

  async function completeChore(chore: Chore) {
    const payload = await familyPatch({ action: "completeChore", choreId: chore.id });
    if (payload) setMessage(`Nice job! +${Number(chore.points || 0)} points`);
  }
  async function saveChore(chore: Chore) {
    const assignedTo = PEOPLE.includes(String(chore.assignedTo) as FamilyPerson) ? chore.assignedTo : "Family";
    const meta = { emoji: chore.emoji || "⭐", points: Math.max(0, Number(chore.points || 0)), recurrenceDays: chore.recurring ? (chore.recurrenceDays || []) : [], recurrenceAnchorDate: dateKey(chore.date) };
    const saved = await familyPatch({ action: "saveChore", chore: { ...chore, assignedTo, date: dateKey(chore.date), recurring: Boolean(chore.recurring), recurrenceInterval: Math.max(1, Number(chore.recurrenceInterval || 1)), recurrenceUnit: chore.recurrenceUnit || "Weeks", checklist: Array.isArray(chore.checklist) ? chore.checklist : [] }, meta });
    if (saved) { setEditingChore(null); setNewChoreOpen(false); }
  }
  async function deleteChore(chore: Chore) {
    if (!window.confirm(`Delete ${chore.title}?`)) return;
    const saved = await familyPatch({ action: "deleteChore", choreId: chore.id });
    if (saved) setEditingChore(null);
  }
  async function saveEvent(item: CalendarItem) {
    const saved = await familyPatch({ action: "saveCalendar", item: { ...item, area: PEOPLE.includes(String(item.area) as FamilyPerson) ? item.area : "Family", date: dateKey(item.date) } });
    if (saved) { setEditingEvent(null); setNewEventOpen(false); }
  }
  async function deleteEvent(item: CalendarItem) {
    if (!window.confirm(`Delete ${item.title}?`)) return;
    const saved = await familyPatch({ action: "deleteCalendar", id: item.id });
    if (saved) setEditingEvent(null);
  }

  const panel: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #DDE7F0", borderRadius: 18, padding: 15 };
  const button: React.CSSProperties = { minHeight: 40, border: "1px solid #DDE7F0", borderRadius: 11, padding: "8px 11px", background: "#FFFFFF", color: "#071B2F", fontWeight: 850, cursor: "pointer" };
  const primary: React.CSSProperties = { ...button, background: "#E5C06B", borderColor: "#E5C06B" };
  const input: React.CSSProperties = { width: "100%", minHeight: 42, boxSizing: "border-box", border: "1px solid #DDE7F0", borderRadius: 11, padding: "9px 10px", background: "#FFFFFF", color: "#172331", font: "inherit" };
  const field: React.CSSProperties = { display: "grid", gap: 5, color: "#071B2F", fontWeight: 800, fontSize: 12 };

  function ChoreEditor({ chore, onClose }: { chore: Chore; onClose: () => void }) {
    const [draft, setDraft] = useState<Chore>({ ...chore, recurrenceDays: [...(chore.recurrenceDays || [])], checklist: [...(chore.checklist || [])] });
    const [checkText, setCheckText] = useState("");
    return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(7,27,47,.48)", display: "grid", placeItems: "center", padding: 12 }} onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section style={{ ...panel, width: "min(760px,100%)", maxHeight: "92dvh", overflowY: "auto" }} onMouseDown={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ fontSize: 20 }}>{draft.id ? "Edit Chore" : "New Chore"}</strong><button type="button" onClick={onClose} style={button}>×</button></div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label style={field}>Chore<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={input}/></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
            <label style={field}>Assigned to<select value={chorePerson(draft)} onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })} style={input}>{PEOPLE.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label style={field}>Due / start<input type="date" value={dateKey(draft.date)} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={input}/></label>
            <label style={field}>Points<input type="number" min={0} step={1} value={draft.points || 0} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value || 0) })} style={input}/></label>
          </div>
          <label style={field}>Icon<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => setDraft({ ...draft, emoji })} style={{ ...button, minWidth: 42, padding: 5, fontSize: 22, background: draft.emoji === emoji ? "#FFF4CC" : "#FFFFFF" }}>{emoji}</button>)}</div></label>
          <label style={{ ...field, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={Boolean(draft.recurring)} onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })}/>Recurring</label>
          {draft.recurring ? <><div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 9 }}><label style={field}>Every<input type="number" min={1} value={draft.recurrenceInterval || 1} onChange={(e) => setDraft({ ...draft, recurrenceInterval: Math.max(1, Number(e.target.value || 1)) })} style={input}/></label><label style={field}>Unit<select value={draft.recurrenceUnit || "Weeks"} onChange={(e) => setDraft({ ...draft, recurrenceUnit: e.target.value as Chore["recurrenceUnit"] })} style={input}><option>Days</option><option>Weeks</option><option>Months</option></select></label></div>
          <label style={field}>Weekdays<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{WEEKDAYS.map((day) => { const active = (draft.recurrenceDays || []).includes(day.value); return <button key={day.value} type="button" onClick={() => setDraft({ ...draft, recurrenceDays: active ? (draft.recurrenceDays || []).filter((value) => value !== day.value) : [...(draft.recurrenceDays || []), day.value] })} style={{ ...button, minHeight: 34, padding: "5px 9px", background: active ? "#FFF4CC" : "#FFFFFF" }}>{day.label}</button>; })}</div></label></> : null}
          <label style={field}>Notes<textarea value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...input, minHeight: 90 }}/></label>
          <label style={field}>Checklist<div style={{ display: "grid", gap: 6 }}>{(draft.checklist || []).map((item, index) => <div key={item.id || index} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 7, alignItems: "center" }}><input type="checkbox" checked={Boolean(item.completed)} onChange={(e) => setDraft({ ...draft, checklist: (draft.checklist || []).map((entry, i) => i === index ? { ...entry, completed: e.target.checked } : entry) })}/><input value={item.text || ""} onChange={(e) => setDraft({ ...draft, checklist: (draft.checklist || []).map((entry, i) => i === index ? { ...entry, text: e.target.value } : entry) })} style={input}/><button type="button" onClick={() => setDraft({ ...draft, checklist: (draft.checklist || []).filter((_, i) => i !== index) })} style={button}>×</button></div>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, marginTop: 7 }}><input value={checkText} onChange={(e) => setCheckText(e.target.value)} style={input}/><button type="button" onClick={() => { if (!checkText.trim()) return; setDraft({ ...draft, checklist: [...(draft.checklist || []), { id: `check-${Date.now()}`, text: checkText.trim(), completed: false }] }); setCheckText(""); }} style={button}>Add Step</button></div></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button disabled={busy || !draft.title.trim()} type="button" onClick={() => void saveChore(draft)} style={primary}>Save Chore</button>{draft.id ? <button disabled={busy} type="button" onClick={() => void completeChore(draft)} style={button}>✓ Complete</button> : null}{draft.id ? <button disabled={busy} type="button" onClick={() => void deleteChore(draft)} style={{ ...button, color: "#B42318" }}>Delete</button> : null}</div>
        </div>
      </section>
    </div>;
  }

  function EventEditor({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
    const [draft, setDraft] = useState<CalendarItem>({ ...item });
    return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(7,27,47,.48)", display: "grid", placeItems: "center", padding: 12 }} onMouseDown={(event) => event.currentTarget === event.target && onClose()}><section style={{ ...panel, width: "min(620px,100%)" }} onMouseDown={(event) => event.stopPropagation()}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><strong style={{ fontSize: 20 }}>{draft.id ? "Edit Event" : "New Event"}</strong><button type="button" onClick={onClose} style={button}>×</button></div><div style={{ display: "grid", gap: 9, marginTop: 12 }}><label style={field}>Event<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={input}/></label><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}><label style={field}>Date<input type="date" value={dateKey(draft.date)} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={input}/></label><label style={field}>Person<select value={draft.area || "Family"} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={input}>{PEOPLE.map((name) => <option key={name}>{name}</option>)}</select></label><label style={field}>Category<select value={draft.categoryLabel || "Family"} onChange={(e) => setDraft({ ...draft, categoryLabel: e.target.value })} style={input}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}><label style={field}>Time<input type="time" value={draft.time || ""} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={input}/></label><label style={field}>End<input type="time" value={draft.endTime || ""} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} style={input}/></label></div><label style={field}>Notes<textarea value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...input, minHeight: 80 }}/></label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button disabled={busy || !draft.title.trim()} type="button" onClick={() => void saveEvent(draft)} style={primary}>Save Event</button>{draft.id ? <button disabled={busy} type="button" onClick={() => void deleteEvent(draft)} style={{ ...button, color: "#B42318" }}>Delete</button> : null}</div></div></section></div>;
  }

  return <main style={{ minHeight: "100vh", background: "linear-gradient(180deg,#F4F7FB,#FFFFFF)", padding: "14px 14px 40px", fontFamily: "Arial,sans-serif", color: "#172331" }}><div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 14 }}>
    <header style={{ background: "#071B2F", color: "#FFFFFF", borderRadius: 22, padding: 18, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><div style={{ color: "#E5C06B", fontSize: 11, fontWeight: 900, letterSpacing: ".14em" }}>4725 FAMILY</div><h1 style={{ margin: "4px 0 0", fontSize: 28 }}>{person}'s Atlas</h1><div style={{ marginTop: 4, fontSize: 12, opacity: .8 }}>{role === "manager" ? "Family manager" : "Private family board"}</div></div>{message ? <strong style={{ fontSize: 13 }}>{message}</strong> : null}</header>
    <nav style={{ ...panel, display: "flex", gap: 7, overflowX: "auto", padding: 9 }}>{(["today", "calendar", "chores"] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} style={{ ...button, flex: "0 0 auto", background: tab === value ? "#FFF4CC" : "#FFFFFF", borderColor: tab === value ? "#E5C06B" : "#DDE7F0" }}>{value === "today" ? "Today" : value === "calendar" ? "Calendar" : "Chores"}</button>)}{role === "manager" ? <><button type="button" onClick={() => { setChoreDraft({ id: "", recordType: "chore", title: "", assignedTo: "Family", emoji: "⭐", points: 5, date: todayISO(), status: "Open", recurring: false, recurrenceInterval: 1, recurrenceUnit: "Weeks", recurrenceDays: [], notes: "", checklist: [] }); setNewChoreOpen(true); }} style={{ ...primary, flex: "0 0 auto", marginLeft: "auto" }}>+ Chore</button><button type="button" onClick={() => { setEventDraft({ id: "", date: selectedDate || todayISO(), title: "", area: "Family", categoryLabel: "Family", time: "", endTime: "", notes: "" }); setNewEventOpen(true); }} style={{ ...button, flex: "0 0 auto" }}>+ Event</button></> : null}</nav>

    {goal ? <section style={panel}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ fontSize: 38 }}>{goal.goalEmoji || "🎁"}</span><div style={{ flex: 1 }}><strong style={{ fontSize: 18 }}>Saving for {goal.title}</strong><div style={{ fontSize: 13, color: "#64748B" }}>{current} / {target} points · {goalPct}%</div><div style={{ height: 13, background: "#EEF2F6", borderRadius: 999, overflow: "hidden", marginTop: 8 }}><div style={{ height: "100%", width: `${goalPct}%`, background: goal.goalColor || PERSON_COLORS[person] }}/></div></div></div></section> : null}

    {tab === "today" ? <><section style={panel}><strong style={{ fontSize: 20 }}>Today's Chores</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, marginTop: 12 }}>{dueChores.map((chore) => <article key={chore.id} style={{ border: `3px solid ${PERSON_COLORS[chorePerson(chore)] || "#DDE7F0"}`, borderRadius: 18, padding: 12, textAlign: "center", background: "#FFFFFF", boxShadow: "0 4px 14px rgba(7,27,47,.08)" }}><button type="button" onClick={() => role === "manager" && setEditingChore(chore)} style={{ border: 0, background: "transparent", cursor: role === "manager" ? "pointer" : "default", width: "100%" }}><div style={{ fontSize: 48 }}>{chore.emoji || "⭐"}</div><strong style={{ display: "block", fontSize: 15 }}>{chore.title}</strong><div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{chorePerson(chore)} · {Number(chore.points || 0)} pts</div></button><button disabled={busy} onClick={() => void completeChore(chore)} style={{ ...primary, width: "100%", marginTop: 10 }}>✓ Done</button></article>)}{!dueChores.length ? <span style={{ color: "#64748B", fontSize: 13 }}>Nothing due today.</span> : null}</div></section><section style={panel}><strong style={{ fontSize: 20 }}>Today</strong><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{todayItems.map((item) => <button key={item.id} type="button" onClick={() => role === "manager" && setEditingEvent(item)} style={{ ...button, textAlign: "left" }}><strong>{item.title}</strong><div style={{ fontSize: 11, color: "#64748B" }}>{item.time || "All day"} · {item.area || "Family"} · {item.categoryLabel || item.eventType || "Event"}</div></button>)}{!todayItems.length ? <span style={{ color: "#64748B", fontSize: 13 }}>Nothing else scheduled today.</span> : null}</div></section></> : null}

    {tab === "chores" ? <section style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong style={{ fontSize: 20 }}>Chores</strong><span style={{ fontSize: 12, color: "#64748B" }}>{role === "manager" ? "Tap a chore to edit" : "Your chores and Family chores"}</span></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, marginTop: 12 }}>{visibleChores.map((chore) => <article key={chore.id} style={{ border: `3px solid ${PERSON_COLORS[chorePerson(chore)] || "#DDE7F0"}`, borderRadius: 18, padding: 12, textAlign: "center", opacity: chore.status === "Completed" || chore.status === "Cancelled" ? .65 : 1 }}><button type="button" onClick={() => role === "manager" && setEditingChore(chore)} style={{ border: 0, background: "transparent", cursor: role === "manager" ? "pointer" : "default", width: "100%" }}><div style={{ fontSize: 44 }}>{chore.emoji || "⭐"}</div><strong style={{ display: "block" }}>{chore.title}</strong><div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{chorePerson(chore)} · {Number(chore.points || 0)} pts</div><div style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>{dateKey(chore.date) || "Anytime"} · {recurrenceText(chore)}</div></button>{chore.status !== "Completed" && chore.status !== "Cancelled" ? <button disabled={busy} onClick={() => void completeChore(chore)} style={{ ...primary, width: "100%", marginTop: 10 }}>✓ Done</button> : null}</article>)}</div></section> : null}

    {tab === "calendar" ? <section style={panel}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={button}>‹</button><strong style={{ fontSize: 20 }}>{view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={button}>›</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 12 }}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div key={day} style={{ textAlign: "center", fontSize: 11, fontWeight: 900, color: "#64748B", padding: 4 }}>{day}</div>)}{cells.map((date) => { const key = dateKey(date); const inMonth = date.getMonth() === view.getMonth(); const items = calendar.filter((item) => item.date === key); return <button key={key} onClick={() => setSelectedDate(key)} style={{ minHeight: 92, border: selectedDate === key ? "2px solid #E5C06B" : "1px solid #DDE7F0", borderRadius: 10, background: inMonth ? "#FFFFFF" : "#F8FAFC", padding: 6, textAlign: "left", overflow: "hidden" }}><strong style={{ fontSize: 12, color: inMonth ? "#172331" : "#98A2B3" }}>{date.getDate()}</strong>{items.slice(0, 3).map((item) => <div key={item.id} style={{ marginTop: 4, borderRadius: 6, padding: "3px 4px", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: item.categoryLabel === "Chore" ? "#FFF4CC" : item.categoryLabel === "Meal" ? "#E9F8EF" : "#EAF2FF" }}>{item.title}</div>)}</button>; })}</div><div style={{ marginTop: 12, display: "grid", gap: 7 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</strong>{role === "manager" ? <button type="button" onClick={() => { setEventDraft({ id: "", date: selectedDate, title: "", area: "Family", categoryLabel: "Family", time: "", endTime: "", notes: "" }); setNewEventOpen(true); }} style={button}>+ Event</button> : null}</div>{selectedItems.map((item) => <button key={item.id} type="button" onClick={() => role === "manager" && setEditingEvent(item)} style={{ ...button, textAlign: "left" }}><strong>{item.title}</strong><div style={{ fontSize: 12, color: "#64748B" }}>{item.time || "All day"} · {item.area || "Family"} · {item.categoryLabel || item.eventType || "Event"}</div>{item.notes ? <div style={{ fontSize: 12, marginTop: 4 }}>{item.notes}</div> : null}</button>)}{!selectedItems.length ? <span style={{ fontSize: 12, color: "#64748B" }}>Nothing scheduled.</span> : null}</div></section> : null}

    {editingChore ? <ChoreEditor chore={editingChore} onClose={() => setEditingChore(null)}/> : null}
    {newChoreOpen ? <ChoreEditor chore={choreDraft} onClose={() => setNewChoreOpen(false)}/> : null}
    {editingEvent ? <EventEditor item={editingEvent} onClose={() => setEditingEvent(null)}/> : null}
    {newEventOpen ? <EventEditor item={eventDraft} onClose={() => setNewEventOpen(false)}/> : null}
  </div></main>;
}
