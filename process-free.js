// 從 raw_free.json 出 free_items.md
// 流程: 負向 filter → 共用 seen_ids 去重 → 輸出待 subagent 估值清單 → review-free.js 接手寫 md
//
// 設計: 不寫死品類白名單, 不自動估值
// 負向: 過期/破/壞/碎/樣品/試用/小張/貼紙/體驗/二代/兒童畫 etc.
// 輸出 free_pending.json (供 subagent 估值用) + free_items.md (尾端 placeholder, 待 review 寫入)

const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('raw_free.json', 'utf8'));
let seen = [];
try { seen = JSON.parse(fs.readFileSync('seen_ids.json', 'utf8')); } catch {}
const seenSet = new Set(seen);

// 負向: 純贈品 (要消費才能拿)、過期、損壞、niche小物、徵求
const NEG_RE = /贈品.*滿額|滿額禮|滿\d+贈|消費滿|加購|加價購|搭購|附贈|賣場任一購物贈送|過期|破損|壞掉|壞了|碎|樣品|試用|體驗|貼紙|小張|名片|傳單|宣傳|目錄|^DM\b|二代|代為|代發|預購|徵|徵收|徵求|找尋|尋找|需要|想要|急需|請填|抽獎|coupon|優惠券|折價券|測試|test|教材|講義|筆記|考古題|🚨\s*收購|^收購|回收|PTCG|寶可夢卡|遊戲王卡|^chocolate$|效期已過|過期|1:64|小車|路跑|髮帶|限量頭帶|絲襪|未來日記/i;

const SHORT_TITLE_LIMIT = 5;

const filtered = raw.filter(item => {
  if (seenSet.has(item.pid)) return false;
  if (!item.title || item.title.length < SHORT_TITLE_LIMIT) return false;
  if (NEG_RE.test(item.title)) return false;
  return true;
});

console.log(`原始 ${raw.length} → 過濾後 ${filtered.length} (已看 ${raw.length - filtered.length - raw.filter(r => NEG_RE.test(r.title || '')).length}, 負向關鍵字 ${raw.filter(r => NEG_RE.test(r.title || '')).length})`);

fs.writeFileSync('free_pending.json', JSON.stringify(filtered, null, 2));
console.log('寫入 free_pending.json (供 subagent 估值)');
console.log('下一步: 跑 subagent 估值 + 寫 free_items.md (≥NT$1,500 cap 8 筆)');
