/* The FM laboratory owns its controls, state, model and canvas. */
(function(){
'use strict';
const byId=id=>document.getElementById(id),canvas=byId('fmPlot'),ctx=canvas.getContext('2d');
const palette={text:'#eef8f6',muted:'#a7bbb7',grid:'#c7e7e222',cyan:'#48d6c8',lime:'#c8f560',amber:'#ffc857',coral:'#ff6b5f',blue:'#7cb7ff'};
const ids={carrier:'fmCarrier',message:'fmMessage',deviation:'fmDeviation',offset:'fmOffset',fn:'fmFn',zeta:'fmZeta',type:'fmType',wave:'fmWave',noise:'fmNoise',snr:'fmSnr',kvco:'fmKvco',phase:'fmPhase',duration:'fmDuration'};
let params={...FM.defaults},result=FM.simulate(params),view='message';
const help={
 preset:['Ejemplos FM','Compara seguimiento cómodo de un mensaje de 1 kHz, desviación de ±75 kHz con mensaje de 15 kHz y un lazo demasiado estrecho. El ejemplo de 15 kHz representa una señal mono ideal, sin preénfasis ni estéreo.'],
 wave:['Forma del mensaje','El mensaje tiene pico normalizado a 1. En dos tonos se suma un tono de frecuencia triple con amplitud 0,4 y se divide por 1,4. Su banda llega hasta 3fₘ.'],
 message:['Frecuencia del mensaje','Al aumentar fₘ, el lazo debe corregir la frecuencia con mayor rapidez. Mantén la ventana temporal y fₙ para observar el retardo y la deformación del mensaje recuperado.'],
 deviation:['Desviación de pico Δf','Fija cuánto se aparta la frecuencia instantánea de la portadora. Aumentar Δf exige mayor excursión de control y puede sobrecargar el detector de fase. β = Δf/fₘ para el mensaje sinusoidal.'],
 type:['Tipo del lazo','El tipo 1 usa corrección proporcional: necesita un error de fase para mantener una desviación de frecuencia constante. El tipo 2 añade un integrador mediante un filtro PI y puede mantenerla con error de fase nulo. Ambos pueden demodular FM.'],
 fn:['Rapidez y ancho de banda','En tipo 2, fₙ es la frecuencia natural y no coincide con el ancho de banda; manteniendo ζ, reducirla estrecha la banda y ralentiza el seguimiento. Una banda demasiado estrecha deforma el mensaje; una muy ancha deja pasar más ruido. En tipo 1, este control es directamente la frecuencia de corte f꜀ del modelo lineal.'],
 zeta:['Amortiguamiento del tipo 2','Regula la sobreoscilación del lazo PI. No se utiliza en tipo 1. ζ ≈ 0,707 es una elección inicial habitual.'],
 offset:['Desajuste de portadora','Diferencia entre la portadora recibida y el VCO libre. Aparece como componente continua en la tensión de control. La comparación del mensaje retira ese valor conocido, para mostrar la parte de modulación.'],
 noise:['Ruido en la entrada','Se añade ruido gaussiano circular a la envolvente compleja antes del detector. Es ruido de señal recibida, no una perturbación añadida directamente al mensaje recuperado. La semilla fija facilita comparar parámetros.'],
 snr:['SNR de la señal recibida','Relación entre potencia de señal y ruido complejo dentro de la banda equivalente de simulación de 1 MHz (muestreo de 2 MHz). Activa AWGN para aplicar este control. No es una SNR de audio ni una predicción de un receptor concreto.'],
 carrier:['Frecuencia de portadora','Sitúa la señal recibida en RF. El cálculo usa la fase incremental, por eso mover la portadora conservando el desajuste no cambia la demodulación en este modelo.'],
 kvco:['Ganancia del VCO','Convierte la desviación de frecuencia en tensión de control. El filtro se reajusta para mantener la dinámica elegida: cambiar Kᵥ꜀ₒ modifica la escala en voltios, sin alterar el mensaje recuperado normalizado. La tensión se representa respecto al punto de polarización.'],
 phase:['Error de fase inicial','Fase de la entrada menos fase del VCO al comenzar la ventana. Modifica el transitorio inicial. El detector responde al seno del error y puede perder ciclos si se exige demasiado al lazo.'],
 duration:['Ventana temporal fija','Se conserva al variar los parámetros: así un lazo más lento ocupa más tiempo en la gráfica. Usa 1 ms para ver detalles rápidos y ventanas mayores para mensajes lentos. El error RMS usa la segunda mitad de esta ventana.']
};
const descriptions={
 diagram:['El PLL como demodulador','La salida útil está en la tensión de control, antes del VCO.','De fase a frecuencia y a tensión','El detector compara fases; el filtro y el VCO cierran el lazo. Cuando el VCO sigue la frecuencia instantánea, v꜀ contiene el desajuste de continua y el mensaje escalado.','v꜀(t) ≈ [fportadora − fVCO,libre + Δf·m(t)] / Kᵥ꜀ₒ','Añade desajuste de portadora y observa la componente continua de la tensión en la vista Lazo.'],
 message:['Mensaje original y recuperado','Escala fija de −1,2 a +1,2. Señal deseada discontinua sobre la demodulada, sin corregir ganancia ni retardo.','Seguir el mensaje sin dejar pasar todo el ruido','El mensaje recuperado se obtiene de la tensión de control. Se retira el desajuste de continua conocido y se escala por Kᵥ꜀ₒ/Δf. El error incluye retardo, deformación y ruido.','m̂(t) = [Kᵥ꜀ₒ·v꜀(t) − Δf₀] / Δf','Reduce la rapidez del lazo manteniendo el mensaje: observa cómo aumenta el retardo o se deforma la salida. Compara con y sin ruido, y después un lazo ancho con uno estrecho.'],
 frequency:['Seguimiento de frecuencia instantánea','Entrada y VCO, referidos a la frecuencia libre del VCO.','La tensión de control ajusta la frecuencia','En esta gráfica se resta a ambas señales la frecuencia libre del VCO. Si se superponen, el VCO está siguiendo la modulación. Un error de fase constante también permite seguir una frecuencia constante.','fentrada(t) − fVCO,libre = Δf₀ + Δf·m(t)','Sube la desviación y baja fₙ. ¿En qué zonas de la modulación deja de seguir el VCO a la entrada?'],
 loop:['Qué ocurre dentro del lazo','Error de fase, salida del detector y tensión de control.','La no linealidad del detector limita el seguimiento','El detector entrega sin(φₑ). Cerca de cero es aproximadamente lineal; a errores grandes ya no aumenta proporcionalmente y pueden aparecer deslizamientos de ciclo. El filtro PI conserva el ajuste de frecuencia.','Detector: d(t) = sin[φₑ(t) + ruido de fase de entrada]','Compara los tipos 1 y 2 con desajuste de portadora. Observa el error medio de fase y la tensión continua necesaria para compensarlo.']
};
function text(s,x,y,color='text',size=18,align='left'){ctx.fillStyle=palette[color];ctx.font=`${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(s,x,y);}
function line(x1,y1,x2,y2,color='grid',width=1,dash=[]){ctx.strokeStyle=palette[color];ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function arrow(x1,y1,x2,y2,color='cyan'){line(x1,y1,x2,y2,color,2);const a=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-10*Math.cos(a-.4),y2-10*Math.sin(a-.4),color,2);line(x2,y2,x2-10*Math.cos(a+.4),y2-10*Math.sin(a+.4),color,2);}
function block(x,y,w,title,value,color='cyan'){ctx.fillStyle='#102328';ctx.fillRect(x,y,w,90);ctx.strokeStyle=palette[color];ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,90);text(title,x+w/2,y+32,'text',20,'center');text(value,x+w/2,y+64,color,18,'center');}
function range(values){let lo=Math.min(...values),hi=Math.max(...values);if(hi-lo<1e-9){lo-=.5;hi+=.5;}const pad=(hi-lo)*.12;return [lo-pad,hi+pad];}
function plotRow(y,h,title,curves,{fixedRange=null}={}){
 const x=110,w=930,values=curves.flatMap(c=>result.samples.map(c.get));const [lo,hi]=fixedRange || range(values);
 const sy=v=>y+h-(v-lo)/(hi-lo)*h;text(title,x,y-17,'text',20);
 for(let j=0;j<=4;j++){let yy=y+h-j*h/4;line(x,yy,x+w,yy);text((lo+(hi-lo)*j/4).toFixed(hi-lo>20?0:hi-lo>2?1:2),x-12,yy+5,'muted',16,'right');}
 for(let j=0;j<=5;j++){const xx=x+j*w/5;line(xx,y,xx,y+h);text((params.duration*1000*j/5).toFixed(1)+' ms',xx,y+h+26,'muted',16,'center');}
 if(lo<0&&hi>0)line(x,sy(0),x+w,sy(0),'muted',1,[5,5]);
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 for(const c of curves){ctx.beginPath();result.samples.forEach((s,j)=>{const xx=x+w*s.t/params.duration,yy=sy(c.get(s));j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);});ctx.setLineDash(c.dash || []);if(c.halo){ctx.strokeStyle='#071013';ctx.lineWidth=6;ctx.stroke();}ctx.strokeStyle=palette[c.color];ctx.lineWidth=c.width || 2.4;ctx.stroke();}ctx.restore();
}
function legend(items,y){let x=110;for(const [label,color,dash=[]] of items){line(x,y-6,x+25,y-6,color,3,dash);text(label,x+34,y,'muted',17);x+=label.length*9+85;}}
function drawDiagram(){
 text('DEMODULADOR FM · PLL GENÉRICO',60,55,'lime',18);text(`Portadora ${params.carrier.toFixed(0)} MHz · Δf = ±${params.deviation} kHz`,60,103,'text',24);
 block(60,220,180,'Señal FM','f꜀ + Δf·m(t)');block(300,220,180,'Detector','sin(φₑ)');block(540,220,180,'Filtro',params.type==='2'?'PI · tipo 2':'P · tipo 1');block(800,220,200,'VCO',`K = ${params.kvco} kHz/V`,'lime');
 arrow(240,265,300,265);arrow(480,265,540,265);arrow(720,265,800,265);
 line(900,310,900,440,'cyan',2);line(900,440,390,440,'cyan',2);arrow(390,440,390,310);text('Realimentación de fase',665,485,'muted',20,'center');
 line(760,265,760,135,'amber',2);arrow(760,135,975,135,'amber');text('v꜀ · salida demodulada',760,106,'amber',21);
 text(`VCO libre: ${(result.free/1e6).toFixed(3)} MHz`,60,555,'lime',24);text(`Excursión ideal de v꜀: ±${(params.deviation/params.kvco).toFixed(3)} V`,60,603,'amber',22);
 text(`Continua ideal: ${(params.offset/params.kvco).toFixed(3)} V`,60,646,'muted',20);text('La señal recuperada se toma antes del VCO.',60,700,'text',22);
}
function draw(){if(view==='diagram'){drawDiagram();return;}
 if(view==='message'){
  plotRow(70,295,'Mensaje normalizado',[{get:s=>s.recovered,color:'lime'},{get:s=>s.message,color:'text',dash:[10,7],width:2.8,halo:true}],{fixedRange:[-1.2,1.2]});
  legend([['Deseada','text',[10,7]],['Demodulada','lime']],420);
  plotRow(485,155,'Error de recuperación: m̂ − m',[{get:s=>s.recovered-s.message,color:'coral'}]);
  text('Escala fija del mensaje: los picos fuera de rango se aprecian en la gráfica de error',110,712,'muted',17);
 }else if(view==='frequency'){
  plotRow(70,295,'Desviación respecto al VCO libre (kHz)',[{get:s=>s.input,color:'muted'},{get:s=>s.vco,color:'cyan'}]);legend([['Entrada FM','muted'],['VCO','cyan']],420);
  plotRow(485,155,'Error de seguimiento: fentrada − fVCO (kHz)',[{get:s=>s.input-s.vco,color:'coral'}]);
 }else{
  plotRow(60,140,'Error de fase entrada − VCO (rad)',[{get:s=>s.e,color:'cyan'}]);
  plotRow(290,140,'Salida normalizada del detector',[{get:s=>s.detector,color:'coral'}]);
  plotRow(520,140,'Tensión de control respecto a polarización (V)',[{get:s=>s.vc,color:'amber'}]);
 }
}
function sync(){for(const [key,id] of Object.entries(ids)){const el=byId(id);if(key==='noise')el.checked=params.noise;else el.value=params[key];}
 byId('fmMessageOut').textContent=params.message+' kHz';byId('fmDeviationOut').textContent='±'+params.deviation+' kHz';byId('fmFnOut').textContent=params.fn+' kHz';byId('fmZetaOut').textContent=params.zeta.toFixed(2);byId('fmOffsetOut').textContent=(params.offset>0?'+':'')+params.offset+' kHz';byId('fmSnrOut').textContent=params.snr+' dB';byId('fmSnr').disabled=!params.noise;byId('fmZeta').disabled=params.type==='1';
 const label=byId('fmFnLabel');label.firstChild.textContent=params.type==='1'?'Frecuencia de corte f꜀ ':'Frecuencia natural fₙ ';
}
function render(){if(byId('fmLab').hidden)return;
 const d=descriptions[view];byId('fmViewTitle').textContent=d[0];byId('fmViewDescription').textContent=d[1];byId('fmLessonTitle').textContent=d[2];byId('fmLessonText').textContent=d[3];byId('fmFormula').textContent=d[4];byId('fmChallenge').textContent=d[5];
 byId('fmMetricBeta').textContent=result.beta.toFixed(2)+(params.wave==='twoTone'?' (fₘ)':'');byId('fmMetricBand').textContent=(result.messageBandwidth/1000).toFixed(1)+' kHz';byId('fmMetricError').textContent=(result.nrmse*100).toFixed(1)+' %';byId('fmMetricSlips').textContent=result.slips;
 byId('fmSummary').textContent=`${params.noise?'AWGN activado · '+params.snr+' dB':'Sin ruido añadido'} · error RMS = ${result.rmsError.toFixed(3)} · tipo ${params.type}`;
 const warnings=[];if(result.slips)warnings.push('Se han detectado deslizamientos de ciclo: el seguimiento no se mantiene durante toda la ventana.');else if(result.maxError>Math.PI/2)warnings.push('El error supera ±π/2: el detector trabaja fuera de su región monótona.');if(params.duration*params.message*1000<2)warnings.push('La ventana muestra menos de dos períodos del tono fundamental; amplíala para comparar el mensaje.');byId('fmWarning').textContent=warnings.join(' ');
 canvas.setAttribute('aria-label',`${d[0]}. ${d[1]} Ventana ${params.duration*1000} ms, error RMS relativo ${(result.nrmse*100).toFixed(1)} %, ${result.slips} deslizamientos de ciclo.`);
 const ratio=devicePixelRatio||1;canvas.width=Math.round(canvas.clientWidth*ratio);canvas.height=Math.round(canvas.clientHeight*ratio);ctx.setTransform(canvas.width/1100,0,0,canvas.height/740,0,0);ctx.clearRect(0,0,1100,740);draw();
}
function recalculate(){result=FM.simulate(params);sync();render();}
for(const [key,id] of Object.entries(ids))byId(id).addEventListener('input',()=>{const el=byId(id);if(el.type!=='checkbox'&&(el.value===''||!el.checkValidity()))return;params[key]=key==='noise'?el.checked:['type','wave'].includes(key)?el.value:Number(el.value);recalculate();});
function reset(){params={...FM.defaults};const preset=byId('fmPreset').value;if(preset==='broadcast')Object.assign(params,{message:15,deviation:75,fn:80,duration:.001});if(preset==='narrow')Object.assign(params,{message:5,deviation:75,fn:2,duration:.003});recalculate();}
byId('fmPreset').addEventListener('change',reset);byId('fmReset').addEventListener('click',reset);
document.querySelectorAll('[data-fm-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.fmView;document.querySelectorAll('[data-fm-view]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});render();}));
function explain(e){const key=e.target.closest('[data-fm-help]')?.dataset.fmHelp;if(help[key]){byId('fmHelpTitle').textContent=help[key][0];byId('fmHelpText').textContent=help[key][1];}}
byId('fmLab').addEventListener('mouseover',explain);byId('fmLab').addEventListener('focusin',explain);window.addEventListener('resize',render);sync();window.FMLab={render};
})();
