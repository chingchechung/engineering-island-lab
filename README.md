# Engineering Island Lab

色彩豐富的 3D 微型工程課程群島。**Phase 0／1（含木橋）已經教師 Windows 11 驗收，PR #1 已合併；目前為 Phase 2 完整群島，等待本輪驗收。**

中央學院固定存在；`course-config.json` 的 `totalUnits` 決定 S01–S15 的實際數量，數位電子學預設 12。每島有獨特地貌、主題 Lecture 小屋、自主動物與完整木橋，未開放島的橋口有木柵欄及鎖牌。所有島仍保留色彩與動物，可放大欣賞；教材互動依教師 Manifest 判斷。

## Windows 11 Chrome／Edge 本機驗收

Node.js **24.x**、npm **11+**、Git，以及支援 WebGL 2 的 Chrome／Edge。在 PowerShell 執行：

```powershell
git clone --branch feature/phase-2-full-archipelago https://github.com/chingchechung/engineering-island-lab.git
cd engineering-island-lab
npm ci
npm test
npm run build
npm run demo
```

既有 clone 請先保留自己的修改，再 `git fetch origin`、`git switch feature/phase-2-full-archipelago`。已在此分支且工作樹乾淨時，以 `git pull --ff-only origin feature/phase-2-full-archipelago` 取得更新。

