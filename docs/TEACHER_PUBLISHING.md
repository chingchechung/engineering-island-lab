# 教師每週 Lecture 準備與發布

這是靜態教材檔的準備流程，不需要理解Three.js、編修島嶼或開發管理系統。只有教師核准後才可更動正式Manifest；本次Phase3沒有發布任何教材。

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

完成後執行 npm run validate:content -- --unit S04，列出新增與修改的影片及原順序，並告訴我目前發布清單需要如何修改。Quiz 完整性若尚未支援必須明示，不得把 Lecture 通過當作整份作業可發布。

先提供我審查，不要自行更新正式 Manifest、合併 PR 或部署網站。
```

每週只要替換PDF、S04及必要的順序指示。AI應提供原順序的標題／原網址及差異摘要，教師逐項核對來源。Schema不新增CHT／ENG、時長、完成狀態等必填欄位；允許1、4、10或更多影片。

## 本機驗證

在專案目錄使用Node24／npm11：

```powershell
npm ci
npm run validate:content -- --unit S04
npm run validate:content
```

- `--unit S04`只檢查該候選Lecture及課程／Manifest結構，不會開放S04；候選即使通過也不代表整份作業或發布就緒。
- 不帶`--unit`時檢查Manifest中全部已開放單元的Lecture；漏檔、非法網址、編號不符、空清單都會失敗。CLI列出原順序，不會改寫或排序，也無法自行知道PDF的預期順序，仍需教師核對。
- `--root dist`可檢查已build的靜態根目錄；例如`npm run validate:content -- --root dist`。預設根目錄為public，不接受從JSON自行指定任意Lecture檔案路徑。
- 網址僅做HTTPS YouTube格式驗證，不會查YouTube API；教師仍需確認影片實際公開且可觀看。
- 工具只讀取檔案，不寫Manifest、不修改JSON、不build／部署。

## 兩種課程的發布判定

| 模式 | Phase3檢查與限制 |
|---|---|
| video-only | 每個已開放單元須有有效且非空Lecture；不需要、不讀assignments/Sxx.json。Manifest的file欄位仍保留原相容格式。 |
| quiz | Lecture與video-only共用。正式Quiz v1/v2、判答、解說、Google Form完整性留Phase4，工具明示尚未支援；正式非空Quiz發布檢查回失敗。候選Lecture可單獨檢查，不能宣稱整份作業完成。 |

本專案目前為quiz且正式Manifest `units:[]`，預設驗證可通過，意思是設定／空清單合法，**沒有任何單元已發布，也不代表Quiz驗證通過**。不要為測試而開放S01–S12。Demo採獨立src/demo測試資料，`?demo=1`僅Vite開發可用，production完全忽略。

## 教師核准後才執行的Apache順序

1. 先核對與準備新單元的`course-videos/Sxx.json`，保留此前已開放內容。
2. quiz還必須準備完整且經Phase4相容驗證的`assignments/Sxx.json`；Phase3不可提前發布未完成的作業。
3. 先上傳內容檔，確認相對子目錄網址能正常載入、影片標題／順序／網址正確。
4. 最後才上傳教師核准的`assignments/manifest.json`，保留原有已開放單元並加入新單元。

若重build整包dist，先讓所有正式內容與Manifest一致、驗證通過，再由教師明確授權部署；不要讓Manifest先開放而內容仍404。以上是未來操作說明，**本次沒有合併、部署、Tag／Release或更新正式Manifest的授權**。

Manifest是顯示及開放控制，並非秘密資料的存取保護。未公布題庫草稿不得放進可直接下載的public／Apache路徑。不要保存學生觀看紀錄、帳號或任何持久化個人進度。

## 本機功能驗收

執行`npm run demo`，使用`http://localhost:5173/?demo=1&units=12&open=4&questions=5`：S01一部、S02四部、S03十部、S04異序。Demo全部明示測試連結，並不是本學期教材。

點影片後YouTube另開分頁，原島嶼／Modal與捲動位置保留；清單很長也只在Modal內捲動。以`open=5`測S05缺資料提示，以`mode=video-only`驗沒有題目NPC。Production入口維持正式空Manifest，即使加Demo參數也不開放。
