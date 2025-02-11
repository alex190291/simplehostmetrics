// static/animations.js

// -------------------------------
// Background Hex Animation
// -------------------------------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function generateHexagons(count) {
  const container = document.getElementById("hexagon-container");
  for (let i = 0; i < count; i++) {
    const hex = document.createElement("div");
    hex.classList.add("hexagon");
    const top = randomInt(0, 100);
    const left = randomInt(0, 100);
    const size = randomInt(80, 250);
    const delay = randomFloat(0, 10).toFixed(1);
    hex.style.top = top + "%";
    hex.style.left = left + "%";
    hex.style.width = size + "px";
    hex.style.height = size + "px";
    hex.style.animationDelay = delay + "s";
    container.appendChild(hex);
  }
}
generateHexagons(40);

// -------------------------------
// Card Expand/Collapse
// -------------------------------
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", (e) => {
    // Do not toggle if a button was clicked.
    if (e.target.tagName.toLowerCase() === "button") return;
    const detailView = card.querySelector(".detail-view");
    if (!detailView) return;
    const currentlyHidden =
      detailView.style.display === "" || detailView.style.display === "none";
    detailView.style.display = currentlyHidden ? "block" : "none";
  });
});
