// /static/npm/managers/RedirectionHostManager.js
function makeRequest(baseUrl, endpoint, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, baseUrl + endpoint, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        // Better error handling to extract and format API error messages
        let errorMessage = `Request failed with status ${xhr.status}`;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (typeof errorResponse === 'object') {
            if (errorResponse.error) {
              errorMessage = errorResponse.error;
            } else if (errorResponse.message) {
              errorMessage = errorResponse.message;
            } else {
              // If there's no specific error message, stringify the entire object
              errorMessage = JSON.stringify(errorResponse);
            }
          }
        } catch (e) {
          // If parsing fails, try to use the raw response text
          if (xhr.responseText) {
            errorMessage = `${errorMessage}: ${xhr.responseText}`;
          }
        }
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error occurred"));
    };

    if (data) {
      // Debug log the data being sent
      console.log("Sending data:", JSON.stringify(data));
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
  });
}

function showSuccess(message) {
  const toast = document.createElement("div");
  toast.className = "toast toast-success";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showError(message) {
  const toast = document.createElement("div");
  toast.className = "toast toast-error";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

async function loadRedirectionHosts() {
  try {
    const hosts = await makeRequest("/npm-api", "/nginx/redirection-hosts");
    const container = document.getElementById("redirectionHostsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (hosts.length === 0) {
      container.innerHTML = "<p>No redirection hosts found.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-striped";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Domain Names</th>
          <th>Forward To</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    hosts.forEach((host) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${host.domain_names.join(", ")}</td>
        <td>${host.forward_scheme}://${host.forward_domain_name}</td>
        <td>
          <span class="badge ${host.enabled ? "badge-success" : "badge-danger"}">
            ${host.enabled ? "Enabled" : "Disabled"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary edit-btn" data-id="${host.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${host.id}">Delete</button>
          ${
            host.enabled
              ? `<button class="btn btn-sm btn-warning disable-btn" data-id="${host.id}">Disable</button>`
              : `<button class="btn btn-sm btn-success enable-btn" data-id="${host.id}">Enable</button>`
          }
        </td>
      `;

      tbody.appendChild(tr);
    });

    container.appendChild(table);

    // Add event listeners
    table.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hostId = btn.getAttribute("data-id");
        window.RedirectionHostModals.showEditRedirectionHostModal(hostId)
          .then((data) => {
            editRedirectionHost(hostId, data);
          })
          .catch((err) => console.error(err));
      });
    });

    table.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hostId = btn.getAttribute("data-id");
        deleteRedirectionHost(hostId);
      });
    });

    table.querySelectorAll(".enable-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hostId = btn.getAttribute("data-id");
        enableRedirectionHost(hostId);
      });
    });

    table.querySelectorAll(".disable-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hostId = btn.getAttribute("data-id");
        disableRedirectionHost(hostId);
      });
    });
  } catch (error) {
    showError("Failed to load redirection hosts");
    console.error(error);
  }
}

async function editRedirectionHost(hostId, updatedData) {
  try {
    // Create a simplified object with only the properties the API expects
    const apiData = {
      domain_names: updatedData.domain_names,
      forward_http_code: parseInt(updatedData.forward_http_code),
      forward_scheme: updatedData.forward_scheme,
      forward_domain_name: updatedData.forward_domain_name,
      preserve_path: Boolean(updatedData.preserve_path)
    };
    
    // Add optional properties only if they exist
    if ('certificate_id' in updatedData) {
      apiData.certificate_id = updatedData.certificate_id === null ? null : 
                               parseInt(updatedData.certificate_id);
    }
    
    const booleanFields = [
      'ssl_forced', 'hsts_enabled', 'hsts_subdomains', 
      'http2_support', 'block_exploits', 'enabled'
    ];
    
    booleanFields.forEach(field => {
      if (field in updatedData) {
        apiData[field] = Boolean(updatedData[field]);
      }
    });
    
    if ('advanced_config' in updatedData) {
      apiData.advanced_config = updatedData.advanced_config || '';
    }
    
    // Send the request with clean data
    console.log("Sending clean data to API:", apiData);
    
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      apiData
    );
    
    showSuccess("Redirection host updated successfully");
    await loadRedirectionHosts();
  } catch (error) {
    // Better error message display
    const errorMsg = error.message || "Unknown error";
    showError(`Failed to update redirection host: ${errorMsg}`);
    console.error("Update error:", error);
  }
}

async function deleteRedirectionHost(hostId) {
  if (!confirm("Are you sure you want to delete this redirection host?"))
    return;
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "DELETE",
    );
    showSuccess("Redirection host deleted successfully");
    await loadRedirectionHosts();
  } catch (error) {
    showError("Failed to delete redirection host");
  }
}

async function createRedirectionHost(redirData) {
  try {
    await makeRequest(
      "/npm-api",
      "/nginx/redirection-hosts",
      "POST",
      redirData,
    );
    showSuccess("Redirection host created successfully");
    await loadRedirectionHosts();
  } catch (error) {
    showError("Failed to create redirection host");
  }
}

async function enableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/enable`,
      "POST",
    );
    showSuccess("Redirection host enabled successfully");
    await loadRedirectionHosts();
  } catch (error) {
    showError("Failed to enable redirection host");
  }
}

async function disableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/disable`,
      "POST",
    );
    showSuccess("Redirection host disabled successfully");
    await loadRedirectionHosts();
  } catch (error) {
    showError("Failed to disable redirection host");
  }
}

// Expose functions globally
window.RedirectionHostManager = {
  editRedirectionHost,
  deleteRedirectionHost,
  createRedirectionHost,
  enableRedirectionHost,
  disableRedirectionHost,
  loadRedirectionHosts,
};

// Add proper ES module exports
export {
  editRedirectionHost,
  deleteRedirectionHost,
  createRedirectionHost,
  enableRedirectionHost,
  disableRedirectionHost,
  loadRedirectionHosts
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const createBtn = document.getElementById("createRedirectionHostBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      window.RedirectionHostModals.showCreateRedirectionHostModal()
        .then((data) => {
          createRedirectionHost(data);
        })
        .catch((err) => console.error(err));
    });
  }

  // Load hosts initially
  loadRedirectionHosts();
});
