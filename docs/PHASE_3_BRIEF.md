# Engineering Island Lab — Phase 3 開發指示
## Lecture Video System & Weekly Content Publishing

Repository:
https://github.com/chingchechung/engineering-island-lab

## 一、開發背景

Phase 0／1、Phase 2、Phase 2.5 均已完成 Windows 11 Chrome／Edge 實機驗收，對應 PR #1、#2、#3 均已合併至 main。

目前已完成完整的 3D 課程群島，包括：

- 中央學院與最多 S01–S15 的不同主題島嶼。
- 正交相機旋轉、平移、縮放及聚焦。
- Day／Night 燈光切換。
- 木橋、鎖定柵欄與開放狀態。
- NPC 自主漫遊及點擊暫停。
- 動物、海面、鯨魚及背景旅人動畫。
- 共用大字體 Modal 介面。
- Quiz 與 Video-only 兩種課程設定。

本次正式進入 **Phase 3：Lecture 影片載入、觀看與教材發布流程**。

請從最新 main 建立：

`feature/phase-3-lecture-publishing`

最終建立唯一的：

**Draft PR #4 — Phase 3: Lecture Videos & Content Publishing**

本次只開發 Phase 3，不實作 Phase 4 的 Quiz 判答系統。

---

# Part A — 資料格式與系統架構

## 二、先閱讀現有規格

請先完整閱讀：

- AGENTS.md
- Plan.md
- README.md
- docs/PROJECT_SPEC.md
- docs/CONTENT_AND_RELEASE.md
- docs/PHASE_PLAN.md
- docs/PHASE_2_5_ACCEPTANCE.md

並確認最新 main 及已驗收的測試結果。

特別注意：

**目前所有 JSON 資料格式已經由教師定案，不得自行重新設計。**

請先將 AGENTS.md 與 Plan.md 的最新開發授權更新為 Phase 3，將 Phase 2.5 記錄為已驗收且 PR #3 已合併。先前 Phase 的限制保留為歷史紀錄，但不能與本次正式授權衝突。

## 三、保留現有課程設定

`public/course-config.json`：

```json
{
  "courseTitle": "數位電子學",
  "totalUnits": 12,
  "assignmentMode": "quiz"
}
```

規則：

- courseTitle 可修改。
- totalUnits 為 1–15。
- assignmentMode 只能是 quiz 或 video-only。
- 數位電子學目前使用 S01–S12。
- 不需要額外的 islands.json。
- 不需要資料庫、後端或課程管理 GUI。

## 四、Lecture 影片 JSON

每一單元獨立存放：

`public/course-videos/S01.json`

至：

`public/course-videos/S15.json`

每個檔案使用已定案的單一影片陣列格式：

```json
{
  "unitId": "S03",
  "title": "Lecture 02, Lecture 03, Lecture 04",
  "videos": [
    {
      "title": "ECE-VIDEO-S03-1",
      "url": "https://youtu.be/BXZ-w2Uogns"
    },
    {
      "title": "ECE-VIDEO-S03-2",
      "url": "https://youtu.be/l8rfHXkrsjk"
    },
    {
      "title": "ECE-VIDEO-S03-3",
      "url": "https://youtu.be/suAZ7Sx9zxE"
    }
  ]
}
```

這裡的影片僅是格式說明，不代表本次授權發布任何真實教材。

### 重要規則

1. 每單元影片數量不固定。
2. 允許只有一部影片，也允許十部或更多影片。
3. 完全依 `videos[]` 陣列順序顯示。
4. 不進行任何自動排序。
5. 不區分 CHT／ENG。
6. 英文影片不是必備。
7. 不新增分類、語言、播放時數、完成狀態等必要欄位。
8. 每部影片只需要 title、url。
9. 不自動嵌入或播放 YouTube。
10. 不記錄學生的觀看紀錄。

教師每週自行指定影片順序，AI 依指定順序產生 JSON。

---

# Part B — Lecture 小屋互動

## 五、開啟 Lecture 影片清單

目前每座島的 Lecture 小屋只能開啟 Phase 2 的占位說明。

請將已開放單元的 Lecture 小屋改為真正的影片清單入口。

操作：

1. 學生點擊已開放島的 Lecture 小屋或標牌。
2. 系統辨識所屬單元，例如 S03。
3. 讀取對應的 `course-videos/S03.json`。
4. 驗證資料。
5. 開啟 Lecture Modal。
6. 依照 JSON 順序顯示所有影片。

### Modal 外觀

沿用 Phase 2 已驗收的大字體樣式：

