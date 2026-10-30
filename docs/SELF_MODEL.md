# 小芽 Sprout-Char：自建生成模型 v0.1

使用者明確要求「你自創」，因此撤回採用 Qwen 預訓練模型的方案。此版的網路、訓練程式與 JavaScript 推論均為本項目自行實作，從隨機權重開始訓練。不是把現成聊天模型換名字，也不是原先的 TF-IDF 回答配對。

## 實際完成什麼

- 條件式前饋字元語言模型（conditional MLP）：688 字元／控制符號，問題嵌入 48 維、前文字元嵌入 16 維、24 字生成視窗、192 個 tanh 隱藏單元。
- 問題最後 96 字的可學習嵌入聚合為條件，與已生成的前 24 字一起預測下一個字。softmax 訓練，瀏覽器以 greedy 選字直到 EOS 或 180 字上限。
- 共 259,952 個可訓練參數；603 筆助手編寫的公開訓練問答；11,000 次 minibatch Adam 更新。沒有下載既有模型權重、呼叫教師模型 API 或使用訪客聊天紀錄。
- 目前是一般神經機率語言模型思路的自行實作，不主張發明新的學術演算法，也不是 Transformer／通用 LLM。標準方法參考 Bengio 等人的神經機率語言模型論文。
- 模型原始 Float32 權重為 1,039,808 bytes，約 0.99 MiB；直接在 Web Worker 中 CPU 推論，不需 WebGPU、WASM、外部 CDN、API Key 或後端。
- 執行時只有數字權重、詞表、矩陣運算與逐字生成；沒有答案字串表、問題關鍵字比對、相似度檢索或把生成結果替換成硬編答案。

「語料由助手編寫」表示 AI 助手協助提供合成文字，不宣稱完全沒有教師知識來源；此流程沒有另調教師 API、蒸餾 logits 或載入其權重。這是基於小量合成資料的從零訓練實驗。

## 檔案與重建

- self-model/create_data.py：從先前公開助手語料的問法，以及本輪編寫的短答、算式和不確定例子，重建 self-model/data.json。
- self-model/train.py：NumPy 矩陣計算、自寫 forward/backward、Adam、數值梯度檢查、隨機初始化、匯出。
- self-model/evaluate.py：記錄 22 個開發問題的實際輸出，包含已知失敗。不是盲測，不報虛構準確率。
- sprout/config.json / weights.b64：字表、張量配置、訓練資訊、語料／權重 SHA-256。
- sprout-runtime.js：自行實作的 JavaScript 推論；sprout-worker.js：同源下載、權重校驗、生成／中止、長度與時間限制。
- scripts/build_assets.py：對入口及模型採內容雜湊檔名，保留舊資源，避免快取混版。

隔離 venv 只安裝 NumPy 2.4.2，沒有 PyTorch 或預訓練 SDK。範例（一般儲存庫根目錄與 lab 可用）：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install numpy==2.4.2
python3 self-model/create_data.py
OPENBLAS_NUM_THREADS=1 .venv/bin/python self-model/train.py --steps 11000
OPENBLAS_NUM_THREADS=1 .venv/bin/python self-model/evaluate.py
python3 scripts/build_assets.py
node tests/sprout.test.cjs
```

Windows 對應使用 .venv\Scripts\python.exe；訓練腳本有設定單一 BLAS 執行緒，不需要命令列環境前綴。匯出支援 lab src 與 GitHub 根目錄。checkpoint 放 artifacts/model-training，不公開提交。

## 已知能力限制（不能省略）

它很容易記住語料句型，並常生成與訓練短答相同的文字；這是小模型過度擬合的表現，不能把「逐字生成」宣稱成已具備通用推理或自由聊天能力。

目前沒有可靠的多輪記憶；畫面保留對話，但模型只讀取當則問題。輸入只採最後 96 個 Unicode 字元。問題聚合沒有順序資訊，因此可能混淆主客體或多位數。未知字映射成 UNK，不保證正確拒答。

開發檢查中：1+1、五角星／恆星區別、簡單程式概念有合理輸出；但「19+25是多少」錯答成「5+9=14」，「我剛才叫什麼名字」錯誤介紹自己的名字，pip 相關新問法也可能回答泛用除錯建議。訓練 loss 約 0.05 是記憶訓練資料的指標，不是知識／推理正確率。完整實際輸出見 SPROUT_EVALUATION.json。

## 隱私與發佈

只從本網站下載模型；對話不自動上傳、保存或訓練。匯出由使用者點擊。網站存取紀錄仍由 GitHub Pages 管理。模型權重在同源 worker 中做 SHA-256 核對；CSP 僅允許同源資源與 worker，不依賴外部推論。

使用者已授權直接推送並持續修復此網站；本輪驗證後可推 main。保留舊頁 Git 歷史與受控備份，不刪其他項目、服務或倉庫設定。開發工具／checkpoint／主機函式庫不推送。

## 文獻

Bengio, Ducharme, Vincent, Jauvin (2003), A Neural Probabilistic Language Model：https://www.jmlr.org/papers/v3/bengio03a.html 。該文提供以神經網路學習條件機率／字詞嵌入的基礎；本模型是自行編寫的微型條件式實驗，並非照搬其訓練權重。
