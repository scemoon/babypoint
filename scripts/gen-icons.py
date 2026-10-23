#!/usr/bin/env python3
"""小步成长 — 图标资源生成器

从 WXML 中实际引用的 <icon name=... color=...> 组合出发，生成所有需要的
PNG 变体（保留原图标字形的 alpha 通道，只替换 RGB），因此不会出现
"页面引用了某个颜色但资源不存在 → 图标静默消失" 的情况。

用法:
  python3 scripts/gen-icons.py          # 只补缺失的变体
  python3 scripts/gen-icons.py --check  # 只检查，不写入（CI 用）
"""
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MP = ROOT / 'miniprogram'
ICON_DIR = MP / 'assets' / 'icons'
SOURCE_COLOR = '193642'  # 原始图标色，用作 alpha 模板


def hexify(color):
    """把 #RRGGBB / #RGB / rgba(r,g,b,a) 归一成 6 位小写 hex（与 icon.js 一致）。"""
    c = color.strip().lower()
    m = re.match(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)', c)
    if m:
        return ''.join(f'{max(0, min(255, round(float(m.group(i))))):02x}' for i in (1, 2, 3))
    h = c.lstrip('#')
    if len(h) == 3:
        return ''.join(ch * 2 for ch in h)
    return h if re.fullmatch(r'[0-9a-f]{6}', h) else ''


def branches(attr):
    """从一个属性值里取出所有可能的字面量取值。

    三元表达式 `{{cond ? 'a' : 'b'}}` 里，条件部分 `type === 'task'` 的
    'task' 是**比较值而不是取值**，必须排除，否则会去生成并不存在的图标。
    因此只取 `?` 之后的结果分支。
    """
    if '{{' not in attr:
        return [attr]
    body = attr[attr.index('{{') + 2:]
    body = body[:body.index('}}')] if '}}' in body else body
    parts = body.split('?', 1)
    result = parts[1] if len(parts) == 2 else parts[0]
    found = re.findall(r"'([^']*)'", result)
    return found or []


def collect():
    """扫描 WXML，找出所有可能用到的 (图标名, 颜色) 组合。

    动态绑定（{{cond ? 'a' : 'b'}}）无法静态确定配对关系，因此采取保守策略：
    对每个 <icon>，把它 name/color 属性里所有**结果分支**取值做笛卡尔积。
    多生成几个用不到的 PNG 成本极低，而漏生成会让图标在真机上静默消失。
    """
    needed, dynamic = set(), 0
    for wxml in MP.rglob('*.wxml'):
        src = wxml.read_text(encoding='utf-8')
        for m in re.finditer(r'<icon\b[^>]*>', src):
            tag = m.group(0)
            nm = re.search(r'\bname="([^"]*)"', tag)
            co = re.search(r'\bcolor="([^"]*)"', tag)
            name_attr = nm.group(1) if nm else 'star'
            color_attr = co.group(1) if co else '#14343D'
            has_dyn = '{{' in name_attr or '{{' in color_attr
            if has_dyn:
                dynamic += 1

            names = [n for n in branches(name_attr) if n and '{{' not in n]
            colors = [c for c in branches(color_attr) if c and '{{' not in c]

            for n in names:
                for c in colors:
                    key = hexify(c)
                    if key and n and '{{' not in n:
                        needed.add((n, key))
    return needed, dynamic


def tint(src, dst, color):
    im = Image.open(src).convert('RGBA')
    rgb = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            px[x, y] = rgb[:3] + (px[x, y][3],)
    im.save(dst)


def main():
    check_only = '--check' in sys.argv
    needed, dynamic = collect()
    print(f'WXML 引用到 {len(needed)} 种 (图标, 颜色) 组合，动态绑定 {dynamic} 处')

    # 顺带覆盖设计令牌里出现的颜色（tabBar 等非 WXML 引用）
    for extra in [('home', '4a6469'), ('list', '4a6469'), ('check', '4a6469'),
                  ('gift', '4a6469'), ('user', '4a6469')]:
        needed.add(extra)

    missing, created, no_source = [], [], []
    for name, key in sorted(needed):
        dst = ICON_DIR / f'{name}-{key}.png'
        if dst.exists():
            continue
        src = ICON_DIR / f'{name}-{SOURCE_COLOR}.png'
        if not src.exists():
            no_source.append(f'{name} (无原始图标 {src.name})')
            continue
        missing.append(dst.name)
        if not check_only:
            tint(src, dst, key)
            created.append(dst.name)

    if no_source:
        print('\n以下图标缺少原始模板，无法生成变体:')
        for n in no_source:
            print('  ✗', n)

    if check_only:
        if missing:
            print(f'\n缺失 {len(missing)} 个图标变体（需运行 python3 scripts/gen-icons.py）:')
            for m in missing:
                print('  ✗', m)
            return 1
        print('\n全部图标变体齐备 ✓')
        return 0

    print(f'\n新生成 {len(created)} 个:')
    for c in created:
        print('  +', c)
    total = len(list(ICON_DIR.glob('*.png')))
    print(f'图标资源总数: {total}')
    return 1 if no_source else 0


if __name__ == '__main__':
    sys.exit(main())