- 桌面最大寬度約 620px。
- 主標題約 28px。
- 內文約 18px。
- 手機內文至少 16px。
- 44×44px 關閉按鈕。
- 固定標題區。
- 影片清單在內容區上下捲動。

不可因為影片數量增加就讓 Modal 超出螢幕。

### 清單顯示

例如 S03：

**S03 — Lecture Videos**

1. ECE-VIDEO-S03-1 — 在 YouTube 觀看
2. ECE-VIDEO-S03-2 — 在 YouTube 觀看
3. ECE-VIDEO-S03-3 — 在 YouTube 觀看

這只是示意，正式介面可使用整齊的影片列及播放按鈕。

不需要影片縮圖，也不需要在網頁內播放 YouTube。

## 六、YouTube 開啟方式

點擊影片列或播放按鈕後：

- 另開新瀏覽器分頁至 YouTube。
- 原本的 3D 島嶼網頁保留。
- 原本的 Lecture Modal 保持開啟。
- 原本的捲動位置保留。
- 學生返回島嶼後，可以直接選擇下一部影片。

使用安全的外部連結方式：

`target="_blank" rel="noopener noreferrer"`

只有使用者實際點擊影片時才開啟外部網址。

不要自動開啟、預先開啟或重新導向整個島嶼網頁。

## 七、資料載入方式

請獨立建立 Lecture Data Loader／Validator 模組。

建議功能：

- 依 unitId 決定固定且安全的 JSON 路徑。
- 使用 Vite／Apache 相容的相對 URL。
- 只對已開放單元載入內容。
- 正式 Manifest 未開放的單元不得發出 Lecture 資料請求。
- 可在同一頁面記憶體中快取已驗證的影片清單。
- 不需要 localStorage、IndexedDB 或後端快取。
- 點擊 Lecture 時可以先開啟 Modal，顯示簡短載入狀態。
- HTTP 404、無效 JSON、unitId 不一致、無效影片網址等狀況應有清楚錯誤提示。
- 快速切換單元時，不可讓前一單元的延遲回應覆蓋目前 Modal。

請避免為每一座島分別編寫影片載入程式。

所有 S01–S15 共用相同 Loader 和 Modal。

---

# Part C — 資料驗證與安全

## 八、Lecture JSON 驗證

請新增必要的驗證函式。

至少檢查：

- unitId 為合法的 S01–S15。
- unitId 與請求檔案相符。
- title 為有效的非空字串。
- videos 為陣列。
- 每項影片均有非空 title。
- 每項影片均有有效 HTTPS YouTube URL。
- 保留原始順序及有效原始網址。
- 不接受 javascript:、data:、非 HTTPS 或偽裝成 YouTube 的網域。
- 不允許從 unitId 或 JSON 內容組成任意檔案路徑。

可接受標準 YouTube 影片連結及 youtu.be 短網址，不需要支援任意影音平台。

不必透過 YouTube API 驗證影片是否仍然公開；本階段只驗證網址格式及資料結構。

### 空清單與錯誤處理

- 如果某單元沒有影片，顯示「本單元尚無課程影片」。
- 如果資料載入失敗，顯示明確的載入錯誤。
- 不得自行虛構影片。
- 不得將其他單元的影片當作替代品。
- 發布前驗證器應阻止非預期的空清單進入正式發布。

請使用安全的 DOM 文字與連結建立方式，避免直接把 JSON 內容當作 HTML 執行。

---

# Part D — Manifest 每週發布

## 九、沿用既有 Manifest 格式

正式開放的唯一依據仍然是：

`public/assignments/manifest.json`

格式維持：

```json
{
  "schemaVersion": 1,
  "units": [
    {
      "unitId": "S01",
      "title": "Unit 01",
      "file": "S01.json"
    }
  ]
}
```

不得新增第二套發布清單，也不得改成其他 Schema。

### 行為

- Manifest 中列出的單元視為已開放。
- 其他單元仍可見、可聚焦欣賞地貌，但保持鎖定。
- 未開放單元的橋口柵欄與鎖牌繼續存在。
- 未開放單元不能開啟 Lecture。
- 先前已開放的島嶼必須保留。
- 開放單元的 Lecture JSON 要先通過驗證。

## 十、Quiz 與 Video-only 的發布差異

這點必須特別注意。

### Video-only 模式

- 只需要 Lecture JSON。
- 不需要 assignments/Sxx.json。
- 不生成題目 NPC。
- 不載入 Quiz 資料。
- Manifest 仍保留原本相容格式中的 file 欄位。
- 已開放島可以直接開啟 Lecture 清單。

