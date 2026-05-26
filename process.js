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
  '運動衣','瑜珈服','運動內衣','Tank','Sleeve','Top','喇叭褲','喇叭裙','喇叭牛仔','喇叭長褲','微喇叭','牛仔褲','短褲','襯衫','毛帽','棒球帽','裹身裙','外套上衣','休閒褲','windbreaker','WINDBREAKER','BOX L','CAMP CAP','JACQUARD','瑜珈褲','瑜伽褲','露營帽','老帽','抗撕裂','工作褲','工裝褲','釣魚褲','卡其褲',
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
  // 便宜品牌咖啡機/家電
  'SAMPO','聲寶','松木',
  // 帳篷雜訊
  '蚊帳','驅蚊','滅蚊','跑步鞋','運動鞋',
  // 古董/非目標
  '幻燈片','Paximat','Spotlight',
  // 兒童/教育
  '迪士尼投影機','美語世界','寰宇家庭',
  // 專業舞台/PA設備
  '擴大機','Peavey','PA系統','舞台音響',
  // K-pop 專輯非器材
  '專輯','My Voice','十周年','太妍',
  // 漫畫小說周邊
  '愛藏版','首刷','古味直志','偽戀','東立','首刷限定','書腰',
  // 家具
  '電視櫃','音響櫃','TV櫃','岩板',
  // 雜牌/非品牌香水
  'KP記憶','KLOWER','GRAFEN','費洛香','天堂','蝴蝶香水','聖物','桃花','香水盒','提袋','卡片4件','Frank Olivier','HDO','守護甜心','日和結',
  // 仿品/代工廠貨
  '代工廠貨','跟原廠一樣','MTW4',
  // 殘缺品
  '右耳遺失','左耳遺失','耳遺失','缺一耳','只有左','只有右',
  // 錄音帶等媒體
  '錄音帶','空白錄音','卡帶',
  // 地毯雜訊
  '地毯清洗機','保暖毯','毛毯','手作地毯','簇絨槍',
  // 優格機雜訊
  '機車','重機','檔車','加濕香薰','米桶','麵包機',
  // 車用零件
  '車用','尾燈','跑馬','BRZ','86 BRZ','光條',
  // 衣服 (補)
  'Jacket','jacket','Haglofs','GORE-TEX','gore-tex',
  // 錶帶不是手錶
  '錶環','高山錶',
];


