// Ad-hoc scrape: 大坪數除濕機 18L / 22L 專案
const { chromium } = require('playwright');
const fs = require('fs');

const QUERIES = [
  { q: '22L 除濕機', priceMax: 20000 },
  { q: '18L 除濕機', priceMax: 20000 },
  { q: 'Panasonic 除濕機', priceMax: 20000 },
  { q: '三菱 除濕機', priceMax: 20000 },
  { q: '日立 除濕機', priceMax: 20000 },
  { q: 'F-Y45GX', priceMax: 20000 },
  { q: 'F-Y36GX', priceMax: 20000 },
  { q: 'RD-450HG', priceMax: 20000 },
  { q: 'MJ-E220AX', priceMax: 20000 },
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
const ts = () => new Date().toLocaleTimeString('zh-TW', { hour12: false });

(async () => {
  console.log(`[${ts()}] 啟動 Chromium...`);
  const browser = await chromium.launch({ headless: true });

  let cookies = [];
  try {
    const raw = JSON.parse(fs.readFileSync('references/cookies.json', 'utf8'));
    cookies = raw.map(c => {
      const sameSiteMap = { 'unspecified': 'Lax', 'no_restriction': 'None', 'lax': 'Lax', 'strict': 'Strict' };
      return {
        name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
        secure: c.secure || false, httpOnly: c.httpOnly || false,
        sameSite: sameSiteMap[(c.sameSite || '').toLowerCase()] || 'Lax',
        ...(c.expirationDate ? { expires: c.expirationDate } : {}),
      };
    });
    console.log(`  載入 ${cookies.length} 個 cookies`);
  } catch(e) { console.log('  無 cookies.json:', e.message); }

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  if (cookies.length) await ctx.addCookies(cookies);

  const page = await ctx.newPage();
  const all = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const { q, priceMax } = QUERIES[i];
    const url = `https://tw.carousell.com/search/${encodeURIComponent(q)}?addRecent=false&layered_condition=3%2C4%2C7&price_end=${priceMax}&sort_by=3`;
    console.log(`\n[${ts()}] [${i+1}/${QUERIES.length}] "${q}"`);
    console.log(`  ${url}`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 25000 });
      await delay(5000);
      const items = await page.evaluate(`(${SCRAPE_JS})()`);
      console.log(`  抓到 ${items.length} 筆`);
      items.forEach(it => it.query = q);
      // 預覽前 5
      items.slice(0, 5).forEach(it => {
        console.log(`    ${it.price} | ${it.timeAgo} | ${it.title.slice(0, 50)} [${it.seller}]`);
      });
      all.push(...items);
    } catch (e) {
      console.log(`  ❌ ${e.message.slice(0, 80)}`);
    }
    await delay(12000 + Math.random() * 6000);
  }

  await browser.close();

  // 去重
  const seen = new Set();
  const unique = all.filter(it => {
    if (seen.has(it.url)) return false;
    seen.add(it.url);
    return true;
  });

  console.log(`\n=== 完成 ===`);
  console.log(`總共 ${all.length} 筆 (去重 ${unique.length})`);
  fs.writeFileSync('state/dehumid_results.json', JSON.stringify(unique, null, 2));
  console.log(`已寫入 dehumid_results.json`);
})();
