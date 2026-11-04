import { Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  GraduationCap,
  Network,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "./data";
import { useMentary } from "./store";
import { MentaryOrb } from "./mentary-orb";

type LoginRole = { value: Profile; label: string; scope: string; icon: LucideIcon };

export const loginRoles: LoginRole[] = [
  { value: "Professora", label: "Professor(a)", scope: "Turmas e questões", icon: GraduationCap },
  {
    value: "Coordenadora",
    label: "Coordenação",
    scope: "Revisão pedagógica",
    icon: ClipboardCheck,
  },
  {
    value: "Gestor Escolar",
    label: "Gestor(a) escolar",
    scope: "Unidade escolar",
    icon: Building2,
  },
  { value: "Gestora", label: "Gestão da rede", scope: "Secretaria de educação", icon: Network },
];

const DEFAULT_ROLE: Profile = "Professora";

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
      <div className="auth-panel">
        <MentaryOrb />
        <p className="auth-eyebrow">Mentary</p>
        <h1 className="auth-title">Acesse a plataforma</h1>
        <p className="auth-subtitle">Selecione seu perfil e entre com o e-mail institucional.</p>

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
                  <span className="auth-role-icon">
                    <Icon />
                  </span>
                  <span className="auth-role-text">
                    <strong>{label}</strong>
                    <small>{scope}</small>
                  </span>
                  <Check className="auth-role-check" />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="auth-divider">Credenciais de acesso</div>

          <div className="auth-field">
            <Label htmlFor="auth-email" className="auth-label">
              E-mail institucional
            </Label>
            <Input
              id="auth-email"
              className="auth-input"
              type="email"
              autoComplete="email"
              placeholder="nome@escola.edu.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <div className="auth-field-row">
              <Label htmlFor="auth-password" className="auth-label">
                Senha
              </Label>
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

          <Button type="submit" size="lg" className="auth-submit">
            Entrar como {roleLabel}
            <ArrowRight />
          </Button>
        </form>

        <footer className="auth-foot">
          <p>
            Ambiente demonstrativo: os dados são fictícios e ficam salvos apenas neste navegador.
          </p>
          <p className="auth-copy">© 2026 Mentary. Todos os direitos reservados.</p>
        </footer>
      </div>
    </main>
  );
}
