import type { Cell } from "./chip-analysis.ts";
import type { LithographyTierId } from "./lithography.ts";

export type ComponentType =
  | "CPU" | "Expansion Card" | "RAM" | "SSD" | "HDD" | "Holographic Storage"
  | "DNA Storage" | "Motherboard" | "Power Supply" | "Cooling" | "Case" | "Rack"
  | "NIC" | "Network Appliance";

export type SavedComponent = {
  id: string;
  name: string;
  type: ComponentType;
  createdAt: number;
  stats: Record<string, string | number | boolean>;
  compatibility: {
    cpuLayout?: string;
    cpuSocket?: string;
    motherboardFormFactor?: string;
    caseFormFactor?: string;
    busInterface?: string;
    expansionSlots?: string[];
  };
  die?: {
    lithographyTier: LithographyTierId;
    width: number;
    height: number;
    gridWidth: number;
    gridHeight: number;
    cells: Array<Cell | null>;
  };
};

export const COMPONENT_STORAGE_KEY = "rigs.saved-components.v3";
export const FAB_STORAGE_KEY = "rigs.saved-fab-lines.v3";

export const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function boardFitsCase(board: string, caseSize: string) {
  const boardRank: Record<string, number> = { "Mini-ITX": 0, "Micro-ATX": 1, ATX: 2, "E-ATX": 3 };
  const caseRank: Record<string, number> = { "Mini-ITX": 0, "Micro-ATX": 1, "Mid-Tower": 2, "Full-Tower": 3 };
  return (boardRank[board] ?? 99) <= (caseRank[caseSize] ?? -1);
}

export function laneCount(value: string) {
  return Number(value.match(/x(\d+)/)?.[1] ?? 0);
}

export function cardFitsSlots(card: string, slots: string[]) {
  return slots.some((slot) => laneCount(slot) >= laneCount(card));
}
