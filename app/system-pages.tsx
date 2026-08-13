"use client";

import { useMemo, useState } from "react";
import {
  STORAGE_TYPES,
  TYPE_CODES,
  allocateExpansionCards,
  componentCategory,
  motherboardFitsCase,
  type SavedComponent,
} from "../lib/component-model";

function Heading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>;
}

export function MainSplash({ onFabrication, onLibrary, onRig, onProduction }: { onFabrication: () => void; onLibrary: () => void; onRig: () => void; onProduction: () => void }) {
  const entries = [
    { code: "01", title: "Design & Fabrication", copy: "Design every component type, from silicon floorplans to racks.", action: onFabrication, primary: true, icon: "⌁" },
    { code: "02", title: "Saved Components", copy: "Browse the persistent component library used by assembly workflows.", action: onLibrary, icon: "▦" },
    { code: "03", title: "Rig Builder", copy: "Slot saved components together and continuously check physical compatibility.", action: onRig, icon: "▤" },
    { code: "04", title: "Production", copy: "Manufacturing, lithography, process capacity, and fabrication queues.", action: onProduction, icon: "⌂" },
  ];
  return <main className="page-shell splash-page"><Heading eyebrow="RIGS / HARDWARE ENGINEERING" title="Systems workspace" copy="Choose a task. Design parts, preserve them in the component library, then test whether they fit together in a complete Rig." /><section className="splash-grid">{entries.map((entry) => <button key={entry.title} className={`hub-card ${entry.primary ? "primary-card" : ""}`} onClick={entry.action}><span className="card-index">{entry.code}</span><span className="hub-icon">{entry.icon}</span><span className="hub-card-content"><strong>{entry.title}</strong><span>{entry.copy}</span></span><span className="card-arrow">→</span></button>)}</section><footer className="system-footer"><span>DESIGN / SAVE / ASSEMBLE</span><span>COMPATIBILITY ENGINE ONLINE</span><span className="footer-ready">● READY</span></footer></main>;
}

