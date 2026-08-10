const vocabulary = [
  { es: "Buenos días.", en: "Good morning." },
  { es: "Buenas tardes.", en: "Good afternoon." },
  { es: "Buenas noches.", en: "Good evening; Good night." },
  { es: "Hasta la vista.", en: "See you later." },
  { es: "Hasta pronto.", en: "See you soon." },
  { es: "¿Cómo se llama usted?", en: "What’s your name? (formal)" },
  { es: "Le presento a…", en: "I would like to introduce you to (name). (formal)" },
  { es: "Te presento a…", en: "I would like to introduce you to (name). (familiar)" },
  { es: "Mucho gusto.", en: "Pleased to meet you." },
  { es: "El gusto es mío.", en: "The pleasure is mine." },
  { es: "Encantado/a.", en: "Delighted; Pleased to meet you." },
  { es: "Igualmente.", en: "Likewise." },
  { es: "el nombre", en: "name" },
  { es: "¿Cómo estás?", en: "How are you? (familiar)" },
  { es: "No muy bien.", en: "Not very well." },
  { es: "Regular.", en: "So-so; OK." },
  { es: "¿Qué pasa?", en: "What’s happening?; What’s going on?" },
  { es: "por favor", en: "please" },
  { es: "De nada.", en: "You’re welcome." },
  { es: "No hay de qué.", en: "You’re welcome." },
  { es: "Lo siento.", en: "I’m sorry." },
  { es: "Gracias.", en: "Thank you; Thanks." },
  { es: "Muchas gracias.", en: "Thank you very much; Thanks a lot." }
];

const PAIRS_PER_ROUND = 6;
let rounds = [];
let currentRound = 0;
let selected = { es: null, en: null };
let matched = 0;
let attempts = 0;
let totalMatches = 0;
let locked = false;
let soundEnabled = true;

const $ = (id) => document.getElementById(id);
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function tone(success) {
  if (!soundEnabled || !window.AudioContext && !window.webkitAudioContext) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = new Audio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.frequency.setValueAtTime(success ? 520 : 190, context.currentTime);
  if (success) oscillator.frequency.exponentialRampToValueAtTime(720, context.currentTime + .12);
  gain.gain.setValueAtTime(.07, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2);
  oscillator.start(); oscillator.stop(context.currentTime + .2);
}

function startGame() {
  rounds = [];
  const shuffled = shuffle(vocabulary.map((pair, id) => ({ ...pair, id })));
  for (let i = 0; i < shuffled.length; i += PAIRS_PER_ROUND) rounds.push(shuffled.slice(i, i + PAIRS_PER_ROUND));
  currentRound = 0; attempts = 0; totalMatches = 0;
  $("gameComplete").classList.add("hidden");
  $("roundComplete").classList.add("hidden");
  $("board").classList.remove("hidden");
  renderRound();
}

function renderRound() {
  selected = { es: null, en: null }; matched = 0; locked = false;
  const pairs = rounds[currentRound];
  $("roundNumber").textContent = currentRound + 1;
  $("roundTotal").textContent = rounds.length;
  $("pairCount").textContent = pairs.length;
  $("matchedCount").textContent = 0;
  $("progressFill").style.width = "0%";
  $("feedback").textContent = "Elige una tarjeta de cada columna.";
  $("feedback").className = "feedback";
  $("spanishCards").replaceChildren(...shuffle(pairs).map(pair => makeCard(pair, "es")));
  $("englishCards").replaceChildren(...shuffle(pairs).map(pair => makeCard(pair, "en")));
}

function makeCard(pair, language) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "word-card";
  card.dataset.id = pair.id;
  card.dataset.language = language;
  card.textContent = pair[language];
  card.setAttribute("aria-pressed", "false");
  card.addEventListener("click", () => selectCard(card));
  return card;
}

function selectCard(card) {
  if (locked || card.classList.contains("matched")) return;
  const language = card.dataset.language;
  const old = selected[language];
  if (old) { old.classList.remove("selected"); old.setAttribute("aria-pressed", "false"); }
  if (old === card) { selected[language] = null; return; }
  selected[language] = card;
  card.classList.add("selected"); card.setAttribute("aria-pressed", "true");
  if (selected.es && selected.en) checkPair();
}

function checkPair() {
  locked = true; attempts++;
  const isMatch = selected.es.dataset.id === selected.en.dataset.id;
  if (isMatch) {
    matched++; totalMatches++; tone(true);
    [selected.es, selected.en].forEach(card => { card.classList.remove("selected"); card.classList.add("matched"); card.disabled = true; });
    $("matchedCount").textContent = matched;
    $("progressFill").style.width = `${matched / rounds[currentRound].length * 100}%`;
    $("feedback").textContent = "¡Correcto! Has encontrado una pareja.";
    $("feedback").className = "feedback good";
    selected = { es: null, en: null }; locked = false;
    if (matched === rounds[currentRound].length) setTimeout(finishRound, 550);
  } else {
    tone(false);
    $("feedback").textContent = "No es esa pareja. ¡Inténtalo otra vez!";
    $("feedback").className = "feedback bad";
    [selected.es, selected.en].forEach(card => card.classList.add("wrong"));
    setTimeout(() => {
      [selected.es, selected.en].forEach(card => { card.classList.remove("selected", "wrong"); card.setAttribute("aria-pressed", "false"); });
      selected = { es: null, en: null }; locked = false;
    }, 650);
  }
}

function finishRound() {
  $("roundSummary").textContent = `Has encontrado ${matched} parejas en esta ronda.`;
  $("nextRound").innerHTML = currentRound === rounds.length - 1 ? "Ver resultados <span aria-hidden=\"true\">→</span>" : "Siguiente ronda <span aria-hidden=\"true\">→</span>";
  $("roundComplete").classList.remove("hidden");
  $("nextRound").focus();
}

function advance() {
  $("roundComplete").classList.add("hidden");
  if (++currentRound < rounds.length) renderRound(); else finishGame();
}

function finishGame() {
  $("board").classList.add("hidden");
  $("gameComplete").classList.remove("hidden");
  $("totalLearned").textContent = vocabulary.length;
  $("finalAttempts").textContent = attempts;
  $("finalAccuracy").textContent = `${Math.round(totalMatches / attempts * 100)}%`;
  $("playAgain").focus();
}

$("nextRound").addEventListener("click", advance);
$("playAgain").addEventListener("click", startGame);
$("soundButton").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("soundButton").setAttribute("aria-pressed", soundEnabled);
  $("soundButton").title = soundEnabled ? "Desactivar sonidos" : "Activar sonidos";
  $("soundIcon").textContent = soundEnabled ? "🔊" : "🔇";
  $("soundLabel").textContent = soundEnabled ? "Sonidos activados" : "Sonidos desactivados";
});

startGame();
