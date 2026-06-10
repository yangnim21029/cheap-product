// velocity_check.js [N] — 複查追蹤清單中 N 件的詳情頁，判定真實售出狀態。
// 訊號：詳情頁 JSON-LD availability。InStock=還在賣；SoldOut/OutOfStock=賣掉；頁面移除=下架。
// 「從搜尋消失」幾乎全是 page churn（新貨擠出首頁），不等於賣掉 → 必須開詳情頁讀 availability 才準。
// InStock→SoldOut 的轉變 = 確認售出，記 soldAt + timeToSellDays（首見→售出）。
// 跑法：node scripts/velocity_check.js [N]  （預設 40，在 scrape 之後跑）
//
// 2026-06-10 防呆（patrol 490 卡死 112 分鐘的教訓）：
// - 每件套 45s watchdog（Promise.race）— 單頁 promise 懸住不再拖死整輪
// - 每 20 件增量寫 store — 中途被殺只損失最後一批，不再全輪白做
// - 連續 5 件失敗判定瀏覽器掛了，提前收尾（store 照寫）

const fs = require('fs');
const { chromium } = require('playwright');
const lock = require('./chromium-lock');

const STORE = 'state/velocity_listings.json';
const N = parseInt(process.argv[2]) || 40;
const WATCHDOG_MS = 45000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

const now = new Date().toISOString();
const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
const flush = () => fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
const timeout = (ms, tag) => new Promise((_, rej) => setTimeout(() => rej(new Error(tag || `watchdog ${ms}ms`)), ms));

// 挑要複查的：已確認售出/移除的不再查；其餘按「最久沒查（或沒查過）」排序，gone 的優先（較可能已售）。
const lastChk = (r) => r.checkedAt || r.firstSeenAt || '';
const candidates = Object.entries(store)
  .filter(([, r]) => !r.soldConfirmed && !r.removed)
  .sort((a, b) => {
    const ga = a[1].gone ? 0 : 1, gb = b[1].gone ? 0 : 1;
    if (ga !== gb) return ga - gb;               // gone 先
    return lastChk(a[1]).localeCompare(lastChk(b[1])); // 最久沒查先
  })
  .slice(0, N)
  .map(([pid]) => pid);

lock.acquire('velocity_check.js');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: UA });
  let sold = 0, active = 0, removed = 0, err = 0, errStreak = 0, done = 0;

  for (const pid of candidates) {
    const r = store[pid];
    let pg = null;
    const work = (async () => {
      pg = await ctx.newPage();
      let http = 0;
      pg.on('response', resp => { if (resp.url().includes('/p/' + pid)) http = resp.status(); });
      await pg.goto('https://tw.carousell.com/p/' + pid + '/', { waitUntil: 'load', timeout: 25000 });
      await pg.waitForTimeout(3500);
      const d = await pg.evaluate(() => {
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent).join(' ');
        const m = ld.match(/schema\.org\/(InStock|SoldOut|OutOfStock|Discontinued|LimitedAvailability)/i);
        return { avail: m ? m[1] : 'none', bodyLen: (document.body?.innerText || '').length };
      });
      r.checkedAt = now;
      r.lastAvail = d.avail;
      if (/SoldOut|OutOfStock/i.test(d.avail)) {
        r.soldConfirmed = true;
        r.soldAt = now;
        // 真實在市 = 首見時已上架天數(firstAgeDays) + 我們追蹤天數。漏掉 firstAgeDays 會嚴重低估「抓到時已老」的貨。
        const trackedDays = r.firstSeenAt ? (Date.parse(now) - Date.parse(r.firstSeenAt)) / 86400000 : 0;
        r.timeToSellDays = +((r.firstAgeDays || 0) + trackedDays).toFixed(2);
        r.caughtLate = (r.firstAgeDays || 0) >= 7; // 首見時已上架≥7天 = 抓得晚, velocity 來自 timeAgo 粗估
        sold++;
      } else if (d.avail === 'InStock') {
        if (r.gone) { r.gone = false; delete r.goneAt; } // 還在賣 = churn，取消 gone
        active++;
      } else if (d.bodyLen < 1700 || http === 404 || http === 410) {
        r.removed = true; r.removedAt = now; removed++;   // 頁面已移除（下架，或售出後刪文）
      } else {
        r.checkNote = 'avail=' + d.avail + ' len=' + d.bodyLen; err++;
      }
    })();

    try {
      await Promise.race([work, timeout(WATCHDOG_MS)]);
      errStreak = 0;
    } catch (e) {
      r.checkErr = (e.message || '').slice(0, 40); err++; errStreak++;
    }
    try { if (pg) await Promise.race([pg.close(), timeout(5000, 'close timeout')]); } catch {}

    done++;
    if (done % 20 === 0) flush(); // 增量寫檔：中途被殺不全損

    if (errStreak >= 5) {
      console.log(`velocity_check: 連續 ${errStreak} 件失敗 — 判定瀏覽器/網路掛了，提前收尾 (${done}/${candidates.length})`);
      break;
    }
    await new Promise(res => setTimeout(res, 2000)); // rate limit
  }

  flush();
  const totalSold = Object.values(store).filter(r => r.soldConfirmed).length;
  console.log(`velocity_check: 複查 ${done} 件 → 售出 ${sold} / 仍在賣 ${active} / 已移除 ${removed} / 異常 ${err}`);
  console.log(`  累積確認售出 ${totalSold} 件`);
  try { await Promise.race([browser.close(), timeout(10000, 'browser close timeout')]); } catch { process.exit(0); }
})();
