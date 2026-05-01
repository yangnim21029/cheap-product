# Carousell 二手好物巡邏系統

從零開始，一步步建立自動化撿便宜流程。讀完這份文件，你（或下一個 session 的 AI）就能完整重現整套操作。

## 01. Carousell 的 URL 就是 API

Carousell 沒有公開 API，但所有篩選條件都寫在 URL 參數裡。掌握這三個參數，就能精準控制搜尋範圍：

```
price_start=2500&price_end=5000      # 價格區間
layered_condition=3,4,7               # 3=全新, 4=近全新, 7=輕度使用
sort_by=3                             # 最近上架排序（僅搜尋頁有效）
```

分類瀏覽頁不支援 `sort_by` 參數，需要進入頁面後用 JS 點擊 Sort → Recent。搜尋頁則可以直接在 URL 帶 `sort_by=3`。

## 02. 兩種瀏覽模式：分類 vs 搜尋

**分類瀏覽**適合大範圍掃貨，看整個品類有什麼冒出來：

```
https://tw.carousell.com/categories/{slug}/?layered_condition=3%2C4%2C7&price_end=5000&price_start=2500
```

**關鍵字搜尋**適合盯特定商品，精準鎖定你要的東西：

```
https://tw.carousell.com/search/{關鍵字}?addRecent=false&layered_condition=3%2C4%2C7&price_end={max}&price_start={min}&sort_by=3
```

兩者搭配使用，一個看面，一個看點。

## 03. 監控的分類頁

每輪至少跑 3-4 個分類頁，輪流覆蓋。每個分類都要用 Sort → Recent。

### 優先分類（每輪跑）

| # | 分類 | slug | 重點看 |
|---|------|------|--------|
| 1 | 家具居家 | furniture-home-living-13 | 落地燈/地毯/設計家具 |
| 2 | 美妝保養 | beauty-personal-care-11 | 品牌香水/護膚 |
| 3 | 精品 | luxury-20 | VW/設計師品牌 |
| 4 | 手機平板 | mobile-phones-gadgets-1091 | Apple Watch/智慧手錶 |

### 一般分類（隔輪跑）

| # | 分類 | slug |
|---|------|------|
| 5 | 家電影音 | tv-home-appliances-30 |
| 6 | 音響耳機 | audio-1600 |
| 7 | 電腦科技 | computers-tech-1094 |
| 8 | 電玩遊戲 | video-gaming-1189 |
| 9 | 興趣嗜好 | hobbies-toys-6683 |
| 10 | 女裝 | women-s-fashion-4 |
| 11 | 男裝 | men-s-fashion-3 |
| 12 | 運動器材 | sports-equipment-10 |
| 13 | 保健營養 | health-nutrition-6704 |

完整 URL 拼法：`https://tw.carousell.com/categories/{slug}/?layered_condition=3%2C4%2C7&price_end=5000&price_start=500`

## 04. 監控的 10 個關鍵字

除了大分類，也搜尋特定商品。這些是 Rose 指定要盯的東西：

只監控**市價 $2,000 以上**的商品，低於 $2,000 的買新的比較值得。

### 活躍 queries（每輪都跑）

| # | 關鍵字 | 搜尋價格 | 新品市價 | 備註 |
|---|--------|---------|---------|------|
| 1 | apple watch | $1,000-5,000 | $7,900-13,900 | 各代 SE/S6/S7/S8 |
| 3 | Samsung Galaxy Watch | $1,000-5,000 | $8,000-12,000 | Watch 4/5/6 Classic |
| 4 | Vivienne Westwood | $500-5,000 | $4,500-15,000 | 戒指/項鍊/飾品 |
| 5 | 空氣清淨機 | $500-3,000 | $3,000-12,000 | 大金/飛利浦/SHARP/小米 |
| 6 | 投影機 | $500-5,000 | $3,000-10,000 | 便攜型、支援4K |
| 7 | OSIM | $500-5,000 | $3,000-10,000 | 眼部/肩頸/腿部按摩 |
| 8 | 鼠尾草 海鹽 | $500-5,000 | $6,800 | Jo Malone 香水 |
| 9 | Jo Malone | $500-5,000 | $2,500-8,000 | 各款香水 |
| 10 | 香水 | $500-5,000 | $2,000-15,000 | 品牌香水全搜 |
| 11 | lululemon | $300-3,000 | $2,580-5,000 | 短褲/上衣/瑜伽褲 |
| 12 | marshall | $1,000-5,000 | $3,000-10,000 | 喇叭/耳機 |
| 13 | bose | $1,000-5,000 | $3,000-12,000 | 喇叭/耳機 |
| 14 | 落地燈 | $1,000-5,000 | $2,500-15,000 | 飯店風間接照明 |
| 15 | 空氣循環扇 | $500-3,000 | $3,000-6,000 | Vornado/百慕達 |
| 16 | nespresso | $500-3,000 | $3,490-6,990 | 膠囊咖啡機 |
| 17 | 拍立得 | $500-5,000 | $2,000-6,000 | 停產款有收藏價值 |

