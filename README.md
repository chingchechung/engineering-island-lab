# Engineering Island Lab

童話微型模型風格的 Three.js 課程群島。教師已在 Windows 11 Chrome／Edge 驗收 Phase0–3，PR #1–#4 合併至 main `dd3f96f4`。本輪 Phase4 整合舊 Maze／City v1/v2 題庫：每島獨立四／五位 NPC、單選作答、錯答重試、答對解說及全題完成後的 Google Form。Lecture、島形、日夜、相機與背景生命保留。

正式 `public/assignments/manifest.json` 繼續維持 `{"schemaVersion":1,"units":[]}`，沒有發布任何教材。只交付唯一 Draft PR #5 後等待教師驗收，不合併／部署／Tag／Release／進 Phase5。

## Windows 11 Chrome／Edge 本機驗收

若先前以 `core.autocrlf=true` 取得 CRLF 參考檔，更新分支後先依 [Windows 重新 checkout 步驟](docs/WINDOWS_EOL_CHECKOUT.md) 備份修改並重取指定檔案。新 clone 自動遵守 `.gitattributes`，保留全部14個 pinned SHA256；不需修改 Git 全域設定。

需要 Node24、npm11+、Git、支援 WebGL2 且開啟硬體加速的瀏覽器。PowerShell：

```powershell
git clone --branch feature/phase-4-quiz-integration https://github.com/chingchechung/engineering-island-lab.git
cd engineering-island-lab
npm ci
npm test
npm run build
npm run test:smoke
npm run validate:content
npm run demo
```

既有 clone 先保留自己的修改，再 fetch／switch 指定分支，乾淨時 `git pull --ff-only origin feature/phase-4-quiz-integration`。Vite 預設 localhost:5173，停止按 Ctrl+C。

| 情境 | 本機網址 |
|---|---|
| 混合 v1/v2、四／五題 | http://localhost:5173/?demo=1&units=12&open=4 |
| 15島全開、混合題數 | http://localhost:5173/?demo=1&units=15&open=15 |
| 原五題操作回歸 | http://localhost:5173/?demo=1&units=15&open=15&questions=5 |
| Video-only | http://localhost:5173/?demo=1&units=15&open=15&mode=video-only |
| 正式空Manifest | http://localhost:5173/ |

Demo 只在 Vite Development 且 `demo=1` 時有效。`units=1–15`、`open=0–15`、`mode=quiz|video-only`；未指定 questions 時奇數島4題、偶數島5題，顯式 `questions=4/5` 可統一題數供歷史回歸。S01=v1四題、S02=v2五題、S03=v2四題、S04=v1五題。v1答案依序 A/B/C/D/(A)；v2各題 A 或 C 單選皆通過。所有 Demo 文字／影片／Form 都是合成測試，並非正式教材；自動化測試攔截外站，不實際提交表單。

1. 總覽、導覽聚焦、左拖旋轉、右拖或 Shift左拖平移、滾輪縮放及返回總覽維持正常。旋轉180°後點移動 NPC 模型及 Q 標牌，題目編號正確、NPC停止，關閉／Esc後恢復。
2. S01只有Q01–Q04，S02有Q05。打開Q01先看題目／三或四個單選選項；未答對不顯示解說，沒有Form。題目影片可自由點擊另開分頁，原Modal保留。
3. 答錯可重試且不清除其他題；答對顯示綠色Qxx ✓、完成數、解說影片與原解說文字。重訪已完成題再答錯，原通過與解說仍保留。v2選A或C任一個即可，三選項不補D。
4. S01 3/4、S02 4/5不解鎖Form；4/4及5/5才顯示原題庫的Open Google Form，關閉後導覽旁仍有小入口。切島各自保留進度，旋轉／日夜／Lecture不清除；重新整理全部歸零。
5. 在1366×768、1920×1080與390px檢查28/18px（手機24/16px）及620px響應Modal，長內容內捲、關閉鈕44px，沒有整頁／水平溢出；新開題目從頂部開始，外連返回保留捲動位置。Modal開啟時相機隔離，海面、動物、鯨魚、旅人繼續活動。
6. Video-only沒有Q、Quiz、進度或Form，也不下載Quiz程式／題庫；Lecture保留。Lecture S01=1／S02=4／S03=10／S04異序，影片數任意、原序、不嵌入／自動播放／追蹤。
7. 正式入口全部鎖定、不載教材；`npm run preview` 的 production 同樣忽略全部Demo參數。每島3隻動物、4隻外海鯨魚與已開放島的背景旅人均不可點擊／控制；未開放島保留柵欄／鎖牌。

