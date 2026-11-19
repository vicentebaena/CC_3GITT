/* Classical transition-gated clock PLL: limiter, edge phase detector, PI filter, VCO.
   Pulse areas drive the filter. No symbol labels or ideal timing steer the loop. */
(function(root){
'use strict';
const defaults={rate:20,offset:.35,ppm:1000,fn:50,zeta:.707,kvco:2,rolloff:.35,pattern:'prbs',noise:true,snr:30,duration:.02};
const sps=16,span=8,guard=128;
function rrc(rolloff){
 const h=[];
 for(let n=-span*sps/2;n<=span*sps/2;n++){
  const t=n/sps,a=rolloff;let v;
  if(Math.abs(t)<1e-10)v=1+a*(4/Math.PI-1);
  else if(Math.abs(Math.abs(t)-1/(4*a))<1e-8)v=a/Math.sqrt(2)*((1+2/Math.PI)*Math.sin(Math.PI/(4*a))+(1-2/Math.PI)*Math.cos(Math.PI/(4*a)));
  else v=(Math.sin(Math.PI*t*(1-a))+4*a*t*Math.cos(Math.PI*t*(1+a)))/(Math.PI*t*(1-(4*a*t)**2));
  h.push(v);
 }
 const norm=Math.sqrt(h.reduce((s,v)=>s+v*v,0));return h.map(v=>v/norm);
}
function convolve(a,b){const out=new Float64Array(a.length+b.length-1);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)out[i+j]+=a[i]*b[j];return out;}
function interpolate(array,index){if(index<0||index>array.length-1)return 0;const n=Math.floor(index),f=index-n;if(n===array.length-1)return array[n];return array[n]*(1-f)+array[n+1]*f;}
function pulseShape(rolloff){const h=rrc(rolloff);return {h,pulse:convolve(h,h)};}
function simulate(p){
 const rs=p.rate*1000,count=Math.max(1,Math.round(p.duration*rs)),length=(count+2*guard+2)*sps;
 const {h,pulse}=pulseShape(p.rolloff),centre=(pulse.length-1)/2,signal=new Float64Array(length),received=new Float64Array(length);
 let bits=0x5d,rng=123456789;const symbols=[];
 function uniform(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return ((rng>>>0)+.5)/4294967296;}
 for(let k=-guard;k<count+guard;k++){
  let bit=bits&1;bits=((bits<<1)|(((bits>>6)^(bits>>5))&1))&127;
  if(p.pattern==='constant')bit=1;else if(p.pattern==='alternating')bit=(k+guard)&1;
  const m=bit?1:-1;symbols[k+guard]=m;const start=(k+guard)*sps-centre;
  for(let j=0;j<pulse.length;j++){const n=start+j;if(n>=0&&n<length)signal[n]+=m*pulse[j];}
 }
 received.set(signal);
 if(p.noise){
  const sigma=Math.sqrt(10**(-p.snr/10)/2),white=new Float64Array(length+2*h.length),delay=(h.length-1)/2;
  for(let n=0;n<white.length;n+=2){const a=sigma*Math.sqrt(-2*Math.log(uniform())),b=2*Math.PI*uniform();white[n]=a*Math.cos(b);if(n+1<white.length)white[n+1]=a*Math.sin(b);}
  for(let n=0;n<length;n++){let v=0;for(let j=0;j<h.length;j++)v+=h[j]*white[n+delay+j];received[n]+=v;}
 }
 const sample=t=>interpolate(received,(t+guard)*sps),freeFrequency=rs/(1+p.ppm/1e6),kvco=p.kvco*1000;
 // For random NRZ, mean transition density is 1/2. Pulse area = phase error / fVCO.
 const wn=2*Math.PI*p.fn,density=.5,kp=2*p.zeta*wn/density,ki=wn*wn/density;
 const simulationSps=64,steps=Math.round(p.duration*rs*simulationSps),dt=p.duration/steps;
 const history={phase:new Float64Array(steps+1),voltage:new Float64Array(steps+1),limited:new Uint8Array(steps+1)};
 const pulses=[],samples=[],trace=[];let phase=-.5-freeFrequency*p.offset/rs,integral=0,active=null,lastEdge=-Infinity,saturated=0;
 const initialPhase=phase,wrap=x=>((x+.5)%1+1)%1-.5;
 let previousValue=sample(-1/simulationSps),limited=sample(0)>=0?1:0,nextSamplePhase=-.5,previousSamplingTime=p.offset-1/(freeFrequency/rs);
 function addSample(time,frequency,voltage){
  const k=samples.length,freeTime=p.offset+k*(rs/freeFrequency),current=sample(time),free=sample(freeTime),m=p.pattern==='constant'?1:p.pattern==='alternating'?(k%2?1:-1):symbols[guard+k%127];
  const meanFrequency=k?rs/(time-previousSamplingTime):frequency;previousSamplingTime=time;
  samples.push({k,n:k,t:time/rs,time,freeTime,phase:time-k,freePhase:freeTime-k,periodError:(rs/meanFrequency-1)*1e6,frequency:meanFrequency,vc:(meanFrequency-freeFrequency)/kvco,vcInstant:voltage,current,free,m,bit:m>0?1:0,recoveredBit:current>=0?1:0,freeBit:free>=0?1:0});
 }
 if(p.offset<=0){addSample(p.offset,freeFrequency,0);nextSamplePhase+=1;}
 const stride=Math.max(1,Math.ceil(steps/2000));
 for(let n=0;n<=steps;n++){
  const t=n*dt,u=t*rs,value=sample(u),newLimited=value>=0?1:0;
  if(n&&newLimited!==limited&&u-lastEdge>=.25){
   const fraction=previousValue/(previousValue-value),crossTime=(n-1+fraction)*dt,crossPhase=history.phase[n-1]+fraction*(phase-history.phase[n-1]);
   const error=-wrap(crossPhase),beforeFrequency=Math.max(.5*rs,Math.min(1.5*rs,freeFrequency+integral));
   if(active&&active.end>t)active.end=t;
   const pulse={transition:crossTime,start:t,end:t+Math.abs(error)/beforeFrequency,sign:Math.sign(error),error};pulses.push(pulse);active=pulse;lastEdge=u;
  }
  limited=newLimited;history.phase[n]=phase;history.limited[n]=limited;
  const driver=active&&active.end>t?active.sign:0,instantRaw=freeFrequency+integral+kp*driver,instant=Math.max(.5*rs,Math.min(1.5*rs,instantRaw));
  const voltage=(instant-freeFrequency)/kvco;history.voltage[n]=voltage;
  if(n%stride===0||n===steps)trace.push({t,vc:voltage,frequency:instant,pulse:driver,phase:(u-.5)-phase,periodError:(rs/instant-1)*1e6});
  previousValue=value;if(n===steps)break;
  const width=driver?Math.max(0,Math.min(dt,active.end-t)):0;
  // Integrate the actual rectangular-pulse area, including sub-step pulse widths.
  const nextIntegral=Math.max(-.25*rs,Math.min(.25*rs,integral+ki*driver*width));
  const onRaw=freeFrequency+(integral+nextIntegral)/2+kp*driver,offRaw=freeFrequency+nextIntegral;
  const onFrequency=Math.max(.5*rs,Math.min(1.5*rs,onRaw)),offFrequency=Math.max(.5*rs,Math.min(1.5*rs,offRaw));
  if((width&&onFrequency!==onRaw)||(width<dt&&offFrequency!==offRaw))saturated++;
  const meanFrequency=(onFrequency*width+offFrequency*(dt-width))/dt;
  const nextPhase=phase+meanFrequency*dt;
  while(nextSamplePhase<=nextPhase){if(nextSamplePhase>=phase){const crossing=t+(nextSamplePhase-phase)/(nextPhase-phase)*dt;addSample(crossing*rs,meanFrequency,voltage);}nextSamplePhase+=1;}
  phase=nextPhase;integral=nextIntegral;
 }
 let freeErrors=0,recoveredErrors=0,used=0;
 for(const s of samples)if(s.k<count&&s.t>=p.duration/2&&s.t<=p.duration){used++;freeErrors+=s.freeBit!==s.bit?1:0;recoveredErrors+=s.recoveredBit!==s.bit?1:0;}
 const tail=samples.filter(s=>s.t>=p.duration*.75&&s.t<=p.duration),rms=tail.length?Math.sqrt(tail.reduce((a,s)=>a+s.phase*s.phase,0)/tail.length):Infinity,meanPeriod=tail.length?tail.reduce((a,s)=>a+s.periodError,0)/tail.length:Infinity;
 return {samples,rs,count:samples.length,nominalCount:count,sps,simulationSps,history,pulses,trace,freeFrequency,kvco,initialPhase,symbols:Array.from({length:count+4},(_,k)=>p.pattern==='constant'?1:p.pattern==='alternating'?(k%2?1:-1):symbols[guard+k%127]),rms,meanPeriod,transitions:pulses.length,saturated,freeBer:used?freeErrors/used:null,recoveredBer:used?recoveredErrors/used:null,used,freeErrors,recoveredErrors,
  signal:Array.from(received.subarray(guard*sps,(guard+count+3)*sps)),clean:Array.from(signal.subarray(guard*sps,(guard+count+3)*sps))};
}

const api={defaults,sps,rrc,pulseShape,interpolate,simulate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClockRecovery=api;
})(typeof window!=='undefined'?window:globalThis);
