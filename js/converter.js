/* converter.js — Markdown → HTML（marked 渲染）→ Word 导出（方案 A：MHTML 风格 .doc）。
 * 依赖：marked（lib/marked.min.js，UMD 全局 window.marked）、ui.js
 */
(function () {
  'use strict';
  window.NotesApp = window.NotesApp || {};
  var NotesApp = window.NotesApp;

  var sourceEl = null;
  var previewEl = null;
  var filenameHintEl = null;
  var previewTimer = null;
  var PREVIEW_DELAY = 300; // 实时预览防抖（PRD 4.1）

  var EXAMPLE = [
    '# 项目说明',
    '',
    '这是一个 **幻世界临时文本记录工具**，支持：',
    '',
    '- 记事本：记录与保存',
    '- 左侧目录：切换与删除',
    '- Markdown 转 Word：一键导出',
    '',
    '## 快速上手',
    '',
    '1. 双击 `index.html` 打开',
    '2. 选择模块开始使用',
    '',
    '| 模块 | 状态 |',
    '| --- | --- |',
    '| 记事本 | ✅ 完成 |',
    '| 左侧目录 | ✅ 完成 |',
    '',
    '> 数据仅保存在本机浏览器。',
    '',
    '```js',
    '// 导出示例',
    'const blob = new Blob([html], { type: \'application/msword\' });',
    '```'
  ].join('\n');

  function markedAvailable() {
    return typeof window !== 'undefined' && typeof window.marked !== 'undefined';
  }

  function renderMarkdown(md) {
    // 启用 gfm（表格/删除线等）与 breaks（单换行转 <br>），PRD 2.3.3
    return window.marked.parse(md, { gfm: true, breaks: true });
  }

  /* 提取首个 H1 标题，用于导出文件名 */
  function firstH1(md) {
    var lines = String(md || '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^#\s+(.+?)\s*#*\s*$/);
      if (m && m[1].trim()) return m[1].trim();
    }
    return null;
  }

  function sanitizeFilename(name) {
    var s = String(name || '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
    return s || '文档';
  }

  function buildFileName(md, ts) {
    var base = sanitizeFilename(firstH1(md) || '文档');
    return base + '_' + NotesApp.ui.formatFileStamp(ts) + '.doc';
  }

  function updatePreview() {
    if (!previewEl) return;
    var md = sourceEl.value || '';

    var hint = '';
    if (md.trim() === '') {
      hint = '';
    } else {
      hint = '导出文件名：' + buildFileName(md, Date.now());
    }
    if (filenameHintEl) filenameHintEl.textContent = hint;

    if (md.trim() === '') {
      previewEl.innerHTML = '';
      previewEl.classList.add('is-empty');
      previewEl.textContent = '预览区（输入 Markdown 后在此显示渲染结果）';
      return;
    }

    if (!markedAvailable()) {
      previewEl.classList.remove('is-empty');
      previewEl.innerHTML = '<p style="color:var(--color-danger)">marked 库未加载，无法渲染预览（请联网加载 lib/marked.min.js）。</p>';
      return;
    }

    var html;
    try {
      html = renderMarkdown(md);
    } catch (e) {
      previewEl.classList.remove('is-empty');
      previewEl.innerHTML = '<p style="color:var(--color-danger)">渲染失败：' + NotesApp.ui.escapeHtml(e && e.message ? e.message : String(e)) + '</p>';
      return;
    }
    previewEl.classList.remove('is-empty');
    previewEl.innerHTML = html;
  }

  function schedulePreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      previewTimer = null;
      updatePreview();
    }, PREVIEW_DELAY);
  }

  function loadExample() {
    sourceEl.value = EXAMPLE;
    updatePreview();
    sourceEl.focus();
  }

  function clear() {
    sourceEl.value = '';
    updatePreview();
    sourceEl.focus();
  }

  /* 封装为 Word 可打开的 MHTML 风格文档（PRD 方案 A）。 */
  function buildWordDocument(bodyHtml, title) {
    var t = NotesApp.ui.escapeHtml(title);
    return [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
      '      xmlns:w="urn:schemas-microsoft-com:office:word"',
      '      xmlns="http://www.w3.org/TR/REC-html40">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
      '<title>' + t + '</title>',
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->',
      '<style>',
      '  body { font-family: "Microsoft YaHei", "SimSun", "PingFang SC", Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #1f2329; }',
      '  h1 { font-size: 22pt; margin: 12pt 0 8pt; }',
      '  h2 { font-size: 16pt; margin: 14pt 0 6pt; }',
      '  h3 { font-size: 13pt; margin: 10pt 0 4pt; }',
      '  p { margin: 4pt 0; }',
      '  ul, ol { margin: 4pt 0; padding-left: 24pt; }',
      '  pre { background: #f1f3f5; border: 1px solid #e5e7eb; padding: 8pt 10pt; white-space: pre-wrap; word-wrap: break-word; font-family: Consolas, "Courier New", monospace; font-size: 10pt; }',
      '  code { font-family: Consolas, "Courier New", monospace; background: #eef1fe; color: #4a6cf7; padding: 1pt 3pt; }',
      '  pre code { background: none; color: inherit; padding: 0; }',
      '  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }',
      '  th, td { border: 1px solid #d0d4db; padding: 4pt 8pt; font-size: 11pt; }',
      '  th { background: #f1f3f5; font-weight: 600; }',
      '  blockquote { border-left: 3pt solid #4a6cf7; background: #eef1fe; padding: 6pt 10pt; margin: 8pt 0; color: #5c6370; }',
      '  a { color: #4a6cf7; }',
      '  img { max-width: 100%; }',
      '  hr { border: none; border-top: 1px solid #e5e7eb; margin: 10pt 0; }',
      '</style>',
      '</head>',
      '<body>' + bodyHtml + '</body>',
      '</html>'
    ].join('\n');
  }

  function exportWord() {
    var ui = NotesApp.ui;
    var md = sourceEl.value || '';

    if (md.trim() === '') {
      ui.toast('请先输入 Markdown 内容', 'error');
      return;
    }
    if (!markedAvailable()) {
      ui.toast('marked 库未加载，无法导出（请联网加载 lib/marked.min.js）', 'error');
      return;
    }

    var bodyHtml;
    try {
      bodyHtml = renderMarkdown(md);
    } catch (e) {
      ui.toast('渲染失败：' + (e && e.message ? e.message : String(e)), 'error');
      return;
    }

    var title = firstH1(md) || '文档';
    var fileName = buildFileName(md, Date.now());
    var fullHtml = buildWordDocument(bodyHtml, title);

    try {
      // 内容前加 UTF-8 BOM，type 用 application/msword，扩展名 .doc（PRD 方案 A）
      var blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      ui.toast('已开始下载：' + fileName, 'success');
    } catch (e) {
      ui.toast('导出失败：' + (e && e.message ? e.message : String(e)), 'error');
    }
  }

  /* 一键复制预览区内容：富文本（text/html）+ 纯文本（text/plain），按优先级降级。 */
  function copyPreview() {
    var ui = NotesApp.ui;
    var md = sourceEl.value || '';

    if (md.trim() === '' || previewEl.classList.contains('is-empty')) {
      ui.toast('没有可复制的内容', 'error');
      return;
    }

    var html = previewEl.innerHTML;
    var text = previewEl.innerText || previewEl.textContent || '';

    function ok() { ui.toast('已复制', 'success'); }
    function fail(msg) { ui.toast('复制失败：' + msg, 'error'); }

    /* c) 兜底：execCommand + 隐藏 textarea（file:// 双击打开下可用） */
    function execFallback(reason) {
      var okExec = false;
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        okExec = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        okExec = false;
      }
      if (okExec) { ok(); } else { fail(reason || '浏览器不支持复制'); }
    }

    /* b) writeText 纯文本 */
    function writeTextFallback(reason) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { execFallback(reason || '写入剪贴板失败'); });
        return;
      }
      execFallback(reason);
    }

    /* a) write + ClipboardItem：同时写 text/html（富文本）与 text/plain（纯文本） */
    if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
      try {
        var item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        });
        navigator.clipboard.write([item]).then(ok, function () { writeTextFallback('富文本复制失败'); });
        return;
      } catch (e) {
        /* ClipboardItem 构造失败，降级到 writeText/execCommand */
      }
    }
    writeTextFallback(null);
  }

  function init() {
    sourceEl = document.getElementById('md-source');
    previewEl = document.getElementById('md-preview');
    filenameHintEl = document.getElementById('filename-hint');

    sourceEl.addEventListener('input', schedulePreview);

    document.getElementById('btn-example').addEventListener('click', loadExample);
    document.getElementById('btn-convert-clear').addEventListener('click', clear);
    document.getElementById('btn-preview').addEventListener('click', function () {
      if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
      updatePreview();
      NotesApp.ui.toast('预览已更新', 'info');
    });
    document.getElementById('btn-export').addEventListener('click', exportWord);
    document.getElementById('btn-copy-preview').addEventListener('click', copyPreview);

    updatePreview();
  }

  NotesApp.converter = {
    init: init,
    updatePreview: updatePreview,
    exportWord: exportWord,
    copyPreview: copyPreview
  };
})();
