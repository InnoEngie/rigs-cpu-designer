import type { AreaType, Cell } from "./chip-analysis.ts";

export type LithographyTierId =
  | "contact"
  | "stepper"
  | "duv-dry"
  | "duv-immersion"
  | "euv"
  | "high-na-euv";

export type ProcessNode = number | "sub-2";

export type LithographyTier = {
  id: LithographyTierId;
  name: string;
  width: number;
  height: number;
  gridWidth: number;
  gridHeight: number;
  nodes: ProcessNode[];
};

export const LITHOGRAPHY_TIERS: LithographyTier[] = [
  { id: "contact", name: "Contact/Proximity Printing", width: 5, height: 5, gridWidth: 5, gridHeight: 5, nodes: [10000] },
  { id: "stepper", name: "Projection Stepper (G-line/I-line)", width: 15, height: 15, gridWidth: 15, gridHeight: 15, nodes: [500, 350] },
  { id: "duv-dry", name: "DUV Dry (KrF/ArF)", width: 22, height: 22, gridWidth: 22, gridHeight: 22, nodes: [130, 90] },
  { id: "duv-immersion", name: "DUV Immersion + Multi-Patterning", width: 26, height: 33, gridWidth: 26, gridHeight: 33, nodes: [45, 22, 14, 7] },
  { id: "euv", name: "EUV", width: 26, height: 33, gridWidth: 26, gridHeight: 33, nodes: [5, 3] },
  { id: "high-na-euv", name: "High-NA EUV", width: 26, height: 16.5, gridWidth: 26, gridHeight: 17, nodes: [2, "sub-2"] },
];

export const tierById = (id: LithographyTierId) =>
  LITHOGRAPHY_TIERS.find((tier) => tier.id === id) ?? LITHOGRAPHY_TIERS[0];

export const nodeValue = (node: ProcessNode) => node === "sub-2" ? 1.5 : node;
export const nodeLabel = (node: ProcessNode) => node === "sub-2" ? "sub-2nm" : `${node.toLocaleString()}nm`;

export function availableTransistors(tierId: LithographyTierId) {
  const tierIndex = LITHOGRAPHY_TIERS.findIndex((tier) => tier.id === tierId);
  return ["Planar", ...(tierIndex >= 3 ? ["FinFET"] : []), ...(tierIndex >= 4 ? ["GAA"] : [])] as Array<"Planar" | "FinFET" | "GAA">;
}

export function resolutionPressure(node: ProcessNode, tier: LithographyTier) {
  if (tier.nodes.length === 1) return 1;
  const values = tier.nodes.map(nodeValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return 1 + 2 * (1 - (nodeValue(node) - min) / (max - min));
}

export function nodeDensity(node: ProcessNode) {
  return Math.max(0.7, Math.pow(130 / nodeValue(node), 0.22));
}

export type YieldBreakdown = {
  yield: number;
  criticalArea: number;
  fillFraction: number;
  baseDefectDensity: number;
  resolutionPressure: number;
  constructionQuality: number;
  effectiveDefectDensity: number;
};

const constructionMultiplier = (cell: Cell) => {
  if (cell.type === "alu") return ({ Planar: 1, FinFET: 1.3, GAA: 1.6 } as const)[cell.settings.transistor ?? "Planar"];
  if (cell.type === "l2" || cell.type === "l3") return ({ "6T": 1, "8T": 1.15, "10T": 1.3 } as const)[cell.settings.cacheTopology ?? "6T"];
  return 1;
};

export function calculateYield(
  cells: Array<Cell | null>,
  tier: LithographyTier,
  airQuality: number,
): YieldBreakdown {
  const active = cells.filter((cell): cell is Cell => Boolean(cell));
  const fillFraction = cells.length ? active.length / cells.length : 0;
  const criticalArea = tier.width * tier.height * fillFraction;
  const baseDefectDensity = 0.001 + (0.01 - 0.001) * (1 - airQuality / 100);
  const weighted = active.filter((cell) => ["alu", "l2", "l3"].includes(cell.type));
  const resolution = weighted.length
    ? weighted.reduce((sum, cell) => sum + resolutionPressure(cell.settings.transistorSize ?? tier.nodes[0], tier), 0) / weighted.length
    : 1;
  const quality = weighted.length
    ? weighted.reduce((sum, cell) => sum + constructionMultiplier(cell), 0) / weighted.length
    : 1;
  const effectiveDefectDensity = baseDefectDensity * resolution * quality;
  return {
    yield: Math.exp(-effectiveDefectDensity * criticalArea),
    criticalArea,
    fillFraction,
    baseDefectDensity,
    resolutionPressure: resolution,
    constructionQuality: quality,
    effectiveDefectDensity,
  };
}

export function isConstructionCompatible(cells: Array<Cell | null>, lineTier: LithographyTier) {
  const allowedNodes = new Set(lineTier.nodes.map(nodeValue));
  const allowedTypes = new Set(availableTransistors(lineTier.id));
  return cells.every((cell) => !cell || (
    (!cell.settings.transistorSize || allowedNodes.has(nodeValue(cell.settings.transistorSize))) &&
    (!cell.settings.transistor || allowedTypes.has(cell.settings.transistor))
  ));
}

export const yieldAreaTypes = new Set<AreaType>(["alu", "l2", "l3"]);
