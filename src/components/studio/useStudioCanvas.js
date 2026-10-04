import { useEffect, useRef, useState } from 'react';
import { canvasDocument, serializeDocument, applyDocumentMetadata, cssHex } from '@/components/studio/studioDocument';

export default function useStudioCanvas(source,liveUrl,onChange) {
  const frame=useRef(null), history=useRef([source]), position=useRef(0), original=useRef(source), selectedRef=useRef(null);
  const [renderHtml,setRenderHtml]=useState(source),[selected,setSelected]=useState(null),[sections,setSections]=useState([]),[theme,setTheme]=useState([]),[revision,setRevision]=useState(0);
  const doc=()=>frame.current?.contentDocument;
  const html=()=>doc()?.body?serializeDocument(doc(),original.current):history.current[position.current];
  const commit=()=>{const next=html();if(next===history.current[position.current])return;history.current=history.current.slice(0,position.current+1).concat(next).slice(-40);position.current=history.current.length-1;setRevision(v=>v+1);onChange(next);};
  const describe=el=>{const style=frame.current.contentWindow.getComputedStyle(el);setSelected({id:el.dataset.studioNode,tag:el.tagName.toLowerCase(),text:el.textContent||'',src:el.getAttribute('src')||'',alt:el.getAttribute('alt')||'',href:el.getAttribute('href')||'',color:cssHex(style.color),background:cssHex(style.backgroundColor),fontSize:parseFloat(style.fontSize),padding:parseFloat(style.paddingTop)});};
  const select=id=>{const el=doc()?.querySelector(`[data-studio-node="${id}"]`);if(!el)return;doc().querySelectorAll('[data-studio-selected]').forEach(n=>n.removeAttribute('data-studio-selected'));el.dataset.studioSelected='true';selectedRef.current=el;describe(el);};
  const load=()=>{
    const document=doc();if(!document)return;
    document.querySelectorAll('body,header,nav,section,footer,h1,h2,h3,h4,h5,h6,p,a,button,span,li,blockquote,img,label').forEach((el,index)=>el.dataset.studioNode=String(index));
    setSections([...document.querySelectorAll('header,main>section,body>section,footer')].map(el=>({id:el.dataset.studioNode,label:el.querySelector('h1,h2,h3')?.textContent?.slice(0,45)||el.id||el.tagName.toLowerCase()})));
    const vars=[...document.querySelectorAll('style')].map(el=>el.textContent).join('\n').matchAll(/(--[a-z][a-z0-9_-]*)\s*:\s*([^;}\n]+)/gi);
    const colors=new Map();for(const match of vars){const val=document.defaultView.getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();if(/^(#|rgb)/i.test(val))colors.set(match[1],cssHex(val));}setTheme([...colors].map(([name,value])=>({name,value})));
    document.addEventListener('click',e=>{if(e.target.closest('[contenteditable="true"]'))return;e.preventDefault();const el=e.target.closest('[data-studio-node]');if(el)select(el.dataset.studioNode);});
    document.addEventListener('dblclick',e=>{const el=e.target.closest('[data-studio-node]');if(el&&!/^(IMG|BODY|SECTION|HEADER|NAV|FOOTER)$/.test(el.tagName)){el.contentEditable='true';el.focus();}});
    document.addEventListener('focusout',e=>{if(e.target.getAttribute('contenteditable')==='true'){e.target.removeAttribute('contenteditable');commit();describe(e.target);}});
    document.addEventListener('submit',e=>e.preventDefault());
    selectedRef.current=null;setSelected(null);
  };
  const patch=(field,value)=>{const el=selectedRef.current;if(!el)return;if(field==='text')el.textContent=value;else if(['src','href'].includes(field)){if(value&&!/^(https:\/\/|\/|#|mailto:|tel:)/i.test(value))return;el.setAttribute(field,value);if(field==='src'){el.removeAttribute('srcset');el.removeAttribute('sizes');}}else if(field==='alt')el.setAttribute('alt',value);else el.style[field]=['fontSize','padding'].includes(field)?`${Number(value)}px`:value;describe(el);commit();};
  const changeTheme=(name,value)=>{doc().documentElement.style.setProperty(name,value);setTheme(t=>t.map(v=>v.name===name?{...v,value}:v));commit();};
  const meta=value=>{if(!doc())return;applyDocumentMetadata(doc(),value);commit();};
  const travel=direction=>{const index=position.current+direction;if(index<0||index>=history.current.length)return;position.current=index;setRenderHtml(history.current[index]);setRevision(v=>v+1);onChange(history.current[index]);};
  useEffect(()=>{history.current=[source];position.current=0;original.current=source;setRenderHtml(source);},[source]);
  return {frame,srcDoc:canvasDocument(renderHtml,liveUrl),load,selected,sections,theme,patch,changeTheme,meta,html,select,undo:()=>travel(-1),redo:()=>travel(1),canUndo:position.current>0,canRedo:position.current<history.current.length-1,revision};
}