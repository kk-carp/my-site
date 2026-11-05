import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { mountResources } from '../src/scripts/resources.js';

// Use the real page markup rather than a second hand-maintained UI fixture.
const source = readFileSync(new URL('../src/pages/learn.astro', import.meta.url), 'utf8');
const markup = source.slice(source.indexOf('<div id="resource-app"'), source.indexOf('  <script src='))
  .replace('data-stage={stage}', 'data-stage="6"').replace(/\{stage >= \d && <>/g, '').replace(/<\/>\}/g, '')
  .replace(/\{stage >= \d && /g, '').replace(/<\/section>\}/g, '</section>').replace(/<\/label>\}/g, '</label>');
let sequence = 0;
function setup({ raw = null, stage = 6, confirm = true } = {}) {
  const dom = new JSDOM(markup, { url: 'https://test.example/learn/' });
  const doc = dom.window.document, root = doc.querySelector('#resource-app'); root.dataset.stage = String(stage);
  globalThis.Option = dom.window.Option;
  const memory = { raw, writes: 0, fail: false, getItem() { return this.raw; }, setItem(_key, value) { if (this.fail) throw new Error('quota'); this.raw = value; this.writes++; } };
  const downloads = [];
  const app = mountResources(root, { getAdapter: () => memory, makeId: () => `id-${++sequence}`, confirmDelete: () => confirm, download: csv => downloads.push(csv) });
  const $ = id => doc.getElementById(id);
  function change(id, value, event = 'change') { $(id).value = value; $(id).dispatchEvent(new dom.window.Event(event, { bubbles: true })); }
  function submit(title, url) {
    const form = $('resource-form'); form.elements.namedItem('title').value = title; form.elements.namedItem('url').value = url;
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  }
  async function file(text, failure = false) {
    Object.defineProperty($('csv-file'), 'files', { configurable: true, value: [{ text: async () => { if (failure) throw new Error('unreadable'); return text; } }] });
    $('csv-file').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await new Promise(resolve => setImmediate(resolve));
  }
  return { dom, $, app, memory, change, submit, file, downloads, root };
}
test('UI A01/A03: 文本渲染、编辑取消、删除取消、无效链接', () => {
  const ui = setup({ confirm: false });
  ui.submit('<img src=x onerror=alert(1)>', 'https://example.org');
  assert.equal(ui.app.getResources().length, 1);
  assert.equal(ui.$('resource-list').querySelector('img'), null);
  assert.equal(ui.$('resource-list').querySelector('a').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(ui.$('resource-list').querySelector('a').rel, 'noopener noreferrer');
  const buttons = [...ui.$('resource-list').querySelectorAll('button')];
  buttons.find(button => button.textContent === '编辑').click();
  ui.$('cancel-edit').click(); buttons.find(button => button.textContent === '删除').click();
  assert.equal(ui.app.getResources().length, 1);
  ui.submit('bad', 'javascript:alert(1)'); assert.equal(ui.app.getResources().length, 1);
});
test('UI A02/A04: 筛选隐藏提示，写失败保留表单和集合，状态失败回退', () => {
  const ui = setup(); ui.$('load-samples').click();
  ui.change('search', 'CSV', 'input'); ui.change('filter-tag', '前端'); ui.change('filter-status', 'todo');
  assert.equal(ui.$('resource-list').querySelectorAll('.learn-resource').length, 0); assert.match(ui.$('resource-empty').textContent, /匹配/);
  ui.submit('new', 'https://example.org/new'); assert.match(ui.$('resource-message').textContent, /隐藏/);
  ui.memory.fail = true; ui.submit('retry', 'https://example.org/retry');
  assert.equal(ui.app.getResources().length, 4); assert.equal(ui.$('resource-form').elements.namedItem('title').value, 'retry');
  ui.$('clear-filters').click();
  const select = ui.$('resource-list').querySelector('select'); select.value = 'done'; select.dispatchEvent(new ui.dom.window.Event('change'));
  assert.equal(ui.$('resource-list').querySelector('select').value, 'todo');
});
test('UI A04: 损坏存储不覆盖，修复后重试读取', () => {
  const ui = setup({ raw: '{bad' });
  assert.equal(ui.$('storage-error').hidden, false); assert.equal(ui.$('editor-fields').disabled, true);
  assert.equal(ui.memory.raw, '{bad'); assert.equal(ui.memory.writes, 0);
  ui.memory.raw = null; ui.$('retry-load').click(); assert.equal(ui.$('editor-fields').disabled, false);
});
test('UI A05/A06: 预览/取消/坏文件/写失败/重算确认/全量导出', async () => {
  const ui = setup(); ui.$('load-samples').click(); const before = ui.memory.raw;
  const csv = readFileSync(new URL('../teaching/fixtures/mixed.csv', import.meta.url), 'utf8');
  await ui.file(csv); assert.match(ui.$('preview-summary').textContent, /新增 1 \/ 重复 1 \/ 错误 1/); assert.equal(ui.memory.raw, before);
  ui.$('cancel-import').click(); assert.equal(ui.memory.raw, before);
  await ui.file('title,tags\nx,y'); assert.equal(ui.$('import-preview').hidden, true); assert.equal(ui.memory.raw, before);
  await ui.file('', true); assert.match(ui.$('resource-message').textContent, /unreadable/);
  await ui.file(csv); ui.memory.fail = true; ui.$('confirm-import').click();
  assert.equal(ui.memory.raw, before); assert.equal(ui.$('import-preview').hidden, false);
  ui.memory.fail = false; ui.$('confirm-import').click(); assert.equal(ui.app.getResources().length, 4);
  ui.change('search', 'CSV', 'input'); ui.$('export-csv').click(); assert.match(ui.downloads[0], /Python练习/);
  await ui.file(csv); const writes = ui.memory.writes; ui.$('confirm-import').click(); assert.equal(ui.memory.writes, writes);
});
test('UI A05: 预览后集合变化，确认重新去重', async () => {
  const ui = setup(); await ui.file('title,url\nimported,https://example.org/new');
  ui.submit('manual', 'https://example.org/new'); const writes = ui.memory.writes;
  ui.$('confirm-import').click(); assert.equal(ui.app.getResources().length, 1); assert.equal(ui.memory.writes, writes);
});
test('UI CR-01: 星标保存、刷新恢复、筛选以及删除确认', () => {
  const ui = setup(); ui.$('load-samples').click();
  ui.$('resource-list').querySelector('[aria-pressed]').click();
  assert.equal(ui.app.getResources()[0].starred, true);
  const restored = setup({ raw: ui.memory.raw });
  restored.$('filter-starred').checked = true; restored.$('filter-starred').dispatchEvent(new restored.dom.window.Event('change'));
  assert.equal(restored.$('resource-list').querySelectorAll('.learn-resource').length, 1);
  [...restored.$('resource-list').querySelectorAll('button')].find(button => button.textContent === '删除').click();
  assert.equal(restored.app.getResources().length, 2);
});
test('UI 第4章: 内存运行不触碰存储，刷新为空', () => {
  const ui = setup({ stage: 4 }); ui.memory.fail = true; ui.$('load-samples').click();
  assert.equal(ui.app.getResources().length, 3); assert.equal(ui.memory.raw, null);
  assert.equal(setup({ stage: 4 }).app.getResources().length, 0);
});
test('UI 收藏弹窗: 打开、取消不保存、错误保留输入、成功关闭与编辑保持id', () => {
  const ui = setup();
  assert.equal(ui.$('resource-dialog').open, false);
  ui.$('open-add').click(); assert.equal(ui.$('resource-dialog').open, true);
  assert.equal(ui.dom.window.document.activeElement.name, 'title');
  ui.submit('不合法的收藏', 'javascript:alert(1)');
  assert.equal(ui.$('resource-dialog').open, true); assert.equal(ui.$('editor-message').hidden, false);
  ui.$('cancel-edit').click(); assert.equal(ui.app.getResources().length, 0);
  assert.equal(ui.dom.window.document.activeElement.id, 'open-add');
  ui.$('open-add').click(); ui.memory.fail = true; ui.submit('保留输入', 'https://example.org/modal');
  assert.equal(ui.$('resource-dialog').open, true);
  assert.equal(ui.$('resource-form').elements.namedItem('title').value, '保留输入');
  ui.memory.fail = false; ui.submit('卡片名称', 'https://example.org/modal');
  assert.equal(ui.$('resource-dialog').open, false);
  const originalId = ui.app.getResources()[0].id;
  [...ui.$('resource-list').querySelectorAll('button')].find(button => button.textContent === '编辑').click();
  assert.equal(ui.$('resource-dialog').open, true);
  ui.submit('更新名称', 'https://example.org/modal'); assert.equal(ui.app.getResources()[0].id, originalId);
  assert.equal(ui.app.getResources()[0].title, '更新名称');
  ui.$('open-add').click(); ui.$('resource-dialog').dispatchEvent(new ui.dom.window.Event('cancel', { cancelable: true }));
  assert.equal(ui.$('resource-dialog').open, false); assert.equal(ui.app.getResources().length, 1);
  assert.equal(ui.$('resource-list').contains(ui.$('add-card')), true);
});
