// map.js
document.addEventListener("DOMContentLoaded", async function () {
  // Initialize the Leaflet map
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  // Add basic OSM tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  // Check for dark mode
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

  // Set up marker clustering
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    autoUnspiderfy: true,
  });

  markers.on("clusterclick", function (a) {
    if (markers._spiderfied === a.layer) {
      markers.unspiderfy();
    }
  });

  // Define icons for login fails and proxy events
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

  // Helper: create a marker based on event type
  function createMarker(item) {
    const icon = item.type === "login" ? loginIcon : proxyIcon;
    const marker = L.marker([item.lat, item.lon], { icon: icon });
    marker.bindPopup(createPopup(item));
    marker.on("mouseover", function () {
      this.openPopup();
    });
    marker.on("mouseout", function () {
      this.closePopup();
    });
    return marker;
  }

  // Separate marker maps for login and proxy events
  const loginMarkerMap = new Map();
  const proxyMarkerMap = new Map();
  // New event animation threshold (milliseconds)
  const NEW_EVENT_THRESHOLD = 3000;
  // Maximum markers allowed for each event type
  const MAX_LOGIN_MARKERS = 1000;
  const MAX_PROXY_MARKERS = 1000;

  // Remove the oldest marker from a given marker map
  function removeOldestMarker(markerMap) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, marker] of markerMap.entries()) {
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
    // Do not fetch new data if clusters are currently expanded
    if (markers._spiderfied) {
      setTimeout(fetchData, 1000);
      return;
    }
    const fetchTime = Date.now();
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      const newMarkersForAnimation = [];

      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          const key = `${item.timestamp}-${item.ip_address}`;
          // Process login events separately
          if (item.type === "login") {
            if (!loginMarkerMap.has(key)) {
              if (loginMarkerMap.size >= MAX_LOGIN_MARKERS) {
                removeOldestMarker(loginMarkerMap);
              }
              const marker = createMarker(item);
              loginMarkerMap.set(key, marker);
              markers.addLayer(marker);
              const eventTime = new Date(item.timestamp).getTime();
              if (fetchTime - eventTime < NEW_EVENT_THRESHOLD) {
                newMarkersForAnimation.push(marker);
              }
            }
          } else {
            // Process proxy events separately
            if (!proxyMarkerMap.has(key)) {
              if (proxyMarkerMap.size >= MAX_PROXY_MARKERS) {
                removeOldestMarker(proxyMarkerMap);
              }
              const marker = createMarker(item);
              proxyMarkerMap.set(key, marker);
              markers.addLayer(marker);
              const eventTime = new Date(item.timestamp).getTime();
              if (fetchTime - eventTime < NEW_EVENT_THRESHOLD) {
                newMarkersForAnimation.push(marker);
              }
            }
          }
        }
      });

      // Animate clusters with newly added markers
      setTimeout(() => {
        const animatedClusters = new Set();
        newMarkersForAnimation.forEach((marker) => {
          const parent = markers.getVisibleParent(marker);
          if (parent && parent._icon && !animatedClusters.has(parent)) {
            parent._icon.classList.add("animate-cluster");
            animatedClusters.add(parent);
            setTimeout(() => {
              parent._icon.classList.remove("animate-cluster");
            }, 500);
          }
        });
      }, 500);
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
    setTimeout(fetchData, 1000);
  }

  map.addLayer(markers);
  fetchData();
});
