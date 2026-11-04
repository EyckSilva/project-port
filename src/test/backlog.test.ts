import { describe, expect, it } from "vitest";
import { blankQuestion, parseQuestionText } from "@/features/mentary/extraction";
import {
  questionErrors,
  validateAssessment,
  canPublish,
  parseCsv,
  canAccess,
} from "@/features/mentary/rules";
import { aggregate, attention } from "@/features/mentary/results";
import { importUsers } from "@/features/mentary/users-model";
import { initialQuestions, type Assessment } from "@/features/mentary/data";

describe("Question extraction and approval", () => {
  it("preserves source and page without inventing an answer", () => {
    const [q] = parseQuestionText("Questão 1. Quanto é 2 + 2?\nA) 3\nB) 4\nC) 5", "prova.pdf", 4);
    expect(q).toMatchObject({ source: "prova.pdf", page: 4, answer: -1, options: ["3", "4", "5"] });
    expect(questionErrors(q!)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("gabarito"),
        expect.stringContaining("habilidade"),
      ]),
    );
  });
  it("does not turn ambiguous content into a valid question", () => {
    expect(parseQuestionText("Texto de abertura sem alternativas", "prova.pdf", 1)).toEqual([]);
    expect(questionErrors(blankQuestion("foto.png")).length).toBeGreaterThan(2);
  });
  it("requires human validation and invalidates publication after editing", () => {
    const q = { ...initialQuestions[0]!, status: "Aprovada" };
    const a: Assessment = {
      id: "a",
      name: "Teste",
      subject: q.subject,
      year: q.year,
      classId: "t1",
      questions: [q.id],
      status: "Rascunho",
      date: "2026-10-30",
    };
    const v = validateAssessment(a, [q]);
    expect(v.blocking).toEqual([]);
    expect(canPublish(a, [q])).toBeFalsy();
    const approved = {
      ...a,
      validation: {
        fingerprint: v.fingerprint,
        acknowledged: true,
        approvedBy: "Revisor",
        approvedAt: "2026-10-30",
        alerts: v.alerts,
      },
    };
    expect(canPublish(approved, [q])).toBeTruthy();
    expect(canPublish(approved, [{ ...q, answer: -1 }])).toBeFalsy();
  });
});
describe("Results from registered responses", () => {
  it("calculates errors and omissions separately, and recalculates on answer-key corrections", () => {
    const q = initialQuestions[0]!;
    const rows = [
      {
        studentId: "a1",
        classId: "t1",
        schoolId: "s1",
        questionId: q.id,
        answer: q.answer,
        seconds: 60,
      },
      {
        studentId: "a2",
        classId: "t1",
        schoolId: "s1",
        questionId: q.id,
        answer: null,
        seconds: 30,
      },
    ];
    expect(aggregate(rows, [q])).toMatchObject({
      score: 50,
      omissionRate: 50,
      errorRate: 0,
      students: 2,
      seconds: 45,
    });
    expect(aggregate(rows, [{ ...q, answer: (q.answer + 1) % 4 }])).toMatchObject({
      score: 0,
      errorRate: 50,
    });
    expect(aggregate([], [q]).score).toBeNull();
    expect(attention(null)).toBe("Sem dados");
  });
});
describe("CSV administration and access", () => {
  it("supports quotes, embedded delimiters and newlines", () => {
    expect(parseCsv('nome;nota\r\n"Ana; Silva";"Linha 1\nLinha 2"')).toEqual([
      ["nome", "nota"],
      ["Ana; Silva", "Linha 1\nLinha 2"],
    ]);
  });
  it("keeps valid users and rejects invalid and duplicate rows", () => {
    const r = importUsers(
      "nome;email;data_nascimento;papel\nAna;ana@escola.br;1990-01-01;Professora\nAna;ana@escola.br;1990-01-01;Professora\nBia;email;2026-02-31;Administrador",
      [],
    );
    expect(r.valid).toHaveLength(1);
    expect(r.errors).toHaveLength(2);
  });
  it("blocks direct student routes and admin screens for teachers", () => {
    expect(canAccess("Estudante", "/questoes/importar")).toBe(false);
    expect(canAccess("Professora", "/usuarios")).toBe(false);
    expect(canAccess("Administrador", "/usuarios")).toBe(true);
  });
});
