# Engineering Island Lab

童話微型模型風格的Three.js課程群島。Phase0–2.5已由教師在Windows 11 Chrome／Edge驗收，PR #1–#3已合併。本輪 **Phase3** 完成共用Lecture影片載入／驗證、任意數量的可捲清單、安全YouTube新分頁，以及教師每週PDF→JSON準備流程與唯讀驗證工具。正式Manifest仍為空，沒有發布任何教材；Quiz判答／解答／Google Form留待Phase4。唯一新Draft PR #4後停止等教師驗收。

右上太陽／月亮按鈕以 1.25 秒過渡切換日夜，重載預設白天。夜間有學院與全部 Lecture 小屋窗光、六條主橋暖燈及15主題裝飾；最多六批實例化模型，僅聚焦時啟用一個無陰影局部光源。沒有 Bloom 或逐燈陰影。相機支援連續360°水平旋轉、25°–70°仰角；世界本身保持原位。
## Windows 11 Chrome／Edge 本機驗收

需要 Node.js **24.x**、npm **11+**、Git、支援 WebGL 2 且啟用硬體加速的 Chrome／Edge。PowerShell：

```powershell
git clone --branch feature/phase-3-lecture-publishing https://github.com/chingchechung/engineering-island-lab.git
cd engineering-island-lab
npm ci
npm test
npm run build
npm run demo
```

既有 clone 先保留自己的修改，再 `git fetch origin`、`git switch feature/phase-3-lecture-publishing`。工作樹乾淨時可用 `git pull --ff-only origin feature/phase-3-lecture-publishing` 更新。Vite 預設 localhost:5173；若另選埠，以終端機為準。停止使用 `Ctrl+C`。

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
5. 左鍵單擊探索、左鍵拖曳旋轉、右鍵或 Shift＋左鍵拖曳平移、滾輪縮放。聚焦換島保留旋轉方向；返回總覽恢復標準約42°方向與完整取景。拖出再回原點不誤開內容。Canvas 焦點下 `+`／`-` 縮放，Home／Esc 返回標準總覽；橋供背景小旅人沿路點巡遊；沒有學生化身、角色控制或物理碰撞。
6. 預設 S05–S12 橋口有木柵欄／鎖牌，可用選單欣賞；點島／小屋／鎖牌只提示尚未開放。以全部開放網址重載後柵欄消失。
7. NPC 在約 1.05 單位半徑內緩慢走、停、轉身，避開水面／建築／岸邊／同伴。Q01–Q05 頭標跟隨，衣帽編號保留。分別點移動模型及頭標，確認立即停止並開 Demo Modal；關閉後恢復。
8. Lecture／Q01–Q05／操作說明共用置中 Modal：桌面最大620px、主標28px／內文18px／行高1.75；窄畫面內文16px，44px關閉鈕固定可見。長內容在視窗內捲動，也可Tab聚焦內容區後PageDown。滾輪／鍵盤不操作地圖，關閉／Esc回復焦點及NPC活動。Lecture依教師資料顯示，Demo明示測試連結；仍無正式題目、答案或Form。
9. 每島數出三隻獨立動物，體型、顏色及動畫相位不同；不同島代表物種見下表。鎖定島仍活動，游標／點擊無法控制牠們。
10. Video-only 無 NPC、Q 標或 NPC 點擊目標，全部裝飾、45 隻特色動物、四隻外海鯨魚與小旅人保留。以 Quiz 網址重載可回四／五題 Demo。
11. 390px 窄視窗選單／Modal 可用；F12 Console 無應用錯誤。親自確認一般筆電流暢度，記錄 GPU、FPS、draw calls、triangles。
12. 預設入口全部鎖定。另執行 `npm run preview`，在終端機網址附 Demo／mode／units／open／questions 參數，仍保持 JSON 的 12 島、Quiz、全部鎖定。

13. 總覽觀察柔和海流、四隻外海鯨魚的游動與間歇噴水；牠們留在群島外圍，點擊不開視窗或聚焦鯨魚。
14. 在已開放島找較小、沒有 Q 標的背景小旅人。預設開四島有四人，全開 15 島有八人；停留 2–3 分鐘，觀察登橋、到其他開放島停留與返回。放大確認不穿建築、海面或橋欄，遇題目 NPC 會等待／繞讓。
15. 開放數改為 0（開發參數 `?demo=1&units=12&open=0`）後沒有小旅人，仍有鯨魚與每島三隻動物。Video-only 仍有背景小人，但沒有題目 NPC；背景小人不可被選取、控制或暫停。

16. 右上日夜按鈕可用 Tab／Space／Enter；白天保持原色，夜晚確認冷海、暖窗、六主橋燈、火山／冰晶／星光／晶礦等點燈。切換不重建世界，也不改開放規則，動物／NPC／鯨魚／旅人不中斷。
17. 總覽依序轉90°／180°／270°／360°，所有島保持取景；聚焦後繞到背面，分別使用小屋、Q01–Q05標牌及可見模型。Modal 開啟時旋轉／平移／縮放完全暫停，關閉後恢復。
18. 觸控保留單指平移，多指不選取 NPC；此階段未加入雙指縮放。390px 窄畫面重驗日夜按鈕、導覽與原大字 Modal。

