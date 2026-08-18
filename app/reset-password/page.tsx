"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid or expired.");
      return;
    }
    if (password.length < 10) {
      setError("Use a password with at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/atlas-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || "The password could not be reset.");
      } else {
        setComplete(true);
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("The password could not be reset. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    borderRadius: 16,
    border: "1px solid #dbe3ef",
    padding: "14px 14px",
    fontSize: 16,
    outline: "none",
    marginBottom: 18,
    background: "#f8fafc",
    color: "#0f172a",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    color: "#64748b",
    marginBottom: 8,
  };

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
        <div style={{ padding: "28px 28px 20px", background: "linear-gradient(135deg, #0b1c38, #132f58)", color: "white" }}>
          <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(198, 160, 75, 0.18)", border: "1px solid rgba(198, 160, 75, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontWeight: 900, letterSpacing: 1, color: "#f6d889" }}>
            A
          </div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>Atlas</h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255, 255, 255, 0.72)", fontSize: 14 }}>
            Reset password
          </p>
        </div>

        {complete ? (
          <div style={{ padding: 28 }}>
            <div style={{ borderRadius: 14, padding: "14px 16px", background: "#dcfce7", color: "#166534", fontSize: 14, marginBottom: 18, fontWeight: 800 }}>
              Your password has been updated.
            </div>
            <button
              type="button"
              onClick={() => { window.location.href = "/login"; }}
              style={{ width: "100%", border: "none", borderRadius: 16, padding: "14px 16px", background: "#c6a04b", color: "#07172f", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
            >
              Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>
            <label style={labelStyle}>New Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              autoFocus
              style={inputStyle}
            />

            <label style={labelStyle}>Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              style={inputStyle}
            />

            {error ? (
              <div style={{ borderRadius: 14, padding: "12px 14px", background: "#fee2e2", color: "#991b1b", fontSize: 13, marginBottom: 16, fontWeight: 700 }}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ width: "100%", border: "none", borderRadius: 16, padding: "14px 16px", background: isSubmitting ? "#94a3b8" : "#c6a04b", color: "#07172f", fontSize: 15, fontWeight: 900, cursor: isSubmitting ? "default" : "pointer" }}
            >
              {isSubmitting ? "Saving..." : "Save New Password"}
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = "/login"; }}
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