### 暫停 queries（台灣量太少或效果差，不每輪跑）

| 關鍵字 | 原因 | 狀態 |
|--------|------|------|
| ~~FLOS~~ | 台灣 Carousell 完全沒有燈具，只有雜訊 | 暫停 |
| ~~Artemide~~ | 同上 | 暫停 |
| ~~設計檯燈~~ | 0 結果 | 暫停 |
| ~~Philips Hue~~ | 有但量極少且全過期 | 暫停 |
| ~~星空投影燈~~ | 量少 | 暫停 |
| ~~dyson 吸塵器~~ | 已合併到 `dyson` | 合併 |
| ~~AirPods Pro~~ | 已被 apple watch 覆蓋（同賣家常一起賣）| 合併 |
| ~~肩頸按摩器~~ | 已合併到 `OSIM` + 通用搜效果差 | 合併 |
| ~~bose 喇叭~~ | 已合併到 `bose` | 合併 |
| ~~JBL 喇叭~~ | 折數通常不夠 | 暫停 |
| ~~Switch 主機~~ | 折數通常不夠（49%+）| 暫停 |
| ~~sodastream~~ | 量少 | 暫停 |
| ~~懶骨頭~~ | 品牌款少 | 暫停 |
| ~~dyson~~ | Rose 不再追了 | 暫停 |

### 不再監控（市價低於 $2,000，買新的比較值得）

| 關鍵字 | 原因 |
|--------|------|
| ~~融蠟燈~~ | 新品 $800-1,500 |
| ~~夕陽燈~~ | 新品 $200-400 |
| ~~地毯~~ | 新品 $500-2,000 |
| ~~遊戲片~~ | 單片 $600-1,500（但軟體不受 $2,000 規則）|

## 05. 用 Chrome DevTools MCP 操作瀏覽器

整套系統跑在 Claude Code + Chrome DevTools MCP 上。核心工具三個：

1. `navigate_page` — 開啟 URL
2. `evaluate_script` — 在頁面上執行 JS 抓資料
3. `click` — 點擊按鈕（用 uid 或 snapshot 定位）

不需要登入 Carousell 帳號，所有操作都是公開頁面瀏覽。

## 06. 切換排序的 JS

分類頁面預設是 Best Match 排序，需要手動切到 Recent。這段 JS 會自動點擊：

```javascript
() => {
  const sortBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sort'));
  if (sortBtn) sortBtn.click();
  setTimeout(() => {
    const opt = Array.from(document.querySelectorAll('li, div, span, button, a'))
      .find(el => el.innerText.trim() === 'Recent');
    if (opt) opt.click();
  }, 1000);
}
```

搜尋頁用 `sort_by=3` 就不需要這步。

## 07. 只看 3 天內的商品

超過 3 天的商品幾乎都被搶走了，不值得記錄。篩選方式：

抓取時檢查 `timeAgo` 欄位，只保留包含以下關鍵字的：
- `minutes ago`、`hour ago`、`hours ago` — 今天的
- `1 day ago`、`2 days ago` — 1-2 天前的
- `yesterday` — 昨天的

排除：`3 days ago` 以上、`week`、`month`、`year`

JS 過濾邏輯：
```javascript
const isRecent = (timeAgo) => {
  if (!timeAgo) return false;
  if (timeAgo.includes('minute') || timeAgo.includes('hour')) return true;
  if (timeAgo.includes('1 day') || timeAgo.includes('2 days') || timeAgo.includes('yesterday')) return true;
  return false;
};
```

## 08. 抓取商品的 JS

這段 JS 從頁面上提取所有商品卡片的資訊，包括賣家、標題、價格、狀態、product ID：

