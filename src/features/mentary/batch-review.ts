import type { Question } from "./data";
export type CommonFields = Pick<
  Question,
  | "subject"
  | "year"
  | "bncc"
  | "saebDescriptor"
  | "saebMatrix"
  | "topic"
  | "difficulty"
  | "pedagogicalType"
>;
export const emptyCommon: CommonFields = {
  subject: "",
  year: "",
  bncc: "",
  saebDescriptor: "",
  saebMatrix: "",
  topic: "",
  difficulty: "",
  pedagogicalType: "",
};
export function commonFromQuestions(questions: Question[]): CommonFields {
  const common = { ...emptyCommon };
  for (const key of Object.keys(common) as (keyof CommonFields)[]) {
    const values = [...new Set(questions.map((q) => q[key] || "").filter(Boolean))];
    common[key] = values.length === 1 ? values[0]! : "";
  }
  return common;
}
export function applyCommon(q: Question, values: CommonFields, overwrite = false): Question {
  const patch: Partial<Question> = {};
  for (const key of Object.keys(values) as (keyof CommonFields)[]) {
    const value = values[key]?.trim();
    if (value && (overwrite || !q[key]?.trim())) patch[key] = value;
  }
  const bncc = patch.bncc ?? q.bncc ?? q.skill;
  return { ...q, ...patch, skill: bncc.split(",")[0]?.trim().toUpperCase() || q.skill };
}
export function parseAnswerKey(text: string): Map<number, number> {
  const result = new Map<number, number>();
  const pattern = /(\d+)\s*[-).:=]\s*([A-J])\b/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const n = Number(match[1]);
    const answer = match[2]!.toUpperCase().charCodeAt(0) - 65;
    if (result.has(n)) throw Error(`O gabarito repete a questão ${n}.`);
    result.set(n, answer);
  }
  if (!result.size || text.replace(pattern, "").replace(/[\s,;|]+/g, ""))
    throw Error("Use o formato 1-C, 2-A, 3-B. O gabarito deve vir do professor ou do documento.");
  return result;
}
export function applyAnswerKey(questions: Question[], text: string, overwrite = false): Question[] {
  const answers = parseAnswerKey(text);
  const numbers = questions.map((q, i) => q.sourceNumber ?? i + 1);
  for (const [number, answer] of answers) {
    const index = numbers.indexOf(number);
    if (index < 0) throw Error(`Questão ${number} não encontrada neste documento.`);
    if (numbers.indexOf(number, index + 1) !== -1)
      throw Error(
        `Há mais de uma questão com o número ${number}. Ajuste o gabarito individualmente.`,
      );
    if (answer >= questions[index]!.options.length)
      throw Error(
        `A alternativa ${String.fromCharCode(65 + answer)} não existe na questão ${number}.`,
      );
  }
  return questions.map((q, i) =>
    answers.has(numbers[i]!) && (overwrite || q.answer < 0)
      ? { ...q, answer: answers.get(numbers[i]!)!, answerSource: "professor" }
      : q,
  );
}
export function documentContext(text: string): Partial<CommonFields> {
  const subject =
    text.match(
      /(?:componente(?: curricular)?|disciplina)\s*[:-]\s*(Matemática|Língua Portuguesa|Ciências|História|Geografia|Física|Química|Biologia)/i,
    )?.[1] || text.match(/\b(Matemática|Língua Portuguesa|Ciências)\s*[-·|]/i)?.[1];
  const year = text.match(/\b(\d{1,2})\s*[ºo°]?\s*ano\b/i)?.[1];
  const bncc = text
    .match(
      /(?:habilidades?\s*)?BNCC\s*[:-]\s*((?:(?:EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{3}|EI\d{2}[A-Z]{2}\d{2})\s*,?\s*)+)/i,
    )?.[1]
    ?.trim();
  const saebDescriptor = text.match(/descritor\s*(?:SAEB)?\s*[:-]\s*(D\d+)\b/i)?.[1];
  const topic = text.match(/(?:tema|assunto|conteúdo)\s*[:-]\s*([^\n]+)/i)?.[1]?.trim();
  return {
    ...(subject ? { subject } : {}),
    ...(year ? { year: `${year}º ano` } : {}),
    ...(bncc ? { bncc, skill: bncc.split(",")[0]!.trim() } : {}),
    ...(saebDescriptor ? { saebDescriptor } : {}),
    ...(topic ? { topic } : {}),
  };
}
export function documentAnswerKey(text: string): Map<number, number> {
  const heading =
    /^[ \t]*Gabarito(?:[ \t]+(?:oficial|comentado|das quest[õo]es))?[ \t]*(?:[:–—-]|$)/im.exec(
      text,
    );
  if (!heading) return new Map();
  const section = text.slice(heading.index + heading[0].length);
  const answers = new Map<number, number>();
  const pattern = /(?:\bQuest[ãa]o[ \t]*)?(\d{1,3})[ \t]*(?:[-–—).:=][ \t]*|[ \t]+)([A-E])\b/gi;
  for (const m of section.matchAll(pattern)) {
    const number = Number(m[1]);
    if (answers.has(number)) return new Map();
    answers.set(number, m[2]!.toUpperCase().charCodeAt(0) - 65);
  }
  return answers;
}
