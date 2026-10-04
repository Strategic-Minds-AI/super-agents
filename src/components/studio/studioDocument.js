export function parseDocument(html) { return new DOMParser().parseFromString(html || '', 'text/html'); }
export function documentMetadata(html) {
  const doc=parseDocument(html);
  return {meta_title:doc.title,meta_description:doc.querySelector('meta[name="description"]')?.content||'',canonical_url:doc.querySelector('link[rel="canonical"]')?.getAttribute('href')||'',indexable:!(/noindex/i.test(doc.querySelector('meta[name="robots"]')?.content||''))};
}
export function applyDocumentMetadata(doc, value) {
  doc.title=value.meta_title;
  for(const [name,content] of [['description',value.meta_description],['robots',value.indexable?'index, follow':'noindex, nofollow']]) {
    let el=doc.querySelector(`meta[name="${name}"]`); if(!el){el=doc.createElement('meta');el.name=name;doc.head.append(el);} el.content=content;
  }
  for(const [property,content] of [['og:title',value.meta_title],['og:description',value.meta_description]]) {
    let el=doc.querySelector(`meta[property="${property}"]`); if(!el){el=doc.createElement('meta');el.setAttribute('property',property);doc.head.append(el);} el.content=content;
  }
  let canonical=doc.querySelector('link[rel="canonical"]');
  if(value.canonical_url) {if(!canonical){canonical=doc.createElement('link');canonical.rel='canonical';doc.head.append(canonical);} canonical.href=value.canonical_url;} else canonical?.remove();
}
export function canvasDocument(html, liveUrl) {
  const doc=parseDocument(html);
  doc.querySelectorAll('script').forEach(el=>el.remove());
  if(liveUrl){const base=doc.createElement('base');base.href=liveUrl+'/';base.dataset.studioOnly='true';doc.head.prepend(base);}
  const style=doc.createElement('style');style.dataset.studioOnly='true';
  style.textContent='[data-studio-node]{cursor:pointer!important}[data-studio-node]:hover{outline:1px dashed #777;outline-offset:3px}[data-studio-selected]{outline:2px solid #000!important;outline-offset:4px}[contenteditable="true"]{cursor:text!important}*{animation:none!important;transition:none!important}[style*="opacity: 0"],[style*="opacity:0"],.fade-in,.reveal{opacity:1!important;transform:none!important}';
  doc.head.append(style);
  return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}
export function serializeDocument(doc, original) {
  const clone=doc.documentElement.cloneNode(true);
  clone.querySelectorAll('[data-studio-only]').forEach(el=>el.remove());
  clone.querySelectorAll('*').forEach(el=>{for(const attr of [...el.attributes])if(attr.name.startsWith('data-studio-')||attr.name==='contenteditable')el.removeAttribute(attr.name);});
  parseDocument(original).querySelectorAll('script').forEach(script=>{(script.type==='application/ld+json'?clone.querySelector('head'):clone.querySelector('body')).append(script.cloneNode(true));});
  return '<!DOCTYPE html>\n'+clone.outerHTML;
}
export function cssHex(value) {
  if(/^#[a-f0-9]{6}$/i.test(value))return value;
  if(/^#[a-f0-9]{3}$/i.test(value))return '#'+value.slice(1).split('').map(c=>c+c).join('');
  const rgb=value?.match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);return rgb?'#'+rgb.slice(1,4).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#ffffff';
}