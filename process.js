const fs = require('fs');

// === 賣家分類：從 sellers.json 讀取 ===
const sellersData = JSON.parse(fs.readFileSync('sellers.json', 'utf8'));
const BANNED = new Set([
  ...sellersData.shops.accounts.map(a => a.id),
  ...(sellersData.overpriced?.accounts || []).map(a => a.id),
]);
const RESELLERS = new Set(sellersData.resellers.accounts.map(a => a.id));
const resellerNotes = Object.fromEntries(sellersData.resellers.accounts.map(a => [a.id, a.note]));

// === 跳過配件/周邊/非商品 ===
const SKIP = ['配件','電源線','濾網','維修','遙控器','錶帶','底座','收納架','吸頭','馬達','電池','滾筒','刷頭','硬管','防滑墊','殼','保護','租借','寫真','鬼滅','禮盒組','蠟燈','沐浴','護手霜','香水瓶','香水筆','隨行杯','吸管杯','充電線','說明書','潔膚露','面膜','髮夾','相紙','DVD','專櫃組合','赫蓮娜','衛生紙','收納盒','運動衣','瑜珈服','運動內衣','Tank','Sleeve','Top','底片','DIY','自製','KTV','麥克風','卡拉OK','K歌'];

// === 跳過的 category ===
const SKIP_CAT = ['dyson'];

// === 市場行情表：從 market_prices.json 讀取 ===
// 判斷規則：price <= currentNew*0.30 OR price <= secondhand*0.70
const priceData = JSON.parse(fs.readFileSync('market_prices.json', 'utf8'));
const MARKET = priceData.map(p => ({
  match: new RegExp(p.pattern, p.flags || 'i'),
  currentNew: p.currentNew,
  secondhand: p.secondhand,
  label: p.label,
}));

function findMarket(title, category) {
  const text = title + ' ' + category;
  for (const m of MARKET) {
    if (m.match.test(text)) return m;
  }
  return null;
}

const isRecent = t => {
  if (!t) return false;
  if (/\d+ days/.test(t) && !/^[12] days/.test(t)) return false;
  if (/week|month|year/.test(t)) return false;
  return /minute|hour|1 day|2 days|yesterday/.test(t);
};

const parsePrice = p => parseInt((p || '').replace(/[^0-9]/g, '')) || 0;

