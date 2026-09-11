"use client";

import { useEffect, useMemo, useState } from "react";

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fileToPhoto(file: File) {
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
        const max = 1200;
        const scale = Math.min(1, max / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        if (scale >= 1 && original.length < 900_000) {
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
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => resolve(original);
      image.src = original;
    });
  } catch {
    dataUrl = original;
  }

  return {
    id: uid("owner-input-photo"),
    name: file.name || "Photo",
    caption: "",
    dataUrl,
    createdAt: new Date().toISOString(),
  };
}

export default function AtlasOwnerInputPanel(props: any) {
  const {
    propertyId = "2000",
    projects = [],
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
  } = props;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingPhotos, setAddingPhotos] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ projectId: "", question: "", context: "", dueDate: today(), photos: [] as any[] });

  const propertyProjects = useMemo(
    () => (Array.isArray(projects) ? projects : []).filter((project: any) => String(project?.propertyId || "2000") === String(propertyId) && project?.archived !== true),
    [projects, propertyId],
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/atlas-owner-input?propertyId=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Owner input could not load.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Owner input could not load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [propertyId]);

  async function addPhotoFiles(files: FileList | null) {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!selected.length) return;
    const room = Math.max(0, 3 - draft.photos.length);
    if (!room) {
      setMessage("Owner input supports up to 3 photos.");
      return;
    }
    setAddingPhotos(true);
    setMessage("");
    try {
      const added = await Promise.all(selected.slice(0, room).map(fileToPhoto));
      setDraft((current) => ({ ...current, photos: [...current.photos, ...added].slice(0, 3) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo could not be added.");
    } finally {
      setAddingPhotos(false);
    }
  }

  async function addItem() {
    if (!draft.question.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const project = propertyProjects.find((row: any) => String(row.id) === String(draft.projectId));
      const res = await fetch("/api/atlas-owner-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          projectId: draft.projectId,
          projectTitle: project?.title || project?.name || "",
          question: draft.question.trim(),
          context: draft.context.trim(),
          dueDate: draft.dueDate,
          photos: draft.photos,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Owner input could not be saved.");
      setItems((current) => [data.item, ...current]);
      setDraft({ projectId: "", question: "", context: "", dueDate: today(), photos: [] });
      setShowAdd(false);
      setMessage("Owner input request created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Owner input could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function closeItem(id: string) {
    await fetch("/api/atlas-owner-input", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "Closed" }),
    });
    await load();
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this owner input request?")) return;
    await fetch(`/api/atlas-owner-input?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function copyLink(item: any) {
    if (!item?.shareToken) return;
    const url = `${window.location.origin}/owner-input?token=${encodeURIComponent(item.shareToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Owner response link copied.");
    } catch {
      window.prompt("Copy owner response link:", url);
    }
  }

  const awaiting = items.filter((item) => item.status === "Awaiting Owner");
  const answered = items.filter((item) => item.status === "Answered");

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: "#FFFFFF",
    padding: "9px 10px",
    fontSize: 13,
    color: colors.text,
  };
  const smallButton: React.CSSProperties = {
    border: `1px solid ${colors.line}`,
    background: "#FFFFFF",
    color: colors.navy,
    borderRadius: 7,
    padding: "6px 9px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };

  function photoGrid(photos: any[], editable = false) {
    if (!Array.isArray(photos) || !photos.length) return null;
    return (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(3, photos.length)}, minmax(0,1fr))`, gap: 8 }}>
        {photos.map((photo: any, index: number) => (
          <div key={photo.id || index} style={{ border: `1px solid ${colors.line}`, borderRadius: 8, overflow: "hidden", background: "#FFFFFF" }}>
            <a href={photo.dataUrl} target="_blank" rel="noreferrer" style={{ display: "block" }}>
              <img src={photo.dataUrl} alt={photo.caption || photo.name || `Owner input photo ${index + 1}`} style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
            </a>
            {editable ? (
              <div style={{ padding: 7, display: "grid", gap: 6 }}>
                <input
                  value={photo.caption || ""}
                  onChange={(e) => setDraft((current) => ({ ...current, photos: current.photos.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, caption: e.target.value } : row) }))}
                  placeholder="Photo caption"
                  style={{ ...inputStyle, padding: "6px 7px", fontSize: 11 }}
                />
                <button type="button" onClick={() => setDraft((current) => ({ ...current, photos: current.photos.filter((_: any, rowIndex: number) => rowIndex !== index) }))} style={{ ...smallButton, color: colors.red }}>Remove</button>
              </div>
            ) : photo.caption ? (
              <div style={{ padding: 7, fontSize: 10, color: colors.muted }}>{photo.caption}</div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section style={{ border: `1px solid ${colors.line}`, borderRadius: 12, background: "#FFFFFF", overflow: "hidden" }}>
      <div style={{ background: colors.navy, color: "#FFFFFF", padding: isMobile ? "11px 12px" : "12px 14px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Owner Input Needed</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Time-sensitive decisions and questions stay at the top until answered.</div>
        </div>
        <button type="button" onClick={() => setShowAdd((value) => !value)} style={{ border: "1px solid rgba(255,255,255,.45)", background: showAdd ? "#FFFFFF" : "transparent", color: showAdd ? colors.navy : "#FFFFFF", borderRadius: 8, padding: "7px 10px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{showAdd ? "Cancel" : "Add Request"}</button>
      </div>

      {showAdd ? (
        <div style={{ padding: 12, background: colors.panel, borderBottom: `1px solid ${colors.line}`, display: "grid", gap: 9 }}>
          <select value={draft.projectId} onChange={(e) => setDraft((current) => ({ ...current, projectId: e.target.value }))} style={inputStyle}>
            <option value="">General / not tied to a project</option>
            {propertyProjects.map((project: any) => <option key={project.id} value={project.id}>{project.title || project.name || "Project"}</option>)}
          </select>
          <input value={draft.question} onChange={(e) => setDraft((current) => ({ ...current, question: e.target.value }))} placeholder="What decision or input do you need?" style={inputStyle} />
          <textarea value={draft.context} onChange={(e) => setDraft((current) => ({ ...current, context: e.target.value }))} placeholder="Context, recommendation, cost, color, scope, or anything they need to decide." rows={3} style={{ ...inputStyle, resize: "vertical" }} />

          <div style={{ border: `1px dashed ${colors.line}`, borderRadius: 9, background: "#FFFFFF", padding: 9, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.navy }}>Photos</div>
                <div style={{ fontSize: 10, color: colors.muted }}>Add up to 3 photos so the owner can see exactly what they are deciding.</div>
              </div>
              <label style={{ ...smallButton, display: "inline-flex", alignItems: "center", opacity: draft.photos.length >= 3 || addingPhotos ? 0.55 : 1 }}>
                {addingPhotos ? "Adding…" : "Add Photos"}
                <input type="file" accept="image/*" multiple disabled={draft.photos.length >= 3 || addingPhotos} onChange={(e) => { void addPhotoFiles(e.target.files); e.currentTarget.value = ""; }} style={{ display: "none" }} />
              </label>
            </div>
            {photoGrid(draft.photos, true)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "160px auto", gap: 8, alignItems: "center" }}>
            <input type="date" value={draft.dueDate} onChange={(e) => setDraft((current) => ({ ...current, dueDate: e.target.value }))} style={inputStyle} />
            <button type="button" onClick={addItem} disabled={saving || addingPhotos || !draft.question.trim()} style={{ justifySelf: isMobile ? "stretch" : "start", border: 0, background: colors.gold, color: colors.navy, borderRadius: 8, padding: "9px 13px", fontWeight: 800, cursor: "pointer", opacity: saving || addingPhotos || !draft.question.trim() ? 0.55 : 1 }}>{saving ? "Saving…" : "Create Owner Request"}</button>
          </div>
        </div>
      ) : null}

      <div style={{ padding: 12, display: "grid", gap: 9 }}>
        {message ? <div style={{ fontSize: 11, color: message.toLowerCase().includes("could not") ? colors.red : colors.green }}>{message}</div> : null}
        {loading ? <div style={{ fontSize: 12, color: colors.muted }}>Loading owner input…</div> : null}
        {!loading && awaiting.length === 0 ? <div style={{ fontSize: 12, color: colors.muted }}>No owner decisions are currently waiting.</div> : null}

        {awaiting.map((item) => (
          <article key={item.id} style={{ border: `1px solid ${colors.line}`, borderLeft: `4px solid ${colors.gold}`, borderRadius: 9, padding: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <div>
                {item.projectTitle ? <div style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>{item.projectTitle}</div> : null}
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.navy }}>{item.question}</div>
              </div>
              {item.dueDate ? <div style={{ fontSize: 10, fontWeight: 800, color: colors.red, whiteSpace: "nowrap" }}>By {item.dueDate}</div> : null}
            </div>
            {item.context ? <div style={{ fontSize: 11, lineHeight: 1.45, whiteSpace: "pre-wrap", color: colors.text }}>{item.context}</div> : null}
            {photoGrid(item.photos)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
              <button type="button" style={smallButton} onClick={() => copyLink(item)}>Copy Response Link</button>
              <button type="button" style={smallButton} onClick={() => closeItem(item.id)}>Close</button>
              <button type="button" style={{ ...smallButton, color: colors.red }} onClick={() => deleteItem(item.id)}>Delete</button>
            </div>
          </article>
        ))}

        {answered.length ? (
          <details>
            <summary style={{ cursor: "pointer", color: colors.navy, fontWeight: 800, fontSize: 12 }}>Answered ({answered.length})</summary>
            <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
              {answered.map((item) => (
                <article key={item.id} style={{ border: `1px solid ${colors.line}`, borderRadius: 8, padding: 9, background: "#FAFCFD", display: "grid", gap: 7 }}>
                  {item.projectTitle ? <div style={{ fontSize: 10, color: colors.muted }}>{item.projectTitle}</div> : null}
                  <div style={{ fontSize: 11, fontWeight: 800, color: colors.navy }}>{item.question}</div>
                  {item.context ? <div style={{ fontSize: 10, lineHeight: 1.4, color: colors.text, whiteSpace: "pre-wrap" }}>{item.context}</div> : null}
                  {photoGrid(item.photos)}
                  <div style={{ fontSize: 11, color: colors.green }}>{[item.responseChoice, item.response].filter(Boolean).join(" — ")}</div>
                  <div style={{ fontSize: 10, color: colors.muted }}>{[item.responseName, item.responseAt ? new Date(item.responseAt).toLocaleString() : ""].filter(Boolean).join(" · ")}</div>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
