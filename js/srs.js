// Simple SM-2-lite spaced repetition for flashcards
function getSrsState() {
  return getJSON(STORE_KEYS.srs, {});
}

function saveSrsState(state) {
  setJSON(STORE_KEYS.srs, state);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// grade: 0 = errei, 1 = difícil, 2 = fácil
function gradeCard(id, grade) {
  const state = getSrsState();
  const card = state[id] || { interval: 0, ease: 2.3, reps: 0, due: todayStr() };

  if (grade === 0) {
    card.reps = 0;
    card.interval = 0;
    card.ease = Math.max(1.3, card.ease - 0.2);
    card.due = todayStr();
  } else {
    card.reps += 1;
    if (card.reps === 1) card.interval = grade === 1 ? 1 : 2;
    else if (card.reps === 2) card.interval = grade === 1 ? 3 : 5;
    else card.interval = Math.round(card.interval * (grade === 1 ? card.ease * 0.8 : card.ease));
    if (grade === 2) card.ease = Math.min(3.2, card.ease + 0.1);
    card.due = addDays(todayStr(), card.interval);
  }
  state[id] = card;
  saveSrsState(state);
  return card;
}

function dueCards(allCards) {
  const state = getSrsState();
  const today = todayStr();
  return allCards.filter((c) => {
    const s = state[c.id];
    return !s || s.due <= today;
  });
}

function srsStats(allCards) {
  const state = getSrsState();
  const total = allCards.length;
  const learned = allCards.filter((c) => state[c.id] && state[c.id].reps >= 3).length;
  const due = dueCards(allCards).length;
  return { total, learned, due };
}
