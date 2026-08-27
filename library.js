/* ============================================
 * 人生养成系统 v5.7 — library.js
 * 书影音收藏（对标「生活工作台」收藏）
 *   书 / 电影 / 剧集 / 播客 + 星级评分 + 状态 + 年度完成统计
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  const TYPES = [
    { id: 'book',   name: '书',   icon: '📖', cat: '阅读' },
    { id: 'movie',  name: '电影', icon: '🎬', cat: '观影' },
    { id: 'series', name: '剧集', icon: '📺', cat: '追剧' },
    { id: 'podcast',name: '播客', icon: '🎧', cat: '聆听' }
  ];
  const STATUS = {
    wish:  { name: '想看', cls: 'wish' },
    doing: { name: '在看', cls: 'doing' },
    done:  { name: '看完', cls: 'done' }
  };

  LS._libType = 'all';   // 筛选：all / book / movie / series / podcast
  LS._libFilter = 'all'; // 状态筛选：all / wish / doing / done

  function libType(id) { return TYPES.find(t => t.id === id) || TYPES[0]; }

  // 星星分数渲染（支持半星，此处用整数 1-5 + 未评分）
  LS.renderStars = function (rating) {
    if (!rating) return '<span class="lib-stars empty">未评分</span>';
    let s = '';
    for (let i = 1; i <= 5; i++) s += '<span class="lib-star' + (i <= rating ? ' on' : '') + '">★</span>';
    return '<span class="lib-stars">' + s + '</span>';
  };

  // 年度完成统计（status=done 且当年）
  LS.libraryYearStats = function () {
    const year = new Date().getFullYear();
    const items = LS.state.library.items || [];
    const done = items.filter(i => i.status === 'done' && i.finishedAt && new Date(i.finishedAt).getFullYear() === year);
    return {
      year: year,
      total: items.length,
      done: done.length,
      target: (LS.state.library.goal && LS.state.library.goal.year === year) ? LS.state.library.goal.count : 12
    };
  };

  // 主渲染
  LS.renderLibrary = function () {
    const container = document.getElementById('library-content');
    if (!container) return;
    const items = (LS.state.library.items || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const y = LS.libraryYearStats();

    let html = '';

    // 年度目标卡
    const pct = y.target > 0 ? Math.min(100, Math.round(y.done / y.target * 100)) : 0;
    html += '<div class="goal-card"><div class="goal-header"><span class="goal-title">' + y.year + ' 年度 ' + libType('book').cat + '目标</span>' +
      '<span class="goal-amount">' + y.done + ' / ' + y.target + '</span></div>' +
      '<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="goal-stats"><span>已收藏 ' + y.total + ' 项</span><span>' + pct + '% · 完成 ' + y.done + ' 项</span></div>' +
      '<div class="library-goal-actions"><button class="btn btn-sm btn-ghost" onclick="LS.setLibraryGoal()">🎯 调整目标</button></div></div>';

    // 类型筛选 tabs
    html += '<div class="task-filters lib-filters">' +
      '<button class="task-filter' + (LS._libType === 'all' ? ' active' : '') + '" onclick="LS.setLibType(\'all\')">全部</button>' +
      TYPES.map(t => '<button class="task-filter' + (LS._libType === t.id ? ' active' : '') + '" onclick="LS.setLibType(\'' + t.id + '\')">' + t.icon + ' ' + t.name + '</button>').join('') +
      '</div>';

    // 状态筛选
    html += '<div class="task-filters lib-filters" style="margin-bottom:var(--sp-md)">' +
      '<button class="task-filter' + (LS._libFilter === 'all' ? ' active' : '') + '" onclick="LS.setLibFilter(\'all\')">全部状态</button>' +
      Object.keys(STATUS).map(k => '<button class="task-filter' + (LS._libFilter === k ? ' active' : '') + '" onclick="LS.setLibFilter(\'' + k + '\')">' + STATUS[k].name + '</button>').join('') +
      '</div>';

    // 添加按钮
    html += '<button class="btn btn-primary btn-block" style="margin-bottom:var(--sp-md)" onclick="LS.openAddLib()">＋ 添加收藏</button>';

    // 列表
    const filtered = items.filter(i =>
      (LS._libType === 'all' || i.type === LS._libType) &&
      (LS._libFilter === 'all' || i.status === LS._libFilter)
    );

    html += '<div class="lib-list">';
    if (!filtered.length) {
      const emptyIcon = LS._libType === 'all' ? '📚' : libType(LS._libType).icon;
      html += '<div class="empty-state"><div class="empty-state-icon">' + emptyIcon + '</div>' +
        '<div class="empty-state-text">还没有' + (LS._libType === 'all' ? '收藏' : libType(LS._libType).name) + '<br>点下方按钮添加第一条</div></div>';
    } else {
      filtered.forEach(i => {
        const t = libType(i.type);
        const st = STATUS[i.status] || STATUS.wish;
        html += '<div class="lib-item">' +
          '<div class="lib-item-top"><span class="lib-type-tag">' + t.icon + ' ' + t.name + '</span>' +
          '<span class="lib-status lib-status-' + st.cls + '">' + st.name + '</span></div>' +
          '<div class="lib-item-title">' + LS.escapeHtml(i.title) + '</div>' +
          (i.author ? '<div class="lib-item-author">' + LS.escapeHtml(i.author) + '</div>' : '') +
          '<div class="lib-item-bottom">' + LS.renderStars(i.rating) +
          '<div class="lib-item-actions">' +
          '<button class="btn btn-xs btn-ghost" onclick="LS.toggleLibStatus(\'' + i.id + '\')">' + (i.status === 'done' ? '重看' : '看完') + '</button>' +
          '<button class="btn btn-xs btn-ghost" onclick="LS.openEditLib(\'' + i.id + '\')">编辑</button>' +
          '<button class="btn btn-xs btn-ghost danger" onclick="LS.deleteLibItem(\'' + i.id + '\')">删除</button>' +
          '</div></div>' +
          (i.note ? '<div class="lib-item-note">' + LS.escapeHtml(i.note) + '</div>' : '') +
          '</div>';
      });
    }
    html += '</div>';

    container.innerHTML = html;
  };

  LS.setLibType = function (id) { LS._libType = id; LS.renderLibrary(); };
  LS.setLibFilter = function (id) { LS._libFilter = id; LS.renderLibrary(); };

  // 添加
  LS.openAddLib = function () { LS.openEditLib(null); };

  LS.openEditLib = function (id) {
    const item = id ? (LS.state.library.items.find(x => x.id === id) || {}) : {};
    const typeOpts = TYPES.map(t => '<option value="' + t.id + '"' + (item.type === t.id ? ' selected' : '') + '>' + t.icon + ' ' + t.name + '</option>').join('');
    const statusOpts = Object.keys(STATUS).map(k => '<option value="' + k + '"' + (item.status === k ? ' selected' : '') + '>' + STATUS[k].name + '</option>').join('');
    LS.openModal('<div class="modal-title">' + (id ? '编辑收藏' : '添加收藏') + '</div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">类型</label><select class="select-input" id="lib-type">' + typeOpts + '</select></div>' +
      '<div class="form-group"><label class="form-label">状态</label><select class="select-input" id="lib-status">' + statusOpts + '</select></div></div>' +
      '<div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="lib-title" maxlength="60" placeholder="名称 / 书名 / 片名" value="' + LS.escapeHtml(item.title || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">作者 / 导演 / 主演（可选）</label><input type="text" class="form-input" id="lib-author" maxlength="40" value="' + LS.escapeHtml(item.author || '') + '"></div>' +
      '<div class="form-group"><label class="form-label">评分</label><div class="lib-rate" id="lib-rate">' + [1, 2, 3, 4, 5].map(n => '<span class="lib-rate-star' + (item.rating && n <= item.rating ? ' on' : '') + '" data-v="' + n + '" onclick="LS.pickLibRate(' + n + ')">★</span>').join('') + '</div></div>' +
      '<div class="form-group"><label class="form-label">短评（可选）</label><textarea class="form-textarea" id="lib-note" maxlength="200" placeholder="一句话记录…">' + LS.escapeHtml(item.note || '') + '</textarea></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.saveLibItem(\'' + (id || '') + '\')">保存</button>');
    LS._libRate = item.rating || 0;
  };

  LS.pickLibRate = function (n) {
    LS._libRate = n;
    document.querySelectorAll('#lib-rate .lib-rate-star').forEach(el => {
      el.classList.toggle('on', parseInt(el.dataset.v, 10) <= n);
    });
  };

  LS.saveLibItem = function (id) {
    const title = document.getElementById('lib-title').value.trim();
    if (!title) { LS.showToast('请输入标题', 'error'); return; }
    const type = document.getElementById('lib-type').value;
    const status = document.getElementById('lib-status').value;
    const author = document.getElementById('lib-author').value.trim();
    const note = document.getElementById('lib-note').value.trim();
    const rating = LS._libRate || 0;
    if (!LS.state.library.items) LS.state.library.items = [];
    let obj;
    if (id) {
      obj = LS.state.library.items.find(x => x.id === id);
      if (obj) { obj.title = title; obj.type = type; obj.status = status; obj.author = author; obj.note = note; obj.rating = rating; }
    } else {
      obj = { id: LS.uid('lib'), type: type, status: status, title: title, author: author, note: note, rating: rating, createdAt: Date.now() };
      LS.state.library.items.unshift(obj);
    }
    // 状态切到看完时记录完成时间
    if (status === 'done' && !obj.finishedAt) obj.finishedAt = Date.now();
    else if (status !== 'done') obj.finishedAt = null;
    LS.saveState();
    LS.closeModal();
    LS.renderLibrary();
    LS.showToast(id ? '已更新' : '已加入收藏', 'success');
  };

  LS.toggleLibStatus = function (id) {
    const it = (LS.state.library.items || []).find(x => x.id === id);
    if (!it) return;
    if (it.status === 'done') { it.status = 'doing'; it.finishedAt = null; }
    else { it.status = 'done'; it.finishedAt = Date.now(); }
    LS.saveState();
    LS.renderLibrary();
    LS.showToast(it.status === 'done' ? '🎉 已完成，计入年度目标' : '已标记为在看');
  };

  LS.deleteLibItem = function (id) {
    LS.showConfirm('删除收藏', '确定删除这条收藏？', function () {
      LS.state.library.items = (LS.state.library.items || []).filter(x => x.id !== id);
      LS.saveState();
      LS.renderLibrary();
      LS.showToast('已删除');
    });
  };

  LS.setLibraryGoal = function () {
    const y = LS.libraryYearStats();
    LS.openModal('<div class="modal-title">🎯 年度目标</div>' +
      '<div class="form-row"><div class="form-group"><label class="form-label">年份</label><input type="number" class="form-input" id="lib-goal-year" value="' + y.year + '" min="2020" max="2100"></div>' +
      '<div class="form-group"><label class="form-label">目标数量</label><input type="number" class="form-input" id="lib-goal-count" value="' + y.target + '" min="1" max="999"></div></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.saveLibraryGoal()">保存</button>');
  };

  LS.saveLibraryGoal = function () {
    const year = parseInt(document.getElementById('lib-goal-year').value, 10);
    const count = parseInt(document.getElementById('lib-goal-count').value, 10);
    if (!year || !count || count < 1) { LS.showToast('请输入有效数值', 'error'); return; }
    LS.state.library.goal = { year: year, count: count };
    LS.saveState();
    LS.closeModal();
    LS.renderLibrary();
    LS.showToast('目标已更新', 'success');
  };

})(window);
