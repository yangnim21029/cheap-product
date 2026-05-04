const { chromium } = require('playwright');
const fs = require('fs');

// === 搜尋關鍵字 ===
// maxDays: 最大可接受上架天數（預設 3）
const QUERIES = [
  { q: 'apple watch', min: 1000, max: 5000, maxDays: 3 },
  // { q: 'Samsung Galaxy Watch', min: 1000, max: 5000 }, // 暫停：連續4輪空 2026-05-02
  // { q: 'Vivienne Westwood', min: 500, max: 5000 }, // 暫停 2026-05-02
  { q: '空氣清淨機', min: 500, max: 3000, maxDays: 3 },
  { q: '投影機', min: 2000, max: 10000, maxDays: 5 },
  // { q: 'OSIM', min: 500, max: 5000, maxDays: 5 }, // 暫停 2026-05-03
  // { q: '鼠尾草 海鹽', min: 500, max: 5000 }, // 暫停：香水已搞定 2026-05-02
  // { q: 'Jo Malone', min: 500, max: 5000 }, // 暫停：香水已搞定 2026-05-02
  // { q: '香水', min: 500, max: 5000 }, // 暫停：香水已搞定 2026-05-02
  // lululemon 略過 — Rose 2026-05-02
  // { q: 'marshall', min: 1000, max: 10000, maxDays: 3 }, // 合併到喇叭/音響 2026-05-03
  // { q: 'bose', min: 1000, max: 10000, maxDays: 3 }, // 合併到喇叭/音響 2026-05-03
  { q: '喇叭', min: 2000, max: 10000, maxDays: 3 },
  { q: '音響', min: 2000, max: 10000, maxDays: 5 },
  { q: '立燈', min: 1000, max: 10000, maxDays: 7 },
  { q: '空氣循環扇', min: 500, max: 3000, maxDays: 5 },
  // { q: '咖啡機', min: 1000, max: 10000, maxDays: 5 }, // 暫停 2026-05-03
  { q: '拍立得', min: 500, max: 5000, maxDays: 5 },
  { q: '相印機', min: 500, max: 5000, maxDays: 7 },
  { q: 'VR', min: 1000, max: 5000, maxDays: 7 },
  { q: '帳篷', min: 2000, max: 10000, maxDays: 7 },
  // 無關鍵字瀏覽：雜訊高但偶有冷門品牌好物（SoundSticks 4 等）
  { q: '', min: 5000, max: 10000, maxDays: 1, label: '無關鍵字' },
];

// === 分類頁（需點 Sort → Recent）===
const CATEGORIES = [
  { slug: 'furniture-home-living-13', name: '家具居家', min: 2000, max: 5000 },
  { slug: 'beauty-personal-care-11', name: '美妝保養', min: 2000, max: 5000 },
  { slug: 'luxury-20', name: '精品', min: 2000, max: 5000 },
  { slug: 'mobile-phones-gadgets-1091', name: '手機平板', min: 2000, max: 5000 },
  { slug: 'tv-home-appliances-30', name: '家電影音', min: 2000, max: 5000 },
  { slug: 'audio-1600', name: '音響耳機', min: 2000, max: 5000 },
];

// === 頁面抓取 JS ===
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

