import type { Question } from "./data";
import { toHtml, hasContent, safeImageUrl, escapeHtml } from "./content";
export const questionTypes = ["MULTIPLA ESCOLHA", "VERDADEIRO OU FALSO"] as const;
export const difficulties = ["Fácil", "Média", "Difícil", "Muito difícil"];
export const pedagogicalTypes = [
  "Múltipla escolha",
  "Associação",
  "Lacunas",
  "Interpretação de gráficos e tabelas",
];
export const demoIdentity = {
  userId: "00000000-0000-0000-0000-000000000001",
  institutionId: "00000000-0000-0000-0000-000000000010",
};
// PostgreSQL also accepts the illustrative UUIDs supplied in seed.sql.
export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function bnccCodes(q: Question) {
  return (q.bncc ?? q.skill)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}
export function contractErrors(q: Question) {
  const format = q.contentFormat || "TEXT";
  const codes = bnccCodes(q);
  return [
    ...(q.options.length > 5
      ? ["A questão não pode ter mais de cinco alternativas. Separe os itens antes de aprovar."]
      : []),
    ...(!hasContent(q.text, format) ? ["Informe um enunciado com texto, imagem ou fórmula."] : []),
    ...(!questionTypes.includes(q.questionType || "MULTIPLA ESCOLHA")
      ? ["Tipo de questão inválido."]
      : []),
    ...(!["TEXTO", "IMAGEM"].includes(q.optionsType || "TEXTO")
      ? ["Formato de alternativas inválido."]
      : []),
    ...(q.image && !safeImageUrl(q.image)
      ? ["Use uma imagem local válida ou uma URL HTTPS para o enunciado."]
      : []),
    ...(q.questionType === "VERDADEIRO OU FALSO" && q.options.length !== 2
      ? ["Verdadeiro ou falso exige exatamente duas alternativas."]
      : []),
    ...(q.options.length < 2 ||
    q.options.some((o) =>
      q.optionsType === "IMAGEM"
        ? !safeImageUrl(o) && !/<img\s/i.test(toHtml(o, format))
        : !hasContent(o, format),
    )
      ? ["Preencha pelo menos duas alternativas válidas."]
      : []),
    ...(!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length
      ? ["Selecione o gabarito; ele não é definido automaticamente."]
      : []),
    ...(!q.subject.trim() ? ["Informe o componente curricular."] : []),
    ...(!codes.length ||
    codes.some(
      (code) => !/^EF\d{2}[A-Z]{2}\d{2}$|^EM\d{2}[A-Z]{3}\d{3}$|^EI\d{2}[A-Z]{2}\d{2}$/.test(code),
    )
      ? ["Informe ao menos uma habilidade BNCC em formato válido, separada por vírgulas."]
      : []),
    ...(!q.saebDescriptor?.trim() ? ["Informe o descritor SAEB."] : []),
    ...(!difficulties.includes(q.difficulty) ? ["Selecione uma dificuldade válida."] : []),
    ...(!q.topic?.trim() ? ["Informe o tema ou conteúdo."] : []),
    ...(!pedagogicalTypes.includes(q.pedagogicalType || "")
      ? ["Selecione o tipo pedagógico."]
      : []),
    ...(q.arGalleryId && !isUuid(q.arGalleryId)
      ? ["O recurso de Realidade Aumentada exige um UUID válido."]
      : []),
  ];
}
export type MentaryQuestion = {
  question_id: string;
  title: string;
  answer_options: string[];
  correct_answer_index: number;
  question_type: string;
  answer_options_type: string;
  content_type: null;
  fk_content_id: null;
  question_visibility_status: "PRIVATE";
  subjects: string;
  metadata: {
    bncc: string;
    saebDescriptor: string;
    difficulty: string;
    assunto: string;
    tipo: string;
    ano_escolar: string;
  };
  answers_explanation: string;
  fk_user_id: string;
  fk_institution_id: string;
  ar_gallery_id?: string;
};
export function toMentaryQuestion(q: Question, identity = demoIdentity): MentaryQuestion {
  const errors = contractErrors(q);
  if (q.status !== "Aprovada") errors.push("A questão precisa estar aprovada para exportação.");
  if (!isUuid(identity.userId) || !isUuid(identity.institutionId))
    errors.push("Autor e instituição exigem UUIDs válidos.");
  if (!isUuid(q.id)) errors.push("A questão precisa de um identificador UUID válido.");
  const title =
    toHtml(q.text, q.contentFormat) +
    (q.image ? `<p><img src="${escapeHtml(q.image)}" alt="Imagem da questão"></p>` : "");
  const options = q.options.map((o) =>
    q.optionsType === "IMAGEM" && safeImageUrl(o)
      ? `<img src="${escapeHtml(o)}" alt="Alternativa">`
      : q.contentFormat === "HTML"
        ? toHtml(o, "HTML")
        : o,
  );
  if (/(?:src\s*=\s*["']?)(?:data:|blob:|local-media:)/i.test(title + options.join("")))
    errors.push(
      "Há imagens locais pendentes. O servidor deve enviá-las ao bucket media e fornecer URLs públicas HTTPS antes da exportação final.",
    );
  if (q.image && !safeImageUrl(q.image, false))
    errors.push("A imagem do enunciado precisa de uma URL pública HTTPS.");
  if (errors.length) throw Error([...new Set(errors)].join(" "));
  return {
    question_id: q.id,
    title,
    answer_options: options,
    correct_answer_index: q.answer,
    question_type: q.questionType || "MULTIPLA ESCOLHA",
    answer_options_type: q.optionsType || "TEXTO",
    content_type: null,
    fk_content_id: null,
    question_visibility_status: "PRIVATE",
    subjects: q.subject,
    metadata: {
      bncc: [...new Set(bnccCodes(q))].join(", "),
      saebDescriptor: q.saebDescriptor!,
      difficulty: q.difficulty,
      assunto: q.topic!,
      tipo: q.pedagogicalType!,
      ano_escolar: q.year,
    },
    answers_explanation: q.reason,
    fk_user_id: identity.userId,
    fk_institution_id: identity.institutionId,
    ...(q.arGalleryId ? { ar_gallery_id: q.arGalleryId } : {}),
  };
}
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
