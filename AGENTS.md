# Engineering Island Lab 開發規範

- 開工先完整閱讀 `CODEX_START_HERE.md` 與 `docs/{PROJECT_SPEC,CONTENT_AND_RELEASE,PHASE_PLAN,STYLE_REFERENCES}.md`，查看四張參考圖；00 是規則柱體反例。參考圖只供研究，不可放入 public/dist。
- 本次授權範圍只有 Phase 0/1。獨立功能分支、Draft PR 後停止，等待教師 Windows 11 Chrome/Edge 實際驗收。不得合併、改 main、部署、Tag/Release 或自行進 Phase 2。
- 維持 Node 24、Vite、Three.js、Vanilla JS/CSS、固定 lockfile、`base: './'`。資源相對 HTML 位置載入；只打包靜態 dist，不加入後端/登入/DB/追蹤。
- 一套連續世界與斜上方 OrthographicCamera；自然不規則、有厚度岩坡地貌、明亮童話模型。不可用規則方柱/六角柱冒充島。無學生化身、WASD、碰撞、尋路。
- 地貌/建物/動畫、相機、拾取、資料驗證、DOM UI 分模組；純模型及互動狀態可無 DOM/GPU 測試。島體使用程式原創幾何，不新增來源不明資產。
- 動物純自主裝飾，不註冊拾取/hover/事件，不可讓游標、點擊或焦點改變動物動畫。
- 正式 `public/assignments/manifest.json` 維持 `{ "schemaVersion": 1, "units": [] }`。Phase 1 Demo fixture 在 src/demo，僅透過明確 Demo 入口啟用；不可放真題、影片/Form 網址或虛構教材。
- courseTitle 非空、totalUnits 整數 1–15、assignmentMode 明確 quiz/video-only；模式不由題庫缺檔推測。video-only 不建立 NPC/Q 標籤/題目 UI，也不 fetch 題庫。
- click/drag 使用最大位移閾值；pointer cancel/多指操作不可觸發點擊。Modal 開啟鎖定場景，Esc/關閉後回復焦點。
- 必跑 `npm test`、`npm run build`、`npm run test:smoke`。瀏覽器另驗正交構圖、標籤、縮放/平移/聚焦/返回、Modal 隔離、無互動鯊魚及 video-only。Node 測試不能代表美術通過。
- README/Plan/PR 精確標明完成範圍、基準和測試證據、Demo 與正式清單區別、剩餘 11/14 島及未實作 Lecture/Quiz 契約。Phase 4 前需另讀舊題庫相容文件，不能自行重造 v1/v2。
