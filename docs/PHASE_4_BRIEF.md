# Engineering Island Lab — Phase 4 開發指示
## NPC Quiz Integration, Legacy JSON Compatibility & Google Forms

Repository:
https://github.com/chingchechung/engineering-island-lab

## 一、開發背景與目標

Engineering Island Lab 已完成 Phase 0–3，PR #1–#4 均已合併到 main，並通過教師 Windows 11 Chrome／Edge 實機驗收。

最新 Phase 3 Merge Commit：

`dd3f96f4c301f0f4ecfbe1a4ffc7e360ecacd159`

本次正式授權開發：

**Phase 4 — Quiz 問答作業系統整合**

請從最新 main 建立：

`feature/phase-4-quiz-integration`

最終建立唯一的：

**Draft PR #5 — Phase 4: NPC Quiz & Google Forms Integration**

本階段主要目標：

1. 精確沿用既有 Maze／City Lab 題庫 JSON v1/v2 契約。
2. 將 Q01–Q05 的正式題目資料整合到既有 3D NPC。
3. 學生點擊 NPC 後，開啟題目、觀看題目影片並選擇答案。
4. 答錯可重試，已答對的題目不會被撤銷。
5. 答對後才解鎖該題解說影片。
6. 同單元所有題目答對後，解鎖 Google Form。
7. 保留 quiz／video-only 兩種課程模式。
8. 保留 Phase 3 Lecture 影片系統及所有已驗收的 3D 功能。

**重要：本次不是重新設計一套 Quiz，而是把之前已驗證的問答資料與行為適配到新的島嶼介面。**

---

# Part A — 參考來源與相容性

## 二、必須先閱讀的文件

本專案：

- AGENTS.md
- Plan.md
- README.md
- docs/PROJECT_SPEC.md
- docs/CONTENT_AND_RELEASE.md
- docs/PHASE_PLAN.md
- docs/PHASE_3_ACCEPTANCE.md
- docs/TEACHER_PUBLISHING.md

舊專案參考：

Engineering City Lab v1.0.0：

https://github.com/chingchechung/engineering-city-lab/tree/v1.0.0

Engineering Maze Lab 固定參考版本：

https://github.com/chingchechung/ece_hw_webproject/tree/70cc35d9ce828bcd5357f16fe85f303aa2d30cd9

請優先閱讀 City Lab 的：

- docs/assignment-compatibility.md
- docs/assignment-reuse.md
- docs/phase-3-results.md
- docs/teacher-publishing.md
- js/assignment-contract.js
- js/assignment-loader.js
- js/assignment-rules.js
- js/assignment-validator.js
- js/assignment-session.js
- js/education-ui.js
- schemas/assignment-v1.schema.json
- schemas/assignment-v2.schema.json
- schemas/manifest-v1.schema.json

並對照 Maze Lab 固定版本中的原始驗證器、Schemas、合成測試資料與跨語言測試。

不得只根據 README 文字自行猜測資料結構。

## 三、原始資料契約必須精確相容

### Assignment v1

- schemaVersion = 1。
- 每單元 4 或 5 題。
- 題目依序為 Q01–Q04，可增加 Q05。
- 每題固定四個選項 A–D。
- 使用 correctOption，只有一個正確答案。

### Assignment v2

- schemaVersion = 2。
- 每單元 4 或 5 題。
- 每題可以有三或四個選項。
- 使用 correctOptions，包含一個或多個可接受答案。
- 學生仍然只能單選一個選項。

例如：

`correctOptions: ["A", "C"]`

代表單選 A 或 C 都算答對。

**絕對不能改成複選題，也不能要求學生同時勾選 A 和 C。**

### 共同欄位

單元：

- schemaVersion
- unitId
- title
- googleFormUrl
- questions

每題：

- id
- questionVideoUrl
- explanationVideoUrl
- options
- correctOption（v1）或 correctOptions（v2）

另外保留原本的選用文字欄位：

- title
- prompt
- explanationText

questionVideoUrl 與 explanationVideoUrl 都必須保留原有網址驗證與資料要求。

**解說影片 URL 在原本正式 JSON 契約中是必要欄位，但學生是否點擊觀看解說是自由選擇。**

