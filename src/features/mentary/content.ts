import DOMPurify from "dompurify";
import { saveDocument } from "./documents";
export const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export function safeImageUrl(value: string, local = true) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname && !url.username && !url.password) return true;
  } catch {
    /* Not an absolute web URL. */
  }
  return (
    local &&
    (/^local-media:[0-9a-f-]{36}$/i.test(value) ||
      /^data:image\/(png|jpeg|webp|avif);base64,[a-z0-9+/=]+$/i.test(value))
  );
}
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function cleanHtml(value: string) {
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      "p",
      "div",
      "span",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "sub",
      "sup",
      "ul",
      "ol",
      "li",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "blockquote",
      "figure",
      "figcaption",
    ],
    ALLOWED_ATTR: ["src", "alt", "title", "data-latex", "colspan", "rowspan"],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["data-latex"],
    ADD_URI_SAFE_ATTR: ["src"],
  });
  const doc = new DOMParser().parseFromString(clean, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    if (!safeImageUrl(img.getAttribute("src") || "")) img.remove();
  });
  return doc.body.innerHTML;
}
export function toHtml(value: string, format: "TEXT" | "HTML" = "TEXT") {
  return format === "HTML"
    ? cleanHtml(value)
    : `<p>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`;
}
export function hasContent(value: string, format: "TEXT" | "HTML" = "TEXT") {
  if (format === "TEXT") return Boolean(value.trim());
  const doc = new DOMParser().parseFromString(cleanHtml(value), "text/html");
  return Boolean(
    doc.body.textContent?.trim() ||
    doc.querySelector("img[src]") ||
    [...doc.querySelectorAll("span[data-latex]")].some((el) =>
      el.getAttribute("data-latex")?.trim(),
    ),
  );
}
export async function saveLocalImage(file: File): Promise<string> {
  if (!imageTypes.includes(file.type) || !/\.(jpe?g|png|webp|avif)$/i.test(file.name))
    throw Error("Escolha uma imagem JPG, PNG, WEBP ou AVIF.");
  if (file.size > 5 * 1024 * 1024) throw Error("A imagem deve ter até 5 MB.");
  // Decode in the browser as well: an extension/MIME declaration alone is not enough.
  try {
    const image = await createImageBitmap(file);
    image.close();
  } catch {
    throw Error(
      "Não foi possível decodificar a imagem. Confira se o arquivo é um JPG, PNG, WEBP ou AVIF válido.",
    );
  }
  const id = crypto.randomUUID();
  await saveDocument(id, file);
  return `local-media:${id}`;
}
