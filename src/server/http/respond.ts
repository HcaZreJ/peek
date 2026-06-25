import type { ServerResponse } from 'node:http';

/**
 * 写 JSON 响应：设 `Content-Type: application/json; charset=utf-8`、状态码，
 * 写 `JSON.stringify(body)` 并 end。body 不可序列化 → 退化为 500 + `{error}`。
 */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  let s: string;
  try {
    s = JSON.stringify(body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'serialization failed' }));
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(s);
}
