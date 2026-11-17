const { test } = require('node:test');
const assert = require('node:assert/strict');
const model = require('./research-model');
const { isHellenisticArtifact, visibleCatalog, overviewFields } = require('./catalog-presentation');

test('görünür katalog Roma kopyalarını, belirsiz kimlikleri ve PDF ön kayıtlarını ayırır',()=>{
  const base = model.records[0];
  assert.equal(isHellenisticArtifact(base),true);
  for (const change of [{subject:'Zeus'},{end:50},{romanCopy:true},{date:'Roma dönemi replikası; Hellenistik orijinal'},{date:'Hadrianus dönemi yeniden üretimi; Hellenistik öncül'},{id:'pdf-apollo-citharoedus'},{identityConfidence:'Tartışmalı'}]) {
    assert.equal(isHellenisticArtifact({...base,...change}),false,JSON.stringify(change));
  }
  const records = visibleCatalog(model.records);
  assert.ok(records.length >= 2);
  assert.ok(records.every(isHellenisticArtifact));
  assert.ok(!records.some(r=>r.id === 'arachne-1076032'));
  assert.ok(!records.some(r=>r.id.startsWith('pdf-')));
  // Eski cihaz kayıtları dışlanan bir kaydı değiştirmiş olsa da tohum kaydın kararı korunur.
  const old = {...model.records.find(r=>r.id==='pdf-apollo-citharoedus'),date:'MÖ 2. yüzyıl'};
  assert.equal(visibleCatalog([old]).length,0);
});

test('genel bakış künye alanları aynı nesneden gelir; eksikler uydurulmaz',()=>{
  const fields = Object.fromEntries(overviewFields(model.records[0]));
  assert.equal(fields['Nesne Numarası'],'74.51.2694');
  assert.equal(fields['Küratörlük Bölümü'],'Yunan ve Roma Sanatı');
  assert.equal(fields['Dönem'],'Hellenistik');
  const missing = Object.fromEntries(overviewFields({...model.records[0],department:null,culture:''}));
  assert.equal(missing['Küratörlük Bölümü'],'Belirtilmemiş');
  assert.equal(missing['Kültür'],'Belirtilmemiş');
});
