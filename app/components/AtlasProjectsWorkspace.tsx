"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type ProjectPhoto = {
  id: string;
  date: string;
  caption: string;
  dataUrl?: string;
  url?: string;
  src?: string;
  includeInOwnerReport?: boolean;
  createdAt: string;
  updatedAt?: string;
};

type ProjectUpdate = {
  id: string;
  date: string;
  title: string;
  notes: string;
  includeInOwnerReport?: boolean;
  photos: ProjectPhoto[];
  createdAt: string;
  updatedAt?: string;
};

type ProjectDraft = {
  title: string;
  category: string;
  status: string;
  startDate: string;
  completedAt: string;
  locationId: string;
  assetId: string;
  vendorId: string;
  notes: string;
  progress: number;
};

const REPORT_CACHE_PREFIX = "atlas-owner-report-projects-v1:";

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanDate(value: unknown) {
  return String(value || "").slice(0, 10);
}

function photoSource(photo: any) {
  return String(photo?.dataUrl || photo?.url || photo?.src || photo?.source || "");
}

function normalizedUpdates(project: any): ProjectUpdate[] {
  return Array.isArray(project?.updates)
    ? project.updates.map((update: any) => ({
        ...update,
        id: String(update.id || uid("project-update")),
        date: cleanDate(update.date || update.createdAt || localDate()),
        title: String(update.title || ""),
        notes: String(update.notes || update.description || ""),
        includeInOwnerReport: update.includeInOwnerReport !== false,
        photos: Array.isArray(update.photos) ? update.photos : [],
        createdAt: String(update.createdAt || new Date().toISOString()),
      }))
    : [];
}

function normalizedPhotos(project: any): ProjectPhoto[] {
  return Array.isArray(project?.photos) ? project.photos : [];
}

function projectDraft(project: any): ProjectDraft {
  return {
    title: String(project?.title || project?.name || ""),
    category: String(project?.category || "General"),
    status: String(project?.status || "Planning"),
    startDate: cleanDate(project?.startDate || project?.date || project?.createdAt || localDate()),
    completedAt: cleanDate(project?.completedAt || project?.completedDate || ""),
    locationId: String(project?.locationId || ""),
    assetId: String(project?.assetId || ""),
    vendorId: String(project?.vendorId || ""),
    notes: String(project?.notes || project?.description || ""),
    progress: Number.isFinite(Number(project?.progress)) ? Number(project.progress) : project?.status === "Completed" ? 100 : 0,
  };
}

function emptyDraft(): ProjectDraft {
  return {
    title: "",
    category: "General",
    status: "Planning",
    startDate: localDate(),
    completedAt: "",
    locationId: "",
    assetId: "",
    vendorId: "",
    notes: "",
    progress: 0,
  };
}

async function fileToProjectPhoto(file: File): Promise<ProjectPhoto> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });

  let dataUrl = original;
  try {
    dataUrl = await new Promise<string>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        if (scale >= 1 && original.length < 1_500_000) {
          resolve(original);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(original);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => resolve(original);
      image.src = original;
    });
  } catch {
    dataUrl = original;
  }

  return {
    id: uid("project-photo"),
    date: localDate(),
    caption: "",
    dataUrl,
    includeInOwnerReport: true,
    createdAt: new Date().toISOString(),
  };
}

