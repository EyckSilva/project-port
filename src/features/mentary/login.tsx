import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
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

type LoginRole = { value: Profile; label: string; scope: string; icon: LucideIcon };

export const loginRoles: LoginRole[] = [
  {
    value: "Coordenadora",
    label: "Sou coordenador(a)",
    scope: "Revisão Pedagógica",
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
    scope: "Unidade Escolar",
    icon: Building2,
  },
];

const DEFAULT_ROLE: Profile = "Coordenadora";

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
    navigate({ to: "/recuperar-senha" });

  return (
    <main className="auth-page">
      <div className="auth-split-layout">
        <section className="auth-visual" aria-label="Apresentação Mentary">
          <img
            className="auth-hero-image"
            src="/capivara2.png"
            alt="Mascote Mentary com elementos de tecnologia educacional"
          />
          <div className="auth-visual-copy">
            <h1>Bem-vindo a <strong>Mentary</strong></h1>
            <span className="auth-welcome-line" aria-hidden="true" />
            <p>
              Simulados, avaliações e acompanhamento do <span className="auth-copy-orange">desempenho</span><br />
              em um só lugar, para <span className="auth-copy-cyan">estudantes</span>, professores e <span className="auth-copy-pink">gestores.</span>
            </p>
          </div>
        </section>

        <section className="auth-login-card" aria-label="Acesso à plataforma">
          <h2 className="auth-title">Acesse a plataforma</h2>
          <p className="auth-subtitle">Entre com seu perfil e acesse a gestão educacional da sua rede.</p>

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
          <p className="auth-secure">© 2026 Mentary</p>
          
        </section>
      </div>
    </main>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    toast.success("Se o e-mail estiver cadastrado, você receberá as instruções de acesso.");
  };

  return (
    <main className="auth-recovery-page">
      <div className="auth-recovery-layout">
        <section className="auth-visual" aria-label="Apresentação Mentary">
          <img
            className="auth-hero-image"
            src="/capivara2.png"
            alt="Mascote Mentary com elementos de tecnologia educacional"
          />
          <div className="auth-visual-copy">
            <h1>Bem-vindo a <strong>Mentary</strong></h1>
            <span className="auth-welcome-line" aria-hidden="true" />
            <p>
              Simulados, avaliações e acompanhamento do <span className="auth-copy-orange">desempenho</span><br />
              em um só lugar, para <span className="auth-copy-cyan">estudantes</span>, professores e <span className="auth-copy-pink">gestores.</span>
            </p>
          </div>
        </section>
        <section className="auth-recovery-card" aria-labelledby="recovery-title">
          <Link className="auth-recovery-back" to="/login">
            <ArrowLeft />
            Voltar para o acesso
          </Link>
          <p className="auth-recovery-eyebrow">Recuperar acesso</p>
          <h1 id="recovery-title">Esqueceu sua senha?</h1>
          <p className="auth-recovery-description">
            Não se preocupe, informe o seu e-mail para receber as instruções de acesso.
          </p>
          <form className="auth-recovery-form" onSubmit={submit}>
            <Label htmlFor="recovery-email">E-mail institucional</Label>
            <Input
              id="recovery-email"
              type="email"
              placeholder="Digite o seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Button type="submit" size="lg">Receber senha</Button>
          </form>
          <p className="auth-secure">© 2026 Mentary</p>
        </section>
      </div>
    </main>
  );
}
