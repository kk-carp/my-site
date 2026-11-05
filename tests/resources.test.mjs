import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeUrl, normalizeTags, upsert, filterResources, migrate, validateCollection } from '../src/lib/resources/rules.js';
import { createStorage, STORAGE_KEY } from '../src/lib/resources/storage.js';
import { parseCsv, previewCsv, confirmCsv, exportCsv } from '../src/lib/resources/csv.js';
import { faultAdapter } from '../teaching/faults.mjs';

const samples = [
  { id: 'r1', title: 'JavaScript入门', url: 'https://example.org/r1', tags: ['前端'], status: 'todo', starred: false },
  { id: 'r2', title: 'CSV解析', url: 'https://example.org/r2', tags: ['前端', '工具'], status: 'done', starred: true },
  { id: 'r3', title: 'Python练习', url: 'https://example.org/r3', tags: ['后端'], status: 'doing', starred: false },
];
const fixture = name => readFileSync(new URL(`../teaching/fixtures/${name}`, import.meta.url), 'utf8');
function adapter(raw = null) {
  return { raw, writes: 0, failRead: false, failWrite: false,
    getItem(key) { assert.equal(key, STORAGE_KEY); if (this.failRead) throw new Error('read denied'); return this.raw; },
    setItem(key, value) { assert.equal(key, STORAGE_KEY); if (this.failWrite) throw new Error('quota'); this.writes++; this.raw = value; } };
}
test('A01: 新增编辑状态与顺序，保持 id，拒绝其他记录的 URL', () => {
  const original = structuredClone(samples);
  const edited = upsert(samples, { ...samples[0], title: ' 新标题 ', status: 'doing' });
  assert.equal(edited.length, 3); assert.equal(edited[0].id, 'r1'); assert.equal(edited[0].title, '新标题');
  assert.equal(edited[0].status, 'doing'); assert.deepEqual(samples, original);
  assert.throws(() => upsert(samples, { ...samples[0], url: samples[1].url }), /收藏/);
  assert.throws(() => upsert(samples, { ...samples[0], title: ' ' }), /标题/);
  assert.throws(() => upsert(samples, { ...samples[0], url: ' ' }), /链接/);
  assert.equal(upsert(samples, { ...samples[0], id: 'r4', url: 'https://example.org/r4' })[3].id, 'r4');
});
test('A02: 固定样例搜索与标签状态交集', () => {
  const ids = filters => filterResources(samples, filters).map(item => item.id);
  assert.deepEqual(ids({ query: ' javascript ' }), ['r1']);
  assert.deepEqual(ids({ query: 'CSV', tag: '前端', status: 'done' }), ['r2']);
  assert.deepEqual(ids({ query: 'CSV', tag: '前端', status: 'todo' }), []);
  assert.deepEqual(ids({ tag: '前端' }), ['r1', 'r2']);
  assert.deepEqual(ids({ query: 'EXAMPLE.ORG/R3' }), ['r3']);
});
test('A03: URL 规范化、协议、查询片段与标签边界', () => {
  assert.equal(normalizeUrl(' https://EXAMPLE.org '), 'https://example.org/');
  assert.throws(() => upsert([{ ...samples[0], url: 'https://example.org/' }], { ...samples[1], url: 'https://example.org' }), /收藏/);
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '/relative', 'bad']) assert.throws(() => normalizeUrl(url));
  assert.notEqual(normalizeUrl('http://example.org'), normalizeUrl('https://example.org'));
  assert.notEqual(normalizeUrl('https://example.org/a'), normalizeUrl('https://example.org/b'));
  assert.equal(normalizeUrl('https://example.org/?a=1#x'), 'https://example.org/?a=1#x');
  assert.deepEqual(normalizeTags(' A;A; a;; '), ['A', 'a']);
  assert.throws(() => normalizeTags(['a;b']));
});
test('A04: 首次、保存恢复、损坏模型、未知版本和读写失败', () => {
  const memory = adapter(), storage = createStorage(() => memory);
  assert.deepEqual(storage.load(), { version: 2, resources: [] }); assert.equal(memory.writes, 0);
  storage.save(samples); assert.deepEqual(storage.load().resources, samples);
  const before = memory.raw;
  memory.failWrite = true; assert.throws(() => storage.save([])); assert.equal(memory.raw, before);
  memory.failRead = true; assert.throws(() => storage.load()); memory.failRead = false;
  for (const raw of ['{', 'null', JSON.stringify({ version: 99, resources: [] }), JSON.stringify({ version: 2, resources: [{ ...samples[0], tags: null }] }), JSON.stringify({ version: 2, resources: [{ ...samples[0], starred: undefined }] })]) {
    const bad = adapter(raw); assert.throws(() => createStorage(() => bad).load()); assert.equal(bad.raw, raw); assert.equal(bad.writes, 0);
  }
  assert.throws(() => validateCollection([samples[0], samples[0]]));
});
test('A05: 1 新 1 重 1 错，预览不写，确认重算及重复导入', () => {
  const parsed = parseCsv(fixture('mixed.csv'));
  const result = previewCsv(parsed, samples);
  assert.deepEqual([result.added.length, result.duplicates.length, result.errors.length], [1, 1, 1]);
  assert.equal(result.errors[0].number, 3); assert.equal(samples.length, 3);
  const confirmed = confirmCsv(parsed, samples, () => 'r4'); assert.equal(confirmed.resources.length, 4);
  assert.equal(confirmCsv(parsed, confirmed.resources, () => 'r5').added.length, 0);
  assert.equal(previewCsv(parseCsv('title,url\na,https://example.org/new\nb,https://example.org/new'), []).duplicates.length, 1);
  assert.equal(previewCsv(parseCsv('title,url\n,https://example.org/new\nb,https://example.org/new'), []).added.length, 1);
});
test('A05: 结构错误整批拒绝；额外列、空行与坏字段', () => {
  for (const csv of ['title,tags\nx,y', 'title,url,url\na,b,c', 'title,url\n"unclosed,x', 'title,url\na,b,c']) assert.throws(() => parseCsv(csv));
  const parsed = parseCsv('\uFEFFtitle,url,other\na,https://example.org,new\n,,\n');
  assert.deepEqual(parsed.extraColumns, ['other']); assert.equal(parsed.rows.length, 1);
  assert.equal(previewCsv(parseCsv('title,url,status\na,https://example.org,invalid'), []).errors.length, 1);
  assert.equal(previewCsv(parseCsv('title,url,status\na,https://example.org, '), []).added[0].status, 'todo');
});
test('A06: 全量导出，中文逗号引号换行往返，空表头与公式保护', () => {
  const resources = [{ ...samples[0], title: '中文,"引号"\n第二行', tags: ['中文', '工具'] }, samples[1]];
  const restored = confirmCsv(parseCsv(exportCsv(resources)), [], () => 'new-id').resources;
  assert.deepEqual(restored.map(({ id, ...item }) => item), resources.map(({ id, ...item }) => item));
  assert.equal(previewCsv(parseCsv(exportCsv(resources)), resources).added.length, 0);
  assert.equal(exportCsv([]), 'title,url,tags,status,starred\r\n');
  for (const char of ['=', '+', '-', '@', '\t', '\r']) {
    const result = parseCsv(exportCsv([{ ...samples[0], title: char + 'formula' }])).rows[0].values.title;
    assert.equal(result, "'" + char + 'formula');
  }
});
test('CR-01: v1 迁移纯函数、保留字段/顺序；保存失败保留 v1', () => {
  const v1 = { version: 1, resources: samples.map(({ starred, ...item }) => item) }, before = structuredClone(v1);
  const next = migrate(v1); assert.deepEqual(v1, before);
  assert.deepEqual(next.resources.map(({ starred, ...item }) => item), v1.resources);
  assert.ok(next.resources.every(item => item.starred === false));
  const memory = adapter(JSON.stringify(v1)), storage = createStorage(() => memory);
  memory.failWrite = true; assert.throws(() => storage.load()); assert.equal(memory.raw, JSON.stringify(v1));
  memory.failWrite = false; assert.equal(storage.load().version, 2); assert.equal(JSON.parse(memory.raw).version, 2);
  assert.deepEqual(filterResources(samples, { starred: true, tag: '前端', status: 'done' }).map(item => item.id), ['r2']);
  assert.equal(filterResources(samples, { starred: true, status: 'todo' }).length, 0);
});
test('CR-01: 新旧 CSV 兼容、非法星标、重复不覆盖星标', () => {
  for (const value of ['', 'false', 'FALSE', 'true', 'TRUE']) {
    const result = previewCsv(parseCsv(`title,url,starred\na,https://example.org,${value}`), []);
    assert.equal(result.added[0].starred, value.toLowerCase() === 'true');
  }
  assert.equal(previewCsv(parseCsv('title,url\na,https://example.org'), []).added[0].starred, false);
  assert.equal(previewCsv(parseCsv('title,url,starred\na,https://example.org,yes'), []).errors.length, 1);
  assert.deepEqual(confirmCsv(parseCsv('title,url,starred\na,https://example.org/r2,false'), samples, () => 'x').resources, samples);
});
test('第5章: v1 存储和四列 CSV 可独立运行', () => {
  const v1 = samples.map(({ starred, ...item }) => item), memory = adapter(), storage = createStorage(() => memory, 1);
  storage.save(v1); assert.equal(storage.load().version, 1);
  assert.equal(Object.hasOwn(storage.load().resources[0], 'starred'), false);
  assert.equal(exportCsv(v1, 1).split('\r\n')[0], 'title,url,tags,status');
  assert.equal(Object.hasOwn(previewCsv(parseCsv(fixture('mixed.csv')), v1, 1).added[0], 'starred'), false);
});
test('Harness: 教学故障可复现并可恢复，不访问浏览器资料', () => {
  const memory = faultAdapter({ raw: null, writeFailure: true }), store = createStorage(() => memory);
  assert.throws(() => store.save(samples), /F02/); assert.equal(memory.raw, null);
  memory.writeFailure = false; store.save(samples); assert.deepEqual(store.load().resources, samples);
  memory.readFailure = true; assert.throws(() => store.load(), /F01/);
  memory.readFailure = false; assert.equal(store.load().resources.length, 3);
});
