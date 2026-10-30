# 教師操作手冊：課程重用、每週更新與回復

本手冊供教師在**另行核准發布後**操作靜態網站。Phase 5 只準備 Release Candidate；本輪不開放真實教材、不上傳學校、不合併 PR、不建立 Tag／Release。目前正式設定仍是「數位電子學／12／quiz」，正式 Manifest 的 `units: []`，十二座單元島全部鎖定。這是合法的空網站候選，不代表已有教材可上課。

Apache 只需提供 ZIP 解壓後的靜態檔案，伺服器不需要 Node.js、npm、資料庫或登入服務。Node 24／npm 11 是教師本機建置及驗證工具。部署前置條件與快取設定見 [APACHE_DEPLOYMENT.md](APACHE_DEPLOYMENT.md)，RC 驗收見 [PHASE_5_ACCEPTANCE.md](PHASE_5_ACCEPTANCE.md)。

## 一、先選課程設定

設定檔 `course-config.json` 只有課名、單元數與模式。原始專案放在 `public/course-config.json`；建置後位於 `dist/course-config.json`，上傳後位於網站根目錄。

Quiz 課程：

```json
{
  "courseTitle": "數位電子學",
  "totalUnits": 12,
  "assignmentMode": "quiz"
}
```

Video-only 課程：

```json
{
  "courseTitle": "其他課程",
  "totalUnits": 15,
  "assignmentMode": "video-only"
}
```

- `courseTitle` 是非空課名；`totalUnits` 是 1–15 的整數；`assignmentMode` 必須明確為 `quiz` 或 `video-only`。
- 不需編輯 `islands.json`、Three.js 或資料庫。單元島依數量使用 S01–S15 既有主題；模式不由題庫是否缺檔自動推測。
- Quiz 每個開放單元都需要 Lecture 與 Assignment；Video-only 只需要 Lecture，不建立題目 NPC／Q 標籤／答題 UI，也不下載題庫或 Quiz runtime。
- 更換學期或課程時，先備份整套已發布網站，在私人 staging 目錄準備完整一致的設定與教材；不要只換課名而留下上一學期的 Manifest／題庫。降低單元數之前，先移除超出範圍的開放項目並驗證。
- Manifest 仍沿用下面的同一格式；Video-only 的 `file` 欄位保留相容形狀，**不表示必須上傳 Assignment**。

```json
{
  "schemaVersion": 1,
  "units": [{ "unitId": "S04", "title": "教師核對的單元標題", "file": "S04.json" }]
}
```

這只是未來格式說明，不能拿來取代本輪的空 Manifest。每個項目唯一、編號須在課程範圍內，`file` 精確對應單元。Quiz 的 Manifest 標題必須與題庫正規化後的 `title` 相同。

## 二、每週準備 Lecture：完整 PDF 與指定順序

1. 在 Notion 開啟最新課程頁面，捲到底，等待全部延遲載入的影片卡片顯示。
2. 列印／另存完整 PDF；逐頁檢查尾頁、影片數量及完整 YouTube 網址，不能只有目前螢幕可見部分。
3. 提供 PDF 給 AI，指定本週單元，例如 S04；若影片順序不同於 PDF 出現順序，逐項指定。
4. AI 擷取該單元**全部 Lecture 教學影片**，保留標題、原網址及教師指定的順序，產出 `course-videos/S04.json` 候選。
5. 比對原 PDF 與前版差異，確認沒有混入 Quiz 題目／解說影片；缺頁、網址不明或資料未載入完整時，先補來源，不能猜測、套用舊學期或編造。
6. 執行候選驗證，把依原陣列順序列出的清單及完整差異交教師核對。

影片可為一部、四部、十部或更多，沒有固定數量。不分中文／英文、不依語言或標題排序、不新增 CHT／ENG 分組。工具無法判定 PDF 是否完整或老師預期順序，教師仍需逐項核對。

可直接複製的 Prompt（每週替換 PDF、S04 及必要的順序指示）：

```text
請依 README 與 docs/CONTENT_AND_RELEASE.md，閱讀我提供的最新完整課程 PDF。
本週更新 S04。擷取此單元全部 Lecture 的標題及原始 YouTube 網址，
依 PDF 順序；若我另列順序，則以我指定的順序為準。
不分中英文、不排序、不混入題目或解說影片。
若 PDF 缺頁、動態內容不完整、網址不明，請回報，不要猜測或套用舊學期。
只準備 course-videos/S04.json 候選並執行 Lecture 候選驗證，
提供完整清單、原順序及新增／刪除／修改摘要，先讓我確認。
Quiz 必須另用我授權的題目、答案及網址，不得由 Lecture 自行編題。
不要自行更新正式 Manifest、合併、部署、Tag 或 Release。
```

