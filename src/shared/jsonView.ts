export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/**
 * 安全解析 JSON 文本，永不抛错。
 * - 合法 → `{ ok: true, value }`
 * - 非法/空 → `{ ok: false, error }`（error 为简短摘要）
 */
export function parseJsonSafe(text: string): ParseResult {
  try {
    const value = JSON.parse(text);
    return { ok: true, value };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, error: error || 'Unknown error' };
  }
}

/**
 * 生成记录的单行紧凑摘要（JSONL 折叠态显示），超过 maxLen 截断并加 `…`。
 * - 对象 → `{k: v, …}`；数组 → 紧凑或 `[n items]`；基本类型 → 字符串化
 * - 循环引用 → `[unserializable]`
 * - 中文按字符（非字节）截断，不产生乱码
 */
export function summarizeRecord(value: unknown, maxLen = 120): string {
  let s: string;
  try {
    const result = JSON.stringify(value);
    if (result === undefined) {
      s = String(value);
    } else {
      s = result;
    }
  } catch {
    return '[unserializable]';
  }
  const chars = Array.from(s);
  if (chars.length <= maxLen) {
    return s;
  }
  return chars.slice(0, maxLen - 1).join('') + '…';
}

/**
 * 收集记录数组中所有顶层键的并集，保持首次出现顺序、去重。
 * 仅对象记录贡献键；非对象记录忽略。空数组 → `[]`。
 */
export function collectColumns(records: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of records) {
    if (typeof r === 'object' && r !== null && !Array.isArray(r)) {
      for (const key of Object.keys(r)) {
        if (!seen.has(key)) {
          seen.add(key);
          result.push(key);
        }
      }
    }
  }
  return result;
}