[Phase 2.5 驗收報告](docs/PHASE_2_5_ACCEPTANCE.md) 提供 Day／Night 同視角、相機旋轉與夜間近景、效能比較及新增回歸。先前 [Modal 閱讀驗收](docs/PHASE_2_MODAL_ACCEPTANCE.md) 與 [Phase 2 場景報告](docs/PHASE_2_ACCEPTANCE.md) 保留為歷史紀錄。**本輪交付Draft PR #4後停止，不合併、不部署、不進Phase4。**

## Lecture與每週教材準備

只有Manifest已開放單元可以載入`course-videos/Sxx.json`；兩種課程模式共用相同Loader。影片數量不限、標題與原始URL保持JSON陣列順序，沒有CHT／ENG分組、縮圖、嵌入播放或觀看追蹤。點擊另開YouTube時，原Modal與捲動位置保留；`target="_blank" rel="noopener noreferrer"`。

本機Demo：S01一部、S02四部、S03十部、S04異序；使用`?demo=1&units=12&open=5`可測S05缺資料。所有Demo連結都明示非教材，production會忽略全部Demo參數。正式public JSON與空Manifest不因測試變更。

教師每週先在Notion捲到底、確認所有卡片載入，再另存完整PDF；提供PDF、單元編號與必要的影片順序即可。PDF缺頁或網址不清楚，AI須回報，不能猜連結、引用上一學期或混入題目／解答。先產出候選Lecture JSON與差異，教師核對後才可準備發布；**先內容、最後Manifest**。完整說明見[教師發布流程](docs/TEACHER_PUBLISHING.md)。

以下Prompt可直接複製，每週只需替換PDF、S04及必要順序：

```text
請依照 Engineering Island Lab 專案 README 與 docs/CONTENT_AND_RELEASE.md，閱讀我提供的最新課程 PDF。

本次要更新的單元是 S04。

請找出 S04 對應的全部 Lecture 教學影片，擷取標題及 YouTube 網址，依 PDF 順序整理；若我另有指定順序，則以指定順序為準。

請更新 public/course-videos/S04.json。

不要增加 CHT／ENG 分組，不要自行排序，不要修改題目或解答影片。PDF 缺頁、影片未完整載入或網址無法辨識時請回報，不要猜測、虛構或補上一學期的影片。

完成後執行 npm run validate:content -- --unit S04，列出新增與修改的影片及原順序，並告訴我目前發布清單需要如何修改。Quiz 完整性尚未支援時須明示，不能把 Lecture 通過當作整份作業已準備完成。

先提供我審查，不要自行更新正式 Manifest、合併 PR 或部署網站。
```

```powershell
npm run validate:content -- --unit S04
npm run validate:content
npm run validate:content -- --root dist
```

`--unit`只驗候選Lecture，不更動清單或表示發布就緒；預設驗全部已開放Lecture，阻擋缺檔／非法／空清單。CLI原序列出標題供教師核對，不能自行知道PDF預期順序，也不查影片是否仍公開。video-only不需要題庫；Quiz完整性在Phase4前明示尚未支援，正式非空Quiz發布檢查回失敗。現在空Manifest驗證通過僅代表設定合法、沒有單元發布。

Apache未來更新：先上傳Lecture；quiz還要先完成Phase4題庫驗證；確認檔案可載入後才上傳核准Manifest並保留既有單元。整包dist部署前同樣先確認資料與清單一致。Manifest不是安全存取控制，未公布題庫草稿不能放入可下載路徑。本次沒有部署或更動正式清單。

[Phase3驗收報告](docs/PHASE_3_ACCEPTANCE.md)包含測試、原始截圖、Apache與Windows驗收方法。

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
| `src/lecture-data.js`、`lecture-ui.js`、`lecture.css` | Lecture白名單驗證／按需快取／防舊回應、共用清單與安全新分頁 |
| `scripts/validate-content.js` | 唯讀候選／已開放Lecture檢查，區分video-only與Phase4 Quiz尚未支援 |
| `src/config.js` | 課程／Manifest v1 驗證、相對 URL、僅 dev 的受控參數 |
| `src/camera.js`、`interaction.js` | 正交環繞鏡頭、逐角度投影 fit、旋轉／縮放／聚焦／平移、click/drag/cancel |
| `src/scene.js` | 世界、開放狀態、橋／柵欄、拾取、更新頻率與資源生命週期 |
| `src/world/layout.js`、`presets.js` | 六主幹一層支線的 1–15 島座標／拓樸、固定主題資料 |
| `src/world/phase-one.js`、`islands/` | 原雙島模型與四組主題工廠；[Island Factory](docs/ISLAND_FACTORY.md) |
| `src/world/dressing.js` | 15 主題靜態崖壁／植被／水景／道具，保留區與 InstancedMesh |
| `src/world/fauna.js` | 每島恰好三隻獨立動物、15 種代表物種、錯相動畫 |
| `src/world/npc-motion.js`、`npc-safety.js` | 局部漫遊、固定步進、pause/resume、地表／障礙／視線及同伴安全 |
| `src/world/day-night.js` | 日夜過渡、學院／小屋窗光、橋燈、主題裝飾與近景局部光 |
| `src/world/sea-life.js` | 動態薄荷海面、四隻外海鯨魚、局部合批及實例化噴水／尾波 |
| `src/world/visitors.js`、`visitor-navigation.js` | 3–8 位無編號背景小人，開放橋網 BFS、地表路點、安全避讓與巡遊 |
| `src/world/optimize.js` | 靜態頂點色合批、可動根／關節保留、GPU 釋放 |
| `src/demo/fixture.js` | 虛構角色與同 Manifest v1 格式的本機資料，無真實教材 |
| `test/`、`scripts/` | 單元、瀏覽器、Apache 子目錄回歸、截圖及效能 |

