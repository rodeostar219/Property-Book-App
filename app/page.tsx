"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Boxes, CheckCircle2, ChevronDown, CircleHelp, Clock3,
  Download, FileCheck2, Filter, Gauge, History, Laptop2, Menu, PackageCheck,
  Plus, Radio, Search, Settings2, ShieldCheck, UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { calculateVersionStatus } from "@/lib/version-status";

type Status = "Current" | "Update Available" | "Update Required" | "Version Unknown" | "Verification Overdue" | "Exception Approved" | "Not Applicable";
type ComponentRow = {
  id: number; asset: string; serial: string; model: string; network: string; name: string;
  type: string; installed: string; approved: string; installedOn: string; verifiedOn: string;
  verification: string; verifiedBy: string; source: string; status: Status; selected?: boolean;
};

const seedRows: ComponentRow[] = [
  { id: 1, asset: "RAVEN-021", serial: "CNU4197K8D", model: "GETAC B360", network: "SIPR", name: "Windows 11 Enterprise", type: "Operating system", installed: "23H2 · 22631.4169", approved: "23H2 · 22631.4169", installedOn: "18 Aug 2026", verifiedOn: "09 Sep 2026", verification: "Automated scan", verifiedBy: "SCCM Service", source: "PKG-OS-23H2-091", status: "Current" },
  { id: 2, asset: "RAVEN-021", serial: "CNU4197K8D", model: "GETAC B360", network: "SIPR", name: "BIOS", type: "BIOS", installed: "1.18.0", approved: "1.21.0", installedOn: "04 Mar 2026", verifiedOn: "09 Sep 2026", verification: "UEFI inventory", verifiedBy: "SCCM Service", source: "BIOS-B360-1.21", status: "Update Required" },
  { id: 3, asset: "FALCON-104", serial: "FVH8R2LX", model: "AN/PRC-163", network: "Mission", name: "Sierra II Waveform", type: "Radio waveform", installed: "6.2.1", approved: "6.2.1", installedOn: "22 Jul 2026", verifiedOn: "08 Sep 2026", verification: "Bench test", verifiedBy: "S. Morales", source: "WF-S2-621-R3", status: "Current" },
  { id: 4, asset: "FALCON-118", serial: "FVH8R91Q", model: "AN/PRC-163", network: "Mission", name: "Sierra II Waveform", type: "Radio waveform", installed: "Unknown", approved: "6.2.1", installedOn: "—", verifiedOn: "Never", verification: "Not recorded", verifiedBy: "—", source: "WF-S2-621-R3", status: "Version Unknown" },
  { id: 5, asset: "ATLAS-033", serial: "5CG1148PZ2", model: "HP ZBook 15", network: "NIPR", name: "Trellix ENS", type: "Security package", installed: "10.7.0.7034", approved: "10.7.0.7034", installedOn: "29 Aug 2026", verifiedOn: "01 Sep 2026", verification: "Manual review", verifiedBy: "J. Patel", source: "HBSS-ENS-10.7", status: "Verification Overdue" },
  { id: 6, asset: "ATLAS-041", serial: "5CG1149B7C", model: "HP ZBook 15", network: "Standalone", name: "NVIDIA RTX Driver", type: "Driver", installed: "552.22", approved: "552.22", installedOn: "06 Jun 2026", verifiedOn: "28 Aug 2026", verification: "Device Manager", verifiedBy: "A. Kim", source: "DRV-NV-55222", status: "Exception Approved" },
];

const tone: Record<Status, string> = {
  Current: "status-current", "Update Available": "status-available", "Update Required": "status-required",
  "Version Unknown": "status-unknown", "Verification Overdue": "status-overdue",
  "Exception Approved": "status-exception", "Not Applicable": "status-na",
};

const nav = [
  [Gauge, "Overview"], [Laptop2, "Assets"], [PackageCheck, "Versions"],
  [Boxes, "Baselines"], [FileCheck2, "Deployments"], [History, "History"],
] as const;

