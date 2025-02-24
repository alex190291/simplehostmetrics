// static/map.js
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

  // Use a Map to track markers by a unique key (timestamp + ip_address)
  const markerMap = new Map();

  // Helper: create a marker if it doesn't already exist
  function addMarkerIfNew(item) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    // Construct a unique key for the event
    const key = `${item.timestamp}-${item.ip_address}`;
    if (markerMap.has(key)) {
      // Marker already exists; do nothing to avoid duplicates
      return;
    }
    // Create new marker
    const icon = item.type === "login" ? loginIcon : proxyIcon;
    const marker = L.marker([lat, lon], { icon: icon });
    marker.bindPopup(createPopup(item));
    marker.on("mouseover", function () {
      this.openPopup();
    });
    marker.on("mouseout", function () {
      this.closePopup();
    });
    markerMap.set(key, marker);
    markers.addLayer(marker);
  }

  async function fetchData() {
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      // Only add markers if they don't already exist.
      data.forEach((item) => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        if (isNaN(lat) || isNaN(lon)) {
          return;
        }
        addMarkerIfNew(item);
      });
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    // Poll for new data every second.
    setTimeout(fetchData, 1000);
  }

  map.addLayer(markers);
  fetchData();
});
