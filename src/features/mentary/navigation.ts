import {
  Bell,
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  ChartNoAxesCombined,
  ClipboardList,
  FileChartColumn,
  FileSearch,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  School,
  Settings,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { Profile } from "./data";

export const teacherNavGroups = [
  {
    label: "FUNCIONALIDADES DO PROFESSOR",
    items: [
      { title: "Extração de questões", path: "/dashboard", icon: LayoutDashboard },
      { title: "Minhas turmas", path: "/turmas", icon: School },
      { title: "Alunos", path: "/meu-desempenho", icon: Users },
      { title: "Avaliações e simulados", path: "/simulados", icon: ClipboardList },
      { title: "Banco de questões", path: "/questoes", icon: BookOpenCheck },
      { title: "Extração e revisão de questões", path: "/questoes/importar", icon: FileSearch },
      { title: "Habilidades BNCC/SAEB", path: "/habilidades", icon: GraduationCap },
      { title: "Desempenho", path: "/analise-aprendizagem", icon: ChartNoAxesColumnIncreasing },
      { title: "Recomposição da aprendizagem", path: "/recomposicao", icon: Sparkles },
      { title: "Relatórios", path: "/relatorios", icon: FileChartColumn },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { title: "Histórico de atividades", path: "/atividades", icon: History },
      { title: "Configurações", path: "/configuracoes", icon: Settings },
    ],
  },
];

export const managerNavGroups = [
  {
    label: "FUNCIONALIDADES DO GESTOR",
    items: [
      { title: "Resultados escolares", path: "/dashboard", icon: LayoutDashboard },
      {
        title: "Comparação entre turmas",
        path: "/dashboard/turmas",
        icon: ChartNoAxesColumnIncreasing,
      },
      { title: "Evolução escolar", path: "/dashboard/evolucao", icon: ChartNoAxesCombined },
      { title: "Análise por descritor", path: "/dashboard/descritores", icon: Target },
      { title: "Alertas de desempenho", path: "/dashboard/alertas", icon: Bell },
      { title: "Informações gerenciais", path: "/dashboard/gerencial", icon: FileText },
    ],
  },
];

/** Navigation shown in the workspace while only question extraction is enabled. */
export const workspaceNavGroups = [
  {
    label: "FERRAMENTAS",
    items: [{ title: "Extração de questões", path: "/dashboard", icon: FileSearch }],
  },
];

export function getNavGroups(profile: Profile) {
  if (profile === "Gestor Escolar") return managerNavGroups;
  if (profile === "Administrador")
    return [
      ...managerNavGroups,
      {
        label: "ADMINISTRAÇÃO DA REDE",
        items: [{ title: "Configurações da rede", path: "/configuracoes", icon: Settings }],
      },
      {
        label: "USUÁRIOS",
        items: [{ title: "Usuários e carteirinhas", path: "/usuarios", icon: Users }],
      },
    ];
  return workspaceNavGroups;
}

export const allNav = [...teacherNavGroups, ...managerNavGroups].flatMap((group) => group.items);
