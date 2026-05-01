const fs = require('fs');

const SHOPS = [
  'change12336', 'elba_digital888', 'phone_recycle', 'chan_850725',
  'chineming03', 'phoneshop', 'guoguo.shop', 'joycely.yang',
  'wei3cphone', 'kp3c.', 'apple3054'
];

const RESELLERS = ['lover.perfume', 'margaret.sshop', 'm1413', 'bravedeer.829ec6'];

const SKIP_WORDS = ['配件', '電源線', '濾網', '維修', '遙控器', '錶帶', '底座', '收納架', '吸頭', '馬達', '電池', '滾筒', '刷頭', '硬管', '防滑墊', '殼', '保護', '租借', '寫真', '鬼滅', '禮盒組', '蠟燭', '沐浴', '護手霜', '香水瓶', '香水筆', '隨行杯', '吸管杯'];

const MARKET = {
  'apple watch se1': { newPrice: 7900, label: 'AW SE1' },
  'apple watch se2': { newPrice: 7900, label: 'AW SE2' },
  'apple watch se': { newPrice: 7900, label: 'AW SE' },
  'apple watch s6': { newPrice: 12900, secondhand: 4500, label: 'AW S6 (停產)' },
  'apple watch s7': { newPrice: 12900, secondhand: 5500, label: 'AW S7 (停產)' },
  'apple watch s8': { newPrice: 12900, label: 'AW S8' },
  'apple watch series 8': { newPrice: 12900, label: 'AW S8' },
  'samsung galaxy watch 6': { newPrice: 11990, label: 'GW6 Classic' },
  'vivienne westwood 軍牌': { newPrice: 4500, label: 'VW 軍牌' },
  'vivienne westwood絲巾': { newPrice: 3500, label: 'VW 絲巾' },
  'vivienne westwood小牛皮': { newPrice: 9000, label: 'VW 皮夾' },
  'vivienne westwood 黑色': { newPrice: 12000, label: 'VW 鏈條包' },
  'momi': { newPrice: 5500, label: 'MOMI X800' },
  'osim umoby': { newPrice: 3980, label: 'OSIM uMoby' },
  'osim 護眼樂': { newPrice: 2980, label: 'OSIM 護眼樂' },
  'jo malone 30ml': { newPrice: 2950, label: 'JM 30ml' },
  'jo malone 50ml': { newPrice: 4900, label: 'JM 50ml' },
  'jo malone 100ml': { newPrice: 6800, label: 'JM 100ml' },
  'aesop eidesis': { newPrice: 7700, label: 'Aesop Eidesis' },
  'aesop hywl': { newPrice: 7700, label: 'Aesop Hywl' },
  'dior gris': { newPrice: 11000, label: 'Dior Gris Dior' },
  'lululemon pant': { newPrice: 4100, label: 'Lulu Pant' },
  'lululemon legging': { newPrice: 4100, label: 'Lulu Legging' },
  'lululemon t-shirt': { newPrice: 1900, label: 'Lulu Tee' },
  'lululemon 四件組': { newPrice: 8000, label: 'Lulu 4件組' },
  'lululemon 運動內衣': { newPrice: 1700, label: 'Lulu Bra' },
  'lululemon short': { newPrice: 2200, label: 'Lulu Short' },
  'lululemon groove': { newPrice: 3800, label: 'Lulu Groove' },
  'lululemon set': { newPrice: 4000, label: 'Lulu Set' },
  'marshall kilburn': { newPrice: 10900, label: 'Marshall Kilburn II' },
  'marshall emberton ii': { newPrice: 5999, label: 'Marshall Emberton II' },
  'marshall emberton iii': { newPrice: 6999, label: 'Marshall Emberton III' },
  'marshall minor iii': { newPrice: 4290, label: 'Marshall Minor III' },
  'marshall minor iv': { newPrice: 4490, label: 'Marshall Minor IV' },
  'marshall major iv': { newPrice: 5999, label: 'Marshall Major IV' },
  'bose soundlink home': { newPrice: 9900, label: 'Bose Home' },
  'bose qc earbuds ii': { newPrice: 8900, label: 'Bose QC II' },
  'bose qc earbuds ultra': { newPrice: 9900, label: 'Bose QC Ultra' },
  'bose soundlink flex': { newPrice: 5490, label: 'Bose Flex II' },
  'nespresso pixie': { newPrice: 4990, secondhand: 2200, label: 'Nespresso Pixie (停產)' },
  '拍立得 mini 50s': { newPrice: 5000, secondhand: 4000, label: 'Mini 50s (停產)' },
  '拍立得 sq6': { newPrice: 5490, secondhand: 4500, label: 'SQ6 (停產)' },
  '拍立得 liplay': { newPrice: 5990, label: 'LiPlay' },
  '空氣循環扇': { newPrice: 5000, label: '循環扇' },
  'hermes': { newPrice: 3600, label: 'Hermès 小香禮盒' },
  '愛馬仕大地 100ml': { newPrice: 5700, label: '大地 100ml' },
  'shiro': { newPrice: 3200, label: 'Shiro' },
  'ysl': { newPrice: 4500, label: 'YSL' },
  'malin': { newPrice: 4600, label: 'Malin+Goetz' },
};

