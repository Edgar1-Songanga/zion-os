"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { bibleQuestions, type BibleChallengeQuestion } from "@/data/bible/questions";

const LEVELS = [
  { title: "Descoberta", subtitle: "As primeiras histórias da Palavra", points: 10, marker: "I" },
  { title: "Caminhante", subtitle: "Personagens, lugares e acontecimentos", points: 20, marker: "II" },
  { title: "Explorador", subtitle: "Uma viagem pelo Antigo e Novo Testamento", points: 30, marker: "III" },
  { title: "Avançado", subtitle: "Contexto, ligações e aplicação", points: 40, marker: "IV" },
  { title: "Expert", subtitle: "Profecia, teologia e interpretação", points: 50, marker: "V" },
  { title: "Hyper Advanced", subtitle: "Síntese bíblica e leitura aprofundada", points: 60, marker: "VI" },
] as const;

type PlayMode = "junior" | "classic" | "hyper";
type ReviewScheduleEntry = { dueAt: number; intervalDays: number; repetitions: number; updatedAt?: string };
type ReviewSchedule = Record<number, ReviewScheduleEntry>;
const REVIEW_STORAGE_KEY = "zion:bible-review-schedule:v1";
const MODE_LABELS: Record<PlayMode, string> = {
  junior: "Júnior",
  classic: "Clássico",
  hyper: "Hyper",
};

