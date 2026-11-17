const { test, expect } = require("@playwright/test");
test("kodlama, açıklanabilir karşılaştırma, saklama ve veri aktarımı", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await expect(page.locator("#catalogCount")).toHaveText(
    String(require("../research-model").records.length),
  );
  await expect(page.locator("#comparisonResult")).toContainText(
    "veri yetersiz",
  );
  for (const id of ["apolloHead", "venusMilo"]) {
    await page.selectOption("#codingRecord", id);
    for (const [name, value] of [
      ["attribute", "Yaprak çelengi"],
      ["garment", "Himation"],
      ["hair", "Dalgalı"],
    ])
      await page.locator('[name="' + name + '"]').selectOption(value);
    await page.fill(
      "#codingNote",
      "Yalnızca işlev testi; bilimsel kodlama değildir.",
    );
    await page.locator("#codingForm button").click();
  }
  await expect(page.locator("#comparisonResult")).toContainText("100 / 100");
  await expect(page.locator("#comparisonResult")).toContainText("3 / 8");
  await page.reload();
  await expect(page.locator("#comparisonResult")).toContainText("100 / 100");
  await page.selectOption("#secondSculpture", "apolloHead");
  await expect(page.locator("#comparisonResult")).toContainText(
    "İki farklı eser",
  );
  await expect(page.locator("#comparisonResult")).not.toContainText(
    "100 / 100",
  );
  await page.selectOption("#secondSculpture", "venusMilo");
  await page.click("#openComparison");
  await expect(page.locator("#comparisonModal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#comparisonModal")).toBeHidden();
  const downloadPromise = page.waitForEvent("download");
  await page.click("#exportData");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("hellenistik-apollon-afrodit.json");
  const valid = {
    schemaVersion: 1,
    records: require("../research-model").records,
  };
  await page.locator("#importData").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(valid)),
  });
  await expect(page.locator("#dataStatus")).toContainText("yüklendi");
  await expect(page.locator("#comparisonResult")).toContainText(
    "veri yetersiz",
  );
  await page.locator("#importData").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ schemaVersion: 1, records: [null, null] }),
    ),
  });
  await expect(page.locator("#dataStatus")).toContainText("yüklenemedi");
  await expect(page.locator("#catalogCount")).toHaveText(
    String(require("../research-model").records.length),
  );
  expect(errors).toEqual([]);
});
test("mobil görünüm, yardım ve dışlanan müze adayları", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.click(".mobile-menu");
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page.click(".help-link");
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.route("**/collectionapi.metmuseum.org/**", async (route) => {
    const url = route.request().url();
    const title = url.includes("Aphrodite") ? "Aphrodite" : "Apollo";
    const data = url.includes("/search?")
      ? { objectIDs: [1, 2, 3] }
      : {
          objectID: Number(url.split("/").pop()),
          title: "Head of " + title,
          objectName: "Sculpture",
          isPublicDomain: true,
          period: "Hellenistic",
          objectDate: "250–200 BCE",
          objectBeginDate: -250,
          objectEndDate: url.endsWith("/2") ? 100 : -200,
          ...(url.endsWith("/3") ? { title: "Roman copy of Apollo" } : {}),
        };
    await route.fulfill({ json: data });
  });
  await page.route("**/openaccess-api.clevelandart.org/**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.click("#loadApiData");
  await expect(page.locator("#apiStatus")).toContainText("1 aday bulundu");
  await expect(page.locator(".api-result")).toHaveCount(1);
});

test("mobil uygulama dışa aktarımı açılır ve karşılaştırma değişir", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mobile");
  await expect(
    page.getByText("İkonografik ve biçimsel karşılaştırma", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Benzerlik puanı için veri yetersiz", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Birinci eser: Apollon başı",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("İki farklı eser seçin", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Eser fişi ve elle kodlama", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("Yalnızca baş korunmuştur.", { exact: false }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kapat", exact: true }).click();
  expect(errors).toEqual([]);
});

