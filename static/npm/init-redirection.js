// Initialize RedirectionHostModals for global access
import * as RedirectionHostModals from "/static/npm/modals/RedirectionHostModals.js";

// Make sure RedirectionHostModals is available globally
window.RedirectionHostModals = RedirectionHostModals;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize create button if it exists
  const createBtn = document.getElementById("createRedirectionHostBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      RedirectionHostModals.showCreateRedirectionHostModal()
        .then(data => {
          window.RedirectionHostManager.createRedirectionHost(data);
        })
        .catch(err => console.error("Failed to create redirection host:", err));
    });
  }
});
