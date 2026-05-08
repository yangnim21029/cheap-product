# 巡邏觀察 - 新方向訊號

每輪巡邏看完 raw_results 後追加觀察。Rose 審手動清單時順便看。

---

## 2026-05-07 起手觀察

### 高頻出現但不在 query 清單
- **pro audio / 樂器器材** — NOVATION Launchkey, Saramonic UwMic, VOX 貝斯口袋音響, D.A.S. Audio 已陸續進候選；Shure 麥克風、Audio-Technica 監聽耳機可能有量
- **Soundbar** 類 — TCL S45H, Bose 700, JBL Bar 都頻繁出現；目前靠「喇叭」「音響」抓得到但 soundbar 本身未獨立 query
- **手沖咖啡器具**（已加 query）— Hario, Kinto, Acaia 在家電影音類別偶爾出現
- **電動磨豆機**（已加 query）— Wilfa, 1Zpresso, Comandante, Niche Zero 折價兇

### 可考慮加入的 query
- `Shure` / `Audio-Technica` — 麥克風/耳機，min $2K max $15K
- `soundbar` — 獨立查詢，min $2K max $10K
- `Helinox` 椅 — 露營椅輕量化
- `Hermès` 卡夾/絲巾 — 你之前 VW 收得不錯，類似
- `黑膠` / `唱盤` — DARLING/Pro-ject/Rega 偶爾出現

### 詐騙/雜訊頻發類別
- **AirPods 系列**全線假貨警告（Pro 2 USB-C, Pro 3 全新未拆都有實證仿品）— 賣家標「正版」「全新未拆」反而是反向訊號
- **Apple Watch SE 2 / S8 港版** $1,200 級的太低價屬詐騙引流
- **未來實驗室 / FutureLab** 品牌爭議 + 官方發詐騙警告

### maxwilliam 觀察
- 這位 (overpriced) 一直在賣 Bose / B&O / 帝瓦雷，過濾規則生效中，commit log 看不到他進候選

---

## 2026-05-08 00:25 觀察（patrol 13:25）

raw 848 筆 / 候選 36，本輪掃 raw 雜訊看到的非清單訊號：

### 出現頻率高 + 你可能想要
- **WEDGWOOD 餐瓷**（漫遊美境/翠玉鳳凰盤 $2,450 等）— 你之前看 Marimekko 地毯，餐瓷風格類似，建議加 query 「WEDGWOOD」 min $1,500 max $5,000
- **L'Artisan Parfumeur 香薰蠟燭** $2,700 全新正品 — 你追過香水，香薰類同領域可考慮加 query「香薰」min $1K max $5K
- **Sony WH-1000XM4** 全黑 $5,500 — 已被「音響」query 抓但建議加專名 query 「sony xm」min $3K max $10K（你之前 AirPods 4 ANC 有興趣，主動降噪耳機同類）

### 高量但不適合追
- **大型家電出清**（洗衣機/冰箱/瓦斯爐 $5K-8K 量大）— 運送麻煩 + 不在你需求
- **母嬰用品**（Nuna 汽座 / Mamaway 吸乳器）— 不適
- **動漫一番賞**（七龍珠 $5,400-5,550）— 不在興趣

### query 效果觀察
- **磨豆機** query 連兩輪 0 筆相關，可能 keyword 太窄；下輪試「電動磨豆」「手沖磨豆機」「Wilfa」「1Zpresso」分項
- **手沖** query 第二輪只有 1 筆（ROSÉ 周邊吊飾誤匹配），昨天首輪 5 筆都被 SKIP；考慮把 max 從 $5K 拉到 $10K 抓 Acaia/Wilfa

---

## 2026-05-08 01:25 觀察（patrol 14:25）

### query 進帳更新
- **磨豆機** query 終於有貨：飛馬 600N $1,600 (57%) + Fellow Opus $5,200 (70% 邊緣) — query 有效但流通量低
- **fujifilm** 一輪進 3 筆相關（GF35-70 / X-E1 / 餅乾鏡稀有機身），query 持續產出
  - GF35-70mm $16,000=59% 進手動 ✓
  - X-E1 銀 $9,000 比二手 $5,488 還貴 SKIP
  - 「餅乾鏡稀有機身」標題太籠統 SKIP — 賣家描述模糊類別建議直接 SKIP，不浪費 subagent
- **手沖** 第三輪 0 筆相關（持續低）

### 新訊號 — 詐騙模式
- 賣家用 YouTube link 當標題（NT$2,000 + youtu.be link）— 罕見但出現過，建議加 SKIP 規則：title 含 youtu.be / youtube.com 直接過濾
- 賣家標「稀有」「特別版」但不寫具體型號 → 幾乎都是仿品/拼接組合，建議 process.js SKIP 規則加：title 含「稀有」+「機身」/「特別版」但無具體型號