test("Cleveland adayları Met kesintisinde gösterilir; CC0 ve kronoloji filtrelenir", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/collectionapi.metmuseum.org/**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.route("**/openaccess-api.clevelandart.org/**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 99,
            accession_number: "2000.99",
            title: "Aphrodite",
            creation_date: "250–200 BCE",
            creation_date_earliest: -250,
            creation_date_latest: -200,
            culture: ["Greek"],
            type: "Sculpture",
            share_license_status: "CC0",
          },
          {
            id: 100,
            title: "Aphrodite",
            creation_date_earliest: -400,
            creation_date_latest: -200,
            culture: ["Greek"],
            type: "Sculpture",
            share_license_status: "CC0",
          },
          {
            id: 101,
            title: "Aphrodite",
            creation_date_earliest: -250,
            creation_date_latest: -200,
            culture: ["Greek"],
            type: "Sculpture",
            share_license_status: "Copyrighted",
          },
        ],
      },
    }),
  );
  await page.click("#loadApiData");
  await expect(page.locator("#apiStatus")).toContainText("1 aday bulundu");
  await expect(page.locator("#apiStatus")).toContainText(
    "Met / Apollon: erişim başarısız",
  );
  await expect(page.locator(".api-result")).toHaveCount(1);
  await expect(page.locator(".api-result")).toContainText("Cleveland");
  await expect(page.locator(".api-result")).toContainText("CC0");
  await expect(page.locator(".api-result a")).toHaveAttribute(
    "href",
    "https://www.clevelandart.org/art/2000.99",
  );
  await expect(page.locator("#loadApiData")).toBeEnabled();
  await expect(page.locator("#catalogCount")).toHaveText(
    String(require("../research-model").records.length),
  );
});

test("örneklem grupları, bağımsız dosya, uzman kaydı ve Roma referansı birlikte çalışır", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const m = require("../research-model"),
    p = require("../research-protocol");
  const records = ["r", "a", "b", "c"].map((id, i) => ({
    ...JSON.parse(JSON.stringify(m.records[0])),
    id,
    title: "Test eseri " + id,
    subject: i === 3 ? "Afrodit" : "Apollon",
    sampleRole: "sample",
    codingNote: "İşlev testi; bilimsel veri değildir.",
    features: Object.fromEntries(m.fields.map((f) => [f.id, f.options[0]])),
  }));
  records[2].features.hair = "Uzun";
  records[3].features.hair = "Uzun";
  records[3].features.garment = "Chiton";
  await page.goto("/");
  await page.locator("#importData").setInputFiles({
    name: "sample.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, records })),
  });
  await expect(page.locator("#sampleSummary")).toContainText("4 eser");
  await page.selectOption("#groupMode", "apollo");
  await expect(page.locator("#groupRanking tbody tr")).toHaveCount(3);
  await page.selectOption("#groupMode", "cross");
  await expect(page.locator("#groupRanking tbody tr")).toHaveCount(3);
  let pending = page.waitForEvent("download");
  await page.click("#downloadBlindCopy");
  const blind = JSON.parse(
    require("node:fs").readFileSync(await (await pending).path(), "utf8"),
  );
  expect(
    blind.records.every(
      (r) =>
        Object.values(r.features).every((v) => v === null) &&
        !r.coder &&
        !r.codingNote &&
        !r.codeHistory,
    ),
  ).toBeTruthy();
  const secondary = JSON.parse(JSON.stringify(records));
  secondary[1].features.hair = "Uzun";
  await page.locator("#secondCoderFile").setInputFiles({
    name: "second.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ schemaVersion: 1, records: secondary }),
    ),
  });
  await expect(page.locator("#agreementStatus")).toContainText(
    "4 örneklem kaydı",
  );
  await expect(page.locator("#agreementResults")).toContainText("75.0");
  await expect(page.locator("#agreementResults")).toContainText(
    "uyuşmayan kodlar",
  );
  const expert = {
    ...p.expertTemplate(records, "r"),
    expertName: "Test uzmanı",
    recordedAt: "2026-01-01T00:00:00Z",
    independent: true,
    rankedIds: ["a", "b", "c"],
    note: "Model sıralamasından bağımsız test kaydı.",
  };
  await page.locator("#expertFile").setInputFiles({
    name: "expert.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(expert)),
  });
  await expect(page.locator("#expertStatus")).toContainText(
    "Spearman ρ: 1.000",
  );
  await page.reload();
  await expect(page.locator("#agreementStatus")).toContainText(
    "4 örneklem kaydı",
  );
  await expect(page.locator("#expertStatus")).toContainText(
    "Spearman ρ: 1.000",
  );
  pending = page.waitForEvent("download");
  await page.click("#exportValidationReport");
  const report = JSON.parse(
    require("node:fs").readFileSync(await (await pending).path(), "utf8"),
  );
  expect(report.sample.total).toBe(4);
  expect(report.agreement.matchedRecords).toBe(4);
  expect(report.expertComparison.valid).toBe(true);
  await page.selectOption("#codingRecord", "a");
  await page.locator('[name="hair"]').selectOption("Uzun");
  await page.locator("#codingForm button").click();
  await expect(page.locator("#expertStatus")).toContainText("eşleşmiyor");
  await page.locator("details summary").click();
  await page.selectOption("#metadataRecord", "new");
  const form = page.locator("#metadataForm");
  await form.locator('[name="title"]').fill("Roma kopyası — test");
  await form.locator('[name="period"]').selectOption("Roma");
  await form.locator('[name="sampleRole"]').selectOption("sample");
  await form.locator('[name="begin"]').fill("1");
  await form.locator('[name="end"]').fill("100");
  await form.locator('[name="prototypeDate"]').fill("MÖ 200; test");
  await form.locator('[name="romanCopy"]').check();
  await form.locator('[name="museum"]').fill("Test koleksiyonu");
  await form.locator('[name="source"]').fill("https://example.org/reference");
  await form.locator('[name="license"]').fill("Görsel kullanılmıyor");
  await form
    .locator('[name="sourceNote"]')
    .fill("Örneklem dışı test referansı");
  await form.locator("button").click();
  await expect(page.locator("#metadataStatus")).toContainText(
    "Kayıt yapılamadı",
  );
  await form.locator('[name="sampleRole"]').selectOption("reference");
  await form.locator("button").click();
  await expect(page.locator("#metadataStatus")).toContainText("kaydedildi");
  await expect(page.locator("#catalogCount")).toHaveText("5");
  await expect(page.locator("#sampleSummary")).toContainText("4 eser");
  expect(errors).toEqual([]);
});

test('yerel görseller erişilebilir; katalog güncellemesi önceki kodları korur',async({page})=>{
 const model=require('../research-model');await page.goto('/');
 const legacy=JSON.parse(JSON.stringify(model.records.slice(0,2)));legacy[0].features.hair='Uzun';legacy[0].coder='Önceki araştırmacı';legacy[0].codingNote='Korunması gereken önceki kodlama';legacy[1].dimensions='Kaynak kaydından doğrulanmalı';legacy[1].image=null;
 await page.evaluate(records=>{localStorage.setItem('hellenistic-research-v1',JSON.stringify(records));localStorage.removeItem('hellenistic-local-assets-v1');},legacy);
 await page.reload();await expect(page.locator('#catalogCount')).toHaveText(String(model.records.length));
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hellenistic-research-v1')));expect(saved.find(r=>r.id==='apolloHead').features.hair).toBe('Uzun');expect(saved.find(r=>r.id==='apolloHead').codingNote).toBe('Korunması gereken önceki kodlama');expect(saved.find(r=>r.id==='venusMilo').dimensions).toBe('Yükseklik: 204 cm');await expect(page.locator('#catalogRecords img')).toHaveCount(model.records.length);
 for(const record of model.records){const response=await page.request.get('/'+record.image);expect(response.ok()).toBeTruthy();expect(response.headers()['content-type']).toContain('image/jpeg');}
});
