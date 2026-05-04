const fs = require('fs');

const SEEN_FILE = 'seen_ids.json';
const PENDING_FILE = 'pending_review.json';

let seen = [];
try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch {}

let pending = { newDeals: [], negotiate: [], uncertain: [] };
try { pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')); } catch {}

// 從 pending review 收所有 ID
const pendingIds = [
  ...(pending.newDeals || []),
  ...(pending.negotiate || []),
  ...(pending.uncertain || []),
].map(d => d.pid).filter(Boolean);

// 也收 raw_results 裡的 ID（避免重複出現）
const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const rawIds = raw.map(i => i.url?.match(/\/p\/(\d+)/)?.[1]).filter(Boolean);

const newSeen = [...new Set([...seen, ...pendingIds, ...rawIds])];

fs.writeFileSync(SEEN_FILE, JSON.stringify(newSeen, null, 2));
fs.writeFileSync(PENDING_FILE, JSON.stringify({ newDeals: [], negotiate: [], uncertain: [] }, null, 2));

console.log(`已標記: ${seen.length} → ${newSeen.length}（+${newSeen.length - seen.length} 筆）`);
console.log(`pending_review 已清空（${pendingIds.length} 筆移至 seen）`);
