const SUPABASE_URL = "https://nxpznzywxvfccosecmab.supabase.co";
const SUPABASE_KEY = "sb_publishable_RDuz6BsBu9zIEDjylAMLcQ_7ot5eW2i";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
let competitions = [];

async function initialize() {
  const { data: { session } } = await client.auth.getSession();
  if (session) await authorize();
}

async function authorize() {
  const { data, error } = await client.rpc("is_teacher");
  if (error || !data) {
    await client.auth.signOut();
    $("loginMessage").textContent = "Este correo no está autorizado.";
    $("loginMessage").className = "form-message bad";
    return;
  }
  $("loginCard").classList.add("hidden");
  $("adminDashboard").classList.remove("hidden");
  await loadSessions();
}

async function sendMagicLink(event) {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true; button.textContent = "Enviando…";
  const { error } = await client.auth.signInWithOtp({
    email: $("adminEmail").value.trim(),
    options: { emailRedirectTo: `${location.origin}${location.pathname}` }
  });
  $("loginMessage").textContent = error ? error.message : "Revisa tu correo y abre el enlace de acceso.";
  $("loginMessage").className = `form-message ${error ? "bad" : "good"}`;
  button.disabled = false; button.textContent = "Enviar enlace de acceso";
}

async function loadSessions() {
  const { data, error } = await client.rpc("admin_list_competitions");
  if (error) return showAdminError(error.message);
  competitions = data;
  $("adminSessionList").innerHTML = data.map(sessionCard).join("") || '<p class="empty-ranking">Todavía no hay sesiones.</p>';
  document.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", toggleSession));
  document.querySelectorAll("[data-results]").forEach(button => button.addEventListener("click", showResults));
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", copyStudentLink));
}

function sessionCard(session) {
  const status = session.is_active ? "Abierta" : "Cerrada";
  return `<article class="admin-session-card ${session.is_active ? "is-open" : "is-closed"}">
    <div><span class="session-status">${status}</span><h3>${escapeHtml(session.name)}</h3><code>${session.code}</code><p>${session.result_count} resultados completados</p></div>
    <div class="session-actions">
      <button class="refresh-button" data-results="${session.code}" type="button">Ver resultados</button>
      ${session.is_active ? `<button class="refresh-button" data-copy="${session.code}" type="button">Copiar enlace</button>` : ""}
      <button class="primary-button compact-button" data-toggle="${session.id}" data-active="${!session.is_active}" type="button">${session.is_active ? "Cerrar sesión" : "Reabrir"}</button>
    </div>
  </article>`;
}

async function createSession(event) {
  event.preventDefault();
  const name = $("newSessionName").value.trim(), code = $("newSessionCode").value.trim().toUpperCase();
  const { error } = await client.rpc("admin_create_competition", { p_name: name, p_code: code });
  if (error) return showAdminError(error.message.includes("duplicate") ? "Ese código ya existe." : error.message);
  event.target.reset(); $("adminMessage").textContent = "Competición creada y abierta."; $("adminMessage").className = "form-message good";
  await loadSessions();
}

async function toggleSession(event) {
  const button = event.currentTarget; button.disabled = true;
  const { error } = await client.rpc("admin_set_competition_active", { p_id: button.dataset.toggle, p_active: button.dataset.active === "true" });
  if (error) showAdminError(error.message); else await loadSessions();
}

async function showResults(event) {
  const code = event.currentTarget.dataset.results;
  const session = competitions.find(item => item.code === code);
  $("adminRankingTitle").textContent = session?.name || code; $("adminRanking").classList.remove("hidden");
  $("adminRankingContent").innerHTML = '<p class="loading-ranking">Cargando resultados…</p>';
  const { data, error } = await client.rpc("get_leaderboard_v2", { p_code: code, p_limit: 25 });
  if (error) return $("adminRankingContent").textContent = error.message;
  $("adminRankingContent").innerHTML = data.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Estudiante</th><th>Clase</th><th>Mejor puntuación</th><th>Intentos</th><th>Fallos</th><th>Tiempo</th></tr></thead><tbody>${data.map(row => `<tr><td>${medal(row.rank_position)}</td><td><strong>${escapeHtml(row.display_name)}</strong></td><td>${escapeHtml(row.class_name)}</td><td>${row.score}</td><td><span class="attempt-pill">${row.attempt_count}/3</span></td><td>${row.mistakes}</td><td>${formatTime(row.duration_seconds)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty-ranking">Esta sesión todavía no tiene resultados.</p>';
  $("adminRanking").scrollIntoView({ behavior: "smooth" });
}

async function copyStudentLink(event) {
  const link = `${location.origin}${location.pathname.replace("admin.html", "")}?session=${event.currentTarget.dataset.copy}`;
  await navigator.clipboard.writeText(link);
  event.currentTarget.textContent = "Enlace copiado";
}

function showAdminError(message) { $("adminMessage").textContent = message; $("adminMessage").className = "form-message bad"; }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
function formatTime(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
function medal(rank) { return ({ 1: "🥇", 2: "🥈", 3: "🥉" })[rank] || rank; }

$("loginForm").addEventListener("submit", sendMagicLink);
$("createSessionForm").addEventListener("submit", createSession);
$("newSessionName").addEventListener("input", event => {
  if ($("newSessionCode").dataset.edited) return;
  $("newSessionCode").value = event.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
});
$("newSessionCode").addEventListener("input", event => { event.target.dataset.edited = "true"; event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""); });
$("closeRanking").addEventListener("click", () => $("adminRanking").classList.add("hidden"));
$("signOut").addEventListener("click", async () => { await client.auth.signOut(); location.reload(); });
client.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_IN" && session) setTimeout(authorize, 0); });
initialize();
