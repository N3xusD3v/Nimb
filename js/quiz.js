// Quiz engine - reads ../data/questions.json, filters by materia (query param) or shows all
let QUIZ_STATE = { questions: [], idx: 0, correct: 0, answered: false };
let EXAM_STATE = null;

// Official per-subject durations (IS 00-003H) — used for "Simulado Real" countdown.
const OFFICIAL_DURATION_SEC = { regulamento: 30 * 60, meteorologia: 35 * 60, navegacao: 100 * 60 };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function initQuiz() {
  const params = new URLSearchParams(location.search);
  const materia = params.get("materia") || "todas";
  const modo = params.get("modo") === "real" ? "real" : "estudo";
  document.getElementById("quiz-title").textContent =
    materia === "todas" ? "Simulado geral" : "Simulado — " + materiaLabel(materia);
  renderModeToggle(materia, modo);

  const res = await fetch("data/questions.json");
  const all = await res.json();
  let pool = materia === "todas" ? all : all.filter((q) => q.materia === materia);
  pool = shuffle(pool).slice(0, Math.min(20, pool.length));

  if (modo === "real" && materia !== "todas") {
    startRealExam(pool, materia);
  } else {
    QUIZ_STATE = { questions: pool, idx: 0, correct: 0, answered: false, materia };
    renderQuestion();
  }
}

function renderModeToggle(materia, modo) {
  const mount = document.getElementById("mode-toggle");
  if (!mount) return;
  const canReal = materia !== "todas";
  const durMin = canReal ? Math.round(OFFICIAL_DURATION_SEC[materia] / 60) : null;
  mount.innerHTML = `
    <a class="btn ${modo === "real" ? "secondary" : ""}" href="quiz.html?materia=${materia}&modo=estudo">📖 Modo estudo</a>
    ${
      canReal
        ? `<a class="btn ${modo === "real" ? "" : "secondary"}" href="quiz.html?materia=${materia}&modo=real">⏱ Simulado real (${durMin} min, sem feedback)</a>`
        : `<span class="btn secondary" style="opacity:0.55; cursor:not-allowed;" title="Escolha uma matéria específica — a prova real nunca mistura matérias">⏱ Simulado real (escolha uma matéria acima)</span>`
    }
  `;
}

function materiaLabel(m) {
  return { regulamento: "Regulamento", meteorologia: "Meteorologia", navegacao: "Navegação" }[m] || m;
}

function renderQuestion() {
  const box = document.getElementById("quiz-box");
  const { questions, idx } = QUIZ_STATE;
  if (idx >= questions.length) {
    finishQuiz();
    return;
  }
  const q = questions[idx];
  QUIZ_STATE.answered = false;
  const opts = shuffle(q.opcoes.map((text, i) => ({ text, correct: i === q.correta })));

  box.innerHTML = `
    <div class="quiz-meta">
      <span>${materiaLabel(q.materia)} · Questão ${idx + 1}/${questions.length}</span>
      <span>Acertos: ${QUIZ_STATE.correct}</span>
    </div>
    <div class="quiz-question">${q.pergunta}</div>
    <div class="quiz-options">
      ${opts.map((o, i) => `<button data-correct="${o.correct}" onclick="answerQuiz(this)">${o.text}</button>`).join("")}
    </div>
    <div class="explain" id="explain-box">${q.explicacao || ""}</div>
    <button class="secondary" id="next-btn" style="display:none" onclick="nextQuestion()">Próxima →</button>
  `;
}

function answerQuiz(btn) {
  if (QUIZ_STATE.answered) return;
  QUIZ_STATE.answered = true;
  const correct = btn.dataset.correct === "true";
  const q = QUIZ_STATE.questions[QUIZ_STATE.idx];
  const correctText = q.opcoes[q.correta];
  if (correct) {
    QUIZ_STATE.correct += 1;
  } else {
    addMissedQuestion(q, correctText);
  }
  document.querySelectorAll(".quiz-options button").forEach((b) => {
    b.disabled = true;
    if (b.dataset.correct === "true") b.classList.add("correct");
    else if (b === btn) b.classList.add("wrong");
  });
  document.getElementById("explain-box").classList.add("show");
  document.getElementById("next-btn").style.display = "inline-block";
  const status = document.getElementById("quiz-status");
  if (status) {
    status.textContent = correct
      ? "Correto. " + (q.explicacao || "")
      : "Errado. A resposta certa era: " + correctText + ". " + (q.explicacao || "");
  }
}

