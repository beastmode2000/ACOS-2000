"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  active?: boolean;
  propertyIds?: string[];
  fieldLinkActive?: boolean;
};

type TeamPayload = {
  ok?: boolean;
  members?: TeamMember[];
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function selectedTeamName() {
  const header = document.querySelector<HTMLElement>(".atlas-team-person-header");
  return String(header?.querySelector<HTMLElement>("h2")?.textContent || "").trim();
}

function findActionHost() {
  const header = document.querySelector<HTMLElement>(".atlas-team-person-header");
  if (!header) return null;

  let host = header.querySelector<HTMLElement>("[data-atlas-team-work-actions-host]");
  if (!host) {
    host = document.createElement("div");
    host.dataset.atlasTeamWorkActionsHost = "true";
    header.appendChild(host);
  }
  return host;
}

export default function AtlasTeamWorkActions() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadTeam = async () => {
    try {
      const response = await fetch("/api/atlas-team", {
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => ({}))) as TeamPayload;
      if (response.ok && payload?.ok !== false) {
        setMembers(Array.isArray(payload.members) ? payload.members : []);
      }
    } catch {
      // Keep the existing Team page usable if the convenience controls cannot refresh.
    }
  };

  useEffect(() => {
    void loadTeam();
    const refresh = () => void loadTeam();
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () =>
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastName = "";

    const apply = () => {
      frame = 0;
      const nextHost = findActionHost();
      const nextName = selectedTeamName();
      setHost((current) => (current === nextHost ? current : nextHost));
      setSelectedName((current) => (current === nextName ? current : nextName));
      if (nextName !== lastName) {
        lastName = nextName;
        setMessage("");
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.addEventListener("click", schedule, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const selected = useMemo(() => {
    const target = normalized(selectedName);
    if (!target) return null;
    return members.find((member) => normalized(member.name) === target) || null;
  }, [members, selectedName]);

  if (
    !host ||
    !selected ||
    selected.active === false ||
    normalized(selected.role) === "master"
  ) {
    return null;
  }

  const viewWork = () => {
    if (/^addison(?:\s|$)/i.test(selected.name)) {
      window.open("/addison-work", "_blank", "noopener,noreferrer");
      return;
    }

    window.open(
      `/my-work?memberId=${encodeURIComponent(selected.id)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copyWorkLink = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/atlas-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "field-link", memberId: selected.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.fieldPath) {
        throw new Error(payload?.error || "Atlas could not create the work link.");
      }

      const link = new URL(String(payload.fieldPath), window.location.origin).toString();
      try {
        await navigator.clipboard?.writeText(link);
        setMessage("Work link copied");
      } catch {
        setMessage(link);
      }

      await loadTeam();
      window.dispatchEvent(new CustomEvent("atlas:data-changed"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Atlas could not create the work link.",
      );
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="atlas-team-work-actions">
      <button type="button" onClick={viewWork}>
        View Work
      </button>
      <button type="button" onClick={() => void copyWorkLink()} disabled={busy}>
        {busy ? "Creating…" : "Copy Work Link"}
      </button>
      {message ? <span title={message}>{message}</span> : null}

      <style jsx global>{`
        [data-atlas-team-work-actions-host] {
          display: block;
          margin-left: auto;
        }
        .atlas-team-work-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }
        .atlas-team-work-actions button {
          border: 1px solid #d4dee7;
          background: #fff;
          color: #0b3153;
          border-radius: 8px;
          min-height: 32px;
          padding: 6px 9px;
          font: inherit;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }
        .atlas-team-work-actions button:first-child {
          background: #0b3153;
          border-color: #0b3153;
          color: #fff;
        }
        .atlas-team-work-actions button:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .atlas-team-work-actions span {
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #667788;
          font-size: 9px;
          font-weight: 750;
        }
        @media (max-width: 720px) {
          [data-atlas-team-work-actions-host] {
            width: 100%;
            margin-left: 0;
          }
          .atlas-team-work-actions {
            width: 100%;
            justify-content: stretch;
          }
          .atlas-team-work-actions button {
            flex: 1 1 auto;
          }
          .atlas-team-work-actions span {
            width: 100%;
            max-width: none;
          }
        }
      `}</style>
    </div>,
    host,
  );
}
