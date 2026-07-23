import { neon } from "@neondatabase/serverless";
import webPush from "web-push";

export type AtlasPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function getSql() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing DATABASE_URL");
  return neon(databaseUrl);
}

export async function ensurePushSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS atlas_push_subscriptions (
      endpoint text PRIMARY KEY,
      subscription jsonb NOT NULL,
      property_id text NOT NULL DEFAULT 'all',
      user_agent text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_ATLAS_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.ATLAS_VAPID_PRIVATE_KEY || "";
  const subject =
    process.env.ATLAS_VAPID_SUBJECT || "mailto:atlas@atlas2000.com";
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendAtlasPush(
  payload: AtlasPushPayload,
  propertyId = "all",
) {
  if (!configureWebPush()) return { sent: 0, failed: 0, configured: false };

  await ensurePushSchema();
  const sql = getSql();
  const rows =
    propertyId === "all"
      ? await sql`SELECT endpoint, subscription FROM atlas_push_subscriptions`
      : await sql`
          SELECT endpoint, subscription
          FROM atlas_push_subscriptions
          WHERE property_id = 'all' OR property_id = ${propertyId}
        `;

  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webPush.sendNotification(
          row.subscription as webPush.PushSubscription,
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error: any) {
        failed += 1;
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await sql`
            DELETE FROM atlas_push_subscriptions
            WHERE endpoint = ${String(row.endpoint)}
          `;
        }
      }
    }),
  );

  return { sent, failed, configured: true };
}

