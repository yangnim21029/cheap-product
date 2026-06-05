// velocity_report.js — 從 velocity_listings.json 算「各分類各價帶的售出速度」，找最快售出的價帶。
// 兩個指標：
//   (1) 即時粗估 = 在售存貨上架年齡中位數（越低 = 周轉越快；有 survivor bias，且高上架率也會偏年輕，僅供參考）
//   (2) 真實在市天數 = 已消失 listing 的末見上架年齡中位數（需累積數輪才有樣本，越多越準）
// 價帶 = 該分類在售價格的五分位自適應切分。
// 跑法：node scripts/velocity_report.js [最少在售數，預設30]

const fs = require('fs');
const STORE = 'state/velocity_listings.json';
const MIN_LIVE = parseInt(process.argv[2]) || 30;

const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
const recs = Object.values(store);

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quantile = (sorted, q) => { if (!sorted.length) return 0; const pos = (sorted.length - 1) * q; const b = Math.floor(pos); return sorted[b] + (sorted[b + 1] - sorted[b] || 0) * (pos - b); };
const nt = (n) => 'NT$' + Math.round(n).toLocaleString();
const fmtAge = (d) => d == null ? '—' : d < 1 ? `${Math.round(d * 24)}h` : `${d.toFixed(1)}d`;

// group by category
const byCat = {};
for (const r of recs) { (byCat[r.cat] = byCat[r.cat] || []).push(r); }

const cats = Object.entries(byCat)
  .map(([c, arr]) => [c, arr, arr.filter(r => !r.gone).length])
  .filter(([, , liveN]) => liveN >= MIN_LIVE)
  .sort((a, b) => b[2] - a[2]);

console.log(`# 各分類售出速度 — 自適應五分位價帶\n`);
console.log(`> 追蹤 ${recs.length} 筆 listing，已消失 ${recs.filter(r => r.gone).length} 筆（真實在市樣本）`);
console.log(`> 即時粗估＝在售存貨年齡中位（低＝周轉快，含 survivor bias 僅參考）｜真實＝已消失者末見上架年齡中位\n`);

for (const [cat, arr, liveN] of cats) {
  const live = arr.filter(r => !r.gone && r.lastPrice > 0);
  const prices = live.map(r => r.lastPrice).sort((a, b) => a - b);
  // 五分位切點
  const cuts = [0, 0.2, 0.4, 0.6, 0.8, 1].map(q => quantile(prices, q));
  const bands = [];
  for (let i = 0; i < 5; i++) {
    const lo = cuts[i], hi = cuts[i + 1];
    const inBand = (p) => i === 4 ? (p >= lo && p <= hi) : (p >= lo && p < hi);
    const bl = live.filter(r => inBand(r.lastPrice));
    const bg = arr.filter(r => r.gone && r.timeOnMarketDays != null && inBand(r.firstPrice));
    bands.push({
      range: `${nt(lo)}–${nt(hi)}`,
      liveN: bl.length,
      liveAge: median(bl.map(r => r.lastAgeDays).filter(x => x != null)),
      goneN: bg.length,
      tom: median(bg.map(r => r.timeOnMarketDays)),
    });
  }
  // 最快帶：有 ≥3 已消失樣本時用真實在市，否則用即時粗估
  const ranked = bands.filter(b => b.goneN >= 3);
  let fastest, basis;
  if (ranked.length) { fastest = ranked.reduce((a, b) => (b.tom < a.tom ? b : a)); basis = '真實在市'; }
  else { const lb = bands.filter(b => b.liveN >= 3 && b.liveAge != null); fastest = lb.length ? lb.reduce((a, b) => (b.liveAge < a.liveAge ? b : a)) : null; basis = '即時粗估'; }

  console.log(`## ${cat}（在售 ${liveN}）`);
  console.log(`| 價帶 | 在售數 | 即時粗估(年齡中位) | 已消失 | 真實在市中位 |`);
  console.log(`|---|---|---|---|---|`);
  bands.forEach(b => console.log(`| ${b.range} | ${b.liveN} | ${fmtAge(b.liveAge)} | ${b.goneN} | ${fmtAge(b.tom)} |`));
  if (fastest) console.log(`\n→ **最快售出價帶：${fastest.range}**（依${basis}，${basis === '真實在市' ? fmtAge(fastest.tom) : fmtAge(fastest.liveAge)}）`);
  console.log('');
}
console.log(`_資料隨每輪 patrol 累積，"真實在市" 樣本越多越準；目前多數分類靠即時粗估，跑數天後再看會穩。_`);
