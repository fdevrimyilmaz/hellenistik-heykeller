const { test } = require("node:test"),
  assert = require("node:assert/strict");
const p = require("./research-protocol"),
  m = require("./research-model");
test('eski ad alanı kayıt ve geçmişten temizlenir; gözlemler korunur', () => {
  const legacy = { coder: 'Eski ad', codingNote: 'Kaynak', codeHistory: [{ coder: 'Önceki ad', features: { hair: 'Uzun' } }] };
  const clean = JSON.parse(JSON.stringify(legacy, p.omitCoderName));
  assert.deepEqual(clean, { codingNote: 'Kaynak', codeHistory: [{ features: { hair: 'Uzun' } }] });
  assert.deepEqual(JSON.parse(JSON.stringify(legacy), p.omitCoderName), clean);
});
function specimen(id, subject = "Apollon") {
  return {
    ...JSON.parse(JSON.stringify(m.records[0])),
    id,
    title: id,
    subject,
    sampleRole: "sample",
    features: Object.fromEntries(m.fields.map((f) => [f.id, f.options[0]])),
  };
}

test('tam kayıt doğrulanır; bilinmeyen özellik gerekçe ister ve silinen alan durumu düşürür', () => {
  const record = {...specimen('complete'), verificationState:'verified', bibliography:'Kaynak', iconographyText:'İkonografi', styleText:'Stil', codingNote:'Gerekçe'};
  assert.equal(p.completionLabel(record), 'Doğrulandı');
  record.features.hair = null;
  assert.notEqual(p.completionLabel(record), 'Doğrulandı');
  record.observations = {hair:'Baş korunmamış; saç değerlendirilemiyor.'};
  assert.equal(p.completionLabel(record), 'Doğrulandı');
  record.bibliography = ' ';
  assert.deepEqual(p.missingCompletionFields(record), ['Kaynakça']);
});
function expert(records, order) {
  return {
    ...p.expertTemplate(records, records[0].id),
    expertName: "Uzman",
    recordedAt: "2026-01-01T00:00:00Z",
    independent: true,
    rankedIds: order,
    note: "Bağımsız bilimsel değerlendirme; test verisi.",
  };
}
test("başlangıç kataloğu kesin örneklem olarak sunulmaz; Louvre künye kaydıdır", () => {
  assert.equal(p.sampleSummary(m.records).total, 0);
  assert.equal(p.role(m.records[1]), "reference");
  assert.ok(m.records.every(p.validateCatalogRecord));
  assert.equal(
    p.validateCatalogRecord({ ...m.records[1], sampleRole: "sample" }),
    false,
  );
});
test("Roma kopyası ve prototip tarihi ayrı saklanır, örnekleme alınmaz", () => {
  const r = {
    ...specimen("roma"),
    period: "Roma",
    begin: 1,
    end: 100,
    romanCopy: true,
    prototypeDate: "MÖ 200; tartışmalı",
    sampleRole: "reference",
  };
  assert.ok(p.validateCatalogRecord(r));
  assert.equal(p.eligible(r), false);
  assert.equal(p.validateCatalogRecord({ ...r, sampleRole: "sample" }), false);
});
test("belirsiz tarih ve tartışmalı kimlik yalnızca aday/referans olarak saklanır", () => {
  assert.ok(
    p.validateCatalogRecord({
      ...specimen("a"),
      sampleRole: "candidate",
      begin: null,
      end: null,
    }),
  );
  assert.equal(
    p.validateCatalogRecord({
      ...specimen("a"),
      identityConfidence: "Tartışmalı",
    }),
    false,
  );
  assert.equal(
    p.validateCatalogRecord({ ...specimen("a"), source: "https://" }),
    false,
  );
});
test("tanrıya göre gruplar ve sıralama yalnızca kabul edilmiş örneklemi kullanır", () => {
  const rs = [
    ...Array.from({ length: 3 }, (_, i) => specimen("a" + i)),
    ...Array.from({ length: 3 }, (_, i) => specimen("b" + i, "Afrodit")),
    { ...specimen("ref"), sampleRole: "reference" },
  ];
  assert.equal(p.groupPairs(rs).length, 15);
  assert.equal(p.groupPairs(rs, "apollo").length, 3);
  assert.equal(p.groupPairs(rs, "aphrodite").length, 3);
  assert.equal(p.groupPairs(rs, "cross").length, 9);
});
test("katalog karşılaştırması aday ve referans kayıtlarını gösterir", () => {
  const rs = [
    { ...specimen("candidate-a"), sampleRole: "candidate" },
    { ...specimen("reference-b"), sampleRole: "reference" },
  ];
  assert.equal(p.groupPairs(rs).length, 0);
  assert.equal(p.comparisonPairs(rs).length, 1);
  assert.equal(p.comparisonPairs(rs)[0].score, 100);
});
test("örneklem sayısı toplam 15 ile sınırlı hedef üzerinden raporlanır", () => {
  const rs = Array.from({ length: 16 }, (_, i) =>
    specimen("s" + i, i < 8 ? "Apollon" : "Afrodit"),
  );
  assert.equal(p.sampleSummary(rs).targetReached, false);
  assert.equal(p.sampleSummary(rs.slice(0, 15)).targetReached, true);
});
test("Cohen kappa bilinen çapraz tabloda hesaplanır; eksik veri katılmaz", () => {
  const first = Array.from({ length: 4 }, (_, i) => specimen("a" + i));
  const second = JSON.parse(JSON.stringify(first));
  first.forEach((r, i) => (r.features.hair = i < 2 ? "Dalgalı" : "Uzun"));
  second.forEach((r, i) => {
    r.features.hair = i % 2 ? "Uzun" : "Dalgalı";
    r.features.head = null;
  });
  const r = p.agreement(first, second);
  const hair = r.fields.find((f) => f.id === "hair"),
    head = r.fields.find((f) => f.id === "head");
  assert.equal(hair.n, 4);
  assert.equal(hair.agreement, 50);
  assert.equal(hair.kappa, 0);
  assert.equal(head.n, 0);
  assert.equal(head.kappa, null);
});
test("aynı kayıt nesnesi ve künye uyuşmazlığı ölçüm üretmez", () => {
  const a = specimen("a"),
    b = { ...specimen("a"), begin: -270 };
  assert.equal(p.agreement([a], [a]).matchedRecords, 0);
  assert.equal(p.agreement([a], [b]).matchedRecords, 0);
});
test("tek kategori ve tek gözlemde kappa tanımsız kalır", () => {
  const a = [specimen("a"), specimen("b")],
    b = a.map((r) => ({ ...r }));
  assert.equal(p.agreement(a, b).fields[0].agreement, 100);
  assert.equal(p.agreement(a, b).fields[0].kappa, null);
});
test("uzman sıralaması tamlık, tarih, bağımsızlık ve veri sürümü açısından denetlenir", () => {
  const rs = [specimen("r"), specimen("a"), specimen("b")],
    e = expert(rs, ["a", "b"]);
  assert.ok(p.validExpert(e, rs));
  for (const patch of [
    { independent: false },
    { rankedIds: ["a", "a"] },
    { expertName: "" },
    { recordedAt: "2999-01-01T00:00:00Z" },
    { note: "" },
  ])
    assert.equal(p.validExpert({ ...e, ...patch }, rs), false);
  rs[1].features.hair = "Uzun";
  assert.equal(p.validExpert(e, rs), false);
});
test("uzman-model sırası, ters sıra ve eşitlikler doğru değerlendirilir", () => {
  const rs = [specimen("r"), specimen("a"), specimen("b"), specimen("c")];
  rs[2].features.hair = "Uzun";
  rs[3].features.hair = "Uzun";
  rs[3].features.garment = "Chiton";
  assert.ok(
    Math.abs(p.expertComparison(rs, expert(rs, ["a", "b", "c"])).rho - 1) <
      1e-10,
  );
  assert.ok(
    Math.abs(p.expertComparison(rs, expert(rs, ["c", "b", "a"])).rho + 1) <
      1e-10,
  );
  rs[1].features.hair = "Uzun";
  const result = p.expertComparison(rs, expert(rs, ["a", "b", "c"]));
  assert.equal(result.rows[0].modelRank, 1.5);
  assert.equal(result.rows[1].modelRank, 1.5);
  assert.ok(Math.abs(result.rho - 0.8660254037844387) < 1e-10);
});
test("eksik veya sabit puanlar uzman uyumu varmış gibi gösterilmez", () => {
  const rs = [specimen("r"), specimen("a"), specimen("b")];
  assert.equal(p.expertComparison(rs, expert(rs, ["a", "b"])).rho, null);
  rs[1].features = Object.fromEntries(m.fields.map((f) => [f.id, null]));
  const result = p.expertComparison(rs, expert(rs, ["a", "b"]));
  assert.equal(result.count, 1);
  assert.equal(result.rho, null);
});
