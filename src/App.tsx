import { useEffect, useRef } from "react";
import { Tldraw, useActions, useEditor } from "tldraw";
import type { TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import "./styles.css";

declare global {
  var tldrawDesktop: DesktopBridgeApi | undefined;
}

interface DesktopBridgeApi {
  newDocument(): void;
  openDocument(): void;
  saveDocument(): void;
  saveDocumentAs(): void;
  runAction(actionId: string): Promise<void> | void;
}

export default function App() {
  return (
    <main className="app-shell">
      <section className="canvas-wrap" aria-label="tldraw canvas">
        <Tldraw>
          <DesktopBridge />
        </Tldraw>
      </section>
    </main>
  );
}

function DesktopBridge() {
  const editor = useEditor();
  const actions = useActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileNameRef = useRef("drawing.tldr.json");

  useEffect(() => {
    globalThis.tldrawDesktop = {
      newDocument() {
        globalThis.location.reload();
      },
      openDocument() {
        fileInputRef.current?.click();
      },
      saveDocument() {
        downloadSnapshot(currentFileNameRef.current, editor.getSnapshot());
      },
      saveDocumentAs() {
        const name = prompt("Save drawing as", currentFileNameRef.current);
        if (name) {
          currentFileNameRef.current = ensureSnapshotFileName(name);
          downloadSnapshot(currentFileNameRef.current, editor.getSnapshot());
        }
      },
      runAction(actionId) {
        const action = actions[actionId];
        if (!action) {
          throw new Error(`Unknown tldraw action: ${actionId}`);
        }
        return action.onSelect("menu");
      },
    };

    return () => {
      globalThis.tldrawDesktop = undefined;
    };
  }, [actions, editor]);

  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".json,.tldr,.tldr.json,application/json"
      aria-hidden="true"
      className="desktop-file-input"
      onChange={async (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;

        const snapshot = JSON.parse(await file.text()) as TLEditorSnapshot;
        editor.loadSnapshot(snapshot);
        currentFileNameRef.current = ensureSnapshotFileName(file.name);
      }}
    />
  );
}

function downloadSnapshot(fileName: string, snapshot: TLEditorSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = ensureSnapshotFileName(fileName);
  anchor.click();
  URL.revokeObjectURL(url);
}

function ensureSnapshotFileName(fileName: string) {
  return fileName.endsWith(".json") ? fileName : `${fileName}.tldr.json`;
}
