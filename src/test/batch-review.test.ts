import { describe, it, expect } from "vitest";
import {
  applyCommon,
  applyAnswerKey,
  commonFromQuestions,
  emptyCommon,
  documentContext,
  documentAnswerKey,
} from "@/features/mentary/batch-review";
import { blankQuestion, parseQuestionText } from "@/features/mentary/extraction";
describe("Teacher batch review", () => {
  it("fills common missing fields while retaining individual classifications by default", () => {
    const q = {
      ...blankQuestion("prova.pdf"),
      topic: "Geometria",
      bncc: "EF05MA01",
      skill: "EF05MA01",
    };
    const fields = {
      ...emptyCommon,
      subject: "Matemática",
      year: "5º ano",
      topic: "Frações",
      bncc: "EF05MA08",
      saebDescriptor: "D19",
    };
    expect(applyCommon(q, fields)).toMatchObject({
      subject: "Matemática",
      year: "5º ano",
      topic: "Geometria",
      bncc: "EF05MA01",
    });
    expect(applyCommon(q, fields, true)).toMatchObject({
      topic: "Frações",
      bncc: "EF05MA08",
      skill: "EF05MA08",
    });
  });
  it("keeps existing answers unless replacement is explicitly selected and validates pasted keys atomically", () => {
    const a = { ...blankQuestion("x.pdf"), sourceNumber: 4, options: ["A", "B", "C"], answer: 0 };
    const b = { ...blankQuestion("x.pdf"), sourceNumber: 5, options: ["A", "B"] };
    expect(applyAnswerKey([a, b], "4-C, 5-B").map((q) => q.answer)).toEqual([0, 1]);
    expect(applyAnswerKey([a, b], "4-C, 5-B", true).map((q) => q.answer)).toEqual([2, 1]);
    expect(() => applyAnswerKey([a, b], "4-C, 5-D")).toThrow("não existe");
    expect(a.answer).toBe(0);
    expect(b.answer).toBe(-1);
    expect(() => applyAnswerKey([a, b], "4-A, 4-B")).toThrow("repete");
    expect(() => applyAnswerKey([a, b], "9-A")).toThrow("não encontrada");
  });
  it("only infers curriculum fields explicitly labelled in the document, never inventing a BNCC mapping", () => {
    expect(
      documentContext("Matemática - 5º ano\nTema: Frações\nBNCC: EF05MA08\nDescritor SAEB: D19"),
    ).toMatchObject({
      subject: "Matemática",
      year: "5º ano",
      topic: "Frações",
      bncc: "EF05MA08",
      saebDescriptor: "D19",
    });
    expect(documentContext("Quanto é 2 + 2?")).toEqual({});
  });
  it("preserves original numbering, removes the answer-key section from alternatives and reads only an explicit key", () => {
    const text =
      "4. Quanto é 2 + 2?\nA) Três\nB) Quatro\n5. Quanto é 3 + 3?\nA) Seis\nB) Sete\nGabarito: 4-B, 5-A";
    const qs = parseQuestionText(text, "prova.pdf", 2);
    expect(qs).toHaveLength(2);
    expect(qs.map((q) => q.sourceNumber)).toEqual([4, 5]);
    expect(qs[1]?.options).toEqual(["Seis", "Sete"]);
    expect([...documentAnswerKey(text)]).toEqual([
      [4, 1],
      [5, 0],
    ]);
    expect(documentAnswerKey("4-B, 5-A").size).toBe(0);
  });
  it("does not choose one shared value when the document has different topics", () => {
    const qs = [
      { ...blankQuestion("x"), topic: "Frações", subject: "Matemática" },
      { ...blankQuestion("x"), topic: "Geometria", subject: "Matemática" },
    ];
    expect(commonFromQuestions(qs)).toMatchObject({ topic: "", subject: "Matemática" });
  });
});
