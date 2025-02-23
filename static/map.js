// map.js
document.addEventListener("DOMContentLoaded", async function () {
  // Leaflet Karte initialisieren
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  // OSM-Tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  // Dark Mode Toggle Button
  const toggleButton = document.getElementById("modeToggle");
  toggleButton.addEventListener("click", () => {
    map.getContainer().classList.toggle("dark-mode");
  });

  // Marker Cluster Gruppe mit aktivierter Auto-Unspiderfy-Funktion
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    autoUnspiderfy: true,
  });

  // Schließt einen spiderfied Cluster, wenn dessen Zentrum angeklickt wird
  markers.on("clusterclick", function (a) {
    if (markers._spiderfied === a.layer) {
      markers.unspiderfy();
    }
  });

  // Minimalistische Marker-Icons für SSH (login) und Proxy-Events mit unterschiedlichen Farben
  const loginIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#f55;"></div>',
    iconSize: [10, 10],
    className: "minimal-marker",
  });

  const proxyIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#55f;"></div>',
    iconSize: [10, 10],
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

  // Array zur Speicherung der Marker, die als "neu" gelten
  let newMarkers = [];
  // Schwellenwert (in Millisekunden) – Events, die innerhalb dieser Zeitspanne zum Datenabruf eingegangen sind, werden als neu betrachtet
  const NEW_EVENT_THRESHOLD = 3000;

  async function addMarker(item, fetchTime) {
    const icon = item.type === "login" ? loginIcon : proxyIcon;
    const marker = L.marker([item.lat, item.lon], { icon: icon });
    marker.bindPopup(createPopup(item));

    // Popup beim Hover anzeigen und beim Verlassen schließen
    marker.on("mouseover", function () {
      this.openPopup();
    });
    marker.on("mouseout", function () {
      this.closePopup();
    });

    markers.addLayer(marker);

    // Prüfen, ob das Event als "neu" gilt
    const eventTime = new Date(item.timestamp).getTime();
    if (fetchTime - eventTime < NEW_EVENT_THRESHOLD) {
      newMarkers.push(marker);
    }
  }

  async function fetchData() {
    // Wenn ein Cluster geöffnet ist, pausieren wir den Datenabruf
    if (markers._spiderfied) {
      setTimeout(fetchData, 1000);
      return;
    }
    const fetchTime = Date.now();
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      // Vor jedem Update alle Marker entfernen, um Duplikate zu vermeiden
      markers.clearLayers();
      newMarkers = []; // Reset für neue Marker

      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          addMarker(item, fetchTime);
        }
      });
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }

    // Kurze Verzögerung, um sicherzustellen, dass das Clustering abgeschlossen ist
    setTimeout(() => {
      const animatedClusters = new Set();
      newMarkers.forEach((marker) => {
        const parent = markers.getVisibleParent(marker);
        if (parent && parent._icon && !animatedClusters.has(parent)) {
          parent._icon.classList.add("animate-cluster");
          animatedClusters.add(parent);
          setTimeout(() => {
            parent._icon.classList.remove("animate-cluster");
          }, 500); // Dauer der Animation (500ms)
        }
      });
    }, 500);

    setTimeout(fetchData, 1000);
  }

  map.addLayer(markers);
  fetchData();
});
