# Phase5 發布範圍與安全檢查

2026-10-30；本輪是靜態 RC、發布驗證及操作文件，不是重新開發功能。未改 scene／camera／動畫／講義及題庫契約、原判答規則、正式12島 Quiz設定或空 Manifest。沒有部署學校、建立帳號／後端／資料庫／追蹤服務；不把本檢查稱為完整滲透測試或沒有漏洞的保證。

## 輸入、輸出與教材界線

| 檢查                 | 實際程式與既有回歸證據                                                                        | 結論與限制                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| config／Manifest     | `src/config.js`；`test/config.test.js`、`test/quiz-scene.test.js`                             | title 非空、1–15整數、明確 quiz/video-only；Manifest 欄位、唯一 Sxx、檔名及課程範圍嚴格驗證。Manifest 仍是開放清單，不是 HTTP 存取權限。                                                                                                                         |
| Lecture JSON         | `src/lecture-data.js`、`test/lecture-data.test.js`、`test/lecture-ui.test.js`                 | 固定相對路徑，先 allowlist 再讀取／cache；驗證單元、文字及 HTTPS YouTube；不排序或製造影片。完整發布檢查另拒絕空候選。                                                                                                                                           |
| Quiz v1/v2           | `src/legacy-assignment/`、`src/quiz-contract.js`、`test/quiz-contract.test.js`                | 既有 URL regex／normalize／單選 acceptsAnswer 不改；4/5題、v1 correctOption、v2 correctOptions 單選任一接受答案、必要解說影片等規則完整重播。公開 Quiz JSON 設計上包含答案，**本網站是練習，不是防作弊考試平台**。                                               |
| 非同步／題庫來源     | `src/quiz-data.js`、`test/quiz-data.test.js`                                                  | allowlist 在 cache／fetch 前檢查，固定 assignments/Sxx.json；no-store／redirect:error、逾時與取消／世代檢查、單元／標題驗證，失敗不產生可作答 NPC。                                                                                                              |
| DOM 文字             | `src/ui.js`、`src/lecture-ui.js`、`src/quiz-ui.js`、`src/main.js`                             | 動態標題、prompt、options、錯誤以 textContent／DOM 節點建立；本專案內容 UI 沒有 innerHTML／eval／document.write。既有 Lecture／Quiz UI 測試包含 HTML-looking text 不執行案例。這不是對任意第三方 JS 的通用安全證明。                                             |
| 外部 URL 與連結      | Lecture validator、原版 assignment rules、兩個 UI                                             | 僅接受各自已定案的 HTTPS YouTube／Google Forms規則；`target="_blank"` 與 `rel="noopener noreferrer"`。只有使用者明確點擊才開啟；不 iframe、不預取 provider、不自動導航／送出表單。URL 語法合法不代表影片或表單仍可使用，教師須學生視角確認。                     |
| 鎖定島／Video-only   | Main 整合、`test/quiz-scene.test.js`、既有 browser 網路攔截                                   | 未開放單元不載入 Lecture／Quiz；Video-only 不產生題目 NPC，不載入 Quiz runtime 或題庫。未列出私稿若放在 public HTTP 目錄仍可被猜 URL 下載，因此不准預先上傳私稿。                                                                                                |
| Production Demo 隔離 | `import.meta.env.DEV` 明確分支；原 browser production checks；Phase5 實際 RC scanner／browser | Demo／units／open／mode／questions參數不能改 production config。DEV telemetry 只供本機測試，production 不暴露 `window.__islandLab`／Debug Panel。不能只搜普通變數名 demo、token、correctOption 就判斷洩漏；應查實際 fixture URL／payload、檔案清單與可下載內容。 |
| 學生資料及進度       | `src/quiz-session.js`、`test/quiz-session.test.js`、原 browser跨島／重整案例                  | 只在本頁 JS 記憶體保留題目完成狀態；重新整理歸零。沒有學生識別資料、localStorage／sessionStorage／IndexedDB／Cookie 持久化、觀看歷程、Form提交狀態收集或 analytics。糖果島的 `cookie` 變數是餅乾幾何，不是 browser Cookie。                                      |
| 秘密與多餘發布檔     | Phase5 `check:release` 實查 build、`package:rc` 僅包通過檔案                                  | 拒絕環境檔、憑證樣式、dev/test/fixture/private/backup、不允許的檔案及未列出的教材；保留合法 W3C namespace／URL regex。所有掃描只限可觀測檔案與已知模式，不能保證偵測任何形式的任意秘密。最終掃描及 ZIP receipt 見 Phase5 驗收。                                  |

原始程式搜尋核對的是正式 `src/`（排除 DEV fixture）及已驗收 UI／loader 路徑；沒有因普通 identifier、W3C SVG namespace 或 verifier內的安全 URL regex 誤判遠端服務。原正式設定仍是數位電子學／12／quiz，Manifest units=[]，沒有真實題庫、正式影片或學生資料進 RC。

## 已實際執行的相容性及 advisory 檢查

品質 Subagent 在未修改來源／依賴下實際執行，完整結果由 Main 保存於 [`acceptance/phase-5/quality/`](acceptance/phase-5/quality/)：

- `node scripts/legacy-parity.mjs`：364 validation／76 answer selections，17擴展／381Schema，Python及Schema parity通過；changedValidity=0。11筆範圍錯誤差異仍是 Phase4 已限定的 S15擴展，不是本輪放寬規則。
- `node --test test/legacy-checkout.test.js test/quiz-contract.test.js`：15/15通過。包括 core.autocrlf=true 的新clone與既有CRLF安全重取、14/14 pinned hashes、兩份ported JS維持LF、一般control仍CRLF；原參考內容、SHA預期與`.gitattributes`未改。
- `npm audit --json`、`npm audit --omit=dev --json`：兩者皆實際連 Registry 成功、exit0，當時回覆0筆已知 advisory（info／low／moderate／high／critical均0）。全套及 production輸出分別保存為 `audit-all.json`、`audit-production.json`。這只代表該次 Registry資料庫未回報已知相依advisory，**不宣稱無漏洞**；本輪未自動升級任何依賴。
- 上述是品質組的獨立範圍檢查；Main另跑完整既有212基準及新增 Node測試、全部原76組 browser及新效能採樣、build／smoke／content／release／RC／隔離Apache。精確最終總數及輸出見 [PHASE_5_ACCEPTANCE.md](PHASE_5_ACCEPTANCE.md)。

## 效能、平台與部署限制

`scripts/quality-browser.js` 只作測試觀測：1366×768、DPR1、12/15全開放、每島5題壓力情境；3個RAF暖機後20個interval，記錄逐幀時間、FPS、Draw Calls、Triangles、GPU renderer及資源／生命數量。另有單島及Video-only；維持一個active world，沒有加 production debug API 或改動動畫。資料與6張實際截圖由Main完整browser回歸產生。

雲端只有 Chromium／SwiftShader 軟體 GPU，短樣本不可代表 Windows 實體 GPU表現。教師先前已驗收 Windows Phase0–4主要功能；**本輪 RC 的 Windows Chrome／Edge及實體GPU重驗仍待教師執行**。本機隔離 Apache證據也不是學校正式Apache部署成功；後者未取得執行授權，本輪沒有連接或修改正式網站。

正式許可前仍需教師：確認私有教材沒有進公開目錄、檢視所有外連內容與權限、在目標Apache套用可用的freshness策略，完成Windows RC驗收，再明示合併／Tag／Release／部署。檢查成功、空Manifest或本機RC產生都不構成AI自行發布的許可。
