"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  workOrders: any[];
  parts: any[];
  inboxItems: any[];
  requests: any[];
  colors: any;
  isMobile: boolean;
  onOpenWork: (id: string) => void;
  onOpenInbox: (id: string) => void;
  onOpenRequest: (id: string) => void;
  onOpenParts: () => void;
};

type Alert = {
  id: string;
  title: string;
  detail: string;
  tone: "urgent" | "attention" | "info";
  open: () => void;
};

const READ_KEY = "atlas-notification-read-v1";
const BROWSER_KEY = "atlas-browser-notifications-v1";

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recordDateKey(value: unknown) {
  return String(value || "").match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
}

export default function AtlasNotifications(props: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [browserEnabled, setBrowserEnabled] = useState(false);

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
      setBrowserEnabled(localStorage.getItem(BROWSER_KEY) === "true");
    } catch {}
  }, []);

  const alerts = useMemo(() => {
    const today = localDateKey();
    const next: Alert[] = [];
    props.workOrders.forEach((record) => {
      if (["Completed", "Closed", "Cancelled"].includes(String(record.status))) return;
      const due = recordDateKey(record.date);
      const overdue = Boolean(due && due < today);
      const dueToday = due === today;
      const high = record.priority === "High";
      if (!overdue && !dueToday && !high) return;
      next.push({
        id: `work-${record.id}-${due}-${record.priority}`,
        title: record.title || "Work item",
        detail: overdue ? `Overdue since ${due}` : dueToday ? "Due today" : "High priority",
        tone: overdue || high ? "urgent" : "attention",
        open: () => props.onOpenWork(String(record.id)),
      });
    });
    props.parts.forEach((part) => {
      const quantity = Number(part.quantity || 0);
      const minimum = Number(part.minQuantity || 0);
      if (quantity > minimum && !["Low", "Out", "Order"].includes(String(part.status))) return;
      next.push({ id:`part-${part.id}-${quantity}`, title:part.name || "Inventory item", detail:`Low stock · ${quantity} available`, tone:"attention", open:props.onOpenParts });
    });
    props.inboxItems.filter((item) => ["New", "Needs Review"].includes(String(item.status))).forEach((item) => {
      next.push({ id:`inbox-${item.id}-${item.status}`, title:item.title || "Inbox item", detail:item.status === "New" ? "New Inbox item" : "Waiting for review", tone:"info", open:()=>props.onOpenInbox(String(item.id)) });
    });
    props.requests.filter((request) => ["New", "Open", "Needs Review"].includes(String(request.status))).forEach((request) => {
      next.push({ id:`request-${request.id}-${request.status}`, title:request.title || "Owner request", detail:`Owner request · ${request.status}`, tone:"attention", open:()=>props.onOpenRequest(String(request.id)) });
    });
    return next.slice(0, 50);
  }, [props.workOrders, props.parts, props.inboxItems, props.requests]);

  const unread = alerts.filter((alert) => !readIds.includes(alert.id));

  useEffect(() => {
    if (!browserEnabled || typeof Notification === "undefined" || Notification.permission !== "granted" || !unread.length) return;
    const alert = unread[0];
    const noticeKey = `atlas-notified-${alert.id}`;
    if (sessionStorage.getItem(noticeKey)) return;
    sessionStorage.setItem(noticeKey, "true");
    new Notification(alert.title, { body: alert.detail, icon: "/atlas-icon-192.png" });
  }, [browserEnabled, unread]);

  function markAllRead() {
    const ids = alerts.map((alert) => alert.id);
    setReadIds(ids);
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  }

  async function toggleBrowserAlerts() {
    if (typeof Notification === "undefined") return;
    if (!browserEnabled) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }
    const next = !browserEnabled;
    setBrowserEnabled(next);
    localStorage.setItem(BROWSER_KEY, String(next));
  }

  return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <button type="button" onClick={()=>setOpen((value)=>!value)} style={{width:"100%",minHeight:42,border:`1px solid ${props.colors.line}`,borderRadius:10,background:"#fff",color:props.colors.navy,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 11px"}}>
        <span>Notifications</span><span style={{minWidth:24,height:24,borderRadius:999,background:unread.length?props.colors.gold:props.colors.panel,display:"inline-grid",placeItems:"center",fontSize:12}}>{unread.length}</span>
      </button>
      {open ? <div style={{position:"absolute",top:48,right:0,zIndex:120,width:props.isMobile?"min(94vw, 420px)":"420px",maxHeight:"65vh",overflowY:"auto",border:`1px solid ${props.colors.line}`,borderRadius:14,background:"#fff",boxShadow:"0 18px 45px rgba(7,27,47,.2)",padding:12,display:"grid",gap:8}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong>Atlas Notifications</strong><button type="button" onClick={markAllRead} style={{border:0,background:"transparent",fontWeight:800,cursor:"pointer"}}>Mark all read</button></div>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,fontWeight:800}}><input type="checkbox" checked={browserEnabled} onChange={()=>void toggleBrowserAlerts()}/>Browser alerts on this device</label>
        {alerts.length ? alerts.map((alert)=><button key={alert.id} type="button" onClick={()=>{setOpen(false);alert.open();}} style={{textAlign:"left",border:`1px solid ${props.colors.line}`,borderLeft:`4px solid ${alert.tone==="urgent"?"#B42318":alert.tone==="attention"?props.colors.gold:"#3B82F6"}`,borderRadius:9,background:readIds.includes(alert.id)?props.colors.panel:"#fff",padding:10,cursor:"pointer"}}><strong style={{display:"block",color:props.colors.navy}}>{alert.title}</strong><span style={{fontSize:12,color:props.colors.muted}}>{alert.detail}</span></button>) : <div style={{padding:14,color:props.colors.muted}}>No active notifications.</div>}
      </div> : null}
    </div>
  );
}

