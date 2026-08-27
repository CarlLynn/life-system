/* ============================================
 * 人生养成系统 v5.2 — ui.js
 * 通用 UI 组件：Modal / Toast / Confirm
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- Modal ----------
  LS.openModal = function (body) {
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-overlay').classList.add('active');
  };
  LS.closeModal = function () {
    document.getElementById('modal-overlay').classList.remove('active');
  };
  document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === this) LS.closeModal(); });
  });

  // ---------- Toast ----------
  LS.showToast = function (msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    const icons = { success: '✓', error: '✗', warning: '!' };
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'i') + '</span><span>' + LS.escapeHtml(msg) + '</span>';
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('removing');
      setTimeout(function () { toast.remove(); }, 200);
    }, 2600);
  };

  // ---------- Confirm ----------
  LS.showConfirm = function (title, body, onOk, okText) {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    document.getElementById('confirm-ok').textContent = okText || '确认';
    overlay.classList.add('active');
    document.getElementById('confirm-ok').onclick = function () {
      overlay.classList.remove('active');
      if (onOk) onOk();
    };
    document.getElementById('confirm-cancel').onclick = function () {
      overlay.classList.remove('active');
    };
  };

})(window);
