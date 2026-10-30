# Engineering Island Lab — Phase 5 完整開發指示
## Release Readiness, Deployment Validation & Teacher Operations

Repository:
https://github.com/chingchechung/engineering-island-lab

## 一、開發背景

Engineering Island Lab Phase 0–4 均已完成，PR #1–#5 已合併至 main。

最新 Phase 4 Merge Commit：

`046efcab7b359cce046038fe66c95c5821edfad4`

教師已在 Windows 11 Chrome／Edge 完成所有主要功能驗收，包括：

- 中央學院與 S01–S15 主題群島。
- 3D 相機旋轉、縮放、平移與單島聚焦。
- 白天／夜晚模式與建築、橋樑點燈。
- 海流、鯨魚、特色動物與跨島背景旅人。
- Lecture 影片清單、指定順序與 YouTube 外連。
- Quiz JSON v1/v2。
- 各島四題／五題混合 NPC。
- 單選答案、答錯重試、答對後解說。
- 全部答對後解鎖 Google Forms。
- 跨島暫時進度保留、重新整理歸零。
- Video-only 完全不載入 Quiz。
- Windows Git CRLF 問題已完成 Repository 層級修正。

本次正式授權：

**Phase 5 — Release Readiness & Deployment Validation**

請從最新 main 建立：

`feature/phase-5-release-readiness`

最終建立唯一：

**Draft PR #6 — Phase 5: Release Readiness & Deployment Validation**

本階段不新增新的 3D 場景、遊戲玩法或課程功能。

主要目標是讓目前已完成的網站，具備可以正式部署、長期維護與每學期重複使用的品質。

---

# Part A — 基準確認與開發規範

## 二、開工前檢查

請先：

1. 確認 PR #5 已合併。
2. 取得最新 main。
3. 檢查 Git 工作目錄乾淨。
4. 閱讀 AGENTS.md、Plan.md、README.md。
5. 閱讀 docs/PHASE_PLAN.md。
6. 閱讀 docs/CONTENT_AND_RELEASE.md。
7. 閱讀 docs/TEACHER_PUBLISHING.md。
8. 閱讀 docs/ASSIGNMENT_COMPATIBILITY.md。
9. 閱讀 docs/PHASE_4_ACCEPTANCE.md。
10. 閱讀 docs/WINDOWS_EOL_CHECKOUT.md。

請更新 AGENTS.md 與 Plan.md，將 Phase 4 記錄為已驗收且 PR #5 已合併。

原本各 Phase 的停止條件應保留為歷史紀錄，但不能與本次 Phase 5 授權產生衝突。

## 三、重要限制

**本次是 Release Preparation，不是功能重新開發。**

禁止無理由修改：

- 3D 島嶼地貌與布局。
- CameraRig 與滑鼠操作。
- Day/Night 系統。
- NPC 動畫。
- 動物、鯨魚與背景旅人。
- Lecture JSON 格式。
- Quiz JSON v1/v2 格式。
- acceptsAnswer 判答語意。
- Google Forms 解鎖條件。
- 已驗收的大字體 Modal。

若測試發現確實會影響正式部署的重大問題，可以進行最小必要修正，但必須記錄原因、測試證據及修改範圍。

不得為了程式碼風格或重構美觀而大幅修改已驗收的功能。

---

# Part B — Release Candidate 封裝

## 四、正式靜態網站封裝

目前網站使用：

- Node.js 24
- npm 11+
- Vite
- Three.js
- Vanilla JavaScript
- 靜態 JSON

正式執行環境為 Apache HTTP Server，不需要 Node.js 服務、資料庫或後端 API。

請確認：

```bash
npm ci
npm run build
```

執行後可產生完整的 `dist/`。

### 封裝要求

- Vite 保持 `base: './'`。
- JavaScript、CSS、圖片與 JSON 均支援相對路徑。
- 不依賴開發機器的絕對路徑。
- 不依賴 localhost。
- 不需要執行 npm run dev。
- 不能要求在 Apache 伺服器上安裝 Node.js。
- 不需要伺服器端程式。
- 不需要額外的系統服務或背景程序。

### Release Candidate

請建立一個可供教師驗收的正式封裝候選，例如：

