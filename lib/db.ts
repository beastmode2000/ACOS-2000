import { Pool } from "pg"

// Shared Postgres connection pool used by both Better Auth and any raw SQL
// (e.g. the owner-setup server action). One pool, one source of truth.
//
// A global is used so the dev server / serverless environment does not open a
// new pool on every hot reload or invocation.
const globalForPool = globalThis as unknown as { __acosPool?: Pool }

export const pool =
  globalForPool.__acosPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Neon requires SSL. The connection string already includes sslmode=require,
    // but we keep this here so it works regardless of the string used.
    ssl: { rejectUnauthorized: false },
  })

if (process.env.NODE_ENV !== "production") {
  globalForPool.__acosPool = pool
}
