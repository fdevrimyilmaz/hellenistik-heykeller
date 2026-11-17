const { test, expect } = require('@playwright/test');
const model = require('../research-model');
const { visibleCatalog } = require('../catalog-presentation');

test('Expo genel bakış ve referanslar aynı eser kaydının künyesini gösterir', async ({page})=>{
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/mobile?tab=catalog');
  await expect(page.getByRole('tab',{name:'Genel Bakış',exact:true})).toBeAttached();
  for (const label of ['Başlık','Dönem','Tarih','Kültür','Malzeme','Ölçüler','Sınıflandırma','Edinim Bilgisi','Nesne Numarası','Küratörlük Bölümü']) {
    await expect(page.getByTestId('overview-'+label)).toBeAttached();
  }
  await expect(page.getByTestId('overview-Nesne Numarası')).toContainText('74.51.2694');
  await expect(page.getByTestId('overview-Küratörlük Bölümü')).toContainText('Yunan ve Roma Sanatı');
  await expect(page.getByText('İkonografi',{exact:true})).toBeAttached();
  await expect(page.getByText('Stil',{exact:true})).toBeAttached();
  await page.getByRole('tab',{name:'Referanslar',exact:true}).click();
  await expect(page.getByTestId('overview-Nesne Numarası')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Müze kaynağını aç ↗',exact:true})).toBeVisible();
  await expect(page.getByText(model.records[0].bibliography,{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Genel Bakış',exact:true}).click();
  await page.getByTestId('overview-Başlık').scrollIntoViewIfNeeded();
  await page.screenshot({path:'../data/expo-overview-preview.png'});
  await page.getByRole('button',{name:'Eser seç: Apollon başı',exact:true}).click();
  const expected=visibleCatalog(model.records);
  await expect(page.getByRole('button',{name:/Apollon Belvedere/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Venus Medici/})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/olası Afrodit/})).toHaveCount(0);
  for (const record of expected) {
    // Katalog seçicisinin her satırında müze envanteri bulunur.
    await expect(page.getByRole('button').filter({hasText:record.inventory}).first()).toBeAttached();
  }
  await page.getByRole('button',{name:/Afrodit — Venus de Milo/}).click();
  await expect(page.getByTestId('overview-Nesne Numarası')).toContainText('Ma 399');
  await expect(page.getByTestId('overview-Nesne Numarası')).not.toContainText('74.51.2694');
  await page.getByRole('button',{name:'Eser fişi ve elle kodlama',exact:true}).click();
  await page.getByLabel('İkonografi metni',{exact:true}).fill('Araştırmacının Milos Afroditi ikonografi incelemesi.');
  await page.getByLabel('Stil metni',{exact:true}).fill('Araştırmacının stil incelemesi.');
  await page.getByRole('button',{name:'Metinleri kaydet',exact:true}).click();
  await expect(page.getByText('İkonografi, stil ve gözlemleriniz bu cihazda kaydedildi.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Kapat',exact:true}).click();
  await expect(page.getByText('Araştırmacının Milos Afroditi ikonografi incelemesi.',{exact:true})).toBeAttached();
  await expect(page.getByText('Araştırmacının stil incelemesi.',{exact:true})).toBeAttached();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
