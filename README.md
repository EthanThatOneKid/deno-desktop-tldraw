# deno-desktop-tldraw

A minimal template for running the offline [tldraw SDK](https://tldraw.dev/) in
a [`deno desktop`](https://docs.deno.com/runtime/desktop/) application.

The app is a Vite React project that Deno Desktop can auto-detect. The canvas
uses tldraw's `persistenceKey`, so drawings are saved locally in IndexedDB and
survive app reloads without a server.

## Requirements

- Deno 2.9 or newer

## Quick Start

```sh
deno task desktop:dev
```

This starts Deno Desktop in HMR mode. Deno detects the Vite project, starts the
Vite dev server, and opens the desktop webview.

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

- `package.json` and `vite.config.ts` make this a Vite app, which
  `deno desktop .` auto-detects.
- `src/App.tsx` renders `<Tldraw persistenceKey="deno-desktop-tldraw" />`.
- tldraw stores the drawing locally in IndexedDB, including assets supported by
  its local persistence mode.
- `deno.json` contains the Deno Desktop metadata and build output paths.
- The template uses Deno Desktop's `cef` backend for consistent Chromium
  behavior. The default Windows WebView backend can crash on some WebView2
  installations with this tldraw canvas.

## Customize

- Change the app name and bundle identifier in `deno.json`.
- Replace the banner in `src/App.tsx` with your own UI.
- Add tldraw custom shapes, tools, menus, or asset storage using the SDK docs.

The default tldraw SDK watermark is intentionally preserved. See tldraw's
license terms if you need to remove it.
