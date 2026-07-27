"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function InviteForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("This invitation link is missing its secure token.");
      return;
    }

    if (password.length < 10) {
      setMessage("Use a password with at least 10 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/atlas-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        setMessage(
          String(payload.error || "Atlas could not complete this invitation."),
        );
        return;
      }

      setComplete(true);
      setMessage("Your Atlas account is ready.");
    } catch {
      setMessage(
        "Atlas could not reach the invitation service. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#F4F7FA",
        color: "#071B2F",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#FFFFFF",
          border: "1px solid #D8E0E8",
          borderRadius: 18,
          padding: 28,
          boxShadow: "0 18px 45px rgba(7, 27, 47, 0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <img
            src="/atlas-logo.png"
            alt="Atlas"
            style={{ width: 58, height: 58, objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                color: "#C99A3D",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              Atlas Access
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 26 }}>
              Set up your account
            </h1>
          </div>
        </div>

        {!token ? (
          <div
            style={{
              border: "1px solid #E3B2B2",
              borderRadius: 12,
              padding: 14,
              background: "#FFF4F4",
              color: "#8F1D1D",
              lineHeight: 1.5,
            }}
          >
            This invitation link is incomplete. Ask the Atlas administrator to
            create a new invitation.
          </div>
        ) : complete ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                border: "1px solid #A9D6BD",
                borderRadius: 12,
                padding: 16,
                background: "#F0FAF4",
                color: "#17613A",
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              Your password has been saved and your account is active.
            </div>
            <a
              href="/login"
              style={{
                display: "block",
                textAlign: "center",
                borderRadius: 11,
                padding: "12px 16px",
                background: "#C99A3D",
                color: "#071B2F",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Continue to Atlas Login
            </a>
          </div>
        ) : (
          <form onSubmit={submitInvite} style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, color: "#637487", lineHeight: 1.55 }}>
              Create a password for your Atlas account. Use at least 10
              characters.
            </p>

            <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
              Password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #D8E0E8",
                  borderRadius: 11,
                  padding: "12px 13px",
                  fontSize: 16,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.currentTarget.value)
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #D8E0E8",
                  borderRadius: 11,
                  padding: "12px 13px",
                  fontSize: 16,
                }}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                border: 0,
                borderRadius: 11,
                padding: "12px 16px",
                background: "#C99A3D",
                color: "#071B2F",
                fontWeight: 900,
                fontSize: 15,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? "Activating Account..." : "Activate Atlas Account"}
            </button>

            {message ? (
              <div
                role="status"
                style={{
                  border: "1px solid #D8E0E8",
                  borderRadius: 11,
                  padding: 12,
                  background: "#F7F9FB",
                  color: message.includes("ready") ? "#17613A" : "#8F1D1D",
                  lineHeight: 1.45,
                  fontWeight: 700,
                }}
              >
                {message}
              </div>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
