/* ============================================
 * 人生养成系统 v5.6 — theme.js
 * 主题系统（年轻风格）
 *   youth   青春活力（默认，深色霓虹渐变）
 *   cyber   赛博暗夜（原科技风）
 *   day     奶油白日（浅色）
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  LS.THEMES = [
    { id: 'fresh', name: '温润奶油', desc: '米白 · 白卡片 · 珊瑚橙，仿生活工作台', icon: '🌿', emoji: '☀️' },
    { id: 'youth', name: '青春活力', desc: '霓虹渐变 · 大胆配色', icon: '🌈', emoji: '🌙' },
    { id: 'cyber', name: '赛博暗夜', desc: '深空科技 · 冷静专注', icon: '🖤', emoji: '🔷' },
    { id: 'day',   name: '奶油白日', desc: '明亮清爽 · 白天使用', icon: '☀️', emoji: '☀️' }
  ];

  LS.getTheme = function () {
    return (LS.state && LS.state.settings && LS.state.settings.theme) || 'fresh';
  };

  LS.setTheme = function (themeId) {
    if (!LS.THEMES.find(t => t.id === themeId)) return;
    if (!LS.state.settings) LS.state.settings = {};
    LS.state.settings.theme = themeId;
    LS.saveState();
    document.documentElement.setAttribute('data-theme', themeId);
    // 更新切换按钮图标（旧版头部入口，已并入设置页）
    const btn = document.getElementById('theme-btn');
    if (btn) {
      const t = LS.THEMES.find(x => x.id === themeId);
      btn.innerHTML = t ? t.emoji : '🎨';
    }
    // 刷新设置页主题选中态
    if (LS.renderSettings) LS.renderSettings();
  };

  LS.openThemeModal = function () {
    const current = LS.getTheme();
    const cards = LS.THEMES.map(t =>
      '<div class="theme-card' + (t.id === current ? ' selected' : '') + '" onclick="LS.setTheme(\'' + t.id + '\');LS.closeModal()">' +
      '<div class="theme-preview theme-preview-' + t.id + '">' + t.emoji + '</div>' +
      '<div class="theme-name">' + t.name + (t.id === current ? ' ✓' : '') + '</div>' +
      '<div class="theme-desc">' + t.desc + '</div></div>').join('');
    LS.openModal('<div class="modal-title">🎨 主题皮肤</div>' +
      '<div class="theme-grid">' + cards + '</div>' +
      '<div class="notice-body" style="margin-top:var(--sp-md)"><p style="font-size:0.7rem">主题仅影响外观，不影响你的任何数据。</p></div>');
  };

  // 应用当前主题（不写存储）
  LS.applyTheme = function () {
    document.documentElement.setAttribute('data-theme', LS.getTheme());
    const btn = document.getElementById('theme-btn');
    if (btn) {
      const t = LS.THEMES.find(x => x.id === LS.getTheme());
      btn.innerHTML = t ? t.emoji : '🎨';
    }
  };

  // ---------- 彩带动效（完成任务/支付成功触发） ----------
  LS.burstConfetti = function () {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = ['#f472b6', '#a78bfa', '#38bdf8', '#4ade80', '#facc15', '#fb7185'];
    const pieces = [];
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    for (let i = 0; i < 140; i++) {
      pieces.push({
        x: W / 2 + (Math.random() - 0.5) * 80,
        y: H * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        s: 4 + Math.random() * 6,
        c: colors[Math.floor(Math.random() * colors.length)],
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
    let raf;
    function step() {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.r += p.vr; p.life -= 0.012;
        if (p.life <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (alive) raf = requestAnimationFrame(step);
      else { ctx.clearRect(0, 0, W, H); }
    }
    step();
  };

})(window);
