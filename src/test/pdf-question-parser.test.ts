import { describe, it, expect } from "vitest";
import {
  parseQuestionPages,
  parseQuestionText,
  pdfTextToLines,
} from "@/features/mentary/pdf-question-parser";
import { documentAnswerKey } from "@/features/mentary/batch-review";
import { contractErrors } from "@/features/mentary/mentary-contract";
import { blankQuestion } from "@/features/mentary/extraction";

const screenshotText = `Página 1
Questões para Alunos do Ensino Fundamental
Material de exemplo para testar um extrator automático de questões escolares.
Instruções: leia cada questão e escolha a alternativa correta. O gabarito está em uma seção separada no final do PDF.
Questão 1 — Matemática. Mariana tinha 24 figurinhas e ganhou mais 13 de sua amiga. Quantas figurinhas ela tem agora?
A) 27
B) 37
C) 40
D) 41
Questão 2 — Matemática. Uma caixa contém 6 lápis. Quantos lápis há em 4 caixas iguais?
A) 10
B) 18
C) 24
D) 30
Questão 3 — Português. Leia a frase: “O cachorro correu alegremente pelo parque.” Qual palavra indica como o cachorro correu?
A) Cachorro
B) Alegremente
C) Parque
D) Correu`;
describe("PDF question boundary regression", () => {
  it("reproduces the screenshot format and returns three distinct questions with four alternatives", () => {
    const questions = parseQuestionText(screenshotText, "prova.pdf", 1);
    expect(questions).toHaveLength(3);
    expect(questions.map((q) => q.options.length)).toEqual([4, 4, 4]);
    expect(questions[0]?.text).toBe(
      "Mariana tinha 24 figurinhas e ganhou mais 13 de sua amiga. Quantas figurinhas ela tem agora?",
    );
    expect(questions[0]?.options).toEqual(["27", "37", "40", "41"]);
    expect(questions[1]?.options).toEqual(["10", "18", "24", "30"]);
    expect(questions[2]?.subject).toBe("Língua Portuguesa");
    expect(
      questions.every(
        (q) =>
          !q.text.includes("Instruções") &&
          !q.text.includes("Página") &&
          !q.options.some((o) => o.includes("Questão")),
      ),
    ).toBe(true);
  });
  it("separates explicit question headers even if the PDF emitted a single line", () => {
    expect(
      parseQuestionText(screenshotText.replaceAll("\n", " "), "prova.pdf", 1).map((q) => q.options),
    ).toEqual([
      ["27", "37", "40", "41"],
      ["10", "18", "24", "30"],
      ["Cachorro", "Alegremente", "Parque", "Correu"],
    ]);
  });
  it.each(["—", "–", "-", ":", "."])(
    "recognizes the delimiter %s after Questão with surrounding spaces",
    (dash) => {
      const q = parseQuestionText(
        `Questão 8 ${dash} Ciências. Qual alternativa?\n(A) Água\n(B) Terra`,
        "x.pdf",
        4,
      );
      expect(q).toHaveLength(1);
      expect(q[0]).toMatchObject({
        sourceNumber: 8,
        subject: "Ciências",
        text: "Qual alternativa?",
        options: ["Água", "Terra"],
        page: 4,
      });
    },
  );
  it("joins a question continued on another page and excludes repeated headings, page numbers and the answer key", () => {
    const result = parseQuestionPages(
      [
        {
          page: 1,
          text: "Página 1\nQuestões para Alunos do Ensino Fundamental\nQuestão 1 — Matemática. Quanto é 2 + 2?\nA) 1\nB) 2",
        },
        {
          page: 2,
          text: "Página 2\nQuestões para Alunos do Ensino Fundamental\nC) 3\nD) 4\nGabarito\n1 — D",
        },
      ],
      "x.pdf",
    );
    expect(result.warnings).toEqual([]);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      text: "Quanto é 2 + 2?",
      options: ["1", "2", "3", "4"],
      page: 1,
    });
    expect([...documentAnswerKey("Gabarito\nQuestão 1 — D")]).toEqual([[1, 3]]);
  });
  it("rejects repeated A–D sequences and six alternatives instead of truncating or relettering them", () => {
    const repeated = parseQuestionPages(
      [{ page: 1, text: "Enunciado sem fronteira confiável\nA) 1\nB) 2\nC) 3\nD) 4\nA) 5\nB) 6" }],
      "x.pdf",
    );
    expect(repeated.questions).toHaveLength(0);
    expect(repeated.warnings[0]).toContain("sequência");
    const six = parseQuestionPages(
      [{ page: 1, text: "Questão 1 — Enunciado\nA) 1\nB) 2\nC) 3\nD) 4\nE) 5\nF) 6" }],
      "x.pdf",
    );
    expect(six.questions).toHaveLength(0);
    expect(six.warnings).toHaveLength(1);
    expect(
      contractErrors({ ...blankQuestion("x"), options: ["1", "2", "3", "4", "5", "6"] }),
    ).toContain(
      "A questão não pode ter mais de cinco alternativas. Separe os itens antes de aprovar.",
    );
  });
  it("reports incomplete numbered blocks while retaining separate, valid questions", () => {
    const result = parseQuestionPages(
      [
        {
          page: 1,
          text: "Questão 1 — Sem alternativas\nQuestão 2 — Qual opção?\nA) Uma\nB) Outra",
        },
      ],
      "x.pdf",
    );
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.sourceNumber).toBe(2);
    expect(result.warnings[0]).toContain("Questão 1");
  });
  it("rebuilds shuffled PDF fragments in top-to-bottom, left-to-right order", () => {
    expect(
      pdfTextToLines([
        { str: "4", transform: [1, 0, 0, 1, 90, 670] },
        { str: "Questão 1 — Quanto é 2 + 2?", transform: [1, 0, 0, 1, 50, 700] },
        { str: "A)", transform: [1, 0, 0, 1, 50, 670] },
        { str: "B) 5", transform: [1, 0, 0, 1, 50, 650] },
      ]),
    ).toBe("Questão 1 — Quanto é 2 + 2?\nA) 4\nB) 5");
  });
});
