// /static/npm/NPMUtils.js
export function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 100);
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

export function showError(message) {
  showNotification(message, "error");
}

export function showSuccess(message) {
  showNotification(message, "success");
}
