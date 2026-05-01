const fs = require('fs');

// === 二手店帳號（行情基準，不算便宜）===
const SHOPS = [
  'change12336', 'elba_digital888', 'phone_recycle', 'chan_850725',
  'chineming03', 'phoneshop', 'guoguo.shop', 'joycely.yang',
  'wei3cphone', 'kp3c.', 'apple3054'
];
const RESELLERS = ['lover.perfume', 'margaret.sshop', 'm1413', 'bravedeer.829ec6'];

// === 跳過配件/周邊/非商品 ===
const SKIP = ['配件','電源線','濾網','維修','遙控器','錶帶','底座','收納架','吸頭','馬達','電池','滾筒','刷頭','硬管','防滑墊','殼','保護','租借','寫真','鬼滅','禮盒組','蠟燈','沐浴','護手霜','香水瓶','香水筆','隨行杯','吸管杯','充電線','說明書','潔膚露','面膜','髮夾','相紙','DVD','專櫃組合','赫蓮娜','衛生紙','收納盒'];

// === 跳過的 category ===
const SKIP_CAT = ['dyson'];

// === 市場行情表 ===
// currentNew: 目前仍在賣的新品價（停產=null）
// secondhand: 二手行情（從二手店/常見成交價推估）
// 判斷規則：price <= currentNew*0.30 OR price <= secondhand*0.70
const MARKET = [
  // Apple Watch — SE1 是 2020 年，SE2 是 2022 年，都已停產
  { match: /apple watch.*(se\s*1|se1|第一代)/i, currentNew: null, secondhand: 2200, label: 'AW SE1 (2020停產)' },
  { match: /apple watch.*(se\s*2|se2|第二代)/i, currentNew: null, secondhand: 3500, label: 'AW SE2 (2022停產)' },
  { match: /apple watch.*se\b(?!.*[12])/i, currentNew: null, secondhand: 2200, label: 'AW SE (停產)' },
  { match: /apple watch.*(s6|series\s*6)/i, currentNew: null, secondhand: 4000, label: 'AW S6 (2020停產)' },
  { match: /apple watch.*(s7|series\s*7)/i, currentNew: null, secondhand: 5000, label: 'AW S7 (2021停產)' },
  { match: /apple watch.*(s8|series\s*8)/i, currentNew: null, secondhand: 6000, label: 'AW S8 (2022停產)' },
  { match: /apple watch.*(s9|series\s*9)/i, currentNew: 12900, secondhand: 7500, label: 'AW S9' },
  { match: /apple watch.*(s10|series\s*10|ultra)/i, currentNew: 13900, secondhand: 9000, label: 'AW S10/Ultra' },
  // Samsung Watch
  { match: /samsung.*watch.*6/i, currentNew: null, secondhand: 5500, label: 'GW6 Classic (2023停產)' },
  { match: /samsung.*watch.*7/i, currentNew: 11990, secondhand: 7000, label: 'GW7' },
  // Vivienne Westwood — 精品不太折舊
  { match: /vivienne.*westwood.*軍牌/i, currentNew: 4500, secondhand: 2500, label: 'VW 軍牌項鍊' },
  { match: /vivienne.*westwood.*絲巾/i, currentNew: 3500, secondhand: 1500, label: 'VW 絲巾' },
  { match: /vivienne.*westwood.*皮夾/i, currentNew: 9000, secondhand: 4000, label: 'VW 皮夾' },
  { match: /vivienne.*westwood.*(包|bag)/i, currentNew: 12000, secondhand: 5000, label: 'VW 包' },
  { match: /vivienne.*westwood.*戒指/i, currentNew: 8000, secondhand: 3500, label: 'VW 戒指' },
  // 投影機
  { match: /momi/i, currentNew: null, secondhand: 2500, label: 'MOMI投影機 (停產)' },
  { match: /投影機/i, currentNew: 5000, secondhand: 2500, label: '投影機' },
  // OSIM — 很多型號已停產
  { match: /osim.*護眼樂.*180/i, currentNew: null, secondhand: 1000, label: 'OSIM護眼樂180 (舊款)' },
  { match: /osim.*護眼樂.*air/i, currentNew: 4980, secondhand: 2500, label: 'OSIM護眼樂Air' },
  { match: /osim.*umoby/i, currentNew: 3980, secondhand: 2000, label: 'OSIM uMoby' },
  { match: /osim/i, currentNew: 4000, secondhand: 2000, label: 'OSIM按摩' },
  // Jo Malone — 香水有容量差異
  { match: /jo\s*malone.*100ml/i, currentNew: 6800, secondhand: 4500, label: 'JM 100ml' },
  { match: /jo\s*malone.*50ml/i, currentNew: 4900, secondhand: 3200, label: 'JM 50ml' },
  { match: /jo\s*malone.*30ml/i, currentNew: 2950, secondhand: 1800, label: 'JM 30ml' },
  { match: /jo\s*malone/i, currentNew: 4900, secondhand: 3000, label: 'Jo Malone' },
  // 香水品牌
  { match: /aesop.*(eidesis|艾底)/i, currentNew: 7700, secondhand: 5000, label: 'Aesop Eidesis' },
  { match: /aesop.*hywl/i, currentNew: 7700, secondhand: 5000, label: 'Aesop Hywl' },
  { match: /aesop/i, currentNew: 7700, secondhand: 5000, label: 'Aesop香水' },
  { match: /dior.*gris/i, currentNew: 11000, secondhand: 7000, label: 'Dior Gris Dior' },
  { match: /hermès|hermes|愛馬仕.*大地.*100/i, currentNew: 5700, secondhand: 3800, label: 'Hermès大地' },
  { match: /shiro/i, currentNew: 3200, secondhand: 2000, label: 'Shiro香水' },
  { match: /ysl.*香水/i, currentNew: 4500, secondhand: 2800, label: 'YSL香水' },
  { match: /malin.*goetz/i, currentNew: 4600, secondhand: 3000, label: 'Malin+Goetz' },
  // Lululemon — 在售品，用新品價
  { match: /lululemon.*(pant|褲|legging|tight)/i, currentNew: 4100, secondhand: 2000, label: 'Lulu褲' },
  { match: /lululemon.*(t-shirt|tee|短袖|上衣)/i, currentNew: 1900, secondhand: 800, label: 'Lulu上衣' },
  { match: /lululemon.*(bra|內衣)/i, currentNew: 1700, secondhand: 700, label: 'Lulu內衣' },
  { match: /lululemon.*(short|短褲)/i, currentNew: 2200, secondhand: 1000, label: 'Lulu短褲' },
  { match: /lululemon.*groove/i, currentNew: 3800, secondhand: 1800, label: 'Lulu Groove褲' },
  { match: /lululemon.*(set|組)/i, currentNew: 5000, secondhand: 2000, label: 'Lulu組合' },
  { match: /lululemon.*四件/i, currentNew: 8000, secondhand: 3000, label: 'Lulu四件組' },
  { match: /lululemon/i, currentNew: 3000, secondhand: 1500, label: 'Lululemon' },
  // Marshall — 大部分在售
  { match: /marshall.*kilburn\s*ii/i, currentNew: 10900, secondhand: 5500, label: 'Marshall Kilburn II' },
  { match: /marshall.*emberton\s*ii\b/i, currentNew: 5999, secondhand: 3500, label: 'Marshall Emberton II' },
  { match: /marshall.*emberton\s*iii/i, currentNew: 6999, secondhand: 4500, label: 'Marshall Emberton III' },
  { match: /marshall.*minor\s*iii/i, currentNew: 4290, secondhand: 2500, label: 'Marshall Minor III' },
  { match: /marshall.*minor\s*iv/i, currentNew: 4490, secondhand: 3000, label: 'Marshall Minor IV' },
  { match: /marshall.*major\s*(iv|v)/i, currentNew: 5999, secondhand: 3500, label: 'Marshall Major' },
  { match: /marshall/i, currentNew: 5000, secondhand: 3000, label: 'Marshall' },
  // Bose
  { match: /bose.*soundlink\s*home/i, currentNew: 9900, secondhand: 6000, label: 'Bose Home' },
  { match: /bose.*qc.*earbuds\s*ii\b/i, currentNew: null, secondhand: 4500, label: 'Bose QC II (停產)' },
  { match: /bose.*qc.*ultra/i, currentNew: 9900, secondhand: 6000, label: 'Bose QC Ultra' },
  { match: /bose.*flex/i, currentNew: 5490, secondhand: 3800, label: 'Bose Flex II' },
  { match: /bose/i, currentNew: 7000, secondhand: 4000, label: 'Bose' },
  // 其他
  { match: /空氣清淨機/i, currentNew: 5000, secondhand: 2500, label: '空氣清淨機' },
  { match: /空氣循環扇.*vornado/i, currentNew: 5000, secondhand: 3000, label: 'Vornado循環扇' },
  { match: /空氣循環扇/i, currentNew: 3000, secondhand: 1500, label: '循環扇' },
  { match: /nespresso.*pixie/i, currentNew: null, secondhand: 2200, label: 'Nespresso Pixie (停產)' },
  { match: /nespresso/i, currentNew: 4990, secondhand: 2500, label: 'Nespresso' },
  { match: /拍立得.*50s/i, currentNew: null, secondhand: 3500, label: 'Mini 50s (停產)' },
  { match: /拍立得.*sq6/i, currentNew: null, secondhand: 4000, label: 'SQ6 (停產)' },
  { match: /拍立得.*liplay/i, currentNew: 5990, secondhand: 3500, label: 'LiPlay' },
  { match: /拍立得/i, currentNew: 3000, secondhand: 1500, label: '拍立得' },
  { match: /落地燈/i, currentNew: 3000, secondhand: 1500, label: '落地燈' },
];

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

