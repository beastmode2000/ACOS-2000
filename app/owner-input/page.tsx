"use client";

import { useEffect, useState } from "react";

export default function OwnerInputPage() {
  const [token, setToken] = useState("");
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [choice, setChoice] = useState("");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const nextToken = new URL(window.location.href).searchParams.get("token") || "";
    setToken(nextToken);
    if (!nextToken) {
      setError("This owner input link is missing its access token.");
      setLoading(false);
      return;
    }
    void fetch(`/api/atlas-owner-input?token=${encodeURIComponent(nextToken)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not load this request.");
        setItem(data.item);
        setChoice(String(data.item?.responseChoice || ""));
        setResponse(String(data.item?.response || ""));
        setName(String(data.item?.responseName || ""));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this request."))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    if (!token || (!choice && !response.trim())) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/atlas-owner-input?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseName: name.trim(), responseChoice: choice, response: response.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Response could not be saved.");
      setItem(data.item);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Response could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "#F4F7FA",
    padding: "32px 16px",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#1B2A36",
  };
  const card: React.CSSProperties = {
    maxWidth: 720,
    margin: "0 auto",
    background: "#FFFFFF",
    border: "1px solid #D9E2EA",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 10px 30px rgba(10,40,65,.08)",
  };
  const button: React.CSSProperties = {
    border: "1px solid #0A2841",
    background: "#0A2841",
    color: "white",
    borderRadius: 9,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  };
  const optionButton = (value: string): React.CSSProperties => ({
    ...button,
    background: choice === value ? "#0A2841" : "#FFFFFF",
    color: choice === value ? "#FFFFFF" : "#0A2841",
    flex: "1 1 150px",
  });

  return (
    <main style={shell}>
      <section style={card}>
        <div style={{ color: "#C99A3D", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Atlas</div>
        <h1 style={{ margin: "6px 0 4px", color: "#0A2841", fontSize: 26 }}>Owner Input Requested</h1>
        <p style={{ margin: "0 0 18px", color: "#6B7C8C", fontSize: 14 }}>A quick response here is saved directly back to Atlas.</p>

        {loading ? <p>Loading request…</p> : null}
        {error ? <div style={{ border: "1px solid #F1B7B0", background: "#FFF4F2", color: "#B42318", borderRadius: 9, padding: 10, marginBottom: 12 }}>{error}</div> : null}

        {!loading && item ? (
          <>
            {item.projectTitle ? <div style={{ fontSize: 12, color: "#6B7C8C", marginBottom: 5 }}>Project: <strong style={{ color: "#0A2841" }}>{item.projectTitle}</strong></div> : null}
            {item.dueDate ? <div style={{ fontSize: 12, color: "#B42318", marginBottom: 8 }}>Requested by {item.dueDate}</div> : null}
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, color: "#0A2841", marginBottom: 10 }}>{item.question}</div>
            {item.context ? <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 14, background: "#F7F9FB", border: "1px solid #E3E9EE", borderRadius: 9, padding: 12, marginBottom: 16 }}>{item.context}</div> : null}

            {Array.isArray(item.photos) && item.photos.length ? (
              <div style={{ display: "grid", gridTemplateColumns: item.photos.length === 1 ? "1fr" : "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 18 }}>
                {item.photos.map((photo: any, index: number) => (
                  <figure key={photo.id || index} style={{ margin: 0, border: "1px solid #D9E2EA", borderRadius: 10, overflow: "hidden", background: "#FFFFFF" }}>
                    <a href={photo.dataUrl} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                      <img src={photo.dataUrl} alt={photo.caption || photo.name || `Decision photo ${index + 1}`} style={{ display: "block", width: "100%", maxHeight: 360, objectFit: "cover" }} />
                    </a>
                    {photo.caption ? <figcaption style={{ padding: "8px 9px", fontSize: 12, color: "#6B7C8C" }}>{photo.caption}</figcaption> : null}
                  </figure>
                ))}
              </div>
            ) : null}

            {item.status === "Answered" && saved ? (
              <div style={{ border: "1px solid #B9DDCA", background: "#F1FBF5", color: "#087443", borderRadius: 9, padding: 12, fontWeight: 700 }}>Thank you. Your response has been saved in Atlas.</div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jeremy or Jessica" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #C9D4DD", borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 14 }} />

                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}>Quick response</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {["Approve", "Decline", "Need More Info"].map((value) => (
                    <button key={value} type="button" style={optionButton(value)} onClick={() => setChoice(choice === value ? "" : value)}>{value}</button>
                  ))}
                </div>

                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Comment</label>
                <textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Add any details or instructions…" rows={5} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #C9D4DD", borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 14, lineHeight: 1.45 }} />

                <button type="button" onClick={submit} disabled={saving || (!choice && !response.trim())} style={{ ...button, opacity: saving || (!choice && !response.trim()) ? 0.55 : 1, width: "100%" }}>{saving ? "Saving…" : "Send Response"}</button>
              </>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
