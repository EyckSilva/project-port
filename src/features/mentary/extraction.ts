import { documentContext, documentAnswerKey, applyCommon, emptyCommon } from "./batch-review";
import { parseQuestionPages, pdfTextToLines, questionDocumentHeader } from "./pdf-question-parser";
import type { Question } from "./data";
import { parseCsv } from "./rules";
import { normalizeQuestionRow } from "./structured-import";
export { blankQuestion } from "./question-draft";
export { parseQuestionText } from "./pdf-question-parser";

const demoQuestion = {
  title:
    "<p>Ana comprou 3 cadernos de R$ 12,00 cada e pagou com uma nota de R$ 50,00. Quanto ela recebeu de troco?</p>",
  question_type: "MULTIPLA ESCOLHA",
  answer_options_type: "TEXTO",
  answer_options: ["R$ 12,00", "R$ 14,00", "R$ 36,00", "R$ 38,00"],
  correct_answer_index: 1,
  answers_explanation: "3 × 12 = 36; 50 − 36 = 14.",
  subjects: "Matemática",
  metadata: {
    bncc: "EF05MA08",
    saebDescriptor: "D19",
    difficulty: "Fácil",
    assunto: "Problemas com as quatro operações",
    ano_escolar: "5º ano",
    tipo: "Múltipla escolha",
  },
} as const;

export function mockExtractedQuestion(source: string): Question[] {
  return [normalizeQuestionRow(demoQuestion, source, 1)];
}

export async function extractFile(
  file: File,
  progress: (value: number) => void,
  onWarnings: (warnings: string[]) => void = () => {},
): Promise<Question[]> {
  if (/\.json$/i.test(file.name)) {
    const value: unknown = JSON.parse(await file.text());
    if (!Array.isArray(value) || !value.length || value.length > 500)
      throw Error("JSON deve conter de 1 a 500 questões.");
    const { normalizeQuestionRow } = await import("./structured-import");
    return value.map((row, i) => normalizeQuestionRow(row, file.name, i + 1));
  }
  if (/\.csv$/i.test(file.name)) {
    const { rowsFromTable } = await import("./structured-import");
    return rowsFromTable(parseCsv(await file.text()), file.name);
  }
  if (/\.xlsx$/i.test(file.name)) {
    const { readXlsx } = await import("./structured-import");
    return readXlsx(file);
  }
  if (!/\.pdf$/i.test(file.name))
    throw Error(
      "Esta imagem precisa de OCR, que depende do backend. Use a revisão manual preservando o original.",
    );
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const timer = setTimeout(() => {
    void task.destroy();
  }, 60000);
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 30) throw Error("Use um PDF de até 30 páginas.");

    const texts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = pdfTextToLines(content.items.filter((item) => "str" in item));
      texts.push(text);
      progress(Math.round((i / pdf.numPages) * 100));
    }
    const parsed = parseQuestionPages(
      texts.map((text, i) => ({ text, page: i + 1 })),
      file.name,
    );
    const questions = parsed.questions;
    onWarnings(parsed.warnings);
    if (!questions.length)
      throw Error(
        parsed.warnings.length
          ? `Não foi possível separar as questões com segurança. ${parsed.warnings.join(" ")}`
          : "Nenhuma questão identificada com segurança. O PDF pode ser digitalizado ou ter um layout não reconhecido.",
      );
    const fullText = texts.join("\n");
    const header = questionDocumentHeader(texts[0] || "");
    const context = documentContext(header + " " + file.name);
    const answers = documentAnswerKey(fullText);
    return questions.map((q) => {
      const answer = q.sourceNumber === undefined ? undefined : answers.get(q.sourceNumber);
      const unique =
        q.sourceNumber !== undefined &&
        questions.filter((x) => x.sourceNumber === q.sourceNumber).length === 1;
      return {
        ...applyCommon(q, { ...emptyCommon, ...context }),
        ...(unique && answer !== undefined && answer < q.options.length
          ? { answer, answerSource: "documento" as const }
          : {}),
      };
    });
  } finally {
    clearTimeout(timer);
    await task.destroy();
  }
}
