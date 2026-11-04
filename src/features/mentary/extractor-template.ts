import { downloadJson } from "./mentary-contract";
import { downloadCsv } from "./data";
export const templateHeaders = [
  "enunciado",
  "A",
  "B",
  "C",
  "D",
  "gabarito",
  "question_type",
  "answer_options_type",
  "subjects",
  "bncc",
  "saebDescriptor",
  "matriz_saeb",
  "difficulty",
  "assunto",
  "ano_escolar",
  "tipo",
  "answers_explanation",
];
export const templateRows = [
  [
    "Ana comprou 3 cadernos de 12 reais cada e pagou com 50 reais. Quanto recebeu de troco?",
    "12 reais",
    "14 reais",
    "36 reais",
    "38 reais",
    "B",
    "MULTIPLA ESCOLHA",
    "TEXTO",
    "Matemática",
    "EF05MA08",
    "D19",
    "Exemplo fictício - confirmar versão oficial",
    "Fácil",
    "Problemas com as quatro operações",
    "5º ano",
    "Múltipla escolha",
    "3 × 12 = 36; 50 − 36 = 14.",
  ],
  [
    "O resultado de 3 × 4 é 12.",
    "Verdadeiro",
    "Falso",
    "",
    "",
    "A",
    "VERDADEIRO OU FALSO",
    "TEXTO",
    "Matemática",
    "EF05MA08",
    "D19",
    "Exemplo fictício - confirmar versão oficial",
    "Média",
    "Multiplicação",
    "5º ano",
    "Múltipla escolha",
    "3 × 4 = 12.",
  ],
];
export function downloadCsvTemplate() {
  downloadCsv("modelo-extrator.csv", [templateHeaders, ...templateRows]);
}
export function downloadJsonTemplate() {
  downloadJson("modelo-extrator.json", [
    {
      title:
        "<p>Ana comprou 3 cadernos de R$ 12,00 cada e pagou com uma nota de R$ 50,00. Quanto ela recebeu de troco?</p>",
      question_type: "MULTIPLA ESCOLHA",
      answer_options_type: "TEXTO",
      answer_options: ["R$ 12,00", "R$ 14,00", "R$ 36,00", "R$ 38,00"],
      correct_answer_index: 1,
      answers_explanation: "3 × 12 = 36; 50 − 36 = 14.",
      subjects: "Matemática",
      metadata: {
        bncc: "EF05MA08",
        saebDescriptor: "D19",
        difficulty: "Fácil",
        assunto: "Problemas com as quatro operações",
        ano_escolar: "5º ano",
        tipo: "Múltipla escolha",
      },
      matriz_saeb: "Exemplo fictício - confirmar versão oficial",
    },
  ]);
}
export async function downloadXlsxTemplate() {
  const ExcelJS = await import("exceljs");
  const book = new ExcelJS.default.Workbook();
  const sheet = book.addWorksheet("Questoes");
  sheet.addRow(templateHeaders);
  templateRows.forEach((r) => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF332389" } };
  sheet.columns.forEach((column, i) => {
    column.width = i === 0 ? 70 : 28;
  });
  const bytes = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-extrator.xlsx";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
