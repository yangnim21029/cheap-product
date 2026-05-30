// 個人賣家手機/平板獨立 table
// 從 raw_results 篩手機相關 listings, 排除店家+批量+本輪 ≥5 筆的高頻賣家 (heuristic)
// 輸出: personal_phones.md (markdown table)

const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('state/raw_results.json', 'utf8'));
const sellersData = JSON.parse(fs.readFileSync('references/sellers.json', 'utf8'));

const BANNED = new Set([
  ...sellersData.shops.accounts.map(a => a.id),
  ...(sellersData.overpriced?.accounts || []).map(a => a.id),
]);
const RESELLERS = new Set(sellersData.resellers.accounts.map(a => a.id));

const PHONE_KW = /iPhone|iPad|Samsung\s+Galaxy|Galaxy\s+(S\d|Note|Z|Tab|A\d)|Pixel|Xiaomi|小米手機|realme|OPPO|Sony\s+Xperia|Nokia|HUAWEI|HTC\s+(U|Desire)|ROG\s+Phone|red\s*magic|nubia|Vivo/i;
const PHONE_CATEGORIES = new Set(['iPad', '手機平板']);

const candidates = raw.filter(item => {
  const isPhone = PHONE_KW.test(item.title) || PHONE_CATEGORIES.has(item.category);
  return isPhone;
});

// 統計本輪每賣家手機相關 listings 數
const sellerCount = {};
candidates.forEach(c => { sellerCount[c.seller] = (sellerCount[c.seller] || 0) + 1; });

// 過濾條件：
// - 不在 BANNED (shops + overpriced)
// - 不在 RESELLERS
// - 本輪手機相關 ≤4 筆 (≥5 筆視為高頻店家)
// - 賣家名不含明顯店家關鍵字
const SHOP_NAME_RE = /\b(3c|3C|phone|shop|店|通訊|實體|門市|recycle|elba|digital|二手3c)\b|\.(shop|3c|store)$/i;

const personal = candidates.filter(item => {
  if (BANNED.has(item.seller)) return false;
  if (RESELLERS.has(item.seller)) return false;
  if (sellerCount[item.seller] >= 5) return false;
  if (SHOP_NAME_RE.test(item.seller)) return false;
  return true;
});

// 排序: timeAgo 新到舊 (minutes < hours < days)
const timeAgoToMinutes = (ta) => {
  if (!ta) return 999999;
  const m = ta.match(/(\d+)\s*(minute|hour|day)/);
  if (!m) return ta.includes('just now') ? 0 : (ta.includes('yesterday') ? 1440 : 999999);
  const n = parseInt(m[1]);
  if (m[2] === 'minute') return n;
  if (m[2] === 'hour') return n * 60;
  if (m[2] === 'day') return n * 1440;
  return 999999;
};
personal.sort((a, b) => timeAgoToMinutes(a.timeAgo) - timeAgoToMinutes(b.timeAgo));

// 輸出 markdown
const today = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

let md = `# 個人賣家手機/平板\n\n`;
md += `> 更新時間 ${today} · 共 ${personal.length} 筆 (從 ${candidates.length} 筆手機相關剔除店家/批量/高頻賣家)\n\n`;
md += `**過濾規則：** 排除 sellers.shops + overpriced + resellers + 本輪 ≥5 筆同賣家 + 名字含 shop/3c/通訊/實體 etc.\n\n`;
md += `| 品項 | 價格 | 賣家 (本輪筆數) | 上架 |  |\n|------|------|------|------|--|\n`;
for (const p of personal) {
  const title = (p.title || '').slice(0, 50).replace(/\|/g, '/');
  const count = sellerCount[p.seller] > 1 ? `(${sellerCount[p.seller]})` : '';
  // raw_results.json 的 price 已是 "NT$X" 字串
  const priceDisplay = typeof p.price === 'string' && p.price.startsWith('NT$') ? p.price : `NT$${p.price}`;
  md += `| [${p.category}] ${title} | **${priceDisplay}** | ${p.seller} ${count} | ${p.timeAgo} | [→](${p.url}) |\n`;
}

fs.writeFileSync('outputs/personal_phones.md', md);
console.log(`寫入 ${personal.length} 筆個人賣家手機/平板 → personal_phones.md`);
console.log(`(原候選 ${candidates.length}, 過濾掉 ${candidates.length - personal.length})`);
