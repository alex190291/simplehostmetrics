// simplehostmetrics/static/map.js

document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map").setView([20, 0], 2);

  // OSM Tile-Layer (wir nutzen den CSS-Invert-Filter für den Dark Mode)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // Erzeuge MarkerClusterGroup
  const markerCluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnEveryZoom: true,
    maxClusterRadius: 50,
  });

  // Cache für Stadtkoordinaten
  const cityCache = {};

  // Ermittelt über Nominatim die Koordinaten für Stadt und Land
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

  // Bestimmt Markerfarbe anhand von error_code oder Typ
  function getMarkerColor(item) {
    if (item.error_code) {
      switch (item.error_code) {
        case "403":
          return "orange";
        case "404":
          return "yellow";
        case "500":
          return "red";
        default:
          return "gray";
      }
    }
    return item.type === "login" ? "blue" : "green";
  }

  // Fügt einen Marker hinzu – nutzt Stadtkoordinaten, falls vorhanden
  async function addMarker(item) {
    let coords = { lat: item.lat, lon: item.lon };
    if (item.city && item.city !== "Unknown" && item.city.trim() !== "") {
      const cityCoords = await getCityCoords(item.city, item.country);
      if (cityCoords) {
        coords = cityCoords;
      }
    }

    const color = getMarkerColor(item);
    const circleMarker = L.circleMarker([coords.lat, coords.lon], {
      radius: 6,
      fillColor: color,
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.9,
    });

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
    circleMarker.bindPopup(popupContent);
    markerCluster.addLayer(circleMarker);
  }

  // Abrufen der Attack Map Daten und Marker hinzufügen
  fetch("/api/attack_map_data")
    .then((response) => response.json())
    .then((data) => {
      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          addMarker(item);
        }
      });
      map.addLayer(markerCluster);
    })
    .catch((err) => console.error("Error loading attack map data:", err));
});
