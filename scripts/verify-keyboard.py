#!/usr/bin/env python3
"""小步成长 — 键盘避让验证脚本

背景：小程序 input/textarea 自带的 adjust-position 只会上推「页面滚动」，
对两种场景是不够的（真机 iPhone 微信已复现遮挡）：

  A. position: fixed 的底部弹层：fixed 元素不随页面滚动移动，adjust-position
     完全失效 —— 输入框永远停在键盘下面。
  B. 普通流里位于文档末尾的输入框：页面底部留白只有 150rpx，远小于键盘高度，
     页面根本没有可滚动的余量把输入框推到键盘之上。

因此本项目的硬约定（本脚本逐条断言）：

  1. 每个 <input>/<textarea> 都必须显式声明 cursor-spacing（光标与键盘的间距）。
  2. fixed 底部弹层内的输入框必须 adjust-position="{{false}}"，避让完全由页面
     自己按 keyboardHeight 控制，避免「平台自动上推 + 自己上推」双重位移。
  3. 含输入框的 fixed 底部弹层必须绑定 padding-bottom: {{keyboardHeight}}px，
     并在键盘弹起时切换 kb-open 让弹层高度收敛到键盘之上。
  4. 含输入框的页面必须引入 utils/keyboard.js（keyboardAvoid）订阅键盘高度。
  5. 含普通流输入框的页面必须有 {{keyboardHeight}}px 的底部占位，保证页面
     始终有足够余量把输入框滚到键盘上方。
  6. utils/keyboard.js 必须注销监听（onUnload 里 wx.offKeyboardHeightChange），
     否则页面栈里每进一次就多一个监听，内存与误更新都会累积。
  7. fixed 底部弹层内部不能残留 position: fixed：fixed 元素相对视口定位、不随弹层
     移动，键盘弹起时会被留在原地（被键盘吞掉），必须重置为 static/relative。

用法: python3 scripts/verify-keyboard.py
退出码 0 = 全部通过
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MP = ROOT / 'miniprogram'
PAGES = MP / 'pages'
KEYBOARD_UTIL = MP / 'utils' / 'keyboard.js'

# 反空断言用的期望值：解析器若失效（正则写坏、标签解析错位），下面的逐项断言会
# 因为「压根没解析到输入框」而全部通过 —— 这三项用来把这种假通过变成真失败。
EXPECTED_INPUT_PAGES = {'reward', 'task-complete', 'child-list', 'publish',
                        'task-add', 'reward-add', 'security', 'onboard'}
EXPECTED_MIN_INPUTS = 20
EXPECTED_SHEET_PAGES = {'reward', 'task-complete', 'child-list'}

FAILS = []
CHECKS = [0]


def check(ok, label, detail=''):
    CHECKS[0] += 1
    if not ok:
        FAILS.append(f'{label}: {detail}')
    return ok


# ---------------------------------------------------------------- WXSS 解析
def strip_wxss_comments(text):
    return re.sub(r'/\*.*?\*/', '', text, flags=re.S)


def classes_in_selector(selector):
    return set(re.findall(r'\.([A-Za-z0-9_-]+)', selector))


def bottom_overlay_classes():
    """收集「fixed + align-items: flex-end」的类名 —— 即底部弹层的判定依据。"""
    found = set()
    for wxss in MP.rglob('*.wxss'):
        text = strip_wxss_comments(wxss.read_text(encoding='utf-8'))
        # 逐个规则块：selector { body }
        for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', text):
            selector, body = m.group(1), m.group(2)
            if 'position: fixed' in body.replace('position:fixed', 'position: fixed') \
               and re.search(r'align-items:\s*flex-end', body):
                found |= classes_in_selector(selector)
    return found


def fixed_classes():
    """收集被声明为 position: fixed 的类名（页面级 CTA 之类）。"""
    found = set()
    for wxss in MP.rglob('*.wxss'):
        text = strip_wxss_comments(wxss.read_text(encoding='utf-8'))
        for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', text):
            if re.search(r'position:\s*fixed', m.group(2)):
                found |= classes_in_selector(m.group(1))
    return found


def has_fixed_reset(wxss_text, cls):
    """该样式表里有没有把 .cls 的定位重置为非 fixed 的规则。"""
    if not wxss_text:
        return False
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', strip_wxss_comments(wxss_text)):
        selector, body = m.group(1), m.group(2)
        if re.search(r'\.' + re.escape(cls) + r'(?![\w-])', selector) \
           and re.search(r'position:\s*(static|relative)', body):
            return True
    return False


# ---------------------------------------------------------------- WXML 解析
TAG_RE = re.compile(r'<!--.*?-->|<\s*(/?)\s*([A-Za-z][\w-]*)((?:"[^"]*"|\'[^\']*\'|[^>"\'])*?)(/?)\s*>', re.S)
VOID_TAGS = {'input', 'textarea', 'image', 'icon', 'import', 'include', 'wxs'}


def attr(attrs, name):
    m = re.search(r'(?<![\w-])' + re.escape(name) + r'\s*=\s*("([^"]*)"|\'([^\']*)\')', attrs)
    if not m:
        return None
    return m.group(2) if m.group(2) is not None else m.group(3)


def has_class(attrs, name):
    cls = attr(attrs, 'class') or ''
    return name in cls.split()


def walk_wxml(path, overlay_classes):
    """返回 (inputs, overlays) —— inputs 为输入框信息，overlays 为需避让的弹层节点。"""
    text = path.read_text(encoding='utf-8')
    stack = []          # [(index, tag, attrs, in_bottom)]
    inputs = []
    overlays = []
    node = 0
    for m in TAG_RE.finditer(text):
        raw = m.group(0)
        if raw.startswith('<!--'):
            continue
        closing, tag, attrs, self_close = m.group(1), m.group(2), m.group(3), m.group(4)
        tag = tag.lower()
        if closing:
            if stack and stack[-1][1] == tag:
                stack.pop()
            continue
        parent_in_bottom = stack[-1][3] if stack else False
        own_overlay = bool(classes_in_selector_from_attrs(attrs) & overlay_classes)
        in_bottom = parent_in_bottom or own_overlay
        node += 1
        # 把当前元素的类名登记到所有「弹层祖先」上：用于检查弹层内有没有残留 fixed 定位
        for anc in stack:
            if classes_in_selector_from_attrs(anc[2]) & overlay_classes:
                anc[5].update(classes_in_selector_from_attrs(attrs))
        if tag in ('input', 'textarea'):
            line = text[:m.start()].count('\n') + 1
            nearest = None
            for n in reversed(stack):
                if classes_in_selector_from_attrs(n[2]) & overlay_classes:
                    nearest = n
                    break
            rec = {'file': path, 'line': line, 'attrs': attrs, 'in_bottom': in_bottom,
                   'overlay': nearest}
            inputs.append(rec)
            if nearest is not None:
                nearest[4] = True
            continue
        entry = [node, tag, attrs, in_bottom, False, set()]
        if own_overlay:
            overlays.append(entry)   # 保留引用，后续 input 命中时把 entry[4] 置 True
        if not self_close and tag not in VOID_TAGS:
            stack.append(entry)
    return inputs, overlays


def classes_in_selector_from_attrs(attrs):
    return set((attr(attrs, 'class') or '').split())


# ---------------------------------------------------------------- 断言
def verify_pages(overlay_classes, fixed_cls, app_wxss):
    """逐页断言。每一项都用 check() 记账 —— 通过与失败都要计入断言数，
    否则「解析器悄悄失效」也会被报告成全通过。"""
    page_dirs = sorted(p for p in PAGES.iterdir() if p.is_dir())
    total_inputs = 0
    pages_with_inputs = set()
    sheet_inputs = 0
    fixed_children = 0
    for page in page_dirs:
        wxml = page / f'{page.name}.wxml'
        js = page / f'{page.name}.js'
        wxss = page / f'{page.name}.wxss'
        if not wxml.exists():
            continue
        inputs, overlays = walk_wxml(wxml, overlay_classes)
        if not inputs:
            continue
        pages_with_inputs.add(page.name)
        rel = wxml.relative_to(MP)
        total_inputs += len(inputs)
        sheet_recs = [r for r in inputs if r['in_bottom']]
        sheet_inputs += len(sheet_recs)
        wtext = wxml.read_text(encoding='utf-8')
        src = js.read_text(encoding='utf-8') if js.exists() else ''
        page_wxss = wxss.read_text(encoding='utf-8') if wxss.exists() else ''

        # 1. 每个输入框都必须显式声明 cursor-spacing
        for rec in inputs:
            check(attr(rec['attrs'], 'cursor-spacing') is not None,
                  'cursor-spacing 缺失',
                  f'{rel}:{rec["line"]} 输入框必须声明 cursor-spacing（光标与键盘的间距）')

        # 2. fixed 弹层内的输入框必须自己接管避让（关掉平台的自动上推）
        for rec in sheet_recs:
            check((attr(rec['attrs'], 'adjust-position') or '').strip() == '{{false}}',
                  '弹层输入框未关闭 adjust-position',
                  f'{rel}:{rec["line"]} fixed 弹层内的输入框必须 adjust-position="{{{{false}}}}"'
                  '（否则平台上推与页面自推叠加，双重位移）')

        # 3. 含输入框的 fixed 弹层必须按键盘高度留出 padding
        for node in overlays:
            if not node[4]:
                continue
            style = attr(node[2], 'style') or ''
            check('keyboardHeight' in style and 'padding-bottom' in style,
                  '弹层缺少键盘高度避让',
                  f'{rel}: 含输入框的 fixed 弹层必须 style="padding-bottom: {{{{keyboardHeight}}}}px"')

        # 4. 页面必须订阅键盘高度
        check(re.search(r'Page\(\s*keyboardAvoid\s*\(', src) is not None,
              '页面未接入键盘避让',
              f'{js.relative_to(MP)}: 含输入框的页面必须写成 Page(keyboardAvoid({{...}}))')

        # 5. 普通流输入框：页面底部要有键盘高度的占位，页面才有可滚动余量
        if any(not r['in_bottom'] for r in inputs):
            check('keyboard-spacer' in wtext and '{{keyboardHeight}}px' in wtext,
                  '页面缺少底部键盘占位',
                  f'{rel}: 含普通流输入框的页面必须有 <view class="keyboard-spacer" '
                  f'style="height: {{{{keyboardHeight}}}}px">')

        # 6. 弹层页面必须切 kb-open（键盘弹起时弹层高度收敛到键盘上方）
        #    两半都要有：WXML 里真的按条件绑上类，WXSS 里真的定义了这个类
        if sheet_recs:
            m = re.search(r'class="([^"]*kb-open[^"]*)"', wtext)
            check(bool(m) and '{{' in m.group(1), '弹层未绑定 kb-open',
                  f'{rel}: 弹层必须写成 class="... {{{{keyboardHeight ? \'kb-open\' : \'\'}}}}"，'
                  f'否则键盘弹起时弹层不会收敛到键盘上方')
            wxss_src = wxss.read_text(encoding='utf-8') if wxss.exists() else ''
            check('.kb-open' in wxss_src, 'kb-open 样式缺失',
                  f'{wxss.relative_to(MP)}: 必须定义 .kb-open 规则（收敛弹层高度并内部滚动）')

        # 7. 弹层内部不能残留 position: fixed（fixed 元素不随弹层移动）
        for node in overlays:
            if not node[4]:
                continue
            for cls in sorted(node[5]):
                if cls not in fixed_cls:
                    continue
                fixed_children += 1
                check(has_fixed_reset(page_wxss, cls) or has_fixed_reset(app_wxss, cls),
                      '弹层内残留 position: fixed',
                      f'{rel}: 弹层内的 .{cls} 继承了它处声明的 position: fixed'
                      f'（那是页面级 CTA 用的），必须在 .wxss 里重置为 static/relative，'
                      f'否则键盘弹起时它不会跟着弹层上移')

    # 反空断言：解析器一旦失效（找不到输入框/弹层），上面的断言会「全通过」，
    # 所以必须显式确认真的盘到了东西。
    missing = EXPECTED_INPUT_PAGES - pages_with_inputs
    check(not missing, '输入框盘点不完整',
          f'预期这些页面有输入框，但没有解析到：{", ".join(sorted(missing))}')
    check(total_inputs >= EXPECTED_MIN_INPUTS, '输入框数量异常',
          f'只解析到 {total_inputs} 个输入框，少于预期的 {EXPECTED_MIN_INPUTS} 个')
    check(sheet_inputs >= len(EXPECTED_SHEET_PAGES), '固定弹层输入框盘点不完整',
          f'只解析到 {sheet_inputs} 个 fixed 弹层内的输入框，预期至少 {len(EXPECTED_SHEET_PAGES)} 个'
          f'（{", ".join(sorted(EXPECTED_SHEET_PAGES))}）')
    check(fixed_children >= 1, '弹层内 fixed 元素盘点不完整',
          '没有在弹层里解析到任何继承 position: fixed 的元素 —— 第 7 项断言变成空断言了')
    return total_inputs


def verify_util():
    ok = check(KEYBOARD_UTIL.exists(), '键盘工具缺失', 'utils/keyboard.js 不存在')
    if not ok:
        return
    src = KEYBOARD_UTIL.read_text(encoding='utf-8')
    check('keyboardAvoid' in src, '未导出 keyboardAvoid', 'utils/keyboard.js 必须导出 keyboardAvoid')
    check('wx.onKeyboardHeightChange(' in src, '未订阅键盘高度',
          'utils/keyboard.js 必须真的调用 wx.onKeyboardHeightChange(')
    check('wx.offKeyboardHeightChange(' in src, '未注销键盘监听',
          'utils/keyboard.js 必须在 onUnload 调用 wx.offKeyboardHeightChange(')

    # 每个含输入框的页面都必须包上 keyboardAvoid
    for page in sorted(p for p in PAGES.iterdir() if p.is_dir()):
        js = page / f'{page.name}.js'
        if not js.exists():
            continue
        if not (page / f'{page.name}.wxml').exists():
            continue
        if '<input' not in (page / f'{page.name}.wxml').read_text(encoding='utf-8') \
           and '<textarea' not in (page / f'{page.name}.wxml').read_text(encoding='utf-8'):
            continue
        check('keyboardAvoid' in js.read_text(encoding='utf-8'),
              '页面漏接键盘避让',
              f'{js.relative_to(MP)}: 含输入框的页面必须引入并将 Page 包在 keyboardAvoid 里')


def main():
    overlay_classes = bottom_overlay_classes()
    fixed_cls = fixed_classes()
    app_wxss = (MP / 'app.wxss').read_text(encoding='utf-8')
    print(f'底部弹层类（fixed + flex-end）: {", ".join(sorted(overlay_classes)) or "无"}')
    total = verify_pages(overlay_classes, fixed_cls, app_wxss)
    verify_util()
    print(f'输入框总数: {total}')
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
