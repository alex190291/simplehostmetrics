// map.js
document.addEventListener("DOMContentLoaded", async function () {
  // Leaflet Karte initialisieren
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  // OSM-Tiles
  const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 18,
      attribution: "Map data © OpenStreetMap contributors",
    },
  ).addTo(map);

  // Dark Mode Toggle Button
  const toggleButton = document.getElementById("modeToggle");
  toggleButton.addEventListener("click", () => {
    map.getContainer().classList.toggle("dark-map");
  });

  // Marker Cluster Gruppe mit aktivierter Auto-Unspiderfy-Funktion
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    autoUnspiderfy: true,
  });

  // Event-Listener: Schließt einen spiderfied Cluster, wenn dessen Zentrum angeklickt wird
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

  async function addMarker(item) {
    // Auswahl des Icons anhand des Ereignistyps: SSH (login) oder Proxy
    const icon = item.type === "login" ? loginIcon : proxyIcon;
    const marker = L.marker([item.lat, item.lon], { icon: icon });
    marker.bindPopup(createPopup(item));

    // Popup beim Hover anzeigen und wieder schließen
    marker.on("mouseover", function () {
      this.openPopup();
    });
    marker.on("mouseout", function () {
      this.closePopup();
    });

    markers.addLayer(marker);
  }

  // Funktion zum Laden der Daten (ohne komplettes Zurücksetzen der Clustergruppe)
  async function fetchData() {
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();
      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          addMarker(item);
        }
      });
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
  }

  // MarkerCluster Gruppe zur Karte hinzufügen und initial Daten laden
  map.addLayer(markers);
  await fetchData();
  // Optional: Wiederholte Datenabfrage ohne Cluster-Reset
  // setInterval(fetchData, 30000);
});