// === 跳過的 category ===
const SKIP_CAT = [
  'dyson', 'lululemon',
  // 暫停的 queries
  'Samsung Galaxy Watch', 'Vivienne Westwood', '鼠尾草 海鹽', 'Jo Malone', '香水', 'OSIM', '咖啡機', 'marshall', 'bose',
  // 分類頁不進比價
  '家具居家', '美妝保養', '精品', '手機平板', '家電影音',
  // '音響耳機' 開放：marshall/bose/AirPods 暫停 query 時靠這個撈
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

// === 同型號重複降權: title keyword 累積 ≥5 次 → 本輪最多顯示 1 筆 ===
// Rose 2026-05-25: 「看過多次代表沒需求或行情普遍偏高, 減少出現率」
let titleFreq = {};
try { titleFreq = JSON.parse(fs.readFileSync('seen_title_freq.json', 'utf8')); } catch {}
const TITLE_KEYWORD_PATTERNS = [
  /iPhone\s*(\d{1,2}(?:\s*Pro(?:\s*Max)?|\s*mini|\s*Plus)?)/i,
  /iPad\s*(Pro|Air|mini)?\s*(\d{1,2})?/i,
  /AirPods\s*(Pro\s*\d?|Max|\d)/i,
  /MacBook\s*(Air|Pro)\s*(M[1-4]|2020|202[1-6])?/i,
  /Apple\s*Watch\s*(SE\d?|S\d+|Ultra\d?)/i,
  /Switch\s*(OLED|Lite|2)?/i,
  /New\s*3DS\s*XL/i,
  /Sony\s*(a7\s*m?\d|a\d{2,3})/i, /PS\s*[45](\s*Slim|\s*Pro)?/i,
  /WH-?\d{4}/i, /RTX\s*\d{4}(?:\s*Ti|\s*Super)?/i,
  /GTX\s*\d{4}(?:\s*Ti|\s*Super)?/i, /RX\s*\d{4}(?:\s*XT)?/i,
  /Fujifilm\s*X-?[ETH]\d/i, /Canon\s*(EOS\s*R\d?|IXUS\s*\d+|G\d+\s*X?)/i,
  /Nikon\s*(Z\s*\d|D\d{3,4})/i, /GoPro\s*(Hero\s*)?\d{1,2}/i,
  /Insta360\s*(X\d|Ace|GO\s*\d)/i,
  /DJI\s*(Pocket\s*\d|Osmo|Mini\s*\d|Neo|RS\s*\d|RoboMaster)/i,
  /Marshall\s*(Acton|Stockwell|Emberton|Willen|Minor)\s*(I+|\d)?/i,
  /BOSE\s*(QC|QuietComfort|SoundLink)\s*(\d+|Mini\s*\d|Ultra)?/i,
  /Shokz\s*(OpenFit|OpenRun|OpenDots)\s*(Pro|ONE|\d)?/i,
  /Dyson\s*(SV\d+|V\d+|HD\d+)/i, /Instax\s*(Mini|Wide|Square)?\s*(EVO|\d{1,3})?/i,
  /Leica\s*Sofort/i, /Galaxy\s*(Tab\s*[SA]\d+\+?|S\d{1,2})/i,
];
const titleKeywords = (title) => {
  const keys = new Set();
  for (const re of TITLE_KEYWORD_PATTERNS) {
    const m = (title || '').match(re);
    if (m) keys.add(m[0].toLowerCase().replace(/\s+/g, ' ').trim());
  }
  return [...keys];
};
const SEEN_KEYWORD_THRESHOLD = 5;
const isOversaturatedKeyword = (title) =>
  titleKeywords(title).some(k => (titleFreq[k] || 0) >= SEEN_KEYWORD_THRESHOLD);

// === 主流程：基本篩選出候選清單 ===
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const seen = new Set();
const candidates = []; // 通過基本篩選的候選
let skippedDup = 0;
let skippedOversat = 0;
const keywordRoundCount = {}; // 本輪 keyword 出現次數 (oversaturated 的 keyword 同輪只留 1 筆)

raw.forEach(item => {
  if (!isRecent(item.timeAgo, item.maxDays || 3)) return;
  if (BANNED.has(item.seller)) return;
  if (SKIP_CAT.includes(item.category)) return;
  const price = parsePrice(item.price);
  if (price < 500) return;
  if (price > 10_000_000) return; // hashtag bug: #26 + price 被接合成大數
  // wearables sub-cat leak (AirPods/Pencil/Polar/翻譯眼鏡)
  if (item.category === '智慧手錶' && /AirPod|Powerbeats|Apple Pencil|心率|翻譯眼鏡/i.test(item.title)) return;
  if (seen.has(item.url)) return;
  seen.add(item.url);
  if (SKIP.some(w => item.title.includes(w))) return;

  const pid = item.url.match(/\/p\/(\d+)/)?.[1];
  const isSeen = pid && seenSet.has(pid);
  if (isSeen) { skippedDup++; return; }

  // 同型號降權: oversaturated keyword 本輪最多 1 筆
  const kws = titleKeywords(item.title);
  const overSatKey = kws.find(k => (titleFreq[k] || 0) >= SEEN_KEYWORD_THRESHOLD);
  if (overSatKey) {
    if ((keywordRoundCount[overSatKey] || 0) >= 1) { skippedOversat++; return; }
    keywordRoundCount[overSatKey] = (keywordRoundCount[overSatKey] || 0) + 1;
  }

  const isReseller = RESELLERS.has(item.seller);
  const sellerNote = isReseller ? resellerNotes[item.seller] || '批量賣家' : '';
  const listedAt = timeAgoToTimestamp(item.timeAgo);
  candidates.push({ ...item, price, priceStr: item.price, isReseller, sellerNote, listedAt, pid });
});

if (skippedOversat > 0) console.log(`同型號降權跳過: ${skippedOversat} 筆 (keyword freq ≥${SEEN_KEYWORD_THRESHOLD} 本輪最多 1)`);

// === 讀取已驗證的價格（由 subagent 寫入）===
const VERIFIED_FILE = 'verified_prices.json';
let verified = {};
try { verified = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8')); } catch {}

// === 讀取累積的待審清單（跨 scrape 保留）===
const PENDING_FILE = 'pending_review.json';
let pending = { newDeals: [], negotiate: [], uncertain: [] };
try { pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')); } catch {}

// === 用已驗證價格比價，沒驗證的列為待查 ===
const newDeals = [];
const negotiate = [];
const uncertain = []; // 二手資料不足，價格相對新品合理但無法自動判斷
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
  } else if (d.price >= 3000 && vsSecondhand !== null && vsSecondhand <= 90) {
    negotiate.push(d);
  } else if (v.secondhand === null && vsNew !== null && vsNew <= 70 && d.price >= 2000) {
    uncertain.push(d);
  }
});

