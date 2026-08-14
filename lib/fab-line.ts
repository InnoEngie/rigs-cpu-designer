import { LITHOGRAPHY_TIERS, calculateYield, isConstructionCompatible, tierById, type LithographyTierId } from "./lithography.ts";
import type { SavedComponent } from "./component-model.ts";

export type QcType = "None" | "Manual" | "Automated";
export type TestTier = "Basic" | "Advanced (Binning)";

export const FAB_STAGES = [
  { id: "wafer", name: "Wafer Prep", material: "Raw wafer blank" },
  { id: "coat", name: "Photoresist Coat", material: "Photoresist chemical" },
  { id: "exposure", name: "Exposure", material: "Negligible reticle wear" },
  { id: "develop", name: "Develop", material: "Developer solution" },
  { id: "etch", name: "Etch / Deposition", material: "Process gases" },
  { id: "clean", name: "Strip & Clean", material: "Solvents / water" },
  { id: "probe", name: "Wafer-Level Test / Probe", material: "Negligible test wear" },
  { id: "dicing", name: "Dicing", material: "Negligible saw wear" },
] as const;

export type FabLine = {
  id: string;
  name: string;
  createdAt: number;
  lithographyTier: LithographyTierId;
  testTier: TestTier;
  airQuality: number;
  checkpoints: QcType[];
};

export type MaterialExpectation = { stage: string; material: string; used: number; saved: number };

const qcStats: Record<QcType, { catchRate: number; rework: number }> = {
  None: { catchRate: 0, rework: 0 },
  Manual: { catchRate: 0.6, rework: 0.4 },
  Automated: { catchRate: 0.9, rework: 0.65 },
};

export function materialExpectations(defectChance: number, checkpoints: QcType[]): MaterialExpectation[] {
  let survival = 1;
  return FAB_STAGES.map((stage, stageIndex) => {
    const used = survival;
    const saved = 1 - survival;
    const checkpoint = checkpoints[stageIndex];
    if (checkpoint && checkpoint !== "None") {
      const { catchRate, rework } = qcStats[checkpoint];
      const scrapProbability = defectChance * catchRate * (1 - rework);
      survival *= 1 - scrapProbability;
    }
    return { stage: stage.name, material: stage.material, used, saved };
  });
}

export function analyzeFabRun(die: SavedComponent, line: FabLine) {
  if (!die.die) return null;
  const lineTier = tierById(line.lithographyTier);
  const tierIndex = LITHOGRAPHY_TIERS.findIndex((tier) => tier.id === line.lithographyTier);
  const dieTierIndex = LITHOGRAPHY_TIERS.findIndex((tier) => tier.id === die.die!.lithographyTier);
  const compatible = die.die.width <= lineTier.width && die.die.height <= lineTier.height &&
    dieTierIndex <= tierIndex && isConstructionCompatible(die.die.cells, lineTier);
  const yieldData = calculateYield(die.die.cells, lineTier, line.airQuality);
  const probabilities = line.testTier === "Basic"
    ? { Pass: yieldData.yield, Fail: 1 - yieldData.yield }
    : {
        High: yieldData.yield,
        Normal: (1 - yieldData.yield) * 0.5,
        Low: (1 - yieldData.yield) * 0.3,
        Fail: (1 - yieldData.yield) * 0.2,
      };
  return {
    compatible,
    yieldData,
    probabilities,
    materials: materialExpectations(1 - yieldData.yield, line.checkpoints),
  };
}
