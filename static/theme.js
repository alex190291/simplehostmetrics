// static/theme.js
document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");
  // Dark Mode standardmäßig aktivieren
  if (!document.body.classList.contains("light-mode")) {
    mapElement.classList.add("dark-mode");
  }

  const modeToggle = document.getElementById("modeToggle");
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    if (document.body.classList.contains("light-mode")) {
      mapElement.classList.remove("dark-mode");
    } else {
      mapElement.classList.add("dark-mode");
    }
  });
});
