# Methods

驗過有效的操作技巧 / heuristic / shortcut。每條都是踩過坑才寫上來的。

---

## 1. Carousell sub-cat slug 用 sitemap.xml + Playwright 抓

### 問題

要找 Carousell 某個品類的 sub-cat slug（例如 `wearables-smart-watches-6436` / `mouse-mousepads-6395`），改成 sub-cat sweep 比品牌 query 準很多——一次 sub-cat sweep 抓 30 件 vs 4 個 brand query 各跑一次有重複。

但分類頁面 React 渲染後才出 sub-cat 列表，初始 HTML grep 不到。

### 解法

抓 sitemap：

```bash
node -e "
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({headless:true});
  const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'});
  const p=await ctx.newPage();
  await p.goto('https://tw.carousell.com/sitemaps/tw-categories.xml',{waitUntil:'load',timeout:30000});
  const xml=await p.content();
  const slugs=[...xml.matchAll(/<loc>https:\/\/tw\.carousell\.com\/categories\/([^<]+)<\/loc>/g)].map(m=>m[1].replace(/\/\$/,''));
  // grep 想要的 keyword
  slugs.filter(s=>/mouse|keyboard|monitor/i.test(s)).forEach(s=>console.log(s));
  await b.close();
})();
"
```

### 關鍵：CF 不是擋你，是擋 curl

- `curl https://tw.carousell.com/sitemap.xml` → 403 CF challenge
- `WebFetch` → 403 同上
- **Playwright headless（real Chrome fingerprint）→ 200 OK**

CF 擋的是「沒 cookies + 沒真實 browser fingerprint」的 HTTP client，Playwright 直接過。所以未來想 probe Carousell 任何頁面，**直接 Playwright，不要先試 curl/WebFetch 浪費時間**。

### 已抓到的 sub-cat slug (備用)

| 用途 | slug |
|---|---|
| 智慧手錶 | `mobile-phones-gadgets-1091/wearables-smart-watches-6436` ✅ 使用中 |
| 滑鼠 | `computers-tech-1094/parts-accessories-1095/mouse-mousepads-6395` ✅ 使用中 |
| 鍵盤 | `computers-tech-1094/parts-accessories-1095/computer-keyboard-6397` |
| 螢幕 | `computers-tech-1094/parts-accessories-1095/monitor-screens-6396` |
| Gaming Controllers | `video-gaming-1189/gaming-accessories-1111/controllers-6453` |
| PlayStation 主機 | `video-gaming-1189/video-games-consoles-1109/playstation-6445` |
| Nintendo 主機 | `video-gaming-1189/video-games-consoles-1109/nintendo-6446` |
| Hard disks | `computers-tech-1094/parts-accessories-1095/hard-disks-thumbdrives-6398` |
| Networking | `computers-tech-1094/parts-accessories-1095/networking-6399` |
| Computer parts (GPU/RAM/CPU) | `computers-tech-1094/parts-accessories-1095/computer-parts-6400` |
| Webcams | `computers-tech-1094/parts-accessories-1095/webcams-6402` |

完整 sitemap 有 8000+ 分類，要新加用 `tw-categories.xml` 直接 grep。

### 套用時機

User 想找新品類 → 先 sitemap probe 對應 sub-cat → 加 CATEGORIES 而不是 QUERIES。
品類混雜很重的（喇叭 / 投影機 / 香氛）只能 query。

---

## 2. BigGo 優先當 verify baseline

Mainstream 商品（耳機 / 喇叭 / 家電 / iPhone / iPad）verify 走 BigGo `https://biggo.com.tw/s/<query>/` 抓多平台聚合（蝦皮 / Yahoo / PChome / momo / Costco），比 subagent 自由 search 結構化。

但有兩類要 subagent：
- **海外行情**（Discogs 黑膠、底片相機老鏡頭）
- **技術判斷**（GPU 世代差異 / CPU 工程樣品 / iPhone 鎖機）

詳細寫在 `carousell_workflow.md §21`。

---

## 3. vsSF 比 vsNew 更重要

賣家很愛用「對新品打 8 折」當話術，但新品還能買到時，**二手中位才是真行情**。

verify 必算 vsSF：
- vsSF > 100% → file 過貴（即使 vsNew 看起來甜）
- vsSF = vsNew 一致 → 異常訊號（二手價貼新品成本 = ES/QS 工程樣品 / 拆機品嫌疑）
- vsSF < 50% → 太甜警報（電池衰退 / 副廠 / 盜刷 / 磚機 / 改機）

詳見 `README.md` 原則 §3 / §5。

---

## 4. 「結構性訊號」≠ 個別 deal

