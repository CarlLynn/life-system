/* ============================================
 * 人生养成系统 v5.1 — notify.js
 * 每日提醒：到点弹本地通知（需授权）
 * 说明：纯前端应用无法在关闭后推送；本提醒在
 *       浏览器/App 打开期间生效。上线后可升级
 *       Web Push（需服务器）实现系统级推送。
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  LS.openReminderModal = function () {
    const r = (LS.state.settings && LS.state.settings.reminder) || { enabled: false, time: '21:00' };
    LS.openModal('<div class="modal-title">⏰ 每日提醒</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.8rem">设定每天提醒自己打开系统、查看今日任务的时间。</p></div>' +
      '<div class="form-group"><label class="form-label">提醒时间</label>' +
      '<input type="time" class="form-input" id="reminder-time" value="' + (r.time || '21:00') + '"></div>' +
      '<div class="form-group"><label class="form-label">状态</label>' +
      '<select class="select-input" id="reminder-enabled">' +
      '<option value="1"' + (r.enabled ? ' selected' : '') + '>开启</option>' +
      '<option value="0"' + (!r.enabled ? ' selected' : '') + '>关闭</option>' +
      '</select></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.saveReminder()">保存</button>' +
      '<div class="pro-disclaimer" style="margin-top:var(--sp-sm)">提醒依赖浏览器通知权限；应用打开期间生效，关闭后无法提醒（离线限制）。</div>');
  };

  LS.saveReminder = function () {
    const time = document.getElementById('reminder-time').value || '21:00';
    const enabled = document.getElementById('reminder-enabled').value === '1';
    if (!LS.state.settings) LS.state.settings = {};
    LS.state.settings.reminder = { enabled: enabled, time: time };
    LS.saveState(); LS.closeModal();
    if (enabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    LS.showToast(enabled ? '每日 ' + time + ' 提醒已开启' : '提醒已关闭', 'success');
  };

  // 启动时调度（每 30 秒检查一次到点）
  LS.startReminderLoop = function () {
    if (LS._reminderTimer) clearInterval(LS._reminderTimer);
    LS._reminderTimer = setInterval(function () {
      const r = LS.state.settings && LS.state.settings.reminder;
      if (!r || !r.enabled) return;
      const now = new Date();
      const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      if (hm === r.time) {
        // 防止重复提醒
        const today = LS.todayKey() + ' ' + r.time;
        if (LS._lastReminder === today) return;
        LS._lastReminder = today;
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('人生养成系统', { body: '今日任务还没完成，回来看看 👀', icon: 'icon-192.png' });
          } catch (e) { /* 静默失败 */ }
        }
        LS.showToast('⏰ 该看看今天的任务啦', 'warning');
      }
    }, 30000);
  };

})(window);
