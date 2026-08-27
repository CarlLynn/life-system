/* ============================================
 * 人生养成系统 v5.4 — health.js
 * 健康模块（对标「生活工作台」Body Trend）
 *   体重记录 / 7日均线趋势 / BMI / 目标进度
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 计算 ----------
  LS.getBmi = function (weight) {
    const h = LS.state.host.height;
    if (!h || !weight) return null;
    return (weight / Math.pow(h / 100, 2)).toFixed(1);
  };

  /** 7 日均线：返回 {date, avg} 列表（无数据返回空） */
  LS.weightMovingAvg = function () {
    const recs = (LS.state.health.records || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    if (!recs.length) return [];
    const out = [];
    for (let i = 0; i < recs.length; i++) {
      const from = Math.max(0, i - 6);
      const win = recs.slice(from, i + 1);
      const avg = win.reduce((s, r) => s + r.weight, 0) / win.length;
      out.push({ date: recs[i].date, avg: Math.round(avg * 10) / 10 });
    }
    return out;
  };

  // ---------- 渲染 ----------
  LS.renderHealth = function () {
    const container = document.getElementById('health-content');
    if (!container) return;
    const h = LS.state.health;
    const recs = (h.records || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const latest = recs[0];
    const bmi = LS.getBmi(latest ? latest.weight : (LS.state.host.weight || 0));
    const avgLine = LS.weightMovingAvg();
    const goal = h.goal || { weight: 0, fat: 0 };

    let html = '';

    // 当前指标卡
    html += '<div class="health-current">' +
      '<div class="health-stat"><div class="health-stat-num">' + (latest ? latest.weight : '—') + '</div><div class="health-stat-label">当前体重 kg</div></div>' +
      '<div class="health-stat"><div class="health-stat-num">' + (bmi || '—') + '</div><div class="health-stat-label">BMI</div></div>' +
      '<div class="health-stat"><div class="health-stat-num">' + (latest && latest.fat ? latest.fat : '—') + '</div><div class="health-stat-label">体脂 %</div></div>' +
      '<div class="health-stat"><div class="health-stat-num">' + (avgLine.length ? avgLine[avgLine.length - 1].avg : '—') + '</div><div class="health-stat-label">7日均线</div></div>' +
      '</div>';

    // 趋势图（细线=每日值，粗线=7日均线）
    if (recs.length >= 2) {
      const chart = buildTrendChart(recs, avgLine);
      html += '<div class="stats-card health-chart-card"><div class="stats-card-title">体重趋势 <span style="font-size:0.6rem;color:var(--text-faint)">细线=每日 · 粗线=7日均线</span></div>' +
        '<svg width="100%" viewBox="0 0 380 160" style="max-width:400px">' + chart + '</svg></div>';
    } else {
      html += '<div class="stats-card"><div class="stats-card-title">体重趋势</div><div class="empty-state"><div class="empty-state-icon">⚖️</div><div class="empty-state-text">记录 2 次以上体重即可查看趋势</div></div></div>';
    }

    // 目标进度
    if (goal.weight > 0 && latest) {
      const diff = Math.round((latest.weight - goal.weight) * 10) / 10;
      const pct = goal.weight > 0 ? Math.max(0, Math.min(100, Math.round((latest.weight - (recs[recs.length - 1].weight || latest.weight)) / Math.max(1, latest.weight - goal.weight) * 100))) : 0;
      html += '<div class="goal-card" style="margin-bottom:var(--sp-lg)">' +
        '<div class="goal-header"><span class="goal-title">体重目标</span>' +
        '<span class="goal-amount">' + latest.weight + ' → ' + goal.weight + ' kg</span></div>' +
        '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + Math.min(100, Math.max(0, pct)) + '%;background:var(--green, var(--accent))"></div></div>' +
        '<div class="goal-stats"><span>' + (diff === 0 ? '🎉 目标达成' : (diff > 0 ? '还需减 ' + diff + ' kg' : '已超目标 ' + Math.abs(diff) + ' kg')) + '</span>' +
        '<button onclick="LS.openHealthGoalModal()" style="color:var(--text-tertiary);font-size:0.72rem;font-family:var(--font-mono);cursor:pointer;background:none;border:none">调整目标</button></div></div>';
    }

    // 记录列表 + 新增
    html += '<div class="section-header"><span class="section-title">身体记录</span>' +
      '<button class="btn-icon" onclick="LS.openAddHealthModal()" title="记录体重"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="txn-list">';
    if (!recs.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">⚖️</div><div class="empty-state-text">尚无身体记录<br>点击 + 记录今日体重</div></div>';
    } else {
      recs.slice(0, 30).forEach(r => {
        html += '<div class="txn-item"><div class="txn-left"><div class="txn-icon income">⚖️</div>' +
          '<div class="txn-info"><div class="txn-desc">' + r.weight + ' kg' + (r.fat ? ' · 体脂 ' + r.fat + '%' : '') + '</div>' +
          '<div class="txn-date">' + r.date + (LS.getBmi(r.weight) ? ' · BMI ' + LS.getBmi(r.weight) : '') + '</div></div></div>' +
          '<button class="btn-icon txn-edit-btn" onclick="LS.deleteHealthRecord(\'' + r.id + '\')" title="删除" style="color:var(--text-tertiary)">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>';
      });
    }
    html += '</div>';

    container.innerHTML = html;
  };

  function buildTrendChart(recs, avgLine) {
    const W = 380, H = 160, padL = 30, padR = 10, padT = 12, padB = 22;
    const weights = recs.map(r => r.weight);
    const min = Math.min.apply(null, weights) - 1, max = Math.max.apply(null, weights) + 1;
    const range = (max - min) || 1;
    const x = i => padL + i * (W - padL - padR) / Math.max(1, recs.length - 1);
    const y = w => padT + (max - w) / range * (H - padT - padB);

    let html = '';
    // 网格线
    for (let g = 0; g <= 2; g++) {
      const gy = padT + g * (H - padT - padB) / 2;
      const gw = max - range * g / 2;
      html += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="var(--border-subtle)" stroke-width="1"/>' +
        '<text x="' + (padL - 4) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="8" fill="var(--text-faint)" font-family="var(--font-mono)">' + Math.round(gw * 10) / 10 + '</text>';
    }
    // 每日值折线
    const pts = recs.map((r, i) => x(i) + ',' + y(r.weight)).join(' ');
    html += '<polyline points="' + pts + '" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.7"/>';
    // 7日均线
    if (avgLine.length >= 2) {
      const avgPts = avgLine.map((a, i) => x(i) + ',' + y(a.avg)).join(' ');
      html += '<polyline points="' + avgPts + '" fill="none" stroke="var(--violet)" stroke-width="2.4"/>';
    }
    // 点 + 日期标签
    recs.forEach((r, i) => {
      if (i % Math.ceil(recs.length / 4) === 0 || i === recs.length - 1) {
        html += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="8" fill="var(--text-faint)" font-family="var(--font-mono)">' + r.date.slice(5) + '</text>';
      }
    });
    return html;
  }

  // ---------- 操作 ----------
  LS.openAddHealthModal = function () {
    const today = LS.todayKey();
    LS.openModal('<div class="modal-title">⚖️ 记录身体数据</div>' +
      '<div class="form-group"><label class="form-label">日期</label>' +
      '<input type="date" class="form-input" id="modal-health-date" value="' + today + '"></div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">体重 (kg)</label>' +
      '<input type="number" class="form-input" id="modal-health-weight" placeholder="如 70.5" min="20" max="300" step="0.1"></div>' +
      '<div class="form-group"><label class="form-label">体脂 %（可选）</label>' +
      '<input type="number" class="form-input" id="modal-health-fat" placeholder="如 18" min="3" max="60" step="0.1"></div></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.addHealthRecord()">保存记录</button>');
  };

  LS.addHealthRecord = function () {
    const weight = parseFloat(document.getElementById('modal-health-weight').value);
    if (!weight || weight < 20 || weight > 300) { LS.showToast('请输入有效体重', 'error'); return; }
    const dateEl = document.getElementById('modal-health-date');
    const date = dateEl && dateEl.value ? dateEl.value : LS.todayKey();
    const fatEl = document.getElementById('modal-health-fat');
    const fat = fatEl && fatEl.value ? parseFloat(fatEl.value) : null;
    // 同一天覆盖
    if (!LS.state.health) LS.state.health = { records: [], goal: { weight: 0, fat: 0 } };
    const exist = LS.state.health.records.find(r => r.date === date);
    if (exist) { exist.weight = weight; exist.fat = fat; }
    else LS.state.health.records.push({ id: LS.uid('h'), date: date, weight: weight, fat: fat });
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('身体记录已保存', 'success');
  };

  LS.deleteHealthRecord = function (id) {
    LS.state.health.records = LS.state.health.records.filter(r => r.id !== id);
    LS.saveState(); LS.renderHealth();
    LS.showToast('记录已删除');
  };

  LS.openHealthGoalModal = function () {
    const g = LS.state.health.goal || { weight: 0, fat: 0 };
    LS.openModal('<div class="modal-title">🎯 健康目标</div>' +
      '<div class="form-row">' +
      '<div class="form-group"><label class="form-label">目标体重 (kg)</label>' +
      '<input type="number" class="form-input" id="modal-goal-weight" value="' + (g.weight || '') + '" min="20" max="300" step="0.1" placeholder="0=关闭"></div>' +
      '<div class="form-group"><label class="form-label">目标体脂 %</label>' +
      '<input type="number" class="form-input" id="modal-goal-fat" value="' + (g.fat || '') + '" min="3" max="60" step="0.1" placeholder="0=关闭"></div></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.setHealthGoal()">保存</button>');
  };

  LS.setHealthGoal = function () {
    const w = parseFloat(document.getElementById('modal-goal-weight').value) || 0;
    const f = parseFloat(document.getElementById('modal-goal-fat').value) || 0;
    LS.state.health.goal = { weight: w, fat: f };
    LS.saveState(); LS.closeModal(); LS.renderHealth();
    LS.showToast('健康目标已更新', 'success');
  };

})(window);
