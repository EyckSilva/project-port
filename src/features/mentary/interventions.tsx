import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMentary } from "./store";
import { skills, type Plan } from "./data";
import { aggregate } from "./results";
import { PageHeading, Panel, SelectField, Modal, Badge, Empty } from "./ui";
export function Interventions() {
  const { state, update, log } = useMentary();
  const [edit, setEdit] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const create = () =>
    setEdit({
      id: crypto.randomUUID(),
      title: "",
      skill: "",
      classId: state.classes[0]?.id || "",
      responsible: state.settings.name,
      deadline: "",
      strategy: "",
      status: "Rascunho",
      studentIds: [],
      questionIds: [],
      baseline: state.applications[0]?.id,
      followup: state.applications.at(-1)?.id,
    });
  const persist = (approve = false) => {
    if (!edit) return;
    if (
      !edit.title.trim() ||
      !edit.skill ||
      !edit.classId ||
      !edit.strategy.trim() ||
      !edit.deadline ||
      !edit.responsible.trim()
    ) {
      setError("Preencha título, habilidade, turma, estratégia, prazo e responsável.");
      return;
    }
    const plan = {
      ...edit,
      ...(approve
        ? {
            status: "Aprovado",
            approvedBy: state.settings.name,
            approvedAt: new Date().toISOString(),
          }
        : {}),
    };
    update((s) => ({
      ...s,
      plans: s.plans.some((p) => p.id === plan.id)
        ? s.plans.map((p) => (p.id === plan.id ? plan : p))
        : [...s.plans, plan],
    }));
    log(`Plano ${plan.title}: ${plan.status}`);
    setEdit(null);
    setError("");
    toast.success("Plano salvo.");
  };
  const result = (p: Plan, id?: string) =>
    aggregate(
      state.applications
        .find((a) => a.id === id)
        ?.responses.filter(
          (r) =>
            r.classId === p.classId &&
            (!p.studentIds?.length || p.studentIds.includes(r.studentId)) &&
            state.questions.find((q) => q.id === r.questionId)?.skill === p.skill,
        ) || [],
      state.questions,
    );
  return (
    <div className="page">
      <PageHeading
        title="Recomposição da aprendizagem"
        description="Sugestões por regras locais, com revisão e aprovação humana antes da aplicação."
      >
        <Button onClick={create}>Criar plano de intervenção</Button>
      </PageHeading>
      <div className="grid-two">
        {state.plans.map((p) => {
          const before = result(p, p.baseline),
            after = result(p, p.followup);
          return (
            <Panel
              key={p.id}
              title={p.title}
              description={`${p.responsible} · Prazo ${p.deadline}`}
            >
              <div className="p-5 grid gap-3">
                <Badge>{p.status}</Badge>
                <p>
                  {p.skill} · {skills.find((s) => s.id === p.skill)?.descriptor}
                </p>
                <p>{p.strategy}</p>
                <p className="subtext">
                  {p.studentIds?.length || "Toda a turma"} estudantes · {p.questionIds?.length || 0}{" "}
                  questões selecionadas
                </p>
                <p>
                  Diagnóstico: {before.score ?? "—"}% → acompanhamento: {after.score ?? "—"}%{" "}
                  {before.score !== null && after.score !== null
                    ? `(${(after.score - before.score).toFixed(1)} p.p.)`
                    : ""}
                </p>
                <p className="subtext">
                  Amostras: {before.students} / {after.students} estudantes. Aplicações:{" "}
                  {state.applications.find((a) => a.id === p.baseline)?.name || "Não selecionada"} /{" "}
                  {state.applications.find((a) => a.id === p.followup)?.name || "Não selecionada"}
                </p>
                <p className="subtext">
                  Aprovação: {p.approvedBy || "Pendente"}{" "}
                  {p.approvedAt ? new Date(p.approvedAt).toLocaleString("pt-BR") : ""}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEdit({ ...p });
                    setError("");
                  }}
                >
                  Revisar e acompanhar
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
      {!state.plans.length && <Empty />}
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Revisar plano de intervenção"
      >
        {edit && (
          <div className="grid gap-4">
            <label className="field">
              Título
              <input
                className="control"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <SelectField
              label="Turma do plano"
              value={edit.classId}
              onChange={(v) =>
                setEdit({
                  ...edit,
                  classId: v,
                  studentIds: [],
                  approvedAt: undefined,
                  approvedBy: undefined,
                  status: "Rascunho",
                })
              }
              options={state.classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              label="Habilidade crítica"
              value={edit.skill}
              onChange={(v) =>
                setEdit({
                  ...edit,
                  skill: v,
                  questionIds: [],
                  status: "Rascunho",
                  approvedAt: undefined,
                  approvedBy: undefined,
                })
              }
              all="Selecione habilidade/descritor"
              options={skills.map((s) => ({
                value: s.id,
                label: `${s.id} · ${s.descriptor} · ${s.name}`,
              }))}
            />
            <Button
              variant="outline"
              disabled={!edit.skill}
              onClick={() => {
                const latest = state.applications.at(-1);
                const answers = latest?.responses || [];
                const students = state.students.filter(
                  (s) =>
                    s.classId === edit.classId &&
                    (aggregate(
                      answers.filter(
                        (r) =>
                          r.studentId === s.id &&
                          state.questions.find((q) => q.id === r.questionId)?.skill === edit.skill,
                      ),
                      state.questions,
                    ).score ?? 100) < state.thresholds.attention,
                );
                const unanswered = state.questions.filter(
                  (q) =>
                    q.status === "Aprovada" &&
                    q.skill === edit.skill &&
                    !answers.some(
                      (r) => r.questionId === q.id && students.some((s) => s.id === r.studentId),
                    ),
                );
                const related = state.questions.filter(
                  (q) => q.status === "Aprovada" && q.skill === edit.skill,
                );
                setEdit({
                  ...edit,
                  studentIds: students.map((s) => s.id),
                  questionIds: (unanswered.length ? unanswered : related)
                    .slice(0, 5)
                    .map((q) => q.id),
                  strategy: `1. Revisão mediada de ${skills.find((s) => s.id === edit.skill)?.name}.\n2. Resolução em pequenos grupos com questões relacionadas.\n3. Discussão das estratégias e registro das dificuldades.\n4. Nova avaliação de acompanhamento.`,
                  status: "Rascunho",
                  approvedAt: undefined,
                  approvedBy: undefined,
                });
                toast.info(
                  "Sugestão por regras locais; serviço de IA não conectado. Revise antes de aprovar.",
                );
              }}
            >
              Sugerir grupo, atividades e questões
            </Button>
            <fieldset>
              <legend>Estudantes (sem seleção: toda a turma)</legend>
              {state.students
                .filter((s) => s.classId === edit.classId)
                .map((s) => (
                  <label className="list-item" key={s.id}>
                    <input
                      type="checkbox"
                      checked={edit.studentIds?.includes(s.id) || false}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          studentIds: e.target.checked
                            ? [...(edit.studentIds || []), s.id]
                            : edit.studentIds?.filter((id) => id !== s.id),
                          status: "Rascunho",
                          approvedAt: undefined,
                        })
                      }
                    />
                    {s.name}
                  </label>
                ))}
            </fieldset>
            <fieldset>
              <legend>Questões relacionadas (revise as já respondidas)</legend>
              {state.questions
                .filter((q) => q.skill === edit.skill && q.status === "Aprovada")
                .map((q) => (
                  <label className="list-item" key={q.id}>
                    <input
                      type="checkbox"
                      checked={edit.questionIds?.includes(q.id) || false}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          questionIds: e.target.checked
                            ? [...(edit.questionIds || []), q.id]
                            : edit.questionIds?.filter((id) => id !== q.id),
                          status: "Rascunho",
                          approvedAt: undefined,
                        })
                      }
                    />
                    <span>
                      {q.id} · {q.text}
                    </span>
                  </label>
                ))}
            </fieldset>
            <label className="field">
              Estratégia e sequência de aprendizagem
              <textarea
                className="control"
                rows={5}
                value={edit.strategy}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    strategy: e.target.value,
                    status: "Rascunho",
                    approvedAt: undefined,
                  })
                }
              />
            </label>
            <label className="field">
              Responsável
              <input
                className="control"
                value={edit.responsible}
                onChange={(e) => setEdit({ ...edit, responsible: e.target.value })}
              />
            </label>
            <label className="field">
              Prazo
              <input
                type="date"
                className="control"
                value={edit.deadline}
                onChange={(e) => setEdit({ ...edit, deadline: e.target.value })}
              />
            </label>
            <SelectField
              label="Aplicação diagnóstica"
              value={edit.baseline || ""}
              onChange={(v) => setEdit({ ...edit, baseline: v })}
              all="Selecione diagnóstico"
              options={state.applications.map((a) => ({ value: a.id, label: a.name }))}
            />
            <SelectField
              label="Aplicação após intervenção"
              value={edit.followup || ""}
              onChange={(v) => setEdit({ ...edit, followup: v })}
              all="Selecione acompanhamento"
              options={state.applications.map((a) => ({ value: a.id, label: a.name }))}
            />
            <SelectField
              label="Status do plano"
              value={edit.status}
              onChange={(v) => setEdit({ ...edit, status: v })}
              options={edit.approvedAt ? ["Aprovado", "Aplicado", "Concluído"] : ["Rascunho"]}
            />
            {error && <p role="alert">{error}</p>}
            <div className="action-row">
              <Button variant="outline" onClick={() => persist()}>
                Salvar plano
              </Button>
              <Button onClick={() => persist(true)}>Aprovar plano revisado</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
