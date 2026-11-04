import type { Question } from "./data";
import { blankQuestion } from "./extraction";

export function normalizeQuestionRow(value: unknown, source: string, rowNumber: number): Question {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(`Linha ${rowNumber}: registro inválido.`);
  const row = value as Record<string, unknown>;
  let meta: Record<string, unknown> = {};
  if (row["metadata"] && typeof row["metadata"] === "object" && !Array.isArray(row["metadata"]))
    meta = row["metadata"] as Record<string, unknown>;
  else if (typeof row["metadata"] === "string" && row["metadata"].trim()) {
    try {
      const m: unknown = JSON.parse(row["metadata"]);
      if (!m || typeof m !== "object" || Array.isArray(m)) throw Error();
      meta = m as Record<string, unknown>;
    } catch {
      throw Error(`Linha ${rowNumber}: metadata deve ser um objeto JSON.`);
    }
  }
  const text = (...keys: string[]) => {
    for (const key of keys) {
      const v = row[key] ?? meta[key.replace(/^metadata\./, "")];
      if (typeof v === "string" || typeof v === "number") return String(v).trim();
    }
    return "";
  };
  const title = text("title", "text", "enunciado");
  let options: unknown = row["answer_options"] ?? row["options"];
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      throw Error(`Linha ${rowNumber}: answer_options deve ser uma lista JSON.`);
    }
  }
  if (options === undefined) {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    let last = -1;
    letters.forEach((key, i) => {
      if (text(key)) last = i;
    });
    options = letters.slice(0, last + 1).map((key) => text(key));
  }
  if (
    !title ||
    !Array.isArray(options) ||
    options.length < 2 ||
    options.length > 5 ||
    !options.every((o) => typeof o === "string")
  )
    throw Error(`Linha ${rowNumber}: informe enunciado e de 2 a 5 alternativas em texto/HTML.`);
  let answer = -1;
  const supplied = row["correct_answer_index"] ?? row["answer"];
  if (supplied !== undefined && supplied !== "") {
    const n = Number(supplied);
    if (!Number.isInteger(n) || n < 0 || n >= options.length)
      throw Error(
        `Linha ${rowNumber}: correct_answer_index deve começar em 0 e apontar para uma alternativa existente.`,
      );
    answer = n;
  } else {
    const key = text("gabarito").toUpperCase();
    if (key) {
      answer = /^[A-J]$/.test(key) ? key.charCodeAt(0) - 65 : /^\d+$/.test(key) ? Number(key) : -1;
      if (answer < 0 || answer >= options.length)
        throw Error(`Linha ${rowNumber}: gabarito inválido.`);
    }
  }
  const bncc = text("bncc", "metadata.bncc", "skill");
  const type = text("question_type") || "MULTIPLA ESCOLHA";
  if (!["MULTIPLA ESCOLHA", "VERDADEIRO OU FALSO"].includes(type))
    throw Error(`Linha ${rowNumber}: question_type inválido.`);
  const optionType = text("answer_options_type") || "TEXTO";
  if (!["TEXTO", "IMAGEM"].includes(optionType))
    throw Error(`Linha ${rowNumber}: answer_options_type inválido.`);
  const format =
    row["title"] !== undefined || text("formato", "contentFormat") === "HTML" ? "HTML" : "TEXT";
  return {
    ...blankQuestion(source),
    originalRecord: JSON.stringify(row, null, 2),
    text: title,
    options: options as string[],
    answer,
    answerSource: answer >= 0 ? "arquivo estruturado" : undefined,
    bncc,
    skill: bncc.split(",")[0]?.trim() || "",
    subject: text("subjects", "disciplina", "subject") || "",
    year: text("ano_escolar", "metadata.ano_escolar", "year") || "",
    difficulty: text("difficulty", "metadata.difficulty", "dificuldade") || "Média",
    reason: text("answers_explanation", "justificativa", "reason"),
    questionType: type as Question["questionType"],
    optionsType: optionType as Question["optionsType"],
    contentFormat: format,
    saebDescriptor: text("saebDescriptor", "metadata.saebDescriptor", "descritor"),
    saebMatrix: text("matriz_saeb", "saebMatrix"),
    topic: text("assunto", "metadata.assunto", "topic"),
    pedagogicalType: text("tipo", "metadata.tipo", "pedagogicalType") || "Múltipla escolha",
    arGalleryId: text("ar_gallery_id") || undefined,
    confidence: `Importação estruturada · linha ${rowNumber}; revisar todos os campos`,
  };
}
export function rowsFromTable(table: string[][], source: string) {
  const [headers, ...rows] = table;
  if (!headers?.length || !headers.some((h) => ["title", "text", "enunciado"].includes(h.trim())))
    throw Error(
      "Cabeçalho exigido: enunciado (ou title), A, B, C, D, gabarito e campos pedagógicos.",
    );
  if (new Set(headers.map((h) => h.trim())).size !== headers.length)
    throw Error("Há cabeçalhos duplicados.");
  if (!rows.length || rows.length > 500) throw Error("Importe de 1 a 500 questões por arquivo.");
  return rows.map((row, i) =>
    normalizeQuestionRow(
      Object.fromEntries(headers.map((h, j) => [h.trim(), row[j] ?? ""])),
      source,
      i + 2,
    ),
  );
}
export async function readXlsx(file: File): Promise<Question[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const questions: Question[] = [];
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount > 501 || sheet.columnCount > 50)
      throw Error("Planilha deve ter até 500 questões e 50 colunas.");
    const table: string[][] = [];
    sheet.eachRow((row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, i) => {
        if (cell.type === ExcelJS.default.ValueType.Formula)
          throw Error("Remova as fórmulas da planilha; use somente valores.");
        values[i - 1] = cell.text;
      });
      if (values.some((v) => v?.trim())) table.push(values);
    });
    if (table.length) questions.push(...rowsFromTable(table, file.name));
  }
  if (!questions.length || questions.length > 500)
    throw Error("Importe de 1 a 500 questões por arquivo.");
  return questions;
}
