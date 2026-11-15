const { test } = require("node:test");
const assert = require("node:assert/strict");
const api = require("./museum-api");
const cma = {
  id: 1,
  accession_number: "1927.1",
  title: "Aphrodite",
  creation_date: "250–200 BCE",
  creation_date_earliest: -250,
  creation_date_latest: -200,
  culture: ["Greek"],
  type: "Sculpture",
  share_license_status: "CC0",
  images: { web: { url: "https://example.org/art.jpg" } },
};
test("Cleveland tarih, konu, nesne türü ve görsel lisansı denetlenir", () => {
  const r = api.normalizeCleveland(cma, "Aphrodite");
  assert.equal(r.source, "Cleveland");
  assert.equal(r.license, "CC0");
  assert.equal(r.inventory, "1927.1");
  assert.equal(r.url, "https://www.clevelandart.org/art/1927.1");
  for (const change of [
    { share_license_status: "Copyrighted" },
    { share_license_status: "Other" },
    { title: "Zeus" },
    { type: "Coin" },
    { creation_date_earliest: -400 },
    { creation_date_latest: 100 },
    { creation_date_earliest: null },
    { creation_date_latest: undefined },
    { culture: ["Roman"] },
    { description: "Roman copy of a Greek original" },
    { title: "Copy of Aphrodite" },
  ])
    assert.equal(
      api.normalizeCleveland({ ...cma, ...change }, "Aphrodite"),
      null,
    );
  assert.equal(
    api.normalizeCleveland({ ...cma, title: "Apollo" }, "Apollo").source,
    "Cleveland",
  );
});
test("Cleveland belgelenmiş fields, CC0 ve negatif tarih parametrelerini kullanır", async () => {
  let url;
  await api.collectCleveland("Aphrodite", async (u) => {
    url = new URL(u);
    return { data: [cma] };
  });
  assert.equal(url.searchParams.get("type"), "Sculpture");
  assert.equal(url.searchParams.has("cc0"), true);
  assert.ok(url.searchParams.get("fields").includes("creation_date_earliest"));
  assert.equal(url.searchParams.get("created_after"), "-324");
});
test("müzeler arası aynı kimlik çakışmaz; aynı kaynak yinelenmez", async () => {
  const result = await api.discover(async (url) =>
    url.includes("/search?")
      ? { objectIDs: [1] }
      : url.includes("metmuseum.org")
        ? {
            objectID: 1,
            title: "Aphrodite",
            objectName: "Statue",
            isPublicDomain: true,
            objectBeginDate: -250,
            objectEndDate: -200,
          }
        : { data: [cma, cma] },
  );
  assert.equal(result.records.length, 2);
  assert.deepEqual(
    new Set(result.records.map((r) => r.source)),
    new Set(["Met", "Cleveland"]),
  );
});
test("Met yanıt vermese de Cleveland sonucu ve hata özeti korunur", async () => {
  const r = await api.discover(async (url) => {
    if (url.includes("metmuseum.org")) throw Error("HTTP 503");
    return { data: [cma] };
  });
  assert.equal(r.records.length, 1);
  assert.equal(r.reports.filter((r) => r.error).length, 2);
  assert.equal(r.records[0].source, "Cleveland");
});
test("Cleveland yanıt vermese de Met sonucu korunur", async () => {
  const r = await api.discover(async (url) => {
    if (url.includes("clevelandart.org")) throw Error("HTTP 429");
    if (url.includes("/search?")) return { objectIDs: [1] };
    return {
      objectID: 1,
      title: "Apollo",
      objectName: "Head",
      isPublicDomain: true,
      objectBeginDate: -250,
      objectEndDate: -200,
    };
  });
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].source, "Met");
  assert.equal(r.reports.filter((r) => r.error).length, 2);
});
