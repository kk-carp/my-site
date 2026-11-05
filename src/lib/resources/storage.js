import { migrate, validateCollection, VERSION } from './rules.js';
export const STORAGE_KEY = 'koili-learning-resources';
// Inject an adapter in tests; accessing window.localStorage itself may throw.
export function createStorage(getAdapter, version = VERSION) {
  return {
    load() {
      const raw = getAdapter().getItem(STORAGE_KEY);
      if (raw === null) return { version, resources: [] };
      let envelope;
      try { envelope = JSON.parse(raw); } catch { throw new Error('收藏数据不是有效 JSON，已保留原始数据'); }
      if (version === 1) {
        if (envelope?.version !== 1) throw new Error('存储版本未知，已保留原始数据');
        return { version, resources: validateCollection(envelope.resources, version) };
      }
      const candidate = migrate(envelope);
      if (envelope.version === 1) this.save(candidate.resources);
      return candidate;
    },
    save(resources) {
      const candidate = { version, resources: validateCollection(resources, version) };
      getAdapter().setItem(STORAGE_KEY, JSON.stringify(candidate));
      return candidate;
    },
  };
}