開啟 [本機 Demo](http://localhost:5173/?demo=1)。預設 12 島、模擬開放 S01–S04，其餘鎖定；右下可選 1／12／15 島、0／4／全部開放、4／5 位角色及 Quiz／Video only。不會修改正式 JSON。若 Vite 使用其他埠，依終端機顯示的網址開啟。停止：`Ctrl+C`。

Chrome 與 Edge 各驗收一次，基本尺寸 1366×768、1920×1080、瀏覽器 100%：

1. 12 島總覽同時看到學院與 S01–S12；切 15 才出現竹林、晶礦、珊瑚島；切 1 仍是已驗收的學院＋S01。島名標籤清楚，必要時用右上「前往小島」導覽。
2. 放大看各島獨特輪廓、自然厚岩壁、主題建築與細節；S01 森林、四名探索者及草地跳鯊保留。比較火山、糖果、冰雪、湖心、夢境等主題，確認符合童話微型模型的美術品質。
3. 所有木橋都完整連接兩岸，橋面微彎／微拱。橋與動物不提供互動、餵食、控制、角色通行或碰撞功能。
4. 預設 S05–S12 橋口有柵欄與鎖牌；點島、小屋或鎖牌只聚焦並顯示「Sxx 尚未開放」，不開啟課程內容。切換全部開放，柵欄／鎖牌消失。
5. 滾輪平滑縮放、左鍵／右鍵拖曳平移；拖出去再回原點不會誤開內容。點島或標牌聚焦，繼續放大；「返回總覽」回完整群島。
6. 已模擬開放島的 Lecture 小屋與 Q 標牌／模型可開**視覺占位說明**；4／5 位角色數量正確、標牌可讀，且不被建築或動物遮擋。此階段沒有正式題目或影片連結。
7. Modal 的滾輪／鍵盤不操作地圖；關閉鍵／Esc 正常，鍵盤焦點回到原按鈕。Canvas 焦點下 `+`／`-` 縮放、Home／Esc 返回總覽，Tab 可操作導覽與標牌。
8. Video only 完全沒有 NPC 模型、Q 標牌或 NPC 點擊目標；主題小屋、橋樑、柵欄、動物仍在。切回 Quiz 後互動正常。
9. 看魚擺尾、企鵝走路、水母脈動、羊／恐龍跳動、熊貓搖尾、海龜划鰭及風車／海葵。游標與點擊不影響牠們的動作。
10. 縮窄到手機寬度後可用「前往小島」聚焦，Modal 不超出視窗。F12 Console 無應用錯誤；一般筆電親自確認流暢度。
11. 開啟 [預設入口](http://localhost:5173/)：正式清單仍是 0，各島皆有柵欄且不能開教材。`npm run preview` 的 production 即使帶 Demo query 也不能啟用模擬模式。

[Phase 2 驗收報告](docs/PHASE_2_ACCEPTANCE.md) 包含代表性截圖、實測效能和限制。完成本輪後停止，等待教師驗收，**不合併、不部署、不進 Phase 3**。

## 島嶼主題

| 島 | 地貌與建築 | 自主動物 |
|---|---|---|
| S01 | 保留森林、草丘、瀑布與原 Lecture 小屋 | 草地跳鯊 |
| S02 | 多層花圃、花樹、玫瑰拱架、溫室花箱 | 漂浮熱帶魚擺尾 |
| S03 | 海蝕開孔岩拱、斜岩、潮池、燈塔小屋 | 企鵝散步與翅腳擺動 |
| S04 | 內湖、拱木橋、柳樹、睡蓮、湖畔小屋 | 水母脈動及觸手 |
| S05 | 侵蝕火山口、熔岩、黑岩、研究站儀表 | 小恐龍跳動 |
| S06 | 糖霜丘、薄荷糖、軟糖、薑餅小屋 | 棉花糖羊伸縮跳與搖尾 |
| S07 | 非對稱雪峰、冰晶／冰湖、雪松、冰屋垂冰 | 戴帽企鵝貼地走動 |
| S08 | 草丘、風車、麥穗、乾草、木屋飾條 | 空中游魚擺尾 |
| S09 | 浮石花園、月牙與星、柔光植物、觀星小屋 | 蝴蝶拍翼及水母 |
| S10 | 分層沙丘、綠洲、棕櫚、仙人掌、通風土屋 | 戴護目鏡跳鯊 |
| S11 | 雲環、雲階、浮島瀑布、太陽小屋 | 空中游魚 |
| S12 | 多層廣場、彩旗、涼亭、氣球、緞帶小屋 | 恐龍交錯踏步跳舞 |
| S13 | 竹林、岩肩、流水、竹屋燈籠 | 持竹小熊貓步態／搖尾 |
| S14 | 深色內壁岩洞、四色晶簇、晶燈小屋 | 晶靈旋環與軌道碎晶 |
| S15 | 分層珊瑚扇、礁肩、海葵、貝殼屋簷 | 海龜划鰭 |

## 模組與資料邊界

| 模組 | 職責 |
|---|---|
| `src/main.js`、`ui.js` | Renderer、導覽／Demo 控制、標籤避讓、Modal、動畫循環與本機量測 |
| `src/config.js` | 原課程／Manifest v1 驗證、相對 URL、明確 Demo 開關 |
| `src/camera.js`、`interaction.js` | 約 42° 正交鏡頭、全域 fit／單島聚焦、平滑縮放／平移、click/drag/cancel |
| `src/scene.js` | 單一世界、Manifest 狀態、橋樑／柵欄、拾取、可見性及資源生命週期 |
| `src/world/phase-one.js` | 保留已驗收的學院與 S01 原始建構 |
| `src/world/presets.js`、`themes.js` | 固定 15 主題及分支座標、工廠分派；沒有 islands.json |
| `src/world/islands/` | 四組互不衝突的主題工廠；[統一介面與所有權](docs/ISLAND_FACTORY.md) |
| `src/world/terrain.js`、`props.js`、`bridge.js`、`creatures.js` | 原創地形／建築／花草／橋欄／動物元件 |
| `src/world/optimize.js` | 靜態頂點色合批、動態節點排除、資源釋放 |
| `src/demo/fixture.js` | 虛構視覺角色、同 Manifest v1 格式的本機模擬，無正式內容 |
| `test/`、`scripts/` | 原 Phase 1 回歸、完整群島單元／瀏覽器／子目錄檢查、效能紀錄 |

正式設定仍為 `public/course-config.json` 的 `courseTitle`、整數 `totalUnits:1–15`、`assignmentMode:quiz|video-only`。正式開放唯一依據仍是 `public/assignments/manifest.json`，目前維持 `{"schemaVersion":1,"units":[]}`。未開放內容不 fetch；不因缺題庫而偷切模式。

Demo 需同時具備 **Vite 開發模式與 `?demo=1`**。可用 `?demo=1&units=1&open=1` 重現雙島回歸情境，預設 `?demo=1` 為 12 島／模擬開放 4 座。production 的 query 不得開啟 Demo。正式已開放島目前也只提供占位說明，不載入影片或題庫。

## 測試與效能

```powershell
npm test
npm run build
npm run test:smoke
npx playwright install chromium
npm run test:browser
```

依賴維持 Node 24／npm 11+、Vite 8.3.5、Three.js 0.186.1、Playwright 1.64.1，版本固定於 lockfile。`test:browser` 使用系統 Chromium（若有）或 Playwright Chromium，可用 `CHROMIUM_PATH` 指定。

- `npm test` 共 41 項通過，保留既有 22 項行為，以 `totalUnits=1` 重現雙島；另測 1／12／15 數量與取景、15 主題、橋端落岸、無島體重疊、Manifest／柵欄、4／5 NPC、video-only、動物及合批。
- Smoke 將 dist 掛到 `/~wildwolf/engineering-island-lab/`，檢查 HTML／JS／CSS／favicon／JSON／空 Manifest。
- 瀏覽器測試 20 項通過，包含原操作回歸、完整群島、鎖定／模式與窄視窗；代表截圖及 FPS／draw calls／triangles／GPU 資訊寫到 `test-results/`（忽略於 Git）。教師報告保存整理後的結果。
- 共享幾何／材質、花草 InstancedMesh、頂點色合批、相機 frustum culling、遠景 6Hz 動畫、近景完整動畫／細節及聚焦陰影。總覽以輕量接觸陰影保留立體感，避免所有島同時重畫陰影。模式切換釋放場景幾何、獨立材質、instance 與 shadow map。
- Vite 的 Three.js 主 bundle 仍有 >500 kB 提示；沒有 CDN、巨大貼圖、外部模型或高成本後製。Linux 軟體 GPU 數據不能代替 Windows 實機效能。

## 靜態部署與後續階段

`base:'./'` 與 `new URL('./…',document.baseURI)` 保留，dist 可放 Apache 任意子目錄，無需 Node 服務或 SPA rewrite。只以本機 preview 測試，本輪不部署、Tag 或 Release。

Phase 3 才實作 Lecture 任意長影片清單、嚴格 YouTube 外連及完整資料驗證；Phase 4 才精確移植舊 Quiz v1/v2、答錯重試、解說及全部答對開 Form。v2 是「任一接受的單選答案」，不得誤改為多選。舊 GUI S13–S15 支援另列待辦，不修改其他 repo。

教師未來從 Notion 捲到底確認所有卡片後，另存完整 PDF，提供本週 Sxx 與指定順序給 AI，只擷取該週 Lecture 的 `title`、HTTPS YouTube `url`，保留順序、無語言分組、不猜連結、不混入題目／解答、不改題庫。經驗證及教師核對後，先更新內容，最後更新 Manifest；未經明確授權不發布。

> 請依 docs/CONTENT_AND_RELEASE.md 閱讀最新課程 PDF，這次僅準備 S04。擷取 S04 所有 Lecture 標題與 YouTube URL，依文件／教師指定順序更新 public/course-videos/S04.json。不修改題目答案。提出內容及 Manifest 的具體差異與驗證結果，由我批准才正式發布；不要部署或建立 Release。

## 素材

模型、角色、動物、圖示均為程式原創；Three.js／Vite 為 MIT、Playwright 為 Apache-2.0，使用系統字體。教師參考圖僅供研究，留在 docs，不加入 public/dist。不加入學生、帳號、後端、資料庫、持久進度、Notion API、物理引擎或課程管理後台。
