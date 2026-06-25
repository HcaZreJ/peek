# peek

> A lightweight, read-only file viewer you launch from the command line.

`peek` opens a clean browser window that renders the file or directory you point it at — syntax-highlighted code, rendered Markdown, an interactive JSON tree, and a JSONL record/table viewer — without the weight of a full IDE.

It's built for the CLI-native workflow: you live in the terminal pairing with an AI, but every now and then you need to *look* at a file with human eyes. `peek <path>` gives you a focused, good-looking view in about a second, then gets out of your way.

## Why

- **TUI viewers** (vim, etc.) are fiddly — non-obvious keybindings, `Ctrl+C` doesn't copy.
- **Full IDEs** are heavy and slow to cold-start when all you want is to read a file.
- **macOS QuickLook** is great but lives inside Finder and can't handle JSON/JSONL.

`peek` fills that gap: standalone, instant, pretty, and it actually renders JSON/JSONL.

## Features

- **Repo-aware** — auto-detects the repository root (`.git`, `package.json`, etc.) and pins the file tree there. Copy a path *relative to the repo root* in one click — exactly what you paste back to an AI.
- **Code** — syntax highlighting via [Shiki](https://shiki.style) using VS Code's **Dark Modern / Dark+** theme, so colors match your editor.
- **Markdown** — GitHub-flavored rendering (tables, task lists, highlighted code blocks), with a raw/rendered toggle.
- **JSON** — collapsible interactive tree with expand/collapse-all, plus a formatted-source view.
- **JSONL** — a **record-stream** view (each line foldable to a full tree) and a **table** view (columns auto-derived from the union of keys). Streamed and virtualized, so 100k-line logs scroll smoothly.
- **Copy** — filename, absolute path, repo-relative path, or full contents. Native `Cmd/Ctrl+C` works everywhere.
- **Instant** — the local server is reused across launches, so the second `peek` opens with no cold start.

## Requirements

- **Node.js ≥ 20**
- **macOS** (the chromeless window uses Chrome's `--app` mode via `open`; falls back to your default browser). Other platforms work via the server + browser but window-launching is mac-first for now.

## Install

```bash
git clone https://github.com/HcaZreJ/peek.git
cd peek
npm install
npm run build
npm link        # puts the `peek` command on your PATH
```

## Usage

```bash
peek .                       # open the current directory (tree pinned at repo root)
peek src/server/server.ts    # open a specific file, tree rooted at its repo
peek ~/some/external/dir     # open any directory on disk
peek /path/to/data.jsonl     # open a JSONL file in the record/table viewer
```

`peek` resolves the path, makes sure the local server is running (starting it if needed), and opens a dedicated browser window pointed at it.

## How it works

```
  peek (CLI)  ──►  local HTTP server (127.0.0.1 only)  ──►  web UI (browser)
  resolve path     filesystem API + static hosting          renders by file type
  open --app window
```

- The **CLI** parses the path, ensures the server is up (reusing a running one via a port lockfile), and opens a chromeless window.
- The **server** exposes a small read-only filesystem API (`/api/repo-root`, `/api/dir`, `/api/file`, `/api/jsonl`, …) and serves the built frontend. It binds to `127.0.0.1` only and never writes to your files.
- The **web UI** (React + Shiki) does all rendering. Swapping the shell for a native app later wouldn't touch it.

## Development

```bash
npm run dev          # vite dev server for the frontend (:5319)
npm run dev:server   # tsx watch the backend (:5318)
npm test             # vitest unit tests
npm run typecheck    # tsc (node + web)
npm run build        # build frontend + bundle CLI/server into dist/
```

The core logic (repo-root discovery, file-kind detection, path utilities, JSON/JSONL helpers, fs API) is covered by unit tests.

## Roadmap

- File tree that dynamically re-roots to the project repo as you navigate.
- Light / system-following theme.
- In-file search; Mermaid & math in Markdown; image preview.
- Optional packaging as a native app (Tauri) for a real dock icon.

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE) — free to use, modify, and share for **noncommercial** purposes (personal use, research, education, and noncommercial organizations). **Commercial / for-profit use is not permitted.**
