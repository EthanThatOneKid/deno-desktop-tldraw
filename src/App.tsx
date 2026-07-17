import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import "./styles.css";

export default function App() {
  return (
    <main className="app-shell">
      <section className="template-banner" aria-label="Template information">
        <div>
          <strong>Deno Desktop + tldraw</strong>
          <span>Offline canvas template</span>
        </div>
        <p>
          Drawings persist locally with tldraw&apos;s IndexedDB-backed
          <code>persistenceKey</code>.
        </p>
      </section>

      <section className="canvas-wrap" aria-label="tldraw canvas">
        <Tldraw persistenceKey="deno-desktop-tldraw" />
      </section>
    </main>
  );
}
