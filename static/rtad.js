// rtad.js
document.addEventListener("DOMContentLoaded", function () {
  const svg = document.getElementById("world-map");
  const summaryDiv = document.getElementById("rtad-summary");
  // Retrieve dimensions from the SVG attributes or viewBox
  const svgWidthAttr = svg.getAttribute("width");
  const svgHeightAttr = svg.getAttribute("height");
  const viewBox = svg.getAttribute("viewBox");
  let width = svgWidthAttr ? parseFloat(svgWidthAttr) : 660;
  let height = svgHeightAttr ? parseFloat(svgHeightAttr) : 320;
  if (viewBox) {
    const vbValues = viewBox.split(" ");
    // Expecting viewBox="0 0 660 320"
    width = parseFloat(vbValues[2]);
    height = parseFloat(vbValues[3]);
  }

  // Converts latitude and longitude into x,y coordinates using an equirectangular projection.
  // (Assumes the provided SVG map follows an equirectangular layout.)
  function latLonToXY(lat, lon) {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  }

  // Determines stroke color based on port
  function getColorForPort(port) {
    if (port === "22") return "red";
    if (port === "80" || port === "443") return "green";
    if (port === "3306") return "yellow";
    return "white";
  }

  // Draws an attack event as an animated curved line on the SVG map
  function drawAttackEvent(event) {
    if (!event.attacker_geo || !event.server_geo) return;
    const attacker = event.attacker_geo;
    const server = event.server_geo;
    if (
      attacker.lat == null ||
      attacker.lon == null ||
      server.lat == null ||
      server.lon == null
    )
      return;

    const attackerXY = latLonToXY(attacker.lat, attacker.lon);
    const serverXY = latLonToXY(server.lat, server.lon);
    const cx = (attackerXY.x + serverXY.x) / 2;
    // Offset control point upward for a curved arc
    const cy = Math.min(attackerXY.y, serverXY.y) - 30;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${attackerXY.x},${attackerXY.y} Q ${cx},${cy} ${serverXY.x},${serverXY.y}`;
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", getColorForPort(event.port));
    path.setAttribute("stroke-width", "2");
    path.classList.add("attack-line");

    svg.appendChild(path);
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    path.style.transition = "stroke-dashoffset 2s ease-out";
    setTimeout(() => {
      path.style.strokeDashoffset = "0";
    }, 100);
  }

  // Clears previously drawn attack lines
  function clearAttackPaths() {
    const paths = svg.querySelectorAll("path.attack-line");
    paths.forEach((path) => path.remove());
  }

  // Polls the backend for the latest RTAD data and updates the map and summary
  function pollRTAD() {
    fetch("/rtad/data")
      .then((response) => response.json())
      .then((data) => {
        clearAttackPaths();
        data.events.forEach((event) => {
          drawAttackEvent(event);
        });
        if (data.summary) {
          summaryDiv.innerHTML = `
                        <p>Total Events: ${data.summary.total_events}</p>
                        <p>Failed Logins: ${data.summary.failed_logins}</p>
                        <p>Blocked IPs: ${data.summary.blocked_ips}</p>
                    `;
        }
      })
      .catch((err) => {
        console.error("Error fetching RTAD data:", err);
      });
  }

  setInterval(pollRTAD, 1000);
});
