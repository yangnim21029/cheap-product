// Chromium 併發控制 — 任何 Playwright 腳本啟動前 acquire, 結束 release
// 用法:
//   const lock = require('./chromium-lock');
//   await lock.acquire('scrape.js'); // throws if locked
//   try { /* playwright work */ } finally { lock.release(); }

const fs = require('fs');
const path = require('path');

const LOCK = '/tmp/carousell-chromium.lock';

function isPidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function acquire(owner = 'unknown') {
  if (fs.existsSync(LOCK)) {
    const data = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
    if (isPidAlive(data.pid)) {
      const ageMin = ((Date.now() - data.startedAt) / 60000).toFixed(1);
      throw new Error(`chromium 已被 ${data.owner} (pid ${data.pid}) 佔用 ${ageMin} 分鐘 — 等它結束或 kill -9 ${data.pid}`);
    }
    // stale lock, remove
    console.warn(`[lock] 移除 stale lock from ${data.owner} pid ${data.pid}`);
    fs.unlinkSync(LOCK);
  }
  fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, owner, startedAt: Date.now() }, null, 2));
  console.log(`[lock] acquired by ${owner} (pid ${process.pid})`);
  // 程式結束自動 release
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('SIGTERM', () => { release(); process.exit(143); });
}

function release() {
  try {
    if (fs.existsSync(LOCK)) {
      const data = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
      if (data.pid === process.pid) fs.unlinkSync(LOCK);
    }
  } catch {}
}

module.exports = { acquire, release };
