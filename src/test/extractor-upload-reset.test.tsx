import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ReviewWorkspace } from "@/features/mentary/review";
import { blankQuestion } from "@/features/mentary/extraction";

const mocks = vi.hoisted(() => ({ state: {} as unknown, update: vi.fn() }));
vi.mock("@/features/mentary/store", () => ({
  useMentary: () => ({ state: mocks.state, update: mocks.update, log: vi.fn() }),
}));
vi.mock("@/features/mentary/documents", () => ({
  readDocument: vi.fn(async () => new Blob(["example"], { type: "application/pdf" })),
  saveDocument: vi.fn(async () => {}),
}));
afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  mocks.update.mockClear();
  mocks.state = {
    questions: [
      {
        ...blankQuestion("anterior.pdf"),
        documentId: "saved-doc",
        text: "Questão anterior",
        options: ["A", "B"],
      },
    ],
    profile: "Administrador",
    reviewPermission: true,
    settings: { name: "Professor Exemplo" },
  };
  localStorage.setItem(
    "mentary-last-document",
    JSON.stringify({
      id: "saved-doc",
      name: "anterior.pdf",
      attempts: 1,
      status: "Extração concluída",
    }),
  );
});
describe("Extractor upload navigation regression", () => {
  it("starts with an empty file picker even when a previous document is saved", async () => {
    render(<ReviewWorkspace upload />);
    await screen.findByRole("button", { name: "Continuar revisão anterior" });
    expect((screen.getByLabelText("Documento de origem") as HTMLInputElement).files).toHaveLength(
      0,
    );
    expect(screen.queryAllByTestId("extracted-question")).toHaveLength(0);
  });
  it("resumes only on request and resets the selected document without deleting the saved questions", async () => {
    render(<ReviewWorkspace upload />);
    fireEvent.click(await screen.findByRole("button", { name: "Continuar revisão anterior" }));
    await screen.findByTestId("extracted-question");
    expect(screen.getByLabelText("Documento de origem")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Novo documento" }));
    await waitFor(() => expect(screen.queryAllByTestId("extracted-question")).toHaveLength(0));
    expect((screen.getByLabelText("Documento de origem") as HTMLInputElement).value).toBe("");
    expect(mocks.update).toHaveBeenCalled();
    const state = { questions: [{ id: "unrelated" }] };
    const saved = mocks.update.mock.calls[0]![0](state);
    expect(saved.questions).toHaveLength(2);
    expect(saved.questions.some((q: { documentId?: string }) => q.documentId === "saved-doc")).toBe(
      true,
    );
  });
});