本輪實際平行兩位Subagents：A Lecture資料／Loader／唯讀CLI，B Lecture清單／狀態／響應式UI；Main統一處理共用Dialog、Manifest與Demo接線、回歸／截圖／發布文件及唯一PR。所有權及凍結介面見[PHASE_3_INTERFACES](docs/PHASE_3_INTERFACES.md)。
正式設定為 `public/course-config.json` 的 `courseTitle`、整數 `totalUnits:1–15`、`assignmentMode:quiz|video-only`。正式開放唯一來源是 `public/assignments/manifest.json`，目前維持 `{"schemaVersion":1,"units":[]}`。未開放內容不 fetch，不因缺題庫自動切模式；已開放單元的Lecture按需讀取固定相對路徑JSON；缺檔／錯誤會明確提示，不以其他內容替代。

## 測試與效能

```powershell
npm test
npm run build
npm run test:smoke
npx playwright install chromium
npm run test:browser
npm run validate:content
```

版本固定於 lockfile：Node 24、npm 11+、Vite 8.3.5、Three.js 0.186.1、Playwright 1.64.1。可用 `CHROMIUM_PATH` 指定瀏覽器，例如 PowerShell 的 `$env:CHROMIUM_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'`。

- 單元測試 **148/148通過**，保留Phase2.5全部112項，新增Lecture資料／CLI20、UI14、正式S01無NPC fixture整合2項。
- 完整瀏覽器 **65/65通過**，保留原56項，新增九組Lecture數量／順序／popup／race／cache／錯誤／響應式與Apache production情境；原始證據見Phase3驗收報告。
- Smoke另用/tmp可丟棄的video-only dist副本驗實際Lecture JSON HTTP載入與原順序，不需要題庫，不改正式檔案；原Smoke將dist掛到 `/~wildwolf/engineering-island-lab/`，檢查 HTML／JS／CSS／favicon／JSON／空 Manifest。
- 共用幾何／材質、靜態合批及 InstancedMesh；遠景動物與 NPC 為 6Hz，近景完整更新。可動根／關節在自己的局部框架合批，聚焦才啟用陰影；保留 GPU 資源釋放。外海鯨魚不投影，海面更新時間／日夜顏色 uniform；小旅人總覽為 6Hz，近景逐畫面。
- Phase2.5歷史日夜效能保留於該報告；本輪不改3D／相機／動畫，保留原軟體GPU回歸量測。雲端僅SwiftShader，未宣稱完成本輪Windows實機驗收。
- 主 JS 仍有 Three.js >500kB 提示；沒有大型外部模型、貼圖、後製或 CDN。原有 45 個海面泡沫合成一批，以抵銷新增背景模型呼叫。

## 後續與素材

`base:'./'` 與相對 URL 保留，dist 可用 Apache 子目錄提供，不需 Node 服務或 SPA rewrite；本輪只本機 preview，未部署、Tag 或 Release。

Phase3已實作Lecture任意長清單與YouTube外連驗證；正式開放仍由教師核准Manifest。Phase 4 才精確相容舊 Quiz v1/v2、答錯重試、解說及全部答對開 Form。v2 是「任一接受的單選答案」，不是多選；舊 GUI S13–S15 支援另列待辦。本版不含判答、正式題庫或Form，也未發布真實Lecture影片。

未來教材依 [CONTENT_AND_RELEASE](docs/CONTENT_AND_RELEASE.md)：教師確認 Notion 完整卡片並另存 PDF，指定單元／順序後，只擷取該週 Lecture 的 `title`、HTTPS YouTube `url`；不猜連結、不混入題目答案。先更新及核對內容，最後更新 Manifest，發布另需明確授權。

模型、角色、動物、圖示均為程式原創；Three.js／Vite 為 MIT、Playwright 為 Apache-2.0，使用系統字體。四張教師參考只供研究，不進 public/dist。不加入學生化身、登入、DB、後端、追蹤、Notion API、物理引擎或後台。