`engineering-island-lab-v1.0.0-rc.zip`

壓縮檔內應以網站根目錄所需的靜態內容為主，解壓到 Apache 指定網站目錄即可使用。

不要把多餘的開發目錄包進正式網站。

### 不得包含

- node_modules
- .git
- .env
- 測試資料夾
- Playwright 截圖與錄影
- Codex 工作紀錄
- 開發用 Demo fixture
- 私人課程題庫草稿
- 教師尚未公開的答案
- 憑證或密碼
- 學生資料

可另外建立 Release Candidate 的 SHA256 清單及檔案 inventory，方便驗證上傳檔案是否完整。

**目前只準備 Release Candidate，不得建立正式 v1.0.0 Tag 或 GitHub Release。**

---

# Part C — Apache 靜態部署驗證

## 五、學校網站子目錄相容性

本專案將部署至學校的 Apache HTTP Server。

之前已有類似的測試路徑：

`/~wildwolf/engineering-island-lab/`

請把它視為本次的測試部署路徑範例，不要在程式內寫死。

請確認網站能在 Apache 子目錄正常使用，不要求放在網域根目錄。

### 必須驗證

1. index.html 正確載入。
2. JavaScript Module 正確載入。
3. CSS 正確載入。
4. favicon 等靜態資源正常。
5. course-config.json 正確載入。
6. assignments/manifest.json 正確載入。
7. course-videos/Sxx.json 正確載入。
8. Quiz 模式下 assignments/Sxx.json 正確載入。
9. Video-only 不要求 Quiz JSON。
10. JavaScript、CSS、JSON 回傳正確 MIME Type。
11. 檔案不存在時應回 HTTP 404，不可由 HTML fallback 偽裝成功。
12. 重新整理或直接進入網站 URL 正常。
13. 不需要 SPA Server Rewrite。
14. 不存在跨網域資源載入或 CORS 問題。

優先擴充既有 smoke test，不需要另建一套部署框架。

若測試環境沒有真正的 Apache，應使用隔離的本機 Apache 或既有 HTTP 測試模擬，並在報告中明確區分，不能把模擬測試宣稱為學校實機部署成功。

## 六、HTTP Cache 與每週更新

因為本網站每週可能新增一座島，請檢查快取策略。

特別注意：

- index.html
- course-config.json
- assignments/manifest.json
- course-videos/Sxx.json
- assignments/Sxx.json

教師正式更新 Manifest 後，學生重新整理頁面應能取得新的發布清單。

請提供適合 Apache 的建議快取設定。

原則：

- 帶內容雜湊檔名的 JS／CSS 可以長時間快取。
- Manifest 與課程 JSON 不應因過度快取而長期維持舊版本。
- 已開啟頁面的 Manifest 與 Quiz 暫存狀態不必熱更新；重新整理才取得新資料是可以接受的。

如果需要 Apache `.htaccess`，請提供選用範例與前置條件，不要假設學校伺服器一定允許 Override。

不要為了快取而導入 Service Worker、離線同步或後端服務。

---

# Part D — 正式資料及 Demo 隔離

## 七、正式預設資料保持不變

正式 `public/course-config.json`：

```json
{
  "courseTitle": "數位電子學",
  "totalUnits": 12,
  "assignmentMode": "quiz"
}
```

正式 `public/assignments/manifest.json`：

```json
{
  "schemaVersion": 1,
  "units": []
}
```

**本次不得自行發布任何真實單元。**

網站正式版應顯示完整 12 座單元島，但全部維持未開放狀態。

### Production 安全檢查

正式 Release Candidate 不得因為 URL 中包含：

- demo=1
- units=15
- open=15
- mode=video-only
- questions=5

而繞過正式設定。

請確認：

- 正式版無法透過測試參數開放單元。
- 正式版不下載或執行測試專用 Quiz fixture。
- 正式版不包含測試用 YouTube 或 Form 資料。
- 正式版不暴露開發測試 API。
- 正式版沒有 Debug Panel。
- 正式版沒有測試腳本及測試憑證。

不要只檢查畫面，還要對建置輸出做實際檔案與資源內容掃描。

## 八、正式發布資料安全

請檢查 `dist/` 中是否意外包含：

