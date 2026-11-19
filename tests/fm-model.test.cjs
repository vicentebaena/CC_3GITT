const assert=require('node:assert/strict');
const {defaults,simulate,message}=require('../app/fm-model.js');
assert.equal(defaults.noise,true);
assert.equal(defaults.snr,30);
const p={...defaults,noise:false};
const clean=simulate(p);
assert.ok(clean.nrmse<.01,'Default FM message must be recovered accurately');
assert.equal(clean.slips,0);
for(const type of ['1','2']){
 const tracked=simulate({...p,type,deviation:1,message:.5,offset:10,duration:.005});
 assert.equal(tracked.slips,0);
 assert.ok(tracked.nrmse<.05,'Both types must recover FM when tracking is easy');
}
const low=simulate({...p,fn:2,message:5,deviation:75});
assert.ok(low.nrmse>clean.nrmse*10,'Narrow loop must visibly degrade tracking');
assert.ok(low.slips>0,'Overloaded sinusoidal detector must show cycle slips');
const noisy=simulate({...p,noise:true,snr:20});
assert.ok(noisy.nrmse>clean.nrmse,'Input noise must affect recovered message');
assert.deepEqual(noisy,simulate({...p,noise:true,snr:20}),'Noise must be reproducible');
const moved=simulate({...p,carrier:110});
assert.deepEqual(clean.samples,moved.samples,'RF center frequency must not change phase-domain dynamics');
const doubledGain=simulate({...p,kvco:200});
assert.equal(doubledGain.samples[100].vc,clean.samples[100].vc/2);
assert.equal(doubledGain.samples[100].recovered,clean.samples[100].recovered);
for(const wave of ['sine','twoTone'])for(let j=0;j<100;j++)assert.ok(Math.abs(message({...p,wave},j*.000037))<=1.000001);
for(const extreme of [{...p,fn:150,zeta:2,noise:true,snr:0,duration:.01},{...p,type:'1',fn:2,offset:100}])assert.ok(simulate(extreme).samples.every(s=>Number.isFinite(s.recovered)&&Number.isFinite(s.e)));
console.log('FM checks passed: recovery, loop types, loss of tracking, AWGN, carrier invariance, VCO gain and stability.');
