/* ui.js — 通用 UI 辅助：toast、确认弹窗、时间格式化、HTML 转义 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var toastContainer = null;
  var modalRoot = null;
  var uid = 0;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* 两数补零 */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* 时间戳 → YYYY-MM-DD HH:mm:ss（本地时区） */
  function formatTime(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* 时间戳 → YYYYMMDD_HHmmss（用于文件名） */
  function formatFileStamp(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  /* HTML 转义（防止 XSS / 破坏渲染） */
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Toast 轻提示：type = 'success' | 'error' | 'info' */
  function toast(message, type) {
    type = type || 'info';
    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
    }
    var t = el('div', 'toast ' + type);
    var dot = el('span', 'dot');
    dot.setAttribute('aria-hidden', 'true');
    t.appendChild(dot);
    t.appendChild(document.createTextNode(message));
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toastContainer.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 3000);
  }

  /* 确保弹窗容器存在 */
  function getModalRoot() {
    if (!modalRoot) modalRoot = document.getElementById('modal-root');
    return modalRoot;
  }

  /* 通用确认弹窗（Promise<boolean>）
   * opts: { title, message, danger, confirmText, cancelText, requireInput, bodyHtml, bodyText, meta }
   *  - requireInput: 传入需用户输入的字符串（如 'DELETE'），输入匹配才允许确认
   */
  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var root = getModalRoot();
      var overlay = el('div', 'modal-overlay');
      var modal = el('div', 'modal');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      var title = el('h3', opts.danger ? 'danger' : '', opts.title || '确认');
      modal.appendChild(title);

      var p = el('p', '', opts.message || '');
      modal.appendChild(p);

      var input = null;
      if (opts.requireInput) {
        input = el('input', 'input confirm-input');
        input.type = 'text';
        input.placeholder = '输入 ' + opts.requireInput + ' 以确认';
        input.autocomplete = 'off';
        input.setAttribute('aria-label', '输入 ' + opts.requireInput + ' 以确认');
        modal.appendChild(input);
      }

      if (opts.bodyText != null) {
        var body = el('div', 'modal-body' + (opts.bodyMono ? ' mono' : ''), opts.bodyText);
        modal.appendChild(body);
      }

      var actions = el('div', 'actions');
      var cancelBtn = el('button', 'btn btn-secondary btn-sm', opts.cancelText || '取消');
      var confirmBtn = el('button', 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + ' btn-sm', opts.confirmText || '确定');
      if (opts.requireInput) confirmBtn.disabled = true;
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      modal.appendChild(actions);

      overlay.appendChild(modal);
      root.appendChild(overlay);

      var focusTarget = input || confirmBtn;
      focusTarget.focus();

      var lastFocus = document.activeElement;

      function close(result) {
        overlay.remove();
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        resolve(result);
      }

      function syncConfirmState() {
        if (opts.requireInput) {
          confirmBtn.disabled = input.value !== opts.requireInput;
        }
      }

      cancelBtn.addEventListener('click', function () { close(false); });
      confirmBtn.addEventListener('click', function () {
        if (!confirmBtn.disabled) close(true);
      });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
      });
      if (input) input.addEventListener('input', syncConfirmState);
      if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !confirmBtn.disabled) close(true);
      });
    });
  }

  /* 只读查看弹窗（用于历史「查看」），返回 Promise，关闭即结束 */
  function viewModal(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var root = getModalRoot();
      var overlay = el('div', 'modal-overlay');
      var modal = el('div', 'modal');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      var title = el('h3', '', opts.title || '查看');
      modal.appendChild(title);

      if (opts.meta) {
        var meta = el('div', 'modal-meta', opts.meta);
        modal.appendChild(meta);
      }

      var body = el('div', 'modal-body' + (opts.bodyMono ? ' mono' : ''), opts.bodyText || '');
      modal.appendChild(body);

      var actions = el('div', 'actions');
      var closeBtn = el('button', 'btn btn-secondary btn-sm', '关闭');
      actions.appendChild(closeBtn);
      modal.appendChild(actions);

      overlay.appendChild(modal);
      root.appendChild(overlay);
      closeBtn.focus();

      function close() { overlay.remove(); resolve(); }
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(); }
      });
    });
  }

  NotesApp.ui = {
    toast: toast,
    confirm: confirm,
    viewModal: viewModal,
    formatTime: formatTime,
    formatFileStamp: formatFileStamp,
    escapeHtml: escapeHtml
  };
})();
