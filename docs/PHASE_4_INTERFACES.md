# Phase 4 凍結介面與所有權

基準 main `dd3f96f4c301f0f4ecfbe1a4ffc7e360ecacd159`，PR #1–#4 已合併，教師確認 Windows 驗收。只在 `feature/phase-4-quiz-integration` 工作，交付唯一 Draft PR #5；不部署／合併／Tag／Release／Phase5。

## 所有權

- Agent A：`src/quiz-contract.js`、`src/legacy-assignment/`、`schemas/`、`test/quiz-contract.test.js`、`test/fixtures/legacy/`、`scripts/legacy-parity.*`、`docs/ASSIGNMENT_COMPATIBILITY.md`。唯讀參考 `/workspace/scratch/phase4-city`（v1.0.0=38b1dfdd73d766ec1d01999216b24dfca2126fad）、`/workspace/scratch/phase4-maze`（70cc35d9ce828bcd5357f16fe85f303aa2d30cd9）。不改來源 repo。
- Agent B：`src/quiz-data.js`、`src/quiz-session.js`、`test/quiz-data.test.js`、`test/quiz-session.test.js`。
- Agent C：`src/quiz-ui.js`、`src/quiz.css`、`test/quiz-ui.test.js`、獨立 `scripts/quiz-component-browser.js`（若需要）。
- Main：所有共享核心、Demo、Content Validator、整合測試、其他文件、Git／PR。Subagents 不改 main/scene/ui/config、既有測試、package/lock、AGENTS/Plan、公用資料，不提交／推送／建立PR。

需要變更契約先回報 Main，各 Agent 只改上述檔案。

## A：Legacy contract

`src/quiz-contract.js` 原生 ESM 匯出 `normalizeUnit`, `normalizeManifest`, `validateUnit`, `validateUnitV1`, `validateUnitV2`, `validateManifest`, `acceptsAnswer`, `validateOrThrow(issues,file)`。
驗證器回傳原版有序 `{path,code,message}[]`；normalize 深拷貝／trim 語意、選項順序、v1/v2 單選判答完全沿用原版。唯一內容變更為 S01–S15／最多15單元／Schema對應檔名；保留來源註記及非通用授權說明。全364 validation／76 answer corpus與Python獨立實作優先重用，明確列出 S13 邊界預期差異。不要用 Lecture URL 規則代替 Quiz URL 規則。

## B：Loader 與記憶體 Session

`createQuizLoader({baseUrl,totalUnits,manifest,fetchImpl=fetch,readDemo=null})` → `{load(unitId),clearCache(),cancel(unitId?)}`。
`load` 回傳 Promise<深凍結、驗證且normalize後的 unit>；先檢查課程範圍及Manifest白名單再cache/fetch。固定相對 `./assignments/Sxx.json`，嚴格 Legacy manifest、題庫檔名／ID、normalize後title需與Manifest一致。成功cache／single flight／獨立單元併發、失敗可重試；cancel/clear令舊回應不能cache或交付有效成功（AbortSignal+generation）。`QuizDataError` 有 code（LOCKED/HTTP/JSON/INVALID/NETWORK/CANCELLED）、message、完整issues。避免永久掛起（例如15秒timeout）。不讀取任何儲存或其他路徑。

`createQuizSessions()` → `{activate(unit),get(unitId),snapshot()}`。
`activate` 驗證／normalize／freeze，初次建立回傳session；同unit相同資料重入保留已通過，不可默默換題重置。`get` 未載入回null。
session → `{unit,unitId,questions,total,count,complete,question(id),hasPassed(id),answer(id,selected),snapshot()}`。`answer` 回 boolean，僅當單選符合原版 acceptsAnswer 時增加passed，不因錯答撤銷；無效qid也不污染。
session.snapshot → `{unitId,total,count,complete,passedIds,formUrl}`，formUrl未完成null。store.snapshot → 上述陣列。只在頁面記憶體；各單元互不干擾。

## C：Quiz 共用 Modal

`createQuizController({dialog,sessions,onProgress=()=>{},demo=false})` → `{open(unitId,questionId,source),snapshot()}`。
Main 在場景生成前載入各開放單元（allSettled），只給有效資料建立NPC／session；UI open直接讀session，不重讀題庫。無效unit/qid不可開假題。Main 負責NPC暫停／恢復及Scene標記；每次成功提交後 `onProgress(unitId,questionId)`，Main據session更新Q標／精簡完成入口。
`dialog.showContent(title,node,source,kicker,{kind:'quiz'})` 回 revision；`dialog.open`、`dialog.revision`、`dialog.replaceContent(node,expectedRevision)` 可用。舊事件必須檢查revision／open，不能在close/其他Modal後提交或更新。
`open`用 `${unitId} · ${questionId}` 加選用title；保留共用28/18px、手機16px。DOM全用textContent，radio單選原選項順序（不補D），Question連結預先有、Explanation／文字只在hasPassed、Form只在complete。全部原始normalize後安全URL、target=_blank rel=noopener noreferrer，原生點擊，不自動導覽／iframe／持久儲存。
建議穩定選擇器：`.quiz-content`、`.quiz-answer` form、`input[name=quiz-answer]`、`.quiz-submit`、`.quiz-feedback`、`.quiz-progress`、`.quiz-question-video`、`.quiz-explanation-video`、`.quiz-form-link`。保留輸入焦點與捲動，不因回饋整個Modal重建。Quiz CSS可由quiz-ui.js import，使video-only不載Quiz模組／CSS。

## Main 整合

Quiz entry只在 `assignmentMode==='quiz'` dynamic import，不讓video-only下載Quiz runtime。DEVelopment Demo改用合成完整題庫，預設交錯四／五題，`questions=4/5`保留顯式全部同題數回歸。scene接收已驗證的assignment Map，每島獨立生成4/5NPC，沿用原模型／漫遊安全，不改島形／相機／日夜。原測試可保留fixture相容adapter，但正式入口不使用Demo題數生成NPC。

Loader錯誤不產生假NPC；導覽旁精簡狀態可開明確錯誤Modal，Lecture仍可使用。完成入口依同一session狀態產生，不建立第二份進度。

驗證：原148測試基準、Legacy parity、新單元及混合題數／模式／race／外連／三尺寸／NPC／全場瀏覽器回歸，五個指定命令及實際截圖／效能；正式空Manifest及course JSON不改。


## 實際交付結果（Main審查）

三位皆已實際spawn且交付停止：`/root/phase4_contract` 14項契約及364/76跨語言、17擴展／381Schema；`/root/phase4_data` 21項Loader／Session；`/root/phase4_ui` 22項UI及原生三尺寸、極端長文／keyboard／三個攔截popup。Main整合新增6項，合計211單元。所有權遵守，無來源Repo／正式資料／package／Git越界，沒有各自PR。

Main另外以實際Production瀏覽器確認，Vite把原UMD包裝為CommonJS時須用City原本的namespace fallback，橋接已使用`legacy.default ?? globalThis.AssignmentValidator`。這是打包接線，沒有更動原rules／normalize／validator／acceptsAnswer；Apache production Quiz與Video-only資源隔離由完整整合browser驗證。

Main另以native Dialog重現關閉後重開仍保留534px舊捲動的問題：隱藏內容區在showModal之前寫scrollTop無效。共用Dialog在顯示／關閉鈕聚焦後才重設新內容至頂部；外部新分頁返回不呼叫showContent，仍保留原捲動。三尺寸native helper及整合Quiz逐次open均驗證此契約，不改原字級／Lecture清單／相機／資料。
