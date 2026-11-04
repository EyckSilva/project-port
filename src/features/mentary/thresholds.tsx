import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMentary } from "./store";
import { Panel } from "./ui";
export function ThresholdSettings() {
  const { state, update, log } = useMentary();
  const [values, setValues] = useState(state.thresholds);
  if (state.profile !== "Administrador") return null;
  return (
    <Panel
      title="Faixas de desempenho e alertas"
      className="mb-5"
      description="Limites superiores exclusivos para crítico e atenção; adequado a partir do terceiro limite."
    >
      <form
        className="p-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!(
            values.critical > 0 &&
            values.critical < values.attention &&
            values.attention < values.adequate &&
            values.adequate <= 100 &&
            values.minimumSample >= 1 &&
            values.drop > 0 &&
            values.drop <= 100
          )) {
            toast.error(
              "Use faixas crescentes entre 0 e 100, amostra mínima positiva e queda de 1 a 100.",
            );
            return;
          }
          update((s) => ({ ...s, thresholds: values }));
          log("Faixas de desempenho e limiares de alertas atualizados");
          toast.success("Indicadores recalculados com as novas faixas.");
        }}
      >
        <div className="form-grid">
          {(
            [
              ["critical", "Crítico abaixo de (%)"],
              ["attention", "Atenção abaixo de (%)"],
              ["adequate", "Adequado a partir de (%)"],
              ["drop", "Alerta de queda (p.p.)"],
              ["minimumSample", "Amostra mínima (estudantes)"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input
                required
                className="control"
                type="number"
                min="1"
                max={key === "minimumSample" ? 10000 : 100}
                value={values[key]}
                onChange={(e) => setValues({ ...values, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <Button type="submit">Salvar faixas</Button>
      </form>
    </Panel>
  );
}
