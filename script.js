const SUPABASE_URL = "https://nxpznzywxvfccosecmab.supabase.co";
const SUPABASE_KEY = "sb_publishable_RDuz6BsBu9zIEDjylAMLcQ_7ot5eW2i";

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
let rounds = [], currentRound = 0, matched = 0, attempts = 0, totalMatches = 0;
let selected = { es: null, en: null };
let locked = false, soundEnabled = true, currentCompetition = null, currentRunId = null;
let currentAttemptNumber = 0, attemptsRemaining = 0;

const $ = (id) => document.getElementById(id);
const t = (key, vars) => window.i18n?.t(key, vars) || key;
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

async function rpc(name, body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "No se pudo conectar con la competición.");
  return data;
}

async function loadCompetition() {
  const code = $("sessionCode").value;
  if (!code) return;
  $("classSelect").disabled = true;
  $("classSelect").innerHTML = `<option value="">${t("loadingClasses")}</option>`;
  try {
    const competition = await rpc("get_competition", { p_code: code });
    if (!competition) throw new Error("No encontramos una sesión con ese código.");
    currentCompetition = competition;
    $("classSelect").innerHTML = `<option value="">${t("selectClass")}</option>` +
      competition.classes.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("");
    $("classSelect").disabled = false;
    $("formMessage").textContent = competition.name;
    $("formMessage").className = "form-message good";
    localStorage.setItem("competitionCode", code);
  } catch (error) {
    currentCompetition = null;
    $("classSelect").innerHTML = `<option value="">${t("sessionUnavailable")}</option>`;
    $("formMessage").textContent = error.message;
    $("formMessage").className = "form-message bad";
  }
}

async function loadActiveSessions() {
  const select = $("sessionCode");
  select.disabled = true;
  try {
    const sessions = await rpc("list_active_competitions", {});
    if (!sessions.length) {
      select.innerHTML = `<option value="">${t("noCompetitions")}</option>`;
      $("formMessage").textContent = t("teacherWillOpen");
      return;
    }
    select.innerHTML = `<option value="">${t("selectCompetition")}</option>` + sessions.map(session => `<option value="${session.code}">${escapeHtml(session.name)}</option>`).join("");
    const requested = new URLSearchParams(location.search).get("session") || localStorage.getItem("competitionCode");
    if (requested && sessions.some(session => session.code === requested.toUpperCase())) select.value = requested.toUpperCase();
    else if (sessions.length === 1) select.value = sessions[0].code;
    select.disabled = false;
    if (select.value) await loadCompetition();
    else { $("classSelect").innerHTML = `<option value="">${t("selectCompetitionFirst")}</option>`; $("formMessage").textContent = ""; }
  } catch (error) {
    select.innerHTML = `<option value="">${t("competitionsError")}</option>`;
    $("formMessage").textContent = error.message; $("formMessage").className = "form-message bad";
  }
}

async function registerStudent(event) {
  event.preventDefault();
  const button = $("startButton");
  button.disabled = true; button.textContent = t("preparing");
  if (!currentCompetition || currentCompetition.code !== $("sessionCode").value) await loadCompetition();
  if (!currentCompetition) { button.disabled = false; button.innerHTML = `${t("start")} <span aria-hidden="true">→</span>`; return; }
  try {
    const registration = await rpc("start_game_v3", {
      p_code: currentCompetition.code,
      p_class_id: $("classSelect").value,
      p_student_id: $("studentId").value.trim(),
      p_first_name: $("firstName").value.trim(),
      p_last_name: $("lastName").value.trim()
    });
    currentRunId = registration.run_id;
    currentAttemptNumber = registration.attempt_number;
    attemptsRemaining = registration.attempts_remaining;
    $("gameAttempt").textContent = t("attempt", { number: currentAttemptNumber });
    $("registrationCard").classList.add("hidden");
    $("gameCard").classList.remove("hidden");
    $("leaderboardSection").classList.add("hidden");
    $("sessionName").textContent = currentCompetition.name;
    startGame();
  } catch (error) {
    $("formMessage").textContent = error.message;
    $("formMessage").className = "form-message bad";
  } finally {
    button.disabled = false; button.innerHTML = `${t("start")} <span aria-hidden="true">→</span>`;
  }
}

function tone(success) {
  if (!soundEnabled || !window.AudioContext && !window.webkitAudioContext) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = new Audio(), oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.frequency.setValueAtTime(success ? 520 : 190, context.currentTime);
  if (success) oscillator.frequency.exponentialRampToValueAtTime(720, context.currentTime + .12);
  gain.gain.setValueAtTime(.07, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2);
  oscillator.start(); oscillator.stop(context.currentTime + .2);
}

