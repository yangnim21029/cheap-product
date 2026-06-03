// Scrape Carousell SF (sold/listed) median for verify batch
// Reuses cookies + UA pattern from scripts/scrape.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PROJECT = '/Users/rose/Documents/cheap-product';
const lock = require(path.join(PROJECT, 'scripts/chromium-lock'));
lock.acquire('verify_carousell_sf.js');

const UA_POOL = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];
const UA = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];

// Item self-pid -> query plan
// (primary query first, broader fallback if n<5)
// CLI mode: node verify_carousell_sf.js <batch.json> [output.json]
//   batch JSON 每筆需含 pid + queries 陣列；或含 title 自動派生 queries
const CLI_BATCH = process.argv[2];
const CLI_OUT = process.argv[3] || '/tmp/carousell_sf_medians.json';

function derivePlan(items) {
  return items.map(it => {
    if (Array.isArray(it.queries) && it.queries.length) {
      return { pid: it.pid, queries: it.queries, title: it.title };
    }
    // 自動派生：title 第一段 + title 整段當 broader fallback
    const t = (it.title || '').trim();
    const head = t.split(/\s+/).slice(0, 3).join(' ');
    const qs = [];
    if (head && head !== t) qs.push(head);
    qs.push(t);
    return { pid: it.pid, queries: qs.filter(Boolean), title: t };
  });
}

const DEFAULT_PLAN = [
  { pid: '1441656140', queries: ['iPad Pro 11 2020 256', 'iPad Pro 11 2020'] },
  { pid: '1441665542', queries: ['Anker Nano 7合1 100W', 'Anker 充電座 100W'] },
  { pid: '1441657776', queries: ['iPhone 17 Pro Max', 'iPhone 17 Pro Max 256'] },
  { pid: '1441658913', queries: ['nikon zfc 28mm', 'Viltrox 75mm f1.2'] },
  { pid: '1441669112', queries: ['費仔 簽名 球員卡', '球員簽名卡'] },
  { pid: '1441666932', queries: ['DUNLOP FX 500 LS', 'DUNLOP FX 500'] },
];

const PLAN = CLI_BATCH
  ? derivePlan(JSON.parse(fs.readFileSync(CLI_BATCH, 'utf8')))
  : DEFAULT_PLAN;

const SCRAPE_JS = `() => {
  const r = [];
  document.querySelectorAll('a[href*="/p/"]').forEach(card => {
    const href = card.getAttribute('href');
    if (!href || !href.includes('/p/')) return;
    const texts = card.innerText.split('\\n').filter(t => t.trim());
    if (texts.length < 2) return;
    const title = texts[0] || '';
    const priceText = texts.find(t => t.includes('NT$')) || '';
    const priceNum = parseInt((priceText.match(/NT\\$([\\d,]+)/) || [])[1]?.replace(/,/g, '') || '0', 10);
    const id = href.match(/-(\\d+)\\//)?.[1] || href.match(/\\/p\\/(\\d+)/)?.[1] || '';
    r.push({ id, title, price: priceNum, priceText });
  });
  return r;
}`;

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

const delay = ms => new Promise(r => setTimeout(r, ms));
const ts = () => new Date().toLocaleTimeString('zh-TW', { hour12: false });

(async () => {
  console.log(`[${ts()}] 啟動 Chromium...`);
  const browser = await chromium.launch({ headless: true });

  let cookies = [];
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(PROJECT, 'references/cookies.json'), 'utf8'));
    cookies = raw.map(c => {
      const sameSiteMap = { 'unspecified': 'Lax', 'no_restriction': 'None', 'lax': 'Lax', 'strict': 'Strict' };
      return {
        name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
        secure: c.secure || false, httpOnly: c.httpOnly || false,
        sameSite: sameSiteMap[(c.sameSite || '').toLowerCase()] || 'Lax',
        ...(c.expirationDate ? { expires: c.expirationDate } : {}),
      };
    });
    console.log(`  載入 ${cookies.length} cookies`);
  } catch (e) { console.log('  no cookies:', e.message?.slice(0, 60)); }

  const ctx = await browser.newContext({ userAgent: UA });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const results = {};

  for (let i = 0; i < PLAN.length; i++) {
    const item = PLAN[i];
    console.log(`\n[${ts()}] [${i + 1}/${PLAN.length}] pid=${item.pid}`);
    const allListings = [];
    const queriesTried = [];

    for (const q of item.queries) {
      const url = `https://tw.carousell.com/search/${encodeURIComponent(q)}?sort_by=3`;
      console.log(`  query: "${q}" -> ${url.slice(0, 90)}`);
      queriesTried.push(q);
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 25000 });
        await delay(5000);
        const items = await page.evaluate(`(${SCRAPE_JS})()`);
        const filtered = items
          .filter(it => it.id && it.id !== item.pid && it.price > 0)
          .map(it => ({ ...it, query: q }));
        console.log(`    抓 ${items.length} 筆, 有效 ${filtered.length} (扣本品 + 0 價)`);
        // 印前 3
        filtered.slice(0, 3).forEach(it => {
          console.log(`      NT$${it.price} ${it.title.slice(0, 50)}`);
        });
        allListings.push(...filtered);
        if (allListings.length >= 5) break;
      } catch (e) {
        console.log(`    ❌ ${e.message.slice(0, 80)}`);
      }
      await delay(8000);
    }

    // Dedup by id, keep first occurrence
    const seen = new Set();
    const dedup = allListings.filter(it => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });

    const prices = dedup.map(it => it.price).filter(p => p > 0);
    results[item.pid] = {
      queries: queriesTried,
      n: prices.length,
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      median: median(prices),
      samples: dedup.slice(0, 8).map(it => ({ price: it.price, title: it.title.slice(0, 70), query: it.query })),
    };
    console.log(`  → n=${prices.length} median=NT$${results[item.pid].median} range=NT$${results[item.pid].min}-${results[item.pid].max}`);

    // 等待避免 rate limit
    await delay(12000 + Math.random() * 6000);
  }

  fs.writeFileSync(CLI_OUT, JSON.stringify(results, null, 2));
  console.log(`\n✓ 寫入 ${CLI_OUT}`);
  await browser.close();
  process.exit(0);
})();
