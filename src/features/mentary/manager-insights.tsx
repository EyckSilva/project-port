import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowDownToLine, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown, CircleHelp, ClipboardCheck, FileSpreadsheet, FileText, Filter, GraduationCap, Search, ShieldAlert, Target, TrendingUp, Users, X } from "lucide-react";
import { useMentary } from "./store";
import { skills, subjects, downloadCsv } from "./data";
import { aggregate, attention, defaultThresholds, type Response } from "./results";
import { Empty } from "./ui";

const sections = [
  { key: "resultados", title: "Resultados escolares", subtitle: "Panorama do desempenho e da aprendizagem da unidade." },
  { key: "turmas", title: "Comparação entre turmas", subtitle: "Compare os resultados por disciplina e encontre diferenças relevantes." },
  { key: "evolucao", title: "Evolução escolar", subtitle: "Acompanhe a trajetória das avaliações e as metas pedagógicas." },
  { key: "descritores", title: "Análise por descritor", subtitle: "Identifique habilidades com maior necessidade de intervenção." },
  { key: "alertas", title: "Alertas de desempenho", subtitle: "Priorize os riscos de aprendizagem detectados nas avaliações." },
  { key: "gerencial", title: "Informações gerenciais", subtitle: "Visão consolidada e exportação dos dados disponíveis." },
] as const;

