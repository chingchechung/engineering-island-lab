# Windows：安全重新取出原始參考檔

Phase4 EOL修正已經教師Windows驗收並合併；本文件保留相同備份／重取方法，預設更新本輪Phase5分支。若重演歷史Phase4才把下方 `$validationBranch` 改為 `feature/phase-4-quiz-integration`。

教師已在 Windows11 確認 `core.autocrlf=true` 將原始參考檔取成 CRLF，導致逐 byte SHA256 不符。以 `js/assignment-rules.js` 為例：

- CRLF：`792d7191229f198305c259c526e29d3ae3be744e29e0db0054651be295ae05b2`
- Git 原始 LF／既有預期：`ff057feb3cf4d229b11280931f49cd46a76303f2545ec9e319f51cd537b8d924`

根目錄 `.gitattributes` 現在對 `test/fixtures/legacy/reference/**` 設 `-text`，直接保留 Git blob bytes；對 `src/legacy-assignment/*.js` 設 `text eol=lf`。規則只涵蓋這些檔案。14個預期SHA256、原始參考內容、移植驗證器及判答演算法均不變。

新 clone 會自動採用屬性。既有 checkout 的 CRLF 檔案在 pull 屬性後可能仍留在磁碟，須重新取出。以下 PowerShell 指令保留 Git 全域設定，先備份 tracked／untracked 個人修改，再只重新取出指定的已追蹤檔案。

## 既有 checkout 的安全更新

在 `engineering-island-lab` 根目錄，先停止 Vite（Ctrl+C），關閉正在編輯這些參考檔案的工具後執行。stash 會暫時收起 tracked／untracked 修改並保留備份；ignored 檔案不包含在此次備份，也不在下方重取清單：

```powershell
git status --short
git stash push --include-untracked -m "Before reference byte checkout refresh"
if ($LASTEXITCODE -ne 0) { throw "備份失敗，停止更新。" }

$validationBranch = 'feature/phase-5-release-readiness'
git fetch origin "refs/heads/${validationBranch}:refs/remotes/origin/${validationBranch}"
if ($LASTEXITCODE -ne 0) { throw "Fetch 失敗，停止更新。" }
git switch $validationBranch
if ($LASTEXITCODE -ne 0) { throw "切換分支失敗，停止更新。" }
git pull --ff-only origin $validationBranch
if ($LASTEXITCODE -ne 0) { throw "Pull 失敗，停止更新。" }

$referencePaths = @(git ls-files -- 'test/fixtures/legacy/reference/' 'src/legacy-assignment/*.js')
if ($LASTEXITCODE -ne 0 -or $referencePaths.Count -eq 0) {
    throw "無法取得指定檔案清單，停止重新取出。"
}

# 移除這些已備份的 tracked 檔，確保 Git 真正依新屬性重新寫入。
$referencePaths | ForEach-Object {
    Remove-Item -LiteralPath $_ -Force -ErrorAction Stop
}
git restore --source=HEAD --staged --worktree -- $referencePaths
if ($LASTEXITCODE -ne 0) { throw "重新取出失敗，請先恢復上述檔案，停止測試。" }

git status --short
git ls-files --eol -- 'test/fixtures/legacy/reference/' 'src/legacy-assignment/*.js'
node --test test/legacy-checkout.test.js test/quiz-contract.test.js
if ($LASTEXITCODE -ne 0) { throw "原始 bytes／checkout 回歸未通過。" }
npm test
```

`--staged --worktree` 只把清單內的索引及磁碟檔案還原到 HEAD，並清除舊 checkout 留下的索引狀態；此前已用 stash 備份個人修改。清單也包含 reference 目錄內的本地 Python package marker，原始SHA256清單仍是14份檔案。重取步驟只處理這份清單，其他個人變更可在驗證後從 stash 選擇性還原。

預期 `--eol` 顯示參考檔 `i/lf w/lf attr/-text`，移植JS `i/lf w/lf attr/text eol=lf`。若移除後的 restore 中斷，可再次執行相同的 `git restore` 指令恢復這份清單；先恢復再測試。

若本次有個人修改，stash 會保留備份；`No local changes to save` 表示本次沒有新備份。用 `git stash list` 及 `git stash show --include-untracked --stat 'stash@{0}'` 辨識本次備份。驗證完成後，選擇性還原與此修正無關的個人修改；保留備份，避免直接 pop 將舊參考檔或其修改一起套回。

## 完整驗收

```powershell
npm test
npm run build
npm run test:smoke
npm run test:browser
npm run validate:content
node scripts/legacy-parity.mjs
```

跨語言 parity 另需 Python3 與測試用 jsonschema，詳見 [ASSIGNMENT_COMPATIBILITY](ASSIGNMENT_COMPATIBILITY.md)。`npm test` 的 checkout 回歸只需要 Node 與 Git。

新增測試在臨時 Git repository 中以 `core.autocrlf=true` 實際 clone，先重現教師提供的 CRLF hash，再驗證新 clone 及既有 checkout 更新流程的全部14個原始hash、兩份移植JS的LF、一般文字仍會轉CRLF，以及 tracked／untracked 個人修改仍可從stash取回。測試僅設定臨時repository，不更動本專案或全域Git config，也不在hash斷言前轉換換行。

Phase4雲端在Linux Git上執行同一 `core.autocrlf=true` checkout路徑；教師後續已確認Windows修正驗收、PR #5合併，原始證據保留於 [Phase4驗收](PHASE_4_ACCEPTANCE.md)。Phase5再次保留並執行全部14hash／checkout回歸，見 [Phase5驗收](PHASE_5_ACCEPTANCE.md)；本輪只交RC與Draft PR #6，不合併、部署或進下一階段。
