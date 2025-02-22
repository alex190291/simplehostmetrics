// rtad.js
let lastbLastId = null;
let proxyLastId = null;
let currentSort = {
  table: null,
  column: null,
  direction: null,
};
const dateCache = new Map();

// --- Helper: Merge new rows into an existing table without resetting sorting ---
function mergeRowsIntoTable(
  tableSelector,
  newData,
  rowHtmlGenerator,
  compareFunction,
) {
  const table = document.querySelector(tableSelector);
  const tbody = table.querySelector("tbody");
  // Build a set of existing row IDs (assumes each row has a data-id attribute)
  const existingIds = new Set();
  Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
    const id = row.getAttribute("data-id");
    if (id) existingIds.add(id);
  });

  newData.forEach((item) => {
    // Only add rows for entries not already present (assuming item.id is unique)
    if (!existingIds.has(String(item.id))) {
      const newRow = document.createElement("tr");
      newRow.setAttribute("data-id", item.id);
      newRow.innerHTML = rowHtmlGenerator(item);
      // Insert the new row into tbody in sorted order
      insertRowSorted(tbody, newRow, compareFunction);
    }
  });
}

function insertRowSorted(tbody, newRow, compareFunction) {
  const rows = Array.from(tbody.querySelectorAll("tr"));
  let inserted = false;
  for (let i = 0; i < rows.length; i++) {
    if (compareFunction(newRow, rows[i]) < 0) {
      tbody.insertBefore(newRow, rows[i]);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    tbody.appendChild(newRow);
  }
}

// For the lastb table, we compare the timestamp from cell index 2
function compareRowsByTimestampLastb(rowA, rowB, direction = "asc") {
  let aTimestamp = rowA.cells[2]
    ? rowA.cells[2].getAttribute("data-timestamp")
    : null;
  let bTimestamp = rowB.cells[2]
    ? rowB.cells[2].getAttribute("data-timestamp")
    : null;
  aTimestamp = aTimestamp ? parseFloat(aTimestamp) : 0;
  bTimestamp = bTimestamp ? parseFloat(bTimestamp) : 0;
  return direction === "asc"
    ? aTimestamp - bTimestamp
    : bTimestamp - aTimestamp;
}

// For proxy table, we assume the timestamp is in a cell with a data-timestamp attribute
function compareRowsByTimestampProxy(rowA, rowB, direction = "asc") {
  let aTimestamp = rowA.querySelector("[data-timestamp]");
  let bTimestamp = rowB.querySelector("[data-timestamp]");
  aTimestamp = aTimestamp
    ? parseFloat(aTimestamp.getAttribute("data-timestamp"))
    : 0;
  bTimestamp = bTimestamp
    ? parseFloat(bTimestamp.getAttribute("data-timestamp"))
    : 0;
  return direction === "asc"
    ? aTimestamp - bTimestamp
    : bTimestamp - aTimestamp;
}

function fetchRTADData() {
  // --- Update lastb table ---
  let lastbUrl = "/rtad_lastb";
  if (lastbLastId !== null) {
    lastbUrl += "?last_id=" + lastbLastId;
  }
  fetch(lastbUrl, { cache: "no-store" })
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;
      const rowHtmlGenerator = (item) => {
        let date;
        if (isNaN(Number(item.timestamp))) {
          date = new Date(item.timestamp);
        } else {
          date = new Date(parseFloat(item.timestamp) * 1000);
        }
        const formattedDate = date.toLocaleString();
        return `
          <td>${item.ip_address}</td>
          <td>${item.country || "N/A"}</td>
          <td data-timestamp="${item.timestamp}">${formattedDate}</td>
          <td>${item.user}</td>
          <td>${item.failure_reason}</td>
        `;
      };
      mergeRowsIntoTable("#lastbTable", data, rowHtmlGenerator, (a, b) =>
        compareRowsByTimestampLastb(a, b, currentSort.direction || "asc"),
      );
      lastbLastId = data[data.length - 1].id;
    })
    .catch((error) => console.error("Error fetching /rtad_lastb data:", error));

  // --- Update proxy table ---
  let proxyUrl = "/rtad_proxy";
  if (proxyLastId !== null) {
    proxyUrl += "?last_id=" + proxyLastId;
  }
  fetch(proxyUrl, { cache: "no-store" })
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) return;
      const rowHtmlGenerator = (item) => {
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
        return `
          <td>${item.domain}</td>
          <td>${item.ip_address}</td>
          <td>${item.country || "N/A"}</td>
          <td data-timestamp="${item.timestamp}">${formattedDate}</td>
          <td>${item.proxy_type}</td>
          <td class="${errorClass}">${item.error_code}</td>
          <td>${item.url}</td>
        `;
      };
      mergeRowsIntoTable("#proxyTable", data, rowHtmlGenerator, (a, b) =>
        compareRowsByTimestampProxy(a, b, currentSort.direction || "asc"),
      );
      proxyLastId = data[data.length - 1].id;
    })
    .catch((error) => console.error("Error fetching /rtad_proxy data:", error));
}

// --- Sorting Functions ---
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
  rows.sort((a, b) => {
    if (column === 2) {
      // Timestamp column
      let aTimestamp = a.cells[column]
        ? a.cells[column].getAttribute("data-timestamp")
        : null;
      let bTimestamp = b.cells[column]
        ? b.cells[column].getAttribute("data-timestamp")
        : null;
      aTimestamp = aTimestamp ? parseFloat(aTimestamp) : 0;
      bTimestamp = bTimestamp ? parseFloat(bTimestamp) : 0;
      return direction === "asc"
        ? aTimestamp - bTimestamp
        : bTimestamp - aTimestamp;
    }
    const aText = a.children[column].textContent.trim();
    const bText = b.children[column].textContent.trim();
    if (!isNaN(aText) && !isNaN(bText)) {
      return direction === "asc"
        ? Number(aText) - Number(bText)
        : Number(bText) - Number(aText);
    }
    return direction === "asc"
      ? aText.localeCompare(bText)
      : bText.localeCompare(aText);
  });
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));
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
