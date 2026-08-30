"use client";

import React, { useEffect, useMemo, useState } from "react";

type HomeRecordType = "recipe" | "goal" | "setting" | "chore_meta" | "chore";
type RecurrenceUnit = "Days" | "Weeks" | "Months";
type HomeTab = "home" | "cookbook" | "chores" | "rewards";
type FamilyPerson = "Family" | "Nick" | "Chelsea" | "Cooper" | "Leni";
type ChorePhoto = { id: string; name: string; dataUrl?: string; url?: string; createdAt?: string };
type ChecklistItem = { id: string; text: string; completed: boolean };
type CompletionEntry = string | { id?: string; completedAt?: string; points?: number; note?: string };

type HomeRecord = {
  id: string;
  propertyId: "4725";
  recordType: HomeRecordType;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  category?: string;
  notes?: string;
  code?: string;
  meta?: string;
  fullRecipe?: string;
  ingredients?: string;
  instructions?: string;
  favorite?: boolean;
  person?: FamilyPerson | string;
  goalAmount?: number;
  currentAmount?: number;
  goalEmoji?: string;
  goalColor?: string;
  workOrderId?: string;
  emoji?: string;
  points?: number;
  recurrenceDays?: number[];
  recurrenceAnchorDate?: string;
  skippedDates?: string[];
};

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
  initialTab?: HomeTab;
  hideHomeHeader?: boolean;
};

