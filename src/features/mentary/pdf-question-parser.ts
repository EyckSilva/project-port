import type { Question } from "./data";
import { blankQuestion } from "./question-draft";
export type PdfPageText = { text: string; page: number };
export type PdfTextFragment = {
  str: string;
  transform: number[];
  width?: number;
  hasEOL?: boolean;
};
export const MAX_OPTIONS = 5;
const questionStarts = () =>
  /\bQuest[ãa]o[ \t]*(\d{1,3})[ \t]*[.)\-–—:][ \t]*|(?:^|\n)[ \t]*Quest[ãa]o[ \t]*(\d{1,3})[ \t]*(?:[.)\-–—:][ \t]*|\n|[ \t]+)|(?:^|\n)[ \t]*(\d{1,3})[ \t]*[.)\-–—:][ \t]+/gi;
const answerHeading =
  /^[ \t]*Gabarito(?:[ \t]+(?:oficial|comentado|das quest[õo]es))?[ \t]*(?:[:–—-]|$)/im;
const isPageNumber = (line: string) =>
  /^\s*(?:p[áa]gina|p[áa]g\.?)\s*\d+(?:\s*(?:de|\/)\s*\d+)?\s*$/i.test(line) ||
  /^\s*\d+\s*\/\s*\d+\s*$/.test(line);
const compact = (text: string) => text.replace(/\s+/g, " ").trim();
export function questionDocumentHeader(text: string): string {
  const first = questionStarts().exec(text);
  return first ? text.slice(0, first.index) : "";
}

// PDF text is not guaranteed to be emitted in visual order. Rebuild lines from coordinates.
export function pdfTextToLines(items: PdfTextFragment[]): string {
  const sorted = items
    .filter((i) => i.str.trim())
    .sort(
      (a, b) =>
        (b.transform[5] || 0) - (a.transform[5] || 0) ||
        (a.transform[4] || 0) - (b.transform[4] || 0),
    );
  const lines: { y: number; items: PdfTextFragment[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5] || 0;
    const line = lines.at(-1);
    if (line && Math.abs(line.y - y) <= 3) line.items.push(item);
    else lines.push({ y, items: [item] });
  }
  return lines
    .map((line) =>
      line.items
        .sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0))
        .map((i) => i.str.trim())
        .join(" "),
    )
    .join("\n");
}

