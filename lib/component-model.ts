export type ComponentType =
  | "CPU"
  | "Expansion Card"
  | "RAM"
  | "SSD"
  | "HDD"
  | "Holographic Storage"
  | "DNA Storage"
  | "Motherboard"
  | "Power Supply"
  | "Cooling"
  | "Case"
  | "Rack"
  | "NIC"
  | "Network Appliance";

export type CompatibilityData = {
  cpuLayout?: "LGA" | "PGA" | "BGA";
  cpuSocket?: "LGA" | "PGA" | "BGA";
  motherboardFormFactor?: "Micro-ATX" | "ATX" | "E-ATX";
  caseFormFactor?: "Mini-ITX" | "Micro-ATX" | "Mid-Tower" | "Full-Tower";
  busInterface?: "PCIe x1" | "PCIe x4" | "PCIe x8" | "PCIe x16";
  expansionSlots?: Array<"PCIe x1" | "PCIe x4" | "PCIe x8" | "PCIe x16">;
};

export type SavedComponent = {
  id: string;
  name: string;
  type: ComponentType;
  stats: Record<string, string | number | boolean | number[]>;
  compatibility: CompatibilityData;
  designData?: Record<string, unknown>;
  createdAt: number;
};

export const COMPONENT_GROUPS: Record<string, ComponentType[]> = {
  Compute: ["CPU", "Expansion Card"],
  Memory: ["RAM"],
  Storage: ["SSD", "HDD", "Holographic Storage", "DNA Storage"],
  Platform: ["Motherboard", "Power Supply", "Cooling", "Case", "Rack"],
  Network: ["NIC", "Network Appliance"],
};

export const TYPE_CODES: Record<ComponentType, string> = {
  CPU: "CPU",
  "Expansion Card": "EXP",
  RAM: "RAM",
  SSD: "SSD",
  HDD: "HDD",
  "Holographic Storage": "HSG",
  "DNA Storage": "DNA",
  Motherboard: "MB",
  "Power Supply": "PSU",
  Cooling: "CLG",
  Case: "CAS",
  Rack: "RCK",
  NIC: "NIC",
  "Network Appliance": "NET",
};

export const STORAGE_TYPES: ComponentType[] = [
  "SSD",
  "HDD",
  "Holographic Storage",
  "DNA Storage",
];

export function componentCategory(type: ComponentType) {
  if (STORAGE_TYPES.includes(type)) return "Storage";
  if (type === "Expansion Card") return "Expansion Card";
  if (type === "Power Supply") return "Power Supply";
  if (type === "Network Appliance") return "Network";
  return type;
}

export function createSavedComponent(
  type: ComponentType,
  name: string,
  stats: SavedComponent["stats"],
  compatibility: CompatibilityData = {},
  designData?: Record<string, unknown>,
): SavedComponent {
  const fallback = `${type} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || fallback,
    type,
    stats,
    compatibility,
    designData,
    createdAt: Date.now(),
  };
}

export const PCIE_LANES: Record<string, number> = {
  "PCIe x1": 1,
  "PCIe x4": 4,
  "PCIe x8": 8,
  "PCIe x16": 16,
};

export function allocateExpansionCards(
  cards: SavedComponent[],
  slots: CompatibilityData["expansionSlots"] = [],
) {
  const remaining = [...slots].sort((a, b) => PCIE_LANES[a] - PCIE_LANES[b]);
  return cards.map((card) => {
    const needed = PCIE_LANES[card.compatibility.busInterface ?? ""] ?? Number.POSITIVE_INFINITY;
    const slotIndex = remaining.findIndex((slot) => PCIE_LANES[slot] >= needed);
    if (slotIndex < 0) return false;
    remaining.splice(slotIndex, 1);
    return true;
  });
}

export function motherboardFitsCase(
  board?: CompatibilityData["motherboardFormFactor"],
  chassis?: CompatibilityData["caseFormFactor"],
) {
  if (!board || !chassis) return null;
  const boardTier = { "Micro-ATX": 1, ATX: 2, "E-ATX": 3 }[board];
  const caseTier = { "Mini-ITX": 0, "Micro-ATX": 1, "Mid-Tower": 2, "Full-Tower": 3 }[chassis];
  return boardTier <= caseTier;
}