function startGame() {
  rounds = [];
  const shuffled = shuffle(vocabulary.map((pair, id) => ({ ...pair, id })));
  for (let i = 0; i < shuffled.length; i += PAIRS_PER_ROUND) rounds.push(shuffled.slice(i, i + PAIRS_PER_ROUND));
  currentRound = 0; attempts = 0; totalMatches = 0;
  $("gameComplete").classList.add("hidden"); $("roundComplete").classList.add("hidden"); $("board").classList.remove("hidden");
  renderRound();
}

function renderRound() {
  selected = { es: null, en: null }; matched = 0; locked = false;
  const pairs = rounds[currentRound];
  $("roundNumber").textContent = currentRound + 1; $("roundTotal").textContent = rounds.length;
  $("pairCount").textContent = pairs.length; $("matchedCount").textContent = 0; $("progressFill").style.width = "0%";
  $("feedback").textContent = t("chooseCards"); $("feedback").className = "feedback";
  $("spanishCards").replaceChildren(...shuffle(pairs).map(pair => makeCard(pair, "es")));
  $("englishCards").replaceChildren(...shuffle(pairs).map(pair => makeCard(pair, "en")));
}

function makeCard(pair, language) {
  const card = document.createElement("button");
  card.type = "button"; card.className = "word-card"; card.dataset.id = pair.id; card.dataset.language = language;
  card.textContent = pair[language]; card.setAttribute("aria-pressed", "false");
  card.addEventListener("click", () => selectCard(card));
  return card;
}

function selectCard(card) {
  if (locked || card.classList.contains("matched")) return;
  const language = card.dataset.language, old = selected[language];
  if (old) { old.classList.remove("selected"); old.setAttribute("aria-pressed", "false"); }
  if (old === card) { selected[language] = null; return; }
  selected[language] = card; card.classList.add("selected"); card.setAttribute("aria-pressed", "true");
  if (selected.es && selected.en) checkPair();
}

function checkPair() {
  locked = true; attempts++;
  if (selected.es.dataset.id === selected.en.dataset.id) {
    matched++; totalMatches++; tone(true);
    [selected.es, selected.en].forEach(card => { card.classList.remove("selected"); card.classList.add("matched"); card.disabled = true; });
    $("matchedCount").textContent = matched; $("progressFill").style.width = `${matched / rounds[currentRound].length * 100}%`;
    $("feedback").textContent = t("correct"); $("feedback").className = "feedback good";
    selected = { es: null, en: null }; locked = false;
    if (matched === rounds[currentRound].length) setTimeout(finishRound, 550);
  } else {
    tone(false); $("feedback").textContent = t("wrong"); $("feedback").className = "feedback bad";
    [selected.es, selected.en].forEach(card => card.classList.add("wrong"));
    setTimeout(() => { [selected.es, selected.en].forEach(card => { card.classList.remove("selected", "wrong"); card.setAttribute("aria-pressed", "false"); }); selected = { es: null, en: null }; locked = false; }, 650);
  }
}

function finishRound() {
  $("roundSummary").textContent = t("roundSummary", { count: matched });
  $("nextRound").innerHTML = `${currentRound === rounds.length - 1 ? t("results") : t("nextRound")} <span aria-hidden="true">→</span>`;
  $("roundComplete").classList.remove("hidden"); $("nextRound").focus();
}

function advance() { $("roundComplete").classList.add("hidden"); if (++currentRound < rounds.length) renderRound(); else finishGame(); }

async function finishGame() {
  $("board").classList.add("hidden"); $("gameComplete").classList.remove("hidden");
  const mistakes = attempts - totalMatches;
  $("totalLearned").textContent = vocabulary.length; $("finalMistakes").textContent = mistakes;
  $("finalAccuracy").textContent = `${Math.round(totalMatches / attempts * 100)}%`;
  $("savingStatus").textContent = t("saving");
  try {
    const result = await rpc("complete_game", { p_run_id: currentRunId, p_correct_matches: vocabulary.length, p_mistakes: mistakes });
    $("finalScore").textContent = result.score; $("finalAccuracy").textContent = `${result.accuracy}%`;
    $("finalTime").textContent = formatTime(result.duration_seconds);
    $("savingStatus").textContent = attemptsRemaining ? t("savedRemaining", { count: attemptsRemaining, word: t(attemptsRemaining === 1 ? "oneAttempt" : "manyAttempts") }) : t("savedDone");
  } catch (error) {
    $("savingStatus").textContent = `No se pudo guardar: ${error.message}`;
  }
  $("playAgain").disabled = attemptsRemaining === 0;
  $("playAgain").innerHTML = attemptsRemaining ? `${t("retry", { count: attemptsRemaining, word: t(attemptsRemaining === 1 ? "oneAvailable" : "manyAvailable") })} <span aria-hidden="true">↻</span>` : t("attemptsDone");
  $("leaderboardSection").classList.remove("hidden"); await loadLeaderboards();
  (attemptsRemaining ? $("playAgain") : $("refreshLeaderboard")).focus();
}

