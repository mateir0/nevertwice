#!/usr/bin/env node
/**
 * Backfill answer explanations for the NUST-NET seed bank.
 *
 * For every question in src/config/exams/nust-bank.ts that lacks a
 * non-empty `explanation`, ask Groq for a 1–3 sentence debrief and patch
 * the source in place by adding `explanation: "...",` immediately after
 * that question's `correctIndex:` line. Everything else is preserved
 * byte-for-byte. Only questions still missing an explanation are touched,
 * so re-running is safe — keep this script for future bank additions.
 *
 * The GROQ_API_KEY is read from the environment and is never logged,
 * echoed, or written to disk. Run it with:
 *
 *   GROQ_API_KEY=... node scripts/backfill-explanations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nustBank } from "../src/config/exams/nust-bank.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";
const DELAY_MS = 1500;
const LETTERS = ["A", "B", "C", "D"];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANK_PATH = path.resolve(__dirname, "../src/config/exams/nust-bank.ts");

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("GROQ_API_KEY is not set in the environment. Aborting.");
  process.exit(1);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildPrompt(q) {
  const letter = LETTERS[q.correctIndex];
  const optionLines = q.options.map((o, i) => `${LETTERS[i]}) ${o}`).join("\n");
  return [
    "Write a concise answer explanation for a NUST Entry Test (NET) student.",
    "",
    `Question: ${q.text}`,
    "Options:",
    optionLines,
    `Correct answer: ${letter}) ${q.options[q.correctIndex]}`,
    "",
    "Write 1-3 sentences. Identify the correct choice by its content — never by a",
    "letter such as A, B, C, or D, because the app shuffles the options at runtime.",
    "Give the key step or formula, and say why the most tempting distractor is wrong.",
    "Use Unicode math notation directly (x², √, π, θ, ×, ÷, ±, →, ∞). Never use LaTeX, carets, or backslashes.",
    "Respond with the explanation text only — no surrounding quotes, no bullet points, no markdown.",
  ].join("\n");
}

async function askGroq(q) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a precise exam-answer explainer. Output ONLY the explanation prose, 1-3 sentences, Unicode math, no markdown, no quotes, no LaTeX. Never refer to options by letter (A/B/C/D).",
          },
          { role: "user", content: buildPrompt(q) },
        ],
        temperature: 0.3,
        // Keep the reasoning budget tiny and give the visible answer room,
        // otherwise gpt-oss can truncate the explanation mid-sentence.
        reasoning_effort: "low",
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("bad response shape");
    return content.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Write `explanation: "..."` into the bank source. Replaces an existing
 * explanation line when present (so incomplete ones can be repaired),
 * otherwise inserts one right after that question's `correctIndex:` line.
 */
function patchBank(entries) {
  let text = fs.readFileSync(BANK_PATH, "utf8");
  const edits = [];
  for (const { id, explanation } of entries) {
    const idIdx = text.indexOf(`id: "${id}"`);
    if (idIdx === -1) throw new Error(`question id not found in bank source: ${id}`);
    const nextIdIdx = text.indexOf('id: "', idIdx + 1);
    const blockEnd = nextIdIdx === -1 ? text.length : nextIdIdx;
    const expIdx = text.indexOf("explanation:", idIdx);
    const body = `    explanation: ${JSON.stringify(explanation)},`;
    if (expIdx !== -1 && expIdx < blockEnd) {
      // Replace the existing line, preserving the rest of the file.
      const lineStart = text.lastIndexOf("\n", expIdx) + 1;
      const lineEnd = text.indexOf("\n", expIdx);
      edits.push({ start: lineStart, end: lineEnd === -1 ? text.length : lineEnd, body });
    } else {
      const ciIdx = text.indexOf("correctIndex:", idIdx);
      if (ciIdx === -1) throw new Error(`correctIndex not found for ${id}`);
      const lineEnd = text.indexOf("\n", ciIdx);
      if (lineEnd === -1) throw new Error(`unterminated correctIndex line for ${id}`);
      edits.push({ start: lineEnd, end: lineEnd, body: `\n${body}` });
    }
  }
  // Apply from the end so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) {
    text = text.slice(0, e.start) + e.body + text.slice(e.end);
  }
  fs.writeFileSync(BANK_PATH, text);
}

/** A usable debrief is a full sentence or two, not a cut-off fragment. */
function needsExplanation(q) {
  const e = (q.explanation ?? "").trim();
  return e.length < 40 || !/[.!?]["'”’)]?$/.test(e);
}

async function main() {
  const pending = nustBank.filter(needsExplanation);
  if (pending.length === 0) {
    console.log("All bank questions already have complete explanations. Nothing to do.");
    return;
  }

  console.log(`Backfilling ${pending.length} of ${nustBank.length} question(s)…`);
  const results = [];
  const failures = [];

  for (let i = 0; i < pending.length; i++) {
    const q = pending[i];
    let explanation = "";
    try {
      explanation = await askGroq(q);
      if (!explanation) throw new Error("empty explanation");
    } catch {
      // One retry.
      try {
        await delay(DELAY_MS);
        explanation = await askGroq(q);
        if (!explanation) throw new Error("empty explanation");
      } catch {
        explanation = "";
      }
    }

    if (explanation) results.push({ id: q.id, explanation });
    else failures.push(q.id);

    if ((i + 1) % 10 === 0 || i === pending.length - 1) {
      console.log(`  ${i + 1}/${pending.length} processed (${results.length} ok, ${failures.length} failed)`);
    }
    if (i < pending.length - 1) await delay(DELAY_MS);
  }

  if (results.length > 0) patchBank(results);

  if (failures.length > 0) {
    console.error(`Failed to explain ${failures.length} question(s): ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Done. Patched ${results.length} question(s) in ${BANK_PATH}.`);
}

await main();
