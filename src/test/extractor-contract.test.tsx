import { describe, it, expect } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import {
  normalizeQuestionRow,
  rowsFromTable,
  readXlsx,
} from "@/features/mentary/structured-import";
import {
  contractErrors,
  toMentaryQuestion,
  demoIdentity,
  isUuid,
} from "@/features/mentary/mentary-contract";
import { cleanHtml, hasContent, saveLocalImage } from "@/features/mentary/content";
import { RichPreview } from "@/features/mentary/rich-preview";
import type { Question } from "@/features/mentary/data";
import { templateHeaders, templateRows } from "@/features/mentary/extractor-template";

const seed = {
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
};
function approved(): Question {
  return {
    ...normalizeQuestionRow({ ...seed, matriz_saeb: "Matriz de teste" }, "seed.json", 1),
    status: "Aprovada",
  };
}
afterEach(cleanup);
describe("Mentary SQL and README contract", () => {
  it("round trips the seed fields, with 0-based answers, private visibility and null legacy media", () => {
    const q = approved();
    const payload = toMentaryQuestion(q);
    expect(payload).toMatchObject({
      ...seed,
      question_id: q.id,
      question_visibility_status: "PRIVATE",
      content_type: null,
      fk_content_id: null,
      fk_user_id: demoIdentity.userId,
      fk_institution_id: demoIdentity.institutionId,
    });
    expect(Object.keys(payload.metadata).sort()).toEqual(
      ["ano_escolar", "assunto", "bncc", "difficulty", "saebDescriptor", "tipo"].sort(),
    );
    expect(payload).not.toHaveProperty("history");
    expect(payload).not.toHaveProperty("score");
    expect(payload).not.toHaveProperty("source");
    expect(isUuid(demoIdentity.userId)).toBe(true);
  });
  it("requires missing pedagogical data and exactly two true/false options", () => {
    const q = {
      ...approved(),
      questionType: "VERDADEIRO OU FALSO" as const,
      topic: "",
      saebDescriptor: "",
    };
    expect(contractErrors(q)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("exatamente duas"),
        expect.stringContaining("tema"),
        expect.stringContaining("descritor"),
      ]),
    );
    expect(
      contractErrors({
        ...q,
        options: ["Verdadeiro", "Falso"],
        answer: 0,
        topic: "Operações",
        saebDescriptor: "D19",
      }),
    ).toEqual([]);
    expect(() => toMentaryQuestion({ ...approved(), status: "Pendente de revisão" })).toThrow(
      "aprovada",
    );
  });
  it("exports multiple BNCC codes and Very difficult without silently collapsing metadata", () => {
    const q = {
      ...approved(),
      bncc: "ef05ma08, EF05MA07, EF05MA08",
      difficulty: "Muito difícil",
      pedagogicalType: "Lacunas",
    };
    expect(toMentaryQuestion(q).metadata).toMatchObject({
      bncc: "EF05MA08, EF05MA07",
      difficulty: "Muito difícil",
      tipo: "Lacunas",
    });
  });
  it("keeps local media out of the final payload until the server supplies public URLs", () => {
    expect(() =>
      toMentaryQuestion({
        ...approved(),
        image: "local-media:11111111-1111-4111-8111-111111111111",
      }),
    ).toThrow("imagens locais");
    const q = {
      ...approved(),
      optionsType: "IMAGEM" as const,
      options: ["https://example.com/a.png", "https://example.com/b.avif"],
      answer: 1,
      image: "https://example.com/stem.webp",
    };
    expect(toMentaryQuestion(q).answer_options[1]).toContain("<img");
    expect(toMentaryQuestion(q).title).toContain("stem.webp");
  });
  it("preserves incomplete imports as pending, rejects invalid supplied indices and malformed rows", () => {
    const q = normalizeQuestionRow(
      { text: "Questão sem gabarito", options: ["A", "B"] },
      "mock.json",
      1,
    );
    expect(q.answer).toBe(-1);
    expect(q.status).toBe("Pendente de revisão");
    expect(contractErrors(q).length).toBeGreaterThan(2);
    expect(() =>
      normalizeQuestionRow({ ...seed, correct_answer_index: 4 }, "mock.json", 1),
    ).toThrow("começar em 0");
    expect(() =>
      rowsFromTable(
        [
          ["enunciado", "enunciado"],
          ["A", "B"],
        ],
        "x.csv",
      ),
    ).toThrow("duplicados");
  });
});
describe("HTML, formulas and image validation", () => {
  it("strips executable HTML and unsafe image URLs while retaining LaTeX and formatting", () => {
    const html = cleanHtml(
      '<script>alert(1)</script><p onclick="alert(1)"><strong>Teste</strong><img src="javascript:alert(1)"><span data-latex="x^2"></span></p>',
    );
    expect(html).not.toMatch(/script|onclick|javascript:/);
    expect(html).toContain("<strong>Teste</strong>");
    expect(html).toContain('data-latex="x^2"');
    expect(hasContent("<p> </p>", "HTML")).toBe(false);
    expect(hasContent('<span data-latex=""></span>', "HTML")).toBe(false);
  });
  it("renders a real formula with KaTeX in the preview", async () => {
    const { container } = render(
      <RichPreview value={'<span data-latex="\\frac{3}{8}"></span>'} format="HTML" />,
    );
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
    expect(container.querySelector("math")).not.toBeNull();
  });
  it("rejects unsupported image formats and files larger than 5 MB before decoding", async () => {
    await expect(
      saveLocalImage(new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow("JPG");
    await expect(
      saveLocalImage(new File([new Uint8Array(5242881)], "x.avif", { type: "image/avif" })),
    ).rejects.toThrow("5 MB");
  });
});
describe("XLSX import", () => {
  it("reads the downloadable column model and two different response types", async () => {
    const ExcelJS = await import("exceljs");
    const book = new ExcelJS.default.Workbook();
    const sheet = book.addWorksheet("Questões");
    sheet.addRow(templateHeaders);
    templateRows.forEach((row) => sheet.addRow(row));
    const bytes = await book.xlsx.writeBuffer();
    const file = {
      name: "questoes.xlsx",
      arrayBuffer: async () => new Uint8Array(bytes).buffer,
    } as File;
    const rows = await readXlsx(file);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      answer: 1,
      saebDescriptor: "D19",
      topic: "Problemas com as quatro operações",
    });
    expect(rows[1]).toMatchObject({
      questionType: "VERDADEIRO OU FALSO",
      options: ["Verdadeiro", "Falso"],
      answer: 0,
    });
  });
  it("rejects spreadsheet formulas rather than treating cached results as reviewed answers", async () => {
    const ExcelJS = await import("exceljs");
    const book = new ExcelJS.default.Workbook();
    const sheet = book.addWorksheet("Questões");
    sheet.addRow(templateHeaders);
    sheet.addRow(templateRows[0]!);
    sheet.getCell("B2").value = { formula: "1+1", result: 2 };
    const bytes = await book.xlsx.writeBuffer();
    await expect(
      readXlsx({
        name: "formula.xlsx",
        arrayBuffer: async () => new Uint8Array(bytes).buffer,
      } as File),
    ).rejects.toThrow("fórmulas");
  });
});
