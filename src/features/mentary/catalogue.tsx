import { useState } from "react";
import { useMentary } from "./store";
import { skills, subjects } from "./data";
import { aggregate, attention } from "./results";
import { PageHeading, Panel, SearchField, SelectField, Badge, Empty } from "./ui";
export function Catalogue() {
  const { state } = useMentary();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const rows = skills.filter(
    (s) =>
      (!subject || s.subject === subject) &&
      (!year || s.year === year) &&
      `${s.id} ${s.descriptor} ${s.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeading
        title="Habilidades BNCC e descritores SAEB"
        description="Catálogo de demonstração compartilhado pela revisão, pelo construtor e pelos relatórios. A base oficial deve ser fornecida pela Mentary."
      />
      <div className="filter-bar">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar código, descrição ou descritor"
        />
        <SelectField
          label="Componente do catálogo"
          value={subject}
          onChange={setSubject}
          all="Todos os componentes"
          options={subjects}
        />
        <SelectField
          label="Etapa do catálogo"
          value={year}
          onChange={setYear}
          all="Todas as etapas"
          options={["5º ano", "6º ano"]}
        />
      </div>
      <Panel title="Referências e resultados da última aplicação">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Habilidade",
                  "Descritor",
                  "Descrição",
                  "Componente",
                  "Etapa",
                  "Questões",
                  "Estudantes",
                  "Acertos",
                  "Atenção",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const qids = state.questions.filter((q) => q.skill === s.id).map((q) => q.id);
                const metric = aggregate(
                  state.applications.at(-1)?.responses.filter((r) => qids.includes(r.questionId)) ||
                    [],
                  state.questions,
                );
                return (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.descriptor}</td>
                    <td>{s.name}</td>
                    <td>{s.subject}</td>
                    <td>{s.year}</td>
                    <td>{qids.length}</td>
                    <td>{metric.students}</td>
                    <td>{metric.score === null ? "Sem dados" : `${metric.score}%`}</td>
                    <td>
                      <Badge>{attention(metric.score, state.thresholds)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
      </Panel>
    </div>
  );
}
