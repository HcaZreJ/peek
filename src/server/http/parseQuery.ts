export interface ParsedQuery {
  pathname: string;
  params: Record<string, string>;
}

/**
 * 解析请求 URL 的 pathname 与 query（用 `URL`，base 取 `http://127.0.0.1`）。
 * 多值参数取第一个；自动 decode。非法 URL → `{ pathname: '/', params: {} }`（容错）。
 */
export function parseQuery(reqUrl: string): ParsedQuery {
  try {
    const url = new URL(reqUrl, 'http://127.0.0.1');
    const params: Record<string, string> = {};
    for (const [k, v] of url.searchParams) {
      if (!(k in params)) params[k] = v;
    }
    return { pathname: url.pathname, params };
  } catch {
    return { pathname: '/', params: {} };
  }
}
