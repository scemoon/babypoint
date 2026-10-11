Component({
  properties: {
    name: { type: String, value: 'star' },
    size: { type: Number, value: 48 },
    color: { type: String, value: '#14343D' }
  },
  data: { iconData: {} },
  lifetimes: {
    attached() { this.updateIcon(); }
  },
  observers: {
    'name, color': function(name, color) {
      this.updateIcon(name, color);
    }
  },
  methods: {
    updateIcon(name, color) {
      const iconName = name || this.properties.name || 'star';
      const raw = String(color || this.properties.color || '#14343D').trim();

      // 把任意写法（#RRGGBB / #RGB / #FFFFFF / rgba(r,g,b,a)）归一成 6 位小写 hex。
      // 透明通道刻意忽略：图标是位图单色，半透明无法只靠颜色表达，
      // 因此 #FFF 与 rgba(255,255,255,.7) 都按纯白图标渲染，不再退化成深色。
      const hex = this.normalizeColor(raw);

      // 只在真的解析不出颜色时才回退到主文字色，并打印告警。
      // 原实现是「不在 4 色白名单里就静默换成深蓝」，导致面板上的白色图标
      // 被渲染成深蓝压在深底上（几乎不可见），这里彻底去掉该行为。
      const colorKey = hex || this.fallbackColor(raw);

      this.setData({ iconData: { src: `/assets/icons/${iconName}-${colorKey}.png` } });
    },

    normalizeColor(input) {
      const value = input.toLowerCase();
      // rgba(255,255,255,.7) / rgb(255,255,255) -> ffffff
      const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
      if (rgb) {
        return [1, 2, 3]
          .map(i => Math.max(0, Math.min(255, Math.round(Number(rgb[i])))).toString(16).padStart(2, '0'))
          .join('');
      }
      const h = value.replace(/^#/, '');
      if (/^[0-9a-f]{3}$/.test(h)) {
        return h.split('').map(c => c + c).join('');
      }
      if (/^[0-9a-f]{6}$/.test(h)) return h;
      return '';
    },

    fallbackColor(input) {
      console.warn(`[icon] 无法解析颜色 "${input}"，已回退为主文字色 14343d`);
      return '14343d';
    }
  }
});
