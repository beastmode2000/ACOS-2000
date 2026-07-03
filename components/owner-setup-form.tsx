"use client"

import { useActionState, useEffect } from "react"
import type { CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { setupOwnerPassword, type OwnerSetupResult } from "@/app/owner-setup/actions"

export function OwnerSetupForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<
    OwnerSetupResult | null,
    FormData
  >(setupOwnerPassword, null)

  useEffect(() => {
    if (state?.ok) {
      const timer = setTimeout(() => {
        router.push("/signin")
        router.refresh()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>ATLAS / 2000</div>
        <h1 style={styles.title}>Owner password setup</h1>
        <p style={styles.subtitle}>
          Set or reset the password for the owner account
          {" "}
          (nickt@arcticmgnt.com). Requires the owner setup key.
        </p>

        <form action={formAction} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="setupKey" style={styles.label}>
              Setup key
            </label>
            <input
              id="setupKey"
              name="setupKey"
              type="password"
              required
              autoComplete="off"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="confirmPassword" style={styles.label}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              style={styles.input}
            />
          </div>

          {state && !state.ok && (
            <p role="alert" style={styles.error}>
              {state.error}
            </p>
          )}

          {state?.ok && (
            <p role="status" style={styles.success}>
              Password saved. Redirecting to sign in...
            </p>
          )}

          <button
            type="submit"
            disabled={pending || state?.ok}
            style={styles.button}
          >
            {pending ? "Saving..." : "Set password"}
          </button>
        </form>
      </section>
    </main>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100svh",
    background: "#07111f",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "22px",
    padding: "28px",
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
    marginBottom: "16px",
  },
  title: { fontSize: "26px", margin: "0 0 6px" },
  subtitle: {
    color: "#94a3b8",
    margin: "0 0 22px",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  form: { display: "grid", gap: "16px" },
  field: { display: "grid", gap: "6px" },
  label: { fontSize: "13px", color: "#cbd5e1", fontWeight: 600 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    fontSize: "15px",
    outline: "none",
  },
  error: {
    margin: 0,
    color: "#fca5a5",
    background: "rgba(248,113,113,0.12)",
    border: "1px solid rgba(248,113,113,0.28)",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "14px",
  },
  success: {
    margin: 0,
    color: "#bef264",
    background: "rgba(163,230,53,0.12)",
    border: "1px solid rgba(163,230,53,0.28)",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "14px",
  },
  button: {
    marginTop: "4px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "none",
    background: "#bef264",
    color: "#07111f",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
  },
}