### 已進候選 query 觀察
- **fujifilm** 是穩定產出 query，但 X-E1 / 餅乾鏡稀有機身這類「老 fuji 機身」常被當奇貨可居標高價（賣家 $9,000 vs 二手中位 $5,488）— 別因為品牌進候選就放鬆

---

## 2026-05-08 02:25 觀察（patrol 15:25）

### 新候選只有 1 筆
- EDIFIER MR5 監聽喇叭 $5,000 = 74% 一對新品 $6,790 — 監聽喇叭非藍牙喇叭用途 + 邊緣不過 SKIP
- 「喇叭」query 抓到的是錄音室監聽（pro audio），不是 Rose 想要的便攜藍牙喇叭 — 考慮把「藍牙喇叭」拆出來獨立 query 比較準

### 累積詐騙/雜訊模式（建議下次 process.js 改規則加 SKIP）
- title 含 youtu.be / youtube.com → 直接 SKIP
- title 含「稀有」+「機身」但無具體型號（如 X-Pro1 / X-T1） → 直接 SKIP
- title 含「特別版」但無世代（如 Bose SoundLink Mini 2 SE 已驗證但沒寫世代） → 進手動加警告，不要 SKIP

### query 命中率（過去 24h 概估）
- 高命中：fujifilm（每輪 1-3 筆）、apple watch、音響耳機（多）、磨豆機（剛開始穩定）
- 低命中：手沖、優格機、相印機、VR、立燈
- 雜訊 query：'' 無關鍵字 + 露營（誤匹配衣服）

---

## 2026-05-08 10:03 觀察（patrol 23:25 — 加 3 個分類頁）

### 動作：移除 fujifilm/相機機身 keyword，加 photography-6 / collectibles-memorabilia-9 / music-media-14 三個分類頁

效果立竿見影 — 原始 942（vs. 上輪 848），3 天內 519（vs. 402）。

### 相機攝影分類頁（11 筆候選）一輪進帳
- Canon EOS R50 KIT $18,000 = 86% SKIP（不夠便宜）
- Fuji XF 35mm F1.4 R $10,500 = 88% 二手 → **進殺價** ✓
- Fuji X-T3 機身 $18,000 = 84% 二手 → **進殺價** ✓
- 其他待後續輪驗：Sony A6000 / Contax G28 Zeiss / Sony DSC-W810 / LOMO LCA+ / 七工匠 50/1.4 移軸 / Sachtler 腳架 / Sony CCD VX1

### 分類頁 + keyword 組合的價值
- 「fujifilm」keyword 之前每輪 1-3 筆 → 改 photography-6 一輪 11 筆，覆蓋 Sony / Canon / Contax / LOMO / 七工匠 / Sachtler 全部沒 keyword 的相機品牌
- 結論：**不在 keyword 涵蓋的品牌 → 用分類頁；明確品牌型號 → 用 keyword**

### 收藏品 / 音樂媒體分類頁觀察
- 收藏品（collectibles-memorabilia-9）：抓到 2026 馬年生肖紀念套幣 $4,000、狩野永德唐獅子圖紋織掛軸 $6,800（藝術品多，二手價值需個案查）
- 音樂媒體（music-media-14）：抓到大量卡帶錄音帶（$250-680，太低不在範圍）— 需考慮是否用 min $2K 過濾掉低價長尾

---

## 2026-05-08 12:28 觀察（patrol 26:25 — 跑了兩輪後檢討新分類效益）

### collectibles-memorabilia-9 / music-media-14 兩個分類頁，建議撤掉

**為什麼想撤**：
- collectibles 每輪：sam681008 棒球扭蛋 6 筆（已加 shops）+ 紫南宮錢母/廟宇 + 茶壺/古玉/老香珀 + 翻頁鐘/復古錢幣 + K-pop 簽名小卡
- music-media 每輪：古典 CD（$1,350）/ 黑膠專輯（$1,800-2,800）/ 卡帶（$280-680）/ 樂器（NOVATION/VOX/Boss）
- 跟 Rose 需求重疊 0 筆。唯一可能是 NOVATION Launchkey 之前進過手動，但 keyword「磨豆機」也抓不到 NOVATION → 樂器類 keyword 應該換成「synthesizer」或「鍵盤」

**建議**：
- 撤掉 collectibles-memorabilia-9（純訊雜訊，沒有 Rose 想要的）
- 撤掉 music-media-14（同上）
- 保留 photography-6（這個有效，產出 X-T3/XF35/A7III/GF35-70）

### photography-6 表現好但要持續黑名單相機店
- 已加 5 位（mai_camera/shih0205/cameradoge/filmcamera.kao/goose.store）
- 模式：id 含 _camera/_photo/.store/film/photo + 多筆掛單就是相機水貨店
- 下次遇到符合模式的賣家直接加 shops，不送 subagent 浪費 token

---
