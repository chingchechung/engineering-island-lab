# Engineering Island Lab

童話微型模型風格的 Three.js 課程群島。Phase 0／1 與木橋已經教師 Windows 11 驗收、PR #1 已合併。Phase 2 前版的標籤、NPC 操作及 12／15 島硬體 GPU 流暢已獲教師 Windows 11 確認。本輪沿用 **Draft PR #2** 加強海面、外海鯨魚與背景小旅人，等待新增項目再驗收；不進 Phase 3。

中央學院周圍依 `totalUnits` 產生 1–15 座主題島，六條主幹與短支線木橋構成放射網路。每島有獨特地貌、小屋、岩崖裝飾及三隻自主動物。Quiz Demo NPC 緩慢漫遊；點模型或頭標立即停止並開說明，關閉後恢復。動物完全不可互動。海面柔和流動，四隻大型鯨魚在群島外海巡遊噴水；另有最多八位較小、無編號的背景小旅人，沿安全地表及已開放橋網來回活動。

## Windows 11 Chrome／Edge 本機驗收

需要 Node.js **24.x**、npm **11+**、Git、支援 WebGL 2 且啟用硬體加速的 Chrome／Edge。PowerShell：

```powershell
git clone --branch feature/phase-2-full-archipelago https://github.com/chingchechung/engineering-island-lab.git
cd engineering-island-lab
npm ci
npm test
npm run build
npm run demo
```

既有 clone 先保留自己的修改，再 `git fetch origin`、`git switch feature/phase-2-full-archipelago`。工作樹乾淨時可用 `git pull --ff-only origin feature/phase-2-full-archipelago` 更新。Vite 預設 localhost:5173；若另選埠，以終端機為準。停止使用 `Ctrl+C`。

一般畫面只有單列課名、左下唯一單元選單與縮放／總覽工具列，沒有 Demo 設定面板。以下參數**僅 Vite dev 且明確 `demo=1` 時有效**，不修改 JSON：

