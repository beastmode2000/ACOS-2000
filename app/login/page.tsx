"use client";

import { FormEvent, useMemo, useState } from "react";

export default function LoginPage() {
  const [view, setView] = useState<"login" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

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

  async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetMessage("");
    setIsResetSubmitting(true);

    try {
      const response = await fetch("/api/atlas-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: resetEmail }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error || "The reset request could not be sent. Try again.");
      } else {
        setResetMessage(
          data.message ||
            "If that email is connected to Atlas, a password reset link has been sent.",
        );
      }
    } catch {
      setError("The reset request could not be sent. Try again.");
    } finally {
      setIsResetSubmitting(false);
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

        {view === "login" ? (
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

          <div style={{ display: "flex", justifyContent: "flex-end", margin: "-8px 0 18px" }}>
            <button
              type="button"
              onClick={() => {
                setError("");
                setResetMessage("");
                setResetEmail(username.includes("@") ? username : "");
                setView("reset");
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#1d4f86",
                fontSize: 13,
                fontWeight: 800,
                padding: 0,
                cursor: "pointer",
              }}
            >
              Forgot password?
            </button>
          </div>

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
        ) : (
          <form onSubmit={handleResetRequest} style={{ padding: 28 }}>
            <h2 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 20 }}>
              Reset password
            </h2>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
              Enter the email used for your Atlas account.
            </p>

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
              Email
            </label>
            <input
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              autoComplete="email"
              type="email"
              required
              autoFocus
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
              <div style={{ borderRadius: 14, padding: "12px 14px", background: "#fee2e2", color: "#991b1b", fontSize: 13, marginBottom: 16, fontWeight: 700 }}>
                {error}
              </div>
            ) : null}

            {resetMessage ? (
              <div style={{ borderRadius: 14, padding: "12px 14px", background: "#dcfce7", color: "#166534", fontSize: 13, marginBottom: 16, fontWeight: 700, lineHeight: 1.45 }}>
                {resetMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isResetSubmitting || Boolean(resetMessage)}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 16,
                padding: "14px 16px",
                background: isResetSubmitting || resetMessage ? "#94a3b8" : "#c6a04b",
                color: "#07172f",
                fontSize: 15,
                fontWeight: 900,
                cursor: isResetSubmitting || resetMessage ? "default" : "pointer",
              }}
            >
              {isResetSubmitting ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setView("login");
                setError("");
                setResetMessage("");
              }}
              style={{ width: "100%", border: "none", background: "transparent", color: "#1d4f86", fontSize: 13, fontWeight: 800, padding: "16px 8px 0", cursor: "pointer" }}
            >
              Back to Sign In
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
