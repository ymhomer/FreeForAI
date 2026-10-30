#!/usr/bin/env python3
"""Development evaluation, not a blind benchmark. No test queries added automatically to training."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
import json,base64
from pathlib import Path
import numpy as np
from train import generate
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'src' if (ROOT/'src/index.html').is_file() else ROOT
config=json.loads((SITE/'sprout/config.json').read_text());raw=np.frombuffer(base64.b64decode((SITE/'sprout/weights.b64').read_text()),dtype='<f4')
p={n:raw[s['offset']:s['offset']+s['length']].reshape(s['shape']) for n,s in config['tensors'].items()}
table={c:i for i,c in enumerate(config['vocab'])};train={r['q'] for r in json.loads((ROOT/'self-model/data.json').read_text())}
queries=[
('你好呀，想跟你聊聊','chat'),('請問一加一等於多少？','arithmetic'),('1+1等於幾？','arithmetic'),
('星星有幾個角？','star'),('天空中的星星真的有尖角嗎','star'),('我今天真的好累喔','empathy'),
('什麼是JavaScript','technical'),('我想學Python','technical'),('pip 安裝後仍然沒有模組怎麼辦','technical'),
('如何用 Git 保存版本','technical'),('你是用預訓練權重嗎','origin'),('你會保存我的對話嗎','privacy'),
('2+7等於多少','arithmetic'),('9+8等於幾','arithmetic'),('19+25是多少','outside-training-arithmetic'),
('量子糾纏是什麼','outside-scope'),('伽羅瓦理論的基本定理怎麼證明','outside-scope'),
('請解釋光合作用','outside-scope'),('我叫阿明，你記住了嗎','memory-limitation'),
('我剛才叫什麼名字','memory-limitation'),('你喜歡散步嗎','small-talk'),('今天天氣好嗎','live-data-limitation')]
results=[]
for q,kind in queries:
 a=generate(p,table,q);results.append({'question':q,'category':kind,'exact_training_question':q in train,'output':a})
report={'note':'Development prompts, inspected during implementation. Not blind accuracy; no claim of factual correctness or robust generalization.',
'config':{k:config[k] for k in ['name','parameters','steps','trainLoss','weightsSha256']},'results':results}
(ROOT/'docs/SPROUT_EVALUATION.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
