"use client";

import React, { useEffect, useMemo, useState } from "react";

type HomeRecordType = "recipe" | "chore" | "event" | "asset" | "location";

type HomeRecord = {
  id: string;
  propertyId: "4725";
  recordType: HomeRecordType;
  title: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  notes?: string;
  date?: string;
  time?: string;
  person?: string;
  eventType?: "Appointment" | "Bill" | "Activity" | "Meal" | "Reminder";
  amount?: string;
  recurring?: "None" | "Daily" | "Weekly" | "Monthly";
  completed?: boolean;
  ingredients?: string;
  instructions?: string;
  favorite?: boolean;
  make?: string;
  model?: string;
  serial?: string;
  location?: string;
};

type Tab = "home" | "calendar" | "cookbook" | "chores" | "assets" | "locations";

type Props = {
  isMobile: boolean;
  colors: {
    navy: string;
    navy2: string;
    navy3: string;
    gold: string;
    bg: string;
    card: string;
    panel: string;
    line: string;
    text: string;
    muted: string;
    red: string;
    green: string;
  };
};

const familyMembers = ["Family", "Nick", "Chelsea", "Cooper", "Leni"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AtlasHomeWorkspace({ isMobile, colors }: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const [records, setRecords] = useState<HomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<HomeRecord | null>(null);
  const [search, setSearch] = useState("");

  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("Dinner");
  const [recipeIngredients, setRecipeIngredients] = useState("");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeNotes, setRecipeNotes] = useState("");

  const [choreTitle, setChoreTitle] = useState("");
  const [chorePerson, setChorePerson] = useState("Family");
  const [choreDate, setChoreDate] = useState(todayISO());
  const [choreRecurring, setChoreRecurring] = useState<HomeRecord["recurring"]>("Weekly");

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState<HomeRecord["eventType"]>("Appointment");
  const [eventDate, setEventDate] = useState(todayISO());
  const [eventTime, setEventTime] = useState("");
  const [eventPerson, setEventPerson] = useState("Family");
  const [eventAmount, setEventAmount] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  const [assetTitle, setAssetTitle] = useState("");
  const [assetCategory, setAssetCategory] = useState("Appliance");
  const [assetMake, setAssetMake] = useState("");
  const [assetModel, setAssetModel] = useState("");
  const [assetSerial, setAssetSerial] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [assetNotes, setAssetNotes] = useState("");

  const [locationTitle, setLocationTitle] = useState("");
  const [locationCategory, setLocationCategory] = useState("Room");
  const [locationNotes, setLocationNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/atlas-home?propertyId=4725", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Could not load 4725.");
        if (!cancelled) setRecords(Array.isArray(payload?.records) ? payload.records : []);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load 4725.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function saveRecord(record: HomeRecord) {
    setMessage("Saving…");
    const response = await fetch("/api/atlas-home", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(record),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload?.error || "Could not save.");
      return false;
    }
    setRecords((current) => {
      const next = current.some((item) => item.id === record.id)
        ? current.map((item) => item.id === record.id ? record : item)
        : [record, ...current];
      return next;
    });
    setMessage("Saved");
    window.setTimeout(() => setMessage(""), 1400);
    return true;
  }

  async function deleteRecord(record: HomeRecord) {
    if (!window.confirm(`Delete ${record.title}?`)) return;
    const response = await fetch(`/api/atlas-home?propertyId=4725&id=${encodeURIComponent(record.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload?.error || "Delete failed.");
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setEditing(null);
  }

  const recipes = useMemo(() => records.filter((item) => item.recordType === "recipe"), [records]);
  const chores = useMemo(() => records.filter((item) => item.recordType === "chore"), [records]);
  const events = useMemo(() => records.filter((item) => item.recordType === "event").sort((a, b) => `${a.date || ""}${a.time || ""}`.localeCompare(`${b.date || ""}${b.time || ""}`)), [records]);
  const assets = useMemo(() => records.filter((item) => item.recordType === "asset"), [records]);
  const locations = useMemo(() => records.filter((item) => item.recordType === "location"), [records]);
  const today = todayISO();
  const todayEvents = events.filter((item) => item.date === today);
  const dueChores = chores.filter((item) => !item.completed && (!item.date || item.date <= today));
  const upcomingBills = events.filter((item) => item.eventType === "Bill" && (item.date || "") >= today).slice(0, 5);
  const dinner = events.find((item) => item.eventType === "Meal" && item.date === today);

  const inputStyle: React.CSSProperties = {
    width: "100%", minHeight: 40, borderRadius: 10, border: `1px solid ${colors.line}`,
    padding: "8px 10px", background: "#FFFFFF", color: colors.text, font: "inherit", boxSizing: "border-box",
  };
  const buttonStyle: React.CSSProperties = {
    minHeight: 38, borderRadius: 10, border: `1px solid ${colors.line}`, background: "#FFFFFF",
    color: colors.navy, fontWeight: 800, padding: "7px 11px", cursor: "pointer",
  };
  const primaryButtonStyle: React.CSSProperties = { ...buttonStyle, background: colors.gold, borderColor: colors.gold, color: colors.navy };
  const cardStyle: React.CSSProperties = { background: "#FFFFFF", border: `1px solid ${colors.line}`, borderRadius: 14, padding: 14 };
  const fieldStyle: React.CSSProperties = { display: "grid", gap: 5, fontSize: 12, fontWeight: 800, color: colors.navy };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 10 };

  function baseRecord(recordType: HomeRecordType, title: string): HomeRecord {
    const now = new Date().toISOString();
    return { id: uid(recordType), propertyId: "4725", recordType, title: title.trim(), createdAt: now, updatedAt: now };
  }

  async function addRecipe() {
    if (!recipeTitle.trim()) return;
    const record = { ...baseRecord("recipe", recipeTitle), category: recipeCategory, ingredients: recipeIngredients, instructions: recipeInstructions, notes: recipeNotes };
    if (await saveRecord(record)) {
      setRecipeTitle(""); setRecipeIngredients(""); setRecipeInstructions(""); setRecipeNotes("");
    }
  }

  async function addChore() {
    if (!choreTitle.trim()) return;
    const record = { ...baseRecord("chore", choreTitle), person: chorePerson, date: choreDate, recurring: choreRecurring, completed: false };
    if (await saveRecord(record)) setChoreTitle("");
  }

  async function addEvent() {
    if (!eventTitle.trim() || !eventDate) return;
    const record = { ...baseRecord("event", eventTitle), eventType, date: eventDate, time: eventTime, person: eventPerson, amount: eventType === "Bill" ? eventAmount : "", notes: eventNotes };
    if (await saveRecord(record)) { setEventTitle(""); setEventTime(""); setEventAmount(""); setEventNotes(""); }
  }

  async function addAsset() {
    if (!assetTitle.trim()) return;
    const record = { ...baseRecord("asset", assetTitle), category: assetCategory, make: assetMake, model: assetModel, serial: assetSerial, location: assetLocation, notes: assetNotes };
    if (await saveRecord(record)) { setAssetTitle(""); setAssetMake(""); setAssetModel(""); setAssetSerial(""); setAssetLocation(""); setAssetNotes(""); }
  }

  async function addLocation() {
    if (!locationTitle.trim()) return;
    const record = { ...baseRecord("location", locationTitle), category: locationCategory, notes: locationNotes };
    if (await saveRecord(record)) { setLocationTitle(""); setLocationNotes(""); }
  }

  async function toggleChore(record: HomeRecord) {
    await saveRecord({ ...record, completed: !record.completed, updatedAt: new Date().toISOString() });
  }

  async function toggleFavorite(record: HomeRecord) {
    await saveRecord({ ...record, favorite: !record.favorite, updatedAt: new Date().toISOString() });
  }

  const filteredRecipes = recipes.filter((item) => `${item.title} ${item.category || ""} ${item.ingredients || ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 1480, margin: "0 auto", paddingBottom: 24 }}>
      <section style={{ ...cardStyle, background: colors.navy, color: "#FFFFFF", padding: isMobile ? 12 : 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#E5C06B" }}>4725</div>
            <h2 style={{ margin: "3px 0 0", fontSize: isMobile ? 22 : 27 }}>Home</h2>
          </div>
          {message ? <span style={{ fontSize: 12, fontWeight: 800 }}>{message}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 12, paddingBottom: 2 }}>
          {(["home", "calendar", "cookbook", "chores", "assets", "locations"] as Tab[]).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} style={{ ...buttonStyle, flex: "0 0 auto", background: tab === item ? colors.gold : "rgba(255,255,255,.10)", color: tab === item ? colors.navy : "#FFFFFF", borderColor: tab === item ? colors.gold : "rgba(255,255,255,.22)" }}>
              {item === "home" ? "Today" : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {loading ? <section style={cardStyle}>Loading 4725…</section> : null}

      {!loading && tab === "home" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {[{ label: "Today", value: todayEvents.length }, { label: "Chores Due", value: dueChores.length }, { label: "Recipes", value: recipes.length }, { label: "Home Assets", value: assets.length }].map((item) => (
              <div key={item.label} style={cardStyle}><span style={{ fontSize: 11, color: colors.muted, fontWeight: 800 }}>{item.label}</span><strong style={{ display: "block", color: colors.navy, fontSize: 27, marginTop: 2 }}>{item.value}</strong></div>
            ))}
          </div>
          <div style={grid2}>
            <section style={cardStyle}>
              <strong style={{ color: colors.navy }}>Today</strong>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {todayEvents.map((item) => <div key={item.id} style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 8 }}><strong>{item.title}</strong><div style={{ fontSize: 12, color: colors.muted }}>{item.time || "All day"} · {item.eventType} · {item.person}</div></div>)}
                {!todayEvents.length ? <span style={{ color: colors.muted, fontSize: 13 }}>Nothing scheduled today.</span> : null}
              </div>
            </section>
            <section style={cardStyle}>
              <strong style={{ color: colors.navy }}>Dinner</strong>
              <div style={{ marginTop: 10, color: dinner ? colors.text : colors.muted }}>{dinner ? dinner.title : "No meal planned yet."}</div>
              <button type="button" onClick={() => { setEventType("Meal"); setEventDate(today); setTab("calendar"); }} style={{ ...buttonStyle, marginTop: 12 }}>Plan Dinner</button>
            </section>
            <section style={cardStyle}>
              <strong style={{ color: colors.navy }}>Chores Due</strong>
              <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
                {dueChores.slice(0, 5).map((item) => <label key={item.id} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={Boolean(item.completed)} onChange={() => void toggleChore(item)} /><span>{item.title} <small style={{ color: colors.muted }}>· {item.person}</small></span></label>)}
                {!dueChores.length ? <span style={{ color: colors.muted, fontSize: 13 }}>No chores due.</span> : null}
              </div>
            </section>
            <section style={cardStyle}>
              <strong style={{ color: colors.navy }}>Upcoming Bills</strong>
              <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
                {upcomingBills.map((item) => <div key={item.id}><strong>{item.title}</strong><div style={{ fontSize: 12, color: colors.muted }}>{formatDate(item.date)}{item.amount ? ` · $${item.amount}` : ""}</div></div>)}
                {!upcomingBills.length ? <span style={{ color: colors.muted, fontSize: 13 }}>No bills entered.</span> : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {!loading && tab === "calendar" ? (
        <div style={grid2}>
          <section style={cardStyle}>
            <strong style={{ color: colors.navy, fontSize: 18 }}>Add to Family Calendar</strong>
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              <label style={fieldStyle}>Title<input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={inputStyle} /></label>
              <div style={grid2}>
                <label style={fieldStyle}>Type<select value={eventType} onChange={(e) => setEventType(e.target.value as HomeRecord["eventType"])} style={inputStyle}>{["Appointment","Bill","Activity","Meal","Reminder"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label style={fieldStyle}>Person<select value={eventPerson} onChange={(e) => setEventPerson(e.target.value)} style={inputStyle}>{familyMembers.map((v) => <option key={v}>{v}</option>)}</select></label>
              </div>
              <div style={grid2}>
                <label style={fieldStyle}>Date<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={inputStyle} /></label>
                <label style={fieldStyle}>Time<input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} style={inputStyle} /></label>
              </div>
              {eventType === "Bill" ? <label style={fieldStyle}>Amount<input inputMode="decimal" value={eventAmount} onChange={(e) => setEventAmount(e.target.value)} style={inputStyle} /></label> : null}
              <label style={fieldStyle}>Notes<textarea value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></label>
              <button type="button" onClick={() => void addEvent()} style={primaryButtonStyle}>Add to Calendar</button>
            </div>
          </section>
          <section style={cardStyle}>
            <strong style={{ color: colors.navy, fontSize: 18 }}>Family Schedule</strong>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {events.map((item) => <div key={item.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><div><strong>{item.title}</strong><div style={{ fontSize: 12, color: colors.muted }}>{formatDate(item.date)}{item.time ? ` · ${item.time}` : ""} · {item.eventType} · {item.person}{item.amount ? ` · $${item.amount}` : ""}</div>{item.notes ? <div style={{ fontSize: 12, marginTop: 4 }}>{item.notes}</div> : null}</div><button type="button" onClick={() => void deleteRecord(item)} style={{ ...buttonStyle, color: colors.red }}>Delete</button></div>)}
              {!events.length ? <span style={{ color: colors.muted }}>No family calendar entries yet.</span> : null}
            </div>
          </section>
        </div>
      ) : null}

      {!loading && tab === "cookbook" ? (
        <div style={grid2}>
          <section style={cardStyle}>
            <strong style={{ color: colors.navy, fontSize: 18 }}>Add Recipe</strong>
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              <label style={fieldStyle}>Recipe<input value={recipeTitle} onChange={(e) => setRecipeTitle(e.target.value)} style={inputStyle} /></label>
              <label style={fieldStyle}>Category<select value={recipeCategory} onChange={(e) => setRecipeCategory(e.target.value)} style={inputStyle}>{["Dinner","Meat","Pasta","Seahawks Sunday","Sides & Fries","Dessert","Cookies","Breakfast","Other"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label style={fieldStyle}>Ingredients<textarea value={recipeIngredients} onChange={(e) => setRecipeIngredients(e.target.value)} placeholder="One ingredient per line" style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} /></label>
              <label style={fieldStyle}>Instructions<textarea value={recipeInstructions} onChange={(e) => setRecipeInstructions(e.target.value)} style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} /></label>
              <label style={fieldStyle}>Notes<textarea value={recipeNotes} onChange={(e) => setRecipeNotes(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} /></label>
              <button type="button" onClick={() => void addRecipe()} style={primaryButtonStyle}>Save Recipe</button>
            </div>
          </section>
          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: colors.navy, fontSize: 18 }}>Cookbook</strong><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipes" style={{ ...inputStyle, width: isMobile ? "100%" : 220 }} /></div>
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              {filteredRecipes.map((item) => <article key={item.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 12, padding: 11 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><strong style={{ color: colors.navy }}>{item.title}</strong><div style={{ color: colors.muted, fontSize: 12 }}>{item.category || "Recipe"}</div></div><div style={{ display: "flex", gap: 6 }}><button type="button" onClick={() => void toggleFavorite(item)} style={buttonStyle}>{item.favorite ? "Favorite" : "Save Favorite"}</button><button type="button" onClick={() => void deleteRecord(item)} style={{ ...buttonStyle, color: colors.red }}>Delete</button></div></div>{item.ingredients ? <div style={{ whiteSpace: "pre-wrap", marginTop: 9, fontSize: 13 }}><strong>Ingredients</strong>{"\n"}{item.ingredients}</div> : null}{item.instructions ? <div style={{ whiteSpace: "pre-wrap", marginTop: 9, fontSize: 13 }}><strong>Instructions</strong>{"\n"}{item.instructions}</div> : null}{item.notes ? <div style={{ marginTop: 9, fontSize: 12, color: colors.muted }}>{item.notes}</div> : null}<button type="button" onClick={() => { setEventTitle(item.title); setEventType("Meal"); setEventDate(today); setTab("calendar"); }} style={{ ...buttonStyle, marginTop: 10 }}>Plan This Meal</button></article>)}
              {!filteredRecipes.length ? <span style={{ color: colors.muted }}>No recipes yet.</span> : null}
            </div>
          </section>
        </div>
      ) : null}

      {!loading && tab === "chores" ? (
        <div style={grid2}>
          <section style={cardStyle}>
            <strong style={{ color: colors.navy, fontSize: 18 }}>Add Chore</strong>
            <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
              <label style={fieldStyle}>Chore<input value={choreTitle} onChange={(e) => setChoreTitle(e.target.value)} style={inputStyle} /></label>
              <div style={grid2}><label style={fieldStyle}>Assigned to<select value={chorePerson} onChange={(e) => setChorePerson(e.target.value)} style={inputStyle}>{familyMembers.map((v) => <option key={v}>{v}</option>)}</select></label><label style={fieldStyle}>Repeat<select value={choreRecurring} onChange={(e) => setChoreRecurring(e.target.value as HomeRecord["recurring"])} style={inputStyle}>{["None","Daily","Weekly","Monthly"].map((v) => <option key={v}>{v}</option>)}</select></label></div>
              <label style={fieldStyle}>Due<input type="date" value={choreDate} onChange={(e) => setChoreDate(e.target.value)} style={inputStyle} /></label>
              <button type="button" onClick={() => void addChore()} style={primaryButtonStyle}>Add Chore</button>
            </div>
          </section>
          <section style={cardStyle}>
            <strong style={{ color: colors.navy, fontSize: 18 }}>Family Chore Chart</strong>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{chores.map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 9, alignItems: "center", border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10 }}><input type="checkbox" checked={Boolean(item.completed)} onChange={() => void toggleChore(item)} /><div><strong style={{ textDecoration: item.completed ? "line-through" : "none" }}>{item.title}</strong><div style={{ color: colors.muted, fontSize: 12 }}>{item.person} · {item.recurring} · {formatDate(item.date)}</div></div><button type="button" onClick={() => void deleteRecord(item)} style={{ ...buttonStyle, color: colors.red }}>Delete</button></div>)}{!chores.length ? <span style={{ color: colors.muted }}>No chores yet.</span> : null}</div>
          </section>
        </div>
      ) : null}

      {!loading && tab === "assets" ? (
        <div style={grid2}>
          <section style={cardStyle}><strong style={{ color: colors.navy, fontSize: 18 }}>Add Home Asset</strong><div style={{ display: "grid", gap: 9, marginTop: 12 }}><label style={fieldStyle}>Name<input value={assetTitle} onChange={(e) => setAssetTitle(e.target.value)} style={inputStyle} /></label><div style={grid2}><label style={fieldStyle}>Category<input value={assetCategory} onChange={(e) => setAssetCategory(e.target.value)} style={inputStyle} /></label><label style={fieldStyle}>Location<input value={assetLocation} onChange={(e) => setAssetLocation(e.target.value)} style={inputStyle} /></label></div><div style={grid2}><label style={fieldStyle}>Make<input value={assetMake} onChange={(e) => setAssetMake(e.target.value)} style={inputStyle} /></label><label style={fieldStyle}>Model<input value={assetModel} onChange={(e) => setAssetModel(e.target.value)} style={inputStyle} /></label></div><label style={fieldStyle}>Serial<input value={assetSerial} onChange={(e) => setAssetSerial(e.target.value)} style={inputStyle} /></label><label style={fieldStyle}>Notes<textarea value={assetNotes} onChange={(e) => setAssetNotes(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} /></label><button type="button" onClick={() => void addAsset()} style={primaryButtonStyle}>Save Asset</button></div></section>
          <section style={cardStyle}><strong style={{ color: colors.navy, fontSize: 18 }}>Home Assets</strong><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{assets.map((item) => <div key={item.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><div><strong>{item.title}</strong><div style={{ color: colors.muted, fontSize: 12 }}>{[item.category,item.make,item.model,item.location].filter(Boolean).join(" · ")}</div>{item.serial ? <div style={{ fontSize: 12 }}>Serial: {item.serial}</div> : null}{item.notes ? <div style={{ fontSize: 12, marginTop: 4 }}>{item.notes}</div> : null}</div><button type="button" onClick={() => void deleteRecord(item)} style={{ ...buttonStyle, color: colors.red }}>Delete</button></div>)}{!assets.length ? <span style={{ color: colors.muted }}>No home assets yet.</span> : null}</div></section>
        </div>
      ) : null}

      {!loading && tab === "locations" ? (
        <div style={grid2}>
          <section style={cardStyle}><strong style={{ color: colors.navy, fontSize: 18 }}>Add Location</strong><div style={{ display: "grid", gap: 9, marginTop: 12 }}><label style={fieldStyle}>Location<input value={locationTitle} onChange={(e) => setLocationTitle(e.target.value)} style={inputStyle} /></label><label style={fieldStyle}>Type<select value={locationCategory} onChange={(e) => setLocationCategory(e.target.value)} style={inputStyle}>{["Room","Garage","Outdoor","Storage","Utility","Other"].map((v) => <option key={v}>{v}</option>)}</select></label><label style={fieldStyle}>Notes<textarea value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} /></label><button type="button" onClick={() => void addLocation()} style={primaryButtonStyle}>Save Location</button></div></section>
          <section style={cardStyle}><strong style={{ color: colors.navy, fontSize: 18 }}>Locations</strong><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{locations.map((item) => <div key={item.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><div><strong>{item.title}</strong><div style={{ color: colors.muted, fontSize: 12 }}>{item.category}</div>{item.notes ? <div style={{ fontSize: 12, marginTop: 4 }}>{item.notes}</div> : null}</div><button type="button" onClick={() => void deleteRecord(item)} style={{ ...buttonStyle, color: colors.red }}>Delete</button></div>)}{!locations.length ? <span style={{ color: colors.muted }}>No locations yet.</span> : null}</div></section>
        </div>
      ) : null}
    </div>
  );
}
