import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { pool } from "@/lib/db"

/**
 * Emails that are permitted to have an account created through Better Auth's
 * sign-up endpoint. Configured via the ACOS_ALLOWED_EMAILS env var
 * (comma-separated). Random public account creation is NOT allowed.
 */
export function getAllowedEmails(): string[] {
  return (process.env.ACOS_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email: string): boolean {
  return getAllowedEmails().includes(email.trim().toLowerCase())
}

// Base URL cascade so the same code works in production (atlas2000.com via
// BETTER_AUTH_URL), on Vercel preview deployments, and inside the v0 preview.
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL)

export const auth = betterAuth({
  // Better Auth manages users/sessions/accounts on the existing `public`
  // schema tables (user, account, session, verification) through this pg Pool.
  database: pool,
  baseURL,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  databaseHooks: {
    user: {
      create: {
        // Enforce the allow-list on every account creation. This blocks the
        // public sign-up endpoint from creating accounts for arbitrary emails.
        before: async (user) => {
          if (!isEmailAllowed(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "This email is not permitted to create an account.",
            })
          }
          return { data: user }
        },
      },
    },
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // The v0 preview renders inside a cross-site iframe; without these
          // the browser drops the session cookie.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