export default function AtlasProjectsWorkspace(props: any) {
  const {
    activePropertyId = "2000",
    isMobile = false,
    colors = {
      navy: "#0A2841",
      gold: "#C99A3D",
      line: "#D9E2EA",
      panel: "#F5F8FB",
      card: "#FFFFFF",
      text: "#1B2A36",
      muted: "#6B7C8C",
      red: "#B42318",
      green: "#087443",
    },
    goldButtonStyle = {},
    secondaryButtonStyle = {},
    mutedSmallStyle = {},
    assetRecords = [],
    locations = [],
    vendorRecords = [],
    serviceRecords = [],
    photoTimelineProjects = [],
    setPhotoTimelineProjects = () => undefined,
    setScreen = () => undefined,
    setSelectedServiceId = () => undefined,
    showSaveToast = () => undefined,
  } = props;

  const propertyProjects = useMemo(
    () =>
      (Array.isArray(photoTimelineProjects) ? photoTimelineProjects : []).filter(
        (project: any) =>
          String(project?.propertyId || "2000") === String(activePropertyId) && project?.archived !== true,
      ),
    [photoTimelineProjects, activePropertyId],
  );

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newDraft, setNewDraft] = useState<ProjectDraft>(emptyDraft());
  const [updateDraft, setUpdateDraft] = useState({ date: localDate(), title: "", notes: "", includeInOwnerReport: true });
  const [editingUpdateId, setEditingUpdateId] = useState("");
  const [updateEditDraft, setUpdateEditDraft] = useState({ date: "", title: "", notes: "", includeInOwnerReport: true });
  const [busyPhotoTarget, setBusyPhotoTarget] = useState("");
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const captureTargetRef = useRef<{ projectId: string; updateId?: string } | null>(null);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return propertyProjects
      .filter((project: any) => statusFilter === "All" || String(project.status || "Planning") === statusFilter)
      .filter((project: any) => {
        if (!q) return true;
        const text = [
          project.title,
          project.name,
          project.category,
          project.status,
          project.notes,
          vendorRecords.find((vendor: any) => vendor.id === project.vendorId)?.name,
          locations.find((location: any) => location.id === project.locationId)?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      })
      .sort((a: any, b: any) => {
        const aDone = String(a.status) === "Completed" ? 1 : 0;
        const bDone = String(b.status) === "Completed" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return String(b.updatedAt || b.createdAt || b.startDate || "").localeCompare(
          String(a.updatedAt || a.createdAt || a.startDate || ""),
        );
      });
  }, [propertyProjects, search, statusFilter, vendorRecords, locations]);

  const selectedProject =
    propertyProjects.find((project: any) => String(project.id) === String(selectedProjectId)) || null;

  useEffect(() => {
    if (!selectedProjectId && propertyProjects.length) setSelectedProjectId(String(propertyProjects[0].id));
    if (selectedProjectId && !propertyProjects.some((project: any) => String(project.id) === String(selectedProjectId))) {
      setSelectedProjectId(propertyProjects.length ? String(propertyProjects[0].id) : "");
    }
  }, [propertyProjects, selectedProjectId]);

  useEffect(() => {
    setEditing(false);
    if (selectedProject) setDraft(projectDraft(selectedProject));
  }, [selectedProjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`${REPORT_CACHE_PREFIX}${activePropertyId}`, JSON.stringify(propertyProjects));
      window.dispatchEvent(
        new CustomEvent("atlas:project-report-source-changed", {
          detail: { propertyId: activePropertyId },
        }),
      );
    } catch {}
  }, [propertyProjects, activePropertyId]);

  function mutateProjects(transform: (projects: any[]) => any[]) {
    setPhotoTimelineProjects((current: any[]) => transform(Array.isArray(current) ? current : []));
  }

  function patchProject(projectId: string, patch: Record<string, unknown>) {
    mutateProjects((projects) =>
      projects.map((project: any) =>
        String(project.id) === String(projectId)
          ? { ...project, ...patch, updatedAt: new Date().toISOString() }
          : project,
      ),
    );
  }

  function saveProjectDetails() {
    if (!selectedProject || !draft.title.trim() || !draft.startDate) return;
    const nextStatus = draft.status;
    patchProject(String(selectedProject.id), {
      title: draft.title.trim(),
      category: draft.category,
      status: nextStatus,
      phase: nextStatus,
      startDate: draft.startDate,
      completedAt: nextStatus === "Completed" ? draft.completedAt || draft.startDate : draft.completedAt,
      locationId: draft.locationId,
      assetId: draft.assetId,
      vendorId: draft.vendorId,
      vendorIds: draft.vendorId
        ? Array.from(new Set([draft.vendorId, ...(Array.isArray(selectedProject.vendorIds) ? selectedProject.vendorIds : [])]))
        : Array.isArray(selectedProject.vendorIds)
          ? selectedProject.vendorIds
          : [],
      notes: draft.notes,
      progress: Math.max(0, Math.min(100, Number(draft.progress) || 0)),
    });
    setEditing(false);
    showSaveToast("Project saved.");
  }

  function createProject() {
    if (!newDraft.title.trim() || !newDraft.startDate) return;
    const now = new Date().toISOString();
    const project = {
      propertyId: activePropertyId,
      id: uid("timeline-project"),
      title: newDraft.title.trim(),
      category: newDraft.category,
      scale: "Standard",
      status: newDraft.status,
      assetId: newDraft.assetId,
      locationId: newDraft.locationId,
      vendorId: newDraft.vendorId,
      workOrderId: "",
      workOrderIds: [],
      vendorIds: newDraft.vendorId ? [newDraft.vendorId] : [],
      documentIds: [],
      assigneeIds: [],
      notes: newDraft.notes,
      coverPhotoId: "",
      photos: [],
      updates: [],
      createdAt: now,
      updatedAt: now,
      progress: newDraft.status === "Completed" ? 100 : newDraft.progress,
      phase: newDraft.status,
      completedAt: newDraft.status === "Completed" ? newDraft.completedAt || newDraft.startDate : newDraft.completedAt,
      startDate: newDraft.startDate,
      archived: false,
    };
    mutateProjects((projects) => [...projects, project]);
    setSelectedProjectId(project.id);
    setShowNewProject(false);
    setNewDraft(emptyDraft());
    showSaveToast("Project added.");
  }

  function deleteProject(projectId: string) {
    if (!window.confirm("Delete this project? This removes the project, its updates, and photos.")) return;
    mutateProjects((projects) => projects.filter((project: any) => String(project.id) !== String(projectId)));
    setSelectedProjectId("");
    setEditing(false);
    showSaveToast("Project deleted.");
  }

  function addUpdate() {
    if (!selectedProject || (!updateDraft.title.trim() && !updateDraft.notes.trim())) return;
    const update: ProjectUpdate = {
      id: uid("project-update"),
      date: updateDraft.date || localDate(),
      title: updateDraft.title.trim(),
      notes: updateDraft.notes.trim(),
      includeInOwnerReport: updateDraft.includeInOwnerReport,
      photos: [],
      createdAt: new Date().toISOString(),
    };
    patchProject(String(selectedProject.id), {
      updates: [update, ...normalizedUpdates(selectedProject)],
    });
    setUpdateDraft({ date: localDate(), title: "", notes: "", includeInOwnerReport: true });
    showSaveToast("Project update added.");
  }

  function beginEditUpdate(update: ProjectUpdate) {
    setEditingUpdateId(update.id);
    setUpdateEditDraft({
      date: update.date || localDate(),
      title: update.title || "",
      notes: update.notes || "",
      includeInOwnerReport: update.includeInOwnerReport !== false,
    });
  }

  function saveUpdate(updateId: string) {
    if (!selectedProject) return;
    const updates = normalizedUpdates(selectedProject).map((update) =>
      update.id === updateId
        ? {
            ...update,
            date: updateEditDraft.date || update.date,
            title: updateEditDraft.title.trim(),
            notes: updateEditDraft.notes.trim(),
            includeInOwnerReport: updateEditDraft.includeInOwnerReport,
            updatedAt: new Date().toISOString(),
          }
        : update,
    );
    patchProject(String(selectedProject.id), { updates });
    setEditingUpdateId("");
    showSaveToast("Project update saved.");
  }

  function deleteUpdate(updateId: string) {
    if (!selectedProject || !window.confirm("Delete this project update and its attached photos?")) return;
    patchProject(String(selectedProject.id), {
      updates: normalizedUpdates(selectedProject).filter((update) => update.id !== updateId),
    });
    setEditingUpdateId("");
    showSaveToast("Project update deleted.");
  }

  async function addPhotoFiles(projectId: string, files: FileList | File[], updateId?: string) {
    const list = (Array.from(files || []) as File[]).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;
    const key = `${projectId}:${updateId || "project"}`;
    setBusyPhotoTarget(key);
    try {
      const added = await Promise.all(list.slice(0, 20).map(fileToProjectPhoto));
      mutateProjects((projects) =>
        projects.map((project: any) => {
          if (String(project.id) !== String(projectId)) return project;
          if (updateId) {
            const updates = normalizedUpdates(project).map((update) =>
              update.id === updateId
                ? { ...update, photos: [...(Array.isArray(update.photos) ? update.photos : []), ...added], updatedAt: new Date().toISOString() }
                : update,
            );
            return { ...project, updates, updatedAt: new Date().toISOString() };
          }
          return {
            ...project,
            photos: [...normalizedPhotos(project), ...added],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      showSaveToast(added.length === 1 ? "Photo added." : `${added.length} photos added.`);
    } finally {
      setBusyPhotoTarget("");
    }
  }

  function patchPhoto(projectId: string, photoId: string, patch: Record<string, unknown>, updateId?: string) {
    mutateProjects((projects) =>
      projects.map((project: any) => {
        if (String(project.id) !== String(projectId)) return project;
        if (updateId) {
          const updates = normalizedUpdates(project).map((update) =>
            update.id === updateId
              ? {
                  ...update,
                  photos: (Array.isArray(update.photos) ? update.photos : []).map((photo: ProjectPhoto) =>
                    photo.id === photoId ? { ...photo, ...patch, updatedAt: new Date().toISOString() } : photo,
                  ),
                }
              : update,
          );
          return { ...project, updates, updatedAt: new Date().toISOString() };
        }
        return {
          ...project,
          photos: normalizedPhotos(project).map((photo) =>
            photo.id === photoId ? { ...photo, ...patch, updatedAt: new Date().toISOString() } : photo,
          ),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  function deletePhoto(projectId: string, photoId: string, updateId?: string) {
    mutateProjects((projects) =>
      projects.map((project: any) => {
        if (String(project.id) !== String(projectId)) return project;
        if (updateId) {
          return {
            ...project,
            updates: normalizedUpdates(project).map((update) =>
              update.id === updateId
                ? { ...update, photos: update.photos.filter((photo) => photo.id !== photoId) }
                : update,
            ),
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...project,
          photos: normalizedPhotos(project).filter((photo) => photo.id !== photoId),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }

  function movePhoto(projectId: string, photoId: string, direction: -1 | 1, updateId?: string) {
    mutateProjects((projects) =>
      projects.map((project: any) => {
        if (String(project.id) !== String(projectId)) return project;
        const reorder = (photos: ProjectPhoto[]) => {
          const next = [...photos];
          const index = next.findIndex((photo) => photo.id === photoId);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= next.length) return next;
          [next[index], next[target]] = [next[target], next[index]];
          return next;
        };
        if (updateId) {
          return {
            ...project,
            updates: normalizedUpdates(project).map((update) =>
              update.id === updateId ? { ...update, photos: reorder(update.photos) } : update,
            ),
            updatedAt: new Date().toISOString(),
          };
        }
        return { ...project, photos: reorder(normalizedPhotos(project)), updatedAt: new Date().toISOString() };
      }),
    );
  }

  function beginTakePhoto(projectId: string, updateId?: string) {
    captureTargetRef.current = { projectId, updateId };
    captureInputRef.current?.click();
  }

  async function onCaptured(event: React.ChangeEvent<HTMLInputElement>) {
    const target = captureTargetRef.current;
    const files = event.target.files;
    if (target && files?.length) await addPhotoFiles(target.projectId, files, target.updateId);
    event.target.value = "";
  }

  function handlePaste(event: React.ClipboardEvent, projectId: string, updateId?: string) {
    const files = (Array.from(event.clipboardData.files || []) as File[]).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    void addPhotoFiles(projectId, files, updateId);
  }

  function handleDrop(event: React.DragEvent, projectId: string, updateId?: string) {
    event.preventDefault();
    const files = (Array.from(event.dataTransfer.files || []) as File[]).filter((file) => file.type.startsWith("image/"));
    if (files.length) void addPhotoFiles(projectId, files, updateId);
  }

  function addRelatedWork(projectId: string, workOrderId: string) {
    if (!workOrderId) return;
    const project = propertyProjects.find((item: any) => String(item.id) === String(projectId));
    if (!project) return;
    const currentIds = Array.isArray(project.workOrderIds) ? project.workOrderIds.map(String) : [];
    patchProject(projectId, { workOrderIds: Array.from(new Set([...currentIds, workOrderId])) });
  }

  function removeRelatedWork(projectId: string, workOrderId: string) {
    const project = propertyProjects.find((item: any) => String(item.id) === String(projectId));
    if (!project) return;
    patchProject(projectId, {
      workOrderIds: (Array.isArray(project.workOrderIds) ? project.workOrderIds : []).filter(
        (id: unknown) => String(id) !== String(workOrderId),
      ),
    });
  }

  const card: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    background: colors.card || "#FFFFFF",
    minWidth: 0,
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 38,
    border: `1px solid ${colors.line}`,
    borderRadius: 9,
    padding: "8px 10px",
    background: "#FFFFFF",
    color: colors.text || colors.navy,
    font: "inherit",
    fontSize: 13,
  };
  const label: React.CSSProperties = {
    display: "grid",
    gap: 5,
    fontSize: 11,
    fontWeight: 800,
    color: colors.navy,
  };
  const tinyButton: React.CSSProperties = {
    ...secondaryButtonStyle,
    minHeight: 32,
    padding: "6px 9px",
    fontSize: 11,
  };
  const uploadLabel: React.CSSProperties = {
    ...tinyButton,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  function ProjectFields({ value, onChange }: { value: ProjectDraft; onChange: (next: ProjectDraft) => void }) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <label style={label}>Project name<input style={input} value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} /></label>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 9 }}>
          <label style={label}>Status<select style={input} value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value, progress: e.target.value === "Completed" ? 100 : value.progress })}><option>Planning</option><option>Active</option><option>Waiting</option><option>Completed</option></select></label>
          <label style={label}>Category<input style={input} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} /></label>
          <label style={label}>Progress %<input type="number" min={0} max={100} style={input} value={value.progress} onChange={(e) => onChange({ ...value, progress: Number(e.target.value) })} /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 9 }}>
          <label style={label}>Start date<input type="date" style={input} value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value })} /></label>
          <label style={label}>Completion date<input type="date" style={input} value={value.completedAt} onChange={(e) => onChange({ ...value, completedAt: e.target.value })} /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 9 }}>
          <label style={label}>Vendor<select style={input} value={value.vendorId} onChange={(e) => onChange({ ...value, vendorId: e.target.value })}><option value="">None</option>{vendorRecords.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
          <label style={label}>Location<select style={input} value={value.locationId} onChange={(e) => onChange({ ...value, locationId: e.target.value })}><option value="">None</option>{locations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label style={label}>Asset<select style={input} value={value.assetId} onChange={(e) => onChange({ ...value, assetId: e.target.value })}><option value="">None</option>{assetRecords.map((asset: any) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
        </div>
        <label style={label}>Project notes<textarea style={{ ...input, minHeight: 88, resize: "vertical" }} value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} /></label>
      </div>
    );
  }

  function PhotoGallery({ project, update }: { project: any; update?: ProjectUpdate }) {
    const photos = update ? update.photos : normalizedPhotos(project);
    const targetKey = `${project.id}:${update?.id || "project"}`;
    return (
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, String(project.id), update?.id)}
        onPaste={(event) => handlePaste(event, String(project.id), update?.id)}
        tabIndex={0}
        style={{ display: "grid", gap: 9, outline: "none" }}
      >
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <label style={uploadLabel}>
            {busyPhotoTarget === targetKey ? "Adding…" : "Upload Photo"}
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              disabled={busyPhotoTarget === targetKey}
              onChange={(event) => {
                if (event.target.files?.length) void addPhotoFiles(String(project.id), event.target.files, update?.id);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" style={tinyButton} onClick={() => beginTakePhoto(String(project.id), update?.id)}>Take Photo</button>
          <span style={{ ...mutedSmallStyle, fontSize: 10 }}>Paste or drag photos here too.</span>
        </div>
        {photos.length ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 9 }}>
            {photos.map((photo: ProjectPhoto, index: number) => (
              <div key={photo.id} style={{ ...card, overflow: "hidden" }}>
                {photoSource(photo) ? <img src={photoSource(photo)} alt={photo.caption || "Project photo"} style={{ width: "100%", height: isMobile ? 190 : 150, objectFit: "cover", display: "block" }} /> : null}
                <div style={{ display: "grid", gap: 7, padding: 8 }}>
                  <input type="date" style={{ ...input, minHeight: 34, padding: "6px 7px", fontSize: 11 }} value={cleanDate(photo.date || photo.createdAt)} onChange={(e) => patchPhoto(String(project.id), photo.id, { date: e.target.value }, update?.id)} />
                  <input style={{ ...input, minHeight: 34, padding: "6px 7px", fontSize: 11 }} value={photo.caption || ""} placeholder="Photo note" onChange={(e) => patchPhoto(String(project.id), photo.id, { caption: e.target.value }, update?.id)} />
                  {!update ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: colors.muted }}>
                      <input type="checkbox" checked={photo.includeInOwnerReport !== false} onChange={(e) => patchPhoto(String(project.id), photo.id, { includeInOwnerReport: e.target.checked })} /> Owner Report
                    </label>
                  ) : null}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button type="button" style={tinyButton} disabled={index === 0} onClick={() => movePhoto(String(project.id), photo.id, -1, update?.id)}>←</button>
                    <button type="button" style={tinyButton} disabled={index === photos.length - 1} onClick={() => movePhoto(String(project.id), photo.id, 1, update?.id)}>→</button>
                    <button type="button" style={{ ...tinyButton, color: colors.red }} onClick={() => deletePhoto(String(project.id), photo.id, update?.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...mutedSmallStyle, padding: "9px 0" }}>No photos yet.</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(240px,31%) minmax(0,1fr)", gap: 12, alignItems: "start" }}>
      <input ref={captureInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onCaptured} />

      <aside style={{ ...card, padding: 10, position: isMobile ? "static" : "sticky", top: 8, maxHeight: isMobile ? "none" : "calc(100vh - 120px)", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <strong style={{ color: colors.navy, fontSize: 15 }}>Projects</strong>
          <button type="button" style={goldButtonStyle} onClick={() => { setShowNewProject(true); setNewDraft(emptyDraft()); }}>+ Project</button>
        </div>
        <input style={input} value={search} placeholder="Search projects" onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 6, marginTop: 7, overflowX: "auto", paddingBottom: 2 }}>
          {["All", "Planning", "Active", "Waiting", "Completed"].map((status) => (
            <button key={status} type="button" onClick={() => setStatusFilter(status)} style={{ ...tinyButton, whiteSpace: "nowrap", background: statusFilter === status ? colors.panel : "#FFFFFF", borderColor: statusFilter === status ? colors.gold : colors.line }}>{status}</button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 5, marginTop: 9 }}>
          {filteredProjects.map((project: any) => {
            const selected = String(project.id) === String(selectedProjectId) && !showNewProject;
            const vendor = vendorRecords.find((item: any) => item.id === project.vendorId)?.name || "";
            return (
              <button key={project.id} type="button" onClick={() => { setSelectedProjectId(String(project.id)); setShowNewProject(false); }} style={{ textAlign: "left", width: "100%", border: `1px solid ${selected ? colors.gold : colors.line}`, borderRadius: 9, background: selected ? colors.panel : "#FFFFFF", padding: "9px 10px", cursor: "pointer" }}>
                <strong style={{ display: "block", color: colors.navy, fontSize: 12 }}>{project.title || project.name || "Untitled project"}</strong>
                <span style={{ display: "block", color: colors.muted, fontSize: 10, marginTop: 3 }}>{[project.status || "Planning", vendor, cleanDate(project.startDate)].filter(Boolean).join(" · ")}</span>
              </button>
            );
          })}
          {!filteredProjects.length ? <div style={{ ...mutedSmallStyle, padding: 8 }}>No matching projects.</div> : null}
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        {showNewProject ? (
          <section style={{ ...card, padding: isMobile ? 11 : 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <strong style={{ color: colors.navy, fontSize: 17 }}>New Project</strong>
              <div style={{ display: "flex", gap: 7 }}><button type="button" style={tinyButton} onClick={() => setShowNewProject(false)}>Cancel</button><button type="button" style={goldButtonStyle} onClick={createProject}>Save Project</button></div>
            </div>
            <ProjectFields value={newDraft} onChange={setNewDraft} />
          </section>
        ) : selectedProject ? (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={{ ...card, padding: isMobile ? 11 : 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, color: colors.navy, fontSize: isMobile ? 19 : 22 }}>{selectedProject.title || selectedProject.name || "Project"}</h2>
                  <div style={{ ...mutedSmallStyle, marginTop: 4 }}>{[selectedProject.status || "Planning", vendorRecords.find((vendor: any) => vendor.id === selectedProject.vendorId)?.name, locations.find((location: any) => location.id === selectedProject.locationId)?.name].filter(Boolean).join(" · ")}</div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button type="button" style={tinyButton} onClick={() => setScreen("ownerReport")}>Owner Report</button>
                  {editing ? <><button type="button" style={tinyButton} onClick={() => { setDraft(projectDraft(selectedProject)); setEditing(false); }}>Cancel</button><button type="button" style={goldButtonStyle} onClick={saveProjectDetails}>Save</button><button type="button" style={{ ...tinyButton, color: colors.red }} onClick={() => deleteProject(String(selectedProject.id))}>Delete Project</button></> : <button type="button" style={goldButtonStyle} onClick={() => { setDraft(projectDraft(selectedProject)); setEditing(true); }}>Edit</button>}
                </div>
              </div>

              {editing ? (
                <div style={{ marginTop: 13 }}><ProjectFields value={draft} onChange={setDraft} /></div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 13 }}>
                  {[ ["Start", cleanDate(selectedProject.startDate) || "—"], ["Completed", cleanDate(selectedProject.completedAt) || "—"], ["Progress", `${Number(selectedProject.progress || 0)}%`], ["Category", selectedProject.category || "General"] ].map(([name, value]) => <div key={name} style={{ ...card, padding: 9 }}><span style={{ ...mutedSmallStyle, display: "block", fontSize: 10 }}>{name}</span><strong style={{ color: colors.navy, display: "block", marginTop: 3, fontSize: 12 }}>{value}</strong></div>)}
                  {selectedProject.notes ? <div style={{ gridColumn: "1 / -1", whiteSpace: "pre-wrap", color: colors.text, fontSize: 12, paddingTop: 3 }}>{selectedProject.notes}</div> : null}
                </div>
              )}
            </section>

            <section style={{ ...card, padding: isMobile ? 11 : 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 9 }}><strong style={{ color: colors.navy }}>Project Photos</strong><span style={mutedSmallStyle}>{normalizedPhotos(selectedProject).length} photo{normalizedPhotos(selectedProject).length === 1 ? "" : "s"}</span></div>
              <PhotoGallery project={selectedProject} />
            </section>

            <section style={{ ...card, padding: isMobile ? 11 : 14 }}>
              <strong style={{ color: colors.navy }}>Add Update</strong>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "160px minmax(160px,.7fr) minmax(0,1.3fr)", gap: 8, marginTop: 9 }}>
                <input type="date" style={input} value={updateDraft.date} onChange={(e) => setUpdateDraft({ ...updateDraft, date: e.target.value })} />
                <input style={input} placeholder="Update title" value={updateDraft.title} onChange={(e) => setUpdateDraft({ ...updateDraft, title: e.target.value })} />
                <textarea style={{ ...input, minHeight: 60, resize: "vertical" }} placeholder="What happened?" value={updateDraft.notes} onChange={(e) => setUpdateDraft({ ...updateDraft, notes: e.target.value })} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", color: colors.muted, fontSize: 11 }}><input type="checkbox" checked={updateDraft.includeInOwnerReport} onChange={(e) => setUpdateDraft({ ...updateDraft, includeInOwnerReport: e.target.checked })} /> Include in Owner Report</label>
                <button type="button" style={goldButtonStyle} onClick={addUpdate}>Add Update</button>
              </div>
            </section>

            <section style={{ display: "grid", gap: 9 }}>
              {normalizedUpdates(selectedProject)
                .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)))
                .map((update) => {
                  const isEditingUpdate = editingUpdateId === update.id;
                  return (
                    <article key={update.id} style={{ ...card, padding: isMobile ? 10 : 13 }}>
                      {isEditingUpdate ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "160px minmax(0,1fr)", gap: 8 }}><input type="date" style={input} value={updateEditDraft.date} onChange={(e) => setUpdateEditDraft({ ...updateEditDraft, date: e.target.value })} /><input style={input} value={updateEditDraft.title} placeholder="Update title" onChange={(e) => setUpdateEditDraft({ ...updateEditDraft, title: e.target.value })} /></div>
                          <textarea style={{ ...input, minHeight: 76, resize: "vertical" }} value={updateEditDraft.notes} onChange={(e) => setUpdateEditDraft({ ...updateEditDraft, notes: e.target.value })} />
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><label style={{ display: "flex", gap: 6, alignItems: "center", color: colors.muted, fontSize: 11 }}><input type="checkbox" checked={updateEditDraft.includeInOwnerReport} onChange={(e) => setUpdateEditDraft({ ...updateEditDraft, includeInOwnerReport: e.target.checked })} /> Include in Owner Report</label><div style={{ display: "flex", gap: 6 }}><button type="button" style={{ ...tinyButton, color: colors.red }} onClick={() => deleteUpdate(update.id)}>Delete</button><button type="button" style={tinyButton} onClick={() => setEditingUpdateId("")}>Cancel</button><button type="button" style={goldButtonStyle} onClick={() => saveUpdate(update.id)}>Save</button></div></div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <div><div style={{ color: colors.gold, fontSize: 10, fontWeight: 900 }}>{cleanDate(update.date)}</div><strong style={{ color: colors.navy, fontSize: 13 }}>{update.title || "Project update"}</strong>{update.notes ? <div style={{ color: colors.text, fontSize: 12, whiteSpace: "pre-wrap", marginTop: 4 }}>{update.notes}</div> : null}<div style={{ ...mutedSmallStyle, marginTop: 4, fontSize: 10 }}>{update.includeInOwnerReport !== false ? "Included in Owner Report" : "Not in Owner Report"}</div></div>
                          <button type="button" style={tinyButton} onClick={() => beginEditUpdate(update)}>Edit</button>
                        </div>
                      )}
                      <div style={{ marginTop: 10 }}><PhotoGallery project={selectedProject} update={update} /></div>
                    </article>
                  );
                })}
              {!normalizedUpdates(selectedProject).length ? <div style={{ ...card, padding: 12, color: colors.muted, fontSize: 12 }}>No project updates yet.</div> : null}
            </section>

            <section style={{ ...card, padding: isMobile ? 11 : 14 }}>
              <strong style={{ color: colors.navy }}>Related Work</strong>
              <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
                <select style={{ ...input, width: isMobile ? "100%" : 320 }} defaultValue="" onChange={(e) => { addRelatedWork(String(selectedProject.id), e.target.value); e.currentTarget.value = ""; }}><option value="">Add related work order…</option>{serviceRecords.filter((record: any) => !(Array.isArray(selectedProject.workOrderIds) ? selectedProject.workOrderIds.map(String) : []).includes(String(record.id))).map((record: any) => <option key={record.id} value={record.id}>{record.title || record.name || "Work order"}</option>)}</select>
              </div>
              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                {(Array.isArray(selectedProject.workOrderIds) ? selectedProject.workOrderIds : []).map((id: unknown) => {
                  const work = serviceRecords.find((record: any) => String(record.id) === String(id));
                  return <div key={String(id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderTop: `1px solid ${colors.line}`, paddingTop: 7 }}><button type="button" style={{ border: 0, padding: 0, background: "transparent", color: colors.navy, textAlign: "left", cursor: work ? "pointer" : "default", fontWeight: 700, fontSize: 11 }} onClick={() => { if (!work) return; setSelectedServiceId(String(id)); setScreen("work"); }}>{work?.title || work?.name || `Work order ${String(id)}`}</button><button type="button" style={tinyButton} onClick={() => removeRelatedWork(String(selectedProject.id), String(id))}>Remove</button></div>;
                })}
                {!(Array.isArray(selectedProject.workOrderIds) && selectedProject.workOrderIds.length) ? <span style={mutedSmallStyle}>No related work orders.</span> : null}
              </div>
            </section>
          </div>
        ) : (
          <section style={{ ...card, padding: 18, color: colors.muted }}>Add a project or choose one from the list.</section>
        )}
      </main>
    </div>
  );
}
