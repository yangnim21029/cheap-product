const fs = require('fs');

const SEEN_FILE = 'state/seen_ids.json';
const PENDING_FILE = 'state/pending_review.json';

let seen = [];
try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch {}

let pending = { newDeals: [], negotiate: [], uncertain: [] };
try { pending = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')); } catch {}

// watchlist items (timeAgo='(直接掃描)' 或 watchlist:true) 不 mark_seen, 留在 pending
const isWatchlist = (d) => /直接掃描/.test(d.timeAgo || '') || d.watchlist === true;
const all = [...(pending.newDeals || []), ...(pending.negotiate || []), ...(pending.uncertain || [])];
const watchlistItems = all.filter(isWatchlist);
const pendingIds = all.filter(d => !isWatchlist(d)).map(d => d.pid).filter(Boolean);

// 也收 raw_results 裡的 ID（避免重複出現）, 排除 watchlist pids
const watchlistPids = new Set(watchlistItems.map(d => d.pid).filter(Boolean));
const raw = JSON.parse(fs.readFileSync('state/raw_results.json', 'utf8'));
const rawIds = raw.map(i => i.url?.match(/\/p\/(\d+)/)?.[1]).filter(Boolean).filter(pid => !watchlistPids.has(pid));

const newSeen = [...new Set([...seen, ...pendingIds, ...rawIds])];

fs.writeFileSync(SEEN_FILE, JSON.stringify(newSeen, null, 2));

// 重建 pending: 只留 watchlist
const newPending = { newDeals: [], negotiate: [], uncertain: [] };
for (const item of watchlistItems) {
  const bucket = pending.newDeals?.includes(item) ? 'newDeals'
    : pending.negotiate?.includes(item) ? 'negotiate' : 'uncertain';
  newPending[bucket].push(item);
}
fs.writeFileSync(PENDING_FILE, JSON.stringify(newPending, null, 2));

console.log(`已標記: ${seen.length} → ${newSeen.length}（+${newSeen.length - seen.length} 筆）`);
console.log(`pending_review: ${pendingIds.length} 筆移至 seen, watchlist 保留 ${watchlistItems.length} 筆`);
