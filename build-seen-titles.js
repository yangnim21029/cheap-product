// 從 seen_ids + verified_prices 抽品牌+型號 keyword, 累積出現次數寫 seen_title_freq.json
// 用於 process.js 候選階段過濾「同型號反覆出現」的商品

const fs = require('fs');

const seen = JSON.parse(fs.readFileSync('seen_ids.json', 'utf8'));
const vp = JSON.parse(fs.readFileSync('verified_prices.json', 'utf8'));

// 品牌+型號 regex (粗顆粒，抓出大宗常見型號)
const PATTERNS = [
  // Apple
  /iPhone\s*(\d{1,2}(?:\s*Pro(?:\s*Max)?|\s*mini|\s*Plus)?)/i,
  /iPad\s*(Pro|Air|mini)?\s*(\d{1,2})?/i,
  /AirPods\s*(Pro\s*\d?|Max|\d)/i,
  /MacBook\s*(Air|Pro)\s*(M[1-4]|2020|202[1-6])?/i,
  /Apple\s*Watch\s*(SE\d?|S\d+|Ultra\d?)/i,
  /Mac\s*mini\s*(M[1-4])?/i,
  // Nintendo
  /Switch\s*(OLED|Lite|2)?/i,
  /New\s*3DS\s*XL/i,
  // Sony
  /Sony\s*(a7\s*m?\d|a\d{2,3})/i,
  /PS\s*[45](\s*Slim|\s*Pro)?/i,
  /WH-?\d{4}/i,
  // GPU
  /RTX\s*\d{4}(?:\s*Ti|\s*Super)?/i,
  /GTX\s*\d{4}(?:\s*Ti|\s*Super)?/i,
  /RX\s*\d{4}(?:\s*XT)?/i,
  // 相機
  /Fujifilm\s*X-?[ETH]\d/i,
  /Canon\s*(EOS\s*R\d?|EOS\s*\d{1,2}D|IXUS\s*\d+|G\d+\s*X?)/i,
  /Nikon\s*(Z\s*\d|D\d{3,4}|FM\d)/i,
  /GoPro\s*(Hero\s*)?\d{1,2}/i,
  /Insta360\s*(X\d|Ace|GO\s*\d)/i,
  /DJI\s*(Pocket\s*\d|Osmo|Mini\s*\d|Neo|RS\s*\d|RoboMaster)/i,
  // 周邊
  /Marshall\s*(Acton|Stockwell|Emberton|Willen|Minor)\s*(I+|\d)?/i,
  /BOSE\s*(QC|QuietComfort|SoundLink)\s*(\d+|Mini\s*\d|Ultra)?/i,
  /Shokz\s*(OpenFit|OpenRun|OpenDots)\s*(Pro|ONE|\d)?/i,
  /Dyson\s*(SV\d+|V\d+|HD\d+)/i,
  // 拍立得
  /Instax\s*(Mini|Wide|Square)?\s*(EVO|\d{1,3})?/i,
  /Leica\s*Sofort/i,
  // 平板/筆電 others
  /Galaxy\s*(Tab\s*[SA]\d+\+?|S\d{1,2})/i,
  /Surface\s*(Go|Pro|Laptop)\s*\d/i,
  /Zenbook|Vivobook|ROG\s*(Strix|Phone|Falchion)/i,
  /Thinkpad\s*([XTPL]\d{2,3}|E\d{2}|T\d{2}|P\d{2})?/i,
  // 樂器/audio gear
  /Fender\s*(Strat|Tele|Jazz|P-?Bass)/i,
];

const titleKeywords = (title) => {
  const keys = new Set();
  for (const re of PATTERNS) {
    const m = title.match(re);
    if (m) {
      keys.add(m[0].toLowerCase().replace(/\s+/g, ' ').trim());
    }
  }
  return [...keys];
};

const seenSet = new Set(seen);
const freq = {};
let scanned = 0;

for (const pid of seenSet) {
  const v = vp[pid];
  if (!v || !v.note) continue;
  scanned++;
  // note 第一段通常含品名 (e.g. "Apple Watch S7 Nike 45mm ...")
  const keys = titleKeywords(v.note);
  for (const k of keys) freq[k] = (freq[k] || 0) + 1;
}

// 排序顯示
const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

fs.writeFileSync('seen_title_freq.json', JSON.stringify(freq, null, 2));

console.log(`掃 ${scanned} 筆 verified+seen, 抽出 ${Object.keys(freq).length} 個 keyword`);
console.log();
console.log('Top 30 重複型號 (≥3 次):');
sorted.filter(([_, n]) => n >= 3).slice(0, 30).forEach(([k, n]) => console.log(`  ${n.toString().padStart(3)}× ${k}`));
