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
const SKIP = [
  // 配件/耗材
  '配件','電源線','濾網','維修','遙控器','錶帶','底座','收納架','吸頭','馬達','電池','滾筒','刷頭','硬管','防滑墊','殼','保護','充電線','說明書','充電盒','相紙','底片',
  // 非目標商品
  '租借','寫真','鬼滅','禮盒組','蠟燈','沐浴','護手霜','香水瓶','香水筆','隨行杯','吸管杯','潔膚露','面膜','髮夾','DVD','專櫃組合','赫蓮娜','衛生紙','收納盒','身體乳',
  // 衣服
  '運動衣','瑜珈服','運動內衣','Tank','Sleeve','Top','喇叭褲','喇叭裙','喇叭牛仔','喇叭長褲','微喇叭','牛仔褲','短褲','襯衫','毛帽','棒球帽','裹身裙','外套上衣',
  // 低價/雜牌
  'DIY','自製','KTV','麥克風','卡拉OK','K歌','UDP-G25','NovaPlus','騎馬機','PS4 VR',
  // 家電雜物
  '鬆餅機','刨冰機','榨汁機','電鍋','微波爐','氣炸鍋','電動牙刷','吹風機','計算機','掃地機','洗牙器','蛋捲夾',
  // 美妝雜物
  '眼影','腮紅','唇蜜','粉底','卸妝','化妝包','彩妝包','眼霜','乳液','護膚','妝前乳',
  // 手機殼/配件
  'Clear Case','手機殼','記憶卡',
  // 新品太便宜（低於$2,000）
  '小米藍牙喇叭','小米藍牙','大鑽石','X-mini','x-mini',
  // 不是商品本體
  '海報','紀念票','拍立得紀念','公仔','陶瓷',
  // 家具店/非目標
  '床頭櫃','床邊櫃',
  // 便宜品牌咖啡機
  'SAMPO','聲寶',
  // 帳篷雜訊
  '蚊帳','驅蚊','滅蚊','跑步鞋','運動鞋',
  // 古董/非目標
  '幻燈片','Paximat','Spotlight',
  // 雜牌/非品牌香水
  'KP記憶','KLOWER','GRAFEN','費洛香','天堂','蝴蝶香水','聖物','桃花','香水盒','提袋','卡片4件','Frank Olivier','HDO','守護甜心','日和結',
  // 錶帶不是手錶
  '錶環','高山錶',
];


// === 跳過的 category ===
const SKIP_CAT = ['dyson', 'lululemon'];

// === 市場行情表：從 market_prices.json 讀取 ===
// key = category（就是 scrape 的 query 或分類名），直接查表
// 判斷規則：price <= currentNew*0.30 OR price <= secondhand*0.70
const MARKET = JSON.parse(fs.readFileSync('market_prices.json', 'utf8'));

function findMarket(category) {
  return MARKET[category] || null;
}

const isRecent = t => {
  if (!t) return false;
  if (/\d+ days/.test(t) && !/^[12] days/.test(t)) return false;
  if (/week|month|year/.test(t)) return false;
  return /minute|hour|1 day|2 days|yesterday/.test(t);
};

const parsePrice = p => parseInt((p || '').replace(/[^0-9]/g, '')) || 0;

function timeAgoToTimestamp(timeAgo) {
  const now = new Date();
  if (!timeAgo) return '';
  const m = timeAgo.match(/(\d+)\s*(minute|hour|day)/);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2];
    if (unit === 'minute') now.setMinutes(now.getMinutes() - n);
    else if (unit === 'hour') now.setHours(now.getHours() - n);
    else if (unit === 'day') now.setDate(now.getDate() - n);
  } else if (timeAgo.includes('yesterday')) {
    now.setDate(now.getDate() - 1);
  }
  return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const escPipe = s => (s || '').replace(/\|/g, '/');

