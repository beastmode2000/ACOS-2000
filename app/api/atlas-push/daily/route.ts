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

    if (!workRows.length && !partRows.length) {
      return NextResponse.json({ ok: true, sent: 0, message: "Nothing due." });
    }

    const results = [];
    const propertyIds = Array.from(
      new Set(
        [...workRows, ...partRows]
          .map((row) => String(row.property_id || "2000"))
          .filter(Boolean),
      ),
    );

    for (const propertyId of propertyIds) {
      const propertyWork = workRows.filter(
        (row) => String(row.property_id || "2000") === propertyId,
      );
      const propertyParts = partRows.filter(
        (row) => String(row.property_id || "2000") === propertyId,
      );
      const due = propertyWork.filter(
        (row) => String(row.date || "").slice(0, 10) === today,
      );
      const overdue = propertyWork.filter(
        (row) => row.date && String(row.date).slice(0, 10) < today,
      );
      const high = propertyWork.filter((row) => row.priority === "High");
      const workSummary = [
        due.length ? `${due.length} due today` : "",
        overdue.length ? `${overdue.length} overdue` : "",
        high.length ? `${high.length} high priority` : "",
      ].filter(Boolean);

      if (workSummary.length) {
        results.push(
          await sendAtlasPush(
            {
              title: `Atlas ${propertyId} Work Brief`,
              body: workSummary.join(" · "),
              url: "/#history",
              tag: `atlas-daily-work-${propertyId}-${today}`,
              category: "work",
            },
            propertyId,
          ),
        );
      }
      if (propertyParts.length) {
        results.push(
          await sendAtlasPush(
            {
              title: `Atlas ${propertyId} Inventory`,
              body: `${propertyParts.length} low or out-of-stock part${
                propertyParts.length === 1 ? "" : "s"
              } need review.`,
              url: "/#parts",
              tag: `atlas-daily-inventory-${propertyId}-${today}`,
              category: "inventory",
            },
            propertyId,
          ),
        );
      }
    }
    return NextResponse.json({
      ok: true,
      sent: results.reduce((total, result) => total + result.sent, 0),
      failed: results.reduce((total, result) => total + result.failed, 0),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Daily notifications could not run." },
      { status: 500 },
    );
  }
}