| 測試情境 | 本機網址 |
|---|---|
| 12 島、開四島、四位 NPC | [12 島 Quiz](http://localhost:5173/?demo=1&units=12&open=4&questions=4) |
| 15 島、全部開放、五位 NPC | [15 島 Quiz](http://localhost:5173/?demo=1&units=15&open=15&questions=5) |
| 15 島、無 NPC、保留全部動物 | [15 島 Video-only](http://localhost:5173/?demo=1&units=15&open=15&questions=5&mode=video-only) |
| 已驗收雙島構圖回歸 | [學院與 S01](http://localhost:5173/?demo=1&units=1&open=1&questions=4) |
| JSON 正式設定、空 Manifest | [預設入口](http://localhost:5173/) |

`units` 接受 1–15，`open` 接受 0–15 並限制在總島數內，`questions` 接受 4 或 5，`mode` 接受 `quiz`／`video-only`。缺值預設為正式課程設定／開四島／四題；非法值回退預設。沒有 `demo=1` 或 production build 時，所有測試覆寫均忽略。

Chrome 與 Edge 各以 1366×768、1920×1080、瀏覽器 100% 驗收：

1. 12 島總覽看到學院與 S01–S12；15 島才有 S13–S15。學院位於中央，六條主橋向不同方向放射，其餘為短支線，沒有長鏈、交叉或穿島。返回總覽後全部島在畫面內。
2. 桌面島編號 17px／中文 14px，聚焦 20px／16px；無嚴重重疊。窄畫面仍為 15px／12px，以避讓與細引線保持可讀。
3. 上方只有從 `course-config.json` 讀取的單一課名。1366×768 畫布高 638px（原 453px）。左下選單含總覽、學院與實際單元；點島／標籤／選單後選取同步。
4. 放大比較森林、海蝕岩拱、火山、糖霜、冰雪、雲階、岩洞、珊瑚及新增岩層、凸岩、垂藤、瀑布與主題道具。S01 原地形、小屋和第一隻跳鯊保留。
5. 滾輪縮放、左／右鍵拖曳、點島聚焦、返回總覽正常。拖出再回原點不誤開內容。Canvas 焦點下 `+`／`-` 縮放，Home／Esc 返回總覽；橋供背景小旅人沿路點巡遊；沒有學生化身、角色控制或物理碰撞。
6. 預設 S05–S12 橋口有木柵欄／鎖牌，可用選單欣賞；點島／小屋／鎖牌只提示尚未開放。以全部開放網址重載後柵欄消失。
7. NPC 在約 1.05 單位半徑內緩慢走、停、轉身，避開水面／建築／岸邊／同伴。Q01–Q05 頭標跟隨，衣帽編號保留。分別點移動模型及頭標，確認立即停止並開 Demo Modal；關閉後恢復。
8. Lecture 小屋仍開視覺占位說明，沒有正式題目、答案、影片或 Form。Modal 滾輪／鍵盤不操作地圖；關閉／Esc 回復焦點及 NPC 活動。
9. 每島數出三隻獨立動物，體型、顏色及動畫相位不同；不同島代表物種見下表。鎖定島仍活動，游標／點擊無法控制牠們。
10. Video-only 無 NPC、Q 標或 NPC 點擊目標，全部裝飾、45 隻特色動物、四隻外海鯨魚與小旅人保留。以 Quiz 網址重載可回四／五題 Demo。
11. 390px 窄視窗選單／Modal 可用；F12 Console 無應用錯誤。親自確認一般筆電流暢度，記錄 GPU、FPS、draw calls、triangles。
12. 預設入口全部鎖定。另執行 `npm run preview`，在終端機網址附 Demo／mode／units／open／questions 參數，仍保持 JSON 的 12 島、Quiz、全部鎖定。

13. 總覽觀察柔和海流、四隻外海鯨魚的游動與間歇噴水；牠們留在群島外圍，點擊不開視窗或聚焦鯨魚。
14. 在已開放島找較小、沒有 Q 標的背景小旅人。預設開四島有四人，全開 15 島有八人；停留 2–3 分鐘，觀察登橋、到其他開放島停留與返回。放大確認不穿建築、海面或橋欄，遇題目 NPC 會等待／繞讓。
15. 開放數改為 0（開發參數 `?demo=1&units=12&open=0`）後沒有小旅人，仍有鯨魚與每島三隻動物。Video-only 仍有背景小人，但沒有題目 NPC；背景小人不可被選取、控制或暫停。

[修正驗收報告](docs/PHASE_2_ACCEPTANCE.md) 包含前後總覽、主題近景、NPC 暫停及效能數據。**本輪停止在同一 Draft PR #2，等待教師再次驗收，不合併、不部署。**

## 島嶼與三隻代表動物

| 島 | 地貌、建築與裝飾 | 每島三隻的代表物種 |
|---|---|---|
| S01 | 原森林、草丘、小屋、瀑布，加岩肩、藤與草花 | 草地跳鯊（保留原第一隻） |
| S02 | 多層花圃、玫瑰拱架、溫室、花藤岩崖 | 漂浮熱帶魚 |
| S03 | 開孔海蝕岩拱、潮池、燈塔屋、礫岸與浪花 | 散步企鵝 |
| S04 | 內湖、拱木橋、柳樹、睡蓮、濕岩小瀑布 | 脈動水母 |
| S05 | 侵蝕火山口、熔岩、黑岩、研究站、玄武岩層 | 彈跳小恐龍 |
| S06 | 糖霜丘、薄荷糖、軟糖、薑餅屋、糖片岩肩 | 棉花糖羊 |
| S07 | 非對稱雪峰、冰湖、雪松、冰屋、冰柱晶簇 | 雪地北極狐 |
| S08 | 草丘、風車、麥穗、乾草、花草與木道具 | 隨風飄鴨 |
| S09 | 月牙星夜浮石、觀星屋、柔光植物與星晶 | 發光蝴蝶 |
| S10 | 分層沙丘、綠洲、棕櫚、仙人掌、通風土屋 | 跳躍小駱駝 |
| S11 | 雲環、雲階、太陽屋、浮岩與垂落瀑布 | 空泳迷你鯨魚 |
| S12 | 多層廣場、彩旗、涼亭、氣球與緞帶屋 | 跳舞紅鶴 |
| S13 | 竹林、流水、竹屋燈籠、岩肩與蕨草 | 持竹小熊貓 |
| S14 | 深岩洞、四色晶簇、晶燈屋、礦脈岩層 | 晶體小精靈 |
| S15 | 珊瑚扇、海葵、貝殼屋、礁肩與岸邊水景 | 飄浮海龜 |

## 模組與資料契約

| 模組 | 職責 |
|---|---|
| `src/main.js`、`ui.js`、`label-layout.js` | Renderer、唯一導覽、Modal 暫停接線、CSS2D 標籤避讓、dev 量測 |
| `src/config.js` | 課程／Manifest v1 驗證、相對 URL、僅 dev 的受控參數 |
| `src/camera.js`、`interaction.js` | 約 42° 正交鏡頭、實際島嶼投影 fit、縮放／聚焦／平移、click/drag/cancel |
| `src/scene.js` | 世界、開放狀態、橋／柵欄、拾取、更新頻率與資源生命週期 |
| `src/world/layout.js`、`presets.js` | 六主幹一層支線的 1–15 島座標／拓樸、固定主題資料 |
| `src/world/phase-one.js`、`islands/` | 原雙島模型與四組主題工廠；[Island Factory](docs/ISLAND_FACTORY.md) |
| `src/world/dressing.js` | 15 主題靜態崖壁／植被／水景／道具，保留區與 InstancedMesh |
| `src/world/fauna.js` | 每島恰好三隻獨立動物、15 種代表物種、錯相動畫 |
| `src/world/npc-motion.js`、`npc-safety.js` | 局部漫遊、固定步進、pause/resume、地表／障礙／視線及同伴安全 |
| `src/world/sea-life.js` | 動態薄荷海面、四隻外海鯨魚、局部合批及實例化噴水／尾波 |
| `src/world/visitors.js`、`visitor-navigation.js` | 3–8 位無編號背景小人，開放橋網 BFS、地表路點、安全避讓與巡遊 |
| `src/world/optimize.js` | 靜態頂點色合批、可動根／關節保留、GPU 釋放 |
| `src/demo/fixture.js` | 虛構角色與同 Manifest v1 格式的本機資料，無真實教材 |
| `test/`、`scripts/` | 單元、瀏覽器、Apache 子目錄回歸、截圖及效能 |

前版三位修正 Subagents 的契約見 [REVISION_INTERFACES](docs/REVISION_INTERFACES.md)；本輪實際平行兩位分別負責海面／鯨魚及背景小人，檔案所有權與介面見 [LIFE_INTERFACES](docs/LIFE_INTERFACES.md)。主 Agent 審查後統一整合共享核心及測試，只更新原 PR。

正式設定為 `public/course-config.json` 的 `courseTitle`、整數 `totalUnits:1–15`、`assignmentMode:quiz|video-only`。正式開放唯一來源是 `public/assignments/manifest.json`，目前維持 `{"schemaVersion":1,"units":[]}`。未開放內容不 fetch，不因缺題庫自動切模式；正式已開放單元目前仍只有占位說明。

## 測試與效能

```powershell
npm test
npm run build
npm run test:smoke
npx playwright install chromium
npm run test:browser
```

版本固定於 lockfile：Node 24、npm 11+、Vite 8.3.5、Three.js 0.186.1、Playwright 1.64.1。可用 `CHROMIUM_PATH` 指定瀏覽器，例如 PowerShell 的 `$env:CHROMIUM_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'`。

- 單元測試 **91/91 通過**，保留原 68 項 Phase 1／2 回歸，新增外海幾何安全距離、噴水錯相、非互動背景系統、路網開放狀態、跨島／返回、橋中央線、會車／避讓及 GPU 資源釋放測試。
- 瀏覽器 **32/32 通過**，保留原 24 項並增加生命感檢查，涵蓋 production 隔離、移動模型射線與頭標、12／15／窄視窗、鯨魚無互動、橋上小旅人、兩模式與空 Manifest；輸出 `test-results/life-*.png` 和 `life-performance.json`。
- Smoke 將 dist 掛到 `/~wildwolf/engineering-island-lab/`，檢查 HTML／JS／CSS／favicon／JSON／空 Manifest。
- 共用幾何／材質、靜態合批及 InstancedMesh；遠景動物與 NPC 為 6Hz，近景完整更新。可動根／關節在自己的局部框架合批，聚焦才啟用陰影；保留 GPU 資源釋放。外海鯨魚不投影，海面只更新時間 uniform；小旅人總覽為 6Hz，近景逐畫面。
- Linux SwiftShader **軟體 GPU** 本輪約 2.94–4.29 FPS；完整數據見驗收報告，與教師已確認的前版 Windows 硬體加速流暢度分開。未取得實體 GPU 數值；新增背景生命感仍待 Windows 重驗。
- 主 JS 仍有 Three.js >500kB 提示；沒有大型外部模型、貼圖、後製或 CDN。原有 45 個海面泡沫合成一批，以抵銷新增背景模型呼叫。

## 後續與素材

`base:'./'` 與相對 URL 保留，dist 可用 Apache 子目錄提供，不需 Node 服務或 SPA rewrite；本輪只本機 preview，未部署、Tag 或 Release。

Phase 3 才實作正式 Lecture 任意長影片清單與 YouTube 外連驗證；Phase 4 才精確相容舊 Quiz v1/v2、答錯重試、解說及全部答對開 Form。v2 是「任一接受的單選答案」，不是多選；舊 GUI S13–S15 支援另列待辦。本版不含判答、正式題庫、影片或 Form。

未來教材依 [CONTENT_AND_RELEASE](docs/CONTENT_AND_RELEASE.md)：教師確認 Notion 完整卡片並另存 PDF，指定單元／順序後，只擷取該週 Lecture 的 `title`、HTTPS YouTube `url`；不猜連結、不混入題目答案。先更新及核對內容，最後更新 Manifest，發布另需明確授權。

模型、角色、動物、圖示均為程式原創；Three.js／Vite 為 MIT、Playwright 為 Apache-2.0，使用系統字體。四張教師參考只供研究，不進 public/dist。不加入學生化身、登入、DB、後端、追蹤、Notion API、物理引擎或後台。
