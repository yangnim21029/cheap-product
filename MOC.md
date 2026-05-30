# Map of Concept (MOC)

按 function 分類的檔案索引。新人從這裡找「哪個檔做什麼」。原則性說明見 [README.md](README.md)，巡邏 SOP 見 [carousell_workflow.md](carousell_workflow.md)。

## 1. Scrape — 抓 raw

| 檔 | 做什麼 |
|---|---|
| [scrape.js](scripts/scrape.js) | 主爬蟲。Playwright headless Chromium 走 67 個搜尋 query + 13 個分類頁，抓 3-7 天內 listing 寫進 `raw_results.json` |
| [scrape-free.js](scripts/scrape-free.js) | 免費物品專用爬蟲（categories/free-items-2158），早晚各一次，寫進 `raw_free.json` |
| [scrape_dehumid.js](scripts/scrape_dehumid.js) | 除濕機品牌+型號專用爬，寫進 `dehumid_results.json` |
| [chromium-lock.js](scripts/chromium-lock.js) | `/tmp/carousell-chromium.lock` 互斥鎖，避免兩個 scrape 同時跑撞 Chromium |
| [cookies.json](references/cookies.json) | Carousell 登入 cookie（手動匯出，過期重抓） |

## 2. Process — 分桶

| 檔 | 做什麼 |
|---|---|
| [process.js](scripts/process.js) | 主分流。讀 `raw_results.json` + `verified_prices.json` + `sellers.json` → 分桶（好貨/殺價/手動/待查）→ 輸出 `DEALS.md` + `deals.html` + `need_verify.json` |
| [process-free.js](scripts/process-free.js) | 免費物品分流。負面 regex 過濾「滿額禮/附贈/早期收藏/PTCG/收購」等噪音 |
| [render-free.js](scripts/render-free.js) | 免費物品 render `free_items.md` |

## 3. Verify — 驗價

| 檔 | 做什麼 |
|---|---|
| [biggo-price.js](scripts/biggo-price.js) | BigGo URL 構造助手。`node biggo-price.js "Sony WH-1000XM5"` 印出 BigGo URL + subagent prompt 範本 |
| [fetch-listing.js](scripts/fetch-listing.js) | 單 pid Playwright 抓 `__NEXT_DATA__` JSON + DOM fallback，用來反查真實 `createdAt`（bump time ≠ 真上架時間） |
| [extract-personal-phones.js](scripts/extract-personal-phones.js) | 從 `raw_results.json` 抽個人賣家手機品（非二手店） |
| [profile_check.js](scripts/profile_check.js) | 看賣家 profile 最近上架，判仿冒/批量店家 |

## 4. Mark / State

| 檔 | 做什麼 |
|---|---|
| [mark_seen.js](scripts/mark_seen.js) | 把 `pending_review.json` 的 pid 加進 `seen_ids.json`（保留 watchlist），清空 pending |
| [build-seen-titles.js](scripts/build-seen-titles.js) | 從 seen 反查 title 頻率寫進 `seen_title_freq.json`，給 process.js 同型號降權用 |
| [auto_query_suggest.js](scripts/auto_query_suggest.js) | 從 raw 抽新 query 候選 |

## 5. State files (JSON)

| 檔 | 內容 |
|---|---|
| `raw_results.json` | 當輪 scrape 結果（2000+ 件） |
| `seen_ids.json` | 累積已看 pid（~13000+） |
| `verified_prices.json` | subagent 驗過的價格 + verdict + skip 標記 |
| `pending_review.json` | 等 User 決定的 newDeals/negotiate/uncertain |
| `need_verify.json` | 等 subagent 驗的（relevant only，noise 過濾掉） |
| `query_stats.json` | 每個 query 連續 0 收輪數，自動建議暫停 |
| `seen_title_freq.json` | title 關鍵字頻率，用於同型號降權 |
| `market_prices.json` | 通用品類行情表（非 pid 特定） |
| `taiwan-prices-2026.json` | 2026 台灣新品價格快照 |
| `sellers.json` | 賣家黑/白名單（shops / overpriced / trusted） |

## 6. Output

| 檔 | 內容 |
|---|---|
| `DEALS.md` | process.js 動態輸出，同步 Gist 給 User 看 |
| `deals.html` | dark mode HTML 版 |
| `free_items.md` | 免費物品清單 |
| `carousell_wishlist_*.csv` | CSV 匯出 |

## 7. Docs

| 檔 | 內容 |
|---|---|
| [README.md](README.md) | 系統原則性說明（為何這樣設計） |
| [MOC.md](MOC.md) | 本檔（檔案/function 地圖） |
| [carousell_workflow.md](carousell_workflow.md) | 每輪 SOP + 雜訊處理規則 + BigGo 流程 |
| [fetch_architecture.md](fetch_architecture.md) | 抓取架構（Layer 0-4 + lock + retry + UA rotation） |
| [query_log.md](query_log.md) | query 增刪歷史 |
| [suggestions.md](suggestions.md) | 待觀察方向 |
| [personal_phones.md](personal_phones.md) | 個人賣家手機品池 |
| [dehumidifier_18L_22L.md](dehumidifier_18L_22L.md) | 除濕機品類筆記 |

## 8. 平行子系統

| 子系統 | 主流程 |
|---|---|
| **Main patrol** | scrape.js → process.js → mark_seen.js |
| **Free items** | scrape-free.js → process-free.js → render-free.js |
| **Dehumid hunt** | scrape_dehumid.js → 寫 `dehumid_18L_plus.json` |
| **Listing probe** | fetch-listing.js → 反查真實 createdAt |
| **Profile check** | profile_check.js / profile_check_27.js → 判賣家性質 |
