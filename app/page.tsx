import type { CSSProperties } from "react";
import { neon } from "@neondatabase/serverless";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

type LocationRow = {
  name: string;
  sort_order: number;
};

type AssetRow = {
  name: string;
  asset_type: string | null;
  criticality: string | null;
};

type TemplateRow = {
  title: string;
  category: string | null;
  recurrence_type: string | null;
  recurrence_rule: string | null;
};

async function getLocationCount() {
  const rows = await sql`
    select count(*)::int as count
    from locations
    where property_id = (select id from properties where name = '2000')
  `;

  return Number(rows[0]?.count ?? 0);
}

async function getAssetCount() {
  const rows = await sql`
    select count(*)::int as count
    from assets
    where "userId" = 'atlas'
      and property_id = (select id from properties where name = '2000')
  `;

  return Number(rows[0]?.count ?? 0);
}

async function getVendorCount() {
  const rows = await sql`
    select count(*)::int as count
    from vendors
    where "userId" = 'atlas'
      and property_id = (select id from properties where name = '2000')
  `;

  return Number(rows[0]?.count ?? 0);
}

async function getProcedureCount() {
  const rows = await sql`
    select count(*)::int as count
    from procedures
    where "userId" = 'atlas'
      and property_id = (select id from properties where name = '2000')
  `;

  return Number(rows[0]?.count ?? 0);
}

async function getTemplateCount() {
  const rows = await sql`
    select count(*)::int as count
    from work_order_templates
    where "userId" = 'atlas'
      and property_id = (select id from properties where name = '2000')
  `;

  return Number(rows[0]?.count ?? 0);
}

async function getLocations() {
  const rows = await sql`
    select name, sort_order
    from locations
    where property_id = (select id from properties where name = '2000')
    order by sort_order asc
    limit 12
  `;

  return rows as unknown as LocationRow[];
}

async function getAssets() {
  const rows = await sql`
    select name, asset_type, criticality
    from assets
    where "userId" = 'atlas'
      and property_id = (select id from properties where name = '2000')
    order by name asc
    limit 10
  `;

  return rows as unknown as AssetRow[];
}

async function getWorkTemplates() {
  const rows = await sql`
    select title, category, recurrence_type, recurrence_rule
    from work_order_templates
    where "userId" = 'atlas'
      and property_id = (select id from properties where name = '2000')
    order by title asc
    limit 12
  `;

  return rows as unknown as TemplateRow[];
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/signin");
  }

  const [
    locationCount,
    assetCount,
    vendorCount,
    procedureCount,
    templateCount,
    locations,
    assets,
    templates,
  ] = await Promise.all([
    getLocationCount(),
    getAssetCount(),
    getVendorCount(),
    getProcedureCount(),
    getTemplateCount(),
    getLocations(),
    getAssets(),
    getWorkTemplates(),
  ]);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.badge}>ATLAS / 2000</div>
        <h1 style={styles.title}>Estate Operations Dashboard</h1>
        <p style={styles.subtitle}>
          Live operating system for 2000: locations, assets, vendors, procedures,
          and recurring work.
        </p>
      </section>

      <section style={styles.grid}>
        <Stat label="Locations" value={locationCount} />
        <Stat label="Assets" value={assetCount} />
        <Stat label="Vendors" value={vendorCount} />
        <Stat label="Procedures" value={procedureCount} />
        <Stat label="Work Templates" value={templateCount} />
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Recurring Work</h2>
        <div style={styles.list}>
          {templates.map((item) => (
            <div key={item.title} style={styles.row}>
              <div>
                <strong>{item.title}</strong>
                <p style={styles.small}>
                  {item.category || "Work"} · {item.recurrence_type || "scheduled"}
                </p>
              </div>
              <span style={styles.tag}>
                {item.recurrence_rule || "As needed"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.twoColumn}>
        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Locations</h2>
          <div style={styles.list}>
            {locations.map((item) => (
              <div key={item.name} style={styles.row}>
                <strong>
                  {item.sort_order}. {item.name}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Core Assets</h2>
          <div style={styles.list}>
            {assets.map((item) => (
              <div key={item.name} style={styles.row}>
                <div>
                  <strong>{item.name}</strong>
                  <p style={styles.small}>
                    {item.asset_type || "Asset"} · {item.criticality || "normal"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.card}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07111f",
    color: "white",
    padding: "28px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  hero: {
    background: "linear-gradient(135deg, #0f2544, #123b32)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "24px",
    padding: "28px",
    marginBottom: "22px",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(163,230,53,0.16)",
    color: "#bef264",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginBottom: "14px",
  },
  title: {
    fontSize: "34px",
    lineHeight: 1,
    margin: "0 0 12px",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: "16px",
    margin: 0,
    maxWidth: "760px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },
  card: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "18px",
    padding: "18px",
  },
  statValue: {
    fontSize: "34px",
    fontWeight: 900,
  },
  statLabel: {
    color: "#94a3b8",
    marginTop: "4px",
  },
  panel: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "22px",
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "18px",
  },
  sectionTitle: {
    fontSize: "22px",
    margin: "0 0 14px",
  },
  list: {
    display: "grid",
    gap: "10px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    padding: "13px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
  },
  small: {
    color: "#94a3b8",
    margin: "4px 0 0",
    fontSize: "13px",
  },
  tag: {
    whiteSpace: "nowrap",
    color: "#bef264",
    background: "rgba(163,230,53,0.12)",
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "12px",
  },
};
