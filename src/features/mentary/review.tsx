import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMentary } from "./store";
import type { Question } from "./data";
import { canReview, questionErrors, questionChanges } from "./rules";
import { blankQuestion, extractFile, mockExtractedQuestion } from "./extraction";
import { readDocument, saveDocument } from "./documents";
import { PageHeading, Panel, Progress, Empty, Modal } from "./ui";
import { DocumentPreview } from "./document-preview";
import { ExtractorEditor } from "./extractor-editor";
import { QuestionReviewCard } from "./question-review-card";
import {
  applyCommon,
  applyAnswerKey,
  commonFromQuestions,
  emptyCommon,
  type CommonFields,
} from "./batch-review";
import { toMentaryQuestion, downloadJson, demoIdentity } from "./mentary-contract";
import {
  downloadCsvTemplate,
  downloadJsonTemplate,
  downloadXlsxTemplate,
} from "./extractor-template";

export function ReviewWorkspace({ upload = false }: { upload?: boolean }) {
  const { state, update, log } = useMentary();
  const [rows, setRows] = useState<Question[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [docId, setDocId] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [authorized, setAuthorized] = useState(false);
  const [common, setCommon] = useState<CommonFields>(emptyCommon);
  const [reviewed, setReviewed] = useState(false);
  const [status, setStatus] = useState("Selecione seu documento");
  const [detailId, setDetailId] = useState("");
  const [original, setOriginal] = useState<Question | null>(null);
  const [url, setUrl] = useState("");
  const [zoom, setZoom] = useState(100);
  const generation = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [previousDocument, setPreviousDocument] = useState<{
    id: string;
    name: string;
    attempts: number;
    status: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const token = generation.current;
    if (!upload) {
      const pending = state.questions.filter((q) =>
        ["Pendente de revisão", "Em revisão"].includes(q.status),
      );
      setRows(pending);
      setCommon(commonFromQuestions(pending));
      return;
    }
    void (async () => {
      const saved = localStorage.getItem("mentary-last-document");
      if (!saved) return;
      const record = JSON.parse(saved) as {
        id: string;
        name: string;
        attempts: number;
        status: string;
      };
      if (active && generation.current === token) setPreviousDocument(record);
    })().catch(() => setError("Não foi possível restaurar o documento. Selecione-o novamente."));
    return () => {
      active = false;
    };
    // The provider already loaded browser data before this screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload]);
  useEffect(() => {
    if (!original) return;
    let active = true;
    let objectUrl = "";
    void (async () => {
      const blob =
        original.documentId === docId && file
          ? file
          : original.documentId
            ? await readDocument(original.documentId)
            : undefined;
      if (active && blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else if (active) setUrl("");
    })().catch(() => setError("Não foi possível abrir o original."));
    return () => {
      active = false;
      setUrl("");
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [original, docId, file]);
  const remember = (id: string, name: string, value: string, count: number) => {
    setStatus(value);
    try {
      localStorage.setItem(
        "mentary-last-document",
        JSON.stringify({ id, name, status: value, attempts: count }),
      );
    } catch {
      setError("Não foi possível salvar o estado do documento neste navegador.");
    }
  };
  const resumePrevious = async () => {
    if (!previousDocument) return;
    const token = ++generation.current;
    setError("");
    try {
      const blob = await readDocument(previousDocument.id);
      if (token !== generation.current) return;
      if (!blob)
        throw Error("O arquivo anterior não está mais disponível. Envie um novo documento.");
      const restored = state.questions.filter((q) => q.documentId === previousDocument.id);
      try {
        const warnings: unknown = JSON.parse(
          localStorage.getItem(`mentary-document-warnings:${previousDocument.id}`) || "[]",
        );
        setExtractionWarnings(
          Array.isArray(warnings) ? warnings.filter((w): w is string => typeof w === "string") : [],
        );
      } catch {
        setExtractionWarnings([]);
      }
      setRows(restored);
      setCommon(commonFromQuestions(restored));
      setFile(new File([blob], previousDocument.name, { type: blob.type }));
      setDocId(previousDocument.id);
      setAttempts(previousDocument.attempts);
      setStatus(
        previousDocument.status === "Em processamento"
          ? "Processamento interrompido; tente novamente"
          : previousDocument.status,
      );
      setAuthorized(false);
      setReviewed(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const startNew = () => {
    generation.current++;
    if (file && docId) setPreviousDocument({ id: docId, name: file.name, attempts, status });
    if (rows.length) {
      const ids = new Set(rows.map((q) => q.id));
      update((s) => ({ ...s, questions: [...s.questions.filter((q) => !ids.has(q.id)), ...rows] }));
    }
    setRows([]);
    setFile(null);
    setDocId("");
    setCommon(emptyCommon);
    setAttempts(0);
    setProgress(0);
    setAuthorized(false);
    setReviewed(false);
    setDetailId("");
    setOriginal(null);
    setError("");
    setExtractionWarnings([]);
    setStatus("Selecione seu documento");
    if (fileInput.current) fileInput.current.value = "";
  };
  const choose = async (candidate?: File) => {
    if (!candidate) return;
    setError("");
    if (
      !/\.(pdf|png|jpe?g|webp|avif|csv|xlsx|json)$/i.test(candidate.name) ||
      candidate.size > 20 * 1024 * 1024
    ) {
      setError("Escolha PDF, imagem, CSV, XLSX ou JSON de até 20 MB.");
      return;
    }
    if (/\.(png|jpe?g|webp|avif)$/i.test(candidate.name) && candidate.size > 5 * 1024 * 1024) {
      setError("Imagens devem ter até 5 MB.");
      return;
    }
    const token = ++generation.current;
    const id = crypto.randomUUID();
    try {
      await saveDocument(id, candidate);
      if (token !== generation.current) return;
      if (rows.length) {
        const ids = new Set(rows.map((q) => q.id));
        update((s) => ({
          ...s,
          questions: [...s.questions.filter((q) => !ids.has(q.id)), ...rows],
        }));
      }
      setFile(candidate);
      setDocId(id);
      setRows([]);
      setCommon(emptyCommon);
      setAttempts(0);
      setReviewed(false);
      setDetailId("");
      setOriginal(null);
      setAuthorized(false);
      setPreviousDocument(null);
      setExtractionWarnings([]);
      remember(id, candidate.name, "Arquivo pronto para extração", 0);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const run = async () => {
    if (!file || busy || !authorized || attempts >= 3) return;
    setBusy(true);
    setProgress(0);
    setError("");
    setExtractionWarnings([]);
    setAttempts((n) => n + 1);
    remember(docId, file.name, "Em processamento", attempts + 1);
    try {
      let warnings: string[] = [];
      const found = /\.json$/i.test(file.name)
        ? await extractFile(file, setProgress, (value) => {
            warnings = value;
            setExtractionWarnings(value);
            try {
              localStorage.setItem(`mentary-document-warnings:${docId}`, JSON.stringify(value));
            } catch {
              /* Warnings remain visible during this session. */
            }
          })
        : mockExtractedQuestion(file.name);
      const extracted = found.map((q, i) => {
        const old = rows.find(
          (x) =>
            x.sourceNumber === q.sourceNumber &&
            x.page === q.page &&
            x.text === q.text &&
            JSON.stringify(x.options) === JSON.stringify(q.options),
        );
        if (old?.status === "Aprovada" && !questionErrors(old).length) return old;
        return {
          ...q,
          id: old?.id || q.id,
          documentId: docId,
          history: [
            ...(old?.history || []),
            `Enviada por ${state.settings.name} em ${new Date().toISOString()}`,
          ],
        };
      });
      setRows(extracted);
      setCommon(commonFromQuestions(extracted));
      setReviewed(false);
      update((s) => ({
        ...s,
        questions: [...s.questions.filter((q) => q.documentId !== docId), ...extracted],
      }));
      remember(docId, file.name, "Extração concluída", attempts + 1);
      if (warnings.length)
        toast.warning(
          `${extracted.length} questões separadas; ${warnings.length} blocos precisam de conferência no original.`,
        );
      else toast.success(`${extracted.length} questões extraídas. Todas estão disponíveis abaixo.`);
    } catch (e) {
      setError((e as Error).message);
      remember(docId, file.name, "Não foi possível extrair; original preservado", attempts + 1);
    } finally {
      setBusy(false);
    }
  };
  const change = (q: Question) => {
    setRows((list) => list.map((x) => (x.id === q.id ? q : x)));
    setReviewed(false);
  };
  const applyShared = (overwrite: boolean) => {
    setRows((list) =>
      list.map((q) => (q.status === "Aprovada" ? q : applyCommon(q, common, overwrite))),
    );
    setReviewed(false);
    setError("");
    toast.success("Dados comuns aplicados às questões pendentes.");
  };
  const fillKey = (text: string, overwrite: boolean) => {
    try {
      const filled = applyAnswerKey(rows, text, overwrite);
      setRows(filled.map((q, i) => (rows[i]!.status === "Aprovada" ? rows[i]! : q)));
      setReviewed(false);
      setError("");
      toast.success("Gabarito preenchido em lote. Confira as respostas abaixo.");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const pending = rows.filter((q) => q.status !== "Aprovada");
  const ready = pending.filter((q) => questionErrors(q).length === 0);
  const approved = rows.filter((q) => q.status === "Aprovada");
  const missingAnswers = pending.filter((q) => q.answer < 0).length;
  const detail = rows.find((q) => q.id === detailId);
  const save = (approve: boolean) => {
    if (
      approve &&
      (!reviewed || !canReview(state.profile, state.reviewPermission) || !ready.length)
    )
      return;
    const readyIds = new Set(ready.map((q) => q.id));
    const now = new Date().toISOString();
    const next = rows.map((q) => {
      if (q.status === "Aprovada") return q;
      const accept = approve && readyIds.has(q.id);
      return {
        ...q,
        status: accept ? "Aprovada" : "Pendente de revisão",
        approvedBy: accept ? state.settings.name : undefined,
        approvedAt: accept ? now : undefined,
        updated: new Date().toLocaleDateString("pt-BR"),
        history: [
          ...q.history,
          `${accept ? "Aprovada" : "Revisão salva"} por ${state.settings.name} em ${now}; ${questionChanges(
            state.questions.find((x) => x.id === q.id),
            q,
          )}`,
        ],
      };
    });
    const ids = new Set(next.map((q) => q.id));
    update((s) => ({ ...s, questions: [...s.questions.filter((q) => !ids.has(q.id)), ...next] }));
    setRows(next);
    setReviewed(false);
    setError("");
    log(
      approve
        ? `${ready.length} questões aprovadas em lote; ${pending.length - ready.length} ainda pendentes`
        : `Revisão de ${rows.length} questões salva`,
    );
    toast.success(
      approve
        ? `${ready.length} questões aprovadas. ${pending.length - ready.length ? `${pending.length - ready.length} continuam pendentes.` : "Todas foram concluídas."}`
        : "Revisão salva. Você pode continuar depois.",
    );
  };
  const reopen = (q: Question) => {
    const next = {
      ...q,
      status: "Em revisão",
      approvedBy: undefined,
      approvedAt: undefined,
      history: [...q.history, `Reaberta por ${state.settings.name} em ${new Date().toISOString()}`],
    };
    change(next);
    update((s) => ({ ...s, questions: s.questions.map((x) => (x.id === q.id ? next : x)) }));
  };
  const exportApproved = () => {
    try {
      downloadJson(
        "mentary-questoes-aprovadas.json",
        approved.map((q) => toMentaryQuestion(q, demoIdentity)),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="page extractor-batch-page">
      <PageHeading
        title={upload ? "Extrator de questões" : "Revisar questões"}
        description="Envie o documento, confira todas as questões e aprove em lote."
      >
        {upload && (
          <Button variant="outline" disabled={busy} onClick={startNew}>
            Novo documento
          </Button>
        )}
      </PageHeading>
      {upload && (
        <Panel
          className="batch-upload"
          title={file?.name || "Envie seu material"}
          description="Escolha um arquivo para começar ou substitua o documento atual."
        >
          {!file && previousDocument && (
            <div className="resume-document">
              <span>
                Há um documento anterior: <strong>{previousDocument.name}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={() => void resumePrevious()}>
                Continuar revisão anterior
              </Button>
            </div>
          )}
          <div className="p-5 grid gap-4 extractor-upload">
            <label
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) void choose(e.dataTransfer.files[0]);
              }}
            >
              <strong>{file?.name || "Arraste o arquivo aqui ou clique para selecionar"}</strong>
              <input
                ref={fileInput}
                aria-label="Documento de origem"
                type="file"
                disabled={busy}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.avif,.csv,.xlsx,.json"
                onChange={(e) => void choose(e.target.files?.[0])}
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
              />
              Tenho autorização para usar este material.
            </label>
            <div className="action-row">
              <Button
                onClick={() => void run()}
                disabled={!file || busy || !authorized || attempts >= 3}
              >
                {busy ? "Extraindo questões…" : attempts ? "Extrair novamente" : "Extrair questões"}
              </Button>
              <span className="subtext" role="status">
                {status}
              </span>
            </div>
            {busy && <Progress value={progress} />}
            <details>
              <summary>Modelos e outras opções</summary>
              <div className="action-row mt-3">
                <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                  Modelo CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadJsonTemplate}>
                  Modelo JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadXlsxTemplate().catch(() =>
                      toast.error("Não foi possível gerar o XLSX."),
                    )
                  }
                >
                  Modelo XLSX
                </Button>
                <Button
                  variant="ghost"
                  disabled={!file || busy}
                  onClick={() => {
                    setRows((list) => [
                      ...list,
                      { ...applyCommon(blankQuestion(file!.name), common), documentId: docId },
                    ]);
                    setReviewed(false);
                  }}
                >
                  Adicionar questão manualmente
                </Button>
              </div>
              <p className="subtext mt-3">
                PDFs com texto são lidos localmente. Imagens e PDFs digitalizados dependem de OCR ou
                revisão manual. Imagens: até 5 MB; outros arquivos: até 20 MB. Até 3 tentativas por
                documento.
              </p>
            </details>
          </div>
        </Panel>
      )}
      {error && (
        <p role="alert" className="notice my-5">
          {error}
        </p>
      )}
      {extractionWarnings.length > 0 && (
        <div role="alert" className="notice my-5">
          <div>
            <strong>Alguns blocos não foram importados porque a separação ficou ambígua.</strong>
            <p>Confira o original. Eles não serão apresentados como questões prontas.</p>
            <ul>
              {extractionWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {rows.length > 0 ? (
        <>
          <div className="batch-summary">
            <div>
              <strong>{rows.length}</strong>
              <span>questões extraídas</span>
            </div>
            <div>
              <strong>{ready.length}</strong>
              <span>prontas para aprovar</span>
            </div>
            <div>
              <strong>{missingAnswers}</strong>
              <span>sem gabarito</span>
            </div>
            <div>
              <strong>{approved.length}</strong>
              <span>aprovadas</span>
            </div>
          </div>
          <div className="batch-review-toolbar">
            <div>
              <h2>Confira todas as questões</h2>
              <p className="subtext">
                Marque o gabarito nos cartões ou cole o gabarito em lote. Ajuste só o que precisar.
              </p>
            </div>
            <div className="action-row">
              <Button variant="outline" onClick={() => save(false)} disabled={!pending.length}>
                Salvar revisão
              </Button>
              {approved.length > 0 && (
                <Button variant="outline" onClick={exportApproved}>
                  Exportar {approved.length} aprovadas
                </Button>
              )}
              {pending.length > 0 && (
                <Button
                  onClick={() => save(true)}
                  disabled={
                    !reviewed || !ready.length || !canReview(state.profile, state.reviewPermission)
                  }
                >
                  Aprovar {ready.length}{" "}
                  {ready.length === 1 ? "questão pronta" : "questões prontas"}
                </Button>
              )}
            </div>
          </div>
          {pending.length > 0 && (
            <label className="batch-confirm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              Conferi o conteúdo e o gabarito das questões prontas para aprovação.
              {pending.length > ready.length && (
                <span>
                  {pending.length - ready.length} questões com pendências continuarão em revisão.
                </span>
              )}
            </label>
          )}
          <div className="extracted-question-list">
            {rows.map((q, i) => (
              <QuestionReviewCard
                key={q.id}
                question={q}
                number={q.sourceNumber ?? i + 1}
                onChange={change}
                onDetails={() => setDetailId(q.id)}
                onOriginal={() => {
                  setOriginal(q);
                  setZoom(100);
                }}
                onReopen={() => reopen(q)}
              />
            ))}
          </div>
          {approved.length > 0 && (
            <details className="panel p-5 mt-5">
              <summary>Exportação e rastreabilidade</summary>
              <div className="action-row mt-4">
                <Button onClick={exportApproved}>Exportar aprovadas em JSON Mentary</Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadJson(
                      "extrator-rastreabilidade.json",
                      rows.map((q) => ({
                        questionId: q.id,
                        documentId: q.documentId,
                        source: q.source,
                        sourceNumber: q.sourceNumber,
                        page: q.page,
                        matrixVersion: q.saebMatrix,
                        approvedBy: q.approvedBy,
                        approvedAt: q.approvedAt,
                        status: q.status,
                        history: q.history,
                      })),
                    )
                  }
                >
                  Exportar rastreabilidade separada
                </Button>
              </div>
              <p className="subtext mt-3">
                A demonstração usa autor e instituição fictícios do seed. Imagens locais precisam
                ser enviadas pelo servidor antes da exportação final.
              </p>
            </details>
          )}
        </>
      ) : (
        !busy && <Empty text="As questões extraídas aparecerão juntas aqui." />
      )}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetailId("")}
        title="Ajustar detalhes da questão"
        description="Use estes campos apenas para exceções; a classificação comum pode ser preenchida em lote."
      >
        {detail && (
          <div className="grid gap-4">
            <ExtractorEditor key={detail.id} question={detail} onChange={change} />
            {questionErrors(detail).length > 0 && (
              <div className="notice">
                <ul>
                  {questionErrors(detail).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button onClick={() => setDetailId("")}>Concluir ajustes</Button>
            <details>
              <summary>Histórico de revisão</summary>
              {detail.history.map((h, i) => (
                <p key={i} className="subtext">
                  {h}
                </p>
              ))}
            </details>
          </div>
        )}
      </Modal>
      <Modal
        open={Boolean(original)}
        onClose={() => setOriginal(null)}
        title="Documento original"
        description={original ? `${original.source} · página ${original.page || 1}` : ""}
      >
        {original && (
          <>
            <div className="action-row mb-4">
              <Button variant="outline" onClick={() => setZoom((v) => Math.max(50, v - 25))}>
                −
              </Button>
              <span>{zoom}%</span>
              <Button variant="outline" onClick={() => setZoom((v) => Math.min(200, v + 25))}>
                +
              </Button>
              {url && (
                <a href={url} target="_blank" rel="noreferrer">
                  Abrir original
                </a>
              )}
            </div>
            {/\.pdf$/i.test(original.source) ? (
              url ? (
                <DocumentPreview url={url} page={original.page || 1} zoom={zoom} />
              ) : (
                <p>Carregando original…</p>
              )
            ) : /\.(png|jpe?g|webp|avif)$/i.test(original.source) ? (
              <img src={url} alt="Documento original" />
            ) : (
              <pre className="source-record">
                {original.originalRecord || "Registro original não disponível."}
              </pre>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
