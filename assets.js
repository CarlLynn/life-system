/* ============================================
 * 人生养成系统 v5.2 — assets.js
 * 资产管理：总资产 / 月储蓄目标 / 收支记录
 * 资产日历：月视图（每日明细）/ 年视图（月度汇总）
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // 日历状态
  let assetViewMode = 'month';      // 'month' | 'year'
  let assetViewDate = new Date();   // 当前查看的年月

  const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // ---------- 聚合交易数据 ----------
  function aggregateTxns() {
    const byDay = {};    // 'YYYY-MM-DD' -> {income, expense, count}
    const byMonth = {};  // 'YYYY-M'    -> {income, expense, count}
    LS.state.assets.transactions.forEach(txn => {
      const d = new Date(txn.date);
      const dayKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const monthKey = d.getFullYear() + '-' + (d.getMonth() + 1);
      byDay[dayKey] = byDay[dayKey] || { income: 0, expense: 0, count: 0 };
      byMonth[monthKey] = byMonth[monthKey] || { income: 0, expense: 0, count: 0 };
      if (txn.type === 'income') { byDay[dayKey].income += txn.amount; byMonth[monthKey].income += txn.amount; }
      else { byDay[dayKey].expense += txn.amount; byMonth[monthKey].expense += txn.amount; }
      byDay[dayKey].count += 1;
      byMonth[monthKey].count += 1;
    });
    return { byDay: byDay, byMonth: byMonth };
  }

  // ---------- 渲染 ----------
  LS.renderAssets = function () {
    const container = document.getElementById('assets-content');
    const a = LS.state.assets;
    let balance = 0, monthlyIncome = 0, monthlyExpense = 0;
    const currentMonth = LS.getMonthKey(Date.now());
    a.transactions.forEach(txn => {
      if (txn.type === 'income') balance += txn.amount;
      else balance -= txn.amount;
      if (LS.getMonthKey(txn.date) === currentMonth) {
        if (txn.type === 'income') monthlyIncome += txn.amount;
        else monthlyExpense += txn.amount;
      }
    });
    const monthlyNet = monthlyIncome - monthlyExpense;
    const goalProgress = a.monthlyGoal > 0 ? Math.max(0, Math.min(100, monthlyNet / a.monthlyGoal * 100)) : 0;
    const goalAchieved = monthlyNet >= a.monthlyGoal;
    const sortedTxns = [...a.transactions].sort((x, y) => y.date - x.date).slice(0, 50);

    let html = '<div class="balance-card">' +
      '<div class="balance-label">总资产</div>' +
      '<div class="balance-amount"><span class="currency">¥</span>' + LS.formatMoney(balance) + '</div>' +
      '<div class="balance-monthly">本月 <span class="' + (monthlyNet >= 0 ? 'positive' : 'negative') + '">' +
      (monthlyNet >= 0 ? '+' : '') + LS.formatMoney(monthlyNet) + '</span></div></div>';

    html += '<div class="goal-card">' +
      '<div class="goal-header"><span class="goal-title">本月储蓄目标</span>' +
      '<span class="goal-amount">¥' + LS.formatMoney(monthlyNet) + ' / ¥' + a.monthlyGoal + '</span></div>' +
      '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + goalProgress + '%;background:' + (goalAchieved ? 'var(--success)' : 'var(--accent)') + '"></div></div>' +
      '<div class="goal-stats"><span>' + goalProgress.toFixed(0) + '%' + (goalAchieved ? ' · 目标达成' : '') + '</span>' +
      '<button onclick="LS.openSetGoalModal()" style="color:var(--text-tertiary);font-size:0.72rem;font-family:var(--font-mono);cursor:pointer;background:none;border:none">调整目标</button></div></div>';

    // 月支出预算（v5.3）
    const budget = a.budget || 0;
    if (budget > 0) {
      const budgetPct = Math.max(0, Math.min(100, monthlyExpense / budget * 100));
      const overBudget = monthlyExpense > budget;
      html += '<div class="goal-card' + (overBudget ? ' over' : '') + '">' +
        '<div class="goal-header"><span class="goal-title">本月支出预算</span>' +
        '<span class="goal-amount">¥' + LS.formatMoney(monthlyExpense) + ' / ¥' + LS.formatMoney(budget) + '</span></div>' +
        '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + budgetPct + '%;background:' + (overBudget ? 'var(--error)' : 'var(--violet)') + '"></div></div>' +
        '<div class="goal-stats"><span>' + (overBudget ? '⚠ 已超支 ' + LS.formatMoney(monthlyExpense - budget) + ' 元' : '预算结余 ' + LS.formatMoney(budget - monthlyExpense) + ' 元') + '</span>' +
        '<button onclick="LS.openSetBudgetModal()" style="color:var(--text-tertiary);font-size:0.72rem;font-family:var(--font-mono);cursor:pointer;background:none;border:none">设置预算</button></div></div>';
    } else {
      html += '<div class="goal-card">' +
        '<div class="goal-header"><span class="goal-title">月支出预算</span>' +
        '<span class="goal-amount" style="color:var(--text-faint)">未设置</span></div>' +
        '<div class="goal-stats"><span style="color:var(--text-faint)">设置预算，控制每月支出</span>' +
        '<button onclick="LS.openSetBudgetModal()" style="color:var(--text-tertiary);font-size:0.72rem;font-family:var(--font-mono);cursor:pointer;background:none;border:none">设置预算</button></div></div>';
    }

    // 待买清单（v5.4 对标「生活工作台」待买清单）
    html += buildTodoCard();

    // 资产日历
    html += buildCalendarHtml();

    html += '<div class="section-header"><span class="section-title">收支记录</span>' +
      '<button class="btn-icon" onclick="LS.openAddTxnModal()" title="记录收支"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="txn-list">';

    if (!sortedTxns.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">◈</div>' +
        '<div class="empty-state-text">尚无收支记录<br>点击 + 记录第一笔</div></div>';
    } else {
      sortedTxns.forEach(txn => { html += txnItemHtml(txn, true); });
    }
    html += '</div>';
    container.innerHTML = html;
  };

  // ---------- 交易行模板（列表/日历明细共用，可编辑） ----------
  function txnItemHtml(txn, showEdit) {
    let html = '<div class="txn-item"><div class="txn-left">' +
      '<div class="txn-icon ' + txn.type + '">' + (txn.type === 'income' ? '↑' : '↓') + '</div>' +
      '<div class="txn-info"><div class="txn-desc">' + LS.escapeHtml(txn.description || (txn.type === 'income' ? '收入' : '支出')) + '</div>' +
      '<div class="txn-date">' + LS.formatDateTime(txn.date) + '</div></div></div>' +
      '<div class="txn-amount ' + txn.type + '">' + (txn.type === 'income' ? '+' : '-') + '¥' + LS.formatMoney(txn.amount) + '</div>';
    if (showEdit) {
      html += '<button class="btn-icon txn-edit-btn" onclick="LS.openEditTxnModal(\'' + txn.id + '\')" title="编辑记录">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
    }
    html += '</div>';
    return html;
  }

  // ---------- 日历构建 ----------
  function buildCalendarHtml() {
    const { byDay, byMonth } = aggregateTxns();
    const year = assetViewDate.getFullYear();
    const month = assetViewDate.getMonth(); // 0-11

    let html = '<div class="stats-card calendar-card">' +
      '<div class="calendar-head">' +
      '<span class="stats-card-title" style="margin:0">资产日历</span>' +
      '<div class="calendar-toggle">' +
      '<button class="cal-tab ' + (assetViewMode === 'month' ? 'active' : '') + '" onclick="LS.switchAssetView(\'month\')">月</button>' +
      '<button class="cal-tab ' + (assetViewMode === 'year' ? 'active' : '') + '" onclick="LS.switchAssetView(\'year\')">年</button>' +
      '</div></div>';

    if (assetViewMode === 'month') {
      html += buildMonthView(year, month, byDay, byMonth);
    } else {
      html += buildYearView(year, byMonth);
    }
    html += '</div>';
    return html;
  }

  // 月视图
  function buildMonthView(year, month, byDay, byMonth) {
    const monthKey = year + '-' + (month + 1);
    const mStat = byMonth[monthKey] || { income: 0, expense: 0, count: 0 };
    const net = mStat.income - mStat.expense;

    let html = '<div class="calendar-nav">' +
      '<button class="btn-icon" onclick="LS.changeAssetMonth(-1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<span class="calendar-nav-title">' + year + '年 ' + MONTH_NAMES[month] + '</span>' +
      '<button class="btn-icon" onclick="LS.changeAssetMonth(1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '</div>';

    // 本月统计
    html += '<div class="calendar-month-stats">' +
      '<span class="cal-stat inc">收 +¥' + LS.formatMoney(mStat.income) + '</span>' +
      '<span class="cal-stat exp">支 -¥' + LS.formatMoney(mStat.expense) + '</span>' +
      '<span class="cal-stat net ' + (net >= 0 ? 'pos' : 'neg') + '">净 ' + (net >= 0 ? '+' : '') + LS.formatMoney(net) + '</span>' +
      '</div>';

    // 日历网格
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0=周日
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = LS.todayKey();

    html += '<div class="calendar-grid">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(w => { html += '<div class="cal-weekday">' + w + '</div>'; });
    for (let i = 0; i < startWeekday; i++) html += '<div class="cal-cell empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const d = byDay[key];
      const isToday = key === today;
      html += '<div class="cal-cell' + (isToday ? ' today' : '') + (d ? ' has-txn' : '') + '"' +
        (d ? ' onclick="LS.showDayTransactions(\'' + key + '\')"' : '') + '>' +
        '<div class="cal-day-num">' + day + '</div>' +
        (d ? '<div class="cal-day-inc">+' + Math.round(d.income) + '</div>' : '') +
        (d ? '<div class="cal-day-exp">-' + Math.round(d.expense) + '</div>' : '') +
        (d ? '<div class="cal-day-cnt">' + d.count + '笔</div>' : '') +
        '</div>';
    }
    html += '</div>';

    // 点击提示
    html += '<div class="cal-hint">点击有记录的日期查看当日明细</div>';
    return html;
  }

  // 年视图
  function buildYearView(year, byMonth) {
    // 计算全年最大收支用于柱状图归一化
    let maxVal = 1;
    for (let m = 1; m <= 12; m++) {
      const s = byMonth[year + '-' + m] || { income: 0, expense: 0 };
      maxVal = Math.max(maxVal, s.income, s.expense);
    }
    const currentYear = new Date().getFullYear();

    let html = '<div class="calendar-nav">' +
      '<button class="btn-icon" onclick="LS.changeAssetYear(-1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<span class="calendar-nav-title">' + year + '年 全年汇总</span>' +
      '<button class="btn-icon" onclick="LS.changeAssetYear(1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '</div>';

    // 全年汇总
    let yearIncome = 0, yearExpense = 0, yearCount = 0;
    for (let m = 1; m <= 12; m++) {
      const s = byMonth[year + '-' + m] || { income: 0, expense: 0, count: 0 };
      yearIncome += s.income; yearExpense += s.expense; yearCount += s.count;
    }
    const yearNet = yearIncome - yearExpense;
    html += '<div class="calendar-month-stats">' +
      '<span class="cal-stat inc">收 +¥' + LS.formatMoney(yearIncome) + '</span>' +
      '<span class="cal-stat exp">支 -¥' + LS.formatMoney(yearExpense) + '</span>' +
      '<span class="cal-stat net ' + (yearNet >= 0 ? 'pos' : 'neg') + '">净 ' + (yearNet >= 0 ? '+' : '') + LS.formatMoney(yearNet) + '</span>' +
      '</div>';

    // 12个月
    html += '<div class="year-list">';
    for (let m = 1; m <= 12; m++) {
      const key = year + '-' + m;
      const s = byMonth[key] || { income: 0, expense: 0, count: 0 };
      const net = s.income - s.expense;
      const incPct = Math.round(s.income / maxVal * 100);
      const expPct = Math.round(s.expense / maxVal * 100);
      const isCurrent = year === currentYear && m === new Date().getMonth() + 1;
      html += '<div class="year-row' + (isCurrent ? ' current' : '') + (s.count ? '' : ' empty') + '"' +
        (s.count ? ' onclick="LS.showMonthTransactions(\'' + key + '\')"' : '') + '>' +
        '<span class="year-row-name">' + m + '月</span>' +
        '<div class="year-row-bars">' +
        '<div class="year-bar-bar"><div class="year-bar-fill inc" style="width:' + incPct + '%"></div></div>' +
        '<div class="year-bar-bar"><div class="year-bar-fill exp" style="width:' + expPct + '%"></div></div>' +
        '</div>' +
        '<span class="year-row-net ' + (net >= 0 ? 'pos' : 'neg') + '">' + (net >= 0 ? '+' : '') + Math.round(net) + '</span>' +
        (s.count ? '<span class="year-row-cnt">' + s.count + '</span>' : '') +
        '</div>';
    }
    html += '</div>';
    html += '<div class="cal-hint">柱状条：上=收入 下=支出 · 点击月份查看当月明细</div>';
    return html;
  }

  // ---------- 待买清单 ----------
  function buildTodoCard() {
    const items = (LS.state.todoList || []).slice().sort((a, b) => (a.done === b.done ? (b.createdAt - a.createdAt) : (a.done ? 1 : -1)));
    const undone = items.filter(i => !i.done).length;
    let html = '<div class="section-header"><span class="section-title">待买清单</span>' +
      (undone ? '<span style="font-size:0.66rem;color:var(--text-faint);font-family:var(--font-mono)">剩 ' + undone + ' 项</span>' : '') +
      '<button class="btn-icon" onclick="LS.openAddTodoModal()" title="添加待买"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="todo-list">';
    if (!items.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">🛒</div><div class="empty-state-text">暂无待买清单<br>记下想买的东西，避免冲动消费</div></div>';
    } else {
      items.forEach(i => {
        html += '<div class="todo-item' + (i.done ? ' done' : '') + '">' +
          '<button class="todo-check' + (i.done ? ' on' : '') + '" onclick="LS.toggleTodo(\'' + i.id + '\')">' + (i.done ? '✓' : '') + '</button>' +
          '<span class="todo-text">' + LS.escapeHtml(i.text) + '</span>' +
          '<button class="btn-icon" onclick="LS.deleteTodo(\'' + i.id + '\')" title="删除" style="color:var(--text-tertiary)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
          '</div>';
      });
    }
    html += '</div>';
    return html;
  }

  LS.openAddTodoModal = function () {
    LS.openModal('<div class="modal-title">🛒 添加待买</div>' +
      '<div class="form-group"><label class="form-label">想买的东西</label>' +
      '<input type="text" class="form-input" id="modal-todo-text" placeholder="如：牛奶、纸巾、新键盘..." maxlength="30"></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.addTodo()">确认添加</button>');
  };

  LS.addTodo = function () {
    const text = document.getElementById('modal-todo-text').value.trim();
    if (!text) { LS.showToast('请输入内容', 'error'); return; }
    if (!LS.state.todoList) LS.state.todoList = [];
    LS.state.todoList.push({ id: LS.uid('todo'), text: text, done: false, createdAt: Date.now() });
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('已加入待买清单', 'success');
  };

  LS.toggleTodo = function (id) {
    const item = (LS.state.todoList || []).find(i => i.id === id);
    if (!item) return;
    item.done = !item.done;
    LS.saveState(); LS.renderAssets();
  };

  LS.deleteTodo = function (id) {
    LS.state.todoList = (LS.state.todoList || []).filter(i => i.id !== id);
    LS.saveState(); LS.renderAssets();
  };

  // ---------- 日历交互 ----------
  LS.switchAssetView = function (mode) {
    assetViewMode = mode;
    if (mode === 'year') assetViewDate = new Date(assetViewDate.getFullYear(), 0, 1);
    LS.renderAssets();
  };

  LS.changeAssetMonth = function (offset) {
    assetViewDate = new Date(assetViewDate.getFullYear(), assetViewDate.getMonth() + offset, 1);
    LS.renderAssets();
  };

  LS.changeAssetYear = function (offset) {
    assetViewDate = new Date(assetViewDate.getFullYear() + offset, 0, 1);
    LS.renderAssets();
  };

  // 查看某日明细
  LS.showDayTransactions = function (dayKey) {
    const txns = LS.state.assets.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === dayKey;
      })
      .sort((x, y) => y.date - x.date);
    let income = 0, expense = 0;
    txns.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    const net = income - expense;

    let list = txns.length
      ? txns.map(t => txnItemHtml(t, true)).join('')
      : '<div class="empty-state"><div class="empty-state-text">当日无收支记录</div></div>';

    LS.openModal('<div class="modal-title">' + dayKey + ' 收支明细</div>' +
      '<div class="calendar-month-stats" style="margin-bottom:var(--sp-md)">' +
      '<span class="cal-stat inc">收 +¥' + LS.formatMoney(income) + '</span>' +
      '<span class="cal-stat exp">支 -¥' + LS.formatMoney(expense) + '</span>' +
      '<span class="cal-stat net ' + (net >= 0 ? 'pos' : 'neg') + '">净 ' + (net >= 0 ? '+' : '') + LS.formatMoney(net) + '</span>' +
      '</div><div class="txn-list">' + list + '</div>');
  };

  // 查看某月明细
  LS.showMonthTransactions = function (monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const txns = LS.state.assets.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .sort((x, y) => y.date - x.date);
    let income = 0, expense = 0;
    txns.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    const net = income - expense;

    let list = txns.length
      ? txns.map(t => txnItemHtml(t, true)).join('')
      : '<div class="empty-state"><div class="empty-state-text">当月无收支记录</div></div>';

    LS.openModal('<div class="modal-title">' + year + '年' + month + '月 收支明细</div>' +
      '<div class="calendar-month-stats" style="margin-bottom:var(--sp-md)">' +
      '<span class="cal-stat inc">收 +¥' + LS.formatMoney(income) + '</span>' +
      '<span class="cal-stat exp">支 -¥' + LS.formatMoney(expense) + '</span>' +
      '<span class="cal-stat net ' + (net >= 0 ? 'pos' : 'neg') + '">净 ' + (net >= 0 ? '+' : '') + LS.formatMoney(net) + '</span>' +
      '</div><div class="txn-list">' + list + '</div>');
  };

  // ---------- 操作 ----------
  // 编辑中的交易 ID（null = 新增模式）
  let editingTxnId = null;

  function dateInputValue(ts) {
    const d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function parseDateInput(value) {
    // 将 'YYYY-MM-DD' 转成本地时间戳（用中午12点避免时区偏移）
    if (!value) return Date.now();
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return Date.now();
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime();
  }

  LS.openAddTxnModal = function () {
    LS.openModal(txnFormHtml(
      '记录收支', 'income', '', dateInputValue(), '', 'LS.addTransaction()', '确认记录'
    ));
  };

  LS.addTransaction = function () {
    const data = readTxnForm();
    if (!data) return;
    LS.state.assets.transactions.push({
      id: LS.uid('txn'),
      type: data.type, amount: data.amount,
      description: data.desc || null, date: data.date
    });
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast((data.type === 'income' ? '收入' : '支出') + '已记录', 'success');
  };

  // ---------- 编辑收支记录 ----------
  LS.openEditTxnModal = function (txnId) {
    const txn = LS.state.assets.transactions.find(t => t.id === txnId);
    if (!txn) return;
    editingTxnId = txnId;
    LS.openModal(txnFormHtml(
      '编辑收支记录', txn.type, String(txn.amount), dateInputValue(txn.date),
      txn.description || '', 'LS.updateTransaction()', '保存修改'
    ));
  };

  LS.updateTransaction = function () {
    if (!editingTxnId) return;
    const txn = LS.state.assets.transactions.find(t => t.id === editingTxnId);
    if (!txn) return;
    const data = readTxnForm();
    if (!data) return;
    txn.type = data.type;
    txn.amount = data.amount;
    txn.description = data.desc || null;
    txn.date = data.date;
    editingTxnId = null;
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('收支记录已更新', 'success');
  };

  // ---------- 交易表单模板 / 读取 ----------
  function txnFormHtml(title, type, amount, dateStr, desc, action, btnLabel) {
    return '<div class="modal-title">' + title + '</div>' +
      '<div class="form-group"><label class="form-label">类型</label>' +
      '<select class="select-input" id="modal-txn-type">' +
      '<option value="income"' + (type === 'income' ? ' selected' : '') + '>收入</option>' +
      '<option value="expense"' + (type === 'expense' ? ' selected' : '') + '>支出</option></select></div>' +
      '<div class="form-group"><label class="form-label">金额</label>' +
      '<input type="number" class="form-input" id="modal-txn-amount" value="' + LS.escapeHtml(amount) + '" placeholder="0" min="0.01" step="0.01"></div>' +
      '<div class="form-group"><label class="form-label">日期</label>' +
      '<input type="date" class="form-input" id="modal-txn-date" value="' + dateStr + '"></div>' +
      '<div class="form-group"><label class="form-label">备注</label>' +
      '<input type="text" class="form-input" id="modal-txn-desc" value="' + LS.escapeHtml(desc) + '" placeholder="如：工资、外卖..."></div>' +
      '<button class="btn btn-primary btn-block" onclick="' + action + '">' + btnLabel + '</button>';
  }

  function readTxnForm() {
    const type = document.getElementById('modal-txn-type').value;
    const amount = parseFloat(document.getElementById('modal-txn-amount').value);
    const dateEl = document.getElementById('modal-txn-date');
    const date = parseDateInput(dateEl ? dateEl.value : '');
    const desc = document.getElementById('modal-txn-desc').value.trim();
    if (!amount || amount <= 0) { LS.showToast('请输入有效金额', 'error'); return null; }
    return { type: type, amount: amount, date: date, desc: desc };
  }

  LS.openSetGoalModal = function () {
    LS.openModal('<div class="modal-title">调整储蓄目标</div>' +
      '<div class="form-group"><label class="form-label">月储蓄目标 (¥)</label>' +
      '<input type="number" class="form-input" id="modal-goal" value="' + LS.state.assets.monthlyGoal + '" min="0" step="100"></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.setGoal()">确认</button>');
  };

  LS.setGoal = function () {
    const goal = parseInt(document.getElementById('modal-goal').value);
    if (goal < 0 || isNaN(goal)) { LS.showToast('请输入有效目标', 'error'); return; }
    LS.state.assets.monthlyGoal = goal;
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('储蓄目标已更新', 'success');
  };

  // ---------- 月支出预算 ----------
  LS.openSetBudgetModal = function () {
    LS.openModal('<div class="modal-title">设置月支出预算</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.78rem">设置后每月自动统计支出与预算结余，超支会提醒。设为 0 关闭预算。</p></div>' +
      '<div class="form-group"><label class="form-label">月支出预算 (¥)</label>' +
      '<input type="number" class="form-input" id="modal-budget" value="' + (LS.state.assets.budget || '') + '" min="0" step="100" placeholder="0 = 关闭"></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.setBudget()">确认</button>');
  };

  LS.setBudget = function () {
    const v = parseInt(document.getElementById('modal-budget').value);
    if (isNaN(v) || v < 0) { LS.showToast('请输入有效预算', 'error'); return; }
    LS.state.assets.budget = v;
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast(v > 0 ? '月预算已设为 ¥' + v : '已关闭预算', 'success');
  };

})(window);
