# Engineering Island Lab v1.0.0

> 繁體中文／English。以下為待教師核准的 Release Notes；正式 ZIP 已準備，尚未建立 Tag 或 GitHub Release、未部署學校網站。
> Release notes prepared for teacher approval. No tag, GitHub Release, or school deployment has been created.

建置來源／Build source: merged main `a116165be990c45f83bdcab9b9cea499d8fb3e9d`（PR #6）。教師確認 Phase5 Windows 11 Chrome／Edge 最終十項驗收全部通過；本輪重新驗證與封裝結果另見 PREPARATION.md。

Built from merged main after PR #6. The teacher confirmed all ten final Phase5 acceptance items on Windows 11 Chrome and Edge. This preparation performs fresh build, validation, and packaging; see PREPARATION.md for the new evidence.

## 功能／Features

- 童話微型模型風格的 Three.js 課程群島：中央學院、可設定1–15個不同主題的單元島、橋樑、鎖定柵欄與標牌，以及日夜照明。正式預設顯示「數位電子學」的12個單元島。
- A miniature fairytale Three.js world with a central academy, 1–15 distinct themed unit islands, bridges, locked gates, labels, and day/night lighting. The supplied configuration uses 12 units for 數位電子學 (Digital Electronics).
- 正交相機支援旋轉、平移、滾輪縮放、單島聚焦及返回總覽；共用響應式大字Modal、內部捲動、關閉鈕與Esc。
- Orthographic camera rotation, pan, wheel zoom, island focus, and overview reset; shared responsive, readable, internally scrolling dialogs with close and Escape controls.
- Lecture依JSON原始順序顯示任意數量的教學影片，以安全新分頁開啟YouTube，不嵌入、自動播放或追蹤觀看。
- Lecture lists preserve JSON order and support variable video counts. YouTube opens only through explicit safe links, with no embedded player, autoplay, or viewing tracking.
- Quiz沿用v1／v2契約，每島四或五題、獨立NPC；單選作答、錯答重試、答對解說與綠色完成標示，全題通過後才開放該單元的Google Form。v2可接受答案陣列表示任一接受答案的單選。
- Compatible v1/v2 quizzes have four or five questions and independent NPCs per unit, single-choice answers, retries, explanations, completion markers, and a unit Form unlocked only after every question passes. A v2 accepted-answer array still means one accepted radio choice, not multiple selection.
- Video-only模式保留Lecture，不建立題目NPC／答題UI，也不下載Quiz模組或題庫。海面、每島三隻特色動物、四隻外海鯨魚及開放島間的背景旅人均自主活動、不可互動。
- Video-only keeps Lectures without question NPCs, quiz UI, quiz module downloads, or assignment requests. Animated sea, three animals per unit, four offshore whales, and visitors between open islands are decorative and noninteractive.

## 正式預設資料／Shipped content

`course-config.json`: `courseTitle: 數位電子學`, `totalUnits: 12`, `assignmentMode: quiz`。

`assignments/manifest.json`: `{"schemaVersion":1,"units":[]}`。

正式ZIP沒有任何課程影片清單、題庫、答案草稿或學生資料；十二島全部鎖定。開發Demo僅限明確的Vite DEV選項，production忽略Demo參數且沒有開發觀測API。需要開放單元時，先取得教師核准，依教師SOP發布內容、驗HTTP，再最後更新Manifest。

The ZIP ships no course video lists, question banks, unpublished answers, or student data. All twelve units are locked. Demo content is restricted to explicit Vite development mode; production ignores Demo query overrides and exposes no development observer. Opening units requires separate teacher approval: publish approved content, verify HTTP, then update the Manifest last.

## 系統需求／Requirements

- 學生端：支援WebGL2、開啟硬體加速的現代瀏覽器；教師已在Windows 11 Chrome／Edge驗收。390px窄畫面有響應式UI；實際3D流暢度依GPU而異。
- Student devices: a modern WebGL2 browser with hardware acceleration. Teacher acceptance covers Windows 11 Chrome and Edge. UI supports narrow 390px screens; 3D performance depends on the GPU.
- 部署端：提供正確MIME及快取政策的靜態HTTP／HTTPS伺服器，例如Apache 2.4。**不需要Node.js、Python、資料庫或後端服務**。
- Hosting: a static HTTP/HTTPS server such as Apache 2.4 with correct MIME and cache policies. **No server-side Node.js, Python, database, or application backend is required.**
- 只有自行建置／測試時需要Node.js 24、npm 11+；跨語言parity另需Python 3及測試用jsonschema。使用正式ZIP不需要這些建置工具。
- Building/testing from source needs Node.js 24 and npm 11+; cross-language parity additionally needs Python 3 and test-only jsonschema. The distribution ZIP needs none of these build tools.

## 下載、檢查與部署／Verify and deploy

附件／Prepared files: `engineering-island-lab-v1.0.0.zip`、`.sha256`、`.files.json`、`.report.json`。SHA256、實際bytes及來源記錄見 PREPARATION.md；均由本輪新建置重新計算。

ZIP bytes: **216,989**. SHA256: `a19b086ed83e587a516769680407ff206e5291f8ed4088ade05fa2044e9448ad`.

