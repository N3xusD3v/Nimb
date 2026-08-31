// Quiz engine - reads ../data/questions.json, filters by materia (query param) or shows all
let QUIZ_STATE = { questions: [], idx: 0, correct: 0, answered: false };

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
  document.getElementById("quiz-title").textContent =
    materia === "todas" ? "Simulado geral" : "Simulado — " + materiaLabel(materia);

  const res = await fetch("data/questions.json");
  const all = await res.json();
  let pool = materia === "todas" ? all : all.filter((q) => q.materia === materia);
  pool = shuffle(pool).slice(0, Math.min(20, pool.length));

  QUIZ_STATE = { questions: pool, idx: 0, correct: 0, answered: false, materia };
  renderQuestion();
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
  if (correct) QUIZ_STATE.correct += 1;
  document.querySelectorAll(".quiz-options button").forEach((b) => {
    b.disabled = true;
    if (b.dataset.correct === "true") b.classList.add("correct");
    else if (b === btn) b.classList.add("wrong");
  });
  document.getElementById("explain-box").classList.add("show");
  document.getElementById("next-btn").style.display = "inline-block";
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

  const pass = pct >= 70;
  document.getElementById("quiz-box").innerHTML = `
    <div class="quiz-question">Resultado: ${correct}/${total} (${pct}%)</div>
    <div class="note ${pass ? "" : "warn"}">
      <strong>${pass ? "Aprovado" : "Abaixo do mínimo"}</strong> — a ANAC exige nota mínima de 70% por matéria.
    </div>
    <button onclick="location.reload()">Repetir simulado</button>
    <a class="btn secondary" style="margin-left:0.5rem; display:inline-block" href="index.html">Voltar ao painel</a>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("quiz-box")) initQuiz();
});
