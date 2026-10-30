# 教師每週 Lecture／Quiz 準備與發布

這是靜態教材檔的準備流程，不需要理解Three.js、編修島嶼或開發管理系統。只有教師核准後才可更動正式Manifest；本次Phase4沒有發布任何教材。

## 每週提供給AI的三項資訊

1. 最新且完整的課程PDF。
2. 要更新的單元，例如S04；必須在course-config.totalUnits內，最大S15。
3. 若不同於PDF出現順序，另外列明影片先後順序。

在Notion先捲到底部，等所有動態影片卡片出現，再列印／另存PDF。檢查尾頁沒有空白或缺頁、每部Lecture影片的完整網址可辨識。PDF缺漏、網址不清楚時先補完整，AI必須回報而不能猜測、引用上一學期或混入題目／解答影片。不需要Notion API、爬蟲、DB或影片編輯GUI。

## 可直接複製的教師Prompt

```text
請依照 Engineering Island Lab 專案 README 與 docs/CONTENT_AND_RELEASE.md，閱讀我提供的最新課程 PDF。

本次要更新的單元是 S04。

請找出 S04 對應的全部 Lecture 教學影片，擷取標題及 YouTube 網址，依 PDF 順序整理；若我另有指定順序，則以指定順序為準。

請更新 public/course-videos/S04.json。

不要增加 CHT／ENG 分組，不要自行排序，不要修改題目或解答影片。PDF 缺頁、影片未完整載入或網址無法辨識時，請具體回報，不要猜網址、套用上一學期或虛構影片。

完成後執行 npm run validate:content -- --unit S04，列出新增與修改的影片及原順序，並告訴我目前發布清單需要如何修改。本命令只驗 Lecture；Quiz 課程須另備教師核准的題庫，再使用 --with-quiz，不得把 Lecture 通過當作整份作業可發布。

先提供我審查，不要自行更新正式 Manifest、合併 PR 或部署網站。
```

每週只要替換PDF、S04及必要的順序指示。AI應提供原順序的標題／原網址及差異摘要，教師逐項核對來源。Schema不新增CHT／ENG、時長、完成狀態等必填欄位；允許1、4、10或更多影片。

## 本機驗證

在專案目錄使用Node24／npm11：

```powershell
npm ci
npm run validate:content -- --unit S04
npm run validate:content -- --unit S04 --with-quiz
npm run validate:content
```

- `--unit S04`只檢查該候選Lecture及課程／Manifest結構，不會開放S04；候選即使通過也不代表整份作業或發布就緒。
- `--unit S04 --with-quiz` 同時檢查候選 Lecture 與原格式 v1/v2 題庫，但不開放；若候選尚未在 Manifest，發布前仍須核對預計的 Manifest title 與 normalize 後題庫 title 相同。
- 不帶`--unit`時檢查Manifest中全部已開放單元的Lecture及quiz模式的Assignment；漏檔、非法網址、編號不符、空清單都會失敗。CLI列出原順序，不會改寫或排序，也無法自行知道PDF的預期順序，仍需教師核對。
- `--root dist`可檢查已build的靜態根目錄；例如`npm run validate:content -- --root dist`。預設根目錄為public，不接受從JSON自行指定任意Lecture檔案路徑。
- 網址僅做HTTPS YouTube格式驗證，不會查YouTube API；教師仍需確認影片實際公開且可觀看。
- 工具只讀取檔案，不寫Manifest、不修改JSON、不build／部署。

## 兩種課程的發布判定

| 模式 | Phase4檢查與限制 |
|---|---|
| video-only | 每個已開放單元須有有效且非空Lecture；不需要、不讀assignments/Sxx.json。Manifest的file欄位仍保留原相容格式。 |
| quiz | 完整發布檢查要求 Lecture 與每筆 Assignment：原 v1/v2、4/5題、ID／檔名、normalize 後 Manifest title 相同、選項／接受答案、必要題目／解說影片及 Form URL。全部通過且非空才能回報正式內容完整；不表示已獲發布授權。 |

