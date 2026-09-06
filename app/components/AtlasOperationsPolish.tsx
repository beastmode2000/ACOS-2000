"use client";

import { useEffect, useMemo, useState } from "react";

type TeamStatusMember = {
  id?: string;
  name?: string;
  email?: string;
  inviteStatus?: string;
  fieldOnly?: boolean;
};

type TeamStatusPayload = {
  ok?: boolean;
  members?: TeamStatusMember[];
};

function normalized(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function pageMain(title: string) {
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("main h1, main h2"),
  ).find((node) => normalized(node.textContent) === normalized(title));
  return (heading?.closest("main") as HTMLElement | null) || null;
}

function mainContaining(phrase: string) {
  const wanted = normalized(phrase);
  return (
    Array.from(document.querySelectorAll<HTMLElement>("main")).find((main) =>
      normalized(main.textContent).includes(wanted),
    ) || null
  );
}

function headingText(section: HTMLElement) {
  const heading = section.querySelector<HTMLElement>("h1, h2, h3, h4");
  if (heading) return normalized(heading.textContent);
  const strong = section.querySelector<HTMLElement>("strong");
  return normalized(strong?.textContent);
}

function shortText(element: HTMLElement) {
  return normalized(element.textContent).replace(/\s+/g, " ");
}

function markDashboard() {
  const root = pageMain("Dashboard") || mainContaining("Daily Operations");
  if (!root) return;
  root.classList.add("atlas-ops-dashboard-root");

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("p"))) {
    const value = normalized(element.textContent);
    if (
      value.includes("live priorities, assignments, schedule pressure") ||
      value.includes("live priorities, assignments, schedule")
    ) {
      element.classList.add("atlas-ops-dashboard-intro-copy");
    }
  }

  const secondary = [
    "completed work",
    "work intelligence",
    "operations analytics",
    "smart route planning",
    "build my day",
    "backlog",
    "operations templates",
    "vehicle care",
    "seasonal work",
  ];

  for (const section of Array.from(
    root.querySelectorAll<HTMLElement>("section"),
  )) {
    const heading = headingText(section);
    if (!heading) continue;

    if (secondary.some((label) => heading === label || heading.startsWith(`${label} `))) {
      section.classList.add("atlas-ops-dashboard-secondary");
      continue;
    }

    if (
      heading.includes("today's priorities") ||
      heading.includes("todays priorities") ||
      heading === "today" ||
      heading.includes("my work")
    ) {
      section.classList.add("atlas-ops-dashboard-primary");
    }

    if (heading.includes("addison")) {
      section.classList.add("atlas-ops-dashboard-addison");
    }

    if (heading.includes("upcoming") || heading.includes("this week")) {
      section.classList.add("atlas-ops-dashboard-upcoming");
    }

    if (
      heading.includes("waiting") ||
      heading.includes("needs attention") ||
      heading.includes("overdue") ||
      heading.includes("today's summary") ||
      heading.includes("todays summary")
    ) {
      section.classList.add("atlas-ops-dashboard-attention");
    }
  }
}

function markCalendar() {
  const root = pageMain("Calendar");
  if (!root) return;
  root.classList.add("atlas-ops-calendar-root");

  const viewButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => ["month", "week", "agenda"].includes(normalized(button.textContent)),
  );
  if (viewButtons.length >= 2) {
    viewButtons[0]?.parentElement?.classList.add("atlas-ops-calendar-view-toggle");
  }

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const value = normalized(button.textContent);
    if (value === "week") button.classList.add("atlas-ops-calendar-week-button");
    if (value.includes("today")) button.classList.add("atlas-ops-calendar-today-button");
  }

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("section, article"))) {
    const value = shortText(element);
    if (value.length > 210) continue;
    if (/no events|nothing scheduled|no calendar items/.test(value)) {
      element.classList.add("atlas-ops-empty-secondary");
    }
  }
}

