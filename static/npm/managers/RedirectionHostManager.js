import { makeRequest } from "../NPMService.js";
import { showSuccess, showError } from "../NPMUtils.js";
import * as Views from "../NPMViews.js";

/**
 * Creates a new redirection host
 * @param {Object} redirData - The redirection host data
 */
export async function createRedirectionHost(redirData) {
  try {
    // Ensure all fields match the API's expected format
    const dataToSend = {
      domain_names: Array.isArray(redirData.domain_names) 
        ? redirData.domain_names 
        : [redirData.domain_names],
      forward_http_code: parseInt(redirData.forward_http_code) || 301,
      forward_scheme: redirData.forward_scheme || "auto",
      forward_domain_name: redirData.forward_domain_name,
      preserve_path: Boolean(redirData.preserve_path),
      certificate_id: redirData.certificate_id ? parseInt(redirData.certificate_id) : 0,
      ssl_forced: Boolean(redirData.ssl_forced),
      hsts_enabled: Boolean(redirData.hsts_enabled),
      hsts_subdomains: Boolean(redirData.hsts_subdomains),
      http2_support: Boolean(redirData.http2_support),
      block_exploits: Boolean(redirData.block_exploits),
      advanced_config: redirData.advanced_config || "",
      meta: {}
    };

    await makeRequest(
      "/npm-api",
      "/nginx/redirection-hosts",
      "POST",
      dataToSend
    );
    
    showSuccess("Redirection host created successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to create redirection host");
  }
}

/**
 * Edits an existing redirection host
 * @param {string|number} hostId - The ID of the host to edit
 * @param {Object} updatedData - The updated host data
 */
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
      dataToSend
    );
    showSuccess("Redirection host updated successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to update redirection host");
  }
}

/**
 * Deletes a redirection host
 * @param {string|number} hostId - The ID of the host to delete
 */
export async function deleteRedirectionHost(hostId) {
  if (!confirm("Are you sure you want to delete this redirection host?")) {
    return;
  }
  
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}`,
      "DELETE"
    );
    showSuccess("Redirection host deleted successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to delete redirection host");
  }
}

/**
 * Enables a redirection host
 * @param {string|number} hostId - The ID of the host to enable
 */
export async function enableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/enable`,
      "POST"
    );
    showSuccess("Redirection host enabled successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to enable redirection host");
  }
}

/**
 * Disables a redirection host
 * @param {string|number} hostId - The ID of the host to disable
 */
export async function disableRedirectionHost(hostId) {
  try {
    await makeRequest(
      "/npm-api",
      `/nginx/redirection-hosts/${hostId}/disable`,
      "POST"
    );
    showSuccess("Redirection host disabled successfully");
    await Views.loadRedirectionHosts();
  } catch (error) {
    showError("Failed to disable redirection host");
  }
}

/**
 * Edits a redirection host using a modal dialog
 * @param {string|number} hostId - The ID of the host to edit
 */
export async function editRedirectionHostWithModal(hostId) {
  try {
    const RedirectionHostModals = await import("../modals/RedirectionHostModals.js");
    const updatedData = await RedirectionHostModals.showEditRedirectionHostModal(hostId);
    await editRedirectionHost(hostId, updatedData);
  } catch (error) {
    console.error("Failed to edit redirection host", error);
    showError("Failed to edit redirection host");
  }
}

// Expose functions globally
window.RedirectionHostManager = {
  editRedirectionHost,
  deleteRedirectionHost,
  createRedirectionHost,
  enableRedirectionHost,
  disableRedirectionHost,
  editRedirectionHostWithModal
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
