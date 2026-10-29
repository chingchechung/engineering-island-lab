# Engineering Island Lab 開發與驗收計畫

## 已讀規格與基準（2026-10-29）

已完整閱讀啟動文件及四份 docs，查看 00–03 全部圖片：自然海岸與岩坡、多層瀑布、少量童話學院塔樓；排除規則柱體。參考圖不作網站素材。

遠端為 chingchechung/engineering-island-lab，main 基準 d917afd；Phase 0 初始化檔案當時尚未追蹤，已保留，功能分支 `feat/phase-0-1-island-prototype` 從遠端 main 建立。Node 24.19.0 / npm 11.9.0 / Vite 8.3.5 / Three.js 0.186.1。既有 5/5 測試、build 通過；原 build 有 >500 kB 的 Three.js chunk 提示。環境測試本機 HTTP 必須允許 loopback 網路。

## 模組與資料流

```text
course-config + empty manifest → config validation → main
explicit local Demo → src/demo/fixture → scene
scene → terrain + props + animals + scenic bridge (original geometry)
camera rig ← interaction state / raycast registry → UI dialog
scene anchors → CSS2D accessible labels
```

`src/config.js` 負責相對 URL 與基本契約；`src/demo/fixture.js` 僅放虛構角色名稱及說明；`src/world/` 建立地貌/建物/動物；`src/scene.js` 組合唯一世界；`src/camera.js` 處理取景及動畫；`src/interaction.js` 分辨 click/drag 和白名單拾取；`src/ui.js` 管理標籤/Modal；`src/main.js` 接線與 renderer lifecycle。

## 分階段交付

- [x] Phase 0：基準、完整閱讀、獨立分支與模組/驗收規範。
- [x] Phase 1：中央學院與 S01 自然地貌、森林/瀑布、小屋與四名 NPC、自主鯊魚、正交相機/互動、明確 Demo 與 video-only、測試、README、Draft PR。
- [x] 教師 Windows 11 Chrome/Edge 已驗收 Phase 0/1 與木橋，PR #1 已合併（教師本輪指示）。
- [ ] Phase 2（實作完成，待教師驗收）：其餘 11/14 座主題島、1–15 島整體布局/fit、鎖定外觀、遠景效能。
- [ ] Phase 3（未授權）：正式影片載入、任意長清單、Manifest 開放/鎖定流程與發布驗證。
- [ ] Phase 4（未授權）：舊題庫 v1/v2 相容、四/五題、解答及 Form；舊 GUI S13–S15 為獨立待辦。
- [ ] Phase 5（未授權）：Windows/Apache 完整回歸、素材授權、正式發布準備。

## Phase 1 驗證門檻

Node 測試涵蓋設定 1/12/15 及非法值、空 manifest、相對子目錄/錯誤 JSON、無 GPU 場景與自然島體、quiz/video-only、相機 fit/縮放上下限、拖曳最大位移/cancel、裝飾動物不進拾取表。build + 子目錄 smoke 確保靜態資源及 JSON 可載入，無真實題庫/參考圖。瀏覽器檢查雙島構圖、Q 標籤、場景拾取、Modal 隔離、縮放平移與鯊魚動畫；記錄可用環境和未實測 Windows 的限制。

Phase 1 完成後只交 Draft PR，不部署、不合併、不進 Phase 2。教師驗收仍為待辦。

## 最終驗證與交付狀態

22/22 Node 測試、build、Apache 子目錄 smoke、12/12 Chromium/WebGL 驗收通過；直接點 Q03 與 Lecture 模型亦通過。截圖與測試限制見 [Phase 1 驗收紀錄](docs/PHASE_1_ACCEPTANCE.md)。Windows 11 Chrome/Edge、美術品質及一般筆電效能仍待教師實際驗收。Draft PR 為本次停止點，不自行繼續下一 Phase。

## Phase 1 小幅修訂：雙島木橋

依教師要求在同一 Draft PR #1 加入純視覺木橋：微拱及平面弧線、交錯木板、細木柱與繩欄。橋兩端接上既有岸邊，不移島、不改相機或互動／模式程式，不加入通行／碰撞／導航／點擊功能。新增橋端落岸、取景、排除拾取與不遮地標測試，更新總覽／聚焦／video-only／窄視窗截圖與 README 驗收項目。仍屬 Phase 0/1 修訂，Phase 2 未開始。

## Phase 2 實作計畫（最新授權）

基準 main `3e5c883`，新分支 `feature/phase-2-full-archipelago`，基準 22/22 測試。教師原始指示保存在 docs/PHASE_2_BRIEF.md；此授權取代歷史 Phase 1 停止條件，本輪停止點為 Phase 2 Draft PR，Phase 3/4 仍未授權。

- [x] 保留雙島模型，分離已驗收 Phase 1 建構；新加固定主題、分支布局及 14 座獨特地貌。
- [x] 完整木橋網路、岸邊銜接、Manifest 開放狀態與可愛柵欄；鎖定內容阻擋。
- [x] 每島主題小屋、4/5 個 NPC 位置與自主動物；video-only 完全不建立 NPC。
- [x] 1–15 全域 fit、單島近看、標牌/導覽與窄視窗，保留滑鼠操作。
- [x] 共用幾何/材質、花草 InstancedMesh、靜態合批、遠景動畫降頻、聚焦陰影與 GPU 釋放。
- [x] 既有行為回歸與新測試、12/15 總覽及指定主題截圖、FPS/draw calls/triangles 實測。
- [x] Windows 驗收文件與整合報告。

交付方式：僅建立一個新的 Phase 2 Draft PR，停止等待教師，不進 Phase 3。

## Phase 2 實際平行整合紀錄

依教師追加指示，主 Agent 先完成 docs/ISLAND_FACTORY.md 與固定契約，再實際 spawn 四組 Subagents：A nature.js（S02–S04）、B fantasy.js（S05–S08）、C dream.js（S09–S12）、D extended.js（S13–S15）。四組只改各自模組，已全部交付並停止編輯，沒有建立 PR 或修改共享核心。主 Agent 審查程式、Scoped 驗證與實際近景截圖後統一整合；同時處理布局／橋／柵欄／相機／狀態及效能。

實作細節與量測限制見 docs/PHASE_2_ACCEPTANCE.md。Windows 本輪美術及一般筆電效能仍待教師驗收；Phase 3／4 不在本次範圍。

最終驗證：41/41 單元測試依要求連續執行三次皆通過；build、Apache 子目錄 smoke、20/20 瀏覽器驗收通過。75 NPC 的可見／拾取測試涵蓋所有 15 島。SwiftShader 實測約 4.31–6.00 FPS，15 島總覽 203 calls／236,364 triangles；本輪 Windows 硬體加速與一般筆電流暢度尚待教師確認。