function markVendors() {
  const root = pageMain("Vendors");
  if (!root) return;
  root.classList.add("atlas-ops-vendors-root");

  const emptyPhrases = [
    "no contacts",
    "no vendor contacts",
    "no related assets",
    "no assets linked",
    "no recent work",
    "no work history",
    "no documents",
    "no manuals",
  ];

  for (const element of Array.from(
    root.querySelectorAll<HTMLElement>("section, article, div"),
  )) {
    const value = shortText(element);
    if (!value || value.length > 150) continue;
    if (!emptyPhrases.some((phrase) => value.includes(phrase))) continue;
    if (element.querySelector("input, textarea, select")) continue;
    element.classList.add("atlas-ops-empty-secondary");
  }

  for (const heading of Array.from(root.querySelectorAll<HTMLElement>("h2, h3, h4"))) {
    const value = normalized(heading.textContent);
    const section = heading.closest<HTMLElement>("section, article, div");
    if (!section) continue;
    if (value.includes("contact")) section.classList.add("atlas-ops-vendor-contacts");
    if (value.includes("asset")) section.classList.add("atlas-ops-vendor-related");
    if (value.includes("work") || value.includes("history")) {
      section.classList.add("atlas-ops-vendor-history");
    }
  }
}

function markOwnerReport() {
  const root = pageMain("Owner Report") || mainContaining("Owner Report");
  if (!root) return;
  root.classList.add("atlas-ops-owner-report-root");

  const reportHeadings = Array.from(root.querySelectorAll<HTMLElement>("h2, h3, h4"));
  for (const heading of reportHeadings) {
    const value = normalized(heading.textContent);
    const section = heading.closest<HTMLElement>("section, article, div");
    if (!section) continue;

    if (value.includes("completed")) section.classList.add("atlas-owner-completed");
    if (value.includes("progress") || value.includes("in progress")) {
      section.classList.add("atlas-owner-progress");
    }
    if (value.includes("upcoming") || value.includes("next")) {
      section.classList.add("atlas-owner-upcoming");
    }
    if (
      value.includes("issue") ||
      value.includes("decision") ||
      value.includes("attention") ||
      value.includes("exception")
    ) {
      section.classList.add("atlas-owner-attention");
    }
  }

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const value = normalized(button.textContent);
    if (/print|pdf|final|save report|save draft/.test(value)) {
      button.classList.add("atlas-owner-report-action");
    }
  }

  const emptyPhrases = [
    "no completed",
    "nothing completed",
    "no upcoming",
    "no issues",
    "no exceptions",
    "nothing to report",
  ];
  for (const element of Array.from(root.querySelectorAll<HTMLElement>("section, article"))) {
    const value = shortText(element);
    if (value.length > 180) continue;
    if (!emptyPhrases.some((phrase) => value.includes(phrase))) continue;
    element.classList.add("atlas-ops-empty-secondary");
  }
}

function markAskAtlas() {
  const root = pageMain("Ask Atlas") || mainContaining("Ask Atlas");
  if (!root) return;
  root.classList.add("atlas-ops-ask-root");

  const duplicateActions = new Set([
    "plan my day",
    "build my day",
    "create work",
    "create work order",
  ]);

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const value = normalized(button.textContent);
    if (duplicateActions.has(value)) {
      button.classList.add("atlas-ask-duplicate-action");
      continue;
    }
    if (/manual|as-built|as built|blueprint|mechanical room/.test(value)) {
      button.classList.add("atlas-ask-reference-shortcut");
    }
  }

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))) {
    const value = shortText(element);
    if (!value || value.length > 260) continue;
    if (value.includes("ask atlas weekly maintenance")) {
      element.classList.add("atlas-ask-secondary-planner");
    }
  }
}

function markAssets() {
  const root = pageMain("Assets");
  if (!root) return;
  root.classList.add("atlas-ops-assets-root");

  for (const spec of Array.from(
    root.querySelectorAll<HTMLElement>(".atlas-asset-reference-spec"),
  )) {
    const label = normalized(spec.querySelector("span")?.textContent);
    if (/^make$|^model$|^serial|vin|hin/.test(label)) {
      spec.classList.add("atlas-asset-key-spec");
    }
  }

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>("button"))) {
    const value = normalized(button.textContent);
    if (/^(open|view|preview)( manual| pdf)?$/.test(value)) {
      button.classList.add("atlas-asset-fast-manual");
    }
  }

  const historyPanel = Array.from(
    root.querySelectorAll<HTMLElement>(".atlas-asset-reference-content-panel"),
  ).find((panel) => normalized(panel.querySelector("h3")?.textContent) === "history");
  const list = historyPanel?.querySelector<HTMLElement>(".atlas-asset-reference-list");
  if (!list) return;

  const rows = Array.from(list.querySelectorAll<HTMLElement>(":scope > .atlas-asset-reference-row"));
  const signature = rows
    .map((row) => normalized(row.querySelector(".atlas-asset-reference-row-date")?.textContent))
    .join("|");
  if (!signature || list.dataset.atlasHistorySignature === signature) return;

  for (const old of Array.from(list.querySelectorAll<HTMLElement>(":scope > .atlas-asset-history-date-group"))) {
    old.remove();
  }

  let lastDate = "";
  for (const row of rows) {
    const date = String(
      row.querySelector<HTMLElement>(".atlas-asset-reference-row-date")?.textContent || "",
    ).trim();
    if (!date || date === lastDate) continue;
    lastDate = date;
    const label = document.createElement("div");
    label.className = "atlas-asset-history-date-group";
    label.textContent = date;
    list.insertBefore(label, row);
  }
  list.dataset.atlasHistorySignature = signature;
}

