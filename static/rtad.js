(function () {
  const mapSvg = document.getElementById("rtad-map");
  const linesGroup = document.getElementById("rtad-lines");
  const securityTotalEl = document.getElementById("sec-total-events");
  const securityBlockedEl = document.getElementById("sec-blocked-ips");
  const securityFailedEl = document.getElementById("sec-failed-logins");

  // Neue Skalierung: 494.7 x 265.7
  // lat: -90..90 => y: 0..265.7
  // lon: -180..180 => x: 0..494.7
  function latLonToXY(lat, lon) {
    const x = (lon + 180) * (494.7 / 360);
    const y = (90 - lat) * (265.7 / 180);
    return { x, y };
  }

  function getColorForPort(port) {
    if (!port) return "rgba(255,255,255,0.6)";
    const portNum = parseInt(port, 10) || 0;
    if (portNum === 22) return "rgba(255,0,0,0.7)";
    if (portNum === 80 || portNum === 443) return "rgba(0,255,0,0.7)";
    if (portNum === 3306) return "rgba(255,255,0,0.7)";
    if (portNum === 403) return "rgba(255,165,0,0.7)"; // Forbidden
    if (portNum === 404) return "rgba(0,0,255,0.7)"; // Not Found
    return "rgba(255,255,255,0.6)";
  }

  function drawArc(fromX, fromY, toX, toY, color) {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 - 20; // leichte Wölbung
    const pathData = `M ${fromX},${fromY} Q ${midX},${midY} ${toX},${toY}`;
    const pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathEl.setAttribute("d", pathData);
    pathEl.setAttribute("stroke", color);
    pathEl.setAttribute("stroke-width", "2");
    pathEl.setAttribute("fill", "none");
    pathEl.setAttribute("opacity", "0.8");

    // Glow-Effekt:
    pathEl.style.filter = `drop-shadow(0 0 4px ${color})`;

    // "pfad-draw" per stroke-dasharray
    const approximateLength =
      Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2) * 3;
    pathEl.style.strokeDasharray = approximateLength;
    pathEl.style.strokeDashoffset = approximateLength;

    linesGroup.appendChild(pathEl);

    // Animation
    setTimeout(() => {
      pathEl.style.transition =
        "stroke-dashoffset 2s ease-out, opacity 4s ease";
      pathEl.style.strokeDashoffset = "0";
      // Verblassen nach 2s
      setTimeout(() => {
        pathEl.style.opacity = "0";
        // Nach 2 weiteren Sekunden entfernen
        setTimeout(() => {
          if (pathEl.parentNode) {
            pathEl.parentNode.removeChild(pathEl);
          }
        }, 2000);
      }, 2000);
    }, 50);
  }

  function fetchRTADData() {
    fetch("/rtad/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) {
          securityTotalEl.innerText = data.summary.total_events;
          securityBlockedEl.innerText = data.summary.blocked_ips;
          securityFailedEl.innerText = data.summary.failed_logins;
        }
        if (data.events && data.events.length) {
          data.events.forEach((evt) => {
            if (evt.latitude && evt.longitude) {
              const ipXY = latLonToXY(evt.latitude, evt.longitude);
              const serverXY = latLonToXY(evt.server_lat, evt.server_lon);
              const color = getColorForPort(evt.port);
              drawArc(ipXY.x, ipXY.y, serverXY.x, serverXY.y, color);
            }
          });
        }
      })
      .catch((err) => console.error("Error fetching RTAD data:", err));
  }

  // Fetch every second to ensure fast updates
  setInterval(fetchRTADData, 1000); // 1000 ms for quicker updates
  fetchRTADData();
})();
