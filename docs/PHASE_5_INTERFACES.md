# Phase 5 介面與檔案所有權

基準 main `046efcab7b359cce046038fe66c95c5821edfad4`；PR #1–#5 已合併，教師已驗收 Phase0–4（含 Windows EOL）。本輪 `feature/phase-5-release-readiness` 只做封裝／部署驗證／操作文件。唯一 Draft PR #6 後停止，不建 Tag／Release、不改可見性、不部署學校、不發布教材。

## 所有權與保留範圍

- A `/root/phase5_packaging`：`scripts/package-release.js`、`scripts/deployment-server.js`、`scripts/smoke-test.js`、`test/release-package.test.js`、`test/deployment.test.js`。
- B `/root/phase5_content`：`scripts/check-release.js`、`test/check-release.test.js`、`docs/TEACHER_OPERATIONS.md`。既有 `validate-content.js` 及測試只讀，需要必要修正先回報。
- C `/root/phase5_quality`：`scripts/quality-browser.js`、`docs/THIRD_PARTY_NOTICES.md`、`docs/DEPENDENCY_INVENTORY.json`、`docs/PHASE_5_SECURITY.md`、`public/THIRD_PARTY_NOTICES.txt`。實際執行 audit／parity／既有EOL測試，證據先存 `/tmp/phase5-quality/`。
- Main：共享核心保留，管理 package scripts／lock（原依賴不升級）、README／AGENTS／Plan、其他操作及驗收文件、Docker Apache、RC browser及最終測試／截圖／Git／唯一PR。

Subagents只改上述檔案，不改共用main／scene／camera／ui／config／動畫／JSON契約／正式JSON／manifest／.gitattributes／14份reference或hash預期。不得推送、提交、建立PR、修改來源Repo或套件設定。已驗收功能不做風格重構。跨介面需求先通知Main；收到所有實際交付後才最終整合。

## B：實際 build 檢查

`scripts/check-release.js` 原生ESM匯出 `async checkRelease({root='dist'}={})` → `{ok,files,course,manifest,issues,warnings,content}`。

- `files`有排序的 `{path,bytes,sha256}`，path為根內POSIX相對路徑。`issues`為 `{code,path,message}`，不印出可能的secret值。函式唯讀、不部署；CLI接受 `--root <directory>`、`--json`，成功0／檢查失敗1／參數錯誤2。
- 只檢查實際root，不以source沒問題當build證據。拒絕symlink、私人／測試／開發檔、未知路徑、缺資源、絕對本機路徑、localhost測試網址、已知合成影片／Form／dev API、明確token／private key內容。禁止source map、.env、.git、node_modules、fixtures、工作紀錄或備份進網站。
- 合法目前靜態layout：index.html、favicon.svg、course-config.json、assignments/manifest.json、THIRD_PARTY_NOTICES.txt、assets/下Vite雜湊js/css；course-videos/Sxx.json及assignments/Sxx.json只允許Manifest已列出且完整驗證的單元，video-only不需要Quiz且不允許夾帶題庫。未列出內容一律阻擋。
- 重用已驗證config／Content Validator，不改schema／URL／acceptsAnswer。空manifest通過但明示沒有教材；本輪實際public設定保持數位電子學／12／quiz／units:[]。工具可驗未來教師核准的其他課程設定，檢查通過不代表發布許可。
- 不可僅搜demo／correctOption／token等普通程式識別字而誤判正式驗證程式；阻擋真正fixture payload／已知合成URL。辨別W3C namespace URL、通用UI說明與實際測試資料。授權TXT必須存在。

## A：封裝與靜態HTTP

`async packageRelease({root='dist',outDir='release-candidate',name='engineering-island-lab-v1.0.0-rc'}={})` → `{archivePath,sha256Path,inventoryPath,reportPath,sha256,bytes,files}`。

- 一律先呼叫B的checkRelease，失敗不產生候選。只包確認的regular files，重讀時核對digest防止打包前變動；outDir不得在root內，basename不能含路徑。可用Node24標準庫（CRC32／deflate）產生正常ZIP，避免新增依賴或要求Windows有系統zip。
- ZIP解壓即網站根目錄（不多包dist/），提供ZIP SHA256、逐檔inventory及scan報告在ZIP外。拒絕不安全路徑／大小，檔案順序及zip metadata盡量可重現。CLI可用 `--root`／`--out`；不建Tag／Release、不部署。Main最後複製核准候選到versioned artifacts。
- `scripts/deployment-server.js`匯出 `async startDeploymentServer({root,mountPath='/course/'})` → `{baseUrl,kind:'node-http-simulation',close:async()=>{}}`。僅127.0.0.1、臨時埠、靜態檔案，不提供SPA fallback；正確JS/CSS/JSON/SVG MIME、directory index／trailing slash、真404。HTML／JSON重新驗證，雜湊assets可immutable長cache，路徑必須留在root，清楚標為模擬。
- `scripts/smoke-test.js`匯出 `async runSmokeTests({startServer=startDeploymentServer}={})`；factory輸入與上述一致。保留原正式asset／config／空Manifest、臨時video-only Lecture與v1/v2四五題／S15三段，擴充真正404／MIME／相對assets（含動態Quiz chunk）／快取。所有fixture在臨時dist副本，原public與正式dist不改。CLI直接執行預設simulation；Main會注入隔離Docker Apache factory執行相同smoke。

## C：品質、授權與安全證據

- 已有基準212 Node／76 browser、364 validation／76 answer、17擴展／381Schema，保留全部及Git checkout14hash。不要各自重跑完整耗時renderer；Main統一完整回歸。
- `scripts/quality-browser.js`匯出 `async checkPhase5Quality(page,base,pass)`，只用既有DEV隔離Demo觀測，不改產品。量測12 Day／Night、15 Day／Night、單島聚焦、Quiz及Video-only；DPR1、20或以上RAF樣本、FPS／drawCalls／triangles／renderer，輸出test-results/phase5-quality.json及具代表的真實截圖。若要暫停parent renderer可先goto about:blank，建立獨立context，最後關閉；不得暴露prod debug API。
- 授權inventory分清runtime與build／test；實讀node_modules／lockfile LICENSE，Three.js、Vite helper及必要完整notice放public/THIRD_PARTY_NOTICES.txt（單一檔）。Maze無根LICENSE；City有MIT LICENSE但Maze來源元件不可推定blanketMIT，保留教師明示重用來源／commit。原創模型、系統字體、僅研究參考圖不包public等如實記錄。
- audit生產及全部依賴，網路失敗明示未驗證；只回報經證據分類的runtime／dev範圍，不自動大型升級。不宣稱無漏洞。安全文件對照JSON／textContent／HTTPS／noopener／白名單／DEV隔離／無storage／無追蹤現況及測試，明示沒有學校實機部署、Phase5 Windows RC與硬體GPU重驗。

## Main 整合與停止點

授權只準備RC。新增 npm check:release／package:rc 及必要Apache／RC browser入口；正式build仍base:'./'，不把.htaccess預設塞入ZIP，文件提供有前置條件的選用Apache cache設定。Docker只用本機managed socket，絕不部署學校。

最終npm ci／test／build／smoke／browser／validate:content／parity，加release scan／package／隔離Apache與ZIP檢查；保存實際ZIP、inventory／SHA、完整輸出、截圖／性能與限制。全部原先UI及資料契約不變，唯一Draft PR #6後等教師。