function markLocations() {
  const root = pageMain("Locations");
  if (!root) return;
  root.classList.add("atlas-ops-locations-root");

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("section, article, div"))) {
    const value = shortText(element);
    if (!value || value.length > 145) continue;
    if (/no assets|no manuals|no finishes|no appliances|nothing linked/.test(value)) {
      if (!element.querySelector("input, textarea, select")) {
        element.classList.add("atlas-ops-empty-secondary");
      }
    }
  }
}

function displayInviteStatus(value: unknown, fieldOnly = false) {
  if (fieldOnly) return "My Work Link";
  const status = String(value || "Not Invited").trim();
  if (status === "Created" || status === "Not Invited") return "Not Sent";
  if (status === "No Login") return "My Work Link";
  return status;
}

function inviteTone(value: string) {
  const status = normalized(value);
  if (status === "accepted") return "accepted";
  if (status === "sent") return "sent";
  if (status === "expired" || status === "failed") return "attention";
  if (status === "my work link") return "field";
  return "not-sent";
}

function markTeamInviteStatuses(statuses: Map<string, TeamStatusMember>) {
  const root = pageMain("Team") || mainContaining("People & Access");
  if (!root) return;

  for (const row of Array.from(root.querySelectorAll<HTMLElement>(".atlas-team-person-row"))) {
    const name = normalized(row.querySelector(".atlas-team-person-main strong")?.textContent);
    if (!name) continue;
    const member = statuses.get(name);
    if (!member) continue;

    const label = displayInviteStatus(member.inviteStatus, member.fieldOnly);
    let badge = row.querySelector<HTMLElement>(".atlas-team-invite-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "atlas-team-invite-badge";
      row.querySelector(".atlas-team-person-main")?.appendChild(badge);
    }
    badge.textContent = label;
    badge.dataset.tone = inviteTone(label);
  }

  const selectedName = normalized(
    root.querySelector<HTMLElement>(".atlas-team-person-header h2")?.textContent,
  );
  if (!selectedName) return;
  const selected = statuses.get(selectedName);
  if (!selected) return;

  const label = displayInviteStatus(selected.inviteStatus, selected.fieldOnly);
  const header = root.querySelector<HTMLElement>(".atlas-team-person-header > div");
  if (!header) return;

  let detail = header.querySelector<HTMLElement>(".atlas-team-selected-invite-status");
  if (!detail) {
    detail = document.createElement("span");
    detail.className = "atlas-team-selected-invite-status";
    header.appendChild(detail);
  }
  detail.textContent = selected.fieldOnly ? label : `Invitation: ${label}`;
  detail.dataset.tone = inviteTone(label);
}

