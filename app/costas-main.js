/* The BPSK Costas lab owns its state and canvas. */
(function(){
'use strict';
const byId=id=>document.getElementById(id),canvas=byId('costasPlot'),ctx=canvas.getContext('2d');
const palette={text:'#eef8f6',muted:'#a7bbb7',grid:'#c7e7e222',cyan:'#48d6c8',lime:'#c8f560',amber:'#ffc857',coral:'#ff6b5f',blue:'#7cb7ff'};
const ids={rate:'costasRate',phase:'costasPhase',offset:'costasOffset',fn:'costasFn',zeta:'costasZeta',noise:'costasNoise',snr:'costasSnr',resolve:'costasResolve',duration:'costasDuration'};
let params={...Costas.defaults},result=Costas.simulate(params),view='constellation',interval='tail';
const help={
 preset:['Ejemplos de Costas','Recuperación normal con error inicial de fase y frecuencia; enganche a 180° con bits invertidos; y un lazo demasiado lento para adquirir dentro de la ventana.'],
 rate:['Tasa de símbolos BPSK','Un símbolo transporta un bit. El receptor conoce los instantes de muestreo: este laboratorio recupera la portadora, no el reloj. El lazo actualiza su estimación una vez por símbolo.'],
 phase:['Desfase inicial de la portadora','Fase recibida menos fase del oscilador local al inicio. El lazo de Costas tiene dos soluciones estables separadas 180°. Prueba 60° y 140° sin desajuste de frecuencia para ver qué polaridad recupera.'],
 offset:['Desajuste de frecuencia','Frecuencia de la portadora recibida menos frecuencia libre del oscilador local. Sin corregirla, la constelación gira. El integrador del filtro PI conserva la corrección de frecuencia una vez adquirido el enganche.'],
 fn:['Frecuencia natural','fₙ es la frecuencia natural del modelo lineal alrededor del enganche, no su ancho de banda exacto. Con ζ fijo, reducirla estrecha la banda y ralentiza la adquisición. Una banda mayor responde antes pero admite más ruido. La escala temporal se mantiene fija; fₙ se limita a Rₛ/20.'],
 zeta:['Amortiguamiento','Controla la sobreoscilación cerca del enganche. La adquisición con grandes errores es no lineal: sus tiempos no se deducen sólo de la respuesta lineal de segundo orden.'],
 noise:['Ruido en la señal recibida','Ruido gaussiano circular en las muestras complejas de símbolo, antes de corregir la fase. La semilla fija permite comparar parámetros sobre la misma realización.'],
 snr:['Energía de bit frente al ruido','Eᵦ/N₀ en dB a la salida del filtro adaptado ideal. En BPSK hay un bit por símbolo y Eₛ = Eᵦ. Esta medida es distinta de la SNR en una banda fija usada en FM.'],
 resolve:['Resolver la ambigüedad de 180°','Los primeros 64 símbolos son conocidos. El signo de su correlación con I decide si hay que invertir las decisiones de bits. No se modifica la fase del oscilador ni las ramas I/Q; un piloto mal recibido puede elegir mal la polaridad.'],
 duration:['Ventana temporal fija','Se conserva al modificar la dinámica. Las métricas de fase y frecuencia usan el último cuarto; la BER usa los símbolos posteriores a los 64 de piloto. Amplía la ventana para ver la adquisición de lazos lentos.'],
 interval:['Muestras de la constelación','Compara el primer cuarto con el último sin cambiar los parámetros. Ambas constelaciones usan exactamente los mismos símbolos y escalas. Los colores identifican el signo transmitido, conocido en esta simulación.']
};
const descriptions={
 diagram:['Recuperar una portadora BPSK','Dos ramas en cuadratura eliminan el signo de los datos al formar el error del lazo.','Un detector que no depende del bit','Tras la mezcla y filtrado ideales, I = m·cos φₑ y Q = m·sin φₑ. Como m vale ±1, su producto no depende del signo transmitido. El filtro PI ajusta el oscilador local.','I·Q = m² cos φₑ sin φₑ = ½ sin(2φₑ)','Observa que I·Q se anula en 0° y en 180°. Prueba el ejemplo de ambigüedad y comprueba qué sucede con los bits.'],
 constellation:['Antes y después de corregir la portadora','Mismos símbolos, ejes fijos y colores según el signo transmitido. La constelación corregida muestra I/Q sin resolver polaridad.','Alinear el eje de decisión','El desajuste de frecuencia hace girar los puntos de BPSK. El lazo los lleva al eje I. Una constelación sobre el eje real puede corresponder tanto a bits correctos como a bits invertidos.','zcorregida[k] = zrecibida[k]·exp(−jφ̂[k])','Cambia entre el primer y el último cuarto. Después selecciona Ambigüedad de 180°: observa el intercambio de colores sobre los dos puntos ideales.'],
 data:['Ramas I/Q y decisiones de bits','Últimos 24 símbolos. La referencia deseada se superpone discontinua sobre I; la polaridad sólo corrige las decisiones.','Portadora recuperada, polaridad pendiente','Cuando Q se aproxima a cero, I contiene los símbolos, quizá con signo invertido. El piloto permite invertir las decisiones. Las ramas analógicas siguen mostrando lo que entrega el lazo.','Bit bruto = signo(I) · Bit con piloto = signo(polaridad·I)','Selecciona Ambigüedad de 180°. Compara la BER bruta con la BER al activar el piloto y observa que I/Q no cambian.'],
 acquisition:['Cómo adquiere la portadora','Error de fase sin envolver, corrección de frecuencia y error I·Q sobre una ventana temporal fija.','El lazo corrige fase y frecuencia','El término proporcional responde al error I·Q y el integrador conserva el ajuste de frecuencia. Cerca de 0° o 180° la pendiente normalizada del detector es 1. El ruido hace fluctuar el estado final.','Kp = 2ζωₙ · Ki = ωₙ² · d = I·Q','Reduce fₙ manteniendo la ventana y ζ. Observa cómo tarda más en adquirir o no consigue corregir el desajuste dentro de la ventana.']
};
function text(s,x,y,color='text',size=18,align='left'){ctx.fillStyle=palette[color];ctx.font=`${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(window.I18n.t(s),x,y);}
function line(x1,y1,x2,y2,color='grid',width=1,dash=[]){ctx.strokeStyle=palette[color];ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function arrow(x1,y1,x2,y2,color='cyan'){line(x1,y1,x2,y2,color,2);const a=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-10*Math.cos(a-.4),y2-10*Math.sin(a-.4),color,2);line(x2,y2,x2-10*Math.cos(a+.4),y2-10*Math.sin(a+.4),color,2);}
function block(x,y,w,title,value,color='cyan'){ctx.fillStyle='#102328';ctx.fillRect(x,y,w,90);ctx.strokeStyle=palette[color];ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,90);text(title,x+w/2,y+32,'text',20,'center');text(value,x+w/2,y+64,color,18,'center');}
function range(values){let lo=Math.min(...values),hi=Math.max(...values);if(hi-lo<1e-9){lo-=.5;hi+=.5;}const pad=(hi-lo)*.12;return [lo-pad,hi+pad];}
function legend(items,y){let x=110;for(const [label,color,dash=[]] of items){line(x,y-6,x+25,y-6,color,3,dash);text(label,x+34,y,'muted',17);x+=window.I18n.t(label).length*9+85;}}
function plotRow(y,h,title,samples,curves,{fixedRange=null,steps=false,targets=[]}={}){
 const x=110,w=930,values=curves.flatMap(c=>samples.map(c.get));const [lo,hi]=fixedRange||range(values.concat(targets)),t0=steps?samples[0].n/result.rs:0,t1=steps?(samples.at(-1).n+1)/result.rs:params.duration;
 const sy=v=>y+h-(v-lo)/(hi-lo)*h,sx=t=>x+w*(t-t0)/(t1-t0);text(title,x,y-17,'text',20);
 for(let j=0;j<=4;j++){const yy=y+h-j*h/4;line(x,yy,x+w,yy);text((lo+(hi-lo)*j/4).toFixed(hi-lo>20?0:hi-lo>2?1:2),x-12,yy+5,'muted',16,'right');}
 for(let j=0;j<=5;j++){const xx=x+j*w/5;line(xx,y,xx,y+h);text(((t0+(t1-t0)*j/5)*1000).toFixed(1)+' ms',xx,y+h+26,'muted',16,'center');}
 for(const target of targets)if(target>=lo&&target<=hi)line(x,sy(target),x+w,sy(target),'muted',1,[6,5]);
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(const c of curves){ctx.beginPath();samples.forEach((s,j)=>{const xx=sx(steps?s.n/result.rs:s.t),yy=sy(c.get(s));if(j){if(steps)ctx.lineTo(xx,sy(c.get(samples[j-1])));ctx.lineTo(xx,yy);}else ctx.moveTo(xx,yy);if(steps&&j===samples.length-1)ctx.lineTo(sx((s.n+1)/result.rs),yy);});ctx.setLineDash(c.dash||[]);if(c.halo){ctx.strokeStyle='#071013';ctx.lineWidth=6;ctx.stroke();}ctx.strokeStyle=palette[c.color];ctx.lineWidth=c.width||2.4;ctx.stroke();}ctx.restore();
}
function diagram(){
 text('COSTAS BPSK · RAMAS EN CUADRATURA',55,50,'lime',18);text('Mezcla y filtrado ideales en I y Q',55,90,'muted',21);
 block(50,250,150,'Entrada','BPSK');line(200,295,230,295,'cyan',2);line(230,155,230,405,'cyan',2);arrow(230,155,270,155);arrow(230,405,270,405);
 block(270,110,180,'Rama I','m·cos φₑ');block(270,360,180,'Rama Q','m·sin φₑ','amber');
 line(450,155,685,155,'cyan',2);arrow(685,155,685,235);arrow(685,155,1020,155);text('I · datos',1020,128,'cyan',21,'right');
 line(450,405,685,405,'amber',2);arrow(685,405,685,325,'amber');block(600,235,170,'I × Q','½ sin(2φₑ)','coral');arrow(770,280,850,280,'coral');block(850,235,170,'Filtro PI','Δω estimada');
 line(935,325,935,535,'cyan',2);arrow(935,535,840,535);block(660,490,180,'Oscilador','φ̂ · cuadratura','blue');line(660,535,360,535,'blue',2);arrow(360,535,360,450,'blue');line(360,535,250,535,'blue',2);line(250,535,250,260,'blue',2);line(250,260,360,260,'blue',2);arrow(360,260,360,200,'blue');
 text('cos φ̂',390,235,'blue',18);text('−sin φ̂',390,483,'blue',18);text('Reloj de símbolo conocido · sin recuperación de reloj',55,620,'muted',21);
 text('Dos soluciones estables: φₑ = 0° y φₑ = 180°.',55,680,'text',24);
}
function constellation(){
 const all=result.samples,start=interval==='tail'?Math.floor(all.length*.75):0,end=interval==='start'?Math.ceil(all.length*.25):all.length,samples=all.slice(start,end);
 function panel(x,title,after){const y=125,size=380,limit=1.5,px=v=>x+size*(v+limit)/(2*limit),py=v=>y+size*(limit-v)/(2*limit);text(title,x+size/2,80,'text',23,'center');
  for(const v of [-1.5,-1,-.5,0,.5,1,1.5]){line(px(v),y,px(v),y+size);line(x,py(v),x+size,py(v));if(Number.isInteger(v)){text(String(v),px(v),y+size+27,'muted',17,'center');text(String(v),x-14,py(v)+5,'muted',17,'right');}}
  line(px(0),y,px(0),y+size,'muted',1);line(x,py(0),x+size,py(0),'muted',1);ctx.save();ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();ctx.globalAlpha=.65;
  for(const s of samples){ctx.fillStyle=palette[s.m>0?'cyan':'amber'];ctx.beginPath();ctx.arc(px(after?s.i:s.re),py(after?s.q:s.im),3.3,0,2*Math.PI);ctx.fill();}ctx.restore();
  for(const a of [-1,1]){line(px(a)-8,py(0),px(a)+8,py(0),'text',2,[3,3]);line(px(a),py(0)-8,px(a),py(0)+8,'text',2,[3,3]);}
  text('I',x+size+20,py(0)+7,'text',19);text('Q',px(0)+12,y-14,'text',19);
 }
 panel(100,'Antes del lazo',false);panel(640,'Después del lazo',true);
 legend([['Símbolo +1','cyan'],['Símbolo −1','amber'],['Puntos ideales','text',[3,3]]],580);
 text(`Símbolos ${start+1}–${end} · ${(samples[0].t*1000).toFixed(1)}–${(samples.at(-1).t*1000).toFixed(1)} ms`,110,635,'muted',20);
 text('Ejes fijos ±1,5 · color = signo transmitido, conocido en esta simulación',110,683,'muted',19);
 text('El piloto corrige decisiones; no rota estos puntos.',110,720,'text',19);
}
function draw(){if(view==='diagram')diagram();else if(view==='constellation')constellation();else if(view==='data'){
 const samples=result.samples.slice(-24),resolved=params.resolve&&result.hasPilot;
 plotRow(70,260,'I/Q sin corregir polaridad · últimos 24 símbolos',samples,[{get:s=>s.i,color:'cyan'},{get:s=>s.q,color:'amber'},{get:s=>s.m,color:'text',dash:[10,7],halo:true,width:2.8}],{fixedRange:[-1.5,1.5],steps:true,targets:[0]});
 legend([['I','cyan'],['Q','amber'],['Símbolo deseado','text',[10,7]]],385);
 plotRow(470,160,resolved?'Bits decididos tras el piloto':'Bits decididos sin resolver polaridad',samples,[{get:s=>resolved?s.pilotBit:s.rawBit,color:'cyan'},{get:s=>s.bit,color:'text',dash:[10,7],halo:true,width:2.8}],{fixedRange:[-.25,1.25],steps:true});
 legend([['Bit deseado','text',[10,7]],['Bit decidido','cyan']],695);
 }else{
 const samples=result.samples;plotRow(60,140,'Error de fase entrada − oscilador (°), sin envolver',samples,[{get:s=>s.error*180/Math.PI,color:'cyan'}],{targets:[0]});
 plotRow(290,140,'Corrección de frecuencia estimada (Hz)',samples,[{get:s=>s.frequency,color:'blue'}],{targets:[params.offset]});
 plotRow(520,140,'Detector de fase: I·Q',samples,[{get:s=>s.detector,color:'coral'}],{targets:[0]});
 text('Líneas discontinuas: cero de fase/detector y desajuste de frecuencia objetivo',110,720,'muted',17);
 }}
function sync(){for(const [key,id] of Object.entries(ids)){const el=byId(id);if(['noise','resolve'].includes(key))el.checked=params[key];else el.value=params[key];}
 byId('costasRateOut').textContent=params.rate+' ksym/s';byId('costasPhaseOut').textContent=params.phase+'°';byId('costasOffsetOut').textContent=(params.offset>0?'+':'')+params.offset+' Hz';byId('costasFnOut').textContent=params.fn+' Hz';byId('costasZetaOut').textContent=params.zeta.toFixed(2);byId('costasSnrOut').textContent=params.snr+' dB';byId('costasSnr').disabled=!params.noise;byId('costasFn').max=Math.min(2000,params.rate*50);
}
function percent(v){return v===null?'—':(100*v).toFixed(1)+' %';}
function render(){if(byId('costasLab').hidden)return;const d=descriptions[view];byId('costasViewTitle').textContent=d[0];byId('costasViewDescription').textContent=d[1];byId('costasLessonTitle').textContent=d[2];byId('costasLessonText').textContent=d[3];byId('costasFormula').textContent=d[4];byId('costasChallenge').textContent=d[5];byId('costasIntervalControl').hidden=view!=='constellation';
 byId('costasMetricPhase').textContent=result.rmsPhase.toFixed(2)+'°';byId('costasMetricFrequency').textContent=result.residualFrequency.toFixed(1)+' Hz';byId('costasMetricRaw').textContent=percent(result.rawBer);byId('costasMetricPilot').textContent=params.resolve?percent(result.pilotBer):'Desactivado';
 byId('costasSummary').textContent=`${result.count} símbolos · ${result.preambleLength} de piloto · ${result.payloadCount} para BER · ${params.noise?'AWGN: '+params.snr+' dB':'sin ruido añadido'}`;
 const warnings=[];if(result.rmsPhase>10||Math.abs(result.residualFrequency)>Math.max(20,params.fn*.2))warnings.push('El último cuarto todavía presenta errores de seguimiento importantes; la ventana no confirma el enganche.');else if(result.inverted)warnings.push(params.resolve?(result.polarity<0?'Enganche a 180°: el piloto invierte las decisiones de bits, sin modificar I/Q.':'El piloto no ha corregido la inversión final de los bits; compara la BER bruta y con piloto.'):'Enganche a 180°: la constelación está alineada, pero los bits quedan invertidos. Activa el piloto para resolver la polaridad.');if(!result.payloadCount)warnings.push('La ventana no contiene datos después del piloto de 64 símbolos: amplíala para calcular la BER.');byId('costasWarning').textContent=warnings.join(' ');
 canvas.setAttribute('aria-label',`${d[0]}. ${d[1]} Error RMS de fase ${result.rmsPhase.toFixed(2)} grados, BER bruta ${percent(result.rawBer)}.`);
 const ratio=devicePixelRatio||1;canvas.width=Math.round(canvas.clientWidth*ratio);canvas.height=Math.round(canvas.clientHeight*ratio);ctx.setTransform(canvas.width/1100,0,0,canvas.height/740,0,0);ctx.clearRect(0,0,1100,740);draw();
}
function recalculate(){params.fn=Math.min(params.fn,params.rate*50,2000);result=Costas.simulate(params);sync();render();}
for(const [key,id] of Object.entries(ids))byId(id).addEventListener('input',()=>{const el=byId(id);if(el.type!=='checkbox'&&(el.value===''||!el.checkValidity()))return;params[key]=['noise','resolve'].includes(key)?el.checked:Number(el.value);recalculate();});
function reset(){params={...Costas.defaults};const preset=byId('costasPreset').value;if(preset==='ambiguity')Object.assign(params,{phase:140,offset:0});if(preset==='slow')Object.assign(params,{fn:50,offset:1500});recalculate();}
byId('costasPreset').addEventListener('change',reset);byId('costasReset').addEventListener('click',reset);byId('costasInterval').addEventListener('change',()=>{interval=byId('costasInterval').value;render();});
document.querySelectorAll('[data-costas-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.costasView;document.querySelectorAll('[data-costas-view]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});render();}));
function explain(e){const key=e.target.closest('[data-costas-help]')?.dataset.costasHelp;if(help[key]){byId('costasHelpTitle').textContent=help[key][0];byId('costasHelpText').textContent=help[key][1];}}
byId('costasLab').addEventListener('mouseover',explain);byId('costasLab').addEventListener('focusin',explain);window.addEventListener('resize',render);sync();window.CostasLab={render};
})();
