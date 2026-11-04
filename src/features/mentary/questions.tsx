import { RichPreview } from "./rich-preview";
import { escapeHtml, safeImageUrl } from "./content";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Upload,
  MoreHorizontal,
  Check,
  Copy,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { questionErrors, canReview, questionChanges } from "./rules";
import { useMentary } from "./store";
import { subjects, skills, type Question } from "./data";
import { PageHeading, SearchField, SelectField, Badge, Modal, Empty, Progress } from "./ui";
export function QuestionBank({ review = false }: { review?: boolean }) {
  const { state, update, log } = useMentary();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [decision, setDecision] = useState<{ id: string; status: string } | null>(null);
  const [justification, setJustification] = useState("");
  const [batch, setBatch] = useState<string[]>([]);
  const rows = state.questions
    .filter(
      (q) =>
        (!review || ["Pendente de revisão", "Em revisão"].includes(q.status)) &&
        (!search || `${q.id} ${q.text}`.toLowerCase().includes(search.toLowerCase())) &&
        (!subject || q.subject === subject) &&
        (!year || q.year === year) &&
        (!difficulty || q.difficulty === difficulty) &&
        (!status || q.status === status) &&
        (!skill || q.skill === skill),
    )
    .sort((a, b) => (sort === "code" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)));
  const pages = Math.ceil(rows.length / 8) || 1;
  const current = rows.slice((Math.min(page, pages) - 1) * 8, Math.min(page, pages) * 8);
  const detail = state.questions.find((q) => q.id === selected);
  const changeStatus = (id: string, value: string, note = "") => {
    const question = state.questions.find((q) => q.id === id);
    if (value === "Aprovada") {
      if (!canReview(state.profile, state.reviewPermission)) {
        toast.error("Sem permissão de revisão.");
        return;
      }
      const errors = question ? questionErrors(question) : ["Questão não encontrada."];
      if (errors.length) {
        toast.error(errors.join(" "));
        return;
      }
    }
    update((s) => ({
      ...s,
      questions: s.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              status: value,
              approvedBy: value === "Aprovada" ? s.settings.name : undefined,
              approvedAt: value === "Aprovada" ? new Date().toISOString() : undefined,
              updated: new Date().toLocaleDateString("pt-BR"),
              history: [
                ...q.history,
                `${value} por ${s.settings.name} em ${new Date().toISOString()}${note ? ": " + note : ""}`,
              ],
            }
          : q,
      ),
    }));
    log(`Questão ${id}: ${value}${note ? " — " + note : ""}`);
    toast.success(`Questão ${value.toLowerCase()}`);
  };
  const create = () =>
    setEditing({
      id: crypto.randomUUID(),
      text: "",
      subject: "Matemática",
      year: "5º ano",
      skill: skills[0]!.id,
      difficulty: "Média",
      status: "Rascunho",
      options: ["", "", "", ""],
      answer: -1,
      reason: "",
      source: "Cadastro manual",
      updated: new Date().toLocaleDateString("pt-BR"),
      history: [],
    });
  const save = () => {
    if (!editing) return;
    if (
      editing.text.trim().length < 10 ||
      editing.options.some((o) => !o.trim()) ||
      !editing.reason.trim()
    ) {
      toast.error("Preencha o enunciado, todas as alternativas e a justificativa.");
      return;
    }
    const q = {
      ...editing,
      status: "Pendente de revisão",
      approvedBy: undefined,
      approvedAt: undefined,
      history: [
        ...editing.history,
        `Editada por ${state.settings.name} em ${new Date().toISOString()}; ${questionChanges(
          state.questions.find((q) => q.id === editing.id),
          editing,
        )}; aprovação anterior invalidada`,
      ],
    };
    update((s) => ({
      ...s,
      questions: s.questions.some((x) => x.id === q.id)
        ? s.questions.map((x) => (x.id === q.id ? q : x))
        : [q, ...s.questions],
    }));
    log(`Questão ${q.id} salva`);
    setEditing(null);
    toast.success("Questão salva no banco.");
  };
  const duplicate = (q: Question) => {
    const id = crypto.randomUUID();
    update((s) => ({
      ...s,
      questions: [
        {
          ...q,
          id,
          approvedBy: undefined,
          approvedAt: undefined,
          status: "Rascunho",
          history: [`Duplicada de ${q.id}`],
        },
        ...s.questions,
      ],
    }));
    log(`Questão ${q.id} duplicada como ${id}`);
    toast.success("Questão duplicada como rascunho.");
  };
  return (
    <div className="page">
      <PageHeading
        title={review ? "Revisão e aprovação" : "Banco de questões"}
        description={
          review
            ? "Um olhar pedagógico cuidadoso para cada questão."
            : "Organize, revise e encontre as questões certas para suas avaliações."
        }
      >
        <Button variant="outline" asChild>
          <Link to="/questoes/importar">
            <Upload />
            Importar questões
          </Link>
        </Button>
        <Button onClick={create}>
          <Plus />
          Criar questão
        </Button>
      </PageHeading>
      {review && (
        <div className="notice mb-6">
          <AlertCircle size={18} />
          <span>
            <strong>{rows.length} questões</strong> aguardam uma decisão pedagógica.
          </span>
        </div>
      )}
      <div className="filter-bar">
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por código ou enunciado..."
        />
        <SelectField
          label="Disciplina"
          value={subject}
          onChange={(v) => {
            setSubject(v);
            setPage(1);
          }}
          all="Todas as disciplinas"
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
          label="Dificuldade"
          value={difficulty}
          onChange={setDifficulty}
          all="Dificuldade"
          options={["Fácil", "Média", "Difícil"]}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          all="Todos os status"
          options={["Rascunho", "Pendente de revisão", "Em revisão", "Aprovada", "Rejeitada"]}
        />
        <SelectField
          label="Habilidade"
          value={skill}
          onChange={setSkill}
          all="Todas as habilidades"
          options={skills.map((s) => s.id)}
        />
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>
              {rows.length} questões {review ? "pendentes" : "encontradas"}
            </h2>
            <p>Conteúdo alinhado à BNCC e aos descritores SAEB</p>
          </div>
          <SelectField
            label="Ordenar questões"
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: "Mais recentes" },
              { value: "code", label: "Código crescente" },
            ]}
          />
        </div>
        {batch.length > 0 && (
          <div className="notice mx-5 mb-4">
            <span className="flex-1">{batch.length} selecionadas</span>
            <Button
              size="sm"
              onClick={() => {
                batch.forEach((id) => changeStatus(id, "Aprovada"));
                setBatch([]);
              }}
            >
              Aprovar seleção
            </Button>
          </div>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as questões"
                    checked={current.length > 0 && current.every((q) => batch.includes(q.id))}
                    onChange={(e) => setBatch(e.target.checked ? current.map((q) => q.id) : [])}
                  />
                </th>
                <th>QUESTÃO</th>
                <th>DISCIPLINA / ANO</th>
                <th>HABILIDADE</th>
                <th>DIFICULDADE</th>
                <th>STATUS</th>
                <th>ATUALIZAÇÃO</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {current.map((q) => (
                <tr key={q.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${q.id}`}
                      checked={batch.includes(q.id)}
                      onChange={(e) =>
                        setBatch(
                          e.target.checked ? [...batch, q.id] : batch.filter((x) => x !== q.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs"
                      onClick={() => setSelected(q.id)}
                    >
                      {q.id}
                    </Button>
                    <p className="table-main max-w-72 truncate mt-2">{q.text}</p>
                    <p className="table-sub">{q.source}</p>
                  </td>
                  <td>
                    <span className="table-main">{q.subject}</span>
                    <p className="table-sub">{q.year}</p>
                  </td>
                  <td>
                    <span className="badge">{q.skill}</span>
                  </td>
                  <td>
                    <Badge>{q.difficulty}</Badge>
                  </td>
                  <td>
                    <Badge>{q.status}</Badge>
                  </td>
                  <td>{q.updated}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Ações ${q.id}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(q.id)}>
                          <FileText />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing({ ...q })}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(q)}>
                          <Copy />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeStatus(q.id, "Aprovada")}>
                          <Check />
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDecision({ id: q.id, status: "Pendente de revisão" });
                            setJustification("");
                          }}
                        >
                          <AlertCircle />
                          Solicitar correção
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDecision({ id: q.id, status: "Rejeitada" });
                            setJustification("");
                          }}
                        >
                          <X />
                          Rejeitar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleting(q.id)}>
                          <Trash2 />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
        <div className="pager">
          <span>
            {rows.length
              ? `${(Math.min(page, pages) - 1) * 8 + 1}–${Math.min(page * 8, rows.length)} de ${rows.length} questões`
              : "0 questões"}
          </span>
          <div className="action-row">
            <Button
              variant="outline"
              size="icon"
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <span>
              {Math.min(page, pages)} / {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próxima página"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
      <Modal
        open={Boolean(detail)}
        onClose={() => setSelected(null)}
        title={detail?.id || "Questão"}
        description="Detalhes e histórico pedagógico"
      >
        {detail && (
          <>
            <div className="flex gap-2 mb-5">
              <Badge>{detail.status}</Badge>
              <Badge>{detail.subject}</Badge>
              <Badge>{detail.year}</Badge>
              <Badge>{detail.difficulty}</Badge>
            </div>
            <RichPreview value={detail.text} format={detail.contentFormat} />
            {detail.image && (
              <RichPreview
                value={`<img src="${escapeHtml(detail.image)}" alt="Imagem da questão">`}
                format="HTML"
              />
            )}
            <div className="grid gap-2 my-5">
              {detail.options.map((o, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-xs flex gap-3 ${i === detail.answer ? "bg-success-soft text-success" : ""}`}
                >
                  <strong>{String.fromCharCode(65 + i)}.</strong>
                  <RichPreview
                    value={
                      detail.optionsType === "IMAGEM" && safeImageUrl(o)
                        ? `<img src="${escapeHtml(o)}" alt="Alternativa">`
                        : o
                    }
                    format={detail.optionsType === "IMAGEM" ? "HTML" : detail.contentFormat}
                  />
                  {i === detail.answer && <CheckCircle2 size={16} className="ml-auto" />}
                </div>
              ))}
            </div>
            <p className="subtext">
              <strong>Justificativa:</strong> {detail.reason}
            </p>
            <div className="form-grid mt-5">
              <div>
                <h3>Classificação</h3>
                <p className="subtext">
                  {detail.skill} · {skills.find((s) => s.id === detail.skill)?.descriptor}
                  <br />
                  {skills.find((s) => s.id === detail.skill)?.name}
                </p>
              </div>
              <div>
                <h3>Origem e responsável</h3>
                <p className="subtext">
                  {detail.source} · Página {detail.page || 1}
                  <br />
                  {detail.approvedBy || "Aprovação pendente"} ·{" "}
                  {detail.approvedAt
                    ? new Date(detail.approvedAt).toLocaleString("pt-BR")
                    : detail.updated}
                </p>
              </div>
            </div>
            <h3 className="mt-5">Histórico</h3>
            {detail.history.map((h, i) => (
              <p key={i} className="subtext">
                • {h}
              </p>
            ))}
            <div className="action-row mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing({ ...detail });
                  setSelected(null);
                }}
              >
                <Pencil />
                Editar
              </Button>
              <Button variant="outline" onClick={() => duplicate(detail)}>
                <Copy />
                Duplicar
              </Button>
              <Button onClick={() => changeStatus(detail.id, "Aprovada")}>
                <Check />
                Aprovar
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          state.questions.some((q) => q.id === editing?.id) ? "Editar questão" : "Criar questão"
        }
        description="Preencha o conteúdo e a classificação pedagógica."
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="grid gap-4"
          >
            <label className="field">
              Enunciado
              <textarea
                required
                minLength={10}
                className="control"
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Disciplina
                <SelectField
                  label="Disciplina da questão"
                  value={editing.subject}
                  onChange={(v) =>
                    setEditing({
                      ...editing,
                      subject: v,
                      skill: skills.find((s) => s.subject === v)?.id || skills[0]!.id,
                    })
                  }
                  options={subjects}
                />
              </label>
              <label className="field">
                Ano escolar
                <SelectField
                  label="Ano da questão"
                  value={editing.year}
                  onChange={(v) => setEditing({ ...editing, year: v })}
                  options={["5º ano", "6º ano"]}
                />
              </label>
              <label className="field">
                Habilidade
                <SelectField
                  label="Habilidade da questão"
                  value={editing.skill}
                  onChange={(v) => setEditing({ ...editing, skill: v })}
                  options={skills
                    .filter((s) => s.subject === editing.subject)
                    .map((s) => ({ value: s.id, label: s.id }))}
                />
              </label>
              <label className="field">
                Dificuldade
                <SelectField
                  label="Dificuldade da questão"
                  value={editing.difficulty}
                  onChange={(v) => setEditing({ ...editing, difficulty: v })}
                  options={["Fácil", "Média", "Difícil"]}
                />
              </label>
            </div>
            <h3>Alternativas e gabarito</h3>
            {editing.options.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="answer"
                  aria-label={`Gabarito ${String.fromCharCode(65 + i)}`}
                  checked={editing.answer === i}
                  onChange={() => setEditing({ ...editing, answer: i })}
                />
                <label className="flex items-center gap-2 flex-1">
                  {String.fromCharCode(65 + i)}
                  <input
                    required
                    aria-label={`Alternativa ${String.fromCharCode(65 + i)}`}
                    className="control"
                    value={o}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        options: editing.options.map((x, j) => (j === i ? e.target.value : x)),
                      })
                    }
                  />
                </label>
              </div>
            ))}
            <label className="field">
              Justificativa
              <textarea
                required
                className="control"
                value={editing.reason}
                onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
              />
            </label>
            <div className="action-row justify-end">
              <Button variant="outline" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check />
                Salvar questão
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Excluir questão?"
        description="Questões vinculadas a avaliações ou respostas não podem ser excluídas."
      >
        <div className="action-row justify-end">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                state.assessments.some((a) => a.questions.includes(deleting || "")) ||
                state.applications.some((a) => a.responses.some((r) => r.questionId === deleting))
              ) {
                toast.error("Exclusão impedida: questão vinculada a avaliações ou respostas.");
                return;
              }
              update((s) => ({
                ...s,
                questions: s.questions.filter((q) => q.id !== deleting),
                assessments: s.assessments.map((a) => ({
                  ...a,
                  questions: a.questions.filter((q) => q !== deleting),
                })),
              }));
              log(`Questão ${deleting} excluída`);
              setDeleting(null);
              toast.success("Questão excluída.");
            }}
          >
            <Trash2 />
            Excluir
          </Button>
        </div>
      </Modal>
      <Modal
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
        title={decision?.status === "Rejeitada" ? "Rejeitar questão" : "Solicitar correção"}
        description="Registre a justificativa para orientar a revisão."
      >
        <textarea
          aria-label="Justificativa da decisão"
          className="control"
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Informe o motivo..."
        />
        <Button
          className="mt-4"
          disabled={!justification.trim()}
          onClick={() => {
            if (decision) changeStatus(decision.id, decision.status, justification);
            setDecision(null);
          }}
        >
          Confirmar decisão
        </Button>
      </Modal>
    </div>
  );
}
