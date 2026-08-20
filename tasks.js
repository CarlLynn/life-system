/* ============================================
 * 人生养成系统 v4.0 — tasks.js
 * 任务系统 v4：
 *   - 分类：主线/支线/每日/周限/月限/年限
 *   - 类型：限时（日限/周限/月限/年限）/ 不限时
 *   - 重复任务：每日重复次日刷新，周/月/年限类推
 *   - 任务日历：记录每日完成/未完成 + 不限时任务新建/完成
 *   - 完成记录：所有完成任务的次数与日期
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  let taskCalDate = new Date();   // 任务日历当前查看的年月
  const collapsedGroups = new Set(); // 树状分组折叠状态

  const TASK_GROUP_ORDER = ['main', 'side', 'daily', 'weekly', 'monthly', 'yearly'];

  function dateKeyOf(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ============================================
  // 重复任务刷新（渲染前调用）
  // ============================================
  LS.refreshRepeatTasks = function () {
    let changed = false;
    LS.state.tasks.forEach(t => {
      if (LS.isRepeatDue(t)) {
        LS.resetRepeatTask(t);
        changed = true;
      }
    });
    if (changed) LS.saveState();
  };

  // ============================================
  // 渲染任务界面（日历 + 树状任务列表）
  // ============================================
  LS.renderTasks = function () {
    LS.refreshRepeatTasks();
    const container = document.getElementById('tasks-content');

    let html =
      // 顶部：完成记录入口
      '<div class="tasks-topbar" style="justify-content:flex-end">' +
      '<button class="btn-ghost btn-sm log-btn" onclick="LS.openCompletionLog()">📜 完成记录</button>' +
      '</div>' +

      // 任务日历
      buildTaskCalendarHtml() +

      // 树状任务列表
      buildTaskTreeHtml();

    container.innerHTML = html;
  };

  // ============================================
  // 树状任务列表（按分类分组，可折叠）
  // ============================================
  function buildTaskTreeHtml() {
    let html = '<div class="section-header" style="margin-top:var(--sp-lg)"><span class="section-title">任务列表</span>' +
      '<button class="btn-icon" onclick="LS.openAddTaskModal()" title="新建任务"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="task-tree">';
    let hasAny = false;

    TASK_GROUP_ORDER.forEach(cat => {
      const tasks = LS.state.tasks.filter(t => t.category === cat);
      if (!tasks.length) return;
      hasAny = true;
      const collapsed = collapsedGroups.has(cat);
      const sorted = [...tasks].sort((a, b) => statusWeight(a) - statusWeight(b) || b.createdAt - a.createdAt);
      html += '<div class="task-group' + (collapsed ? ' collapsed' : '') + '">' +
        '<button class="task-group-header" onclick="LS.toggleTaskGroup(\'' + cat + '\')">' +
        '<span class="task-group-arrow">' + (collapsed ? '▸' : '▾') + '</span>' +
        '<span class="task-group-name">' + (LS.TASK_CATEGORIES[cat] || cat) + '</span>' +
        '<span class="task-group-count">' + tasks.length + '</span>' +
        '</button>' +
        '<div class="task-group-body"' + (collapsed ? ' style="display:none"' : '') + '">' +
        sorted.map(buildTaskItem).join('') +
        '</div></div>';
    });

    if (!hasAny) {
      html += '<div class="empty-state"><div class="empty-state-icon">◈</div>' +
        '<div class="empty-state-text">尚无任务<br>点击 + 创建你的第一个任务</div></div>';
    }
    html += '</div>';
    return html;
  }

  LS.toggleTaskGroup = function (cat) {
    if (collapsedGroups.has(cat)) collapsedGroups.delete(cat);
    else collapsedGroups.add(cat);
    LS.renderTasks();
  };

  function statusWeight(t) {
    if (t.completed) return 2;
    if (t.status === 'abandoned') return 2;
    return 0;
  }

  // ============================================
  // 任务卡片
  // ============================================
  function buildTaskItem(task) {
    const isOverdue = LS.isTaskOverdue(task);
    const isUnlimited = task.timeType === 'unlimited';
    const isAbandoned = task.status === 'abandoned';
    const cls = ['task-item', task.completed ? 'completed' : '', isOverdue ? 'overdue' : '',
      isUnlimited ? 'continuous' : '', isAbandoned ? 'abandoned' : ''].filter(Boolean).join(' ');

    // 状态徽章
    let statusBadge = '';
    if (task.completed) statusBadge = '<span class="task-status-badge completed">已完成</span>';
    else if (isAbandoned) statusBadge = '<span class="task-status-badge" style="color:var(--text-tertiary);border-color:var(--border)">已放弃</span>';
    else if (isOverdue) statusBadge = '<span class="task-status-badge overdue">已超时</span>';
    else statusBadge = isUnlimited
      ? '<span class="task-status-badge running">进行中</span>'
      : '<span class="task-status-badge" style="color:var(--accent);border-color:var(--accent-dim);background:var(--accent-glow)">待完成</span>';

    // 分类徽章 + 类型 + 重复
    const badges = ['<span class="task-badge cat-' + task.category + '">' + (LS.TASK_CATEGORIES[task.category] || task.category) + '</span>'];
    if (isUnlimited) badges.push('<span class="task-badge unlimited">不限时</span>');
    else badges.push('<span class="task-badge limited">限时</span>');
    if (task.repeat) badges.push('<span class="task-badge repeat">🔁 重复</span>');
    if (task.completionCount > 1) badges.push('<span class="task-badge count">×' + task.completionCount + '</span>');

    // 奖励
    const rewards = [];
    const attr = LS.state.attributes.find(a => a.id === task.attributeId);
    if (attr && task.points > 0) rewards.push('<span class="reward-attr">' + LS.escapeHtml(attr.name) + ' <span class="plus">+' + task.points + '</span></span>');
    const skill = LS.state.skills.find(s => s.id === task.skillId);
    if (skill && task.xp > 0) rewards.push('<span class="reward-skill">' + LS.escapeHtml(skill.name) + '经验 <span class="plus">+' + task.xp + '</span></span>');
    if (task.customReward) rewards.push('<span class="reward-custom">🎁 ' + LS.escapeHtml(task.customReward) + '</span>');
    const rewardsHtml = rewards.length ? '<span class="task-reward">' + rewards.join(' · ') + '</span>' : '';

    // 截止信息
    let dueInfo = '';
    if (!task.completed && !isAbandoned) {
      if (isUnlimited) {
        dueInfo = '<span class="task-due unlimited">开始于 ' + dateKeyOf(task.startDate || task.createdAt) + '</span>';
      } else {
        const due = LS.getTaskDueDay(task);
        if (due) {
          if (isOverdue) dueInfo = '<span class="task-due overdue">截止 ' + due + '（已超时）</span>';
          else dueInfo = '<span class="task-due">截止 ' + due + '</span>';
        }
      }
    } else if (task.completed) {
      dueInfo = '<span class="task-due done">完成于 ' + dateKeyOf(task.completedAt) + '</span>';
    }

    // 操作
    let actions = '';
    if (!task.completed && !isAbandoned) {
      actions += '<button class="btn-icon" onclick="LS.openCompleteTaskModal(\'' + task.id + '\')" title="完成" style="color:var(--success);border-color:oklch(80% 0.15 155 / 0.3)">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>';
      if (isUnlimited) {
        actions += '<button class="btn-icon" onclick="LS.abandonTask(\'' + task.id + '\')" title="放弃任务" style="color:var(--text-tertiary);border-color:var(--border)">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
      }
    }
    actions += '<button class="btn-icon danger" onclick="LS.deleteTask(\'' + task.id + '\')" title="删除">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>';

    return '<div class="' + cls + '">' +
      '<div class="task-item-top"><div class="task-title">' + LS.escapeHtml(task.title) + '</div>' +
      '<div class="task-actions">' + actions + '</div></div>' +
      '<div class="task-bottom">' + badges.join('') + statusBadge + '</div>' +
      '<div class="task-bottom" style="margin-top:4px">' + rewardsHtml + dueInfo + '</div>' +
      (task.note ? '<div class="task-note">📝 ' + LS.escapeHtml(task.note) + '</div>' : '') +
      '</div>';
  }

  // ============================================
  // 任务日历（月视图）
  // ============================================
  function buildTaskCalendarHtml() {
    const year = taskCalDate.getFullYear();
    const month = taskCalDate.getMonth();

    // 聚合数据
    const doneByDay = {};   // dateKey -> count（完成任务数）
    LS.state.completionLog.forEach(log => {
      const k = dateKeyOf(log.completedAt);
      doneByDay[k] = (doneByDay[k] || 0) + 1;
    });
    const failedByDay = {}; // dateKey -> count（未完成任务数，实时聚合）
    LS.state.tasks.forEach(t => {
      if (t.completed || t.status === 'abandoned' || t.timeType === 'unlimited') return;
      const due = LS.getTaskDueDay(t);
      if (due) failedByDay[due] = (failedByDay[due] || 0) + 1;
    });
    const createdUnByDay = {}; // 不限时任务新建
    const doneUnByDay = {};    // 不限时任务完成
    LS.state.tasks.forEach(t => {
      if (t.timeType !== 'unlimited') return;
      const ck = dateKeyOf(t.startDate || t.createdAt);
      createdUnByDay[ck] = (createdUnByDay[ck] || 0) + 1;
      if (t.completed && t.completedAt) {
        const dk = dateKeyOf(t.completedAt);
        doneUnByDay[dk] = (doneUnByDay[dk] || 0) + 1;
      }
    });

    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = LS.todayKey();
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    // 本月汇总
    let mDone = 0, mFailed = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const k = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      mDone += doneByDay[k] || 0;
      mFailed += failedByDay[k] || 0;
    }

    let html = '<div class="stats-card calendar-card task-calendar">' +
      '<div class="calendar-head"><span class="stats-card-title" style="margin:0">任务日历</span>' +
      '<div class="calendar-toggle"><button class="cal-tab active">月</button></div></div>' +
      '<div class="calendar-nav">' +
      '<button class="btn-icon" onclick="LS.changeTaskCalMonth(-1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<span class="calendar-nav-title">' + year + '年 ' + monthNames[month] + '</span>' +
      '<button class="btn-icon" onclick="LS.changeTaskCalMonth(1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '</div>' +
      '<div class="calendar-month-stats">' +
      '<span class="cal-stat inc">✓ 完成 ' + mDone + '</span>' +
      '<span class="cal-stat exp">✗ 未完成 ' + mFailed + '</span>' +
      '</div>' +
      '<div class="calendar-grid">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(w => { html += '<div class="cal-weekday">' + w + '</div>'; });
    for (let i = 0; i < startWeekday; i++) html += '<div class="cal-cell empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const k = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const done = doneByDay[k] || 0;
      const failed = failedByDay[k] || 0;
      const createdUn = createdUnByDay[k] || 0;
      const doneUn = doneUnByDay[k] || 0;
      const hasInfo = done || failed || createdUn || doneUn;
      const isToday = k === today;
      // 内容合并为最多 3 行，防止窄屏格子重叠
      const line1 = (done || failed) ? '<span class="cal-done">✓' + done + '</span><span class="cal-fail">✗' + failed + '</span>' : '';
      const line2 = (createdUn || doneUn) ? '<span class="cal-un">⚡' + createdUn + '</span><span class="cal-doneun">✅' + doneUn + '</span>' : '';
      html += '<div class="cal-cell' + (isToday ? ' today' : '') + (hasInfo ? ' has-txn' : '') + '"' +
        (hasInfo ? ' onclick="LS.showTaskDayDetails(\'' + k + '\')"' : '') + '>' +
        '<div class="cal-day-num">' + day + '</div>' +
        (line1 ? '<div class="cal-line">' + line1 + '</div>' : '') +
        (line2 ? '<div class="cal-line">' + line2 + '</div>' : '') +
        '</div>';
    }
    html += '</div>' +
      '<div class="cal-hint">✓完成 ✗未完成 ⚡不限时新建 ✅不限时完成 · 点击查看详情</div>' +
      '</div>';
    return html;
  }

  LS.changeTaskCalMonth = function (offset) {
    taskCalDate = new Date(taskCalDate.getFullYear(), taskCalDate.getMonth() + offset, 1);
    LS.renderTasks();
  };

  // 某日详情
  LS.showTaskDayDetails = function (dateKey) {
    const completedLogs = LS.state.completionLog.filter(l => dateKeyOf(l.completedAt) === dateKey);
    const failedTasks = LS.state.tasks.filter(t =>
      !t.completed && t.status !== 'abandoned' && t.timeType === 'limited' && LS.getTaskDueDay(t) === dateKey
    );
    const createdUn = LS.state.tasks.filter(t => t.timeType === 'unlimited' && dateKeyOf(t.startDate || t.createdAt) === dateKey);
    const doneUn = LS.state.tasks.filter(t => t.timeType === 'unlimited' && t.completed && dateKeyOf(t.completedAt) === dateKey);

    let html = '<div class="modal-title">' + dateKey + ' 任务记录</div>';
    html += '<div class="calendar-month-stats" style="margin-bottom:var(--sp-md)">' +
      '<span class="cal-stat inc">✓ 完成 ' + completedLogs.length + '</span>' +
      '<span class="cal-stat exp">✗ 未完成 ' + failedTasks.length + '</span>' +
      '<span class="cal-stat" style="color:var(--accent);border-color:var(--accent-dim)">⚡ 新建 ' + createdUn.length + '</span>' +
      '</div>';

    if (completedLogs.length) {
      html += '<div class="section-header"><span class="section-title">完成的任务</span></div><div class="txn-list">';
      completedLogs.forEach(l => {
        html += '<div class="txn-item"><div class="txn-left"><div class="txn-icon income">✓</div>' +
          '<div class="txn-info"><div class="txn-desc">' + LS.escapeHtml(l.taskTitle) + '</div>' +
          '<div class="txn-date">' + LS.formatDateTime(l.completedAt) + '</div></div></div></div>';
      });
      html += '</div>';
    }
    if (failedTasks.length) {
      html += '<div class="section-header"><span class="section-title">未完成任务</span></div><div class="txn-list">';
      failedTasks.forEach(t => {
        html += '<div class="txn-item"><div class="txn-left"><div class="txn-icon expense">✗</div>' +
          '<div class="txn-info"><div class="txn-desc">' + LS.escapeHtml(t.title) + '</div>' +
          '<div class="txn-date">' + (LS.TASK_CATEGORIES[t.category] || '') + ' · 限时未完成</div></div></div></div>';
      });
      html += '</div>';
    }
    if (createdUn.length || doneUn.length) {
      html += '<div class="section-header"><span class="section-title">不限时任务</span></div><div class="txn-list">';
      createdUn.forEach(t => {
        html += '<div class="txn-item"><div class="txn-left"><div class="txn-icon income" style="background:var(--accent-glow);color:var(--accent)">⚡</div>' +
          '<div class="txn-info"><div class="txn-desc">' + LS.escapeHtml(t.title) + '</div>' +
          '<div class="txn-date">新建</div></div></div></div>';
      });
      doneUn.forEach(t => {
        html += '<div class="txn-item"><div class="txn-left"><div class="txn-icon income" style="background:var(--violet-glow);color:var(--violet)">✅</div>' +
          '<div class="txn-info"><div class="txn-desc">' + LS.escapeHtml(t.title) + '</div>' +
          '<div class="txn-date">完成</div></div></div></div>';
      });
      html += '</div>';
    }
    if (!completedLogs.length && !failedTasks.length && !createdUn.length && !doneUn.length) {
      html += '<div class="empty-state"><div class="empty-state-text">当日无任务记录</div></div>';
    }
    LS.openModal(html);
  };

  // ============================================
  // 完成记录界面（跳转）
  // ============================================
  LS.openCompletionLog = function () {
    // 按任务聚合
    const group = {};
    LS.state.completionLog.forEach(log => {
      if (!group[log.taskId]) group[log.taskId] = { title: log.taskTitle, count: 0, lastAt: 0, logs: [] };
      group[log.taskId].count += 1;
      if (log.completedAt > group[log.taskId].lastAt) group[log.taskId].lastAt = log.completedAt;
      group[log.taskId].logs.push(log);
    });
    const entries = Object.values(group).sort((a, b) => b.lastAt - a.lastAt);
    const total = LS.state.completionLog.length;

    let html = '<div class="modal-title">完成记录</div>' +
      '<div class="calendar-month-stats" style="margin-bottom:var(--sp-md)">' +
      '<span class="cal-stat inc">✓ 累计完成 ' + total + ' 次</span>' +
      '<span class="cal-stat net">共 ' + entries.length + ' 个任务</span>' +
      '</div>' +
      '<div class="completion-list">';

    if (!entries.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">📜</div>' +
        '<div class="empty-state-text">暂无完成记录<br>完成任务后这里会记录每一次完成</div></div>';
    } else {
      entries.forEach(e => {
        const isRepeat = e.count > 1;
        html += '<div class="completion-item">' +
          '<div class="completion-main">' +
          '<div class="completion-title">' + LS.escapeHtml(e.title) +
          (isRepeat ? ' <span class="completion-count">×' + e.count + '</span>' : '') + '</div>' +
          '<div class="completion-date">最近完成 ' + LS.formatDateTime(e.lastAt) + '</div>' +
          '</div>' +
          '<div class="completion-toggle" onclick="this.parentElement.classList.toggle(\'open\')">' +
          '<span class="completion-arrow">▾</span></div>' +
          (isRepeat ? '<div class="completion-detail">' + e.logs
            .sort((a, b) => b.completedAt - a.completedAt)
            .map(l => '<div class="completion-line">· ' + LS.formatDateTime(l.completedAt) + '</div>').join('') +
            '</div>' : '') +
          '</div>';
      });
    }
    html += '</div>';
    LS.openModal(html);
  };

  // ============================================
  // 新建任务
  // ============================================
  LS.openAddTaskModal = function () {
    const attrOptions = LS.state.attributes.map(a => '<option value="' + a.id + '">' + LS.escapeHtml(a.name) + '</option>').join('');
    const skillOptions = LS.state.skills.map(s => '<option value="' + s.id + '">' + LS.escapeHtml(s.name) + '</option>').join('');
    LS.openModal(
      '<div class="modal-title">新建任务</div>' +
      '<div class="form-group"><label class="form-label">任务名称</label>' +
      '<input type="text" class="form-input" id="modal-task-title" placeholder="如：读完《百年孤独》..." maxlength="30"></div>' +

      '<div class="form-group"><label class="form-label">任务分类</label>' +
      '<select class="select-input" id="modal-task-category" onchange="LS.onTaskCategoryChange()">' +
      '<option value="main">主线任务</option><option value="side">支线任务</option>' +
      '<option value="daily">每日任务</option><option value="weekly">周限任务</option>' +
      '<option value="monthly">月限任务</option><option value="yearly">年限任务</option></select></div>' +

      // 主线/支线：类型选择（限时/不限时）
      '<div id="task-time-type-wrap"><div class="form-group"><label class="form-label">任务类型</label>' +
      '<select class="select-input" id="modal-task-timeType" onchange="LS.onTaskCategoryChange()">' +
      '<option value="unlimited">不限时（一直进行，完成或放弃结束）</option>' +
      '<option value="limited">限时</option></select></div>' +
      '<div id="task-due-wrap" style="display:none"><div class="form-group"><label class="form-label">截止日期</label>' +
      '<input type="date" class="form-input" id="modal-task-due"></div></div></div>' +

      // 周期分类：重复开关
      '<div id="task-repeat-wrap" style="display:none"><div class="form-group">' +
      '<div class="checkbox-row"><input type="checkbox" id="modal-task-repeat"><span class="checkbox-label">重复性任务</span>' +
      '<span class="checkbox-sub">完成后自动刷新，重新进行</span></div>' +
      '<div class="checkbox-sub" style="margin-top:6px;color:var(--text-faint)" id="task-repeat-hint">每日任务完成后次日刷新；周限/月限/年限类推</div></div></div>' +

      '<div class="form-group"><label class="form-label">开始日期（显示在任务日历）</label>' +
      '<input type="date" class="form-input" id="modal-task-start"></div>' +

      '<div class="form-group"><label class="form-label">属性奖励（可选）</label>' +
      '<div class="form-row" style="grid-template-columns:1fr 1fr">' +
      '<select class="select-input" id="modal-task-attr"><option value="">无</option>' + attrOptions + '</select>' +
      '<input type="number" class="form-input" id="modal-task-points" placeholder="点数" min="0" max="1000" value="0"></div></div>' +

      '<div class="form-group"><label class="form-label">技能经验奖励（可选）</label>' +
      '<div class="form-row" style="grid-template-columns:1fr 1fr">' +
      '<select class="select-input" id="modal-task-skill"><option value="">无</option>' + skillOptions + '</select>' +
      '<input type="number" class="form-input" id="modal-task-xp" placeholder="经验" min="0" max="1000" value="0"></div></div>' +

      '<div class="form-group"><label class="form-label">自定义奖励（可选）</label>' +
      '<input type="text" class="form-input" id="modal-task-reward" placeholder="如：奶茶一杯、游戏1小时..." maxlength="30"></div>' +

      '<button class="btn btn-primary btn-block" onclick="LS.addTask()">确认创建</button>'
    );
    // 默认开始日期 = 今天
    const now = new Date();
    document.getElementById('modal-task-start').value =
      now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  };

  LS.onTaskCategoryChange = function () {
    const catEl = document.getElementById('modal-task-category');
    if (!catEl) return;
    const category = catEl.value;
    const isCycle = LS.isCycleCategory(category);
    const timeTypeWrap = document.getElementById('task-time-type-wrap');
    const repeatWrap = document.getElementById('task-repeat-wrap');
    if (isCycle) {
      // 周期任务：限时 + 显示重复开关
      if (timeTypeWrap) timeTypeWrap.style.display = 'none';
      if (repeatWrap) repeatWrap.style.display = 'block';
      const hint = document.getElementById('task-repeat-hint');
      if (hint) {
        const labels = { daily: '每日任务完成后次日刷新', weekly: '周限任务完成后7天后刷新', monthly: '月限任务完成后下月1日刷新', yearly: '年限任务完成后次年1月1日刷新' };
        hint.textContent = labels[category] || '';
      }
    } else {
      // 主线/支线：显示类型选择 + 截止日期（若选限时）
      if (timeTypeWrap) timeTypeWrap.style.display = 'block';
      if (repeatWrap) repeatWrap.style.display = 'none';
      const tt = document.getElementById('modal-task-timeType');
      const dueWrap = document.getElementById('task-due-wrap');
      if (dueWrap) dueWrap.style.display = (tt && tt.value === 'limited') ? 'block' : 'none';
    }
  };

  LS.addTask = function () {
    const title = document.getElementById('modal-task-title').value.trim();
    if (!title) { LS.showToast('请输入任务名称', 'error'); return; }
    const category = document.getElementById('modal-task-category').value;
    const isCycle = LS.isCycleCategory(category);
    const timeType = isCycle ? 'limited' : document.getElementById('modal-task-timeType').value;
    const repeat = isCycle ? document.getElementById('modal-task-repeat').checked : false;
    const startEl = document.getElementById('modal-task-start');
    const startDate = startEl && startEl.value ? parseDate(startEl.value) : Date.now();
    const dueDate = (timeType === 'limited' && !isCycle && document.getElementById('modal-task-due').value)
      ? parseDate(document.getElementById('modal-task-due').value) : null;

    const attributeId = document.getElementById('modal-task-attr').value || null;
    const points = parseInt(document.getElementById('modal-task-points').value) || 0;
    const skillId = document.getElementById('modal-task-skill').value || null;
    const xp = parseInt(document.getElementById('modal-task-xp').value) || 0;
    const customReward = document.getElementById('modal-task-reward').value.trim() || null;

    if (!attributeId && !skillId && !customReward) { LS.showToast('请至少设置一种奖励', 'error'); return; }
    if (attributeId && points <= 0) { LS.showToast('属性奖励需填写点数', 'error'); return; }
    if (skillId && xp <= 0) { LS.showToast('技能奖励需填写经验值', 'error'); return; }

    LS.state.tasks.push({
      id: LS.uid('task'), title: title,
      category: category, timeType: timeType,
      limitType: isCycle ? category : null,
      repeat: repeat,
      startDate: startDate, dueDate: dueDate,
      attributeId: attributeId, points: points,
      skillId: skillId, xp: xp, customReward: customReward,
      completed: false, status: 'active', note: null,
      createdAt: Date.now(), completedAt: null,
      completionCount: 0, lastCompletedAt: null, nextResetAt: null
    });
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('任务已创建', 'success');
  };

  function parseDate(value) {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return Date.now();
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime();
  }

  // ============================================
  // 完成任务
  // ============================================
  LS.openCompleteTaskModal = function (taskId) {
    const task = LS.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    LS.openModal('<div class="modal-title">完成任务</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.85rem">确认已完成：<strong>' + LS.escapeHtml(task.title) + '</strong></p></div>' +
      '<div class="form-group"><label class="form-label">完成备注（可选）</label>' +
      '<textarea class="form-textarea" id="modal-task-note" placeholder="简单记录你的行动过程..." maxlength="200"></textarea></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.completeTask(\'' + taskId + '\')">确认完成</button>');
  };

  LS.completeTask = function (taskId) {
    const task = LS.state.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;
    const noteEl = document.getElementById('modal-task-note');
    const now = Date.now();
    task.completed = true;
    task.completedAt = now;
    task.status = 'completed';
    task.note = noteEl ? noteEl.value.trim() || null : null;
    task.completionCount += 1;
    task.lastCompletedAt = now;
    // 重复任务：设置下次刷新时间
    if (task.repeat) task.nextResetAt = LS.getTaskNextResetAt(task);

    // 发放奖励
    const rewards = [];
    if (task.attributeId && task.points > 0) {
      const attr = LS.state.attributes.find(a => a.id === task.attributeId);
      if (attr) { attr.value += task.points; attr.lastIncreased = now; rewards.push(attr.name + ' +' + task.points); }
    }
    if (task.skillId && task.xp > 0) {
      const skill = LS.state.skills.find(s => s.id === task.skillId);
      if (skill) { LS.gainSkillXp(skill.id, task.xp); rewards.push(skill.name + '经验 +' + task.xp); }
    }
    if (task.customReward) rewards.push('获得「' + task.customReward + '」');

    // 记录完成明细
    LS.state.completionLog.push({ id: LS.uid('log'), taskId: task.id, taskTitle: task.title, completedAt: now });

    LS.recordTaskCompletion();
    LS.checkAchievements();
    LS.burstConfetti();
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('任务完成！' + (rewards.length ? rewards.join('，') : ''), 'success');
  };

  // ============================================
  // 放弃 / 删除
  // ============================================
  LS.abandonTask = function (taskId) {
    const task = LS.state.tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;
    LS.showConfirm('放弃任务', '确定放弃「' + task.title + '」？放弃后任务将停止，不会获得任何奖励。', function () {
      task.status = 'abandoned';
      LS.saveState(); LS.renderTasks();
      LS.showToast('任务已放弃', 'warning');
    });
  };

  LS.deleteTask = function (id) {
    const task = LS.state.tasks.find(t => t.id === id);
    if (!task) return;
    LS.showConfirm('删除任务', '确定删除「' + task.title + '」？其完成记录将一并清除。', function () {
      LS.state.tasks = LS.state.tasks.filter(t => t.id !== id);
      LS.state.completionLog = LS.state.completionLog.filter(l => l.taskId !== id);
      LS.saveState(); LS.renderAll();
      LS.showToast('任务已删除');
    });
  };

  // ============================================
  // 超时提醒
  // ============================================
  LS.checkOverdueTasks = function () {
    const overdue = LS.state.tasks.filter(t => LS.isTaskOverdue(t));
    if (overdue.length) {
      setTimeout(function () { LS.showToast('⚠ ' + overdue.length + ' 个任务超时未完成', 'error'); }, 800);
    }
  };

})(window);
