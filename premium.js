/* ============================================
 * 人生养成系统 v5.2 — premium.js
 * 商业化：免费版 / Pro 会员
 *   - 功能门控（proGate）
 *   - 升级弹窗（定价 / 激活演示）
 *   - 头部 PRO 徽章
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // Pro 功能定义（描述 + 是否 Pro 专属）
  LS.PRO_FEATURES = [
    { id: 'templates',    name: '主题方案库',   desc: '一键套用健康 / 理财 / 修行等完整养成方案', icon: '📦', pro: true },
    { id: 'monthlyReport', name: '深度月报',    desc: '每月自动生成成长报告，支持导出 PDF',        icon: '📊', pro: true },
    { id: 'snapshots',    name: '快照备份',     desc: '本地版本化备份，随时一键恢复，防数据丢失',   icon: '💾', pro: true },
    { id: 'attrLimit',    name: '无限自定义',   desc: '属性与技能数量不受限（免费版各 5 个）',      icon: '∞',  pro: true },
    { id: 'weeklyReport', name: '每周报告',     desc: '每周成长简报与行动建议',                    icon: '📈', pro: false }
  ];

  LS.PRO_PLANS = [
    { id: 'lifetime', name: '终身买断', price: 38, unit: '元', note: '一次付费，永久使用', tag: '推荐' }
  ];

  // ---------- 会员状态 ----------
  LS.isPro = function () {
    return !!(LS.state && LS.state.pro && LS.state.pro.active);
  };

  LS.activatePro = function (planId) {
    LS.state.pro = { active: true, plan: planId || 'lifetime', activatedAt: Date.now() };
    LS.saveState();
    LS.renderAll();
    LS.showToast('👑 PRO 已激活，感谢支持！', 'success');
  };

  // 功能门控：返回 { ok, pro, feature }
  LS.proGate = function (featureId) {
    const feat = LS.PRO_FEATURES.find(f => f.id === featureId);
    if (!feat || !feat.pro) return { ok: true, feature: feat };
    if (LS.isPro()) return { ok: true, feature: feat };
    return { ok: false, feature: feat };
  };

  // 免费版限制检查：属性/技能数量
  LS.freeCustomLimit = 5;
  LS.checkCustomLimit = function (type) {
    if (LS.isPro()) return { ok: true };
    const list = type === 'attr' ? LS.state.attributes : LS.state.skills;
    if (list.length >= LS.freeCustomLimit) {
      return {
        ok: false,
        msg: '免费版最多创建 ' + LS.freeCustomLimit + ' 个' + (type === 'attr' ? '属性' : '技能') + '，升级 PRO 解锁无限数量'
      };
    }
    return { ok: true };
  };

  // ---------- 升级弹窗 ----------
  LS.openUpgradeModal = function (fromFeature) {
    const feat = LS.PRO_FEATURES.find(f => f.id === fromFeature);
    const planCards = LS.PRO_PLANS.map(p =>
      '<div class="plan-card' + (p.tag ? ' plan-featured' : '') + '">' +
      (p.tag ? '<div class="plan-tag">' + p.tag + '</div>' : '') +
      '<div class="plan-name">' + p.name + '</div>' +
      '<div class="plan-price"><span class="plan-symbol">¥</span>' + p.price + '<span class="plan-unit">' + p.unit + '</span></div>' +
      (p.note ? '<div class="plan-note">' + p.note + '</div>' : '') +
      '<button class="btn btn-primary btn-block" onclick="LS.openPayModal(\'' + p.id + '\')">立即升级</button>' +
      '</div>').join('');

    const featureList = LS.PRO_FEATURES.filter(f => f.pro).map(f =>
      '<div class="pro-feature-row"><span class="pro-feature-icon">' + f.icon + '</span>' +
      '<div><div class="pro-feature-name">' + f.name + '</div>' +
      '<div class="pro-feature-desc">' + f.desc + '</div></div></div>').join('');

    LS.openModal(
      '<div class="modal-title">👑 升级 PRO</div>' +
      (feat ? '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.85rem">「' + feat.name + '」为 PRO 专属功能</p></div>' : '') +
      '<div class="pro-features">' + featureList + '</div>' +
      '<div class="plan-grid">' + planCards + '</div>' +
      '<button class="btn btn-ghost btn-block" onclick="LS.openLicenseModal()">🔑 我有兑换码</button>' +
      '<div style="text-align:center;margin-top:var(--sp-sm)">' +
      '<button onclick="LS.openOrdersModal()" style="color:var(--text-tertiary);font-size:0.68rem;font-family:var(--font-mono);cursor:pointer;background:none;border:none">🧾 我的订单</button>' +
      '</div>' +
      '<div class="pro-disclaimer">支持支付宝扫码支付 / 兑换码激活。扫码付款后点击「我已完成支付」即刻激活；如遇问题可凭订单号联系卖家。</div>'
    );
  };

  // ---------- 头部 PRO 徽章 ----------
  LS.renderProBadge = function () {
    const badge = document.getElementById('pro-badge');
    if (!badge) return;
    badge.onclick = function () { LS.openUpgradeModal(); };
    if (LS.isPro()) {
      badge.innerHTML = '👑 PRO';
      badge.className = 'pro-badge active';
      badge.title = 'PRO 会员 · 终身买断（点击查看）';
    } else {
      badge.innerHTML = '升级 PRO';
      badge.className = 'pro-badge';
      badge.title = '解锁全部功能';
    }
  };

})(window);
