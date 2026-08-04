"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Role =
  | "Master"
  | "Administrator"
  | "Manager"
  | "Employee"
  | "Vendor"
  | "Viewer";

type Permissions = {
  view: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
  manageUsers: boolean;
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  propertyIds: string[];
  permissions: Permissions;
  accessProfiles: string[];
  inviteStatus?: string;
};

type Props = {
  isMobile: boolean;
  colors: {
    navy: string;
    gold: string;
    line: string;
    card: string;
    panel: string;
    muted: string;
    green: string;
    red?: string;
    text?: string;
  };
};

const properties = [
  ["2000", "2000"],
  ["6855", "6855"],
  ["3661", "3661"],
  ["hangar", "Hangar"],
] as const;

const accessProfileOptions = [
  ["marine", "Marine"],
  ["landscaping", "Landscaping"],
  ["house", "House"],
  ["maintenance", "Maintenance"],
  ["pool-spa", "Pool & Spa"],
  ["vehicles", "Vehicles"],
  ["electrical", "Electrical"],
  ["plumbing", "Plumbing"],
  ["inventory", "Inventory"],
] as const;

const roleDefaults: Record<Role, Permissions> = {
  Master: {
    view: true,
    edit: true,
    approve: true,
    delete: true,
    manageUsers: true,
  },
  Administrator: {
    view: true,
    edit: true,
    approve: true,
    delete: true,
    manageUsers: true,
  },
  Manager: {
    view: true,
    edit: true,
    approve: true,
    delete: false,
    manageUsers: false,
  },
  Employee: {
    view: true,
    edit: true,
    approve: false,
    delete: false,
    manageUsers: false,
  },
  Vendor: {
    view: true,
    edit: false,
    approve: false,
    delete: false,
    manageUsers: false,
  },
  Viewer: {
    view: true,
    edit: false,
    approve: false,
    delete: false,
    manageUsers: false,
  },
};

const permissionLabels: Array<[keyof Permissions, string]> = [
  ["view", "View"],
  ["edit", "Edit"],
  ["approve", "Approve"],
  ["delete", "Delete"],
  ["manageUsers", "Manage Users"],
];

function normalizeRole(value: string): Role {
  if (value === "master") return "Master";
  if (value === "administrator") return "Administrator";
  if (value === "manager") return "Manager";
  if (value === "employee" || value === "operations") return "Employee";
  if (value === "vendor") return "Vendor";
  return "Viewer";
}