function nextQuestion() {
  QUIZ_STATE.idx += 1;
  renderQuestion();
}

function finishQuiz() {
  const { correct, questions, materia } = QUIZ_STATE;
  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  if (materia && materia !== "todas") recordQuizResult(materia, correct, total);
  recordActivity();

  const missedCount = total - correct;
  const pass = pct >= 70;
  document.getElementById("quiz-box").innerHTML = `
    <div class="quiz-question">Resultado: ${correct}/${total} (${pct}%)</div>
    <div class="note ${pass ? "" : "warn"}">
      <strong>${pass ? "Aprovado" : "Abaixo do mínimo"}</strong> — a ANAC exige nota mínima de 70% por matéria.
    </div>
    ${missedCount > 0 ? `<div class="note">${missedCount} questão${missedCount > 1 ? "ões" : ""} errada${missedCount > 1 ? "s" : ""} ${missedCount > 1 ? "foram adicionadas" : "foi adicionada"} à sua revisão espaçada. <a href="flashcards.html">Revisar agora →</a></div>` : ""}
    <button onclick="location.reload()">Repetir simulado</button>
    <a class="btn secondary" style="margin-left:0.5rem; display:inline-block" href="painel.html">Voltar ao painel</a>
  `;
}

// ---- Simulado Real: reproduces the actual ANAC exam-day interface ----
// Validated against community descriptions of the real computerized exam system:
// countdown timer at the official per-subject duration, free navigation via a
// question grid, flag-for-review, and no per-question feedback until the end.
function startRealExam(pool, materia) {
  const optsByIdx = pool.map((q) => shuffle(q.opcoes.map((text, i) => ({ text, correct: i === q.correta }))));
  EXAM_STATE = {
    questions: pool,
    optsByIdx,
    materia,
    idx: 0,
    answers: {},
    flagged: new Set(),
    timeLeft: OFFICIAL_DURATION_SEC[materia] || 30 * 60,
    timerId: null,
    finished: false,
  };
  window.onbeforeunload = () => "Você tem um simulado em andamento. Sair agora perde o progresso.";
  EXAM_STATE.timerId = setInterval(tickExamTimer, 1000);
  renderExamQuestion();
}

function tickExamTimer() {
  if (!EXAM_STATE || EXAM_STATE.finished) return;
  EXAM_STATE.timeLeft -= 1;
  updateExamTimerDisplay();
  if (EXAM_STATE.timeLeft <= 0) finishRealExam(true);
}

function updateExamTimerDisplay() {
  const el = document.getElementById("exam-timer");
  if (!el || !EXAM_STATE) return;
  const t = Math.max(0, EXAM_STATE.timeLeft);
  const m = Math.floor(t / 60);
  const s = t % 60;
  el.textContent = `${m}:${String(s).padStart(2, "0")}`;
  el.classList.toggle("time-warn", t <= 300 && t > 60);
  el.classList.toggle("time-critical", t <= 60);
}

function renderExamQuestion() {
  const box = document.getElementById("quiz-box");
  const { questions, idx, answers, flagged, optsByIdx } = EXAM_STATE;
  const q = questions[idx];
  const opts = optsByIdx[idx];
  const selected = answers[idx];
  const isFlagged = flagged.has(idx);

  box.innerHTML = `
    <div class="exam-header">
      <span class="exam-progress">${materiaLabel(q.materia)} · Questão ${idx + 1}/${questions.length}</span>
      <span class="exam-timer" id="exam-timer">--:--</span>
    </div>
    <div class="exam-grid">
      ${questions
        .map(
          (_, i) => `
        <button class="exam-grid-item ${i === idx ? "current" : ""} ${answers[i] !== undefined ? "answered" : ""} ${flagged.has(i) ? "flagged" : ""}" onclick="goToExamQuestion(${i})" aria-label="Ir para questão ${i + 1}">${i + 1}</button>`
        )
        .join("")}
    </div>
    <div class="quiz-question">${q.pergunta}</div>
    <div class="quiz-options">
      ${opts.map((o, i) => `<button class="${selected === i ? "selected" : ""}" onclick="selectExamAnswer(${i})">${o.text}</button>`).join("")}
    </div>
    <div class="exam-actions">
      <button class="secondary" onclick="examPrev()" ${idx === 0 ? "disabled" : ""}>← Anterior</button>
      <button class="secondary ${isFlagged ? "flag-active" : ""}" onclick="toggleExamFlag()">${isFlagged ? "🚩 Marcada p/ revisão" : "🏳 Marcar p/ revisão"}</button>
      ${idx < questions.length - 1 ? `<button onclick="examNext()">Próxima →</button>` : `<button onclick="confirmFinishExam()">Finalizar prova</button>`}
    </div>
    <div class="exam-finish-row">
      <button class="secondary" onclick="confirmFinishExam()">Finalizar prova agora</button>
    </div>
  `;
  updateExamTimerDisplay();
}

