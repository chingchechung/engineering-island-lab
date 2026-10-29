# Engineering Island Lab 開發與驗收計畫

## 已讀規格與基準（2026-10-29）

已完整閱讀啟動文件及四份 docs，查看 00–03 全部圖片：自然海岸與岩坡、多層瀑布、少量童話學院塔樓；排除規則柱體。參考圖不作網站素材。

遠端為 chingchechung/engineering-island-lab，main 基準 d917afd；本機初始化檔案尚未追蹤，已保留，功能分支 `feat/phase-0-1-island-prototype` 從遠端 main 建立。Node 24.19.0 / npm 11.9.0 / Vite 8.3.5 / Three.js 0.186.1。既有 5/5 測試、build 通過；原 build 有 >500 kB 的 Three.js chunk 提示。環境測試本機 HTTP 必須允許 loopback 網路。

## 模組與資料流

```text
course-config + empty manifest → config validation → main
explicit local Demo → src/demo/fixture → scene
scene → terrain + props + animals (original geometry)
camera rig ← interaction state / raycast registry → UI dialog
scene anchors → CSS2D accessible labels
```

`src/config.js` 負責相對 URL 與基本契約；`src/demo/fixture.js` 僅放虛構角色名稱及說明；`src/world/` 建立地貌/建物/動物；`src/scene.js` 組合唯一世界；`src/camera.js` 處理取景及動畫；`src/interaction.js` 分辨 click/drag 和白名單拾取；`src/ui.js` 管理標籤/Modal；`src/main.js` 接線與 renderer lifecycle。

## 分階段交付

- [x] Phase 0：基準、完整閱讀、獨立分支與模組/驗收規範。
- [x] Phase 1：中央學院與 S01 自然地貌、森林/瀑布、小屋與四名 NPC、自主鯊魚、正交相機/互動、明確 Demo 與 video-only、測試、README、Draft PR。
- [ ] 教師 Windows 11 Chrome/Edge 實機美術及操作驗收。
- [ ] Phase 2（未授權）：其餘 11/14 座主題島、1–15 島整體布局/fit、鎖定外觀、遠景效能。
- [ ] Phase 3（未授權）：正式影片載入、任意長清單、Manifest 開放/鎖定流程與發布驗證。
- [ ] Phase 4（未授權）：舊題庫 v1/v2 相容、四/五題、解答及 Form；舊 GUI S13–S15 為獨立待辦。
- [ ] Phase 5（未授權）：Windows/Apache 完整回歸、素材授權、正式發布準備。

## Phase 1 驗證門檻

Node 測試涵蓋設定 1/12/15 及非法值、空 manifest、相對子目錄/錯誤 JSON、無 GPU 場景與自然島體、quiz/video-only、相機 fit/縮放上下限、拖曳最大位移/cancel、裝飾動物不進拾取表。build + 子目錄 smoke 確保靜態資源及 JSON 可載入，無真實題庫/參考圖。瀏覽器檢查雙島構圖、Q 標籤、場景拾取、Modal 隔離、縮放平移與鯊魚動畫；記錄可用環境和未實測 Windows 的限制。

Phase 1 完成後只交 Draft PR，不部署、不合併、不進 Phase 2。教師驗收仍為待辦。

## 最終驗證與交付狀態

19/19 Node 測試、build、Apache 子目錄 smoke、12/12 Chromium/WebGL 驗收通過；直接點 Q03 與 Lecture 模型亦通過。截圖與測試限制見 [Phase 1 驗收紀錄](docs/PHASE_1_ACCEPTANCE.md)。Windows 11 Chrome/Edge、美術品質及一般筆電效能仍待教師實際驗收。Draft PR 為本次停止點，不自行繼續下一 Phase。
