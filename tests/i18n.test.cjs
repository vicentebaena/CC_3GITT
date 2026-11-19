const assert=require('node:assert/strict');
const {translate,catalog}=require('../app/i18n.js');
for(const [spanish,english] of Object.entries(catalog)){
 assert.equal(translate(spanish,'en'),english);
 assert.equal(translate(spanish,'es'),spanish);
}
assert.equal(translate('  Ayuda contextual  ','en'),'  Context help  ');
assert.equal(translate('2441.000 MHz','en'),'2441.000 MHz');
assert.equal(translate('N = 97.6400 · Suelo PFD/CP en VCO ≈ -106.2 dBc/Hz · Establecimiento al 1 %: 52.8 µs','en'),'N = 97.6400 · PFD/CP floor at VCO ≈ -106.2 dBc/Hz · 1% settling time: 52.8 µs');
assert.equal(translate('200 símbolos · 64 de piloto · 136 para BER · sin ruido añadido','en'),'200 symbols · 64 pilot · 136 for BER · no added noise');
assert.equal(translate('Error RMS de fase 0.50 grados, BER bruta 0.0 %.','en'),'RMS phase error 0.50 degrees, Raw BER 0.0 %.');
for(const title of ['Diagrama','Mensaje','Lazo','Enganche','Constelación','Datos I/Q','Pausar','Amortiguamiento','Idioma de la interfaz','Reloj BPSK','Ojo','Muestreo'])assert.notEqual(translate(title,'en'),title);
console.log('ES/EN checks passed: catalogue, original Spanish, dynamic summaries, accessibility and unchanged units.');
