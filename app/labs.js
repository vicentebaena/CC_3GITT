'use strict';
(function(){
const buttons=[...document.querySelectorAll('[data-lab]')];
function activate(name){
 const fm=name==='fm';document.getElementById('synthLab').hidden=fm;document.getElementById('fmLab').hidden=!fm;
 buttons.forEach(b=>{const selected=b.dataset.lab===name;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));});
 document.getElementById('labIntro').textContent=fm?'Demodulación FM · seguimiento y recuperación del mensaje':'Sintetizador de frecuencia · ejemplo ADF4351';
 window.SynthLab.pause();if(fm)window.FMLab.render();else window.SynthLab.render();
}
buttons.forEach(b=>b.addEventListener('click',()=>{activate(b.dataset.lab);history.replaceState(null,'',b.dataset.lab==='fm'?'#fm':'#sintetizador');}));
activate(location.hash==='#fm'?'fm':'synth');
})();
