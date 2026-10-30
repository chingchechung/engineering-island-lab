# Phase 3 共用介面與平行所有權

基準main 91f33c2，PR #3已合併，教師已確認Phase2.5 Windows驗收。新分支feature/phase-3-lecture-publishing，只交付一個Draft PR #4後停止。完整原文PHASE_3_BRIEF.md。

## 檔案所有權（Subagents不得操作Git／PR）

- A `/root/phase3_data`：新增src/lecture-data.js、scripts/validate-content.js、test/lecture-data.test.js、test/content-validator.test.js。其他檔案均不得修改。
- B `/root/phase3_ui`：新增src/lecture-ui.js、src/lecture.css、test/lecture-ui.test.js；可新增scripts/lecture-component-browser.js供獨立UI驗證。其他檔案均不得修改。
- Main：main.js、共用ui.js／index.html、config.js（原則不改）、Demo影片fixture、package.json腳本、既有／整合瀏覽器測試、smoke、所有文件及Git／PR。
- 共用契約更動先通知Main，不能各自改共享檔案。禁止正式Manifest／course-config／真實課程影片／islands.json、場景／相機／動物新功能、Phase4、部署／合併／Tag／Release。

## A — Lecture資料

`validateLecture(value, expectedUnitId, totalUnits=15)`回傳已驗證的{unitId,title,videos:[{title,url}]}。保留原始title／url及順序，非空文字用trim檢查但不改寫原內容；videos:[]在runtime合法，CLI發布檢查預設拒絕空。Unit固定S01–S15且不超過totalUnits，與請求一致。嚴格HTTPS YouTube影片（youtube.com／www.youtube.com／m.youtube.com的watch?v=11字元ID，youtu.be/11字元ID；可保留時間與其他有效參數），不接受帳密、偽網域、javascript/data/http、控制字元或路徑注入。不得連YouTube API。

`createLectureLoader({baseUrl,totalUnits,manifest,fetchImpl=globalThis.fetch,readDemo=null})`回傳`{load(unitId),clearCache()}`。建立時驗證既有course範圍與Manifest格式；每次load先判斷合法且已開放再取快取／請求。固定相對路徑./course-videos/Sxx.json。readDemo若有為async(unitId)=>raw JSON（可拋HTTP/JSON錯誤）；Main僅在Vite DEV且demo=1時注入，A不解析query。共用同一驗證與清單不變性，快取成功清單／併發in-flight，失敗可重試。錯誤有明確message，可附code（LOCKED/HTTP/JSON/INVALID/NETWORK）。不能讀題庫或寫storage。

CLI：`node scripts/validate-content.js [--unit S04] [--root <public-directory>]`，root預設process.cwd()/public，唯讀。預設驗course／manifest與所有已開放Lecture，拒絕缺檔／非法／空影片。video-only不讀也不要求題庫。quiz必須顯示Phase4完整性尚未支援；有已開放Quiz單元時，預設發布檢查回非零，不能宣稱可發布。空Manifest本專案預設可回0，但清楚標示沒有開放單元及Quiz尚未支援。--unit只驗候選Lecture，可回0但明示不代表作業／發布就緒；不寫Manifest、不開放單元。題庫即使存在也不假裝驗證過。未知參數／非法unit失敗。

## B — Lecture UI

`createLectureController({dialog,loader,demo=false})`回傳`{open(unitId,source),snapshot()}`。open可非同步：立即顯示載入，await loader.load；只更新同一仍開啟session，關閉、切單元或換NPC／操作說明後，舊回應不可覆蓋。snapshot僅診斷狀態／unitId／影片數，不改控制。

Main在共用createDialog保留show(title,paragraphs,source,kicker)，新增：
- `showContent(title, node, source, kicker, {kind=''}={})`：置入安全Node，重設scroll、開啟native modal／關閉鈕焦點，回傳revision整數；kind='lecture'時加lecture-dialog class。
- `revision` getter：每次show／showContent及close都遞增。
- `replaceContent(node,revision)`：只在目前open且revision相符時replaceChildren，回傳boolean；不重開、不變更焦點／scroll。

B使用既有#dialog-title／.dialog-scroll／#dialog-content，Lecture專用CSS讓h2在內容區頂端sticky（固定背景／標題），不動其他視窗。可捲內容、標題換行、620px／28/18字體、手機16、44關閉鈕維持；第一個p沿用#344f45及1.75行高供既有閱讀驗證。

建立安全DOM（textContent/createElement）與依序ol影片列，連結target=_blank rel='noopener noreferrer'、足夠點擊區。不能自動開分頁、嵌入、排序、追蹤或fetch題庫。demo=true明示測試連結非正式教材。空列顯示「本單元尚無課程影片」，錯誤明確且不產生連結。開外頁不關閉dialog／不改scroll。B可用fake DOM驗核心及獨立瀏覽器component，但GPU瀏覽器由Main排程避免搶負載，需跑先通知。

## Main 整合／驗收

Demo S01=1、S02=4、S03=10、S04異序，S05缺資料；其餘單元安全示例。全部放src/demo，prod query無法啟用。正式public JSON完全不改。Main加入CLI npm script、固定路徑Apache回歸、真popup且攔截外部YouTube避免真網路、錯誤／empty／late response／cache／長內容／雙模式與全部56項既有行為；提供8類截圖及Windows流程。所有Subagents實際交付並審查後才宣稱完成。

## 實際交付／審查

A四檔20/20、B四檔14/14與Native12個三尺寸清單／popup／極端標題驗證已交付並停止。Main已讀實作，補共用queued close保護、正式S01的Lecture action／label kind依Manifest（原Demo fixture依賴），148/148測試與Apache暫存副本smoke通過。新Lecture九組整合scoped瀏覽器全通過，完整原56項另與新情境一起跑最終驗收。
