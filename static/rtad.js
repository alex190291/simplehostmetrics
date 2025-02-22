// rtad.js

let lastbLastId = null;
let proxyLastId = null;
let currentSort = {
  table: null,
  column: null,
  direction: null,
};

const dateCache = new Map();

function getParsedDate(timestamp) {
  if (!dateCache.has(timestamp)) {
    let date;
    if (isNaN(Number(timestamp))) {
      date = new Date(timestamp);
    } else {
      date = new Date(parseFloat(timestamp) * 1000);
    }
    dateCache.set(timestamp, date.getTime());
  }
  return dateCache.get(timestamp);
}

function loadSortState() {
  const savedSort = localStorage.getItem("tableSortState");
  if (savedSort) {
    currentSort = JSON.parse(savedSort);
  }
}

function saveSortState() {
  localStorage.setItem("tableSortState", JSON.stringify(currentSort));
}

/**
 * Sort table by column index.
 */
function sortTable(table, column, direction) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const isLastbTable = table.id === "lastbTable";
  const timestampColumn = isLastbTable ? 2 : 3;

  const compareFunction = (a, b) => {
    if (column === timestampColumn) {
      const aTimestamp = a.children[column].getAttribute("data-timestamp");
      const bTimestamp = b.children[column].getAttribute("data-timestamp");
      let aTime, bTime;
      if (isNaN(Number(aTimestamp))) {
        aTime = new Date(aTimestamp).getTime();
      } else {
        aTime = Number(aTimestamp) * 1000;
      }
      if (isNaN(Number(bTimestamp))) {
        bTime = new Date(bTimestamp).getTime();
      } else {
        bTime = Number(bTimestamp) * 1000;
      }
      return direction === "asc" ? aTime - bTime : bTime - aTime;
    }

    const aCol = a.children[column].textContent.trim();
    const bCol = b.children[column].textContent.trim();

    if (!isNaN(aCol) && !isNaN(bCol)) {
      const aNum = Number(aCol);
      const bNum = Number(bCol);
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    return direction === "asc"
      ? aCol.localeCompare(bCol)
      : bCol.localeCompare(aCol);
  };

  const sortedRows = rows.sort(compareFunction);
  const fragment = document.createDocumentFragment();
  sortedRows.forEach((row) => fragment.appendChild(row));

  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

/**
 * Load the world map, adjust preserveAspectRatio, and place the server icon.
 */
function loadWorldMap() {
  const worldMapObject = document.getElementById("worldMapObject");
  if (!worldMapObject) return;

  worldMapObject.addEventListener("load", () => {
    const svgDoc = worldMapObject.contentDocument;
    if (!svgDoc) return;

    // Force the SVG to preserve aspect ratio and center itself
    svgDoc.documentElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Attempt to fetch server location
    fetch("/server_location")
      .then((response) => response.json())
      .then((data) => {
        const serverCountry = data.country;
        let countryElem = null;

        if (serverCountry) {
          countryElem = svgDoc.getElementById(serverCountry);
        }

        let centerX, centerY;
        if (countryElem) {
          // Found a path with matching ID => get bounding box
          const bbox = countryElem.getBBox();
          centerX = bbox.x + bbox.width / 2;
          centerY = bbox.y + bbox.height / 2;
        } else {
          // Fallback: center of the entire viewBox
          const vb = svgDoc.documentElement
            .getAttribute("viewBox")
            .split(" ")
            .map(parseFloat);
          // vb: [0, 0, width, height]
          centerX = vb[2] / 2;
          centerY = vb[3] / 2;
        }

        // Place a small circle to represent the server location
        const serverIcon = svgDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        serverIcon.setAttribute("cx", centerX);
        serverIcon.setAttribute("cy", centerY);
        serverIcon.setAttribute("r", 5);
        serverIcon.setAttribute("fill", "yellow");
        serverIcon.setAttribute("class", "server-icon");
        svgDoc.documentElement.appendChild(serverIcon);

        // Store server center for drawing lines
        window.serverCenter = { x: centerX, y: centerY };
      })
      .catch((err) => {
        console.error("Failed to fetch server location:", err);
      });

    // Create a group for attack lines if it doesn't exist
    let linesGroup = svgDoc.getElementById("attack-lines-group");
    if (!linesGroup) {
      linesGroup = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
      linesGroup.setAttribute("id", "attack-lines-group");
      svgDoc.documentElement.appendChild(linesGroup);
    }
  });
}

/**
 * Draw an animated attack line from serverCenter to the target country.
 */
function drawAttackLine(targetCountry, type) {
  const worldMapObject = document.getElementById("worldMapObject");
  if (
    !worldMapObject ||
    !worldMapObject.contentDocument ||
    !window.serverCenter
  ) {
    return;
  }

  const svgDoc = worldMapObject.contentDocument;
  const targetElem = svgDoc.getElementById(targetCountry);
  if (!targetElem) {
    return;
  }

  const bbox = targetElem.getBBox();
  const targetCenter = {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };

  const linesGroup = svgDoc.getElementById("attack-lines-group");
  if (!linesGroup) return;

  const line = svgDoc.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", window.serverCenter.x);
  line.setAttribute("y1", window.serverCenter.y);
  line.setAttribute("x2", targetCenter.x);
  line.setAttribute("y2", targetCenter.y);

  let strokeColor = "red";
  if (type === "proxy") {
    strokeColor = "blue";
  } else if (type === "login") {
    strokeColor = "red";
  } else {
    strokeColor = "white";
  }

  line.setAttribute("stroke", strokeColor);
  line.setAttribute("stroke-width", 2);
  line.setAttribute("class", "attack-line");
  linesGroup.appendChild(line);

  // Remove line after 3 seconds
  setTimeout(() => {
    if (linesGroup.contains(line)) {
      linesGroup.removeChild(line);
    }
  }, 3000);
}

/**
 * Fetch the RTAD data from /rtad_lastb and /rtad_proxy.
 */
function fetchRTADData() {
  // SSH login attempts
  let lastbUrl = "/rtad_lastb";
  if (lastbLastId !== null) {
    lastbUrl += "?last_id=" + lastbLastId;
  }
  fetch(lastbUrl, { cache: "no-store" })
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;

      const tbody = document.querySelector("#lastbTable tbody");
      tbody.innerHTML = "";
      const fragment = document.createDocumentFragment();

      data.forEach((item) => {
        const dateVal = isNaN(Number(item.timestamp))
          ? new Date(item.timestamp)
          : new Date(parseFloat(item.timestamp) * 1000);
        const formattedDate = dateVal.toLocaleString();

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.ip_address}</td>
          <td>${item.country || "N/A"}</td>
          <td data-timestamp="${item.timestamp}">${formattedDate}</td>
          <td>${item.user}</td>
          <td>${item.failure_reason}</td>
        `;
        fragment.appendChild(row);
      });

      tbody.appendChild(fragment);
      lastbLastId = data[data.length - 1].id;

      // Sort if table was previously sorted
      if (currentSort.table === "#lastbTable" && currentSort.column !== null) {
        requestAnimationFrame(() => {
          sortTable(
            document.querySelector("#lastbTable"),
            currentSort.column,
            currentSort.direction,
          );
        });
      }

      // Draw lines for last 50 events only
      const eventsToAnimate = data.slice(-50);
      eventsToAnimate.forEach((item) => {
        if (item.country && item.country !== "Unknown") {
          drawAttackLine(item.country, "login");
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching /rtad_lastb data:", error);
    });

  // Proxy events
  let proxyUrl = "/rtad_proxy";
  if (proxyLastId !== null) {
    proxyUrl += "?last_id=" + proxyLastId;
  }
  fetch(proxyUrl, { cache: "no-store" })
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;

      const tbody = document.querySelector("#proxyTable tbody");
      tbody.innerHTML = "";
      const fragment = document.createDocumentFragment();

      data.forEach((item) => {
        const ts = parseFloat(item.timestamp);
        const seconds = Math.floor(ts);
        const fraction = ts - seconds;
        const date = new Date(seconds * 1000);
        const fractionStr = fraction.toFixed(6).slice(2);
        const formattedDate = date.toLocaleString() + "." + fractionStr;

        let errorClass = "";
        if (item.error_code >= 300 && item.error_code < 400) {
          errorClass = "status-yellow";
        } else if (item.error_code === 200) {
          errorClass = "status-green";
        } else if (item.error_code === 500) {
          errorClass = "status-blue";
        } else if (
          item.error_code === 404 ||
          item.error_code === 403 ||
          (item.error_code >= 400 && item.error_code < 500)
        ) {
          errorClass = "status-red";
        }

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.domain}</td>
          <td>${item.ip_address}</td>
          <td>${item.country || "N/A"}</td>
          <td data-timestamp="${item.timestamp}">${formattedDate}</td>
          <td>${item.proxy_type}</td>
          <td class="${errorClass}">${item.error_code}</td>
          <td>${item.url}</td>
        `;
        fragment.appendChild(row);
      });

      tbody.appendChild(fragment);
      proxyLastId = data[data.length - 1].id;

      // Sort if table was previously sorted
      if (currentSort.table === "#proxyTable" && currentSort.column !== null) {
        requestAnimationFrame(() => {
          sortTable(
            document.querySelector("#proxyTable"),
            currentSort.column,
            currentSort.direction,
          );
        });
      }

      // Draw lines for last 50 events only
      const eventsToAnimate = data.slice(-50);
      eventsToAnimate.forEach((item) => {
        if (item.country && item.country !== "Unknown") {
          drawAttackLine(item.country, "proxy");
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching /rtad_proxy data:", error);
    });
}

/**
 * Reset the counters and refetch everything.
 */
function refreshRTADData() {
  lastbLastId = null;
  proxyLastId = null;
  fetchRTADData();
}

/**
 * Initialize sorting for the two data tables.
 */
function initializeSorting() {
  const tables = document.querySelectorAll("#lastbTable, #proxyTable");
  tables.forEach((table) => {
    const headers = table.querySelectorAll("th");
    headers.forEach((header, index) => {
      if (!header.dataset.originalText) {
        header.dataset.originalText = header.innerText;
      }
      header.classList.add("sortable");
      header.addEventListener("click", () => {
        headers.forEach((h) => {
          h.classList.remove("asc", "desc");
          h.innerHTML = h.dataset.originalText;
        });

        let direction = "asc";
        if (
          currentSort.table === `#${table.id}` &&
          currentSort.column === index &&
          currentSort.direction === "asc"
        ) {
          direction = "desc";
        }

        currentSort = {
          table: `#${table.id}`,
          column: index,
          direction: direction,
        };

        const arrowUp = `<svg width="10" height="10" viewBox="0 0 10 10" fill="var(--text)" xmlns="http://www.w3.org/2000/svg"><path d="M5 0L10 10H0L5 0Z"/></svg>`;
        const arrowDown = `<svg width="10" height="10" viewBox="0 0 10 10" fill="var(--text)" xmlns="http://www.w3.org/2000/svg"><path d="M0 0L5 10L10 0H0Z"/></svg>`;

        header.classList.add(direction);
        header.innerHTML =
          header.dataset.originalText +
          (direction === "asc" ? arrowUp : arrowDown);

        sortTable(table, index, direction);
        saveSortState();
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSortState();
  initializeSorting();
  loadWorldMap();
  fetchRTADData();
});

// Periodically refresh data
setInterval(fetchRTADData, 5000);
