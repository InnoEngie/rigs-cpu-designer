export type AreaType =
  | "alu"
  | "l2"
  | "l3"
  | "interconnect"
  | "power"
  | "io"
  | "igpu";

export type Tool = AreaType | "erase";

export type CellSettings = {
  transistor?: "Planar" | "FinFET" | "GAA";
  transistorSize?: number | "sub-2";
  tier?: "Performance" | "Efficiency";
  deliveryLocation?: "Front-side" | "Backside";
  cacheTopology?: "6T" | "8T" | "10T";
  quality?: number;
  interfaceType?: "Standard" | "High-Bandwidth";
};

export type Cell = {
  type: AreaType;
  settings: CellSettings;
};

export type Blob = {
  type: AreaType;
  cells: number[];
};

export type CoreStat = {
  id: number;
  pixels: number;
  tier: "Performance" | "Efficiency";
  clock: number;
  fullClock: number;
  starved: boolean;
  l2: number;
  l3: number;
  heat: number;
  powerReduction: number;
};

export type GraphicsUnitStat = {
  id: number;
  pixels: number;
  score: number;
  starved: boolean;
};

export type ChipAnalysis = {
  cores: CoreStat[];
  graphicsUnits: GraphicsUnitStat[];
  totalL2: number;
  linkedL2: number;
  totalL3: number;
  linkedL3: number;
  heat: number;
  ioThroughput: number;
  usedPixels: number;
  warnings: string[];
  counts: Record<AreaType, number>;
};

export const AREA_META: Record<
  AreaType,
  { label: string; short: string; color: string; description: string }
> = {
  alu: {
    label: "ALU Core",
    short: "ALU",
    color: "#ef5b45",
    description: "General compute. Each separate edge-connected island becomes one core.",
  },
  l2: {
    label: "L2 Cache",
    short: "L2",
    color: "#f3b23c",
    description: "Fast cache linked by direct edge or corner contact with a core.",
  },
  l3: {
    label: "L3 Cache",
    short: "L3",
    color: "#f2dc61",
    description: "Shared cache that can reach cores directly or through an interconnect network.",
  },
  interconnect: {
    label: "Interconnect",
    short: "BUS",
    color: "#24a6a1",
    description: "Binary data plumbing. It connects components but adds no bandwidth stat.",
  },
  power: {
    label: "Power Delivery",
    short: "PWR",
    color: "#9dcf5a",
    description: "Reduces heat on directly adjacent cores.",
  },
  io: {
    label: "I/O",
    short: "I/O",
    color: "#4b83dd",
    description: "Die-wide external throughput; placement does not affect its contribution.",
  },
  igpu: {
    label: "iGPU / SIMD",
    short: "GPU",
    color: "#a879d5",
    description: "Graphics compute. Separate islands become graphics units and need interconnect.",
  },
};

export const DEFAULT_SETTINGS: Record<AreaType, CellSettings> = {
  alu: {
    transistor: "Planar",
    transistorSize: 500,
    tier: "Performance",
    deliveryLocation: "Front-side",
  },
  l2: { cacheTopology: "6T", transistorSize: 500 },
  l3: { cacheTopology: "6T", transistorSize: 500 },
  interconnect: {},
  power: { quality: 2 },
  io: { interfaceType: "Standard" },
  igpu: { quality: 2 },
};

const FOUR_DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

const EIGHT_DIRS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

function indexToPoint(index: number, width: number) {
  return { x: index % width, y: Math.floor(index / width) };
}

function pointToIndex(x: number, y: number, width: number) {
  return y * width + x;
}

