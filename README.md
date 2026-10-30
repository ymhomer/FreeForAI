# FreeForAI — 小芽 Sprout-Char

一個自行實作、從隨機權重訓練的微型中文生成模型，在瀏覽器 Web Worker 逐字生成。沒有預訓練權重、外部 AI API 或後端，不再使用 TF-IDF 配對引擎。

## 模型

259,952 個參數，688 個字元／控制符號，603 筆助手編寫的合成問答，11,000 步訓練；條件式 MLP 字元神經語言模型。採標準神經機率語言模型思路，不宣稱發明新的演算法；不是 Transformer，也沒有通用 LLM 的能力。

原始 Float32 權重約 0.99 MiB；為相容 GitHub 寫入工具，以 Base64 文字保存為 weights.b64，傳輸約 1.4 MB，瀏覽器解碼後核對原始權重 SHA-256。問題最後 96 個字的嵌入，加上前 24 個生成字元，預測下一字；greedy 生成最多 180 字。執行時沒有關鍵字答案表、檢索或答案替換。模型可能生成和訓練短答相同的句型，且容易過度擬合。

**限制：沒有可靠多輪記憶；未知題、複雜算式、主客體常會錯。** 開發測試中「19+25」曾錯答成「5+9=14」，問使用者名字可能答自己名字。請勿把低訓練 loss 當成推理正確率。實際輸出見 docs/SPROUT_EVALUATION.json。

## 操作與資料

頁面會自動載入約 1.4 MB 的同源模型，SHA-256 核對後才能傳送。Enter 傳送、Shift+Enter 換行，IME 選字不傳送。支援停止生成、新對話、文字匯出、失敗重試。

對話只在分頁記憶體，重整即清空；不自動上傳或收集訓練資料。網站主機可能有一般存取紀錄。匯出檔包含訊息，請自行保管。不會讀檔、上網搜尋或執行使用者程式。

## 重建與測試

訓練僅需 Python + NumPy 2.4.2；網站執行無第三方套件：

```sh
python3 self-model/create_data.py
python3 self-model/train.py --steps 11000
python3 self-model/evaluate.py
python3 scripts/build_assets.py
node tests/sprout.test.cjs
```

建議在專用 venv 裝 NumPy，詳見 docs/SELF_MODEL.md。舊 scripts/train.py / training/corpus.json 與 TF-IDF 檔案只為歷史及建立問法來源保留，不是現在執行的模型；舊資源保留供快取舊 HTML 使用。

GitHub Pages 根目錄直接放 index.html 及 assets/，不需建置服務。每次更新跑 build_assets.py，提交新入口和雜湊檔；不要刪除還可能被快取頁面引用的資源。模型 weights.b64、config、推論與 worker 必須同版本。

## 開發驗證

數值梯度檢查；22 個開發問題 Python／JS greedy 推論一致；權重雜湊、長度限制與資源版本檢查。這不是盲測或通用智能評測。真實瀏覽器及部署結果另記在 docs；手機模擬不等於真機驗證。
