import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronsLeft, Menu, X, ChevronRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getNavGroups } from "./navigation";
import { useMentary } from "./store";
import { DemoNote, IconButton } from "./ui";
export function AppShell({ children }: { children: ReactNode }) {
  const { state, update, setAuthenticated } = useMentary();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobile, setMobile] = useState(false);
  const compact = state.settings.compact;
  const navGroups = getNavGroups(state.profile);
  const initials = state.settings.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const current =
    navGroups.flatMap((group) => group.items).find((item) => item.path === path) ??
    navGroups.flatMap((group) => group.items).find((item) => path.startsWith(`${item.path}/`));
  const nestedTitle =
    path === "/simulados/criar"
      ? "Criar roteiro"
      : path === "/simulados/validador"
        ? "Validador pedagógico"
        : path.startsWith("/questoes/")
          ? "Revisar questões"
          : "";
  return (
    <div className="app-frame">
      <div className={`mobile-overlay ${mobile ? "open" : ""}`} onClick={() => setMobile(false)} />
      <aside className={`app-sidebar ${compact ? "compact" : ""} ${mobile ? "mobile-open" : ""}`}>
        <div className="brand-block">
          <Link to="/dashboard" className="flex items-center gap-2" title="Mentary">
            <div className="brand-mark" aria-label="Mentary">
              <img src="/marca_mentary_horizontal.webp" alt="" />
            </div>
          </Link>
          {mobile && (
            <IconButton label="Fechar menu" onClick={() => setMobile(false)}>
              <X />
            </IconButton>
          )}
        </div>
        <nav className="sidebar-scroll">
          {navGroups.map((g) => (
            <div key={g.label}>
              <div className="nav-label">{g.label}</div>
              {g.items.map((n) => (
                <Link
                  key={n.path}
                  to={n.path}
                  className="nav-link"
                  data-status={path === n.path ? "active" : undefined}
                  title={compact ? n.title : undefined}
                  onClick={() => setMobile(false)}
                >
                  <n.icon />
                  <span>{n.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-info flex-1">
            <h3 className="text-xs">{state.settings.name}</h3>
            <p className="subtext">{state.profile}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu do usuário">
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Conta atual · {state.profile}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/login" onClick={() => setAuthenticated(false)}>
                  <LogOut />
                  Sair
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className={`app-main ${compact ? "compact" : ""}`}>
        <header className="app-header">
          <IconButton
            label="Recolher ou abrir menu"
            onClick={() => {
              if (window.innerWidth <= 800) setMobile(!mobile);
              else update((s) => ({ ...s, settings: { ...s.settings, compact: !compact } }));
            }}
          >
            <span className="hidden md:block">
              <ChevronsLeft size={17} />
            </span>
            <span className="md:hidden">
              <Menu size={19} />
            </span>
          </IconButton>
          <div className="header-context">
            <span>Plataforma</span>
            <ChevronRight size={12} />
            <span className="text-foreground font-medium">{current?.title || "Dashboard"}</span>
            {nestedTitle && (
              <>
                <ChevronRight size={12} />
                <span className="text-foreground font-medium">{nestedTitle}</span>
              </>
            )}
          </div>
          <div className="header-actions">
            <span className="badge hidden lg:inline-flex">Ambiente demonstrativo</span>
            <span title={`${state.settings.name} · ${state.profile}`} className="avatar">
              {initials}
            </span>
          </div>
        </header>
        {children}
        <footer className="flex justify-between px-8 pb-6">
          <span className="demo-note">© 2026 Mentary</span>
          <DemoNote />
        </footer>
      </div>
    </div>
  );
}