// === 主流程 ===
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const seen = new Set();
const deals = [];

raw.forEach(item => {
  if (!isRecent(item.timeAgo)) return;
  if (SHOPS.includes(item.seller) || RESELLERS.includes(item.seller)) return;
  if (SKIP_CAT.includes(item.category)) return;
  const price = parsePrice(item.price);
  if (price < 300) return;
  if (seen.has(item.url)) return;
  seen.add(item.url);
  if (SKIP.some(w => item.title.includes(w))) return;

  const mkt = findMarket(item.title, item.category);
  if (!mkt) return;

  // 核心比價：新品30%以下 OR 二手行情70%以下
  const vsNew = mkt.currentNew ? Math.round(price / mkt.currentNew * 100) : null;
  const vsSecondhand = Math.round(price / mkt.secondhand * 100);
  const passNew = vsNew !== null && vsNew <= 30;
  const passSecondhand = vsSecondhand <= 70;

  if (passNew || passSecondhand) {
    deals.push({ ...item, price, priceStr: item.price, mkt, vsNew, vsSecondhand });
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
console.log(`原始 ${raw.length} → 3天內 ${recentCount} → 好貨 ${deals.length} 筆\n`);
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
  md += `| 品項 | 價格 | 比較基準 | 折數 | 狀態 | 連結 |\n`;
  md += `|------|------|----------|------|------|------|\n`;
  deals.forEach(d => {
    const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
    const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
    md += `| ${d.mkt.label} | ${d.priceStr} | ${basis} | ${disc} | ${d.condition} | <a href="${d.url}" target="_blank">查看</a> |\n`;
  });
}
md += `\n---\n\n## 歷史批次\n\n`;
md += `<details><summary>Batch 5（已檢查 2026-05-02）</summary>\n\n折舊修正前的結果，見 git history\n\n</details>\n\n`;
md += `<details><summary>Batch 1-4（已檢查 2026-05-01~02）</summary>\n\n見 git history\n\n</details>\n\n`;
md += `---\n\n## 系統說明\n\n詳見 [carousell_workflow.md](carousell_workflow.md)\n`;
fs.writeFileSync('README.md', md);

// === 更新 deals.html ===
let html = `<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Carousell 二手好物清單</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;max-width:960px;margin:0 auto}\nh1{font-size:1.6rem;margin-bottom:6px;color:#fff}\n.sub{color:#888;margin-bottom:20px;font-size:.85rem}\ntable{width:100%;border-collapse:collapse;margin-bottom:30px}\nth{text-align:left;padding:10px 6px;border-bottom:2px solid #333;color:#888;font-size:.75rem;text-transform:uppercase}\ntd{padding:8px 6px;border-bottom:1px solid #1a1a1a;font-size:.85rem}\ntr:hover{background:#111}\n.p{color:#e8364e;font-weight:700}\n.d{color:#4ade80;font-weight:700}\na{color:#60a5fa;text-decoration:none}\na:hover{text-decoration:underline}\n.t{font-size:.8rem;color:#666}\n</style>\n</head>\n<body>\n<h1>Carousell 二手好物清單</h1>\n<p class="sub">新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情 | ${now}</p>\n<table>\n<tr><th>品項</th><th>價格</th><th>比較基準</th><th>折數</th><th>狀態</th><th></th></tr>\n`;
deals.forEach(d => {
  const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
  const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
  html += `<tr><td>${d.title}</td><td class="p">${d.priceStr}</td><td>${basis}</td><td class="d">${disc}</td><td class="t">${d.condition}</td><td><a href="${d.url}" target="_blank">查看</a></td></tr>\n`;
});
html += `</table>\n</body>\n</html>`;
fs.writeFileSync('deals.html', html);

console.log(`\n✓ CSV + README + HTML 已更新`);
