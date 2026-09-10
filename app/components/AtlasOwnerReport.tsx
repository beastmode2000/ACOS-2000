"use client";

import { useEffect, useMemo, useState } from "react";
import AtlasOwnerReportLegacy from "./AtlasOwnerReportLegacy";

const REPORT_CACHE_PREFIX = "atlas-owner-report-projects-v1:";

function cleanDate(value: unknown) {
  return String(value || "").slice(0, 10);
}

function projectArray(payload: any) {
  const candidates = [
    payload?.photoTimelineProjects,
    payload?.projectRecords,
    payload?.projects,
    payload?.data?.photoTimelineProjects,
    payload?.data?.projectRecords,
    payload?.data?.projects,
  ];
  return candidates.find(Array.isArray) || [];
}

function cachedProjects(propertyId: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${REPORT_CACHE_PREFIX}${propertyId}`) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function projectReportRows(projects: any[], propertyId: string) {
  return projects
    .filter((project) => String(project?.propertyId || "2000") === String(propertyId) && project?.archived !== true)
    .flatMap((project) => {
      const updates = Array.isArray(project?.updates) ? project.updates : [];
      return updates
        .filter((update: any) => update?.includeInOwnerReport !== false && cleanDate(update?.date || update?.createdAt))
        .map((update: any) => {
          const date = cleanDate(update.date || update.createdAt);
          const photoCount = Array.isArray(update.photos) ? update.photos.length : 0;
          const note = [update.title, update.notes, photoCount ? `${photoCount} project photo${photoCount === 1 ? "" : "s"} attached in Projects` : ""]
            .filter(Boolean)
            .join(" — ");
          return {
            id: `owner-project-${project.id}-${update.id}`,
            propertyId,
            title: String(project.title || project.name || "Project update"),
            status: "Completed",
            workType: "Project",
            workCategory: "Projects",
            category: "Projects",
            department: "Projects",
            projectId: project.id,
            vendorId: project.vendorId || "",
            locationId: project.locationId || "",
            assetId: project.assetId || "",
            completedAt: date,
            lastCompletedDate: date,
            completionHistory: [date],
            completionNotes: note,
            notes: note,
            serviceHistory: [{ id: update.id, completedAt: date, notes: note }],
          };
        });
    });
}

export default function AtlasOwnerReport(props: any) {
  const propertyId = String(props.propertyId || "2000");
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    const useCache = () => {
      if (!cancelled) setProjects(cachedProjects(propertyId));
    };

    useCache();
    void fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !payload?.ok) return;
        const rows = projectArray(payload);
        if (rows.length) setProjects(rows);
      })
      .catch(() => undefined);

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (detail?.propertyId && String(detail.propertyId) !== propertyId) return;
      useCache();
    };
    window.addEventListener("atlas:project-report-source-changed", onChanged as EventListener);
    window.addEventListener("atlas:data-changed", useCache as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("atlas:project-report-source-changed", onChanged as EventListener);
      window.removeEventListener("atlas:data-changed", useCache as EventListener);
    };
  }, [propertyId]);

  const projectRows = useMemo(() => projectReportRows(projects, propertyId), [projects, propertyId]);
  const workOrders = useMemo(
    () => [...(Array.isArray(props.workOrders) ? props.workOrders : []), ...projectRows],
    [props.workOrders, projectRows],
  );

  return <AtlasOwnerReportLegacy {...props} workOrders={workOrders} />;
}
