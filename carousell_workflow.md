# Carousell 二手好物巡邏系統

讀完這份文件，新 session 的 AI 就能完整重現整套操作。

## 01. Carousell 的 URL 就是 API

Carousell 沒有公開 API，但所有篩選條件都寫在 URL 參數裡。搜尋頁的 URL 長這樣：

```
https://tw.carousell.com/search/{關鍵字}?addRecent=false&layered_condition=3%2C4%2C7&price_end=5000&price_start=500&sort_by=3
```

三個關鍵參數：`price_start/end` 控制價格、`layered_condition=3,4,7` 篩全新/近全新/輕度使用、`sort_by=3` 按最近上架排序。分類瀏覽頁不支援 `sort_by`，需要進頁面後用 JS 點 Sort → Recent。

## 02. 兩個腳本跑完整套流程

`scrape.js` 用 Playwright headless Chromium 自動開 18 個搜尋頁 + 6 個分類頁，每頁等 5 秒讓 SPA 渲染完再抓資料，全程約 5 分鐘，輸出 `raw_results.json`。

`process.js` 讀 raw_results.json，套用行情表比價、排除店家、過濾配件和過期商品，輸出 CSV + README + deals.html。同時讀 `seen_ids.json` 做去重，使用者看過的不會再出現。

```bash
node scrape.js && node process.js
```

跑完一定要讀 scrape.js 的 log，確認每個 query 都有結果、沒有被 Carousell 擋（500 錯誤）、分類頁的 Sort → Recent 有成功。

## 03. 行情表決定什麼是「便宜」

`market_prices.json` 存了每個商品類別的新品價和二手行情，是整套系統的判斷核心。每筆有：

- `currentNew`：目前仍在賣的新品售價。停產品填 `null`。
- `secondhand`：Carousell 上的二手行情均價，從店家定價和 web search 得來。
- `source`：價格來源，方便下次驗證時知道這數字怎麼來的。

比價規則：**售價 ≤ 新品 × 30%** 或 **售價 ≤ 二手行情 × 70%**，符合任一就算好貨。

新增品項時，先 web search 查台灣售價，再到 Carousell 搜同款看店家和其他賣家怎麼定價，兩邊對照後填入。不能用猜的——之前猜 Bose Home 新品 $9,900，實際只有 $6,500，差了 $3,400。

## 04. 停產品不能用原價比

Apple Watch SE1 原價 $7,900，但那是 2020 年的事。現在二手行情只有 $2,500。如果拿 $1,500 跟原價比會得到 19%（看起來超便宜），但跟二手行情比是 60%（接近市場價）。

在 `market_prices.json` 裡，停產品的 `currentNew` 填 `null`，process.js 就只會用 `secondhand` 來比。常見的停產品：Apple Watch SE1/SE2/S6-S8、Samsung Watch 6、Bose QC Earbuds II、Nespresso Pixie、OSIM 護眼樂 OS-180。

## 05. 賣家比商品重要

同一支 Apple Watch SE1 $1,500，個人急售 vs 二手連鎖店 vs 定價偏高的批量賣家，意義完全不同。

`sellers.json` 把賣家分四層：

- **shops**（直接排除）：澄橘、艾爾巴、百豐悅、蒐機王、carrot_chen——他們的定價就是行情，不算便宜。
- **overpriced**（直接排除）：像 maxwilliam，所有商品都 Bumped（付費置頂）但賣不掉，代表定價高於市場願付。
- **resellers**（保留但標 ⚠）：像 lover.perfume 香水批量商，有成交量但不是個人出清，看到 ⚠ 再自己判斷。
- **trusted**（優先）：已確認的個人賣家，像 zzz9121 有收據的 VW 絲巾。

判斷新賣家的方法：開 `https://tw.carousell.com/u/{seller}/`，看 Orders 數量、Reviews、加入多久、有沒有多筆 Bumped。500+ Orders + 品類集中 = 店家；全部 Bumped = 定價偏高；< 50 Orders + 雜物 = 個人出清。

