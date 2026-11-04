import { useMentary } from "./store";
import { aggregate } from "./results";
import { PageHeading, Panel } from "./ui";
import { skills } from "./data";
export function StudentHome() {
  const { state } = useMentary();
  const student = state.students[0];
  return (
    <div className="page">
      <PageHeading
        title="Meu desempenho"
        description="Perfil demonstrativo de estudante. A conta real será vinculada pela autenticação Mentary."
      />
      <Panel title={student?.name || "Estudante"}>
        <div className="p-5">
          {skills.map((s) => {
            const result = aggregate(
              state.applications
                .at(-1)
                ?.responses.filter(
                  (r) =>
                    r.studentId === student?.id &&
                    state.questions.find((q) => q.id === r.questionId)?.skill === s.id,
                ) || [],
              state.questions,
            );
            return (
              <p key={s.id} className="list-item">
                {s.id} · {s.name}: {result.score ?? "Sem dados"}
                {result.score === null ? "" : "%"}
              </p>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