不要因為觀看解說是選用行為，就擅自將 JSON 的 explanationVideoUrl 改成不必填。

## 四、S01–S15 擴充

原本 Maze／City Lab 題庫設計最多支援 S12。

本專案需支援：

S01–S15。

請：

1. 保留舊版 S01–S12 的全部驗證及判答語意。
2. 僅將必要的單元 ID、檔名、最大單元數限制擴展至 S15。
3. 不改變 Manifest v1 格式。
4. 不修改題目欄位名稱。
5. 不自動將 v1 轉成 v2。
6. 不為三選項題目額外產生 D。
7. 確認 S13–S15 也能使用 v1 與 v2。

原本教師使用的 Python 出題 GUI 屬於另一個 Repository。

**本次不修改舊 GUI。**

只需在本專案文件記錄：未來若教師使用 S13–S15，須確認出題 GUI 已支援，或由 AI 產出符合相同 Schema 的 JSON。

## 五、驗證規則與來源一致

優先重用或移植舊版已驗證的：

- normalizeUnit
- validateUnitV1
- validateUnitV2
- validateUnit
- acceptsAnswer
- YouTube URL rules
- Google Forms URL rules

必須保留：

- 原本的字串正規化語意。
- 嚴格欄位及型別檢查。
- 選項順序。
- 題目 ID 唯一且連續。
- 禁止混合 v1／v2 答案欄位。
- URL 白名單及 placeholder rejection。
- 與 unitId 對應的精確 Sxx.json 檔名。
- Google Forms URL 格式驗證。

如需移植舊程式碼，請記錄來源 Commit、檔案及相容性差異，保留適當來源註記及授權資訊。

不要重新寫出看似類似、實際行為不同的簡化驗證器。

---

# Part B — 題庫載入與 Manifest

## 六、正式題庫位置

正式題庫存放：

`public/assignments/Sxx.json`

目前已有：

`public/assignments/manifest.json`

沿用 Manifest v1：

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

Manifest 是課程開放的唯一權威。

### 載入限制

- 只對已開放單元載入 Assignment。
- 不讀取 Manifest 未列出的題庫。
- 不使用任意 JSON 路徑。
- 不使用使用者可控制的檔名。
- 依固定相對路徑載入。
- 驗證通過後才能作答。
- 缺檔或驗證錯誤不得自動切換 video-only。
- HTTP／JSON／驗證錯誤應有清楚的訊息。

請沿用 Phase 3 已實作的安全載入、非同步請求及快取管理模式，避免重複開發。

## 七、Quiz 模式的 NPC 數量

目前 Phase 3 的正式模式沒有真實題庫 NPC，僅 Demo 模式使用固定的四或五位角色。

Phase 4 必須改成：

**每個已開放單元的 NPC 數量由該單元驗證成功的 Assignment JSON 決定。**

- 四題：Q01、Q02、Q03、Q04。
- 五題：Q01、Q02、Q03、Q04、Q05。

不要使用整門課固定的 Demo 題數去決定所有島。

例如：

- S01 可以有四位 NPC。
- S02 可以有五位 NPC。
- S03 可以有四位 NPC。

這些必須能在同一個 3D 群島內共存。

可以對已開放單元預先載入必要題庫資料，或設計有效率的延遲載入方式，但必須滿足：

1. 未開放單元完全不載入題庫。
2. 有效題庫才能產生可作答的 NPC。
3. 載入失敗不產生可誤導學生的假題目。
4. NPC 數量與題庫完全一致。
5. 不影響既有的漫遊、安全範圍及相機操作。
6. 所有異步處理須防止 stale response 錯置到其他島嶼。

請選擇最簡單且易維護的架構。

---

# Part C — NPC Quiz 互動

## 八、點擊 NPC

學生在已開放島嶼點擊 Q01–Q05 NPC。

請沿用目前 Phase 2 已驗收的行為：

- NPC 自主緩慢漫遊。
- 滑鼠點擊模型或 Qxx 標牌。
- NPC 立即停止移動。
- 開啟共用大字體 Modal。
- 關閉 Modal 後 NPC 恢復漫遊。

不需要讓玩家角色走到 NPC 旁邊。

不需要 WASD、物理碰撞或尋路。

## 九、Quiz Modal

