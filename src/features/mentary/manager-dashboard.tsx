import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  BarChart as BarIcon,
  LineChart as LineIcon,
  AlertTriangle,
  School,
  Users,
  ClipboardList,
  FileText,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Eye,
  Check,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PageHeading, Panel, Metric, Badge, Progress, Empty } from "@/features/mentary/ui";
import { useMentary } from "@/features/mentary/store";
import {
  initialApplications,
  aggregate,
  attention,
  defaultThresholds,
  type Application,
  type Response,
} from "@/features/mentary/results";
import {
  initialQuestions,
  initialClasses,
  initialStudents,
  initialAssessments,
  initialPlans,
  skills,
  subjects,
  mean,
  type Question,
  type ClassRoom,
  type Student,
} from "@/features/mentary/data";

const CRITICAL = "Crítico";
const ATTENTION = "Atenção";
const INTERMEDIATE = "Intermediário";
const ADEQUATE = "Adequado";

function faixa(score: number | null) {
  return attention(score, defaultThresholds);
}

function faixaTone(score: number | null) {
  const f = faixa(score);
  if (f === CRITICAL) return "danger";
  if (f === ATTENTION) return "warning";
  if (f === ADEQUATE) return "success";
  return "";
}

function faixaLabel(score: number | null) {
  if (score === null) return "Sem dados";
  return faixa(score);
}

function pct(n: number, d: number) {
  return d ? Math.round((1000 * n) / d) / 10 : 0;
}

function fmtTime(seconds: number | null) {
  if (seconds === null) return "—";
  return `${Math.round(seconds)}s`;
}

function qsMap(questions: Question[]) {
  return new Map(questions.map((q) => [q.id, q]));
}

function skillOf(questions: Question[], questionId: string) {
  return questions.find((q) => q.id === questionId)?.skill;
}

function descriptorOf(skillId: string | undefined) {
  if (!skillId) return "—";
  return skills.find((s) => s.id === skillId)?.descriptor ?? skillId;
}

function subjectOf(skillId: string | undefined) {
  if (!skillId) return "—";
  return skills.find((s) => s.id === skillId)?.subject ?? "—";
}

function subjectColor(subject: string) {
  switch (subject) {
    case "Matemática":
      return "#332389";
    case "Língua Portuguesa":
      return "#00b6d7";
    default:
      return "#8c7be8";
  }
}

function allResponses(state: ReturnType<typeof useMentary>["state"]) {
  return state.applications.flatMap((a) => a.responses);
}

function responsesFor(
  responses: Response[],
  questions: Question[],
  predicate: (q: Question) => boolean,
) {
  const qs = qsMap(questions);
  return responses.filter((r) => {
    const q = qs.get(r.questionId);
    return q ? predicate(q) : false;
  });
}

