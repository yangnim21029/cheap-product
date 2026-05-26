// Carousell 免費物品 (free-items-2158) 巡邏 - 獨立流程
// 不走 QUERIES/CATEGORIES, 不寫 raw_results.json (避免污染主 patrol)
// 輸出 raw_free.json 給 process-free.js 用

const { chromium } = require('playwright');
const fs = require('fs');

const ts = () => new Date().toLocaleTimeString('zh-TW', { hour12: false });
const URL = 'https://tw.carousell.com/categories/free-items-2158/';

(async () => {
  console.log(`[${ts()}] 啟動 Chromium (免費物品)`);
  const browser = await chromium.launch({ headless: true });

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
  } catch {}

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'zh-TW',
    viewport: { width: 1440, height: 900 },
  });
  if (cookies.length) await ctx.addCookies(cookies);

  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 滾動 4 輪抓更多
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 2000));
    await page.waitForTimeout(1500);
  }

  const items = await page.evaluate(() => {
    // 每個商品卡有 2 個 /p/ link (圖片包裝 + 文字包裝)。先收集所有候選，最後挑 lines 最多那個
    const byPid = {};
    document.querySelectorAll('a[href*="/p/"]').forEach(card => {
      const href = card.getAttribute('href') || '';
      const clean = href.split('?')[0];
      const m = clean.match(/-(\d{6,})\/?$/);
      if (!m) return;
      const pid = m[1];

      const lines = card.innerText.split('\n').map(t => t.trim()).filter(Boolean);
      const title = lines[0] || '';
      if (!title || title.length < 4) return;

      let seller = '';
      const parent = card.parentElement;
      if (parent) {
        const sl = parent.querySelector('a[href*="/u/"]');
        if (sl) seller = sl.innerText.split('\n')[0].trim();
      }

      const condition = lines.find(t => ['Brand new','Like new','Lightly used','Well used','Heavily used','全新','幾乎全新','輕度使用','狀況良好','狀況尚可'].includes(t)) || '';
      const timeAgo = lines.find(t => /(minutes? ago|hours? ago|days? ago|yesterday|天前|小時前|分鐘前)/i.test(t)) || '';

      // 取 lines 較多的那個（含 title + condition + time）
      if (!byPid[pid] || lines.length > byPid[pid]._lines) {
        byPid[pid] = {
          pid, title, condition, timeAgo, seller,
          url: 'https://tw.carousell.com/p/' + pid + '/',
          listedAt: Date.now(),
          _lines: lines.length,
        };
      }
    });
    return Object.values(byPid).map(o => { delete o._lines; return o; });
  });

  console.log(`[${ts()}] 抓到 ${items.length} 筆免費物品`);
  fs.writeFileSync('raw_free.json', JSON.stringify(items, null, 2));
  console.log('已寫入 raw_free.json');

  await browser.close();
})().catch(e => { console.error('[scrape-free] ERR', e.message); process.exit(1); });
