/* ============================================
 * 人生养成系统 v5.8 — core.js
 * 常量 / 工具函数 / 成就定义
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 常量 ----------
  LS.VERSION = '5.8';
  LS.STORAGE_KEY = 'life-system-v5'; // 实际定义在 state.js（含旧 key 迁移）
  LS.DECAY_DAYS = 7;      // 属性衰减：超过7天未提升
  LS.DECAY_RATE = 1;      // 每天衰减点数
  LS.TOTAL_LIFE_DAYS = 36500;
  LS.XP_PER_LEVEL = 100;  // 技能每级所需经验基数（递增）

  // 属性配色（科技青/紫/蓝系）
  LS.ATTR_COLORS = [
    'oklch(75% 0.12 235)', 'oklch(72% 0.17 300)', 'oklch(80% 0.15 155)',
    'oklch(82% 0.15 85)',  'oklch(70% 0.13 265)', 'oklch(75% 0.14 330)',
    'oklch(78% 0.11 195)', 'oklch(70% 0.15 15)'
  ];

  // 技能图标池
  LS.SKILL_ICONS = ['⚔️','📖','🧘','🏃','🎨','🎵','💻','🔬','🗣️','🧠','✍️','🎯'];

  // 成就定义
  LS.ACHIEVEMENTS = [
    { id: 'streak-7',   name: '七日坚持',   desc: '连续7天完成至少1个任务', icon: '🔥', check: s => s.streak >= 7 },
    { id: 'streak-30',  name: '月度坚毅',   desc: '连续30天完成任务',       icon: '⚡', check: s => s.streak >= 30 },
    { id: 'streak-100', name: '百日筑基',   desc: '连续100天不中断',        icon: '💎', check: s => s.streak >= 100 },
    { id: 'task-50',    name: '任务达人',   desc: '累计完成50个任务',       icon: '🏅', check: s => s.totalTasksCompleted >= 50 },
    { id: 'task-200',   name: '行动大师',   desc: '累计完成200个任务',      icon: '👑', check: s => s.totalTasksCompleted >= 200 },
    { id: 'attr-10',    name: '初露锋芒',   desc: '任意属性达到Lv.10',      icon: '⭐', check: s => s.attributes.some(a => LS.getAttrLevel(a.value) >= 10) },
    { id: 'attr-50',    name: '大成之境',   desc: '任意属性达到Lv.50',      icon: '🌟', check: s => s.attributes.some(a => LS.getAttrLevel(a.value) >= 50) },
    { id: 'skill-5',    name: '技艺小成',   desc: '任意技能达到Lv.5',       icon: '🔮', check: s => s.skills.some(k => k.level >= 5) },
    { id: 'skill-10',   name: '宗师风范',   desc: '任意技能达到Lv.10',      icon: '🏆', check: s => s.skills.some(k => k.level >= 10) },
    { id: 'bind',       name: '契约绑定',   desc: '完成宿主绑定',           icon: '🤝', check: s => s.bound }
  ];

  // ---------- 工具函数 ----------
  LS.uid = function (prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
  };

  LS.getAttrLevel = function (value) { return Math.floor(value / 100) + 1; };
  LS.getAttrProgress = function (value) { return value % 100; };

  /** 技能所需经验：下一级经验 = 100 * level（递增） */
  LS.xpToNext = function (level) { return LS.XP_PER_LEVEL * level; };

  LS.formatMoney = function (n) {
    return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  LS.formatDate = function (ts) {
    const d = new Date(ts);
    return d.getMonth() + 1 + '月' + d.getDate() + '日';
  };

  LS.formatDateTime = function (ts) {
    const d = new Date(ts);
    return (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  };

  LS.getDaysLived = function (age) { return age * 365; };
  LS.getMonthKey = function (ts) { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1); };
  LS.todayKey = function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  LS.escapeHtml = function (str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /** ===== 任务分类 / 类型 标签（v4） ===== */
  LS.TASK_CATEGORIES = {
    main: '主线任务', side: '支线任务',
    daily: '每日任务', weekly: '周限任务', monthly: '月限任务', yearly: '年限任务'
  };
  LS.TIME_TYPE_LABELS = { limited: '限时', unlimited: '不限时' };

  /** 分类是否周期型（可重复） */
  LS.isCycleCategory = function (category) {
    return category === 'daily' || category === 'weekly' || category === 'monthly' || category === 'yearly';
  };

  /**
   * 限时任务的应完成日（dateKey），不限时返回 null
   * daily: 开始当天 | weekly: 开始+6天 | monthly: 当月最后一天 | yearly: 当年12-31
   * 主线/支线限时: 使用 dueDate
   */
  LS.getTaskDueDay = function (task) {
    if (task.timeType === 'unlimited') return null;
    const start = new Date(task.startDate || task.createdAt);
    if ((task.category === 'main' || task.category === 'side') && task.dueDate) {
      const d = new Date(task.dueDate);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const y = start.getFullYear(), m = start.getMonth();
    switch (task.limitType || task.category) {
      case 'daily': {
        const d = new Date(start);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      case 'weekly': {
        const d = new Date(start); d.setDate(d.getDate() + 6);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      case 'monthly': {
        const last = new Date(y, m + 1, 0);
        return last.getFullYear() + '-' + String(last.getMonth() + 1).padStart(2, '0') + '-' + String(last.getDate()).padStart(2, '0');
      }
      case 'yearly': {
        return y + '-12-31';
      }
      default: return null;
    }
  };

  /** 限时任务是否超时（未完成且已过应完成日）；不限时/已完成永不超时 */
  LS.isTaskOverdue = function (task) {
    if (!task || task.completed || task.status === 'abandoned') return false;
    if (task.timeType === 'unlimited') return false;
    const due = LS.getTaskDueDay(task);
    if (!due) return false;
    return due < LS.todayKey();
  };

  /**
   * 重复任务完成后的下次刷新时间戳（次日/下7天/下月1日/次年1月1日 00:00）
   * 非重复任务返回 null
   */
  LS.getTaskNextResetAt = function (task) {
    if (!task.repeat || task.timeType !== 'limited') return null;
    const base = task.lastCompletedAt || task.completedAt || Date.now();
    const d = new Date(base);
    const cycle = task.limitType || task.category;
    switch (cycle) {
      case 'daily': { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0); return r.getTime(); }
      case 'weekly': { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 0, 0, 0); return r.getTime(); }
      case 'monthly': { const r = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0); return r.getTime(); }
      case 'yearly': { const r = new Date(d.getFullYear() + 1, 0, 1, 0, 0, 0); return r.getTime(); }
      default: return null;
    }
  };

  /** 重复任务是否到了刷新时间（已完成且过了下次刷新点） */
  LS.isRepeatDue = function (task) {
    if (!task || !task.repeat || !task.completed) return false;
    const resetAt = task.nextResetAt || LS.getTaskNextResetAt(task);
    return !!resetAt && Date.now() >= resetAt;
  };

  /** 重置重复任务为 active（保留完成历史与计数） */
  LS.resetRepeatTask = function (task) {
    task.completed = false;
    task.status = 'active';
    task.nextResetAt = LS.getTaskNextResetAt(task);
    // 重复任务刷新后：完成日顺延为新的开始日
    task.startDate = Date.now();
    if (task.limitType === 'daily') { /* 每日任务 startDate 不重置也行 */ }
  };

  /** 全局事件发布/订阅（模块解耦） */
  const listeners = {};
  LS.on = function (event, fn) { (listeners[event] = listeners[event] || []).push(fn); };
  LS.emit = function (event, payload) {
    (listeners[event] || []).forEach(fn => { try { fn(payload); } catch (e) { console.error('[event]', event, e); } });
  };

})(window);
