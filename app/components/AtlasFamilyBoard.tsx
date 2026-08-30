"use client";

import React, { useEffect, useMemo, useState } from "react";

type Chore = {
  id:string; recordType:"chore"; title:string; person?:string; emoji?:string; points?:number;
  date?:string; recurring?:string; completed?:boolean; notes?:string;
};
type Goal = {
  id:string; recordType:"goal"; title:string; person?:string; goalEmoji?:string;
  currentAmount?:number; goalAmount?:number; goalColor?:string;
};
type CalendarItem = {
  id:string; date:string; time?:string; title:string; area?:string; categoryLabel?:string;
  notes?:string; eventType?:string; completed?:boolean; linkedId?:string;
};

const personColors:Record<string,string>={Family:"#475467",Nick:"#175CD3",Chelsea:"#C11574",Cooper:"#7F56D9",Leni:"#039855"};
function monthKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
function dateKey(d:Date){return `${monthKey(d)}-${String(d.getDate()).padStart(2,"0")}`;}
function monthCells(view:Date){
  const first=new Date(view.getFullYear(),view.getMonth(),1);
  const start=new Date(first); start.setDate(first.getDate()-first.getDay());
  return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
}

export default function AtlasFamilyBoard(){
  const [token,setToken]=useState("");
  const [person,setPerson]=useState("Cooper");
  const [chores,setChores]=useState<Chore[]>([]);
  const [goals,setGoals]=useState<Goal[]>([]);
  const [calendar,setCalendar]=useState<CalendarItem[]>([]);
  const [view,setView]=useState(()=>new Date());
  const [selectedDate,setSelectedDate]=useState(()=>dateKey(new Date()));
  const [message,setMessage]=useState("");

  async function load(t:string){
    const response=await fetch(`/api/atlas-home?token=${encodeURIComponent(t)}`,{cache:"no-store"});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(payload?.error||"Could not open family board.");return;}
    setPerson(payload.person||"Cooper");
    const records=Array.isArray(payload.records)?payload.records:[];
    setChores(records.filter((r:any)=>r.recordType==="chore"));
    setGoals(records.filter((r:any)=>r.recordType==="goal"));
    setCalendar(Array.isArray(payload.calendar)?payload.calendar:[]);
  }

  useEffect(()=>{
    const t=new URLSearchParams(window.location.search).get("token")||"";
    setToken(t);
    if(t) void load(t);
    else setMessage("This family link is missing its token.");
  },[]);

  const visibleChores=useMemo(()=>chores.filter(c=>c.person===person||c.person==="Family"),[chores,person]);
  const cells=monthCells(view);
  const selectedItems=calendar.filter(i=>i.date===selectedDate);
  const goal=goals.find(g=>g.person===person);
  const current=Number(goal?.currentAmount||0), target=Math.max(1,Number(goal?.goalAmount||1));
  const pct=Math.min(100,Math.round(current/target*100));

  async function complete(chore:Chore){
    const response=await fetch("/api/atlas-home",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,choreId:chore.id})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){setMessage(payload?.error||"Could not complete chore.");return;}
    setMessage(`Nice job! +${chore.points||0} points`);
    await load(token);
    window.setTimeout(()=>setMessage(""),1800);
  }

  return <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#F4F7FB,#FFFFFF)",padding:"14px 14px 40px",fontFamily:"Arial,sans-serif",color:"#172331"}}>
    <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gap:14}}>
      <header style={{background:"#071B2F",color:"#FFF",borderRadius:22,padding:18,display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div><div style={{color:"#E5C06B",fontSize:11,fontWeight:900,letterSpacing:".14em"}}>4725 FAMILY</div><h1 style={{margin:"4px 0 0",fontSize:28}}>{person}'s Board</h1></div>
        {message?<strong style={{fontSize:13}}>{message}</strong>:null}
      </header>

      {goal?<section style={{background:"#FFF",border:"1px solid #DDE7F0",borderRadius:18,padding:15}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:38}}>{goal.goalEmoji||"🎁"}</span><div style={{flex:1}}><strong style={{fontSize:18}}>Saving for {goal.title}</strong><div style={{fontSize:13,color:"#64748B"}}>{current} / {target} points · {pct}%</div><div style={{height:13,background:"#EEF2F6",borderRadius:999,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:`${pct}%`,background:goal.goalColor||personColors[person]}}/></div></div></div>
      </section>:null}

      <section style={{background:"#FFF",border:"1px solid #DDE7F0",borderRadius:18,padding:15}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <strong style={{fontSize:20}}>Chores</strong>
          <span style={{fontSize:12,color:"#64748B"}}>Tap Done when finished</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:10,marginTop:12}}>
          {visibleChores.map(chore=><article key={chore.id} style={{border:`3px solid ${personColors[chore.person||"Family"]||"#DDE7F0"}`,borderRadius:18,padding:12,textAlign:"center",background:"#FFF",boxShadow:"0 4px 14px rgba(7,27,47,.08)"}}>
            <div style={{fontSize:48}}>{chore.emoji||"⭐"}</div><strong style={{display:"block",fontSize:15}}>{chore.title}</strong><div style={{fontSize:11,color:"#64748B",marginTop:4}}>{chore.points||0} pts · {chore.date||"Anytime"}</div>
            <button onClick={()=>void complete(chore)} style={{width:"100%",marginTop:10,minHeight:40,border:0,borderRadius:11,background:"#C99A3D",color:"#071B2F",fontWeight:900,cursor:"pointer"}}>✓ Done</button>
          </article>)}
        </div>
      </section>

      <section style={{background:"#FFF",border:"1px solid #DDE7F0",borderRadius:18,padding:15}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <button onClick={()=>setView(new Date(view.getFullYear(),view.getMonth()-1,1))} style={{border:"1px solid #DDE7F0",background:"#FFF",borderRadius:10,padding:"8px 12px",fontWeight:900}}>‹</button>
          <strong style={{fontSize:20}}>{view.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong>
          <button onClick={()=>setView(new Date(view.getFullYear(),view.getMonth()+1,1))} style={{border:"1px solid #DDE7F0",background:"#FFF",borderRadius:10,padding:"8px 12px",fontWeight:900}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:4,marginTop:12}}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:900,color:"#64748B",padding:4}}>{d}</div>)}
          {cells.map(d=>{
            const key=dateKey(d), inMonth=d.getMonth()===view.getMonth(), items=calendar.filter(i=>i.date===key);
            return <button key={key} onClick={()=>setSelectedDate(key)} style={{minHeight:88,border:selectedDate===key?"2px solid #C99A3D":"1px solid #DDE7F0",borderRadius:10,background:inMonth?"#FFF":"#F8FAFC",padding:6,textAlign:"left",overflow:"hidden"}}>
              <strong style={{fontSize:12,color:inMonth?"#172331":"#98A2B3"}}>{d.getDate()}</strong>
              {items.slice(0,3).map(i=><div key={i.id} style={{marginTop:4,borderRadius:6,padding:"3px 4px",fontSize:9,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",background:i.categoryLabel==="Chore"?"#FFF4CC":"#EAF2FF"}}>{i.title}</div>)}
            </button>;
          })}
        </div>
        <div style={{marginTop:12,display:"grid",gap:7}}>
          <strong>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</strong>
          {selectedItems.map(item=><div key={item.id} style={{border:"1px solid #DDE7F0",borderRadius:11,padding:10}}><strong>{item.title}</strong><div style={{fontSize:12,color:"#64748B"}}>{item.time||"All day"} · {item.categoryLabel||item.eventType}</div>{item.notes?<div style={{fontSize:12,marginTop:4}}>{item.notes}</div>:null}</div>)}
          {!selectedItems.length?<span style={{fontSize:12,color:"#64748B"}}>Nothing scheduled.</span>:null}
        </div>
      </section>
    </div>
  </main>;
}
