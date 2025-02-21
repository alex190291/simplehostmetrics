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
    // Prüfe, ob der Timestamp als Zahl interpretiert werden kann.
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
  // Für lastbTable ist der Timestamp in Spalte 1, für proxyTable in Spalte 2
  const isLastbTable = table.id === "lastbTable";
  const timestampColumn = isLastbTable ? 1 : 2;

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

function fetchRTADData() {
  let lastbUrl = "/rtad_lastb";
  if (lastbLastId !== null) {
    lastbUrl += "?last_id=" + lastbLastId;
  }

  fetch(lastbUrl, { cache: "no-store" })
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;

      const tbody = document.querySelector("#lastbTable tbody");
      // Tabelle immer komplett neu aufbauen
      tbody.innerHTML = "";
      const fragment = document.createDocumentFragment();
      data.forEach((item) => {
        let date;
        // Wenn der Timestamp als Zahl interpretiert werden kann, multipliziere mit 1000; sonst direkt parsen
        if (isNaN(Number(item.timestamp))) {
          date = new Date(item.timestamp);
        } else {
          date = new Date(parseFloat(item.timestamp) * 1000);
        }
        const formattedDate = date.toLocaleString();
        const row = document.createElement("tr");
        // ID-Spalte entfernt
        row.innerHTML = `
                    <td>${item.ip_address}</td>
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
    })
    .catch((error) => {
      console.error("Error fetching /rtad_lastb data:", error);
    });

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
        let date;
        if (isNaN(Number(item.timestamp))) {
          date = new Date(item.timestamp);
        } else {
          date = new Date(parseFloat(item.timestamp) * 1000);
        }
        const formattedDate = date.toLocaleString();
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
        // ID-Spalte entfernt
        row.innerHTML = `
                    <td>${item.domain}</td>
                    <td>${item.ip_address}</td>
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
  fetchRTADData();
});

setInterval(fetchRTADData, 5000);
