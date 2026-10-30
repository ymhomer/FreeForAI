#!/usr/bin/env python3
"""Content-address runtime assets; retain previous published assets for cached clients."""
import hashlib,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'src' if (ROOT/'src/index.html').is_file() else ROOT

def main():
    target=SITE/'assets';target.mkdir(exist_ok=True);html=(SITE/'index.html').read_text()
    if 'data-worker=' in html:
        names=['styles.css','script.js','sprout-runtime.js','sprout-worker.js','sprout/config.json','sprout/weights.b64']
    else:names=['styles.css','script.js','engine.js','model.js']
    for name in names:
        data=(SITE/name).read_bytes();digest=hashlib.sha256(data).hexdigest()[:12]
        source=Path(name);stem='sprout-'+source.stem if name.startswith('sprout/') else 'chat-'+source.stem
        filename=f'{stem}.{digest}{source.suffix}';dest=target/filename
        if dest.exists() and dest.read_bytes()!=data:raise ValueError('Asset hash collision')
        dest.write_bytes(data)
        old=rf'(?:{re.escape(name)}|assets/{re.escape(stem)}\.[a-f0-9]+{re.escape(source.suffix)})'
        html,count=re.subn(rf'((?:src|href|data-worker|data-runtime|data-config|data-weights)=")({old})(")',rf'\g<1>assets/{filename}\3',html)
        if count!=1:raise ValueError(f'Expected exactly one reference for {name}: {count}')
        print(f'{name} -> assets/{filename}')
    (SITE/'index.html').write_text(html)
if __name__=='__main__':main()
