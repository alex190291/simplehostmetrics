document.addEventListener("DOMContentLoaded", function () {
  // Retrieve the saved mode from localStorage, default to 'light'
  var savedMode = localStorage.getItem("selectedMode") || "light";
  // Ensure the body has the correct class for the saved mode
  document.body.classList.add(savedMode);

  // Get the mode toggle button element
  var modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    modeToggle.addEventListener("click", function () {
      // Determine the new mode: toggle between 'light' and 'dark'
      var newMode = document.body.classList.contains("light")
        ? "dark"
        : "light";
      // Remove existing mode classes and apply the new mode
      document.body.classList.remove("light", "dark");
      document.body.classList.add(newMode);
      // Save the new mode to localStorage
      localStorage.setItem("selectedMode", newMode);
    });
  }
});