```javascript
(category) => {
  const results = [];
  document.querySelectorAll('a[href*="/p/"]').forEach(card => {
    const href = card.getAttribute('href');
    if (!href || !href.includes('/p/')) return;
    const texts = card.innerText.split('\n').filter(t => t.trim());
    if (texts.length < 2) return;
    const title = texts[0] || '';
    const price = texts.find(t => t.includes('NT$')) || '';
    const condition = texts.find(t =>
      ['Brand new','Like new','Lightly used','Well used','Heavily used'].includes(t)
    ) || '';
    const id = href.match(/-(\d+)\//)?.[1] || '';
    let seller = '', timeAgo = '';
    const parent = card.parentElement;
    if (parent) {
      const sellerLink = parent.querySelector('a[href*="/u/"]');
      if (sellerLink) {
        const st = sellerLink.innerText.split('\n').filter(t => t.trim());
        seller = st[0] || '';
        timeAgo = st[1] || '';
      }
    }
    results.push({ seller, timeAgo, title, price, condition, category,
      url: 'https://tw.carousell.com/p/' + id + '/' });
  });
  return results;
}
```

注意 URL 一律用 `https://tw.carousell.com/p/{product_ID}/` 短網址格式。Carousell 會自動 redirect 到正確頁面，避免中文 slug 拼錯。

## 09. 搜尋技巧：從好貨展開搜

找到一筆好貨後，用更廣的品牌名展開搜尋，往往能挖到更多同類好貨：

1. 找到一筆好貨（如 Samsung Galaxy Watch 6 Classic $3,600）
2. 把關鍵字放寬到品牌（搜 `Samsung Galaxy Watch`）
3. 發現更多款式和價格帶

原則：**品牌名 > 型號名 > 品類通用詞**，從窄到寬。

## 10. 速率限制：太快會被擋

Carousell 短時間內連續請求太多會觸發 500 錯誤（"Something's wrong on our end"）。已踩過的坑：

- **每個分類之間間隔 10-15 秒**
- **不要一次掃完 11 個分類**，分 3 批：
  - 批次 A（科技）：手機、電腦、音響、電玩
  - 批次 B（生活）：家電、保健、美妝、運動
  - 批次 C（時尚）：女裝、男裝、精品
- **Show more results** 點擊後等 3 秒再抓取
- **被擋時**等 30 秒，點 Try again

每小時跑一輪，每輪掃 1 批分類 + 3-4 個 wishlist 關鍵字，不會觸發限制。

## 10. 巡邏節奏

實測下來最穩定的節奏：

- **每 1 小時**：reload 分類頁 + 搜關鍵字，用 Recent 排序找新上架的
- **凌晨 0-7 點**：上架量極低，1 小時足夠
- **早上 8-12 點**：上架高峰，如果要更積極可以改 30 分鐘
- **每輪只跑 1 批分類 + 3-4 個關鍵字**，避免速率限制

用 `/loop` 的 `ScheduleWakeup` 每小時觸發。

每輪一口氣跑完全部 16 個活躍 queries，預估 10 分鐘。分類頁則每輪挑 2-3 個輪流掃。暫停的 queries 不跑，除非使用者重新啟用。

## 11. 誰便宜？誰是行情？判斷比價的關鍵

這是整套系統最重要的認知——不是所有低價都是好貨。

**二手連鎖店的價格 = 市場行情基準**，他們不算便宜：

| 帳號 | 店名 | 特徵 |
|------|------|------|
| `change12336` | 澄橘 | 專業二手 3C，價格穩定 |
| `elba_digital888` | 艾爾巴 | 全台連鎖，Heavily used 比例高 |
| `phone_recycle` | 瘋回收 | 板橋實體店，量大但中低階安卓為主 |
| `chan_850725` / `chineming03` | 蘆洲店 | 同一間店兩帳號重複刊登 |
| `phoneshop` | 典藏奇機 | 展示機出清 |
| `guoguo.shop` | 果果 | iPad 專賣 |
| `joycely.yang` | 二手通路 | 量大但偶有限時低價 |

**真正的撿便宜來自個人賣家**——他們可能急售、不懂行情、或純粹想出清。

判斷規則：
- **市價低於 $2,000 的東西不用看**，買新的比較值得
- 個人賣家價格需符合以下**任一條件**才記入 CSV：
  - 仍在販售的新品 × 30% 以下（不到新品 3 折）
  - 或 二手行情 × 70% 以下
- 只記 3 天內上架的商品，超過 3 天幾乎都被搶走了

### 折舊規則（重要！之前踩過坑）

