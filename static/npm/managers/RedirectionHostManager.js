// /static/npm/managers/RedirectionHostManager.js
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

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
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error occurred"));
    };

    if (data) {
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
  });
}

/* // Keep this function for backward compatibility, but it won't be used for view updates
export async function loadRedirectionHosts() {
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
} */

export async function editRedirectionHost(hostId, updatedData) {
  try {
    // Only send fields that the API expects
    const dataToSend = {      
      domain_names: updatedData.domain_names,
      forward_http_code: updatedData.forward_http_code,
      forward_scheme: updatedData.forward_scheme,
      forward_domain_name: updatedData.forward_domain_name,
      preserve_path: updatedData.preserve_path,
      certificate_id: updatedData.certificate_id,
      ssl_forced: updatedData.ssl_forced,
      hsts_enabled: updatedData.hsts_enabled,
      hsts_subdomains: updatedData.hsts_subdomains,
      http2_support: updatedData.http2_support,
      block_exploits: updatedData.block_exploits,
      advanced_config: updatedData.advanced_config || "",
      meta: {}
    };
    
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      dataToSend,
    );
    showSuccess("Redirection host updated successfully");
    await Views.loadRedirectionHosts(); // Use the NPMViews function instead
  } catch (error) {
    showError("Failed to update redirection host");
  }
}

/* export async function updateRedirectionHost(hostId, updatedData) {
  try {
    // Ensure the data matches the expected schema
    const dataToSend = {
      domain_names: updatedData.domain_names,
      forward_http_code: updatedData.forward_http_code,
      forward_scheme: updatedData.forward_scheme,
      forward_domain_name: updatedData.forward_domain_name,
      preserve_path: updatedData.preserve_path,
      certificate_id: updatedData.certificate_id,
      ssl_forced: updatedData.ssl_forced,
      hsts_enabled: updatedData.hsts_enabled,
      hsts_subdomains: updatedData.hsts_subdomains,
      http2_support: updatedData.http2_support,
      block_exploits: updatedData.block_exploits,
      advanced_config: updatedData.advanced_config || "",
      meta: updatedData.meta || {}
    };

    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "PUT",
      dataToSend
    );
    
    showSuccess("Redirection host updated successfully");
    await Views.loadRedirectionHosts(); // Use the NPMViews function instead
  } catch (error) {
    showError("Failed to update redirection host");
    console.error("Update error:", error);
  }
} */

export async function deleteRedirectionHost(hostId) {
  if (!confirm("Are you sure you want to delete this redirection host?"))
    return;
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "DELETE",
    );
    showSuccess("Redirection host deleted successfully");
    await Views.loadRedirectionHosts(); // Use the NPMViews function instead
  } catch (error) {
    showError("Failed to delete redirection host");
  }
}

export async function createRedirectionHost(redirData) {
  try {
    // Ensure all fields match the API's expected format
    const dataToSend = {
      domain_names: Array.isArray(redirData.domain_names) 
        ? redirData.domain_names 
        : [redirData.domain_names], // Ensure it's an array
      forward_http_code: parseInt(redirData.forward_http_code) || 301, // Ensure numeric
      forward_scheme: redirData.forward_scheme || "auto",
      forward_domain_name: redirData.forward_domain_name,
      preserve_path: Boolean(redirData.preserve_path),
      certificate_id: redirData.certificate_id ? parseInt(redirData.certificate_id) : 0, // Ensure numeric
      ssl_forced: Boolean(redirData.ssl_forced),
      hsts_enabled: Boolean(redirData.hsts_enabled),
      hsts_subdomains: Boolean(redirData.hsts_subdomains),
      http2_support: Boolean(redirData.http2_support),
      block_exploits: Boolean(redirData.block_exploits),
      advanced_config: redirData.advanced_config || "",
      meta: {}
    };

    console.log("Creating redirection host with data:", dataToSend);

    const result = await makeRequest(
      "/npm-api",
      "/nginx/redirection-hosts",
      "POST",
      dataToSend,
    );
    
    console.log("Redirection host created:", result);
    showSuccess("Redirection host created successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    console.error("Failed to create redirection host:", error);
    if (error.message) {
      showError(`Failed to create redirection host: ${error.message}`);
    } else {
      showError("Failed to create redirection host: Unknown error");
    }
  }
}

export async function enableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/enable`,
      "POST",
    );
    showSuccess("Redirection host enabled successfully");
    await Views.loadRedirectionHosts(); // Use the NPMViews function instead
  } catch (error) {
    showError("Failed to enable redirection host");
  }
}

export async function disableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/disable`,
      "POST",
    );
    showSuccess("Redirection host disabled successfully");
    await Views.loadRedirectionHosts(); // Use the NPMViews function instead
  } catch (error) {
    showError("Failed to disable redirection host");
  }
}

// Expose functions globally
window.RedirectionHostManager = {
//  updateRedirectionHost,
  editRedirectionHost,
  deleteRedirectionHost,
  createRedirectionHost,
  enableRedirectionHost,
  disableRedirectionHost,
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
  Views.loadRedirectionHosts();
});
