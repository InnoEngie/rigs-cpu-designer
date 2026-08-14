"use client";

import { useState } from "react";
import { COMPONENT_STORAGE_KEY, FAB_STORAGE_KEY, type SavedComponent } from "../lib/component-model";
import type { FabLine } from "../lib/fab-line";
import type { DesignerConfig } from "./component-config";
import { CpuDesigner, GenericDesigner } from "./designers";
import { FabDesigner, FabRun, ProductionHub, SavedFabs } from "./production";
import { ComponentHub, MainSplash, RigBuilder, SavedLibrary, TopBar, type Screen } from "./system-pages";

export default function Home() {
  const [screen,setScreen]=useState<Screen>("main"), [config,setConfig]=useState<DesignerConfig|null>(null);
  const readStorage = <T,>(key:string):T[] => { try { return typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; } };
  const [components,setComponents]=useState<SavedComponent[]>(()=>readStorage<SavedComponent>(COMPONENT_STORAGE_KEY)), [fabs,setFabs]=useState<FabLine[]>(()=>readStorage<FabLine>(FAB_STORAGE_KEY));
  const saveComponent=(item:SavedComponent)=>setComponents(previous=>{const next=[...previous,item];localStorage.setItem(COMPONENT_STORAGE_KEY,JSON.stringify(next));return next});
  const saveFab=(item:FabLine)=>setFabs(previous=>{const next=[...previous,item];localStorage.setItem(FAB_STORAGE_KEY,JSON.stringify(next));return next});
  const choose=(next:DesignerConfig)=>{setConfig(next);setScreen("designer")};
  return <div className="app-frame"><TopBar screen={screen} home={()=>setScreen("main")}/>
    {screen==="main"&&<MainSplash go={setScreen}/>} {screen==="components"&&<ComponentHub go={setScreen} choose={choose}/>}
    {screen==="cpu"&&<CpuDesigner saved={components} save={saveComponent} exit={()=>setScreen("components")}/>}
    {screen==="designer"&&config&&<GenericDesigner key={config.type} config={config} save={saveComponent} exit={()=>setScreen("components")}/>}
    {screen==="saved"&&<SavedLibrary items={components}/>} {screen==="rig"&&<RigBuilder items={components}/>}
    {screen==="production"&&<ProductionHub go={setScreen}/>} {screen==="fab-design"&&<FabDesigner save={saveFab} exit={()=>setScreen("production")}/>}
    {screen==="fab-saved"&&<SavedFabs lines={fabs}/>} {screen==="fab-run"&&<FabRun components={components} lines={fabs}/>}
    {screen==="exotic"&&<main className="page-shell placeholder-page"><div className="placeholder-panel"><div className="placeholder-symbol">◇</div><h1>Exotic Compute</h1><p>Quantum and biological design primitives are intentionally outside this prototype.</p><button className="button primary" onClick={()=>setScreen("components")}>← Components</button></div></main>}
  </div>;
}
