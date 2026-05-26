// 抓單筆 Carousell listing 詳情 (priceStr/timeAgo/condition/title)
// 用法: node fetch-listing.js <pid> [<pid>...]
// 走 Playwright + 抓頁面內嵌 JSON (__NEXT_DATA__) 比 DOM text 準

const { chromium } = require('playwright');
const fs = require('fs');

const pids = process.argv.slice(2);
if (pids.length === 0) {
  console.error('usage: node fetch-listing.js <pid> [<pid>...]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  let cookies = [];
  try {
    const raw = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
    cookies = raw.map(c => {
      const m = { unspecified:'Lax', no_restriction:'None', lax:'Lax', strict:'Strict' };
      return { name:c.name, value:c.value, domain:c.domain, path:c.path||'/',
        secure:c.secure||false, httpOnly:c.httpOnly||false,
        sameSite: m[(c.sameSite||'').toLowerCase()] || 'Lax',
        ...(c.expirationDate ? { expires: c.expirationDate } : {}) };
    });
  } catch {}
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'zh-TW',
  });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const out = [];
  for (const pid of pids) {
    const url = `https://tw.carousell.com/p/${pid}/`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const data = await page.evaluate(() => {
      // 先嘗試從 __NEXT_DATA__ JSON 抓 (更準)
      const next = document.querySelector('script#__NEXT_DATA__');
      let listing = null;
      if (next) {
        try {
          const j = JSON.parse(next.textContent);
          const queries = j?.props?.pageProps?.apolloState || j?.props?.pageProps || {};
          for (const k of Object.keys(queries)) {
            if (k.includes('Listing') || k.includes('Product')) {
              listing = queries[k];
              break;
            }
          }
        } catch {}
      }
      // 退到 body text 解析
      const text = document.body.innerText;
      const m = text.match(/(\d+\s*(?:秒|分鐘|小時|天|個禮拜|個月|年|years?|months?|days?|hours?|minutes?|seconds?)\s*(?:前|ago))/i);
      const cond = ['Brand new','Like new','Lightly used','Well used','Heavily used','全新','幾乎全新','輕度使用','狀況良好','狀況尚可'].find(c => text.includes(c));
      const price = (text.match(/NT\$[\d,]+/) || [])[0] || '';
      const title = document.querySelector('h1')?.innerText || document.title.split('|')[0].trim();
      return { listing_meta: listing ? {
        createdAt: listing.createdAt || listing.timeCreated || listing.created_at,
        price: listing.price,
        title: listing.title,
        status: listing.status,
        condition: listing.condition,
      } : null, dom_text: { timeAgo: m?.[1] || '', cond, price, title } };
    });
    out.push({ pid, url, ...data });
    console.log(`\n=== ${pid} ===`);
    console.log(JSON.stringify(data, null, 2));
  }

  fs.writeFileSync('listing_probe.json', JSON.stringify(out, null, 2));
  console.log('\n寫入 listing_probe.json');
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
