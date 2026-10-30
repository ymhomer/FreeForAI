# FreeForAI — 一個輕量的聊天實驗

整個入口改為一般聊天＋技術問答，不再載入原星球探索頁面。純 HTML / CSS / JavaScript，沒有付費 API、後端或安裝依賴。

## 能力與限制

- TF-IDF 問答配對模型：24 個主題、204 個範例問法；回答來自助手編寫的公開語料。對話不是生成式推理，也沒有跨訊息語意記憶。
- 涵蓋日常聊天、Python、JavaScript、Git、測試、API、基礎 .NET 與 SQL 等；同一主題可能回覆同一段內容。陌生或模糊問題可能無法辨識；仍可能配錯。
- 這不是蒸餾 LLM、也不是使用使用者私人資料訓練的模型。詞權重從語料計算，主題門檻與關鍵詞限制由維護者設定。
- 不會執行程式、讀檔、即時搜尋或代辦任務。日期取裝置本機時間。
- 對話只放在分頁記憶體，重新整理清空；不使用 localStorage、聊天 API 或分析追蹤。網站主機仍可能有一般存取紀錄。匯出需自行點擊，內容包含使用者文字。

## 使用

在 GitHub Pages 使用儲存庫根目錄作網站入口，沒有建置步驟。放上 index.html、styles.css、script.js、engine.js、model.js，保留 .nojekyll。更新包本身不會發佈，維護者自行確認後提交。

Enter 傳送、Shift+Enter 換行；中文輸入法選字時不傳送。支援新對話（清空前確認）、文字匯出與說明視窗。單則最多 2,000 字，每個分頁最多 100 次問答，之後可匯出再重新開始。

## 重建模型（Python 標準庫）

在完整更新包／儲存庫根目錄：

```sh
python3 scripts/train.py
python3 scripts/build_assets.py
node tests/engine.test.cjs
```

編輯 training/corpus.json 的 questions、answer、anchors 再重建；不要把真實訪客聊天或憑證加入語料。模型可重複建置。若訓練工具偵測到 lab 的 src/index.html，輸出到 src/model.js；一般儲存庫則輸出根目錄 model.js。

26 個不同於語料的問題作開發回歸測試，涵蓋已知主題與範圍外問題；這些例子已用於開發檢查，不是盲測或通用 AI 效能證明。尚未在真實瀏覽器檢查視覺、鍵盤、手機或 GitHub Pages 發佈結果。

## 保留既有倉庫內容

套用本更新包只覆蓋指定頁面及加入相關程式／語料／測試；不刪除 LICENSE、GitHub Issues 或 .github 設定。原有星球頁已另行備份，可回復。

## 資源快取修正

頁面使用 assets/ 下帶 SHA-256 摘要的檔名，防止新版 HTML 搭配舊 styles.css/script.js。每次改動後先訓練（若語料有改）、再執行 scripts/build_assets.py，並提交 index.html 與產生的 assets 檔案。舊檔保留以相容仍快取舊 HTML 的訪客。發佈需上傳 assets 整個目錄。
