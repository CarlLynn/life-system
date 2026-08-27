/* ============================================
 * 人生养成系统 v5.2 — install.js
 * PWA 安装引导：安装横幅 + 新手引导
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  let deferredPrompt = null;
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

  // 捕获浏览器安装事件
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    LS.showInstallBanner();
  });

  LS.showInstallBanner = function () {
    const banner = document.getElementById('install-banner');
    if (!banner || isStandalone) return;
    if (LS.state && LS.state.settings && LS.state.settings.installDismissed) return;
    banner.classList.remove('hidden');
  };

  LS.dismissInstallBanner = function () {
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
    if (LS.state) {
      if (!LS.state.settings) LS.state.settings = {};
      LS.state.settings.installDismissed = true;
      LS.saveState();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('install-btn');
    if (btn) btn.addEventListener('click', async function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          const choice = await deferredPrompt.userChoice;
          if (choice.outcome === 'accepted') LS.showToast('🎉 已安装，欢迎使用！', 'success');
        } catch (e) { /* ignore */ }
        deferredPrompt = null;
      } else {
        // 浏览器不支持 beforeinstallprompt（如 iOS Safari）→ 显示手动安装指南
        LS.openInstallGuide();
      }
      LS.dismissInstallBanner();
    });
  });

  // 手动安装指南（iOS / 不支持自动安装）
  LS.openInstallGuide = function () {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    LS.openModal('<div class="modal-title">📱 安装到主屏幕</div>' +
      '<div class="guide-step"><div class="guide-step-num">1</div><div class="guide-step-text">打开浏览器菜单' +
      (ios ? '（底部 <b>分享</b> 按钮）' : '（右上角 <b>⋮</b> 菜单）') + '</div></div>' +
      '<div class="guide-step"><div class="guide-step-num">2</div><div class="guide-step-text">选择 <b>「添加到主屏幕」</b> / <b>「安装应用」</b></div></div>' +
      '<div class="guide-step"><div class="guide-step-num">3</div><div class="guide-step-text">确认安装，即可像 App 一样全屏使用，<b>支持离线</b></div></div>');
  };

  // 新手引导（绑定完成后弹一次）
  LS.openNewbieGuide = function () {
    if (LS.state && LS.state.settings && LS.state.settings.newbieDone) return;
    LS.openModal('<div class="modal-title">🚀 三步上手</div>' +
      '<div class="guide-step"><div class="guide-step-num">1</div><div class="guide-step-text"><b>创建任务</b>：去「任务」页点 + 新建，设置奖励属性与点数</div></div>' +
      '<div class="guide-step"><div class="guide-step-num">2</div><div class="guide-step-text"><b>完成任务</b>：点击 ✓，属性自动增长、技能获得经验</div></div>' +
      '<div class="guide-step"><div class="guide-step-num">3</div><div class="guide-step-text"><b>保持节奏</b>：连续打卡、周报复盘；「方案库」可一键套用现成体系</div></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.finishNewbieGuide()">开始养成！</button>');
  };

  LS.finishNewbieGuide = function () {
    if (!LS.state.settings) LS.state.settings = {};
    LS.state.settings.newbieDone = true;
    LS.saveState();
    LS.closeModal();
    LS.burstConfetti();
  };

})(window);