function matchMarket(item) {
  const t = (item.title + ' ' + item.category).toLowerCase();
  for (const [key, val] of Object.entries(MARKET)) {
    if (t.includes(key.toLowerCase())) return val;
  }
  return null;
}

const isRecent = (timeAgo) => {
  if (!timeAgo) return false;
  if (timeAgo.includes('minute') || timeAgo.includes('hour')) return true;
  if (timeAgo.includes('1 day') || timeAgo.includes('2 days') || timeAgo.includes('yesterday')) return true;
  return false;
};

const parsePrice = (p) => parseInt((p || '').replace(/[^0-9]/g, '')) || 0;

const raw = JSON.parse(fs.readFileSync('/Users/rose/Documents/cheap-product/raw_results.json', 'utf8'));

const seen = new Set();
const deals = [];

raw.forEach(item => {
  if (!isRecent(item.timeAgo)) return;
  if (SHOPS.includes(item.seller) || RESELLERS.includes(item.seller)) return;
  const price = parsePrice(item.price);
  if (price === 0 || price < 300) return;
  if (seen.has(item.url)) return;
  seen.add(item.url);
  if (SKIP_WORDS.some(w => item.title.includes(w))) return;
  if (item.category === 'dyson') return;

  const mkt = matchMarket(item);
  if (!mkt) return;

  const vsNew = Math.round(price / mkt.newPrice * 100);
  const vsSecondhand = mkt.secondhand ? Math.round(price / mkt.secondhand * 100) : null;
  const pass = vsNew <= 30 || (vsSecondhand !== null && vsSecondhand <= 70);

  if (pass) {
    deals.push({
      ...item,
      newPrice: mkt.newPrice,
      secondhand: mkt.secondhand || null,
      vsNew,
      vsSecondhand,
      label: mkt.label
    });
  }
});

deals.sort((a, b) => a.vsNew - b.vsNew);

const header = 'category|seller|title|price|condition|url|new_price|vs_new|time_ago|note';
const lines = [header];
deals.forEach(d => {
  const note = d.secondhand ? `二手行情$${d.secondhand} vs${d.vsSecondhand}%` : '';
  lines.push(`${d.category}|${d.seller}|${d.title}|${d.price}|${d.condition}|${d.url}|$${d.newPrice}|${d.vsNew}%|${d.timeAgo}|${note}`);
});
fs.writeFileSync('/Users/rose/Documents/cheap-product/carousell_wishlist_20260501.csv', lines.join('\n') + '\n');

console.log(`\n=== Batch 5 好貨清單 ===`);
console.log(`原始: ${raw.length} → 3天內: ${[...new Set(raw.filter(i => isRecent(i.timeAgo)).map(i => i.url))].length} → 好貨: ${deals.length} 筆\n`);
deals.forEach((d, i) => {
  const disc = d.secondhand ? `新品${d.vsNew}% / 二手${d.vsSecondhand}%` : `新品${d.vsNew}%`;
  console.log(`${i+1}. ${d.label} — ${d.price} (${disc}) ${d.condition}`);
  console.log(`   ${d.title}`);
  console.log(`   賣家: ${d.seller} | ${d.timeAgo} | ${d.url}`);
});