完整截圖、效能、失敗資料及驗收步驟見 [Phase4驗收](docs/PHASE_4_ACCEPTANCE.md)；原 [Phase3 Lecture](docs/PHASE_3_ACCEPTANCE.md)、[Phase2.5日夜／環繞](docs/PHASE_2_5_ACCEPTANCE.md) 與 [Phase2場景](docs/PHASE_2_ACCEPTANCE.md) 是已驗收的歷史紀錄。雲端Linux／SwiftShader測試不代表本輪Windows實機驗收。

## Quiz 契約與暫時進度

完整來源與逐項結果見 [ASSIGNMENT_COMPATIBILITY](docs/ASSIGNMENT_COMPATIBILITY.md)。固定 City v1.0.0 `38b1dfdd`／Maze `70cc35d9`；原URL regex、normalize、嚴格欄位及acceptsAnswer沿用，只擴單元／檔名上限至S15。v1=`correctOption`、四選項；v2=`correctOptions`、三／四選項，是任一接受答案的**單選**。題目與解說YouTube URL、Google Form仍必填；看影片不強制。

Manifest是唯一開放權威。只有已開放且題庫驗證成功才生成NPC；固定相對 `assignments/Sxx.json`、精確ID／檔名、normalize後title與Manifest相同。HTTP／JSON／契約錯誤在導覽旁明確提示，沒有假題、不切換模式，Lecture仍可用。每個單元在啟動時平行載入（每筆15秒上限），成功深凍結快取／single-flight、取消及過期回應保護；不會把資料放到其他島。

所有題目通過才顯示同單元Form，外連均 `target="_blank" rel="noopener noreferrer"`，只由使用者點擊。進度只在目前頁面JS記憶體，沒有LocalStorage／IndexedDB／Cookie／登入／後端，不保存姓名、成績或觀看紀錄，也不觀測Form提交。公開JSON答案可以下載；這是開放式練習，不是安全考試。

## 教師每週準備與發布

完整流程見 [TEACHER_PUBLISHING](docs/TEACHER_PUBLISHING.md) 及 [CONTENT_AND_RELEASE](docs/CONTENT_AND_RELEASE.md)。Notion先捲到底，確認動態卡片齊全再存完整PDF；提供單元與順序。AI不得猜缺漏連結、引用舊學期或混入Quiz影片。

Lecture Prompt（可直接複製，替換PDF／S04）：

```text
依 README 與 docs/CONTENT_AND_RELEASE.md，閱讀我提供的最新完整課程 PDF。
本次只準備 S04。擷取全部 Lecture 標題與 YouTube 網址，照 PDF 順序；我另有順序則優先。
更新 public/course-videos/S04.json，不加CHT/ENG、不排序、不混題目或解說影片。
缺頁、卡片未載入或網址不清楚就回報，不猜、不套上一學期。
執行 npm run validate:content -- --unit S04，列出原順序與完整差異。
這只驗Lecture；Quiz另備教師核准題庫並加 --with-quiz。
先給我審查，不更新正式Manifest、不合併、不部署。
```

Quiz題庫用既有Python GUI或教師授權AI，必須提供原題目／答案／影片與Form，保留v1/v2。舊GUI屬另一Repository且本次未修改；S13–S15須先確認GUI支援，或依相同Schema手動／AI產出。