- 測試 Quiz 的正確答案。
- 合成 Google Form URL。
- 教師未公開的課程內容。
- 內部路徑、測試資料與不必要的開發資源。
- 密碼、Token、金鑰及環境檔案。

請區分「測試字串存在於不可執行的檔案」與「正式瀏覽器可下載的測試資料」，並以正式發布範圍進行檢查。

若有必要，新增輕量的：

`npm run check:release`

作為 Release Candidate 的自動檢查命令。

它應檢查實際 build 內容，不要只檢查 source。

### 重要安全界線

未來真正發布的 Quiz JSON 本身包含正確答案，這是目前既定設計。

因此這個系統是開放式課程練習網站，不是防作弊考試平台。

Manifest 只是課程開放控制，不代表未列出的 JSON 無法被直接下載。

教師尚未發布的題庫草稿，不能預先放到公開 Apache 路徑。

---

# Part E — 教師每週發布與更新 SOP

## 九、建立完整教師操作手冊

請建立或完善：

`docs/TEACHER_OPERATIONS.md`

讓教師日後更換課程或每週開放新單元時，不必重新閱讀整份技術規格。

操作文件應以繁體中文撰寫。

## 十、不同課程的設定方式

請說明：

### Quiz 課程

```json
{
  "courseTitle": "數位電子學",
  "totalUnits": 12,
  "assignmentMode": "quiz"
}
```

### Video-only 課程

```json
{
  "courseTitle": "其他課程",
  "totalUnits": 15,
  "assignmentMode": "video-only"
}
```

只要修改課名、單元數及課程模式，就能重複使用同一套網站。

不需要另外編輯 islands.json。

不需要管理資料庫。

不需要自行修改 Three.js 程式。

## 十一、每週 Lecture 影片更新

教師的 Lecture 影片資料可能來自 Notion。

請保留已定案流程：

1. 教師將最新 Notion 課程頁面捲到底。
2. 確認所有動態載入內容均已顯示。
3. 列印／另存為完整 PDF。
4. 提供 PDF 給 AI Agent。
5. 指定本週 Sxx。
6. 必要時指定影片順序。
7. AI 擷取本週所有 Lecture 影片。
8. 更新 course-videos/Sxx.json。
9. 執行驗證。
10. 提供差異摘要供教師確認。

每單元影片數量不限固定數量。

不分中文、英文。

不自動排序。

教師指定的影片順序必須原樣保留。

## 十二、Quiz 課程更新

Quiz 模式還需要：

`assignments/Sxx.json`

請沿用 Phase 4 已驗證的 v1/v2：

- 四或五題。
- Q01–Q04／Q05。
- 題目影片。
- 解說影片。
- 三或四個選項。
- v1 correctOption。
- v2 correctOptions 單選任一可接受答案。
- Google Form URL。

不要建立新題庫格式。

不要修改既有 Python 出題 GUI。

S13–S15 的出題 GUI 相容性仍應標為需要另行確認。

## 十三、教師發布前驗證

請提供一份精簡操作流程，使用既有：

```bash
npm run validate:content -- --unit S04
npm run validate:content -- --unit S04 --with-quiz
npm run validate:content
```

清楚區分：

- 影片候選檢查。
- Quiz 題庫候選檢查。
- 全部已開放內容完整性。
- 正式發布許可。

驗證成功不代表 AI 可以自行開放單元。

## 十四、正式開放順序

這是教師 SOP 的核心。

**必須先上傳內容，再更新 Manifest。**

建議：

1. 備份既有發布設定。
2. 準備新的 Lecture JSON。
3. Quiz 模式下再準備 Assignment JSON。
4. 驗證所有新內容與既有開放內容。
5. 教師核對影片與 Form。
6. 上傳／更新新單元 JSON。
7. 確認 HTTP 200、JSON MIME、內容及標題正確。
8. 最後才更新 Manifest。
9. 重新整理正式網頁確認新島已開放。
10. 確認舊島仍正常。

請同時提供新增單元、修改已發布單元、撤回單元及回復上一版的操作說明。

更新 Manifest 最好採用經驗證的完整檔案與原子式替換；若伺服器權限不支援，需在文件中說明限制及替代程序。

