/* ============================================
 * 人生养成系统 v5.1 — pay.js
 * 付费流程：选套餐 → 选支付方式 → 下单 → 支付/激活 → 订单记录
 *
 * 支付方式配置（上线前按需修改 LS.PAY_CONFIG）：
 *   demo    演示支付（无商户号时一键完成，便于验证全流程）
 *   key     兑换码激活（爱发电/闲鱼/微信私发等渠道发码，最省事）
 *   alipay  支付宝当面付（需商户号，配置收款码图片路径）
 *   wechat  微信支付（需商户号，配置收款码图片路径）
 *   afdian  爱发电赞助链接（创作者零门槛，注册即用）
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 支付配置（上线前修改） ----------
  LS.PAY_CONFIG = {
    demo:   { enabled: false },
    key:    { enabled: true },
    alipay: { enabled: true, qr: 'alipay-qr.png', notice: '支付宝扫码支付' },
    wechat: { enabled: false, qr: 'wechat-qr.png', notice: '微信扫码支付' },
    afdian: { enabled: false, url: 'https://afdian.com/a/your-id', notice: '跳转爱发电完成赞助' }
  };

  // ---------- 下单 ----------
  LS.createOrder = function (planId, method) {
    const plan = LS.PRO_PLANS.find(p => p.id === planId) || LS.PRO_PLANS[1];
    const order = {
      id: LS.uid('ord'),
      plan: plan.id,
      planName: plan.name,
      amount: plan.price,
      method: method,
      status: 'pending',
      createdAt: Date.now(),
      paidAt: null
    };
    if (!LS.state.orders) LS.state.orders = [];
    LS.state.orders.push(order);
    LS.saveState();
    return order;
  };

  // 标记支付成功并激活
  LS.settleOrder = function (orderId) {
    const order = LS.state.orders.find(o => o.id === orderId);
    if (!order) return;
    order.status = 'paid';
    order.paidAt = Date.now();
    LS.activatePro(order.plan);
    LS.burstConfetti();
    LS.saveState();
  };

  // ---------- 支付弹窗 ----------
  LS.openPayModal = function (planId) {
    const plan = LS.PRO_PLANS.find(p => p.id === planId) || LS.PRO_PLANS[1];
    let methodHtml = '';
    const methods = [
      { id: 'key', icon: '🔑', cls: 'key', name: '兑换码激活', desc: '已有兑换码？输入即激活（支持爱发电等渠道购买）' },
      { id: 'alipay', icon: '💙', cls: 'alipay', name: '支付宝', desc: '扫码支付，实时到账自动激活' },
      { id: 'wechat', icon: '💚', cls: 'wechat', name: '微信支付', desc: '扫码支付，实时到账自动激活' },
      { id: 'afdian', icon: '🧡', cls: 'afdian', name: '爱发电', desc: '跳转爱发电完成赞助后发兑换码' },
      { id: 'demo', icon: '🧪', cls: 'demo', name: '演示支付', desc: '无商户号环境一键完成（上线前关闭）' }
    ].filter(m => {
      const cfg = LS.PAY_CONFIG[m.id];
      return cfg ? cfg.enabled : false;
    });

    methodHtml = methods.map(m =>
      '<div class="method-card" data-method="' + m.id + '" onclick="LS.selectPayMethod(\'' + m.id + '\')">' +
      '<div class="method-icon ' + m.cls + '">' + m.icon + '</div>' +
      '<div><div class="method-name">' + m.name + '</div><div class="method-desc">' + m.desc + '</div></div>' +
      '</div>').join('');

    LS.openModal(
      '<div class="modal-title">👑 升级 PRO · ' + plan.name + '</div>' +
      '<div class="pay-order-line"><span>套餐</span><b>' + plan.name + '</b></div>' +
      '<div class="pay-order-line"><span>价格</span><b>¥' + plan.price + '</b></div>' +
      '<div class="method-list">' + methodHtml + '</div>' +
      '<div class="pro-disclaimer">支付即代表同意：PRO 为虚拟商品，一经激活不支持退款（法律法规另有规定的除外）。</div>'
    );
  };

  LS.selectPayMethod = function (methodId) {
    // 高亮选择
    document.querySelectorAll('.method-card').forEach(el => el.classList.toggle('selected', el.dataset.method === methodId));
    const plan = LS.PRO_PLANS[1]; // 默认终身；如从套餐卡进入可传入
    const cfg = LS.PAY_CONFIG[methodId];
    if (!cfg) return;

    if (methodId === 'key') { LS.openLicenseModal(); return; }
    if (methodId === 'afdian') {
      const order = LS.createOrder('lifetime', 'afdian');
      if (cfg.url) window.open(cfg.url, '_blank');
      LS.showToast('请在爱发电完成赞助，我们会尽快发放兑换码', 'warning');
      LS.closeModal();
      return;
    }
    if (methodId === 'demo') {
      const order = LS.createOrder('lifetime', 'demo');
      LS.settleOrder(order.id);
      LS.closeModal();
      LS.showToast('🧪 演示支付完成，PRO 已激活', 'success');
      return;
    }
    if (methodId === 'alipay' || methodId === 'wechat') {
      // 商户二维码模式（配置后启用）
      const order = LS.createOrder('lifetime', methodId);
      const qrModal = '<div class="modal-title">' + (methodId === 'alipay' ? '💙 支付宝扫码支付' : '💚 微信扫码支付') + '</div>' +
        '<div class="share-card-wrap" style="margin:var(--sp-md) 0">' +
        '<img src="' + cfg.qr + '" alt="收款码" style="width:200px;height:200px;border-radius:var(--r-md)">' +
        '</div>' +
        '<div class="notice-body"><p style="font-size:0.78rem;text-align:center">' + cfg.notice + ' ¥' + order.amount + '<br>支付后点击下方按钮完成激活</p></div>' +
        '<button class="btn btn-primary btn-block" onclick="LS.settleOrder(\'' + order.id + '\');LS.closeModal()">我已完成支付，激活 PRO</button>' +
        '<div class="pro-disclaimer" style="margin-top:var(--sp-sm)">订单号 ' + order.id + '</div>';
      LS.openModal(qrModal);
      return;
    }
  };

  // ---------- 订单记录 ----------
  LS.openOrdersModal = function () {
    const orders = [...(LS.state.orders || [])].sort((a, b) => b.createdAt - a.createdAt);
    let html = '<div class="modal-title">🧾 我的订单</div>';
    if (!orders.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">🧾</div>' +
        '<div class="empty-state-text">暂无订单</div></div>';
    } else {
      html += '<div class="order-list">' + orders.map(o =>
        '<div class="order-item"><div>' + LS.escapeHtml(o.planName) + ' · ' + o.method + '<br>' +
        '<span style="color:var(--text-faint);font-size:0.6rem">' + LS.formatDateTime(o.createdAt) + '</span></div>' +
        '<div style="text-align:right"><b>¥' + o.amount + '</b><br>' +
        '<span class="order-status ' + o.status + '">' + (o.status === 'paid' ? '已支付' : '待支付') + '</span></div></div>'
      ).join('') + '</div>';
    }
    LS.openModal(html);
  };

})(window);