Lecture 格式沿用 [CONTENT_AND_RELEASE.md](CONTENT_AND_RELEASE.md)；網址只使用有效 HTTPS YouTube 影片連結。驗證器只查格式，不查 YouTube API；教師需用學生能存取的帳號或無痕視窗確認影片可觀看，並核對是否為指定版本。

## 三、Quiz 仍使用既有 v1／v2

Quiz 課程另備 `assignments/Sxx.json`，沿用教師授權的舊 Python 出題 GUI 或依同一 Schema 由 AI／人工準備，不改 GUI、不發明第三種 JSON。來源、欄位及限制詳見 [ASSIGNMENT_COMPATIBILITY.md](ASSIGNMENT_COMPATIBILITY.md)。

| 內容      | v1                          | v2                                   |
| --------- | --------------------------- | ------------------------------------ |
| 題數與 ID | 四或五題；連續 Q01–Q04／Q05 | 相同                                 |
| 選項      | 固定四個，A–D 原順序        | 三或四個，A–C／A–D 原順序            |
| 正解欄位  | `correctOption`             | `correctOptions`                     |
| 作答方式  | 單選一個 label              | 單選一個 label；列入接受答案陣列即可 |
| 必填影片  | 題目與解說影片              | 相同                                 |
| 單元外連  | `googleFormUrl`             | 相同                                 |

例如 v2 的 `correctOptions: ["A", "C"]` 表示單選 A 或 C 都接受，**不是複選**。三選項不補 D，題目與選項都不重排。解說影片是 JSON 必填，但學生可以自由選擇是否觀看。所有題目通過後才顯示同單元 Form；四題須 4/4、五題須 5/5。不得修改 `acceptsAnswer` 或解鎖條件。

舊 GUI 位於另一個 Repository，這次沒有修改。**S13–S15 的 GUI 支援尚需另行確認**；可在教師明確授權下依本專案既有 Schema 產生，通過本專案驗證並人工核對後才發布，不能宣稱舊 GUI 已支援。影片／Form 僅驗網址語法；教師還需確認題目、答案、解說正確，Form 對學生開放且可提交。網站不觀測是否觀看影片或提交 Form。

## 四、三種驗證與發布許可分開看

在專案根目錄執行：

```powershell
npm ci
npm run validate:content -- --unit S04
npm run validate:content -- --unit S04 --with-quiz
npm run validate:content
```

| 命令                     | 檢查範圍                                                | 通過的意思                                                         |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| `--unit S04`             | 候選 Lecture、設定及 Manifest 結構                      | 該 Lecture 格式與非空清單有效；不代表 Quiz 或完整發布已準備完成    |
| `--unit S04 --with-quiz` | 候選 Lecture 及 quiz 模式的原 v1／v2 Assignment         | 候選資料有效；不開放 S04、不代替所有既有單元檢查                   |
| 不帶 `--unit`            | Manifest **全部已列出單元**；Quiz 模式同時查 Assignment | 開放清單所列內容完整；非空且通過才標為內容完整，仍須教師確認與核准 |

候選 S04 尚未列入 Manifest 時，第二個命令不會自動建立 Manifest 項目；教師須在私人候選清單核對將使用的標題。Video-only 即使加 `--with-quiz` 仍不讀題庫。所有命令唯讀，不寫 JSON、不改 Manifest、不排序、不上傳；**驗證成功不是發布許可**。空 Manifest 通過只代表沒有任何單元需發布。

預設讀 `public/`。若候選含未核准真實教材，推薦在專案與公開 Apache **以外**建立私人 staging，例如 `C:\TeacherStaging\island-next`，放入設定、候選 Manifest 及完整教材，再加 `--root`：

```powershell
npm run validate:content -- --root C:\TeacherStaging\island-next --unit S04
npm run validate:content -- --root C:\TeacherStaging\island-next --unit S04 --with-quiz
npm run validate:content -- --root C:\TeacherStaging\island-next
```

最後一個命令只驗 staging 的 Manifest，請在這份**私人完整候選**內包含本次預計開放單元與所有既有單元，才能驗整個下一版。單獨候選檢查不會檢查尚未列入清單的其他草稿。不要把 staging、PDF、教師備註或備份放進 `public/`／`dist/`。

完整建置後另執行：