export default function AtlasAccessCenter({ isMobile, colors }: Props) {
  const [team, setTeam] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Employee");
  const [newPropertyIds, setNewPropertyIds] = useState<string[]>(["2000"]);
  const [newAccessProfiles, setNewAccessProfiles] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    void fetch("/api/atlas-team")
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok || !Array.isArray(payload.members)) return;
        const members: Member[] = payload.members.map((member: any) => ({
          id: String(member.id || ""),
          name: String(member.name || ""),
          email: String(member.email || ""),
          role: normalizeRole(String(member.role || "viewer")),
          active: member.active !== false,
          propertyIds: Array.isArray(member.propertyIds)
            ? member.propertyIds.map(String)
            : ["2000"],
          permissions: {
            ...roleDefaults.Viewer,
            ...(member.permissions || {}),
          },
          accessProfiles: Array.isArray(member.accessProfiles)
            ? member.accessProfiles.map(String)
            : [],
          inviteStatus: String(member.inviteStatus || ""),
        }));
        setTeam(members);
        setSelectedId((current) => current || members[0]?.id || "");
      })
      .catch(() => setMessage("Atlas could not load team access."));
  }, []);

  const selected = useMemo(
    () => team.find((member) => member.id === selectedId),
    [team, selectedId],
  );

  function updateMember(id: string, patch: Partial<Member>) {
    setTeam((current) =>
      current.map((member) =>
        member.id === id ? { ...member, ...patch } : member,
      ),
    );
    setMessage("Unsaved changes");
  }

  async function saveAccess() {
    setSaving(true);
    setMessage("Saving...");
    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: team.map((member) => ({
            ...member,
            role: member.role.toLowerCase(),
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(
        response.ok && payload.ok
          ? "Saved ✓"
          : String(payload.error || "Access settings could not be saved."),
      );
    } catch {
      setMessage("Access settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function createInvite() {
    if (!newName.trim() || !newEmail.includes("@")) {
      setMessage("Enter the employee name and email.");
      return;
    }

    setSaving(true);
    setMessage("Creating invitation...");
    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          member: {
            id: `team-${Date.now()}`,
            name: newName.trim(),
            email: newEmail.trim(),
            role: newRole.toLowerCase(),
            active: true,
            propertyIds: newPropertyIds,
            permissions: roleDefaults[newRole],
            accessProfiles: newAccessProfiles,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        setMessage(String(payload.error || "Invitation could not be created."));
        return;
      }

      const link = `${window.location.origin}${payload.invitePath}`;
      setInviteLink(link);
      await navigator.clipboard?.writeText(link);
      setMessage("Invite created and copied ✓");
      setNewName("");
      setNewEmail("");
    } catch {
      setMessage("Invitation could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const card: CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 16,
    background: colors.card,
    padding: isMobile ? 14 : 18,
  };
  const control: CSSProperties = {
    width: "100%",
    minHeight: 44,
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    padding: "9px 11px",
    background: "#FFFFFF",
    color: colors.text || colors.navy,
    font: "inherit",
  };
  const primary: CSSProperties = {
    minHeight: 42,
    border: 0,
    borderRadius: 10,
    background: colors.gold,
    color: colors.navy,
    padding: "10px 15px",
    fontWeight: 800,
    cursor: "pointer",
  };
  const secondary: CSSProperties = {
    minHeight: 40,
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    background: "#FFFFFF",
    color: colors.navy,
    padding: "9px 12px",
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <div
          style={{
            color: colors.gold,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".11em",
            textTransform: "uppercase",
          }}
        >
          Add Employee
        </div>
        <h2 style={{ margin: "5px 0 6px", color: colors.navy }}>
          Invite a new Atlas user
        </h2>
        <p style={{ margin: "0 0 16px", color: colors.muted }}>
          Choose the employee role, properties, and operating areas before
          creating the invitation.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>Name</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.currentTarget.value)}
              style={control}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>Email</span>
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.currentTarget.value)}
              style={control}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>Role</span>
            <select
              value={newRole}
              onChange={(event) => {
                const role = event.currentTarget.value as Role;
                setNewRole(role);
              }}
              style={control}
            >
              {Object.keys(roleDefaults).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>
            Property access
          </strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {properties.map(([id, label]) => (
              <label
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 999,
                  padding: "8px 11px",
                  background: newPropertyIds.includes(id)
                    ? "#FFF8E8"
                    : "#FFFFFF",
                }}
              >
                <input
                  type="checkbox"
                  checked={newPropertyIds.includes(id)}
                  onChange={() =>
                    setNewPropertyIds((current) =>
                      current.includes(id)
                        ? current.filter((value) => value !== id)
                        : [...current, id],
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <strong style={{ display: "block", marginBottom: 8 }}>
            Operating areas
          </strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {accessProfileOptions.map(([id, label]) => (
              <label
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  border: `1px solid ${colors.line}`,
                  borderRadius: 999,
                  padding: "8px 11px",
                  background: newAccessProfiles.includes(id)
                    ? "#FFF8E8"
                    : "#FFFFFF",
                }}
              >
                <input
                  type="checkbox"
                  checked={newAccessProfiles.includes(id)}
                  onChange={() =>
                    setNewAccessProfiles((current) =>
                      current.includes(id)
                        ? current.filter((value) => value !== id)
                        : [...current, id],
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={() => void createInvite()}
            disabled={saving}
            style={{ ...primary, opacity: saving ? 0.65 : 1 }}
          >
            {saving ? "Working..." : "Create Invite"}
          </button>
          {inviteLink ? (
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(inviteLink)}
              style={secondary}
            >
              Copy Invite Link
            </button>
          ) : null}
          {message ? (
            <span
              style={{
                color: message.includes("could not")
                  ? colors.red || "#B42318"
                  : message.includes("✓")
                    ? colors.green
                    : colors.muted,
                fontWeight: 700,
              }}
            >
              {message}
            </span>
          ) : null}
        </div>
      </section>

      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                color: colors.gold,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".11em",
                textTransform: "uppercase",
              }}
            >
              Team Access
            </div>
            <h2 style={{ margin: "4px 0 0", color: colors.navy }}>
              Employees and permissions
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void saveAccess()}
            disabled={saving}
            style={{ ...primary, opacity: saving ? 0.65 : 1 }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "minmax(220px, .8fr) minmax(0, 1.4fr)",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            {team.length ? (
              team.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedId(member.id)}
                  style={{
                    ...secondary,
                    textAlign: "left",
                    minHeight: 58,
                    borderColor:
                      member.id === selectedId ? colors.gold : colors.line,
                    background:
                      member.id === selectedId ? "#FFF8E8" : "#FFFFFF",
                  }}
                >
                  <strong style={{ display: "block" }}>{member.name}</strong>
                  <span style={{ color: colors.muted, fontSize: 12 }}>
                    {member.role} · {member.active ? "Active" : "Inactive"}
                  </span>
                </button>
              ))
            ) : (
              <div style={{ color: colors.muted }}>No users loaded.</div>
            )}
          </div>

          {selected ? (
            <div
              style={{
                display: "grid",
                gap: 14,
                border: `1px solid ${colors.line}`,
                borderRadius: 14,
                padding: isMobile ? 12 : 16,
                background: colors.panel,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Name</span>
                  <input
                    value={selected.name}
                    onChange={(event) =>
                      updateMember(selected.id, {
                        name: event.currentTarget.value,
                      })
                    }
                    style={control}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Email</span>
                  <input
                    value={selected.email}
                    onChange={(event) =>
                      updateMember(selected.id, {
                        email: event.currentTarget.value,
                      })
                    }
                    style={control}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Role</span>
                  <select
                    value={selected.role}
                    onChange={(event) => {
                      const role = event.currentTarget.value as Role;
                      updateMember(selected.id, {
                        role,
                        permissions: roleDefaults[role],
                      });
                    }}
                    style={control}
                  >
                    {Object.keys(roleDefaults).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 44,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.active}
                    onChange={(event) =>
                      updateMember(selected.id, {
                        active: event.currentTarget.checked,
                      })
                    }
                  />
                  Active account
                </label>
              </div>

              <div>
                <strong style={{ display: "block", marginBottom: 8 }}>
                  Properties
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {properties.map(([id, label]) => (
                    <label
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        border: `1px solid ${colors.line}`,
                        borderRadius: 999,
                        padding: "8px 11px",
                        background: selected.propertyIds.includes(id)
                          ? "#FFF8E8"
                          : "#FFFFFF",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.propertyIds.includes(id)}
                        onChange={() =>
                          updateMember(selected.id, {
                            propertyIds: selected.propertyIds.includes(id)
                              ? selected.propertyIds.filter(
                                  (value) => value !== id,
                                )
                              : [...selected.propertyIds, id],
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong style={{ display: "block", marginBottom: 8 }}>
                  Permissions
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {permissionLabels.map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        border: `1px solid ${colors.line}`,
                        borderRadius: 999,
                        padding: "8px 11px",
                        background: selected.permissions[key]
                          ? "#EAF7F1"
                          : "#FFFFFF",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.permissions[key]}
                        onChange={(event) =>
                          updateMember(selected.id, {
                            permissions: {
                              ...selected.permissions,
                              [key]: event.currentTarget.checked,
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <strong style={{ display: "block", marginBottom: 8 }}>
                  Operating areas
                </strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {accessProfileOptions.map(([id, label]) => (
                    <label
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        border: `1px solid ${colors.line}`,
                        borderRadius: 999,
                        padding: "8px 11px",
                        background: selected.accessProfiles.includes(id)
                          ? "#FFF8E8"
                          : "#FFFFFF",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.accessProfiles.includes(id)}
                        onChange={() =>
                          updateMember(selected.id, {
                            accessProfiles: selected.accessProfiles.includes(id)
                              ? selected.accessProfiles.filter(
                                  (value) => value !== id,
                                )
                              : [...selected.accessProfiles, id],
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

