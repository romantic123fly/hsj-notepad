/* cloud.js — GitHub 云同步：把笔记存进自己的仓库（默认 data/notes.json），换设备输 token 即可读回。
 * 依赖：storage.js、ui.js、notes.js、history.js
 * 存储：localStorage notes.app.cloud（配置）、notes.app.cloudTombstones（删除墓碑）
 * 说明：token 只保存在本机浏览器，建议使用只授权该仓库 Contents 读写的 fine-grained token。
 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var CFG_KEY = 'notes.app.cloud';
  var TOMB_KEY = 'notes.app.cloudTombstones';
  var API = 'https://api.github.com';
  var PUSH_DELAY = 1500;

  var DEFAULTS = {
    token: '',
    owner: 'romantic123fly',
    repo: 'hsj-notepad',
    path: 'data/notes.json',
    branch: 'main',
    auto: true,
    lastSync: 0
  };

  var cfgMem = null;
  var syncing = false;
  var applying = false;
  var pushTimer = null;
  var dotEl = null;
  var modalOverlay = null;

  /* ---------- 配置读写 ---------- */

  function loadCfg() {
    if (cfgMem) return cfgMem;
    var raw = null;
    try { raw = localStorage.getItem(CFG_KEY); } catch (e) { raw = null; }
    var parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    cfgMem = {};
    for (var k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
        cfgMem[k] = parsed && parsed[k] != null ? parsed[k] : DEFAULTS[k];
      }
    }
    return cfgMem;
  }

  function saveCfg(c) {
    cfgMem = c;
    try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); return true; } catch (e) { return false; }
  }

  function isConfigured() {
    var c = loadCfg();
    return !!(c.token && c.owner && c.repo && c.path);
  }

  function loadTombs() {
    try {
      var t = JSON.parse(localStorage.getItem(TOMB_KEY) || '{}');
      return t && typeof t === 'object' ? t : {};
    } catch (e) { return {}; }
  }

  function saveTombs(t) {
    try { localStorage.setItem(TOMB_KEY, JSON.stringify(t)); } catch (e) { /* 忽略 */ }
  }

  /* ---------- 编码工具 ---------- */

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- GitHub API ---------- */

  function request(c, method, url, body) {
    var headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + c.token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    var opts = { method: method, headers: headers };
    if (body != null) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
        if (!res.ok) {
          var msg = (json && json.message) ? json.message : ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          throw err;
        }
        return json;
      });
    });
  }

  function contentsUrl(c) {
    return API + '/repos/' + encodeURIComponent(c.owner) + '/' + encodeURIComponent(c.repo) +
      '/contents/' + String(c.path).split('/').map(encodeURIComponent).join('/') +
      '?ref=' + encodeURIComponent(c.branch || 'main');
  }

  function pull(c) {
    return request(c, 'GET', contentsUrl(c)).then(function (json) {
      var data;
      try {
        data = JSON.parse(b64decode(json.content));
      } catch (e) {
        throw new Error('远端文件不是有效 JSON');
      }
      return {
        sha: json.sha,
        data: {
          notes: Array.isArray(data.notes) ? data.notes : [],
          tombstones: data.tombstones && typeof data.tombstones === 'object' ? data.tombstones : {}
        }
      };
    }).catch(function (err) {
      if (err && err.status === 404) {
        return { sha: null, data: { notes: [], tombstones: {} } };
      }
      throw err;
    });
  }

  function push(c, data, sha) {
    var body = {
      message: 'sync: notes ' + new Date().toISOString(),
      content: b64encode(JSON.stringify(data)),
      branch: c.branch || 'main'
    };
    if (sha) body.sha = sha;
    return request(c, 'PUT', contentsUrl(c), body);
  }

  /* ---------- 合并 ---------- */

  function merge(localNotes, localTombs, remoteNotes, remoteTombs) {
    var tombs = {};
    var k;
    for (k in remoteTombs) { if (Object.prototype.hasOwnProperty.call(remoteTombs, k)) tombs[k] = remoteTombs[k]; }
    for (k in localTombs) {
      if (!Object.prototype.hasOwnProperty.call(localTombs, k)) continue;
      if (!tombs[k] || localTombs[k] > tombs[k]) tombs[k] = localTombs[k];
    }

    var map = {};
    (remoteNotes || []).forEach(function (n) { if (n && n.id) map[n.id] = n; });
    (localNotes || []).forEach(function (n) {
      if (!n || !n.id) return;
      var cur = map[n.id];
      if (!cur || (n.updatedAt || 0) > (cur.updatedAt || 0)) map[n.id] = n;
    });

    var notes = [];
    Object.keys(map).forEach(function (id) {
      var n = map[id];
      var t = tombs[id];
      if (t && (n.updatedAt || 0) <= t) return; // 已删除且没有更新的版本
      notes.push(n);
    });
    notes.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    return { notes: notes, tombstones: tombs };
  }

  /* 清理过旧墓碑（30 天前，且对应笔记已不存在） */
  function pruneTombs(tombs, notes) {
    var alive = {};
    (notes || []).forEach(function (n) { if (n && n.id) alive[n.id] = true; });
    var cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    var out = {};
    Object.keys(tombs).forEach(function (id) {
      if (!alive[id] && tombs[id] < cutoff) return;
      out[id] = tombs[id];
    });
    return out;
  }

  /* ---------- 状态展示 ---------- */

  function setDot(state, title) {
    if (!dotEl) return;
    dotEl.className = 'cloud-dot' + (state ? ' ' + state : '');
    if (title != null) dotEl.title = title;
  }

  function statusText() {
    var c = loadCfg();
    if (!isConfigured()) return '未配置：点「保存配置」后开始同步';
    if (syncing) return '同步中…';
    if (c.lastSync) return '上次同步：' + NotesApp.ui.formatTime(c.lastSync);
    return '已配置，尚未同步';
  }

  /* ---------- 同步主流程 ---------- */

  function sync(opts) {
    opts = opts || {};
    var c = loadCfg();
    if (!isConfigured()) {
      if (!opts.silent) {
        NotesApp.ui.toast('请先填写 token 并保存配置', 'error');
        openModal();
      }
      return Promise.resolve({ ok: false, reason: 'not-configured' });
    }
    if (syncing) return Promise.resolve({ ok: false, reason: 'busy' });
    // 有未保存内容时不动编辑器，稍后重试
    if (NotesApp.notes && NotesApp.notes.isDirty && NotesApp.notes.isDirty()) {
      if (!opts.silent) NotesApp.ui.toast('有未保存内容，请先保存再同步', 'error');
      return Promise.resolve({ ok: false, reason: 'dirty' });
    }

    syncing = true;
    setDot('busy', '同步中');
    if (modalOverlay) updateModalStatus('同步中…');

    return pull(c).then(function (remote) {
      var local = NotesApp.storage.getNotes().slice();
      var merged = merge(local, loadTombs(), remote.data.notes, remote.data.tombstones);
      merged.tombstones = pruneTombs(merged.tombstones, merged.notes);

      var localJson = JSON.stringify(local);
      var changedLocal = JSON.stringify(merged.notes) !== localJson;
      if (changedLocal) {
        applying = true;
        var res = NotesApp.storage.saveNotes(merged.notes);
        applying = false;
        if (!res.ok) throw new Error(res.message);
        NotesApp.history.render();
        if (NotesApp.notes.reloadCurrent) NotesApp.notes.reloadCurrent();
      }
      saveTombs(merged.tombstones);

      var remoteJson = JSON.stringify({ notes: remote.data.notes, tombstones: remote.data.tombstones });
      var mergedJson = JSON.stringify({ notes: merged.notes, tombstones: merged.tombstones });
      var needPush = mergedJson !== remoteJson;

      if (!needPush) return { ok: true, pushed: false, pulled: changedLocal };

      var payload = { version: 1, updatedAt: Date.now(), notes: merged.notes, tombstones: merged.tombstones };
      return push(c, payload, remote.sha).then(function () {
        return { ok: true, pushed: true, pulled: changedLocal };
      });
    }).then(function (result) {
      c.lastSync = Date.now();
      saveCfg(c);
      setDot('ok', statusText());
      if (modalOverlay) updateModalStatus('同步完成 · ' + NotesApp.ui.formatTime(c.lastSync));
      if (!opts.silent) {
        var msg = '云同步完成';
        if (result && result.pushed && result.pulled) msg = '云同步完成（已合并双向改动）';
        else if (result && result.pushed) msg = '云同步完成（已上传本地改动）';
        else if (result && result.pulled) msg = '云同步完成（已拉取远端改动）';
        NotesApp.ui.toast(msg, 'success');
      }
      syncing = false;
      return result || { ok: true };
    }).catch(function (err) {
      syncing = false;
      var msg = err && err.message ? err.message : '未知错误';
      setDot('err', msg);
      if (modalOverlay) updateModalStatus('同步失败：' + msg);
      if (!opts.silent) NotesApp.ui.toast('同步失败：' + msg, 'error');
      return { ok: false, error: msg };
    });
  }

  function schedulePush() {
    var c = loadCfg();
    if (!isConfigured() || !c.auto) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      sync({ silent: true });
    }, PUSH_DELAY);
  }

  /* 包装 storage.saveNotes：记录删除墓碑，并在保存后触发自动同步 */
  function wrapStorage() {
    var storage = NotesApp.storage;
    var original = storage.saveNotes;
    if (!original || original.__cloudWrapped) return;
    var wrapped = function (notes) {
      var prev = storage.getNotes();
      var prevIds = {};
      var nextIds = {};
      var i;
      for (i = 0; i < prev.length; i++) prevIds[prev[i].id] = true;
      for (i = 0; i < (notes || []).length; i++) if (notes[i] && notes[i].id) nextIds[notes[i].id] = true;
      var tombs = loadTombs();
      var now = Date.now();
      var removed = false;
      for (var id in prevIds) {
        if (Object.prototype.hasOwnProperty.call(prevIds, id) && !nextIds[id]) {
          tombs[id] = now;
          removed = true;
        }
      }
      if (removed) saveTombs(tombs);

      var res = original.call(storage, notes);
      if (res && res.ok && !applying) schedulePush();
      return res;
    };
    wrapped.__cloudWrapped = true;
    storage.saveNotes = wrapped;
  }

  /* ---------- 配置弹窗 ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function updateModalStatus(text) {
    var s = modalOverlay && modalOverlay.querySelector('.cloud-status');
    if (s) s.textContent = text;
  }

  function closeModal() {
    if (modalOverlay && modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
    modalOverlay = null;
  }

  function openModal() {
    if (modalOverlay) { updateModalStatus(statusText()); return; }
    var c = loadCfg();
    var root = document.getElementById('modal-root');
    if (!root) return;

    var overlay = el('div', 'modal-overlay');
    var modal = el('div', 'modal cloud-form');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.appendChild(el('h3', '', '云同步设置'));

    function row(labelText, input, hint) {
      var wrap = el('div', 'form-row');
      wrap.appendChild(el('label', '', labelText));
      wrap.appendChild(input);
      if (hint) wrap.appendChild(el('div', 'cloud-note', hint));
      modal.appendChild(wrap);
      return input;
    }

    var tokenInput = el('input', 'input');
    tokenInput.type = 'password';
    tokenInput.autocomplete = 'off';
    tokenInput.placeholder = 'ghp_… 或 github_pat_…';
    tokenInput.value = c.token || '';
    row('GitHub Token', tokenInput, '只存在本机浏览器。建议用 fine-grained token，仅授权该仓库 Contents: Read and write。');

    var repoOwner = el('input', 'input');
    repoOwner.type = 'text';
    repoOwner.value = c.owner || DEFAULTS.owner;
    row('仓库 owner', repoOwner);

    var repoName = el('input', 'input');
    repoName.type = 'text';
    repoName.value = c.repo || DEFAULTS.repo;
    row('仓库名', repoName);

    var filePath = el('input', 'input');
    filePath.type = 'text';
    filePath.value = c.path || DEFAULTS.path;
    row('存储文件路径', filePath, '笔记会写入该文件（换设备时填同一路径即可读回）。');

    var autoWrap = el('label', 'cloud-check');
    var autoInput = el('input');
    autoInput.type = 'checkbox';
    autoInput.checked = c.auto !== false;
    autoWrap.appendChild(autoInput);
    autoWrap.appendChild(document.createTextNode('保存笔记后自动同步'));
    modal.appendChild(autoWrap);

    var status = el('div', 'cloud-status', statusText());
    modal.appendChild(status);

    var actions = el('div', 'actions');
    var saveBtn = el('button', 'btn btn-primary btn-sm', '保存配置');
    saveBtn.type = 'button';
    var syncBtn = el('button', 'btn btn-secondary btn-sm', '立即同步');
    syncBtn.type = 'button';
    var closeBtn = el('button', 'btn btn-secondary btn-sm', '关闭');
    closeBtn.type = 'button';
    actions.appendChild(saveBtn);
    actions.appendChild(syncBtn);
    actions.appendChild(closeBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    root.appendChild(overlay);
    modalOverlay = overlay;
    tokenInput.focus();

    function readForm() {
      return {
        token: tokenInput.value.trim(),
        owner: repoOwner.value.trim(),
        repo: repoName.value.trim(),
        path: filePath.value.trim().replace(/^\/+/, ''),
        branch: c.branch || 'main',
        auto: autoInput.checked,
        lastSync: c.lastSync || 0
      };
    }

    saveBtn.addEventListener('click', function () {
      var next = readForm();
      if (!next.token) { NotesApp.ui.toast('请填写 token', 'error'); return; }
      if (!next.owner || !next.repo || !next.path) { NotesApp.ui.toast('仓库信息不完整', 'error'); return; }
      saveCfg(next);
      updateModalStatus(statusText());
      setDot(isConfigured() ? 'ok' : '', statusText());
      NotesApp.ui.toast('配置已保存', 'success');
    });

    syncBtn.addEventListener('click', function () {
      var next = readForm();
      if (!next.token) { NotesApp.ui.toast('请填写 token', 'error'); return; }
      saveCfg(next);
      sync({ silent: false });
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); closeModal(); }
    });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    wrapStorage();
    dotEl = document.getElementById('cloud-dot');
    var btn = document.getElementById('btn-cloud');
    if (btn) btn.addEventListener('click', openModal);
    setDot(isConfigured() ? 'ok' : '', statusText());

    var c = loadCfg();
    if (isConfigured() && c.auto) {
      setTimeout(function () { sync({ silent: true }); }, 1200);
    }
  }

  NotesApp.cloud = {
    init: init,
    sync: sync,
    openModal: openModal,
    isConfigured: isConfigured,
    schedulePush: schedulePush
  };
})();