// === 合併本輪結果到 pending（去重 by pid，過濾已 seen）===
const mergePending = (existing, current) => {
  const map = new Map();
  [...existing, ...current].forEach(d => {
    if (d.pid && !seenSet.has(d.pid)) map.set(d.pid, d);
  });
  return [...map.values()];
};
pending.newDeals = mergePending(pending.newDeals || [], newDeals);
pending.negotiate = mergePending(pending.negotiate || [], negotiate);
pending.uncertain = mergePending(pending.uncertain || [], uncertain);

// 直推 pending 的 watchlist items 缺 .verified, 從 verified_prices 補, 避免 render crash
for (const bucket of ['newDeals', 'negotiate', 'uncertain']) {
  for (const item of pending[bucket]) {
    if (!item.verified && verified[item.pid]) item.verified = verified[item.pid];
  }
}
fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));

// 用 pending 替換 newDeals/negotiate/uncertain 給後續輸出（README/HTML 顯示完整清單）
// Sort by listedAt (absolute timestamp) — 不能用 timeAgo 因為 pending 累積後 timeAgo 不會更新會錯亂
const parseListedAt = (s) => {
  if (!s) return 0;
  const m = s.match(/(\d+)\/(\d+)\s+(\d+):(\d+)/);
  if (!m) return 0;
  const now = new Date();
  const d = new Date(now.getFullYear(), parseInt(m[1]) - 1, parseInt(m[2]), parseInt(m[3]), parseInt(m[4]));
  if (d > now) d.setFullYear(now.getFullYear() - 1); // 跨年保險
  return d.getTime();
};
const sortByRecent = (a, b) => parseListedAt(b.listedAt) - parseListedAt(a.listedAt);
// Backfill listedAt + condition. Warn loudly if timeAgo missing — that's a manual-inject bug.
const validateAndBackfill = (arr, name) => arr.forEach(d => {
  if (!d.timeAgo) console.warn(`⚠ ${name} pid=${d.pid} 缺 timeAgo — 手動 inject 漏帶, 從 raw_results 反查補`);
  if (!d.listedAt) d.listedAt = timeAgoToTimestamp(d.timeAgo);
  if (!d.condition) d.condition = 'Unknown';
});
validateAndBackfill(pending.newDeals, 'newDeals');
validateAndBackfill(pending.negotiate, 'negotiate');
validateAndBackfill(pending.uncertain, 'uncertain');
// === Cap per category（同品類超過 N 筆,後段 mark seen 放棄）===
// 防電腦科技/iPad/相機等品類佔比過高灌爆 README
// 權威控制：query 詞 → Carousell 主類別 (同義詞合併計算 cap)
const CATEGORY_AUTHORITY = {
  'PS5': '電玩主機',
  'Steam Deck': '電玩主機',
  'Switch 遊戲片': '電玩主機',
};
const normalizeCat = c => CATEGORY_AUTHORITY[c] || c || '其他';

