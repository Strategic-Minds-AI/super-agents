import React,{useEffect,useRef,useState} from 'react';
export default function StudioCanvasViewport({canvas,device}) {
 const box=useRef(null),[available,setAvailable]=useState(800);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setAvailable(Math.max(100,entries[0].contentRect.width-32)));observer.observe(box.current);return()=>observer.disconnect();},[]);
 const width={desktop:1280,tablet:768,mobile:390}[device],scale=Math.min(1,available/width);
 return <div ref={box} className="studio-canvas" aria-label="Website editing canvas"><div className="studio-canvas-frame" style={{width:width*scale,height:Math.max(520,660*scale)}}><iframe ref={canvas.frame} sandbox="allow-same-origin" srcDoc={canvas.srcDoc} onLoad={canvas.load} title={`${device} website editor — click an element to select it`} style={{width,height:Math.max(660,520/scale),transform:`scale(${scale})`,transformOrigin:'top left',border:0}}/></div></div>;
}