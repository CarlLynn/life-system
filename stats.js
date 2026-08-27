/* ============================================
 * 人生养成系统 v5.2 — stats.js
 * 统计面板：概览 / 属性趋势 / 技能等级 / 柱状图 / 热力图
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  LS.renderStats = function () {
    const container = document.getElementById('stats-content');
    const totalTasksCompleted = LS.state.totalTasksCompleted;
    const activeTasks = LS.state.tasks.filter(t => !t.completed && t.status !== 'abandoned' && t.timeType === 'limited').length;
    const runningTasks = LS.state.tasks.filter(t => !t.completed && t.status !== 'abandoned' && t.timeType === 'unlimited').length;
    const completionRate = totalTasksCompleted > 0 ? Math.round(totalTasksCompleted / (totalTasksCompleted + activeTasks + runningTasks) * 100) : 0;

    // 近7日数据
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const entry = LS.state.taskHistory.find(h => h.date === key);
      last7Days.push({ date: key, label: (d.getMonth() + 1) + '/' + d.getDate(), count: entry ? entry.count : 0 });
    }

    // 近28日热力图
    const heatmapDays = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const entry = LS.state.taskHistory.find(h => h.date === key);
      heatmapDays.push({ date: key, count: entry ? entry.count : 0 });
    }

    // 属性趋势
    const attrTrends = LS.state.attributes.map(attr => ({
      name: attr.name, value: attr.value, level: LS.getAttrLevel(attr.value),
      decaying: LS.isDecaying(attr),
      daysSince: attr.lastIncreased ? Math.floor((Date.now() - attr.lastIncreased) / 86400000) : null,
      color: LS.ATTR_COLORS[attr.colorIndex % LS.ATTR_COLORS.length]
    }));

    // 技能列表
    const skillList = LS.state.skills.map(s => ({
      name: s.name, icon: s.icon, level: s.level,
      xp: s.xp, xpNeed: LS.xpToNext(s.level), pct: Math.min(100, Math.round(s.xp / LS.xpToNext(s.level) * 100))
    }));

    let html = '';

    // 报告 / 方案库 工具栏（v5）
    html += '<div class="stats-toolbar">' +
      '<button class="btn btn-primary btn-sm" onclick="LS.openReportModal(\'week\')">📈 周报</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="LS.openReportModal(\'month\')">📊 月报' + (LS.isPro() ? '' : ' 🔒') + '</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="LS.openTemplateModal()">📦 方案库</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="LS.openShareCardModal()">📤 分享</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="LS.openReminderModal()">⏰ 提醒</button>' +
      '</div>';

    // 概览
    html += '<div class="stats-card"><div class="stats-card-title">概览</div><div class="stats-row">' +
      '<div class="stats-mini"><div class="stats-mini-value">' + LS.state.streak + '</div><div class="stats-mini-label">连续打卡</div></div>' +
      '<div class="stats-mini"><div class="stats-mini-value">' + totalTasksCompleted + '</div><div class="stats-mini-label">累计完成</div></div>' +
      '<div class="stats-mini"><div class="stats-mini-value">' + completionRate + '%</div><div class="stats-mini-label">完成率</div></div>' +
      '<div class="stats-mini"><div class="stats-mini-value">' + LS.getTodayFocus() + '′</div><div class="stats-mini-label">今日专注</div></div>' +
      '</div></div>';

    // 近 7 日专注柱状图
    const focus7 = [];
    let maxFocus = 1;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const mins = (LS.state.focusLog || []).filter(f => f.date === key).reduce((s, f) => s + f.minutes, 0);
      focus7.push({ label: (d.getMonth() + 1) + '/' + d.getDate(), mins: mins });
      if (mins > maxFocus) maxFocus = mins;
    }
    if (focus7.some(f => f.mins > 0)) {
      html += '<div class="stats-card"><div class="stats-card-title">近7日专注（分钟）</div><div class="chart-container">' +
        '<svg width="100%" viewBox="0 0 380 120" style="max-width:400px">';
      focus7.forEach((f, i) => {
        const x = 10 + i * 52;
        const h = (f.mins / maxFocus) * 90;
        html += '<rect x="' + x + '" y="' + (110 - h) + '" width="36" height="' + h + '" rx="3" fill="var(--violet)" opacity="' + (0.4 + (f.mins / maxFocus) * 0.6) + '"></rect>' +
          '<text x="' + (x + 18) + '" y="120" text-anchor="middle" font-size="9" fill="var(--text-tertiary)" font-family="var(--font-mono)">' + f.label + '</text>' +
          (f.mins ? '<text x="' + (x + 18) + '" y="' + (104 - h) + '" text-anchor="middle" font-size="9" fill="var(--text-tertiary)" font-family="var(--font-mono)">' + f.mins + '</text>' : '');
      });
      html += '</svg></div></div>';
    }

    // 属性趋势
    html += '<div class="stats-card"><div class="stats-card-title">属性总览</div><div class="trend-list">';
    attrTrends.forEach(t => {
      let delta = '<span class="trend-delta neutral">稳定</span>';
      if (t.decaying) delta = '<span class="trend-delta down">↓ 衰减</span>';
      else if (t.daysSince !== null && t.daysSince < 3) delta = '<span class="trend-delta up">↑ 近期提升</span>';
      html += '<div class="trend-item"><span class="trend-label"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + t.color + ';margin-right:8px;box-shadow:0 0 6px ' + t.color + '"></span>' + LS.escapeHtml(t.name) + ' Lv.' + t.level + '（' + t.value + '）</span>' + delta + '</div>';
    });
    html += '</div></div>';

    // 技能总览
    if (skillList.length) {
      html += '<div class="stats-card"><div class="stats-card-title">技能等级</div><div class="trend-list">';
      skillList.forEach(s => {
        html += '<div class="trend-item"><span class="trend-label">' + s.icon + ' ' + LS.escapeHtml(s.name) + ' <span style="color:var(--violet)">Lv.' + s.level + '</span></span>' +
          '<span class="trend-delta neutral" style="font-size:0.68rem">' + s.xp + '/' + s.xpNeed + ' (' + s.pct + '%)</span></div>';
      });
      html += '</div></div>';
    }

    // 近7日柱状图
    const maxCount = Math.max.apply(null, last7Days.map(d => d.count).concat([1]));
    const chartW = 380, chartH = 150, barW = 36, barGap = 12, padL = 10, padB = 24;
        // 近6个月收支柱状图（v5.3）
    const monthRows = [];
    let maxMoney = 1;
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = d.getFullYear() + '-' + (d.getMonth() + 1);
      let inc = 0, exp = 0;
      LS.state.assets.transactions.forEach(t => {
        if (LS.getMonthKey(t.date) !== key) return;
        if (t.type === 'income') inc += t.amount; else exp += t.amount;
      });
      monthRows.push({ label: (d.getMonth() + 1) + '月', inc: inc, exp: exp });
      if (inc > maxMoney) maxMoney = inc;
      if (exp > maxMoney) maxMoney = exp;
    }
    if (monthRows.some(m => m.inc + m.exp > 0)) {
      html += '<div class="stats-card"><div class="stats-card-title">近6个月收支</div><div class="chart-container">' +
        '<svg width="100%" viewBox="0 0 380 150" style="max-width:400px">';
      monthRows.forEach((m, i) => {
        const x = 16 + i * 58;
        const hInc = (m.inc / maxMoney) * 100;
        const hExp = (m.exp / maxMoney) * 100;
        html += '<rect x="' + x + '" y="' + (112 - hInc) + '" width="20" height="' + hInc + '" rx="3" fill="var(--success)" opacity="0.75"></rect>' +
          '<rect x="' + (x + 24) + '" y="' + (112 - hExp) + '" width="20" height="' + hExp + '" rx="3" fill="var(--error)" opacity="0.75"></rect>' +
          '<text x="' + (x + 22) + '" y="128" text-anchor="middle" font-size="9" fill="var(--text-tertiary)" font-family="var(--font-mono)">' + m.label + '</text>';
      });
      html += '<text x="376" y="20" text-anchor="end" font-size="9" fill="var(--success)" font-family="var(--font-mono)">收</text>' +
        '<text x="376" y="34" text-anchor="end" font-size="9" fill="var(--error)" font-family="var(--font-mono)">支</text>' +
        '</svg></div></div>';
    }
html += '<div class="stats-card"><div class="stats-card-title">近7日任务完成</div><div class="chart-container">' +
      '<svg width="100%" viewBox="0 0 ' + chartW + ' ' + chartH + '" style="max-width:400px">';
    last7Days.forEach((d, i) => {
      const x = padL + i * (barW + barGap);
      const h = (d.count / maxCount) * (chartH - padB - 10);
      html += '<rect x="' + x + '" y="' + (chartH - padB - h) + '" width="' + barW + '" height="' + h + '" rx="3" fill="var(--accent)" opacity="' + (0.4 + (d.count / maxCount) * 0.6) + '">' +
        '<animate attributeName="height" from="0" to="' + h + '" dur="0.6s" fill="freeze"/>' +
        '<animate attributeName="y" from="' + (chartH - padB) + '" to="' + (chartH - padB - h) + '" dur="0.6s" fill="freeze"/></rect>' +
        '<text x="' + (x + barW / 2) + '" y="' + (chartH - 8) + '" text-anchor="middle" font-size="9" fill="var(--text-tertiary)" font-family="var(--font-mono)">' + d.label + '</text>' +
        (d.count ? '<text x="' + (x + barW / 2) + '" y="' + (chartH - padB - h - 4) + '" text-anchor="middle" font-size="9" fill="var(--text-tertiary)" font-family="var(--font-mono)">' + d.count + '</text>' : '');
    });
    html += '</svg></div></div>';

    // 热力图
    html += '<div class="stats-card"><div class="stats-card-title">近28日活跃热力图</div>' +
      '<div class="heatmap">' + heatmapDays.map(d => {
        let cls = 'heatmap-cell';
        if (d.count >= 4) cls += ' l4';
        else if (d.count >= 3) cls += ' l3';
        else if (d.count >= 2) cls += ' l2';
        else if (d.count >= 1) cls += ' l1';
        return '<div class="' + cls + '" title="' + d.date + ': ' + d.count + '个任务"></div>';
      }).join('') + '</div>' +
      '<div class="heatmap-legend"><span>少</span><span class="heatmap-cell"></span><span class="heatmap-cell l1"></span><span class="heatmap-cell l2"></span><span class="heatmap-cell l3"></span><span class="heatmap-cell l4"></span><span>多</span></div></div>';

    container.innerHTML = html;
  };

})(window);