**停產品/舊型號不能用原價比，必須用當前二手行情。**

做法：搜同關鍵字，看二手店（澄橘、艾爾巴等）或其他賣家的同款定價，作為二手行情基準。

常見停產品的二手行情參考（2026-05 更新）：

| 商品 | 上市年份 | 當年新品價 | 現在二手行情 | 備註 |
|------|---------|-----------|------------|------|
| Apple Watch SE1 | 2020 | $7,900 | $2,000-2,500 | 6 年前，電池老化 |
| Apple Watch SE2 | 2022 | $7,900 | $3,000-3,500 | 4 年前 |
| Apple Watch S6 | 2020 | $12,900 | $3,500-4,500 | 6 年前 |
| Apple Watch S7 | 2021 | $12,900 | $4,500-5,500 | 5 年前 |
| Apple Watch S8 | 2022 | $12,900 | $5,500-6,500 | 4 年前 |
| Samsung Watch 6 | 2023 | $11,990 | $5,000-6,000 | 3 年前 |
| Bose QC Earbuds II | 2022 | $8,900 | $4,000-5,000 | 已被 Ultra 取代 |
| Nespresso Pixie | 停產 | $4,990 | $2,000-2,500 | 膠囊機折舊快 |
| OSIM 護眼樂 OS-180 | 舊款 | $2,980 | $800-1,200 | 被 Air 系列取代 |
| MOMI X800 | 停產 | $5,500 | $2,000-2,500 | 微型投影折舊快 |
| 拍立得 Mini 50s | 停產 | $5,000 | $3,000-4,000 | 停產有收藏溢價 |

**如何維護行情表：** 每輪巡邏時，看二手店的定價，發現偏差就更新 `process.js` 裡的 MARKET 表和這裡的參考表。行情表不能純靠腳本，需要人工判斷。

### 腳本做不到的事（需要人工判斷）

- 辨認新的店家/疑似批量賣家（如同時賣多支手錶的帳號）
- 判斷商品狀態描述是否合理（過保、缺件、維修過）
- 確認停產品的當前二手行情
- 發現新的搜尋關鍵字（「展開搜法」）
- 判斷限量版/聯名款是否有收藏溢價

## 12. 三份 CSV 各司其職

所有資料存在 `/Users/rose/Documents/cheap-product/` 目錄：

| 檔案 | 用途 | 欄位分隔 |
|------|------|----------|
| `carousell_listings_YYYYMMDD.csv` | 分類瀏覽全量商品 | 逗號 `,` |
| `carousell_deals_YYYYMMDD.csv` | 個人賣家低於行情好貨（已驗證 URL） | pipe `\|` |
| `carousell_wishlist_YYYYMMDD.csv` | 特定關鍵字搜尋結果 | pipe `\|` |

deals CSV 欄位：`seller|title|price|condition|category|url|verified|note`

wishlist CSV 欄位：`category|seller|title|price|condition|url`

URL 一律用 product ID 短網址 `https://tw.carousell.com/p/{ID}/`。

## 13. 驗證 URL 的正確做法

從頁面抓到的 product ID 存在 href 裡（格式 `-{ID}/`），但之前踩過坑：從記憶拼 URL 會錯。

正確做法：
1. 抓取時直接用 regex `href.match(/-(\d+)\//)?.[1]` 取得 product ID
2. 組成 `https://tw.carousell.com/p/{ID}/`
3. 如果要驗證，直接 `navigate_page` 到這個 URL，Carousell 會 redirect 到正確頁面
4. 也可以去賣家頁面 `https://tw.carousell.com/u/{seller}/` 搜尋特定價格的商品確認

## 14. 自動化腳本

兩個腳本搭配使用：

```bash
node scrape.js    # Playwright headless 跑 16 queries + 6 分類 → raw_results.json（~5分鐘）
node process.js   # 過濾+折舊比價 → CSV + README + deals.html
```

### scrape.js 技術細節

- 用 Playwright + Chromium headless，不需要已開啟的 Chrome
- `waitUntil: 'load'` + `waitForTimeout(5000)`（不能用 `networkidle`，Carousell SPA 永遠不會 idle）
- `page.evaluate()` 傳 IIFE 字串 `` `(${SCRAPE_JS})()` ``（不能直接傳字串，不會自動執行）
- 設定 user-agent 避免被偵測為 headless bot
- 每頁間隔 8-12 秒，分類頁 10-15 秒，防 rate limit
- 被擋（500）時自動等 30 秒
- 分類頁需額外點 Sort → Recent（JS click 模擬）
- 全程 debug log：URL、頁面標題、抓到幾筆、前 3 筆預覽、錯誤訊息

