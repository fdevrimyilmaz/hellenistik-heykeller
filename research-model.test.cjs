const { test } = require("node:test");
const assert = require("node:assert/strict");
const m = require("./research-model");
const clone = (r) => JSON.parse(JSON.stringify(r));
test("başlangıç kataloğu kapsam ve şema koşullarını sağlar", () => {
  assert.ok(m.records.every(m.validateRecord));
  assert.equal(m.records[0].features.stance, null);
});
test("Roma kopyası, başka kimlik, sınır dışı ve belirsiz tarihler elenir", () => {
  for (const change of [
    { romanCopy: true },
    { subject: "Zeus" },
    { begin: -400 },
    { end: 10 },
    { begin: null },
    { begin: -100, end: -200 },
  ])
    assert.equal(m.inScope({ ...m.records[0], ...change }), false);
  assert.equal(m.validateRecord(null), false);
});
test("bilinmeyenler sıfır benzerlik olarak yorumlanmaz", () => {
  const r = m.compare(...m.records);
  assert.equal(r.count, 0);
  assert.equal(r.score, null);
  assert.ok(r.rows.every((x) => x.status === "Bilinmiyor"));
});
test("eşit ağırlıklı hesap ve alt gruplar, sıra değişimine dayanıklıdır", () => {
  const a = clone(m.records[0]),
    b = clone(m.records[1]);
  a.features = {
    attribute: "Yaprak çelengi",
    garment: "Himation",
    hair: "Dalgalı",
    stance: "Kontrapost",
    movement: null,
    head: null,
  };
  b.features = { ...a.features, hair: "Alın bandı + chignon", movement: "Frontal" };
  const r = m.compare(a, b);
  assert.equal(r.score, 75);
  assert.equal(r.coverage, 50);
  assert.equal(r.groups[0].score, 67);
  assert.equal(r.groups[1].score, 100);
  assert.equal(m.compare(b, a).score, r.score);
});
test("az veri ve aynı eser için toplam puan üretilmez", () => {
  const a = clone(m.records[0]),
    b = clone(m.records[1]);
  b.features = { ...a.features };
  assert.equal(m.compare(a, b).score, null);
  a.features.hair = "Dalgalı";
  a.features.garment = "Himation";
  assert.equal(m.compare(a, a).score, null);
  assert.ok(m.compare(a, a).groups.every((g) => g.score === null));
});
test("geçersiz kodlar ve güvenli olmayan kaynak adresleri reddedilir", () => {
  assert.equal(
    m.validateRecord({ ...m.records[0], source: "javascript:alert(1)" }),
    false,
  );
  assert.equal(
    m.validateRecord({
      ...m.records[0],
      features: { ...m.records[0].features, hair: "uydurma" },
    }),
    false,
  );
});
