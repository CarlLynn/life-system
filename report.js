/* ============================================
 * 人生养成系统 v5.2 — report.js
 * 成长报告：周报（免费）/ 月报（PRO）
 *   - 数据聚合：任务完成 / 属性成长 / 技能经验 / 资产变化 / 成就
 *   - 规则化建议（insights）
 *   - 打印导出 PDF（print stylesheet）
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // 时间段：'week' | 'month'，返回 {start, end, label, days}
  function periodRange(type) {
    const now = new Date();
    let start, label;
    if (type === 'week') {
      // 本周一 00:00
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dow = (d.getDay() + 6) % 7; // 周一=0
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow, 0, 0, 0);
      label = '本周';
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      label = '本月';
    }
    return { start: start.getTime(), end: Date.now(), label: label, days: Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000)) };
  }

  // 生成报告数据
  function buildReport(type) {
    const range = periodRange(type);
    const state = LS.state;
    const logs = state.completionLog.filter(l => l.completedAt >= range.start && l.completedAt <= range.end);
    const taskIds = new Set(logs.map(l => l.taskId));
    const tasks = state.tasks.filter(t => taskIds.has(t.id));

    // 属性成长（按完成日志 + 任务奖励估算）
    const attrGrowth = {};
    logs.forEach(l => {
      const task = state.tasks.find(t => t.id === l.taskId);
      if (!task || !task.attributeId || !task.points) return;
      const attr = state.attributes.find(a => a.id === task.attributeId);
      if (!attr) return;
      attrGrowth[attr.name] = (attrGrowth[attr.name] || 0) + task.points;
    });

    // 技能经验
    const skillXp = {};
    logs.forEach(l => {
      const task = state.tasks.find(t => t.id === l.taskId);
      if (!task || !task.skillId || !task.xp) return;
      const skill = state.skills.find(s => s.id === task.skillId);
      if (!skill) return;
      skillXp[skill.name] = (skillXp[skill.name] || 0) + task.xp;
    });

    // 资产变化
    const txns = state.assets.transactions.filter(t => t.date >= range.start && t.date <= range.end);
    let income = 0, expense = 0;
    txns.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });

    // 按任务聚合完成次数 → Top
    const byTask = {};
    logs.forEach(l => { byTask[l.taskTitle] = (byTask[l.taskTitle] || 0) + 1; });
    const topTasks = Object.entries(byTask).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // 完成率：期内未完成的限时任务（截止日在期内）
    const startKey = LS.todayKey ? (function () {
      const d = new Date(range.start);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })() : '';
    const dueCount = state.tasks.filter(t => t.timeType === 'limited' && !t.completed && t.status !== 'abandoned' && !!LS.getTaskDueDay(t) && LS.getTaskDueDay(t) >= startKey).length;
    const completionRate = logs.length + dueCount > 0 ? Math.round(logs.length / (logs.length + dueCount) * 100) : 0;

    // 建议（规则化）
    const insights = [];
    if (logs.length === 0) insights.push({ icon: '🚀', text: '本' + (type === 'week' ? '周' : '月') + '还没有完成任务记录，从一个小任务开始吧。' });
    if (expense > income && expense > 0) insights.push({ icon: '💸', text: '支出超过收入 ' + LS.formatMoney(expense - income) + ' 元，建议复盘非必要开支。' });
    const decayingAttrs = state.attributes.filter(a => LS.isDecaying(a));
    if (decayingAttrs.length) insights.push({ icon: '⚠️', text: '属性「' + decayingAttrs.map(a => a.name).join('、') + '」正在衰减，及时完成关联任务。' });
    if (completionRate > 0 && completionRate < 50) insights.push({ icon: '🎯', text: '完成率偏低，建议减少任务数量，聚焦 1-2 个核心习惯。' });
    if (completionRate >= 80) insights.push({ icon: '🏆', text: '完成率 ' + completionRate + '%，执行力出色，可以适当增加挑战。' });
    if (income > 0 && expense > 0) insights.push({ icon: '📊', text: '储蓄率 ' + (income > 0 ? Math.round((income - expense) / income * 100) : 0) + '%，坚持记账就是最好的理财起点。' });
    if (!insights.length) insights.push({ icon: '✨', text: '继续保持，成长来自日拱一卒。' });

    return {
      type: type, label: range.label, days: range.days,
      hostName: state.host.name,
      logs: logs, taskCount: logs.length,
      tasks: tasks, attrGrowth: attrGrowth, skillXp: skillXp,
      income: income, expense: expense, net: income - expense,
      streak: state.streak, totalTasks: state.totalTasksCompleted,
      achievements: state.achievementsUnlocked.length,
      topTasks: topTasks, completionRate: completionRate,
      insights: insights, generatedAt: Date.now()
    };
  }

  // ---------- 报告弹窗 ----------
  LS.openReportModal = function (type) {
    // 月报 PRO 门控
    if (type === 'month') {
      const gate = LS.proGate('monthlyReport');
      if (!gate.ok) { LS.openUpgradeModal('monthlyReport'); return; }
    }
    const r = buildReport(type);

    let html = '<div id="report-root" class="report-sheet">' +
      '<div class="report-head">' +
      '<div class="report-logo">LIFE SYSTEM <span>· 成长报告</span></div>' +
      '<div class="report-title">' + r.label + '报告</div>' +
      '<div class="report-host">宿主 ' + LS.escapeHtml(r.hostName || '未命名') + ' · ' + r.days + ' 天 · ' + LS.formatDate(r.generatedAt) + '</div>' +
      '</div>' +

      '<div class="report-stats">' +
      '<div class="report-stat"><div class="report-stat-num">' + r.taskCount + '</div><div class="report-stat-label">完成任务</div></div>' +
      '<div class="report-stat"><div class="report-stat-num">' + r.streak + '</div><div class="report-stat-label">连续打卡</div></div>' +
      '<div class="report-stat"><div class="report-stat-num">' + r.completionRate + '%</div><div class="report-stat-label">完成率</div></div>' +
      '<div class="report-stat"><div class="report-stat-num ' + (r.net >= 0 ? 'pos' : 'neg') + '">' + (r.net >= 0 ? '+' : '') + LS.formatMoney(r.net) + '</div><div class="report-stat-label">净收支</div></div>' +
      '</div>';

    // 属性成长
    const attrEntries = Object.entries(r.attrGrowth);
    if (attrEntries.length) {
      html += '<div class="report-section"><div class="report-section-title">属性成长</div><div class="report-list">' +
        attrEntries.map(([name, pts]) => '<div class="report-row"><span>' + LS.escapeHtml(name) + '</span><span class="pos">+' + pts + '</span></div>').join('') +
        '</div></div>';
    }

    // 技能经验
    const skillEntries = Object.entries(r.skillXp);
    if (skillEntries.length) {
      html += '<div class="report-section"><div class="report-section-title">技能经验</div><div class="report-list">' +
        skillEntries.map(([name, xp]) => '<div class="report-row"><span>' + LS.escapeHtml(name) + '</span><span class="pos">+' + xp + ' XP</span></div>').join('') +
        '</div></div>';
    }

    // 资产
    if (r.income + r.expense > 0) {
      html += '<div class="report-section"><div class="report-section-title">资产流动</div><div class="report-list">' +
        '<div class="report-row"><span>收入</span><span class="pos">+' + LS.formatMoney(r.income) + '</span></div>' +
        '<div class="report-row"><span>支出</span><span class="neg">-' + LS.formatMoney(r.expense) + '</span></div>' +
        '</div></div>';
    }

    // Top 任务
    if (r.topTasks.length) {
      html += '<div class="report-section"><div class="report-section-title">最勤任务</div><div class="report-list">' +
        r.topTasks.map(([name, c]) => '<div class="report-row"><span>' + LS.escapeHtml(name) + '</span><span>×' + c + '</span></div>').join('') +
        '</div></div>';
    }

    // 洞察建议
    html += '<div class="report-section"><div class="report-section-title">行动建议</div><div class="insight-list">' +
      r.insights.map(i => '<div class="insight-row"><span class="insight-icon">' + i.icon + '</span><span>' + i.text + '</span></div>').join('') +
      '</div></div>';

    html += '<div class="report-foot">人生养成系统 v' + LS.VERSION + ' · 数据仅存于本地 · ' + LS.formatDateTime(r.generatedAt) + '</div>' +
      '</div>' +
      '<div class="report-actions">' +
      '<button class="btn btn-ghost" onclick="LS.closeModal()">关闭</button>' +
      '<button class="btn btn-primary" onclick="LS.printReport()">🖨 导出 PDF / 打印</button>' +
      '</div>';

    LS.openModal(html);
  };

  // 打印报告（仅打印报告区域）
  LS.printReport = function () {
    const root = document.getElementById('report-root');
    if (!root) return;
    const printContent = root.outerHTML;
    const win = window.open('', '_blank', 'width=760,height=900');
    if (!win) { LS.showToast('请允许弹出窗口以导出 PDF', 'error'); return; }
    win.document.write(
      '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>成长报告</title>' +
      '<style>' + printCss + '</style></head><body>' + printContent + '</body></html>'
    );
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 400);
  };

  const printCss = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;color:#1a2332;background:#fff;padding:32px;max-width:640px;margin:0 auto}
    .report-logo{font-family:monospace;font-size:11px;letter-spacing:.3em;color:#0891b2;margin-bottom:8px}
    .report-logo span{color:#94a3b8}
    .report-title{font-size:26px;font-weight:800;color:#0f172a;margin-bottom:4px}
    .report-host{font-size:12px;color:#64748b;margin-bottom:20px}
    .report-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
    .report-stat{background:#f1f5f9;border-radius:10px;padding:12px;text-align:center}
    .report-stat-num{font-size:20px;font-weight:700;color:#0f172a;font-family:monospace}
    .report-stat-num.pos{color:#059669}.report-stat-num.neg{color:#dc2626}
    .report-stat-label{font-size:10px;color:#64748b;margin-top:2px}
    .report-section{margin-bottom:18px}
    .report-section-title{font-size:13px;font-weight:700;color:#0891b2;margin-bottom:8px;border-left:3px solid #0891b2;padding-left:8px}
    .report-list{display:flex;flex-direction:column;gap:4px}
    .report-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 10px;background:#f8fafc;border-radius:6px}
    .pos{color:#059669;font-weight:600}.neg{color:#dc2626;font-weight:600}
    .insight-list{display:flex;flex-direction:column;gap:6px}
    .insight-row{display:flex;gap:8px;font-size:13px;background:#f0fdf4;border:1px solid #dcfce7;border-radius:8px;padding:8px 10px;color:#166534}
    .report-foot{font-size:10px;color:#94a3b8;margin-top:24px;text-align:center;font-family:monospace}
    @media print{body{padding:16px}}
  `;

})(window);