Modal 需顯示：

1. 單元編號與題目編號。
2. 題目標題（有提供時）。
3. 題目文字說明（有提供時）。
4. Watch Question Video。
5. 依題庫順序顯示三或四個選項。
6. 單選答案。
7. Submit Answer。
8. 答題結果。
9. 答對後才顯示解說影片及選用文字說明。
10. 完成整單元時顯示 Google Form 入口。

沿用已驗收的閱讀字級：

- 桌面內文約 18px。
- 主標題約 28px。
- 手機內文至少 16px。
- 選項按鈕需清楚且容易點擊。
- 長題目及解說文字可在 Modal 內捲動。

不得降低現有 Lecture Modal 的閱讀品質。

## 十、Question Video

使用題目中的：

`questionVideoUrl`

顯示：

**Watch Question Video**

規則：

- 題目尚未答對時即可觀看。
- 必須由學生主動點擊。
- 另開 YouTube 分頁。
- 原本島嶼和 Quiz Modal 保留。
- 不自動播放。
- 不記錄觀看時間。
- 不要求學生一定觀看後才能答題。

使用：

`target="_blank" rel="noopener noreferrer"`

## 十一、答題規則

### 答錯

- 顯示錯誤提示。
- 保留目前 Modal。
- 可重新選擇答案。
- 不將該題標為完成。
- 不清除其他已完成的題目。
- 不重設整個單元。
- 不移動相機或 NPC。
- 不顯示解答影片。

### 答對

- 顯示正確提示。
- 標記該題通過。
- 更新本單元完成數量。
- NPC Qxx 標記增加綠色勾號或明顯完成標示。
- 解鎖該題 explanationVideoUrl。
- 若有 explanationText，顯示該段文字。

學生再次點擊已完成的 NPC，可以重新檢視題目及解說。

已通過題目即使再次嘗試錯誤答案，也不可撤銷之前的通過狀態。

### v2 判答

請直接使用相容的 acceptsAnswer 語意。

例如：

`correctOptions: ["B", "C"]`

只要學生單選 B 或 C，即通過。

不需要複選框。

---

# Part D — 單元完成與 Google Forms

## 十二、完成條件

每座島的作業完成條件：

**該單元全部有效題目均答對。**

四題單元：

4／4 完成即可。

五題單元：

5／5 完成即可。

不得把不存在的 Q05 算進完成條件。

不得要求學生走到碼頭或返回中央學院。

## 十三、Google Form 解鎖

只有同一單元全部答對，才顯示：

**Open Google Form**

使用該單元 JSON 的：

`googleFormUrl`

要求：

- 另開 Google Forms 分頁。
- 不自動送出。
- 不追蹤表單提交。
- 不偵測成績。
- 不保存學生姓名。
- 不自行建立成績資料庫。

Google Form 入口至少應在整單元完成時的 Quiz Modal 顯示。

另外請提供一個**不遮擋 3D 島嶼的小型完成提示或按鈕**，使學生關閉 Quiz Modal 後仍可找到已解鎖的 Google Form。

可以整合在現有左下方單元導覽附近，或使用精簡的狀態區。

不要重新加回大型 HUD、右下設定面板或占據大量畫面的作業卡片。

## 十四、每個單元的狀態必須獨立

目前群島可同時開放多個單元，學生也可以自由切換島嶼觀察。

因此建議 Quiz session 以 unitId 區分。

例如：

- S01：4／4。
- S02：2／5。
- S03：0／4。

在同一個網頁尚未重新整理的期間，切換相機、觀看其他島嶼或返回中央學院，不應意外清除已完成題目。

這是針對群島式介面的必要適配，與舊 City Lab 的明確 Load Unit 操作不同。

### 進度保存範圍

只保存在目前開啟網頁的 JavaScript 記憶體中。

不得使用：

- LocalStorage
- IndexedDB
- Cookie
- 後端資料庫
- 學生帳號

重新整理網頁後，暫時作答進度清除。

**課程開放進度是教師的 Manifest；答題完成進度只是學生目前頁面內的暫時狀態。兩者不能混淆。**

---

# Part E — 既有 Lecture 與 Video-only 相容

## 十五、Lecture 功能不得改動

Phase 3 已完成：

