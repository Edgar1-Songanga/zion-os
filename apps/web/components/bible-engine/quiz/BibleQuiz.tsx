"use client";

import { useMemo, useState } from "react";
import { resaRequest } from "@/lib/resa/api";
import { bibleQuestions } from "@/data/bible/questions";

const LEVELS = [
  { title: "Fundamentos", subtitle: "Conhecimento essencial", tone: "bronze", points: 10 },
  { title: "Explorador", subtitle: "Ligue os textos e as histórias", tone: "silver", points: 20 },
  { title: "Mestre da Palavra", subtitle: "Interpretação e aplicação", tone: "gold", points: 30 },
] as const;

export default function BibleQuiz({ compact = false }: { compact?: boolean }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [levelCorrect, setLevelCorrect] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [levelFinished, setLevelFinished] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  const level = LEVELS[levelIndex];
  const questions = useMemo(() => bibleQuestions.filter((question) => question.level === levelIndex + 1), [levelIndex]);
  const question = questions[questionIndex];
  const passed = levelCorrect >= Math.ceil(questions.length * 0.67);
  const progress = questions.length ? ((questionIndex + (selectedOption ? 1 : 0)) / questions.length) * 100 : 0;

  function chooseAnswer(option: string) {
    if (selectedOption || levelFinished || !question) return;
    setSelectedOption(option);
    if (option === question.answer) {
      setLevelCorrect((value) => value + 1);
      setTotalScore((value) => value + question.points);
    }
  }

  async function advance() {
    if (!selectedOption || !question) return;
    setSyncMessage("");
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((value) => value + 1);
      setSelectedOption(null);
      return;
    }

    setLevelFinished(true);
    setSavingProgress(true);
    try {
      await resaRequest("/v1/spiritual/growth", {
        method: "POST",
        body: JSON.stringify({
          area: "bible",
          source: `bible_challenge_study_level_${levelIndex + 1}_${Date.now()}`,
          metadata: { activity: "bible_challenge", level: levelIndex + 1, correct: levelCorrect, total: questions.length, passed: levelCorrect >= Math.ceil(questions.length * 0.67), score: totalScore },
        }),
      });
      setSyncMessage("Progresso registado na tua jornada espiritual.");
    } catch {
      setSyncMessage("O nível foi concluído nesta sessão, mas o registo de progresso não foi confirmado. Verifica a ligação e tenta novamente mais tarde.");
    } finally {
      setSavingProgress(false);
    }
  }

  function nextLevel() {
    if (!passed || levelIndex >= LEVELS.length - 1) return;
    setLevelIndex((value) => value + 1);
    setQuestionIndex(0);
    setLevelCorrect(0);
    setSelectedOption(null);
    setLevelFinished(false);
    setSyncMessage("");
  }

  function restart() {
    setLevelIndex(0);
    setQuestionIndex(0);
    setTotalScore(0);
    setLevelCorrect(0);
    setSelectedOption(null);
    setLevelFinished(false);
    setSyncMessage("");
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
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Pontuação da sessão</p>
            <p className="mt-1 text-2xl font-semibold text-[#E2C477]">{totalScore}</p>
          </div>
        </div>
        <div className="relative mt-5 flex gap-2" aria-label={`Nível ${levelIndex + 1} de ${LEVELS.length}`}>
          {LEVELS.map((item, index) => (
            <div key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= levelIndex ? "bg-[#D4AF37]" : "bg-white/15"}`} />
          ))}
        </div>
        <div className="relative mt-2 flex justify-between text-[10px] text-slate-400"><span>Nível {levelIndex + 1} de {LEVELS.length}</span><span>{level.points} pontos por resposta certa</span></div>
      </div>

      <div className="p-5 sm:p-7">
        {levelFinished ? (
          <div className="py-3 text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <span className="text-2xl">{passed ? "✓" : "↻"}</span>
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9B7A34]">Fase concluída</p>
            <h3 className="mt-2 text-2xl font-semibold">{passed ? "Nível desbloqueado" : "Vamos consolidar o conhecimento"}</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Acertaste {levelCorrect} de {questions.length} perguntas. {passed ? "A próxima fase está disponível." : `Precisas de acertar em pelo menos ${Math.ceil(questions.length * 0.67)} perguntas para avançar. Podes repetir esta fase.`}
            </p>
            {syncMessage && <p role="status" className="mx-auto mt-4 max-w-xl rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{syncMessage}</p>}
            {savingProgress && <p className="mt-3 text-xs text-slate-400">A sincronizar progresso…</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!passed && <button type="button" onClick={() => { setQuestionIndex(0); setLevelCorrect(0); setSelectedOption(null); setLevelFinished(false); setSyncMessage(""); }} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54]">Repetir nível</button>}
              {passed && levelIndex < LEVELS.length - 1 && <button type="button" onClick={nextLevel} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54]">Desbloquear nível seguinte →</button>}
              {passed && levelIndex === LEVELS.length - 1 && <button type="button" onClick={restart} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54]">Recomeçar desafio</button>}
            </div>
          </div>
        ) : question ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pergunta {questionIndex + 1} / {questions.length}</p>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold text-slate-500">{question.points} pts</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#C8A24A] transition-all" style={{ width: `${progress}%` }} /></div>
            <h3 className="mt-6 text-xl font-semibold leading-8 tracking-tight sm:text-2xl">{question.question}</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {question.options.map((option, index) => {
                const isAnswer = option === question.answer;
                const isSelected = option === selectedOption;
                const style = selectedOption && isAnswer
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : selectedOption && isSelected
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#C8A24A]/60 hover:bg-[#FBF8F0]";
                return (
                  <button key={option} type="button" disabled={Boolean(selectedOption)} onClick={() => chooseAnswer(option)}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border p-4 text-left text-sm font-medium transition disabled:cursor-default ${style}`}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/15 text-[11px]">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                    {selectedOption && isAnswer && <span className="ml-auto">✓</span>}
                  </button>
                );
              })}
            </div>
            {selectedOption && (
              <div className={`mt-4 rounded-xl border p-4 ${selectedOption === question.answer ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"}`}>
                <p className="text-sm font-semibold">{selectedOption === question.answer ? "Resposta correta" : `A resposta correta é: ${question.answer}`}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{question.explanation}</p>
                <p className="mt-2 text-xs font-semibold text-[#8B6F16]">Referência: {question.reference}</p>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">{levelCorrect} resposta(s) certa(s) nesta fase</p>
              <button type="button" disabled={!selectedOption} onClick={() => void advance()} className="rounded-xl bg-[#0C1A3D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#152b54] disabled:cursor-not-allowed disabled:opacity-40">
                {questionIndex === questions.length - 1 ? "Concluir nível" : "Próxima pergunta →"}
              </button>
            </div>
          </>
        ) : <p className="text-sm text-slate-500">Não existem perguntas configuradas para este nível.</p>}
      </div>
    </section>
  );
}
