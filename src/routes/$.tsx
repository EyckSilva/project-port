import { createFileRoute, Link, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Intelligence } from "@/features/mentary/intelligence";
import { StudentHome } from "@/features/mentary/student-home";
import { Catalogue } from "@/features/mentary/catalogue";
import { ReviewWorkspace } from "@/features/mentary/review";
import { UsersPage } from "@/features/mentary/users";
import { Interventions } from "@/features/mentary/interventions";
import { ThresholdSettings } from "@/features/mentary/thresholds";
import { useMentary } from "@/features/mentary/store";
import { LoginPage } from "@/features/mentary/login";
import classroom from "@/assets/classroom.jpg";
import { AppShell } from "@/features/mentary/shell";
import { Dashboard } from "@/features/mentary/dashboard";
import { ManagerInsights } from "@/features/mentary/manager-insights";
import { QuestionBank } from "@/features/mentary/questions";
import { Assessments, AssessmentBuilder, Validator } from "@/features/mentary/assessments";
import {
  subjects,
  skills,
  mean,
  downloadCsv,
  type Plan,
  type School,
  type ClassRoom,
  type Student,
} from "@/features/mentary/data";
import {
  PageHeading,
  Panel,
  Metric,
  Badge,
  Modal,
  SearchField,
  SelectField,
  Empty,
  Progress,
  DemoNote,
} from "@/features/mentary/ui";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpenCheck,
  ChevronRight,
  ClipboardList,
  FileChartColumn,
  FileText,
  Plus,
  Printer,
  School as SchoolIcon,
  ShieldCheck,
  Sprout,
  Target,
  Trash2,
  Upload,
} from "lucide-react";

/** The workspace currently exposes only the question extraction screen. */
const WORKSPACE_HOME = "/dashboard";

export const Route = createFileRoute("/$")({ component: CatchAll });

export function CatchAll() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return <PlatformEntry path={path} />;
}

function PlatformEntry({ path }: { path: string }) {
  const { state, ready } = useMentary();
  if (path === "/login") return <LoginPage />;
  if (!ready) return <div className="session-loading">Carregando plataforma…</div>;
  if (!state.authenticated) return <Navigate to="/login" replace />;
  const isManager = state.profile === "Gestor Escolar";
  if (isManager && path.startsWith("/dashboard")) {
    const activeTab =
      path === "/dashboard/turmas"
        ? "turmas"
        : path === "/dashboard/evolucao"
          ? "evolucao"
          : path === "/dashboard/descritores"
            ? "descritores"
            : path === "/dashboard/alertas"
              ? "alertas"
              : path === "/dashboard/gerencial"
                ? "gerencial"
                : "resultados";
    return (
      <AppShell>
        <ManagerInsights activeTab={activeTab} />
      </AppShell>
    );
  }
  return (
    <AppShell>
      {path === WORKSPACE_HOME ? <ReviewWorkspace upload /> : <Workspace path={path} />}
    </AppShell>
  );
}

/**
 * Full module routing, kept for when the other workspace modules are re-enabled.
 * PlatformEntry currently renders only the question extraction screen.
 */
export function Workspace({ path }: { path: string }) {
  const { state } = useMentary();
  if (state.profile === "Estudante") return <StudentHome />;
  if (path === "/dashboard") return <Intelligence />;
  if (path === "/usuarios") return <UsersPage />;
  if (path === "/meu-desempenho") return <Intelligence individual />;
  if (path === "/analise-aprendizagem") return <Intelligence />;
  if (path === "/questoes") return <QuestionBank />;
  if (path === "/questoes/revisao") return <ReviewWorkspace />;
  if (path === "/questoes/importar") return <ReviewWorkspace upload />;
  if (path === "/simulados") return <Assessments />;
  if (path === "/simulados/criar") return <AssessmentBuilder />;
  if (path === "/simulados/validador") return <Validator />;
  if (path === "/habilidades") return <Catalogue />;
  if (path === "/recomposicao") return <Interventions />;
  if (path === "/turmas") return <ClassesPage />;
  if (path === "/escolas") return <SchoolsPage />;
  if (path === "/relatorios") return <Intelligence report />;
  if (path === "/atividades") return <ActivitiesPage />;
  if (path === "/notificacoes") return <NotificationsPage />;
  if (path === "/configuracoes") return <SettingsPage />;
  if (path === "/ajuda") return <HelpPage />;
  return <Dashboard />;
}

