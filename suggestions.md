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

## 2026-05-23 14:45 觀察（patrol — Switch/CCD 訊號 + GoPro/Snow Peak 浮現）

### auto_query_suggest 命中
- **gopro** 2 筆（Hero 11 black $8,500 + $8,000）— 同款相鄰價位連兩筆，型號明確，已停產二手中位 $7-9K，建議加 query：`gopro`，min $3K max $12K
- **snow peak** 2 筆（休閒椅30 卡其 $4,180 全新 + $3,780）— 同款連兩筆，可能是同賣家清貨；露營戶外戰場熱度上升，但 Rose 不一定追，**先放 suggestions 別動 QUERIES**
- **oakley** 2 筆太陽眼鏡（Sutro lite + twenty XX FMJ $4,999/$7,500）— 太陽眼鏡 SKIP 過很多，與 Rose 興趣低；marketing × luxury 軸的話 Rose 想收的是 Hermès/VW 那種非運動款，oakley 不上
- **apple airpods** 2 筆 — 已被音響耳機分類頁覆蓋，不獨立查
- **國際牌** 3 筆 — 都是雜訊（美容儀/分離冷氣/吹風機），品類分散，不加 query

### Switch 訊號累積
- 本輪手動冒出三筆 Switch 相關：四合一遊戲片 $3,200 / 動森限定主機組 $6,000 / Switch 2 Pro 手把 $2,500 / 健身環 $900。Rose 明示 Switch 關注，但個別片+配件主要靠 raw_results 自然抓到，不必獨立 query
- **可考慮**：加 `Switch 主機` query（min $5K max $15K）抓出 Switch OLED / Switch 2 主機本體，目前是靠「電玩主機」分類頁

### CCD 復古相機警告（連四輪都偏高）
- 本輪四筆 Canon ixus 860/185/95 + Casio EX10 全部 105-149% 偏高
- CCD 熱潮已 plateau，賣家定價跟漲，**沒折扣空間**。建議：之後 Canon ixus / Olympus mju / Casio EX 系列 raw_results 出現直接列「警示 CCD 熱潮高定價」，subagent 也不用一一查
- 例外：型號未知或標題只說「CCD 相機」可能撿漏，仍走手動

### 黑膠音響類首筆出現
- STEREO PLAYER SYSTEM 黑膠唱機 $3,500（無型號 + 無壓克力蓋 + 依現況不退）— 已標手動。Rose 想收黑膠的話這種狀況品要實體看
- 純黑膠類 query（如 `黑膠唱機` / `turntable`）暫無 baseline，**等下輪再看 1-2 筆才決定加不加**

### 賣家觀察
- **johnson256** 一次上 3 筆 Canon ixus CCD 全偏高 → 批量轉售嫌疑，下輪如再出現整批標 SKIP 不查
- **bigshow04000** 一次上 2 筆 Sony 高階（a7m3 $26K + 16-35GM $25K），定價跟二手中下緣接近，個人賣家機率高，先觀察一輪

## 2026-05-23 19:55 觀察（patrol 116 — iPad 大宗來了）

### 本輪訊號
- **iPad 大宗 7 筆** — Air 4/5/6/Air M2/iPad 11 2025/Pro 11 二代/mini 7 同時上架，價格分佈 $7K-14K 全在二手中位附近，但全是 lee.3c / sin_chih (炘馳) / jinhan3c / a09586617130987 等實體門市賣家定價。要進好貨基本不可能。**判：iPad 主流型號靠分類頁抓即可，無需獨立 query**
- **GoPro 3 筆 (Hero 8/11×2)** — 11 號連兩輪同款，Hero 8 太老一定貴 175%。建議 scrape.js QUERIES 加 `gopro`，min $5K max $15K，過濾掉 Hero 8 以下
- **AirPods Pro 3 出現** — $6,999 上澄橘 (店家)，看起來是新品開始進二手市場。注意 Pro 3 = 2026 新款，二手會貴
- **Switch 配件雜訊高** — 單片遊戲一筆 $500-1,400 < $2K 沒看頭，下次標題出現「單一遊戲片」< $2K 直接 SKIP 不用查

### 賣家觀察 — 店家識別模式
- 名字含 `3c` / `通訊` / `實體門市` / `炘馳` 規律出現：lee.3c, sin_chih, jinhan3c, sale3c_store, jimmy2016tw（連續上同款 SSD x2）
- 模式累積到夠多後可考慮加 sellers.json regex 規則自動歸入「店家」分類

### 連兩輪觀察
- **GoPro**：上輪 11 number $8,500，本輪 Hero 8 $6,990 + 11 number $8,000 → 3 筆，**建議加 query**
- **Snow Peak**：上輪兩筆 + 本輪掉出 raw → 收手，露營戰場 Rose 沒明顯需求

### CCD 相機警告再確認
- 本輪 Samsung MV900F $13,000（2012 古董 $500-1.5K 行情）— 完全離譜定價
- 規則生效：CCD/老相機定價跟漲已成常態，subagent 不用一一驗