export default function Home() {
  const [rows, setRows] = useState(seedRows);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [activeNav, setActiveNav] = useState("Versions");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const selected = rows.filter((r) => r.selected);
  const filtered = rows.filter((r) => (filter === "All statuses" || r.status === filter) && `${r.asset} ${r.name} ${r.installed} ${r.model}`.toLowerCase().includes(query.toLowerCase()));
  const versionGroups = useMemo(() => [["23H2 · 22631.4169", 18, 24, "Windows 11 Enterprise"], ["6.2.1", 12, 16, "Sierra II Waveform"], ["10.7.0.7034", 9, 14, "Trellix ENS"]] as const, []);

  function toggle(id: number) { setRows((all) => all.map((row) => row.id === id ? { ...row, selected: !row.selected } : row)); }
  function applyBulk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); const version = String(form.get("version") || ""); const technician = String(form.get("technician") || "");
    setRows((all) => all.map((row) => row.selected ? { ...row, installed: version, installedOn: "11 Sep 2026", verifiedOn: "11 Sep 2026", verifiedBy: technician, verification: "Post-install verification", status: calculateVersionStatus({ installedVersion: version, approvedVersion: row.approved, required: row.type !== "Driver", lastVerifiedDate: "2026-09-11", now: new Date("2026-09-11") }), selected: false } : row));
    setBulkOpen(false); setNotice(`Update recorded for ${selected.length} assets. Individual history entries preserved.`); window.setTimeout(() => setNotice(""), 4200);
  }
  function exportCsv() {
    const head = "Asset,Serial,Model,Network,Component,Type,Installed,Approved,Installed Date,Verified Date,Method,Verified By,Package,Status";
    const lines = rows.map((r) => [r.asset,r.serial,r.model,r.network,r.name,r.type,r.installed,r.approved,r.installedOn,r.verifiedOn,r.verification,r.verifiedBy,r.source,r.status].map((v) => `"${v}"`).join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "software-readiness-export.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: unknown) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return; const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: "filter_version_records", title: "Filter version records", description: "Filter the visible software and firmware records by status.", inputSchema: { type: "object", properties: { status: { type: "string", enum: ["All statuses", ...Object.keys(tone)] } }, required: ["status"], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input: unknown) { const value = (input as { status?: string }).status; if (!value) throw new Error("status is required"); setFilter(value); return { status: value, visibleRecords: rows.filter(r => value === "All statuses" || r.status === value).length }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [rows]);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><ShieldCheck /></span><span><b>FORGETRACK</b><small>READINESS CONTROL</small></span></div>
      <nav aria-label="Primary navigation">{nav.map(([Icon, label]) => <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false); }} className={activeNav === label ? "active" : ""}><Icon /><span>{label}</span>{label === "Deployments" && <em>3</em>}</button>)}</nav>
      <div className="side-callout"><span>BASELINE HEALTH</span><strong>78%</strong><Progress value={78} /><p>47 of 60 equipment records meet their assigned baseline.</p></div>
      <div className="user"><span>RO</span><div><strong>R. Ortiz</strong><small>Readiness Manager</small></div><ChevronDown /></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></button><div><p className="eyebrow">SOFTWARE ASSURANCE</p><h1>{activeNav === "Versions" ? "Version readiness" : activeNav}</h1></div><div className="top-actions"><button className="icon-btn" aria-label="Settings"><Settings2 /></button><Button variant="outline" onClick={exportCsv}><Download /> Export</Button><Dialog><DialogTrigger asChild><Button><Plus /> Add component</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add installed component</DialogTitle><DialogDescription>Record a component without storing credentials, keys, configurations, or classified operational settings.</DialogDescription></DialogHeader><ComponentForm onDone={() => setNotice("Component draft validated and ready to save.")} /><DialogFooter showCloseButton /></DialogContent></Dialog></div></header>
      <section className="content">
        {notice && <div className="toast" role="status"><CheckCircle2 />{notice}</div>}
        {activeNav === "Deployments" && <DeploymentView />}
        {activeNav === "Assets" && <AssetsView rows={rows} />}
        <div hidden={activeNav === "Deployments" || activeNav === "Assets"}>
        <div className="metrics"><Metric label="CURRENT SOFTWARE" value="42" note="42 assets compliant" icon={CheckCircle2} style="good" /><Metric label="UPDATE REQUIRED" value="8" note="3 deployment blockers" icon={AlertTriangle} style="bad" /><Metric label="VERSION UNKNOWN" value="5" note="Inventory action needed" icon={CircleHelp} style="muted" /><Metric label="AWAITING VERIFY" value="5" note="2 overdue by 7+ days" icon={Clock3} style="warn" /></div>
        <div className="deployment-alert"><span className="alert-icon"><AlertTriangle /></span><div><strong>Operation Northstar has software issues</strong><p>5 selected equipment items need attention before the 16 Sep deployment window.</p></div><div className="issue-pills"><span><b>3</b> BLOCKING</span><span><b>2</b> WARNINGS</span></div><Button variant="outline" onClick={() => setActiveNav("Deployments")}>Review equipment</Button></div>
        <Tabs defaultValue="inventory"><TabsList variant="line" className="view-tabs"><TabsTrigger value="inventory">Component inventory</TabsTrigger><TabsTrigger value="baselines">Baseline progress</TabsTrigger><TabsTrigger value="versions">Version groups</TabsTrigger></TabsList>
          <TabsContent value="inventory"><section className="panel inventory-panel"><div className="panel-head"><div><h2>Installed components</h2><p>Software, firmware, BIOS, waveforms, drivers, and security packages</p></div><span className="record-count">{filtered.length} records</span></div><div className="toolbar"><label className="search"><Search /><input aria-label="Search components" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset, model, component, or version" /></label><label className="select-wrap"><Filter /><select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All statuses</option>{Object.keys(tone).map((s) => <option key={s}>{s}</option>)}</select></label></div>
            {selected.length > 0 && <div className="bulk-bar"><span><b>{selected.length}</b> assets selected</span><Button size="sm" onClick={() => setBulkOpen(true)}><UploadCloud /> Record bulk update</Button><button onClick={() => setRows(rows.map(r => ({...r, selected:false})))}>Clear</button></div>}
            <div className="table-wrap"><table><thead><tr><th><span className="sr-only">Select</span></th><th>Asset / network</th><th>Component</th><th>Installed</th><th>Approved / required</th><th>Verified</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className={row.selected ? "selected" : ""}><td><Checkbox checked={!!row.selected} onCheckedChange={() => toggle(row.id)} aria-label={`Select ${row.asset} ${row.name}`} /></td><td><strong>{row.asset}</strong><small>{row.model} · {row.network}</small></td><td><strong>{row.name}</strong><small>{row.type}</small></td><td><code>{row.installed}</code><small>{row.installedOn}</small></td><td><code>{row.approved}</code><small>{row.source}</small></td><td><strong>{row.verifiedOn}</strong><small>{row.verifiedBy} · {row.verification}</small></td><td><span className={`status ${tone[row.status]}`}><i />{row.status}</span></td><td><button className="row-menu" aria-label={`Open ${row.asset} details`}>•••</button></td></tr>)}</tbody></table></div></section></TabsContent>
          <TabsContent value="baselines"><BaselineView /></TabsContent><TabsContent value="versions"><VersionGroups groups={versionGroups} /></TabsContent></Tabs>
        <div className="lower-grid"><BaselineView compact /><VersionGroups groups={versionGroups} compact /></div><p className="security-note"><ShieldCheck /> Store version evidence only. Never upload passwords, cryptographic keys, configuration files, or classified operational settings.</p>
        </div>
      </section>
    </main>
    <Dialog open={bulkOpen} onOpenChange={setBulkOpen}><DialogContent className="bulk-dialog"><DialogHeader><DialogTitle>Record bulk version update</DialogTitle><DialogDescription>Create a separate immutable history record for each selected asset.</DialogDescription></DialogHeader><form onSubmit={applyBulk}><div className="selected-assets">{selected.map(r => <span key={r.id}>{r.asset}<small>{r.name}</small></span>)}</div><div className="form-grid"><label>New version<input name="version" required placeholder="e.g. 1.21.0" /></label><label>Installation date<input name="date" type="date" defaultValue="2026-09-11" required /></label><label>Technician<input name="technician" required placeholder="Name or service ID" /></label><label>Verification result<select name="result"><option>Verified — passed</option><option>Installed — awaiting verification</option><option>Verification failed</option></select></label><label className="wide">Update package reference<input name="package" placeholder="Package ID, ticket, or approved source" /></label><label className="wide">Supporting document or screenshot<input name="evidence" type="file" accept="image/*,.pdf" /></label><label className="wide">Notes<textarea name="notes" placeholder="Non-sensitive installation and verification notes only" /></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button><Button type="submit">Save {selected.length} history records</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