不能直接將未通過驗證的 JSON 覆蓋正式使用中的檔案。

---

# Part F — Windows 11 與瀏覽器回歸

## 十五、完整回歸測試

Phase 5 必須保留 Phase 4 全部測試。

基準：

- 212 項單元測試。
- 76 組瀏覽器測試。
- Legacy 364 筆驗證及 76 次單選判答相容測試。
- Apache Smoke。
- Content Validator。

本輪新增封裝／部署／資源安全測試後，總數可以增加，但不得任意移除既有測試。

### 必測情境

- 1、12、15 單元。
- Quiz／Video-only。
- 全部未開放。
- 部分開放。
- 全部開放。
- Lecture 一部、四部、十部影片。
- v1 四題。
- v2 五題。
- v2 多個接受答案。
- 答錯重試。
- 4/4、5/5 Google Form 解鎖。
- 跨島進度及重新整理歸零。
- 日夜模式。
- 360° Camera Orbit。
- 背景生命動畫。
- 手機窄畫面。
- Apache 子目錄。
- Production Demo 參數隔離。
- 正式檔案清單檢查。

## 十六、Windows CRLF 相容性

PR #5 已修正 Windows `core.autocrlf=true` 導致的原始 SHA256 問題。

請保留：

`.gitattributes`

及對應的測試。

不得修改原本 14 個 pinned reference 的內容及 SHA256 預期值。

請確認 Windows 與 Linux 的 Checkout 結果仍符合規格。

## 十七、效能

正式版應保留目前教師已驗收的硬體 GPU 流暢度。

請回報：

- 12 島 Day 總覽。
- 12 島 Night 總覽。
- 15 島 Day／Night。
- 單島聚焦。
- Quiz 模式。
- Video-only 模式。

記錄 FPS、Draw Calls、Triangles 與 GPU renderer。

若雲端只有 SwiftShader 軟體 GPU，須明確標示。

不可把 SwiftShader 的低 FPS 當成 Windows 實體 GPU 表現，也不得以 Build 成功取代實際效能驗收。

本階段不需要為了消除原本 Three.js 的 500 KB Chunk Warning 而進行大幅架構重寫；除非已有明確的載入速度或效能問題證據。

---

# Part G — 第三方授權及安全審查

## 十八、第三方素材與程式來源

請完整檢查：

- Three.js。
- Vite。
- Playwright 等開發套件。
- 3D 模型與幾何。
- 圖示及字型。
- 圖片與音效（若有）。
- 從 Engineering Maze／City Lab 移植的題庫元件。

請建立或更新：

`docs/THIRD_PARTY_NOTICES.md`

並記錄：

- 元件名稱。
- 版本。
- 來源。
- 使用目的。
- 授權類型。
- 必要的聲明與限制。

若正式封裝需要包含相應授權聲明，請放在適當位置。

不得因為其他專案使用某種授權，就擅自將本專案或全部移植元件認定為相同授權。

原始 Maze Lab 沒有根層 LICENSE 的事實應明確記錄，不要自行假設為 MIT。

## 十九、安全檢查

請檢查：

- JSON 輸入驗證。
- DOM textContent 安全使用。
- HTTPS YouTube／Google Forms URL 驗證。
- 外部連結 noopener noreferrer。
- 未開放單元不載入正式內容。
- Production 不接受 Demo 參數。
- 不含密碼與 Token。
- 不含學生資料。
- 沒有持久化學生答案。
- 沒有自行追蹤影片觀看紀錄。
- 沒有意外新增遠端服務或第三方資料收集。

可執行相依套件安全檢查；若網路或 Registry 無法存取，應報告未驗證，不得宣稱無漏洞。

只修復經確認且與正式執行有關的問題，避免不必要的大型依賴升級。

---

# Part H — Subagents 平行開發

## 二十、建議採用三位 Subagents

請由 Main Agent 先確定共用介面與檔案所有權，再平行啟動。

### Subagent A — Deployment & Packaging

負責：

- Vite Build。
- 靜態檔案完整性。
- Apache 子目錄測試。
- 相對 URL／MIME／404。
- Release Candidate 封裝。
- SHA256／檔案 inventory。
- 封裝及部署測試。

### Subagent B — Content & Publishing Safety

