# Carousell 二手好物巡邏系統

讀完這份文件，新 session 的 AI 就能完整重現整套操作。

## 01. 系統架構

```
scrape.js          → raw_results.json      （Playwright 抓 Carousell）
process.js         → CSV + README + HTML    （過濾 + 比價）
market_prices.json                          （行情表，web search 查的）
sellers.json                                （賣家分類：店家/批量/高價/個人）
seen_ids.json                               （去重，看過的不再顯示）
```

## 02. 每輪巡邏步驟

### Step 1：抓資料

```bash
node scrape.js
```

跑完讀 log，確認：
- 每個 query 都有抓到筆數（不是 0 或錯誤）
- 沒有連續 500 錯誤（被擋）
- 分類頁的 Sort → Recent 有成功點到

### Step 2：過濾比價

```bash
node process.js
```

看輸出：
- 「跳過 X 筆已看過」確認去重正常
- 掃一眼結果，有沒有明顯不對的（配件混入、店家漏網、行情偏差）

### Step 3：審核結果

人工要做的事（腳本做不到）：

1. **查新賣家**：沒見過的賣家 → 開 `https://tw.carousell.com/u/{seller}/` 看 Orders/Reviews/Joined/Bumped 狀態 → 分類到 sellers.json
2. **查行情**：價格看起來太便宜 → web search 確認新品價和二手行情 → 更新 market_prices.json
3. **判斷商品品質**：過保、缺件、Heavily used、維修品 → 手動移除
4. **展開搜法**：發現好貨 → 搜更廣的品牌名找更多

### Step 4：發布

```bash
git add -A && git commit -m "batch update" && git push
gh gist edit 8b9b7ab910319ac83f1b36761c26cfc9 README.md
```

### Step 5：報告

把結果給 Rose 看，等她說「看完了」→ 不需手動歸檔，seen_ids.json 自動去重，下輪不會重複。

## 03. 怎麼判斷賣家

開 `https://tw.carousell.com/u/{seller}/` 看四個指標：

| 指標 | 店家信號 | 個人信號 |
|------|---------|---------|
| Orders | 500+ | < 50 |
| 商品數 | 20+，品類集中 | < 10，雜物 |
| Bumped | 多筆 Bumped（付費置頂賣不掉）| 無 |
| 狀態 | Heavily used 比例高 | 多為 Like new / Brand new |

分四層寫入 `sellers.json`：

| 層級 | 處理 | 典型 |
|------|------|------|
| shops | 排除 | 澄橘、艾爾巴、百豐悅、蒐機王、carrot_chen |
| overpriced | 排除 | maxwilliam（全 Bumped 賣不動） |
| resellers | 保留但標 ⚠ | lover.perfume（香水批量商） |
| trusted | 優先 | zzz9121（個人出清，有收據） |

## 04. 怎麼建立比較基準

行情表存在 `market_prices.json`，每筆有：
- `currentNew`：目前新品售價（停產品填 null）
- `secondhand`：二手行情（從 Carousell 店家定價 + web search 得來）
- `source`：價格來源，方便下次驗證

**建立新品項的步驟：**

1. Web search 查該商品目前台灣售價
2. 在 Carousell 搜同款，看二手店和其他賣家的定價
3. 填入 market_prices.json
4. 如果是停產品，currentNew 填 null，只用 secondhand 比

**比價規則：** `售價 ≤ 新品 × 30%` OR `售價 ≤ 二手行情 × 70%`

## 05. 監控的 queries

### 活躍（18 個，含新增的藍牙喇叭和立燈）

| 關鍵字 | 搜尋價格 | 備註 |
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
| 立燈 | $500-5,000 | 同「落地燈」補充 |

### 分類頁（6 個）

| 分類 | slug |
|------|------|
| 家具居家 | furniture-home-living-13 |
| 美妝保養 | beauty-personal-care-11 |
| 精品 | luxury-20 |
| 手機平板 | mobile-phones-gadgets-1091 |
| 家電影音 | tv-home-appliances-30 |
| 音響耳機 | audio-1600 |

### 暫停

dyson、FLOS、Artemide、設計檯燈、Philips Hue、JBL、Switch 主機、sodastream、懶骨頭

### 不監控（市價 < $2,000）

融蠟燈、夕陽燈、地毯、遊戲片

## 06. 踩過的坑

| 坑 | 教訓 |
|----|------|
| 用停產品原價比 | Apple Watch SE1 原價 $7,900 → 實際二手 $2,500，折數完全灌水 |
| 沒 web search 直接猜價格 | Bose Home 猜 $9,900，實際 $6,500；Dior Gris 猜 $11,000，實際 $6,700 |
| 二手店當便宜貨 | 澄橘/艾爾巴的價格就是行情，不是便宜 |
| Bumped 賣家當正常 | maxwilliam 全部 Bumped = 定價高賣不動 |
| Playwright 用 networkidle | Carousell SPA 永遠不會 idle，要用 load + waitForTimeout |
| evaluate 傳字串 | 要用 IIFE `(${fn})()` 不然函數不會執行 |
| isRecent 放過舊商品 | 分類頁混入 11/21 天前的，要先排除 `\d+ days` 再匹配 |
| Lululemon 衣服太多 | 單件衣服市價低，排除衣服只留褲子/包/組合 |

## 07. 檔案說明

| 檔案 | 用途 | 誰改 |
|------|------|------|
| `scrape.js` | Playwright 抓資料 | 加/改 query 時 |
| `process.js` | 過濾比價邏輯 | 加 SKIP 詞、改排除邏輯時 |
| `market_prices.json` | 行情表 | web search 查到新價格時 |
| `sellers.json` | 賣家分類 | 發現新店家/批量賣家時 |
| `seen_ids.json` | 已看過的商品 ID | 自動維護，清空 = 重置 |
| `raw_results.json` | 抓取原始資料 | 腳本自動覆蓋 |
| `carousell_wishlist_*.csv` | 過濾後的好貨 | 腳本自動覆蓋 |
| `README.md` | GitHub 展示頁 | 腳本自動生成 |
| `deals.html` | HTML 展示頁（深色主題）| 腳本自動生成 |
| `query_log.md` | 搜尋效果追蹤 | 人工記錄 |

## 08. 重要連結

- **Gist**：https://gist.github.com/yangnim21029/8b9b7ab910319ac83f1b36761c26cfc9
- **GitHub repo**：https://github.com/yangnim21029/cheap-product
- **本地目錄**：`/Users/rose/Documents/cheap-product/`
