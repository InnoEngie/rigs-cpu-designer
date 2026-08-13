export type ExpansionAreaType =
  | "interconnect"
  | "power"
  | "io"
  | "l2"
  | "l3"
  | "alu"
  | "simd"
  | "systolic"
  | "rt"
  | "graph"
  | "fpga"
  | "photonic"
  | "vector"
  | "npu"
  | "neuromorphic"
  | "storageController";

export type ExpansionCell = {
  type: ExpansionAreaType;
  quality: number;
};

export type ExpansionBlob = {
  type: ExpansionAreaType;
  cells: number[];
};

export const PROBLEM_AXES = [
  "Scalar / Number Theory",
  "Dense Matrix",
  "Graph / Network",
  "Discrete Logic / Sets",
  "Continuous Stream",
  "Hierarchical / Spatial Trees",
  "Vector Embeddings",
  "Probabilistic / Superposition",
] as const;

export type ProblemAxis = (typeof PROBLEM_AXES)[number];

export const EXPANSION_META: Record<ExpansionAreaType, { label: string; short: string; color: string; compute: boolean }> = {
  interconnect: { label: "Interconnect", short: "BUS", color: "#24a6a1", compute: false },
  power: { label: "Power Delivery", short: "PWR", color: "#9dcf5a", compute: false },
  io: { label: "I/O", short: "I/O", color: "#4b83dd", compute: false },
  l2: { label: "L2 Cache", short: "L2", color: "#f3b23c", compute: false },
  l3: { label: "L3 Cache", short: "L3", color: "#f2dc61", compute: false },
  alu: { label: "ALU Cores", short: "ALU", color: "#ef5b45", compute: true },
  simd: { label: "SIMD Cores", short: "SIMD", color: "#a879d5", compute: true },
  systolic: { label: "Systolic Array", short: "SYS", color: "#d468b4", compute: true },
  rt: { label: "RT Cores", short: "RT", color: "#ff8c55", compute: true },
  graph: { label: "Graph Streaming Processor", short: "GSP", color: "#3db58a", compute: true },
  fpga: { label: "FPGA Fabric", short: "FPGA", color: "#6c8de5", compute: true },
  photonic: { label: "Photonic Processor", short: "PHO", color: "#50b9d4", compute: true },
  vector: { label: "Vector Search Accelerator", short: "VSA", color: "#9a74d9", compute: true },
  npu: { label: "NPU", short: "NPU", color: "#df6f91", compute: true },
  neuromorphic: { label: "Neuromorphic Processor", short: "NEU", color: "#c3924f", compute: true },
  storageController: { label: "Storage Controller", short: "STR", color: "#73889b", compute: true },
};

export const HMA_TYPES = (Object.keys(EXPANSION_META) as ExpansionAreaType[]).filter(
  (type) => EXPANSION_META[type].compute,
);

const AFFINITIES: Record<ExpansionAreaType, Partial<Record<ProblemAxis, number>>> = {
  interconnect: {}, power: {}, io: {}, l2: {}, l3: {},
  alu: {
    "Scalar / Number Theory": 3,
    "Graph / Network": 1,
    "Continuous Stream": 1,
    "Hierarchical / Spatial Trees": 1,
    "Discrete Logic / Sets": 1,
    "Probabilistic / Superposition": 1,
  },
  simd: { "Dense Matrix": 3, "Continuous Stream": 3, "Vector Embeddings": 1, "Probabilistic / Superposition": 1 },
  systolic: { "Dense Matrix": 3, "Vector Embeddings": 1 },
  rt: { "Hierarchical / Spatial Trees": 3 },
  graph: { "Graph / Network": 3, "Vector Embeddings": 1 },
  fpga: { "Discrete Logic / Sets": 3 },
  photonic: { "Dense Matrix": 3, "Continuous Stream": 3 },
  vector: { "Vector Embeddings": 3 },
  npu: { "Dense Matrix": 3, "Vector Embeddings": 3 },
  neuromorphic: { "Probabilistic / Superposition": 3 },
  storageController: { "Hierarchical / Spatial Trees": 3 },
};

const FOUR = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const EIGHT = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const;

const point = (index: number, width: number) => ({ x: index % width, y: Math.floor(index / width) });
const indexOf = (x: number, y: number, width: number) => y * width + x;

export function findExpansionBlobs(
  cells: Array<ExpansionCell | null>,
  width: number,
  height: number,
  type: ExpansionAreaType,
) {
  const visited = new Set<number>();
  const result: ExpansionBlob[] = [];
  for (let start = 0; start < cells.length; start += 1) {
    if (visited.has(start) || cells[start]?.type !== type) continue;
    const queue = [start];
    const members: number[] = [];
    visited.add(start);
    while (queue.length) {
      const current = queue.shift()!;
      members.push(current);
      const { x, y } = point(current, width);
      for (const [dx, dy] of FOUR) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = indexOf(nx, ny, width);
        if (!visited.has(next) && cells[next]?.type === type) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    result.push({ type, cells: members.sort((a, b) => a - b) });
  }
  return result.sort((a, b) => a.cells[0] - b.cells[0]);
}

function adjacentIds(source: ExpansionBlob, targets: ExpansionBlob[], width: number, height: number) {
  const byCell = new Map<number, number>();
  targets.forEach((blob, index) => blob.cells.forEach((cell) => byCell.set(cell, index)));
  const result = new Set<number>();
  source.cells.forEach((cell) => {
    const { x, y } = point(cell, width);
    EIGHT.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      const target = byCell.get(indexOf(nx, ny, width));
      if (target !== undefined) result.add(target);
    });
  });
  return result;
}

