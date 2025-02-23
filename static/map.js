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

  // Marker Cluster Gruppe mit deaktiviertem automatischen Unspiderfy
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    autoUnspiderfy: false,
  });
  // Überschreiben der internen _unspiderfy Methode, damit geöffnete Cluster nicht automatisch schließen:
  markers._unspiderfy = function () {};

  // Minimalistisches Marker-Icon mittels Leaflet.divIcon
  const circleIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#f55;"></div>',
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
    // Direkte Verwendung der im Item enthaltenen Koordinaten
    const marker = L.marker([item.lat, item.lon], { icon: circleIcon });
    marker.bindPopup(createPopup(item));
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

  // MarkerCluster Gruppe zur Karte hinzufügen
  map.addLayer(markers);

  // Erste Datenabfrage
  await fetchData();

  // Optional: Wiederholte Datenabfrage ohne Cluster-Reset
  // setInterval(fetchData, 30000);
});
