# Engineering Island Lab 開發與驗收計畫

## Phase5（目前授權，2026-10-30）

教師確認Phase0–4 Windows驗收、PR #5合併046efcab，乾淨分支feature/phase-5-release-readiness。完整原文PHASE_5_BRIEF、凍結介面PHASE_5_INTERFACES。正式Manifest仍空。

- [x] 讀完整指示／指定文件、確認合併及最新main、建立分支。
- [x] 凍結A封裝／靜態HTTP、B release scan／教師SOP、C品質／授權／audit所有權，實際三位平行。
- [x] 檢查所有交付，整合check:release／package:rc、選用隔離Apache及RC browser，不重做功能。
- [x] npm ci、238/238 Node／82/82 browser、parity、release／package／真正Apache／RC及ZIP獨立驗證；軟體GPU六情境與16張截圖保存。
- [x] ZIP／inventory／SHA／scan、教師操作／回復／跨課程SOP、授權／安全及Phase5驗收與代表截圖。
- [x] 已建立唯一[Draft PR #6](https://github.com/chingchechung/engineering-island-lab/pull/6)；停止等教師RC／Windows驗收，不合併／Tag／Release／改可見性／部署學校。

## Phase4 Windows EOL修正（歷史，已驗收且PR #5合併）

- [x] 教師提供的CRLF hash已用Git core.autocrlf=true實際clone重現。
- [x] 新增最小.gitattributes範圍，原始14份內容／hash及移植驗證／判答不變。
- [x] 新clone、既有CRLF安全重取、14/14 hash、兩份移植JS LF、一般文字仍CRLF及stash備份回歸通過。
- [x] Windows PowerShell備份、ff-only更新、指定檔案重取指令已文件化，不改全域設定。
- [x] 212/212單元、76/76瀏覽器、build、三段smoke、內容及Legacy parity全部通過；EOL逐檔hash／命令紀錄與同一Draft PR #5交付資料完成。
- [x] 教師已確認Windows EOL及Phase4驗收，PR #5已合併046efcab。

## Phase 4（歷史，教師已驗收且PR #5合併）

- [x] 完整讀取教師Phase4指示、PR #4已合併dd3f96f4；建立指定分支。
- [x] 固定City v1.0.0／Maze commit來源，閱讀驗證器／Schema／Loader／Session／UI與發布文件，凍結PHASE_4_INTERFACES及三位所有權。
- [x] A 14項契約+364/76 parity、B 21項Loader/Session、C 22項UI及Native三尺寸，三者實際平行交付停止；Main審查後整合，211/211預檢通過。
- [x] Main混合4/5題NPC、完成標示及精簡Form入口、video-only動態模組隔離、Content Validator；新增6項驗證。
- [x] native Dialog關閉重開保留534px舊捲動已重現並修正：顯示後重設新內容至頂部，三尺寸原生helper驗0px、外連返回仍保留位置。
- [x] 全部指定命令通過：211/211單元、76/76瀏覽器、三段Apache smoke、內容及Legacy parity；20張實際截圖、三尺寸／五情境效能與原始輸出已保存。
- [x] README／發布／相容／驗收文件及唯一Draft PR #5交付資料完成；不進Phase5。
- [x] 教師已於Phase5指示確認Windows Chrome／Edge全部主要功能驗收，PR #5合併。

正式public JSON保持原狀，不讀取／產生真實教材、不修改舊GUI或來源Repository。

## Phase 3（歷史交付，教師已驗收且PR #4合併）

教師已驗收Phase2.5，PR #3合併main 91f33c2，工作樹乾淨；本輪新分支feature/phase-3-lecture-publishing。完整授權PHASE_3_BRIEF，平行介面PHASE_3_INTERFACES。舊Phase的「未授權」限當時歷史。

- [x] 讀完整指示／既有規格與程式、確認PR #3合併與最新main、建立分支。
- [x] 基準112/112單元與build通過。
- [x] 實際平行A資料／Loader／CLI20項、B UI14項及Native三尺寸component已交付停止；Main共用Dialog、S01正式metadata接線與2項整合，148/148單元通過。
- [x] Demo／prod隔離、開放門檻、mode／race／popup／cache／錯誤／Apache通過；65/65瀏覽器，保留原56項。
- [x] README完整教師Prompt、TEACHER_PUBLISHING、CONTENT_AND_RELEASE補操作及PHASE_3_ACCEPTANCE完成；代表截圖已由整合瀏覽器產生，最終回歸後保存。
- [x] 五個指定命令全部通過；148/148單元、65/65瀏覽器、14張原始截圖與唯一Draft PR #4交付資料就緒。
- [x] 教師已確認Windows實機驗收，PR #4合併dd3f96f4；新授權Phase4另列頂部。

不修改正式Manifest／教材格式，不開發Phase4、不合併／部署／Tag／Release。

## Phase 2.5（歷史交付，已驗收且PR #3合併）

教師已完成 Phase 2 Windows 驗收，PR #2 已合併；新分支從 main d136c9c 建立。完整指示 PHASE_2_5_BRIEF.md，凍結介面 PHASE_2_5_INTERFACES.md。基準91/91與build通過。

- [x] 閱讀規範、程式與參考；確認合併及乾淨基準、建立獨立分支。
- [x] 實際平行 Agent A 光照／燈飾／海色8項測試、Agent B CameraRig／手勢12項測試，已交付停止；Main審查多指取消復原。
- [x] Main 右上日夜UI、Modal隔離、共享核心接線與標牌拖曳隔離；112/112單元、build及Apache smoke通過。
- [x] 審查整合、112/112單元、build、Apache smoke、56/56瀏覽器與13張真實截圖；補窄視窗海面覆蓋與相機深度回歸。
- [x] 完成main六個基準與Phase2.5十四個Day／Night情境：SwiftShader約2.94–5.28FPS，白天總覽成本不變、夜間加6批；無本輪實體GPU數字。
- [x] README／驗收文件、13張原始截圖、原始量測與唯一新Draft PR #3交付資料完成。
- [x] 教師已在Phase3指示確認Windows實機驗收，PR #3合併main。

本輪不修改布局／地貌、教材JSON、Manifest，不進 Phase3、不合併／部署／Tag／Release。

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
- [x] Phase 2（已通過教師驗收，PR #2合併）：其餘 11/14 座主題島、1–15 島整體布局/fit、鎖定外觀、遠景效能。
- [x] Phase 3（教師已驗收且PR #4合併）：正式影片載入、任意長清單、Manifest 開放/鎖定流程與發布驗證。
- [x] Phase 4（本輪已完成開發，教師驗收待辦見頂部）：舊題庫 v1/v2 相容、四/五題、解答及 Form；舊 GUI S13–S15 為獨立待辦。
- [ ] Phase 5（本輪已授權，見頂部）：Windows/Apache 完整回歸、素材授權、正式發布準備。

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

## Phase 2 教師驗收修訂（最新交付）

沿用 feature/phase-2-full-archipelago 與 Draft PR #2，修訂基準 978be95。最新教師原文存 docs/PHASE_2_REVISION_BRIEF.md；凍結介面與檔案所有權見 docs/REVISION_INTERFACES.md。

- [x] Main：單列動態課名、左下唯一導覽、去除 Demo 面板、dev-only 參數、大字標籤與避讓、六主幹一層支線放射布局、實際島體投影 fit 與橋端。
- [x] Agent A /root/revision_dressing：實際平行交付 dressing.js 與 4 項測試，15 主題岩崖／水景／植被／道具，保留漫遊、動物及小屋區。
- [x] Agent B /root/revision_npc：實際平行交付 npc-motion.js 與 10 項測試；安全慢速漫遊、局部關節、pause/resume，禁止世界座標烘焙。
- [x] Agent C /root/revision_fauna：實際平行交付 fauna.js 與 6 項測試；每島三隻、15 特色物種、錯相動畫，保留原 S01 第一隻。
- [x] Main：審查三者實際結果後整合地表／水面／建築／視線安全及 Modal 暫停；修正高度快取階梯誤差，75 人均能在安全圈內移動。
- [x] Main：保留原 41 項並新增 27 項單元測試，24 項瀏覽器檢查、build 與 Apache smoke；保存修正前後總覽、12／15／聚焦與窄畫面截圖及軟體 GPU 數據。
- [x] Main：更新 README、PHASE_2_ACCEPTANCE、開發契約與同一 Draft PR #2 的交付內容。
- [x] 教師後續已確認此前版 Windows 11 島名、題目 NPC 漫遊／點擊停止，以及 12／15 島硬體 GPU 流暢。新增生命感仍另列待驗收，未授權合併或部署。

本輪 SwiftShader 軟體 GPU 1.53–4.28 FPS；12 島總覽 298 calls／260,364 triangles，15 島總覽 364 calls／335,188 triangles。不能視為一般筆電流暢度通過。完整數據、截圖與測試限制見 docs/PHASE_2_ACCEPTANCE.md。前面的 Phase 1／初版 Phase 2 數據均為歷史紀錄。

## Phase 2 最後生命感修訂（目前工作）

教師已確認前版 Windows 11 標籤、NPC 漫遊／點擊停止、12／15 島硬體 GPU 流暢。此回覆更新前面的「待重驗」狀態；沒有提供數值 FPS。本輪從 25f2c62 繼續同一分支／Draft PR #2。

- [x] Agent A /root/sea_life：實際平行交付 sea-life.js 與 7 項測試；柔和動態海面、四隻外海巡遊鯨魚、錯相噴水及尾波，最多 19 draws／8,866 triangles。
- [x] Agent B /root/visitors：實際平行交付 visitors.js／visitor-navigation.js 與 11 項測試；地表分區與開放橋網、跨島返回、會車排隊、NPC 避讓，與題目 NPC 完全分離。
- [x] Main：依 LIFE_INTERFACES 審查後整合；91/91 單元、build、Apache smoke、32/32 瀏覽器通過；原 75 題目 NPC／取景／每島三動物／鎖定／模式均保留，完成八情境效能與代表截圖。
- [x] 更新同一 Draft PR #2 的交付文件與代表截圖；不另建 PR。
- [x] 教師已於Phase2.5指示確認完整Phase2驗收，PR #2已合併；無部署授權。

本輪軟體 GPU：SwiftShader／Chromium154／DPR1，2.94–4.29FPS；12／15 島總覽293／359calls、272,982／347,806triangles。四鯨魚背景最多19draws／8,866triangles；原45個海泡沫合成1批，抵銷新增呼叫。地表分區及六個不安全既有橋口不納入背景通行，詳見驗收報告；仍可在多座安全連通的開放島間巡遊返回。沒有新的實體GPU數值，新增項目待教師Windows再驗收。

## Phase 2 Modal 字體與版面修訂（最新交付）

基準1854e26，工作樹乾淨、原Draft PR #2仍開啟。基準91/91測試通過。教師要求所有Lecture／NPC／操作說明視窗共享更易讀的字體及620px版面，不授權Phase3。

- [x] 共用Modal：桌面28／18／14／13px，內文1.75行高與更高對比；寬620px，固定標頭／關閉鈕與附註，長內容內部捲動。
- [x] 手機內文16px、響應寬度、44px關閉鈕；可聚焦內容區支援鍵盤捲動，避免整頁溢出。
- [x] 三尺寸的Lecture／Q05／操作說明截圖，Q01–Q05暫停／恢復，背景動畫、相機隔離與長內容回歸。
- [x] npm test → build → npm run test，smoke與完整瀏覽器回歸；更新文件及同一Draft PR #2。
- [x] 教師已確認Phase2驗收，PR #2已合併；本輪新授權另列Phase2.5。

最終結果：兩次各91/91通過；build／Apache smoke及44/44完整瀏覽器通過。新增12項Modal檢查，保存九個一般視窗與兩個長內容量測，內文對比8.39:1。執行時只修改style.css及共用內容區HTML屬性，3D／相機／JSON均未更動。
