import { BnccSelector } from "./bncc-selector";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "./ui";
import { difficulties, pedagogicalTypes } from "./mentary-contract";
import type { CommonFields } from "./batch-review";
export function BatchSettings({
  values,
  onChange,
  onApply,
  onKey,
  count,
}: {
  values: CommonFields;
  onChange: (v: CommonFields) => void;
  onApply: (overwrite: boolean) => void;
  onKey: (value: string, overwrite: boolean) => void;
  count: number;
}) {
  const [key, setKey] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const input = (field: keyof CommonFields, label: string, placeholder = "") => (
    <label className="field">
      {label}
      <input
        aria-label={label}
        className="control"
        value={values[field] || ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...values, [field]: e.target.value })}
      />
    </label>
  );
  return (
    <section className="panel batch-settings">
      <div className="panel-head">
        <div>
          <h2>Preencha uma vez para o documento</h2>
          <p>
            Os dados encontrados no arquivo são aproveitados. Complete aqui o que for comum às{" "}
            {count} questões.
          </p>
        </div>
      </div>
      <div className="p-5 grid gap-4">
        <div className="grid-three">
          {input("subject", "Disciplina", "Ex.: Matemática")}
          {input("year", "Ano ou etapa", "Ex.: 5º ano")}
          {input("topic", "Tema ou conteúdo comum", "Ex.: Operações e frações")}
        </div>
        <BnccSelector
          label="Habilidades BNCC comuns"
          value={values.bncc || ""}
          subject={values.subject}
          year={values.year}
          onChange={(bncc) => onChange({ ...values, bncc })}
        />
        <details>
          <summary>Classificação pedagógica em lote</summary>
          <div className="form-grid mt-4">
            {input("saebDescriptor", "Descritor SAEB comum", "D19")}
            {input(
              "saebMatrix",
              "Matriz SAEB utilizada (opcional)",
              "Versão da matriz de referência",
            )}
            <label className="field">
              Dificuldade comum
              <SelectField
                label="Dificuldade comum"
                value={values.difficulty}
                onChange={(v) => onChange({ ...values, difficulty: v })}
                all="Manter dificuldades individuais"
                options={difficulties}
              />
            </label>
            <label className="field">
              Tipo pedagógico comum
              <SelectField
                label="Tipo pedagógico comum"
                value={values.pedagogicalType || ""}
                onChange={(v) => onChange({ ...values, pedagogicalType: v })}
                all="Manter tipos individuais"
                options={pedagogicalTypes}
              />
            </label>
          </div>
        </details>
        <div className="action-row">
          <Button variant="outline" onClick={() => onApply(overwrite)}>
            Aplicar às questões pendentes
          </Button>
          <label className="flex gap-2 items-center text-xs">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Substituir também os dados já preenchidos
          </label>
        </div>
        <details className="batch-answer-key">
          <summary>Colar gabarito de várias questões</summary>
          <div className="grid gap-3 mt-3">
            <p className="subtext">
              Se o documento já contém um gabarito explícito, ele é lido automaticamente. Caso
              contrário, cole o seu aqui ou marque as respostas nos cartões.
            </p>
            <textarea
              aria-label="Gabarito do documento"
              className="control"
              rows={2}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="1-C, 2-C, 3-B, 4-B, 5-C, 6-A"
            />
            <Button variant="outline" disabled={!key.trim()} onClick={() => onKey(key, overwrite)}>
              Preencher gabarito em lote
            </Button>
          </div>
        </details>
      </div>
    </section>
  );
}
