"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  EXPANSION_META,
  PROBLEM_AXES,
  analyzeExpansionCard,
  findExpansionBlobs,
  type ExpansionAnalysis,
  type ExpansionAreaType,
  type ExpansionCell,
} from "../lib/expansion-analysis";
import {
  TYPE_CODES,
  createSavedComponent,
  type ComponentType,
  type SavedComponent,
} from "../lib/component-model";

type SaveHandler = (component: SavedComponent) => void;
type ExitHandler = () => void;

function DesignerHeader({ type, subtitle }: { type: ComponentType; subtitle: string }) {
  return (
    <div className="designer-header">
      <div><p className="eyebrow">COMPONENT DESIGN / {TYPE_CODES[type]}</p><h1>{type}</h1></div>
      <span>{subtitle}</span>
    </div>
  );
}

function MiniStepper({ labels, step, onStep }: { labels: string[]; step: number; onStep: (step: number) => void }) {
  return (
    <ol className="stepper compact-stepper" aria-label="Design progress">
      {labels.map((label, index) => (
        <li key={label} className={index === step ? "current" : index < step ? "complete" : ""}>
          <button disabled={index > step} onClick={() => index <= step && onStep(index)} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? "✓" : String(index + 1).padStart(2, "0")}</span>{label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function WorkflowTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="workflow-title"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{copy}</p></div>;
}

type Field = {
  key: string;
  label: string;
  type: "select" | "range" | "toggle";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue: string | number | boolean;
  description?: string;
};

const SIMPLE_FIELDS: Partial<Record<ComponentType, Field[]>> = {
  HDD: [
    { key: "platters", label: "Platter count", type: "range", min: 1, max: 8, defaultValue: 3 },
    { key: "density", label: "Areal density", type: "range", min: 250, max: 2000, step: 250, unit: " GB/platter", defaultValue: 1000 },
    { key: "rpm", label: "Spin speed", type: "select", options: ["5400 RPM", "7200 RPM", "10000 RPM", "15000 RPM"], defaultValue: "7200 RPM" },
    { key: "actuator", label: "Actuator", type: "select", options: ["Single", "Dual"], defaultValue: "Single" },
    { key: "interface", label: "Interface", type: "select", options: ["ST-506 / MFM", "IDE / ATA", "SCSI", "SATA"], defaultValue: "SATA" },
  ],
  "Holographic Storage": [
    { key: "medium", label: "Recording medium", type: "select", options: ["Photopolymer", "Crystal", "Photochromic Glass"], defaultValue: "Photopolymer" },
    { key: "layers", label: "Layer depth", type: "range", min: 4, max: 128, step: 4, defaultValue: 32 },
    { key: "precision", label: "Laser precision", type: "range", min: 1, max: 10, defaultValue: 5 },
  ],
  "DNA Storage": [
    { key: "method", label: "Synthesis method", type: "select", options: ["Phosphoramidite", "Enzymatic", "Microfluidic Array"], defaultValue: "Enzymatic" },
    { key: "density", label: "Encoding density", type: "range", min: 1, max: 10, defaultValue: 5 },
    { key: "readSpeed", label: "Read / sequencing speed", type: "range", min: 1, max: 10, defaultValue: 4 },
  ],
  "Power Supply": [
    { key: "wattage", label: "Wattage", type: "range", min: 300, max: 2000, step: 50, unit: " W", defaultValue: 750 },
    { key: "efficiency", label: "Efficiency rating", type: "select", options: ["80 PLUS White", "80 PLUS Bronze", "80 PLUS Silver", "80 PLUS Gold", "80 PLUS Platinum", "80 PLUS Titanium"], defaultValue: "80 PLUS Gold" },
    { key: "modularity", label: "Modularity", type: "select", options: ["Non-modular", "Semi-modular", "Fully-modular"], defaultValue: "Fully-modular" },
    { key: "formFactor", label: "Form factor", type: "select", options: ["ATX", "SFX"], defaultValue: "ATX" },
  ],
  Cooling: [
    { key: "coolingType", label: "Cooling type", type: "select", options: ["Air", "Air + Heatpipe", "AIO Liquid", "Custom Loop", "Two-Phase Immersion"], defaultValue: "Air + Heatpipe" },
    { key: "radiator", label: "Radiator / heatsink size", type: "select", options: ["120 mm", "240 mm", "280 mm", "360 mm"], defaultValue: "240 mm" },
    { key: "fanSize", label: "Fan size", type: "select", options: ["80 mm", "92 mm", "120 mm", "140 mm"], defaultValue: "120 mm" },
    { key: "fanCount", label: "Fan count", type: "range", min: 1, max: 8, defaultValue: 2 },
    { key: "fanCurve", label: "Fan curve", type: "select", options: ["Quiet", "Balanced", "Performance"], defaultValue: "Balanced" },
  ],
  Case: [
    { key: "formFactor", label: "Form factor", type: "select", options: ["Mini-ITX", "Micro-ATX", "Mid-Tower", "Full-Tower"], defaultValue: "Mid-Tower" },
    { key: "airflow", label: "Airflow design", type: "select", options: ["Positive pressure", "Negative pressure", "Balanced pressure"], defaultValue: "Balanced pressure" },
    { key: "driveBays", label: "Drive bay count", type: "range", min: 0, max: 12, defaultValue: 4 },
    { key: "fanMounts", label: "Fan mount count", type: "range", min: 1, max: 14, defaultValue: 6 },
  ],
  Rack: [
    { key: "height", label: "Rack height", type: "select", options: ["1U", "2U", "4U", "8U", "12U", "24U", "42U"], defaultValue: "4U" },
    { key: "width", label: "Rack width", type: "select", options: ["19-inch standard"], defaultValue: "19-inch standard" },
    { key: "pdu", label: "PDU integration", type: "toggle", defaultValue: true },
    { key: "cables", label: "Cable management", type: "select", options: ["Basic", "Guided", "Toolless", "Automated"], defaultValue: "Guided" },
  ],
  "Network Appliance": [
    { key: "ports", label: "Port count", type: "range", min: 2, max: 48, step: 2, defaultValue: 8 },
    { key: "speed", label: "Speed per port", type: "select", options: ["100 Mbps", "1 Gbps", "2.5 Gbps", "10 Gbps", "40 Gbps"], defaultValue: "1 Gbps" },
    { key: "managed", label: "Managed", type: "toggle", defaultValue: true },
    { key: "backplane", label: "Backplane bandwidth", type: "range", min: 10, max: 1000, step: 10, unit: " Gbps", defaultValue: 100 },
    { key: "processing", label: "Processing tier", type: "select", options: ["Bridge", "Router", "Gateway", "Edge Compute"], defaultValue: "Router" },
    { key: "wireless", label: "Wireless standard", type: "select", options: ["None", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"], defaultValue: "Wi-Fi 6" },
    { key: "firmware", label: "Firmware features", type: "select", options: ["Basic", "Managed", "Enterprise", "Programmable"], defaultValue: "Managed" },
  ],
};

function initialValues(fields: Field[]) {
  return Object.fromEntries(fields.map((field) => [field.key, field.defaultValue])) as Record<string, string | number | boolean>;
}

function FieldControl({ field, value, onChange }: { field: Field; value: string | number | boolean; onChange: (value: string | number | boolean) => void }) {
  return (
    <label className="config-field">
      <span><strong>{field.label}</strong>{field.description && <small>{field.description}</small>}</span>
      {field.type === "select" && <select value={String(value)} onChange={(event) => onChange(event.target.value)}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>}
      {field.type === "range" && <div className="range-control"><input type="range" min={field.min} max={field.max} step={field.step ?? 1} value={Number(value)} onChange={(event) => onChange(Number(event.target.value))} /><output>{String(value)}{field.unit}</output></div>}
      {field.type === "toggle" && <button type="button" className={`toggle-control ${value ? "active" : ""}`} onClick={() => onChange(!value)}><span />{value ? "Enabled" : "Disabled"}</button>}
    </label>
  );
}

function computeSimpleStats(type: ComponentType, values: Record<string, string | number | boolean>) {
  const stats: Record<string, string | number | boolean> = { ...values };
  if (type === "HDD") stats["Estimated capacity"] = `${Number(values.platters) * Number(values.density)} GB`;
  if (type === "Holographic Storage") stats["Archive index"] = Math.round(Number(values.layers) * Number(values.precision) * 1.5);
  if (type === "DNA Storage") stats["Density index"] = Number(values.density) * 100;
  if (type === "Cooling") stats["Cooling index"] = Number(String(values.radiator).split(" ")[0]) * Number(values.fanCount);
  if (type === "Network Appliance") stats["Aggregate port capacity"] = `${values.ports} × ${values.speed}`;
  return stats;
}

function FinalPanel({ type, name, onName, stats, onBack, onSave, onExit, saved }: { type: ComponentType; name: string; onName: (value: string) => void; stats: Record<string, string | number | boolean | number[]>; onBack: () => void; onSave: () => void; onExit: ExitHandler; saved: boolean }) {
  return (
    <div className="finalize-shell simple-finalize">
      <WorkflowTitle eyebrow="FINAL STEP / DESIGN REVIEW" title={name || `Unnamed ${type}`} copy="Review the completed component, give it a useful library name, then save it for Rig Builder assembly." />
      <div className="finalize-grid">
        <section className="final-main">
          <div className="name-field"><label htmlFor={`name-${TYPE_CODES[type]}`}>NAME THIS PART</label><input id={`name-${TYPE_CODES[type]}`} maxLength={36} value={name} onChange={(event) => onName(event.target.value)} placeholder={`Enter ${type} designation…`} /><small>{name.length}/36</small></div>
          <div className="option-summary-grid">
            {Object.entries(stats).map(([label, value]) => <div key={label}><span>{label}</span><strong>{Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</strong></div>)}
          </div>
        </section>
        <aside className="assembly-summary"><p className="panel-label">LIBRARY RECORD</p><h3>{TYPE_CODES[type]} / READY</h3><p>This saved design will immediately appear in the Saved Components library and matching Rig Builder slots.</p>{saved && <div className="final-valid"><span>✓</span><p><strong>SAVED</strong>Library record created.</p></div>}</aside>
      </div>
      <div className="final-actions"><button className="button ghost" onClick={onBack}>← Keep Working</button><div><button className="button secondary" disabled={!name.trim() || saved} onClick={onSave}>{saved ? "Saved" : "Save Component"}</button><button className="button primary exit-button" onClick={onExit}>Exit to Hub</button></div></div>
    </div>
  );
}

export function SimpleComponentDesigner({ type, onSave, onExit }: { type: ComponentType; onSave: SaveHandler; onExit: ExitHandler }) {
  const fields = SIMPLE_FIELDS[type] ?? [];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(fields));
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const stats = useMemo(() => computeSimpleStats(type, values), [type, values]);
  const save = () => { onSave(createSavedComponent(type, name, stats, type === "Case" ? { caseFormFactor: values.formFactor as never } : {})); setSaved(true); };
  return (
    <main className="designer-page">
      <DesignerHeader type={type} subtitle="CONFIGURATION-DRIVEN DESIGN" />
      <MiniStepper labels={["Configure", "Finalize"]} step={step} onStep={setStep} />
      <div className="workflow-body">
        {step === 0 ? <div className="workflow-narrow"><WorkflowTitle eyebrow="STEP 01 / SUPPORTING HARDWARE" title={`Configure ${type}`} copy="Every control contributes to the saved component record. Placeholder metrics are intended to expose the shape of the design flow, not real-world balance." /><div className="config-grid">{fields.map((field) => <FieldControl key={field.key} field={field} value={values[field.key]} onChange={(value) => { setValues((current) => ({ ...current, [field.key]: value })); setSaved(false); }} />)}</div><div className="workflow-actions"><button className="button primary" onClick={() => setStep(1)}>Review component →</button></div></div> : <FinalPanel type={type} name={name} onName={(value) => { setName(value); setSaved(false); }} stats={stats} onBack={() => setStep(0)} onSave={save} onExit={onExit} saved={saved} />}
      </div>
    </main>
  );
}

const LIGHT_IC: Record<"RAM" | "SSD" | "NIC", { areas: Array<{ id: string; label: string; color: string }>; fields: Field[] }> = {
  RAM: {
    areas: [{ id: "memory", label: "Memory Cell Array", color: "#a879d5" }, { id: "io", label: "I/O Interface", color: "#4b83dd" }],
    fields: [
      { key: "capacitor", label: "Capacitor type", type: "select", options: ["MOS Cap", "Trench", "Stacked", "3D-Stacked"], defaultValue: "Trench" },
      { key: "rank", label: "Rank", type: "select", options: ["Single", "Dual", "Quad"], defaultValue: "Dual" },
      { key: "chips", label: "DRAM chip count", type: "select", options: ["4 (x16)", "8 (x8)", "16 (x4)"], defaultValue: "8 (x8)" },
      { key: "ecc", label: "ECC", type: "toggle", defaultValue: false },
      { key: "generation", label: "Generation", type: "select", options: ["DDR2", "DDR3", "DDR4", "DDR5"], defaultValue: "DDR5" },
      { key: "formFactor", label: "Form factor", type: "select", options: ["DIMM", "SO-DIMM"], defaultValue: "DIMM" },
      { key: "heatSpreader", label: "Heat spreader", type: "select", options: ["None", "Basic", "Enhanced"], defaultValue: "Basic" },
    ],
  },
  SSD: {
    areas: [{ id: "nand", label: "NAND Cell Array", color: "#f3b23c" }, { id: "controller", label: "Controller", color: "#24a6a1" }],
    fields: [
      { key: "cellType", label: "NAND cell type", type: "select", options: ["SLC", "MLC", "TLC", "QLC", "PLC"], defaultValue: "TLC" },
      { key: "dram", label: "DRAM cache", type: "toggle", defaultValue: true },
      { key: "interface", label: "Interface / generation", type: "select", options: ["SATA", "PCIe Gen3", "PCIe Gen4", "PCIe Gen5"], defaultValue: "PCIe Gen4" },
      { key: "formFactor", label: "Form factor", type: "select", options: ["2.5-inch", "M.2", "U.2", "Add-in-Card"], defaultValue: "M.2" },
    ],
  },
  NIC: {
    areas: [{ id: "controller", label: "Interface Controller", color: "#24a6a1" }],
    fields: [
      { key: "bus", label: "Bus interface", type: "select", options: ["PCIe x1", "PCIe x4"], defaultValue: "PCIe x1" },
      { key: "speed", label: "Speed tier", type: "select", options: ["10 Mbps", "100 Mbps", "1000 Mbps", "10 Gbps"], defaultValue: "1000 Mbps" },
      { key: "ports", label: "Port count", type: "range", min: 1, max: 8, defaultValue: 1 },
    ],
  },
};

function LightGrid({ type, cells, setCells, values, onValue }: { type: "RAM" | "SSD" | "NIC"; cells: Array<string | null>; setCells: React.Dispatch<React.SetStateAction<Array<string | null>>>; values: Record<string, string | number | boolean>; onValue: (key: string, value: string | number | boolean) => void }) {
  const definition = LIGHT_IC[type];
  const [tool, setTool] = useState(definition.areas[0].id);
  const painting = useRef(false);
  const paint = (index: number) => setCells((current) => { const next = [...current]; next[index] = tool === "erase" ? null : tool; return next; });
  const activeField = type === "RAM" && tool === "memory" ? definition.fields.find((field) => field.key === "capacitor") : type === "SSD" && tool === "nand" ? definition.fields.find((field) => field.key === "cellType") : undefined;
  return <div className="light-ic-layout"><aside className="light-palette"><p className="panel-label">IC AREAS</p>{definition.areas.map((area) => <button key={area.id} className={tool === area.id ? "active" : ""} onClick={() => setTool(area.id)}><i style={{ background: area.color }} />{area.label}</button>)}<button className={tool === "erase" ? "active" : ""} onClick={() => setTool("erase")}><i className="eraser-swatch" />Eraser</button>{activeField && <label className="light-suboption"><span>{activeField.label}</span><select value={String(values[activeField.key])} onChange={(event) => onValue(activeField.key, event.target.value)}>{activeField.options?.map((option) => <option key={option}>{option}</option>)}</select></label>}</aside><div><div className="light-grid" onPointerLeave={() => { painting.current = false; }}>{cells.map((cell, index) => { const area = definition.areas.find((item) => item.id === cell); return <button key={index} aria-label={`IC cell ${index + 1}: ${area?.label ?? "Unassigned"}`} style={area ? { background: area.color } : undefined} onPointerDown={(event: ReactPointerEvent) => { event.preventDefault(); painting.current = true; paint(index); }} onPointerEnter={() => painting.current && paint(index)} onPointerUp={() => { painting.current = false; }} />; })}</div><p className="grid-help">12 × 8 IC canvas · drag to paint · same-type blobs use edge adjacency</p></div></div>;
}

export function LightIcDesigner({ type, onSave, onExit }: { type: "RAM" | "SSD" | "NIC"; onSave: SaveHandler; onExit: ExitHandler }) {
  const definition = LIGHT_IC[type];
  const [step, setStep] = useState(0);
  const [cells, setCells] = useState<Array<string | null>>(() => Array(96).fill(null));
  const [values, setValues] = useState(() => initialValues(definition.fields));
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const packageFields = definition.fields.filter((field) => !["capacitor", "cellType"].includes(field.key));
  const counts = Object.fromEntries(definition.areas.map((area) => [area.label, cells.filter((cell) => cell === area.id).length]));
  const stats = { ...counts, ...values, "IC utilization": `${Math.round((cells.filter(Boolean).length / cells.length) * 100)}%` };
  const compatibility = type === "NIC" ? { busInterface: values.bus as "PCIe x1" | "PCIe x4" } : {};
  const save = () => { onSave(createSavedComponent(type, name, stats, compatibility, { cells, values })); setSaved(true); };
  return <main className="designer-page"><DesignerHeader type={type} subtitle="LIGHT IC + PACKAGE FLOW" /><MiniStepper labels={["IC", "Package", "Finalize"]} step={step} onStep={setStep} /><div className="workflow-body">{step === 0 && <div className="workflow-narrow"><WorkflowTitle eyebrow="STEP 01 / INTEGRATED CIRCUIT" title={`Draw the ${type} die`} copy="This smaller IC canvas focuses on area allocation without the CPU's cache or starvation rules." /><LightGrid type={type} cells={cells} values={values} onValue={(key, value) => { setValues((current) => ({ ...current, [key]: value })); setSaved(false); }} setCells={(update) => { setCells(update); setSaved(false); }} /><div className="workflow-actions"><button className="button primary" onClick={() => setStep(1)}>Configure package →</button></div></div>}{step === 1 && <div className="workflow-narrow"><WorkflowTitle eyebrow="STEP 02 / PACKAGE" title="Configure the finished component" copy="Choose the external package and operating characteristics that complete this design." /><div className="config-grid">{packageFields.map((field) => <FieldControl key={field.key} field={field} value={values[field.key]} onChange={(value) => { setValues((current) => ({ ...current, [field.key]: value })); setSaved(false); }} />)}</div><div className="workflow-actions split"><button className="button ghost" onClick={() => setStep(0)}>← IC</button><button className="button primary" onClick={() => setStep(2)}>Review →</button></div></div>}{step === 2 && <FinalPanel type={type} name={name} onName={(value) => { setName(value); setSaved(false); }} stats={stats} onBack={() => setStep(1)} onSave={save} onExit={onExit} saved={saved} />}</div></main>;
}

export function MotherboardDesigner({ onSave, onExit }: { onSave: SaveHandler; onExit: ExitHandler }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [formFactor, setFormFactor] = useState<"Micro-ATX" | "ATX" | "E-ATX">("ATX");
  const [socket, setSocket] = useState<"LGA" | "PGA" | "BGA">("LGA");
  const [ramSlots, setRamSlots] = useState(4);
  const [slots, setSlots] = useState<Array<"PCIe x1" | "PCIe x4" | "PCIe x8" | "PCIe x16">>(["PCIe x16", "PCIe x4", "PCIe x1"]);
  const [vrm, setVrm] = useState("Mainstream");
  const [chipset, setChipset] = useState("Mainstream");
  const [bridges, setBridges] = useState(false);
  const stats = { "Form factor": formFactor, "CPU socket": socket, "RAM slots": ramSlots, "Expansion slots": slots.length, "Slot types": slots.join(", "), "VRM quality": vrm, "Chipset tier": chipset, "Northbridge / Southbridge": bridges };
  const save = () => { onSave(createSavedComponent("Motherboard", name, stats, { cpuSocket: socket, motherboardFormFactor: formFactor, expansionSlots: slots })); setSaved(true); };
  const dirty = () => setSaved(false);
  return <main className="designer-page"><DesignerHeader type="Motherboard" subtitle="PLATFORM COMPATIBILITY ANCHOR" /><MiniStepper labels={["Configure", "Finalize"]} step={step} onStep={setStep} /><div className="workflow-body">{step === 0 ? <div className="workflow-narrow"><WorkflowTitle eyebrow="STEP 01 / PLATFORM" title="Lay out the motherboard specification" copy="Socket, board size, and physical PCIe slots become the compatibility keys used by the Rig Builder." /><div className="config-grid"><FieldControl field={{ key: "ff", label: "Form factor", type: "select", options: ["Micro-ATX", "ATX", "E-ATX"], defaultValue: "ATX" }} value={formFactor} onChange={(value) => { setFormFactor(value as typeof formFactor); dirty(); }} /><FieldControl field={{ key: "socket", label: "CPU socket", type: "select", options: ["LGA", "PGA", "BGA"], defaultValue: "LGA" }} value={socket} onChange={(value) => { setSocket(value as typeof socket); dirty(); }} /><FieldControl field={{ key: "ram", label: "RAM slot count", type: "range", min: 1, max: 8, defaultValue: 4 }} value={ramSlots} onChange={(value) => { setRamSlots(Number(value)); dirty(); }} /><FieldControl field={{ key: "vrm", label: "VRM quality", type: "select", options: ["Budget", "Mainstream", "Enthusiast"], defaultValue: "Mainstream" }} value={vrm} onChange={(value) => { setVrm(String(value)); dirty(); }} /><FieldControl field={{ key: "chipset", label: "Chipset tier", type: "select", options: ["Budget", "Mainstream", "Enthusiast"], defaultValue: "Mainstream" }} value={chipset} onChange={(value) => { setChipset(String(value)); dirty(); }} /><FieldControl field={{ key: "bridges", label: "Northbridge / Southbridge", type: "toggle", defaultValue: false }} value={bridges} onChange={(value) => { setBridges(Boolean(value)); dirty(); }} /></div><section className="slot-config"><div className="slot-config-head"><div><p className="panel-label">EXPANSION SLOT BANK</p><h3>{slots.length} physical slots</h3></div><div><button onClick={() => slots.length > 1 && setSlots((current) => current.slice(0, -1))}>−</button><button onClick={() => slots.length < 7 && setSlots((current) => [...current, "PCIe x1"])}>+</button></div></div>{slots.map((slot, index) => <label key={index}><span>SLOT {String(index + 1).padStart(2, "0")}</span><select value={slot} onChange={(event) => { setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value as typeof slot : item)); dirty(); }}><option>PCIe x1</option><option>PCIe x4</option><option>PCIe x8</option><option>PCIe x16</option></select></label>)}</section><div className="workflow-actions"><button className="button primary" onClick={() => setStep(1)}>Review motherboard →</button></div></div> : <FinalPanel type="Motherboard" name={name} onName={(value) => { setName(value); dirty(); }} stats={stats} onBack={() => setStep(0)} onSave={save} onExit={onExit} saved={saved} />}</div></main>;
}

function RadarPlot({ analysis, compact = false }: { analysis: ExpansionAnalysis; compact?: boolean }) {
  const size = compact ? 240 : 320;
  const center = size / 2;
  const radius = size * 0.34;
  const max = Math.max(1, ...Object.values(analysis.radar));
  const points = PROBLEM_AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + (index / PROBLEM_AXES.length) * Math.PI * 2;
    const scaled = (analysis.radar[axis] / max) * radius;
    return `${center + Math.cos(angle) * scaled},${center + Math.sin(angle) * scaled}`;
  }).join(" ");
  const ring = (ratio: number) => PROBLEM_AXES.map((_, index) => { const angle = -Math.PI / 2 + (index / PROBLEM_AXES.length) * Math.PI * 2; return `${center + Math.cos(angle) * radius * ratio},${center + Math.sin(angle) * radius * ratio}`; }).join(" ");
  return <figure className={`radar-figure ${compact ? "compact" : ""}`}><svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Eight-axis problem structure affinity radar chart">{[.25, .5, .75, 1].map((ratio) => <polygon key={ratio} points={ring(ratio)} className="radar-ring" />)}{PROBLEM_AXES.map((axis, index) => { const angle = -Math.PI / 2 + (index / PROBLEM_AXES.length) * Math.PI * 2; const x = center + Math.cos(angle) * radius; const y = center + Math.sin(angle) * radius; return <line key={axis} x1={center} y1={center} x2={x} y2={y} className="radar-axis" />; })}<polygon points={points} className="radar-shape" />{PROBLEM_AXES.map((axis, index) => { const angle = -Math.PI / 2 + (index / PROBLEM_AXES.length) * Math.PI * 2; const x = center + Math.cos(angle) * radius * 1.22; const y = center + Math.sin(angle) * radius * 1.22; return <text key={axis} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{axis.split(" / ")[0]}</text>; })}</svg><figcaption><span>PROBLEM STRUCTURE AFFINITY</span><strong>Specialists spike; generalists spread</strong></figcaption></figure>;
}

function ExpansionGrid({ width, height, cells, setCells, analysis }: { width: number; height: number; cells: Array<ExpansionCell | null>; setCells: React.Dispatch<React.SetStateAction<Array<ExpansionCell | null>>>; analysis: ExpansionAnalysis }) {
  const [tool, setTool] = useState<ExpansionAreaType | "erase">("alu");
  const [quality, setQuality] = useState(2);
  const painting = useRef(false);
  const paint = (index: number) => setCells((current) => { const next = [...current]; if (tool === "erase") next[index] = null; else { next[index] = { type: tool, quality }; const blob = findExpansionBlobs(next, width, height, tool).find((item) => item.cells.includes(index)); blob?.cells.forEach((cell) => { next[cell] = { type: tool, quality }; }); } return next; });
  const style = { "--die-columns": width, "--die-ratio": `${width} / ${height}`, "--die-max-width": `${width * 28}px`, "--die-min-width": `${width * 17}px` } as CSSProperties;
  return <div className="expansion-editor"><aside className="expansion-palette"><p className="panel-label">16 AREA TYPES</p><div>{(Object.keys(EXPANSION_META) as ExpansionAreaType[]).map((type) => <button key={type} className={tool === type ? "active" : ""} onClick={() => setTool(type)}><i style={{ background: EXPANSION_META[type].color }} /><span><strong>{EXPANSION_META[type].label}</strong><small>{analysis.counts[type]} CELLS</small></span></button>)}<button className={tool === "erase" ? "active" : ""} onClick={() => setTool("erase")}><i className="eraser-swatch" /><span><strong>Eraser</strong><small>CLEAR</small></span></button></div></aside><section className="expansion-canvas"><div className="die-scroll"><div className="die-frame"><div className="die-grid" style={style} onPointerLeave={() => { painting.current = false; }}>{cells.map((cell, index) => <button key={index} className={cell ? "painted" : ""} style={cell ? { "--cell-color": EXPANSION_META[cell.type].color } as CSSProperties : undefined} aria-label={`Cell ${index + 1}: ${cell ? EXPANSION_META[cell.type].label : "Unassigned"}`} onPointerDown={(event) => { event.preventDefault(); painting.current = true; paint(index); }} onPointerEnter={() => painting.current && paint(index)} onPointerUp={() => { painting.current = false; }}>{cell && <span>{EXPANSION_META[cell.type].short}</span>}</button>)}</div></div></div>{tool !== "erase" && <label className="quality-control"><span><strong>{EXPANSION_META[tool].label}</strong> quality / density</span><input type="range" min="1" max="3" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /><output>LEVEL {quality}</output></label>}</section><aside className="expansion-telemetry"><div className="primary-stats"><div><span>COMPUTE BLOBS</span><strong>{analysis.compute.length}</strong><small>{analysis.compute.filter((unit) => unit.starved).length} STARVED</small></div><div><span>HEAT</span><strong>{Math.round(analysis.heat)}</strong><small>THERMAL UNITS</small></div><div><span>I/O</span><strong>{analysis.ioThroughput}</strong><small>LINK UNITS</small></div><div><span>UTILIZATION</span><strong>{Math.round((analysis.usedPixels / cells.length) * 100)}%</strong><small>{analysis.usedPixels} CELLS</small></div></div><RadarPlot analysis={analysis} compact />{analysis.warnings.map((warning) => <div className="mini-warning" key={warning}>! {warning}</div>)}</aside></div>;
}

export function ExpansionCardDesigner({ onSave, onExit }: { onSave: SaveHandler; onExit: ExitHandler }) {
  const labels = ["Die", "Bus Interface", "Size", "Cooling Shroud", "Finalize"];
  const [step, setStep] = useState(0);
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(18);
  const [cells, setCells] = useState<Array<ExpansionCell | null>>(() => Array(16 * 18).fill(null));
  const [bus, setBus] = useState<"PCIe x1" | "PCIe x4" | "PCIe x8" | "PCIe x16">("PCIe x16");
  const [size, setSize] = useState("Standard (Full-Height)");
  const [cooling, setCooling] = useState("Dual Fan");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const analysis = useMemo(() => analyzeExpansionCard(cells, width, height), [cells, width, height]);
  const resize = (nextWidth: number, nextHeight: number) => { setWidth(nextWidth); setHeight(nextHeight); setCells(Array(nextWidth * nextHeight).fill(null)); setSaved(false); };
  const radarValues = PROBLEM_AXES.map((axis) => Math.round(analysis.radar[axis] * 10) / 10);
  const stats = { "Compute blobs": analysis.compute.length, Heat: Math.round(analysis.heat * 10) / 10, "I/O throughput": analysis.ioThroughput, "L2 cache": Math.round(analysis.totalL2 * 10) / 10, "L3 cache": Math.round(analysis.totalL3 * 10) / 10, "Bus interface": bus, "Card size": size, "Cooling shroud": cooling, "Radar values": radarValues };
  const save = () => { onSave(createSavedComponent("Expansion Card", name, stats, { busInterface: bus }, { width, height, cells, bus, size, cooling })); setSaved(true); };
  const options = step === 1 ? ["PCIe x1", "PCIe x4", "PCIe x8", "PCIe x16"] : step === 2 ? ["Low-Profile", "Standard (Full-Height)", "Full-Length"] : ["Passive", "Single Fan", "Dual Fan", "Blower-Style", "Triple-Slot"];
  return <main className="designer-page"><DesignerHeader type="Expansion Card" subtitle="HETEROGENEOUS COMPUTE FLOORPLANNER" /><MiniStepper labels={labels} step={step} onStep={setStep} /><div className="workflow-body">{step === 0 && <div className="editor-shell"><div className="editor-topline"><div><p className="eyebrow">STEP 01 / HMA DIE</p><h2>{width} × {height} mm accelerator canvas</h2></div><div className="inline-dimensions"><label>W <input type="number" min="5" max="25" value={width} onChange={(event) => resize(Math.max(5, Math.min(25, Number(event.target.value))), height)} /></label><label>H <input type="number" min="5" max="35" value={height} onChange={(event) => resize(width, Math.max(5, Math.min(35, Number(event.target.value))))} /></label></div></div><ExpansionGrid width={width} height={height} cells={cells} setCells={(update) => { setCells(update); setSaved(false); }} analysis={analysis} /><div className="workflow-actions editor-actions"><span>No mandatory area: an empty or specialist-only card is valid.</span><button className="button primary" onClick={() => setStep(1)}>Choose bus interface →</button></div></div>}{step >= 1 && step <= 3 && <div className="workflow-narrow"><WorkflowTitle eyebrow={`STEP 0${step + 1} / CARD ASSEMBLY`} title={labels[step]} copy={step === 1 ? "Lane width controls motherboard slot compatibility." : step === 2 ? "Choose the physical board envelope." : "Choose the cooler arrangement attached to the card."} /><div className="choice-stack">{options.map((option) => { const selected = step === 1 ? bus === option : step === 2 ? size === option : cooling === option; return <button key={option} className={`choice-card ${selected ? "selected" : ""}`} onClick={() => { if (step === 1) setBus(option as typeof bus); else if (step === 2) setSize(option); else setCooling(option); setSaved(false); }}><span className="choice-radio">{selected ? "●" : "○"}</span><span className="choice-code">{option.replace(/[^A-Z0-9]/g, "").slice(0, 3)}</span><span className="choice-copy"><strong>{option}</strong><span>{step === 1 ? "Physical PCIe lane requirement" : step === 2 ? "Card form-factor envelope" : "Thermal shroud configuration"}</span></span></button>; })}</div><div className="workflow-actions split"><button className="button ghost" onClick={() => setStep(step - 1)}>← Back</button><button className="button primary" onClick={() => setStep(step + 1)}>{step === 3 ? "Review card →" : "Continue →"}</button></div></div>}{step === 4 && <div className="finalize-shell"><WorkflowTitle eyebrow="STEP 05 / DESIGN REVIEW" title={name || "Unnamed Expansion Card"} copy="The radar preserves specialist spikes and generalist spread without averaging the eight problem structures together." /><div className="expansion-final-grid"><section className="final-main"><div className="name-field"><label htmlFor="exp-name">NAME THIS PART</label><input id="exp-name" maxLength={36} value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} placeholder="Enter card designation…" /><small>{name.length}/36</small></div><div className="option-summary-grid">{Object.entries(stats).filter(([key]) => key !== "Radar values").map(([label, value]) => <div key={label}><span>{label}</span><strong>{String(value)}</strong></div>)}</div></section><RadarPlot analysis={analysis} /></div><div className="final-actions"><button className="button ghost" onClick={() => setStep(0)}>← Keep Working</button><div><button className="button secondary" disabled={!name.trim() || saved} onClick={save}>{saved ? "Saved" : "Save Component"}</button><button className="button primary exit-button" onClick={onExit}>Exit to Hub</button></div></div></div>}</div></main>;
}

export function RosterDesigner({ type, onSave, onExit }: { type: ComponentType; onSave: SaveHandler; onExit: ExitHandler }) {
  if (type === "Expansion Card") return <ExpansionCardDesigner onSave={onSave} onExit={onExit} />;
  if (type === "RAM" || type === "SSD" || type === "NIC") return <LightIcDesigner type={type} onSave={onSave} onExit={onExit} />;
  if (type === "Motherboard") return <MotherboardDesigner onSave={onSave} onExit={onExit} />;
  return <SimpleComponentDesigner type={type} onSave={onSave} onExit={onExit} />;
}
