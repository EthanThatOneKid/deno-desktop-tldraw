import { serveDir } from "@std/http/file-server";

type DesktopMenuItem =
  | {
    item: {
      label: string;
      id?: string;
      accelerator?: string;
      enabled: boolean;
    };
  }
  | { submenu: { label: string; items: DesktopMenuItem[] } }
  | "separator"
  | { role: { role: string } };

interface DesktopWindow {
  setApplicationMenu(menu: DesktopMenuItem[]): void;
  executeJs(script: string): Promise<unknown>;
  addEventListener(
    type: "menuclick",
    listener: (event: CustomEvent<{ id?: string }>) => void,
  ): void;
}

const DesktopDeno = Deno as typeof Deno & {
  BrowserWindow: new (options: {
    title?: string;
    width?: number;
    height?: number;
  }) => DesktopWindow;
};

const repoUrl = "https://github.com/EthanThatOneKid/deno-desktop-tldraw";
const fsRoot = `${import.meta.dirname}/dist`;

const win = new DesktopDeno.BrowserWindow({
  title: "Deno Desktop tldraw",
  width: 1200,
  height: 800,
});

win.setApplicationMenu([
  {
    submenu: {
      label: "File",
      items: [
        {
          item: {
            label: "New",
            id: "file-new",
            accelerator: "CmdOrCtrl+N",
            enabled: true,
          },
        },
        {
          item: {
            label: "Open...",
            id: "file-open",
            accelerator: "CmdOrCtrl+O",
            enabled: true,
          },
        },
        "separator",
        {
          item: {
            label: "Save",
            id: "file-save",
            accelerator: "CmdOrCtrl+S",
            enabled: true,
          },
        },
        {
          item: {
            label: "Save As...",
            id: "file-save-as",
            accelerator: "CmdOrCtrl+Shift+S",
            enabled: true,
          },
        },
        "separator",
        { role: { role: "quit" } },
      ],
    },
  },
  {
    submenu: {
      label: "Edit",
      items: [
        {
          item: {
            label: "Undo",
            id: "edit-undo",
            accelerator: "CmdOrCtrl+Z",
            enabled: true,
          },
        },
        {
          item: {
            label: "Redo",
            id: "edit-redo",
            accelerator: "CmdOrCtrl+Shift+Z",
            enabled: true,
          },
        },
        "separator",
        {
          item: {
            label: "Cut",
            id: "edit-cut",
            accelerator: "CmdOrCtrl+X",
            enabled: true,
          },
        },
        {
          item: {
            label: "Copy",
            id: "edit-copy",
            accelerator: "CmdOrCtrl+C",
            enabled: true,
          },
        },
        {
          item: {
            label: "Paste",
            id: "edit-paste",
            accelerator: "CmdOrCtrl+V",
            enabled: true,
          },
        },
        {
          item: {
            label: "Select All",
            id: "edit-select-all",
            accelerator: "CmdOrCtrl+A",
            enabled: true,
          },
        },
      ],
    },
  },
  {
    submenu: {
      label: "Help",
      items: [
        {
          item: {
            label: "About",
            id: "about",
            enabled: true,
          },
        },
      ],
    },
  },
]);

win.addEventListener("menuclick", (event) => {
  const id = event.detail.id;
  if (id === "about") {
    openExternal(repoUrl).catch((error) => console.error(error));
    return;
  }

  const script = menuScripts[id ?? ""];
  if (script) {
    win.executeJs(script).catch((error: unknown) => console.error(error));
  }
});

const menuScripts: Record<string, string> = {
  "file-new": "window.tldrawDesktop?.newDocument()",
  "file-open": "window.tldrawDesktop?.openDocument()",
  "file-save": "window.tldrawDesktop?.saveDocument()",
  "file-save-as": "window.tldrawDesktop?.saveDocumentAs()",
  "edit-undo": "window.tldrawDesktop?.runAction('undo')",
  "edit-redo": "window.tldrawDesktop?.runAction('redo')",
  "edit-cut": "window.tldrawDesktop?.runAction('cut')",
  "edit-copy": "window.tldrawDesktop?.runAction('copy')",
  "edit-paste": "window.tldrawDesktop?.runAction('paste')",
  "edit-select-all": "window.tldrawDesktop?.runAction('select-all')",
};

Deno.serve(async (req) => {
  const res = await serveDir(req, { fsRoot, quiet: true });

  if (
    res.status === 404 &&
    req.method === "GET" &&
    (req.headers.get("accept") ?? "").includes("text/html")
  ) {
    const index = new Request(new URL("/index.html", req.url), {
      headers: req.headers,
    });
    return await serveDir(index, { fsRoot, quiet: true });
  }

  return res;
});

async function openExternal(url: string) {
  const command = Deno.build.os === "windows"
    ? new Deno.Command("cmd", { args: ["/c", "start", "", url] })
    : Deno.build.os === "darwin"
    ? new Deno.Command("open", { args: [url] })
    : new Deno.Command("xdg-open", { args: [url] });

  const child = command.spawn();
  const status = await child.status;
  if (!status.success) {
    throw new Error(`Failed to open ${url}`);
  }
}
