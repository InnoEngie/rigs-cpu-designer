import type { ComponentType } from "../lib/component-model";

export type Field = { key: string; label: string; values: string[] };
export type DesignerConfig = { type: ComponentType; code: string; summary: string; fields: Field[]; icAreas?: string[] };
const f = (key: string, values: string[], label = key): Field => ({ key, label, values });

export const DESIGNERS: DesignerConfig[] = [
  { type: "Expansion Card", code: "EXP", summary: "Sixteen-area accelerator floorplan, PCIe interface, form factor, and cooling.", fields: [
    f("Bus Interface", ["PCIe x1", "PCIe x4", "PCIe x8", "PCIe x16"]), f("Card Size", ["Low-Profile", "Standard (Full-Height)", "Full-Length"]), f("Cooling Shroud", ["Passive", "Single Fan", "Dual Fan", "Blower-Style", "Triple-Slot"]),
  ], icAreas: ["Interconnect", "Power Delivery", "I/O", "L2 Cache", "L3 Cache", "ALU Cores", "SIMD Cores", "Systolic Array", "RT Cores", "Graph Streaming Processor", "FPGA Fabric", "Photonic Processor", "Vector Search Accelerator", "NPU", "Neuromorphic Processor", "Storage Controller"] },
  { type: "RAM", code: "MEM", summary: "A light DRAM IC plus its DIMM package.", fields: [
    f("Capacitor Type", ["MOS Cap", "Trench", "Stacked", "3D-Stacked"]), f("Rank", ["Single", "Dual", "Quad"]), f("DRAM Chips", ["4 (x16)", "8 (x8)", "16 (x4)"], "DRAM Chip Count"), f("ECC", ["Off", "On"]), f("Generation", ["DDR2", "DDR3", "DDR4", "DDR5"]), f("Form Factor", ["DIMM", "SO-DIMM"]), f("Heat Spreader", ["None", "Basic", "Enhanced"]),
  ], icAreas: ["Memory Cell Array", "I/O Interface"] },
  { type: "SSD", code: "SSD", summary: "NAND and controller silicon in a storage package.", fields: [
    f("Cell Type", ["SLC", "MLC", "TLC", "QLC", "PLC"], "NAND Cell Type"), f("DRAM Cache", ["No", "Yes"]), f("Interface", ["SATA", "PCIe Gen3", "PCIe Gen4", "PCIe Gen5"], "Interface / Generation"), f("Form Factor", ["2.5-inch", "M.2", "U.2", "Add-in-Card"]),
  ], icAreas: ["NAND Cell Array", "Controller"] },
  { type: "HDD", code: "HDD", summary: "Mechanical storage built from supporting-hardware choices.", fields: [
    f("Platters", ["1", "2", "4", "8"], "Platter Count"), f("Areal Density", ["Low", "Medium", "High", "Extreme"]), f("Spin Speed", ["5,400 RPM", "7,200 RPM", "10,000 RPM", "15,000 RPM"]), f("Actuator", ["Single", "Dual"]), f("Interface", ["ST-506/MFM", "IDE/ATA", "SCSI", "SATA"]),
  ] },
  { type: "Holographic Storage", code: "HOL", summary: "Speculative volume-recording storage.", fields: [f("Recording Medium", ["Photopolymer", "Crystal", "Glass"]), f("Layer Depth", ["Shallow", "Medium", "Deep"]), f("Laser Precision", ["Basic", "Fine", "Ultra-Fine"])] },
  { type: "DNA Storage", code: "DNA", summary: "Speculative molecular archival storage.", fields: [f("Synthesis Method", ["Chemical", "Enzymatic", "Microfluidic"]), f("Encoding Density", ["Conservative", "Dense", "Maximum"]), f("Read Speed", ["Archival", "Standard", "Rapid"], "Read / Sequencing Speed")] },
  { type: "Motherboard", code: "MB", summary: "Board-level sockets, slots, power delivery, and chipset.", fields: [
    f("Form Factor", ["Mini-ITX", "Micro-ATX", "ATX", "E-ATX"]), f("CPU Socket", ["LGA", "PGA", "BGA"]), f("RAM Slots", ["2", "4", "8"], "RAM Slot Count"), f("Expansion Slots", ["1", "2", "4"], "Expansion Slot Count"), f("Expansion Slot Type", ["PCIe x1", "PCIe x4", "PCIe x8", "PCIe x16"]), f("VRM", ["Basic", "Mainstream", "Enthusiast"], "VRM Quality"), f("Chipset", ["Budget", "Mainstream", "Enthusiast"], "Chipset Tier"), f("Bridges", ["Absent", "Present"], "North/Southbridge"),
  ] },
  { type: "Power Supply", code: "PSU", summary: "Power conversion and distribution.", fields: [f("Wattage", ["450 W", "650 W", "850 W", "1200 W", "1600 W"]), f("Efficiency", ["80 PLUS White", "80 PLUS Bronze", "80 PLUS Silver", "80 PLUS Gold", "80 PLUS Platinum", "80 PLUS Titanium"], "Efficiency Rating"), f("Modularity", ["Non-modular", "Semi-modular", "Fully-modular"]), f("Form Factor", ["ATX", "SFX"])] },
  { type: "Cooling", code: "THM", summary: "Thermal transport and airflow.", fields: [f("Cooling Type", ["Air", "Air + Heatpipe", "AIO Liquid", "Custom Loop", "Two-Phase Immersion"]), f("Radiator", ["120 mm", "240 mm", "280 mm", "360 mm"], "Radiator / Heatsink Size"), f("Fan Size", ["80 mm", "92 mm", "120 mm", "140 mm"]), f("Fan Count", ["1", "2", "3", "4"]), f("Fan Curve", ["Quiet", "Balanced", "Performance"])] },
  { type: "Case", code: "CAS", summary: "Chassis, drive bays, and airflow envelope.", fields: [f("Form Factor", ["Mini-ITX", "Micro-ATX", "Mid-Tower", "Full-Tower"]), f("Airflow", ["Positive pressure", "Negative pressure", "Balanced pressure"], "Airflow Design"), f("Drive Bays", ["0", "2", "4", "8"], "Drive Bay Count"), f("Fan Mounts", ["2", "4", "6", "10"], "Fan Mount Count")] },
  { type: "Rack", code: "RCK", summary: "Multi-machine rack and facility integration.", fields: [f("Rack Height", ["1U", "2U", "4U", "12U", "24U", "42U"]), f("Rack Width", ["19-inch standard"]), f("PDU", ["No", "Yes"], "PDU Integration"), f("Cable Management", ["Basic", "Guided", "Managed"])] },
  { type: "NIC", code: "NIC", summary: "Network interface controller silicon and package.", fields: [f("Bus Interface", ["PCIe x1", "PCIe x4"]), f("Speed", ["10 Mbps", "100 Mbps", "1 Gbps", "10 Gbps"], "Speed Tier"), f("Ports", ["1", "2", "4"], "Port Count")], icAreas: ["Interface Controller"] },
  { type: "Network Appliance", code: "NET", summary: "Switchboard, router, or gateway configuration.", fields: [f("Role", ["Switchboard", "Router", "Gateway"]), f("Ports", ["4", "8", "24", "48"], "Port Count"), f("Port Speed", ["100 Mbps", "1 Gbps", "10 Gbps"], "Speed per Port"), f("Management", ["Unmanaged", "Managed"]), f("Backplane", ["Low", "Medium", "High"], "Backplane Bandwidth"), f("Processing", ["Basic", "Advanced", "Datacenter"], "Processing Tier"), f("Wireless", ["None", "Wi-Fi 5", "Wi-Fi 6", "Wi-Fi 7"], "Wireless Standard"), f("Firmware", ["Basic", "Managed", "Enterprise"], "Firmware Features")] },
];

export const initialValues = (config: DesignerConfig) => Object.fromEntries(config.fields.map(field => [field.key, field.values[0]]));
