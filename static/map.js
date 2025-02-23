// map.js
document.addEventListener("DOMContentLoaded", function () {
  // Initialize Leaflet map
  const map = L.map("map").setView([20, 0], 2);

  // OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Create marker cluster group
  // spiderfyOnEveryZoom: wenn man hineinzoomt, werden Marker aufgespreizt
  // spiderfyOnMaxZoom: bei Klick auf den Cluster
  const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    spiderfyOnEveryZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
  });

  // Cache für City-Koordinaten, damit wir nicht jedes Mal erneut geocoden
  const cityCoordinatesCache = {};

  /**
   * Ruft Koordinaten via Nominatim ab.
   * city und country sind Strings, z. B. city="Berlin", country="DE"
   */
  function getCityCoordinates(city, country) {
    return new Promise((resolve, reject) => {
      const cacheKey = `${city},${country}`;
      if (cityCoordinatesCache[cacheKey]) {
        // Bereits im Cache
        resolve(cityCoordinatesCache[cacheKey]);
        return;
      }
      // Request an Nominatim
      const query = encodeURIComponent(`${city}, ${country}`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;

      fetch(url, { headers: { "User-Agent": "SimpleHostMetrics/1.0" } })
        .then((response) => response.json())
        .then((data) => {
          if (data && data.length > 0) {
            const coords = {
              lat: parseFloat(data[0].lat),
              lon: parseFloat(data[0].lon),
            };
            cityCoordinatesCache[cacheKey] = coords;
            resolve(coords);
          } else {
            resolve(null);
          }
        })
        .catch((err) => {
          console.error("Error geocoding city:", err);
          resolve(null);
        });
    });
  }

  // Daten vom Server laden
  fetch("/api/attack_map_data")
    .then((response) => response.json())
    .then((data) => {
      // Wir starten pro Item einen Promise:
      const promises = data.map((item) => {
        return new Promise((resolve) => {
          // item.lat und item.lon enthalten bereits
          // die Land-Koordinaten, falls der Server sie liefert.

          // Falls city bekannt, versuchen wir City-Koordinaten
          if (item.city && item.city !== "Unknown") {
            getCityCoordinates(item.city, item.country).then((coords) => {
              if (coords) {
                // City erfolgreich geocodet -> überschreiben
                item.lat = coords.lat;
                item.lon = coords.lon;
              }
              // Bei Misserfolg oder kein city -> alte lat/lon bleiben bestehen
              resolve(item);
            });
          } else {
            // city ist unbekannt, wir behalten item.lat/item.lon
            resolve(item);
          }
        });
      });

      // Warten bis alle Geocoding-Aufgaben erledigt sind
      Promise.all(promises).then((finalData) => {
        // Jetzt Marker hinzufügen
        finalData.forEach((item) => {
          // Nur Marker setzen, wenn lat/lon vorhanden
          if (item.lat !== null && item.lon !== null) {
            const typeLabel =
              item.type === "login" ? "SSH Login Attempt" : "Proxy Event";
            const popupContent = `
              <b>${typeLabel}</b><br />
              IP: ${item.ip_address || "N/A"}<br />
              Country: ${item.country || "Unknown"}<br />
              City: ${item.city || "Unknown"}<br />
              ${
                item.type === "login"
                  ? `User: ${item.user || ""}<br />Reason: ${item.failure_reason || ""}`
                  : `Domain: ${item.domain || ""}<br />Error: ${item.error_code || ""}<br />URL: ${item.url || ""}`
              }
              <br />
              Timestamp: ${new Date(item.timestamp * 1000).toLocaleString()}
            `;
            const marker = L.marker([item.lat, item.lon]).bindPopup(
              popupContent,
            );
            markers.addLayer(marker);
          }
        });
        // Marker-Cluster dem Map-Objekt hinzufügen
        map.addLayer(markers);
      });
    })
    .catch((err) => console.error("Error loading attack map data:", err));
});