同型號同價格在 Carousell 重複出現 ≥2 次（不同 pid 不同賣家）= 水貨/平輸/盜刷批次，不是真 deal：

- AirPods 4 ANC 在保 NT$2,500 連 3 輪
- JBL FLIP 6 NT$3,150-3,800 連 2 輪
- iPhone 12 mini 128G J5 二手店 NT$5,000 跨輪同款

加進 `recurring_pattern` 不再 verify。

---

## 5. Subagent verdict 不能直接信，自己重算 %

幾次撞到 subagent 算錯：
- patrol 334 ASUS ZenWiFi BD5：subagent 寫 vsSF +109%，實際 NT$5,000 / NT$5,500 = 91%
- patrol 341 大金 MC30YSCT：我憑印象寫新品 NT$10,000 是錯的（混到大坪數 MC55/MCK70），實際 NT$3,158
- patrol 345 Panasonic NB-F3200：我憑印象寫 NT$5,990，實際 BigGo NT$3,158

**規則**：
- subagent 寫的百分比方向跟「賣家標 vs baseline」直覺不符 → 自己重算
- 我憑印象估的 baseline → 一律標 `(待 BigGo 確認)`，不直接寫進 SKIP 規則

---

## 6. 機會主義 push vs 替 User 過濾的界線

User 反饋（patrol 352）：「我們是機會主義者」——不替 User 替她判 trap，邊緣 case push 桶。

**真 SKIP**（User 一定不看）：
- <NT$2K / niche / 型號未列 / 重複賣家 / 老型號
- 暴貴（賣家明顯高於通路 ≥115%）
- 純詐騙（MacBook Neo / iPhone 17 Pro Max NT$6K 套路）

**機會主義 push 桶**：
- 新品首發半年內二手稍高（仿冒/瑕疵嫌疑但可能是急售）
- vsSF 100-115% 邊緣（標明風險）
- 太甜（標明盜刷/磚機風險讓 User 自查）

**file 不入桶**：
- 純持平 vsSF 95-100% 沒亮點也沒風險

---

## 7. listedAt 用真實 createdAt，不用 bump time

Carousell 搜尋頁時間是 bump time，不是真上架時間。賣家可以一直 bump 老 listing 上頭：
- KEF Muo 7 年前掛 bump 顯示 13 天
- Bose Revolve+ 1 年前掛 bump 顯示 14 天

解法：`scripts/fetch-listing.js` 抓 pid 的 `__NEXT_DATA__` 拿真 createdAt + 年份感知 timeAgo 字串。

---

## 8. RAM / GPU 是台灣 Carousell 的 trap zone

過去 30 輪 verify 撞到 RAM 暴貴（200-500%）至少 8 次：

| Patrol | 品項 | 賣家標 | 通路 | 倍率 |
|---|---|---|---|---|
| 328 | 美光 DDR5 32G | NT$11,800 | NT$3,000 | 393% |
| 354 | 美光 Crucial Pro DDR5 16G | NT$8,800 | NT$1,500 | 500% |
| 333 | 美光 P5 Plus 1TB SSD | NT$4,500 | NT$2,500 | 180% |
| 343 | SP DDR4 16G | NT$3,000 | NT$1,500 | 200% |
| 343 | 筆電 DDR5 16G | NT$3,000 | NT$1,800 | 167% |
| 355 | DDR5 32G 4800 | NT$6,200 | NT$3,000 | 200% |

GPU 同樣：RTX 2080 NT$12K（vs 二手 NT$5-7K）/ GTX 1070 / GTX 1660 都暴貴。

**規則**：title 含 DDR4/DDR5 + price > NT$3K → 自動 SKIP 不送 subagent（通路 16-32GB RAM 才 NT$1.5-3K，賣家亂喊倍率穩定）。GPU 同樣機制可加。

---

## 9. Costco baseline 比一般通路低

verify 高價 PC/Mac/家電類，subagent 主動跑去查 Costco 同規格才抓到便宜 baseline：

- patrol 336 Mac mini M4：Costco NT$18,799 < BigGo NT$21,900
- patrol 352 ASUS Vivobook M1807GA：Costco NT$17,499 < 一般通路均價 NT$23,990
- patrol 311 Surface Pro 9 福利機：PChome NT$24,680 < 平均

verify prompt 加「順便查 Costco 同規格」這層當 baseline。

---

## 10. Mark_seen 只加 pending pid 不動 raw

patrol 328 我順手把 raw pid 一起加進 seen，馬上發現 patrol 328 的 raw 分流不了。

修正：`scripts/mark_seen.js` 只把 `state/pending_review.json` 內的 pid 加進 seen，**不動 raw_results.json**。raw 留給 process.js 分流。
