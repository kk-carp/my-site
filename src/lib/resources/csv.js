import Papa from 'papaparse';
import { normalizeResource } from './rules.js';
export function parseCsv(text) {
  // Read raw arrays so duplicate headers cannot be silently renamed by the library.
  const result = Papa.parse(text.replace(/^\uFEFF/, ''), { header: false, delimiter: ',', skipEmptyLines: 'greedy' });
  if (result.errors.length) throw new Error('CSV 语法错误：' + result.errors.map(error => error.message).join('；'));
  const [headers, ...rows] = result.data;
  if (!headers || !headers.includes('title') || !headers.includes('url')) throw new Error('CSV 缺少 title 或 url 表头');
  if (new Set(headers).size !== headers.length) throw new Error('CSV 表头重复');
  if (rows.some(row => row.length !== headers.length)) throw new Error('CSV 结构错误：记录列数与表头不一致');
  return {
    extraColumns: headers.filter(key => !['title', 'url', 'tags', 'status', 'starred'].includes(key)),
    rows: rows.map((row, index) => ({ number: index + 1, values: Object.fromEntries(headers.map((key, i) => [key, row[i]])) })),
  };
}
export function previewCsv(parsed, resources, version = 2) {
  const seen = new Set(resources.map(item => item.url));
  const added = [], duplicates = [], errors = [];
  for (const { number, values } of parsed.rows) {
    try {
      const star = (values.starred ?? '').trim().toLowerCase();
      if (version === 2 && star && !['true', 'false'].includes(star)) throw new Error('starred 只能是 true 或 false');
      const resource = normalizeResource({ ...values, id: `preview-${number}`, status: values.status?.trim() || 'todo', starred: star === 'true' }, version);
      if (seen.has(resource.url)) duplicates.push({ number, reason: '链接重复，跳过' });
      else { seen.add(resource.url); added.push(resource); }
    } catch (error) { errors.push({ number, reason: error.message }); }
  }
  return { added, duplicates, errors, extraColumns: parsed.extraColumns };
}
export function confirmCsv(parsed, resources, makeId, version = 2) {
  const preview = previewCsv(parsed, resources, version);
  return { ...preview, resources: [...resources, ...preview.added.map(item => ({ ...item, id: makeId() }))] };
}
export function exportCsv(resources, version = 2) {
  const fields = ['title', 'url', 'tags', 'status', ...(version === 2 ? ['starred'] : [])];
  return Papa.unparse({ fields, data: resources.map(item => [item.title, item.url, item.tags.join(';'), item.status, ...(version === 2 ? [String(item.starred)] : [])]) }, { escapeFormulae: true, newline: '\r\n' });
}