function Metric({label,value,note,icon:Icon,style}:{label:string;value:string;note:string;icon:typeof Gauge;style:string}) { return <article className={`metric ${style}`}><div><p>{label}</p><strong>{value}</strong><span>{note}</span></div><Icon /></article>; }
function BaselineView({compact=false}:{compact?:boolean}) { const rows = [["GETAC B360 · SIPR","23H2 / BIOS 1.21",88],["AN/PRC-163 · Mission","Waveform 6.2.1",75],["HP ZBook 15 · NIPR","23H2 / ENS 10.7",64]] as const; return <section className={`panel ${compact?"compact":"tab-panel"}`}><div className="panel-head"><div><h2>Approved baseline progress</h2><p>Applied by model, NSN, classification, and mission profile</p></div><button>Manage baselines</button></div><div className="baseline-list">{rows.map(([name,version,pct])=><div key={name}><div><strong>{name}</strong><span>{version}</span><b>{pct}%</b></div><Progress value={pct} /></div>)}</div></section> }
function VersionGroups({groups,compact=false}:{groups:readonly (readonly [string,number,number,string])[];compact?:boolean}) { return <section className={`panel ${compact?"compact":"tab-panel"}`}><div className="panel-head"><div><h2>Equipment by installed version</h2><p>Concentration and rollout progress</p></div><button>View all</button></div><div className="version-list">{groups.map(([version,count,total,name])=><div key={version}><span className="version-icon"><Radio /></span><div><strong>{name}</strong><code>{version}</code></div><p><b>{count}</b> / {total}</p><Progress value={count/total*100}/></div>)}</div></section> }
function AssetsView({rows}:{rows:ComponentRow[]}) { const assets = Array.from(new Map(rows.map(r => [r.asset,r])).values()); return <><div className="section-intro"><div><p className="eyebrow">FLEET CONFIGURATION</p><h2>Asset software readiness</h2><p>Readiness reflects every applicable component and its assigned mission baseline.</p></div><Button><Plus/>Add asset</Button></div><div className="asset-grid">{assets.map(asset => { const components=rows.filter(r=>r.asset===asset.asset); const bad=components.find(r=>["Update Required","Version Unknown","Verification Overdue"].includes(r.status)); return <article className="asset-card" key={asset.asset}><div><span className="asset-icon"><Laptop2/></span><span className={`status ${tone[bad?.status || "Current"]}`}><i/>{bad ? "Attention" : "Ready"}</span></div><h3>{asset.asset}</h3><p>{asset.model} · {asset.serial}</p><dl><div><dt>Network</dt><dd>{asset.network}</dd></div><div><dt>Components</dt><dd>{components.length}</dd></div><div><dt>Issues</dt><dd>{components.filter(r=>r.status!=="Current").length}</dd></div></dl><button>Open software record →</button></article>})}</div></> }
function DeploymentView() { const [decisions,setDecisions]=useState<Record<string,"Block"|"Warning">>({"RAVEN-021":"Block","FALCON-118":"Block","ATLAS-033":"Warning"}); const issues=[["RAVEN-021","GETAC B360 · SIPR","BIOS 1.18.0","Required 1.21.0","Update Required"],["FALCON-118","AN/PRC-163 · Mission","Sierra II version unknown","Required 6.2.1","Version Unknown"],["ATLAS-033","HP ZBook 15 · NIPR","Trellix ENS 10.7.0.7034","Verification overdue","Verification Overdue"]] as const; return <><div className="section-intro deployment-title"><div><p className="eyebrow">OPERATION NORTHSTAR · 16 SEP 2026</p><h2>Deployment software gate</h2><p>Authorized readiness managers determine whether each issue blocks movement or remains a documented warning.</p></div><span className="status status-required"><i/>3 equipment issues</span></div><section className="panel"><div className="deployment-summary"><div><small>EQUIPMENT SELECTED</small><strong>18</strong></div><div><small>SOFTWARE READY</small><strong>15</strong></div><div><small>BLOCKING ISSUES</small><strong className="red">{Object.values(decisions).filter(v=>v==="Block").length}</strong></div><div><small>DOCUMENTED WARNINGS</small><strong className="amber">{Object.values(decisions).filter(v=>v==="Warning").length}</strong></div></div><div className="decision-list">{issues.map(([asset,model,component,requirement,status])=><article key={asset}><span className="alert-icon"><AlertTriangle/></span><div><h3>{asset}<small>{model}</small></h3><p>{component}<b>{requirement}</b></p><span className={`status ${tone[status]}`}><i/>{status}</span></div><fieldset><legend>Deployment decision</legend><label className={decisions[asset]==="Block"?"chosen":""}><input type="radio" name={asset} checked={decisions[asset]==="Block"} onChange={()=>setDecisions({...decisions,[asset]:"Block"})}/>Block</label><label className={decisions[asset]==="Warning"?"chosen":""}><input type="radio" name={asset} checked={decisions[asset]==="Warning"} onChange={()=>setDecisions({...decisions,[asset]:"Warning"})}/>Warning</label></fieldset><button className="rationale">Add rationale</button></article>)}</div><div className="report-footer"><p><ShieldCheck/> Decisions are attributed, time-stamped, and included in the deployment readiness report.</p><Button variant="outline"><Download/>Export readiness report</Button></div></section></> }
function ComponentForm({onDone}:{onDone:()=>void}) { return <form className="form-grid" onSubmit={(e)=>{e.preventDefault();onDone();}}><label>Asset<input required placeholder="Asset tag or serial" /></label><label>Component type<select><option>Operating system</option><option>Firmware</option><option>BIOS</option><option>Radio waveform</option><option>Application</option><option>Driver</option><option>Security package</option><option>Other</option></select></label><label className="wide">Software or firmware name<input required /></label><label>Installed version<input required /></label><label>Approved version<input /></label><label>Installation date<input type="date" /></label><label>Last verified<input type="date" /></label><label>Verification method<input /></label><label>Verified by<input /></label><label className="wide">Package reference<input /></label><label>Classification / network<select><option>NIPR</option><option>SIPR</option><option>Standalone</option><option>Mission</option></select></label><label>Supporting evidence<input type="file" /></label><label className="wide">Notes<textarea /></label><Button type="submit" className="wide">Validate component record</Button></form> }
