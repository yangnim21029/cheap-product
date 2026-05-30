const { chromium } = require('playwright');
const fs = require('fs');

const SELLERS = ['cdyuuu', 'kk4401', '221tgron', '.celine.', 'hank0720', 'clevertree-c694'];

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
      await delay(4000);

      // Scroll a bit to trigger lazy-load
      await page.evaluate(() => window.scrollTo(0, 800));
      await delay(2000);

      const data = await page.evaluate(() => {
        const fullText = document.body?.innerText || '';
        // Try to find name in h1
        const h1 = document.querySelector('h1')?.innerText?.trim() || '';
        // Listings: count product cards with /p/
        const listings = document.querySelectorAll('a[href*="/p/"]').length;
        // bumped count
        const bumpedMatches = (fullText.match(/Bumped/gi) || []).length;
        // Categories: gather first ~30 listing titles
        const titles = Array.from(document.querySelectorAll('a[href*="/p/"]')).slice(0, 30).map(a => {
          const t = a.innerText.split('\n').filter(x => x.trim());
          return t[0] || '';
        });
        return {
          title: document.title,
          h1,
          listings,
          bumpedMatches,
          titles,
          // grab first 1500 chars to find orders/reviews/joined
          textHead: fullText.slice(0, 2500),
        };
      });

      results.push({ id, url, ...data });
      console.log('title:', data.title);
      console.log('h1:', data.h1);
      console.log('listings:', data.listings, 'bumped:', data.bumpedMatches);
      console.log('---textHead---');
      console.log(data.textHead);
      console.log('---titles---');
      data.titles.slice(0, 15).forEach(t => console.log(' -', t));
    } catch (e) {
      console.log('failed:', e.message);
      results.push({ id, url, error: e.message });
    }
    await delay(8000 + Math.random() * 4000);
  }

  fs.writeFileSync('/tmp/profile_check.json', JSON.stringify(results, null, 2));
  await browser.close();
  console.log('\nwrote /tmp/profile_check.json');
})();
