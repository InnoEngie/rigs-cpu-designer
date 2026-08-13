import assert from "node:assert/strict";
import test from "node:test";
import {
  PROBLEM_AXES,
  analyzeExpansionCard,
  findExpansionBlobs,
  type ExpansionCell,
} from "../lib/expansion-analysis.ts";
import {
  allocateExpansionCards,
  createSavedComponent,
  motherboardFitsCase,
} from "../lib/component-model.ts";

test("expansion same-type diagonals remain separate compute blobs", () => {
  const cells: Array<ExpansionCell | null> = Array(9).fill(null);
  cells[0] = { type: "npu", quality: 2 };
  cells[4] = { type: "npu", quality: 2 };
  assert.equal(findExpansionBlobs(cells, 3, 3, "npu").length, 2);
});

test("an expansion compute blob is linked by diagonal interconnect contact", () => {
  const cells: Array<ExpansionCell | null> = Array(9).fill(null);
  cells[0] = { type: "simd", quality: 2 };
  cells[4] = { type: "interconnect", quality: 2 };
  assert.equal(analyzeExpansionCard(cells, 3, 3).compute[0].starved, false);
});

test("ALU radar output is broad while a vector accelerator creates one sharp spike", () => {
  const aluCells: Array<ExpansionCell | null> = Array(4).fill(null);
  aluCells[0] = { type: "alu", quality: 2 };
  aluCells[1] = { type: "interconnect", quality: 2 };
  const vectorCells: Array<ExpansionCell | null> = Array(4).fill(null);
  vectorCells[0] = { type: "vector", quality: 2 };
  vectorCells[1] = { type: "interconnect", quality: 2 };
  const alu = analyzeExpansionCard(aluCells, 2, 2).radar;
  const vector = analyzeExpansionCard(vectorCells, 2, 2).radar;
  assert.ok(PROBLEM_AXES.filter((axis) => alu[axis] > 0).length >= 6);
  assert.equal(PROBLEM_AXES.filter((axis) => vector[axis] > 0).length, 1);
});

test("motherboard case compatibility follows the ordered size rule", () => {
  assert.equal(motherboardFitsCase("Micro-ATX", "Full-Tower"), true);
  assert.equal(motherboardFitsCase("E-ATX", "Mid-Tower"), false);
  assert.equal(motherboardFitsCase(undefined, "Full-Tower"), null);
});

test("PCIe allocation consumes each compatible motherboard slot once", () => {
  const x16 = createSavedComponent("Expansion Card", "Wide", {}, { busInterface: "PCIe x16" });
  const x4 = createSavedComponent("Expansion Card", "Small", {}, { busInterface: "PCIe x4" });
  assert.deepEqual(allocateExpansionCards([x16, x4], ["PCIe x16", "PCIe x4"]), [true, true]);
  assert.deepEqual(allocateExpansionCards([x16, x4], ["PCIe x16"]), [true, false]);
});
