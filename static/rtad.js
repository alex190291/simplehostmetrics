// static/rtad.js

let lastbLastId = null;
let proxyLastId = null;

// Sorting state management
let currentSort = {
    table: null,
    column: null,
    direction: null
};

// Load sort state from localStorage
function loadSortState() {
    const savedSort = localStorage.getItem('tableSortState');
    if (savedSort) {
        currentSort = JSON.parse(savedSort);
    }
}

// Save sort state to localStorage
function saveSortState() {
    localStorage.setItem('tableSortState', JSON.stringify(currentSort));
}

// Sorting function
function sortTable(table, column, direction) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const sortedRows = rows.sort((a, b) => {
        const aCol = a.children[column].textContent.trim();
        const bCol = b.children[column].textContent.trim();

        // Handle different types of sorting
        if (column === 2) { // Timestamp column
            const aDate = new Date(aCol).getTime();
            const bDate = new Date(bCol).getTime();
            return direction === 'asc' ? aDate - bDate : bDate - aDate;
        } else if (!isNaN(aCol) && !isNaN(bCol)) { // Numeric sorting
            return direction === 'asc' ?
                Number(aCol) - Number(bCol) :
                Number(bCol) - Number(aCol);
        } else { // String sorting
            return direction === 'asc' ?
                aCol.localeCompare(bCol) :
                bCol.localeCompare(aCol);
        }
    });

    // Clear and re-append sorted rows
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    tbody.append(...sortedRows);
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

            // Sort data if sorting is active
            if (currentSort.table === '#lastbTable' && currentSort.column !== null) {
                data.sort((a, b) => {
                    const values = {
                        0: ['id', false],
                        1: ['ip_address', true],
                        2: ['timestamp', false],
                        3: ['user', true],
                        4: ['failure_reason', true]
                    };

                    const [key, isString] = values[currentSort.column];
                    const aVal = isString ? a[key] : Number(a[key]);
                    const bVal = isString ? b[key] : Number(b[key]);

                    if (currentSort.column === 2) {
                        return currentSort.direction === 'asc' ?
                            new Date(aVal) - new Date(bVal) :
                            new Date(bVal) - new Date(aVal);
                    }

                    return currentSort.direction === 'asc' ?
                        (isString ? aVal.localeCompare(bVal) : aVal - bVal) :
                        (isString ? bVal.localeCompare(aVal) : bVal - aVal);
                });
            }

            data.sort((a, b) => a.id - b.id);
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
                    <td>${formattedDate}</td>
                    <td>${item.user}</td>
                    <td>${item.failure_reason}</td>
                `;
                fragment.appendChild(row);
            });
            tbody.appendChild(fragment);
            lastbLastId = data[data.length - 1].id;

            // Re-apply sorting if active
            if (currentSort.table === '#lastbTable' && currentSort.column !== null) {
                const table = document.querySelector('#lastbTable');
                sortTable(table, currentSort.column, currentSort.direction);
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

            // Sort data if sorting is active
            if (currentSort.table === '#proxyTable' && currentSort.column !== null) {
                data.sort((a, b) => {
                    const values = {
                        0: ['id', false],
                        1: ['domain', true],
                        2: ['ip_address', true],
                        3: ['timestamp', false],
                        4: ['proxy_type', true],
                        5: ['error_code', false],
                        6: ['url', true]
                    };

                    const [key, isString] = values[currentSort.column];
                    const aVal = isString ? a[key] : Number(a[key]);
                    const bVal = isString ? b[key] : Number(b[key]);

                    if (currentSort.column === 3) {
                        return currentSort.direction === 'asc' ?
                            new Date(aVal) - new Date(bVal) :
                            new Date(bVal) - new Date(aVal);
                    }

                    return currentSort.direction === 'asc' ?
                        (isString ? aVal.localeCompare(bVal) : aVal - bVal) :
                        (isString ? bVal.localeCompare(aVal) : bVal - aVal);
                });
            }

            data.sort((a, b) => a.id - b.id);
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
                    <td>${item.proxy
