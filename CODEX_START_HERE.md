# Engineering Island Lab — Codex 開發啟動指示

Repository: `engineering-island-lab`（請先自行確認目前連線的 owner、branch、工作樹狀態）  
狀態：Node.js 24 / npm / Vite / JavaScript ES Modules / Three.js 環境已準備；不得假定目前已完成任何實際產品功能。  
基準文件：`docs/PROJECT_SPEC.md`、`docs/CONTENT_AND_RELEASE.md`、`docs/PHASE_PLAN.md`、`docs/STYLE_REFERENCES.md`（含教師提供的四張美術參考圖）。**先完整閱讀，再開始修改。**

## 你這次應執行的工作

1. 檢查既有 repo（包括 `package.json`、`vite.config.*`、Git 狀態和已建立的測試），先跑 `npm test`、`npm run build`，記錄基準。勿覆寫已完成環境或擅自升級不相容依賴。
2. 依三份文件核對產品需求與技術方向，建立或更新 `AGENTS.md`、`Plan.md`、README 的專案開發約束及驗收清單。注意 `Plan.md` 不能把未做的 Phase 寫成已完成。
3. **本次只做 Phase 0（規格/架構/基準）與 Phase 1（可見的 3D 互動原型）**，不要一口氣做完全部 15 座島、完整題庫、影片發布系統或正式 Release。
4. Phase 1 原型至少包含：斜上方正交相機、連續可縮放的 3D 群島世界、中央學院主島及 S01 一座自然不規則立體小島、可用滑鼠點擊聚焦/回到總覽、示範 Lecture 小屋和 Q01–Q04 NPC 造型（先不接正式資料）、一隻在草地自主跳動的可愛鯊魚。此原型在本機以獨立 Demo fixture 展示互動，正式發布的 `assignments/manifest.json` 仍必須保持空清單；並保留未來切換 `video-only` 完全隱藏 NPC 的架構。**不得把任何展示用連結當成正式課程內容。**
5. 加入針對設定值範圍、縮放/點擊狀態切換、`quiz`/`video-only` 顯示條件等可無 GPU 執行的測試；跑 `npm test`、`npm run build`，並提供可讓教師在 Windows 11 Chrome/Edge 親自驗收的指令和檢查表。
6. 以獨立 feature branch + Draft PR 交付；報告變更檔案、測試證據、目前只是 Demo 的部分、已知限制和下一階段建議。**不得自行合併 PR、改 `main`、正式部署、建立 Tag/Release、將私有課程題庫 push 到公開 GitHub。**

## 設計不可偏離的原則

- 不是 RPG 或角色移動遊戲：**沒有學生化身、WASD、角色物理/碰撞或走到 NPC 才可作答**。學生直接點島、影片小屋和 NPC。
- 不是切換互不相干的網頁場景：**縮到最小可同時看到中央主島與目前課程全部單元島（包含未開放者），放大則平滑聚焦單一島嶼**。
- 島嶼是可愛、繽紛、自然不規則、有厚度的 3D 微型奇幻地貌。不得大量用規則正方柱／六角柱取代自然海岸、岩坡、海蝕崖。
- 小動物僅是自行循環移動的環境裝飾，**玩家不能點擊、餵食、驅趕、控制或影響牠們**；允許有趣的不合理動物（如草地跳動的鯊魚）。
- S01–S15 是系統上限，**目前數位電子學只有 S01–S12**；中央主島課程名稱、顯示島數以及是否有問答都從 JSON 設定，非硬寫死。
- Quiz：一題一位可點擊 NPC；每週 4 題或 5 題，Q01–Q04／Q05，點擊開啟原本題目影片 + 答題 + 答對後解說影片 + 全部答對後 Google Form 的流程。Video-only：**沒有任何題目 NPC 也沒有問答 Form UI**。
- Lecture：每島一座可點擊小屋，開啟一個**可垂直捲動、數量不固定、無語言分組、依 JSON 順序顯示**的清單；點擊影片**另開 YouTube 分頁**，不嵌入播放器、不追蹤播放進度。
- 教師統一發佈已開放單元；不做學生登入、伺服器資料庫、成績紀錄、Notion API、後端或教材編輯管理 UI。

## 技術要求

- 維持既有 Node 24 + Vite + Three.js + Vanilla JavaScript / CSS；WebGLRenderer 與 OrthographicCamera 為首選。依賴使用固定 npm lockfile，不使用浮動 `@dev` CDN。
- 部署產物只有 `dist/` 靜態檔案，能放在學校 Apache 任意子目錄；Vite `base: './'`，JSON/資源載入使用相對路徑。開發時不可寫死 `/` 根路徑。
- 需要明確區分世界 3D 物件的滑鼠點擊與相機拖曳；不要點錯 NPC；所有可互動物件應有 hover、聚焦和標籤。Modal 開啟時不要讓滾輪捲到 3D 世界。
- 不保存持久性個人進度；quiz 答題結果可只放在當前頁面的記憶體，reload 清除。公開 JSON 答案可被檢視，非安全考試平台。

## 執行順序 / 停止條件

**先基準檢查與計畫，再最小可行原型，再完整測試，再 Draft PR。Phase 1 完成後必須停下，等待教師實際驗收畫面與操作，不得自行進入 Phase 2。**

只要對資料契約、授權來源、正式題庫或部署有不確定，採最保守實作並在 Draft PR 列為待確認事項；不要自行填寫課程真實題目或猜測 YouTube 網址。