### Quiz 模式

- Lecture 清單與 Video-only 共用相同功能。
- 題目 NPC 相關系統仍保留現有 Demo 行為。
- 真正的 Quiz JSON v1/v2、判答、解答、Google Form 將在 Phase 4 完成。
- 不得把缺少題庫的 Quiz 單元默默當成 Video-only。
- 不得把只有 Lecture 的 Quiz 單元宣稱為整個作業已準備完成。

正式的 Quiz 發布完整性驗證，必須在 Phase 4 相容題庫契約完成後才算完整。

本階段可在隔離的開發 Demo 中測試 Quiz 模式的 Lecture 功能，但正式 `quiz` 課程不應因本次開發而提前發布未完成的作業單元。

---

# Part E — 教師每週更新流程

## 十一、Notion PDF → AI Agent → JSON

教師目前的課程資料主要放在 Notion。

正式上課時，每週新增對應單元的 Lecture 影片。

若 AI 無法直接讀取 Notion 網頁，教師會提供另存的完整 PDF。

本專案不需要自行開發 Notion API、PDF 爬蟲、管理資料庫或影片編輯 GUI。

請建立清楚的 README 操作說明及可重複使用的教師 Prompt。

### 教師操作流程

1. 在 Notion 頁面確認最新課程內容。
2. 將頁面捲動到底部，確保動態內容已完整載入。
3. 使用列印／另存 PDF。
4. 提供 PDF 給 AI Agent。
5. 指定本週要更新的單元，例如 S04。
6. 若教師另有指定影片順序，明確告知 AI。
7. AI 讀取 PDF，擷取該單元所有 Lecture 影片。
8. 產生或更新 `public/course-videos/S04.json`。
9. 執行資料驗證。
10. 提供修改摘要與差異，讓教師確認。
11. 教師確認後，先準備及部署課程資料檔。
12. 最後才更新 Manifest，正式開放新島。

### PDF 注意事項

如果 PDF 內容缺頁、影片未完整載入、網址無法辨識：

- 必須回報。
- 不得猜測網址。
- 不得推測沒有出現的課程影片。
- 不得擅自補入上一學期的影片。
- 不得混入 Quiz 的題目說明影片或解答影片。

請將以上內容寫入 README 與獨立教師發布說明，例如：

`docs/TEACHER_PUBLISHING.md`

## 十二、README 中必須提供的 Prompt

請將以下範本整理成正式、可直接複製的教師操作指示：

「請依照 Engineering Island Lab 專案 README 與 CONTENT_AND_RELEASE.md，閱讀我提供的最新課程 PDF。

本次要更新的單元是 S04。

請找出 S04 對應的全部 Lecture 教學影片，擷取標題及 YouTube 網址，依 PDF 順序整理；若我另有指定順序，則以指定順序為準。

請更新 public/course-videos/S04.json。

不要增加 CHT／ENG 分組，不要自行排序，不要修改題目或解答影片。

完成後執行 JSON 驗證，列出新增與修改的影片，並告訴我目前發布清單需要如何修改。

先提供我審查，不要自行更新正式 Manifest、合併 PR 或部署網站。」

README 應清楚說明：教師未來只需替換 PDF、單元編號及必要的影片順序。

---

# Part F — 發布前驗證工具

## 十三、建立輕量的 Content Validator

請新增一個簡單的 Node.js 驗證腳本，例如：

`scripts/validate-content.js`

並提供：

`npm run validate:content`

用途：

- 驗證 course-config.json。
- 驗證 Manifest 格式及單元範圍。
- 驗證已開放單元的 Lecture JSON。
- 檢查影片網址與單元編號。
- 確認影片陣列順序未被自動重排。
- 區分 quiz 與 video-only 的資料要求。
- 清楚指出缺少的檔案及錯誤原因。
- 必要時可指定單一 Sxx 進行候選內容驗證。
- 對尚未實作的 Phase 4 Quiz 完整性驗證標示「尚未支援」，不能假裝題庫已驗證通過。

工具只需要驗證與產生報告，**不得自動更動 Manifest 或發布教材**。

不得因此建立複雜的資料管理系統。

## 十四、正式部署順序

請在文件中明確說明：

**先準備內容，最後發布 Manifest。**

如果教師未來使用 Apache 靜態網站：

1. 先上傳新單元的 Lecture JSON。
2. Quiz 課程還必須先準備完整且經 Phase 4 驗證的題庫。
3. 驗證新教材可以正常載入。
4. 最後上傳更新的 Manifest。