- 可變數量影片。
- 原始 JSON 順序。
- 可捲動 Modal。
- YouTube 另開分頁。
- 安全 URL 驗證。
- 記憶體快取。
- Demo／Production 隔離。

本次 Quiz 功能不得破壞這些行為。

Lecture 影片與 Quiz 題目影片是不同資料來源。

Lecture 使用：

`course-videos/Sxx.json`

Quiz 使用：

`assignments/Sxx.json`

不得混用。

## 十六、Video-only 模式

當：

`assignmentMode = "video-only"`

系統必須：

- 完全不建立 Q01–Q05 NPC。
- 不顯示 Quiz UI。
- 不顯示答題進度。
- 不顯示 Google Form。
- 不載入 Assignment JSON。
- 保留 Lecture 影片。
- 保留所有島嶼、動物、背景旅人、海面、橋樑、鯨魚及日夜功能。

即使 Manifest 中保留 file 欄位，也不能因此載入題庫。

---

# Part F — 教材驗證與每週發布

## 十七、擴充 Content Validator

Phase 3 已有：

`npm run validate:content`

以及：

`npm run validate:content -- --unit S04`

本次應擴充為正式 Quiz 相容驗證。

請保留 Phase 3 的 Lecture 候選驗證流程，避免破壞教師目前的每週影片準備方式。

建議新增：

`npm run validate:content -- --unit S04 --with-quiz`

用來檢查單一候選單元的 Lecture 及 Quiz 資料。

不帶 --unit 時，應完整驗證 Manifest 中所有已開放單元：

- Lecture JSON。
- Quiz 模式下的 Assignment JSON。
- v1/v2 Schema。
- 單元 ID 與檔名。
- Manifest title 與題庫 title 的相容性。
- 四或五題及 Q01–Q05。
- 正確選項。
- 題目及解說 YouTube URL。
- Google Form URL。

Video-only 仍不需題庫。

請清楚區分：

- Lecture 候選驗證成功。
- Quiz 候選驗證成功。
- 整份正式發布內容完整。
- 沒有任何單元發布。

當正式 Manifest 為空時，驗證器可以成功，但不能宣稱有課程作業已準備完成。

驗證器仍保持唯讀，不自動修改 JSON／Manifest，也不部署。

## 十八、教師每週發布流程

請更新：

- docs/TEACHER_PUBLISHING.md
- docs/CONTENT_AND_RELEASE.md
- README.md

Quiz 課程每週流程：

1. 教師先準備該週 Lecture JSON。
2. 使用既有 Python 出題 GUI 或 AI 協助產出原格式題庫 JSON。
3. 驗證 v1／v2 契約。
4. 確認題目影片與解說影片。
5. 確認 Google Form 可開啟並接受學生提交。
6. 執行完整候選內容驗證。
7. 提供教師審查差異。
8. 核准後先部署 Lecture 與 Assignment JSON。
9. 確認靜態 HTTP 路徑正常。
10. 最後更新 Manifest，開放該週島嶼。

**不得為了開發測試，自行將 S01–S12 加入正式 Manifest。**

Manifest 不能當成私密資料保護。

公開目錄中的答案可以被下載，這是開放式練習作業，不是安全考試平台。

---

# Part G — Demo 與測試資料

## 十九、測試資料必須隔離

正式：

`public/assignments/manifest.json`

繼續保持：

```json
{
  "schemaVersion": 1,
  "units": []
}
```

正式題庫不得使用其他課程的私人草稿或未經教師授權的答案。

Demo 題庫請放在：

`src/demo/`

或專用 tests／fixtures 目錄。

可以參考固定版本 Maze／City Lab 已驗證的合成測試資料。

至少準備：

- v1 四題。
- v1 五題。
- v2 四題。
- v2 五題。
- v2 三個選項。
- v2 多個接受答案。
- 錯誤 JSON。
- 不合法 YouTube URL。
- 不合法 Google Form URL。
- 不同島有不同題數。

原本的：

`?demo=1`

只允許 Vite Development 使用。

正式 Production 不能透過 URL 參數啟用測試題庫或開放島嶼。

---

# Part H — Subagents 平行開發

## 二十、建議三位 Subagents

