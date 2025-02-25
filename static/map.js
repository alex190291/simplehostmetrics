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

  // Helper: create or update a marker based on event type.
  // This function only creates a new marker if it does not exist already.
  function updateOrCreateMarker(item, markerMap) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    const key = `${item.timestamp}-${item.ip_address}`;
    const existingMarker = markerMap.get(key);

    if (existingMarker) {
      // If coordinates have changed, update them
      const currentPos = existingMarker.getLatLng();
      if (currentPos.lat !== lat || currentPos.lng !== lon) {
        existingMarker.setLatLng([lat, lon]);
      }
      // Update popup content in case of any change in data
      existingMarker.bindPopup(createPopup(item));
    } else {
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

  // Separate maps for login events and proxy events.
  const loginMarkerMap = new Map();
  const proxyMarkerMap = new Map();

  // Helper: remove markers older than 24 hours.
  function removeOldMarkers(markerMap) {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (let [key, marker] of markerMap.entries()) {
      // Extract timestamp from key, which is in ISO string format.
      const parts = key.split("-");
      // Assume the timestamp is the first part; if it has a "T", it's ISO.
      const timestampStr = parts[0];
      const markerTime = new Date(timestampStr).getTime();
      if (markerTime < cutoff) {
        markers.removeLayer(marker);
        markerMap.delete(key);
      }
    }
  }

  async function fetchData() {
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;

      // Process each event from the API.
      data.forEach((item) => {
        // Only include events from the past 24 hours.
        const eventTime = new Date(item.timestamp).getTime();
        if (isNaN(eventTime) || eventTime < cutoff) {
          return;
        }
        if (isNaN(Number(item.lat)) || isNaN(Number(item.lon))) {
          return;
        }
        if (item.type === "login") {
          updateOrCreateMarker(item, loginMarkerMap);
        } else {
          updateOrCreateMarker(item, proxyMarkerMap);
        }
      });

      // Remove markers older than 24 hours.
      removeOldMarkers(loginMarkerMap);
      removeOldMarkers(proxyMarkerMap);
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    setTimeout(fetchData, 1000);
  }

  map.addLayer(markers);
  fetchData();
});