```powershell
npm run build
npm run validate:content -- --root dist
npm run check:release
npm run package:rc
```

`check:release` 掃描實際 `dist/`：允許核准靜態檔、內容雜湊 JS／CSS、授權聲明及 Manifest 已列出的教材；拒絕 unlisted JSON、測試／私人檔、已知 Demo payload、開發 API、本機路徑／網址及高可信度憑證格式。Video-only 封裝不允許夾帶題庫。它不能判斷任意文字是否屬於未公開教材、來源是否合法或影片內容是否正確，仍需教師人工審查。封裝工具不部署、不推 Tag／Release。

## 五、教師核准後的新增單元流程

核心順序：**備份 → 完整候選驗證 → 教師核對 → 上傳內容並驗 HTTP → 最後更新 Manifest**。

1. 備份目前整個網站及發布設定，至少包含 `index.html`、`assets/`、`course-config.json`、Manifest、所有 Lecture／Assignment 與授權聲明；備份存 Apache 公開路徑外，註記日期、ZIP SHA256 與版本，保留可回復的上一版。
2. 在私人 staging 準備新的 Lecture；Quiz 模式同時準備 Assignment，保留原順序。先做候選驗證，再用包含全部既有與預計新增單元的 staging Manifest 做完整驗證。
3. 教師逐項核對 PDF、影片順序、題目答案、解說、Form 及 Manifest 差異，明確核准本次發布範圍。只有工具通過而未核准時，到此停止。
4. 先上傳核准的 `course-videos/Sxx.json`；Quiz 再上傳 `assignments/Sxx.json`。只上傳已核准要發布的內容，不預放未來週次或答案草稿。
5. 用實際網站子目錄 URL 分別取得內容：必須 HTTP 200、`Content-Type: application/json`（可帶 charset），回應本文應為新 JSON，編號、標題、影片順序及內容正確，不能是 HTML。缺檔必須 404。確認從學生使用的網址可讀，不能只在伺服器檔案管理器看到檔案。
6. 最後才將經驗證的**完整** `assignments/manifest.json` 替換到正式網站，保留既有項目及精確檔名／標題。不直接在正式檔逐字修改，也不先開放再補內容。
7. 重新整理網頁，確認取得新清單、新島開放、Lecture 順序、Quiz 題數及既有島仍正常。Quiz 進度本來就只存在頁面記憶體，重新整理歸零。已開啟的頁面不會自動更新 Manifest／已載入內容，請學生重新整理。
8. 保存本次發布清單、驗證輸出、核准紀錄與 SHA256；備份不留在公開根目錄。

已核准內容在第 4 步上傳後，即使 Manifest 還沒列入，也可能被直接下載。Manifest 是介面開放控制，**不是存取權限**；若內容必須到某一時間才可公開，先放公開路徑外，或由管理員在核准時切換整個已驗證版本，不能靠不列 Manifest 保密。

### HTTP 核對範例

PowerShell 以教師已獲授權的實際網址取代下面值；範例不會代為上傳：

```powershell
$courseBase = 'https://學校網域/核准的網站子目錄/'
$lectureResponse = Invoke-WebRequest -Uri ($courseBase + 'course-videos/S04.json')
$lectureResponse.StatusCode
$lectureResponse.Headers['Content-Type']
$lectureData = $lectureResponse.Content | ConvertFrom-Json
$lectureData.unitId
$lectureData.title
$lectureData.videos | Format-Table title, url -Wrap
# Quiz 模式也核對 assignments/S04.json；不要將含答案的本文貼到公開紀錄。
```

請比對回應本文與核准檔案；HTTP 200 但回 HTML 是部署錯誤。SHA256 檢查請針對下載檔案原 bytes，而不是把 JSON parse 後重新輸出（會改換行與排版）。Cache 策略須依 [Apache 文件](APACHE_DEPLOYMENT.md)設定，不能用每週改 URL 參數取代正確快取設定。

## 六、修改、撤回與回復

