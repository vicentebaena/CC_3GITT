'use strict';
(function(){
const buttons=[...document.querySelectorAll('[data-lab]')];
const labs={
 synth:{id:'synthLab',hash:'#sintetizador',intro:'Sintetizador de frecuencia · ejemplo ADF4351',render:()=>window.SynthLab.render()},
 fm:{id:'fmLab',hash:'#fm',intro:'Demodulación FM · seguimiento y recuperación del mensaje',render:()=>window.FMLab.render()},
 costas:{id:'costasLab',hash:'#costas',intro:'Recuperación de portadora BPSK · lazo de Costas',render:()=>window.CostasLab.render()},
 clock:{id:'clockLab',hash:'#clock',intro:'Recuperación de reloj BPSK · Gardner',render:()=>window.ClockLab.render()}
};
function activate(name){
 Object.entries(labs).forEach(([key,lab])=>{document.getElementById(lab.id).hidden=key!==name;});
 buttons.forEach(b=>{const selected=b.dataset.lab===name;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
 document.getElementById('labIntro').textContent=labs[name].intro;window.SynthLab.pause();labs[name].render();
}
function select(name){activate(name);history.replaceState(null,'',labs[name].hash);}
buttons.forEach((b,index)=>{b.addEventListener('click',()=>select(b.dataset.lab));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%buttons.length;else if(e.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();select(buttons[next].dataset.lab);buttons[next].focus();});});
window.addEventListener('app-language-change',()=>{window.SynthLab.render();window.FMLab.render();window.CostasLab.render();window.ClockLab.render();});
activate(Object.keys(labs).find(key=>labs[key].hash===location.hash)||'synth');
})();
