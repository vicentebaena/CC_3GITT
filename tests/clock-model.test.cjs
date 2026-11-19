const assert=require('node:assert/strict');
const {defaults,rrc,pulseShape,interpolate,simulate}=require('../app/clock-model.js');
for(const alpha of [.1,.35,1]){const h=rrc(alpha);assert.ok(Math.abs(h.reduce((a,x)=>a+x*x,0)-1)<1e-12);const p=pulseShape(alpha);assert.ok(Math.abs(p.pulse[(p.pulse.length-1)/2]-1)<1e-12);}
const r=simulate(defaults);assert.ok(r.rms<.02);assert.equal(r.recoveredBer,0);assert.ok(r.freeBer>.3);assert.equal(r.saturated,0);assert.ok(r.pulses.length>100);
for(const s of r.samples.filter(s=>s.t>=0&&s.t<=defaults.duration)){const phase=interpolate(r.history.phase,s.t*r.rs*r.simulationSps);assert.ok(Math.abs(phase-(-.5+s.k))<1e-8,'Decisions must occur at actual falling VCO edges');}
assert.equal(r.pulses[0].sign,1,'A late clock must get an UP pulse');
const early=simulate({...defaults,offset:-.35,ppm:-1000,noise:false});assert.equal(early.pulses[0].sign,-1);assert.ok(early.rms<.02);assert.equal(early.recoveredBer,0);
const constant=simulate({...defaults,pattern:'constant',noise:false});assert.equal(constant.pulses.length,0);assert.ok(constant.rms>.5);assert.equal(constant.recoveredBer,0);assert.ok(constant.history.voltage.every(v=>v===0));
for(const s of constant.samples){assert.ok(Math.abs(s.time-s.freeTime)<1e-8,'Without input transitions the VCO must coast freely');}
const open=simulate({...defaults,fn:0,noise:false});assert.ok(open.pulses.length>100);assert.ok(open.rms>.5);assert.ok(open.history.voltage.every(v=>v===0),'Zero filter gain must prevent detector pulses from steering the VCO');
const doubled=simulate({...defaults,kvco:4});assert.deepEqual(doubled.history.phase,r.history.phase);for(let n=0;n<r.history.voltage.length;n++)assert.equal(doubled.history.voltage[n],r.history.voltage[n]/2);
const slow=simulate({...defaults,fn:20,ppm:5000});assert.ok(slow.rms>1);assert.ok(slow.recoveredBer>.3);
const noiseVar=r.signal.reduce((a,v,i)=>a+(v-r.clean[i])**2,0)/r.signal.length;assert.ok(noiseVar>.0003&&noiseVar<.0007);
for(const p of [defaults,{...defaults,rate:50,fn:500,zeta:2,snr:0,rolloff:.1,duration:.05}]){const q=simulate(p);assert.ok(q.samples.every((s,k)=>Number.isFinite(s.current)&&Number.isFinite(s.m)&&(!k||s.time>q.samples[k-1].time)));assert.ok(q.history.phase.every(Number.isFinite));}
console.log('Classical clock PLL checks passed: edge pulses, PI/VCO acquisition, actual sampling edges, holdover, filter gain, VCO gain and noise.');
