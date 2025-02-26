document.addEventListener("DOMContentLoaded", function () {
  // Retrieve the saved mode from localStorage, default to 'light'
  var savedMode = localStorage.getItem("selectedMode") || "light";
  console.log("Saved mode:", savedMode);

  // Apply the correct mode class to the body
  if (savedMode === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.add("light-mode");
  }

  // Get the mode toggle button element by its ID
  var modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    console.log("Mode toggle button found");
    modeToggle.addEventListener("click", function () {
      console.log("Mode toggle button clicked");
      // Toggle between light and dark mode
      if (document.body.classList.contains("light-mode")) {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
        localStorage.setItem("selectedMode", "dark");
        console.log("New mode set: dark");
      } else {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
        localStorage.setItem("selectedMode", "light");
        console.log("New mode set: light");
      }
    });
  } else {
    console.log("Mode toggle button not found");
  }
});
