# Engineering Island Lab — 課程資料契約與發布流程 v0.1

## 1. 目錄規劃（Vite）

```text
engineering-island-lab/
├── index.html
├── package.json
├── vite.config.js
├── src/                       # Three.js / UI / quiz / validation 程式
├── public/
│   ├── course-config.json      # 課程名稱、1–15 個單元、課程模式
│   ├── assignments/
│   │   ├── manifest.json       # 教師已開放單元的唯一權威發布清單
│   │   ├── S01.json            # quiz 時需要；video-only 不需要
│   │   └── ...
│   └── course-videos/
│       ├── S01.json            # 該週不限數量的 Lecture 影片
│       └── ...
├── tests/
├── docs/
├── AGENTS.md
├── Plan.md
└── README.md
```

Vite 會把 `public/` 的檔案以相同相對結構複製至 `dist/` 根層；正式 Apache 無須 Node 服務。部署後老師可以只替換站台中的 JSON，但來源 repo 的 `public/` 應同步管理以避免來源與實際發布不一致。

## 2. `course-config.json`（新課程設定）

```json
{
  "courseTitle": "數位電子學",
  "totalUnits": 12,
  "assignmentMode": "quiz"
}
```

- `courseTitle`：必要的非空字串，顯示在主島；支援 UTF-8 中文。
- `totalUnits`：介於 1 與 15 的整數。
- `assignmentMode`：`quiz` / `video-only`。不要根據檔案是否存在自動切換。
- 目前 `S01–S12` 是數位電子學；S13–S15 是提供其他課程的能力，超出課程單元數的島根本不顯示。

## 3. `course-videos/Sxx.json`（已定案簡化版）

```json
{
  "unitId": "S03",
  "title": "Lecture 02, Lecture 03, Lecture 04",
  "videos": [
    { "title": "ECE-VIDEO-S03-1", "url": "https://youtu.be/BXZ-w2Uogns" },
    { "title": "ECE-VIDEO-S03-2", "url": "https://youtu.be/l8rfHXkrsjk" },
    { "title": "ECE-VIDEO-S03-3", "url": "https://youtu.be/suAZ7Sx9zxE" },
    { "title": "ECE-VIDEO-S03-ENG", "url": "https://youtu.be/yhXQyMdTI08" }
  ]
}
```

此例僅用來示範從教師提供的 2025-ECE 課程 PDF 擷取的 S03 順序，**不表示要自動發布此學期教材**。

- `videos` 必須是一個普通陣列，允許不同單元有不同影片數量；沒有 `CHT`、`ENG` 分組，**英文影片不是必備**。
- 按陣列出現順序原樣顯示；不得以標題、語言、影片 ID 或字母順序再次排序。
- 每項僅 `title` + `url`，網址限制可信的 HTTPS YouTube 頁面格式；不嵌入、不在同頁播放、不自動播放。
- 尚未開放島的資料是否先存在於檔案系統都不影響公開狀態；**唯一權威仍是 manifest**。
- 已開放單元沒有有效影片時，UI 應顯示錯誤/尚無影片，且不虛構連結。應在發布前由驗證工具擋下非預期空清單。

## 4. `assignments/Sxx.json`：相容舊 Quiz 契約

