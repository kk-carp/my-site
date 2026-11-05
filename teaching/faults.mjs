// This is a reversible adapter exercise. It does not access browser storage.
export function faultAdapter({ raw = null, readFailure = false, writeFailure = false } = {}) {
  return { raw, readFailure, writeFailure,
    getItem() { if (this.readFailure) throw new Error('教学故障 F01：读取失败'); return this.raw; },
    setItem(_key, value) { if (this.writeFailure) throw new Error('教学故障 F02：写入失败'); this.raw = value; },
  };
}