## 06. 過濾掉的不只是店家

process.js 有一個 SKIP 詞表，會排除標題包含這些詞的商品：配件、電源線、濾網、維修、錶帶、底座、收納架、吸頭、馬達、電池、護手霜、相紙、DVD、運動衣、瑜珈服、運動內衣⋯⋯

這個表是從實際結果裡一次次發現垃圾後累積的。每輪跑完如果看到不該出現的東西（比如 Aesop 潔膚露被當成香水、Polaroid 相紙被當成拍立得），就把關鍵字加進去。

Lululemon 的衣服也被排除了——單件市價低，只留褲子、包、組合。

## 07. 3 天內才有意義

二手好貨的時間窗口很短，通常幾小時到一天。超過 3 天的幾乎都被搶走了或是沒人要。process.js 的 `isRecent` 只留 minutes/hours/1 day/2 days/yesterday。

之前踩過坑：分類頁的 Sort → Recent 沒成功時，會混入 11 天甚至 21 天前的商品。所以 isRecent 要先排除 `\d+ days`（3+ 天），再正向匹配 1-2 天。

## 08. 去重靠 seen_ids.json

每輪 process.js 跑完會把好貨的 product ID 寫入 `seen_ids.json`。下輪跑同樣的 raw data 時，這些 ID 會被跳過。使用者說「看完了」不需要手動歸檔，seen_ids 自動處理。

如果要重置（比如想重看全部），刪掉 seen_ids.json 再跑 process.js 就好。

## 09. 每輪巡邏的完整步驟

1. `node scrape.js` — 抓資料，讀 log 確認沒異常
2. `node process.js` — 過濾比價，看輸出筆數和跳過數
3. 掃結果 — 有沒有配件混入、店家漏網、行情偏差
4. 查新賣家 — 沒見過的開 `/u/{seller}/` 看 Orders/Bumped，分類到 sellers.json
5. 查行情 — 價格可疑的 web search 確認，更新 market_prices.json
6. 展開搜法 — 發現好貨就搜更廣的品牌名
7. `git push` + 更新 Gist
8. 報告給 Rose，等「看完了」

## 10. 使用者加新品項時

Rose 說「我想找 XXX」→ 做這些：

1. 加到 `scrape.js` 的 QUERIES 陣列（關鍵字 + 價格區間）
2. Web search 查新品價和二手行情
3. 加到 `market_prices.json`（pattern + currentNew + secondhand + source）
4. 跑一輪確認有結果
5. 更新這份 workflow 的 queries 表

## 11. 腳本做不到的事

腳本負責量（18 queries × 48 筆 = ~900 筆自動掃描），人負責質：

- **判斷賣家身份**：看 profile 決定是店家還是個人
- **確認行情**：web search 查真實價格，不靠猜
- **判斷商品品質**：過保、缺件、Heavily used、維修品、仿品
- **展開搜法**：從一筆好貨展開搜整個品牌
- **維護 SKIP 詞表**：每輪看到垃圾就加
- **翻頁**：腳本只抓首頁 ~48 筆，想看更多要用 Chrome DevTools MCP 手動瀏覽

## 12. 目前監控的 18 個 queries

