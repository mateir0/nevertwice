"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PacingRing } from "@/components/PacingRing";
import { ERROR_TYPES, ExamEngine } from "@/engine/exam-engine";
import { clearActiveDrill, loadActiveDrill, type DrillPlan } from "@/engine/drill-planner";
import type { ErrorType, Question } from "@/types";
import { displayMath } from "@/engine/format-math";
import { getQuestionsForSession } from "@/config/exams";
import { nustConfig } from "@/config/exams/nust";

const TOTAL_SECONDS = nustConfig.secondsPerQuestion;

export default function SessionPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [drill, setDrill] = useState<DrillPlan | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [errorKinds, setErrorKinds] = useState<(ErrorType | null)[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [startTime] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const active = loadActiveDrill();
    const qs = active ? active.questions : getQuestionsForSession(20);
    if (active) setDrill(active);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(null));
    setErrorKinds(new Array(qs.length).fill(null));
  }, []);

  useEffect(() => {
    setSecondsLeft(TOTAL_SECONDS);
  }, [index]);

  useEffect(() => {
    if (!questions) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [questions, index]);

  const total = questions?.length ?? 0;
  const question = questions?.[index] ?? null;

  const selected = useMemo(
    () => (questions ? answers[index] ?? null : null),
    [answers, index, questions],
  );
  const isAnswered = selected !== null;
  const isCorrect = question !== null && isAnswered && selected === question.correctIndex;
  const isWrong = question !== null && isAnswered && selected !== question.correctIndex;
  const classified = errorKinds[index] ?? null;
  const canAdvance = isCorrect || (isWrong && classified !== null);
  const isLast = index >= total - 1;

  if (!questions || !question) {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center px-4">
        <div className="text-center">
          <PacingRing secondsRemaining={TOTAL_SECONDS} totalSeconds={TOTAL_SECONDS} size={96} />
          <p className="mt-4 font-display text-[17px] text-parchment/80">LOADING DRILLS…</p>
        </div>
      </div>
    );
  }

  function choose(i: number): void {
    if (answers[index] !== null) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });
  }

  function classify(kind: ErrorType): void {
    setErrorKinds((prev) => {
      const next = [...prev];
      next[index] = kind;
      return next;
    });
  }

  function finish(): void {
    if (finishing || !questions) return;
    setFinishing(true);
    const now = Date.now();
    const sessionId = `session-${now}`;
    let correct = 0;
    const mistakes = questions.flatMap((q, qi) => {
      const sel = answers[qi];
      if (sel === null) return [];
      if (sel === q.correctIndex) {
        correct += 1;
        return [];
      }
      return [
        {
          id: `mistake-${sessionId}-${qi}`,
          questionId: q.id,
          topic: q.topic,
          subtopic: q.subtopic,
          errorType: (errorKinds[qi] ?? "concept-gap") as ErrorType,
          timestamp: now,
          sessionId,
        },
      ];
    });

    const session = {
      id: sessionId,
      date: now,
      questionsAttempted: questions.length,
      correct,
      mistakes,
      durationSeconds: Math.max(1, Math.floor((now - startTime) / 1000)),
    };

    ExamEngine.saveSession(session);
    ExamEngine.saveLastDetail(
      questions.map((q, qi) => ({
        questionId: q.id,
        section: q.section,
        topic: q.topic,
        subtopic: q.subtopic,
        selected: answers[qi] ?? null,
        correctIndex: q.correctIndex,
        isCorrect: answers[qi] === q.correctIndex,
      })),
    );
    ExamEngine.recordSession(session);
    clearActiveDrill();
    router.push("/results");
  }

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 py-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl tracking-wide text-parchment">{drill ? "TARGETED DRILL" : "NET SESSION"}</p>
          <p className="font-type text-xs tracking-widest text-faded" aria-live="polite">
            Q {index + 1}/{total}
            {drill ? " · TARGETED DRILL" : ""}
          </p>
        </div>
        <PacingRing secondsRemaining={secondsLeft} totalSeconds={TOTAL_SECONDS} size={64} strokeWidth={5} />
      </header>

      <div className="bronze-frame mb-4 h-2 overflow-hidden bg-panel" aria-hidden="true">
        <div
          className="h-full bg-bronze transition-all duration-300"
          style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <main>
        <article aria-label={`Question ${index + 1} of ${total}`} className="card">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl tracking-wide text-blood">{question.section}</span>
              <span className="bronze-frame bg-night px-2 py-1 font-type text-[11px] text-faded">
                {question.topic} / {question.subtopic}
              </span>
            </div>
            <span className="flex-none text-right font-type text-xs tracking-widest text-faded">
              № {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <p className="mb-7 text-[21px] leading-relaxed text-parchment">{displayMath(question.text)}</p>

          <div className="grid grid-cols-1 gap-4" role="radiogroup" aria-label="Answer options">
            {question.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const picked = selected === i;
              const revealed = isAnswered && i === question.correctIndex;
              const wrongPick = isWrong && picked;
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={picked}
                  disabled={isAnswered}
                  onClick={() => choose(i)}
                  className="bronze-frame flex items-center gap-4 bg-night p-5 text-left transition-all duration-200 disabled:cursor-default enabled:hover:translate-x-1 enabled:hover:border-amber enabled:hover:shadow-[0_0_18px_rgba(166,124,61,0.3)]"
                  style={{
                    borderLeft: revealed
                      ? "4px solid #6B7F4E"
                      : wrongPick
                        ? "4px solid #B3202C"
                        : undefined,
                    backgroundColor: revealed
                      ? "rgba(107,127,78,0.1)"
                      : wrongPick
                        ? "rgba(179,32,44,0.08)"
                        : undefined,
                    boxShadow: revealed ? "0 0 18px rgba(107,127,78,0.35)" : undefined,
                  }}
                >
                  <span className={`keycap${revealed ? " keycap-olive" : wrongPick ? " keycap-blood" : ""}`}>
                    {letter}
                  </span>
                  <span className="flex-1 font-type text-[17px] text-parchment">{displayMath(opt)}</span>
                  {revealed && <span className="rounded bg-olive px-1.5 font-type text-night">✓</span>}
                  {wrongPick && <span className="rounded bg-blood px-1.5 font-type text-parchment">✗</span>}
                </button>
              );
            })}
          </div>

          {isWrong && (
            <div className="mt-5 border-t border-bronze pt-4" role="group" aria-label="Classify the error">
              <p className="font-display text-xl tracking-wide text-parchment">
                <span className="rounded bg-blood px-2 py-0.5 font-type text-sm font-bold text-parchment">WRONG</span> — WHAT HAPPENED?
              </p>
              <p className="mb-3 font-type text-xs text-faded">
                TAP ONE. REQUIRED BEFORE ADVANCING.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {ERROR_TYPES.map((t) => {
                  const active = classified === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => classify(t.value)}
                      aria-pressed={active}
                      className="chip text-left"
                      style={
                        active
                          ? { borderColor: "#B3202C", borderWidth: "2px", backgroundColor: "rgba(179,32,44,0.07)" }
                          : undefined
                      }
                    >
                      <span className="block font-type text-base font-bold">{t.label}</span>
                      <span className="block font-display text-[15px] normal-case tracking-normal text-parchment/80">
                        {t.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isCorrect && (
            <p className="font-display mt-5 border-t border-bronze pt-4 text-xl tracking-wide text-parchment">
              <span className="rounded bg-olive px-2 py-0.5 font-type text-sm font-bold text-night">CORRECT</span> — LOCKED IN.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/app" className="font-type text-xs tracking-widest text-faded underline">
              QUIT
            </Link>
            {!isLast ? (
              <button
                disabled={!canAdvance}
                onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-30"
              >
                NEXT
              </button>
            ) : (
              <button
                disabled={!canAdvance || finishing}
                onClick={finish}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-30"
              >
                {finishing ? "SAVING…" : "FINISH"}
              </button>
            )}
          </div>
          {isAnswered && !canAdvance && (
            <p className="mt-2 text-right font-type text-[11px] font-bold text-blood">
              CLASSIFY THE ERROR TO CONTINUE
            </p>
          )}
        </article>
      </main>
    </div>
  );
}
