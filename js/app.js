// Nimb - IFRH Study App - shared utilities
const STORE_KEYS = {
  examDate: "nimb_exam_date",
  quiz: "nimb_quiz_progress",
  srs: "nimb_flashcards_srs",
  plano: "nimb_plano_checklist",
  priority: "nimb_priority_subject",
  onboarded: "nimb_onboarded",
  missed: "nimb_missed_cards",
  streak: "nimb_streak",
};

const DEFAULT_EXAM_DATE = "2026-09-15";

function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable, fail silently */
  }
}

function getExamDate() {
  return getJSON(STORE_KEYS.examDate, DEFAULT_EXAM_DATE);
}

function setExamDate(dateStr) {
  setJSON(STORE_KEYS.examDate, dateStr);
}

function daysUntilExam() {
  const target = new Date(getExamDate() + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function highlightActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.mainnav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path) a.classList.add("active");
  });
}

function renderCountdown(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const days = daysUntilExam();
  el.innerHTML = `
    <div class="num">${days >= 0 ? days : 0}</div>
    <div class="lbl">${days === 1 ? "dia até a prova" : "dias até a prova"}</div>
  `;
}

function getQuizProgress() {
  return getJSON(STORE_KEYS.quiz, {});
}

function recordQuizResult(materia, correct, total) {
  const progress = getQuizProgress();
  if (!progress[materia]) progress[materia] = { attempts: 0, correct: 0, total: 0, best: 0 };
  const m = progress[materia];
  m.attempts += 1;
  m.correct += correct;
  m.total += total;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  m.best = Math.max(m.best, pct);
  m.lastPct = pct;
  setJSON(STORE_KEYS.quiz, progress);
  return m;
}

function materiaProgressPct(materia) {
  const progress = getQuizProgress();
  const m = progress[materia];
  return m ? m.best : 0;
}

// ---- Shared date helpers (also used by js/srs.js) ----
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- Streak (loss-aversion habit mechanic) ----
// Call on any meaningful study action: finishing a quiz, grading a flashcard, checking a plano task.
function recordActivity() {
  const s = getJSON(STORE_KEYS.streak, { count: 0, last: null });
  const today = todayStr();
  if (s.last === today) return s; // already counted today
  if (s.last === addDays(today, -1)) {
    s.count += 1; // consecutive day
  } else {
    s.count = 1; // gap or first time — restart
  }
  s.last = today;
  setJSON(STORE_KEYS.streak, s);
  return s;
}

function getStreak() {
  const s = getJSON(STORE_KEYS.streak, { count: 0, last: null });
  // if last activity wasn't today or yesterday, the streak is effectively broken (shown as 0)
  if (s.last && s.last !== todayStr() && s.last !== addDays(todayStr(), -1)) {
    return { count: 0, last: s.last };
  }
  return s;
}

// ---- Missed-question review (auto-generated from wrong quiz answers) ----
// Reuses the flashcard SRS engine (js/srs.js) so errors resurface on a spaced schedule,
// exactly like the general spaced-repetition literature recommends for targeted weak-point review.
function addMissedQuestion(q, correctText) {
  const missed = getJSON(STORE_KEYS.missed, {});
  missed[q.id] = {
    id: "missed-" + q.id,
    materia: q.materia,
    frente: q.pergunta,
    verso: `<strong>Resposta certa:</strong> ${correctText}<br><br>${q.explicacao || ""}`,
    tag: "erro no simulado",
    timesWrong: (missed[q.id]?.timesWrong || 0) + 1,
  };
  setJSON(STORE_KEYS.missed, missed);
  // force this card to be due immediately by clearing any existing SRS schedule for it
  const srsState = getJSON(STORE_KEYS.srs, {});
  delete srsState["missed-" + q.id];
  setJSON(STORE_KEYS.srs, srsState);
}

function getMissedCards() {
  const missed = getJSON(STORE_KEYS.missed, {});
  return Object.values(missed);
}

// ---- Readiness score: blends quiz accuracy + flashcard mastery per subject ----
function getReadiness(materia, flashcardsForMateria) {
  const progress = getQuizProgress();
  const quizPct = progress[materia] ? progress[materia].best : 0;
  const srsState = getJSON(STORE_KEYS.srs, {});
  const cards = flashcardsForMateria || [];
  const masteredCount = cards.filter((c) => srsState[c.id] && srsState[c.id].reps >= 3).length;
  const masteryPct = cards.length ? Math.round((masteredCount / cards.length) * 100) : 0;
  // quiz performance matters more than raw flashcard exposure, but both count
  return Math.round(quizPct * 0.65 + masteryPct * 0.35);
}

// ---- Inline self-check widgets (retrieval practice embedded in content pages) ----
function selfCheck(btn, correct, feedbackText) {
  const box = btn.closest(".selfcheck");
  if (box.dataset.answered) return;
  box.dataset.answered = "true";
  box.querySelectorAll(".selfcheck-opts button").forEach((b) => {
    b.disabled = true;
    if (b === btn) b.classList.add(correct ? "correct" : "wrong");
  });
  const fb = box.querySelector(".selfcheck-feedback");
  fb.textContent = (correct ? "✓ Correto. " : "✗ Não é essa. ") + (feedbackText || "");
  fb.classList.add("show");
}

// ---- Backup: export/import all progress as a downloadable JSON file ----
// Everything lives in localStorage only (no server), so clearing browser data
// or switching devices would otherwise wipe streak, SRS state, quiz history, etc.
function exportProgress() {
  const data = {};
  Object.values(STORE_KEYS).forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = raw;
  });
  const payload = { app: "nimb", version: 1, exportedAt: todayStr(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nimb-progresso-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProgressFile(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!payload || payload.app !== "nimb" || typeof payload.data !== "object") {
        throw new Error("Este não parece ser um arquivo de backup do Nimb.");
      }
      Object.entries(payload.data).forEach(([key, raw]) => {
        localStorage.setItem(key, raw);
      });
      onDone(null);
    } catch (e) {
      onDone(e);
    }
  };
  reader.onerror = () => onDone(new Error("Falha ao ler o arquivo."));
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();
});
