import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMentary } from "./store";
import { profiles, downloadCsv } from "./data";
import { importUsers, userErrors, type User } from "./users-model";
import { PageHeading, Panel, SearchField, SelectField, Modal, Empty } from "./ui";
export function UsersPage() {
  const { state, update, log } = useMentary();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<User | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof importUsers> | null>(null);
  const [card, setCard] = useState("");
  const [qr, setQr] = useState("");
  const [deleting, setDeleting] = useState<User | null>(null);
  const selected = state.students.find((s) => s.id === card);
  useEffect(() => {
    let active = true;
    setQr("");
    if (card)
      void QRCode.toDataURL(JSON.stringify({ type: "mentary-student", id: card }), {
        width: 240,
        color: { dark: "#332389", light: "#ffffff" },
      }).then((url) => {
        if (active) setQr(url);
      });
    return () => {
      active = false;
    };
  }, [card]);
  const save = () => {
    if (!edit) return;
    const errs = userErrors(edit, state.users);
    setErrors(errs);
    if (errs.length) return;
    const u = { ...edit, review: edit.profile === "Professora" && edit.review };
    update((s) => ({
      ...s,
      reviewPermission: u.id === "u1" ? u.review : s.reviewPermission,
      users: s.users.some((x) => x.id === u.id)
        ? s.users.map((x) => (x.id === u.id ? u : x))
        : [...s.users, u],
    }));
    log(`Usuário ${u.name}: cadastro/perfil/permissão de revisão atualizado`);
    setEdit(null);
    toast.success("Usuário salvo localmente.");
  };
  const linked = (u: User) =>
    Boolean(
      u.studentId &&
      state.applications.some((a) => a.responses.some((r) => r.studentId === u.studentId)),
    ) ||
    state.classes.some((c) => c.teacher === u.name) ||
    state.questions.some((q) => q.approvedBy === u.name) ||
    state.plans.some((p) => p.responsible === u.name || p.approvedBy === u.name);
  return (
    <div className="page">
      <PageHeading
        title="Usuários e identificação"
        description="Cadastros locais para validar a interface de administração. A autorização real depende da integração com a Mentary."
      >
        <Button
          onClick={() => {
            setErrors([]);
            setEdit({
              id: crypto.randomUUID(),
              name: "",
              email: "",
              birthDate: "",
              profile: "Professora",
              review: false,
            });
          }}
        >
          Cadastrar usuário
        </Button>
      </PageHeading>
      <div className="filter-bar">
        <SearchField value={search} onChange={setSearch} placeholder="Buscar nome ou e-mail" />
      </div>
      <Panel title="Usuários cadastrados">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Nome", "E-mail", "Nascimento", "Perfil", "Revisão", "Ações"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.users
                .filter((u) => (u.name + u.email).toLowerCase().includes(search.toLowerCase()))
                .map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.birthDate}</td>
                    <td>{u.profile}</td>
                    <td>{u.review ? "Permitida" : "Sem permissão"}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEdit({ ...u });
                          setErrors([]);
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(u)}>
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Importar usuários por CSV"
        className="mt-5"
        description="Revise as linhas válidas e os erros antes de confirmar. Registros inválidos não serão cadastrados."
      >
        <div className="p-5 grid gap-4">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv("modelo-usuarios.csv", [
                ["nome", "email", "data_nascimento", "papel"],
                ["Nome de exemplo", "exemplo@escola.edu.br", "1990-01-01", "Professora"],
              ])
            }
          >
            Baixar modelo CSV
          </Button>
          <input
            aria-label="Importar usuários CSV"
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 2 * 1024 * 1024) throw Error("CSV deve ter até 2 MB.");
                setPreview(importUsers(await f.text(), state.users));
              } catch (err) {
                toast.error((err as Error).message);
              }
              e.target.value = "";
            }}
          />
          {preview && (
            <>
              <p>
                {preview.valid.length} usuários válidos · {preview.errors.length} linhas com erro
              </p>
              {preview.valid.map((u) => (
                <p key={u.id}>
                  {u.name} · {u.email} · {u.profile}
                </p>
              ))}
              <div role="status">
                {preview.errors.map((e) => (
                  <p key={e} className="text-destructive">
                    {e}
                  </p>
                ))}
              </div>
              <Button
                disabled={!preview.valid.length}
                onClick={() => {
                  const valid = preview.valid.filter((u) => !userErrors(u, state.users).length);
                  update((s) => ({ ...s, users: [...s.users, ...valid] }));
                  log(`${valid.length} usuários importados por CSV`);
                  setPreview(null);
                  toast.success(`${valid.length} usuários cadastrados.`);
                }}
              >
                Confirmar importação dos válidos
              </Button>
            </>
          )}
        </div>
      </Panel>
      <Panel
        title="Carteirinhas dos estudantes"
        className="mt-5"
        description="QR Code gerado localmente a partir do identificador do estudante cadastrado."
      >
        <div className="p-5">
          <SelectField
            label="Estudante para carteirinha"
            value={card}
            onChange={setCard}
            all="Selecione um estudante"
            options={state.students.map((s) => ({ value: s.id, label: s.name }))}
          />
          {selected && (
            <>
              <article className="student-card mt-5">
                <img src="/marca_mentary_horizontal.webp" alt="Mentary" width="180" />
                <h2>{selected.name}</h2>
                <p>{state.classes.find((c) => c.id === selected.classId)?.name}</p>
                <p>
                  {
                    state.schools.find(
                      (s) =>
                        s.id === state.classes.find((c) => c.id === selected.classId)?.schoolId,
                    )?.name
                  }
                </p>
                <p>Matrícula: {selected.id}</p>
                {qr && (
                  <img
                    src={qr}
                    alt={`QR Code do estudante ${selected.name}`}
                    width="180"
                    height="180"
                  />
                )}
              </article>
              <div className="action-row mt-4 no-print">
                <Button
                  onClick={() => {
                    document.body.classList.add("printing-card");
                    window.print();
                    document.body.classList.remove("printing-card");
                    log(`Carteirinha gerada: ${selected.id}`);
                  }}
                >
                  Imprimir carteirinha / PDF
                </Button>
                {qr && (
                  <a
                    className="text-primary underline"
                    href={qr}
                    download={`qr-${selected.id}.png`}
                  >
                    Baixar QR Code
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </Panel>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title="Cadastro e permissões">
        {edit && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label className="field">
              Nome
              <input
                className="control"
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label className="field">
              E-mail
              <input
                className="control"
                required
                type="email"
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </label>
            <label className="field">
              Data de nascimento
              <input
                className="control"
                required
                type="date"
                value={edit.birthDate}
                onChange={(e) => setEdit({ ...edit, birthDate: e.target.value })}
              />
            </label>
            <SelectField
              label="Perfil de acesso"
              value={edit.profile}
              onChange={(v) => setEdit({ ...edit, profile: v as User["profile"] })}
              options={[...profiles]}
            />
            <label className="flex gap-2">
              <input
                type="checkbox"
                disabled={edit.profile !== "Professora"}
                checked={edit.review}
                onChange={(e) => setEdit({ ...edit, review: e.target.checked })}
              />
              Permitir revisão de questões
            </label>
            {errors.map((e) => (
              <p role="alert" key={e}>
                {e}
              </p>
            ))}
            <Button type="submit">Salvar usuário</Button>
          </form>
        )}
      </Modal>
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Excluir usuário?">
        {deleting &&
          (linked(deleting) ? (
            <p role="alert">
              Exclusão impedida: há turmas, aprovações, resultados ou planos vinculados a este
              usuário. Preserve os registros e ajuste as permissões de acesso.
            </p>
          ) : (
            <>
              <p>Remover {deleting.name} do cadastro local?</p>
              <Button
                variant="destructive"
                onClick={() => {
                  update((s) => ({ ...s, users: s.users.filter((u) => u.id !== deleting.id) }));
                  log(`Usuário removido: ${deleting.name}`);
                  setDeleting(null);
                }}
              >
                Confirmar exclusão
              </Button>
            </>
          ))}
      </Modal>
    </div>
  );
}
