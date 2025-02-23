// static/theme.js

document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("map");
  // Standardmäßig Dark Mode aktivieren, wenn nicht im Light Mode
  if (!document.body.classList.contains("light-mode")) {
    mapElement.classList.add("dark-invert");
  }

  const modeToggle = document.getElementById("modeToggle");
  modeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    if (document.body.classList.contains("light-mode")) {
      mapElement.classList.remove("dark-invert");
    } else {
      mapElement.classList.add("dark-invert");
    }
  });
});
