// Nimb - IFRH Study App - shared utilities
const STORE_KEYS = {
  examDate: "nimb_exam_date",
  quiz: "nimb_quiz_progress",
  srs: "nimb_flashcards_srs",
  plano: "nimb_plano_checklist",
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

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();
});