### process.js 核心邏輯

- MARKET 行情表：每個商品類別有 `currentNew`（在售新品價，停產=null）和 `secondhand`（二手行情）
- 判斷好貨：`price <= currentNew × 30%` OR `price <= secondhand × 70%`
- 停產品只看二手行情，不用原價（之前踩過坑）
- 排除：二手店帳號、已知批量賣家、配件/耗材關鍵字、超過 3 天
- 輸出：CSV + README.md + deals.html，按折數排序

MARKET 行情表需要**人工維護**：
- 新增商品類別時加對應的 match 規則
- 發現行情偏差時更新 secondhand 價格
- 停產品的 currentNew 設為 null
- SKIP 詞表也需要根據實際結果持續擴充

### 什麼時候調用腳本

| 場景 | 做法 |
|------|------|
| **每小時例行巡邏** | `node scrape.js && node process.js` → AI 讀 log 檢查 → push |
| **新 session 第一輪** | 先讀 workflow → 跑腳本 → 讀 log 檢查有沒有異常 → 報告 |
| **使用者加了新關鍵字** | 更新 scrape.js QUERIES → 更新 process.js MARKET → 跑一輪 |
| **發現行情不對** | 更新 process.js MARKET 表 → 重跑 `node process.js`（不需重抓） |
| **腳本出錯** | 讀 log 找錯誤 → 修腳本 → 重跑（scrape.js 有完整 debug log） |
| **分類頁要看更多** | 用 Chrome DevTools MCP 手動瀏覽（腳本只抓首頁，手動可以翻頁） |

### 腳本的限制（需要 AI/人工補充）

- 腳本只抓每頁首批商品（~48 筆），不會自動翻頁
- MARKET 行情表是靜態的，需要定期根據實際觀察更新
- 新出現的店家帳號需要人工辨認並加入 SHOPS
- 「展開搜法」（從好貨展開搜品牌）需要人工操作
- 商品描述裡的隱藏問題（過保、缺件、仿品）需要人工判斷

## 15. 完整巡邏流程（重啟後照著跑）

### 標準流程

1. **讀 workflow** 了解系統設定
2. **跑腳本** `node scrape.js && node process.js`
3. **讀 log** 檢查有沒有搜尋失敗、被擋、異常
4. **讀結果** 掃一眼 30 筆好貨，人工移除明顯不對的
5. **更新行情** 如果發現某類商品行情偏差，更新 MARKET 表
6. **push** `git add -A && git commit && git push`
7. **更新 Gist** `gh gist edit {id} README.md`
8. **報告** 給使用者看，等「都看完了」後歸檔

### 重要連結

- **Gist（有連結就能看）**：https://gist.github.com/yangnim21029/8b9b7ab910319ac83f1b36761c26cfc9
- **GitHub repo（private）**：https://github.com/yangnim21029/cheap-product
- **本地目錄**：`/Users/rose/Documents/cheap-product/`

### 每輪 checklist

- [ ] 跑 16 個活躍 queries + 4 分類頁（腳本或手動）
- [ ] 停產品用二手行情比，不用原價
- [ ] 檢查 MARKET 行情表是否需更新（看二手店定價）
- [ ] 辨認新的疑似店家帳號
- [ ] 用「展開搜法」：找到好貨 → 搜更廣的品牌名
- [ ] 市價 < $2,000 的跳過（除非是高級款）
- [ ] 更新 CSV + README + push + Gist

## 15. 恍然大悟：二手市場的時間差套利

整套系統的核心邏輯其實是**時間差套利**。

二手店（澄橘、艾爾巴）是專業買賣，他們的定價已經是市場均衡價。但個人賣家上架的那一刻，價格可能還沒被市場發現——也許他急著用錢、也許他不知道行情、也許他純粹想快點出清。

這個時間窗口通常只有幾小時到一天。被二手店看到就會被收購，被其他買家看到就會被搶走。

所以我們的系統做的事情是：

1. **每小時自動掃描**——比手動逛快
2. **過濾掉二手店**——他們不是我們的目標
3. **比對行情價**——只標記真正低於市場的
4. **product ID 短網址**——看到就能立刻點進去買

你不需要整天盯著 Carousell。讓系統跑著，有好貨它會告訴你。
