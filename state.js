/* ============================================
 * 人生养成系统 v5.2 — state.js
 * 状态管理（v5 数据模型 + v2/v3/v4 迁移）
 *
 * v4 任务模型：
 *   category   : main主线 / side支线 / daily每日 / weekly周限 / monthly月限 / yearly年限
 *   timeType   : limited限时 / unlimited不限时
 *   limitType  : 限时任务的周期 daily/weekly/monthly/yearly（主线支线限时可为 null + dueDate）
 *   repeat     : 是否重复任务（限时任务可选）
 *   startDate  : 新建日期（可手动选择）
 *   completionCount / completionLog : 完成次数与每次完成明细
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // v5 存储 key（自动迁移 v3/v4 旧 key 数据）
  LS.STORAGE_KEY = 'life-system-v5';
  LS.LEGACY_STORAGE_KEY = 'life-system-v3'; // 旧版数据一键迁移

  // ---------- v5 默认状态 ----------
  function defaultState() {
    return {
      version: 5,
      bound: false,
      host: { name: '', gender: '', age: 0, height: 0, weight: 0, boundAt: null },
      attributes: [
        { id: 'attr-knowledge', name: '知识量', value: 0, colorIndex: 0, lastIncreased: null },
        { id: 'attr-muscle',    name: '肌肉量', value: 0, colorIndex: 1, lastIncreased: null }
      ],
      skills: [
        { id: 'skill-read', name: '阅读', icon: '📖', level: 1, xp: 0, description: '通过阅读类任务获得经验', unlockedAt: null }
      ],
      tasks: [],
      assets: { balance: 0, monthlyGoal: 500, budget: 0, transactions: [] },
      streak: 0,
      lastActiveDate: null,
      totalTasksCompleted: 0,
      achievementsUnlocked: [],
      taskHistory: [],      // [{date:'YYYY-MM-DD', count:N}] 每日完成任务数（统计/日历）
      completionLog: [],    // [{id, taskId, taskTitle, completedAt}] 每次完成明细（完成记录/日历）
      // ---- v5 商业化字段 ----
      pro: { active: false, plan: null, activatedAt: null },  // Pro 会员状态
      backups: [],          // [{id, at, label, data}] 快照备份（Pro）
      templatesUsed: [],    // 已应用的模板 id 列表
      installedAt: Date.now(),
      // ---- v5.2 上线字段 ----
      orders: [],           // [{id, plan, amount, method, status, createdAt}] 订单
      settings: {           // 用户设置
        theme: 'fresh',     // fresh / youth / cyber / day
        reminder: { enabled: false, time: '21:00' }  // 每日提醒
      },
      focusLog: [],         // [{date:'YYYY-MM-DD', minutes:N}] 专注计时记录（番茄钟）
      // ---- v5.4 健康与待买 ----
      health: {              // 身体数据（对标「生活工作台」Body Trend）
        records: [],         // [{id, date:'YYYY-MM-DD', weight:kg, fat:%}] 体重/体脂记录
        goal: { weight: 0, fat: 0 }  // 目标体重 / 目标体脂（0=未设置）
      },
      todoList: []           // [{id, text, done, createdAt}] 待买清单
      ,library: {            // 书影音收藏（对标「生活工作台」收藏）
        items: [],           // [{id, type:'book'|'movie'|'series'|'podcast', title, author, rating, status:'wish'|'doing'|'done', finishedAt, note, createdAt}]
        goal: { year: new Date().getFullYear(), count: 12 }   // 年度收藏目标
      }
    };
  }
  LS.defaultState = defaultState;

  // ---------- 任务规范化（v2/v3 → v4） ----------
  function normalizeTask(t) {
    const now = Date.now();
    const base = {
      id: t.id || LS.uid('task'),
      title: t.title || '',
      category: t.category || 'main',
      timeType: t.timeType || 'unlimited',
      limitType: t.limitType || null,
      repeat: !!t.repeat,
      startDate: t.startDate || t.createdAt || now,
      dueDate: t.dueDate || null,
      attributeId: t.attributeId || null,
      points: t.points || 0,
      skillId: t.skillId || null,
      xp: t.xp || 0,
      customReward: t.customReward || null,
      completed: !!t.completed,
      status: t.status || (t.completed ? 'completed' : 'active'),
      note: t.note || null,
      createdAt: t.createdAt || now,
      completedAt: t.completedAt || null,
      completionCount: t.completionCount || (t.completed ? 1 : 0),
      lastCompletedAt: t.lastCompletedAt || null,
      nextResetAt: t.nextResetAt || null
    };
    // 旧模型（type: daily/weekly/monthly/yearly/continuous）→ v4
    if (!t.category || !t.timeType) {
      const type = t.type || t.limitType || 'daily';
      if (type === 'continuous' || type === 'unlimited') {
        base.category = 'main';
        base.timeType = 'unlimited';
        base.limitType = null;
      } else {
        base.category = type;
        base.timeType = 'limited';
        base.limitType = type;
      }
    }
    // 放弃状态（不限时任务）
    if (t.status === 'abandoned') base.status = 'abandoned';
    return base;
  }
  LS.normalizeTask = normalizeTask;

  // ---------- v3/v4 任务迁移 ----------
  function migrateTasksToV4(state) {
    state.tasks = (state.tasks || []).map(normalizeTask);
    // 生成完成明细（旧数据无 completionLog 时）
    if (!state.completionLog || !state.completionLog.length) {
      state.completionLog = state.tasks
        .filter(t => t.completed && t.completedAt)
        .map(t => ({ id: LS.uid('log'), taskId: t.id, taskTitle: t.title, completedAt: t.completedAt }));
    }
    state.version = 5;
  }
  LS.migrateTasksToV4 = migrateTasksToV4;

  // ---------- 加载 ----------
  LS.loadState = function () {
    let state = defaultState();
    try {
      let saved = localStorage.getItem(LS.STORAGE_KEY);
      // 旧版存储 key 迁移（保留老用户数据）
      if (!saved && LS.LEGACY_STORAGE_KEY) {
        const legacy = localStorage.getItem(LS.LEGACY_STORAGE_KEY);
        if (legacy) {
          saved = legacy;
          localStorage.removeItem(LS.LEGACY_STORAGE_KEY);
        }
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        state = deepMerge(defaultState(), parsed);
        migrateTasksToV4(state);
      } else {
        migrateFromV2(state);
      }
    } catch (e) {
      console.warn('[state] 加载失败，使用默认状态:', e);
    }
    LS.state = state;
    return state;
  };

  // ---------- v2 迁移（life-system-v2） ----------
  function migrateFromV2(state) {
    try {
      const old = localStorage.getItem('life-system-v2');
      if (!old) return;
      const v2 = JSON.parse(old);
      state.bound = v2.bound || false;
      state.host = Object.assign(state.host, v2.host || {});
      state.attributes = (v2.attributes || []).map(a => ({
        id: a.id, name: a.name, value: a.value || 0,
        colorIndex: a.colorIndex || 0, lastIncreased: a.lastIncreased || null
      }));
      if (!state.attributes.length) state.attributes = defaultState().attributes;
      state.skills = defaultState().skills;
      state.tasks = (v2.tasks || []).map(normalizeTask);
      state.assets = Object.assign({ balance: 0, monthlyGoal: 500, transactions: [] }, v2.assets || {});
      state.streak = v2.streak || 0;
      state.lastActiveDate = v2.lastActiveDate || null;
      state.totalTasksCompleted = v2.totalTasksCompleted || 0;
      state.achievementsUnlocked = v2.achievementsUnlocked || [];
      state.taskHistory = v2.taskHistory || [];
      migrateTasksToV4(state);
      console.log('[state] 已从 v2 迁移到 v4');
    } catch (e) {
      console.warn('[state] v2 迁移失败:', e);
    }
  }

  // ---------- 持久化 ----------
  LS.saveState = function () {
    try { localStorage.setItem(LS.STORAGE_KEY, JSON.stringify(LS.state)); }
    catch (e) { console.warn('[state] 保存失败:', e); }
  };

  LS.resetState = function () {
    localStorage.removeItem(LS.STORAGE_KEY);
    LS.state = defaultState();
    LS.saveState();
  };

  // ---------- 深度合并 ----------
  function deepMerge(base, override) {
    if (Array.isArray(base) || Array.isArray(override)) {
      return override === undefined ? base : override;
    }
    if (typeof base !== 'object' || base === null) {
      return override === undefined ? base : override;
    }
    const result = {};
    for (const k of Object.keys(base)) {
      if (k in override) result[k] = deepMerge(base[k], override[k]);
      else result[k] = base[k];
    }
    for (const k of Object.keys(override)) {
      if (!(k in base)) result[k] = override[k];
    }
    return result;
  }
  LS.deepMerge = deepMerge;

})(window);