async function loadLeaderboards() {
  try {
    const [overall, classes, podiums] = await Promise.all([
      rpc("get_leaderboard_v2", { p_code: currentCompetition.code, p_limit: 25 }),
      rpc("get_class_standings", { p_code: currentCompetition.code }),
      rpc("get_class_podiums", { p_code: currentCompetition.code })
    ]);
    $("overallPanel").innerHTML = rankingTable(overall);
    $("classesPanel").innerHTML = classTable(classes);
    $("podiumsPanel").innerHTML = podiumCards(podiums);
  } catch (error) { $("overallPanel").innerHTML = `<p class="empty-ranking">${escapeHtml(error.message)}</p>`; }
}

function rankingTable(rows) {
  if (!rows.length) return `<p class="empty-ranking">${t("emptyRanking")}</p>`;
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Estudiante</th><th>Clase</th><th>Mejor puntuación</th><th>Intentos</th><th>Fallos</th><th>Tiempo</th></tr></thead><tbody>${rows.map(row => `<tr><td class="rank rank-${row.rank_position}">${medal(row.rank_position)}</td><td><strong>${escapeHtml(row.display_name)}</strong></td><td><span class="class-dot" style="--class-color:${row.class_color}"></span>${escapeHtml(row.class_name)}</td><td><strong>${row.score}</strong></td><td><span class="attempt-pill">${row.attempt_count}/3</span></td><td>${row.mistakes}</td><td>${formatTime(row.duration_seconds)}</td></tr>`).join("")}</tbody></table></div>`;
}

function classTable(rows) {
  return `<div class="team-grid">${rows.map(row => `<article class="team-card" style="--class-color:${row.class_color}"><span class="team-rank">${medal(row.rank_position)}</span><h3>${escapeHtml(row.class_name)}</h3><strong>${row.team_score ?? '—'}</strong><small>${row.qualifying_students} ${window.i18n?.language === "en" ? "of 3 results" : "de 3 resultados"}</small></article>`).join("")}</div><p class="ranking-note">${t("classNote")}</p>`;
}

function podiumCards(rows) {
  if (!rows.length) return `<p class="empty-ranking">${t("noPodiums")}</p>`;
  const groups = Object.groupBy ? Object.groupBy(rows, row => row.class_name) : rows.reduce((all, row) => ((all[row.class_name] ||= []).push(row), all), {});
  return `<div class="podium-grid">${Object.entries(groups).map(([name, students]) => `<article class="podium-card" style="--class-color:${students[0].class_color}"><h3>${escapeHtml(name)}</h3>${students.map(s => `<div><span>${medal(s.class_position)}</span><strong>${escapeHtml(s.display_name)}</strong><small>${s.score} pts</small></div>`).join("")}</article>`).join("")}</div>`;
}

function formatTime(seconds) { const min = Math.floor(seconds / 60), sec = seconds % 60; return `${min}:${String(sec).padStart(2, "0")}`; }
function medal(rank) { return ({ 1: "🥇", 2: "🥈", 3: "🥉" })[rank] || rank; }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }

$("registrationForm").addEventListener("submit", registerStudent);
$("sessionCode").addEventListener("change", loadCompetition);
$("nextRound").addEventListener("click", advance);
$("playAgain").addEventListener("click", () => { $("gameCard").classList.add("hidden"); $("leaderboardSection").classList.add("hidden"); $("registrationCard").classList.remove("hidden"); currentRunId = null; });
$("refreshLeaderboard").addEventListener("click", loadLeaderboards);
document.querySelectorAll(".tab-button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".tab-button").forEach(item => { item.classList.toggle("active", item === button); item.setAttribute("aria-selected", item === button); });
  document.querySelectorAll(".ranking-panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== button.dataset.panel));
}));
$("soundButton").addEventListener("click", () => {
  soundEnabled = !soundEnabled; $("soundButton").setAttribute("aria-pressed", soundEnabled);
  $("soundButton").title = soundEnabled ? (window.i18n?.language === "en" ? "Turn sounds off" : "Desactivar sonidos") : (window.i18n?.language === "en" ? "Turn sounds on" : "Activar sonidos");
  $("soundIcon").textContent = soundEnabled ? "🔊" : "🔇"; $("soundLabel").textContent = soundEnabled ? (window.i18n?.language === "en" ? "Sounds on" : "Sonidos activados") : (window.i18n?.language === "en" ? "Sounds off" : "Sonidos desactivados");
});

document.addEventListener("languagechange", () => {
  if (currentAttemptNumber) $("gameAttempt").textContent = t("attempt", { number: currentAttemptNumber });
  if (!$("leaderboardSection").classList.contains("hidden") && currentCompetition) loadLeaderboards();
});

loadActiveSessions();