## 2026-05-23 21:20 觀察（patrol 118+119 合併 — cap 5/cat + 權威控制首跑）

### 系統升級驗證
- process.js 加 `capByCategory` (top 5 per cat, vsSecondhand 升序) + `CATEGORY_AUTHORITY` map (PS5/Switch遊戲片/Steam Deck → 電玩主機)
- 本輪量小無觸發 cap，等下次 ≥5 筆品類時才會看到 mark seen 訊息

### 本輪量小但訊號清
- **patrol 118**: 12 筆 need_verify → 4 manual (ASUS FX507 電競筆電/捷安特vague/Seasonic 1000W 電源/EVGA RTX 3080) + 1 殺價 (RAKKA80 客制鍵盤 $8K 84%) + 7 skip
- **patrol 119**: 5 筆全雜訊 (Diptyque 蠟燭×2 + GD/PSA/虎爺洞)

### auto_query_suggest 累積
- **gopro 連 3 輪命中** (Hero 8/11×2) — 強烈訊號，可加 query: `gopro` min $5K max $15K (排除 Hero 7 以下)
- **伊萊克斯 連 2 輪** — 無型號掛單居多，先觀察一輪
- **snow peak** 重複出現相同 listing 兩輪 → 沒人接，可能定價高，不加 query

### 客制鍵盤類首現
- RAKKA80 / Glorious Model D3 滑鼠 / Logitech G413 機械鍵盤 同輪出現 — 客制周邊小社群活躍
- 可考慮加 `客制鍵盤` 或 `mechanical keyboard` query，但 Rose 沒明示興趣，先觀察

## 2026-06-04 01:12 觀察（patrol 440 — 63 待查清零）

### auto_query_suggest 命中（過去 deal 同品牌 ≥2）
- **Sony ZV-E10 連 2 筆**（$10,000 + $12,000）— vlog 機型號明確、複現，**建議加 query**：`Sony ZV-E10` min $7K max $15K，落在相機戰場
- **伊萊克斯 Electrolux ×3**：空氣清淨機 EP32-27UGA（重複掛單）+ 烤箱 EOT40DBD。清淨機已被「空氣清淨機」query 覆蓋，烤箱非 User 需求 → 不獨立加，觀察
- **國際牌 Panasonic ×3**：除濕機 F-Y45GX / 清淨機 F-P60LH / 烘乾機。品牌太廣，raw 加 query 會灌爆；要加得綁具體型號線，留給 User 裁決
- **onkyo / canon eos ×2**：皆同一 listing 在分類頁重複計數，非真訊號

### 賣家觀察（未自動分類，留紀錄）
- 高量未分類賣家：change12336(39)、gordon740124768(26)、meng69522(24)、stevecho(22)、mochimochi_7414(17) — 疑電商/批量，但本輪都沒產出 deal，暫不入 shops 免誤殺
- **vinyl_voyage(16) / marc_vintage_collection(12)**：疑黑膠賣家，User 收黑膠 → **不可 auto-skip**，反而值得翻 profile 找其他黑膠便宜貨
- jasin908(19)：SMAP 日系偶像 CD/VCD 連發，疑日系周邊商家，可考慮入 shops（本輪 CD 已 skip）

### 本輪驗價要點
- 5 件好貨偏二手手機/遊戲機，價值全卡在驗機（電池健康度/可開機/缺件）— 數據查不到，面交才算數
- Switch $3,300 遠低於行情（保外 $7,000），異常低 = 螢幕單機/故障風險高，列好貨但務必當面確認
- CCD 熱潮續燒：Canon A610 個人賣家 $8,000 跟到復古店翻新價，judged overpriced

## 2026-06-04 02:57 觀察（patrol 441 — 輕量輪，8 待查清零）

### 本輪 3 件進桶
- **Meta Quest 2 128G $5,000**（好貨，二手中位 $8,000）— VR query 命中，注意面板烙印/頭帶老化
- **Wacom Cintiq 16 DTK1660 $9,500**（殺價，二手中位 ~$11,000）— 繪圖螢幕，注意筆壓衰退/面板亮點
- **RedMagic 紅魔平板 NP03J $11,000**（手動）— 水貨機無台灣保固，國際新品 $22-25K，半價但維修要送國外

### 賣家觀察
- **miirkatvibe** 跨兩輪 3 件正貨（PreSonus Eris E5 XT / Wacom Cintiq / PS4 Pro），疑個人清倉或玩家賣家；目前 verdict 都是 manual/negotiate/overpriced 非便宜貨，先不分類，值得翻 profile 看有無其他便宜貨

### query 訊號（皆已被分類頁覆蓋，不獨立加 query）
- Sony ZV-E10 連 3 輪複現，但相機攝影分類頁已覆蓋（品類>品牌）
- AirPods Max 出現但多為澄橘店家貨（已排除）；音響耳機分類頁已覆蓋

### borderline
- PS4 Pro 1TB 雙手把 $7,500 judged overpriced（單機二手中位 $5,800），但附兩手把+極新可議到 $6,000-6,500，屬可砍價邊緣，已 drop 不進桶
