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

  // Helper: create or update a marker based on event type with diffing
  function updateOrCreateMarker(item, markerMap) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    const key = `${item.timestamp}-${item.ip_address}`;
    const existingMarker = markerMap.get(key);

    if (existingMarker) {
      // Check if coordinates have changed
      const currentPos = existingMarker.getLatLng();
      if (currentPos.lat !== lat || currentPos.lng !== lon) {
        existingMarker.setLatLng([lat, lon]);
      }
      // Update popup content
      existingMarker.bindPopup(createPopup(item));
    } else {
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
    return key;
  }

  // Separate maps for failed login events and HTTP events
  const loginMarkerMap = new Map();
  const proxyMarkerMap = new Map();

  async function fetchData() {
    if (markers._spiderfied) {
      setTimeout(fetchData, 1000);
      return;
    }
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      // New sets to track keys received in current update
      const loginKeys = new Set();
      const proxyKeys = new Set();

      data.forEach((item) => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        if (isNaN(lat) || isNaN(lon)) {
          return;
        }
        if (item.type === "login") {
          const key = updateOrCreateMarker(item, loginMarkerMap);
          loginKeys.add(key);
        } else {
          const key = updateOrCreateMarker(item, proxyMarkerMap);
          proxyKeys.add(key);
        }
      });

      // Remove markers that are no longer in the fetched data
      // For login markers:
      for (let [key, marker] of loginMarkerMap.entries()) {
        if (!loginKeys.has(key)) {
          markers.removeLayer(marker);
          loginMarkerMap.delete(key);
        }
      }
      // For proxy markers:
      for (let [key, marker] of proxyMarkerMap.entries()) {
        if (!proxyKeys.has(key)) {
          markers.removeLayer(marker);
          proxyMarkerMap.delete(key);
        }
      }
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    setTimeout(fetchData, 1000);
  }

  map.addLayer(markers);
  fetchData();
});
