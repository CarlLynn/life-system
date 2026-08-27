/* ============================================
 * 人生养成系统 v5.2 — focus.js
 * 专注计时（番茄钟）：25 分钟一个番茄，
 * 完成后记录专注时长，成长可视化。
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  let timerState = null;   // { total, remain, timerId, running, startedAt }
  let timerModalOpen = false;

  const PRESETS = [
    { id: 'pomodoro', name: '番茄', minutes: 25, icon: '🍅' },
    { id: 'short',    name: '短专注', minutes: 15, icon: '⚡' },
    { id: 'long',     name: '深专注', minutes: 45, icon: '🧠' },
    { id: 'marathon', name: '马拉松', minutes: 90, icon: '🏃' }
  ];

  // ---------- 今日专注总时长 ----------
  LS.getTodayFocus = function () {
    const today = LS.todayKey();
    return (LS.state.focusLog || []).filter(f => f.date === today).reduce((s, f) => s + (f.minutes || 0), 0);
  };

  LS.recordFocus = function (minutes) {
    if (!LS.state.focusLog) LS.state.focusLog = [];
    const today = LS.todayKey();
    const entry = LS.state.focusLog.find(f => f.date === today);
    if (entry) entry.minutes += minutes;
    else LS.state.focusLog.push({ date: today, minutes: minutes });
    LS.saveState();
  };

  // ---------- 计时器渲染 ----------
  function fmt(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function renderTimer() {
    const el = document.getElementById('focus-time');
    if (!el || !timerState) return;
    el.textContent = fmt(timerState.remain);
    const btn = document.getElementById('focus-toggle');
    if (btn) btn.textContent = timerState.running ? '⏸ 暂停' : '▶ 继续';
    // 标题同步剩余时间
    const pct = timerState.total > 0 ? Math.round((1 - timerState.remain / timerState.total) * 100) : 0;
    const bar = document.getElementById('focus-bar-fill');
    if (bar) bar.style.width = pct + '%';
  }

  LS.startFocus = function (minutes) {
    if (timerState) { LS.stopFocus(); }
    timerState = { total: minutes * 60, remain: minutes * 60, timerId: null, running: true, startedAt: Date.now() };
    renderTimer();
    timerState.timerId = setInterval(function () {
      if (!timerState || !timerState.running) return;
      timerState.remain -= 1;
      renderTimer();
      if (timerState.remain <= 0) {
        LS.finishFocus();
      }
    }, 1000);
    LS.showToast('🍅 专注 ' + minutes + ' 分钟开始，加油！', 'success');
  };

  LS.toggleFocus = function () {
    if (!timerState) return;
    timerState.running = !timerState.running;
    renderTimer();
  };

  LS.stopFocus = function () {
    if (timerState && timerState.timerId) clearInterval(timerState.timerId);
    timerState = null;
  };

  LS.finishFocus = function () {
    if (!timerState) return;
    const minutes = timerState.total / 60;
    LS.stopFocus();
    LS.recordFocus(minutes);
    LS.burstConfetti();
    LS.showToast('🎉 完成 ' + minutes + ' 分钟专注！已记入今日专注', 'success');
    renderTimer();
    LS.renderStats();
    LS.renderToday();
    // 弹窗内显示完成态
    const box = document.getElementById('focus-time');
    if (box) {
      box.textContent = '完成！';
      const btn = document.getElementById('focus-toggle');
      if (btn) btn.style.display = 'none';
    }
  };

  // ---------- 弹窗 ----------
  LS.openFocusModal = function () {
    timerModalOpen = true;
    const presetsHtml = PRESETS.map(p =>
      '<button class="focus-preset" onclick="LS.startFocus(' + p.minutes + ')">' + p.icon + ' ' + p.name + ' ' + p.minutes + '′</button>'
    ).join('');
    LS.openModal(
      '<div class="modal-title">🍅 专注计时</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.8rem">选择一个时长开始专注。完成一个番茄即记录进「今日专注」，成长可见。</p></div>' +
      '<div class="focus-presets">' + presetsHtml + '</div>' +
      '<div class="focus-custom"><input type="number" class="form-input" id="focus-custom-min" placeholder="自定义分钟" min="1" max="240" style="text-align:center">' +
      '<button class="btn btn-ghost btn-sm" onclick="LS.startFocusFromCustom()">开始</button></div>' +
      '<div class="focus-display"><div class="focus-time" id="focus-time">00:00</div>' +
      '<div class="focus-bar"><div class="focus-bar-fill" id="focus-bar-fill"></div></div></div>' +
      '<div class="focus-actions">' +
      '<button class="btn btn-primary" id="focus-toggle" onclick="LS.toggleFocus()" style="display:none">▶ 继续</button>' +
      '<button class="btn btn-ghost" onclick="LS.stopFocus();LS.closeModal()">关闭</button>' +
      '</div>' +
      '<div class="pro-disclaimer">今日专注 ' + LS.getTodayFocus() + ' 分钟 · 数据仅存本地</div>'
    );
  };

  LS.startFocusFromCustom = function () {
    const v = parseInt(document.getElementById('focus-custom-min').value);
    if (!v || v < 1 || v > 240) { LS.showToast('请输入 1-240 分钟', 'error'); return; }
    LS.startFocus(v);
  };

})(window);
