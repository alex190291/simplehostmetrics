// map.js
document.addEventListener("DOMContentLoaded", async function () {
  const map = L.map("map", {
    center: [20, 0],
    zoom: 2,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data © OpenStreetMap contributors",
  }).addTo(map);

  const toggleButton = document.getElementById("modeToggle");
  toggleButton.addEventListener("click", () => {
    map.getContainer().classList.toggle("dark-mode");
  });

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

  // Globales Mapping: key -> marker
  const markerMap = new Map();
  // Neue Events, die innerhalb dieser Schwelle (in ms) eintreffen, werden animiert
  const NEW_EVENT_THRESHOLD = 3000;

  async function fetchData() {
    if (markers._spiderfied) {
      setTimeout(fetchData, 1000);
      return;
    }
    const fetchTime = Date.now();
    try {
      const response = await fetch("/api/attack_map_data");
      const data = await response.json();

      // Array zur Speicherung der neu hinzugefügten Marker (für Animation)
      const newMarkersForAnimation = [];

      data.forEach((item) => {
        if (item.lat !== null && item.lon !== null) {
          // Erzeugen eines eindeutigen Schlüssels (ggf. anpassen, falls vorhanden: item.id)
          const key = `${item.timestamp}-${item.ip_address}`;
          if (!markerMap.has(key)) {
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

      // Animieren der Cluster, welche neue Marker enthalten
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
