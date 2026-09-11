"use client";

import { useEffect } from "react";

type AtlasTaskRecord = {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  listId?: unknown;
  listName?: unknown;
  taskMeta?: Record<string, unknown>;
};

function isGraduationPartyRecord(record: AtlasTaskRecord) {
  const meta = record.taskMeta || {};
  const listId = String(record.listId || meta.listId || "").trim().toLowerCase();
  const listName = String(record.listName || meta.listName || "").trim().toLowerCase();
  const category = String(record.category || "").trim().toLowerCase();
  const title = String(record.title || "").trim().toLowerCase();

  return (
    listId === "graduation-party" ||
    category === "graduation party checklist" ||
    (category === "atlas list definition" &&
      ["grad party", "graduation party"].includes(listName || title))
  );
}

function removeLocalCopies(ids: Set<string>) {
  for (const key of ["atlas-tasks-v1-2000", "atlas-tasks-v1"]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
      if (Array.isArray(parsed)) {
        window.localStorage.setItem(
          key,
          JSON.stringify(parsed.filter((record) => !ids.has(String(record?.id || "")))),
        );
      }
    } catch {}
  }

  for (const key of ["atlas-task-meta-v1-2000", "atlas-task-meta-v1"]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
      if (parsed && typeof parsed === "object") {
        ids.forEach((id) => delete parsed[id]);
        window.localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch {}
  }

  try {
    const key = "atlas-task-tombstones-v1-2000";
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    const tombstones = new Set(Array.isArray(current) ? current.map(String) : []);
    ids.forEach((id) => tombstones.add(id));
    window.localStorage.setItem(key, JSON.stringify([...tombstones]));
    window.localStorage.setItem("atlas-graduation-party-user-deleted-v1-2000", "true");
  } catch {}
}

export default function AtlasGraduationPartyCleanup() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/atlas?propertyId=2000&gradPartyCleanup=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;

        const payload = await response.json();
        const tasks = Array.isArray(payload?.taskRecords)
          ? payload.taskRecords
          : Array.isArray(payload?.tasks)
            ? payload.tasks
            : [];
        const records = tasks.filter(isGraduationPartyRecord);
        if (!records.length || cancelled) return;

        const ids = new Set<string>(
          records.map((record: AtlasTaskRecord) => String(record.id || "")).filter(Boolean),
        );
        removeLocalCopies(ids);

        await Promise.all(
          [...ids].map(async (id) => {
            const deletion = await fetch("/api/atlas", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
              body: JSON.stringify({ table: "tasks", id, propertyId: "2000" }),
            });
            if (!deletion.ok && deletion.status !== 404) {
              throw new Error(`Could not delete Graduation Party record ${id}`);
            }
          }),
        );

        if (!cancelled && window.sessionStorage.getItem("atlas-grad-party-cleanup-reloaded-v1") !== "true") {
          window.sessionStorage.setItem("atlas-grad-party-cleanup-reloaded-v1", "true");
          window.location.reload();
        }
      } catch {
        // Atlas retries on the next load until every old record is gone.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
