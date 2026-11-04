import catalogue from "./bncc-catalogue.json";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function matchingBncc(search: string, subject = "", year = "") {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  const grade = Number(year.match(/\d+/)?.[0]);
  const discipline = normalize(subject).replace(/^portugues$/, "lingua portuguesa");
  return catalogue.filter((item) => {
    const block = item.code.slice(2, 4);
    const first = Number(block[0]);
    const last = Number(block[1]);
    const sameYear = !grade || (first === 0 ? last === grade : grade >= first && grade <= last);
    return (
      sameYear &&
      (!discipline || normalize(item.subject) === discipline) &&
      terms.every((term) =>
        normalize(`${item.code} ${item.description} ${item.subject}`).includes(term),
      )
    );
  });
}
