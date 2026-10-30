# Release Candidate 與正式發布檢查表

本輪狀態：Phase5 技術準備；只建立 `engineering-island-lab-v1.0.0-rc.zip` 與 Draft PR #6。這份清單不授權合併、Tag、Release、改為 Public 或部署。

## RC 審查

- [x] 從 `feature/phase-5-release-readiness`，核對基準 main `046efcab`，PR #1–#5及教師驗收已完成。
- [x] `npm ci`、`npm test`、`npm run build`、`npm run test:smoke`、`npm run test:browser`、`npm run validate:content`、`node scripts/legacy-parity.mjs` 的完整結果與環境版本保存。
- [x] `npm run check:release`、`npm run package:rc`、真正本機 Apache／RC 瀏覽器檢查與獨立 ZIP 解壓核對通過。
- [x] 所有14個 pinned reference SHA256不變；`core.autocrlf=true` 新／既有 checkout及兩份移植JS LF證據保留，不改全域Git設定。
- [x] ZIP 是網站根內容，inventory／ZIP SHA與逐檔hash一致；不包含dev／私稿／tests／Repo／credentials／截圖／紀錄／備份。
- [x] 正式 config 仍為數位電子學、12、quiz；Manifest `schemaVersion:1, units:[]`。沒有真實教材發布，12島全部鎖定。
- [x] Production忽略全部Demo參數、沒有debugAPI／面板／合成題庫／影片URL；掃描通過只表示工具所列檢查通過，不保證任意混淆secret可被偵測。
- [x] 完成繁中教師操作、Apache快取／MIME／真404、回撤／回復文件，完整授權notice放入RC。
- [x] 原Quiz／Lecture／Modal／日夜／相機／45動物／4鯨魚／旅人功能保留；12／15 DayNight及focus／Video-only效能與真截圖保存。
- [x] [安全與依賴檢查](PHASE_5_SECURITY.md) 的證據、日期與限制已審閱；沒有新增追蹤／遠端服務／答案持久化。
- [x] 所有三位Subagents實際完成、Main審查整合；唯一Draft PR #6交付內容備妥，提交後停止開發。

實際完成狀態、命令結果與下載連結以 [PHASE_5_ACCEPTANCE](PHASE_5_ACCEPTANCE.md) 為準；勾選清單供教師重複操作。

## Windows 11 教師 RC 最終驗收（仍待教師執行）

1. 在 Chrome／Edge 開啟硬體加速；記錄版本、GPU renderer。備份本機修改，依 README 取得指定分支；舊CRLF檔案依 [安全checkout](WINDOWS_EOL_CHECKOUT.md)。

   Windows帳號若無建立檔案symlink的權限，新增工具測試會明示該子案例skip或diagnostic；Linux本輪完整執行。這不略過14個pinned hash／EOL驗證，也不要求教師提高權限。
2. 檢查下載ZIP的SHA256：`Get-FileHash .\engineering-island-lab-v1.0.0-rc.zip -Algorithm SHA256`，比對同目錄 `.sha256`；解壓於**非公開**測試目錄。
3. 透過本機靜態 HTTP（不是 `file://`）查看解壓內容；開發機可執行 `node scripts/deployment-server.js --root <解壓目錄>`，依其輸出網址操作。Node只作本機測試工具。
4. 正式RC全部鎖定、沒有教材；加 `?demo=1&units=15&open=15&mode=video-only` 仍維持正式12島與無Q；F12確認沒有fixtures／localhost以外的遠端資料請求、debug API。
5. 1366×768、1920×1080、390px檢查入口、日夜、拖曳旋轉／平移／縮放／聚焦／返回、鎖定提示與操作說明Modal；沒有頁面溢出或JS錯誤。
6. 要驗開放課程與原Quiz，使用 README 的**DEV明確Demo**（合成資料），或在私人staging放教師核准的候選資料再建置；不能以正式空RC宣稱已測真實影片與題庫。測4/5題、錯答重試、Form解鎖、popup返回、Esc／停止恢復、Video-only無Quiz下載。
7. 12／15 DayNight／單島／Quiz／Video-only記錄實體GPU FPS與操作；與雲端SwiftShader分開。Phase0–4歷史Windows驗收不等於本RC新一輪驗收。

## 教師另行批准後的 v1.0.0 流程（本輪未執行）

1. 教師確認 RC、授權與學校管理員條件，審閱 Draft PR #6；另行明確批准合併，保護分支檢查通過後合併。
2. 從合併後的 main 乾淨 checkout，再跑完整檢查、建置與封裝。若檔案不同，重出 inventory／SHA 並讓教師重驗；不要直接把過時RC改名當正式版。
3. 教師另行明確批准建立／推送 `v1.0.0` Tag 與 GitHub Release，附件附ZIP、inventory、SHA、notice與限制。`package.json`目前private／0.0.0為開發metadata，RC名稱不是npm發布或Tag。
4. 確認教材已獲准公開、授權及資料安全、站台權限／TLS／快取／備份可用；另行明確取得學校部署授權後依 [Apache文件](APACHE_DEPLOYMENT.md) staging驗證與切換。
5. 正式站實機測入口、直接重載、真404、MIME／快取、Lecture與Quiz、Video-only和Windows硬體GPU。留存實測證據；需要回復時切回完整一致備份，刷新Manifest確認，不上傳備份到公開路徑。

Repo仍保持既有可見性；任何公開化另需教師決定。本輪沒有已公開網站、正式Release、真實學生資料或授權外的課程變更。