The ZIP, checksum, per-file inventory, and scan receipt are generated afresh from this build. PREPARATION.md records the exact digest, byte lengths, and source commit.

```powershell
Get-FileHash .\engineering-island-lab-v1.0.0.zip -Algorithm SHA256
Expand-Archive -LiteralPath .\engineering-island-lab-v1.0.0.zip -DestinationPath .\island-v1-private-staging
```

1. 核對SHA與inventory，在公開路徑外解壓並審查；ZIP根目錄直接有index.html，沒有外層dist/。不要使用file://測試。
2. **教師另行批准部署後**，備份現有網站，再由管理員將完整內容放到核准的Apache目錄，可使用網站子目錄。保持相對路徑，不需SPA Rewrite。
3. 核對HTML／JS Module／CSS／SVG／JSON MIME與真404。HTML／config／Manifest／課程JSON應重新驗證；雜湊JS／CSS可immutable長快取。更新後重新整理讀新清單，已開啟頁面不熱更新。
4. 依docs/APACHE_DEPLOYMENT.md及docs/TEACHER_OPERATIONS.md驗證權限、快取、備份及回復；.htaccess只是有前置條件的選項，ZIP不預置。本次未執行學校部署。

1. Verify checksum/inventory and extract into private staging. `index.html` is at the ZIP root, without a `dist/` wrapper. Test through HTTP, not `file://`.
2. **Only after separate teacher deployment approval**, back up the current site and have the administrator install the complete contents under the approved Apache directory. Subdirectories work through relative paths; no SPA rewrite is needed.
3. Verify MIME types and genuine 404s. Revalidate HTML/config/Manifest/course JSON; hashed JS/CSS can be cached as immutable. Reload discovers new content; existing pages do not hot-refresh.
4. Follow the repository's Apache and teacher operations guides for permissions, caching, backups, and rollback. Optional `.htaccess` requires administrator support and is not shipped. This preparation does not deploy to the school.

## 安全、隱私與授權／Safety, privacy, and licensing

- Manifest控制介面開放，**不是存取權限**；放在公開HTTP目錄的JSON可被直接下載。未發布教材與答案草稿不能預放公開路徑。公開Quiz JSON包含答案，因此本系統是開放練習，不是防作弊考試。
- The Manifest controls UI availability, **not access authorization**. Public HTTP JSON can be downloaded directly. Keep unpublished material outside public directories. Published quiz JSON contains answers; this is a practice system, not a secure examination platform.
- 進度僅在本頁記憶體，切島保留、重新整理歸零；不收集學生身分、成績、影片觀看或Form提交狀態，沒有登入、持久化答案或分析追蹤。外部網站及伺服器自身紀錄依各自政策處理。
- Progress exists only in page memory, survives island navigation, and resets on reload. The app has no student accounts, persisted answers, grade collection, viewing/Form-submission tracking, or analytics. External providers and hosting infrastructure apply their own policies.
- JSON嚴格驗證、DOM文字安全建立、HTTPS影片／Form URL檢查與noopener noreferrer外連保留；工具掃描只能輔助，教師仍須確認內容、答案及公開權限。
- Strict JSON validation, safe DOM text rendering, HTTPS video/Form URL checks, and noopener noreferrer links remain intact. Automated scanning supports, but does not replace, teacher review of content, answers, and publication rights.
- 正式ZIP含完整`THIRD_PARTY_NOTICES.txt`。Three.js及建置helper的必要聲明保留；Maze原版無根LICENSE，City的MIT不自動涵蓋Maze-origin元件，重用依教師明示範圍。此說明不替整個專案新增整體授權。
- The ZIP includes `THIRD_PARTY_NOTICES.txt` with required runtime notices. Maze has no root LICENSE; City's MIT does not automatically cover Maze-origin components, whose reuse follows the teacher's explicit scope. These notes do not assign a blanket license to the application.

## 已知問題與界線／Known issues and boundaries

- Three.js主chunk仍超過Vite的500KB提示門檻；這是已知建置警告，未為消除警告重寫已驗收程式。
- The main Three.js chunk exceeds Vite's 500KB advisory threshold. This known build warning does not cause a build failure.
- 雲端SwiftShader效能不代表Windows實體GPU；教師已確認Windows最終驗收，本輪不捏造未提供的硬體FPS或renderer數值。
- Cloud SwiftShader performance is not Windows hardware-GPU performance. Windows final acceptance is teacher-confirmed; no unprovided hardware FPS or renderer measurements are invented here.
- 學校實際UserDir、TLS、AllowOverride、權限、代理快取及正式教材／影片／Form可用性，仍須在另行授權的正式部署流程確認。舊外部出題GUI對S13–S15的支援未於本輪修改。
- School-specific UserDir, TLS, permissions, AllowOverride, proxy caches, and real content/video/Form availability require separately authorized deployment checks. This work does not change the external legacy quiz GUI's S13–S15 support.
- 本輪未修改3D／Lecture／Quiz／JSON契約／正式Manifest，未變更Private設定；尚未建立或推送v1.0.0 Tag、建立GitHub Release或部署。
- This preparation changes no accepted 3D, Lecture, Quiz, JSON contracts, or formal Manifest, and does not change repository privacy. No v1.0.0 tag, GitHub Release, or deployment has been created.
