// static/rtad.js

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
    const date =
      typeof timestamp === "number"
        ? new Date(timestamp * 1000)
        : new Date(timestamp);
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
      // Get timestamps from data attributes
      const aTimestamp = a.children[column].getAttribute("data-timestamp");
      const bTimestamp = b.children[column].getAttribute("data-timestamp");

      // Convert to numbers for comparison
      const aTime = Number(aTimestamp) * 1000;
      const bTime = Number(bTimestamp) * 1000;

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

  fetch(lastbUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;

      const tbody = document.querySelector("#lastbTable tbody");
      if (lastbLastId === null) {
        tbody.innerHTML = "";
      }

      const fragment = document.createDocumentFragment();
      data.forEach((item) => {
        const date = new Date(item.timestamp * 1000);
        const formattedDate = date.toLocaleString();
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${item.id}</td>
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

  fetch(proxyUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;

      const tbody = document.querySelector("#proxyTable tbody");
      if (proxyLastId === null) {
        tbody.innerHTML = "";
      }

      const fragment = document.createDocumentFragment();
      data.forEach((item) => {
        const date = new Date(item.timestamp * 1000);
        const formattedDate = date.toLocaleString();
        let errorClass = "";
        if (item.error_code === 200) {
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
                    <td>${item.id}</td>
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

function initializeSorting() {
  const tables = document.querySelectorAll("#lastbTable, #proxyTable");

  tables.forEach((table) => {
    const headers = table.querySelectorAll("th");
    headers.forEach((header, index) => {
      header.classList.add("sortable");

      header.addEventListener("click", () => {
        headers.forEach((h) => h.classList.remove("asc", "desc"));

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

        header.classList.add(direction);
        sortTable(table, index, direction);
        saveSortState();
      });
    });
  });
}

function refreshRTADData() {
  fetchRTADData();
}

document.addEventListener("DOMContentLoaded", function () {
  loadSortState();
  initializeSorting();
  fetchRTADData();
});

setInterval(fetchRTADData, 5000);
