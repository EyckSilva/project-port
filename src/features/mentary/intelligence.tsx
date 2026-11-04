import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Download, Printer, Target, Users, ClipboardList, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMentary } from "./store";
import { aggregate, attention, type Application, type Response } from "./results";
import { skills, subjects, downloadCsv } from "./data";
import { PageHeading, Panel, Metric, Badge, SelectField, Empty, Modal } from "./ui";

const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("pt-BR")}%`);
export function Intelligence({
  report = false,
  individual = false,
}: {
  report?: boolean;
  individual?: boolean;
}) {
  const { state, update, log } = useMentary();
  const [application, setApplication] = useState(state.applications.at(-1)?.id || "");
  const [baseline, setBaseline] = useState(state.applications[0]?.id || "");
  const [school, setSchool] = useState("");
  const [room, setRoom] = useState("");
  const [subject, setSubject] = useState("");
  const [student, setStudent] = useState("");
  const [year, setYear] = useState("");
  const [group, setGroup] = useState(individual ? "Estudantes" : "Descritores");
  const [compared, setCompared] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [importError, setImportError] = useState("");
  const chosen = state.applications.find((a) => a.id === application);
  const allowedClasses = state.classes.filter(
    (c) => state.profile !== "Professora" || c.teacher === state.settings.name,
  );
  const allowedIds = new Set(allowedClasses.map((c) => c.id));
  const scoped = (rows: Response[]) =>
    rows.filter(
      (r) =>
        allowedIds.has(r.classId) &&
        (!compared.length ||
          (group === "Escolas"
            ? compared.includes(r.schoolId)
            : group === "Turmas"
              ? compared.includes(r.classId)
              : true)) &&
        (!school || r.schoolId === school) &&
        (!room || r.classId === room) &&
        (!student || r.studentId === student) &&
        (!subject || state.questions.find((q) => q.id === r.questionId)?.subject === subject) &&
        (!year || state.questions.find((q) => q.id === r.questionId)?.year === year),
    );
  const responses = scoped(chosen?.responses || []);
  const previous = scoped(state.applications.find((a) => a.id === baseline)?.responses || []);
  const totals = aggregate(responses, state.questions);
  const eligible = state.students.filter(
    (s) =>
      allowedIds.has(s.classId) &&
      (!room || s.classId === room) &&
      (!student || s.id === student) &&
      (!school || state.classes.find((c) => c.id === s.classId)?.schoolId === school) &&
      (!compared.length ||
        (group === "Escolas"
          ? compared.includes(state.classes.find((c) => c.id === s.classId)?.schoolId || "")
          : group === "Turmas"
            ? compared.includes(s.classId)
            : true)),
  ).length;
  const before = aggregate(previous, state.questions);
  const groups =
    group === "Escolas"
      ? state.schools.map((s) => ({
          id: s.id,
          label: s.name,
          description: "Escola",
          matches: (r: Response) => r.schoolId === s.id,
        }))
      : group === "Turmas"
        ? allowedClasses.map((c) => ({
            id: c.id,
            label: c.name,
            description: state.schools.find((s) => s.id === c.schoolId)?.name || "",
            matches: (r: Response) => r.classId === c.id,
          }))
        : group === "Estudantes"
          ? state.students
              .filter((s) => allowedIds.has(s.classId))
              .map((s) => ({
                id: s.id,
                label: s.name,
                description: state.classes.find((c) => c.id === s.classId)?.name || "",
                matches: (r: Response) => r.studentId === s.id,
              }))
          : skills
              .filter((s) => (!subject || s.subject === subject) && (!year || s.year === year))
              .map((s) => ({
                id: s.id,
                label: group === "Habilidades" ? s.id : s.descriptor,
                description: `${s.name} · ${s.subject} · ${s.year}`,
                matches: (r: Response) =>
                  state.questions.find((q) => q.id === r.questionId)?.skill === s.id,
              }));
  const rows = groups
    .map((g) => ({
      ...g,
      ...aggregate(responses.filter(g.matches), state.questions),
      before: aggregate(previous.filter(g.matches), state.questions).score,
    }))
    .filter((g) => g.count > 0 && (!compared.length || compared.includes(g.id)));
  const headers = [
    "Código / nome",
    "Descrição",
    "Aplicação",
    "Comparação",
    "Estudantes",
    "Questões",
    "Respostas",
    "Acertos %",
    "Erros %",
    "Omissões %",
    "Tempo médio (s)",
    "Nível",
    "Anterior %",
    "Variação p.p.",
  ];
  const exportReport = () => {
    downloadCsv("mentary-resultados.csv", [
      headers,
      ...rows.map((r) => [
        r.label,
        r.description,
        chosen?.name || "",
        state.applications.find((a) => a.id === baseline)?.name || "",
        r.students,
        r.questions,
        r.count,
        r.score ?? "",
        r.errorRate ?? "",
        r.omissionRate ?? "",
        r.seconds ?? "",
        attention(r.score, state.thresholds),
        r.before ?? "",
        r.score !== null && r.before !== null ? Number((r.score - r.before).toFixed(1)) : "",
      ]),
    ]);
    log(`Relatório exportado: ${group}; aplicação ${application}; ${rows.length} linhas`);
  };
  const importApplication = async (file?: File) => {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > 5 * 1024 * 1024) throw Error("Arquivo deve ter até 5 MB.");
      const data = JSON.parse(await file.text()) as Application;
      if (
        !data.name?.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
        !Array.isArray(data.responses) ||
        !data.responses.length
      )
        throw Error("Informe name, date (AAAA-MM-DD) e responses não vazio.");
      const seen = new Set<string>();
      for (const [i, r] of data.responses.entries()) {
        const s = state.students.find((s) => s.id === r.studentId),
          q = state.questions.find((q) => q.id === r.questionId),
          c = state.classes.find((c) => c.id === r.classId);
        if (
          !s ||
          !q ||
          !c ||
          s.classId !== c.id ||
          c.schoolId !== r.schoolId ||
          !Number.isFinite(r.seconds) ||
          r.seconds < 0 ||
          !(
            r.answer === null ||
            (Number.isInteger(r.answer) && r.answer >= 0 && r.answer < q.options.length)
          )
        )
          throw Error(
            `Resposta ${i + 1}: estudante, turma, escola, questão, alternativa ou tempo inválido.`,
          );
        const key = `${r.studentId}/${r.questionId}`;
        if (seen.has(key)) throw Error(`Resposta ${i + 1}: estudante/questão duplicado.`);
        seen.add(key);
      }
      const app = { ...data, id: crypto.randomUUID() };
      update((s) => ({ ...s, applications: [...s.applications, app] }));
      setApplication(app.id);
      log(`Aplicação importada: ${app.name}`);
      toast.success("Resultados importados; indicadores recalculados.");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  };
  const selected = rows.find((r) => r.id === detail);
  return (
    <div className="page">
      <PageHeading
        title={
          report
            ? "Relatórios de aprendizagem"
            : individual
              ? "Desempenho individual"
              : "Inteligência avaliativa"
        }
        description="Resultados calculados a partir das respostas locais. Use os mesmos filtros para gráficos, tabelas e exportação."
      >
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Imprimir / PDF
        </Button>
        <Button onClick={exportReport} disabled={!rows.length}>
          <Download />
          Exportar CSV
        </Button>
      </PageHeading>
      <div className="filter-bar no-print">
        <SelectField
          label="Aplicação atual"
          value={application}
          onChange={setApplication}
          options={state.applications.map((a) => ({ value: a.id, label: a.name }))}
        />
        <SelectField
          label="Aplicação de comparação"
          value={baseline}
          onChange={setBaseline}
          all="Sem comparação"
          options={state.applications.map((a) => ({ value: a.id, label: a.name }))}
        />
        <SelectField
          label="Escola"
          value={school}
          onChange={(v) => {
            setSchool(v);
            setRoom("");
            setStudent("");
          }}
          all="Todas as escolas"
          options={state.schools.map((s) => ({ value: s.id, label: s.name }))}
        />
        <SelectField
          label="Turma"
          value={room}
          onChange={(v) => {
            setRoom(v);
            setStudent("");
          }}
          all="Todas as turmas"
          options={allowedClasses
            .filter((c) => !school || c.schoolId === school)
            .map((c) => ({ value: c.id, label: c.name }))}
        />
        <SelectField
          label="Componente curricular"
          value={subject}
          onChange={setSubject}
          all="Todos os componentes"
          options={subjects}
        />
        <SelectField
          label="Ano escolar"
          value={year}
          onChange={setYear}
          all="Todos os anos"
          options={["5º ano", "6º ano"]}
        />
        <SelectField
          label="Estudante"
          value={student}
          onChange={setStudent}
          all="Todos os estudantes"
          options={state.students
            .filter((s) => allowedIds.has(s.classId) && (!room || s.classId === room))
            .map((s) => ({ value: s.id, label: s.name }))}
        />
        <SelectField
          label="Agrupar resultados"
          value={group}
          onChange={(v) => {
            setGroup(v);
            setCompared([]);
          }}
          options={["Descritores", "Habilidades", "Estudantes", "Turmas", "Escolas"]}
        />
      </div>
      <div className="metrics">
        <Metric
          title="Acertos"
          value={pct(totals.score)}
          icon={Target}
          note={`${totals.correct} de ${totals.count} respostas`}
        />
        <Metric
          title="Estudantes avaliados"
          value={totals.students}
          icon={Users}
          note={`${eligible ? Math.round((100 * totals.students) / eligible) : 0}% participação · ${totals.questions} questões`}
        />
        <Metric
          title="Omissões"
          value={pct(totals.omissionRate)}
          icon={ClipboardList}
          note={`${totals.omissions} respostas em branco`}
        />
        <Metric
          title="Tempo por questão"
          value={totals.seconds === null ? "—" : `${totals.seconds}s`}
          icon={Clock}
          note={
            totals.score !== null && before.score !== null
              ? `${(totals.score - before.score).toFixed(1)} p.p. entre aplicações`
              : "Sem base para comparação"
          }
        />
      </div>
      {totals.students > 0 && totals.students < state.thresholds.minimumSample && (
        <p className="notice mb-5">
          Amostra pequena: {totals.students} estudantes. Interprete os indicadores com cautela.
        </p>
      )}
      {(group === "Escolas" || group === "Turmas") && (
        <Panel title={`Selecionar ${group.toLowerCase()} para comparação`} className="mb-5">
          <div className="p-5 flex flex-wrap gap-4">
            {groups.map((g) => (
              <label key={g.id} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={compared.includes(g.id)}
                  onChange={(e) =>
                    setCompared(
                      e.target.checked ? [...compared, g.id] : compared.filter((x) => x !== g.id),
                    )
                  }
                />
                {g.label}
              </label>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setCompared([])}>
              Mostrar todas
            </Button>
          </div>
        </Panel>
      )}
      <Panel
        title="Comparação de desempenho"
        description="Percentual de acertos atual e anterior. Os valores completos estão na tabela abaixo."
      >
        <div className="p-5" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows.map((r) => ({ name: r.label, Atual: r.score, Anterior: r.before }))}
            >
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar name="Atual (%)" dataKey="Atual" fill="#332389" />
              <Bar name="Anterior (%)" dataKey="Anterior" fill="#b7a5ec" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel
        title={`Resultados por ${group.toLowerCase()}`}
        className="mt-5"
        description={`${chosen?.name || "Sem aplicação"} · ${chosen?.date || ""}. Clique no nome para consultar questões e evidências.`}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Nome / código",
                  "Descrição",
                  "Estudantes / respostas",
                  "Questões",
                  "Acertos",
                  "Erros",
                  "Omissões",
                  "Tempo médio",
                  "Anterior",
                  "Variação",
                  "Atenção",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta =
                  r.score !== null && r.before !== null
                    ? Number((r.score - r.before).toFixed(1))
                    : null;
                return (
                  <tr key={r.id}>
                    <td>
                      <Button variant="link" onClick={() => setDetail(r.id)}>
                        {r.label}
                      </Button>
                    </td>
                    <td>{r.description}</td>
                    <td>
                      {r.students} / {r.count}
                      {r.students < state.thresholds.minimumSample && (
                        <p className="subtext">Amostra pequena</p>
                      )}
                    </td>
                    <td>{r.questions}</td>
                    <td>{pct(r.score)}</td>
                    <td>{pct(r.errorRate)}</td>
                    <td>{pct(r.omissionRate)}</td>
                    <td>{r.seconds ?? "—"} s</td>
                    <td>{pct(r.before)}</td>
                    <td>
                      {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta} p.p.`}
                      {delta !== null && delta <= -state.thresholds.drop && (
                        <p className="text-destructive">Alerta: queda significativa</p>
                      )}
                    </td>
                    <td>
                      <Badge>{attention(r.score, state.thresholds)}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <Empty text="Nenhuma resposta registrada para os filtros selecionados." />
          )}
        </div>
      </Panel>
      <Panel title="Distribuição por faixa de desempenho" className="mt-5">
        <div className="p-5 flex flex-wrap gap-4">
          {["Crítico", "Atenção", "Intermediário", "Adequado"].map((level) => {
            const students = state.students.filter(
              (s) =>
                attention(
                  aggregate(
                    responses.filter((r) => r.studentId === s.id),
                    state.questions,
                  ).score,
                  state.thresholds,
                ) === level,
            );
            return (
              <span key={level} className="badge">
                {level}: {students.length} estudantes
              </span>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="Importar resultados de uma aplicação"
        className="mt-5 no-print"
        description="JSON local validado; não envia dados a serviços externos."
      >
        <div className="p-5 grid gap-3">
          <input
            aria-label="Importar resultados JSON"
            type="file"
            accept=".json"
            onChange={(e) => {
              void importApplication(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="subtext">
            Campos: name, date, responses: [studentId, classId, schoolId, questionId, answer (índice
            ou null), seconds].
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(state.applications[0], null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "modelo-resultados.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Baixar exemplo JSON
          </Button>
          {importError && (
            <p role="alert" className="text-destructive">
              {importError}
            </p>
          )}
        </div>
      </Panel>
      <Modal
        open={Boolean(selected)}
        onClose={() => setDetail("")}
        title={selected?.label || "Resultados"}
        description="Questões associadas e evidências de dificuldade."
      >
        {selected &&
          state.questions
            .filter((q) => responses.some((r) => r.questionId === q.id && selected.matches(r)))
            .map((q) => {
              const rs = responses.filter((r) => r.questionId === q.id && selected.matches(r));
              const a = aggregate(rs, state.questions);
              const alternatives = q.options.map((o, i) => ({
                text: o,
                count: rs.filter((r) => r.answer === i).length,
              }));
              return (
                <div className="border-b py-4" key={q.id}>
                  <strong>
                    {q.id} · {q.skill} · {skills.find((s) => s.id === q.skill)?.descriptor}
                  </strong>
                  <p className="my-3">{q.text}</p>
                  <p className="subtext">
                    {pct(a.score)} acertos · {pct(a.omissionRate)} omissões · {a.students}{" "}
                    estudantes · {a.seconds}s
                  </p>
                  {alternatives.map((a, i) => (
                    <p key={i} className="subtext">
                      {String.fromCharCode(65 + i)}. {a.text}: {a.count} respostas{" "}
                      {q.answer === i ? "(gabarito)" : ""}
                    </p>
                  ))}
                  {a.students >= state.thresholds.minimumSample &&
                    ((a.score !== null && (a.score < 20 || a.score > 95)) ||
                      (a.omissionRate !== null && a.omissionRate > 20)) && (
                      <p className="notice">
                        Possível necessidade de revisão pedagógica. Confira enunciado, gabarito e
                        distratores.
                      </p>
                    )}
                </div>
              );
            })}
      </Modal>
    </div>
  );
}
