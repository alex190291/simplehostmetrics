// static/animations.js

// -------------------------------
// Background Hex Animation ------
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
    const pulseDelay = randomFloat(0, 10).toFixed(1);
    const bounceDelay = randomFloat(0, 15).toFixed(1);
    const bounceDuration = randomFloat(10, 20).toFixed(1);

    hex.style.top = top + "%";
    hex.style.left = left + "%";
    hex.style.width = size + "px";
    hex.style.height = size + "px";
    hex.style.animationDelay = `${pulseDelay}s, ${bounceDelay}s`;
    hex.style.animationDuration = `10s, ${bounceDuration}s`;

    container.appendChild(hex);
  }
}

generateHexagons(40);

// -------------------------------
// Card Expand/Collapse ----------
// -------------------------------
// Only add toggle behavior for cards that do NOT have the 'rtad' class.
document.querySelectorAll(".card:not(.rtad)").forEach((card) => {
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
