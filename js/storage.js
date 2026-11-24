/* storage.js — localStorage 封装：读写笔记、当前笔记 ID、设置；容量检查、异常兜底。
 * 数据唯一出口：业务模块不得直接调用 localStorage.setItem/getItem。
 * 存储键严格遵循 PRD 第 3 章（统一 notes.app.* 前缀）：
 *   notes.app.notes        -> JSON 数组（Note[]）
 *   notes.app.currentNoteId -> string | ''（空字符串表示 null/新建态）
 *   notes.app.settings     -> JSON 对象
 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var KEYS = {
    notes: 'notes.app.notes',
    currentNoteId: 'notes.app.currentNoteId',
    settings: 'notes.app.settings'
  };

  /* localStorage 容量上限（约 5MB，UTF-16 码元计数）。PRD 3.4 要求写入前估算
   * JSON.stringify(data).length 并做接近上限的预判。 */
  var MAX_CHARS = 4.8 * 1000 * 1000;

  /* 内存态（会话内唯一数据源） */
  var _notes = [];
  var _currentNoteId = null;
  var _settings = {};

  function safeParseJSON(raw, fallback) {
    if (raw == null || raw === '') return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  /* 净化单条笔记对象，缺字段补默认值 */
  function sanitizeNote(n) {
    if (!n || typeof n !== 'object') return null;
    if (typeof n.id !== 'string' || !n.id) return null;
    return {
      id: n.id,
      title: typeof n.title === 'string' ? n.title : '',
      content: typeof n.content === 'string' ? n.content : '',
      createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
      updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now()
    };
  }

  function readNotes() {
    try {
      var raw = localStorage.getItem(KEYS.notes);
      if (raw == null) return { notes: [], corrupted: false };
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return { notes: [], corrupted: true };
      var clean = [];
      for (var i = 0; i < arr.length; i++) {
        var n = sanitizeNote(arr[i]);
        if (n) clean.push(n);
      }
      return { notes: clean, corrupted: false };
    } catch (e) {
      return { notes: [], corrupted: true };
    }
  }

  function readCurrentNoteId() {
    try {
      var v = localStorage.getItem(KEYS.currentNoteId);
      return v ? v : null;
    } catch (e) {
      return null;
    }
  }

  function readSettings() {
    return safeParseJSON(localStorage.getItem(KEYS.settings), {});
  }

  /* 初始化：从 localStorage 载入到内存。返回 { corrupted } 供启动时提示。 */
  function init() {
    var r = readNotes();
    _notes = r.notes;
    _currentNoteId = readCurrentNoteId();
    _settings = readSettings();

    // 兜底：当前笔记 ID 指向不存在的笔记时重置为空（新建态）
    if (_currentNoteId && !findById(_currentNoteId)) {
      _currentNoteId = null;
    }
    return { corrupted: r.corrupted };
  }

  function findById(id) {
    for (var i = 0; i < _notes.length; i++) {
      if (_notes[i].id === id) return _notes[i];
    }
    return null;
  }

  function getNotes() { return _notes; }

  function getNoteById(id) { return findById(id); }

  function getCurrentNoteId() { return _currentNoteId; }

  function getSettings() { return _settings; }

  function getMaxChars() { return MAX_CHARS; }

  /* 写入笔记数组（整体覆写）。返回 { ok, message }；容量满 / 异常时 ok=false。 */
  function saveNotes(notes) {
    var json;
    try {
      json = JSON.stringify(notes);
    } catch (e) {
      return { ok: false, message: '数据序列化失败：' + (e && e.message ? e.message : '未知错误') };
    }
    if (json.length > MAX_CHARS) {
      return { ok: false, message: '存储空间不足，请删除部分历史记录' };
    }
    try {
      localStorage.setItem(KEYS.notes, json);
      _notes = notes;
      return { ok: true };
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
        return { ok: false, message: '存储空间不足，请删除部分历史记录' };
      }
      return { ok: false, message: '保存失败：' + (e && e.message ? e.message : '未知错误') };
    }
  }

  function saveCurrentNoteId(id) {
    _currentNoteId = id;
    try {
      if (id == null || id === '') {
        localStorage.removeItem(KEYS.currentNoteId);
      } else {
        localStorage.setItem(KEYS.currentNoteId, id);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveSettings(settings) {
    _settings = settings || {};
    try {
      localStorage.setItem(KEYS.settings, JSON.stringify(_settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* 估算当前已用存储（UTF-16 字符数 + 近似 KB），供历史模块展示 */
  function estimateUsage() {
    var chars;
    try {
      chars = JSON.stringify(_notes).length;
    } catch (e) {
      chars = 0;
    }
    return { chars: chars, kb: Math.round(chars / 1024), maxChars: MAX_CHARS };
  }

  NotesApp.storage = {
    init: init,
    getNotes: getNotes,
    getNoteById: getNoteById,
    getCurrentNoteId: getCurrentNoteId,
    getSettings: getSettings,
    getMaxChars: getMaxChars,
    saveNotes: saveNotes,
    saveCurrentNoteId: saveCurrentNoteId,
    saveSettings: saveSettings,
    estimateUsage: estimateUsage,
    KEYS: KEYS
  };
})();
