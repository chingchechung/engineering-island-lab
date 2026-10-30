# Phase 2.5 共用介面與平行所有權

基準：最新 main d136c9c（PR #2 已合併）；教師確認 Phase 2 Windows 驗收。原文見 PHASE_2_5_BRIEF.md。分支 feature/phase-2-5-day-night-camera-orbit，唯一新 Draft PR，完成後停止。

## 檔案所有權

- Agent A lighting：只可新增 `src/world/day-night.js`、修改 `src/world/sea-life.js`、新增 `test/day-night.test.js`。
- Agent B orbit：只可修改 `src/camera.js`、`src/interaction.js`、新增 `test/orbit.test.js`。
- Main：main.js、scene.js、ui.js、style.css、index.html、其他測試／瀏覽器／量測腳本、文件、Git／PR。
- Subagents 不修改其他檔案、設定、package／lock、文件或 Git；介面變更先通知 Main。

## Day / Night

`createDayNight({scene, academy, records, seaLife})` 在 world 完成 optimize 後由 Main 呼叫。獨立於 islands，不能改變 framing、拾取或地表導航。回傳 `{root, setMode(mode), update(dt, {view}), snapshot(), dispose()}`。mode day/night，預設 day，1.25 秒平滑過渡。snapshot 報告 mode、blend、窗戶／橋樑／各主題燈飾數量、實際光源及陰影數。Main 先 dispose controller 再 world.dispose。

Agent A 可增加 seaLife `setNightBlend(t)`，保留 update(seconds)、snapshot、巡遊路線／噴水週期；Day 海色精確保留。燈飾使用有限 palette 的 InstancedMesh／合批，不能每燈一draw。至多一個不投影的近景 PointLight，overview 關閉。不改共享材質；自建資源完整釋放；Day 原日光參數精確恢復；不加 Bloom。

## Camera / Gesture

保留 CameraRig constructor/focus/reset/zoom/pan/resize/update。新增 `orbit(dx,dy)`（canvas 像素），公開 azimuth、elevation、azimuthGoal、elevationGoal 供 Main 唯讀 snapshot。水平連續不限圈，垂直25–70度，標準原 offset(8,31,34)。overview 依當前角度與 framingPoints 持續 fit；focus 換島保留角度；reset 平滑回標準方向／取景。保留 zoomGoal、height、target、goal、view。

attachInteraction 維持 pick API：左拖orbit；右拖／Shift左拖pan；單指維持原平移，兩指取消不誤點；wheel zoom。最大位移閾值6px；去而復返不得點擊；Modal blocked 隔離輸入。Pointer capture 僅canvas；CSS2D button不穿透。Main 在 dialog.open 時停止 rig.update，立即凍結既有 easing。

## 整合驗證

Main 審查實際交付及測試後整合。正式 JSON／空Manifest、地貌布局及自主生命系統不變。右上太陽／月亮小按鈕可鍵盤操作。驗180度標牌／Raycasting／pause-resume、Modal隔離、1/12/15 fit、觸控、雙模式、釋放。Phase2基準91/91與build通過；已保存原build供同環境對照。

## 實際交付

兩位均已透過 spawn_agent 同時執行並交付停止。A 新增8項，連同原海面7項全部通過；B新增11項（含Main審查要求的多指取消後外部釋放／新手勢恢復）。Main已檢視WebGL夜景、整合與110/110單元、build、Apache smoke通過；完整瀏覽器／效能證據見驗收文件。Subagents沒有操作Git或改共享檔案。

Main整合補充：attachInteraction回傳新增cancel()，attachLabels各項新增cancelGesture()；document capture處理第二指跨Canvas／CSS2D的取消。聚焦視圖延用arrangeLabels，依Q標、Lecture、島名優先序避讓，細線連回原錨點；dev只讀inspectPick複製action，production無此API。

最終視覺審查補充：窄畫面Night顯示海面邊界，Main延展同一背景平面（仍2tri）並補四角射線測試；B再交付相機深度／far依可見半高與仰角調整，新增第12項測試證明XY構圖不變。相關五檔61/61通過，完整命令另以最終版本執行。
