document.addEventListener("DOMContentLoaded", function () {
  // Initialize Leaflet map
  const map = L.map("map").setView([20, 0], 2);

  // OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Create marker cluster group (spiderfies on max zoom or when needed)
  const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
  });

  // Cache für erfolgreich ermittelte Koordinaten, damit wir nicht immer erneut geocoden:
  const locationCache = new Map();
  // Key könnte z. B. "City|Country" sein oder nur "Country" bei unbekannter Stadt

  /**
   * Führt eine Geocoding-Anfrage an Nominatim durch
   * @param {string} query - Suchstring, z. B. "Berlin, Germany" oder "DE"
   * @returns {Promise<{lat: number, lon: number} | null>}
   */
  function nominatimGeocode(query) {
    return new Promise((resolve) => {
      if (!query || query === "Unknown") {
        // Unbekannt -> kein passender Ort
        resolve(null);
        return;
      }
      if (locationCache.has(query)) {
        // Schonmal geocodet
        resolve(locationCache.get(query));
        return;
      }
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query,
      )}&limit=1`;
      // Achtung: Nominatim verlangt einen aussagekräftigen User-Agent
      fetch(url, { headers: { "User-Agent": "SimpleHostMetrics/1.0" } })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const coords = {
              lat: parseFloat(data[0].lat),
              lon: parseFloat(data[0].lon),
            };
            locationCache.set(query, coords);
            resolve(coords);
          } else {
            resolve(null);
          }
        })
        .catch(() => {
          resolve(null);
        });
    });
  }

  /**
   * Ermittelt Koordinaten abhängig von city/country:
   * 1. Falls city != "Unknown", geocode "City, Country"
   * 2. Sonst geocode nur "Country"
   * 3. Fallback: (0,0), wenn alles fehlschlägt
   */
  function getCoordinates(city, country) {
    return new Promise((resolve) => {
      // Versuch 1: City + Country
      if (city && city !== "Unknown") {
        const combined = `${city}, ${country}`;
        nominatimGeocode(combined).then((coordsCity) => {
          if (coordsCity) {
            resolve(coordsCity);
          } else {
            // Versuch 2: Nur Country
            nominatimGeocode(country).then((coordsCountry) => {
              if (coordsCountry) {
                resolve(coordsCountry);
              } else {
                // Fallback: (0,0)
                resolve({ lat: 0, lon: 0 });
              }
            });
          }
        });
      } else {
        // City unknown -> nur Country
        nominatimGeocode(country).then((coordsCountry) => {
          if (coordsCountry) {
            resolve(coordsCountry);
          } else {
            resolve({ lat: 0, lon: 0 });
          }
        });
      }
    });
  }

  // Daten vom Server laden
  fetch("/api/attack_map_data")
    .then((response) => response.json())
    .then((data) => {
      // Pro Eintrag Koordinaten bestimmen
      const tasks = data.map((item) => {
        return new Promise((resolve) => {
          const city = item.city || "Unknown";
          const country = item.country || "Unknown";

          getCoordinates(city, country).then((coords) => {
            item.lat = coords.lat;
            item.lon = coords.lon;
            resolve(item);
          });
        });
      });

      Promise.all(tasks).then((finalData) => {
        // Marker hinzufügen
        finalData.forEach((item) => {
          // Wir haben jetzt in jedem Fall lat/lon (mind. 0,0)
          // Falls Sie 0,0 ausblenden wollen, müssten Sie hier filtern.
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
          // Falls man (0,0) wirklich nicht als Marker anzeigen will, könnte man prüfen:
          // if (item.lat === 0 && item.lon === 0 && item.country === "Unknown") ...
          const marker = L.marker([item.lat, item.lon]).bindPopup(popupContent);
          markers.addLayer(marker);
        });
        // MarkerCluster in die Karte
        map.addLayer(markers);
      });
    })
    .catch((err) => console.error("Error loading attack map data:", err));
});
