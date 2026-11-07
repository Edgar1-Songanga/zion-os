"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMinistryCatalogEntry } from "@/components/ministry/ministry-catalog";

type Destination = { id: string; name: string; department: string };
type IntakeRow = {
  id: string;
  title: string;
  ministry_id: string | null;
  classification_department: string | null;
  classification_confidence: number;
  classification_method: string;
  status: string;
  submitted_at: string;
  original_filename: string;
  review_notes?: string | null;
};

type OcrWorker = {
  recognize: (input: File) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
};

declare global {
  interface Window {
    Tesseract?: { createWorker: (languages: string) => Promise<OcrWorker> };
  }
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const OCR_SCRIPT = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function classifyDocument(text: string, destinations: Destination[]) {
  const content = normalize(text);
  if (!content) return null;
  const ranked = destinations.map((destination) => {
    const catalog = getMinistryCatalogEntry(destination.department) ?? getMinistryCatalogEntry(destination.name);
    const phrases = [destination.name, destination.department, catalog?.name ?? "", ...(catalog?.focusAreas ?? [])]
      .map(normalize).filter((phrase) => phrase.length >= 4);
    let score = 0;
    for (const phrase of phrases) {
      if (content.includes(phrase)) score += phrase === normalize(destination.name) ? 5 : 2.5;
      const tokens = phrase.split(" ").filter((token) => token.length >= 5);
      const matches = tokens.filter((token) => content.includes(token)).length;
      score += Math.min(matches, 3) * 0.45;
    }
    return { destination, score };
  }).sort((a, b) => b.score - a.score);
  const first = ranked[0];
  if (!first || first.score < 2.5) return null;
  const second = ranked[1];
  const margin = first.score - (second?.score ?? 0);
  const confidence = Math.max(0.35, Math.min(0.92, 0.48 + first.score / 30 + margin / 25));
  return { destination: first.destination, confidence, ambiguous: Boolean(second && margin < 1.25) };
}

async function loadOcrEngine() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-zion-tesseract="true"]');
    if (existing) {
      if (window.Tesseract) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Não foi possível carregar o motor OCR.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = OCR_SCRIPT;
    script.async = true;
    script.dataset.zionTesseract = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o motor OCR. Verifique a ligação à internet."));
    document.head.appendChild(script);
  });
  if (!window.Tesseract) throw new Error("O motor OCR não ficou disponível.");
  return window.Tesseract;
}

function parseQrPayload(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      organizationId: String(parsed.organization_id ?? parsed.organizationId ?? ""),
      ministryId: String(parsed.ministry_id ?? parsed.ministryId ?? ""),
      department: String(parsed.department ?? ""),
    };
  } catch {
    // QR may be a URL or a short ZION routing token.
  }
  try {
    const url = new URL(raw);
    return {
      organizationId: url.searchParams.get("organization_id") ?? url.searchParams.get("organizationId") ?? "",
      ministryId: url.searchParams.get("ministry_id") ?? url.searchParams.get("ministryId") ?? "",
      department: url.searchParams.get("department") ?? "",
    };
  } catch {
    const match = raw.match(/^zion-report:([0-9a-f-]{36})$/i);
    return match ? { organizationId: "", ministryId: match[1], department: "" } : null;
  }
}

