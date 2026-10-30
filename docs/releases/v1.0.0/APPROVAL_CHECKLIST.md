# v1.0.0 Tag／GitHub Release 核准前清單

本清單記錄正式封裝準備，不是執行Tag或Release的授權。來源main：`a116165be990c45f83bdcab9b9cea499d8fb3e9d`；完整證據見 [PREPARATION](PREPARATION.md)。

## 已完成的技術準備

- [x] 教師已明確確認Phase5 Windows11 Chrome／Edge十項最終驗收全部通過（教師回報，未捏造數值效能資料）。
- [x] 教師批准PR #6合併；GitHub確認已合併，預期head與merge SHA均記錄。
- [x] 取得最新main，建置前與封裝前Git工作目錄乾淨，來源commit／tree／環境／時間記錄齊全。
- [x] npm ci、清空dist後build、四輪各238/238測試、Legacy364／76＋17／381通過。
- [x] validate／check簡寫缺少的原始結果明示；現有validate:content／check:release均通過，沒有為改命令而修改已驗收工具。
- [x] 新dist重用Phase5封裝API，產生engineering-island-lab-v1.0.0.zip及全新SHA／inventory／receipt；未複製舊RC。
- [x] 9檔根目錄可直接解壓部署；獨立CRC／逐檔SHA、production browser、嚴格HTTP與本機真正Apache驗證通過。
- [x] 正式設定仍數位電子學／12／quiz，Manifest units:[]；沒有開放課程或上傳教材。
- [x] ZIP沒有Demo／測試題庫／私密教材／測試腳本／憑證／學生資料／建置依賴或紀錄。
- [x] ZIP含完整第三方notice，全文bytes與merged main一致；原創／Maze-origin授權界線保留。
- [x] 14個pinned SHA與原始內容、.gitattributes、驗證及答案規則不變；123個既有程式／工具／資料／測試檔與來源main一致。
- [x] 繁中／英文Release Notes含功能、系統需求、部署方式、安全限制與已知問題。
- [x] Repository維持Private；本輪未建立或推送v1.0.0 Tag，未建立GitHub Release，未部署學校Apache。

## 教師仍需明確核准（尚未執行）

- [ ] 核對本輪ZIP bytes及SHA，審查inventory、掃描報告、來源main與雙語Release Notes；確認正式附件內容。
- [ ] 明確批准 **建立／推送 v1.0.0 Tag**，並指定核准目標commit。目標與本輪來源不同時，先重新驗證／封裝。
- [ ] 明確批准 **建立 GitHub Release**，包含Notes、ZIP、SHA、inventory、report及必要附件；保持現有Private設定。
- [ ] 若另需正式網站上線，再取得獨立的學校Apache部署授權、管理員條件及回復方案；本次不部署。
- [ ] 真實教材公開仍需獨立核准與內容先／HTTP核對／Manifest最後的SOP；本次空Manifest不變。

完成檔案交付後停止等待教師。不要把已通過的RC／Windows驗收、PR #6合併或此技術清單，解讀成Tag／GitHub Release／部署／教材公開的自動許可。