本次可利用三位 Subagents 平行完成。

### Subagent A — Legacy Quiz Contract

負責：

- 舊版 JSON v1/v2 Schema。
- 原驗證器及 URL 規則相容。
- S01–S15 必要擴充。
- acceptsAnswer。
- 合成 fixture。
- 契約及跨版本測試。
- 程式碼來源與相容性文件。

### Subagent B — Quiz Data & Session

負責：

- Manifest Allowlist 題庫載入。
- 請求取消及過期回應保護。
- validated assignment cache。
- 各單元記憶體 Session。
- 答題、重試及完成狀態。
- Google Form 解鎖的純邏輯。
- 獨立單元測試。

### Subagent C — Quiz Modal UI

負責：

- 題目標題、說明及影片按鈕。
- 單選選項及 Submit Answer。
- 答錯重試與答對提示。
- 解說影片及 explanationText。
- 完成提示與 Google Form 連結。
- 桌面／手機版面。
- Modal、鍵盤與安全外部連結測試。

### Main Agent

負責：

- 凍結共用介面及檔案所有權。
- 3D NPC 與正式題庫對應。
- 各島四或五位 NPC 生成。
- NPC 漫遊／暫停／恢復。
- Qxx 完成後的視覺狀態。
- Lecture 與 Quiz Modal 共用整合。
- Quiz／Video-only 模式切換。
- Content Validator 整合。
- 整體回歸、瀏覽器測試、文件與 PR。

不得讓多個 Subagents 同時修改共享的 src/main.js、src/scene.js、src/ui.js、src/config.js。

請先定義共用介面，再平行實作，最後由 Main Agent 整合。

---

# Part I — 測試及驗收

## 二十一、資料契約測試

至少涵蓋：

1. v1 四題／五題。
2. v2 四題／五題。
3. v2 三選項與四選項。
4. v2 單一或多個可接受答案。
5. v2 單選 A 或 C 均通過的案例。
6. 非法答案標籤。
7. 題目數量錯誤。
8. 重複或不連續 Qxx。
9. 混合 correctOption／correctOptions。
10. 缺少必要影片或 Form URL。
11. 非法、偽裝或 placeholder URL。
12. Manifest 不合法檔名及單元。
13. S12、S13、S14、S15 邊界。
14. 原有 S01–S12 判答與驗證結果不變。

請盡可能重用舊專案的已驗證案例，並記錄來源測試數量與相容性差異。

## 二十二、Quiz 行為測試

至少驗證：

- Q01–Q04／Q05 正確配置。
- 不存在的 Q05 不顯示。
- 點 NPC 正確打開對應題目。
- 答錯可重試。
- 答錯不重設別題。
- 答對後標示完成。
- 答對後可看解說。
- 答對後 optional explanationText 正確顯示。
- 已完成題目可以再次查看。
- 已完成題目不會因重訪或錯答撤銷。
- 4／4 時 Google Form 解鎖。
- 5／5 時 Google Form 解鎖。
- 3／4、4／5 時不解鎖 Form。
- 換島時不錯置單元進度。
- 相機旋轉、縮放或切換日夜不清除進度。
- 網頁重新整理後進度歸零。
- 載入失敗不污染其他單元。
- 舊請求回應不能覆蓋新視窗。

## 二十三、完整瀏覽器測試

使用 Chromium 進行自動化測試，並提供 Windows 11 Chrome／Edge 實機驗收步驟。

至少測試：

1. v1 四題完整流程。
2. v2 四題、多個接受答案完整流程。
3. 五題單元完整流程。
4. 點題目影片另開 YouTube。
5. 答對後解說影片才出現。
6. 四／五題全部答對後 Form 才出現。
7. Form 使用原題庫有效網址。
8. 所有外部連結使用安全新分頁。
9. Modal 開啟時相機操作隔離。
10. NPC 暫停／恢復。
11. 旋轉 180° 後 Qxx 點擊仍正常。
12. Night Mode 問答正常。
13. Video-only 沒有題目功能。
14. Lecture 原有清單正常。
15. 空 Manifest 時正式網站全部鎖定。
16. Production Demo 參數無效。
17. 1366×768、1920×1080 及 390px 窄畫面正常。
18. 不產生未經使用者點擊的外部網站導覽。
19. 不記錄持久化個人作答資料。
20. 既有 Phase 3 所有測試持續通過。

