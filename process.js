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
  // 兒童/教育
  '迪士尼投影機','美語世界','寰宇家庭',
  // 雜牌/非品牌香水
  'KP記憶','KLOWER','GRAFEN','費洛香','天堂','蝴蝶香水','聖物','桃花','香水盒','提袋','卡片4件','Frank Olivier','HDO','守護甜心','日和結',
  // 錶帶不是手錶
  '錶環','高山錶',
];


// === 跳過的 category ===
const SKIP_CAT = [
  'dyson', 'lululemon',
  // 暫停的 queries
  'Samsung Galaxy Watch', 'Vivienne Westwood', '鼠尾草 海鹽', 'Jo Malone', '香水', 'OSIM', '咖啡機', 'marshall', 'bose',
  // 分類頁不進比價
  '家具居家', '美妝保養', '精品', '手機平板', '家電影音', '音響耳機',
];

// === 市場行情表：從 market_prices.json 讀取 ===
// key = category（就是 scrape 的 query 或分類名），直接查表
// 判斷規則：price <= currentNew*0.30 OR price <= secondhand*0.70
const MARKET = JSON.parse(fs.readFileSync('market_prices.json', 'utf8'));

function findMarket(category) {
  return MARKET[category] || null;
}

const isRecent = (t, maxDays = 3) => {
  if (!t) return false;
  if (/week|month|year/.test(t)) return false;
  if (/minute|hour|yesterday/.test(t)) return true;
  const dayMatch = t.match(/^(\d+)\s*days?/);
  if (dayMatch) return parseInt(dayMatch[1]) <= maxDays;
  return false;
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

// === 主流程：基本篩選出候選清單 ===
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const seen = new Set();
const candidates = []; // 通過基本篩選的候選
let skippedDup = 0;

raw.forEach(item => {
  if (!isRecent(item.timeAgo, item.maxDays || 3)) return;
  if (BANNED.has(item.seller)) return;
  if (SKIP_CAT.includes(item.category)) return;
  const price = parsePrice(item.price);
  if (price < 500) return;
  if (seen.has(item.url)) return;
  seen.add(item.url);
  if (SKIP.some(w => item.title.includes(w))) return;

  const pid = item.url.match(/\/p\/(\d+)/)?.[1];
  const isSeen = pid && seenSet.has(pid);
  if (isSeen) { skippedDup++; return; }

  const isReseller = RESELLERS.has(item.seller);
  const sellerNote = isReseller ? resellerNotes[item.seller] || '批量賣家' : '';
  const listedAt = timeAgoToTimestamp(item.timeAgo);
  candidates.push({ ...item, price, priceStr: item.price, isReseller, sellerNote, listedAt, pid });
});

// === 讀取已驗證的價格（由 subagent 寫入）===
const VERIFIED_FILE = 'verified_prices.json';
let verified = {};
try { verified = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8')); } catch {}

// === 用已驗證價格比價，沒驗證的列為待查 ===
const newDeals = [];
const negotiate = [];
const needVerify = [];

candidates.forEach(d => {
  const v = verified[d.pid];
  if (!v) {
    needVerify.push(d);
    return;
  }
  const vsNew = v.newPrice ? Math.round(d.price / v.newPrice * 100) : null;
  const vsSecondhand = v.secondhand ? Math.round(d.price / v.secondhand * 100) : null;
  const passNew = vsNew !== null && vsNew <= 30;
  const passSecondhand = vsSecondhand !== null && vsSecondhand <= 70;
  d.verified = v;
  d.vsNew = vsNew;
  d.vsSecondhand = vsSecondhand;

  if (passNew || passSecondhand) {
    newDeals.push(d);
  } else if (d.price >= 3000 && vsSecondhand !== null && vsSecondhand <= 85) {
    negotiate.push(d);
  }
});

newDeals.sort((a, b) => (a.vsSecondhand || 999) - (b.vsSecondhand || 999));
negotiate.sort((a, b) => (a.vsSecondhand || 999) - (b.vsSecondhand || 999));

// === 輸出報告 ===
const recentCount = [...new Set(raw.filter(i => isRecent(i.timeAgo, i.maxDays || 3)).map(i => i.url))].length;
console.log(`\n=== Batch 結果 ===`);
console.log(`原始 ${raw.length} → 候選 ${candidates.length}（已看過跳過 ${skippedDup}）`);
console.log(`已驗證: 好貨 ${newDeals.length} ＋ 殺價 ${negotiate.length} ＋ 待查價 ${needVerify.length}\n`);

if (newDeals.length > 0) {
  console.log(`--- 好貨 ---\n`);
  newDeals.forEach((d, i) => {
    const v = d.verified;
    console.log(`${i+1}. [${d.category}] ${d.priceStr} — 新品${d.vsNew ?? '-'}% 二手${d.vsSecondhand ?? '-'}%`);
    console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   新品$${v.newPrice || '?'} 二手$${v.secondhand || '?'} (${v.note || ''})`);
    console.log(`   ${d.url}`);
  });
}

if (negotiate.length > 0) {
  console.log(`\n--- 殺價保留（$3,000+，二手 ≤85%）---\n`);
  negotiate.forEach((d, i) => {
    const v = d.verified;
    console.log(`${i+1}. [${d.category}] ${d.priceStr} — 新品${d.vsNew ?? '-'}% 二手${d.vsSecondhand ?? '-'}%`);
    console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   新品$${v.newPrice || '?'} 二手$${v.secondhand || '?'} (${v.note || ''})`);
    console.log(`   ${d.url}`);
  });
}

if (needVerify.length > 0) {
  console.log(`\n⏳ 待查價（${needVerify.length} 筆，需 subagent web search）：\n`);
  needVerify.slice(0, 20).forEach((d, i) => {
    console.log(`${i+1}. ${d.priceStr} | ${d.title.slice(0,50)} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   ${d.url}`);
  });
  if (needVerify.length > 20) console.log(`   ...還有 ${needVerify.length - 20} 筆`);
}

// 輸出待查價清單給 subagent 用
fs.writeFileSync('need_verify.json', JSON.stringify(needVerify.map(d => ({
  pid: d.pid, title: d.title, price: d.price, priceStr: d.priceStr,
  category: d.category, seller: d.seller, url: d.url, timeAgo: d.timeAgo
})), null, 2));

// === 列出需要查的新賣家 ===
const knownSellers = new Set([...BANNED, ...RESELLERS, ...(sellersData.trusted?.accounts || []).map(a => a.id)]);
const allResults = [...newDeals, ...negotiate, ...needVerify];
const unknownSellers = [...new Set(allResults.map(d => d.seller))].filter(s => !knownSellers.has(s));
if (unknownSellers.length > 0) {
  console.log(`\n⚡ 需要查的新賣家（${unknownSellers.length} 位）：`);
  unknownSellers.forEach(s => {
    const items = allResults.filter(d => d.seller === s);
    console.log(`  → ${s} (${items.length} 筆) https://tw.carousell.com/u/${s}/`);
  });
}

// === 輸出 CSV ===
const csvLines = ['category|seller|title|price|condition|url|newPrice|secondhand|vs_new|vs_secondhand|listed_at'];
[...newDeals, ...negotiate].forEach(d => {
  const v = d.verified || {};
  csvLines.push(`${d.category}|${d.seller}|${escPipe(d.title)}|${d.priceStr}|${d.condition}|${d.url}|${v.newPrice||''}|${v.secondhand||''}|${d.vsNew ?? '-'}%|${d.vsSecondhand ?? '-'}%|${d.listedAt}`);
});
fs.writeFileSync('carousell_wishlist_20260501.csv', csvLines.join('\n') + '\n');

// === 更新 README ===
const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
let md = `# Carousell 二手好物清單\n\n`;
md += `16 queries + 4 分類 | 新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情比\n\n`;
md += `> 最後更新：${now}\n\n`;
const showDeals = (list, title) => {
  if (list.length === 0) return '';
  let s = `## ${title}（${list.length} 筆）\n\n`;
  s += `| 品項 | 價格 | 新品價 | 折數 | 狀態 | 上架 | 連結 |\n`;
  s += `|------|------|--------|------|------|------|------|\n`;
  list.forEach(d => {
    const v = d.verified || {};
    const basis = v.newPrice ? `$${v.newPrice}` : (v.secondhand ? `二手$${v.secondhand}` : '?');
    const disc = d.vsNew ? `${d.vsNew}%` : (d.vsSecondhand ? `${d.vsSecondhand}%` : '?');
    const warn = d.isReseller ? ' ⚠' : '';
    s += `| ${escPipe(d.title.slice(0, 50))}${warn} | ${d.priceStr} | ${basis} | ${disc} | ${d.condition} | ${d.listedAt} | <a href="${d.url}" target="_blank">查看</a> |\n`;
  });
  return s;
};

if (newDeals.length === 0 && needVerify.length === 0) {
  md += `## 目前清單\n\n本輪無新好貨（已看過 ${skippedDup} 筆）。持續巡邏中。\n`;
} else {
  md += showDeals(newDeals, '好貨（≤30% 新品 or ≤70% 二手）');
  md += showDeals(negotiate, '殺價保留（$3,000+，≤85%）');
  if (needVerify.length > 0) {
    md += `\n## 待查價（${needVerify.length} 筆）\n\n`;
    md += `| 品項 | 價格 | 上架 | 連結 |\n`;
    md += `|------|------|------|------|\n`;
    needVerify.slice(0, 20).forEach(d => {
      md += `| ${escPipe(d.title.slice(0, 50))} | ${d.priceStr} | ${d.listedAt} | <a href="${d.url}" target="_blank">查看</a> |\n`;
    });
  }
}
md += `\n---\n\n## 歷史批次\n\n`;
md += `<details><summary>Batch 5（已檢查 2026-05-02）</summary>\n\n折舊修正前的結果，見 git history\n\n</details>\n\n`;
md += `<details><summary>Batch 1-4（已檢查 2026-05-01~02）</summary>\n\n見 git history\n\n</details>\n\n`;
md += `---\n\n## 系統說明\n\n詳見 [carousell_workflow.md](carousell_workflow.md)\n`;
fs.writeFileSync('README.md', md);

// === 更新 deals.html ===
let html = `<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Carousell 二手好物清單</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;max-width:960px;margin:0 auto}\nh1{font-size:1.6rem;margin-bottom:6px;color:#fff}\n.sub{color:#888;margin-bottom:20px;font-size:.85rem}\ntable{width:100%;border-collapse:collapse;margin-bottom:30px}\nth{text-align:left;padding:10px 6px;border-bottom:2px solid #333;color:#888;font-size:.75rem;text-transform:uppercase}\ntd{padding:8px 6px;border-bottom:1px solid #1a1a1a;font-size:.85rem}\ntr:hover{background:#111}\n.p{color:#e8364e;font-weight:700}\n.d{color:#4ade80;font-weight:700}\na{color:#60a5fa;text-decoration:none}\na:hover{text-decoration:underline}\n.t{font-size:.8rem;color:#666}\n</style>\n</head>\n<body>\n<h1>Carousell 二手好物清單</h1>\n<p class="sub">新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情 | ${now}</p>\n<table>\n<tr><th>品項</th><th>價格</th><th>比較基準</th><th>折數</th><th>狀態</th><th>上架</th><th></th></tr>\n`;
[...newDeals, ...negotiate].forEach(d => {
  const v = d.verified || {};
  const basis = v.newPrice ? `$${v.newPrice}` : (v.secondhand ? `二手$${v.secondhand}` : '?');
  const disc = d.vsNew ? `${d.vsNew}%` : (d.vsSecondhand ? `${d.vsSecondhand}%` : '?');
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
