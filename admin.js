const SUPABASE_URL = "https://nxpznzywxvfccosecmab.supabase.co";
const SUPABASE_KEY = "sb_publishable_RDuz6BsBu9zIEDjylAMLcQ_7ot5eW2i";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
const t = (key, vars) => window.i18n?.t(key, vars) || key;
let competitions = [];
let currentResultsCode = null;
let currentQrCode = null;

async function initialize() {
  const { data: { session } } = await client.auth.getSession();
  if (session) await authorize();
}

async function authorize() {
  const { data, error } = await client.rpc("is_teacher");
  if (error || !data) {
    await client.auth.signOut();
    $("loginMessage").textContent = t("unauthorized");
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
  button.disabled = true; button.textContent = t("sending");
  const { error } = await client.auth.signInWithOtp({
    email: $("adminEmail").value.trim(),
    options: { emailRedirectTo: `${location.origin}${location.pathname}` }
  });
  $("loginMessage").textContent = error ? error.message : t("checkEmail");
  $("loginMessage").className = `form-message ${error ? "bad" : "good"}`;
  button.disabled = false; button.textContent = window.i18n?.language === "en" ? "Send sign-in link" : "Enviar enlace de acceso";
}

async function loadSessions() {
  const { data, error } = await client.rpc("admin_list_competitions");
  if (error) return showAdminError(error.message);
  competitions = data;
  $("adminSessionList").innerHTML = data.map(sessionCard).join("") || `<p class="empty-ranking">${t("noSessions")}</p>`;
  document.querySelectorAll("[data-toggle]").forEach(button => button.addEventListener("click", toggleSession));
  document.querySelectorAll("[data-results]").forEach(button => button.addEventListener("click", showResults));
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", copyStudentLink));
  document.querySelectorAll("[data-qr]").forEach(button => button.addEventListener("click", showSessionQr));
}

function sessionCard(session) {
  const status = t(session.is_active ? "open" : "closed");
  return `<article class="admin-session-card ${session.is_active ? "is-open" : "is-closed"}">
    <div><span class="session-status">${status}</span><h3>${escapeHtml(session.name)}</h3><code>${session.code}</code><p>${t("completedResults", { count: session.result_count })}</p></div>
    <div class="session-actions">
      <button class="refresh-button session-action-button results-button" data-results="${session.code}" type="button">${t("viewResults")}</button>
      ${session.is_active ? `<button class="refresh-button session-action-button copy-button" data-copy="${session.code}" type="button">${t("copyLink")}</button>` : ""}
      <button class="refresh-button session-action-button qr-button" data-qr="${session.code}" type="button">QR</button>
      <button class="primary-button compact-button" data-toggle="${session.id}" data-active="${!session.is_active}" type="button">${t(session.is_active ? "closeSession" : "reopen")}</button>
    </div>
  </article>`;
}

async function createSession(event) {
  event.preventDefault();
  const name = $("newSessionName").value.trim(), code = $("newSessionCode").value.trim().toUpperCase();
  const { error } = await client.rpc("admin_create_competition", { p_name: name, p_code: code });
  if (error) return showAdminError(error.message.includes("duplicate") ? t("duplicateCode") : error.message);
  event.target.reset(); $("adminMessage").textContent = t("competitionCreated"); $("adminMessage").className = "form-message good";
  await loadSessions();
}

async function toggleSession(event) {
  const button = event.currentTarget; button.disabled = true;
  const { error } = await client.rpc("admin_set_competition_active", { p_id: button.dataset.toggle, p_active: button.dataset.active === "true" });
  if (error) showAdminError(error.message); else await loadSessions();
}

async function showResults(event) {
  const code = event.currentTarget.dataset.results;
  await loadResults(code);
}

async function loadResults(code) {
  currentResultsCode = code;
  const session = competitions.find(item => item.code === code);
  $("adminRankingTitle").textContent = session?.name || code; $("adminRanking").classList.remove("hidden");
  $("adminRankingContent").innerHTML = `<p class="loading-ranking">${t("loadingResults")}</p>`;
  const { data, error } = await client.rpc("admin_get_leaderboard_v2", { p_code: code, p_limit: 100 });
  if (error) return $("adminRankingContent").textContent = error.message;
  $("adminRankingContent").innerHTML = data.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Estudiante</th><th>ID</th><th>Clase</th><th>Mejor puntuación</th><th>Intentos</th><th>Fallos</th><th>Tiempo</th><th>Acción</th></tr></thead><tbody>${data.map(row => `<tr><td>${medal(row.rank_position)}</td><td><strong>${escapeHtml(row.display_name)}</strong></td><td><code>${escapeHtml(maskStudentId(row.masked_student_id))}</code></td><td>${escapeHtml(row.class_name)}</td><td>${row.score}</td><td><span class="attempt-pill">${row.attempt_count}/3</span></td><td>${row.mistakes}</td><td>${formatTime(row.duration_seconds)}</td><td><button class="reset-attempts-button" type="button" data-reset-ref="${row.student_ref}" data-class-id="${row.class_id}" data-student-name="${encodeURIComponent(row.display_name)}">${t("reset")}</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-ranking">${t("noResults")}</p>`;
  document.querySelectorAll("[data-reset-ref]").forEach(button => button.addEventListener("click", resetStudentAttempts));
  $("adminRanking").scrollIntoView({ behavior: "smooth" });
}

async function resetStudentAttempts(event) {
  const button = event.currentTarget;
  const studentName = decodeURIComponent(button.dataset.studentName);
  if (!confirm(t("resetConfirm", { name: studentName }))) return;
  button.disabled = true; button.textContent = t("resetting");
  const { data, error } = await client.rpc("admin_reset_student_attempts", {
    p_code: currentResultsCode,
    p_class_id: button.dataset.classId,
    p_student_ref: button.dataset.resetRef
  });
  if (error) { button.disabled = false; button.textContent = t("reset"); return showAdminError(error.message); }
  $("adminMessage").textContent = t("resetDone", { count: data });
  $("adminMessage").className = "form-message good";
  await loadSessions();
  await loadResults(currentResultsCode);
}

async function copyStudentLink(event) {
  const link = studentLink(event.currentTarget.dataset.copy);
  await navigator.clipboard.writeText(link);
  event.currentTarget.textContent = t("linkCopied");
}

function studentLink(code) {
  return `${location.origin}${location.pathname.replace("admin.html", "")}?session=${encodeURIComponent(code)}`;
}

function showSessionQr(event) {
  const code = event.currentTarget.dataset.qr;
  const session = competitions.find(item => item.code === code);
  const link = studentLink(code);
  currentQrCode = code;
  $("qrSessionName").textContent = session?.name || code;
  $("qrSessionCode").textContent = code;
  $("qrStudentLink").href = link;
  $("qrCode").replaceChildren();
  new QRCode($("qrCode"), {
    text: link, width: 340, height: 340,
    colorDark: "#043b4a", colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  $("qrDialog").showModal();
}

function downloadSessionQr() {
  const canvas = $("qrCode").querySelector("canvas");
  const image = $("qrCode").querySelector("img");
  const source = canvas?.toDataURL("image/png") || image?.src;
  if (!source) return;
  const download = document.createElement("a");
  download.href = source; download.download = `${currentQrCode || "contextos"}-QR.png`; download.click();
}

function showAdminError(message) { $("adminMessage").textContent = message; $("adminMessage").className = "form-message bad"; }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }
function maskStudentId(value) {
  const id = String(value ?? "");
  if (!id || id === "Anterior") return id;
  const visibleDigits = id.slice(-3);
  return `${"•".repeat(Math.max(id.length - 3, 3))}${visibleDigits}`;
}
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
$("downloadQr").addEventListener("click", downloadSessionQr);
$("printQr").addEventListener("click", () => window.print());
$("qrDialog").addEventListener("click", event => { if (event.target === $("qrDialog")) $("qrDialog").close(); });
client.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_IN" && session) setTimeout(authorize, 0); });
initialize();
document.addEventListener("languagechange", () => {
  if (!$("adminDashboard").classList.contains("hidden")) loadSessions();
  if (currentResultsCode && !$("adminRanking").classList.contains("hidden")) loadResults(currentResultsCode);
});
