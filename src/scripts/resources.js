import { STATUS, filterResources, upsert } from '../lib/resources/rules.js';
import { createStorage } from '../lib/resources/storage.js';
import { parseCsv, previewCsv, confirmCsv, exportCsv } from '../lib/resources/csv.js';

export function mountResources(root, { getAdapter = () => window.localStorage, makeId = () => crypto.randomUUID(), confirmDelete = message => window.confirm(message), download = defaultDownload } = {}) {
  const doc = root.ownerDocument;
  const $ = id => root.querySelector(`#${id}`);
  const stage = Number(root.dataset.stage || 6), version = stage >= 6 ? 2 : 1;
  const store = createStorage(getAdapter, version);
  let resources = [], editing = null, parsed = null, blocked = false, fileRequest = 0;
  const form = $('resource-form');
  const dialog = $('resource-dialog'), addCard = $('add-card');
  let returnFocus = null;
  const field = name => form.elements.namedItem(name);
  const filters = () => ({ query: $('search').value, tag: $('filter-tag').value, status: $('filter-status').value, starred: $('filter-starred')?.checked || false });
  function message(text, error = false) {
    $('resource-message').textContent = text; $('resource-message').dataset.error = String(error);
    if (dialog.open) { $('editor-message').textContent = error ? text : ''; $('editor-message').hidden = !error; }
  }
  function node(tag, text, className) {
    const element = doc.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function resetEditor() {
    editing = null; form.reset(); $('editor-heading').textContent = '添加收藏';
    $('save-resource').textContent = '保存收藏'; $('editor-message').hidden = true;
  }
  function openEditor(trigger) {
    returnFocus = trigger; $('editor-message').hidden = true;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    field('title').focus();
  }
  function closeEditor() {
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    resetEditor(); (returnFocus?.isConnected ? returnFocus : $('open-add')).focus();
  }
  function commit(candidate) {
    if (blocked) { message('请先重新读取并修复收藏数据', true); return false; }
    try {
      if (stage >= 5) store.save(candidate);
      resources = candidate; render(); return true;
    } catch (error) { message(`保存失败：${error.message}。原收藏未改变，请重试。`, true); render(); return false; }
  }
  function button(text, action) { const element = node('button', text); element.type = 'button'; element.addEventListener('click', action); element.disabled = blocked; return element; }
  function render() {
    const selectedTag = $('filter-tag').value;
    const tags = [...new Set(resources.flatMap(item => item.tags))];
    // Keep a selected tag even if the last matching resource was changed/deleted.
    if (selectedTag && !tags.includes(selectedTag)) tags.push(selectedTag);
    $('filter-tag').replaceChildren(new Option('全部标签', ''), ...tags.map(tag => new Option(tag, tag)));
    $('filter-tag').value = selectedTag;
    const visible = filterResources(resources, filters());
    $('resource-count').textContent = `${visible.length} 条显示 / 共 ${resources.length} 条`;
    $('resource-empty').hidden = visible.length > 0;
    $('resource-empty').textContent = resources.length ? '没有匹配的收藏，试试重置筛选。' : '还没有收藏，点击下方卡片添加第一个网址。';
    $('editor-fields').disabled = blocked;
    $('open-add').disabled = blocked;
    $('load-samples').disabled = blocked;
    if ($('csv-file')) $('csv-file').disabled = blocked;
    if ($('confirm-import')) $('confirm-import').disabled = blocked;
    $('resource-list').replaceChildren(...visible.map(item => {
      const row = node('li', undefined, 'learn-resource'); row.dataset.id = item.id;
      const info = node('div', undefined, 'learn-card-content'), heading = node('h3'), link = node('a', item.title);
      link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      heading.append(link); info.append(node('p', item.url, 'learn-url'));
      const tagList = node('div', undefined, 'learn-tags');
      item.tags.forEach(tag => tagList.append(node('span', tag, 'tag'))); info.append(tagList);
      const top = node('div', undefined, 'learn-card-top'); top.append(heading);
      const actions = node('div', undefined, 'learn-resource-actions');
      const label = node('label'), select = node('select');
      select.setAttribute('aria-label', `${item.title}的状态`);
      select.dataset.status = item.status;
      for (const [value, text] of Object.entries(STATUS)) select.append(new Option(text, value));
      select.value = item.status; select.disabled = blocked;
      select.addEventListener('change', () => { if (commit(upsert(resources, { ...item, status: select.value }, version))) message('学习状态已保存'); });
      label.append(select); actions.append(label);
      if (stage >= 6) {
        const star = button(item.starred ? '★' : '☆', () => { if (commit(upsert(resources, { ...item, starred: !item.starred }, version))) message('星标已保存'); });
        star.className = 'learn-star'; star.title = item.starred ? '取消星标' : '添加星标';
        star.setAttribute('aria-pressed', String(item.starred)); star.setAttribute('aria-label', `${item.starred ? '取消' : '添加'}星标：${item.title}`); top.append(star);
      }
      actions.append(button('编辑', event => {
        editing = item.id;
        for (const name of ['title', 'url', 'status']) field(name).value = item[name];
        field('tags').value = item.tags.join(';');
        $('editor-heading').textContent = '编辑收藏'; $('save-resource').textContent = '保存修改';
        openEditor(event.currentTarget);
      }), button('删除', () => {
        if (!confirmDelete(`删除“${item.title}”？`)) return;
        if (commit(resources.filter(resource => resource.id !== item.id))) { if (editing === item.id) resetEditor(); message('资源已删除'); }
      }));
      row.append(top, info, actions); return row;
    }), addCard);
  }
  function load() {
    try {
      resources = stage >= 5 ? store.load().resources : [];
      blocked = false; $('storage-error').hidden = true; render();
    } catch (error) {
      blocked = true; $('storage-error').hidden = false;
      $('storage-error-text').textContent = `无法恢复收藏：${error.message}`; render();
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const existing = resources.find(item => item.id === editing);
      const resource = { ...existing, id: editing || makeId(), title: field('title').value, url: field('url').value, tags: field('tags').value, status: field('status').value };
      const candidate = upsert(resources, resource, version);
      if (commit(candidate)) {
        const hidden = !filterResources(candidate.filter(item => item.id === resource.id), filters()).length;
        closeEditor(); message(`收藏已保存${hidden ? '，当前筛选条件隐藏了这条收藏' : ''}`);
      }
    } catch (error) { message(error.message, true); }
  });
  $('open-add').addEventListener('click', event => { resetEditor(); openEditor(event.currentTarget); });
  function cancelEditor() { closeEditor(); message('已取消，原收藏未改变'); }
  $('cancel-edit').addEventListener('click', cancelEditor);
  $('close-editor').addEventListener('click', cancelEditor);
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancelEditor(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) cancelEditor(); });
  $('retry-load').addEventListener('click', () => { load(); if (!blocked) message('收藏已重新读取'); });
  for (const id of ['search', 'filter-tag', 'filter-status', 'filter-starred']) $(id)?.addEventListener(id === 'search' ? 'input' : 'change', render);
  $('clear-filters').addEventListener('click', () => { $('search').value = ''; $('filter-tag').value = ''; $('filter-status').value = ''; if ($('filter-starred')) $('filter-starred').checked = false; render(); });
  $('load-samples').addEventListener('click', () => {
    try {
    let candidate = resources;
    for (const [i, title, tags, status] of [[1, 'JavaScript入门', ['前端'], 'todo'], [2, 'CSV解析', ['前端', '工具'], 'done'], [3, 'Python练习', ['后端'], 'doing']]) {
      const url = `https://example.org/r${i}`;
      if (!candidate.some(item => item.url === url)) candidate = upsert(candidate, { id: makeId(), title, tags, status, url }, version);
    }
    if (candidate === resources) { message('三条示例已经存在，没有重复添加'); return; }
    if (commit(candidate)) message('示例已加载，可清空筛选查看全部');
    } catch (error) { message(error.message, true); }
  });
  function showPreview() {
    const preview = previewCsv(parsed, resources, version);
    $('import-preview').hidden = false;
    $('preview-summary').textContent = `新增 ${preview.added.length} / 重复 ${preview.duplicates.length} / 错误 ${preview.errors.length}。确认前不会保存。`;
    const details = [...preview.added.map(item => `可新增：${item.title}`), ...preview.duplicates.map(item => `记录 ${item.number}：${item.reason}`), ...preview.errors.map(item => `记录 ${item.number}：${item.reason}`)];
    if (preview.extraColumns.length) details.push(`已忽略额外列：${preview.extraColumns.join('、')}`);
    $('preview-details').replaceChildren(...details.map(text => node('li', text)));
  }
  $('csv-file')?.addEventListener('change', async event => {
    const request = ++fileRequest;
    const file = event.target.files?.[0]; parsed = null; $('import-preview').hidden = true;
    if (!file) return;
    try {
      const text = await file.text();
      if (request !== fileRequest) return;
      parsed = parseCsv(text); showPreview(); $('preview-heading').focus();
    } catch (error) { if (request === fileRequest) message(`导入失败：${error.message}。原收藏未改变。`, true); }
    finally { if (request === fileRequest) event.target.value = ''; }
  });
  $('cancel-import')?.addEventListener('click', () => { ++fileRequest; parsed = null; $('import-preview').hidden = true; message('已取消导入，收藏未改变'); });
  $('confirm-import')?.addEventListener('click', () => {
    if (!parsed) return;
    const candidate = confirmCsv(parsed, resources, makeId, version);
    if (!candidate.added.length) { showPreview(); message('没有可新增的记录：请查看重复或错误原因'); return; }
    if (commit(candidate.resources)) { parsed = null; $('import-preview').hidden = true; message(`已导入 ${candidate.added.length} 条资源`); }
    else showPreview();
  });
  $('export-csv')?.addEventListener('click', () => {
    if (blocked) { message('数据尚未恢复，无法导出收藏；请先备份原始存储并重试读取', true); return; }
    download(exportCsv(resources, version)); message('已导出全部收藏，包含当前被筛选隐藏的资源');
  });
  load();
  return { getResources: () => structuredClone(resources) };
}
function defaultDownload(csv) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'learning-resources.csv'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
if (typeof document !== 'undefined') {
  const root = document.getElementById('resource-app');
  if (root) mountResources(root);
}
