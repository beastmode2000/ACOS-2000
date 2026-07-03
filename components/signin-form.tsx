"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Invalid email or password.")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>ATLAS / 2000</div>
        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>Access the estate operations dashboard.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {error && (
            <p role="alert" style={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign in"}
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
    maxWidth: "400px",
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
  title: { fontSize: "28px", margin: "0 0 6px" },
  subtitle: { color: "#94a3b8", margin: "0 0 22px", fontSize: "15px" },
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
