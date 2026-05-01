const { chromium } = require('playwright');
const fs = require('fs');

// === 設定 ===
const QUERIES = [
  { q: 'apple watch', min: 1000, max: 5000 },
  { q: 'Samsung Galaxy Watch', min: 1000, max: 5000 },
  { q: 'Vivienne Westwood', min: 500, max: 5000 },
  { q: '空氣清淨機', min: 500, max: 3000 },
  { q: '投影機', min: 500, max: 5000 },
  { q: 'OSIM', min: 500, max: 5000 },
  { q: '鼠尾草 海鹽', min: 500, max: 5000 },
  { q: 'Jo Malone', min: 500, max: 5000 },
  { q: '香水', min: 500, max: 5000 },
  { q: 'lululemon', min: 300, max: 3000 },
  { q: 'marshall', min: 1000, max: 5000 },
  { q: 'bose', min: 1000, max: 5000 },
  { q: '落地燈', min: 1000, max: 5000 },
  { q: '空氣循環扇', min: 500, max: 3000 },
  { q: 'nespresso', min: 500, max: 3000 },
  { q: '拍立得', min: 500, max: 5000 },
];

const CATEGORIES = [
  { slug: 'furniture-home-living-13', name: '家具居家', min: 500, max: 5000 },
  { slug: 'beauty-personal-care-11', name: '美妝保養', min: 500, max: 5000 },
  { slug: 'luxury-20', name: '精品', min: 500, max: 5000 },
  { slug: 'mobile-phones-gadgets-1091', name: '手機平板', min: 500, max: 5000 },
];

const SCRAPE_JS = `() => {
  const r = [];
  document.querySelectorAll('a[href*="/p/"]').forEach(card => {
    const href = card.getAttribute('href');
    if (!href || !href.includes('/p/')) return;
    const texts = card.innerText.split('\\n').filter(t => t.trim());
    if (texts.length < 2) return;
    const title = texts[0] || '';
    const price = texts.find(t => t.includes('NT$')) || '';
    const condition = texts.find(t =>
      ['Brand new','Like new','Lightly used','Well used','Heavily used'].includes(t)
    ) || '';
    const id = href.match(/-(\\d+)\\//)?.[1] || '';
    let seller = '', timeAgo = '';
    const parent = card.parentElement;
    if (parent) {
      const sl = parent.querySelector('a[href*="/u/"]');
      if (sl) {
        const st = sl.innerText.split('\\n').filter(t => t.trim());
        seller = st[0] || '';
        timeAgo = st[1] || '';
      }
    }
    r.push({ seller, timeAgo, title, price, condition,
      url: 'https://tw.carousell.com/p/' + id + '/' });
  });
  return r;
}`;

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const all = [];

  // 搜尋頁
  for (const { q, min, max } of QUERIES) {
    const url = `https://tw.carousell.com/search/${encodeURIComponent(q)}?addRecent=false&layered_condition=3%2C4%2C7&price_end=${max}&price_start=${min}&sort_by=3`;
    console.log(`搜尋: ${q}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await delay(2000);
      const items = await page.evaluate(SCRAPE_JS);
      items.forEach(i => { i.category = q; });
      all.push(...items);
    } catch (e) {
      console.log(`  ⚠ ${q} 失敗: ${e.message.slice(0, 60)}`);
    }
    await delay(8000 + Math.random() * 4000);
  }

  // 分類頁（要點 Sort → Recent）
  for (const { slug, name, min, max } of CATEGORIES) {
    const url = `https://tw.carousell.com/categories/${slug}/?layered_condition=3%2C4%2C7&price_end=${max}&price_start=${min}`;
    console.log(`分類: ${name}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await delay(2000);
      // 點 Sort → Recent
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sort'));
        if (btn) btn.click();
      });
      await delay(1500);
      await page.evaluate(() => {
        const opt = Array.from(document.querySelectorAll('li, div, span, button, a'))
          .find(el => el.innerText.trim() === 'Recent');
        if (opt) opt.click();
      });
      await delay(3000);
      const items = await page.evaluate(SCRAPE_JS);
      items.forEach(i => { i.category = name; });
      all.push(...items);
    } catch (e) {
      console.log(`  ⚠ ${name} 失敗: ${e.message.slice(0, 60)}`);
    }
    await delay(8000 + Math.random() * 4000);
  }

  await browser.close();

  fs.writeFileSync('raw_results.json', JSON.stringify(all, null, 2));
  console.log(`\n完成！共 ${all.length} 筆原始資料 → raw_results.json`);
  console.log('接下來跑: node process.js');
})();