| 關鍵字 | 價格區間 | 備註 |
|--------|---------|------|
| apple watch | $1,000-5,000 | 各代 SE/S6-S9 |
| Samsung Galaxy Watch | $1,000-5,000 | Watch 4/5/6/7 |
| Vivienne Westwood | $500-5,000 | 戒指/項鍊/飾品 |
| 空氣清淨機 | $500-3,000 | 大金/飛利浦/SHARP/小米 |
| 投影機 | $500-5,000 | 便攜型 |
| OSIM | $500-5,000 | 眼部/肩頸/腿部按摩 |
| 鼠尾草 海鹽 | $500-5,000 | Jo Malone |
| Jo Malone | $500-5,000 | 各款香水 |
| 香水 | $500-5,000 | 品牌香水全搜 |
| lululemon | $300-3,000 | 褲/包/組合（衣服不查）|
| marshall | $1,000-5,000 | 喇叭/耳機 |
| bose | $1,000-5,000 | 喇叭/耳機 |
| 落地燈 | $500-5,000 | 品牌/設計款 |
| 空氣循環扇 | $500-3,000 | Vornado/百慕達 |
| nespresso | $500-3,000 | 膠囊咖啡機 |
| 拍立得 | $500-5,000 | 停產款有收藏價值 |
| 藍牙喇叭 | $500-5,000 | 不限品牌 |
| 立燈 | $500-5,000 | 同「落地燈」補充搜尋 |

分類頁 6 個：家具居家、美妝保養、精品、手機平板、家電影音、音響耳機。

暫停的：dyson、FLOS、Artemide、Philips Hue、JBL、Switch 主機、sodastream、懶骨頭。

## 13. 踩過的坑一覽

| 錯誤 | 結果 | 修正 |
|------|------|------|
| 停產品用原價比 | AW SE1 顯示 19% 超便宜 | 實際二手行情 60%，改用 secondhand |
| 沒 web search 猜價格 | Bose Home 差 $3,400 | 一律 web search 確認後填表 |
| 二手店當便宜貨 | 澄橘的價格就是行情 | 店家帳號寫入 sellers.json 排除 |
| Bumped 賣家沒排除 | maxwilliam 賣不掉的也進清單 | 開 profile 看 Bumped 狀態 |
| Playwright 用 networkidle | Carousell SPA 永遠等不到 | 改 load + waitForTimeout(5000) |
| evaluate 傳字串不執行 | 全部 query 回傳 0 筆 | 改 IIFE: `(${SCRAPE_JS})()` |
| isRecent 漏放舊商品 | 21 天前的混進來 | 先排除 `\d+ days` 再正向匹配 |
| VW 絲巾二手價猜 $1,500 | 實際 $600，$500 不算便宜 | web search 確認各款式價差 |

## 14. 檔案結構

| 檔案 | 用途 | 更新時機 |
|------|------|---------|
| `scrape.js` | 抓 Carousell 資料 | 加/改 query 時 |
| `process.js` | 過濾 + 比價 + 輸出 | 改邏輯、加 SKIP 詞時 |
| `market_prices.json` | 行情表（新品價 + 二手價）| web search 查到新價格時 |
| `sellers.json` | 賣家分四層 | 發現新店家/批量賣家時 |
| `seen_ids.json` | 已看過的商品 ID | 自動維護 |
| `raw_results.json` | 原始抓取資料 | 每輪自動覆蓋 |
| `README.md` / `deals.html` | 展示頁 | 每輪自動生成 |
| `query_log.md` | 搜尋效果追蹤 | 人工記錄 |

## 15. 重要連結

- Gist：https://gist.github.com/yangnim21029/8b9b7ab910319ac83f1b36761c26cfc9
- GitHub：https://github.com/yangnim21029/cheap-product
- 本地：`/Users/rose/Documents/cheap-product/`

## 16. 恍然大悟：便宜不是價格低，是低於該低的

一支 $1,500 的 Apple Watch SE1 看起來很便宜——原價 $7,900 的兩折不到。但那是 2020 年的產品，二手行情只有 $2,500，$1,500 其實是六折。六折不是撿漏，是正常交易。

真正的撿漏是：有人不知道行情、急著出清、或是純粹懶得查價。這個窗口通常只有幾小時。二手店看到就會收購，其他買家看到就會搶走。

所以整套系統做的不是「找便宜的東西」，而是在行情表準確的前提下，比市場快一步看到那些定價不合理的瞬間。行情表錯了，一切都錯——這就是為什麼 market_prices.json 必須用 web search 查、用 Carousell 店家價驗證、而不能用猜的。
