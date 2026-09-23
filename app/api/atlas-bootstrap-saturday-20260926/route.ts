import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSql() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  return neon(connectionString);
}

const workOrderId = "event-prep-2026-09-26";

const checklist = [
  { id: "event-prep-painters", text: "Store all painter equipment, ladders, drop cloths, tools, and materials after cleanup", completed: false },
  { id: "event-prep-front-sweep", text: "Sweep/blow front entrance and arrival walk", completed: false },
  { id: "event-prep-front-windows", text: "Clean/check front entrance windows and glass", completed: false },
  { id: "event-prep-front-webs", text: "Remove webs around front entrance", completed: false },
  { id: "event-prep-weeds", text: "Remove visible weeds around front entrance, courtyard, back patio, and parking areas", completed: false },
  { id: "event-prep-leaves", text: "Remove leaves from front entrance, courtyard, back patio, and parking areas", completed: false },
  { id: "event-prep-courtyard", text: "Sweep/blow courtyard", completed: false },
  { id: "event-prep-courtyard-table", text: "Wipe and straighten courtyard table/furniture", completed: false },
  { id: "event-prep-courtyard-cushions", text: "Set and straighten courtyard cushions", completed: false },
  { id: "event-prep-courtyard-heaters", text: "Check courtyard heaters and make sure they are guest-ready", completed: false },
  { id: "event-prep-skylights", text: "Clean/check skylights", completed: false },
  { id: "event-prep-bbq", text: "Clean and straighten BBQ area", completed: false },
  { id: "event-prep-back-table", text: "Wipe and straighten back patio tables/furniture", completed: false },
  { id: "event-prep-back-cushions", text: "Set and straighten back patio cushions", completed: false },
  { id: "event-prep-back-heaters", text: "Check back patio heaters and make sure they are guest-ready", completed: false },
  { id: "event-prep-back-webs", text: "Remove webs around back patio / BBQ area", completed: false },
  { id: "event-prep-parking", text: "Blow/sweep parking and arrival areas and remove contractor clutter", completed: false },
  { id: "event-prep-final", text: "Final walkthrough: front entrance → courtyard → back patio → parking before guests arrive", completed: false },
];

export async function GET() {
  try {
    const sql = getSql();

    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS property_id text NOT NULL DEFAULT '2000'`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_value date`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS due_date_initialized boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium'`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_unit text NOT NULL DEFAULT 'Weeks'`;
    await sql`ALTER TABLE atlas_work_orders ADD COLUMN IF NOT EXISTS recurrence_days jsonb NOT NULL DEFAULT '[]'::jsonb`;
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

    const existing = await sql`
      SELECT id, checklist
      FROM atlas_work_orders
      WHERE id = ${workOrderId}
        AND property_id = '2000'
      LIMIT 1
    `;

    if (existing.length) {
      return NextResponse.json({
        ok: true,
        created: false,
        id: workOrderId,
        checklistCount: Array.isArray(existing[0]?.checklist) ? existing[0].checklist.length : 0,
      });
    }

    await sql`
      INSERT INTO atlas_work_orders (
        id, asset_id, vendor_id, procedure_id, location_id,
        date, due_date_value, due_date_initialized,
        title, status, priority, notes, follow_up_date,
        recurring, recurrence_interval, recurrence_unit, recurrence_days,
        recurrence_end_date, season, last_completed_date, completion_history,
        work_type, work_category, effort, responsibility_area, emoji,
        assigned_to, checklist, notes_history, service_history,
        photos, documents, updated_at, property_id
      ) VALUES (
        ${workOrderId}, NULL, NULL, NULL, NULL,
        '2026-09-26'::date, '2026-09-26'::date, true,
        'Saturday Event Prep', 'Open', 'High',
        'Two events at the house Saturday. Guests will use the front entrance. Painter equipment must be fully stored after cleanup. Prepare the front entrance, courtyard, back patio/BBQ, and parking/arrival areas in case guests use the outdoor spaces.',
        NULL,
        false, 1, 'Weeks', '[]'::jsonb,
        NULL, 'Year-Round', NULL, '[]'::jsonb,
        'Work Order', 'Event Prep', 'Half Day', 'Saturday Event Prep', NULL,
        'Nick', ${JSON.stringify(checklist)}::jsonb, '[]'::jsonb, '[]'::jsonb,
        '[]'::jsonb, '[]'::jsonb, NOW(), '2000'
      )
    `;

    return NextResponse.json({
      ok: true,
      created: true,
      id: workOrderId,
      checklistCount: checklist.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Saturday event prep could not be created." },
      { status: 500 },
    );
  }
}
