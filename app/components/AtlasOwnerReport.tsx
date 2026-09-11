"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AtlasOwnerReportLegacy from "./AtlasOwnerReportLegacy";
import AtlasOwnerInputPanel from "./AtlasOwnerInputPanel";

const REPORT_CACHE_PREFIX = "atlas-owner-report-projects-v1:";

function cleanDate(value: unknown) {
  return String(value || "").slice(0, 10);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function photoSource(photo: any) {
  return String(photo?.dataUrl || photo?.url || photo?.src || photo?.source || "");
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

function inRange(date: string, start: string, end: string) {
  return Boolean(date && (!start || date >= start) && (!end || date <= end));
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
          const photoCount = Array.isArray(update.photos) ? update.photos.filter((photo: any) => photoSource(photo)).length : 0;
          const note = [
            update.title,
            update.notes,
            photoCount ? `${photoCount} project photo${photoCount === 1 ? "" : "s"} attached` : "",
          ]
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

type ReportPhoto = {
  key: string;
  project: string;
  date: string;
  update: string;
  caption: string;
  src: string;
};

function projectReportPhotos(projects: any[], propertyId: string, start: string, end: string): ReportPhoto[] {
  const result: ReportPhoto[] = [];
  for (const project of projects) {
    if (String(project?.propertyId || "2000") !== String(propertyId) || project?.archived === true) continue;
    const projectName = String(project.title || project.name || "Project");
    for (const photo of Array.isArray(project.photos) ? project.photos : []) {
      const date = cleanDate(photo.date || photo.createdAt);
      const src = photoSource(photo);
      if (!src || photo.includeInOwnerReport === false || !inRange(date, start, end)) continue;
      result.push({
        key: `project-${project.id}-${photo.id}`,
        project: projectName,
        date,
        update: "Project photo",
        caption: String(photo.caption || ""),
        src,
      });
    }
    for (const update of Array.isArray(project.updates) ? project.updates : []) {
      if (update.includeInOwnerReport === false) continue;
      const updateDate = cleanDate(update.date || update.createdAt);
      if (!inRange(updateDate, start, end)) continue;
      for (const photo of Array.isArray(update.photos) ? update.photos : []) {
        const src = photoSource(photo);
        if (!src) continue;
        result.push({
          key: `update-${project.id}-${update.id}-${photo.id}`,
          project: projectName,
          date: cleanDate(photo.date || updateDate),
          update: String(update.title || "Project update"),
          caption: String(photo.caption || ""),
          src,
        });
      }
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date) || a.project.localeCompare(b.project));
}

function printPhotoMarkup(photos: ReportPhoto[]) {
  if (!photos.length) return "";
  return `<style>
    .project-photo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:7px}
    .project-photo-card{border:1px solid #d7e0e8;border-radius:7px;overflow:hidden;break-inside:avoid;background:#fff}
    .project-photo-card img{width:100%;height:185px;object-fit:cover;display:block}
    .project-photo-meta{padding:7px 8px;font-size:8.5px;color:#46596b}
    .project-photo-meta strong{display:block;color:#0b2a44;font-size:9.5px;margin-bottom:2px}
  </style><section class="section"><h2>Project Photos</h2><div class="project-photo-grid">${photos
    .map(
      (photo) => `<div class="project-photo-card"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.caption || photo.project)}"><div class="project-photo-meta"><strong>${escapeHtml(photo.project)}</strong>${escapeHtml([photo.update, photo.date].filter(Boolean).join(" · "))}${photo.caption ? `<div>${escapeHtml(photo.caption)}</div>` : ""}</div></div>`,
    )
    .join("")}</div></section>`;
}

export default function AtlasOwnerReport(props: any) {
  const propertyId = String(props.propertyId || "2000");
  const [projects, setProjects] = useState<any[]>([]);
  const [range, setRange] = useState({ start: "", end: "" });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const printRangeRef = useRef({ start: "", end: "" });
  const projectsRef = useRef<any[]>([]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const syncRange = () => {
      const dates = Array.from(root.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
      const next = { start: dates[0]?.value || "", end: dates[1]?.value || "" };
      setRange((current) => (current.start === next.start && current.end === next.end ? current : next));
      return next;
    };
    syncRange();
    const onInput = () => syncRange();
    root.addEventListener("input", onInput, true);
    root.addEventListener("change", onInput, true);
    const observer = new MutationObserver(syncRange);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("change", onInput, true);
    };
  }, []);

  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const popup = originalOpen.call(window, url as any, target, features);
      const armed = printRangeRef.current;
      if (!popup || !armed.start || !armed.end) return popup;
      printRangeRef.current = { start: "", end: "" };
      const photos = projectReportPhotos(projectsRef.current, propertyId, armed.start, armed.end);
      if (!photos.length) return popup;
      const originalWrite = popup.document.write.bind(popup.document);
      popup.document.write = ((...chunks: string[]) => {
        const markup = printPhotoMarkup(photos);
        const next = chunks.map((chunk) =>
          typeof chunk === "string" && chunk.includes("</body>") ? chunk.replace("</body>", `${markup}</body>`) : chunk,
        );
        return originalWrite(...next);
      }) as typeof popup.document.write;
      return popup;
    } as typeof window.open;
    return () => {
      window.open = originalOpen;
    };
  }, [propertyId]);

  const projectRows = useMemo(() => projectReportRows(projects, propertyId), [projects, propertyId]);
  const workOrders = useMemo(
    () => [...(Array.isArray(props.workOrders) ? props.workOrders : []), ...projectRows],
    [props.workOrders, projectRows],
  );
  const reportPhotos = useMemo(
    () => projectReportPhotos(projects, propertyId, range.start, range.end),
    [projects, propertyId, range],
  );

  function armPrint(event: any) {
    const target = event.target as HTMLElement | null;
    const button = target?.closest("button");
    if (!button || String(button.textContent || "").trim().toLowerCase() !== "print / pdf") return;
    const dates = Array.from(rootRef.current?.querySelectorAll('input[type="date"]') || []) as HTMLInputElement[];
    printRangeRef.current = { start: dates[0]?.value || range.start, end: dates[1]?.value || range.end };
  }

  return (
    <div ref={rootRef} onClickCapture={armPrint} style={{ display: "grid", gap: 12 }}>
      <AtlasOwnerInputPanel
        propertyId={propertyId}
        projects={projects}
        isMobile={props.isMobile}
        colors={props.colors}
      />
      <AtlasOwnerReportLegacy {...props} workOrders={workOrders} />
      {reportPhotos.length ? (
        <section style={{ border: `1px solid ${props.colors?.line || "#D9E2EA"}`, borderRadius: 12, background: "#FFFFFF", padding: props.isMobile ? 10 : 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 9 }}>
            <strong style={{ color: props.colors?.navy || "#0A2841" }}>Project Photos in this report</strong>
            <span style={{ color: props.colors?.muted || "#6B7C8C", fontSize: 10 }}>{reportPhotos.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: props.isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
            {reportPhotos.map((photo) => (
              <div key={photo.key} style={{ border: `1px solid ${props.colors?.line || "#D9E2EA"}`, borderRadius: 9, overflow: "hidden" }}>
                <img src={photo.src} alt={photo.caption || photo.project} style={{ width: "100%", height: props.isMobile ? 180 : 145, objectFit: "cover", display: "block" }} />
                <div style={{ padding: 7, fontSize: 10, color: props.colors?.muted || "#6B7C8C" }}>
                  <strong style={{ display: "block", color: props.colors?.navy || "#0A2841", fontSize: 11 }}>{photo.project}</strong>
                  {[photo.update, photo.date].filter(Boolean).join(" · ")}
                  {photo.caption ? <div style={{ marginTop: 3 }}>{photo.caption}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
