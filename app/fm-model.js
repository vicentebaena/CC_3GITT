/* Averaged FM PLL with a normalized sinusoidal phase detector.
   Noise is circular complex AWGN at Fs=2 MHz, before phase detection. */
(function(root){
'use strict';
const defaults={carrier:100,message:1,deviation:25,offset:0,fn:50,zeta:.707,type:'2',wave:'sine',noise:false,snr:30,kvco:100,phase:0,duration:.003};
const sampleRate=2e6;
function message(p,t){const a=2*Math.PI*p.message*1000*t;return p.wave==='twoTone'?(Math.sin(a)+.4*Math.sin(3*a))/1.4:Math.sin(a);}
function simulate(p){
 const dt=1/sampleRate,steps=Math.round(p.duration*sampleRate),stride=Math.max(1,Math.ceil(steps/2400));
 const wn=2*Math.PI*p.fn*1000,kp=p.type==='1'?wn:2*p.zeta*wn,ki=p.type==='1'?0:wn*wn;
 const offset=p.offset*1000,dev=p.deviation*1000,kv=p.kvco*1000,free=p.carrier*1e6-offset;
 const sigma=p.noise?Math.sqrt(10**(-p.snr/10)/2):0;
 let seed=123456789,e=p.phase*Math.PI/180,integral=0,slips=0,maxError=0,errorSum=0,messageSum=0,count=0,peakCorrection=0;
 function uniform(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)+.5)/4294967296;}
 function noisePhase(){if(!sigma)return 0;const a=Math.sqrt(-2*Math.log(uniform())),b=2*Math.PI*uniform();return Math.atan2(sigma*a*Math.sin(b),1+sigma*a*Math.cos(b));}
 const substeps=Math.max(1,Math.ceil(dt*wn*Math.max(1,p.zeta)*8)),h=dt/substeps;
 const samples=[];
 function derivative(t,phase,i,n){const d=Math.sin(phase+n);return [2*Math.PI*(offset+dev*message(p,t))-kp*d-i,ki*d];}
 for(let n=0;n<=steps;n++){
  const t=n*dt,noise=noisePhase(),m=message(p,t),detector=Math.sin(e+noise),correction=(kp*detector+integral)/(2*Math.PI),recovered=(correction-offset)/dev;
  maxError=Math.max(maxError,Math.abs(e));peakCorrection=Math.max(peakCorrection,Math.abs(correction));
  // Use the final half for error metrics, without gain or delay alignment.
  if(n>=steps/2){errorSum+=(recovered-m)**2;messageSum+=m*m;count++;}
  if(n%stride===0||n===steps)samples.push({t,message:m,recovered,input:(offset+dev*m)/1000,vco:correction/1000,e,vc:correction/kv,detector});
  const before=Math.floor((e+Math.PI)/(2*Math.PI));
  for(let k=0;k<substeps;k++){
   const tt=t+k*h,a=derivative(tt,e,integral,noise),b=derivative(tt+h/2,e+h*a[0]/2,integral+h*a[1]/2,noise),c=derivative(tt+h/2,e+h*b[0]/2,integral+h*b[1]/2,noise),d=derivative(tt+h,e+h*c[0],integral+h*c[1],noise);
   e+=h*(a[0]+2*b[0]+2*c[0]+d[0])/6;integral+=h*(a[1]+2*b[1]+2*c[1]+d[1])/6;
  }
  if(n<steps)slips+=Math.abs(Math.floor((e+Math.PI)/(2*Math.PI))-before);
 }
 return {samples,sampleRate,noiseBandwidth:sampleRate/2,free,slips,maxError,peakCorrection,rmsError:Math.sqrt(errorSum/count),nrmse:Math.sqrt(errorSum/Math.max(messageSum,1e-30)),beta:dev/(p.message*1000),messageBandwidth:p.message*1000*(p.wave==='twoTone'?3:1)};
}
const api={defaults,sampleRate,message,simulate};if(typeof module!=='undefined')module.exports=api;else root.FM=api;
})(typeof window!=='undefined'?window:globalThis);