function QuestionDrawer({
  open,
  onClose,
  title,
  responses,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  responses: Response[];
}) {
  const { state } = useMentary();
  const questions = state.questions;
  const qs = qsMap(questions);
  const byQ = new Map<string, Response[]>();
  for (const r of responses) {
    const arr = byQ.get(r.questionId) ?? [];
    arr.push(r);
    byQ.set(r.questionId, arr);
  }
  const entries = Array.from(byQ.entries()).map(([questionId, rs]) => {
    const q = qs.get(questionId)!;
    const counts = new Array(q.options.length).fill(0);
    let omissions = 0;
    for (const r of rs) {
      if (r.answer === null) omissions++;
      else counts[r.answer!] = (counts[r.answer!] ?? 0) + 1;
    }
    return { q, rs, counts, omissions };
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetTrigger asChild>
        <button className="hidden" />
      </SheetTrigger>
      <SheetContent className="p-0">
        <SheetHeader className="p-5 border-b">
          <SheetTitle>{title}</SheetTitle>
          <p className="subtext">
            {responses.length} resposta(s) · {new Set(responses.map((r) => r.studentId)).size}{" "}
            estudante(s)
          </p>
        </SheetHeader>
        <div className="p-4">
          {entries.length === 0 ? (
            <Empty text="Sem questões selecionadas." />
          ) : (
            <div className="space-y-4">
              {entries.map(({ q, rs, counts, omissions }) => {
                const correct = q.answer;
                return (
                  <Panel
                    key={q.id}
                    title={q.text}
                    description={`${q.subject} · ${descriptorOf(q.skill)}`}
                    className="mb-0"
                  >
                    <div className="p-4 grid gap-3 sm:grid-cols-3 items-start">
                      <div className="col-span-3 sm:col-span-1">
                        <strong className="block text-xs text-muted-foreground mb-1">
                          Gabarito
                        </strong>
                        <span className="badge success">{q.options[correct] ?? "—"}</span>
                      </div>
                      <div className="col-span-3 sm:col-span-2 space-y-2">
                        {q.options.map((opt, i) => {
                          const n = counts[i] ?? 0;
                          const share = rs.length ? pct(n, rs.length) : 0;
                          const isCorrect = i === correct;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-3 ${
                                isCorrect ? "border-l-2 border-success" : ""
                              }`}
                            >
                              <span className="shrink-0 text-xs font-bold">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>{opt}</span>
                                  <span className="text-muted-foreground">{n} resposta(s)</span>
                                </div>
                                <div className="h-2 bg-muted rounded overflow-hidden">
                                  <div
                                    className={`h-full ${isCorrect ? "bg-success" : "bg-primary"}`}
                                    style={{ width: `${share}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{share}%</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1 text-xs text-muted-foreground border-t">
                          Omissões: {omissions}
                        </div>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const tabs = [
  { key: "resultados", label: "Resultados escolares", icon: LayoutDashboard },
  { key: "turmas", label: "Comparação entre turmas", icon: BarIcon },
  { key: "evolucao", label: "Evolução escolar", icon: LineIcon },
  { key: "descritores", label: "Análise por descritor", icon: Users },
  { key: "alertas", label: "Alertas de desempenho", icon: AlertTriangle },
  { key: "gerencial", label: "Informações gerenciais", icon: FileText },
] as const;

export function ManagerDashboard({ activeTab = "resultados" }: { activeTab?: string }) {
  const { state } = useMentary();
  const questions = state.questions;
  const applications = state.applications;
  const classes = state.classes;
  const students = state.students;
  const assessments = state.assessments;
  const plans = state.plans;
  const responses = allResponses(state);
  const qs = qsMap(questions);

  const [tab, setTab] = useState<string>(activeTab);
  const [gerencialView, setGerencialView] = useState<"turmas" | "avaliacoes" | "planos">("turmas");
  const [drawer, setDrawer] = useState<{
    open: boolean;
    title: string;
    responses: Response[];
  }>({ open: false, title: "", responses: [] });

  const openDrawer = (title: string, rows: Response[]) => {
    setDrawer({ open: true, title, responses: rows });
  };

  const bySubject = subjects.map((subj) => {
    const rel = responses.filter((r) => qs.get(r.questionId)?.subject === subj);
    const a = aggregate(rel, questions);
    return { subj, ...a };
  });
  const total = aggregate(responses, questions);

  const classResults = classes.map((c) => {
    const rel = responses.filter((r) => r.classId === c.id);
    const a = aggregate(rel, questions);
    return { class: c, ...a };
  });

  // students present in both applications
  const appIds = applications.map((a) => a.id);
  const studentAppSet = new Map<string, Set<string>>();
  for (const app of applications) {
    for (const r of app.responses) {
      if (!studentAppSet.has(r.studentId)) studentAppSet.set(r.studentId, new Set());
      studentAppSet.get(r.studentId)!.add(app.id);
    }
  }
  const presentBoth = Array.from(studentAppSet.entries())
    .filter(([, apps]) => apps.size === appIds.length)
    .map(([sid]) => sid);
  const presentBothSet = new Set(presentBoth);

  const evolutionData = applications.map((app) => {
    const rel = app.responses.filter((r) => presentBothSet.has(r.studentId));
    const a = aggregate(rel, questions);
    return { date: app.date, name: app.name, value: a.score ?? 0, count: a.students };
  });

  // por descritor (skill)
  const bySkill = new Map<string, Response[]>();
  for (const r of responses) {
    const q = qs.get(r.questionId);
    if (!q) continue;
    const arr = bySkill.get(q.skill) ?? [];
    arr.push(r);
    bySkill.set(q.skill, arr);
  }
  const descriptorResults = Array.from(bySkill.entries())
    .map(([skillId, rel]) => {
      const a = aggregate(rel, questions);
      const skill = skills.find((s) => s.id === skillId)!;
      return {
        descriptor: skill.descriptor,
        skill: skill.name,
        subject: skill.subject,
        ...a,
      };
    })
    .sort((x, y) => (x.score ?? 0) - (y.score ?? 0));

  // alertas estudantes (presentes nas duas)
  const studentResults = students
    .filter((s) => presentBothSet.has(s.id))
    .map((s) => {
      const sep = applications[0]!.responses.filter((r) => r.studentId === s.id);
      const oct = applications[1]!.responses.filter((r) => r.studentId === s.id);
      const aSep = aggregate(sep, questions);
      const aOct = aggregate(oct, questions);
      const sepScore = aSep.score ?? 0;
      const octScore = aOct.score ?? 0;
      const drop = sepScore - octScore;
      let reason: string | null = null;
      if (octScore < defaultThresholds.critical) reason = "Crítico";
      else if (octScore < defaultThresholds.attention) reason = "Atenção";
      else if (drop >= defaultThresholds.drop) reason = `Queda de ${drop} pp`;
      return { student: s, sepScore, octScore, drop, reason };
    })
    .filter((x) => x.reason !== null);

  const descriptorAlerts = descriptorResults
    .map((d) => {
      let reason: string | null = null;
      const score = d.score ?? 0;
      if (score < defaultThresholds.critical) reason = "Crítico";
      else if (score < defaultThresholds.attention) reason = "Atenção";
      return { ...d, reason };
    })
    .filter((x) => x.reason !== null);

  return (
    <div className="page">
      <PageHeading
        title={tabs.find((item) => item.key === tab)?.label ?? "Resultados escolares"}
        description="Desempenho da unidade nas aplicações de setembro e outubro."
      />
      <Tabs defaultValue={activeTab} value={tab} onValueChange={setTab}>
        <TabsList className="manager-tabs-hidden" aria-hidden="true">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 1. Resultados escolares por componente curricular */}
        <TabsContent value="resultados" className="mt-4">
          <Panel
            title="Resultados por componente curricular"
            description="Agregado das aplicações de setembro e outubro."
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>COMPONENTE</th>
                    <th>QUESTÕES</th>
                    <th>ESTUDANTES</th>
                    <th>ACERTOS</th>
                    <th>ERROS</th>
                    <th>OMISSÕES</th>
                    <th>% ACERTOS</th>
                    <th>TEMPO MÉDIO</th>
                    <th>FAIXA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bySubject.map((row) => (
                    <tr
                      key={row.subj}
                      onClick={() =>
                        openDrawer(
                          `Questões · ${row.subj}`,
                          responses.filter((r) => qs.get(r.questionId)?.subject === row.subj),
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td className="table-main">{row.subj}</td>
                      <td>{row.questions}</td>
                      <td>{row.students}</td>
                      <td>{row.correct}</td>
                      <td>{row.errors}</td>
                      <td>{row.omissions}</td>
                      <td>{row.score ?? 0}%</td>
                      <td>{fmtTime(row.seconds)}</td>
                      <td>
                        <Badge>{faixaLabel(row.score)}</Badge>
                      </td>
                      <td>
                        <Eye size={14} className="text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-foreground">
                    <td className="table-main">Total da escola</td>
                    <td>{total.questions}</td>
                    <td>{total.students}</td>
                    <td>{total.correct}</td>
                    <td>{total.errors}</td>
                    <td>{total.omissions}</td>
                    <td>{total.score ?? 0}%</td>
                    <td>{fmtTime(total.seconds)}</td>
                    <td>
                      <Badge>{faixaLabel(total.score)}</Badge>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        {/* 2. Comparação entre turmas */}
        <TabsContent value="turmas" className="mt-4">
          <div className="grid-two">
            <Panel
              title="Comparação de acertos entre turmas"
              description="Percentual de acertos por turma."
              className="flex flex-col"
            >
              <div className="chart-wrap flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classResults}>
                    <XAxis dataKey="class.name" />
                    <YAxis
                      domain={[0, 100]}
                      label={{ value: "% acertos", position: "insideLeft", angle: -90 }}
                    />
                    <Tooltip />
                    <Bar dataKey="score" fill="#332389" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Detalhe por turma" className="flex flex-col">
              <div className="table-scroll flex-1 overflow-hidden">
                <table>
                  <thead>
                    <tr>
                      <th>TURMA</th>
                      <th>ESTUDANTES</th>
                      <th>% ACERTOS</th>
                      <th>DIFERENÇA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {classResults.map((row, i) => {
                      const other = classResults[(i + 1) % classResults.length]!;
                      const diff = Math.round(((row.score ?? 0) - (other.score ?? 0)) * 10) / 10;
                      const up = diff >= 0;
                      return (
                        <tr
                          key={row.class.id}
                          onClick={() =>
                            openDrawer(
                              `Questões · ${row.class.name}`,
                              responses.filter((r) => r.classId === row.class.id),
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td className="table-main">{row.class.name}</td>
                          <td>{row.students}</td>
                          <td>{row.score ?? 0}%</td>
                          <td>
                            <span
                              className={`text-xs font-bold ${up ? "text-success" : "text-destructive"}`}
                            >
                              {up ? "+" : ""}
                              {diff} pp vs {other.class.name}
                            </span>
                          </td>
                          <td>
                            <Eye size={14} className="text-muted-foreground" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* 3. Evolução escolar */}
        <TabsContent value="evolucao" className="mt-4">
          <Panel
            title="Evolução da escola (setembro → outubro)"
            description={`Apenas ${presentBoth.length} estudante(s) presente(s) nas duas aplicações.`}
          >
            <div className="chart-wrap min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} label={{ value: "% acertos" }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#332389"
                    strokeWidth={3}
                    dot={{ fill: "#332389" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {evolutionData.map((d) => (
                <Metric
                  key={d.date}
                  title={d.name}
                  value={`${d.value}%`}
                  icon={TrendingUp}
                  note={`${d.count} estudante(s) comparados`}
                  tone=""
                />
              ))}
            </div>
          </Panel>
        </TabsContent>

        {/* 4. Análise por descritor */}
        <TabsContent value="descritores" className="mt-4">
          <Panel
            title="Descritores D1–D12"
            description="Ordenados do menor para o maior percentual de acertos."
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>DESCRITOR</th>
                    <th>HABILIDADE</th>
                    <th>COMPONENTE</th>
                    <th>% ACERTOS</th>
                    <th>FAIXA</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {descriptorResults.map((row) => (
                    <tr
                      key={row.descriptor}
                      onClick={() =>
                        openDrawer(
                          `Questões · ${row.descriptor}`,
                          responses.filter((r) => {
                            const q = qs.get(r.questionId);
                            return q
                              ? q.skill === skills.find((s) => s.descriptor === row.descriptor)?.id
                              : false;
                          }),
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td className="table-main">{row.descriptor}</td>
                      <td>{row.skill}</td>
                      <td>{row.subject}</td>
                      <td>{row.score ?? 0}%</td>
                      <td>
                        <Badge>{faixaLabel(row.score)}</Badge>
                      </td>
                      <td>
                        <Eye size={14} className="text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </TabsContent>

        {/* 5. Alertas de desempenho */}
        <TabsContent value="alertas" className="mt-4">
          <div className="grid-two">
            <Panel
              title="Estudantes em alerta"
              description="Crítico, atenção ou queda ≥ 10 pp entre setembro e outubro."
            >
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ESTUDANTE</th>
                      <th>TURMA</th>
                      <th>SET.</th>
                      <th>OUT.</th>
                      <th>VAR.</th>
                      <th>ALERTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map((row) => (
                      <tr
                        key={row.student.id}
                        onClick={() =>
                          openDrawer(
                            `Questões · ${row.student.name}`,
                            responses.filter((r) => r.studentId === row.student.id),
                          )
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td className="table-main">{row.student.name}</td>
                        <td>{classes.find((c) => c.id === row.student.classId)?.name ?? "—"}</td>
                        <td>{row.sepScore}%</td>
                        <td>{row.octScore}%</td>
                        <td>
                          <span
                            className={`text-xs font-bold ${row.drop >= 0 ? "text-destructive" : "text-success"}`}
                          >
                            {row.drop > 0 ? "-" : ""}
                            {Math.abs(row.drop)} pp
                          </span>
                        </td>
                        <td>
                          <Badge>{row.reason}</Badge>
                        </td>
                      </tr>
                    ))}
                    {studentResults.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted-foreground py-8">
                          Sem estudantes em alerta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Descritores em alerta" description="Faixa crítica ou atenção.">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>DESCRITOR</th>
                      <th>HABILIDADE</th>
                      <th>% ACERTOS</th>
                      <th>FAIXA</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {descriptorAlerts.map((row) => (
                      <tr
                        key={row.descriptor}
                        onClick={() =>
                          openDrawer(
                            `Questões · ${row.descriptor}`,
                            responses.filter((r) => {
                              const q = qs.get(r.questionId);
                              return q
                                ? q.skill ===
                                    skills.find((s) => s.descriptor === row.descriptor)?.id
                                : false;
                            }),
                          )
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td className="table-main">{row.descriptor}</td>
                        <td>{row.skill}</td>
                        <td>{row.score ?? 0}%</td>
                        <td>
                          <Badge>{faixaLabel(row.score)}</Badge>
                        </td>
                        <td>
                          <Eye size={14} className="text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                    {descriptorAlerts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-muted-foreground py-8">
                          Sem descritores em alerta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* 6. Informações gerenciais */}
        <TabsContent value="gerencial" className="mt-4">
          <Panel
            title="Informações gerenciais"
            description="Turmas, avaliações e planos de recomposição da unidade."
          >
            <div className="settings-tabs mb-4">
              <button
                className={gerencialView === "turmas" ? "selected" : ""}
                onClick={() => setGerencialView("turmas")}
              >
                Turmas ({classes.length})
              </button>
              <button
                className={gerencialView === "avaliacoes" ? "selected" : ""}
                onClick={() => setGerencialView("avaliacoes")}
              >
                Avaliações ({assessments.length})
              </button>
              <button
                className={gerencialView === "planos" ? "selected" : ""}
                onClick={() => setGerencialView("planos")}
              >
                Planos de recomposição ({plans.length})
              </button>
            </div>
            {gerencialView === "turmas" ? (
              <Panel title="Turmas cadastradas">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>TURMA</th>
                        <th>ESCOLA</th>
                        <th>PROFESSOR(A)</th>
                        <th>ESTUDANTES</th>
                        <th>MÉDIA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((c) => {
                        const roomStudents = students.filter((s) => s.classId === c.id);
                        const school = state.schools.find((s) => s.id === c.schoolId);
                        return (
                          <tr key={c.id}>
                            <td className="table-main">{c.name}</td>
                            <td>{school?.name ?? "Unidade cadastrada"}</td>
                            <td>{c.teacher}</td>
                            <td>{roomStudents.length}</td>
                            <td>
                              <Badge>{mean(roomStudents)}%</Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {classes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">
                            Sem turmas cadastradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            ) : gerencialView === "avaliacoes" ? (
              <Panel title="Avaliações da unidade">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>NOME</th>
                        <th>DISCIPLINA</th>
                        <th>TURMA</th>
                        <th>DATA</th>
                        <th>STATUS</th>
                        <th>QUESTÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.map((a) => {
                        const c = classes.find((x) => x.id === a.classId);
                        return (
                          <tr key={a.id}>
                            <td className="table-main">{a.name}</td>
                            <td>{a.subject}</td>
                            <td>{c?.name ?? "—"}</td>
                            <td>{a.date}</td>
                            <td>
                              <Badge>{a.status}</Badge>
                            </td>
                            <td>{a.questions.length}</td>
                          </tr>
                        );
                      })}
                      {assessments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted-foreground py-8">
                            Sem avaliações cadastradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            ) : (
              <Panel title="Planos de recomposição">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>TÍTULO</th>
                        <th>HABILIDADE</th>
                        <th>TURMA</th>
                        <th>RESPONSÁVEL</th>
                        <th>PRAZO</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => {
                        const c = classes.find((x) => x.id === p.classId);
                        const skill = skills.find((s) => s.id === p.skill);
                        return (
                          <tr key={p.id}>
                            <td className="table-main">{p.title}</td>
                            <td>{skill?.descriptor ?? "—"}</td>
                            <td>{c?.name ?? "—"}</td>
                            <td>{p.responsible}</td>
                            <td>{p.deadline}</td>
                            <td>
                              <Badge>{p.status}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {plans.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted-foreground py-8">
                            Sem planos cadastrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
      <QuestionDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, title: "", responses: [] })}
        title={drawer.title}
        responses={drawer.responses}
      />
    </div>
  );
}
