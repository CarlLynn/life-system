/* ============================================
 * 人生养成系统 v5.2 — license.js
 * 兑换码（License Key）系统
 *   格式: LS-XXXX-XXXX-XXXX-XXXX（末位为校验码）
 *   校验: 内容哈希（djb2）模 36 得出校验字符，离线可验证
 *   说明: 客户端校验属于「轻量授权」，
 *         正式商用建议升级为服务端签发+在线校验（见 docs/部署与上线指南.md）
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符 I O 0 1
  const SECRET = 'LifeSystem2026*#Youth';              // 校验盐（发布前可更换）

  function mod36(n) { return ((n % 36) + 36) % 36; }

  // 校验位索引：ALPHABET 仅 32 字符，用 mod(ALPHABET.length) 保证合法；
  // 同时兼容历史码（历史码若合法必然 mod36<32，两者一致）
  function ci(n) { return mod36(n) % ALPHABET.length; }

  // djb2 哈希
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h;
  }

  // 生成一组随机字符
  function randGroup(len) {
    let s = '';
    const arr = new Uint32Array(len);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr);
    else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 0xffffffff);
    for (let i = 0; i < len; i++) s += ALPHABET[arr[i] % ALPHABET.length];
    return s;
  }

  // 生成兑换码（卖家工具调用；type: 'lifetime' | 'monthly'）
  LS.generateLicenseKey = function (type) {
    const payload = randGroup(15); // 15 位内容
    const check = ALPHABET[ci(hash(payload + SECRET + (type || 'lifetime')))];
    const groups = (payload + check).match(/.{4}/g); // 16 位 = 4 组
    return 'LS-' + groups.join('-');
  };

  // 校验兑换码，返回 { ok, plan, key } 或 { ok:false }
  LS.validateLicenseKey = function (key) {
    if (!key) return { ok: false };
    const clean = String(key).trim().toUpperCase().replace(/\s/g, '');
    const m = clean.match(/^LS-([A-Z2-9]{4})-([A-Z2-9]{4})-([A-Z2-9]{4})-([A-Z2-9]{4})$/);
    if (!m) return { ok: false };
    const payload = m[1] + m[2] + m[3] + m[4].slice(0, 3); // 15 位内容
    const check = m[4][3];                                // 末位校验字符
    let plan = null;
    if (check === ALPHABET[ci(hash(payload + SECRET + 'lifetime'))]) plan = 'lifetime';
    else if (check === ALPHABET[ci(hash(payload + SECRET + 'monthly'))]) plan = 'monthly';
    if (!plan) return { ok: false };
    return { ok: true, plan: plan, key: clean };
  };

  // 兑换码激活入口（升级弹窗 → 兑换码 → 输入 → 校验 → 激活）
  LS.activateWithKey = function () {
    const input = document.getElementById('license-key-input');
    const key = input ? input.value : '';
    const result = LS.validateLicenseKey(key);
    if (!result.ok) { LS.showToast('兑换码无效，请检查后重试', 'error'); return; }
    // 防重复激活：同一兑换码只允许激活一次（本地记录）
    if (LS.state.usedKeys && LS.state.usedKeys.includes(result.key)) {
      LS.showToast('该兑换码已被使用', 'error'); return;
    }
    if (!LS.state.usedKeys) LS.state.usedKeys = [];
    LS.state.usedKeys.push(result.key);
    LS.activatePro(result.plan);
    LS.closeModal();
    LS.showToast('🎉 兑换成功，PRO 已激活！', 'success');
  };

  LS.openLicenseModal = function () {
    LS.openModal('<div class="modal-title">🔑 兑换码激活</div>' +
      '<div class="notice-body" style="margin-bottom:var(--sp-md)"><p style="font-size:0.8rem">输入购买时获得的兑换码（格式 LS-XXXX-XXXX-XXXX-XXXX）即可激活 PRO。</p></div>' +
      '<div class="form-group"><label class="form-label">兑换码</label>' +
      '<input type="text" class="form-input" id="license-key-input" placeholder="LS-XXXX-XXXX-XXXX-XXXX" maxlength="23" style="font-family:var(--font-mono);letter-spacing:.08em"></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.activateWithKey()">激活</button>');
  };

})(window);
