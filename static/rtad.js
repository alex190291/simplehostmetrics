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

function loadWorldMap() {
  const worldMapObject = document.getElementById("worldMapObject");
  worldMapObject.addEventListener("load", function () {
    const svgDoc = worldMapObject.contentDocument;
    // Get server location from /server_location endpoint
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
          const bbox = countryElem.getBBox();
          centerX = bbox.x + bbox.width / 2;
          centerY = bbox.y + bbox.height / 2;
        } else {
          // Fallback: center of the SVG based on viewBox
          const viewBox = svgDoc.documentElement
            .getAttribute("viewBox")
            .split(" ");
          centerX = parseFloat(viewBox[2]) / 2;
          centerY = parseFloat(viewBox[3]) / 2;
        }
        // Place server icon on the map
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
        // Store server center for use in drawing attack lines
        window.serverCenter = { x: centerX, y: centerY };
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

function drawAttackLine(targetCountry, type) {
  const worldMapObject = document.getElementById("worldMapObject");
  if (
    !worldMapObject ||
    !worldMapObject.contentDocument ||
    !window.serverCenter
  )
    return;
  const svgDoc = worldMapObject.contentDocument;
  const targetElem = svgDoc.getElementById(targetCountry);
  if (targetElem) {
    const bbox = targetElem.getBBox();
    const targetCenter = {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    };
    const linesGroup = svgDoc.getElementById("attack-lines-group");
    const line = svgDoc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", window.serverCenter.x);
    line.setAttribute("y1", window.serverCenter.y);
    line.setAttribute("x2", targetCenter.x);
    line.setAttribute("y2", targetCenter.y);
    // Set stroke color based on type
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
    // Remove the line after 3 seconds
    setTimeout(() => {
      if (linesGroup.contains(line)) {
        linesGroup.removeChild(line);
      }
    }, 3000);
  }
}

function fetchRTADData() {
  // Process /rtad_lastb data
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
        let date;
        if (isNaN(Number(item.timestamp))) {
          date = new Date(item.timestamp);
        } else {
          date = new Date(parseFloat(item.timestamp) * 1000);
        }
        const formattedDate = date.toLocaleString();
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
      if (currentSort.table === "#lastbTable" && currentSort.column !== null) {
        requestAnimationFrame(() => {
          sortTable(
            document.querySelector("#lastbTable"),
            currentSort.column,
            currentSort.direction,
          );
        });
      }
      // Draw attack lines for the last 50 events
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

  // Process /rtad_proxy data
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
      if (currentSort.table === "#proxyTable" && currentSort.column !== null) {
        requestAnimationFrame(() => {
          sortTable(
            document.querySelector("#proxyTable"),
            currentSort.column,
            currentSort.direction,
          );
        });
      }
      // Draw attack lines for the last 50 events
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

function refreshRTADData() {
  lastbLastId = null;
  proxyLastId = null;
  fetchRTADData();
}

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

document.addEventListener("DOMContentLoaded", function () {
  loadSortState();
  initializeSorting();
  loadWorldMap();
  fetchRTADData();
});

setInterval(fetchRTADData, 5000);
