import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { atlasHomeCookbookSeed } from "../../../lib/atlas-home-cookbook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOME_PROPERTY_ID = "4725";
const HOME_OWNER_EMAIL = "nthornton87@yahoo.com";
const COOKBOOK_SEED_ID = "system-cookbook-seed-v1";
const FAMILY_MEMBERS = ["Family", "Nick", "Chelsea", "Cooper", "Leni"] as const;
type FamilyPerson = (typeof FAMILY_MEMBERS)[number];
type HomeRecordType = "recipe" | "goal" | "setting" | "chore_meta" | "chore";
type HomeRecord = {
  id: string;
  propertyId: string;
  recordType: HomeRecordType;
  title: string;
  workOrderId?: string;
  points?: number;
  emoji?: string;
  recurrenceDays?: number[];
  recurrenceAnchorDate?: string;
  skippedDates?: string[];
  [key: string]: unknown;
};
type JsonRecord = Record<string, unknown>;
type ShareRecord = { id?: string; person?: string; role?: string };

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return neon(url);
}
function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}
function asBoolean(value: unknown) {
  return value === true || value === "true" || value === 1;
}
function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}
function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}
function safePerson(value: unknown): FamilyPerson {
  const person = asString(value) as FamilyPerson;
  return FAMILY_MEMBERS.includes(person) ? person : "Family";
}
function dateKey(value: unknown) {
  if (!value) return "";
  const text = String(value);
  const direct = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, "0"), String(parsed.getDate()).padStart(2, "0")].join("-");
}
function dateToISO(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function parseDate(value: unknown) {
  const key = dateKey(value);
  if (!key) return null;
  const parsed = new Date(`${key}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function normalizedDays(value: unknown) {
  if (!Array.isArray(value)) return [] as number[];
  return Array.from(new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
}
function alignedRecurrenceStart(value: unknown, recurrenceDays: number[]) {
  const key = dateKey(value) || dateKey(new Date());
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
  copy.setDate(copy.getDate() + (jsDay === 0 ? -6 : 1 - jsDay));
  copy.setHours(12, 0, 0, 0);
  return copy;
}
function nextOccurrence(currentDate: string, interval: number, unit: string, recurrenceDays: number[], anchorDate: string) {
  const current = parseDate(currentDate) || new Date();
  current.setHours(12, 0, 0, 0);
  const safeInterval = Math.max(1, Math.floor(Number(interval || 1)));
  if (unit === "Days") {
    const next = new Date(current); next.setDate(next.getDate() + safeInterval); return dateToISO(next);
  }
  if (unit === "Months") {
    const next = new Date(current); next.setMonth(next.getMonth() + safeInterval); return dateToISO(next);
  }
  const selected = normalizedDays(recurrenceDays);
  if (!selected.length) {
    const next = new Date(current); next.setDate(next.getDate() + safeInterval * 7); return dateToISO(next);
  }
  const anchor = parseDate(anchorDate) || current;
  const anchorWeek = mondayStart(anchor).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (let offset = 1; offset <= 370; offset += 1) {
    const candidate = new Date(current);
    candidate.setDate(candidate.getDate() + offset);
    if (!selected.includes(candidate.getDay())) continue;
    const weekDiff = Math.round((mondayStart(candidate).getTime() - anchorWeek) / weekMs);
    if (weekDiff >= 0 && weekDiff % safeInterval === 0) return dateToISO(candidate);
  }
  const fallback = new Date(current); fallback.setDate(fallback.getDate() + safeInterval * 7); return dateToISO(fallback);
}
function privateResponse() {
  return NextResponse.json({ ok: false, error: "This account does not have access to 4725." }, { status: 403 });
}

async function ensureHomeTables(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_home_records (
      property_id text NOT NULL,
      id text NOT NULL,
      record_type text NOT NULL,
      record jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (property_id, id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS atlas_home_records_property_type_idx ON atlas_home_records(property_id, record_type, updated_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_home_shares (
      id text PRIMARY KEY,
      property_id text NOT NULL,
      person text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      revoked_at timestamptz
    )
  `;
  await sql`ALTER TABLE atlas_home_shares ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'kid'`;
}

async function ensureWorkOrderColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_value date`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_initialized boolean NOT NULL DEFAULT false`;
  await sql`UPDATE atlas_work_orders SET due_date_value=date, due_date_initialized=true WHERE due_date_initialized=false`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_end_date date`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'Year-Round'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS last_completed_date date`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS completion_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS location_id text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS work_type text NOT NULL DEFAULT 'Work Order'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS work_category text NOT NULL DEFAULT 'Maintenance'`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS effort text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS responsibility_area text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS emoji text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS assigned_to text`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS notes_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS service_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb`;
}

async function ensureCalendarColumns(sql: ReturnType<typeof neon>) {
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS item_date date`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS time text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS end_time text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS category_label text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS color_id text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS color_name text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS repeat text NOT NULL DEFAULT 'None'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS reminder text NOT NULL DEFAULT 'None'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS linked_type text NOT NULL DEFAULT 'None'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS linked_id text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS linked_name text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS original_id text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS instance_id text`;
  await sql`ALTER TABLE atlas_calendar_items ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'Calendar Event'`;
}

async function canAccessHome(sql: ReturnType<typeof neon>, request: NextRequest) {
  const email = asString(request.headers.get("x-atlas-user-email")).toLowerCase();
  const role = asString(request.headers.get("x-atlas-user-role")).toLowerCase();
  if (!email) return false;
  if (email === HOME_OWNER_EMAIL || role === "master") return true;
  const rows = await sql`SELECT active, property_ids FROM atlas_team_access WHERE lower(email) = ${email} LIMIT 1`;
  const row = rows[0] as { active?: boolean; property_ids?: unknown } | undefined;
  if (!row || row.active === false) return false;
  const propertyIds = Array.isArray(row.property_ids) ? row.property_ids.map(String) : [];
  return propertyIds.includes(HOME_PROPERTY_ID);
}

async function seedCookbookOnce(sql: ReturnType<typeof neon>) {
  const markerRows = (await sql`SELECT id FROM atlas_home_records WHERE property_id = ${HOME_PROPERTY_ID} AND id = ${COOKBOOK_SEED_ID} LIMIT 1`) as unknown as Array<{ id: string }>;
  if (markerRows.length > 0) return;
  for (const seed of atlasHomeCookbookSeed) {
    const now = new Date().toISOString();
    const record = {
      id: seed.id, propertyId: HOME_PROPERTY_ID, recordType: "recipe", title: seed.title,
      code: seed.code, category: seed.category, meta: seed.meta, fullRecipe: seed.fullRecipe,
      ingredients: "", instructions: "", notes: "Imported from Nick's Meal Picker Cookbook.",
      favorite: false, createdAt: now, updatedAt: now,
    };
    await sql`
      INSERT INTO atlas_home_records (property_id,id,record_type,record,updated_at)
      VALUES (${HOME_PROPERTY_ID},${record.id},'recipe',${JSON.stringify(record)}::jsonb,NOW())
      ON CONFLICT (property_id,id) DO NOTHING
    `;
  }
  const marker = { id: COOKBOOK_SEED_ID, propertyId: HOME_PROPERTY_ID, recordType: "setting", title: "Cookbook imported", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await sql`
    INSERT INTO atlas_home_records (property_id,id,record_type,record,updated_at)
    VALUES (${HOME_PROPERTY_ID},${COOKBOOK_SEED_ID},'setting',${JSON.stringify(marker)}::jsonb,NOW())
    ON CONFLICT (property_id,id) DO NOTHING
  `;
}

async function publicShare(sql: ReturnType<typeof neon>, token: string): Promise<ShareRecord | undefined> {
  const rows = await sql`
    SELECT id, person, role FROM atlas_home_shares
    WHERE property_id = ${HOME_PROPERTY_ID} AND token_hash = ${tokenHash(token)} AND revoked_at IS NULL
    LIMIT 1
  `;
  return rows[0] as ShareRecord | undefined;
}

function mapWorkOrder(row: JsonRecord) {
  return {
    propertyId: HOME_PROPERTY_ID,
    id: asString(row.id),
    assetId: asString(row.asset_id),
    vendorId: asString(row.vendor_id),
    procedureId: asString(row.procedure_id),
    locationId: asString(row.location_id),
    date: dateKey(row.due_date_initialized ? row.due_date_value : row.date),
    title: asString(row.title),
    status: asString(row.status) || "Open",
    priority: asString(row.priority) || "Medium",
    notes: asString(row.notes),
    followUpDate: dateKey(row.follow_up_date),
    recurring: Boolean(row.recurring),
    recurrenceInterval: Math.max(1, Number(row.recurrence_interval || 1)),
    recurrenceUnit: asString(row.recurrence_unit) || "Weeks",
    recurrenceEndDate: dateKey(row.recurrence_end_date),
    season: asString(row.season) || "Year-Round",
    lastCompletedDate: dateKey(row.last_completed_date),
    completionHistory: asArray(row.completion_history),
    workType: asString(row.work_type) || "Work Order",
    workCategory: asString(row.work_category) || "Chore",
    effort: asString(row.effort),
    responsibilityArea: asString(row.responsibility_area) || "Family",
    emoji: asString(row.emoji),
    assignedTo: safePerson(row.assigned_to),
    checklist: asArray(row.checklist),
    notesHistory: asArray(row.notes_history),
    serviceHistory: asArray(row.service_history),
    photos: asArray(row.photos),
    documents: asArray(row.documents),
  };
}

async function loadWorkOrders(sql: ReturnType<typeof neon>) {
  await ensureWorkOrderColumns(sql);
  const rows = (await sql`
    SELECT id,asset_id,vendor_id,procedure_id,location_id,date,due_date_value,due_date_initialized,title,status,priority,notes,follow_up_date,
      recurring,recurrence_interval,recurrence_unit,recurrence_end_date,season,last_completed_date,completion_history,
      work_type,work_category,effort,responsibility_area,emoji,assigned_to,checklist,notes_history,service_history,photos,documents
    FROM atlas_work_orders
    WHERE property_id = ${HOME_PROPERTY_ID}
    ORDER BY (CASE WHEN due_date_initialized THEN due_date_value ELSE date END) ASC NULLS LAST, title ASC
  `) as unknown as JsonRecord[];
  return rows.map(mapWorkOrder);
}

async function loadHomeRecords(sql: ReturnType<typeof neon>, types?: HomeRecordType[]) {
  const rows = (await sql`
    SELECT record FROM atlas_home_records
    WHERE property_id = ${HOME_PROPERTY_ID}
      AND record_type <> 'setting'
    ORDER BY updated_at DESC
  `) as unknown as Array<{ record: HomeRecord }>;
  return rows.map((row) => row.record).filter((record) => !types || types.includes(record.recordType));
}

async function getChoreMeta(sql: ReturnType<typeof neon>, workOrderId: string) {
  const rows = (await sql`
    SELECT record FROM atlas_home_records
    WHERE property_id = ${HOME_PROPERTY_ID} AND record_type = 'chore_meta'
      AND (record->>'workOrderId') = ${workOrderId}
    ORDER BY updated_at DESC LIMIT 1
  `) as unknown as Array<{ record: HomeRecord }>;
  return rows[0]?.record;
}

async function saveHomeRecord(sql: ReturnType<typeof neon>, record: HomeRecord) {
  await sql`
    INSERT INTO atlas_home_records (property_id,id,record_type,record,updated_at)
    VALUES (${HOME_PROPERTY_ID},${record.id},${record.recordType},${JSON.stringify(record)}::jsonb,NOW())
    ON CONFLICT (property_id,id) DO UPDATE SET record_type = EXCLUDED.record_type, record = EXCLUDED.record, updated_at = NOW()
  `;
}

async function upsertFamilyWorkOrder(sql: ReturnType<typeof neon>, existingId: string | undefined, patch: JsonRecord) {
  await ensureWorkOrderColumns(sql);
  const id = existingId || `chore-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const existingRows = (await sql`
    SELECT id,title,status,priority,notes,date,due_date_value,due_date_initialized,recurring,recurrence_interval,recurrence_unit,recurrence_end_date,
      season,last_completed_date,completion_history,work_type,work_category,effort,responsibility_area,emoji,assigned_to,
      checklist,notes_history,service_history,photos,documents
    FROM atlas_work_orders WHERE property_id=${HOME_PROPERTY_ID} AND id=${id} LIMIT 1
  `) as unknown as JsonRecord[];
  const existing = existingRows[0] ? mapWorkOrder(existingRows[0]) : {};
  const merged = { ...existing, ...patch, id, propertyId: HOME_PROPERTY_ID } as JsonRecord;
  const title = asString(merged.title) || "Untitled Chore";
  const date = dateKey(merged.date) || null;
  const followUpDate = dateKey(merged.followUpDate) || null;
  const recurrenceEndDate = dateKey(merged.recurrenceEndDate) || null;
  const lastCompletedDate = dateKey(merged.lastCompletedDate) || null;
  const existingCheck = (await sql`SELECT id FROM atlas_work_orders WHERE property_id=${HOME_PROPERTY_ID} AND id=${id} LIMIT 1`) as unknown as JsonRecord[];
  if (existingCheck.length) {
    await sql`
      UPDATE atlas_work_orders SET
        date=COALESCE(${date}::date,date),due_date_value=${date}::date,due_date_initialized=true,title=${title},status=${asString(merged.status)||"Open"},priority=${asString(merged.priority)||"Medium"},
        notes=${asString(merged.notes)},follow_up_date=${followUpDate}::date,recurring=${asBoolean(merged.recurring)},
        recurrence_interval=${asPositiveInteger(merged.recurrenceInterval,1)},recurrence_unit=${asString(merged.recurrenceUnit)||"Weeks"},
        recurrence_end_date=${recurrenceEndDate}::date,season=${asString(merged.season)||"Year-Round"},last_completed_date=${lastCompletedDate}::date,
        completion_history=${JSON.stringify(asArray(merged.completionHistory))}::jsonb,work_type='Work Order',
        work_category=${asString(merged.workCategory)||`${asString(merged.emoji)||"⭐"} Chore`},effort=${asString(merged.effort)||null},
        responsibility_area='Family',emoji=${asString(merged.emoji)||"⭐"},assigned_to=${safePerson(merged.assignedTo)},
        checklist=${JSON.stringify(asArray(merged.checklist))}::jsonb,notes_history=${JSON.stringify(asArray(merged.notesHistory))}::jsonb,
        service_history=${JSON.stringify(asArray(merged.serviceHistory))}::jsonb,photos=${JSON.stringify(asArray(merged.photos))}::jsonb,
        documents=${JSON.stringify(asArray(merged.documents))}::jsonb,updated_at=NOW()
      WHERE property_id=${HOME_PROPERTY_ID} AND id=${id}
    `;
  } else {
    await sql`
      INSERT INTO atlas_work_orders (
        id,asset_id,vendor_id,procedure_id,location_id,date,due_date_value,due_date_initialized,title,status,notes,follow_up_date,priority,recurring,recurrence_interval,
        recurrence_unit,recurrence_end_date,season,last_completed_date,completion_history,work_type,work_category,effort,
        responsibility_area,emoji,assigned_to,checklist,notes_history,service_history,photos,documents,property_id
      ) VALUES (
        ${id},NULL,NULL,NULL,NULL,COALESCE(${date}::date,CURRENT_DATE),${date}::date,true,${title},${asString(merged.status)||"Open"},${asString(merged.notes)},${followUpDate}::date,
        ${asString(merged.priority)||"Medium"},${asBoolean(merged.recurring)},${asPositiveInteger(merged.recurrenceInterval,1)},
        ${asString(merged.recurrenceUnit)||"Weeks"},${recurrenceEndDate}::date,${asString(merged.season)||"Year-Round"},${lastCompletedDate}::date,
        ${JSON.stringify(asArray(merged.completionHistory))}::jsonb,'Work Order',${asString(merged.workCategory)||`${asString(merged.emoji)||"⭐"} Chore`},
        ${asString(merged.effort)||null},'Family',${asString(merged.emoji)||"⭐"},${safePerson(merged.assignedTo)},
        ${JSON.stringify(asArray(merged.checklist))}::jsonb,${JSON.stringify(asArray(merged.notesHistory))}::jsonb,
        ${JSON.stringify(asArray(merged.serviceHistory))}::jsonb,${JSON.stringify(asArray(merged.photos))}::jsonb,
        ${JSON.stringify(asArray(merged.documents))}::jsonb,${HOME_PROPERTY_ID}
      )
    `;
  }
  const rows = await loadWorkOrders(sql);
  return rows.find((record) => record.id === id)!;
}

async function syncChoreCalendar(sql: ReturnType<typeof neon>, workOrder: JsonRecord, meta: HomeRecord) {
  await ensureCalendarColumns(sql);
  const workOrderId = asString(workOrder.id || meta.workOrderId);
  if (!workOrderId) return;
  await sql`
    DELETE FROM atlas_calendar_items
    WHERE property_id=${HOME_PROPERTY_ID} AND linked_id=${workOrderId}
      AND source IN ('home-chore-extra','home-chore')
  `;
  if (!asBoolean(workOrder.recurring) || asString(workOrder.recurrenceUnit) !== "Weeks") return;
  const selectedDays = normalizedDays(meta.recurrenceDays);
  if (selectedDays.length <= 1) return;
  const start = parseDate(workOrder.date);
  if (!start) return;
  const interval = asPositiveInteger(workOrder.recurrenceInterval, 1);
  const anchor = parseDate(meta.recurrenceAnchorDate) || start;
  const anchorWeek = mondayStart(anchor).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const skipped = new Set((meta.skippedDates || []).map(dateKey));
  const coreWeekday = start.getDay();
  const until = new Date(start); until.setMonth(until.getMonth() + 18);
  for (let cursor = new Date(start); cursor <= until; cursor.setDate(cursor.getDate() + 1)) {
    if (!selectedDays.includes(cursor.getDay()) || cursor.getDay() === coreWeekday) continue;
    const weekDiff = Math.round((mondayStart(cursor).getTime() - anchorWeek) / weekMs);
    if (weekDiff < 0 || weekDiff % interval !== 0) continue;
    const key = dateToISO(cursor);
    if (key < dateKey(workOrder.date) || skipped.has(key)) continue;
    const id = `home-chore-extra-${workOrderId}-${key}`;
    const person = safePerson(workOrder.assignedTo);
    const emoji = asString(meta.emoji || workOrder.emoji) || "⭐";
    const points = Math.max(0, Number(meta.points || 0));
    const title = `${emoji} ${asString(workOrder.title) || "Chore"}`;
    const notes = [`Assigned to: ${person}`, points ? `Reward: ${points} points` : "", asString(workOrder.notes)].filter(Boolean).join(" · ");
    await sql`
      INSERT INTO atlas_calendar_items (
        id,date,item_date,time,end_time,title,area,category_label,color_id,color_name,all_day,repeat,reminder,notes,
        linked_type,linked_id,linked_name,completed,source,event_type,property_id
      ) VALUES (
        ${id},${key}::date,${key}::date,'','',${title},${person},'Chore','home-chore','blue',true,'None','None',${notes},
        'Work Order',${workOrderId},${asString(workOrder.title)},false,'home-chore-extra','Work Order',${HOME_PROPERTY_ID}
      )
      ON CONFLICT (id) DO UPDATE SET item_date=EXCLUDED.item_date,date=EXCLUDED.date,title=EXCLUDED.title,area=EXCLUDED.area,
        notes=EXCLUDED.notes,linked_name=EXCLUDED.linked_name,property_id=EXCLUDED.property_id
    `;
  }
}

async function deleteChoreExtras(sql: ReturnType<typeof neon>, workOrderId: string) {
  await ensureCalendarColumns(sql);
  await sql`DELETE FROM atlas_calendar_items WHERE property_id=${HOME_PROPERTY_ID} AND linked_id=${workOrderId} AND source IN ('home-chore-extra','home-chore')`;
}

async function scheduleMeal(sql: ReturnType<typeof neon>, body: JsonRecord) {
  await ensureCalendarColumns(sql);
  const recipeId = asString(body.recipeId);
  const title = asString(body.title);
  const date = dateKey(body.date);
  if (!recipeId || !title || !date) throw new Error("Recipe, title, and date are required.");
  const person = safePerson(body.person);
  const time = asString(body.time);
  const id = `home-meal-${recipeId}-${date}-${Date.now()}-${randomBytes(3).toString("hex")}`;
  await sql`
    INSERT INTO atlas_calendar_items (
      id,date,item_date,time,end_time,title,area,category_label,color_id,color_name,all_day,repeat,reminder,notes,
      linked_type,linked_id,linked_name,completed,source,event_type,property_id
    ) VALUES (
      ${id},${date}::date,${date}::date,${time},'',${`🍽️ ${title}`},${person},'Meal','home-meal','orange',${!time},'None','None',
      ${`Meal for ${person}`},'None',${recipeId},${title},false,'manual','Calendar Event',${HOME_PROPERTY_ID}
    )
  `;
  return { id, date, title, person, time };
}

function calendarRow(row: JsonRecord) {
  return {
    id: asString(row.id), date: dateKey(row.item_date || row.date), time: asString(row.time), endTime: asString(row.end_time),
    title: asString(row.title), area: asString(row.area), categoryLabel: asString(row.category_label), notes: asString(row.notes),
    eventType: asString(row.event_type) || "Calendar Event", completed: Boolean(row.completed), linkedId: asString(row.linked_id),
  };
}
function calendarVisibleToPerson(item: ReturnType<typeof calendarRow>, person: FamilyPerson) {
  if (person === "Chelsea") return true;
  const haystack = `${item.area} ${item.notes} ${item.title}`.toLowerCase();
  return item.area === "Family" || item.area === person || haystack.includes(`assigned to: ${person.toLowerCase()}`) || haystack.includes(`for ${person.toLowerCase()}`);
}

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureHomeTables(sql);
    await ensureCalendarColumns(sql);
    const token = asString(request.nextUrl.searchParams.get("token"));
    if (token) {
      const share = await publicShare(sql, token);
      if (!share) return NextResponse.json({ ok: false, error: "This family link is invalid or has been revoked." }, { status: 403 });
      const person = safePerson(share.person);
      const role = asString(share.role) || (person === "Chelsea" ? "manager" : "kid");
      const workOrders = await loadWorkOrders(sql);
      const homeRecords = await loadHomeRecords(sql, ["goal", "chore_meta"]);
      const metaById = new Map(homeRecords.filter((record) => record.recordType === "chore_meta").map((record) => [asString(record.workOrderId), record]));
      const mergedChores = workOrders.map((record) => {
        const meta = metaById.get(record.id);
        return { ...record, recordType: "chore", person: safePerson(record.assignedTo), points: Number(meta?.points || 0), emoji: asString(meta?.emoji || record.emoji) || "⭐", recurrenceDays: normalizedDays(meta?.recurrenceDays), recurrenceAnchorDate: asString(meta?.recurrenceAnchorDate), skippedDates: asArray(meta?.skippedDates) };
      });
      const visibleChores = role === "manager" ? mergedChores : mergedChores.filter((record) => safePerson(record.assignedTo) === person || safePerson(record.assignedTo) === "Family");
      const visibleGoals = homeRecords.filter((record) => record.recordType === "goal" && (role === "manager" || asString(record.person) === person));
      const calendarRows = (await sql`
        SELECT id,item_date,date,time,end_time,title,area,category_label,notes,event_type,completed,linked_id
        FROM atlas_calendar_items WHERE property_id=${HOME_PROPERTY_ID} ORDER BY item_date ASC,time ASC
      `) as unknown as JsonRecord[];
      const calendar = calendarRows.map(calendarRow).filter((item) => role === "manager" || calendarVisibleToPerson(item, person));
      return NextResponse.json({ ok: true, person, role, records: [...visibleChores, ...visibleGoals], calendar });
    }

    const propertyId = asString(request.nextUrl.searchParams.get("propertyId"));
    if (propertyId !== HOME_PROPERTY_ID) return NextResponse.json({ ok: false, error: "Unknown home property." }, { status: 404 });
    if (!(await canAccessHome(sql, request))) return privateResponse();
    await seedCookbookOnce(sql);
    const records = await loadHomeRecords(sql);
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not load 4725." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureHomeTables(sql);
    const body = (await request.json()) as HomeRecord & JsonRecord;
    if (!(await canAccessHome(sql, request))) return privateResponse();

    if (body.action === "createShare") {
      if (asString(body.propertyId) !== HOME_PROPERTY_ID) return NextResponse.json({ ok: false, error: "Invalid property." }, { status: 400 });
      const person = safePerson(body.person);
      if (!(["Chelsea","Cooper","Leni"] as string[]).includes(person)) return NextResponse.json({ ok: false, error: "Family link is only available for Chelsea, Cooper, or Leni." }, { status: 400 });
      const role = person === "Chelsea" ? "manager" : "kid";
      const token = randomBytes(32).toString("hex");
      const id = `family-share-${Date.now()}-${randomBytes(4).toString("hex")}`;
      await sql`INSERT INTO atlas_home_shares (id,property_id,person,role,token_hash) VALUES (${id},${HOME_PROPERTY_ID},${person},${role},${tokenHash(token)})`;
      return NextResponse.json({ ok: true, token, person, role });
    }

    if (body.action === "scheduleMeal") {
      if (asString(body.propertyId) !== HOME_PROPERTY_ID) return NextResponse.json({ ok: false, error: "Invalid property." }, { status: 400 });
      const calendarItem = await scheduleMeal(sql, body);
      return NextResponse.json({ ok: true, calendarItem });
    }

    if (body.action === "syncChore") {
      if (asString(body.propertyId) !== HOME_PROPERTY_ID) return NextResponse.json({ ok: false, error: "Invalid property." }, { status: 400 });
      const workOrder = body.workOrder && typeof body.workOrder === "object" ? body.workOrder as JsonRecord : {};
      const meta = body.meta && typeof body.meta === "object" ? body.meta as HomeRecord : null;
      if (!asString(workOrder.id) || !meta) return NextResponse.json({ ok: false, error: "Chore sync requires a work order and metadata." }, { status: 400 });
      await syncChoreCalendar(sql, workOrder, meta);
      return NextResponse.json({ ok: true });
    }

    const id = asString(body.id);
    const title = asString(body.title);
    const propertyId = asString(body.propertyId);
    const recordType = asString(body.recordType) as HomeRecordType;
    const allowedTypes: HomeRecordType[] = ["recipe", "goal", "setting", "chore_meta", "chore"];
    if (propertyId !== HOME_PROPERTY_ID || !id || !title || !allowedTypes.includes(recordType)) return NextResponse.json({ ok: false, error: "Invalid 4725 record." }, { status: 400 });
    const record: HomeRecord = { ...body, action: undefined, propertyId: HOME_PROPERTY_ID, id, title, recordType, updatedAt: new Date().toISOString() };
    await saveHomeRecord(sql, record);
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not save 4725." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sql = getSql();
    await ensureHomeTables(sql);
    await ensureWorkOrderColumns(sql);
    await ensureCalendarColumns(sql);
    const body = (await request.json()) as JsonRecord;
    const token = asString(body.token);
    const share = token ? await publicShare(sql, token) : undefined;
    if (!share) return NextResponse.json({ ok: false, error: "Invalid family link." }, { status: 403 });
    const person = safePerson(share.person);
    const role = asString(share.role) || (person === "Chelsea" ? "manager" : "kid");
    const action = asString(body.action) || "completeChore";

    if (action === "completeChore") {
      const choreId = asString(body.choreId);
      const workOrders = await loadWorkOrders(sql);
      const chore = workOrders.find((record) => record.id === choreId);
      if (!chore) return NextResponse.json({ ok: false, error: "Chore not found." }, { status: 404 });
      const assigned = safePerson(chore.assignedTo);
      if (role !== "manager" && assigned !== person && assigned !== "Family") return NextResponse.json({ ok: false, error: "This chore is assigned to someone else." }, { status: 403 });
      const meta = await getChoreMeta(sql, choreId) || { id: `chore-meta-${choreId}`, propertyId: HOME_PROPERTY_ID, recordType: "chore_meta", title: chore.title, workOrderId: choreId, points: 0, emoji: chore.emoji || "⭐", recurrenceDays: [], recurrenceAnchorDate: chore.date, skippedDates: [] } as HomeRecord;
      const completedAt = new Date().toISOString();
      const history = [completedAt, ...asArray(chore.completionHistory)];
      const patch: JsonRecord = { ...chore, completionHistory: history, lastCompletedDate: dateKey(completedAt) };
      if (chore.recurring) patch.date = nextOccurrence(chore.date || dateKey(completedAt), asPositiveInteger(chore.recurrenceInterval,1), asString(chore.recurrenceUnit)||"Weeks", normalizedDays(meta.recurrenceDays), asString(meta.recurrenceAnchorDate)||chore.date); else patch.status = "Completed";
      const saved = await upsertFamilyWorkOrder(sql, choreId, patch);
      const points = Math.max(0, Number(meta.points || 0));
      if (points && assigned !== "Family") {
        const goalRows = (await sql`SELECT record FROM atlas_home_records WHERE property_id=${HOME_PROPERTY_ID} AND record_type='goal' AND record->>'person'=${assigned} ORDER BY updated_at DESC LIMIT 1`) as unknown as Array<{ record: HomeRecord }>;
        const goal = goalRows[0]?.record;
        if (goal) await saveHomeRecord(sql, { ...goal, currentAmount: Number(goal.currentAmount || 0) + points, updatedAt: completedAt } as HomeRecord);
      }
      await syncChoreCalendar(sql, saved, meta);
      return NextResponse.json({ ok: true, record: { ...saved, points, recurrenceDays: normalizedDays(meta.recurrenceDays) } });
    }

    if (action === "skipChore") {
      if (role !== "manager") return NextResponse.json({ ok: false, error: "Only a family manager can skip chores." }, { status: 403 });
      const choreId = asString(body.choreId);
      const workOrders = await loadWorkOrders(sql);
      const chore = workOrders.find((record) => record.id === choreId);
      if (!chore) return NextResponse.json({ ok: false, error: "Chore not found." }, { status: 404 });
      if (!chore.recurring) return NextResponse.json({ ok: false, error: "Only recurring chores can be skipped." }, { status: 400 });
      const meta = await getChoreMeta(sql, choreId) || { id: `chore-meta-${choreId}`, propertyId: HOME_PROPERTY_ID, recordType: "chore_meta", title: chore.title, workOrderId: choreId, points: 0, emoji: chore.emoji || "⭐", recurrenceDays: [], recurrenceAnchorDate: chore.date, skippedDates: [] } as HomeRecord;
      const skippedDate = dateKey(chore.date) || dateKey(new Date());
      const nextDate = nextOccurrence(skippedDate, asPositiveInteger(chore.recurrenceInterval, 1), asString(chore.recurrenceUnit) || "Weeks", normalizedDays(meta.recurrenceDays), asString(meta.recurrenceAnchorDate) || skippedDate);
      const nextMeta = { ...meta, skippedDates: Array.from(new Set([...(meta.skippedDates || []).map(dateKey), skippedDate])).filter(Boolean), updatedAt: new Date().toISOString() } as HomeRecord;
      await saveHomeRecord(sql, nextMeta);
      const saved = await upsertFamilyWorkOrder(sql, choreId, { ...chore, status: "Open", date: nextDate });
      await syncChoreCalendar(sql, saved, nextMeta);
      return NextResponse.json({ ok: true, record: { ...saved, points: Number(nextMeta.points || 0), recurrenceDays: normalizedDays(nextMeta.recurrenceDays) }, meta: nextMeta });
    }

    if (role !== "manager") return NextResponse.json({ ok: false, error: "This family link can complete assigned chores but cannot manage the family schedule." }, { status: 403 });

    if (action === "saveChore") {
      const patch = body.chore && typeof body.chore === "object" ? body.chore as JsonRecord : {};
      const metaInput = body.meta && typeof body.meta === "object" ? body.meta as JsonRecord : {};
      const choreId = asString(patch.id) || undefined;
      patch.assignedTo = safePerson(patch.assignedTo);
      patch.responsibilityArea = "Family";
      patch.workType = "Work Order";
      patch.workCategory = `${asString(patch.emoji) || "⭐"} Chore`;
      const recurrenceDays = normalizedDays(metaInput.recurrenceDays);
      if (asBoolean(patch.recurring) && asString(patch.recurrenceUnit || "Weeks") === "Weeks" && recurrenceDays.length) {
        patch.date = alignedRecurrenceStart(patch.date, recurrenceDays);
        metaInput.recurrenceAnchorDate = dateKey(metaInput.recurrenceAnchorDate) || dateKey(patch.date);
      }
      const saved = await upsertFamilyWorkOrder(sql, choreId, patch);
      const existingMeta = await getChoreMeta(sql, saved.id);
      const now = new Date().toISOString();
      const meta: HomeRecord = {
        ...(existingMeta || {}), ...metaInput,
        id: existingMeta?.id || `chore-meta-${saved.id}`, propertyId: HOME_PROPERTY_ID, recordType: "chore_meta",
        title: saved.title, workOrderId: saved.id, emoji: asString(metaInput.emoji || saved.emoji) || "⭐",
        points: Math.max(0, Number(metaInput.points || existingMeta?.points || 0)), recurrenceDays: normalizedDays(metaInput.recurrenceDays || existingMeta?.recurrenceDays),
        recurrenceAnchorDate: dateKey(metaInput.recurrenceAnchorDate || existingMeta?.recurrenceAnchorDate || saved.date),
        skippedDates: asArray(metaInput.skippedDates || existingMeta?.skippedDates).map(dateKey).filter(Boolean), createdAt: asString(existingMeta?.createdAt) || now, updatedAt: now,
      };
      await saveHomeRecord(sql, meta);
      await syncChoreCalendar(sql, saved, meta);
      return NextResponse.json({ ok: true, record: { ...saved, points: meta.points, recurrenceDays: meta.recurrenceDays }, meta });
    }

    if (action === "deleteChore") {
      const choreId = asString(body.choreId);
      if (!choreId) return NextResponse.json({ ok: false, error: "Chore id is required." }, { status: 400 });
      await sql`DELETE FROM atlas_work_orders WHERE property_id=${HOME_PROPERTY_ID} AND id=${choreId}`;
      await sql`DELETE FROM atlas_home_records WHERE property_id=${HOME_PROPERTY_ID} AND record_type='chore_meta' AND record->>'workOrderId'=${choreId}`;
      await deleteChoreExtras(sql, choreId);
      return NextResponse.json({ ok: true });
    }

    if (action === "saveCalendar") {
      const item = body.item && typeof body.item === "object" ? body.item as JsonRecord : {};
      const id = asString(item.id) || `family-event-${Date.now()}-${randomBytes(4).toString("hex")}`;
      const date = dateKey(item.date);
      const title = asString(item.title);
      if (!date || !title) return NextResponse.json({ ok: false, error: "Event title and date are required." }, { status: 400 });
      const area = safePerson(item.area || item.person);
      const category = asString(item.categoryLabel) || "Family";
      await sql`
        INSERT INTO atlas_calendar_items (id,date,item_date,time,end_time,title,area,category_label,color_id,color_name,all_day,repeat,reminder,notes,linked_type,linked_id,linked_name,completed,source,event_type,property_id)
        VALUES (${id},${date}::date,${date}::date,${asString(item.time)},${asString(item.endTime)},${title},${area},${category},'family','blue',${!asString(item.time)},'None','None',${asString(item.notes)},'None',NULL,NULL,false,'manual','Calendar Event',${HOME_PROPERTY_ID})
        ON CONFLICT (id) DO UPDATE SET date=EXCLUDED.date,item_date=EXCLUDED.item_date,time=EXCLUDED.time,end_time=EXCLUDED.end_time,title=EXCLUDED.title,area=EXCLUDED.area,category_label=EXCLUDED.category_label,notes=EXCLUDED.notes,property_id=EXCLUDED.property_id
      `;
      return NextResponse.json({ ok: true, item: { id, date, title, area, categoryLabel: category, time: asString(item.time), endTime: asString(item.endTime), notes: asString(item.notes) } });
    }

    if (action === "deleteCalendar") {
      const id = asString(body.id);
      await sql`DELETE FROM atlas_calendar_items WHERE property_id=${HOME_PROPERTY_ID} AND id=${id} AND source='manual'`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unsupported family action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not update family board." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const propertyId = asString(request.nextUrl.searchParams.get("propertyId"));
    const id = asString(request.nextUrl.searchParams.get("id"));
    if (propertyId !== HOME_PROPERTY_ID || !id) return NextResponse.json({ ok: false, error: "Invalid delete request." }, { status: 400 });
    const sql = getSql();
    await ensureHomeTables(sql);
    if (!(await canAccessHome(sql, request))) return privateResponse();
    const rows = (await sql`SELECT record_type,record FROM atlas_home_records WHERE property_id=${HOME_PROPERTY_ID} AND id=${id} LIMIT 1`) as unknown as Array<{ record_type?: string; record?: HomeRecord }>;
    await sql`DELETE FROM atlas_home_records WHERE property_id=${HOME_PROPERTY_ID} AND id=${id}`;
    if (rows[0]?.record_type === "chore_meta") {
      const workOrderId = asString(rows[0]?.record?.workOrderId);
      if (workOrderId) await deleteChoreExtras(sql, workOrderId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not delete 4725 record." }, { status: 500 });
  }
}
