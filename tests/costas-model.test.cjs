const assert=require('node:assert/strict');
const {defaults,simulate}=require('../app/costas-model.js');
const clean={...defaults,noise:false},r=simulate(clean);
assert.ok(r.rmsPhase<.001);assert.ok(Math.abs(r.residualFrequency)<.01);assert.equal(r.rawBer,0);assert.equal(r.pilotBer,0);
assert.equal(r.payloadCount,r.count-64);
for(const s of r.samples)assert.ok(Math.abs(s.detector-.5*Math.sin(2*s.error))<1e-12,'I*Q must cancel the BPSK sign');
const ambiguous=simulate({...clean,phase:140,offset:0});
assert.ok(ambiguous.rmsPhase<.001);assert.equal(ambiguous.inverted,true);assert.equal(ambiguous.rawBer,1);assert.equal(ambiguous.pilotBer,0);assert.equal(ambiguous.polarity,-1);
const opposite=simulate({...clean,phase:-120});
for(let j=0;j<r.samples.length;j++){assert.ok(Math.abs(opposite.samples[j].frequency-r.samples[j].frequency)<1e-8);assert.ok(Math.abs(opposite.samples[j].i+r.samples[j].i)<1e-9);}
const unresolved=simulate(defaults),resolved=simulate({...defaults,resolve:true});assert.deepEqual(unresolved,resolved,'Resolving bits must not change oscillator or I/Q');
assert.ok(unresolved.rmsPhase<2);assert.equal(unresolved.rawBer,0);assert.deepEqual(unresolved,simulate(defaults));
const slow=simulate({...defaults,fn:50,offset:1500});assert.ok(Math.abs(slow.residualFrequency)>1000);assert.ok(slow.rawBer>.3);
const negative=simulate({...clean,phase:-60,offset:-200});assert.ok(negative.rmsPhase<.001);assert.equal(negative.rawBer,0);
const short=simulate({...clean,rate:5,duration:.01});assert.equal(short.hasPilot,false);assert.equal(short.rawBer,null);assert.equal(short.pilotBer,null);
const noisy=simulate({...defaults,snr:0});assert.ok(noisy.rmsPhase>unresolved.rmsPhase);assert.ok(noisy.samples.every(s=>Number.isFinite(s.i)&&Number.isFinite(s.frequency)));
console.log('Costas checks passed: acquisition, BPSK sign cancellation, 180-degree ambiguity, pilot, noise and finite observation windows.');
