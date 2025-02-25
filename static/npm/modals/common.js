// /static/npm/modals/common.js
export function switchTab(tabName, btn) {
  document.querySelectorAll(".tab-content").forEach(function (el) {
    el.style.display = "none";
  });
  document.getElementById(tabName + "Tab").style.display = "block";
  document.querySelectorAll(".tab-link").forEach(function (link) {
    link.classList.remove("active");
  });
  btn.classList.add("active");
}

export function closeModals() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.style.display = "none";
  });
}
