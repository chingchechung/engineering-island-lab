# v1.0.0 正式封裝準備與最終驗證

本輪只準備正式版本檔案供教師核准，**尚未建立／推送 v1.0.0 Tag、建立 GitHub Release 或部署學校 Apache**。教師已明確確認 Phase5 Windows 11 Chrome／Edge 十項最終驗收全部通過，並批准 PR #6 合併。本輪沒有重新宣稱或捏造教師未提供的硬體 FPS／renderer 數值。

## 來源與交付

GitHub 最初顯示 PR #6 仍為 Draft；依本次已給的合併同意，先標為 ready，再鎖定預期 head `7d5185ddfc005592dff1a8f84d0514c9a6261e66` 合併。GitHub 確認 [PR #6](https://github.com/chingchechung/engineering-island-lab/pull/6) 已合併，時間 2026-10-30 08:23:54 UTC。

**最新 main／實際建置來源：`a116165be990c45f83bdcab9b9cea499d8fb3e9d`。**

本機工作目錄先確認乾淨，取得遠端 main 並建立對應的本機 main。依序重新安裝、清空 dist 後建置及驗證；封裝前再次確認 main SHA 與乾淨狀態。新的封裝直接讀取本輪 dist，沒有以舊 RC ZIP／inventory／report 作為輸入。[來源與環境](verification/provenance.json)、[封裝時間與 API](verification/packaging.json)可核對。

交付檔案位於獨立審查分支 `release/prepare-v1.0.0`，只新增封裝、報告與文件；未直接推送新的 main commit，沒有另建 PR 或 GitHub Release。

- [engineering-island-lab-v1.0.0.zip](../../../artifacts/v1.0.0/engineering-island-lab-v1.0.0.zip)
- [SHA256](../../../artifacts/v1.0.0/engineering-island-lab-v1.0.0.sha256)
- [逐檔 inventory／SHA256](../../../artifacts/v1.0.0/engineering-island-lab-v1.0.0.files.json)
- [本輪封裝掃描 receipt](../../../artifacts/v1.0.0/engineering-island-lab-v1.0.0.report.json)
- [繁中／英文 Release Notes](RELEASE_NOTES.md)
- [核准前檢查清單](APPROVAL_CHECKLIST.md)

## 新封裝與檢查數值

ZIP **216,989 bytes**，解壓 **771,969 bytes**，9個一般檔案。解壓根目錄直接是 index.html，沒有外層 dist/；檔案 ZIP 權限為0644。

SHA256：

```text
a19b086ed83e587a516769680407ff206e5291f8ed4088ade05fa2044e9448ad
```

本輪重新計算的 ZIP SHA256 與 Phase5 RC 相同：接受驗收的網站 payload 沒有改動，而既有工具使用固定 ZIP metadata，壓縮包自身檔名不寫入 payload。**相同數值是可重現封裝的結果，不是沿用 RC 的檢查結果。** 新 inventory／receipt 的 archive 名稱已是 v1.0.0，來源、產生時間、獨立逐檔核對及 HTTP 證據均為本輪新產生。

封裝重用 main 的 `packageRelease` API，只有參數不同，沒有重寫或修改工具：

```javascript
await packageRelease({
  root: 'dist',
  outDir: '<公開網站以外的交付目錄>',
  name: 'engineering-island-lab-v1.0.0',
});
```

未改動的 Phase5 工具原始 receipt 保留 `kind: release-candidate-only`，表示封裝尚未發布；不代表使用舊 RC。正式檔案名稱為 v1.0.0，本輪 publication 狀態明確是 prepared-for-teacher-approval。`package.json` 的 private／0.0.0 開發 metadata 亦未修改；此版本名稱指靜態網站封裝，沒有 npm 發布。

| ZIP檔案 | bytes |
|---|---:|
| assets/index-CZk6bhiz.js | 727378 |
| assets/index-DMKLz-CI.css | 11902 |
| assets/quiz-runtime-DWfR14Vi.js | 16317 |
| assets/quiz-runtime-Cm_WjxME.css | 2863 |
| index.html | 3102 |
| favicon.svg | 419 |
| course-config.json | 87 |
| assignments/manifest.json | 40 |
| THIRD_PARTY_NOTICES.txt | 9861 |

## 指定命令與實際結果

完整逐次命令、開始時間、耗時與 exit code：[commands.json](verification/results/commands.json)；原始 stdout／stderr：[results/](verification/results/)。雲端 npm 使用 process-local 可寫 cache，不改全域設定。