// === 去重：排除之前已看過的 product ID ===
const SEEN_FILE = 'seen_ids.json';
let seenHistory = [];
try { seenHistory = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch {}
const seenSet = new Set(seenHistory);

// === 主流程 ===
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const seen = new Set();
const allDeals = [];  // 好貨（30%/70% 門檻）
const newDeals = [];  // 新發現（報告用）
const negotiate = []; // 殺價保留（$3,000+ 且二手 85% 以下）
let skippedDup = 0;

raw.forEach(item => {
  if (!isRecent(item.timeAgo)) return;
  if (BANNED.has(item.seller)) return;
  if (SKIP_CAT.includes(item.category)) return;
  const price = parsePrice(item.price);
  if (price < 300) return;
  if (seen.has(item.url)) return;
  seen.add(item.url);
  if (SKIP.some(w => item.title.includes(w))) return;

  const mkt = findMarket(item.category);
  if (!mkt) return;

  // 市價低於 $2,000 的跳過（買新的比較值得）
  const refPrice = mkt.currentNew || mkt.secondhand;
  if (refPrice < 2000) return;

  // 核心比價：新品30%以下 OR 二手行情70%以下
  const vsNew = mkt.currentNew ? Math.round(price / mkt.currentNew * 100) : null;
  const vsSecondhand = Math.round(price / mkt.secondhand * 100);
  const passNew = vsNew !== null && vsNew <= 30;
  const passSecondhand = vsSecondhand <= 70;

  const isReseller = RESELLERS.has(item.seller);
  const sellerNote = isReseller ? resellerNotes[item.seller] || '批量賣家' : '';
  const listedAt = timeAgoToTimestamp(item.timeAgo);
  const deal = { ...item, price, priceStr: item.price, mkt, vsNew, vsSecondhand, isReseller, sellerNote, listedAt };

  if (passNew || passSecondhand) {
    allDeals.push(deal);
    const pid = item.url.match(/\/p\/(\d+)/)?.[1];
    if (pid && seenSet.has(pid)) { skippedDup++; }
    else { newDeals.push(deal); }
  } else if (price >= 3000 && vsSecondhand <= 85) {
    negotiate.push(deal);
  }
});

// 按折數排序（用二手行情折數）
allDeals.sort((a, b) => a.vsSecondhand - b.vsSecondhand);
newDeals.sort((a, b) => a.vsSecondhand - b.vsSecondhand);
negotiate.sort((a, b) => a.vsSecondhand - b.vsSecondhand);

// === 輸出 CSV ===
const csvLines = ['category|seller|title|price|condition|url|比較基準|vs_new|vs_secondhand|listed_at'];
allDeals.forEach(d => {
  const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}/二手$${d.mkt.secondhand}` : `二手$${d.mkt.secondhand}(停產)`;
  csvLines.push(`${d.category}|${d.seller}|${escPipe(d.title)}|${d.priceStr}|${d.condition}|${d.url}|${basis}|${d.vsNew ?? '-'}%|${d.vsSecondhand}%|${d.listedAt}`);
});
fs.writeFileSync('carousell_wishlist_20260501.csv', csvLines.join('\n') + '\n');

// === 輸出報告 ===
const recentCount = [...new Set(raw.filter(i => isRecent(i.timeAgo)).map(i => i.url))].length;
console.log(`\n=== Batch 結果 ===`);
console.log(`原始 ${raw.length} → 3天內 ${recentCount} → 好貨 ${allDeals.length} 筆（新 ${newDeals.length}，已看過 ${skippedDup}）＋ 殺價 ${negotiate.length} 筆\n`);
newDeals.forEach((d, i) => {
  const basis = d.mkt.currentNew
    ? `新品${d.vsNew}% 二手${d.vsSecondhand}%`
    : `二手${d.vsSecondhand}% (停產品,無新品價)`;
  console.log(`${i+1}. [${d.category}] ${d.priceStr} — ${basis}`);
  console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
  console.log(`   ${d.url}`);
});

if (negotiate.length > 0) {
  console.log(`\n--- 殺價保留清單（$3,000+，二手 ≤85%）---\n`);
  negotiate.forEach((d, i) => {
    const basis = d.mkt.currentNew
      ? `新品${d.vsNew}% 二手${d.vsSecondhand}%`
      : `二手${d.vsSecondhand}%`;
    console.log(`${i+1}. [${d.category}] ${d.priceStr} — ${basis}`);
    console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   ${d.url}`);
  });
}

// === 列出需要查的新賣家 ===
const knownSellers = new Set([...BANNED, ...RESELLERS, ...(sellersData.trusted?.accounts || []).map(a => a.id)]);
const allResults = [...newDeals, ...negotiate];
const unknownSellers = [...new Set(allResults.map(d => d.seller))].filter(s => !knownSellers.has(s));
if (unknownSellers.length > 0) {
  console.log(`\n⚡ 需要查的新賣家（${unknownSellers.length} 位）：`);
  unknownSellers.forEach(s => {
    const items = allResults.filter(d => d.seller === s);
    console.log(`  → ${s} (${items.length} 筆) https://tw.carousell.com/u/${s}/`);
  });
}

