// static/theme.js
document.addEventListener("DOMContentLoaded", () => {
  const modeToggle = document.getElementById("modeToggle");

  // Standardmäßig bleibt die Seite im Dark Mode (keine "light-mode"-Klasse auf <body>).
  // Bei Klick wird ausschließlich der Body zwischen Dark/Light gewechselt.
  // Die Karte selbst wird in map.js entsprechend synchronisiert.
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });
});
