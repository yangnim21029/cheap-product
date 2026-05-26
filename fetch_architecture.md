# Carousell 抓取流程設計

## 現況盤點（混亂的地方）

| 工具 | 用途 | 問題 |
|---|---|---|
| `scrape.js` | 全 sweep (QUERIES + CATEGORIES, ~5 min) | 跑時獨佔 chromium，其他工具都得等 |
| `scrape-free.js` | 免費物品 sweep | 同 — 也獨佔 chromium |
| `fetch-listing.js` (新) | 單筆 pid 詳情 | 同上獨佔；剛建沒測完 |
| `curl` | 想抓單筆 HTML | Cloudflare 直接擋 403 |
| `WebFetch` | 想抓單筆 HTML | 同上擋 |
| chrome-devtools MCP | 想用真實 Chrome profile | 跟 scrape.js 互鎖（同 profile 衝突）|
| `/tmp/*-probe.js` | ad-hoc 探路 | 用完即丟，沒納入流程 |

問題核心：**所有抓取都走 Playwright，同時只能跑一個**；scrape 跑 8-12 分鐘期間其他驗證/探路都卡住。

## 分層架構（建議）

### Layer 0：來源優先順序

從快到慢，先試本地 cache，再上網：

1. **`verified_prices.json`** — 行情已驗，24h 內可信
2. **`raw_results.json`** — 全 sweep 結果，30 分鐘內可信
3. **`__NEXT_DATA__` JSON in HTML** — Carousell SPA 把 listing data 嵌在 HTML 裡（含 createdAt / price / status），比 DOM text 準
4. **DOM scraping** — JSON 抓不到時 fallback
5. **Subagent web search** — 行情查 momo/PChome 比 二手 listing 多

### Layer 1：併發控制

所有 Playwright 共用 `/tmp/carousell.lock`：
- scrape.js 啟動前 acquire lock，結束 release
- fetch-listing.js / scrape-free.js / probe 同樣
- 想抓的工具看到 lock 在就排隊或 fail-fast

未來可以加排程 queue（一個檔 `fetch_queue.json`，daemon 處理）— 但暫時 lock + fail-fast 就夠。

### Layer 2：三種操作明確切開

| 操作 | 工具 | 何時用 | 輸出 |
|---|---|---|---|
| **全 sweep** | `scrape.js` | 每 30 分 cron / `/loop 40m` | `raw_results.json`（500-2000 筆）|
| **單筆查詢** | `fetch-listing.js <pid>` | watchlist 確認 / User 問特定商品 / 重新校時 | `listing_probe.json`（單筆完整 JSON）|
| **品類探路** | `/tmp/*-probe.js` | 加新 query/cat 前的可行性測試 | console 印，不存檔 |

### Layer 3：輸出契約

| 檔 | 寫入者 | 讀取者 | TTL |
|---|---|---|---|
| `raw_results.json` | scrape.js | process.js | 每輪覆蓋 |
| `listing_probe.json` | fetch-listing.js | 手動讀 + process 補 timeAgo | 每次覆蓋 |
| `verified_prices.json` | subagent + 手動 | process.js | 24h（行情變慢）|
| `pending_review.json` | process.js | mark_seen.js | User 決策後 |
| `seen_ids.json` | mark_seen.js / process.js | scrape next round 去重 | 永久 |
| `raw_free.json` | scrape-free.js | process-free.js | 早晚各一次 |
| `free_pending.json` | process-free.js | render-free.js | 同 |
| `free_items.md` | render-free.js | User | 早晚各一次 |

### Layer 4：反偵測

- **Cookies** — 已存 `cookies.json`（過期要重抓）
- **User-Agent** — 固定 Chrome 125 macOS（之後加 rotation）
- **Rate limit** — scrape.js query 間 5-10 秒
- **Retry** — 沒做（500/429 直接 fail）— 該加
- **Cloudflare bypass** — Playwright 自動處理 challenge（curl 失敗）

## 一致性問題：bump 跟 timeAgo

賣家「重新刊登」（bump）把舊單推回首頁，timeAgo 會從「10 個月前」變「5 小時前」。**搜尋頁 vs 商品詳情頁的 timeAgo 可能差很大**：
- 搜尋頁顯示 = 最近 bump 時間（賣家 marketing 角度）
- 詳情頁 `__NEXT_DATA__.createdAt` = 真實原始上架時間（DB 角度）

`fetch-listing.js` 該抓 `__NEXT_DATA__.createdAt`，這才是真實上架；scrape.js 在搜尋頁拿到的 timeAgo 含 bump 噪音，但「最近 bump」對找好貨也有意義（賣家在動）。

兩個都記、用途分開：
- `scrape.js` 寫 `timeAgo` (搜尋頁) → 排序用
- `fetch-listing.js` 寫 `createdAt` (詳情頁) → 真實年資、判斷死貨

## 接下來該做

1. ✅ `fetch-listing.js` v1 已建（讀 `__NEXT_DATA__` + DOM fallback）
2. ⏳ 跑 v1 驗 3 件 watchlist 真實 createdAt
3. ⏳ chromium lock 機制（避免互鎖）
4. ⏳ scrape.js 加 retry + 500 fail 重試 3 次
5. ⏳ User-Agent rotation