export function parseQuestionPages(
  pages: PdfPageText[],
  source: string,
): { questions: Question[]; warnings: string[] } {
  const marginCounts = new Map<string, Set<number>>();
  const pageLines = pages.map((p) => p.text.replace(/\r\n?/g, "\n").split("\n"));
  pageLines.forEach((lines, index) => {
    const meaningful = lines.map((s) => s.trim()).filter(Boolean);
    const positions = [...new Set([0, 1, 2, meaningful.length - 2, meaningful.length - 1])];
    for (const position of positions) {
      const line = meaningful[position];
      if (!line) continue;
      if (
        line.length < 8 ||
        /[?]/.test(line) ||
        /^(?:Gabarito|Quest[ãa]o\s*\d|\d+\s*[.)–—-]|[A-Ja-j]\s*[.)])/i.test(line) ||
        /^(?:\([A-J]\)|[A-J][.)])\s*$/i.test(meaningful[position - 1] || "")
      )
        continue;
      const seen = marginCounts.get(line) || new Set<number>();
      seen.add(index);
      marginCounts.set(line, seen);
    }
  });
  const ranges: { start: number; end: number; page: number }[] = [];
  let text = "";
  pageLines.forEach((lines, index) => {
    const clean = lines
      .filter(
        (line) =>
          !isPageNumber(line) &&
          !/^\s*(?:Bloco\s*\d+\s*de\s*\d+\b|©|Copyright|Todos os direitos reservados)/i.test(
            line,
          ) &&
          !(marginCounts.get(line.trim())?.size && marginCounts.get(line.trim())!.size > 1),
      )
      .join("\n");
    const start = text.length;
    text += clean + "\n";
    ranges.push({ start, end: text.length, page: pages[index]!.page });
  });
  const heading = answerHeading.exec(text);
  if (heading) text = text.slice(0, heading.index);
  const starts = [...text.matchAll(questionStarts())];
  const candidates = starts.length
    ? starts.map((m, i) => ({
        body: text.slice(m.index! + m[0].length, starts[i + 1]?.index ?? text.length),
        number: Number(m[1] || m[2] || m[3]),
        offset: m.index!,
      }))
    : text.trim()
      ? [{ body: text, number: undefined, offset: 0 }]
      : [];
  const questions: Question[] = [];
  const warnings: string[] = [];
  for (const candidate of candidates) {
    const page =
      ranges.find((r) => candidate.offset >= r.start && candidate.offset < r.end)?.page ||
      pages[0]?.page ||
      1;
    const label =
      candidate.number === undefined
        ? `Página ${page}`
        : `Questão ${candidate.number} (página ${page})`;
    // Options may be on separate lines or inline. Never renumber a second A–D sequence as E–H.
    const markers = [
      ...candidate.body.matchAll(
        /(?:^|[\s])(?:\(([A-Ja-j])\)|([A-Ja-j])[.)]|([A-Ja-j])[ \t]*[–—-])[ \t]*/g,
      ),
    ];
    if (markers.length < 2) {
      if (candidate.number !== undefined)
        warnings.push(`${label}: alternativas não identificadas com segurança.`);
      continue;
    }
    const letters = markers.map((m) => (m[1] || m[2] || m[3])!.toUpperCase());
    if (
      markers.length > MAX_OPTIONS ||
      letters.some((letter, i) => letter !== String.fromCharCode(65 + i))
    ) {
      warnings.push(
        `${label}: sequência de alternativas repetida ou ambígua. O bloco não foi importado para evitar juntar questões.`,
      );
      continue;
    }
    let stem = candidate.body.slice(0, markers[0]!.index).trim();
    if (
      candidate.number === undefined &&
      (/\bQuest[ãa]o\s*\d/i.test(stem) ||
        /(?:instru[çc][õo]es|quest[õo]es para alunos|material de exemplo|p[áa]gina\s*\d)/i.test(
          stem,
        ))
    ) {
      warnings.push(
        `${label}: cabeçalho ou numeração ambígua; não foi possível isolar o enunciado.`,
      );
      continue;
    }
    const discipline = stem.match(
      /^(Matemática|Língua Portuguesa|Português|Ciências|História|Geografia|Física|Química|Biologia)[ \t]*(?:[.:–—-]|\n)[ \t]*/i,
    );
    const subject = discipline?.[1];
    if (discipline) stem = stem.slice(discipline[0].length);
    const options = markers.map((m, i) =>
      compact(
        candidate.body.slice(
          m.index! + m[0].length,
          markers[i + 1]?.index ?? candidate.body.length,
        ),
      ),
    );
    // A new question inside an option means a boundary was missed: require review of the source.
    if (!compact(stem) || options.some((o) => !o || /\bQuest[ãa]o\s*\d/i.test(o))) {
      warnings.push(`${label}: enunciado ou alternativas incompletos; o bloco não foi importado.`);
      continue;
    }
    const q = blankQuestion(source, page);
    q.text = compact(stem);
    q.options = options;
    q.sourceNumber = candidate.number;
    q.subject = subject ? (/^Português$/i.test(subject) ? "Língua Portuguesa" : subject) : "";
    q.confidence =
      "Questão separada por numeração e sequência de alternativas; confira antes de aprovar.";
    questions.push(q);
  }
  return { questions, warnings };
}
export function parseQuestionText(text: string, source: string, page: number): Question[] {
  return parseQuestionPages([{ text, page }], source).questions;
}
