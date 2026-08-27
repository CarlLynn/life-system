/* ============================================
 * 人生养成系统 v5.2 — app.js
 * 入口：数据导出/导入 / CSV / 快照备份 / 重置 / 启动
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 数据导出（JSON 备份） ----------
  LS.exportData = function () {
    const data = JSON.stringify(LS.state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'life-system-backup-' + LS.todayKey() + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    LS.showToast('数据导出成功', 'success');
  };

  // ---------- 数据导入 ----------
  LS.triggerImport = function () {
    document.getElementById('import-file-input').click();
  };

  LS.importData = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        LS.showConfirm('导入数据', '导入将覆盖当前所有数据（宿主、属性、技能、任务、资产）。确定继续？', function () {
          // 以 v5 默认状态为基底深度合并，保证字段完整
          LS.state = LS.deepMerge(LS.defaultState(), imported);
          // 任务模型迁移/规范化（兼容 v2/v3/v4 备份）
          LS.migrateTasksToV4(LS.state);
          if (!LS.state.skills || !LS.state.skills.length) {
            LS.state.skills = [{ id: 'skill-read', name: '阅读', icon: '📖', level: 1, xp: 0, description: '通过阅读类任务获得经验', unlockedAt: Date.now() }];
          }
          if (!LS.state.pro) LS.state.pro = { active: false, plan: null, activatedAt: null };
          if (!Array.isArray(LS.state.backups)) LS.state.backups = [];
          LS.saveState();
          LS.renderAll();
          LS.showToast('数据导入成功', 'success');
        });
      } catch (err) {
        LS.showToast('文件格式错误，请选择有效的备份文件', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // ---------- 资产 CSV 导出 ----------
  LS.exportTxnCsv = function () {
    const txns = LS.state.assets.transactions;
    if (!txns.length) { LS.showToast('暂无收支记录可导出', 'warning'); return; }
    const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = ['类型,金额,备注,日期'];
    [...txns].sort((a, b) => a.date - b.date).forEach(t => {
      lines.push([t.type === 'income' ? '收入' : '支出', t.amount, t.description || '', LS.formatDateTime(t.date)].map(esc).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'life-system-assets-' + LS.todayKey() + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    LS.showToast('收支记录已导出 CSV', 'success');
  };

  // ---------- 快照备份（PRO） ----------
  const SNAPSHOT_MAX_FREE = 1;   // 免费版 1 个
  const SNAPSHOT_MAX_PRO = 5;    // PRO 5 个

  LS.openBackupModal = function () {
    if (!LS.isPro()) { LS.openUpgradeModal('snapshots'); return; }
    const backups = [...LS.state.backups].sort((a, b) => b.at - a.at);
    const max = SNAPSHOT_MAX_PRO;

    let html = '<div class="modal-title">💾 快照备份</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.8rem">本地版本化备份：创建快照后，可随时恢复到任意时间点（最多保留 ' + max + ' 份）。</p></div>' +
      '<button class="btn btn-primary btn-block" style="margin-bottom:var(--sp-md)" onclick="LS.createSnapshot()">＋ 创建快照</button>' +
      '<div class="snapshot-list">';

    if (!backups.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">💾</div>' +
        '<div class="empty-state-text">暂无快照<br>建议每周创建一个</div></div>';
    } else {
      backups.forEach(b => {
        const size = Math.round(JSON.stringify(b.data).length / 1024 * 10) / 10;
        html += '<div class="snapshot-item">' +
          '<div class="snapshot-info"><div class="snapshot-label">' + LS.escapeHtml(b.label || '快照') + '</div>' +
          '<div class="snapshot-meta">' + LS.formatDateTime(b.at) + ' · ' + size + ' KB</div></div>' +
          '<div class="snapshot-actions">' +
          '<button class="btn btn-sm btn-primary" onclick="LS.restoreSnapshot(\'' + b.id + '\')">恢复</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="LS.deleteSnapshot(\'' + b.id + '\')">删除</button>' +
          '</div></div>';
      });
    }
    html += '</div>';
    LS.openModal(html);
  };

  LS.createSnapshot = function () {
    if (!LS.isPro()) { LS.openUpgradeModal('snapshots'); return; }
    LS.state.backups.push({
      id: LS.uid('snap'), at: Date.now(),
      label: '快照 ' + (LS.state.backups.length + 1),
      data: JSON.stringify(LS.state)
    });
    // 超出上限移除最旧
    while (LS.state.backups.length > SNAPSHOT_MAX_PRO) LS.state.backups.shift();
    LS.saveState();
    LS.openBackupModal();
    LS.showToast('快照已创建', 'success');
  };

  LS.restoreSnapshot = function (id) {
    const snap = LS.state.backups.find(b => b.id === id);
    if (!snap) return;
    // 保留现有快照列表：恢复数据不覆盖备份
    const currentBackups = LS.state.backups.slice();
    LS.showConfirm('恢复快照', '将用「' + snap.label + '」（' + LS.formatDateTime(snap.at) + '）覆盖当前数据，不可撤销。确定继续？', function () {
      try {
        LS.state = LS.deepMerge(LS.defaultState(), JSON.parse(snap.data));
        LS.migrateTasksToV4(LS.state);
        const merged = currentBackups.concat(LS.state.backups || []);
        const seen = new Set();
        LS.state.backups = merged.filter(b => (seen.has(b.id) ? false : (seen.add(b.id), true)));
        LS.saveState();
        LS.renderAll();
        LS.showToast('已恢复到 ' + snap.label, 'success');
      } catch (err) {
        LS.showToast('快照数据损坏，无法恢复', 'error');
      }
    }, '确认恢复');
  };

  LS.deleteSnapshot = function (id) {
    LS.state.backups = LS.state.backups.filter(b => b.id !== id);
    LS.saveState();
    LS.openBackupModal();
    LS.showToast('快照已删除');
  };

  // ---------- 重置 ----------
  LS.confirmReset = function () {
    LS.showConfirm('重置系统', '此操作将清除所有数据（宿主、属性、技能、任务、资产），不可撤销！', function () {
      LS.resetState();
      location.reload();
    }, '确认重置');
  };

  // ---------- 启动 ----------
  function init() {
    LS.loadState();
    if (!LS.state.installedAt) { LS.state.installedAt = Date.now(); LS.saveState(); }
    LS.applyTheme();
    LS.runLoadingSequence();
  }

  // 模块全部加载后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
