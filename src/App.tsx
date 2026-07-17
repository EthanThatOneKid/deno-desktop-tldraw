import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import "./styles.css";

export default function App() {
  return (
    <main className="app-shell">
      <section className="canvas-wrap" aria-label="tldraw canvas">
        <Tldraw persistenceKey="deno-desktop-tldraw" />
      </section>
    </main>
  );
}
