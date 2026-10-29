# Engineering Island Lab

以 Three.js 建造的 3D 工程課程群島。目前完成 **Phase 0 與 Phase 1 實作，等待教師視覺／操作驗收**：中央學院與 S01 森林島、正交鏡頭、縮放／平移／聚焦、Lecture 小屋與 Q01–Q04 角色原型，以及自主跳動的鯊魚。

這是視覺原型，尚未完成正式教學功能。數位電子學設定仍為 12 單元，本階段只繪製 S01；其餘 11 座島，以及其他課程上限所需的 S13–S15 尚未製作。美術仍待教師驗收及精修。

## Windows 11 Chrome / Edge 本機驗收

安裝 Node.js **24.x**（npm **11+**）及 Git。Chrome／Edge 需支援 WebGL 2，建議開啟「可用時使用圖形加速」。在 PowerShell 執行：

```powershell
git clone --branch feat/phase-0-1-island-prototype https://github.com/chingchechung/engineering-island-lab.git
cd engineering-island-lab
node --version
npm --version
npm ci
npm test
npm run build
npm run demo
```

已經 clone 的教師可先 `git fetch origin`、`git switch feat/phase-0-1-island-prototype`，再安裝及驗收。請保留自己的未提交修改。

`npm run demo` 啟動 Vite 並開啟明確的本機 Demo。若瀏覽器沒有自動打開，請開 [http://localhost:5173/?demo=1](http://localhost:5173/?demo=1)。Chrome、Edge 各執行一次以下清單；1366×768、100% 瀏覽器縮放為基本驗收尺寸。

1. 總覽同時看見中央學院與 S01，主島標牌顯示「數位電子學」。島嶼有不規則海岸、草丘、斜岩壁及厚度，無規則方／六角柱島體。
2. 放大欣賞森林、彩色花草、小瀑布、小屋、學院塔樓。評估色彩、童話感和造型是否符合參考方向；**需教師實際判斷美術品質**。
3. 滾輪平滑縮放，拖曳海面或地圖平移；拖出去又回原點鬆手也不應開啟 NPC 視窗。左鍵和右鍵皆可拖曳平移。
4. 點 S01 地形、S01 標牌或「探索 S01」平滑聚焦，仍能繼續滾輪放大。按「返回總覽」應回到雙島構圖；也可聚焦主島。聚焦後鄰島可能超出畫面，符合連續世界近看行為。
5. S01 聚焦後四名角色各有清晰 Q01–Q04 頭頂標牌及衣服識別。點角色模型或標牌開啟對應的 **Demo 說明**，不出現真題、答案或外部影片。
6. 點 Lecture 小屋模型或標牌開啟占位說明。視窗內捲動／按鍵不會縮放或拖動地圖；關閉鍵及 Esc 可用，鍵盤焦點回原按鈕。此階段未實作正式影片清單。
7. 鯊魚會自己在草地跳動。點牠、把游標放在牠上面皆不會有動物專屬 hover／操作／視窗；可能點中下方島嶼而聚焦，牠的行為不受影響。
8. 右下切換 **Video only**：所有 NPC、Q 標牌及衣服識別完全消失，地貌、Lecture 小屋、鯊魚仍在。切回 Quiz 後四名 NPC 回復且可點擊。模式僅存本頁記憶體，重整依 JSON 還原。
9. 縮窄瀏覽器再試聚焦與 Modal；資訊不應超出視窗。Canvas 取得焦點時 `+`／`-` 縮放、Home／Esc 返回總覽，Tab 可操作標牌與按鈕。
10. F12 檢查 Console 無 JavaScript 錯誤。重新載入 [http://localhost:5173/](http://localhost:5173/)：正式清單為 0、S01 標示尚未開放、無 NPC，Lecture 不可開啟教材；本機 Demo 入口與正式清單分開。

停止伺服器：終端機 `Ctrl+C`。**驗收後回覆美術／操作結果，本次不合併、不部署、不進 Phase 2。**

## Demo 與正式資料的邊界

- `public/course-config.json` 控制 `courseTitle`、整數 `totalUnits: 1–15`、`assignmentMode: "quiz" | "video-only"`；預設「數位電子學」／12／quiz。Phase 1 不依總數生成其餘島嶼。
- `public/assignments/manifest.json` 固定為 `{"schemaVersion":1,"units":[]}`，沒有正式開放任何課程。
- 只有 **Vite 開發模式 + `?demo=1`** 會載入 `src/demo/fixture.js`。只有虛構角色名稱、配色與位置，不含影片、題目、答案、Form 或學生資訊。正式 `npm run build` 即使帶 `?demo=1` 也無法啟用 Demo。
- Demo 的模式按鈕只作視覺驗收，不修改 JSON 或 Manifest。video-only 連 NPC 幾何、標籤及拾取目標都不建立，不 fetch 題庫。
- 正式入口目前只提供雙島外觀與導航；教師課程發布、影片載入、開放狀態完整流程屬 Phase 3。不要把 Demo 的點擊提示當成正式教材。

## 架構

| 模組 | 職責 |
|---|---|
| `src/main.js` | Renderer、動畫循環、模式切換、尺寸／背景分頁處理 |
| `src/config.js` | 課程／Manifest 基本驗證、相對 URL、明確 Demo 開關 |
| `src/camera.js` | 固定斜上方約 42° OrthographicCamera、平滑 fit／focus／pan／zoom |
| `src/interaction.js` | 最大移動距離 click/drag 閾值、pointer cancel、白名單射線拾取 |
| `src/scene.js` | 同一世界內的主島／S01、光源、標籤 anchor 及拾取註冊 |
| `src/world/terrain.js` | 可重現的多層不規則海岸、收縮漂移岩坡、原創頂點色幾何 |
| `src/world/props.js` | 學院、小屋、探索者、植被、花草、步道、瀑布 |
| `src/world/animals.js` | 只接受時間的自主鯊魚動畫，完全不註冊互動 |
| `src/ui.js` | 可鍵盤操作的 CSS2D 標牌、原生 dialog、關閉後焦點回復 |
| `src/demo/fixture.js` | 與正式教材分離的安全視覺 fixture |
| `test/`、`scripts/` | 無 GPU 單元測試、子目錄 smoke、真實瀏覽器驗收 |

維持 Vanilla JS ES Modules／CSS，無前端框架、後端、DB、登入、學生化身、物理引擎或持久化個人紀錄。動畫遠離分頁時暫停渲染；回來繼續，不儲存進度。

## 測試與建置

```powershell
npm test
npm run build
npm run test:smoke
npx playwright install chromium
npm run test:browser
```

- `npm test`：19 個 Node 內建測試，涵蓋 1/12/15 設定及非法值、相對根／子目錄、空 Manifest／安全路徑、錯誤 JSON、無 GPU 場景、自然地貌、video-only、裝飾動物不被拾取、正交取景、zoom 邊界、focus/reset、click/drag/cancel。
- `test:smoke`：建置後把 dist 掛在 `/~wildwolf/engineering-island-lab/`，驗證 HTML／JS／CSS／favicon／course-config／空 Manifest，無需 Apache。
- `test:browser`：Playwright 真正執行 Chromium/WebGL。使用系統 `/usr/bin/chromium`（若有），或 Playwright 安裝的 Chromium；可用 `CHROMIUM_PATH` 指定執行檔。結果圖放 `test-results/`（不納入 Git）。先執行 `npm run build`，用於正式子目錄入口測試。
- 三維幾何由原創程式產生。Node 測試與 Linux Chromium **不能取代 Windows Chrome／Edge 的教師驗收**。
- Vite 會提示 Three.js 主 bundle 大於 500 kB；目前無大型模型、貼圖、CDN 或後製。此提示不影響建置，實際一般筆電 FPS 尚待 Windows 實機確認。

開發環境 Node 24.19.0、npm 11.9.0、Vite 8.3.5、Three.js 0.186.1；Playwright 1.64.1 為測試依賴，所有版本固定並有 lockfile。初始化基準為 5/5 單元測試及 build 通過；本次結果見 [Phase 1 驗收紀錄](docs/PHASE_1_ACCEPTANCE.md)。

## Apache 靜態子目錄相容性

`vite.config.js` 維持 `base: './'`，JSON 以 `new URL('./…', document.baseURI)` 載入，部署產物只有 `dist/`。不需要 SPA rewrite、Node 伺服器或額外環境變數。Apache 需提供正確 JavaScript/CSS/JSON/SVG MIME，並使用含結尾斜線的目錄網址。

本次 **未上傳學校網站、未建立 Tag／Release、未更動正式教材**。`npm run preview` 只供本機查看已打包正式入口；正式包沒有互動 Demo，請用 `npm run demo` 驗收角色及小屋。

## 後續每週教材更新流程（尚未實作發布工具）

完整契約見 `docs/CONTENT_AND_RELEASE.md`。教師在 Notion 捲到底，確認動態卡片完整載入，再列印最新版完整 PDF。提供 PDF、本週 Sxx 與指定順序給 AI；只擷取該單元 Lecture 的 `title` 與 HTTPS YouTube `url` 到 `public/course-videos/Sxx.json`，保留文件順序、無語言分組、不猜連結、不混入題目／解答、不改題庫。

未來完成 schema／資料完整性驗證後，教師核對差異，先更新影片與 Quiz 所需題庫，**最後更新 Manifest**。沒有教師明確授權不改正式開放清單或部署。Quiz 舊 v1/v2 契約、四／五題、v2 任一接受的單選答案、全部答對才開 Form 均留待 Phase 4；目前未實作及未宣稱測試通過。舊 Python GUI 的 S13–S15 支援另列待辦。

> 請依照 docs/CONTENT_AND_RELEASE.md，閱讀我提供的最新課程 PDF，這次僅準備 S04。擷取 S04 的所有 Lecture 影片標題及 YouTube URL，照文件順序（若我另給順序則依我的順序）更新 public/course-videos/S04.json。不修改任何題目答案。檢查影片及 Quiz 題庫（若 assignmentMode=quiz）後，提出 Manifest 開放到 S04 的具體差異與驗證結果；由我批准才執行正式發布，不要自行部署或發布 Release。

## 素材來源與限制

島體、建築、角色、動物及圖示為本專案程式繪製。Three.js／Vite 為 MIT，Playwright 為 Apache-2.0；使用作業系統字體，未再散布第三方字體或模型。四張教師參考圖只留在 `docs/style-references/` 供研究，不加入 public/dist，不假定其再散布授權。畫面截圖為本原型自產。