本專案目前為quiz且正式Manifest `units:[]`，預設驗證可通過，意思是設定／空清單合法，**沒有任何單元已發布，沒有作業已準備完成**。不要為測試而開放S01–S12。Demo採獨立src/demo測試資料，`?demo=1`僅Vite開發可用，production完全忽略。

## 教師核准後才執行的Apache順序

1. 先核對與準備新單元的`course-videos/Sxx.json`，保留此前已開放內容。
2. quiz還必須用既有 Python GUI 或教師授權的 AI 準備 `assignments/Sxx.json`，保留 v1/v2，不由 Lecture PDF 自動猜題。以 `--unit Sxx --with-quiz` 驗證，確認題目／解說影片正確，實際 Google Form 可用且接受學生提交。
3. 提供 Lecture／Assignment／預計 Manifest 差異給教師核對；核准後先上傳兩種內容檔，確認相對子目錄網址 HTTP200、JSON MIME／實際內容及影片原順序正確。
4. 在完整候選與發布內容驗證通過後，最後才上傳教師核准的`assignments/manifest.json`，保留原有已開放單元並加入新單元。

若重build整包dist，先讓所有正式內容與Manifest一致、驗證通過，再由教師明確授權部署；不要讓Manifest先開放而內容仍404。以上是未來操作說明，**本次沒有合併、部署、Tag／Release或更新正式Manifest的授權**。

Manifest是顯示及開放控制，並非秘密資料的存取保護。未公布題庫草稿不得放進可直接下載的public／Apache路徑。不要保存學生觀看紀錄、帳號或任何持久化個人進度。

## 本機功能驗收

執行`npm run demo`，使用`http://localhost:5173/?demo=1&units=12&open=4&questions=5`：S01一部、S02四部、S03十部、S04異序。Demo全部明示測試連結，並不是本學期教材。

點影片後YouTube另開分頁，原島嶼／Modal與捲動位置保留；清單很長也只在Modal內捲動。以`open=5`測S05缺資料提示，以`mode=video-only`驗沒有題目NPC。Production入口維持正式空Manifest，即使加Demo參數也不開放。


## Quiz 題庫準備 Prompt（另附教師授權的題目來源）

```text
依 docs/ASSIGNMENT_COMPATIBILITY.md，僅為 S04 準備教師授權的題庫資料。
沿用 Maze／City JSON v1/v2，不改欄位或版本；4/5題連續Q01–Q04/Q05。
v1四選項與correctOption；v2三/四選項及correctOptions接受單選其中一個，不做複選，不補D。
questionVideoUrl、explanationVideoUrl及googleFormUrl必填，保留原選項順序及選用文字。
只使用我明確提供的題目、答案與網址；資料不全就回報，不從Notion或舊學期自行找／編真題。
更新候選 public/assignments/S04.json，搭配已核對 Lecture，執行
npm run validate:content -- --unit S04 --with-quiz
提供v1/v2、題數、原順序、URL驗證及完整差異，指出預計Manifest title須與題庫normalize title相同。
給我審查；不自行更新正式Manifest、合併、部署、Tag或Release。
```

舊 GUI 位於另一個 Repository，本次未修改；S13–S15 必須先確認 GUI 支援，或由教師授權 AI／人工依本專案 Schema 產出後驗證。原版固定來源與測試見[相容性文件](ASSIGNMENT_COMPATIBILITY.md)。explanationVideoUrl 必填，但學生觀看解說是自由選擇；影片／Form 網址僅驗語法，不能代替教師檢查可觀看／可提交。

同一頁面各島作答彼此獨立；切島／相機／日夜／Lecture不清除，重新整理全部清除。沒有LocalStorage、IndexedDB、Cookie或後端。公開JSON含答案，這是開放練習，不是安全考試。網站不保存姓名、成績或觀看歷程，也不偵測Google Form提交。
