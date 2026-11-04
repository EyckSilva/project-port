import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Question } from "./data";
import { RichPreview } from "./rich-preview";
import { escapeHtml, safeImageUrl } from "./content";
import { questionErrors } from "./rules";
export function QuestionReviewCard({
  question: q,
  number,
  onChange,
  onDetails,
  onOriginal,
  onReopen,
}: {
  question: Question;
  number: number;
  onChange: (q: Question) => void;
  onDetails: () => void;
  onOriginal: () => void;
  onReopen: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const approved = q.status === "Aprovada";
  const errors = questionErrors(q);
  if (q.options.length > 5)
    return (
      <article
        className="panel question-review-card"
        data-testid="extracted-question"
        aria-label={`Questão ${number}`}
      >
        <div className="question-card-heading">
          <h2>Bloco extraído precisa ser separado novamente</h2>
        </div>
        <div className="question-card-body">
          <p role="alert">
            Esta extração anterior contém {q.options.length} alternativas e pode ter juntado várias
            questões. Use “Extrair novamente” para reprocessar o documento com a separação
            corrigida.
          </p>
          <Button variant="outline" onClick={onOriginal}>
            Ver documento original
          </Button>
        </div>
      </article>
    );
  const imageOption = (o: string) =>
    q.optionsType === "IMAGEM" && safeImageUrl(o)
      ? `<img src="${escapeHtml(o)}" alt="Alternativa">`
      : o;
  return (
    <article
      className={`panel question-review-card ${approved ? "approved" : ""}`}
      data-testid="extracted-question"
      aria-label={`Questão ${number}`}
    >
      <div className="question-card-heading">
        <span className="question-number">{number}</span>
        <div className="grow">
          <h2>Questão {number}</h2>
          <p className="subtext">
            {q.source} · Página {q.page || 1}
          </p>
        </div>
        <span className={`badge ${approved ? "success" : errors.length ? "warning" : "success"}`}>
          {approved ? "Aprovada" : errors.length ? "Precisa de revisão" : "Pronta para aprovar"}
        </span>
      </div>
      <div className="question-card-body">
        {editing ? (
          <label className="field">
            Enunciado
            <textarea
              aria-label={`Enunciado da questão ${number}`}
              className="control"
              value={q.text}
              rows={4}
              onChange={(e) => onChange({ ...q, text: e.target.value })}
            />
          </label>
        ) : (
          <RichPreview value={q.text} format={q.contentFormat} />
        )}
        {q.image && (
          <RichPreview
            value={`<img src="${escapeHtml(q.image)}" alt="Imagem da questão">`}
            format="HTML"
          />
        )}
        <div className="question-options">
          {q.options.map((option, i) => (
            <div className={`question-option ${q.answer === i ? "correct" : ""}`} key={i}>
              <label className="question-option-label">
                <input
                  type="radio"
                  name={`answer-${q.id}`}
                  aria-label={`Questão ${number}, gabarito ${String.fromCharCode(65 + i)}`}
                  disabled={approved}
                  checked={q.answer === i}
                  onChange={() => onChange({ ...q, answer: i, answerSource: "professor" })}
                />
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <div className="grow">
                  <RichPreview
                    value={imageOption(option)}
                    format={q.optionsType === "IMAGEM" ? "HTML" : q.contentFormat}
                  />
                </div>
                {q.answer === i && <span className="answer-mark">Gabarito</span>}
              </label>
              {editing && (
                <textarea
                  aria-label={`Questão ${number}, alternativa ${String.fromCharCode(65 + i)}`}
                  className="control"
                  value={option}
                  onChange={(e) =>
                    onChange({
                      ...q,
                      options: q.options.map((o, j) => (i === j ? e.target.value : o)),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>
        <div className="question-classification">
          {[q.subject, q.year, q.topic, q.bncc || q.skill, q.saebDescriptor]
            .filter(Boolean)
            .map((value, i) => (
              <span key={i} className="badge neutral">
                {value}
              </span>
            ))}
        </div>
        {!approved && errors.length > 0 && (
          <div className="question-pending">
            <strong>
              {errors.length} {errors.length === 1 ? "pendência" : "pendências"}
            </strong>
            <details>
              <summary>Ver o que falta</summary>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
        <div className="question-card-actions">
          <span className="subtext">
            {q.answer < 0
              ? "Gabarito não informado"
              : q.answerSource === "documento"
                ? "Gabarito encontrado no documento"
                : q.answerSource === "arquivo estruturado"
                  ? "Gabarito importado do arquivo"
                  : "Gabarito definido na revisão"}
          </span>
          <div className="action-row">
            {approved ? (
              <Button variant="outline" size="sm" onClick={onReopen}>
                Reabrir revisão
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
                  {editing ? "Concluir edição" : "Editar conteúdo"}
                </Button>
                <Button variant="outline" size="sm" onClick={onDetails}>
                  Ajustar detalhes
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onOriginal}>
              Ver original
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