function shuffle<T,>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export default function BibleQuiz({ compact = false }: { compact?: boolean }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [levelCorrect, setLevelCorrect] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [reviewSchedule, setReviewSchedule] = useState<ReviewSchedule>({});
  const [reviewDeckIds, setReviewDeckIds] = useState<number[]>([]);
  const [reviewSyncStatus, setReviewSyncStatus] = useState<"loading" | "synced" | "local">("loading");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [levelFinished, setLevelFinished] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("classic");
  const [hintUsed, setHintUsed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<BibleChallengeQuestion[]>([]);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [hintNudge, setHintNudge] = useState(false);
  const [deckVersion, setDeckVersion] = useState(0);
  const [shuffledOrder, setShuffledOrder] = useState<number[] | null>(null);
  const [optionOrder, setOptionOrder] = useState<string[] | null>(null);

  const level = LEVELS[levelIndex];
  const baseQuestionPool = useMemo(
    () => bibleQuestions.filter((item) => item.level === levelIndex + 1),
    [levelIndex],
  );
  const dueReviewQuestions = useMemo(() => {
    const currentIds = new Set(baseQuestionPool.map((item) => item.id));
    return reviewDeckIds
      .filter((id) => !currentIds.has(id))
      .slice(0, 3)
      .map((id) => bibleQuestions.find((item) => item.id === id))
      .filter((item): item is BibleChallengeQuestion => item !== undefined);
  }, [baseQuestionPool, reviewDeckIds]);
  const questionPool = useMemo(
    () => [...baseQuestionPool, ...dueReviewQuestions],
    [baseQuestionPool, dueReviewQuestions],
  );
  const dueReviewCount = Object.values(reviewSchedule).filter((entry) => entry.dueAt <= Date.now()).length;

  useEffect(() => {
    let active = true;
    const loadSchedule = async () => {
      let local: ReviewSchedule = {};
      try {
        const stored = window.localStorage.getItem(REVIEW_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, ReviewScheduleEntry>;
          for (const [id, entry] of Object.entries(parsed)) {
            const questionId = Number(id);
            if (Number.isInteger(questionId) && bibleQuestions.some((item) => item.id === questionId)
              && Number.isFinite(entry?.dueAt) && Number.isFinite(entry?.intervalDays)
              && Number.isFinite(entry?.repetitions)) {
              local[questionId] = { ...entry, updatedAt: entry.updatedAt ?? new Date().toISOString() };
            }
          }
        }
      } catch { /* Continue with account sync even if local storage is unavailable. */ }

      try {
        const response = await resaRequest<{ items: Array<{
          questionId: number; dueAt: string; intervalDays: number; repetitions: number; updatedAt: string;
        }> }>("/v1/spiritual/bible-review");
        const remote: ReviewSchedule = {};
        for (const item of response.items ?? []) {
          if (!bibleQuestions.some((question) => question.id === item.questionId)
            || !Number.isFinite(Date.parse(item.dueAt))
            || !Number.isFinite(item.intervalDays) || !Number.isFinite(item.repetitions)) continue;
          remote[item.questionId] = {
            dueAt: Date.parse(item.dueAt), intervalDays: item.intervalDays,
            repetitions: item.repetitions, updatedAt: item.updatedAt,
          };
        }

        const merged: ReviewSchedule = { ...remote };
        for (const [id, localEntry] of Object.entries(local)) {
          const questionId = Number(id);
          const remoteEntry = remote[questionId];
          const localUpdated = localEntry.updatedAt ? Date.parse(localEntry.updatedAt) : 0;
          const remoteUpdated = remoteEntry?.updatedAt ? Date.parse(remoteEntry.updatedAt) : 0;
          if (!remoteEntry || localUpdated > remoteUpdated) {
            merged[questionId] = localEntry;
            void resaRequest("/v1/spiritual/bible-review/" + questionId, {
              method: "PUT",
              body: JSON.stringify({
                dueAt: new Date(localEntry.dueAt).toISOString(),
                intervalDays: localEntry.intervalDays,
                repetitions: localEntry.repetitions,
              }),
            }).catch(() => undefined);
          }
        }
        if (!active) return;
        setReviewSchedule(merged);
        setReviewDeckIds(Object.entries(merged).filter(([, entry]) => entry.dueAt <= Date.now()).map(([id]) => Number(id)));
        setReviewSyncStatus("synced");
        try { window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(merged)); } catch { /* Optional local cache. */ }
      } catch {
        if (!active) return;
        setReviewSchedule(local);
        setReviewDeckIds(Object.entries(local).filter(([, entry]) => entry.dueAt <= Date.now()).map(([id]) => Number(id)));
        setReviewSyncStatus("local");
      }
    };
    void loadSchedule();
    return () => { active = false; };
  }, []);

  function scheduleReview(questionId: number, correct: boolean) {
    const existing = reviewSchedule[questionId];
    if (correct && (!existing || existing.dueAt > Date.now())) return;

    const now = Date.now();
    const nextEntry: ReviewScheduleEntry = correct && existing
      ? {
          updatedAt: new Date(now).toISOString(),
          dueAt: now + (existing.repetitions === 0 ? 3 : existing.repetitions === 1 ? 7 : existing.repetitions === 2 ? 14 : 30) * 24 * 60 * 60 * 1000,
          intervalDays: existing.repetitions === 0 ? 3 : existing.repetitions === 1 ? 7 : existing.repetitions === 2 ? 14 : 30,
          repetitions: existing.repetitions + 1,
        }
      : { dueAt: now + 24 * 60 * 60 * 1000, intervalDays: 1, repetitions: 0, updatedAt: new Date(now).toISOString() };
    const next = { ...reviewSchedule, [questionId]: nextEntry };
    setReviewSchedule(next);
    try { window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next)); } catch { /* Account persistence remains available. */ }
    void resaRequest("/v1/spiritual/bible-review/" + questionId, {
      method: "PUT",
      body: JSON.stringify({ dueAt: new Date(nextEntry.dueAt).toISOString(), intervalDays: nextEntry.intervalDays, repetitions: nextEntry.repetitions }),
    }).then(() => setReviewSyncStatus("synced")).catch(() => setReviewSyncStatus("local"));
  }
  const questions = useMemo(() => {
    if (!shuffledOrder) return questionPool;
    const byId = new Map(questionPool.map((item) => [item.id, item]));
    const ordered = shuffledOrder.map((id) => byId.get(id)).filter((item) => item !== undefined);
    return ordered.length === questionPool.length ? ordered : questionPool;
  }, [questionPool, shuffledOrder]);
  const question = questions[questionIndex];
  const options = optionOrder ?? question?.options ?? [];
  const requiredCorrect = Math.ceil(
    questions.length * (playMode === "junior" ? 0.6 : playMode === "hyper" ? 0.8 : 2 / 3),
  );
  const passed = levelCorrect >= requiredCorrect;
  const progress = questions.length
    ? ((questionIndex + (selectedOption !== null ? 1 : 0)) / questions.length) * 100
    : 0;
  const isSkipped = selectedOption === "__skip__";

  useEffect(() => {
    setShuffledOrder(shuffle(questionPool.map((item) => item.id)));
  }, [levelIndex, deckVersion, questionPool]);

  useEffect(() => {
    setOptionOrder(question ? shuffle(question.options) : null);
    setHiddenOptions([]);
    setHintUsed(false);
    setHintVisible(false);
  }, [question?.id, deckVersion]);

  useEffect(() => {
    setHintNudge(false);
    if (!question || selectedOption !== null || levelFinished) return;
    const delay = playMode === "junior" ? 8000 : 12000;
    const timer = window.setTimeout(() => setHintNudge(true), delay);
    return () => window.clearTimeout(timer);
  }, [question?.id, selectedOption, levelFinished, playMode]);

  const advance = useCallback(async () => {
    if (selectedOption === null || !question) return;
    setHintNudge(false);
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((value) => value + 1);
      setSelectedOption(null);
      return;
    }

    setLevelFinished(true);
    setSavingProgress(true);
    setSyncMessage("");
    try {
      await resaRequest("/v1/spiritual/growth", {
        method: "POST",
        body: JSON.stringify({
          area: "bible",
          source: "bible_challenge_study_level_" + (levelIndex + 1) + "_" + Date.now(),
          metadata: {
            activity: "bible_challenge",
            level: levelIndex + 1,
            levelName: level.title,
            mode: playMode,
            correct: levelCorrect,
            total: questions.length,
            passed: levelCorrect >= requiredCorrect,
            score: totalScore,
            bestStreak,
          },
        }),
      });
      setSyncMessage("Progresso enviado para a tua jornada espiritual.");
    } catch {
      setSyncMessage("O resultado ficou nesta sessão, mas não foi possível confirmar a sincronização. Podes continuar a jogar.");
    } finally {
      setSavingProgress(false);
    }
  }, [
    selectedOption,
    question,
    questionIndex,
    questions.length,
    levelIndex,
    level.title,
    playMode,
    levelCorrect,
    requiredCorrect,
    totalScore,
    bestStreak,
  ]);

  useEffect(() => {
    if (selectedOption === null || levelFinished) return;
    const timer = window.setTimeout(() => {
      void advance();
    }, isSkipped ? 650 : 1450);
    return () => window.clearTimeout(timer);
  }, [selectedOption, levelFinished, isSkipped, advance]);

  function refreshReviewDeck() {
    setReviewDeckIds(Object.entries(reviewSchedule).filter(([, entry]) => entry.dueAt <= Date.now()).map(([id]) => Number(id)));
  }

  function chooseAnswer(option: string) {
    if (selectedOption !== null || levelFinished || !question) return;
    scheduleReview(question.id, option === question.answer);
    setSelectedOption(option);
    if (option === question.answer) {
      setLevelCorrect((value) => value + 1);
      setTotalScore((value) => value + question.points);
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
      setBestStreak((best) => Math.max(best, nextStreak));
    } else {
      setMissedQuestions((current) => current.some((item) => item.id === question.id) ? current : [...current, question]);
      setCurrentStreak(0);
    }
  }

  function revealHint() {
    if (!question || selectedOption !== null || hintUsed) return;
    const wrongOptions = shuffle(options.filter((option) => option !== question.answer));
    setHiddenOptions(wrongOptions.slice(0, Math.min(2, wrongOptions.length)));
    setHintVisible(true);
    setHintUsed(true);
    setHintNudge(false);
  }

  function skipQuestion() {
    if (selectedOption !== null || !question) return;
    scheduleReview(question.id, false);
    setCurrentStreak(0);
    setSelectedOption("__skip__");
  }

  function nextLevel() {
    if (!passed || levelIndex >= LEVELS.length - 1) return;
    refreshReviewDeck();
    setLevelIndex((value) => value + 1);
    setQuestionIndex(0);
    setLevelCorrect(0);
    setMissedQuestions([]);
    setSelectedOption(null);
    setLevelFinished(false);
    setSyncMessage("");
    setHintNudge(false);
  }

  function restartLevel() {
    refreshReviewDeck();
    setQuestionIndex(0);
    setLevelCorrect(0);
    setMissedQuestions([]);
    setSelectedOption(null);
    setLevelFinished(false);
    setSyncMessage("");
    setHintNudge(false);
    setDeckVersion((value) => value + 1);
  }

  function restartJourney() {
    refreshReviewDeck();
    setLevelIndex(0);
    setQuestionIndex(0);
    setTotalScore(0);
    setLevelCorrect(0);
    setMissedQuestions([]);
    setCurrentStreak(0);
    setBestStreak(0);
    setSelectedOption(null);
    setLevelFinished(false);
    setSyncMessage("");
    setHintNudge(false);
    setDeckVersion((value) => value + 1);
  }

  return (
    <section className={compact
      ? "overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white text-[#0C1A3D]"
      : "overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-[#0C1A3D] shadow-[0_18px_55px_rgba(15,23,42,0.07)]"}>
      <div className="relative isolate overflow-hidden bg-[#071126] px-5 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="absolute -right-8 -top-16 h-44 w-44 rounded-full border border-[#D4AF37]/30" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#E2C477]">ZION · Desafio bíblico</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{level.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{level.subtitle}</p>
            <p className="mt-3 text-xs text-slate-400">120 perguntas · 6 níveis progressivos · revisão espaçada</p>
            {dueReviewCount > 0 && <p className="mt-2 inline-flex rounded-full border border-[#E2C477]/25 bg-[#E2C477]/10 px-3 py-1.5 text-[11px] font-medium text-[#E2C477]">{dueReviewCount} pergunta(s) prontas para rever</p>}
            <p className="mt-2 text-[10px] text-slate-400" role="status">{reviewSyncStatus === "loading" ? "A preparar as tuas revisões…" : reviewSyncStatus === "synced" ? "Revisões associadas à tua conta" : "Revisões guardadas neste dispositivo; inicia sessão para sincronizar"}</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Pontos</p>
              <p className="mt-1 text-2xl font-semibold text-[#E2C477]">{totalScore}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-3 text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Sequência</p>
              <p className="mt-1 text-2xl font-semibold text-white">{currentStreak} <span className="text-xs font-normal text-slate-400">/ {bestStreak}</span></p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex gap-2" aria-label={"Nível " + (levelIndex + 1) + " de " + LEVELS.length}>
          {LEVELS.map((item, index) => (
            <div key={item.title} title={item.title} className={"h-1.5 flex-1 rounded-full " + (index <= levelIndex ? "bg-[#D4AF37]" : "bg-white/15")} />
          ))}
        </div>
        <div className="relative mt-2 flex justify-between gap-3 text-[10px] text-slate-400">
          <span>Nível {levelIndex + 1} de {LEVELS.length} · {questions.length} perguntas</span>
          <span>{level.points} pts por acerto</span>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Escolhe o ritmo</p>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Modo de jogo">
            {(["junior", "classic", "hyper"] as PlayMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => setPlayMode(mode)}
                aria-pressed={playMode === mode}
                className={"rounded-lg px-3 py-2 text-xs font-semibold transition " + (playMode === mode ? "bg-[#0C1A3D] text-white shadow-sm" : "text-slate-500 hover:text-slate-900")}>
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-5 text-xs leading-5 text-slate-500">
          {playMode === "junior"
            ? "Modo Júnior: ritmo mais leve, dicas mais cedo e avanço com 60% de acertos."
            : playMode === "hyper"
              ? "Modo Hyper: desafio máximo — precisas de 80% de acertos para desbloquear o próximo nível."
              : "Modo Clássico: equilíbrio entre descoberta, memória e aprofundamento bíblico."}
        </p>

        {levelFinished ? (
          <div className="py-3 text-center">
            <div className={"mx-auto flex h-16 w-16 items-center justify-center rounded-2xl " + (passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
              <span className="text-2xl">{passed ? "✓" : "↻"}</span>
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Fase concluída</p>
            <h3 className="mt-2 text-2xl font-semibold">{passed ? (levelIndex === LEVELS.length - 1 ? "Hyper Advanced conquistado" : "Nível desbloqueado") : "Vamos consolidar o conhecimento"}</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Acertaste {levelCorrect} de {questions.length} perguntas. {passed
                ? levelIndex === LEVELS.length - 1
                  ? "Concluíste o último nível desta edição. A jornada bíblica continua a crescer."
                  : "A próxima fase está disponível."
                : "Precisas de pelo menos " + requiredCorrect + " acertos para avançar. Podes repetir esta fase."}
            </p>
            {missedQuestions.length > 0 && <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left"><h4 className="text-sm font-semibold text-[#0C1A3D]">Revisão para fixar o que aprendeste</h4><p className="mt-1 text-xs leading-5 text-slate-600">Estas perguntas merecem uma segunda leitura. Rever a referência ajuda a consolidar a aprendizagem.</p><div className="mt-3 space-y-3">{missedQuestions.map((item) => <div key={item.id} className="border-t border-amber-200/70 pt-3"><p className="text-sm font-semibold text-slate-800">{item.question}</p><p className="mt-1 text-xs leading-5 text-slate-600">Resposta: {item.answer} · {item.reference}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.explanation}</p></div>)}</div></div>}
            {syncMessage && <p role="status" className="mx-auto mt-4 max-w-xl rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{syncMessage}</p>}
            {savingProgress && <p className="mt-3 text-xs text-slate-400">A sincronizar progresso…</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!passed && <button type="button" onClick={restartLevel} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54]">Tentar novamente</button>}
              {passed && levelIndex < LEVELS.length - 1 && <button type="button" onClick={nextLevel} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54]">Desbloquear próximo nível →</button>}
              {passed && levelIndex === LEVELS.length - 1 && <button type="button" onClick={restartJourney} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54]">Recomeçar jornada</button>}
            </div>
          </div>
        ) : question ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pergunta {questionIndex + 1} / {questions.length}</p>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500">{question.points} pontos</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#C8A24A] transition-all duration-500" style={{ width: progress + "%" }} />
            </div>
            {Boolean(reviewSchedule[question.id] && reviewSchedule[question.id].dueAt <= Date.now()) && <p className="mt-5 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#FBF8F0] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B6F16]">Revisão para consolidar a memória</p>}
            <h3 className="mt-3 text-xl font-semibold leading-8 tracking-tight sm:text-2xl">{question.question}</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {options.map((option, index) => {
                const isAnswer = option === question.answer;
                const isSelected = option === selectedOption;
                const isHidden = hiddenOptions.includes(option);
                const style = selectedOption !== null && isAnswer
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : selectedOption !== null && isSelected
                    ? "border-red-200 bg-red-50 text-red-900"
                    : isHidden
                      ? "border-slate-100 bg-slate-50 text-slate-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#C8A24A]/60 hover:bg-[#FBF8F0]";
                return (
                  <button key={option} type="button" disabled={selectedOption !== null || isHidden} onClick={() => chooseAnswer(option)}
                    className={"flex min-h-14 items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition disabled:cursor-default " + style}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/15 text-[11px]">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                    {selectedOption !== null && isAnswer && <span className="ml-auto">✓</span>}
                    {isHidden && <span className="ml-auto text-[10px]">Eliminada</span>}
                  </button>
                );
              })}
            </div>

            {hintVisible && selectedOption === null && <div className="mt-4 rounded-xl border border-[#D4AF37]/30 bg-[#FBF8F0] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6F16]">Pista para pensar</p><p className="mt-1 text-sm leading-6 text-slate-700">{question.hint}</p><p className="mt-2 text-xs text-slate-500">A dica ajuda-te a raciocinar; podes responder quando estiveres pronto.</p></div>}

            {selectedOption !== null && (
              <div role="status" aria-live="polite" className={"mt-4 rounded-xl border p-4 " + (isSkipped ? "border-slate-200 bg-slate-50" : selectedOption === question.answer ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70")}>
                <p className="text-sm font-semibold">
                  {isSkipped ? "Pergunta saltada — continuamos!" : selectedOption === question.answer ? "Excelente! Resposta correta." : "Vamos aprender: a resposta certa é " + question.answer + "."}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{question.explanation}</p>
                <p className="mt-2 text-xs font-semibold text-[#8B6F16]">Referência: {question.reference}</p>
                <p className="mt-3 text-[10px] text-slate-400">A próxima pergunta começa automaticamente…</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">{levelCorrect} acerto(s) nesta fase · mínimo {requiredCorrect}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={selectedOption !== null || hintUsed} onClick={revealHint}
                  className="rounded-xl border border-[#C8A24A]/40 px-4 py-3 text-sm font-semibold text-[#8B6F16] transition hover:bg-[#FBF8F0] disabled:cursor-not-allowed disabled:opacity-40">
                  {hintUsed ? "Dica usada" : "✦ Pedir uma dica"}
                </button>
                <button type="button" disabled={selectedOption !== null} onClick={skipQuestion}
                  className="rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Saltar pergunta →
                </button>
              </div>
            </div>
            {hintNudge && selectedOption === null && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#FBF8F0] p-4">
                <p className="text-sm text-slate-700">Precisas de uma ajuda? Uma pista pode desbloquear a resposta.</p>
                <button type="button" onClick={revealHint} disabled={hintUsed} className="rounded-lg bg-[#0C1A3D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                  {hintUsed ? "Já usaste a dica" : "Mostrar pista"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Este nível ainda não tem perguntas disponíveis.</p>
        )}
      </div>
    </section>
  );
}
