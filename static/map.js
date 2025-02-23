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

  // Create marker cluster group with spiderfy options
  const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
  });

  // Cache for city coordinates to avoid repeated geocoding
  const cityCoordinatesCache = {};

  // Function to get city coordinates using Nominatim geocoding API
  function getCityCoordinates(city, country) {
    return new Promise((resolve, reject) => {
      const cacheKey = `${city},${country}`;
      if (cityCoordinatesCache[cacheKey]) {
        resolve(cityCoordinatesCache[cacheKey]);
      } else {
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
      }
    });
  }

  // Fetch combined data from our /api/attack_map_data endpoint
  fetch("/api/attack_map_data")
    .then((response) => response.json())
    .then((data) => {
      // Process each item: falls eine Stadt angegeben ist, deren Koordinaten abrufen
      const promises = data.map((item) => {
        return new Promise((resolve) => {
          if (item.city && item.city !== "Unknown") {
            getCityCoordinates(item.city, item.country).then((coords) => {
              if (coords) {
                item.lat = coords.lat;
                item.lon = coords.lon;
              }
              resolve(item);
            });
          } else {
            resolve(item);
          }
        });
      });

      Promise.all(promises).then((updatedData) => {
        updatedData.forEach((item) => {
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
        map.addLayer(markers);
      });
    })
    .catch((err) => console.error("Error loading attack map data:", err));
});
