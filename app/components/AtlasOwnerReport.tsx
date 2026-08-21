"use client";

import { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Item = { id:string; sourceKey:string; sourceType:string; sourceId:string; date:string; person:string; department:string; title:string; notes:string };
type SavedReport = { id:string; propertyId:string; periodStart:string; periodEnd:string; title:string; status:"Draft"|"Final"; items:Item[]; updatedAt:string };
type Props = { workOrders:Row[]; colors:{ navy:string; gold:string; line:string; card:string; panel:string; muted:string; green:string }; isMobile:boolean };

const departments = ["Maintenance & Cleaning","Landscape","Dock & Marine","Garage / Vehicles","Pool & Spa","Projects","Administration","Other"];

function localDate(date=new Date()) { const offset=date.getTimezoneOffset()*60000; return new Date(date.getTime()-offset).toISOString().slice(0,10); }
function weekStart() { const date=new Date(); date.setDate(date.getDate()-(date.getDay()===0?6:date.getDay()-1)); return localDate(date); }
function dateOnly(value:unknown) { return String(value||"").slice(0,10); }
function activePropertyId() {
  if (typeof window === "undefined") return "2000";
  let winner={ id:"2000", updatedAt:"" };
  for (const id of ["2000","6855","3661","hangar"]) {
    try {
      const raw=window.sessionStorage.getItem(`atlas-navigation-state-v1-${id}`);
      const parsed=raw?JSON.parse(raw):null;
      const updatedAt=String(parsed?.updatedAt||"");
      if (updatedAt>winner.updatedAt) winner={ id, updatedAt };
    } catch {}
  }
  return winner.id;
}
function text(...values:unknown[]) { return values.flatMap((value)=>Array.isArray(value)?value:[value]).map((value)=>String(value??"")).join(" ").toLowerCase(); }
function inferDepartment(row:Row) {
  const value=text(row.department,row.workCategory,row.work_category,row.responsibilityArea,row.responsibility_area,row.category,row.title,row.taskTitle,row.listName,row.location,row.notes,row.note);
  if (/dock|marine|boat|cobalt|sea.?doo|watercraft|sunstream|lift box|liftbox|waterfront/.test(value)) return "Dock & Marine";
  if (/landscap|irrigat|fertiliz|lawn|garden|weed|plant|tree|shrub|yard|grounds/.test(value)) return "Landscape";
  if (/garage|vehicle|ford|f-?150|mercedes|rivian|porsche|car clean|wash car|detail/.test(value)) return "Garage / Vehicles";
  if (/pool|spa|hot tub|sundance|chlorine|filter|backwash/.test(value)) return "Pool & Spa";
  if (/project|construction|paint|siding|renovat|install/.test(value)) return "Projects";
  if (/admin|invoice|receipt|owner update|meeting|email|computer/.test(value)) return "Administration";
  if (/clean|maintenance|appliance|house|window|trash|reset|service|repair|inspect/.test(value)) return "Maintenance & Cleaning";
  return "Other";
}
function person(row:Row) { return String(row.assignedTo||row.assignee||row.employeeName||row.employee_name||row.completedBy||"").trim(); }
function uniqueDates(values:unknown[]) { return Array.from(new Set(values.map(dateOnly).filter((value)=>/^\d{4}-\d{2}-\d{2}$/.test(value)))).sort(); }
function workOrderItems(rows:Row[]) {
  const result:Item[]=[];
  for (const row of rows) {
    const id=String(row.id||"");
    const serviceHistory=Array.isArray(row.serviceHistory)?row.serviceHistory as Row[]:[];
    const completionHistory=Array.isArray(row.completionHistory)?row.completionHistory:[];
    const dates=uniqueDates([...completionHistory,row.lastCompletedDate,row.last_completed_date,row.status==="Completed"?(row.completedAt||row.updatedAt||row.date):"",...serviceHistory.map((entry)=>entry.completedAt)]);
    for (const date of dates) {
      const history=serviceHistory.find((entry)=>dateOnly(entry.completedAt)===date);
      result.push({ id:`wo-${id}-${date}`, sourceKey:`work-order:${id}:${date}`, sourceType:"Work Order", sourceId:id, date, person:person(row), department:inferDepartment(row), title:String(row.title||row.name||"Work order completed"), notes:String(history?.notes||row.completionNotes||row.notes||"") });
    }
  }
  return result;
}
function taskItems(rows:Row[]) {
  const result:Item[]=[];
  for (const row of rows) {
    const meta=row.taskMeta&&typeof row.taskMeta==="object"?row.taskMeta as Row:row;
    const id=String(row.id||meta.id||"");
    const completionHistory=Array.isArray(meta.completionHistory)?meta.completionHistory:[];
    const dates=uniqueDates([...completionHistory,meta.completedAt,meta.lastCompletedDate,meta.status==="Completed"?(meta.dueDate||row.scheduledDate):""]);
    for (const date of dates) result.push({ id:`task-${id}-${date}`, sourceKey:`task:${id}:${date}`, sourceType:"Task / Routine", sourceId:id, date, person:person({...row,...meta}), department:inferDepartment({...row,...meta}), title:String(row.title||meta.title||"Task completed"), notes:String(meta.addisonNote||meta.notes||row.notes||"") });
  }
  return result;
}
function teamItems(rows:Row[],propertyId:string) {
  return rows.filter((row)=>String(row.propertyId||row.property_id||"2000")===propertyId).map((row):Item=>{ const id=String(row.id||`team-${Date.now()}-${Math.random()}`); return { id, sourceKey:`team:${id}`, sourceType:"Team Work", sourceId:String(row.taskId||row.task_id||id), date:dateOnly(row.completedAt||row.completed_at), person:person(row), department:inferDepartment(row), title:String(row.taskTitle||row.task_title||row.title||"Team work completed"), notes:String(row.note||row.notes||"") }; }).filter((item)=>Boolean(item.date));
}
function dedupe(items:Item[]) {
  const seen=new Set<string>();
  return items.filter((item)=>{ const key=`${item.date}|${item.person.trim().toLowerCase()}|${item.title.trim().toLowerCase().replace(/[^a-z0-9]+/g," ")}`; if (seen.has(item.sourceKey)||seen.has(key)) return false; seen.add(item.sourceKey); seen.add(key); return true; });
}
function escapeHtml(value:unknown) { return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function titleFor(start:string,end:string) { const fmt=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"}); return start&&end?`Owner Report · ${fmt(start)}–${fmt(end)}`:"Owner Report"; }

export default function AtlasOwnerReport({ workOrders, colors, isMobile }:Props) {
  const [propertyId,setPropertyId]=useState("2000");
  const [periodStart,setPeriodStart]=useState(weekStart());
  const [periodEnd,setPeriodEnd]=useState(localDate());
  const [tasks,setTasks]=useState<Row[]>([]);
  const [teamHistory,setTeamHistory]=useState<Row[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [saved,setSaved]=useState<SavedReport[]>([]);
  const [activeId,setActiveId]=useState("");
  const [status,setStatus]=useState<"Draft"|"Final">("Draft");
  const [message,setMessage]=useState("");
  const [showSaved,setShowSaved]=useState(false);

  useEffect(()=>setPropertyId(activePropertyId()),[]);
  useEffect(()=>{ void fetch(`/api/atlas?propertyId=${encodeURIComponent(propertyId)}`,{cache:"no-store"}).then((r)=>r.json()).then((p)=>setTasks(Array.isArray(p.taskRecords)?p.taskRecords:Array.isArray(p.tasks)?p.tasks:[])).catch(()=>setTasks([])); },[propertyId]);
  useEffect(()=>{ void fetch("/api/atlas-team-work",{cache:"no-store"}).then((r)=>r.json()).then((p)=>setTeamHistory(Array.isArray(p.workHistory)?p.workHistory:[])).catch(()=>setTeamHistory([])); },[]);
  async function loadSaved() { const r=await fetch(`/api/atlas-owner-reports?propertyId=${encodeURIComponent(propertyId)}`,{cache:"no-store"}); const p=await r.json().catch(()=>({})); if (r.ok&&p.ok) setSaved(Array.isArray(p.reports)?p.reports:[]); }
  useEffect(()=>{ void loadSaved(); },[propertyId]);

  const sourceItems=useMemo(()=>dedupe([...workOrderItems(workOrders),...taskItems(tasks),...teamItems(teamHistory,propertyId)]),[workOrders,tasks,teamHistory,propertyId]);
  const filtered=useMemo(()=>sourceItems.filter((item)=>(!periodStart||item.date>=periodStart)&&(!periodEnd||item.date<=periodEnd)),[sourceItems,periodStart,periodEnd]);
  useEffect(()=>{ if (!activeId) setItems(filtered); },[filtered,activeId]);

  function update(id:string,patch:Partial<Item>) { setItems((current)=>current.map((item)=>item.id===id?{...item,...patch}:item)); }
  function refresh() { setActiveId(""); setStatus("Draft"); setItems(filtered); setMessage("Report refreshed from Atlas."); }
  function addItem() { const id=`manual-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; setItems((current)=>[...current,{ id,sourceKey:id,sourceType:"Manual",sourceId:"",date:periodEnd||localDate(),person:"",department:"Other",title:"",notes:"" }]); }
  async function save(nextStatus:"Draft"|"Final"=status) {
    if (!periodStart||!periodEnd) return setMessage("Choose a start and end date.");
    const id=activeId||`owner-report-${propertyId}-${periodStart}-${periodEnd}`;
    const r=await fetch("/api/atlas-owner-reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,propertyId,periodStart,periodEnd,title:titleFor(periodStart,periodEnd),status:nextStatus,items})});
    const p=await r.json().catch(()=>({}));
    if (!r.ok||!p.ok) return setMessage(String(p.error||"Owner report could not be saved."));
    setActiveId(id); setStatus(nextStatus); setMessage(nextStatus==="Final"?"Owner report finalized.":"Owner report saved."); await loadSaved();
  }
  function openReport(report:SavedReport) { setActiveId(report.id); setPeriodStart(report.periodStart); setPeriodEnd(report.periodEnd); setStatus(report.status); setItems(Array.isArray(report.items)?report.items:[]); setShowSaved(false); setMessage(`Opened ${report.title}.`); }
  async function removeSaved(report:SavedReport) { if (!window.confirm("Delete this saved owner report? Source Atlas records will not be deleted.")) return; const r=await fetch(`/api/atlas-owner-reports?id=${encodeURIComponent(report.id)}&propertyId=${encodeURIComponent(propertyId)}`,{method:"DELETE"}); const p=await r.json().catch(()=>({})); if (!r.ok||!p.ok) return setMessage(String(p.error||"Saved report could not be deleted.")); if (activeId===report.id) refresh(); await loadSaved(); setMessage("Saved report deleted. Source records were not changed."); }
  function printReport() {
    if (!items.length) return;
    const popup=window.open("","_blank"); if (!popup) return;
    const groups=departments.map((department)=>({department,rows:items.filter((item)=>item.department===department)})).filter((group)=>group.rows.length);
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(titleFor(periodStart,periodEnd))}</title><style>@page{size:letter;margin:.55in}body{font-family:Arial,sans-serif;color:#071b2f;margin:0}.head{border-bottom:3px solid #c99a3d;padding-bottom:10px;margin-bottom:16px}h1{font-size:22px;margin:0}.meta,.when{color:#667788;font-size:10px}.dept{font-size:15px;border-bottom:1px solid #d8e0e8;padding-bottom:5px;margin:17px 0 5px}.item{padding:6px 0;border-bottom:1px solid #edf0f3;break-inside:avoid}.line{display:flex;justify-content:space-between;gap:10px}.title{font-size:11px;font-weight:700}.notes{font-size:10px;color:#405164;margin-top:3px;white-space:pre-wrap}</style></head><body><div class="head"><h1>${escapeHtml(titleFor(periodStart,periodEnd))}</h1><div class="meta">Property ${escapeHtml(propertyId)} · ${items.length} completed item${items.length===1?"":"s"}</div></div>${groups.map((group)=>`<section><h2 class="dept">${escapeHtml(group.department)}</h2>${group.rows.map((item)=>`<div class="item"><div class="line"><div class="title">${escapeHtml(item.title||"Completed work")}${item.person?` · ${escapeHtml(item.person)}`:""}</div><div class="when">${escapeHtml(new Date(`${item.date}T12:00:00`).toLocaleDateString())}</div></div>${item.notes?`<div class="notes">${escapeHtml(item.notes)}</div>`:""}</div>`).join("")}</section>`).join("")}</body></html>`);
    popup.document.close(); popup.focus(); window.setTimeout(()=>popup.print(),250);
  }

  const card={ border:`1px solid ${colors.line}`,borderRadius:16,background:colors.card,padding:isMobile?14:18,boxShadow:"0 8px 24px rgba(7,27,47,.05)" };
  const control={ width:"100%",minHeight:38,border:`1px solid ${colors.line}`,borderRadius:9,padding:"8px 9px",background:"#fff",color:colors.navy,fontWeight:700,fontSize:12 };
  const button={ border:0,borderRadius:9,background:colors.gold,color:colors.navy,padding:"9px 12px",fontWeight:900,cursor:"pointer",whiteSpace:"nowrap" as const };
  const quiet={ ...button,background:"#fff",border:`1px solid ${colors.line}` };

  return <section style={card}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:12}}>
      <div><div style={{color:colors.gold,fontSize:10,fontWeight:950,letterSpacing:".12em",textTransform:"uppercase"}}>Weekly reporting</div><h2 style={{margin:"4px 0 2px",color:colors.navy,fontSize:20}}>Owner Report</h2><div style={{color:colors.muted,fontSize:12}}>{activeId?`${status} saved report`:`Property ${propertyId} · live draft`}</div></div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}><button type="button" onClick={()=>setShowSaved((value)=>!value)} style={quiet}>Saved Reports</button><button type="button" onClick={printReport} disabled={!items.length} style={{...quiet,opacity:items.length?1:.5}}>Print / PDF</button><button type="button" onClick={()=>void save("Draft")} style={quiet}>Save</button><button type="button" onClick={()=>void save("Final")} disabled={!items.length} style={{...button,opacity:items.length?1:.5}}>Finalize</button></div>
    </div>
    {showSaved?<div style={{display:"grid",gap:6,marginBottom:12,padding:10,border:`1px solid ${colors.line}`,borderRadius:11,background:colors.panel}}>{saved.length?saved.map((report)=><div key={report.id} style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap",padding:"7px 8px",background:"#fff",borderRadius:9}}><button type="button" onClick={()=>openReport(report)} style={{border:0,background:"transparent",padding:0,color:colors.navy,fontWeight:850,cursor:"pointer",textAlign:"left"}}>{report.title} · {report.status} · {report.items.length}</button><button type="button" onClick={()=>void removeSaved(report)} style={{...quiet,padding:"6px 8px",fontSize:11}}>Delete</button></div>):<div style={{color:colors.muted,fontSize:12}}>No saved owner reports yet.</div>}</div>:null}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"150px 150px auto auto",gap:7,alignItems:"end",marginBottom:11}}>
      <label style={{display:"grid",gap:4,color:colors.muted,fontSize:10,fontWeight:850}}>FROM<input type="date" value={periodStart} onChange={(e)=>{setActiveId("");setPeriodStart(e.currentTarget.value);}} style={control}/></label>
      <label style={{display:"grid",gap:4,color:colors.muted,fontSize:10,fontWeight:850}}>TO<input type="date" value={periodEnd} onChange={(e)=>{setActiveId("");setPeriodEnd(e.currentTarget.value);}} style={control}/></label>
      <button type="button" onClick={refresh} style={quiet}>Refresh from Atlas</button><button type="button" onClick={addItem} style={quiet}>Add Item</button>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:8,color:colors.muted,fontSize:11}}><span><strong style={{color:colors.navy}}>{items.length}</strong> items in report</span><span>Edits here do not change source records.</span></div>
    <div style={{display:"grid",gap:7}}>{items.length?items.map((item)=><div key={item.id} style={{border:`1px solid ${colors.line}`,borderRadius:11,padding:9,display:"grid",gridTemplateColumns:isMobile?"1fr":"110px 120px minmax(145px,.8fr) minmax(220px,1.5fr) minmax(220px,1.5fr) auto",gap:7,alignItems:"start"}}>
      <input type="date" value={item.date} onChange={(e)=>update(item.id,{date:e.currentTarget.value})} style={control}/><input value={item.person} onChange={(e)=>update(item.id,{person:e.currentTarget.value})} placeholder="Person" style={control}/><select value={item.department} onChange={(e)=>update(item.id,{department:e.currentTarget.value})} style={control}>{departments.map((department)=><option key={department}>{department}</option>)}</select><input value={item.title} onChange={(e)=>update(item.id,{title:e.currentTarget.value})} placeholder="Completed work" style={control}/><textarea value={item.notes} onChange={(e)=>update(item.id,{notes:e.currentTarget.value})} placeholder="Notes" rows={isMobile?2:1} style={{...control,resize:"vertical",minHeight:38}}/><button type="button" onClick={()=>setItems((current)=>current.filter((row)=>row.id!==item.id))} style={{...quiet,padding:"9px 10px"}}>Delete</button>
    </div>):<div style={{padding:16,border:`1px dashed ${colors.line}`,borderRadius:11,color:colors.muted,fontSize:12}}>No completed work found for this date range.</div>}</div>
    {message?<div style={{marginTop:10,color:colors.navy,fontSize:12,fontWeight:800}}>{message}</div>:null}
  </section>;
}