| 指定步驟 | 本輪結果 |
|---|---|
| npm ci | 通過；固定 lockfile、依賴未升級 |
| npm test | 第一輪238/238，0失敗／0略過 |
| npm run build | 刪除舊 dist 後全新建置通過，base:'./' |
| npm run test | 第二輪238/238，0失敗／0略過 |
| npm run test | 第三輪238/238，0失敗／0略過 |
| npm run validate | main 無此 script，原命令 exit1；對應現有 npm run validate:content **exit0** |
| npm run check | main 無此 script，原命令 exit1；對應現有 npm run check:release **exit0** |
| npm run test | 第四輪238/238，0失敗／0略過 |
| node scripts/legacy-parity.mjs | 364 validation／76 answer、17擴展／381Schema通過；changedValidity=0 |

兩個不存在的簡寫沒有被宣稱成功，也未為此修改 package.json；原始錯誤及對應既有檢查各有獨立紀錄。沒有驗證器／判答規則改動。

補充檢查同樣重新執行：

- `npm run test:smoke`：正式靜態檔、Video-only Lecture、v1/v2四／五題及S15三段全部通過。此命令中的再建置仍使用相同乾淨 main。
- `npm run test:rc`：測試名稱沿用 Phase5，但讀本輪新 dist；正式12島全鎖、忽略Demo參數、無debug／教材請求、三尺寸說明Modal與reload、私人Video-only fixture的Manifest更新及零Quiz下載通過。新的[production網路紀錄](verification/production-network.json)保留；本輪沒有重跑歷史82組完整場景套件或聲稱新增硬體GPU量測。
- `npm audit --omit=dev --json`：Registry成功回應，當時0筆已知advisory；不宣稱無漏洞，不升級依賴。
- `npm run test:apache`：本機隔離 Apache2.4.69 三段 smoke 通過；不是學校部署。
- 直接重用 `checkRelease` 掃描新 ZIP 的獨立解壓結果：[extracted-scan](verification/extracted-scan.json)，9檔、0issue。
- Python stdlib zipfile 與系統 unzip 獨立驗CRC／逐檔長度／SHA／根目錄／權限，與本輪 dist、全新inventory完全一致：[zip-verification](verification/zip-verification.json)。
- 解壓後的正式 ZIP 再由真正本機 Apache 提供：9/9 HTTP回應SHA256及MIME／cache正確，5項缺檔真404，未變Manifest條件GET回304：[apache-http](verification/apache-http.json)。
- [14份pinned原始檔新hash](verification/pinned-hashes.json)均符合原預期與merged main blob；四輪Node亦保留 `core.autocrlf=true` 新／既有checkout回歸，沒有變更全域Git設定。

## 正式資料、授權與範圍

實際ZIP再次確認：

```json
{"courseTitle":"數位電子學","totalUnits":12,"assignmentMode":"quiz"}
```

```json
{"schemaVersion":1,"units":[]}
```

所有島仍鎖定，沒有正式教材被開放。ZIP只含上列9檔，不含Demo payload、測試題庫、未發布教材／答案、測試腳本、node_modules／.git／.env、憑證、學生資料、截圖或操作紀錄。合法的題庫驗證程式識別字不是洩漏的題庫；已知合成網址、DEV API與額外檔案由既有release checker阻擋。

`THIRD_PARTY_NOTICES.txt` **全文bytes**已與本輪 public 原檔及 merged main blob 核對一致，不是僅檢查檔名存在。來源與授權範圍沿用 [THIRD_PARTY_NOTICES](../../THIRD_PARTY_NOTICES.md)；Maze-origin不推定整體MIT，未將Repo改為Public。

[123份程式／工具／資料／測試與merged main逐bytes比較](verification/runtime-unchanged.json)完全相同，包括src、public、scripts、test、Schema、package／lock、.gitattributes、index與Vite設定。沒有修改3D、Lecture、Quiz、課程契約、正式Manifest、原始14份內容或SHA預期。

## 核准前停止點

教師先審查新ZIP、SHA、inventory、雙語Notes與[檢查清單](APPROVAL_CHECKLIST.md)。目前只完成可供審查的正式檔案，**沒有Tag、GitHub Release、正式部署或教材發布授權**。

之後若教師明確批准Tag及GitHub Release，仍須核對當時的main／核准目標commit及檔案SHA一致；main若變動，需要重新判斷並重新建置驗證，不能直接沿用本輪核准。學校Apache部署與教材公開仍是另外的授權流程，詳見 [Apache文件](../../APACHE_DEPLOYMENT.md)與[教師SOP](../../TEACHER_OPERATIONS.md)。
