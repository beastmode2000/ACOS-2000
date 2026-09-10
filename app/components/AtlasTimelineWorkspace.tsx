"use client";

import React, { useMemo, useState } from "react";
import AtlasProjectsWorkspace from "./AtlasProjectsWorkspace";
import AtlasTimelineWorkspaceLegacy from "./AtlasTimelineWorkspaceLegacy";

function photoSource(photo: any) {
  return String(photo?.dataUrl || photo?.url || photo?.src || photo?.source || "");
}

export default function AtlasTimelineWorkspace(props: any) {
  const [view, setView] = useState<"projects" | "timeline">("projects");
  const { colors = { navy: "#0A2841", gold: "#C99A3D", line: "#D9E2EA", panel: "#F5F8FB" }, secondaryButtonStyle = {} } = props;

  const projectTimelineEntries = useMemo(() => {
    const existing = Array.isArray(props.projectTimelineEntries) ? props.projectTimelineEntries : [];
    const nested = (Array.isArray(props.photoTimelineProjects) ? props.photoTimelineProjects : []).flatMap((project: any) =>
      (Array.isArray(project?.updates) ? project.updates : []).map((update: any) => ({
        id: `nested-${project.id}-${update.id}`,
        projectId: project.id,
        date: update.date || update.createdAt,
        title: update.title ? `${project.title || project.name || "Project"} — ${update.title}` : `${project.title || project.name || "Project"} — Update`,
        notes: update.notes || "",
        type: "Project Update",
        category: project.category || "Project",
        locationId: project.locationId || "",
        assetId: project.assetId || "",
        vendorId: project.vendorId || "",
        photo: photoSource(Array.isArray(update.photos) ? update.photos[0] : null),
        milestone: Boolean(update.milestone),
      })),
    );
    return [...existing, ...nested];
  }, [props.projectTimelineEntries, props.photoTimelineProjects]);

  const switchButton = (active: boolean): React.CSSProperties => ({
    ...secondaryButtonStyle,
    minHeight: 34,
    padding: "7px 12px",
    fontSize: 11,
    fontWeight: 800,
    background: active ? colors.panel : "#FFFFFF",
    borderColor: active ? colors.gold : colors.line,
    color: colors.navy,
  });

  const projectProps = {
    ...props,
    setScreen: (screen: string) => props.setScreen?.(screen === "work" ? "history" : screen),
  };

  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button type="button" style={switchButton(view === "projects")} onClick={() => setView("projects")}>List</button>
        <button type="button" style={switchButton(view === "timeline")} onClick={() => setView("timeline")}>Timeline</button>
      </div>
      {view === "projects" ? (
        <AtlasProjectsWorkspace {...projectProps} />
      ) : (
        <AtlasTimelineWorkspaceLegacy {...props} projectTimelineEntries={projectTimelineEntries} />
      )}
    </div>
  );
}
