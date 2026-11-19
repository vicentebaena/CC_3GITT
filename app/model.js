/* CC 3GITT: averaged, linear type-II PLL. No RF carrier is numerically sampled. */
(function(root){
'use strict';
const defaults={ref:25,r:1,mode:'fractional',int:97,frac:16,mod:25,out:1,initial:2440,fn:20,zeta:.707,kvco:100,phase:100,refNoise:-145,vcoNoise:-90};
function configuration(p){
 const pfd=p.ref*1e6/p.r,N=p.int+(p.mode==='integer'?0:p.frac/p.mod);
 return {pfd,N,vco:pfd*N,output:pfd*N/p.out,step:pfd/(p.mode==='integer'?1:p.mod)/p.out,floor:-220+10*Math.log10(pfd)+20*Math.log10(N)};
}
function simulate(p, options={}){
 const c=configuration(p),wn=2*Math.PI*p.fn*1000,kp=2*p.zeta*wn/(2*Math.PI),ki=wn*wn/(2*Math.PI);
 const duration=options.duration ?? 12*Math.max(1/p.zeta,p.zeta>1?p.zeta+Math.sqrt(p.zeta*p.zeta-1):1)/wn,dt=duration/1800,delta=c.vco-p.initial*1e6;
 // Keep RK4 stable when a fixed display window spans many fast time constants.
 const substeps=Math.max(1,Math.ceil(dt*wn*Math.max(1,p.zeta)*8)),h=dt/substeps;
 let e=p.phase*Math.PI/180,i=0,maxError=0;
 const samples=[];
 const derivative=(a,b)=>[2*Math.PI*(delta/c.N-kp*a-b),ki*a];
 for(let n=0;n<=1800;n++){
  const freq=p.initial*1e6+c.N*(kp*e+i),vc=1.5+(freq-p.initial*1e6)/(p.kvco*1e6);
  maxError=Math.max(maxError,Math.abs(e));
  samples.push({t:n*dt,e,freq,vc,detector:e/(2*Math.PI)});
  for(let k=0;k<substeps;k++){
   const a=derivative(e,i),b=derivative(e+h*a[0]/2,i+h*a[1]/2),d=derivative(e+h*b[0]/2,i+h*b[1]/2),f=derivative(e+h*d[0],i+h*d[1]);
   e+=h*(a[0]+2*b[0]+2*d[0]+f[0])/6;i+=h*(a[1]+2*b[1]+2*d[1]+f[1])/6;
  }
 }
 let settling=null,lastOutside=-1;
 const tolerance=Math.max(Math.abs(delta)*.01,1);
 samples.forEach((s,j)=>{if(Math.abs(s.freq-c.vco)>tolerance)lastOutside=j;});
 if(lastOutside<samples.length-1)settling=samples[lastOutside+1].t;
 return {c,samples,maxError,settling,duration};
}
function noiseAt(p,f){
 const c=configuration(p),wn=2*Math.PI*p.fn*1000,w=2*Math.PI*f,den=(wn*wn-w*w)**2+(2*p.zeta*wn*w)**2;
 const h2=(wn**4+(2*p.zeta*wn*w)**2)/den,ev2=w**4/den;
 const ref=p.refNoise+10*Math.log10(1+(1000/f)**2);
 const vco=10*Math.log10(10**((p.vcoNoise-20*Math.log10(f/1e4))/10)+10**(-155/10));
 const inPower=10**(c.floor/10)+c.N*c.N*10**(ref/10);
 const refOut=10*Math.log10(inPower*h2),vcoOut=vco+10*Math.log10(ev2);
 return {refOut,vcoOut,vco,total:10*Math.log10(10**(refOut/10)+10**(vcoOut/10))};
}
const api={defaults,configuration,simulate,noiseAt};
if(typeof module!=='undefined')module.exports=api;else root.PLL=api;
})(typeof window!=='undefined'?window:globalThis);