export function SavedLibrary({ saved, onDelete, onBack }: { saved: SavedComponent[]; onDelete: (id: string) => void; onBack: () => void }) {
  const [filter, setFilter] = useState<string>("All");
  const types = ["All", ...Array.from(new Set(saved.map((item) => item.type)))];
  const visible = filter === "All" ? saved : saved.filter((item) => item.type === filter);
  return <main className="page-shell library-page"><Heading eyebrow="SYSTEM 02 / COMPONENT ARCHIVE" title="Saved Components" copy="Every named part saved from a designer is available here and immediately usable in the Rig Builder." /><div className="library-toolbar"><label>FILTER BY TYPE<select value={filter} onChange={(event) => setFilter(event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><span>{visible.length} OF {saved.length} RECORDS</span></div>{visible.length === 0 ? <div className="empty-state"><span className="empty-grid">▦</span><strong>{saved.length ? "NO MATCHING COMPONENTS" : "LIBRARY EMPTY"}</strong><p>Finish a component, give it a name, and choose Save Component.</p></div> : <section className="saved-grid">{visible.map((component) => <article key={component.id} className="saved-card"><header><span>{TYPE_CODES[component.type]}</span><div><strong>{component.name}</strong><small>{component.type}</small></div><button aria-label={`Delete ${component.name}`} onClick={() => onDelete(component.id)}>×</button></header><dl>{Object.entries(component.stats).slice(0, 6).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Array.isArray(value) ? value.join(" / ") : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd></div>)}</dl><footer>SAVED {new Date(component.createdAt).toLocaleString()}</footer></article>)}</section>}<div className="workflow-actions split"><button className="button ghost" onClick={onBack}>← Main workspace</button></div></main>;
}

type RigState = {
  CPU: string | null;
  Motherboard: string | null;
  RAM: string[];
  Storage: string[];
  "Power Supply": string | null;
  Cooling: string | null;
  Case: string | null;
  "Expansion Card": string[];
  Rack: string | null;
};

const EMPTY_RIG: RigState = { CPU: null, Motherboard: null, RAM: [], Storage: [], "Power Supply": null, Cooling: null, Case: null, "Expansion Card": [], Rack: null };

type SlotKey = keyof RigState;
const SLOT_ORDER: SlotKey[] = ["CPU", "Motherboard", "RAM", "Storage", "Power Supply", "Cooling", "Case", "Expansion Card", "Rack"];
const MULTI = new Set<SlotKey>(["RAM", "Storage", "Expansion Card"]);

function matchesSlot(component: SavedComponent, slot: SlotKey) {
  if (slot === "Storage") return STORAGE_TYPES.includes(component.type);
  return componentCategory(component.type) === slot;
}

function StatusBadge({ result, waiting }: { result: boolean | null; waiting: string }) {
  if (result === null) return <span className="compat neutral">○ {waiting}</span>;
  return result ? <span className="compat pass">✓ COMPATIBLE</span> : <span className="compat fail">! INCOMPATIBLE</span>;
}

export function RigBuilder({ saved, onBack }: { saved: SavedComponent[]; onBack: () => void }) {
  const [rig, setRig] = useState<RigState>(EMPTY_RIG);
  const [picker, setPicker] = useState<SlotKey | null>(null);
  const byId = useMemo(() => new Map(saved.map((item) => [item.id, item])), [saved]);
  const cpu = rig.CPU ? byId.get(rig.CPU) : undefined;
  const board = rig.Motherboard ? byId.get(rig.Motherboard) : undefined;
  const chassis = rig.Case ? byId.get(rig.Case) : undefined;
  const cards = rig["Expansion Card"].map((id) => byId.get(id)).filter(Boolean) as SavedComponent[];
  const cpuCheck = cpu && board ? cpu.compatibility.cpuLayout === board.compatibility.cpuSocket : null;
  const caseCheck = motherboardFitsCase(board?.compatibility.motherboardFormFactor, chassis?.compatibility.caseFormFactor);
  const cardChecks = board ? allocateExpansionCards(cards, board.compatibility.expansionSlots) : cards.map(() => null);
  const candidates = picker ? saved.filter((component) => matchesSlot(component, picker)) : [];

  const selectedFor = (slot: SlotKey) => {
    const value = rig[slot];
    return Array.isArray(value) ? value.map((id) => byId.get(id)).filter(Boolean) as SavedComponent[] : value ? [byId.get(value)].filter(Boolean) as SavedComponent[] : [];
  };
  const choose = (component: SavedComponent) => {
    if (!picker) return;
    setRig((current) => MULTI.has(picker) ? { ...current, [picker]: [...(current[picker] as string[]), component.id] } : { ...current, [picker]: component.id });
    setPicker(null);
  };
  const clear = (slot: SlotKey, index?: number) => setRig((current) => {
    if (MULTI.has(slot)) return { ...current, [slot]: (current[slot] as string[]).filter((_, itemIndex) => itemIndex !== index) };
    return { ...current, [slot]: null };
  });

  return <main className="page-shell rig-page"><Heading eyebrow="SYSTEM 03 / ASSEMBLY" title="Rig Builder" copy="Fill any slots you want. The builder checks only the three physical compatibility relationships defined for this prototype—no performance score is calculated." /><section className="rig-layout"><div className="rig-slots">{SLOT_ORDER.map((slot) => { const selected = selectedFor(slot); return <article key={slot} className={`rig-slot ${selected.length ? "filled" : ""}`}><header><div><span>{slot === "Rack" ? "OPTIONAL" : MULTI.has(slot) ? "MULTI-SLOT" : "REQUIRED TYPE"}</span><h3>{slot}</h3></div><button onClick={() => setPicker(slot)}>{selected.length ? (MULTI.has(slot) ? "+ Add" : "Replace") : "+ Choose"}</button></header>{selected.length === 0 ? <p className="empty-slot">No component selected</p> : <div className="slot-parts">{selected.map((component, index) => <div key={`${component.id}-${index}`}><span>{TYPE_CODES[component.type]}</span><strong>{component.name}</strong><small>{component.type}</small><button aria-label={`Remove ${component.name}`} onClick={() => clear(slot, index)}>×</button>{slot === "Expansion Card" && <StatusBadge result={cardChecks[index] ?? null} waiting="ADD MOTHERBOARD" />}</div>)}</div>}{slot === "CPU" && <StatusBadge result={cpuCheck} waiting="ADD CPU + MOTHERBOARD" />}{slot === "Motherboard" && <><StatusBadge result={cpuCheck} waiting="ADD CPU + MOTHERBOARD" /><StatusBadge result={caseCheck} waiting="ADD MOTHERBOARD + CASE" /></>}{slot === "Case" && <StatusBadge result={caseCheck} waiting="ADD MOTHERBOARD + CASE" />}</article>; })}</div><aside className="compatibility-panel"><p className="panel-label">CONTINUOUS FIT CHECKS</p><h2>Compatibility</h2><div className="compat-row"><span>CPU Layout ↔ Socket</span><StatusBadge result={cpuCheck} waiting="WAITING" /><small>{cpu?.compatibility.cpuLayout ?? "—"} / {board?.compatibility.cpuSocket ?? "—"}</small></div><div className="compat-row"><span>Motherboard ↔ Case</span><StatusBadge result={caseCheck} waiting="WAITING" /><small>{board?.compatibility.motherboardFormFactor ?? "—"} / {chassis?.compatibility.caseFormFactor ?? "—"}</small></div><div className="compat-row"><span>Cards ↔ PCIe Slots</span><StatusBadge result={!board || cards.length === 0 ? null : cardChecks.every(Boolean)} waiting="WAITING" /><small>{cards.length} card(s) / {board?.compatibility.expansionSlots?.length ?? 0} slot(s)</small></div><button className="button ghost" onClick={() => setRig(EMPTY_RIG)}>Clear entire Rig</button></aside></section>{picker && <div className="picker-backdrop" role="presentation" onMouseDown={() => setPicker(null)}><section className="component-picker" role="dialog" aria-modal="true" aria-label={`Choose ${picker}`} onMouseDown={(event) => event.stopPropagation()}><header><div><p className="panel-label">SAVED COMPONENT PICKER</p><h2>Choose {picker}</h2></div><button aria-label="Close picker" onClick={() => setPicker(null)}>×</button></header>{candidates.length === 0 ? <div className="empty-state"><span className="empty-grid">◇</span><strong>NO MATCHING SAVED PARTS</strong><p>Design and save a {picker} first.</p></div> : <div className="picker-list">{candidates.map((component) => <button key={component.id} onClick={() => choose(component)}><span>{TYPE_CODES[component.type]}</span><div><strong>{component.name}</strong><small>{component.type}</small></div><em>SELECT →</em></button>)}</div>}</section></div>}<div className="workflow-actions split"><button className="button ghost" onClick={onBack}>← Main workspace</button></div></main>;
}
