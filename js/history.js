/* history.js — 记事本左侧「切换目录」（笔记列表）：列出全部笔记、打开/切换、单条删除、清空全部、空状态。
 * 依赖：storage.js、ui.js、notes.js
 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var listEl = null;
  var emptyEl = null;
  var storageHintEl = null;
  var clearAllBtn = null;

  function titleOf(note) {
    var t = String(note.title || '').trim();
    return t ? t : '无标题';
  }

  function sortedNotes() {
    var notes = NotesApp.storage.getNotes().slice();
    notes.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return notes;
  }

  function render() {
    var notes = sortedNotes();
    var currentId = NotesApp.notes.getCurrentNoteId();

    var usage = NotesApp.storage.estimateUsage();
    storageHintEl.textContent = '已用约 ' + usage.kb + ' KB';

    listEl.innerHTML = '';
    listEl.hidden = notes.length === 0;
    emptyEl.hidden = notes.length !== 0;
    clearAllBtn.disabled = notes.length === 0;

    for (var i = 0; i < notes.length; i++) {
      listEl.appendChild(buildItem(notes[i], notes[i].id === currentId));
    }
  }

  function buildItem(note, active) {
    var ui = NotesApp.ui;
    var item = document.createElement('div');
    item.className = 'note-item' + (active ? ' active' : '');
    item.dataset.id = note.id;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    var row1 = document.createElement('div');
    row1.className = 'row1';

    var title = document.createElement('span');
    title.className = 'n-title' + (titleOf(note) === '无标题' ? ' untitled' : '');
    title.textContent = titleOf(note);

    var delBtn = document.createElement('button');
    delBtn.className = 'n-del';
    delBtn.type = 'button';
    delBtn.textContent = '×';
    delBtn.title = '删除';
    delBtn.setAttribute('aria-label', '删除「' + titleOf(note) + '」');
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      remove(note);
    });

    row1.appendChild(title);
    row1.appendChild(delBtn);

    var time = document.createElement('div');
    time.className = 'n-time';
    time.textContent = ui.formatTime(note.updatedAt);

    item.appendChild(row1);
    item.appendChild(time);

    function open() { openNote(note); }
    item.addEventListener('click', open);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    return item;
  }

  function openNote(note) {
    NotesApp.notes.openNote(note);
    render();
  }

  function remove(note) {
    var ui = NotesApp.ui;
    ui.confirm({
      title: '删除这条笔记？',
      message: '确定删除「' + titleOf(note) + '」吗？此操作不可撤销。',
      danger: true,
      confirmText: '删除',
      cancelText: '取消'
    }).then(function (ok) {
      if (!ok) return;
      var notes = NotesApp.storage.getNotes().filter(function (n) { return n.id !== note.id; });
      var res = NotesApp.storage.saveNotes(notes);
      if (!res.ok) { ui.toast(res.message, 'error'); return; }
      NotesApp.notes.handleDeleted(note.id);
      render();
      ui.toast('已删除', 'success');
    });
  }

  function clearAll() {
    var ui = NotesApp.ui;
    var count = NotesApp.storage.getNotes().length;
    if (count === 0) return;
    ui.confirm({
      title: '清空全部笔记？',
      message: '此操作不可撤销，将删除全部 ' + count + ' 条笔记。请输入 DELETE 以确认。',
      danger: true,
      requireInput: 'DELETE',
      confirmText: '确认清空',
      cancelText: '取消'
    }).then(function (ok) {
      if (!ok) return;
      var res = NotesApp.storage.saveNotes([]);
      if (!res.ok) { ui.toast(res.message, 'error'); return; }
      NotesApp.notes.handleCleared();
      render();
      ui.toast('已清空全部笔记', 'success');
    });
  }

  function init() {
    listEl = document.getElementById('note-list');
    emptyEl = document.getElementById('note-empty');
    storageHintEl = document.getElementById('directory-storage-hint');
    clearAllBtn = document.getElementById('btn-clear-all');

    clearAllBtn.addEventListener('click', clearAll);
  }

  NotesApp.history = {
    init: init,
    render: render
  };
})();
