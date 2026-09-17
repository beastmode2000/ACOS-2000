"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type WorkRow = Record<string, unknown>;

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function localDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentPropertyId() {
  const labelled = document.querySelector<HTMLSelectElement>('select[aria-label="Active property"]');
  if (labelled?.value) return labelled.value;
  const candidate = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === "2000"),
  );
  return candidate?.value || "2000";
}

function workSection() {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("main section, section")).find((section) =>
      Array.from(section.querySelectorAll<HTMLElement>("h1,h2,h3,strong")).some(
        (node) => normalized(node.textContent) === "work lists",
      ),
    ) || null
  );
}

function nickLane(section: HTMLElement | null) {
  if (!section) return null;
  for (const strong of Array.from(section.querySelectorAll<HTMLElement>("strong"))) {
    if (normalized(strong.textContent) !== "nick") continue;
    const lane = strong.closest("section") as HTMLElement | null;
    if (lane && lane !== section) return lane;
  }
  return null;
}

function completedDate(record: WorkRow) {
  const today = localDateKey();
  const last = String(record.lastCompletedDate || record.last_completed_date || "").slice(0, 10);
  if (last === today) return true;
  const history = Array.isArray(record.completionHistory)
    ? record.completionHistory
    : Array.isArray(record.completion_history)
      ? record.completion_history
      : [];
  if (history.some((value) => String(value).slice(0, 10) === today)) return true;
  const serviceHistory = Array.isArray(record.serviceHistory)
    ? record.serviceHistory
    : Array.isArray(record.service_history)
      ? record.service_history
      : [];
  return serviceHistory.some((entry: any) => String(entry?.completedAt || entry?.completed_at || "").slice(0, 10) === today);
}

function isNick(record: WorkRow) {
  const value = normalized(record.assignedTo || record.assigned_to || record.assignee);
  return value === "nick" || value.startsWith("nick ");
}

function titleOf(record: WorkRow) {
  return String(record.title || record.name || "Completed work").trim();
}

export default function AtlasDashboardNickCompletedRestore() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [propertyId, setPropertyId] = useState("2000");
  const [rows, setRows] = useState<WorkRow[]>([]);

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const section = workSection();
      const lane = nickLane(section);
      if (!lane) {
        setHost(null);
        return;
      }

      const nextProperty = currentPropertyId();
      setPropertyId((current) => (current === nextProperty ? current : nextProperty));

      let nextHost = lane.querySelector<HTMLElement>(":scope > [data-atlas-nick-completed-host]");
      if (!nextHost) {
        nextHost = document.createElement("div");
        nextHost.dataset.atlasNickCompletedHost = "true";

        const upcomingNode = Array.from(lane.children).find((child) => {
          if (!(child instanceof HTMLElement)) return false;
          return Array.from(child.querySelectorAll<HTMLElement>("strong,span,h4")).some(
            (node) => normalized(node.textContent) === "upcoming",
          );
        });

        if (upcomingNode) lane.insertBefore(nextHost, upcomingNode);
        else lane.appendChild(nextHost);
      }
      setHost((current) => (current === nextHost ? current : nextHost));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("popstate", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("popstate", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}&t=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled || !response.ok || payload?.ok === false) return;
        const records = Array.isArray(payload?.serviceRecords)
          ? payload.serviceRecords
          : Array.isArray(payload?.workOrders)
            ? payload.workOrders
            : [];
        setRows(records);
      } catch {
        if (!cancelled) setRows([]);
      }
    };

    void load();
    const refresh = () => void load();
    window.addEventListener("atlas:data-changed", refresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", refresh as EventListener);
    };
  }, [propertyId]);

  const completed = useMemo(
    () => rows.filter((record) => isNick(record) && completedDate(record)),
    [rows],
  );

  if (!host || !completed.length) return null;

  return createPortal(
    <section className="atlas-nick-completed-restore" aria-label="Nick completed work today">
      <style>{`
        .atlas-nick-completed-restore {
          border-top: 1px solid #E4EAF0;
          padding-top: 8px;
          margin-top: 8px;
          margin-bottom: 8px;
        }
        .atlas-nick-completed-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
          color: #17324D;
          font-size: 12px;
          font-weight: 900;
        }
        .atlas-nick-completed-title span:last-child {
          color: #617487;
          font-size: 11px;
          font-weight: 800;
        }
        .atlas-nick-completed-list {
          display: grid;
          gap: 6px;
        }
        .atlas-nick-completed-row {
          border: 1px solid #D8E0E8;
          border-radius: 9px;
          background: #F7F9FB;
          padding: 8px;
          color: #17324D;
          opacity: .74;
        }
        .atlas-nick-completed-row strong {
          display: block;
          font-size: 14px;
          line-height: 1.3;
          text-decoration: line-through;
        }
        .atlas-nick-completed-row small {
          display: block;
          margin-top: 2px;
          color: #617487;
          font-size: 12px;
        }
      `}</style>
      <div className="atlas-nick-completed-title">
        <span>Completed</span>
        <span>{completed.length}</span>
      </div>
      <div className="atlas-nick-completed-list">
        {completed.map((record, index) => (
          <div className="atlas-nick-completed-row" key={String(record.id || `${titleOf(record)}-${index}`)}>
            <strong>{titleOf(record)}</strong>
            <small>Completed today</small>
          </div>
        ))}
      </div>
    </section>,
    host,
  );
}