export type ExpansionAnalysis = {
  compute: Array<{ id: number; type: ExpansionAreaType; pixels: number; quality: number; starved: boolean; score: number; heat: number; l2: number; l3: number }>;
  radar: Record<ProblemAxis, number>;
  heat: number;
  ioThroughput: number;
  totalL2: number;
  totalL3: number;
  usedPixels: number;
  counts: Record<ExpansionAreaType, number>;
  warnings: string[];
};

export function analyzeExpansionCard(cells: Array<ExpansionCell | null>, width: number, height: number): ExpansionAnalysis {
  const types = Object.keys(EXPANSION_META) as ExpansionAreaType[];
  const blobs = Object.fromEntries(types.map((type) => [type, findExpansionBlobs(cells, width, height, type)])) as Record<ExpansionAreaType, ExpansionBlob[]>;
  const computeBlobs = HMA_TYPES.flatMap((type) => blobs[type]);
  const networks = blobs.interconnect;
  const networkIds = computeBlobs.map((blob) => adjacentIds(blob, networks, width, height));
  const l2ByCompute = Array(computeBlobs.length).fill(0) as number[];
  const l3ByCompute = Array(computeBlobs.length).fill(0) as number[];
  const powerByCompute = Array(computeBlobs.length).fill(0) as number[];

  const qualityFor = (blob: ExpansionBlob) => cells[blob.cells[0]]?.quality ?? 2;
  const density = (quality: number) => [0, 0.7, 1, 1.4][quality] ?? 1;

  let totalL2 = 0;
  blobs.l2.forEach((cache) => {
    const value = cache.cells.length * 0.75 * density(qualityFor(cache));
    totalL2 += value;
    const targets = adjacentIds(cache, computeBlobs, width, height);
    targets.forEach((target) => { l2ByCompute[target] += value / targets.size; });
  });

  let totalL3 = 0;
  blobs.l3.forEach((cache) => {
    const value = cache.cells.length * 2.5 * density(qualityFor(cache));
    totalL3 += value;
    const targets = adjacentIds(cache, computeBlobs, width, height);
    const touchedNetworks = adjacentIds(cache, networks, width, height);
    networkIds.forEach((ids, computeIndex) => {
      if ([...ids].some((network) => touchedNetworks.has(network))) targets.add(computeIndex);
    });
    targets.forEach((target) => { l3ByCompute[target] += value / targets.size; });
  });

  blobs.power.forEach((power) => {
    const value = power.cells.length * 2.8 * density(qualityFor(power));
    const targets = adjacentIds(power, computeBlobs, width, height);
    targets.forEach((target) => { powerByCompute[target] += value / targets.size; });
  });

  const compute = computeBlobs.map((blob, index) => {
    const quality = qualityFor(blob);
    const starved = networkIds[index].size === 0;
    const score = (10 + Math.sqrt(blob.cells.length) * 18) * density(quality) * (starved ? 0.25 : 1);
    return {
      id: index + 1,
      type: blob.type,
      pixels: blob.cells.length,
      quality,
      starved,
      score,
      heat: Math.max(0, blob.cells.length * 4.4 - powerByCompute[index]),
      l2: l2ByCompute[index],
      l3: l3ByCompute[index],
    };
  });

  const radar = Object.fromEntries(PROBLEM_AXES.map((axis) => [axis, 0])) as Record<ProblemAxis, number>;
  compute.forEach((unit) => {
    PROBLEM_AXES.forEach((axis) => {
      radar[axis] += unit.pixels * (AFFINITIES[unit.type][axis] ?? 0) * (unit.starved ? 0.25 : 1);
    });
  });

  const counts = Object.fromEntries(types.map((type) => [type, cells.filter((cell) => cell?.type === type).length])) as Record<ExpansionAreaType, number>;
  const ioThroughput = counts.io * 12;
  const warnings: string[] = [];
  const starved = compute.filter((unit) => unit.starved);
  if (starved.length) warnings.push(`${starved.length} compute ${starved.length === 1 ? "blob is" : "blobs are"} starved and operating at 25%.`);
  if (totalL2 > l2ByCompute.reduce((a, b) => a + b, 0) + 0.001) warnings.push("Some L2 cache is not directly linked to a compute blob.");
  if (totalL3 > l3ByCompute.reduce((a, b) => a + b, 0) + 0.001) warnings.push("Some L3 cache has no route to compute.");

  return {
    compute,
    radar,
    heat: compute.reduce((sum, unit) => sum + unit.heat, 0),
    ioThroughput,
    totalL2,
    totalL3,
    usedPixels: cells.filter(Boolean).length,
    counts,
    warnings,
  };
}
