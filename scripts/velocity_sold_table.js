// velocity_sold_table.js — 把確認售出的商品輸出成表，按 velocity（售出耗時 timeToSellDays）排序，賣最快在最上面。
// 寫 outputs/SOLD.md（GitHub 可見）。資料來自 velocity_check.js 確認的 soldConfirmed 項目。
// 跑法：node scripts/velocity_sold_table.js

const fs = require('fs');
const store = JSON.parse(fs.readFileSync('state/velocity_listings.json', 'utf8'));

const sold = Object.entries(store)
  .filter(([, r]) => r.soldConfirmed && r.timeToSellDays != null)
  .map(([pid, r]) => ({ pid, ...r }))
  .sort((a, b) => a.timeToSellDays - b.timeToSellDays);   // V 排序：賣最快在前

const removed = Object.values(store).filter(r => r.removed).length;
const checked = Object.values(store).filter(r => r.checkedAt).length;
const tracked = Object.keys(store).length;
const nt = (n) => 'NT$' + (n || 0).toLocaleString();
const fmtV = (d) => d < 1 ? `${Math.round(d * 24)} 小時` : `${d.toFixed(1)} 天`;
const ts = new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' (台灣)';

let md = `# 售出商品 · velocity 排序\n\n`;
md += `> 更新 ${ts} · 追蹤 ${tracked} 件 · 已複查 ${checked} 件 · **確認售出 ${sold.length} 件** · 已移除 ${removed} 件\n\n`;
md += `> velocity = 首次看到 → 確認售出（詳情頁 JSON-LD 轉 SoldOut）的天數。賣最快在最上面。\n`;
md += `> 「從搜尋消失」幾乎全是掉出首頁的 churn（非售出），故售出一律以詳情頁 availization 確認為準。\n\n`;

if (!sold.length) {
  md += `_目前尚無確認售出。velocity 追蹤約 2026-06-05 起跑，商品多需數天才賣出；複查迴圈會持續回補，此表會逐漸長出來。_\n`;
} else {
  // 各分類最快售出價帶（有售出樣本才算）
  const byCat = {};
  sold.forEach(s => { (byCat[s.cat] = byCat[s.cat] || []).push(s); });
  md += `## 各分類售出速度（有確認售出樣本）\n\n`;
  md += `| 分類 | 售出數 | velocity 中位 | 售價中位 |\n|---|---|---|---|\n`;
  const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  Object.entries(byCat).sort((a, b) => median(a[1].map(x => x.timeToSellDays)) - median(b[1].map(x => x.timeToSellDays)))
    .forEach(([c, arr]) => md += `| ${c} | ${arr.length} | ${fmtV(median(arr.map(x => x.timeToSellDays)))} | ${nt(median(arr.map(x => x.lastPrice)))} |\n`);

  md += `\n## 全部售出（V 排序，最快在前）\n\n`;
  md += `| # | velocity | 品項 | 分類 | 售價 | 連結 |\n|---|---|---|---|---|---|\n`;
  sold.forEach((s, i) => {
    const title = (s.title || '(未存標題)').replace(/\|/g, '／').slice(0, 42);
    const link = s.url ? `[→](${s.url})` : '';
    md += `| ${i + 1} | **${fmtV(s.timeToSellDays)}** | ${title} | ${s.cat} | ${nt(s.lastPrice)} | ${link} |\n`;
  });
}

fs.writeFileSync('outputs/SOLD.md', md);
console.log(`SOLD.md 已寫 — 確認售出 ${sold.length} 件（已複查 ${checked}/${tracked}, 已移除 ${removed}）`);
