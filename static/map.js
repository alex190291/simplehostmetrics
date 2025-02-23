// map.js
document.addEventListener("DOMContentLoaded", function () {
  // Initialize Leaflet map
  const map = L.map("map").setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Cache für bereits abgefragte Stadtkoordinaten
  const cityCache = {};

  /**
   * Ermittelt über Nominatim die Koordinaten für die angegebene Stadt und das Land.
   * Liefert ein Promise, das entweder {lat, lon} oder null zurückgibt.
   */
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

  /**
   * Fügt einen Marker zum Map-Objekt hinzu.
   * Verwendet Stadtkoordinaten, falls vorhanden, ansonsten die vom API gelieferten Länderkontur-Koordinaten.
   */
  async function addMarker(item) {
    // Standardkoordinaten aus der API (Ländermittelpunkt)
    let coords = { lat: item.lat, lon: item.lon };

    // Wenn eine Stadt angegeben ist, versuchen wir deren Koordinaten zu ermitteln
    if (item.city && item.city !== "Unknown" && item.city.trim() !== "") {
      const cityCoords = await getCityCoords(item.city, item.country);
      if (cityCoords) {
        coords = cityCoords;
      }
    }

    const marker = L.marker([coords.lat, coords.lon]).addTo(map);
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
    marker.bindPopup(popupContent);
  }

  // Abrufen der kombinierten Attack Map Daten und Platzieren der Marker
  fetch("/api/attack_map_data")
    .then((response) => response.json())
    .then((data) => {
      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          addMarker(item);
        }
      });
    })
    .catch((err) => console.error("Error loading attack map data:", err));
});
