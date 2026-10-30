# Engineering Island Lab 開發規範

> **最新授權 Phase5（2026-10-30）**：教師已驗收Phase0–4（含Windows EOL），PR #1–#5已合併main 046efcab。本輪依docs/PHASE_5_BRIEF.md在feature/phase-5-release-readiness做RC封裝、Apache／快取／MIME／404驗證、build掃描、教師SOP、授權與安全證據；三位Subagents所有權及介面先定於docs/PHASE_5_INTERFACES.md。以下Phase停止條件均為歷史，不限制本輪明確授權。正式course-config／空Manifest、14份pinned內容與hash、.gitattributes及已驗收功能不改，無理由不動src或依賴。只交唯一Draft PR #6與RC ZIP後停止，不Merge／Tag／GitHub Release／公開Repo／學校部署／發布真實教材／下一功能階段。

> Phase5交付已完成：唯一[Draft PR #6](https://github.com/chingchechung/engineering-island-lab/pull/6)，238/238 Node、82/82 browser、RC ZIP與本機真正Apache驗證／16張截圖已保存。停止等待教師RC／Windows及實體GPU驗收；不得自行合併、Tag／Release、公開化、部署學校或下一功能階段。

> Phase4 Windows EOL修正（歷史，已驗收合併）：同一分支／Draft PR #5。`test/fixtures/legacy/reference/** -text`必須保留全部14份原始bytes及既有SHA；`src/legacy-assignment/*.js text eol=lf`。不得為跨平台測試改原始內容、hash預期或驗證／判答演算法；既有CRLF重取先備份，步驟見docs/WINDOWS_EOL_CHECKOUT.md。不改Git全域設定、不合併／部署／進Phase5。

> **Phase4歷史授權（2026-10-30，已驗收合併）**：教師確認Phase0–3 Windows驗收，PR #1–#4已合併main dd3f96f4。依 docs/PHASE_4_BRIEF.md 在 feature/phase-4-quiz-integration 開發舊題庫v1/v2、NPC Quiz與Form；本輪授權取代下方歷史停止條件。先凍結 docs/PHASE_4_INTERFACES.md，再實際平行三位Subagents。共享核心／Git由Main管理；正式Manifest空白、正式教材不改，Quiz只在quiz模式載入，Demo只限DEV。唯一Draft PR #5後停止，不合併／部署／Tag／Release／Phase5。

> **Phase3歷史授權（2026-10-30，已驗收合併）**：教師已確認Phase0–2.5 Windows驗收，PR #1–#3已合併。從main 91f33c2建立`feature/phase-3-lecture-publishing`，依`docs/PHASE_3_BRIEF.md`開發Lecture Loader／Validator／共用清單與教師發布工具。實際兩位Subagents的凍結介面與所有權見`docs/PHASE_3_INTERFACES.md`。先前Phase限制是歷史紀錄，不限制本輪已授權Lecture／工具／package腳本修改。
> 正式JSON格式及空Manifest不改，Demo只限Vite DEV且demo=1。影片只用安全外連、不嵌入／不排序／不追蹤；發布工具唯讀且標示Quiz完整性Phase4尚未支援。不得讀取／發布真實教材、開發Quiz判答、重做3D／相機或進Phase4。唯一Draft PR #4後停止，不合併／部署／Tag／Release。

> Phase2.5歷史授權（已驗收、PR #3已合併）：Phase 2 已由教師 Windows 驗收，PR #2 已合併 main d136c9c。本輪依 `docs/PHASE_2_5_BRIEF.md` 開發 Phase 2.5，分支 `feature/phase-2-5-day-night-camera-orbit`，建立唯一新 Draft PR #3 後停止；不合併／部署／Tag／Release／進 Phase 3。此前同一 PR #2／禁止修改相機只屬歷史範圍。
> 本輪實際平行兩位 Subagents，介面與檔案所有權見 `docs/PHASE_2_5_INTERFACES.md`。只旋轉正交相機，不旋轉世界；夜晚確實有窗光與橋燈，使用少量光源／合批，保留共享材質及釋放。正式 JSON／布局不變。

- 開工先完整閱讀 `CODEX_START_HERE.md` 與 `docs/{PROJECT_SPEC,CONTENT_AND_RELEASE,PHASE_PLAN,STYLE_REFERENCES}.md`，查看四張參考圖；00 是規則柱體反例。參考圖只供研究，不可放入 public/dist。
- Phase 0/1（含木橋）已由教師 Windows 11 驗收，PR #1 已合併。最新授權見 `docs/PHASE_2_LIFE_BRIEF.md`（前版見 `docs/PHASE_2_REVISION_BRIEF.md`、初版見 `docs/PHASE_2_BRIEF.md`），本次只開發 Phase 2，分支 `feature/phase-2-full-archipelago`。Draft PR 後停止，不得合併、改 main、部署、Tag/Release 或進 Phase 3。
- 維持 Node 24、Vite、Three.js、Vanilla JS/CSS、固定 lockfile、`base: './'`。資源相對 HTML 位置載入；只打包靜態 dist，不加入後端/登入/DB/追蹤。
- 一套連續世界與斜上方 OrthographicCamera；自然不規則、有厚度岩坡地貌、明亮童話模型。不可用規則方柱/六角柱冒充島。無學生化身、WASD、碰撞、尋路。
- 地貌/建物/動畫、相機、拾取、資料驗證、DOM UI 分模組；純模型及互動狀態可無 DOM/GPU 測試。島體使用程式原創幾何，不新增來源不明資產。
- 動物純自主裝飾，不註冊拾取/hover/事件，不可讓游標、點擊或焦點改變動物動畫。
- 正式 `public/assignments/manifest.json` 維持 `{ "schemaVersion": 1, "units": [] }`。Phase 1 Demo fixture 在 src/demo，僅透過 Vite dev 加上明確 `?demo=1` 啟用；不可放真題、影片/Form 網址或虛構教材。
- courseTitle 非空、totalUnits 整數 1–15、assignmentMode 明確 quiz/video-only；模式不由題庫缺檔推測。video-only 不建立 NPC/Q 標籤/題目 UI，也不 fetch 題庫。
- click/drag 使用最大位移閾值；pointer cancel/多指操作不可觸發點擊。Modal 開啟鎖定場景，Esc/關閉後回復焦點。
- 必跑 `npm test`、`npm run build`、`npm run test:smoke`。瀏覽器另驗正交構圖、標籤、縮放/平移/聚焦/返回、Modal 隔離、無互動鯊魚及 video-only。Node 測試不能代表美術通過。
- README/Plan/PR 精確標明完成範圍、基準和測試證據、Demo 與正式清單區別、各島地貌、實測 FPS/draw calls/triangles、測試限制及未實作 Lecture/Quiz 契約。Phase 4 前需另讀舊題庫相容文件，不能自行重造 v1/v2。

- Phase 2 根據 totalUnits 產生 1–15 座不同輪廓主題島；S01 與已驗收模型/動畫保留。Manifest 是唯一正式開放來源，鎖定島有完整橋及入口柵欄，保留色彩/動畫，點擊提示尚未開放；不能載入課程內容。本機 Demo 可模擬開放數，但不得改正式 Manifest 或讓 production query 啟用。
- 共用幾何/材質、花草 InstancedMesh、靜態合批、遠景細節/動畫降頻及聚焦陰影；模式重建需釋放 GPU 資源。必須量測效能，不能用 build 成功代替一般筆電實測。

- 本輪已依教師明確授權實際平行啟動 A/B/C/D 四組，模組所有權及統一契約見 docs/ISLAND_FACTORY.md。核心、測試、設定、Git/PR 由主 Agent 統一管理。所有 Subagent 已交付後才進行最終整合驗收，最後只有一個 Phase 2 Draft PR。

- 最新教師修正見 docs/PHASE_2_REVISION_BRIEF.md：沿用本分支與 Draft PR #2，只修 Phase 2。八項重點為大字標籤、豐富靜態裝飾、NPC 自主漫遊／點擊暫停、單列課名工具列、左下唯一導覽、僅 dev query 測試選項、六主幹放射布局、每島三隻且代表物種不重複。

- 本輪三位修訂 Subagents 已實際平行交付並停止；所有權及凍結介面見 docs/REVISION_INTERFACES.md。NPC 根與活動關節必須標記 animated，僅於局部框架合批；Modal 使用 world.setNpcPaused 接口。一般畫面不留測試面板，production 忽略全部 Demo 參數。

- 最新一輪教師已確認 Windows 11 的標籤、題目 NPC 操作與 12/15 島硬體 GPU 流暢。本輪只增海面、四隻外海鯨魚與 3–8 位不可互動 visitors；背景小人可沿已開放島橋網巡遊（本輪明確授權），不建立學生角色或完整遊戲尋路。檔案所有權與介面見 docs/LIFE_INTERFACES.md；仍更新同一 Draft PR #2 後等教師再次驗收，不合併／部署／進 Phase 3。

- 最新 Modal 修正：同一分支與 Draft PR #2，只調整共用 dialog 的字級／對比／620px 寬度與內部捲動、44px 關閉鈕及窄畫面。保留 Lecture／Q01–Q05／操作說明共用設計；不修改 3D 場景、相機、布局、課程 JSON 或 NPC pause/resume。三種驗收尺寸為 1366×768、1920×1080、390px，完成後仍等教師驗收。
