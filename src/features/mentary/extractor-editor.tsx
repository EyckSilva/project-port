import { BnccSelector } from "./bncc-selector";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { subjects, type Question } from "./data";
import { questionTypes, difficulties, pedagogicalTypes } from "./mentary-contract";
import { saveLocalImage, escapeHtml, toHtml, safeImageUrl } from "./content";
import { RichPreview } from "./rich-preview";
import { SelectField } from "./ui";

export function ExtractorEditor({
  question: q,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const [formula, setFormula] = useState("");
  const [busy, setBusy] = useState(false);
  const currentId = useRef(q.id);
  currentId.current = q.id;
  const change = (patch: Partial<Question>) => onChange({ ...q, contractVersion: 1, ...patch });
  const upload = async (file: File | undefined, option?: number) => {
    if (!file) return;
    const id = q.id;
    setBusy(true);
    try {
      const url = await saveLocalImage(file);
      if (currentId.current !== id) return;
      if (option === undefined) change({ image: url });
      else change({ options: q.options.map((v, i) => (i === option ? url : v)) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar a imagem.");
    } finally {
      setBusy(false);
    }
  };
  const optionPreview = (o: string) =>
    q.optionsType === "IMAGEM" && safeImageUrl(o)
      ? `<img src="${escapeHtml(o)}" alt="Alternativa">`
      : o;
  return (
    <>
      <div className="form-grid">
        <label className="field">
          Página de origem
          <input
            type="number"
            min="1"
            className="control"
            value={q.page || 1}
            onChange={(e) => change({ page: Math.max(1, Number(e.target.value)) })}
          />
        </label>
        <label className="field">
          Tipo de questão
          <SelectField
            label="Tipo de questão"
            value={q.questionType || "MULTIPLA ESCOLHA"}
            onChange={(v) => {
              if (
                window.confirm(
                  "Alterar o tipo redefine as alternativas e limpa o gabarito. Continuar?",
                )
              )
                change({
                  questionType: v as Question["questionType"],
                  options: v === "VERDADEIRO OU FALSO" ? ["Verdadeiro", "Falso"] : ["", "", "", ""],
                  optionsType: "TEXTO",
                  answer: -1,
                });
            }}
            options={[...questionTypes]}
          />
        </label>
      </div>
      <label className="field">
        Formato do conteúdo
        <SelectField
          label="Formato do conteúdo"
          value={q.contentFormat || "TEXT"}
          onChange={(v) => {
            if (v === "TEXT" && q.contentFormat === "HTML")
              toast.info("As marcações HTML serão tratadas como texto. Revise o conteúdo.");
            change({ contentFormat: v as "TEXT" | "HTML" });
          }}
          options={[
            { value: "TEXT", label: "Texto simples" },
            { value: "HTML", label: "HTML com imagens e fórmulas" },
          ]}
        />
      </label>
      <label className="field">
        Enunciado
        <textarea
          aria-label="Enunciado"
          className="control"
          rows={5}
          value={q.text}
          onChange={(e) => change({ text: e.target.value })}
        />
      </label>
      <div className="field">
        Fórmula no enunciado
        <div className="flex gap-2">
          <input
            aria-label="Fórmula LaTeX"
            className="control"
            placeholder="Ex.: \frac{3}{8}"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={!formula.trim()}
            onClick={() => {
              change({
                text:
                  toHtml(q.text, q.contentFormat) +
                  `<p><span data-latex="${escapeHtml(formula)}"></span></p>`,
                contentFormat: "HTML",
              });
              setFormula("");
            }}
          >
            Inserir fórmula
          </Button>
        </div>
      </div>
      <div className="preview-box">
        <strong>Prévia do enunciado</strong>
        <RichPreview value={q.text} format={q.contentFormat} />
        {q.image && (
          <RichPreview
            value={`<img src="${escapeHtml(q.image)}" alt="Imagem da questão">`}
            format="HTML"
          />
        )}
      </div>
      <label className="field">
        Imagem do enunciado (JPG, PNG, WEBP ou AVIF; até 5 MB)
        <input
          aria-label="Imagem do enunciado"
          type="file"
          disabled={busy}
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {q.image && (
        <div className="action-row">
          <span className="subtext">
            {q.image.startsWith("local-media:") || q.image.startsWith("data:")
              ? "Imagem local; upload ao servidor pendente."
              : "Imagem por URL pública."}
          </span>
          <Button variant="ghost" onClick={() => change({ image: undefined })}>
            Remover imagem
          </Button>
        </div>
      )}
      <details>
        <summary>Usar imagem por URL pública</summary>
        <label className="field mt-3">
          URL HTTPS
          <input
            aria-label="URL pública da imagem"
            className="control"
            type="url"
            placeholder="https://…"
            value={q.image?.startsWith("https://") ? q.image : ""}
            onChange={(e) => change({ image: e.target.value || undefined })}
          />
        </label>
      </details>
      <label className="field">
        Formato das alternativas
        <SelectField
          label="Formato das alternativas"
          value={q.optionsType || "TEXTO"}
          onChange={(v) => {
            if (
              window.confirm(
                "Alterar o formato remove as alternativas atuais e limpa o gabarito. Continuar?",
              )
            )
              change({
                optionsType: v as Question["optionsType"],
                options: q.options.map(() => ""),
                answer: -1,
              });
          }}
          options={["TEXTO", "IMAGEM"]}
        />
      </label>
      <fieldset className="grid gap-3">
        <legend>Alternativas e gabarito</legend>
        {q.options.map((o, i) => (
          <div key={i} className="option-editor">
            <div className="flex gap-2 items-start">
              <label className="flex gap-2 items-center pt-2">
                <input
                  type="radio"
                  name={`answer-${q.id}`}
                  aria-label={`Gabarito ${String.fromCharCode(65 + i)}`}
                  checked={q.answer === i}
                  onChange={() => change({ answer: i })}
                />
                <strong>{String.fromCharCode(65 + i)}</strong>
              </label>
              <textarea
                aria-label={`Alternativa ${String.fromCharCode(65 + i)}`}
                className="control"
                rows={2}
                value={o.startsWith("local-media:") ? "Imagem local selecionada" : o}
                readOnly={o.startsWith("local-media:")}
                placeholder={
                  q.optionsType === "IMAGEM"
                    ? "URL pública HTTPS ou envie uma imagem"
                    : "Texto ou HTML, conforme o formato selecionado"
                }
                onChange={(e) =>
                  change({ options: q.options.map((v, j) => (i === j ? e.target.value : v)) })
                }
              />
              <Button
                variant="ghost"
                disabled={q.options.length <= 2 || q.questionType === "VERDADEIRO OU FALSO"}
                onClick={() => change({ options: q.options.filter((_, j) => j !== i), answer: -1 })}
              >
                Remover
              </Button>
            </div>
            {q.optionsType === "IMAGEM" && (
              <input
                aria-label={`Imagem da alternativa ${String.fromCharCode(65 + i)}`}
                type="file"
                disabled={busy}
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => {
                  void upload(e.target.files?.[0], i);
                  e.target.value = "";
                }}
              />
            )}
            <RichPreview
              value={optionPreview(o)}
              format={q.optionsType === "IMAGEM" ? "HTML" : q.contentFormat}
            />
          </div>
        ))}
      </fieldset>
      <Button
        variant="outline"
        disabled={q.options.length >= 5 || q.questionType === "VERDADEIRO OU FALSO"}
        onClick={() => change({ options: [...q.options, ""] })}
      >
        Adicionar alternativa
      </Button>
      <div className="form-grid">
        <label className="field">
          Componente curricular
          <input
            aria-label="Disciplina da revisão"
            className="control"
            list="extractor-subjects"
            value={q.subject}
            onChange={(e) => change({ subject: e.target.value })}
          />
          <datalist id="extractor-subjects">
            {[
              ...subjects,
              "História",
              "Geografia",
              "Arte",
              "Educação Física",
              "Língua Inglesa",
              "Biologia",
              "Química",
              "Física",
            ].map((subject) => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Ano ou etapa
          <input
            className="control"
            aria-label="Ano da revisão"
            value={q.year}
            onChange={(e) => change({ year: e.target.value })}
            placeholder="Ex.: 5º ano"
          />
        </label>
      </div>
      <BnccSelector
        value={q.bncc ?? q.skill}
        subject={q.subject}
        year={q.year}
        onChange={(bncc) => change({ bncc, skill: bncc.split(",")[0]?.trim() || "" })}
      />
      <div className="form-grid">
        <label className="field">
          Descritor SAEB
          <input
            aria-label="Descritor SAEB"
            className="control"
            value={q.saebDescriptor || ""}
            placeholder="Ex.: D19"
            onChange={(e) => change({ saebDescriptor: e.target.value })}
          />
        </label>
        <label className="field">
          Versão da matriz SAEB
          <input
            aria-label="Versão da matriz SAEB"
            className="control"
            value={q.saebMatrix || ""}
            placeholder="Informe a matriz de referência utilizada"
            onChange={(e) => change({ saebMatrix: e.target.value })}
          />
        </label>
        <label className="field">
          Dificuldade
          <SelectField
            label="Dificuldade da revisão"
            value={q.difficulty}
            onChange={(v) => change({ difficulty: v })}
            options={difficulties}
          />
        </label>
        <label className="field">
          Tipo pedagógico
          <SelectField
            label="Tipo pedagógico"
            value={q.pedagogicalType || ""}
            onChange={(v) => change({ pedagogicalType: v })}
            all="Selecione o tipo pedagógico"
            options={pedagogicalTypes}
          />
        </label>
      </div>
      <label className="field">
        Tema ou conteúdo
        <input
          aria-label="Tema ou conteúdo"
          className="control"
          value={q.topic || ""}
          onChange={(e) => change({ topic: e.target.value })}
        />
      </label>
      <p className="subtext">
        Confira a matriz de referência do SAEB utilizada pela sua instituição. Um descritor deve ser
        interpretado junto da disciplina, etapa e versão da matriz.
      </p>
      <label className="field">
        Justificativa do gabarito (opcional)
        <textarea
          aria-label="Justificativa do gabarito"
          className="control"
          value={q.reason}
          onChange={(e) => change({ reason: e.target.value })}
        />
      </label>
      <details>
        <summary>Recurso de Realidade Aumentada (opcional)</summary>
        <label className="field mt-3">
          Identificador do recurso
          <input
            aria-label="Recurso de Realidade Aumentada"
            className="control"
            value={q.arGalleryId || ""}
            onChange={(e) => change({ arGalleryId: e.target.value || undefined })}
            placeholder="UUID do recurso disponível na Mentary"
          />
        </label>
      </details>
    </>
  );
}