const HOME_PROPERTY_ID = "4725";
const COOKBOOK_PDF = "/4725/Nick_Meal_Picker_Cookbook(1).pdf";
const people: FamilyPerson[] = ["Family", "Nick", "Chelsea", "Cooper", "Leni"];
const kidPeople: FamilyPerson[] = ["Cooper", "Leni"];
const personColors: Record<string, string> = {
  Family: "#475467", Nick: "#175CD3", Chelsea: "#C11574", Cooper: "#7F56D9", Leni: "#039855",
};
const weekdayOptions = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];
const choreEmojiGroups = [
  { label: "Morning & Bathroom", items: ["🪥","😁","🦷","🚿","🛁","🧼","🧴","🧻","🚽","🪮","👕","👖","🧦","👟","🎒","⏰"] },
  { label: "Bedroom", items: ["🛏️","🧸","🛋️","🪑","👚","👕","👖","🧦","🧺","🧹","🧽","✨"] },
  { label: "Kitchen & Dishes", items: ["🍽️","🥣","🥄","🍴","🥛","🧃","🍎","🥪","🍳","🧊","🧽","🧼","🗑️","♻️"] },
  { label: "Cleaning", items: ["🧹","🧽","🪣","🧼","🧴","🧻","🧺","🧤","✨","🪟","🧯","🧰"] },
  { label: "School & Homework", items: ["📚","📖","📝","✏️","🖍️","📓","📒","📔","📕","🧠","💻","🎒","🏫","🚌","🧮","🔤","🎨"] },
  { label: "Pets", items: ["🐶","🐕","🐈","🐾","🦴","🥣","💧","💩","🧻","🧹","🚶","❤️"] },
  { label: "Trash & Recycling", items: ["🗑️","♻️","📦","🧴","🥫","📰","🧻","🧹","🧤","🚮"] },
  { label: "Outside & Yard", items: ["🌿","🌱","🪴","💧","🌳","🍂","🧹","🪣","🧤","☀️","🌧️","🚲","🚗"] },
  { label: "Sports & Activities", items: ["⚽","🏀","🏈","⚾","🎾","🏊","🚲","🎹","🎸","🎨","🎮","🧩","📱","💻"] },
  { label: "Rewards & Goals", items: ["⭐","🌟","✨","✅","🏆","🎯","💪","👍","😊","😁","❤️","🎉","🎁","💰","💵"] },
];
const goalEmojis = ["🎮","🧸","🚲","🎧","🎟️","⚽","🏀","🛍️","🎁","💰","⭐","🏆","🎨","📱"];
const recipeCategories = ["Dinner","Meat","Pasta","Seahawks Sunday","Sides & Fries","Dessert","Cookies","Breakfast","Lunch","Family Favorite","Other"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function dateKey(value: unknown) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, "0"), String(parsed.getDate()).padStart(2, "0")].join("-");
}
function todayISO() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
function parseDate(value: string) {
  const key = dateKey(value);
  if (!key) return null;
  const parsed = new Date(`${key}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizedDays(value: unknown) {
  if (!Array.isArray(value)) return [] as number[];
  return Array.from(new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
}
function alignedRecurrenceStart(value: string, recurrenceDays: number[]) {
  const key = dateKey(value) || todayISO();
  const days = normalizedDays(recurrenceDays);
  if (!days.length) return key;
  const start = parseDate(key);
  if (!start || days.includes(start.getDay())) return key;
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + offset);
    if (days.includes(candidate.getDay())) return dateToISO(candidate);
  }
  return key;
}
function mondayStart(date: Date) {
  const copy = new Date(date);
  const jsDay = copy.getDay();
  const delta = jsDay === 0 ? -6 : 1 - jsDay;
  copy.setDate(copy.getDate() + delta);
  copy.setHours(12, 0, 0, 0);
  return copy;
}
function dateToISO(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function nextOccurrence(currentDate: string, interval: number, unit: RecurrenceUnit, recurrenceDays: number[], anchorDate: string) {
  const current = parseDate(currentDate) || parseDate(todayISO())!;
  const safeInterval = Math.max(1, Math.floor(Number(interval || 1)));
  if (unit === "Days") {
    const next = new Date(current); next.setDate(next.getDate() + safeInterval); return dateToISO(next);
  }
  if (unit === "Months") {
    const next = new Date(current); next.setMonth(next.getMonth() + safeInterval); return dateToISO(next);
  }
  const days = normalizedDays(recurrenceDays);
  if (!days.length) {
    const next = new Date(current); next.setDate(next.getDate() + safeInterval * 7); return dateToISO(next);
  }
  const anchor = parseDate(anchorDate) || current;
  const anchorWeek = mondayStart(anchor).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (let offset = 1; offset <= 370; offset += 1) {
    const candidate = new Date(current);
    candidate.setDate(candidate.getDate() + offset);
    if (!days.includes(candidate.getDay())) continue;
    const candidateWeek = mondayStart(candidate).getTime();
    const weekDiff = Math.round((candidateWeek - anchorWeek) / weekMs);
    if (weekDiff >= 0 && weekDiff % safeInterval === 0) return dateToISO(candidate);
  }
  const fallback = new Date(current); fallback.setDate(fallback.getDate() + safeInterval * 7); return dateToISO(fallback);
}
function navigate(screen: string) {
  if (typeof window === "undefined") return;
  window.history.pushState({ atlasScreen: screen }, "", `${window.location.pathname}${window.location.search}#${screen}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function rewardPoints(record: any, meta?: HomeRecord) {
  const direct = Number(meta?.points ?? record?.points ?? 0);
  if (direct > 0) return direct;
  const match = String(record?.notes || "").match(/(?:^|\n)Reward:\s*(\d+)\s*points?/i);
  return match ? Number(match[1]) : 0;
}
function stripRewardLine(notes: unknown) {
  return String(notes || "").split("\n").filter((line) => !/^Reward:\s*\d+\s*points?\s*$/i.test(line.trim())).join("\n").trim();
}
function notesWithReward(notes: unknown, points: number) {
  return [stripRewardLine(notes), points > 0 ? `Reward: ${Math.max(0, Math.round(points))} points` : ""].filter(Boolean).join("\n");
}
function chorePerson(record: any) {
  const value = String(record?.assignedTo || record?.person || "Family").trim();
  return (people.includes(value as FamilyPerson) ? value : "Family") as FamilyPerson;
}
function choreEmoji(record: any, meta?: HomeRecord) {
  return String(meta?.emoji || record?.emoji || String(record?.workCategory || "").match(/^\S+/)?.[0] || "⭐");
}
function completionDate(entry: CompletionEntry) {
  if (typeof entry === "string") return entry;
  return String(entry?.completedAt || "");
}
function recurrenceLabel(record: any, meta?: HomeRecord) {
  if (!record?.recurring) return "Does not repeat";
  const interval = Math.max(1, Number(record?.recurrenceInterval || 1));
  const unit = String(record?.recurrenceUnit || "Weeks").toLowerCase();
  const days = normalizedDays(meta?.recurrenceDays);
  const selected = weekdayOptions.filter((day) => days.includes(day.value)).map((day) => day.label).join(", ");
  return `Every ${interval} ${unit}${selected ? ` · ${selected}` : ""}`;
}

export default function AtlasHomeWorkspace({
  isMobile,
  colors,
  choreRecords = [],
  onCreateChore,
  onOpenChore,
  onCompleteChore,
  initialTab = "home",
  hideHomeHeader = false,
}: Props) {
  const [tab, setTab] = useState<HomeTab>(initialTab);
  const [records, setRecords] = useState<HomeRecord[]>([]);
  const [localChores, setLocalChores] = useState<any[]>(choreRecords);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState("All");
  const [personFilter, setPersonFilter] = useState("All");
  const [editingRecipe, setEditingRecipe] = useState<HomeRecord | null>(null);
  const [editingGoal, setEditingGoal] = useState<HomeRecord | null>(null);
  const [editingChore, setEditingChore] = useState<any | null>(null);
  const [editingMeta, setEditingMeta] = useState<HomeRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [mealDate, setMealDate] = useState(todayISO());
  const [mealPerson, setMealPerson] = useState<FamilyPerson>("Family");
  const [mealTime, setMealTime] = useState("");

  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("Dinner");
  const [recipeIngredients, setRecipeIngredients] = useState("");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeNotes, setRecipeNotes] = useState("");

  const [choreTitle, setChoreTitle] = useState("");
  const [choreAssignee, setChoreAssignee] = useState<FamilyPerson>("Cooper");
  const [choreDate, setChoreDate] = useState(todayISO());
  const [choreRecurring, setChoreRecurring] = useState(false);
  const [choreRecurrenceInterval, setChoreRecurrenceInterval] = useState(1);
  const [choreRecurrenceUnit, setChoreRecurrenceUnit] = useState<RecurrenceUnit>("Weeks");
  const [choreRecurrenceDays, setChoreRecurrenceDays] = useState<number[]>([]);
  const [choreEmojiValue, setChoreEmojiValue] = useState("⭐");
  const [chorePoints, setChorePoints] = useState(5);
  const [choreNotes, setChoreNotes] = useState("");
  const [choreChecklist, setChoreChecklist] = useState<ChecklistItem[]>([]);
  const [choreChecklistText, setChoreChecklistText] = useState("");

  const [goalPerson, setGoalPerson] = useState<FamilyPerson>("Cooper");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState(50);
  const [goalEmoji, setGoalEmoji] = useState("🎁");

  useEffect(() => {
    setLocalChores((current) => {
      const incoming = new Map(choreRecords.map((item: any) => [String(item?.id || ""), item]));
      const merged = current.map((item) => incoming.has(String(item?.id || "")) ? incoming.get(String(item.id)) : item);
      const seen = new Set(merged.map((item) => String(item?.id || "")));
      choreRecords.forEach((item: any) => { if (!seen.has(String(item?.id || ""))) merged.push(item); });
      return merged;
    });
  }, [choreRecords]);

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

  const recipes = useMemo(() => records.filter((item) => item.recordType === "recipe"), [records]);
  const goals = useMemo(() => records.filter((item) => item.recordType === "goal"), [records]);
  const choreMeta = useMemo(() => records.filter((item) => item.recordType === "chore_meta"), [records]);
  const metaByWorkOrder = useMemo(() => new Map(choreMeta.map((item) => [String(item.workOrderId || ""), item])), [choreMeta]);
  const chores = useMemo(() => localChores.filter((item) => String(item?.propertyId || HOME_PROPERTY_ID) === HOME_PROPERTY_ID), [localChores]);
  const visibleChores = useMemo(() => chores.filter((item) => personFilter === "All" || chorePerson(item) === personFilter), [chores, personFilter]);
  const dueChores = useMemo(() => visibleChores.filter((item) => {
    const closed = item?.status === "Completed" || item?.status === "Cancelled";
    return !closed && (!dateKey(item?.date) || dateKey(item.date) <= todayISO());
  }), [visibleChores]);
  const filteredRecipes = useMemo(() => recipes
    .filter((item) => recipeCategoryFilter === "All" || String(item.category || "Other") === recipeCategoryFilter)
    .filter((item) => `${item.code || ""} ${item.title} ${item.category || ""} ${item.meta || ""} ${item.fullRecipe || ""} ${item.ingredients || ""} ${item.instructions || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => String(a.code || a.title).localeCompare(String(b.code || b.title))), [recipes, recipeCategoryFilter, search]);

  const inputStyle: React.CSSProperties = { width: "100%", minHeight: 42, borderRadius: 11, border: `1px solid ${colors.line}`, padding: "9px 10px", background: "#FFFFFF", color: colors.text, font: "inherit", boxSizing: "border-box" };
  const buttonStyle: React.CSSProperties = { minHeight: 40, borderRadius: 11, border: `1px solid ${colors.line}`, background: "#FFFFFF", color: colors.navy, fontWeight: 850, padding: "8px 11px", cursor: "pointer" };
  const primaryButtonStyle: React.CSSProperties = { ...buttonStyle, background: colors.gold, borderColor: colors.gold, color: colors.navy };
  const cardStyle: React.CSSProperties = { background: "#FFFFFF", border: `1px solid ${colors.line}`, borderRadius: 16, padding: isMobile ? 12 : 15 };
  const fieldStyle: React.CSSProperties = { display: "grid", gap: 5, fontSize: 12, fontWeight: 850, color: colors.navy };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 12 };

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => current === text ? "" : current), 1800);
  }
  function baseHomeRecord(recordType: HomeRecordType, title: string): HomeRecord {
    const now = new Date().toISOString();
    return { id: uid(recordType), propertyId: "4725", recordType, title: title.trim(), createdAt: now, updatedAt: now };
  }
  async function saveHomeRecord(record: HomeRecord) {
    const next = { ...record, propertyId: "4725" as const, updatedAt: new Date().toISOString() };
    const response = await fetch("/api/atlas-home", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(next),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Could not save 4725 record.");
    const saved = (payload?.record || next) as HomeRecord;
    setRecords((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    return saved;
  }
  async function deleteHomeRecord(record: HomeRecord) {
    const response = await fetch(`/api/atlas-home?propertyId=4725&id=${encodeURIComponent(record.id)}`, { method: "DELETE", credentials: "include" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Delete failed.");
    setRecords((current) => current.filter((item) => item.id !== record.id));
  }
  async function saveCoreChore(record: any) {
    const next = { ...record, propertyId: HOME_PROPERTY_ID };
    const response = await fetch("/api/atlas", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ table: "work_orders", propertyId: HOME_PROPERTY_ID, record: next }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Could not save chore.");
    setLocalChores((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [next, ...current]);
    return next;
  }
  async function deleteCoreChore(id: string) {
    const response = await fetch("/api/atlas", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ table: "work_orders", propertyId: HOME_PROPERTY_ID, id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Could not delete chore.");
    setLocalChores((current) => current.filter((item) => String(item.id) !== id));
  }
  async function syncChore(workOrder: any, meta: HomeRecord) {
    const response = await fetch("/api/atlas-home", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ action: "syncChore", propertyId: HOME_PROPERTY_ID, workOrder, meta }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Could not sync chore calendar.");
  }
  function metaFor(record: any): HomeRecord {
    const existing = metaByWorkOrder.get(String(record?.id || ""));
    const now = new Date().toISOString();
    return existing || {
      id: `chore-meta-${String(record?.id || uid("work"))}`,
      propertyId: "4725",
      recordType: "chore_meta",
      title: String(record?.title || "Chore"),
      workOrderId: String(record?.id || ""),
      emoji: choreEmoji(record),
      points: rewardPoints(record),
      recurrenceDays: [],
      recurrenceAnchorDate: dateKey(record?.date) || todayISO(),
      skippedDates: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async function addRecipe() {
    if (!recipeTitle.trim()) return;
    setBusy(true);
    try {
      await saveHomeRecord({ ...baseHomeRecord("recipe", recipeTitle), category: recipeCategory, ingredients: recipeIngredients, instructions: recipeInstructions, notes: recipeNotes });
      setRecipeTitle(""); setRecipeIngredients(""); setRecipeInstructions(""); setRecipeNotes("");
      flash("Recipe saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save recipe."); }
    finally { setBusy(false); }
  }

  async function addChore() {
    if (!choreTitle.trim()) return;
    setBusy(true);
    try {
      const effectiveChoreDate = choreRecurring && choreRecurrenceUnit === "Weeks"
        ? alignedRecurrenceStart(choreDate, choreRecurrenceDays)
        : choreDate;
      const coreInput = {
        title: choreTitle.trim(),
        date: effectiveChoreDate,
        status: "Open",
        priority: "Medium",
        notes: notesWithReward(choreNotes, chorePoints),
        assignedTo: choreAssignee,
        recurring: choreRecurring,
        recurrenceInterval: Math.max(1, choreRecurrenceInterval),
        recurrenceUnit: choreRecurrenceUnit,
        workType: "Work Order",
        workCategory: `${choreEmojiValue} Chore`,
        emoji: choreEmojiValue,
        responsibilityArea: "Family",
        checklist: choreChecklist,
        photos: [],
        completionHistory: [],
      };
      let created = onCreateChore ? await onCreateChore(coreInput) : null;
      if (!created?.id) {
        created = await saveCoreChore({ id: uid("chore"), propertyId: HOME_PROPERTY_ID, ...coreInput });
      } else {
        setLocalChores((current) => current.some((item) => item.id === created.id) ? current : [created, ...current]);
      }
      const meta = await saveHomeRecord({
        ...baseHomeRecord("chore_meta", choreTitle),
        id: `chore-meta-${created.id}`,
        workOrderId: String(created.id),
        emoji: choreEmojiValue,
        points: Math.max(0, Math.round(chorePoints)),
        recurrenceDays: choreRecurring && choreRecurrenceUnit === "Weeks" ? normalizedDays(choreRecurrenceDays) : [],
        recurrenceAnchorDate: effectiveChoreDate || todayISO(),
        skippedDates: [],
      });
      await syncChore({ ...created, ...coreInput }, meta);
      setChoreTitle(""); setChoreNotes(""); setChoreChecklist([]); setChoreChecklistText("");
      flash("Chore added.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add chore."); }
    finally { setBusy(false); }
  }

  async function addGoal() {
    if (!goalTitle.trim()) return;
    setBusy(true);
    try {
      await saveHomeRecord({ ...baseHomeRecord("goal", goalTitle), person: goalPerson, goalAmount: Math.max(1, goalAmount), currentAmount: 0, goalEmoji, goalColor: personColors[goalPerson] || colors.gold });
      setGoalTitle(""); flash("Goal saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save goal."); }
    finally { setBusy(false); }
  }

  function openChoreEditor(chore: any) {
    const meta = metaFor(chore);
    setEditingChore({
      ...chore,
      assignedTo: chorePerson(chore),
      notes: stripRewardLine(chore.notes),
      checklist: Array.isArray(chore.checklist) ? chore.checklist : [],
      photos: Array.isArray(chore.photos) ? chore.photos : [],
      recurrenceDays: normalizedDays(meta.recurrenceDays),
      points: rewardPoints(chore, meta),
      emoji: choreEmoji(chore, meta),
    });
    setEditingMeta({ ...meta });
    setRescheduleDate(dateKey(chore.date));
    setNewChecklistText("");
  }

  async function saveEditedChore() {
    if (!editingChore?.id || !editingMeta) return;
    setBusy(true);
    try {
      const recurring = Boolean(editingChore.recurring);
      const recurrenceUnit = String(editingChore.recurrenceUnit || "Weeks") as RecurrenceUnit;
      const effectiveDate = recurring && recurrenceUnit === "Weeks"
        ? alignedRecurrenceStart(dateKey(editingChore.date) || todayISO(), normalizedDays(editingChore.recurrenceDays))
        : dateKey(editingChore.date) || todayISO();
      const core = {
        ...editingChore,
        date: effectiveDate,
        propertyId: HOME_PROPERTY_ID,
        title: String(editingChore.title || "").trim(),
        assignedTo: chorePerson(editingChore),
        notes: notesWithReward(editingChore.notes, Number(editingChore.points || 0)),
        recurring,
        recurrenceInterval: Math.max(1, Number(editingChore.recurrenceInterval || 1)),
        recurrenceUnit,
        workType: "Work Order",
        workCategory: `${String(editingChore.emoji || "⭐")} Chore`,
        emoji: String(editingChore.emoji || "⭐"),
        responsibilityArea: "Family",
        checklist: Array.isArray(editingChore.checklist) ? editingChore.checklist : [],
        photos: Array.isArray(editingChore.photos) ? editingChore.photos : [],
      };
      const savedCore = await saveCoreChore(core);
      const savedMeta = await saveHomeRecord({
        ...editingMeta,
        title: core.title,
        workOrderId: String(core.id),
        emoji: core.emoji,
        points: Math.max(0, Math.round(Number(editingChore.points || 0))),
        recurrenceDays: recurring && recurrenceUnit === "Weeks" ? normalizedDays(editingChore.recurrenceDays) : [],
        recurrenceAnchorDate: editingMeta.recurrenceAnchorDate || dateKey(core.date) || todayISO(),
      });
      await syncChore(savedCore, savedMeta);
      setEditingChore({ ...savedCore, notes: stripRewardLine(savedCore.notes), points: savedMeta.points, recurrenceDays: savedMeta.recurrenceDays, emoji: savedMeta.emoji });
      setEditingMeta(savedMeta);
      flash("Chore saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save chore."); }
    finally { setBusy(false); }
  }

  async function awardPoints(person: FamilyPerson, points: number) {
    if (!points || person === "Family") return;
    const goal = goals.find((item) => item.person === person);
    if (!goal) return;
    await saveHomeRecord({ ...goal, currentAmount: Number(goal.currentAmount || 0) + points });
  }

  async function completeChore(chore: any, metaOverride?: HomeRecord | null) {
    if (!chore?.id) return;
    setBusy(true);
    try {
      const meta = metaOverride || metaFor(chore);
      const points = rewardPoints(chore, meta);
      const completedAt = new Date().toISOString();
      const history: CompletionEntry[] = [completedAt, ...(Array.isArray(chore.completionHistory) ? chore.completionHistory : [])];
      let next = { ...chore, completionHistory: history, lastCompletedDate: todayISO() };
      if (chore.recurring) {
        next = {
          ...next,
          status: "Open",
          date: nextOccurrence(
            dateKey(chore.date) || todayISO(),
            Math.max(1, Number(chore.recurrenceInterval || 1)),
            String(chore.recurrenceUnit || "Weeks") as RecurrenceUnit,
            normalizedDays(meta.recurrenceDays),
            meta.recurrenceAnchorDate || dateKey(chore.date) || todayISO(),
          ),
        };
      } else {
        next = { ...next, status: "Completed" };
      }
      const saved = await saveCoreChore(next);
      await awardPoints(chorePerson(chore), points);
      await syncChore(saved, meta);
      if (onCompleteChore && !metaOverride) {
        // The work-order callback remains available to the parent, but this home
        // editor owns completion so advanced 4725 recurrence metadata is preserved.
      }
      setEditingChore(null); setEditingMeta(null);
      flash(points ? `Completed · +${points} points` : "Chore completed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not complete chore."); }
    finally { setBusy(false); }
  }

  async function skipChore() {
    if (!editingChore?.id || !editingMeta || !editingChore.recurring) return;
    setBusy(true);
    try {
      const skippedDate = dateKey(editingChore.date) || todayISO();
      const nextDate = nextOccurrence(
        skippedDate,
        Math.max(1, Number(editingChore.recurrenceInterval || 1)),
        String(editingChore.recurrenceUnit || "Weeks") as RecurrenceUnit,
        normalizedDays(editingMeta.recurrenceDays),
        editingMeta.recurrenceAnchorDate || skippedDate,
      );
      const meta = await saveHomeRecord({ ...editingMeta, skippedDates: Array.from(new Set([...(editingMeta.skippedDates || []), skippedDate])) });
      const core = await saveCoreChore({ ...editingChore, notes: notesWithReward(editingChore.notes, Number(editingChore.points || 0)), date: nextDate, status: "Open" });
      await syncChore(core, meta);
      setEditingChore(null); setEditingMeta(null);
      flash("Occurrence skipped.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not skip chore."); }
    finally { setBusy(false); }
  }

  async function rescheduleChore() {
    if (!editingChore?.id || !editingMeta || !rescheduleDate) return;
    setBusy(true);
    try {
      const effectiveDate = editingChore.recurring && String(editingChore.recurrenceUnit || "Weeks") === "Weeks"
        ? alignedRecurrenceStart(rescheduleDate, normalizedDays(editingMeta.recurrenceDays))
        : rescheduleDate;
      const core = await saveCoreChore({ ...editingChore, notes: notesWithReward(editingChore.notes, Number(editingChore.points || 0)), date: effectiveDate, status: editingChore.status === "Completed" ? "Open" : editingChore.status });
      const meta = await saveHomeRecord({ ...editingMeta, recurrenceAnchorDate: editingMeta.recurrenceAnchorDate || rescheduleDate });
      await syncChore(core, meta);
      setEditingChore({ ...core, notes: stripRewardLine(core.notes), points: meta.points, recurrenceDays: meta.recurrenceDays, emoji: meta.emoji });
      flash("Chore rescheduled.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reschedule chore."); }
    finally { setBusy(false); }
  }

  async function deleteChore() {
    if (!editingChore?.id || !editingMeta) return;
    if (!window.confirm(`Delete ${editingChore.title}?`)) return;
    setBusy(true);
    try {
      await deleteCoreChore(String(editingChore.id));
      await deleteHomeRecord(editingMeta);
      setEditingChore(null); setEditingMeta(null);
      flash("Chore deleted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete chore."); }
    finally { setBusy(false); }
  }

  async function addPhotoToEditing(file?: File | null) {
    if (!file || !editingChore) return;
    if (!file.type.startsWith("image/")) { setMessage("Choose an image file."); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("Could not read photo.")); reader.readAsDataURL(file);
    });
    const photo: ChorePhoto = { id: uid("photo"), name: file.name, dataUrl, createdAt: new Date().toISOString() };
    setEditingChore({ ...editingChore, photos: [photo, ...(Array.isArray(editingChore.photos) ? editingChore.photos : [])] });
  }

  async function scheduleMeal(recipe: HomeRecord, openCalendar: boolean) {
    if (!mealDate) return;
    setBusy(true);
    try {
      const response = await fetch("/api/atlas-home", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "scheduleMeal", propertyId: HOME_PROPERTY_ID, recipeId: recipe.id, title: recipe.title, date: mealDate, person: mealPerson, time: mealTime }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Could not schedule meal.");
      flash(`${recipe.title} scheduled.`);
      if (openCalendar) {
        setEditingRecipe(null);
        navigate("calendar");
        window.setTimeout(() => window.location.reload(), 60);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not schedule meal."); }
    finally { setBusy(false); }
  }

  async function createFamilyLink(person: FamilyPerson) {
    setBusy(true);
    try {
      const response = await fetch("/api/atlas-home", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "createShare", propertyId: HOME_PROPERTY_ID, person }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Could not create family link.");
      const url = `${window.location.origin}/family?token=${encodeURIComponent(payload.token)}`;
      await navigator.clipboard.writeText(url);
      flash(`${person} link copied.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create family link."); }
    finally { setBusy(false); }
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
          <div><div style={{ color: "#E5C06B", fontSize: 11, fontWeight: 900, letterSpacing: ".12em" }}>4725 FAMILY HOME</div><h2 style={{ margin: "3px 0 0", fontSize: isMobile ? 23 : 29 }}>Home</h2></div>
          {message ? <span style={{ fontSize: 12, fontWeight: 850 }}>{message}</span> : null}
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 12 }}>
          {(["home","cookbook","chores","rewards"] as HomeTab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} style={{ ...buttonStyle, flex: "0 0 auto", background: tab === item ? colors.gold : "rgba(255,255,255,.10)", color: tab === item ? colors.navy : "#FFFFFF", borderColor: tab === item ? colors.gold : "rgba(255,255,255,.22)" }}>{item === "home" ? "Today" : item === "rewards" ? "Goals & Rewards" : item[0].toUpperCase()+item.slice(1)}</button>)}
          <button type="button" onClick={() => navigate("calendar")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Calendar</button>
          <button type="button" onClick={() => navigate("assets")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Assets</button>
          <button type="button" onClick={() => navigate("locations")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Locations</button>
          <button type="button" onClick={() => navigate("assistant")} style={{ ...buttonStyle, flex:"0 0 auto" }}>Ask Atlas</button>
        </div>
      </section> : null}

      {hideHomeHeader && message ? <div style={{ fontSize: 12, color: colors.muted, fontWeight: 800 }}>{message}</div> : null}
      {loading ? <section style={cardStyle}>Loading 4725…</section> : null}

      {!loading && tab === "home" ? <>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 10 }}>
          {todayCards.map((card) => <button key={card.label} type="button" onClick={card.action} style={{ ...cardStyle, textAlign:"left", cursor:"pointer", minHeight: 105 }}><span style={{ fontSize: 25 }}>{card.icon}</span><strong style={{ display:"block", marginTop: 7, color: colors.navy }}>{card.label}</strong><span style={{ color: colors.muted, fontSize: 12 }}>{card.value}</span></button>)}
        </div>
        <section style={cardStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", flexWrap:"wrap" }}><strong style={{ color: colors.navy, fontSize: 18 }}>Today’s Chores</strong><button type="button" onClick={() => setTab("chores")} style={buttonStyle}>Open Chore Board</button></div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))", gap:9, marginTop:12 }}>
            {dueChores.slice(0,10).map((chore) => { const meta = metaByWorkOrder.get(String(chore.id)); return <button key={chore.id} type="button" onClick={() => openChoreEditor(chore)} style={{ border:`2px solid ${personColors[chorePerson(chore)] || colors.line}`, borderRadius:16, padding:12, background:"#FFFFFF", textAlign:"center", cursor:"pointer", color:colors.text }}><span style={{ fontSize:34 }}>{choreEmoji(chore, meta)}</span><strong style={{ display:"block", marginTop:6 }}>{chore.title}</strong><span style={{ display:"block", fontSize:11, color:personColors[chorePerson(chore)] }}>{chorePerson(chore)} · {rewardPoints(chore, meta)} pts</span></button>; })}
            {!dueChores.length ? <span style={{ color: colors.muted }}>Nothing due today.</span> : null}
          </div>
        </section>
      </> : null}

      {!loading && tab === "cookbook" ? <div style={grid2}>
        <section style={cardStyle}>
          <strong style={{ color: colors.navy, fontSize: 18 }}>Add Recipe</strong>
          <div style={{ display:"grid", gap:9, marginTop:12 }}>
            <label style={fieldStyle}>Recipe<input value={recipeTitle} onChange={(e)=>setRecipeTitle(e.target.value)} style={inputStyle}/></label>
            <label style={fieldStyle}>Category<select value={recipeCategory} onChange={(e)=>setRecipeCategory(e.target.value)} style={inputStyle}>{recipeCategories.map(v=><option key={v}>{v}</option>)}</select></label>
            <label style={fieldStyle}>Ingredients<textarea value={recipeIngredients} onChange={(e)=>setRecipeIngredients(e.target.value)} style={{...inputStyle,minHeight:110}}/></label>
            <label style={fieldStyle}>Directions<textarea value={recipeInstructions} onChange={(e)=>setRecipeInstructions(e.target.value)} style={{...inputStyle,minHeight:140}}/></label>
            <label style={fieldStyle}>Notes<textarea value={recipeNotes} onChange={(e)=>setRecipeNotes(e.target.value)} style={{...inputStyle,minHeight:70}}/></label>
            <button disabled={busy} type="button" onClick={()=>void addRecipe()} style={primaryButtonStyle}>Save Recipe</button>
          </div>
        </section>
        <section style={cardStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}><strong style={{ color: colors.navy, fontSize:18 }}>Cookbook</strong><a href={COOKBOOK_PDF} target="_blank" rel="noreferrer" style={{ ...buttonStyle, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>Original PDF</a></div>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search recipes" style={{...inputStyle,width:isMobile?"100%":240}}/>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginTop:10 }}>
            {["All", ...Array.from(new Set(recipes.map((recipe) => String(recipe.category || "Other"))))].map((category) => <button key={category} type="button" onClick={() => setRecipeCategoryFilter(category)} style={{ ...buttonStyle, flex:"0 0 auto", minHeight:34, padding:"5px 9px", background:recipeCategoryFilter===category?"#FFF4CC":"#FFF", borderColor:recipeCategoryFilter===category?colors.gold:colors.line }}>{category}</button>)}
          </div>
          <div style={{ display:"grid", gap:8, marginTop:8, maxHeight:isMobile?"none":"70vh", overflowY:"auto" }}>
            {filteredRecipes.map((recipe)=><button key={recipe.id} type="button" onClick={()=>{setEditingRecipe({...recipe});setMealDate(todayISO());setMealPerson("Family");setMealTime("");}} style={{ ...buttonStyle, textAlign:"left", display:"grid", gridTemplateColumns:"auto minmax(0,1fr) auto", alignItems:"center", gap:10, minHeight:58 }}><strong style={{ color:colors.gold }}>{recipe.code || "NEW"}</strong><span><strong style={{ display:"block" }}>{recipe.title}</strong><small style={{ color:colors.muted }}>{recipe.category}{recipe.meta ? ` · ${recipe.meta}` : ""}</small></span><span>{recipe.favorite ? "★" : "›"}</span></button>)}
          </div>
        </section>
      </div> : null}

      {!loading && tab === "chores" ? <div style={{ display:"grid", gap:12 }}>
        <section style={cardStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap", alignItems:"center" }}><div><strong style={{ color:colors.navy,fontSize:20 }}>Family Chore Board</strong><div style={{ color:colors.muted,fontSize:12 }}>All chores use the real 4725 Work Order records underneath.</div></div><select value={personFilter} onChange={(e)=>setPersonFilter(e.target.value)} style={{...inputStyle,width:isMobile?"100%":180}}><option>All</option>{people.map(p=><option key={p}>{p}</option>)}</select></div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(5,minmax(0,1fr))", gap:10, marginTop:14 }}>
            {visibleChores.map((chore)=>{ const meta=metaByWorkOrder.get(String(chore.id)); const closed=chore.status==="Completed"||chore.status==="Cancelled"; return <article key={chore.id} style={{ border:`3px solid ${personColors[chorePerson(chore)] || colors.line}`, borderRadius:18, background:"#FFFFFF", padding:12, minHeight:185, display:"grid", alignContent:"space-between", boxShadow:"0 4px 14px rgba(7,27,47,.08)", opacity: closed ? .72 : 1 }}><button type="button" onClick={()=>openChoreEditor(chore)} style={{border:0,background:"transparent",cursor:"pointer",textAlign:"center",color:colors.text}}><span style={{fontSize:46}}>{choreEmoji(chore,meta)}</span><strong style={{display:"block",fontSize:15,marginTop:5}}>{chore.title}</strong><span style={{display:"block",fontSize:11,color:colors.muted,marginTop:4}}>{chorePerson(chore)} · {rewardPoints(chore,meta)} pts</span><span style={{display:"block",fontSize:10,color:colors.muted,marginTop:3}}>{dateKey(chore.date)||"Anytime"} · {recurrenceLabel(chore,meta)}</span></button>{!closed?<button disabled={busy} type="button" onClick={()=>void completeChore(chore,meta||null)} style={{...primaryButtonStyle,marginTop:10}}>✓ Done</button>:<button type="button" onClick={()=>openChoreEditor(chore)} style={{...buttonStyle,marginTop:10}}>View History</button>}</article>;})}
          </div>
        </section>

        <section style={cardStyle}>
          <strong style={{ color:colors.navy,fontSize:18 }}>Add Chore</strong>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1.3fr .7fr .7fr", gap:9, marginTop:12 }}>
            <label style={fieldStyle}>Chore<input value={choreTitle} onChange={(e)=>setChoreTitle(e.target.value)} style={inputStyle}/></label>
            <label style={fieldStyle}>Assigned to<select value={choreAssignee} onChange={(e)=>setChoreAssignee(e.target.value as FamilyPerson)} style={inputStyle}>{people.map(p=><option key={p}>{p}</option>)}</select></label>
            <label style={fieldStyle}>Due / Start<input type="date" value={choreDate} onChange={(e)=>setChoreDate(e.target.value)} style={inputStyle}/></label>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":".7fr .6fr .7fr", gap:9, marginTop:9 }}>
            <label style={{...fieldStyle,alignContent:"end"}}>Repeat<label style={{display:"flex",alignItems:"center",gap:8,minHeight:42}}><input type="checkbox" checked={choreRecurring} onChange={(e)=>setChoreRecurring(e.target.checked)}/> Recurring</label></label>
            {choreRecurring?<label style={fieldStyle}>Every<input type="number" min={1} value={choreRecurrenceInterval} onChange={(e)=>setChoreRecurrenceInterval(Math.max(1,Number(e.target.value||1)))} style={inputStyle}/></label>:null}
            {choreRecurring?<label style={fieldStyle}>Unit<select value={choreRecurrenceUnit} onChange={(e)=>setChoreRecurrenceUnit(e.target.value as RecurrenceUnit)} style={inputStyle}><option value="Days">Days</option><option value="Weeks">Weeks</option><option value="Months">Months</option></select></label>:null}
          </div>
          {choreRecurring && choreRecurrenceUnit === "Weeks" ? <label style={{...fieldStyle,marginTop:9}}>Weekdays<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{weekdayOptions.map((day)=>{const active=choreRecurrenceDays.includes(day.value);return <button key={day.value} type="button" onClick={()=>setChoreRecurrenceDays((current)=>active?current.filter((value)=>value!==day.value):[...current,day.value])} style={{...buttonStyle,minHeight:34,padding:"5px 9px",background:active?"#FFF4CC":"#FFF",borderColor:active?colors.gold:colors.line}}>{day.label}</button>;})}</div></label>:null}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr .35fr",gap:10,marginTop:10}}>
            <label style={fieldStyle}>Icon<div style={{display:"grid",gap:8,maxHeight:280,overflowY:"auto",paddingRight:4}}>{choreEmojiGroups.map((group)=><div key={group.label}><div style={{fontSize:11,color:colors.muted,marginBottom:4}}>{group.label}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{group.items.map((emoji,index)=><button key={`${group.label}-${emoji}-${index}`} type="button" onClick={()=>setChoreEmojiValue(emoji)} style={{...buttonStyle,minWidth:42,minHeight:42,padding:5,fontSize:22,background:choreEmojiValue===emoji?"#FFF4CC":"#FFF",borderColor:choreEmojiValue===emoji?colors.gold:colors.line}}>{emoji}</button>)}</div></div>)}</div></label>
            <label style={fieldStyle}>Points<input type="number" min={0} value={chorePoints} onChange={(e)=>setChorePoints(Number(e.target.value||0))} style={inputStyle}/></label>
          </div>
          <label style={{...fieldStyle,marginTop:9}}>Notes<textarea value={choreNotes} onChange={(e)=>setChoreNotes(e.target.value)} style={{...inputStyle,minHeight:78}}/></label>
          <label style={{...fieldStyle,marginTop:9}}>Checklist / Steps<div style={{display:"flex",gap:7}}><input value={choreChecklistText} onChange={(e)=>setChoreChecklistText(e.target.value)} style={inputStyle}/><button type="button" onClick={()=>{const text=choreChecklistText.trim();if(!text)return;setChoreChecklist((current)=>[...current,{id:uid("step"),text,completed:false}]);setChoreChecklistText("");}} style={buttonStyle}>Add</button></div></label>
          {choreChecklist.length?<div style={{display:"grid",gap:5,marginTop:7}}>{choreChecklist.map((item)=><div key={item.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:12}}><span style={{flex:1}}>{item.text}</span><button type="button" onClick={()=>setChoreChecklist((current)=>current.filter((entry)=>entry.id!==item.id))} style={{...buttonStyle,minHeight:30,padding:"3px 8px"}}>Remove</button></div>)}</div>:null}
          <button disabled={busy} type="button" onClick={()=>void addChore()} style={{...primaryButtonStyle,marginTop:10}}>Add Chore</button>
        </section>
      </div> : null}

      {!loading && tab === "rewards" ? <div style={grid2}>
        <section style={cardStyle}><strong style={{color:colors.navy,fontSize:18}}>Goals & Progress</strong><div style={{display:"grid",gap:10,marginTop:12}}>{goals.map((goal)=>{const current=Number(goal.currentAmount||0),target=Math.max(1,Number(goal.goalAmount||1)),pct=Math.min(100,Math.round(current/target*100));return <button key={goal.id} type="button" onClick={()=>setEditingGoal({...goal})} style={{...buttonStyle,textAlign:"left",padding:12}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:30}}>{goal.goalEmoji||"🎁"}</span><div style={{minWidth:0,flex:1}}><strong>{goal.person}: {goal.title}</strong><div style={{fontSize:12,color:colors.muted}}>{current} / {target} points · {pct}%</div><div style={{height:10,borderRadius:999,background:"#EEF2F6",overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:`${pct}%`,background:goal.goalColor||personColors[goal.person||"Family"]||colors.gold}}/></div></div></div></button>;})}</div></section>
        <section style={cardStyle}><strong style={{color:colors.navy,fontSize:18}}>Add Goal</strong><div style={{display:"grid",gap:9,marginTop:12}}><label style={fieldStyle}>Person<select value={goalPerson} onChange={(e)=>setGoalPerson(e.target.value as FamilyPerson)} style={inputStyle}>{kidPeople.map(p=><option key={p}>{p}</option>)}</select></label><label style={fieldStyle}>Saving for<input value={goalTitle} onChange={(e)=>setGoalTitle(e.target.value)} style={inputStyle}/></label><label style={fieldStyle}>Point goal<input type="number" min={1} value={goalAmount} onChange={(e)=>setGoalAmount(Number(e.target.value||1))} style={inputStyle}/></label><label style={fieldStyle}>Emoji<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{goalEmojis.map(e=><button key={e} type="button" onClick={()=>setGoalEmoji(e)} style={{...buttonStyle,minWidth:42,padding:5,background:goalEmoji===e?"#FFF4CC":"#FFF"}}>{e}</button>)}</div></label><button disabled={busy} type="button" onClick={()=>void addGoal()} style={primaryButtonStyle}>Save Goal</button></div></section>
        <section style={{...cardStyle,gridColumn:"1 / -1"}}><strong style={{color:colors.navy,fontSize:18}}>Private Family Links</strong><div style={{color:colors.muted,fontSize:12,marginTop:4}}>Chelsea gets family-management controls. Cooper and Leni get simplified chore, calendar, and reward views. Every link is locked to 4725.</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>{(["Chelsea","Cooper","Leni"] as FamilyPerson[]).map((person)=><button disabled={busy} key={person} type="button" onClick={()=>void createFamilyLink(person)} style={person==="Chelsea"?primaryButtonStyle:buttonStyle}>Create / Copy {person} Link</button>)}</div></section>
      </div> : null}

      {editingRecipe ? <div role="dialog" aria-modal="true" onMouseDown={(e)=>{if(e.currentTarget===e.target)setEditingRecipe(null);}} style={{position:"fixed",inset:0,zIndex:13000,background:"rgba(7,27,47,.48)",display:"grid",placeItems:isMobile?"end center":"center",padding:isMobile?0:16}}><section onMouseDown={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:800,maxHeight:isMobile?"90dvh":"92vh",overflowY:"auto",background:"#FFF",borderRadius:isMobile?"20px 20px 0 0":20,padding:16,boxShadow:"0 24px 80px rgba(7,27,47,.28)"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:12}}><strong style={{fontSize:20,color:colors.navy}}>{editingRecipe.code?`${editingRecipe.code} · `:""}{editingRecipe.title}</strong><button type="button" onClick={()=>setEditingRecipe(null)} style={buttonStyle}>×</button></div>
        <div style={{display:"grid",gap:9}}><label style={fieldStyle}>Recipe<input value={editingRecipe.title} onChange={(e)=>setEditingRecipe({...editingRecipe,title:e.target.value})} style={inputStyle}/></label><label style={fieldStyle}>Category<select value={editingRecipe.category||"Other"} onChange={(e)=>setEditingRecipe({...editingRecipe,category:e.target.value})} style={inputStyle}>{recipeCategories.map(v=><option key={v}>{v}</option>)}</select></label>{editingRecipe.meta?<div style={{fontSize:12,color:colors.muted}}>{editingRecipe.meta}</div>:null}<label style={fieldStyle}>Ingredients<textarea value={editingRecipe.ingredients||""} onChange={(e)=>setEditingRecipe({...editingRecipe,ingredients:e.target.value})} style={{...inputStyle,minHeight:120}}/></label><label style={fieldStyle}>Directions<textarea value={editingRecipe.instructions||editingRecipe.fullRecipe||""} onChange={(e)=>setEditingRecipe({...editingRecipe,instructions:e.target.value,fullRecipe:""})} style={{...inputStyle,minHeight:260}}/></label><label style={fieldStyle}>Notes<textarea value={editingRecipe.notes||""} onChange={(e)=>setEditingRecipe({...editingRecipe,notes:e.target.value})} style={{...inputStyle,minHeight:80}}/></label>
          <div style={{...cardStyle,background:"#F8FAFC"}}><strong style={{color:colors.navy}}>Schedule this meal</strong><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:8,marginTop:8}}><label style={fieldStyle}>Date<input type="date" value={mealDate} onChange={(e)=>setMealDate(e.target.value)} style={inputStyle}/></label><label style={fieldStyle}>For<select value={mealPerson} onChange={(e)=>setMealPerson(e.target.value as FamilyPerson)} style={inputStyle}>{people.map(p=><option key={p}>{p}</option>)}</select></label><label style={fieldStyle}>Time optional<input type="time" value={mealTime} onChange={(e)=>setMealTime(e.target.value)} style={inputStyle}/></label></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}><button disabled={busy} type="button" onClick={()=>void scheduleMeal(editingRecipe,false)} style={buttonStyle}>Schedule Meal</button><button disabled={busy} type="button" onClick={()=>void scheduleMeal(editingRecipe,true)} style={primaryButtonStyle}>Schedule & Open Calendar</button></div></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button disabled={busy} type="button" onClick={async()=>{try{const saved=await saveHomeRecord(editingRecipe);setEditingRecipe(saved);flash("Recipe saved.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save recipe.");}}} style={primaryButtonStyle}>Save Changes</button><button disabled={busy} type="button" onClick={async()=>{try{const saved=await saveHomeRecord({...editingRecipe,favorite:!editingRecipe.favorite});setEditingRecipe(saved);}catch(error){setMessage(error instanceof Error?error.message:"Could not update favorite.");}}} style={buttonStyle}>{editingRecipe.favorite?"★ Favorite":"☆ Favorite"}</button><a href={COOKBOOK_PDF} target="_blank" rel="noreferrer" style={{...buttonStyle,textDecoration:"none",display:"inline-flex",alignItems:"center"}}>Open Original PDF</a><button disabled={busy} type="button" onClick={async()=>{if(!window.confirm(`Delete ${editingRecipe.title}?`))return;try{await deleteHomeRecord(editingRecipe);setEditingRecipe(null);flash("Recipe deleted.");}catch(error){setMessage(error instanceof Error?error.message:"Could not delete recipe.");}}} style={{...buttonStyle,color:colors.red}}>Delete</button></div>
        </div>
      </section></div> : null}

      {editingChore && editingMeta ? <div role="dialog" aria-modal="true" onMouseDown={(e)=>{if(e.currentTarget===e.target){setEditingChore(null);setEditingMeta(null);}}} style={{position:"fixed",inset:0,zIndex:13000,background:"rgba(7,27,47,.48)",display:"grid",placeItems:isMobile?"end center":"center",padding:isMobile?0:16}}><section onMouseDown={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:900,maxHeight:isMobile?"92dvh":"94vh",overflowY:"auto",background:"#FFF",borderRadius:isMobile?"20px 20px 0 0":20,padding:16,boxShadow:"0 24px 80px rgba(7,27,47,.28)"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:12}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:34}}>{editingChore.emoji||"⭐"}</span><div><strong style={{fontSize:20,color:colors.navy}}>{editingChore.title}</strong><div style={{fontSize:11,color:colors.muted}}>{recurrenceLabel(editingChore,editingMeta)}</div></div></div><button type="button" onClick={()=>{setEditingChore(null);setEditingMeta(null);}} style={buttonStyle}>×</button></div>
        <div style={{display:"grid",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.4fr .7fr .7fr",gap:9}}><label style={fieldStyle}>Chore<input value={editingChore.title||""} onChange={(e)=>setEditingChore({...editingChore,title:e.target.value})} style={inputStyle}/></label><label style={fieldStyle}>Assigned to<select value={chorePerson(editingChore)} onChange={(e)=>setEditingChore({...editingChore,assignedTo:e.target.value})} style={inputStyle}>{people.map(p=><option key={p}>{p}</option>)}</select></label><label style={fieldStyle}>Points<input type="number" min={0} value={Number(editingChore.points||0)} onChange={(e)=>setEditingChore({...editingChore,points:Number(e.target.value||0)})} style={inputStyle}/></label></div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":".7fr .6fr .7fr",gap:9}}><label style={{...fieldStyle,alignContent:"end"}}>Repeat<label style={{display:"flex",alignItems:"center",gap:8,minHeight:42}}><input type="checkbox" checked={Boolean(editingChore.recurring)} onChange={(e)=>setEditingChore({...editingChore,recurring:e.target.checked})}/> Recurring</label></label>{editingChore.recurring?<label style={fieldStyle}>Every<input type="number" min={1} value={Math.max(1,Number(editingChore.recurrenceInterval||1))} onChange={(e)=>setEditingChore({...editingChore,recurrenceInterval:Math.max(1,Number(e.target.value||1))})} style={inputStyle}/></label>:null}{editingChore.recurring?<label style={fieldStyle}>Unit<select value={String(editingChore.recurrenceUnit||"Weeks")} onChange={(e)=>setEditingChore({...editingChore,recurrenceUnit:e.target.value})} style={inputStyle}><option value="Days">Days</option><option value="Weeks">Weeks</option><option value="Months">Months</option></select></label>:null}</div>
          {editingChore.recurring && String(editingChore.recurrenceUnit||"Weeks")==="Weeks"?<label style={fieldStyle}>Weekdays<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{weekdayOptions.map((day)=>{const days=normalizedDays(editingChore.recurrenceDays);const active=days.includes(day.value);return <button key={day.value} type="button" onClick={()=>setEditingChore({...editingChore,recurrenceDays:active?days.filter((value)=>value!==day.value):[...days,day.value]})} style={{...buttonStyle,minHeight:34,padding:"5px 9px",background:active?"#FFF4CC":"#FFF",borderColor:active?colors.gold:colors.line}}>{day.label}</button>;})}</div></label>:null}
          <label style={fieldStyle}>Icon<div style={{display:"grid",gap:7,maxHeight:220,overflowY:"auto"}}>{choreEmojiGroups.map((group)=><div key={group.label}><div style={{fontSize:11,color:colors.muted,marginBottom:4}}>{group.label}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{group.items.map((emoji,index)=><button key={`${group.label}-${emoji}-${index}`} type="button" onClick={()=>setEditingChore({...editingChore,emoji})} style={{...buttonStyle,minWidth:42,minHeight:42,padding:5,fontSize:22,background:editingChore.emoji===emoji?"#FFF4CC":"#FFF",borderColor:editingChore.emoji===emoji?colors.gold:colors.line}}>{emoji}</button>)}</div></div>)}</div></label>
          <label style={fieldStyle}>Notes<textarea value={editingChore.notes||""} onChange={(e)=>setEditingChore({...editingChore,notes:e.target.value})} style={{...inputStyle,minHeight:90}}/></label>
          <section style={{...cardStyle,background:"#F8FAFC"}}><strong style={{color:colors.navy}}>Checklist / Steps</strong><div style={{display:"grid",gap:6,marginTop:8}}>{(Array.isArray(editingChore.checklist)?editingChore.checklist:[]).map((item:ChecklistItem)=><label key={item.id} style={{display:"flex",gap:8,alignItems:"center",fontSize:12}}><input type="checkbox" checked={Boolean(item.completed)} onChange={(e)=>setEditingChore({...editingChore,checklist:editingChore.checklist.map((entry:ChecklistItem)=>entry.id===item.id?{...entry,completed:e.target.checked}:entry)})}/><span style={{flex:1,textDecoration:item.completed?"line-through":"none"}}>{item.text}</span><button type="button" onClick={()=>setEditingChore({...editingChore,checklist:editingChore.checklist.filter((entry:ChecklistItem)=>entry.id!==item.id)})} style={{...buttonStyle,minHeight:30,padding:"3px 8px"}}>Remove</button></label>)}</div><div style={{display:"flex",gap:7,marginTop:8}}><input value={newChecklistText} onChange={(e)=>setNewChecklistText(e.target.value)} style={inputStyle}/><button type="button" onClick={()=>{const text=newChecklistText.trim();if(!text)return;setEditingChore({...editingChore,checklist:[...(editingChore.checklist||[]),{id:uid("step"),text,completed:false}]});setNewChecklistText("");}} style={buttonStyle}>Add Step</button></div></section>
          <section style={{...cardStyle,background:"#F8FAFC"}}><strong style={{color:colors.navy}}>Photos</strong><label style={{...fieldStyle,marginTop:8}}>Add Photo<input type="file" accept="image/*" onChange={(e)=>void addPhotoToEditing(e.target.files?.[0])} style={inputStyle}/></label>{Array.isArray(editingChore.photos)&&editingChore.photos.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginTop:8}}>{editingChore.photos.map((photo:ChorePhoto)=><div key={photo.id}><img src={String(photo.dataUrl||photo.url||"")} alt={photo.name} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:12,border:`1px solid ${colors.line}`}}/><button type="button" onClick={()=>setEditingChore({...editingChore,photos:editingChore.photos.filter((entry:ChorePhoto)=>entry.id!==photo.id)})} style={{...buttonStyle,width:"100%",marginTop:4,minHeight:30,padding:"3px 8px"}}>Remove</button></div>)}</div>:null}</section>
          <section style={{...cardStyle,background:"#F8FAFC"}}><strong style={{color:colors.navy}}>Reschedule</strong><div style={{display:"flex",gap:8,alignItems:"end",marginTop:8,flexWrap:"wrap"}}><label style={{...fieldStyle,flex:"1 1 180px"}}>Due / Start<input type="date" value={rescheduleDate} onChange={(e)=>setRescheduleDate(e.target.value)} style={inputStyle}/></label><button disabled={busy||!rescheduleDate} type="button" onClick={()=>void rescheduleChore()} style={buttonStyle}>Reschedule</button></div></section>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button disabled={busy} type="button" onClick={()=>void saveEditedChore()} style={primaryButtonStyle}>Save Changes</button>{editingChore.status!=="Completed"?<button disabled={busy} type="button" onClick={()=>void completeChore(editingChore,editingMeta)} style={buttonStyle}>✓ Complete</button>:null}{editingChore.recurring?<button disabled={busy} type="button" onClick={()=>void skipChore()} style={buttonStyle}>Skip This Occurrence</button>:null}{onOpenChore?<button type="button" onClick={()=>onOpenChore(String(editingChore.id))} style={buttonStyle}>Open Full Work Detail</button>:null}<button disabled={busy} type="button" onClick={()=>void deleteChore()} style={{...buttonStyle,color:colors.red}}>Delete</button></div>
          {Array.isArray(editingChore.completionHistory)&&editingChore.completionHistory.length?<div><strong style={{color:colors.navy}}>Completion History</strong>{editingChore.completionHistory.slice(0,20).map((entry:CompletionEntry,index:number)=>{const value=completionDate(entry);return <div key={`${value}-${index}`} style={{fontSize:12,padding:"6px 0",borderBottom:`1px solid ${colors.line}`}}>{value?new Date(value).toLocaleString():"Completed"}{rewardPoints(editingChore,editingMeta)?` · +${rewardPoints(editingChore,editingMeta)} pts`:""}</div>;})}</div>:null}
        </div>
      </section></div> : null}

      {editingGoal ? <div role="dialog" aria-modal="true" onMouseDown={(e)=>{if(e.currentTarget===e.target)setEditingGoal(null);}} style={{position:"fixed",inset:0,zIndex:13000,background:"rgba(7,27,47,.48)",display:"grid",placeItems:"center",padding:16}}><section onMouseDown={(e)=>e.stopPropagation()} style={{width:"100%",maxWidth:560,background:"#FFF",borderRadius:20,padding:16,boxShadow:"0 24px 80px rgba(7,27,47,.28)"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:12}}><strong style={{fontSize:20,color:colors.navy}}>{editingGoal.title}</strong><button type="button" onClick={()=>setEditingGoal(null)} style={buttonStyle}>×</button></div><div style={{display:"grid",gap:9}}><label style={fieldStyle}>Person<select value={editingGoal.person||"Cooper"} onChange={(e)=>setEditingGoal({...editingGoal,person:e.target.value})} style={inputStyle}>{kidPeople.map(p=><option key={p}>{p}</option>)}</select></label><label style={fieldStyle}>Goal<input value={editingGoal.title} onChange={(e)=>setEditingGoal({...editingGoal,title:e.target.value})} style={inputStyle}/></label><label style={fieldStyle}>Point goal<input type="number" min={1} value={Number(editingGoal.goalAmount||1)} onChange={(e)=>setEditingGoal({...editingGoal,goalAmount:Number(e.target.value||1)})} style={inputStyle}/></label><label style={fieldStyle}>Current points<input type="number" min={0} value={Number(editingGoal.currentAmount||0)} onChange={(e)=>setEditingGoal({...editingGoal,currentAmount:Number(e.target.value||0)})} style={inputStyle}/></label><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" onClick={async()=>{try{const saved=await saveHomeRecord(editingGoal);setEditingGoal(saved);flash("Goal saved.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save goal.");}}} style={primaryButtonStyle}>Save</button><button type="button" onClick={async()=>{if(!window.confirm(`Delete ${editingGoal.title}?`))return;try{await deleteHomeRecord(editingGoal);setEditingGoal(null);flash("Goal deleted.");}catch(error){setMessage(error instanceof Error?error.message:"Could not delete goal.");}}} style={{...buttonStyle,color:colors.red}}>Delete</button></div></div></section></div> : null}
    </div>
  );
}
