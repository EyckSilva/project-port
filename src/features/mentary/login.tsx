import { Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
  Check,
  ClipboardCheck,
  GraduationCap,
  Network,
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
  { value: "Professora", label: "Professor(a)", scope: "Turmas e questões", icon: GraduationCap },
  { value: "Coordenadora", label: "Coordenação", scope: "Revisão pedagógica", icon: ClipboardCheck },
  { value: "Gestor Escolar", label: "Gestor(a) escolar", scope: "Unidade escolar", icon: Building2 },
  { value: "Gestora", label: "Gestão da rede", scope: "Secretaria de educação", icon: Network },
];

const DEFAULT_ROLE: Profile = "Professora";

export function LoginPage() {
  const { state, ready, setProfile, setAuthenticated } = useMentary();
  const navigate = useNavigate();
  const [role, setRole] = useState<Profile>(DEFAULT_ROLE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            <span className="auth-feature auth-feature-graduation" aria-hidden="true"><GraduationCap /></span>
            <span className="auth-feature auth-feature-chart" aria-hidden="true"><BarChart3 /></span>
            <span className="auth-feature auth-feature-book" aria-hidden="true"><BookOpen /></span>
            <span className="auth-feature auth-feature-users" aria-hidden="true"><Users /></span>
          </div>
          <div className="auth-welcome-copy">
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
              <button type="button" className={"auth-student-access" + (role === "Estudante" ? " selected" : "")} aria-pressed={role === "Estudante"} onClick={() => setRole("Estudante")}>
                <GraduationCap size={15} aria-hidden="true" /> Acesso do estudante <ArrowRight size={14} aria-hidden="true" />
              </button>
            </fieldset>

            <div className="auth-field">
              <Label htmlFor="auth-email" className="auth-label">E-mail institucional</Label>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
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
            </div>

            <div className="auth-field">
              <Label htmlFor="auth-password" className="auth-label">Senha</Label>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <Input
                  id="auth-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={4}
                  required
                />
                <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-form-options">
              <label className="auth-remember">
                <input type="checkbox" />
                <span>Lembrar-me</span>
              </label>
              <button type="button" className="auth-link" onClick={requestPasswordRecovery}>Esqueceu a senha?</button>
            </div>
            <Button type="submit" size="lg" className="auth-submit">
              Entrar <ArrowRight />
            </Button>
          </form>
          <p className="auth-secure"><ShieldCheck size={15} aria-hidden="true" /> Ambiente demonstrativo de acesso</p>
          <footer className="auth-foot">
            <p className="auth-copy">© 2026 Mentary. Todos os direitos reservados.</p>
          </footer>
        </section>
      </div>
    </main>
  );
}
