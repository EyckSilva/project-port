import { useEffect, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { toHtml } from "./content";
import { readDocument } from "./documents";
export function RichPreview({
  value,
  format = "TEXT",
}: {
  value: string;
  format?: "TEXT" | "HTML" | undefined;
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    const doc = new DOMParser().parseFromString(toHtml(value, format), "text/html");
    doc.querySelectorAll<HTMLElement>("span[data-latex]").forEach((el) => {
      const latex = el.getAttribute("data-latex") || "";
      try {
        el.innerHTML = katex.renderToString(latex.slice(0, 2000), {
          throwOnError: false,
          trust: false,
          strict: "ignore",
          maxExpand: 200,
          maxSize: 20,
        });
      } catch {
        el.textContent = latex;
      }
    });
    void Promise.all(
      [...doc.querySelectorAll("img")].map(async (img) => {
        const src = img.getAttribute("src") || "";
        if (src.startsWith("local-media:")) {
          try {
            const blob = await readDocument(src.slice(12));
            if (blob) {
              const url = URL.createObjectURL(blob);
              urls.push(url);
              img.src = url;
            } else img.remove();
          } catch {
            img.remove();
          }
        }
      }),
    ).then(() => {
      if (active) setHtml(doc.body.innerHTML);
      else urls.forEach(URL.revokeObjectURL);
    });
    return () => {
      active = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [value, format]);
  return <div className="rich-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}
