# Apache 靜態部署與快取

本輪只驗證本機 RC，不上傳學校。正式上線須在教師完成 Windows／RC 驗收並**另行明確授權**後執行。學校的 VirtualHost、UserDir、權限、TLS、AllowOverride 及代理快取尚未實測。

## 網站目錄

建置機需要 Node 24／npm 11；Apache 只需提供靜態檔案，沒有 Node 服務、資料庫、API、登入或 Service Worker。`vite.config.js` 保持 `base: './'`。RC ZIP 解壓後直接是網站內容，沒有外層 `dist/`。

`/~wildwolf/engineering-island-lab/` 是測試範例，並未寫死於產品。也測試另一個巢狀目錄。實際路徑由管理員指定，目錄 URL 應以 `/` 結尾；Apache `mod_dir` 可將不帶斜線的目錄導向正確入口。沒有前端路由，不需要 SPA Rewrite；不應將不存在的 JSON／JS 導回 index.html。

核准後的步驟：

1. 備份目前完整網站及其 Manifest，保留於**公開目錄之外**。先核對 ZIP SHA256 與逐檔 inventory。
2. 解壓至私人 staging，審查正式 config、Manifest 及所有資料；RC 預設仍是數位電子學／12／quiz／空清單，不含任何正式教材。
3. 管理員確認 staging 內容的讀取權限、MIME／快取設定，並以完整目錄原子切換網站（同一檔案系統 rename 或經管理員核准的版本目錄切換）。不要把包含草稿、備份的父目錄公開。
4. 若只能逐檔上傳，先放新雜湊 assets，再換 index；每週教材依 [教師 SOP](TEACHER_OPERATIONS.md) **內容先、HTTP 確認後、Manifest 最後**。不要先刪仍可能被開啟頁面引用的舊雜湊資源；在私人備份及規劃的快取保留期後清理。
5. 真實學校網址直接進入及重新整理，確認所有必要資源成功、無 CORS／Console 錯誤、缺檔真 404、Video-only 不載題庫；失敗就回復上一個完整一致版本。

不要把原始 Repository、node_modules、.git、測試、截圖、ZIP、inventory、雲端紀錄或未發布教材放進 DocumentRoot。

## HTTP 與快取原則

| 檔案 | Content-Type | Cache-Control |
|---|---|---|
| index.html | text/html | no-cache, max-age=0, must-revalidate |
| course-config.json、Manifest、Lecture／Quiz JSON | application/json | no-cache, max-age=0, must-revalidate |
| assets/*-內容雜湊.js | text/javascript（application/javascript 亦可） | public, max-age=31536000, immutable |
| assets/*-內容雜湊.css | text/css | public, max-age=31536000, immutable |
| favicon.svg | image/svg+xml | 使用管理員的一般靜態快取政策 |

`no-cache` 允許儲存但每次使用前需重新驗證；ETag／Last-Modified 正確時可回 304。刷新後讀到新 Manifest 即符合需求，已開啟頁面的教材／作答記憶體不熱更新。更新 JSON 時應更新 ETag／mtime；若同秒同大小更新且伺服器 ETag 粒度不足，管理員可對 JSON 採 `no-store` 或檢查 ETag 策略。CDN／反向代理也必須尊重此政策；本輪未驗證學校代理。

建議由管理員在 VirtualHost 對**實際網站目錄**設定（路徑為佔位）：

```apache
<Directory "/actual/document-root/engineering-island-lab">
    Require all granted
    Options -Indexes -MultiViews
    AllowOverride None
    DirectoryIndex index.html
    AddType text/javascript .js
    AddType text/css .css
    AddType application/json .json
    AddType image/svg+xml .svg
    <FilesMatch "\.(html|json)$">
        Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
    </FilesMatch>
    <FilesMatch "-[A-Za-z0-9_-]{8,}\.(js|css)$">
        Header always set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</Directory>
```

前置條件：Apache 2.4、mod_dir／mod_mime／mod_headers、該目錄可讀，且上層設定沒有 SPA fallback／衝突的快取或 Content-Type。由管理員執行 configtest 與核准的 reload；本專案腳本不修改系統 Apache。

### 選用 .htaccess

RC **不預置 .htaccess**。若學校允許覆寫，管理員可核准只把上述 `Options`、`DirectoryIndex`、`AddType` 與兩個 `FilesMatch`／`Header` 區塊放入該網站 `.htaccess`；不放 `<Directory>`、`Require`、`AllowOverride` 或全域 `LoadModule`，既有站台存取權限仍由管理員處理。管理員需允許 `FileInfo`（Header／AddType）、`Indexes`（DirectoryIndex）及 `Options` 覆寫，並載入相關模組。不允許時請改 VirtualHost 設定，不要反覆上傳會產生 HTTP 500 的 .htaccess。也可由管理員只允許所需 AllowOverrideList 指令。

不可複製其他 SPA 的 RewriteRule；缺檔返回 404，並且回應內容不能假裝是成功的課程 JSON。HTML 的 404 錯誤頁本身可以存在，重點是狀態必須 404。

## 本機驗證與學校驗收的區別

```powershell
npm ci
npm run build
npm run check:release
npm run test:smoke
npm run test:rc
```

`test:smoke`／預設 `test:rc` 使用嚴格 Node 靜態 HTTP **模擬**，只在測試機執行；不表示 Apache 需要 Node。

本輪另以 Linux Docker 本機 socket、固定 httpd 映像執行真正 Apache，僅公開 127.0.0.1 臨時埠：

```bash
npm run test:apache
node scripts/release-browser.js --apache --root dist
```

這兩項選用檢查需要可用的本機 Docker daemon 及指定映像；測試腳本固定使用 `/var/run/docker.sock`，不使用遠端 Docker context，不操作學校。Windows 教師沒有 Docker 可照下述實際站台檢查，不需安裝伺服器 Node。

本機 Apache 的完整三段 smoke 及瀏覽器結果見 [Phase5驗收](PHASE_5_ACCEPTANCE.md)。歷史 Phase4 的「Apache smoke」使用 Vite preview，本輪已精確改分為 Node 模擬與真正 Apache，兩者均不等於學校部署成功。

取得授權後，Windows Chrome／Edge F12 Network：重新整理兩次，核對 index／config／Manifest／Lecture／Quiz 的 Response Headers；重新發布測試單元後再刷新應顯示新清單。請求不存在的 `assignments/S99.json` 應顯示 404。檢查 Module/CSS/SVG 的 MIME、Console 無錯誤；用 Video-only 課程設定測試沒有任何題庫 HTTP。所有內部資源與入口同源；YouTube／Form 是使用者主動開啟的外連，不需要 CORS fetch。
