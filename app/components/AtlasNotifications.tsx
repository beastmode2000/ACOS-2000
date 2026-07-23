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
const PREFERENCES_KEY = "atlas-notification-preferences-v1";

type NotificationPreferences = {
  work: boolean;
  inventory: boolean;
  requests: boolean;
  inbox: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  work: true,
  inventory: true,
  requests: true,
  inbox: true,
};

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
  const [notificationMessage, setNotificationMessage] = useState("");
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
      setBrowserEnabled(localStorage.getItem(BROWSER_KEY) === "true");
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}"),
      });
    } catch {}
  }, []);

  const alerts = useMemo(() => {
    const today = localDateKey();
    const next: Alert[] = [];
    if (preferences.work) props.workOrders.forEach((record) => {
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
    if (preferences.inventory) props.parts.forEach((part) => {
      const quantity = Number(part.quantity || 0);
      const minimum = Number(part.minQuantity || 0);
      if (quantity > minimum && !["Low", "Out", "Order"].includes(String(part.status))) return;
      next.push({ id:`part-${part.id}-${quantity}`, title:part.name || "Inventory item", detail:`Low stock · ${quantity} available`, tone:"attention", open:props.onOpenParts });
    });
    if (preferences.inbox) props.inboxItems.filter((item) => ["New", "Needs Review"].includes(String(item.status))).forEach((item) => {
      next.push({ id:`inbox-${item.id}-${item.status}`, title:item.title || "Inbox item", detail:item.status === "New" ? "New Inbox item" : "Waiting for review", tone:"info", open:()=>props.onOpenInbox(String(item.id)) });
    });
    if (preferences.requests) props.requests.filter((request) => ["New", "Open", "Needs Review"].includes(String(request.status))).forEach((request) => {
      next.push({ id:`request-${request.id}-${request.status}`, title:request.title || "Owner request", detail:`Owner request · ${request.status}`, tone:"attention", open:()=>props.onOpenRequest(String(request.id)) });
    });
    return next.slice(0, 50);
  }, [props.workOrders, props.parts, props.inboxItems, props.requests, preferences]);

  const unread = alerts.filter((alert) => !readIds.includes(alert.id));

  useEffect(() => {
    if (!browserEnabled || typeof Notification === "undefined" || Notification.permission !== "granted" || !unread.length) return;
    const alert = unread[0];
    const noticeKey = `atlas-notified-${alert.id}`;
    if (sessionStorage.getItem(noticeKey)) return;
    sessionStorage.setItem(noticeKey, "true");
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then((registration) =>
        registration.showNotification(alert.title, {
          body: alert.detail,
          icon: "/atlas-icon-192.png",
          badge: "/atlas-icon-192.png",
          tag: alert.id,
          data: { url: "/#dashboard" },
        }),
      );
    }
  }, [browserEnabled, unread]);

  function markAllRead() {
    const ids = alerts.map((alert) => alert.id);
    setReadIds(ids);
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  }

  function applicationServerKey(value: string) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }

  async function toggleBrowserAlerts() {
    setNotificationMessage("");
    if (
      typeof Notification === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setNotificationMessage("Push notifications are not supported on this device.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (browserEnabled) {
        if (existing) {
          await fetch("/api/atlas-push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          });
          await existing.unsubscribe();
        }
        setBrowserEnabled(false);
        localStorage.setItem(BROWSER_KEY, "false");
        setNotificationMessage("Phone alerts are off on this device.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationMessage("Notification permission was not approved.");
        return;
      }

      const keyResponse = await fetch("/api/atlas-push", {
        cache: "no-store",
      });
      const keyPayload = await keyResponse.json();
      if (!keyResponse.ok || !keyPayload.publicKey) {
        throw new Error("Push notifications are not configured yet.");
      }

      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(keyPayload.publicKey),
        }));

      const response = await fetch("/api/atlas-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          propertyId: "all",
          preferences,
        }),
      });
      if (!response.ok) throw new Error("Atlas could not save this device.");

      setBrowserEnabled(true);
      localStorage.setItem(BROWSER_KEY, "true");
      setNotificationMessage("Phone alerts are enabled on this device.");
    } catch (error) {
      setNotificationMessage(
        error instanceof Error
          ? error.message
          : "Atlas could not change notification settings.",
      );
    }
  }

  async function updateNotificationPreference(
    key: keyof NotificationPreferences,
    enabled: boolean,
  ) {
    const next = { ...preferences, [key]: enabled };
    setPreferences(next);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    setNotificationMessage("Notification choices saved.");

    if (!browserEnabled || !("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      await fetch("/api/atlas-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          propertyId: "all",
          preferences: next,
        }),
      });
    } catch {
      setNotificationMessage(
        "Choices are saved on this phone and will sync on the next update.",
      );
    }
  }

  return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <button type="button" onClick={()=>setOpen((value)=>!value)} style={{width:"100%",minHeight:42,border:`1px solid ${props.colors.line}`,borderRadius:10,background:"#fff",color:props.colors.navy,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 11px"}}>
        <span>Notifications</span><span style={{minWidth:24,height:24,borderRadius:999,background:unread.length?props.colors.gold:props.colors.panel,display:"inline-grid",placeItems:"center",fontSize:12}}>{unread.length}</span>
      </button>
      {open ? <div style={{position:"absolute",top:48,right:0,zIndex:120,width:props.isMobile?"min(94vw, 420px)":"420px",maxHeight:"65vh",overflowY:"auto",border:`1px solid ${props.colors.line}`,borderRadius:14,background:"#fff",boxShadow:"0 18px 45px rgba(7,27,47,.2)",padding:12,display:"grid",gap:8}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong>Atlas Notifications</strong><button type="button" onClick={markAllRead} style={{border:0,background:"transparent",fontWeight:800,cursor:"pointer"}}>Mark all read</button></div>
        <label style={{display:"flex",gap:8,alignItems:"center",fontSize:12,fontWeight:800}}><input type="checkbox" checked={browserEnabled} onChange={()=>void toggleBrowserAlerts()}/>Phone / browser alerts on this device</label>
        {notificationMessage ? <div style={{padding:"7px 8px",borderRadius:8,background:props.colors.panel,fontSize:11,fontWeight:750}}>{notificationMessage}</div> : null}
        <div style={{display:"grid",gridTemplateColumns:props.isMobile?"1fr":"repeat(2, minmax(0, 1fr))",gap:6,padding:"4px 0"}}>
          {([
            ["work", "Due, overdue & high-priority work"],
            ["inventory", "Low and out-of-stock parts"],
            ["requests", "New owner requests"],
            ["inbox", "New Inbox items"],
          ] as const).map(([key, label]) => (
            <label key={key} style={{display:"flex",gap:7,alignItems:"flex-start",fontSize:11,fontWeight:750,border:`1px solid ${props.colors.line}`,borderRadius:8,padding:7}}>
              <input type="checkbox" checked={preferences[key]} onChange={(event)=>void updateNotificationPreference(key,event.currentTarget.checked)}/>
              <span>{label}</span>
            </label>
          ))}
        </div>
        {alerts.length ? alerts.map((alert)=><button key={alert.id} type="button" onClick={()=>{setOpen(false);alert.open();}} style={{textAlign:"left",border:`1px solid ${props.colors.line}`,borderLeft:`4px solid ${alert.tone==="urgent"?"#B42318":alert.tone==="attention"?props.colors.gold:"#3B82F6"}`,borderRadius:9,background:readIds.includes(alert.id)?props.colors.panel:"#fff",padding:10,cursor:"pointer"}}><strong style={{display:"block",color:props.colors.navy}}>{alert.title}</strong><span style={{fontSize:12,color:props.colors.muted}}>{alert.detail}</span></button>) : <div style={{padding:14,color:props.colors.muted}}>No active notifications.</div>}
      </div> : null}
    </div>
  );
}
