/* Görünür katalog: nesnenin kendisi Hellenistik olmalı; prototip tarihi yeterli değildir. */
const model = require('./research-model');

function isHellenisticArtifact(record) {
  if (!model.inScope(record) || record.period !== 'Hellenistik' || typeof record.id !== 'string') return false;
  // PDF maddeleri henüz müze envanteriyle doğrulanmış tekil nesne kayıtları değildir.
  if (record.id.startsWith('pdf-')) return false;
  const identity = `${record.identityConfidence || ''} ${record.title || ''}`;
  if (/tartışmalı|olasılı|olası|muhtemel|perhaps|possibly|\(\?\)/iu.test(identity)) return false;
  const objectDating = `${record.date || ''} ${record.datingConfidence || ''}`;
  if (/roma\s*dönemi|roma\s*replik|roma\s*kopya|hellenistik[-– ]roma|hadrian|kaiserzeit|replik|roman\s*(copy|imperial)/iu.test(objectDating)) return false;
  return true;
}

function visibleCatalog(records) {
  return records.filter(record => {
    const seed = model.records.find(r => r.id === record.id);
    return isHellenisticArtifact(record) && (!seed || isHellenisticArtifact(seed));
  });
}

const translations = {
  'Greek': 'Yunan', 'Cypriot': 'Kıbrıs',
  'Greek and Roman Art': 'Yunan ve Roma Sanatı',
  'Stone Sculpture': 'Taş heykel', 'Bronzes': 'Bronz eserler', 'Terracottas': 'Pişmiş toprak eserler',
};
function text(value) {
  return typeof value === 'string' && value.trim() ? translations[value] || value : 'Belirtilmemiş';
}
function overviewFields(record) {
  return [
    ['Başlık', text(record.title)],
    ['Dönem', text(record.period)],
    ['Tarih', text(record.date)],
    ['Kültür', text(record.culture)],
    ['Malzeme', text(record.material)],
    ['Ölçüler', text(record.dimensions)],
    ['Sınıflandırma', text(record.classification)],
    ['Edinim Bilgisi', text(record.creditLine)],
    ['Nesne Numarası', text(record.inventory)],
    ['Küratörlük Bölümü', text(record.department)],
  ];
}

module.exports = { isHellenisticArtifact, visibleCatalog, overviewFields };
