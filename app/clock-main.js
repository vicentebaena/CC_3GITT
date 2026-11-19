/* Classical BPSK clock PLL: transition detector, PI filter and VCO. */
(function(){
'use strict';
const byId=id=>document.getElementById(id),canvas=byId('clockPlot'),ctx=canvas.getContext('2d');
const palette={text:'#eef8f6',muted:'#a7bbb7',grid:'#c7e7e222',cyan:'#48d6c8',lime:'#c8f560',amber:'#ffc857',coral:'#ff6b5f',blue:'#7cb7ff'};
const ids={rate:'clockRate',offset:'clockOffset',ppm:'clockPpm',rolloff:'clockRolloff',pattern:'clockPattern',fn:'clockFn',zeta:'clockZeta',kvco:'clockKvco',noise:'clockNoise',snr:'clockSnr',duration:'clockDuration'};
let params={...ClockRecovery.defaults},result=ClockRecovery.simulate(params),view='eye',interval='tail',pulseInterval='start';
const help={
 preset:['Ejemplos del PLL de reloj','Compara el enganche del VCO, un lazo lento con deriva y la ausencia de transiciones. Sin transiciones no llegan pulsos al filtro y el VCO sigue con la frecuencia que conserva su tensión de control.'],
 rate:['Tasa de bits y reloj del VCO','En BPSK hay un bit por símbolo. El VCO oscila cerca de Rₛ. Sus flancos ascendentes sirven de referencia para las transiciones de datos y sus flancos descendentes muestrean el centro del bit.'],
 offset:['Desfase temporal inicial','Diferencia inicial entre el flanco de muestreo del VCO y el centro ideal, en fracciones de T. Un valor positivo significa que el reloj empieza retrasado. La comparación de fase sólo usa transiciones recibidas y el VCO.'],
 ppm:['Error del período libre del VCO','Error del período del VCO sin corrección, en partes por millón. Un valor positivo significa que el VCO es más lento y sus muestras llegan cada vez más tarde. El integrador puede mantener la corrección tras el enganche.'],
 rolloff:['Forma de los datos de entrada','Los filtros RRC representan la señal BPSK demodulada antes del limitador. Cambiar el roll-off modifica el ojo y los cruces por cero. El PLL compara el instante de esos cruces con la fase del VCO.'],
 pattern:['Las transiciones excitan el detector','El detector se activa en transiciones ascendentes y descendentes de los datos limitados. Los bits repetidos no producen pulsos de corrección. La densidad de transiciones cambia la ganancia media del lazo.'],
 fn:['Rapidez del PLL clásico','fₙ y ζ describen la aproximación de pequeña señal con una densidad media de una transición cada dos bits. Una fₙ menor estrecha la banda y ralentiza el enganche. La ventana temporal se mantiene fija. La respuesta cambia con el patrón de datos.'],
 zeta:['Amortiguamiento y filtro PI','El filtro tiene un término proporcional y otro integrador. ζ regula la sobreoscilación aproximada alrededor del enganche. Las transiciones ausentes y el gran error inicial hacen que la adquisición sea no lineal.'],
 kvco:['Ganancia del VCO de reloj','Frecuencia de salida por voltio de control. El filtro se reajusta para conservar fₙ y ζ: cambiar Kᵥ꜀ₒ modifica la tensión necesaria, no la dinámica elegida. La tensión se representa respecto a la polarización.'],
 noise:['Ruido y transiciones falsas','El AWGN se añade antes del filtro adaptado y del limitador de cero. Puede desplazar cruces y generar transiciones falsas. El detector incorpora un tiempo de rearme de T/4 para rechazar cambios demasiado próximos.'],
 snr:['Eᵦ/N₀ en la entrada del limitador','La referencia energética corresponde a pulsos RRC de energía unitaria y ruido real de varianza N₀/2 antes del filtro receptor. El ruido afecta a la forma y al instante de las transiciones.'],
 duration:['Ventana temporal fija','No cambia al modificar fₙ. La BER compara las muestras del VCO durante la segunda mitad y las métricas temporales usan el último cuarto. Amplía la ventana para seguir la adquisición de lazos lentos.'],
 interval:['Plegado del diagrama de ojo','La referencia ideal sólo se usa para dibujar y medir. Los puntos representan flancos descendentes reales del VCO. Las posiciones se pliegan módulo T, por lo que el ojo no identifica desplazamientos enteros de bit.'],
 pulses:['Pulsos del detector de fase','La transición recibida se compara con la fase del VCO. Si el reloj va retrasado se genera UP; si va adelantado, DN. La anchura es proporcional al desfase temporal. El filtro integra el área firmada de esos pulsos, incluso si son muy estrechos.']
};
const descriptions={
 diagram:['PLL clásico para recuperar el reloj','Limitador, detector de transiciones, comparador de fase, filtro PI y VCO. La portadora ya está recuperada.','Enganchar un VCO a las transiciones','Las transiciones de los datos dan la referencia temporal al detector de fase. Sus pulsos UP/DN cargan o descargan el integrador y modifican la tensión del VCO. El reloj sigue oscilando entre transiciones.','fVCO(t) = f₀ + Kᵥ꜀ₒ·v꜀(t)','Selecciona Sin transiciones. Observa que desaparecen los pulsos y el VCO deja de recibir correcciones de fase.'],
 eye:['El ojo y los flancos de muestreo del VCO','Las muestras recuperadas se toman en los flancos descendentes del VCO, a medio ciclo de su referencia de fase.','Muestrear medio período después de una transición','El PLL alinea los flancos ascendentes con las transiciones de los datos. Los flancos descendentes quedan cerca del centro de cada bit y proporcionan los instantes de decisión. El VCO no conoce los centros ideales dibujados.','Transición de datos ↔ flanco ascendente · muestreo ↔ flanco descendente','Compara el primer y el último cuarto. Después mira Pulsos para relacionar el movimiento del reloj con las correcciones UP y DN.'],
 sampling:['Datos y muestras gobernadas por el VCO','Últimos 12 bits. Los puntos recuperados se toman en los flancos descendentes del VCO y las decisiones se comparan por índice de bit.','La decisión la dispara el reloj recuperado','El reloj libre y el VCO corregido muestrean la misma señal. La referencia deseada se dibuja discontinua encima. El desfase y la deriva cambian qué bit se decide en cada flanco.','Bit decidido = signo[y(tflanco descendente)]','Cambia el error de período y compara los puntos de muestreo con reloj libre y con el VCO enganchado.'],
 acquisition:['Enganche del PLL de reloj','Error temporal, error de período del VCO y tensión de control media por ciclo. La escala temporal permanece fija.','Del área de los pulsos a la frecuencia del VCO','El filtro convierte los pulsos firmados en tensión. El término proporcional responde a cada pulso y el integrador mantiene la corrección continua que necesita el VCO. Sólo las transiciones recibidas excitan el lazo.','UP/DN → filtro PI → v꜀(t) → VCO','Baja fₙ y observa el aumento del tiempo de enganche. Sin transiciones, una BER cero no implica que el VCO esté sincronizado.'],
 pulses:['Transiciones, reloj y pulsos UP/DN','Comparador de fase ideal habilitado por las transiciones de los datos; las dos polaridades producen referencia temporal.','La anchura del pulso representa el desfase','El comparador produce un pulso firmado proporcional al desfase respecto al flanco ascendente del VCO. UP acelera el VCO y DN lo frena. Sin transición de datos no hay pulso, aunque el reloj siga funcionando.','Área firmada del pulso ≈ error de fase en ciclos / fVCO','Compara los primeros y los últimos ocho bits. Relaciona la anchura de los pulsos con la tensión de control y el enganche.']
};
function text(s,x,y,color='text',size=18,align='left'){ctx.fillStyle=palette[color];ctx.font=`${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.fillText(window.I18n.t(s),x,y);}
function line(x1,y1,x2,y2,color='grid',width=1,dash=[]){ctx.strokeStyle=palette[color];ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function arrow(x1,y1,x2,y2,color='cyan'){line(x1,y1,x2,y2,color,2);const a=Math.atan2(y2-y1,x2-x1);line(x2,y2,x2-10*Math.cos(a-.4),y2-10*Math.sin(a-.4),color,2);line(x2,y2,x2-10*Math.cos(a+.4),y2-10*Math.sin(a+.4),color,2);}
function block(x,y,w,title,value,color='cyan'){ctx.fillStyle='#102328';ctx.fillRect(x,y,w,90);ctx.strokeStyle=palette[color];ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,90);text(title,x+w/2,y+32,'text',20,'center');text(value,x+w/2,y+64,color,18,'center');}
function range(values){let lo=Math.min(...values),hi=Math.max(...values);if(hi-lo<1e-4){const centre=(lo+hi)/2;lo=centre-.05;hi=centre+.05;}const pad=(hi-lo)*.12;return [lo-pad,hi+pad];}
function legend(items,y){let x=110;for(const [label,color,dash=[]] of items){if(x+window.I18n.t(label).length*9+70>1040){x=110;y+=28;}line(x,y-6,x+25,y-6,color,3,dash);text(label,x+34,y,'muted',17);x+=window.I18n.t(label).length*9+85;}}
function plotRow(y,h,title,samples,curves,{fixedRange=null,steps=false,targets=[],times=null}={}){
 const x=110,w=930,values=curves.flatMap(c=>samples.map(c.get));const [lo,hi]=fixedRange||range(values.concat(targets)),t0=times?times[0]:steps?samples[0].n/result.rs:0,t1=times?times[1]:steps?(samples.at(-1).n+1)/result.rs:params.duration;
 const sy=v=>y+h-(v-lo)/(hi-lo)*h,sx=t=>x+w*(t-t0)/(t1-t0);text(title,x,y-17,'text',20);
 for(let j=0;j<=4;j++){const yy=y+h-j*h/4;line(x,yy,x+w,yy);text((lo+(hi-lo)*j/4).toFixed(hi-lo>20?0:hi-lo>2?1:2),x-12,yy+5,'muted',16,'right');}
 for(let j=0;j<=5;j++){const xx=x+j*w/5;line(xx,y,xx,y+h);text(((t0+(t1-t0)*j/5)*1000).toFixed(t1-t0<.001?2:1)+' ms',xx,y+h+26,'muted',16,'center');}
 for(const target of targets)if(target>=lo&&target<=hi)line(x,sy(target),x+w,sy(target),'muted',1,[6,5]);
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(const c of curves){ctx.beginPath();samples.forEach((s,j)=>{const xx=sx(steps?s.n/result.rs:s.t),yy=sy(c.get(s));if(j){if(steps||c.steps)ctx.lineTo(xx,sy(c.get(samples[j-1])));ctx.lineTo(xx,yy);}else ctx.moveTo(xx,yy);if(steps&&j===samples.length-1)ctx.lineTo(sx((s.n+1)/result.rs),yy);});ctx.setLineDash(c.dash||[]);if(c.halo){ctx.strokeStyle='#071013';ctx.lineWidth=6;ctx.stroke();}ctx.strokeStyle=palette[c.color];ctx.lineWidth=c.width||2.4;ctx.stroke();}ctx.restore();
}
const wrap=x=>((x+.5)%1+1)%1-.5;
const waveform=t=>ClockRecovery.interpolate(result.signal,t*result.rs*result.sps);
function diagram(){
 text('PLL CLÁSICO DE RELOJ · TRANSICIONES DE DATOS',55,55,'lime',18);text('Portadora ya recuperada · el reloj lo genera un VCO',55,96,'muted',21);
 block(55,190,160,'Datos BPSK','RRC + ruido');block(270,190,170,'Limitador','Umbral cero');block(500,190,180,'Transiciones','Ambos flancos');block(760,190,260,'Detector de fase','Pulsos UP / DN','coral');
 arrow(215,235,270,235);arrow(440,235,500,235);arrow(680,235,760,235,'coral');
 line(1020,235,1050,235,'coral',2);line(1050,235,1050,455,'coral',2);arrow(1050,455,1000,455,'coral');block(760,410,240,'Filtro PI','Tensión v꜀');arrow(760,455,660,455);
 block(420,410,240,'VCO','f₀ + Kᵥ꜀ₒ·v꜀','blue');line(420,455,360,455,'blue',2);line(360,455,360,340,'blue',2);line(360,340,820,340,'blue',2);arrow(820,340,820,280,'blue');text('Reloj realimentado',550,325,'blue',19,'center');
 text('Flanco ascendente: referencia para comparar las transiciones.',55,600,'text',21);text('Flanco descendente: muestreo a mitad del bit.',55,645,'cyan',21);text('Sin transiciones, el filtro conserva su estado y el VCO sigue oscilando.',55,700,'muted',19);
}
function eye(){
 const a=interval==='tail'?Math.floor(result.count*.75):0,b=interval==='start'?Math.ceil(result.count*.25):result.count;
 const selected=result.samples.slice(a,b),x=110,y=95,w=930,h=440,limit=1.8,sx=v=>x+w*(v+1)/2,sy=v=>y+h*(limit-v)/(2*limit);
 text('Amplitud normalizada · tiempo relativo t/T',x,55,'text',22);
 for(const v of [-1.5,-1,-.5,0,.5,1,1.5]){line(x,sy(v),x+w,sy(v));text(v.toFixed(1),x-12,sy(v)+5,'muted',17,'right');}
 for(const v of [-1,-.5,0,.5,1]){line(sx(v),y,sx(v),y+h);text(v.toFixed(1)+' T',sx(v),y+h+28,'muted',17,'center');}
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.strokeStyle=palette.muted;ctx.lineWidth=1.3;ctx.globalAlpha=.22;
 const first=Math.max(2,Math.floor(selected[0].t*result.rs)),last=Math.min(result.nominalCount-2,Math.ceil(selected.at(-1).t*result.rs));const traces=Array.from({length:Math.max(0,last-first)},(_,j)=>({k:first+j})),skip=Math.max(1,Math.ceil(traces.length/110));
 traces.forEach((s,j)=>{if(j%skip)return;ctx.beginPath();for(let n=0;n<=64;n++){const u=-1+2*n/64,xx=sx(u),yy=sy(waveform((s.k+u)/result.rs));n?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();});
 ctx.globalAlpha=.8;for(const [field,color,value] of [['freePhase','amber','free'],['phase','cyan','current']])for(const s of selected){ctx.fillStyle=palette[color];ctx.beginPath();ctx.arc(sx(wrap(s[field])),sy(s[value]),3.4,0,2*Math.PI);ctx.fill();}ctx.restore();
 line(sx(0),y,sx(0),y+h,'text',1.7,[8,7]);legend([['Reloj libre','amber'],['Reloj recuperado','cyan'],['Centro ideal','text',[8,7]]],600);
 text(window.I18n.t('Símbolos del ojo')+` ${a+1}–${b}`,110,654,'muted',20);text('La posición horizontal se representa módulo un símbolo.',110,699,'text',19);
}
function sampling(){
 const first=Math.max(0,result.nominalCount-12),start=(first-.5)/result.rs,end=(result.nominalCount-.5)/result.rs;
 const data=[];for(let n=0;n<=12*result.sps;n++){const t=start+(end-start)*n/(12*result.sps),k=Math.max(0,Math.min(result.nominalCount-1,Math.round(t*result.rs)));data.push({t,y:waveform(t),m:result.symbols[k]});}
 plotRow(70,235,'Señal filtrada y muestras en tiempos reales',data,[{get:s=>s.y,color:'muted'},{get:s=>s.m,color:'text',dash:[10,7],halo:true,width:2.8,steps:true}],{fixedRange:[-1.8,1.8],times:[start,end]});
 const x=110,w=930,y=70,h=235,sx=t=>x+w*(t-start)/(end-start),sy=v=>y+h*(1.8-v)/3.6;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(const [time,val,color] of [['freeTime','free','amber'],['time','current','cyan']])for(const s of result.samples){const t=s[time]/result.rs;if(t<start||t>end)continue;ctx.fillStyle=palette[color];ctx.beginPath();ctx.arc(sx(t),sy(s[val]),4,0,2*Math.PI);ctx.fill();}ctx.restore();
 legend([['Símbolo deseado','text',[10,7]],['Señal filtrada','muted'],['Reloj libre','amber'],['Reloj recuperado','cyan']],362);
 const symbols=result.samples.filter(s=>s.k>=first&&s.k<result.nominalCount).map(s=>({...s,n:s.k-.5}));
 plotRow(490,145,'Decisiones de bits por símbolo',symbols,[{get:s=>s.freeBit,color:'amber'},{get:s=>s.recoveredBit,color:'cyan'},{get:s=>s.bit,color:'text',dash:[10,7],halo:true,width:2.8}],{fixedRange:[-.5,1.5],steps:true,times:[start,end]});
 legend([['Bit deseado','text',[10,7]],['Reloj libre','amber'],['Reloj recuperado','cyan']],704);
}
function acquisition(){
 const samples=result.samples;plotRow(60,140,'Error temporal de los flancos de muestreo (% T)',samples,[{get:s=>s.freePhase*100,color:'amber'},{get:s=>s.phase*100,color:'cyan'}],{targets:[0]});
 plotRow(290,140,'Error del período del VCO, promedio por ciclo (ppm)',samples,[{get:s=>s.periodError,color:'blue'}],{targets:[0,params.ppm]});
 plotRow(520,140,'Tensión de control media por ciclo (V)',samples,[{get:s=>s.vc,color:'coral'}]);
 legend([['Reloj libre','amber'],['Muestreo del VCO','cyan'],['Período del VCO','blue']],720);
}
function pulses(){
 const a=pulseInterval==='start'?0:Math.max(0,params.duration-8/result.rs),b=Math.min(params.duration,a+8/result.rs),data=[];
 const first=Math.floor(a*result.rs*result.simulationSps),last=Math.ceil(b*result.rs*result.simulationSps);
 for(let j=first;j<=last;j++){
  const t=j/(result.rs*result.simulationSps),phase=result.history.phase[Math.min(j,result.history.phase.length-1)],fraction=((phase%1)+1)%1;
  let up=0,dn=0;for(const p of result.pulses)if(t>=p.start&&t<p.end){up=p.sign>0?1:0;dn=p.sign<0?1:0;}
  data.push({t,data:result.history.limited[Math.min(j,result.history.limited.length-1)],clock:fraction<.5?1:0,up,dn,voltage:result.history.voltage[Math.min(j,result.history.voltage.length-1)]});
 }
 // Exact pulse corners preserve pulses narrower than the history grid.
 const pulseCurves=sign=>{const points=[{t:a,value:0}];for(const p of result.pulses){if(p.sign!==sign||p.end<=a||p.start>=b)continue;const start=Math.max(a,p.start),end=Math.min(b,p.end);points.push({t:start,value:0},{t:start,value:1},{t:end,value:1},{t:end,value:0});}points.push({t:b,value:0});return points;};
 plotRow(55,65,'Datos limitados',data,[{get:s=>s.data,color:'muted',steps:true}],{fixedRange:[-.2,1.2],times:[a,b]});
 plotRow(180,65,'Reloj del VCO · muestreo en flancos descendentes',data,[{get:s=>s.clock,color:'cyan',steps:true}],{fixedRange:[-.2,1.2],times:[a,b]});
 plotRow(305,65,'UP · acelerar',pulseCurves(1),[{get:s=>s.value,color:'coral'}],{fixedRange:[-.2,1.2],times:[a,b]});
 plotRow(430,65,'DN · frenar',pulseCurves(-1),[{get:s=>s.value,color:'blue'}],{fixedRange:[-.2,1.2],times:[a,b]});
 plotRow(555,65,'Tensión de control instantánea (V)',data,[{get:s=>s.voltage,color:'amber'}],{times:[a,b]});
 text('Los pulsos estrechos conservan su área en el filtro; sin transición no hay corrección.',110,710,'muted',17);
}
function sync(){for(const [key,id] of Object.entries(ids)){const el=byId(id);if(key==='noise')el.checked=params.noise;else el.value=params[key];}
 byId('clockRateOut').textContent=params.rate+' ksym/s';byId('clockOffsetOut').textContent=params.offset.toFixed(2)+' T';byId('clockPpmOut').textContent=(params.ppm>0?'+':'')+params.ppm+' ppm';byId('clockRolloffOut').textContent=params.rolloff.toFixed(2);byId('clockFnOut').textContent=params.fn+' Hz';byId('clockZetaOut').textContent=params.zeta.toFixed(2);byId('clockKvcoOut').textContent=params.kvco.toFixed(1)+' kHz/V';byId('clockSnrOut').textContent=params.snr+' dB';byId('clockSnr').disabled=!params.noise;byId('clockFn').max=Math.min(500,params.rate*10);
}
function percent(v){return v===null?'—':(100*v).toFixed(1)+' %';}
function render(){if(byId('clockLab').hidden)return;const d=descriptions[view];byId('clockViewTitle').textContent=d[0];byId('clockViewDescription').textContent=d[1];byId('clockLessonTitle').textContent=d[2];byId('clockLessonText').textContent=d[3];byId('clockFormula').textContent=d[4];byId('clockChallenge').textContent=d[5];byId('clockIntervalControl').hidden=view!=='eye';byId('clockPulseControl').hidden=view!=='pulses';
 byId('clockMetricTiming').textContent=(100*result.rms).toFixed(1)+' % T';byId('clockMetricPeriod').textContent=result.meanPeriod.toFixed(0)+' ppm';byId('clockMetricFree').textContent=percent(result.freeBer);byId('clockMetricRecovered').textContent=percent(result.recoveredBer);
 byId('clockSummary').textContent=window.I18n.t('Símbolos en ventana')+`: ${result.nominalCount} · `+window.I18n.t('Muestras del VCO')+`: ${result.count} · `+window.I18n.t('Transiciones detectadas')+`: ${result.transitions}`;
 const warnings=[];if(result.transitions<2)warnings.push('Sin transiciones no hay pulsos de fase: el VCO sigue oscilando con la tensión que conserva el filtro. Una BER cero no confirma el enganche.');else if(result.rms>.15)warnings.push('El último cuarto aún muestra un error temporal importante respecto a los símbolos originales. Amplía la ventana o revisa la dinámica.');if(result.saturated)warnings.push('El VCO ha alcanzado los límites de frecuencia del modelo.');if(result.count<100)warnings.push('La ventana contiene pocos símbolos para valorar la adquisición y la BER.');byId('clockWarning').textContent=warnings.join(' ');
 canvas.setAttribute('aria-label',d[0]+'. '+d[1]+' '+window.I18n.t('Error temporal RMS')+` ${(100*result.rms).toFixed(1)} % T.`);
 const ratio=devicePixelRatio||1;canvas.width=Math.round(canvas.clientWidth*ratio);canvas.height=Math.round(canvas.clientHeight*ratio);ctx.setTransform(canvas.width/1100,0,0,canvas.height/740,0,0);ctx.clearRect(0,0,1100,740);({diagram,eye,sampling,acquisition,pulses})[view]();
}
function recalculate(){params.fn=Math.min(params.fn,500,params.rate*10);result=ClockRecovery.simulate(params);sync();render();}
for(const [key,id] of Object.entries(ids))byId(id).addEventListener('input',()=>{const el=byId(id);if(el.type!=='checkbox'&&(el.value===''||!el.checkValidity()))return;params[key]=key==='noise'?el.checked:key==='pattern'?el.value:Number(el.value);recalculate();});
function reset(){params={...ClockRecovery.defaults};const preset=byId('clockPreset').value;if(preset==='slow')Object.assign(params,{fn:20,ppm:5000});if(preset==='constant')Object.assign(params,{pattern:'constant',noise:false});recalculate();}
byId('clockPreset').addEventListener('change',reset);byId('clockReset').addEventListener('click',reset);byId('clockInterval').addEventListener('change',()=>{interval=byId('clockInterval').value;render();});byId('clockPulseInterval').addEventListener('change',()=>{pulseInterval=byId('clockPulseInterval').value;render();});
document.querySelectorAll('[data-clock-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.clockView;document.querySelectorAll('[data-clock-view]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});render();}));
function explain(e){const key=e.target.closest('[data-clock-help]')?.dataset.clockHelp;if(help[key]){byId('clockHelpTitle').textContent=help[key][0];byId('clockHelpText').textContent=help[key][1];}}
byId('clockLab').addEventListener('mouseover',explain);byId('clockLab').addEventListener('focusin',explain);window.addEventListener('resize',render);sync();window.ClockLab={render};
})();
