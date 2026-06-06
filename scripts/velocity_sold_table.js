// velocity_sold_table.js — 把確認售出的商品輸出成表，按 velocity（售出耗時 timeToSellDays）排序，賣最快在最上面。
// 寫 outputs/SOLD.md（GitHub 可見）。資料來自 velocity_check.js 確認的 soldConfirmed 項目。
// 跑法：node scripts/velocity_sold_table.js

const fs = require('fs');
const store = JSON.parse(fs.readFileSync('state/velocity_listings.json', 'utf8'));

// velocity = firstAgeDays(首見時已上架) + 追蹤天數 = 真實在市。caughtLate(首見已上架≥7天)的 velocity 來自 timeAgo 粗估(「X 個月前」），標「估」。
const sold = Object.entries(store)
  .filter(([, r]) => r.soldConfirmed && r.timeToSellDays != null)
  .map(([pid, r]) => ({ pid, ...r }))
  .sort((a, b) => a.timeToSellDays - b.timeToSellDays);   // V 排序：賣最快在前
const soldClean = sold;   // 全部納入中位數（caughtLate 也是真售出，只是時間粗）

const removed = Object.values(store).filter(r => r.removed).length;
const checked = Object.values(store).filter(r => r.checkedAt).length;
const tracked = Object.keys(store).length;
const nt = (n) => 'NT$' + (n || 0).toLocaleString();
const fmtV = (d) => d < 1 ? `${Math.round(d * 24)} 小時` : `${d.toFixed(1)} 天`;
const ts = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' (台灣)';

let md = `# 售出商品 · velocity 排序\n\n`;
const coarse = sold.filter(s => s.caughtLate).length;
md += `> 更新 ${ts} · 追蹤 ${tracked} 件 · 已複查 ${checked} 件 · **確認售出 ${sold.length} 件**（${coarse} 件 velocity 粗估）· 已移除 ${removed} 件\n\n`;
md += `> velocity = 上架 → 確認售出（詳情頁 JSON-LD 轉 SoldOut）的真實在市天數 = 首見時已上架天數 + 追蹤天數。賣最快在最上面。\n`;
md += `> 「估」= 首見時已上架≥7天，velocity 來自 timeAgo（「X 個月前」）粗估，誤差較大但仍是真售出。\n\n`;

if (!soldClean.length && !sold.length) {
  md += `_目前尚無確認售出。velocity 追蹤約 2026-06-05 起跑，商品多需數天才賣出；複查迴圈會持續回補，此表會逐漸長出來。_\n`;
} else {
  // 各分類售出速度（只用可信 velocity 樣本）
  const byCat = {};
  soldClean.forEach(s => { (byCat[s.cat] = byCat[s.cat] || []).push(s); });
  const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  if (Object.keys(byCat).length) {
    md += `## 各分類售出速度\n\n| 分類 | 售出數 | velocity 中位 | 售價中位 |\n|---|---|---|---|\n`;
    Object.entries(byCat).sort((a, b) => median(a[1].map(x => x.timeToSellDays)) - median(b[1].map(x => x.timeToSellDays)))
      .forEach(([c, arr]) => md += `| ${c} | ${arr.length} | ${fmtV(median(arr.map(x => x.timeToSellDays)))} | ${nt(median(arr.map(x => x.lastPrice)))} |\n`);
    md += `\n`;
  }
  md += `## 全部售出（V 排序，最快在前）\n\n`;
  md += `| # | velocity | 品項 | 分類 | 售價 | 連結 |\n|---|---|---|---|---|---|\n`;
  sold.forEach((s, i) => {
    const title = (s.title || '(未存標題)').replace(/\|/g, '／').slice(0, 42);
    const link = s.url ? `[→](${s.url})` : '';
    const v = s.caughtLate ? `${fmtV(s.timeToSellDays)} (估)` : `**${fmtV(s.timeToSellDays)}**`;
    md += `| ${i + 1} | ${v} | ${title} | ${s.cat} | ${nt(s.lastPrice)} | ${link} |\n`;
  });
}

fs.writeFileSync('outputs/SOLD.md', md);
console.log(`SOLD.md 已寫 — 確認售出 ${sold.length} 件（已複查 ${checked}/${tracked}, 已移除 ${removed}）`);
