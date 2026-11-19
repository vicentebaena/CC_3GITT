/* BPSK Gardner clock-recovery laboratory. */
(function(){
'use strict';
const byId=id=>document.getElementById(id),canvas=byId('clockPlot'),ctx=canvas.getContext('2d');
const palette={text:'#eef8f6',muted:'#a7bbb7',grid:'#c7e7e222',cyan:'#48d6c8',lime:'#c8f560',amber:'#ffc857',coral:'#ff6b5f',blue:'#7cb7ff'};
const ids={rate:'clockRate',offset:'clockOffset',ppm:'clockPpm',rolloff:'clockRolloff',pattern:'clockPattern',fn:'clockFn',zeta:'clockZeta',noise:'clockNoise',snr:'clockSnr',duration:'clockDuration'};
let params={...ClockRecovery.defaults},result=ClockRecovery.simulate(params),view='eye',interval='tail';
const help={
 preset:['Ejemplos de recuperación temporal','Compara la adquisición normal con un reloj que deriva más deprisa y un lazo lento. El ejemplo sin transiciones muestra que una BER pequeña no garantiza sincronización temporal.'],
 rate:['Tasa de símbolos y período T','T = 1/Rₛ. La señal se representa con 16 muestras por símbolo y el detector usa dos muestras por intervalo de símbolo estimado. El reloj recuperado no recibe los tiempos ideales del transmisor.'],
 offset:['Desfase temporal inicial','Diferencia inicial entre el instante de muestreo y el centro ideal, en fracciones de T. Un valor positivo significa muestrear tarde. Prueba ±0,35 T y observa la corrección en el ojo.'],
 ppm:['Error del período del reloj libre','Error relativo del período, en partes por millón. Un valor positivo alarga el período del receptor y hace que sus muestras lleguen cada vez más tarde. Se usan valores amplios para ver la deriva en una ventana corta.'],
 rolloff:['Forma del pulso y roll-off','Transmisor y receptor usan filtros raíz de coseno alzado (RRC). Su combinación aproxima un pulso Nyquist de coseno alzado. El roll-off cambia la apertura del ojo y la sensibilidad de Gardner; con muy poco exceso de banda hay menos información temporal.'],
 pattern:['Las transiciones aportan información','Los bits pseudoaleatorios proporcionan transiciones para estimar el reloj. En una secuencia constante, el detector apenas obtiene información temporal, aunque las decisiones de bits puedan parecer correctas.'],
 fn:['Rapidez del lazo temporal','fₙ fija la dinámica aproximada del lazo cerca del enganche, no su ancho de banda exacto. Con ζ fijo, reducirla ralentiza la adquisición y filtra más ruido. La escala de tiempo permanece fija y fₙ se limita a Rₛ/100. Incluso sin AWGN, Gardner presenta fluctuaciones dependientes de los datos.'],
 zeta:['Amortiguamiento del reloj','Controla el compromiso entre rapidez y sobreoscilación. La ganancia del detector se normaliza según el pulso RRC, pero la respuesta con grandes errores temporales sigue siendo no lineal.'],
 noise:['Ruido antes del filtro adaptado','AWGN real añadido antes del filtro RRC de recepción. El filtro colorea el ruido entre muestras; no se añade ruido independiente directamente a las decisiones. La semilla fija permite comparar ajustes.'],
 snr:['Eᵦ/N₀ en la recuperación de reloj','Los pulsos de transmisión tienen energía unitaria y el filtro receptor energía unitaria. La varianza del ruido antes del receptor es N₀/2. Al cambiar la tasa o el roll-off se conserva esta referencia energética.'],
 duration:['Ventana temporal fija','No cambia al modificar fₙ ni la tasa de símbolos. Las métricas temporales usan el último cuarto y la BER la segunda mitad. Amplía la ventana para observar la adquisición con lazos lentos.'],
 interval:['Plegado del diagrama de ojo','La señal se pliega alrededor de centros ideales sólo para visualizarla. Las posiciones de muestreo se muestran módulo T. El ojo no identifica desplazamientos enteros de símbolo; la BER mantiene la alineación original de los bits.']
};
const descriptions={
 diagram:['Recuperar el reloj de una señal BPSK','El detector temporal mueve los instantes de muestreo; la portadora se supone recuperada.','Un lazo que ajusta el tiempo','El filtro adaptado entrega una señal continua entre símbolos. El interpolador obtiene las muestras actual, anterior e intermedia. Gardner estima el error temporal y el filtro PI corrige la posición y el período de muestreo.','eₖ = y[(tₖ + tₖ₋₁)/2] · [y(tₖ₋₁) − y(tₖ)]','Cambia el desfase inicial sin tocar la portadora. Observa que este lazo corrige tiempos, mientras Costas corrige la orientación de I/Q.'],
 eye:['El ojo y los instantes de muestreo','La señal no cambia: se comparan muestras libres y recuperadas, con fase temporal módulo T.','Buscar la apertura del ojo','Cerca del centro ideal, los niveles de BPSK se separan mejor. Las muestras recuperadas deberían concentrarse alrededor de ese centro. El reloj libre deriva y puede acercarse a las transiciones. El detector no conoce la referencia ideal que se dibuja.','Centro ideal: t/T = 0 · fases del ojo módulo T','Compara el primer cuarto con el último. Aumenta el error del reloj libre y observa cómo se dispersan sus puntos frente a los del reloj recuperado.'],
 sampling:['La señal filtrada y sus muestras','Últimos 12 símbolos. Las muestras se dibujan en sus tiempos reales; las decisiones se comparan por índice de símbolo.','El valor correcto depende del instante','Los dos receptores observan la misma señal filtrada. El reloj libre y el recuperado eligen instantes diferentes. La referencia deseada discontinua y las decisiones permiten ver errores cerca de las transiciones o desplazamientos de símbolo.','Bit decidido = signo[y(tₖ)]','Reduce Eᵦ/N₀ o el roll-off y compara las decisiones con reloj libre y recuperado. La escala vertical permanece fija.'],
 acquisition:['Cómo se sincroniza el reloj','Error temporal sin envolver, error de período y salida de Gardner sobre una ventana fija.','Corregir posición y deriva','El término proporcional corrige la posición temporal y el integrador ajusta el período. El error ideal sólo se usa para medir: el algoritmo se alimenta exclusivamente de las muestras recibidas.','Gardner → filtro PI → período y fase del interpolador','Selecciona Sin transiciones: comprueba que el error temporal puede seguir creciendo aunque la BER sea cero.']
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
 text('BPSK · RECUPERACIÓN TEMPORAL GARDNER',55,55,'lime',18);text('Portadora ya recuperada · no se estima con este lazo',55,96,'muted',21);
 block(55,185,180,'Entrada BPSK','Pulso RRC');block(290,185,180,'Filtro adaptado','RRC receptor');block(560,185,200,'Interpolador','yₖ, yₖ₋½');block(850,185,180,'Decisión','Bits');
 arrow(235,230,290,230);arrow(470,230,560,230);arrow(760,230,850,230);
 line(795,230,795,410,'cyan',2);arrow(795,410,720,410);block(540,365,180,'Gardner','Muestras recibidas','coral');arrow(540,410,450,410,'coral');block(270,365,180,'Filtro PI','Error temporal');
 line(360,455,360,570,'cyan',2);arrow(360,570,540,570);block(540,525,200,'Reloj estimado','T̂ y tₖ','blue');line(740,570,1050,570,'blue',2);line(1050,570,1050,145,'blue',2);line(1050,145,660,145,'blue',2);arrow(660,145,660,185,'blue');
 text('Ajusta cuándo se muestrea',55,650,'text',24);text('Dos muestras por símbolo para el detector · una decisión por símbolo',55,702,'muted',19);
}
function eye(){
 const a=interval==='tail'?Math.floor(result.count*.75):0,b=interval==='start'?Math.ceil(result.count*.25):result.count;
 const selected=result.samples.slice(a,b),x=110,y=95,w=930,h=440,limit=1.8,sx=v=>x+w*(v+1)/2,sy=v=>y+h*(limit-v)/(2*limit);
 text('Amplitud normalizada · tiempo relativo t/T',x,55,'text',22);
 for(const v of [-1.5,-1,-.5,0,.5,1,1.5]){line(x,sy(v),x+w,sy(v));text(v.toFixed(1),x-12,sy(v)+5,'muted',17,'right');}
 for(const v of [-1,-.5,0,.5,1]){line(sx(v),y,sx(v),y+h);text(v.toFixed(1)+' T',sx(v),y+h+28,'muted',17,'center');}
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.strokeStyle=palette.muted;ctx.lineWidth=1.3;ctx.globalAlpha=.22;
 const traces=selected.filter(s=>s.k>=2&&s.k<result.count-2),skip=Math.max(1,Math.ceil(traces.length/110));
 traces.forEach((s,j)=>{if(j%skip)return;ctx.beginPath();for(let n=0;n<=64;n++){const u=-1+2*n/64,xx=sx(u),yy=sy(waveform((s.k+u)/result.rs));n?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();});
 ctx.globalAlpha=.8;for(const [field,color,value] of [['freePhase','amber','free'],['phase','cyan','current']])for(const s of selected){ctx.fillStyle=palette[color];ctx.beginPath();ctx.arc(sx(wrap(s[field])),sy(s[value]),3.4,0,2*Math.PI);ctx.fill();}ctx.restore();
 line(sx(0),y,sx(0),y+h,'text',1.7,[8,7]);legend([['Reloj libre','amber'],['Reloj recuperado','cyan'],['Centro ideal','text',[8,7]]],600);
 text(window.I18n.t('Símbolos del ojo')+` ${a+1}–${b}`,110,654,'muted',20);text('La posición horizontal se representa módulo un símbolo.',110,699,'text',19);
}
function sampling(){
 const first=Math.max(0,result.count-12),start=(first-.5)/result.rs,end=(result.count-.5)/result.rs;
 const data=[];for(let n=0;n<=12*result.sps;n++){const t=start+(end-start)*n/(12*result.sps),k=Math.max(0,Math.min(result.count-1,Math.round(t*result.rs)));data.push({t,y:waveform(t),m:result.samples[k].m});}
 plotRow(70,235,'Señal filtrada y muestras en tiempos reales',data,[{get:s=>s.y,color:'muted'},{get:s=>s.m,color:'text',dash:[10,7],halo:true,width:2.8,steps:true}],{fixedRange:[-1.8,1.8],times:[start,end]});
 const x=110,w=930,y=70,h=235,sx=t=>x+w*(t-start)/(end-start),sy=v=>y+h*(1.8-v)/3.6;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(const [time,val,color] of [['freeTime','free','amber'],['time','current','cyan']])for(const s of result.samples){const t=s[time]/result.rs;if(t<start||t>end)continue;ctx.fillStyle=palette[color];ctx.beginPath();ctx.arc(sx(t),sy(s[val]),4,0,2*Math.PI);ctx.fill();}ctx.restore();
 legend([['Símbolo deseado','text',[10,7]],['Señal filtrada','muted'],['Reloj libre','amber'],['Reloj recuperado','cyan']],362);
 const symbols=result.samples.slice(first).map(s=>({...s,n:s.k-.5}));
 plotRow(490,145,'Decisiones de bits por símbolo',symbols,[{get:s=>s.freeBit,color:'amber'},{get:s=>s.recoveredBit,color:'cyan'},{get:s=>s.bit,color:'text',dash:[10,7],halo:true,width:2.8}],{fixedRange:[-.5,1.5],steps:true,times:[start,end]});
 legend([['Bit deseado','text',[10,7]],['Reloj libre','amber'],['Reloj recuperado','cyan']],704);
}
function acquisition(){
 const samples=result.samples;plotRow(60,140,'Error temporal respecto al símbolo original (% T)',samples,[{get:s=>s.freePhase*100,color:'amber'},{get:s=>s.phase*100,color:'cyan'}],{targets:[0]});
 plotRow(290,140,'Error del período estimado (ppm)',samples,[{get:s=>s.periodError,color:'blue'}],{targets:[0,params.ppm]});
 plotRow(520,140,'Salida del detector Gardner',samples,[{get:s=>s.error,color:'coral'}],{targets:[0]});
 legend([['Reloj libre','amber'],['Reloj recuperado','cyan'],['Período estimado','blue']],720);
}
function sync(){for(const [key,id] of Object.entries(ids)){const el=byId(id);if(key==='noise')el.checked=params.noise;else el.value=params[key];}
 byId('clockRateOut').textContent=params.rate+' ksym/s';byId('clockOffsetOut').textContent=params.offset.toFixed(2)+' T';byId('clockPpmOut').textContent=(params.ppm>0?'+':'')+params.ppm+' ppm';byId('clockRolloffOut').textContent=params.rolloff.toFixed(2);byId('clockFnOut').textContent=params.fn+' Hz';byId('clockZetaOut').textContent=params.zeta.toFixed(2);byId('clockSnrOut').textContent=params.snr+' dB';byId('clockSnr').disabled=!params.noise;byId('clockFn').max=Math.min(500,params.rate*10);
}
function percent(v){return v===null?'—':(100*v).toFixed(1)+' %';}
function render(){if(byId('clockLab').hidden)return;const d=descriptions[view];byId('clockViewTitle').textContent=d[0];byId('clockViewDescription').textContent=d[1];byId('clockLessonTitle').textContent=d[2];byId('clockLessonText').textContent=d[3];byId('clockFormula').textContent=d[4];byId('clockChallenge').textContent=d[5];byId('clockIntervalControl').hidden=view!=='eye';
 byId('clockMetricTiming').textContent=(100*result.rms).toFixed(1)+' % T';byId('clockMetricPeriod').textContent=result.meanPeriod.toFixed(0)+' ppm';byId('clockMetricFree').textContent=percent(result.freeBer);byId('clockMetricRecovered').textContent=percent(result.recoveredBer);
 byId('clockSummary').textContent=window.I18n.t('Símbolos en ventana')+`: ${result.count} · `+window.I18n.t('Símbolos para BER')+`: ${result.used} · `+window.I18n.t('Transiciones')+`: ${result.transitions}`;
 const warnings=[];if(result.transitions<2)warnings.push('Sin transiciones, el detector no dispone de información temporal suficiente. Una BER cero no confirma el enganche.');else if(result.rms>.15)warnings.push('El último cuarto aún muestra un error temporal importante respecto a los símbolos originales. Amplía la ventana o revisa la dinámica.');if(result.count<100)warnings.push('La ventana contiene pocos símbolos para valorar la adquisición y la BER.');byId('clockWarning').textContent=warnings.join(' ');
 canvas.setAttribute('aria-label',d[0]+'. '+d[1]+' '+window.I18n.t('Error temporal RMS')+` ${(100*result.rms).toFixed(1)} % T.`);
 const ratio=devicePixelRatio||1;canvas.width=Math.round(canvas.clientWidth*ratio);canvas.height=Math.round(canvas.clientHeight*ratio);ctx.setTransform(canvas.width/1100,0,0,canvas.height/740,0,0);ctx.clearRect(0,0,1100,740);({diagram,eye,sampling,acquisition})[view]();
}
function recalculate(){params.fn=Math.min(params.fn,500,params.rate*10);result=ClockRecovery.simulate(params);sync();render();}
for(const [key,id] of Object.entries(ids))byId(id).addEventListener('input',()=>{const el=byId(id);if(el.type!=='checkbox'&&(el.value===''||!el.checkValidity()))return;params[key]=key==='noise'?el.checked:key==='pattern'?el.value:Number(el.value);recalculate();});
function reset(){params={...ClockRecovery.defaults};const preset=byId('clockPreset').value;if(preset==='slow')Object.assign(params,{fn:20,ppm:5000});if(preset==='constant')Object.assign(params,{pattern:'constant',noise:false});recalculate();}
byId('clockPreset').addEventListener('change',reset);byId('clockReset').addEventListener('click',reset);byId('clockInterval').addEventListener('change',()=>{interval=byId('clockInterval').value;render();});
document.querySelectorAll('[data-clock-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.clockView;document.querySelectorAll('[data-clock-view]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});render();}));
function explain(e){const key=e.target.closest('[data-clock-help]')?.dataset.clockHelp;if(help[key]){byId('clockHelpTitle').textContent=help[key][0];byId('clockHelpText').textContent=help[key][1];}}
byId('clockLab').addEventListener('mouseover',explain);byId('clockLab').addEventListener('focusin',explain);window.addEventListener('resize',render);sync();window.ClockLab={render};
})();
