import { useId, useState } from "react";
import { matchingBncc } from "./bncc-search";

export function BnccSelector({
  value,
  onChange,
  subject = "",
  year = "",
  label = "Habilidades BNCC",
}: {
  value: string;
  onChange: (value: string) => void;
  subject?: string;
  year?: string;
  label?: string;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState(true);
  const [limit, setLimit] = useState(30);
  const selected = [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const results = matchingBncc(search, filtered ? subject : "", filtered ? year : "");
  const toggle = (code: string) =>
    onChange(
      (selected.includes(code) ? selected.filter((v) => v !== code) : [...selected, code]).join(
        ", ",
      ),
    );
  return (
    <fieldset className="rounded-xl border border-purple-200 p-4 grid gap-3 min-w-0">
      <legend className="px-1 font-semibold">{label}</legend>
      <p className="subtext">
        Selecione uma ou mais habilidades. Catálogo do Ensino Fundamental, do 1º ao 9º ano.
      </p>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="BNCC selecionadas">
          {selected.map((code) => (
            <button
              type="button"
              key={code}
              className="rounded-full bg-purple-100 text-purple-900 px-3 py-1 text-sm"
              onClick={() => toggle(code)}
              aria-label={`Remover ${code}`}
            >
              {code} ×
            </button>
          ))}
        </div>
      )}
      <label className="field" htmlFor={id}>
        Buscar por código ou conteúdo
        <input
          id={id}
          type="search"
          className="control"
          value={search}
          placeholder="Ex.: frações, leitura, EF05MA08"
          onChange={(e) => {
            setSearch(e.target.value);
            setLimit(30);
          }}
        />
      </label>
      {(subject || year) && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filtered}
            onChange={(e) => {
              setFiltered(e.target.checked);
              setLimit(30);
            }}
          />
          Filtrar pela disciplina e pelo ano informados
        </label>
      )}
      <div className="max-h-72 overflow-y-auto grid gap-2" aria-label="Habilidades disponíveis">
        {results.slice(0, limit).map((item) => (
          <label
            key={item.code}
            className="flex items-start gap-3 rounded-lg border border-purple-100 p-3 cursor-pointer hover:bg-purple-50"
          >
            <input
              className="mt-1"
              type="checkbox"
              checked={selected.includes(item.code)}
              onChange={() => toggle(item.code)}
              aria-label={item.code}
            />
            <span className="text-sm">
              <strong>{item.code}</strong>
              <span className="block text-xs opacity-70">{item.subject}</span>
              {item.description}
            </span>
          </label>
        ))}
        {!results.length && (
          <p className="subtext">
            Nenhuma habilidade encontrada. Altere a busca ou desmarque o filtro de disciplina e ano.
          </p>
        )}
      </div>
      <p className="subtext">
        {results.length} habilidades encontradas · {selected.length} selecionadas
      </p>
      {results.length > limit && (
        <button
          className="text-sm underline text-purple-800"
          type="button"
          onClick={() => setLimit(limit + 30)}
        >
          Mostrar mais habilidades
        </button>
      )}
      <p className="subtext">
        Fonte:{" "}
        <a
          className="underline"
          href="https://basenacionalcomum.mec.gov.br/images/BNCC_20dez_site.pdf"
          target="_blank"
          rel="noreferrer"
        >
          BNCC · Ministério da Educação
        </a>
        . Códigos importados fora deste catálogo são preservados.
      </p>
    </fieldset>
  );
}
