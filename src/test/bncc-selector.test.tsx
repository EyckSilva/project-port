import { useState } from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BnccSelector } from "../features/mentary/bncc-selector";
import { matchingBncc } from "../features/mentary/bncc-search";
afterEach(cleanup);
it("filtra códigos oficiais pela disciplina, ano e conteúdo, incluindo blocos de anos", () => {
  expect(
    matchingBncc("multiplicação", "Matemática", "5º ano").some((x) => x.code === "EF05MA08"),
  ).toBe(true);
  expect(matchingBncc("EF15LP01", "Português", "5º ano")).toHaveLength(1);
  expect(matchingBncc("EF69LP01", "Língua Portuguesa", "7º ano")).toHaveLength(1);
  expect(matchingBncc("EF05MA08", "Matemática", "6º ano")).toHaveLength(0);
});
it("seleciona várias habilidades e preserva códigos importados fora do catálogo", () => {
  function Example() {
    const [value, setValue] = useState("EM13MAT101");
    return (
      <>
        <BnccSelector value={value} onChange={setValue} subject="Matemática" year="5º ano" />
        <output>{value}</output>
      </>
    );
  }
  render(<Example />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "EF05MA07" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "EF05MA07" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "EF05MA08" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "EF05MA08" }));
  expect(screen.getByRole("status").textContent).toBe("EM13MAT101, EF05MA07, EF05MA08");
  fireEvent.click(screen.getByRole("button", { name: "Remover EF05MA07" }));
  expect(screen.getByRole("status").textContent).toBe("EM13MAT101, EF05MA08");
});
