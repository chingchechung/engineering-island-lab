# Phase 2 最後一輪場景生命感 — 授權與範圍

2026-10-29，教師確認 Draft PR #2 前版的 Windows 11 島名、題目 NPC 自主漫遊與點擊停止、12／15 島硬體 GPU 流暢已通過；沒有提供數字效能紀錄。本輪仍在原 feature/phase-2-full-archipelago 分支、更新同一個 Draft PR #2。

- 柔和且持續的背景海面動畫，符合 Low-Poly 童話模型風格，低成本，不影響島／橋／標籤／互動。
- 外圍背景海域 3–5 隻大型療癒鯨魚，巡迴並偶爾噴水，不進群島內擁擠水道，完全不可互動。
- 全世界約 3–8 位較小、無 Q 標的 visitors／wanderers，完全不可互動，只在已開放島出現。可在島上漫遊、沿橋拜訪其他開放島、停留並返回；不得進入鎖定島、建築、海裡或橋外。
- 使用可維護的簡化圖狀路網／路點，無完整遊戲級導航或物理，不影響原題目 NPC pause/resume、Modal 或射線點擊。
- 保留每島三隻特色動物、鎖定柵欄／鎖牌、Video-only 無題目 NPC，正式 JSON／Manifest／教材不變。
- 平行工作：A 海面／鯨魚，B 背景小人巡遊，Main 整合／避讓／測試／截圖／效能。各自檔案所有權與共用介面先凍結於 LIFE_INTERFACES.md。
- 執行單元、build、smoke、瀏覽器回歸，報告 12／15 總覽、聚焦、Quiz／Video-only。軟體 GPU 與可得的實體 GPU 資料分開，不能推測硬體數字。
- 更新 README、PHASE_2_ACCEPTANCE、測試／效能與代表性截圖。完成後停止等待教師再次驗收；不得 Merge、Tag、Release、部署或進 Phase 3。