從既有 **[Engineering City Lab v1.0.0](https://github.com/chingchechung/engineering-city-lab/tree/v1.0.0)** 與 **[原 Maze Lab 題庫契約固定版](https://github.com/chingchechung/ece_hw_webproject/tree/70cc35d9ce828bcd5357f16fe85f303aa2d30cd9)** 的題目 JSON v1/v2 **精確移植資料契約與答案語意**；先閱讀 `docs/assignment-compatibility.md`、`docs/assignment-reuse.md`，不要憑記憶重新發明規則：

- 4 或 5 題，Q01–Q04／Q05，四選項（v2 可 3 或 4）。
- `questionVideoUrl`：每題題目說明 YouTube 影片。
- `explanationVideoUrl`：每題答對後可看的解答 YouTube 影片（維持原有必填欄位/驗證邏輯）。
- v1 `correctOption` 單一答案；v2 `correctOptions` 可含多個**接受的單選答案**，不能誤改為「須選中全部正解」。
- 整份單元 `googleFormUrl`：全部答對後才解鎖。
- 保留嚴格的 YouTube / Google Forms HTTPS 格式、驗證、錯答可重試、已過題目不因其他錯誤被撤銷等行為。

**S13–S15 相容性注意**：舊系統最初只接受 S01–S12。新專案的解析器/Schema/Manifest 應在維持 S01–S12 行為的前提下一次擴充上限至 S15。但舊 Python 出題 GUI 是否支援 S13–S15 是**另一件事**，不可謊稱已完成，也不得未經授權修改另一個 Repository。可在後續 Phase 提案處理既有 GUI 擴充，或另訂教師手動產出相容 JSON 的方式。video-only 課程不需要題庫。

## 5. `assignments/manifest.json`：單一發布權威

優先維持舊 Manifest v1 的 `schemaVersion: 1`、`units[]` 物件形式與 `unitId` / `title` / `file` 欄位，避免另發明第二份發布列表：

```json
{
  "schemaVersion": 1,
  "units": [
    { "unitId": "S01", "title": "Unit 01", "file": "S01.json" },
    { "unitId": "S02", "title": "Unit 02", "file": "S02.json" }
  ]
}
```

- 正式新專案 repo 預設 `units: []`；只在老師明確指定「開放到 Sxx」時才更動。
- 合法單元 S01–S`totalUnits`，最大到 S15。不得重複；必須通過白名單/安全路徑驗證。
- `quiz`：Manifest 對應的 assignment 檔必須存在/有效、`title` 與題庫標題契約相容，並驗證 Lecture JSON 已準備好。
- `video-only`：沿用同一個 Manifest 列出已公開單元，但**不 fetch、也不要求存在** `assignments/Sxx.json`；此時 `file` 保留為相容 Manifest 形式的欄位，不能因為其值存在就開啟 Quiz 功能。這是刻意選擇的相容折衷，應在程式與文件註明。
- `manifest.json` 不能用來保護秘密：即使移出清單，只要 JSON 還在公開 Apache 路徑，仍可能被直接下載。不得把私密草稿或未公布考題放到公開目錄。

## 6. 教師從 Notion PDF 產生 Lecture JSON 的 README 工作流程

- 教師平常在 Notion 公開/新增每週課程影片。
- 若網站讀取受限，可先在瀏覽器**捲到底部，確定所有動態載入的卡片出現**，再列印另存完整 PDF；先前未捲到底另存的 PDF 尾頁幾乎空白，不可當作完整來源。
- 交給 AI Agent 的輸入：最新版 PDF + 本週 `Sxx` +（如有）教師明確指定的影片先後順序。
- AI 只抽取指定單元的 Lecture 影片 `title` + YouTube `url`，依 PDF 出現順序（教師另有指定則以教師順序為優先）填入 `public/course-videos/Sxx.json`。**不必提供 CHT/ENG 欄位或英文影片。**
- AI 不得猜想 PDF 缺漏的影片連結，不得誤將題目影片/解答影片混成 Lecture 影片，不得擅自改 `public/assignments/Sxx.json`。
- 執行 schema/路徑/影片清單/已發布單元完整性檢查，提出差異摘要；老師核對後先上傳 Sxx 影片與（quiz 才需要）題庫，再**最後上傳/替換 Manifest**，避免島已開放但內容尚未更新。
- 不開發 Notion API、PDF 自動爬取服務、管理 GUI、DB 或後端；後續由 Codex/ChatGPT 執行一次性資料整理即可。

### 可放進 README 的每週更新範本

> 請依照 `docs/CONTENT_AND_RELEASE.md`，閱讀我提供的最新課程 PDF，這次僅準備 S04。擷取 S04 的所有 Lecture 影片標題及 YouTube URL，照文件順序（若我另給順序則依我的順序）更新 `public/course-videos/S04.json`。不修改任何題目答案。檢查影片及 Quiz 題庫（若 `assignmentMode=quiz`）後，提出 Manifest 開放到 S04 的具體差異與驗證結果；由我批准才執行正式發布，不要自行部署或發布 Release。

## 7. Git、發布與驗證

- 新功能使用 feature branch + Draft PR；不得自行合併、修改主分支、重新指定舊 Tag、建立正式 Release、上傳 Apache 或更改 repo 可見性。
- `npm test`、`npm run build`；應加測相對子目錄、空 manifest、開放/鎖定、1/12/15 單元、video-only 無 NPC、四/五題、v1/v2、長影片清單、多部/單部影片及錯誤 JSON。
- `vite.config.*` 應使用 `base: './'`（除非既有專案已正確實作等價相對路徑）；Apache 只上傳 `dist/` 網站文件，保留必要 license/attribution。
- 影片新分頁連結使用 `target="_blank" rel="noopener noreferrer"`，避免外部頁面操控來源頁。
- 成績由 Google Forms 負責，網站不偵測 Form 是否提交、不記錄學生姓名/IP 等使用者特徵、不將公開 JSON 當作安全防作弊機制。
