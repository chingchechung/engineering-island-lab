# Quiz v1/v2 相容性與來源

Phase4 以已驗證的舊題庫為資料契約，僅把單元範圍擴展到 S15。沒有重新設計題目格式或把 v2 改成複選題。

## 固定來源與重用授權

- [Engineering City Lab v1.0.0](https://github.com/chingchechung/engineering-city-lab/tree/v1.0.0)：Tag 指向 commit **38b1dfdd73d766ec1d01999216b24dfca2126fad**（不是 annotated tag object 257cade5）。閱讀 `docs/assignment-compatibility.md`、`assignment-reuse.md`、`phase-3-results.md`、`teacher-publishing.md`，以及 assignment contract/rules/validator/loader/session、education-ui 與三份 Schema。
- [Engineering Maze Lab 固定版](https://github.com/chingchechung/ece_hw_webproject/tree/70cc35d9ce828bcd5357f16fe85f303aa2d30cd9)：commit **70cc35d9ce828bcd5357f16fe85f303aa2d30cd9**。對照原始驗證器、Python 獨立實作、Schemas、合成資料及跨語言 corpus。

兩份 checkout 只讀，沒有修改／推送來源 Repository 或舊 Python GUI。教師在 [Phase4 原始授權](PHASE_4_BRIEF.md) 明確要求重用／移植這些元件。Maze 固定版本沒有根層 LICENSE，**不推定整個來源程式為 MIT**；原始 headers、Schema comments、合成資料標記均保留。這次沒有複製第三方依賴程式、Maze 遊戲機制、City 物理、教師私稿或真實課程答案。

| 本專案位置 | 來源與差異 |
|---|---|
| `src/legacy-assignment/assignment-rules.js` | City／Maze `js/assignment-rules.js`，逐 byte 相同，YouTube／Forms regex 完全不改。 |
| `src/legacy-assignment/assignment-validator.js` | City／Maze `js/assignment-validator.js`，只把 ID regex `1[0-2]` 改為 `1[0-5]`、Manifest 上限 12 改15，對應錯誤文字同步改15；其餘演算法、錯誤順序、normalize／acceptsAnswer 不改。 |
| `src/quiz-contract.js` | City `js/assignment-contract.js` 的原生模組橋接：改為本地 legacy 目錄，在原生 ESM／Vite CommonJS 打包間沿用 City 的 `legacy.default ?? globalThis.AssignmentValidator` 讀取原 UMD API；`validateOrThrow` 保留完整 issues 及前三項摘要。沒有複製另一套判答。 |
| `schemas/assignment-v{1,2}.schema.json` | 原 Schema 僅擴展 unitId regex 至 S15；URL、required、欄位及答案規則不改。 |
| `schemas/manifest-v1.schema.json` | 同一 v1 格式，上限15、ID regex 至15，追加 S13／S14／S15 的精確檔名分支及單元唯一限制。 |
| `test/fixtures/legacy/reference/` | 14 份 City 與 Maze 相同的原始檔案，原 bytes 不改；含兩個 JS、Python validator、兩個 corpus、六個 fixture、三份 Schema。檔案 SHA256 見 `source-files.json`。本地 `tests/__init__.py` 只是封裝標記。 |
| `test/fixtures/legacy/corpus.json` | 原 corpus 產生器的完整 364 validation cases／76 answer selections，僅測試，不進 public／dist。 |
| `scripts/legacy-parity.{mjs,py}` | 本專案唯讀適配測試：原 JS 隔離執行、原 Python、只在記憶體擴範圍的 Python、Island JS 及 JSON Schema 逐項比對。來源檔不被修改。 |

## 保留的契約

| 規則 | Assignment v1 | Assignment v2 |
|---|---|---|
| schemaVersion | 數字1 | 數字2 |
| 必要單元欄位 | schemaVersion、unitId、title、googleFormUrl、questions | 相同 |
| 單元與檔名 | S01–S15，精確對應 Sxx.json | 相同 |
| 題數與ID | 4或5題，順序連續且唯一 Q01–Q04／Q05 | 相同 |
| 選項 | 固定四個非空字串，A–D 原順序 | 三或四個非空字串，A–C／A–D 原順序 |
| 正解欄位 | correctOption，單一 A–D | correctOptions，非空、不重複、每個 label 必須有對應選項 |
| 學生作答 | 只選一個 label | 只選一個 label，屬於接受答案陣列即可通過 |
| 每題必要影片 | questionVideoUrl、explanationVideoUrl | 相同 |
| 選用文字 | title、prompt、explanationText 字串 | 相同 |

例如 `correctOptions: ["A", "C"]`，單選 A 或 C 均答對；陣列選取、複選、同時選完所有正解都不是契約。三選項不補 D，接受 D 會被拒絕。禁止混合 correctOption／correctOptions，禁止不明欄位及私人 authoring metadata。保留原 validator 的有序 `{path,code,message}` 錯誤。

normalize 回傳深拷貝，trim 單元 title／Form URL、每題選用文字／影片 URL／options；保留選項及題目順序。unitId、Qxx、correctOption／correctOptions 不 trim、不改大小寫。選用文字空字串仍合法，非字串不合法；explanationVideoUrl **仍為必要資料**，只是學生是否觀看由學生選擇。

Quiz 影片使用原版 HTTPS `youtube.com/watch`（含 www）／`youtu.be` 精確 regex，而非較新的 Lecture URL validator。保留原 query／hash 語法、11字影片ID、重複 v 與假網址／placeholder rejection；例如 m.youtube.com 不在舊 Quiz 白名單內。Google Forms 保留原版 forms.gle／docs.google.com/forms 的 supported paths（含原規則接受的 viewform／edit）。驗證只確認語法，不能保證影片仍公開、影片內容正確或表單接受提交；教師必須用學生可存取的瀏覽器確認。

Manifest 仍為 `{schemaVersion:1,units:[{unitId,title,file}]}`，沒有第二份發布清單。loader 另外檢查課程 totalUnits、Manifest allowlist、固定相對路徑及 normalize 後 title 一致；驗證成功才建立可作答 NPC。video-only 保留 Manifest 形狀但不讀題庫，也不載入 Quiz runtime。

## 實測相容性

獨立契約 Node 測試 **14/14 通過**。第一組完整重播 **364 個原 validation cases** 與 **76 個 answer selections**，不是只挑幾個看似相同的案例；其餘組驗證來源 hashes、v1/v2 四／五題、S12–S15／S16、v2 A/C 單選、必要解說影片、嚴格欄位、normalize、不合法 Manifest 路徑及完整 errors。

跨語言執行 `node scripts/legacy-parity.mjs` 實測結果：

```json
{
  "validationCases": 364,
  "answerSelections": 76,
  "changedErrors": 11,
  "changedValidity": 0,
  "extendedCases": 17,
  "schemaCases": 381,
  "pythonParity": "passed",
  "schemaParity": "passed"
}
```

原 JavaScript／Python 的完整 error objects、normalize 及76次單選判答一致；Island JavaScript／範圍擴展後的獨立 Python 也一致。全部原 corpus 的接受／拒絕結果不變，答案結果與正規化逐項不變。**11個案例的 errors 有明確且受測試限制的差異**：

- 八個非法ID案例的說明文字由「Expected S01 through S12」改為「…S15」；path／code／其他錯誤不改。
- 兩個 S13 案例不再有 unit_id 錯誤，但原案例仍使用 S01.json，保留 filename 錯誤，並未把錯檔名接受。
- 一個含14筆重複單元的案例不再有超過12筆錯誤，仍保留所有 duplicate_unit 錯誤，仍為非法。

這些差異逐項比對，沒有略過整組非法資料。另加17個實際 JS／Python／Schema 案例：v1/v2 × 四/五題 × S12/S13/S14/S15 共16個，以及含 S01–S15 的15筆 Manifest。它們全部通過；Schema 累計381案例。檔名是 Schema 外的驗證上下文，parity 保留原測試對該差異的處理。單元測試不依賴 Python；跨語言／Schema 測試另需 Python3、測試用 jsonschema，不是網站執行依賴。

```powershell
node --test test/quiz-contract.test.js
python -m pip install jsonschema
# Windows 若 Python launcher 的命令為 py，可改用 py -3 scripts/legacy-parity.py
node scripts/legacy-parity.mjs
```

Windows 的 node wrapper 預設呼叫 `python`，Linux 預設 `python3`；可設定 `PYTHON` 指定 Python 可執行檔。測試無 provider 導覽、不送出 Form、不修改 Manifest／JSON、不連來源 Repository。

## 島嶼適配與界線

舊 City 的「明確 Load Unit／確認取代後重置」改為群島所需的 **unitId 各自記憶體 Session**；切島、相機旋轉、縮放、日夜及 Lecture 不撤銷作答。答錯可重試，不撤銷任何已通過題；已通過題重訪後錯答仍保留通過及解說。4/4或5/5才提供同單元 Google Form。這是介面與暫存範圍適配，不改資料契約或 acceptsAnswer。

學生作答只在目前頁面的 JavaScript 記憶體，不用 localStorage／IndexedDB／Cookie／帳號／資料庫；重新整理即清除。Manifest 只表示教師開放，與學生完成進度不同。公開 JSON 中的答案可直接下載；這是開放練習，並非安全考試／成績系統，不觀測影片歷程或 Form 是否提交。

舊 Python GUI 未修改，不能宣稱它已支援 S13–S15。未來使用擴展單元前，須教師確認另一個 Repository 的 GUI 已支援，或由 AI／人工依本專案相同 Schema 產出 JSON，再用本專案唯讀驗證及教師審核。正式教材與正式 Manifest 本輪均不發布。
