// map.js
document.addEventListener("DOMContentLoaded", async function () {
  // Leaflet-Map initialisieren
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  // Grundlegend: OSM-Layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  // Prüfen, ob <body> nicht in Light Mode ist. Falls nicht, map in Dark Mode.
  if (!document.body.classList.contains("light-mode")) {
    map.getContainer().classList.add("dark-mode");
  }

  // Klick-Listener für Mode-Umschalter
  const toggleButton = document.getElementById("modeToggle");
  toggleButton.addEventListener("click", () => {
    // Falls Body im Light Mode ist -> Dark Mode von Map entfernen, sonst hinzufügen
    if (document.body.classList.contains("light-mode")) {
      map.getContainer().classList.remove("dark-mode");
    } else {
      map.getContainer().classList.add("dark-mode");
    }
  });

  // Marker-Cluster-Setup
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

  const loginIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#f55;"></div>',
    iconSize: [50, 50],
    className: "minimal-marker",
  });

  const proxyIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#55f;"></div>',
    iconSize: [50, 50],
    className: "minimal-marker",
  });

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

  // Globale Map für Key->Marker
  const markerMap = new Map();
  // Neue Events innerhalb dieser Schwelle (ms) werden animiert
  const NEW_EVENT_THRESHOLD = 3000;
  // Maximale Markerzahl
  const MAX_MARKERS = 1000;

  // Ältesten Marker entfernen, wenn über Grenze
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
    // Keine neuen Daten abrufen, wenn Cluster "aufgespreizt" ist
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
          if (!markerMap.has(key)) {
            // LIMIT: Bei Überschreitung ältesten Eintrag entfernen
            if (markerMap.size >= MAX_MARKERS) {
              removeOldestMarker();
            }
            const marker = createMarker(item);
            markerMap.set(key, marker);
            markers.addLayer(marker);

            const eventTime = new Date(item.timestamp).getTime();
            if (fetchTime - eventTime < NEW_EVENT_THRESHOLD) {
              newMarkersForAnimation.push(marker);
            }
          }
        }
      });

      // Clustern mit Animation, falls neue Marker dazukamen
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
