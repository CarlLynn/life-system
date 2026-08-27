/* ============================================
 * 人生养成系统 v5.6 — settings.js
 * 设置页：外观 / 数据管理 / 分享 / 关于
 * 顶部导航只保留 PRO 与设置入口，其余功能收纳于此
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // 设置行
  function row(icon, label, desc, action, danger, proTag) {
    const lock = proTag && !LS.isPro() ? '<span class="set-pro-tag">PRO</span>' : '';
    return '<div class="set-row' + (danger ? ' danger' : '') + '" onclick="' + action + '">' +
      '<span class="set-row-icon">' + icon + '</span>' +
      '<div class="set-row-main"><div class="set-row-label">' + label + lock + '</div>' +
      '<div class="set-row-desc">' + desc + '</div></div>' +
      '<span class="set-row-chev">›</span></div>';
  }

  LS.renderSettings = function () {
    const container = document.getElementById('settings-content');
    if (!container) return;
    const pro = LS.isPro();
    const theme = LS.getTheme();

    // 主题皮肤（内联选择）
    const chips = LS.THEMES.map(function (t) {
      return '<button type="button" class="set-chip' + (t.id === theme ? ' selected' : '') + '" onclick="LS.setTheme(\'' + t.id + '\')">' +
        '<span class="set-chip-preview set-chip-preview-' + t.id + '">' + t.emoji + '</span>' +
        '<span class="set-chip-name">' + t.name + '</span></button>';
    }).join('');

    let html = '';

    // 外观
    html += '<div class="set-group"><div class="set-group-title">外观</div><div class="set-card">' +
      '<div class="set-row no-click"><span class="set-row-icon">🎨</span><div class="set-row-main">' +
      '<div class="set-row-label">主题皮肤</div><div class="set-row-desc">选择喜欢的整体配色，即时生效</div></div></div>' +
      '<div class="set-chips">' + chips + '</div></div></div>';

    // 数据管理
    html += '<div class="set-group"><div class="set-group-title">数据管理</div><div class="set-card">' +
      row('💾', '快照备份', '版本化备份，随时一键恢复', 'LS.openBackupModal()', false, true) +
      row('📤', '导出数据', '下载 JSON 备份文件', 'LS.exportData()') +
      row('📥', '导入数据', '从备份文件恢复数据', 'LS.triggerImport()') +
      row('🗑️', '重置系统', '清除全部数据，不可撤销', 'LS.confirmReset()', true) +
      '</div></div>';

    // 分享
    html += '<div class="set-group"><div class="set-group-title">分享</div><div class="set-card">' +
      row('🖼️', '分享成长战绩', '生成战绩图片，保存到相册', 'LS.openShareCardModal()') +
      '</div></div>';

    // 关于
    html += '<div class="set-group"><div class="set-group-title">关于</div><div class="set-card">' +
      row('👑', pro ? 'PRO 会员' : '升级 PRO', pro ? '终身买断 · 已激活' : '解锁全部功能', 'LS.openUpgradeModal()') +
      '<div class="set-row no-click"><span class="set-row-icon">🛡️</span><div class="set-row-main">' +
      '<div class="set-row-label">版本</div><div class="set-row-desc">v' + LS.VERSION + ' · 宿主养成终端</div></div></div>' +
      '<div class="set-row no-click"><span class="set-row-icon">🔒</span><div class="set-row-main">' +
      '<div class="set-row-label">隐私</div><div class="set-row-desc">数据 100% 本地存储，无账号无广告</div></div></div>' +
      '</div></div>';

    container.innerHTML = html;
  };

})(window);
