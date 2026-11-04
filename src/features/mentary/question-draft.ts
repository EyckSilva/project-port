import type { Question } from "./data";
export function blankQuestion(source: string, page = 1): Question {
  return {
    contractVersion: 1,
    contentFormat: "TEXT",
    questionType: "MULTIPLA ESCOLHA",
    optionsType: "TEXTO",
    bncc: "",
    saebDescriptor: "",
    saebMatrix: "",
    topic: "",
    pedagogicalType: "Múltipla escolha",
    id: crypto.randomUUID(),
    text: "",
    subject: "",
    year: "",
    skill: "",
    difficulty: "Média",
    status: "Pendente de revisão",
    options: ["", "", "", ""],
    answer: -1,
    reason: "",
    source,
    page,
    updated: new Date().toLocaleDateString("pt-BR"),
    history: [],
    confidence: "Baixa; conferir todos os campos",
  };
}
