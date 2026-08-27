/* ============================================
 * 人生养成系统 v5.2 — system.js
 * 属性系统 / 衰退机制 / 成就 / 系统主页渲染
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 属性衰退 ----------
  LS.applyDecay = function () {
    const now = Date.now();
    let changed = false;
    LS.state.attributes.forEach(attr => {
      if (!attr.lastIncreased) return;
      const daysSince = (now - attr.lastIncreased) / 86400000;
      if (daysSince > LS.DECAY_DAYS) {
        const decayPoints = Math.floor(daysSince - LS.DECAY_DAYS) * LS.DECAY_RATE;
        if (decayPoints > 0) {
          attr.value = Math.max(0, attr.value - decayPoints);
          changed = true;
        }
      }
    });
    if (changed) LS.saveState();
  };

  LS.isDecaying = function (attr) {
    if (!attr.lastIncreased) return false;
    return (Date.now() - attr.lastIncreased) / 86400000 > LS.DECAY_DAYS;
  };

  // ---------- 连续打卡 ----------
  LS.updateStreak = function () {
    const today = LS.todayKey();
    if (!LS.state.lastActiveDate) { LS.state.streak = 0; LS.state.lastActiveDate = today; return; }
    if (LS.state.lastActiveDate === today) return;
    const last = new Date(LS.state.lastActiveDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / 86400000);
    if (diffDays === 1) LS.state.streak += 1;
    else if (diffDays > 1) LS.state.streak = 0;
    LS.state.lastActiveDate = today;
    LS.saveState();
  };

  LS.recordTaskCompletion = function () {
    const today = LS.todayKey();
    LS.updateStreak();
    let entry = LS.state.taskHistory.find(h => h.date === today);
    if (entry) entry.count += 1;
    else LS.state.taskHistory.push({ date: today, count: 1 });
    LS.state.totalTasksCompleted += 1;
  };

  // ---------- 成就 ----------
  LS.checkAchievements = function () {
    let newUnlocks = false;
    LS.ACHIEVEMENTS.forEach(ach => {
      if (!LS.state.achievementsUnlocked.includes(ach.id) && ach.check(LS.state)) {
        LS.state.achievementsUnlocked.push(ach.id);
        newUnlocks = true;
        LS.showToast('🏆 解锁成就：' + ach.name, 'success');
      }
    });
    if (newUnlocks) LS.saveState();
  };

  // ---------- 系统主页渲染（属性 + 成就，无行为列表） ----------
  LS.renderSystem = function () {
    const container = document.getElementById('system-content');
    const h = LS.state.host;
    const daysLived = LS.getDaysLived(h.age);
    const daysRemaining = LS.TOTAL_LIFE_DAYS - daysLived;
    const lifeProgress = (daysLived / LS.TOTAL_LIFE_DAYS * 100).toFixed(1);
    const bmi = (h.weight / Math.pow(h.height / 100, 2)).toFixed(1);

    let html = '';
    // 宿主卡片（可编辑）
    html += '<div class="host-card"><div class="host-card-top">' +
      '<div class="host-avatar">' + LS.escapeHtml(h.name.charAt(0)) + '</div>' +
      '<div style="flex:1;min-width:0"><div class="host-name">' + LS.escapeHtml(h.name) + '</div>' +
      '<div class="host-meta">' + LS.escapeHtml(h.gender) + ' · ' + h.age + '岁 · 绑定于 ' + LS.formatDate(h.boundAt) + '</div></div>' +
      '<button class="btn-icon" onclick="LS.openEditHostModal()" title="编辑宿主信息">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
      '</div>' +
      '<div class="host-info-grid">' +
      '<div class="host-info-item"><div class="host-info-value">' + h.height + '</div><div class="host-info-label">身高 cm</div></div>' +
      '<div class="host-info-item"><div class="host-info-value">' + h.weight + '</div><div class="host-info-label">体重 kg</div></div>' +
      '<div class="host-info-item"><div class="host-info-value">' + bmi + '</div><div class="host-info-label">BMI</div></div>' +
      '</div></div>';

    // 今日聚焦插槽（today.js 填充）
    html += '<div id="today-slot"></div>';

    // 人生进度
    html += '<div class="life-progress">' +
      '<div class="life-progress-header"><span class="life-progress-title">人生进度</span>' +
      '<span class="life-progress-days">' + daysLived.toLocaleString() + ' / ' + LS.TOTAL_LIFE_DAYS.toLocaleString() + ' 天</span></div>' +
      '<div class="life-progress-bar"><div class="life-progress-fill" style="width:' + lifeProgress + '%"></div></div>' +
      '<div class="life-progress-stats"><span>已度过 ' + lifeProgress + '%</span><span>剩余 ' + daysRemaining.toLocaleString() + ' 天</span></div></div>';

    // 宿主状态评分（v5.3 参考「生活工作台」今日概览）
    html += buildScoreCard();

    // 连续打卡
    if (LS.state.streak > 0) {
      html += '<div class="streak-banner has-streak"><div class="streak-info">' +
        '<span class="streak-fire">🔥</span><div><div class="streak-number">' + LS.state.streak + '</div>' +
        '<div class="streak-label">连续打卡天数</div></div></div>' +
        '<div style="font-size:0.75rem;color:var(--text-tertiary)">保持行动</div></div>';
    }

    // 属性面板（仅完成任务可提升）
    html += '<div class="section-header"><span class="section-title">属性面板</span>' +
      '<button class="btn-icon" onclick="LS.openAddAttrModal()" title="添加属性"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="attr-list">';
    LS.state.attributes.forEach(attr => {
      const color = LS.ATTR_COLORS[attr.colorIndex % LS.ATTR_COLORS.length];
      const level = LS.getAttrLevel(attr.value);
      const progress = LS.getAttrProgress(attr.value);
      const decaying = LS.isDecaying(attr);
      html += '<div class="attr-item ' + (decaying ? 'decaying' : '') + '">' +
        (decaying ? '<div class="attr-decay-tag">衰减中</div>' : '') +
        '<div class="attr-top"><div class="attr-name-wrap"><span class="attr-dot" style="background:' + color + ';color:' + color + '"></span>' +
        '<span class="attr-name">' + LS.escapeHtml(attr.name) + '</span></div><span class="attr-level">Lv.' + level + '</span></div>' +
        '<div class="attr-bar"><div class="attr-bar-fill" style="width:' + progress + '%;background:' + color + ';color:' + color + '"></div></div>' +
        '<div class="attr-bottom"><span>' + progress + ' / 100</span><span>总计 ' + attr.value + '</span></div></div>';
    });
    html += '</div>';

    // 技能面板插槽（由 skills.js 填充，位于属性与成就之间）
    html += '<div id="skills-slot"></div>';

    // 成就徽章
    html += '<div class="section-header"><span class="section-title">成就徽章</span></div><div class="achievement-grid">';
    LS.ACHIEVEMENTS.forEach(ach => {
      const unlocked = LS.state.achievementsUnlocked.includes(ach.id);
      html += '<div class="achievement-card ' + (unlocked ? 'unlocked' : 'locked') + '">' +
        '<div class="achievement-icon">' + ach.icon + '</div>' +
        '<div class="achievement-name">' + ach.name + '</div>' +
        '<div class="achievement-desc">' + ach.desc + '</div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
  };

  // ---------- 宿主状态评分（今日概览） ----------
  LS.computeScore = function () {
    // 四维：习惯完成 / 成长指数 / 财务健康 / 行动力
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      last7.push(key);
    }
    const done7 = last7.reduce((s, k) => s + ((LS.state.taskHistory.find(h => h.date === k) || {}).count || 0), 0);
    const habit = Math.min(100, LS.state.streak * 8 + done7 * 6);

    const totalLevels = LS.state.attributes.reduce((s, a) => s + LS.getAttrLevel(a.value), 0);
    const growth = Math.min(100, totalLevels * 5 + LS.state.skills.reduce((s, k) => s + (k.level - 1), 0) * 3);

    const a = LS.state.assets;
    const currentMonth = LS.getMonthKey(Date.now());
    let income = 0, expense = 0;
    a.transactions.forEach(t => {
      if (LS.getMonthKey(t.date) !== currentMonth) return;
      if (t.type === 'income') income += t.amount; else expense += t.amount;
    });
    const net = income - expense;
    const finance = a.monthlyGoal > 0 ? Math.max(0, Math.min(100, net / a.monthlyGoal * 100)) : (a.transactions.length ? 60 : 50);

    const todayKey = LS.todayKey();
    const todayCount = ((LS.state.taskHistory.find(h => h.date === todayKey) || {}).count || 0);
    const focus = LS.getTodayFocus ? LS.getTodayFocus() : 0;
    const energy = Math.min(100, todayCount * 25 + focus / 5);

    const dims = [
      { label: '习惯完成', value: Math.round(habit) },
      { label: '成长指数', value: Math.round(growth) },
      { label: '财务健康', value: Math.round(finance) },
      { label: '行动力', value: Math.round(energy) }
    ];
    const total = Math.round(dims.reduce((s, d) => s + d.value, 0) / dims.length);
    const text = total >= 85 ? '状态极佳，乘胜追击' :
      total >= 70 ? '状态平稳，适合完成一件重要的小事' :
      total >= 50 ? '状态一般，从一个小任务开始' :
      '需要一次重启，今晚早点休息';
    return { total: total, dims: dims, text: text };
  };

  function buildScoreCard() {
    const s = LS.computeScore();
    const dimsHtml = s.dims.map(d =>
      '<div class="score-dim"><div class="score-dim-top"><span>' + d.label + '</span><b>' + d.value + '</b></div>' +
      '<div class="score-dim-bar"><div class="score-dim-fill" style="width:' + d.value + '%"></div></div></div>'
    ).join('');
    return '<div class="score-card">' +
      '<div class="score-main"><div class="score-ring" style="--score:' + s.total + '"><div class="score-num">' + s.total + '</div><div class="score-label">/100</div></div>' +
      '<div class="score-text"><div class="score-text-title">今日状态评分</div>' +
      '<div class="score-text-desc">' + s.text + '</div></div></div>' +
      '<div class="score-dims">' + dimsHtml + '</div></div>';
  }

  // ---------- 宿主信息编辑 ----------
  LS.openEditHostModal = function () {
    const h = LS.state.host;
    LS._editGender = h.gender;
    LS.openModal('<div class="modal-title">编辑宿主信息</div>' +
      '<div class="form-group"><label class="form-label">姓名</label>' +
      '<input type="text" class="form-input" id="modal-host-name" value="' + LS.escapeHtml(h.name) + '" maxlength="20"></div>' +
      '<div class="form-group"><label class="form-label">性别</label>' +
      '<div class="gender-select">' +
      '<div class="gender-option' + (h.gender === '男' ? ' selected' : '') + '" data-gender="男" onclick="LS.selectGenderInModal(\'男\')">男</div>' +
      '<div class="gender-option' + (h.gender === '女' ? ' selected' : '') + '" data-gender="女" onclick="LS.selectGenderInModal(\'女\')">女</div>' +
      '</div></div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">年龄</label><input type="number" class="form-input" id="modal-host-age" value="' + h.age + '" min="1" max="150"></div>' +
      '<div class="form-group"><label class="form-label">身高 (cm)</label><input type="number" class="form-input" id="modal-host-height" value="' + h.height + '" min="50" max="300"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">体重 (kg)</label><input type="number" class="form-input" id="modal-host-weight" value="' + h.weight + '" min="10" max="500"></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.saveHostInfo()">保存修改</button>');
  };

  LS.selectGenderInModal = function (gender) {
    LS._editGender = gender;
    document.querySelectorAll('#modal-body .gender-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.gender === gender);
    });
  };

  LS.saveHostInfo = function () {
    const name = document.getElementById('modal-host-name').value.trim();
    const age = parseInt(document.getElementById('modal-host-age').value);
    const height = parseInt(document.getElementById('modal-host-height').value);
    const weight = parseInt(document.getElementById('modal-host-weight').value);
    if (!name) { LS.showToast('请输入姓名', 'error'); return; }
    if (!LS._editGender) { LS.showToast('请选择性别', 'error'); return; }
    if (!age || age < 1 || age > 150) { LS.showToast('请输入有效年龄', 'error'); return; }
    if (!height || height < 50 || height > 300) { LS.showToast('请输入有效身高', 'error'); return; }
    if (!weight || weight < 10 || weight > 500) { LS.showToast('请输入有效体重', 'error'); return; }
    LS.state.host.name = name;
    LS.state.host.gender = LS._editGender;
    LS.state.host.age = age;
    LS.state.host.height = height;
    LS.state.host.weight = weight;
    LS.saveState();
    LS.closeModal();
    LS.renderAll();
    LS.showToast('宿主信息已更新', 'success');
  };

  // ---------- 属性操作 ----------
  LS.openAddAttrModal = function () {
    LS.openModal('<div class="modal-title">添加自定义属性</div>' +
      '<div class="form-group"><label class="form-label">属性名称</label>' +
      '<input type="text" class="form-input" id="modal-attr-name" placeholder="如：意志力、创造力..." maxlength="10"></div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.78rem">属性值只能通过完成任务获得提升</p></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.addAttribute()">确认添加</button>');
  };

  LS.addAttribute = function () {
    const name = document.getElementById('modal-attr-name').value.trim();
    if (!name) { LS.showToast('请输入属性名称', 'error'); return; }
    // 免费版数量限制
    const limit = LS.checkCustomLimit('attr');
    if (!limit.ok) { LS.showToast(limit.msg, 'error'); LS.openUpgradeModal('attrLimit'); return; }
    LS.state.attributes.push({
      id: LS.uid('attr'), name: name, value: 0,
      colorIndex: LS.state.attributes.length, lastIncreased: null
    });
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('属性「' + name + '」已添加', 'success');
  };

})(window);
