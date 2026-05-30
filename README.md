# Carousell 二手好物巡邏

Carousell Taiwan 二手商品自動巡邏 + 分流 + 驗價系統。每輪掃 ~2000 筆 listing，過濾到 10-30 件待查，驗價後分桶（好貨 / 殺價 / 持平 / 過貴 / 詐騙），結果同步到 GitHub + Gist。

User 端只看 `DEALS.md` 桶內品項做決定，每件決定後 mark_seen 進 `seen_ids.json`，下輪不再看到。

> 動態 deal 報告 → [DEALS.md](DEALS.md)　｜　檔案地圖 → [MOC.md](MOC.md)　｜　巡邏流程 → [carousell_workflow.md](carousell_workflow.md)

## 原則

**1. 三層過濾 pipeline**

```
raw_results (~2000) → process.js (規則) → need_verify (~10-30) → subagent (BigGo+多源) → 分桶
```

每層砍 90%。raw 大但便宜（爬蟲），verify 貴（subagent token），必須先用 process.js 規則攔住 niche/<NT$2K/型號未列/重複賣家，剩下才送 verify。

**2. 分桶定義**

| 桶 | 條件 | 意義 |
|---|---|---|
| 好貨 | vsNew ≤30% 或 vsSecondhand ≤70% | 真撿到，速決 |
| 殺價 | vsSecondhand ≤90% 且價格 ≥NT$3K | 合理但能再殺 |
| 手動 | vsNew ≤70% 但二手樣本不足 | 邊緣值待人工 |
| 持平 | 不入桶但 verify 過 | file 留 verified_prices.json 防下次重驗 |
| 過貴 | vsSecondhand >100% | 賣家標太貴，直接刷 |

**3. vsSF 比 vsNew 重要**

賣家很愛用「對新品打 8 折」當話術，但新品還能買到時，**二手中位才是真行情**。subagent verify 必算 vsSF；vsSF > 100% 自動 file 過貴，不管 vsNew 多漂亮。

**4. 賣家含糊 = 風險訊號**

title 缺容量（iPad 沒寫 G）、卡口（相機沒寫 EF/RF）、尺寸（Apple Watch 沒寫 44/49mm）、版本（Sony 70-400 沒寫 G/G2）→ 一字差價兩倍，直接 SKIP，不送 verify。

**5. 太甜也是 trap**

vsSF < 50% 看似撿到，實際多半是電池衰退、副廠零件、盜刷品、序號黑名單、磚機、改機。subagent 提示「過便宜警報」就 file SKIP，不要因為 algorithm 抓到好貨 bucket 就 inject。

**6. 世代取代殘值跌**

同型號有新世代取代（QC45 → QC Ultra、Marshall Middleton 一代 → 二代、RTX 4060 Ti 8GB → 5060 Ti 16GB）= 殘值在下跌軌道，當下 deal 半年後就是新中位。verify 時要 subagent 標明世代狀態。

**7. 結構性訊號 ≠ 個別 deal**

同型號同價格在 Carousell 重複出現（AirPods 4 ANC 在保 NT$2,500 連 3 輪 / JBL FLIP 6 NT$3,150-3,800 連 2 輪）= 水貨/平輸/盜刷批次，不是真 deal。重複 ≥2 次自動加進 recurring_pattern 不再送 verify。

**8. 不無腦丟 subagent**

每件 verify ≈ 30K-50K subagent token。先用以下規則 SKIP：
- 任何 < NT$2,000
- niche keyword: 古銅雕/紫砂/玉石/手珠/水晶/絨毛娃娃/拍立得卡/應援棒/早期收藏/翡翠/郵票/老物
- 重複賣家 (sellers.shops / sellers.overpriced)
- 型號/容量/卡口未列
- >85% 新品持平
- 老型號（相機停產卡口 / 8 代以前 CPU / 11 代以前筆電）

剩下 ≥NT$3K + 有品牌型號 + 不熟領域 likely 有行情 才送 subagent。

## 跑法

每輪（cwd 是 repo root）：
```bash
node scripts/scrape.js && node scripts/process.js
# 手動分流 state/need_verify.json
# subagent verify 高價未知品
# 寫 state/verified_prices.json
node scripts/process.js   # 重跑生 outputs/DEALS.md
git add -A && git commit -m "patrol N: ..." && git push
gh gist edit <gist-id> outputs/DEALS.md
```

清掉已決定的 pending：
```bash
node scripts/mark_seen.js
```

## 系統檔案

完整檔案 / function 索引見 [MOC.md](MOC.md)。
