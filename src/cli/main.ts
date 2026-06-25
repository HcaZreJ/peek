import { homedir } from 'node:os';
import { parseArgs } from './parseArgs';
import { resolveTarget } from './resolveTarget';
import { buildViewerUrl } from './buildViewerUrl';
import { ensureServer } from './serverControl';
import { openWindow } from './openWindow';

async function main(): Promise<void> {
  const { target } = parseArgs(process.argv.slice(2));
  let abs: string;
  try {
    abs = await resolveTarget(target, process.cwd(), homedir());
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      console.error(`[peek] 路径不存在：${target}`);
      process.exit(1);
    }
    throw err;
  }
  const port = await ensureServer();
  const url = buildViewerUrl(port, abs);
  openWindow(url);
  console.log(`peek → ${url}`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(`[peek] ${(err as Error)?.message ?? err}`);
  process.exit(1);
});