// === 去重：排除之前已看過的 product ID ===
const SEEN_FILE = 'seen_ids.json';
let seenHistory = [];
try { seenHistory = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch {}
const seenSet = new Set(seenHistory);

// === 主流程 ===
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const seen = new Set();
const deals = [];
let skippedDup = 0;

raw.forEach(item => {
  if (!isRecent(item.timeAgo)) return;
  if (BANNED.has(item.seller)) return;
  if (SKIP_CAT.includes(item.category)) return;
  const price = parsePrice(item.price);
  if (price < 300) return;
  if (seen.has(item.url)) return;
  seen.add(item.url);
  const pid = item.url.match(/\/p\/(\d+)/)?.[1];
  if (pid && seenSet.has(pid)) { skippedDup++; return; }
  if (SKIP.some(w => item.title.includes(w))) return;

  const mkt = findMarket(item.title, item.category);
  if (!mkt) return;

  // 核心比價：新品30%以下 OR 二手行情70%以下
  const vsNew = mkt.currentNew ? Math.round(price / mkt.currentNew * 100) : null;
  const vsSecondhand = Math.round(price / mkt.secondhand * 100);
  const passNew = vsNew !== null && vsNew <= 30;
  const passSecondhand = vsSecondhand <= 70;

  if (passNew || passSecondhand) {
    const isReseller = RESELLERS.has(item.seller);
    const sellerNote = isReseller ? resellerNotes[item.seller] || '批量賣家' : '';
    deals.push({ ...item, price, priceStr: item.price, mkt, vsNew, vsSecondhand, isReseller, sellerNote });
  }
});

// 按折數排序（用二手行情折數）
deals.sort((a, b) => a.vsSecondhand - b.vsSecondhand);

// === 輸出 CSV ===
const csvLines = ['category|seller|title|price|condition|url|比較基準|vs_new|vs_secondhand|time_ago'];
deals.forEach(d => {
  const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}/二手$${d.mkt.secondhand}` : `二手$${d.mkt.secondhand}(停產)`;
  csvLines.push(`${d.category}|${d.seller}|${d.title}|${d.priceStr}|${d.condition}|${d.url}|${basis}|${d.vsNew ?? '-'}%|${d.vsSecondhand}%|${d.timeAgo}`);
});
fs.writeFileSync('carousell_wishlist_20260501.csv', csvLines.join('\n') + '\n');

// === 輸出報告 ===
const recentCount = [...new Set(raw.filter(i => isRecent(i.timeAgo)).map(i => i.url))].length;
console.log(`\n=== Batch 結果 ===`);
console.log(`原始 ${raw.length} → 3天內 ${recentCount} → 好貨 ${deals.length} 筆（跳過 ${skippedDup} 筆已看過）\n`);
deals.forEach((d, i) => {
  const basis = d.mkt.currentNew
    ? `新品${d.vsNew}% 二手${d.vsSecondhand}%`
    : `二手${d.vsSecondhand}% (停產品,無新品價)`;
  console.log(`${i+1}. [${d.mkt.label}] ${d.priceStr} — ${basis}`);
  console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
  console.log(`   ${d.url}`);
});

// === 更新 README ===
const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
let md = `# Carousell 二手好物清單\n\n`;
md += `16 queries + 4 分類 | 新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情比\n\n`;
md += `> 最後更新：${now}\n\n`;
if (deals.length === 0) {
  md += `## 目前清單\n\n巡邏中，下一批即將更新...\n`;
} else {
  md += `## 目前清單（${deals.length} 筆）\n\n`;
  md += `| 品項 | 價格 | 比較基準 | 折數 | 狀態 | 上架 | 連結 |\n`;
  md += `|------|------|----------|------|------|------|------|\n`;
  deals.forEach(d => {
    const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
    const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
    const warn = d.isReseller ? ' ⚠' : '';
    md += `| ${d.title.slice(0, 50)}${warn} | ${d.priceStr} | ${basis} | ${disc} | ${d.condition} | ${d.timeAgo} | <a href="${d.url}" target="_blank">查看</a> |\n`;
  });
}
md += `\n---\n\n## 歷史批次\n\n`;
md += `<details><summary>Batch 5（已檢查 2026-05-02）</summary>\n\n折舊修正前的結果，見 git history\n\n</details>\n\n`;
md += `<details><summary>Batch 1-4（已檢查 2026-05-01~02）</summary>\n\n見 git history\n\n</details>\n\n`;
md += `---\n\n## 系統說明\n\n詳見 [carousell_workflow.md](carousell_workflow.md)\n`;
fs.writeFileSync('README.md', md);

// === 更新 deals.html ===
let html = `<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Carousell 二手好物清單</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;max-width:960px;margin:0 auto}\nh1{font-size:1.6rem;margin-bottom:6px;color:#fff}\n.sub{color:#888;margin-bottom:20px;font-size:.85rem}\ntable{width:100%;border-collapse:collapse;margin-bottom:30px}\nth{text-align:left;padding:10px 6px;border-bottom:2px solid #333;color:#888;font-size:.75rem;text-transform:uppercase}\ntd{padding:8px 6px;border-bottom:1px solid #1a1a1a;font-size:.85rem}\ntr:hover{background:#111}\n.p{color:#e8364e;font-weight:700}\n.d{color:#4ade80;font-weight:700}\na{color:#60a5fa;text-decoration:none}\na:hover{text-decoration:underline}\n.t{font-size:.8rem;color:#666}\n</style>\n</head>\n<body>\n<h1>Carousell 二手好物清單</h1>\n<p class="sub">新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情 | ${now}</p>\n<table>\n<tr><th>品項</th><th>價格</th><th>比較基準</th><th>折數</th><th>狀態</th><th>上架</th><th></th></tr>\n`;
deals.forEach(d => {
  const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
  const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
  html += `<tr><td>${d.title}</td><td class="p">${d.priceStr}</td><td>${basis}</td><td class="d">${disc}</td><td class="t">${d.condition}</td><td class="t">${d.timeAgo}</td><td><a href="${d.url}" target="_blank">查看</a></td></tr>\n`;
});
html += `</table>\n</body>\n</html>`;
fs.writeFileSync('deals.html', html);

// === 更新 seen_ids（去重用）===
const newIds = deals.map(d => d.url.match(/\/p\/(\d+)/)?.[1]).filter(Boolean);
const allSeen = [...new Set([...seenHistory, ...newIds])];
fs.writeFileSync(SEEN_FILE, JSON.stringify(allSeen, null, 2));
console.log(`\n✓ CSV + README + HTML 已更新`);
console.log(`✓ seen_ids: ${seenHistory.length} 舊 + ${newIds.length} 新 = ${allSeen.length} 總已看過`);