測試中的外部網址應由測試環境攔截，不要真的向 Google Forms 提交資料。

## 二十四、效能及回歸

Phase 4 不應影響已驗收的 3D 場景效能。

請確認：

- 白天／夜晚正常。
- 360° 相機旋轉正常。
- 15 座島顯示正常。
- 背景小旅人及鯨魚正常。
- 動物自主動畫正常。
- NPC 不因題庫載入而發生模型錯置。
- 多個單元各有四／五位 NPC 時仍然流暢。
- 已完成的 NPC 視覺效果不造成大量 Draw Calls。
- Video-only 不額外載入 Quiz 模組或題庫資料。

請報告 FPS、Draw Calls、Triangles，以及 GPU 測試環境。

---

# Part J — 最終交付

## 二十五、驗證命令

請至少執行：

```bash
npm test
npm run build
npm run test:smoke
npm run test:browser
npm run validate:content
```

並加入必要的 Legacy Contract Parity Tests。

## 二十六、代表性截圖

提供實際瀏覽器畫面：

- Q01 未作答 Modal。
- Q01 答錯重試。
- Q01 答對後解說影片。
- v2 多個可接受答案案例。
- S01 四位 NPC。
- 五題單元 Q01–Q05。
- NPC 部分完成與全部完成的綠色標示。
- 4／4 完成及 Google Form 解鎖。
- 5／5 完成及 Google Form 解鎖。
- Night Mode 問答。
- Video-only 無 NPC。
- 手機窄畫面。
- 正式空 Manifest。

請確保截圖來自實際瀏覽器，而不是 AI 生成示意圖。

## 二十七、文件交付

新增或更新：

- AGENTS.md
- Plan.md
- README.md
- docs/PHASE_4_ACCEPTANCE.md
- docs/ASSIGNMENT_COMPATIBILITY.md
- docs/TEACHER_PUBLISHING.md
- docs/CONTENT_AND_RELEASE.md

特別記錄：

1. 使用的舊版來源 Commit。
2. v1/v2 Schema 差異。
3. S13–S15 的相容性擴充。
4. 舊 GUI 未修改的限制。
5. 教師正式題庫製作與發布流程。
6. JSON 中答案公開可見的安全界線。
7. 不持久保存學生進度的設計。

## 二十八、Draft PR #5

完成後建立唯一：

**Draft PR #5 — Phase 4: NPC Quiz & Google Forms Integration**

PR 應包含：

- 功能摘要。
- 原始契約相容性結果。
- 三位 Subagents 實際分工。
- 新增及修改模組。
- 自動化測試結果。
- Windows 本機驗收方式。
- 代表性截圖。
- 尚未完成的項目及已知限制。

## 二十九、本次禁止事項

不得：

- 修改正式 Manifest 開放清單。
- 發布任何真實課程題庫。
- 自行從 Notion 搜尋或產生真實題目。
- 重新設計 Quiz v1/v2 契約。
- 修改原始 Maze／City／Cyberpunk Repository。
- 修改教師的舊 Python 出題 GUI。
- 加入後端或資料庫。
- 記錄學生姓名、帳號、觀看歷程或永久答題進度。
- 加入新的大型 HUD、玩家角色或 3D 玩法。
- 改動已驗收的島嶼造型及日夜效果。
- 自行 Merge、Tag、Release 或部署。
- 自行進入 Phase 5。

**最終完成 Phase 4 後，僅建立 Draft PR #5，停止等待教師 Windows 11 Chrome／Edge 實機驗收。**

### Phase 4 核心驗收標準

1. 舊版 Quiz JSON v1/v2 能直接使用。
2. 題目數量和 NPC 數量一致。
3. 學生點 NPC 可以觀看題目影片、單選答案。
4. 答錯可以重試，答對解鎖解說。
5. 全部答對才出現 Google Form。
6. 所有單元進度在目前頁面內相互獨立。
7. Video-only 完全沒有 Quiz 功能。
8. Lecture、日夜模式、相機及其他 3D 功能不受影響。
9. 正式 Manifest 保持空白，未經教師同意不發布教材。