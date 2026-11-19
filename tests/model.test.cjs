const assert=require('node:assert/strict');
const {defaults,configuration,simulate,noiseAt}=require('../app/model.js');
let p={...defaults},c=configuration(p);
assert.equal(defaults.phase,100);
assert.ok(Math.abs(simulate(p).samples[0].e-100*Math.PI/180)<1e-12);
assert.equal(c.vco,2441e6);assert.equal(c.step,1e6);assert.equal(c.N,97.64);
const integer={...p,r:25,mode:'integer',int:2441};
assert.equal(configuration(integer).output,c.output);assert.equal(configuration(integer).step,c.step);
assert.ok(Math.abs(configuration(integer).floor-c.floor-10*Math.log10(25))<1e-9);
for(const zeta of [.2,.707,1,2]){
 const r=simulate({...p,zeta}),last=r.samples.at(-1);
 const peakFrequencyError=Math.max(...r.samples.map(s=>Math.abs(s.freq-r.c.vco)));
 assert.ok(Math.abs(last.freq-r.c.vco)<Math.max(100,peakFrequencyError*1e-4),'Frequency must converge within 0.01% of the peak excursion');assert.ok(Math.abs(last.e)<.001,'Type-II phase error must converge');
 assert.ok(r.samples.every(s=>Number.isFinite(s.freq)&&Number.isFinite(s.vc)));
}
const unchanged=simulate({...p,initial:2441,phase:0});assert.ok(unchanged.samples.every(s=>s.e===0&&s.freq===2441e6));
const down=simulate({...p,initial:2442,phase:0});assert.ok(down.samples[10].e<0);assert.ok(Math.abs(down.samples.at(-1).freq-2441e6)<100);
const divided=configuration({...p,out:4});assert.equal(divided.output,c.output/4);assert.equal(divided.step,c.step/4);
for(const f of [100,1e3,1e4,1e5,1e6,1e7]){const n=noiseAt(p,f);assert.ok(n.total>=n.refOut&&n.total>=n.vcoOut);assert.ok(Number.isFinite(n.total));}
assert.ok(noiseAt(p,100).vcoOut<noiseAt(p,100).vco-50,'Suppress low-frequency VCO noise');
console.log('PLL model checks passed: synthesis, type-II convergence, downward step, divider, noise power sum.');
