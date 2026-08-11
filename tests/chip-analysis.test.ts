import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  analyzeChip,
  findBlobs,
  type AreaType,
  type Cell,
} from "../lib/chip-analysis.ts";

function cell(type: AreaType, patch: Cell["settings"] = {}): Cell {
  return { type, settings: { ...DEFAULT_SETTINGS[type], ...patch } };
}

test("same-type diagonal cells remain separate blobs", () => {
  const cells: Array<Cell | null> = Array(9).fill(null);
  cells[0] = cell("alu");
  cells[4] = cell("alu");
  assert.equal(findBlobs(cells, 3, 3, "alu").length, 2);
});

test("cross-type diagonal contact links a core to interconnect", () => {
  const cells: Array<Cell | null> = Array(9).fill(null);
  cells[0] = cell("alu");
  cells[4] = cell("interconnect");
  const analysis = analyzeChip(cells, 3, 3);
  assert.equal(analysis.cores.length, 1);
  assert.equal(analysis.cores[0].starved, false);
});

test("a starved core contributes exactly one quarter of its full clock", () => {
  const cells: Array<Cell | null> = Array(4).fill(null);
  cells[0] = cell("alu");
  const core = analyzeChip(cells, 2, 2).cores[0];
  assert.equal(core.starved, true);
  assert.equal(core.clock, core.fullClock * 0.25);
});

test("one L2 blob splits its value evenly across every core it touches", () => {
  const cells: Array<Cell | null> = Array(3).fill(null);
  cells[0] = cell("alu");
  cells[1] = cell("l2");
  cells[2] = cell("alu");
  const analysis = analyzeChip(cells, 3, 1);
  assert.equal(analysis.cores.length, 2);
  assert.equal(analysis.cores[0].l2, analysis.cores[1].l2);
  assert.equal(analysis.cores[0].l2 + analysis.cores[1].l2, analysis.totalL2);
});

test("L3 reaches every core attached to the same interconnect network", () => {
  const cells: Array<Cell | null> = Array(15).fill(null);
  cells[0] = cell("alu");
  cells[1] = cell("interconnect");
  cells[2] = cell("interconnect");
  cells[3] = cell("interconnect");
  cells[4] = cell("alu");
  cells[7] = cell("l3");
  const analysis = analyzeChip(cells, 5, 3);
  assert.equal(analysis.cores[0].l3, analysis.cores[1].l3);
  assert.equal(analysis.linkedL3, analysis.totalL3);
});