負責：

- 正式 Manifest／Demo 隔離。
- Lecture／Quiz 發布驗證。
- Content Validator 回歸。
- 發布前安全檢查。
- 教師每週更新 SOP。
- 內容更新、撤回及回復流程。

### Subagent C — Quality, Compatibility & Licenses

負責：

- Windows／Linux 測試相容性。
- Git CRLF 測試。
- v1/v2 Legacy parity。
- 第三方素材／授權 inventory。
- 瀏覽器回歸。
- 相依套件安全檢查。
- 已知限制整理。

### Main Agent

負責：

- 協調及整合。
- 檔案所有權。
- Review 所有 Subagents 結果。
- 確認沒有改動已驗收功能。
- 整理 Release Checklist。
- 最終測試。
- README／Plan／AGENTS 更新。
- Git 與 Draft PR。

不得讓 Subagents 同時修改相同的共用核心檔案。

本階段應以審查、測試、文件及少量必要工具為主，避免重新開發程式。

---

# Part I — 正式交付

## 二十一、文件

本次應新增或更新：

- AGENTS.md
- Plan.md
- README.md
- docs/PHASE_5_ACCEPTANCE.md
- docs/TEACHER_OPERATIONS.md
- docs/APACHE_DEPLOYMENT.md
- docs/RELEASE_CHECKLIST.md
- docs/THIRD_PARTY_NOTICES.md

以及必要的封裝與驗證腳本。

所有教師操作說明使用繁體中文。

README 應清楚區分：

1. 如何本機開發。
2. 如何本機測試。
3. 如何建置正式網站。
4. 如何準備 Release Candidate。
5. 如何部署到 Apache（取得授權後）。
6. 如何每週新增 Lecture／Quiz。
7. 如何開放新島。
8. 如何回復上一版。
9. 如何將同一套網站改用於其他課程。

## 二十二、驗證命令

至少執行：

```bash
npm ci
npm test
npm run build
npm run test:smoke
npm run test:browser
npm run validate:content
node scripts/legacy-parity.mjs
```

若新增封裝與發布安全驗證命令，也必須納入最終測試。

保留完整原始結果與執行環境版本。

## 二十三、Release Candidate 驗收

完成後請提供：

- Release Candidate ZIP。
- ZIP 內檔案清單。
- SHA256 檢查結果。
- 實際打包大小。
- JavaScript／CSS 等主要資源大小。
- 正式設定與空 Manifest 驗證。
- 沒有 Demo／私人教材的掃描報告。
- Apache 子目錄測試結果。
- Windows 11 Chrome／Edge 操作步驟。
- 已知限制與剩餘風險。

如果尚未取得學校正式伺服器存取或實測條件，應明確標示實際部署驗證尚未完成，不能以本機測試取代。

## 二十四、Draft PR #6

完成後建立唯一：

**Draft PR #6 — Phase 5: Release Readiness & Deployment Validation**

PR 需包含：

- 完成與尚未完成的項目。
- Release Candidate 說明。
- 封裝及 Apache 測試結果。
- 內容與隱私安全檢查。
- 授權清單。
- 測試數據及實際瀏覽器截圖。
- 三位 Subagents 實際交付。
- Windows 11 教師最終驗收步驟。
- 建議的 v1.0.0 Release 流程。

## 二十五、停止條件

**完成 Phase 5 後，只建立 Draft PR #6，停止等待教師驗收。**

本次不得：

- 自行合併 PR #6。
- 自行建立或推送 v1.0.0 Tag。
- 自行發布 GitHub Release。
- 自行將 Private Repository 改為 Public。
- 自行部署至學校 Apache。
- 自行修改正式 Manifest 來開放課程。
- 自行發布任何真實課程影片或 Quiz 題庫。
- 自行修改其他 Repository。
- 自行啟動新的功能開發階段。

待教師完成 Windows 11 及 Release Candidate 驗收後，再由教師明確批准：

1. 合併 PR #6。
2. 建立 v1.0.0 Tag。
3. 發布 GitHub Release。
4. 進行正式 Apache 部署。

**本次 Phase 5 的完成標準，是網站已具備可正式發布的技術與操作條件，而不是已經對學生公開上線。**