export function findBlobs(
  cells: Array<Cell | null>,
  width: number,
  height: number,
  type: AreaType,
): Blob[] {
  const visited = new Set<number>();
  const blobs: Blob[] = [];

  for (let start = 0; start < cells.length; start += 1) {
    if (visited.has(start) || cells[start]?.type !== type) continue;
    const queue = [start];
    const members: number[] = [];
    visited.add(start);

    while (queue.length) {
      const current = queue.shift()!;
      members.push(current);
      const { x, y } = indexToPoint(current, width);
      for (const [dx, dy] of FOUR_DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbor = pointToIndex(nx, ny, width);
        if (!visited.has(neighbor) && cells[neighbor]?.type === type) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    blobs.push({ type, cells: members.sort((a, b) => a - b) });
  }

  return blobs.sort((a, b) => a.cells[0] - b.cells[0]);
}

export function blobAt(
  cells: Array<Cell | null>,
  width: number,
  height: number,
  index: number,
): Blob | null {
  const type = cells[index]?.type;
  if (!type) return null;
  return findBlobs(cells, width, height, type).find((blob) => blob.cells.includes(index)) ?? null;
}

function adjacentBlobIds(
  source: Blob,
  targets: Blob[],
  width: number,
  height: number,
) {
  const targetByCell = new Map<number, number>();
  targets.forEach((blob, blobIndex) => {
    blob.cells.forEach((cellIndex) => targetByCell.set(cellIndex, blobIndex));
  });
  const result = new Set<number>();

  for (const cellIndex of source.cells) {
    const { x, y } = indexToPoint(cellIndex, width);
    for (const [dx, dy] of EIGHT_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const target = targetByCell.get(pointToIndex(nx, ny, width));
      if (target !== undefined) result.add(target);
    }
  }
  return result;
}

function settingForBlob(cells: Array<Cell | null>, blob: Blob) {
  return cells[blob.cells[0]]?.settings ?? {};
}

const qualityMultiplier = (value = 2) => [0, 0.7, 1, 1.4][value] ?? 1;
const processDensity = (node: number | "sub-2" = 500) =>
  Math.max(0.7, Math.pow(130 / (node === "sub-2" ? 1.5 : node), 0.22));
const cacheTopologyMultiplier = (topology: CellSettings["cacheTopology"] = "6T") =>
  ({ "6T": 1, "8T": 0.84, "10T": 0.72 })[topology];

export function analyzeChip(
  cells: Array<Cell | null>,
  width: number,
  height: number,
): ChipAnalysis {
  const blobs = {
    alu: findBlobs(cells, width, height, "alu"),
    l2: findBlobs(cells, width, height, "l2"),
    l3: findBlobs(cells, width, height, "l3"),
    interconnect: findBlobs(cells, width, height, "interconnect"),
    power: findBlobs(cells, width, height, "power"),
    igpu: findBlobs(cells, width, height, "igpu"),
  };

  const counts = (Object.keys(AREA_META) as AreaType[]).reduce(
    (result, type) => {
      result[type] = cells.filter((cell) => cell?.type === type).length;
      return result;
    },
    {} as Record<AreaType, number>,
  );

  const coreNetworkIds = blobs.alu.map((core) =>
    adjacentBlobIds(core, blobs.interconnect, width, height),
  );
  const graphicsNetworkIds = blobs.igpu.map((unit) =>
    adjacentBlobIds(unit, blobs.interconnect, width, height),
  );

  const l2ByCore = Array(blobs.alu.length).fill(0) as number[];
  let totalL2 = 0;
  for (const cache of blobs.l2) {
    const cacheSettings = settingForBlob(cells, cache);
    const value = cache.cells.length * 0.75 * processDensity(cacheSettings.transistorSize) * cacheTopologyMultiplier(cacheSettings.cacheTopology);
    totalL2 += value;
    const targets = adjacentBlobIds(cache, blobs.alu, width, height);
    targets.forEach((target) => {
      l2ByCore[target] += value / targets.size;
    });
  }

  const l3ByCore = Array(blobs.alu.length).fill(0) as number[];
  let totalL3 = 0;
  for (const cache of blobs.l3) {
    const cacheSettings = settingForBlob(cells, cache);
    const value = cache.cells.length * 2.5 * processDensity(cacheSettings.transistorSize) * cacheTopologyMultiplier(cacheSettings.cacheTopology);
    totalL3 += value;
    const targets = adjacentBlobIds(cache, blobs.alu, width, height);
    const touchedNetworks = adjacentBlobIds(cache, blobs.interconnect, width, height);
    coreNetworkIds.forEach((networks, coreIndex) => {
      if ([...networks].some((network) => touchedNetworks.has(network))) targets.add(coreIndex);
    });
    targets.forEach((target) => {
      l3ByCore[target] += value / targets.size;
    });
  }

  const powerByCore = Array(blobs.alu.length).fill(0) as number[];
  for (const powerBlob of blobs.power) {
    const value =
      powerBlob.cells.length * 2.8 * qualityMultiplier(settingForBlob(cells, powerBlob).quality);
    const targets = adjacentBlobIds(powerBlob, blobs.alu, width, height);
    targets.forEach((target) => {
      powerByCore[target] += value / targets.size;
    });
  }

  const transistorMultiplier = { Planar: 0.94, FinFET: 1, GAA: 1.09 } as const;
  const tierMultiplier = { Performance: 1.18, Efficiency: 0.82 } as const;

  const cores: CoreStat[] = blobs.alu.map((blob, index) => {
    const settings = settingForBlob(cells, blob);
    const tier = settings.tier ?? "Performance";
    const transistor = settings.transistor ?? "FinFET";
    const fullClock =
      (0.8 + Math.sqrt(blob.cells.length) * 0.58) *
      tierMultiplier[tier] *
      transistorMultiplier[transistor] *
      processDensity(settings.transistorSize);
    const starved = coreNetworkIds[index].size === 0;
    const rawHeat = blob.cells.length * (tier === "Performance" ? 5.4 : 3.2);
    return {
      id: index + 1,
      pixels: blob.cells.length,
      tier,
      clock: fullClock * (starved ? 0.25 : 1),
      fullClock,
      starved,
      l2: l2ByCore[index],
      l3: l3ByCore[index],
      powerReduction: powerByCore[index],
      heat: Math.max(0, rawHeat - powerByCore[index]),
    };
  });

  const graphicsUnits: GraphicsUnitStat[] = blobs.igpu.map((blob, index) => {
    const quality = qualityMultiplier(settingForBlob(cells, blob).quality);
    const fullScore = (12 + Math.sqrt(blob.cells.length) * 21) * quality;
    const starved = graphicsNetworkIds[index].size === 0;
    return {
      id: index + 1,
      pixels: blob.cells.length,
      score: fullScore * (starved ? 0.25 : 1),
      starved,
    };
  });

  const ioThroughput = cells.reduce((total, cell) => {
    if (cell?.type !== "io") return total;
    return total + (cell.settings.interfaceType === "High-Bandwidth" ? 16 : 10);
  }, 0);

  const warnings: string[] = [];
  const starvedCores = cores.filter((core) => core.starved).map((core) => `Core ${core.id}`);
  if (starvedCores.length) {
    warnings.push(`${starvedCores.join(", ")} ${starvedCores.length === 1 ? "is" : "are"} starved and operating at 25% without Interconnect contact.`);
  }
  const starvedGraphics = graphicsUnits.filter((unit) => unit.starved).map((unit) => `Graphics ${unit.id}`);
  if (starvedGraphics.length) {
    warnings.push(`${starvedGraphics.join(", ")} ${starvedGraphics.length === 1 ? "is" : "are"} starved and operating at 25%.`);
  }
  const linkedL2 = l2ByCore.reduce((sum, value) => sum + value, 0);
  const linkedL3 = l3ByCore.reduce((sum, value) => sum + value, 0);
  if (totalL2 > linkedL2 + 0.001) warnings.push("Some L2 cache is not touching a core and is currently unused.");
  if (totalL3 > linkedL3 + 0.001) warnings.push("Some L3 cache has no direct or interconnect path to a core.");
  if (cores.length === 0) warnings.push("A CPU design needs at least one ALU Core blob.");

  return {
    cores,
    graphicsUnits,
    totalL2,
    linkedL2,
    totalL3,
    linkedL3,
    heat: cores.reduce((sum, core) => sum + core.heat, 0),
    ioThroughput,
    usedPixels: cells.filter(Boolean).length,
    warnings,
    counts,
  };
}

export function formatNumber(value: number, digits = 1) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