export default function ReportIntakePanel({
  organizationId,
  destinations,
  onSubmitted,
}: {
  organizationId: string;
  destinations: Destination[];
  onSubmitted: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const qrVideo = useRef<HTMLVideoElement>(null);
  const qrStream = useRef<MediaStream | null>(null);
  const qrFrame = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [classificationConfidence, setClassificationConfidence] = useState(0);
  const [classificationMethod, setClassificationMethod] = useState<"RULES" | "QR" | "MANUAL">("RULES");
  const [qrPayload, setQrPayload] = useState("");
  const [qrManual, setQrManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recent, setRecent] = useState<IntakeRow[]>([]);
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);

  const selectedDestination = destinations.find((item) => item.id === selectedMinistryId);

  const refreshRecent = useCallback(async () => {
    if (!organizationId) { setRecent([]); return; }
    const { data, error: queryError } = await supabase
      .from("report_intake_documents")
      .select("id,title,ministry_id,classification_department,classification_confidence,classification_method,status,submitted_at,original_filename,review_notes")
      .eq("organization_id", organizationId)
      .order("submitted_at", { ascending: false })
      .limit(30);
    if (queryError) {
      setError("Não foi possível consultar a caixa de entrada de relatórios com as permissões desta conta.");
      return;
    }
    setRecent((data ?? []) as IntakeRow[]);
  }, [organizationId, supabase]);

  useEffect(() => { void refreshRecent(); }, [refreshRecent]);

  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const stopQrScanner = useCallback(() => {
    if (qrFrame.current !== null) cancelAnimationFrame(qrFrame.current);
    qrFrame.current = null;
    qrStream.current?.getTracks().forEach((track) => track.stop());
    qrStream.current = null;
    if (qrVideo.current) qrVideo.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => () => stopQrScanner(), [stopQrScanner]);

  function applyQr(value: string) {
    const parsed = parseQrPayload(value);
    if (!parsed) {
      setError("O QR não contém uma referência de relatório ZION reconhecida.");
      return;
    }
    if (parsed.organizationId && parsed.organizationId !== organizationId) {
      setError("Este QR pertence a outra organização. Selecione primeiro a organização correta.");
      return;
    }
    const destination = destinations.find((item) =>
      (parsed.ministryId && item.id === parsed.ministryId) ||
      (parsed.department && normalize(item.department) === normalize(parsed.department)) ||
      (parsed.department && normalize(item.name) === normalize(parsed.department))
    );
    if (!destination) {
      setError("O QR foi lido, mas não corresponde a um departamento/ministério registado nesta organização.");
      return;
    }
    setSelectedMinistryId(destination.id);
    setClassificationConfidence(1);
    setClassificationMethod("QR");
    setQrPayload(value.slice(0, 2048));
    setNotice("QR reconhecido. O relatório será encaminhado para " + destination.name + ".");
    setError(null);
    stopQrScanner();
  }

  async function startQrScanner() {
    setError(null);
    if (!("BarcodeDetector" in window)) {
      setError("Este navegador não disponibiliza leitura QR nativa. Pode colar o conteúdo do QR no campo manual.");
      return;
    }
    try {
      const BarcodeDetectorCtor = (window as unknown as {
        BarcodeDetector: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
      }).BarcodeDetector;
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      qrStream.current = stream;
      setScanning(true);
      if (qrVideo.current) {
        qrVideo.current.srcObject = stream;
        await qrVideo.current.play();
      }
      const scan = async () => {
        if (!qrVideo.current || !qrStream.current) return;
        try {
          const codes = await detector.detect(qrVideo.current);
          if (codes[0]?.rawValue) { applyQr(codes[0].rawValue); return; }
        } catch {
          // Continue scanning while the camera is active.
        }
        qrFrame.current = requestAnimationFrame(() => { void scan(); });
      };
      qrFrame.current = requestAnimationFrame(() => { void scan(); });
    } catch (cause) {
      stopQrScanner();
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a câmara para ler o QR.");
    }
  }

  async function readDocument() {
    if (!file || reading) return;
    setReading(true);
    setError(null);
    setNotice("A preparar OCR no dispositivo. O ficheiro ainda não foi enviado.");
    let worker: OcrWorker | null = null;
    try {
      const engine = await loadOcrEngine();
      worker = await engine.createWorker("por+eng");
      const result = await worker.recognize(file);
      const text = result.data.text.trim();
      setOcrText(text);
      setOcrConfidence(result.data.confidence / 100);
      const guess = classifyDocument(text, destinations);
      if (guess) {
        setSelectedMinistryId(guess.destination.id);
        setClassificationConfidence(guess.confidence);
        setClassificationMethod("RULES");
        setNotice(guess.ambiguous
          ? "Leitura concluída, mas existem departamentos próximos. Confirme o destino antes de enviar."
          : "Leitura concluída. O conteúdo sugere " + guess.destination.name + "; confirme antes de enviar.");
      } else {
        setSelectedMinistryId("");
        setClassificationConfidence(0);
        setNotice("Texto extraído. Não foi possível identificar um destino com segurança; escolha o departamento manualmente.");
      }
      if (!text) setError("Não foi possível reconhecer texto nesta imagem. Tente outra fotografia com melhor iluminação e foco.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler o documento.");
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      setReading(false);
    }
  }

  function chooseDestination(value: string) {
    setSelectedMinistryId(value);
    setClassificationMethod("MANUAL");
    setClassificationConfidence(value ? 1 : 0);
  }

  async function submitDocument() {
    if (!organizationId || !file || !selectedDestination || saving || !ocrText.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    let storagePath: string | null = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("A sessão ZION não está disponível.");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      storagePath = organizationId + "/" + selectedDestination.id + "/" + authData.user.id + "/" + crypto.randomUUID() + "." + extension;
      const upload = await supabase.storage.from("report-intake-private").upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upload.error) throw new Error("Falha ao guardar o documento original: " + upload.error.message);
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const documentTitle = title.trim() || ocrText.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 240) || file.name;
      const { error: insertError } = await supabase.from("report_intake_documents").insert({
        organization_id: organizationId,
        ministry_id: selectedDestination.id,
        title: documentTitle.slice(0, 240),
        original_filename: file.name.slice(0, 255),
        storage_path: storagePath,
        mime_type: file.type,
        byte_size: file.size,
        sha256,
        extracted_text: ocrText.slice(0, 100000),
        qr_payload: qrPayload || null,
        classification_department: selectedDestination.department,
        classification_confidence: classificationConfidence,
        classification_method: classificationMethod,
        submitted_by: authData.user.id,
      });
      if (insertError) throw new Error("O documento foi carregado, mas não foi registado: " + insertError.message);
      setFile(null);
      setTitle("");
      setOcrText("");
      setOcrConfidence(null);
      setSelectedMinistryId("");
      setClassificationConfidence(0);
      setClassificationMethod("RULES");
      setQrPayload("");
      setNotice("Relatório enviado para revisão de " + selectedDestination.name + ". O original ficou guardado em armazenamento privado.");
      await refreshRecent();
      onSubmitted();
    } catch (cause) {
      if (storagePath) await supabase.storage.from("report-intake-private").remove([storagePath]).catch(() => {});
      setError(cause instanceof Error ? cause.message : "Não foi possível submeter o relatório.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewDocument(documentId: string, decision: "APPROVED" | "REJECTED") {
    setReviewBusy(documentId);
    setError(null);
    try {
      const { error: reviewError } = await supabase.rpc("review_report_intake_document", {
        p_document_id: documentId,
        p_decision: decision,
        p_review_notes: null,
      });
      if (reviewError) throw new Error(reviewError.message);
      await refreshRecent();
      onSubmitted();
      setNotice(decision === "APPROVED" ? "Relatório aprovado e registado no departamento." : "Relatório rejeitado; o original e o histórico foram preservados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível rever o relatório.");
    } finally {
      setReviewBusy(null);
    }
  }

  if (!organizationId) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Selecione uma organização para digitalizar e encaminhar relatórios.</section>;
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9B7A34]">Digitalização inteligente</p>
          <h2 className="mt-1 text-xl font-semibold">Enviar relatório por fotografia ou QR</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Fotografe um documento, extraia o texto no dispositivo e encaminhe-o ao ministério certo. O original é privado e só entra nos registos oficiais depois da revisão autorizada.</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">OCR local</span>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">Fotografia do documento
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              event.target.value = "";
              if (!selected) return;
              if (!["image/jpeg","image/png","image/webp"].includes(selected.type) || selected.size > MAX_FILE_BYTES) {
                setError("Use uma fotografia JPG, PNG ou WEBP até 20 MB.");
                return;
              }
              setFile(selected);
              setOcrText("");
              setOcrConfidence(null);
              setError(null);
              setNotice("Imagem selecionada. Execute a leitura OCR para extrair o conteúdo.");
            }} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#0C1A3D] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
          </label>
          {previewUrl && <img src={previewUrl} alt="Pré-visualização do documento" className="max-h-64 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />}
          <button type="button" onClick={() => void readDocument()} disabled={!file || reading} className="w-full rounded-xl bg-[#0C1A3D] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{reading ? "A reconhecer texto…" : "Ler documento e identificar departamento"}</button>
          {ocrConfidence !== null && <p className="text-xs text-slate-500">Confiança média de reconhecimento OCR: {Math.round(ocrConfidence * 100)}%. Manuscritos podem exigir correção manual.</p>}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-slate-800">Leitura de QR Code</h3><p className="mt-1 text-xs text-slate-500">Identifica organização e departamento quando o QR contém uma referência ZION.</p></div>
              <button type="button" onClick={() => scanning ? stopQrScanner() : void startQrScanner()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">{scanning ? "Parar câmara" : "Abrir câmara QR"}</button>
            </div>
            {scanning && <video ref={qrVideo} autoPlay playsInline muted className="mt-3 max-h-56 w-full rounded-lg bg-black object-cover" />}
            <div className="mt-3 flex gap-2">
              <input value={qrManual} onChange={(event) => setQrManual(event.target.value)} placeholder="Ou cole o conteúdo do QR" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              <button type="button" onClick={() => applyQr(qrManual)} disabled={!qrManual.trim()} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Ler</button>
            </div>
          </div>

          <label className="block text-sm font-semibold text-slate-700">Destino do relatório
            <select value={selectedMinistryId} onChange={(event) => chooseDestination(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <option value="">Escolher departamento/ministério…</option>
              {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name} · {destination.department}</option>)}
            </select>
          </label>
          {selectedDestination && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Encaminhamento: <strong>{selectedDestination.name}</strong> · método {classificationMethod} · confiança {Math.round(classificationConfidence * 100)}%</p>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <label className="block text-sm font-semibold text-slate-700">Título do relatório
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Título identificado ou introduza um" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">Texto extraído — confirme e corrija
          <textarea value={ocrText} onChange={(event) => setOcrText(event.target.value)} rows={5} maxLength={100000} placeholder="O texto reconhecido aparecerá aqui. Pode corrigir erros antes de enviar." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs leading-5 text-slate-500">O OCR é executado no navegador. O ficheiro original e o texto extraído são enviados para a base ZION em armazenamento privado. A classificação é uma sugestão, não uma aprovação automática.</p>
        <button type="button" onClick={() => void submitDocument()} disabled={!file || !ocrText.trim() || !selectedDestination || saving} className="rounded-xl bg-[#C8A24A] px-5 py-3 text-sm font-semibold text-[#07142c] disabled:opacity-40">{saving ? "A enviar…" : "Enviar para revisão"}</button>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">Caixa de entrada de documentos</h3><button type="button" onClick={() => void refreshRecent()} className="text-xs font-semibold text-slate-500 underline">Atualizar</button></div>
        {recent.length === 0 ? <p className="mt-3 text-sm text-slate-500">Ainda não há documentos visíveis para esta conta.</p> : (
          <div className="mt-3 space-y-2">
            {recent.map((row) => {
              const destination = destinations.find((item) => item.id === row.ministry_id);
              return <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{destination?.name ?? row.classification_department ?? "Destino por atribuir"} · {row.original_filename} · {Math.round(Number(row.classification_confidence) * 100)}%</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.submitted_at))}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold " + (row.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : row.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800")}>{row.status === "PENDING_REVIEW" ? "Pendente" : row.status === "APPROVED" ? "Aprovado" : "Rejeitado"}</span>
                  {row.status === "PENDING_REVIEW" && row.ministry_id && <>
                    <button type="button" disabled={reviewBusy === row.id} onClick={() => void reviewDocument(row.id, "APPROVED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{reviewBusy === row.id ? "A guardar…" : "Aprovar e registar"}</button>
                    <button type="button" disabled={reviewBusy === row.id} onClick={() => void reviewDocument(row.id, "REJECTED")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40">Rejeitar</button>
                  </>}
                </div>
              </article>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
