"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Permissions = {
  view?: boolean;
  edit?: boolean;
  approve?: boolean;
  delete?: boolean;
  manageUsers?: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  active?: boolean;
  propertyIds?: string[];
  permissions?: Permissions;
  accessProfiles?: string[];
  inviteStatus?: string;
  fieldOnly?: boolean;
};

type TeamPayload = {
  ok?: boolean;
  members?: TeamMember[];
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function buttonLabel(status: unknown) {
  const value = normalized(status);
  if (value === "failed") return "Retry Invite";
  if (value === "sent") return "Resend Invite";
  if (value === "expired") return "Send New Invite";
  return "Send Invite";
}

function canInvite(member: TeamMember | null) {
  if (!member) return false;
  if (!member.email || member.fieldOnly) return false;
  if (normalized(member.role) === "master") return false;
  return normalized(member.inviteStatus) !== "accepted";
}

export default function AtlasTeamInviteActions() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const loadTeam = async () => {
    const response = await fetch("/api/atlas-team", {
      cache: "no-store",
      credentials: "include",
    });
    const payload = (await response.json().catch(() => ({}))) as TeamPayload;
    if (!response.ok || payload.ok === false || !Array.isArray(payload.members)) return;
    setMembers(payload.members);
  };

  useEffect(() => {
    void loadTeam();
    const onChanged = () => void loadTeam();
    window.addEventListener("atlas:data-changed", onChanged as EventListener);
    return () => window.removeEventListener("atlas:data-changed", onChanged as EventListener);
  }, []);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const header = document.querySelector<HTMLElement>(".atlas-team-person-header");
      const name = normalized(header?.querySelector<HTMLElement>("h2")?.textContent);
      setTarget(header || null);
      setSelectedName(name);
      setMessage("");
      setInviteLink("");
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const selected = useMemo(
    () => members.find((member) => normalized(member.name) === selectedName) || null,
    [members, selectedName],
  );

  const createManualInviteLink = async (member: TeamMember) => {
    const response = await fetch("/api/atlas-team-invite-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ memberId: member.id }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false || !payload?.invitePath) {
      throw new Error(String(payload?.error || "Atlas could not create the invite link."));
    }

    const link = `${window.location.origin}${String(payload.invitePath)}`;
    setInviteLink(link);
    await navigator.clipboard?.writeText(link);
    await loadTeam();
    window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    return link;
  };

  const copyInviteLink = async () => {
    if (!selected || sending) return;
    setSending(true);
    setMessage("Creating invite link...");
    try {
      await createManualInviteLink(selected);
      setMessage("Invite link copied ✓");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not create the invite link.");
    } finally {
      setSending(false);
    }
  };

  const sendInvite = async () => {
    if (!selected || sending) return;
    setSending(true);
    setMessage("Sending invite...");
    setInviteLink("");

    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "invite",
          member: {
            id: selected.id,
            name: selected.name,
            email: selected.email,
            role: selected.role,
            active: selected.active !== false,
            propertyIds: selected.propertyIds || ["2000"],
            permissions: selected.permissions || {},
            accessProfiles: selected.accessProfiles || [],
          },
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        const emailError = String(payload?.error || "Atlas could not send the invitation.");
        try {
          await createManualInviteLink(selected);
          setMessage(`Email failed — invite link copied ✓ (${emailError})`);
        } catch (linkError) {
          const linkMessage = linkError instanceof Error ? linkError.message : "Invite link could not be created.";
          setMessage(`${emailError} ${linkMessage}`);
        }
        return;
      }

      setMessage("Invite sent ✓");
      await loadTeam();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      const emailError = error instanceof Error ? error.message : "Atlas could not send the invitation.";
      try {
        await createManualInviteLink(selected);
        setMessage(`Email failed — invite link copied ✓ (${emailError})`);
      } catch (linkError) {
        const linkMessage = linkError instanceof Error ? linkError.message : "Invite link could not be created.";
        setMessage(`${emailError} ${linkMessage}`);
      }
    } finally {
      setSending(false);
    }
  };

  if (!target || !selected || !canInvite(selected)) return null;

  return createPortal(
    <div className="atlas-team-invite-actions">
      <button type="button" onClick={() => void sendInvite()} disabled={sending}>
        {sending ? "Working..." : buttonLabel(selected.inviteStatus)}
      </button>
      <button type="button" className="secondary" onClick={() => void copyInviteLink()} disabled={sending}>
        Copy Invite Link
      </button>
      {message ? <span data-error={!message.includes("✓")}>{message}</span> : null}
      {inviteLink ? (
        <input
          aria-label="Atlas invite link"
          readOnly
          value={inviteLink}
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
      <style jsx>{`
        .atlas-team-invite-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        button {
          min-height: 34px;
          border: 1px solid #c99a3d;
          border-radius: 9px;
          background: #c99a3d;
          color: #0b1e33;
          padding: 7px 11px;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }
        button.secondary {
          background: #ffffff;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        span {
          max-width: 420px;
          font-size: 11px;
          font-weight: 700;
          color: #297a4a;
        }
        span[data-error="true"] {
          color: #b42318;
        }
        input {
          width: min(520px, 100%);
          min-height: 32px;
          border: 1px solid #d7e0e8;
          border-radius: 8px;
          background: #ffffff;
          color: #314155;
          padding: 6px 8px;
          font: inherit;
          font-size: 11px;
        }
        @media (max-width: 899px) {
          .atlas-team-invite-actions {
            width: 100%;
            justify-content: flex-start;
            margin-left: 0;
          }
          span,
          input {
            max-width: 100%;
            width: 100%;
          }
        }
      `}</style>
    </div>,
    target,
  );
}