const palette = ["#00c2e5", "#8e76ff", "#fbbd72", "#6754e8"];
const grid = { stroke: "#2b245f", strokeDasharray: "3 5" };
const axis = { fill: "#9a95c2", fontSize: 11 };
const tooltipStyle = { background: "#0e0b2a", border: "1px solid #314159", borderRadius: 10, color: "#efeefb" };
const percent = (v: number | null) => v === null ? "—" : v.toFixed(1).replace(".", ",") + "%";
const scoreOf = (rows: Response[], questions: ReturnType<typeof useMentary>["state"]["questions"]) => aggregate(rows, questions).score;
const monthLabel = (date: string) => new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
const csvCell = (value: unknown) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
function exportTable(name: string, headers: string[], rows: (string | number | null)[][]) {
  const content = [headers, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name + ".csv"; a.click();
  URL.revokeObjectURL(url);
}
function Card({ title, subtitle, children, action, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={"mc-card " + className}><header className="mc-card-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section>;
}
function Stat({ label, value, note, icon: Icon, tone = "cyan" }: { label: string; value: string | number; note: string; icon: React.ComponentType<{ size?: number }>; tone?: string }) {
  return <article className="mc-stat"><div className="mc-stat-top"><span>{label}</span><span className={"mc-stat-icon mc-" + tone}><Icon size={17}/></span></div><strong>{value}</strong><small>{note}</small></article>;
}
function Status({ score }: { score: number | null }) {
  const value = attention(score, defaultThresholds);
  return <span className={"mc-status " + (score === null ? "mc-neutral" : score < 40 ? "mc-critical" : score < 60 ? "mc-warning" : "mc-good")}>{value}</span>;
}
function NoData({ text = "Sem respostas para os filtros selecionados." }: { text?: string }) {
  return <div className="mc-no-data"><CircleHelp size={23}/><p>{text}</p></div>;
}
export function ManagerInsights({ activeTab = "resultados" }: { activeTab?: string }) {
  const { state } = useMentary();
  const [schoolId, setSchoolId] = useState("");
  const [year, setYear] = useState("");
  const [period, setPeriod] = useState("");
  const [subject, setSubject] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("bimestral");
  const [resolved, setResolved] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [target, setTarget] = useState(70);
  const [detail, setDetail] = useState<{ title: string; rows: Response[] } | null>(null);
  const page = sections.find(s => s.key === activeTab) ?? sections[0];
  const { questions, applications, classes, students, schools } = state;
  const schoolClasses = classes.filter(c => !schoolId || c.schoolId === schoolId);
  const relevantClasses = schoolClasses.filter(c => !year || c.name.startsWith(year.replace(" ano", "")));
  const classIds = new Set(relevantClasses.map(c => c.id));
  const filteredApps = applications.filter(a => !period || a.id === period);
  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const responseRows = filteredApps.flatMap(a => a.responses).filter(r => classIds.has(r.classId) && (!subject || questionMap.get(r.questionId)?.subject === subject));
  const schoolStudents = students.filter(s => classIds.has(s.classId));
  const report = aggregate(responseRows, questions);
  const participation = schoolStudents.length && filteredApps.length ? new Set(responseRows.map(r => r.studentId)).size / schoolStudents.length * 100 : null;
  const periodReports = applications.map(a => {
    const rows = a.responses.filter(r => classIds.has(r.classId) && (!subject || questionMap.get(r.questionId)?.subject === subject));
    return { ...a, rows, score: scoreOf(rows, questions), participants: new Set(rows.map(r => r.studentId)).size };
  });
  const currentScore = periodReports[periodReports.length - 1]?.score ?? null;
  const priorScore = periodReports[periodReports.length - 2]?.score ?? null;
  const delta = currentScore !== null && priorScore !== null ? currentScore - priorScore : null;
  const classOptions = relevantClasses.map(c => c.id);
  const selectedClasses = (selected.length ? selected.filter(id => classIds.has(id)) : classOptions.slice(0, 4)).slice(0, 4);
  const subjectStats = subjects.filter(s => !subject || s === subject).map(name => {
    const rows = responseRows.filter(r => questionMap.get(r.questionId)?.subject === name);
    return { name, rows, ...aggregate(rows, questions) };
  });
  const classStats = relevantClasses.map(room => {
    const rows = responseRows.filter(r => r.classId === room.id);
    return { room, rows, ...aggregate(rows, questions) };
  });
  const distribution = [
    { name: "Abaixo do básico", min: 0, max: 40, color: "#f37b8f" },
    { name: "Básico", min: 40, max: 60, color: "#f4b966" },
    { name: "Adequado", min: 60, max: 80, color: "#00c2e5" },
    { name: "Avançado", min: 80, max: 101, color: "#8e76ff" },
  ].map(level => {
    const scores = schoolStudents.map(student => scoreOf(responseRows.filter(r => r.studentId === student.id), questions)).filter((s): s is number => s !== null);
    return { ...level, count: scores.filter(s => s >= level.min && s < level.max).length, total: scores.length };
  });
  const comparison = subjectStats.map(s => {
    const entry: Record<string, string | number | null> = { name: s.name };
    for (const id of selectedClasses) entry[id] = scoreOf(s.rows.filter(r => r.classId === id), questions);
    return entry;
  });
  const radar = ["Aprendizagem", "Participação", "Questões respondidas"].map(metric => {
    const entry: Record<string, string | number | null> = { metric };
    for (const id of selectedClasses) {
      const c = classStats.find(x => x.room.id === id);
      const enrolled = schoolStudents.filter(s => s.classId === id).length;
      entry[id] = metric === "Aprendizagem" ? c?.score ?? null :
        metric === "Participação" ? enrolled && c ? Math.round(100 * c.students / enrolled) : null :
        c?.count ? Math.round(100 * (c.count - c.omissions) / c.count) : null;
    }
    return entry;
  });
  const evolution = periodReports.map(a => ({ label: monthLabel(a.date), name: a.name, actual: a.score, goal: target, participants: a.participants }));
  const descriptorStats = skills.filter(s => !subject || s.subject === subject).map(skill => {
    const rows = responseRows.filter(r => questionMap.get(r.questionId)?.skill === skill.id);
    return { ...skill, rows, result: scoreOf(rows, questions) };
  }).filter(s => s.rows.length);
  const criticalSkills = [...descriptorStats].sort((a, b) => (a.result ?? 999) - (b.result ?? 999)).slice(0, 5);
  const alerts = schoolStudents.flatMap(student => {
    const scores = periodReports.map(a => scoreOf(a.rows.filter(r => r.studentId === student.id), questions));
    const last = scores[scores.length - 1] ?? null;
    const previous = scores[scores.length - 2] ?? null;
    if (last === null) return [];
    const drop = previous !== null ? previous - last : 0;
    if (last >= 60 && drop < defaultThresholds.drop) return [];
    return [{ id: "student-" + student.id, title: student.name, group: classes.find(c => c.id === student.classId)?.name ?? "Turma", severity: last < 40 ? "Crítico" : last < 60 ? "Médio" : "Preventivo", message: drop >= defaultThresholds.drop ? "Queda de " + drop.toFixed(1).replace(".", ",") + " p.p. entre avaliações" : "Proficiência de " + percent(last) + " abaixo do nível esperado", date: periodReports[periodReports.length - 1]?.date ?? "", rows: responseRows.filter(r => r.studentId === student.id) }];
  });
  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));
  const openAlerts = visibleAlerts.filter(a => !resolved.includes(a.id));
  const openDetails = (title: string, rows: Response[]) => setDetail({ title, rows });
  const exportSummary = () => exportTable("mentary-resultados", ["Disciplina", "Questões", "Estudantes", "Acertos", "Erros", "Omissões", "% de acertos"], subjectStats.map(s => [s.name, s.questions, s.students, s.correct, s.errors, s.omissions, s.score]));
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); setDetail(null); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  return <main className="manager-console">
    <div className="mc-heading"><div><h1>{page.title}</h1><p>{page.subtitle}</p></div><div className="mc-heading-actions"><button className="mc-search" onClick={() => setSearchOpen(true)}><Search size={15}/> Pesquisa rápida <kbd>Ctrl K</kbd></button></div></div>
    <div className="mc-filters" aria-label="Filtros do dashboard">
      <div className="mc-filter-title"><Filter size={15}/> Filtros <span>Os indicadores se atualizam automaticamente</span></div>
      <div className="mc-filter-grid">
        <label>Escola<select value={schoolId} onChange={e => { setSchoolId(e.target.value); setSelected([]); }}><option value="">Todas as escolas</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Ano / Série<select value={year} onChange={e => { setYear(e.target.value); setSelected([]); }}><option value="">Todos os anos</option><option value="5º ano">5º ano</option><option value="6º ano">6º ano</option></select></label>
        <label>Período<select value={period} onChange={e => setPeriod(e.target.value)}><option value="">Todos os períodos</option>{applications.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Disciplina<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Todas as disciplinas</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
    </div>
    {activeTab === "resultados" && <div className="mc-stack">
      <div className="mc-stats">
        <Stat label="Média global de acertos" value={percent(report.score)} note={delta === null ? "Sem histórico comparável" : (delta >= 0 ? "+" : "") + delta.toFixed(1) + " p.p. entre aplicações"} icon={TrendingUp}/>
        <Stat label="Aprovação projetada" value="—" note="Requer regras de aprovação e notas finais" icon={GraduationCap} tone="violet"/>
        <Stat label="Participação em avaliações" value={percent(participation)} note="Alunos com respostas / alunos cadastrados" icon={Users} tone="orange"/>
        <Stat label="Proficiência geral" value={percent(report.score)} note="Percentual de acertos observados" icon={Target} tone="blue"/>
      </div>
      <div className="mc-grid-2">
        <Card title="Distribuição de aprendizagem" subtitle="Alunos por faixa de acertos nas avaliações filtradas">
          <div className="mc-bars">{distribution.map(level => <div className="mc-distribution-row" key={level.name}><span>{level.name}</span><div className="mc-track"><div style={{ width: level.total ? (level.count / level.total * 100) + "%" : "0%", background: level.color }}/></div><strong>{level.count}</strong><small>{level.total ? Math.round(level.count / level.total * 100) : 0}%</small></div>)}</div>
          <p className="mc-footnote">Faixas exploratórias calculadas com base em acertos; não são classificações oficiais do SAEB.</p>
        </Card>
        <Card title="Trajetória recente" subtitle="Média de acertos por aplicação">
          <div className="mc-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={evolution}><defs><linearGradient id="mc-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#00c2e5" stopOpacity={0.24}/><stop offset="100%" stopColor="#00c2e5" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} {...grid}/><XAxis dataKey="label" tick={axis}/><YAxis domain={[0,100]} tick={axis}/><Tooltip contentStyle={tooltipStyle}/><Area type="monotone" dataKey="actual" name="Acertos (%)" stroke="#00c2e5" fill="url(#mc-gradient)" strokeWidth={3} connectNulls={false}/></AreaChart></ResponsiveContainer></div>
        </Card>
      </div>
      <Card title="Desempenho por disciplina" subtitle="Consolidado de questões e respostas" action={<button className="mc-quiet-button" onClick={exportSummary}><ArrowDownToLine size={14}/> Exportar CSV</button>}>
        <div className="mc-table-scroll"><table><thead><tr><th>DISCIPLINA</th><th>QUESTÕES</th><th>ESTUDANTES</th><th>ACERTOS</th><th>ERROS</th><th>OMISSÕES</th><th>APROVEITAMENTO</th><th>STATUS</th><th/></tr></thead><tbody>{subjectStats.map(s => <tr key={s.name}><td className="mc-strong">{s.name}</td><td>{s.questions}</td><td>{s.students}</td><td>{s.correct}</td><td>{s.errors}</td><td>{s.omissions}</td><td className="mc-strong">{percent(s.score)}</td><td><Status score={s.score}/></td><td><button className="mc-icon-button" aria-label={"Ver questões de " + s.name} onClick={() => openDetails(s.name, s.rows)}><ArrowRight size={15}/></button></td></tr>)}</tbody></table>{!responseRows.length && <NoData/>}</div>
        <p className="mc-footnote">Presença escolar não está registrada nesta base; participação em avaliações não equivale à frequência escolar.</p>
      </Card>
    </div>}
    {activeTab === "turmas" && <div className="mc-stack">
      <Card title="Selecione as turmas" subtitle="Compare até quatro turmas da seleção atual">
        <div className="mc-class-picker">{relevantClasses.map(c => { const checked = selectedClasses.includes(c.id); return <button key={c.id} className={"mc-class-chip " + (checked ? "active" : "")} onClick={() => setSelected(prev => { const base = prev.length ? prev.filter(id => classIds.has(id)) : classOptions.slice(0,4); return checked ? base.filter(id => id !== c.id) : base.length < 4 ? [...base, c.id] : base; })} aria-pressed={checked}><span>{checked && <Check size={13}/>}</span>{c.name}</button>; })}{!relevantClasses.length && <NoData text="Nenhuma turma encontrada."/>}</div>
      </Card>
      <div className="mc-grid-2">
        <Card title="Acertos por componente curricular" subtitle="Percentual de acertos por turma">
          <div className="mc-chart mc-chart-lg"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid vertical={false} {...grid}/><XAxis dataKey="name" tick={axis}/><YAxis domain={[0,100]} tick={axis}/><Tooltip contentStyle={tooltipStyle}/><Legend/>{selectedClasses.map((id, i) => <Bar key={id} dataKey={id} name={classes.find(c => c.id === id)?.name ?? id} fill={palette[i]} radius={[4,4,0,0]}/>)}</BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Perfil das turmas" subtitle="Indicadores observáveis (0–100); participação não é frequência">
          <div className="mc-chart mc-chart-lg"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar} outerRadius="65%"><PolarGrid stroke="#30295e"/><PolarAngleAxis dataKey="metric" tick={axis}/><Tooltip contentStyle={tooltipStyle}/><Legend/>{selectedClasses.map((id, i) => <Radar key={id} dataKey={id} name={classes.find(c => c.id === id)?.name ?? id} stroke={palette[i]} fill={palette[i]} fillOpacity={0.08}/>)}</RadarChart></ResponsiveContainer></div>
        </Card>
      </div>
      <Card title="Tabela comparativa" subtitle="Diferença entre os extremos de cada disciplina; destaque a partir de 15 pontos percentuais">
        <div className="mc-table-scroll"><table><thead><tr><th>DISCIPLINA</th>{selectedClasses.map(id => <th key={id}>{classes.find(c => c.id === id)?.name}</th>)}<th>AMPLITUDE</th><th>SINAL</th></tr></thead><tbody>{comparison.map(row => { const values = selectedClasses.map(id => row[id]).filter((n): n is number => typeof n === "number"); const range = values.length > 1 ? Math.max(...values) - Math.min(...values) : null; return <tr key={row.name}><td className="mc-strong">{row.name}</td>{selectedClasses.map(id => <td key={id}>{typeof row[id] === "number" ? percent(row[id] as number) : "—"}</td>)}<td>{range === null ? "—" : range.toFixed(1) + " p.p."}</td><td><span className={"mc-status " + (range !== null && range >= 15 ? "mc-warning" : "mc-neutral")}>{range === null ? "Sem comparação" : range >= 15 ? "Investigar" : "Estável"}</span></td></tr>; })}</tbody></table></div>
      </Card>
    </div>}
    {activeTab === "evolucao" && <div className="mc-stack">
      <div className="mc-toolbar"><div className="mc-segments">{["mensal", "bimestral", "historico"].map(value => <button key={value} className={frequency === value ? "active" : ""} onClick={() => setFrequency(value)}>{value === "historico" ? "Histórico" : value === "mensal" ? "Mensal" : "Bimestral"}</button>)}</div><label className="mc-target">Meta de acertos <input type="number" min={0} max={100} value={target} onChange={e => setTarget(Math.min(100, Math.max(0, Number(e.target.value))))}/>%</label></div>
      <Card title="Evolução da proficiência" subtitle={frequency === "historico" ? "Histórico disponível: aplicações registradas em 2026" : "Períodos disponíveis agrupados por aplicação registrada"}>
        <div className="mc-chart mc-chart-lg"><ResponsiveContainer width="100%" height="100%"><LineChart data={evolution}><CartesianGrid vertical={false} {...grid}/><XAxis dataKey="label" tick={axis}/><YAxis domain={[0,100]} tick={axis}/><Tooltip contentStyle={tooltipStyle}/><Legend/><Line type="monotone" dataKey="actual" name="Resultado" stroke="#00c2e5" strokeWidth={3} dot={{r:5}} connectNulls={false}/><Line type="monotone" dataKey="goal" name="Meta configurada" stroke="#8e76ff" strokeDasharray="6 5" dot={false}/></LineChart></ResponsiveContainer></div>
      </Card>
      <Card title="Evolução por corte" subtitle="Turmas acompanhadas em cada aplicação registrada">
        <div className="mc-table-scroll"><table><thead><tr><th>TURMA</th>{periodReports.map(a => <th key={a.id}>{monthLabel(a.date)}</th>)}<th>GANHO</th></tr></thead><tbody>{relevantClasses.map(c => { const scores = periodReports.map(a => scoreOf(a.rows.filter(r => r.classId === c.id), questions)); const first = scores[0]; const last = scores[scores.length - 1]; const change = first !== null && last !== null && first !== undefined && last !== undefined && scores.length > 1 ? last - first : null; return <tr key={c.id}><td className="mc-strong">{c.name}</td>{scores.map((score, i) => <td key={i}><span className="mc-heat" style={{ background: score === null ? "transparent" : score < 40 ? "#713744" : score < 60 ? "#66512f" : score < 80 ? "#164f60" : "#214d53" }}>{percent(score ?? null)}</span></td>)}<td className={change !== null && change >= 0 ? "mc-positive" : "mc-negative"}>{change === null ? "—" : (change > 0 ? "+" : "") + change.toFixed(1) + " p.p."}</td></tr>; })}</tbody></table></div><p className="mc-footnote">Ganho entre aplicações; retenção anual exige registros longitudinais de matrícula.</p>
      </Card>
    </div>}
    {activeTab === "descritores" && <div className="mc-stack">
      <div className="mc-grid-descriptors">
        <Card title="Mapa de calor de habilidades" subtitle="Taxa de acertos por turma e descritor; passe o cursor para detalhes">
          <div className="mc-table-scroll"><table className="mc-heatmap"><thead><tr><th>TURMA</th>{descriptorStats.map(d => <th key={d.id} title={d.name}>{d.descriptor}</th>)}</tr></thead><tbody>{relevantClasses.map(c => <tr key={c.id}><td className="mc-strong">{c.name}</td>{descriptorStats.map(d => { const score = scoreOf(d.rows.filter(r => r.classId === c.id), questions); return <td key={d.id}><button className={"mc-heat-cell " + (score === null ? "empty" : score < 40 ? "critical" : score < 60 ? "warning" : score < 80 ? "adequate" : "excellent")} title={d.descriptor + " · " + d.name + " · " + percent(score)} onClick={() => openDetails(c.name + " · " + d.descriptor, d.rows.filter(r => r.classId === c.id))}>{score === null ? "—" : Math.round(score) + "%"}</button></td>; })}</tr>)}</tbody></table></div>
          <div className="mc-legend"><span><i className="mc-swatch critical"/> &lt; 40%</span><span><i className="mc-swatch warning"/> 40–59%</span><span><i className="mc-swatch adequate"/> 60–79%</span><span><i className="mc-swatch excellent"/> ≥ 80%</span></div>
        </Card>
        <Card title="Prioridades pedagógicas" subtitle="Cinco habilidades com menor desempenho">
          <div className="mc-priorities">{criticalSkills.map((d, i) => <button key={d.id} onClick={() => openDetails(d.descriptor + " · " + d.name, d.rows)}><span className="mc-priority-rank">{String(i+1).padStart(2,"0")}</span><div><strong>{d.descriptor} · {d.name}</strong><small>{d.subject}</small></div><span className="mc-priority-value">{percent(d.result)}</span></button>)}{!criticalSkills.length && <NoData/>}</div>
        </Card>
      </div>
    </div>}
    {activeTab === "alertas" && <div className="mc-stack">
      <div className="mc-stats mc-stats-three"><Stat label="Alertas identificados" value={visibleAlerts.length} note="Riscos derivados de avaliações" icon={ShieldAlert} tone="orange"/><Stat label="Abertos" value={openAlerts.length} note="Aguardando acompanhamento" icon={Bell} tone="violet"/><Stat label="Marcados como resolvidos" value={visibleAlerts.length - openAlerts.length} note="Status desta sessão" icon={ClipboardCheck}/></div>
      <Card title="Fila de atenção" subtitle="Prioridade calculada a partir do desempenho; ações locais não enviam notificações">
        <div className="mc-alert-list">{[...openAlerts].sort((a,b) => ["Crítico","Médio","Preventivo"].indexOf(a.severity) - ["Crítico","Médio","Preventivo"].indexOf(b.severity)).map(a => <div className="mc-alert" key={a.id}><span className={"mc-alert-icon " + (a.severity === "Crítico" ? "critical" : "warning")}><AlertTriangle size={19}/></span><div className="mc-alert-body"><div className="mc-alert-title"><strong>{a.title}</strong><span className={"mc-status " + (a.severity === "Crítico" ? "mc-critical" : "mc-warning")}>{a.severity}</span></div><p>{a.message}</p><small>{a.group} · {a.date ? new Date(a.date + "T12:00:00").toLocaleDateString("pt-BR") : "Data indisponível"}</small><div className="mc-alert-actions"><button onClick={() => openDetails(a.title, a.rows)}>Ver histórico de respostas</button><button onClick={() => setResolved(prev => [...prev, a.id])}>Marcar resolvido</button><button onClick={() => setDismissed(prev => [...prev, a.id])}>Descartar</button></div></div></div>)}{!openAlerts.length && <NoData text="Nenhum alerta aberto nos filtros atuais."/>}</div>
      </Card>
      <Card title="Acompanhamento de resolução" subtitle="Situação dos alertas na sessão atual">
        <div className="mc-resolution"><div style={{ width: visibleAlerts.length ? 100 * (visibleAlerts.length - openAlerts.length) / visibleAlerts.length + "%" : "0%" }} className="mc-resolution-fill"/><div><strong>{visibleAlerts.length ? Math.round(100 * (visibleAlerts.length - openAlerts.length) / visibleAlerts.length) : 0}%</strong> resolvidos</div></div>
      </Card>
    </div>}
    {activeTab === "gerencial" && <div className="mc-stack">
      <div className="mc-stats"><Stat label="Alunos cadastrados" value={schoolStudents.length} note="Na seleção atual" icon={Users}/><Stat label="Docentes identificados" value={new Set(relevantClasses.map(c => c.teacher)).size} note="Professores vinculados às turmas" icon={BookOpen} tone="violet"/><Stat label="Taxa de evasão" value="—" note="Sem histórico de matrícula" icon={Activity} tone="orange"/><Stat label="Ocupação de vagas" value="—" note="Capacidade não cadastrada" icon={Target} tone="blue"/></div>
      <div className="mc-grid-2">
        <Card title="Central de relatórios" subtitle="Exportações estruturadas a partir dos dados carregados">
          <div className="mc-reports">
            <div><span className="mc-report-icon"><FileSpreadsheet size={19}/></span><span><strong>Resumo de desempenho</strong><small>CSV · Gerado sob demanda</small></span><button onClick={exportSummary}><ArrowDownToLine size={15}/> Exportar</button></div>
            <div><span className="mc-report-icon"><FileSpreadsheet size={19}/></span><span><strong>Comparativo de turmas</strong><small>CSV · Gerado sob demanda</small></span><button onClick={() => exportTable("mentary-turmas", ["Turma","Estudantes","Acertos (%)"], classStats.map(c => [c.room.name,c.students,c.score]))}><ArrowDownToLine size={15}/> Exportar</button></div>
            <div><span className="mc-report-icon"><FileSpreadsheet size={19}/></span><span><strong>Proficiência por descritor</strong><small>CSV · Gerado sob demanda</small></span><button onClick={() => exportTable("mentary-descritores", ["Descritor","Habilidade","Disciplina","Acertos (%)"],descriptorStats.map(d => [d.descriptor,d.name,d.subject,d.result]))}><ArrowDownToLine size={15}/> Exportar</button></div>
          </div>
        </Card>
        <Card title="Documentos institucionais" subtitle="Recursos dependentes de dados oficiais ainda não disponíveis">
          <div className="mc-docs"><div><FileText size={20}/><span><strong>Relatório executivo em PDF</strong><small>Necessita modelo e validação institucional</small></span><span className="mc-status mc-neutral">Indisponível</span></div><div><FileText size={20}/><span><strong>Boletins consolidados</strong><small>Necessitam notas finais e regras de avaliação</small></span><span className="mc-status mc-neutral">Indisponível</span></div><div><FileText size={20}/><span><strong>Atas do conselho de classe</strong><small>Necessitam registros e deliberações</small></span><span className="mc-status mc-neutral">Indisponível</span></div></div>
        </Card>
      </div>
      <Card title="Visão das turmas" subtitle="Dados administrativos disponíveis na base atual">
        <div className="mc-table-scroll"><table><thead><tr><th>TURMA</th><th>ESCOLA</th><th>DOCENTE</th><th>ALUNOS</th><th>ACERTOS</th></tr></thead><tbody>{classStats.map(c => <tr key={c.room.id}><td className="mc-strong">{c.room.name}</td><td>{schools.find(s => s.id === c.room.schoolId)?.name ?? "—"}</td><td>{c.room.teacher}</td><td>{schoolStudents.filter(s => s.classId === c.room.id).length}</td><td>{percent(c.score)}</td></tr>)}</tbody></table></div>
      </Card>
    </div>}
    <div className="mc-footer"><span>Mentary Analytics · Base demonstrativa</span><span>{report.count} respostas no recorte selecionado</span></div>
    {searchOpen && <div className="mc-overlay" onClick={() => setSearchOpen(false)}><div role="dialog" aria-modal="true" aria-label="Pesquisa rápida" className="mc-dialog" onClick={e => e.stopPropagation()}><div className="mc-dialog-search"><Search size={18}/><input autoFocus placeholder="Buscar uma funcionalidade..." value={query} onChange={e => setQuery(e.target.value)}/><button onClick={() => setSearchOpen(false)} aria-label="Fechar"><X size={17}/></button></div>{sections.filter(s => s.title.toLowerCase().includes(query.toLowerCase())).map(s => <Link key={s.key} to={s.key === "resultados" ? "/dashboard" : "/dashboard/" + s.key} onClick={() => { setSearchOpen(false); setQuery(""); }}><span>{s.title}</span><ArrowRight size={15}/></Link>)}</div></div>}
    {detail && <div className="mc-overlay" onClick={() => setDetail(null)}><div role="dialog" aria-modal="true" aria-label={detail.title} className="mc-dialog mc-detail" onClick={e => e.stopPropagation()}><header><div><h2>{detail.title}</h2><p>{detail.rows.length} respostas · {new Set(detail.rows.map(r => r.studentId)).size} estudantes</p></div><button onClick={() => setDetail(null)} aria-label="Fechar"><X size={19}/></button></header><div className="mc-detail-content">{Array.from(new Set(detail.rows.map(r => r.questionId))).map(id => { const q = questionMap.get(id); if (!q) return null; const rows = detail.rows.filter(r => r.questionId === id); const value = scoreOf(rows, questions); return <article key={id}><strong>{q.text}</strong><span>{q.subject} · {skills.find(s => s.id === q.skill)?.descriptor ?? q.skill} · {percent(value)}</span><small>{rows.length} respostas · Gabarito: {q.options[q.answer]}</small></article>; })}{!detail.rows.length && <NoData/>}</div></div></div>}
  </main>;
}
