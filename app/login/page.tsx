"use client";

import { FormEvent, useMemo, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/";
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/atlas-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          next: nextPath,
        }),
      });

      if (!response.ok) {
        setError("Login did not work. Check the username and password.");
        setIsSubmitting(false);
        return;
      }

      const data = (await response.json()) as { next?: string };
      window.location.href = data.next || "/";
    } catch {
      setError("Login did not work. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(198, 160, 75, 0.18), transparent 34%), linear-gradient(135deg, #07172f 0%, #10264a 52%, #061122 100%)",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 28,
          background: "rgba(255, 255, 255, 0.96)",
          color: "#0f172a",
          boxShadow: "0 28px 80px rgba(0, 0, 0, 0.34)",
          border: "1px solid rgba(255, 255, 255, 0.35)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "28px 28px 20px",
            background: "linear-gradient(135deg, #0b1c38, #132f58)",
            color: "white",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: "rgba(198, 160, 75, 0.18)",
              border: "1px solid rgba(198, 160, 75, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              fontWeight: 900,
              letterSpacing: 1,
              color: "#f6d889",
            }}
          >
            A
          </div>

          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>
            Atlas
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255, 255, 255, 0.72)",
              fontSize: 14,
            }}
          >
            Sign in to 2000
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "#64748b",
              marginBottom: 8,
            }}
          >
            Username
          </label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 16,
              border: "1px solid #dbe3ef",
              padding: "14px 14px",
              fontSize: 16,
              outline: "none",
              marginBottom: 18,
              background: "#f8fafc",
              color: "#0f172a",
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "#64748b",
              marginBottom: 8,
            }}
          >
            Password
          </label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            type="password"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 16,
              border: "1px solid #dbe3ef",
              padding: "14px 14px",
              fontSize: 16,
              outline: "none",
              marginBottom: 18,
              background: "#f8fafc",
              color: "#0f172a",
            }}
          />

          {error ? (
            <div
              style={{
                borderRadius: 14,
                padding: "12px 14px",
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: 13,
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 16,
              padding: "14px 16px",
              background: isSubmitting ? "#94a3b8" : "#c6a04b",
              color: "#07172f",
              fontSize: 15,
              fontWeight: 900,
              cursor: isSubmitting ? "default" : "pointer",
              boxShadow: "0 14px 28px rgba(198, 160, 75, 0.28)",
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

          <p
            style={{
              margin: "16px 0 0",
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            This device will stay signed in after login.
          </p>
        </form>
      </section>
    </main>
  );
}
