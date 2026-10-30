#!/usr/bin/env python3
"""Publish content-addressed assets; keep old files for cached HTML clients."""
import hashlib
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'src' if (ROOT / 'src/index.html').is_file() else ROOT

def main():
    target = SITE / 'assets'
    target.mkdir(exist_ok=True)
    html = (SITE / 'index.html').read_text()
    for name in ('styles.css', 'script.js', 'engine.js', 'model.js'):
        content = (SITE / name).read_bytes()
        digest = hashlib.sha256(content).hexdigest()[:12]
        source = Path(name)
        filename = f'chat-{source.stem}.{digest}{source.suffix}'
        destination = target / filename
        if destination.exists() and destination.read_bytes() != content:
            raise ValueError('Asset hash collision')
        destination.write_bytes(content)
        extension = re.escape(source.suffix)
        old = rf'(?:{re.escape(name)}|assets/chat-{re.escape(source.stem)}\.[a-f0-9]+{extension})'
        html, count = re.subn(rf'((?:src|href)=")({old})(")', rf'\g<1>assets/{filename}\3', html)
        if count != 1: raise ValueError(f'Expected exactly one reference for {name}')
        print(f'{name} -> assets/{filename}')
    (SITE / 'index.html').write_text(html)

if __name__ == '__main__': main()
