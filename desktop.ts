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
      items: [{ role: { role: "quit" } }],
    },
  },
  {
    submenu: {
      label: "Edit",
      items: [
        { role: { role: "undo" } },
        { role: { role: "redo" } },
        "separator",
        { role: { role: "cut" } },
        { role: { role: "copy" } },
        { role: { role: "paste" } },
        { role: { role: "selectAll" } },
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
  if (event.detail.id === "about") {
    openExternal(repoUrl).catch((error) => console.error(error));
  }
});

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
