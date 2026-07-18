import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
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

declare global {
  interface Window {
    showOpenFilePicker(
      options?: { multiple?: boolean },
    ): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(
      options?: { suggestedName?: string },
    ): Promise<FileSystemFileHandle>;
  }
}

interface FileSystemFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
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
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null,
  );
  const [fileName, setFileName] = useState("drawing.tldr.json");

  const hasFSA = "showOpenFilePicker" in window;

  const newDocument = useCallback(() => {
    globalThis.location.reload();
  }, []);

  const openDocument = useCallback(async () => {
    if (hasFSA) {
      try {
        // deno-lint-ignore no-window
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
        });
        const file = await handle.getFile();
        const snapshot = JSON.parse(await file.text()) as TLEditorSnapshot;
        editor.loadSnapshot(snapshot);
        setFileHandle(handle);
        setFileName(ensureSnapshotFileName(file.name));
        return;
      } catch {
        return;
      }
    }
    fileInputRef.current?.click();
  }, [editor, hasFSA]);

  const saveDocument = useCallback(async () => {
    const snapshot = editor.getSnapshot();
    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(snapshot, null, 2));
        await writable.close();
        return;
      } catch {
        // fall through to save as
      }
    }
    if (hasFSA) {
      try {
        // deno-lint-ignore no-window
        const handle = await window.showSaveFilePicker({
          suggestedName: ensureSnapshotFileName(fileName),
        });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(snapshot, null, 2));
        await writable.close();
        setFileHandle(handle);
        setFileName(ensureSnapshotFileName(handle.name));
        return;
      } catch {
        // fall through to download
      }
    }
    downloadSnapshot(fileName, snapshot);
  }, [editor, fileHandle, fileName, hasFSA]);

  const saveDocumentAs = useCallback(async () => {
    const suggested = prompt("Save drawing as", fileName);
    if (!suggested) return;
    const name = ensureSnapshotFileName(suggested);
    const snapshot = editor.getSnapshot();
    if (hasFSA) {
      try {
        // deno-lint-ignore no-window
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
        });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(snapshot, null, 2));
        await writable.close();
        setFileHandle(handle);
        setFileName(ensureSnapshotFileName(handle.name));
        return;
      } catch {
        // fall through to download
      }
    }
    downloadSnapshot(name, snapshot);
  }, [editor, fileName, hasFSA]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "o") {
        e.preventDefault();
        openDocument();
      }
      if (mod && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        saveDocument();
      }
      if (mod && e.shiftKey && e.key === "s") {
        e.preventDefault();
        saveDocumentAs();
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [openDocument, saveDocument, saveDocumentAs]);

  useEffect(() => {
    globalThis.tldrawDesktop = {
      newDocument,
      openDocument: () => {
        openDocument();
      },
      saveDocument: () => {
        saveDocument();
      },
      saveDocumentAs: () => {
        saveDocumentAs();
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
  }, [actions, newDocument, openDocument, saveDocument, saveDocumentAs]);

  return (
    <>
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
          setFileName(ensureSnapshotFileName(file.name));
        }}
      />
      {createPortal(
        <div
          className="file-toolbar"
          role="toolbar"
          aria-label="File actions"
        >
          <span className="file-toolbar-label" title={fileName}>
            {fileName}
          </span>
          <button
            type="button"
            onClick={newDocument}
            title="New drawing"
            aria-label="New drawing"
          >
            New
          </button>
          <button
            type="button"
            onClick={openDocument}
            title="Open drawing… (Ctrl+O)"
            aria-label="Open drawing"
          >
            Open
          </button>
          <button
            type="button"
            onClick={saveDocument}
            title="Save (Ctrl+S)"
            aria-label="Save drawing"
          >
            Save
          </button>
          <button
            type="button"
            onClick={saveDocumentAs}
            title="Save As… (Ctrl+Shift+S)"
            aria-label="Save drawing as"
          >
            Save As
          </button>
        </div>,
        document.body,
      )}
    </>
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
