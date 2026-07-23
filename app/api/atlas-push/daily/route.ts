import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { sendAtlasPush } from "../../../lib/server/atlas-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSql() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing DATABASE_URL");
  return neon(databaseUrl);
}

function pacificDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || "";
  if (
    cronSecret &&
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const sql = getSql();
    const today = pacificDateKey();
    const workRows = await sql`
      SELECT property_id, title, date, priority
      FROM atlas_work_orders
      WHERE status NOT IN ('Completed', 'Closed', 'Cancelled')
        AND (
          date <= ${today}::date
          OR priority = 'High'
        )
      ORDER BY date ASC NULLS LAST
      LIMIT 30
    `;
    const partRows = await sql`
      SELECT property_id, name, quantity, min_quantity
      FROM atlas_parts
      WHERE quantity <= min_quantity
      ORDER BY quantity ASC, name ASC
      LIMIT 20
    `;

    const due = workRows.filter((row) => String(row.date || "").slice(0, 10) === today);
    const overdue = workRows.filter(
      (row) => row.date && String(row.date).slice(0, 10) < today,
    );
    const high = workRows.filter((row) => row.priority === "High");
    const summary = [
      due.length ? `${due.length} due today` : "",
      overdue.length ? `${overdue.length} overdue` : "",
      high.length ? `${high.length} high priority` : "",
      partRows.length ? `${partRows.length} low-stock parts` : "",
    ].filter(Boolean);

    if (!summary.length) {
      return NextResponse.json({ ok: true, sent: 0, message: "Nothing due." });
    }

    const result = await sendAtlasPush({
      title: "Atlas Daily Property Brief",
      body: summary.join(" · "),
      url: "/#dashboard",
      tag: `atlas-daily-${today}`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Daily notifications could not run." },
      { status: 500 },
    );
  }
}