function selectExamAnswer(i) {
  EXAM_STATE.answers[EXAM_STATE.idx] = i;
  renderExamQuestion();
}

function goToExamQuestion(i) {
  EXAM_STATE.idx = i;
  renderExamQuestion();
}

function examPrev() {
  if (EXAM_STATE.idx > 0) {
    EXAM_STATE.idx -= 1;
    renderExamQuestion();
  }
}

function examNext() {
  if (EXAM_STATE.idx < EXAM_STATE.questions.length - 1) {
    EXAM_STATE.idx += 1;
    renderExamQuestion();
  }
}

function toggleExamFlag() {
  const i = EXAM_STATE.idx;
  if (EXAM_STATE.flagged.has(i)) EXAM_STATE.flagged.delete(i);
  else EXAM_STATE.flagged.add(i);
  renderExamQuestion();
}

function confirmFinishExam() {
  const unanswered = EXAM_STATE.questions.length - Object.keys(EXAM_STATE.answers).length;
  const msg = unanswered > 0 ? `Você ainda tem ${unanswered} questão(ões) sem resposta. Finalizar mesmo assim?` : "Finalizar a prova agora?";
  if (confirm(msg)) finishRealExam(false);
}

function finishRealExam(timeUp) {
  if (EXAM_STATE.finished) return;
  EXAM_STATE.finished = true;
  clearInterval(EXAM_STATE.timerId);
  window.onbeforeunload = null;

  const { questions, answers, optsByIdx, materia } = EXAM_STATE;
  let correct = 0;
  const results = questions.map((q, i) => {
    const opts = optsByIdx[i];
    const selectedIdx = answers[i];
    const isCorrect = selectedIdx !== undefined && opts[selectedIdx].correct;
    if (isCorrect) correct += 1;
    return { q, opts, selectedIdx, isCorrect };
  });

  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const pass = pct >= 70;
  recordQuizResult(materia, correct, total);
  recordActivity();
  results.forEach((r) => {
    if (!r.isCorrect) addMissedQuestion(r.q, r.q.opcoes[r.q.correta]);
  });

  document.getElementById("quiz-box").innerHTML = `
    ${timeUp ? '<div class="note warn"><strong>Tempo esgotado.</strong> Assim como na prova real, o simulado foi finalizado automaticamente.</div>' : ""}
    <div class="quiz-question">Resultado: ${correct}/${total} (${pct}%)</div>
    <div class="note ${pass ? "" : "warn"}">
      <strong>${pass ? "Aprovado" : "Abaixo do mínimo"}</strong> — a ANAC exige nota mínima de 70% por matéria.
    </div>
    <div class="note">No exame real você só vê a nota final, sem revisar questão por questão. Aqui no Nimb você pode conferir tudo abaixo — é a parte que a prova não te dá, mas ajuda a aprender com os erros.</div>
    <div class="exam-review-list">
      ${results
        .map(
          (r, i) => `
        <div class="exam-review-item ${r.isCorrect ? "correct" : "wrong"}">
          <div class="exam-review-q">${i + 1}. ${r.q.pergunta}</div>
          <div class="exam-review-a">${r.selectedIdx !== undefined ? "Sua resposta: " + r.opts[r.selectedIdx].text : "(não respondida)"}</div>
          ${!r.isCorrect ? `<div class="exam-review-correct">Certa: ${r.q.opcoes[r.q.correta]}</div>` : ""}
          <div class="exam-review-explain">${r.q.explicacao || ""}</div>
        </div>`
        )
        .join("")}
    </div>
    <button onclick="location.reload()">Repetir simulado</button>
    <a class="btn secondary" style="margin-left:0.5rem; display:inline-block" href="painel.html">Voltar ao painel</a>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("quiz-box")) initQuiz();
});
