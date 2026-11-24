/* notes.js — 记事本模块：新建、编辑、保存（新增/更新）、打开目录笔记、自动保存、保存反馈。
 * 依赖：storage.js、ui.js
 * 关键规则（PRD N-05）：
 *   - 同一「当前笔记」（currentNoteId）反复保存 = 更新；
 *   - 新建 = 立即创建空占位笔记并设为当前；之后保存 = 更新该笔记（不再新增）。
 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var TITLE_MAX = 200;          // PRD 3.4：标题 ≤ 200 字符
  var CONTENT_MAX = 200000;     // PRD 3.4：正文 ≤ 200,000 字符
  var AUTOSAVE_DELAY = 3000;    // PRD N-04：编辑暂停 3s 后自动保存

  var titleInput = null;
  var bodyInput = null;
  var statusBadge = null;
  var statusTime = null;
  var statusCount = null;

  var currentNoteId = null;
  var dirty = false;
  var lastSavedAt = null;       // 最近一次成功保存时间戳
  var autosaveTimer = null;

  function getCurrentNoteId() { return currentNoteId; }

  function countChars() {
    return (titleInput.value || '').length + (bodyInput.value || '').length;
  }

  function genId() {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function setStatus(state, time, count) {
    statusBadge.className = 'badge ' + (state === 'dirty' ? 'dirty' : 'saved');
    statusBadge.textContent = state === 'dirty' ? '未保存' : '已保存';
    statusTime.textContent = time || '';
    statusCount.textContent = '· ' + count + ' 字';
  }

  function refreshStatus() {
    var count = countChars();
    if (dirty) {
      setStatus('dirty', '', count);
    } else if (lastSavedAt) {
      setStatus('saved', NotesApp.ui.formatTime(lastSavedAt), count);
    } else {
      setStatus('saved', '', count);
    }
  }

  function markDirty() {
    dirty = true;
    refreshStatus();
    scheduleAutosave();
  }

  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      autosaveTimer = null;
      if (!dirty) return;
      var title = titleInput.value || '';
      var content = bodyInput.value || '';
      // 自动保存仅在确有内容且未超长时触发，避免产生空/超长快照
      if (content.length > CONTENT_MAX) return;
      if (title.trim() === '' && content.trim() === '') return;
      save({ auto: true });
    }, AUTOSAVE_DELAY);
  }

  /* 目录渲染（避免与 history.js 循环耦合，运行期安全调用） */
  function refreshDirectory() {
    if (NotesApp.history) NotesApp.history.render();
  }

  /* 保存（新增或更新）。opts.auto=true 表示自动保存（轻反馈，不弹 toast）。
   * 返回 { ok, message }。 */
  function save(opts) {
    opts = opts || {};
    var title = titleInput.value || '';
    var content = bodyInput.value || '';

    if (content.length > CONTENT_MAX) {
      return { ok: false, message: '内容过长（超过 ' + CONTENT_MAX + ' 字符），请精简后再保存' };
    }
    if (title.length > TITLE_MAX) {
      return { ok: false, message: '标题过长（超过 ' + TITLE_MAX + ' 字符）' };
    }
    if (title.trim() === '' && content.trim() === '') {
      return { ok: false, message: '内容为空，无法保存' };
    }

    var notes = NotesApp.storage.getNotes();
    var now = Date.now();
    var note = null;

    if (currentNoteId) {
      note = NotesApp.storage.getNoteById(currentNoteId);
      if (note) {
        note.title = title;
        note.content = content;
        note.updatedAt = now;
      } else {
        // 理论上 init 已兜底，此处再次兜底：ID 失效则转新增
        currentNoteId = null;
      }
    }

    if (!currentNoteId) {
      note = {
        id: genId(),
        title: title,
        content: content,
        createdAt: now,
        updatedAt: now
      };
      notes.push(note);
      currentNoteId = note.id;
      NotesApp.storage.saveCurrentNoteId(currentNoteId);
    }

    var res = NotesApp.storage.saveNotes(notes);
    if (!res.ok) {
      return { ok: false, message: res.message };
    }

    dirty = false;
    lastSavedAt = now;
    refreshStatus();
    refreshDirectory();

    if (opts.auto) {
      // 自动保存：仅在状态栏体现，不弹 toast
    } else {
      NotesApp.ui.toast('已保存', 'success');
    }
    return { ok: true, note: note };
  }

  /* 新建：有未保存内容时二次确认放弃 */
  function newNote() {
    function doNew() {
      var now = Date.now();
      var note = {
        id: genId(),
        title: '',
        content: '',
        createdAt: now,
        updatedAt: now
      };
      // 直接用 storage 层插入，绕过 save()「标题和正文都为空则拒绝」的限制
      var notes = NotesApp.storage.getNotes().slice();
      notes.push(note);
      var res = NotesApp.storage.saveNotes(notes);
      if (!res.ok) {
        NotesApp.ui.toast(res.message, 'error');
        return;
      }
      titleInput.value = '';
      bodyInput.value = '';
      currentNoteId = note.id;
      NotesApp.storage.saveCurrentNoteId(note.id);
      dirty = false;
      lastSavedAt = now;
      if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
      refreshStatus();
      refreshDirectory();
      titleInput.focus();
    }
    if (dirty) {
      NotesApp.ui.confirm({
        title: '放弃未保存内容？',
        message: '当前内容尚未保存，确定放弃吗？',
        danger: false,
        confirmText: '放弃',
        cancelText: '取消'
      }).then(function (ok) { if (ok) doNew(); });
    } else {
      doNew();
    }
  }

  /* 从目录打开某条笔记：加载到编辑器并设为当前笔记（保存即更新，不产生新快照）。 */
  function openNote(note) {
    if (currentNoteId === note.id) return; // 已打开，无需重载

    function doOpen() {
      titleInput.value = note.title || '';
      bodyInput.value = note.content || '';
      currentNoteId = note.id;
      NotesApp.storage.saveCurrentNoteId(note.id);
      dirty = false;
      lastSavedAt = note.updatedAt;
      if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
      refreshStatus();
    }

    if (dirty) {
      NotesApp.ui.confirm({
        title: '放弃未保存内容？',
        message: '当前内容尚未保存，确定放弃吗？',
        danger: false,
        confirmText: '放弃',
        cancelText: '取消'
      }).then(function (ok) { if (ok) doOpen(); });
    } else {
      doOpen();
    }
  }

  /* 外部（目录模块）删除笔记后同步：若删的是当前笔记则清空编辑器 */
  function handleDeleted(id) {
    if (currentNoteId === id) {
      titleInput.value = '';
      bodyInput.value = '';
      currentNoteId = null;
      NotesApp.storage.saveCurrentNoteId(null);
      dirty = false;
      lastSavedAt = null;
      if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
      refreshStatus();
    }
  }

  /* 外部（目录模块）清空全部后同步：清空编辑器 */
  function handleCleared() {
    titleInput.value = '';
    bodyInput.value = '';
    currentNoteId = null;
    NotesApp.storage.saveCurrentNoteId(null);
    dirty = false;
    lastSavedAt = null;
    if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
    refreshStatus();
  }

  function init() {
    titleInput = document.getElementById('note-title');
    bodyInput = document.getElementById('note-body');
    statusBadge = document.getElementById('notes-status-badge');
    statusTime = document.getElementById('notes-status-time');
    statusCount = document.getElementById('notes-status-count');

    currentNoteId = NotesApp.storage.getCurrentNoteId();

    // 启动时若存在当前笔记，则回填编辑器（刷新后保留上下文）
    var cur = currentNoteId ? NotesApp.storage.getNoteById(currentNoteId) : null;
    if (cur) {
      titleInput.value = cur.title || '';
      bodyInput.value = cur.content || '';
      lastSavedAt = cur.updatedAt;
    }

    titleInput.addEventListener('input', markDirty);
    bodyInput.addEventListener('input', markDirty);

    document.getElementById('btn-save').addEventListener('click', function () {
      var res = save({ auto: false });
      if (!res.ok) NotesApp.ui.toast(res.message, 'error');
    });

    document.getElementById('btn-new').addEventListener('click', newNote);

    refreshStatus();
  }

  NotesApp.notes = {
    init: init,
    save: save,
    newNote: newNote,
    openNote: openNote,
    handleDeleted: handleDeleted,
    handleCleared: handleCleared,
    getCurrentNoteId: getCurrentNoteId
  };
})();
