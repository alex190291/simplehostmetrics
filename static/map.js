// map.js
document.addEventListener("DOMContentLoaded", async function () {
  // Karte initialisieren
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

  // Marker Cluster Gruppe (autoUnspiderfy deaktiviert)
  const markers = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    autoUnspiderfy: false,
  });
  map.addLayer(markers);

  // Minimalistisches Marker-Icon
  const circleIcon = L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background-color:#f55;"></div>',
    iconSize: [10, 10],
    className: "minimal-marker",
  });

  // Cache für Stadtkoordinaten
  const cityCache = {};

  async function getCityCoords(city, country) {
    const cacheKey = `${city},${country}`;
    if (cityCache[cacheKey]) {
      return cityCache[cacheKey];
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
        city,
      )}&country=${encodeURIComponent(country)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { "User-Agent": "simplehostmetrics-app" },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        cityCache[cacheKey] = { lat, lon };
        return { lat, lon };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

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

  // Erstellt einen Marker basierend auf dem API-Eintrag.
  // Falls lat/lon nicht vorhanden sind, wird mittels Geocoding anhand von city und country der Marker gesetzt.
  async function createMarker(item) {
    let coords = null;
    if (item.city && item.city.trim() !== "" && item.city !== "Unknown") {
      const cityCoords = await getCityCoords(item.city, item.country);
      if (cityCoords) {
        coords = cityCoords;
      } else {
        // Geocoding schlug fehl, Marker überspringen
        return null;
      }
    } else {
      // Keine gültige Stadt, Marker überspringen
      return null;
    }
    const marker = L.marker([coords.lat, coords.lon], { icon: circleIcon });
    marker.bindPopup(createPopup(item));
    return marker;
  }

  // Batch-Update: Alle Marker werden gesammelt, die Clustergruppe gelöscht und dann in einem Schritt neu befüllt.
  async function fetchData() {
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();
      // Alle Marker asynchron erstellen
      const markerPromises = data.map((item) => createMarker(item));
      const markersArray = await Promise.all(markerPromises);
      // Filtere fehlgeschlagene Marker heraus
      const newMarkers = markersArray.filter((marker) => marker !== null);
      // Update nur, wenn gültige Marker vorliegen
      if (newMarkers.length > 0) {
        markers.clearLayers();
        markers.addLayers(newMarkers);
        markers.refreshClusters();
      }
    } catch (err) {
      console.error("Error loading attack map data:", err);
    }
  }

  // Erste Datenabfrage
  await fetchData();

  // Optional: Wiederholte Datenabfrage in regelmäßigen Intervallen
  // setInterval(fetchData, 30000);
});
