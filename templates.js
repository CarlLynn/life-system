/* ============================================
 * 人生养成系统 v5.0 — templates.js
 * 主题方案库：一键套用完整养成方案
 *   - 方案包含：属性 / 技能 / 任务（含奖励联动）
 *   - 免费方案 1 个，PRO 方案 4 个
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 方案定义 ----------
  // tasks 中 { attr, skill } 为方案内索引引用，应用时解析为实际 id
  LS.TEMPLATES = [
    {
      id: 'study', name: '学习成长', icon: '📚', pro: false,
      desc: '阅读、笔记、课程与输出，构建知识体系。',
      attrs: [
        { name: '知识量', colorIndex: 0 },
        { name: '专注力', colorIndex: 2 },
        { name: '表达力', colorIndex: 4 }
      ],
      skills: [
        { name: '阅读', icon: '📖', description: '通过阅读类任务获得经验' },
        { name: '写作', icon: '✍️', description: '通过写作输出类任务获得经验' }
      ],
      tasks: [
        { title: '阅读 30 分钟', category: 'daily', repeat: true, attr: 0, points: 10, skill: 0, xp: 5 },
        { title: '输出读书笔记', category: 'weekly', repeat: true, attr: 2, points: 15, skill: 1, xp: 8 },
        { title: '完成一门在线课程', category: 'monthly', repeat: true, attr: 0, points: 40, skill: 0, xp: 15 },
        { title: '读完一本书', category: 'side', timeType: 'unlimited', attr: 0, points: 60, skill: 0, xp: 20 }
      ]
    },
    {
      id: 'fitness', name: '健康塑形', icon: '💪', pro: true,
      desc: '力量、有氧、睡眠与饮食，打造强健体魄。',
      attrs: [
        { name: '肌肉量', colorIndex: 1 },
        { name: '体能', colorIndex: 2 },
        { name: '睡眠质量', colorIndex: 3 }
      ],
      skills: [
        { name: '健身', icon: '🏋️', description: '通过训练类任务获得经验' },
        { name: '营养学', icon: '🥗', description: '通过饮食管理类任务获得经验' }
      ],
      tasks: [
        { title: '力量训练 40 分钟', category: 'daily', repeat: true, attr: 0, points: 12, skill: 0, xp: 6 },
        { title: '有氧运动 30 分钟', category: 'daily', repeat: true, attr: 1, points: 10, skill: 0, xp: 5 },
        { title: '23:30 前入睡', category: 'weekly', repeat: true, attr: 2, points: 15, skill: 1, xp: 8 },
        { title: '备一周健康餐单', category: 'weekly', repeat: true, attr: 1, points: 15, skill: 1, xp: 8 },
        { title: '完成 5KM 跑步', category: 'monthly', repeat: true, attr: 1, points: 30, skill: 0, xp: 12 }
      ]
    },
    {
      id: 'wealth', name: '理财自律', icon: '💰', pro: true,
      desc: '记账、储蓄、投资与学习，掌控现金流。',
      attrs: [
        { name: '财商', colorIndex: 5 },
        { name: '自律', colorIndex: 3 }
      ],
      skills: [
        { name: '理财', icon: '📈', description: '通过理财类任务获得经验' }
      ],
      tasks: [
        { title: '记录当日收支', category: 'daily', repeat: true, attr: 0, points: 8, skill: 0, xp: 4 },
        { title: '复盘本周消费', category: 'weekly', repeat: true, attr: 0, points: 12, skill: 0, xp: 6 },
        { title: '强制储蓄 500 元', category: 'monthly', repeat: true, attr: 1, points: 20, skill: 0, xp: 10 },
        { title: '阅读理财书籍 1 章', category: 'weekly', repeat: true, attr: 0, points: 10, skill: 0, xp: 5 },
        { title: '优化一份保单/定投', category: 'yearly', repeat: false, attr: 0, points: 50, skill: 0, xp: 20 }
      ]
    },
    {
      id: 'mind', name: '心灵修行', icon: '🧘', pro: true,
      desc: '冥想、感恩与情绪管理，安顿内心秩序。',
      attrs: [
        { name: '心性', colorIndex: 4 },
        { name: '情绪力', colorIndex: 2 }
      ],
      skills: [
        { name: '冥想', icon: '🧘', description: '通过冥想类任务获得经验' }
      ],
      tasks: [
        { title: '冥想 10 分钟', category: 'daily', repeat: true, attr: 0, points: 10, skill: 0, xp: 5 },
        { title: '写感恩日记', category: 'daily', repeat: true, attr: 0, points: 8, skill: 0, xp: 4 },
        { title: '数字斋戒半天', category: 'weekly', repeat: true, attr: 1, points: 15, skill: 0, xp: 7 },
        { title: '进行一次正念行走', category: 'weekly', repeat: true, attr: 0, points: 12, skill: 0, xp: 6 },
        { title: '完成 21 天冥想挑战', category: 'monthly', repeat: false, attr: 0, points: 60, skill: 0, xp: 25 }
      ]
    },
    {
      id: 'creator', name: '创作者', icon: '🎬', pro: true,
      desc: '内容产出、发布与复盘，打造个人品牌。',
      attrs: [
        { name: '创作力', colorIndex: 4 },
        { name: '影响力', colorIndex: 5 },
        { name: '知识量', colorIndex: 0 }
      ],
      skills: [
        { name: '内容创作', icon: '🎬', description: '通过创作类任务获得经验' },
        { name: '剪辑', icon: '🎞️', description: '通过后期制作类任务获得经验' }
      ],
      tasks: [
        { title: '创作一条内容', category: 'daily', repeat: true, attr: 0, points: 12, skill: 0, xp: 6 },
        { title: '发布一篇作品', category: 'weekly', repeat: true, attr: 1, points: 18, skill: 1, xp: 9 },
        { title: '数据复盘', category: 'weekly', repeat: true, attr: 1, points: 10, skill: 0, xp: 5 },
        { title: '学习一个新技巧', category: 'weekly', repeat: true, attr: 2, points: 10, skill: 1, xp: 6 },
        { title: '完成一个系列企划', category: 'monthly', repeat: false, attr: 0, points: 50, skill: 0, xp: 20 }
      ]
    }
  ];

  // ---------- 应用方案 ----------
  LS.applyTemplate = function (templateId) {
    const tpl = LS.TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    // PRO 门控：仅 PRO 方案需要（免费方案直接可用）
    if (tpl.pro) {
      const gate = LS.proGate('templates');
      if (!gate.ok) { LS.openUpgradeModal('templates'); return; }
    }

    // 同名属性/技能去重
    const attrIdMap = {};
    tpl.attrs.forEach(a => {
      const exist = LS.state.attributes.find(x => x.name === a.name);
      if (exist) { attrIdMap[a.name] = exist.id; return; }
      const na = {
        id: LS.uid('attr'), name: a.name, value: 0,
        colorIndex: (a.colorIndex != null ? a.colorIndex : LS.state.attributes.length) % LS.ATTR_COLORS.length,
        lastIncreased: null
      };
      LS.state.attributes.push(na);
      attrIdMap[a.name] = na.id;
    });

    const skillIdMap = {};
    tpl.skills.forEach(s => {
      const exist = LS.state.skills.find(x => x.name === s.name);
      if (exist) { skillIdMap[s.name] = exist.id; return; }
      const ns = {
        id: LS.uid('skill'), name: s.name, icon: s.icon, level: 1, xp: 0,
        description: s.description || null, unlockedAt: Date.now()
      };
      LS.state.skills.push(ns);
      skillIdMap[s.name] = ns.id;
    });

    // 任务（去重：同名且同分类跳过）
    const now = Date.now();
    tpl.tasks.forEach(t => {
      const dup = LS.state.tasks.find(x => x.title === t.title && x.category === t.category);
      if (dup) return;
      const isCycle = LS.isCycleCategory(t.category);
      LS.state.tasks.push({
        id: LS.uid('task'), title: t.title,
        category: t.category,
        timeType: t.timeType || (isCycle ? 'limited' : 'unlimited'),
        limitType: isCycle ? t.category : null,
        repeat: !!t.repeat,
        startDate: now, dueDate: null,
        attributeId: t.attr != null ? attrIdMap[tpl.attrs[t.attr].name] : null,
        points: t.points || 0,
        skillId: t.skill != null ? skillIdMap[tpl.skills[t.skill].name] : null,
        xp: t.xp || 0,
        customReward: t.customReward || null,
        completed: false, status: 'active', note: null,
        createdAt: now, completedAt: null,
        completionCount: 0, lastCompletedAt: null, nextResetAt: null
      });
    });

    if (!LS.state.templatesUsed.includes(tpl.id)) LS.state.templatesUsed.push(tpl.id);
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('方案「' + tpl.name + '」已应用', 'success');
  };

  // ---------- 方案库弹窗 ----------
  LS.openTemplateModal = function () {
    let html = '<div class="modal-title">📦 主题方案库</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.8rem">一键套用完整养成方案：自动创建属性、技能与任务体系。已存在的同名项会跳过。</p></div>' +
      '<div class="template-list">';

    LS.TEMPLATES.forEach(t => {
      const applied = LS.state.templatesUsed.includes(t.id);
      html += '<div class="template-card' + (applied ? ' applied' : '') + '">' +
        '<div class="template-icon">' + t.icon + '</div>' +
        '<div class="template-info">' +
        '<div class="template-name">' + t.name +
        (t.pro ? ' <span class="pro-tag">PRO</span>' : ' <span class="free-tag">免费</span>') +
        (applied ? ' <span class="applied-tag">已应用</span>' : '') + '</div>' +
        '<div class="template-desc">' + t.desc + '</div>' +
        '<div class="template-meta">' + t.attrs.length + ' 属性 · ' + t.skills.length + ' 技能 · ' + t.tasks.length + ' 任务</div>' +
        '</div>' +
        '<button class="btn ' + (t.pro && !LS.isPro() ? 'btn-ghost' : 'btn-primary') + ' btn-sm" onclick="LS.applyTemplate(\'' + t.id + '\')">' +
        (applied ? '再次应用' : (t.pro && !LS.isPro() ? '🔒 应用' : '应用')) + '</button>' +
        '</div>';
    });
    html += '</div>';
    LS.openModal(html);
  };

})(window);
