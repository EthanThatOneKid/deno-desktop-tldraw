# deno-desktop-tldraw

A minimal template for running the offline [tldraw SDK](https://tldraw.dev/) in
a [`deno desktop`](https://docs.deno.com/runtime/desktop/) application.

![Deno Desktop tldraw screenshot](docs/assets/deno-desktop-tldraw-screenshot.png)

The app is a Vite React project with a native Deno Desktop menu. Drawings can be
opened and saved as local `.tldr.json` snapshot files without a server.

## Requirements

- Deno 2.9 or newer

## Quick Start

```sh
deno task desktop:dev
```

This starts Deno Desktop in HMR mode. Deno detects the Vite project, starts the
desktop entry, and opens the desktop webview.

For a normal browser development server:

```sh
deno task dev
```

## Build

Build the web app:

```sh
deno task build
```

Build the desktop app:

```sh
deno task desktop:build
```

The desktop output is written to `dist-desktop/` according to the
platform-specific paths in `deno.json`. The desktop build task cleans generated
output first so old desktop bundles are not embedded into the next build.

## Verify

```sh
deno task check
deno task lint
deno task build
```

## How It Works

- `package.json` and `vite.config.ts` make this a Vite app, which Deno builds
  before packaging the desktop app.
- `desktop.ts` serves the built Vite output and configures the native app menu.
- `src/App.tsx` renders `<Tldraw>` and exposes a small desktop bridge for native
  menu commands.
- `File -> Open...` loads `.tldr.json` / `.json` tldraw snapshots from disk.
- `File -> Save` writes back to the current file when the browser-native File
  System Access API is available. Otherwise, it falls back to exporting a
  `.tldr.json` snapshot download.
- `File -> Save As...` opens a browser-native save picker when available, with
  the same snapshot download fallback for unsupported environments.
- `Edit` menu items call tldraw's built-in action API for undo, redo, cut, copy,
  paste, and select all.
- `deno.json` contains the Deno Desktop metadata and build output paths.
- The native `Help -> About` menu opens this template's GitHub repository.
- The template uses Deno Desktop's `cef` backend for consistent Chromium
  behavior. The default Windows WebView backend can crash on some WebView2
  installations with this tldraw canvas.

## Customize

- Change the app name and bundle identifier in `deno.json`.
- Replace the banner in `src/App.tsx` with your own UI.
- Add tldraw custom shapes, tools, menus, or asset storage using the SDK docs.

The default tldraw SDK watermark is intentionally preserved. See tldraw's
license terms if you need to remove it.
