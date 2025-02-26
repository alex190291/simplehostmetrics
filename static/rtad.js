let lastbLastId = null;
let proxyLastId = null;
let currentSorts = {
  lastbTable: null,
  proxyTable: null,
};

const dateCache = new Map();

function getParsedDate(timestamp) {
  if (!dateCache.has(timestamp)) {
    // Directly parse ISO‑8601 timestamps and cache the millisecond value
    const date = new Date(timestamp);
    dateCache.set(timestamp, date.getTime());
  }
  return dateCache.get(timestamp);
}

function loadSortState() {
  const lastbSort = localStorage.getItem("lastbTableSortState");
  const proxySort = localStorage.getItem("proxyTableSortState");
  if (lastbSort) {
    currentSorts.lastbTable = JSON.parse(lastbSort);
  }
  if (proxySort) {
    currentSorts.proxyTable = JSON.parse(proxySort);
  }
}

function saveSortState(tableId, state) {
  localStorage.setItem(tableId + "SortState", JSON.stringify(state));
  currentSorts[tableId] = state;
}

function sortTable(table, column, direction) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const isLastbTable = table.id === "lastbTable";
  // For lastbTable, the timestamp is at index 3; for proxyTable, it's at index 4
  const timestampColumn = isLastbTable ? 3 : 4;

  const compareFunction = (a, b) => {
    if (column === timestampColumn) {
      const aTimestamp = a.children[column].getAttribute("data-timestamp");
      const bTimestamp = b.children[column].getAttribute("data-timestamp");
      const aTime = getParsedDate(aTimestamp);
      const bTime = getParsedDate(bTimestamp);
      return direction === "asc" ? aTime - bTime : bTime - aTime;
    }

    const aCol = a.children[column].textContent.trim();
    const bCol = b.children[column].textContent.trim();

    // Check for numeric comparison
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

// Row pools for reusing <tr> elements and reducing DOM churn
const lastbRowPool = [];
const proxyRowPool = [];

function updateTable(tbodySelector, data, type) {
  const tbody = document.querySelector(tbodySelector);
  const existingRows = Array.from(tbody.children);
  const fragment = document.createDocumentFragment();

  data.forEach((item, index) => {
    let row;
    if (existingRows[index]) {
      row = existingRows[index];
    } else if (type === "lastb" && lastbRowPool.length > 0) {
      row = lastbRowPool.pop();
    } else if (type === "proxy" && proxyRowPool.length > 0) {
      row = proxyRowPool.pop();
    } else {
      row = document.createElement("tr");
    }

    if (type === "lastb") {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleString();
      row.innerHTML = `
        <td>${item.ip_address}</td>
        <td>${item.country || "N/A"}</td>
        <td>${item.city || "N/A"}</td>
        <td data-timestamp="${item.timestamp}">${formattedDate}</td>
        <td>${item.user || ""}</td>
        <td>${item.failure_reason || ""}</td>
      `;
    } else if (type === "proxy") {
      const date = new Date(item.timestamp);
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
      row.innerHTML = `
        <td>${item.domain || ""}</td>
        <td>${item.ip_address || ""}</td>
        <td>${item.country || "N/A"}</td>
        <td>${item.city || "N/A"}</td>
        <td data-timestamp="${item.timestamp}">${formattedDate}</td>
        <td>${item.proxy_type || ""}</td>
        <td class="${errorClass}">${item.error_code || ""}</td>
        <td>${item.url || ""}</td>
      `;
    }
    fragment.appendChild(row);
  });

  // Pool any extra rows that are no longer needed
  for (let i = data.length; i < existingRows.length; i++) {
    if (type === "lastb") {
      lastbRowPool.push(existingRows[i]);
    } else if (type === "proxy") {
      proxyRowPool.push(existingRows[i]);
    }
  }

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
      updateTable("#lastbTable tbody", data, "lastb");
      lastbLastId = data[data.length - 1].id;
      if (currentSorts.lastbTable && currentSorts.lastbTable.column !== null) {
        requestAnimationFrame(() => {
          sortTable(
            document.querySelector("#lastbTable"),
            currentSorts.lastbTable.column,
            currentSorts.lastbTable.direction,
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
      updateTable("#proxyTable tbody", data, "proxy");
      proxyLastId = data[data.length - 1].id;
      if (currentSorts.proxyTable && currentSorts.proxyTable.column !== null) {
        requestAnimationFrame(() => {
          sortTable(
            document.querySelector("#proxyTable"),
            currentSorts.proxyTable.column,
            currentSorts.proxyTable.direction,
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
        const tableKey = table.id;
        if (
          currentSorts[tableKey] &&
          currentSorts[tableKey].column === index &&
          currentSorts[tableKey].direction === "asc"
        ) {
          direction = "desc";
        }

        const newState = {
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
        saveSortState(table.id, newState);
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
