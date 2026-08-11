"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AREA_META,
  DEFAULT_SETTINGS,
  analyzeChip,
  blobAt,
  formatNumber,
  type AreaType,
  type Cell,
  type CellSettings,
  type ChipAnalysis,
  type Tool,
} from "../lib/chip-analysis";

type Screen = "hub" | "components" | "cpu" | "placeholder";
type DieView = "choose" | "saved" | "size" | "grid";

type ComponentOption = {
  name: string;
  code: string;
  description: string;
  note: string;
  cpu?: boolean;
};

const COMPONENTS: ComponentOption[] = [
  {
    name: "CPU",
    code: "CPU",
    description: "General-purpose compute package",
    note: "Complete die-to-package workflow",
    cpu: true,
  },
  {
    name: "Expansion Card",
    code: "EXP",
    description: "Specialized accelerator or controller",
    note: "Die → Layout → Size → Heat Spreader; future 8-axis problem-structure readout",
  },
  {
    name: "RAM",
    code: "MEM",
    description: "DIMM and DRAM assembly",
    note: "DRAM dies, generation, chip count, rank, and ECC",
  },
  {
    name: "Storage",
    code: "STR",
    description: "Persistent data systems",
    note: "Choose SSD, HDD, holographic, DNA, or another storage type first",
  },
  {
    name: "Motherboard",
    code: "MB",
    description: "Board-level component integration",
    note: "Configuration-driven design flow; no silicon floorplan",
  },
  {
    name: "Power Supply",
    code: "PSU",
    description: "Power conversion and distribution",
    note: "Configuration-driven design flow",
  },
  {
    name: "Cooling / Fans",
    code: "THM",
    description: "Thermal transport and airflow",
    note: "Configuration-driven design flow",
  },
  {
    name: "Cases",
    code: "CAS",
    description: "Chassis and environmental enclosure",
    note: "Configuration-driven design flow",
  },
  {
    name: "Units / Racks",
    code: "RCK",
    description: "Multi-machine deployment hardware",
    note: "Configuration-driven design flow",
  },
  {
    name: "Network",
    code: "NET",
    description: "NIC, switchboard, router, and gateway",
    note: "Automatically routes to the correct die- or configuration-based workflow",
  },
  {
    name: "Exotic Compute",
    code: "XTC",
    description: "Quantum, wetware, chemical, and biological systems",
    note: "Uses specialized primitives rather than the silicon pixel grid",
  },
];

const STEPS = ["Die", "Layout", "Size", "Heat Spreader", "Finalize"];

const PACKAGE_LAYOUTS = [
  {
    id: "LGA",
    name: "Land Grid Array",
    description: "Flat contacts on the CPU meet pins housed safely in the socket.",
    tag: "Socket pins",
  },
  {
    id: "PGA",
    name: "Pin Grid Array",
    description: "The CPU carries its own contact pins and drops into a socket grid.",
    tag: "Chip pins",
  },
  {
    id: "BGA",
    name: "Ball Grid Array",
    description: "Solder balls permanently mount the package directly to its board.",
    tag: "Soldered",
  },
];

const PACKAGE_SIZES = [
  {
    id: "Compact",
    dimensions: "34 × 34 mm",
    description: "Tight package envelope for dense systems and constrained cooling.",
  },
  {
    id: "Standard",
    dimensions: "40 × 40 mm",
    description: "Balanced package area with conventional mounting and heat-spreader clearance.",
  },
  {
    id: "Large",
    dimensions: "52 × 52 mm",
    description: "More routing and thermal headroom at the cost of board space.",
  },
];

const MATERIALS = ["Aluminum", "Copper", "Vapor Chamber"];
const INTERFACES = [
  {
    id: "Thermal Paste",
    description: "Low-cost and serviceable, with moderate heat transfer.",
  },
  {
    id: "Solder",
    description: "Better thermal transfer with higher manufacturing cost.",
  },
  {
    id: "Direct-Die",
    description: "No spreader; highest transfer efficiency and highest assembly risk.",
  },
];

const initialToolSettings = () =>
  Object.fromEntries(
    (Object.keys(DEFAULT_SETTINGS) as AreaType[]).map((type) => [
      type,
      { ...DEFAULT_SETTINGS[type] },
    ]),
  ) as Record<AreaType, CellSettings>;

