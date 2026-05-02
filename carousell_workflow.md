# Carousell 二手好物巡邏系統

讀完這份文件，新 session 的 AI 就能完整重現整套操作。

## 01. Carousell 的 URL 就是 API

Carousell 沒有公開 API，但所有篩選條件都寫在 URL 參數裡。搜尋頁的 URL 長這樣：

```
https://tw.carousell.com/search/{關鍵字}?addRecent=false&layered_condition=3%2C4%2C7&price_end=5000&price_start=500&sort_by=3
```

三個關鍵參數：`price_start/end` 控制價格、`layered_condition=3,4,7` 篩全新/近全新/輕度使用、`sort_by=3` 按最近上架排序。分類瀏覽頁不支援 `sort_by`，需要進頁面後用 JS 點 Sort → Recent。

## 02. 兩個腳本跑完整套流程

`scrape.js` 用 Playwright headless Chromium 自動開搜尋頁 + 分類頁，每頁等 5 秒讓 SPA 渲染完再抓資料，全程約 5 分鐘，輸出 `raw_results.json`。

`process.js` 讀 raw_results.json，套用行情表比價、排除店家、過濾配件和過期商品，輸出 CSV + README + deals.html。同時讀 `seen_ids.json` 做去重，使用者看過的不會再出現。

```bash
node scrape.js && node process.js
```

跑完一定要讀 scrape.js 的 log，確認每個 query 都有結果、沒有被 Carousell 擋（500 錯誤）、分類頁的 Sort → Recent 有成功。

## 03. 行情表是 category → 價格的簡單對照

`market_prices.json` 是一個 JSON object，key 就是 scrape 的 query 名稱或分類名，直接查表，不用 regex。

```json
{
  "apple watch": { "currentNew": 13500, "secondhand": 5000 },
  "marshall": { "currentNew": 6500, "secondhand": 3500 },
  "藍牙喇叭": { "currentNew": 3000, "secondhand": 1500 }
}
```

比價規則：**售價 ≤ 新品 × 30%** 或 **售價 ≤ 二手行情 × 70%**，符合任一就算好貨。

行情數字**必須用 subagent web search 查**，不能用猜的。之前猜 Bose Home 新品 $9,900，實際只有 $6,500，差了 $3,400。查完的數字附上 `source` 欄位記來源。

分類頁（家具居家、精品等）不設行情——太雜，$500 鍋碗瓢盆會被當成 5% 的好貨。分類頁只作為 scrape 來源，不進比價。

## 04. 停產品不能用原價比

Apple Watch SE1 原價 $7,900，但那是 2020 年的事。現在二手行情只有 $2,500。如果拿 $1,500 跟原價比會得到 19%（看起來超便宜），但跟二手行情比是 60%（接近市場價）。

在 `market_prices.json` 裡，停產品的 `currentNew` 填 `null`，process.js 就只會用 `secondhand` 來比。

## 05. 賣家比商品重要

`sellers.json` 把賣家分四層：

- **shops**（直接排除）：澄橘、艾爾巴、百豐悅、蒐機王、carrot_chen
- **overpriced**（直接排除）：maxwilliam（全 Bumped 賣不動）
- **resellers**（保留但標 ⚠）：lover.perfume 等批量賣家
- **trusted**（優先）：已確認的個人賣家

判斷新賣家：開 `https://tw.carousell.com/u/{seller}/`，看 Orders/Reviews/Joined/Bumped。

## 06. SKIP 詞表過濾垃圾

process.js 有 SKIP 詞表，標題包含這些詞的商品直接跳過。這個表是從實際結果裡一次次發現垃圾後累積的，包括：配件/耗材、衣服、低價雜牌、家電雜物、美妝小物等。

每輪跑完如果看到不該出現的東西，就把關鍵字加進 SKIP。

## 07. 3 天內才有意義

process.js 的 `isRecent` 只留 minutes/hours/1 day/2 days/yesterday。超過 3 天的幾乎都被搶走了。

## 08. 去重靠 seen_ids.json（絕對不能刪）

每輪 process.js 跑完會把新好貨的 product ID 寫入 `seen_ids.json`。下輪這些 ID 會被跳過，不再出現在 README。

**⚠ 絕對不要刪除 seen_ids.json。** 之前為了測試反覆 `rm seen_ids.json`，導致使用者已看過的商品一直重複出現。如果需要測試 process.js 的邏輯，用其他方式（比如改閾值看數量變化），不要清已看記錄。

README 只顯示**新發現的未看過商品**。沒有新貨時顯示「本輪無新好貨（已看過 X 筆）」。

## 09. 每輪巡邏的完整步驟

1. `node scrape.js` — 抓資料，讀 log 確認沒異常
2. `node process.js` — 過濾比價，看輸出筆數和跳過數
3. 掃結果 — 有沒有垃圾混入、店家漏網
4. 查新賣家 — 沒見過的開 profile，分類到 sellers.json
5. 查行情 — 用 subagent web search 確認，更新 market_prices.json
6. `git push` + 更新 Gist
7. 報告給 Rose

**不要做的事：**
- 不要 `rm seen_ids.json`（會讓已看商品重複出現）
- 不要用猜的填行情表（必須 web search）
- 不要用 regex 匹配標題（用 category 直接查表）

## 10. 使用者加新品項時

