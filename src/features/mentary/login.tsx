import { Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "./data";
import { useMentary } from "./store";
import { MentaryMark, MentaryOrb } from "./mentary-orb";

type LoginRole = { value: Profile; label: string; scope: string; icon: LucideIcon };

export const loginRoles: LoginRole[] = [
  {
    value: "Estudante",
    label: "Sou estudante",
    scope: "Entre com o seu código de acesso",
    icon: GraduationCap,
  },
  {
    value: "Professora",
    label: "Sou professor(a)",
    scope: "Turmas, questões e simulados",
    icon: Presentation,
  },
  {
    value: "Gestor Escolar",
    label: "Sou gestor(a)",
    scope: "Gestão da escola ou da rede de ensino",
    icon: Building2,
  },
];

const DEFAULT_ROLE: Profile = "Estudante";

export function LoginPage() {
  const { state, ready, setProfile, setAuthenticated } = useMentary();
  const navigate = useNavigate();
  const [role, setRole] = useState<Profile>(DEFAULT_ROLE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (ready && state.authenticated) return <Navigate to="/dashboard" replace />;

  const selected = loginRoles.find((r) => r.value === role);
  const roleLabel = selected?.label ?? "Professor(a)";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setProfile(role);
    setAuthenticated(true);
    toast.success(`Acesso liberado como ${roleLabel}`);
    navigate({ to: "/dashboard" });
  };

  const requestPasswordRecovery = () =>
    toast.info("Ambiente demonstrativo: a recuperação de senha por e-mail não está habilitada.");

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-welcome" aria-label="Apresentação Mentary">
          <div className="auth-welcome-glow" aria-hidden="true" />
          <div className="auth-welcome-art">
            <MentaryOrb />
          </div>
          <div className="auth-welcome-copy">
            <p className="auth-eyebrow">Educação que transforma</p>
            <h1>Bem-vindo à <strong>Mentary</strong></h1>
            <span className="auth-welcome-line" aria-hidden="true" />
            <p>Acesso seguro e gestão educacional<br />com mais eficiência, integração e resultados.</p>
          </div>
        </section>

        <section className="auth-card" aria-label="Acesso à plataforma">
          <div className="auth-card-head">
            <div className="auth-card-brand" aria-label="Mentary">
              <MentaryMark />
              <span>MENTARY</span>
            </div>
            <p className="auth-eyebrow">Acesso seguro</p>
            <h2>Acesse a plataforma</h2>
            <p>Entre com seu perfil e acesse a gestão educacional da sua rede.</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <fieldset className="auth-fieldset">
              <legend className="auth-label">Perfil de acesso</legend>
              <div className="auth-role-grid" role="group" aria-label="Perfil de acesso">
                {loginRoles.map(({ value, label, scope, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    aria-pressed={role === value}
                    data-state={role === value ? "on" : "off"}
                    className="auth-role"
                  >
                    <span className="auth-role-icon"><Icon /></span>
                    <span className="auth-role-text">
                      <strong>{label}</strong>
                      <small>{scope}</small>
                    </span>
                    <Check className="auth-role-check" />
                    <ArrowRight className="auth-role-arrow" />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="auth-field">
              <Label htmlFor="auth-email" className="auth-label">E-mail institucional</Label>
              <Input
                id="auth-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                placeholder="Digite seu e-mail institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-field-row">
                <Label htmlFor="auth-password" className="auth-label">Senha</Label>
                <button type="button" className="auth-link" onClick={requestPasswordRecovery}>
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="auth-password"
                className="auth-input"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={4}
                required
              />
            </div>

            <label className="auth-remember">
              <input type="checkbox" />
              <span>Lembrar-me</span>
            </label>
            <Button type="submit" size="lg" className="auth-submit">
              Entrar <ArrowRight />
            </Button>
          </form>
          <p className="auth-secure">Acesso seguro, criptografado e protegido.</p>
          <footer className="auth-foot">
            <p className="auth-copy">© 2026 Mentary. Todos os direitos reservados.</p>
          </footer>
        </section>
      </div>
    </main>
  );
}
