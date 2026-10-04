import React,{useEffect,useState} from 'react';
import StudioField from '@/components/studio/StudioField';
export default function StudioUrlField({label,value,onApply,image=false}) {
 const [draft,setDraft]=useState(value),[error,setError]=useState('');
 useEffect(()=>{setDraft(value);setError('');},[value]);
 const apply=()=>{if(draft&&!(image?/^https:\/\//i:/^(https:\/\/|\/|#|mailto:|tel:)/i).test(draft)){setError(image?'Use an HTTPS image address.':'Use an HTTPS address, section link, email or phone link.');return;}setError('');onApply(draft);};
 return <div><StudioField label={label} value={draft} onChange={setDraft} onBlur={apply} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply();}}} placeholder={image?'https://…':'https://… or #contact'}/>{error&&<p role="alert" className="text-xs mt-2">{error}</p>}</div>;
}