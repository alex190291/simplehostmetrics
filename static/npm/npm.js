// /static/npm/npm.js
import { NPMManager } from "/static/npm/managers/NPMManager.js";

// Initialize the NPM Manager when the document is ready
document.addEventListener("DOMContentLoaded", () => {
  window.npmManager = new NPMManager();
});

// Close modals when clicking outside
window.onclick = (event) => {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
  }
};
