"use client";

import React, { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "admin" | "manager" | "tech" | "viewer";
  status: "pending" | "approved" | "disabled";
  approvedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

type InviteRequest = {
  id: string;
  email: string;
  displayName: string;
  requestedRole: string;
  message: string;
  status: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
};

type AuthState = {
  loading: boolean;
  ok: boolean;
  authenticated: boolean;
  setupRequired: boolean;
  hasUsers: boolean;
  user: AuthUser | null;
  users: AuthUser[];
  inviteRequests: InviteRequest[];
  error: string;
};

const colors = {
  navy: "#0B1E33",
  navy2: "#102A44",
  gold: "#C99A3D",
  gold2: "#E6C16A",
  bg: "#F5F7FA",
  card: "#FFFFFF",
  line: "#DCE4EC",
  text: "#172331",
  muted: "#607086",
  red: "#B42318",
  green: "#087443",
};

function emptyAuthState(): AuthState {
  return {
    loading: true,
    ok: false,
    authenticated: false,
    setupRequired: false,
    hasUsers: false,
    user: null,
    users: [],
    inviteRequests: [],
    error: "",
  };
}

export default function LoginPage() {
  const [auth, setAuth] = useState<AuthState>(emptyAuthState());
  const [mode, setMode] = useState<"login" | "setup" | "request" | "account">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState("viewer");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadAuth() {
    setAuth((current) => ({ ...current, loading: true, error: "" }));

    try {
      const response = await fetch("/api/atlas-auth", { cache: "no-store" });
      const data = await response.json();

      const nextState: AuthState = {
        loading: false,
        ok: Boolean(data.ok),
        authenticated: Boolean(data.authenticated),
        setupRequired: Boolean(data.setupRequired),
        hasUsers: Boolean(data.hasUsers),
        user: data.user || null,
        users: Array.isArray(data.users) ? data.users : [],
        inviteRequests: Array.isArray(data.inviteRequests) ? data.inviteRequests : [],
        error: data.error || "",
      };

      setAuth(nextState);

      if (nextState.authenticated) {
        setMode("account");
      } else if (nextState.setupRequired) {
        setMode("setup");
      } else {
        setMode("login");
      }
    } catch (error) {
      setAuth({
        ...emptyAuthState(),
        loading: false,
        error: error instanceof Error ? error.message : "Could not load login status.",
      });
    }
  }

  useEffect(() => {
    loadAuth();
  }, []);

  async function postAuth(action: string, body: Record<string, unknown>) {
    setBusy(true);
    setNotice("");
    setAuth((current) => ({ ...current, error: "" }));

    try {
      const response = await fetch("/api/atlas-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setNotice(data.message || "Done.");

      if (action === "bootstrap-admin" || action === "login") {
        window.location.href = "/";
        return;
      }

      await loadAuth();
    } catch (error) {
      setAuth((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Request failed.",
      }));
    } finally {
      setBusy(false);
    }
  }

  function createOwnerAccount() {
    postAuth("bootstrap-admin", {
      email,
      displayName,
      password,
    });
  }

  function login() {
    postAuth("login", {
      email,
      password,
    });
  }

  function requestAccess() {
    postAuth("request-access", {
      email,
      displayName,
      password,
      requestedRole,
      message,
    });
  }

  function logout() {
    postAuth("logout", {});
  }

  function approveUser(userId: string, role: string) {
    postAuth("approve-user", {
      userId,
      role,
    });
  }

  function disableUser(userId: string) {
    postAuth("disable-user", {
      userId,
    });
  }

  function goToAtlas() {
    window.location.href = "/";
  }

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={brandStyle}>
          <img src="/atlas-logo.png" alt="Atlas logo" style={logoStyle} />
          <div>
            <div style={brandTitleStyle}>ATLAS</div>
            <div style={brandSubtitleStyle}>2000 Estate Operations Login</div>
          </div>
        </div>

        {auth.loading ? (
          <div style={cardStyle}>
            <h1 style={titleStyle}>Checking Atlas login...</h1>
            <p style={mutedStyle}>Connecting to Neon authentication.</p>
          </div>
        ) : null}

        {!auth.loading && mode === "setup" ? (
          <div style={cardStyle}>
            <div style={eyebrowStyle}>First Account Setup</div>
            <h1 style={titleStyle}>Create the Atlas owner account</h1>
            <p style={mutedStyle}>
              This is the first approved account. After this is created, new users will need approval.
            </p>

            <div style={formGridStyle}>
              <label style={labelStyle}>
                Display name
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" style={inputStyle} />
              </label>

              <button type="button" onClick={createOwnerAccount} disabled={busy} style={primaryButtonStyle}>
                {busy ? "Creating..." : "Create Owner Account"}
              </button>
            </div>
          </div>
        ) : null}

        {!auth.loading && mode === "login" ? (
          <div style={cardStyle}>
            <div style={eyebrowStyle}>Login</div>
            <h1 style={titleStyle}>Sign in to Atlas</h1>
            <p style={mutedStyle}>Use your approved Atlas account.</p>

            <div style={formGridStyle}>
              <label style={labelStyle}>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" style={inputStyle} />
              </label>

              <button type="button" onClick={login} disabled={busy} style={primaryButtonStyle}>
                {busy ? "Signing in..." : "Sign In"}
              </button>

              <button type="button" onClick={() => setMode("request")} style={secondaryButtonStyle}>
                Request Access
              </button>
            </div>
          </div>
        ) : null}

        {!auth.loading && mode === "request" ? (
          <div style={cardStyle}>
            <div style={eyebrowStyle}>Request Access</div>
            <h1 style={titleStyle}>Ask to join Atlas</h1>
            <p style={mutedStyle}>Your account will stay pending until an approved admin approves it.</p>

            <div style={formGridStyle}>
              <label style={labelStyle}>
                Display name
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Requested role
                <select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)} style={inputStyle}>
                  <option value="viewer">Viewer</option>
                  <option value="tech">Tech</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label style={labelStyle}>
                Message
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Why do you need access?" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
              </label>

              <button type="button" onClick={requestAccess} disabled={busy} style={primaryButtonStyle}>
                {busy ? "Submitting..." : "Submit Access Request"}
              </button>

              <button type="button" onClick={() => setMode("login")} style={secondaryButtonStyle}>
                Back to Login
              </button>
            </div>
          </div>
        ) : null}

        {!auth.loading && mode === "account" && auth.user ? (
          <div style={cardStyle}>
            <div style={eyebrowStyle}>Logged In</div>
            <h1 style={titleStyle}>Welcome, {auth.user.displayName || auth.user.email}</h1>
            <p style={mutedStyle}>
              Role: <strong>{auth.user.role}</strong> · Status: <strong>{auth.user.status}</strong>
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <button type="button" onClick={goToAtlas} style={primaryButtonStyle}>
                Open Atlas
              </button>
              <button type="button" onClick={logout} disabled={busy} style={secondaryButtonStyle}>
                Log Out
              </button>
            </div>

            {auth.user.role === "owner" || auth.user.role === "admin" ? (
              <div style={{ marginTop: 24, display: "grid", gap: 18 }}>
                <div>
                  <div style={eyebrowStyle}>Users</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {auth.users.length ? (
                      auth.users.map((user) => (
                        <div key={user.id} style={rowStyle}>
                          <div>
                            <strong style={{ color: colors.navy }}>{user.displayName || user.email}</strong>
                            <div style={mutedSmallStyle}>{user.email}</div>
                            <div style={mutedSmallStyle}>
                              {user.role} · {user.status}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {user.status !== "approved" ? (
                              <>
                                <button type="button" onClick={() => approveUser(user.id, "viewer")} style={miniButtonStyle}>
                                  Approve Viewer
                                </button>
                                <button type="button" onClick={() => approveUser(user.id, "tech")} style={miniButtonStyle}>
                                  Approve Tech
                                </button>
                                <button type="button" onClick={() => approveUser(user.id, "manager")} style={miniButtonStyle}>
                                  Approve Manager
                                </button>
                              </>
                            ) : null}

                            {user.id !== auth.user.id ? (
                              <button type="button" onClick={() => disableUser(user.id)} style={miniDangerButtonStyle}>
                                Disable
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={emptyStyle}>No users found.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={eyebrowStyle}>Invite Requests</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    {auth.inviteRequests.length ? (
                      auth.inviteRequests.map((request) => (
                        <div key={request.id} style={rowStyle}>
                          <div>
                            <strong style={{ color: colors.navy }}>{request.displayName || request.email}</strong>
                            <div style={mutedSmallStyle}>{request.email}</div>
                            <div style={mutedSmallStyle}>
                              Requested: {request.requestedRole} · Status: {request.status}
                            </div>
                            {request.message ? <div style={{ color: colors.text, marginTop: 6 }}>{request.message}</div> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={emptyStyle}>No invite requests yet.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {auth.error ? <div style={errorStyle}>{auth.error}</div> : null}
        {notice ? <div style={noticeStyle}>{notice}</div> : null}
      </section>

      <section style={sideStyle}>
        <div style={sideCardStyle}>
          <div style={sideEyebrowStyle}>PRIVATE ATLAS ACCESS</div>
          <h2 style={sideTitleStyle}>Account creation, approval, and login are now backed by Neon.</h2>
          <p style={sideTextStyle}>
            After the owner account is created, the next code will lock the main Atlas dashboard so only signed-in approved users can open it.
          </p>
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "1fr 0.78fr",
  background: colors.bg,
  color: colors.text,
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const panelStyle: React.CSSProperties = {
  padding: 34,
  display: "grid",
  alignContent: "start",
  gap: 22,
};

const brandStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
};

const logoStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  objectFit: "contain",
  borderRadius: 16,
  background: "white",
  padding: 7,
  border: "1px solid " + colors.line,
};

const brandTitleStyle: React.CSSProperties = {
  fontSize: 29,
  fontWeight: 950,
  letterSpacing: 2,
  color: colors.navy,
  lineHeight: 1,
};

const brandSubtitleStyle: React.CSSProperties = {
  color: colors.muted,
  fontWeight: 800,
  marginTop: 6,
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: "1px solid " + colors.line,
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 16px 38px rgba(11, 30, 51, 0.08)",
  maxWidth: 760,
};

const eyebrowStyle: React.CSSProperties = {
  color: colors.gold,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.2,
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 8px",
  color: colors.navy,
  fontSize: 30,
  lineHeight: 1.1,
  letterSpacing: -0.8,
};

const mutedStyle: React.CSSProperties = {
  color: colors.muted,
  lineHeight: 1.5,
  margin: 0,
};

const mutedSmallStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 13,
  marginTop: 4,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 14,
  marginTop: 18,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: colors.navy,
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid " + colors.line,
  background: "#FBFCFE",
  color: colors.navy,
  borderRadius: 13,
  padding: "12px 13px",
  fontSize: 15,
  fontWeight: 750,
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  background: colors.navy,
  color: "white",
  borderRadius: 14,
  padding: "13px 16px",
  fontWeight: 950,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid " + colors.line,
  background: "white",
  color: colors.navy,
  borderRadius: 14,
  padding: "13px 16px",
  fontWeight: 950,
  cursor: "pointer",
};

const miniButtonStyle: React.CSSProperties = {
  border: "none",
  background: colors.navy,
  color: "white",
  borderRadius: 11,
  padding: "8px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const miniDangerButtonStyle: React.CSSProperties = {
  border: "1px solid " + colors.line,
  background: "white",
  color: colors.red,
  borderRadius: 11,
  padding: "8px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
  border: "1px solid " + colors.line,
  borderRadius: 16,
  padding: 14,
  background: "#FBFCFE",
};

const emptyStyle: React.CSSProperties = {
  border: "1px solid " + colors.line,
  borderRadius: 16,
  padding: 14,
  color: colors.muted,
  background: "#FBFCFE",
};

const errorStyle: React.CSSProperties = {
  maxWidth: 760,
  border: "1px solid #FACACA",
  background: "#FEECEC",
  color: colors.red,
  borderRadius: 16,
  padding: 14,
  fontWeight: 900,
};

const noticeStyle: React.CSSProperties = {
  maxWidth: 760,
  border: "1px solid #BDE7D2",
  background: "#EAF7F1",
  color: colors.green,
  borderRadius: 16,
  padding: 14,
  fontWeight: 900,
};

const sideStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, " + colors.navy + ", " + colors.navy2 + ")",
  color: "white",
  padding: 34,
  display: "grid",
  alignContent: "center",
};

const sideCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 28,
  padding: 28,
  background: "rgba(255,255,255,0.06)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
};

const sideEyebrowStyle: React.CSSProperties = {
  color: colors.gold2,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 1.3,
};

const sideTitleStyle: React.CSSProperties = {
  fontSize: 34,
  lineHeight: 1.08,
  margin: "12px 0",
};

const sideTextStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.55,
  fontSize: 16,
};