const CAP_PER_CATEGORY = 5;
const capByCategory = (items, label) => {
  const byCat = {};
  items.forEach(d => {
    (byCat[normalizeCat(d.category)] = byCat[normalizeCat(d.category)] || []).push(d);
  });
  const kept = [], dropped = [];
  for (const arr of Object.values(byCat)) {
    // 排序：越便宜（vsSecondhand 越低）越前面，null 用 vsNew 退化，再 null 視作行情
    arr.sort((a, b) => (a.vsSecondhand ?? a.vsNew ?? 999) - (b.vsSecondhand ?? b.vsNew ?? 999));
    kept.push(...arr.slice(0, CAP_PER_CATEGORY));
    dropped.push(...arr.slice(CAP_PER_CATEGORY));
  }
  if (dropped.length) console.log(`  ${label}: cap ${CAP_PER_CATEGORY}/cat → mark seen ${dropped.length} 筆`);
  return { kept, dropped };
};

console.log('\n=== Cap per category ===');
const capNew = capByCategory(pending.newDeals, '好貨');
const capNeg = capByCategory(pending.negotiate, '殺價');
const capUnc = capByCategory(pending.uncertain, '手動');
const cappedDropPids = [...capNew.dropped, ...capNeg.dropped, ...capUnc.dropped].map(d => d.pid);
if (cappedDropPids.length) {
  pending.newDeals = capNew.kept;
  pending.negotiate = capNeg.kept;
  pending.uncertain = capUnc.kept;
  const seenArr = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8'));
  cappedDropPids.forEach(p => { if (!seenArr.includes(p)) seenArr.push(p); });
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seenArr, null, 2));
  fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2));
  console.log(`  總計移除 ${cappedDropPids.length} 筆, seen_ids → ${seenArr.length}`);
}

const allNewDeals = [...pending.newDeals].sort(sortByRecent);
const allNegotiate = [...pending.negotiate].sort(sortByRecent);
const allUncertain = [...pending.uncertain].sort(sortByRecent);

// === 輸出報告 ===
const recentCount = [...new Set(raw.filter(i => isRecent(i.timeAgo, i.maxDays || 3)).map(i => i.url))].length;
console.log(`\n=== Batch 結果 ===`);
console.log(`原始 ${raw.length} → 候選 ${candidates.length}（已看過跳過 ${skippedDup}）`);
console.log(`本輪新增: 好貨+${newDeals.length} 殺價+${negotiate.length} 手動+${uncertain.length} 待查+${needVerify.length}`);
console.log(`累積待審: 好貨 ${allNewDeals.length} 殺價 ${allNegotiate.length} 手動 ${allUncertain.length}\n`);

if (allNewDeals.length > 0) {
  console.log(`--- 好貨（累積）---\n`);
  allNewDeals.forEach((d, i) => {
    const v = d.verified;
    console.log(`${i+1}. [${d.category}] ${d.priceStr} — 新品${d.vsNew ?? '-'}% 二手${d.vsSecondhand ?? '-'}%`);
    console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   新品$${v.newPrice || '?'} 二手$${v.secondhand || '?'} (${v.note || ''})`);
    console.log(`   ${d.url}`);
  });
}

if (allNegotiate.length > 0) {
  console.log(`\n--- 殺價保留（累積）---\n`);
  allNegotiate.forEach((d, i) => {
    const v = d.verified;
    console.log(`${i+1}. [${d.category}] ${d.priceStr} — 新品${d.vsNew ?? '-'}% 二手${d.vsSecondhand ?? '-'}%`);
    console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   新品$${v.newPrice || '?'} 二手$${v.secondhand || '?'} (${v.note || ''})`);
    console.log(`   ${d.url}`);
  });
}