如果是重新 build 整包 dist，則必須先確認所有正式內容及發布清單一致，再進行整包部署。

避免新島已開放，但影片資料仍為 404。

另外提醒：Manifest 是顯示與開放控制，不是安全存取控制。未公開的題庫草稿不得放進對外可直接下載的 Apache 路徑。

---

# Part G — Demo 與正式資料隔離

## 十五、測試資料原則

請保留 Phase 2.5 已有的：

`?demo=1`

機制。

為了測試 Lecture 功能，可在 `src/demo/` 建立獨立的影片測試資料。

至少準備：

- S01：一部影片。
- S02：四部影片。
- S03：十部影片。
- S04：不同排列順序的影片。
- 一個缺少影片資料的錯誤情境。

也要驗證沒有英文影片時正常顯示。

Demo 可使用安全測試連結或模擬資料，但不得把虛構連結當成正式教材發布。

只有 Vite development mode 且明確使用 Demo 參數時，才能載入 Demo 資料。

正式 production build 不得透過 query parameter 啟用 Demo。

**正式 `public/assignments/manifest.json` 保持：**

```json
{
  "schemaVersion": 1,
  "units": []
}
```

不要因為測試需要而直接公開 S01–S12。

---

# Part H — UI 與現有功能相容性

## 十六、沿用目前的 Modal

Phase 2 已驗收目前的大字體 Modal。

本次 Lecture 清單必須沿用相同的閱讀設計：

- 與 NPC／操作說明一致的字級。
- 桌面最大寬度約 620px。
- 清楚的關閉按鈕。
- 影片清單獨立垂直捲動。
- 不讓整個網頁捲動。
- 手機窄畫面仍能閱讀與點擊。
- 長標題能換行，不發生水平溢出。

新增的影片開啟按鈕也應該具有足夠大的點擊區域。

## 十七、不可破壞 Phase 2.5

請保留：

- Day／Night 模式。
- 360° 相機旋轉。
- 右鍵與 Shift＋左鍵平移。
- 滾輪縮放。
- 全域與單島聚焦。
- CSS2D 島名及 NPC 標牌。
- NPC 點擊停止、關閉後恢復。
- 四隻外海鯨魚。
- 背景小旅人跨島行走。
- 每島三隻動物。
- 鎖定島與柵欄。
- Video-only 無 NPC。
- 正式 Manifest 與 Demo 隔離。

開啟 Lecture Modal 時，不得因為滾輪捲動而讓背景相機旋轉、平移或縮放。

Day／Night 的場景動畫與背景角色可以繼續運行。

---

# Part I — Subagents 平行開發

## 十八、建議使用兩位 Subagents

本次工作可分成兩個獨立模組。

### Subagent A — Lecture Data & Validation

負責：

- Lecture JSON Schema 與驗證。
- 安全的 YouTube URL 檢查。
- Lecture Loader。
- 單元資料錯誤處理。
- Content Validator CLI。
- 單元測試。

### Subagent B — Lecture Modal & UI

負責：

- 影片清單 Modal。
- 影片列與 YouTube 外部連結。
- 任意數量清單的捲動。
- 桌面與手機閱讀版面。
- 載入中、空清單與錯誤畫面。
- UI 測試。

### Main Agent

負責：

- 建立及凍結 Subagent 介面。
- 分配不重疊的檔案所有權。
- 整合 src/main.js 與現有互動系統。
- Manifest、quiz／video-only 模式整合。
- Demo 與 production 隔離。
- README／教師 Prompt。
- 發布流程文件。
- 完整回歸與瀏覽器測試。
- Git 與 Draft PR。

請實際使用可用的 Subagent 工具平行執行，而非僅在報告中宣稱平行。

Subagents 不得同時修改 src/main.js、src/config.js、AGENTS.md 等共用核心；需要改共用契約時交由 Main Agent 統一整合。

---

# Part J — 測試與驗收

## 十九、Lecture 功能測試

至少測試：

1. 一部影片正常顯示。
2. 四部影片正常顯示。
3. 十部影片正常顯示並可捲動。
4. 更多影片時視窗不超出畫面。
5. 原始 JSON 順序完全保留。
6. 沒有英文影片也正常。
7. 混合中英文標題正常。
8. YouTube 按鈕另開新分頁。
9. 開啟 YouTube 後原 Modal 保留。
10. 返回原網頁後維持清單捲動位置。
11. Esc／關閉按鈕正常。
12. Modal 滾動不影響相機。
13. 404 或 JSON 錯誤顯示清楚訊息。
14. 非法 URL 不會產生可開啟的連結。
15. 快速切換單元不會顯示錯誤的前一單元影片。

