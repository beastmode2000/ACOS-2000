"use client";

import React, { useEffect, useMemo, useState } from "react";

type HomeRecordType = "recipe" | "chore" | "goal" | "setting";
type Recurrence = "None" | "Daily" | "Weekly" | "Monthly";
type ChorePhoto = { id: string; name: string; dataUrl: string; createdAt: string };
type Completion = { id: string; completedAt: string; points: number; note?: string };

type HomeRecord = {
  id: string;
  propertyId: "4725";
  recordType: HomeRecordType;
  title: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  notes?: string;
  code?: string;
  meta?: string;
  fullRecipe?: string;
  ingredients?: string;
  instructions?: string;
  favorite?: boolean;
  person?: string;
  emoji?: string;
  points?: number;
  date?: string;
  recurring?: Recurrence;
  completed?: boolean;
  completionHistory?: Completion[];
  photos?: ChorePhoto[];
  goalAmount?: number;
  currentAmount?: number;
  goalEmoji?: string;
  goalColor?: string;
};

type Tab = "home" | "cookbook" | "chores" | "rewards";

type Props = {
  isMobile: boolean;
  colors: {
    navy: string; navy2: string; navy3: string; gold: string; bg: string;
    card: string; panel: string; line: string; text: string; muted: string;
    red: string; green: string;
  };
  choreRecords?: any[];
  onCreateChore?: (initial: Record<string, unknown>) => Promise<any> | any;
  onOpenChore?: (id: string) => void;
  onCompleteChore?: (record: any) => Promise<void> | void;
  initialTab?: Tab;
  hideHomeHeader?: boolean;
};

