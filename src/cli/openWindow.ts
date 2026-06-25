import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * 打开专属窗口。优先用 Chrome 的 `--app=` 开无浏览器边框的独立窗口；
 * 否则退化为系统默认浏览器打开（macOS `open`）。
 */
export function openWindow(url: string): void {
  const chromeApp = '/Applications/Google Chrome.app';
  if (existsSync(chromeApp)) {
    spawn('open', ['-na', 'Google Chrome', '--args', `--app=${url}`], {
      detached: true,
      stdio: 'ignore',
    }).unref();
  } else {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
}
