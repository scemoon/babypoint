// keyboard.js - 键盘避让
//
// 为什么需要它：input/textarea 自带的 adjust-position 只会「上推页面滚动」，
// 真机 iPhone 微信下有两条路走不通：
//   1) position: fixed 的底部弹层：fixed 元素不随页面滚动移动，自动上推无效，
//      输入框永远停在键盘下面；
//   2) 普通流里位于文档末尾的输入框：页面底部留白只有 150rpx，小于键盘高度，
//      页面没有可滚动余量，输入框推不到键盘之上。
// 所以统一由页面自己读取键盘高度（px），再决定怎么让位：
//   - 弹层：mask 加 padding-bottom = 键盘高度，弹层整体被顶到键盘上方，同时
//     弹层内的输入框关掉 adjust-position，避免「平台上推 + 自己上推」双重位移；
//   - 普通页面：末尾加一个高度 = 键盘高度的占位块，页面始终有足够余量把输入框
//     滚到键盘上方（仍然交给 adjust-position 上推，只是这次推得动）。
//
// 用法：
//   const { keyboardAvoid } = require('../../utils/keyboard');
//   Page(keyboardAvoid({
//     data: { ... },
//     onLoad() { ... },
//     ...
//   }));
// 注入 data.keyboardHeight（单位 px，键盘收起时为 0）。

// 调试开关：真机上想确认键盘高度是否上报正常，改成 true 后看 vConsole。
const DEBUG = false;

// 小于这个高度视为「键盘已收起」：iOS 在收起动画里会上报一串递减的小高度，
// 这类残留值留在 data 里会让弹层悬在半空。
const MIN_KEYBOARD_HEIGHT = 24;

function normalize(res) {
  const raw = res && typeof res.height === 'number' ? res.height : 0;
  return raw <= MIN_KEYBOARD_HEIGHT ? 0 : Math.round(raw);
}

/**
 * 给 Page 注入键盘高度监听。
 * @param {object} options 原本传给 Page 的配置
 * @returns {object} 可以直接交给 Page 的配置
 */
function keyboardAvoid(options) {
  const pageOptions = Object.assign({}, options);

  pageOptions.data = Object.assign({ keyboardHeight: 0 }, options.data);

  pageOptions.onLoad = function (query) {
    this._keyboardHandler = res => {
      const height = normalize(res);
      if (height === this.data.keyboardHeight) return; // 去重，避免动画期间反复 setData
      if (DEBUG) console.log('[keyboard] height =', height);
      this.setData({ keyboardHeight: height });
    };
    if (typeof wx.onKeyboardHeightChange === 'function') {
      wx.onKeyboardHeightChange(this._keyboardHandler);
    } else {
      // 基础库过低（< 2.7.0）时降级：cursor-spacing 的静态留白仍然生效。
      console.warn('[keyboard] 当前基础库不支持 wx.onKeyboardHeightChange，退化为 cursor-spacing');
      this._keyboardHandler = null;
    }
    if (typeof options.onLoad === 'function') options.onLoad.call(this, query);
  };

  pageOptions.onUnload = function () {
    detach(this);
    if (typeof options.onUnload === 'function') options.onUnload.call(this);
  };

  // 页面切走时键盘必然收起，清零避免切回来弹层还悬在半空
  pageOptions.onHide = function () {
    if (this.data.keyboardHeight) this.setData({ keyboardHeight: 0 });
    if (typeof options.onHide === 'function') options.onHide.call(this);
  };

  return pageOptions;
}

function detach(page) {
  if (page._keyboardHandler && typeof wx.offKeyboardHeightChange === 'function') {
    wx.offKeyboardHeightChange(page._keyboardHandler);
  }
  page._keyboardHandler = null;
}

module.exports = { keyboardAvoid };
