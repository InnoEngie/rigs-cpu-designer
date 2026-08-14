"use client";

import { useState } from "react";
import { DESIGNERS, type DesignerConfig } from "./component-config";
import { boardFitsCase, cardFitsSlots, type ComponentType, type SavedComponent } from "../lib/component-model";

export type Screen = "main" | "components" | "cpu" | "designer" | "saved" | "rig" | "production" | "fab-design" | "fab-saved" | "fab-run" | "exotic";

export function TopBar({ screen, home }: { screen: Screen; home: () => void }) {
  return <header className="topbar"><button className="brand" onClick={home}><span className="brand-mark">R</span><span><strong>RIGS</strong><small>Hardware Engineering</small></span></button><nav className="breadcrumbs"><button onClick={home}>Main Splash</button><span>/</span><span>{screen.replaceAll("-", " ")}</span></nav><div className="session-chip"><span className="status-light"/>LOCAL SAVE ONLINE</div></header>;
}

export function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>;
}

export function MainSplash({ go }: { go: (screen: Screen) => void }) {
  const cards: Array<[Screen,string,string,string]> = [
    ["components", "01", "Design & Fabrication", "Design CPUs and the full component roster."],
    ["saved", "02", "Saved Components", "Inspect reusable parts persisted in this browser."],
    ["rig", "03", "Rig Builder", "Slot saved parts together and check physical compatibility."],
    ["production", "04", "Production", "Design, save, and operate semiconductor Fab Lines."],
  ];
  return <main className="page-shell hub-page"><Heading eyebrow="SYSTEM 04 / ENGINEERING" title="RIGS Hardware Lab" copy="Choose a workspace. Designs, assembly, and fabrication share one persistent component library."/><section className="hub-grid four-up">{cards.map(([screen,index,title,copy], i)=><button key={screen} className={`hub-card ${i===0?"primary-card":""}`} onClick={()=>go(screen)}><span className="card-index">{index}</span><span className="hub-icon">{i===0?"⌁":i===1?"▦":i===2?"⌘":"⌂"}</span><span className="hub-card-content"><strong>{title}</strong><span>{copy}</span></span><span className="card-arrow">→</span></button>)}</section></main>;
}

export function ComponentHub({ go, choose }: { go: (screen: Screen) => void; choose: (config: DesignerConfig) => void }) {
  return <main className="page-shell"><Heading eyebrow="DESIGN & FABRICATION / SELECT TARGET" title="What are you building?" copy="Every non-exotic component route is active. IC-based parts include a lightweight floorplan; supporting hardware uses configuration controls."/><section className="component-grid"><button className="component-card available" onClick={()=>go("cpu")}><span className="component-number">01</span><span className="component-code">CPU</span><span className="component-copy"><strong>CPU</strong><small>Lithography-aware monolithic die and package</small><em>FULL DESIGNER</em></span><span>↗</span></button>{DESIGNERS.map((config,index)=><button className="component-card available" key={config.type} onClick={()=>choose(config)}><span className="component-number">{String(index+2).padStart(2,"0")}</span><span className="component-code">{config.code}</span><span className="component-copy"><strong>{config.type}</strong><small>{config.summary}</small><em>DESIGNER ACTIVE</em></span><span>↗</span></button>)}<button className="component-card" onClick={()=>go("exotic")}><span className="component-number">15</span><span className="component-code">XTC</span><span className="component-copy"><strong>Exotic Compute</strong><small>Quantum and biological systems</small><em>INTENTIONAL STUB</em></span><span>↗</span></button></section></main>;
}

export function SavedLibrary({items}:{items:SavedComponent[]}) {
  const [filter,setFilter]=useState("All");
  const types=["All",...Array.from(new Set(items.map(item=>item.type)))];
  const visible=filter==="All"?items:items.filter(item=>item.type===filter);
  return <main className="page-shell"><Heading eyebrow="PERSISTENT LIBRARY" title="Saved Components" copy="Parts are stored in localStorage and remain available after reload. CPU die records also feed Production."/><div className="filter-row">{types.map(type=><button key={type} className={filter===type?"active":""} onClick={()=>setFilter(type)}>{type}</button>)}</div><section className="saved-grid">{visible.map(item=><article key={item.id}><span className="type-pill">{item.type}</span><h3>{item.name}</h3><dl>{Object.entries(item.stats).slice(0,8).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></article>)}{!visible.length&&<div className="empty-state"><strong>NO SAVED COMPONENTS</strong><p>Complete any component designer and press Save.</p></div>}</section></main>;
}

const RIG_SLOTS:Array<[string,ComponentType[],boolean]>=[
  ["CPU",["CPU"],false],["Motherboard",["Motherboard"],false],["RAM",["RAM"],true],
  ["Storage",["SSD","HDD","Holographic Storage","DNA Storage"],true],
  ["Power Supply",["Power Supply"],false],["Cooling",["Cooling"],false],["Case",["Case"],false],
  ["Expansion Card",["Expansion Card","NIC"],true],["Rack",["Rack"],false],
];

export function RigBuilder({items}:{items:SavedComponent[]}) {
  const [slots,setSlots]=useState<Record<string,string[]>>({});
  const selected=(slot:string)=>slots[slot]?.map(id=>items.find(item=>item.id===id)).filter((item):item is SavedComponent=>Boolean(item))||[];
  const add=(slot:string,id:string,multi:boolean)=>setSlots(previous=>({...previous,[slot]:multi?[...(previous[slot]||[]),id]:[id]}));
  const cpu=selected("CPU")[0], board=selected("Motherboard")[0], casePart=selected("Case")[0], cards=selected("Expansion Card");
  const checks=[
    {label:"CPU layout ↔ motherboard socket",ready:Boolean(cpu&&board),pass:cpu?.compatibility.cpuLayout===board?.compatibility.cpuSocket},
    {label:"Motherboard ↔ case form factor",ready:Boolean(board&&casePart),pass:boardFitsCase(board?.compatibility.motherboardFormFactor||"",casePart?.compatibility.caseFormFactor||"")},
    ...cards.map(card=>({label:`${card.name} ↔ expansion slots`,ready:Boolean(board),pass:cardFitsSlots(card.compatibility.busInterface||"",board?.compatibility.expansionSlots||[])})),
  ];
  return <main className="page-shell"><Heading eyebrow="ASSEMBLY / COMPATIBILITY" title="Rig Builder" copy="Fill any slots you need. Compatibility checks update continuously; no rig-level performance score is calculated."/><div className="rig-layout"><section className="slot-grid">{RIG_SLOTS.map(([slot,types,multi])=>{const choices=items.filter(item=>types.includes(item.type));return <article key={slot} className="rig-slot"><div><span>{slot}</span>{multi&&<small>MULTIPLE ALLOWED</small>}</div>{selected(slot).map((item,index)=><p key={`${item.id}-${index}`}>{item.name}<button onClick={()=>setSlots(previous=>({...previous,[slot]:(previous[slot]||[]).filter((_,i)=>i!==index)}))}>×</button></p>)}<select value="" onChange={e=>{if(e.target.value)add(slot,e.target.value,multi)}}><option value="">+ Select saved part</option>{choices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></article>})}</section><aside className="compat-panel"><p className="panel-label">FIT CHECKS</p>{checks.map(check=><div key={check.label} className={!check.ready?"pending":check.pass?"pass":"fail"}><span>{!check.ready?"○":check.pass?"✓":"!"}</span><p><strong>{check.label}</strong><small>{!check.ready?"Waiting for both parts":check.pass?"Compatible":"Incompatible"}</small></p></div>)}</aside></div></main>;
}
