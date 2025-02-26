// map.js.
document.addEventListener("DOMContentLoaded", async function () {
  // Initialize Leaflet map
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  // Add basic OSM tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  // Apply dark mode if <body> does not have "light-mode" class
  if (!document.body.classList.contains("light-mode")) {
    map.getContainer().classList.add("dark-mode");
  }

  // Mode toggle button listener
  const toggleButton = document.getElementById("modeToggle");
  toggleButton.addEventListener("click", () => {
    if (document.body.classList.contains("light-mode")) {
      map.getContainer().classList.remove("dark-mode");
    } else {
      map.getContainer().classList.add("dark-mode");
    }
  });

  // Marker cluster setup with disableClusteringAtZoom option
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 60,
    autoUnspiderfy: true,
    //disableClusteringAtZoom: 10,
  });

  markers.on("clusterclick", function (a) {
    if (markers._spiderfied === a.layer) {
      markers.unspiderfy();
    }
  });

  // Define icons for login and proxy events
  const loginIcon = L.divIcon({
    html: '<div style="width:25px;height:25px;border-radius:50%;background-color:#f55;"></div>',
    className: "minimal-marker",
    iconSize: [25, 25],
  });

  const proxyIcon = L.divIcon({
    html: '<div style="width:25px;height:25px;border-radius:50%;background-color:#55f;"></div>',
    iconSize: [25, 25],
    className: "minimal-marker",
  });

  // Helper: create popup content for a marker
  function createPopup(item) {
    const typeLabel =
      item.type === "login" ? "SSH Login Attempt" : "Proxy Event";
    return `
      <b>${typeLabel}</b><br>
      IP: ${item.ip_address || "N/A"}<br>
      Country: ${item.country || "Unknown"}<br>
      City: ${item.city || "Unknown"}<br>
      ${
        item.type === "login"
          ? `User: ${item.user || ""}<br>Reason: ${item.failure_reason || ""}`
          : `Domain: ${item.domain || ""}<br>Error: ${item.error_code || ""}<br>URL: ${item.url || ""}`
      }
      <br>Timestamp: ${new Date(item.timestamp).toLocaleString()}
    `;
  }

  // Floating marker menu element reference
  let currentMarkerMenu = null;

  // Function to remove/hide marker menu
  function removeMarkerMenu() {
    if (currentMarkerMenu && currentMarkerMenu.parentNode) {
      currentMarkerMenu.parentNode.removeChild(currentMarkerMenu);
      currentMarkerMenu = null;
    }
  }

  // Dismiss the marker menu when clicking anywhere outside it
  document.addEventListener("click", function (e) {
    if (currentMarkerMenu && !currentMarkerMenu.contains(e.target)) {
      removeMarkerMenu();
    }
  });

  // Helper: create a marker based on event type with improved coordinate validation
  function createMarker(item) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    console.log(
      "Creating marker for",
      item.city,
      "with coordinates:",
      lat,
      lon,
    );
    const icon = item.type === "login" ? loginIcon : proxyIcon;
    const marker = L.marker([lat, lon], { icon: icon });
    marker.bindPopup(createPopup(item));

    marker.on("mouseover", function () {
      this.openPopup();
    });
    marker.on("mouseout", function () {
      this.closePopup();
    });

    // Attach the item data to the marker for later use
    marker.itemData = item;

    // Add click event for the floating menu
    marker.on("click", function (e) {
      // Prevent event propagation so that document click doesn't immediately remove the menu
      L.DomEvent.stopPropagation(e);
      // Remove any existing menu
      removeMarkerMenu();

      // Create menu element
      const menu = document.createElement("div");
      menu.className = "marker-menu";

      // Create Copy IP button
      const copyIPBtn = document.createElement("button");
      copyIPBtn.textContent = "Copy IP";
      copyIPBtn.addEventListener("click", function (evt) {
        evt.stopPropagation();
        navigator.clipboard.writeText(item.ip_address || "");
        removeMarkerMenu();
      });
      menu.appendChild(copyIPBtn);

      // Create Copy Info button
      const copyInfoBtn = document.createElement("button");
      copyInfoBtn.textContent = "Copy Info";
      copyInfoBtn.addEventListener("click", function (evt) {
        evt.stopPropagation();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = createPopup(item);
        const textContent = tempDiv.textContent || tempDiv.innerText || "";
        navigator.clipboard.writeText(textContent);
        removeMarkerMenu();
      });
      menu.appendChild(copyInfoBtn);

      // Append menu to the map container
      map.getContainer().appendChild(menu);

      // Position the menu near the click event (relative to the map container)
      const mapRect = map.getContainer().getBoundingClientRect();
      const x = e.originalEvent.clientX - mapRect.left;
      const y = e.originalEvent.clientY - mapRect.top;
      menu.style.left = x + "px";
      menu.style.top = y + "px";

      // Trigger fade-in effect by adding the "show" class after appending
      setTimeout(() => {
        menu.classList.add("show");
      }, 10);

      // Save reference to the current menu
      currentMarkerMenu = menu;
    });

    return marker;
  }

  // Separate maps for failed login events and HTTP events
  const loginMarkerMap = new Map();
  const proxyMarkerMap = new Map();
  const MAX_FAILED_LOGINS = 1000;
  const MAX_HTTP_EVENTS = 1000;

  // Remove the oldest marker from a given marker map
  function removeOldestMarker(markerMap) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, markerObj] of markerMap.entries()) {
      const [timestampStr] = key.split("-");
      const eventTime = new Date(timestampStr).getTime();
      if (eventTime < oldestTime) {
        oldestTime = eventTime;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      const oldestMarker = markerMap.get(oldestKey);
      markers.removeLayer(oldestMarker);
      markerMap.delete(oldestKey);
    }
  }

  async function fetchData() {
    if (markers._spiderfied) {
      setTimeout(fetchData, 1000);
      return;
    }
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      data.forEach((item) => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          // Use a common key format for each event
          const key = `${item.timestamp}-${item.ip_address}`;
          if (item.type === "login") {
            // For failed SSH login events, keep only the last MAX_FAILED_LOGINS markers
            if (!loginMarkerMap.has(key)) {
              if (loginMarkerMap.size >= MAX_FAILED_LOGINS) {
                removeOldestMarker(loginMarkerMap);
              }
              const marker = createMarker(item);
              loginMarkerMap.set(key, marker);
              markers.addLayer(marker);
            }
          } else {
            // For HTTP (proxy) events, keep only the last MAX_HTTP_EVENTS markers
            if (!proxyMarkerMap.has(key)) {
              if (proxyMarkerMap.size >= MAX_HTTP_EVENTS) {
                removeOldestMarker(proxyMarkerMap);
              }
              const marker = createMarker(item);
              proxyMarkerMap.set(key, marker);
              markers.addLayer(marker);
            }
          }
        }
      });
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    setTimeout(fetchData, 5000);
  }

  map.addLayer(markers);
  fetchData();
});