// === 更新 README ===
const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
let md = `# Carousell 二手好物清單\n\n`;
md += `16 queries + 4 分類 | 新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情比\n\n`;
md += `> 最後更新：${now}\n\n`;
if (newDeals.length === 0) {
  md += `## 目前清單\n\n本輪無新好貨（已看過 ${skippedDup} 筆）。持續巡邏中。\n`;
} else {
  md += `## 目前清單（${newDeals.length} 筆新貨）\n\n`;
  md += `| 品項 | 價格 | 比較基準 | 折數 | 狀態 | 上架 | 連結 |\n`;
  md += `|------|------|----------|------|------|------|------|\n`;
  newDeals.forEach(d => {
    const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
    const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
    const warn = d.isReseller ? ' ⚠' : '';
    md += `| ${escPipe(d.title.slice(0, 50))}${warn} | ${d.priceStr} | ${basis} | ${disc} | ${d.condition} | ${d.listedAt} | <a href="${d.url}" target="_blank">查看</a> |\n`;
  });
}
if (negotiate.length > 0) {
  md += `\n## 殺價保留（${negotiate.length} 筆，$3,000+ 可議價）\n\n`;
  md += `| 品項 | 價格 | 比較基準 | 折數 | 狀態 | 上架 | 連結 |\n`;
  md += `|------|------|----------|------|------|------|------|\n`;
  negotiate.forEach(d => {
    const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
    const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
    md += `| ${escPipe(d.title.slice(0, 50))} | ${d.priceStr} | ${basis} | ${disc} | ${d.condition} | ${d.listedAt} | <a href="${d.url}" target="_blank">查看</a> |\n`;
  });
}
md += `\n---\n\n## 歷史批次\n\n`;
md += `<details><summary>Batch 5（已檢查 2026-05-02）</summary>\n\n折舊修正前的結果，見 git history\n\n</details>\n\n`;
md += `<details><summary>Batch 1-4（已檢查 2026-05-01~02）</summary>\n\n見 git history\n\n</details>\n\n`;
md += `---\n\n## 系統說明\n\n詳見 [carousell_workflow.md](carousell_workflow.md)\n`;
fs.writeFileSync('README.md', md);

// === 更新 deals.html ===
let html = `<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Carousell 二手好物清單</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;max-width:960px;margin:0 auto}\nh1{font-size:1.6rem;margin-bottom:6px;color:#fff}\n.sub{color:#888;margin-bottom:20px;font-size:.85rem}\ntable{width:100%;border-collapse:collapse;margin-bottom:30px}\nth{text-align:left;padding:10px 6px;border-bottom:2px solid #333;color:#888;font-size:.75rem;text-transform:uppercase}\ntd{padding:8px 6px;border-bottom:1px solid #1a1a1a;font-size:.85rem}\ntr:hover{background:#111}\n.p{color:#e8364e;font-weight:700}\n.d{color:#4ade80;font-weight:700}\na{color:#60a5fa;text-decoration:none}\na:hover{text-decoration:underline}\n.t{font-size:.8rem;color:#666}\n</style>\n</head>\n<body>\n<h1>Carousell 二手好物清單</h1>\n<p class="sub">新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情 | ${now}</p>\n<table>\n<tr><th>品項</th><th>價格</th><th>比較基準</th><th>折數</th><th>狀態</th><th>上架</th><th></th></tr>\n`;
newDeals.forEach(d => {
  const basis = d.mkt.currentNew ? `新$${d.mkt.currentNew}` : `二手$${d.mkt.secondhand}`;
  const disc = d.mkt.currentNew ? `${d.vsNew}%` : `${d.vsSecondhand}%`;
  html += `<tr><td>${d.title}</td><td class="p">${d.priceStr}</td><td>${basis}</td><td class="d">${disc}</td><td class="t">${d.condition}</td><td class="t">${d.listedAt}</td><td><a href="${d.url}" target="_blank">查看</a></td></tr>\n`;
});
html += `</table>\n</body>\n</html>`;
fs.writeFileSync('deals.html', html);

// seen_ids 不自動更新——等使用者說「看完了」後跑 node mark_seen.js
console.log(`\n✓ CSV + README + HTML 已更新`);
console.log(`✓ seen_ids: ${seenHistory.length} 筆已看過，本輪 ${newDeals.length} 筆待確認`);
if (newDeals.length > 0) {
  console.log(`  → 使用者確認後跑: node mark_seen.js`);
}
