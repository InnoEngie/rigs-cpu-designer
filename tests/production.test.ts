import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, type Cell } from "../lib/chip-analysis.ts";
import { calculateYield, resolutionPressure, tierById } from "../lib/lithography.ts";
import { analyzeFabRun, materialExpectations, type FabLine } from "../lib/fab-line.ts";
import type { SavedComponent } from "../lib/component-model.ts";

const alu = (node:number|"sub-2"=500):Cell => ({ type:"alu", settings:{...DEFAULT_SETTINGS.alu, transistor:"Planar", transistorSize:node} });

test("single-node lithography tier has neutral resolution pressure",()=>{
  const tier=tierById("contact");
  assert.equal(resolutionPressure(10000,tier),1);
});

test("the tightest node has more pressure than the comfortable node",()=>{
  const tier=tierById("euv");
  assert.equal(resolutionPressure(5,tier),1);
  assert.equal(resolutionPressure(3,tier),3);
});

test("cleaner air improves Poisson yield",()=>{
  const tier=tierById("stepper"), cells:Array<Cell|null>=Array(225).fill(null);
  cells.fill(alu(500),0,100);
  assert.ok(calculateYield(cells,tier,100).yield>calculateYield(cells,tier,0).yield);
});

test("automated early QC saves more downstream material than no QC",()=>{
  const none=materialExpectations(0.5,Array(7).fill("None"));
  const automated=materialExpectations(0.5,["Automated",...Array(6).fill("None")]);
  assert.equal(none[7].saved,0);
  assert.ok(automated[7].saved>0);
});

test("advanced bin probabilities sum to one",()=>{
  const cells:Array<Cell|null>=Array(225).fill(null); cells[0]=alu(500);
  const die:SavedComponent={id:"die",name:"Die",type:"CPU",createdAt:0,stats:{},compatibility:{cpuLayout:"LGA"},die:{lithographyTier:"stepper",width:15,height:15,gridWidth:15,gridHeight:15,cells}};
  const line:FabLine={id:"line",name:"Line",createdAt:0,lithographyTier:"stepper",testTier:"Advanced (Binning)",airQuality:85,checkpoints:Array(7).fill("None")};
  const result=analyzeFabRun(die,line)!;
  assert.ok(Math.abs(Object.values(result.probabilities).reduce((sum,value)=>sum+value,0)-1)<1e-10);
});