// Generate README section
const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
let readme = `# Carousell 二手好物清單\n\n`;
readme += `16 queries + 13 分類 | 新品 30% 以下 or 二手 70% 以下 | 3 天內 | 注意折舊\n\n`;
readme += `> 最後更新：${now}\n\n`;
readme += `## 目前清單（Batch 5 — ${deals.length} 筆）\n\n`;
readme += `| 品項 | 價格 | 新品價 | 折數 | 狀態 | 連結 |\n`;
readme += `|------|------|--------|------|------|------|\n`;
deals.forEach(d => {
  readme += `| ${d.label} | ${d.price} | $${d.newPrice} | ${d.vsNew}% | ${d.condition} | <a href="${d.url}" target="_blank">查看</a> |\n`;
});
readme += `\n---\n\n`;
readme += `<details>\n<summary>Batch 4（已檢查 2026-05-02 01:30）— 30 筆</summary>\n\nDyson 3 筆被移除（折舊問題）\n\nApple Watch SE1 $1,500 / SE $1,700 / S8 $3,800-4,000\nSamsung Watch 6 Classic $3,600\nMarshall Kilburn II $4,000 / Minor III $1,500\nOSIM 護眼樂 $500 / uMoby 肩頸 $1,200\nVW 絲巾 $500 / 軍牌項鍊 $1,500\nJo Malone 桂花限定 $3,799\nDior Gris Dior $4,300 / Aesop Eidesis $2,800\nBose QC Earbuds II $3,000\nNespresso Pixie $1,800\nLululemon 修身褲 $1,180\n拍立得 Mini 50s $3,000\n\n</details>\n\n`;
readme += `<details>\n<summary>Batch 2-3（已檢查 2026-05-01）</summary>\n\n見 git history\n\n</details>\n\n`;
readme += `<details>\n<summary>Batch 1（已檢查 2026-05-01）</summary>\n\n見 git history\n\n</details>\n\n---\n\n## 系統說明\n\n詳見 [carousell_workflow.md](carousell_workflow.md)\n`;
fs.writeFileSync('/Users/rose/Documents/cheap-product/README.md', readme);

// Generate deals.html
let html = `<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Carousell 二手好物清單</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;padding:20px;max-width:960px;margin:0 auto}\nh1{font-size:1.6rem;margin-bottom:6px;color:#fff}\n.sub{color:#888;margin-bottom:20px;font-size:.85rem}\ntable{width:100%;border-collapse:collapse;margin-bottom:30px}\nth{text-align:left;padding:10px 6px;border-bottom:2px solid #333;color:#888;font-size:.75rem;text-transform:uppercase}\ntd{padding:8px 6px;border-bottom:1px solid #1a1a1a;font-size:.85rem}\ntr:hover{background:#111}\n.p{color:#e8364e;font-weight:700}\n.d{color:#4ade80;font-weight:700}\na{color:#60a5fa;text-decoration:none}\na:hover{text-decoration:underline}\n.t{font-size:.8rem;color:#666}\n</style>\n</head>\n<body>\n<h1>Carousell 二手好物清單</h1>\n<p class="sub">新品 30% 以下優先 | 3 天內上架 | 排除二手店行情價 | 更新：${now}</p>\n<table>\n<tr><th>品項</th><th>價格</th><th>市價</th><th>折數</th><th>狀態</th><th></th></tr>\n`;
deals.forEach(d => {
  html += `<tr><td>${d.title}</td><td class="p">${d.price}</td><td>$${d.newPrice}</td><td class="d">${d.vsNew}%</td><td class="t">${d.condition}</td><td><a href="${d.url}" target="_blank">查看</a></td></tr>\n`;
});
html += `</table>\n</body>\n</html>`;
fs.writeFileSync('/Users/rose/Documents/cheap-product/deals.html', html);

console.log(`\nCSV/README/HTML 已更新`);
