(() => {
  const pairs = [
    ["LECCIÓN 1 · CONTEXTOS", "LESSON 1 · CONTEXTOS"],
    ["Encuentra su pareja", "Find the matching pair"],
    ["Selecciona una expresión en español y después su significado en inglés.", "Select an expression in Spanish and then its meaning in English."],
    ["COMPETICIÓN ENTRE CLASES", "CLASS COMPETITION"],
    ["¿Listo para jugar?", "Ready to play?"],
    ["Tienes un máximo de tres intentos. Guardaremos los tres y tu mejor puntuación será la que aparezca en la clasificación.", "You have a maximum of three attempts. We will save all three and use your best score on the leaderboard."],
    ["Competición", "Competition"], ["Nombre", "First name"], ["Apellido", "Last name"],
    ["ID del estudiante", "Student ID"], ["Tu ID es privado: nunca aparecerá en la clasificación.", "Your ID is private and will never appear on the leaderboard."],
    ["Clase", "Class"], ["Acepto que mi nombre y la inicial de mi apellido aparezcan en la clasificación.", "I agree that my first name and last initial may appear on the leaderboard."],
    ["Empezar la partida", "Start game"], ["Juego de emparejar vocabulario", "Vocabulary matching game"],
    ["SESIÓN", "SESSION"], ["INTENTO 1 DE 3", "ATTEMPT 1 OF 3"], ["RONDA", "ROUND"], ["DE", "OF"], ["parejas", "pairs"],
    ["Elige una tarjeta de cada columna.", "Choose one card from each column."], ["Español", "Spanish"],
    ["¡Ronda completada!", "Round complete!"], ["Has encontrado todas las parejas.", "You found all the pairs."], ["Siguiente ronda", "Next round"],
    ["JUEGO COMPLETADO", "GAME COMPLETE"], ["¡Excelente trabajo!", "Excellent work!"],
    ["Has practicado las", "You practiced all"], ["expresiones de esta lección.", "expressions in this lesson."],
    ["puntos", "points"], ["precisión", "accuracy"], ["fallos", "mistakes"], ["tiempo", "time"],
    ["Guardando tu resultado…", "Saving your result…"], ["Nuevo intento", "New attempt"],
    ["RESULTADOS EN DIRECTO", "LIVE RESULTS"], ["Clasificación", "Leaderboard"], ["Actualizar", "Refresh"],
    ["Tipos de clasificación", "Leaderboard categories"], ["Por clases", "By class"], ["Podios", "Podiums"],
    ["Cargando clasificación…", "Loading leaderboard…"], ["También puedes usar", "You can also use"], ["y", "and"], ["para jugar.", "to play."],
    ["ADMINISTRACIÓN", "ADMINISTRATION"], ["Panel del profesor", "Teacher dashboard"],
    ["Crea, abre y cierra competiciones sin perder sus clasificaciones.", "Create, open, and close competitions without losing their leaderboards."],
    ["Ver juego", "View game"], ["ACCESO PRIVADO", "PRIVATE ACCESS"], ["Identifícate", "Sign in"],
    ["Recibirás un enlace seguro en el correo autorizado. No necesitas contraseña.", "You will receive a secure link at the authorized email address. No password is required."],
    ["Correo del profesor", "Teacher email"], ["Enviar enlace de acceso", "Send sign-in link"], ["TUS COMPETICIONES", "YOUR COMPETITIONS"],
    ["Sesiones", "Sessions"], ["Cerrar sesión", "Sign out"], ["Crear una competición", "Create a competition"],
    ["Nombre de la sesión", "Session name"], ["Código", "Code"], ["Crear y abrir", "Create and open"],
    ["Cargando sesiones…", "Loading sessions…"], ["CLASIFICACIÓN", "LEADERBOARD"], ["Resultados", "Results"], ["Cerrar", "Close"],
    ["CÓDIGO QR DE LA SESIÓN", "SESSION QR CODE"], ["Escanea para abrir el juego", "Scan to open the game"],
    ["Abrir enlace del estudiante", "Open student link"], ["Si el Wi-Fi escolar bloquea el juego, abre el enlace utilizando los datos móviles.", "If the school Wi-Fi blocks the game, open the link using mobile data."],
    ["Descargar QR", "Download QR"], ["Imprimir", "Print"], ["Código QR de la sesión", "Session QR code"],
    ["Estudiante", "Student"], ["Mejor puntuación", "Best score"], ["Intentos", "Attempts"], ["Tiempo", "Time"], ["Acción", "Action"],
    ["© 2026 · Un juego diseñado por Miguel Iglesias", "© 2026 · A game designed by Miguel Iglesias"],
    ["Desactivar sonidos", "Turn sounds off"], ["Activar sonidos", "Turn sounds on"],
    ["Sonidos activados", "Sounds on"], ["Sonidos desactivados", "Sounds off"],
    ["Contextos L1 — Septiembre 2026", "Contextos L1 — September 2026"]
  ];

  const esToEn = new Map(pairs);
  const enToEs = new Map(pairs.map(([es, en]) => [en, es]));
  const messages = {
    es: {
      loadingClasses: "Cargando clases…", selectClass: "Selecciona tu clase", sessionUnavailable: "Sesión no disponible",
      selectCompetitionFirst: "Selecciona primero una competición", loadingCompetitions: "Cargando competiciones…",
      noCompetitions: "No hay competiciones abiertas", teacherWillOpen: "Tu profesor abrirá una competición próximamente.",
      selectCompetition: "Selecciona la competición", competitionsError: "No se pudieron cargar las competiciones",
      preparing: "Preparando partida…", start: "Empezar la partida", attempt: "INTENTO {number} DE 3",
      chooseCards: "Elige una tarjeta de cada columna.", correct: "¡Correcto! Has encontrado una pareja.", wrong: "No es esa pareja. ¡Inténtalo otra vez!",
      roundSummary: "Has encontrado {count} parejas en esta ronda.", results: "Ver resultados", nextRound: "Siguiente ronda",
      saving: "Guardando tu resultado…", savedRemaining: "Resultado guardado. Te quedan {count} {word}.", oneAttempt: "intento", manyAttempts: "intentos",
      savedDone: "Resultado guardado. Has completado tus 3 intentos.", retry: "Usar otro intento ({count} {word})", oneAvailable: "disponible", manyAvailable: "disponibles",
      attemptsDone: "Has completado tus 3 intentos", emptyRanking: "Aún no hay resultados. ¡Puedes inaugurar la clasificación!",
      classNote: "La puntuación de cada clase es el promedio de sus tres mejores estudiantes.", noPodiums: "Los podios aparecerán cuando se registren resultados.",
      loadingSessions: "Cargando sesiones…", noSessions: "Todavía no hay sesiones.", open: "Abierta", closed: "Cerrada", completedResults: "{count} resultados completados",
      viewResults: "Ver resultados", copyLink: "Copiar enlace", closeSession: "Cerrar sesión", reopen: "Reabrir", sending: "Enviando…",
      checkEmail: "Revisa tu correo y abre el enlace de acceso.", unauthorized: "Este correo no está autorizado.", competitionCreated: "Competición creada y abierta.", duplicateCode: "Ese código ya existe.",
      loadingResults: "Cargando resultados…", noResults: "Esta sesión todavía no tiene resultados.", reset: "Reiniciar", resetting: "Reiniciando…",
      resetConfirm: "¿Reiniciar los intentos de {name}?\n\nSe eliminarán sus partidas y su mejor puntuación de esta sesión.", resetDone: "Intentos reiniciados: {count} partidas eliminadas.", linkCopied: "Enlace copiado"
    },
    en: {
      loadingClasses: "Loading classes…", selectClass: "Select your class", sessionUnavailable: "Session unavailable",
      selectCompetitionFirst: "Select a competition first", loadingCompetitions: "Loading competitions…",
      noCompetitions: "No open competitions", teacherWillOpen: "Your teacher will open a competition soon.",
      selectCompetition: "Select the competition", competitionsError: "Competitions could not be loaded",
      preparing: "Preparing game…", start: "Start game", attempt: "ATTEMPT {number} OF 3",
      chooseCards: "Choose one card from each column.", correct: "Correct! You found a pair.", wrong: "That is not the pair. Try again!",
      roundSummary: "You found {count} pairs in this round.", results: "View results", nextRound: "Next round",
      saving: "Saving your result…", savedRemaining: "Result saved. You have {count} {word} remaining.", oneAttempt: "attempt", manyAttempts: "attempts",
      savedDone: "Result saved. You have completed all 3 attempts.", retry: "Use another attempt ({count} {word})", oneAvailable: "available", manyAvailable: "available",
      attemptsDone: "You have completed all 3 attempts", emptyRanking: "No results yet. You can be the first on the leaderboard!",
      classNote: "Each class score is the average of its top three students.", noPodiums: "Podiums will appear when results are recorded.",
      loadingSessions: "Loading sessions…", noSessions: "There are no sessions yet.", open: "Open", closed: "Closed", completedResults: "{count} completed results",
      viewResults: "View results", copyLink: "Copy link", closeSession: "Close session", reopen: "Reopen", sending: "Sending…",
      checkEmail: "Check your email and open the sign-in link.", unauthorized: "This email is not authorized.", competitionCreated: "Competition created and opened.", duplicateCode: "That code already exists.",
      loadingResults: "Loading results…", noResults: "This session does not have any results yet.", reset: "Reset", resetting: "Resetting…",
      resetConfirm: "Reset attempts for {name}?\n\nTheir games and best score for this session will be deleted.", resetDone: "Attempts reset: {count} games deleted.", linkCopied: "Link copied"
    }
  };

  let language = localStorage.getItem("contextosLanguage") === "en" ? "en" : "es";
  const replace = (template, vars = {}) => Object.entries(vars).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
  const t = (key, vars) => replace(messages[language][key] || key, vars);

  function translateNode(node) {
    if (!node.nodeValue || node.parentElement?.closest("script, style, [data-no-translate]")) return;
    const trimmed = node.nodeValue.trim(); if (!trimmed) return;
    const translated = (language === "en" ? esToEn : enToEs).get(trimmed);
    if (translated) node.nodeValue = node.nodeValue.replace(trimmed, translated);
  }

  function apply(root = document.body, notify = false) {
    document.documentElement.lang = language;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) translateNode(node);
    document.querySelectorAll("[placeholder], [title], [aria-label]").forEach(element => {
      ["placeholder", "title", "aria-label"].forEach(attribute => {
        const value = element.getAttribute(attribute); if (!value) return;
        const translated = (language === "en" ? esToEn : enToEs).get(value); if (translated) element.setAttribute(attribute, translated);
      });
    });
    document.querySelectorAll("[data-language-toggle]").forEach(button => {
      button.textContent = language === "es" ? "EN" : "ES";
      button.setAttribute("aria-label", language === "es" ? "Switch to English" : "Cambiar a español");
      button.title = language === "es" ? "English" : "Español";
    });
    if (notify) document.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
  }

  document.addEventListener("click", event => {
    if (!event.target.closest("[data-language-toggle]")) return;
    language = language === "es" ? "en" : "es"; localStorage.setItem("contextosLanguage", language); apply(document.body, true);
  });
  new MutationObserver(mutations => mutations.forEach(mutation => {
    if (mutation.type === "characterData") translateNode(mutation.target);
    mutation.addedNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) translateNode(node); else if (node.nodeType === Node.ELEMENT_NODE) apply(node, false); });
  })).observe(document.body, { childList: true, characterData: true, subtree: true });

  window.i18n = { t, apply, get language() { return language; } };
  apply(document.body, false);
})();
