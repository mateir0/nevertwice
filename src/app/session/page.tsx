"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PacingRing } from "@/components/PacingRing";
import { ERROR_TYPES, ExamEngine } from "@/engine/exam-engine";
import type { ErrorType, Question } from "@/types";
import { getQuestionsForSession } from "@/config/exams";
import { nustConfig } from "@/config/exams/nust";

const TOTAL_SECONDS = nustConfig.secondsPerQuestion;

export default function SessionPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [errorKinds, setErrorKinds] = useState<(ErrorType | null)[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [startTime] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const qs = getQuestionsForSession(20);
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
          <p className="mt-4 font-mono text-sm text-cream-dim">LOADING DRILLS…</p>
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
    router.push("/results");
  }

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 py-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold tracking-wide text-cream">NET SESSION</p>
          <p className="font-mono text-xs tracking-widest text-cream-dim" aria-live="polite">
            Q {index + 1}/{total}
          </p>
        </div>
        <PacingRing secondsRemaining={secondsLeft} totalSeconds={TOTAL_SECONDS} size={64} strokeWidth={5} />
      </header>

      <div className="copper-border mb-4 h-2 overflow-hidden bg-pcb-deep" aria-hidden="true">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <main>
        <article aria-label={`Question ${index + 1} of ${total}`} className="card">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold tracking-wide text-accent">{question.section}</span>
            <span className="copper-border bg-pcb-panel px-2 py-1 font-mono text-[11px] text-cream-dim">
              {question.topic} / {question.subtopic}
            </span>
          </div>

          <p className="mb-5 font-mono text-base leading-relaxed text-cream">{question.text}</p>

          <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Answer options">
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
                  className="copper-border flex min-h-[56px] items-center gap-3 bg-pcb-panel p-4 text-left font-mono text-sm text-cream transition-all duration-200 disabled:cursor-default"
                  style={{
                    borderColor: revealed ? "#165B45" : wrongPick ? "#B3402E" : undefined,
                    borderWidth: revealed || wrongPick ? "2px" : undefined,
                    backgroundColor: revealed
                      ? "rgba(22,91,69,0.35)"
                      : wrongPick
                        ? "rgba(179,64,46,0.2)"
                        : undefined,
                  }}
                >
                  <span className="font-display text-lg font-bold">{letter}.</span>
                  <span className="flex-1">{opt}</span>
                  {revealed && <span className="rounded bg-trace px-1.5 font-display text-cream">✓</span>}
                  {wrongPick && <span className="rounded bg-brick px-1.5 font-display text-cream">✗</span>}
                </button>
              );
            })}
          </div>

          {isWrong && (
            <div className="mt-5 border-t border-copper pt-4" role="group" aria-label="Classify the error">
              <p className="font-display text-lg font-bold tracking-wide text-cream">
                <span className="rounded bg-brick px-2 py-0.5 text-cream">WRONG</span> — WHAT HAPPENED?
              </p>
              <p className="mb-3 font-mono text-xs text-cream-dim">
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
                          ? { borderColor: "#FFD700", color: "#FFD700", backgroundColor: "rgba(255,215,0,0.08)" }
                          : undefined
                      }
                    >
                      <span className="block text-base">{t.label}</span>
                      <span className="block font-mono text-xs normal-case tracking-normal text-cream-dim">
                        {t.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isCorrect && (
            <p className="font-display mt-5 border-t border-copper pt-4 text-lg font-bold tracking-wide text-cream">
              <span className="rounded bg-trace px-2 py-0.5 text-cream">CORRECT</span> — LOCKED IN.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/app" className="font-mono text-xs tracking-widest text-cream-dim underline">
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
            <p className="mt-2 text-right font-mono text-[11px] text-gold">
              CLASSIFY THE ERROR TO CONTINUE
            </p>
          )}
        </article>
      </main>
    </div>
  );
}
