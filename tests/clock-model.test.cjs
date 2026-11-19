const assert=require('node:assert/strict');
const {defaults,rrc,pulseAndGain,simulate}=require('../app/clock-model.js');
for(const alpha of [.1,.35,1]){
 const h=rrc(alpha);assert.ok(Math.abs(h.reduce((a,x)=>a+x*x,0)-1)<1e-12,'Unit-energy RRC');
 const p=pulseAndGain(alpha);assert.ok(Math.abs(p.pulse[(p.pulse.length-1)/2]-1)<1e-12);assert.ok(p.gain>0);
}
const r=simulate(defaults);assert.ok(r.rms<.05,'Clock must settle close to symbol centres');assert.equal(r.recoveredBer,0);assert.ok(r.freeBer>.3);assert.ok(Math.abs(r.meanPeriod)<200);
for(let k=1;k<r.samples.length;k++)assert.equal(r.samples[k].early,r.samples[k-1].current,'Gardner must use the actual previous sampling instant');
assert.equal(r.samples[0].phase,defaults.offset);assert.deepEqual(r,simulate(defaults),'Noise and data are reproducible');
const negative=simulate({...defaults,offset:-.35,ppm:-1000,noise:false});assert.ok(negative.rms<.05);assert.equal(negative.recoveredBer,0);
const constant=simulate({...defaults,pattern:'constant',noise:false});assert.equal(constant.transitions,0);assert.ok(constant.rms>.5,'No ideal timing information may steer a constant-data loop');assert.equal(constant.recoveredBer,0,'Correct constant bits do not prove timing acquisition');
const slow=simulate({...defaults,fn:20,ppm:5000});assert.ok(slow.rms>1);assert.ok(slow.recoveredBer>.3);
const scaled=simulate({...defaults,rate:40,fn:100,duration:.01});assert.equal(scaled.count,r.count);assert.equal(scaled.rms,r.rms);assert.equal(scaled.recoveredBer,r.recoveredBer);
const noiseVar=r.signal.reduce((a,v,i)=>a+(v-r.clean[i])**2,0)/r.signal.length;assert.ok(noiseVar>.0003&&noiseVar<.0007,'AWGN variance after unit-energy matched filter');
for(const params of [defaults,{...defaults,rate:50,fn:500,zeta:2,snr:0,rolloff:.1,duration:.05}]){
 const q=simulate(params);assert.ok(q.signal.every(Number.isFinite));assert.ok(q.samples.every((s,k)=>Number.isFinite(s.current)&&(!k||s.time>q.samples[k-1].time)),'Sampling times must remain finite and strictly increasing');
}
console.log('Clock checks passed: RRC energy, Gardner acquisition, drift correction, no-transition failure, matched-filter noise and monotonic timing.');
