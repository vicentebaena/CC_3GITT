/* Symbol-rate BPSK Costas loop. Ideal matched filter and known symbol timing.
   I,Q have unit symbol amplitude, so d=I*Q has small-error slope 1. */
(function(root){
'use strict';
const defaults={rate:20,phase:60,offset:200,fn:500,zeta:.707,noise:true,snr:30,duration:.01,resolve:false};
const preambleLength=64;
function simulate(p){
 const rs=p.rate*1000,dt=1/rs,count=Math.max(1,Math.round(p.duration*rs)),wn=2*Math.PI*p.fn,kp=2*p.zeta*wn,ki=wn*wn;
 const sigma=p.noise?Math.sqrt(10**(-p.snr/10)/2):0;
 let rng=246813579,prbs=0x5d,estimatedPhase=0,integral=0,corr=0;
 const samples=[];
 function uniform(){rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return ((rng>>>0)+.5)/4294967296;}
 for(let n=0;n<count;n++){
  const bit=prbs&1,feedback=((prbs>>6)^(prbs>>5))&1;prbs=((prbs<<1)|feedback)&127;
  const m=bit?1:-1,t=(n+.5)*dt,phase=p.phase*Math.PI/180+2*Math.PI*p.offset*t;
  let nr=0,ni=0;if(sigma){const a=sigma*Math.sqrt(-2*Math.log(uniform())),b=2*Math.PI*uniform();nr=a*Math.cos(b);ni=a*Math.sin(b);}
  const re=m*Math.cos(phase)+nr,im=m*Math.sin(phase)+ni,c=Math.cos(estimatedPhase),s=Math.sin(estimatedPhase);
  const i=re*c+im*s,q=im*c-re*s,detector=i*q,error=phase-estimatedPhase;
  const frequency=(kp*detector+integral)/(2*Math.PI);
  const sample={n,t,bit,m,re,im,i,q,error,residual:.5*Math.atan2(Math.sin(2*error),Math.cos(2*error)),detector,frequency,rawBit:i>=0?1:0};
  samples.push(sample);if(n<preambleLength)corr+=i*m;
  // Explicit PI in the phase domain, with one update per symbol.
  estimatedPhase+=(kp*detector+integral)*dt;integral+=ki*detector*dt;
 }
 const hasPilot=count>=preambleLength,polarity=corr>=0?1:-1;
 let rawErrors=0,pilotErrors=0,payloadCount=0;
 samples.forEach(s=>{s.pilotBit=s.i*polarity>=0?1:0;if(s.n>=preambleLength){payloadCount++;rawErrors+=s.rawBit!==s.bit?1:0;pilotErrors+=s.pilotBit!==s.bit?1:0;}});
 const tail=samples.slice(Math.floor(count*.75)),rmsPhase=Math.sqrt(tail.reduce((a,s)=>a+s.residual*s.residual,0)/tail.length)*180/Math.PI;
 const residualFrequency=tail.reduce((a,s)=>a+s.frequency,0)/tail.length-p.offset;
 const inverted=tail.reduce((a,s)=>a+s.i*s.m,0)<0;
 return {samples,rs,count,hasPilot,polarity,preambleLength,payloadCount,rawErrors,pilotErrors,rawBer:payloadCount?rawErrors/payloadCount:null,pilotBer:payloadCount&&hasPilot?pilotErrors/payloadCount:null,rmsPhase,residualFrequency,inverted};
}
const api={defaults,preambleLength,simulate};if(typeof module!=='undefined')module.exports=api;else root.Costas=api;
})(typeof window!=='undefined'?window:globalThis);