// === Query 效果追蹤 ===
const STATS_FILE = 'query_stats.json';
let stats = {};
try { stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch {}

// 每輪隨機跳過比例（0.3 = 跳過 30% 的 queries）
const SKIP_RATIO = 0.3;

(async () => {
  console.log(`[${ts()}] 啟動 Chromium...`);
  const browser = await chromium.launch({ headless: true });

  // 嘗試載入已登入的 cookie
  let cookies = [];
  try {
    const raw = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
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
  } catch(e) { console.log('  無 cookies.json 或格式錯誤:', e.message?.slice(0,60)); }

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  if (cookies.length) await ctx.addCookies(cookies);

  const page = await ctx.newPage();
  const all = [];
  let errorCount = 0;

  // === 搜尋頁（隨機跳過 SKIP_RATIO）===
  const skipSet = new Set();
  while (skipSet.size < Math.floor(QUERIES.length * SKIP_RATIO)) {
    skipSet.add(Math.floor(Math.random() * QUERIES.length));
  }
  const activeCount = QUERIES.length - skipSet.size;
  console.log(`\n=== 搜尋頁（${activeCount}/${QUERIES.length} 個，跳過 ${skipSet.size}）===`);
  for (let i = 0; i < QUERIES.length; i++) {
    const { q, min, max } = QUERIES[i];
    if (skipSet.has(i)) {
      console.log(`[${ts()}] [${i+1}/${QUERIES.length}] 跳過: "${q}"（本輪隨機跳過）`);
      continue;
    }
    const url = `https://tw.carousell.com/search/${encodeURIComponent(q)}?addRecent=false&layered_condition=3%2C4%2C7&price_end=${max}&price_start=${min}&sort_by=3`;
    console.log(`[${ts()}] [${i+1}/${QUERIES.length}] 搜尋: "${q}" ($${min}-$${max})`);
    console.log(`  URL: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await delay(5000);

      const pageTitle = await page.title();
      console.log(`  頁面標題: ${pageTitle}`);

      // 檢查是否被擋（500 錯誤）
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
      if (bodyText.includes('Something') || bodyText.includes('wrong') || bodyText.includes('error')) {
        console.log(`  ⚠ 可能被擋: "${bodyText.slice(0, 100)}"`);
        errorCount++;
        if (errorCount >= 3) {
          console.log(`  🛑 連續錯誤太多，等 30 秒...`);
          await delay(30000);
          errorCount = 0;
        }
        continue;
      }

      const items = await page.evaluate(`(${SCRAPE_JS})()`);
      if (!Array.isArray(items)) {
        console.log(`  ⚠ evaluate 回傳非陣列: ${typeof items}`);
        continue;
      }
      items.forEach(it => { it.category = q; it.maxDays = QUERIES[i].maxDays || 3; });
      const recent = items.filter(it => /minute|hour|1 day|2 days|yesterday/.test(it.timeAgo));
      console.log(`  抓到 ${items.length} 筆（3天內: ${recent.length} 筆）`);

      // 印前 3 筆預覽
      recent.slice(0, 3).forEach(it => {
        console.log(`    → ${it.price} ${it.title.slice(0, 40)} [${it.seller}] ${it.timeAgo}`);
      });

      all.push(...items);
      errorCount = 0;

      // 記錄 query 效果
      if (!stats[q]) stats[q] = { total: 0, recentTotal: 0, zeroStreak: 0, lastSeen: null };
      stats[q].total += items.length;
      stats[q].recentTotal += recent.length;
      if (recent.length === 0) {
        stats[q].zeroStreak = (stats[q].zeroStreak || 0) + 1;
      } else {
        stats[q].zeroStreak = 0;
        stats[q].lastSeen = new Date().toISOString();
      }
    } catch (e) {
      console.log(`  ❌ 失敗: ${e.message.slice(0, 80)}`);
      errorCount++;
    }

    const wait = 15000 + Math.random() * 10000;
    console.log(`  等待 ${(wait/1000).toFixed(1)}s...`);
    await delay(wait);
  }

  // === 分類頁 ===
  console.log(`\n=== 分類頁（${CATEGORIES.length} 個）===`);
  for (let i = 0; i < CATEGORIES.length; i++) {
    const { slug, name, min, max } = CATEGORIES[i];
    const url = `https://tw.carousell.com/categories/${slug}/?layered_condition=3%2C4%2C7&price_end=${max}&price_start=${min}`;
    console.log(`[${ts()}] [${i+1}/${CATEGORIES.length}] 分類: ${name}`);
    console.log(`  URL: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await delay(5000);

      const pageTitle = await page.title();
      console.log(`  頁面標題: ${pageTitle}`);

      // 檢查 500 錯誤
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
      if (bodyText.includes('Something') || bodyText.includes('wrong')) {
        console.log(`  ⚠ 可能被擋: "${bodyText.slice(0, 100)}"`);
        errorCount++;
        continue;
      }

      // 點 Sort → Recent
      const sortClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sort'));
        if (btn) { btn.click(); return true; }
        return false;
      });
      console.log(`  Sort 按鈕: ${sortClicked ? '找到並點擊' : '❌ 沒找到'}`);
      await delay(1500);

      const recentClicked = await page.evaluate(() => {
        const opt = Array.from(document.querySelectorAll('li, div, span, button, a'))
          .find(el => el.innerText.trim() === 'Recent');
        if (opt) { opt.click(); return true; }
        return false;
      });
      console.log(`  Recent 選項: ${recentClicked ? '找到並點擊' : '❌ 沒找到'}`);
      await delay(3000);

      const items = await page.evaluate(`(${SCRAPE_JS})()`);
      if (!Array.isArray(items)) {
        console.log(`  ⚠ evaluate 回傳非陣列: ${typeof items}`);
        continue;
      }
      items.forEach(it => { it.category = name; it.maxDays = 3; });
      const recent = items.filter(it => /minute|hour|1 day|2 days|yesterday/.test(it.timeAgo));
      console.log(`  抓到 ${items.length} 筆（3天內: ${recent.length} 筆）`);

      recent.slice(0, 3).forEach(it => {
        console.log(`    → ${it.price} ${it.title.slice(0, 40)} [${it.seller}] ${it.timeAgo}`);
      });

      all.push(...items);
      errorCount = 0;
    } catch (e) {
      console.log(`  ❌ 失敗: ${e.message.slice(0, 80)}`);
      errorCount++;
    }

    const wait = 20000 + Math.random() * 10000;
    console.log(`  等待 ${(wait/1000).toFixed(1)}s...`);
    await delay(wait);
  }

  await browser.close();

  // === 統計 ===
  const unique = [...new Set(all.map(i => i.url))].length;
  const recentAll = all.filter(it => /minute|hour|1 day|2 days|yesterday/.test(it.timeAgo));
  console.log(`\n=== 完成 ===`);
  console.log(`[${ts()}] 總共 ${all.length} 筆（去重 ${unique}，3天內 ${recentAll.length} 筆）`);
  console.log(`來源: ${QUERIES.length} 搜尋 + ${CATEGORIES.length} 分類`);

  fs.writeFileSync('raw_results.json', JSON.stringify(all, null, 2));
  console.log(`已寫入 raw_results.json`);

  // === Query 效果報告 ===
  const deadQueries = Object.entries(stats).filter(([, s]) => s.zeroStreak >= 3);
  if (deadQueries.length > 0) {
    console.log(`\n⚠ 建議暫停的 queries（連續 3+ 輪 0 筆 3 天內商品）：`);
    deadQueries.forEach(([q, s]) => {
      console.log(`  ✗ "${q}" — 連續 ${s.zeroStreak} 輪沒新貨，上次有貨: ${s.lastSeen || '從未'}`);
    });
  }

  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  console.log(`\n已寫入 ${STATS_FILE}`);
  console.log(`接下來跑: node process.js`);
})();