function SchoolsPage() {
  const { state, update, log } = useMentary();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const rows = state.schools.filter((s) =>
    (s.name + " " + s.city).toLowerCase().includes(query.toLowerCase()),
  );
  const comparisons = rows.map((school) => {
    const schoolClasses = state.classes.filter((room) => room.schoolId === school.id);
    const students = state.students.filter((student) =>
      schoolClasses.some((room) => room.id === student.classId),
    );
    return {
      school,
      classCount: schoolClasses.length,
      studentCount: students.length,
      average: mean(students),
    };
  });
  const add = (e: FormEvent) => {
    e.preventDefault();
    const school: School = { id: crypto.randomUUID(), name, city };
    update((s) => ({ ...s, schools: [...s.schools, school] }));
    log(`Escola cadastrada: ${name}`);
    setName("");
    setCity("");
    setOpen(false);
    toast.success("Escola cadastrada.");
  };
  return (
    <div className="page">
      <PageHeading
        title="Escolas e unidades"
        description="Organize as unidades escolares acompanhadas pela plataforma."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Cadastrar escola
        </Button>
      </PageHeading>
      <div className="filter-bar">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar escola ou município" />
      </div>
      <Panel
        title="Comparação entre escolas"
        description="Compare o desempenho médio, as turmas e os estudantes de cada unidade."
        className="mb-6"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ESCOLA</th>
                <th>TURMAS</th>
                <th>ESTUDANTES</th>
                <th>MÉDIA DE ACERTOS</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map(({ school, classCount, studentCount, average }) => (
                <tr key={school.id}>
                  <td className="table-main">{school.name}</td>
                  <td>{classCount}</td>
                  <td>{studentCount}</td>
                  <td>
                    <Badge>{average}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid-three">
        {rows.map((s) => (
          <Panel key={s.id} title={s.name} description={s.city}>
            <div className="px-5 pb-5">
              <div className="metrics !grid-cols-2 !mb-0">
                <div>
                  <p className="subtext">Turmas</p>
                  <strong className="text-2xl">
                    {state.classes.filter((c) => c.schoolId === s.id).length}
                  </strong>
                </div>
                <div>
                  <p className="subtext">Estudantes</p>
                  <strong className="text-2xl">
                    {
                      state.students.filter((st) =>
                        state.classes.some((c) => c.schoolId === s.id && c.id === st.classId),
                      ).length
                    }
                  </strong>
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar escola">
        <form className="grid gap-4" onSubmit={add}>
          <label className="field">
            Nome da escola
            <input
              className="control"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Município / UF
            <input
              className="control"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <Button type="submit">Salvar escola</Button>
        </form>
      </Modal>
    </div>
  );
}

function ClassesPage() {
  const { state, update, log } = useMentary();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("Turmas");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [schoolId, setSchool] = useState("s1");
  const [teacher, setTeacher] = useState("Carla Oliveira");
  const rows = state.classes.filter((c) =>
    (c.name + " " + c.teacher).toLowerCase().includes(query.toLowerCase()),
  );
  const add = (e: FormEvent) => {
    e.preventDefault();
    const room: ClassRoom = { id: crypto.randomUUID(), name, schoolId, teacher };
    update((s) => ({ ...s, classes: [...s.classes, room] }));
    log(`Turma cadastrada: ${name}`);
    setOpen(false);
    setName("");
    toast.success("Turma cadastrada.");
  };
  return (
    <div className="page">
      <PageHeading
        title="Turmas e estudantes"
        description="Acompanhe os grupos e estudantes com dados demonstrativos."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Nova turma
        </Button>
      </PageHeading>
      <div className="settings-tabs">
        <button className={kind === "Turmas" ? "selected" : ""} onClick={() => setKind("Turmas")}>
          Turmas ({state.classes.length})
        </button>
        <button
          className={kind === "Estudantes" ? "selected" : ""}
          onClick={() => setKind("Estudantes")}
        >
          Estudantes ({state.students.length})
        </button>
      </div>
      <div className="filter-bar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={kind === "Turmas" ? "Buscar turma ou professor" : "Buscar estudante"}
        />
      </div>
      {kind === "Turmas" ? (
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
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="table-main">{c.name}</td>
                    <td>
                      {state.schools.find((s) => s.id === c.schoolId)?.name || "Unidade cadastrada"}
                    </td>
                    <td>{c.teacher}</td>
                    <td>{state.students.filter((s) => s.classId === c.id).length}</td>
                    <td>
                      <Badge>{mean(state.students.filter((s) => s.classId === c.id))}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel title="Estudantes">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ESTUDANTE</th>
                  <th>TURMA</th>
                  <th>DESEMPENHO</th>
                  <th>ACOMPANHAMENTO</th>
                </tr>
              </thead>
              <tbody>
                {state.students
                  .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="table-main">{s.name}</td>
                      <td>{state.classes.find((c) => c.id === s.classId)?.name || "—"}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-24">
                            <Progress value={s.score} tone={s.score < 60 ? "warning" : ""} />
                          </div>
                          {s.score}%
                        </div>
                      </td>
                      <td>
                        <Badge>
                          {s.score < 60 ? "Recomposição prioritária" : "Em acompanhamento"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Cadastrar turma">
        <form className="grid gap-4" onSubmit={add}>
          <label className="field">
            Nome da turma
            <input
              className="control"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Escola
            <SelectField
              label="Escola"
              value={schoolId}
              onChange={setSchool}
              options={state.schools.map((s) => ({ value: s.id, label: s.name }))}
            />
          </label>
          <label className="field">
            Professor(a)
            <input
              className="control"
              required
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
            />
          </label>
          <Button type="submit">Salvar turma</Button>
        </form>
      </Modal>
    </div>
  );
}

function ActivitiesPage() {
  const { state } = useMentary();
  return (
    <div className="page">
      <PageHeading
        title="Histórico de atividades"
        description="Acompanhe as principais ações realizadas no ambiente demonstrativo."
      />
      <Panel title="Atividade recente" description={`${state.activities.length} registros`}>
        {state.activities.map((a) => (
          <div key={a.id} className="list-item">
            <span className="icon-tile">
              <Activity size={17} />
            </span>
            <div className="grow">
              <p>{a.text}</p>
              <p className="subtext">{a.date}</p>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
function NotificationsPage() {
  const { state, update } = useMentary();
  return (
    <div className="page">
      <PageHeading
        title="Notificações"
        description="Avisos sobre avaliações, questões e acompanhamento pedagógico."
      >
        <Button
          variant="outline"
          onClick={() =>
            update((s) => ({
              ...s,
              notifications: s.notifications.map((n) => ({ ...n, read: true })),
            }))
          }
        >
          Marcar todas como lidas
        </Button>
      </PageHeading>
      <Panel title="Central de notificações">
        {state.notifications.map((n) => (
          <Link to={n.path} key={n.id} className="list-item">
            <span className={`icon-tile ${n.read ? "" : "warning"}`}>
              <Bell size={17} />
            </span>
            <div className="grow">
              <div className="flex gap-2 items-center">
                <strong>{n.title}</strong>
                {!n.read && <span className="badge warning">Nova</span>}
              </div>
              <p className="subtext">
                {n.text} · {n.date}
              </p>
            </div>
            <ChevronRight size={16} />
          </Link>
        ))}
      </Panel>
    </div>
  );
}
function SettingsPage() {
  const { state, update, log } = useMentary();
  const [name, setName] = useState(state.settings.name);
  const [email, setEmail] = useState(state.settings.email);
  const isManager = state.profile === "Gestor Escolar";
  return (
    <div className="page">
      <PageHeading
        title={isManager ? "Configurações da rede" : "Configurações"}
        description={
          isManager
            ? "Gerencie as preferências da unidade no ambiente demonstrativo."
            : "Personalize seu ambiente demonstrativo."
        }
      />
      <ThresholdSettings />
      <div className="grid-two">
        <Panel
          title="Perfil de demonstração"
          description="Essas informações são armazenadas apenas neste navegador."
        >
          <form
            className="p-5 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              update((s) => ({ ...s, settings: { ...s.settings, name, email } }));
              log("Configurações do perfil atualizadas");
              toast.success("Configurações salvas.");
            }}
          >
            <label className="field">
              Nome
              <input
                className="control"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              E-mail
              <input
                className="control"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <Button type="submit">Salvar perfil</Button>
          </form>
        </Panel>
        <Panel title="Preferências">
          <div className="list-item">
            <div className="grow">
              <strong>Menu compacto</strong>
              <p className="subtext">Recolhe a navegação lateral para ampliar o espaço.</p>
            </div>
            <input
              aria-label="Menu compacto"
              type="checkbox"
              checked={state.settings.compact}
              onChange={(e) =>
                update((s) => ({ ...s, settings: { ...s.settings, compact: e.target.checked } }))
              }
            />
          </div>
          <div className="list-item">
            <div className="grow">
              <strong>Notificações por e-mail</strong>
              <p className="subtext">Preferência ilustrativa; nenhum e-mail será enviado.</p>
            </div>
            <input
              aria-label="Notificações por e-mail"
              type="checkbox"
              checked={state.settings.emailNotifications}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  settings: { ...s.settings, emailNotifications: e.target.checked },
                }))
              }
            />
          </div>
          <div className="list-item">
            <div className="grow">
              <strong>Dados de demonstração</strong>
              <p className="subtext">Reinicie os dados para voltar ao estado inicial.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem("mentary-demo-v1");
                window.location.reload();
              }}
            >
              Restaurar
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
function HelpPage() {
  return (
    <div className="page">
      <PageHeading
        title="Ajuda e orientações"
        description="Conheça os principais fluxos do protótipo Mentary."
      />
      <div className="grid-three">
        {[
          {
            title: "Banco de questões",
            text: "Pesquise, filtre, edite e revise itens antes de aprová-los para avaliações.",
            icon: BookOpenCheck,
            path: "/questoes",
          },
          {
            title: "Criar avaliações",
            text: "Monte avaliações a partir de questões aprovadas e valide sua composição.",
            icon: ClipboardList,
            path: "/simulados/criar",
          },
          {
            title: "Recomposição",
            text: "Registre estratégias de intervenção vinculadas a habilidades e turmas.",
            icon: Sprout,
            path: "/recomposicao",
          },
        ].map((x) => (
          <Panel key={x.title} title={x.title}>
            <div className="px-5 pb-5">
              <div className="icon-tile mb-4">
                <x.icon size={20} />
              </div>
              <p className="text-sm leading-6">{x.text}</p>
              <Button variant="link" asChild className="px-0 mt-4">
                <Link to={x.path}>
                  Abrir módulo <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      <div className="notice mt-6">
        <ShieldCheck size={19} />
        <p>
          Este protótipo utiliza dados fictícios e não realiza autenticação, chamadas de API,
          análises por inteligência artificial. PDFs com texto, CSV e JSON podem ser lidos
          localmente; imagens e PDFs digitalizados precisam do serviço de OCR ou de revisão manual.
        </p>
      </div>
    </div>
  );
}

export function QuestionsRoute() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return path === "/questoes" ? <PlatformEntry path={path} /> : <Outlet />;
}
export function AssessmentsRoute() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return path === "/simulados" ? <PlatformEntry path={path} /> : <Outlet />;
}
export function NestedWorkspace() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return <PlatformEntry path={path} />;
}
