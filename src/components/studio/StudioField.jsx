import React, {useId} from 'react';
export default function StudioField({label,value,onChange,type='text',multiline=false,...props}) {
 const id=useId();
 return <div className="space-y-1.5"><label htmlFor={id} className="block text-xs font-semibold text-foreground">{label}</label>{multiline?<textarea id={id} className="studio-field min-h-24 resize-y" value={value} onChange={e=>onChange(e.target.value)} {...props}/>:<input id={id} className="studio-field" type={type} value={value} onChange={e=>onChange(e.target.value)} {...props}/>}</div>;
}