const people = ["Family", "Nick", "Chelsea", "Cooper", "Leni"];
const personColors: Record<string, string> = {
  Family: "#475467", Nick: "#175CD3", Chelsea: "#C11574", Cooper: "#7F56D9", Leni: "#039855",
};
const choreEmojiGroups = [
  {
    label: "Morning & Bathroom",
    items: ["🪥","😁","🦷","🚿","🛁","🧼","🧴","🧻","🚽","🪮","👕","👖","🧦","👟","🎒","⏰"],
  },
  {
    label: "School & Homework",
    items: ["📚","📖","📝","✏️","🖍️","📓","📒","📔","📕","🧠","💻","🎒","🏫","🚌","🧮","🔤","🎨"],
  },
  {
    label: "Bedroom & Cleaning",
    items: ["🛏️","🧸","🧹","🧺","🧽","🪣","🧼","🧴","🧻","🛋️","🪑","🧥","👚","👕","👖","🧦"],
  },
  {
    label: "Kitchen",
    items: ["🍽️","🥣","🥄","🍴","🥛","🧃","🍎","🥪","🍳","🧊","🧽","🧼","🗑️","♻️"],
  },
  {
    label: "Pets",
    items: ["🐶","🐕","🐈","🐾","🦴","🥣","💧","💩","🧻","🧹","🚶","❤️"],
  },
  {
    label: "Trash & Recycling",
    items: ["🗑️","♻️","📦","🧴","🥫","📰","🧻","🧹","🧤","🚮"],
  },
  {
    label: "Outside & Yard",
    items: ["🌿","🌱","🪴","💧","🌳","🍂","🧹","🪣","🧤","☀️","🌧️","🚲","🚗"],
  },
  {
    label: "Activities",
    items: ["⚽","🏀","🏈","⚾","🎾","🏊","🚲","🎹","🎸","🎨","🎮","🧩","📱","💻"],
  },
  {
    label: "Rewards & Motivation",
    items: ["⭐","🌟","✨","✅","🏆","🎯","💪","👍","😊","😁","❤️","🎉","🎁","💰","💵"],
  },
];
const choreEmojis = choreEmojiGroups.flatMap((group) => group.items);
const goalEmojis = ["🎮","🧸","🚲","🎧","🎟️","⚽","🏀","🛍️","🎁","💰","⭐","🏆"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function nextDate(date: string, recurrence: Recurrence) {
  const d = new Date(`${date || todayISO()}T12:00:00`);
  if (recurrence === "Daily") d.setDate(d.getDate() + 1);
  if (recurrence === "Weekly") d.setDate(d.getDate() + 7);
  if (recurrence === "Monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
function navigate(screen: string) {
  if (typeof window === "undefined") return;
  window.history.pushState({ atlasScreen: screen }, "", `${window.location.pathname}${window.location.search}#${screen}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

export default function AtlasHomeWorkspace({
  isMobile,
  colors,
  choreRecords,
  onCreateChore,
  onOpenChore,
  onCompleteChore,
  initialTab = "home",
  hideHomeHeader = false,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [records, setRecords] = useState<HomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<HomeRecord | null>(null);
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("All");

  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("Dinner");
  const [recipeIngredients, setRecipeIngredients] = useState("");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeNotes, setRecipeNotes] = useState("");

  const [choreTitle, setChoreTitle] = useState("");
  const [chorePerson, setChorePerson] = useState("Cooper");
  const [choreDate, setChoreDate] = useState(todayISO());
  const [choreRecurring, setChoreRecurring] = useState<Recurrence>("Weekly");
  const [choreRecurrenceInterval, setChoreRecurrenceInterval] = useState(1);
  const [choreRecurrenceDays, setChoreRecurrenceDays] = useState<number[]>([]);
  const [choreEmoji, setChoreEmoji] = useState("⭐");
  const [chorePoints, setChorePoints] = useState(5);
  const [choreNotes, setChoreNotes] = useState("");

  const [goalPerson, setGoalPerson] = useState("Cooper");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState(50);
  const [goalEmoji, setGoalEmoji] = useState("🎁");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/atlas-home?propertyId=4725", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Could not load 4725.");
        if (!cancelled) setRecords(Array.isArray(payload?.records) ? payload.records : []);
      })
      .catch((error) => !cancelled && setMessage(error instanceof Error ? error.message : "Could not load 4725."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  async function saveRecord(record: HomeRecord) {
    const next = { ...record, propertyId: "4725" as const, updatedAt: new Date().toISOString() };
    setMessage("Saving…");
    const response = await fetch("/api/atlas-home", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(next),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(payload?.error || "Could not save."); return false; }
    const saved = payload.record || next;
    setRecords((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current]);
    setEditing(null);
    setMessage("Saved");
    window.setTimeout(() => setMessage(""), 1200);
    return true;
  }

  async function deleteRecord(record: HomeRecord) {
    if (!window.confirm(`Delete ${record.title}?`)) return;
    const response = await fetch(`/api/atlas-home?propertyId=4725&id=${encodeURIComponent(record.id)}`, {
      method: "DELETE", credentials: "include",
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
  const legacyChores = useMemo(() => records.filter((item) => item.recordType === "chore"), [records]);
  const chores = useMemo(
    () => (choreRecords !== undefined ? choreRecords : legacyChores),
    [choreRecords, legacyChores],
  );
  const goals = useMemo(() => records.filter((item) => item.recordType === "goal"), [records]);
  const today = todayISO();
  const visibleChores = chores.filter((item: any) => {
    const person = String(item?.person || item?.assignedTo || "Family");
    return personFilter === "All" || person === personFilter;
  });
  const dueChores = visibleChores.filter((item: any) => {
    const closed = item?.completed || item?.status === "Completed" || item?.status === "Cancelled";
    return !closed && (!item?.date || String(item.date).slice(0, 10) <= today);
  });
  const filteredRecipes = recipes
    .filter((item) => `${item.code || ""} ${item.title} ${item.category || ""} ${item.fullRecipe || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => String(a.code || a.title).localeCompare(String(b.code || b.title)));

  const inputStyle: React.CSSProperties = {
    width: "100%", minHeight: 42, borderRadius: 11, border: `1px solid ${colors.line}`,
    padding: "9px 10px", background: "#FFFFFF", color: colors.text, font: "inherit", boxSizing: "border-box",
  };
  const buttonStyle: React.CSSProperties = {
    minHeight: 40, borderRadius: 11, border: `1px solid ${colors.line}`, background: "#FFFFFF",
    color: colors.navy, fontWeight: 850, padding: "8px 11px", cursor: "pointer",
  };
  const primaryButtonStyle: React.CSSProperties = { ...buttonStyle, background: colors.gold, borderColor: colors.gold, color: colors.navy };
  const cardStyle: React.CSSProperties = { background: "#FFFFFF", border: `1px solid ${colors.line}`, borderRadius: 16, padding: isMobile ? 12 : 15 };
  const fieldStyle: React.CSSProperties = { display: "grid", gap: 5, fontSize: 12, fontWeight: 850, color: colors.navy };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 12 };

  function baseRecord(recordType: HomeRecordType, title: string): HomeRecord {
    const now = new Date().toISOString();
    return { id: uid(recordType), propertyId: "4725", recordType, title: title.trim(), createdAt: now, updatedAt: now };
  }
  async function addRecipe() {
    if (!recipeTitle.trim()) return;
    if (await saveRecord({
      ...baseRecord("recipe", recipeTitle), category: recipeCategory,
      ingredients: recipeIngredients, instructions: recipeInstructions, notes: recipeNotes,
    })) {
      setRecipeTitle(""); setRecipeIngredients(""); setRecipeInstructions(""); setRecipeNotes("");
    }
  }
  async function addChore() {
    if (!choreTitle.trim()) return;

    if (onCreateChore) {
      const rewardLine = chorePoints > 0 ? `Reward: ${chorePoints} points` : "";
      const notes = [choreNotes.trim(), rewardLine].filter(Boolean).join("\n");
      const created = await onCreateChore({
        title: choreTitle.trim(),
        date: choreDate,
        status: "Open",
        priority: "Medium",
        notes,
        assignedTo: chorePerson === "Family" ? "" : chorePerson,
        recurring: choreRecurring !== "None",
        recurrenceInterval: Math.max(1, choreRecurrenceInterval),
        recurrenceUnit:
          choreRecurring === "Daily"
            ? "Days"
            : choreRecurring === "Monthly"
              ? "Months"
              : "Weeks",
        recurrenceDays: choreRecurrenceDays,
        workType: "Work Order",
        workCategory: `${choreEmoji} Chore`,
        emoji: choreEmoji,
        responsibilityArea: "Family",
      });
      if (created) {
        setChoreTitle("");
        setChoreNotes("");
      }
      return;
    }

    if (await saveRecord({
      ...baseRecord("chore", choreTitle), person: chorePerson, date: choreDate,
      recurring: choreRecurring, completed: false, emoji: choreEmoji, points: chorePoints,
      notes: choreNotes, completionHistory: [], photos: [],
    })) {
      setChoreTitle(""); setChoreNotes("");
    }
  }
  async function addGoal() {
    if (!goalTitle.trim()) return;
    if (await saveRecord({
      ...baseRecord("goal", goalTitle), person: goalPerson, goalAmount, currentAmount: 0,
      goalEmoji, goalColor: personColors[goalPerson] || colors.gold,
    })) setGoalTitle("");
  }
  function choreRewardPoints(record: any) {
    const direct = Number(record?.points || 0);
    if (direct > 0) return direct;
    const match = String(record?.notes || "").match(/Reward:\s*(\d+)\s*points?/i);
    return match ? Number(match[1]) : 0;
  }
  function choreEmojiFor(record: any) {
    return String(record?.emoji || record?.workCategory || "").match(/^\S+/)?.[0] || "⭐";
  }
  function chorePersonFor(record: any) {
    return String(record?.person || record?.assignedTo || "Family");
  }

  async function completeChore(record: any) {
    const earned = choreRewardPoints(record);
    if (onCompleteChore) {
      await onCompleteChore(record);
      const goal = goals.find((item) => item.person === chorePersonFor(record));
      if (goal && earned) {
        await saveRecord({ ...goal, currentAmount: Number(goal.currentAmount || 0) + earned });
      }
      return;
    }
    const history = [
      { id: uid("done"), completedAt: new Date().toISOString(), points: earned },
      ...(record.completionHistory || []),
    ];
    const recurring: Recurrence =
      record.recurring === "Daily" || record.recurring === "Weekly" || record.recurring === "Monthly"
        ? record.recurring
        : "None";
    const updated: HomeRecord = {
      ...record,
      recurring,
      completed: recurring === "None",
      date: recurring === "None" ? record.date : nextDate(record.date || today, recurring),
      completionHistory: history,
    };
    await saveRecord(updated);
    const goal = goals.find((item) => item.person === record.person);
    if (goal && earned) await saveRecord({ ...goal, currentAmount: Number(goal.currentAmount || 0) + earned });
  }
  async function addPhoto(record: HomeRecord, file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Choose an image file."); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read photo."));
      reader.readAsDataURL(file);
    });
    await saveRecord({
      ...record,
      photos: [{ id: uid("photo"), name: file.name, dataUrl, createdAt: new Date().toISOString() }, ...(record.photos || [])],
    });
  }

  function openRecipe(recipe: HomeRecord) { setEditing({ ...recipe }); }
  function openChore(chore: any) {
    if (onOpenChore && chore?.id) {
      onOpenChore(String(chore.id));
      return;
    }
    setEditing({ ...chore });
  }

  const todayCards = [
    { label: "Family Calendar", value: "Open month view", action: () => navigate("calendar"), icon: "📅" },
    { label: "Chores Due", value: String(dueChores.length), action: () => setTab("chores"), icon: "⭐" },
    { label: "Cookbook", value: `${recipes.length} recipes`, action: () => setTab("cookbook"), icon: "🍝" },
    { label: "Home Assets", value: "Open assets", action: () => navigate("assets"), icon: "🏠" },
  ];

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 1500, margin: "0 auto", paddingBottom: isMobile ? 92 : 24 }}>
      {!hideHomeHeader ? <section style={{ ...cardStyle, background: colors.navy, color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#E5C06B", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>4725 FAMILY HOME</div>
            <h2 style={{ margin: "3px 0 0", fontSize: isMobile ? 23 : 29 }}>Home</h2>
          </div>
          {message ? <span style={{ fontSize: 12, fontWeight: 850 }}>{message}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 12 }}>
          {(["home","cookbook","chores","rewards"] as Tab[]).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} style={{
              ...buttonStyle, flex: "0 0 auto",
              background: tab === item ? colors.gold : "rgba(255,255,255,.10)",
              color: tab === item ? colors.navy : "#FFFFFF",
              borderColor: tab === item ? colors.gold : "rgba(255,255,255,.22)",
            }}>{item === "home" ? "Today" : item === "rewards" ? "Goals & Rewards" : item[0].toUpperCase()+item.slice(1)}</button>
          ))}
          <button type="button" onClick={() => navigate("calendar")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Calendar</button>
          <button type="button" onClick={() => navigate("assets")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Assets</button>
          <button type="button" onClick={() => navigate("locations")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Locations</button>
          <button type="button" onClick={() => navigate("assistant")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Ask Atlas</button>
        </div>
      </section> : null}

      {loading ? <section style={cardStyle}>Loading 4725…</section> : null}

      {!loading && tab === "home" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {todayCards.map((card) => (
              <button key={card.label} type="button" onClick={card.action} style={{ ...cardStyle, textAlign:"left", cursor:"pointer", minHeight: 105 }}>
                <span style={{ fontSize: 25 }}>{card.icon}</span>
                <strong style={{ display:"block", marginTop: 7, color: colors.navy }}>{card.label}</strong>
                <span style={{ color: colors.muted, fontSize: 12 }}>{card.value}</span>
              </button>
            ))}
          </div>
          <section style={cardStyle}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <strong style={{ color: colors.navy, fontSize: 18 }}>Today’s Chores</strong>
              <button type="button" onClick={() => setTab("chores")} style={buttonStyle}>Open Chore Board</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))", gap:9, marginTop:12 }}>
              {dueChores.slice(0,10).map((chore) => (
                <button key={chore.id} type="button" onClick={() => openChore(chore)} style={{
                  border:`2px solid ${personColors[chorePersonFor(chore)] || colors.line}`, borderRadius:16, padding:12,
                  background:"#FFFFFF", textAlign:"center", cursor:"pointer", color:colors.text,
                }}>
                  <span style={{ fontSize:34 }}>{choreEmojiFor(chore)}</span>
                  <strong style={{ display:"block", marginTop:6 }}>{chore.title}</strong>
                  <span style={{ display:"block", fontSize:11, color:personColors[chorePersonFor(chore)] }}>{chorePersonFor(chore)} · {choreRewardPoints(chore)} pts</span>
                </button>
              ))}
              {!dueChores.length ? <span style={{ color: colors.muted }}>Nothing due today.</span> : null}
            </div>
          </section>
        </>
      ) : null}

      {!loading && tab === "cookbook" ? (
        <div style={grid2}>
          <section style={cardStyle}>
            <strong style={{ color: colors.navy, fontSize: 18 }}>Add Recipe</strong>
            <div style={{ display:"grid", gap:9, marginTop:12 }}>
              <label style={fieldStyle}>Recipe<input value={recipeTitle} onChange={(e)=>setRecipeTitle(e.target.value)} style={inputStyle}/></label>
              <label style={fieldStyle}>Category<select value={recipeCategory} onChange={(e)=>setRecipeCategory(e.target.value)} style={inputStyle}>{["Dinner","Meat","Pasta","Seahawks Sunday","Sides & Fries","Dessert","Cookies","Breakfast","Family Favorite","Other"].map(v=><option key={v}>{v}</option>)}</select></label>
              <label style={fieldStyle}>Ingredients<textarea value={recipeIngredients} onChange={(e)=>setRecipeIngredients(e.target.value)} style={{...inputStyle,minHeight:110}}/></label>
              <label style={fieldStyle}>Directions<textarea value={recipeInstructions} onChange={(e)=>setRecipeInstructions(e.target.value)} style={{...inputStyle,minHeight:140}}/></label>
              <label style={fieldStyle}>Notes<textarea value={recipeNotes} onChange={(e)=>setRecipeNotes(e.target.value)} style={{...inputStyle,minHeight:70}}/></label>
              <button type="button" onClick={()=>void addRecipe()} style={primaryButtonStyle}>Save Recipe</button>
            </div>
          </section>
          <section style={cardStyle}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ color: colors.navy, fontSize:18 }}>Cookbook</strong>
                <a href="/4725/Nick_Meal_Picker_Cookbook(1).pdf" target="_blank" rel="noreferrer" style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  Original PDF Cards
                </a>
              </div>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search recipes" style={{...inputStyle,width:isMobile?"100%":240}}/>
            </div>
            <div style={{ display:"grid", gap:8, marginTop:12 }}>
              {filteredRecipes.map((recipe)=>(
                <button key={recipe.id} type="button" onClick={()=>openRecipe(recipe)} style={{
                  ...buttonStyle, textAlign:"left", display:"grid", gridTemplateColumns:"auto minmax(0,1fr) auto", alignItems:"center", gap:10, minHeight:58
                }}>
                  <strong style={{ color:colors.gold }}>{recipe.code || "NEW"}</strong>
                  <span><strong style={{ display:"block" }}>{recipe.title}</strong><small style={{ color:colors.muted }}>{recipe.category}{recipe.meta ? ` · ${recipe.meta}` : ""}</small></span>
                  <span>{recipe.favorite ? "★" : "›"}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {!loading && tab === "chores" ? (
        <div style={{ display:"grid", gap:12 }}>
          <section style={cardStyle}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <div><strong style={{ color:colors.navy,fontSize:20 }}>Family Chore Board</strong><div style={{ color:colors.muted,fontSize:12 }}>Tap any card to edit it. Completing a recurring chore moves it to its next date.</div></div>
              <select value={personFilter} onChange={(e)=>setPersonFilter(e.target.value)} style={{...inputStyle,width:isMobile?"100%":180}}><option>All</option>{people.map(p=><option key={p}>{p}</option>)}</select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(5,minmax(0,1fr))", gap:10, marginTop:14 }}>
              {visibleChores.map((chore)=>(
                <article key={chore.id} style={{
                  border:`3px solid ${personColors[chorePersonFor(chore)] || colors.line}`, borderRadius:18, background:"#FFFFFF",
                  padding:12, minHeight:170, display:"grid", alignContent:"space-between", boxShadow:"0 4px 14px rgba(7,27,47,.08)"
                }}>
                  <button type="button" onClick={()=>openChore(chore)} style={{border:0,background:"transparent",cursor:"pointer",textAlign:"center",color:colors.text}}>
                    <span style={{fontSize:46}}>{choreEmojiFor(chore)}</span>
                    <strong style={{display:"block",fontSize:15,marginTop:5}}>{chore.title}</strong>
                    <span style={{display:"block",fontSize:11,fontWeight:900,color:personColors[chorePersonFor(chore)]}}>{chorePersonFor(chore)}</span>
                    <span style={{display:"block",fontSize:11,color:colors.muted,marginTop:3}}>{choreRewardPoints(chore)} pts · {chore.recurring ? (chore.recurrenceUnit === "Days" ? "Daily" : chore.recurrenceUnit === "Months" ? "Monthly" : "Weekly") : "None"}{chore.date?` · ${chore.date}`:""}</span>
                  </button>
                  <button type="button" onClick={()=>void completeChore(chore)} style={{...primaryButtonStyle,marginTop:10}}>✓ Done</button>
                </article>
              ))}
            </div>
          </section>
          <section style={cardStyle}>
            <strong style={{ color:colors.navy,fontSize:18 }}>Add Chore</strong>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1.2fr .7fr .7fr .7fr", gap:9, marginTop:12 }}>
              <label style={fieldStyle}>Chore<input value={choreTitle} onChange={(e)=>setChoreTitle(e.target.value)} style={inputStyle}/></label>
              <label style={fieldStyle}>Person<select value={chorePerson} onChange={(e)=>setChorePerson(e.target.value)} style={inputStyle}>{people.map(p=><option key={p}>{p}</option>)}</select></label>
              <label style={fieldStyle}>Date<input type="date" value={choreDate} onChange={(e)=>setChoreDate(e.target.value)} style={inputStyle}/></label>
              <label style={fieldStyle}>Repeat<select value={choreRecurring} onChange={(e)=>setChoreRecurring(e.target.value as Recurrence)} style={inputStyle}>{["None","Daily","Weekly","Monthly"].map(v=><option key={v}>{v}</option>)}</select></label>
            </div>
            {choreRecurring !== "None" ? (
              <div style={{ display:"grid", gap:9, marginTop:9 }}>
                <label style={fieldStyle}>
                  Every
                  <div style={{ display:"grid", gridTemplateColumns:"90px 1fr", gap:8 }}>
                    <input type="number" min={1} value={choreRecurrenceInterval} onChange={(e)=>setChoreRecurrenceInterval(Math.max(1, Number(e.target.value||1)))} style={inputStyle}/>
                    <div style={{ ...inputStyle, display:"flex", alignItems:"center" }}>
                      {choreRecurring === "Daily" ? "day(s)" : choreRecurring === "Monthly" ? "month(s)" : "week(s)"}
                    </div>
                  </div>
                </label>
                {choreRecurring === "Weekly" ? (
                  <label style={fieldStyle}>
                    Days of week
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {[
                        { value:1, label:"Mon" }, { value:2, label:"Tue" }, { value:3, label:"Wed" },
                        { value:4, label:"Thu" }, { value:5, label:"Fri" }, { value:6, label:"Sat" },
                        { value:0, label:"Sun" },
                      ].map((day) => {
                        const active = choreRecurrenceDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setChoreRecurrenceDays((current) =>
                              active ? current.filter((value) => value !== day.value) : [...current, day.value]
                            )}
                            style={{ ...buttonStyle, minHeight:34, padding:"5px 9px", background:active ? "#FFF4CC" : "#FFF", borderColor:active ? colors.gold : colors.line }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                ) : null}
              </div>
            ) : null}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:9,marginTop:9}}>
              <label style={fieldStyle}>
                Icon
                <div style={{ display:"grid", gap:8 }}>
                  {choreEmojiGroups.map((group) => (
                    <div key={group.label}>
                      <div style={{ fontSize:11, color:colors.muted, marginBottom:4 }}>{group.label}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {group.items.map((emoji, index) => (
                          <button
                            key={`${group.label}-${emoji}-${index}`}
                            type="button"
                            onClick={() => setChoreEmoji(emoji)}
                            style={{
                              ...buttonStyle,
                              minWidth:42,
                              minHeight:42,
                              padding:5,
                              fontSize:22,
                              background:choreEmoji===emoji?"#FFF4CC":"#FFF",
                              borderColor:choreEmoji===emoji?colors.gold:colors.line,
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </label>
              <label style={fieldStyle}>Points<input type="number" min={0} step={1} value={chorePoints} onChange={(e)=>setChorePoints(Number(e.target.value||0))} style={inputStyle}/></label>
            </div>
            <label style={{...fieldStyle,marginTop:9}}>Notes<textarea value={choreNotes} onChange={(e)=>setChoreNotes(e.target.value)} style={{...inputStyle,minHeight:70}}/></label>
            <button type="button" onClick={()=>void addChore()} style={{...primaryButtonStyle,marginTop:10}}>Add Chore</button>
          </section>
        </div>
      ) : null}

      {!loading && tab === "rewards" ? (
        <div style={grid2}>
          <section style={cardStyle}>
            <strong style={{color:colors.navy,fontSize:18}}>Saving Goals</strong>
            <div style={{display:"grid",gap:10,marginTop:12}}>
              {goals.map((goal)=>{
                const current=Number(goal.currentAmount||0), target=Math.max(1,Number(goal.goalAmount||1));
                const pct=Math.min(100,Math.round(current/target*100));
                return <button key={goal.id} type="button" onClick={()=>setEditing({...goal})} style={{...buttonStyle,textAlign:"left",padding:12}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:30}}>{goal.goalEmoji||"🎁"}</span><div style={{minWidth:0,flex:1}}><strong>{goal.person}: {goal.title}</strong><div style={{fontSize:12,color:colors.muted}}>{current} / {target} points · {pct}%</div><div style={{height:10,borderRadius:999,background:"#EEF2F6",overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:`${pct}%`,background:goal.goalColor||personColors[goal.person||"Family"]||colors.gold}}/></div></div></div>
                </button>;
              })}
            </div>
          </section>
          <section style={cardStyle}>
            <strong style={{color:colors.navy,fontSize:18}}>Add Goal</strong>
            <div style={{display:"grid",gap:9,marginTop:12}}>
              <label style={fieldStyle}>Person<select value={goalPerson} onChange={(e)=>setGoalPerson(e.target.value)} style={inputStyle}>{people.filter(p=>p!=="Family").map(p=><option key={p}>{p}</option>)}</select></label>
              <label style={fieldStyle}>Saving for<input value={goalTitle} onChange={(e)=>setGoalTitle(e.target.value)} style={inputStyle}/></label>
              <label style={fieldStyle}>Point goal<input type="number" min={1} value={goalAmount} onChange={(e)=>setGoalAmount(Number(e.target.value||1))} style={inputStyle}/></label>
              <label style={fieldStyle}>Emoji<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{goalEmojis.map(e=><button key={e} type="button" onClick={()=>setGoalEmoji(e)} style={{...buttonStyle,minWidth:42,padding:5,background:goalEmoji===e?"#FFF4CC":"#FFF"}}>{e}</button>)}</div></label>
              <button type="button" onClick={()=>void addGoal()} style={primaryButtonStyle}>Save Goal</button>
            </div>
          </section>
          <section style={{...cardStyle,gridColumn:"1 / -1"}}>
            <strong style={{color:colors.navy,fontSize:18}}>Cooper iPad</strong>
            <p style={{color:colors.muted,fontSize:13}}>Create a private family-board link. It shows the 4725 calendar plus the chore/reward board without exposing the estate properties.</p>
            <button type="button" onClick={async()=>{
              const response=await fetch("/api/atlas-home",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({action:"createShare",propertyId:"4725",person:"Cooper"})});
              const payload=await response.json().catch(()=>({}));
              if(!response.ok){setMessage(payload?.error||"Could not create link.");return;}
              const url=`${window.location.origin}/family?token=${encodeURIComponent(payload.token)}`;
              await navigator.clipboard.writeText(url);
              setMessage("Cooper iPad link copied.");
            }} style={primaryButtonStyle}>Create / Copy Cooper Link</button>
          </section>
        </div>
      ) : null}

      {editing ? (
        <div role="dialog" aria-modal="true" onMouseDown={(e)=>{if(e.currentTarget===e.target)setEditing(null);}} style={{position:"fixed",inset:0,zIndex:13000,background:"rgba(7,27,47,.48)",display:"grid",placeItems:isMobile?"end center":"center",padding:isMobile?0:16}}>
          <section onMouseDown={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:760,maxHeight:isMobile?"88dvh":"90vh",overflowY:"auto",background:"#FFF",borderRadius:isMobile?"20px 20px 0 0":20,padding:16,boxShadow:"0 24px 80px rgba(7,27,47,.28)"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:12}}>
              <strong style={{fontSize:20,color:colors.navy}}>{editing.recordType==="recipe"?(editing.code?`${editing.code} · `:"")+editing.title:editing.title}</strong>
              <button type="button" onClick={()=>setEditing(null)} style={buttonStyle}>×</button>
            </div>

            {editing.recordType==="recipe" ? <div style={{display:"grid",gap:9}}>
              <label style={fieldStyle}>Recipe<input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})} style={inputStyle}/></label>
              <label style={fieldStyle}>Category<input value={editing.category||""} onChange={(e)=>setEditing({...editing,category:e.target.value})} style={inputStyle}/></label>
              {editing.meta?<div style={{fontSize:12,color:colors.muted}}>{editing.meta}</div>:null}
              <label style={fieldStyle}>Ingredients<textarea value={editing.ingredients||""} onChange={(e)=>setEditing({...editing,ingredients:e.target.value})} style={{...inputStyle,minHeight:120}} placeholder="You can clean up or replace the imported recipe text here."/></label>
              <label style={fieldStyle}>Directions<textarea value={editing.instructions||editing.fullRecipe||""} onChange={(e)=>setEditing({...editing,instructions:e.target.value,fullRecipe:""})} style={{...inputStyle,minHeight:280}}/></label>
              <label style={fieldStyle}>Notes<textarea value={editing.notes||""} onChange={(e)=>setEditing({...editing,notes:e.target.value})} style={{...inputStyle,minHeight:80}}/></label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button type="button" onClick={()=>void saveRecord(editing)} style={primaryButtonStyle}>Save Changes</button>
                <button type="button" onClick={()=>void saveRecord({...editing,favorite:!editing.favorite})} style={buttonStyle}>{editing.favorite?"★ Favorite":"☆ Favorite"}</button>
                <button type="button" onClick={()=>{navigate("calendar");setEditing(null);}} style={buttonStyle}>Plan on Calendar</button>
                <button type="button" onClick={()=>void deleteRecord(editing)} style={{...buttonStyle,color:colors.red}}>Delete</button>
              </div>
            </div>:null}

            {editing.recordType==="chore" ? <div style={{display:"grid",gap:9}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.3fr .7fr",gap:9}}>
                <label style={fieldStyle}>Chore<input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})} style={inputStyle}/></label>
                <label style={fieldStyle}>Person<select value={editing.person||"Family"} onChange={(e)=>setEditing({...editing,person:e.target.value})} style={inputStyle}>{people.map(p=><option key={p}>{p}</option>)}</select></label>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:9}}>
                <label style={fieldStyle}>Due<input type="date" value={editing.date||""} onChange={(e)=>setEditing({...editing,date:e.target.value})} style={inputStyle}/></label>
                <label style={fieldStyle}>Repeat<select value={editing.recurring||"None"} onChange={(e)=>setEditing({...editing,recurring:e.target.value as Recurrence})} style={inputStyle}>{["None","Daily","Weekly","Monthly"].map(v=><option key={v}>{v}</option>)}</select></label>
                <label style={fieldStyle}>Points<input type="number" min={0} value={editing.points||0} onChange={(e)=>setEditing({...editing,points:Number(e.target.value||0)})} style={inputStyle}/></label>
              </div>
              <label style={fieldStyle}>
                Icon
                <div style={{ display:"grid", gap:8 }}>
                  {choreEmojiGroups.map((group) => (
                    <div key={group.label}>
                      <div style={{ fontSize:11, color:colors.muted, marginBottom:4 }}>{group.label}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {group.items.map((emoji, index) => (
                          <button
                            key={`${group.label}-${emoji}-${index}`}
                            type="button"
                            onClick={() => setEditing({...editing,emoji})}
                            style={{
                              ...buttonStyle,
                              minWidth:42,
                              minHeight:42,
                              padding:5,
                              fontSize:22,
                              background:editing.emoji===emoji?"#FFF4CC":"#FFF",
                              borderColor:editing.emoji===emoji?colors.gold:colors.line,
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </label>
              <label style={fieldStyle}>Notes<textarea value={editing.notes||""} onChange={(e)=>setEditing({...editing,notes:e.target.value})} style={{...inputStyle,minHeight:80}}/></label>
              <label style={fieldStyle}>Add Photo<input type="file" accept="image/*" onChange={(e)=>void addPhoto(editing,e.target.files?.[0])} style={inputStyle}/></label>
              {(editing.photos||[]).length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>{(editing.photos||[]).map(photo=><img key={photo.id} src={photo.dataUrl} alt={photo.name} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:12,border:`1px solid ${colors.line}`}}/>)}</div>:null}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button type="button" onClick={()=>void saveRecord(editing)} style={primaryButtonStyle}>Save Changes</button>
                <button type="button" onClick={()=>void completeChore(editing)} style={buttonStyle}>✓ Complete</button>
                <button type="button" onClick={()=>void deleteRecord(editing)} style={{...buttonStyle,color:colors.red}}>Delete</button>
              </div>
              {(editing.completionHistory||[]).length?<div><strong style={{color:colors.navy}}>Completion History</strong>{(editing.completionHistory||[]).slice(0,12).map(h=><div key={h.id} style={{fontSize:12,padding:"6px 0",borderBottom:`1px solid ${colors.line}`}}>{new Date(h.completedAt).toLocaleString()} · +{h.points} pts</div>)}</div>:null}
            </div>:null}

            {editing.recordType==="goal" ? <div style={{display:"grid",gap:9}}>
              <label style={fieldStyle}>Saving for<input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})} style={inputStyle}/></label>
              <label style={fieldStyle}>Person<select value={editing.person||"Cooper"} onChange={(e)=>setEditing({...editing,person:e.target.value,goalColor:personColors[e.target.value]})} style={inputStyle}>{people.filter(p=>p!=="Family").map(p=><option key={p}>{p}</option>)}</select></label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <label style={fieldStyle}>Current points<input type="number" value={editing.currentAmount||0} onChange={(e)=>setEditing({...editing,currentAmount:Number(e.target.value||0)})} style={inputStyle}/></label>
                <label style={fieldStyle}>Goal points<input type="number" value={editing.goalAmount||0} onChange={(e)=>setEditing({...editing,goalAmount:Number(e.target.value||0)})} style={inputStyle}/></label>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" onClick={()=>void saveRecord(editing)} style={primaryButtonStyle}>Save Changes</button><button type="button" onClick={()=>void deleteRecord(editing)} style={{...buttonStyle,color:colors.red}}>Delete</button></div>
            </div>:null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