```powershell
# Lecture候選，不代表Quiz或正式發布完整
npm run validate:content -- --unit S04
# Lecture + Quiz候選，不開放島嶼
npm run validate:content -- --unit S04 --with-quiz
# Manifest全部已開放內容，quiz模式同時驗題庫及title
npm run validate:content
npm run validate:content -- --root dist
```

CLI唯讀，保留原序，不造題、不改檔、不部署。Video-only不讀題庫；空Manifest可通過但明示沒有單元發布。完整非空發布檢查成功只代表格式完整，仍需教師確認真實影片可觀看／Form可接受提交及審查差異。核准後先部署Lecture與Assignment、確認靜態HTTP，再**最後更新Manifest**並保留既有單元。Manifest不是保密措施，私稿／未公布答案不得置於公開目錄。本輪沒有正式發布授權。

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

## 模組與平行交付

| 模組 | 職責 |
|---|---|
| quiz-contract／legacy-assignment／schemas | 原版v1/v2驗證、normalize、URL與單選判答，僅擴S15 |
| quiz-data／quiz-session | Manifest安全載入、不可變cache／取消、各島記憶體進度 |
| quiz-ui／quiz.css／quiz-runtime | 共用大字Modal、radio／結果／解說／Form，僅quiz動態載入 |
| main／scene／world/npc-presets | 每島獨立題數、原NPC／漫遊暫停、CSS完成標示與精簡Form入口 |
| lecture-data／lecture-ui／lecture.css | Phase3原Lecture安全載入／cache／原序清單 |
| scripts/validate-content | 唯讀Lecture候選／Quiz候選／完整發布驗證 |
| camera／interaction／ui／label-layout | 原正交環繞、拖曳／縮放／聚焦、拾取與標牌避讓、共用Modal |
| world/islands／layout／bridge | 已驗收15主題島、六主幹放射橋與鎖定柵欄 |
| world/fauna／sea-life／visitors／day-night | 每島三動物、海面／四鯨魚／背景旅人、日夜燈光 |
| src/demo／test/fixtures | 只有合成資料；不進正式教材 |

先凍結 [PHASE_4_INTERFACES](docs/PHASE_4_INTERFACES.md)，實際spawn三位Subagents：A Legacy契約與parity；B Loader／Session；C Quiz UI。Main負責共享核心、場景、CLI、整體回歸／截圖／文件與唯一PR。三者全部完成並停止後由Main審查整合，沒有各自PR、改正式資料或來源Repository。

## 測試與效能

```powershell
npm test
npm run build
npm run test:smoke
npx playwright install chromium
npm run test:browser
npm run validate:content
# 額外跨語言驗證，Python3 + 測試用jsonschema
python -m pip install jsonschema
node scripts/legacy-parity.mjs
```

一般網站不需Python；Windows wrapper預設python，可用 `$env:PYTHON` 指定。Playwright可用 `$env:CHROMIUM_PATH` 指定Chrome／Edge；測試外連全部攔截，不向Google提交。固定Node24、Vite8.3.5、Three0.186.1、Playwright1.64.1及lockfile，沒有新增依賴。

本輪單元 **212/212**、完整瀏覽器 **76/76組**、build、三段Apache smoke、內容驗證及Legacy parity全部通過。20張真實截圖、三尺寸量測、軟體GPU FPS／Draw Calls／Triangles及命令原始結果見[Phase4驗收](docs/PHASE_4_ACCEPTANCE.md)。雲端沒有實體GPU數據，Windows本輪須教師確認。既有Three.js主包>500kB提示保留；Quiz另拆動態chunk，Video-only不下載。

## 素材與停止點

`base:'./'`、固定相對URL與靜態dist保留，未部署Apache。模型／角色／動物為程式原創；Three.js／Vite MIT、Playwright Apache2.0，系統字體，參考圖不進public/dist。移植題庫程式依教師明示重用授權，原Maze沒有根LICENSE，不推定MIT；headers與來源說明保留。

未修改舊GUI／Maze／City／Cyberpunk，沒有加入學生化身、WASD、DB、登入、追蹤或新3D玩法。本輪只交付Phase4唯一Draft PR #5，停止等待教師Windows驗收。
