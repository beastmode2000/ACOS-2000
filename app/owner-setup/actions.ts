"use server"

import { randomUUID } from "crypto"
import { hashPassword } from "better-auth/crypto"
import { pool } from "@/lib/db"

// The owner-setup flow may ONLY ever touch this account. It never modifies
// estate/property/asset/note/procedure/location data.
const OWNER_EMAIL = "nickt@arcticmgnt.com"
const OWNER_NAME = "Nick"
const MIN_PASSWORD_LENGTH = 8

export type OwnerSetupResult =
  | { ok: true }
  | { ok: false; error: string }

export async function setupOwnerPassword(
  _prev: OwnerSetupResult | null,
  formData: FormData,
): Promise<OwnerSetupResult> {
  const setupKey = String(formData.get("setupKey") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  // 1. The server must actually have a configured setup key.
  const expectedKey = process.env.ACOS_OWNER_SETUP_KEY
  if (!expectedKey) {
    return {
      ok: false,
      error:
        "Owner setup is not configured on the server (missing ACOS_OWNER_SETUP_KEY).",
    }
  }

  // 2. Validate the setup key.
  if (!setupKey || setupKey !== expectedKey) {
    return { ok: false, error: "Invalid setup key." }
  }

  // 3. Validate the password.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    }
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." }
  }

  // 4. Hash with Better Auth's own email/password hasher (scrypt), so the
  //    resulting hash is fully compatible with the sign-in flow.
  let passwordHash: string
  try {
    passwordHash = await hashPassword(password)
  } catch {
    return { ok: false, error: "Failed to hash the password. Please try again." }
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Find (or create) the owner user row. We only ever target OWNER_EMAIL.
    const userResult = await client.query<{ id: string }>(
      `select id from "user" where lower(email) = lower($1) limit 1`,
      [OWNER_EMAIL],
    )

    let userId: string
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id
    } else {
      userId = randomUUID()
      await client.query(
        `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         values ($1, $2, $3, true, now(), now())`,
        [userId, OWNER_NAME, OWNER_EMAIL],
      )
    }

    // Find the Better Auth credential account for this user.
    const accountResult = await client.query<{ id: string }>(
      `select id from "account"
       where "userId" = $1 and "providerId" = 'credential'
       limit 1`,
      [userId],
    )

    if (accountResult.rows.length > 0) {
      // Update the existing credential account's password hash.
      await client.query(
        `update "account"
         set password = $1, "updatedAt" = now()
         where id = $2`,
        [passwordHash, accountResult.rows[0].id],
      )
    } else {
      // Create the credential account row. For email/password, Better Auth
      // uses providerId 'credential' and accountId = the user's id.
      await client.query(
        `insert into "account"
           (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $3, $4, now(), now())`,
        [randomUUID(), userId, userId, passwordHash],
      )
    }

    await client.query("COMMIT")
    return { ok: true }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    console.log("[v0] owner-setup db error:", err)
    return {
      ok: false,
      error: "A database error occurred while saving the password.",
    }
  } finally {
    client.release()
  }
}