export default function AtlasOperationsPolish() {
  const [teamMembers, setTeamMembers] = useState<TeamStatusMember[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadTeam = async () => {
      try {
        const response = await fetch("/api/atlas-team", {
          cache: "no-store",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => ({}))) as TeamStatusPayload;
        if (!cancelled && response.ok && Array.isArray(payload.members)) {
          setTeamMembers(payload.members);
        }
      } catch {
        // Invitation status is supplemental; leave the Team page usable if it cannot load.
      }
    };

    void loadTeam();
    const onDataChanged = () => void loadTeam();
    window.addEventListener("atlas:data-changed", onDataChanged as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:data-changed", onDataChanged as EventListener);
    };
  }, []);

  const teamStatusMap = useMemo(() => {
    const map = new Map<string, TeamStatusMember>();
    for (const member of teamMembers) {
      const key = normalized(member.name);
      if (key) map.set(key, member);
    }
    return map;
  }, [teamMembers]);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      markDashboard();
      markCalendar();
      markVendors();
      markOwnerReport();
      markAskAtlas();
      markAssets();
      markLocations();
      markTeamInviteStatuses(teamStatusMap);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", schedule, true);
    document.addEventListener("change", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", schedule, true);
      document.removeEventListener("change", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [teamStatusMap]);

  return (
    <style jsx global>{`
      .atlas-ops-empty-secondary,
      .atlas-ops-dashboard-secondary,
      .atlas-ask-duplicate-action,
      .atlas-ask-secondary-planner {
        display: none !important;
      }

      .atlas-ops-dashboard-intro-copy {
        display: none !important;
      }

      .atlas-ops-dashboard-root section {
        border-radius: 12px !important;
        box-shadow: none !important;
      }

      .atlas-ops-dashboard-root .atlas-ops-dashboard-primary,
      .atlas-ops-dashboard-root .atlas-ops-dashboard-addison,
      .atlas-ops-dashboard-root .atlas-ops-dashboard-upcoming,
      .atlas-ops-dashboard-root .atlas-ops-dashboard-attention {
        margin-block: 0 !important;
      }

      .atlas-ops-dashboard-root .atlas-ops-dashboard-attention {
        border-color: #efc66c !important;
        background: #fffaf0 !important;
      }

      .atlas-ops-calendar-root {
        --atlas-calendar-soft: #f7f9fc;
      }

      .atlas-ops-calendar-view-toggle {
        gap: 4px !important;
        padding: 3px !important;
        border: 1px solid #dce5ed !important;
        border-radius: 10px !important;
        background: var(--atlas-calendar-soft) !important;
      }

      .atlas-ops-calendar-view-toggle > button {
        min-height: 32px !important;
        padding: 5px 9px !important;
        border-radius: 7px !important;
      }

      .atlas-ops-calendar-week-button {
        font-weight: 800 !important;
      }

      .atlas-ops-calendar-today-button {
        min-height: 34px !important;
      }

      .atlas-ops-calendar-root section,
      .atlas-ops-calendar-root article {
        border-radius: 11px !important;
        box-shadow: none !important;
      }

      .atlas-ops-vendors-root section,
      .atlas-ops-vendors-root article {
        border-radius: 11px !important;
        box-shadow: none !important;
      }

      .atlas-ops-vendors-root .atlas-ops-vendor-contacts,
      .atlas-ops-vendors-root .atlas-ops-vendor-related,
      .atlas-ops-vendors-root .atlas-ops-vendor-history {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }

      .atlas-ops-vendors-root a[href^="tel:"],
      .atlas-ops-vendors-root a[href^="mailto:"] {
        text-decoration: none !important;
        font-weight: 700 !important;
      }

      .atlas-ops-owner-report-root {
        --atlas-owner-border: #dce5ed;
        --atlas-owner-soft: #f8fafc;
      }

      .atlas-ops-owner-report-root section,
      .atlas-ops-owner-report-root article {
        border-radius: 10px !important;
        border-color: var(--atlas-owner-border) !important;
        box-shadow: none !important;
      }

      .atlas-ops-owner-report-root .atlas-owner-completed {
        border-left: 3px solid #159455 !important;
      }

      .atlas-ops-owner-report-root .atlas-owner-progress,
      .atlas-ops-owner-report-root .atlas-owner-upcoming {
        border-left: 3px solid #1f6fd1 !important;
      }

      .atlas-ops-owner-report-root .atlas-owner-attention {
        border-left: 3px solid #c99a3d !important;
        background: #fffaf0 !important;
      }

      .atlas-owner-report-action {
        min-height: 34px !important;
        padding: 6px 10px !important;
      }

      .atlas-ops-ask-root {
        --atlas-ask-border: #dce5ed;
      }

      .atlas-ops-ask-root section,
      .atlas-ops-ask-root article,
      .atlas-ops-ask-root aside > div {
        border-radius: 11px !important;
        box-shadow: none !important;
      }

      .atlas-ask-reference-shortcut {
        border-color: #8eb9ec !important;
        background: #eef6ff !important;
        color: #175fae !important;
        font-weight: 800 !important;
      }

      .atlas-ops-assets-root .atlas-asset-key-spec {
        background: #f7faff !important;
        border-color: #cddff2 !important;
      }

      .atlas-ops-assets-root .atlas-asset-key-spec strong {
        color: #071b2f !important;
        font-weight: 800 !important;
      }

      .atlas-asset-fast-manual {
        min-height: 32px !important;
        padding: 5px 9px !important;
      }

      .atlas-asset-history-date-group {
        padding: 10px 2px 5px;
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        border-bottom: 1px solid #e8edf2;
      }

      .atlas-ops-locations-root section,
      .atlas-ops-locations-root article {
        box-shadow: none !important;
      }

      .atlas-team-invite-badge,
      .atlas-team-selected-invite-status {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        min-height: 20px;
        padding: 2px 7px;
        border-radius: 999px;
        border: 1px solid #dce5ed;
        background: #f7f9fc;
        color: #64748b;
        font-size: 10.5px !important;
        font-weight: 750 !important;
        line-height: 1.2 !important;
      }

      .atlas-team-invite-badge {
        margin-top: 3px;
      }

      .atlas-team-selected-invite-status {
        margin-top: 7px;
      }

      .atlas-team-invite-badge[data-tone="accepted"],
      .atlas-team-selected-invite-status[data-tone="accepted"] {
        border-color: #b8dfc8;
        background: #eaf8ef;
        color: #087443;
      }

      .atlas-team-invite-badge[data-tone="sent"],
      .atlas-team-selected-invite-status[data-tone="sent"] {
        border-color: #b9d4f2;
        background: #eef6ff;
        color: #175fae;
      }

      .atlas-team-invite-badge[data-tone="attention"],
      .atlas-team-selected-invite-status[data-tone="attention"] {
        border-color: #efc66c;
        background: #fff6dd;
        color: #8a5a00;
      }

      .atlas-team-invite-badge[data-tone="field"],
      .atlas-team-selected-invite-status[data-tone="field"] {
        border-color: #d4c7ef;
        background: #f5f0ff;
        color: #6941c6;
      }

      @media (min-width: 901px) {
        .atlas-ops-dashboard-root,
        .atlas-ops-calendar-root,
        .atlas-ops-vendors-root,
        .atlas-ops-owner-report-root,
        .atlas-ops-ask-root,
        .atlas-ops-locations-root {
          min-width: 0;
        }
      }

      @media (max-width: 900px) {
        .atlas-ops-dashboard-root,
        .atlas-ops-calendar-root,
        .atlas-ops-vendors-root,
        .atlas-ops-owner-report-root,
        .atlas-ops-ask-root,
        .atlas-ops-assets-root,
        .atlas-ops-locations-root {
          overflow-x: hidden !important;
        }

        .atlas-ops-dashboard-root section,
        .atlas-ops-calendar-root section,
        .atlas-ops-vendors-root section,
        .atlas-ops-owner-report-root section,
        .atlas-ops-ask-root section,
        .atlas-ops-locations-root section {
          padding: 10px !important;
        }

        .atlas-ops-dashboard-root button,
        .atlas-ops-calendar-root button,
        .atlas-ops-vendors-root button,
        .atlas-ops-owner-report-root button,
        .atlas-ops-ask-root button,
        .atlas-ops-assets-root button,
        .atlas-ops-locations-root button {
          min-height: 38px;
        }

        .atlas-ops-dashboard-root input,
        .atlas-ops-dashboard-root select,
        .atlas-ops-dashboard-root textarea,
        .atlas-ops-calendar-root input,
        .atlas-ops-calendar-root select,
        .atlas-ops-calendar-root textarea,
        .atlas-ops-vendors-root input,
        .atlas-ops-vendors-root select,
        .atlas-ops-vendors-root textarea,
        .atlas-ops-owner-report-root input,
        .atlas-ops-owner-report-root select,
        .atlas-ops-owner-report-root textarea,
        .atlas-ops-ask-root input,
        .atlas-ops-ask-root select,
        .atlas-ops-ask-root textarea {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        .atlas-ops-calendar-view-toggle {
          width: 100%;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .atlas-ops-calendar-view-toggle > button {
          width: 100%;
        }

        .atlas-team-selected-invite-status {
          margin-top: 6px;
        }
      }

      @media print {
        .atlas-ops-owner-report-root nav,
        .atlas-ops-owner-report-root aside,
        .atlas-ops-owner-report-root .atlas-owner-report-action {
          display: none !important;
        }

        .atlas-ops-owner-report-root {
          background: #fff !important;
          color: #111 !important;
        }

        .atlas-ops-owner-report-root section,
        .atlas-ops-owner-report-root article {
          break-inside: avoid;
          box-shadow: none !important;
        }
      }
    `}</style>
  );
}
