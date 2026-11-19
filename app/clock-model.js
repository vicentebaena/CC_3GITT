/* Gardner timing recovery, independent of carrier recovery.
   RRC transmitter and matched receiver, 16 samples/symbol, linear interpolation.
   Timing error only uses previous, midpoint and current received samples. */
(function(root){
'use strict';
const defaults={rate:20,offset:.35,ppm:1000,fn:50,zeta:.707,rolloff:.35,pattern:'prbs',noise:true,snr:30,duration:.02};
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
function interpolate(array,index){if(index<0||index>=array.length-1)return 0;const n=Math.floor(index),f=index-n;return array[n]*(1-f)+array[n+1]*f;}
function pulseAndGain(rolloff){
 const h=rrc(rolloff),pulse=convolve(h,h),centre=(pulse.length-1)/2,p=t=>interpolate(pulse,centre+t*sps);
 function curve(epsilon){let sum=0;for(let k=-span-1;k<=span+1;k++)sum+=p(-.5+epsilon-k)*(p(-1+epsilon-k)-p(epsilon-k));return sum;}
 const gain=-(curve(.01)-curve(-.01))/.02;
 return {h,pulse,gain:Math.max(.01,gain)};
}
function simulate(p){
 const rs=p.rate*1000,count=Math.max(1,Math.round(p.duration*rs)),length=(count+2*guard+2)*sps;
 const {h,pulse,gain}=pulseAndGain(p.rolloff),centre=(pulse.length-1)/2,signal=new Float64Array(length),received=new Float64Array(length);
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
 const sample=t=>interpolate(received,(t+guard)*sps),wn=2*Math.PI*p.fn/rs,kp=2*p.zeta*wn,ki=wn*wn;
 const nominal=1+p.ppm/1e6;let period=nominal,time=p.offset,previousTime=p.offset-nominal,previousSample=sample(p.offset-nominal);const samples=[];
 let freeErrors=0,recoveredErrors=0,used=0;
 for(let k=0;k<count;k++){
  const early=previousSample,mid=sample((previousTime+time)/2),current=sample(time),rawError=mid*(early-current),error=Math.max(-1,Math.min(1,rawError/gain));
  const freeTime=p.offset+k*nominal,free=sample(freeTime),m=symbols[k+guard];
  const s={k,n:k,t:k/rs,time,freeTime,phase:time-k,freePhase:freeTime-k,periodError:(period-1)*1e6,error:rawError,early,mid,current,free,m,bit:m>0?1:0,recoveredBit:current>=0?1:0,freeBit:free>=0?1:0};samples.push(s);
  if(k>=count/2){used++;freeErrors+=s.freeBit!==s.bit?1:0;recoveredErrors+=s.recoveredBit!==s.bit?1:0;}
  // No transmitter timing, symbol labels or truth error enters the update.
  previousTime=time;previousSample=current;time+=period+kp*error;period=Math.max(.98,Math.min(1.02,period+ki*error));
 }
 const tail=samples.slice(Math.floor(count*.75));const rms=Math.sqrt(tail.reduce((a,s)=>a+s.phase*s.phase,0)/tail.length),meanPeriod=tail.reduce((a,s)=>a+s.periodError,0)/tail.length;
 let transitions=0;for(let k=1;k<count;k++)if(samples[k].m!==samples[k-1].m)transitions++;
 return {samples,rs,count,sps,gain,rms,meanPeriod,transitions,freeBer:used?freeErrors/used:null,recoveredBer:used?recoveredErrors/used:null,used,freeErrors,recoveredErrors,
  signal:Array.from(received.subarray(guard*sps,(guard+count+1)*sps)),clean:Array.from(signal.subarray(guard*sps,(guard+count+1)*sps))};
}
const api={defaults,sps,rrc,pulseAndGain,interpolate,simulate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClockRecovery=api;
})(typeof window!=='undefined'?window:globalThis);
