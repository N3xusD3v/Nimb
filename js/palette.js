// Command palette (Ctrl/Cmd+K) — quick navigation across the whole app
const PALETTE_COMMANDS = [
  { label: "Início", hint: "landing page", url: "index.html", group: "Navegar" },
  { label: "Painel (Hoje)", hint: "foco do dia, streak, prontidão", url: "painel.html", group: "Navegar" },
  { label: "Regulamento", hint: "RBAC 61, RBAC 91, Regras do Ar", url: "regulamento.html", group: "Navegar" },
  { label: "Meteorologia", hint: "METAR, TAF, gelo, frentes", url: "meteorologia.html", group: "Navegar" },
  { label: "Navegação", hint: "triângulo de velocidades, VOR, ILS", url: "navegacao.html", group: "Navegar" },
  { label: "Calculadoras", hint: "vento, tempo/distância, altitude densidade", url: "calculadoras.html", group: "Navegar" },
  { label: "Flashcards", hint: "revisão espaçada", url: "flashcards.html", group: "Navegar" },
  { label: "Plano de 15 dias", hint: "cronograma", url: "plano.html", group: "Navegar" },
  { label: "Recursos e fontes", hint: "normas oficiais, comunidades", url: "recursos.html", group: "Navegar" },
  { label: "Simulado misto (recomendado)", hint: "REG + MET + NAV embaralhados", url: "quiz.html?materia=todas", group: "Simulados" },
  { label: "Simulado — Regulamento", hint: "20 questões", url: "quiz.html?materia=regulamento", group: "Simulados" },
  { label: "Simulado — Meteorologia", hint: "20 questões", url: "quiz.html?materia=meteorologia", group: "Simulados" },
  { label: "Simulado — Navegação", hint: "20 questões", url: "quiz.html?materia=navegacao", group: "Simulados" },
  { label: "Calculadora de vento/deriva", hint: "triângulo de velocidades", url: "calculadoras.html#calc-vento", group: "Calculadoras" },
  { label: "Calculadora de tempo/distância/combustível", hint: "", url: "calculadoras.html#calc-tempo", group: "Calculadoras" },
  { label: "Calculadora de altitude densidade", hint: "", url: "calculadoras.html#calc-densidade", group: "Calculadoras" },
  { label: "Calculadora de razão de descida (TOD)", hint: "", url: "calculadoras.html#calc-descida", group: "Calculadoras" },
  { label: "Conversão de unidades", hint: "NM, kt, ft, hPa", url: "calculadoras.html#calc-conversao", group: "Calculadoras" },
];

function normalizePalette(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function paletteMatches(cmd, query) {
  if (!query) return true;
  const q = normalizePalette(query);
  const hay = normalizePalette(cmd.label + " " + cmd.hint + " " + cmd.group);
  return q.split(/\s+/).every((term) => hay.includes(term));
}

let PALETTE_FILTERED = PALETTE_COMMANDS;
let PALETTE_SELECTED = 0;

function buildPaletteDOM() {
  if (document.getElementById("cmdk-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "cmdk-overlay";
  overlay.className = "cmdk-overlay";
  overlay.innerHTML = `
    <div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Busca rápida">
      <div class="cmdk-input-row">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="cmdk-input" placeholder="Ir para... (simulados, calculadoras, flashcards)" autocomplete="off" />
        <kbd>Esc</kbd>
      </div>
      <div id="cmdk-list" class="cmdk-list"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePalette();
  });
  document.getElementById("cmdk-input").addEventListener("input", (e) => {
    PALETTE_FILTERED = PALETTE_COMMANDS.filter((c) => paletteMatches(c, e.target.value));
    PALETTE_SELECTED = 0;
    renderPaletteList();
  });
}

// Keyboard handling lives on `document` (capture phase) rather than solely on the input,
// so arrow/enter/escape keep working even if focus isn't exactly on the input for some
// reason (e.g. right after opening, before the deferred .focus() call resolves).
document.addEventListener("keydown", (e) => {
  const overlay = document.getElementById("cmdk-overlay");
  if (!overlay || !overlay.classList.contains("open")) return;
  if (e.key === "ArrowDown" || e.keyCode === 40) { e.preventDefault(); PALETTE_SELECTED = Math.min(PALETTE_SELECTED + 1, PALETTE_FILTERED.length - 1); renderPaletteList(); }
  else if (e.key === "ArrowUp" || e.keyCode === 38) { e.preventDefault(); PALETTE_SELECTED = Math.max(PALETTE_SELECTED - 1, 0); renderPaletteList(); }
  else if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); goToPaletteSelection(); }
  else if (e.key === "Escape" || e.keyCode === 27) { e.preventDefault(); closePalette(); }
}, true);

function renderPaletteList() {
  const list = document.getElementById("cmdk-list");
  if (PALETTE_FILTERED.length === 0) {
    list.innerHTML = `<div class="cmdk-empty">Nada encontrado.</div>`;
    return;
  }
  let lastGroup = null;
  list.innerHTML = PALETTE_FILTERED.map((c, i) => {
    const groupHtml = c.group !== lastGroup ? `<div class="cmdk-group">${c.group}</div>` : "";
    lastGroup = c.group;
    // Navigate straight from the click handler with the item's own URL — no re-render
    // in between mousedown and click (a hover-triggered re-render would swap out the
    // element mid-click and silently drop the event).
    return `${groupHtml}<button class="cmdk-item ${i === PALETTE_SELECTED ? "selected" : ""}" data-idx="${i}" onclick="window.location.href='${c.url}'">
      <span>${c.label}</span>
      <span class="cmdk-hint">${c.hint}</span>
    </button>`;
  }).join("");
  const sel = list.querySelector(".cmdk-item.selected");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

function goToPaletteSelection() {
  const cmd = PALETTE_FILTERED[PALETTE_SELECTED];
  if (cmd) window.location.href = cmd.url;
}

function openPalette() {
  buildPaletteDOM();
  PALETTE_FILTERED = PALETTE_COMMANDS;
  PALETTE_SELECTED = 0;
  const overlay = document.getElementById("cmdk-overlay");
  overlay.classList.add("open");
  const input = document.getElementById("cmdk-input");
  input.value = "";
  renderPaletteList();
  setTimeout(() => input.focus(), 10);
}

function closePalette() {
  const overlay = document.getElementById("cmdk-overlay");
  if (overlay) overlay.classList.remove("open");
}

document.addEventListener("keydown", (e) => {
  const isMod = e.metaKey || e.ctrlKey;
  if (isMod && e.key.toLowerCase() === "k") {
    e.preventDefault();
    const overlay = document.getElementById("cmdk-overlay");
    if (overlay && overlay.classList.contains("open")) closePalette();
    else openPalette();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".cmdk-trigger").forEach((btn) => {
    btn.addEventListener("click", openPalette);
  });
});
