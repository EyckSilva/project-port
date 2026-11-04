import { profiles, type Profile } from "./data";
import { parseCsv } from "./rules";
export type User = {
  id: string;
  name: string;
  email: string;
  birthDate: string;
  profile: Profile;
  review: boolean;
  studentId?: string;
};
export const initialUsers: User[] = [
  {
    id: "u1",
    name: "Carla Oliveira",
    email: "carla@escola.edu.br",
    birthDate: "1990-05-10",
    profile: "Professora",
    review: true,
  },
  {
    id: "u2",
    name: "Ricardo Nascimento",
    email: "ricardo@escola.edu.br",
    birthDate: "1985-03-12",
    profile: "Administrador",
    review: false,
  },
];
export function userErrors(u: User, users: User[]) {
  const date = new Date(u.birthDate + "T12:00:00");
  return [
    ...(!u.name.trim() ? ["Nome é obrigatório."] : []),
    ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) ? ["E-mail inválido."] : []),
    ...(users.some((x) => x.id !== u.id && x.email.toLowerCase() === u.email.toLowerCase())
      ? ["E-mail já cadastrado."]
      : []),
    ...(!/^\d{4}-\d{2}-\d{2}$/.test(u.birthDate) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== u.birthDate ||
    date > new Date()
      ? ["Data de nascimento inválida. Use AAAA-MM-DD."]
      : []),
    ...(!profiles.includes(u.profile) ? ["Perfil inválido."] : []),
  ];
}
export function importUsers(text: string, existing: User[]) {
  const [headers, ...rows] = parseCsv(text);
  const required = ["nome", "email", "data_nascimento", "papel"];
  if (!headers || required.some((h) => !headers.map((x) => x.trim().toLowerCase()).includes(h)))
    throw Error("Cabeçalho exigido: nome;email;data_nascimento;papel");
  const keys = headers.map((h) => h.trim().toLowerCase());
  const valid: User[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const get = (key: string) => row[keys.indexOf(key)]?.trim() || "";
    const u: User = {
      id: crypto.randomUUID(),
      name: get("nome"),
      email: get("email"),
      birthDate: get("data_nascimento"),
      profile: get("papel") as Profile,
      review: false,
    };
    const issues = userErrors(u, [...existing, ...valid]);
    if (issues.length) errors.push(`Linha ${i + 2}: ${issues.join(" ")}`);
    else valid.push(u);
  });
  return { valid, errors };
}