function TopBar({
  screen,
  onHome,
  onComponents,
}: {
  screen: Screen;
  onHome: () => void;
  onComponents: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="Return to Design and Fabrication hub">
        <span className="brand-mark">R</span>
        <span>
          <strong>RIGS</strong>
          <small>Hardware Engineering</small>
        </span>
      </button>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <button onClick={onHome}>Design &amp; Fabrication</button>
        {screen !== "hub" && <span>/</span>}
        {(screen === "components" || screen === "cpu" || screen === "placeholder") && (
          <button onClick={onComponents}>Design New Component</button>
        )}
        {screen === "cpu" && <span>/ CPU</span>}
      </nav>
      <div className="session-chip">
        <span className="status-light" />
        SESSION / UNSAVED
      </div>
    </header>
  );
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function Hub({ onComponents, onPlaceholder }: { onComponents: () => void; onPlaceholder: (title: string, note: string) => void }) {
  return (
    <main className="page-shell hub-page">
      <SectionHeading
        eyebrow="SYSTEM 04 / ENGINEERING"
        title="Design & Fabrication"
        copy="Choose the work you want to perform. Component-specific tools and manufacturing systems are routed from here."
      />
      <section className="hub-grid" aria-label="Design and fabrication destinations">
        <button className="hub-card primary-card" onClick={onComponents}>
          <span className="card-index">01</span>
          <span className="hub-icon">⌁</span>
          <span className="hub-card-content">
            <strong>Design New Component</strong>
            <span>Start from the part you need; the correct design workflow opens automatically.</span>
          </span>
          <span className="card-arrow">→</span>
        </button>
        <button
          className="hub-card"
          onClick={() => onPlaceholder("Saved Dies", "A reusable library of previously designed silicon dies will live here. No dies have been saved in this session.")}
        >
          <span className="card-index">02</span>
          <span className="hub-icon">▦</span>
          <span className="hub-card-content">
            <strong>Saved Dies</strong>
            <span>Inspect and reuse validated monolithic die floorplans.</span>
          </span>
          <span className="card-arrow">→</span>
        </button>
        <button
          className="hub-card"
          onClick={() => onPlaceholder("Production", "Manufacturing equipment, lithography machines, process capacity, and fabrication queues will be managed here.")}
        >
          <span className="card-index">03</span>
          <span className="hub-icon">⌂</span>
          <span className="hub-card-content">
            <strong>Production</strong>
            <span>Build and operate the fabrication line that turns designs into hardware.</span>
          </span>
          <span className="card-arrow">→</span>
        </button>
      </section>
      <footer className="system-footer">
        <span>ENGINEERING WORKSPACE</span>
        <span>MONOLITHIC PROCESS AVAILABLE</span>
        <span className="footer-ready">● READY</span>
      </footer>
    </main>
  );
}

function ComponentLibrary({
  onCpu,
  onPlaceholder,
}: {
  onCpu: () => void;
  onPlaceholder: (title: string, note: string) => void;
}) {
  return (
    <main className="page-shell">
      <SectionHeading
        eyebrow="NEW DESIGN / SELECT TARGET"
        title="What are you building?"
        copy="Pick the finished component first. RIGS will route you through only the tools and sub-components it needs."
      />
      <section className="component-grid" aria-label="Component types">
        {COMPONENTS.map((component, index) => (
          <button
            key={component.name}
            className={`component-card ${component.cpu ? "available" : ""}`}
            onClick={() =>
              component.cpu
                ? onCpu()
                : onPlaceholder(component.name, `This is where the design page for ${component.name} lives. ${component.note}.`)
            }
          >
            <span className="component-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="component-code">{component.code}</span>
            <span className="component-copy">
              <strong>{component.name}</strong>
              <small>{component.description}</small>
              <em>{component.cpu ? "PROTOTYPE ACTIVE" : "ROUTE PLACEHOLDER"}</em>
            </span>
            <span className="component-arrow">↗</span>
          </button>
        ))}
      </section>
    </main>
  );
}

function Placeholder({ title, note, onBack }: { title: string; note: string; onBack: () => void }) {
  return (
    <main className="page-shell placeholder-page">
      <div className="placeholder-panel">
        <div className="placeholder-code">ROUTE / {title.toUpperCase()}</div>
        <div className="placeholder-symbol">◇</div>
        <h1>{title}</h1>
        <p>{note}</p>
        <div className="placeholder-status"><span /> DESIGN MODULE NOT INSTALLED IN THIS PROTOTYPE</div>
        <button className="button primary" onClick={onBack}>← Back to components</button>
      </div>
    </main>
  );
}

function Stepper({ step, highestStep, onStep }: { step: number; highestStep: number; onStep: (step: number) => void }) {
  return (
    <ol className="stepper" aria-label="CPU design progress">
      {STEPS.map((label, index) => {
        const available = index <= highestStep;
        return (
          <li key={label} className={index === step ? "current" : index < step ? "complete" : ""}>
            <button disabled={!available} onClick={() => available && onStep(index)} aria-current={index === step ? "step" : undefined}>
              <span>{index < step ? "✓" : String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ChoiceCard({
  selected,
  code,
  title,
  description,
  meta,
  onClick,
}: {
  selected?: boolean;
  code: string;
  title: string;
  description: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button className={`choice-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <span className="choice-radio">{selected ? "●" : "○"}</span>
      <span className="choice-code">{code}</span>
      <span className="choice-copy">
        <strong>{title}</strong>
        <span>{description}</span>
        {meta && <em>{meta}</em>}
      </span>
    </button>
  );
}

function DieChoice({ onSaved, onNew }: { onSaved: () => void; onNew: () => void }) {
  return (
    <div className="workflow-narrow">
      <div className="workflow-title">
        <p className="eyebrow">STEP 01 / SILICON</p>
        <h2>Select a die source</h2>
        <p>A CPU package begins with one monolithic silicon die. Reuse a proven design or floorplan a new one.</p>
      </div>
      <div className="large-choice-grid">
        <ChoiceCard code="LIB" title="Pick from Saved Dies" description="Select an existing die from your reusable design library." meta="0 AVAILABLE" onClick={onSaved} />
        <ChoiceCard code="NEW" title="Design New Die" description="Choose dimensions, draw the silicon floorplan, and validate connectivity." meta="FLOORPLANNING TOOL" onClick={onNew} />
      </div>
    </div>
  );
}

function SavedDieEmpty({ onBack, onNew }: { onBack: () => void; onNew: () => void }) {
  return (
    <div className="workflow-narrow">
      <div className="workflow-title">
        <p className="eyebrow">SAVED DIES / LIBRARY</p>
        <h2>No saved dies yet</h2>
        <p>Completed die designs will appear here once persistence is connected.</p>
      </div>
      <div className="empty-state">
        <span className="empty-grid">▦</span>
        <strong>LIBRARY EMPTY</strong>
        <p>This prototype keeps designs in memory for the current session only.</p>
      </div>
      <div className="workflow-actions split">
        <button className="button ghost" onClick={onBack}>← Die source</button>
        <button className="button primary" onClick={onNew}>Design a new die →</button>
      </div>
    </div>
  );
}

function DieSize({ width, height, onWidth, onHeight, onBack, onCreate }: { width: number; height: number; onWidth: (value: number) => void; onHeight: (value: number) => void; onBack: () => void; onCreate: () => void }) {
  return (
    <div className="workflow-narrow">
      <div className="workflow-title">
        <p className="eyebrow">DIE SETUP / PHYSICAL ENVELOPE</p>
        <h2>Set silicon dimensions</h2>
        <p>Each millimeter becomes one editable floorplan cell. Creating this die resets any existing painted layout.</p>
      </div>
      <div className="dimension-panel">
        <div className="dimension-visual" style={{ aspectRatio: `${width} / ${height}` }}>
          <span>{width} × {height}</span>
          <small>{width * height} mm² / CELLS</small>
        </div>
        <div className="dimension-controls">
          <label>
            <span><strong>Width</strong><output>{width} mm</output></span>
            <input type="range" min="5" max="25" step="1" value={width} onChange={(event) => onWidth(Number(event.target.value))} />
            <small><span>5 mm</span><span>25 mm</span></small>
          </label>
          <label>
            <span><strong>Height</strong><output>{height} mm</output></span>
            <input type="range" min="5" max="35" step="1" value={height} onChange={(event) => onHeight(Number(event.target.value))} />
            <small><span>5 mm</span><span>35 mm</span></small>
          </label>
          <div className="dimension-readout">
            <span>GRID RESOLUTION</span>
            <strong>{width} × {height}</strong>
            <span>MAX EDITABLE CELLS</span>
            <strong>{width * height}</strong>
          </div>
        </div>
      </div>
      <div className="workflow-actions split">
        <button className="button ghost" onClick={onBack}>← Die source</button>
        <button className="button primary" onClick={onCreate}>Create floorplan →</button>
      </div>
    </div>
  );
}

function ToolOptions({
  tool,
  settings,
  onChange,
}: {
  tool: Tool;
  settings: Record<AreaType, CellSettings>;
  onChange: (patch: CellSettings) => void;
}) {
  if (tool === "erase") {
    return (
      <div className="tool-options compact-options">
        <p className="panel-label">ACTIVE TOOL</p>
        <h3>Eraser</h3>
        <p>Drag across occupied cells to return them to unassigned silicon.</p>
      </div>
    );
  }
  const active = settings[tool];
  return (
    <div className="tool-options">
      <p className="panel-label">CONSTRUCTION OPTIONS</p>
      <div className="option-heading">
        <span style={{ background: AREA_META[tool].color }} />
        <div><h3>{AREA_META[tool].label}</h3><p>{AREA_META[tool].description}</p></div>
      </div>
      {tool === "alu" && (
        <>
          <label>
            <span>Transistor type</span>
            <select value={active.transistor} onChange={(event) => onChange({ transistor: event.target.value as CellSettings["transistor"] })}>
              <option>Planar</option><option>FinFET</option><option>GAA</option>
            </select>
          </label>
          <label>
            <span>Core tier</span>
            <div className="segmented">
              {(["Performance", "Efficiency"] as const).map((tier) => (
                <button key={tier} className={active.tier === tier ? "active" : ""} onClick={() => onChange({ tier })}>{tier}</button>
              ))}
            </div>
          </label>
          <label>
            <span>Power delivery location</span>
            <select value={active.deliveryLocation} onChange={(event) => onChange({ deliveryLocation: event.target.value as CellSettings["deliveryLocation"] })}>
              <option>Front-side</option><option>Backside</option>
            </select>
          </label>
        </>
      )}
      {(tool === "l2" || tool === "l3") && (
        <RangeOption label="Cell density" value={active.density ?? 2} low="Sparse" high="Dense" onChange={(density) => onChange({ density })} />
      )}
      {tool === "power" && (
        <RangeOption label="Delivery quality" value={active.quality ?? 2} low="Basic" high="Premium" onChange={(quality) => onChange({ quality })} />
      )}
      {tool === "io" && (
        <label>
          <span>Interface type</span>
          <select value={active.interfaceType} onChange={(event) => onChange({ interfaceType: event.target.value as CellSettings["interfaceType"] })}>
            <option>Standard</option><option>High-Bandwidth</option>
          </select>
        </label>
      )}
      {tool === "igpu" && (
        <RangeOption label="Compute quality" value={active.quality ?? 2} low="Economy" high="High density" onChange={(quality) => onChange({ quality })} />
      )}
      {tool === "interconnect" && <div className="binary-note"><strong>BINARY PLUMBING</strong><span>Placement changes connections only. It does not create a bandwidth number.</span></div>}
      <p className="option-hint">New paint uses these settings. Select an existing same-type blob, then change an option to update the whole blob.</p>
    </div>
  );
}

function RangeOption({ label, value, low, high, onChange }: { label: string; value: number; low: string; high: string; onChange: (value: number) => void }) {
  return (
    <label>
      <span>{label}<output>Level {value}</output></span>
      <input type="range" min="1" max="3" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small><span>{low}</span><span>{high}</span></small>
    </label>
  );
}

function StatReadout({ analysis, totalCells }: { analysis: ChipAnalysis; totalCells: number }) {
  return (
    <aside className="stats-panel">
      <div className="stats-title">
        <div><p className="panel-label">LIVE ANALYSIS</p><h3>Die telemetry</h3></div>
        <span className="live-pill"><i /> LIVE</span>
      </div>
      <div className="primary-stats">
        <div><span>CORE COUNT</span><strong>{analysis.cores.length}</strong><small>PHYSICAL BLOBS</small></div>
        <div><span>DIE UTILIZATION</span><strong>{Math.round((analysis.usedPixels / totalCells) * 100)}%</strong><small>{analysis.usedPixels} / {totalCells} CELLS</small></div>
        <div><span>AGGREGATE HEAT</span><strong>{formatNumber(analysis.heat)}</strong><small>THERMAL UNITS</small></div>
        <div><span>I/O THROUGHPUT</span><strong>{formatNumber(analysis.ioThroughput, 0)}</strong><small>LINK UNITS</small></div>
      </div>
      <div className="cache-stats">
        <div><span>L2 CACHE</span><strong>{formatNumber(analysis.totalL2)} MB</strong><small>{formatNumber(analysis.linkedL2)} MB LINKED</small></div>
        <div><span>L3 CACHE</span><strong>{formatNumber(analysis.totalL3)} MB</strong><small>{formatNumber(analysis.linkedL3)} MB LINKED</small></div>
        {analysis.graphicsUnits.length > 0 && <div><span>GRAPHICS</span><strong>{formatNumber(analysis.graphicsUnits.reduce((sum, unit) => sum + unit.score, 0))}</strong><small>{analysis.graphicsUnits.length} SIMD {analysis.graphicsUnits.length === 1 ? "UNIT" : "UNITS"}</small></div>}
      </div>
      {analysis.cores.length > 0 && (
        <div className="core-list">
          <p className="panel-label">PER-CORE READOUT</p>
          {analysis.cores.map((core) => (
            <article key={core.id} className={core.starved ? "starved" : ""}>
              <div className="core-id"><span>C{String(core.id).padStart(2, "0")}</span><small>{core.tier === "Performance" ? "P-CORE" : "E-CORE"}</small></div>
              <div><strong>{formatNumber(core.clock, 2)} GHz</strong><small>{core.pixels} CELLS / {formatNumber(core.heat)} HEAT</small></div>
              <div className="core-cache"><span>L2 {formatNumber(core.l2)}</span><span>L3 {formatNumber(core.l3)}</span></div>
              <i className={core.starved ? "bad" : "good"}>{core.starved ? "STARVED" : "LINKED"}</i>
            </article>
          ))}
        </div>
      )}
      {analysis.warnings.length > 0 && (
        <div className="warning-list">
          <p className="panel-label">DESIGN FLAGS</p>
          {analysis.warnings.map((warning) => <div key={warning}><span>!</span><p>{warning}</p></div>)}
        </div>
      )}
    </aside>
  );
}

function DieEditor({
  width,
  height,
  cells,
  setCells,
  analysis,
  onResize,
  onContinue,
}: {
  width: number;
  height: number;
  cells: Array<Cell | null>;
  setCells: React.Dispatch<React.SetStateAction<Array<Cell | null>>>;
  analysis: ChipAnalysis;
  onResize: () => void;
  onContinue: () => void;
}) {
  const [tool, setTool] = useState<Tool>("alu");
  const [settings, setSettings] = useState<Record<AreaType, CellSettings>>(initialToolSettings);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const painting = useRef(false);

  useEffect(() => {
    const stopPainting = () => { painting.current = false; };
    window.addEventListener("pointerup", stopPainting);
    return () => window.removeEventListener("pointerup", stopPainting);
  }, []);

  const paint = (index: number, selectExisting = false) => {
    const existing = cells[index];
    if (tool !== "erase" && existing?.type === tool) {
      setSelectedCell(index);
      if (selectExisting) {
        setSettings((previous) => ({
          ...previous,
          [tool]: { ...existing.settings },
        }));
      }
      return;
    }
    setSelectedCell(tool === "erase" ? null : index);
    setCells((previous) => {
      const next = [...previous];
      if (tool === "erase") {
        next[index] = null;
        return next;
      }
      const paintSettings = { ...settings[tool] };
      next[index] = { type: tool, settings: paintSettings };
      const connected = blobAt(next, width, height, index);
      connected?.cells.forEach((member) => {
        next[member] = { type: tool, settings: { ...paintSettings } };
      });
      return next;
    });
  };

  const changeToolSettings = (patch: CellSettings) => {
    if (tool === "erase") return;
    setSettings((previous) => ({
      ...previous,
      [tool]: { ...previous[tool], ...patch },
    }));
    if (selectedCell === null || cells[selectedCell]?.type !== tool) return;
    setCells((previous) => {
      const next = [...previous];
      const connected = blobAt(next, width, height, selectedCell);
      connected?.cells.forEach((member) => {
        const cell = next[member];
        if (cell) next[member] = { ...cell, settings: { ...cell.settings, ...patch } };
      });
      return next;
    });
  };

  const clearGrid = () => {
    setCells(Array(width * height).fill(null));
    setSelectedCell(null);
  };

  const gridStyle = {
    "--die-columns": width,
    "--die-ratio": `${width} / ${height}`,
    "--die-max-width": `${width * 30}px`,
    "--die-min-width": `${width * 18}px`,
  } as CSSProperties;

  return (
    <div className="editor-shell">
      <div className="editor-topline">
        <div>
          <p className="eyebrow">IC FLOORPLANNER / MONOLITHIC DIE</p>
          <h2>{width} × {height} mm silicon canvas</h2>
        </div>
        <div className="editor-top-actions">
          <button className="text-button" onClick={onResize}>Resize / reset</button>
          <button className="text-button danger" onClick={clearGrid}>Clear grid</button>
        </div>
      </div>
      <div className="editor-layout">
        <aside className="palette-panel">
          <p className="panel-label">AREA PALETTE</p>
          <div className="tool-list">
            {(Object.keys(AREA_META) as AreaType[]).map((type, index) => (
              <button key={type} className={tool === type ? "active" : ""} onClick={() => { setTool(type); setSelectedCell(null); }}>
                <span className="tool-key">{index + 1}</span>
                <i style={{ background: AREA_META[type].color }} />
                <span><strong>{AREA_META[type].label}</strong><small>{analysis.counts[type]} CELLS</small></span>
              </button>
            ))}
            <button className={tool === "erase" ? "active eraser" : "eraser"} onClick={() => { setTool("erase"); setSelectedCell(null); }}>
              <span className="tool-key">8</span><i>×</i><span><strong>Eraser</strong><small>CLEAR CELLS</small></span>
            </button>
          </div>
          <div className="adjacency-key">
            <p className="panel-label">CONNECTION RULES</p>
            <div><span className="four-way">+</span><p><strong>Same type</strong>Edges join one blob</p></div>
            <div><span className="eight-way">✣</span><p><strong>Cross type</strong>Edges or corners connect</p></div>
          </div>
        </aside>
        <section className="canvas-column">
          <div className="canvas-ruler"><span>0 mm</span><span>X / {width} mm</span></div>
          <div className="die-scroll">
            <div className="die-frame">
              <div className="die-grid" style={gridStyle} onPointerLeave={() => { painting.current = false; }}>
                {cells.map((cell, index) => (
                  <button
                    key={index}
                    className={`${cell ? "painted" : ""} ${selectedCell === index ? "selected-cell" : ""}`}
                    style={cell ? ({ "--cell-color": AREA_META[cell.type].color } as CSSProperties) : undefined}
                    aria-label={`Cell ${index % width + 1}, ${Math.floor(index / width) + 1}: ${cell ? AREA_META[cell.type].label : "Unassigned"}`}
                    title={cell ? AREA_META[cell.type].label : "Unassigned silicon"}
                    onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                      event.preventDefault();
                      painting.current = true;
                      paint(index, true);
                    }}
                    onPointerEnter={() => painting.current && paint(index)}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    {cell && <span>{AREA_META[cell.type].short}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="canvas-caption">
            <span>1 CELL = 1 mm²</span>
            <span>DRAG TO PAINT</span>
            <span>DIAGONALS CONNECT DIFFERENT TYPES ONLY</span>
          </div>
          <ToolOptions tool={tool} settings={settings} onChange={changeToolSettings} />
        </section>
        <StatReadout analysis={analysis} totalCells={width * height} />
      </div>
      <div className="workflow-actions editor-actions">
        <span>{analysis.cores.length === 0 ? "Place at least one ALU Core to continue." : `${analysis.cores.length}-core floorplan ready for package design.`}</span>
        <button className="button primary" disabled={analysis.cores.length === 0} onClick={onContinue}>Continue to package layout →</button>
      </div>
    </div>
  );
}

function LayoutStep({ selected, onSelect, onBack, onNext }: { selected: string; onSelect: (value: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div className="workflow-narrow">
      <div className="workflow-title"><p className="eyebrow">STEP 02 / PACKAGE CONTACTS</p><h2>Choose a package layout</h2><p>This determines how the completed CPU makes electrical contact with its motherboard.</p></div>
      <div className="choice-stack">
        {PACKAGE_LAYOUTS.map((option) => <ChoiceCard key={option.id} selected={selected === option.id} code={option.id} title={option.name} description={option.description} meta={option.tag.toUpperCase()} onClick={() => onSelect(option.id)} />)}
      </div>
      <div className="workflow-actions split"><button className="button ghost" onClick={onBack}>← Die floorplan</button><button className="button primary" onClick={onNext}>Continue to package size →</button></div>
    </div>
  );
}

function SizeStep({ selected, onSelect, onBack, onNext }: { selected: string; onSelect: (value: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div className="workflow-narrow">
      <div className="workflow-title"><p className="eyebrow">STEP 03 / PHYSICAL PACKAGE</p><h2>Choose the assembled size</h2><p>The package surrounds the silicon die with contacts, substrate, and mechanical protection.</p></div>
      <div className="package-size-grid">
        {PACKAGE_SIZES.map((option) => (
          <button key={option.id} className={`size-card ${selected === option.id ? "selected" : ""}`} onClick={() => onSelect(option.id)}>
            <span className={`package-outline ${option.id.toLowerCase()}`}><i /></span>
            <span className="choice-radio">{selected === option.id ? "●" : "○"}</span>
            <strong>{option.id}</strong><em>{option.dimensions}</em><p>{option.description}</p>
          </button>
        ))}
      </div>
      <div className="workflow-actions split"><button className="button ghost" onClick={onBack}>← Package layout</button><button className="button primary" onClick={onNext}>Continue to heat spreader →</button></div>
    </div>
  );
}

function HeatSpreaderStep({ material, thermalInterface, onMaterial, onInterface, onBack, onNext }: { material: string; thermalInterface: string; onMaterial: (value: string) => void; onInterface: (value: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div className="workflow-narrow">
      <div className="workflow-title"><p className="eyebrow">STEP 04 / THERMAL ASSEMBLY</p><h2>Configure the heat spreader</h2><p>Choose the external thermal material and the interface between it and the silicon die.</p></div>
      <div className="thermal-layout">
        <div className="thermal-diagram">
          <div className="layer spreader"><span>{thermalInterface === "Direct-Die" ? "COOLER CONTACT" : `${material.toUpperCase()} SPREADER`}</span></div>
          {thermalInterface !== "Direct-Die" && <div className="layer interface"><span>{thermalInterface.toUpperCase()}</span></div>}
          <div className="layer silicon"><span>SILICON DIE</span></div>
          <div className="layer substrate"><span>PACKAGE SUBSTRATE</span></div>
        </div>
        <div className="thermal-controls">
          <label><span>Spreader material</span><select disabled={thermalInterface === "Direct-Die"} value={material} onChange={(event) => onMaterial(event.target.value)}>{MATERIALS.map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="interface-options"><span>Thermal interface</span>{INTERFACES.map((option) => <ChoiceCard key={option.id} selected={thermalInterface === option.id} code={option.id === "Thermal Paste" ? "PST" : option.id === "Solder" ? "SLD" : "DIR"} title={option.id} description={option.description} onClick={() => onInterface(option.id)} />)}</div>
        </div>
      </div>
      <div className="workflow-actions split"><button className="button ghost" onClick={onBack}>← Package size</button><button className="button primary" onClick={onNext}>Review finished CPU →</button></div>
    </div>
  );
}

function SummaryStats({ analysis }: { analysis: ChipAnalysis }) {
  const graphics = analysis.graphicsUnits.reduce((sum, unit) => sum + unit.score, 0);
  return (
    <div className="summary-stats">
      <div><span>CORES</span><strong>{analysis.cores.length}</strong><small>{analysis.cores.filter((core) => core.tier === "Performance").length}P / {analysis.cores.filter((core) => core.tier === "Efficiency").length}E</small></div>
      <div><span>CLOCKS</span><strong>{analysis.cores.length ? `${formatNumber(Math.min(...analysis.cores.map((core) => core.clock)), 2)}–${formatNumber(Math.max(...analysis.cores.map((core) => core.clock)), 2)}` : "—"}</strong><small>GHz RANGE</small></div>
      <div><span>L2 CACHE</span><strong>{formatNumber(analysis.totalL2)}</strong><small>MB TOTAL</small></div>
      <div><span>L3 CACHE</span><strong>{formatNumber(analysis.totalL3)}</strong><small>MB TOTAL</small></div>
      <div><span>HEAT</span><strong>{formatNumber(analysis.heat)}</strong><small>THERMAL UNITS</small></div>
      <div><span>I/O</span><strong>{formatNumber(analysis.ioThroughput, 0)}</strong><small>LINK UNITS</small></div>
      {graphics > 0 && <div><span>GRAPHICS</span><strong>{formatNumber(graphics)}</strong><small>SIMD SCORE</small></div>}
    </div>
  );
}

function FinalizeStep({ analysis, packageLayout, packageSize, material, thermalInterface, partName, onName, onBack, onKeepWorking, onExit }: { analysis: ChipAnalysis; packageLayout: string; packageSize: string; material: string; thermalInterface: string; partName: string; onName: (value: string) => void; onBack: () => void; onKeepWorking: () => void; onExit: () => void }) {
  return (
    <div className="finalize-shell">
      <div className="finalize-title"><p className="eyebrow">STEP 05 / DESIGN REVIEW</p><span className="review-status"><i /> FLOORPLAN COMPUTED</span><h2>{partName || "Unnamed CPU"}</h2><p>Review the current in-memory design. Placeholder formulas are shown honestly and update if you return to the floorplan.</p></div>
      <div className="finalize-grid">
        <section className="final-main">
          <div className="name-field"><label htmlFor="part-name">NAME THIS PART</label><input id="part-name" maxLength={36} value={partName} onChange={(event) => onName(event.target.value)} placeholder="Enter CPU designation…" /><small>{partName.length}/36 CHARACTERS</small></div>
          <SummaryStats analysis={analysis} />
          <div className="core-table">
            <div className="table-head"><span>CORE</span><span>TIER</span><span>AREA</span><span>CLOCK</span><span>LINK</span></div>
            {analysis.cores.map((core) => <div key={core.id}><span>C{String(core.id).padStart(2, "0")}</span><span>{core.tier}</span><span>{core.pixels} mm²</span><span>{formatNumber(core.clock, 2)} GHz</span><span className={core.starved ? "bad-text" : "good-text"}>{core.starved ? "STARVED" : "LINKED"}</span></div>)}
          </div>
        </section>
        <aside className="assembly-summary">
          <p className="panel-label">ASSEMBLY RECORD</p>
          <dl><div><dt>Die utilization</dt><dd>{analysis.usedPixels} cells</dd></div><div><dt>Package contacts</dt><dd>{packageLayout}</dd></div><div><dt>Package size</dt><dd>{packageSize}</dd></div><div><dt>Heat spreader</dt><dd>{thermalInterface === "Direct-Die" ? "None" : material}</dd></div><div><dt>Thermal interface</dt><dd>{thermalInterface}</dd></div></dl>
          {analysis.warnings.length > 0 ? <div className="final-warning"><strong>{analysis.warnings.length} DESIGN {analysis.warnings.length === 1 ? "FLAG" : "FLAGS"}</strong>{analysis.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : <div className="final-valid"><span>✓</span><p><strong>NO ACTIVE FLAGS</strong>All placed compute is connected.</p></div>}
        </aside>
      </div>
      <div className="final-actions"><button className="button ghost" onClick={onBack}>← Thermal assembly</button><div><button className="button secondary" disabled title="Persistence is outside this prototype">Save unavailable</button><button className="button secondary" onClick={onKeepWorking}>Keep Working</button><button className="button primary exit-button" onClick={onExit}>Exit to Hub</button></div></div>
    </div>
  );
}

function CpuDesigner({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [highestStep, setHighestStep] = useState(0);
  const [dieView, setDieView] = useState<DieView>("choose");
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(18);
  const [cells, setCells] = useState<Array<Cell | null>>([]);
  const [packageLayout, setPackageLayout] = useState("LGA");
  const [packageSize, setPackageSize] = useState("Standard");
  const [material, setMaterial] = useState("Copper");
  const [thermalInterface, setThermalInterface] = useState("Solder");
  const [partName, setPartName] = useState("");

  const analysis = useMemo(() => analyzeChip(cells, width, height), [cells, width, height]);
  const goForward = (target: number) => { setStep(target); setHighestStep((current) => Math.max(current, target)); };
  const createDie = () => { setCells(Array(width * height).fill(null)); setDieView("grid"); setHighestStep(0); };

  return (
    <main className="designer-page">
      <div className="designer-header"><div><p className="eyebrow">COMPONENT DESIGN / CPU</p><h1>Central Processing Unit</h1></div><span>DESIGN STATE: IN MEMORY</span></div>
      <Stepper step={step} highestStep={highestStep} onStep={(target) => { setStep(target); if (target === 0 && cells.length) setDieView("grid"); }} />
      <div className="workflow-body">
        {step === 0 && dieView === "choose" && <DieChoice onSaved={() => setDieView("saved")} onNew={() => setDieView("size")} />}
        {step === 0 && dieView === "saved" && <SavedDieEmpty onBack={() => setDieView("choose")} onNew={() => setDieView("size")} />}
        {step === 0 && dieView === "size" && <DieSize width={width} height={height} onWidth={setWidth} onHeight={setHeight} onBack={() => setDieView("choose")} onCreate={createDie} />}
        {step === 0 && dieView === "grid" && <DieEditor width={width} height={height} cells={cells} setCells={setCells} analysis={analysis} onResize={() => setDieView("size")} onContinue={() => goForward(1)} />}
        {step === 1 && <LayoutStep selected={packageLayout} onSelect={setPackageLayout} onBack={() => setStep(0)} onNext={() => goForward(2)} />}
        {step === 2 && <SizeStep selected={packageSize} onSelect={setPackageSize} onBack={() => setStep(1)} onNext={() => goForward(3)} />}
        {step === 3 && <HeatSpreaderStep material={material} thermalInterface={thermalInterface} onMaterial={setMaterial} onInterface={setThermalInterface} onBack={() => setStep(2)} onNext={() => goForward(4)} />}
        {step === 4 && <FinalizeStep analysis={analysis} packageLayout={packageLayout} packageSize={packageSize} material={material} thermalInterface={thermalInterface} partName={partName} onName={setPartName} onBack={() => setStep(3)} onKeepWorking={() => { setStep(0); setDieView("grid"); }} onExit={onExit} />}
      </div>
    </main>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [placeholder, setPlaceholder] = useState({ title: "", note: "" });
  const [designerKey, setDesignerKey] = useState(0);

  const openPlaceholder = (title: string, note: string) => { setPlaceholder({ title, note }); setScreen("placeholder"); };
  const exitDesigner = () => { setDesignerKey((value) => value + 1); setScreen("hub"); };

  return (
    <div className="app-frame">
      <TopBar screen={screen} onHome={() => setScreen("hub")} onComponents={() => setScreen("components")} />
      {screen === "hub" && <Hub onComponents={() => setScreen("components")} onPlaceholder={openPlaceholder} />}
      {screen === "components" && <ComponentLibrary onCpu={() => setScreen("cpu")} onPlaceholder={openPlaceholder} />}
      {screen === "placeholder" && <Placeholder title={placeholder.title} note={placeholder.note} onBack={() => setScreen("components")} />}
      {screen === "cpu" && <CpuDesigner key={designerKey} onExit={exitDesigner} />}
    </div>
  );
}
