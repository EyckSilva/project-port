import { useEffect, useRef, useState } from "react";
export function DocumentPreview({ url, page, zoom }: { url: string; page: number; zoom: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!container.current) return;
    const el = container.current;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let cleanup: () => void = () => {};
    setBusy(true);
    setError("");
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const task = pdfjs.getDocument({ url });
      cleanup = () => {
        void task.destroy();
      };
      const doc = await task.promise;
      if (cancelled) return;
      if (page > doc.numPages)
        throw Error(`O documento tem ${doc.numPages} páginas. Corrija a página de origem.`);
      const pdfPage = await doc.getPage(page);
      if (cancelled || !canvas.current) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = ((width || container.current?.clientWidth || 500) / base.width) * (zoom / 100);
      const viewport = pdfPage.getViewport({ scale });
      const render = pdfPage.render({ canvas: canvas.current, viewport });
      await render.promise;
    })()
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Não foi possível exibir a página.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [url, page, zoom, width]);
  return (
    <div ref={container} className="document-canvas" aria-busy={busy}>
      {busy && <p role="status">Carregando página original…</p>}
      {error && <p role="alert">{error}</p>}
      <canvas
        ref={canvas}
        aria-label={`Página ${page} do documento original`}
        hidden={Boolean(error)}
      />
    </div>
  );
}
