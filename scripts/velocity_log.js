// velocity_log.js — 每輪 patrol 把當前在售 listing 快照進 velocity_listings.json
// 用途：累積各 listing 的「首見 / 末見 / 上架年齡 / 消失」軌跡，供 velocity_report.js 算各分類各價帶售出速度。
// 主訊號：listing 從搜尋消失 = 離開市場（賣出/下架）。售出/保留標籤只在詳情頁，搜尋頁抓不到 → 用消失+上架時長當代理，標籤留作抽樣校準（v2）。
// 跑法：node scripts/velocity_log.js  （在 scrape 之後、讀 state/raw_results.json）

const fs = require('fs');

const RAW = 'state/raw_results.json';
const STORE = 'state/velocity_listings.json';

// timeAgo → 上架天數（float）。涵蓋 min/hour/day/week/month/year + yesterday + 中文。
function ageInDays(timeAgo) {
  if (!timeAgo) return null;
  const s = timeAgo.toLowerCase();
  if (s.includes('yesterday') || s.includes('昨')) return 1;
  let m = s.match(/(\d+)\s*(minute|hour|day|week|month|year)/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = { minute: 1 / 1440, hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 }[m[2]];
    return +(n * unit).toFixed(3);
  }
  m = s.match(/(\d+)\s*(分鐘|小時|天|週|個禮拜|個月|年)/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = { '分鐘': 1 / 1440, '小時': 1 / 24, '天': 1, '週': 7, '個禮拜': 7, '個月': 30, '年': 365 }[m[2]];
    return +(n * unit).toFixed(3);
  }
  return null;
}

const pidOf = (url) => (url || '').match(/\/p\/(\d+)/)?.[1] || null;
const priceNum = (p) => parseInt((p || '').replace(/[^0-9]/g, '')) || 0;

const now = new Date().toISOString();
const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
let store = {};
try { store = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch {}

const liveThisRound = new Set();
let upserted = 0, fresh = 0;

for (const it of raw) {
  const pid = pidOf(it.url);
  if (!pid) continue;
  const price = priceNum(it.price);
  if (!price) continue;
  const age = ageInDays(it.timeAgo);
  liveThisRound.add(pid);

  if (store[pid]) {
    const r = store[pid];
    r.lastSeenAt = now;
    if (age != null) r.lastAgeDays = age;
    r.lastPrice = price;
    r.title = it.title || r.title || '';     // 補/更新 title + url（SOLD 表要顯示）
    r.url = it.url || r.url || '';
    r.rounds = (r.rounds || 1) + 1;
    if (r.gone) { r.gone = false; delete r.goneAt; } // 重新出現（價格改回區間內等）→ 取消 gone
    upserted++;
  } else {
    store[pid] = {
      cat: it.category || '',
      title: it.title || '', url: it.url || '',
      firstPrice: price, lastPrice: price,
      cond: it.condition || '',
      firstSeenAt: now, lastSeenAt: now,
      firstAgeDays: age, lastAgeDays: age,
      rounds: 1, gone: false,
    };
    fresh++;
  }
}

// 上輪在榜、這輪不在 = 消失（離開市場）。記 goneAt + 當下推估在市天數。
let goneNew = 0;
for (const [pid, r] of Object.entries(store)) {
  if (!liveThisRound.has(pid) && !r.gone) {
    r.gone = true;
    r.goneAt = now;
    // 在市天數估計：末見上架年齡 +（末見到現在的間隔，但記錄器每輪跑→約等於末見年齡）
    r.timeOnMarketDays = r.lastAgeDays != null ? r.lastAgeDays : null;
    goneNew++;
  }
}

fs.writeFileSync(STORE, JSON.stringify(store, null, 2));

const total = Object.keys(store).length;
const goneTotal = Object.values(store).filter(r => r.gone).length;
console.log(`velocity_log: 本輪在榜 ${liveThisRound.size} (新 ${fresh} / 更新 ${upserted}), 新消失 ${goneNew}`);
console.log(`  累積追蹤 ${total} 筆 listing, 已消失 ${goneTotal} 筆 (有售出速度樣本)`);
