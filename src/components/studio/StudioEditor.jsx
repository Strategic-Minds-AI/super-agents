import React,{useEffect,useState} from 'react';
import {Undo2,Redo2,Layers,MousePointer2} from 'lucide-react';
import useStudioCanvas from '@/components/studio/useStudioCanvas';
import StudioTabs from '@/components/studio/StudioTabs';
import StudioCanvasViewport from '@/components/studio/StudioCanvasViewport';
import StudioInspector from '@/components/studio/StudioInspector';
import StudioSeoPanel from '@/components/studio/StudioSeoPanel';
import StudioDomainPanel from '@/components/studio/StudioDomainPanel';
import StudioAuditPanel from '@/components/studio/StudioAuditPanel';
const tools=[{id:'design',label:'Design'},{id:'seo',label:'SEO'},{id:'domain',label:'Domain'},{id:'audit',label:'Audit'}];
export default function StudioEditor({studio}) {
 const [device,setDevice]=useState('desktop'),[tool,setTool]=useState('design'),[outline,setOutline]=useState(false);
 const canvas=useStudioCanvas(studio.source,studio.active.deployment_url||studio.active.result,studio.changed);
 useEffect(()=>{studio.editor.current=canvas;return()=>{studio.editor.current=null;};},[canvas,studio.editor]);
 return <div className="studio-editor"><section className="min-w-0 flex flex-col"><div className="studio-canvas-toolbar"><div className="flex items-center gap-1"><button className="studio-icon" disabled={!canvas.canUndo} onClick={canvas.undo} aria-label="Undo edit"><Undo2 size={17}/></button><button className="studio-icon" disabled={!canvas.canRedo} onClick={canvas.redo} aria-label="Redo edit"><Redo2 size={17}/></button><button className="studio-icon" onClick={()=>setOutline(v=>!v)} aria-pressed={outline} aria-label="Show page sections"><Layers size={17}/></button></div><StudioTabs items={[{id:'desktop',label:'Desktop'},{id:'tablet',label:'Tablet'},{id:'mobile',label:'Mobile'}]} value={device} onChange={setDevice} label="Preview size"/></div>{outline&&<nav className="studio-section-list" aria-label="Page sections">{canvas.sections.map(section=><button key={section.id} onClick={()=>{canvas.select(section.id);canvas.frame.current?.contentDocument?.querySelector(`[data-studio-node="${section.id}"]`)?.scrollIntoView({block:'start'});}}>{section.label}</button>)}</nav>}<StudioCanvasViewport canvas={canvas} device={device}/><div className="studio-canvas-footer"><MousePointer2 size={14}/><span>Click to select · Double-click text to edit · Save draft before publishing</span></div></section><aside className="studio-inspector"><StudioTabs items={tools} value={tool} onChange={setTool} label="Editing tools"/><div className="mt-5" role="tabpanel" aria-label={tools.find(t=>t.id===tool).label}>{tool==='design'&&<StudioInspector canvas={canvas}/>} {tool==='seo'&&<StudioSeoPanel canvas={canvas}/>} {tool==='domain'&&<StudioDomainPanel site={studio.active} onUpdate={studio.updateActive}/>} {tool==='audit'&&<StudioAuditPanel site={studio.active} onUpdate={studio.updateActive}/>}</div></aside></div>;
}