## 二十、發布與模式測試

至少測試：

1. totalUnits = 1、12、15。
2. Manifest 空清單時全部鎖定。
3. Demo 開放 S01–S04 時，只有四座島能開 Lecture。
4. 未開放島不請求 Lecture JSON。
5. Video-only 不 fetch assignment JSON。
6. Video-only 完全沒有 NPC。
7. Quiz Demo 的既有 NPC 仍正常。
8. Quiz 模式 Lecture 清單可以獨立於 Quiz 判答運作。
9. 缺少 Quiz 正式題庫時，不宣稱整個作業已準備完成。
10. Production 不接受 Demo query 開放單元。
11. Manifest 及資料 JSON 不允許路徑穿越或不合法 unitId。
12. Apache 子目錄能正常讀取 course-videos/Sxx.json。

## 二十一、瀏覽器與相容性

測試環境：

- Windows 11 Chrome／Edge 為教師最終驗收。
- 自動化至少使用 Chromium。
- 1366×768。
- 1920×1080。
- 390px 窄畫面。

必須涵蓋：

- 白天與夜晚。
- 不同相機旋轉角度。
- 已開放／未開放島。
- Quiz／Video-only。
- Lecture Modal。
- NPC Demo 回歸。
- 外部 YouTube 連結。
- Modal 開啟及關閉。
- 頁面重新整理。

請執行：

```bash
npm test
npm run build
npm run test:smoke
npm run test:browser
npm run validate:content
```

若 `validate:content` 尚未完成，請先將其加入 package.json，並在本次交付前完成驗證。

保留原有所有 Phase 2.5 自動化測試。

## 二十二、測試截圖

請提供真實瀏覽器截圖，包括：

- S01 一部影片的 Lecture Modal。
- S02 四部影片的 Modal。
- S03 十部影片且可捲動的 Modal。
- 夜間島嶼加 Lecture Modal。
- Video-only 模式的 Lecture Modal。
- 390px 窄畫面。
- 未開放島的鎖定狀態。
- JSON 錯誤或缺影片資料提示。

不使用 AI 生成圖片冒充實際測試畫面。

---

# Part K — 最終交付

## 二十三、文件

請新增或更新：

- AGENTS.md
- Plan.md
- README.md
- docs/TEACHER_PUBLISHING.md
- docs/PHASE_3_ACCEPTANCE.md
- docs/CONTENT_AND_RELEASE.md（只補充操作說明，不修改已定案契約）

請確保 README 包含教師每週更新影片的完整 Prompt，且不必理解 Three.js 或手動編寫程式。

## 二十四、GitHub PR

完成後建立：

**Draft PR #4 — Phase 3: Lecture Videos & Weekly Publishing**

PR 必須包含：

- 完成項目與限制。
- 模組與檔案清單。
- Lecture JSON Loader／Validator 設計。
- Demo／Production 隔離方法。
- 教師每週 PDF 更新流程。
- Content Validator 使用方式。
- 單元、瀏覽器、Smoke 測試結果。
- 代表性截圖。
- Windows 11 驗收步驟。
- 尚未完成的 Phase 4 Quiz 功能。

## 二十五、禁止事項與停止點

本次不得：

- 修改已定案的 JSON 格式。
- 自動發布正式 S01–S12 教材。
- 修改正式 Manifest 開放清單。
- 自行抓取或發布教師真實 Notion 課程影片。
- 重新設計 3D 群島。
- 開發新動物、島嶼或相機功能。
- 開發完整 Quiz 判答與 Google Forms。
- 修改其他 Repository。
- 新增後端、資料庫或學生登入。
- 自行合併 PR、Tag、Release 或部署學校網站。
- 自行進入 Phase 4。

**本次只完成 Phase 3。**

最終交付唯一 Draft PR #4，完成測試後停止，等待教師 Windows 11 實機驗收。

### Phase 3 最重要的驗收標準

1. 學生點擊已開放島的 Lecture 小屋，能看到清楚、可捲動的影片清單。
2. 影片數量完全彈性，排列順序與 JSON 完全一致。
3. 點擊影片另開 YouTube，原本島嶼與 Modal 保留。
4. 教師只需要提供課程 PDF、單元編號及必要的順序指示，AI 就能準備相應 JSON。
5. 只有教師核准並更新 Manifest 後，新的島嶼才正式開放。
6. Video-only 不需要題庫；Quiz 正式判答仍留給 Phase 4。
7. 所有已驗收的 3D 場景、日夜、旋轉、NPC 及背景動畫保持正常。