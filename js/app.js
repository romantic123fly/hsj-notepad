/* app.js — 应用入口：启动初始化、两模块 Tab 路由、主题切换、快捷键。
 * 依赖：ui.js、storage.js、notes.js、history.js、converter.js
 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var TAB_ORDER = ['notes', 'convert'];
  var currentTab = 'notes';

  var tabButtons = {};
  var panels = {};

  function switchTab(name) {
    if (TAB_ORDER.indexOf(name) === -1) return;
    currentTab = name;

    TAB_ORDER.forEach(function (t) {
      var active = t === name;
      tabButtons[t].classList.toggle('active', active);
      tabButtons[t].setAttribute('aria-selected', active ? 'true' : 'false');
      tabButtons[t].setAttribute('tabindex', active ? '0' : '-1');
      panels[t].hidden = !active;
    });

    // 进入记事本时刷新目录（数据可能已变化）
    if (name === 'notes') {
      NotesApp.history.render();
    }
  }

  function moveTabFocus(delta) {
    var idx = TAB_ORDER.indexOf(currentTab);
    var next = (idx + delta + TAB_ORDER.length) % TAB_ORDER.length;
    switchTab(TAB_ORDER[next]);
    tabButtons[TAB_ORDER[next]].focus();
  }

  function applyTheme(theme) {
    var dark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var sw = document.getElementById('theme-switch');
    if (sw) sw.checked = dark;
  }

  function initTheme() {
    var settings = NotesApp.storage.getSettings() || {};
    applyTheme(settings.theme === 'dark' ? 'dark' : 'light');
    document.getElementById('theme-switch').addEventListener('change', function (e) {
      var theme = e.target.checked ? 'dark' : 'light';
      applyTheme(theme);
      var s = NotesApp.storage.getSettings() || {};
      s.theme = theme;
      NotesApp.storage.saveSettings(s);
    });
  }

  function initTabs() {
    TAB_ORDER.forEach(function (t) {
      tabButtons[t] = document.getElementById('tab-' + t);
      panels[t] = document.getElementById('panel-' + t);
      tabButtons[t].addEventListener('click', function () { switchTab(t); });
      tabButtons[t].addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); moveTabFocus(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); moveTabFocus(-1); }
      });
    });
  }

  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      var key = e.key.toLowerCase();

      if (key === 's') {
        e.preventDefault();
        if (currentTab === 'notes') {
          var res = NotesApp.notes.save({ auto: false });
          if (!res.ok) NotesApp.ui.toast(res.message, 'error');
        }
      } else if (key === 'n') {
        e.preventDefault();
        if (currentTab === 'notes') {
          NotesApp.notes.newNote();
        }
      }
    });
  }

  function init() {
    var res = NotesApp.storage.init();
    initTabs();
    initTheme();
    NotesApp.notes.init();
    NotesApp.history.init();
    NotesApp.converter.init();
    initShortcuts();

    switchTab('notes');

    if (res.corrupted) {
      NotesApp.ui.toast('本地数据异常，已按空数据启动', 'error');
    }
  }

  NotesApp.app = {
    init: init,
    switchTab: switchTab,
    getCurrentTab: function () { return currentTab; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
