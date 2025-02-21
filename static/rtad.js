// static/rtad.js

let lastbLastId = null;
let proxyLastId = null;
let currentSort = {
  table: null,
  column: null,
  direction: null,
};

// Optimization: Cache parsed dates
const dateCache = new Map();

// Parse and cache timestamp
function getParsedDate(timestamp) {
  if (!dateCache.has(timestamp)) {
    // Handle both Unix timestamp and formatted date string
    const date =
      typeof timestamp === "number"
        ? new Date(timestamp * 1000)
        : new Date(timestamp);
    dateCache.set(timestamp, date.getTime());
  }
  return dateCache.get(timestamp);
}

function sortTable(table, column, direction) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Optimization: Determine table type and sorting strategy once
  const isLastbTable = table.id === "lastbTable";
  const timestampColumn = isLastbTable ? 2 : 3; // Column index for timestamp

  // Optimization: Prepare comparison function
  const compareFunction = (a, b) => {
    const aCol = a.children[column].textContent.trim();
    const bCol = b.children[column].textContent.trim();

    // Handle timestamp column
    if (column === timestampColumn) {
      const aTime = getParsedDate(aCol);
      const bTime = getParsedDate(bCol);
      return direction === "asc" ? aTime - bTime : bTime - aTime;
    }

    // Handle numeric columns
    if (!isNaN(aCol) && !isNaN(bCol)) {
      const aNum = Number(aCol);
      const bNum = Number(bCol);
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Handle string columns
    return direction === "asc"
      ? aCol.localeCompare(bCol)
      : bCol.localeCompare(aCol);
  };

  // Optimization: Sort rows
  const sortedRows = rows.sort(compareFunction);

  // Optimization: Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  sortedRows.forEach((row) => fragment.appendChild(row));

  // Clear and append in one operation
  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

function fetchRTADData() {
  // Update rtad_lastb table
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
        // Store the original timestamp for sorting
        const timestamp = item.timestamp;
        const formattedDate = new Date(timestamp * 1000).toLocaleString();

        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${item.id}</td>
                    <td>${item.ip_address}</td>
                    <td data-timestamp="${timestamp}">${formattedDate}</td>
                    <td>${item.user}</td>
                    <td>${item.failure_reason}</td>
                `;
        fragment.appendChild(row);
      });

      tbody.appendChild(fragment);
      lastbLastId = data[data.length - 1].id;

      // Apply sorting if active
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

  // Update rtad_proxy table
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
                    <td>${formattedDate}</td>
                    <td>${item.proxy_type}</td>
                    <td class="${errorClass}">${item.error_code}</td>
                    <td>${item.url}</td>
                `;
        fragment.appendChild(row);
      });

      tbody.appendChild(fragment);
      proxyLastId = data[data.length - 1].id;

      // Apply sorting if active
      if (currentSort.table === "#proxyTable" && currentSort.column !== null) {
        sortTable(
          document.querySelector("#proxyTable"),
          currentSort.column,
          currentSort.direction,
        );
      }
    })
    .catch((error) => {
      console.error("Error fetching /rtad_proxy data:", error);
    });
}

function sortTable(table, column, direction) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  const sortedRows = rows.sort((a, b) => {
    const aCol = a.children[column].textContent.trim();
    const bCol = b.children[column].textContent.trim();

    // Handle different types of sorting
    if (column === 2) {
      // Timestamp column
      const aDate = new Date(aCol).getTime();
      const bDate = new Date(bCol).getTime();
      return direction === "asc" ? aDate - bDate : bDate - aDate;
    } else if (!isNaN(aCol) && !isNaN(bCol)) {
      // Numeric sorting
      return direction === "asc"
        ? Number(aCol) - Number(bCol)
        : Number(bCol) - Number(aCol);
    } else {
      // String sorting
      return direction === "asc"
        ? aCol.localeCompare(bCol)
        : bCol.localeCompare(aCol);
    }
  });

  // Clear and re-append sorted rows
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  tbody.append(...sortedRows);
}

function initializeSorting() {
  const tables = document.querySelectorAll("#lastbTable, #proxyTable");

  tables.forEach((table) => {
    const headers = table.querySelectorAll("th");
    headers.forEach((header, index) => {
      header.classList.add("sortable");

      header.addEventListener("click", () => {
        // Remove sorting classes from all headers
        headers.forEach((h) => {
          h.classList.remove("asc", "desc");
        });

        // Determine sort direction
        let direction = "asc";
        if (
          currentSort.table === `#${table.id}` &&
          currentSort.column === index &&
          currentSort.direction === "asc"
        ) {
          direction = "desc";
        }

        // Update sort state
        currentSort = {
          table: `#${table.id}`,
          column: index,
          direction: direction,
        };

        // Add sorting class
        header.classList.add(direction);

        // Sort the table
        sortTable(table, index, direction);

        // Save sort state
        saveSortState();
      });
    });
  });
}

function refreshRTADData() {
  fetchRTADData();
}

// Initialize everything when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  loadSortState();
  initializeSorting();
  fetchRTADData();
});

// Automatic update every 5 seconds
setInterval(fetchRTADData, 5000);
