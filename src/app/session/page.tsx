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
          <p className="mt-4 font-mono text-sm text-static-grey">LOADING DRILLS…</p>
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
          <p className="font-display text-xl tracking-widest">NET SESSION</p>
          <p className="font-mono text-xs tracking-widest text-static-grey" aria-live="polite">
            Q {index + 1}/{total}
          </p>
        </div>
        <PacingRing secondsRemaining={secondsLeft} totalSeconds={TOTAL_SECONDS} size={64} strokeWidth={5} />
      </header>

      <div className="terminal-border mb-4 h-2 overflow-hidden bg-charcoal" aria-hidden="true">
        <div
          className="h-full bg-crt-green transition-all duration-500"
          style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <main>
        <article aria-label={`Question ${index + 1} of ${total}`} className="card scanlines">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-display text-lg tracking-widest text-crt-green">{question.section}</span>
            <span className="terminal-border bg-terminal-bg px-2 py-1 font-mono text-[11px] text-static-grey">
              {question.topic} / {question.subtopic}
            </span>
          </div>

          <p className="mb-5 font-mono text-base leading-relaxed">{question.text}</p>

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
                  className="terminal-border flex min-h-[56px] items-center gap-3 p-4 text-left font-mono text-sm transition-all duration-150 disabled:cursor-default"
                  style={{
                    borderColor: revealed ? "#33FF00" : wrongPick ? "#CC0000" : undefined,
                    backgroundColor: revealed
                      ? "rgba(51,255,0,0.08)"
                      : wrongPick
                        ? "rgba(204,0,0,0.08)"
                        : undefined,
                  }}
                >
                  <span className="font-display text-lg">{letter}.</span>
                  <span className="flex-1">{opt}</span>
                  {revealed && <span className="font-display text-crt-green">✓</span>}
                  {wrongPick && <span className="font-display text-tape-red">✗</span>}
                </button>
              );
            })}
          </div>

          {isWrong && (
            <div className="mt-5 border-t border-terminal-border pt-4" role="group" aria-label="Classify the error">
              <p className="font-display text-lg tracking-widest text-tape-red">
                WRONG — WHAT HAPPENED?
              </p>
              <p className="mb-3 font-mono text-xs text-static-grey">
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
                          ? { borderColor: "#FFB000", color: "#FFB000", backgroundColor: "rgba(255,176,0,0.08)" }
                          : undefined
                      }
                    >
                      <span className="block text-base">{t.label}</span>
                      <span className="block font-mono text-xs normal-case tracking-normal text-static-grey">
                        {t.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isCorrect && (
            <p className="mt-5 border-t border-terminal-border pt-4 font-display text-lg tracking-widest text-crt-green">
              CORRECT — LOCKED IN.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/" className="font-mono text-xs tracking-widest text-static-grey underline">
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
            <p className="mt-2 text-right font-mono text-[11px] text-tape-red">
              CLASSIFY THE ERROR TO CONTINUE
            </p>
          )}
        </article>
      </main>
    </div>
  );
}
