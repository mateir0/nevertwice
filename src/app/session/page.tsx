"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PacingRing } from "@/components/PacingRing";
import { OfflineBadge } from "@/components/OfflineBadge";
import { ERROR_TYPES, ExamEngine, TIMEOUT_ANSWER, mistakesFromAnswers, nodeKey } from "@/engine/exam-engine";
import { clearActiveDrill, loadActiveDrill, type DrillPlan } from "@/engine/drill-planner";
import type { ErrorType, Question, Session } from "@/types";
import { displayMath } from "@/engine/format-math";
import { getQuestionsForSession } from "@/config/exams";
import { nustConfig } from "@/config/exams/nust";

const TOTAL_SECONDS = nustConfig.secondsPerQuestion;

/** Post-answer debrief panel: the correct letter + why the answer is right.
 * The container mounts in its final layout immediately (one instant reflow);
 * only the inner content animates (compositor-only opacity + translateY). */
function Debrief({ question }: { question: Question }) {
  const letter = String.fromCharCode(65 + question.correctIndex);
  return (
    <section className="mt-4 border-t border-bronze pt-4" aria-label="Answer debrief">
      <div className="debrief-content-in">
        <p className="font-display text-lg tracking-wide text-amber">
          DEBRIEF — WHY {letter} IS RIGHT
        </p>
        <p className="mt-2 font-type text-[16px] leading-relaxed text-parchment">
          {displayMath(question.explanation)}
        </p>
      </div>
    </section>
  );
}

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
  // True during the 300ms beat after a wrong answer is classified. While
  // beating, auto-advance owns the transition — no NEXT/FINISH is rendered.
  const [advancing, setAdvancing] = useState(false);

  // Deal-once ref: the mount effect below deals bank questions (recording
  // all-time exposure). In dev StrictMode the effect double-fires — the
  // ref keeps the deal (and its exposure increment) to exactly one.
  const dealtRef = useRef(false);

  useEffect(() => {
    if (dealtRef.current) return;
    dealtRef.current = true;
    const active = loadActiveDrill();
    const qs = active ? active.questions : getQuestionsForSession(20);
    if (active) setDrill(active);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(null));
    setErrorKinds(new Array(qs.length).fill(null));
  }, []);

  useEffect(() => {
    setSecondsLeft(TOTAL_SECONDS);
    setAdvancing(false);
  }, [index]);

  function finishWith(answerArr: (number | null)[], errorArr: (ErrorType | null)[]): void {
    if (!questions) return;
    setFinishing(true);
    const now = Date.now();
    const sessionId = `session-${now}`;
    const { correct, mistakes } = mistakesFromAnswers(questions, answerArr, errorArr, sessionId, now);

    const session: Session = {
      id: sessionId,
      date: now,
      questionsAttempted: questions.length,
      correct,
      mistakes,
      durationSeconds: Math.max(1, Math.floor((now - startTime) / 1000)),
      attemptedKeys: questions.map((q) => nodeKey(q.topic, q.subtopic)),
    };

    ExamEngine.saveSession(session);
    ExamEngine.saveLastDetail(
      questions.map((q, qi) => ({
        questionId: q.id,
        section: q.section,
        topic: q.topic,
        subtopic: q.subtopic,
        selected: answerArr[qi] ?? null,
        correctIndex: q.correctIndex,
        isCorrect: answerArr[qi] === q.correctIndex,
      })),
    );
    ExamEngine.recordSession(session);
    clearActiveDrill();
    router.push("/results");
  }

  function finish(): void {
    if (finishing || !questions) return;
    finishWith(answers, errorKinds);
  }

  function expireCurrent(): void {
    if (!questions || finishing) return;
    if (answers[index] !== null) return;
    // Running out of time IS the classification: file immediately as a
    // time-pressure mistake (sentinel answer, no classification step).
    const nextAnswers = [...answers];
    nextAnswers[index] = TIMEOUT_ANSWER;
    const nextErrors = [...errorKinds];
    nextErrors[index] = "time-pressure";
    setAnswers(nextAnswers);
    setErrorKinds(nextErrors);
    if (index >= questions.length - 1) {
      finishWith(nextAnswers, nextErrors);
    } else {
      setIndex((i) => Math.min(i + 1, questions.length - 1));
    }
  }

  // The timer runs ONLY while the current question is unanswered. Answering
  // freezes it; on expiry the question is filed as a time-pressure mistake
  // and the session auto-advances (auto-finishes on the last question).
  useEffect(() => {
    if (!questions) return;
    if (answers[index] !== null) return;
    if (secondsLeft <= 0) {
      expireCurrent();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearTimeout(t);
  });

  const total = questions?.length ?? 0;
  const question = questions?.[index] ?? null;

  const selected = useMemo(
    () => (questions ? answers[index] ?? null : null),
    [answers, index, questions],
  );
  const isAnswered = selected !== null;
  const isTimedOut = selected === TIMEOUT_ANSWER;
  const isCorrect = question !== null && !isTimedOut && isAnswered && selected === question.correctIndex;
  const isWrong = question !== null && !isTimedOut && isAnswered && selected !== question.correctIndex;
  const classified = errorKinds[index] ?? null;
  const canAdvance = isCorrect || isTimedOut || (isWrong && classified !== null);
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

  /**
   * One-tap classification: commit the error kind, hold a 300ms beat so the
   * tapped chip reads as selected (all chips disabled, no double-tap), then
   * auto-advance — or auto-finish on the last question. No second tap, ever.
   * The timer is already frozen after answering, so there is no race.
   */
  function classify(kind: ErrorType): void {
    if (!questions || advancing || errorKinds[index] !== null) return;
    const nextErrors = [...errorKinds];
    nextErrors[index] = kind;
    setErrorKinds(nextErrors);
    setAdvancing(true);
    const target = index;
    window.setTimeout(() => {
      if (target >= questions.length - 1) {
        finishWith(answers, nextErrors);
      } else {
        setIndex((i) => Math.min(i + 1, questions.length - 1));
      }
    }, 300);
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
          <OfflineBadge />
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
        <article key={question.id} aria-label={`Question ${index + 1} of ${total}`} className="card card-in">
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
                  className={`bronze-frame flex items-center gap-4 bg-night p-5 text-left transition-all duration-200 disabled:cursor-default enabled:hover:translate-x-1 enabled:hover:border-amber enabled:hover:shadow-[0_0_18px_rgba(166,124,61,0.3)] stagger-fade`}
                  style={{
                    animationDelay: `${i * 40}ms`,
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
                  {revealed && <span className="pop-in rounded bg-olive px-1.5 font-type text-night">✓</span>}
                  {wrongPick && <span className="pop-in rounded bg-blood px-1.5 font-type text-parchment">✗</span>}
                </button>
              );
            })}
          </div>

          {isWrong && <Debrief question={question} />}

          {isTimedOut && (
            <p className="mt-5 border-t border-bronze pt-4 font-type text-sm font-bold tracking-wide text-blood" role="alert">
              <span className="rounded bg-blood px-2 py-0.5 font-type text-sm font-bold text-parchment">TIME UP</span> — FILED AS TIME-PRESSURE. ADVANCE WHEN READY.
            </p>
          )}

          {isTimedOut && <Debrief question={question} />}

          {isWrong && (
            <div className="mt-5 border-t border-bronze pt-4" role="group" aria-label="Classify the error">
              <p className="font-display text-xl tracking-wide text-parchment">
                <span className="rounded bg-blood px-2 py-0.5 font-type text-sm font-bold text-parchment">WRONG</span> — WHAT HAPPENED?
              </p>
              <p className="mb-3 font-type text-xs text-faded">
                TAP ONE — ADVANCES AUTOMATICALLY.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {ERROR_TYPES.map((t) => {
                  const active = classified === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => classify(t.value)}
                      aria-pressed={active}
                      disabled={classified !== null}
                      className={`chip chip-fade text-left${active ? " chip-active" : ""}`}
                      style={{ animationDelay: "0ms" }}
                    >
                      <span
                        className={`block font-type text-[15px] font-bold uppercase tracking-[0.12em] ${active ? "text-amber" : "text-parchment"}`}
                      >
                        {t.label}
                      </span>
                      <span className="block font-type text-[15px] font-normal normal-case leading-relaxed tracking-normal text-parchment">
                        {t.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isCorrect && (
            <>
              <p className="font-display mt-5 border-t border-bronze pt-4 text-xl tracking-wide text-parchment">
                <span className="rounded bg-olive px-2 py-0.5 font-type text-sm font-bold text-night">CORRECT</span> — LOCKED IN.
              </p>
              <Debrief question={question} />
            </>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/app" className="font-type text-xs tracking-widest text-faded underline">
              QUIT
            </Link>
            {!advancing &&
              (!isLast ? (
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
              ))}
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
