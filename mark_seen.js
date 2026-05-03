const fs = require('fs');

const SEEN_FILE = 'seen_ids.json';
let seen = [];
try { seen = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')); } catch {}

const raw = JSON.parse(fs.readFileSync('raw_results.json', 'utf8'));
const allIds = raw.map(i => i.url?.match(/\/p\/(\d+)/)?.[1]).filter(Boolean);
const newSeen = [...new Set([...seen, ...allIds])];

fs.writeFileSync(SEEN_FILE, JSON.stringify(newSeen, null, 2));
console.log(`已標記: ${seen.length} → ${newSeen.length}（+${newSeen.length - seen.length} 筆）`);
