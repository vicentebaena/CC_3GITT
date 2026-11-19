/* Offline ES/EN interface translation. Model state and input values are untouched. */
(function(root){
'use strict';
const catalog=typeof module!=='undefined'&&module.exports?require('./translations.js'):root.AppTranslations;
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fragments=Object.keys(catalog).filter(k=>k.length>=3).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(fragments.map(escape).join('|'),'gu');
function translate(value,language='en'){
 const source=String(value),key=source.trim();if(language==='es'||!key)return source;
 if(Object.hasOwn(catalog,key))return source.slice(0,source.indexOf(key))+catalog[key]+source.slice(source.indexOf(key)+key.length);
 return source.replace(pattern,match=>catalog[match]);
}
if(typeof module!=='undefined'&&module.exports){module.exports={translate,catalog};return;}
let language='en';try{const saved=localStorage.getItem('cc3gitt-language');if(saved==='es'||saved==='en')language=saved;}catch{/* Storage may be unavailable for local files. */}
const textSources=new WeakMap(),attributeSources=new WeakMap();
const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt']};
function skipped(node){return node.parentElement?.closest('script,style,code,pre,#languageSelect');}
function updateText(node){if(skipped(node))return;const current=node.nodeValue,previous=textSources.get(node),source=previous&&previous.output===current?previous.source:current,output=translate(source,language);textSources.set(node,{source,output});if(current!==output)node.nodeValue=output;}
function updateAttributes(el){if(el.tagName==='OPTION'&&el.closest('#languageSelect'))return;const saved=attributeSources.get(el)||{};for(const name of options.attributeFilter){if(!el.hasAttribute(name))continue;const current=el.getAttribute(name),previous=saved[name],source=previous&&previous.output===current?previous.source:current,output=translate(source,language);saved[name]={source,output};if(current!==output)el.setAttribute(name,output);}attributeSources.set(el,saved);}
function apply(node){if(node.nodeType===Node.TEXT_NODE){updateText(node);return;}if(node.nodeType!==Node.ELEMENT_NODE)return;updateAttributes(node);const walker=document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let child;while((child=walker.nextNode())){if(child.nodeType===Node.TEXT_NODE)updateText(child);else updateAttributes(child);}}
const observer=new MutationObserver(mutations=>{observer.disconnect();try{for(const m of mutations){if(m.type==='characterData')updateText(m.target);else if(m.type==='attributes')updateAttributes(m.target);else for(const node of m.addedNodes)apply(node);}}finally{observer.observe(document.body,options);}});
function setLanguage(next){language=next==='es'?'es':'en';try{localStorage.setItem('cc3gitt-language',language);}catch{}
 document.documentElement.lang=language;document.title=translate('CC 3GITT · Laboratorio PLL',language);const select=document.getElementById('languageSelect');if(select)select.value=language;
 observer.disconnect();apply(document.body);observer.observe(document.body,options);window.dispatchEvent(new CustomEvent('app-language-change',{detail:{language}}));
}
root.I18n={t:value=>translate(value,language),setLanguage,get language(){return language;}};
document.documentElement.lang=language;
function init(){document.getElementById('languageSelect').addEventListener('change',event=>setLanguage(event.target.value));setLanguage(language);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
