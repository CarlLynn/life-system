/* ============================================
 * 人生养成系统 v5.0 — today.js
 * 今日聚焦：主页快捷面板
 *   - 今日待办（今日到期的限时任务 + 进行中的不限时任务）
 *   - 今日已完成计数
 *   - 快捷完成任务入口
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  LS.renderToday = function () {
    const slot = document.getElementById('today-slot');
    if (!slot) return;
    const today = LS.todayKey();

    // 今日待办：限时任务截止日=今天 且未完成
    const dueToday = LS.state.tasks.filter(t =>
      t.timeType === 'limited' && !t.completed && t.status !== 'abandoned' && LS.getTaskDueDay(t) === today
    );
    // 进行中的不限时任务
    const running = LS.state.tasks.filter(t =>
      t.timeType === 'unlimited' && !t.completed && t.status !== 'abandoned'
    );
    // 今日已完成
    const doneToday = (LS.state.taskHistory.find(h => h.date === today) || {}).count || 0;

    const all = [...dueToday, ...running].slice(0, 6);
    const total = dueToday.length + running.length;

    let html = '<div class="today-card">' +
      '<div class="today-head">' +
      '<div><div class="today-title">今日聚焦</div>' +
      '<div class="today-date">' + today + ' · 待办 ' + total + ' · 已完成 ' + doneToday + '</div></div>' +
      (doneToday > 0 ? '<div class="today-done-badge">✓ ' + doneToday + '</div>' : '') +
      '</div>';

    if (!all.length) {
      html += '<div class="today-empty">今日无待办，享受自由时间 ☀</div>';
    } else {
      html += '<div class="today-list">';
      all.forEach(t => {
        const isDue = t.timeType === 'limited';
        const attr = LS.state.attributes.find(a => a.id === t.attributeId);
        const reward = (attr && t.points > 0) ? attr.name + ' +' + t.points : '';
        html += '<div class="today-item">' +
          '<button class="today-check" onclick="LS.openCompleteTaskModal(\'' + t.id + '\')" title="完成">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>' +
          '<div class="today-item-info">' +
          '<div class="today-item-title">' + LS.escapeHtml(t.title) + '</div>' +
          '<div class="today-item-meta">' + (isDue ? '⏰ 今日截止' : '∞ 不限时') + (reward ? ' · ' + LS.escapeHtml(reward) : '') + '</div>' +
          '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    slot.innerHTML = html;
  };

})(window);
