import { initialClasses, initialStudents, initialQuestions, type Question } from "./data";
export type Response = {
  studentId: string;
  classId: string;
  schoolId: string;
  questionId: string;
  answer: number | null;
  seconds: number;
};
export type Application = { id: string; name: string; date: string; responses: Response[] };
export const initialApplications: Application[] = [0, 1].map((period) => ({
  id: `ap${period + 1}`,
  name: period ? "Acompanhamento · Outubro" : "Diagnóstico · Setembro",
  date: period ? "2026-10-20" : "2026-09-15",
  responses: initialStudents.flatMap((student, i) =>
    initialQuestions.slice(0, 12).map((q, j) => {
      const room = initialClasses.find((c) => c.id === student.classId)!;
      const seed = (i * 17 + j * 11 + period * 13) % 100;
      return {
        studentId: student.id,
        classId: student.classId,
        schoolId: room.schoolId,
        questionId: q.id,
        answer:
          seed < 7
            ? null
            : seed < student.score + (period ? 4 : -5)
              ? q.answer
              : (q.answer + 1) % q.options.length,
        seconds: 30 + ((i * 11 + j * 7) % 120),
      };
    }),
  ),
}));
export type Thresholds = {
  critical: number;
  attention: number;
  adequate: number;
  drop: number;
  minimumSample: number;
};
export const defaultThresholds: Thresholds = {
  critical: 40,
  attention: 60,
  adequate: 80,
  drop: 10,
  minimumSample: 10,
};
export function attention(score: number | null, t: Thresholds = defaultThresholds) {
  return score === null
    ? "Sem dados"
    : score < t.critical
      ? "Crítico"
      : score < t.attention
        ? "Atenção"
        : score < t.adequate
          ? "Intermediário"
          : "Adequado";
}
export function aggregate(responses: Response[], questions: Question[]) {
  const qs = new Map(questions.map((q) => [q.id, q]));
  const rows = responses.filter((r) => qs.has(r.questionId));
  const correct = rows.filter(
    (r) => r.answer !== null && r.answer === qs.get(r.questionId)?.answer,
  ).length;
  const omissions = rows.filter((r) => r.answer === null).length;
  return {
    count: rows.length,
    students: new Set(rows.map((r) => r.studentId)).size,
    questions: new Set(rows.map((r) => r.questionId)).size,
    correct,
    omissions,
    errors: rows.length - correct - omissions,
    score: rows.length ? Math.round((1000 * correct) / rows.length) / 10 : null,
    errorRate: rows.length
      ? Math.round((1000 * (rows.length - correct - omissions)) / rows.length) / 10
      : null,
    omissionRate: rows.length ? Math.round((1000 * omissions) / rows.length) / 10 : null,
    seconds: rows.length ? Math.round(rows.reduce((s, r) => s + r.seconds, 0) / rows.length) : null,
  };
}
