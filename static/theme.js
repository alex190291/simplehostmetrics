document.addEventListener("DOMContentLoaded", function () {
  // Retrieve the saved mode from localStorage, default to 'light'
  var savedMode = localStorage.getItem("selectedMode") || "light";
  console.log("Saved mode:", savedMode);
  // Set the mode on the body element
  document.body.classList.add(savedMode);

  // Get the mode toggle button element by its ID
  var modeToggle = document.getElementById("modeToggle");
  if (modeToggle) {
    console.log("Mode toggle button found");
    modeToggle.addEventListener("click", function () {
      console.log("Mode toggle button clicked");
      // Determine the new mode: toggle between 'light' and 'dark'
      var newMode = document.body.classList.contains("light")
        ? "dark"
        : "light";
      // Remove existing mode classes and apply the new mode
      document.body.classList.remove("light", "dark");
      document.body.classList.add(newMode);
      // Save the new mode to localStorage
      localStorage.setItem("selectedMode", newMode);
      console.log("New mode set:", newMode);
    });
  } else {
    console.log("Mode toggle button not found");
  }
});
