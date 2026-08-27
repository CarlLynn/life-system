/* ============================================
 * 人生养成系统 v5.2 — boot.js
 * 加载序列 / 屏幕路由 / 绑定流程
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 屏幕路由 ----------
  LS.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    // 底部导航仅主界面显示（加载/绑定流程隐藏）
    const nav = document.getElementById('app-nav');
    if (nav) nav.classList.toggle('visible', id === 'screen-main');
  };

  // ---------- 加载序列 ----------
  LS.runLoadingSequence = function () {
    const log = document.getElementById('loading-log');
    const bar = document.getElementById('loading-bar');
    // 加载屏版本号跟随 LS.VERSION
    const verEl = document.getElementById('loading-version');
    if (verEl) verEl.textContent = 'v' + LS.VERSION + ' · 宿主养成终端';
    const messages = [
      { text: '正在初始化系统核心 v' + LS.VERSION + '...', ok: false },
      { text: '检测宿主绑定信息...', ok: false },
      { text: LS.state.bound ? '绑定信息已确认' : '未检测到绑定记录', ok: LS.state.bound },
      { text: LS.state.bound ? '加载属性、技能与任务模块...' : '准备绑定流程...', ok: false }
    ];
    if (LS.state.bound && LS.isPro()) messages.push({ text: 'PRO 特权已生效', ok: true });
    messages.push({ text: '系统就绪', ok: true });
    setTimeout(function () { bar.style.width = '100%'; }, 100);
    messages.forEach(function (msg, i) {
      setTimeout(function () {
        log.innerHTML = '';
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerHTML = '> ' + LS.escapeHtml(msg.text) + (msg.ok ? ' <span class="ok">[OK]</span>' : '');
        log.appendChild(line);
      }, 300 + i * 400);
    });
    setTimeout(function () {
      if (LS.state.bound) {
        LS.applyDecay();
        LS.enterMainApp();
      } else {
        LS.showScreen('screen-binding');
      }
    }, 300 + messages.length * 400 + 600);
  };

  // ---------- 绑定流程 ----------
  LS.bindingNext = function (currentStep) {
    const steps = document.querySelectorAll('.binding-step');
    const dots = document.querySelectorAll('.binding-progress-dot');
    steps.forEach(s => s.classList.remove('active'));
    if (currentStep <= 3) {
      dots[currentStep - 1].classList.remove('active');
      dots[currentStep - 1].classList.add('done');
      dots[currentStep].classList.add('active');
    }
    const next = document.querySelector('.binding-step[data-step="' + (currentStep + 1) + '"]');
    if (next) next.classList.add('active');
  };
  LS.goToBindingForm = function () { LS.bindingNext(3); };

  LS.selectGender = function (gender) {
    document.querySelectorAll('.gender-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.gender === gender);
    });
    LS._gender = gender;
  };

  LS.completeBinding = function () {
    const name = document.getElementById('input-name').value.trim();
    const age = parseInt(document.getElementById('input-age').value);
    const height = parseInt(document.getElementById('input-height').value);
    const weight = parseInt(document.getElementById('input-weight').value);
    if (!name) { LS.showToast('请输入宿主姓名', 'error'); return; }
    if (!LS._gender) { LS.showToast('请选择性别', 'error'); return; }
    if (!age || age < 1 || age > 150) { LS.showToast('请输入有效年龄', 'error'); return; }
    if (!height || height < 50 || height > 300) { LS.showToast('请输入有效身高', 'error'); return; }
    if (!weight || weight < 10 || weight > 500) { LS.showToast('请输入有效体重', 'error'); return; }

    LS.state.bound = true;
    LS.state.host = { name: name, gender: LS._gender, age: age, height: height, weight: weight, boundAt: Date.now() };
    LS.state.lastActiveDate = LS.todayKey();
    // 解锁技能默认状态
    LS.state.skills.forEach(s => { if (!s.unlockedAt) s.unlockedAt = Date.now(); });
    LS.saveState();

    const bs = document.getElementById('screen-binding');
    bs.innerHTML = '<div class="bind-success"><div class="bind-ring">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent)"><path d="M20 6L9 17l-5-5"/></svg>' +
      '</div><div class="bind-success-text">绑定成功</div><div class="bind-success-sub">正在进入系统...</div></div>';
    LS.checkAchievements();
    setTimeout(function () { LS.enterMainApp(); }, 2200);
  };

  // ---------- 主界面入口 ----------
  LS.enterMainApp = function () {
    LS.showScreen('screen-main');
    LS.applyTheme();
    LS.updateStreak();
    LS.renderAll();
    LS.checkOverdueTasks();
    LS.startReminderLoop();
    LS.showInstallBanner();
    setTimeout(function () { LS.openNewbieGuide(); }, 1200);
  };

  LS.renderAll = function () {
    LS.renderSystem();
    LS.renderToday();
    LS.renderSkills();
    LS.renderTasks();
    LS.renderAssets();
    LS.renderStats();
    LS.renderHealth();
    LS.renderLibrary();
    LS.renderSettings();
    LS.renderProBadge();
  };

  // ---------- 设置页 ----------
  LS.toggleSettings = function () {
    const v = document.getElementById('view-settings');
    if (v && v.classList.contains('active')) {
      LS.switchView('system');
      return;
    }
    LS.openSettings();
  };

  LS.openSettings = function () {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    const el = document.getElementById('view-settings');
    if (el) el.classList.add('active');
    const btn = document.getElementById('settings-btn');
    if (btn) btn.classList.add('active');
    document.getElementById('header-title').innerHTML = '系统设置 <span>v' + LS.VERSION + '</span>';
    document.getElementById('header-sub').textContent = 'PREFERENCES';
    document.getElementById('header-sub').setAttribute('data-name', '设置');
    LS.renderSettings();
  };

  // ---------- 视图切换 ----------
  LS.switchView = function (view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const sb = document.getElementById('settings-btn');
    if (sb) sb.classList.remove('active');
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');
    const nav = document.querySelector('.nav-item[data-view="' + view + '"]');
    if (nav) nav.classList.add('active');
    const titles = { system: '今日 · 人生养成', tasks: '日程安排', assets: '账本管理', stats: '数据统计', health: '健康管理', library: '书影音收藏' };
    const subs = { system: 'SYSTEM CORE', tasks: 'SCHEDULE', assets: 'LEDGER', stats: 'ANALYTICS', health: 'BODY TREND', library: 'COLLECTION' };
    document.getElementById('header-title').innerHTML = '人生养成系统 <span>v' + LS.VERSION + '</span>';
    document.getElementById('header-sub').textContent = subs[view] || 'SYSTEM';
    document.getElementById('header-sub').setAttribute('data-name', titles[view] || '');
  };

})(window);
