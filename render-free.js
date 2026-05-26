// 讀 free_pending.json + 一份 verdicts (手動或 subagent 結果) 寫 free_items.md
// Verdicts 走 stdin (echo '[{"pid":...}]' | node render-free.js) 或讀 free_verdicts.json

const fs = require('fs');
const pending = JSON.parse(fs.readFileSync('free_pending.json', 'utf8'));
const verdicts = JSON.parse(fs.readFileSync('free_verdicts.json', 'utf8'));
const vMap = Object.fromEntries(verdicts.map(v => [v.pid, v]));

const recommended = pending
  .map(p => ({ ...p, ...(vMap[p.pid] || {}) }))
  .filter(p => p.verdict === 'recommend' || (p.verdict === 'manual' && (p.est || 0) >= 1500))
  .sort((a, b) => (b.est || 0) - (a.est || 0))
  .slice(0, 8);

const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

let md = `# 🎁 Carousell 免費物品 (估值精選)\n\n`;
md += `> ${now} · 從 ${pending.length} 筆過濾候選 → 推 ${recommended.length} 件 (估值 ≥NT\$1,500 為門檻)\n\n`;
md += `**規則:** subagent 估二手市值, recommend 直接推, manual 估值 ≥\$1,500 也推, < 門檻或山寨 skip\n\n`;

if (recommended.length === 0) {
  md += `_本輪無估值 ≥NT\$1,500 的免費物品_\n`;
} else {
  md += `| 品項 | 估值 | 賣家 | 上架 | 判 | |\n|------|------|------|------|----|--|\n`;
  for (const r of recommended) {
    const title = (r.title || '').slice(0, 60).replace(/\|/g, '/');
    const verdictTag = r.verdict === 'recommend' ? '✅ 推' : '⚠️ 手動';
    md += `| ${title} | **NT\$${r.est?.toLocaleString() || '?'}** | ${r.seller || ''} | ${r.timeAgo || '?'} | ${verdictTag} | [→](${r.url}) |\n`;
  }
  md += `\n**估值依據:**\n`;
  for (const r of recommended) {
    md += `- ${r.title?.slice(0, 40)}: ${r.note || ''}\n`;
  }
}

md += `\n---\n\n_本流程每天早晚 2 次，跟主 patrol 分軌。Cap 8 筆/輪。_\n`;

fs.writeFileSync('free_items.md', md);
console.log(`寫入 free_items.md (${recommended.length} 筆推薦)`);