| 情境               | 安全順序                                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 修改已發布單元     | 私人目錄備份並驗證完整新內容；教師核准後替換 Lecture／Assignment，驗 HTTP 本文與 MIME；若標題等清單內容改動，最後換完整 Manifest。提醒學生重新整理，新頁面進度歸零。                                  |
| 撤回一個單元       | 先備份；驗證移除該項目的完整 Manifest；教師核准後先替換 Manifest，重新整理確認島鎖定，再將不再公開的 Lecture／Assignment 移到公開目錄外。若內容已錯誤公開，立即請管理員撤掉檔案，不能只刪清單。       |
| 回復上一版         | 取出教師確認的完整上一版與 SHA256，先驗設定／教材／Manifest一致；必要時先用有效的暫時清單撤下受影響島；先還原內容與資源、驗 HTTP，最後還原對應 Manifest。不能只還原清單而讓它指向缺檔或新舊混合內容。 |
| 整套程式回退／換課 | 保留與該版 `index.html` 對應的舊雜湊資源；優先切換到已完整上傳驗證的整個版本目錄，連同設定、教材與 Manifest 一致回復。避免讓舊 HTML 引用已刪除的 asset。                                              |

撤回不能移除學生或中介快取先前已下載的 JSON，也不會把已開頁面的題庫從記憶體消除。若答案外洩或資料錯誤需要即時處置，請教師／系統管理員判斷課務補救；這個靜態練習站不提供存取撤銷或保密考試能力。

### 原子替換與權限不足時

理想方式是把新檔上傳到**公開根目錄外、同一檔案系統**的臨時位置，驗證後以伺服器支援的 rename／管理員切換目錄一次替換。Manifest 尤其不能讓學生讀到半份 JSON。單檔 rename 能避免半寫，但多份 Lecture／Assignment 與 Manifest **不是跨檔交易**；仍需內容先、清單後，或由管理員完整版本切換。

若帳號不允許 rename／版本切換，先請管理員提供支援。只可逐檔覆蓋時，須承認存在短暫不一致／半寫風險：安排教師核准的維護時段，先用已驗證的 Manifest 暫時撤下受影響單元；備妥回復檔，逐份完整上傳已驗證內容，逐份驗 HTTP，最後完整上傳並再次驗證 Manifest，再讓學生重新整理。失敗即使用備份回復，不在正式檔邊改邊試。這是受限制的替代程序，不等同原子部署，也不能阻止先前已開頁面繼續讀舊資料。

不要在公開目錄留 `.bak`、`.old`、`S04-draft.json`、PDF 或 ZIP 備份；檔名不在 Manifest 仍可能被直接下載。回復後如果要再做 RC，從與目標清單一致的乾淨來源重建，`check:release` 不允許把未列教材一併封裝。

## 七、Windows 與課堂驗收

1. 依 [WINDOWS_EOL_CHECKOUT.md](WINDOWS_EOL_CHECKOUT.md)安全更新 Repository；不改 Git 全域設定、不修改 14 份 reference 的內容或 SHA 預期。既有 CRLF 的重新 checkout 要先備份。
2. 在 Node 24／npm 11 執行 `npm ci`、`npm test`、`npm run build`、`npm run test:smoke`、`npm run test:browser`、`npm run validate:content`、`node scripts/legacy-parity.mjs`；Python parity 的測試機另需 Python／jsonschema，正式 Apache 不需要。
3. 以 Chrome／Edge 在 1366×768、1920×1080 及約 390px 窄視窗驗收，檢查日夜、縮放／平移／旋轉／聚焦、大小字 Modal／內部捲動／Esc、NPC 點擊停下與關閉後恢復，背景生命不受 Modal 影響。
4. 教師另行核准後，於實際 Apache 子目錄驗 ZIP（先比對 SHA256）、HTTP MIME／真 404、直接進入與重新整理。學校伺服器權限、快取模組及實體 GPU 不能由雲端軟體 GPU 代驗。
5. 本輪 RC 的實際正式 Manifest 空白，應看到十二島全部鎖定，任意 `?demo=1&units=15&open=15&questions=5&mode=video-only` 都不能開放或改模式。已開放 Lecture／Quiz 的功能回歸使用**本機隔離 Demo 或明確核准的 staging**，不為測試發布真題。

## 八、隱私與每學期必看事項

公開 Quiz JSON 本身含答案，這是既定的開放練習設計，不是防作弊考試。學生無帳號，作答只保留本頁 JavaScript 記憶體；切島保留、重新整理清空，不使用 LocalStorage／IndexedDB／Cookie／後端儲存，不蒐集姓名、成績或影片觀看歷程。外連 YouTube／Google Forms 由其網站處理，教師仍須確認自己的表單收集設定。

每學期都應重新核對來源與重用權限、影片是否仍公開、Form 是否為當期可用版本、全部單元標題／題目／答案與指定順序、Apache 快取設定、備份及回復方法。授權與原始元件來源見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。不要公開教師草稿、私人 PDF、學生資料、密碼或 Token；程式掃描只是輔助，無法取代人工核准。
