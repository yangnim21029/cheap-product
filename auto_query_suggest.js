// 自動 query 建議：根據 verified_prices 已驗證 deal 的品牌，
// 比對 raw_results 雜訊裡是否有同品牌商品 ≥2 次出現但不在 QUERIES
const fs = require('fs');

// 已驗證 deal（非 skip）的品牌關鍵字 — 從 note 抽出來的品牌名
// 維護方式：每次有新 deal 進清單時，把品牌加進這個 set
const KNOWN_DEAL_BRANDS = new Set([
  // 耳機 / 喇叭
  'marshall', 'sony wh', 'sony xm', 'b&o', 'beoplay', 'bose', 'audio-technica', 'sennheiser',
  'edifier', 'shokz', 'jbl', 'akg', 'philips tah', 'huawei freeclip', 'apple airpods',
  // 相機 / 攝影
  'fujifilm', 'fuji x-', 'fuji xf', 'sony a6', 'sony a7', 'canon r', 'nikon z', 'leica',
  'zeiss', 'sigma', 'tamron', 'lomo', 'dji', 'gopro', 'insta360', 'panasonic g',
  // 投影機 / 影音
  'epson ef', 'xgimi', 'benq gv', 'onkyo',
  // 咖啡器具
  'fellow opus', '1zpresso', 'wilfa', 'acaia', 'comandante', 'hario', 'bodum', 'brewista',
  '飛馬', 'snow peak',
  // MIDI / 樂器
  'akai mpk', 'arturia keylab', 'novation launchkey',
  // 居家
  'marimekko', 'wedgwood', 'iittala',
  // 其他
  'apple watch s', 'honeywell hpa', 'honeywell hap', 'beurer', '未來實驗室',
]);

// 當前 QUERIES（從 scrape.js 同步）
const CURRENT_QUERIES = [
  'apple watch', '空氣清淨機', '投影機', '喇叭', '音響', '立燈', '空氣循環扇',
  '拍立得', '相印機', 'VR', '露營', '地毯', '優格機', '磨豆機', '手沖', '除濕機',
  'dji', 'insta360',
];
const CURRENT_CATEGORIES = [
  '家具居家', '美妝保養', '精品', '手機平板', '家電影音', '音響耳機',
  '相機攝影', '收藏品', '音樂媒體',
];

// 讀 raw_results
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));

// 過濾 3 天內 + 高金額
const isRecent = t => /^(minute|\d+ minutes?|1 hour|\d+ hours?|1 day|2 days)/i.test(t);
const recent = raw.filter(r => isRecent(r.timeAgo) && parseInt((r.price||'').replace(/[^0-9]/g,'')) >= 2000);

// 計算每個品牌在 recent 雜訊中的出現次數
const brandCount = {};
recent.forEach(r => {
  const title = (r.title || '').toLowerCase();
  KNOWN_DEAL_BRANDS.forEach(brand => {
    if (title.includes(brand.toLowerCase())) {
      brandCount[brand] = (brandCount[brand] || 0) + 1;
    }
  });
});

// 排除已在 QUERIES / CATEGORIES 的品牌（已有對應 query 抓）
const inQueries = brand => {
  const b = brand.toLowerCase();
  return CURRENT_QUERIES.some(q => b.includes(q.toLowerCase()) || q.toLowerCase().includes(b));
};

// 排除明顯被分類頁覆蓋的（fujifilm/leica/sony a/canon r/nikon z 等都在 photography-6 抓）
const inPhotographyCategory = ['fujifilm', 'fuji', 'sony a6', 'sony a7', 'canon r', 'nikon z', 'leica', 'zeiss', 'sigma', 'tamron', 'lomo'];
const inAudioCategory = ['marshall', 'b&o', 'beoplay', 'bose', 'audio-technica', 'sennheiser', 'edifier', 'shokz', 'jbl', 'akg', 'philips tah', 'sony wh', 'sony xm'];

const suggestions = Object.entries(brandCount)
  .filter(([brand, count]) => count >= 2)
  .filter(([brand, _]) => !inQueries(brand))
  .filter(([brand, _]) => !inPhotographyCategory.some(p => brand.toLowerCase().startsWith(p)))
  .filter(([brand, _]) => !inAudioCategory.some(p => brand.toLowerCase().startsWith(p)))
  .sort((a, b) => b[1] - a[1]);

// 輸出
if (suggestions.length === 0) {
  console.log('=== auto_query_suggest ===');
  console.log('本輪無建議：曾進過 deal 的品牌都沒在當前 raw_results 雜訊中重複出現');
} else {
  console.log('=== auto_query_suggest ===');
  console.log(`本輪 raw_results 雜訊中出現過去 deal 同品牌 ≥2 次但不在 QUERIES 的：\n`);
  suggestions.forEach(([brand, count]) => {
    console.log(`  ${brand} (${count} 筆)`);
    // 列出實際 listing
    recent.filter(r => (r.title||'').toLowerCase().includes(brand.toLowerCase()))
      .slice(0, 3).forEach(r => {
        console.log(`    - ${r.priceStr || r.price} | ${(r.title||'').substring(0, 60)}`);
      });
  });
  console.log('\n建議：把上面品牌加進 scrape.js QUERIES，下輪自動追蹤。');
}