1. 加到 `scrape.js` 的 QUERIES 陣列（關鍵字 + 價格區間）
2. 用 subagent web search 查新品價和二手行情
3. 加到 `market_prices.json`（key = query 名稱）
4. 跑一輪確認有結果
5. 更新這份 workflow 的 queries 表

## 11. query 效果追蹤

`query_stats.json` 記錄每個 query 的效果。scrape.js 每輪更新，連續 3+ 輪沒有 3 天內商品的 query 會在 log 中標記 `⚠ 建議暫停`。

看到建議暫停的 query，在 scrape.js 中註解掉並加日期。

## 12. 腳本做不到的事

- **確認行情**：必須 subagent web search，不靠猜
- **判斷賣家身份**：看 profile 決定是店家還是個人
- **判斷商品品質**：過保、缺件、仿品
- **維護 SKIP 詞表**：每輪看到垃圾就加
- **翻頁**：腳本只抓首頁 ~48 筆，想看更多用 Chrome DevTools MCP

## 13. 目前監控的 13 個 queries

| 關鍵字 | 價格區間 | 備註 |
|--------|---------|------|
| apple watch | $1,000-5,000 | 各代 SE/S6-S9 |
| 空氣清淨機 | $500-3,000 | 大金/飛利浦/SHARP/小米 |
| 投影機 | $500-5,000 | 便攜型 |
| OSIM | $500-5,000 | 眼部/肩頸/腿部按摩 |
| marshall | $1,000-5,000 | 喇叭/耳機 |
| bose | $1,000-5,000 | 喇叭/耳機 |
| 落地燈 | $1,000-5,000 | 品牌/設計款 |
| 空氣循環扇 | $500-3,000 | Vornado/百慕達 |
| nespresso | $500-3,000 | 膠囊咖啡機 |
| 拍立得 | $500-5,000 | 停產款有收藏價值 |
| 藍牙喇叭 | $500-5,000 | 不限品牌，優先找 |
| 立燈 | $500-5,000 | 同「落地燈」補充搜尋 |
| VR | $1,000-5,000 | Quest 2/3/3S、PS VR2、Pico 4 |

分類頁 6 個（min $2,000）：家具居家、美妝保養、精品、手機平板、家電影音、音響耳機。分類頁不進比價，只作為 scrape 來源。

### 暫停的 queries

| 關鍵字 | 暫停原因 | 日期 |
|--------|---------|------|
| Samsung Galaxy Watch | 連續 4 輪空 | 2026-05-02 |
| 鼠尾草 海鹽 | 香水已搞定 | 2026-05-02 |
| Jo Malone | 香水已搞定 | 2026-05-02 |
| 香水 | 香水已搞定 | 2026-05-02 |
| Vivienne Westwood | 暫停 | 2026-05-02 |
| lululemon | 沒好貨 | 2026-05-02 |
| dyson | Rose 不追了 | 之前 |

## 14. 踩過的坑一覽

| 錯誤 | 結果 | 修正 |
|------|------|------|
| 刪 seen_ids.json 測試 | 已看過的商品一直重複出現 | **絕對不刪 seen_ids.json** |
| 用 regex 匹配標題 | 66% 商品靜默被丟棄 | 改用 category 直接查表 |
| 分類頁設通用行情 | $500 鬆餅機被當成 10% 好貨 | 分類頁不進比價 |
| 猜行情不 web search | Bose Home 差 $3,400 | 必須 subagent web search |
| 停產品用原價比 | AW SE1 顯示 19% 超便宜 | 用 secondhand 比 |
| 二手店當便宜貨 | 澄橘定價就是行情 | sellers.json 排除 |
| Playwright 用 networkidle | Carousell SPA 永遠等不到 | load + waitForTimeout |
| evaluate 傳字串不執行 | 全部 query 回傳 0 筆 | IIFE: `(${SCRAPE_JS})()` |

## 15. 檔案結構

| 檔案 | 用途 | 注意 |
|------|------|------|
| `scrape.js` | 抓 Carousell 資料 | 加/改 query 時改 |
| `process.js` | 過濾 + 比價 + 輸出 | 改邏輯、加 SKIP 詞時改 |
| `market_prices.json` | 行情表（key=category）| subagent web search 後填 |
| `sellers.json` | 賣家分四層 | 發現新店家時加 |
| `seen_ids.json` | 已看過的商品 ID | **不要刪** |
| `query_stats.json` | query 效果追蹤 | 自動維護 |
| `raw_results.json` | 原始抓取資料 | 每輪自動覆蓋 |
| `README.md` / `deals.html` | 展示頁 | 每輪自動生成 |

## 16. 重要連結

- Gist：https://gist.github.com/yangnim21029/8b9b7ab910319ac83f1b36761c26cfc9
- GitHub：https://github.com/yangnim21029/cheap-product
- 本地：`/Users/rose/Documents/cheap-product/`

## 17. 恍然大悟：便宜不是價格低，是低於該低的

一支 $1,500 的 Apple Watch SE1 看起來很便宜——原價 $7,900 的兩折不到。但那是 2020 年的產品，二手行情只有 $2,500，$1,500 其實是六折。六折不是撿漏，是正常交易。

真正的撿漏是：有人不知道行情、急著出清、或是純粹懶得查價。這個窗口通常只有幾小時。

所以整套系統做的不是「找便宜的東西」，而是在行情表準確的前提下，比市場快一步看到定價不合理的瞬間。行情表錯了，一切都錯——這就是為什麼行情必須 subagent web search、不能用猜的、不能用 regex 靜默丟棄。