if (allUncertain.length > 0) {
  console.log(`\n--- 手動判斷（累積）---\n`);
  allUncertain.forEach((d, i) => {
    const v = d.verified;
    console.log(`${i+1}. [${d.category}] ${d.priceStr} — 新品${d.vsNew ?? '-'}%（二手資料不足）`);
    console.log(`   ${d.title} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   新品$${v.newPrice} ${v.note || ''}`);
    console.log(`   ${d.url}`);
  });
}

// 把待查分成「相關」（特定 query）跟「雜訊」（無關鍵字）
const needVerifyRelevant = needVerify.filter(d => d.category && d.category !== '');
const needVerifyNoise = needVerify.filter(d => !d.category || d.category === '');

if (needVerifyRelevant.length > 0) {
  console.log(`\n⏳ 待查價（${needVerifyRelevant.length} 筆相關 +${needVerifyNoise.length} 筆雜訊，需 subagent web search）：\n`);
  needVerifyRelevant.forEach((d, i) => {
    console.log(`${i+1}. [${d.category}] ${d.priceStr} | ${d.title.slice(0,50)} | ${d.seller} | ${d.timeAgo}`);
    console.log(`   ${d.url}`);
  });
}

// 只把相關的寫進 need_verify.json（無關鍵字雜訊不進）
fs.writeFileSync('need_verify.json', JSON.stringify(needVerifyRelevant.map(d => ({
  pid: d.pid, title: d.title, price: d.price, priceStr: d.priceStr,
  category: d.category, seller: d.seller, url: d.url, timeAgo: d.timeAgo
})), null, 2));

// === 列出需要查的新賣家 ===
const knownSellers = new Set([...BANNED, ...RESELLERS, ...(sellersData.trusted?.accounts || []).map(a => a.id)]);
const allResults = [...allNewDeals, ...allNegotiate, ...allUncertain, ...needVerify];
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
[...allNewDeals, ...allNegotiate, ...allUncertain].forEach(d => {
  const v = d.verified || {};
  csvLines.push(`${d.category}|${d.seller}|${escPipe(d.title)}|${d.priceStr}|${d.condition}|${d.url}|${v.newPrice||''}|${v.secondhand||''}|${d.vsNew ?? '-'}%|${d.vsSecondhand ?? '-'}%|${d.listedAt}`);
});
fs.writeFileSync('carousell_wishlist_20260501.csv', csvLines.join('\n') + '\n');

// === 更新 README ===
const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
const totalShops = (sellersData.shops?.accounts?.length || 0);
const totalSeen = (() => { try { return JSON.parse(fs.readFileSync('seen_ids.json','utf8')).length; } catch { return 0; } })();
let md = `# Carousell 二手好物巡邏\n\n`;
md += `> ${now} · 累積已看 ${totalSeen} 筆 · ${totalShops} 位賣家黑名單\n\n`;
md += `**待審：** 好貨 ${allNewDeals.length} ｜ 殺價 ${allNegotiate.length} ｜ 手動 ${allUncertain.length} ｜ 待查 ${needVerifyRelevant.length}\n\n`;
md += `**規則：** 好貨 = 新品 ≤30% 或 二手 ≤70% · 殺價 = $3K+ 且 ≤90% 二手 · 手動 = ≤70% 新品但二手樣本不足\n\n`;

