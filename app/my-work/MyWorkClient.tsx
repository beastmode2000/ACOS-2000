"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Member = { id: string; name: string; role: string; propertyIds?: string[] };
type WorkList = { id: string; property_id: string; name: string };
type WorkItem = { id: string; property_id: string; list_id: string; title: string; notes: string; assigned_to: string; due_date: string | null; status: string; photo_url: string; photo_name: string };
type Payload = { ok?: boolean; error?: string; preview?: boolean; member?: Member; lists?: WorkList[]; items?: WorkItem[] };

function formatDate(value: string | null | undefined) {
  const key = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MyWorkClient() {
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "");
  const memberId = String(searchParams.get("memberId") || "");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!token && !memberId) {
      setPayload({ ok: false, error: "This work view is missing its secure link." });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = token
        ? `token=${encodeURIComponent(token)}`
        : `memberId=${encodeURIComponent(memberId)}`;
      const response = await fetch(`/api/atlas-my-work?${query}&t=${Date.now()}`, { cache: "no-store", credentials: "include" });
      setPayload((await response.json().catch(() => ({}))) as Payload);
    } catch {
      setPayload({ ok: false, error: "Atlas could not load this work list." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token, memberId]);

  const lists = payload?.lists || [];
  const items = payload?.items || [];
  const openItems = items.filter((item) => item.status === "Open");
  const completedItems = items.filter((item) => item.status === "Completed");
  const visibleItems = showCompleted ? completedItems : openItems;
  const grouped = useMemo(() => lists.map((list) => ({ list, items: visibleItems.filter((item) => item.list_id === list.id) })).filter((group) => group.items.length), [lists, visibleItems]);

  const updateItem = async (itemId: string, action: "done" | "reopen") => {
    if (!token || payload?.preview || busyId) return;
    setBusyId(itemId); setMessage("");
    try {
      const response = await fetch("/api/atlas-my-work", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, itemId, action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Atlas could not update this item.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Atlas could not update this item.");
    } finally { setBusyId(""); }
  };

  return (
    <main className="my-work-page"><div className="my-work-shell">
      <header><div className="brand">ATLAS</div><div><span className="eyebrow">{payload?.preview ? "Employee Work Preview" : "My Work"}</span><h1>{payload?.member?.name || "Work List"}</h1></div></header>
      {payload?.preview ? <div className="preview-note">Previewing the same assigned-list view this employee receives.</div> : null}
      {loading ? <div className="state-card">Loading work…</div> : null}
      {!loading && payload?.ok === false ? <div className="state-card error">{payload.error || "This work link is not available."}</div> : null}
      {!loading && payload?.ok !== false ? <>
        <div className="summary-row"><div><strong>{openItems.length}</strong><span>Open</span></div><div><strong>{completedItems.length}</strong><span>Completed</span></div><button type="button" onClick={() => setShowCompleted((value) => !value)}>{showCompleted ? "Show Open" : "Show Completed"}</button></div>
        {message ? <div className="message">{message}</div> : null}
        <div className="lists">{grouped.length ? grouped.map(({ list, items: groupItems }) => <section key={list.id}><div className="list-head"><div><strong>{list.name}</strong><span>{list.property_id}</span></div><small>{groupItems.length}</small></div><div className="items">{groupItems.map((item) => <article key={item.id}><div className="item-copy"><strong>{item.title}</strong>{item.notes ? <p>{item.notes}</p> : null}<div className="meta">{item.due_date ? <span>Due {formatDate(item.due_date)}</span> : null}{item.assigned_to ? <span>{item.assigned_to}</span> : null}</div>{item.photo_url ? <a href={item.photo_url} target="_blank" rel="noreferrer">View photo</a> : null}</div>{!payload?.preview ? <button type="button" disabled={busyId === item.id} onClick={() => void updateItem(item.id, showCompleted ? "reopen" : "done")}>{busyId === item.id ? "Saving…" : showCompleted ? "Reopen" : "Done"}</button> : null}</article>)}</div></section>) : <div className="state-card">{showCompleted ? "No completed items yet." : "No open work assigned."}</div>}</div>
      </> : null}
    </div><style jsx>{`
      :global(body){margin:0;background:#eef3f7;color:#172331;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.my-work-page{min-height:100dvh;padding:18px;box-sizing:border-box}.my-work-shell{width:min(760px,100%);margin:0 auto;display:grid;gap:14px}header{display:flex;align-items:center;gap:12px;background:#0b3153;color:#fff;border-radius:16px;padding:16px;box-shadow:0 10px 28px rgba(11,49,83,.15)}.brand{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;background:#fff;color:#0b3153;font-size:11px;font-weight:950;letter-spacing:.08em}.eyebrow{display:block;color:#e0b348;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}h1{margin:2px 0 0;font-size:24px;line-height:1.05}.preview-note,.state-card{background:#fff;border:1px solid #dbe5ee;border-radius:14px;padding:12px 14px;color:#667788;font-size:12px;font-weight:750}.summary-row{display:grid;grid-template-columns:1fr 1fr auto;gap:10px}.summary-row>div,.summary-row button,section{background:#fff;border:1px solid #dbe5ee;border-radius:14px}.summary-row>div{display:grid;padding:12px 14px}.summary-row strong{font-size:22px;color:#0b3153}.summary-row span{font-size:11px;color:#667788;font-weight:700}.summary-row button{padding:0 14px;min-height:58px;color:#0b3153;font:inherit;font-size:12px;font-weight:850;cursor:pointer}.error,.message{color:#a82820}.message{font-size:12px;font-weight:800}.lists{display:grid;gap:12px}section{overflow:hidden}.list-head{display:flex;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e4ebf1}.list-head>div{display:grid;gap:2px}.list-head strong{color:#0b3153;font-size:14px}.list-head span{color:#788795;font-size:10px;font-weight:800}.list-head small{min-width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:#eef3f7;color:#0b3153;font-weight:900}.items{display:grid}article{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:13px 14px;border-top:1px solid #edf1f4}article:first-child{border-top:0}.item-copy{min-width:0;display:grid;gap:5px}.item-copy>strong{font-size:14px}p{margin:0;color:#667788;font-size:12px;line-height:1.45}.meta{display:flex;flex-wrap:wrap;gap:7px;color:#7a8792;font-size:10px;font-weight:800}a{color:#175ea8;font-size:11px;font-weight:800;text-decoration:none}article button{flex:0 0 auto;min-width:70px;min-height:36px;border:0;border-radius:9px;background:#d6a83c;color:#0b3153;padding:7px 10px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}@media(max-width:560px){.my-work-page{padding:10px}.summary-row{grid-template-columns:1fr 1fr}.summary-row button{grid-column:1/-1;min-height:42px}}
    `}</style></main>
  );
}
