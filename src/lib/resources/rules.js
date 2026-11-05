export const STATUS = { todo: '待看', doing: '在看', done: '已看' };
export const VERSION = 2;
export function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('请填写链接');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('链接必须是完整的 HTTP 或 HTTPS 地址'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只允许 HTTP 或 HTTPS 链接');
  return url.href;
}
export function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : String(value ?? '').split(';');
  if (tags.some(tag => typeof tag !== 'string' || tag.includes(';'))) throw new Error('单个标签不能包含英文分号');
  return [...new Set(tags.map(tag => tag.trim()).filter(Boolean))];
}
export function normalizeResource(input, version = VERSION) {
  if (!input || typeof input !== 'object') throw new Error('资源格式错误');
  if (typeof input.id !== 'string' || !input.id.trim()) throw new Error('资源编号无效');
  if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('请填写标题');
  const status = input.status === undefined || input.status === '' ? 'todo' : input.status;
  if (!Object.hasOwn(STATUS, status)) throw new Error('学习状态无效');
  const resource = { id: input.id, title: input.title.trim(), url: normalizeUrl(input.url), tags: normalizeTags(input.tags), status };
  if (version === 2) {
    if (input.starred !== undefined && typeof input.starred !== 'boolean') throw new Error('星标必须为布尔值');
    resource.starred = input.starred ?? false;
  }
  return resource;
}
export function validateCollection(resources, version = VERSION) {
  if (!Array.isArray(resources)) throw new Error('资源集合必须是数组');
  const ids = new Set(), urls = new Set();
  return resources.map(input => {
    // Stored data is strict: missing or malformed fields must not be silently repaired.
    if (!input || typeof input !== 'object' || !Array.isArray(input.tags) || !Object.hasOwn(STATUS, input.status)) throw new Error('存储字段不合法');
    if (version === 2 && typeof input.starred !== 'boolean') throw new Error('存储星标字段不合法');
    const resource = normalizeResource(input, version);
    if (ids.has(resource.id) || urls.has(resource.url)) throw new Error('存储中存在重复编号或链接');
    ids.add(resource.id); urls.add(resource.url);
    return resource;
  });
}
export function upsert(resources, input, version = VERSION) {
  const resource = normalizeResource(input, version);
  if (resources.some(item => item.id !== resource.id && item.url === resource.url)) throw new Error('这个链接已经收藏过了');
  const index = resources.findIndex(item => item.id === resource.id);
  return index < 0 ? [...resources, resource] : resources.map((item, i) => i === index ? resource : item);
}
export function filterResources(resources, { query = '', tag = '', status = '', starred = false } = {}) {
  const needle = query.trim().toLowerCase();
  return resources.filter(item => (!needle || [item.title, item.url, ...item.tags].some(value => value.toLowerCase().includes(needle)))
    && (!tag || item.tags.includes(tag)) && (!status || item.status === status) && (!starred || item.starred === true));
}
export function migrate(envelope) {
  if (!envelope || ![1, 2].includes(envelope.version)) throw new Error('存储版本未知，已保留原始数据');
  const resources = validateCollection(envelope.resources, envelope.version);
  return { version: VERSION, resources: resources.map(item => ({ ...item, tags: [...item.tags], starred: envelope.version === 1 ? false : item.starred })) };
}