const showDeals = (list, emoji, title, hint) => {
  if (list.length === 0) return '';
  let s = `## ${emoji} ${title}（${list.length}）\n\n`;
  if (hint) s += `> ${hint}\n\n`;
  s += `| 品項 | 價格 | 比基準 | 折數 | 狀態 | 上架 |  |\n`;
  s += `|------|------|--------|------|------|------|--|\n`;
  list.forEach(d => {
    const v = d.verified || {};
    const basis = v.newPrice ? `新$${v.newPrice}` : (v.secondhand ? `二手$${v.secondhand}` : '?');
    const disc = d.vsNew ? `${d.vsNew}% new` : (d.vsSecondhand ? `${d.vsSecondhand}% 二手` : '?');
    const warn = d.isReseller ? ' ⚠' : '';
    const cat = d.category ? `[${d.category}] ` : '';
    s += `| ${cat}${escPipe(d.title.slice(0, 45))}${warn} | **${d.priceStr}** | ${basis} | ${disc} | ${d.condition} | ${d.listedAt} | [→](${d.url}) |\n`;
  });
  s += '\n';
  return s;
};

if (allNewDeals.length === 0 && allNegotiate.length === 0 && allUncertain.length === 0 && needVerifyRelevant.length === 0) {
  md += `## 本輪空 \n\n沒有新候選（已看過 ${skippedDup} 筆）。持續巡邏中。\n`;
} else {
  md += showDeals(allNewDeals, '🟢', '好貨', '通過自動門檻，可直接買');
  md += showDeals(allNegotiate, '🟡', '殺價', '價格已合理但還能再殺，看你殺得到嗎');
  md += showDeals(allUncertain, '🟠', '手動判斷', '二手樣本不足或邊緣值，手動評估');
  if (needVerifyRelevant.length > 0) {
    md += `<details><summary>⏳ 待查價 ${needVerifyRelevant.length} 筆（subagent 還沒跑完）</summary>\n\n`;
    md += `| 品項 | 價格 | 上架 |  |\n`;
    md += `|------|------|------|--|\n`;
    needVerifyRelevant.slice(0, 50).forEach(d => {
      const cat = d.category ? `[${d.category}] ` : '';
      md += `| ${cat}${escPipe(d.title.slice(0, 50))} | ${d.priceStr} | ${d.listedAt} | [→](${d.url}) |\n`;
    });
    if (needVerifyRelevant.length > 50) md += `\n_（顯示前 50 筆，完整見 \`need_verify.json\`）_\n`;
    md += `\n</details>\n\n`;
  }
}
md += `\n---\n\n`;
md += `## 系統\n\n`;
md += `- 每輪 [carousell_workflow.md](carousell_workflow.md) 8 步驟\n`;
md += `- 新方向觀察 → [suggestions.md](suggestions.md)\n`;
md += `- 賣家黑名單 / 信任名單 → [sellers.json](sellers.json)\n`;
md += `- 已驗證個別品價 → [verified_prices.json](verified_prices.json)\n`;
fs.writeFileSync('README.md', md);

// === 更新 deals.html ===
let html = `<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Carousell 二手好物清單</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;max-width:960px;margin:0 auto}\nh1{font-size:1.6rem;margin-bottom:6px;color:#fff}\n.sub{color:#888;margin-bottom:20px;font-size:.85rem}\ntable{width:100%;border-collapse:collapse;margin-bottom:30px}\nth{text-align:left;padding:10px 6px;border-bottom:2px solid #333;color:#888;font-size:.75rem;text-transform:uppercase}\ntd{padding:8px 6px;border-bottom:1px solid #1a1a1a;font-size:.85rem}\ntr:hover{background:#111}\n.p{color:#e8364e;font-weight:700}\n.d{color:#4ade80;font-weight:700}\na{color:#60a5fa;text-decoration:none}\na:hover{text-decoration:underline}\n.t{font-size:.8rem;color:#666}\n</style>\n</head>\n<body>\n<h1>Carousell 二手好物清單</h1>\n<p class="sub">新品≤30% or 二手行情≤70% | 3天內 | 停產品用二手行情 | ${now}</p>\n<table>\n<tr><th>品項</th><th>價格</th><th>比較基準</th><th>折數</th><th>狀態</th><th>上架</th><th></th></tr>\n`;
[...allNewDeals, ...allNegotiate, ...allUncertain].forEach(d => {
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
