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
    maxClusterRadius: 40,
    autoUnspiderfy: true,
    disableClusteringAtZoom: 10,
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
    return marker;
  }

  // Global map for key -> marker
  const markerMap = new Map();
  const NEW_EVENT_THRESHOLD = 3000;
  const MAX_MARKERS = 1000;

  // Remove the oldest marker when marker count exceeds MAX_MARKERS
  function removeOldestMarker() {
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
    const fetchTime = Date.now();
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      data.forEach((item) => {
        // Check that conversion to number yields valid coordinates (not NaN)
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          const key = `${item.timestamp}-${item.ip_address}`;
          if (!markerMap.has(key)) {
            if (markerMap.size >= MAX_MARKERS) {
              removeOldestMarker();
            }
            const marker = createMarker(item);
            markerMap.set(key, marker);
            markers.addLayer(marker);
          }
        }
      });
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    setTimeout(fetchData, 1000);
  }

  map.addLayer(markers);
  fetchData();
});
