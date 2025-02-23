// static/theme.js

const modeToggle = document.getElementById("modeToggle");
modeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  const mapElement = document.getElementById("map");
  if (document.body.classList.contains("light-mode")) {
    mapElement.classList.remove("dark-invert");
  } else {
    mapElement.classList.add("dark-invert");
  }
});
