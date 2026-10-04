import React, {useId} from 'react';
export default function StudioTabs({items,value,onChange,label='Studio tools'}) {
 const name=useId();
 return <div className="studio-tabs flex-wrap" role="tablist" aria-label={label}>{items.map((item,index)=><label key={item.id} role="tab" tabIndex={value===item.id?0:-1} aria-selected={value===item.id} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();onChange(e.key==='ArrowLeft'?items[(index-1+items.length)%items.length].id:e.key==='ArrowRight'?items[(index+1)%items.length].id:item.id);}}}><input type="radio" name={name} value={item.id} checked={value===item.id} onChange={()=>onChange(item.id)}/><span>{item.label}</span></label>)}</div>;
}