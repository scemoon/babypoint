#!/usr/bin/env python3
"""宝贝积分 — 设计系统验证脚本

三项断言（全部为可机器判定的硬断言，不做"看起来没问题"的推断）：
  1. 对比度：所有「文字色 × 底色」组合达到 WCAG 阈值（小字 >=4.5，大字/徽标 >=3.0）
  2. 图标资源：WXML 中每个 <icon color=...> 都指向真实存在的 PNG
  3. 语法：所有 WXSS 括号平衡、令牌引用已定义、WXML 标签配对、JSON 可解析

用法: python3 scripts/verify-design.py
退出码 0 = 全部通过
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MP = ROOT / 'miniprogram'
FAILS = []
CHECKS = [0]


def check(ok, label, detail=''):
    CHECKS[0] += 1
    if not ok:
        FAILS.append(f'{label}: {detail}')
    return ok


# ---------------------------------------------------------------- 颜色工具
def _srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(hex6):
    h = hex6.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _srgb(r) + 0.7152 * _srgb(g) + 0.0722 * _srgb(b)


def contrast(fg, bg):
    """支持 #RRGGBB / #RGB / rgba(r,g,b,a)；半透明前景按 bg 合成。"""
    def parse(c):
        c = c.strip()
        m = re.match(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)', c)
        if m:
            r, g, b = (float(m.group(i)) for i in (1, 2, 3))
            a = float(m.group(4)) if m.group(4) is not None else 1.0
            return (r, g, b, a)
        h = c.lstrip('#')
        if len(h) == 3:
            h = ''.join(ch * 2 for ch in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)

    fr, fg_, fb, fa = parse(fg)
    br, bg_, bb, _ = parse(bg)
    # 半透明前景与底色合成，得到实际呈现色
    fr = fr * fa + br * (1 - fa)
    fg_ = fg_ * fa + bg_ * (1 - fa)
    fb = fb * fa + bb * (1 - fa)
    l1, l2 = sorted([lum('%02X%02X%02X' % (round(fr), round(fg_), round(fb))), lum(bg)], reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def read_tokens():
    """从 app.wxss 的 page{} 中提取令牌 -> 值。

    注意：必须保留非颜色令牌（圆角/阴影/渐变），否则「引用了未定义的令牌」
    检查会把全部尺寸令牌误报为缺失。
    """
    css = (MP / 'app.wxss').read_text(encoding='utf-8')
    block = css[css.index('page {'):]
    block = block[:block.index('\n}')]
    tokens = {}
    for name, val in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', block):
        tokens[name] = val.strip()
    return tokens


def color_tokens(tokens):
    """只保留可直接参与对比度计算的令牌（纯色 / rgba）。"""
    return {k: v for k, v in tokens.items()
            if v.startswith('#') or v.startswith('rgb')}


# ---------------------------------------------------------------- 断言 1：对比度
# (描述, 前景, 背景, 阈值)  —— 阈值 4.5 = 正文/小字；3.0 = 大数字/徽标/disabled
CONTRAST_CASES = [
    # 正文与小字
    ('正文 ink 于白卡',              '--ink', '--paper', 4.5),
    ('正文 ink 于页底',              '--ink', '--mist', 4.5),
    ('次级 muted 于白卡',            '--muted', '--paper', 4.5),
    ('次级 muted 于页底',            '--muted', '--mist', 4.5),
    ('极弱 hint(占位符) 于白卡',      '--hint', '--paper', 4.5),
    ('极弱 hint 于页底',             '--hint', '--mist', 4.5),
    ('表单标签 label 于白卡',         '--label', '--paper', 4.5),
    # 浅底上的有色文字（原实现全部不达标）
    ('积分文字 gold-text 于 soft-lime', '--gold-text', '--soft-lime', 4.5),
    ('珊瑚文字 coral-text 于 soft-coral', '--coral-text', '--soft-coral', 4.5),
    ('青文字 water-lo 于 soft-water',  '--water-lo', '--soft-water', 4.5),
    ('错误文字 error-text 于 soft-coral', '--error-text', '--soft-coral', 4.5),
    ('青文字 water-lo 于白卡',        '--water-lo', '--paper', 4.5),
    ('珊瑚文字 coral-text 于白卡',    '--coral-text', '--paper', 4.5),
    # 面板上的文字（明亮渐变面板）
    ('面板白字 于 water 端',          '#FFFFFF', '--water', 4.5),
    ('面板白字 于 water-bright 端',   '#FFFFFF', '--water-bright', 4.5),
    ('面板次级 on-dark-faint 于 water', '--on-dark-faint', '--water', 4.5),
    ('面板次级 on-dark-faint 于 bright', '--on-dark-faint', '--water-bright', 4.5),
    ('面板常规 on-dark-muted 于 water', '--on-dark-muted', '--water', 4.5),
    ('面板白字 于 mint 端',           '#FFFFFF', '--mint', 4.5),
    ('面板白字 于 mint-bright 端',    '#FFFFFF', '--mint-bright', 4.5),
    ('面板次级 on-dark-faint 于 mint', '--on-dark-faint', '--mint', 4.5),
    # 墨字于暖色面板
    ('墨字 于 lime',                 '--ink', '--lime', 4.5),
    ('墨字 于 sun',                  '--ink', '--sun', 4.5),
    ('墨字 于 lime-deep',            '--ink', '--lime-deep', 4.5),
    ('墨字 于 soft-water 面板',       '--ink', '--soft-water', 4.5),
    # 面板上的浅色文字（原先这些小字沿用深色令牌，压在亮渐变上只有 1.00~1.03:1）
    ('面板大数字 sun 于 water 端',    '--sun', '--water', 3.0),
    ('面板大数字 sun 于 mint 端',     '--sun', '--mint', 3.0),
    ('首页主卡片 kicker 于 lime',     'rgba(20,52,61,.72)', '--lime', 4.5),
    # 实色按钮/徽标（大数字或组件边界，阈值 3.0）
    ('白字 于 water 实色按钮',        '#FFFFFF', '--water', 3.0),
    ('白字 于 coral 大数字',          '#FFFFFF', '--coral', 3.0),
    ('白字 于 coral 大数字(深端)',     '#FFFFFF', '--coral-deep', 3.0),
    ('墨字 于 sun 面板(收尾端)',      '--ink', '--sun', 4.5),
    ('disabled 文字于 disabled 底',   '--disabled-text', '--disabled-bg', 3.0),
]


def verify_contrast(tokens):
    tokens = color_tokens(tokens)
    print('\n[1/4] 对比度断言')
    for label, fg, bg, thresh in CONTRAST_CASES:
        f = tokens.get(fg, fg)
        b = tokens.get(bg, bg)
        if f is None or b is None:
            check(False, '对比度', f'{label}: 令牌缺失 fg={fg} bg={bg}')
            continue
        ratio = contrast(f, b)
        ok = ratio >= thresh
        check(ok, '对比度', f'{label} = {ratio:.2f} < {thresh}')
        print(f'  {"PASS" if ok else "FAIL"}  {ratio:5.2f} (>= {thresh})  {label}')
    # 面板渐变的浅端白字仍需可读 —— 单独断言，因为渐变中段对比度最低
    print('  渐变面板白字最低对比度 = '
          f'{min(contrast("#FFFFFF", tokens["--water"]), contrast("#FFFFFF", tokens["--water-bright"])):.2f} '
          '(取两端较低者实现最坏情况)')


# ---------------------------------------------------------------- 断言 2：图标资源
def verify_icons():
    print('\n[2/4] 图标资源断言')
    icon_dir = MP / 'assets' / 'icons'
    available = {p.name for p in icon_dir.glob('*.png')}

    def hex_of(c):
        c = c.strip()
        m = re.match(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)', c)
        if m:
            return '%02x%02x%02x' % tuple(round(float(m.group(i))) for i in (1, 2, 3))
        h = c.lstrip('#')
        if len(h) == 3:
            h = ''.join(ch * 2 for ch in h)
        return h.lower()

    # 收集静态（非 {{}} 数据绑定）的 icon 调用
    calls = []
    for wxml in list(MP.glob('pages/*/*.wxml')) + list(MP.glob('components/*/*.wxml')):
        src = wxml.read_text(encoding='utf-8')
        for m in re.finditer(r'<icon\b[^>]*>', src):
            tag = m.group(0)
            nm = re.search(r'\bname="([^"]*)"', tag)
            co = re.search(r'\bcolor="([^"]*)"', tag)
            line = src[:m.start()].count('\n') + 1
            calls.append((wxml.relative_to(MP), line, nm.group(1) if nm else '', co.group(1) if co else None))

    # 组件现在按「任意颜色归一化 + 资源存在」解析，不再有颜色白名单。
    # 这里改为断言组件具备归一化能力，且确实移除了静默退化。
    comp = (MP / 'components' / 'icon' / 'icon.js').read_text(encoding='utf-8')
    has_normalize = 'normalizeColor' in comp
    check(has_normalize, '图标', 'icon.js 缺少 normalizeColor 归一化逻辑')
    silent = 'supportedColors' in comp and 'indexOf(iconColor) === -1' in comp
    check(not silent, '图标', 'icon.js 仍存在静默退化逻辑（未命中白名单直接变默认色）')

    unresolved, ok_count, dynamic = [], 0, 0
    for rel, line, name, color in calls:
        if '{{' in name or '{{' in (color or ''):
            dynamic += 1
            continue
        if not color:
            color = '#14343D'
        key = hex_of(color)
        if f'{name}-{key}.png' in available:
            ok_count += 1
        else:
            unresolved.append(f'{rel}:{line} icon name={name} color={color} -> {name}-{key}.png 不存在')
    for u in unresolved:
        check(False, '图标', u)
    check(not unresolved, '图标', f'{len(unresolved)} 个图标调用无法解析到资源')
    print(f'  静态调用 {ok_count} 个已解析到真实 PNG，动态绑定 {dynamic} 个（跳过）')
    print(f'  颜色归一化: {"已实现 ✓" if has_normalize else "缺失 ✗"}')
    print(f'  静默退化逻辑: {"仍存在 ✗" if silent else "已移除 ✓"}')

    # 白色图标必须存在（面板上的图标依赖它）
    for needed in ['history-ffffff.png', 'gift-ffffff.png', 'check-ffffff.png']:
        check(needed in available, '图标', f'面板所需白色图标缺失: {needed}')
    print(f'  图标资源总数: {len(available)}')


# ---------------------------------------------------------------- 断言 3：语法
def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def css_rule(path, selector):
    """取某个 class 选择器的声明块（简化：按 '.sel {' 精确匹配）。"""
    src = strip_comments((MP / path).read_text(encoding='utf-8'))
    m = re.search(r'(?:^|\})\s*\.' + re.escape(selector) + r'\s*\{([^}]*)\}', src, re.M)
    return m.group(1) if m else ''


def css_prop(block, prop):
    m = re.search(rf'\b{prop}:\s*([^;]+);', block)
    return m.group(1).strip() if m else ''


def verify_card_consistency():
    """首页积分卡片 与 我的页积分卡片 必须保持一致的外观。

    这两张卡片展示同样的信息（累计/可用积分），历史上因为分头演进，
    我的页还停留在旧深色主题（深棕数字 + 深灰标签），压在亮渐变上不可读。
    这里把「同一套渐变 / 圆角 / 内距 / 文字令牌 / 字号」固化成断言。
    """
    print('\n[4/4] 卡片一致性断言')
    PAIRS = [
        ('面板背景',    'pages/index/index.wxss', 'score-panel',      'pages/profile/profile.wxss', 'profile-hero',    'background'),
        ('面板圆角',    'pages/index/index.wxss', 'score-panel',      'pages/profile/profile.wxss', 'profile-hero',    'border-radius'),
        ('面板内距',    'pages/index/index.wxss', 'score-panel',      'pages/profile/profile.wxss', 'profile-hero',    'padding'),
        ('面板文字底',  'pages/index/index.wxss', 'score-panel',      'pages/profile/profile.wxss', 'profile-hero',    'color'),
        ('大数字色',    'pages/index/index.wxss', 'score-number',     'pages/profile/profile.wxss', 'total-number',    'color'),
        ('大数字字号',  'pages/index/index.wxss', 'score-number',     'pages/profile/profile.wxss', 'total-number',    'font-size'),
        ('大数字字重',  'pages/index/index.wxss', 'score-number',     'pages/profile/profile.wxss', 'total-number',    'font-weight'),
        ('大数字字体',  'pages/index/index.wxss', 'score-number',     'pages/profile/profile.wxss', 'total-number',    'font-family'),
        ('大数字行高',  'pages/index/index.wxss', 'score-number',     'pages/profile/profile.wxss', 'total-number',    'line-height'),
        ('标签字号',    'pages/index/index.wxss', 'score-unit',       'pages/profile/profile.wxss', 'profile-total',   'font-size'),
        ('标签色',      'pages/index/index.wxss', 'score-unit',       'pages/profile/profile.wxss', 'profile-total',   'color'),
        ('次要字号',    'pages/index/index.wxss', 'score-small-label', 'pages/profile/profile.wxss', 'profile-balance', 'font-size'),
        ('顶栏字号',    'pages/index/index.wxss', 'score-caption',    'pages/profile/profile.wxss', 'profile-grade',   'font-size'),
    ]
    diff = []
    for label, hp, hs, mp, ms, prop in PAIRS:
        hv = css_prop(css_rule(hp, hs), prop)
        mv = css_prop(css_rule(mp, ms), prop)
        if not hv or not mv:
            check(False, '卡片一致', f'{label}: 选择器未找到 ({hs} / {ms})')
            continue
        if hv != mv:
            diff.append(f'{label}: 首页 {hv} vs 我的 {mv}')
        check(hv == mv, '卡片一致', f'{label}: 首页 {hv} vs 我的 {mv}')
        print(f'  {"OK " if hv == mv else "差异"} {label:10s} {hv}')
    print(f'  首页与我的页积分卡片: {"完全一致 ✓" if not diff else str(diff)}')

    # 装饰一致性：两张卡片都应有柔光圆 + 底部嫩黄绿高光线
    for path, sel in [('pages/index/index.wxss', 'score-panel'),
                      ('pages/profile/profile.wxss', 'profile-hero')]:
        src = strip_comments((MP / path).read_text(encoding='utf-8'))
        has_glow = bool(re.search(re.escape('.' + sel) + r'::before', src))
        has_line = bool(re.search(re.escape('.' + sel) + r'::after', src))
        check(has_glow and has_line, '卡片一致',
              f'{path} .{sel} 缺少装饰（柔光圆={has_glow}, 底部高光线={has_line}）')
        print(f'  {"OK " if has_glow and has_line else "缺失"} {sel} 装饰（柔光圆 + 底部高光线）')


def verify_syntax(tokens):
    print('\n[3/4] 语法断言')    # 令牌：所有 wxss 引用的 --x 都必须在 app.wxss 定义
    undefined = {}
    for css_file in list(MP.glob('pages/*/*.wxss')) + list(MP.glob('components/*/*.wxss')) + [MP / 'app.wxss']:
        src = strip_comments(css_file.read_text(encoding='utf-8'))
        for name in set(re.findall(r'var\(\s*(--[\w-]+)', src)):
            if name not in tokens:
                undefined.setdefault(str(css_file.relative_to(MP)), []).append(name)
    for f, names in undefined.items():
        check(False, '令牌', f'{f} 引用了未定义的令牌: {sorted(set(names))}')
    check(not undefined, '令牌', f'{len(undefined)} 个文件引用未定义令牌')
    print(f'  令牌引用: {"全部已定义 ✓" if not undefined else str(undefined)}  (定义数 {len(tokens)})')

    # 括号平衡（剥掉注释后再计数，避免中文全角括号干扰）
    for css_file in MP.rglob('*.wxss'):
        src = strip_comments(css_file.read_text(encoding='utf-8'))
        ok = src.count('{') == src.count('}') and src.count('(') == src.count(')')
        check(ok, 'WXSS', f'{css_file.relative_to(MP)} 括号不平衡 '
                          f'({{={src.count("{")} }}={src.count("}")} (={src.count("(")} )={src.count(")")})')
    wxss_count = len(list(MP.rglob('*.wxss')))
    print(f'  WXSS 括号平衡: 检查 {wxss_count} 个文件')

    # 残留的旧深色面板渐变（说明有页面漏改）
    legacy = []
    for css_file in MP.rglob('*.wxss'):
        src = css_file.read_text(encoding='utf-8')
        if 'var(--panel) 0%, var(--panel-deep)' in src:
            # --panel/--panel-deep 现在本身指向青色，属于合法；仅提示使用了两种写法之一
            pass
        if re.search(r'#193642|#2A4F5E|#2E9CA8|#4DB5BD|#D6E85A|#8AA5AD|#B87A00|#C4940A|#8A6A62|#82908C|#D7654B', src):
            hits = re.findall(r'#(?:193642|2A4F5E|2E9CA8|4DB5BD|D6E85A|8AA5AD|B87A00|C4940A|8A6A62|82908C|D7654B)', src)
            legacy.append(f'{css_file.relative_to(MP)}: {sorted(set(hits))}')
    for l in legacy:
        check(False, '色板', f'残留旧色值 {l}')
    print(f'  旧色值残留: {"无 ✓" if not legacy else str(legacy)}')

    # 渐变面板上的文字：容器本身声明 color 只是其中一种写法，更常见的是
    # 面板容器只声明背景、由**子元素** rule 决定文字色。后者曾是漏网之鱼
    # （profile / publish / calendar / history 等页的子元素沿用深色 muted/gold-text/hint，
    # 压在亮渐变上实测只有 1.00~3.26:1，等于看不见），所以这里用 WXML 结构判断：
    # 先把「渲染在面板容器内部」的 class 全找出来，再检查这些 class 的文字色。
    PANEL_BG = re.compile(r'grad-(water|mint|coral)')
    LIGHT_OK = re.compile(r'#FFF|#FFFFFF|var\(--on-dark|var\(--sun\)|var\(--lime\)|var\(--gold\)|\bwhite\b|inherit')
    # 已核实为正确的例外：数字落在自带的浅色圆形底上，深字才是对的。
    KNOWN_OK = {
        '.profile-avatar', '.person-avatar',   # 背景 var(--gold) 浅黄绿，墨字 9.56:1
    }

    dark_on_panel, panel_count = [], 0
    for wxml_path in sorted(MP.glob('pages/*/*.wxml')):
        css_path = wxml_path.with_suffix('.wxss')
        if not css_path.exists():
            continue
        wxml = wxml_path.read_text(encoding='utf-8')
        css = strip_comments(css_path.read_text(encoding='utf-8'))

        panel_sel = set()
        for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
            if PANEL_BG.search(m.group(2)):
                for s in m.group(1).strip().split('\n')[-1].split(','):
                    s = s.strip()
                    if s.startswith('.'):
                        panel_sel.add(s[1:].split()[0].split(':')[0])
        if not panel_sel:
            continue
        panel_count += 1

        inside, stack = set(), []
        for m in re.finditer(r'<(/?)([a-zA-Z-]+)\b([^>]*?)(/?)>', wxml):
            closing, _tag, attrs, selfclose = m.groups()
            if closing:
                if stack:
                    stack.pop()
                continue
            cls = re.search(r'class="([^"]*)"', attrs)
            names = [c for c in (cls.group(1).split() if cls else []) if '{{' not in c]
            stack.append(any(c in panel_sel for c in names))
            if any(stack[1:]):
                inside.update(names)
            if selfclose and stack:
                stack.pop()

        for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
            sel = m.group(1).strip().split('\n')[-1].strip()
            body = m.group(2)
            col = re.search(r'(?<!background-)\bcolor:\s*([^;]+);', body)
            if not col or LIGHT_OK.search(col.group(1)):
                continue
            for part in [x.strip() for x in sel.split(',')]:
                head = part.split()[0] if part.split() else ''
                cls = head[1:].split(':')[0] if head.startswith('.') else ''
                if cls in inside and f'.{cls}' not in KNOWN_OK:
                    dark_on_panel.append(
                        f'{css_path.relative_to(MP)}  {sel} -> color: {col.group(1).strip()}')

    # 半透明会成倍削弱已经吃紧的对比度：面板底色已压到「白字 4.78:1」，
    # 再乘 opacity 会掉到 3.26:1。所以面板内的元素不允许用 opacity 弱化文字。
    for css_file in MP.rglob('*.wxss'):
        src = strip_comments(css_file.read_text(encoding='utf-8'))
        for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', src):
            sel = m.group(1).strip().split('\n')[-1].strip()
            body = m.group(2)
            if re.search(r'grad-(water|mint|coral)', body) or 'panel' in sel:
                continue
            op = re.search(r'(?<!-)opacity:\s*(\.\d+|0\.\d+);', body)
            if op and float(op.group(1)) < 0.9 and ('kicker' in sel or 'caption' in sel or 'hint' in sel):
                dark_on_panel.append(
                    f'{css_file.relative_to(MP)}  {sel} -> opacity: {op.group(1)} 会削弱面板文字对比度')

    for d in sorted(set(dark_on_panel)):
        check(False, '色板', f'渐变面板文字问题: {d}')
    print(f'  渐变面板内文字色: {"全部为浅色令牌 ✓" if not dark_on_panel else str(sorted(set(dark_on_panel)))}'
          f'  (检查了 {panel_count} 个含面板的页面)')

    # 别名令牌不得与主令牌分叉（曾经出现过 --cyan 还是旧值、--water 已更新的情况）
    alias_pairs = [('--cyan', '--water'), ('--teal', '--water'), ('--gold', '--lime'),
                   ('--soft-gold', '--soft-lime'), ('--gold-dark', '--gold-text'),
                   ('--gold-mid', '--gold-text'), ('--coral-warm', '--coral-text')]
    drift = [f'{a}({tokens.get(a)}) != {m}({tokens.get(m)})'
             for a, m in alias_pairs
             if a in tokens and m in tokens and tokens[a].lower() != tokens[m].lower()]
    for d in drift:
        check(False, '令牌', f'别名分叉: {d}')
    print(f'  别名令牌一致性: {"无分叉 ✓" if not drift else str(drift)}')

    # WXML 标签配对（粗检：view/text 开闭数量）
    bad_tags = []
    for wxml in MP.rglob('*.wxml'):
        src = strip_comments(wxml.read_text(encoding='utf-8'))
        # 去掉自闭合标签
        no_self = re.sub(r'<[^>]*/>', '', src)
        for tag in ['view', 'scroll-view', 'block']:
            opens = len(re.findall(rf'<{tag}[\s>]', no_self))
            closes = len(re.findall(rf'</{tag}>', no_self))
            if opens != closes:
                bad_tags.append(f'{wxml.relative_to(MP)} <{tag}> {opens} 开 / {closes} 闭')
    for b in bad_tags:
        check(False, 'WXML', b)
    print(f'  WXML 标签配对: 检查 {len(list(MP.rglob("*.wxml")))} 个文件'
          f'{"，问题 " + str(len(bad_tags)) if bad_tags else "，全部配对 ✓"}')

    # JSON 可解析
    bad_json = []
    for j in MP.rglob('*.json'):
        try:
            json.loads(j.read_text(encoding='utf-8'))
        except Exception as e:
            bad_json.append(f'{j.relative_to(MP)}: {e}')
    for b in bad_json:
        check(False, 'JSON', b)
    print(f'  JSON 可解析: 检查 {len(list(MP.rglob("*.json")))} 个文件'
          f'{"，问题 " + str(len(bad_json)) if bad_json else "，全部通过 ✓"}')


def main():
    tokens = read_tokens()
    verify_contrast(tokens)
    verify_icons()
    verify_syntax(tokens)
    verify_card_consistency()
    print('\n' + '=' * 62)
    if FAILS:
        print(f'结果: {len(FAILS)} 项失败 / 共 {CHECKS[0]} 项断言')
        for f in FAILS:
            print('  ✗ ' + f)
        return 1
    print(f'结果: 全部通过 ✓  (共 {CHECKS[0]} 项断言)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
