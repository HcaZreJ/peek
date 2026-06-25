/**
 * 构造前端窗口 URL：`http://127.0.0.1:<port>/?path=<encodeURIComponent(absPath)>`。
 * 正确编码空格 / 中文 / 特殊字符。
 *
 * @throws Error 当 port 非正整数
 */
export function buildViewerUrl(port: number, absPath: string): string {
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${port}`);
  }
  return `http://127.0.0.1:${port}/?path=${encodeURIComponent(absPath)}`;
}
