import { skills, type Question, type Assessment, type Profile } from "./data";
import { contractErrors } from "./mentary-contract";

export function questionErrors(q: Question) {
  if (q.options.length > 5)
    return ["A questão não pode ter mais de cinco alternativas. Separe os itens antes de aprovar."];
  if (q.contractVersion === 1 || q.documentId) return contractErrors(q);
  return [
    ...(!q.text.trim() ? ["Informe o enunciado."] : []),
    ...(q.options.filter((o) => o.trim()).length < 2 || q.options.some((o) => !o.trim())
      ? ["Preencha pelo menos duas alternativas, sem alternativas vazias."]
      : []),
    ...(!Number.isInteger(q.answer) || q.answer < 0 || !q.options[q.answer]?.trim()
      ? ["Selecione o gabarito; ele não é definido automaticamente."]
      : []),
    ...(!skills.some((s) => s.id === q.skill && s.subject === q.subject && s.year === q.year)
      ? ["Selecione uma habilidade compatível com a disciplina e o ano."]
      : []),
  ];
}
export function questionChanges(before: Question | undefined, after: Question) {
  if (!before) return "Cadastro inicial";
  const fields = [
    "text",
    "options",
    "answer",
    "skill",
    "subject",
    "year",
    "difficulty",
    "image",
    "source",
    "page",
    "bncc",
    "saebDescriptor",
    "saebMatrix",
    "topic",
    "pedagogicalType",
    "questionType",
    "optionsType",
    "contentFormat",
    "arGalleryId",
  ] as const;
  return (
    fields
      .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .map(
        (key) =>
          `${key}: ${JSON.stringify(before[key] ?? "")} → ${JSON.stringify(after[key] ?? "")}`,
      )
      .join("; ") || "Conteúdo confirmado sem alterações"
  );
}
export function validateAssessment(a: Assessment, all: Question[]) {
  const qs = a.questions.map((id) => all.find((q) => q.id === id));
  const blocking = [
    ...(!qs.length ? ["Adicione questões ao simulado."] : []),
    ...qs.flatMap((q, i) =>
      !q
        ? [`Questão ${i + 1} não encontrada.`]
        : [
            ...questionErrors(q).map((e) => `${q.id}: ${e}`),
            ...(q.status !== "Aprovada" ? [`${q.id}: revisão ainda não aprovada.`] : []),
          ],
    ),
  ];
  const valid = qs.filter((q): q is Question => Boolean(q));
  const distribution = [...new Set(valid.map((q) => q.skill))].map((skill) => ({
    skill,
    count: valid.filter((q) => q.skill === skill).length,
  }));
  const alerts = [
    ...(distribution.some((d) => d.count / valid.length > 0.5)
      ? ["Mais de 50% dos itens estão concentrados na mesma habilidade/descritor."]
      : []),
    ...(new Set(valid.map((q) => q.text.trim().toLowerCase())).size < valid.length
      ? ["Há enunciados semelhantes ou repetidos."]
      : []),
    ...(valid.length && new Set(valid.map((q) => q.difficulty)).size < 3
      ? ["A avaliação não contempla os três níveis de dificuldade."]
      : []),
  ];
  const fingerprint = JSON.stringify(
    qs.map(
      (q) =>
        q && [
          q.id,
          q.text,
          q.options,
          q.answer,
          q.skill,
          q.bncc,
          q.saebDescriptor,
          q.saebMatrix,
          q.status,
          q.difficulty,
          q.questionType,
          q.optionsType,
          q.contentFormat,
          q.subject,
          q.year,
          q.topic,
          q.pedagogicalType,
          q.image,
          q.arGalleryId,
        ],
    ),
  );
  return { blocking, alerts, distribution, fingerprint };
}
export function canPublish(a: Assessment, questions: Question[]) {
  const v = validateAssessment(a, questions);
  return (
    !v.blocking.length &&
    a.validation?.fingerprint === v.fingerprint &&
    (!v.alerts.length || a.validation.acknowledged)
  );
}
export function canReview(profile: Profile, reviewPermission = false) {
  return (
    profile === "Administrador" ||
    profile === "Coordenadora" ||
    (profile === "Professora" && reviewPermission)
  );
}
export function canAccess(profile: Profile, path: string) {
  if (profile === "Estudante")
    return ["/dashboard", "/meu-desempenho", "/configuracoes", "/ajuda"].includes(path);
  if (path === "/usuarios") return profile === "Administrador";
  return true;
}

// RFC 4180 parser supports quoted fields, semicolons, CRLF and embedded newlines.
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const first = clean.split(/\r?\n/)[0] || "";
  const delimiter = first.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '"') {
      if (quoted && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Há aspas não fechadas no CSV.");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
