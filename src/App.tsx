import { useEffect, useRef } from "react";
import { Tldraw, useActions, useEditor } from "tldraw";
import type { MutableRefObject } from "react";
import type { TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import "./styles.css";

declare global {
  var tldrawDesktop: DesktopBridgeApi | undefined;
}

interface DesktopBridgeApi {
  newDocument(): void;
  openDocument(): Promise<void> | void;
  saveDocument(): Promise<void> | void;
  saveDocumentAs(): Promise<void> | void;
  runAction(actionId: string): Promise<void> | void;
}

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type FileSystemFileHandleLike = {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
};

type SnapshotEditor = {
  loadSnapshot(snapshot: TLEditorSnapshot): void;
};

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
    multiple?: boolean;
  }) => Promise<FileSystemFileHandleLike[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
  }) => Promise<FileSystemFileHandleLike>;
};

const snapshotPickerTypes = [
  {
    description: "tldraw snapshot",
    accept: {
      "application/json": [".json", ".tldr", ".tldr.json"],
    },
  },
];

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
  const currentFileHandleRef = useRef<FileSystemFileHandleLike | null>(null);
  const currentFileNameRef = useRef("drawing.tldr.json");

  useEffect(() => {
    globalThis.tldrawDesktop = {
      newDocument() {
        globalThis.location.reload();
      },
      async openDocument() {
        const picker = window as FilePickerWindow;
        if (picker.showOpenFilePicker) {
          let handle: FileSystemFileHandleLike | undefined;
          try {
            [handle] = await picker.showOpenFilePicker({
              types: snapshotPickerTypes,
              excludeAcceptAllOption: false,
              multiple: false,
            });
          } catch (error) {
            if (isAbortError(error)) return;
            if (!isFilePickerBlockedError(error)) {
              showFileError("Could not open file.", error);
              return;
            }
          }

          if (handle) {
            try {
              await loadSnapshotFile(await handle.getFile(), editor);
              currentFileHandleRef.current = handle;
              currentFileNameRef.current = ensureSnapshotFileName(handle.name);
            } catch (error) {
              showFileError("Could not load drawing.", error);
            }
            return;
          }
        }

        fileInputRef.current?.click();
      },
      async saveDocument() {
        const snapshot = editor.getSnapshot();
        if (currentFileHandleRef.current) {
          try {
            await writeSnapshot(currentFileHandleRef.current, snapshot);
            return;
          } catch (error) {
            if (isAbortError(error)) return;
            if (!isFilePickerBlockedError(error)) {
              showFileError("Could not save drawing.", error);
              return;
            }
          }
        }

        await saveSnapshotAs(
          currentFileNameRef,
          currentFileHandleRef,
          snapshot,
        );
      },
      async saveDocumentAs() {
        await saveSnapshotAs(
          currentFileNameRef,
          currentFileHandleRef,
          editor.getSnapshot(),
        );
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

        await loadSnapshotFile(file, editor);
        currentFileHandleRef.current = null;
        currentFileNameRef.current = ensureSnapshotFileName(file.name);
      }}
    />
  );
}

async function loadSnapshotFile(
  file: File,
  editor: SnapshotEditor,
) {
  const snapshot = JSON.parse(await file.text()) as TLEditorSnapshot;
  editor.loadSnapshot(snapshot);
}

async function saveSnapshotAs(
  fileNameRef: MutableRefObject<string>,
  fileHandleRef: MutableRefObject<FileSystemFileHandleLike | null>,
  snapshot: TLEditorSnapshot,
) {
  const picker = window as FilePickerWindow;
  if (picker.showSaveFilePicker) {
    try {
      const handle = await picker.showSaveFilePicker({
        suggestedName: fileNameRef.current,
        types: snapshotPickerTypes,
        excludeAcceptAllOption: false,
      });
      await writeSnapshot(handle, snapshot);
      fileHandleRef.current = handle;
      fileNameRef.current = ensureSnapshotFileName(handle.name);
      return;
    } catch (error) {
      if (isAbortError(error)) return;
      if (!isFilePickerBlockedError(error)) {
        showFileError("Could not save drawing.", error);
        return;
      }
    }
  }

  const name = prompt("Save drawing as", fileNameRef.current);
  if (name) {
    fileNameRef.current = ensureSnapshotFileName(name);
    fileHandleRef.current = null;
    downloadSnapshot(fileNameRef.current, snapshot);
  }
}

async function writeSnapshot(
  handle: FileSystemFileHandleLike,
  snapshot: TLEditorSnapshot,
) {
  const stream = await handle.createWritable();
  await stream.write(JSON.stringify(snapshot, null, 2));
  await stream.close();
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
  return fileName.endsWith(".json") || fileName.endsWith(".tldr")
    ? fileName
    : `${fileName}.tldr.json`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isFilePickerBlockedError(error: unknown) {
  return error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "SecurityError");
}

function showFileError(message: string, error: unknown) {
  console.error(error);
  alert(message);
}
