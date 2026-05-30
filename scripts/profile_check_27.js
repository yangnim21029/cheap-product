const { chromium } = require('playwright');
const fs = require('fs');

const SELLERS = [
  'ggaarry', 'jiuwu_95', 'revenger', 'joaaaannne', 'rarext',
  'hanmu420', 'us3c_shop', 'zozo529724', 'mystic5201314', 'roxannna',
  'tinkerbell0000', 'jiawenmayday', 'zhuang1111', 'akito_jr', 'abceric0307',
  'happywhale_e703f1', 'littleforfun', 'fastest112233', 'chenxiliao67453', 'gabe91024',
  'good.one.year', 'jchssa', 'wuwangwo.shop', 'vintagejew', 'z0989511489',
  '_michelle_1982', 'hnr318'
];

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
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
  } catch (e) { console.log('cookies error:', e.message); }

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const results = [];

  for (const id of SELLERS) {
    console.log(`\n=== ${id} ===`);
    const url = `https://tw.carousell.com/u/${id}/`;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 25000 });
      await delay(3500);

      // Scroll to trigger lazy-load
      await page.evaluate(() => window.scrollTo(0, 800));
      await delay(1500);
      await page.evaluate(() => window.scrollTo(0, 1600));
      await delay(1500);
      await page.evaluate(() => window.scrollTo(0, 2400));
      await delay(1500);

      const data = await page.evaluate(() => {
        const fullText = document.body?.innerText || '';
        const h1 = document.querySelector('h1')?.innerText?.trim() || '';
        const listings = document.querySelectorAll('a[href*="/p/"]').length;
        const bumpedMatches = (fullText.match(/Bumped/gi) || []).length;
        // Grab listing cards: title + price + href (PID)
        const cards = Array.from(document.querySelectorAll('a[href*="/p/"]')).slice(0, 40).map(a => {
          const text = a.innerText.split('\n').filter(x => x.trim());
          const href = a.getAttribute('href') || '';
          const pidMatch = href.match(/\/p\/([^/?]+)/);
          return {
            pid: pidMatch ? pidMatch[1] : '',
            lines: text.slice(0, 6),
          };
        });
        return {
          title: document.title,
          h1,
          listings,
          bumpedMatches,
          cards,
          textHead: fullText.slice(0, 2200),
        };
      });

      results.push({ id, url, ...data });
      console.log('h1:', data.h1, '| listings:', data.listings, '| bumped:', data.bumpedMatches);
      console.log('--- textHead ---');
      console.log(data.textHead.slice(0, 600));
      console.log('--- cards ---');
      data.cards.slice(0, 20).forEach(c => console.log(' -', c.pid, '|', c.lines.join(' / ')));
    } catch (e) {
      console.log('failed:', e.message);
      results.push({ id, url, error: e.message });
    }
    await delay(7000 + Math.random() * 4000);
  }

  fs.writeFileSync('/tmp/profile_check_27.json', JSON.stringify(results, null, 2));
  await browser.close();
  console.log('\nwrote /tmp/profile_check_27.json');
})();
