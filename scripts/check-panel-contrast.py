#!/usr/bin/env python3
"""宝贝积分 — 渐变面板对比度「合成后」实测

verify-design.py 断言的是「令牌色 vs 令牌色」。但面板实际是渐变 + 半透明文字，
真正决定可读性的是渲染器把 alpha 合成之后的那一个像素。本脚本模拟渲染器的
合成过程，在渐变上的多个位置取样，得到整块面板上的最差对比度。

用法: python3 scripts/check-panel-contrast.py
退出码 0 = 面板上所有位置的文字都达标
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ['--grad-water', '--grad-mint']


def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = (srgb(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def hx(c):
    return '#%02X%02X%02X' % tuple(round(v) for v in c)


def parse_color(v):
    v = v.strip()
    m = re.match(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)', v)
    if m:
        rgb = tuple(float(m.group(i)) for i in (1, 2, 3))
        a = float(m.group(4)) if m.group(4) is not None else 1.0
        return rgb, a
    h = v.lstrip('#')
    if len(h) == 3:
        h = ''.join(ch * 2 for ch in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)), 1.0


def over(fg, a, bg):
    """渲染器的 alpha 合成：fg 以不透明度 a 覆盖在 bg 上。"""
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3))


def lerp(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def main():
    css = (ROOT / 'miniprogram' / 'app.wxss').read_text(encoding='utf-8')
    block = css[css.index('page {'):]
    block = block[:block.index('\n}')]
    tok = {k: v.strip() for k, v in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', block)}

    def col(name):
        return parse_color(tok[name])[0]

    print('渐变面板「合成后」对比度实测')
    print('=' * 68)
    fails = []
    total = 0

    # 面板上的文字：白字、次级白字、蜜黄大数字
    texts = [
        ('主文字/数字 #FFFFFF', (255, 255, 255), 1.0, 4.5),
        ('次级 on-dark-muted', (255, 255, 255), parse_color(tok['--on-dark-muted'])[1], 4.5),
        ('次级 on-dark-faint', (255, 255, 255), parse_color(tok['--on-dark-faint'])[1], 4.5),
        ('蜜黄大数字 sun', col('--sun'), 1.0, 3.0),
    ]

    for grad_name in CANDIDATES:
        start, end = tok[grad_name].split('var(')[1].split(')')[0], tok[grad_name].split('var(')[2].split(')')[0]
        c0, c1 = col(start), col(end)
        print(f'\n{grad_name}  ({hx(c0)} -> {hx(c1)})')
        for label, fg, alpha, thresh in texts:
            worst, worst_t, worst_bg = 99, 0, None
            # 在渐变 0..1 上均匀取样，找出最差位置（渐变对比度会随位置变化）
            for i in range(21):
                t = i / 20
                bg = lerp(c0, c1, t)
                rendered = over(fg, alpha, bg)
                r = contrast(rendered, bg)
                total += 1
                if r < worst:
                    worst, worst_t, worst_bg = r, t, bg
            ok = worst >= thresh
            if not ok:
                fails.append(f'{grad_name} {label}: 最差 {worst:.2f} @t={worst_t:.2f} (需 {thresh})')
            print(f'  {"PASS" if ok else "FAIL"}  最差 {worst:5.2f} (需 {thresh})  @t={worst_t:.2f}  {label}'
                  f'{"  合成字色 " + hx(over(fg, alpha, worst_bg)) if alpha < 1 else ""}')

    print('\n' + '=' * 68)
    print(f'共取样 {total} 个「渐变位置 × 文字样式」组合')
    if fails:
        print(f'{len(fails)} 项不达标:')
        for f in fails:
            print('  ✗', f)
        return 1
    print('所有位置文字均达标 ✓（含渐变最不利位置）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
